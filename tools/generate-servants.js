// Generates servants.html, heroes.html and equipment.html (site/ folder): static pages (no CDN; a small script for the mobile display) that list the cards by assignment and by species (servants also by level).
// Run again after any change to prototype/data.js: node tools/generate-servants.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const MOD = require('./mod');
require(MOD.imageIndexFile());   // list of illustrations of the mod (AW_IMAGES, global)
const IMG = `../${MOD.rel(MOD.imagesDir())}/`;   // illustrations as seen from site/
const AWGfx = require(path.join(dir, 'svg.js'));
AWGfx.setVocabulary(MOD.read('vocabulary'));   // types, colors, emblems and keywords of the mod
const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript() + '\n({ SERVANTS, typesOfGroup, mkServant, goldSkill, goldName, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, HEROES_RESERVE, EQUIPS });';
const D = vm.runInNewContext(code, { Math, console });
// Display order of the assignments: grouped by family (color), as the vocabulary of the mod lists them.
const VOC = MOD.read('vocabulary'), families = Object.keys(VOC.families);
const ASSIGN = D.typesOfGroup('assignment').slice().sort((a, b) => families.indexOf(VOC.types[a].family) - families.indexOf(VOC.types[b].family));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const servantCard = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null), o = { width: '100%', imgBase: IMG };
  // Gold version (fusion of three copies, see resolveFusion): shown next to the card on hover, to read both.
  const g = { ...m, name: D.goldName(s.name), baseName: s.name, atk: m.atk * 3, hp: m.hp * 3, maxhp: m.maxhp * 3, gold: true, skill: m.skill ? D.goldSkill(m.skill) : null, extra: (m.extra || []).map(D.goldSkill) };
  const gp = D.powersOf(g.kw, D.skillsOf(g), null);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, o)}<div class="doree" aria-hidden="true">${AWGfx.servantCard({ ...g, kwSpent: [], powers: gp }, o)}</div></div>`;
};
const heroCard = h => `<div class="carte">${AWGfx.heroPortrait({ id: h.id, name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' }, { width: '100%', imgBase: IMG })}</div>`;
// Equipment: a single type each (or "All types"), grouped in the same sections as the servants.
const ALL_TYPES = 'Tous types';
const EQUIPS = D.EQUIPS.map(e => ({ ...e, types: [e.type || ALL_TYPES] }));
const equipCard = e => {
  const powers = D.powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true);
  return `<div class="carte">${AWGfx.equipCard({ ...e, powers }, { width: '100%', imgBase: IMG })}</div>`;
};
// All the heroes, including those set aside (HEROES_RESERVE); deduplicated by id.
const HEROES = [...new Map([...Object.values(D.HEROES), ...Object.values(D.HEROES_RESERVE)].map(h => [h.id, h])).values()].map(h => ({ ...h, rank: 0 }));

// One group per type: every servant that carries it, from the lowest rank to the highest.
// Breakdown to the right of the title: for each type of the other family, the number of cards concerned (text only, no logo); zeros are shown, dimmed.
const split = (list, others) => others.map(o => ({ o, n: list.filter(x => x.types.includes(o)).length }))
  .map(x => `<span style="color:${AWGfx.typeColor(x.o)}${x.n ? '' : ';opacity:.5'}">${esc(AWGfx.typeName(x.o))} <b>${x.n}</b></span>`).join('');
const group = (t, prefix, others, all = D.SERVANTS, card = servantCard) => {
  const c = AWGfx.typeColor(t), id = prefix + esc(t).replace(/ /g, '-'), ico = t === ALL_TYPES ? 'equip' : t;
  const list = all.filter(s => s.types.includes(t)).sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, 'fr'));
  return { t, c, id, n: list.length, html: `<section id="${id}" style="--accent:${c}">
  <h2 style="color:${c}">${AWGfx.icon(ico, { size: 24, color: c })}<span>${esc(t === ALL_TYPES ? t : AWGfx.typeName(t))}</span><span class="ventil">${split(list, others)}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
};
const build = (kind) => {
const LT = kind === 'heroes', EQ = kind === 'equipment';
const all = LT ? HEROES : EQ ? EQUIPS : D.SERVANTS, card = LT ? heroCard : EQ ? equipCard : servantCard;
const name = { servants: 'serviteurs', heroes: 'héros', equipment: 'équipements' }[kind], Name = { servants: 'Serviteurs', heroes: 'Héros', equipment: 'Équipements' }[kind];
const ASSIGN_SHOWN = LT ? ASSIGN : EQ ? [...ASSIGN, ALL_TYPES] : ASSIGN;
const SP = D.typesOfGroup('species');
const assignList = ASSIGN_SHOWN.map(t => group(t, 'assignment-', EQ ? [] : SP, all, card)).filter(g => !EQ || g.n)   // no empty section on the equipment page
  , races = EQ ? [] : SP.map(t => group(t, 'espece-', ASSIGN_SHOWN, all, card));
// One group per rank (level), sorted by assignment then by name; breakdown by assignment then, on a second line, by species.
const RANK_COLOR = '#f0a53a';
const ranks = LT ? [] : [...new Set(all.map(s => s.rank))].sort((a, b) => a - b).map(r => {
  const list = all.filter(s => s.rank === r).sort((x, y) => ASSIGN.indexOf(x.types[EQ ? 0 : 1]) - ASSIGN.indexOf(y.types[EQ ? 0 : 1]) || x.name.localeCompare(y.name, 'fr')), c = RANK_COLOR;
  return { t: 'Niveau ' + r, c, id: 'niveau-' + r, html: `<section id="niveau-${r}" style="--accent:${c}">
  <h2 style="color:${c}"><span>Niveau ${r}</span><span class="ventil"><span class="ligne">${split(list, [...ASSIGN, ...(EQ ? [ALL_TYPES] : [])])}</span>${EQ ? '' : `<span class="ligne">${split(list, SP)}</span>`}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
});
const navOf = list => list.map(g => `<a href="#${g.id}" style="color:${g.c};border-color:${g.c}">${g.id.startsWith('niveau') ? '' : AWGfx.icon(g.t === ALL_TYPES ? 'equip' : g.t, { size: 14, color: g.c })}${esc(g.t)}</a>`).join('');

