// The zones the engine relies on, by role (game.json, state.roles.zones): g[Z.field] is where the cards fight, g[Z.reserve] where they wait. Read at the time of use.
const Z = new Proxy({}, { get: (_, role) => GAME.zone(role) });
// Atlas Wanderer — data: constants, types, servants, equipment, heroes, dungeons (provisional content).
'use strict';
// =====================================================================
// DATA — everything that is not in documentation/idees/nouvelles.md is PROVISIONAL
// (content, figures, types). The rules, for their part, follow documentation/idees/nouvelles.md.
// =====================================================================
// Size and economy of the game: they are rules of the mod (data/rules.json, "game"), set when the mod is installed (CATALOG.install).
let MAX_BOARD, HAND_MAX, MAX_LEVEL, MAX_RANK, PROPOSALS, FUSION_COST, FUSION_STEP, PROPHECY_COST, INCOME, BOSS_BOARDS, PATCH_MAX;
// Reinforcement: a servant reinforcement and an equipment reinforcement, bought separately (1 Datacron each). Cards offered: 3 at levels 1-2, 4 at levels 3-4, 5 at levels 5-6.
const reinforcementProposals = level => { const t = RULES.reinforcement.proposals; return t[Math.min(level, t.length) - 1]; };   // data/rules.json
const reinforcementCost = kind => RULES.reinforcement.kinds[kind].cost;
// Datacrons gained at each reinforcement, depending on the room (provisional); beyond the table, the last value.
const incomeFor = room => INCOME[Math.min(room, INCOME.length) - 1];
// The Boss plays three independent boards, reinforced each room like a player (engine.js).
// malus: fewer Datacrons per room (1 = always one fewer, 0.5 = one fewer every other time).

// Rule: a skill is either combat or reinforcement, never both.
// Where the text of a trigger is shown (combat or renfort): read from the triggers of the mod (game.json, triggers), as a table name -> kind.
const TRIG_KIND = new Proxy({}, {
  get: (_, n) => (typeof n === 'string' ? GAME.kindOf(n) : undefined), has: (_, n) => GAME.triggerNames().includes(n), ownKeys: () => GAME.triggerNames(),
  getOwnPropertyDescriptor: (_, n) => (GAME.triggerNames().includes(n) ? { enumerable: true, configurable: true, value: GAME.kindOf(n) } : undefined)
});

let UID = 0;
const uid = () => ++UID;
// Random numbers of the rules: the single source of randomness of the game logic (animations keep their own Math.random).
// Without a seed it uses Math.random; setSeed(n) makes every game reproducible (same seed = same game), setSeed(null) goes back to Math.random.
const mulberry32 = seed => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
let rngSource = null;
const rng = () => (rngSource ? rngSource() : Math.random());
const setSeed = seed => { rngSource = seed == null ? null : mulberry32(seed); };
const rand = n => Math.floor(rng() * n);
const pick = a => a[rand(a.length)];

