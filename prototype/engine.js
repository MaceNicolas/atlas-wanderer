// Atlas Wanderer — rules engine: automatic combat, game, reinforcement, fusion.
'use strict';
// =====================================================================
// RULES ENGINE
// =====================================================================
function mkServant(d) {
  return { uid: uid(), id: d.id || slug(d.name), name: d.name, token: d.token || null, rank: d.rank, atk: d.atk, hp: d.hp, maxhp: d.hp,
           types: [...(d.types || [])], kw: [...(d.kw || [])], fixed: !!d.fixed, bg: d.bg, skill: [].concat(d.skill || [])[0] || null, extra: [].concat(d.skill || []).slice(1), equips: [], eqSkills: [], lrSkills: [], summonA: 0, summonH: 0, healBonus: 0,
           sockets: [...(d.sockets || [])], slots: (d.sockets || []).map(() => null) };
}
// Skills of a servant: its own, then those its equipment gives it.
// lrSkills: skills learned through Adaptation, kept until the end of the mission.
// extra: additional powers of the card (a servant can have several, for example a skill and Adaptation).
const skillsOf = s => [s.skill, ...(s.extra || []), ...(s.eqSkills || []), ...(s.lrSkills || [])].filter(Boolean);

// Number of hits a servant's Shield can absorb (1, or more with "Its Shield withstands N hits").
const shieldCount = s => (s.kw.includes('shield') ? POWERS.react('shieldCharges', [s], { target: s, charges: 1 }).charges : 0);

// Rule: Shield cancels the first source of damage; Poison destroys
// any servant to which it really deals damage.
// Bombs stack into ONE combined bomb: the damage adds up, and it is a fragmentation bomb as soon as one of them is (3 + 5 with fragmentation = 8 with fragmentation).
// A poisoned bomb destroys its bearer when it really deals damage (like Poison); it makes the whole combined bomb poisoned.
// chain: damage of a second bomb that the first one plants on a neighbor of its bearer when it explodes (that second bomb does not chain). Bombs on a card are merged into one: the largest chain is kept.
function addBomb(t, n, splash, poison, chain) { const b = (t.bombs = t.bombs && t.bombs.length ? t.bombs : [{ n: 0, splash: false }])[0]; b.n += n; b.splash = b.splash || !!splash; b.poison = b.poison || !!poison; if (chain) b.chain = Math.max(b.chain || 0, chain); t.bomb = b.n; }
let combatBoards = null;   // the two boards of the combat being played ({ p, e }), so that a blow can be announced to the allies of the one that suffers it
function hit(t, amt, src) {
  if (amt <= 0) return false;
  // Neural flight interface: any source of damage below the threshold is cancelled (the Shield is not consumed).
  if (POWERS.react('damage', [t], { target: t, source: src, amount: amt }).cancelled) { EVENTS.emit('damageBlocked', { target: t.uid, reason: 'cancelled' }); return false; }
  if (t.shield) { t.shield--; EVENTS.emit('damageBlocked', { target: t.uid, reason: 'shield' }); return false; }   // the Shield absorbs one hit; shield counts the remaining hits
  // The allies of the card that really suffers the blow (a Shield did not absorb it) can change its amount (Adaptive Countermeasures).
  const mine = combatBoards && (combatBoards.p.includes(t) ? combatBoards.p : combatBoards.e.includes(t) ? combatBoards.e : null);   // units summoned during the combat have no "side": the board says
  if (mine) amt = POWERS.react('allyDamaged', mine.filter(h => h.hp > 0), { target: t, source: src, amount: amt, allies: mine, enemies: mine === combatBoards.p ? combatBoards.e : combatBoards.p }).amount;
  t.hp -= amt; t.lastHitBy = src || null;   // who struck last (a deathrattle can target it: ref "killer")
  EVENTS.emit('damage', { target: t.uid, amount: amt, source: src ? src.uid : null });
  if (src) POWERS.react('damageDealt', [src], { source: src, target: t, amount: amt });   // Poison: a servant that really took damage is destroyed
  return true;
}

// bonus: permanent bonus of the player's side for the units it summons, by kind of unit { kind: { a, h } }; ignored for the other effects.
// ---------- Companion card (description: game.json, companion) ----------
// A single card per game that the mod hands to the player when a servant of a given type is recruited, and that evolves during the game: g.companion = { s, dead }.
// s is an ordinary servant (companion flag) that stays the same object in hand then on the board. It does not count toward the hand limit, cannot be discarded
// or replaced, keeps its damage between combats and is lost for the game if it dies. Its number follows a counter of the crew profile (the victories), remembered
// in the browser (PROFILE, see save.js); outside the browser the counter is 0. The Nythe's PR model is the first companion.
const companionRule = () => GAME.def().companion || null;   // a mod without a companion card simply has none
const companionWins = () => (typeof PROFILE === 'undefined' || !companionRule() ? 0 : PROFILE.get()[companionRule().profileCounter]);
const companionRecordWin = () => { if (typeof PROFILE !== 'undefined' && companionRule()) PROFILE.update(p => { p[companionRule().profileCounter]++; }); };
const companionName = n => I18N.format(companionRule().nameFormat, { number: n.toString(companionRule().numberBase).toUpperCase().padStart(companionRule().numberWidth, '0') });
const COMPANION_QUEUE = [];   // upgrades requested by the "boostCompanion" effects, applied by flushCompanion
const isCompanion = s => !!(s && s.companion);
// The companion in hand does not count toward the hand limit.
const handCount = g => g[Z.reserve].filter(h => !(h.kind === 'servant' && isCompanion(h.s))).length;
const handFull = g => handCount(g) >= HAND_MAX;
// The first servant of the type named by the description recruited in the game adds the companion to the hand.
function grantCompanion(g, types, say) {
  const rule = companionRule();
  if (!rule || g.companion || !types.includes(rule.type)) return;
  const s = mkServant({ ...rule.card, name: companionName(g.companionNumber), types: [...rule.card.types], kw: [...rule.card.kw], skill: rule.card.skill.map(k => ({ ...k })) });
  s.companion = true; g.companion = { s, dead: false };
  g[Z.reserve].push({ kind: 'servant', s }); say(I18N.t('log.modelToHand', { name: s.name }));
}
// Applies the pending upgrades to the companion (in hand or in play). +X/+Y raises HP and max HP: the damage already taken remains.
function flushCompanion(g, say) {
  const q = COMPANION_QUEUE.splice(0);
  if (!g.companion || g.companion.dead) return;
  const s = g.companion.s;
  q.forEach(b => { const av = `${s.atk}/${s.hp}`; s.atk += b.a; s.hp += b.h; s.maxhp += b.h; say(I18N.t('log.modelGains', { name: s.name, a: b.a, h: b.h, before: av, after: `${s.atk}/${s.hp}` })); });
}
// End of combat: the companion keeps its damage; if it did not survive, it is lost for the mission.
function syncCompanion(g, res, say) {
  const pr = g.companion;
  if (!pr || pr.dead || !g[Z.field].includes(pr.s)) return;
  const el = res.survivors.p.find(x => x.uid === pr.s.uid);
  if (el) pr.s.hp = Math.max(1, Math.min(pr.s.maxhp, pr.s.hp - Math.max(0, el.maxhp - el.hp)));
  else { pr.dead = true; g[Z.field] = g[Z.field].filter(x => x !== pr.s); say(I18N.t('log.modelDestroyed', { name: pr.s.name })); }
}

// A deathrattle of a template flagged "owes" makes the player owe an equipment, drawn like an offer, when the card writes a give by "offer" (arrives at the next reinforcement).
const owesEquipment = k => (POWERS.all()[k.fx] || {}).owes === 'equipment' && !!(k.give && k.give.offer);

function applyFx(k, src, allies, enemies, say, bonus, level, extra) {
  if (POWERS.run(k, src, allies, enemies, say, level, bonus, extra)) return;   // powers already described by bricks (data/powers.json)
  // A power that makes the player owe items announces it when it is a deathrattle (the items arrive at the next reinforcement).
  if (GAME.is(k, 'deathrattle') && owesEquipment(k)) say(I18N.t('log.equipWillJoin', { name: src.name }));
}

// Equipment sockets (documentation/idees/nouvelles.md, section 8): a servant has 0 to 3 sockets of a color (blue, green, red) or chromatic (any color).
// An equipment has one color and goes in a free socket of the same color, or in a chromatic one; an equipment without a color (token) fits any socket.
// Index of the free socket that would receive `eq` (an exact color is preferred to a chromatic socket), -1 if there is none.
function socketIndex(s, eq) {
  const sock = s.sockets || [], slots = s.slots || [], rule = RULES.sockets;
  let wild = -1;
  for (let i = 0; i < sock.length; i++) {
    if (slots[i]) continue;
    if (eq.color ? sock[i] === eq.color : rule.uncoloredFitsAny) return i;
    if (sock[i] === rule.wildcard && wild < 0) wild = i;
  }
  return wild;
}
const canEquip = (s, eq) => socketIndex(s, eq) >= 0;
const freeSockets = s => (s.sockets || []).filter((c, i) => !(s.slots || [])[i]).length;

// Puts an equipment on a servant. Returns false (nothing changes) when no free socket accepts it.
// force: effect of a combat only (the Smuggler takes an enemy equipment): no socket needed, nothing to give back afterwards.
function applyEquip(s, eq, force = false) {
  if (!force) { const i = socketIndex(s, eq); if (i < 0) return false; if (!s.slots) s.slots = []; s.slots[i] = eq; }
  s.atk += eq.atk; s.hp += eq.hp; s.maxhp += eq.hp;
  if (eq.kw && !s.kw.includes(eq.kw)) { s.kw.push(eq.kw); if (!force) (s.eqKw = s.eqKw || []).push(eq.kw); }
  s.equips.push(eq.name);
  [].concat(eq.skill || []).forEach(k => s.eqSkills.push(k));
  if (eq.mod) { s.summonA += eq.mod.summonA || 0; s.summonH += eq.mod.summonH || 0; s.healBonus = (s.healBonus || 0) + (eq.mod.heal || 0); }
  return true;
}
// Equips a servant of the game (not of a combat) and announces it: the event 'equipped' goes to the cards of the board (evt: g, servant, equipment) so that powers can react.
function equipWithEvents(g, s, eq, say) {
  if (!applyEquip(s, eq)) return false;
  if (forPlayer(g)) EVENTS.emit('equipmentPlaced', { target: s.uid, name: eq.name });
  POWERS.react('equipped', g[Z.field], { g, servant: s, equipment: eq }, say);
  return true;
}
// Takes every equipment off a servant (fusion, replacement) and gives back the cancelled bonuses. Returns the equipment taken off.
function removeEquips(s) {
  const defs = (s.slots || []).filter(Boolean);
  defs.forEach(eq => {
    s.atk = Math.max(0, s.atk - eq.atk); s.hp = Math.max(1, s.hp - eq.hp); s.maxhp = Math.max(1, s.maxhp - eq.hp);
    if (eq.kw && (s.eqKw || []).includes(eq.kw)) { s.eqKw.splice(s.eqKw.indexOf(eq.kw), 1); s.kw.splice(s.kw.indexOf(eq.kw), 1); }
    const n = s.equips.indexOf(eq.name); if (n >= 0) s.equips.splice(n, 1);
    [].concat(eq.skill || []).forEach(k => { const j = s.eqSkills.indexOf(k); if (j >= 0) s.eqSkills.splice(j, 1); });
    if (eq.mod) { s.summonA -= eq.mod.summonA || 0; s.summonH -= eq.mod.summonH || 0; s.healBonus = (s.healBonus || 0) - (eq.mod.heal || 0); }
  });
  s.slots = (s.sockets || []).map(() => null);
  return defs;
}
// Equipment taken off a servant (event: 'onReplace' or 'onFusion', see RULES.sockets): they go back to the hand or are lost, depending on the rule;
// each one has a chance (RULES.sockets.breakChance) to break and be lost; if the hand is full, they are lost too.
function giveBackEquips(g, defs, say, event) {
  const rule = RULES.sockets;
  defs.forEach(def => {
    POWERS.react('unequipped', g[Z.field], { g, equipment: def, reason: event }, say);   // announced before the equipment is returned, broken or lost
    if (rule[event] !== 'returnToHand') say(I18N.t('log.equipLost', { item: def.name }));
    else if (rng() < rule.breakChance) say(I18N.t('log.equipBroke', { item: def.name }));
    else if (handFull(g)) say(I18N.t('log.equipLostHandFull', { item: def.name }));
    else { g[Z.reserve].push({ kind: 'equip', def }); say(I18N.t('log.equipReturns', { item: def.name })); }
  });
}

// ---------- Derived triggers (game.json, triggers with `on`), shared by the combat and the reinforcement ----------
// The cards a derived trigger concerns for an event: `who` names the card by a field of the event (target, source, attacker, card), by the card whose power caused it
// (causeCard), or the whole board of the target / of its foes. lookup(uid) finds a card, sideOf(card, foes) gives the cards of its side or of the other side.
function derivedCards(d, ev, lookup, sideOf) {
  if (d.who === 'targetSide' || d.who === 'foeSide') { const t = lookup(ev.target); return t ? sideOf(t, d.who === 'foeSide') : []; }
  const c = lookup(d.who === 'causeCard' ? ev.cause && ev.cause.card : ev[d.who]);
  return c ? [c] : [];
}
// The powers of `card` that this trigger plays now: the condition on the event holds, the limit (once: combat / card) is not used up, the card has powers of that name.
function derivedPowers(d, ev, card, firedOnce) {
  if (d.if != null && !POWERS.value(d.if, { evt: ev, params: {}, vars: {}, carrier: card, refs: {}, extra: {}, target: null })) return [];
  const key = d.once === 'card' ? d.name + ':' + card.uid : d.name;
  if (d.once && firedOnce.has(key)) return [];
  const ks = skillsOf(card).filter(k => k.t === d.name);
  if (ks.length && d.once) firedOnce.add(key);
  return ks;
}
// The same in the reinforcement: the events the player's actions emitted since the last look (EVENTS.peek) are looked at once each, at the moment the screen is redrawn, so
// that an effect never runs in the middle of another. The cards are those of the board; the hand holds none that acts.
let settledTo = 0, settledEpoch = 0;   // position in the event buffer already looked at, and the epoch of the buffer it belongs to
const reinforcementOnce = new Set();
function settleReinforcement(g, say) {
  const derived = GAME.derivedTriggers();
  if (!derived.length) return;
  const buf = EVENTS.peek(), find = uid => (uid == null ? null : g[Z.field].find(s => s.uid === uid) || g[Z.reserve].filter(h => h.kind === 'servant').map(h => h.s).find(s => s.uid === uid) || null);
  if (settledEpoch !== EVENTS.epoch || settledTo > buf.length) { settledTo = 0; settledEpoch = EVENTS.epoch; }
  for (let n = 0; settledTo < buf.length && n < 100; n++) {
    const ev = buf[settledTo++];
    if (ev.type === 'roomStarted') reinforcementOnce.clear();   // "once" lasts one reinforcement
    for (const d of derived) {
      if (d.on !== ev.type) continue;
      for (const card of derivedCards(d, ev, find, (c, foes) => (foes ? [] : g[Z.field].slice()))) {
        if (!g[Z.field].includes(card)) continue;
        for (const k of derivedPowers(d, ev, card, reinforcementOnce)) {
          POWERS.react('game', [card], { g, trigger: k.t, only: k }, say);
          applyFx(k, card, g[Z.field], [], say);
        }
      }
    }
  }
}

