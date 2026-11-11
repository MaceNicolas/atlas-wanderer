// Simulation of games without a browser: loads the real prototype code with a fake DOM,
// plays games at random (purchases, offers, fusions, equipment, combats) and reports
// any exception or any combat that does not end.
// Usage: node tools/simulate.js [games=300] [rooms=6]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype') + path.sep;
const games = +process.argv[2] || 300, rooms = +process.argv[3] || 6;

const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, scrollHeight: 0, dataset: {} });
let timers = [];
const ctx = {
  AWGfx: require(dir + 'svg.js'), console, Math, navigator: { userAgent: 'node' },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), head: el(), addEventListener() {} },
  window: { scrollY: 0, scrollTo() {}, addEventListener() {} },
  setTimeout: f => timers.push(f), clearTimeout() {},
  localStorage: (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })()
};
ctx.self = ctx; vm.createContext(ctx);
const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js', 'save.js', 'animations.js', 'stats.js', 'ui.js'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n')
    + require('./engine-data').installScript()
  + '\n;playCube = (roll, onLand) => { if (onLand) onLand(); };\n;playForge = (uid, def, onApply, onLand) => { onApply(); onLand(); };   // pas de DOM réel : le dé « arrive » aussitôt\n;globalThis.X = { SAVE, UI, ACT, render, HEROES, DUNGEONS, placeServant, applyEquip, canEquip, debugReport };';
vm.runInContext(code, ctx);
const { SAVE, UI, ACT, render, HEROES, DUNGEONS, placeServant, applyEquip, canEquip, debugReport } = ctx.X;

const rnd = n => Math.floor(Math.random() * n);
const problemes = {};
const note = (k, report) => { (problemes[k] = problemes[k] || { n: 0, report }).n++; };
for (let k = 0; k < games; k++) {
  let step = '';
  try {
    UI.sel.heroes = Object.keys(HEROES).sort(() => Math.random() - .5).slice(0, 2);
    UI.sel.dungeon = Object.keys(DUNGEONS)[k % Object.keys(DUNGEONS).length];
    ACT.start();
    for (let room = 1; room <= rooms && UI.screen !== 'end'; room++) {
      const g = UI.g;
      for (let tour = 0; tour < 40; tour++) {
        const rf = UI.rf; step = `salle ${room} : renfort`;
        if (rf.prophecy) { ACT.pickProphecy({ i: rnd(rf.prophecy.cards.length) }); continue; }   // the flow waits for Hal Ana's prophecy to be chosen
        if (rf.reward) { ACT.pickReward({ i: rnd(rf.reward.cards.length) }); continue; }
        if (rf.offer) { ACT.pickOffer({ i: rnd(rf.offer.cards.length) }); continue; }
        if (g.hand.length && Math.random() < .8) {
          const i = rnd(g.hand.length), h = g.hand[i];
          if (h.kind === 'servant' && g.board.length < 7) { placeServant(g, i, null, () => {}); render(); continue; }
          if (h.kind === 'equip') { const fits = g.board.filter(x => canEquip(x, h.def)); if (fits.length) { applyEquip(fits[rnd(fits.length)], h.def); g.hand.splice(i, 1); render(); continue; } }
        }
        if (g.datacrons < 1) break;
        const r = Math.random(); r < .45 ? ACT.buyServant() : r < .7 ? ACT.buyEquipment() : ACT.buyLevel(); render();
      }
      // Save: the reloaded game must be identical to the game in progress (same JSON, same catalog entries).
      step = `salle ${room} : sauvegarde`;
      { const a = SAVE.peek(), b = SAVE.load(), j = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !isFinite(v) ? String(v) : v);
        if (!a || !a.ok || !b) note(`${step} : sauvegarde illisible`, JSON.stringify(a));
        else if (j(b.g) !== j(UI.g) || j(b.rf) !== j(UI.rf)) note(`${step} : la partie rechargée diffère`, debugReport());
        else if (b.g.heroes.some((h, i) => h.def !== UI.g.heroes[i].def) || b.g.dungeon !== UI.g.dungeon) note(`${step} : fiches du catalogue dupliquées`, debugReport());
        else if (b.g.pr && b.g.pr.s && b.g.hand.concat(b.g.board.map(s => ({ s }))).some(h => h.s && h.s.pr && h.s !== b.g.pr.s)) note(`${step} : modèle PR dupliqué`, debugReport()); }
      step = `salle ${room} : lancement`; ACT.finishReinforcement();
      step = `salle ${room} : combat`;
      for (let c = 0; !UI.pb.done; c++) { const f = timers.shift(); if (!f || c > 5000) { note(`${step} ne se termine pas`, debugReport()); break; } f(); }
      for (let a = 0; UI.adapt.length && a < 50; a++) ACT.pickAdapt({ i: rnd(UI.adapt[0].options.length) });
      if (UI.adapt.length) note(`salle ${room} : adaptation bloquée`, debugReport());
      step = `salle ${room} : suite`; ACT.next(); timers = [];
    }
  } catch (e) { note(`${step} : ${(e.stack || e).toString().split('\n').slice(0, 3).join(' | ')}`, debugReport()); }
}
const keys = Object.keys(problemes);
console.log(`${games} parties simulées, ${keys.length} problème(s) distinct(s).`);
keys.forEach(c => console.log(`\n✗ ${problemes[c].n}× ${c}\n${problemes[c].report}`));
process.exit(keys.length ? 1 : 0);
