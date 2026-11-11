// Atlas Wanderer — data: constants, types, servants, equipment, heroes, dungeons (provisional content).
'use strict';
// =====================================================================
// DATA — everything that is not in documentation/idees/nouvelles.md is PROVISIONAL
// (content, figures, types). The rules, for their part, follow documentation/idees/nouvelles.md.
// =====================================================================
// Size and economy of the game: they are rules of the mod (data/rules.json, "game"), set when the mod is installed (CATALOG.install).
let MAX_BOARD, HAND_MAX, MAX_LEVEL, MAX_RANK, PROPOSALS, FUSION_COST, FUSION_STEP, PROPHECY_COST, INCOME, BOSS_BOARDS, PATCH_MAX;
// Reinforcement: a servant reinforcement and an equipment reinforcement, bought separately (1 Datacron each). Cards offered: 3 at levels 1-2, 4 at levels 3-4, 5 at levels 5-6.
const reinforcementProposals = level => { const t = RULES.reinforcement.proposals; return t[Math.min(level, t.length) - 1]; };   // data/rules.json
const reinforcementCost = kind => RULES.reinforcement.kinds[kind].cost;
// Datacrons gained at each reinforcement, depending on the room (provisional); beyond the table, the last value.
const incomeFor = room => INCOME[Math.min(room, INCOME.length) - 1];
// The Boss plays three independent boards, reinforced each room like a player (engine.js).
// malus: fewer Datacrons per room (1 = always one fewer, 0.5 = one fewer every other time).

// Rule: a skill is either combat or reinforcement, never both.
const TRIG_KIND = { active: 'renfort', startMission: 'renfort', startCombat: 'combat', deathrattle: 'combat', endCombat: 'combat', space: 'combat', onSummon: 'combat', allyDeath: 'combat', enemyDeath: 'combat', survive: 'combat', afterDamage: 'combat', shieldLost: 'combat', allyShieldLoss: 'combat', attackNoKill: 'combat', allySurvivesOwnAttack: 'combat', attackSurvive: 'combat', passive: 'combat', assault: 'combat', enemyAttacks: 'combat', onAllyHit: 'combat', battlecry: 'renfort', startReinforcement: 'renfort', endReinforcement: 'renfort' };

let UID = 0;
const uid = () => ++UID;
// Random numbers of the rules: the single source of randomness of the game logic (animations keep their own Math.random).
// Without a seed it uses Math.random; setSeed(n) makes every game reproducible (same seed = same game), setSeed(null) goes back to Math.random.
const mulberry32 = seed => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
let rngSource = null;
const rng = () => (rngSource ? rngSource() : Math.random());
const setSeed = seed => { rngSource = seed == null ? null : mulberry32(seed); };
const rand = n => Math.floor(rng() * n);
const pick = a => a[rand(a.length)];

// Reyes's cybernetic patch: X from 1 to 6, the value X being present (7 - X) times in the pool (the 1 six times, the 6 once).
const sk = (t, fx, a = 0, h = 0, n = 0) => ({ t, fx, a, h, n });
// Name of the power that gives a choice after the combat (game.json, choices.adaptation, who.power): it is shown as a keyword.
const choicePower = () => { const g = typeof GAME !== 'undefined' && GAME.def(), c = g && g.choices.adaptation; return c ? c.who.power : null; };
// Text parameters faces_<bag>: the faces of each bag of game.json (the texts of the powers that draw from it).
const bagParams = () => { const g = typeof GAME !== 'undefined' && GAME.def(); return g && g.bags ? Object.fromEntries(Object.entries(g.bags).filter(([k]) => k !== 'note').map(([k, b]) => [`faces_${k}`, b.faces.join(', ')])) : {}; };
// Description of a power. The text comes from data/i18n/<lang>.json: "desc.<fx>" for the effect, "trigger.<trigger>" for the prefix.
function skDesc(k, onEquipment = false) {
  if (k.fx === choicePower()) return I18N.t(`desc.${k.fx}`);   // the power that is played as a choice after the combat (game.json, choices.adaptation): its description is fixed
  // On an equipment, "desc.<fx>.equipment" replaces "desc.<fx>" when it exists (e.g. "to the carrier" instead of "to itself").
  const key = onEquipment && I18N.has(`desc.${k.fx}.equipment`) ? `desc.${k.fx}.equipment` : `desc.${k.fx}`;
  const text = I18N.t(key, { ...k, bf: `+${k.a}/+${k.h}`, both: k.a && k.h ? 1 : 0, isDeathrattle: k.t === 'deathrattle' ? 1 : 0,
    PATCH_MAX, ...bagParams(), PROPOSALS, MAX_RANK, PROPHECY_COST, FUSION_COST });
  if (k.t === 'passive' || k.fx === 'genDroide' || k.fx === 'forgeRoboticien' || k.fx === 'forgePatch') return text;   // a permanent power has no trigger
  return `${I18N.t(k.fx === 'completeFusion' ? 'trigger.activeFusion' : `trigger.${k.t}`, { type: k.of ? typeName(k.of) : '' })}${I18N.t('trigger.separator')}${text}`;   // Sulseye: active with no limit per reinforcement, its cost replaces the mention
}

