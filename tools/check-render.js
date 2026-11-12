// Render test: plays a scripted game with a seed and records what the interface draws at every stable point (setup, reinforcement, offers, combat frames, report, end),
// as a fingerprint of the page. The fingerprints are kept in tests/render/baseline.json: a change that is only a refactor of the interface (the same screens built
// another way) must leave them unchanged. A change of the look is made on purpose: node tools/check-render.js --write records the new fingerprints.
// Usage: node tools/check-render.js [--write]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { load } = require('./load-game');
const FILE = path.join(__dirname, '..', 'tests', 'render', 'baseline.json'), OUT = path.join(__dirname, '..', 'temp', 'render');
const write = process.argv.includes('--write');

const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} };
const other = () => ({ ...app, innerHTML: '' });
const game = load({ seed: 7, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } });
const X = game.X, { UI, ACT } = X;
game.setSeed(7); X.setSeed(7);

// The ids of the SVG cards come from a counter: they are renamed in order of appearance so that the fingerprint does not depend on how many cards were drawn before.
// Whitespace between two tags is ignored (indentation of the templates); the text inside the tags is not.
const normalize = html0 => {
  const html = html0.replace(/>\s+</g, '><').trim();
  const ids = [...new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))], at = new Map(ids.map((id, i) => [id, `@${i}`]));
  return html.replace(/(\bid="|url\(#|href="#)([^")]+)/g, (m, lead, id) => lead + (at.get(id) || id));   // only where an id is defined or referred to
};
const marks = {};
const snap = name => { const html = normalize(app.innerHTML); marks[name] = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12); if (write || process.env.AW_DUMP) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name + '.html'), html); } };
const pick = () => { if (UI.rf.offer) ACT.pickOffer({ i: 0 }); };   // (nothing to pick when the purchase was not possible)
const tick = (n = 1) => { for (let i = 0; i < n && game.timers.length; i++) game.timers.shift()(); };

X.render();                                  snap('01-setup-dungeon');
ACT.selDungeon({ id: Object.keys(X.DUNGEONS)[0] }); snap('02-setup-dungeon-chosen');
ACT.toHeroes();                              snap('03-setup-heroes');
const heroes = Object.keys(X.HEROES);
ACT.selHero({ id: heroes[0] });              snap('04-setup-one-hero');
ACT.selHero({ id: heroes[1] });              snap('05-setup-two-heroes');
ACT.start();                                 snap('06-room-1');
for (let room = 1; room <= 3 && UI.screen !== 'endScreen'; room++) {
  const g = UI.g, rf = UI.rf;
  if (rf.promise) { ACT.pickPromise({ i: 0 }); snap(`r${room}-promise-chosen`); }
  g.datacrons += 10;   // enough to buy everything the script needs
  ACT.buyServant();                          snap(`r${room}-offer-servant`);
  pick();                                    snap(`r${room}-hand-1`);
  const firstServant = () => g.hand.findIndex(h => h.kind === 'servant');
  if (firstServant() >= 0 && g.board.length < X.MAX_BOARD) { X.placeServant(g, firstServant(), null, () => {}); X.render(); snap(`r${room}-board-1`); }
  ACT.buyEquipment();                        snap(`r${room}-offer-equipment`);
  pick();                                    snap(`r${room}-hand-2`);
  ACT.buyLevel();                            snap(`r${room}-level`);
  ACT.buyServant(); pick(); X.render(); snap(`r${room}-hand-3`);
  while (firstServant() >= 0 && g.board.length < X.MAX_BOARD) X.placeServant(g, firstServant(), null, () => {});
  X.render();                                snap(`r${room}-board-full`);
  if (room === 3) g.heroes.forEach(h => { h.hp = 0; });   // the last room ends the game
  ACT.finishReinforcement();                 snap(`r${room}-combat-start`);
  for (let i = 0; i < 12 && !UI.pb.done && game.timers.length; i++) { tick(); snap(`r${room}-combat-${i}`); }
  while (!UI.pb.done && game.timers.length) tick();
  snap(`r${room}-report`);
  for (let a = 0; UI.adapt.length && a < 20; a++) { snap(`r${room}-adapt-${a}`); ACT.pickAdapt({ i: 0 }); }
  ACT.next();                                snap(`r${room}-after-next`);
}
// Choices that the main script does not reach: a fusion reward, the discoveries, an Adaptation choice, a promised card.
{
  game.resetStorage && game.resetStorage();
  ACT.restart(); ACT.selDungeon({ id: Object.keys(X.DUNGEONS)[1] }); ACT.toHeroes();
  const halAna = heroes.find(id => X.HEROES[id].power && X.HEROES[id].power.fx === 'prophecy');
  ACT.selHero({ id: halAna }); ACT.selHero({ id: heroes.find(id => id !== halAna) }); ACT.start();
  snap('x1-promise-choice');
  ACT.pickPromise({ i: 0 });                 snap('x2-promise-chosen');
  const g = UI.g, rf = UI.rf, def = X.SERVANTS.find(c => c.rank === 1);
  g.datacrons = 20; for (let i = 0; i < 3; i++) g.hand.push({ kind: 'servant', s: X.mkServant(def) });
  X.resolveFusion(g, rf, () => {});          X.render(); snap('x3-fusion-reward');
  ACT.pickReward({ i: 0 });                  snap('x4-fusion-picked');
  g.choiceQueue = [{ choice: 'discoverEquipment', rank: 2, cards: X.EQUIPS.filter(e => e.rank === 2).slice(0, 3) }]; X.flushDiscover(g, rf); X.render(); snap('x5-discover-equipment');
  ACT.pickReward({ i: 0 });                  snap('x6-discover-picked');
  g.board.length = 0; g.board.push(X.mkServant(def)); g.choiceQueue = [{ choice: 'chooseAlly', a: 2, from: def.name, cards: g.board.slice() }]; X.flushDiscover(g, rf); X.render(); snap('x7-choose-ally');
  ACT.pickReward({ i: 0 });                  snap('x8-ally-picked');
  const elkDef = X.SERVANTS.find(c => c.types.includes('elk') && [].concat(c.skill || []).some(k => k.fx === 'adapt'));
  g.board.length = 0; const elk = X.mkServant(elkDef); g.board.push(elk);
  ACT.finishReinforcement();
  for (let i = 0; i < 60 && !UI.pb.done && game.timers.length; i++) tick();
  UI.adapt = [{ uid: elk.uid, name: elk.name, options: [{ stat: 2, hpStat: true, from: null }, { stat: 2, hpStat: false, from: null }] }]; X.render(); snap('x9-adaptation-choice');
}
snap('99-last-screen');
if (write) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(marks, null, 1) + '\n'); console.log(`✓ render: ${Object.keys(marks).length} fingerprints recorded in tests/render/baseline.json`); process.exit(0); }
const base = JSON.parse(fs.readFileSync(FILE, 'utf8')), bad = Object.keys({ ...base, ...marks }).filter(k => base[k] !== marks[k]);
if (bad.length) { console.log(`✗ the interface changed at ${bad.length} point(s): ${bad.slice(0, 12).join(', ')}\n  (AW_DUMP=1 node tools/check-render.js writes the pages in temp/render/ to compare; --write records the new look)`); process.exit(1); }
console.log(`✓ render: the interface draws the same pages as the recorded ones (${Object.keys(marks).length} points, setup to end).`);