// Reyes's cybernetic patch: X from 1 to 6, the value X being present (7 - X) times in the pool (the 1 six times, the 6 once).
const sk = (t, fx, a = 0, h = 0, n = 0) => ({ t, fx, a, h, n });
// Name of the power that gives a choice after the combat (game.json, choices.adaptation, who.power): it is shown as a keyword.
const choicePower = () => { const g = typeof GAME !== 'undefined' && GAME.def(), c = g && g.choices.adaptation; return c ? c.who.power : null; };
// Text parameters faces_<bag>: the faces of each bag of game.json (the texts of the powers that draw from it).
const bagParams = () => { const g = typeof GAME !== 'undefined' && GAME.def(); return g && g.bags ? Object.fromEntries(Object.entries(g.bags).filter(([k]) => k !== 'note').map(([k, b]) => [`faces_${k}`, b.faces.join(', ')])) : {}; };
// ---------- Descriptions generated from the bricks ----------
// A power whose template (powers.json) is simple enough describes itself: the brick says what it does (action, target selector, amounts), the texts "gen.*"
// (engine, per language) say how to word it. The generator returns null when it cannot (a brick or a selector with no text): the text written by hand (desc.<fx>) is used.
// A sentence is chosen by the first of its candidate keys that exists: gen.<action>.<variant>[.flags][.<selector>]; the most specific wins (e.g. the sentence of a power
// that acts on itself). Slots: {amount} {value} {stat} {to} {of} {per} {kw} {type}. The selector texts are gen.who.<selector>.to / .of (selector = side.pick[.exclude][.type]...).
const GEN = (() => {
  const t = (key, p) => I18N.t(key, p), has = key => I18N.has(key);
  // $name in a selector is a parameter of the card (k): the type written on its skill.
  const word = (x, k) => (typeof x === 'string' && x[0] === '$' ? k[x.slice(1)] : x);
  // "exclude the carrier" is told ("the other Pilots") only when it changes something: for an unfiltered selector, or when the carrier is known to have the type.
  // On an equipment, or without a card, the carrier is unknown: the neutral wording ("the Pilots").
  const excludes = (sel, ctx) => sel.exclude && (!sel.type || (ctx.carrier && ctx.carrier.types && ctx.carrier.types.includes(word(sel.type, ctx.k))));
  let CTX = { carrier: null, k: {} };   // the skill being described and the card that carries it (null when unknown: equipment, no card)
  const whoId = (sel, ctx = CTX) => {
    if (!sel || typeof sel !== 'object') return null;
    if (sel.ref) return `ref.${sel.ref}`;
    if (sel.side === 'self') return 'self';
    if (!sel.side) return null;
    return [sel.side, sel.pick || 'all', excludes(sel, ctx) && 'exclude', sel.type && 'type', sel.equipped && 'equipped', sel.wounded && 'wounded', sel.hasKeyword && 'hasKeyword', sel.token && 'token', sel.hasShield && 'hasShield'].filter(Boolean).join('.')
  };
  // On an equipment the selector can be worded differently ("to the carrier"): gen.who.<selector>.<role>.equipment first.
  // A selector with no sentence of its own is worded from its parts: a noun (ally / enemy, a type, equipped, wounded) in a pattern given by the choice
  // ("the leftmost {noun}", "all the {nouns}"...) and the role ("to" / "of"). gen.np.<choice>.<role>; ".v": the same pattern for a noun that starts with a vowel
  // (French elision: "à l'allié" / "au Pilote"). Anything the parts cannot say (a keyword filter, a card kind...) is refused.
  const PICKS = ['all', 'random', 'leftmost', 'rightmost', 'ends', 'neighbors', 'leftNeighbor', 'rightNeighbor'];
  function compose(sel, role) {
    if (!sel || sel.ref || sel.firstOf || sel.token || sel.hasKeyword || !['ally', 'enemy'].includes(sel.side)) return null;
    const pick = sel.pick || 'all', stat = /^(min|max):(hp|atk)$/.exec(pick);
    let choice = stat ? `${stat[1]}.${stat[2]}` : PICKS.includes(pick) ? pick : null;
    if (!choice) return null;
    if (choice === 'all' && excludes(sel, CTX)) choice = 'all.exclude';
    const type = sel.type ? word(sel.type, CTX.k) : null, typed = type ? '.typed' : '', slots = { type: type ? I18N.t('type.' + type) : '' };
    const noun = plural => {
      let out = t(`gen.noun${plural ? 's' : ''}.${sel.side}${typed}`, slots);
      for (const [flag, name] of [[sel.equipped, 'equipped'], [sel.wounded, 'wounded']]) if (flag) out = t(`gen.adj.${name}${plural ? '.pl' : ''}`, plural ? { nouns: out } : { noun: out });
      return out;
    };
    if (!has(`gen.noun.${sel.side}${typed}`)) return null;
    const one = noun(false), many = noun(true), vowels = has('gen.vowels') ? t('gen.vowels') : '';
    const vowel = vowels && one.toLowerCase().split('').length && vowels.includes(one.toLowerCase()[0]);
    const key = [vowel && `gen.np.${choice}.${role}.v`, `gen.np.${choice}.${role}`].find(x => x && has(x));
    return key ? t(key, { noun: one, nouns: many }) : null;
  }
  const who = (sel, role, slots, onEquipment) => {
    const id = whoId(sel), key = id && [onEquipment && `gen.who.${id}.${role}.equipment`, `gen.who.${id}.${role}`].find(x => x && has(x));
    return key ? t(key, slots) : (role === 'to' || role === 'of') ? compose(sel, role) : null;
  };
  const composeWho = compose;
  // Candidate keys of a sentence, from the most specific to the base.
  const candidates = (action, variant, flags, id) => {
    const subsets = flags.length === 2 ? [flags, [flags[0]], [flags[1]], []] : flags.length === 1 ? [flags, []] : [[]], out = [];
    subsets.forEach(f => { const base = `gen.${action}.${variant}${f.map(x => '.' + x).join('')}`; if (id) out.push(`${base}.${id}`); out.push(base); });
    return out;
  };
  // A numeric field of a brick: a literal, a parameter of the card ("$n") or that parameter multiplied by a variable of the power ("per").
  const amountOf = (e, k, vars) => {
    if (e == null) return null;
    // A variable that the power computes itself ("vars") is not known here: the sentence is refused. A parameter of the card that is 0 means "none".
    const val = x => (typeof x === 'number' ? x : typeof x === 'string' && x[0] === '$' && !(vars && vars[x.slice(1)]) ? k[x.slice(1)] : undefined);
    if (val(e) === 0) return null;
    if (val(e) !== undefined) return { v: val(e) };
    if (e.mul && e.mul.length === 2) {
      const [x, y] = e.mul;
      if (val(x) === 0) return null;
      if (y === -1 && val(x)) return { v: val(x), neg: true };
      if (typeof y === 'string' && y[0] === '$' && vars && vars[y.slice(1)] && val(x)) return { v: val(x), per: vars[y.slice(1)] };
    }
    return undefined;
  };
  // What a variable of the power counts, as a text id ("per different type in your team"): gen.per.<id>.
  const perText = (expr, slots) => {
    let cap = null;
    if (expr && expr.min && expr.min.length === 2 && typeof expr.min[0] === 'number') { cap = expr.min[0]; expr = expr.min[1]; }
    let id = null;
    if (expr.distinctTypes) id = `distinctTypes.${expr.distinctTypes.side}${expr.only ? '.' + expr.only : ''}`;
    else if (expr.count) id = `count.${expr.count.side}${expr.count.type ? '.type' : ''}`;
    else if (expr.sumEquips) id = `sumEquips.${expr.sumEquips.side}`;
    else if (expr.level) id = 'level';
    const key = id && `gen.per.${id}`;
    if (!key || !has(key)) return null;
    return t(key, { ...slots, type: expr.count && expr.count.type ? I18N.t('type.' + word(expr.count.type, CTX.k)) : '' }) + (cap != null ? t('gen.cap', { max: cap }) : '');
  };
  const statWord = stat => t(`gen.stat.${stat}`);
  const sentence = (action, variant, flags, sel, slots) => {
    const id = whoId(sel), key = candidates(action, variant, flags, id).find(has);
    if (!key) return null;
    const text = t(key, Object.fromEntries(Object.entries(slots).filter(([, v]) => v != null)));   // a slot with no value stays as {name}: the sentence is refused
    return /\{(to|of|per|value|amount|kw|from|subject|obj|with|stat)\}/.test(text) ? null : text;
  };
  // One brick -> a sentence (or null).
  function brick(b, k, vars, onEq) {
    // A selector written on the card ("target": "$target") is replaced by the one of the skill.
    for (const key of ['target', 'from', 'with', 'permanent']) if (typeof b[key] === 'string' && b[key][0] === '$') b = { ...b, [key]: k[b[key].slice(1)] };
    // Type of the selector: "the allied {type}s".
    const typed = b.target && b.target.type ? { type: I18N.t('type.' + word(b.target.type, k)) } : {};
    const slots = { to: who(b.target, 'to', typed, onEq), of: who(b.target, 'of', typed, onEq), subject: who(b.target, 'subject', typed, onEq) };
    let out = null;
    if (b.action === 'stats' && b.let && b.let.x && b.let.x.or && b.let.x.or.length === 2 && b.atk && b.atk.mul && b.atk.mul[0] === '$x' && b.atk.mul[1] === -1 && !b.hp) {
      // "removes n ATK" or, with no n, "removes X ATK, X being its rank": the two wordings of the same brick.
      const n = amountOf(b.let.x.or[0], k), rank = b.let.x.or[1];
      if (n === undefined) return null;
      if (n) out = sentence('stats', 'lose', [], b.target, { ...slots, value: n.v, stat: statWord('atk') });
      else if (rank.stat === 'rank' && rank.of === 'carrier') out = sentence('stats', 'lose.rank', [], b.target, slots);
    } else if (b.action === 'setAttackTarget' && b.from) {
      out = sentence('setAttackTarget', b.from.pick === 'random' ? 'random' : 'pick', [], null, { obj: who(b.from, 'obj', b.from.type ? { type: I18N.t('type.' + word(b.from.type, k)) } : {}, onEq) });
    } else if (b.action === 'stats') {
      const doubles = e => e && e.stat && e.of === 'target';
      if (doubles(b.hp) && b.hp.stat === 'hp' && b.atk == null && !b.flag) return sentence('stats', 'double', [], b.target, slots);
      const atk = amountOf(b.atk, k, vars), hp = amountOf(b.hp, k, vars);
      if (atk === undefined || hp === undefined || (!atk && !hp) || b.flag || b.let) return null;
      const per = (atk || hp).per, neg = !!(atk && atk.neg);
      if ((atk && hp && (atk.per !== hp.per || !!atk.neg !== !!hp.neg)) || (hp && hp.neg)) return null;
      if (per) { slots.per = perText(per, slots); if (!slots.per) return null; }
      if (neg) { if (hp) return null; slots.value = atk.v; slots.stat = statWord('atk'); }
      else slots.amount = atk && hp ? `+${atk.v}/+${hp.v}` : atk ? `+${atk.v} ${statWord('atk')}` : `+${hp.v} ${statWord('hp')}`;
      const flags = [b.permanent && 'perm', per && 'per'].filter(Boolean);
      out = sentence('stats', neg ? 'lose' : 'gain', flags, b.target, slots);
    } else if (b.action === 'damage') {
      const e = b.amount, roll = e && e.roll;
      if (roll) { slots.from = k[String(roll[0]).slice(1)]; slots.value = k[String(roll[1]).slice(1)]; out = sentence('damage', 'roll', [], b.target, slots); }
      else if (e && e.stat === 'atk' && e.of === 'carrier' && !b.once) out = sentence('damage', 'ownAtk', [], b.target, slots);
      else if (e && e.stat === 'rank' && e.of === 'carrier') out = sentence('damage', 'rank', [], b.target, slots);
      else { const a = amountOf(e, k); if (!a || a.neg || a.per) return null; slots.value = a.v; out = sentence('damage', 'n', [], b.target, slots); }
    } else if (b.action === 'heal') {
      const a = amountOf(b.amount && b.amount.add ? b.amount.add[0] : b.amount, k);
      if (!a || a.neg || a.per) return null;
      slots.value = a.v; out = sentence('heal', 'n', [], b.target, slots);
    } else if (b.action === 'shield') out = sentence('shield', 'give', [], b.target, slots);
    else if (b.action === 'keyword' && (b.give || b.remove)) {
      const kw = word(b.give || b.remove, k);
      slots.kw = has(`keywordThe.${kw}`) && b.remove ? t(`keywordThe.${kw}`) : t(`keyword.${kw}`);
      out = sentence('keyword', b.give ? 'give' : 'remove', [], b.target, slots);
    } else if (b.action === 'removeShield') out = sentence('removeShield', 'n', [], b.target, slots);
    else if (b.action === 'flag' && !b.if) out = sentence('flag', b.flag, [], b.target, slots);
    else if (b.action === 'swapAtkHp') out = sentence('swapAtkHp', 'n', [], b.target, slots);
    else if (b.action === 'swapHp' && b.first && b.first.side === 'self') out = sentence('swapHp', 'self', [], null, { with: who(b.second, 'with', {}, onEq) });
    else if (b.action === 'balance') out = sentence('balance', 'n', [], null, { with: who(b.with, 'with', {}, onEq) });
    else if (b.action === 'attack') out = sentence('attack', 'n', [], null, { subject: who(b.attacker, 'subject', {}, onEq), obj: who(b.target, 'obj', {}, onEq) });
    else if (b.action === 'set' && b.fields) {
      const f = b.fields, names = Object.keys(f).sort().join();
      if (names === 'hp' && f.hp.min && f.hp.min.length === 2 && typeof f.hp.min[1] === 'number') { slots.value = f.hp.min[1]; out = sentence('set', 'capHp', [], b.target, slots); }
      else if ((names === 'hp,maxhp' || names === 'atk') && typeof f[names.split(',')[0]] === 'string') {
        const stat = names.split(',')[0], v = vars && vars[f[stat].slice(1)];
        if (v && v.maxOf === stat && b.target && b.target.side === 'self') out = sentence('set', `copyMax.${stat}`, [], null, {});
      }
    } else if (b.action === 'bomb' && b.target && b.target.side === 'enemy' && b.target.pick === 'random') {
      const dmg = amountOf(b.damage, k), times = b.times === undefined ? { v: 1 } : amountOf(b.times, k);
      if (dmg && !dmg.neg && !dmg.per && times && !times.per) { slots.value = dmg.v; slots.times = times.v; out = sentence('bomb', b.splash ? 'splash' : times.v === 1 ? 'one' : 'many', [], null, slots); }
    }
    if (out && b.once) out += has('gen.once') ? t('gen.once') : '';
    return out;
  }
  // The description of a power (without its trigger), or null.
  function of(k, onEquipment = false, carrier = null) {
    const tpl = POWERS.all()[k.fx];
    CTX = { carrier: onEquipment ? null : carrier, k };
    if (!tpl || tpl.start) return null;
    // A power that only reacts to one event: its text is that of its bricks; the event is named by the trigger of the card (skDesc adds it).
    const reaction = tpl.reactions && !tpl.then && tpl.reactions.length === 1 ? tpl.reactions[0] : null;
    if (reaction && reaction.on === 'damage' && reaction.if && reaction.if.lt && reaction.if.lt[0] === '$amount' && reaction.then.length === 1 && reaction.then[0].action === 'cancel') {
      return typeof k[String(reaction.if.lt[1]).slice(1)] === 'number' && has('gen.cancel.smallHits') ? t('gen.cancel.smallHits', { n: k[String(reaction.if.lt[1]).slice(1)] }) : null;   // "damage below n is cancelled"
    }
    const bricks = reaction ? reaction.then : tpl.then;
    if (!bricks || (tpl.reactions && !reaction) || bricks.length !== 1) return null;
    try { return brick(bricks[0], k, tpl.vars, onEquipment); } catch (e) { return null; }
  }
  return { of, who: composeWho };
})();

