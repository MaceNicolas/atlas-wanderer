// Boss boards test: after the player's combat, the board that fought keeps what it gained, the other boards fight each other (never touching the Boss's HP).
// Pairing: boards 2-3, 4-5...; with an odd number of other boards the last one faces the board that fought the player (4 boards: 1 faces the player, 2 faces 3, 4 faces 1).
// Usage: node tools/check-boss-boards.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;globalThis.__calls = [];{ const rc = runCombat; runCombat = (a, b, c) => { __calls.push([a, b, c]); return rc(a, b, c); }; }' +
  '\n;({ newGame, makeTeam, mkServant, SERVANTS, HEROES, DUNGEONS, bossBoardsFight, bossReinforcement, settleCombat, RULES, teamCombatEnd, setSeed, drawDungeonTypes, resolveBosses, BOSSES, TYPE_GROUPS, runCombat, enemyBoardCards, growUnitBoard, GAME, resolveStrategy, drawCards, MAX_BOARD, calls: __calls })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };
const base = g.SERVANTS[0];
const card = (name, atk, hp, skill) => g.mkServant({ ...base, name, atk, hp, types: ['pilot'], kw: [], skill: skill || null });
const game = n => {
  g.setSeed(7);
  const heroes = Object.keys(g.HEROES).slice(0, 2), dungeon = Object.keys(g.DUNGEONS)[0];
  const gm = g.newGame({ heroes, dungeon });
  gm.bossTeams = Array.from({ length: n }, (_, i) => { const t = g.makeTeam(gm.bossTeams[0].types, 0, null); t.board = [card(`B${i + 1}`, 2, 6)]; return t; });
  gm.bossCur = 0; gm.room = 4; gm.bossLog = [];
  return gm;
};
const res = (gm, extra = {}) => ({ winner: 'p', frames: [], hits: [], attacks: 5, survivors: { p: [], e: gm.bossTeams[gm.bossCur].board.map(s => ({ ...s, ...extra })) } });
const pairs = n => { const gm = game(n); g.calls.length = 0; g.bossBoardsFight(gm, res(gm)); return g.calls.map(([a, b]) => [a[0].name, b[0].name].sort().join('-')).sort().join(' '); };

// 1. pairing
check(pairs(3) === 'B2-B3', `3 boards: ${pairs(3)}`);
check(pairs(4) === 'B1-B4 B2-B3', `4 boards (1 faced the player): ${pairs(4)}`);
check(pairs(5) === 'B2-B3 B4-B5', `5 boards: ${pairs(5)}`);
check(pairs(2) === 'B1-B2', `2 boards: the only other board faces the one that faced the player: ${pairs(2)}`);
{ const gm = game(4); gm.bossCur = 2; g.calls.length = 0; g.bossBoardsFight(gm, res(gm));
  const got = g.calls.map(([a, b]) => [a[0].name, b[0].name].sort().join('-')).sort().join(' ');
  check(got === 'B1-B2 B3-B4', `4 boards, the third faced the player: others 1, 2, 4 -> 1 faces 2, 4 faces 3: ${got}`); }
// 2. nothing touches the Boss's HP or the heroes'
{ const gm = game(4), hp = [gm.boss.hp, ...gm.heroes.map(h => h.hp)], room = gm.room;
  g.bossBoardsFight(gm, res(gm));
  check(gm.boss.hp === hp[0] && gm.heroes.every((h, i) => h.hp === hp[i + 1]), 'the fights between boards must not change the HP of the Boss or of the heroes');
  check(gm.room === room && !gm.over, 'no room is consumed, the game is not over'); }
// 3. no fight once the game is over
{ const gm = game(3); gm.over = 'win'; g.calls.length = 0; g.bossBoardsFight(gm, res(gm)); check(g.calls.length === 0, 'no fight when the game is over'); }
// 4. the board that fought the player keeps its permanent gains
{ const gm = game(3), t = gm.bossTeams[0], c = t.board[0], before = [c.atk, c.hp, c.maxhp];
  g.bossBoardsFight(gm, res(gm, { perm: 2, permHp: 3 }));
  check(c.atk === before[0] + 2 && c.hp === before[1] + 3 && c.maxhp === before[2] + 3, `permanent gains of the board that faced the player: ${c.atk}/${c.hp}/${c.maxhp}`);
  check(gm.bossLog.some(l => l.startsWith('[Plateau 1]')), 'the gains are written in the Boss log'); }
