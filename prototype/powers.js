// Atlas Wanderer — power bricks: the interpreter of the power templates of data/powers.json.
// A card still names its power the old way (sk('startCombat', 'buffAllies', 1, 1)); the template of "buffAllies" in data/powers.json says what it does
// with generic bricks (selector, expression, action). Texts of the combat log come from data/i18n/<lang>.json ("log.*" keys).
// Specification: documentation/mecaniques/pouvoirs-modulaires.md.
const POWERS = (() => {
  let defs = {};
  const base = typeof document !== 'undefined' && document.currentScript ? new URL('../data/', document.currentScript.src).href : '../data/';
  const fired = {};                                  // how many times each power was played (the tests use it to know what they exercised)
  const install = d => { defs = d; };
  const has = fx => Object.prototype.hasOwnProperty.call(defs, fx);

  const alive = l => l.filter(s => s.hp > 0);
  const uniqueTypes = (list, only) => new Set(list.flatMap(s => (only === 'species' ? s.types.filter(t => SPECIES.includes(t)) : s.types)));

  // ---------- Selectors: who is targeted ----------
  // { side: 'ally'|'enemy'|'self', ref: 'a',                      (a card bound earlier with "as")
  //   type, equipped, hasShield, hasKeyword, wounded,             (filters on the living cards of the side)
  //   exclude: 'carrier' | '@a',
  //   pick: 'all'|'random'|'leftmost'|'rightmost'|'ends'|'neighbors'|'leftNeighbor'|'min:hp'|'max:atk'…,   ("min:"/"max:" ties are drawn at random)
  //   as: 'a',                                                    (binds the picked card for the following actions)
  //   fallback: <selector> }                                      (used when nothing is picked)
  const matcher = sel => s => (!sel.type || s.types.includes(sel.type)) && (!sel.equipped || s.equips.length) && (!sel.hasShield || s.shield)
    && (!sel.hasKeyword || s.kw.includes(sel.hasKeyword)) && (!sel.wounded || s.hp < s.maxhp) && (!sel.name || s.name === sel.name) && (!sel.noBombs || !(s.bombs && s.bombs.length));
  function select(sel, c) {
    if (sel.side === 'self') return [c.carrier];
    if (sel.firstOf) { for (const alt of sel.firstOf) { const found = select(alt, c); if (found.length) return found; } return []; }   // the first alternative that gives someone
    if (sel.ref) return c.refs[sel.ref] && (!sel.alive || c.refs[sel.ref].hp > 0) ? [c.refs[sel.ref]] : [];
    const pool = sel.side === 'enemy' ? c.enemies : c.allies, ok = matcher(sel);
    let list = alive(pool).filter(ok);
    if (sel.exclude === 'carrier') list = list.filter(s => s !== c.carrier);
    else if (sel.exclude && sel.exclude[0] === '@') list = list.filter(s => s !== c.refs[sel.exclude.slice(1)]);
    let out;
    const extreme = /^(min|max):(\w+)$/.exec(sel.pick || '');
    if (extreme) {
      if (!list.length) out = [];
      else { const best = Math[extreme[1]](...list.map(s => s[extreme[2]])); out = [pick(list.filter(s => s[extreme[2]] === best))]; }
    } else switch (sel.pick || 'all') {
      case 'all': out = list; break;
      case 'random': out = list.length ? [pick(list)] : []; break;
      case 'leftmost': out = list.length ? [list[0]] : []; break;
      case 'rightmost': out = list.length ? [list[list.length - 1]] : []; break;
      case 'ends': out = [...new Set([list[0], list[list.length - 1]])].filter(Boolean); break;
      case 'neighbors': { const i = pool.indexOf(c.carrier); out = [pool[i - 1], pool[i + 1]].filter(s => s && s.hp > 0 && ok(s)); break; }
      case 'rightNeighbor': { const n = pool[pool.indexOf(c.carrier) + 1]; out = n && n.hp > 0 ? [n] : []; break; }
      case 'leftNeighbor': { const n = pool[pool.indexOf(c.carrier) - 1]; out = n && n.hp > 0 ? [n] : []; break; }
      default: throw new Error(`Unknown selector pick: ${sel.pick}`);
    }
    if (!out.length && sel.fallback) out = select(sel.fallback, c);
    if (sel.as) c.refs[sel.as] = out[0];
    return out;
  }

  // ---------- Expressions: numbers, "$a" (parameter or variable), and a few operations ----------
  const cardOf = (who, c) => (who === 'carrier' ? c.carrier : who === 'target' ? (c.target || c.refs.target) : c.refs[who[0] === '@' ? who.slice(1) : who]);
  function value(e, c) {
    if (typeof e === 'number') return e;
    if (typeof e === 'string' && e[0] === '$') return e.slice(1) in c.vars ? c.vars[e.slice(1)] : c.params[e.slice(1)];
    if (e && typeof e === 'object') {
      if ('mul' in e) return e.mul.reduce((p, x) => p * value(x, c), 1);
      if ('add' in e) return e.add.reduce((p, x) => p + value(x, c), 0);
      if ('min' in e) return Math.min(...e.min.map(x => value(x, c)));
      if ('max' in e) return Math.max(...e.max.map(x => value(x, c)));
      if ('all' in e) return e.all.every(x => value(x, c)) ? 1 : 0;
      if ('or' in e) { for (const x of e.or) { const v = value(x, c); if (v) return v; } return 0; }                // the first value that is not 0 / missing
      if ('nameIs' in e) return cardOf(e.of, c).name === e.nameIs ? 1 : 0;                                     // provisional: drones are recognized by their name
      if ('evtHas' in e) return c.evt && c.evt[e.evtHas] ? 1 : 0;                                       // a field of the event is set (set by a "claim" action)
      if ('boardSize' in e) return c.allies.length;
      if ('maxBoard' in e) return MAX_BOARD;
      if ('hasPowers' in e) return skillsOf(cardOf(e.hasPowers, c)).length > 0 ? 1 : 0;
      if ('not' in e) return value(e.not, c) ? 0 : 1;
      if ('lt' in e) return value(e.lt[0], c) < value(e.lt[1], c) ? 1 : 0;
      if ('hasType' in e) return cardOf(e.of, c).types.includes(e.hasType) ? 1 : 0;
      if ('gte' in e) return value(e.gte[0], c) >= value(e.gte[1], c) ? 1 : 0;
      if ('stat' in e) return cardOf(e.of, c)[e.stat] || 0;                                  // { stat: 'hp', of: 'carrier' | 'target' | '@a' }
      if ('maxOf' in e) { const l = select(e.over, c); return l.length ? Math.max(...l.map(s => s[e.maxOf])) : 0; }
      if ('minOf' in e) { const l = select(e.over, c); return l.length ? Math.min(...l.map(s => s[e.minOf])) : 0; }
      if ('weightedPick' in e) return pick(e.weightedPick.flatMap((v, i) => Array(e.weights[i]).fill(v)));   // random value, each one as likely as its weight
      if ('roll' in e) { const lo = value(e.roll[0], c), hi = value(e.roll[1], c); return lo + Math.floor(rng() * (hi - lo + 1)); }   // integer between lo and hi
      if ('count' in e) return select(e.count, c).length;
      if ('distinctTypes' in e) return uniqueTypes(select(e.distinctTypes, c), e.only).size;
      if ('sumEquips' in e) return select(e.sumEquips, c).reduce((n, s) => n + s.equips.length, 0);
      if ('level' in e) return c.level || 0;
    }
    throw new Error(`Unknown expression: ${JSON.stringify(e)}`);
  }

  // ---------- Actions ----------
  const names = (list, join) => list.map(s => s.name).join(join || ', ');
  // Says the log line of an action. hl = { att: 'carrier', tgt: 'target' } highlights cards in the combat display.
  const emit = (a, c, extra, key) => {
    if (!(key || a.log)) return;
    const hl = a.hl ? Object.fromEntries(Object.entries(a.hl).map(([k, who]) => [k, typeof who === 'boolean' ? who : cardOf(who, c).uid])) : undefined;
    c.say(I18N.t(key || a.log, { ...c.params, carrier: c.carrier.name, ...c.vars, ...extra }), hl);
  };
  const listVars = (a, targets) => ({ targets: names(targets, a.join), target: targets[0].name, targetAtk: targets[0].atk, targetHp: targets[0].hp });
  const shieldOf = s => { s.shield = Math.max(s.shield || 0, shieldCount({ ...s, kw: [...s.kw, 'shield'] })); s.hadShield = true; };
  const amountOf = (a, c) => (a.amount == null ? 0 : value(a.amount, c));

  const ACTIONS = {
    // Adds ATK / HP (and max HP) to the targets; atk and hp are expressions evaluated for each target. floorAtk: ATK never goes below 0.
    // flag: only the targets without this mark, which is then set on them (an effect that applies once per card).
    // let: variables drawn once, after the targets are known (so that nothing is drawn without a target). record: fields written on the carrier afterwards.
    stats(a, c) {
      let targets = select(a.target, c);
      if (a.flag) targets = targets.filter(s => !s[a.flag]);
      if (!targets.length) return;
      for (const [name, e] of Object.entries(a.let || {})) c.vars[name] = value(e, c);
      let first;
      targets.forEach(s => {
        c.target = s;
        const atk = a.atk == null ? 0 : value(a.atk, c), hp = a.hp == null ? 0 : value(a.hp, c);
        if (!first) first = { atk, hp };
        if (a.flag) s[a.flag] = true;
        if (a.permanent) { s.perm = (s.perm || 0) + atk; if (a.permanent === 'both') s.permHp = (s.permHp || 0) + hp; }   // kept after the combat (endCombatFx)
        s.atk += atk; if (a.floorAtk) s.atk = Math.max(0, s.atk); s.hp += hp; s.maxhp += hp;
      });
      c.target = targets[0];
      for (const [field, e] of Object.entries(a.record || {})) c.carrier[field] = value(e, c);
      emit(a, c, { ...listVars(a, targets), atk: first.atk, hp: first.hp, both: first.atk && first.hp ? 1 : 0 });
    },
    // permanent: 'atk' | 'both': the gain is also recorded on the card (perm / permHp) so that the player's card keeps it after the combat.
    // Sets fields of the targets: { fields: { hp: <expression>, maxhp: <expression> } }.
    // flag: only the targets without this mark, which is then set on them.
    set(a, c) {
      let targets = select(a.target, c);
      if (a.flag) targets = targets.filter(s => !s[a.flag]);
      if (!targets.length) return;
      targets.forEach(s => { c.target = s; if (a.flag) s[a.flag] = true; for (const [field, e] of Object.entries(a.fields)) s[field] = value(e, c); });
      emit(a, c, listVars(a, targets));
    },
    // Swaps ATK and HP of the targets (max HP follows the new HP).
    swapAtkHp(a, c) {
      const targets = select(a.target, c);
      if (!targets.length) return;
      targets.forEach(s => { [s.atk, s.hp] = [s.hp, s.atk]; s.maxhp = s.hp; });
      emit(a, c, listVars(a, targets));
    },
    // Swaps hp and maxhp between two cards: { first: <selector>, second: <selector> }.
    swapHp(a, c) {
      const x = select(a.first, c)[0], y = select(a.second, c)[0];
      if (!x || !y) return;
      [x.hp, y.hp] = [y.hp, x.hp]; [x.maxhp, y.maxhp] = [y.maxhp, x.maxhp];
      emit(a, c, { first: x.name, second: y.name, firstHp: x.hp, secondHp: y.hp });
    },
    // Shares HP and max HP between the carrier and the card selected by "with": the carrier keeps the odd point.
    balance(a, c) {
      const n = select(a.with, c)[0], s = c.carrier;
      if (!n) return;
      const tot = s.hp + n.hp, mx = s.maxhp + n.maxhp;
      n.hp = Math.floor(tot / 2); s.hp = tot - n.hp;
      n.maxhp = Math.floor(mx / 2); s.maxhp = mx - n.maxhp;
      emit(a, c, { target: n.name, carrierHp: s.hp, targetHp: n.hp });
    },
    // Deals damage: amount is evaluated for each target, "source" is 'carrier' or '@a' (default: no source).
    damage(a, c) {
      if (a.once) { if (c.carrier[a.once]) return; c.carrier[a.once] = true; }   // once: a mark on the carrier so that it works once per combat
      select(a.target, c).forEach(s => {
        c.target = s;
        const amount = amountOf(a, c), from = a.source ? cardOf(a.source, c) : null;
        hit(s, amount, from);
        emit(a, c, { target: s.name, amount, source: from ? from.name : '' });
      });
    },
    // Heals the targets up to their max HP. amount is the nominal heal. woundedOnly: skips full-HP cards; skipZero: skips when nothing would be healed.
    // logMany is used instead of log when several cards are healed.
    heal(a, c) {
      const targets = select(a.target, c).filter(s => !(a.woundedOnly && s.hp >= s.maxhp));
      let first = null;
      const done = targets.filter(s => {
        c.target = s;
        const healed = Math.min(amountOf(a, c), s.maxhp - s.hp);
        if (a.skipZero && healed <= 0) return false;
        s.hp += healed;
        if (first == null) first = healed;
        return true;
      });
      if (!done.length) return;
      c.target = done[0];
      emit(a, c, { ...listVars(a, done), amount: amountOf(a, c), healed: first }, done.length > 1 && a.logMany ? a.logMany : a.log);
    },
    // Gives a Shield (as many hits as the card's Shield allows). once: the name of a mark on the carrier so that it works once per combat.
    shield(a, c) {
      if (a.once && c.carrier[a.once]) return;
      const targets = select(a.target, c);
      if (!targets.length) return;
      if (a.once) c.carrier[a.once] = true;
      targets.forEach(shieldOf);
      emit(a, c, listVars(a, targets));
    },
    removeShield(a, c) {
      const targets = select(a.target, c);
      if (!targets.length) return;
      targets.forEach(s => { s.shield = a.set == null ? false : a.set; });
      emit(a, c, listVars(a, targets));
    },
    // Gives or removes a keyword. Removal only concerns the targets that have it.
    keyword(a, c) {
      const targets = select(a.target, c).filter(s => a.remove ? s.kw.includes(a.remove) : true);
      if (!targets.length) return;
      targets.forEach(s => { if (a.give) { if (!s.kw.includes(a.give)) s.kw.push(a.give); } else s.kw = s.kw.filter(x => x !== a.remove); });
      emit(a, c, listVars(a, targets));
    },
    // Marks the targets (a rule of the combat loop reads the mark): { flag: 'noRiposte' }.
    flag(a, c) {
      const targets = select(a.target, c);
      if (!targets.length) return;
      targets.forEach(s => { s[a.flag] = true; });
      emit(a, c, listVars(a, targets));
    },
    // A forced attack: the card selected by "attacker" hits the card selected by "target"; the target retaliates unless the attacker is Ranged.
    attack(a, c) {
      const x = select(a.attacker, c)[0], t = select(a.target, c)[0];
      if (!x || !t) return;
      const back = x.kw.includes('ranged') ? 0 : t.atk;
      hit(t, x.atk, x); hit(x, back, t);
      c.say(I18N.t(back ? a.logBack : a.log, { ...c.params, carrier: c.carrier.name, ...c.vars, attacker: x.name, target: t.name, amount: x.atk, back }), { att: x.uid, tgt: t.uid, ranged: x.kw.includes('ranged') });
    },
    // Plants bombs (the combat loop makes them explode before the bearer's first attack): "times" bombs of "damage" on the cards selected, one by one.
    bomb(a, c) {
      for (let i = 0, n = a.times == null ? 1 : value(a.times, c); i < n; i++) {
        const t = select(a.target, c)[0];
        if (!t) break;
        const damage = value(a.damage, c);
        addBomb(t, damage, !!a.splash);
        emit(a, c, { target: t.name, damage });
      }
    },
    // Plays again the effects of other cards: { from: <selector>, event: 'startCombat', without: [fx, ...] }, each one announced by the log.
    replay(a, c) {
      select(a.from, c).forEach(n => skillsOf(n).filter(x => x.t === a.event && !(a.without || []).includes(x.fx)).forEach(x => {
        emit(a, c, { target: n.name });
        applyFx(x, n, c.allies, c.enemies, c.say, c.bonus);
      }));
    },
    // The Cybermancer's upgrade of the PR model (kept in a queue until the model is on the board, see flushPr).
    prBoost(a, c) { if (c.carrier.side !== 'e') PR_QUEUE.push({ a: value(a.atk, c), h: value(a.hp, c) }); },
    // Border Guard: with the given chance the hit spills over onto a neighbor of the target (doubled) or onto a neighbor of the attacker (normal damage).
    // A special brick: the order of its draws is part of the rule (chance, then the side if both exist, then the neighbor).
    overflow(a, c) {
      const A = c.carrier, T = c.refs.target;
      if (!(rng() < a.chance)) return;
      const near = (pool, s) => pool.filter((x, i) => x !== s && x !== A && x.hp > 0 && Math.abs(i - pool.indexOf(s)) === 1);
      const foes = near(c.enemies, T), mates = c.allies.includes(A) ? near(c.allies, A) : [];
      const foeSide = foes.length && (!mates.length || rng() < 0.5);
      const V = pick(foeSide ? foes : mates);
      if (!V) return;
      const amount = A.atk * (foeSide ? 2 : 1);
      hit(V, amount, A);
      c.say(I18N.t(foeSide ? a.logFoe : a.logMate, { carrier: A.name, target: V.name, amount }), { att: A.uid, tgt: V.uid });
    },
    // The carrier takes one of the equipment of the dead card (drawn at random) for the rest of the combat. A special brick: the draw is made
    // even when the dead card has no equipment (the random sequence is part of the rule).
    takeEquipment(a, c) {
      const dead = c.refs.dead, def = EQUIPS.find(e => e.name === pick(dead.equips.length ? dead.equips : [null]));
      if (!def) return;
      applyEquip(c.carrier, def);
      c.say(I18N.t(a.log, { carrier: c.carrier.name, equipment: def.name, from: dead.name }));
    },
    // Brings the dead card back (reaction to its death): a copy at its place with all its HP, optionally paid by removing another card (consume) and counted on the carrier (counter).
    revive(a, c) {
      const dead = c.refs.dead, allies = c.allies;
      if (a.consume) { const victim = select(a.consume, c)[0]; if (!victim) return; allies.splice(allies.indexOf(victim), 1); }
      if (a.counter) c.carrier[a.counter] = (c.carrier[a.counter] || 0) + 1;
      allies.splice(Math.min(dead.deathIdx, allies.length), 0, { ...dead, equips: [...dead.equips], kw: [...dead.kw], uid: uid(), hp: dead.maxhp, shield: shieldCount(dead), hadShield: shieldCount(dead) > 0, reb: false, bomb: 0, bombs: [], perm: 0, shUsed: 0 });
      c.say(I18N.t(a.log, { carrier: c.carrier.name, dead: dead.name }));
    },
    // Another allied drone (drawn at random) takes over the powers of the destroyed drone until the end of the combat.
    inherit(a, c) {
      const drones = select({ side: 'ally', name: 'Drone' }, c);
      if (!drones.length) return;
      const d = pick(drones);
      d.extra = [...(d.extra || []), ...skillsOf(c.refs.dead)];
      c.say(I18N.t(a.log, { carrier: c.carrier.name }));
    },
    // The carrier claims the event: it is remembered under evt[field] and the following reactions are skipped ("the first one that can").
    claim(a, c) { c.evt[a.field] = c.carrier; c.evt.done = true; },
    // Summons a drone next to the carrier (or at its place when the carrier is dead). The drone's stats start from the power's a/h plus the bonuses of the
    // carrier's equipment and of the mission, then the allies can change them (reaction 'summonStats': Chief Mechanic's aura) and the carrier can give it
    // keywords (reaction 'summonKeywords': Ranged). Finally the allies react to the new drone (reaction 'summoned'). A special brick.
    summon(a, c) {
      const src = c.carrier, allies = c.allies;
      if (allies.length >= MAX_BOARD) { c.say(I18N.t(a.logFull, { carrier: src.name })); return; }
      const evt = { summoner: src, allies, enemies: c.enemies, atk: c.params.a + (src.droneA || 0) + (c.bonus ? c.bonus.a : 0), hp: c.params.h + (src.droneH || 0) + (c.bonus ? c.bonus.h : 0), kw: [] };
      react('summonStats', alive(allies), evt, c.say);
      react('summonKeywords', [src], evt, c.say);
      const drone = { uid: uid(), name: 'Drone', rank: 1, atk: evt.atk, hp: evt.hp, maxhp: evt.hp, types: [], kw: evt.kw, skill: null, equips: [], eqSkills: [], lrSkills: [], shield: false, reb: false };
      const at = allies.indexOf(src);
      allies.splice(at >= 0 ? at + 1 : Math.min(src.deathIdx || 0, allies.length), 0, drone);   // a dead servant is no longer on the board: the drone takes its place
      c.say(I18N.t(at >= 0 ? a.logRight : a.logPlace, { carrier: src.name, atk: drone.atk, hp: drone.hp }));
      react('summoned', alive(allies), { summoned: drone, allies, enemies: c.enemies }, c.say);
    },
    addKeyword(a, c) { c.evt.kw.push(a.keyword); },   // only in reactions: gives the card being created a keyword
    // --- Only in reactions (see react below) ---
    cancel(a, c) { c.evt.cancelled = true; },                                     // the event does not happen
    modify(a, c) { c.evt[a.field] = value(a.value, c); },                         // changes a field of the event (amount, charges…)
    chooseTarget(a, c) { const t = select(a.from, c)[0]; if (t) { c.evt.result = t; c.evt.done = true; } },   // decides the target of an attack; the following reactions are skipped
    // Picks a card and remembers it for the next actions of the template ({ ref: 'a' }); says nothing.
    bind(a, c) { select(a.target, c); }
  };

  // Runs the template of k.fx. Returns true when the power is handled here (the caller then skips its own code).
  function run(k, src, allies, enemies, say, level, bonus) {
    const def = defs[k.fx];
    if (!def || !def.then) return false;
    fired[k.fx] = (fired[k.fx] || 0) + 1;
    const c = { carrier: src, allies, enemies, say, level, bonus, params: k, vars: {}, refs: {}, target: null };
    for (const [name, e] of Object.entries(def.vars || {})) c.vars[name] = value(e, c);
    for (const a of def.then) {
      if (a.if != null && !value(a.if, c)) continue;
      const action = ACTIONS[a.action];
      if (!action) throw new Error(`Unknown action: ${a.action}`);
      action(a, c);
    }
    return true;
  }

  // The engine announces an event ('damage', 'targeting'…) to the cards concerned; the powers whose template has a "reactions" entry for this event
  // can cancel it, change its fields or decide its result. evt is a plain object: its numbers are available to the template as $name ($amount…).
  // Once a reaction sets evt.done the following ones are skipped.
  function react(event, cards, evt, say) {
    evt.done = false;   // an event object can go through several steps (death steps): each step starts afresh, the other fields are kept
    // First the reactions of every card are listed (a card that gains a power during the step does not react to this step), then they are played.
    // For each card: in the order of its powers, then by "order" (lower first): Border Guard's overflow comes before Covering Fire.
    const plan = cards.map(card => {
      const found = [];
      for (const k of skillsOf(card)) {
        const def = defs[k.fx];
        if (def && def.reactions) for (const r of def.reactions) if (r.on === event) found.push({ k, r });
      }
      return { card, found: found.sort((x, y) => (x.r.order || 0) - (y.r.order || 0)) };
    });
    for (const { card, found } of plan) {
      const seen = new Set();   // for the reactions marked "unique": several copies of the same power on a card react only once
      for (const { k, r } of found) {
        if (evt.done) return evt;
        if (r.unique) { if (seen.has(k.fx)) continue; seen.add(k.fx); }
        const c = { carrier: card, allies: evt.allies || [], enemies: evt.enemies || [], say: say || (() => {}), level: 0, bonus: null, params: k, vars: {}, refs: { target: evt.target, attacker: evt.attacker, source: evt.source, dead: evt.dead, summoned: evt.summoned }, target: evt.target, evt };
        for (const [key, v] of Object.entries(evt)) if (typeof v === 'number') c.vars[key] = v;
        if (r.if != null && !value(r.if, c)) continue;
        fired[k.fx] = (fired[k.fx] || 0) + 1;
        for (const a of r.then) { if (a.if != null && !value(a.if, c)) continue; ACTIONS[a.action](a, c); }
      }
    }
    return evt;
  }

  // Loads data/powers.json (browser). Tools install the templates directly.
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : fetch(`${base}powers.json`, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`powers.json: HTTP ${r.status}`); return r.json(); }).then(install);
  ready.catch(e => { I18N.banner(`Les pouvoirs du jeu n'ont pas pu être chargés (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });

  return { install, has, run, react, fired, ready, select, value };
})();
