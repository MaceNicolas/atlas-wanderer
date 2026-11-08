// Rend la carte (SVG) d'un lieutenant, serviteur, équipement ou donjon, comme sur les pages du site, pour l'aperçu au survol de la page Test.
// Même rendu que outils/generer-serviteurs.js (qui reste autonome). Les images sont référencées depuis site/ (../prototype/images/).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'prototype');
let D = null, AWGfx = null;
function charger() {
  if (D) return;
  require(path.join(dir, 'images.js'));   // liste des illustrations (AW_IMAGES, globale)
  AWGfx = require(path.join(dir, 'svg.js'));
  const code = ['donnees.js', 'moteur.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n({ SERVANTS, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, EQUIPS, DUNGEONS });';
  D = vm.runInNewContext(code, { Math, console });
}
const o = { width: '100%', imgBase: '../prototype/images/' };

function carte(kind, id) {
  charger();
  if (kind === 'servant') {
    const s = D.SERVANTS.find(x => x.id === id); if (!s) return null;
    const m = D.mkServant(s);
    return AWGfx.servantCard({ ...m, kwSpent: [], powers: D.powersOf(m.kw, D.skillsOf(m), null) }, o);
  }
  if (kind === 'equip') {
    const e = D.EQUIPS.find(x => x.id === id); if (!e) return null;
    const powers = D.powersOf(e.kw ? [e.kw] : [], e.skill ? [{ ...e.skill }] : [], e.mod ? { a: e.mod.droneA, h: e.mod.droneH } : null);
    powers.forEach(p => { if (!p.fixed) p.text = p.text.replace('à lui-même', 'au porteur'); });
    return AWGfx.equipCard({ ...e, powers }, o);
  }
  if (kind === 'hero') {
    const h = D.HEROES[id]; if (!h) return null;
    return AWGfx.heroPortrait({ name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' }, o);
  }
  if (kind === 'dungeon') {
    const d = D.DUNGEONS[id]; return d ? AWGfx.dungeonCard(d, { width: '100%' }) : null;
  }
  return null;
}
module.exports = { carte };