const opt = list => list.map(g => `<option value="${g.id}">${esc(g.t)}</option>`).join('');
const select = `<label class="choix"><select id="choix" aria-label="Afficher un groupe"><optgroup label="Affectations">${opt(assignList)}</optgroup>${EQ ? '' : `<optgroup label="Espèces">${opt(races)}</optgroup>`}${LT ? '' : `<optgroup label="Niveaux">${opt(ranks)}</optgroup>`}</select></label>`;
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
// Catalogue pages: one line of filters (one drop-down per criterion, one choice each), the count shown/total and the reset button.
// The filters combine (AND). A native <select> cannot show icons: small custom drop-down (button + list), same look as the other fields.
const ranksList = [...new Set(all.map(x => x.rank))].sort((a, b) => a - b);
const tIcon = t => AWGfx.icon(t, { size: 14, color: AWGfx.typeColor(t) });
const typeItems = list => list.map(t => ({ v: t, label: AWGfx.typeName(t), icon: tIcon(t), color: AWGfx.typeColor(t) }));
const combo = (id, label, items, all = 'Toutes') => `<div class="champ"><b>${label}</b><div class="combo" id="${id}" data-value="">
  <button type="button" class="combo-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${label}"><span class="combo-val">${all}</span></button>
  <ul class="combo-list" role="listbox" aria-label="${label}" hidden><li role="option" tabindex="-1" data-v="" aria-selected="true">${all}</li>${items.map(i => `<li role="option" tabindex="-1" data-v="${esc(i.v)}" aria-selected="false" style="--c:${i.color}">${i.icon || ''}<span>${esc(i.label)}</span></li>`).join('')}</ul></div></div>`;