// Powers displayed on a card, identical ones merged (×N). Keywords and Adaptation are "fixed": always the same,
// the card writes only their name. Skills (variable values) are described in full.
function powersOf(kws, skills, drone, spent = [], onEquipment = false) {
  const out = [], add = (id, key, name, text, kind, fixed) => {
    let p = out.find(q => q.id === id);
    if (!p) out.push(p = { id, key, name, text, kind, fixed, count: 0, spent: false });
    p.count++; return p;
  };
  kws.forEach(k => { if (VOCAB.keywords[k]) { const p = add('kw:' + k, k, I18N.t('keyword.' + k), I18N.t('keyword.' + k), 'combat', true); if (spent.includes(k)) p.spent = true; } });
  skills.forEach(k => k.fx === choicePower() ? add(k.fx, k.fx, I18N.t(`keyword.${k.fx}`), I18N.t(`desc.${k.fx}`), 'combat', true) : add(`${k.t}:${k.fx}:${k.a}:${k.h}:${k.n}`, k.fx, null, skDesc(k, onEquipment), TRIG_KIND[k.t], false));
  if (drone && (drone.a || drone.h)) add('drone', 'drone', null, I18N.t('ui.dronesSummoned', { a: drone.a, h: drone.h }), 'combat', false);
  return out;
}

// Types, keywords, colors and emblems come from the vocabulary of the mod (vocabulary.json): groups of types (a servant has one type of each group).
let VOCAB = { groups: [], families: {}, types: {}, keywords: {} }, TYPE_GROUPS = [], ALL_TYPES = [];
const typesOfGroup = id => (TYPE_GROUPS.find(g => g.id === id) || { types: [] }).types;
const typeName = t => I18N.text('fr', 'type.' + t) || t;   // card identifiers are built from the French names whatever the display language

// ---------- Cards ----------
// The cards are data: data/servants.json, equipment.json, heroes.json and dungeons.json (see CATALOG below). Removed cards stay in data/retired.json.
// Identifiers: one per card, FIXED UUIDs. The identifier never changes; the name is a label from data/i18n/fr.json (card.<id>), so renaming a card is a text change.
// For now the engine still identifies a few cards by their French name (idOf, copiesOf…): names are installed in French whatever the display language.
// New card: add it to the JSON file of its category with a fresh UUID (node -e "console.log(crypto.randomUUID())") and its name to data/i18n/fr.json.
let SERVANTS = [], EQUIPS = [], HEROES = {}, HEROES_RESERVE = {}, DUNGEONS = {};
let RULES = { fatigue: { start: 30, increment: 1 }, settlement: { player: { perRank: 1, flat: 0 }, boss: { perRank: 1, flat: 0 }, taunt: 'prov', absorb: 'shield' }, order: { profile: 'default', profiles: { default: { bands: ['boss', 'opponent', 'heroes', 'ally'], direction: 'leftToRight', replays: 'afterAll' } } },
  game: { maxBoard: 7, handMax: 7, maxLevel: 6, maxRank: 7, fusionRewardProposals: 3, fusionCost: 3, fusionStep: 0, prophecyCost: 60, levelCostOffset: 2, income: [3], bossBoards: [{ malus: 0 }], patchMax: 6 },
  sockets: { max: 3, colors: ['blue', 'green', 'red'], wildcard: 'chroma', uncoloredFitsAny: true, onReplace: 'returnToHand', onFusion: 'returnToHand', breakChance: 0.25 }, reinforcement: { proposals: [3, 3, 4, 4, 5, 5], kinds: { servant: { cost: 1 }, equip: { cost: 1 } } } };   // data/rules.json (game rules as data)
let IDENTIFIERS = { servants: {}, equipment: {}, heroes: {}, dungeons: {} };   // id -> French name, per category (removed cards included)
let IDS_BY_NAME = {};                                                               // French name -> id, per category
const idOf = (cat, name) => { const id = IDS_BY_NAME[cat][name]; if (!id) throw new Error(`Identifiant manquant : « ${name} » (${cat}) n'est pas dans IDENTIFIERS`); return id; };
const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // only used for the mini-bosses (identifier = dungeon + name)

// Mini-boss: one fixed servant per Boss board (rules of the mod: miniBoss). Its name comes from the text miniBoss.name.
const miniBoss = type => ({ ...RULES.miniBoss, name: I18N.format(I18N.text('fr', 'miniBoss.name'), { type: typeName(type) }), types: [type], sockets: [...RULES.miniBoss.sockets], kw: [...RULES.miniBoss.kw], fixed: true, skill: RULES.miniBoss.skill.map(k => ({ ...k })) });