// 5. in a fight between boards, the survivors keep what they gain (a servant that survives an attack permanently gains ATK)
{ const gm = game(3), tough = card('Tough', 1, 500, { t: 'survive', fx: 'changeStats', target: { side: 'self' }, permanent: true, a: 1, h: 0, n: 0 });
  gm.bossTeams[1].board = [tough]; gm.bossTeams[2].board = [card('Hitter', 1, 100)];
  g.bossBoardsFight(gm, res(gm));
  check(tough.atk > 1, `the survivor of a fight between boards must keep its gain: ${tough.atk}`);
  check(gm.bossTeams[2].board[0].atk === 1 && gm.bossTeams[2].board[0].hp === 100, 'the cards of the boards are copied for the fight (the board keeps its own cards)'); }
// 5b. the odd board out fights a temporary copy: the board that faced the player does not gain from it, the odd board does
{ const gm = game(4), faced = gm.bossTeams[0], odd = gm.bossTeams[3];
  faced.board = [card('B1', 1, 50, { t: 'survive', fx: 'changeStats', target: { side: 'self' }, permanent: true, a: 1, h: 0, n: 0 })]; odd.board = [card('B4', 1, 500, { t: 'survive', fx: 'changeStats', target: { side: 'self' }, permanent: true, a: 1, h: 0, n: 0 })];
  gm.bossTeams[1].board = [card('B2', 0, 1)]; gm.bossTeams[2].board = [card('B3', 0, 1)];
  const facedBefore = JSON.stringify(faced.board), oddAtk = odd.board[0].atk;
  g.bossBoardsFight(gm, res(gm));
  check(JSON.stringify(faced.board) === facedBefore, 'the board that faced the player must not gain from the fight against the odd board (temporary copy)');
  check(odd.board[0].atk > oddAtk, `the odd board keeps its gain: ${odd.board[0].atk}`);
  check(gm.bossLog.some(l => l.includes('copie temporaire')), 'the log says the fight is against a copy'); }
