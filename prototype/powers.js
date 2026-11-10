// Atlas Wanderer — power bricks: the interpreter of the power templates of data/powers.json.
// A card still names its power the old way (sk('startCombat', 'buffAllies', 1, 1)); the template of "buffAllies" in data/powers.json says what it does
// with generic bricks (selector, expression, action). Texts of the combat log come from data/i18n/<lang>.json ("log.*" keys).
// Specification: documentation/mecaniques/pouvoirs-modulaires.md.
const POWERS = (() => {
  let defs = {};
  const base = typeof document !== 'undefined' && document.currentScript ? new URL('../data/', document.currentScript.src).href : '../data/';
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
    && (!sel.hasKeyword || s.kw.includes(sel.hasKeyword)) && (!sel.wounded || s.hp < s.maxhp) && (!sel.noBombs || !(s.bombs && s.bombs.length));
  function select(sel, c) {
    if (sel.side === 'self') return [c.carrier];
    if (sel.ref) return c.refs[sel.ref] ? [c.refs[sel.ref]] : [];
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
      case 'leftNeighbor': { const n = pool[pool.indexOf(c.carrier) - 1]; out = n && n.hp > 0 ? [n] : []; break; }
      default: throw new Error(`Unknown selector pick: ${sel.pick}`);
    }
    if (!out.length && sel.fallback) out = select(sel.fallback, c);
    if (sel.as) c.refs[sel.as] = out[0];
    return out;
  }

  // ---------- Expressions: numbers, "$a" (parameter or variable), and a few operations ----------
  const cardOf = (who, c) => (who === 'carrier' ? c.carrier : who === 'target' ? c.target : c.refs[who.slice(1)]);
  function value(e, c) {
    if (typeof e === 'number') return e;
    if (typeof e === 'string' && e[0] === '$') return e.slice(1) in c.vars ? c.vars[e.slice(1)] : c.params[e.slice(1)];
    if (e && typeof e === 'object') {
      if ('mul' in e) return e.mul.reduce((p, x) => p * value(x, c), 1);
      if ('add' in e) return e.add.reduce((p, x) => p + value(x, c), 0);
      if ('min' in e) return Math.min(...e.min.map(x => value(x, c)));
      if ('max' in e) return Math.max(...e.max.map(x => value(x, c)));
      if ('all' in e) return e.all.every(x => value(x, c)) ? 1 : 0;
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
    const hl = a.hl ? Object.fromEntries(Object.entries(a.hl).map(([k, who]) => [k, cardOf(who, c).uid])) : undefined;
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
        s.atk += atk; if (a.floorAtk) s.atk = Math.max(0, s.atk); s.hp += hp; s.maxhp += hp;
      });
      c.target = targets[0];
      for (const [field, e] of Object.entries(a.record || {})) c.carrier[field] = value(e, c);
      emit(a, c, { ...listVars(a, targets), atk: first.atk, hp: first.hp, both: first.atk && first.hp ? 1 : 0 });
    },
    // Sets fields of the targets: { fields: { hp: <expression>, maxhp: <expression> } }.
    set(a, c) {
      const targets = select(a.target, c);
      if (!targets.length) return;
      targets.forEach(s => { c.target = s; for (const [field, e] of Object.entries(a.fields)) s[field] = value(e, c); });
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
      targets.forEach(s => { s.shield = false; });
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
    // Picks a card and remembers it for the next actions of the template ({ ref: 'a' }); says nothing.
    bind(a, c) { select(a.target, c); }
  };

  // Runs the template of k.fx. Returns true when the power is handled here (the caller then skips its own code).
  function run(k, src, allies, enemies, say, level, bonus) {
    const def = defs[k.fx];
    if (!def) return false;
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

  // Loads data/powers.json (browser). Tools install the templates directly.
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : fetch(`${base}powers.json`, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`powers.json: HTTP ${r.status}`); return r.json(); }).then(install);
  ready.catch(e => { I18N.banner(`Les pouvoirs du jeu n'ont pas pu être chargés (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });

  return { install, has, run, ready, select, value };
})();