const CATALOG = (() => {
  const FILES = ['servants', 'equipment', 'heroes', 'dungeons', 'retired', 'rules', 'vocabulary'];   // roles of the files of a mod (mod.json, "files")
  // files = { servants, equipment, heroes, dungeons, retired }: the parsed JSON files. Needs the French texts to be installed.
  function install(files) {
    if (files.vocabulary) {
      VOCAB = files.vocabulary; TYPE_GROUPS = VOCAB.groups; ALL_TYPES = TYPE_GROUPS.flatMap(g => g.types);
      if (typeof AWGfx !== 'undefined') AWGfx.setVocabulary(VOCAB);
    }
    if (files.rules) {
      RULES = files.rules;
      const gm = RULES.game;
      MAX_BOARD = gm.maxBoard; HAND_MAX = gm.handMax; MAX_LEVEL = gm.maxLevel; MAX_RANK = gm.maxRank; PROPOSALS = gm.fusionRewardProposals;
      FUSION_COST = gm.fusionCost; FUSION_STEP = gm.fusionStep; PROPHECY_COST = gm.prophecyCost; INCOME = gm.income; BOSS_BOARDS = gm.bossBoards;
      PATCH_MAX = gm.patchMax;
    }
    const nameOf = id => I18N.text('fr', `card.${id}`);
    const skill = list => (list.length === 0 ? null : list.length === 1 ? list[0] : list);   // the engine accepts null, one power or a list
    const withIds = (cards, build) => Object.entries(cards).map(([id, c]) => build(id, c));
    SERVANTS = withIds(files.servants.cards, (id, c) => ({ id, name: nameOf(id), rank: c.rank, atk: c.atk, hp: c.hp, types: c.types, sockets: c.sock || [], kw: c.kw, skill: skill(c.skill) }));
    EQUIPS = withIds(files.equipment.cards, (id, c) => ({ id, name: nameOf(id), rank: c.rank, atk: c.atk, hp: c.hp, kw: c.kw, type: c.type, color: c.color, skill: skill(c.skill), mod: c.mod }));
    const heroes = withIds(files.heroes.cards, (id, c) => ({ id, name: nameOf(id), types: c.types, hp: c.hp, kw: c.kw, power: c.power, reserve: !!c.reserve }));
    HEROES = {}; HEROES_RESERVE = {};
    heroes.forEach(h => { const reserve = h.reserve; delete h.reserve; HEROES[h.id] = h; if (reserve) HEROES_RESERVE[h.id] = h; });   // all heroes are offered for now
    DUNGEONS = {};
    withIds(files.dungeons.cards, (id, c) => ({ id, name: nameOf(id), type: c.type, minis: c.minis,
      boss: { name: I18N.text('fr', `boss.${id}`), hp: c.boss.hp, power: c.boss.power, desc: I18N.text('fr', `boss.${id}.desc`) } }))
      .forEach(d => {   // dungeon mini-boss: the one of its own type first, then those of the two other fixed types, one per board. Reference = dungeon + name.
        d.dummies = [d.type, ...d.minis].map(t => { const m = miniBoss(t); m.id = `${d.id}--${slug(m.name)}`; return m; });
        DUNGEONS[d.id] = d;
      });
    IDENTIFIERS = { servants: {}, equipment: {}, heroes: {}, dungeons: {} };
    for (const cat of Object.keys(IDENTIFIERS)) {
      const active = { servants: SERVANTS, equipment: EQUIPS, heroes: Object.values(HEROES), dungeons: Object.values(DUNGEONS) }[cat];
      active.forEach(c => { IDENTIFIERS[cat][c.id] = c.name; });
      files.retired.ids[cat].forEach(id => { IDENTIFIERS[cat][id] = nameOf(id); });
    }
    // name -> id: the removed cards first, so that an active card wins when two cards share a name
    IDS_BY_NAME = {};
    for (const cat of Object.keys(IDENTIFIERS)) {
      const retired = new Set(files.retired.ids[cat]);
      IDS_BY_NAME[cat] = {};
      Object.entries(IDENTIFIERS[cat]).filter(([id]) => retired.has(id)).concat(Object.entries(IDENTIFIERS[cat]).filter(([id]) => !retired.has(id)))
        .forEach(([id, name]) => { IDS_BY_NAME[cat][name] = id; });
    }
  }
  // Browser: loads the JSON files once the texts are there. Tools install the files directly.
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : I18N.ready.then(() => Promise.all(FILES.map(f => fetch(MOD.file(f), { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json(); })))).then(all => install(Object.fromEntries(FILES.map((f, i) => [f, all[i]]))));
  ready.catch(e => { I18N.banner(`Les cartes du jeu n'ont pas pu être chargées (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });
  return { install, ready };
})();
