// Charge le vrai code du prototype (données, moteur, interface) dans un contexte Node avec un faux DOM.
// Sert à outils/simuler.js (détection de plantages) et à outils/equilibrage.js (statistiques d'équilibrage).
//
// charger({ graine, rapide }) :
//  - graine : si fournie, Math.random() du jeu devient déterministe (même graine = même partie) ;
//  - rapide : coupe le rendu et les animations (les combats se règlent aussitôt), pour jouer des milliers de parties.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype') + path.sep;

// Générateur pseudo-aléatoire mulberry32.
function generateur(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function charger({ graine, rapide } = {}) {
  const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} });
  const jeu = { timers: [], mem: {} };
  const M = Object.create(Math);
  jeu.semer = n => { M.random = generateur(n); };
  if (graine != null) jeu.semer(graine);
  const ctx = {
    AWGfx: require(dir + 'svg.js'), console, Math: M, navigator: { userAgent: 'node' },
    document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), head: el(), addEventListener() {} },
    window: { scrollY: 0, scrollTo() {}, addEventListener() {} },
    setTimeout: f => jeu.timers.push(f), clearTimeout() {},
    localStorage: { getItem: k => (k in jeu.mem ? jeu.mem[k] : null), setItem: (k, v) => { jeu.mem[k] = String(v); }, removeItem: k => { delete jeu.mem[k]; } }
  };
  ctx.self = ctx; vm.createContext(ctx);
  const code = ['donnees.js', 'moteur.js', 'sauvegarde.js', 'animations.js', 'stats.js', 'interface.js'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n')
    + '\n;playCube = (roll, onLand) => { if (onLand) onLand(); };\n;playForge = (uid, def, onApply, onLand) => { onApply(); onLand(); };   // pas de DOM réel : le dé « arrive » aussitôt'
    + (rapide ? `
;render = () => {};
;playPatch = (hero, uid, x, onApply, onLand) => { onApply(); onLand(); };
;playHits = (hits, hold, end) => end();
;startCombatUI = () => { const res = runCombat(UI.g.board, UI.g.bossTeams[UI.g.bossCur].board, UI.g); UI.pb = { res, i: 0, speed: 0, done: false, lines: null, phase: 'hit', lunge: null }; UI.screen = 'combat'; finishPb(); };` : '')
    + `
;globalThis.__xf = null;   // type de Boss imposé pour les tests (voir jeu.forcerExtra)
;{ const orig = drawBossExtra; drawBossExtra = (d, n = 2) => {
  if (!globalThis.__xf) return orig(d, n);
  const fixes = [d.type, ...d.minis], autres = [...ALL_TYPES].sort(() => Math.random() - 0.5).filter(t => !fixes.includes(t) && t !== globalThis.__xf);
  return [globalThis.__xf, ...autres].slice(0, n);
}; }`
    + '\n;globalThis.X = { IDENTIFIANTS, SPECIES, ARCHETYPES, mkServant, grantPr, ALL_TYPES, SAVE, UI, ACT, render, HEROES, DUNGEONS, SERVANTS, EQUIPS, placeServant, applyEquip, debugReport, offerKind, copiesOf, ACTIVES, handFull, powerOf, cardScore, skillsOf, battlecriesOf, MAX_BOARD, MAX_LEVEL, HAND_MAX, levelCost, isPr };';
  vm.runInContext(code, ctx);
  jeu.X = ctx.X; jeu.ctx = ctx;
  jeu.forcerExtra = t => { ctx.__xf = t || null; };   // impose un des deux types aléatoires du Boss (null : tirage normal)
  jeu.reinitStockage = () => { jeu.mem = {}; };   // le jeu garde un compteur de victoires dans le stockage local : on le remet à zéro entre deux parties
  return jeu;
}
module.exports = { charger, generateur };