// Automatic combat. Works on copies: the player's servants
// therefore "come back" intact for the next combat.
function runCombat(playerBoard, enemyBoard, ctx) {
  const frames = [];
  const cl = s => ({ ...s, equips: [...s.equips], eqSkills: [...(s.eqSkills || [])], kw: [...s.kw], shield: shieldCount(s), reb: s.kw.includes('rebirth') && !s.companion, hadShield: shieldCount(s) > 0, shUsed: 0, resUsed: 0 });
  const B = { p: playerBoard.map(x => ({ ...cl(x), side: 'p' })), e: enemyBoard.map(x => ({ ...cl(x), side: 'e' })) };
  // The powers of the enemies at the start of the combat (their own, not those of their equipment): a servant can be offered to copy one (choices.adaptation.foes).
  combatBoards = B;
  const foeSkills = ((afterCombatChoice() || {}).foes ? B.e.flatMap(s => [s.skill, ...(s.extra || [])].filter(Boolean).filter(k => { const x = afterCombatChoice().learnExcludes; return !x.powers.includes(k.fx) && !x.triggers.includes(k.t); }).map(k => ({ skill: { ...k }, from: s.name }))) : []);
  const foeEquips = B.e.flatMap(s => s.equips);   // the equipment the enemies carry at the start (a power can take one of them at the end of the combat)
  EVENTS.take(); EVENTS.track([B.p, B.e]);   // the events of this combat only; the combat looks at both boards before each frame
  // Derived triggers (game.json, triggers with `on`): an event of the combat can fire the powers of a trigger the mod invented. The events are queued as they happen and
  // played at a safe point (settle: between two attacks, after the start of the combat), never in the middle of an effect. The cards concerned (`who`) play their powers
  // of that trigger; `if` is an expression on the event ({ evt: field }); `once`: 'combat' = only the first time in the combat, 'card' = once per card.
  const derived = GAME.derivedTriggers(), queued = [], firedOnce = new Set();
  if (derived.length) EVENTS.listen(ev => { for (const d of derived) if (d.on === ev.type) queued.push({ d, ev }); });
  const sideCards = (card, foes) => B[foes ? other(card.side) : card.side].slice();
  function settle() {
    if (!derived.length) return;
    EVENTS.sync();
    for (let n = 0; queued.length && n < 100; n++) {
      const { d, ev } = queued.shift();
      for (const card of derivedCards(d, ev, uid => EVENTS.card(uid), sideCards)) {
        if (card.hp <= 0 || !B[card.side].includes(card)) continue;
        const ks = derivedPowers(d, ev, card, firedOnce);
        ks.forEach(k => applyFx(k, card, B[card.side], B[other(card.side)], m => say(m), bonusOf(card.side)));
      }
    }
    queued.length = 0;
  }
  const other = side => (side === 'p' ? 'e' : 'p');
  // When a servant loses its Shield (the keyword whose charges absorb damage): the powers of its side react to the event "shieldLost" (all of them), then to the event
  // "shieldRestore" (the first one that can restores the Shield and claims the event). The player's heroes take part in the second one, after the cards. Checked after each frame.
  let checking = false;
  const heroCarriers = (ctx.heroes || []).map(h => ({ name: h.def.name, kw: [], skill: h.def.power, hero: h, shUsed: 0 }));   // a hero's power reacts like a card's; its uses are counted here
  const checkShields = () => {
    if (checking) return;
    checking = true;
    ['p', 'e'].forEach(side => B[side].forEach(s => {
      if (s.hp <= 0 || !s.hadShield || s.shield) { if (s.shield) s.hadShield = true; return; }
      s.hadShield = false;
      const evt = { target: s, allies: B[side], enemies: B[other(side)], level: ctx.level || 1 };
      POWERS.react('shieldLost', B[side].filter(h => h.hp > 0), evt, say);
      const carriers = [...B[side].filter(h => h.hp > 0), ...(side === 'p' ? heroCarriers.filter(h => h.hero.hp > 0) : [])];
      POWERS.react('shieldRestore', carriers, { ...evt }, say);
    }));
    checking = false;
  };
  const say = (msg, hl) => {
    EVENTS.sync();
    // A message that shows one card acting on another (hl: att, tgt) is an attack to the eye, whoever does it: the exchange of an attack states it itself, a power that heals or
    // strikes (DE-D0, Border Guard…) does it here.
    if (hl && hl.att != null && hl.tgt != null && !EVENTS.peek().some(e => e.type === 'attack' && e.attacker === hl.att && e.target === hl.tgt)) EVENTS.emit('attack', { attacker: hl.att, target: hl.tgt, ranged: !!hl.ranged, byPower: true });
    frames.push({ p: B.p.map(s => ({ ...s })), e: B.e.map(s => ({ ...s })), msg, hl: hl || {}, events: EVENTS.take() }); checkShields();
  };

  const fallen = { p: [], e: [] };   // the dead servants that carry a permanent gain to keep (keepDead)
  const usedRattles = { p: [], e: [] };   // Deathrattles already triggered during this combat, per side
  function deaths(prio = []) {
    for (let guard = 0; guard < 500; guard++) {
      POWERS.refreshAuras([{ cards: B.p, foes: B.e }, { cards: B.e, foes: B.p }]);   // auras are recomputed at each step: the loss of one can kill, and the death that follows is seen by the next step (left to right)
      const all = [...B.p.map(s => ['p', s]), ...B.e.map(s => ['e', s])].filter(([, s]) => s.hp <= 0);
      if (!all.length) return;
      all.sort((a, b) => {
        const ia = prio.indexOf(a[1].uid), ib = prio.indexOf(b[1].uid);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const [side, s] = all[0];
      // Portable Defibrillator: the first time the carrier should die, it survives with 1 HP (once per combat, the flag is copied with the servant).
      if (POWERS.react('dying', [s], { target: s }, say).cancelled) continue;
      // The power of the boss that faces the player reacts when one of the servants of its board should die (the dying one included): it can cancel the death.
      if (side === 'e' && foeBoss && POWERS.react('bossAllyDying', [bossCarrier], { target: s, allies: B.e, enemies: B.p }, say).cancelled) continue;
      // Lazarus Protocol: the powers of the allies react to the death of an ally (the dying card included); one of them can cancel it.
      if (POWERS.react('allyDying', B[side].filter(x => x.hp > 0 || x === s), { target: s, allies: B[side], enemies: B[other(side)] }, say).cancelled) continue;
      EVENTS.emit('death', { target: s.uid });
      say(I18N.t(side === 'p' ? 'log.diesAlly' : 'log.diesFoe', { name: s.name }), { dead: [s.uid] });
      s.deathIdx = B[side].indexOf(s);
      B[side].splice(s.deathIdx, 1);
      if (s.keepDead && (s.perm || s.permHp)) fallen[side].push(s);   // a permanent gain written with keepDead is kept even by a servant that dies in this combat
      // A power that replays the deathrattles already used by its side during this combat (its own and those it replays are not remembered).
      const runRattle = k => {
        applyFx(k, s, B[side], B[other(side)], m => say(m), bonusOf(side), undefined, { killer: s.lastHitBy });
        if (owesEquipment(k)) {   // the equipment arrives in hand at the next reinforcement (same for the Boss board)
          if (side === 'p') ctx.owedEquipment = (ctx.owedEquipment || 0) + 1; else if (foeTeam) foeTeam.owedEquipment = (foeTeam.owedEquipment || 0) + 1;
        }
      };
      skillsOf(s).filter(k => GAME.is(k, 'deathrattle')).forEach(k => {
        if (((POWERS.all()[k.fx] || {}).replaysUsed) === 'deathrattle') { [...usedRattles[side]].forEach(runRattle); return; }
        runRattle(k); usedRattles[side].push(k);
      });
      // When an enemy dies: the Smuggler recovers one of its equipment, for this combat only.
      POWERS.react('enemyDeath', B[other(side)].filter(h => h.hp > 0), { dead: s, allies: B[other(side)], enemies: B[side] }, say);
      // When an ally dies (of the type "of" of the power, if it names one): the other servants with the power react (effect valid for the combat).
      const concerns = k => !k.of || s.types.includes(k.of);
      B[side].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => GAME.is(k, 'allyDeath') && concerns(k)).forEach(k =>
        applyFx(k, h, B[side], B[other(side)], m => say(m), bonusOf(side))));
      // When an enemy dies (of the type "of", if any): the servants with the power react (for example, permanently gain +X/+Y, kept by endCombatFx).
      B[other(side)].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => GAME.is(k, 'enemyDeath') && concerns(k)).forEach(k => applyFx(k, h, B[other(side)], B[side], m => say(m))));
      // The dead card's allies react in three steps (same order as before): resurrection ("resurrect"), routine extraction, then the Lazarus Protocol.
      // The steps share the event: a resurrection claimed at the first step is known by the third one.
      const dying = { dead: s, allies: B[side], enemies: B[other(side)] };
      ['deathResurrect', 'deathExtract', 'deathLazarus'].forEach(step => POWERS.react(step, B[side].filter(h => h.hp > 0), dying, say));
      POWERS.react('deathRebirth', [s], dying, say);   // Rebirth
      // The power of the boss that faces the player reacts when one of the servants of its board has died; level: the reinforcement level of that board (Erky: +X/+X, X = its level).
      { const bf = bossOfSide(side); if (bf) POWERS.react('bossAllyDeath', [bf.carrier], { dead: s, allies: B[side], enemies: B[other(side)], level: GAME.val(bf.team, 'level') }, say); }
    }
  }

  say(I18N.t('log.combatStart'));
  // The Boss board that fights (side e) has its own summon bonus and its own equipment to receive: ctx.foeTeam (fights between Boss boards) or the presented board of the game.
  const foeTeam = ctx.foeTeam || (ctx.bossTeams && ctx.bossTeams[ctx.bossCur]) || null;
  // The power belongs to the boss of the board that faces the player (never in the fights between Boss boards, noBossPower), whether or not its permanent servant is still alive.
  // ctx.bossPower: a power imposed by the caller (tests that fight two bare boards).
  const foeBoss = ctx.noBossPower || ctx.bossPower || !foeTeam || !foeTeam.boss || !foeTeam.boss.power ? null : foeTeam.boss, bossPower = ctx.bossPower || (foeBoss ? foeBoss.power : 'none'), bossName = foeBoss ? foeBoss.name : (ctx.bossPower ? I18N.t('log.opponentName') : '');
  const bossCarrier = { name: bossName, kw: [], skill: { t: 'bossPower', fx: bossPower, a: 0, h: 0, n: 0 }, extra: [], eqSkills: [], lrSkills: [] };
  // Whose boss power reacts to the death of a servant of this side: the boss of the board that faces the player (side e); and, in the fights between Boss boards (ctx.boardBosses),
  // the boss of each board whose power is written to play there too (template field "boardFights").
  const bossOfSide = side => {
    if (side === 'e' && foeBoss && foeTeam) return { carrier: bossCarrier, team: foeTeam };
    const team = ctx.boardBosses && ctx.boardBosses[side];
    if (!team || !team.boss || !team.boss.power || !(POWERS.all()[team.boss.power] || {}).boardFights) return null;
    return { carrier: { name: team.boss.name, kw: [], skill: { t: 'bossPower', fx: team.boss.power, a: 0, h: 0, n: 0 }, extra: [], eqSkills: [], lrSkills: [] }, team };
  };
  const bonusOf = side => (side === 'p' ? ctx.summonBonus : foeTeam && foeTeam.summonBonus);   // bonus of each side for the units it summons, by kind of unit
  // Start of combat. How a power is treated is written in its template (data/powers.json, field "start"):
  //  - late: played after all the other effects of the side (the replays: Imperial Orator, Impulse Duplicator);
  //  - jams: each Quantum Jammer prevents the first start-of-combat effect of the opposing side (counted when the combat begins);
  //  - jammable: false for the effects that cannot be prevented (the Jammers themselves, Impulse Duplicator);
  //  - recorded: the first recorded effect of the side is the one Impulse Duplicator plays again (a prevented effect is not played, so not replayable).
  const jam = { p: 0, e: 0 };
  ['p', 'e'].forEach(side => B[side].forEach(s => skillsOf(s).filter(k => GAME.is(k, 'startCombat')).forEach(k => { jam[other(side)] += POWERS.startInfo(k.fx).jams; })));
  const jammed = (side, src) => {
    if (jam[side] <= 0) return false;
    jam[side]--; say(I18N.t('log.jammed', { target: src.name }), { tgt: src.uid }); return true;
  };
  const firstOf = { p: null, e: null };   // per side: the first recorded start-of-combat effect (what Impulse Duplicator plays again)
  // "When there is room on the board": each servant concerned summons a unit, one per check.
  const fillSpace = () => ['p', 'e'].forEach(side => [...B[side]].forEach(s => {
    if (s.hp > 0 && B[side].includes(s) && B[side].length < MAX_BOARD) skillsOf(s).filter(k => GAME.is(k, 'space')).forEach(k => applyFx(k, s, B[side], B[other(side)], m => say(m), bonusOf(side)));
  }));
  // The effects of a band are played from left to right, or from right to left when the order event says so (direction).
  // filter(k) keeps the powers of the current priority tier (and, with the replays inBand, of the current late / not late pass).
  const startFx = (list, allies, enemies, filter, direction) => {
    const side = allies === B.p ? 'p' : 'e', b = bonusOf(side);
    (direction === 'rightToLeft' ? [...list].reverse() : list).forEach(s => {
      skillsOf(s).filter(k => GAME.is(k, 'startCombat') && filter(k)).forEach(k => {
        const info = POWERS.startInfo(k.fx);
        if (info.jammable && jammed(side, s)) return;   // prevented effect: it is not replayable by Impulse Duplicator either
        applyFx(k, s, allies, enemies, m => say(m), b, undefined, { first: () => firstOf[side] });
        if (info.recorded && !isLate(k) && !firstOf[side]) firstOf[side] = { k, s };
      });
    });
  };
  const isLate = k => POWERS.startInfo(k.fx).late;

  // Events about the order (spec 12.3): the powers of both camps may change their fields. Same order as the default bands: the Boss's own power,
  // the Boss's board, the heroes' powers, then the player's board. evt.ownSide tells a power which camp it belongs to. The modifications posed with a
  // duration (ctx.timedMods) are applied first, then the reactions of this combat.
  const announce = (event, evt) => {
    evt.game = ctx;
    POWERS.applyTimed(ctx, event, evt);
    POWERS.react(event, null, evt, say, [[[bossCarrier], B.e, B.p, 'boss'], [B.e, B.e, B.p, 'boss'], [heroCarriers.filter(h => h.hero.hp > 0), B.p, B.e, 'player'], [B.p, B.p, B.e, 'player']]
      .map(([cards, allies, enemies, ownSide]) => ({ cards, allies, enemies, ownSide })));
    delete evt.ownSide; delete evt.allies; delete evt.enemies; delete evt.game;
    return evt;
  };

  // Resolution order of the start of combat: data/rules.json (order), then what the powers change through the event "resolutionOrder".
  // A band is who plays: the Boss's own power, the Boss's board (opponent), the player's heroes, the player's board (ally).
  // The effects are played by priority (first -100, normal 0, late +100, or a number: "start.priority" of the template), then by band, then in the direction.
  // The replays (late effects) are at +100 in the profile "afterAll"; in "inBand" they come right after their band (the old behavior).
  const BANDS = ['boss', 'opponent', 'heroes', 'ally'];
  const profile = RULES.order.profiles[RULES.order.profile];
  const resolution = announce('resolutionOrder', { bands: [...profile.bands], direction: profile.direction || 'leftToRight', replays: profile.replays });
  const order = {
    bands: [...new Set(resolution.bands.filter(x => BANDS.includes(x)))],
    direction: resolution.direction === 'rightToLeft' ? 'rightToLeft' : 'leftToRight',
    replays: resolution.replays === 'inBand' ? 'inBand' : 'afterAll'
  };
  BANDS.forEach(x => { if (!order.bands.includes(x)) order.bands.push(x); });   // a band that was removed still plays, at the end
  const explicit = fx => POWERS.priorityValue(POWERS.startInfo(fx).priority);
  const priorityOf = k => { const e = explicit(k.fx); return e != null ? e : (isLate(k) && order.replays === 'afterAll' ? 100 : 0); };
  const heroStart = ctx.heroes.filter(h => h.hp > 0 && h.def.power && GAME.is(h.def.power, 'startCombat'));
  const tiers = [...new Set([0, ...[...B.p, ...B.e].flatMap(s => skillsOf(s).filter(k => GAME.is(k, 'startCombat')).map(priorityOf)),
    explicit(bossPower), ...heroStart.map(h => explicit(h.def.power.fx))].filter(x => x != null))].sort((x, y) => x - y);
  const playBand = (band, tier, late) => {
    const keep = k => priorityOf(k) === tier && (late === null || isLate(k) === late);
    const ownTurn = x => (x == null ? 0 : x) === tier && late !== true;   // the Boss's power and the heroes' powers are never replays
    if (band === 'boss' && ownTurn(explicit(bossPower)) && (foeBoss || ctx.bossPower)) EVENTS.emit('bossPower', { name: bossName, power: bossPower });
    if (band === 'boss' && ownTurn(explicit(bossPower)) && (foeBoss || ctx.bossPower)) applyFx({ t: 'bossStart', fx: bossPower, a: 0, h: 0, n: 0 }, bossCarrier, B.e, B.p, m => say(m), null, undefined, { room: ctx.room });
    else if (band === 'ally') startFx([...B.p], B.p, B.e, keep, order.direction);
    else if (band === 'opponent') startFx([...B.e], B.e, B.p, keep, order.direction);
    else if (band === 'heroes') (order.direction === 'rightToLeft' ? [...heroStart].reverse() : heroStart).forEach(h => {
      if (ownTurn(explicit(h.def.power.fx)) && !jammed('p', { name: h.def.name, uid: null })) applyFx(h.def.power, { name: h.def.name, kw: [] }, B.p, B.e, m => say(m), null, ctx.level);
    });
  };
  tiers.forEach(tier => order.bands.forEach(band => {
    if (order.replays === 'inBand') { playBand(band, tier, false); playBand(band, tier, true); } else playBand(band, tier, null);
  }));
  deaths(); fillSpace(); deaths();

  const Q = { p: [], e: [] };
  const nextAtk = side => {
    for (;;) {
      if (!Q[side].length) Q[side] = B[side].map(s => s.uid);
      const id = Q[side].shift();
      const s = B[side].find(x => x.uid === id);
      if (s) return s;
    }
  };
  // Taunt: only enemies that have it are targeted. Exception: the "Target" powers (lowest HP,
  // enemy Pilot first) win over Taunt; if none applies, the normal rule plays.
  const target = (side, A) => {
    const foes = B[other(side)];
    const chosen = POWERS.react('targeting', [A], { attacker: A, allies: B[side], enemies: foes }, say).result;   // "Target" powers (enemy Pilot, lowest HP)
    if (chosen) return chosen;
    // Cards that cannot be targeted right now (event 'hideTargets': their power collects them); if every foe is hidden, they all can be.
    const hidden = POWERS.react('hideTargets', foes, { hidden: [], allies: foes, enemies: B[side] }).hidden, open = foes.filter(f => !hidden.includes(f)), reachable = open.length ? open : foes;
    const pv = POWERS.react('taunt', foes, { taunters: [] }).taunters.filter(f => reachable.includes(f));   // Taunt: only the enemies that have it can be targeted
    return pick(pv.length ? pv : reachable);
  };
  // Who attacks first: the camp with more servants, the player on a tie. The event firstSide lets powers change it (side: player or boss; reason: moreServants or tie).
  const firstSide = announce('firstSide', { side: B.e.length > B.p.length ? 'boss' : 'player', reason: B.e.length === B.p.length ? 'tie' : 'moreServants' });
  let cur = firstSide.side === 'boss' ? 'e' : 'p';
  let attacks = 0, fatigue = 0, second = null;
  const lastSurv = { p: null, e: null };   // last wounded ally that survived an attack, per side (DE-D0)   // second: Fury servant that attacks a second time
  if (B.p.length && B.e.length) say(I18N.t(cur === 'p' ? 'log.playerFirst' : 'log.bossFirst'));
  settle();   // after the start of the combat
  while (B.p.length && B.e.length && attacks < 3000) {
    settle();   // between two attacks
    if (attacks >= RULES.fatigue.start) {   // fatigue (data/rules.json): every servant of both sides loses more HP at each turn
      fatigue += RULES.fatigue.increment;
      [...B.p, ...B.e].forEach(s => { s.hp -= fatigue; });
      say(I18N.t('log.fatigue', { amount: fatigue }));
      deaths();
      if (!B.p.length || !B.e.length) break;
    }
    const A = second || nextAtk(cur), isSecond = !!second;
    second = null;
    let T = target(cur, A);
    // DE-D0: instead of attacking, heals up to its max HP the last ally that survived an attack (if it is still alive and wounded).
    // A power can replace the attack of its carrier (DE-D0 heals instead of attacking).
    if (POWERS.react('attackTurn', [A], { attacker: A, last: lastSurv[cur], allies: B[cur], enemies: B[other(cur)] }, say).cancelled) { attacks++; cur = other(cur); continue; }
    // Bomb: the trapped servant suffers its bomb just before attacking (Shield applies). If it survives, it carries on with its attack; otherwise its turn is lost.
    if (A.bombs && A.bombs.length) {
      const bomb = POWERS.react('bombs', [A], { allies: B[cur], touched: [A.uid] }, say);
      deaths(bomb.touched); fillSpace(); deaths();
      if (A.hp <= 0 || !B[cur].includes(A)) { attacks++; cur = other(cur); continue; }
      if (!B.p.length || !B.e.length) continue;
      T = target(cur, A);
    }
    // Pacifying Seal: this servant's first chance to attack is lost (only once; the state template says so).
    if (POWERS.react('attackBlocked', [A], { attacker: A }, say).cancelled) { attacks++; cur = other(cur); continue; }
    // When an enemy attacks: each opposing servant with the power deals it X damage or removes X ATK from it (X = its rank) before the exchange; if it dies, it does not attack.
    B[other(cur)].filter(h => h.hp > 0).forEach(h => POWERS.react('enemyAttacks', [h], { attacker: A, allies: B[other(cur)], enemies: B[cur] }, say));
    if (A.hp <= 0) { deaths([A.uid]); fillSpace(); deaths(); attacks++; cur = other(cur); continue; }
    // Reactions of the powers when an allied summoned unit attacks (before the damage, the attacker benefits).
    POWERS.react('attackStart', B[cur].filter(h => h.hp > 0), { attacker: A, allies: B[cur], enemies: B[other(cur)] }, say);
    // Before each of its attacks the servant's powers act on the target (e.g. the Phantom removes ATK from it), before the damage and retaliation are computed.
    POWERS.react('beforeAttack', [A], { attacker: A, target: T, allies: B[cur], enemies: B[other(cur)] }, say);
    // Damage doubled against enemy Pilots, only when the servant attacks (not on retaliation).
    const dA = POWERS.react('attackDamage', [A], { attacker: A, target: T, amount: A.atk }).amount, dT = POWERS.react('retaliation', [A], { attacker: A, target: T, amount: POWERS.react('riposteMuted', [T], { amount: T.atk }).amount }).amount;   // Synaptic Jammer: the first attack suffered is not retaliated against; Ranged: no retaliation
    if (cur === 'e') POWERS.react('bossAttack', [bossCarrier], { attacker: A, allies: B.e, enemies: B.p }, say);   // Echo
    // Assault: triggers when the servant attacks, before the attack's damage.
    skillsOf(A).filter(k => GAME.is(k, 'assault')).forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    POWERS.react('beforeDamage', [A], { attacker: A, target: T }, say);   // Shield breakers
    const hpA0 = A.hp, hpT0 = T.hp;
    EVENTS.emit('attack', { attacker: A.uid, target: T.uid, ranged: A.kw.includes('ranged') });
    const back = hpT0 > 0 ? dT : 0;           // a target already killed by an assault power (Automatic Turret) does not retaliate
    hit(T, dA, A); hit(A, back, T);          // damage and retaliation are simultaneous
    say(I18N.t(back ? 'log.attack' : 'log.attackNoRetaliation', { attacker: A.name, target: T.name, damage: dA, back }), { att: A.uid, tgt: T.uid, ranged: A.kw.includes('ranged') });
    // Border Guard (overflow onto a neighbor) and Covering Fire (the ally on the right shoots too).
    POWERS.react('afterAttack', [A], { attacker: A, target: T, allies: B[cur], enemies: B[other(cur)] }, say);
    if (T.hp > 0 && T.hp < hpT0) lastSurv[other(cur)] = T;
    if (A.hp > 0 && A.hp < hpA0) lastSurv[cur] = A;
    // After taking damage and surviving (attack or retaliation): the servant triggers its effects (Nanite Injector).
    [[A, hpA0, cur], [T, hpT0, other(cur)]].forEach(([x, h0, side]) => {
      if (x.hp > 0 && x.hp < h0) skillsOf(x).filter(k => GAME.is(k, 'afterDamage')).forEach(k => applyFx(k, x, B[side], B[other(side)], m => say(m), bonusOf(side)));
    });
    // Ballistic Accelerator: the servant that attacks without killing its target (Shield included) permanently gains +X ATK (kept by endCombatFx).
    if (T.hp > 0) skillsOf(A).filter(k => GAME.is(k, 'attackNoKill')).forEach(k => applyFx(k, A, B[cur], B[other(cur)], say));
    // After each attack received by an ally, the servants concerned heal that ally (never above its max HP).
    if (T.hp > 0) B[other(cur)].filter(h => h.hp > 0).forEach(h => POWERS.react('allyHit', [h], { target: T, attacker: A }, say));
    // When it survives its attack: the attacking servant gains X ATK for the combat.
    if (A.hp > 0) skillsOf(A).filter(k => GAME.is(k, 'attackSurvive')).forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    // LR-04: each time an allied Pilot (itself included) survives an attack it inflicts, it is THAT Pilot (A) that permanently gains +X ATK,
    // once per living Instructor on the board. The gain is kept by endCombatFx.
    POWERS.react('attackEnd', B[cur].filter(h => h.hp > 0), { attacker: A, allies: B[cur], enemies: B[other(cur)] }, say);
    // When it survives an attack: immediate gain, kept after the combat (applied to the board servant by endCombatFx).
    if (T.hp > 0) skillsOf(T).filter(k => GAME.is(k, 'survive')).forEach(k => applyFx(k, T, B[other(cur)], B[cur], say));
    POWERS.react('afterExchange', [bossCarrier], { allies: B.e, enemies: B.p }, say);   // Regeneration
    deaths([A.uid, T.uid]); fillSpace(); deaths();
    attacks++;
    // Fury: the servant attacks a second time in a row, if it survived.
    if (!isSecond && A.hp > 0 && B[cur].includes(A) && B[other(cur)].length && POWERS.react('afterTurn', [A], { attacker: A, target: T }, say).again) { second = A; continue; }   // Fury, or a power that attacks again under a condition (the target is in the event)
    cur = other(cur);
  }
  const winner = B.p.length && !B.e.length ? 'p' : B.e.length && !B.p.length ? 'e' : 'draw';
  say(I18N.t(winner === 'p' ? 'log.combatWon' : winner === 'e' ? 'log.combatLost' : 'log.combatDraw'));
  settle(); EVENTS.sync(); EVENTS.listen(null); EVENTS.untrack();
  combatBoards = null;
  return { frames, winner, survivors: { p: B.p, e: B.e }, fallen, attacks, foeEquips, foeSkills };
}

