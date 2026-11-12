// Undefined names: the game scripts share their global variables (no modules), so a name left over from a rename is only found when the line runs.
// This puts the scripts of prototype/ end to end, as the browser loads them, and asks ESLint (rule no-undef only) for any name that exists nowhere.
// Needs network access the first time (npx downloads ESLint). Usage: node tools/check-globals.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const dir = path.join(__dirname, '..', 'prototype'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-globals-'));
const html = fs.readFileSync(path.join(dir, 'prototype.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^":]+\.js)"/g)].map(m => m[1]);   // local scripts, in the order of the page
fs.writeFileSync(path.join(tmp, 'all.js'), scripts.map(f => `// ==== ${f}\n${fs.readFileSync(path.join(dir, f), 'utf8')}`).join('\n'));
const globals = ['window', 'document', 'navigator', 'localStorage', 'Audio', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'location', 'console', 'module', 'require', 'globalThis',
  'HTMLElement', 'crypto', 'requestAnimationFrame', 'cancelAnimationFrame', 'Image', 'URL', 'performance', 'CSS', 'confirm', 'alert', 'innerWidth', 'innerHeight', 'AWGfx', 'URLSearchParams'];
fs.writeFileSync(path.join(tmp, 'eslint.config.mjs'), `export default [{ files: ['**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: ${JSON.stringify(Object.fromEntries(globals.map(g => [g, 'writable'])))} }, rules: { 'no-undef': 'error' } }];`);
const r = spawnSync('npx', ['--yes', 'eslint@9', '-c', path.join(tmp, 'eslint.config.mjs'), path.join(tmp, 'all.js')], { cwd: tmp, encoding: 'utf8' });
const problems = (r.stdout || '').split('\n').filter(l => /no-undef/.test(l)).map(l => l.trim());
fs.rmSync(tmp, { recursive: true, force: true });
if (r.error || (r.status !== 0 && !problems.length)) { console.log(`✗ ESLint could not run: ${r.error || (r.stderr || '').slice(0, 300)}`); process.exit(1); }
if (problems.length) { console.log(`✗ ${problems.length} undefined name(s) (line numbers refer to the scripts end to end):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`✓ no undefined name in the ${scripts.length} game scripts.`);
