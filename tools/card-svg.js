// Renders the SVG card of a hero, servant, equipment or dungeon, as on the site pages, for the hover preview of the Test page.
// Same rendering as tools/generate-servants.js (which stays standalone). Images are referenced from site/ (../prototype/images/).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'prototype');
let D = null, AWGfx = null, signature = '';
// Files the rendering depends on: if they change (card edited, image added), everything is reloaded without restarting the local server.
const MOD = require('./mod'), SOURCES = ['data.js', 'engine.js', 'svg.js'].map(f => path.join(dir, f)).concat(MOD.imageIndexFile());
const currentSignature = () => SOURCES.map(f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } }).join('|');
function load() {
  const sig = currentSignature();
  if (D && sig === signature) return;
  SOURCES.forEach(f => { delete require.cache[require.resolve(f)]; });
  signature = sig;
  require(MOD.imageIndexFile());   // list of illustrations of the mod (AW_IMAGES, global)
  AWGfx = require(path.join(dir, 'svg.js'));
  AWGfx.setVocabulary(MOD.read('vocabulary')); AWGfx.setScenes(MOD.read('scenes')); AWGfx.setCardLayout((MOD.read('game').ui || {}).cards);   // types, colors, emblems and keywords of the mod; the layout of its cards
  const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript() + '\n({ SERVANTS, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, EQUIPS, DUNGEONS });';
  D = vm.runInNewContext(code, { Math, console });
}
const o = { width: '100%', imgBase: `../${MOD.rel(MOD.imagesDir())}/` };

function renderCard(kind, id) {
  load();
  if (kind === 'servant') {
    const s = D.SERVANTS.find(x => x.id === id); if (!s) return null;
    const m = D.mkServant(s);
    return AWGfx.servantCard({ ...m, kwSpent: [], powers: D.powersOf(m.kw, D.skillsOf(m), null) }, o);
  }
  if (kind === 'equip') {
    const e = D.EQUIPS.find(x => x.id === id); if (!e) return null;
    const powers = D.powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true);
    return AWGfx.equipCard({ ...e, powers }, o);
  }
  if (kind === 'hero') {
    const h = D.HEROES[id]; if (!h) return null;
    return AWGfx.heroPortrait({ id: h.id, name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' }, o);
  }
  if (kind === 'dungeon') {
    const d = D.DUNGEONS[id]; return d ? AWGfx.dungeonCard(d, { width: '100%' }) : null;
  }
  return null;
}
module.exports = { renderCard };