// ---------- Game ----------
// The types of the dungeon: its fixed types (types) plus those it draws at random when the game starts (drawTypes: a list, one type per entry, drawn in the order of the list
// among the types of a group of the vocabulary or of a given list (from), never a type already fixed or drawn). The number of types drawn is the length of the list.
// All the Boss boards buy their servants among these types. Returns the types drawn (an entry with nothing left to draw gives null).
// forced: { <index of the entry of drawTypes>: type } the types already decided (the player picked the boss of that entry): they are kept, and the others are drawn around them.
const drawEntryPool = e => { const group = e.group ? TYPE_GROUPS.find(gr => gr.id === e.group) : null; return e.from || (group ? drawableOfGroup(group.id) : DRAWABLE_TYPES); };
function drawDungeonTypes(dungeon, forced = {}) {
  const taken = [...(dungeon.types || []), ...Object.values(forced)];
  return (dungeon.drawTypes || []).map((e, i) => {
    if (forced[i]) return forced[i];
    const options = drawEntryPool(e).filter(t => !taken.includes(t));
    if (!options.length) return null;
    const t = pick(options); taken.push(t); return t;
  });
}
// The bosses a slot linked to a drawn type can give (those of its list, every boss without a list) that have a type the slot can really draw: one of its entry's pool, not a type fixed by the dungeon.
function slotCandidates(dungeon, i) {
  const s = (dungeon.slots || [])[i]; if (!s || s.boss) return [];
  const pool = drawEntryPool((dungeon.drawTypes || [])[s.drawn] || {}).filter(t => !(dungeon.types || []).includes(t));
  return (s.from || Object.keys(BOSSES)).map(id => BOSSES[id]).filter(b => b && b.types.some(t => pool.includes(t)));
}
// The types decided by the player's choice of bosses (choices: { <slot index>: boss id }): the first type of the boss that its slot can draw and that no other choice has taken.
function forcedTypes(dungeon, choices = {}) {
  const forced = {};
  Object.keys(choices).forEach(k => {
    const i = +k, s = (dungeon.slots || [])[i], b = BOSSES[choices[k]];
    if (!s || s.boss || !b || !slotCandidates(dungeon, i).includes(b)) return;
    const pool = drawEntryPool(dungeon.drawTypes[s.drawn] || {}), type = b.types.find(t => pool.includes(t) && !(dungeon.types || []).includes(t) && !Object.values(forced).includes(t));
    if (type) forced[s.drawn] = type;
  });
  return forced;
}
// The bosses of a game, in the order of the dungeon's list: a fixed boss ({ boss }), or a boss linked to a type drawn at random ({ drawn: index of the entry of drawTypes, from: bosses }):
// a boss of that type among those of the list (any boss of that type if there is no list), drawn at random, unless the player chose the boss of that slot (choices).
// A slot with no type drawn or no boss of that type gives nothing.
function resolveBosses(dungeon, drawn, choices = {}) {
  return (dungeon.slots || []).map((s, i) => {
    if (s.boss) return BOSSES[s.boss] || null;
    const type = drawn[s.drawn], chosen = BOSSES[choices[i]];
    if (chosen && type && chosen.types.includes(type)) return chosen;
    const options = (s.from || Object.keys(BOSSES)).map(id => BOSSES[id]).filter(b => b && b.types.includes(type));
    return type && options.length ? pick(options) : null;
  }).filter(Boolean);
}
// The player draws their cards from the types of their two heroes + RULES.game.extraTypes types drawn at random (the dungeon adds none).
// selection.drawnTypes / selection.bosses: the types the dungeon draws and the bosses of the game (drawn here if not provided, for example to start over with the same ones).
function newGame(selection) {
  // The state of the player's side comes from the description of the game (zones, resources, variables); what the player chose at the setup and the
  // initialisation effects of the description (setTypes, createSides below) complete it.
  return GAME.applySetup(GAME.initialSide(GAME.side('player')), selection);
}
// What a chosen item becomes in the game state (the categories of the description).
GAME.picked.hero = id => ({ def: HEROES[id], hp: HEROES[id].hp, maxhp: HEROES[id].hp });
GAME.picked.dungeon = id => DUNGEONS[id];
// The step of the random bosses has nothing to ask when the dungeon has no random slot.
GAME.skips.noRandomBosses = sel => !(DUNGEONS[sel.dungeon] && DUNGEONS[sel.dungeon].slots.some(s => !s.boss));
// setTypes: the types in play are those of the heroes plus the random ones the rules ask for (extraTypes), whatever the dungeon. The dungeon draws its own types (drawTypes)
// and its bosses (the fixed ones, and those linked to a type drawn); g.bossExtra keeps the types drawn (what the card shows), g.bossIds the bosses of the game.
GAME.init.setTypes = (g, selection) => {
  const types = [...new Set(g.heroes.flatMap(h => h.def.types).filter(Boolean))];
  for (let i = 0; i < RULES.game.extraTypes && DRAWABLE_TYPES.some(t => !types.includes(t)); i++) types.push(pick(DRAWABLE_TYPES.filter(t => !types.includes(t))));
  g.types = types;
  const choices = selection.bossChoices || {};
  g.drawnTypes = selection.drawnTypes || drawDungeonTypes(g.dungeon, forcedTypes(g.dungeon, choices)); g.bossExtra = g.drawnTypes.filter(Boolean);
  g.bossIds = selection.bosses || resolveBosses(g.dungeon, g.drawnTypes, choices).map(b => b.id);
};
// The permanent servant of a boss: the servant described in its card, always on the board of the boss (never replaced, it does not fuse, it keeps what it gains).
// It has the name of its boss (unless the texts card.<boss>.servant name it: then it is a card of its own, id <boss>.servant, illustration images/servants/<boss>-servant) and, unless the card of the servant lists its own "types" (e.g. an exclusive species), its types; the scenery of the dungeon is its background.
const permanentServant = (boss, dungeon) => mkServant({ ...boss.servant, id: boss.servantId || boss.id, name: boss.servantName || boss.name, types: [...(boss.servant.types || boss.types)], sockets: boss.servant.sock, fixed: true, bg: dungeon.id });
// createSides: one board per boss of the game; each starts with the permanent servant of its boss (if it has one) and follows the strategy of its boss.
GAME.init.createSides = g => {
  const bossTypes = [...g.dungeon.types, ...g.bossExtra], bosses = g.bossIds.map(id => BOSSES[id]);
  const strategies = strategiesFor(g.dungeon, bosses.length, bosses);   // one strategy per board: its boss's, else the dungeon's, else the mod's default
  g.boss = { name: g.dungeon.name, hp: 0, maxhp: 0 };   // the total of the bars, filled below (what the screens show for now)
  g.bossTeams = bosses.map((b, i) => makeTeam([...new Set([...bossTypes, ...(b.recruitTypes || [])])], (BOSS_BOARDS[Math.min(i, BOSS_BOARDS.length - 1)] || { malus: 0 }).malus, b.servant && permanentServant(b, g.dungeon), strategies[i], b));
  // Each board has the bar of its own boss. A board whose bar reaches 0 is defeated and leaves the dungeon.
  g.bossTeams.forEach(t => { t.bossHp = t.bossMax = t.boss.hp; t.defeated = false; });
  g.boss.hp = g.boss.maxhp = g.bossTeams.reduce((a, t) => a + t.bossMax, 0);
  g.companionNumber = companionWins() + 1;
};
const levelCost = lvl => GAME.table('game.levelCosts', lvl);    // level N -> N+1: contribution needed, by level (data/rules.json, game.levelCosts)

