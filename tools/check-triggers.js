// The triggers of the powers (game.json, triggers; spec documentation/mecaniques/evenements-et-effets.md): a name is tied to a moment the engine announces, or derived from an
// event the combat reports. Checks: two names for one moment play the same way; a derived trigger fires the powers of its name, at the right cards, once when it says so;
// the validation of the table. Usage: node tools/check-triggers.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript()
  + '\n;({ SERVANTS, HEROES, DUNGEONS, mkServant, runCombat, setSeed, POWERS, GAME, EVENTS })', { Math, console });
const core = require('../site/editor-core.js'), SCHEMA = require('../prototype/game-schema.js');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const base = JSON.parse(JSON.stringify(g.GAME.def())), dungeon = Object.values(g.DUNGEONS)[0], ctx = { heroes: [], level: 3, room: 3, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'none' } } };
const install = (triggers, templates = {}) => { g.GAME.install({ ...base, triggers: { ...base.triggers, ...triggers } }); g.POWERS.install({ ...g.POWERS.all(), ...templates }); };
const card = (name, atk, hp, skill, extra = {}) => g.mkServant({ id: name, name, rank: 1, atk, hp, types: ['pilot'], kw: [], skill, ...extra });
const plain = (n, atk, hp) => card(n, atk, hp, null);

// 1. Two names for one moment: "charge" plays like "assault".
const assaultCard = Object.values(g.SERVANTS).find(s => [].concat(s.skill || []).some(k => k.t === 'assault'));
const k0 = [].concat(assaultCard.skill).find(k => k.t === 'assault');
const fight = t => { g.setSeed(11); const A = card('Charger', 3, 6, { ...k0, t }), res = g.runCombat([A, plain('P2', 2, 4)], [plain('E1', 2, 5), plain('E2', 3, 3)], ctx); return JSON.stringify(res.frames.map(f => [f.msg, f.p.map(s => s.atk + '/' + s.hp)])); };
install({ charge: { kind: 'combat', moment: 'assault' } });
if (fight('assault') !== fight('charge')) fail('a second name for the moment "assault" does not play like the first');

// 2. A derived trigger: the first time a card deals damage, it gets +2 attack (a template written here).
const tpl = { tBuff: { then: [{ action: 'stats', target: { side: 'self' }, atk: 2, hp: 0, log: 'log.buffSelf' }] } };
const buffs = (res, trigger) => res.frames.flatMap(f => f.events).filter(e => e.type === 'statsChanged' && e.cause && e.cause.trigger === trigger);
install({ firstBlood: { kind: 'combat', on: 'damage', who: 'source', once: 'combat' } }, tpl);
let res = (g.setSeed(5), g.runCombat([card('A', 2, 9, { t: 'firstBlood', fx: 'tBuff', a: 0, h: 0, n: 0 }), plain('B', 1, 9)], [plain('E1', 1, 6), plain('E2', 1, 6)], ctx));
if (buffs(res, 'firstBlood').length !== 1) fail(`"once: combat" must fire exactly once (fired ${buffs(res, 'firstBlood').length} times)`);
if (buffs(res, 'firstBlood')[0].atk !== 2) fail('the derived power did not do its effect');
// once: card — each card with the power fires once
install({ firstBlood: { kind: 'combat', on: 'damage', who: 'source', once: 'card' } }, tpl);
const two = [card('A', 2, 9, { t: 'firstBlood', fx: 'tBuff', a: 0, h: 0, n: 0 }), card('B', 2, 9, { t: 'firstBlood', fx: 'tBuff', a: 0, h: 0, n: 0 })];
res = (g.setSeed(5), g.runCombat(two, [plain('E1', 1, 8), plain('E2', 1, 8)], ctx));
if (buffs(res, 'firstBlood').length !== 2) fail(`"once: card" must fire once per card (fired ${buffs(res, 'firstBlood').length} times)`);
// no limit: fires each time
install({ firstBlood: { kind: 'combat', on: 'damage', who: 'source' } }, tpl);
res = (g.setSeed(5), g.runCombat([card('A', 2, 9, { t: 'firstBlood', fx: 'tBuff', a: 0, h: 0, n: 0 }), plain('B', 1, 9)], [plain('E1', 1, 6), plain('E2', 1, 6)], ctx));
if (buffs(res, 'firstBlood').length < 2) fail('a derived trigger with no limit must fire every time');
// who: the target of the damage, and a condition on the event
install({ painful: { kind: 'combat', on: 'damage', who: 'target', if: { gte: [{ evt: 'amount' }, 3] } } }, tpl);
res = (g.setSeed(5), g.runCombat([card('Tough', 1, 12, { t: 'painful', fx: 'tBuff', a: 0, h: 0, n: 0 })], [plain('Weak', 2, 5), plain('Strong', 4, 5)], ctx));
const painful = buffs(res, 'painful');
if (!painful.length) fail('the condition on the event never held although a hit of 4 landed');
if (res.frames.flatMap(f => f.events).filter(e => e.type === 'damage' && e.amount < 3 && e.cause === null).length === 0) fail('the test needs a small hit to prove the condition');
// a trigger nobody uses costs nothing and changes nothing
install({ firstBlood: { kind: 'combat', on: 'damage', who: 'source', once: 'combat' } }, tpl);
g.setSeed(11); const unused = JSON.stringify(g.runCombat([card('Plain', 3, 6, null), plain('P2', 2, 4)], [plain('E1', 2, 5), plain('E2', 3, 3)], ctx).frames.map(f => f.msg));
install({}); g.setSeed(11); const without = JSON.stringify(g.runCombat([card('Plain', 3, 6, null), plain('P2', 2, 4)], [plain('E1', 2, 5), plain('E2', 3, 3)], ctx).frames.map(f => f.msg));
if (unused !== without) fail('a derived trigger no card uses changed a combat');
g.GAME.install(base); g.POWERS.install(g.POWERS.all());


