// Serveur local du site : sert le dépôt (index.html, site/, prototype/, tests/) et permet à la page « Test » de lancer
// les tests d'équilibrage (outils/equilibrage.js), de suivre leur progression et de gérer l'historique.
// Usage : node outils/serveur-local.js [--port=8080]    puis ouvrir http://localhost:8080/
// N'écoute que sur 127.0.0.1 (cette machine) ; ne dépend d'aucun module externe.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const historique = require('./historique');
const racine = historique.racine;
const portArg = process.argv.find(a => a.startsWith('--port=')), PORT = portArg ? +portArg.slice(7) : 8080;

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
// Dossiers jamais servis : fichiers locaux, historique git, scripts de l'outillage.
const INTERDITS = new Set(['temp', 'inspiration', 'images-elk', 'outils', 'prompts', 'node_modules']);

// ---------- Test en cours (un seul à la fois) ----------
let courant = null;   // { enfant, params, demarre, lignes, progression, fin, id }
const PHASES = ['lieutenants', 'serviteurs', 'equipements', 'donjons', 'tout'], ECHELLES = ['petit', 'normal', 'massif'], STRATS = ['niveau', 'equilibre', 'tempo'];

function lancer(p) {
  if (courant && courant.fin === null) throw new Error('Un test est déjà en cours.');
  if (!PHASES.includes(p.phase)) throw new Error('Phase inconnue.');
  if (!ECHELLES.includes(p.echelle)) throw new Error('Échelle inconnue.');
  const facteur = p.facteur === '' || p.facteur == null ? 1 : +p.facteur, graine = p.graine === '' || p.graine == null ? 1 : +p.graine;
  if (!(facteur > 0 && facteur <= 100) || !Number.isInteger(graine) || graine < 0) throw new Error('Facteur ou graine invalide.');
  const strats = (p.strategies || []).filter(s => STRATS.includes(s));
  const args = [path.join(__dirname, 'equilibrage.js'), p.phase, `--echelle=${p.echelle}`, `--facteur=${facteur}`, `--graine=${graine}`];
  if (strats.length) args.push(`--strategie=${strats.join(',')}`);
  if (p.note) args.push(`--note=${String(p.note).slice(0, 300)}`);
  const enfant = spawn(process.execPath, args, { cwd: racine });
  const t = courant = { enfant, params: { ...p, facteur, graine, strategies: strats }, demarre: Date.now(), lignes: [], progression: null, fin: null, id: null, tampon: '' };
  const recevoir = (flux, estErreur) => flux.on('data', d => {
    t.tampon += d.toString();
    const morceaux = t.tampon.split(/\r|\n/); t.tampon = morceaux.pop();
    morceaux.forEach(l => {
      const m = l.match(/(\d+)\/(\d+) tâches \((\d+) s\)/);
      if (m) { t.progression = { faits: +m[1], total: +m[2], secondes: +m[3] }; return; }
      if (!l.trim() && estErreur) return;
      const id = l.match(/^Test (\S+) /); if (id) t.id = id[1];
      const ph = l.match(/^████ Phase : (\w+)/); if (ph) t.phase = ph[1];
      t.lignes.push(l); if (t.lignes.length > 400) t.lignes.shift();
    });
  });
  recevoir(enfant.stdout, false); recevoir(enfant.stderr, true);
  enfant.on('close', (code, signal) => { t.fin = { code, signal, secondes: Math.round((Date.now() - t.demarre) / 1000) }; try { historique.reindexer(); } catch (e) { /* index regénéré au prochain lancement */ } });
  enfant.on('error', e => { t.fin = { code: -1, erreur: String(e) }; });
}

// ---------- Réponses ----------
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const corps = req => new Promise((ok, ko) => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) { req.destroy(); ko(new Error('Requête trop grande.')); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { ko(new Error('JSON invalide.')); } }); });

async function api(req, res, chemin) {
  try {
    if (req.method === 'GET' && chemin === '/api/info') {
      const X = require('./charger-jeu').charger({ rapide: true }).X;
      return json(res, 200, { hashDonnees: historique.empreinteDonnees(), hashBot: historique.empreinteBot(), serveur: true, echelles: historique.echelles,
        taille: { lieutenants: Object.keys(X.HEROES).length, serviteurs: X.SERVANTS.filter(c => !c.token).length, equipements: X.EQUIPS.filter(c => !c.token).length, donjons: Object.keys(X.DUNGEONS).length, types: X.ALL_TYPES.length } });
    }
    if (req.method === 'GET' && chemin === '/api/etat') {
      if (!courant) return json(res, 200, { actif: false });
      return json(res, 200, { actif: courant.fin === null, params: courant.params, secondes: Math.round(((courant.fin ? courant.demarre + courant.fin.secondes * 1000 : Date.now()) - courant.demarre) / 1000), progression: courant.progression, phase: courant.phase || null, id: courant.id, fin: courant.fin, lignes: courant.lignes.slice(-120) });
    }
    if (req.method === 'POST' && chemin === '/api/lancer') { lancer(await corps(req)); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && chemin === '/api/annuler') { if (courant && courant.fin === null) courant.enfant.kill(); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && chemin === '/api/reindexer') return json(res, 200, { tests: historique.reindexer().length });
    const c = chemin.match(/^\/api\/carte\/(servant|equip|hero|dungeon)\/([\w-]+)$/);
    if (req.method === 'GET' && c) { const svg = require('./cartes-svg').carte(c[1], c[2]); return svg ? json(res, 200, { svg }) : json(res, 404, { erreur: 'Carte introuvable.' }); }
    const m = chemin.match(/^\/api\/tests\/([\w-]+)$/);
    if (req.method === 'DELETE' && m) {
      const rep = path.join(historique.dossierHistorique, m[1]);
      if (!fs.existsSync(path.join(rep, 'meta.json'))) return json(res, 404, { erreur: 'Test introuvable.' });
      fs.rmSync(rep, { recursive: true }); historique.reindexer(); return json(res, 200, { ok: true });
    }
    json(res, 404, { erreur: 'Inconnu.' });
  } catch (e) { json(res, 400, { erreur: e.message }); }
}

function statique(req, res, chemin) {
  let rel = decodeURIComponent(chemin);
  if (rel.endsWith('/')) rel += 'index.html';
  const parts = rel.split('/').filter(Boolean);
  if (parts.some(p => p.startsWith('.') || p === '..') || INTERDITS.has(parts[0])) { res.writeHead(404); return res.end('Introuvable'); }
  const f = path.join(racine, ...parts);
  if (!f.startsWith(racine + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('Introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}

http.createServer((req, res) => {
  const chemin = new URL(req.url, 'http://localhost').pathname;
  if (chemin.startsWith('/api/')) return api(req, res, chemin);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  statique(req, res, chemin);
}).listen(PORT, '127.0.0.1', () => {
  historique.reindexer();
  console.log(`Site local : http://localhost:${PORT}/   (page Test : http://localhost:${PORT}/site/tests.html)`);
});