// ---------- Strategies of the Boss boards (strategies.json, spec documentation/mecaniques/strategies.md) ----------
// A strategy is named in strategies.json (list) or built into the engine ("random", which needs nothing from the mod). Its kind says how a board plays:
//   parametric: the engine routine aiReinforcement, tuned by want / level / equipP / score / target; board: the board is the plan of the room (rooms, growth);
//   random: legal moves drawn at random, with the same actions as the player. A dungeon chooses its strategy (`strategy`, and `strategies` per board); what it
//   does not choose comes from the mod (`default`), and what the mod does not say is "random". An entry is a name, { use, override } or { pool: [names] }.
const BUILTIN_STRATEGIES = { random: { kind: 'random' } };
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
const mergeDeep = (a, b) => (isPlain(a) && isPlain(b) ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, k in b ? mergeDeep(a[k], b[k]) : a[k]])) : b);
const resolveStrategy = (name, override) => {
  const base = BUILTIN_STRATEGIES[name] || STRATEGIES.list[name];
  if (!base) throw new Error(`Stratégie inconnue : ${name}`);
  return { name, ...mergeDeep(base, override || {}) };
};
// The strategy of each Boss board of a dungeon, from the most precise to the most general: that of its boss (bosses: the bosses of the game, in the order of the boards), the dungeon's
// entry for this board, the dungeon's, the mod's default.
// The boards that draw from the same pool share one shuffled deck, so that two boards do not get the same strategy while the pool allows it.
function strategiesFor(dungeon, count, bosses) {
  const decks = new Map();
  return Array.from({ length: count }, (_, i) => {
    const mine = bosses && bosses[i] && bosses[i].strategy, own = (dungeon.strategies || [])[i], entry = mine != null ? mine : own != null ? own : dungeon.strategy != null ? dungeon.strategy : STRATEGIES.default;
    if (typeof entry === 'string') return resolveStrategy(entry);
    if (!entry.pool) return resolveStrategy(entry.use, entry.override);
    const key = JSON.stringify(entry.pool);   // the deck is shuffled once, when the game starts: the strategies of the Boss are drawn then
    if (!decks.has(key)) decks.set(key, [...entry.pool].sort(() => rng() - 0.5));
    const deck = decks.get(key);
    const item = deck.length ? deck.shift() : pick(entry.pool);   // a name, or { use, override } (its own override goes on top of the pool's)
    return typeof item === 'string' ? resolveStrategy(item, entry.override) : resolveStrategy(item.use, mergeDeep(entry.override || {}, item.override || {}));
  });
}

// ---------- Boss boards ----------
// Each board is an automatic "player", with its hand, its reinforcement level and its Datacrons.
// It uses the same functions as the player (draw of 3 cards, placement, equipment, fusion).
function makeTeam(types, malus, permanent, strategy = resolveStrategy('random'), boss = null) {
  const team = Object.assign(GAME.initialSide(GAME.side('opponent')), { types, malus, behavior: strategy.name, strategy, heroes: [], boss });   // zones, resources and variables of the Boss's side: game.json
  if (permanent) team[Z.field].push(permanent);   // already a servant (permanentServant)
  return team;
}
// The value of a card or a servant is a score of the mod (strategies.scores): a list of terms { field | count | has | sharedTypes | score, times }, summed. A field that
// the card does not have counts for 0. The engine has "card" and "power" (the strength of a servant on the board) for a mod that does not write them.
const BUILTIN_SCORES = {
  card: [{ field: 'rank', times: 10 }, 'atk', 'hp', { count: 'kw', times: 3 }, { has: 'skill', times: 4 }, { count: 'extra', times: 4 }],
  power: [{ field: 'rank', times: 10 }, 'atk', 'hp', { count: 'equips', times: 2 }]
};
function scoreOf(name, o, t) {
  const terms = (STRATEGIES.scores && STRATEGIES.scores[name]) || BUILTIN_SCORES[name];
  if (!terms) throw new Error(`Score inconnu : ${name}`);
  return terms.reduce((sum, x) => {
    const d = typeof x === 'string' ? { field: x } : x;
    let v;
    if (d.field) v = o[d.field] || 0;
    else if (d.count) v = Array.isArray(o[d.count]) ? o[d.count].length : (o[d.count] ? 1 : 0);
    else if (d.has) v = o[d.has] ? 1 : 0;   // present (an empty list counts), unlike count, which counts the elements of a list
    else if (d.sharedTypes) {   // how many servants of the board share each type of the card
      const freq = {}; t[Z.field].forEach(s => (s.types || []).forEach(x => { freq[x] = (freq[x] || 0) + 1; }));
      v = (o.types || []).reduce((a, x) => a + (freq[x] || 0), 0);
    } else v = scoreOf(d.score, o, t);
    return sum + v * (d.times == null ? 1 : d.times);
  }, 0);
}
const powerOf = s => scoreOf('power', s);
const cardScore = c => scoreOf('card', c);
const bestOf = (cards, score = cardScore) => cards.reduce((b, c) => (score(c) > score(b) ? c : b));
// Preferences of a strategy (parameter prefer.servants / prefer.equipment: { cards: [ids], types: [types], weight }). Without a weight they come BEFORE the score: a card is ranked by its
// place in the list (the listed cards first, in order, then the types, in order: a first type beats a second one), then by how many preferred types it has,
// and only then by the score. A card with no preference is valued by the score alone, so a board with no preferences chooses exactly as before.
const NO_PREF = 1e9;
function preferTier(card, pref) {
  if (!pref) return NO_PREF;
  const cards = pref.cards || [], types = pref.types || [], i = cards.indexOf(card.id);
  if (i >= 0) return i;
  const j = (card.types || (card.type ? [card.type] : [])).map(x => types.indexOf(x)).filter(k => k >= 0);
  return j.length ? cards.length + Math.min(...j) : NO_PREF;
}
const preferCount = (card, pref) => (pref ? (card.types || (card.type ? [card.type] : [])).filter(x => (pref.types || []).includes(x)).length : 0);
// With a weight (prefer.<kind>.weight), a preference is no longer absolute: it adds points to the score, so that a much better card can still win. The first entry
// of the list (cards, then types) adds `weight`, the second weight / 2, the third weight / 3...; a card that matches several entries gets all their bonuses.
// The score is that of the strategy (the card score counts about 10 points per level), so a weight of 30 makes a preferred card worth about three levels.
function preferBonus(card, pref) {
  const cards = pref.cards || [], types = pref.types || [];
  let b = cards.includes(card.id) ? pref.weight / (cards.indexOf(card.id) + 1) : 0;
  (card.types || (card.type ? [card.type] : [])).forEach(x => { const k = types.indexOf(x); if (k >= 0) b += pref.weight / (cards.length + k + 1); });
  return b;
}
const prefOf = (t, kind) => { const b = bhv(t); return b && b.prefer ? b.prefer[kind] : undefined; };
// The card a board takes among those it is offered: the most preferred, the best score among equals.
// prefer.servants.diversity: a group of types (the species, for instance). A servant that brings a type of that group the board does not have yet comes BEFORE everything else
// (absolute, even with a weight): the board collects as many different types of the group as it can, then the other preferences and the score decide.
const groupTypesOn = (board, group) => new Set(board.flatMap(s => (s.types || []).filter(x => typesOfGroup(group).includes(x))));
const bringsNewType = (card, t, pref) => !!(pref && pref.diversity && t && (card.types || []).some(x => typesOfGroup(pref.diversity).includes(x) && !groupTypesOn(t[Z.field], pref.diversity).has(x)));
function chooseCard(cards, pref, score = cardScore, t = null) {
  const weighted = pref && pref.weight != null, news = c => (bringsNewType(c, t, pref) ? -1 : 0);
  const key = c => (weighted ? [news(c), -(score(c) + preferBonus(c, pref))] : [news(c), preferTier(c, pref), -preferCount(c, pref), -score(c)]), less = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  return cards.reduce((b, c) => (less(key(c), key(b)) ? c : b));
}

