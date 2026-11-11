// Atlas Wanderer — rules engine: automatic combat, game, reinforcement, fusion.
'use strict';
// =====================================================================
// RULES ENGINE
// =====================================================================
function mkServant(d) {
  return { uid: uid(), id: d.id || slug(d.name), name: d.name, rank: d.rank, atk: d.atk, hp: d.hp, maxhp: d.hp,
           types: [...d.types], kw: [...d.kw], fixed: !!d.fixed, bg: d.bg, skill: [].concat(d.skill || [])[0] || null, extra: [].concat(d.skill || []).slice(1), equips: [], eqSkills: [], lrSkills: [], droneA: 0, droneH: 0, healBonus: 0,
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
function addBomb(t, n, splash) { (t.bombs = t.bombs || []).push({ n, splash }); t.bomb = t.bombs.reduce((x, b) => x + b.n, 0); }
function hit(t, amt, src) {
  if (amt <= 0) return false;
  // Neural flight interface: any source of damage below the threshold is cancelled (the Shield is not consumed).
  if (POWERS.react('damage', [t], { target: t, source: src, amount: amt }).cancelled) return false;
  if (t.shield) { t.shield--; return false; }   // the Shield absorbs one hit; shield counts the remaining hits
  t.hp -= amt;
  if (src) POWERS.react('damageDealt', [src], { source: src, target: t, amount: amt });   // Poison: a servant that really took damage is destroyed
  return true;
}

// bonus: permanent bonus {a, h} of the player's drones (Drone Master); ignored for the other effects.
// ---------- PR Model (evolving creation of the Nythe) ----------
// A single card per mission: g.pr = { s, dead }. s is an ordinary servant (pr flag) that stays the same object in hand then on the board.
// Its number is fixed at the start of the mission (g.prNum) and follows the number of missions won, remembered in the browser.
// The win counter is part of the crew profile (PROFILE, see save.js); outside the browser it is 0.
const prWins = () => typeof PROFILE === 'undefined' ? 0 : PROFILE.get().prWins;
const prRecordWin = () => { if (typeof PROFILE !== 'undefined') PROFILE.update(p => { p.prWins++; }); };
const prName = n => 'PR-' + n.toString(16).toUpperCase().padStart(3, '0');
const PR_QUEUE = [];   // upgrades requested by the "prBoost" effects, applied by flushPr
const isPr = s => !!(s && s.pr);
// The PR model in hand does not count toward the hand limit.
const handCount = g => g.hand.filter(h => !(h.kind === 'servant' && isPr(h.s))).length;
const handFull = g => handCount(g) >= HAND_MAX;
// The first Nythe recruited in the mission adds the PR model to the hand.
function grantPr(g, types, say) {
  if (g.pr || !types.includes('nythe')) return;
  const s = mkServant({ name: prName(g.prNum), rank: 1, atk: 2, hp: 2, types: ['nythe'], kw: [], skill: sk('passive', 'prPersist') });
  s.pr = true; g.pr = { s, dead: false };
  g.hand.push({ kind: 'servant', s }); say(I18N.t('log.modelToHand', { name: s.name }));
}
// Applies the pending upgrades to the PR model (in hand or in play). +X/+Y raises HP and max HP: the damage already taken remains.
function flushPr(g, say) {
  const q = PR_QUEUE.splice(0);
  if (!g.pr || g.pr.dead) return;
  const s = g.pr.s;
  q.forEach(b => { const av = `${s.atk}/${s.hp}`; s.atk += b.a; s.hp += b.h; s.maxhp += b.h; say(I18N.t('log.modelGains', { name: s.name, a: b.a, h: b.h, before: av, after: `${s.atk}/${s.hp}` })); });
}
// End of combat: the PR model keeps its damage; if it did not survive, it is lost for the mission.
function syncPr(g, res, say) {
  const pr = g.pr;
  if (!pr || pr.dead || !g.board.includes(pr.s)) return;
  const el = res.survivors.p.find(x => x.uid === pr.s.uid);
  if (el) pr.s.hp = Math.max(1, Math.min(pr.s.maxhp, pr.s.hp - Math.max(0, el.maxhp - el.hp)));
  else { pr.dead = true; g.board = g.board.filter(x => x !== pr.s); say(I18N.t('log.modelDestroyed', { name: pr.s.name })); }
}

function applyFx(k, src, allies, enemies, say, bonus, level, extra) {
  if (POWERS.run(k, src, allies, enemies, say, level, bonus, extra)) return;   // powers already described by bricks (data/powers.json)
  const alive = l => l.filter(s => s.hp > 0);
  const buff = (s, a, h) => { s.atk += a; s.hp += h; s.maxhp += h; };
  switch (k.fx) {
    case 'prPersist': case 'firstOfferUp': case 'firstEquipOffType': case 'ignoreSmallHits': case 'permAlliesStats': case 'droneAura': case 'cheatDeath': case 'lazarus': case 'extractRoutines': case 'swarmResonance': case 'droneRanged': case 'coverFire': case 'accumulate': case 'permAtkNoKill': break;   // rule handled by syncPr
    case 'triggerBattlecry': case 'completeFusion': case 'gainAnyEquip': case 'gainUnavailableEquip': case 'discoverEquip': case 'droneBoostGame': case 'buffChosenAlly': break;   // active powers: see ACTIVES
    case 'datacube': break;   // played by reinforcementFx (it acts on the Datacrons, not on the board)
    case 'jamFirstStart': break;   // Quantum Jammer: handled by runCombat (jam counter per side)
    case 'resurrect': break;   // played by deaths()
    case 'gainEquip': if (k.t === 'deathrattle') say(I18N.t('log.equipWillJoin', { name: src.name })); break;
  }
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
  if (eq.mod) { s.droneA += eq.mod.droneA || 0; s.droneH += eq.mod.droneH || 0; s.healBonus = (s.healBonus || 0) + (eq.mod.heal || 0); }
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
    if (eq.mod) { s.droneA -= eq.mod.droneA || 0; s.droneH -= eq.mod.droneH || 0; s.healBonus = (s.healBonus || 0) - (eq.mod.heal || 0); }
  });
  s.slots = (s.sockets || []).map(() => null);
  return defs;
}
// Equipment taken off a servant (event: 'onReplace' or 'onFusion', see RULES.sockets): they go back to the hand or are lost, depending on the rule;
// each one has a chance (RULES.sockets.breakChance) to break and be lost; if the hand is full, they are lost too.
function giveBackEquips(g, defs, say, event) {
  const rule = RULES.sockets;
  defs.forEach(def => {
    if (rule[event] !== 'returnToHand') say(I18N.t('log.equipLost', { item: def.name }));
    else if (rng() < rule.breakChance) say(I18N.t('log.equipBroke', { item: def.name }));
    else if (handFull(g)) say(I18N.t('log.equipLostHandFull', { item: def.name }));
    else { g.hand.push({ kind: 'equip', def }); say(I18N.t('log.equipReturns', { item: def.name })); }
  });
}

