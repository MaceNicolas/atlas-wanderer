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
// Reinforcement cards (servants and equipment drawn together): 3 proposals at level 1, 4 at level 2, 5 at levels 3-4, 6 from level 5.
const reinforcementProposals = level => level >= 5 ? 6 : level >= 3 ? 5 : level >= 2 ? 4 : 3;
const MIN_SERVANTS = 2;       // reinforcement: minimum number of servants among the offered cards (the others may be equipment)
const EQUIP_CHANCE = 0.3;     // reinforcement: probability that a drawn card is an equipment (provisional)
const FATIGUE_START = 30;     // open: fatigue threshold (provisional)
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
function skDesc(k) {
  if (k.fx === 'adapt') return I18N.t('desc.adapt');
  const text = I18N.t(`desc.${k.fx}`, { ...k, bf: `+${k.a}/+${k.h}`, both: k.a && k.h ? 1 : 0, isDeathrattle: k.t === 'deathrattle' ? 1 : 0,
    PATCH_MAX, CUBE_FACES: CUBE_FACES.join(', '), PROPOSALS, MAX_RANK, PROPHECY_COST, FUSION_COST });
  if (k.t === 'passive' || k.fx === 'genDroide' || k.fx === 'forgeRoboticien' || k.fx === 'forgePatch') return text;   // a permanent power has no trigger
  return `${I18N.t(k.fx === 'completeFusion' ? 'trigger.activeFusion' : `trigger.${k.t}`)}${I18N.t('trigger.separator')}${text}`;   // Sulseye: active with no limit per reinforcement, its cost replaces the mention
}

// Powers displayed on a card, identical ones merged (×N). Keywords and Adaptation are "fixed": always the same,
// the card writes only their name. Skills (variable values) are described in full.
function powersOf(kws, skills, drone, spent = []) {
  const out = [], add = (id, key, name, text, kind, fixed) => {
    let p = out.find(q => q.id === id);
    if (!p) out.push(p = { id, key, name, text, kind, fixed, count: 0, spent: false });
    p.count++; return p;
  };
  kws.forEach(k => { if (KW[k]) { const p = add('kw:' + k, k, KW[k], KW[k], 'combat', true); if (spent.includes(k)) p.spent = true; } });
  skills.forEach(k => k.fx === 'adapt' ? add('adapt', 'adapt', I18N.t('keyword.adapt'), I18N.t('desc.adapt'), 'combat', true) : add(`${k.t}:${k.fx}:${k.a}:${k.h}:${k.n}`, k.fx, null, skDesc(k), TRIG_KIND[k.t], false));
  if (drone && (drone.a || drone.h)) add('drone', 'drone', null, `Drones invoqués : +${drone.a}/+${drone.h}`, 'combat', false);
  return out;
}

// Types (documentation/types/): species = what the servant is, archetypes = how it plays.
// A single family of types for the rules. Each servant has a species and a mandatory archetype.
const SPECIES = ['elk', 'dwork', 'droid', 'sorvane', 'ryskan', 'nythe'];
const ARCHETYPES = ['pilot', 'engineer', 'medic', 'security', 'explorer', 'artillerist', 'intelligence', 'roboticist', 'diplomat'];
const ALL_TYPES = [...SPECIES, ...ARCHETYPES];
// Displayed names of the types (identifier -> French name). Provisional: they will move to data/i18n/fr.json. Same table in svg.js (AWGfx.typeName).
const TYPE_NAMES = { elk: 'Elk', dwork: 'Dwork', droid: 'Droïde', sorvane: 'Sorvane', ryskan: 'Ryskan', nythe: 'Nythe', pilot: 'Pilote', engineer: 'Ingénieur', medic: 'Médecin', security: 'Sécurité', explorer: 'Explorateur', artillerist: 'Artilleur', intelligence: 'Renseignement', roboticist: 'Roboticien', diplomat: 'Diplomate' };
const typeName = t => TYPE_NAMES[t] || t;

