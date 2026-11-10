// Atlas Wanderer — rules engine: automatic combat, game, reinforcement, fusion.
'use strict';
// =====================================================================
// RULES ENGINE
// =====================================================================
function mkServant(d) {
  return { uid: uid(), id: d.id || slug(d.name), name: d.name, rank: d.rank, atk: d.atk, hp: d.hp, maxhp: d.hp,
           types: [...d.types], kw: [...d.kw], fixed: !!d.fixed, bg: d.bg, skill: [].concat(d.skill || [])[0] || null, extra: [].concat(d.skill || []).slice(1), equips: [], eqSkills: [], lrSkills: [], droneA: 0, droneH: 0, healBonus: 0 };
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
  if (src && src.kw.includes('poison')) t.hp = Math.min(t.hp, 0);
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
  g.hand.push({ kind: 'servant', s }); say(`Le modèle ${s.name} rejoint ta main.`);
}
// Applies the pending upgrades to the PR model (in hand or in play). +X/+Y raises HP and max HP: the damage already taken remains.
function flushPr(g, say) {
  const q = PR_QUEUE.splice(0);
  if (!g.pr || g.pr.dead) return;
  const s = g.pr.s;
  q.forEach(b => { const av = `${s.atk}/${s.hp}`; s.atk += b.a; s.hp += b.h; s.maxhp += b.h; say(`Le modèle ${s.name} gagne +${b.a}/+${b.h} [${av} → ${s.atk}/${s.hp}].`); });
}
// End of combat: the PR model keeps its damage; if it did not survive, it is lost for the mission.
function syncPr(g, res, say) {
  const pr = g.pr;
  if (!pr || pr.dead || !g.board.includes(pr.s)) return;
  const el = res.survivors.p.find(x => x.uid === pr.s.uid);
  if (el) pr.s.hp = Math.max(1, Math.min(pr.s.maxhp, pr.s.hp - Math.max(0, el.maxhp - el.hp)));
  else { pr.dead = true; g.board = g.board.filter(x => x !== pr.s); say(`Le modèle ${pr.s.name} est détruit définitivement.`); }
}

function applyFx(k, src, allies, enemies, say, bonus, level) {
  if (POWERS.run(k, src, allies, enemies, say, level, bonus)) return;   // powers already described by bricks (data/powers.json)
  const alive = l => l.filter(s => s.hp > 0);
  const buff = (s, a, h) => { s.atk += a; s.hp += h; s.maxhp += h; };
  switch (k.fx) {
    case 'prPersist': case 'firstOfferUp': case 'firstEquipOffType': case 'ignoreSmallHits': case 'permAlliesStats': case 'droneAura': case 'cheatDeath': case 'lazarus': case 'extractRoutines': case 'swarmResonance': case 'droneRanged': case 'coverFire': case 'accumulate': case 'permAtkNoKill': break;   // rule handled by syncPr
    case 'triggerBattlecry': case 'completeFusion': case 'gainAnyEquip': case 'gainUnavailableEquip': case 'discoverEquip': case 'droneBoostGame': case 'buffChosenAlly': break;   // active powers: see ACTIVES
    case 'datacube': break;   // played by reinforcementFx (it acts on the Datacrons, not on the board)
    case 'summon': {
      if (allies.length >= MAX_BOARD) { say(`${src.name} ne peut pas invoquer : plateau plein.`); break; }
      // The servant's equipment strengthens the drones it summons (droneA / droneH), just like the mission bonus.
      // Chief Mechanic: while alive on the summoner's side, the summoned drones gain its bonus (stackable).
      const aura = allies.filter(x => x.hp > 0).flatMap(x => skillsOf(x)).filter(x => x.t === 'passive' && x.fx === 'droneAura');
      const pa = (src.droneA || 0) + (bonus ? bonus.a : 0) + aura.reduce((n, x) => n + x.a, 0), ph = (src.droneH || 0) + (bonus ? bonus.h : 0) + aura.reduce((n, x) => n + x.h, 0);
      const a = { uid: uid(), name: 'Drone', rank: 1, atk: k.a + pa, hp: k.h + ph, maxhp: k.h + ph, types: [], kw: skillsOf(src).some(x => x.fx === 'droneRanged') ? ['ranged'] : [], skill: null, equips: [], eqSkills: [], lrSkills: [], shield: false, reb: false };   // Ballistic Protocol: "Ranged" drones
      // A dead servant is no longer on the board (Deathrattle): the drone takes its place.
      const at = allies.indexOf(src);
      allies.splice(at >= 0 ? at + 1 : Math.min(src.deathIdx || 0, allies.length), 0, a);
      say(`${src.name} invoque un drone ${a.atk}/${a.hp} ${at >= 0 ? 'à sa droite' : 'à sa place'}.`);
      // Workshop Chief and similar: each ally reacts to the summon.
      allies.filter(s => s.hp > 0).forEach(s => skillsOf(s).filter(x => x.t === 'onSummon').forEach(x => {
        buff(a, x.a, x.h); say(`${s.name} : le drone gagne +${x.a}/+${x.h} (${a.atk}/${a.hp}).`);
      }));
      break;
    }
    case 'jamFirstStart': break;   // Quantum Jammer: handled by runCombat (jam counter per side)
    case 'resurrect': break;   // played by deaths()
    case 'gainEquip': if (k.t === 'deathrattle') say(`${src.name} : un équipement rejoindra la main.`); break;
  }
}

