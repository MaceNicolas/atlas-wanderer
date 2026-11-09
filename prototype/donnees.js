// Atlas Wanderer — données : constantes, types, serviteurs, équipements, héros, donjons (contenu provisoire).
'use strict';
// =====================================================================
// DONNÉES — tout ce qui n'est pas dans documentation/idees/nouvelles.md est PROVISOIRE
// (contenu, chiffres, types). Les règles, elles, suivent documentation/idees/nouvelles.md.
// =====================================================================
const MAX_BOARD = 7;          // règle : plateau à 7
const MAX_LEVEL = 6;          // ouvert : niveau max de renfort (provisoire) ; égal au rang maximum proposé en renfort
const PROPHECY_COST = 60;     // Datacrons à dépenser pour que le serviteur d'Hal Ana arrive en jeu (provisoire)
const FUSION_COST = 3;        // Sulseye : coût de son pouvoir, en Datacrons (toujours le même)
const FUSION_STEP = 0;        // Sulseye : surcoût ajouté après chaque utilisation (aucun : le coût reste fixe)
const MAX_RANK = 7;           // rang 7 : uniquement en récompense de fusion
const PROPOSALS = 3;          // récompense de fusion : nombre de propositions (provisoire)
// Cartes du renfort (serviteurs et équipements tirés ensemble) : 3 propositions au niveau 1, 4 au niveau 2, 5 aux niveaux 3-4, 6 à partir du niveau 5.
const renfortProposals = level => level >= 5 ? 6 : level >= 3 ? 5 : level >= 2 ? 4 : 3;
const MIN_SERVANTS = 2;       // renfort : minimum de serviteurs parmi les cartes proposées (les autres peuvent être des équipements)
const EQUIP_CHANCE = 0.3;     // renfort : probabilité qu'une carte tirée soit un équipement (provisoire)
const FATIGUE_START = 30;     // ouvert : seuil de l'usure (provisoire)
const HAND_MAX = 7;           // main : 7 emplacements (serviteurs et équipements confondus)
// Datacrons gagnés à chaque renfort, selon la salle (provisoire) ; au-delà, la dernière valeur.
const INCOME = [3, 3, 4, 3, 5, 3, 4, 4, 5, 4, 4, 5, 4, 5, 5, 4, 5, 5, 5, 5];
const incomeFor = room => INCOME[Math.min(room, INCOME.length) - 1];
// Le Boss joue trois plateaux indépendants, renforcés chaque salle comme un joueur (moteur.js).
// malus : Datacrons en moins par salle (1 = toujours un de moins, 0.5 = un de moins une fois sur deux).
const BOSS_BOARDS = [{ malus: 1 }, { malus: 0.5 }, { malus: 0 }];

// Comportements des plateaux du Boss (provisoire). Chaque partie en tire trois différents, un par plateau.
//   want(room)   : nombre de serviteurs visé avant d'investir ailleurs ;
//   level(room)  : niveau de renfort visé à cette salle ;
//   equipP       : probabilité d'acheter un équipement plutôt qu'un serviteur une fois le plateau rempli ;
//   score(t, c)  : valeur d'une carte proposée (la meilleure est choisie, voir cardScore dans moteur.js) ;
//   target(t)    : serviteur du plateau qui reçoit un équipement.
const BOSS_BEHAVIORS = {
  equilibre: { name: 'Équilibré', desc: 'Remplit son plateau peu à peu et monte de niveau régulièrement.',
    want: room => Math.min(MAX_BOARD, 3 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 3), equipP: 0.4 },
  horde: { name: 'Horde', desc: 'Remplit vite son plateau, monte lentement de niveau et équipe peu.',
    want: room => Math.min(MAX_BOARD, 4 + Math.floor(room / 2)), level: room => 1 + Math.floor(room / 5), equipP: 0.2,
    target: t => t.board.reduce((b, s) => (s.equips.length < b.equips.length ? s : b)) },   // répartit les équipements
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
const TRIG = {
  startCombat: 'Début de combat', deathrattle: "Râle d'agonie", endCombat: 'Fin de combat',
  active: 'Actif (une fois par renfort)', startMission: 'Début de la mission', battlecry: 'Cri de guerre', startRenfort: 'Début de renfort', endRenfort: 'Fin de renfort',
  passive: 'Permanent', assault: 'Assaut', enemyAttacks: "Lorsqu'un ennemi attaque", onAllyHit: 'Après chaque attaque reçue par un allié', space: "Lorsqu'il y a de la place sur le plateau", onSummon: "Lorsqu'un drone est invoqué", allyDeath: "Lorsqu'un allié meurt", enemyDeath: "Lorsqu'un ennemi meurt", survive: "Lorsqu'il survit à une attaque", shieldLost: "Lorsqu'un allié perd son Bouclier", enemyPilotDeath: "Lorsqu'un Pilote ennemi meurt", allyPilotDeath: "Lorsqu'un Pilote allié meurt", attackSurvive: "Lorsqu'il survit à son attaque", pilotSurvives: "Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige"
};
// Règle : une compétence est soit de combat, soit de renfort, jamais les deux.
const TRIG_KIND = { active: 'renfort', startMission: 'renfort', startCombat: 'combat', deathrattle: 'combat', endCombat: 'combat', space: 'combat', onSummon: 'combat', allyDeath: 'combat', enemyDeath: 'combat', survive: 'combat', shieldLost: 'combat', pilotSurvives: 'combat', enemyPilotDeath: 'combat', allyPilotDeath: 'combat', attackSurvive: 'combat', passive: 'combat', assault: 'combat', enemyAttacks: 'combat', onAllyHit: 'combat', battlecry: 'renfort', startRenfort: 'renfort', endRenfort: 'renfort' };

let UID = 0;
const uid = () => ++UID;
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];

