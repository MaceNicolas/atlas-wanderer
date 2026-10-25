// Atlas Wanderer — données : constantes, types, serviteurs, équipements, héros, donjons (contenu provisoire).
'use strict';
// =====================================================================
// DONNÉES — tout ce qui n'est pas dans NEW_IDEAS.md est PROVISOIRE
// (contenu, chiffres, types). Les règles, elles, suivent NEW_IDEAS.md.
// =====================================================================
const MAX_BOARD = 7;          // règle : plateau à 7
const MAX_LEVEL = 6;          // ouvert : niveau max de renfort (provisoire) ; égal au rang maximum proposé en renfort
const MAX_RANK = 7;           // rang 7 : uniquement en récompense de fusion
const PROPOSALS = 3;          // récompense de fusion : nombre de propositions (provisoire)
// Serviteurs et équipements du renfort : 3 propositions au niveau 1, 4 aux niveaux 2-3, 5 à partir du niveau 4.
const renfortProposals = level => level >= 4 ? 5 : level >= 2 ? 4 : 3;
const FATIGUE_START = 30;     // ouvert : seuil de l'usure (provisoire)
const HAND_MAX = 7;           // main : 7 emplacements (serviteurs et équipements confondus)
// Datacrons gagnés à chaque renfort, selon la salle (provisoire) ; au-delà, la dernière valeur.
const INCOME = [3, 3, 4, 3, 5, 3, 4, 4, 5, 4, 4, 5, 4, 5, 5, 4, 5, 5, 5, 5];
const incomeFor = room => INCOME[Math.min(room, INCOME.length) - 1];
// Le Boss joue trois plateaux indépendants, renforcés chaque salle comme un joueur (moteur.js).
// malus : Datacrons en moins par salle (1 = toujours un de moins, 0.5 = un de moins une fois sur deux).
const BOSS_BOARDS = [{ malus: 1 }, { malus: 0.5 }, { malus: 0 }];

const KW = { prov: 'Provocation', shield: 'Bouclier divin', poison: 'Poison', rebirth: 'Renaissance', ranged: 'À distance' };
const TRIG = {
  startCombat: 'Début de combat', deathrattle: "Râle d'agonie", endCombat: 'Fin de combat',
  battlecry: 'Cri de guerre', startRenfort: 'Début de renfort', endRenfort: 'Fin de renfort',
  passive: 'Permanent', assault: 'Assaut', onAllyHit: 'Après chaque attaque reçue par un allié', space: "Lorsqu'il y a de la place sur le plateau", onSummon: "Lorsqu'un drone est invoqué"
};
// Règle : une compétence est soit de combat, soit de renfort, jamais les deux.
const TRIG_KIND = { startCombat: 'combat', deathrattle: 'combat', endCombat: 'combat', space: 'combat', onSummon: 'combat', passive: 'combat', assault: 'combat', onAllyHit: 'combat', battlecry: 'renfort', startRenfort: 'renfort', endRenfort: 'renfort' };

let UID = 0;
const uid = () => ++UID;
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];