// Places what the hand contains: servants on the board (or in place of the weakest if it is full),
// equipment on the strongest servant; the rest is discarded.
function aiPlace(t, say) {
  for (let i = t[Z.reserve].length - 1; i >= 0; i--) {
    const h = t[Z.reserve][i];
    if (h.kind === 'servant') {
      if (t[Z.field].length < MAX_BOARD) placeServant(t, i, null, say);
      else {
        const free = t[Z.field].map((s, j) => j).filter(j => !t[Z.field][j].fixed);   // a permanent servant is never replaced
        const prefD = prefOf(t, 'servants');
        if (prefD && prefD.diversity) {   // diversity: the servant given up is the one whose loss costs the fewest different types (the weakest among those); the new one replaces it if it brings more types, or as many and is stronger
          const board = t[Z.field], kinds = list => groupTypesOn(list, prefD.diversity).size, after = j => kinds(board.filter((x, k) => k !== j).concat(h.s));
          const wj = free.reduce((w, j) => (w == null || after(j) > after(w) || (after(j) === after(w) && powerOf(board[j]) < powerOf(board[w])) ? j : w), null);
          if (wj != null && (after(wj) > kinds(board) || (after(wj) === kinds(board) && powerOf(h.s) > powerOf(board[wj])))) placeServant(t, i, wj, say); else { t[Z.reserve].splice(i, 1); t.stats.discarded++; }
          continue;
        }
        // The servant given up is the least preferred, the weakest among equals; the new one replaces it if it is more preferred, or stronger among equals.
        const pref = prefOf(t, 'servants'), hold = s => (pref && pref.weight != null ? [0, powerOf(s) + preferBonus(s, pref)] : [-preferTier(s, pref), powerOf(s)]), gt = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);
        const wi = free.reduce((w, j) => (gt(hold(t[Z.field][w]), hold(t[Z.field][j])) ? j : w), free[0]);
        if (free.length && gt(hold(h.s), hold(t[Z.field][wi]))) placeServant(t, i, wi, say); else { t[Z.reserve].splice(i, 1); t.stats.discarded++; }
      }
    } else if (t[Z.field].length) {
      // The preferred servant of the behavior if it has a compatible free socket, otherwise the strongest one that has; no socket anywhere: the equipment is discarded.
      const fits = t[Z.field].filter(s => canEquip(s, h.def));
      const wanted = chooseTarget(t, bhv(t).target);   // a strategy with no target (random) puts the equipment on the strongest
      const target = fits.includes(wanted) ? wanted : fits.length ? fits.reduce((b, s) => (powerOf(s) > powerOf(b) ? s : b)) : null;
      if (target) equipWithEvents(t, target, h.def, say); else t.stats.discarded++;
      t[Z.reserve].splice(i, 1);
    }
  }
  if (t[Z.field].length && t[Z.reserve].some(h => h.kind === 'equip')) aiPlace(t, say);   // equipment received from a battlecry
}

// Parametric strategy of a Boss board (strategies.json): the parameters tune an engine routine (aiReinforcement); the scores and targets below are ways to value a card or to choose a servant.
const bhv = t => t.strategy;
// The servant a board prefers (strategies.targets): { best: 'max' | 'min', score } (the first of the best), or { fixed: true } (the permanent servant of the boss, else the first). The engine has "strongest".
const BUILTIN_TARGETS = { strongest: { best: 'max', score: 'power' } };
function chooseTarget(t, name) {
  const d = (STRATEGIES.targets && STRATEGIES.targets[name]) || BUILTIN_TARGETS[name] || BUILTIN_TARGETS.strongest, f = t[Z.field];
  if (d.fixed) return f.find(x => x.fixed) || f[0];
  const better = d.best === 'max' ? (x, y) => x > y : (x, y) => x < y;
  return f.reduce((b, x) => (better(scoreOf(d.score, x, t), scoreOf(d.score, b, t)) ? x : b));
}
// The decision of a parametric board is a list of rules of the mod (strategies.routines): the first rule whose conditions all hold gives the action (servant, level or equip).
// A condition compares two values ({ lt | gt | le | ge | eq: [a, b] }; a value is a number, a { var } of the engine or a { param } of the strategy) or draws against a parameter
// ({ chance }). The conditions are tried in order and stop at the first that fails (a draw happens only if the ones before it hold).
const ROUTINE_COMPARE = { lt: (a, b) => a < b, gt: (a, b) => a > b, le: (a, b) => a <= b, ge: (a, b) => a >= b, eq: (a, b) => a === b };
function routineHolds(x, b, vars) {
  if (x.chance != null) return rng() < b[x.chance];
  const op = Object.keys(x)[0], val = v => (typeof v === 'number' ? v : v.var != null ? vars[v.var] : b[v.param]);
  return ROUTINE_COMPARE[op](val(x[op][0]), val(x[op][1]));
}
const chooseAction = (t, b, routine, vars) => routine.find(r => (r.if || []).every(x => routineHolds(x, b, vars))).do;
const bossWant = (b, room) => Math.min(MAX_BOARD, b.want.base + Math.floor(room / b.want.per));
const bossLevel = (b, room) => b.level.base + Math.floor(room / b.level.per);
// Room 1: every board receives rules.game.bossFirstRoomIncome (a flat number, no malus; the rules may say nothing: the room is then like the others). Afterwards the income of the room,
// one less (always, or at random, by the malus of the board). A game with no money gives nothing.
function boardIncome(t, room) {
  if (!GAME.hasRole('money')) return;
  const first = RULES.game.bossFirstRoomIncome;   // rules.game.bossFirstRoomIncome: what every board receives in the first room (when the rules do not say, the room is like the others)
  const inc = room === 1 && first != null ? first : Math.max(1, incomeFor(room) - (t.malus >= 1 ? 1 : rng() < t.malus ? 1 : 0));
  GAME.add(t, 'money', inc); t.stats.earned += inc;
}
// The strategy "random" (built into the engine): the board plays legal moves at random with the actions of the game, as the player would; it knows nothing of the rules
// of the mod, so it fits any of them. It takes a random card of each offer, may stop at any time, and the engine places what it took as for any board.
// A bot takes the rewards queued by its gold servants (placed on its board by aiPlace) and places what it takes.
function aiReward(t, choose) {
  const F = GAME.def().fusion;
  while (t.choiceQueue && t.choiceQueue.some(q => q.choice === F.rewardChoice)) { const q = t.choiceQueue.splice(t.choiceQueue.findIndex(x => x.choice === F.rewardChoice), 1)[0]; t[Z.reserve].push({ kind: 'servant', s: mkServant(choose(q.cards)) }); }
}
function randomReinforcement(t, room, say) {
  boardIncome(t, room);
  reinforcementFx(t, 'startReinforcement', say);
  const rf = { reward: null }, ai = { offer: null, reward: null, log: [] }, def = GAME.def();
  const openers = Object.keys(def.actions).filter(id => (def.actions[id].effects || []).some(e => e.action === 'openChoice' || e.action === 'levelUpIfFull'));
  const stepOffers = ((def.flow.phases.room.steps.find(x => x.interactive) || {}).effects || []).filter(e => e.action === 'openChoice');   // offers the step opens by itself
  const take = () => {
    const i = rand(ai.offer.cards.length), kind = offerKind(ai.offer, i), card = ai.offer.cards[i];
    ai.offer = null;
    t[Z.reserve].push(kind === 'servant' ? { kind, s: mkServant(card) } : { kind, def: card });
    aiPlace(t, say);
    for (let f = 0; f < 5 && resolveFusion(t, rf, say); f++) {
      aiPlace(t, say); aiReward(t, pick);
    }
  };
  let bought = 0;
  for (let guard = 0; guard < 40; guard++) {
    if (bought && rng() < 0.25) break;
    const ids = openers.filter(id => GAME.canRun(t, ai, id));
    if (ids.length) { const id = pick(ids), price = GAME.price(id); if (!GAME.run(t, ai, id, say)) { GAME.add(t, 'money', -price); continue; } }
    else if (!bought && stepOffers.length) { if (!GAME.openers[stepOffers[0].choice](t, ai, stepOffers[0].params || {}, say)) break; }
    else break;
    if (ai.offer) { take(); bought++; if (def.choices.offer.endsStep) break; }
  }
  reinforcementFx(t, 'endReinforcement', say);
}
function aiReinforcement(t, room, say) {
  const b = bhv(t);
  boardIncome(t, room);
  reinforcementFx(t, 'startReinforcement', say);
  const rf = { reward: null };
  const ai = { offer: null, reward: null, log: [] };   // this board's own reinforcement state, as the player's (rf)
  const want = bossWant(b, room);
  // The Boss plays the same actions as the player (game.json): the action that opens the offer of a kind, the action that raises the level.
  const actionOf = kind => Object.keys(GAME.def().actions).find(id => { const o = GAME.opens(id); return o && o.choice === 'offer' && o.params.kind === kind; });
  const levelAction = Object.keys(GAME.def().actions).find(id => GAME.def().actions[id].effects.some(e => e.action === 'levelUpIfFull'));
  for (let guard = 0; GAME.val(t, 'money') >= 1 && guard < 40; guard++) {
    const held = t[Z.field].length + t[Z.reserve].filter(h => h.kind === 'servant').length;
    const level = GAME.val(t, 'level'), vars = { held, want, level, levelGoal: bossLevel(b, room), maxLevel: MAX_LEVEL, boardSize: t[Z.field].length, room, money: GAME.val(t, 'money') };
    const act = chooseAction(t, b, STRATEGIES.routines[b.routine], vars);
    // Kind of reinforcement bought: an equipment only if a servant has a free socket and the mod offers it; otherwise the first kind the mod offers.
    let kindWanted = act === 'equip' && actionOf('equip') && t[Z.field].some(s => freeSockets(s) > 0) && equipAvailable(t, GAME.val(t, 'level')) ? 'equip' : 'servant';
    if (act !== 'level' && !actionOf(kindWanted)) kindWanted = ['servant', 'equip'].find(actionOf);
    const id = act === 'level' ? levelAction : actionOf(kindWanted);
    if (!GAME.canRun(t, ai, id)) { if (GAME.val(t, 'money') < GAME.price(id)) break; continue; }
    if (!GAME.run(t, ai, id, say)) { GAME.add(t, 'money', -GAME.price(id)); continue; }   // nothing to offer: the price is lost, as it always was for the Boss
    if (act === 'level') continue;
    const kind = kindWanted, card = chooseCard(ai.offer.cards, prefOf(t, kind === 'servant' ? 'servants' : 'equipment'), kind === 'servant' ? c => scoreOf(b.score, c, t) : cardScore, t);
    ai.offer = null;
    t[Z.reserve].push(kind === 'servant' ? { kind, s: mkServant(card) } : { kind, def: card });
    aiPlace(t, say);
    for (let f = 0; f < 5 && resolveFusion(t, rf, say); f++) {
      aiPlace(t, say); aiReward(t, cs => chooseCard(cs, prefOf(t, 'servants'), cardScore, t));
    }
  }
  reinforcementFx(t, 'endReinforcement', say);
}

// The enemy board of a room as a "board" strategy describes it. Two ways to write it:
//  - rooms: [[card ids], ...]: the list of the room (the last one is kept for the following rooms). The board is rebuilt at each room;
//  - layout: [{ card, every, growth }, ...]: the board IN THE ORDER of the list (first = leftmost, last = rightmost), rebuilt at each room. An entry is present only in the rooms
//    that are a multiple of `every` (1 by default: always; with `stack: true`, floor(room / every) copies instead: one more every `every` rooms, which stay), and grows by its own `growth` ({ atk, hp }) for every room played (none by default; it replaces the growth of the strategy);
//  - keep: true (with layout): the board is built ONCE, at the first room, and the cards then stay with the permanent bonuses they win (the real cards never die: a combat is played on copies), so nothing grows by itself;
//  - unit + count: the same unit, more and more of them: count = min(maxBoard, count.max, count.base + floor((room - 1) / count.per)). The units STAY on the board from one room
//    to the next (growUnitBoard): only the missing ones are added. The unit is a card id, or { card, powers: [skills] }: each new unit receives ONE power of the list,
//    dealt from a shuffled deck (team.unitDeck) so that none is dealt twice before all have been dealt; it keeps it.
// Each card grows by `growth` for every room played (growth: { atk, hp }): with a base of 1/1 and a growth of 1/1, a unit has the number of the room as statistics.
const shuffled = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function enemyBoardCards(plan, room) {
  const grow = plan.growth || {}, n = room - 1;
  if (plan.layout) return plan.layout.flatMap(e => {
    const every = e.every || 1, copies = e.stack ? Math.floor(room / every) : (room % every === 0 ? 1 : 0), g = e.growth || {};   // stack: one more every `every` rooms, and they stay
    return Array.from({ length: copies }, () => { const s = mkServant(SERVANTS.find(c => c.id === e.card)); s.atk += (g.atk || 0) * n; s.hp += (g.hp || 0) * n; s.maxhp = s.hp; return s; });
  });
  return plan.rooms[Math.min(room, plan.rooms.length) - 1].map(card => {
    const s = mkServant(SERVANTS.find(c => c.id === card)); s.atk += (grow.atk || 0) * n; s.hp += (grow.hp || 0) * n; s.maxhp = s.hp; return s;
  });
}
function growUnitBoard(t, room) {
  const plan = t.strategy, u = typeof plan.unit === 'string' ? { card: plan.unit } : plan.unit, c = plan.count || { base: 1, per: 1 }, grow = plan.growth || {};
  const kept = t[Z.field].filter(s => s.fixed), units = t[Z.field].filter(s => !s.fixed);
  if (room > 1) units.forEach(s => { s.atk += grow.atk || 0; s.hp += grow.hp || 0; s.maxhp += grow.hp || 0; });   // the units already there keep growing with the match
  const want = Math.max(0, Math.min(MAX_BOARD - kept.length, c.max || MAX_BOARD, c.base + Math.floor((room - 1) / c.per)));
  const def = SERVANTS.find(x => x.id === u.card);
  while (units.length < want) {
    let power = null;
    if (u.powers && u.powers.length) { if (!t.unitDeck || !t.unitDeck.length) t.unitDeck = shuffled(u.powers); power = t.unitDeck.shift(); }
    const s = mkServant(power ? { ...def, skill: [...[].concat(def.skill || []), { ...power }] } : def);
    s.atk += (grow.atk || 0) * (room - 1); s.hp += (grow.hp || 0) * (room - 1); s.maxhp = s.hp; units.push(s);
  }
  t[Z.field].splice(0, t[Z.field].length, ...kept, ...units);
}
// At the start of each room, the three boards reinforce themselves, then the Boss presents one,
// always different from the one of the previous room.
function bossReinforcement(g) {
  g.bossLog = [];
  if (RULES.game.shuffleBossMalus) { const m = g.bossTeams.map(t => t.malus); for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } g.bossTeams.forEach((t, i) => { t.malus = m[i]; }); }   // the maluses are shared out again at random
  const kept = EVENTS.take();   // what the room already announced (roomStarted); the Boss boards play out of sight: whatever they emit is dropped
  g.bossTeams.forEach((t, i) => {
    if (t.defeated) return;   // a defeated boss and its board have left the dungeon
    const say = m => g.bossLog.push(I18N.t('log.bossBoardLine', { n: i + 1, msg: m })), room = GAME.val(g, 'turn');
    if (t.strategy.kind === 'board' && t.strategy.unit) growUnitBoard(t, room);   // the units stay, the missing ones are added
    else if (t.strategy.kind === 'board' && t.strategy.keep) { if (!t[Z.field].some(s => !s.fixed)) t[Z.field].push(...enemyBoardCards(t.strategy, room).slice(0, Math.max(0, MAX_BOARD - t[Z.field].length))); }   // keep: the board is built once, the cards then stay (with what they gained, between matches)
    else if (t.strategy.kind === 'board') { const kept = t[Z.field].filter(s => s.fixed); t[Z.field].splice(0, t[Z.field].length, ...kept, ...enemyBoardCards(t.strategy, room).slice(0, Math.max(0, MAX_BOARD - kept.length))); }   // rebuilt at each room; the permanent servant stays
    else if (t.strategy.kind === 'random') randomReinforcement(t, room, say);
    else aiReinforcement(t, room, say);
  });
  EVENTS.take(); EVENTS.put(kept);
  const alive = g.bossTeams.map((t, i) => i).filter(i => !g.bossTeams[i].defeated), choices = alive.filter(i => i !== g.bossLast);
  g.bossCur = choices.length ? pick(choices) : alive.length ? alive[0] : 0; g.bossLast = g.bossCur;   // the only board left faces the player every room
  g.bossLog.push(I18N.t('log.bossPresents', { n: g.bossCur + 1 }));
}