// Description of a power. The text comes from data/i18n/<lang>.json: "desc.<fx>" for the effect, "trigger.<trigger>" for the prefix.
// carrier: the card that has the skill ({ types }), to word "the other Pilots" only when the carrier is a Pilot; omitted on an equipment or when unknown.
function skDesc(k, onEquipment = false, carrier = null) {
  if (k.fx === choicePower()) return I18N.t(`desc.${k.fx}`);   // the power that is played as a choice after the combat (game.json, choices.adaptation): its description is fixed
  // On an equipment, "desc.<fx>.equipment" replaces "desc.<fx>" when it exists (e.g. "to the carrier" instead of "to itself").
  const key = onEquipment && I18N.has(`desc.${k.fx}.equipment`) ? `desc.${k.fx}.equipment` : `desc.${k.fx}`;
  // A text written by hand (desc.<fx>) wins; without one, the description is generated from the bricks of the power (GEN), which can say no.
  const generated = I18N.has(key) ? null : GEN.of(k, onEquipment, carrier);
  const text = generated != null ? generated : I18N.t(key, { ...k, typeName: k.type ? I18N.t('type.' + k.type) : '', keywordName: k.keyword ? I18N.t('keyword.' + k.keyword) : '', tokenName: k.token && (GAME.def().tokens || {})[k.token] ? String(GAME.def().tokens[k.token].name).toLowerCase() : '', bf: `+${k.a}/+${k.h}`, both: k.a && k.h ? 1 : 0, isDeathrattle: GAME.is(k, 'deathrattle') ? 1 : 0,
    PATCH_MAX, ...bagParams(), PROPOSALS, MAX_RANK, PROPHECY_COST, FUSION_COST });
  if (GAME.is(k, 'passive') || POWERS.all()[k.fx] && POWERS.all()[k.fx].noTrigger) return text;   // a permanent power has no trigger (a template can say so: noTrigger)
  return `${I18N.t(k.fx === 'completeFusion' ? 'trigger.activeFusion' : `trigger.${k.t}`, { type: k.of ? typeName(k.of) : '' })}${I18N.t('trigger.separator')}${text}`;   // Sulseye: active with no limit per reinforcement, its cost replaces the mention
}