// Automatic combat. Works on copies: the player's servants
// therefore "come back" intact for the next combat.
function runCombat(playerBoard, enemyBoard, ctx) {
  const frames = [];
  const cl = s => ({ ...s, equips: [...s.equips], eqSkills: [...(s.eqSkills || [])], kw: [...s.kw], shield: shieldCount(s), reb: s.kw.includes('rebirth') && !s.pr, hadShield: shieldCount(s) > 0, shUsed: 0, resUsed: 0 });
  const B = { p: playerBoard.map(x => ({ ...cl(x), side: 'p' })), e: enemyBoard.map(x => ({ ...cl(x), side: 'e' })) };
  const other = side => (side === 'p' ? 'e' : 'p');
  // When an ally loses its Shield: a carrier of the power regenerates it (limited number of times per combat). Checked after each frame.
  let checking = false;
  const heroShUsed = new Map();   // uses of the hero power during this combat
  const checkShields = () => {
    if (checking) return;
    checking = true;
    ['p', 'e'].forEach(side => B[side].forEach(s => {
      if (s.hp <= 0 || !s.hadShield || s.shield) { if (s.shield) s.hadShield = true; return; }
      s.hadShield = false;
      // Ballistic Accumulator: each living carrier on the side adds X (reinforcement level) to its accumulated damage.
      B[side].filter(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'allyShieldLoss')).forEach(h => {
        const x = ctx.level || 1; h.acc = (h.acc || 0) + x; say(I18N.t('log.accumulates', { name: h.name, amount: x, total: h.acc }));
      });
      const med = B[side].find(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'shieldLost' && (h.shUsed || 0) < k.n));
      // Hero power (player's side): regenerates the first destroyed Shield of an ally, n times per combat.
      const hero = !med && side === 'p' && ctx.heroes.find(h => h.hp > 0 && h.def.power && h.def.power.t === 'shieldLost' && (heroShUsed.get(h) || 0) < h.def.power.n);
      if (!med && !hero) return;
      if (med) med.shUsed = (med.shUsed || 0) + 1; else heroShUsed.set(hero, (heroShUsed.get(hero) || 0) + 1);
      s.shield = shieldCount(s); s.hadShield = true;
      say(I18N.t('log.regenShield', { source: med ? med.name : hero.def.name, name: s.name }));
    }));
    checking = false;
  };
  const say = (msg, hl) => { frames.push({ p: B.p.map(s => ({ ...s })), e: B.e.map(s => ({ ...s })), msg, hl: hl || {} }); checkShields(); };

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
      say(I18N.t(side === 'p' ? 'log.diesAlly' : 'log.diesFoe', { name: s.name }), { dead: [s.uid] });
      s.deathIdx = B[side].indexOf(s);
      B[side].splice(s.deathIdx, 1);
      // AL-11: replays the Deathrattles already used by its side during this combat (its own and those it replays are not remembered).
      const runRattle = k => {
        applyFx(k, s, B[side], B[other(side)], m => say(m));
        if (k.fx === 'gainEquip' && side === 'p') ctx.gainEquip = (ctx.gainEquip || 0) + 1;   // the equipment arrives in hand at the next reinforcement
        else if (k.fx === 'gainEquip' && foeTeam) foeTeam.gainEquip = (foeTeam.gainEquip || 0) + 1;   // same for the Boss board
      };
      skillsOf(s).filter(k => k.t === 'deathrattle').forEach(k => {
        if (k.fx === 'replayRattles') { [...usedRattles[side]].forEach(runRattle); return; }
        runRattle(k); usedRattles[side].push(k);
      });
      // When an enemy dies: the Smuggler recovers one of its equipment, for this combat only.
      POWERS.react('enemyDeath', B[other(side)].filter(h => h.hp > 0), { dead: s, allies: B[other(side)], enemies: B[side] }, say);
      // When an allied Pilot dies: the other servants with the power react (effect valid for the combat).
      if (s.types.includes('pilot')) B[side].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => k.t === 'allyPilotDeath').forEach(k =>
        applyFx(k, h, B[side], B[other(side)], m => say(m), bonusOf(side))));
      // When an enemy Pilot dies: the servants with the power permanently gain +X/+Y (kept by endCombatFx).
      if (s.types.includes('pilot')) B[other(side)].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => k.t === 'enemyPilotDeath').forEach(k => applyFx(k, h, B[other(side)], B[side], m => say(m))));
      // The dead card's allies react in three steps (same order as before): resurrection ("resurrect"), routine extraction, then the Lazarus Protocol.
      // The steps share the event: a resurrection claimed at the first step is known by the third one.
      const dying = { dead: s, allies: B[side], enemies: B[other(side)] };
      ['deathResurrect', 'deathExtract', 'deathLazarus'].forEach(step => POWERS.react(step, B[side].filter(h => h.hp > 0), dying, say));
      POWERS.react('deathRebirth', [s], dying, say);   // Rebirth
    }
  }

  say(I18N.t('log.combatStart'));
  const bossCarrier = { name: ctx.dungeon.boss.name, kw: [], skill: { t: 'bossPower', fx: ctx.dungeon.boss.power, a: 0, h: 0, n: 0 }, extra: [], eqSkills: [], lrSkills: [] };
  // The Boss board that fights (side e) has its own drone bonus and its own equipment to receive: ctx.foeTeam (fights between Boss boards) or the presented board of the game.
  const foeTeam = ctx.foeTeam || (ctx.bossTeams && ctx.bossTeams[ctx.bossCur]) || null;
  const bonusOf = side => (side === 'p' ? ctx.droneBonus : foeTeam && foeTeam.droneBonus);
  // Start of combat. How a power is treated is written in its template (data/powers.json, field "start"):
  //  - late: played after all the other effects of the side (the replays: Imperial Orator, Impulse Duplicator);
  //  - jams: each Quantum Jammer prevents the first start-of-combat effect of the opposing side (counted when the combat begins);
  //  - jammable: false for the effects that cannot be prevented (the Jammers themselves, Impulse Duplicator);
  //  - recorded: the first recorded effect of the side is the one Impulse Duplicator plays again (a prevented effect is not played, so not replayable).
  const jam = { p: 0, e: 0 };
  ['p', 'e'].forEach(side => B[side].forEach(s => skillsOf(s).filter(k => k.t === 'startCombat').forEach(k => { jam[other(side)] += POWERS.startInfo(k.fx).jams; })));
  const jammed = (side, src) => {
    if (jam[side] <= 0) return false;
    jam[side]--; say(I18N.t('log.jammed', { target: src.name }), { tgt: src.uid }); return true;
  };
  const firstOf = { p: null, e: null };   // per side: the first recorded start-of-combat effect (what Impulse Duplicator plays again)
  // "When there is room on the board": each servant concerned summons a drone, one per check.
  const fillSpace = () => ['p', 'e'].forEach(side => [...B[side]].forEach(s => {
    if (s.hp > 0 && B[side].includes(s) && B[side].length < MAX_BOARD) skillsOf(s).filter(k => k.t === 'space').forEach(k => applyFx(k, s, B[side], B[other(side)], m => say(m), bonusOf(side)));
  }));
  // The effects of a band are played from left to right, or from right to left when the order event says so (direction).
  // filter(k) keeps the powers of the current priority tier (and, with the replays inBand, of the current late / not late pass).
  const startFx = (list, allies, enemies, filter, direction) => {
    const side = allies === B.p ? 'p' : 'e', b = bonusOf(side);
    (direction === 'rightToLeft' ? [...list].reverse() : list).forEach(s => {
      skillsOf(s).filter(k => k.t === 'startCombat' && filter(k)).forEach(k => {
        const info = POWERS.startInfo(k.fx);
        if (info.jammable && jammed(side, s)) return;   // prevented effect: it is not replayable by Impulse Duplicator either
        applyFx(k, s, allies, enemies, m => say(m), b, undefined, { first: () => firstOf[side] });
        if (info.recorded && !isLate(k) && !firstOf[side]) firstOf[side] = { k, s };
      });
    });
  };
  const isLate = k => POWERS.startInfo(k.fx).late;

  // Events about the order (spec 12.3): the powers of both camps may change their fields. Same order as the default bands: the Boss's own power,
  // the Boss's board, then the player's board (the heroes carry no reaction yet). evt.ownSide tells a power which camp it belongs to.
  const announce = (event, evt) => {
    [[[bossCarrier], B.e, B.p, 'boss'], [B.e, B.e, B.p, 'boss'], [B.p, B.p, B.e, 'player']].forEach(([cards, allies, enemies, ownSide]) => {
      evt.ownSide = ownSide; evt.allies = allies; evt.enemies = enemies;
      POWERS.react(event, cards, evt, say);
    });
    delete evt.ownSide; delete evt.allies; delete evt.enemies;
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
  const heroStart = ctx.heroes.filter(h => h.hp > 0 && h.def.power && h.def.power.t === 'startCombat');
  const tiers = [...new Set([0, ...[...B.p, ...B.e].flatMap(s => skillsOf(s).filter(k => k.t === 'startCombat').map(priorityOf)),
    explicit(ctx.dungeon.boss.power), ...heroStart.map(h => explicit(h.def.power.fx))].filter(x => x != null))].sort((x, y) => x - y);
  const playBand = (band, tier, late) => {
    const keep = k => priorityOf(k) === tier && (late === null || isLate(k) === late);
    const ownTurn = x => (x == null ? 0 : x) === tier && late !== true;   // the Boss's power and the heroes' powers are never replays
    if (band === 'boss' && ownTurn(explicit(ctx.dungeon.boss.power))) applyFx({ t: 'bossStart', fx: ctx.dungeon.boss.power, a: 0, h: 0, n: 0 }, bossCarrier, B.e, B.p, m => say(m), null, undefined, { room: ctx.room });
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
    const pv = POWERS.react('taunt', foes, { taunters: [] }).taunters;   // Taunt: only the enemies that have it can be targeted
    return pick(pv.length ? pv : foes);
  };
  // Who attacks first: the camp with more servants, the player on a tie. The event firstSide lets powers change it (side: player or boss; reason: moreServants or tie).
  const firstSide = announce('firstSide', { side: B.e.length > B.p.length ? 'boss' : 'player', reason: B.e.length === B.p.length ? 'tie' : 'moreServants' });
  let cur = firstSide.side === 'boss' ? 'e' : 'p';
  let attacks = 0, fatigue = 0, second = null;
  const lastSurv = { p: null, e: null };   // last wounded ally that survived an attack, per side (DE-D0)   // second: Fury servant that attacks a second time
  if (B.p.length && B.e.length) say(I18N.t(cur === 'p' ? 'log.playerFirst' : 'log.bossFirst'));
  while (B.p.length && B.e.length && attacks < 3000) {
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
    // Swarm Resonance: each time an allied drone attacks, each living carrier gives +X ATK to all allied drones for this combat (before the damage, the attacker benefits).
    POWERS.react('attackStart', B[cur].filter(h => h.hp > 0), { attacker: A, allies: B[cur], enemies: B[other(cur)] }, say);
    // Damage doubled against enemy Pilots, only when the servant attacks (not on retaliation).
    const dA = POWERS.react('attackDamage', [A], { attacker: A, target: T, amount: A.atk }).amount, dT = POWERS.react('retaliation', [A], { attacker: A, target: T, amount: POWERS.react('riposteMuted', [T], { amount: T.atk }).amount }).amount;   // Synaptic Jammer: the first attack suffered is not retaliated against; Ranged: no retaliation
    if (cur === 'e') POWERS.react('bossAttack', [bossCarrier], { attacker: A, allies: B.e, enemies: B.p }, say);   // Echo
    // Assault: triggers when the servant attacks, before the attack's damage.
    skillsOf(A).filter(k => k.t === 'assault').forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    POWERS.react('beforeDamage', [A], { attacker: A, target: T }, say);   // Shield breakers
    const hpA0 = A.hp, hpT0 = T.hp;
    hit(T, dA, A); hit(A, dT, T);          // damage and retaliation are simultaneous
    say(I18N.t(dT ? 'log.attack' : 'log.attackNoRetaliation', { attacker: A.name, target: T.name, damage: dA, back: dT }), { att: A.uid, tgt: T.uid, ranged: A.kw.includes('ranged') });
    // Border Guard (overflow onto a neighbor) and Covering Fire (the ally on the right shoots too).
    POWERS.react('afterAttack', [A], { attacker: A, target: T, allies: B[cur], enemies: B[other(cur)] }, say);
    if (T.hp > 0 && T.hp < hpT0) lastSurv[other(cur)] = T;
    if (A.hp > 0 && A.hp < hpA0) lastSurv[cur] = A;
    // After taking damage and surviving (attack or retaliation): the servant triggers its effects (Nanite Injector).
    [[A, hpA0, cur], [T, hpT0, other(cur)]].forEach(([x, h0, side]) => {
      if (x.hp > 0 && x.hp < h0) skillsOf(x).filter(k => k.t === 'afterDamage').forEach(k => applyFx(k, x, B[side], B[other(side)], m => say(m), bonusOf(side)));
    });
    // Ballistic Accelerator: the servant that attacks without killing its target (Shield included) permanently gains +X ATK (kept by endCombatFx).
    if (T.hp > 0) skillsOf(A).filter(k => k.t === 'attackNoKill').forEach(k => applyFx(k, A, B[cur], B[other(cur)], say));
    // After each attack received by an ally, the servants concerned heal that ally (never above its max HP).
    if (T.hp > 0) B[other(cur)].filter(h => h.hp > 0).forEach(h => POWERS.react('allyHit', [h], { target: T, attacker: A }, say));
    // When it survives its attack: the attacking servant gains X ATK for the combat.
    if (A.hp > 0) skillsOf(A).filter(k => k.t === 'attackSurvive').forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    // LR-04: each time an allied Pilot (itself included) survives an attack it inflicts, it is THAT Pilot (A) that permanently gains +X ATK,
    // once per living Instructor on the board. The gain is kept by endCombatFx.
    POWERS.react('attackEnd', B[cur].filter(h => h.hp > 0), { attacker: A, allies: B[cur], enemies: B[other(cur)] }, say);
    // When it survives an attack: immediate gain, kept after the combat (applied to the board servant by endCombatFx).
    if (T.hp > 0) skillsOf(T).filter(k => k.t === 'survive' && k.fx === 'permAtk').forEach(k => applyFx(k, T, B[other(cur)], B[cur], say));
    POWERS.react('afterExchange', [bossCarrier], { allies: B.e, enemies: B.p }, say);   // Regeneration
    deaths([A.uid, T.uid]); fillSpace(); deaths();
    attacks++;
    // Fury: the servant attacks a second time in a row, if it survived.
    if (!isSecond && A.hp > 0 && B[cur].includes(A) && B[other(cur)].length && POWERS.react('afterTurn', [A], { attacker: A }, say).again) { second = A; continue; }   // Fury
    cur = other(cur);
  }
  const winner = B.p.length && !B.e.length ? 'p' : B.e.length && !B.p.length ? 'e' : 'draw';
  say(I18N.t(winner === 'p' ? 'log.combatWon' : winner === 'e' ? 'log.combatLost' : 'log.combatDraw'));
  return { frames, winner, survivors: { p: B.p, e: B.e }, attacks };
}

