// Writes the generated part of data/i18n/fr.json: the French names of the types and of the keywords (they still live in prototype/data.js: TYPE_NAMES, KW).
// Everything else (card and boss names, descriptions, log texts, interface) is written by hand in fr.json and kept as it is.
// Usage: node tools/export-i18n.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8');
const X = vm.runInNewContext(src + '\n;({ SPECIES, ASSIGNMENTS, KW, TYPE_NAMES })', { Math, console });
const target = path.join(root, 'data', 'i18n', 'fr.json');
const GENERATED = /^(type|keyword)\./, HAND_WRITTEN = new Set(['keyword.adapt']);   // keys under a generated prefix that nobody generates
const out = {};
for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(target, 'utf8')))) if (!GENERATED.test(k) || HAND_WRITTEN.has(k)) out[k] = v;
for (const t of [...X.SPECIES, ...X.ASSIGNMENTS]) out[`type.${t}`] = X.TYPE_NAMES[t];
for (const [id, name] of Object.entries(X.KW)) out[`keyword.${id}`] = name;
fs.writeFileSync(target, JSON.stringify(out, null, 1) + '\n');
console.log(`data/i18n/fr.json : ${Object.keys(out).length} entries`);