// Powers displayed on a card, identical ones merged (×N). Keywords and Adaptation are "fixed": always the same,
// the card writes only their name. Skills (variable values) are described in full.
function powersOf(kws, skills, summon, spent = [], onEquipment = false, carrier = null) {
  const out = [], add = (id, key, name, text, kind, fixed) => {
    let p = out.find(q => q.id === id);
    if (!p) out.push(p = { id, key, name, text, kind, fixed, count: 0, spent: false });
    p.count++; return p;
  };
  kws.forEach(k => { if (VOCAB.keywords[k]) { const p = add('kw:' + k, k, I18N.t('keyword.' + k), I18N.t('keyword.' + k), 'combat', true); if (spent.includes(k)) p.spent = true; } });
  skills.forEach(k => k.fx === choicePower() ? add(k.fx, k.fx, I18N.t(`keyword.${k.fx}`), I18N.t(`desc.${k.fx}`), 'combat', true) : add(`${k.t}:${k.fx}:${k.a}:${k.h}:${k.n}:${k.type || ''}:${k.token || ''}:${k.keyword || ''}`, k.fx, null, skDesc(k, onEquipment, carrier), TRIG_KIND[k.t], false));
  if (summon && (summon.a || summon.h)) add('summon', 'summon', null, I18N.t('ui.summonBonus', { a: summon.a, h: summon.h }), 'combat', false);   // reminder: the units it summons get a bonus
  return out;
}

