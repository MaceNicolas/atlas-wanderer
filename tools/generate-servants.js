// Generates servants.html, lieutenants.html and equipment.html (site/ folder): static pages (no CDN; a small script for the mobile display) that list the cards by archetype and by species (servants also by level).
// Run again after any change to prototype/data.js: node tools/generate-servants.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
require(path.join(dir, 'images.js'));   // list of illustrations (AW_IMAGES, global)
const AWGfx = require(path.join(dir, 'svg.js'));
const code = ['data.js', 'i18n.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript() + '\n({ SERVANTS, ARCHETYPES, SPECIES, mkServant, goldSkill, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, HEROES_RESERVE, EQUIPS });';
const D = vm.runInNewContext(code, { Math, console });
// Display order of the archetypes: grouped by color (blues, greens, reds).
const ARCH = ['pilot', 'explorer', 'diplomat', 'engineer', 'medic', 'roboticist', 'security', 'artillerist', 'intelligence'];
if (ARCH.length !== D.ARCHETYPES.length || D.ARCHETYPES.some(a => !ARCH.includes(a))) throw new Error('ARCH ne correspond plus à ARCHETYPES');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const servantCard = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null), o = { width: '100%', imgBase: '../prototype/images/' };
  // Gold version (fusion of three copies, see resolveFusion): shown next to the card on hover, to read both.
  const g = { ...m, name: `${s.name} doré`, atk: m.atk * 3, hp: m.hp * 3, maxhp: m.maxhp * 3, gold: true, skill: m.skill ? D.goldSkill(m.skill) : null, extra: (m.extra || []).map(D.goldSkill) };
  const gp = D.powersOf(g.kw, D.skillsOf(g), null);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, o)}<div class="doree" aria-hidden="true">${AWGfx.servantCard({ ...g, kwSpent: [], powers: gp }, o)}</div></div>`;
};
const heroCard = h => `<div class="carte">${AWGfx.heroPortrait({ id: h.id, name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' }, { width: '100%', imgBase: '../prototype/images/' })}</div>`;
// Equipment: a single type each (or "All types"), grouped in the same sections as the servants.
const ALL_TYPES = 'Tous types';
const EQUIPS = D.EQUIPS.map(e => ({ ...e, types: [e.type || ALL_TYPES] }));
const equipCard = e => {
  const powers = D.powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.droneA, h: e.mod.droneH } : null);
  powers.forEach(p => { if (!p.fixed) p.text = p.text.replace('à lui-même', 'au porteur'); });   // as in the game (ui.js)
  return `<div class="carte">${AWGfx.equipCard({ ...e, powers }, { width: '100%', imgBase: '../prototype/images/' })}</div>`;
};
// All the lieutenants, including those set aside (HEROES_RESERVE); deduplicated by id.
const HEROES = [...new Map([...Object.values(D.HEROES), ...Object.values(D.HEROES_RESERVE)].map(h => [h.id, h])).values()].map(h => ({ ...h, rank: 0 }));

// One group per type: every servant that carries it, from the lowest rank to the highest.
// Breakdown to the right of the title: for each type of the other family, the number of cards concerned (text only, no logo); zeros are shown, dimmed.
const split = (list, others) => others.map(o => ({ o, n: list.filter(x => x.types.includes(o)).length }))
  .map(x => `<span style="color:${AWGfx.typeColor(x.o)}${x.n ? '' : ';opacity:.5'}">${esc(AWGfx.typeName(x.o))} <b>${x.n}</b></span>`).join('');
const group = (t, prefix, others, all = D.SERVANTS, card = servantCard) => {
  const c = AWGfx.typeColor(t), id = prefix + esc(t).replace(/ /g, '-'), ico = t === ALL_TYPES ? 'equip' : t;
  const list = all.filter(s => s.types.includes(t)).sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, 'fr'));
  return { t, c, id, n: list.length, html: `<section id="${id}" style="border-color:${c}66">
  <h2 style="color:${c}">${AWGfx.icon(ico, { size: 24, color: c })}<span>${esc(t === ALL_TYPES ? t : AWGfx.typeName(t))}</span><span class="ventil">${split(list, others)}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
};
const build = (kind) => {
const LT = kind === 'lieutenants', EQ = kind === 'equipment';
const all = LT ? HEROES : EQ ? EQUIPS : D.SERVANTS, card = LT ? heroCard : EQ ? equipCard : servantCard;
const name = { servants: 'serviteurs', lieutenants: 'lieutenants', equipment: 'équipements' }[kind], Name = { servants: 'Serviteurs', lieutenants: 'Lieutenants', equipment: 'Équipements' }[kind];
const ARCH_SHOWN = LT ? ARCH : EQ ? [...ARCH, ALL_TYPES] : ARCH;
const SP = D.SPECIES;
const archList = ARCH_SHOWN.map(t => group(t, 'archetype-', EQ ? [] : SP, all, card)).filter(g => !EQ || g.n)   // no empty section on the equipment page
  , races = EQ ? [] : SP.map(t => group(t, 'espece-', ARCH_SHOWN, all, card));
// One group per rank (level), sorted by archetype then by name; breakdown by archetype then, on a second line, by species.
const RANK_COLOR = '#f0a53a';
const ranks = LT ? [] : [...new Set(all.map(s => s.rank))].sort((a, b) => a - b).map(r => {
  const list = all.filter(s => s.rank === r).sort((x, y) => ARCH.indexOf(x.types[EQ ? 0 : 1]) - ARCH.indexOf(y.types[EQ ? 0 : 1]) || x.name.localeCompare(y.name, 'fr')), c = RANK_COLOR;
  return { t: 'Niveau ' + r, c, id: 'niveau-' + r, html: `<section id="niveau-${r}" style="border-color:${c}66">
  <h2 style="color:${c}"><span>Niveau ${r}</span><span class="ventil"><span class="ligne">${split(list, [...ARCH, ...(EQ ? [ALL_TYPES] : [])])}</span>${EQ ? '' : `<span class="ligne">${split(list, SP)}</span>`}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
});
const navOf = list => list.map(g => `<a href="#${g.id}" style="color:${g.c};border-color:${g.c}">${g.id.startsWith('niveau') ? '' : AWGfx.icon(g.t === ALL_TYPES ? 'equip' : g.t, { size: 14, color: g.c })}${esc(g.t)}</a>`).join('');