// Adaptation : pouvoir signature des Elk (règle dans NEW_IDEAS.md). Le choix se joue à la fin du combat, hors de applyFx.
const ADAPT_TEXT = 'Adaptation : à la fin du combat, peut s\'améliorer en utilisant les pouvoirs d\'un allié survivant';
const ADAPT = { t: 'endCombat', fx: 'adapt', a: 0, h: 0, n: 0 };
const sk = (t, fx, a = 0, h = 0, n = 0) => ({ t, fx, a, h, n });
function skDesc(k) {
  if (k.fx === 'adapt') return ADAPT_TEXT;
  const bf = `+${k.a}/+${k.h}`;
  const d = {
    buffSelf: `${bf} à lui-même`,
    buffAllies: `${bf} aux autres alliés`,
    buffRandomAlly: `${bf} à un allié aléatoire`,
    buffLeftmost: `${bf} à l'allié le plus à gauche`,
    dmgRandomEnemy: `${k.n} dégâts à un ennemi aléatoire`,
    plantBombs: `pose ${k.a === 1 ? 'une bombe' : k.a + ' bombes'} infligeant ${k.n} dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque`,
    debuffRandomEnemy: `retire ${k.n} ATQ à un ennemi aléatoire`,
    buffEquippedAlly: `${bf} à un allié équipé`,
    buffPerType: `${bf} par type différent dans votre équipe (max 3)`,
    summon: `invoque un drone ${k.a}/${k.h} ${k.t === 'deathrattle' ? 'à sa place' : 'à sa droite'}`,
    buffAdjacent: `${bf} aux alliés adjacents`,
    debuffLeftmost: `retire ${k.n} ATQ à l'ennemi le plus à gauche`,
    stripShield: `retire le Bouclier divin d'un ennemi, si possible`,
    stripProv: `retire la Provocation de tous les ennemis`,
    swapHpLeftmost: `échange ses PV avec l'ennemi le plus à gauche`,
    targetLowestHp: `Cible : l'ennemi avec le moins de points de vie`,
    shieldCharges: `Son Bouclier divin résiste à ${k.n} coups`,
    breakShield: `Détruit le Bouclier divin de la cible avant de l'attaquer`,
    healAttacked: `soigne ${k.n} PV à cet allié`,
    healLeftmost: `soigne ${k.n} PV à l'allié le plus à gauche`,
    healAllies: `soigne ${k.n} PV à tous les alliés`,
    buffSummoned: `le drone invoqué gagne ${bf}`,
    droneBonus: `vos drones sont invoqués avec ${bf} jusqu'à la fin de la mission`
  }[k.fx];
  return k.t === 'passive' ? d : `${TRIG[k.t]} : ${d}`;   // un pouvoir permanent n'a pas de déclencheur
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
const SPECIES = ['Alien', 'Elk', 'Dwork', 'Droïde', 'Sorvane', 'Ryskan', 'Nythe'];   // Alien : espèce générique, par défaut
const ARCHETYPES = ['Pilote', 'Ingénieur', 'Médecin', 'Sécurité', 'Explorateur', 'Artilleur', 'Renseignement', 'Roboticien', 'Xénobiologiste', 'Diplomate'];
const ALL_TYPES = [...SPECIES, ...ARCHETYPES];

// skill : un pouvoir, ou une liste de pouvoirs.
const S = (name, rank, atk, hp, types, kw = [], skill = null) => ({ name, rank, atk, hp, types, kw, skill });
const SERVANTS = [
  // Pilote : ouverture, rythme (le plus à gauche attaque en premier)
  S('Pilote de chasse', 2, 3, 3, ['Alien', 'Pilote'], [], sk('startCombat', 'buffLeftmost', 2, 0)),
  S('As de la passerelle', 3, 4, 4, ['Dwork', 'Pilote'], [], sk('startCombat', 'buffLeftmost', 2, 1)),
  S('Commandant de vol', 4, 5, 6, ['Ryskan', 'Pilote'], [], sk('startCombat', 'buffAllies', 1, 0)),
  S('Maître d\'escadre', 5, 6, 8, ['Droïde', 'Pilote'], [], sk('startCombat', 'buffLeftmost', 4, 2)),
  // Ingénieur : renforcer via les équipements, Bouclier divin
  S('Mécano', 1, 1, 3, ['Nythe', 'Ingénieur'], [], sk('startCombat', 'buffEquippedAlly', 1, 0)),
  S('Technicien', 2, 2, 4, ['Droïde', 'Ingénieur'], [], sk('endRenfort', 'buffRandomAlly', 1, 1)),
  S('Spécialiste des systèmes', 3, 2, 5, ['Alien', 'Ingénieur'], [], sk('endRenfort', 'buffEquippedAlly', 3, 0)),
  S('Chef mécanicien', 4, 4, 7, ['Sorvane', 'Ingénieur'], [], sk('startCombat', 'buffEquippedAlly', 2, 2)),
  S('Ingénieur en chef', 5, 5, 9, ['Ryskan', 'Ingénieur'], ['shield'], sk('startCombat', 'buffAllies', 1, 1)),
  // Médecin : prévention des dégâts, PV
  S('Infirmier', 1, 1, 3, ['Sorvane', 'Médecin'], [], sk('assault', 'healLeftmost', 0, 0, 2)),
  S('Médecin de terrain', 2, 2, 4, ['Nythe', 'Médecin'], [], sk('startCombat', 'buffRandomAlly', 0, 3)),
  S('Médecin-chef', 4, 4, 7, ['Ryskan', 'Médecin'], [], sk('deathrattle', 'healAllies', 0, 0, 5)),
  S('Praticien légendaire', 5, 5, 9, ['Dwork', 'Médecin'], [], sk('startCombat', 'buffAllies', 1, 3)),
  // Sécurité : Provocation, Bouclier divin
  S('Vigile', 1, 1, 4, ['Ryskan', 'Sécurité'], ['prov']),
  S('Garde d\'abordage', 2, 2, 5, ['Dwork', 'Sécurité'], ['prov']),
  S('Sergent de sécurité', 3, 3, 6, ['Nythe', 'Sécurité'], ['prov'], sk('endRenfort', 'buffSelf', 0, 3)),
  S('Chef de la sécurité', 4, 4, 8, ['Droïde', 'Sécurité'], ['prov', 'shield']),
  S('Commandant de bord', 5, 6, 11, ['Alien', 'Sécurité'], ['prov', 'shield'], sk('startCombat', 'buffAllies', 0, 2)),
  // Explorateur : À distance, récompense de la diversité de types
  S('Éclaireur', 1, 2, 2, ['Droïde', 'Explorateur'], ['ranged']),
  S('Sondeur planétaire', 2, 2, 4, ['Ryskan', 'Explorateur'], [], sk('startCombat', 'buffPerType', 1, 0)),
  S('Cartographe', 3, 3, 5, ['Sorvane', 'Explorateur'], ['ranged'], sk('startCombat', 'buffPerType', 1, 0)),
  S('Chasseur de reliques', 4, 4, 6, ['Nythe', 'Explorateur'], ['ranged'], sk('startCombat', 'buffPerType', 1, 1)),
  // Artilleur : À distance, dégâts directs
  S('Tireur', 1, 3, 2, ['Alien', 'Artilleur'], ['ranged']),
  S('Tireur d\'élite', 3, 4, 4, ['Sorvane', 'Artilleur'], ['ranged'], sk('passive', 'targetLowestHp')),
  S('Maître-artilleur', 4, 5, 5, ['Dwork', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 3)),
  S('Bombardier', 5, 5, 7, ['Nythe', 'Artilleur'], [], sk('startCombat', 'plantBombs', 2, 0, 5)),
  // Renseignement : affaiblir l'adversaire
  S('Agent', 1, 2, 2, ['Dwork', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Intrus réseau', 2, 2, 3, ['Alien', 'Renseignement'], [], sk('startCombat', 'debuffLeftmost', 0, 0, 3)),
  S('Saboteur', 3, 3, 4, ['Droïde', 'Renseignement'], [], sk('startCombat', 'stripShield')),
  S('Maître espion', 4, 4, 6, ['Ryskan', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 4)),
  S('Spectre', 5, 6, 6, ['Sorvane', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 5)),
  // Roboticien : invoquer des drones
  S('Opérateur de drone', 1, 1, 2, ['Nythe', 'Roboticien'], [], sk('deathrattle', 'summon', 1, 1)),
  S('Opérateur d\'essaim', 2, 2, 3, ['Sorvane', 'Roboticien'], [], sk('startCombat', 'summon', 1, 1)),
  S('Chef d\'atelier', 3, 2, 5, ['Alien', 'Roboticien'], [], sk('onSummon', 'buffSummoned', 2, 2)),
  S('Architecte d\'essaim', 5, 4, 8, ['Dwork', 'Roboticien'], [], sk('space', 'summon', 1, 1)),
  // Xénobiologiste : Poison, Renaissance, effets de mort
  S('Spécialiste des organismes', 2, 1, 3, ['Ryskan', 'Xénobiologiste'], ['poison']),
  S('Symbiote', 3, 3, 5, ['Dwork', 'Xénobiologiste'], ['rebirth'], ADAPT),
  S('Généticien', 4, 4, 6, ['Nythe', 'Xénobiologiste'], ['poison'], sk('deathrattle', 'buffAllies', 1, 1)),
  S('Maître des mutations', 5, 6, 8, ['Droïde', 'Xénobiologiste'], ['poison', 'rebirth'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 3)),
  // Diplomate : bonus aux alliés adjacents
  S('Attaché de liaison', 1, 1, 4, ['Alien', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 1, 0)),
  S('Officier de liaison', 2, 1, 5, ['Droïde', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 1, 1)),
  S('Négociateur', 3, 2, 6, ['Ryskan', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 2, 1)),
  S('Ambassadeur', 4, 3, 7, ['Sorvane', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 2, 2)),
  S('Grand diplomate', 5, 4, 9, ['Nythe', 'Diplomate'], [], sk('startCombat', 'buffAdjacent', 3, 3)),
  // Elk : espèce de l'Adaptation (pouvoir signature). Presque tous la portent à la place d'une compétence ; deux gardent la leur pour servir de modèle aux autres.
  S('Apprenti pilote', 1, 1, 3, ['Elk', 'Pilote'], [], ADAPT),
  S('Assistant de labo', 1, 2, 2, ['Ryskan', 'Xénobiologiste'], [], sk('deathrattle', 'buffRandomAlly', 2, 2)),
  S('Informateur elk', 2, 2, 3, ['Elk', 'Renseignement'], [], ADAPT),
  S('Aviateur elk', 2, 2, 4, ['Elk', 'Pilote'], [], ADAPT),
  S('Maître-canonnier', 2, 2, 3, ['Dwork', 'Artilleur'], ['ranged'], sk('passive', 'breakShield')),
  S('Technicien elk', 2, 2, 4, ['Elk', 'Ingénieur'], [], ADAPT),
  S('Chirurgien', 3, 2, 6, ['Elk', 'Médecin'], [], [sk('onAllyHit', 'healAttacked', 0, 0, 2), ADAPT]),
  S('Éclaireur elk', 3, 2, 5, ['Elk', 'Explorateur'], ['ranged'], ADAPT),
  S('Garde elk', 3, 3, 6, ['Elk', 'Sécurité'], [], [sk('passive', 'targetLowestHp'), ADAPT]),
  S('Émissaire elk', 3, 2, 6, ['Elk', 'Diplomate'], [], ADAPT),
  S('Maître des drones', 4, 3, 6, ['Elk', 'Roboticien'], [], [sk('endCombat', 'droneBonus', 1, 1), ADAPT]),
  S('Corsaire elk', 4, 4, 5, ['Elk', 'Artilleur'], ['ranged'], ADAPT),
  S('Grand explorateur', 5, 4, 8, ['Elk', 'Explorateur'], ['ranged'], ADAPT),
  S('Doyenne elk', 5, 3, 10, ['Elk', 'Diplomate'], [], ADAPT),
  // Rang 6 : deux serviteurs par espèce
  S('Septième sentinelle', 6, 7, 12, ['Nythe', 'Sécurité'], ['shield'], sk('passive', 'shieldCharges', 0, 0, 2)),
  S('Chasseur de primes alien', 6, 9, 9, ['Ryskan', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 5)),
  S('Veilleuse elk', 6, 5, 13, ['Elk', 'Médecin'], [], ADAPT),
  S('Maître des vents elk', 6, 7, 10, ['Elk', 'Pilote'], ['shield'], ADAPT),
  S('Maître-forgeron dwork', 6, 7, 14, ['Dwork', 'Ingénieur'], ['shield'], sk('startCombat', 'buffEquippedAlly', 3, 3)),
  S('Briseur de fronts dwork', 6, 8, 13, ['Dwork', 'Sécurité'], ['prov', 'rebirth']),
  S('Unité de commandement', 6, 7, 11, ['Droïde', 'Pilote'], [], sk('startCombat', 'buffAllies', 2, 1)),
  S('Nexus d\'essaim', 6, 4, 9, ['Droïde', 'Roboticien'], [], sk('startCombat', 'summon', 6, 6)),
  S('Ombre', 6, 9, 8, ['Sorvane', 'Renseignement'], [], sk('startCombat', 'swapHpLeftmost')),
  S('Alpha sorvane', 6, 8, 10, ['Sorvane', 'Explorateur'], ['ranged'], sk('startCombat', 'buffPerType', 2, 1)),
  // Rang 7 : un serviteur par archétype, obtenu uniquement en récompense de fusion (jamais proposé au renfort)
  S('Légende de la flotte', 7, 9, 12, ['Nythe', 'Pilote'], [], sk('startCombat', 'buffLeftmost', 6, 3)),
  S('Architecte de vaisseau', 7, 8, 16, ['Dwork', 'Ingénieur'], ['shield'], sk('startCombat', 'buffAllies', 2, 2)),
  S('Sauveur de l\'équipage', 7, 8, 16, ['Droïde', 'Médecin'], [], sk('startCombat', 'buffAllies', 2, 4)),
  S('Gardien de l\'Atlas', 7, 9, 18, ['Ryskan', 'Sécurité'], ['prov', 'shield'], sk('startCombat', 'buffAllies', 10, 10)),
  S('Pionnier des étoiles', 7, 10, 12, ['Sorvane', 'Explorateur'], ['ranged'], sk('startCombat', 'buffPerType', 2, 2)),
  S('Canon-monde', 7, 12, 10, ['Dwork', 'Artilleur'], ['ranged'], sk('startCombat', 'dmgRandomEnemy', 0, 0, 7)),
  S('Maître des ombres', 7, 8, 12, ['Ryskan', 'Renseignement'], [], sk('startCombat', 'stripProv')),
  S('Cerveau de la ruche', 7, 7, 12, ['Droïde', 'Roboticien'], [], sk('space', 'summon', 10, 10)),
  S('Mère des mutations', 7, 9, 13, ['Nythe', 'Xénobiologiste'], ['poison', 'rebirth'], sk('deathrattle', 'buffAllies', 2, 2)),
  S('Ambassadeur suprême elk', 7, 5, 15, ['Elk', 'Diplomate'], [], ADAPT),
  // Espèce + archétype (contenu provisoire : les fiches d'espèces n'ont pas encore de section « Dans le jeu »)
  S('Mineur dwork', 2, 2, 5, ['Dwork', 'Ingénieur'], [], sk('endRenfort', 'buffSelf', 0, 1)),
  S('Gardien de chantier', 3, 3, 8, ['Dwork', 'Sécurité'], ['prov']),
  S('Forgeron dwork', 4, 4, 8, ['Dwork', 'Ingénieur'], ['shield'], sk('startCombat', 'buffEquippedAlly', 2, 0)),
  S('Droïde de maintenance', 2, 2, 4, ['Droïde', 'Ingénieur'], [], sk('endRenfort', 'buffRandomAlly', 0, 2)),
  S('Droïde infirmier', 3, 2, 5, ['Droïde', 'Médecin'], [], sk('startCombat', 'buffAllies', 0, 2)),
  S('Droïde de combat', 4, 4, 7, ['Droïde', 'Sécurité'], ['prov'], sk('deathrattle', 'buffAllies', 3, 1)),
  S('Rôdeur sorvane', 2, 3, 2, ['Sorvane', 'Renseignement'], [], sk('startCombat', 'debuffRandomEnemy', 0, 0, 1)),
  S('Pisteur sorvane', 3, 3, 4, ['Sorvane', 'Explorateur'], ['ranged']),
  S('Pilote sorvane', 4, 5, 4, ['Sorvane', 'Pilote'], ['shield'], sk('startCombat', 'buffLeftmost', 2, 0))
];

// skill : effet d'équipement, déclenché sur le serviteur qui le porte. Effet de renfort = permanent,
// effet de combat = valable pour le combat seulement.
// mod : modificateur d'invocation { droneA, droneH, text } (bonus donné aux drones invoqués par le porteur).
const E = (name, rank, atk, hp, kw = null, type = null, skill = null, mod = null) => ({ name, rank, atk, hp, kw, type, skill, mod });
const EQUIPS = [
  E('Plaque d\'acier', 1, 0, 2), E('Lame vibrante', 1, 2, 0), E('Module d\'attaque', 1, 1, 1),
  E('Balise de combat', 2, 0, 2, 'prov', 'Sécurité'), E('Bouclier à champ', 2, 0, 1, 'shield', 'Ingénieur'),
  E('Cartouches perforantes', 2, 2, 1, null, 'Artilleur'), E('Blindage', 2, 1, 3),
  E('Châssis de drone', 2, 1, 2, null, 'Roboticien'),
  E('Dose de neurotoxine', 3, 1, 0, 'poison', 'Xénobiologiste'), E('Canon longue portée', 3, 2, 0, 'ranged', 'Artilleur'),
  E('Implant neural', 3, 2, 2), E('Réacteur surchargé', 3, 3, 1, null, 'Ingénieur'),
  E('Brouilleur', 3, 2, 1, null, 'Renseignement'), E('Sonde d\'analyse', 3, 1, 2, 'ranged', 'Explorateur'),
  E('Nano-régénérateur', 4, 1, 2, 'rebirth', 'Médecin'), E('Armure de siège', 4, 2, 5, 'prov', 'Sécurité'),
  E('Module de saut', 4, 4, 2, null, 'Pilote'),
  E('Cœur de réacteur', 5, 4, 4), E('Aura divine', 5, 3, 3, 'shield'),
  // Équipements à effet
  E('Adrénaline', 1, 0, 1, null, null, sk('startCombat', 'buffSelf', 1, 1)),
  E('Module de croissance', 2, 0, 1, null, null, sk('startRenfort', 'buffSelf', 1, 0)),
  E('Stimulants de choc', 2, 0, 0, null, null, sk('startCombat', 'buffSelf', 2, 1)),
  E('Nano-ruche', 3, 0, 1, null, 'Xénobiologiste', sk('endRenfort', 'buffSelf', 1, 1)),
  E('Charge de rupture', 3, 1, 0, null, 'Artilleur', sk('deathrattle', 'dmgRandomEnemy', 0, 0, 3)),
  E('Injecteur de combat', 3, 1, 1, null, 'Médecin', sk('startCombat', 'buffSelf', 3, 2)),
  E('Matrice évolutive', 4, 0, 2, null, 'Ingénieur', sk('startRenfort', 'buffSelf', 2, 2)),
  E('Balise de commandement', 4, 0, 2, null, 'Pilote', sk('startCombat', 'buffAllies', 1, 1)),
  E('Chargeur de drones', 3, 0, 1, null, 'Roboticien', null, { droneA: 1, droneH: 1, text: 'Drones invoqués : +1/+1' }),
  E('Servomoteurs de drone', 2, 0, 1, null, 'Roboticien', null, { droneA: 1, droneH: 0, text: 'Drones invoqués : +1 ATQ' }),
  E('Blindage de drone', 2, 0, 1, null, 'Roboticien', null, { droneA: 0, droneH: 1, text: 'Drones invoqués : +1 PV' })
];

// Chaque héros a deux types : ici une espèce et un archétype (rien ne l'impose).
const HEROES = {
  vex:   { id: 'vex', name: 'Capitaine Vex', types: ['Elk', 'Pilote'], hp: 30, kw: 'prov',
           power: sk('startCombat', 'buffLeftmost', 2, 0) },
  z9:    { id: 'z9', name: 'Z-9', types: ['Droïde', 'Roboticien'], hp: 26, kw: 'shield',
           power: sk('startRenfort', 'buffRandomAlly', 1, 0) }
};
// Lieutenants mis de côté pour le moment : à replacer dans HEROES pour les remettre en jeu.
const HEROES_RESERVE = {
  brokk: { id: 'brokk', name: 'Brokk', types: ['Dwork', 'Ingénieur'], hp: 34, kw: null,
           power: sk('endRenfort', 'buffRandomAlly', 1, 1) },
  reyes: { id: 'reyes', name: 'Amirale Reyes', types: ['Alien', 'Diplomate'], hp: 32, kw: null,
           power: sk('startCombat', 'buffAllies', 1, 0) },
  ilya:  { id: 'ilya', name: 'Dr Ilya', types: ['Sorvane', 'Xénobiologiste'], hp: 28, kw: 'shield',
           power: sk('startCombat', 'dmgRandomEnemy', 0, 0, 2) }
};

const DUNGEONS = {
  nid: { id: 'nid', name: 'Le Nid de la Reine', type: 'Xénobiologiste', boss: { name: 'La Reine-Mère', hp: 250, power: 'regen',
         desc: 'Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu\'à leur maximum).' } },
  omega: { id: 'omega', name: 'Station Oméga', type: 'Droïde', boss: { name: 'Intelligence Oméga', hp: 200, power: 'surge',
         desc: 'Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies.' } },
  cite: { id: 'cite', name: 'La Cité des Profondeurs', type: 'Renseignement', boss: { name: 'L\'Oracle Souterrain', hp: 220, power: 'frenzy',
         desc: 'Écho : chaque fois qu\'un de ses serviteurs attaque, il gagne +1 ATQ jusqu\'à la fin du combat.' } },
  forge: { id: 'forge', name: 'La Forge de Brasier-Roc', type: 'Artilleur', boss: { name: 'Maître-Forgeron Grumm', hp: 220, power: 'plate',
         desc: 'Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV.' } }
};
