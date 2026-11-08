// Historique des tests d'équilibrage : un dossier par test dans tests/historique/ (versionné, contrairement à temp/).
//   tests/historique/<id>/meta.json            date, options, commit git, empreintes des données et du bot, parties jouées
//   tests/historique/<id>/<phase>.json|csv     résultats détaillés de chaque phase (lieutenants, serviteurs, equipements, donjons)
//   tests/historique/<id>/rapport-<phase>.txt  le rapport texte, tel qu'affiché dans le terminal
//   tests/historique/index.json                liste résumée de tous les tests (régénérée par reindexer(), jamais à la main)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = path.join(__dirname, '..');
const dossierHistorique = path.join(racine, 'tests', 'historique');

const git = (...a) => { try { return execFileSync('git', a, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; } };
const empreinte = fichiers => {
  const h = crypto.createHash('sha1');
  fichiers.forEach(f => h.update(fs.readFileSync(path.join(racine, f))));
  return h.digest('hex').slice(0, 10);
};
// Empreinte des règles et des cartes (donnees.js, moteur.js) et du joueur automatique : deux tests ne sont comparables que si elles sont égales.
const empreinteDonnees = () => empreinte(['prototype/donnees.js', 'prototype/moteur.js']);
const empreinteBot = () => empreinte(['outils/bot-joueur.js', 'outils/charger-jeu.js']);

// Parties par combinaison selon l'échelle (voir equilibrage.js pour le sens de chaque nombre).
const echelles = {
  petit: { lieutenants: 4, cartes: 1, temoin: 4, donjons: 4, extras: 1 },
  normal: { lieutenants: 60, cartes: 3, temoin: 20, donjons: 60, extras: 3 },
  massif: { lieutenants: 300, cartes: 6, temoin: 60, donjons: 150, extras: 6 }
};

const pad2 = n => String(n).padStart(2, '0');
function nouvelIdentifiant(echelle, date = new Date()) {
  const base = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}-${echelle}`;
  let id = base, n = 2;
  while (fs.existsSync(path.join(dossierHistorique, id))) id = `${base}-${n++}`;
  return id;
}

// Crée le dossier d'un test et renvoie { id, dossier, meta, sauver() }.
function creerTest(options, { dossier = null, date = new Date() } = {}) {
  const id = nouvelIdentifiant(options.echelle, date);
  const rep = dossier || path.join(dossierHistorique, id);
  fs.mkdirSync(rep, { recursive: true });
  const modifie = git('status', '--porcelain', '--', 'prototype/donnees.js', 'prototype/moteur.js', 'outils/bot-joueur.js').length > 0;
  const meta = { id, date: date.toISOString(), ...options, phases: {}, commit: git('rev-parse', '--short', 'HEAD'), modifie, hashDonnees: empreinteDonnees(), hashBot: empreinteBot() };
  const t = { id, dossier: rep, meta, sauver() { fs.writeFileSync(path.join(rep, 'meta.json'), JSON.stringify(meta, null, 1) + '\n'); } };
  t.sauver();
  return t;
}

// Résumé d'un test pour l'index : quelques chiffres de tête par phase, pour s'orienter sans ouvrir les fichiers.
function resume(id) {
  const rep = path.join(dossierHistorique, id);
  const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(rep, f), 'utf8')); } catch (e) { return null; } };
  const meta = lire('meta.json');
  if (!meta) return null;
  const r = { ...meta, tete: {} };
  const L = lire('lieutenants.json'), S = lire('serviteurs.json'), E = lire('equipements.json'), D = lire('donjons.json');
  if (L) r.tete.lieutenants = { victoires: L.global, plusFort: L.lieutenants[0].nom, plusFaible: L.lieutenants[L.lieutenants.length - 1].nom };
  if (S) r.tete.serviteurs = { temoin: S.temoin, tropForts: S.cartes.filter(c => c.verdict.startsWith('▲')).length, tropFaibles: S.cartes.filter(c => c.verdict.startsWith('▼')).length };
  if (E) r.tete.equipements = { temoin: E.temoin, tropForts: E.cartes.filter(c => c.verdict.startsWith('▲')).length, tropFaibles: E.cartes.filter(c => c.verdict.startsWith('▼')).length };
  if (D) r.tete.donjons = { plusFacile: D.donjons.slice().sort((a, b) => b.taux - a.taux)[0].nom, plusDur: D.donjons.slice().sort((a, b) => a.taux - b.taux)[0].nom };
  return r;
}

// Catalogue du jeu actuel (espèces, archétypes, types et PV des lieutenants) : sert à la page Test, qui sépare espèce et archétype.
function ecrireCatalogue() {
  const X = require('./charger-jeu').charger({ rapide: true }).X;
  const lieutenants = Object.fromEntries(Object.entries(X.HEROES).map(([id, h]) => [id, { nom: h.name, types: h.types, hp: h.hp }]));
  fs.writeFileSync(path.join(racine, 'tests', 'catalogue.json'), JSON.stringify({ especes: X.SPECIES, archetypes: X.ARCHETYPES, lieutenants }, null, 1) + '\n');
}

function reindexer() {
  fs.mkdirSync(dossierHistorique, { recursive: true });
  ecrireCatalogue();
  const ids = fs.readdirSync(dossierHistorique).filter(d => fs.existsSync(path.join(dossierHistorique, d, 'meta.json'))).sort();
  const tests = ids.map(resume).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(path.join(dossierHistorique, 'index.json'), JSON.stringify({ tests }, null, 1) + '\n');
  return tests;
}

module.exports = { echelles, dossierHistorique, creerTest, reindexer, empreinteDonnees, empreinteBot, racine };
