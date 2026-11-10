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
  // { side: 'ally'|'enemy'|'self', exclude: 'carrier', type, equipped, pick: 'all'|'random'|'leftmost'|'rightmost'|'ends'|'neighbors', fallback: <selector> }
  // The candidates are the living cards of the side; 'neighbors' reads the direct neighbors of the carrier on the board.
  function select(sel, c) {
    if (sel.side === 'self') return [c.carrier];
    const pool = sel.side === 'enemy' ? c.enemies : c.allies;
    let list = alive(pool);
    if (sel.exclude === 'carrier') list = list.filter(s => s !== c.carrier);
    if (sel.type) list = list.filter(s => s.types.includes(sel.type));
    if (sel.equipped) list = list.filter(s => s.equips.length);
    let out;
    switch (sel.pick || 'all') {
      case 'all': out = list; break;
      case 'random': out = list.length ? [pick(list)] : []; break;
      case 'leftmost': out = list.length ? [list[0]] : []; break;
      case 'rightmost': out = list.length ? [list[list.length - 1]] : []; break;
      case 'ends': out = [...new Set([list[0], list[list.length - 1]])].filter(Boolean); break;
      case 'neighbors': { const i = pool.indexOf(c.carrier); out = [pool[i - 1], pool[i + 1]].filter(s => s && s.hp > 0); break; }
      default: throw new Error(`Unknown selector pick: ${sel.pick}`);
    }
    return !out.length && sel.fallback ? select(sel.fallback, c) : out;
  }

  // ---------- Expressions: numbers, "$a" (parameter or variable), and a few operations ----------
  function value(e, c) {
    if (typeof e === 'number') return e;
    if (typeof e === 'string' && e[0] === '$') return e.slice(1) in c.vars ? c.vars[e.slice(1)] : c.params[e.slice(1)];
    if (e && typeof e === 'object') {
      if ('mul' in e) return e.mul.reduce((p, x) => p * value(x, c), 1);
      if ('min' in e) return Math.min(...e.min.map(x => value(x, c)));
      if ('count' in e) return select(e.count, c).length;
      if ('distinctTypes' in e) return uniqueTypes(select(e.distinctTypes, c), e.only).size;
      if ('sumEquips' in e) return select(e.sumEquips, c).reduce((n, s) => n + s.equips.length, 0);
      if ('level' in e) return c.level || 0;
    }
    throw new Error(`Unknown expression: ${JSON.stringify(e)}`);
  }

  // ---------- Actions ----------
  const names = (list, join) => list.map(s => s.name).join(join || ', ');
  const logOf = (a, c, extra) => {
    if (!a.log) return;
    c.say(I18N.t(a.log, { ...c.params, carrier: c.carrier.name, ...c.vars, ...extra }));
  };
  const ACTIONS = {
    // Adds ATK / HP (and max HP) to the targets; atk and hp are expressions. floorAtk: ATK never goes below 0.
    stats(a, c) {
      const targets = select(a.target, c);
      if (!targets.length) return;
      const atk = a.atk == null ? 0 : value(a.atk, c), hp = a.hp == null ? 0 : value(a.hp, c);
      targets.forEach(s => { s.atk += atk; if (a.floorAtk) s.atk = Math.max(0, s.atk); s.hp += hp; s.maxhp += hp; });
      logOf(a, c, { atk, hp, targets: names(targets, a.join), target: targets[0].name, bonusText: [atk && `+${atk} ATQ`, hp && `+${hp} PV`].filter(Boolean).join(' et ') });
    }
  };

  // Runs the template of k.fx. Returns true when the power is handled here (the caller then skips its own code).
  function run(k, src, allies, enemies, say, level) {
    const def = defs[k.fx];
    if (!def) return false;
    const c = { carrier: src, allies, enemies, say, level, params: k, vars: {} };
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
