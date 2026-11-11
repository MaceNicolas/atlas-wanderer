// Atlas Wanderer — data: constants, types, servants, equipment, heroes, dungeons (provisional content).
'use strict';
// =====================================================================
// DATA — everything that is not in documentation/idees/nouvelles.md is PROVISIONAL
// (content, figures, types). The rules, for their part, follow documentation/idees/nouvelles.md.
// =====================================================================
const MAX_BOARD = 7;          // rule: board of 7
const MAX_LEVEL = 6;          // open: max reinforcement level (provisional); equal to the maximum rank offered at reinforcement
const PROPHECY_COST = 60;     // Datacrons to spend for Hal Ana's servant to come into play (provisional)
const FUSION_COST = 3;        // Sulseye: cost of her power, in Datacrons (always the same)
const FUSION_STEP = 0;        // Sulseye: extra cost added after each use (none: the cost stays fixed)
const MAX_RANK = 7;           // rank 7: only as a fusion reward
const PROPOSALS = 3;          // fusion reward: number of proposals (provisional)
// Reinforcement: a servant reinforcement and an equipment reinforcement, bought separately (1 Datacron each). Cards offered: 3 at levels 1-2, 4 at levels 3-4, 5 at levels 5-6.
const reinforcementProposals = level => level >= 5 ? 5 : level >= 3 ? 4 : 3;
const BREAK_CHANCE = 0.25;    // equipment given back to the hand when its servant is replaced or fused: chance that it breaks and is lost (provisional)
const MAX_SOCKETS = 3;        // a servant never has more than 3 equipment sockets
const HAND_MAX = 7;           // hand: 7 slots (servants and equipment alike)
// Datacrons gained at each reinforcement, depending on the room (provisional); beyond the table, the last value.
const INCOME = [3, 3, 4, 3, 5, 3, 4, 4, 5, 4, 4, 5, 4, 5, 5, 4, 5, 5, 5, 5];
const incomeFor = room => INCOME[Math.min(room, INCOME.length) - 1];
// The Boss plays three independent boards, reinforced each room like a player (engine.js).
// malus: fewer Datacrons per room (1 = always one fewer, 0.5 = one fewer every other time).
const BOSS_BOARDS = [{ malus: 1 }, { malus: 0.5 }, { malus: 0 }];

// Behaviors of the Boss's boards (provisional). Each game draws three different ones, one per board.
//   want(room)   : number of servants aimed for before investing elsewhere;
//   level(room)  : reinforcement level aimed for at this room;
//   equipP       : probability of buying an equipment rather than a servant once the board is full;
//   score(t, c)  : value of an offered card (the best is chosen, see cardScore in engine.js);
//   target(t)    : board servant that receives an equipment.
const BOSS_BEHAVIORS = {
  equilibre: { name: 'Équilibré', desc: 'Remplit son plateau peu à peu et monte de niveau régulièrement.',
    want: room => Math.min(MAX_BOARD, 3 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 3), equipP: 0.4 },
  horde: { name: 'Horde', desc: 'Remplit vite son plateau, monte lentement de niveau et équipe peu.',
    want: room => Math.min(MAX_BOARD, 4 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 5), equipP: 0.2,
    target: t => t.board.reduce((b, s) => (s.equips.length < b.equips.length ? s : b)) },   // spreads the equipment
  elite: { name: 'Élite', desc: 'Petit plateau de serviteurs de haut rang, niveau de renfort monté très vite.',
    want: room => Math.min(MAX_BOARD, 2 + Math.floor(room / 4)), level: room => 1 + Math.floor(room / 2), equipP: 0.6,
    score: (t, c) => c.rank * 20 + c.atk + c.hp },
  forgeron: { name: 'Forgeron', desc: 'Accumule les équipements sur son Dummy.',
    want: room => Math.min(MAX_BOARD, 3 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 4), equipP: 0.75,
    target: t => t.board.find(s => s.fixed) || t.board[0] },
  synergie: { name: 'Synergie', desc: 'Choisit les cartes qui partagent le plus de types avec son plateau.',
    want: room => Math.min(MAX_BOARD, 3 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 3), equipP: 0.4,
    score: (t, c) => {
      const freq = {}; t.board.forEach(s => s.types.forEach(x => { freq[x] = (freq[x] || 0) + 1; }));
      return cardScore(c) + 6 * (c.types || []).reduce((a, x) => a + (freq[x] || 0), 0);
    } }
};

