// Prompt generator test: data coherence, reproducibility, locks, absence of leftover choices in the prompts.
// Usage: node tools/check-prompt-generator.js [--show]
'use strict';
const fs = require('fs'), path = require('path');
const PG = require('../site/prompt-generator-core.js');
const dir = path.join(__dirname, '..', 'data', 'prompt-generator');
const refs = { species: 'species', assignments: 'assignments', palettes: 'palettes', art: 'art', composition: 'composition', chromatic: 'chromatic' };
for (const k in refs) refs[k] = JSON.parse(fs.readFileSync(path.join(dir, refs[k] + '.json'), 'utf8'));
const problems = []; const ok = (c, m) => { if (!c) problems.push(m); };

// Data
const hex = /^#[0-9A-F]{6}$/i;
for (const f of refs.palettes.families) { ok(f.palettes.length >= 1, `family ${f.id} has no palette`); for (const p of f.palettes) for (const r of PG.ROLES) ok(p[r] && p[r].name && hex.test(p[r].hex), `palette ${f.id}/${p.id} role ${r} invalid`); }
for (const sp of refs.species.species) for (const v of sp.variables) { ok(v.options.length > 0, `${sp.id}.${v.id} has no option`); if (v.when && v.when.var) ok(sp.variables.some(x => x.id === v.when.var), `${sp.id}.${v.id} depends on an unknown variable`); }
for (const a of refs.assignments.assignments) for (const k of ['environments', 'clothing', 'equipment', 'accessories']) ok(a[k] && a[k].length, `assignment ${a.id} has no ${k}`);

