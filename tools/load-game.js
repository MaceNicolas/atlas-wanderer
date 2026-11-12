// Loads the real prototype code (data, engine, interface) into a Node context with a fake DOM.
// Used by tools/simulate.js (crash detection) and tools/balance.js (balance statistics).
//
// load({ seed, fast }):
//  - seed: if given, the game's Math.random() becomes deterministic (same seed = same game);
//  - fast: turns off rendering and animations (combats resolve immediately), to play thousands of games.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype') + path.sep;

// mulberry32 pseudo-random generator.
function generator(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function load({ seed, fast, strict, dom } = {}) {   // dom: { getElementById, createElement, body } replaces the fake page
  const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} });
  const game = { timers: [], mem: {} };
  const M = Object.create(Math);
  game.setSeed = n => { M.random = generator(n); };
  if (seed != null) game.setSeed(seed);
  const ctx = {
    AWGfx: require(dir + 'svg.js'), console, Math: M, navigator: { userAgent: 'node' },
    document: { getElementById: dom ? dom.getElementById : el, querySelector: () => null, querySelectorAll: () => [], createElement: dom ? dom.createElement : el, body: dom ? dom.body : el(), head: el(), addEventListener() {} },
    window: { scrollY: 0, scrollTo() {}, addEventListener() {} },
    setTimeout: f => game.timers.push(f), clearTimeout() {},
    localStorage: { getItem: k => (k in game.mem ? game.mem[k] : null), setItem: (k, v) => { game.mem[k] = String(v); }, removeItem: k => { delete game.mem[k]; } }
  };
  ctx.self = ctx; vm.createContext(ctx);
  const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js', 'save.js', 'animations.js', 'effects.js', 'journal.js', 'stats.js', 'ui-kit.js', 'ui.js'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n')
    + require('./engine-data').installScript()
    + '\n;playDraw = (bag, roll, onLand) => { if (onLand) onLand(); };\n;playDropIn = (uid, def, onApply, onLand) => { onApply(); onLand(); };   // pas de DOM réel : le dé « arrive » aussitôt'
    + (fast ? `
;render = () => {};
;playLightning = (hero, uid, x, onApply, onLand) => { onApply(); onLand(); };
;playHits = (hits, hold, end) => end();
;startCombatUI = () => { const res = GAME.out.combat; UI.pb = { res, i: 0, speed: 0, done: false, lines: null, phase: 'hit', lunge: null }; UI.screen = 'playback'; finishPb(); };` : '')
    + `
;globalThis.__xf = null;   // Boss type forced for the tests (see game.forceExtra)
;{ const orig = drawBossExtra; drawBossExtra = (d, n = 2) => {
  if (!globalThis.__xf) return orig(d, n);
  const fixes = [d.type, ...d.minis], autres = [...ALL_TYPES].sort(() => Math.random() - 0.5).filter(t => !fixes.includes(t) && t !== globalThis.__xf);
  return [globalThis.__xf, ...autres].slice(0, n);
}; }`
    + '\n;globalThis.X = { Z, PROFILE, I18N, IDENTIFIERS, typeName, typesOfGroup, TYPE_GROUPS, setSeed, rng, POWERS, mkServant, grantCompanion, ALL_TYPES, SAVE, UI, ACT, render, HEROES, DUNGEONS, SERVANTS, EQUIPS, GAME, placeServant, takeOffer, drive, FX, EVENTS, JOURNAL, strategiesFor, resolveStrategy, CATALOG, resolveFusion, flushDiscover, applyFx, hit, endCombatFx, applyEquip, canEquip, debugReport, offerKind, copiesOf, ACTIVES, handFull, powerOf, cardScore, skillsOf, battlecriesOf, MAX_BOARD, MAX_LEVEL, HAND_MAX, levelCost, isCompanion };';
  vm.runInContext(code, ctx);
  game.X = ctx.X; game.ctx = ctx;
  // strict: Math.random of the game context throws, so any game rule that still bypasses rng() is caught (seed the game with X.setSeed(n)).
  if (strict) M.random = () => { throw new Error('Math.random called by the game logic: use rng()'); };
  game.forceExtra = t => { ctx.__xf = t || null; };   // forces one of the Boss's two random types (null: normal draw)
  game.resetStorage = () => { game.mem = {}; };   // the game keeps a win counter in local storage: it is reset between two games
  return game;
}
module.exports = { load, generator };
