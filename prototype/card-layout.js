// Atlas Wanderer: the layout of the cards, as data. The engine has a default model (DEFAULT below); a mod may rewrite any part of it in game.json, ui.cards
// (spec documentation/mecaniques/cartes.md). The drawing (prototype/svg.js) only knows the zones listed here: each zone says which field of the card it shows
// and how. A zone whose field the card does not have is not drawn, and the others take its place: a game with no rank, no types or no sockets needs nothing more.
(function (root) {
  'use strict';
  // The zones a layout may use (a closed list: a new zone means new drawing code in the engine).
  const ZONES = {
    title: 'the name of the card, for a layout drawn on a frame picture: { box } (the zone of the name in the frame)',
    icon: 'the hexagon at the top of the card: { glyph } (a character) or { icon } (a name of the engine icons)',
    level: 'a number at the top right: { field } (absent on the card: nothing); on a frame, as many chevrons as the level (cover: true hides the chevrons painted in the frame)',
    art: 'the illustration of the card (found by the id of the card), or an emblem when there is none: { height? }',
    tags: 'the band under the illustration, one cell per value: { fields: [names of fields, a list or one value], empty? (a text key shown when the card has none) }; on a frame: box is the first icon (a center with bare: true), step the offset of the next one in percent',
    body: 'the text area: { source: "powers" } (the powers of the card, in rows), { tint? } colors the rows by kind of power',
    sockets: 'the row of sockets: { field (the list of colors), filled (the list of what they hold) } (interactive in the game); on a frame: box is the center of the middle one (w its width) and step the distance between two, in percent',
    stats: 'the plates in the bottom corners: [ { field, at: "left"|"right", glyph, color, max? (field of the full value), hideZero? } ]',
    foot: 'a small label at the bottom of the card: { text (a text key) }',
    mark: 'the color of the socket an equipment fits: { field }',
    frame: 'a picture of the mod drawn over the illustration (a frame with windows): { ratio? (height / width, 4/3 by default), image (a file of the mod), variantField?, variants?: { <value>: { image?, hue? } } }; with it, every zone says where it is with box: { x, y, w, h } in percent of the card (the card is 3 by 4)'
  };
  const GLYPH = { servant: '⚔', equipment: '⬡', hero: '✦', dungeon: '☗' };
  const DEFAULT = {
    version: 1,
    note: 'The default model of the cards. accents: the color of each category (a mod changes them in its theme.css with --aw-card-<category>). palette: the colors of the sockets by name.',
    style: 'atlas',
    accents: { servant: '#78d9f4', equipment: '#f3c16b', hero: '#d99df5', dungeon: '#f08b6a', default: '#9fb0c8' },
    palette: { blue: '#56c9ff', green: '#73ec7d', red: '#ff707b', chroma: 'conic', gold: '#e6b45c' },
    categories: {
      default: { icon: { glyph: '◆' }, art: {}, body: { source: 'powers' }, stats: [] },
      servant: { icon: { glyph: GLYPH.servant }, level: { field: 'rank' }, art: {}, tags: { fields: ['types'] }, body: { source: 'powers' }, sockets: { field: 'sockets', filled: 'slots' },
        stats: [{ field: 'atk', at: 'left', glyph: '⚔', color: '#e6b45c' }, { field: 'hp', max: 'maxhp', at: 'right', glyph: '♥', color: '#f08b9e' }] },
      equipment: { icon: { glyph: GLYPH.equipment }, level: { field: 'rank' }, art: {}, tags: { fields: ['type'], empty: 'ui.allTypes' }, body: { source: 'powers' }, mark: { field: 'color' }, foot: { text: 'ui.equipmentLabel' }, accentField: 'color',
        stats: [{ field: 'atk', at: 'left', glyph: '⚔', color: '#e6b45c', hideZero: true }, { field: 'hp', at: 'right', glyph: '♥', color: '#f08b9e', hideZero: true }] },
      hero: { icon: { glyph: GLYPH.hero }, art: {}, tags: { fields: ['types'] }, body: { source: 'powers', tint: true }, stats: [{ field: 'hp', max: 'maxhp', at: 'right', glyph: '♥', color: '#f08b9e' }] },
      dungeon: { icon: { glyph: GLYPH.dungeon }, art: {}, stats: [{ field: 'hp', at: 'right', glyph: '♥', color: '#f08b9e' }] }
    }
  };
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  // The layout of a category: the engine's (its own entry, else "default"), then the mod's "default", then the mod's entry. A zone set to null is removed.
  function resolve(modCards, category) {
    const mod = isObj(modCards) ? modCards : {};
    let out = JSON.parse(JSON.stringify(DEFAULT.categories[category] || DEFAULT.categories.default));
    for (const layer of [mod.default, mod[category]]) {
      if (!isObj(layer)) continue;
      for (const [zone, value] of Object.entries(layer)) {
        if (value === null) delete out[zone];
        else out[zone] = isObj(value) && isObj(out[zone]) ? { ...out[zone], ...value } : JSON.parse(JSON.stringify(value));
      }
    }
    return out;
  }
  const style = modCards => (isObj(modCards) && modCards.style) || DEFAULT.style;
  const accents = modCards => ({ ...DEFAULT.accents, ...((isObj(modCards) && modCards.accents) || {}) });
  const palette = modCards => ({ ...DEFAULT.palette, ...((isObj(modCards) && modCards.palette) || {}) });
  // Checks the ui.cards of a mod: ctx.categories = the ids of the categories of the game (optional), ctx.fieldsOf(category) = their field names (optional), ctx.text(key) tells whether a text exists.
  function validate(modCards, ctx = {}) {
    const problems = [], add = (w, m) => problems.push(`ui.cards${w}: ${m}`);
    if (modCards == null) return problems;
    if (!isObj(modCards)) return ['ui.cards: must be an object'];
    for (const [k, v] of Object.entries(modCards)) {
      if (k === 'style') { if (!['atlas', 'classic'].includes(v)) add('.style', 'must be "atlas" or "classic"'); continue; }
      if (k === 'accents' || k === 'palette') { if (!isObj(v) || Object.values(v).some(c => typeof c !== 'string')) add('.' + k, 'must map names to colors (strings)'); continue; }
      if (k === 'note') continue;
      const w = '.' + k;
      if (ctx.categories && k !== 'default' && !ctx.categories.includes(k)) { add(w, `"${k}" is not a category of the game`); continue; }
      if (!isObj(v)) { add(w, 'must be an object (zones)'); continue; }
      for (const [zone, z] of Object.entries(v)) {
        if (zone === 'frame') { if (z === null) continue; if (z.ratio !== undefined && !(typeof z.ratio === 'number' && z.ratio >= .5 && z.ratio <= 3)) add(`${w}.frame.ratio`, 'must be a number (height / width) between 0.5 and 3'); if (!isObj(z) || typeof z.image !== 'string' || !/^[\w\-/]+\.(webp|png|jpe?g|svg)$/.test(z.image)) add(`${w}.frame`, 'needs image: a file of the mod (webp, png, jpg or svg)'); else for (const [vn, v] of Object.entries(z.variants || {})) if (!isObj(v) || (v.image !== undefined && !/^[\w\-/]+\.(webp|png|jpe?g|svg)$/.test(v.image)) || (v.hue !== undefined && typeof v.hue !== 'number')) add(`${w}.frame.variants.${vn}`, 'must be { image?, hue? } (hue in degrees)'); continue; }
        if (zone === 'accentField') { if (typeof z !== 'string') add(`${w}.${zone}`, 'must be a field name'); continue; }
        if (!(zone in ZONES)) { add(`${w}.${zone}`, `unknown zone (the zones are: ${Object.keys(ZONES).join(', ')})`); continue; }
        if (z === null) continue;
        const boxes = zone === 'stats' ? (Array.isArray(z) ? z : []) : [z], isBox = b => b && ['x', 'y'].every(k => typeof b[k] === 'number' && b[k] >= 0 && b[k] <= 100) && ['w', 'h'].every(k => b[k] === undefined || (typeof b[k] === 'number' && b[k] > 0 && b[k] <= 100));
        if (zone !== 'frame') for (const b of boxes) if (isObj(b) && b.box !== undefined && !isBox(b.box)) add(`${w}.${zone}.box`, 'must be { x, y, w, h } in percent (0 to 100)');
        if (zone === 'stats') { if (!Array.isArray(z)) { add(`${w}.stats`, 'must be a list'); continue; } z.forEach((s, i) => { if (!isObj(s) || typeof s.field !== 'string' || !(['left', 'right'].includes(s.at) || (typeof s.x === 'number' && typeof s.y === 'number'))) add(`${w}.stats[${i}]`, 'needs a field and at: "left" or "right" (or x and y on a frame)'); }); continue; }
        if (!isObj(z)) { add(`${w}.${zone}`, 'must be an object'); continue; }
        if (zone === 'tags' && z.fields !== undefined && (!Array.isArray(z.fields) || !z.fields.length || z.fields.length > 2)) add(`${w}.tags.fields`, 'must list one or two fields');
        if (zone === 'body' && z.source !== undefined && z.source !== 'powers') add(`${w}.body.source`, 'must be "powers"');
        if ((zone === 'level' || zone === 'mark') && typeof z.field !== 'string') add(`${w}.${zone}`, 'needs a field');
        if (zone === 'sockets' && (typeof z.field !== 'string' || typeof z.filled !== 'string')) add(`${w}.sockets`, 'needs field and filled');
        for (const f of [z.field, z.filled, ...(z.fields || [])]) if (f && ctx.fieldsOf && k !== 'default' && ctx.fieldsOf(k) && !ctx.fieldsOf(k).includes(f) && !['sockets', 'slots', 'rank', 'maxhp', 'type', 'types', 'color'].includes(f)) add(`${w}.${zone}`, `field "${f}" is not a field of ${k}`);
        if (z.text && ctx.text && !ctx.text(z.text)) add(`${w}.${zone}`, `text "${z.text}" is missing`);
      }
      if (v.stats) for (const [i, s] of (Array.isArray(v.stats) ? v.stats : []).entries()) if (s && s.color && !/^(#[0-9a-fA-F]{3,8}|var\(.+\))$/.test(s.color)) add(`${w}.stats[${i}].color`, 'must be a color (#rrggbb or var(--name))');
    }
    return problems;
  }
  const api = { ZONES, DEFAULT, resolve, style, accents, palette, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CARD_LAYOUT = api;
})(typeof window !== 'undefined' ? window : globalThis);
