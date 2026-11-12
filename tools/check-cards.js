// The cards (spec documentation/mecaniques/cartes.md): the default layout of the engine and the mod's overrides (game.json, ui.cards).
// Checks the validation of ui.cards, the resolution of the layers (engine < mod default < mod category, null removes a zone), the drawing of every card of every mod
// (no NaN or undefined, a zone without its field is not drawn), 0 to 3 sockets (one button each, only when asked), the way back to the old style, and the colors as CSS variables.
// Usage: node tools/check-cards.js   (the drawing of each mod runs in its own process: node tools/check-cards.js --draw <mod>)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const MOD = require('./mod'), CL = require('../prototype/card-layout.js');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const ok = (c, m) => { if (!c) fail(m); };
const dir = path.join(__dirname, '..', 'prototype');

if (process.argv[2] === '--draw') {
  const id = MOD.id(), AWGfx = require(path.join(dir, 'svg.js'));
  require(MOD.imageIndexFile());
  AWGfx.setVocabulary(MOD.read('vocabulary')); AWGfx.setScenes(MOD.read('scenes')); AWGfx.setCardLayout((MOD.read('game').ui || {}).cards);
  const code = ['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + require('./engine-data').installScript()
    + '\n({ SERVANTS, mkServant, skillsOf, skDesc, TRIG_KIND, powersOf, HEROES, EQUIPS, DUNGEONS });';
  const D = vm.runInNewContext(code, { Math, console, AWGfx });
  const o = { width: '100%' }, drawn = [];
  const servantSvg = (c, opts, extra) => { const m = { ...D.mkServant(c), ...extra }; return AWGfx.servantCard({ ...m, kwSpent: [], powers: D.powersOf(m.kw, D.skillsOf(m), null) }, { ...o, ...opts }); };
  const clean = (svg, what) => { ok(/^<svg[\s\S]*<\/svg>$/.test(svg.trim()), `${id}: ${what} is not an svg`); ok(!/NaN|undefined|\[object/.test(svg), `${id}: ${what} writes NaN, undefined or [object]`); drawn.push(what); return svg; };
  const buttons = svg => (svg.match(/class="aw-socket"/g) || []).length;
  for (const c of D.SERVANTS) {   // every servant, with and without sockets
    const plain = clean(servantSvg(c), `servant ${c.name}`);
    ok(buttons(plain) === 0, `${id}: sockets are buttons when nobody asked`);
  }
  const layout = CL.resolve((MOD.read('game').ui || {}).cards, 'servant'), s0 = D.SERVANTS[0];
  if (layout.sockets) {   // the mod shows sockets: 0 to 3, empty or full, interactive only when asked
    const eq = D.EQUIPS.find(e => !e.token);
    for (const n of [0, 1, 2, 3]) {
      const colors = ['blue', 'green', 'red'].slice(0, n), svg = clean(servantSvg(s0, { sockets: { act: 'socket', selected: n > 1 ? 1 : null } }, { sockets: colors, slots: colors.map((c, i) => (i === 0 ? eq || null : null)) }), `servant with ${n} socket(s)`);
      ok(buttons(svg) === n, `${id}: ${n} socket(s) must draw ${n} button(s), not ${buttons(svg)}`);
      if (n) ok(/data-act="socket"/.test(svg) && /role="button"/.test(svg) && /tabindex="0"/.test(svg) && /aria-label="/.test(svg), `${id}: a socket needs data-act, role, tabindex and a label`);
      if (n > 1) ok(/aria-pressed="true"/.test(svg), `${id}: the selected socket is not marked`);
    }
    ok(/data-filled="1"/.test(servantSvg(s0, { sockets: { act: 'socket' } }, { sockets: ['blue'], slots: [D.EQUIPS[0]] })), `${id}: a full socket is not marked`);
  } else ok(!/class="aw-socket"/.test(servantSvg(s0, { sockets: { act: 'socket' } }, { sockets: ['blue'], slots: [null] })), `${id}: a mod without a sockets zone draws no socket`);
  // The zones: a field the card does not have is not drawn.
  const full = servantSvg(s0, {}, { rank: 3, types: [] });
  if (layout.level) ok(!servantSvg(s0, {}, { rank: undefined }).includes('ui.rankTitle') && servantSvg(s0, {}, { rank: 3 }) !== servantSvg(s0, {}, { rank: undefined }), `${id}: the level zone does not follow the rank`);
  for (const e of D.EQUIPS.filter(x => !x.token).slice(0, 5)) clean(AWGfx.equipCard({ ...e, powers: D.powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true) }, o), `equipment ${e.name}`);
  for (const h of Object.values(D.HEROES)) {
    const p = { id: h.id, name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? D.skDesc(h.power) : '', powerKind: h.power ? D.TRIG_KIND[h.power.t] : 'renfort' };
    clean(AWGfx.heroPortrait(p, o), `hero ${h.name}`); clean(AWGfx.heroCard(p, o), `hero card ${h.name}`); clean(AWGfx.heroPortrait({ ...p, hp: 0, maxhp: h.hp }, o), `hero down ${h.name}`);
  }
  for (const d of Object.values(D.DUNGEONS)) clean(AWGfx.dungeonCard(d, o), `dungeon ${d.name}`);
  // Frame pictures (layout key "frame"): the picture of the mod is drawn over the illustration, and its variants follow a field.
  const eqLayout = CL.resolve((MOD.read('game').ui || {}).cards, 'equipment'), heroLayout = CL.resolve((MOD.read('game').ui || {}).cards, 'hero');
  for (const [cat, L] of [['hero', heroLayout], ['equipment', eqLayout]]) if (L.frame) {
    const files = [L.frame.image, ...Object.values(L.frame.variants || {}).map(v => v.image).filter(Boolean)];
    for (const f of files) ok(fs.existsSync(path.join(MOD.dir(id), f)), `${id}: the frame ${f} of ${cat} is not a file of the mod`);
    drawn.push(`${cat} on a frame`);
  }
  if (eqLayout.frame && eqLayout.frame.variants) {
    const eq = D.EQUIPS.find(e => !e.token), draw = color => AWGfx.equipCard({ ...eq, color, powers: [] }, { ...o, imgBase: 'x/images/' });
    ok(draw(undefined).includes('x/' + eqLayout.frame.image), `${id}: an equipment with no color uses the base frame`);
    for (const [color, v] of Object.entries(eqLayout.frame.variants)) {
      const svg = draw(color);
      if (v.image) ok(svg.includes('x/' + v.image), `${id}: the ${color} equipment must use ${v.image}`);
      if (v.hue) ok(svg.includes(`hue-rotate(${v.hue}deg)`), `${id}: the ${color} equipment must turn the hue by ${v.hue}`);
    }
  }
  if (heroLayout.frame) { const h = Object.values(D.HEROES)[0], svg = AWGfx.heroPortrait({ id: h.id, name: h.name, types: h.types, hp: h.hp, powerText: 'Texte', powerKind: 'combat' }, { ...o, imgBase: 'x/images/' }); ok(svg.includes('x/' + heroLayout.frame.image) && svg.includes(String(h.hp)), `${id}: a hero on a frame shows the frame and its hit points`); ok(!/aw-socket|chamfer/.test(svg), `${id}: a frame card draws no vector frame`); }
  // The page sizes its rows with the ratio of the cards: it must be the one the drawing has.
  for (const [cat, svg] of [['servant', servantSvg(s0)], ['hero', AWGfx.heroPortrait({ id: 'x', name: 'x', types: [], hp: 1 }, o)], ['equipment', AWGfx.equipCard({ ...(D.EQUIPS.find(e => !e.token) || { name: 'x' }), powers: [] }, o)]]) {
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg); if (!vb) continue;
    ok(Math.abs(vb[2] / vb[1] - AWGfx.cardRatio(cat)) < 0.01, `${id}: the ${cat} card is drawn at ${(vb[2] / vb[1]).toFixed(3)} but cardRatio says ${AWGfx.cardRatio(cat).toFixed(3)}`);
  }
  // The colors are CSS variables with the engine's value as fallback: a mod changes them in its theme.
  ok(layout.frame ? /<image href="[^"]*frames\//.test(full) : /var\(--aw-card-servant, #/.test(full) || /var\(--aw-card-gold, #/.test(full), `${id}: the accent color is not a CSS variable (or the frame is missing)`);
  // The way back: "classic" draws the old cards.
  const keep = (MOD.read('game').ui || {}).cards;
  AWGfx.setCardLayout({ ...(keep || {}), style: 'classic' });
  const classic = servantSvg(s0, {}, {});
  const norm = x => x.replace(/([\" (#])g\d+/g, '$1gN');   // the drawing ids count up
  ok(norm(classic) === norm(AWGfx.servantCardClassic({ ...D.mkServant(s0), kwSpent: [], powers: D.powersOf(D.mkServant(s0).kw, D.skillsOf(D.mkServant(s0)), null) }, o)), `${id}: style "classic" must draw the old cards`);
  ok(!/aw-card-/.test(classic), `${id}: the old cards use no layout`);
  AWGfx.setCardLayout({ ...(keep || {}), servant: { ...((keep || {}).servant || {}), frame: null, stats: [{ field: 'hp', at: 'right', glyph: 'H', color: '#123456' }] } });
  ok(servantSvg(s0, {}, {}).includes('#123456') && !servantSvg(s0, {}, {}).includes('title>atk'), `${id}: a mod's own stats are not used`);
  console.log(`  ${id}: ${drawn.length} cards drawn (servants ${D.SERVANTS.length}, heroes ${Object.keys(D.HEROES).length}, dungeons ${Object.keys(D.DUNGEONS).length}, sockets zone ${layout.sockets ? 'yes' : 'no'})`);
  process.exit(0);
}

// ---- Validation and resolution (no engine needed).
ok(CL.validate(undefined).length === 0 && CL.validate({}).length === 0, 'an empty ui.cards is valid');
const bad = (label, cards, re) => ok(CL.validate(cards, { categories: ['servant', 'hero'] }).some(p => re.test(p)), `${label} is accepted`);
bad('an unknown zone', { servant: { bogus: {} } }, /unknown zone/); bad('an unknown category', { nothing: {} }, /not a category/); bad('stats without side', { servant: { stats: [{ field: 'atk' }] } }, /at:/);
bad('a frame without image', { servant: { frame: { variants: {} } } }, /frame/); bad('a frame with a path out of the mod', { servant: { frame: { image: '../x.webp' } } }, /frame/); bad('a box out of the card', { servant: { art: { box: { x: 120, y: 0 } } } }, /box/);
bad('a bad style', { style: 'fancy' }, /style/); bad('a bad color', { servant: { stats: [{ field: 'atk', at: 'left', color: 'red' }] } }, /color/); bad('a tags zone with three fields', { servant: { tags: { fields: ['a', 'b', 'c'] } } }, /one or two/);
const base = CL.resolve(null, 'servant');
ok(base.stats.length === 2 && base.sockets && base.tags && base.body, 'the engine has a default layout for servants');
ok(CL.resolve(null, 'unknown-category').art, 'an unknown category falls back to the default layout');
const over = CL.resolve({ default: { icon: { glyph: 'D' } }, servant: { tags: null, stats: [{ field: 'atk', at: 'left' }] } }, 'servant');
ok(!over.tags && over.stats.length === 1 && over.icon.glyph === 'D' && over.body, 'the mod rewrites a zone, removes one with null, and keeps the rest of the default layout');
ok(CL.validate({ hero: { frame: { image: 'frames/h.webp', variants: { blue: { hue: 180 } } }, art: { box: { x: 10, y: 20, w: 80, h: 40 } }, stats: [{ field: 'hp', x: 50, y: 60 }] } }, { categories: ['hero'] }).length === 0, 'a frame layout is valid');
ok(CL.resolve({ servant: { level: { field: 'tier' } } }, 'servant').level.field === 'tier', 'a zone is merged field by field');
const reg = MOD.registry();
for (const id of reg.mods) {   // the mod's own ui.cards is valid
  const game = MOD.read('game', id), cats = game.categories;
  const problems = CL.validate((game.ui || {}).cards, { categories: Object.keys(cats), fieldsOf: c => Object.keys({ ...cats[c].fields, ...(cats[c].optional || {}) }) });
  ok(!problems.length, `${id}: ui.cards invalid: ${problems[0]}`);
}
const lines = reg.mods.map(id => execFileSync('node', [__filename, '--draw', id], { encoding: 'utf8', env: { ...process.env, AW_MOD: id } }).trim());
console.log(lines.join('\n'));
console.log(`✓ cards: layout validated, resolved in layers, and drawn for ${reg.mods.length} mods (0 to 3 sockets, zones without field, way back to the old style)`);
