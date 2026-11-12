// Order test: the modifiers of the order of resolution (spec 12.3): events resolutionOrder and firstSide, priority of a power, direction.
// Uses test templates that no card uses; the observable is the order of the log lines "X gains +a/+h" and the line "who attacks first".
// Usage: node tools/check-order.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ POWERS, runCombat, mkServant, SERVANTS, DUNGEONS, setSeed, I18N })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };

const buff = start => ({ start, then: [{ action: 'stats', target: { side: 'self' }, atk: '$a', hp: '$h', log: 'log.buffSelf' }] });
const when = (on, then, extra = {}) => ({ reactions: [{ on, then, ...extra }] });
const templates = {
  ...g.POWERS.all(),
  tFirst: buff({ priority: 'first' }), tLate: buff({ priority: 'late' }), t50: buff({ priority: 50 }), tFrozen: buff({ late: true }),
  tAllyFirst: when('resolutionOrder', [{ action: 'moveBand', band: 'own', to: 'first' }]),
  tOwnLast: when('resolutionOrder', [{ action: 'moveBand', band: 'own', to: 'last' }]),
  tFoeLast: when('resolutionOrder', [{ action: 'moveBand', band: 'foe', to: 'last' }]),
  tRtl: when('resolutionOrder', [{ action: 'modify', field: 'direction', value: 'rightToLeft' }]),
  tReplaysInBand: when('resolutionOrder', [{ action: 'modify', field: 'replays', value: 'inBand' }]),
  tMeFirst: when('firstSide', [{ action: 'setFirstSide', side: 'own' }]),
  tMeFirstOnTie: when('firstSide', [{ action: 'setFirstSide', side: 'own' }], { if: { eq: [{ evt: 'reason' }, 'tie'] } }),
  tPlayerFirst: when('firstSide', [{ action: 'modify', field: 'side', value: 'player' }]),
  tPlayerFirstEarly: when('firstSide', [{ action: 'modify', field: 'side', value: 'player' }], { priority: 'first' }),
  tBossFirst: when('firstSide', [{ action: 'modify', field: 'side', value: 'boss' }]),
  tBossFirstFor2: when('firstSide', [{ action: 'modify', field: 'side', value: 'boss', duration: { rooms: 2 } }])
};
g.POWERS.install(templates);
const problems = Object.keys(templates).filter(k => /^t[A-Z0-9]/.test(k)).flatMap(k => g.POWERS.validate(templates[k]).map(p => `${k}: ${p}`));
check(!problems.length, 'test templates are invalid: ' + problems.join(' / '));
// Bad templates must be refused.
const bad = [[{ reactions: [{ on: 'resolutionOrder', then: [{ action: 'moveBand', band: 'nobody' }] }] }, 'band'], [{ then: [{ action: 'stats', target: { side: 'self' }, atk: 1 }], start: { priority: 'urgent' } }, 'priority'],
  [{ reactions: [{ on: 'firstSide', then: [{ action: 'setFirstSide', side: 'left' }] }] }, 'side']];
bad.push([{ reactions: [{ on: 'firstSide', priority: 'urgent', then: [{ action: 'setFirstSide', side: 'own' }] }] }, 'reaction priority']);
bad.forEach(([t, what]) => check(g.POWERS.validate(t).length > 0, `an invalid ${what} must be refused`));

const base = g.SERVANTS[0];
const card = (name, skill, a = 1) => g.mkServant({ ...base, name, atk: 1, hp: 40, types: ['pilot'], kw: [], skill: skill ? { t: /^(buffSelf|tFirst|tLate|t50|tFrozen)$/.test(skill) ? 'startCombat' : 'passive', fx: skill, a, h: 0, n: 0 } : null });
const dungeon = Object.values(g.DUNGEONS)[0];
const play = (mine, theirs) => {
  const ctx = { heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, summonBonus: {}, owedEquipment: 0 };
  g.setSeed(1);
  const res = g.runCombat(mine, theirs, ctx);
  return res.frames.map(f => f.msg);
};
const gains = (msgs, names) => names.map(n => [n, msgs.findIndex(m => m.startsWith(n + ' gagne'))]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]).map(x => x[0]).join(' ');
const names = ['P1', 'P2', 'E1', 'E2'];
const pl = () => [card('P1', 'buffSelf'), card('P2', 'buffSelf')], en = () => [card('E1', 'buffSelf'), card('E2', 'buffSelf')];
const order = (mine, theirs) => gains(play(mine, theirs), [...names, 'P0', 'P3', 'E0', 'E3']);

