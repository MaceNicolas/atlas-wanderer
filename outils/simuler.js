// Simulation de parties sans navigateur : charge le vrai code du prototype avec un faux DOM,
// joue des parties au hasard (achats, offres, fusions, équipements, combats) et signale
// toute exception ou tout combat qui ne se termine pas.
// Usage : node outils/simuler.js [parties=300] [salles=6]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype') + path.sep;
const parties = +process.argv[2] || 300, salles = +process.argv[3] || 6;

const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {} }, appendChild() {}, remove() {}, animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} });
let timers = [];
const ctx = {
  AWGfx: require(dir + 'svg.js'), console, Math, navigator: { userAgent: 'node' },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), addEventListener() {} },
  window: { scrollY: 0, scrollTo() {}, addEventListener() {} },
  setTimeout: f => timers.push(f), clearTimeout() {}
};
ctx.self = ctx; vm.createContext(ctx);
const code = ['donnees.js', 'moteur.js', 'animations.js', 'interface.js'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n')
  + '\n;playCube = (roll, onLand) => { if (onLand) onLand(); };   // pas de DOM réel : le dé « arrive » aussitôt\n;globalThis.X = { UI, ACT, render, HEROES, DUNGEONS, placeServant, applyEquip, debugReport };';
vm.runInContext(code, ctx);
const { UI, ACT, render, HEROES, DUNGEONS, placeServant, applyEquip, debugReport } = ctx.X;

const rnd = n => Math.floor(Math.random() * n);
const problemes = {};
const note = (k, rapport) => { (problemes[k] = problemes[k] || { n: 0, rapport }).n++; };
for (let k = 0; k < parties; k++) {
  let etape = '';
  try {
    UI.sel.heroes = Object.keys(HEROES).sort(() => Math.random() - .5).slice(0, 2);
    UI.sel.dungeon = Object.keys(DUNGEONS)[k % Object.keys(DUNGEONS).length];
    ACT.start();
    for (let room = 1; room <= salles && UI.screen !== 'end'; room++) {
      const g = UI.g;
      for (let tour = 0; tour < 40; tour++) {
        const rf = UI.rf; etape = `salle ${room} : renfort`;
        if (rf.reward) { ACT.pickReward({ i: rnd(rf.reward.cards.length) }); continue; }
        if (rf.offer) { ACT.pickOffer({ i: rnd(rf.offer.cards.length) }); continue; }
        if (g.hand.length && Math.random() < .8) {
          const i = rnd(g.hand.length), h = g.hand[i];
          if (h.kind === 'servant' && g.board.length < 7) { placeServant(g, i, null, () => {}); render(); continue; }
          if (h.kind === 'equip' && g.board.length) { applyEquip(g.board[rnd(g.board.length)], h.def); g.hand.splice(i, 1); render(); continue; }
        }
        if (g.datacrons < 1) break;
        const r = Math.random(); r < .35 ? ACT.buyServant() : r < .7 ? ACT.buyEquip() : ACT.buyLevel(); render();
      }
      etape = `salle ${room} : lancement`; ACT.finishRenfort();
      etape = `salle ${room} : combat`;
      for (let c = 0; !UI.pb.done; c++) { const f = timers.shift(); if (!f || c > 5000) { note(`${etape} ne se termine pas`, debugReport()); break; } f(); }
      for (let a = 0; UI.adapt.length && a < 50; a++) { if (rnd(4)) ACT.pickAdapt({ i: rnd(UI.adapt[0].options.length) }); else ACT.skipAdapt(); }
      if (UI.adapt.length) note(`salle ${room} : adaptation bloquée`, debugReport());
      etape = `salle ${room} : suite`; ACT.next(); timers = [];
    }
  } catch (e) { note(`${etape} : ${(e.stack || e).toString().split('\n').slice(0, 3).join(' | ')}`, debugReport()); }
}
const cles = Object.keys(problemes);
console.log(`${parties} parties simulées, ${cles.length} problème(s) distinct(s).`);
cles.forEach(c => console.log(`\n✗ ${problemes[c].n}× ${c}\n${problemes[c].rapport}`));
process.exit(cles.length ? 1 : 0);