// Identifiers: one per card, FIXED UUIDs. The name is a simple label that can be changed freely; the identifier never changes.
// It serves as the reference everywhere: test history (comparison, evolution), saves, illustrations (prototype/images/<category>/<identifier>.<ext>).
// Renaming a card: change its name here AND in its definition; the identifier does not move.
// New card: add it a line here with a fresh UUID (node -e "console.log(crypto.randomUUID())"), otherwise the game refuses to start.
const IDENTIFIERS = {
  servants: {
    "2defafa8-043f-4208-b13a-fcc48379aed5": "Intercepteur",
    "c21b91d4-7ea5-41ab-a1ca-1e2751c22c6e": "Lieutenant de pont",
    "f7390f61-8d8e-446d-9199-be2588c9006f": "Commandant de vol",
    "aff6bcc6-a3fe-456b-9c0f-1e8bdaa561ad": "LR-04",
    "6c5c3528-d527-4dfc-9863-3fbd805048d5": "C0-4193",
    "6e88d6c6-e1ef-45e5-a1cd-a051a07ca54a": "Apprenti mécanicien",
    "48bbb08c-e671-42f4-a2ec-f116c663debc": "Ingénieur de pont",
    "f01a03cb-950a-40a5-815f-156a65b74093": "Spécialiste des boucliers",
    "837fc144-46d6-40e1-b3f3-7d166fce21ca": "Chef mécanicien",
    "620fd49d-2f7a-4913-9312-06eb207ededa": "Ingénieur en chef",
    "cfa1e128-db00-43bc-8be3-fa510bedf477": "Secouriste de combat",
    "6ca80db4-e461-4d39-aad7-002f8aeb259d": "Infirmier",
    "d656a1f6-a5e6-4384-a070-6a8cfbe14747": "Chirurgien de bord",
    "8b4ec2f2-e490-4138-b390-7038d705be9a": "Médecin-chef",
    "bd7bd662-d7d4-426a-b3dc-9b4ca37d4e1d": "Fusilier",
    "ef8c117d-f345-4c9d-9d74-3743ae65ca57": "Garde de bord",
    "99893d34-bc0e-4bb6-a8a7-1ff5afd22b60": "Sergent",
    "d74dd735-8b16-4bfe-8a8c-6ffa3795b48b": "P0-C5",
    "81df3399-b919-4a64-b58c-ddd38ba69f0a": "Commandant de la garde",
    "776462b6-c72f-48c6-a682-5ad4d90a6223": "Éclaireur",
    "47132a82-dd96-4bc2-9934-5819c2509874": "Pionnier",
    "5a6a7d2e-7840-401f-98d0-221b133f9cbe": "AUW0",
    "841f6dcd-6d7a-4b5e-92c5-42a2e0df9ccd": "Spécialiste en brouillage",
    "511431c8-6d43-4506-8e84-02ab9275f6a9": "Cartographe",
    "ff7b3a5b-68eb-464f-b312-83a1768e2aed": "Chasseur de reliques",
    "b273ee61-f011-4e68-8940-1758356f3163": "Contrebandier",
    "e12c20e7-a9e2-4cd2-b9a4-1327692cf687": "Grenadier",
    "d07a201f-0a06-4e4c-bf7a-ce5a8d3eabfb": "Tireur d'élite",
    "d4abf299-2d6e-4d1a-8df7-d50e77cef4c8": "Soldat d'assaut",
    "a06ba32b-fa20-4fe3-946f-8acad44b68ef": "Maître-artilleur",
    "a0b8344c-a450-48ac-b4c6-be81130dd9dc": "Bombardier",
    "d3a21fcf-3ac2-4101-bf1f-49dd0f64f05a": "F5-5F",
    "617cc022-eb81-4dbe-96b1-cced89431e8c": "Embusqué",
    "191f4649-025d-4a49-a35f-270be25048d2": "Intrus réseau",
    "0e513550-05d5-4741-8df2-4a6b4b68ec7b": "W1X05",
    "2b8bc5ad-1bcc-4fc2-ac7a-fc17f8e570ae": "Commando",
    "3e8fbe36-a661-4364-8a68-9fb41f33c3e0": "Maître espion",
    "5cb148ae-7e5c-4436-a80a-0481b838b913": "Spectre",
    "04f316de-c101-434d-b2de-663ce6e9ef33": "Technosophe",
    "ef5d2f47-1a83-466f-9caf-63eddaca0245": "GAD5",
    "28e4d8eb-306a-462d-91c0-4ab843e94b71": "Opérateur de drone",
    "40b016a0-39db-44a6-9d99-e150373a6978": "Opérateur d'essaim",
    "f7efce8b-41f2-4d00-9294-2f3c191f9272": "Chef d'atelier",
    "2ceb7c4d-263e-46ef-a5de-daf1f50906d3": "Architecte d'essaim",
    "308d90f5-f573-48ac-a8d1-e392fb1d71f7": "Biologiste",
    "c3483ec8-061d-46c4-a062-1e1dc687bde9": "Généticien",
    "99c9aac6-7059-47c1-9767-2240e115806d": "Attaché de liaison",
    "c920d49f-2f5a-409b-a5eb-66ce5b807749": "KRL",
    "eee54c69-62e6-4866-8f55-d00f3bcfee29": "Assistant consulaire",
    "a8832ba0-5ed7-4c3a-98a7-a695126de92e": "Diplomate",
    "efee5766-bfdf-4507-a22d-f61dc6cbfb7c": "Ambassadeur",
    "8718fd55-af6b-48b7-89f4-dc68524f8e97": "AL-11",
    "7ee47f27-667f-4d4f-a8f5-fc76602dc533": "Assembleur",
    "3dc1d8a8-0e15-405c-a8ca-c60c027fc0fe": "Orateur impérial",
    "33ab6377-5c49-4a3b-8794-25677a9719e5": "Cadet",
    "74ea5d74-f255-4e8d-93a1-c74e049d5dc8": "Assistant de labo",
    "fdceb8a2-c1f5-43dd-929b-7e11f3ffd2e5": "Scout",
    "6cb9ee18-53f4-4497-98a5-d80cb1f54859": "Pilote de combat",
    "34df043e-874b-45d4-94a7-b1d67ec72743": "Maître-canonnier",
    "e08ed052-e7c1-4a68-b68d-43c885fc9beb": "Maître mécanicien",
    "2cce9a89-1cdb-4783-b87d-139fe7b6c69e": "Chirurgien",
    "a913dde2-a170-4741-8337-f62aafd35ca2": "Naturaliste",
    "a18041e8-98c9-4cbd-8a58-7154f4cc3144": "Agent de sécurité",
    "553324db-fbaf-45c1-b197-8dd487d55486": "Émissaire",
    "f279df0f-3adb-4d9c-9b4d-7dde91fbde23": "Maître des drones",
    "d1ce014a-3723-4f7e-ba9d-759f83708b73": "Corsaire",
    "dad55580-b20c-4702-a7ed-4c1f1937f01c": "Explorateur des confins",
    "62306840-ab03-4472-9784-9baa0106beb1": "Grande Doyenne",
    "62a51092-d177-427b-a6e2-e9fcc66f6870": "Septième sentinelle",
    "7c1a7d32-1e37-418e-827a-969cb1af306d": "Chasseur de prime",
    "b172de57-6e95-44db-877b-5fc14644ea33": "Biochirurgien",
    "b3fcac67-bd5a-46f2-b9b8-216c1c272542": "Maître des vents",
    "fec2fb24-8534-4029-ad3a-5dbed0d1135a": "Forgeron stellaire",
    "d0a2f166-9b0c-4b81-9072-a28be2d07542": "Briseur de fronts",
    "c7b39db5-eff2-4267-933b-d220293a37a3": "Tisseur de routes",
    "c930b94d-68d5-4a5a-825e-a741b93eeb3a": "Nexus",
    "2c10f1a5-bf8a-4c88-9964-3d87e69a70e5": "Cybermancien",
    "489d8821-6109-4902-bb4c-243f6d294961": "Ombre",
    "50be8649-e958-4506-b26a-a0ca20ea2be4": "M1-FE",
    "cca50718-1775-4966-95dd-afe202118ba1": "Prospecteur",
    "e0b1ef33-99d7-4832-a68f-a0912ca20f7a": "Seigneur de la flotte",
    "687ee92d-4db7-4d3e-8b0c-c0ff08989f4d": "Le Grand Mécanicien",
    "3cd48270-92ef-4ace-87e2-0a04c8d78dce": "Gardien du génome",
    "66f02c65-d06d-4047-a7fe-5b3d7308cf06": "Traqueur des ombres",
    "05ea829a-a1a1-4137-87a6-62fc68344bd8": "Canon-monde",
    "a12e4c54-bbf0-4c9a-9700-0e746a1f7e88": "Maître des ombres",
    "3077a7fe-d3ad-42b3-b8e3-c1c3700b78b8": "FF548",
    "612e87f7-524a-4e9d-ab56-fd717ae9856b": "Chancelier",
    "8f03b021-9650-455c-be55-84f44e867b04": "Brise-siège",
    "5ef3ed94-2252-4445-a3b9-a1f4c58002c3": "Maître des accords",
    "14d1f9a5-5c81-473f-8071-304c32f11a6b": "RD44",
    "195cfb93-78d7-4933-84f1-419764b6242a": "Sentinelle",
    "506f000a-a3ec-40f3-8be8-4d6004e725cb": "Ingénieur de distorsion",
    "c18aa476-2a41-43d8-9a3e-4b0f84513899": "Z3RK",
    "3965a102-0500-47fd-a4be-9ca72335e77e": "DE-D0",
    "1cc790cf-fb08-4d6c-b4f3-5920c2fc0b73": "XN-FF45",
    "04f58d31-d37e-4cc6-bcfb-e6424ea3e61d": "Fantôme",
    "4246a94e-20b0-415f-9e5d-00fdf986b57c": "Pilleur de ruine",
    "313a5f58-351f-4771-a78a-272a550549d0": "Chasseur de frégates"
  },
  equipment: {
    "2fbcf6af-a9ec-47b5-9c29-23d40915add1": "Cristal de veille",
    "8855ca33-ac49-429d-97ef-aa87341db17d": "Diadème d'harmonie",
    "a5bac51b-a2be-4bbe-a4d1-f14399fe01c1": "Lame de ramure",
    "616e9a01-9827-49e9-b1f9-b2f1a49c7875": "Couronne des anciens",
    "bcb681d0-bf28-43b9-8f08-711340bb7d45": "Pioche renforcée",
    "54da2465-bb64-4f88-a59b-f8f744060279": "Casque de mineur",
    "2d75b080-1d0c-40ce-836e-40e4e34a131e": "Marteau de forge",
    "d3c55504-cf4a-40f2-926c-094165c7ef9e": "Foreuse portative",
    "15f7fbd0-9f6f-4f88-ae45-6abac9ea95ff": "Circuit auxiliaire",
    "ad89c3b2-3535-4ba8-a279-9379bf3d912d": "Servo de précision",
    "6eb31288-3113-4176-938d-3265d22d0e33": "Noyau surcadencé",
    "236a9976-ba71-4b77-8d3b-ac3cbb65db1b": "Matrice de calcul",
    "28bc7839-deb4-4ff6-8986-f1e6fa2d34ff": "Griffe de chasse",
    "a96bfa58-539f-4fe1-a053-b746d01865bf": "Cape de camouflage",
    "23a0aa84-07cd-45a9-bf69-808e060e17d0": "Lame silencieuse",
    "895fe17d-de76-4ba4-a8af-acd077fe4c11": "Manteau argenté",
    "472d57c6-86ee-4142-9ad3-e06cb926b21f": "Lance de meute",
    "b26edd67-8eeb-4c1d-9543-ebaa92d737f3": "Plastron doré",
    "ef0a483a-ddf0-4562-bfa1-6c024dd2b65c": "Étendard ryskan",
    "419f347f-d7eb-4af9-9b75-b78dd764f9d1": "Cuirasse d'ambre",
    "1bac4667-5bab-4b8f-951d-d650ccfb4c08": "Fragment nacré",
    "8009af98-5177-4c96-b2f0-fa51c7860e6a": "Voile de sphère",
    "98448d72-2114-4d01-9156-65a76b021209": "Cœur de nacre",
    "fabfce15-3b1e-4ef6-921f-a28a9e22c2b4": "Sphère prismatique",
    "3eeb8c38-c1df-4ea1-8b5e-730fa78c12b3": "Plan de vol",
    "c3531fd7-3a89-40bd-b125-1986cdc8a0bf": "Interface de vol neural",
    "53cc28c3-b2e9-4ab1-a05a-45e03fa58928": "Chronoscope stellaire",
    "b77475fe-b888-4d96-995f-3a4251561df6": "Compensateur quantique",
    "5ee06535-72db-4730-ab66-c1bb0582af60": "Boussole stellaire",
    "6a5c088a-06cc-430e-9ab3-a77afd73af64": "Sonde tridimensionnelle",
    "d6b80761-7884-4c58-b2f5-bf002b990c5a": "Scanner géologique",
    "446387d4-0ed5-464a-a3a3-4a198651f861": "Balise de Voronoï",
    "45b821d6-31f4-45cc-8172-f85d00d3d595": "Sceau pacificateur",
    "eb196225-6e26-4ecf-8da3-51e1de6e69dc": "Mandat de protection",
    "209af6b5-82cc-4142-abc5-5cf03bae9c6c": "La pomme de discorde",
    "1623dce3-10a6-4655-8f8d-7cf61d3e9bb6": "Médaillon des mille voix",
    "07c52969-76d3-4687-99e0-a7ca707cd966": "Renfort adaptatif",
    "34c5560e-d506-42b9-b76c-4e8e75f18428": "Duplicateur d'impulsion",
    "b32dcda1-ad3a-4d24-9bb3-1dd6ae4dbf6b": "Oscillateur hyperfréquence",
    "5db1acae-deb3-41d3-b55a-03ff8599164b": "Régulateur d'intégrité",
    "1d257bfc-e378-40ba-9c57-0d42d1ebda1c": "Injecteur de nanites",
    "2a334e85-da0d-4e47-92c8-d0fc03539db4": "Extracteur de routines",
    "2724a03e-d985-4f4e-9a1f-9b5a77c823da": "Résonateur d'essaim",
    "54a30f43-7ca0-4860-8e76-0059b825490d": "Protocole balistique",
    "01aa1333-200b-449c-ae62-b409e740e0c3": "Le protocole Lazare",
    "38365c6e-a5cd-4820-be84-0f47cf74ec36": "Défibrillateur portatif",
    "8e4771d7-067f-43d1-9ddc-d370bc639820": "Modulateur génétique",
    "eaec4389-b63b-4ebc-83c9-11b20e9bde3e": "Sérum régénératif",
    "56b07644-4560-4c09-b8f7-a549426a04fd": "Égide de secours",
    "cef33909-4a25-4ee3-a135-a7425bb4757d": "Tir de couverture",
    "9e7f1f6f-7e63-47c2-8e52-221c12a58c9b": "Accumulateur balistique",
    "ed89d5d4-fbb0-4ba5-90a3-1052c50ec61b": "Accélérateur balistique",
    "4b6f8ee2-176a-47a5-ae4d-3b07f5dad87f": "Ogive instable",
    "3311863d-2f48-4714-b20a-a7c6570d6c27": "Réseau d'informateurs",
    "a564b90b-02f3-4485-aa39-c606dfe5a409": "Brouilleur synaptique",
    "ce5b6f38-8df4-445e-8d98-0e58ed0d1d83": "Brouilleur quantique",
    "af9db8ac-93a0-4b0a-bc9b-22cbd6283384": "Détecteur de vulnérabilités",
    "5427b046-99cf-4943-a934-f2c6a9af6098": "Bombardement orbital",
    "167bdb7d-4961-4559-b53b-a268d8426e8d": "Charge à fragmentation",
    "ee0bb8f1-8fca-45cf-8e9b-184e5a726bf1": "Projecteur de bouclier",
    "c25af72c-ad0b-421e-985f-68d4aee25c7b": "Tournevis sonique",
    "55c82408-9d65-4893-b458-eaea3d5a66da": "Câblage renforcé",
    "597de813-00d9-4891-8f2d-073961977855": "Générateur portatif",
    "ee23bb34-8101-460e-ae66-42262fc0df1f": "Plan d'ingénierie",
    "dcb5e6a6-5698-4a26-8811-b49d852592c7": "Trousse de soins",
    "69209ada-0af9-4415-a770-d88f0836749b": "Seringue de stimulants",
    "d224c0f2-d805-4f11-8f85-2c4bdc16c24a": "Scanner médical",
    "a881d798-b6d5-455b-a981-0885a5b10585": "Caisson de réanimation",
    "43163ecb-1e29-4ad5-bbe5-028a4685b227": "Gilet pare-balles",
    "98b745e8-109a-4c10-ba76-7e23151fe78a": "Matraque électrique",
    "6b83c1f8-5cd1-45fe-84c0-805dacc8fe93": "Bouclier antiémeute",
    "d01fcb32-7f8b-4674-9dc4-f5659460c9f6": "Armure de garde",
    "92eea1ba-f452-4771-accb-e8a6464bc559": "Lampe frontale",
    "cf2f27c7-9850-4686-984d-92c24e4771c6": "Carte stellaire",
    "e4b5ba0c-d3d3-4fec-9bf6-4dfeb4342bd5": "Sac d'expédition",
    "926ffa04-3fb9-4768-b4e7-3ec7d3735fc0": "Balise de relevé",
    "2bdc4a97-9a2d-457c-b8bb-e4b82040c4a3": "Culasse améliorée",
    "77ddd8b9-5c62-49f1-ab44-3fe63e7fb517": "Viseur thermique",
    "438c1b49-922a-4028-aa2d-aeb3137e1f88": "Obus renforcés",
    "35daf13c-7209-4dd6-a1a5-0ed826134d08": "Canon lourd",
    "e59e39f6-afba-4d8c-8c92-0a0edf5e7781": "Micro dissimulé",
    "7d2ec34c-c19e-4a22-a7b8-e70932e19265": "Dossier chiffré",
    "472ea4ce-4ecc-46b8-b337-fb6ede767829": "Lunettes d'analyse",
    "9be6cb45-3d1e-4513-a353-9136c65e9801": "Réseau d'informateurs",
    "354d1465-7d12-4a50-922d-3ae6d95cc4b5": "Pince articulée",
    "bc3d7b5b-30cb-4cd8-aa56-48b006e8275c": "Module de contrôle",
    "b97c9326-3a31-4219-a9e0-c5dad160069a": "Atelier mobile",
    "aeb7b054-d1d1-4cd7-aa79-d13fae74bec5": "Unité de maintenance",
    "e2f3b122-fc8e-4374-b52f-ccc38ca26534": "Dossier consulaire",
    "5b1bba03-6cf6-4941-9a94-73c8524b9e44": "Lettre d'accréditation",
    "7902cf36-9244-46be-891c-84ff70d065a9": "Sceau consulaire",
    "649b8ac6-7e7d-4050-b9ac-ea923c0f0380": "Traité scellé",
    "e10aa853-8541-4ea6-8447-62f2122ea65b": "Cape d'ambassadeur"
  },
  lieutenants: {
    "758c5e89-f22d-4aba-a156-e49e6f8c7fb1": "Capitaine Rol Vex",
    "64dbde59-6192-45b0-be69-89805dd36731": "ZC-D9",
    "6e15d681-9a70-4623-b7c8-d1bbcfac7e18": "Flam'Gruk",
    "3b545f63-e933-4a79-8fe8-09ec6da1dccf": "TE-5T",
    "2050b072-52a1-4fba-bb6d-042ac36c663a": "Brokk'Ric",
    "1b036109-0256-4c96-b47c-7d6b74ab41f5": "Reyes",
    "d5acc691-a801-4056-8dee-11e2873bc7da": "Docteur Zel Iris",
    "8c4c1e0d-2867-44fa-9bae-32d31e746d6d": "Hal Ana",
    "67943374-1635-407e-9015-c04cd5bb02ae": "Ysha la Thanéenne",
    "1052557f-ef59-4d00-afac-1924d1f7d202": "Sulseye",
    "c967e395-5a30-4dfb-8ff7-f8a51ee121d8": "Waven la Précieuse",
    "91561506-2ce5-432e-bc65-bb6dbb7f33b7": "Amber l'Acrobate"
  },
  dungeons: {
    "1a919550-ffab-4fb7-819b-c69f34de9f82": "Le Nid de la Reine",
    "3561ab65-ea50-4a52-895b-966c0045a145": "Station Oméga",
    "cdc3358f-45e7-4e54-a983-611346ec7bad": "La Cité des Profondeurs",
    "0836ed8d-bcab-4dd9-aad7-a910b8612aa5": "La Forge de Brasier-Roc"
  }
};

