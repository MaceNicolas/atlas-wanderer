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
// 4b. a pool of variants { use, override }: each variant keeps its own override, on top of the pool's
s = X.strategiesFor({ strategy: { pool: [{ use: ids[0], override: { equipP: 0.11 } }, { use: ids[0], override: { equipP: 0.22 } }], override: { want: { base: 7 } } } }, 2);
if (new Set(s.map(x => x.equipP)).size !== 2 || !s.every(x => x.want.base === 7 && x.want.per === list[ids[0]].want.per)) fail(`a pool of { use, override } is wrong (${JSON.stringify(s.map(x => [x.equipP, x.want]))})`);
// 4c. preferences: the listed cards first, then the types in order, then the score; none = the score alone
{
  const card = (id, types, score) => ({ id, types, rank: score, atk: 0, hp: 0, kw: [] }), offer = [card('a', ['elk'], 9), card('b', ['sorvane'], 1), card('c', ['dwork'], 5), card('d', ['sorvane', 'elk'], 2)];
  const pick = pref => X.chooseCard(offer, pref, c => c.rank).id;
  if (pick(undefined) !== 'a') fail('with no preference the best score must win');
  if (pick({ types: ['sorvane', 'elk'] }) !== 'd') fail('among the first preferred type, the card that also has the second one must win');
  if (pick({ types: ['elk'] }) !== 'a') fail('a preferred type must beat a better score');
  if (pick({ types: ['dwork', 'elk'] }) !== 'c') fail('the first type of the list must come first');
  if (pick({ cards: ['b'], types: ['elk'] }) !== 'b') fail('a listed card must beat the types');
  if (pick({ cards: ['zzz'], types: ['nope'] }) !== 'a') fail('no match: the score decides');
  // with a weight: a much better card can win; a close one does not
  if (pick({ types: ['elk'], weight: 3 }) !== 'a') fail('a weight must keep the preferred card when it is also the best');
  if (pick({ types: ['sorvane'], weight: 3 }) !== 'a') fail('a small weight must not beat a card that is much better (9 against 1 + 3)');
  if (pick({ types: ['sorvane'], weight: 30 }) !== 'b' && pick({ types: ['sorvane'], weight: 30 }) !== 'd') fail('a big weight must make the preferred card win');
  if (pick({ types: ['dwork', 'sorvane'], weight: 3 }) !== 'a') fail('a weight must stay below a much better card (5 + 3 against 9)');
  if (pick({ types: ['dwork', 'sorvane'], weight: 8 }) !== 'c') fail('a weight that makes up the gap must give the preferred card (5 + 8 against 9)');
  const eq = X.chooseCard([{ id: 'e1', type: 'medic', rank: 1 }, { id: 'e2', type: 'pilot', rank: 5 }], { types: ['medic'] }, c => c.rank).id;
  if (eq !== 'e1') fail('an equipment is matched by its type');
}
// 4d. a board with preferences ends up with them: same seed, with and without the preference for one type of the Boss; the engine plays the real routine
{
  const play = (prefer, type) => {
    const g3 = load({ seed: 11, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } }), Y = g3.X;
    Object.values(Y.DUNGEONS).forEach(d => { d.strategy = { use: ids[0], override: prefer ? { prefer: { servants: { types: [type] } } } : {} }; }); Object.values(Y.BOSSES).forEach(b => { b.strategy = null; });
    Y.render(); Y.ACT.selDungeon({ id: Object.keys(Y.DUNGEONS)[0] }); Y.ACT.toHeroes(); Object.keys(Y.HEROES).slice(0, 2).forEach(id => Y.ACT.selHero({ id })); Y.ACT.start();
    for (let room = 2; room <= 12; room++) { Y.GAME.add(Y.UI.g, 'turn', 1); Y.UI.g.bossTeams.forEach(t => Y.GAME.add(t, 'money', 8)); Y.bossReinforcement(Y.UI.g); }
    return Y.UI.g.bossTeams.reduce((n, t) => n + t[Y.Z.field].filter(x => !x.fixed && (x.types || []).includes(type)).length, 0);
  };
  const base = play(false, 'engineer'), pref = play(true, 'engineer');
  if (!(pref > base)) fail(`a board that prefers a type must hold more of it (${pref} against ${base})`);
}
// 4e. the strategy of a boss comes before the one of its dungeon, the dungeon's before the mod's default
{
  const boss = { strategy: { use: ids[1] } }, d = { strategy: ids[0], strategies: [ids[2], null] };
  s = X.strategiesFor(d, 3, [boss, boss, {}]);
  if (s[0].name !== ids[1] || s[1].name !== ids[1] || s[2].name !== ids[0]) fail(`a boss strategy must come before the dungeon's (${names(s)})`);
  s = X.strategiesFor(d, 2, [{}, {}]);
  if (s[0].name !== ids[2] || s[1].name !== ids[0]) fail(`without a boss strategy the dungeon's entry for the board applies (${names(s)})`);
}
// 5. the strategy "random" plays whole games of this mod
const { UI, ACT, Z } = X;
for (let seed = 1; seed <= 8; seed++) {
  const g2 = load({ seed, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } }), Y = g2.X;
  Object.values(Y.DUNGEONS).forEach(d => { d.strategy = 'random'; }); Object.values(Y.BOSSES).forEach(b => { b.strategy = null; });   // the strategy of a boss comes before the dungeon's
  Y.render(); Y.ACT.selDungeon({ id: Object.keys(Y.DUNGEONS)[seed % Object.keys(Y.DUNGEONS).length] }); Y.ACT.toHeroes(); Object.keys(Y.HEROES).slice(seed, seed + 2).forEach(id => Y.ACT.selHero({ id })); Y.ACT.start();
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
if (!file(c => { c.list[ids[0]].routine = 'nope'; })) fail('an unknown routine is accepted');
if (!file(c => { c.routines.standard[0].if = [{ near: [1, 2] }]; })) fail('an unknown condition is accepted');
if (!file(c => { c.routines.standard.pop(); })) fail('a routine whose last rule has a condition is accepted');
if (!file(c => { c.routines.standard[0].do = 'fly'; })) fail('an unknown action is accepted');
if (!file(c => { c.routines.standard[0].if = [{ lt: [{ var: 'nope' }, 1] }]; })) fail('an unknown variable is accepted');
if (!file(c => { c.scores.rank = [{ field: 'rank', score: 'card' }]; })) fail('an ambiguous score term is accepted');
if (!file(c => { c.scores.rank = [{ score: 'nope' }]; })) fail('a score that refers to nothing is accepted');
if (!file(c => { c.targets.fixed = { best: 'max', score: 'nope' }; })) fail('a target with no score is accepted');
if (!file(c => { c.list[ids[0]].score = 'nope'; })) fail('a strategy with an unknown score is accepted');
{ const unit = Object.values(MOD.read('servants').cards).length && Object.keys(MOD.read('servants').cards)[0], board = o => file(c => { c.list.swarmTest = { kind: 'board', unit, count: { base: 1, per: 2 }, ...o }; });
  if (board({})) fail('a valid unit and count are refused');
  if (!board({ rooms: [[unit]] })) fail('rooms and unit together are accepted');
  if (!board({ unit: 'nope' })) fail('an unknown unit is accepted');
  if (!board({ count: { base: 0, per: 2 } })) fail('a count with a base of 0 is accepted');
  if (!board({ count: { base: 1, per: 0 } })) fail('a count that grows every 0 rooms is accepted');
  if (!board({ count: undefined })) fail('a unit with no count is accepted');
  if (!board({ unit: { card: unit, powers: [] } })) fail('an empty list of powers is accepted');
  if (!board({ unit: { card: unit, powers: [{ t: 'passive' }] } })) fail('a power with no fx is accepted');
  if (!board({ unit: { card: unit, extra: 1 } })) fail('an unknown field of the unit is accepted'); }
if (file(c => { c.list[ids[0]].prefer = { servants: { types: ['elk', 'sorvane'], cards: [servantIds[0]] }, equipment: { types: ['medic'] } }; })) fail('valid preferences are refused');
if (!file(c => { c.list[ids[0]].prefer = { servants: { cards: ['nope'] } }; })) fail('preferences for an unknown servant are accepted');
if (!file(c => { c.list[ids[0]].prefer = { servants: { types: ['elk'], weight: 0 } }; })) fail('a weight of 0 is accepted');
if (file(c => { c.list[ids[0]].prefer = { servants: { types: ['elk'], weight: 25 } }; })) fail('a valid weight is refused');
if (!file(c => { c.list[ids[0]].prefer = { weapons: {} }; })) fail('preferences for an unknown kind are accepted');
if (!file(c => { c.list[ids[0]].prefer = { servants: { types: ['elk', 'elk'] } }; })) fail('the same preferred type twice is accepted');
if (!file(c => { c.list[ids[0]].prefer = { servants: { color: 1 } }; })) fail('an unknown preference field is accepted');
console.log(`✓ strategies: engine, mod, dungeon and board layers, overrides that change only what they name, pools without repetition, "random" plays 8 whole games, validation (routines included).`);
