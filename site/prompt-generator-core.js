// Atlas Wanderer — illustration prompt generator: engine (no UI, no AI).
// Works in the browser (window.PromptGen) and in Node (require). Everything is built from the data in data/prompt-generator/.
// Random choices are made once, stored in config.resolved, and only redone on request (reroll) or when their inputs change.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PromptGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROLES = ['dominant', 'secondary', 'accent', 'neutral'];
  const ROLE_LABEL = { dominant: 'dominante', secondary: 'secondaire', accent: 'accent', neutral: 'neutre' };

  // ---------- Seeded random (reproducible) ----------
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seedStr => { let a = hash(seedStr); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (list, rand) => list[Math.floor(rand() * list.length)];
  const newSeed = () => Math.random().toString(36).slice(2, 10);

  // ---------- Referentials ----------
  const byId = (list, id) => list.find(x => x.id === id);
  const speciesOf = (cfg, refs) => byId(refs.species.species, cfg.species);
  const assignmentOf = (cfg, refs) => byId(refs.assignments.assignments, cfg.assignment);
  const versionOf = refs => ({ species: refs.species.version, assignments: refs.assignments.version, palettes: refs.palettes.version, art: refs.art.version, composition: refs.composition.version, chromatic: refs.chromatic.version });

  // ---------- Configuration ----------
  const newConfig = (refs, patch) => {
    const cfg = {
      illustrationType: 'character', mode: 'create', species: refs.species.species[0].id, sex: 'female', assignment: refs.assignments.assignments[0].id,
      description: '', extra: { age: '', morphology: '', posture: '', expression: '', clothing: '', equipment: '', environment: '', lighting: '', secondary: '', constraints: '', keep: '', change: '', decorChange: '', institution: '' },
      sharedUniform: false,   // secondary characters wear the same outfit (explicit shared uniform)
      sceneChoices: { light: '', tech: '' },   // '' = automatic
      decor: 'keep',   // regeneration only: keep | simplify | tweak | new
      bioChoices: {},   // variable id -> option id | 'none' ; absent = automatic
      palette: { mode: 'auto', familyId: null, paletteId: null, colors: null, locks: { all: false, dominant: false, secondary: false, accent: false, neutral: false } },
      composition: { framing: 'wide', marginMin: null, marginMax: null },
      seed: newSeed(), nonce: { bio: 0, style: 0, palette: 0, scene: 0, harmony: 0 }, resolved: {}, referentials: versionOf(refs)
    };
    return Object.assign(cfg, patch || {});
  };

  const sexApplies = sp => sp.sexes && sp.sexes.length > 0;
  const effectiveSex = (cfg, sp) => sexApplies(sp) ? (sp.sexes.includes(cfg.sex) ? cfg.sex : sp.sexes[0]) : null;

  // ---------- Resolution of random choices ----------
  const whenOk = (v, ctx) => !v.when || ((!v.when.sex || v.when.sex === ctx.sex) && (!v.when.var || ctx.vars[v.when.var] === v.when.is));

  function resolveBio(cfg, refs, reroll) {
    const sp = speciesOf(cfg, refs), sex = effectiveSex(cfg, sp), r = cfg.resolved;
    const key = sp.id + '|' + sex;
    if (reroll || r.bioKey !== key) { r.bio = {}; r.bioKey = key; }
    const rand = rng(`${cfg.seed}|bio|${cfg.nonce.bio}`), ctx = { sex, vars: {} };
    for (const v of sp.variables) {
      if (!whenOk(v, ctx)) { delete r.bio[v.id]; continue; }
      const forced = cfg.bioChoices[v.id];
      let value;
      if (forced === 'none') value = null;
      else if (forced && byId(v.options, forced)) value = forced;
      else if (v.id in r.bio && (r.bio[v.id] === null || byId(v.options, r.bio[v.id]))) value = r.bio[v.id];
      else value = v.optional && rand() >= v.chance ? null : pick(v.options, rand).id;
      r.bio[v.id] = value; ctx.vars[v.id] = value;
    }
    return r.bio;
  }

  function resolveStyle(cfg, refs, reroll) {
    const sp = speciesOf(cfg, refs), as = assignmentOf(cfg, refs), r = cfg.resolved, key = sp.id + '|' + as.id;
    if (reroll || r.styleKey !== key) { r.style = {}; r.styleKey = key; }
    const rand = rng(`${cfg.seed}|style|${cfg.nonce.style}`), s = r.style;
    if (s.environment === undefined) s.environment = pick(as.environments, rand);
    if (s.clothing === undefined) s.clothing = sp.wearsClothing ? pick(as.clothing, rand) : null;
    // Worn gear only makes sense for species that wear clothes (not droids or Nythe).
    if (s.equipment === undefined) s.equipment = sp.wearsClothing ? pick(as.equipment, rand) : null;
    if (s.accessory === undefined) s.accessory = sp.wearsClothing && rand() < 0.5 ? pick(as.accessories, rand) : null;
    return s;
  }

  // Automatic mode: every family stays possible; the ones suggested for the assignment weigh double (never forced).
  // Random mode: strictly uniform.
  function pickFamily(cfg, refs, rand) {
    const fams = refs.palettes.families;
    if (cfg.palette.mode !== 'auto') return pick(fams, rand);
    const aff = new Set(assignmentOf(cfg, refs).affinities || []), w = fams.map(f => aff.has(f.id) ? 2 : 1);
    let x = rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < fams.length; i++) { x -= w[i]; if (x < 0) return fams[i]; }
    return fams[fams.length - 1];
  }

  function resolvePalette(cfg, refs, reroll) {
    const p = cfg.palette, fams = refs.palettes.families;
    if (p.mode === 'none') { cfg.resolved.palette = null; return null; }
    if (p.locks.all && p.colors) return p.colors;
    if (p.mode === 'harmony') { if (!p.colors) pickHarmony(cfg, refs, p.harmonyIndex || 0); return p.colors; }   // the colours come from the harmony the user clicked
    const rand = rng(`${cfg.seed}|palette|${cfg.nonce.palette}`);
    if (reroll || !p.colors || (p.familyId && !byId(fams, p.familyId))) {
      let fam = p.mode === 'manual' && p.familyId ? byId(fams, p.familyId) : null;
      if (!fam) fam = pickFamily(cfg, refs, rand);
      let pal = p.mode === 'manual' && p.paletteId && !reroll ? byId(fam.palettes, p.paletteId) : null;
      if (!pal) pal = pick(fam.palettes, rand);
      p.familyId = fam.id; p.paletteId = pal.id;
      const old = p.colors || {}; p.colors = {};
      for (const role of ROLES) p.colors[role] = p.locks[role] && old[role] ? old[role] : Object.assign({}, pal[role]);
    }
    return p.colors;
  }

  // Secondary characters never inherit the main outfit family (unless a shared uniform is declared).
  function resolveSecondary(cfg, refs, reroll) {
    const r = cfg.resolved, p = cfg.palette;
    if (!clean(cfg.extra.secondary) || cfg.sharedUniform || p.mode === 'none' || !p.familyId) { r.secondary = null; return null; }
    if (!reroll && r.secondary && r.secondary.forFamily === p.familyId) return r.secondary;
    const rand = rng(`${cfg.seed}|secondary|${cfg.nonce.palette}`);
    const fam = pick(refs.palettes.families.filter(f => f.id !== p.familyId), rand), pal = pick(fam.palettes, rand);
    r.secondary = { forFamily: p.familyId, familyId: fam.id, dominant: pal.dominant, secondary: pal.secondary };
    return r.secondary;
  }

  // Scene components independent from the outfit: lighting and technology colours. User text or a forced choice wins.
  function resolveScene(cfg, refs, reroll) {
    const r = cfg.resolved, ch = refs.chromatic, userEnv = !!clean(cfg.extra.environment), key = String(userEnv);
    if (reroll || r.sceneKey !== key) { r.scene = {}; r.sceneKey = key; }
    const rand = rng(`${cfg.seed}|scene|${cfg.nonce.scene}`), s = r.scene, f = cfg.sceneChoices;
    const lights = ch.lighting.filter(l => userEnv || l.setting !== 'exterior');   // suggested settings are interiors
    if (f.light && byId(ch.lighting, f.light)) s.light = f.light; else if (!s.light || !byId(ch.lighting, s.light)) s.light = pick(lights, rand).id;
    if (f.tech && byId(ch.technology, f.tech)) s.tech = f.tech; else if (!s.tech || !byId(ch.technology, s.tech)) s.tech = pick(ch.technology, rand).id;
    return s;
  }

  const resolveAll = (cfg, refs) => {
    cfg.nonce.scene = cfg.nonce.scene || 0; cfg.nonce.harmony = cfg.nonce.harmony || 0; cfg.sceneChoices = cfg.sceneChoices || { light: '', tech: '' }; cfg.extra.institution = cfg.extra.institution || ''; cfg.palette.mode = cfg.palette.mode === 'random' && cfg.palette.colors === undefined ? 'auto' : cfg.palette.mode;
    resolveBio(cfg, refs); resolveStyle(cfg, refs); resolvePalette(cfg, refs); resolveSecondary(cfg, refs); resolveScene(cfg, refs); return cfg;
  };

  // group: 'bio' | 'style' | 'palette' | 'all'
  function reroll(cfg, refs, group) {
    const groups = group === 'all' ? ['bio', 'style', 'palette', 'scene'] : [group];
    resolveAll(cfg, refs);
    for (const g of groups) {
      cfg.nonce[g]++;
      if (g === 'bio') resolveBio(cfg, refs, true); else if (g === 'style') resolveStyle(cfg, refs, true); else if (g === 'palette') { if (cfg.palette.mode === 'harmony') cfg.nonce.harmony++; else { resolvePalette(cfg, refs, true); resolveSecondary(cfg, refs, true); } } else resolveScene(cfg, refs, true);
    }
    return cfg;
  }

  // ---------- Harmony generator ----------
  // A second way to get the outfit colours: four proposals of four colours (dominant, secondary, accent, neutral) built on colour-wheel relations, from a seeded random
  // base hue. The user clicks the proposal he likes (pickHarmony); a reroll proposes four others (nonce.harmony). Names are written in French for the prompt.
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function hslToHex(h, sat, lig) {
    const s = sat / 100, l = lig / 100, k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const HUE_NAMES = [[0, 'rouge'], [14, 'vermillon'], [32, 'orange'], [48, 'ambre'], [62, 'jaune'], [80, 'vert anis'], [100, 'vert'], [150, 'vert émeraude'], [172, 'turquoise'], [192, 'cyan'], [212, 'bleu azur'], [232, 'bleu'], [256, 'indigo'], [278, 'violet'], [300, 'magenta'], [326, 'rose'], [345, 'carmin']];
  function colorName(h, s, l) {
    if (s < 13) return l < 15 ? 'noir' : l < 38 ? 'gris anthracite' : l < 62 ? 'gris' : l < 86 ? 'gris clair' : 'blanc cassé';
    h = ((h % 360) + 360) % 360;
    let base = HUE_NAMES[0][1]; for (const [at, n] of HUE_NAMES) if (h >= at) base = n;
    if (h >= 14 && h < 50 && l < 34) base = 'brun';
    const q = l < 30 ? 'foncé' : l > 72 ? 'clair' : s < 38 ? 'grisé' : s > 74 ? 'vif' : '';
    return q ? `${base} ${q}` : base;
  }
  // Each scheme: for the four roles, [hue offset from the proposal's base hue, saturation %, lightness %].
  const SCHEMES = [
    { id: 'complementary', label: 'Complémentaire', roles: [[0, 42, 34], [16, 32, 50], [180, 58, 54], [0, 9, 82]] },
    { id: 'analogous', label: 'Analogue', roles: [[0, 40, 36], [30, 34, 52], [-40, 56, 54], [14, 8, 20]] },
    { id: 'triadic', label: 'Triade éclatée', roles: [[0, 38, 32], [150, 30, 46], [210, 58, 54], [0, 7, 80]] },
    { id: 'square', label: 'Carré', roles: [[0, 36, 34], [90, 32, 44], [180, 56, 55], [270, 9, 24]] }
  ];
  function harmonies(cfg) {
    const rand = rng(`${cfg.seed}|harmony|${cfg.nonce.harmony || 0}`), base = rand() * 360, turn = Math.floor(rand() * SCHEMES.length);
    return SCHEMES.map((_, k) => {
      const sc = SCHEMES[(k + turn) % SCHEMES.length], h0 = base + k * 90 + (rand() - 0.5) * 30, colors = {};
      ROLES.forEach((role, r) => {
        const [off, sat, lig] = sc.roles[r], h = (h0 + off + (rand() - 0.5) * 12 + 720) % 360, s = clamp(sat + (rand() - 0.5) * 8, 4, 70), l = clamp(lig + (rand() - 0.5) * 6, 10, 90);
        colors[role] = { name: colorName(h, s, l), hex: hslToHex(h, s, l) };
      });
      return { id: sc.id, label: sc.label, colors };
    });
  }
  // The user clicks a proposal: it becomes the outfit palette (locked colours are kept).
  function pickHarmony(cfg, refs, index) {
    const p = cfg.palette, h = harmonies(cfg)[index] || harmonies(cfg)[0];
    p.mode = 'harmony'; p.familyId = null; p.paletteId = null; p.harmonyIndex = index || 0; p.harmonyId = h.id;
    const old = p.colors || {}; p.colors = {};
    for (const role of ROLES) p.colors[role] = p.locks[role] && old[role] ? old[role] : Object.assign({}, h.colors[role]);
    cfg.resolved.secondary = null;
    return cfg;
  }

  // Choose a family (and optionally a palette) by hand: locked colours are kept.
  function setFamily(cfg, refs, familyId, paletteId) {
    const p = cfg.palette; p.mode = 'manual'; p.familyId = familyId; p.paletteId = paletteId || null;
    const fam = byId(refs.palettes.families, familyId); if (!fam) return cfg;
    const pal = (paletteId && byId(fam.palettes, paletteId)) || pick(fam.palettes, rng(`${cfg.seed}|fam|${familyId}|${cfg.nonce.palette}`));
    p.paletteId = pal.id;
    const old = p.colors || {}; p.colors = {};
    for (const role of ROLES) p.colors[role] = p.locks[role] && old[role] ? old[role] : Object.assign({}, pal[role]);
    resolveSecondary(cfg, refs);
    return cfg;
  }

  // ---------- Text helpers ----------
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const sentence = s => { s = clean(s); return s ? (/[.!?…]$/.test(s) ? s : s + '.') : ''; };
  const colorText = c => `${c.name} (${c.hex.toUpperCase()})`;
  const compositionOf = (cfg, refs) => { const t = refs.composition.types[cfg.illustrationType] || refs.composition.types.character, c = cfg.composition; return Object.assign({}, t, { marginMin: c.marginMin == null ? t.marginMin : c.marginMin, marginMax: c.marginMax == null ? t.marginMax : c.marginMax, framing: t.framings.find(f => f.id === c.framing) || t.framings[0] }); };

  // ---------- Warnings ----------
  function warnings(cfg, refs) {
    const w = [], sp = speciesOf(cfg, refs), sex = effectiveSex(cfg, sp), e = cfg.extra;
    const text = [cfg.description, e.age, e.morphology, e.posture, e.expression, e.clothing, e.equipment, e.environment, e.secondary, e.constraints, e.keep, e.change].join(' \n ').toLowerCase();
    for (const c of sp.conflicts || []) if ((!c.sex || c.sex === sex) && new RegExp(c.pattern, 'i').test(text)) w.push(`${sp.name} : ${c.message}`);
    const m = compositionOf(cfg, refs); if (m.marginMin > m.marginMax) w.push('Marge supérieure : le minimum dépasse le maximum.');
    if (m.marginMin < 10) w.push('Marge supérieure inférieure à 10 % : le personnage risque d’être collé au bord (le document artistique demande 10 à 15 %).');
    if (cfg.mode === 'regenerate') w.push('Régénération : joindre l’image à redessiner au moment de la génération.');
    if (cfg.palette.mode === 'none') w.push('Aucune palette automatique : les couleurs vestimentaires ne sont pas précisées (utile seulement si elles sont déjà imposées dans la description).');
    return w;
  }

  // ---------- Prompt ----------
  function buildPrompt(cfg, refs) {
    resolveAll(cfg, refs);
    const sp = speciesOf(cfg, refs), as = assignmentOf(cfg, refs), sex = effectiveSex(cfg, sp), e = cfg.extra;
    const regen = cfg.mode === 'regenerate', decor = regen ? (cfg.decor || 'keep') : 'new', bio = cfg.resolved.bio, comp = compositionOf(cfg, refs), colors = cfg.palette.mode === 'none' ? null : cfg.palette.colors;
    // Regeneration keeps the nature of the original outfit and setting: suggestions only apply to a creation.
    const style = regen ? { environment: null, clothing: null, equipment: null, accessory: null } : cfg.resolved.style;
    const role = sex ? as.role[sex] : as.role.male;
    const blocks = [];

    // 1. Objective
    let o = cfg.mode === 'regenerate'
      ? "Redessiner le personnage de l'image fournie pour Atlas Wanderer, un jeu de cartes de science-fiction de type space opera. L'image fournie est une référence d'identité et de contexte, pas de style, de composition ni de couleurs vestimentaires : ne pas appliquer un simple filtre coloré, reconstruire véritablement les couleurs."
      : "Créer une illustration originale de personnage pour Atlas Wanderer, un jeu de cartes de science-fiction de type space opera.";
    if (cfg.mode === 'regenerate') {
      const keep = ['identité et caractéristiques physiques', 'sexe et âge apparent', 'morphologie', 'affectation et fonction', 'nature des vêtements et des équipements', 'contexte narratif'];
      const change = ['direction artistique', 'composition', 'couleurs des vêtements', 'matériaux et finitions'];
      // Setting: four levels of freedom.
      if (decor === 'keep') keep.push('décor (même lieu, mêmes éléments, mêmes couleurs)');
      else if (decor === 'simplify') { keep.push('lieu et nature du décor'); change.push('couleurs et luminosité du décor', 'densité des détails secondaires du décor, à simplifier'); }
      else if (decor === 'tweak') { keep.push('lieu et nature du décor'); change.push(clean(e.decorChange) ? `décor : ${clean(e.decorChange)}` : 'détails du décor'); }
      else change.push('décor entier, remplacé par un nouveau lieu (voir plus bas)');
      keep.push('couleurs biologiques et institutionnelles');
      if (decor === 'keep' || decor === 'tweak') keep.push("conditions d'éclairage");
      if (clean(e.keep)) keep.push(clean(e.keep));
      if (clean(e.change)) change.unshift(clean(e.change));
      o += ` Conserver : ${keep.join(', ')}. Réinterpréter librement : ${change.join(', ')}.`;
    }
    blocks.push({ id: 'objective', title: 'Objectif', text: o });

    // 2. Subject
    const who = sex === 'male' ? 'un homme' : sex === 'female' ? 'une femme' : 'un personnage';
    const lines = [];
    lines.push(sentence(`Personnage principal : ${who} ${sp.name}${clean(e.age) ? ', ' + clean(e.age) : ''}, ${role}`));
    lines.push(sentence(`Fonction : ${as.function}`));
    if (clean(e.morphology)) lines.push(sentence(`Morphologie : ${e.morphology}`));
    if (clean(cfg.description)) lines.push(sentence(cfg.description));
    if (clean(e.posture)) lines.push(sentence(`Posture : ${e.posture}`));
    if (clean(e.expression)) lines.push(sentence(`Expression : ${e.expression}`));
    if (!regen || decor === 'new') { if (clean(e.environment) || style.environment) lines.push(sentence(`Lieu : ${clean(e.environment) || style.environment}`)); }
    if (clean(e.secondary)) lines.push(sentence(`Personnages secondaires : ${e.secondary}. Le personnage principal reste le sujet dominant`));
    blocks.push({ id: 'subject', title: 'Sujet principal', text: lines.join('\n') });

    // 3. Biology
    const bl = [sentence(`${sp.name} : ${sp.summary}`)];
    for (const m of sp.mandatory) bl.push('- ' + cap(m));
    for (const m of (sp.sexMandatory && sex && sp.sexMandatory[sex]) || []) bl.push('- ' + cap(m));
    for (const v of sp.variables) { const id = bio[v.id]; if (!id) continue; bl.push(`- ${v.label} : ${byId(v.options, id).text}`); }
    blocks.push({ id: 'biology', title: 'Biologie', text: bl.join('\n') });

    // 4. Clothing and equipment
    const cl = [], suggested = !clean(e.clothing) && !clean(e.equipment);
    const clothing = clean(e.clothing) || style.clothing, equipment = clean(e.equipment) || style.equipment;
    if (clothing) cl.push(sentence(`Vêtements : ${clothing}`));
    if (equipment) cl.push(sentence(`Équipement : ${equipment}`));
    if (suggested && style.accessory) cl.push(sentence(`Accessoire : ${style.accessory}`));
    if (cl.length) { if (!regen || clothing || equipment) cl.push(sentence(`La tenue et l'équipement correspondent à la fonction de ${role}`)); blocks.push({ id: 'outfit', title: 'Vêtements et équipements', text: cl.join('\n') }); }

    // 5. Colours: the outfit palette, then every other component stated as independent from it.
    const ch = refs.chromatic, scene = cfg.resolved.scene, sec = cfg.resolved.secondary, sceneNew = !regen || decor === 'new';
    const cb = [];
    if (colors) {
      const fam = byId(refs.palettes.families, cfg.palette.familyId), origin = fam ? `famille ${fam.name}` : 'harmonie générée';
      cb.push(`Palette de la tenue (${origin}), appliquée à ${sp.paletteScope} : ` + ROLES.map(r => `${ROLE_LABEL[r]} ${colorText(colors[r])}`).join(', ') + '. Utiliser ces couleurs sur de grandes masses, pas seulement sur les bordures.');
    }
    const ind = [];
    if (sp.colorsNote) ind.push(`Biologie : ${sp.colorsNote}, jamais recolorés pour s'assortir à la tenue`);
    if (regen && (decor === 'keep' || decor === 'tweak')) ind.push("Décor et objets : conserver les couleurs locales de l'image fournie");
    else ind.push("Décor et objets : couleurs choisies selon leur matière et le contexte, sans les assortir à la tenue ni les rendre systématiquement gris ; chaque objet garde sa couleur locale ; décor moins détaillé et moins contrasté que le personnage");
    if (sceneNew) ind.push(`Technologie (écrans, hologrammes, émissions énergétiques) : ${byId(ch.technology, scene.tech).text}, sans reprendre les accents de la tenue`);
    if (clean(e.institution)) ind.push(`Emblèmes, insignes et couleurs de faction : ${clean(e.institution)}, sans les recolorer pour les assortir à la tenue`);
    if (clean(e.secondary)) ind.push(cfg.sharedUniform ? 'Personnages secondaires : uniforme partagé avec le personnage principal, aux couleurs de la palette ci-dessus'
      : `Personnages secondaires : chacun porte sa propre tenue, de dominante distincte de celle du personnage principal et des autres${sec ? ` (par exemple le premier en ${sec.dominant.name} et ${sec.secondary.name})` : ''}`);
    if (clean(e.lighting)) ind.push(`Éclairage : ${clean(e.lighting)}`);
    else if (sceneNew) ind.push(`Éclairage : ${byId(ch.lighting, scene.light).text}, indépendant de la tenue`);
    else ind.push("Éclairage : conserver les conditions de l'image fournie");
    cb.push(`Les composantes suivantes gardent leur propre couleur, indépendante de la tenue :\n` + ind.map(x => '- ' + x).join('\n'));
    cb.push("Ne jamais utiliser la palette de la tenue comme filtre, ambiance générale ou palette globale.");
    blocks.push({ id: 'colors', title: 'Couleurs', text: cb.join('\n') });

    // 6. Art direction
    // A setting kept as is cannot be "simplified" by the art direction.
    const asIs = regen && (decor === 'keep' || decor === 'tweak');
    blocks.push({ id: 'art', title: 'Direction artistique', text: asIs ? refs.art.synthetic.replace(', simplifié, en grandes masses', '') : refs.art.synthetic });

    // 7. Composition
    const mt = `Le point le plus haut du personnage, y compris cheveux, cornes, oreilles, casque ou accessoires, se situe entre ${comp.marginMin} et ${comp.marginMax} % de la hauteur de l'image depuis le bord supérieur (environ ${Math.round(comp.height * comp.marginMin / 100)} à ${Math.round(comp.height * comp.marginMax / 100)} pixels sur ${comp.height}).`;
    blocks.push({ id: 'composition', title: 'Composition', text: [sentence(comp.format), sentence(cap(comp.framing.text)), ...comp.rules.map(r => asIs && /^Arrière-plan/.test(r) ? sentence('Arrière-plan fidèle à l\'image fournie et visuellement secondaire, sans bande vide ni bordure') : sentence(r)), mt].join('\n') });

    // 8. Essential constraints
    const cons = [`Produire une seule illustration, sans ${comp.bans.join(', sans ')}.`];
    cons.push(`À éviter : ${[...sp.forbidden, ...refs.art.bans, ...refs.chromatic.bans].join(' ; ')}.`);
    if (clean(e.constraints)) cons.push(sentence(`Contraintes particulières : ${e.constraints}`));
    blocks.push({ id: 'constraints', title: 'Contraintes essentielles', text: cons.join('\n') });

    return { text: blocks.map(b => b.text).join('\n\n'), blocks, warnings: warnings(cfg, refs) };
  }

  return { resolveSecondary, resolveScene, ROLES, ROLE_LABEL, newConfig, resolveAll, reroll, setFamily, harmonies, pickHarmony, colorName, hslToHex, buildPrompt, warnings, versionOf, speciesOf, assignmentOf, effectiveSex, sexApplies, whenOk, compositionOf, byId, rng, hash };
});
