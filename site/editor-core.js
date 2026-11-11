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
  const CARD_FIELDS = { servants: ['rank', 'atk', 'hp', 'types', 'sock', 'kw', 'skill', 'art'], equipment: ['rank', 'atk', 'hp', 'kw', 'type', 'color', 'skill', 'mod', 'art'], heroes: ['types', 'hp', 'kw', 'power', 'reserve', 'art'], dungeons: ['type', 'minis', 'boss'] };
  // Equipment sockets (the rules are in data/rules.json, "sockets"; known.sockets): a servant has 0 to max sockets (card.sock), each of a color or the wildcard; an equipment has one color (card.color).
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
    if (category === 'servants') {
      const rule = known.sockets;
      if (!Array.isArray(card.sock) || (rule && card.sock.length > rule.max)) problems.push(`"sock" must be a list of 0 to ${rule ? rule.max : 'max'} sockets`);
      else if (rule) card.sock.forEach(c => { if (![...rule.colors, rule.wildcard].includes(c)) problems.push(`unknown socket color "${c}"`); });
    }
    if (category === 'equipment' && known.sockets && !known.sockets.colors.includes(card.color)) problems.push(`"color" must be one of ${known.sockets.colors.join(', ')}`);
    if (category === 'heroes' && card.reserve != null && typeof card.reserve !== 'boolean') problems.push('"reserve" must be true or false');
    const kws = card.kw == null ? [] : [].concat(card.kw);
    kws.forEach(k => { if (known.keywords && !known.keywords.includes(k)) problems.push(`unknown keyword "${k}"`); });
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
    servants: { rank: 1, atk: 1, hp: 1, types: ['pilot'], sock: [], kw: [], skill: [] },
    equipment: { rank: 1, atk: 1, hp: 0, kw: null, type: 'pilot', color: 'blue', skill: [], mod: null },
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
    return { types: typeIds, keywords: files.vocabulary ? Object.keys(files.vocabulary.keywords) : null, triggers: [...triggers], powers: [...fxs], sockets: files.rules && files.rules.sockets };
  }
  // vocabulary.json: groups of types, each type with a group and a color or a family, an emblem; keywords with an icon.
  function validateVocabulary(v) {
    const problems = [];
    if (!v || !Array.isArray(v.groups) || !v.groups.length || !v.types || !v.keywords) return ['vocabulary needs groups, types and keywords'];
    const seen = new Set();
    for (const g of v.groups) for (const t of g.types || []) {
      if (seen.has(t)) problems.push(`type ${t} is in two groups`); seen.add(t);
      const d = v.types[t];
      if (!d) { problems.push(`type ${t} has no definition`); continue; }
      if (d.group !== g.id) problems.push(`type ${t}: group must be ${g.id}`);
      if (!d.color && !(v.families || {})[d.family]) problems.push(`type ${t}: a color or a known family is needed`);
      if (typeof d.icon !== 'string' || !d.icon) problems.push(`type ${t}: an icon is needed`);
    }
    for (const t of Object.keys(v.types)) if (!seen.has(t)) problems.push(`type ${t} is in no group`);
    for (const [k, d] of Object.entries(v.keywords)) if (typeof d.icon !== 'string' || !d.icon) problems.push(`keyword ${k}: an icon is needed`);
    return problems;
  }
  // theme.css of a mod: only custom properties (--name: value), on the selectors the engine allows (decision 2 of flux-de-jeu.md). Nothing that loads or runs anything.
  function validateThemeCss(css, schema) {
    const problems = [], text = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
    if (/@|url\s*\(|expression|javascript:|<|\\/i.test(text)) problems.push('theme.css: no @-rule, url(), escape or markup is allowed');
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m, seen = 0, rest = text;
    while ((m = re.exec(text))) {
      seen++; rest = rest.replace(m[0], '');
      const selector = m[1].trim();
      if (!schema.themeSelectors.includes(selector)) problems.push(`theme.css: selector "${selector}" is not allowed (${schema.themeSelectors.join(', ')})`);
      for (const decl of m[2].split(';').map(d => d.trim()).filter(Boolean)) if (!/^--[\w-]+\s*:\s*[^:]+$/.test(decl)) problems.push(`theme.css: "${decl}" is not a custom property`);
    }
    if (rest.trim()) problems.push('theme.css: only rules of the form selector { --name: value; } are allowed');
    if (!seen) problems.push('theme.css: no rule');
    return problems;
  }
  // game.json of a mod (flux-de-jeu.md). ctx = { schema (GAME_SCHEMA), files (roles of mod.json), rules (the mod's rules.json), texts (merged fr table, optional) }.
  // Checks that every name is one the engine knows and that every reference points at something that exists.
  function validateGame(game, ctx) {
    const problems = [], S = ctx.schema, add = (where, msg) => problems.push(`${where}: ${msg}`);
    if (!game || typeof game !== 'object') return ['game must be an object'];
    for (const k of ['categories', 'state', 'setup', 'flow', 'actions', 'choices', 'ui']) if (!game[k] || typeof game[k] !== 'object') add(k, 'is missing');
    if (problems.length) return problems;
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    // A reference "game.maxBoard" / "rules.reinforcement.kinds.servant.cost" must resolve in rules.json (an integer or a string path).
    // anyKind: the reference may point at a list (the number of boards, the proposals per level); otherwise it must be a number.
    const refOk = (v, anyKind) => {
      if (Number.isFinite(v)) return true;
      if (typeof v !== 'string') return false;
      let node = ctx.rules; const path = v.replace(/^rules\./, '').split('.');
      for (const p of path) { if (node == null || typeof node !== 'object' || !has(node, p)) return false; node = node[p]; }
      return anyKind ? node != null : Number.isFinite(node);
    };
    const textOk = key => !ctx.texts || key in ctx.texts;
    for (const [id, c] of Object.entries(game.categories)) {
      if (!ctx.files[c.file]) add(`categories.${id}`, `file "${c.file}" is not a file of the mod`);
      if (!c.fields || typeof c.fields !== 'object') add(`categories.${id}`, 'fields are missing');
      else for (const [f, t] of Object.entries(c.fields)) if (!S.fieldTypes.includes(t)) add(`categories.${id}.fields.${f}`, `unknown field type "${t}"`);
    }
    const st = game.state, zones = st.zones || {}, res = st.resources || {};
    for (const [id, z] of Object.entries(zones)) {
      if (!refOk(z.max)) add(`state.zones.${id}.max`, `"${z.max}" is not a number or a reference to the rules`);
      if (!S.zoneLayouts.includes(z.layout)) add(`state.zones.${id}.layout`, `unknown layout "${z.layout}"`);
    }
    for (const [id, r] of Object.entries(res)) {
      if (!Number.isFinite(r.start)) add(`state.resources.${id}.start`, 'must be a number');
      if (r.max != null && !refOk(r.max)) add(`state.resources.${id}.max`, `"${r.max}" does not resolve in the rules`);
      if (r.field != null && typeof r.field !== 'string') add(`state.resources.${id}.field`, 'must be the name of a field of the game state');
    }
    const vars = st.vars || {};
    for (const [id, v] of Object.entries(vars)) {
      if (!('default' in v)) add(`state.vars.${id}`, 'a default value is needed');
      if (!Array.isArray(v.sides) || !v.sides.length || v.sides.some(x => !has(st.sides || {}, x))) add(`state.vars.${id}.sides`, 'must list sides of the state');
      if (has(zones, id) || Object.values(res).some(r => r.field === id)) add(`state.vars.${id}`, 'is also a zone or a resource field');
    }
    for (const [id, side] of Object.entries(st.sides || {})) {
      for (const z of side.zones || []) if (!has(zones, z)) add(`state.sides.${id}.zones`, `unknown zone "${z}"`);
      for (const r of side.resources || []) if (!has(res, r)) add(`state.sides.${id}.resources`, `unknown resource "${r}"`);
      if (side.count != null && !refOk(side.count, true)) add(`state.sides.${id}.count`, `"${side.count}" does not resolve in the rules`);
    }
    const screens = (game.ui && game.ui.screens) || {};
    for (const step of (game.setup && game.setup.steps) || []) if (typeof step.into !== 'string' || !step.into) add(`setup.steps.${step.id}`, '"into" must name the field of the game state that holds the selection');
    const pred = (p, where) => {
      if (!p || typeof p !== 'object') return add(where, 'a condition must be an object');
      const keys = Object.keys(p).filter(k => S.predicates.includes(k));
      if (keys.length !== 1) return add(where, `a condition has exactly one of ${S.predicates.join(', ')}`);
      const k = keys[0];
      if (k === 'not') pred(p.not, where); else if (k === 'any' || k === 'all') (Array.isArray(p[k]) && p[k].length ? p[k] : (add(where, `${k} needs a list`), [])).forEach(x => pred(x, where));
      else if (k === 'choiceOpen') { if (!S.choiceStates.includes(p.choiceOpen)) add(where, `choiceOpen must be one of ${S.choiceStates.join(', ')}`); }
      else if (k === 'zone') { if (!has(zones, p.zone)) add(where, `unknown zone "${p.zone}"`); if (!S.zoneStates.includes(p.is)) add(where, `"is" must be one of ${S.zoneStates.join(', ')}`); }
      else if (k === 'resource' || k === 'query') {
        if (k === 'resource' && !has(res, p.resource)) add(where, `unknown resource "${p.resource}"`);
        if (k === 'query' && !S.queries.includes(p.query)) add(where, `unknown query "${p.query}"`);
        const cmp = S.comparisons.filter(c => c in p);
        if (cmp.length !== 1) add(where, `one comparison of ${S.comparisons.join(', ')} is needed`); else if (!refOk(p[cmp[0]])) add(where, `"${p[cmp[0]]}" is not a number or a reference to the rules`);
      }
    };
    const effect = (e, where) => {
      if (!e || !S.effects.includes(e.action)) return add(where, `unknown effect "${e && e.action}"`);
      if (['gainResource', 'spendResource', 'incrementResource'].includes(e.action) && !has(res, e.resource)) add(where, `unknown resource "${e.resource}"`);
      if (e.action === 'openChoice' && !has(game.choices, e.choice)) add(where, `unknown choice "${e.choice}"`);
      if (e.action === 'run' && !S.runners.includes(e.run)) add(where, `unknown runner "${e.run}"`);
      if (e.action === 'moveCard' && !has(zones, e.to)) add(where, `unknown zone "${e.to}"`);
    };
    for (const [id, a] of Object.entries(game.actions)) {
      const w = `actions.${id}`;
      if (a.label != null && !textOk(a.label)) add(w, `text "${a.label}" is missing`);
      for (const [r, v] of Object.entries(a.cost || {})) { if (!has(res, r)) add(w, `unknown resource "${r}" in cost`); else if (!refOk(v)) add(w, `cost "${v}" does not resolve in the rules`); }
      (a.when || []).forEach(p => pred(p, w));
      if (!Array.isArray(a.effects) || !a.effects.length) add(w, 'effects are needed'); else a.effects.forEach(e => effect(e, w));
      if (a.drag) { if (!has(zones, a.drag.from)) add(w, `unknown zone "${a.drag.from}"`); }
    }
    for (const [id, c] of Object.entries(game.choices)) {
      const w = `choices.${id}`;
      if (!c.from || !S.draws.includes(c.from.draw)) add(w, `"from.draw" must be one of ${S.draws.join(', ')}`);
      if (c.from && c.from.count != null && !refOk(c.from.count, true)) add(w, `count "${c.from.count}" does not resolve in the rules`);
      if (!S.views.includes(c.view)) add(w, `unknown view "${c.view}"`);
      if (c.title && !textOk(c.title)) add(w, `text "${c.title}" is missing`);
      (c.then || []).forEach(e => effect(e, w));
      for (const m of c.modifiers || []) {
        if (typeof m.power !== 'string' || !S.offerEffects.includes(m.effect)) add(w, `a modifier needs a power and an effect among ${S.offerEffects.join(', ')}`);
        if (m.effect === 'offTypeChance' && (typeof m.percentPer !== 'string' || !['equip', 'servant'].includes(m.kind))) add(w, 'offTypeChance needs a kind and the field percentPer of the power');
      }
      if (c.options) {
        if (!c.who || typeof c.who.power !== 'string') add(w, '"who.power" is needed with options');
        if (c.who && c.who.type && !(ctx.types || []).includes(c.who.type) && ctx.types) add(w, `unknown type "${c.who.type}"`);
        for (const o of c.options) {
          if (!S.optionKinds.includes(o.kind)) add(w, `unknown option kind "${o.kind}"`);
          if (o.kind === 'statBoost' && (!Array.isArray(o.stats) || !o.stats.length || !o.amount || !has(res, o.amount.resource))) add(w, 'a statBoost needs stats and an amount from a resource');
        }
      }
    }
    const flow = game.flow, phases = flow.phases || {};
    if (!has(phases, flow.start)) add('flow.start', `unknown phase "${flow.start}"`);
    for (const [pid, ph] of Object.entries(phases)) {
      const w = `flow.phases.${pid}`;
      if (ph.final) { if (!has(screens, ph.screen)) add(w, `unknown screen "${ph.screen}"`); continue; }
      const stepIds = new Set();
      for (const step of ph.steps || []) {
        const ws = `${w}.steps.${step.id}`;
        if (stepIds.has(step.id)) add(ws, 'duplicate step'); stepIds.add(step.id);
        if (!!step.auto === !!step.interactive) add(ws, 'a step is either auto or interactive');
        if (step.run && !S.runners.includes(step.run)) add(ws, `unknown runner "${step.run}"`);
        for (const ev of Object.values(step.emit || {})) if (!S.flowEvents.includes(ev)) add(ws, `unknown event "${ev}"`);
        (step.when || []).forEach(p => pred(p, ws));
        if (step.screen && !has(screens, step.screen)) add(ws, `unknown screen "${step.screen}"`);
        (step.effects || []).forEach(e => effect(e, ws));
        for (const a of step.actions || []) if (!has(game.actions, a)) add(ws, `unknown action "${a}"`);
        if (step.until && !has(game.actions, step.until)) add(ws, `unknown action "${step.until}"`);
        if (step.interactive && !step.until) add(ws, 'an interactive step needs "until"');
      }
      if (!ph.steps || !ph.steps.length) add(w, 'steps are needed');
      if (!Array.isArray(ph.end) || !ph.end.length) add(w, '"end" transitions are needed');
      else {
        ph.end.forEach((t, i) => {
          if (!has(phases, t.go)) add(`${w}.end.${i}`, `unknown phase "${t.go}"`);
          if (t.if) pred(t.if, `${w}.end.${i}`);
          (t.effects || []).forEach(e => effect(e, `${w}.end.${i}`));
        });
        if (ph.end[ph.end.length - 1].if) add(w, 'the last transition must have no condition');
      }
    }
    const setupIds = new Set();
    for (const step of game.setup.steps || []) {
      const w = `setup.steps.${step.id}`;
      if (setupIds.has(step.id)) add(w, 'duplicate step'); setupIds.add(step.id);
      if (!step.pick || !has(game.categories, step.pick.from) || !(step.pick.count >= 1)) add(w, '"pick" needs an existing category and a count >= 1');
      if (!has(screens, step.screen)) add(w, `unknown screen "${step.screen}"`);
      if (step.back && !(game.setup.steps || []).some(s => s.id === step.back)) add(w, `unknown step "${step.back}"`);
    }
    for (const e of game.setup.init || []) effect(e, 'setup.init');
    for (const [id, a] of Object.entries(game.heroActions || {})) {
      if (id === 'note') continue;
      const w = `heroActions.${id}`;
      if (!textOk(a.label)) add(w, `text "${a.label}" is missing`);
      if (typeof a.icon !== 'string' || typeof a.color !== 'string') add(w, 'an icon and a color are needed');
      if (!a.effect || !S.heroEffects.includes(a.effect.action)) add(w, `unknown effect "${a.effect && a.effect.action}"`);
      if (a.effect && a.effect.log && !textOk(a.effect.log)) add(w, `text "${a.effect.log}" is missing`);
      if (!a.targets || !Array.isArray(a.targets.zones) || !a.targets.zones.length || a.targets.zones.some(z => !has(zones, z))) add(w, 'targets.zones must list zones of the state');
      for (const f of (a.targets && a.targets.where) || []) { const k = Object.keys(f); if (k.length !== 1 || !S.targetFilters.includes(k[0])) add(w, `a target test has exactly one of ${S.targetFilters.join(', ')}`); }
      if (a.cost) { if (!has(res, a.cost.resource) || !refOk(a.cost.base) || !refOk(a.cost.step)) add(w, 'cost needs a resource, a base and a step that resolve'); }
    }
    for (const [id, tk] of Object.entries(game.tokens || {})) {
      if (id === 'note') continue;
      if (typeof tk.name !== 'string' || !tk.name || !(tk.rank >= 1) || !Array.isArray(tk.types)) add(`tokens.${id}`, 'name, rank (>= 1) and types are needed');
      else if (ctx.types) tk.types.forEach(t => { if (!ctx.types.includes(t)) add(`tokens.${id}`, `unknown type "${t}"`); });
    }
    for (const [id, bag] of Object.entries(game.bags || {})) {
      if (id === 'note') continue;
      const w = `bags.${id}`;
      if (!Array.isArray(bag.faces) || !bag.faces.length || bag.faces.some(n => !Number.isInteger(n))) add(w, 'faces must be a non-empty list of whole numbers');
      if (!Number.isInteger(bag.copies) || bag.copies < 1) add(w, 'copies must be a whole number >= 1');
      if (!bag.effect || !has(res, bag.effect.resource) || !Number.isInteger(bag.effect.floor)) add(w, 'effect needs a resource and a floor');
      if (!S.bagAnimations.includes(bag.animation)) add(w, `unknown animation "${bag.animation}"`);
      else if (bag.animation === 'diceRoll' && (bag.faces || []).length !== 6) add(w, 'a diceRoll needs exactly 6 faces');
    }
    for (const [fx, pr] of Object.entries(game.promises || {})) {
      if (fx === 'note') continue;
      const w = `promises.${fx}`;
      if (!S.flowEvents.includes(pr.on)) add(w, `unknown event "${pr.on}"`);
      if (!pr.choose || !has(game.categories, pr.choose.category) || !refOk(pr.choose.rank) || !refOk(pr.choose.count)) add(w, 'choose needs a category, a rank and a count that resolve');
      if (!pr.deliver || !has(res, pr.deliver.resource) || !refOk(pr.deliver.spent) || !has(zones, pr.deliver.to)) add(w, 'deliver needs a resource, an amount that resolves and a zone');
      for (const k of ['title', 'when', 'discovered', 'arrived']) if (!pr.texts || !pr.texts[k] || !textOk(pr.texts[k])) add(w, `text "${pr.texts && pr.texts[k]}" (${k}) is missing`);
    }
    const cp = game.companion;
    if (cp) {
      if (typeof cp.type !== 'string' || (ctx.types && !ctx.types.includes(cp.type))) add('companion.type', `unknown type "${cp.type}"`);
      if (typeof cp.profileCounter !== 'string' || !/\{number\}/.test(cp.nameFormat || '') || !(cp.numberBase >= 2 && cp.numberBase <= 36) || !(cp.numberWidth >= 1)) add('companion', 'profileCounter, nameFormat with {number}, numberBase (2 to 36) and numberWidth are needed');
      if (!cp.card || !(cp.card.rank >= 1) || !(cp.card.hp >= 1) || !Array.isArray(cp.card.types) || !Array.isArray(cp.card.kw) || !Array.isArray(cp.card.skill)) add('companion.card', 'rank, atk, hp, types, kw and skill are needed');
    }
    const ui = game.ui;
    if (!ui.theme || typeof ui.theme.css !== 'string') add('ui.theme.css', 'a theme file is needed');
    if (ui.theme && ui.theme.title && !textOk(ui.theme.title)) add('ui.theme.title', `text "${ui.theme.title}" is missing`);
    for (const [ev, an] of Object.entries(ui.animations || {})) { if (!S.events.includes(ev)) add('ui.animations', `unknown event "${ev}"`); if (!S.animations.includes(an)) add('ui.animations', `unknown animation "${an}"`); }
    for (const [id, sc] of Object.entries(screens)) {
      if (!S.layouts.includes(sc.layout)) add(`ui.screens.${id}`, `unknown layout "${sc.layout}"`);
      (sc.panels || []).forEach((p, i) => {
        const w = `ui.screens.${id}.panels.${i}`;
        if (!S.widgets.includes(p.widget)) return add(w, `unknown widget "${p.widget}"`);
        if (p.category && !has(game.categories, p.category)) add(w, `unknown category "${p.category}"`);
        if (p.zone && !has(zones, p.zone)) add(w, `unknown zone "${p.zone}"`);
        if (p.side && !has(st.sides, p.side)) add(w, `unknown side "${p.side}"`);
        for (const a of [...(p.actions || []), ...(p.drop || []), ...(p.action ? [p.action] : [])]) if (!has(game.actions, a)) add(w, `unknown action "${a}"`);
        for (const r of p.resources || []) if (!has(res, r)) add(w, `unknown resource "${r}"`);
      });
    }
    return problems;
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
    const so = rules.sockets;
    if (!so) problems.push('sockets is missing');
    else {
      if (!Number.isInteger(so.max) || so.max < 0) problems.push('sockets.max must be a whole number >= 0');
      if (!Array.isArray(so.colors) || !so.colors.length || so.colors.some(c => typeof c !== 'string')) problems.push('sockets.colors must be a non-empty list of color ids');
      if (typeof so.wildcard !== 'string' || (so.colors || []).includes(so.wildcard)) problems.push('sockets.wildcard must be an id different from the colors');
      if (typeof so.uncoloredFitsAny !== 'boolean') problems.push('sockets.uncoloredFitsAny must be true or false');
      for (const k of ['onReplace', 'onFusion']) if (!['returnToHand', 'lose'].includes(so[k])) problems.push(`sockets.${k}: returnToHand or lose`);
      if (!(so.breakChance >= 0 && so.breakChance <= 1)) problems.push('sockets.breakChance must be between 0 and 1');
    }
    const gm = rules.game;
    if (!gm) problems.push('game is missing');
    else {
      for (const k of ['maxBoard', 'handMax', 'maxLevel', 'maxRank', 'fusionRewardProposals', 'gameTypes', 'bossRandomTypes']) if (!Number.isInteger(gm[k]) || gm[k] < 1) problems.push(`game.${k} must be a whole number >= 1`);
      for (const k of ['fusionCost', 'fusionStep', 'prophecyCost', 'levelCostOffset']) if (!Number.isInteger(gm[k]) || gm[k] < 0) problems.push(`game.${k} must be a whole number >= 0`);
      if (!Number.isInteger(gm.patchMax) || gm.patchMax < 1) problems.push('game.patchMax must be a whole number >= 1');
      if (!Array.isArray(gm.income) || !gm.income.length || gm.income.some(n => !Number.isInteger(n) || n < 0)) problems.push('game.income must be a non-empty list of whole numbers >= 0');
      if (!Array.isArray(gm.bossBoards) || !gm.bossBoards.length || gm.bossBoards.some(b => !(b.malus >= 0 && b.malus <= 1))) problems.push('game.bossBoards must be a non-empty list of { malus: 0 to 1 }');
    }
    const bb = rules.bossBehaviors;
    if (!bb || !bb.list || !bb.list[bb.default]) problems.push('bossBehaviors.default must name a behavior of bossBehaviors.list');
    else for (const [id, b] of Object.entries(bb.list)) {
      for (const k of ['want', 'level']) if (!b[k] || !Number.isInteger(b[k].base) || !(b[k].per >= 1)) problems.push(`bossBehaviors.${id}.${k}: { base, per >= 1 }`);
      if (!(b.equipP >= 0 && b.equipP <= 1)) problems.push(`bossBehaviors.${id}.equipP must be between 0 and 1`);
      if (!['card', 'rank', 'sharedTypes'].includes(b.score)) problems.push(`bossBehaviors.${id}.score: card, rank or sharedTypes`);
      if (!['strongest', 'leastEquipped', 'fixed'].includes(b.target)) problems.push(`bossBehaviors.${id}.target: strongest, leastEquipped or fixed`);
    }
    const mb = rules.miniBoss;
    if (!mb || !(mb.rank >= 1) || !(mb.atk >= 0) || !(mb.hp >= 1) || !Array.isArray(mb.sockets) || !Array.isArray(mb.kw) || !Array.isArray(mb.skill)) problems.push('miniBoss: rank, atk, hp, sockets, kw and skill are needed');
    const rf = rules.reinforcement;
    if (!rf) problems.push('reinforcement is missing');
    else {
      if (!Array.isArray(rf.proposals) || !rf.proposals.length || rf.proposals.some(n => !Number.isInteger(n) || n < 1)) problems.push('reinforcement.proposals must be a non-empty list of whole numbers >= 1');
      if (!rf.kinds || !Object.keys(rf.kinds).length || Object.keys(rf.kinds).some(k => !['servant', 'equip'].includes(k) || !(rf.kinds[k].cost >= 1))) problems.push('reinforcement.kinds: servant and/or equip, each with a cost >= 1');
    }
    if (!rules.fatigue || !(rules.fatigue.start >= 1) || !(rules.fatigue.increment >= 1)) problems.push('fatigue.start and fatigue.increment must be numbers >= 1');
    return problems;
  }
  const api = { ALIGNS, validateArt, cleanArt, validateDungeon, newCard, retire, placeholdersOf, validateTexts, validateRules, validateVocabulary, validateGame, validateThemeCss, usageOf, sampleBoard, runSandbox, kindOf, validateCard, knownFrom, CARD_FIELDS };
  if (typeof module !== 'undefined') module.exports = api; else root.EditorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