// 2b. In the reinforcement too: a derived trigger on "cardPlaced" plays when the screen is redrawn, for the card that was placed; "once: combat" lasts one reinforcement.
{
  process.env.AW_MOD = process.env.AW_MOD || 'atlas-wanderer';
  const { load } = require('./load-game');
  const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, dataset: {}, querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({}), setAttribute() {}, focus() {} };
  const other = () => ({ ...app, innerHTML: '' });
  const game = load({ seed: 6, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } }), X = game.X, { UI, ACT, Z } = X;
  const def = JSON.parse(JSON.stringify(X.GAME.def()));
  X.GAME.install({ ...def, triggers: { ...def.triggers, onPlaced: { kind: 'renfort', on: 'cardPlaced', who: 'card' }, onceOnly: { kind: 'renfort', on: 'cardPlaced', who: 'card', once: 'combat' } } });
  X.POWERS.install({ ...X.POWERS.all(), tBuff: { then: [{ action: 'stats', target: { side: 'self' }, atk: 2, hp: 0, log: 'log.buffSelf' }] } });
  X.render(); ACT.selDungeon({ id: Object.keys(X.DUNGEONS)[0] }); ACT.toHeroes(); Object.keys(X.HEROES).slice(0, 2).forEach(id => ACT.selHero({ id })); ACT.start();
  const mk = (name, t) => X.mkServant({ id: name, name, rank: 1, atk: 1, hp: 3, types: ['pilot'], kw: [], skill: { t, fx: 'tBuff', a: 0, h: 0, n: 0 } });
  const g = UI.g;
  g[Z.reserve].push({ kind: 'servant', s: mk('A', 'onPlaced') }, { kind: 'servant', s: mk('B', 'onceOnly') }, { kind: 'servant', s: mk('C', 'onceOnly') });
  X.placeServant(g, g[Z.reserve].length - 3, null, () => {}); X.render();
  const A = g[Z.field].find(s => s.name === 'A');
  if (!A || A.atk !== 3) fail(`a servant placed with a "cardPlaced" power must get +2 when the screen is redrawn (atk ${A && A.atk})`);
  X.render(); if (A.atk !== 3) fail('the derived trigger played twice for one event');
  X.placeServant(g, g[Z.reserve].length - 2, null, () => {}); X.render(); X.placeServant(g, g[Z.reserve].length - 1, null, () => {}); X.render();
  const B = g[Z.field].find(s => s.name === 'B'), C = g[Z.field].find(s => s.name === 'C');
  if (B.atk !== 3 || C.atk !== 1) fail(`"once" must last one reinforcement: B ${B.atk}, C ${C.atk} (expected 3 and 1)`);
  X.GAME.install(def);
}

// 3. Validation of the table
const game = JSON.parse(JSON.stringify(base)), problems = t => core.validateGame({ ...game, triggers: t }, { schema: SCHEMA, files: {}, rules: {}, texts: {} }).filter(p => /^triggers/.test(p));
if (problems(game.triggers).length) fail(`the triggers of the mod are refused: ${problems(game.triggers)[0]}`);
const bad = (label, f) => { const t = JSON.parse(JSON.stringify(game.triggers)); f(t); if (!problems(t).length) fail(`${label} is accepted`); };
bad('an unknown moment', t => { t.x = { kind: 'combat', moment: 'nowhere' }; });
bad('a trigger with a moment and an event', t => { t.x = { kind: 'combat', moment: 'assault', on: 'damage', who: 'target' }; });
bad('an unknown event', t => { t.x = { kind: 'combat', on: 'explosion', who: 'target' }; });
bad('a derived trigger with no "who"', t => { t.x = { kind: 'combat', on: 'damage' }; });
bad('an unknown "who"', t => { t.x = { kind: 'combat', on: 'damage', who: 'everyone' }; });
bad('an unknown limit', t => { t.x = { kind: 'combat', on: 'damage', who: 'target', once: 'always' }; });
bad('a "who" on a moment trigger', t => { t.x = { kind: 'combat', moment: 'assault', who: 'target' }; });
bad('an unknown kind', t => { t.x = { kind: 'sideways', moment: 'assault' }; });
bad('a moment no trigger plays', t => { delete t.assault; });
console.log(`✓ triggers: ${Object.keys(base.triggers).length - 1} triggers of the mod valid; two names share a moment and play the same; a derived trigger fires at the right cards (in combat and in the reinforcement) (who, if, once combat / card) and a trigger nobody uses changes nothing; ${9} mistakes refused.`);