// Adaptation : pouvoir signature des Elk (règle dans documentation/idees/nouvelles.md). Le choix se joue à la fin du combat, hors de applyFx.
const ADAPT_TEXT = 'Adaptation : à la fin du combat, peut s\'améliorer en utilisant les pouvoirs d\'un allié survivant';
const ADAPT = { t: 'endCombat', fx: 'adapt', a: 0, h: 0, n: 0 };
// Faces du datacube (Datacrons gagnés ou perdus). Le tirage se fait dans un sac de billes : voir drawCube (moteur.js).
const CUBE_FACES = [-3, -1, 1, 2, 2, 3];
// Patch cybernétique de Reyes : X de 1 à 6, la valeur X étant présente (7 - X) fois dans le pool (six fois le 1, une fois le 6).
const PATCH_MAX = 6;
const sk = (t, fx, a = 0, h = 0, n = 0) => ({ t, fx, a, h, n });
function skDesc(k) {
  if (k.fx === 'adapt') return ADAPT_TEXT;
  const bf = `+${k.a}/+${k.h}`;
  const d = {
    buffSelf: `${bf} à lui-même`,
    buffAllies: `${bf} aux autres alliés`,
    buffRandomAlly: `${bf} à un allié aléatoire`,
    buffLeftmost: `${bf} à l'allié le plus à gauche`,
    debuffByLevel: `retire X ATQ à un ennemi aléatoire, X étant le niveau de renfort actuel`,
    forgeRoboticien: `Tous les ${k.n} renforts : fabrique un équipement Roboticien au hasard (de n'importe quel rang) qui rejoint votre main`,   // Reyes : l'effet est joué par renfortFx
    creeUnite: `crée une Unité de maintenance (équipement +2/+2) qui rejoint votre main`,   // ZC-D9 : l'effet est joué par renfortFx
    forgePatch: `Tous les ${k.n} renforts : crée un Patch d'ingénieur qui rejoint votre main ; il donne au serviteur équipé le pouvoir d'un serviteur tiré au hasard, de rang inférieur ou égal au niveau de renfort`,   // Brokk'Ric : l'effet est joué par renfortFx
    cyberPatch: `applique un patch cybernétique au serviteur le plus à droite : +X/+X, X tiré entre 1 et ${PATCH_MAX} (1 est six fois plus probable que ${PATCH_MAX})`,
    buffEnds: `${bf} aux alliés le plus à gauche et le plus à droite`,
    dmgRandomEnemy: `${k.n} dégâts à un ennemi aléatoire`,
    plantBombs: `pose ${k.a === 1 ? 'une bombe' : k.a + ' bombes'} infligeant ${k.n} dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque`,
    debuffRandomEnemy: `retire ${k.n} ATQ à un ennemi aléatoire`,
    hpRightmostTo1: `réduit les PV du serviteur ennemi le plus à droite à 1`,
    datacube: `lance un datacube : ${CUBE_FACES.join(', ')} Datacrons`,
    prBoost: `le modèle PR gagne ${bf}`,
    prPersist: `Ne régénère pas ses caractéristiques durant les renforts, meurt définitivement et ne peut pas être ressuscité`,
    swapStatsMostHp: `inverse la vie et l'attaque de l'ennemi ayant le plus de points de vie`,
    buffEquippedAlly: `${bf} à un allié équipé`,
    buffPerType: `${bf} par type différent dans votre équipe (max 3)`,
    buffPerTypeUncapped: `${bf} par type différent dans votre équipe`,
    summon: `invoque un drone ${k.a}/${k.h} ${k.t === 'deathrattle' ? 'à sa place' : 'à sa droite'}`,
    buffAdjacent: `${bf} aux alliés adjacents`,
    buffPilots: `donne définitivement ${[k.a && `+${k.a} ATQ`, k.h && `+${k.h} PV`].filter(Boolean).join(' et ')} aux Pilotes alliés`,
    buffPilotsPerEnemyPilot: `chaque Pilote allié gagne +${k.a}/+${k.h} pour chaque Pilote ennemi`,
    pilotGrows: `ce Pilote gagne définitivement +${k.a} ATQ`,
    equipUnavailable: `s'équipe d'un équipement de niveau ${k.n} non disponible durant cette partie`,
    buffPerEnemyType: `${bf} par type différent chez les ennemis`,
    buffAdjacentPerType: `les deux alliés adjacents gagnent définitivement ${bf} par type différent dans votre équipe`,
    adaptExtra: `s'il a survécu, choisissez une Adaptation supplémentaire pour lui`,
    addUnavailableEquip: `ajoute à votre main un équipement de niveau ${k.n} non disponible durant cette mission`,
    bigEquipOffer: k.times > 1 ? `vos ${k.times} prochains renforts vous proposeront ${k.n} cartes` : `votre prochain renfort vous proposera ${k.n} cartes`,
    gainDossier: `reçoit un Dossier consulaire (équipement -1/+3)`,
    stripProvLowestHp: `retire la Provocation de l'ennemi ayant le moins de PV`,
    gainHighestHp: `copie les PV du personnage ayant le plus de PV sur le plateau`,
    replayRattles: `reproduit les Râles d'agonie déjà utilisés durant ce combat`,
    rightmostAttacksLeftmost: `l'ennemi le plus à droite attaque l'ennemi le plus à gauche`,
    swapHpExtremes: `l'ennemi ayant le moins de PV échange ses PV avec l'ennemi qui en a le plus`,
    replayAdjacentStart: `rejoue les effets de début de combat de ses voisins directs`,
    permStats: `gagne définitivement ${bf}`,
    furyAdjacentPilots: `donne Fureur aux Pilotes alliés adjacents`,
    debuffLeftmost: `retire ${k.n} ATQ à l'ennemi le plus à gauche`,
    stripShield: `retire le Bouclier d'un ennemi, si possible`,
    stripProv: `retire la Provocation de tous les ennemis`,
    swapHpLeftmost: `échange ses PV avec l'ennemi le plus à gauche`,
    targetPilot: `Cible en priorité un Pilote ennemi`,
    targetLowestHp: `Cible : l'ennemi avec le moins de points de vie`,
    shieldCharges: `Son Bouclier résiste à ${k.n} coups`,
    healLastSurvivor: `Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque`,
    wildSwing: `Inflige parfois le double des dégâts à l'ennemi à côté de sa cible, ou des dégâts à un de ses alliés voisins`,
    doubleVsPilots: `Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis`,
    dmgAttacker: `lui inflige X points de dégâts, X étant son rang`,
    preemptShot: `tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque)`,
    debuffAttacker: k.n ? `lui retire ${k.n} ATQ` : `lui retire X ATQ, X étant son rang`,
    breakShield: `Détruit le Bouclier de la cible avant de l'attaquer`,
    healAttacked: `soigne ${k.n} PV à cet allié`,
    healLeftmost: `soigne ${k.n} PV à l'allié le plus à gauche`,
    healAllies: `soigne ${k.n} PV à tous les alliés`,
    buffSummoned: `le drone invoqué gagne ${bf}`,
    regenShield: `le régénère (${k.n === 1 ? 'une fois' : k.n + ' fois'} par combat)`,
    buffPerEquip: `gagne +${k.a > 1 ? k.a : ''}X/+${k.h > 1 ? k.h : ''}X, X étant le nombre d'équipements de l'équipe`,
    resurrect: `le ressuscite avec ses caractéristiques (${k.n === 1 ? 'une fois' : k.n + ' fois'} par combat)`,
    permAtk: `gagne définitivement +${k.a} ATQ`,
    scavenge: `récupère un de ses équipements pour le combat en cours`,
    gainEquip: `reçoit un équipement (niveau actuel)`,
    gainUnavailableEquip: `trouve ${k.n > 1 ? k.n + ' équipements' : 'un équipement'} de niveau 3 ou 4 non disponible durant cette partie (d'un type absent de votre équipe)`,
    discoverEquip: `découvre un équipement de niveau ${k.n} non disponible durant cette partie (choix parmi ${PROPOSALS}, d'un type absent de votre équipe)`,
    gainAnyEquip: `ajoute à votre main ${k.n > 1 ? k.n + ' équipements' : 'un équipement'} de niveau 5 ou 6 parmi tous les équipements du jeu (même ceux qui ne sont pas disponibles durant cette mission)`,
    prophecy: `découvre un serviteur de rang ${MAX_RANK} ; il arrive en jeu quand ${PROPHECY_COST} Datacrons ont été utilisés`,
    equipKit: `équipe un allié aléatoire d'un Kit de renfort du rang actuel`,
    completeFusion: `pour ${FUSION_COST} Datacron${FUSION_COST > 1 ? 's' : ''}, crée la dernière copie d'un serviteur dont vous avez deux exemplaires pour les fusionner`,
    triggerBattlecry: `déclenche le cri de guerre de l'allié ciblé`,
    grantRebirth: `donne Renaissance à un serviteur jusqu'au prochain renfort`,
    genDroide: `Salle ${k.n} : génère un serviteur Droïde aléatoire (de n'importe quel rang) qui rejoint votre main`,   // TE-5T : l'effet est joué par renfortFx
    droneBoostGame: `donne +${k.a}/+${k.h} à tous vos drones, présents et futurs, jusqu'à la fin de la partie`,
    droneAura: `les drones invoqués par votre camp ont +${k.a}/+${k.h} tant qu'il est en vie`,
    buffChosenAlly: `donne +${k.a} ATQ à un allié de votre choix`,
    copyHighestAtk: `copie l'attaque du personnage ayant le plus d'attaque sur le plateau`,
    atkPerAllyPilot: `gagne +${k.a} ATQ par Pilote allié`,
    ignoreSmallHits: `les dégâts subis inférieurs à ${k.n} sont annulés`,
    permAlliesStats: `donne définitivement +${k.a}/+${k.h} à tous les alliés survivants, lui compris`,
    grantShieldAlly: `donne un Bouclier à un allié aléatoire`,
    firstEquipOffType: `la première carte équipement de chaque proposition de renfort (à chaque Datacron dépensé) a ${k.n} % de chances d'être d'un type indisponible durant la partie (les exemplaires se cumulent)`,
    buffAllAllies: `donne +${k.a}/+${k.h} à tous les alliés`,
    doubleLeftmostHp: `double les PV du personnage le plus à gauche (ne se cumule pas, même avec plusieurs exemplaires)`,
    pacify: `le serviteur ennemi avec le plus d'ATQ ne peut pas attaquer lors de sa première occasion`,
    shieldLowestHp: `donne un Bouclier à l'allié ayant le moins de PV`,
    buffPerSpecies: `gagne +${k.a}/+${k.h} pour chaque espèce différente parmi vos serviteurs`,
    discordApple: `le serviteur ennemi avec le moins de PV inflige ses dégâts d'Attaque à un autre ennemi aléatoire`,
    firstOfferUp: `la première proposition de chaque renfort contient une carte de rang supérieur au niveau de renfort (les exemplaires ne se cumulent pas)`,
    droneBonus: `vos drones sont invoqués avec ${bf} jusqu'à la fin de la mission`
  }[k.fx];
  return k.t === 'passive' || k.fx === 'genDroide' || k.fx === 'forgeRoboticien' || k.fx === 'forgePatch' ? d : `${k.fx === 'completeFusion' ? 'Actif' : TRIG[k.t]} : ${d}`;   // Sulseye : actif sans limite par renfort, son coût remplace la mention   // un pouvoir permanent n'a pas de déclencheur
}

