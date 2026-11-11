// Power editor test: the pure logic (site/editor-core.js) on the real game, and the save API of the local server (without touching data/powers.json).
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = path.join(__dirname, '..'), read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const core = require('../site/editor-core.js'), MOD = require('./mod');
const game = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ SERVANTS, EQUIPS, HEROES, mkServant, applyEquip, applyFx, POWERS, setSeed })', { Math, console });
// The page's inline script must at least compile (the page itself is not run here).
{ const html = read('site', 'editor.html'), scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { scripts.forEach(code => new vm.Script(code, { filename: 'site/editor.html' })); } catch (e) { console.log('✗ site/editor.html does not compile: ' + e.message); process.exit(1); } }
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const defs = game.POWERS.all(), ids = Object.keys(defs);
if (ids.length < 80) fail('templates not loaded');

// usageOf: every effect template that a card uses is found back.
const used = ids.filter(id => core.usageOf(id, game).length);
if (!used.length) fail('usageOf finds nothing');

// Sandbox: deterministic, restores the templates, and works for every effect template.
let ran = 0;
for (const id of ids.filter(id => core.kindOf(defs[id]) !== 'reaction')) {
  const p = { a: 2, h: 2, n: 1 }, r1 = core.runSandbox(game, defs, id, p, 7), r2 = core.runSandbox(game, defs, id, p, 7);
  if (JSON.stringify(r1) !== JSON.stringify(r2)) fail(`sandbox of ${id} is not deterministic`);
  ran++;
}
if (game.POWERS.all() !== defs) fail('the sandbox did not restore the templates');
console.log(`✓ editor logic: ${ran} effect templates played in the sandbox, ${used.length} used by cards.`);

// Cards: every card of the three files is valid, and obvious mistakes are caught.
const files = {}; for (const c of Object.keys(core.CARD_FIELDS)) files[c] = MOD.read(c);
const typeIds = MOD.read('vocabulary').groups.flatMap(g => g.types);
const known = core.knownFrom({ ...files, rules: MOD.read('rules'), vocabulary: MOD.read('vocabulary') }, typeIds, ids);
let cards = 0;
for (const [c, f] of Object.entries(files)) for (const [id, card] of Object.entries(f.cards)) { cards++; const p = core.validateCard(c, card, known); if (p.length) fail(`${c} ${id}: ${p.join(', ')}`); }
const sample = JSON.parse(JSON.stringify(Object.values(files.servants.cards)[0]));
const mistakes = [{ ...sample, hp: 0 }, { ...sample, types: ['nope'] }, { ...sample, kw: ['nope'] }, { ...sample, extra: 1 }, { ...sample, skill: [{ t: 'passive', fx: 'doesNotExist', a: 0, h: 0, n: 0 }] }];
mistakes.forEach((m, i) => { if (!core.validateCard('servants', m, known).length) fail(`card mistake ${i} not caught`); });
// Dungeons, new cards, retiring a card.
files.dungeons = MOD.read('dungeons');
for (const [id, d] of Object.entries(files.dungeons.cards)) { const p = core.validateCard('dungeons', d, known); if (p.length) fail(`dungeon ${id}: ${p.join(', ')}`); }
const dungeon = Object.values(files.dungeons.cards)[0];
[{ ...dungeon, boss: { ...dungeon.boss, hp: 0 } }, { ...dungeon, boss: { ...dungeon.boss, power: 'nope' } }, { ...dungeon, minis: [dungeon.type, dungeon.minis[1]] }, { ...dungeon, minis: ['elk'] }, { ...dungeon, type: 'nope' }]
  .forEach((m, i) => { if (!core.validateCard('dungeons', m, known).length) fail(`dungeon mistake ${i} not caught`); });
for (const c of Object.keys(core.CARD_FIELDS)) { const p = core.validateCard(c, core.newCard(c), known); if (p.length) fail(`new ${c} card is invalid: ${p.join(', ')}`); }
const retiredFile = MOD.read('retired'), someId = Object.keys(files.servants.cards)[0], after = core.retire(retiredFile, 'servants', someId);
if (!after.ids.servants.includes(someId) || retiredFile.ids.servants.includes(someId) || core.retire(after, 'servants', someId).ids.servants.length !== after.ids.servants.length) fail('retire() is wrong');
// Framing of the illustrations ("art"): validated, cleaned, and listed in images.js exactly as the card files say.
for (const bad of [{ align: 'nope' }, { whole: 'yes' }, { extra: 1 }, []]) if (!core.validateCard('servants', { ...sample, art: bad }, known).length) fail('bad art not caught: ' + JSON.stringify(bad));
if (core.validateCard('servants', { ...sample, art: { align: 'xMidYMin', whole: true } }, known).length) fail('good art refused');
if (core.cleanArt({ align: 'xMidYMid', whole: false }) !== undefined) fail('default framing must not be stored');
{ const sandbox = { globalThis: {} }; vm.runInNewContext(fs.readFileSync(MOD.imageIndexFile(), 'utf8'), sandbox);
  for (const cat of ['servants', 'equipment', 'heroes']) for (const [id, c] of Object.entries(files[cat].cards)) {
    const listed = (sandbox.globalThis.AW_ART[cat] || {})[id], wanted = c.art && sandbox.globalThis.AW_IMAGES[cat][id] ? c.art : undefined;
    if (JSON.stringify(listed) !== JSON.stringify(wanted)) fail(`${MOD.rel(MOD.imageIndexFile())} is out of date for ${cat} ${id} (run node tools/index-images.js)`);
  } }
