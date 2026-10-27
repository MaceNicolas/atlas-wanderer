// Écrit prototype/images.js : la liste des illustrations présentes dans prototype/images/<catégorie>/.
// Convention : le nom du fichier est celui de la carte en minuscules, sans accents, avec des tirets (« Chirurgien de bord » → chirurgien-de-bord.webp).
// À relancer après chaque ajout d'image : node outils/indexer-images.js
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'prototype', 'images'), ok = /\.(webp|png|jpe?g)$/i, out = {};
if (fs.existsSync(dir)) fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => {
  out[d.name] = {};
  fs.readdirSync(path.join(dir, d.name)).filter(f => ok.test(f)).sort().forEach(f => { out[d.name][f.replace(ok, '')] = path.extname(f).slice(1).toLowerCase(); });
});
fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'images.js'),
  '// Généré par outils/indexer-images.js : ne pas modifier à la main.\n(function (root) { root.AW_IMAGES = ' + JSON.stringify(out) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n');
console.log('images.js : ' + Object.entries(out).map(([k, v]) => `${Object.keys(v).length} ${k}`).join(', '));
