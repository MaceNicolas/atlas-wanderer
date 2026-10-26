// Génère serviteurs.html (racine) : page statique (aucun script, aucun CDN) qui liste les serviteurs par archétype.
// À relancer après toute modification de prototype/donnees.js : node outils/generer-serviteurs.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const AWGfx = require(path.join(dir, 'svg.js'));
const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n({ SERVANTS, ARCHETYPES, SPECIES, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf });';
const D = vm.runInNewContext(code, { Math, console });
// Ordre d'affichage des archétypes : regroupés par couleur (bleus, verts, rouges).
const ARCH = ['Pilote', 'Explorateur', 'Diplomate', 'Ingénieur', 'Médecin', 'Roboticien', 'Sécurité', 'Artilleur', 'Renseignement'];
if (ARCH.length !== D.ARCHETYPES.length || D.ARCHETYPES.some(a => !ARCH.includes(a))) throw new Error('ARCH ne correspond plus à ARCHETYPES');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, { width: '100%' })}</div>`;
};

// Un groupe par type : tous les serviteurs qui le portent, du rang le plus bas au plus haut.
// Ventilation à droite du titre : pour chaque type de l'autre famille, le nombre de cartes concernées (texte seul, sans logo) ; les zéros sont affichés, atténués.
const split = (list, others) => others.map(o => ({ o, n: list.filter(x => x.types.includes(o)).length }))
  .map(x => `<span style="color:${AWGfx.typeColor(x.o)}${x.n ? '' : ';opacity:.5'}">${esc(x.o)} <b>${x.n}</b></span>`).join('');
const group = (t, prefix, others) => {
  const c = AWGfx.typeColor(t), id = prefix + esc(t);
  const list = D.SERVANTS.filter(s => s.types.includes(t)).sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, 'fr'));
  return { t, c, id, html: `<section id="${id}" style="border-color:${c}66">
  <h2 style="color:${c}">${AWGfx.icon(t, { size: 24, color: c })}<span>${esc(t)}</span><span class="ventil">${split(list, others)}</span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
};
const archs = ARCH.map(t => group(t, 'archetype-', D.SPECIES)), races = D.SPECIES.map(t => group(t, 'espece-', ARCH));
// Un groupe par rang (niveau), trié par archétype puis par nom ; ventilation par archétype puis, sur une seconde ligne, par espèce.
const RANK_COLOR = '#f0a53a';
const ranks = [...new Set(D.SERVANTS.map(s => s.rank))].sort((a, b) => a - b).map(r => {
  const list = D.SERVANTS.filter(s => s.rank === r).sort((x, y) => ARCH.indexOf(x.types[1]) - ARCH.indexOf(y.types[1]) || x.name.localeCompare(y.name, 'fr')), c = RANK_COLOR;
  return { t: 'Niveau ' + r, c, id: 'niveau-' + r, html: `<section id="niveau-${r}" style="border-color:${c}66">
  <h2 style="color:${c}"><span>Niveau ${r}</span><span class="ventil"><span class="ligne">${split(list, ARCH)}</span><span class="ligne">${split(list, D.SPECIES)}</span></span><strong class="total">Total ${list.length}</strong></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
});
const navOf = list => list.map(g => `<a href="#${g.id}" style="color:${g.c};border-color:${g.c}">${g.id.startsWith('niveau') ? '' : AWGfx.icon(g.t, { size: 14, color: g.c })}${esc(g.t)}</a>`).join('');

const header = `<header class="entete"><div>
  <a class="marque" href="index.html">Atlas Wanderer</a>
  <nav>
    <a href="index.html">Présentation</a>
    <a href="regles.html">Règles</a>
    <a href="serviteurs.html" aria-current="page">Serviteurs</a>
    <a href="apercu.html">Graphismes</a>
  </nav>
  <a class="bouton plein" href="prototype/prototype.html">Jouer</a>
</div></header>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas Wanderer – Serviteurs</title>
<link rel="stylesheet" href="espace.css">
<link rel="stylesheet" href="site.css">
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
</style>
</head>
<body>
<div class="espace"></div>
${header}
<main class="page large">
<h1>Serviteurs</h1>
<p class="discret">${D.SERVANTS.length} serviteurs, classés par archétype, par espèce puis par niveau. Un serviteur apparaît dans chacune des trois listes.</p>
<nav class="types"><div><b>Archétypes</b>${navOf(archs)}</div><div><b>Espèces</b>${navOf(races)}</div><div><b>Niveaux</b>${navOf(ranks)}</div></nav>
<h2 class="partie" id="archetypes">Par archétype</h2>
${archs.map(g => g.html).join('\n')}
<h2 class="partie" id="especes">Par espèce</h2>
${races.map(g => g.html).join('\n')}
<h2 class="partie" id="niveaux">Par niveau</h2>
${ranks.map(g => g.html).join('\n')}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'serviteurs.html'), html);
console.log(`serviteurs.html : ${D.SERVANTS.length} serviteurs, ${(html.length / 1024).toFixed(0)} Ko`);
