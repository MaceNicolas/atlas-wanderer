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
const PHASES = ['heroes', 'servants', 'equipment', 'dungeons', 'all'], SCALES = ['small', 'normal', 'massive'], STRATS = ['level', 'balanced', 'tempo'];

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

const rawBody = (req, max) => new Promise((ok, ko) => { const parts = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { req.destroy(); ko(new Error('Image trop grande.')); } else parts.push(c); }); req.on('end', () => ok(Buffer.concat(parts))); req.on('error', ko); });

// Derived files (documentation/cartes.md, the card pages of site/): regenerated after the editor changed a source, so that they never lag behind data/.
// Saves come in bursts (texts, then the card, then the image): one run, started shortly after the last one. Errors are kept for the editor, they never fail a save.
const regen = { state: 'idle', error: null };
let regenTimer = null, regenAgain = false;
function runGenerate() {
  regen.state = 'running'; regenAgain = false;
  require('child_process').execFile(process.execPath, [path.join(__dirname, 'generate-all.js'), '--sans-simulation'], { cwd: root }, (err, stdout, stderr) => {
    regen.error = err ? String(stderr || err.message).trim().split('\n').slice(-3).join(' ') : null;
    if (regenAgain) runGenerate(); else regen.state = 'idle';
  });
}
function regenerate() {
  regen.state = regen.state === 'running' ? 'running' : 'pending';
  clearTimeout(regenTimer);
  regenTimer = setTimeout(() => { if (regen.state === 'running') regenAgain = true; else runGenerate(); }, 400);
}

