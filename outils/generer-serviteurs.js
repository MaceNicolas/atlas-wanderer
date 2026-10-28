// Génère serviteurs.html, lieutenants.html et equipements.html (racine) : pages statiques (aucun CDN ; un petit script pour l'affichage mobile) qui listent les cartes par archétype et par espèce (les serviteurs aussi par niveau).
// À relancer après toute modification de prototype/donnees.js : node outils/generer-serviteurs.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
require(path.join(dir, 'images.js'));   // liste des illustrations (AW_IMAGES, globale)
const AWGfx = require(path.join(dir, 'svg.js'));
const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n({ SERVANTS, ARCHETYPES, SPECIES, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, HEROES_RESERVE, EQUIPS });';
const D = vm.runInNewContext(code, { Math, console });
// Ordre d'affichage des archétypes : regroupés par couleur (bleus, verts, rouges).
const ARCH = ['Pilote', 'Explorateur', 'Diplomate', 'Ingénieur', 'Médecin', 'Roboticien', 'Sécurité', 'Artilleur', 'Renseignement'];
if (ARCH.length !== D.ARCHETYPES.length || D.ARCHETYPES.some(a => !ARCH.includes(a))) throw new Error('ARCH ne correspond plus à ARCHETYPES');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const servantCard = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, { width: '100%', imgBase: 'prototype/images/' })}</div>`;
};
const heroCard = h => `<div class="carte">${AWGfx.heroPortrait({ name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' }, { width: '100%', imgBase: 'prototype/images/' })}</div>`;
// Équipements : un seul type chacun (ou « Tous types »), regroupés dans les mêmes sections que les serviteurs.
const ALL_TYPES = 'Tous types';
const EQUIPS = D.EQUIPS.map(e => ({ ...e, types: [e.type || ALL_TYPES] }));
const equipCard = e => {
  const powers = D.powersOf(e.kw ? [e.kw] : [], e.skill ? [{ ...e.skill }] : [], e.mod ? { a: e.mod.droneA, h: e.mod.droneH } : null);
  powers.forEach(p => { if (!p.fixed) p.text = p.text.replace('à lui-même', 'au porteur'); });   // comme dans le jeu (interface.js)
  return `<div class="carte">${AWGfx.equipCard({ ...e, powers }, { width: '100%', imgBase: 'prototype/images/' })}</div>`;
};
// Tous les lieutenants, y compris ceux mis de côté (HEROES_RESERVE) ; dédoublonnés par id.
const HEROES = [...new Map([...Object.values(D.HEROES), ...Object.values(D.HEROES_RESERVE)].map(h => [h.id, h])).values()].map(h => ({ ...h, rank: 0 }));

// Un groupe par type : tous les serviteurs qui le portent, du rang le plus bas au plus haut.
// Ventilation à droite du titre : pour chaque type de l'autre famille, le nombre de cartes concernées (texte seul, sans logo) ; les zéros sont affichés, atténués.
const split = (list, others) => others.map(o => ({ o, n: list.filter(x => x.types.includes(o)).length }))
  .map(x => `<span style="color:${AWGfx.typeColor(x.o)}${x.n ? '' : ';opacity:.5'}">${esc(x.o)} <b>${x.n}</b></span>`).join('');
const group = (t, prefix, others, all = D.SERVANTS, card = servantCard) => {
  const c = AWGfx.typeColor(t), id = prefix + esc(t).replace(/ /g, '-'), ico = t === ALL_TYPES ? 'equip' : t;
  const list = all.filter(s => s.types.includes(t)).sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, 'fr'));
  return { t, c, id, n: list.length, html: `<section id="${id}" style="border-color:${c}66">
  <h2 style="color:${c}">${AWGfx.icon(ico, { size: 24, color: c })}<span>${esc(t)}</span><span class="ventil">${split(list, others)}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
};
const build = (kind) => {
const LT = kind === 'lieutenants', EQ = kind === 'equipements';
const all = LT ? HEROES : EQ ? EQUIPS : D.SERVANTS, card = LT ? heroCard : EQ ? equipCard : servantCard;
const nom = { serviteurs: 'serviteurs', lieutenants: 'lieutenants', equipements: 'équipements' }[kind], Nom = { serviteurs: 'Serviteurs', lieutenants: 'Lieutenants', equipements: 'Équipements' }[kind];
// Xénobiologiste : archétype réservé aux lieutenants (absent de ARCHETYPES), donc affiché sur la page des lieutenants seulement.
const ARCH_SHOWN = LT ? [...ARCH, 'Xénobiologiste'] : EQ ? [...ARCH, ALL_TYPES] : ARCH;
const archs = ARCH_SHOWN.map(t => group(t, 'archetype-', EQ ? [] : D.SPECIES, all, card)).filter(g => !EQ || g.n)   // pas de section vide sur la page des équipements
  , races = EQ ? [] : D.SPECIES.map(t => group(t, 'espece-', ARCH_SHOWN, all, card));
// Un groupe par rang (niveau), trié par archétype puis par nom ; ventilation par archétype puis, sur une seconde ligne, par espèce.
const RANK_COLOR = '#f0a53a';
const ranks = LT ? [] : [...new Set(all.map(s => s.rank))].sort((a, b) => a - b).map(r => {
  const list = all.filter(s => s.rank === r).sort((x, y) => ARCH.indexOf(x.types[EQ ? 0 : 1]) - ARCH.indexOf(y.types[EQ ? 0 : 1]) || x.name.localeCompare(y.name, 'fr')), c = RANK_COLOR;
  return { t: 'Niveau ' + r, c, id: 'niveau-' + r, html: `<section id="niveau-${r}" style="border-color:${c}66">
  <h2 style="color:${c}"><span>Niveau ${r}</span><span class="ventil"><span class="ligne">${split(list, [...ARCH, ...(EQ ? [ALL_TYPES] : [])])}</span>${EQ ? '' : `<span class="ligne">${split(list, D.SPECIES)}</span>`}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
});
const navOf = list => list.map(g => `<a href="#${g.id}" style="color:${g.c};border-color:${g.c}">${g.id.startsWith('niveau') ? '' : AWGfx.icon(g.t === ALL_TYPES ? 'equip' : g.t, { size: 14, color: g.c })}${esc(g.t)}</a>`).join('');

const opt = list => list.map(g => `<option value="${g.id}">${esc(g.t)}</option>`).join('');
const select = `<label class="choix"><select id="choix" aria-label="Afficher un groupe"><optgroup label="Archétypes">${opt(archs)}</optgroup>${EQ ? '' : `<optgroup label="Espèces">${opt(races)}</optgroup>`}${LT ? '' : `<optgroup label="Niveaux">${opt(ranks)}</optgroup>`}</select></label>`;
const script = `<script>
// Mobile : un seul groupe affiché à la fois (choisi dans la liste), cartes en swipe avec compteur.
(function () {
  var sel = document.getElementById('choix'), secs = [].slice.call(document.querySelectorAll('section'));
  secs.forEach(function (s) {
    var rail = s.querySelector('.cartes'), n = rail.children.length, c = document.createElement('div');
    c.className = 'compteur'; s.appendChild(c);
    var maj = function () { var w = (rail.children[0] ? rail.children[0].offsetWidth : 0) + 14; c.textContent = (Math.min(n, Math.round(rail.scrollLeft / w) + 1)) + ' / ' + n; };
    rail.addEventListener('scroll', maj); s.maj = maj;
  });
  function montre(id) {
    if (!document.getElementById(id)) id = secs[0].id;
    secs.forEach(function (s) { var on = s.id === id; s.classList.toggle('actif', on); if (on) { s.querySelector('.cartes').scrollLeft = 0; s.maj(); } });
    sel.value = id;
  }
  sel.addEventListener('change', function () { history.replaceState(null, '', '#' + sel.value); montre(sel.value); });
  window.addEventListener('hashchange', function () { montre(location.hash.slice(1)); });
  montre(location.hash.slice(1));
})();
</script>`;
const header = `<header class="entete"><div>
  <a class="marque" href="index.html">Atlas Wanderer</a>
  <input type="checkbox" id="menu" class="menu-case" aria-label="Menu"><label for="menu" class="burger" aria-hidden="true"><span></span></label>
  <nav>
    <a href="index.html">Présentation</a>
    <a href="regles.html">Règles</a>
    <a href="lieutenants.html"${LT ? ' aria-current="page"' : ''}>Lieutenants</a>
    <a href="serviteurs.html"${kind === 'serviteurs' ? ' aria-current="page"' : ''}>Serviteurs</a>
    <a href="equipements.html"${EQ ? ' aria-current="page"' : ''}>Équipements</a>
    <a href="apercu.html">Graphismes</a>
  </nav>
  <a class="bouton plein" href="prototype/prototype.html">Jouer</a>
</div></header>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – ${Nom}</title>
<link rel="stylesheet" href="espace.css">
<link rel="stylesheet" href="site.css?v=2">
<style>
  .types { position: sticky; top: 56px; z-index: 5; display: flex; flex-direction: column; gap: 6px; padding: 8px; margin: 16px 0 20px; background: #0b0f1a; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; }
  .types div { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
  .types a { display: inline-flex; align-items: center; gap: 4px; border: 1px solid; border-radius: 8px; padding: 3px 10px; text-decoration: none; font-size: .9rem; }
  .types b { align-self: center; opacity: .7; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
  section { border: 2px solid; border-radius: 16px; padding: 16px; margin-bottom: 28px; background: rgba(0,0,0,.35); scroll-margin-top: 110px; }
  section h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; border: 0; padding: 0; font-size: 1.25rem; }
  section h2 .total { font-size: .85rem; font-weight: 800; color: #e5e7eb; }
  section h2 .ventil { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 14px; font-size: .85rem; font-weight: 600; }
  section h2 .ventil:has(.ligne) { flex-direction: column; align-items: flex-end; gap: 4px; }
  section h2 .ligne { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 14px; }
  section h2 .ventil b { color: #e5e7eb; }
  .page h2.partie { font-size: 1.6rem; margin: 32px 0 14px; scroll-margin-top: 110px; }
  .cartes { display: flex; flex-wrap: wrap; gap: 12px; }
  .carte { width: 176px; flex: none; }
  .carte svg { display: block; width: 100%; height: auto; }
  .choix, .compteur { display: none; }
  @media (max-width: 720px) {
    .types, h1 + p, h2.partie { display: none; }
    .choix { display: block; position: sticky; top: 56px; z-index: 5; margin: 12px 0; }
    .choix select { width: 100%; padding: 10px 12px; font-size: 1rem; color: #e5e7eb; background: #0b0f1a; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; }
    section { display: none; padding: 12px 0; margin-bottom: 16px; }
    section.actif { display: block; }
    section h2 { padding: 0 12px; }
    section h2 .ventil { display: none; }
    section h2 .total { margin-left: auto; }
    .compteur { display: block; text-align: center; margin-top: 6px; font-size: .85rem; color: #94a3b8; }
    .cartes { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; padding: 0 calc((100% - min(72vw, 260px)) / 2); gap: 14px; }
    .cartes::-webkit-scrollbar { display: none; }
    .carte { width: min(72vw, 260px); scroll-snap-align: center; scroll-snap-stop: always; }
  }
</style>
</head>
<body>
<div class="espace"></div>
${header}
<main class="page large">
<h1>${Nom}</h1>
<p class="discret">${EQ ? `${all.length} équipements, classés par archétype puis par niveau. Un équipement apparaît dans chacune des deux listes ; ceux sans archétype vont avec « Tous types ».` : LT ? `${all.length} lieutenants, classés par archétype puis par espèce. Un lieutenant apparaît dans chacune des deux listes.` : `${all.length} serviteurs, classés par archétype, par espèce puis par niveau. Un serviteur apparaît dans chacune des trois listes.`}</p>
<nav class="types"><div><b>Archétypes</b>${navOf(archs)}</div>${EQ ? '' : `<div><b>Espèces</b>${navOf(races)}</div>`}${LT ? '' : `<div><b>Niveaux</b>${navOf(ranks)}</div>`}</nav>
${select}
<h2 class="partie" id="archetypes">Par archétype</h2>
${archs.map(g => g.html).join('\n')}
${EQ ? '' : `<h2 class="partie" id="especes">Par espèce</h2>\n${races.map(g => g.html).join('\n')}`}
${LT ? '' : `<h2 class="partie" id="niveaux">Par niveau</h2>\n${ranks.map(g => g.html).join('\n')}`}
</main>
${script}
</body>
</html>
`;
fs.writeFileSync(path.join(root, kind + '.html'), html);
console.log(`${kind}.html : ${all.length} ${nom}, ${(html.length / 1024).toFixed(0)} Ko`);
};
build('serviteurs');
build('lieutenants');
build('equipements');