// Name -> identifier, per category; a name absent from the table is a data error.
const IDS_BY_NAME = Object.fromEntries(Object.entries(IDENTIFIERS).map(([cat, t]) => [cat, Object.fromEntries(Object.entries(t).map(([id, name]) => [name, id]))]));
const idOf = (cat, name) => { const id = IDS_BY_NAME[cat][name]; if (!id) throw new Error(`Identifiant manquant : « ${name} » (${cat}) n'est pas dans IDENTIFIERS`); return id; };
const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // only used for the mini-bosses (identifier = dungeon + name)
// Indexes a list of cards by identifier (IDENTIFIERS table); a duplicate reference is a data error.
function indexById(list, what, cat) {
  const out = {};
  list.forEach(d => { d.id = idOf(cat, d.name); if (out[d.id]) throw new Error(`${what} : référence en double « ${d.id} »`); out[d.id] = d; });
  return out;
}
function assertUniqueIds(list, what) { const seen = new Set(); list.forEach(d => { if (seen.has(d.id)) throw new Error(`${what} : référence en double « ${d.id} »`); seen.add(d.id); }); }

// skill: one power, or a list of powers.
const S = (name, rank, atk, hp, types, kw = [], skill = null) => ({ id: idOf('servants', name), name, rank, atk, hp, types, kw, skill });
const SERVANTS = [
  // Pilot: opening, rhythm (the leftmost attacks first)
  S('Intercepteur', 2, 3, 3, ['dwork', 'pilot'], [], sk('passive', 'targetPilot')),
  S('Lieutenant de pont', 3, 4, 4, ['dwork', 'pilot'], [], sk('endReinforcement', 'buffPilots', 0, 2)),
  S('Commandant de vol', 4, 5, 6, ['ryskan', 'pilot'], [], sk('endReinforcement', 'buffPilots', 3, 0)),
  S('LR-04', 4, 4, 6, ['droid', 'pilot'], [], sk('pilotSurvives', 'pilotGrows', 4, 0)),
  S('C0-4193', 5, 6, 8, ['droid', 'pilot'], [], sk('startCombat', 'furyAdjacentPilots')),
  // Engineer: strengthen through equipment, Shield
  S('Apprenti mécanicien', 1, 1, 3, ['nythe', 'engineer'], [], sk('survive', 'permAtk', 1, 0)),
  S('Ingénieur de pont', 2, 2, 4, ['dwork', 'engineer'], [], sk('endReinforcement', 'buffRandomAlly', 1, 1)),
  S('Spécialiste des boucliers', 5, 3, 7, ['elk', 'engineer'], [], sk('endReinforcement', 'buffEquippedAlly', 0, 3)),
  S('Chef mécanicien', 4, 4, 7, ['sorvane', 'engineer'], [], sk('passive', 'droneAura', 4, 4)),
  S('Ingénieur en chef', 5, 5, 9, ['nythe', 'engineer'], ['shield'], sk('startCombat', 'buffAllies', 1, 1)),
  // Medic: damage prevention, HP
  S('Secouriste de combat', 1, 1, 3, ['sorvane', 'medic'], [], sk('assault', 'healLeftmost', 0, 0, 2)),
  S('Infirmier', 2, 2, 4, ['dwork', 'medic'], [], sk('shieldLost', 'regenShield', 0, 0, 1)),
  S('Chirurgien de bord', 5, 4, 8, ['sorvane', 'medic'], ['shield']),
  S('Médecin-chef', 4, 4, 7, ['ryskan', 'medic'], [], sk('deathrattle', 'healAllies', 0, 0, 5)),
  // Security: Taunt, Shield
  S('Fusilier', 3, 5, 4, ['ryskan', 'security'], ['ranged']),
  S('Garde de bord', 2, 2, 5, ['dwork', 'security'], [], sk('passive', 'wildSwing')),
  S('Sergent', 3, 3, 6, ['nythe', 'security'], ['prov'], sk('endReinforcement', 'buffSelf', 0, 3)),
  S('P0-C5', 4, 4, 8, ['droid', 'security'], ['prov', 'shield']),
  S('Commandant de la garde', 5, 6, 11, ['elk', 'security'], ['prov', 'shield'], sk('startCombat', 'buffAllies', 0, 4)),
  // Explorer: Ranged, reward for type diversity
  S('Éclaireur', 1, 2, 2, ['sorvane', 'explorer'], ['ranged']),
  S('Pionnier', 2, 2, 4, ['ryskan', 'explorer'], [], sk('startCombat', 'buffPerEnemyType', 2, 0)),
  S('AUW0', 2, 2, 4, ['droid', 'explorer'], ['ranged', 'poison']),
  S('Spécialiste en brouillage', 3, 2, 5, ['nythe', 'pilot'], [], sk('enemyAttacks', 'debuffAttacker')),
  S('Cartographe', 3, 3, 5, ['nythe', 'explorer'], [], sk('startCombat', 'buffPerTypeUncapped', 3, 0)),
  S('Chasseur de reliques', 5, 4, 7, ['nythe', 'explorer'], ['ranged'], [sk('battlecry', 'gainEquip'), sk('deathrattle', 'gainEquip')]),
  S('Contrebandier', 4, 4, 6, ['ryskan', 'explorer'], ['ranged'], sk('enemyDeath', 'scavenge')),
  // Artillerist: Ranged, direct damage
  S('Grenadier', 1, 3, 2, ['droid', 'artillerist'], ['ranged']),
  S('Tireur d\'élite', 5, 5, 6, ['sorvane', 'artillerist'], ['ranged'], sk('passive', 'targetLowestHp')),
  S('Soldat d\'assaut', 3, 4, 4, ['sorvane', 'artillerist'], ['fury'], sk('battlecry', 'buffChosenAlly', 2, 0)),
  S('Maître-artilleur', 4, 5, 5, ['dwork', 'artillerist'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 3)),
  S('Bombardier', 4, 5, 7, ['nythe', 'artillerist'], [], sk('startCombat', 'plantBombs', 2, 0, 5)),
  S('F5-5F', 5, 6, 7, ['droid', 'artillerist'], ['ranged']),
  // Intelligence: weaken the opponent
  S('Embusqué', 1, 2, 2, ['elk', 'intelligence'], [], ADAPT),
  S('Intrus réseau', 2, 2, 3, ['droid', 'intelligence'], [], sk('startCombat', 'debuffLeftmost', 0, 0, 3)),
  S('W1X05', 3, 3, 4, ['droid', 'intelligence'], [], sk('startCombat', 'stripShield')),
  S('Commando', 3, 3, 4, ['elk', 'intelligence'], [], [sk('startCombat', 'debuffRandomEnemy', 0, 0, 2), ADAPT]),
  S('Maître espion', 4, 4, 6, ['ryskan', 'intelligence'], [], sk('startCombat', 'hpRightmostTo1')),
  S('Spectre', 5, 6, 6, ['nythe', 'intelligence'], [], sk('startCombat', 'swapStatsMostHp')),
  // Roboticist: summon drones
  S('Technosophe', 1, 1, 3, ['elk', 'roboticist'], [], ADAPT),
  S('GAD5', 1, 2, 3, ['droid', 'roboticist'], [], sk('endReinforcement', 'buffSelf', 0, 1)),
  S('Opérateur de drone', 2, 1, 3, ['nythe', 'roboticist'], [], sk('deathrattle', 'summon', 1, 1)),
  S('Opérateur d\'essaim', 5, 3, 6, ['sorvane', 'roboticist'], [], [sk('battlecry', 'droneBoostGame', 2, 2), sk('deathrattle', 'summon', 5, 5)]),
  S('Chef d\'atelier', 3, 2, 5, ['ryskan', 'roboticist'], [], sk('onSummon', 'buffSummoned', 2, 2)),
  S('Architecte d\'essaim', 5, 4, 8, ['dwork', 'roboticist'], [], sk('space', 'summon', 1, 1)),
  S('Biologiste', 5, 4, 9, ['dwork', 'medic'], []),
  S('Généticien', 4, 4, 6, ['nythe', 'medic'], ['poison'], sk('deathrattle', 'buffAllies', 1, 1)),
  // Diplomat: bonus to adjacent allies
  S('Attaché de liaison', 2, 2, 3, ['nythe', 'diplomat'], [], sk('battlecry', 'discoverEquip', 0, 0, 1)),
  S('KRL', 2, 1, 5, ['droid', 'diplomat'], [], sk('startCombat', 'buffAdjacent', 1, 1)),
  S('Assistant consulaire', 1, 2, 4, ['dwork', 'diplomat'], [], sk('battlecry', 'gainDossier')),
  S('Diplomate', 3, 2, 6, ['ryskan', 'diplomat'], [], sk('startCombat', 'buffAdjacent', 2, 1)),
  S('Ambassadeur', 4, 5, 6, ['sorvane', 'diplomat'], [], sk('startCombat', 'buffAdjacent', 2, 2)),
  S('AL-11', 4, 5, 7, ['droid', 'diplomat'], [], sk('battlecry', 'gainHighestHp')),
  S('Assembleur', 5, 6, 9, ['nythe', 'diplomat'], [], sk('startCombat', 'stripProvLowestHp')),
  S('Orateur impérial', 5, 5, 9, ['ryskan', 'diplomat'], [], sk('startCombat', 'replayAdjacentStart')),
  // Elk: species of Adaptation (signature power). Almost all carry it instead of a skill; two keep theirs to serve as a model for the others.
  S('Cadet', 1, 2, 2, ['elk', 'pilot'], [], sk('enemyPilotDeath', 'permStats', 1, 1)),
  S('Assistant de labo', 1, 2, 2, ['ryskan', 'medic'], [], sk('deathrattle', 'buffRandomAlly', 2, 2)),
  S('Scout', 2, 2, 3, ['dwork', 'intelligence'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Pilote de combat', 2, 2, 4, ['sorvane', 'pilot'], [], sk('attackSurvive', 'buffSelf', 2, 0)),
  S('Maître-canonnier', 2, 2, 3, ['dwork', 'artillerist'], ['ranged'], sk('passive', 'breakShield')),
  S('Maître mécanicien', 3, 3, 5, ['elk', 'engineer'], [], ADAPT),
  S('Chirurgien', 3, 2, 6, ['elk', 'medic'], [], [sk('onAllyHit', 'healAttacked', 0, 0, 2), ADAPT]),
  S('Naturaliste', 3, 2, 5, ['elk', 'explorer'], [], [ADAPT, sk('endCombat', 'adaptExtra')]),
  S('Agent de sécurité', 1, 3, 1, ['elk', 'security'], [], [sk('passive', 'targetLowestHp'), ADAPT]),
  S('Émissaire', 3, 2, 6, ['elk', 'diplomat'], [], [ADAPT, sk('battlecry', 'gainUnavailableEquip', 0, 0, 1)]),
  S('Maître des drones', 4, 3, 6, ['elk', 'roboticist'], [], [sk('endCombat', 'droneBonus', 1, 1), ADAPT]),
  S('Corsaire', 2, 4, 5, ['elk', 'artillerist'], ['ranged'], ADAPT),
  S('Explorateur des confins', 5, 4, 8, ['elk', 'explorer'], [], [ADAPT, sk('endCombat', 'bigEquipOffer', 0, 0, 7)]),
  S('Grande Doyenne', 6, 5, 11, ['elk', 'diplomat'], [], [ADAPT, sk('battlecry', 'copyHighestAtk')]),
  // Rank 6: two servants per species
  S('Septième sentinelle', 6, 7, 12, ['nythe', 'security'], ['shield'], sk('passive', 'shieldCharges', 0, 0, 2)),
  S('Chasseur de prime', 6, 9, 9, ['ryskan', 'artillerist'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 5)),
  S('Biochirurgien', 6, 6, 14, ['elk', 'medic'], [], ADAPT),
  S('Maître des vents', 6, 6, 10, ['elk', 'pilot'], [], [sk('enemyAttacks', 'dmgAttacker'), ADAPT]),
  S('Forgeron stellaire', 6, 7, 14, ['dwork', 'engineer'], [], sk('startReinforcement', 'addUnavailableEquip', 0, 0, 5)),
  S('Briseur de fronts', 6, 8, 13, ['dwork', 'security'], ['prov', 'rebirth']),
  S('Tisseur de routes', 6, 7, 11, ['ryskan', 'pilot'], [], sk('startCombat', 'buffPilotsPerEnemyPilot', 0, 4)),
  S('Nexus', 6, 4, 9, ['ryskan', 'roboticist'], [], sk('startCombat', 'summon', 6, 6)),
  S('Cybermancien', 6, 7, 13, ['nythe', 'roboticist'], [], sk('startReinforcement', 'prBoost', 2, 2)),
  S('Ombre', 6, 9, 8, ['sorvane', 'intelligence'], [], sk('startCombat', 'swapHpLeftmost')),
  S('M1-FE', 6, 6, 11, ['droid', 'explorer'], [], sk('endReinforcement', 'buffAdjacentPerType', 1, 1)),
  S('Prospecteur', 1, 2, 3, ['dwork', 'explorer'], [], sk('startCombat', 'buffPerTypeUncapped', 2, 1)),
  // Rank 7: one servant per archetype, obtained only as a fusion reward (never offered at reinforcement)
  S('Seigneur de la flotte', 7, 9, 12, ['nythe', 'pilot'], [], sk('allyPilotDeath', 'buffAllies', 5, 5)),
  S('Le Grand Mécanicien', 7, 8, 16, ['ryskan', 'engineer'], ['shield'], sk('startCombat', 'buffAllies', 2, 2)),
  S('Gardien du génome', 7, 8, 16, ['nythe', 'medic'], [], sk('startCombat', 'buffAllies', 2, 4)),
  S('Traqueur des ombres', 7, 10, 12, ['sorvane', 'explorer'], [], sk('startCombat', 'buffPerTypeUncapped', 2, 2)),
  S('Canon-monde', 7, 12, 10, ['nythe', 'artillerist'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 7)),
  S('Maître des ombres', 7, 8, 12, ['ryskan', 'intelligence'], [], sk('startCombat', 'stripProv')),
  S('FF548', 7, 7, 12, ['droid', 'roboticist'], [], sk('space', 'summon', 10, 10)),
  S('Chancelier', 7, 8, 18, ['elk', 'diplomat'], [], [ADAPT, sk('startCombat', 'rightmostAttacksLeftmost')]),
  S('Brise-siège', 7, 10, 17, ['ryskan', 'security'], ['prov'], sk('passive', 'breakShield')),
  S('Maître des accords', 6, 6, 12, ['dwork', 'diplomat'], [], sk('battlecry', 'gainAnyEquip', 0, 0, 1)),   // provisional stats
  // Species + archetype (provisional content: the species sheets do not have an "In the game" section yet)
  S('RD44', 2, 2, 5, ['droid', 'engineer'], [], sk('endReinforcement', 'buffAllies', 0, 1)),
  S('Sentinelle', 3, 4, 3, ['sorvane', 'security'], [], sk('enemyAttacks', 'preemptShot')),
  S('Ingénieur de distorsion', 4, 4, 8, ['ryskan', 'engineer'], ['shield'], sk('startCombat', 'buffEquippedAlly', 2, 0)),
  S('Z3RK', 2, 2, 4, ['droid', 'engineer'], [], sk('endReinforcement', 'buffRandomAlly', 0, 2)),
  S('DE-D0', 5, 0, 8, ['droid', 'medic'], [], sk('passive', 'healLastSurvivor')),
  S('XN-FF45', 4, 4, 7, ['droid', 'security'], ['prov'], sk('deathrattle', 'buffAllies', 3, 1)),
  S('Fantôme', 2, 3, 2, ['sorvane', 'intelligence'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Pilleur de ruine', 3, 4, 5, ['sorvane', 'explorer'], [], sk('endCombat', 'equipUnavailable', 0, 0, 3)),
  S('Chasseur de frégates', 4, 5, 4, ['sorvane', 'pilot'], ['shield'], [sk('passive', 'targetPilot'), sk('passive', 'doubleVsPilots')])
];

// skill: equipment effect, triggered on the servant that carries it. Reinforcement effect = permanent,
// combat effect = valid for the combat only.
// mod: summon modifier { droneA, droneH, text } (bonus given to the drones summoned by the carrier).
const E = (name, rank, atk, hp, kw = null, type = null, skill = null, mod = null) => ({ id: idOf('equipment', name), name, rank, atk, hp, kw, type, skill, mod });
// Reduced catalog (November 9, 2026): 4 Pilot equipment, the Pacifying Seal and the Protection Mandate (Diplomat) and 4 Explorer equipment (Stellar Compass, Three-dimensional Probe, Geological Scanner, Voronoi Beacon); those of the 6 species and of the 7 other archetypes were removed.
const EQUIPS = [
  E('Plan de vol', 5, 0, 0, null, 'pilot', sk('startCombat', 'atkPerAllyPilot', 2, 0)), E('Interface de vol neural', 3, 0, 2, null, 'pilot', sk('passive', 'ignoreSmallHits', 0, 0, 5)), E('Chronoscope stellaire', 4, 0, 0, null, 'pilot', sk('endCombat', 'permAlliesStats', 1, 1)), E('Compensateur quantique', 2, 1, 1, null, 'pilot', sk('startCombat', 'grantShieldAlly')),
  E('Boussole stellaire', 4, 0, 0, null, 'explorer', sk('passive', 'firstOfferUp')),
  E('Sonde tridimensionnelle', 3, 0, 0, null, 'explorer', sk('passive', 'firstEquipOffType', 0, 0, 25)),
  E('Scanner géologique', 2, 0, 0, null, 'explorer', sk('startCombat', 'buffAllAllies', 1, 1)),
  E('Balise de Voronoï', 5, 0, 0, null, 'explorer', sk('startCombat', 'doubleLeftmostHp')),
  E('Sceau pacificateur', 5, 0, 0, null, 'diplomat', sk('startCombat', 'pacify')),
  E('Mandat de protection', 3, 0, 0, null, 'diplomat', sk('startCombat', 'shieldLowestHp')),
  E('La pomme de discorde', 2, 0, 0, null, 'diplomat', sk('startCombat', 'discordApple')),
  E('Médaillon des mille voix', 6, 0, 0, null, 'diplomat', sk('startCombat', 'buffPerSpecies', 1, 1)),
  E('Renfort adaptatif', 1, 0, 0, null, 'engineer', sk('startCombat', 'doubleLowestHp')),
  E("Duplicateur d'impulsion", 3, 0, 0, null, 'engineer', sk('startCombat', 'replayFirstStart')),
  E('Oscillateur hyperfréquence', 4, 0, 0, null, 'engineer', sk('endReinforcement', 'buffRightmost', 1, 1)),
  E("Régulateur d'intégrité", 5, 0, 0, null, 'engineer', sk('startCombat', 'balanceLeftHp')),
  E('Protocole balistique', 5, 0, 0, null, 'roboticist', sk('passive', 'droneRanged')),
  E('Résonateur d\'essaim', 3, 0, 0, null, 'roboticist', sk('passive', 'swarmResonance', 2, 0)),
  E('Extracteur de routines', 2, 0, 0, null, 'roboticist', sk('passive', 'extractRoutines')),
  E('Le protocole Lazare', 3, 0, 0, null, 'roboticist', sk('passive', 'lazarus')),
  E('Injecteur de nanites', 1, 0, 0, null, 'medic', sk('afterDamage', 'healSelf', 0, 0, 2)),
  E('Défibrillateur portatif', 4, 0, 0, null, 'medic', sk('passive', 'cheatDeath')),
  E('Modulateur génétique', 5, 0, 0, null, 'medic', sk('endReinforcement', 'trade', 0, 3, 2)),
  E('Sérum régénératif', 2, 0, 0, null, 'medic', sk('endReinforcement', 'buffSelf', 0, 1)),
  E('Égide de secours', 2, 0, 0, null, 'security', sk('afterDamage', 'shieldSelfOnce')),
  E('Projecteur de bouclier', 1, 0, 0, null, 'security', sk('startCombat', 'shieldLowestHp')),
  E('Tir de couverture', 4, 0, 0, null, 'security', sk('assault', 'coverFire')),
  E('Accélérateur balistique', 1, 0, 0, null, 'artillerist', sk('attackNoKill', 'permAtkNoKill', 2, 0)),
  E('Charge à fragmentation', 4, 0, 0, null, 'artillerist', sk('startCombat', 'plantSplashBomb', 0, 0, 3)),
  E('Bombardement orbital', 6, 0, 0, null, 'artillerist', sk('startCombat', 'dmgAllEnemiesRange', 1, 0, 3)),
  E('Détecteur de vulnérabilités', 2, 0, 0, null, 'intelligence', sk('passive', 'targetLowestHp')),
  E('Brouilleur quantique', 3, 0, 0, null, 'intelligence', sk('startCombat', 'jamFirstStart')),
  E('Brouilleur synaptique', 5, 0, 0, null, 'intelligence', sk('startCombat', 'muteRiposte')),
  E("Réseau d'informateurs", 3, 0, 0, null, 'intelligence', sk('startCombat', 'buffAlliesPerIntel', 3, 3)),
  E('Ogive instable', 6, 0, 0, null, 'artillerist', sk('deathrattle', 'dmgOwnAtk')),
  E('Accumulateur balistique', 6, 0, 0, null, 'security', [sk('allyShieldLoss', 'accumulate'), sk('deathrattle', 'releaseAccum')]),
];

// Each hero has two types: here a species and an archetype (nothing enforces it).
const HEROES = indexById([
  { name: 'Capitaine Rol Vex', types: ['elk', 'pilot'], hp: 30, kw: 'prov',
           power: sk('shieldLost', 'regenShield', 0, 0, 1) },
  { name: 'ZC-D9', types: ['droid', 'roboticist'], hp: 25, kw: null,
           power: sk('startReinforcement', 'creeUnite') },
  { name: "Flam'Gruk", types: ['dwork', 'explorer'], hp: 28, kw: null,
           power: sk('startReinforcement', 'datacube') },
  { name: 'TE-5T', types: ['droid', 'engineer'], hp: 29, kw: null,
           power: sk('startReinforcement', 'genDroide', 0, 0, 5) }
], 'Lieutenants', 'lieutenants');
// Lieutenants set aside: to put back in HEROES to bring them back into play (see the Object.assign line below).
const HEROES_RESERVE = indexById([
  { name: "Brokk'Ric", types: ['dwork', 'engineer'], hp: 34, kw: null,
           power: sk('startReinforcement', 'forgePatch', 0, 0, 3) },
  { name: 'Reyes', types: ['ryskan', 'roboticist'], hp: 32, kw: null,
           power: sk('startReinforcement', 'forgeRoboticien', 0, 0, 2) },
  { name: 'Docteur Zel Iris', types: ['elk', 'medic'], hp: 28, kw: null,
           power: sk('startCombat', 'debuffByLevel') },
  // Hal Ana: start-of-mission power, resolved by the launch menu (see ACT.start).
  { name: 'Hal Ana', types: ['elk', 'intelligence'], hp: 28, kw: null,
           power: sk('startMission', 'prophecy') },
  { name: 'Ysha la Thanéenne', types: ['sorvane', 'medic'], hp: 30, kw: null,
           power: sk('active', 'grantRebirth') },
  // Sulseye: paid active power, with no limit per reinforcement (see ACTIVES.completeFusion).
  { name: 'Sulseye', types: ['ryskan', 'diplomat'], hp: 28, kw: null,
           power: sk('active', 'completeFusion') },
  { name: 'Waven la Précieuse', types: ['sorvane', 'diplomat'], hp: 30, kw: null,
           power: sk('active', 'triggerBattlecry') },
  // Amber: no power yet (power: null, handled by the interface, the engine and the page generators).
  { name: "Amber l'Acrobate", types: ['sorvane', 'explorer'], hp: 30, kw: null, power: null }
], 'Lieutenants (réserve)', 'lieutenants');

// Provisional: all existing lieutenants are offered when a game starts. Remove this line to set the reserve aside again.
Object.assign(HEROES, HEROES_RESERVE);
assertUniqueIds(SERVANTS, 'Serviteurs'); assertUniqueIds(EQUIPS, 'Équipements');

// Mini-boss: one fixed servant per Boss board, present from the first room and never replaced or removed.
// It has a single type (the one it represents) and grows by +1/+1 at each reinforcement. One mini-boss per type for the whole game;
// their specialties will come later (provisional: none for now).
const DUMMY_GROWTH = sk('startReinforcement', 'buffSelf', 1, 1);
const miniBoss = type => ({ name: `Mini-boss ${typeName(type)}`, rank: 1, atk: 1, hp: 3, types: [type], kw: [], fixed: true, skill: [DUMMY_GROWTH] });

// Each dungeon has 3 fixed types: its own (the Boss) and two others (`minis`), one mini-boss per board. Two random types complete it to 5 each game.
const DUNGEONS = indexById([
  { name: 'Le Nid de la Reine', type: 'medic', minis: ['nythe', 'sorvane'], boss: { name: 'La Reine-Mère', hp: 250, power: 'regen',
         desc: 'Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu\'à leur maximum).' } },
  { name: 'Station Oméga', type: 'droid', minis: ['roboticist', 'engineer'], boss: { name: 'Intelligence Oméga', hp: 200, power: 'surge',
         desc: 'Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies.' } },
  { name: 'La Cité des Profondeurs', type: 'intelligence', minis: ['diplomat', 'elk'], boss: { name: 'L\'Oracle Souterrain', hp: 220, power: 'frenzy',
         desc: 'Écho : chaque fois qu\'un de ses serviteurs attaque, il gagne +1 ATQ jusqu\'à la fin du combat.' } },
  { name: 'La Forge de Brasier-Roc', type: 'artillerist', minis: ['dwork', 'ryskan'], boss: { name: 'Maître-Forgeron Grumm', hp: 220, power: 'plate',
         desc: 'Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV.' } }
], 'Donjons', 'dungeons');
// Dungeon mini-boss: the one of its own type first, then those of the two other fixed types, one per board. Reference = dungeon + name.
Object.values(DUNGEONS).forEach(d => { d.dummies = [d.type, ...d.minis].map(t => { const m = miniBoss(t); m.id = `${d.id}--${slug(m.name)}`; return m; }); });
assertUniqueIds(Object.values(DUNGEONS).flatMap(d => d.dummies), 'Mini-boss');
