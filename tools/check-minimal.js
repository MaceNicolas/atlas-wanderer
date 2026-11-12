// The mod "minimal" (tools/make-minimal-mod.js, spec documentation/mecaniques/jeu-minimal.md): the smallest game the engine plays.
// Checks the generic tools on it (data, texts, boot), then plays it with the real interface code: an offer of 3 opens by itself at each reinforcement, the player takes
// one card straight onto the board (by a click, or by dragging it onto a servant to replace it when the board is full), the reinforcement then ends by itself; no money,
// no level, no hand, no rank on the cards; every survivor hits for 1; the enemy board follows the plan of the dungeon (fixed, or growing by a rule); the Boss is killed to win.
// Usage: node tools/check-minimal.js
'use strict';
const { spawnSync } = require('child_process'), path = require('path');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const env = { ...process.env, AW_MOD: 'minimal' };
for (const [tool, label] of [['check-data.js', 'data'], ['check-texts.js', 'texts'], ['check-boot.js', 'boot']]) {
  const r = spawnSync('node', [path.join(__dirname, tool)], { env, encoding: 'utf8' });
  if (r.status !== 0) fail(`${label} (${tool}) failed on the mod minimal:\n${(r.stdout + r.stderr).split('\n').slice(0, 8).join('\n')}`);
}
process.env.AW_MOD = 'minimal';
const { load } = require('./load-game');
const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, dataset: {}, querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({}), setAttribute() {}, focus() {} };
const other = () => ({ ...app, innerHTML: '' });

function play(seed, dungeonName, pick, strategy) {
  const game = load({ seed, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } });
  const X = game.X, { UI, ACT, Z } = X;
  const dungeon = Object.keys(X.DUNGEONS).find(id => X.DUNGEONS[id].name === dungeonName);
  if (strategy) X.DUNGEONS[dungeon].strategy = strategy;
  X.render(); ACT.selDungeon({ id: dungeon }); ACT.toHeroes(); ACT.selHero({ id: Object.keys(X.HEROES)[0] }); ACT.start();
  const stats = { rooms: 0, replaced: 0, boards: [] };
  for (let room = 1; room <= 40 && UI.screen !== 'endScreen'; room++) {
    const g = UI.g, rf = UI.rf;
    if (UI.screen !== 'room') fail(`room ${room}: the screen is ${UI.screen}, not the reinforcement`);
    if (!rf.offer || rf.offer.cards.length !== 3) fail(`room ${room}: the offer of 3 cards did not open by itself`);
    if ('datacrons' in g || 'level' in g || 'coins' in g) fail('the game has a resource it should not have');
    if (g.heroes[0].hp > 5) fail('the hero has more than 5 hit points');
    if (/undefined|NaN/.test(app.innerHTML)) fail(`room ${room}: the screen shows "undefined" or "NaN"`);
    if (g[Z.field].length >= 5) {
      if (X.takeOffer(g, rf, 0, () => {}, null) !== 'full') fail('a click on a full board must ask which servant is replaced');
      if (!rf.offer) fail('the offer must stay open after a click on a full board');
      const at = room % 5; X.takeOffer(g, rf, pick(3), () => {}, { replace: at }); stats.replaced++;
      if (g[Z.field].length !== 5) fail('replacing changed the size of the board');
      X.drive();   // what the interface does after a card is dragged onto the board
    } else ACT.pickOffer({ i: pick(3) });
    if (UI.rf && UI.rf.offer) fail(`room ${room}: the offer is still open after the card was taken`);
    if (g[Z.field].length > 5 || g[Z.reserve].length) fail('the board holds more than 5 cards, or a card is in the hand');
    if (UI.screen !== 'playback') fail(`room ${room}: taking a card should end the reinforcement (screen ${UI.screen})`);
    stats.boards.push(UI.g.bossTeams[UI.g.bossCur][Z.field].map(s => `${s.name} ${s.atk}/${s.hp}`).join(', '));
    const before = UI.g.boss.hp;
    while (!UI.pb.done && game.timers.length) game.timers.shift()();
    ACT.next(); stats.rooms++;
    if (UI.g.boss.hp > before) fail('the Boss healed');
    if (UI.g.boss.hp < before && (before - UI.g.boss.hp) > UI.g[Z.field].length) fail(`the Boss lost ${before - UI.g.boss.hp} hit points: more than one per survivor`);
  }
  if (UI.screen !== 'endScreen') fail(`the game did not end in 40 rooms (${dungeonName})`);
  return { ...stats, won: UI.g.over === 'win', app: app.innerHTML };
}
// The strategy built into the engine plays the enemy board of this game too (its offer opens by a step, not by an action).
for (let seed = 1; seed <= 6; seed++) {
  const r = play(seed, 'Plateau fixe', n => n - 1, 'random');
  if (!r.boards.slice(1).some(b => b.length > 0) || r.boards.some(b => b.split(', ').length > 5)) fail(`the random strategy left a wrong enemy board: ${r.boards.join(' | ')}`);
}
let wins = 0, losses = 0, replaced = 0;
const rnd = seed => { let a = seed; return n => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a % n; }; };
for (const [name] of [['Plateau fixe'], ['Plateau évolutif']]) for (let seed = 1; seed <= 12; seed++) {
  const r = play(seed, name, rnd(seed)); if (r.won) wins++; else losses++; replaced += r.replaced;
  if (name === 'Plateau fixe' && new Set(r.boards).size !== 1) fail(`the fixed enemy board changed between rooms: ${[...new Set(r.boards)].join(' | ')}`);
  if (name === 'Plateau évolutif' && r.rooms >= 3) {
    const sizes = r.boards.map(b => b.split(', ').length); if (sizes.some(n => n !== 1)) fail('the growing board must hold one servant');
    const stat = i => +/(\d+)\/\d+$/.exec(r.boards[i])[1]; if (stat(1) !== stat(0) + 1 || stat(2) !== stat(0) + 2) fail(`the enemy servant must gain +1/+1 each room (${r.boards.slice(0, 3).join(' → ')})`);
  }
}
if (!wins) fail('the Boss was never killed in 24 games'); if (!replaced) fail('no replacement was played: the full-board path is not covered');