const filters = `<div class="filtres"><div>${EQ ? '' : combo('f-sp', 'Espèce', typeItems(SP))}${combo('f-assign', 'Affectation', typeItems(ASSIGN))}${LT ? '' : combo('f-rank', 'Niveau', ranksList.map(r => ({ v: r, label: 'Niveau ' + r, color: RANK_COLOR })), 'Tous')}<span class="nb" id="nb"></span><button type="button" class="reinit" id="reinit">Réinitialiser</button></div></div>
<div class="cartes grille">${[...all].sort((x, y) => x.rank - y.rank || ASSIGN_SHOWN.indexOf(x.types[EQ ? 0 : 1]) - ASSIGN_SHOWN.indexOf(y.types[EQ ? 0 : 1]) || x.name.localeCompare(y.name, 'fr')).map(x => card(x).replace('<div class="carte">', `<div class="carte" data-assign="${esc(x.types.find(t => ASSIGN_SHOWN.includes(t)) || '')}" data-sp="${esc(x.types.find(t => SP.includes(t)) || '')}" data-rank="${x.rank}">`)).join('\n')}</div>
<p class="vide" id="vide" hidden>Aucun résultat : aucun filtre ne correspond à cette combinaison. Utilisez « Réinitialiser » pour tout afficher.</p>
<script>
(function () {
  var cartes = [].slice.call(document.querySelectorAll('.grille .carte')), combos = [].slice.call(document.querySelectorAll('.combo'));
  function val(id) { var c = document.getElementById(id); return c ? c.dataset.value : ''; }
  function maj() {
    var sp = val('f-sp'), as = val('f-assign'), rk = val('f-rank'), n = 0;
    cartes.forEach(function (c) {
      var ok = (!sp || c.dataset.sp === sp) && (!as || c.dataset.assign === as) && (!rk || c.dataset.rank === rk);
      c.hidden = !ok; if (ok) n++;
    });
    document.getElementById('nb').textContent = n + '/' + cartes.length;
    document.getElementById('vide').hidden = n > 0;
  }
  function ferme(c, focus) { c.querySelector('.combo-list').hidden = true; c.querySelector('.combo-btn').setAttribute('aria-expanded', 'false'); if (focus) c.querySelector('.combo-btn').focus(); }
  function choisit(c, li) {
    [].forEach.call(c.querySelectorAll('li'), function (x) { x.setAttribute('aria-selected', x === li ? 'true' : 'false'); });
    c.dataset.value = li.dataset.v;
    var val = c.querySelector('.combo-val'); val.innerHTML = li.innerHTML; val.style.color = li.style.getPropertyValue('--c') || '';
    ferme(c, true); maj();
  }
  combos.forEach(function (c) {
    var btn = c.querySelector('.combo-btn'), list = c.querySelector('.combo-list'), items = [].slice.call(list.children);
    function ouvre() {
      combos.forEach(function (o) { if (o !== c) ferme(o); });
      list.hidden = false; btn.setAttribute('aria-expanded', 'true');
      (items.filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0] || items[0]).focus();
    }
    btn.addEventListener('click', function () { if (list.hidden) ouvre(); else ferme(c); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ouvre(); } });
    items.forEach(function (li, i) {
      li.addEventListener('click', function () { choisit(c, li); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisit(c, li); }
        else if (e.key === 'Escape') { e.preventDefault(); ferme(c, true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(i - 1, 0)].focus(); }
      });
    });
  });
  document.addEventListener('click', function (e) { combos.forEach(function (c) { if (!c.contains(e.target)) ferme(c); }); });
  document.getElementById('reinit').addEventListener('click', function () { combos.forEach(function (c) { choisit(c, c.querySelector('li')); }); });
  maj();
})();
</script>`;
const header = `<header class="entete"><div>
  <a class="marque" href="../index.html">Atlas Wanderer</a>
  <input type="checkbox" id="menu" class="menu-case" aria-label="Menu"><label for="menu" class="burger" aria-hidden="true"><span></span></label>
  <nav>
    <a href="../index.html">Présentation</a>
    <a href="rules.html">Règles</a>
    <a href="heroes.html"${LT ? ' aria-current="page"' : ''}>Héros</a>
    <a href="servants.html"${kind === 'servants' ? ' aria-current="page"' : ''}>Serviteurs</a>
    <a href="equipment.html"${EQ ? ' aria-current="page"' : ''}>Équipements</a>
    <details class="nav-test nav-local" hidden><summary>Local</summary>
      <div class="sous-menu"><a href="editor.html">Éditeur</a><a href="tests.html">Test</a></div>
    </details>
  </nav>
  <a class="bouton plein" href="mods.html">Jouer</a>
</div></header>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – ${Name}</title>
<link rel="stylesheet" href="space.css">
<link rel="stylesheet" href="tokens.css?v=4">
<link rel="stylesheet" href="site.css?v=7">
<link rel="stylesheet" href="catalogue.css?v=11">
</head>
<body>
<div class="espace"></div>
${header}
<main class="page large">
<h1>${Name}</h1>
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
const FILE = { servants: 'servants', heroes: 'heroes', equipment: 'equipment' }[kind];   // name of the page
fs.writeFileSync(path.join(root, 'site', FILE + '.html'), html);
console.log(`${FILE}.html : ${all.length} ${name}, ${(html.length / 1024).toFixed(0)} Ko`);
};
build('servants');
build('heroes');
build('equipment');

