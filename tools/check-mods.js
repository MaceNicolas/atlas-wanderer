// Mods test (spec section 19.3, rule 0): Atlas Wanderer is a mod like any other. Checks the registry and every manifest, then builds a derived mod
// (the base mod with another board size and one card fewer) and plays the engine on it: the rules and the cards must follow the mod, with no change to the code.
// Usage: node tools/check-mods.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const MOD = require('./mod'), core = require('../site/editor-core.js'), SCHEMA = require('../prototype/game-schema.js');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (c, m) => { if (!c) fail(m); };

// 1. registry and manifests
const reg = MOD.registry();
check(Array.isArray(reg.mods) && reg.mods.includes(reg.default), 'data/mods.json: "default" must be one of "mods"');
const ROLES = ['servants', 'equipment', 'heroes', 'dungeons', 'retired', 'rules', 'powers'];
for (const id of reg.mods) {
  const m = MOD.manifest(id);
  check(m.id === id, `${id}: mod.json id is "${m.id}"`);
  check(m.schema === 1, `${id}: unknown schema ${m.schema}`);
  check(m.name && m.name.fr && m.name.en && m.description && m.description.fr && m.description.en, `${id}: name and description are needed in fr and en`);
  for (const role of ROLES) check(m.files[role] && fs.existsSync(MOD.file(role, id)), `${id}: file "${role}" is missing`);
  for (const l of ['fr', 'en']) check(m.i18n[l] && fs.existsSync(MOD.modTextFile(l, id)), `${id}: texts "${l}" are missing`);
  check(fs.existsSync(MOD.imagesDir(id)) && fs.existsSync(MOD.imageIndexFile(id)), `${id}: illustrations or their index are missing`);
  // The description of the game and the theme (flux-de-jeu.md): every name is one the engine knows, every reference exists.
  const game = MOD.read('game', id), ctx = { schema: SCHEMA, files: m.files, rules: MOD.read('rules', id), texts: MOD.texts('fr', id) };
  const bad = core.validateGame(game, ctx);
  check(!bad.length, `${id}: game.json is invalid:\n  ${bad.join('\n  ')}`);
  const css = fs.readFileSync(path.join(MOD.dir(id), game.ui.theme.css), 'utf8'), badCss = core.validateThemeCss(css, SCHEMA);
  check(!badCss.length, `${id}: ${badCss.join(' / ')}`);
  // Every active power of a hero is one the description declares.
  for (const [hid, h] of Object.entries(MOD.read('heroes', id).cards)) if (h.power && h.power.t === 'active') check(game.heroActions && game.heroActions[h.power.fx], `${id}: hero ${hid} has the active power "${h.power.fx}", missing from heroActions`);
  for (const [hid, h] of Object.entries(MOD.read('heroes', id).cards)) if (h.power && h.power.fx && game.promises && game.promises[h.power.fx]) check(h.power.t === game.promises[h.power.fx].on, `${id}: hero ${hid}: the power ${h.power.fx} promises a card on "${game.promises[h.power.fx].on}" but has the trigger ${h.power.t}`);
  // Every kind of summoned unit that a power names exists in the description.
  { const kinds = Object.keys(game.tokens || {}).filter(k => k !== 'note'), seen = [];
    (function walk(o, where) { if (Array.isArray(o)) o.forEach(x => walk(x, where)); else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if ((k === 'token' || k === 'tokenIs') && typeof v === 'string') seen.push([where, v]); else walk(v, where); } } })(MOD.read('powers', id), 'powers');
    for (const [where, kind] of seen) check(kinds.includes(kind), `${id}: ${where} names the unit kind "${kind}", missing from tokens`); }
  // The texts that powers name for items they create exist.
  { const fr = MOD.texts('fr', id); (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'nameKey') check(v in fr, `${id}: the text "${v}" (nameKey) is missing`); else walk(v); } })(MOD.read('powers', id)); }
  // Every cue a power notes is an event whose animation the mod chooses.
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'cue' && typeof v === 'string') check(SCHEMA.events.includes(v) && game.ui.animations[v], `${id}: a power notes the cue "${v}" with no animation chosen in ui.animations`); else walk(v); } })(MOD.read('powers', id));
  // Every bag a power template draws from exists in the description.
  for (const [fx, tpl] of Object.entries(MOD.read('powers', id))) for (const r of tpl.reactions || []) for (const e of r.then || []) if (e.action === 'drawBag') check(game.bags && game.bags[e.bag] && e.bag !== 'note', `${id}: the power ${fx} draws from the bag "${e.bag}", missing from bags`);
  // The validators must refuse mistakes.
  const broken = (mut) => { const g = JSON.parse(JSON.stringify(game)); mut(g); return core.validateGame(g, ctx).length > 0; };
  check(broken(g => { g.actions.buyServant.effects[0].choice = 'nope'; }), 'an unknown choice is not refused');
  check(broken(g => { g.actions.buyServant.effects[0].action = 'hack'; }), 'an unknown effect is not refused');
  check(broken(g => { g.flow.phases.room.end[0].go = 'nowhere'; }), 'an unknown phase is not refused');
  check(broken(g => { g.ui.screens.room.panels[0].widget = 'html'; }), 'an unknown widget is not refused');
  check(broken(g => { g.actions.buyLevel.when[0].resource = 'gold'; }), 'an unknown resource in a condition is not refused');
  check(broken(g => { g.state.zones.board.max = 'game.nothing'; }), 'a reference to nothing is not refused');
  check(broken(g => { g.flow.phases.room.end.pop(); }), 'a last transition with a condition is not refused');
  check(broken(g => { g.tokens.drone.rank = 0; }), 'a unit kind without a rank is not refused');
  check(broken(g => { g.bags.datacube.faces.pop(); }), 'a diceRoll with five faces is not refused');
  check(broken(g => { g.bags.datacube.effect.resource = 'gold'; }), 'a bag acting on an unknown resource is not refused');
  check(broken(g => { g.heroActions.grantRebirth.effect.action = 'hack'; }), 'an unknown hero effect is not refused');
  check(broken(g => { g.heroActions.grantRebirth.targets.where.push({ nope: 1 }); }), 'an unknown target test is not refused');
  for (const hostile of ['body { color: red; }', ':root { --a: url(http://x/y.png); }', '@import "x.css";', ':root { color: red; }', ':root { --a: 1; } .x { --b: 2; }', ':root { --a: 1\\; }'])
    check(core.validateThemeCss(hostile, SCHEMA).length > 0, `theme.css not refused: ${hostile}`);
}