function applyEquip(s, eq) {
  s.atk += eq.atk; s.hp += eq.hp; s.maxhp += eq.hp;
  if (eq.kw && !s.kw.includes(eq.kw)) s.kw.push(eq.kw);
  s.equips.push(eq.name);
  [].concat(eq.skill || []).forEach(k => s.eqSkills.push(k));
  if (eq.mod) { s.droneA += eq.mod.droneA || 0; s.droneH += eq.mod.droneH || 0; s.healBonus = (s.healBonus || 0) + (eq.mod.heal || 0); }
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
  const heroShUsed = new Map();   // uses of the lieutenant power during this combat
  const checkShields = () => {
    if (checking) return;
    checking = true;
    ['p', 'e'].forEach(side => B[side].forEach(s => {
      if (s.hp <= 0 || !s.hadShield || s.shield) { if (s.shield) s.hadShield = true; return; }
      s.hadShield = false;
      // Ballistic Accumulator: each living carrier on the side adds X (reinforcement level) to its accumulated damage.
      B[side].filter(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'allyShieldLoss')).forEach(h => {
        const x = ctx.level || 1; h.acc = (h.acc || 0) + x; say(`${h.name} accumule +${x} dégâts (${h.acc}).`);
      });
      const med = B[side].find(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'shieldLost' && (h.shUsed || 0) < k.n));
      // Lieutenant power (player's side): regenerates the first destroyed Shield of an ally, n times per combat.
      const hero = !med && side === 'p' && ctx.heroes.find(h => h.hp > 0 && h.def.power && h.def.power.t === 'shieldLost' && (heroShUsed.get(h) || 0) < h.def.power.n);
      if (!med && !hero) return;
      if (med) med.shUsed = (med.shUsed || 0) + 1; else heroShUsed.set(hero, (heroShUsed.get(hero) || 0) + 1);
      s.shield = shieldCount(s); s.hadShield = true;
      say(`${med ? med.name : hero.def.name} régénère le Bouclier de ${s.name}.`);
    }));
    checking = false;
  };
  const say = (msg, hl) => { frames.push({ p: B.p.map(s => ({ ...s })), e: B.e.map(s => ({ ...s })), msg, hl: hl || {} }); checkShields(); };

  const usedRattles = { p: [], e: [] };   // Deathrattles already triggered during this combat, per side
  function deaths(prio = []) {
    for (let guard = 0; guard < 500; guard++) {
      const all = [...B.p.map(s => ['p', s]), ...B.e.map(s => ['e', s])].filter(([, s]) => s.hp <= 0);
      if (!all.length) return;
      all.sort((a, b) => {
        const ia = prio.indexOf(a[1].uid), ib = prio.indexOf(b[1].uid);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const [side, s] = all[0];
      // Portable Defibrillator: the first time the carrier should die, it survives with 1 HP (once per combat, the flag is copied with the servant).
      if (POWERS.react('dying', [s], { target: s }, say).cancelled) continue;
      say(`${s.name} (${side === 'p' ? 'allié' : 'ennemi'}) meurt.`, { dead: [s.uid] });
      s.deathIdx = B[side].indexOf(s);
      B[side].splice(s.deathIdx, 1);
      // AL-11: replays the Deathrattles already used by its side during this combat (its own and those it replays are not remembered).
      const runRattle = k => {
        applyFx(k, s, B[side], B[other(side)], m => say(m));
        if (k.fx === 'gainEquip' && side === 'p') ctx.gainEquip = (ctx.gainEquip || 0) + 1;   // the equipment arrives in hand at the next reinforcement
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
      if (s.reb) {
        if (B[side].length < MAX_BOARD) {
          B[side].push({ ...s, uid: uid(), hp: 1, reb: false, shield: false, hadShield: false, bomb: 0 });
          say(`${s.name} renaît avec 1 PV, à l'extrême droite.`);
        } else say(`${s.name} ne peut pas renaître : plateau plein.`);
      }
    }
  }

  say('Début du combat.');
  const bonusOf = side => (side === 'p' ? ctx.droneBonus : null);
  // Effects that replay others (Imperial Orator) go second, once all the original effects have been played.
  // Impulse Duplicator replays the first effect played by the side (with its original carrier); it also goes second.
  const REPLAYS = ['replayAdjacentStart', 'replayFirstStart'];
  // Quantum Jammer: each living Jammer prevents the first start-of-combat effect of the opposing side (replay effects and the Jammers themselves do not count).
  const jam = { p: 0, e: 0 };
  ['p', 'e'].forEach(side => B[side].forEach(s => skillsOf(s).filter(k => k.t === 'startCombat' && k.fx === 'jamFirstStart').forEach(() => { jam[other(side)]++; })));
  const jammed = (side, src) => {
    if (jam[side] <= 0) return false;
    jam[side]--; say(`Le Brouilleur quantique empêche l'effet de début de combat de ${src.name}.`, { tgt: src.uid }); return true;
  };
  const startFx = (list, allies, enemies) => {
    let first = null;
    [false, true].forEach(replay => list.forEach(s => {
      skillsOf(s).filter(k => k.t === 'startCombat' && REPLAYS.includes(k.fx) === replay).forEach(k => {
        const b = bonusOf(allies === B.p ? 'p' : 'e');
        if (k.fx === 'replayFirstStart') {
          if (first) { say(`${s.name} rejoue l'effet de ${first.s.name}.`); applyFx(first.k, first.s, allies, enemies, m => say(m), b); }
        } else if (k.fx === 'jamFirstStart') {
          applyFx(k, s, allies, enemies, m => say(m), b);
        } else if (jammed(allies === B.p ? 'p' : 'e', s)) {
          // prevented effect: it is not replayable by Impulse Duplicator either
        } else {
          applyFx(k, s, allies, enemies, m => say(m), b);
          if (!replay && !first) first = { k, s };
        }
      });
    }));
  };
  // "When there is room on the board": each servant concerned summons a drone, one per check.
  const fillSpace = () => ['p', 'e'].forEach(side => [...B[side]].forEach(s => {
    if (s.hp > 0 && B[side].includes(s) && B[side].length < MAX_BOARD) skillsOf(s).filter(k => k.t === 'space').forEach(k => applyFx(k, s, B[side], B[other(side)], m => say(m), bonusOf(side)));
  }));
  // Rule: the Boss's effects (dungeon power) are always played first, before the start-of-combat effects of the servants and lieutenants.
  if (ctx.dungeon.boss.power === 'surge') {
    const v = Math.floor((ctx.room - 1) / 3);
    if (v > 0) { B.e.forEach(s => { s.atk += v; s.hp += v; s.maxhp += v; }); say(`${ctx.dungeon.boss.name} : Surcharge, ses serviteurs gagnent +${v}/+${v}.`); }
  }
  if (ctx.dungeon.boss.power === 'plate') {
    B.e.forEach(s => { s.hp += 3; s.maxhp += 3; }); say(`${ctx.dungeon.boss.name} : Blindage, ses serviteurs gagnent +0/+3.`);
  }
  startFx([...B.p], B.p, B.e);
  ctx.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && h.def.power.t === 'startCombat' && !jammed('p', { name: h.def.name, uid: null }))
      applyFx(h.def.power, { name: h.def.name, kw: [] }, B.p, B.e, m => say(m), null, ctx.level);
  });
  startFx([...B.e], B.e, B.p);
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
    const pv = foes.filter(s => s.kw.includes('prov'));
    return pick(pv.length ? pv : foes);
  };
  let cur = B.e.length > B.p.length ? 'e' : 'p';   // tie: the player starts
  let attacks = 0, fatigue = 0, second = null;
  const lastSurv = { p: null, e: null };   // last wounded ally that survived an attack, per side (DE-D0)   // second: Fury servant that attacks a second time
  if (B.p.length && B.e.length) say(cur === 'p' ? 'Le joueur attaque en premier.' : 'Le Boss attaque en premier.');
  while (B.p.length && B.e.length && attacks < 3000) {
    if (attacks >= FATIGUE_START) {
      fatigue++;
      [...B.p, ...B.e].forEach(s => { s.hp -= fatigue; });
      say(`Usure : ${fatigue} dégâts à tous les serviteurs.`);
      deaths();
      if (!B.p.length || !B.e.length) break;
    }
    const A = second || nextAtk(cur), isSecond = !!second;
    second = null;
    let T = target(cur, A);
    // DE-D0: instead of attacking, heals up to its max HP the last ally that survived an attack (if it is still alive and wounded).
    if (skillsOf(A).some(k => k.fx === 'healLastSurvivor')) {
      const t = lastSurv[cur];
      if (t && t.hp > 0 && t.hp < t.maxhp && B[cur].includes(t)) { const h = t.maxhp - t.hp; t.hp = t.maxhp; say(`${A.name} soigne ${h} PV à ${t.name}, au lieu d'attaquer.`, { att: A.uid, tgt: t.uid }); }
      else say(`${A.name} n'a personne à soigner et n'attaque pas.`);
      attacks++; cur = other(cur);
      continue;
    }
    // Bomb: the trapped servant suffers its bomb just before attacking (Shield applies). If it survives, it carries on with its attack; otherwise its turn is lost.
    if (A.bombs && A.bombs.length) {
      const list = A.bombs; A.bombs = []; A.bomb = 0;
      const touched = [A.uid];
      for (const b of list) {
        hit(A, b.n, null);
        let txt = `La bombe de ${A.name} explose : ${b.n} dégâts`;
        if (b.splash) {
          const i = B[cur].indexOf(A);
          [B[cur][i - 1], B[cur][i + 1]].filter(n => n && n.hp > 0).forEach(n => { hit(n, b.n, null); touched.push(n.uid); });
          txt += ' à lui et à ses voisins';
        }
        say(txt + '.', { tgt: A.uid });
      }
      deaths(touched); fillSpace(); deaths();
      if (A.hp <= 0 || !B[cur].includes(A)) { attacks++; cur = other(cur); continue; }
      if (!B.p.length || !B.e.length) continue;
      T = target(cur, A);
    }
    // Pacifying Seal: this servant's first chance to attack is lost (only once).
    if (A.noAtk) {
      A.noAtk = false;
      say(`${A.name} ne peut pas attaquer (Sceau pacificateur).`, { tgt: A.uid });
      attacks++; cur = other(cur);
      continue;
    }
    // When an enemy attacks: each opposing servant with the power deals it X damage or removes X ATK from it (X = its rank) before the exchange; if it dies, it does not attack.
    B[other(cur)].filter(h => h.hp > 0).forEach(h => POWERS.react('enemyAttacks', [h], { attacker: A, allies: B[other(cur)], enemies: B[cur] }, say));
    if (A.hp <= 0) { deaths([A.uid]); fillSpace(); deaths(); attacks++; cur = other(cur); continue; }
    // Swarm Resonance: each time an allied drone attacks, each living carrier gives +X ATK to all allied drones for this combat (before the damage, the attacker benefits).
    POWERS.react('attackStart', B[cur].filter(h => h.hp > 0), { attacker: A, allies: B[cur], enemies: B[other(cur)] }, say);
    // Damage doubled against enemy Pilots, only when the servant attacks (not on retaliation).
    const dA = POWERS.react('attackDamage', [A], { attacker: A, target: T, amount: A.atk }).amount, dT = A.kw.includes('ranged') || T.noRiposte ? 0 : T.atk;
    T.noRiposte = false;   // Synaptic Jammer: consumed by the first attack suffered
    if (cur === 'e' && ctx.dungeon.boss.power === 'frenzy') { A.atk += 1; say(`Écho : ${A.name} gagne +1 ATQ.`); }
    // Assault: triggers when the servant attacks, before the attack's damage.
    skillsOf(A).filter(k => k.t === 'assault').forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    POWERS.react('beforeDamage', [A], { attacker: A, target: T }, say);   // Shield breakers
    const hpA0 = A.hp, hpT0 = T.hp;
    hit(T, dA, A); hit(A, dT, T);          // damage and retaliation are simultaneous
    say(`${A.name} attaque ${T.name} (${dA} dégâts${dT ? `, riposte ${dT}` : ', sans riposte'}).`, { att: A.uid, tgt: T.uid, ranged: A.kw.includes('ranged') });
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
    if (ctx.dungeon.boss.power === 'regen') {
      B.e.forEach(s => { if (s.hp > 0) s.hp = Math.min(s.maxhp, s.hp + 2); });
      say('Régénération : les serviteurs du Boss récupèrent 2 PV.');
    }
    deaths([A.uid, T.uid]); fillSpace(); deaths();
    attacks++;
    // Fury: the servant attacks a second time in a row, if it survived.
    if (!isSecond && A.hp > 0 && A.kw.includes('fury') && B[cur].includes(A) && B[other(cur)].length) { second = A; continue; }
    cur = other(cur);
  }
  const winner = B.p.length && !B.e.length ? 'p' : B.e.length && !B.p.length ? 'e' : 'draw';
  say(winner === 'p' ? 'Combat remporté.' : winner === 'e' ? 'Combat perdu.' : 'Égalité : les deux camps sont vides.');
  return { frames, winner, survivors: { p: B.p, e: B.e }, attacks };
}