// Pouvoirs affichés d'une carte, les identiques fusionnés (×N). Les mots-clés et l'Adaptation sont « fixes » : toujours les mêmes,
// la carte n'en écrit que le nom. Les compétences (valeurs variables) sont décrites en toutes lettres.
function powersOf(kws, skills, drone, spent = []) {
  const out = [], add = (id, key, name, text, kind, fixed) => {
    let p = out.find(q => q.id === id);
    if (!p) out.push(p = { id, key, name, text, kind, fixed, count: 0, spent: false });
    p.count++; return p;
  };
  kws.forEach(k => { if (KW[k]) { const p = add('kw:' + k, k, KW[k], KW[k], 'combat', true); if (spent.includes(k)) p.spent = true; } });
  skills.forEach(k => k.fx === 'adapt' ? add('adapt', 'adapt', 'Adaptation', ADAPT_TEXT, 'combat', true) : add(`${k.t}:${k.fx}:${k.a}:${k.h}:${k.n}`, k.fx, null, skDesc(k), TRIG_KIND[k.t], false));
  if (drone && (drone.a || drone.h)) add('drone', 'drone', null, `Drones invoqués : +${drone.a}/+${drone.h}`, 'combat', false);
  return out;
}

// Types (documentation/types/) : espèces = ce qu'est le serviteur, archétypes = comment il se joue.
// Une seule famille de types pour les règles. Chaque serviteur a une espèce et un archétype obligatoire.
const SPECIES = ['Elk', 'Dwork', 'Droïde', 'Sorvane', 'Ryskan', 'Nythe'];
const ARCHETYPES = ['Pilote', 'Ingénieur', 'Médecin', 'Sécurité', 'Explorateur', 'Artilleur', 'Renseignement', 'Roboticien', 'Diplomate'];
const ALL_TYPES = [...SPECIES, ...ARCHETYPES];