const opt = list => list.map(g => `<option value="${g.id}">${esc(g.t)}</option>`).join('');
const select = `<label class="choix"><select id="choix" aria-label="Afficher un groupe"><optgroup label="Archétypes">${opt(archList)}</optgroup>${EQ ? '' : `<optgroup label="Espèces">${opt(races)}</optgroup>`}${LT ? '' : `<optgroup label="Niveaux">${opt(ranks)}</optgroup>`}</select></label>`;
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
// Servants page: all the servants at once, with a row of filter tools (archetypes, species, levels).
// Several choices in the same filter add up (OR); the three filters combine (AND).
const chip = (kindF, val, label, c, ico) => `<button type="button" class="puce" data-f="${kindF}" data-v="${esc(val)}" style="--c:${c}" aria-pressed="false">${ico || ''}${esc(label)}</button>`;
const ranksList = [...new Set(all.map(x => x.rank))].sort((a, b) => a - b);
const ctrl = '<button type="button" class="reinit" id="reinit">Réinitialiser</button><span class="nb" id="nb"></span>';
const filters = `<div class="filtres">
  <div><b>Archétypes</b>${ARCH.map(a => chip('arch', a, AWGfx.typeName(a), AWGfx.typeColor(a), AWGfx.icon(a, { size: 14, color: AWGfx.typeColor(a) }))).join('')}</div>
  ${EQ ? '' : `<div><b>Espèces</b>${SP.map(a => chip('sp', a, AWGfx.typeName(a), AWGfx.typeColor(a), AWGfx.icon(a, { size: 14, color: AWGfx.typeColor(a) }))).join('')}${LT ? ctrl : ''}</div>`}
  ${LT ? '' : `<div><b>Niveaux</b>${ranksList.map(r => chip('rank', r, 'Niveau ' + r, RANK_COLOR)).join('')}${ctrl}</div>`}
</div>
<div class="cartes grille">${[...all].sort((x, y) => x.rank - y.rank || ARCH_SHOWN.indexOf(x.types[EQ ? 0 : 1]) - ARCH_SHOWN.indexOf(y.types[EQ ? 0 : 1]) || x.name.localeCompare(y.name, 'fr')).map(x => card(x).replace('<div class="carte">', `<div class="carte" data-arch="${esc(x.types.find(t => ARCH_SHOWN.includes(t)) || '')}" data-sp="${esc(x.types.find(t => SP.includes(t)) || '')}" data-rank="${x.rank}">`)).join('\n')}</div>
<script>
(function () {
  var cartes = [].slice.call(document.querySelectorAll('.grille .carte')), puces = [].slice.call(document.querySelectorAll('.puce')), nb = document.getElementById('nb');
  var cle = { arch: 'arch', sp: 'sp', rank: 'rank' };
  function maj() {
    var sel = { arch: [], sp: [], rank: [] };
    puces.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') sel[b.dataset.f].push(b.dataset.v); });
    var n = 0;
    cartes.forEach(function (c) {
      var ok = Object.keys(sel).every(function (k) { return !sel[k].length || sel[k].indexOf(c.dataset[cle[k]]) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    nb.textContent = n + ' / ' + cartes.length + ' ${name}';
  }
  puces.forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); maj(); }); });
  document.getElementById('reinit').addEventListener('click', function () { puces.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); maj(); });
  maj();
})();
</script>`;
const header = `<header class="entete"><div>
  <a class="marque" href="../index.html">Atlas Wanderer</a>
  <input type="checkbox" id="menu" class="menu-case" aria-label="Menu"><label for="menu" class="burger" aria-hidden="true"><span></span></label>
  <nav>
    <a href="../index.html">Présentation</a>
    <a href="rules.html">Règles</a>
    <a href="lieutenants.html"${LT ? ' aria-current="page"' : ''}>Lieutenants</a>
    <a href="servants.html"${kind === 'servants' ? ' aria-current="page"' : ''}>Serviteurs</a>
    <a href="equipment.html"${EQ ? ' aria-current="page"' : ''}>Équipements</a>
    <a href="preview.html">Graphismes</a>
    <a href="tests.html" class="nav-test" hidden>Test</a>
  </nav>
  <a class="bouton plein" href="../prototype/prototype.html">Jouer</a>
</div></header>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – ${Name}</title>
<link rel="stylesheet" href="space.css">
<link rel="stylesheet" href="site.css?v=3">
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
  .carte { width: 176px; flex: none; position: relative; }
  .carte .doree { display: none; }
  /* Souris : au survol, la version dorée passe devant la carte, un peu décalée vers le haut et la droite (vers la gauche près du bord de l'écran). */
  @media (hover: hover) and (pointer: fine) {
    .carte:hover { z-index: 20; }
    .carte:hover .doree { display: block; position: absolute; top: -34px; left: 42%; width: 100%; pointer-events: none; filter: drop-shadow(0 8px 18px rgba(0,0,0,.6)); }
    .carte.gauche:hover .doree { left: auto; right: 42%; }
  }
  .carte svg { display: block; width: 100%; height: auto; }
  .choix, .compteur { display: none; }
  @media (max-width: 1000px) {
    .types, h1 + p, h2.partie { display: none; }
    .choix { display: block; position: sticky; top: 56px; z-index: 5; margin: 12px 0; }
    .choix select { width: 100%; padding: 10px 12px; font-size: 1rem; color: #e5e7eb; background: #0b0f1a; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; }
    section { display: none; padding: 12px 0; margin-bottom: 16px; }
    section.actif { display: block; }
    section h2 { padding: 0 12px; }
    section h2 .ventil { display: none; }
    section h2 .total { margin-left: auto; }
    .compteur { display: block; text-align: center; margin-top: 6px; font-size: .85rem; color: #94a3b8; }
    .cartes { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; padding: 0 12px; scroll-padding: 0 12px; gap: 14px; }
    .cartes::-webkit-scrollbar { display: none; }
    .carte { width: min(72vw, 260px); scroll-snap-align: start; scroll-snap-stop: always; }
  }
  /* Souris (PC) : pas de défilement horizontal, les cartes passent à la ligne dans la section choisie. */
  @media (max-width: 1000px) and (hover: hover) and (pointer: fine) {
    .cartes { flex-wrap: wrap; overflow: visible; scroll-snap-type: none; padding: 0 12px; gap: 12px; }
    .carte { width: 176px; }
  }
  .filtres { position: sticky; top: 56px; z-index: 5; display: flex; flex-direction: column; gap: 6px; padding: 8px; margin: 16px 0 20px; background: #0b0f1a; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; }
  .filtres div { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .filtres b { width: 92px; opacity: .7; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
  .puce { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font: inherit; font-size: .88rem; color: var(--c); background: transparent; border: 1px solid var(--c); border-radius: 8px; padding: 3px 10px; }
  .puce[aria-pressed="true"] { background: color-mix(in srgb, var(--c) 28%, #0b0f1a); color: #fff; box-shadow: 0 0 0 1px var(--c); }
  .reinit { margin-left: auto; cursor: pointer; font: inherit; font-size: .85rem; color: #e5e7eb; background: transparent; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; padding: 3px 10px; }
  .nb { font-size: .85rem; color: #94a3b8; }
  .carte[hidden] { display: none; }
  @media (max-width: 1000px) {
    .filtres b { width: 100%; }
    .reinit { margin-left: 0; }
    .cartes.grille { flex-wrap: wrap; overflow: visible; scroll-snap-type: none; padding: 0; gap: 10px; justify-content: center; }
    .cartes.grille .carte { width: calc(50% - 5px); scroll-snap-align: none; }
  }
</style>
</head>
<body>
<div class="espace"></div>
${header}
<main class="page large">
<h1>${Name}</h1>
<p class="discret">${EQ ? `${all.length} équipements. Filtrez par archétype et par niveau. Plusieurs choix d'un même filtre s'additionnent, les filtres se combinent entre eux.` : LT ? `${all.length} lieutenants. Filtrez par archétype et par espèce : plusieurs choix d'un même filtre s'additionnent, les filtres se combinent entre eux.` : `${all.length} serviteurs. Filtrez par archétype, espèce et niveau : plusieurs choix d'un même filtre s'additionnent, les filtres se combinent entre eux.`}</p>
${filters}
</main>
${kind === 'servants' ? `<script>
// Survol : la carte dorée s'ouvre du côté où il y a de la place.
document.addEventListener('mouseover', function (e) {
  var c = e.target.closest && e.target.closest('.carte'); if (!c || !c.querySelector('.doree')) return;
  c.classList.toggle('gauche', c.getBoundingClientRect().right + c.offsetWidth * 0.42 + 14 > document.documentElement.clientWidth);
});
</script>` : ''}
<script src="link-test.js"></script>
</body>
</html>
`;
const FILE = { servants: 'servants', lieutenants: 'lieutenants', equipment: 'equipment' }[kind];   // name of the page
fs.writeFileSync(path.join(root, 'site', FILE + '.html'), html);
console.log(`${FILE}.html : ${all.length} ${name}, ${(html.length / 1024).toFixed(0)} Ko`);
};
build('servants');
build('lieutenants');
build('equipment');