// ---------- Game ----------
// Boss types: the 3 fixed types of the dungeon (its own and those of its two other mini-bosses) + 2 randomly drawn types: always 5 types.
function drawBossExtra(dungeon, n = 2) { const fixed = [dungeon.type, ...dungeon.minis]; return [...ALL_TYPES].sort(() => rng() - 0.5).filter(t => !fixed.includes(t)).slice(0, n); }
// The player always draws their cards from the dungeon's type + the types of their two lieutenants.
// bossExtra: the Boss's 2 random types (drawn here if not provided, for example to start over with the same ones).
function newGame(heroIds, dungeonId, bossExtra) {
  const dungeon = DUNGEONS[dungeonId];
  const heroes = heroIds.map(id => ({ def: HEROES[id], hp: HEROES[id].hp, maxhp: HEROES[id].hp }));
  const types = [...new Set([...heroes.flatMap(h => h.def.types), dungeon.type])];
  // Always 5 types: if the lieutenants and the dungeon give fewer, the others are drawn at random at the start of the game.
  while (types.length < 5) types.push(pick(ALL_TYPES.filter(t => !types.includes(t))));
  const extra = bossExtra || drawBossExtra(dungeon), bossTypes = [dungeon.type, ...dungeon.minis, ...extra];
  // Three different behaviors, drawn at random: one per Boss board.
  const behaviors = Object.keys(BOSS_BEHAVIORS).sort(() => rng() - 0.5).slice(0, BOSS_BOARDS.length);
  return {
    heroes, dungeon, types, bossExtra: extra,
    boss: { name: dungeon.boss.name, hp: dungeon.boss.hp, maxhp: dungeon.boss.hp },
    // The Boss draws from the 5 types of its dungeon; each board starts with its mini-boss.
    bossTeams: BOSS_BOARDS.map((b, i) => makeTeam(bossTypes, b.malus, { ...dungeon.dummies[i], bg: dungeon.id }, behaviors[i])),
    bossCur: -1, bossLast: -1, bossLog: [],
    board: [],                    // rule: we start with no servant on the board
    room: 1, level: 1, counter: 0, over: null,
    equipOfferLeft: 0,            // Far-Reach Explorer: number of upcoming reinforcements concerned
    equipOfferSize: 0,            // Far-Reach Explorer: size of the next reinforcement (0 = normal size)
    gainEquip: 0,                 // equipment to receive in hand at the next reinforcement (Relic Hunter's Deathrattle)
    droneBonus: { a: 0, h: 0 },   // Drone Master: permanent bonus of the player's drones
    hand: [], datacrons: 0, cubeBag: [], pr: null, prNum: prWins() + 1, stats: { earned: 0, servants: 0, equips: 0, contrib: 0, fusions: 0, discarded: 0 }
  };
}
const levelCost = lvl => lvl + 2;    // level N -> N+1: N+2 contribution Datacrons (provisional)

