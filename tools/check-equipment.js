// Equipment battery: everything the 54 equipment of the mod can break, one by one then together.
// 1. data: the grid (assignments x levels) is complete, no duplicate, valid color / type / statistics, names and descriptions in fr + en, powers validate.
// 2. equip / unequip: the exact state of the servant comes back (stats, keywords, powers, summons, heal), whatever the equipment and the socket.
// 3. combat: each equipment carried at each position (alone, then by the foes), against several boards and seeds: it ends, no NaN, no negative value, same seed = same result.
// 4. random stacks: 3 equipment (same or different) on one servant, then removal: nothing left behind.
// 5. games: whole games where equipment are handed out and fused at every step (via tools/simulate.js).
// 6. balance (warnings only): statistics per level for each assignment.
// Usage: node tools/check-equipment.js [seeds=6]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const SEEDS = +process.argv[2] || 6;
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ SERVANTS, EQUIPS, DUNGEONS, HEROES, I18N, POWERS, RULES, mkServant, applyEquip, removeEquips, canEquip, socketIndex, runCombat, skDesc, setSeed, ALL_TYPES, GAME, HEROES })', { Math, console });
const problems = [], warnings = [];
const bad = m => { if (problems.length < 60) problems.push(m); else if (problems.length === 60) problems.push('… (more)'); };
const check = (c, m) => { if (!c) bad(m); };
const gamePowers = new Set((read('data', 'mods', require('./mod').id(), 'game.json').match(/"power": "[A-Za-z0-9]+"/g) || []).map(x => x.split('"')[3]));   // passive powers read by the engine options (game.json)
const equips = g.EQUIPS.filter(e => !e.token);
const catalog = JSON.parse(read('tests', 'catalog.json'));
const ASSIGN = catalog.assignments, COLORS = g.RULES.sockets.colors, LEVELS = [1, 2, 3, 4, 5, 6];

// ---------- 1. data ----------
const grid = {};
equips.forEach(e => {
  check(ASSIGN.includes(e.type), `${e.name}: unknown assignment "${e.type}"`);
  check(LEVELS.includes(e.rank), `${e.name}: level ${e.rank} out of 1-6`);
  check(COLORS.includes(e.color), `${e.name}: invalid color ${e.color}`);
  check(Number.isInteger(e.atk) && Number.isInteger(e.hp) && e.atk >= 0 && e.hp >= 0, `${e.name}: statistics ${e.atk}/${e.hp} must be non-negative integers`);
  check(e.atk + e.hp > 0 || e.skill || e.kw || e.mod, `${e.name}: an equipment with no statistic, keyword, power or modifier does nothing`);
  const key = `${e.type}:${e.rank}`; (grid[key] = grid[key] || []).push(e);
  [].concat(e.skill || []).forEach(k => {
    check(k && k.fx && (g.POWERS.all()[k.fx] || gamePowers.has(k.fx)), `${e.name}: power "${k && k.fx}" is neither a template nor an engine option of game.json`);
    if (k && k.fx && g.POWERS.all()[k.fx]) g.POWERS.validate(g.POWERS.all()[k.fx]).forEach(p => bad(`${e.name}: power ${k.fx} invalid: ${p}`));
  });
});
ASSIGN.forEach(a => LEVELS.forEach(l => {
  const n = (grid[`${a}:${l}`] || []).length;
  check(n === 1, `${a} level ${l}: ${n} equipment (expected exactly 1)`);
}));
// A power written as a direct effect ("then") only runs at the moment of its trigger: a trigger of game.json with no moment and no event never plays it (silent dead card).
{ const T = g.GAME.def().triggers, P = g.POWERS.all(), seen = new Set();
  [...g.SERVANTS, ...equips, ...Object.values(g.HEROES)].forEach(c => [].concat(c.skill || [], c.extra || []).forEach(k => {
    const t = P[k.fx], tr = T[k.t]; if (!t) return;
    check(!!tr, `${c.name}: unknown trigger "${k.t}"`);
    if (tr && t.then && !t.reactions && !t.aura && !tr.moment && !tr.on && !seen.has(c.name + k.t + k.fx)) { seen.add(c.name + k.t + k.fx); bad(`${c.name}: "${k.fx}" (direct effect) on trigger "${k.t}" which has no moment: this power NEVER plays`); }
  })); }
