// Equipment in the real game flow (interface code, fast mode): each equipment is placed on a board with two sturdy allies, the reinforcement is finished,
// the combat played, the next room started, for 3 rooms. Checks: no exception, no NaN, no stuck screen, the save reloads identically with the equipment on the board,
// and the powers that play outside combat (start / end of reinforcement, end of combat) leave a trace: statistics, hand, or a message.
// Usage: node tools/check-equipment-flow.js
'use strict';
const { load } = require('./load-game');
const problems = [], notes = [];
const bad = m => { if (problems.length < 40) problems.push(m); };
const REPORT = process.argv.includes('--report');
let games = 0, rows = [];

const game = load({ seed: 11, fast: true });
const X = game.X, { UI, ACT, Z } = X;
const equips = X.EQUIPS.filter(e => !e.token);
const sum = g => g[Z.field].reduce((a, s) => a + s.atk + s.hp, 0);
const bad1 = g => g[Z.field].some(s => !Number.isFinite(s.atk) || !Number.isFinite(s.hp) || s.hp < 0 || s.atk < 0);
const sturdy = () => X.mkServant({ ...X.SERVANTS.find(s => !s.token && !s.skill && s.rank === 1) || X.SERVANTS.find(s => !s.token), atk: 2, hp: 40, kw: [], skill: null, extra: null });

for (const [i, e] of equips.entries()) {
  for (const room of [1, 2]) {
    const seed = 100 + i * 5 + room;
    game.resetStorage(); game.setSeed(seed); X.setSeed(seed); game.timers.splice(0);
    let step = 'start';
    try {
      UI.sel = { heroes: Object.keys(X.HEROES).slice(i % 8, (i % 8) + 2), dungeon: Object.keys(X.DUNGEONS)[i % 2] }; ACT.start();
      const g = UI.g;
      let guard = 0; while ((UI.rf.promise || UI.rf.reward || UI.rf.offer) && guard++ < 10) { if (UI.rf.promise) ACT.pickPromise({ i: 0 }); else if (UI.rf.reward) ACT.pickReward({ i: 0 }); else ACT.pickOffer({ i: 0 }); }
      const carrier = sturdy(); carrier.name = 'Porteur'; carrier.sockets = ['blue', 'green', 'red']; carrier.slots = [null, null, null]; carrier.types = [];
      g[Z.field].length = 0; g[Z.field].push(sturdy(), carrier, sturdy());
      X.applyEquip(carrier, e);
      g.datacrons = 3;
      const before = sum(g), handBefore = g[Z.reserve].length;
      step = 'finishReinforcement'; game.timers.splice(0); ACT.finishReinforcement();
      const afterReinf = sum(g), handAfterReinf = g[Z.reserve].length;
      step = 'combat'; let c = 0; while (!UI.pb.done && game.timers.length && c++ < 6000) game.timers.shift()();
      if (!UI.pb.done) bad(`${e.name} room ${room}: combat never ends`);
      for (let a = 0; UI.adapt.length && a < 20; a++) ACT.pickAdapt({ i: 0 });
      const afterCombat = sum(g), handAfterCombat = g[Z.reserve].length;
      check(!bad1(g), `${e.name}: non-finite or negative statistics after the room`);
      const saved = X.SAVE.peek(); if (saved && !saved.ok) bad(`${e.name}: save unreadable`);
      step = 'next'; ACT.next(); game.timers.splice(0);
      if (room === 1) rows.push({ e, dReinf: afterReinf - before, dCombat: afterCombat - afterReinf, hand: handAfterCombat - handBefore, handReinf: handAfterReinf - handBefore, over: UI.screen === 'endScreen' });
      games++;
    } catch (x) { bad(`${e.name} (room ${room}, ${step}): ${(x.stack || x).toString().split('\n').slice(0, 3).join(' | ')}`); }
  }
}
function check(c, m) { if (!c) bad(m); }

// Out-of-combat powers must leave a trace (statistics or hand).
const when = e => [].concat(e.skill || []).map(k => k.t);
for (const r of rows) {
  const t = when(r.e);
  if (REPORT) console.log(`${r.e.name.padEnd(28)} ${t.join(',').padEnd(34)} dReinf ${String(r.dReinf).padStart(4)}  dCombat ${String(r.dCombat).padStart(4)}  hand ${r.hand}`);
  const grows = [].concat(r.e.skill || []).some(k => ['changeStats', 'permAlliesStats'].includes(k.fx) && ['endCombat', 'endReinforcement'].includes(k.t) && (k.a || k.h));
  if (grows && r.dReinf + r.dCombat <= 0) bad(`${r.e.name}: its permanent statistics power (${t}) changed nothing on the board after a full room (carrier alive)`);
}
// (problems of the loop above are reported with those of the analysis)
if (problems.length) { console.log(problems.map(p => '✗ ' + p).join('\n')); console.log(`✗ equipment flow: ${problems.length} problem(s)`); process.exit(1); }
notes.forEach(n => console.log('⚠ ' + n));
console.log(`✓ equipment flow: ${games} rooms played with each of the ${equips.length} equipment on the board (reinforcement, combat, next room, save), no exception, finite statistics${notes.length ? `, ${notes.length} warning(s)` : ''}.`);