// ---------- Fights between the Boss boards ----------
// The Boss boards gain what a board gains by fighting (permanent bonuses, end-of-combat powers, Adaptation), like the player's.
// After the player's combat: the board that fought the player keeps what it gained; the other boards fight each other two by two, in order;
// with an odd number of other boards, the last one faces a temporary copy of the board that fought the player (4 boards: 1 faces the player, 2 faces 3, 4 faces a copy of 1; the copy gains nothing for board 1).
// These fights are not shown and never touch the Boss's HP or the heroes'. They only change the boards (and their summon bonus, equipment to receive).
const swapSide = side => (side === 'p' ? 'e' : 'p');
function teamCombatEnd(team, res, side, say) {
  const view = { ...res, survivors: { p: res.survivors[side], e: res.survivors[swapSide(side)] } };
  // the dead that carry a permanent gain written with keepDead keep it too (their real card is still on the board); the others, only the survivors
  (res.fallen ? res.fallen[side] : []).forEach(el => {
    const mine = team[Z.field].find(x => x.uid === el.uid);
    if (!mine) return;
    if (el.perm) { const b = `${mine.atk}/${mine.hp}`; mine.atk += el.perm; say(I18N.t('log.keepsAtk', { name: mine.name, amount: el.perm, before: b, after: `${mine.atk}/${mine.hp}` })); }
    if (el.permHp) { const b = `${mine.atk}/${mine.hp}`; mine.hp += el.permHp; mine.maxhp += el.permHp; say(I18N.t('log.keepsHp', { name: mine.name, amount: el.permHp, before: b, after: `${mine.atk}/${mine.hp}` })); }
  });
  view.survivors.p.forEach(el => {
    const mine = team[Z.field].find(x => x.uid === el.uid);
    if (!mine) return;
    if (el.perm) { const b = `${mine.atk}/${mine.hp}`; mine.atk += el.perm; say(I18N.t('log.keepsAtk', { name: mine.name, amount: el.perm, before: b, after: `${mine.atk}/${mine.hp}` })); }
    if (el.permHp) { const b = `${mine.atk}/${mine.hp}`; mine.hp += el.permHp; mine.maxhp += el.permHp; say(I18N.t('log.keepsHp', { name: mine.name, amount: el.permHp, before: b, after: `${mine.atk}/${mine.hp}` })); }
    POWERS.react('combatEnd', [mine], { g: team, res: view }, say);
  });
  // Adaptation: the board chooses at random among the options offered to each surviving Elk.
  adaptationOffers(team, view).forEach(o => { const m = learnCapability(team, o.uid, o.options[Math.floor(rng() * o.options.length)]); if (m) say(m); });
}
function bossBoardsFight(g, res) {
  if (g.over || !g.bossTeams || g.bossCur < 0) return;
  const logFor = i => m => g.bossLog.push(I18N.t('log.bossBoardLine', { n: i + 1, msg: m }));
  const faced = g.bossCur;
  teamCombatEnd(g.bossTeams[faced], res, 'e', logFor(faced));
  const others = g.bossTeams.map((t, i) => i).filter(i => i !== faced && !g.bossTeams[i].defeated), fights = [];
  for (let k = 0; k + 1 < others.length; k += 2) fights.push([others[k], others[k + 1]]);
  if (others.length % 2) fights.push([others[others.length - 1], faced, true]);   // true: against a temporary copy, so that the board that faced the player does not gain twice
  fights.forEach(([a, b, copy]) => {
    const [pi, ei] = rng() < 0.5 ? [b, a] : [a, b];
    const real = i => g.bossTeams[i], temp = i => ({ ...real(i), [Z.field]: JSON.parse(JSON.stringify(real(i)[Z.field])), summonBonus: JSON.parse(JSON.stringify(real(i).summonBonus || {})) });   // the copy is thrown away: it gains nothing for the real board
    const X = copy && pi === b ? temp(pi) : real(pi), Y = copy && ei === b ? temp(ei) : real(ei);
    if (!X[Z.field].length || !Y[Z.field].length) return;
    // No Boss power in these fights, except those written for them (boardFights: the boss of each board, Veylor); no heroes.
    const ctx = { heroes: [], level: GAME.val(X, 'level'), room: GAME.val(g, 'turn'), noBossPower: true, boardBosses: { p: X, e: Y }, dungeon: g.dungeon, summonBonus: X.summonBonus, owedEquipment: X.owedEquipment || 0, foeTeam: Y };
    const r = runCombat(X[Z.field], Y[Z.field], ctx);
    X.owedEquipment = ctx.owedEquipment;   // (for the temporary copy this changes the copy only)
    g.bossLog.push(I18N.t('log.boardsFight', { a: pi + 1, b: ei + 1, copy: copy ? 1 : 0, result: r.winner === 'p' ? I18N.t('log.boardWins', { n: pi + 1 }) : r.winner === 'e' ? I18N.t('log.boardWins', { n: ei + 1 }) : I18N.t('log.boardsDraw') }));
    if (!(copy && pi === b)) teamCombatEnd(X, r, 'p', logFor(pi));
    if (!(copy && ei === b)) teamCombatEnd(Y, r, 'e', logFor(ei));
  });
}

// Draw of a reinforcement choice: 3 cards (3 to 6 depending on the level) at random from an infinite pool, max rank = maxRank,
// lower ranks possible. exact = true: only rank maxRank (fusion reward).
function drawCards(g, kind, maxRank, exact, size) {
  const pool = kind === 'servant'
    ? SERVANTS.filter(x => !x.token && (!x.types.length || x.types.some(t => g.types.includes(t))))
    : EQUIPS.filter(e => !e.token && (e.rank == null || e.rank <= maxRank) && (!e.type || g.types.includes(e.type)));
  const W = RULES.draw[kind], weightOf = x => W.base + W.perSharedType * (kind === 'servant' ? x.types : [x.type]).filter(t => t && g.types.includes(t)).length;   // weight of a card (data/rules.json, draw)
  const res = [], count = size != null ? size : (exact ? PROPOSALS : reinforcementProposals(maxRank));
  // Cards with no rank (a game where the cards have no level): drawn from the whole pool by weight, a card twice only when the pool is thinner than the offer.
  if (!pool.some(x => x.rank != null)) {
    for (let guard = 0; res.length < count && guard < 100; guard++) {
      const c = pool.filter(x => !res.includes(x)), from = c.length ? c : pool;
      if (!from.length) break;
      const w = from.map(weightOf); let t = rng() * w.reduce((a, b) => a + b, 0), i = 0;
      while (t > w[i] && i < from.length - 1) { t -= w[i]; i++; }
      res.push(from[i]);
    }
    return res;
  }
  for (let guard = 0; res.length < count && guard < 100; guard++) {
    const r = exact ? maxRank : 1 + rand(maxRank);
    let c = pool.filter(x => x.rank === r && !res.includes(x));
    if (!c.length) {
      c = pool.filter(x => x.rank <= r && !res.includes(x));
      // An offer of an exact rank (the promised card) that lacks cards of that rank is completed by the highest ranks left, not by any lower card.
      if (exact && c.length) { const top = Math.max(...c.map(x => x.rank)); c = c.filter(x => x.rank === top); }
    }
    // Never above the maximum rank: if the pool of the game's types is too thin, a card may be offered twice.
    if (!c.length) c = pool.filter(x => x.rank <= r);
    if (!c.length) { const low = Math.min(...pool.map(x => x.rank)); c = pool.filter(x => x.rank === low); }
    if (!c.length) break;
    const w = c.map(weightOf); let t = rng() * w.reduce((a, b) => a + b, 0), i = 0;
    while (t > w[i] && i < c.length - 1) { t -= w[i]; i++; }
    res.push(c[i]);
  }
  return res;
}

// Reinforcement of one kind ('servant' or 'equip'): `size` cards (normal size of the level by default), all of the requested kind.
// Returns [{ kind, card }]. Never an equipment above the reinforcement level.
const equipAvailable = (g, maxRank) => EQUIPS.some(e => !e.token && (e.rank == null || e.rank <= maxRank) && (!e.type || g.types.includes(e.type)));
// Bonuses of the first proposal of the reinforcement, shared by the player and the Boss (g = team: the carrier must be on the board).
// The powers that change the offers are named by the description (game.json, choices.offer.modifiers), each with the effect it has.
const offerModifiers = effect => GAME.def().choices.offer.modifiers.filter(m => m.effect === effect);
// moreProposals (Stellar Compass): each carrier adds its field "amountPer" to the number of cards of the offers of the given kind; the modifier's "max" caps the offer.
const extraProposals = (g, kind, base) => {
  const mods = offerModifiers('moreProposals').filter(m => m.kind === kind);
  if (!mods.length) return 0;
  const extra = mods.reduce((tot, m) => tot + g[Z.field].reduce((a, s) => a + skillsOf(s).filter(k => k.fx === m.power).reduce((b, k) => b + (k[m.amountPer] || 0), 0), 0), 0);
  return Math.max(0, Math.min(Math.min(...mods.map(m => m.max || Infinity)), base + extra) - base);
};
// How many cards of the first offer of the reinforcement are replaced by a card of the next rank: a modifier with "stack" counts each carrier, otherwise one at most;
// a modifier with "kind" concerns only the offers of that kind.
const firstOfferUps = (g, kind) => offerModifiers('upgradeFirstOffer').filter(m => !m.kind || m.kind === kind).reduce((tot, m) => {
  const n = g[Z.field].reduce((a, s) => a + skillsOf(s).filter(k => k.fx === m.power).length, 0);
  return tot + (m.stack ? n : n ? 1 : 0);
}, 0);
const hasFirstOfferUp = g => offerModifiers('upgradeFirstOffer').filter(m => !m.stack).some(m => g[Z.field].some(s => skillsOf(s).some(k => k.fx === m.power)));   // does not stack
const firstEquipOffChance = g => Math.min(1, offerModifiers('offTypeChance').reduce((tot, m) => tot + g[Z.field].reduce((a, s) => a + skillsOf(s).filter(k => k.fx === m.power).reduce((b, k) => b + k[m.percentPer], 0), 0), 0) / 100);   // stacks
// up = true (Stellar Compass, first proposal of the reinforcement): one of the offered cards is replaced by a card of the next rank (never beyond MAX_LEVEL).
// eqChance (Three-dimensional Probe, equipment proposals): probability that the first offered equipment is of a type absent from the team (rank at most maxRank); no effect if none exists.
function drawOffer(g, maxRank, size, up, eqChance, kind = 'servant') {
  const n = size || reinforcementProposals(maxRank);
  const cards = drawCards(g, kind, maxRank, false, n);
  if (kind === 'equip' && eqChance > 0 && cards.length && rng() < eqChance) {
    const pool = EQUIPS.filter(e => !e.token && (e.rank == null || e.rank <= maxRank) && e.type && !g.types.includes(e.type)), r = 1 + rand(maxRank);
    const c = pool.filter(e => e.rank === r), from = c.length ? c : pool;
    if (from.length) cards[0] = pick(from);
  }
  if (up && maxRank < MAX_LEVEL && cards.length) {   // up cards (true = 1), each one replacing a different card of the offer
    const free = cards.map((c, i) => i);
    for (let i = 0; i < Math.min(+up, cards.length); i++) { const hi = drawCards(g, kind, maxRank + 1, true, 1); if (hi.length) cards[free.splice(rand(free.length), 1)[0]] = hi[0]; }
  }
  return cards.map(card => ({ kind, card }));
}