console.log(`✓ card validation: ${cards} cards valid, ${mistakes.length} mistakes caught, framing of the illustrations in step with images.js.`);

// Texts and rules: the real files are valid, mistakes are caught.
const fr = MOD.texts('fr'), en = MOD.texts('en'), rules = MOD.read('rules');
for (const [l, t] of [['fr', fr], ['en', en]]) { const p = core.validateTexts(t, l === 'fr' ? fr : null); if (p.length) fail(`texts ${l}: ${p[0]}`); }
const firstKey = Object.keys(fr).find(k => /\{/.test(fr[k]));
if (!core.validateTexts({ ...fr, [firstKey]: 'no placeholder' }, fr, { placeholders: true }).length) fail('changed placeholders not caught');
const { [firstKey]: dropped, ...withoutKey } = fr; if (!core.validateTexts(withoutKey, fr).length) fail('removed key not caught');
if (core.validateRules(rules).length) fail('rules.json invalid');
if (!core.validateRules({ ...rules, order: { ...rules.order, profile: 'nope' } }).length) fail('unknown profile not caught');
if (!core.validateRules({ ...rules, fatigue: { start: 0, increment: 1 } }).length) fail('bad fatigue not caught');
console.log('✓ texts and rules validation.');

// Save API: invalid template refused (422), unknown file 404; valid save leaves the file identical.
(async () => {
  const PORT = 8097, BASE = `http://127.0.0.1:${PORT}`, file = MOD.file('powers'), before = fs.readFileSync(file, 'utf8');
  const server = spawn('node', [path.join(__dirname, 'local-server.js'), `--port=${PORT}`], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(BASE + '/'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
    const post = (name, body) => fetch(`${BASE}/api/save/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const bad = await post('powers', { ...defs, broken: { nope: 1 } });
    if (bad.status !== 422) fail(`invalid template: HTTP ${bad.status} instead of 422`);
    if ((await post('nothing', {})).status !== 404) fail('unknown file not refused');
    if (fs.readFileSync(file, 'utf8') !== before) fail('a refused save changed the file');
    const badCard = JSON.parse(JSON.stringify(files.servants)); Object.values(badCard.cards)[0].hp = 0;
    if ((await post('servants', badCard)).status !== 422) fail('an invalid card was not refused (422)');
    const sv = MOD.file('servants'), svBefore = fs.readFileSync(sv, 'utf8');
    if (!(await post('servants', files.servants)).ok || fs.readFileSync(sv, 'utf8') !== svBefore) fail('identical cards save changed the file');
    if ((await post('rules', { ...rules, fatigue: { start: 0, increment: 1 } })).status !== 422) fail('invalid rules not refused');
    const { [firstKey]: removed, ...frWithoutKey } = fr;
    if ((await post('i18n-fr', frWithoutKey)).status !== 422) fail('removing a text key was not refused');
    for (const [name, content, files] of [['rules', rules, [MOD.file('rules')]], ['i18n-fr', fr, [MOD.coreTextFile('fr'), MOD.modTextFile('fr')]], ['i18n-en', en, [MOD.coreTextFile('en'), MOD.modTextFile('en')]]]) {
      const was = files.map(p => fs.readFileSync(p, 'utf8'));   // the texts are sent as one table: the server splits it between the engine's file and the mod's file
      if (!(await post(name, content)).ok || files.some((p, i) => fs.readFileSync(p, 'utf8') !== was[i])) fail(`identical save of ${name} changed a file`);
    }
    const badDungeons = JSON.parse(JSON.stringify(files.dungeons)); Object.values(badDungeons.cards)[0].boss.hp = 0;
    if ((await post('dungeons', badDungeons)).status !== 422) fail('invalid dungeon not refused');
    if ((await post('retired', { ids: { servants: 'x' } })).status !== 422) fail('invalid retired list not refused');
    for (const [name, content] of [['dungeons', files.dungeons], ['retired', retiredFile]]) {
      const p = MOD.file(name), was = fs.readFileSync(p, 'utf8');
      if (!(await post(name, content)).ok || fs.readFileSync(p, 'utf8') !== was) fail(`identical save of ${name} changed the file`);
    }
    const ok = await post('powers', defs);
    if (!ok.ok) fail(`valid save refused: HTTP ${ok.status}`);
    if (fs.readFileSync(file, 'utf8') !== before) fail('saving the unchanged templates modified data/powers.json');
  } finally { server.kill(); fs.writeFileSync(file, before); }
  console.log('✓ save API: invalid refused, unknown file refused, identical save leaves the file unchanged.');
})().catch(e => { console.error(e); process.exit(1); });
