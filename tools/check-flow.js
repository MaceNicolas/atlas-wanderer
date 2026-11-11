// Flow interpreter test (flux-de-jeu.md, step 2): the reinforcement purchases are run from the actions declared in game.json.
// Checks that prices, conditions and effects come from the data (changing the data changes the behavior), that a purchase with nothing to offer is refunded,
// and that the level goes up when the progress counter is full.
// Usage: node tools/check-flow.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const store = {}, localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js', 'save.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ HAND_MAX, GAME, RULES, SAVE, newGame, makeTeam, aiReinforcement, grantCompanion, isCompanion, serveGainEquipFor, HEROES, DUNGEONS, setSeed, handFull, HAND_MAX })', { Math, console, localStorage });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (c, m) => { if (!c) fail(m); };
const fresh = () => {
  g.setSeed(11);
  const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), rf = { log: [] };
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
const SAVE_ok = (G, rf) => {
  check(g.SAVE.save(G, rf), 'the save must succeed');
  const peek = g.SAVE.peek();
  check(peek && peek.ok && peek.info.room === G.room && peek.info.level === G.level && peek.info.selections.heroes.length === 2 && peek.info.selections.dungeon.length === 1, 'the menu summary must come from the description');
  const back = g.SAVE.load();
  check(back && JSON.stringify(back.g.board) === JSON.stringify(G.board) && back.g.heroes.length === 2, 'the loaded game must match');
  const key = Object.keys(store).find(k => /Save/.test(k)), broken = JSON.parse(store[key]); const shell = broken.g.$obj || broken.g; delete shell.hand; store[key] = JSON.stringify(broken);
  check(g.SAVE.load() === null, 'a save without a declared zone must be refused');
  return true;
};
// 5b. the flow (step 4): rooms, income, reinforcement, combat, report, transitions, end of the game, all from the description
{
  const setup = () => {
    g.setSeed(5); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), holder = { rf: null }, msgs = [];
    GAME.events.roomStart = () => { holder.rf = { offer: null, reward: null, log: [] }; };
    GAME.begin(G);
    return { G, holder, ctx: { rf: () => holder.rf, say: m => msgs.push(m) }, msgs };
  };
  // plays one room: reinforcement → finish → combat → report → next
  const room = (G, holder, ctx) => {
    let r = GAME.advance(G, ctx);
    check(r.wait === 'actions' && r.step === 'reinforcement', `the flow must wait for the player at the reinforcement (got ${JSON.stringify(r)})`);
    check(GAME.canRun(G, holder.rf, 'finish') && GAME.run(G, holder.rf, 'finish', ctx.say), 'the action "finish" must end the step');
    r = GAME.advance(G, ctx);
    check(r.wait === 'screen' && r.step === 'combat' && GAME.out.combat && GAME.out.combat.frames, 'the combat must be computed and shown');
    GAME.release(G); r = GAME.advance(G, ctx);
    check(r.wait === 'screen' && r.step === 'aftermath' && Array.isArray(GAME.out.lines), 'the report must be shown after the settlement');
    GAME.release(G); return GAME.advance(G, ctx);
  };
  let { G, holder, ctx, msgs } = setup();
  const income1 = g.RULES.game.income[0];
  let r = GAME.advance(G, ctx);
  check(r.wait === 'actions' && G.datacrons === income1 && G.room === 1 && G.stats.earned === income1, 'the first room: income of the table of the rules');
  check(msgs.some(m => /Datacrons/.test(m)), 'the income is told in the log');
  G.flow.released = true; GAME.advance(G, ctx); GAME.release(G);
  r = GAME.advance(G, ctx); GAME.release(G); r = GAME.advance(G, ctx);
  check(r.wait === 'actions' && G.room === 2 && G.datacrons >= g.RULES.game.income[1], 'the room goes up and the next income arrives');
  // victory and defeat come from the transitions
  ({ G, holder, ctx } = setup()); GAME.advance(G, ctx);
  G.boss.hp = 0; GAME.run(G, holder.rf, 'finish', ctx.say); GAME.advance(G, ctx); GAME.release(G); GAME.advance(G, ctx); GAME.release(G);
  r = GAME.advance(G, ctx);
  check(r.wait === 'end' && r.result === 'won' && G.over === 'win' && G.room === 2, 'boss down: victory, the room is counted');
  ({ G, holder, ctx } = setup()); GAME.advance(G, ctx);
  G.heroes.forEach(h => { h.hp = 0; }); GAME.run(G, holder.rf, 'finish', ctx.say); GAME.advance(G, ctx); GAME.release(G); GAME.advance(G, ctx); GAME.release(G);
  r = GAME.advance(G, ctx);
  check(r.wait === 'end' && r.result === 'lost' && G.over === 'lose', 'heroes down: defeat');
  // the description decides: without the income step there is no income; a changed table changes it
  ({ G, holder, ctx } = setup());
  const steps = game.flow.phases.room.steps, income = steps.find(x => x.id === 'income'); steps.splice(steps.indexOf(income), 1);
  GAME.advance(G, ctx); check(G.datacrons === 0, 'without the income step of the description, no Datacrons arrive');
  steps.splice(2, 0, income);
  ({ G, holder, ctx } = setup()); const t = g.RULES.game.income, saved = t[0]; t[0] = 9; GAME.advance(G, ctx);
  check(G.datacrons === 9, 'the income follows the table of the rules'); t[0] = saved;
  // the save keeps the position in the flow
  ({ G, holder, ctx } = setup()); GAME.advance(G, ctx);
  check(g.SAVE.save(G, holder.rf), 'save'); const back = g.SAVE.load();
  check(back && back.g.flow.phase === 'room' && back.g.flow.step === G.flow.step, 'the position in the flow must be saved');
}
// 5c. the Boss plays the same actions as the player: the description decides what it can buy and for how much
{
  const play = () => { g.setSeed(21); const G = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] }), t = G.bossTeams[2]; t.malus = 0; g.aiReinforcement(t, 5, () => {}); return t; };
  const income = g.RULES.game.income[4], normal = play();
  check(normal.datacrons < income && normal.board.length > 1, 'the Boss spends its Datacrons and fills its board');
  const was = game.actions.buyServant.cost.datacrons; game.actions.buyServant.cost.datacrons = 100;
  const broke = play();
  check(broke.datacrons >= income - 2 && broke.board.length === 1, 'a servant that costs too much: the Boss cannot buy it (only levels, if any)');
  game.actions.buyServant.cost.datacrons = was;
  const eq = game.actions.buyEquipment; delete game.actions.buyEquipment;
  const noEq = play();
  check(!noEq.board.some(s => s.equips.length) && !noEq.hand.some(h => h.kind === 'equip'), 'without the equipment action in the description, the Boss buys no equipment');
  game.actions.buyEquipment = eq;
}
// 5d. the setup (step 5): what the player chooses, in which order, how many, all from the description
{
  const steps = game.setup.steps, sel = GAME.emptySelection();
  check(sel.dungeon === null && Array.isArray(sel.heroes) && sel.heroes.length === 0, 'an empty selection has one entry per step');
  const heroIds = Object.keys(g.HEROES), dungeonIds = Object.keys(g.DUNGEONS);
  check(!GAME.setupComplete(sel) && GAME.setupNext(sel, 0) === null, 'nothing chosen: the setup is not complete and cannot go on');
  GAME.toggle(sel, 'dungeon', dungeonIds[0]); GAME.toggle(sel, 'dungeon', dungeonIds[1]);
  check(sel.dungeon === dungeonIds[1] && GAME.setupNext(sel, 0) === 1, 'a single choice is replaced, and the next step opens once it is made');
  GAME.toggle(sel, 'heroes', heroIds[0]); GAME.toggle(sel, 'heroes', heroIds[1]); GAME.toggle(sel, 'heroes', heroIds[2]);
  check(sel.heroes.length === 2 && !sel.heroes.includes(heroIds[2]), 'a multiple choice stops at its count');
  GAME.toggle(sel, 'heroes', heroIds[0]); check(sel.heroes.length === 1 && !GAME.setupComplete(sel), 'a choice can be undone');
  GAME.toggle(sel, 'heroes', heroIds[2]);
  check(GAME.setupComplete(sel) && GAME.setupBack(1) === 0 && GAME.setupScreen(1) === 'heroSelect', 'complete setup; going back and screens come from the description');
  const G = g.newGame(sel);
  check(G.dungeon.id === dungeonIds[1] && G.heroes.length === 2 && G.heroes[0].def.id === sel.heroes[0] && G.types.length === g.RULES.game.gameTypes && G.bossTeams.length === g.RULES.game.bossBoards.length, 'the new game is built from the selection and the initialisation effects');
  // the description decides: three heroes instead of two
  const was = steps[1].pick.count; steps[1].pick.count = 3;
  const sel3 = GAME.emptySelection(); heroIds.slice(0, 5).forEach(id => GAME.toggle(sel3, 'heroes', id)); GAME.toggle(sel3, 'dungeon', dungeonIds[0]);
  check(sel3.heroes.length === 3 && GAME.setupComplete(sel3) && g.newGame(sel3).heroes.length === 3, 'a count changed in the description changes the setup and the game');
  steps[1].pick.count = was;
}
// 5e. the companion card (step 7): who gets it, its name and its rules come from the description
{
  const { G } = fresh(), msgs = [], rule = game.companion;
  g.grantCompanion(G, ['elk'], m => msgs.push(m));
  check(!G.companion, 'a type other than the one of the description does not give the companion');
  g.grantCompanion(G, [rule.type], m => msgs.push(m));
  check(G.companion && g.isCompanion(G.companion.s) && G.hand.includes(G.hand.find(h => h.s === G.companion.s)) && G.companion.s.name === 'PR-' + String(G.companionNumber.toString(16)).toUpperCase().padStart(3, '0'), 'the companion arrives in the hand with the name of the description');
  g.grantCompanion(G, [rule.type], m => msgs.push(m));
  check(G.hand.filter(h => h.s && g.isCompanion(h.s)).length === 1, 'only one companion per game');
  while (!g.handFull(G)) G.hand.push({ kind: 'equip', def: { name: 'x' } });
  check(g.handFull(G) && G.hand.length === g.HAND_MAX + 1, 'the companion does not count toward the hand limit');
  const was = rule.type, fmt = rule.nameFormat; rule.type = 'dwork'; rule.nameFormat = 'CP/{number}';
  const B = fresh().G; g.grantCompanion(B, ['nythe'], () => {}); check(!B.companion, 'a changed type in the description changes who gets the companion');
  g.grantCompanion(B, ['dwork'], () => {}); check(B.companion && B.companion.s.name.startsWith('CP/'), 'a changed name format changes the companion\'s name');
  rule.type = was; rule.nameFormat = fmt;
}
// 5. an action that the mod does not declare does not exist
check(!GAME.canRun(fresh().G, { log: [] }, 'nothing'), 'an unknown action must not run');
// 6. the state of a game is built from the description (step 3): zones, resources and variables of each side
{
  const st = game.state, was = JSON.parse(JSON.stringify(st));
  const G = fresh().G;
  for (const z of Object.keys(st.zones)) check(Array.isArray(G[z]) && G[z].length === 0, `zone ${z} must start empty`);
  g.setSeed(11); const A = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] });
  check(A.datacrons === st.resources.datacrons.start && A.level === st.resources.level.start && A.counter === st.resources.levelProgress.start && A.room === st.resources.room.start, 'the resources must start at the values of the description');
  check(A.bossTeams.length === g.RULES.game.bossBoards.length && A.bossTeams.every(t => Array.isArray(t.board) && t.level === 1 && t.stats && t.droneBonus), 'each Boss board is built from the description of its side');
  st.resources.datacrons.start = 7; st.vars.testCounter = { default: { n: 3 }, sides: ['player', 'boss'] };
  g.setSeed(11); const B = g.newGame({ heroes: Object.keys(g.HEROES).slice(0, 2), dungeon: Object.keys(g.DUNGEONS)[0] });
  check(B.datacrons === 7, 'a changed start value must change the new game');
  check(B.testCounter && B.testCounter.n === 3 && B.testCounter !== st.vars.testCounter.default && B.bossTeams[0].testCounter, 'a variable added to the description must exist on its sides (as a copy)');
  delete st.vars.testCounter; st.resources.datacrons.start = was.resources.datacrons.start;
  // the save is generic: what it checks and what it tells about a game comes from the description
  const rf = { log: [] };
  check(SAVE_ok(A, rf), 'a game must be saved and found again');
}
console.log('✓ flow: purchases run from game.json (price, conditions, offer size, refund, level), and follow the data when it changes.');
