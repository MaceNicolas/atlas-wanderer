// Exports every prototype card to documentation/cartes.md (servants, equipment, heroes, dungeons).
// Run again after any change to prototype/data.js: node tools/export-cards.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const code = ['data.js', 'i18n.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript()
  + '\n({ SERVANTS, EQUIPS, HEROES, DUNGEONS, ASSIGNMENTS, SPECIES, KW, MAX_LEVEL, MAX_RANK, MAX_BOARD, RULES, HAND_MAX, mkServant, skillsOf, skDesc, powersOf, typeName });';
const D = vm.runInNewContext(code, { Math, console });
const cell = s => String(s).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');

const COLOR_FR = { blue: 'bleue', green: 'verte', red: 'rouge', chroma: 'chromatique' };
const servantRow = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null);
  const kw = powers.filter(p => p.fixed).map(p => p.name).join(', ') || '—';
  const sk = powers.filter(p => !p.fixed).map(p => p.text).join(' ; ') || '—';
  return [s.name, s.rank, `${s.atk}/${s.hp}`, D.typeName(s.types[0]), D.typeName(s.types[1]), (s.sockets || []).map(c => COLOR_FR[c]).join(', ') || '—', kw, sk];
};
const servantHead = ['Nom', 'Rang', 'ATQ/PV', 'Espèce', 'Affectation', 'Châsses', 'Mots-clés', 'Pouvoirs'];
const byRank = (a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'fr');

let md = `# Cartes du prototype

Export automatique de \`prototype/data.js\` (script \`tools/export-cards.js\`). Toutes les valeurs sont provisoires.

- Serviteurs : ${D.SERVANTS.length} — équipements : ${D.EQUIPS.length} — héros : ${Object.keys(D.HEROES).length} — donjons : ${Object.keys(D.DUNGEONS).length}.
- Niveau de renfort maximum : ${D.MAX_LEVEL} (rang maximum proposé). Les serviteurs de rang ${D.MAX_RANK} ne s'obtiennent que par fusion.
- Plateau : ${D.MAX_BOARD} serviteurs. Main : ${D.HAND_MAX} cartes.
- **Châsses** : un serviteur a de 0 à ${D.RULES.sockets.max} châsses (bleue, verte, rouge ou chromatique, qui accepte toutes les couleurs). Un équipement a une couleur et ne se pose que dans une châsse libre de la même couleur ou chromatique.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre deux options : un bonus permanent de +N PV ou +N ATQ tiré au hasard (N = niveau de renfort), ou un pouvoir tiré au hasard parmi ceux des autres survivants. Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par affectation
`;
D.ASSIGNMENTS.forEach(a => {
  const list = D.SERVANTS.filter(s => s.types.includes(a)).sort(byRank);
  md += `\n### ${D.typeName(a)} (${list.length})\n\n${table(servantHead, list.map(servantRow))}\n`;
});
md += `\n## Serviteurs, par espèce\n`;
D.SPECIES.forEach(sp => {
  const list = D.SERVANTS.filter(s => s.types.includes(sp)).sort(byRank);
  md += `\n### ${D.typeName(sp)} (${list.length})\n\n${table(servantHead, list.map(servantRow))}\n`;
});
md += `\n## Équipements\n\n${table(['Nom', 'Rang', 'Type', 'Couleur', 'Mot-clé', 'Effet'], [...D.EQUIPS].sort(byRank).map(e => [
  e.name, e.rank, e.type ? D.typeName(e.type) : 'Tous', { blue: 'bleu', green: 'vert', red: 'rouge' }[e.color] || '—', e.kw ? D.KW[e.kw] : '—',
  e.skill ? [].concat(e.skill).map(k => D.skDesc(k, true)).join(' ; ') : (e.mod ? e.mod.text : '—')]))}\n`;
md += `\n## Héros\n\n${table(['Nom', 'Types', 'PV', 'Mot-clé', 'Pouvoir'], Object.values(D.HEROES).map(h => [h.name, h.types.map(D.typeName).join(' / '), h.hp, h.kw ? D.KW[h.kw] : '—', h.power ? D.skDesc(h.power) : '—']))}\n`;
md += `\n## Donjons\n\n${table(['Nom', 'Type', 'Boss', 'PV', 'Pouvoir du Boss'], Object.values(D.DUNGEONS).map(d => [d.name, D.typeName(d.type), d.boss.name, d.boss.hp, d.boss.desc]))}\n`;
fs.writeFileSync(path.join(root, 'documentation', 'cartes.md'), md);
console.log(`documentation/cartes.md : ${D.SERVANTS.length} serviteurs, ${D.EQUIPS.length} équipements, ${(md.length / 1024).toFixed(0)} Ko`);
