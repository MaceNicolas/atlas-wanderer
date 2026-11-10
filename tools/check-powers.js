// Oracle test of the power bricks: for every template of data/powers.json, plays the OLD hand-written code (tests/legacy/engine-before-bricks.js)
// and the NEW interpreter on thousands of random boards, and compares the final state, the combat log and the random numbers consumed.
// The legacy file is temporary: it is deleted when the whole migration is done.
// Usage: node tools/check-powers.js [trials=400] [fx ...]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const args = process.argv.slice(2), trials = +args.find(a => /^\d+$/.test(a)) || 400, only = args.filter(a => !/^\d+$/.test(a));
const defs = JSON.parse(read('data', 'powers.json'));
const texts = { fr: JSON.parse(read('data', 'i18n', 'fr.json')), en: JSON.parse(read('data', 'i18n', 'en.json')) };
const exportList = '\n;({ applyFx, setSeed, rng, ALL_TYPES, KW });';
const legacy = vm.runInNewContext(read('prototype', 'data.js') + '\n' + read('tests', 'legacy', 'engine-before-bricks.js') + exportList, { Math, console });
const current = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n')
  + `\n;POWERS.install(${JSON.stringify(defs)});\n;I18N.install(${JSON.stringify(texts)});` + exportList, { Math, console });

// Small deterministic generator for the scenarios (independent from the game's).
const gen = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

function scenario(seed) {
  const r = gen(seed), int = n => Math.floor(r() * n), pickOf = l => l[int(l.length)];
  const kws = Object.keys(legacy.KW);
  const card = (name) => {
    const types = []; for (let i = 0, n = 1 + int(3); i < n; i++) { const t = pickOf(legacy.ALL_TYPES); if (!types.includes(t)) types.push(t); }
    const maxhp = 1 + int(12), hp = r() < 0.12 ? 0 : 1 + int(maxhp);
    return { uid: int(1e6), name, rank: 1 + int(5), atk: int(10), hp, maxhp, types, kw: kws.filter(() => r() < 0.12), shield: r() < 0.2 ? 1 : 0, equips: Array.from({ length: int(3) }, (_, i) => 'Eq' + i), healBonus: 0, droneA: 0, droneH: 0 };
  };
  const allies = Array.from({ length: 1 + int(7) }, (_, i) => card('A' + i)), enemies = Array.from({ length: int(8) }, (_, i) => card('E' + i));
  const hero = r() < 0.15;                                           // lieutenant powers: the carrier is not on the board
  const srcIndex = int(allies.length);
  const src = hero ? { name: 'Hero', kw: [] } : null;
  return { allies, enemies, src, srcIndex, k: { t: 'startCombat', fx: null, a: int(5), h: int(5), n: int(6), times: 1 }, level: int(7), seed: seed * 7 + 1 };
}
function play(ctx, sc, fx) {
  const copy = JSON.parse(JSON.stringify({ allies: sc.allies, enemies: sc.enemies, src: sc.src }));
  const src = copy.src || copy.allies[sc.srcIndex], messages = [];
  ctx.setSeed(sc.seed);
  ctx.applyFx({ ...sc.k, fx }, src, copy.allies, copy.enemies, m => messages.push(m), null, sc.level);
  return JSON.stringify({ state: copy, messages, next: ctx.rng() });
}

let failures = 0;
const names = Object.keys(defs).filter(fx => !only.length || only.includes(fx));
for (const fx of names) {
  let bad = 0, example = null;
  for (let i = 1; i <= trials; i++) {
    const sc = scenario(i * 131 + fx.length);
    const a = play(legacy, sc, fx), b = play(current, sc, fx);
    if (a !== b) { bad++; if (!example) example = { a: JSON.parse(a), b: JSON.parse(b), sc }; }
  }
  if (bad) {
    failures++;
    console.log(`✗ ${fx}: ${bad}/${trials} scenarios differ`);
    console.log('  legacy messages:', JSON.stringify(example.a.messages), '\n  bricks  messages:', JSON.stringify(example.b.messages), '\n  params:', JSON.stringify(example.sc.k));
    if (JSON.stringify(example.a.state) !== JSON.stringify(example.b.state)) console.log('  (final state differs)');
    if (example.a.next !== example.b.next) console.log('  (random numbers consumed differ)');
  }
}
console.log(failures ? `✗ ${failures} template(s) differ from the legacy code.` : `✓ ${names.length} template(s) identical to the legacy code on ${trials} random boards each (state, log, random numbers).`);
process.exit(failures ? 1 : 0);