// ---------- Game ----------
// Boss types: the 3 fixed types of the dungeon (its own and those of its two other mini-bosses) + 2 randomly drawn types: always 5 types.
function drawBossExtra(dungeon, n = RULES.game.bossRandomTypes) { const fixed = [dungeon.type, ...dungeon.minis]; return [...ALL_TYPES].sort(() => rng() - 0.5).filter(t => !fixed.includes(t)).slice(0, n); }
// The player always draws their cards from the dungeon's type + the types of their two heroes.
// bossExtra: the Boss's 2 random types (drawn here if not provided, for example to start over with the same ones).
function newGame(selection) {
  // The state of the player's side comes from the description of the game (zones, resources, variables); what the player chose at the setup and the
  // initialisation effects of the description (setTypes, createSides below) complete it.
  return GAME.applySetup(GAME.initialSide('player'), selection);
}
// What a chosen item becomes in the game state (the categories of the description).
GAME.picked.hero = id => ({ def: HEROES[id], hp: HEROES[id].hp, maxhp: HEROES[id].hp });
GAME.picked.dungeon = id => DUNGEONS[id];
// setTypes: the types in play are those of the heroes and of the dungeon, completed at random up to the number the rules ask for;
// the Boss draws from its dungeon's types plus a few drawn at random (selection.bossExtra lets a test or a restart keep them).
GAME.init.setTypes = (g, selection) => {
  const types = [...new Set([...g.heroes.flatMap(h => h.def.types), g.dungeon.type])];
  while (types.length < RULES.game.gameTypes) types.push(pick(ALL_TYPES.filter(t => !types.includes(t))));
  g.types = types; g.bossExtra = selection.bossExtra || drawBossExtra(g.dungeon);
};
// createSides: the Boss's boards (each one starts with its mini-boss and draws a different behavior) and the numbering of the PR model.
GAME.init.createSides = g => {
  const bossTypes = [g.dungeon.type, ...g.dungeon.minis, ...g.bossExtra];
  const behaviors = Object.keys(RULES.bossBehaviors.list).sort(() => rng() - 0.5).slice(0, BOSS_BOARDS.length);   // different behaviors, one per board
  g.boss = { name: g.dungeon.boss.name, hp: g.dungeon.boss.hp, maxhp: g.dungeon.boss.hp };
  g.bossTeams = BOSS_BOARDS.map((b, i) => makeTeam(bossTypes, b.malus, { ...g.dungeon.dummies[i], bg: g.dungeon.id }, behaviors[i]));
  g.prNum = prWins() + 1;
};
const levelCost = lvl => lvl + RULES.game.levelCostOffset;    // level N -> N+1: N + offset contribution Datacrons (data/rules.json, game)

