// Generates site/dungeons.html: the dungeons of the mod (their characteristics), their bosses, then a sheet on the random bosses.
// Everything comes from the data of the mod (dungeons.json, bosses.json, strategies of game.json, vocabulary): nothing is written by hand here.
// Run again after any change to the dungeons or the bosses: node tools/generate-dungeons.js (also run by tools/generate-all.js)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const MOD = require('./mod');
require(MOD.imageIndexFile());   // list of illustrations of the mod (AW_IMAGES, global)
const IMG = `../${MOD.rel(MOD.imagesDir())}/`;   // illustrations as seen from site/
const AWGfx = require(path.join(dir, 'svg.js'));
const FR = MOD.texts('fr');
AWGfx.setVocabulary(MOD.read('vocabulary')); AWGfx.setScenes(MOD.read('scenes')); AWGfx.setCardLayout((MOD.read('game').ui || {}).cards);
const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript() + '\n({ DUNGEONS, BOSSES, SERVANTS, RULES, BOSS_BOARDS, MAX_BOARD, typesOfGroup, drawableOfGroup, TYPE_GROUPS });';
const D = vm.runInNewContext(code, { Math, console });
const STRATEGIES = MOD.read('strategies') || {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tName = t => FR['type.' + t] || t;
const color = t => AWGfx.typeColor(t);
const chip = t => `<span class="type-nom" style="--c:${color(t)}">${AWGfx.icon(t, { size: 14, color: color(t) })}${esc(tName(t))}</span>`;
const GROUP_NAME = { species: 'espèce', assignment: 'affectation' };
const bossOf = id => D.BOSSES[id];
// The bosses a slot can really give: those of its list (all the bosses of the game without a list) that have one of the types that can be drawn for it.
const possible = (d, s) => { const pool = drawPool(d, d.drawTypes[s.drawn] || {}); const fixed = dungeons.flatMap(x => x.slots.filter(y => y.boss).map(y => y.boss)); return (s.from || Object.keys(D.BOSSES)).map(bossOf).filter(b => b && !fixed.includes(b.id) && b.types.some(t => pool.includes(t))); };
// Species (race) always before assignment when types are shown.
const byGroup = types => { const sp = D.typesOfGroup('species'); return [...types].sort((a, b) => sp.includes(b) - sp.includes(a)); };
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- Strategies ----------
const strategyName = id => FR['behavior.' + id] || id;
const strategyText = id => FR['behavior.' + id + '.desc'] || '';
const strategyOf = id => (STRATEGIES.list || {})[id] || null;
const strategyCell = id => id ? `<b>${esc(strategyName(id))}</b>${strategyText(id) ? `<br><span class="mute">${esc(strategyText(id))}</span>` : ''}` : '<span class="mute">Par défaut (tirée au hasard : ' + ((STRATEGIES.default || {}).pool || []).map(strategyName).map(esc).join(', ') + ')</span>';

// ---------- Cards ----------
const dungeonSvg = d => AWGfx.dungeonCard(d, { width: '100%', imgBase: IMG, extra: [], hideHp: true });
// The picture of the dungeon alone (no card), over the whole width; the card only when the dungeon has no picture.
const dungeonPicture = d => { const ext = ((global.AW_IMAGES || {}).dungeons || {})[d.id]; return ext ? `<img class="donjon-image" src="${IMG}dungeons/${d.id}.${ext}" alt="${esc(d.name)}">` : `<div class="carte-large">${dungeonSvg(d)}</div>`; };
const bossSvg = (d, b) => AWGfx.dungeonCard(d, { width: '100%', imgBase: IMG, boss: { id: b.id, name: b.name, types: byGroup(b.types), desc: b.desc }, hp: b.hp, max: b.hp });

// ---------- The drawn types of a dungeon ----------
// The pool of a drawn type: the types of its group (or those listed by "from"), without the fixed types of the dungeon (and without the types drawn by the entries before it).
const drawPool = (d, entry) => (entry.from || D.drawableOfGroup(entry.group)).filter(t => !d.types.includes(t));
const drawText = (d, entry, i) => {
  const group = entry.group ? GROUP_NAME[entry.group] || entry.group : null;
  return `<li><b>Type tiré n° ${i + 1}</b> : ${group ? 'une ' + group : 'un type'} au hasard</li>`;   // the group only, never the list of the possible types
};

// ---------- The bosses of a dungeon ----------
// A slot is a fixed boss ({ boss }) or a boss linked to a drawn type ({ drawn, from }).
const bossFacts = b => {
  return `<table class="fiche">
    <tr><th>Points de vie</th><td>${b.hp}</td></tr>
    <tr><th>Types</th><td>${byGroup(b.types).map(chip).join(' ')}</td></tr>
    <tr><th>Pouvoir</th><td>${b.desc ? esc(b.desc) : '<span class="mute">Aucun</span>'}</td></tr>
    <tr><th>Stratégie</th><td>${strategyCell(b.strategy)}</td></tr>
  </table>`;
};
const fixedBoss = (d, b, n) => `<article class="boss" id="${slug(d.name)}-boss-${n || slug(b.name)}">
  <div class="boss-corps"><div class="carte-large">${bossSvg(d, b)}</div>${bossFacts(b)}</div>
</article>`;
const dungeons = Object.values(D.DUNGEONS);
const dungeonSection = d => {
  const slots = d.slots, fixedSlots = slots.filter(s => s.boss), randomSlots = slots.filter(s => !s.boss), nFixed = slots.filter(s => s.boss).length, nRandom = slots.length - nFixed;
  const malus = D.BOSS_BOARDS;
  // The fixed bosses as links to their sheets below, then the bosses drawn at random: « Mara et Cyro + 2 boss du type tiré ».
  const links = fixedSlots.map((s, i) => `<a href="#${slug(d.name)}-boss-${i + 1}">${esc(bossOf(s.boss).name)}</a>`);
  const names = links.length > 1 ? `${links.slice(0, -1).join(', ')} et ${links[links.length - 1]}` : links.join('');
  const bossLine = [names, nRandom ? `${names ? '+ ' : ''}${nRandom} boss du type tiré (<a href="#boss-aleatoires">voir les boss aléatoires</a>)` : ''].filter(Boolean).join(' ').replace(/^(.*?) \+ /, '$1 + ');
  return `<section id="${slug(d.name)}" class="donjon">
  <div class="donjon-tete"><div class="donjon-figure">${dungeonPicture(d)}<h2 class="donjon-titre">${esc(d.name)}${FR['card.' + d.id + '.nickname'] ? `<small>${esc(FR['card.' + d.id + '.nickname'])}</small>` : ''}</h2><div class="donjon-types">${byGroup(d.types).map(t => `<span title="${esc(tName(t))}">${AWGfx.icon(t, { size: 64, color: color(t) })}</span>`).join('')}</div></div>
</div>
  <h3 class="centre">Les boss</h3>
  ${fixedSlots.map((s, i) => fixedBoss(d, bossOf(s.boss), i + 1)).join('\n')}
</section>`;
};

// ---------- The sheet on the random bosses ----------
const sheet = () => {
  const withRandom = dungeons.filter(d => d.slots.some(s => !s.boss));
  // The named random bosses (with a power or a strategy of their own), each ONCE, in alphabetical order; the card takes the scenery of the first dungeon where the boss comes up.
  const seen = new Map();
  withRandom.forEach(d => d.slots.filter(sl => !sl.boss).forEach(sl => possible(d, sl).filter(b => b.power || b.strategy).forEach(b => { if (!seen.has(b.id)) seen.set(b.id, { d, b }); })));
  const named = [...seen.values()].sort((x, y) => x.b.name.localeCompare(y.b.name, 'fr'));
  // The double chart: how many of these bosses stand for each species, and for each assignment (every type that can be drawn is shown, even with 0 bosses).
  const count = group => D.drawableOfGroup(group).map(t => ({ t, n: named.filter(x => x.b.types.includes(t)).length })).sort((x, y) => y.n - x.n || tName(x.t).localeCompare(tName(y.t), 'fr'));
  const top = Math.max(1, ...['species', 'assignment'].flatMap(g => count(g).map(x => x.n)));
  const bars = (group, title) => `<div class="repart"><h4>${title}</h4><ul>${count(group).map(({ t, n }) => `<li><span class="repart-nom">${chip(t)}</span><span class="repart-barre" role="img" aria-label="${n}"><i style="width:${(n / top * 100).toFixed(1)}%;--c:${color(t)}"></i></span><b>${n}</b></li>`).join('')}</ul></div>`;
  return `<section id="boss-aleatoires" class="fiche-alea">
  <h2><span>Les boss aléatoires</span></h2>
  <h3>Stratégies tirées au hasard</h3>
  <p>Un boss qui n'a pas de stratégie définie en reçoit une, tirée au hasard parmi celles-ci :</p>
  <div class="defile"><table class="b"><thead><tr><th>Stratégie</th><th>Comportement</th></tr></thead><tbody>
  ${((STRATEGIES.default || {}).pool || []).map(s => `<tr><td><b>${esc(strategyName(s))}</b></td><td>${esc(strategyText(s))}</td></tr>`).join('\n  ')}
  </tbody></table></div>
  <h3>Répartition</h3>
  <p>Nombre de boss aléatoires listés ci-dessous qui représentent chaque espèce et chaque affectation (un boss compte pour son espèce et pour son affectation).</p>
  <div class="repartition">${bars('species', 'Par espèce')}${bars('assignment', 'Par affectation')}</div>
  <h3>Les boss</h3>
  ${named.map(x => fixedBoss(x.d, x.b, 0)).join('\n')}
</section>`;
};

// ---------- The page ----------
const nav = `<nav class="nav-page">${[...dungeons.map(d => `<a href="#${slug(d.name)}">${esc(d.name)}</a>`), '<a href="#boss-aleatoires">Boss aléatoires</a>'].join('')}</nav>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – Donjons</title>
<link rel="stylesheet" href="space.css">
<link rel="stylesheet" href="tokens.css?v=4">
<link rel="stylesheet" href="site.css?v=7">
<link rel="stylesheet" href="catalogue.css?v=23">
<link rel="stylesheet" href="dungeons.css?v=9">
</head>
<body>
<div class="espace"></div>
${require('./site-header').header('dungeons')}
<main class="page large">
<h1>Donjons</h1>
<p class="intro">Choisir un donjon lance une partie. Le donjon est gagné quand tous ses boss sont vaincus. Chaque boss a sa barre de points de vie, son pouvoir, sa stratégie et, parfois, un serviteur permanent. Certains boss sont fixes, d'autres sont tirés au hasard selon les types tirés par le donjon.</p>
${nav}
${dungeons.map(dungeonSection).join('\n')}
${sheet()}
</main>
<script src="link-test.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'site', 'dungeons.html'), html);
console.log(`dungeons.html : ${dungeons.length} donjons, ${Object.keys(D.BOSSES).length} boss, ${(html.length / 1024).toFixed(0)} Ko`);
