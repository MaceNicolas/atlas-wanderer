// Regenerates everything derived from prototype/data.js: documentation/cartes.md, the card pages, the values of the rules pages, then the simulation.
// Run again after any change to prototype/data.js or engine.js: node tools/generate-all.js
//
// Card renames only: node tools/generate-all.js --sans-simulation  (skips the simulated games).
//
// Values of hand-written pages: wrap the number in <span data-d="NAME">7</span>; the script rewrites its content.
// Suffix :mot writes it in words (data-d="PROPOSALS:mot" -> « trois »). Available names: see VALEURS.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const run = f => process.stdout.write(execFileSync('node', [path.join(__dirname, f)], { encoding: 'utf8' }));

run('export-cards.js');
run('export-i18n.js');
run('generate-servants.js');

const code = ['data.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
  + '\n({ MAX_BOARD, MAX_RANK, MAX_LEVEL, HAND_MAX, PROPOSALS, FUSION_COST, FUSION_STEP, PROPHECY_COST, FATIGUE_START, BOSS_BOARDS, levelCost });';
const D = vm.runInNewContext(code, { Math, console });
const VALEURS = {
  MAX_BOARD: D.MAX_BOARD, MAX_RANK: D.MAX_RANK, MAX_LEVEL: D.MAX_LEVEL, HAND_MAX: D.HAND_MAX, PROPOSALS: D.PROPOSALS,
  FUSION_COST: D.FUSION_COST, FUSION_STEP: D.FUSION_STEP, PROPHECY_COST: D.PROPHECY_COST, FATIGUE_START: D.FATIGUE_START,
  BOSS_BOARDS: D.BOSS_BOARDS.length,
  LEVEL_COST_BASE: D.levelCost(0)   // level N -> N+1 costs N + LEVEL_COST_BASE
};
const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

let changed = 0;
['site/rules.html', 'index.html'].forEach(f => {
  const file = path.join(root, f), src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/(<span data-d="([A-Z_]+)(:mot)?">)[^<]*(<\/span>)/g, (m, open, name, word, close) => {
    if (!(name in VALEURS)) throw new Error(`${f} : valeur inconnue « ${name} » (voir VALEURS dans generate-all.js)`);
    const v = VALEURS[name];
    return open + (word ? WORDS[v] : v) + close;
  });
  if (out !== src) { fs.writeFileSync(file, out); changed++; console.log(`${f} : valeurs mises à jour`); }
});
console.log(changed ? '' : 'Pages de règles : valeurs déjà à jour.');

if (process.argv.includes('--sans-simulation')) console.log('Simulation sautée.');
else run('simulate.js');
