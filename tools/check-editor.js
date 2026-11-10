// Power editor test: the pure logic (site/editor-core.js) on the real game, and the save API of the local server (without touching data/powers.json).
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = path.join(__dirname, '..'), read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const core = require('../site/editor-core.js');
const game = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
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
const files = {}; for (const c of Object.keys(core.CARD_FIELDS)) files[c] = JSON.parse(read('data', c + '.json'));
const typeIds = vm.runInNewContext(read('prototype', 'data.js').split('\n').filter(l => l.startsWith('const TYPE_NAMES')).join('\n') + ';Object.keys(TYPE_NAMES)', {});
const known = core.knownFrom(files, typeIds, ids);
let cards = 0;
for (const [c, f] of Object.entries(files)) for (const [id, card] of Object.entries(f.cards)) { cards++; const p = core.validateCard(c, card, known); if (p.length) fail(`${c} ${id}: ${p.join(', ')}`); }
const sample = JSON.parse(JSON.stringify(Object.values(files.servants.cards)[0]));
const mistakes = [{ ...sample, hp: 0 }, { ...sample, types: ['nope'] }, { ...sample, kw: ['nope'] }, { ...sample, extra: 1 }, { ...sample, skill: [{ t: 'passive', fx: 'doesNotExist', a: 0, h: 0, n: 0 }] }];
mistakes.forEach((m, i) => { if (!core.validateCard('servants', m, known).length) fail(`card mistake ${i} not caught`); });
// Dungeons, new cards, retiring a card.
files.dungeons = JSON.parse(read('data', 'dungeons.json'));
for (const [id, d] of Object.entries(files.dungeons.cards)) { const p = core.validateCard('dungeons', d, known); if (p.length) fail(`dungeon ${id}: ${p.join(', ')}`); }
const dungeon = Object.values(files.dungeons.cards)[0];
[{ ...dungeon, boss: { ...dungeon.boss, hp: 0 } }, { ...dungeon, boss: { ...dungeon.boss, power: 'nope' } }, { ...dungeon, minis: [dungeon.type, dungeon.minis[1]] }, { ...dungeon, minis: ['elk'] }, { ...dungeon, type: 'nope' }]
  .forEach((m, i) => { if (!core.validateCard('dungeons', m, known).length) fail(`dungeon mistake ${i} not caught`); });
for (const c of Object.keys(core.CARD_FIELDS)) { const p = core.validateCard(c, core.newCard(c), known); if (p.length) fail(`new ${c} card is invalid: ${p.join(', ')}`); }
const retiredFile = JSON.parse(read('data', 'retired.json')), someId = Object.keys(files.servants.cards)[0], after = core.retire(retiredFile, 'servants', someId);
if (!after.ids.servants.includes(someId) || retiredFile.ids.servants.includes(someId) || core.retire(after, 'servants', someId).ids.servants.length !== after.ids.servants.length) fail('retire() is wrong');
console.log(`✓ card validation: ${cards} cards valid, ${mistakes.length} mistakes caught.`);

// Texts and rules: the real files are valid, mistakes are caught.
const fr = JSON.parse(read('data', 'i18n', 'fr.json')), en = JSON.parse(read('data', 'i18n', 'en.json')), rules = JSON.parse(read('data', 'rules.json'));
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
  const PORT = 8097, BASE = `http://127.0.0.1:${PORT}`, file = path.join(root, 'data', 'powers.json'), before = fs.readFileSync(file, 'utf8');
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
    const sv = path.join(root, 'data', 'servants.json'), svBefore = fs.readFileSync(sv, 'utf8');
    if (!(await post('servants', files.servants)).ok || fs.readFileSync(sv, 'utf8') !== svBefore) fail('identical cards save changed the file');
    if ((await post('rules', { ...rules, fatigue: { start: 0, increment: 1 } })).status !== 422) fail('invalid rules not refused');
    const { [firstKey]: removed, ...frWithoutKey } = fr;
    if ((await post('i18n-fr', frWithoutKey)).status !== 422) fail('removing a text key was not refused');
    for (const [name, content, file] of [['rules', rules, 'rules.json'], ['i18n-fr', fr, 'i18n/fr.json'], ['i18n-en', en, 'i18n/en.json']]) {
      const p = path.join(root, 'data', file), was = fs.readFileSync(p, 'utf8');
      if (!(await post(name, content)).ok || fs.readFileSync(p, 'utf8') !== was) fail(`identical save of ${name} changed the file`);
    }
    const badDungeons = JSON.parse(JSON.stringify(files.dungeons)); Object.values(badDungeons.cards)[0].boss.hp = 0;
    if ((await post('dungeons', badDungeons)).status !== 422) fail('invalid dungeon not refused');
    if ((await post('retired', { ids: { servants: 'x' } })).status !== 422) fail('invalid retired list not refused');
    for (const [name, content, file] of [['dungeons', files.dungeons, 'dungeons.json'], ['retired', retiredFile, 'retired.json']]) {
      const p = path.join(root, 'data', file), was = fs.readFileSync(p, 'utf8');
      if (!(await post(name, content)).ok || fs.readFileSync(p, 'utf8') !== was) fail(`identical save of ${name} changed the file`);
    }
    const ok = await post('powers', defs);
    if (!ok.ok) fail(`valid save refused: HTTP ${ok.status}`);
    if (fs.readFileSync(file, 'utf8') !== before) fail('saving the unchanged templates modified data/powers.json');
  } finally { server.kill(); fs.writeFileSync(file, before); }
  console.log('✓ save API: invalid refused, unknown file refused, identical save leaves the file unchanged.');
})().catch(e => { console.error(e); process.exit(1); });