// Equipment of the current reinforcement level (rank equal to the level, otherwise the highest rank below), among those accessible to the game.
function randomEquip(g) {
  const pool = EQUIPS.filter(e => !e.token && (!e.type || g.types.includes(e.type)));
  for (let r = GAME.val(g, 'level'); r >= 1; r--) { const c = pool.filter(e => e.rank === r); if (c.length) return pick(c); }
  return null;
}
// Temporary keywords (active power grantKeywordTemporarily) are removed when the next reinforcement opens.
// Promised cards (game.json, promises): the card the player chose arrives in the hand (never directly on the board) as soon as the description's amount of the resource has been spent.
const promiseRule = fx => (GAME.def().promises || {})[fx];
function checkPromises(g, say) {
  for (const p of g.promises || []) {
    const rule = promiseRule(p.power);
    if (p.done || ((g.spent || {})[rule.deliver.resource] || 0) < GAME.number(rule.deliver.spent)) continue;
    if (handFull(g)) continue;   // full hand: it waits for a slot to free up
    const card = rule.choose.category === 'servant' ? { kind: 'servant', s: mkServant(p.card) } : { kind: 'equip', def: p.card };
    g[rule.deliver.to].push(card);
    p.done = true; if (card.kind === 'servant') g.stats.servants++;
    say(I18N.t(rule.texts.arrived, { name: p.card.name, cost: GAME.number(rule.deliver.spent) }));
  }
}
function expireTemp(g) {
  g[Z.field].forEach(s => { if (s.tmpKw) { s.kw = s.kw.filter(k => !s.tmpKw.includes(k)); delete s.tmpKw; } });
  g.heroes.forEach(h => { h.used = false; });
}
// A power is of the game level when its template reacts to the event 'game' (it acts on the game, not on the board).
const isGameLevel = fx => ((POWERS.all()[fx] || {}).reactions || []).some(r => r.on === 'game');
// moment: 'startReinforcement' or 'endReinforcement' (game.json, triggers): the powers of the board and of the heroes whose trigger is played at that moment.
function reinforcementFx(g, moment, say) {
  g[Z.field].slice().forEach(s => {
    skillsOf(s).filter(k => GAME.is(k, moment)).forEach(k => {
      // Stellar Smith and the like: powers of the game level are templates reacting to the event 'game' (giveCard…). the interface plays the cues that the powers note in g.cues.
      POWERS.react('game', [s], { g, trigger: k.t, only: k }, say);
      applyFx(k, s, g[Z.field], [], say);
    });
  });
  g.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && GAME.is(h.def.power, moment) && isGameLevel(h.def.power.fx)) {
      // Hero powers of the game level: templates that react to the event 'game'.
      POWERS.react('game', [{ name: h.def.name, kw: [], skill: h.def.power }], { g, trigger: h.def.power.t }, say);
    } else if (h.hp > 0 && GAME.is(h.def.power, moment)) {
      const src = { name: h.def.name, kw: [] };
      applyFx(h.def.power, src, g[Z.field], [], say, null, GAME.val(g, 'level'));
      if (src.cueAmount) (g.cues = g.cues || []).push({ event: 'statGranted', hero: g.heroes.indexOf(h), uid: src.cueUid, amount: src.cueAmount });   // the interface plays the animation of the mod for this event
    }
  });
  flushCompanion(g, say);
}
// Placement of a servant from the hand on the board (replacement if replaceIdx).
function placeServant(g, handIdx, replaceIdx, say) {
  const s = g[Z.reserve][handIdx].s;
  g[Z.reserve].splice(handIdx, 1);
  placeNewServant(g, s, replaceIdx, say);
}
// Events of the player's side only: a Boss board plays the same functions without anything to show.
const forPlayer = g => !g.strategy;
// The same for a servant that does not come from the hand (a card taken straight from an offer).
function placeNewServant(g, s, replaceIdx, say) {
  if (forPlayer(g)) EVENTS.emit('cardPlaced', { card: s.uid, name: s.name, replaced: replaceIdx != null && g[Z.field][replaceIdx] ? g[Z.field][replaceIdx].uid : null });
  if (replaceIdx != null) { const old = g[Z.field][replaceIdx]; say(I18N.t('log.replaced', { name: old.name })); g[Z.field].splice(replaceIdx, 1, s); giveBackEquips(g, removeEquips(old), say, 'onReplace'); }
  else g[Z.field].push(s);
  say(I18N.t('log.joinsBoard', { name: s.name }));
  triggerBattlecry(g, s, say);
  if (s.fusionPending) queueFusionReward(g, s);   // the gold servant is on the board: now it offers its reward
}
const offerKind = (offer, i) => (offer.kinds ? offer.kinds[i] : offer.kind);
// The card of an offer the player takes (game.json, choices.offer): where it goes is described by the choice (`then`: moveCard to the hand, or placeCard onto the board).
// `where` says what the player did: { replace: index of the board card replaced, at: place on the board, equip: index of the servant to equip } for a card dragged to the board,
// nothing for a click. Returns 'full' when the card has to go on a full board and the player did not say which card it replaces, 'refused' when it cannot go where it was dropped
// (no free socket), true when the card is taken (the offer closes, the fusion is looked for, and the step ends if the choice says so: `endsStep`).
function takeOffer(g, rf, index, say, where) {
  const rule = GAME.def().choices.offer, to = (rule.then[0] || {}).to, card = rf.offer.cards[index], servant = offerKind(rf.offer, index) === 'servant';
  if (forPlayer(g)) EVENTS.emit('cardBought', { name: card.name, kind: servant ? 'servant' : 'equipment' });
  const handMax = GAME.number(GAME.def().state.zones[GAME.zone('reserve')].max);
  if (servant) {
    const s = mkServant(card);
    if (!where && (to === 'hand' && handMax > 0)) { g[Z.reserve].push({ kind: 'servant', s }); say(I18N.t('log.itemJoinsYourHand', { name: card.name })); }
    else if (where && where.replace != null) placeNewServant(g, s, where.replace, say);
    else if (g[Z.field].length < MAX_BOARD) { placeNewServant(g, s, null, say); if (where && where.at != null) { g[Z.field].pop(); g[Z.field].splice(where.at, 0, s); } }
    else return 'full';
    g.stats.servants++; grantCompanion(g, card.types, say);
  } else if (where && where.equip != null) {
    if (!equipWithEvents(g, g[Z.field][where.equip], card, say)) return 'refused';
    g.stats.equips++; say(I18N.t('log.equippedOn', { item: card.name, name: g[Z.field][where.equip].name }));
  } else { g[Z.reserve].push({ kind: 'equip', def: card }); g.stats.equips++; say(I18N.t('log.itemJoinsYourHand', { name: card.name })); }
  rf.offer = null; resolveFusion(g, rf, say);
  if (rule.endsStep) GAME.release(g);
  return true;
}
// A servant's battlecry: on its placement, or triggered again by an active power (Wave). Returns false if it has none.
const battlecriesOf = s => skillsOf(s).filter(k => GAME.is(k, 'battlecry'));
function triggerBattlecry(g, s, say) {
  const cries = battlecriesOf(s);
  cries.forEach(k => {
    applyFx(k, s, g[Z.field], [], say); flushCompanion(g, say);
    POWERS.react('game', [s], { g, trigger: k.t, only: k }, say);   // powers of the game level (equipment to the hand, summon bonus, choices…): templates reacting to 'game'
  });
  return cries.length > 0;
}
// Pending discoveries (Liaison Attaché): the next one becomes the current choice (rf.reward) as soon as no other choice is open.
// The player picks one card of a reward (a choice of game.json whose cards come from the engine: the fusion reward, the discoveries, the chosen ally). What happens to the
// card is described by the "then" of the choice: it goes to the hand (a servant or an equipment, as the reward says: category) or it gets a stat. Returns nothing; the interface redraws.
function resolveReward(g, rf, index, say) {
  const reward = rf.reward, rule = GAME.def().choices[reward.choice], card = reward.cards[index], what = rule.then[0];
  rf.reward = null;
  if (what.action === 'gainStat') {   // a permanent bonus to the chosen servant of the board
    card[what.stat] += reward.a; say(I18N.t('log.givesAtk', { name: reward.from, amount: reward.a, target: card.name }));
  } else if (reward.category === 'equipment') {
    g.stats.equips++;
    if (handFull(g)) say(I18N.t('log.handFullLost', { name: card.name })); else { g[Z.reserve].push({ kind: 'equip', def: card }); say(I18N.t('log.itemJoinsYourHand', { name: card.name })); }
  } else {
    g[Z.reserve].push({ kind: 'servant', s: mkServant(card) }); say(I18N.t('log.itemJoinsYourHand', { name: card.name })); grantCompanion(g, card.types, say);
    resolveFusion(g, rf, say);   // the new servant may complete a fusion
    serveOwedEquipmentFor(g, rf);
  }
}
function flushDiscover(g, rf) { if (rf && !rf.reward && g.choiceQueue && g.choiceQueue.length) rf.reward = g.choiceQueue.shift(); }
// Non-gold servants (board then hand) bearing this name: used by Sulseye to spot a pair.
const copiesOf = (g, name) => [...g[Z.field], ...g[Z.reserve].filter(h => h.kind === 'servant').map(h => h.s)].filter(x => x.name === name && !x.gold && !x.fixed && !isCompanion(x));
// Active powers of the heroes: button label, possible targets, effect. Used by the interface.
// By default a power is free and usable once per reinforcement. repeat: no limit per reinforcement; cost(h): price in Datacrons.
// Tests a target can pass, and effects an active power can have (the engine's side of heroActions in game.json).
const TARGET_FILTERS = {
  companion: (g, s, v) => isCompanion(s) === v,
  lacksKeyword: (g, s, v) => !s.kw.includes(v),
  hasTrigger: (g, s, v) => skillsOf(s).some(k => k.t === v),
  copies: (g, s, v) => copiesOf(g, s.name).length === v   // exactly v owned copies
};
const HERO_EFFECTS = {
  // A keyword until the next reinforcement opens (see expireTemp).
  grantKeywordTemporarily: (g, s, say, h, rf, e) => {
    if (isCompanion(s) || s.kw.includes(e.keyword)) return false;
    s.kw.push(e.keyword); (s.tmpKw = s.tmpKw || []).push(e.keyword);
    say(I18N.t(e.log, { name: s.name }));
    return true;
  },
  // On a servant of which exactly two copies are owned: creates the third, which fuses at once (the copy takes no room in hand).
  completeFusion: (g, s, say, h, rf, e) => {
    const def = SERVANTS.find(d => d.name === s.name);
    if (!def) return false;
    const copy = mkServant(def);
    g[Z.reserve].push({ kind: 'servant', s: copy });
    say(I18N.t(e.log, { name: h.def.name, target: s.name }));
    if (!resolveFusion(g, rf, say)) { g[Z.reserve] = g[Z.reserve].filter(x => x.s !== copy); return false; }
    return true;
  },
  // Plays the battlecry of a servant again.
  replayBattlecry: (g, s, say, h, rf, e) => { if (!battlecriesOf(s).length) return false; say(I18N.t(e.log, { name: s.name })); return triggerBattlecry(g, s, say); }
};
const handServants = g => g[Z.reserve].filter(x => x.kind === 'servant').map(x => x.s);
// An active power in the form the interface uses: label, icon, color, repeat, cost(hero), ok(g, servant), run(g, uid, say, hero, rf); built from the description.
function buildActive(fx) {
  const d = GAME.def().heroActions && GAME.def().heroActions[fx];
  if (!d || fx === 'note') return undefined;
  const inZones = (g, s) => d.targets.zones.some(z => (z === Z.reserve ? handServants(g) : g[z]).includes(s));
  return {
    label: d.label, icon: d.icon, color: d.color, repeat: !!d.repeat,
    cost: d.cost ? h => GAME.number(d.cost.base) + GAME.number(d.cost.step) * (h[d.cost.per] || 0) : null,
    ok: (g, s) => inZones(g, s) && d.targets.where.every(f => { const [k, v] = Object.entries(f)[0]; return TARGET_FILTERS[k](g, s, v); }),
    run(g, uid, say, h, rf) {
      const s = d.targets.zones.flatMap(z => (z === Z.reserve ? handServants(g) : g[z])).find(x => x.uid === uid);
      return !!s && this.ok(g, s) && HERO_EFFECTS[d.effect.action](g, s, say, h, rf, d.effect);
    }
  };
}
// An active power that cannot be used any more: already used in this reinforcement (unless it repeats), or all its uses of the game spent ("uses" on the power of the hero card: 1 = once per game).
const activeSpent = (h, A) => (h.used && !A.repeat) || (!!h.def.power.uses && (h.uses || 0) >= h.def.power.uses);
const ACTIVES = new Proxy({}, { get: (_, fx) => (typeof fx === 'string' ? buildActive(fx) : undefined) });

// Skill of a gold card (fusion): the values change by the default rule of the description (game.json, fusion.defaultGold: the values doubled), or by the "gold" field
// of the template of the power when it has one (for example the multi-hit Shield gains a hit instead of doubling).
const goldSkill = k => {
  const rule = k.gold || (POWERS.all()[k.fx] || {}).gold || GAME.def().fusion.defaultGold, out = { ...k };
  for (const [field, op] of Object.entries(rule)) {
    const [kind, v] = Object.entries(op)[0];
    out[field] = kind === 'mul' ? (k[field] || 0) * v : kind === 'add' ? (k[field] || 0) + v : v;
  }
  return out;
};
// Name of a gold servant, in French like every card name the engine builds (the display language is applied by the interface).
const goldName = name => I18N.format(I18N.text('fr', GAME.def().fusion.nameKey), { name });

// The reward of a fusion (a choice among servants of a higher level) is queued when the gold servant is placed on the board; the interface opens it (flushDiscover).
function queueFusionReward(g, gold) {
  gold.fusionPending = false;
  const F = GAME.def().fusion, r = Math.min(MAX_RANK, GAME.val(g, 'level') + F.rewardRankOffset);
  (g.choiceQueue = g.choiceQueue || []).push({ choice: F.rewardChoice, rank: r, category: 'servant', cards: drawCards(g, 'servant', r, true) });
}

// Fusion (game.json, fusion): identical servants (same name, non-gold), board and hand together.
// The gold card adds up their statistics and doubles the values of its skill.
// Returns true if a fusion took place (a reward is then to be chosen).
function resolveFusion(g, rf, say) {
  if (!GAME.def().fusion) return false;   // a game with no fusion
  const all = [...g[Z.field].map(s => ({ s })), ...g[Z.reserve].filter(h => h.kind === 'servant').map(h => ({ s: h.s }))].filter(x => !x.s.fixed);   // a permanent servant does not fuse
  const F = GAME.def().fusion, names = [...new Set(all.filter(x => !x.s.gold).map(x => x.s.name))];
  const name = names.find(n => all.filter(x => !x.s.gold && x.s.name === n).length >= F.count);
  if (!name) return false;
  const trio = all.filter(x => !x.s.gold && x.s.name === name).slice(0, F.count).map(x => x.s);
  const taken = trio.flatMap(x => removeEquips(x));   // the equipment go back to the hand (with a chance to break), the gold card starts bare
  const sum = k => trio.reduce((a, x) => a + x[k], 0);
  const k = trio[0].skill;
  const gold = {
    uid: uid(), id: trio[0].id, name: goldName(name), baseName: name, rank: trio[0].rank, atk: sum('atk'), hp: sum('hp'), maxhp: sum('maxhp'),
    types: [...trio[0].types], kw: [...new Set(trio.flatMap(x => x.kw.filter(k => !(x.tmpKw || []).includes(k))))], gold: true,
    skill: k ? goldSkill(k) : null, extra: (trio[0].extra || []).map(goldSkill), equips: [], sockets: [...(trio[0].sockets || [])], slots: (trio[0].sockets || []).map(() => null),
    eqSkills: [], lrSkills: trio.flatMap(x => x.lrSkills || []), summonA: trio.reduce((a, x) => a + (x.summonA || 0), 0), summonH: trio.reduce((a, x) => a + (x.summonH || 0), 0)
  };
  const ids = new Set(trio.map(x => x.uid));
  // The gold servant arrives in the HAND (where the first copy of the hand was, else at the end); its reward is offered only when it is placed on the board (see placeNewServant).
  // Fallback: no room in the hand (the three copies were on the board and the hand is full): it takes the place of the first copy on the board and the reward is offered at once.
  const hi = g[Z.reserve].findIndex(h => h.kind === 'servant' && ids.has(h.s.uid)), bi = g[Z.field].findIndex(x => ids.has(x.uid));
  g[Z.reserve] = g[Z.reserve].filter(h => h.kind !== 'servant' || !ids.has(h.s.uid));
  const toHand = hi >= 0 || !handFull(g);
  if (toHand) g[Z.reserve].splice(hi >= 0 ? hi : g[Z.reserve].length, 0, { kind: 'servant', s: gold });
  g[Z.field] = g[Z.field].map((x, i) => (!ids.has(x.uid) ? x : (!toHand && i === bi ? gold : null))).filter(Boolean);
  giveBackEquips(g, taken, say, 'onFusion');
  g.stats.fusions++;
  if (forPlayer(g)) EVENTS.emit('fusion', { card: gold.uid, name: gold.name });
  gold.fusionPending = true;
  if (!toHand) queueFusionReward(g, gold);
  say(I18N.t('log.fusion', { name: name, gold: gold.name }));
  return true;
}

