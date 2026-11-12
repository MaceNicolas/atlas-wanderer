// The header (menu) shared by every page of the site, except the game itself (prototype/prototype.html): one definition, written into the pages.
// Usage: node tools/site-header.js   (rewrites the <header class="entete"> of index.html and of site/*.html; also run by tools/generate-all.js)
// To add a page to the menu, add it here and run the script: no page carries its own copy to edit by hand.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// The menu: [id, label, file]. "local" ones are only shown on the local server (hidden until site/link-test.js shows them).
const MAIN = [['presentation', 'Présentation', 'index.html'], ['rules', 'Règles', 'site/rules.html'], ['heroes', 'Héros', 'site/heroes.html'], ['servants', 'Serviteurs', 'site/servants.html'], ['equipment', 'Équipements', 'site/equipment.html']];
const LOCAL = [['editor', 'Éditeur', 'site/editor-mods.html'], ['effects', 'Effets', 'site/effets.html'], ['tests', 'Test', 'site/tests.html']];
const PLAY = ['play', 'Jouer', 'site/mods.html'];
// The page each file of the site is (editor.html is the editor, whatever the mod).
const PAGE_OF = { 'index.html': 'presentation', 'site/rules.html': 'rules', 'site/heroes.html': 'heroes', 'site/servants.html': 'servants', 'site/equipment.html': 'equipment',
  'site/editor-mods.html': 'editor', 'site/editor.html': 'editor', 'site/effets.html': 'effects', 'site/tests.html': 'tests', 'site/mods.html': 'play' };
// header(page, fromRoot): the markup for the page (an id of the menu). fromRoot: true for index.html, whose links go down into site/ instead of beside it.
function header(page, fromRoot) {
  const href = f => (fromRoot ? f : f === 'index.html' ? '../index.html' : f.replace(/^site\//, ''));
  const link = ([id, label, file]) => `<a href="${href(file)}"${id === page ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="entete"><div>
  <a class="marque" href="${href('index.html')}">Atlas Wanderer</a>
  <input type="checkbox" id="menu" class="menu-case" aria-label="Menu"><label for="menu" class="burger" aria-hidden="true"><span></span></label>
  <nav>
    ${MAIN.map(link).join('\n    ')}
    <details class="nav-test nav-local" hidden><summary>Local</summary>
      <div class="sous-menu">${LOCAL.map(link).join('')}</div>
    </details>
  </nav>
  <a class="bouton plein" href="${href(PLAY[2])}"${page === 'play' ? ' aria-current="page"' : ''}>${PLAY[1]}</a>
</div></header>`;
}
function sync() {
  let changed = 0;
  for (const [file, page] of Object.entries(PAGE_OF)) {
    const f = path.join(root, file), src = fs.readFileSync(f, 'utf8'), out = src.replace(/<header class="entete">[\s\S]*?<\/header>/, () => header(page, file === 'index.html'));
    if (out !== src) { fs.writeFileSync(f, out); changed++; }
  }
  return changed;
}
module.exports = { header, sync, PAGE_OF };
if (require.main === module) console.log(`${sync()} page(s) du site : menu mis à jour`);