const names = equips.map(e => e.name); check(new Set(names).size === names.length, 'two equipment share a name: ' + names.filter((n, i) => names.indexOf(n) !== i).join(', '));
const ids = equips.map(e => e.id); check(new Set(ids).size === ids.length, 'duplicate equipment ids');
check(equips.length === ASSIGN.length * LEVELS.length, `expected ${ASSIGN.length * LEVELS.length} equipment, found ${equips.length}`);

// ---------- 1b. texts, both languages (async) ----------
async function texts() {
  for (const lang of ['fr', 'en']) {
    await g.I18N.load(lang);
    equips.forEach(e => {
      check(typeof e.name === 'string' && e.name.length > 0 && !/undefined|^equip\./.test(e.name), `${lang}: equipment ${e.id} has no name`);
      [].concat(e.skill || []).forEach(k => {
        let d; try { d = g.skDesc(k, true, null); } catch (x) { bad(`${lang}: ${e.name} description throws ${x.message}`); return; }
        check(typeof d === 'string' && d.trim().length > 3, `${lang}: ${e.name} has an empty description`);
        check(!/undefined|NaN|\[object|\{[a-zA-Z]+\}|^desc\.|^power\./.test(d), `${lang}: ${e.name} description has a leak: "${d}"`);
        if (lang === 'en') check(!/[àâçéèêëîïôûùœ]/i.test(d) || /Ryskan|Sorvane/.test(d), `en: ${e.name} description looks French: "${d}"`);
      });
    });
  }
  await g.I18N.load('fr');
}

// ---------- helpers ----------
const base = g.SERVANTS.find(s => !s.token);
const mk = (o = {}) => g.mkServant({ ...base, name: 'Tester', atk: 4, hp: 10, kw: [], skill: null, types: [], sockets: ['blue', 'green', 'red'], ...o });
const snap = s => JSON.stringify({ atk: s.atk, hp: s.hp, maxhp: s.maxhp, kw: [...s.kw].sort(), equips: s.equips, eqSkills: s.eqSkills, eqKw: s.eqKw || [], summonA: s.summonA || 0, summonH: s.summonH || 0, heal: s.healBonus || 0, slots: (s.slots || []).map(x => !!x) });
const pool = g.SERVANTS.filter(s => !s.token);
const dungeon = Object.values(g.DUNGEONS)[0];
const finite = c => Number.isFinite(c.atk) && Number.isFinite(c.hp) && c.atk >= 0;

// ---------- 2. equip / unequip round trip ----------
equips.forEach(e => {
  for (const kw of [[], ['ranged'], ['taunt']]) {
    const s = mk({ kw }), before = snap(s);
    if (!check(g.canEquip(s, e), `${e.name}: refused by a servant with 3 sockets`) && !g.canEquip(s, e)) continue;
    check(g.applyEquip(s, e) === true, `${e.name}: applyEquip failed`);
    check(s.atk === 4 + e.atk && s.hp === 10 + e.hp && s.maxhp === 10 + e.hp, `${e.name}: statistics after equip ${s.atk}/${s.hp} (max ${s.maxhp})`);
    check(s.slots.filter(Boolean).length === 1 && s.equips.includes(e.name), `${e.name}: not recorded on the servant`);
    const back = g.removeEquips(s);
    check(back.length === 1 && back[0] === e, `${e.name}: removeEquips did not give it back`);
    check(snap(s) === before, `${e.name}: state not restored (keyword start ${JSON.stringify(kw)})\n   before ${before}\n   after  ${snap(s)}`);
  }
  // exact color first: a servant with only the right color, one with only a wildcard, one with only wrong colors
  check(g.canEquip(mk({ sockets: [e.color] }), e), `${e.name}: refused by its own color`);
  check(g.canEquip(mk({ sockets: [g.RULES.sockets.wildcard] }), e), `${e.name}: refused by a chromatic socket`);
  check(!g.canEquip(mk({ sockets: COLORS.filter(c => c !== e.color) }), e), `${e.name}: accepted by two wrong colors`);
  check(!g.canEquip(mk({ sockets: [] }), e), `${e.name}: accepted without socket`);
  // a wounded servant: removal never kills (hp stays >= 1)
  const w = mk({ hp: 3 }); g.applyEquip(w, e); g.removeEquips(w); check(w.hp >= 1, `${e.name}: removal leaves a dead servant`);
});

// ---------- 3. combat ----------
const ctxOf = () => ({ heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, summonBonus: {}, owedEquipment: 0 });
const pick = (r, n) => Array.from({ length: n }, () => pool[Math.floor(r() * pool.length)]);
const lcg = seed => { let x = seed >>> 0 || 1; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; };
let combats = 0, maxFrames = 0;
const fight = (mine, theirs, seed, what) => {
  g.setSeed(seed);
  let res; try { res = g.runCombat(mine, theirs, ctxOf()); } catch (x) { bad(`${what}: combat throws ${x.message.split('\n')[0]}`); return null; }
  combats++; maxFrames = Math.max(maxFrames, res.frames.length);
  check(res.frames.length < 5000, `${what}: combat does not seem to end (${res.frames.length} frames)`);
  check(res.frames.every(f => !/undefined|NaN|\[object/.test(f.msg || '')), `${what}: a log line says undefined/NaN: ${(res.frames.find(f => /undefined|NaN|\[object/.test(f.msg || '')) || {}).msg}`);
  return res;
};
equips.forEach(e => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = lcg(seed * 977 + e.rank * 31);
    for (const pos of [0, 1, 2]) {
      const mineDefs = pick(r, 3), theirDefs = pick(r, 3 + (seed % 2));
      const buildMine = () => mineDefs.map((d, i) => { const s = g.mkServant(d); if (i === pos) { s.sockets = ['blue', 'green', 'red']; s.slots = [null, null, null]; g.applyEquip(s, e); } return s; });
      const buildFoes = () => theirDefs.map(d => g.mkServant(d));
      const what = `${e.name} @${pos} seed ${seed}`;
      const a = fight(buildMine(), buildFoes(), seed, what), b = fight(buildMine(), buildFoes(), seed, what + ' (replay)');
      if (a && b) {
        check(JSON.stringify(a.frames.map(f => f.msg)) === JSON.stringify(b.frames.map(f => f.msg)), `${what}: same seed, different combat (non-deterministic equipment)`);
        check(a.frames.length === b.frames.length, `${what}: frame count differs on replay`);
      }
      // carried by the foes (a Boss board can carry equipment): forced, no socket needed
      const foes = buildFoes(); g.applyEquip(foes[Math.min(pos, foes.length - 1)], e, true);
      fight(buildMine(), foes, seed, what + ' (on the foe)');
      // the carrier alone against a wall, and against nothing
      const lone = g.mkServant(pool[0]); lone.sockets = ['blue']; lone.slots = [null]; g.applyEquip(lone, e);
      fight([lone], [g.mkServant({ ...pool[1], atk: 1, hp: 60 })], seed, what + ' (alone vs wall)');
      fight([lone], [], seed, what + ' (no foe)');
      fight([], [g.mkServant(pool[1])], seed, what + ' (no ally)');
    }
  }
});