// ---------- Boss boards ----------
// Each board is an automatic "player", with its hand, its reinforcement level and its Datacrons.
// It uses the same functions as the player (draw of 3 cards, placement, equipment, fusion).
function makeTeam(types, malus, dummy, behavior = RULES.bossBehaviors.default) {
  const team = Object.assign(GAME.initialSide('boss'), { types, malus, behavior, heroes: [] });   // zones, resources and variables of the Boss's side: game.json
  if (dummy) team.board.push(mkServant(dummy));
  return team;
}
const powerOf = s => s.rank * 10 + s.atk + s.hp + (s.equips ? s.equips.length * 2 : 0);
const cardScore = c => c.rank * 10 + c.atk + c.hp + (c.kw ? (Array.isArray(c.kw) ? c.kw.length : 1) * 3 : 0) + ((c.skill ? 4 : 0) + (c.extra ? c.extra.length * 4 : 0));
const bestOf = (cards, score = cardScore) => cards.reduce((b, c) => (score(c) > score(b) ? c : b));

// Places what the hand contains: servants on the board (or in place of the weakest if it is full),
// equipment on the strongest servant; the rest is discarded.
function aiPlace(t, say) {
  for (let i = t.hand.length - 1; i >= 0; i--) {
    const h = t.hand[i];
    if (h.kind === 'servant') {
      if (t.board.length < MAX_BOARD) placeServant(t, i, null, say);
      else {
        const free = t.board.map((s, j) => j).filter(j => !t.board[j].fixed);   // Dummies are never replaced
        const wi = free.reduce((w, j) => (powerOf(t.board[j]) < powerOf(t.board[w]) ? j : w), free[0]);
        if (free.length && powerOf(h.s) > powerOf(t.board[wi])) placeServant(t, i, wi, say); else { t.hand.splice(i, 1); t.stats.discarded++; }
      }
    } else if (t.board.length) {
      // The preferred servant of the behavior if it has a compatible free socket, otherwise the strongest one that has; no socket anywhere: the equipment is discarded.
      const fits = t.board.filter(s => canEquip(s, h.def));
      const wanted = BOSS_TARGETS[bhv(t).target](t);
      const target = fits.includes(wanted) ? wanted : fits.length ? fits.reduce((b, s) => (powerOf(s) > powerOf(b) ? s : b)) : null;
      if (target) applyEquip(target, h.def); else t.stats.discarded++;
      t.hand.splice(i, 1);
    }
  }
  if (t.board.length && t.hand.some(h => h.kind === 'equip')) aiPlace(t, say);   // equipment received from a battlecry
}