async function api(req, res, urlPath) {
  try {
    if (req.method === 'GET' && urlPath === '/api/info') {
      const X = require('./load-game').load({ fast: true }).X;
      return json(res, 200, { hashDonnees: history.dataFingerprint(), hashBot: history.botFingerprint(), server: true, scales: history.scales,
        size: { heroes: Object.keys(X.HEROES).length, servants: X.SERVANTS.filter(c => !c.token).length, equipment: X.EQUIPS.filter(c => !c.token).length, dungeons: Object.keys(X.DUNGEONS).length, types: X.ALL_TYPES.length } });
    }
    if (req.method === 'GET' && urlPath === '/api/regeneration') return json(res, 200, { state: regen.state, error: regen.error });
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
      // The files of the active mod (data/mods/<id>/, see tools/mod.js). The texts are edited as one table per language and split on saving.
      const MOD = require('./mod');
      const SAVABLE = Object.fromEntries(Object.keys(MOD.manifest().files).map(k => [k, MOD.rel(MOD.file(k))]));
      SAVABLE['i18n-fr'] = MOD.rel(MOD.modTextFile('fr')); SAVABLE['i18n-en'] = MOD.rel(MOD.modTextFile('en'));
      if (!SAVABLE[save[1]]) return json(res, 404, { failure: 'Fichier inconnu.' });
      const content = await bodyOf(req);
      if (save[1] === 'powers') {
        const POWERS = require('./engine-data').loadRuntime().POWERS, problems = [];
        for (const [fx, def] of Object.entries(content)) POWERS.validate(def).forEach(p => problems.push(`${fx} : ${p}`));
        if (problems.length) return json(res, 422, { failure: 'Modèles invalides.', problems });
      }
      if (save[1] === 'retired') {
        const ids = content && content.ids, CARD_FILES = Object.values(MOD.read('game').categories).map(c => c.file), bad = !ids || CARD_FILES.some(c => !Array.isArray(ids[c]) || ids[c].some(x => typeof x !== 'string'));
        if (bad) return json(res, 422, { failure: 'Cartes retirées invalides.', problems: ['ids must list strings for each category of cards'] });
      }
      if (Object.values(MOD.read('game').categories).some(c => c.file === save[1])) {
        const rt = require('./engine-data').loadRuntime(), core = require('../site/editor-core.js'), problems = [];
        const files = {};
        for (const cat of Object.values(MOD.read('game').categories).map(c => c.file)) files[cat] = cat === save[1] ? content : JSON.parse(fs.readFileSync(path.join(root, SAVABLE[cat]), 'utf8'));
        files.rules = JSON.parse(fs.readFileSync(path.join(root, SAVABLE.rules), 'utf8')); files.vocabulary = JSON.parse(fs.readFileSync(path.join(root, SAVABLE.vocabulary), 'utf8'));
        const current = JSON.parse(fs.readFileSync(path.join(root, SAVABLE[save[1]]), 'utf8'));
        const known = core.knownFrom({ ...files, [save[1]]: current }, rt.ALL_TYPES, Object.keys(rt.POWERS.all()), Object.keys(rt.TRIG_KIND), MOD.read('game').categories);
        for (const [id, card] of Object.entries(content.cards || {})) core.validateCard(save[1], card, known).forEach(p => problems.push(`${id} : ${p}`));
        if (problems.length) return json(res, 422, { failure: 'Cartes invalides.', problems });
      }
      if (save[1] === 'rules' || save[1].startsWith('i18n-')) {
        const core = require('../site/editor-core.js');
        const problems = save[1] === 'rules' ? core.validateRules(content)
          : core.validateTexts(content, save[1] === 'i18n-fr' ? MOD.texts('fr') : null);
        if (problems.length) return json(res, 422, { failure: 'Fichier invalide.', problems });
      }
      if (save[1].startsWith('i18n-')) {
        // One table in, two files out: a key stays in the file where it already is; a new key goes to the mod's file, except the interface ones (engine texts).
        const lang = save[1].slice(5), core = MOD.readJson(MOD.coreTextFile(lang)), own = MOD.readJson(MOD.modTextFile(lang)), outCore = {}, outMod = {};
        for (const [k, v] of Object.entries(content)) (k in core || (!(k in own) && ['ui', 'socket', 'trigger'].includes(k.split('.')[0])) ? outCore : outMod)[k] = v;
        fs.writeFileSync(MOD.coreTextFile(lang), JSON.stringify(outCore, null, 1) + '\n'); fs.writeFileSync(MOD.modTextFile(lang), JSON.stringify(outMod, null, 1) + '\n');
      } else fs.writeFileSync(path.join(root, SAVABLE[save[1]]), JSON.stringify(content, null, 1) + '\n');
      if (['servants', 'equipment', 'heroes'].includes(save[1])) require('./index-images').build();   // framing (art) of the illustrations
      regenerate();
      return json(res, 200, { ok: true, file: SAVABLE[save[1]], note: 'Les pages et documentation/cartes.md sont régénérées ; ./tools/verify-all.sh vérifie le jeu.' });
    }
    // Editor: illustration of a card (<mod>/images/<category>/<id>.webp). The picture is sent as is and converted to webp here; the image index of the mod is rebuilt.
    const img = urlPath.match(/^\/api\/image\/(servants|equipment|heroes)\/([0-9a-f-]{36})$/);
    if (img && req.method === 'POST') {
      const data = await rawBody(req, 20e6), folder = path.join(require('./mod').imagesDir(), img[1]);
      if (!data.length) return json(res, 422, { failure: 'Image vide.' });
      const out = path.join(folder, img[2] + '.webp');
      const r = require('child_process').spawnSync('python3', ['-c', 'import sys,io\nfrom PIL import Image\nim=Image.open(io.BytesIO(sys.stdin.buffer.read()))\nim=im.convert("RGBA" if "A" in im.getbands() else "RGB")\nim.save(sys.argv[1],"WEBP",quality=90)', out], { input: data, encoding: 'utf8' });
      if (r.status !== 0) return json(res, 422, { failure: 'Image illisible ou conversion impossible.', problems: [(r.stderr || '').trim().split('\n').pop()] });
      for (const e of ['.png', '.jpg', '.jpeg']) fs.rmSync(path.join(folder, img[2] + e), { force: true });
      require('./index-images').build(); regenerate();
      return json(res, 200, { ok: true });
    }
    if (img && req.method === 'DELETE') {
      const folder = path.join(require('./mod').imagesDir(), img[1]);
      for (const e of ['.webp', '.png', '.jpg', '.jpeg']) fs.rmSync(path.join(folder, img[2] + e), { force: true });
      require('./index-images').build(); regenerate();
      return json(res, 200, { ok: true });
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
