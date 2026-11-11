// Boss boards test: after the player's combat, the board that fought keeps what it gained, the other boards fight each other (never touching the Boss's HP).
// Pairing: boards 2-3, 4-5...; with an odd number of other boards the last one faces the board that fought the player (4 boards: 1 faces the player, 2 faces 3, 4 faces 1).
// Usage: node tools/check-boss-boards.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;globalThis.__calls = [];{ const rc = runCombat; runCombat = (a, b, c) => { __calls.push([a, b, c]); return rc(a, b, c); }; }' +
  '\n;({ newGame, makeTeam, mkServant, SERVANTS, HEROES, DUNGEONS, bossBoardsFight, teamCombatEnd, setSeed, calls: __calls })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };
const base = g.SERVANTS[0];
const card = (name, atk, hp, skill) => g.mkServant({ ...base, name, atk, hp, types: ['pilot'], kw: [], skill: skill || null });
const game = n => {
  g.setSeed(7);
  const heroes = Object.keys(g.HEROES).slice(0, 2), dungeon = Object.keys(g.DUNGEONS)[0];
  const gm = g.newGame(heroes, dungeon);
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
{ const gm = game(3), tough = card('Tough', 1, 500, { t: 'survive', fx: 'permAtk', a: 1, h: 0, n: 0 });
  gm.bossTeams[1].board = [tough]; gm.bossTeams[2].board = [card('Hitter', 1, 100)];
  g.bossBoardsFight(gm, res(gm));
  check(tough.atk > 1, `the survivor of a fight between boards must keep its gain: ${tough.atk}`);
  check(gm.bossTeams[2].board[0].atk === 1 && gm.bossTeams[2].board[0].hp === 100, 'the cards of the boards are copied for the fight (the board keeps its own cards)'); }
// 5b. the odd board out fights a temporary copy: the board that faced the player does not gain from it, the odd board does
{ const gm = game(4), faced = gm.bossTeams[0], odd = gm.bossTeams[3];
  faced.board = [card('B1', 1, 50, { t: 'survive', fx: 'permAtk', a: 1, h: 0, n: 0 })]; odd.board = [card('B4', 1, 500, { t: 'survive', fx: 'permAtk', a: 1, h: 0, n: 0 })];
  gm.bossTeams[1].board = [card('B2', 0, 1)]; gm.bossTeams[2].board = [card('B3', 0, 1)];
  const facedBefore = JSON.stringify(faced.board), oddAtk = odd.board[0].atk;
  g.bossBoardsFight(gm, res(gm));
  check(JSON.stringify(faced.board) === facedBefore, 'the board that faced the player must not gain from the fight against the odd board (temporary copy)');
  check(odd.board[0].atk > oddAtk, `the odd board keeps its gain: ${odd.board[0].atk}`);
  check(gm.bossLog.some(l => l.includes('copie temporaire')), 'the log says the fight is against a copy'); }
// 6. drone bonus and equipment to receive belong to the board (also on the side of the Boss facing the player)
{ const gm = game(3); check(gm.bossTeams.every(t => t.droneBonus && t.droneBonus.a === 0 && t.gainEquip === 0), 'each board has its drone bonus and its equipment counter'); }
console.log('✓ boss boards: pairing (2, 3, 4, 5 boards), no impact on the Boss or the heroes, gains kept by the board that faced the player and by the survivors of each fight.');