// Identifiants : un par carte, FIXES. Le nom est une simple étiquette qu'on peut changer librement ; l'identifiant, lui, ne change jamais.
// Il sert de référence partout : historique des tests (comparaison, évolution), sauvegardes, illustrations (prototype/images/<catégorie>/<identifiant>.<ext>).
// Renommer une carte : changer son nom ici ET dans sa définition. Nouvelle carte : lui ajouter une ligne ici (sinon le jeu refuse de démarrer).
const IDENTIFIANTS = {
  serviteurs: {
    "intercepteur": "Intercepteur",
    "lieutenant-de-pont": "Lieutenant de pont",
    "commandant-de-vol": "Commandant de vol",
    "lr-04": "LR-04",
    "c0-4193": "C0-4193",
    "apprenti-mecanicien": "Apprenti mécanicien",
    "ingenieur-de-pont": "Ingénieur de pont",
    "specialiste-des-boucliers": "Spécialiste des boucliers",
    "chef-mecanicien": "Chef mécanicien",
    "ingenieur-en-chef": "Ingénieur en chef",
    "secouriste-de-combat": "Secouriste de combat",
    "infirmier": "Infirmier",
    "chirurgien-de-bord": "Chirurgien de bord",
    "medecin-chef": "Médecin-chef",
    "fusilier": "Fusilier",
    "garde-de-bord": "Garde de bord",
    "sergent": "Sergent",
    "p0-c5": "P0-C5",
    "commandant-de-la-garde": "Commandant de la garde",
    "eclaireur": "Éclaireur",
    "pionnier": "Pionnier",
    "auw0": "AUW0",
    "specialiste-en-brouillage": "Spécialiste en brouillage",
    "cartographe": "Cartographe",
    "chasseur-de-reliques": "Chasseur de reliques",
    "contrebandier": "Contrebandier",
    "grenadier": "Grenadier",
    "tireur-d-elite": "Tireur d'élite",
    "soldat-d-assaut": "Soldat d'assaut",
    "maitre-artilleur": "Maître-artilleur",
    "bombardier": "Bombardier",
    "f5-5f": "F5-5F",
    "embusque": "Embusqué",
    "intrus-reseau": "Intrus réseau",
    "w1x05": "W1X05",
    "commando": "Commando",
    "maitre-espion": "Maître espion",
    "spectre": "Spectre",
    "technosophe": "Technosophe",
    "gad5": "GAD5",
    "operateur-de-drone": "Opérateur de drone",
    "operateur-d-essaim": "Opérateur d'essaim",
    "chef-d-atelier": "Chef d'atelier",
    "architecte-d-essaim": "Architecte d'essaim",
    "biologiste": "Biologiste",
    "geneticien": "Généticien",
    "attache-de-liaison": "Attaché de liaison",
    "krl": "KRL",
    "assistant-consulaire": "Assistant consulaire",
    "diplomate": "Diplomate",
    "ambassadeur": "Ambassadeur",
    "al-11": "AL-11",
    "assembleur": "Assembleur",
    "orateur-imperial": "Orateur impérial",
    "cadet": "Cadet",
    "assistant-de-labo": "Assistant de labo",
    "scout": "Scout",
    "pilote-de-combat": "Pilote de combat",
    "maitre-canonnier": "Maître-canonnier",
    "maitre-mecanicien": "Maître mécanicien",
    "chirurgien": "Chirurgien",
    "naturaliste": "Naturaliste",
    "agent-de-securite": "Agent de sécurité",
    "emissaire": "Émissaire",
    "maitre-des-drones": "Maître des drones",
    "corsaire": "Corsaire",
    "explorateur-des-confins": "Explorateur des confins",
    "grande-doyenne": "Grande Doyenne",
    "septieme-sentinelle": "Septième sentinelle",
    "chasseur-de-prime": "Chasseur de prime",
    "biochirurgien": "Biochirurgien",
    "maitre-des-vents": "Maître des vents",
    "forgeron-stellaire": "Forgeron stellaire",
    "briseur-de-fronts": "Briseur de fronts",
    "tisseur-de-routes": "Tisseur de routes",
    "nexus": "Nexus",
    "cybermancien": "Cybermancien",
    "ombre": "Ombre",
    "m1-fe": "M1-FE",
    "prospecteur": "Prospecteur",
    "seigneur-de-la-flotte": "Seigneur de la flotte",
    "le-grand-mecanicien": "Le Grand Mécanicien",
    "gardien-du-genome": "Gardien du génome",
    "traqueur-des-ombres": "Traqueur des ombres",
    "canon-monde": "Canon-monde",
    "maitre-des-ombres": "Maître des ombres",
    "ff548": "FF548",
    "chancelier": "Chancelier",
    "brise-siege": "Brise-siège",
    "maitre-des-accords": "Maître des accords",
    "rd44": "RD44",
    "sentinelle": "Sentinelle",
    "ingenieur-de-distorsion": "Ingénieur de distorsion",
    "z3rk": "Z3RK",
    "de-d0": "DE-D0",
    "xn-ff45": "XN-FF45",
    "fantome": "Fantôme",
    "pilleur-de-ruine": "Pilleur de ruine",
    "chasseur-de-fregates": "Chasseur de frégates"
  },
  equipements: {
    "cristal-de-veille": "Cristal de veille",
    "diademe-d-harmonie": "Diadème d'harmonie",
    "lame-de-ramure": "Lame de ramure",
    "couronne-des-anciens": "Couronne des anciens",
    "pioche-renforcee": "Pioche renforcée",
    "casque-de-mineur": "Casque de mineur",
    "marteau-de-forge": "Marteau de forge",
    "foreuse-portative": "Foreuse portative",
    "circuit-auxiliaire": "Circuit auxiliaire",
    "servo-de-precision": "Servo de précision",
    "noyau-surcadence": "Noyau surcadencé",
    "matrice-de-calcul": "Matrice de calcul",
    "griffe-de-chasse": "Griffe de chasse",
    "cape-de-camouflage": "Cape de camouflage",
    "lame-silencieuse": "Lame silencieuse",
    "manteau-argente": "Manteau argenté",
    "lance-de-meute": "Lance de meute",
    "plastron-dore": "Plastron doré",
    "etendard-ryskan": "Étendard ryskan",
    "cuirasse-d-ambre": "Cuirasse d'ambre",
    "fragment-nacre": "Fragment nacré",
    "voile-de-sphere": "Voile de sphère",
    "c-ur-de-nacre": "Cœur de nacre",
    "sphere-prismatique": "Sphère prismatique",
    "gants-de-pilotage": "Plan de vol",
    "stabilisateur-de-vol": "Interface de vol neural",
    "propulseur-d-appoint": "Chronoscope stellaire",
    "manette-de-precision": "Compensateur quantique",
    "boussole-stellaire": "Boussole stellaire",
    "sonde-tridimensionnelle": "Sonde tridimensionnelle",
    "scanner-geologique": "Scanner géologique",
    "balise-de-voronoi": "Balise de Voronoï",
    "sceau-pacificateur": "Sceau pacificateur",
    "mandat-de-protection": "Mandat de protection",
    "la-pomme-de-discorde": "La pomme de discorde",
    "le-sceau-des-mondes": "Médaillon des milles voix",
    "tournevis-sonique": "Tournevis sonique",
    "cablage-renforce": "Câblage renforcé",
    "generateur-portatif": "Générateur portatif",
    "plan-d-ingenierie": "Plan d'ingénierie",
    "trousse-de-soins": "Trousse de soins",
    "seringue-de-stimulants": "Seringue de stimulants",
    "scanner-medical": "Scanner médical",
    "caisson-de-reanimation": "Caisson de réanimation",
    "gilet-pare-balles": "Gilet pare-balles",
    "matraque-electrique": "Matraque électrique",
    "bouclier-antiemeute": "Bouclier antiémeute",
    "armure-de-garde": "Armure de garde",
    "lampe-frontale": "Lampe frontale",
    "carte-stellaire": "Carte stellaire",
    "sac-d-expedition": "Sac d'expédition",
    "balise-de-releve": "Balise de relevé",
    "culasse-amelioree": "Culasse améliorée",
    "viseur-thermique": "Viseur thermique",
    "obus-renforces": "Obus renforcés",
    "canon-lourd": "Canon lourd",
    "micro-dissimule": "Micro dissimulé",
    "dossier-chiffre": "Dossier chiffré",
    "lunettes-d-analyse": "Lunettes d'analyse",
    "reseau-d-informateurs": "Réseau d'informateurs",
    "pince-articulee": "Pince articulée",
    "module-de-controle": "Module de contrôle",
    "atelier-mobile": "Atelier mobile",
    "unite-de-maintenance": "Unité de maintenance",
    "dossier-consulaire": "Dossier consulaire",
    "lettre-d-accreditation": "Lettre d'accréditation",
    "sceau-consulaire": "Sceau consulaire",
    "traite-scelle": "Traité scellé",
    "cape-d-ambassadeur": "Cape d'ambassadeur"
  },
  lieutenants: {
    "capitaine-vex": "Capitaine Rol Vex",
    "zc-d9": "ZC-D9",
    "flam-gruk": "Flam'Gruk",
    "te-5t": "TE-5T",
    "brokk-ric": "Brokk'Ric",
    "reyes": "Reyes",
    "docteur-iris": "Docteur Zel Iris",
    "halana-la-presciente": "Hal Ana",
    "ysha-la-thaneenne": "Ysha la Thanéenne",
    "sulseye": "Sulseye",
    "waven-la-precieuse": "Waven la Précieuse",
    "amber-l-acrobate": "Amber l'Acrobate"
  },
  donjons: {
    "le-nid-de-la-reine": "Le Nid de la Reine",
    "station-omega": "Station Oméga",
    "la-cite-des-profondeurs": "La Cité des Profondeurs",
    "la-forge-de-brasier-roc": "La Forge de Brasier-Roc"
  }
};

