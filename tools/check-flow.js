// Flow interpreter test (flux-de-jeu.md, step 2): the reinforcement purchases are run from the actions declared in game.json.
// Checks that prices, conditions and effects come from the data (changing the data changes the behavior), that a purchase with nothing to offer is refunded,
// and that the level goes up when the progress counter is full.
// Usage: node tools/check-flow.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const store = {}, localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js', 'save.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ HAND_MAX, GAME, RULES, SAVE, newGame, makeTeam, mkServant, applyFx, isGameLevel, promiseRule, checkPromises, ACTIVES, expireTemp, aiReinforcement, goldSkill, goldName, resolveFusion, grantCompanion, isCompanion, serveGainEquipFor, HEROES, DUNGEONS, setSeed, handFull, HAND_MAX })', { Math, console, localStorage });
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
// 5f. the fusion (step 7): the count, the name, the way the values change and the reward all come from the description
{
  const F = game.fusion, k = { t: 'startCombat', fx: 'buffAllies', a: 2, h: 3, n: 0 };
  const d = g.goldSkill(k); check(d.a === 4 && d.h === 6, 'the default rule doubles the values');
  const sh = g.goldSkill({ t: 'passive', fx: 'shieldCharges', a: 0, h: 0, n: 2 }); check(sh.n === 3 && sh.a === 0, 'a template with its own "gold" rule changes the skill its own way');
  const was = JSON.stringify(F.defaultGold); F.defaultGold = { a: { add: 1 } };
  const e = g.goldSkill(k); check(e.a === 3 && e.h === 3, 'changing the default rule in the description changes the gold skill');
  F.defaultGold = JSON.parse(was);
  check(g.goldName('Cadet') === 'Cadet doré', 'the gold name comes from the text named by the description');
  const { G } = fresh();
  const mk = () => g.mkServant({ id: 'x', name: 'Trio', rank: 1, atk: 2, hp: 2, types: ['pilot'], kw: [], skill: null, sockets: ['red'] });
  G.hand.length = 0; G.board.length = 0; G.board.push(mk(), mk()); G.hand.push({ kind: 'servant', s: mk() });
  const was2 = F.count; F.count = 4; check(!g.resolveFusion(G, { }, () => {}), 'with a count of 4 in the description, three identical servants do not fuse'); F.count = was2;
  const rf = {}; check(g.resolveFusion(G, rf, () => {}), 'three identical servants fuse');
  const gold = G.board.find(x => x.gold);
  check(gold && gold.baseName === 'Trio' && gold.atk === 6 && rf.reward && rf.reward.rank === Math.min(g.RULES.game.maxRank, G.level + F.rewardRankOffset), 'the gold servant sums the statistics and the reward rank follows the description');
}
// 5g. the active powers of the heroes (step 7): labels, targets, costs and effects come from the description
{
  const { G } = fresh(), A = g.ACTIVES.grantRebirth, C = g.ACTIVES.completeFusion;
  check(A && A.label === game.heroActions.grantRebirth.label && A.icon === 'medic' && !A.repeat && C.repeat && g.ACTIVES.nothing === undefined, 'the active powers are built from the description');
  const a = g.mkServant({ id: 'a', name: 'A', rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: null }); G.board.push(a);
  check(A.ok(G, a), 'a servant that passes the tests can be targeted'); a.kw.push('rebirth'); check(!A.ok(G, a), 'the target tests of the description decide who can be targeted'); a.kw.pop();
  const hero = { def: { name: 'H' } }; const msgs = [];
  check(A.run(G, a.uid, m => msgs.push(m), hero, {}) && a.kw.includes('rebirth') && a.tmpKw.includes('rebirth'), 'the effect gives the keyword until the next reinforcement');
  g.expireTemp(G); check(!a.kw.includes('rebirth') && !a.tmpKw, 'the temporary keyword goes away when the next reinforcement opens');
  const b = g.mkServant({ id: 'b', name: 'B', rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: null }), c = g.mkServant({ id: 'c', name: 'B', rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: null });
  G.board.push(b, c);
  check(C.cost({ uses: 0 }) === g.RULES.game.fusionCost && C.cost({ uses: 2 }) === g.RULES.game.fusionCost + 2 * g.RULES.game.fusionStep, 'the cost follows the base and the step of the rules');
  const w = game.heroActions.grantRebirth.targets.where; w.pop(); a.kw.push('rebirth'); check(A.ok(G, a), 'removing a target test from the description widens the targets'); a.kw.pop(); w.push({ lacksKeyword: 'rebirth' });
}
// 5h. the promised cards (step 7): the hero who promises, the choice, the delivery all come from the description
{
  const heroId = Object.keys(g.HEROES).find(id => g.HEROES[id].power && g.HEROES[id].power.fx === 'prophecy'), other = Object.keys(g.HEROES).find(id => id !== heroId);
  const rule = game.promises.prophecy;
  g.setSeed(3); const G = g.newGame({ heroes: [heroId, other], dungeon: Object.keys(g.DUNGEONS)[0] }), holder = { rf: null };
  GAME.events.roomStart = () => { holder.rf = { offer: null, reward: null, log: [] }; };
  GAME.begin(G); const ctx = { rf: () => holder.rf, say: () => {} };
  let r = GAME.advance(G, ctx);
  check(r.wait === 'choice' && holder.rf.promise && holder.rf.promise.cards.length === g.RULES.game.fusionRewardProposals && holder.rf.promise.cards.every(c => c.rank === g.RULES.game.maxRank), 'the hero with the promising power opens the choice at the start, with cards of the exact rank of the description');
  G.promises.push({ power: holder.rf.promise.power, card: holder.rf.promise.cards[0], done: false }); holder.rf.promise = null;
  r = GAME.advance(G, ctx); check(r.wait === 'actions', 'the flow goes on once the choice is made');
  const cost = g.RULES.game.prophecyCost;
  GAME.pay(G, 'datacrons', cost - 1, () => {}); check(G.spent.datacrons === cost - 1 && !G.promises[0].done && G.hand.length === 0, 'not yet: the amount spent is short by one');
  GAME.pay(G, 'datacrons', 1, () => {}); check(G.promises[0].done && G.hand.length === 1 && G.hand[0].s.name === G.promises[0].card.name, 'the promised card reaches the hand when the amount is spent');
  // the description decides: a lower amount of spending delivers earlier; a full hand makes the card wait
  const was = rule.deliver.spent; rule.deliver.spent = 5;
  const H = g.newGame({ heroes: [heroId, other], dungeon: Object.keys(g.DUNGEONS)[0] });
  H.promises.push({ power: 'prophecy', card: G.promises[0].card, done: false });
  while (!g.handFull(H)) H.hand.push({ kind: 'equip', def: { name: 'x' } });
  GAME.pay(H, 'datacrons', 5, () => {}); check(!H.promises[0].done, 'a full hand: the promised card waits for a slot');
  H.hand.pop(); GAME.pay(H, 'datacrons', 0, () => {}); check(H.promises[0].done, 'a slot is free: the card arrives');
  rule.deliver.spent = was;
}
// 5i. the bags (step 7): the die of Datacrons comes from the description
{
  const bag = game.bags.datacube, { G } = fresh();
  G.datacrons = 20; const drawn = [];
  for (let i = 0; i < bag.faces.length * bag.copies; i++) { const d = GAME.drawBag(G, 'datacube'); drawn.push(d.value); check(G.lastDraw === d && d.bag === 'datacube', 'the draw is noted for the interface'); }
  check(JSON.stringify(drawn.slice().sort((a, b) => a - b)) === JSON.stringify(bag.faces.flatMap(f => Array(bag.copies).fill(f)).sort((a, b) => a - b)), 'a full bag gives every face "copies" times before it is refilled');
  check(G.bags.datacube.length === 0, 'the bag is empty after all its marbles');
  const before = G.datacrons, e0 = G.stats.earned, d = GAME.drawBag(G, 'datacube');
  check(G.bags.datacube.length === bag.faces.length * bag.copies - 1 && d.before === before && G.datacrons === Math.max(bag.effect.floor, before + d.value) && G.stats.earned === e0 + Math.max(0, d.value), 'refilled, then the value is added, counted as a gain if positive');
  G.datacrons = 0; bag.faces.forEach(() => GAME.drawBag(G, 'datacube')); check(G.datacrons >= bag.effect.floor, 'the resource never goes below the floor');
  const was = [bag.copies, bag.effect.floor]; bag.copies = 1; bag.effect.floor = 4; G.bags = {}; G.datacrons = 4;
  GAME.drawBag(G, 'datacube'); check(G.bags.datacube.length === bag.faces.length - 1 && G.datacrons >= 4, 'changing the copies and the floor in the description changes the draws');
  [bag.copies, bag.effect.floor] = was;
  // the hero power that draws is found from its template, not from a list of the engine
  check(g.isGameLevel('datacube') && g.isGameLevel('forgePatch') && !g.isGameLevel('buffAllies'), 'a power is of the game level when its template reacts to the event "game"');
}
// 5j. summoned units (step 7): the kinds, their names and their bonuses come from the description, the engine only says "summon"
{
  const kind = game.tokens.drone, mk = () => g.mkServant({ id: 's', name: 'S', rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: null });
  const src = mk(), allies = [src], k = { t: 'startCombat', fx: 'summon', a: 2, h: 3, n: 0 };
  g.applyFx(k, src, allies, [], () => {}, {});
  const u = allies[1];
  check(u && u.token === 'drone' && u.name === kind.name && u.rank === kind.rank && u.atk === 2 && u.hp === 3, 'the summoned unit is made from its kind in the description');
  src.summonA = 1; src.summonH = 1; const allies2 = [src];
  g.applyFx(k, src, allies2, [], () => {}, { drone: { a: 10, h: 20 } });
  check(allies2[1].atk === 2 + 1 + 10 && allies2[1].hp === 3 + 1 + 20, 'the bonus of the carrier and the bonus of its side for this kind add to the values of the power');
  check(Object.keys(g.mkServant({ id: 'x', name: 'X', rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: null })).includes('summonA'), 'servants carry the generic summon bonus fields');
  const was = [kind.name, kind.rank]; kind.name = 'Sprite'; kind.rank = 3;
  const allies3 = [src]; g.applyFx(k, src, allies3, [], () => {}, {});
  check(allies3[1].name === 'Sprite' && allies3[1].rank === 3, 'renaming the kind in the description renames the units it summons'); [kind.name, kind.rank] = was;
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
  check(A.bossTeams.length === g.RULES.game.bossBoards.length && A.bossTeams.every(t => Array.isArray(t.board) && t.level === 1 && t.stats && t.summonBonus), 'each Boss board is built from the description of its side');
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
