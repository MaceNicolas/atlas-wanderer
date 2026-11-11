// Atlas Wanderer — the flow interpreter: it runs the actions that the mod declares in game.json (cost, conditions, effects).
// Spec: documentation/mecaniques/flux-de-jeu.md. Step 2 of the migration: the reinforcement purchases (servant, equipment, level) run through here.
// The engine only provides the generic mechanisms below; the names, prices, conditions and sequences are the mod's.
// Bridging (until step 3, generic state): a resource of game.json names the field of the game state that holds it ("field").
const GAME = (() => {
  let installed = null;
  const install = game => { installed = game; };                    // tools hand the description over; the browser reads MOD.game
  const def = () => installed || (typeof MOD !== 'undefined' && MOD.game) || null;
  // Things the engine's own code provides to the interpreter (registered by engine.js):
  //   openers[choiceId](g, rf, params, say) -> true if the choice opened, false if there was nothing to offer (the price is then refunded)
  //   hooks.afterSpend(g, resourceId, amount, say), hooks.afterRefund(g, resourceId, amount)
  //   events[name](g, rf, say): reactions to the events that steps emit (roomStart, startMission, beforeIncome, startReinforcement, endReinforcement)
  //   runners[name](g, rf, say): the automatic phases of the core that steps run (bossReinforcement, combat, settlement, aftermath)
  //   hooks.final(g, result): the game is over
  const openers = {}, hooks = {}, events = {}, runners = {};
  // Results of the runners that the interface needs to show them (the combat to play, the lines of the report, the Adaptation choices). Not saved.
  const out = {};

  const field = id => def().state.resources[id].field;
  const table = (ref, index) => { const t = number(ref); return t[Math.min(index, t.length) - 1]; };
  const read = (g, id) => g[field(id)];
  const write = (g, id, v) => { g[field(id)] = v; };
  // A number written in the file, or a reference into the rules ("game.maxLevel", "rules.reinforcement.kinds.servant.cost").
  const number = v => {
    if (Number.isFinite(v)) return v;
    let node = RULES; for (const p of String(v).replace(/^rules\./, '').split('.')) node = node == null ? undefined : node[p];
    return node;
  };
  const choiceBlocking = rf => !!(rf.reward || rf.prophecy || rf.rolling);   // choices that stop everything else
  const choiceAny = rf => !!(rf.offer || choiceBlocking(rf));
  const zoneFull = (g, zone) => (zone === 'hand' ? handFull(g) : (g[zone] || []).length >= number(def().state.zones[zone].max));
  const queries = { bossHp: g => g.boss.hp, heroesAlive: g => g.heroes.filter(h => h.hp > 0).length, room: g => g.room };
  const compare = (p, value) => { const c = ['lt', 'le', 'eq', 'ge', 'gt'].find(k => k in p), v = number(p[c]); return { lt: value < v, le: value <= v, eq: value === v, ge: value >= v, gt: value > v }[c]; };
  function holds(p, g, rf) {
    if ('not' in p) return !holds(p.not, g, rf);
    if ('any' in p) return p.any.some(x => holds(x, g, rf));
    if ('all' in p) return p.all.every(x => holds(x, g, rf));
    if ('zone' in p) return p.is === 'full' ? zoneFull(g, p.zone) : (g[p.zone] || []).length === 0;
    if ('resource' in p) return compare(p, read(g, p.resource));
    if ('query' in p) return compare(p, queries[p.query](g));
    // "any": any choice open (an offer included); "other": a choice that blocks everything (a reinforcement offer does not: another can be requested).
    if ('choiceOpen' in p) return (p.choiceOpen === 'any' ? choiceAny(rf) : choiceBlocking(rf));
    return false;
  }
  // The state of a side at the start of a game, built from the description: its zones (empty), its resources (their start values) and the variables
  // that the description attaches to it. The engine adds what depends on the choices of the player (heroes, dungeon, types, boss) on top of it.
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  function initialSide(sideId) {
    const st = def().state, side = st.sides[sideId], out = {};
    for (const z of side.zones) out[z] = [];
    for (const r of side.resources) out[field(r)] = st.resources[r].start;
    for (const [k, v] of Object.entries(st.vars || {})) if (v.sides.includes(sideId)) out[k] = clone(v.default);
    return out;
  }
  const action = id => def().actions[id];
  // What an action costs: { resourceId: amount }.
  const costOf = id => Object.fromEntries(Object.entries(action(id).cost || {}).map(([r, v]) => [r, number(v)]));
  // The price shown on a button: the amount of the first resource of the cost (0 if free).
  const price = id => Object.values(costOf(id))[0] || 0;
  const canRun = (g, rf, id) => {
    const a = action(id); if (!a || !g || !rf) return false;
    if (!(a.when || []).every(p => holds(p, g, rf))) return false;
    return Object.entries(costOf(id)).every(([r, n]) => read(g, r) >= n);
  };
  // Choice that an action opens, with its parameters (the interface highlights the button of the open offer).
  const opens = id => { const e = (action(id).effects || []).find(x => x.action === 'openChoice'); return e ? { choice: e.choice, params: e.params || {} } : null; };

  function effect(e, g, rf, say, a) {
    switch (e.action) {
      case 'openChoice': return openers[e.choice](g, rf, e.params || {}, say) !== false;
      case 'incrementResource': {
        const r = def().state.resources[e.resource];
        write(g, e.resource, read(g, e.resource) + (e.amount || 1));
        if (r.stat) g.stats[r.stat] = (g.stats[r.stat] || 0) + (e.amount || 1);   // statistic counted for the end screen
        return true;
      }
      // Going up a level: the progress counter is full when it reaches (level + offset) Datacrons; at the top level it stays at 0.
      case 'gainResource': {
        const r = def().state.resources[e.resource], a = Number.isFinite(e.amount) ? e.amount : table(e.amount.table, read(g, e.amount.index));
        write(g, e.resource, read(g, e.resource) + a);
        if (r.gainStat) g.stats[r.gainStat] = (g.stats[r.gainStat] || 0) + a;
        if (e.log) say(I18N.t(e.log, { room: g.room, amount: a }));
        return true;
      }
      // The player ends the current interactive step (the end of the reinforcement).
      case 'endStep': if (g.flow) g.flow.released = true; return true;
      case 'levelUpIfFull': {
        const lvl = read(g, 'level'), cost = lvl + RULES.game.levelCostOffset;
        if (read(g, 'levelProgress') >= cost) {
          write(g, 'levelProgress', read(g, 'levelProgress') - cost); write(g, 'level', lvl + 1);
          say(I18N.t('log.levelReached', { level: lvl + 1 }));
          if (lvl + 1 >= number(def().state.resources.level.max)) write(g, 'levelProgress', 0);
        }
        return true;
      }
      default: return true;   // the other effects are not run by the interpreter yet (steps 3 and later)
    }
  }
  // Runs an action: conditions, price, effects. Returns false if it could not run. If an opened choice has nothing to offer, the price is refunded.
  function run(g, rf, id, say) {
    if (!canRun(g, rf, id)) return false;
    const a = action(id), cost = costOf(id);
    for (const [r, n] of Object.entries(cost)) { write(g, r, read(g, r) - n); if (hooks.afterSpend) hooks.afterSpend(g, r, n, say); }
    for (const e of a.effects || []) {
      if (effect(e, g, rf, say, a) === false) {
        for (const [r, n] of Object.entries(cost)) { write(g, r, read(g, r) + n); if (hooks.afterRefund) hooks.afterRefund(g, r, n); }
        return false;
      }
    }
    return true;
  }

  // ---- The flow: phases, steps and transitions of game.json ----
  // begin(g): the game starts at the first phase. advance(g, ctx): runs the steps one after the other until the game must wait, and tells why:
  //   { wait: 'actions', step }  an interactive step: the player acts (it ends when the action of "until" runs, or release(g) is called)
  //   { wait: 'screen', step, screen }  a step shown by the interface (the combat): the interface calls release(g) when it is done
  //   { wait: 'choice' }  a choice that blocks the game is open (the interface resolves it, then calls advance again)
  //   { wait: 'end', result, screen }  the game is over
  // ctx = { rf: () => the current reinforcement state (events may replace it), say: message => … }.
  const begin = g => { g.flow = { phase: def().flow.start, step: 0 }; };
  const release = g => { if (g.flow) g.flow.released = true; };
  const nextStep = f => { f.step++; delete f.entered; delete f.ran; delete f.released; delete f.exited; };
  function advance(g, ctx) {
    const F = def().flow, f = g.flow, say = m => (ctx.say ? ctx.say(m) : undefined);
    for (let guard = 0; guard < 500; guard++) {
      const ph = F.phases[f.phase];
      if (ph.final) {
        if (!f.finished) { f.finished = true; g.over = ph.result === 'won' ? 'win' : 'lose'; if (hooks.final) hooks.final(g, ph.result); }
        return { wait: 'end', result: ph.result, screen: ph.screen };
      }
      let rf = ctx.rf();
      if (rf && choiceBlocking(rf)) return { wait: 'choice' };
      const step = ph.steps[f.step];
      if (!step) {   // end of the phase: the first transition whose condition holds
        const t = ph.end.find(x => !x.if || holds(x.if, g, rf));
        for (const e of t.effects || []) effect(e, g, rf, say);
        f.phase = t.go; f.step = 0; ['entered', 'ran', 'released', 'exited'].forEach(k => delete f[k]);
        continue;
      }
      if (step.when && !step.when.every(p => holds(p, g, rf))) { nextStep(f); continue; }
      if (!f.entered) { f.entered = true; if (step.emit && step.emit.enter) events[step.emit.enter](g, ctx.rf(), say); continue; }
      if (!f.ran) {
        f.ran = true;
        for (const e of step.effects || []) effect(e, g, rf, say);
        if (step.run) runners[step.run](g, rf, say);
        continue;
      }
      if ((step.interactive || step.screen) && !f.released) return { wait: step.interactive ? 'actions' : 'screen', step: step.id, screen: step.screen };
      if (step.emit && step.emit.exit && !f.exited) { f.exited = true; events[step.emit.exit](g, rf, say); continue; }
      nextStep(f);
    }
    throw new Error('the flow does not stop');
  }
  return { install, def, openers, hooks, events, runners, out, begin, advance, release, canRun, run, price, costOf, opens, holds, action, initialSide, field };
})();
if (typeof module !== 'undefined') module.exports = GAME;