// 2. a derived mod drives the engine
const build = () => {
  const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(MOD.root, 'prototype', f), 'utf8')).join('\n') + require('./engine-data').installScript()
    + '\n;({ MAX_BOARD, HAND_MAX, SERVANTS, RULES, levelCost })';
  return vm.runInNewContext(code, { Math, console });
};
const base = build();
const tmp = path.join(MOD.root, 'data', 'mods', '_check');
try {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.cpSync(MOD.dir(reg.default), tmp, { recursive: true, filter: s => !s.includes(`${path.sep}images${path.sep}`) && !s.endsWith(`${path.sep}images`) });
  const mf = MOD.readJson(path.join(tmp, 'mod.json')); mf.id = '_check'; fs.writeFileSync(path.join(tmp, 'mod.json'), JSON.stringify(mf));
  const rules = MOD.readJson(path.join(tmp, 'rules.json')); rules.game.maxBoard = 5; rules.game.levelCostOffset = 4; rules.sockets.max = 2;
  fs.writeFileSync(path.join(tmp, 'rules.json'), JSON.stringify(rules));
  const sv = MOD.readJson(path.join(tmp, 'servants.json')); delete sv.cards[Object.keys(sv.cards)[0]];
  fs.writeFileSync(path.join(tmp, 'servants.json'), JSON.stringify(sv));
  process.env.AW_MOD = '_check';
  const derived = build();
  check(derived.MAX_BOARD === 5 && base.MAX_BOARD === 7, `the board size must follow the mod (${derived.MAX_BOARD} / ${base.MAX_BOARD})`);
  check(derived.levelCost(1) === 5 && base.levelCost(1) === 3, 'the level price must follow the mod');
  check(derived.SERVANTS.length === base.SERVANTS.length - 1, 'the cards must follow the mod');
  check(derived.RULES.sockets.max === 2, 'the socket rules must follow the mod');
} finally { delete process.env.AW_MOD; fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`✓ mods: ${reg.mods.length} mod(s) valid (${reg.mods.join(', ')}); a derived mod changes the board size, prices, sockets and cards without any change to the engine.`);
