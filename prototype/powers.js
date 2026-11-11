// Atlas Wanderer — power bricks: the interpreter of the power templates of data/powers.json.
// A card still names its power the old way (sk('startCombat', 'buffAllies', 1, 1)); the template of "buffAllies" in data/powers.json says what it does
// with generic bricks (selector, expression, action). Texts of the combat log come from data/i18n/<lang>.json ("log.*" keys).
// Specification: documentation/mecaniques/pouvoirs-modulaires.md.
const POWERS = (() => {
  let defs = {};
  const fired = {};                                  // how many times each power was played (the tests use it to know what they exercised)
  const install = d => { defs = d; };
  // How the start-of-combat dispatcher treats a power (template field "start"): late = played after the others (replays), jams = number of enemy effects it
  // prevents, jammable = a prevented effect can be this one, recorded = the first recorded effect of a side is what "replayFirst" replays.
  const startInfo = fx => ({ late: false, jams: 0, jammable: true, recorded: true, priority: null, ...((defs[fx] || {}).start || {}) });
  // Priority of a power for the order of resolution (spec 12.3): first = -100, normal = 0, late = +100, or a number.
  const PRIORITY_WORDS = { first: -100, normal: 0, late: 100 };
  const priorityValue = p => (typeof p === 'number' ? p : PRIORITY_WORDS[p]);
  const has = fx => Object.prototype.hasOwnProperty.call(defs, fx);

  const alive = l => l.filter(s => s.hp > 0);
  const uniqueTypes = (list, only) => new Set(list.flatMap(s => (only ? s.types.filter(t => typesOfGroup(only).includes(t)) : s.types)));

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
    if (typeof e === 'string') return e;   // a literal word (an event field such as a side or a direction: modify, eq)
    if (e && typeof e === 'object') {
      if ('mul' in e) return e.mul.reduce((p, x) => p * value(x, c), 1);
      if ('add' in e) return e.add.reduce((p, x) => p + value(x, c), 0);
      if ('min' in e) return Math.min(...e.min.map(x => value(x, c)));
      if ('max' in e) return Math.max(...e.max.map(x => value(x, c)));
      if ('all' in e) return e.all.every(x => value(x, c)) ? 1 : 0;
      if ('or' in e) { for (const x of e.or) { const v = value(x, c); if (v) return v; } return 0; }                // the first value that is not 0 / missing
      if ('nameIs' in e) return cardOf(e.of, c).name === e.nameIs ? 1 : 0;                                     // provisional: drones are recognized by their name
      if ('room' in e) return (c.extra && c.extra.room) || 0;                                          // number of the room (Boss powers)
      if ('floorDiv' in e) return Math.floor(value(e.floorDiv[0], c) / value(e.floorDiv[1], c));
      if ('evtHas' in e) return c.evt && c.evt[e.evtHas] ? 1 : 0;                                       // a field of the event is set (set by a "claim" action)
      if ('eq' in e) return value(e.eq[0], c) === value(e.eq[1], c) ? 1 : 0;                                // equality of two values (numbers or words)
      if ('evt' in e) return c.evt ? c.evt[e.evt] : undefined;                                            // a field of the event, number or word (reason, side…)
      if ('ownSide' in e) return c.ownSide;                                                                // 'player' or 'boss': the camp of the carrier (events about the order only)
      if ('boardSize' in e) return c.allies.length;
      if ('maxBoard' in e) return MAX_BOARD;
      if ('hasPowers' in e) return skillsOf(cardOf(e.hasPowers, c)).length > 0 ? 1 : 0;
      if ('not' in e) return value(e.not, c) ? 0 : 1;
      if ('lt' in e) return value(e.lt[0], c) < value(e.lt[1], c) ? 1 : 0;
      if ('hasType' in e) return cardOf(e.of, c).types.includes(e.hasType) ? 1 : 0;
      if ('gte' in e) return value(e.gte[0], c) >= value(e.gte[1], c) ? 1 : 0;
      if ('stat' in e) {
        const card = cardOf(e.of, c), v = card[e.stat] || 0;
        // An aura reads the statistics WITHOUT the auras (the bonus it applied is taken off), so that an aura never depends on another aura.
        return c.auraBase && card.aura ? v - (e.stat === 'atk' ? card.aura.atk : e.stat === 'hp' || e.stat === 'maxhp' ? card.aura.hp : 0) : v;
      }                                  // { stat: 'hp', of: 'carrier' | 'target' | '@a' }
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
      const back = react('retaliation', [x], { attacker: x, target: t, amount: t.atk }).amount;   // Ranged attackers are not retaliated against
      hit(t, x.atk, x); hit(x, back, t);
      c.say(I18N.t(back ? a.logBack : a.log, { ...c.params, carrier: c.carrier.name, ...c.vars, attacker: x.name, target: t.name, amount: x.atk, back }), { att: x.uid, tgt: t.uid, ranged: x.kw.includes('ranged') });
    },
    // The bombs of the carrier explode, one after the other (Shield applies); a "splash" bomb also hits the living neighbors. The cards hit are listed in the event (touched).
    explodeBombs(a, c) {
      const bearer = c.carrier, list = bearer.bombs;
      bearer.bombs = []; bearer.bomb = 0;
      for (const b of list) {
        hit(bearer, b.n, null);
        if (b.splash) {
          const i = c.allies.indexOf(bearer);
          [c.allies[i - 1], c.allies[i + 1]].filter(n => n && n.hp > 0).forEach(n => { hit(n, b.n, null); c.evt.touched.push(n.uid); });
        }
        c.say(I18N.t(b.splash ? a.logSplash : a.log, { carrier: bearer.name, damage: b.n }), { tgt: bearer.uid });
      }
      c.evt.exploded = true;
    },
    // End of combat (the evt carries the game g and the combat result res; the carrier is the board card that survived).
    // Survivors of the player's side permanently gain +a/+h.
    groupStats(a, c) {
      const ids = new Set(c.evt.res.survivors.p.map(x => x.uid)), group = c.evt.g.board.filter(s => ids.has(s.uid));
      group.forEach(s => { s.atk += c.params.a; s.hp += c.params.h; s.maxhp += c.params.h; });
      if (group.length) emit(a, c, { names: group.map(s => s.name).join(', '), count: group.length });
    },
    // The next equipment offers of the reinforcement will show "size" cards, for "times" reinforcements.
    equipOffer(a, c) {
      const g = c.evt.g;
      g.equipOfferSize = Math.max(g.equipOfferSize || 0, c.params.n); g.equipOfferLeft = Math.max(g.equipOfferLeft || 0, c.params.times || 1);
      emit(a, c, { left: g.equipOfferLeft, size: g.equipOfferSize });
    },
    // The carrier equips itself with an equipment of rank n whose type is not in the team (never offered during the game).
    equipUnavailable(a, c) {
      const pool = EQUIPS.filter(e => e.rank === c.params.n && e.type && !c.evt.g.types.includes(e.type));
      if (!pool.length) return;
      const eq = pick(pool);
      if (!applyEquip(c.carrier, eq)) {   // no free socket of the right color: the equipment goes to the hand (lost if it is full)
        const g = c.evt.g;
        if (handFull(g)) c.say(I18N.t('log.equipLostHandFull', { item: eq.name })); else { g.hand.push({ kind: 'equip', def: eq }); g.stats.equips++; c.say(I18N.t('log.itemJoinsYourHand', { name: eq.name })); }
        return;
      }
      emit(a, c, { equipment: eq.name });
    },
    // Drones summoned from now on to the end of the mission get +a/+h more.
    droneBonus(a, c) {
      const bonus = c.evt.g.droneBonus; bonus.a += c.params.a; bonus.h += c.params.h;
      emit(a, c, { bonusA: bonus.a, bonusH: bonus.h });
    },
    // Game level (evt.g = the game): puts an equipment into the hand. The equipment is a fixed card ("card": id) or drawn among a pool, "pool": { rank: '$n' | [min, max],
    // token: false, type: '<type>' | absent: true (a type not in the team) }; "random": true draws like the reinforcement offers. times: count (e.g. "$n").
    // needsHand: nothing happens outside a game with a hand; roomEvery: "$n" — only every n-th room; skipEmpty: no draw when the pool is empty; forge: the interface plays the forge animation.
    giveEquip(a, c) {
      const g = c.evt.g;
      if (a.needsHand && !g.hand) return;
      if (a.roomEvery != null && g.room % value(a.roomEvery, c) !== 0) return;
      for (let i = 0, n = a.times == null ? 1 : value(a.times, c); i < n; i++) {
        let def;
        if (a.card) { def = EQUIPS.find(e => e.id === a.card); if (!def) return; }
        else if (a.random) def = randomEquip(g);
        else {
          const p = a.pool, rank = Array.isArray(p.rank) || p.rank == null ? p.rank : value(p.rank, c);
          const pool = EQUIPS.filter(e => (p.token === false ? !e.token : true) && (rank == null ? true : Array.isArray(rank) ? e.rank >= rank[0] && e.rank <= rank[1] : e.rank === rank)
            && (p.absent ? e.type && !g.types.includes(e.type) : p.type ? e.type === p.type : true));
          if (a.skipEmpty && !pool.length) return;
          def = pick(pool);
        }
        if (!def) break;
        if (handFull(g)) c.say(I18N.t(a.logFull, { name: c.carrier.name, item: def.name }));
        else {
          g.hand.push({ kind: 'equip', def }); g.stats.equips++;
          c.say(I18N.t(a.log, { name: c.carrier.name, item: def.name }));
          if (a.forge) (g.forgeFx = g.forgeFx || []).push({ uid: c.carrier.uid, def });
        }
      }
    },
    // Game level: a servant drawn at random among those of the type "type" (all ranks) joins the hand, only in the room "roomIs" (TE-5T).
    giveServant(a, c) {
      const g = c.evt.g;
      if (!g.hand || g.room !== value(a.roomIs, c)) return;
      const card = pick(SERVANTS.filter(s => s.types.includes(a.type)));
      if (handFull(g)) c.say(I18N.t(a.logFull, { name: card.name }));
      else { g.hand.push({ kind: 'servant', s: mkServant(card) }); g.stats.servants++; c.say(I18N.t(a.log, { name: c.carrier.name, item: card.name, rank: card.rank })); }
    },
    // Game level (Brokk'Ric): every n rooms, an Engineer's Patch (equipment without stat bonus) carrying a power drawn at random among those of the servants
    // whose rank does not exceed the reinforcement level. One draw per power (a servant with several powers counts several times).
    forgePatch(a, c) {
      const g = c.evt.g;
      if (g.room % value(a.roomEvery, c) !== 0 || !g.hand) return;
      const pool = SERVANTS.filter(s => s.rank <= g.level).flatMap(s => [].concat(s.skill || []).map((k, i) => ({ c: s, k, i }))).filter(x => x.k.fx !== 'prBoost');
      if (!pool.length) return;
      const { c: card, k, i } = pick(pool);
      const def = { id: `patch-${card.id}-${i}`, name: `Patch ${card.name}`, rank: g.level, atk: 0, hp: 0, kw: null, type: 'engineer', skill: { ...k }, mod: null, token: true, patch: true };
      if (handFull(g)) c.say(I18N.t(a.logFull, { name: def.name }));
      else { g.hand.push({ kind: 'equip', def }); g.stats.equips++; c.say(I18N.t(a.log, { name: c.carrier.name, item: def.name })); }
    },
    // Game level (Datacube): draws a face of the cube (the interface plays the animation from g.cubeRoll / g.cubeBefore) and changes the Datacrons.
    datacube(a, c) {
      const g = c.evt.g, r = drawCube(g);
      g.cubeRoll = r; g.cubeBefore = g.datacrons;
      g.datacrons = Math.max(0, g.datacrons + r); if (r > 0) g.stats.earned += r;
      c.say(I18N.t(a.log, { name: c.carrier.name, amount: `${r > 0 ? '+' : ''}${r}`, count: Math.abs(r) }));
    },
    // Game level (Swarm Operator): permanent bonus of the player's drones, also applied to the drones already on the board.
    droneBoostGame(a, c) {
      const g = c.evt.g;
      if (!g.droneBonus) return;
      g.droneBonus.a += c.params.a; g.droneBonus.h += c.params.h;
      g.board.filter(x => x.name === 'Drone').forEach(x => { x.atk += c.params.a; x.hp += c.params.h; x.maxhp += c.params.h; });
      c.say(I18N.t(a.log, { name: c.carrier.name, a: c.params.a, h: c.params.h, totalA: g.droneBonus.a, totalH: g.droneBonus.h }));
    },
    // Game level (Assault Soldier): +a permanent ATK to a chosen ally (choice opened by the interface through g.discoverQueue); the Boss designates one at random.
    buffChosenAlly(a, c) {
      const g = c.evt.g, s = c.carrier, targets = g.board.filter(x => x !== s && x.hp > 0);
      if (!targets.length) c.say(I18N.t(a.logNone, { name: s.name }));
      else if (g.bossTeams) (g.discoverQueue = g.discoverQueue || []).push({ kind: 'ally', a: c.params.a, from: s.name, cards: targets });
      else { const t = pick(targets); t.atk += c.params.a; c.say(I18N.t(a.log, { name: s.name, amount: c.params.a, target: t.name })); }
    },
    // Game level (Liaison Attaché): a choice among PROPOSALS equipment of rank n whose type is absent from the team (queue read by the interface; the Boss discovers nothing).
    discoverEquip(a, c) {
      const g = c.evt.g, rank = value(a.rank, c);
      if (!g.bossTeams) return;
      const pool = EQUIPS.filter(e => !e.token && e.rank === rank && e.type && !g.types.includes(e.type)), cards = [];
      while (cards.length < PROPOSALS && pool.length) cards.push(pool.splice(rand(pool.length), 1)[0]);
      if (cards.length) (g.discoverQueue = g.discoverQueue || []).push({ kind: 'equip', rank, cards });
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
      applyEquip(c.carrier, def, true);   // for this combat only: no socket needed
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
    // DE-D0: heals to the maximum the last allied servant that survived an attack (the engine remembers it in evt.last), or says there is nobody to heal.
    healLast(a, c) {
      const t = c.evt.last, me = c.carrier;
      if (t && t.hp > 0 && t.hp < t.maxhp && c.allies.includes(t)) {
        const amount = t.maxhp - t.hp;
        t.hp = t.maxhp;
        c.say(I18N.t(a.logHeal, { carrier: me.name, target: t.name, amount }), { att: me.uid, tgt: t.uid });
      } else c.say(I18N.t(a.logNone, { carrier: me.name }));
    },
    // Impulse Duplicator: plays again the first start-of-combat effect played by the side (extra.first() gives { k, s }; an effect that was prevented was not played).
    replayFirst(a, c) {
      const first = c.extra.first && c.extra.first();
      if (!first) return;
      c.say(I18N.t(a.log, { carrier: c.carrier.name, target: first.s.name }));
      applyFx(first.k, first.s, c.allies, c.enemies, c.say, c.bonus);
    },
    // Says a text, whatever happens (the Regeneration of the Boss is announced even when nobody was hurt).
    say(a, c) { c.say(I18N.t(a.log, { carrier: c.carrier.name })); },
    // Keywords' helpers (only in reactions): the carrier is added to a list of the event / the event asks to play another turn.
    collect(a, c) { (c.evt[a.field] = c.evt[a.field] || []).push(c.carrier); },
    again(a, c) { c.evt.again = true; },
    // Rebirth: the dead card comes back with 1 HP at the far right of the board, if there is room.
    reborn(a, c) {
      const s = c.carrier, allies = c.allies;
      if (allies.length < MAX_BOARD) { allies.push({ ...s, uid: uid(), hp: 1, reb: false, shield: false, hadShield: false, bomb: 0 }); c.say(I18N.t(a.logOk, { carrier: s.name })); }
      else c.say(I18N.t(a.logFull, { carrier: s.name }));
    },
    // --- Only in reactions (see react below) ---
    cancel(a, c) { c.evt.cancelled = true; },                                     // the event does not happen
    modify(a, c) { c.evt[a.field] = value(a.value, c); },                         // changes a field of the event (amount, charges…)
    // Order of resolution (events resolutionOrder): puts a band at the front or at the back of evt.bands. band: ally, opponent, boss, heroes,
    // or own / foe (the camp of the carrier / the other camp, whichever side the carrier is on).
    moveBand(a, c) {
      const band = a.band === 'own' ? (c.ownSide === 'player' ? 'ally' : 'opponent') : a.band === 'foe' ? (c.ownSide === 'player' ? 'opponent' : 'ally') : a.band;
      const bands = (c.evt.bands || []).filter(b => b !== band);
      c.evt.bands = a.to === 'last' ? [...bands, band] : [band, ...bands];
    },
    // Who attacks first (event firstSide): side = player, boss, own (the camp of the carrier) or foe.
    setFirstSide(a, c) { c.evt.side = a.side === 'own' ? c.ownSide : a.side === 'foe' ? (c.ownSide === 'player' ? 'boss' : 'player') : a.side; },
    chooseTarget(a, c) { const t = select(a.from, c)[0]; if (t) { c.evt.result = t; c.evt.done = true; } },   // decides the target of an attack; the following reactions are skipped
    // Picks a card and remembers it for the next actions of the template ({ ref: 'a' }); says nothing.
    bind(a, c) { select(a.target, c); }
  };

  // Runs the template of k.fx. Returns true when the power is handled here (the caller then skips its own code).
  function run(k, src, allies, enemies, say, level, bonus, extra) {
    const def = defs[k.fx];
    if (!def || !def.then) return false;
    fired[k.fx] = (fired[k.fx] || 0) + 1;
    const c = { carrier: src, allies, enemies, say, level, bonus, extra: extra || {}, params: k, vars: {}, refs: {}, target: null };
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
      // The powers of the card, then its keywords: a keyword is a power whose template is named "kw:<id>" (the heroes' kw is a plain string or null, not a list).
      // Then its states: a card marked by a power (bomb planted, jammed, pacified) reacts through the template "state:<name>".
      const states = ['noAtk', 'noRiposte', 'bombs'].filter(name => (name === 'bombs' ? card.bombs && card.bombs.length : card[name])).map(name => ({ t: 'state', fx: `state:${name}`, a: 0, h: 0, n: 0 }));
      const powers = [...skillsOf(card), ...(Array.isArray(card.kw) ? card.kw : []).map(id => ({ t: 'keyword', fx: `kw:${id}`, a: 0, h: 0, n: 0 })), ...states];
      // A game event (reinforcement, battlecry…) names the power being played (evt.only): a reaction with "t" reacts only to a power of that trigger.
      for (const k of powers) {
        if (evt.only && k !== evt.only) continue;
        const def = defs[k.fx];
        if (def && def.reactions) for (const r of def.reactions) if (r.on === event && (r.t == null || (k.t === r.t && evt.trigger === r.t))) found.push({ k, r });
      }
      return { card, found: found.sort((x, y) => (x.r.order || 0) - (y.r.order || 0)) };
    });
    for (const { card, found } of plan) {
      const seen = new Set();   // for the reactions marked "unique": several copies of the same power on a card react only once
      for (const { k, r } of found) {
        if (evt.done) return evt;
        if (r.unique) { if (seen.has(k.fx)) continue; seen.add(k.fx); }
        const c = { carrier: card, allies: evt.allies || [], enemies: evt.enemies || [], say: say || (() => {}), level: 0, bonus: null, extra: evt.extra || {}, params: k, vars: {}, ownSide: evt.ownSide, refs: { target: evt.target, attacker: evt.attacker, source: evt.source, dead: evt.dead, summoned: evt.summoned }, target: evt.target, evt };
        for (const [key, v] of Object.entries(evt)) if (typeof v === 'number') c.vars[key] = v;
        if (r.if != null && !value(r.if, c)) continue;
        fired[k.fx] = (fired[k.fx] || 0) + 1;
        for (const a of r.then) { if (a.if != null && !value(a.if, c)) continue; ACTIONS[a.action](a, c); }
      }
    }
    return evt;
  }

  // ---------- Auras ----------
  // A power whose template has an "aura" does not trigger: while its carrier is alive on the board, its effects exist (bonus ATK/HP, keywords given to the cards selected).
  // refreshAuras recomputes every aura of both boards and applies only the DIFFERENCE with what each card already received (card.aura = { atk, hp, kw }),
  // so the other code keeps reading card.atk / card.hp. A bonus of HP raises max HP and HP together; when it is lost, HP fall by as much and the card dies if they reach 0
  // (the engine then kills it in the usual way: deaths() recomputes the auras at each step, which gives the left-to-right cascade).
  // sides = [{ cards, foes }, ...]: each board and the board facing it. Returns true when something changed. Uses no random number.
  function refreshAuras(sides) {
    const want = new Map();
    for (const { cards, foes } of sides) for (const carrier of cards) {
      if (carrier.hp <= 0) continue;
      for (const k of skillsOf(carrier)) {
        const def = defs[k.fx];
        if (!def || !def.aura) continue;
        const a = def.aura, c = { carrier, allies: cards, enemies: foes, say: () => {}, level: 0, bonus: null, extra: {}, params: k, vars: {}, refs: {}, target: null, auraBase: true };
        for (const [name, e] of Object.entries(def.vars || {})) c.vars[name] = value(e, c);
        if (a.if != null && !value(a.if, c)) continue;
        for (const t of select(a.target, c)) {
          let w = want.get(t);
          if (!w) want.set(t, w = { atk: 0, hp: 0, kw: [] });
          for (const e of a.effects) {
            if (e.action === 'stats') { w.atk += e.atk == null ? 0 : value(e.atk, c); w.hp += e.hp == null ? 0 : value(e.hp, c); }
            else if (e.action === 'keyword' && e.give && !w.kw.includes(e.give)) w.kw.push(e.give);
          }
        }
      }
    }
    let changed = false;
    for (const { cards } of sides) for (const s of cards) {
      const had = s.aura || { atk: 0, hp: 0, kw: [] }, w = want.get(s) || { atk: 0, hp: 0, kw: [] };
      const native = s.kw.filter(k => !had.kw.includes(k)), given = w.kw.filter(k => !native.includes(k));   // a keyword the card has by itself is not "given" (and is not taken away later)
      if (w.atk === had.atk && w.hp === had.hp && given.join() === had.kw.join()) continue;
      s.atk += w.atk - had.atk; s.hp += w.hp - had.hp; s.maxhp += w.hp - had.hp;
      s.kw = [...native, ...given];
      s.aura = { atk: w.atk, hp: w.hp, kw: given };
      changed = true;
    }
    return changed;
  }

  // ---------- Validation (used by the editor and by the tests of tools/) ----------
  // What a template may contain. Returns a list of problems (empty = the template is well formed). Texts (log keys) are checked when I18N has the tables.
  const SELECTOR_KEYS = ['side', 'ref', 'alive', 'type', 'equipped', 'hasShield', 'hasKeyword', 'wounded', 'name', 'noBombs', 'exclude', 'pick', 'as', 'fallback', 'firstOf'];
  const EXPR_OPS = ['mul', 'add', 'min', 'max', 'gte', 'lt', 'all', 'not', 'or', 'stat', 'maxOf', 'minOf', 'roll', 'weightedPick', 'count', 'distinctTypes', 'sumEquips', 'level', 'room', 'floorDiv',
    'hasType', 'nameIs', 'evtHas', 'boardSize', 'maxBoard', 'hasPowers', 'eq', 'evt', 'ownSide'];
  const COMMON = ['action', 'if', 'log', 'hl'];
  const ACTION_FIELDS = {
    stats: ['target', 'atk', 'hp', 'flag', 'let', 'record', 'floorAtk', 'permanent', 'join'], set: ['target', 'fields', 'flag', 'join'], swapAtkHp: ['target', 'join'], swapHp: ['first', 'second'], balance: ['with'],
    attack: ['attacker', 'target', 'logBack'], bomb: ['times', 'target', 'damage', 'splash'], replay: ['from', 'event', 'without'], prBoost: ['atk', 'hp'], bind: ['target'], damage: ['target', 'amount', 'source', 'once'],
    heal: ['target', 'amount', 'woundedOnly', 'skipZero', 'logMany', 'join'], shield: ['target', 'once', 'join'], removeShield: ['target', 'set', 'join'], keyword: ['target', 'give', 'remove', 'join'], flag: ['target', 'flag', 'join'],
    overflow: ['chance', 'logFoe', 'logMate'], replayFirst: [], say: [], takeEquipment: [], revive: ['consume', 'counter'], inherit: [], claim: ['field'], summon: ['logFull', 'logRight', 'logPlace'], addKeyword: ['keyword'],
    explodeBombs: ['logSplash'], datacube: [], droneBoostGame: [], buffChosenAlly: ['logNone'], discoverEquip: ['rank'], giveServant: ['roomIs', 'type', 'logFull'], forgePatch: ['roomEvery', 'logFull'], giveEquip: ['needsHand', 'roomEvery', 'times', 'card', 'random', 'pool', 'skipEmpty', 'forge', 'logFull'], groupStats: [], equipOffer: [], equipUnavailable: [], droneBonus: [], collect: ['field'], again: [], reborn: ['logOk', 'logFull'], healLast: ['logHeal', 'logNone'], cancel: [], modify: ['field', 'value'], moveBand: ['band', 'to'], setFirstSide: ['side'], chooseTarget: ['from'] };
  function validate(def) {
    const problems = [], isObj = o => o && typeof o === 'object' && !Array.isArray(o);
    if (!isObj(def)) return ['a template must be an object'];
    for (const key of Object.keys(def)) if (!['then', 'vars', 'reactions', 'start', 'aura'].includes(key)) problems.push(`unknown field "${key}"`);
    if (!def.then && !def.reactions && !def.aura) problems.push('a template needs "then" (an effect), "reactions" or "aura"');
    const selector = (s, where) => {
      if (!isObj(s)) { problems.push(`${where}: a selector must be an object`); return; }
      for (const key of Object.keys(s)) if (!SELECTOR_KEYS.includes(key)) problems.push(`${where}: unknown selector field "${key}"`);
      if (s.pick && !/^(all|random|leftmost|rightmost|ends|neighbors|leftNeighbor|rightNeighbor|(min|max):\w+)$/.test(s.pick)) problems.push(`${where}: unknown pick "${s.pick}"`);
      if (s.side != null && !['ally', 'enemy', 'self'].includes(s.side)) problems.push(`${where}: unknown side "${s.side}"`);
      if (s.fallback) selector(s.fallback, `${where}.fallback`);
      (s.firstOf || []).forEach((x, i) => selector(x, `${where}.firstOf[${i}]`));
    };
    const expr = (e, where, word = false) => {
      if (typeof e === 'number') return;
      if (typeof e === 'string') { if (e[0] !== '$' && !word) problems.push(`${where}: "${e}" is not a number or a $variable`); return; }   // a literal word is allowed in modify and eq
      if (!isObj(e)) { problems.push(`${where}: not an expression`); return; }
      const op = Object.keys(e).find(k => EXPR_OPS.includes(k));
      if (!op) { problems.push(`${where}: unknown expression ${JSON.stringify(e)}`); return; }
      if (op === 'evt') { if (typeof e.evt !== 'string') problems.push(`${where}: evt needs a field name`); }
      else if (op === 'ownSide') { /* no argument */ }
      else if (op === 'eq') e.eq.forEach((x, i) => expr(x, `${where}.eq[${i}]`, true));
      else if (['count', 'distinctTypes', 'sumEquips'].includes(op)) selector(e[op], `${where}.${op}`);
      else if (op === 'maxOf' || op === 'minOf') selector(e.over, `${where}.over`);
      else if (Array.isArray(e[op])) e[op].forEach((x, i) => expr(x, `${where}.${op}[${i}]`));
    };
    const actions = (list, where) => {
      if (!Array.isArray(list)) { problems.push(`${where}: "then" must be a list`); return; }
      list.forEach((a, i) => {
        const w = `${where}[${i}]`;
        if (!isObj(a) || !ACTION_FIELDS[a.action]) { problems.push(`${w}: unknown action "${isObj(a) ? a.action : a}"`); return; }
        for (const key of Object.keys(a)) if (!COMMON.includes(key) && !ACTION_FIELDS[a.action].includes(key)) problems.push(`${w}: "${a.action}" has no field "${key}"`);
        for (const key of ['target', 'attacker', 'first', 'second', 'with', 'from', 'consume']) if (a[key] !== undefined && isObj(a[key])) selector(a[key], `${w}.${key}`);
        for (const key of ['atk', 'hp', 'amount', 'times', 'damage', 'value', 'if']) if (a[key] !== undefined) expr(a[key], `${w}.${key}`, a.action === 'modify' && key === 'value');
        if (a.action === 'moveBand') {
          if (!['ally', 'opponent', 'boss', 'heroes', 'own', 'foe'].includes(a.band)) problems.push(`${w}: unknown band "${a.band}"`);
          if (a.to != null && !['first', 'last'].includes(a.to)) problems.push(`${w}: "to" is first or last`);
        }
        if (a.action === 'setFirstSide' && !['player', 'boss', 'own', 'foe'].includes(a.side)) problems.push(`${w}: unknown side "${a.side}"`);
        if (a.fields) Object.entries(a.fields).forEach(([f, e]) => expr(e, `${w}.fields.${f}`));
        if (a.let) Object.entries(a.let).forEach(([f, e]) => expr(e, `${w}.let.${f}`));
        for (const key of ['log', 'logBack', 'logMany', 'logFoe', 'logMate', 'logOk', 'logFull', 'logRight', 'logPlace', 'logHeal', 'logNone'])
          if (typeof a[key] === 'string' && typeof I18N !== 'undefined' && I18N.text('fr', a[key]) === undefined) problems.push(`${w}: text "${a[key]}" is missing from fr.json`);
      });
    };
    if (def.vars) Object.entries(def.vars).forEach(([n, e]) => expr(e, `vars.${n}`));
    if (def.then) actions(def.then, 'then');
    (def.reactions || []).forEach((r, i) => {
      if (!r.on || typeof r.on !== 'string') problems.push(`reactions[${i}]: "on" (the event) is missing`);
      for (const key of Object.keys(r)) if (!['on', 't', 'if', 'then', 'unique', 'order'].includes(key)) problems.push(`reactions[${i}]: unknown field "${key}"`);
      if (r.if !== undefined) expr(r.if, `reactions[${i}].if`);
      actions(r.then, `reactions[${i}].then`);
    });
    if (def.aura !== undefined) {
      const a = def.aura, DETERMINISTIC = /^(all|leftmost|rightmost|ends|neighbors|leftNeighbor|rightNeighbor)$/;
      if (!isObj(a)) problems.push('aura: must be an object { if, target, effects }');
      else {
        for (const key of Object.keys(a)) if (!['if', 'target', 'effects'].includes(key)) problems.push(`aura: unknown field "${key}"`);
        if (!isObj(a.target)) problems.push('aura.target: a selector is needed');
        else {
          selector(a.target, 'aura.target');
          if (a.target.pick && !DETERMINISTIC.test(a.target.pick)) problems.push(`aura.target: pick "${a.target.pick}" is random or depends on ties; an aura needs a fixed choice (${DETERMINISTIC.source.slice(2, -2).replace(/\|/g, ', ')})`);
          if (a.target.as) problems.push('aura.target: "as" is not allowed in an aura');
        }
        if (a.if !== undefined) expr(a.if, 'aura.if');
        if (!Array.isArray(a.effects) || !a.effects.length) problems.push('aura.effects: a non-empty list is needed');
        else a.effects.forEach((e, i) => {
          const w = `aura.effects[${i}]`;
          if (!isObj(e)) { problems.push(`${w}: must be an object`); return; }
          if (e.action === 'stats') {
            for (const key of Object.keys(e)) if (!['action', 'atk', 'hp'].includes(key)) problems.push(`${w}: "stats" has no field "${key}"`);
            ['atk', 'hp'].forEach(key => { if (e[key] !== undefined) expr(e[key], `${w}.${key}`); });
          } else if (e.action === 'keyword') {
            for (const key of Object.keys(e)) if (!['action', 'give'].includes(key)) problems.push(`${w}: "keyword" has no field "${key}"`);
            if (!['prov', 'poison', 'ranged', 'fury'].includes(e.give)) problems.push(`${w}: an aura can give prov, poison, ranged or fury (not "${e.give}")`);
          } else problems.push(`${w}: an aura only allows "stats" and "keyword" (additive effects), not "${e.action}"`);
        });
      }
    }
    if (def.start) for (const key of Object.keys(def.start)) if (!['late', 'jams', 'jammable', 'recorded', 'priority'].includes(key)) problems.push(`start: unknown field "${key}"`);
    if (def.start && def.start.priority != null && priorityValue(def.start.priority) === undefined) problems.push('start.priority: first, normal, late or a number');
    return problems;
  }

  // Loads the power templates of the mod (browser). Tools install the templates directly.
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : MOD.ready.then(() => fetch(MOD.file('powers'), { cache: 'no-cache' }))
    .then(r => { if (!r.ok) throw new Error(`powers: HTTP ${r.status}`); return r.json(); }).then(install);
  ready.catch(e => { I18N.banner(`Les pouvoirs du jeu n'ont pas pu être chargés (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });

  return { install, all: () => defs, has, startInfo, priorityValue, validate, refreshAuras, run, react, fired, ready, select, value };
})();
