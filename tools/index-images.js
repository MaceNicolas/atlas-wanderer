// Writes prototype/images.js: the list of illustrations present in prototype/images/<category>/.
// The reserve/ folder (illustrations kept for future cards) is not indexed.
// Convention: the file name is the card's identifier (UUID), defined in IDENTIFIERS (prototype/data.js); renaming a card therefore does not touch the file.
// Also lists the framing (art) of the cards, read from the data files. Run again after each image added or framing changed: node tools/index-images.js (the editor's local server calls build() itself)
'use strict';
const fs = require('fs'), path = require('path');
const mod = require('./mod'), dir = mod.imagesDir(), ok = /\.(webp|png|jpe?g)$/i;
function build() {
const out = {};
if (fs.existsSync(dir)) fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'reserve').forEach(d => {
  out[d.name] = {};
  fs.readdirSync(path.join(dir, d.name)).filter(f => ok.test(f)).sort().forEach(f => { out[d.name][f.replace(ok, '')] = path.extname(f).slice(1).toLowerCase(); });
});
// Framing of the illustrations: the "art" field of the cards (data/<category>.json), only for the cards that have a picture and a non-default framing.
const art = {};
for (const cat of Object.keys(out)) {
  if (!(cat in mod.manifest().files)) continue;
  const file = mod.file(cat);
  if (!fs.existsSync(file)) continue;
  art[cat] = {};
  for (const [id, card] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')).cards)) if (card.art && out[cat][id]) art[cat][id] = card.art;
}
fs.writeFileSync(mod.imageIndexFile(),
  '// Généré par tools/index-images.js : ne pas modifier à la main.\n(function (root) { root.AW_IMAGES = ' + JSON.stringify(out) + '; root.AW_ART = ' + JSON.stringify(art) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n');
return 'images.js : ' + Object.entries(out).map(([k, v]) => `${Object.keys(v).length} ${k}`).join(', ');
}
if (require.main === module) console.log(build()); else module.exports = { build };
