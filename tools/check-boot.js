// Boot test: starts the game the way a browser does. Scripts are run one by one in the order of prototype/prototype.html, each with its own
// document.currentScript, and every data file (texts, power templates, cards) is fetched over HTTP from the local server, exactly as on GitHub Pages.
// Then it checks that the game rendered its first screen with the full catalog loaded. The DOM is a fake one (no layout), so this proves the loading
// chain, not the look of the page.
// Usage: node tools/check-boot.js [--port=8098]
'use strict';
const { spawn } = require('child_process'), vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const portArg = process.argv.find(a => a.startsWith('--port=')), PORT = portArg ? +portArg.slice(7) : 8098;
const BASE = `http://127.0.0.1:${PORT}/prototype/`;

(async () => {
  const server = spawn('node', [path.join(__dirname, 'local-server.js'), `--port=${PORT}`], { stdio: 'ignore' });
  let failed = null;
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
    const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} });
    const document = { currentScript: null, getElementById: el, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), head: el(), addEventListener() {} };
    const ctx = { AWGfx: require(path.join(root, 'prototype', 'svg.js')), console, Math, navigator: { userAgent: 'node' }, document, fetch, URL, Promise,
      window: { scrollY: 0, scrollTo() {}, addEventListener() {} }, setTimeout: () => 0, clearTimeout() {}, location: { protocol: 'http:' },
      localStorage: (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })() };
    ctx.self = ctx; vm.createContext(ctx);
    // The scripts of the page, in order (the CDN script, svg.js and images.js are provided apart).
    const html = fs.readFileSync(path.join(root, 'prototype', 'prototype.html'), 'utf8');
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s) && !['images.js', 'svg.js'].includes(s));
    for (const s of scripts) {
      document.currentScript = { src: BASE + s };
      vm.runInContext(fs.readFileSync(path.join(root, 'prototype', s), 'utf8'), ctx, { filename: s });
    }
    document.currentScript = null;
    // Wait for the three loaders of the page, then for the first render (scheduled right after).
    await vm.runInContext('Promise.all([I18N.ready, POWERS.ready, CATALOG.ready])', ctx);
    await new Promise(r => setImmediate(r));
    const state = vm.runInContext('({ servants: SERVANTS.length, equipment: EQUIPS.length, heroes: Object.keys(HEROES).length, dungeons: Object.keys(DUNGEONS).length, powers: Object.keys(JSON.parse(JSON.stringify(typeof POWERS.has === "function" ? { a: 1 } : {}))).length, powerBuff: POWERS.has("buffAllies"), name: SERVANTS[0].name, text: I18N.t("type.droid"), screen: UI.screen })', ctx);
    // The game must load exactly the cards of the data files (the number of cards changes when the designer adds or removes some).
    const count = file => Object.keys(JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data', file + '.json'), 'utf8')).cards).length;
    const expected = { servants: count('servants'), equipment: count('equipment'), heroes: count('lieutenants'), dungeons: count('dungeons') };
    for (const [k, v] of Object.entries(expected)) if (state[k] !== v) failed = `${k}: ${state[k]} instead of ${v}`;
    if (!state.powerBuff) failed = failed || 'power templates not loaded';
    if (state.text !== 'Droïde') failed = failed || `texts not loaded (${state.text})`;
    if (!state.name || state.name.startsWith('card.')) failed = failed || `card names not loaded (${state.name})`;
    if (!failed) console.log(`✓ boot ok: ${state.servants} servants, ${state.equipment} equipment, ${state.heroes} lieutenants, ${state.dungeons} dungeons, texts and power templates fetched; screen "${state.screen}".`);
  } catch (e) { failed = e.stack || String(e); }
  finally { server.kill(); }
  if (failed) { console.log(`✗ boot failed: ${failed}`); process.exit(1); }
})();
