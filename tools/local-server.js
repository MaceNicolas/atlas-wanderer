// Local site server: serves the repository (index.html, site/, prototype/, tests/) and lets the "Test" page launch
// the balance tests (tools/balance.js), follow their progress and manage the history.
// Usage: node tools/local-server.js [--port=8080]    then open http://localhost:8080/
// Listens only on 127.0.0.1 (this machine); depends on no external module.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const history = require('./history');
const root = history.root;
const portArg = process.argv.find(a => a.startsWith('--port=')), PORT = portArg ? +portArg.slice(7) : 8080;

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
// Folders never served: local files, git history, tooling scripts.
const FORBIDDEN = new Set(['temp', 'inspiration', 'images-elk', 'outils', 'prompts', 'node_modules']);

// ---------- Running test (only one at a time) ----------
let current = null;   // { child, params, startedAt, rows, progress, finish, id }
const PHASES = ['lieutenants', 'servants', 'equipment', 'dungeons', 'all'], SCALES = ['small', 'normal', 'massive'], STRATS = ['level', 'balanced', 'tempo'];

function launch(p) {
  if (current && current.finish === null) throw new Error('Un test est déjà en cours.');
  if (!PHASES.includes(p.phase)) throw new Error('Phase inconnue.');
  if (!SCALES.includes(p.scale)) throw new Error('Échelle inconnue.');
  const factor = p.factor === '' || p.factor == null ? 1 : +p.factor, seed = p.seed === '' || p.seed == null ? 1 : +p.seed;
  if (!(factor > 0 && factor <= 100) || !Number.isInteger(seed) || seed < 0) throw new Error('Facteur ou graine invalide.');
  const strats = (p.strategies || []).filter(s => STRATS.includes(s));
  const args = [path.join(__dirname, 'balance.js'), p.phase, `--scale=${p.scale}`, `--factor=${factor}`, `--seed=${seed}`];
  if (strats.length) args.push(`--strategy=${strats.join(',')}`);
  if (p.note) args.push(`--note=${String(p.note).slice(0, 300)}`);
  const child = spawn(process.execPath, args, { cwd: root });
  const t = current = { child, params: { ...p, factor, seed, strategies: strats }, startTime: Date.now(), rows: [], progress: null, finish: null, id: null, buffer: '' };
  const receive = (stream, isError) => stream.on('data', d => {
    t.buffer += d.toString();
    const chunks = t.buffer.split(/\r|\n/); t.buffer = chunks.pop();
    chunks.forEach(l => {
      const m = l.match(/(\d+)\/(\d+) tâches \((\d+) s\)/);
      if (m) { t.progress = { done: +m[1], total: +m[2], seconds: +m[3] }; return; }
      if (!l.trim() && isError) return;
      const id = l.match(/^Test (\S+) /); if (id) t.id = id[1];
      const ph = l.match(/^████ Phase : (\w+)/); if (ph) t.phase = ph[1];
      t.rows.push(l); if (t.rows.length > 400) t.rows.shift();
    });
  });
  receive(child.stdout, false); receive(child.stderr, true);
  child.on('close', (code, signal) => { t.finish = { code, signal, seconds: Math.round((Date.now() - t.startTime) / 1000) }; try { history.reindex(); } catch (e) { /* index regenerated at the next launch */ } });
  child.on('error', e => { t.finish = { code: -1, failure: String(e) }; });
}