// Behavior of a Boss board (rules of the mod: bossBehaviors). The strategies named by the rules are generic: they are ways to value a card or to choose a servant.
const bhv = t => RULES.bossBehaviors.list[t.behavior] || RULES.bossBehaviors.list[RULES.bossBehaviors.default];
const BOSS_SCORES = {
  card: (t, c) => cardScore(c),
  rank: (t, c) => c.rank * 20 + c.atk + c.hp,
  sharedTypes: (t, c) => {
    const freq = {}; t.board.forEach(s => s.types.forEach(x => { freq[x] = (freq[x] || 0) + 1; }));
    return cardScore(c) + 6 * (c.types || []).reduce((a, x) => a + (freq[x] || 0), 0);
  }
};
const BOSS_TARGETS = {
  strongest: t => t.board.reduce((b, s) => (powerOf(s) > powerOf(b) ? s : b)),
  leastEquipped: t => t.board.reduce((b, s) => (s.equips.length < b.equips.length ? s : b)),   // spreads the equipment
  fixed: t => t.board.find(s => s.fixed) || t.board[0]
};
const bossWant = (b, room) => Math.min(MAX_BOARD, b.want.base + Math.floor(room / b.want.per));
const bossLevel = (b, room) => b.level.base + Math.floor(room / b.level.per);
function aiReinforcement(t, room, say) {
  const b = bhv(t);
  // Room 1: no Datacron, the board stays the Dummy alone (otherwise it would be unbeatable); its reinforcement powers still play.
  const inc = room === 1 ? 0 : Math.max(1, incomeFor(room) - (t.malus >= 1 ? 1 : rng() < t.malus ? 1 : 0));
  t.datacrons += inc; t.stats.earned += inc;
  reinforcementFx(t, 'startReinforcement', say);
  const rf = { reward: null };
  const ai = { offer: null, reward: null, log: [] };   // this board's own reinforcement state, as the player's (rf)
  const want = bossWant(b, room);
  // The Boss plays the same actions as the player (game.json): the action that opens the offer of a kind, the action that raises the level.
  const actionOf = kind => Object.keys(GAME.def().actions).find(id => { const o = GAME.opens(id); return o && o.choice === 'offer' && o.params.kind === kind; });
  const levelAction = Object.keys(GAME.def().actions).find(id => GAME.def().actions[id].effects.some(e => e.action === 'levelUpIfFull'));
  for (let guard = 0; t.datacrons >= 1 && guard < 40; guard++) {
    const held = t.board.length + t.hand.filter(h => h.kind === 'servant').length;
    let act;
    if (held < want) act = 'servant';
    else if (t.level < MAX_LEVEL && t.level < bossLevel(b, room)) act = 'level';
    else act = t.board.length && rng() < b.equipP ? 'equip' : 'servant';
    // Kind of reinforcement bought: an equipment only if a servant has a free socket and the mod offers it; otherwise the first kind the mod offers.
    let kindWanted = act === 'equip' && actionOf('equip') && t.board.some(s => freeSockets(s) > 0) && equipAvailable(t, t.level) ? 'equip' : 'servant';
    if (act !== 'level' && !actionOf(kindWanted)) kindWanted = ['servant', 'equip'].find(actionOf);
    const id = act === 'level' ? levelAction : actionOf(kindWanted);
    if (!GAME.canRun(t, ai, id)) { if (t.datacrons < GAME.price(id)) break; continue; }
    if (!GAME.run(t, ai, id, say)) { t.datacrons -= GAME.price(id); continue; }   // nothing to offer: the price is lost, as it always was for the Boss
    if (act === 'level') continue;
    const kind = kindWanted, card = bestOf(ai.offer.cards, kind === 'servant' ? c => BOSS_SCORES[b.score](t, c) : cardScore);
    ai.offer = null;
    t.hand.push(kind === 'servant' ? { kind, s: mkServant(card) } : { kind, def: card });
    aiPlace(t, say);
    for (let f = 0; f < 5 && resolveFusion(t, rf, say); f++) {
      if (rf.reward) { t.hand.push({ kind: 'servant', s: mkServant(bestOf(rf.reward.cards)) }); rf.reward = null; }
      aiPlace(t, say);
    }
  }
  reinforcementFx(t, 'endReinforcement', say);
}

// At the start of each room, the three boards reinforce themselves, then the Boss presents one,
// always different from the one of the previous room.
function bossReinforcement(g) {
  g.bossLog = [];
  g.bossTeams.forEach((t, i) => aiReinforcement(t, g.room, m => g.bossLog.push(`[Plateau ${i + 1}] ${m}`)));
  const choices = [0, 1, 2].filter(i => i !== g.bossLast);
  g.bossCur = pick(choices); g.bossLast = g.bossCur;
  g.bossLog.push(`Le Boss présente le plateau ${g.bossCur + 1}.`);
}