// ---------- Boss boards ----------
// Each board is an automatic "player", with its hand, its reinforcement level and its Datacrons.
// It uses the same functions as the player (draw of 3 cards, placement, equipment, fusion).
function makeTeam(types, malus, dummy, behavior = 'equilibre') {
  return { types, malus, behavior, heroes: [], board: dummy ? [mkServant(dummy)] : [], hand: [], level: 1, counter: 0, datacrons: 0,
           stats: { earned: 0, servants: 0, equips: 0, contrib: 0, fusions: 0, discarded: 0 } };
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
      const target = (bhv(t).target || (x => x.board.reduce((b, s) => (powerOf(s) > powerOf(b) ? s : b))))(t);
      applyEquip(target, h.def); t.hand.splice(i, 1);
    }
  }
  if (t.board.length && t.hand.some(h => h.kind === 'equip')) aiPlace(t, say);   // equipment received from a battlecry
}

const bhv = t => BOSS_BEHAVIORS[t.behavior] || BOSS_BEHAVIORS.equilibre;
function aiReinforcement(t, room, say) {
  const b = bhv(t);
  // Room 1: no Datacron, the board stays the Dummy alone (otherwise it would be unbeatable); its reinforcement powers still play.
  const inc = room === 1 ? 0 : Math.max(1, incomeFor(room) - (t.malus >= 1 ? 1 : rng() < t.malus ? 1 : 0));
  t.datacrons += inc; t.stats.earned += inc;
  reinforcementFx(t, 'startReinforcement', say);
  const rf = { reward: null };
  const want = b.want(room);
  let firstBuy = true;   // Stellar Compass: first proposal of the reinforcement
  for (let guard = 0; t.datacrons >= 1 && guard < 40; guard++) {
    const held = t.board.length + t.hand.filter(h => h.kind === 'servant').length;
    let act;
    if (held < want) act = 'servant';
    else if (t.level < MAX_LEVEL && t.level < b.level(room)) act = 'level';
    else act = t.board.length && rng() < b.equipP ? 'equip' : 'servant';
    t.datacrons--;
    if (act === 'level') {
      t.counter++;
      if (t.counter >= levelCost(t.level)) { t.counter -= levelCost(t.level); t.level++; if (t.level >= MAX_LEVEL) t.counter = 0; }
      continue;
    }
    // Same mixed reinforcement as the player; the Boss prefers the targeted card type (servant or equipment) if it is offered.
    const offer = drawOffer(t, t.level, 0, firstBuy && hasFirstOfferUp(t), firstEquipOffChance(t));
    firstBuy = false;
    const pickK = k => { const l = offer.filter(o => o.kind === k).map(o => o.card); return l.length ? { kind: k, card: bestOf(l, k === 'servant' && b.score ? c => b.score(t, c) : cardScore) } : null; };
    const got = pickK(act) || pickK(act === 'servant' ? 'equip' : 'servant'); if (!got) continue;
    const { kind, card } = got;
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

// Mixed reinforcement: `size` cards (normal size of the level by default), servants and equipment drawn together.
// Each card is an equipment with probability EQUIP_CHANCE, except when room must be kept to reach the minimum of MIN_SERVANTS servants.
// Returns [{ kind, card }] in drawing order.
// Never an equipment above the reinforcement level: if there is none at that level, the card becomes a servant.
const equipAvailable = (g, maxRank) => EQUIPS.some(e => !e.token && e.rank <= maxRank && (!e.type || g.types.includes(e.type)));
// Bonuses of the first proposal of the reinforcement, shared by the player and the Boss (g = team: the carrier must be on the board).
const hasFirstOfferUp = g => g.board.some(s => skillsOf(s).some(k => k.fx === 'firstOfferUp'));   // Stellar Compass (does not stack)
const firstEquipOffChance = g => Math.min(1, g.board.reduce((a, s) => a + skillsOf(s).filter(k => k.fx === 'firstEquipOffType').reduce((b, k) => b + k.n, 0), 0) / 100);   // Three-dimensional Probe (stacks)
// up = true (Stellar Compass, first proposal of the reinforcement): one of the offered servants is replaced by a servant of the next rank (never beyond MAX_LEVEL).
// eqChance (Three-dimensional Probe, first equipment of each proposal): probability that the first offered equipment is of a type absent from the team (rank at most maxRank); no effect if none exists.
function drawOffer(g, maxRank, size, up, eqChance) {
  const n = size || reinforcementProposals(maxRank), need = Math.min(MIN_SERVANTS, n), kinds = [];
  for (let i = 0, serv = 0; i < n; i++) {
    const k = serv + (n - i) <= need || !equipAvailable(g, maxRank) || rng() >= EQUIP_CHANCE ? 'servant' : 'equip';
    if (k === 'servant') serv++;
    kinds.push(k);
  }
  const sv = drawCards(g, 'servant', maxRank, false, kinds.filter(k => k === 'servant').length);
  const eq = drawCards(g, 'equip', maxRank, false, kinds.filter(k => k === 'equip').length);
  if (eqChance > 0 && eq.length && rng() < eqChance) {
    const pool = EQUIPS.filter(e => !e.token && e.rank <= maxRank && e.type && !g.types.includes(e.type)), r = 1 + rand(maxRank);
    const c = pool.filter(e => e.rank === r), from = c.length ? c : pool;
    if (from.length) eq[0] = pick(from);
  }
  if (up && maxRank < MAX_LEVEL && sv.length) { const hi = drawCards(g, 'servant', maxRank + 1, true, 1); if (hi.length) sv[rand(sv.length)] = hi[0]; }
  return kinds.map(kind => ({ kind, card: (kind === 'servant' ? sv : eq).shift() })).filter(o => o.card);
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
  say(`${s.name} gagne Renaissance jusqu'au prochain renfort.`);
  return true;
}
// Hal Ana: the discovered servant arrives in the hand (never directly on the board) as soon as PROPHECY_COST Datacrons have been spent.
function checkProphecy(g, say) {
  const p = g.prophecy;
  if (!p || p.done || (g.spent || 0) < PROPHECY_COST) return;
  const s = mkServant(p.card);
  if (handFull(g)) return;   // full hand: it waits for a slot to free up
  g.hand.push({ kind: 'servant', s });
  p.done = true; g.stats.servants++; say(`${s.name} arrive en jeu : ${PROPHECY_COST} Datacrons utilisés.`);
}
function expireTemp(g) {
  g.board.forEach(s => { if (s.tmpReb) { s.kw = s.kw.filter(k => k !== 'rebirth'); delete s.tmpReb; } });
  g.heroes.forEach(h => { h.used = false; });
}
function reinforcementFx(g, trig, say) {
  g.board.slice().forEach(s => {
    skillsOf(s).filter(k => k.t === trig).forEach(k => {
      // Stellar Smith: adds to the hand an equipment of the wanted level whose type is not in the team (hence never offered during the mission).
      // g.forgeFx is read by the interface to play the animation (playForge).
      if (k.fx === 'addUnavailableEquip') {
        if (!g.hand) return;
        const pool = EQUIPS.filter(e => e.rank === k.n && e.type && !g.types.includes(e.type));
        if (!pool.length) return;
        const def = pick(pool);
        if (handFull(g)) say(`Main pleine : ${def.name} est perdu.`);
        else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${s.name} forge ${def.name}, qui rejoint ta main.`); (g.forgeFx = g.forgeFx || []).push({ uid: s.uid, def }); }
        return;
      }
      applyFx(k, s, g.board, [], say);
    });
  });
  g.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'genDroide') {
      // TE-5T: at the wanted room, a randomly drawn Droid servant (all ranks) joins the hand, granted outright.
      if (g.room !== h.def.power.n || !g.hand) return;
      const card = pick(SERVANTS.filter(c => c.types.includes('droid')));
      if (handFull(g)) say(`Main pleine : ${card.name} est perdu.`);
      else { g.hand.push({ kind: 'servant', s: mkServant(card) }); g.stats.servants++; say(`${h.def.name} génère ${card.name} (rang ${card.rank}), qui rejoint ta main.`); }
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'creeUnite') {
      // ZC-D9: a Maintenance Unit joins the hand at each start of reinforcement.
      if (!g.hand) return;
      const def = EQUIPS.find(e => e.id === idOf('equipment', 'Unité de maintenance'));
      if (!def) return;   // no equipment in the catalog
      if (handFull(g)) say(`Main pleine : ${def.name} est perdu.`);
      else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${h.def.name} crée ${def.name}, qui rejoint ta main.`); }
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'forgePatch') {
      // Brokk'Ric: every n reinforcements, an Engineer's Patch (equipment without stat bonus) carrying a power drawn at random
      // among those of the servants whose rank does not exceed the reinforcement level. One draw per power (a servant with several powers counts several times).
      if (g.room % h.def.power.n !== 0 || !g.hand) return;
      const pool = SERVANTS.filter(c => c.rank <= g.level).flatMap(c => [].concat(c.skill || []).map((k, i) => ({ c, k, i }))).filter(x => x.k.fx !== 'prBoost');
      if (!pool.length) return;
      const { c, k, i } = pick(pool);
      const def = { id: `patch-${c.id}-${i}`, name: `Patch ${c.name}`, rank: g.level, atk: 0, hp: 0, kw: null, type: 'engineer', skill: { ...k }, mod: null, token: true, patch: true };
      if (handFull(g)) say(`Main pleine : ${def.name} est perdu.`);
      else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${h.def.name} crée un ${def.name}, qui rejoint ta main.`); }
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'forgeRoboticien') {
      // Reyes: every n reinforcements (rooms n, 2n, 3n…), a Roboticist equipment drawn at random, all ranks (equiprobable), joins the hand.
      if (g.room % h.def.power.n !== 0 || !g.hand) return;
      const def = pick(EQUIPS.filter(e => !e.token && e.type === 'roboticist'));
      if (!def) return;   // no Roboticist equipment in the catalog
      if (handFull(g)) say(`Main pleine : ${def.name} est perdu.`);
      else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${h.def.name} fabrique ${def.name}, qui rejoint ta main.`); }
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'datacube') {
      const r = drawCube(g); g.cubeRoll = r; g.cubeBefore = g.datacrons;   // read by the interface to play the animation (playCube)
      g.datacrons = Math.max(0, g.datacrons + r); if (r > 0) g.stats.earned += r;
      say(`${h.def.name} lance un datacube : ${r > 0 ? '+' : ''}${r} Datacron${Math.abs(r) > 1 ? 's' : ''}.`);
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
  if (replaceIdx != null) { say(`${g.board[replaceIdx].name} est remplacé (ses équipements sont perdus).`); g.board.splice(replaceIdx, 1, s); }
  else g.board.push(s);
  say(`${s.name} rejoint le plateau.`);
  triggerBattlecry(g, s, say);
}
// A servant's battlecry: on its placement, or triggered again by an active power (Waven). Returns false if it has none.
const battlecriesOf = s => skillsOf(s).filter(k => k.t === 'battlecry');
function triggerBattlecry(g, s, say) {
  const cries = battlecriesOf(s);
  cries.forEach(k => {
    applyFx(k, s, g.board, [], say); flushPr(g, say);
    if (k.fx === 'gainDossier') {
      const def = EQUIPS.find(e => e.id === idOf('equipment', 'Dossier consulaire'));
      if (!def) return;   // no equipment in the catalog
      if (!handFull(g)) { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${def.name} rejoint la main.`); }
      else say(`Main pleine : ${def.name} est perdu.`);
    }
    if (k.fx === 'droneBoostGame' && g.droneBonus) {   // Swarm Operator: permanent bonus of the player's drones (like the Drone Master), also applied to drones already present
      g.droneBonus.a += k.a; g.droneBonus.h += k.h;
      g.board.filter(x => x.name === 'Drone').forEach(x => { x.atk += k.a; x.hp += k.h; x.maxhp += k.h; });
      say(`${s.name} : vos drones auront +${k.a}/+${k.h} jusqu'à la fin de la partie (bonus total +${g.droneBonus.a}/+${g.droneBonus.h}).`);
    }
    if (k.fx === 'buffChosenAlly') {   // Assault Soldier: +k.a permanent ATK to a chosen ally (choice opened by flushDiscover); the Boss designates one at random
      const cible = g.board.filter(x => x !== s && x.hp > 0);
      if (!cible.length) say(`${s.name} : aucun allié à renforcer.`);
      else if (g.bossTeams) (g.discoverQueue = g.discoverQueue || []).push({ kind: 'ally', a: k.a, from: s.name, cards: cible });
      else { const c = pick(cible); c.atk += k.a; say(`${s.name} donne +${k.a} ATQ à ${c.name}.`); }
    }
    if (k.fx === 'discoverEquip' && g.bossTeams) {   // Liaison Attaché: choice among PROPOSALS rank 1 equipment of a type absent from the team (queue read by flushDiscover; the Boss discovers nothing)
      // k.n = level of the discovered equipment (1; 2 for the gold version, through the usual doubling of values)
      const pool = EQUIPS.filter(e => !e.token && e.rank === k.n && e.type && !g.types.includes(e.type)), cards = [];
      while (cards.length < PROPOSALS && pool.length) cards.push(pool.splice(rand(pool.length), 1)[0]);
      if (cards.length) (g.discoverQueue = g.discoverQueue || []).push({ kind: 'equip', rank: k.n, cards });
    }
    if (k.fx === 'gainUnavailableEquip') {   // Emissary: k.n rank 3 or 4 equipment whose type is not in the team (never offered during the game)
      for (let i = 0; i < k.n; i++) {
        const def = pick(EQUIPS.filter(e => !e.token && e.rank >= 3 && e.rank <= 4 && e.type && !g.types.includes(e.type)));
        if (!def) break;
        if (!handFull(g)) { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${def.name} rejoint la main.`); }
        else say(`Main pleine : ${def.name} est perdu.`);
      }
    }
    if (k.fx === 'gainAnyEquip') {   // Master of Accords: k.n rank 5 or 6 equipment, all types included (even those absent from the mission)
      for (let i = 0; i < k.n; i++) {
        const def = pick(EQUIPS.filter(e => !e.token && e.rank >= 5 && e.rank <= 6));
        if (!def) break;
        if (!handFull(g)) { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${def.name} rejoint la main.`); }
        else say(`Main pleine : ${def.name} est perdu.`);
      }
    }
    if (k.fx === 'gainEquip') {
      const def = randomEquip(g);
      if (def && !handFull(g)) { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${def.name} rejoint la main.`); }
      else if (def) say(`Main pleine : ${def.name} est perdu.`);
    }
  });
  return cries.length > 0;
}
// Pending discoveries (Liaison Attaché): the next one becomes the current choice (rf.reward) as soon as no other choice is open.
function flushDiscover(g, rf) { if (rf && !rf.reward && g.discoverQueue && g.discoverQueue.length) rf.reward = g.discoverQueue.shift(); }
// Non-gold servants (board then hand) bearing this name: used by Sulseye to spot a pair.
const copiesOf = (g, name) => [...g.board, ...g.hand.filter(h => h.kind === 'servant').map(h => h.s)].filter(x => x.name === name && !x.gold && !x.fixed && !isPr(x));
// Active powers of the lieutenants: button label, possible targets, effect. Used by the interface.
// By default a power is free and usable once per reinforcement. repeat: no limit per reinforcement; cost(h): price in Datacrons.
const ACTIVES = {
  grantRebirth: { label: 'Renaissance', icon: 'medic', color: '#a8d94a', ok: (g, s) => !isPr(s) && !s.kw.includes('rebirth'),
                  run: (g, uid, say) => grantRebirth(g, uid, say) },
  // Sulseye: on a servant of which exactly two copies are owned, creates the third, which fuses at once (the copy takes no room in hand).
  completeFusion: { label: 'Fusion', icon: 'diplomat', color: '#4f8cff', repeat: true, cost: h => FUSION_COST + FUSION_STEP * (h.fusions || 0),
                  ok: (g, s) => copiesOf(g, s.name).length === 2,
                  run: (g, uid, say, h, rf) => {
                    const s = [...g.board, ...g.hand.filter(x => x.kind === 'servant').map(x => x.s)].find(x => x.uid === uid);
                    const def = s && SERVANTS.find(d => d.name === s.name);
                    if (!def || copiesOf(g, s.name).length !== 2) return false;
                    const copy = mkServant(def);
                    g.hand.push({ kind: 'servant', s: copy });
                    say(`${h.def.name} crée un exemplaire de ${s.name}.`);
                    if (!resolveFusion(g, rf, say)) { g.hand = g.hand.filter(x => x.s !== copy); return false; }
                    h.fusions = (h.fusions || 0) + 1;
                    return true;
                  } },
  triggerBattlecry: { label: 'Cri de guerre', icon: 'diplomat', color: '#4f8cff', ok: (g, s) => battlecriesOf(s).length > 0,
                  run: (g, uid, say) => { const s = g.board.find(x => x.uid === uid); if (!s || !battlecriesOf(s).length) return false; say(`${s.name} rejoue son cri de guerre.`); return triggerBattlecry(g, s, say); } }
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
  const sum = k => trio.reduce((a, x) => a + x[k], 0);
  const k = trio[0].skill;
  const gold = {
    uid: uid(), id: trio[0].id, name: `${name} doré`, rank: trio[0].rank, atk: sum('atk'), hp: sum('hp'), maxhp: sum('maxhp'),
    types: [...trio[0].types], kw: [...new Set(trio.flatMap(x => x.kw.filter(k => !(k === 'rebirth' && x.tmpReb))))], gold: true,
    skill: k ? goldSkill(k) : null, extra: (trio[0].extra || []).map(goldSkill), equips: trio.flatMap(x => x.equips),
    eqSkills: trio.flatMap(x => x.eqSkills || []), lrSkills: trio.flatMap(x => x.lrSkills || []), droneA: trio.reduce((a, x) => a + (x.droneA || 0), 0), droneH: trio.reduce((a, x) => a + (x.droneH || 0), 0)
  };
  const ids = new Set(trio.map(x => x.uid));
  const bi = g.board.findIndex(x => ids.has(x.uid));
  if (bi >= 0) g.board[bi] = gold;
  else g.hand[g.hand.findIndex(h => h.kind === 'servant' && ids.has(h.s.uid))] = { kind: 'servant', s: gold };
  g.board = g.board.filter(x => x === gold || !ids.has(x.uid));
  g.hand = g.hand.filter(h => h.kind !== 'servant' || h.s === gold || !ids.has(h.s.uid));
  g.stats.fusions++;
  const r = Math.min(MAX_RANK, g.level + 1);
  rf.reward = { rank: r, cards: drawCards(g, 'servant', r, true) };
  say(`Fusion : trois ${name} deviennent ${gold.name} ! Choisis une récompense de rang ${r}.`);
  return true;
}

// ---------- Adaptation (signature power of the Elk) ----------
// End of combat: each surviving Elk chooses between two options: a +N HP or +N ATK bonus drawn at random (N = reinforcement level),
// or a power (keyword or skill) drawn at random among those of the other survivors. A learned ability is permanent for the mission.
const isAdapt = k => k.fx === 'adapt' || k.fx === 'adaptExtra';   // adaptExtra (Naturalist): one additional Adaptation per combat, not learnable
const capKey = c => c.stat ? `stat:${c.stat}:${c.hpStat ? 'hp' : 'atk'}` : c.kw ? `kw:${c.kw}` : `sk:${c.skill.t}:${c.skill.fx}:${c.skill.a}:${c.skill.h}:${c.skill.n}`;
const capOwned = (s, c) => c.stat ? false : c.kw ? s.kw.includes(c.kw) : skillsOf(s).some(k => capKey({ skill: k }) === capKey(c));
const capLabel = c => c.stat ? `+${c.stat} ${c.hpStat ? 'PV' : 'ATQ'} (niveau de renfort ${c.stat})` : c.kw ? KW[c.kw] : skDesc(c.skill);
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
  if (cap.stat) { const b = `${s.atk}/${s.hp}`; if (cap.hpStat) { s.hp += cap.stat; s.maxhp += cap.stat; } else s.atk += cap.stat; return `${s.name} s'adapte : ${capLabel(cap)} [${b} → ${s.atk}/${s.hp}].`; }
  if (cap.kw) s.kw.push(cap.kw); else s.lrSkills.push({ ...cap.skill });
  return `${s.name} apprend « ${capLabel(cap)} » (de ${cap.from}).`;
}

// End-of-combat effects of the player's survivors (Drone Master: permanent drone bonus). Returns the log lines.
function endCombatFx(g, res) {
  const lines = [];
  syncPr(g, res, m => lines.push(m));
  res.survivors.p.forEach(el => {
    const mine = g.board.find(s => s.uid === el.uid);
    if (!mine) return;
    if (el.perm) { const b = `${mine.atk}/${mine.hp}`; mine.atk += el.perm; lines.push(`${mine.name} conserve définitivement +${el.perm} ATQ [${b} → ${mine.atk}/${mine.hp}].`); }
    if (el.permHp) { const b = `${mine.atk}/${mine.hp}`; mine.hp += el.permHp; mine.maxhp += el.permHp; lines.push(`${mine.name} conserve définitivement +${el.permHp} PV [${b} → ${mine.atk}/${mine.hp}].`); }
    // Stellar Chronoscope: if the carrier survives, all survivors, itself included, permanently gain +a/+h (those fallen in combat receive nothing).
    skillsOf(mine).filter(k => k.t === 'endCombat' && k.fx === 'permAlliesStats').forEach(k => {
      const ids = new Set(res.survivors.p.map(x => x.uid)), c = g.board.filter(s => ids.has(s.uid));
      c.forEach(s => { s.atk += k.a; s.hp += k.h; s.maxhp += k.h; });
      if (c.length) lines.push(`${mine.name} : ${c.map(s => s.name).join(', ')} gagne${c.length > 1 ? 'nt' : ''} définitivement +${k.a}/+${k.h}.`);
    });
    // Far-Reach Explorer: the player's next equipment purchase offers X cards (consumed by the interface).
    skillsOf(mine).filter(k => k.t === 'endCombat' && k.fx === 'bigEquipOffer').forEach(k => {
      g.equipOfferSize = Math.max(g.equipOfferSize || 0, k.n); g.equipOfferLeft = Math.max(g.equipOfferLeft || 0, k.times || 1);
      lines.push(`${mine.name} : ${g.equipOfferLeft > 1 ? `vos ${g.equipOfferLeft} prochains renforts` : 'votre prochain renfort'} proposera${g.equipOfferLeft > 1 ? 'ont' : ''} ${g.equipOfferSize} cartes.`);
    });
    // Ruin Looter: equips itself with an equipment of the wanted level whose type is not in the team (hence never offered during the game).
    skillsOf(mine).filter(k => k.t === 'endCombat' && k.fx === 'equipUnavailable').forEach(k => {
      const pool = EQUIPS.filter(e => e.rank === k.n && e.type && !g.types.includes(e.type));
      if (!pool.length) return;
      const eq = pick(pool); applyEquip(mine, eq); lines.push(`${mine.name} s'équipe de ${eq.name}.`);
    });
    skillsOf(mine).filter(k => k.t === 'endCombat' && k.fx === 'droneBonus').forEach(k => {
      g.droneBonus.a += k.a; g.droneBonus.h += k.h;
      lines.push(`${mine.name} : vos drones seront invoqués avec +${g.droneBonus.a}/+${g.droneBonus.h} jusqu'à la fin de la mission.`);
    });
  });
  flushPr(g, m => lines.push(m));
  return lines;
}

// Rule: end of combat, the survivors of the winning side deal their rank.
function settleCombat(g, res) {
  const lines = [], hits = res.hits = [];   // hits: one hit per survivor (for the end-of-combat animation)
  if (res.winner === 'p') {
    res.survivors.p.forEach(s => hits.push({ uid: s.uid, side: 'p', to: 'boss', dmg: s.rank }));
    const dmg = res.survivors.p.reduce((a, s) => a + s.rank, 0);
    g.boss.hp = Math.max(0, g.boss.hp - dmg);
    lines.push(`Vos survivants (${res.survivors.p.map(s => `${s.name} R${s.rank}`).join(', ')}) infligent ${dmg} dégâts au Boss.`);
    if (g.boss.hp <= 0) { g.over = 'win'; prRecordWin(); lines.push('Le Boss est vaincu !'); }
  } else if (res.winner === 'e') {
    let shield = g.heroes.map(h => h.hp > 0 && h.def.kw === 'shield');
    for (const s of res.survivors.e) {
      const live = g.heroes.map((h, i) => i).filter(i => g.heroes[i].hp > 0);
      if (!live.length) break;
      const prov = live.filter(i => g.heroes[i].def.kw === 'prov');
      const i = prov.length === 1 ? prov[0] : pick(live);
      const h = g.heroes[i];
      if (shield[i]) { shield[i] = false; hits.push({ uid: s.uid, side: 'e', to: i, dmg: 0, blocked: true }); lines.push(`${s.name} frappe ${h.def.name} (${s.rank}) : annulé par le Bouclier.`); continue; }
      h.hp = Math.max(0, h.hp - s.rank);
      hits.push({ uid: s.uid, side: 'e', to: i, dmg: s.rank });
      lines.push(`${s.name} frappe ${h.def.name} : ${s.rank} dégâts${h.hp <= 0 ? ' — il tombe !' : ''}.`);
    }
    if (g.heroes.every(h => h.hp <= 0)) { g.over = 'lose'; lines.push('Les deux héros sont à terre.'); }
  } else lines.push('Égalité : aucun dégât.');
  g.room++;
  return lines;
}
