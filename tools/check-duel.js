// The second mod (duel): a mod with fewer features than Atlas Wanderer must load, validate, boot and play without a change to the engine.
// Runs the checks of the mods, the boot of the page, simulated games and a pass over every screen, all on the mod "duel" (tools/make-duel-mod.js builds it).
// Usage: node tools/check-duel.js
'use strict';
const { spawnSync } = require('child_process'), path = require('path');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const env = { ...process.env, AW_MOD: 'duel' };
for (const [tool, args, label] of [['check-data.js', [], 'data of the mod'], ['check-texts.js', [], 'texts of the mod'], ['check-boot.js', [], 'boot of the page'], ['simulate.js', ['30', '6'], 'simulated games']]) {
  const r = spawnSync('node', [path.join(__dirname, tool), ...args], { env, encoding: 'utf8' });
  if (r.status !== 0 || /✗|problème\(s\) distinct\(s\)\./.test(r.stdout) && !/ 0 problème/.test(r.stdout)) fail(`${label} (${tool}) failed on the mod duel:\n${(r.stdout + r.stderr).split('\n').slice(0, 8).join('\n')}`);
}
// Every screen, drawn with the real interface code, with a few moves in the game.
process.env.AW_MOD = 'duel';
const { load } = require('./load-game');
const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} };
const other = () => ({ ...app, innerHTML: '' });
const game = load({ seed: 3, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } });
const X = game.X, { UI, ACT } = X, seen = new Set();
const shot = name => { if (!app.innerHTML || app.innerHTML.length < 50) fail(`the screen ${name} drew nothing`); seen.add(UI.screen); };
X.render(); shot('setup 1');
ACT.selDungeon({ id: Object.keys(X.DUNGEONS)[0] }); ACT.toHeroes(); shot('setup 2');
Object.keys(X.HEROES).slice(0, 2).forEach(id => ACT.selHero({ id })); shot('setup 3');
ACT.start(); shot('reinforcement');
for (let room = 1; room <= 3 && UI.screen !== 'endScreen'; room++) {
  UI.g.datacrons += 6; ACT.buyServant(); if (UI.rf.offer) ACT.pickOffer({ i: 0 }); ACT.buyEquipment(); if (UI.rf.offer) ACT.pickOffer({ i: 0 });
  while (UI.g.hand.some(h => h.kind === 'servant') && UI.g.board.length < X.MAX_BOARD) X.placeServant(UI.g, UI.g.hand.findIndex(h => h.kind === 'servant'), null, () => {});
  X.render(); shot('room');
  ACT.finishReinforcement(); shot('combat');
  while (!UI.pb.done && game.timers.length) game.timers.shift()();
  shot('report'); ACT.next();
}
if (X.MAX_BOARD !== 5) fail(`the board size of the mod (5) is not the one in play (${X.MAX_BOARD})`);
console.log(`✓ duel: the second mod validates, boots and plays (data, texts, boot, 30 simulated games), and draws its ${seen.size} kinds of screens, with a board of ${X.MAX_BOARD}.`);