// Types, keywords, colors and emblems come from the vocabulary of the mod (vocabulary.json): groups of types (a servant has one type of each group).
let VOCAB = { groups: [], families: {}, types: {}, keywords: {} }, TYPE_GROUPS = [], ALL_TYPES = [];
const typesOfGroup = id => (TYPE_GROUPS.find(g => g.id === id) || { types: [] }).types;
const typeName = t => I18N.text('fr', 'type.' + t) || t;   // card identifiers are built from the French names whatever the display language

// ---------- Cards ----------
// The cards are data: data/servants.json, equipment.json, heroes.json and dungeons.json (see CATALOG below). Removed cards stay in data/retired.json.
// Identifiers: one per card, FIXED UUIDs. The identifier never changes; the name is a label from data/i18n/fr.json (card.<id>), so renaming a card is a text change.
// For now the engine still identifies a few cards by their French name (idOf, copiesOf…): names are installed in French whatever the display language.
// New card: add it to the JSON file of its category with a fresh UUID (node -e "console.log(crypto.randomUUID())") and its name to data/i18n/fr.json.
let SERVANTS = [], EQUIPS = [], HEROES = {}, HEROES_RESERVE = {}, DUNGEONS = {};
let RULES = { fatigue: { start: 30, increment: 1 }, settlement: { player: { perRank: 1, flat: 0 }, boss: { perRank: 1, flat: 0 }, taunt: 'prov', absorb: 'shield' }, order: { profile: 'default', profiles: { default: { bands: ['boss', 'opponent', 'heroes', 'ally'], direction: 'leftToRight', replays: 'afterAll' } } },
  game: { maxBoard: 7, handMax: 7, maxLevel: 6, maxRank: 7, fusionRewardProposals: 3, fusionCost: 3, fusionStep: 0, prophecyCost: 60, levelCosts: [3, 4, 5, 6, 7], income: [3], bossBoards: [{ malus: 0 }], patchMax: 6 },
  sockets: { max: 3, colors: ['blue', 'green', 'red'], wildcard: 'chroma', uncoloredFitsAny: true, onReplace: 'returnToHand', onFusion: 'returnToHand', breakChance: 0.25 }, reinforcement: { proposals: [3, 3, 4, 4, 5, 5], kinds: { servant: { cost: 1 }, equip: { cost: 1 } } } };   // data/rules.json (game rules as data)
