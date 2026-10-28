// Régénère tout ce qui dérive de prototype/donnees.js : CARTES.md, les pages de cartes, les valeurs des pages de règles, puis la simulation.
// À relancer après toute modification de prototype/donnees.js ou moteur.js : node outils/tout-generer.js
//
// Valeurs des pages écrites à la main : entourer le chiffre d'un <span data-d="NOM">7</span> ; le script réécrit le contenu.
// Suffixe :mot pour l'écrire en lettres (data-d="PROPOSALS:mot" -> « trois »). Noms disponibles : voir VALEURS.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const run = f => process.stdout.write(execFileSync('node', [path.join(__dirname, f)], { encoding: 'utf8' }));

run('exporter-cartes.js');
run('generer-serviteurs.js');

const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
  + '\n({ MAX_BOARD, MAX_RANK, MAX_LEVEL, HAND_MAX, PROPOSALS, FUSION_COST, FUSION_STEP, PROPHECY_COST, FATIGUE_START, BOSS_BOARDS, levelCost });';
const D = vm.runInNewContext(code, { Math, console });
const VALEURS = {
  MAX_BOARD: D.MAX_BOARD, MAX_RANK: D.MAX_RANK, MAX_LEVEL: D.MAX_LEVEL, HAND_MAX: D.HAND_MAX, PROPOSALS: D.PROPOSALS,
  FUSION_COST: D.FUSION_COST, FUSION_STEP: D.FUSION_STEP, PROPHECY_COST: D.PROPHECY_COST, FATIGUE_START: D.FATIGUE_START,
  BOSS_BOARDS: D.BOSS_BOARDS.length,
  LEVEL_COST_BASE: D.levelCost(0)   // niveau N -> N+1 coûte N + LEVEL_COST_BASE
};
const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

let changed = 0;
['regles.html', 'index.html'].forEach(f => {
  const file = path.join(root, f), src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/(<span data-d="([A-Z_]+)(:mot)?">)[^<]*(<\/span>)/g, (m, open, name, mot, close) => {
    if (!(name in VALEURS)) throw new Error(`${f} : valeur inconnue « ${name} » (voir VALEURS dans tout-generer.js)`);
    const v = VALEURS[name];
    return open + (mot ? MOTS[v] : v) + close;
  });
  if (out !== src) { fs.writeFileSync(file, out); changed++; console.log(`${f} : valeurs mises à jour`); }
});
console.log(changed ? '' : 'Pages de règles : valeurs déjà à jour.');

run('simuler.js');