const KW = { prov: 'Provocation', shield: 'Bouclier', poison: 'Poison', rebirth: 'Renaissance', ranged: 'À distance', fury: 'Fureur' };
// Rule: a skill is either combat or reinforcement, never both.
const TRIG_KIND = { active: 'renfort', startMission: 'renfort', startCombat: 'combat', deathrattle: 'combat', endCombat: 'combat', space: 'combat', onSummon: 'combat', allyDeath: 'combat', enemyDeath: 'combat', survive: 'combat', afterDamage: 'combat', shieldLost: 'combat', allyShieldLoss: 'combat', attackNoKill: 'combat', pilotSurvives: 'combat', enemyPilotDeath: 'combat', allyPilotDeath: 'combat', attackSurvive: 'combat', passive: 'combat', assault: 'combat', enemyAttacks: 'combat', onAllyHit: 'combat', battlecry: 'renfort', startReinforcement: 'renfort', endReinforcement: 'renfort' };

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

// Adaptation: the Elk's signature power (rule in documentation/idees/nouvelles.md). The choice is played at the end of combat, outside applyFx.
const ADAPT = { t: 'endCombat', fx: 'adapt', a: 0, h: 0, n: 0 };
// Datacube faces (Datacrons gained or lost). The draw is made from a bag of marbles: see drawCube (engine.js).
const CUBE_FACES = [-3, -1, 1, 2, 2, 3];
// Reyes's cybernetic patch: X from 1 to 6, the value X being present (7 - X) times in the pool (the 1 six times, the 6 once).
const PATCH_MAX = 6;
const sk = (t, fx, a = 0, h = 0, n = 0) => ({ t, fx, a, h, n });
// Description of a power. The text comes from data/i18n/<lang>.json: "desc.<fx>" for the effect, "trigger.<trigger>" for the prefix.
function skDesc(k, onEquipment = false) {
  if (k.fx === 'adapt') return I18N.t('desc.adapt');
  // On an equipment, "desc.<fx>.equipment" replaces "desc.<fx>" when it exists (e.g. "to the carrier" instead of "to itself").
  const key = onEquipment && I18N.has(`desc.${k.fx}.equipment`) ? `desc.${k.fx}.equipment` : `desc.${k.fx}`;
  const text = I18N.t(key, { ...k, bf: `+${k.a}/+${k.h}`, both: k.a && k.h ? 1 : 0, isDeathrattle: k.t === 'deathrattle' ? 1 : 0,
    PATCH_MAX, CUBE_FACES: CUBE_FACES.join(', '), PROPOSALS, MAX_RANK, PROPHECY_COST, FUSION_COST });
  if (k.t === 'passive' || k.fx === 'genDroide' || k.fx === 'forgeRoboticien' || k.fx === 'forgePatch') return text;   // a permanent power has no trigger
  return `${I18N.t(k.fx === 'completeFusion' ? 'trigger.activeFusion' : `trigger.${k.t}`)}${I18N.t('trigger.separator')}${text}`;   // Sulseye: active with no limit per reinforcement, its cost replaces the mention
}

// Powers displayed on a card, identical ones merged (×N). Keywords and Adaptation are "fixed": always the same,
// the card writes only their name. Skills (variable values) are described in full.
function powersOf(kws, skills, drone, spent = [], onEquipment = false) {
  const out = [], add = (id, key, name, text, kind, fixed) => {
    let p = out.find(q => q.id === id);
    if (!p) out.push(p = { id, key, name, text, kind, fixed, count: 0, spent: false });
    p.count++; return p;
  };
  kws.forEach(k => { if (KW[k]) { const p = add('kw:' + k, k, I18N.t('keyword.' + k), I18N.t('keyword.' + k), 'combat', true); if (spent.includes(k)) p.spent = true; } });
  skills.forEach(k => k.fx === 'adapt' ? add('adapt', 'adapt', I18N.t('keyword.adapt'), I18N.t('desc.adapt'), 'combat', true) : add(`${k.t}:${k.fx}:${k.a}:${k.h}:${k.n}`, k.fx, null, skDesc(k, onEquipment), TRIG_KIND[k.t], false));
  if (drone && (drone.a || drone.h)) add('drone', 'drone', null, I18N.t('ui.dronesSummoned', { a: drone.a, h: drone.h }), 'combat', false);
  return out;
}

