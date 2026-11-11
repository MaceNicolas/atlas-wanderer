// Mods test (spec section 19.3, rule 0): Atlas Wanderer is a mod like any other. Checks the registry and every manifest, then builds a derived mod
// (the base mod with another board size and one card fewer) and plays the engine on it: the rules and the cards must follow the mod, with no change to the code.
// Usage: node tools/check-mods.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const MOD = require('./mod');
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
}

// 2. a derived mod drives the engine
const build = () => {
  const code = ['data.js', 'i18n.js', 'powers.js', 'engine.js'].map(f => fs.readFileSync(path.join(MOD.root, 'prototype', f), 'utf8')).join('\n') + require('./engine-data').installScript()
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
