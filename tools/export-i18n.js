// Writes data/i18n/fr.json (French display names of cards, types, keywords and bosses) from the game data, keeping the hand-written keys.
// Temporary source: prototype/data.js. When the data files move to data/*.json, fr.json becomes the source and this script goes away.
// Usage: node tools/export-i18n.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8');
const X = vm.runInNewContext(src + '\n;({ IDENTIFIERS, DUNGEONS, SPECIES, ARCHETYPES, KW, TYPE_NAMES })', { Math, console });
const out = {};
for (const [cat, key] of [['servants', 'card'], ['equipment', 'card'], ['lieutenants', 'card'], ['dungeons', 'card']])
  for (const [id, name] of Object.entries(X.IDENTIFIERS[cat])) out[`${key}.${id}`] = name;
for (const d of Object.values(X.DUNGEONS)) out[`boss.${d.id}`] = d.boss.name;
for (const t of [...X.SPECIES, ...X.ARCHETYPES]) out[`type.${t}`] = X.TYPE_NAMES[t];
for (const [id, name] of Object.entries(X.KW)) out[`keyword.${id}`] = name;
// Hand-written keys (combat log "log.*", interface "ui.*") live in the same file and are kept as they are; only the generated names are rewritten.
const target = path.join(root, 'data', 'i18n', 'fr.json');
const GENERATED = /^(card|boss|type|keyword)\./;
const HAND_WRITTEN = new Set(['keyword.adapt']);   // keys under a generated prefix that nobody generates
if (fs.existsSync(target)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(target, 'utf8')))) if (!GENERATED.test(k) || HAND_WRITTEN.has(k)) out[k] = v;
fs.mkdirSync(path.join(root, 'data', 'i18n'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'i18n', 'fr.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`data/i18n/fr.json : ${Object.keys(out).length} entries`);