// ---------- Responses ----------
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const bodyOf = req => new Promise((ok, ko) => { let d = ''; req.on('data', c => { d += c; if (d.length > 3e6) { req.destroy(); ko(new Error('Requête trop grande.')); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { ko(new Error('JSON invalide.')); } }); });

async function api(req, res, urlPath) {
  try {
    if (req.method === 'GET' && urlPath === '/api/info') {
      const X = require('./load-game').load({ fast: true }).X;
      return json(res, 200, { hashDonnees: history.dataFingerprint(), hashBot: history.botFingerprint(), server: true, scales: history.scales,
        size: { lieutenants: Object.keys(X.HEROES).length, servants: X.SERVANTS.filter(c => !c.token).length, equipment: X.EQUIPS.filter(c => !c.token).length, dungeons: Object.keys(X.DUNGEONS).length, types: X.ALL_TYPES.length } });
    }
    if (req.method === 'GET' && urlPath === '/api/state') {
      if (!current) return json(res, 200, { active: false });
      return json(res, 200, { active: current.finish === null, params: current.params, seconds: Math.round(((current.finish ? current.startTime + current.finish.seconds * 1000 : Date.now()) - current.startTime) / 1000), progress: current.progress, phase: current.phase || null, id: current.id, finish: current.finish, rows: current.rows.slice(-120) });
    }
    if (req.method === 'POST' && urlPath === '/api/launch') { launch(await bodyOf(req)); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && urlPath === '/api/cancel') { if (current && current.finish === null) current.child.kill(); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && urlPath === '/api/reindex') return json(res, 200, { tests: history.reindex().length });
    // Editor: saves a data file. The editor only runs on the local server (GitHub Pages is read-only). Power templates are validated first.
    const save = urlPath.match(/^\/api\/save\/([\w-]+)$/);
    if (req.method === 'POST' && save) {
      const SAVABLE = { powers: 'data/powers.json', servants: 'data/servants.json', equipment: 'data/equipment.json', lieutenants: 'data/lieutenants.json', dungeons: 'data/dungeons.json',
        rules: 'data/rules.json', 'i18n-fr': 'data/i18n/fr.json', 'i18n-en': 'data/i18n/en.json' };
      if (!SAVABLE[save[1]]) return json(res, 404, { failure: 'Fichier inconnu.' });
      const content = await bodyOf(req);
      if (save[1] === 'powers') {
        const POWERS = require('./engine-data').loadRuntime().POWERS, problems = [];
        for (const [fx, def] of Object.entries(content)) POWERS.validate(def).forEach(p => problems.push(`${fx} : ${p}`));
        if (problems.length) return json(res, 422, { failure: 'Modèles invalides.', problems });
      }
      if (['servants', 'equipment', 'lieutenants'].includes(save[1])) {
        const rt = require('./engine-data').loadRuntime(), core = require('../site/editor-core.js'), problems = [];
        const files = {};
        for (const cat of ['servants', 'equipment', 'lieutenants']) files[cat] = cat === save[1] ? content : JSON.parse(fs.readFileSync(path.join(root, SAVABLE[cat]), 'utf8'));
        const current = JSON.parse(fs.readFileSync(path.join(root, SAVABLE[save[1]]), 'utf8'));
        const known = core.knownFrom({ ...files, [save[1]]: current }, Object.keys(rt.TYPE_NAMES), Object.keys(rt.POWERS.all()));
        for (const [id, card] of Object.entries(content.cards || {})) core.validateCard(save[1], card, known).forEach(p => problems.push(`${id} : ${p}`));
        if (problems.length) return json(res, 422, { failure: 'Cartes invalides.', problems });
      }
      fs.writeFileSync(path.join(root, SAVABLE[save[1]]), JSON.stringify(content, null, 1) + '\n');
      return json(res, 200, { ok: true, file: SAVABLE[save[1]], note: 'Relancez ./tools/verify-all.sh pour régénérer les pages et vérifier le jeu.' });
    }
    const c = urlPath.match(/^\/api\/card\/(servant|equip|hero|dungeon)\/([\w-]+)$/);
    if (req.method === 'GET' && c) { const svg = require('./card-svg').renderCard(c[1], c[2]); return svg ? json(res, 200, { svg }) : json(res, 404, { failure: 'Carte introuvable.' }); }
    const m = urlPath.match(/^\/api\/tests\/([\w-]+)$/);
    if (req.method === 'DELETE' && m) {
      const dir = path.join(history.historyFolder, m[1]);
      if (!fs.existsSync(path.join(dir, 'meta.json'))) return json(res, 404, { failure: 'Test introuvable.' });
      fs.rmSync(dir, { recursive: true }); history.reindex(); return json(res, 200, { ok: true });
    }
    json(res, 404, { failure: 'Inconnu.' });
  } catch (e) { json(res, 400, { failure: e.message }); }
}

function staticMode(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel.endsWith('/')) rel += 'index.html';
  const parts = rel.split('/').filter(Boolean);
  if (parts.some(p => p.startsWith('.') || p === '..') || FORBIDDEN.has(parts[0])) { res.writeHead(404); return res.end('Introuvable'); }
  const f = path.join(root, ...parts);
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('Introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}

http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  if (urlPath.startsWith('/api/')) return api(req, res, urlPath);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  staticMode(req, res, urlPath);
}).listen(PORT, '127.0.0.1', () => {
  history.reindex();
  console.log(`Site local : http://localhost:${PORT}/   (page Test : http://localhost:${PORT}/site/tests.html)`);
});