// 6. summon bonus and equipment to receive belong to the board (also on the side of the Boss facing the player)
{ const gm = game(3); check(gm.bossTeams.every(t => t.summonBonus && typeof t.summonBonus === 'object' && t.owedEquipment === 0), 'each board has its summon bonus and its equipment counter'); }
// 7. one bar of HP per boss: the survivors strike the bar of the board they faced; at 0 the boss is defeated and its board leaves the rotation; the dungeon is won when all are
{
  g.setSeed(5);
  const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), n = gm.bossTeams.length, total = gm.bossTeams.reduce((a, t) => a + t.boss.hp, 0);
  check(gm.bossTeams.every(t => t.boss && t.bossHp === t.bossMax && t.bossMax === t.boss.hp && !t.defeated) && gm.boss.hp === total && gm.boss.maxhp === total, 'each board has the bar of its own boss, the dungeon shows the total');
  const strike = (i, dmg) => { gm.bossCur = i; const r = { winner: 'p', hits: [], survivors: { p: [{ uid: 'x', name: 'S', rank: 1 }], e: [] } }; g.RULES.settlement.player.perRank = 0; g.RULES.settlement.player.flat = dmg; g.settleCombat(gm, r); return r; };
  const bar0 = gm.bossTeams[0].bossMax;
  let r = strike(0, bar0 - 1);
  check(gm.bossTeams[0].bossHp === 1 && !gm.bossTeams[0].defeated && gm.boss.hp === total - bar0 + 1, 'a hit lowers only the bar of the board that was faced');
  r = strike(0, 99);
  check(gm.bossTeams[0].bossHp === 0 && gm.bossTeams[0].defeated && r.hits[0].dmg === 1 && gm.boss.hp === total - bar0, 'what exceeds the bar is lost, and a bar at 0 defeats the boss');
  check(!gm.over, 'the dungeon is not won while a boss stands');
  for (let k = 0; k < 30; k++) { g.bossReinforcement(gm); check(gm.bossCur !== 0 && !gm.bossTeams[gm.bossCur].defeated, 'a defeated board is never presented'); }
  for (let i = 1; i < n; i++) { check(!gm.over, 'not won before the last boss'); strike(i, 999); }
  check(gm.over === 'win' && gm.boss.hp === 0, 'the dungeon is won when every boss is defeated');
}
// 8. the bosses of a dungeon: fixed ones and ones linked to a type drawn at random; the types the dungeon draws; the permanent servant; the power of the boss that faces the player
{
  const ids = Object.keys(g.BOSSES), byType = t => ids.filter(id => g.BOSSES[id].types.includes(t)), types = g.TYPE_GROUPS.flatMap(gr => gr.types), species = g.TYPE_GROUPS.find(x => x.id === 'species').types;
  const d = (o = {}) => ({ id: 'x', name: 'X', types: ['sorvane'], drawTypes: [], slots: [], strategy: null, strategies: null, ...o });
  // drawing: one type per entry, among the group (or the list), never a fixed or an already drawn type; null when nothing is left
  for (let k = 0; k < 40; k++) {
    g.setSeed(k);
    const t = g.drawDungeonTypes(d({ drawTypes: [{ group: 'species' }, { group: 'species' }, { group: 'assignment' }] }));
    check(t.every(Boolean) && new Set(t).size === 3 && !t.includes('sorvane') && species.includes(t[0]) && species.includes(t[1]) && !species.includes(t[2]), `the types drawn are different, of their group and not fixed (${t})`);
  }
  check(JSON.stringify(g.drawDungeonTypes(d({ drawTypes: [{ from: ['elk'] }, { from: ['elk'] }] }))) === '[\"elk\",null]', 'an entry with nothing left to draw gives null');
  check(g.drawDungeonTypes(d()).length === 0 && g.drawDungeonTypes(d({ types: [], drawTypes: [{ from: ['elk'] }] }))[0] === 'elk', 'no entry, nothing drawn; a list restricts the draw');
  // bosses: a fixed boss, a boss of the type drawn (among those of "from"), nothing when the type is missing or no boss has it
  const dwork = byType('dwork')[0], elk = byType('elk')[0], droid = byType('droid')[0];
  const dd = d({ slots: [{ boss: dwork }, { drawn: 0, from: [elk, droid] }, { drawn: 1, from: [elk] }, { drawn: 2 }] });
  for (let k = 0; k < 30; k++) {
    g.setSeed(k);
    const b = g.resolveBosses(dd, ['droid', 'dwork', null]).map(x => x.id);
    check(b.length === 2 && b[0] === dwork && b[1] === droid, `a boss linked to a drawn type is a boss of that type among those of its list; the others give nothing (${b.length})`);
  }
  check(g.resolveBosses(d({ slots: [{ drawn: 0 }] }), ['pilot']).every(x => x.types.includes('pilot')) && g.resolveBosses(d({ slots: [{ drawn: 0 }] }), ['pilot']).length === 1, 'with no list, any boss of that type');
  // a game of the real dungeons: the boards are the bosses, in order; the permanent servant is on the board and never replaced; the power belongs to the boss
  for (const id of Object.keys(g.DUNGEONS)) for (let k = 0; k < 6; k++) {
    g.setSeed(k);
    const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: id }), dun = g.DUNGEONS[id];
    check(gm.bossTeams.length === gm.bossIds.length && gm.bossTeams.every((t, i) => t.boss.id === gm.bossIds[i]), 'one board per boss of the game');
    check(gm.bossTeams.every(t => t.board.length === (t.boss.servant ? 1 : 0) && (!t.boss.servant || (t.board[0].fixed && t.board[0].name === t.boss.name && t.board[0].types.join() === t.boss.types.join()))), 'the permanent servant starts alone on its board, with the name and the type of its boss');
    dun.slots.forEach((s, i) => { if (s.boss) check(gm.bossIds.includes(s.boss), 'a fixed boss is always in the game'); });
    check(gm.bossExtra.every(t => !dun.types.includes(t)), 'the types drawn are not fixed types');
    gm.bossTeams.forEach(t => { const hit = t.boss.types.filter(x => gm.drawnTypes.includes(x)); if (hit.length) check(hit.every(x => gm.bossExtra.includes(x)), 'the boss of a drawn type'); });
  }
  // the power: only the boss that faces the player acts, whether or not its permanent servant is on the board (here the power "plate" gives +3 HP to the servants of its board at the start)
  g.setSeed(3);
  const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] });
  gm.bossTeams.forEach((t, i) => { t.boss = { ...t.boss, power: i === 1 ? 'plate' : null }; t.board.length = 0; t.board.push(g.mkServant({ name: 'Foe', atk: 1, hp: 3 })); });
  const foeHp = i => { gm.bossCur = i; const res = g.runCombat([g.mkServant({ name: 'Mine', atk: 1, hp: 30 })], gm.bossTeams[i].board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 }); return res.frames[1].e[0].hp; };
  check(foeHp(1) === 6 && foeHp(0) === 3 && foeHp(2) === 3, 'the power is played for the boss that faces the player, not for another');
}
// 9. DR-I0 (Cité des Profondeurs): the first time an allied Droid should die it survives with 1 HP (once per combat, only for a Droid, only for the boss that faces the player),
// and the aura power droidSwarm (a servant that carries it) gives each allied Droid +1/+1 per three allied Droids (it follows the number of Droids on the board)
{
  const dri0 = Object.values(g.BOSSES).find(b => b.power === 'droidLastStand'), cite = Object.values(g.DUNGEONS).find(d => d.slots.some(x => (x.from || []).includes(dri0 && dri0.id)));
  check(dri0 && cite && dri0.types[0] === 'droid', 'DR-I0 is a Droid boss of a dungeon');
  g.setSeed(2);
  const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: cite.id }), idx = gm.bossTeams.findIndex(t => t.boss.id === dri0.id);
  check(idx >= 0 && gm.drawnTypes.join() === 'droid,engineer', 'the Cité draws Droid and Engineer, and DR-I0 is one of its boards');
  const fight = (types, n) => {
    const t = gm.bossTeams[idx]; t.board.length = 0; for (let i = 0; i < n; i++) t.board.push(g.mkServant({ name: 'Unit' + i, atk: 1, hp: 1, types }));
    gm.bossCur = idx;
    const res = g.runCombat([g.mkServant({ name: 'Hammer', atk: 50, hp: 500 })], t.board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 });
    return res.frames.filter(f => /survit avec 1 PV/.test(f.msg || '')).length;
  };
  check(fight(['droid'], 3) === 1, 'the first Droid that should die survives, once per combat');
  check(fight(['pilot'], 3) === 0, 'a servant that is not a Droid dies');
  // the power belongs to the boss that faces the player
  gm.bossCur = (idx + 1) % gm.bossTeams.length; { const t = gm.bossTeams[idx]; t.board.length = 0; for (let i = 0; i < 3; i++) t.board.push(g.mkServant({ name: 'U' + i, atk: 1, hp: 1, types: ['droid'] })); }
  const other = gm.bossTeams[gm.bossCur]; other.board.length = 0; for (let i = 0; i < 3; i++) other.board.push(g.mkServant({ name: 'V' + i, atk: 1, hp: 1, types: ['droid'] }));
  const res2 = g.runCombat([g.mkServant({ name: 'Hammer', atk: 50, hp: 500 })], other.board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 });
  check(!res2.frames.some(f => /survit avec 1 PV/.test(f.msg || '')) || other.boss.power === 'droidLastStand', 'another boss does not play the power of DR-I0');
  // the aura: the permanent servant of DR-I0 (a Droid) and 5 other Droids: 6 Droids, +2/+2 each; one dead Droid fewer, and the bonus follows
  const t = gm.bossTeams[idx], keeper = g.mkServant({ name: 'Keeper', atk: 1, hp: 3, types: ['droid'], skill: { t: 'passive', fx: 'droidSwarm', a: 0, h: 0, n: 3 } });   // a servant that carries the aura (DR-I0 has no permanent servant now)
  t.board.length = 0; t.board.push(keeper); for (let i = 0; i < 5; i++) t.board.push(g.mkServant({ name: 'Drone' + i, atk: 1, hp: 1, types: ['droid'] }));
  gm.bossCur = idx;
  const res3 = g.runCombat([g.mkServant({ name: 'Mine', atk: 1, hp: 500 })], t.board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 });
  const first = res3.frames[1].e;
  check(first.length === 6 && first.slice(1).every(x => x.atk === 3 && x.hp === 3) && first[0].atk === 3, `six Droids: each gets +2/+2 (${first.map(x => x.atk + '/' + x.hp)})`);
}
// 10. the DR-1X swarm of DR-1O: one more unit every two rooms that STAYS on the board, statistics equal to the room, one aura each dealt from a deck of seven (never twice before all
// seven are out) and kept; the auras concern every DR-1X, the carrier included; nobody recruits a DR-1X
{
  const plan = g.resolveStrategy('dr1xSwarm'), dri0 = Object.values(g.BOSSES).find(b => b.power === 'droidLastStand');
  check(dri0 && dri0.strategy === 'dr1xSwarm' && plan.kind === 'board' && plan.unit.powers.length === 7, 'DR-1O plays the board strategy dr1xSwarm, with seven auras');
  g.setSeed(5);
  const t = g.makeTeam(['droid', 'engineer'], 0, null, plan), had = new Map();
  for (let room = 1; room <= 14; room++) {
    g.growUnitBoard(t, room);
    const units = t.board, want = Math.min(g.MAX_BOARD, 1 + Math.floor((room - 1) / 2));
    check(units.length === want, `room ${room}: ${want} DR-1X (${units.length})`);
    const descs = units.map(u => { const p = [u.skill, ...u.extra].filter(Boolean); check(p.length === 1 && String(p[0].desc).startsWith('dr1x.'), 'each DR-1X has exactly one aura'); return p[0].desc; });
    check(new Set(descs).size === descs.length, `room ${room}: no aura twice (${descs})`);
    for (const u of units) {
      check(u.name === 'DR-1X' && u.token === 'dr1x' && u.types.join() === 'droid,engineer' && u.sockets.length === 0 && u.kw.length === 0, 'a DR-1X is a Droid Engineer with no socket and no keyword');
      check(u.atk === room && u.hp === room && u.maxhp === room, `room ${room}: every DR-1X has ${room}/${room} (${u.atk}/${u.hp})`);
      const d = [u.skill, ...u.extra].filter(Boolean)[0].desc;
      if (had.has(u.uid)) check(had.get(u.uid) === d, 'a DR-1X keeps its aura from one room to the next'); else had.set(u.uid, d);
    }
  }
  check(new Set(t.board.map(u => u.skill.desc)).size === 7, 'at seven units, the seven auras are all there, once each');
  // a second game: the deal is another one, but still without repetition
  { const t2 = g.makeTeam([], 0, null, plan); g.setSeed(77); for (let room = 1; room <= 13; room++) g.growUnitBoard(t2, room); check(new Set(t2.board.map(u => u.skill.desc)).size === 7, 'another game: seven different auras'); }
  // in the game itself: the room after room, the DR-1X of the real board of DR-1O stay (same cards, same aura), and the other boards are not touched by this strategy
  { g.setSeed(12); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), tm = G.bossTeams.find(x => x.boss.id === dri0.id), seen = new Map();
    for (let room = 1; room <= 9; room++) {
      while (g.GAME.val(G, 'turn') < room) g.GAME.add(G, 'turn', 1);
      g.bossReinforcement(G);
      check(tm.board.length === Math.min(7, 1 + Math.floor((room - 1) / 2)) && tm.board.every(u => u.atk === room && u.hp === room), `the real board of DR-1O in room ${room}: ${tm.board.length} DR-1X of ${room}/${room}`);
      for (const u of tm.board) { const d = u.skill.desc; if (seen.has(u.uid)) check(seen.get(u.uid) === d, 'in the game, a DR-1X keeps its aura'); else seen.set(u.uid, d); }
    }
    check(new Set(tm.board.map(u => u.skill.desc)).size === tm.board.length, 'in the game, no aura twice on the board'); }
  // nobody recruits a DR-1X: no offer (servants, any level) ever holds a card with a token
  g.setSeed(9); const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] });
  for (let k = 0; k < 300; k++) for (const o of g.drawCards(gm, 'servant', 7, false, 6)) check(!(o.card || o).token, 'an offer never holds a card that is a token');
  // the auras concern every DR-1X of the board, the carrier included
  const base = g.SERVANTS.find(c => c.token === 'dr1x'), mk = (desc, fx, extra) => g.mkServant({ ...base, skill: [{ t: 'passive', fx, token: 'dr1x', desc, a: 0, h: 0, n: 0, ...extra }] });
  const ctx = { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0, bossTeams: gm.bossTeams, bossCur: 0 };
  const A = mk('dr1x.shield', 'auraKeywordOnTokens', { keyword: 'shield' }), B = mk('dr1x.atk', 'auraOnTokens', { a: 2 }), C = mk('dr1x.hp', 'auraOnTokens', { h: 2 }), D = mk('dr1x.ranged', 'auraKeywordOnTokens', { keyword: 'ranged' }), E = mk('dr1x.fury', 'auraKeywordOnTokens', { keyword: 'fury' });
  const f = g.runCombat([g.mkServant({ name: 'Mine', atk: 1, hp: 500 })], [A, B, C, D, E], ctx).frames[1].e;
  check(f.every(x => x.kw.includes('shield') && x.kw.includes('ranged') && x.kw.includes('fury')), 'shield, ranged and fury are given to every DR-1X, the carriers included');
  check(f.every(x => x.atk === 3 && x.hp === 3), `+2 ATK and +2 HP for every DR-1X, the carriers included (${f.map(x => x.atk + '/' + x.hp)})`);
  // the seventh aura: +1/+1 per DR-1X on the board (the carrier counts)
  { const P = mk('dr1x.per', 'auraPerToken', { a: 1, h: 1 }), X = g.mkServant({ ...base }), Y = g.mkServant({ ...base }), foe = g.runCombat([g.mkServant({ name: 'Mine', atk: 1, hp: 500 })], [P, X, Y], ctx).frames[1].e;
    check(foe.every(x => x.atk === 4 && x.hp === 4), `three DR-1X: each has +3/+3 (${foe.map(x => x.atk + '/' + x.hp)})`);
    const two = g.runCombat([g.mkServant({ name: 'Mine', atk: 1, hp: 500 })], [P, X], ctx).frames[1].e; check(two.every(x => x.atk === 3 && x.hp === 3), `two DR-1X: each has +2/+2 (${two.map(x => x.atk + '/' + x.hp)})`); }
  // a Shield given by an aura holds a charge and absorbs a hit
  { const S1 = mk('dr1x.shield', 'auraKeywordOnTokens', { keyword: 'shield' }); S1.hp = S1.maxhp = 1;
    const r = g.runCombat([g.mkServant({ name: 'Hitter', atk: 1, hp: 500 })], [S1], ctx), hit = r.frames.findIndex(x => /Hitter attaque DR-1X/.test(x.msg || ''));
    check(hit > 0 && r.frames.some(x => x.e.some(y => y.kw.includes('shield') && y.shield === 1)) && r.frames[hit].e.some(x => x.shield === 0 && x.hp === 1 && x.kw.includes('shield')), 'a Shield given by an aura holds a charge and absorbs a hit (the unit keeps its 1 HP)'); }
}
// 11. Erky (Engineer and Sorvane boss of the Cité): 28 HP; each time a servant of his board dies, another one gains +X/+X, X = the reinforcement level of his board; his strategy
// recruits a full board as fast as possible, Engineers first
{
  const erky = Object.values(g.BOSSES).find(b => b.name === 'Erky');
  check(erky && erky.hp === 28 && erky.types.join() === 'engineer,sorvane' && erky.power === 'allyDeathLevelBuff' && erky.strategy === 'erkyRush', 'Erky: 28 HP, Engineer and Sorvane, his power and his strategy');
  const plan = g.resolveStrategy('erkyRush');
  check(plan.kind === 'parametric' && plan.want.base === 7 && plan.prefer.servants.types.join() === 'engineer' && plan.prefer.servants.weight === 25, 'erkyRush: a full board at once, Engineers first (weighted preference, 25 points)');
  const cite = Object.values(g.DUNGEONS).find(d => d.slots.some(x => (x.from || []).includes(erky.id)));
  for (let k = 0; k < 10; k++) { g.setSeed(k); const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: cite.id }); check(gm.bossIds.includes(erky.id), 'Erky is a board of the Cité (the drawn Engineer type)'); }
  g.setSeed(3);
  const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: cite.id }), idx = gm.bossTeams.findIndex(t => t.boss.id === erky.id), t = gm.bossTeams[idx];
  const fight = (level, foes) => {
    t.board.length = 0; foes.forEach(x => t.board.push(g.mkServant({ name: x.name, atk: x.atk, hp: x.hp, types: ['pilot'] })));
    while (g.GAME.val(t, 'level') < level) g.GAME.add(t, 'level', 1);
    gm.bossCur = idx;
    return g.runCombat([g.mkServant({ name: 'Hammer', atk: 50, hp: 500 })], t.board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 });
  };
  const foes = [{ name: 'U1', atk: 1, hp: 1 }, { name: 'U2', atk: 1, hp: 200 }, { name: 'U3', atk: 1, hp: 200 }];
  let r = fight(1, foes);
  check(r.frames.some(f => /gagne \+1\/\+1/.test(f.msg || '')) && r.frames.some(f => f.e.some(x => x.atk === 2 && x.hp === 201)), 'level 1: the servant that dies gives +1/+1 to another one');
  r = fight(4, foes);
  check(r.frames.some(f => /gagne \+4\/\+4/.test(f.msg || '')) && r.frames.some(f => f.e.some(x => x.atk === 5 && x.hp === 204)), 'level 4 of the board: +4/+4');
  check(r.frames.filter(f => /un serviteur allié est mort/.test(f.msg || '')).length >= 1, 'the death of a servant is announced by the power');
  // alone, nobody to give to; and the servants of the player never trigger it
  r = fight(2, [{ name: 'Solo', atk: 1, hp: 1 }]); check(r.winner === 'p' && !r.frames.some(f => /gagne \+2\/\+2/.test(f.msg || '')), 'a servant that dies alone gives nothing');
  // another boss does not play it
  { const other = gm.bossTeams.findIndex((x, i) => i !== idx && !x.boss.power || (i !== idx && x.boss.power !== 'allyDeathLevelBuff')); gm.bossCur = other; const o = gm.bossTeams[other]; o.board.length = 0; foes.forEach(x => o.board.push(g.mkServant({ name: x.name, atk: x.atk, hp: x.hp, types: ['pilot'] })));
    const ro = g.runCombat([g.mkServant({ name: 'Hammer', atk: 50, hp: 500 })], o.board, { ...gm, heroes: [], level: 1, room: 1, summonBonus: {}, owedEquipment: 0 });
    check(!ro.frames.some(f => /un serviteur allié est mort/.test(f.msg || '')), 'a boss without this power does not play it'); }
  // the strategy: faster full board and more Engineers than the plain horde, same seed and same money
  const play = strat => {
    g.setSeed(21); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: cite.id }), tm = G.bossTeams.find(x => x.boss.id === erky.id);
    tm.strategy = g.resolveStrategy(strat); let early = 0;
    for (let room = 1; room <= 10; room++) { while (g.GAME.val(G, 'turn') < room) g.GAME.add(G, 'turn', 1); g.bossReinforcement(G); if (room === 4) early = tm.board.length; }
    return { early, engineers: tm.board.filter(u => u.types.includes('engineer')).length, size: tm.board.length };
  };
  const rush = play('erkyRush'), horde = play('horde');
  check(rush.early >= horde.early && rush.engineers > horde.engineers && rush.size >= 5, `erkyRush recruits at least as fast and more Engineers than horde (${JSON.stringify(rush)} against ${JSON.stringify(horde)})`);
}
// 12. the first room: no special case in the engine; every board of the Boss receives rules.game.bossFirstRoomIncome (2), flat, and buys with it
{
  check(g.RULES.game.bossFirstRoomIncome === 2, 'the rules give 2 Datacrons to every board in the first room');
  for (const dungeon of Object.keys(g.DUNGEONS)) for (let k = 0; k < 4; k++) {
    g.setSeed(40 + k); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon });
    g.bossReinforcement(G);   // room 1
    G.bossTeams.forEach(t => {
      if (t.strategy.kind === 'parametric') check(t.stats.earned === 2, `room 1: a board that buys earns 2 Datacrons (${t.stats.earned})`);
    });
    const buyers = G.bossTeams.filter(t => t.strategy.kind === 'parametric');
    check(buyers.every(t => t.board.length >= 1), `room 1: every board that buys has at least one servant (${buyers.map(t => t.board.length)})`);
  }
}
// 12. Cyro (Security boss): two Room Guardians ALWAYS at the two ends of the board (token, rank 6, Droid Security, taunt, statistics = the match number), a Rifleman between them
// in the matches 3, 6, 9... only (no growth); in the game itself, the board is rebuilt at each room and nobody recruits a Guardian
{
  const cyro = Object.values(g.BOSSES).find(b => b.strategy === 'cyroGuard'), plan = g.resolveStrategy('cyroGuard');
  check(cyro && cyro.types.join() === 'security,sorvane' && !cyro.servant && plan.kind === 'board' && plan.layout.length === 3, 'Cyro is a Security and Sorvane boss with no permanent servant, on the board strategy cyroGuard');
  const rifleman = g.SERVANTS.find(c => c.id === plan.layout[1].card);
  check(rifleman.types.join() === 'sorvane,security', 'the Rifleman is a Sorvane');
  check(g.SERVANTS.find(c => c.id === '195cfb93-78d7-4933-84f1-419764b6242a').types.join() === 'ryskan,security', 'the Sentinel is a Ryskan');
  for (let room = 1; room <= 13; room++) {
    const b = g.enemyBoardCards(plan, room), rifle = room % 3 === 0;
    check(b.length === (rifle ? 3 : 2), `room ${room}: ${rifle ? 3 : 2} units (${b.length})`);
    const [left, right] = [b[0], b[b.length - 1]];
    for (const u of [left, right]) check(u.token === 'guard' && u.atk === room && u.hp === room && u.maxhp === room && u.kw.includes('prov') && u.types.join() === 'droid,security', `room ${room}: a Guardian is ${room}/${room} with prov`);
    if (rifle) check(b[1].id === rifleman.id && b[1].atk === rifleman.atk && b[1].hp === rifleman.hp, `room ${room}: the Rifleman keeps its own statistics, between the Guardians`);
  }
  g.setSeed(21); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), tm = G.bossTeams.find(x => x.boss.id === cyro.id);
  check(tm, 'Cyro is in the first dungeon');
  for (let room = 1; room <= 7; room++) {
    while (g.GAME.val(G, 'turn') < room) g.GAME.add(G, 'turn', 1);
    g.bossReinforcement(G);
    const n = room % 3 === 0 ? 3 : 2, bd = tm.board;
    check(bd.length === n && bd[0].token === 'guard' && bd[n - 1].token === 'guard' && bd[0].atk === room, `the real board of Cyro in room ${room}`);
  }
  g.setSeed(9); const gm = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] });
  for (let k = 0; k < 300; k++) for (const o of g.drawCards(gm, 'servant', 7, false, 6)) check((o.card || o).token !== 'guard', 'nobody recruits a Room Guardian');
}
// 13. Mara (Sorvane boss, Intelligence): at the start of the combat, the enemy with the most ATK drops to 1 ATK and the enemy with the most HP drops to 1 HP, two independent effects
// (two different servants, or the same one); she recruits the strongest servants with a plain strategy (no preference between types)
{
  const mara = Object.values(g.BOSSES).find(b => b.power === 'strategicNeutralization'), plan = g.resolveStrategy('maraArmy');
  check(mara && mara.types.join() === 'sorvane,intelligence' && !mara.servant && plan.kind === 'parametric' && !plan.prefer && plan.score === 'rank', 'Mara is a Sorvane Intelligence boss with a plain recruiting strategy');
  const mk = (name, atk, hp) => g.mkServant({ ...g.SERVANTS[0], name, atk, hp, types: ['pilot'], kw: [], skill: null }), first = (a, name) => a.find(x => x.name === name);
  const fight = (mine, foes) => { g.setSeed(3); const r = g.runCombat(mine, foes, { heroes: [], level: 1, room: 1, bossPower: 'strategicNeutralization', summonBonus: {}, owedEquipment: 0 }); return r.frames[2].p; };   // frame 1: the ATK effect, frame 2: the HP effect
  // two different targets: the biggest attacker (9/2) and the biggest body (2/9)
  let f = fight([mk('A', 9, 2), mk('B', 2, 9), mk('C', 3, 3)], [mk('Foe', 1, 50)]);
  check(first(f, 'A').atk === 1 && first(f, 'A').hp === 2 && first(f, 'B').atk === 2 && first(f, 'B').hp === 1 && first(f, 'C').atk === 3 && first(f, 'C').hp === 3, `two targets: A 1/2, B 2/1, C untouched (${f.map(x => `${x.name} ${x.atk}/${x.hp}`)})`);
  // the same target for both: a 9/9 becomes 1/1
  f = fight([mk('A', 9, 9), mk('C', 3, 3)], [mk('Foe', 1, 50)]);
  check(first(f, 'A').atk === 1 && first(f, 'A').hp === 1 && first(f, 'C').atk === 3 && first(f, 'C').hp === 3, `one target: A 1/1 (${f.map(x => `${x.name} ${x.atk}/${x.hp}`)})`);
}
console.log('✓ boss boards: pairing (2, 3, 4, 5 boards), no impact on the Boss or the heroes, gains kept by the board that faced the player and by the survivors of each fight.');
