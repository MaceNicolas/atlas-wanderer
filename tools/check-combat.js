// Combat oracle: the same random boards (servants of the catalog, random equipment, random lieutenants and Boss power) are fought by the OLD engine
// (tests/legacy/engine-before-bricks.js, with the old hand-written data) and by the CURRENT engine, and the combat logs must be identical:
// every message, the winner, the number of attacks, the survivors and the random numbers consumed.
// Unlike the game fingerprint it reaches the rare rules (a rule played once in thousands of games is played here on purpose).
// The legacy files are temporary: they are deleted when the migration is done.
// Usage: node tools/check-combat.js [boards=2000]
'use strict';
process.env.AW_ORDER = 'legacy';   // the old engine only knows the old order: the current engine is compared with it using the legacy profile
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const boards = +process.argv.slice(2).find(a => /^\d+$/.test(a)) || 2000;
const exportList = '\n;({ runCombat, mkServant, applyEquip, setSeed, rng, SERVANTS, EQUIPS, HEROES, DUNGEONS, MAX_BOARD, grantPr, skillsOf })';
const legacy = vm.runInNewContext(read('tests', 'legacy', 'data-before-json.js') + '\n' + read('tests', 'legacy', 'engine-before-bricks.js') + exportList, { Math, console });
const current = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() + exportList, { Math, console });

const gen = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ids = { servants: current.SERVANTS.map(s => s.id), equipment: current.EQUIPS.map(e => e.id), heroes: Object.keys(current.HEROES), bosses: ['regen', 'surge', 'frenzy', 'plate'] };

// Powers no card of the catalog carries today but that the engine still knows: injected at random so that their code is compared too.
const DORMANT = [{ t: 'allyDeath', fx: 'resurrect', a: 0, h: 0, n: 1 }, { t: 'allyDeath', fx: 'resurrect', a: 0, h: 0, n: 2 }, { t: 'deathrattle', fx: 'replayRattles', a: 0, h: 0, n: 0 },
  { t: 'startCombat', fx: 'buffEnds', a: 1, h: 2, n: 0 }, { t: 'startCombat', fx: 'buffLeftmost', a: 2, h: 1, n: 0 }, { t: 'startCombat', fx: 'stripProv', a: 0, h: 0, n: 0 },
  { t: 'startCombat', fx: 'swapHpExtremes', a: 0, h: 0, n: 0 }, { t: 'startCombat', fx: 'buffPerType', a: 1, h: 1, n: 0 }, { t: 'startCombat', fx: 'buffPerEquip', a: 1, h: 1, n: 0 },
  { t: 'passive', fx: 'extractRoutines', a: 0, h: 0, n: 0 }, { t: 'passive', fx: 'lazarus', a: 0, h: 0, n: 0 }, { t: 'startCombat', fx: 'cyberPatch', a: 0, h: 0, n: 0 },
  { t: 'deathrattle', fx: 'dmgOwnAtk', a: 0, h: 0, n: 0 }, { t: 'deathrattle', fx: 'summon', a: 2, h: 2, n: 0 }, { t: 'startCombat', fx: 'plantBombs', a: 2, h: 0, n: 4 }];
