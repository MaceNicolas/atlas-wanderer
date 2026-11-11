// Equipment sockets test (documentation/idees/nouvelles.md, section 8): data, placement rules, return to the hand on replacement and fusion.
// Checks: every servant has 0 to 3 valid sockets, every equipment has a color; an equipment only goes in a free socket of its color or a chromatic one
// (exact color first); a refused equipment changes nothing; the replaced servant's equipment goes back to the hand (or breaks); a fusion starts bare
// and gives the equipment back; the bonuses are cancelled exactly.
// Usage: node tools/check-sockets.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ SERVANTS, EQUIPS, mkServant, applyEquip, removeEquips, canEquip, socketIndex, placeServant, resolveFusion, setSeed, BREAK_CHANCE, MAX_SOCKETS })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };

// 1. data
const COLORS = ['blue', 'green', 'red'];
g.SERVANTS.forEach(s => {
  check(Array.isArray(s.sockets) && s.sockets.length <= g.MAX_SOCKETS, `${s.name}: 0 to ${g.MAX_SOCKETS} sockets`);
  s.sockets.forEach(c => check([...COLORS, 'chroma'].includes(c), `${s.name}: unknown socket color ${c}`));
});
g.EQUIPS.forEach(e => check(COLORS.includes(e.color), `${e.name}: it needs a color (blue, green, red)`));

// 2. placement
const eq = (color, atk = 1, hp = 1, extra = {}) => ({ name: 'E-' + color + atk + hp, rank: 1, atk, hp, kw: null, type: 'pilot', color, skill: null, mod: null, ...extra });
const card = (sockets, name = 'Test') => g.mkServant({ ...g.SERVANTS[0], name, atk: 3, hp: 3, kw: [], skill: null, sockets });
let s = card(['blue', 'chroma']);
check(g.canEquip(s, eq('blue')) && !g.canEquip(s, eq('red')) === false, 'a chromatic socket accepts every color');
check(g.socketIndex(s, eq('blue')) === 0, 'the exact color is preferred to a chromatic socket');
s = card(['green', 'red']);
check(!g.applyEquip(s, eq('blue')), 'a blue equipment must be refused by green and red sockets');
check(s.atk === 3 && s.equips.length === 0 && s.slots.every(x => !x), 'a refused equipment must change nothing');
check(g.applyEquip(s, eq('red', 2, 0)) && s.atk === 5 && s.slots[1], 'red equipment goes in the red socket');
check(!g.applyEquip(s, eq('red')), 'a socket holds one equipment only');
check(g.applyEquip(s, eq('green')) && !g.applyEquip(s, eq('green', 5, 5)), 'no more free socket: refused');
check(!g.canEquip(card([]), eq('blue')), 'a servant without socket accepts nothing');
check(g.canEquip(card(['red']), { ...eq('blue'), color: undefined }), 'an equipment without a color (token) fits any socket');
const forced = card([]);
check(g.applyEquip(forced, eq('blue'), true) && forced.atk === 4, 'forced equipment (combat only) needs no socket');

// 3. removal restores the exact bonuses (stats, keyword, skills, drones)
s = card(['blue', 'green', 'chroma']);
const sk = { t: 'startCombat', fx: 'grantShieldAlly', a: 0, h: 0, n: 0 };
g.applyEquip(s, eq('blue', 2, 3, { kw: 'shield', skill: sk, mod: { droneA: 1, droneH: 2 } }));
g.applyEquip(s, eq('green', 1, 0));
const back = g.removeEquips(s);
check(back.length === 2 && s.atk === 3 && s.hp === 3 && s.maxhp === 3 && !s.kw.includes('shield') && s.eqSkills.length === 0 && s.equips.length === 0 && s.droneA === 0 && s.droneH === 0, 'removing the equipment must restore the base servant');
check(s.slots.length === 3 && s.slots.every(x => !x), 'the sockets are empty again');

// 4. replacement: the equipment goes back to the hand, or breaks
const game = () => ({ hand: [], board: [], stats: { equips: 0, servants: 0, discarded: 0, fusions: 0 }, level: 1, types: [], heroes: [] });
const run = (seed, setup) => { g.setSeed(seed); const G = game(); setup(G); return G; };
const newcomer = () => ({ kind: 'servant', s: card(['red'], 'Newcomer') });
let kept = 0, lost = 0;
for (let seed = 1; seed <= 200; seed++) {
  const G = run(seed, G => {
    const old = card(['blue', 'green'], 'Old'); g.applyEquip(old, eq('blue')); g.applyEquip(old, eq('green'));
    G.board.push(old); G.hand.push(newcomer());
  });
  g.placeServant(G, 0, 0, () => {});
  check(G.board[0].name === 'Newcomer', 'the newcomer takes the place');
  const eqs = G.hand.filter(h => h.kind === 'equip').length;
  kept += eqs; lost += 2 - eqs;
}
const rate = lost / (kept + lost);
check(Math.abs(rate - g.BREAK_CHANCE) < 0.08, `break rate ${rate.toFixed(2)} should be close to ${g.BREAK_CHANCE}`);
// full hand: the equipment that do not fit are lost
{
  g.setSeed(1); const G = game();
  const old = card(['blue']); g.applyEquip(old, eq('blue')); G.board.push(old);
  G.hand.push(newcomer()); for (let i = 0; i < 6; i++) G.hand.push({ kind: 'servant', s: card([], 'Filler' + i) });
  const before = G.hand.length - 1;
  g.placeServant(G, 0, 0, () => {});
  check(G.hand.length <= 7, 'the hand never exceeds its limit when equipment comes back');
}

// 5. fusion: the gold card starts bare, the equipment goes back to the hand
g.setSeed(3);
{
  const G = game(), name = 'Triplet';
  const trio = [0, 1, 2].map(() => card(['red', 'blue'], name));
  g.applyEquip(trio[0], eq('red', 2, 2)); g.applyEquip(trio[1], eq('blue', 1, 1));
  G.board.push(trio[0], trio[1]); G.hand.push({ kind: 'servant', s: trio[2] });
  const rf = {};
  check(g.resolveFusion(G, rf, () => {}), 'three identical servants must fuse');
  const gold = G.board.find(x => x.gold);
  check(gold && gold.atk === 9 && gold.hp === 9, `the gold card adds the base statistics only (got ${gold && gold.atk}/${gold && gold.hp})`);
  check(gold.equips.length === 0 && gold.sockets.length === 2 && gold.slots.every(x => !x), 'the gold card starts bare, with the sockets of its model');
  check(G.hand.filter(h => h.kind === 'equip').length <= 2, 'at most the two equipment come back');
}
console.log(`✓ sockets: ${g.SERVANTS.length} servants and ${g.EQUIPS.length} equipment valid, placement by color, exact bonuses restored, return to the hand (${(rate * 100).toFixed(0)} % break), fusion starts bare.`);
