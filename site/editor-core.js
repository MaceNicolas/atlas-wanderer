// Atlas Wanderer — logic of the power editor (site/editor.html), without any DOM so that tools/check-editor.js can test it in Node.
// env = the game's functions { SERVANTS, EQUIPS, HEROES, mkServant, applyEquip, applyFx, POWERS, setSeed, skillsOf }: in the page they are the globals
// of the game scripts, in the tests the objects exported by tools/load-game.js.
(function (root) {
  'use strict';
  // Names of the cards that use the power `fx` (servants, equipment, heroes).
  function usageOf(fx, env) {
    const uses = (skill) => [].concat(skill || []).some(k => k && k.fx === fx);
    return [
      ...env.SERVANTS.filter(c => uses(c.skill)).map(c => ({ kind: 'servant', name: c.name, card: c })),
      ...env.EQUIPS.filter(c => uses(c.skill)).map(c => ({ kind: 'equipment', name: c.name, card: c })),
      ...Object.values(env.HEROES).filter(c => uses(c.power)).map(c => ({ kind: 'hero', name: c.name, card: c }))
    ];
  }
  // A small deterministic board to try a power on: 4 allies (the carrier is the second) and 3 enemies, one ally equipped.
  function sampleBoard(env, seed) {
    let a = (seed >>> 0) || 1;
    const next = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const pick = list => list[Math.floor(next() * list.length)];
    const build = () => env.mkServant(pick(env.SERVANTS));
    const allies = Array.from({ length: 4 }, build), enemies = Array.from({ length: 3 }, build);
    if (env.EQUIPS.length) env.applyEquip(allies[2], pick(env.EQUIPS));
    return { allies, enemies, carrierIndex: 1 };
  }
  const row = s => ({ name: s.name, atk: s.atk, hp: s.hp, maxhp: s.maxhp, shield: s.shield ? 1 : 0, kw: s.kw.join(',') });
  // Plays the effect of a power on a sample board, with the given templates (the ones being edited). Returns the board before / after and the combat log.
  function runSandbox(env, defs, fx, params, seed) {
    const board = sampleBoard(env, seed), carrier = board.allies[board.carrierIndex], log = [];
    const before = { allies: board.allies.map(row), enemies: board.enemies.map(row) };
    const saved = env.POWERS.all();
    try {
      env.POWERS.install({ ...saved, [fx]: defs[fx] });
      env.setSeed(seed || 1);
      env.applyFx({ t: params.t || 'startCombat', fx, a: params.a || 0, h: params.h || 0, n: params.n || 0 }, carrier, board.allies, board.enemies, m => log.push(m), null, params.level || 0);
    } finally { env.POWERS.install(saved); }
    return { before, after: { allies: board.allies.map(row), enemies: board.enemies.map(row) }, log, carrier: carrier.name };
  }
  // Kind of a template: an effect played at a trigger, or reactions to events of the combat.
  const kindOf = def => (def.aura ? 'aura' : def.then ? (def.reactions ? 'both' : 'effect') : 'reaction');
  // Validation of a card of data/<category>.json. `known` = { types: [...], keywords: [...], triggers: [...], powers: [...] } (what exists today).
  const KEYWORDS = ['prov', 'poison', 'ranged', 'fury', 'rebirth', 'shield'];
  const CARD_FIELDS = { servants: ['rank', 'atk', 'hp', 'types', 'kw', 'skill', 'art'], equipment: ['rank', 'atk', 'hp', 'kw', 'type', 'skill', 'mod', 'art'], heroes: ['types', 'hp', 'kw', 'power', 'reserve', 'art'], dungeons: ['type', 'minis', 'boss'] };
  // Framing of the illustration in its frame: where the picture is anchored (SVG alignment) and whether it is shown whole. Cards with a picture only.
  const ALIGNS = ['xMinYMin', 'xMidYMin', 'xMaxYMin', 'xMinYMid', 'xMidYMid', 'xMaxYMid', 'xMinYMax', 'xMidYMax', 'xMaxYMax'];
  function validateArt(art) {
    if (art == null) return [];
    if (typeof art !== 'object' || Array.isArray(art)) return ['"art" must be an object'];
    const problems = [];
    for (const k of Object.keys(art)) if (!['align', 'whole'].includes(k)) problems.push(`art: unknown field "${k}"`);
    if (art.align != null && !ALIGNS.includes(art.align)) problems.push(`art.align must be one of ${ALIGNS.join(', ')}`);
    if (art.whole != null && typeof art.whole !== 'boolean') problems.push('art.whole must be true or false');
    return problems;
  }
  // Only what differs from the default framing is stored.
  const cleanArt = art => { const o = {}; if (art && art.align && art.align !== 'xMidYMid') o.align = art.align; if (art && art.whole) o.whole = true; return Object.keys(o).length ? o : undefined; };
  function validateCard(category, card, known) {
    const problems = [], num = (k, min) => { if (!Number.isFinite(card[k]) || card[k] < min) problems.push(`"${k}" must be a number >= ${min}`); };
    if (category === 'dungeons') return validateDungeon(card, known);
    if (!CARD_FIELDS[category]) return [`cards of "${category}" are not editable here`];
    if (!card || typeof card !== 'object' || Array.isArray(card)) return ['a card must be an object'];
    for (const k of Object.keys(card)) if (!CARD_FIELDS[category].includes(k)) problems.push(`unknown field "${k}"`);
    if (category !== 'heroes') num('rank', 1);
    if (category !== 'equipment') { if (category === 'servants') num('atk', 0); num('hp', 1); } else { num('atk', 0); num('hp', 0); }
    const typeList = category === 'equipment' ? [card.type] : card.types;
    if (category === 'equipment' ? typeof card.type !== 'string' : !Array.isArray(card.types) || !card.types.length) problems.push(category === 'equipment' ? '"type" must be a type id' : '"types" must be a non-empty list');
    else typeList.forEach(t => { if (!known.types.includes(t)) problems.push(`unknown type "${t}"`); });
    problems.push(...validateArt(card.art));
    if (category === 'heroes' && card.reserve != null && typeof card.reserve !== 'boolean') problems.push('"reserve" must be true or false');
    const kws = card.kw == null ? [] : [].concat(card.kw);
    kws.forEach(k => { if (!KEYWORDS.includes(k)) problems.push(`unknown keyword "${k}"`); });
    const skills = category === 'heroes' ? (card.power ? [card.power] : []) : (card.skill || []);
    if (!Array.isArray(skills)) problems.push('"skill" must be a list');
    else skills.forEach((k, i) => {
      const w = `power ${i + 1}`;
      if (!k || typeof k !== 'object') return problems.push(`${w}: must be an object`);
      if (!known.triggers.includes(k.t)) problems.push(`${w}: unknown trigger "${k.t}"`);
      if (!known.powers.includes(k.fx)) problems.push(`${w}: unknown power "${k.fx}"`);
      for (const n of ['a', 'h', 'n']) if (!Number.isFinite(k[n])) problems.push(`${w}: "${n}" must be a number`);
    });
    return problems;
  }
  // A dungeon: its type, the two other types of its mini-bosses and its Boss (HP, power = a template of data/powers.json).
  function validateDungeon(card, known) {
    const problems = [];
    if (!card || typeof card !== 'object' || Array.isArray(card)) return ['a dungeon must be an object'];
    for (const k of Object.keys(card)) if (!['type', 'minis', 'boss'].includes(k)) problems.push(`unknown field "${k}"`);
    if (!known.types.includes(card.type)) problems.push(`unknown type "${card.type}"`);
    if (!Array.isArray(card.minis) || card.minis.length !== 2) problems.push('"minis" must list exactly two types');
    else {
      card.minis.forEach(t => { if (!known.types.includes(t)) problems.push(`unknown mini-boss type "${t}"`); });
      if (new Set([card.type, ...card.minis]).size !== 3) problems.push('the dungeon type and the two mini-boss types must differ');
    }
    const b = card.boss;
    if (!b || typeof b !== 'object') problems.push('"boss" is missing');
    else {
      if (!Number.isFinite(b.hp) || b.hp < 1) problems.push('boss.hp must be a number >= 1');
      if (!known.powers.includes(b.power)) problems.push(`boss.power: unknown power "${b.power}"`);
      for (const k of Object.keys(b)) if (!['hp', 'power'].includes(k)) problems.push(`boss: unknown field "${k}"`);
    }
    return problems;
  }
  // A new card to start from, per category (the editor then lets the designer change everything).
  const newCard = category => ({
    servants: { rank: 1, atk: 1, hp: 1, types: ['pilot'], kw: [], skill: [] },
    equipment: { rank: 1, atk: 1, hp: 0, kw: null, type: 'pilot', skill: [], mod: null },
    heroes: { types: ['pilot'], hp: 20, kw: null, power: null },
    dungeons: { type: 'pilot', minis: ['droid', 'elk'], boss: { hp: 200, power: 'surge' } }
  }[category]);
  // Removing a card = listing its id in data/retired.json (its texts stay: old saves and balance history still use them).
  function retire(retired, category, id) {
    const ids = retired.ids[category];
    return { ...retired, ids: { ...retired.ids, [category]: ids.includes(id) ? ids : [...ids, id] } };
  }
  // What exists today in the three card files, to validate new cards against.
  function knownFrom(files, typeIds, powerIds, triggerIds = []) {
    const triggers = new Set(triggerIds), fxs = new Set(powerIds);
    for (const cat of ['servants', 'equipment', 'heroes'])
      for (const c of Object.values(files[cat].cards)) [].concat(c.skill || c.power || []).forEach(k => { triggers.add(k.t); fxs.add(k.fx); });
    return { types: typeIds, keywords: KEYWORDS, triggers: [...triggers], powers: [...fxs] };
  }
  // Names of the placeholders of a text: "{name}", "{n?a|b}", "{n!a|b}" -> name, n (nested ones included).
  const placeholdersOf = text => [...new Set([...String(text).matchAll(/\{(\w+)(?:[?!]|\})/g)].map(m => m[1]))].sort();
  // Texts of a language: strings only, no key of the reference removed; with options.placeholders, also the same placeholders as the reference text.
  function validateTexts(table, reference, options = {}) {
    const problems = [];
    if (!table || typeof table !== 'object' || Array.isArray(table)) return ['texts must be an object'];
    for (const [k, v] of Object.entries(table)) if (typeof v !== 'string') problems.push(`${k}: must be a text`);
    if (reference) {
      for (const k of Object.keys(reference)) if (!(k in table)) problems.push(`${k}: key removed`);
      if (options.placeholders) for (const [k, v] of Object.entries(table)) if (k in reference && typeof v === 'string' && placeholdersOf(v).join() !== placeholdersOf(reference[k]).join()) problems.push(`${k}: placeholders differ from the reference text`);
    }
    return problems;
  }
  // data/rules.json: the active order profile exists, its bands are known, fatigue numbers are positive.
  function validateRules(rules) {
    const problems = [], bands = ['boss', 'opponent', 'heroes', 'ally'];
    if (!rules || typeof rules !== 'object') return ['rules must be an object'];
    const order = rules.order;
    if (!order || !order.profiles || !order.profiles[order.profile]) problems.push('order.profile must name an existing profile');
    else for (const [name, p] of Object.entries(order.profiles)) {
      if (!Array.isArray(p.bands) || p.bands.some(b => !bands.includes(b))) problems.push(`order.profiles.${name}.bands: only ${bands.join(', ')}`);
      if (!['inBand', 'afterAll'].includes(p.replays)) problems.push(`order.profiles.${name}.replays: inBand or afterAll`);
      if (p.direction != null && !['leftToRight', 'rightToLeft'].includes(p.direction)) problems.push(`order.profiles.${name}.direction: leftToRight or rightToLeft`);
    }
    const st = rules.settlement;
    if (!st) problems.push('settlement is missing');
    else {
      for (const side of ['player', 'boss']) if (!st[side] || !(st[side].perRank >= 0) || !Number.isFinite(st[side].flat) || st[side].perRank * 1 + st[side].flat < 0) problems.push(`settlement.${side}: perRank and flat must be numbers (perRank >= 0)`);
      for (const k of ['taunt', 'absorb']) if (typeof st[k] !== 'string') problems.push(`settlement.${k} must be a keyword id`);
    }
    if (!rules.fatigue || !(rules.fatigue.start >= 1) || !(rules.fatigue.increment >= 1)) problems.push('fatigue.start and fatigue.increment must be numbers >= 1');
    return problems;
  }
  const api = { ALIGNS, validateArt, cleanArt, KEYWORDS, validateDungeon, newCard, retire, placeholdersOf, validateTexts, validateRules, usageOf, sampleBoard, runSandbox, kindOf, validateCard, knownFrom, CARD_FIELDS };
  if (typeof module !== 'undefined') module.exports = api; else root.EditorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
