// Génère serviteurs.html (racine) : page statique (aucun script, aucun CDN) qui liste les serviteurs par archétype.
// À relancer après toute modification de prototype/donnees.js : node outils/generer-serviteurs.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(root, 'prototype');
const AWGfx = require(path.join(dir, 'svg.js'));
const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n({ SERVANTS, ARCHETYPES, SPECIES, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf });';
const D = vm.runInNewContext(code, { Math, console });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = s => {
  const m = D.mkServant(s), powers = D.powersOf(m.kw, D.skillsOf(m), null);
  return `<div class="carte">${AWGfx.servantCard({ ...m, kwSpent: [], powers }, { width: '100%' })}</div>`;
};

// Un groupe par type : tous les serviteurs qui le portent, du rang le plus bas au plus haut.
const group = (t, prefix) => {
  const c = AWGfx.typeColor(t), id = prefix + esc(t);
  const list = D.SERVANTS.filter(s => s.types.includes(t)).sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, 'fr'));
  return { t, c, id, html: `<section id="${id}" style="border-color:${c}66">
  <h2 style="color:${c}">${AWGfx.icon(t, { size: 24, color: c })}<span>${esc(t)}</span><small>${list.length}</small></h2>
  <div class="cartes">${list.map(card).join('\n')}</div>
</section>` };
};
const archs = D.ARCHETYPES.map(t => group(t, 'archetype-')), races = D.SPECIES.map(t => group(t, 'espece-'));
const navOf = list => list.map(g => `<a href="#${g.id}" style="color:${g.c};border-color:${g.c}">${AWGfx.icon(g.t, { size: 14, color: g.c })}${esc(g.t)}</a>`).join('');

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
  .types { position: sticky; top: 56px; z-index: 5; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 8px; margin: 16px 0 20px; background: rgba(0,0,0,.6); border-radius: 12px; }
  .types a { display: inline-flex; align-items: center; gap: 4px; border: 1px solid; border-radius: 8px; padding: 3px 10px; text-decoration: none; font-size: .9rem; }
  .types b { align-self: center; opacity: .7; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
  section { border: 2px solid; border-radius: 16px; padding: 16px; margin-bottom: 28px; background: rgba(0,0,0,.35); scroll-margin-top: 110px; }
  section h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; border: 0; padding: 0; font-size: 1.25rem; }
  section h2 small { font-size: .75rem; background: rgba(255,255,255,.15); color: #e5e7eb; border-radius: 99px; padding: 1px 8px; }
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
<p class="discret">${D.SERVANTS.length} serviteurs, classés par archétype puis par espèce. Un serviteur apparaît dans les deux listes.</p>
<nav class="types"><b>Archétypes</b>${navOf(archs)}<b>Espèces</b>${navOf(races)}</nav>
<h2 class="partie" id="archetypes">Par archétype</h2>
${archs.map(g => g.html).join('\n')}
<h2 class="partie" id="especes">Par espèce</h2>
${races.map(g => g.html).join('\n')}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'serviteurs.html'), html);
console.log(`serviteurs.html : ${D.SERVANTS.length} serviteurs, ${(html.length / 1024).toFixed(0)} Ko`);