// Types (documentation/types/): species = what the servant is, assignments = how it plays.
// A single family of types for the rules. Each servant has a species and a mandatory assignment.
const SPECIES = ['elk', 'dwork', 'droid', 'sorvane', 'ryskan', 'nythe'];
const ASSIGNMENTS = ['pilot', 'engineer', 'medic', 'security', 'explorer', 'artillerist', 'intelligence', 'roboticist', 'diplomat'];
const ALL_TYPES = [...SPECIES, ...ASSIGNMENTS];
// Displayed names of the types (identifier -> French name). Provisional: they will move to data/i18n/fr.json. Same table in svg.js (AWGfx.typeName).
const TYPE_NAMES = { elk: 'Elk', dwork: 'Dwork', droid: 'Droïde', sorvane: 'Sorvane', ryskan: 'Ryskan', nythe: 'Nythe', pilot: 'Pilote', engineer: 'Ingénieur', medic: 'Médecin', security: 'Sécurité', explorer: 'Explorateur', artillerist: 'Artilleur', intelligence: 'Renseignement', roboticist: 'Roboticien', diplomat: 'Diplomate' };
const typeName = t => TYPE_NAMES[t] || t;

// ---------- Cards ----------
// The cards are data: data/servants.json, equipment.json, heroes.json and dungeons.json (see CATALOG below). Removed cards stay in data/retired.json.
// Identifiers: one per card, FIXED UUIDs. The identifier never changes; the name is a label from data/i18n/fr.json (card.<id>), so renaming a card is a text change.
// For now the engine still identifies a few cards by their French name (idOf, copiesOf…): names are installed in French whatever the display language.
// New card: add it to the JSON file of its category with a fresh UUID (node -e "console.log(crypto.randomUUID())") and its name to data/i18n/fr.json.
let SERVANTS = [], EQUIPS = [], HEROES = {}, HEROES_RESERVE = {}, DUNGEONS = {};
let RULES = { fatigue: { start: 30, increment: 1 }, settlement: { player: { perRank: 1, flat: 0 }, boss: { perRank: 1, flat: 0 }, taunt: 'prov', absorb: 'shield' }, order: { profile: 'default', profiles: { default: { bands: ['boss', 'opponent', 'heroes', 'ally'], direction: 'leftToRight', replays: 'afterAll' } } } };   // data/rules.json (game rules as data)
let IDENTIFIERS = { servants: {}, equipment: {}, heroes: {}, dungeons: {} };   // id -> French name, per category (removed cards included)
let IDS_BY_NAME = {};                                                               // French name -> id, per category
const idOf = (cat, name) => { const id = IDS_BY_NAME[cat][name]; if (!id) throw new Error(`Identifiant manquant : « ${name} » (${cat}) n'est pas dans IDENTIFIERS`); return id; };
const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // only used for the mini-bosses (identifier = dungeon + name)

// Mini-boss: one fixed servant per Boss board, present from the first room and never replaced or removed.
// It has a single type (the one it represents) and grows by +1/+1 at each reinforcement. One mini-boss per type for the whole game;
// their specialties will come later (provisional: none for now).
const DUMMY_GROWTH = sk('startReinforcement', 'buffSelf', 1, 1);
const miniBoss = type => ({ name: `Mini-boss ${typeName(type)}`, rank: 1, atk: 1, hp: 3, types: [type], sockets: ['chroma', 'chroma', 'chroma'], kw: [], fixed: true, skill: [DUMMY_GROWTH] });

const CATALOG = (() => {
  const FILES = ['servants', 'equipment', 'heroes', 'dungeons', 'retired', 'rules'];
  const base = typeof document !== 'undefined' && document.currentScript ? new URL('../data/', document.currentScript.src).href : '../data/';
  // files = { servants, equipment, heroes, dungeons, retired }: the parsed JSON files. Needs the French texts to be installed.
  function install(files) {
    if (files.rules) RULES = files.rules;
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
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : I18N.ready.then(() => Promise.all(FILES.map(f => fetch(`${base}${f}.json`, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`${f}.json: HTTP ${r.status}`); return r.json(); })))).then(all => install(Object.fromEntries(FILES.map((f, i) => [f, all[i]]))));
  ready.catch(e => { I18N.banner(`Les cartes du jeu n'ont pas pu être chargées (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });
  return { install, ready };
})();