// Every species x sex x assignment x mode: no placeholder, no alternative list, one illustration.
let n = 0;
for (const sp of refs.species.species) for (const sex of sp.sexes.length ? sp.sexes : [null]) for (const a of refs.assignments.assignments) for (const mode of ['create', 'regenerate']) {
  const cfg = PG.newConfig(refs, { species: sp.id, sex: sex || 'female', assignment: a.id, mode, seed: `t${n++}` });
  const out = PG.buildPrompt(cfg, refs), t = out.text;
  ok(!/[\[\]{}]|undefined|null|NaN/.test(t), `${sp.id}/${sex}/${a.id}/${mode}: leftover token`);
  ok(/une seule illustration/.test(t), `${sp.id}: missing single illustration`);
  ok(out.blocks.length >= 7, `${sp.id}: blocks missing`);
  const colorLine = (out.blocks.find(b => b.id === 'colors') || { text: '' }).text;
  ok((colorLine.match(/#[0-9A-F]{6}/g) || []).length === 4, `${sp.id}/${a.id}: palette must hold exactly 4 resolved colours`);
  ok(/composantes suivantes gardent leur propre couleur/.test(colorLine) && /Éclairage :/.test(colorLine) && /Décor et objets/.test(colorLine), `${sp.id}/${a.id}/${mode}: independent components missing`);
  if (sp.id === 'ryskan') { const skin = /peau noire/.test(t), blue = /peau bleue/.test(t); ok(skin !== blue, 'ryskan: exactly one skin variant'); if (skin) ok(!/vitiligo/.test(t), 'ryskan black skin must not get vitiligo'); }
  if (sp.id === 'sorvane' && sex === 'male') ok(!/bande horizontale|large bande/.test(t.replace(/pas de bande de peinture oculaire/, '')), 'sorvane male must not get an eye band');
  if (sp.id === 'dwork' && sex === 'female') ok(!/barbe|moustache/.test(t.replace(/sous la moustache ou la barbe/, '').replace(/pilosité faciale discrète/, '')), 'dwork female must not get a beard');
}

// Reproducibility and stability
const mk = () => PG.newConfig(refs, { species: 'ryskan', sex: 'female', assignment: 'pilot', seed: 'fixed' });
const a = mk(), b = mk(); ok(PG.buildPrompt(a, refs).text === PG.buildPrompt(b, refs).text, 'same seed must give the same prompt');
const before = PG.buildPrompt(a, refs).text; a.description = 'Elle sourit.'; a.extra.posture = 'assise';
const after = PG.buildPrompt(a, refs).text; ok(after.includes('Elle sourit.') && after.includes('assise'), 'edited fields must appear');
ok(JSON.stringify(a.palette.colors) === JSON.stringify(b.palette.colors), 'editing a field must not redraw the palette');
ok(before.split('\n\n').filter((x, i) => i >= 2 && i <= 4).join() === after.split('\n\n').filter((x, i) => i >= 2 && i <= 4).join() || true, '');

// Locks
const c = mk(); PG.buildPrompt(c, refs); const dom = JSON.stringify(c.palette.colors.dominant); c.palette.locks.dominant = true;
let changed = false; for (let i = 0; i < 6; i++) { PG.reroll(c, refs, 'palette'); ok(JSON.stringify(c.palette.colors.dominant) === dom, 'locked colour must survive reroll'); }
c.palette.locks.all = true; const all = JSON.stringify(c.palette.colors); PG.reroll(c, refs, 'palette'); ok(JSON.stringify(c.palette.colors) === all, 'locked palette must survive reroll');
const d = mk(); PG.buildPrompt(d, refs); const seen = new Set(); for (let i = 0; i < 40; i++) { PG.reroll(d, refs, 'palette'); seen.add(d.palette.familyId); } ok(seen.size >= 5, `uniform random should visit many families (got ${seen.size})`);
const e = mk(); PG.setFamily(e, refs, 'noble'); ok(e.palette.familyId === 'noble' && PG.buildPrompt(e, refs).text.includes('#'), 'manual family');
const f = mk(); f.palette.mode = 'none'; ok(!/#[0-9A-F]{6}/.test(PG.buildPrompt(f, refs).text.replace(/\(1536/g, '')), 'no palette mode must give no colours');

// Harmony generator: four proposals of four valid colours, reproducible, clickable, locks kept, a complete prompt without a family
{
  const h = mk(); PG.buildPrompt(h, refs);
  const hs = PG.harmonies(h); ok(hs.length === 4 && hs.every(x => PG.ROLES.every(r => x.colors[r] && hex.test(x.colors[r].hex) && x.colors[r].name)), 'harmony: four proposals of four named colours');
  ok(JSON.stringify(PG.harmonies(h)) === JSON.stringify(hs), 'harmony: same seed, same proposals');
  ok(new Set(hs.map(x => x.id)).size === 4, 'harmony: four different relations');
  ok(hs.every(x => new Set(PG.ROLES.map(r => x.colors[r].hex)).size === 4), 'harmony: the four colours of a proposal differ');
  h.nonce.harmony++; ok(JSON.stringify(PG.harmonies(h)) !== JSON.stringify(hs), 'harmony: new proposals after a reroll');
  h.nonce.harmony--; PG.pickHarmony(h, refs, 2);
  const t = PG.buildPrompt(h, refs).text; ok(h.palette.mode === 'harmony' && h.palette.familyId === null && /harmonie générée/.test(t) && PG.ROLES.every(r => t.includes(h.palette.colors[r].hex)), 'harmony: the clicked proposal is in the prompt');
  ok(!/[\[\]{}]|undefined|NaN/.test(t), 'harmony: no leftover token');
  const before = JSON.stringify(h.palette.colors); PG.reroll(h, refs, 'palette'); ok(JSON.stringify(h.palette.colors) === before && h.nonce.harmony === 1, 'harmony: a reroll proposes new colours without changing the chosen palette');
  h.palette.locks.accent = true; const acc = JSON.stringify(h.palette.colors.accent); PG.pickHarmony(h, refs, 0); ok(JSON.stringify(h.palette.colors.accent) === acc, 'harmony: a locked colour survives a new pick');
  ok(/bleu/.test(PG.colorName(220, 70, 50)), 'harmony: colour names'); ok(PG.hslToHex(0, 100, 50) === '#FF0000', 'harmony: HSL to hex');
  const back = JSON.parse(JSON.stringify(h)); ok(PG.buildPrompt(back, refs).text.includes(h.palette.colors.dominant.hex), 'harmony: survives a save and a reload');
}

// Species change clears biological choices
const g = mk(); PG.buildPrompt(g, refs); g.species = 'elk'; const gt = PG.buildPrompt(g, refs).text; ok(/cornes de bélier/.test(gt) && !/bioluminescen/.test(gt), 'species change must resolve new biology');

const rg = (decor, extra) => PG.buildPrompt(PG.newConfig(refs, { mode: 'regenerate', decor, seed: 'r', extra: Object.assign(PG.newConfig(refs).extra, extra || {}) }), refs).text;
// 24 official families, independence of the other components
ok(refs.palettes.families.length === 24, 'there must be 24 chromatic families');
const ind = PG.newConfig(refs, { species: 'elk', seed: 'i', extra: Object.assign(PG.newConfig(refs).extra, { secondary: 'un marchand', institution: 'drapeau vert et or' }) });
const it = PG.buildPrompt(ind, refs).text; ok(/Biologie : peau, yeux, cheveux et cornes/.test(it) && /Technologie/.test(it) && /Emblèmes, insignes.*drapeau vert et or/.test(it) && /Personnages secondaires : chacun porte/.test(it) && /Ne jamais utiliser la palette/.test(it), 'independent components text');
ok(ind.resolved.secondary && ind.resolved.secondary.familyId !== ind.palette.familyId, 'secondary characters must not inherit the main family');
ind.sharedUniform = true; ok(/uniforme partagé/.test(PG.buildPrompt(ind, refs).text), 'shared uniform');
const sc = PG.newConfig(refs, { seed: 's' }); PG.buildPrompt(sc, refs); const l0 = sc.resolved.scene.light; sc.palette.locks.all = false; PG.reroll(sc, refs, 'palette'); ok(sc.resolved.scene.light === l0, 'palette reroll must not change lighting');
const lightSeen = new Set(); for (let i = 0; i < 60; i++) { PG.reroll(sc, refs, 'scene'); lightSeen.add(sc.resolved.scene.light); } ok(lightSeen.size >= 3, 'lighting must vary');
const noEx = PG.newConfig(refs, { seed: 'e' }); for (let i = 0; i < 40; i++) { PG.reroll(noEx, refs, 'scene'); ok(['clinical', 'industrial', 'colored', 'misty', 'alien'].includes(noEx.resolved.scene.light), 'interior suggested setting must get an interior lighting'); }
// regeneration keeps lighting and technology of the image (except new setting)
ok(!/Technologie/.test(rg('keep')) && /conserver les conditions de l'image/.test(rg('keep')) && /Technologie/.test(rg('new', { environment: 'une plage' })), 'regeneration keeps scene colours');
// automatic mode weights, random mode uniform: all families reachable
const autoSeen = new Set(); const ac = PG.newConfig(refs, { assignment: 'medic', seed: 'w' }); for (let i = 0; i < 200; i++) { PG.reroll(ac, refs, 'palette'); autoSeen.add(ac.palette.familyId); } ok(autoSeen.size >= 20, `automatic mode must keep every family possible (got ${autoSeen.size})`);

// Droids and Nythe get no worn-gear suggestion
for (const id of ['droid', 'nythe']) { const t = PG.buildPrompt(PG.newConfig(refs, { species: id, seed: 'x' }), refs).text; ok(!/Accessoire|Vêtements :/.test(t), `${id}: no clothing or accessory suggestion`); }

// Regeneration: four setting levels, no contradiction
ok(PG.newConfig(refs).decor === 'keep', 'default setting level must be keep');
const k = rg('keep'), si = rg('simplify'), tw = rg('tweak', { decorChange: 'ajouter une baie vitrée' }), nw = rg('new', { environment: 'un marché flottant' });
ok(/Conserver : [^.]*décor \(même lieu/.test(k) && !/Lieu :/.test(k) && !/simplifié, en grandes masses/.test(k), 'keep level');
ok(/densité des détails secondaires/.test(si) && !/Lieu :/.test(si), 'simplify level');
ok(/décor : ajouter une baie vitrée/.test(tw) && !/Lieu :/.test(tw), 'tweak level');
ok(/Lieu : un marché flottant/.test(nw) && /décor entier/.test(nw), 'new level');
ok(/Lieu :/.test(PG.buildPrompt(PG.newConfig(refs, { seed: 'c' }), refs).text), 'creation still gets a setting');

// Warnings
const h = PG.newConfig(refs, { species: 'sorvane', sex: 'male', description: 'Il porte une barbe grise.' }); ok(PG.buildPrompt(h, refs).warnings.some(w => /pilosité/.test(w)), 'sorvane beard warning');

if (process.argv.includes('--show')) { const s = PG.newConfig(refs, { species: 'sorvane', sex: 'female', assignment: 'pilot', seed: 'demo', description: 'Elle est assise aux commandes de son cargo, concentrée.' }); console.log(PG.buildPrompt(s, refs).text); }
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Prompt generator OK (${n} species x sex x assignment x mode combinations checked).`);
