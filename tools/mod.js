// Where the files of a mod are. Atlas Wanderer is a mod like any other: every tool reads the game data through this module, never from a fixed path.
// The mod is chosen by the environment variable AW_MOD, otherwise it is the "default" of data/mods.json.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const registry = () => readJson(path.join(root, 'data', 'mods.json'));
const id = () => process.env.AW_MOD || registry().default;
const dir = (modId = id()) => path.join(root, 'data', 'mods', modId);
const manifest = (modId = id()) => readJson(path.join(dir(modId), 'mod.json'));
// A data file of the mod, by its role in mod.json ("files": servants, equipment, heroes, dungeons, retired, rules, powers…).
// A role may be a section of another file: "game.json#rules" is the key "rules" of game.json (the rules and the strategies live in game.json).
const target = (key, modId = id()) => String(manifest(modId).files[key]).split('#');
const file = (key, modId = id()) => path.join(dir(modId), target(key, modId)[0]);
const section = (key, modId = id()) => target(key, modId)[1] || null;
const read = (key, modId = id()) => { const data = readJson(file(key, modId)), s = section(key, modId); return s ? data[s] : data; };
// Writes a role: the whole file, or only its section (the rest of the file is kept).
const write = (key, data, modId = id()) => {
  const f = file(key, modId), s = section(key, modId), out = s ? { ...readJson(f), [s]: data } : data;
  fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n');
};
// Texts: the engine's own texts (data/i18n) completed by those of the mod, which win.
const coreTextFile = lang => path.join(root, 'data', 'i18n', `${lang}.json`);
const modTextFile = (lang, modId = id()) => path.join(dir(modId), manifest(modId).i18n[lang]);
const texts = (lang, modId = id()) => ({ ...readJson(coreTextFile(lang)), ...readJson(modTextFile(lang, modId)) });
const imagesDir = (modId = id()) => path.join(dir(modId), manifest(modId).images);
const imageIndexFile = (modId = id()) => path.join(dir(modId), manifest(modId).imageIndex);
const rel = p => path.relative(root, p).split(path.sep).join('/');
module.exports = { root, registry, id, dir, manifest, file, section, read, write, texts, coreTextFile, modTextFile, imagesDir, imageIndexFile, rel, readJson };