// ---------- Choices after a combat (spec flux-de-jeu.md; description: game.json, choices.adaptation) ----------
// After a combat, each surviving servant with the power named by the description (and of the type it names) chooses among its options: a bonus drawn at
// random among stats (an amount read from a resource, for example the reinforcement level) or a power (keyword or skill) drawn at random among those of the
// other survivors. A learned ability is permanent for the mission. The Elk's Adaptation is the first such choice.
const afterCombatChoice = () => GAME.def().choices.adaptation || null;   // a mod may not have such a choice
const hasChoicePower = k => { const A = afterCombatChoice(); return !!A && (k.fx === A.who.power || k.fx === A.extraPower); };
const capKey = c => c.stat ? `stat:${c.stat}:${c.hpStat ? 'hp' : 'atk'}` : c.kw ? `kw:${c.kw}` : `sk:${c.skill.t}:${c.skill.fx}:${c.skill.a}:${c.skill.h}:${c.skill.n}`;
const capOwned = (s, c) => c.stat ? false : c.kw ? s.kw.includes(c.kw) : skillsOf(s).some(k => capKey({ skill: k }) === capKey(c));
const capLabel = c => c.stat ? I18N.t(c.hpStat ? 'ui.capHp' : 'ui.capAtk', { n: c.stat }) : c.kw ? I18N.t('keyword.' + c.kw) : skDesc(c.skill);
// What can be learned from a servant: its keywords and its skills, except those the description excludes (the choice powers themselves, battlecries: they never trigger again).
// The option can restrict the source: "skillsOnly" (no keyword), "ownOnly" (the card's own skills, not those that come from its sockets or that it learned).
const capsOf = (s, o = {}) => { const x = afterCombatChoice().learnExcludes, own = o.ownOnly ? [s.skill, ...(s.extra || [])].filter(Boolean) : skillsOf(s); return [...(o.skillsOnly ? [] : s.kw.map(kw => ({ kw }))), ...own.filter(k => !x.powers.includes(k.fx) && !x.triggers.includes(k.t)).map(skill => ({ skill }))]; };
// A servant is reborn with a new identifier: only the survivors still present on the board (same uid) count.
function adaptationOffers(g, res) {
  const A = afterCombatChoice(), surv = res.survivors.p, offers = [];
  if (!A) return offers;
  surv.forEach(el => {
    const mine = g[Z.field].find(s => s.uid === el.uid);
    if (!mine || !mine.types.includes(A.who.type) || !skillsOf(mine).some(hasChoicePower)) return;
    // One choice, plus one more per extra power; an extra choice will not offer again the ability already offered to the previous one.
    // "uses": how many times a card can choose in the whole game (A.uses; each extra power adds one); the ones already spent are counted on the card (adaptUses).
    const seen = new Set(), extras = skillsOf(mine).filter(k => k.fx === A.extraPower).length, left = A.uses ? A.uses + extras - (mine.adaptUses || 0) : extras + 1;
    for (let n = 0; n < left; n++) {
      const options = [];
      for (const o of A.options) {
        if (o.kind === 'statBoost') { const stat = o.stats[Math.floor(rng() * o.stats.length)]; options.push({ stat: g[o.amount.resource], hpStat: stat === 'hp', from: null }); }
        else if (o.pick === 'all') {   // the whole list of what the other survivors can teach
          surv.filter(x => x !== el).forEach(x => capsOf(x, o).filter(c => !capOwned(mine, c) && !seen.has(capKey(c))).forEach(c => options.push({ ...c, from: x.name })));
        } else {
          const caps = surv.filter(x => x !== el).flatMap(x => capsOf(x, o).filter(c => !capOwned(mine, c) && !seen.has(capKey(c))).map(c => ({ ...c, from: x.name })));
          if (caps.length) { const c = caps[Math.floor(rng() * caps.length)]; seen.add(capKey(c)); options.push(c); }
        }
      }
      if (options.length) offers.push({ uid: mine.uid, name: mine.name, options, skippable: !!A.skippable });
    }
  });
  // Copying an enemy power (choices.adaptation.foes): a servant with the power is offered one power of the enemies, drawn at random (it can decline and wait for a later combat).
  const F = A.foes;
  if (F && res.foeSkills && res.foeSkills.length) surv.forEach(el => {
    const mine = g[Z.field].find(s => s.uid === el.uid);
    if (!mine || !skillsOf(mine).some(k => k.fx === F.power) || (F.uses || 1) - (mine.assimUses || 0) <= 0) return;
    const caps = res.foeSkills.filter(c => !capOwned(mine, c));
    if (caps.length) offers.push({ uid: mine.uid, name: mine.name, options: [{ ...caps[Math.floor(rng() * caps.length)], useField: 'assimUses' }], skippable: !!F.skippable });
  });
  return offers;
}
function learnCapability(g, uid, cap) {
  const s = g[Z.field].find(x => x.uid === uid);
  if (!s || capOwned(s, cap)) return null;
  if (cap.stat) { const b = `${s.atk}/${s.hp}`; if (cap.hpStat) { s.hp += cap.stat; s.maxhp += cap.stat; } else s.atk += cap.stat; return I18N.t('log.adapts', { name: s.name, capability: capLabel(cap), before: b, after: `${s.atk}/${s.hp}` }); }
  if (cap.kw) s.kw.push(cap.kw); else s.lrSkills.push({ ...cap.skill });
  const used = cap.useField || 'adaptUses'; s[used] = (s[used] || 0) + 1;
  return I18N.t('log.learns', { name: s.name, capability: capLabel(cap), from: cap.from });
}

// End-of-combat effects of the player's survivors (for example a permanent summon bonus). Returns the log lines.
function endCombatFx(g, res) {
  const lines = [];
  syncCompanion(g, res, m => lines.push(m));
  res.survivors.p.forEach(el => {
    const mine = g[Z.field].find(s => s.uid === el.uid);
    if (!mine) return;
    if (el.perm) { const b = `${mine.atk}/${mine.hp}`; mine.atk += el.perm; lines.push(I18N.t('log.keepsAtk', { name: mine.name, amount: el.perm, before: b, after: `${mine.atk}/${mine.hp}` })); }
    if (el.permHp) { const b = `${mine.atk}/${mine.hp}`; mine.hp += el.permHp; mine.maxhp += el.permHp; lines.push(I18N.t('log.keepsHp', { name: mine.name, amount: el.permHp, before: b, after: `${mine.atk}/${mine.hp}` })); }
    // End-of-combat powers of the survivor (permanent bonuses, equipment to receive…): templates reacting to 'combatEnd'.
    POWERS.react('combatEnd', [mine], { g, res, level: GAME.val(g, 'level') }, m => lines.push(m));
    // Direct powers of the moment 'endCombat' (game.json, triggers): played on the real card, the allies are the survivors.
    const alive = new Set(res.survivors.p.map(x => x.uid)), mates = g[Z.field].filter(x => alive.has(x.uid));
    skillsOf(mine).filter(k => GAME.is(k, 'endCombat')).forEach(k => applyFx(k, mine, mates, [], m => lines.push(m)));
  });
  flushCompanion(g, m => lines.push(m));
  return lines;
}

// Rule: end of combat, the survivors of the winning side strike the other side (data/rules.json, settlement).
function settleCombat(g, res) {
  const lines = [], hits = res.hits = [];   // hits: one hit per survivor (for the end-of-combat animation)
  const rule = RULES.settlement, damageOf = (side, s) => (s.rank || 0) * rule[side].perRank + rule[side].flat;
  if (res.winner === 'p') {
    // The survivors strike the bar of the boss they faced (what exceeds it is lost). A bar at 0: that boss is defeated and its board leaves the dungeon;
    // the dungeon is won when every boss is defeated. g.boss.hp is the total of the bars that remain.
    const team = g.bossTeams[g.bossCur];
    // Once the bar is at 0 the survivors that remain do not strike: the boss is already defeated.
    let left = team.bossHp, dmg = 0;
    const struck = [];
    for (const s of res.survivors.p) { if (left <= 0) break; const d = Math.min(damageOf('player', s), left); left -= d; dmg += d; hits.push({ uid: s.uid, side: 'p', to: 'boss', dmg: d }); struck.push(s); }
    team.bossHp = left; g.boss.hp = g.bossTeams.reduce((a, t) => a + t.bossHp, 0);
    lines.push(I18N.t('log.survivorsHitBoss', { names: struck.map(s => (s.rank == null ? s.name : `${s.name} R${s.rank}`)).join(', '), amount: dmg }));
    if (team.bossHp <= 0) { team.defeated = true; lines.push(I18N.t('log.bossBoardDefeated', { n: g.bossCur + 1 })); }
    if (g.boss.hp <= 0) { g.over = 'win'; lines.push(I18N.t('log.bossDefeated')); }
  } else if (res.winner === 'e') {
    let shield = g.heroes.map(h => h.hp > 0 && h.def.kw === rule.absorb);
    for (const s of res.survivors.e) {
      const live = g.heroes.map((h, i) => i).filter(i => g.heroes[i].hp > 0);
      if (!live.length) break;
      const prov = live.filter(i => g.heroes[i].def.kw === rule.taunt);
      const i = prov.length === 1 ? prov[0] : pick(live);
      const h = g.heroes[i], damage = damageOf('boss', s);
      if (shield[i]) { shield[i] = false; hits.push({ uid: s.uid, side: 'e', to: i, dmg: 0, blocked: true }); lines.push(I18N.t('log.strikeBlocked', { name: s.name, target: h.def.name, damage })); continue; }
      h.hp = Math.max(0, h.hp - damage);
      hits.push({ uid: s.uid, side: 'e', to: i, dmg: damage });
      lines.push(I18N.t(h.hp <= 0 ? 'log.strikeKills' : 'log.strike', { name: s.name, target: h.def.name, damage }));
    }
    if (g.heroes.every(h => h.hp <= 0)) { g.over = 'lose'; lines.push(I18N.t('log.heroesDown')); }
  } else lines.push(I18N.t('log.noDamageDraw'));
  return lines;   // the next room is counted by the transition of the flow (game.json)
}

// ---------- Hooks of the flow interpreter (flow.js): what the engine adds to the actions that the mod declares ----------
// What is spent counts toward the promised cards; a refund (nothing to offer) takes it back.
GAME.hooks.afterSpend = (g, resource, amount, say) => { g.spent = g.spent || {}; g.spent[resource] = (g.spent[resource] || 0) + amount; checkPromises(g, say); };
GAME.hooks.afterRefund = (g, resource, amount) => { g.spent[resource] -= amount; };
// Choice "offer": a reinforcement of one kind. The bonuses that change the draw (Far-Reach Explorer, Stellar Compass, Three-dimensional Probe) are applied here.
GAME.openers.offer = (g, rf, params, say) => {
  const kind = params.kind;
  if (rf.offer) say(I18N.t('log.offerAbandoned'));   // changing your mind costs one more Datacron
  const size = kind === 'equip' && g.equipOfferSize && g.equipOfferLeft > 0 ? g.equipOfferSize : 0;
  if (size && --g.equipOfferLeft <= 0) { g.equipOfferLeft = 0; g.equipOfferSize = 0; }
  const first = !rf.bought, up = first ? firstOfferUps(g, kind) : 0; rf.bought = (rf.bought || 0) + 1;
  if (up && GAME.val(g, 'level') < MAX_LEVEL) say(I18N.t('log.compassUpgrade'));
  const base = size || reinforcementProposals(GAME.val(g, 'level')), more = extraProposals(g, kind, base);
  const o = drawOffer(g, GAME.val(g, 'level'), more ? base + more : size, up, firstEquipOffChance(g), kind);
  if (!o.length) { say(I18N.t('log.noCardToOffer')); return false; }
  rf.offer = { kinds: o.map(x => x.kind), cards: o.map(x => x.card) };
  return true;
};

// ---------- Events and runners of the flow (flow.js): what the engine does at the steps that game.json lists ----------
// Equipment received through the Relic Hunter's deathrattle: straight into the hand, if there is room left.
function serveOwedEquipmentFor(g, rf) {
  for (; g.owedEquipment > 0; g.owedEquipment--) {
    const def = randomEquip(g);
    if (!def) continue;
    if (handFull(g)) rf.log.push(I18N.t('log.handFullLost', { name: def.name }));
    else { g[Z.reserve].push({ kind: 'equip', def }); g.stats.equips++; rf.log.push(I18N.t('log.itemJoinsYourHand', { name: def.name })); }
  }
}
// First room: a hero whose power promises a card (game.json, promises) offers the choice before anything else (it blocks the flow until it is made).
GAME.events.startMission = (g, rf) => {
  for (const h of g.heroes) {
    const fx = h.def.power && h.def.power.fx, rule = promiseRule(fx);
    if (!rule || rule.on !== 'startMission') continue;
    const c = rule.choose;
    rf.promise = { power: fx, cards: drawCards(g, c.category, GAME.number(c.rank), c.exactRank, GAME.number(c.count)) };
    break;
  }
};
GAME.events.beforeIncome = (g, rf, say) => { expireTemp(g); checkPromises(g, say); };
GAME.events.startReinforcement = (g, rf, say) => { reinforcementFx(g, 'startReinforcement', say); serveOwedEquipmentFor(g, rf); };
// The end-of-reinforcement powers speak to the player in a notice; the stat they grant is shown by the interface from the cue (g.cues, event statGranted).
GAME.events.endReinforcement = (g, rf) => { const msgs = []; g.cues = (g.cues || []).filter(c => c.event !== 'statGranted'); reinforcementFx(g, 'endReinforcement', m => msgs.push(m)); GAME.out.notice = msgs.join(' '); };
GAME.runners.bossReinforcement = g => bossReinforcement(g);
GAME.runners.combat = g => { GAME.out.combat = runCombat(g[Z.field], g.bossTeams[g.bossCur][Z.field], g); };
GAME.runners.settlement = g => { GAME.out.lines = settleCombat(g, GAME.out.combat); };
GAME.runners.aftermath = g => {
  const res = GAME.out.combat;
  GAME.out.lines = GAME.out.lines.concat(endCombatFx(g, res));
  bossBoardsFight(g, res);   // the Boss boards gain from their combats and fight each other
  GAME.out.adapt = g.over ? [] : adaptationOffers(g, res);   // Adaptation choices of the surviving Elk, one by one
};
GAME.hooks.final = (g, result) => { if (result === 'won') companionRecordWin(); };
