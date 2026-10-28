// Exporte toutes les cartes du prototype dans CARTES.md (serviteurs, équipements, lieutenants, donjons).
// À relancer après toute modification de prototype/donnees.js : node outils/exporter-cartes.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
  + '\n({ SERVANTS, EQUIPS, HEROES, DUNGEONS, ARCHETYPES, SPECIES, KW, MAX_LEVEL, MAX_RANK, MAX_BOARD, HAND_MAX, mkServant, skillsOf, skDesc, powersOf });';
const D = vm.runInNewContext(code, { Math, console });
const cell = s => String(s).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');

const servantRow = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null);
  const kw = powers.filter(p => p.fixed).map(p => p.name).join(', ') || '—';
  const sk = powers.filter(p => !p.fixed).map(p => p.text).join(' ; ') || '—';
  return [s.name, s.rank, `${s.atk}/${s.hp}`, s.types[0], s.types[1], kw, sk];
};
const servantHead = ['Nom', 'Rang', 'ATQ/PV', 'Espèce', 'Archétype', 'Mots-clés', 'Pouvoirs'];
const byRank = (a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'fr');

let md = `# Cartes du prototype

Export automatique de \`prototype/donnees.js\` (script \`outils/exporter-cartes.js\`). Toutes les valeurs sont provisoires.

- Serviteurs : ${D.SERVANTS.length} — équipements : ${D.EQUIPS.length} — lieutenants : ${Object.keys(D.HEROES).length} — donjons : ${Object.keys(D.DUNGEONS).length}.
- Niveau de renfort maximum : ${D.MAX_LEVEL} (rang maximum proposé). Les serviteurs de rang ${D.MAX_RANK} ne s'obtiennent que par fusion.
- Plateau : ${D.MAX_BOARD} serviteurs. Main : ${D.HAND_MAX} cartes.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier divin, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre un bonus permanent +N/+N (N = niveau de renfort) et le pouvoir d'un autre survivant (un survivant : son pouvoir ; deux : leurs deux pouvoirs ; plus : deux au hasard). Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par archétype
`;
D.ARCHETYPES.forEach(a => {
  const list = D.SERVANTS.filter(s => s.types.includes(a)).sort(byRank);
  md += `\n### ${a} (${list.length})\n\n${table(servantHead, list.map(servantRow))}\n`;
});
md += `\n## Serviteurs, par espèce\n`;
D.SPECIES.forEach(sp => {
  const list = D.SERVANTS.filter(s => s.types.includes(sp)).sort(byRank);
  md += `\n### ${sp} (${list.length})\n\n${table(servantHead, list.map(servantRow))}\n`;
});
md += `\n## Équipements\n\n${table(['Nom', 'Rang', 'Bonus', 'Type', 'Mot-clé', 'Effet'], [...D.EQUIPS].sort(byRank).map(e => [
  e.name, e.rank, `${e.atk < 0 ? e.atk : "+" + e.atk}/${e.hp < 0 ? e.hp : "+" + e.hp}`, e.type || 'Tous', e.kw ? D.KW[e.kw] : '—',
  e.skill ? D.skDesc(e.skill).replace('à lui-même', 'au porteur') : (e.mod ? e.mod.text : '—')]))}\n`;
md += `\n## Lieutenants\n\n${table(['Nom', 'Types', 'PV', 'Mot-clé', 'Pouvoir'], Object.values(D.HEROES).map(h => [h.name, h.types.join(' / '), h.hp, h.kw ? D.KW[h.kw] : '—', h.power ? D.skDesc(h.power) : '—']))}\n`;
md += `\n## Donjons\n\n${table(['Nom', 'Type', 'Boss', 'PV', 'Pouvoir du Boss'], Object.values(D.DUNGEONS).map(d => [d.name, d.type, d.boss.name, d.boss.hp, d.boss.desc]))}\n`;
fs.writeFileSync(path.join(root, 'CARTES.md'), md);
console.log(`CARTES.md : ${D.SERVANTS.length} serviteurs, ${D.EQUIPS.length} équipements, ${(md.length / 1024).toFixed(0)} Ko`);