// The editor's validation follows the categories of the mod: no rank, no type; the enemy board of a dungeon is checked.
{
  const core = require('../site/editor-core.js'), MOD = require('./mod'), game = MOD.read('game');
  const files = { servants: MOD.read('servants'), heroes: MOD.read('heroes'), dungeons: MOD.read('dungeons'), rules: MOD.read('rules'), strategies: MOD.read('strategies'), vocabulary: MOD.read('vocabulary') };
  const known = core.knownFrom(files, [], [], [], game.categories), ok = (file, c) => core.validateCard(file, c, known).length === 0;
  const servant = Object.values(files.servants.cards)[0], dungeon = Object.values(files.dungeons.cards)[0];
  if (!ok('servants', servant)) fail(`a servant of the mod is refused: ${core.validateCard('servants', servant, known)[0]}`);
  if (ok('servants', { ...servant, rank: 2 })) fail('a rank is accepted on a card of a game that has none');
  if (!ok('dungeons', dungeon)) fail(`a dungeon of the mod is refused: ${core.validateCard('dungeons', dungeon, known)[0]}`);
  if (!ok('dungeons', { boss: { hp: 5 } })) fail('a dungeon with no enemy board and a Boss with no power must be accepted');
  if (!ok('dungeons', { boss: { hp: 5 } })) fail('a dungeon that names no strategy must be accepted');
  for (const [label, bad] of [['an unknown name', 'nope'], ['use and pool together', { use: 'fixedBoard', pool: ['fixedBoard'] }], ['an override of a field the kind has not', { use: 'fixedBoard', override: { want: { base: 1 } } }], ['rooms emptied by an override', { use: 'fixedBoard', override: { rooms: [] } }], ['a fractional growth', { use: 'growingBoard', override: { growth: { atk: 0.5 } } }], ['an empty pool', { pool: [] }]])
    if (ok('dungeons', { ...dungeon, strategy: bad })) fail(`a strategy with ${label} is accepted`);
  if (!ok('dungeons', { ...dungeon, strategy: { use: 'growingBoard', override: { growth: { atk: 2 } } } })) fail('an override of the growth is refused');
  if (!ok('dungeons', { ...dungeon, strategy: 'random', strategies: ['fixedBoard', null] })) fail('a strategy per board is refused');
  if (core.validateStrategies({ list: {} }, null).length === 0) fail('a strategies file with no default is accepted');
  const broken = f => { const g = JSON.parse(JSON.stringify(game)); f(g); return core.validateGame(g, { schema: require('../prototype/game-schema.js'), files: MOD.manifest().files, rules: MOD.read('rules'), texts: MOD.texts('fr') }).length > 0; };
  if (!broken(g => { delete g.state.roles.turn; })) fail('a game with no turn role is accepted');
  if (!broken(g => { g.state.roles.money = 'gold'; })) fail('a money role that names nothing is accepted');
}
console.log(`✓ minimal: validates and boots; an offer of 3 opens by itself and one card goes straight onto the board (5 at most, replacement when full); no money, level, hand or rank; fixed and growing enemy boards as strategies; 24 games (${wins} won, ${losses} lost), ${replaced} replacements.`);