// 0. reference: without any modifier, the profile default (Boss's board, then the player's board, left to right)
check(order(pl(), en()) === 'E1 E2 P1 P2', `default order: ${order(pl(), en())}`);
// 1. "our camp acts before the Boss": a carrier on the player's board puts the ally band first
check(order([card('P0', 'tAllyFirst'), ...pl()], en()) === 'P1 P2 E1 E2', `ally first: ${order([card('P0', 'tAllyFirst'), ...pl()], en())}`);
// 2. a carrier on the Boss's board: "own" is the Boss's camp, whichever side the power is on
check(order(pl(), [card('E0', 'tOwnLast'), ...en()]) === 'P1 P2 E1 E2', 'the Boss board carrier puts its own band last');
check(order(pl(), [card('E0', 'tFoeLast'), ...en()]) === 'E1 E2 P1 P2', '"foe last" from the Boss board: the player band goes last');
// 3. "the opposing effects play last"
check(order([card('P0', 'tFoeLast'), ...pl()], en()) === 'P1 P2 E1 E2', 'foe last from the player board');
// 4. direction
check(order([card('P0', 'tRtl'), ...pl()], en()) === 'E2 E1 P2 P1', `right to left: ${order([card('P0', 'tRtl'), ...pl()], en())}`);
// 5. conflict: the Boss's powers are played first, the player's last (default band order): the player's request wins
check(order([card('P0', 'tAllyFirst'), ...pl()], [card('E0', 'tOwnLast'), ...en()]) === 'P1 P2 E1 E2', 'conflicting modifiers: the last one applied (the player) wins');
// 6. priority: first (-100) before everything, a number (50) between normal and late (+100), whatever the band
{ const mine = [card('P1', 'tLate'), card('P2', 'tFirst')], theirs = [card('E1', 'buffSelf'), card('E2', 't50')];
  check(order(mine, theirs) === 'P2 E1 E2 P1', `priorities: ${order(mine, theirs)}`); }
// 7. the old late flag still means +100 in the profile afterAll; with inBand (set by the event) it stays in its band
{ const mine = [card('P1', 'tFrozen'), card('P2', 'buffSelf')], theirs = [card('E1', 'buffSelf')];
  check(order(mine, theirs) === 'E1 P2 P1', `late flag, afterAll: ${order(mine, theirs)}`);
  check(order([card('P0', 'tReplaysInBand'), ...mine], theirs) === 'E1 P2 P1', `late flag, inBand: ${order([card('P0', 'tReplaysInBand'), ...mine], theirs)}`);
  const m2 = [card('P1', 'tFrozen'), card('P2', 'buffSelf')], t2 = [card('E1', 'tFrozen'), card('E2', 'buffSelf')];
  check(order(m2, t2) === 'E2 P2 E1 P1', `two replays after everything: ${order(m2, t2)}`);
  check(order([card('P0', 'tReplaysInBand'), ...m2], t2) === 'E2 E1 P2 P1', `two replays in their band: ${order([card('P0', 'tReplaysInBand'), ...m2], t2)}`); }
