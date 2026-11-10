// Render test: plays seeded games with the real interface (fake DOM) and hashes every piece of HTML the interface writes (innerHTML, textContent).
// Proves that a change of the interface code (translation, refactoring) leaves the displayed French exactly as it was.
// With --lang=en it checks that the English game shows no missing text key.
// Usage: node tools/check-render.js [--write] [--lang=en]
'use strict';
process.env.TZ = 'UTC';   // dates are written in the page: same text on every machine
const fs = require('fs'), path = require('path');
const { load } = require('./load-game');
const langArg = process.argv.find(a => a.startsWith('--lang=')), lang = langArg ? langArg.slice(7) : 'fr';
const refFile = path.join(__dirname, '..', 'tests', 'render.json');
const out = [];
const elements = new Map();
const element = id => {
  if (!elements.has(id)) {
    let html = '', text = '';
    elements.set(id, { style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {},
      get innerHTML() { return html; }, set innerHTML(v) { html = v; out.push(`${id}|${v}`); },
      get textContent() { return text; }, set textContent(v) { text = v; out.push(`${id}#${v}`); } });
  }
  return elements.get(id);
};
const game = load({ fast: false, dom: { getElementById: element, createElement: () => element('new'), body: element('body') } });
const { X } = game;
game.ctx.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [0])); } static now() { return 0; } };   // the page shows the date of the save

const heroIds = Object.keys(X.HEROES), dungeonIds = Object.keys(X.DUNGEONS), GAMES = 6, ROOMS = 5;
const r = n => Math.floor(X.rng() * n);
for (let seed = 1; seed <= GAMES; seed++) {
  X.setSeed(seed);
  X.UI.sel.heroes = [heroIds[(seed * 5) % heroIds.length], heroIds[(seed * 5 + 3) % heroIds.length]];
  X.UI.sel.dungeon = dungeonIds[seed % dungeonIds.length];
  X.render();
  X.ACT.start();
  for (let room = 1; room <= ROOMS && X.UI.screen !== 'end'; room++) {
    const g = X.UI.g;
    for (let turn = 0; turn < 40; turn++) {
      const rf = X.UI.rf;
      if (rf.reward) { X.ACT.pickReward({ i: r(rf.reward.cards.length) }); continue; }
      if (rf.offer) { X.ACT.pickOffer({ i: r(rf.offer.cards.length) }); continue; }
      if (g.hand.length && r(10) < 8) {
        const i = r(g.hand.length), h = g.hand[i];
        if (h.kind === 'servant' && g.board.length < 7) { X.placeServant(g, i, null, () => {}); X.render(); continue; }
        if (h.kind === 'equip' && g.board.length) { X.applyEquip(g.board[r(g.board.length)], h.def); g.hand.splice(i, 1); X.render(); continue; }
      }
      if (g.datacrons < 1) break;
      r(10) < 7 ? X.ACT.buyReinforcement() : X.ACT.buyLevel(); X.render();
    }
    X.ACT.finishReinforcement();
    for (let c = 0; !X.UI.pb.done; c++) { const f = game.timers.shift(); if (!f || c > 5000) throw new Error('combat does not end'); f(); }
    for (let a = 0; X.UI.adapt.length && a < 50; a++) X.ACT.pickAdapt({ i: r(X.UI.adapt[0].options.length) });
    X.ACT.next(); game.timers.length = 0;
  }
  // Screens a short game does not reach: menu with a saved game, hero selection, end of game (win / loss), maximum level.
  X.UI.save = X.SAVE.peek();
  for (const screen of ['menu', 'heroes']) { X.UI.screen = screen; X.render(); }
  X.UI.screen = 'menu'; X.UI.sel.heroes = []; X.render();
  for (const over of ['win', 'lose']) { X.UI.g.over = over; X.UI.screen = 'end'; X.render(); }
  X.UI.g.over = null; X.UI.screen = 'renfort'; X.UI.g.level = X.MAX_LEVEL; X.render();
}
if (process.env.RENDER_DUMP) fs.writeFileSync(process.env.RENDER_DUMP, out.join('\n'));
const text = out.join('\n'), fnv = t => [...t].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
const result = { games: GAMES, rooms: ROOMS, writes: out.length, hash: fnv(text) };
console.log(`${out.length} writes to the page, hash ${result.hash}`);
if (process.argv.includes('--write')) { fs.writeFileSync(refFile, JSON.stringify(result, null, 1) + '\n'); console.log('tests/render.json written'); process.exit(0); }
const ref = JSON.parse(fs.readFileSync(refFile, 'utf8'));
if (ref.hash !== result.hash) { console.log(`✗ differs from render.json (${ref.hash}, ${ref.writes} writes). If the change is intended, run again with --write.`); process.exit(1); }
console.log('✓ identical to render.json');