// A board is described by plain data (ids and numbers), then built in each engine with its own functions.
function describe(r) {
  const int = n => Math.floor(r() * n), pick = l => l[int(l.length)];
  const side = () => {
    const cards = Array.from({ length: 1 + int(7) }, () => ({ card: pick(ids.servants), gold: r() < 0.1, equips: Array.from({ length: r() < 0.5 ? 0 : 1 + int(2) }, () => pick(ids.equipment)), hpBoost: int(3) === 0 ? int(6) : 0,
      dormant: r() < 0.3 ? [int(DORMANT.length)] : [] }));
    if (r() < 0.25 && cards.length < 7) cards.splice(int(cards.length + 1), 0, { drone: true, dormant: r() < 0.6 ? [int(DORMANT.length)] : [] });   // an armed drone already on the board
    return cards;
  };
  return { p: side(), e: side(), heroes: [pick(ids.heroes), pick(ids.heroes)], level: 1 + int(6), room: 1 + int(12), boss: pick(ids.bosses), droneBonus: r() < 0.3 ? { a: 1 + int(2), h: 1 + int(2) } : { a: 0, h: 0 }, seed: 1 + int(1e6) };
}
function build(engine, d) {
  const one = x => {
    const def = x.drone ? { name: 'Drone', rank: 1, atk: 2, hp: 3, types: [], kw: [], skill: null } : engine.SERVANTS.find(s => s.id === x.card), s = engine.mkServant(def);
    x.dormant.forEach(i => s.lrSkills.push({ ...DORMANT[i] }));
    (x.equips || []).forEach(id => engine.applyEquip(s, engine.EQUIPS.find(e => e.id === id)));
    s.hp += x.hpBoost || 0; s.maxhp += x.hpBoost || 0;
    return s;
  };
  const dungeon = Object.values(engine.DUNGEONS)[0];
  const ctx = { heroes: d.heroes.map(id => ({ def: engine.HEROES[id], hp: engine.HEROES[id].hp, maxhp: engine.HEROES[id].hp })), level: d.level, room: d.room,
    dungeon: { ...dungeon, boss: { ...dungeon.boss, power: d.boss } }, droneBonus: { ...d.droneBonus }, gainEquip: 0 };
  return { p: d.p.map(one), e: d.e.map(one), ctx };
}
function fight(engine, d) {
  const b = build(engine, d);
  engine.setSeed(d.seed);
  const res = engine.runCombat(b.p, b.e, b.ctx);
  const card = s => [s.name, s.atk, s.hp, s.maxhp, s.kw.join(','), s.shield ? 1 : 0, s.perm || 0, s.permHp || 0];
  return JSON.stringify({ messages: res.frames.map(f => f.msg), winner: res.winner, attacks: res.attacks, survivors: { p: res.survivors.p.map(card), e: res.survivors.e.map(card) }, gainEquip: b.ctx.gainEquip, next: engine.rng() });
}

let bad = 0, first = null;
const seen = {}, PATTERNS = { 'cheatDeath': 'est ranimé', 'lazarus': 'détruit un drone et ressuscite', 'resurrect': ' ressuscite ', 'rebirth': 'renaît avec', 'extractRoutines': 'récupère les pouvoirs', 'scavenge': 'récupère .+ de ', 'summon': 'invoque un drone', 'extract': 'récupère les pouvoirs', 'resurrectFx': 'ressuscite ', 'jam': 'empêche l.effet de début', 'replay': 'rejoue l.effet', 'coverFire': 'en couverture', 'overflow': 'déborde sur', 'preemptShot': 'tire à distance sur .+ qui attaque', 'bomb': 'La bombe de' };
for (let i = 1; i <= boards; i++) {
  const d = describe(gen(i * 977));
  const a = fight(legacy, d), b = fight(current, d);
  for (const [name, p] of Object.entries(PATTERNS)) if (new RegExp(p).test(a)) seen[name] = (seen[name] || 0) + 1;
  if (a !== b) { bad++; if (!first) first = { a: JSON.parse(a), b: JSON.parse(b), d }; }
}
if (first) {
  const A = first.a.messages, B = first.b.messages;
  let i = 0; while (i < A.length && A[i] === B[i]) i++;
  console.log(`✗ ${bad}/${boards} combats differ. First one, message ${i}:\n  legacy: ${A[i]}\n  current: ${B[i]}`);
  if (first.a.next !== first.b.next) console.log('  (random numbers consumed differ)');
  process.exit(1);
}
if (process.argv.includes('--stats')) console.log('combats where each rule played:', JSON.stringify(seen));
console.log(`✓ ${boards} random combats identical between the legacy engine and the current engine (log, winner, survivors, random numbers).`);
