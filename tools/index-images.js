// Writes prototype/images.js: the list of illustrations present in prototype/images/<category>/.
// The reserve/ folder (illustrations kept for future cards) is not indexed.
// Convention: the file name is the card's identifier (UUID), defined in IDENTIFIERS (prototype/data.js); renaming a card therefore does not touch the file.
// Run again after each image added: node tools/index-images.js
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype', 'images'), ok = /\.(webp|png|jpe?g)$/i, out = {};
if (fs.existsSync(dir)) fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'reserve').forEach(d => {
  out[d.name] = {};
  fs.readdirSync(path.join(dir, d.name)).filter(f => ok.test(f)).sort().forEach(f => { out[d.name][f.replace(ok, '')] = path.extname(f).slice(1).toLowerCase(); });
});
fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'images.js'),
  '// Généré par tools/index-images.js : ne pas modifier à la main.\n(function (root) { root.AW_IMAGES = ' + JSON.stringify(out) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n');
console.log('images.js : ' + Object.entries(out).map(([k, v]) => `${Object.keys(v).length} ${k}`).join(', '));
