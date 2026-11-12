// Strategies of the Boss boards (strategies.json, spec documentation/mecaniques/strategies.md): the layers (engine, mod, dungeon, board), the overrides, the pools,
// the strategy "random" that fits any mod, and the validation. Usage: node tools/check-strategies.js
'use strict';
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const { load } = require('./load-game'), core = require('../site/editor-core.js'), MOD = require('./mod');
const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, dataset: {}, querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({}), setAttribute() {}, focus() {} };
const other = () => ({ ...app, innerHTML: '' });
const game = load({ seed: 7, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } });
const X = game.X, names = list => list.map(s => s.name);
const list = MOD.read('strategies').list, ids = Object.keys(list);

// 1. the mod's default (a pool in Atlas Wanderer): one strategy per board, different from board to board while the pool allows it
let s = X.strategiesFor({}, 3);
if (new Set(names(s)).size !== Math.min(3, ids.length)) fail(`the default pool must give different strategies (${names(s)})`);
// 2. the dungeon names one; an override rewrites only what it says
s = X.strategiesFor({ strategy: ids[0] }, 3);
if (!s.every(x => x.name === ids[0] && x.kind === 'parametric')) fail('a dungeon strategy must apply to every board');
s = X.strategiesFor({ strategy: { use: ids[0], override: { want: { base: 9 } } } }, 1)[0];
if (s.want.base !== 9 || s.want.per !== list[ids[0]].want.per || s.equipP !== list[ids[0]].equipP) fail(`an override must change only the fields it names (${JSON.stringify(s)})`);
if (list[ids[0]].want.base === 9) fail('the override changed the strategy of the mod');
// 3. one entry per board; null keeps the dungeon's
s = X.strategiesFor({ strategy: ids[0], strategies: [ids[1], null, { use: ids[2], override: { equipP: 1 } }] }, 3);
if (s[0].name !== ids[1] || s[1].name !== ids[0] || s[2].name !== ids[2] || s[2].equipP !== 1) fail(`the strategy of each board is wrong (${names(s)})`);
// 4. a pool in a dungeon; the engine's own strategy
s = X.strategiesFor({ strategy: { pool: [ids[0], ids[1]] } }, 2);
if (new Set(names(s)).size !== 2) fail('a pool must not give the same strategy twice while it has others');
if (X.resolveStrategy('random').kind !== 'random') fail('the strategy "random" is built into the engine');
let threw = false; try { X.resolveStrategy('nope'); } catch (e) { threw = true; } if (!threw) fail('an unknown strategy must be refused');
// 5. the strategy "random" plays whole games of this mod
const { UI, ACT, Z } = X;
for (let seed = 1; seed <= 8; seed++) {
  const g2 = load({ seed, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } }), Y = g2.X;
  Object.values(Y.DUNGEONS).forEach(d => { d.strategy = 'random'; });
  Y.render(); Y.ACT.selDungeon({ id: Object.keys(Y.DUNGEONS)[seed % 4] }); Y.ACT.toHeroes(); Object.keys(Y.HEROES).slice(seed, seed + 2).forEach(id => Y.ACT.selHero({ id })); Y.ACT.start();
  let grew = false;
  for (let room = 1; room <= 6 && Y.UI.screen !== 'endScreen'; room++) {
    if (!Y.UI.g.bossTeams.every(t => t.strategy.kind === 'random')) fail('the boards do not follow the dungeon');
    if (Y.UI.g.bossTeams.some(t => t[Y.Z.field].length > Y.MAX_BOARD)) fail('a board holds more than the maximum');
    if (Y.UI.g.bossTeams.some(t => t[Y.Z.field].length > 1)) grew = true;
    Y.GAME.add(Y.UI.g, 'money', 6); Y.ACT.buyServant(); if (Y.UI.rf.offer) Y.ACT.pickOffer({ i: 0 });
    for (let k = 0; k < 6 && (Y.UI.rf.reward || Y.UI.rf.promise); k++) { if (Y.UI.rf.reward) Y.ACT.pickReward({ i: 0 }); else Y.ACT.pickPromise({ i: 0 }); }
    Y.ACT.finishReinforcement(); while (!Y.UI.pb.done && g2.timers.length) g2.timers.shift()(); Y.ACT.next();
  }
  if (!grew && seed > 3) fail('the strategy "random" never bought a card');
}
// 6. validation
const servantIds = Object.keys(MOD.read('servants').cards);
if (core.validateStrategies(MOD.read('strategies'), servantIds).length) fail(`the strategies of the mod are refused: ${core.validateStrategies(MOD.read('strategies'), servantIds)[0]}`);
const file = (f) => { const c = JSON.parse(JSON.stringify(MOD.read('strategies'))); f(c); return core.validateStrategies(c, servantIds).length > 0; };
if (!file(c => { delete c.default; })) fail('a file with no default is accepted');
if (!file(c => { c.default = 'nope'; })) fail('a default that names nothing is accepted');
if (!file(c => { c.list.random = { kind: 'random' }; })) fail('a strategy named like a built-in one is accepted');
if (!file(c => { c.list[ids[0]].kind = 'magic'; })) fail('an unknown kind is accepted');
if (!file(c => { c.list[ids[0]].equipP = 2; })) fail('a probability above 1 is accepted');
if (!file(c => { c.list[ids[0]].rooms = [[]]; })) fail('a field of another kind is accepted');
console.log(`✓ strategies: engine, mod, dungeon and board layers, overrides that change only what they name, pools without repetition, "random" plays 8 whole games, validation.`);