let STRATEGIES = { default: 'random', list: {}, routines: {}, scores: {}, targets: {} };   // strategies of the Boss boards (strategies.json of the mod)
let IDENTIFIERS = { servants: {}, equipment: {}, heroes: {}, dungeons: {} };   // id -> French name, per category (removed cards included)
let IDS_BY_NAME = {};                                                               // French name -> id, per category
const idOf = (cat, name) => { const id = IDS_BY_NAME[cat][name]; if (!id) throw new Error(`Identifiant manquant : « ${name} » (${cat}) n'est pas dans IDENTIFIERS`); return id; };
const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // only used for the mini-bosses (identifier = dungeon + name)

// Mini-boss: one fixed servant per Boss board (rules of the mod: miniBoss). Its name comes from the text miniBoss.name.
const miniBoss = type => ({ ...RULES.miniBoss, name: I18N.format(I18N.text('fr', 'miniBoss.name'), { type: typeName(type) }), types: [type], sockets: [...RULES.miniBoss.sockets], kw: [...RULES.miniBoss.kw], fixed: true, skill: RULES.miniBoss.skill.map(k => ({ ...k })) });

const CATALOG = (() => {
  const FILES = ['servants', 'equipment', 'heroes', 'dungeons', 'retired', 'rules', 'strategies', 'vocabulary', 'scenes'];   // roles of the files of a mod (mod.json, "files")
  // files = { servants, equipment, heroes, dungeons, retired }: the parsed JSON files. Needs the French texts to be installed.
  function install(files) {
    if (files.vocabulary) {
      VOCAB = files.vocabulary; TYPE_GROUPS = VOCAB.groups; ALL_TYPES = TYPE_GROUPS.flatMap(g => g.types);
      if (typeof AWGfx !== 'undefined') AWGfx.setVocabulary(VOCAB);
    }
    if (files.scenes && typeof AWGfx !== 'undefined') AWGfx.setScenes(files.scenes);   // the scenery of the dungeons
    if (typeof AWGfx !== 'undefined' && AWGfx.setCardLayout) AWGfx.setCardLayout((GAME.def().ui || {}).cards);   // the layout of the cards: the engine's model, rewritten by the mod (game.json, ui.cards)
    if (files.strategies) STRATEGIES = files.strategies;
    if (files.rules) {
      RULES = files.rules;
      const gm = RULES.game;
      MAX_BOARD = gm.maxBoard; HAND_MAX = gm.handMax; MAX_LEVEL = gm.maxLevel; MAX_RANK = gm.maxRank; PROPOSALS = gm.fusionRewardProposals;
      FUSION_COST = gm.fusionCost; FUSION_STEP = gm.fusionStep; PROPHECY_COST = gm.prophecyCost; INCOME = gm.income; BOSS_BOARDS = gm.bossBoards;
      PATCH_MAX = gm.patchMax;
    }
    const nameOf = id => I18N.text('fr', `card.${id}`);
    const skill = list => (!list || list.length === 0 ? null : list.length === 1 ? list[0] : list);   // the engine accepts null, one power or a list
    const withIds = (cards, build) => Object.entries(cards).map(([id, c]) => build(id, c));
    SERVANTS = withIds(files.servants.cards, (id, c) => ({ id, name: nameOf(id), rank: c.rank, atk: c.atk, hp: c.hp, types: c.types || [], sockets: c.sock || [], kw: c.kw || [], skill: skill(c.skill) }));
    EQUIPS = withIds(files.equipment.cards, (id, c) => ({ id, name: nameOf(id), rank: c.rank, atk: c.atk, hp: c.hp, kw: c.kw, type: c.type, color: c.color, skill: skill(c.skill), mod: c.mod }));
    const heroes = withIds(files.heroes.cards, (id, c) => ({ id, name: nameOf(id), types: c.types || [], hp: c.hp, kw: c.kw, power: c.power, reserve: !!c.reserve }));
    HEROES = {}; HEROES_RESERVE = {};
    heroes.forEach(h => { const reserve = h.reserve; delete h.reserve; HEROES[h.id] = h; if (reserve) HEROES_RESERVE[h.id] = h; });   // all heroes are offered for now
    DUNGEONS = {};
    withIds(files.dungeons.cards, (id, c) => ({ id, name: nameOf(id), type: c.type, minis: c.minis || [], strategy: c.strategy == null ? null : c.strategy, strategies: c.strategies || null,
      boss: { name: I18N.text('fr', `boss.${id}`), hp: c.boss.hp, power: c.boss.power, desc: I18N.text('fr', `boss.${id}.desc`) } }))
      .forEach(d => {   // dungeon mini-boss: the one of its own type first, then those of the two other fixed types, one per board. Reference = dungeon + name.
        d.dummies = (d.type ? [d.type, ...d.minis] : []).map(t => { const m = miniBoss(t); m.id = `${d.id}--${slug(m.name)}`; return m; });
        DUNGEONS[d.id] = d;
      });
    IDENTIFIERS = { servants: {}, equipment: {}, heroes: {}, dungeons: {} };
    for (const cat of Object.keys(IDENTIFIERS)) {
      const active = { servants: SERVANTS, equipment: EQUIPS, heroes: Object.values(HEROES), dungeons: Object.values(DUNGEONS) }[cat];
      active.forEach(c => { IDENTIFIERS[cat][c.id] = c.name; });
      files.retired.ids[cat].forEach(id => { IDENTIFIERS[cat][id] = nameOf(id); });
    }
    // name -> id: the removed cards first, so that an active card wins when two cards share a name
    IDS_BY_NAME = {};
    for (const cat of Object.keys(IDENTIFIERS)) {
      const retired = new Set(files.retired.ids[cat]);
      IDS_BY_NAME[cat] = {};
      Object.entries(IDENTIFIERS[cat]).filter(([id]) => retired.has(id)).concat(Object.entries(IDENTIFIERS[cat]).filter(([id]) => !retired.has(id)))
        .forEach(([id, name]) => { IDS_BY_NAME[cat][name] = id; });
    }
  }
  // Browser: loads the JSON files once the texts are there. Tools install the files directly.
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : I18N.ready.then(() => Promise.all(FILES.map(f => MOD.json(f).catch(e => { throw new Error(`${f}: ${e.message}`); })))).then(all => install(Object.fromEntries(FILES.map((f, i) => [f, all[i]]))));
  ready.catch(e => { I18N.banner(`Les cartes du jeu n'ont pas pu être chargées (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });
  return { install, ready };
})();
