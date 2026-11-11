// Aura test: the aura layer (POWERS.refreshAuras and its use by the combat engine) on test templates that no card uses.
// Checks: bonus applied and idempotent, bonus lost with its carrier, stacking, keywords (native ones are kept), statistics read without auras,
// a bonus of HP lost kills a wounded card, and the deaths follow one another from left to right.
// Usage: node tools/check-aura.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ POWERS, runCombat, mkServant, SERVANTS, DUNGEONS, HEROES, setSeed })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };

const aura = (target, effects, extra = {}) => ({ aura: { target, effects, ...extra } });
const templates = {
  ...g.POWERS.all(),
  testHp: aura({ side: 'ally', exclude: 'carrier' }, [{ action: 'stats', hp: '$a' }]),
  testAtk: aura({ side: 'ally', exclude: 'carrier' }, [{ action: 'stats', atk: { stat: 'atk', of: 'carrier' } }]),
  testKw: aura({ side: 'ally', exclude: 'carrier' }, [{ action: 'keyword', give: 'ranged' }]),
  testRight: aura({ side: 'ally', pick: 'rightNeighbor' }, [{ action: 'stats', hp: '$a' }])
};
g.POWERS.install(templates);
const problems = Object.keys(templates).filter(k => /^test/.test(k)).flatMap(k => g.POWERS.validate(templates[k]).map(p => `${k}: ${p}`));
check(!problems.length, 'test templates are invalid: ' + problems.join(' / '));

const base = g.SERVANTS[0];
const card = (name, atk, hp, skill, kw = []) => g.mkServant({ ...base, name, atk, hp, types: ['pilot'], kw, skill: skill ? { t: 'passive', fx: skill, a: 2, h: 0, n: 0 } : null });
const sides = (p, e = []) => [{ cards: p, foes: e }, { cards: e, foes: p }];
const refresh = (p, e = []) => g.POWERS.refreshAuras(sides(p, e));

// 1. bonus applied, only once, max HP follows
{ const c = card('C', 1, 3, 'testHp'), t = card('T', 2, 4), board = [c, t];
  check(refresh(board) === true, 'first refresh must report a change');
  check(t.hp === 6 && t.maxhp === 6 && t.atk === 2, `bonus of HP: ${t.atk}/${t.hp} (max ${t.maxhp})`);
  check(c.hp === 3, 'the carrier (excluded) must not receive its own aura');
  check(refresh(board) === false && t.hp === 6, 'a second refresh must change nothing'); }
// 2. the bonus goes with the carrier
{ const c = card('C', 1, 3, 'testHp'), t = card('T', 2, 4), board = [c, t];
  refresh(board); board.splice(0, 1); refresh(board);
  check(t.hp === 4 && t.maxhp === 4 && !t.aura.hp, `after the carrier left: ${t.hp}/${t.maxhp}`); }
// 3. two carriers stack, in any order
{ const a = card('A', 1, 3, 'testHp'), b = card('B', 1, 3, 'testHp'), t = card('T', 2, 4), board = [a, t, b];
  refresh(board); check(t.hp === 8, `two auras: ${t.hp}`);
  check(a.hp === 5 && b.hp === 5, 'each carrier receives the aura of the other'); }
// 4. neighbor selector follows the board order
{ const c = card('C', 1, 3, 'testRight'), t = card('T', 2, 4), u = card('U', 2, 4), board = [c, t, u];
  refresh(board); check(t.hp === 6 && u.hp === 4, 'rightNeighbor must reach only the card on the right');
  board.splice(1, 1); refresh(board); check(u.hp === 6 && board.length === 2, 'the neighbor is recomputed when the board changes'); }
// 5. keyword given and taken away, a native one stays
{ const c = card('C', 1, 3, 'testKw'), t = card('T', 2, 4), n = card('N', 2, 4, null, ['ranged']), board = [c, t, n];
  refresh(board); check(t.kw.includes('ranged') && n.kw.includes('ranged'), 'keyword must be given');
  board.splice(0, 1); refresh(board);
  check(!t.kw.includes('ranged'), 'the given keyword must go with the aura'); check(n.kw.includes('ranged'), 'a native keyword must stay'); }
