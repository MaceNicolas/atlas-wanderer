// Flow interpreter test (flux-de-jeu.md, step 2): the reinforcement purchases are run from the actions declared in game.json.
// Checks that prices, conditions and effects come from the data (changing the data changes the behavior), that a purchase with nothing to offer is refunded,
// and that the level goes up when the progress counter is full.
// Usage: node tools/check-flow.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ GAME, RULES, newGame, HEROES, DUNGEONS, setSeed, handFull, HAND_MAX })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (c, m) => { if (!c) fail(m); };
const fresh = () => {
  g.setSeed(11);
  const G = g.newGame(Object.keys(g.HEROES).slice(0, 2), Object.keys(g.DUNGEONS)[0]), rf = { log: [] };
  G.datacrons = 10; return { G, rf, say: m => rf.log.push(m) };
};
const GAME = g.GAME, game = GAME.def();

// 1. a servant purchase: price from the data, an offer of the size given by the rules
{
  const { G, rf, say } = fresh();
  check(GAME.price('buyServant') === g.RULES.reinforcement.kinds.servant.cost, 'the price shown must be the one of the rules');
  check(GAME.run(G, rf, 'buyServant', say), 'buyServant must run');
  check(G.datacrons === 10 - GAME.price('buyServant'), 'the price must be paid');
  check(rf.offer && rf.offer.cards.length === g.RULES.reinforcement.proposals[0] && rf.offer.kinds.every(k => k === 'servant'), 'the offer has the size of the rules, with servants only');
  check(GAME.run(G, rf, 'buyEquipment', say) && rf.offer.kinds.every(k => k === 'equip'), 'a new offer of another kind replaces the open one');
}
// 2. conditions and prices come from the data
{
  const { G, rf, say } = fresh();
  const was = game.actions.buyServant.cost.datacrons;
  game.actions.buyServant.cost.datacrons = 4;
  check(GAME.run(G, rf, 'buyServant', say) && G.datacrons === 6, 'changing the price in the data must change what is paid');
  G.datacrons = 3; check(!GAME.canRun(G, rf, 'buyServant'), 'not enough Datacrons: the action must not run');
  game.actions.buyServant.cost.datacrons = was;
  G.datacrons = 10; while (!g.handFull(G)) G.hand.push({ kind: 'equip', def: { name: 'x' } });
  check(!GAME.canRun(G, rf, 'buyServant'), 'a full hand: the action must not run');
  const saved = game.actions.buyServant.when; game.actions.buyServant.when = [];
  check(GAME.canRun(G, rf, 'buyServant'), 'without the condition of the data, the action runs even with a full hand');
  game.actions.buyServant.when = saved;
  rf.reward = { cards: [] }; G.hand.length = 0;
  check(!GAME.canRun(G, rf, 'buyServant') && !GAME.canRun(G, rf, 'buyLevel'), 'an open reward blocks the purchases');
  rf.reward = null; rf.offer = { kinds: [], cards: [] };
  check(GAME.canRun(G, rf, 'buyServant') && !GAME.canRun(G, rf, 'buyLevel'), 'an open offer can be replaced but blocks the level purchase');
}
// 3. nothing to offer: the price is refunded
{
  const { G, rf, say } = fresh();
  const opener = GAME.openers.offer; GAME.openers.offer = () => false;
  check(!GAME.run(G, rf, 'buyServant', say) && G.datacrons === 10, 'a purchase with nothing to offer must be refunded');
  GAME.openers.offer = opener;
}
// 4. the level: progress counted, level up when full, statistic counted
{
  const { G, rf, say } = fresh();
  const need = G.level + g.RULES.game.levelCostOffset;
  for (let i = 0; i < need - 1; i++) GAME.run(G, rf, 'buyLevel', say);
  check(G.level === 1 && G.counter === need - 1 && G.stats.contrib === need - 1, 'the progress must be counted until the level is reached');
  GAME.run(G, rf, 'buyLevel', say);
  check(G.level === 2 && G.counter === 0, 'the level must go up when the progress is full');
  G.level = g.RULES.game.maxLevel; G.datacrons = 5;
  check(!GAME.canRun(G, rf, 'buyLevel'), 'the level purchase must stop at the maximum level');
}
// 5. an action that the mod does not declare does not exist
check(!GAME.canRun(fresh().G, { log: [] }, 'nothing'), 'an unknown action must not run');
console.log('✓ flow: purchases run from game.json (price, conditions, offer size, refund, level), and follow the data when it changes.');
