// Importe dans tests/historique/ des résultats d'équilibrage produits avant la mise en place de l'historique (ou ailleurs).
// Usage : node outils/importer-test.js <dossier-source> --echelle=massif [--date=2026-11-08T10:22:00] [--note="..."] [--secondes=N]
// Le dossier source contient lieutenants.json, serviteurs.json, equipements.json, donjons.json (et leurs .csv / rapport-*.txt).
// Les empreintes (données, bot) et le commit sont ceux de l'état actuel du dépôt : à n'utiliser que si le code n'a pas changé depuis le test.
'use strict';
const fs = require('fs'), path = require('path');
const h = require('./historique');
const args = process.argv.slice(2), src = args.find(a => !a.startsWith('--'));
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
if (!src || !fs.existsSync(src)) { console.error('Usage : node outils/importer-test.js <dossier-source> --echelle=massif [--date=...] [--note=...]'); process.exit(2); }
const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(src, f), 'utf8')); } catch (e) { return null; } };
const L = lire('lieutenants.json'), S = lire('serviteurs.json'), E = lire('equipements.json'), D = lire('donjons.json');
const echelle = opt('echelle', (L || S || E || D).options.echelle);
const date = opt('date') ? new Date(opt('date')) : fs.statSync(path.join(src, 'lieutenants.json')).mtime;
const opts = { echelle, facteur: 1, graine: (L || S || E || D).options.graine, strategies: L ? L.options.strategies : D.options.strategies, strategiesCartes: S ? S.options.strategies : E.options.strategies,
  seuil: 4, note: opt('note', ''), demande: ['lieutenants', 'serviteurs', 'equipements', 'donjons'].filter((p, i) => [L, S, E, D][i]), importe: true };
const t = h.creerTest(opts, { date });
for (const f of fs.readdirSync(src)) if (/^(lieutenants|serviteurs|equipements|donjons)(-paires)?\.(json|csv)$|^rapport-.*\.txt$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(t.dossier, f));
let precedent = date;
// Taille de chaque phase, retrouvée dans la première ligne du rapport (« = 237600 parties »).
for (const p of opts.demande) {
  const r = fs.existsSync(path.join(t.dossier, `rapport-${p}.txt`)) ? fs.readFileSync(path.join(t.dossier, `rapport-${p}.txt`), 'utf8').split('\n')[0] : '', m = r.match(/= (\d+) parties/);
  // Durée approximative : écart entre les dates des rapports successifs (le premier part de la date de début).
  const fin = fs.existsSync(path.join(src, `rapport-${p}.txt`)) ? fs.statSync(path.join(src, `rapport-${p}.txt`)).mtime : date;
  t.meta.phases[p] = { parties: m ? +m[1] : 0, secondes: Math.max(0, Math.round((fin - precedent) / 1000)) };
  precedent = fin; t.meta.secondes = Math.round((fin - date) / 1000);
}
t.sauver();
h.reindexer();
console.log(`Importé : tests/historique/${t.id} (${opts.demande.join(', ')})`);
