// Generates site/hidden-servants.html: the servants a player can never recruit (they are in no offer). They come from the bosses: their permanent servant, the
// predefined board of a boss (strategy of kind "board": Veylor's honor guard, Cyro's Guardians, the DR-1X of DR-1O), and the tokens that powers summon (Drone).
// Everything comes from the data of the mod (servants.json, bosses.json, dungeons.json, strategies of game.json): nothing is written by hand here.
// Run again after any change to these servants or bosses: node tools/generate-hidden-servants.js (also run by tools/generate-all.js)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const MOD = require('./mod');
require(MOD.imageIndexFile());   // list of illustrations of the mod (AW_IMAGES, global)
const IMG = `../${MOD.rel(MOD.imagesDir())}/`;   // illustrations as seen from site/
const AWGfx = require(path.join(dir, 'svg.js'));
const FR = MOD.texts('fr');
AWGfx.setVocabulary(MOD.read('vocabulary')); AWGfx.setScenes(MOD.read('scenes')); AWGfx.setCardLayout((MOD.read('game').ui || {}).cards);
const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript() + '\n({ SERVANTS, BOSSES, DUNGEONS, STRATEGIES, mkServant, skillsOf, powersOf, permanentServant });';
const D = vm.runInNewContext(code, { Math, console });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STRATEGIES = (MOD.read('strategies') || {}).list || {};
const servantById = id => D.SERVANTS.find(s => s.id === id);
const card = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null, [], false, m);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, { width: '100%', imgBase: IMG })}</div>`;
};
// Where a boss appears: the dungeons that list it (fixed, or as a boss linked to a type drawn at random).
const dungeonsOf = bossId => Object.values(D.DUNGEONS).filter(d => d.slots.some(x => x.boss === bossId || (x.from || []).includes(bossId))).map(d => d.name);
const bossLine = b => { const where = dungeonsOf(b.id); return `<h3>${esc(AWGfx.cardName(b))}<small>${where.length ? esc(where.join(', ')) : 'dans aucun donjon pour le moment'}</small></h3>`; };
const used = new Set();   // ids of the cards already shown
const sections = [];

// 1. The predefined boards of the bosses (strategy of kind "board").
const boards = [];
for (const b of Object.values(D.BOSSES)) {
  const st = STRATEGIES[b.strategy];
  if (!st || st.kind !== 'board') continue;
  const ids = [...(st.layout || []).map(x => x.card), ...(st.unit ? [st.unit.card] : [])].filter(Boolean);
  const cards = [...new Set(ids)].map(servantById).filter(Boolean);
  const only = cards.filter(s => s.token), also = cards.filter(s => !s.token);
  only.forEach(s => used.add(s.id));
  let extra = '';
  if (also.length) extra += `<p class="note">Ce plateau compte aussi ${also.map(s => `<b>${esc(AWGfx.cardName(s))}</b>`).join(', ')}, qui se recrute normalement (non montré ici).</p>`;
  if (st.unit && st.unit.powers) extra += `<p class="note">Chacune de ces unités garde une aura parmi ${st.unit.powers.length}, distribuées sans doublon :</p><ul class="note">${st.unit.powers.map(p => `<li>${esc(FR['desc.' + p.desc] || p.desc)}</li>`).join('')}</ul>`;
  if (only.length) boards.push(`<section class="groupe">${bossLine(b)}<p class="note">Plateau prédéfini (${esc(st.unit ? 'une unité en nombre croissant' : 'cartes placées dans l\'ordre')}).</p><div class="cartes">${only.map(card).join('\n')}</div>${extra}</section>`);
}
if (boards.length) sections.push(['plateaux', 'Plateaux prédéfinis des boss', boards]);

// 2. The permanent servants of the bosses. A boss with a name for it (texts card.<boss>.servant) has a card of its own; the others carry their boss's name.
const generic = [], perms = [];
for (const b of Object.values(D.BOSSES)) {
  if (!b.servant) continue;
  const own = b.servantId !== b.id, special = own || b.power || b.strategy;
  if (!special) { generic.push(b); continue; }
  const m = D.permanentServant(b, { id: '' });
  perms.push(`<section class="groupe">${bossLine(b)}<div class="cartes">${card({ ...m, id: m.id, sockets: m.sockets })}</div></section>`);
}
if (perms.length || generic.length) sections.push(['permanents', 'Serviteurs permanents des boss', [...perms, generic.length ? `<p class="note">Les ${generic.length} boss génériques (un par type) ont chacun un serviteur permanent 1/1/3 de leur type, sans pouvoir : ${generic.map(b => esc(AWGfx.cardName(b))).join(', ')}.</p>` : '']]);

// 3. The tokens summoned by powers: those that no boss board uses.
const summoned = D.SERVANTS.filter(s => s.token && !used.has(s.id));
if (summoned.length) sections.push(['invoques', 'Jetons invoqués par des pouvoirs', [`<p class="note">Créés en jeu par des pouvoirs de serviteurs ou d'équipements, jamais proposés à l'achat.</p><div class="cartes">${summoned.map(card).join('\n')}</div>`]]);

const nav = `<nav class="nav-page">${sections.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav>`;
const count = sections.reduce((n, s) => n + (s[2].join('').match(/class="carte"/g) || []).length, 0);
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – Serviteurs hors boutique</title>
<link rel="stylesheet" href="space.css">
<link rel="stylesheet" href="tokens.css?v=4">
<link rel="stylesheet" href="site.css?v=7">
<link rel="stylesheet" href="catalogue.css?v=23">
<link rel="stylesheet" href="dungeons.css?v=1">
<style>
.groupe { margin: 0 0 28px; }
.groupe h3 { margin: 18px 0 8px; font-size: 1.15rem; }
.groupe h3 small { margin-left: 12px; font-weight: 400; opacity: .65; font-size: .8rem; }
.note { margin: 6px 0 10px; opacity: .75; max-width: 70ch; }
ul.note { padding-left: 1.2rem; }
</style>
</head>
<body>
<div class="espace"></div>
${require('./site-header').header('hidden')}
<main class="page large">
<h1>Serviteurs hors boutique</h1>
<p class="intro">Les serviteurs qu'un joueur ne peut jamais recruter : ils n'apparaissent dans aucune offre. Ils viennent des boss (serviteur permanent, plateau prédéfini) ou de pouvoirs qui les invoquent. ${count} cartes.</p>
${nav}
${sections.map(([id, t, parts]) => `<section id="${id}"><h2>${esc(t)}</h2>${parts.join('\n')}</section>`).join('\n')}
</main>
<script src="link-test.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'site', 'hidden-servants.html'), html);
console.log(`hidden-servants.html : ${count} cartes, ${(html.length / 1024).toFixed(0)} Ko`);