// ---------- 3b. does the power do something? (mutation: same equipment without its power must change the combat somewhere) ----------
const dead = [];
equips.filter(e => e.skill && ![].concat(e.skill).every(k => gamePowers.has(k.fx) || ['endCombat', 'endReinforcement', 'startReinforcement'].includes(k.t)))   // (those moments: see check-equipment-flow.js)
  .forEach(e => {
  let differs = false;
  for (let seed = 1; seed <= 12 && !differs; seed++) {
    const r = lcg(seed * 7919 + e.rank);
    const mineDefs = pick(r, 3), theirDefs = pick(r, 4);
    const run = eq => { const mine = mineDefs.map((d, i) => { const s = g.mkServant(d); if (i === seed % 3) { s.sockets = ['blue']; s.slots = [null]; g.applyEquip(s, eq); } return s; });
      g.setSeed(seed); return JSON.stringify(g.runCombat(mine, theirDefs.map(d => g.mkServant(d)), ctxOf()).frames.map(f => f.msg)); };
    if (run(e) !== run({ ...e, skill: null })) differs = true;
  }
  if (!differs) dead.push(e);
});
dead.forEach(e => warnings.push(`${e.name} (${e.type} level ${e.rank}): its power (${[].concat(e.skill).map(k => k.fx)}) changed no combat in 12 trials: needs a condition my random boards lack (type, poison, summon)?`));