// 6. statistics are read without auras: two carriers that read each other's ATK do not feed back
{ const a = card('A', 3, 3, 'testAtk'), b = card('B', 3, 3, 'testAtk'), board = [a, b];
  refresh(board); const first = [a.atk, b.atk];
  check(first[0] === 6 && first[1] === 6, `atk read without aura: ${first}`);
  check(refresh(board) === false && a.atk === 6 && b.atk === 6, 'no feedback between auras'); }
// 6b. the Chief Mechanic (real card, real template): +a/+h for the allied drones while it is alive, whenever they arrived; gone with it
{ const chief = g.SERVANTS.find(c => [].concat(c.skill || []).some(k => k.fx === 'droneAura'));
  check(chief, 'the Chief Mechanic card is missing');
  const c = g.mkServant(chief), k = [].concat(c.skill).find(x => x.fx === 'droneAura'), drone = card('Drone', 1, 1), other = card('Autre', 1, 1), board = [drone, c, other];
  refresh(board);
  check(drone.atk === 1 + k.a && drone.hp === 1 + k.h && drone.maxhp === 1 + k.h, `drone with the Chief: ${drone.atk}/${drone.hp}`);
  check(other.atk === 1 && other.hp === 1, 'only drones receive the aura');
  const late = card('Drone', 2, 2); board.push(late); refresh(board);
  check(late.atk === 2 + k.a, 'a drone that arrives later receives it too');
  board.splice(board.indexOf(c), 1); refresh(board);
  check(drone.atk === 1 && drone.hp === 1 && late.hp === 2, 'the bonus must go with the Chief'); }
// 7. in a combat: the carrier dies, the wounded card loses its bonus of HP and dies too, the healthy one survives; deaths from left to right
{ const dungeon = Object.values(g.DUNGEONS)[0];
  const hero = n => card(n, 9, 30);
  const carrier = card('Porteur', 0, 1, 'testHp', ['prov']), wounded = card('Blessé', 1, 3), healthy = card('Sain', 1, 3);
  refresh([carrier, wounded, healthy]);   // the aura is already on the cards when the combat starts (the combat copies them with their bonus)
  wounded.hp = 1;   // 1 HP out of 5 (3 + the aura's 2): without the aura it would be at -1
  const ctx = { heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, droneBonus: { a: 0, h: 0 }, gainEquip: 0 };
  g.setSeed(1);
  const res = g.runCombat([hero('H1'), hero('H2'), hero('H3')], [carrier, wounded, healthy], ctx);
  const msgs = res.frames.map(f => f.msg);
  const iC = msgs.findIndex(m => /Porteur.*meurt/.test(m)), iW = msgs.findIndex(m => /Blessé.*meurt/.test(m)), iH = msgs.findIndex(m => /Sain.*meurt/.test(m));
  check(iC >= 0 && iW > iC, `the wounded card must die after the carrier (indexes ${iC}, ${iW})`);
  check(!msgs.slice(iC + 1, iW).some(m => /attaque/.test(m)), 'no attack between the two deaths: the second one is caused by the loss of the aura');
  check(iH < 0 || iH > iW, 'the healthy card must not die before the wounded one');
  const frame = res.frames[iW];
  const sain = frame.e.find(s => s.name === 'Sain');
  check(sain && sain.hp === 3 && sain.maxhp === 3, `the healthy card must be back to its own 3 HP once the bonus is gone: ${sain && sain.hp}/${sain && sain.maxhp}`);
  check(res.winner === 'p', `winner: ${res.winner}`); }
console.log('✓ auras: bonus, removal, stacking, neighbors, keywords, base statistics, death by loss and left-to-right cascade.');