// ---------- Fights between the Boss boards ----------
// The Boss boards gain what a board gains by fighting (permanent bonuses, end-of-combat powers, Adaptation), like the player's.
// After the player's combat: the board that fought the player keeps what it gained; the other boards fight each other two by two, in order;
// with an odd number of other boards, the last one faces a temporary copy of the board that fought the player (4 boards: 1 faces the player, 2 faces 3, 4 faces a copy of 1; the copy gains nothing for board 1).
// These fights are not shown and never touch the Boss's HP or the heroes'. They only change the boards (and their drone bonus, equipment to receive).
const swapSide = side => (side === 'p' ? 'e' : 'p');
function teamCombatEnd(team, res, side, say) {
  const view = { ...res, survivors: { p: res.survivors[side], e: res.survivors[swapSide(side)] } };
  view.survivors.p.forEach(el => {
    const mine = team.board.find(x => x.uid === el.uid);
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
  const logFor = i => m => g.bossLog.push(`[Plateau ${i + 1}] ${m}`);
  const faced = g.bossCur;
  teamCombatEnd(g.bossTeams[faced], res, 'e', logFor(faced));
  const others = g.bossTeams.map((t, i) => i).filter(i => i !== faced), fights = [];
  for (let k = 0; k + 1 < others.length; k += 2) fights.push([others[k], others[k + 1]]);
  if (others.length % 2) fights.push([others[others.length - 1], faced, true]);   // true: against a temporary copy, so that the board that faced the player does not gain twice
  fights.forEach(([a, b, copy]) => {
    const [pi, ei] = rng() < 0.5 ? [b, a] : [a, b];
    const real = i => g.bossTeams[i], temp = i => ({ ...real(i), board: JSON.parse(JSON.stringify(real(i).board)), droneBonus: { ...real(i).droneBonus } });   // the copy is thrown away: it gains nothing for the real board
    const X = copy && pi === b ? temp(pi) : real(pi), Y = copy && ei === b ? temp(ei) : real(ei);
    if (!X.board.length || !Y.board.length) return;
    // No Boss power in these fights (it belongs to the Boss facing the player), no heroes.
    const ctx = { heroes: [], level: X.level, room: g.room, dungeon: { ...g.dungeon, boss: { ...g.dungeon.boss, power: 'none' } }, droneBonus: X.droneBonus, gainEquip: X.gainEquip || 0, foeTeam: Y };
    const r = runCombat(X.board, Y.board, ctx);
    X.gainEquip = ctx.gainEquip;   // (for the temporary copy this changes the copy only)
    g.bossLog.push(`Plateau ${pi + 1} contre plateau ${ei + 1}${copy ? ' (copie temporaire)' : ''} : ${r.winner === 'p' ? `victoire du plateau ${pi + 1}` : r.winner === 'e' ? `victoire du plateau ${ei + 1}` : 'égalité'}.`);
    if (!(copy && pi === b)) teamCombatEnd(X, r, 'p', logFor(pi));
    if (!(copy && ei === b)) teamCombatEnd(Y, r, 'e', logFor(ei));
  });
}

// Draw of a reinforcement choice: 3 cards (3 to 6 depending on the level) at random from an infinite pool, max rank = maxRank,
// lower ranks possible. exact = true: only rank maxRank (fusion reward).
function drawCards(g, kind, maxRank, exact, size) {
  const pool = kind === 'servant'
    ? SERVANTS.filter(x => x.types.some(t => g.types.includes(t)))
    : EQUIPS.filter(e => !e.token && e.rank <= maxRank && (!e.type || g.types.includes(e.type)));
  const weightOf = x => kind === 'servant' ? 1 + x.types.filter(t => g.types.includes(t)).length : 1;
  const res = [], count = size != null ? size : (exact ? PROPOSALS : reinforcementProposals(maxRank));
  for (let guard = 0; res.length < count && guard < 100; guard++) {
    const r = exact ? maxRank : 1 + rand(maxRank);
    let c = pool.filter(x => x.rank === r && !res.includes(x));
    if (!c.length) c = pool.filter(x => x.rank <= r && !res.includes(x));
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
const equipAvailable = (g, maxRank) => EQUIPS.some(e => !e.token && e.rank <= maxRank && (!e.type || g.types.includes(e.type)));
// Bonuses of the first proposal of the reinforcement, shared by the player and the Boss (g = team: the carrier must be on the board).
const hasFirstOfferUp = g => g.board.some(s => skillsOf(s).some(k => k.fx === 'firstOfferUp'));   // Stellar Compass (does not stack)
const firstEquipOffChance = g => Math.min(1, g.board.reduce((a, s) => a + skillsOf(s).filter(k => k.fx === 'firstEquipOffType').reduce((b, k) => b + k.n, 0), 0) / 100);   // Three-dimensional Probe (stacks)
// up = true (Stellar Compass, first proposal of the reinforcement): one of the offered cards is replaced by a card of the next rank (never beyond MAX_LEVEL).
// eqChance (Three-dimensional Probe, equipment proposals): probability that the first offered equipment is of a type absent from the team (rank at most maxRank); no effect if none exists.
function drawOffer(g, maxRank, size, up, eqChance, kind = 'servant') {
  const n = size || reinforcementProposals(maxRank);
  const cards = drawCards(g, kind, maxRank, false, n);
  if (kind === 'equip' && eqChance > 0 && cards.length && rng() < eqChance) {
    const pool = EQUIPS.filter(e => !e.token && e.rank <= maxRank && e.type && !g.types.includes(e.type)), r = 1 + rand(maxRank);
    const c = pool.filter(e => e.rank === r), from = c.length ? c : pool;
    if (from.length) cards[0] = pick(from);
  }
  if (up && maxRank < MAX_LEVEL && cards.length) { const hi = drawCards(g, kind, maxRank + 1, true, 1); if (hi.length) cards[rand(cards.length)] = hi[0]; }
  return cards.map(card => ({ kind, card }));
}

// Equipment of the current reinforcement level (rank equal to the level, otherwise the highest rank below), among those accessible to the game.
function randomEquip(g) {
  const pool = EQUIPS.filter(e => !e.token && (!e.type || g.types.includes(e.type)));
  for (let r = g.level; r >= 1; r--) { const c = pool.filter(e => e.rank === r); if (c.length) return pick(c); }
  return null;
}
// Datacube: bag of marbles containing each face twice; drawn without replacement and refilled when the bag is empty.
function drawCube(g) {
  if (!g.cubeBag.length) g.cubeBag = [...CUBE_FACES, ...CUBE_FACES];
  return g.cubeBag.splice(rand(g.cubeBag.length), 1)[0];
}
// Active power "grantRebirth": temporary Rebirth, removed when the next reinforcement opens (see expireTemp).
function grantRebirth(g, uid, say) {
  const s = g.board.find(x => x.uid === uid);
  if (!s || isPr(s) || s.kw.includes('rebirth')) return false;
  s.kw.push('rebirth'); s.tmpReb = true;
  say(I18N.t('log.gainsRebirth', { name: s.name }));
  return true;
}
// Hal Ana: the discovered servant arrives in the hand (never directly on the board) as soon as PROPHECY_COST Datacrons have been spent.
function checkProphecy(g, say) {
  const p = g.prophecy;
  if (!p || p.done || (g.spent || 0) < PROPHECY_COST) return;
  const s = mkServant(p.card);
  if (handFull(g)) return;   // full hand: it waits for a slot to free up
  g.hand.push({ kind: 'servant', s });
  p.done = true; g.stats.servants++; say(I18N.t('log.prophecyArrives', { name: s.name, cost: PROPHECY_COST }));
}
function expireTemp(g) {
  g.board.forEach(s => { if (s.tmpReb) { s.kw = s.kw.filter(k => k !== 'rebirth'); delete s.tmpReb; } });
  g.heroes.forEach(h => { h.used = false; });
}
function reinforcementFx(g, trig, say) {
  g.board.slice().forEach(s => {
    skillsOf(s).filter(k => k.t === trig).forEach(k => {
      // Stellar Smith and the like: powers of the game level are templates reacting to the event 'game' (giveEquip…). g.forgeFx is read by the interface (playForge).
      POWERS.react('game', [s], { g, trigger: trig, only: k }, say);
      applyFx(k, s, g.board, [], say);
    });
  });
  g.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && h.def.power.t === trig && ['genDroide', 'forgePatch', 'creeUnite', 'forgeRoboticien', 'datacube'].includes(h.def.power.fx)) {
      // Hero powers of the game level (TE-5T, Brokk'Ric, ZC-D9, Reyes, Datacube): templates reacting to the event 'game'.
      POWERS.react('game', [{ name: h.def.name, kw: [], skill: h.def.power }], { g, trigger: trig }, say);
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig) {
      const src = { name: h.def.name, kw: [] };
      applyFx(h.def.power, src, g.board, [], say, null, g.level);
      if (src.patch) g.patchFx = { hero: g.heroes.indexOf(h), uid: src.patchUid, x: src.patch };   // read by the interface to play the animation (playPatch)
    }
  });
  flushPr(g, say);
}
// Placement of a servant from the hand on the board (replacement if replaceIdx).
function placeServant(g, handIdx, replaceIdx, say) {
  const s = g.hand[handIdx].s;
  g.hand.splice(handIdx, 1);
  if (replaceIdx != null) { const old = g.board[replaceIdx]; say(I18N.t('log.replaced', { name: old.name })); g.board.splice(replaceIdx, 1, s); giveBackEquips(g, removeEquips(old), say, 'onReplace'); }
  else g.board.push(s);
  say(I18N.t('log.joinsBoard', { name: s.name }));
  triggerBattlecry(g, s, say);
}
// A servant's battlecry: on its placement, or triggered again by an active power (Waven). Returns false if it has none.
const battlecriesOf = s => skillsOf(s).filter(k => k.t === 'battlecry');
function triggerBattlecry(g, s, say) {
  const cries = battlecriesOf(s);
  cries.forEach(k => {
    applyFx(k, s, g.board, [], say); flushPr(g, say);
    POWERS.react('game', [s], { g, trigger: 'battlecry', only: k }, say);   // powers of the game level (equipment to the hand, drone bonus, choices…): templates reacting to 'game'
  });
  return cries.length > 0;
}
// Pending discoveries (Liaison Attaché): the next one becomes the current choice (rf.reward) as soon as no other choice is open.
function flushDiscover(g, rf) { if (rf && !rf.reward && g.discoverQueue && g.discoverQueue.length) rf.reward = g.discoverQueue.shift(); }
// Non-gold servants (board then hand) bearing this name: used by Sulseye to spot a pair.
const copiesOf = (g, name) => [...g.board, ...g.hand.filter(h => h.kind === 'servant').map(h => h.s)].filter(x => x.name === name && !x.gold && !x.fixed && !isPr(x));
// Active powers of the heroes: button label, possible targets, effect. Used by the interface.
// By default a power is free and usable once per reinforcement. repeat: no limit per reinforcement; cost(h): price in Datacrons.
const ACTIVES = {
  grantRebirth: { label: 'active.grantRebirth', icon: 'medic', color: '#a8d94a', ok: (g, s) => !isPr(s) && !s.kw.includes('rebirth'),
                  run: (g, uid, say) => grantRebirth(g, uid, say) },
  // Sulseye: on a servant of which exactly two copies are owned, creates the third, which fuses at once (the copy takes no room in hand).
  completeFusion: { label: 'active.completeFusion', icon: 'diplomat', color: '#4f8cff', repeat: true, cost: h => FUSION_COST + FUSION_STEP * (h.fusions || 0),
                  ok: (g, s) => copiesOf(g, s.name).length === 2,
                  run: (g, uid, say, h, rf) => {
                    const s = [...g.board, ...g.hand.filter(x => x.kind === 'servant').map(x => x.s)].find(x => x.uid === uid);
                    const def = s && SERVANTS.find(d => d.name === s.name);
                    if (!def || copiesOf(g, s.name).length !== 2) return false;
                    const copy = mkServant(def);
                    g.hand.push({ kind: 'servant', s: copy });
                    say(I18N.t('log.createsCopy', { name: h.def.name, target: s.name }));
                    if (!resolveFusion(g, rf, say)) { g.hand = g.hand.filter(x => x.s !== copy); return false; }
                    h.fusions = (h.fusions || 0) + 1;
                    return true;
                  } },
  triggerBattlecry: { label: 'active.triggerBattlecry', icon: 'diplomat', color: '#4f8cff', ok: (g, s) => battlecriesOf(s).length > 0,
                  run: (g, uid, say) => { const s = g.board.find(x => x.uid === uid); if (!s || !battlecriesOf(s).length) return false; say(I18N.t('log.replaysBattlecry', { name: s.name })); return triggerBattlecry(g, s, say); } }
};

// Skill of a gold card: values doubled, except the multi-hit Shield which gains a hit (2 -> 3).
// Gold Far-Reach Explorer: always 7 cards, but over the next two equipment reinforcements.
// Gold Stellar Smith: level 6 equipment (the maximum level) instead of 5.
const goldSkill = k => k.fx === 'shieldCharges' || k.fx === 'addUnavailableEquip' ? { ...k, n: k.n + 1 } : k.fx === 'bigEquipOffer' ? { ...k, times: 2 } : { ...k, a: k.a * 2, h: k.h * 2, n: k.n * 2 };

// Simple fusion of three identical servants (same name, non-gold), board and hand together.
// The gold card adds up their statistics and doubles the values of its skill.
// Returns true if a fusion took place (a reward is then to be chosen).
function resolveFusion(g, rf, say) {
  const all = [...g.board.map(s => ({ s })), ...g.hand.filter(h => h.kind === 'servant').map(h => ({ s: h.s }))].filter(x => !x.s.fixed);   // a Dummy does not fuse
  const names = [...new Set(all.filter(x => !x.s.gold).map(x => x.s.name))];
  const name = names.find(n => all.filter(x => !x.s.gold && x.s.name === n).length >= 3);
  if (!name) return false;
  const trio = all.filter(x => !x.s.gold && x.s.name === name).slice(0, 3).map(x => x.s);
  const taken = trio.flatMap(x => removeEquips(x));   // the equipment go back to the hand (with a chance to break), the gold card starts bare
  const sum = k => trio.reduce((a, x) => a + x[k], 0);
  const k = trio[0].skill;
  const gold = {
    uid: uid(), id: trio[0].id, name: `${name} doré`, rank: trio[0].rank, atk: sum('atk'), hp: sum('hp'), maxhp: sum('maxhp'),
    types: [...trio[0].types], kw: [...new Set(trio.flatMap(x => x.kw.filter(k => !(k === 'rebirth' && x.tmpReb))))], gold: true,
    skill: k ? goldSkill(k) : null, extra: (trio[0].extra || []).map(goldSkill), equips: [], sockets: [...(trio[0].sockets || [])], slots: (trio[0].sockets || []).map(() => null),
    eqSkills: [], lrSkills: trio.flatMap(x => x.lrSkills || []), droneA: trio.reduce((a, x) => a + (x.droneA || 0), 0), droneH: trio.reduce((a, x) => a + (x.droneH || 0), 0)
  };
  const ids = new Set(trio.map(x => x.uid));
  const bi = g.board.findIndex(x => ids.has(x.uid));
  if (bi >= 0) g.board[bi] = gold;
  else g.hand[g.hand.findIndex(h => h.kind === 'servant' && ids.has(h.s.uid))] = { kind: 'servant', s: gold };
  g.board = g.board.filter(x => x === gold || !ids.has(x.uid));
  g.hand = g.hand.filter(h => h.kind !== 'servant' || h.s === gold || !ids.has(h.s.uid));
  giveBackEquips(g, taken, say, 'onFusion');
  g.stats.fusions++;
  const r = Math.min(MAX_RANK, g.level + 1);
  rf.reward = { rank: r, cards: drawCards(g, 'servant', r, true) };
  say(I18N.t('log.fusion', { name: name, gold: gold.name, rank: r }));
  return true;
}

// ---------- Adaptation (signature power of the Elk) ----------
// End of combat: each surviving Elk chooses between two options: a +N HP or +N ATK bonus drawn at random (N = reinforcement level),
// or a power (keyword or skill) drawn at random among those of the other survivors. A learned ability is permanent for the mission.
const isAdapt = k => k.fx === 'adapt' || k.fx === 'adaptExtra';   // adaptExtra (Naturalist): one additional Adaptation per combat, not learnable
const capKey = c => c.stat ? `stat:${c.stat}:${c.hpStat ? 'hp' : 'atk'}` : c.kw ? `kw:${c.kw}` : `sk:${c.skill.t}:${c.skill.fx}:${c.skill.a}:${c.skill.h}:${c.skill.n}`;
const capOwned = (s, c) => c.stat ? false : c.kw ? s.kw.includes(c.kw) : skillsOf(s).some(k => capKey({ skill: k }) === capKey(c));
const capLabel = c => c.stat ? I18N.t(c.hpStat ? 'ui.capHp' : 'ui.capAtk', { n: c.stat }) : c.kw ? I18N.t('keyword.' + c.kw) : skDesc(c.skill);
// An ability to learn must not be a battlecry (it never triggers again) nor Adaptation itself.
const capsOf = s => [...s.kw.map(kw => ({ kw })), ...skillsOf(s).filter(k => !isAdapt(k) && k.t !== 'battlecry').map(skill => ({ skill }))];
// A servant is reborn with a new identifier: only the survivors still present on the board (same uid) count.
function adaptationOffers(g, res) {
  const surv = res.survivors.p, offers = [];
  surv.forEach(el => {
    const mine = g.board.find(s => s.uid === el.uid);
    if (!mine || !mine.types.includes('elk') || !skillsOf(mine).some(isAdapt)) return;
    // Two choices: a +N HP or +N ATK bonus (at random) and a single power drawn at random among those of the other survivors.
    // An additional Adaptation (adaptExtra) adds one more choice, which will not offer again the ability already offered to the previous one.
    const seen = new Set(), extras = skillsOf(mine).filter(k => k.fx === 'adaptExtra').length;
    for (let n = 0; n <= extras; n++) {
      const options = [{ stat: g.level, hpStat: rng() < 0.5, from: null }];
      const caps = surv.filter(o => o !== el).flatMap(o => capsOf(o).filter(c => !capOwned(mine, c) && !seen.has(capKey(c))).map(c => ({ ...c, from: o.name })));
      if (caps.length) { const c = caps[Math.floor(rng() * caps.length)]; seen.add(capKey(c)); options.push(c); }
      offers.push({ uid: mine.uid, name: mine.name, options });
    }
  });
  return offers;
}
function learnCapability(g, uid, cap) {
  const s = g.board.find(x => x.uid === uid);
  if (!s || capOwned(s, cap)) return null;
  if (cap.stat) { const b = `${s.atk}/${s.hp}`; if (cap.hpStat) { s.hp += cap.stat; s.maxhp += cap.stat; } else s.atk += cap.stat; return I18N.t('log.adapts', { name: s.name, capability: capLabel(cap), before: b, after: `${s.atk}/${s.hp}` }); }
  if (cap.kw) s.kw.push(cap.kw); else s.lrSkills.push({ ...cap.skill });
  return I18N.t('log.learns', { name: s.name, capability: capLabel(cap), from: cap.from });
}

// End-of-combat effects of the player's survivors (Drone Master: permanent drone bonus). Returns the log lines.
function endCombatFx(g, res) {
  const lines = [];
  syncPr(g, res, m => lines.push(m));
  res.survivors.p.forEach(el => {
    const mine = g.board.find(s => s.uid === el.uid);
    if (!mine) return;
    if (el.perm) { const b = `${mine.atk}/${mine.hp}`; mine.atk += el.perm; lines.push(I18N.t('log.keepsAtk', { name: mine.name, amount: el.perm, before: b, after: `${mine.atk}/${mine.hp}` })); }
    if (el.permHp) { const b = `${mine.atk}/${mine.hp}`; mine.hp += el.permHp; mine.maxhp += el.permHp; lines.push(I18N.t('log.keepsHp', { name: mine.name, amount: el.permHp, before: b, after: `${mine.atk}/${mine.hp}` })); }
    // End-of-combat powers of the survivor (Stellar Chronoscope, Far-Reach Explorer, Ruin Looter, drone bonus): templates reacting to 'combatEnd'.
    POWERS.react('combatEnd', [mine], { g, res }, m => lines.push(m));
  });
  flushPr(g, m => lines.push(m));
  return lines;
}

// Rule: end of combat, the survivors of the winning side strike the other side (data/rules.json, settlement).
function settleCombat(g, res) {
  const lines = [], hits = res.hits = [];   // hits: one hit per survivor (for the end-of-combat animation)
  const rule = RULES.settlement, damageOf = (side, s) => s.rank * rule[side].perRank + rule[side].flat;
  if (res.winner === 'p') {
    res.survivors.p.forEach(s => hits.push({ uid: s.uid, side: 'p', to: 'boss', dmg: damageOf('player', s) }));
    const dmg = res.survivors.p.reduce((a, s) => a + damageOf('player', s), 0);
    g.boss.hp = Math.max(0, g.boss.hp - dmg);
    lines.push(I18N.t('log.survivorsHitBoss', { names: res.survivors.p.map(s => `${s.name} R${s.rank}`).join(', '), amount: dmg }));
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
// Spending Datacrons counts toward the prophecy; a refund (nothing to offer) takes it back.
GAME.hooks.afterSpend = (g, resource, amount, say) => { if (resource === 'datacrons') { g.spent = (g.spent || 0) + amount; checkProphecy(g, say); } };
GAME.hooks.afterRefund = (g, resource, amount) => { if (resource === 'datacrons') g.spent -= amount; };
// Choice "offer": a reinforcement of one kind. The bonuses that change the draw (Far-Reach Explorer, Stellar Compass, Three-dimensional Probe) are applied here.
GAME.openers.offer = (g, rf, params, say) => {
  const kind = params.kind;
  if (rf.offer) say(I18N.t('log.offerAbandoned'));   // changing your mind costs one more Datacron
  const size = kind === 'equip' && g.equipOfferSize && g.equipOfferLeft > 0 ? g.equipOfferSize : 0;
  if (size && --g.equipOfferLeft <= 0) { g.equipOfferLeft = 0; g.equipOfferSize = 0; }
  const first = !rf.bought, up = first && hasFirstOfferUp(g); rf.bought = (rf.bought || 0) + 1;
  if (up && g.level < MAX_LEVEL) say(I18N.t('log.compassUpgrade'));
  const o = drawOffer(g, g.level, size, up, firstEquipOffChance(g), kind);
  if (!o.length) { say(I18N.t('log.noCardToOffer')); return false; }
  rf.offer = { kinds: o.map(x => x.kind), cards: o.map(x => x.card) };
  return true;
};

// ---------- Events and runners of the flow (flow.js): what the engine does at the steps that game.json lists ----------
// Equipment received through the Relic Hunter's deathrattle: straight into the hand, if there is room left.
function serveGainEquipFor(g, rf) {
  for (; g.gainEquip > 0; g.gainEquip--) {
    const def = randomEquip(g);
    if (!def) continue;
    if (handFull(g)) rf.log.push(I18N.t('log.handFullLost', { name: def.name }));
    else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; rf.log.push(I18N.t('log.itemJoinsYourHand', { name: def.name })); }
  }
}
// First room: Hal Ana's prophecy is offered before anything else (the choice blocks the flow until it is made).
GAME.events.startMission = (g, rf) => { if (g.heroes.some(h => h.def.power && h.def.power.fx === 'prophecy')) rf.prophecy = { cards: drawCards(g, 'servant', MAX_RANK, true) }; };
GAME.events.beforeIncome = (g, rf, say) => { expireTemp(g); checkProphecy(g, say); };
GAME.events.startReinforcement = (g, rf, say) => { reinforcementFx(g, 'startReinforcement', say); serveGainEquipFor(g, rf); };
// The end-of-reinforcement powers speak to the player in a notice; the patch (Reyes) is played by the interface from g.patchFx.
GAME.events.endReinforcement = (g, rf) => { const msgs = []; g.patchFx = null; reinforcementFx(g, 'endReinforcement', m => msgs.push(m)); GAME.out.notice = msgs.join(' '); };
GAME.runners.bossReinforcement = g => bossReinforcement(g);
GAME.runners.combat = g => { GAME.out.combat = runCombat(g.board, g.bossTeams[g.bossCur].board, g); };
GAME.runners.settlement = g => { GAME.out.lines = settleCombat(g, GAME.out.combat); };
GAME.runners.aftermath = g => {
  const res = GAME.out.combat;
  GAME.out.lines = GAME.out.lines.concat(endCombatFx(g, res));
  bossBoardsFight(g, res);   // the Boss boards gain from their combats and fight each other
  GAME.out.adapt = g.over ? [] : adaptationOffers(g, res);   // Adaptation choices of the surviving Elk, one by one
};
GAME.hooks.final = (g, result) => { if (result === 'won') prRecordWin(); };