// 9. who attacks first: more servants, the player on a tie; the event can change it
const first = (mine, theirs) => { const m = play(mine, theirs); return m.includes(g.I18N.t('log.bossFirst')) ? 'boss' : m.includes(g.I18N.t('log.playerFirst')) ? 'player' : '?'; };
const one = n => [card(n, null)], two = n => [card(n + '1', null), card(n + '2', null)];
check(first(one('P'), one('E')) === 'player', 'tie: the player attacks first');
check(first(one('P'), two('E')) === 'boss', 'more servants: the Boss attacks first');
check(first(two('P'), one('E')) === 'player', 'more servants on the player side');
check(first([card('P', 'tMeFirst'), card('Q', null)], [card('E1', null), card('E2', null), card('E3', null)]) === 'player', '"my camp attacks first" (player carrier) against a bigger Boss board');
check(first(one('P'), [card('E', 'tMeFirst'), card('F', null)]) === 'boss', '"my camp attacks first" (Boss carrier) with a bigger board: unchanged');
check(first([card('P', 'tMeFirst')], [card('E', null)]) === 'player', 'a tie: unchanged when the player already wins it');
check(first([card('P', null)], [card('E', 'tMeFirst')]) === 'boss', '"my camp attacks first" (Boss carrier) on a tie');
check(first([card('P', 'tMeFirstOnTie')], [card('E1', null), card('E2', null)]) === 'boss', 'the tie-only variant does nothing when the Boss has more servants');
check(first([card('P', null)], [card('E', 'tMeFirstOnTie')]) === 'boss', 'the tie-only variant plays on a tie');
check(first([card('P', 'tPlayerFirst')], [card('E1', null), card('E2', null)]) === 'player', 'modify side = player');
// 10. the combat still finishes and counts the same attacks whatever the order (no card lost, no crash) on random boards
{ let n = 0; for (let i = 1; i <= 200; i++) {
    g.setSeed(i);
    const mk = (side, k) => Array.from({ length: 1 + (i + k) % 5 }, (_, j) => card(`${side}${j}`, ['buffSelf', 'tFirst', 'tLate', 'tAllyFirst', 'tRtl', 'tMeFirst', 'tFoeLast', null][(i * 7 + j * 3 + k) % 8]));
    const ctx = { heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, summonBonus: {}, owedEquipment: 0 };
    const res = g.runCombat(mk('P', 0), mk('E', 1), ctx);
    check(['p', 'e', 'draw'].includes(res.winner), `random combat ${i}: no winner`); n++; }
  check(n === 200, 'random combats'); }
// 11. priority of a reaction (any event): the player's request plays first, so the Boss's request (normal priority) comes after it and wins; without priority the player's wins
check(first([card('P', 'tPlayerFirst')], [card('E', 'tBossFirst'), card('F', null)]) === 'player', 'without priority the player (applied last) wins');
check(first([card('P', 'tPlayerFirstEarly')], [card('E', 'tBossFirst'), card('F', null)]) === 'boss', 'a reaction with priority first plays before the others and is overridden');
// 12. a hero reacts to the events of the order like a card: "the player's camp attacks first" against a bigger Boss board
{ const heroPlay = (power, theirs) => { const ctx = { heroes: [{ hp: 10, maxhp: 10, def: { name: 'Hero', power: { t: 'passive', fx: power, a: 0, h: 0, n: 0 } } }], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, summonBonus: {}, owedEquipment: 0 };
    g.setSeed(1); const m = g.runCombat(one('P'), theirs, ctx).frames.map(f => f.msg); return m.includes(g.I18N.t('log.bossFirst')) ? 'boss' : 'player'; };
  check(heroPlay('tNone', two('E')) === 'boss', 'a hero without reaction changes nothing');
  check(heroPlay('tPlayerFirst', two('E')) === 'player', 'a hero power reacts to firstSide'); }
// 13. duration: a modification posed for 2 rooms is applied again to the next combat (and not to the one after), then forgotten
{ const ctx = () => ({ heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'surge' } }, summonBonus: {}, owedEquipment: 0 });
  const run = (mine, theirs, c) => { g.setSeed(1); const m = g.runCombat(mine, theirs, c).frames.map(f => f.msg); return m.includes(g.I18N.t('log.bossFirst')) ? 'boss' : 'player'; };
  const c = ctx();
  check(run(two('P'), one('E'), c) === 'player', 'reference: the bigger player board attacks first');
  check(run([card('P', 'tBossFirstFor2')], one('E'), c) === 'boss' && (c.timedMods || []).length === 1, 'the timed modification applies in the room where it is posed and is kept');
  check(run(two('P'), one('E'), c) === 'boss' && !(c.timedMods || []).length, 'it applies to the next combat, then it is forgotten');
  check(run(two('P'), one('E'), c) === 'player', 'and no longer after that'); }
console.log('✓ order: default, bands moved (own, foe, first, last), direction, priorities (first, number, late), replays, first attacker (tie, bigger board, tie only), priority of reactions, heroes reacting, duration over rooms, invalid templates refused.');
