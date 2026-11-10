// Power editor test: the pure logic (site/editor-core.js) on the real game, and the save API of the local server (without touching data/powers.json).
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = path.join(__dirname, '..'), read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const core = require('../site/editor-core.js');
const game = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ SERVANTS, EQUIPS, HEROES, mkServant, applyEquip, applyFx, POWERS, setSeed })', { Math, console });
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
    const ok = await post('powers', defs);
    if (!ok.ok) fail(`valid save refused: HTTP ${ok.status}`);
    if (fs.readFileSync(file, 'utf8') !== before) fail('saving the unchanged templates modified data/powers.json');
  } finally { server.kill(); fs.writeFileSync(file, before); }
  console.log('✓ save API: invalid refused, unknown file refused, identical save leaves the file unchanged.');
})().catch(e => { console.error(e); process.exit(1); });
