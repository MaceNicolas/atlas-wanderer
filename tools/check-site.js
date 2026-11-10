// Site smoke test: starts the local server and loads, over HTTP, everything a visitor of the published site (GitHub Pages) would load.
// Pages, their scripts / styles / images / links, the illustrations listed in prototype/images.js, and the JSON files of data/i18n/.
// Fails on the first missing file, broken link or unreadable JSON.
// Usage: node tools/check-site.js [--port=8099]
'use strict';
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..');
const portArg = process.argv.find(a => a.startsWith('--port=')), PORT = portArg ? +portArg.slice(7) : 8099;
const BASE = `http://127.0.0.1:${PORT}`;
const problems = [];
let checked = 0;

const get = async url => { const r = await fetch(url); checked++; return r; };
const need = async (url, from, what) => {
  const r = await get(url);
  if (!r.ok) problems.push(`${what} ${url.replace(BASE, '')} -> HTTP ${r.status} (from ${from})`);
  return r;
};

(async () => {
  const server = spawn('node', [path.join(__dirname, 'local-server.js'), `--port=${PORT}`], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(BASE + '/'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

    // 1. Pages and what they reference.
    const pages = ['index.html', 'prototype/prototype.html', ...fs.readdirSync(path.join(root, 'site')).filter(f => f.endsWith('.html')).map(f => `site/${f}`)];
    for (const page of pages) {
      const r = await need(`${BASE}/${page}`, 'page list', 'page');
      if (!r.ok) continue;
      const html = await r.text();
      for (const m of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
        const u = m[1];
        if (/^(https?:|\/\/|data:|mailto:|javascript:)/.test(u) || u.includes('${')) continue;
        await need(new URL(u, `${BASE}/${page}`).href, page, 'resource');
      }
    }

    // 2. Illustrations listed in prototype/images.js (AW_IMAGES = { category: { uuid: extension } }).
    const images = new Function('window', `${fs.readFileSync(path.join(root, 'prototype', 'images.js'), 'utf8')}; return window.AW_IMAGES;`)({});
    for (const [category, files] of Object.entries(images || {}))
      for (const [id, ext] of Object.entries(files)) await need(`${BASE}/prototype/images/${category}/${id}.${ext}`, 'prototype/images.js', 'illustration');

    // 3. Text files of the game: must exist and parse as JSON (French is mandatory).
    for (const file of ['powers', 'servants', 'equipment', 'lieutenants', 'dungeons', 'retired']) {
      const r = await need(`${BASE}/data/${file}.json`, 'prototype', 'data');
      if (r.ok) { try { await r.json(); } catch (e) { problems.push(`data/${file}.json is not valid JSON`); } }
    }
    for (const lang of ['fr', 'en']) {
      const r = await need(`${BASE}/data/i18n/${lang}.json`, 'prototype/i18n.js', 'texts');
      if (r.ok) { try { await r.json(); } catch (e) { problems.push(`data/i18n/${lang}.json is not valid JSON`); } }
    }
  } finally { server.kill(); }
  if (problems.length) { console.log(`✗ ${problems.length} problem(s) out of ${checked} requests:\n  ` + problems.join('\n  ')); process.exit(1); }
  console.log(`✓ ${checked} requests, no problem.`);
})().catch(e => { console.error(e); process.exit(1); });