// Nom -> identifiant, par catégorie ; un nom absent de la table est une erreur de données.
const IDS_PAR_NOM = Object.fromEntries(Object.entries(IDENTIFIANTS).map(([cat, t]) => [cat, Object.fromEntries(Object.entries(t).map(([id, nom]) => [nom, id]))]));
const idOf = (cat, nom) => { const id = IDS_PAR_NOM[cat][nom]; if (!id) throw new Error(`Identifiant manquant : « ${nom} » (${cat}) n'est pas dans IDENTIFIANTS`); return id; };
const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // sert seulement aux mini-boss (identifiant = donjon + nom)
// Indexe une liste de cartes par identifiant (table IDENTIFIANTS) ; une référence en double est une erreur de données.
function indexById(list, what, cat) {
  const out = {};
  list.forEach(d => { d.id = idOf(cat, d.name); if (out[d.id]) throw new Error(`${what} : référence en double « ${d.id} »`); out[d.id] = d; });
  return out;
}
function assertUniqueIds(list, what) { const seen = new Set(); list.forEach(d => { if (seen.has(d.id)) throw new Error(`${what} : référence en double « ${d.id} »`); seen.add(d.id); }); }

// skill : un pouvoir, ou une liste de pouvoirs.
const S = (name, rank, atk, hp, types, kw = [], skill = null) => ({ id: idOf('serviteurs', name), name, rank, atk, hp, types, kw, skill });
const SERVANTS = [
  // Pilote : ouverture, rythme (le plus à gauche attaque en premier)
  S('Intercepteur', 2, 3, 3, ['Dwork', 'Pilote'], [], sk('passive', 'targetPilot')),
  S('Lieutenant de pont', 3, 4, 4, ['Dwork', 'Pilote'], [], sk('endRenfort', 'buffPilots', 0, 2)),
  S('Commandant de vol', 4, 5, 6, ['Ryskan', 'Pilote'], [], sk('endRenfort', 'buffPilots', 3, 0)),
  S('LR-04', 4, 4, 6, ['Droïde', 'Pilote'], [], sk('pilotSurvives', 'pilotGrows', 4, 0)),
  S('C0-4193', 5, 6, 8, ['Droïde', 'Pilote'], [], sk('startCombat', 'furyAdjacentPilots')),
  // Ingénieur : renforcer via les équipements, Bouclier
  S('Apprenti mécanicien', 1, 1, 3, ['Nythe', 'Ingénieur'], [], sk('survive', 'permAtk', 1, 0)),
  S('Ingénieur de pont', 2, 2, 4, ['Dwork', 'Ingénieur'], [], sk('endRenfort', 'buffRandomAlly', 1, 1)),
  S('Spécialiste des boucliers', 5, 3, 7, ['Elk', 'Ingénieur'], [], sk('endRenfort', 'buffEquippedAlly', 0, 3)),
  S('Chef mécanicien', 4, 4, 7, ['Sorvane', 'Ingénieur'], [], sk('passive', 'droneAura', 4, 4)),
  S('Ingénieur en chef', 5, 5, 9, ['Nythe', 'Ingénieur'], ['shield'], sk('startCombat', 'buffAllies', 1, 1)),
  // Médecin : prévention des dégâts, PV
  S('Secouriste de combat', 1, 1, 3, ['Sorvane', 'Médecin'], [], sk('assault', 'healLeftmost', 0, 0, 2)),
  S('Infirmier', 2, 2, 4, ['Dwork', 'Médecin'], [], sk('shieldLost', 'regenShield', 0, 0, 1)),
  S('Chirurgien de bord', 5, 4, 8, ['Sorvane', 'Médecin'], ['shield']),
  S('Médecin-chef', 4, 4, 7, ['Ryskan', 'Médecin'], [], sk('deathrattle', 'healAllies', 0, 0, 5)),
  // Sécurité : Provocation, Bouclier
  S('Fusilier', 3, 5, 4, ['Ryskan', 'Sécurité'], ['ranged']),
  S('Garde de bord', 2, 2, 5, ['Dwork', 'Sécurité'], [], sk('passive', 'wildSwing')),
  S('Sergent', 3, 3, 6, ['Nythe', 'Sécurité'], ['prov'], sk('endRenfort', 'buffSelf', 0, 3)),
  S('P0-C5', 4, 4, 8, ['Droïde', 'Sécurité'], ['prov', 'shield']),
  S('Commandant de la garde', 5, 6, 11, ['Elk', 'Sécurité'], ['prov', 'shield'], sk('startCombat', 'buffAllies', 0, 4)),
  // Explorateur : À distance, récompense de la diversité de types
  S('Éclaireur', 1, 2, 2, ['Sorvane', 'Explorateur'], ['ranged']),
  S('Pionnier', 2, 2, 4, ['Ryskan', 'Explorateur'], [], sk('startCombat', 'buffPerEnemyType', 2, 0)),
  S('AUW0', 2, 2, 4, ['Droïde', 'Explorateur'], ['ranged', 'poison']),
  S('Spécialiste en brouillage', 3, 2, 5, ['Nythe', 'Pilote'], [], sk('enemyAttacks', 'debuffAttacker')),
  S('Cartographe', 3, 3, 5, ['Nythe', 'Explorateur'], [], sk('startCombat', 'buffPerTypeUncapped', 3, 0)),
  S('Chasseur de reliques', 5, 4, 7, ['Nythe', 'Explorateur'], ['ranged'], [sk('battlecry', 'gainEquip'), sk('deathrattle', 'gainEquip')]),
  S('Contrebandier', 4, 4, 6, ['Ryskan', 'Explorateur'], ['ranged'], sk('enemyDeath', 'scavenge')),
  // Artilleur : À distance, dégâts directs
  S('Grenadier', 1, 3, 2, ['Droïde', 'Artilleur'], ['ranged']),
  S('Tireur d\'élite', 5, 5, 6, ['Sorvane', 'Artilleur'], ['ranged'], sk('passive', 'targetLowestHp')),
  S('Soldat d\'assaut', 3, 4, 4, ['Sorvane', 'Artilleur'], ['fury'], sk('battlecry', 'buffChosenAlly', 2, 0)),
  S('Maître-artilleur', 4, 5, 5, ['Dwork', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 3)),
  S('Bombardier', 4, 5, 7, ['Nythe', 'Artilleur'], [], sk('startCombat', 'plantBombs', 2, 0, 5)),
  S('F5-5F', 5, 6, 7, ['Droïde', 'Artilleur'], ['ranged']),
  // Renseignement : affaiblir l'adversaire
  S('Embusqué', 1, 2, 2, ['Elk', 'Renseignement'], [], ADAPT),
  S('Intrus réseau', 2, 2, 3, ['Droïde', 'Renseignement'], [], sk('startCombat', 'debuffLeftmost', 0, 0, 3)),
  S('W1X05', 3, 3, 4, ['Droïde', 'Renseignement'], [], sk('startCombat', 'stripShield')),
  S('Commando', 3, 3, 4, ['Elk', 'Renseignement'], [], [sk('startCombat', 'debuffRandomEnemy', 0, 0, 2), ADAPT]),
  S('Maître espion', 4, 4, 6, ['Ryskan', 'Renseignement'], [], sk('startCombat', 'hpRightmostTo1')),
  S('Spectre', 5, 6, 6, ['Nythe', 'Renseignement'], [], sk('startCombat', 'swapStatsMostHp')),
  // Roboticien : invoquer des drones
  S('Technosophe', 1, 1, 3, ['Elk', 'Roboticien'], [], ADAPT),
  S('GAD5', 1, 2, 3, ['Droïde', 'Roboticien'], [], sk('endRenfort', 'buffSelf', 0, 1)),
  S('Opérateur de drone', 2, 1, 3, ['Nythe', 'Roboticien'], [], sk('deathrattle', 'summon', 1, 1)),
  S('Opérateur d\'essaim', 5, 3, 6, ['Sorvane', 'Roboticien'], [], [sk('battlecry', 'droneBoostGame', 2, 2), sk('deathrattle', 'summon', 5, 5)]),
  S('Chef d\'atelier', 3, 2, 5, ['Ryskan', 'Roboticien'], [], sk('onSummon', 'buffSummoned', 2, 2)),
  S('Architecte d\'essaim', 5, 4, 8, ['Dwork', 'Roboticien'], [], sk('space', 'summon', 1, 1)),
  S('Biologiste', 5, 4, 9, ['Dwork', 'Médecin'], []),
  S('Généticien', 4, 4, 6, ['Nythe', 'Médecin'], ['poison'], sk('deathrattle', 'buffAllies', 1, 1)),
  // Diplomate : bonus aux alliés adjacents
  S('Attaché de liaison', 2, 2, 3, ['Nythe', 'Diplomate'], [], sk('battlecry', 'discoverEquip', 0, 0, 1)),
  S('KRL', 2, 1, 5, ['Droïde', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 1, 1)),
  S('Assistant consulaire', 1, 2, 4, ['Dwork', 'Diplomate'], [], sk('battlecry', 'gainDossier')),
  S('Diplomate', 3, 2, 6, ['Ryskan', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 2, 1)),
  S('Ambassadeur', 4, 5, 6, ['Sorvane', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 2, 2)),
  S('AL-11', 4, 5, 7, ['Droïde', 'Diplomate'], [], sk('battlecry', 'gainHighestHp')),
  S('Assembleur', 5, 6, 9, ['Nythe', 'Diplomate'], [], sk('startCombat', 'stripProvLowestHp')),
  S('Orateur impérial', 5, 5, 9, ['Ryskan', 'Diplomate'], [], sk('startCombat', 'replayAdjacentStart')),
  // Elk : espèce de l'Adaptation (pouvoir signature). Presque tous la portent à la place d'une compétence ; deux gardent la leur pour servir de modèle aux autres.
  S('Cadet', 1, 2, 2, ['Elk', 'Pilote'], [], sk('enemyPilotDeath', 'permStats', 1, 1)),
  S('Assistant de labo', 1, 2, 2, ['Ryskan', 'Médecin'], [], sk('deathrattle', 'buffRandomAlly', 2, 2)),
  S('Scout', 2, 2, 3, ['Dwork', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Pilote de combat', 2, 2, 4, ['Sorvane', 'Pilote'], [], sk('attackSurvive', 'buffSelf', 2, 0)),
  S('Maître-canonnier', 2, 2, 3, ['Dwork', 'Artilleur'], ['ranged'], sk('passive', 'breakShield')),
  S('Maître mécanicien', 3, 3, 5, ['Elk', 'Ingénieur'], [], ADAPT),
  S('Chirurgien', 3, 2, 6, ['Elk', 'Médecin'], [], [sk('onAllyHit', 'healAttacked', 0, 0, 2), ADAPT]),
  S('Naturaliste', 3, 2, 5, ['Elk', 'Explorateur'], [], [ADAPT, sk('endCombat', 'adaptExtra')]),
  S('Agent de sécurité', 1, 3, 1, ['Elk', 'Sécurité'], [], [sk('passive', 'targetLowestHp'), ADAPT]),
  S('Émissaire', 3, 2, 6, ['Elk', 'Diplomate'], [], [ADAPT, sk('battlecry', 'gainUnavailableEquip', 0, 0, 1)]),
  S('Maître des drones', 4, 3, 6, ['Elk', 'Roboticien'], [], [sk('endCombat', 'droneBonus', 1, 1), ADAPT]),
  S('Corsaire', 2, 4, 5, ['Elk', 'Artilleur'], ['ranged'], ADAPT),
  S('Explorateur des confins', 5, 4, 8, ['Elk', 'Explorateur'], [], [ADAPT, sk('endCombat', 'bigEquipOffer', 0, 0, 7)]),
  S('Grande Doyenne', 6, 5, 11, ['Elk', 'Diplomate'], [], [ADAPT, sk('battlecry', 'copyHighestAtk')]),
  // Rang 6 : deux serviteurs par espèce
  S('Septième sentinelle', 6, 7, 12, ['Nythe', 'Sécurité'], ['shield'], sk('passive', 'shieldCharges', 0, 0, 2)),
  S('Chasseur de prime', 6, 9, 9, ['Ryskan', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 5)),
  S('Biochirurgien', 6, 6, 14, ['Elk', 'Médecin'], [], ADAPT),
  S('Maître des vents', 6, 6, 10, ['Elk', 'Pilote'], [], [sk('enemyAttacks', 'dmgAttacker'), ADAPT]),
  S('Forgeron stellaire', 6, 7, 14, ['Dwork', 'Ingénieur'], [], sk('startRenfort', 'addUnavailableEquip', 0, 0, 5)),
  S('Briseur de fronts', 6, 8, 13, ['Dwork', 'Sécurité'], ['prov', 'rebirth']),
  S('Tisseur de routes', 6, 7, 11, ['Ryskan', 'Pilote'], [], sk('startCombat', 'buffPilotsPerEnemyPilot', 0, 4)),
  S('Nexus', 6, 4, 9, ['Ryskan', 'Roboticien'], [], sk('startCombat', 'summon', 6, 6)),
  S('Cybermancien', 6, 7, 13, ['Nythe', 'Roboticien'], [], sk('startRenfort', 'prBoost', 2, 2)),
  S('Ombre', 6, 9, 8, ['Sorvane', 'Renseignement'], [], sk('startCombat', 'swapHpLeftmost')),
  S('M1-FE', 6, 6, 11, ['Droïde', 'Explorateur'], [], sk('endRenfort', 'buffAdjacentPerType', 1, 1)),
  S('Prospecteur', 1, 2, 3, ['Dwork', 'Explorateur'], [], sk('startCombat', 'buffPerTypeUncapped', 2, 1)),
  // Rang 7 : un serviteur par archétype, obtenu uniquement en récompense de fusion (jamais proposé au renfort)
  S('Seigneur de la flotte', 7, 9, 12, ['Nythe', 'Pilote'], [], sk('allyPilotDeath', 'buffAllies', 5, 5)),
  S('Le Grand Mécanicien', 7, 8, 16, ['Ryskan', 'Ingénieur'], ['shield'], sk('startCombat', 'buffAllies', 2, 2)),
  S('Gardien du génome', 7, 8, 16, ['Nythe', 'Médecin'], [], sk('startCombat', 'buffAllies', 2, 4)),
  S('Traqueur des ombres', 7, 10, 12, ['Sorvane', 'Explorateur'], [], sk('startCombat', 'buffPerTypeUncapped', 2, 2)),
  S('Canon-monde', 7, 12, 10, ['Nythe', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 7)),
  S('Maître des ombres', 7, 8, 12, ['Ryskan', 'Renseignement'], [], sk('startCombat', 'stripProv')),
  S('FF548', 7, 7, 12, ['Droïde', 'Roboticien'], [], sk('space', 'summon', 10, 10)),
  S('Chancelier', 7, 8, 18, ['Elk', 'Diplomate'], [], [ADAPT, sk('startCombat', 'rightmostAttacksLeftmost')]),
  S('Brise-siège', 7, 10, 17, ['Ryskan', 'Sécurité'], ['prov'], sk('passive', 'breakShield')),
  S('Maître des accords', 6, 6, 12, ['Dwork', 'Diplomate'], [], sk('battlecry', 'gainAnyEquip', 0, 0, 1)),   // stats provisoires
  // Espèce + archétype (contenu provisoire : les fiches d'espèces n'ont pas encore de section « Dans le jeu »)
  S('RD44', 2, 2, 5, ['Droïde', 'Ingénieur'], [], sk('endRenfort', 'buffAllies', 0, 1)),
  S('Sentinelle', 3, 4, 3, ['Sorvane', 'Sécurité'], [], sk('enemyAttacks', 'preemptShot')),
  S('Ingénieur de distorsion', 4, 4, 8, ['Ryskan', 'Ingénieur'], ['shield'], sk('startCombat', 'buffEquippedAlly', 2, 0)),
  S('Z3RK', 2, 2, 4, ['Droïde', 'Ingénieur'], [], sk('endRenfort', 'buffRandomAlly', 0, 2)),
  S('DE-D0', 5, 0, 8, ['Droïde', 'Médecin'], [], sk('passive', 'healLastSurvivor')),
  S('XN-FF45', 4, 4, 7, ['Droïde', 'Sécurité'], ['prov'], sk('deathrattle', 'buffAllies', 3, 1)),
  S('Fantôme', 2, 3, 2, ['Sorvane', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Pilleur de ruine', 3, 4, 5, ['Sorvane', 'Explorateur'], [], sk('endCombat', 'equipUnavailable', 0, 0, 3)),
  S('Chasseur de frégates', 4, 5, 4, ['Sorvane', 'Pilote'], ['shield'], [sk('passive', 'targetPilot'), sk('passive', 'doubleVsPilots')])
];

// skill : effet d'équipement, déclenché sur le serviteur qui le porte. Effet de renfort = permanent,
// effet de combat = valable pour le combat seulement.
// mod : modificateur d'invocation { droneA, droneH, text } (bonus donné aux drones invoqués par le porteur).
const E = (name, rank, atk, hp, kw = null, type = null, skill = null, mod = null) => ({ id: idOf('equipements', name), name, rank, atk, hp, kw, type, skill, mod });
// Catalogue réduit (9 novembre 2026) : 4 équipements Pilote, le Sceau pacificateur et le Mandat de protection (Diplomate) et 4 équipements Explorateur (Boussole stellaire, Sonde tridimensionnelle, Scanner géologique, Balise de Voronoï) ; ceux des 6 espèces et des 7 autres archétypes ont été supprimés.
const EQUIPS = [
  E('Plan de vol', 5, 2, 2, null, 'Pilote', sk('startCombat', 'atkPerAllyPilot', 2, 0)), E('Interface de vol neural', 3, 0, 2, null, 'Pilote', sk('passive', 'ignoreSmallHits', 0, 0, 5)), E('Chronoscope stellaire', 4, 0, 0, null, 'Pilote', sk('endCombat', 'permAlliesStats', 1, 1)), E('Compensateur quantique', 2, 1, 1, null, 'Pilote', sk('startCombat', 'grantShieldAlly')),
  E('Boussole stellaire', 4, 3, 3, null, 'Explorateur', sk('passive', 'firstOfferUp')),
  E('Sonde tridimensionnelle', 3, 2, 2, null, 'Explorateur', sk('passive', 'firstEquipOffType', 0, 0, 25)),
  E('Scanner géologique', 2, 2, 2, null, 'Explorateur', sk('startCombat', 'buffAllAllies', 1, 1)),
  E('Balise de Voronoï', 5, 0, 8, null, 'Explorateur', sk('startCombat', 'doubleLeftmostHp')),
  E('Sceau pacificateur', 5, 0, 0, null, 'Diplomate', sk('startCombat', 'pacify')),
  E('Mandat de protection', 3, 3, 3, null, 'Diplomate', sk('startCombat', 'shieldLowestHp')),
  E('La pomme de discorde', 2, 1, 1, null, 'Diplomate', sk('startCombat', 'discordApple')),
  E('Médaillon des milles voix', 6, 5, 5, null, 'Diplomate', sk('startCombat', 'buffPerSpecies', 1, 1)),
];

// Chaque héros a deux types : ici une espèce et un archétype (rien ne l'impose).
const HEROES = indexById([
  { name: 'Capitaine Rol Vex', types: ['Elk', 'Pilote'], hp: 30, kw: 'prov',
           power: sk('shieldLost', 'regenShield', 0, 0, 1) },
  { name: 'ZC-D9', types: ['Droïde', 'Roboticien'], hp: 25, kw: null,
           power: sk('startRenfort', 'creeUnite') },
  { name: "Flam'Gruk", types: ['Dwork', 'Explorateur'], hp: 28, kw: null,
           power: sk('startRenfort', 'datacube') },
  { name: 'TE-5T', types: ['Droïde', 'Ingénieur'], hp: 29, kw: null,
           power: sk('startRenfort', 'genDroide', 0, 0, 5) }
], 'Lieutenants', 'lieutenants');
// Lieutenants mis de côté : à replacer dans HEROES pour les remettre en jeu (voir la ligne Object.assign plus bas).
const HEROES_RESERVE = indexById([
  { name: "Brokk'Ric", types: ['Dwork', 'Ingénieur'], hp: 34, kw: null,
           power: sk('startRenfort', 'forgePatch', 0, 0, 3) },
  { name: 'Reyes', types: ['Ryskan', 'Roboticien'], hp: 32, kw: null,
           power: sk('startRenfort', 'forgeRoboticien', 0, 0, 2) },
  { name: 'Docteur Zel Iris', types: ['Elk', 'Médecin'], hp: 28, kw: null,
           power: sk('startCombat', 'debuffByLevel') },
  // Hal Ana : pouvoir de début de mission, résolu par le menu de lancement (voir ACT.start).
  { name: 'Hal Ana', types: ['Elk', 'Renseignement'], hp: 28, kw: null,
           power: sk('startMission', 'prophecy') },
  { name: 'Ysha la Thanéenne', types: ['Sorvane', 'Médecin'], hp: 30, kw: null,
           power: sk('active', 'grantRebirth') },
  // Sulseye : pouvoir actif payant, sans limite par renfort (voir ACTIVES.completeFusion).
  { name: 'Sulseye', types: ['Ryskan', 'Diplomate'], hp: 28, kw: null,
           power: sk('active', 'completeFusion') },
  { name: 'Waven la Précieuse', types: ['Sorvane', 'Diplomate'], hp: 30, kw: null,
           power: sk('active', 'triggerBattlecry') },
  // Amber : pas encore de pouvoir (power: null, géré par l'interface, le moteur et les générateurs de pages).
  { name: "Amber l'Acrobate", types: ['Sorvane', 'Explorateur'], hp: 30, kw: null, power: null }
], 'Lieutenants (réserve)', 'lieutenants');

// Provisoire : tous les lieutenants existants sont proposés au lancement d'une partie. Supprimer cette ligne pour écarter de nouveau la réserve.
Object.assign(HEROES, HEROES_RESERVE);
assertUniqueIds(SERVANTS, 'Serviteurs'); assertUniqueIds(EQUIPS, 'Équipements');

// Mini-boss : un serviteur fixe par plateau du Boss, présent dès la première salle et jamais remplacé ni supprimé.
// Il n'a qu'un seul type (celui qu'il représente) et grandit de +1/+1 à chaque renfort. Un mini-boss par type pour tout le jeu ;
// leurs spécialités viendront plus tard (provisoire : aucune pour l'instant).
const DUMMY_GROWTH = sk('startRenfort', 'buffSelf', 1, 1);
const miniBoss = type => ({ name: `Mini-boss ${type}`, rank: 1, atk: 1, hp: 3, types: [type], kw: [], fixed: true, skill: [DUMMY_GROWTH] });

// Chaque donjon a 3 types fixes : le sien (le Boss) et deux autres (`minis`), un mini-boss par plateau. Deux types aléatoires complètent à 5 à chaque partie.
const DUNGEONS = indexById([
  { name: 'Le Nid de la Reine', type: 'Médecin', minis: ['Nythe', 'Sorvane'], boss: { name: 'La Reine-Mère', hp: 250, power: 'regen',
         desc: 'Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu\'à leur maximum).' } },
  { name: 'Station Oméga', type: 'Droïde', minis: ['Roboticien', 'Ingénieur'], boss: { name: 'Intelligence Oméga', hp: 200, power: 'surge',
         desc: 'Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies.' } },
  { name: 'La Cité des Profondeurs', type: 'Renseignement', minis: ['Diplomate', 'Elk'], boss: { name: 'L\'Oracle Souterrain', hp: 220, power: 'frenzy',
         desc: 'Écho : chaque fois qu\'un de ses serviteurs attaque, il gagne +1 ATQ jusqu\'à la fin du combat.' } },
  { name: 'La Forge de Brasier-Roc', type: 'Artilleur', minis: ['Dwork', 'Ryskan'], boss: { name: 'Maître-Forgeron Grumm', hp: 220, power: 'plate',
         desc: 'Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV.' } }
], 'Donjons', 'donjons');
// Mini-boss d'un donjon : celui de son type d'abord, puis ceux des deux autres types fixes, un par plateau. Référence = donjon + nom.
Object.values(DUNGEONS).forEach(d => { d.dummies = [d.type, ...d.minis].map(t => { const m = miniBoss(t); m.id = `${d.id}--${slug(m.name)}`; return m; }); });
assertUniqueIds(Object.values(DUNGEONS).flatMap(d => d.dummies), 'Mini-boss');