// ---------- 4. random stacks ----------
const r4 = lcg(424242);
for (let i = 0; i < 1500; i++) {
  const k = 1 + Math.floor(r4() * 3), set = Array.from({ length: k }, () => equips[Math.floor(r4() * equips.length)]);
  const s = mk({ sockets: ['chroma', 'chroma', 'chroma'].map(() => g.RULES.sockets.wildcard) }), before = snap(s);
  set.forEach(e => g.applyEquip(s, e));
  const st = set.reduce((a, e) => ({ atk: a.atk + e.atk, hp: a.hp + e.hp }), { atk: 0, hp: 0 });
  check(s.atk === 4 + st.atk && s.hp === 10 + st.hp, `stack ${set.map(e => e.name)}: statistics ${s.atk}/${s.hp} instead of ${4 + st.atk}/${10 + st.hp}`);
  check(finite(s), `stack ${set.map(e => e.name)}: not finite`);
  if (i % 5 === 0) fight([s, g.mkServant(pool[i % pool.length])], pick(r4, 3).map(d => g.mkServant(d)), i + 1, `stack ${set.map(e => e.name).join(' + ')}`);
  g.removeEquips(s);
  check(snap(s) === before, `stack ${set.map(e => e.name)}: not restored\n   before ${before}\n   after  ${snap(s)}`);
}

// ---------- 6. balance (warnings) ----------
const total = e => e.atk + e.hp, byType = a => LEVELS.map(l => (grid[`${a}:${l}`] || [])[0]).filter(Boolean);
const table = [];
ASSIGN.forEach(a => {
  const row = byType(a); table.push(`${a.padEnd(12)} ${row.map(e => `${e.atk}/${e.hp}${e.skill ? '*' : ' '}`.padEnd(6)).join('')}`);
  for (let i = 1; i < row.length; i++) {
    if (!row[i].skill && !row[i].kw && !row[i - 1].skill && total(row[i]) < total(row[i - 1])) warnings.push(`${a}: level ${i + 1} (${row[i].name}) has fewer statistics than level ${i} with no power to compensate`);
  }
  const bare = row.filter(e => !e.skill && !e.kw && !e.mod); if (bare.length >= 3) warnings.push(`${a}: ${bare.length} equipment have no power at all`);
});

(async () => {
  await texts();
  if (process.argv.includes('--table')) console.log('assignment   levels 1..6 (atk/hp, * = power)\n' + table.join('\n'));
  warnings.forEach(w => console.log('⚠ ' + w));
  if (problems.length) { console.log(problems.map(p => '✗ ' + p).join('\n')); console.log(`✗ equipment: ${problems.length} problem(s)`); process.exit(1); }
  console.log(`✓ equipment: ${equips.length} equipment (${ASSIGN.length} assignments x ${LEVELS.length} levels) valid in fr+en, exact round trip, ${combats} combats (${maxFrames} frames at most) deterministic and finite, 1500 random stacks restored${warnings.length ? `, ${warnings.length} warning(s)` : ''}.`);
})();
