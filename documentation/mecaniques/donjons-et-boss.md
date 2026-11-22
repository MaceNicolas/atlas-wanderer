# Donjons et boss (brouillon à valider)

Décidé avec Nicolas le 21 novembre 2026, à partir de la discussion sur la boucle principale. **Réalisé le 21 novembre 2026** (sections 2 à 6, 9 étapes 1 à 5) : catégorie `bosses.json`, types tirés par le donjon (`drawTypes`), liste de boss fixes et liés à un type tiré (`bosses`), serviteur permanent, pouvoir par boss, stratégie par boss, `board` qui conserve le serviteur permanent, barre de PV par boss, plateau vaincu qui quitte le donjon, vocabulaire « boss ». Reste : voir la section 9.

## 0. Écriture dans les données (état réalisé)

`bosses.json` : `{ "<id>": { "hp": 25, "types": ["sorvane"], "power": "frenzy", "strategy": "horde", "servant": { "rank": 1, "atk": 1, "hp": 3, "sock": ["chroma"], "kw": [], "skill": [] } } }`. Seul `hp` est obligatoire. `types` est une **liste** (un boss peut avoir plusieurs types : le premier donne sa couleur, n'importe lequel le relie à un type tiré au hasard). Le nom est le texte `card.<id>`, la description du pouvoir `boss.<id>.desc`. `servant` est une carte de serviteur écrite dans le boss (sans types : il prend le type du boss ; son nom est celui du boss).

`dungeons.json` : `{ "types": ["sorvane", "diplomat"], "drawTypes": [{ "group": "species", "from": ["elk"] }, { "group": "assignment" }], "bosses": [{ "drawn": 0, "from": ["<id>"] }, { "boss": "<id>" }], "strategy": …, "strategies": […], "locked": true }`. Une entrée de `drawTypes` tire un type dans un groupe (`group`) ou une liste (`from`), jamais un type déjà fixe ou tiré (`null` s'il n'en reste pas) ; une entrée de `bosses` est un boss fixe (`boss`) ou un boss du type tiré par l'entrée `drawn` (le numéro commence à 0), choisi parmi `from` (tous les boss de ce type si `from` manque) ; une entrée sans type tiré ou sans boss de ce type ne donne aucun plateau. Deux entrées ne peuvent pas viser le même type tiré (refusé à la validation).

Priorité de la stratégie d'un plateau : celle de son boss, puis `strategies[i]` du donjon, puis `strategy` du donjon, puis `default` du mod. Les malus de Datacrons suivent `rules.game.bossBoards` (l'entrée i pour le plateau i, la dernière ensuite).

## 1. Principe

- **Choisir un donjon, c'est lancer une partie** (comme lancer une partie de Champ de bataille dans Hearthstone) : on choisit ensuite deux héros, puis on enchaîne renfort et combat.
- **Les boss sont les adversaires à abattre.** Le donjon est gagné quand tous ses boss sont vaincus. Le mot « mini-boss » disparaît.
- **Un boss ne se bat pas sur son plateau.** Un boss est une entité du donjon : une identité, une barre de PV, des pouvoirs, une façon de construire son plateau. Ce qui se bat, ce sont les serviteurs de son plateau.
- Les boss se personnalisent à fond (nom, pouvoirs, stratégie, préférences, décor, histoire).

## 2. Le boss : une carte

Nouvelle catégorie de cartes (`bosses.json`), éditable comme les autres. Un boss a :

| Champ | Rôle |
|---|---|
| nom, texte d'histoire, image, décor | identité |
| `type` (facultatif) | le type du boss : sert à le relier à un type tiré au hasard (§ 4) |
| `hp` | sa barre de PV (déjà fait : une barre par boss, les survivants d'un combat gagné la frappent, à 0 le boss est vaincu et son plateau quitte le donjon) |
| `power` | son pouvoir de boss (§ 5) |
| `strategy` | comment son plateau se construit : une stratégie, ses variantes tirées au hasard au début de la partie, ses préférences (déjà fait : `prefer`, `weight`, `pool` de `{ use, override }`) |
| `servant` (facultatif) | son serviteur permanent (§ 3) |

## 3. Le serviteur permanent

Le « mini-boss » d'aujourd'hui (un serviteur toujours là, jamais remplacé) devient **une option du boss**, plus un passage obligé :

- Le boss peut avoir un **serviteur permanent** : une carte de serviteur ordinaire (ses stats, ses châsses, ses pouvoirs, donc n'importe quel pouvoir du catalogue). Il est posé sur le plateau du boss dès le début.
- Il est **présent sans achat** : il ne dépend pas de la stratégie et occupe une place du plateau. Il n'est jamais remplacé quand le plateau est plein, et il ne fusionne pas.
- Il **évolue au fil de la partie** par ses propres pouvoirs (gains de fin de renfort, de combat, etc.), sans exiger une stratégie de genre `board`.
- **Types propres (22 novembre 2026)** : la carte du serviteur peut porter son propre `types` (par exemple une espèce exclusive, § 13) ; sans lui, il a les types de son boss. Ses types comptent pour les pouvoirs (`distinctTypes`, `of`…) comme ceux de n'importe quel serviteur.
- Il est **facultatif** : un boss peut ne pas en avoir.
- Il remplace le serviteur générique `rules.miniBoss` (même pouvoir +1/+1 pour tous), qui disparaît.
- Il **garde ce qu'il obtient en combat** (décidé le 21 novembre 2026), comme les serviteurs du plateau du joueur : les gains permanents de ses pouvoirs sont conservés d'un combat à l'autre. Un combat se joue sur des copies : il n'est donc pas perdu quand il tombe en combat, il reste sur le plateau avec ses gains.

Le genre de stratégie `board` (plateau écrit à l'avance) reste, mais il doit **conserver le serviteur permanent** au lieu de l'écraser (à faire).

## 4. Les types du donjon

Les types des serviteurs que les boss peuvent acheter sont **portés par le donjon**, pas par les boss : tous les plateaux piochent dans les mêmes types, avec leurs préférences propres.

Un donjon déclare :

- des **types fixes** (par exemple Sorvane et Sécurité pour Nhavaris) ;
- une **règle de tirage** qui complète au hasard, **dont le nombre de types tirés est défini par le donjon** (décidé le 21 novembre 2026) : par exemple « une espèce et deux affectations de plus, tirées au début de la partie, différentes des types fixes ». Aujourd'hui cette règle est codée en dur dans le moteur (`drawBossExtra`, une autre espèce et une autre affectation par type fixe) : elle devient une donnée.

Le joueur, lui, garde ses types : ceux de ses deux héros plus `extraTypes` tirés au hasard (inchangé).

## 5. Pouvoirs de boss

Un pouvoir de boss reste un pouvoir en données (`powers.json`), mais :

- **chaque boss** peut en porter un (aujourd'hui, un seul pour tout le donjon, porté par le mini-boss du premier type) ;
- il faut **plus de moments** où il peut réagir : aujourd'hui début de combat, attaque du boss et fin d'échange ; à ajouter : mort d'un serviteur du boss, mort d'un serviteur du joueur, début de renfort… (la liste se fait en fonction des idées de boss).

## 6. Les boss d'un donjon : fixes et aléatoires dans le même donjon

La liste des boss d'un donjon mélange :

- des **boss fixes** : une carte de boss nommée ;
- des **boss aléatoires** : un emplacement lié à un **type tiré au hasard** (§ 4). Quand ce type est tiré, l'emplacement donne un boss **de ce type**, choisi parmi les boss du donjon qui ont ce type. On peut ainsi avoir « un boss Elk si Elk est tiré, un boss Dwork si c'est Dwork ».

**Deux emplacements liés au même type tiré sont interdits par défaut** (décidé le 21 novembre 2026) : un type tiré ne donne qu'un seul boss. Une option pourra l'autoriser si un donjon le veut.

Le nombre de plateaux est celui de la liste du donjon (il n'est plus une règle du jeu : `bossBoards` devient un réglage de malus par plateau, ou un défaut).

Exemple d'écriture envisagée (à discuter) :

```json
"types": {
  "fixed": ["sorvane", "security"],
  "random": [{ "group": "species" }, { "group": "assignment" }]
},
"bosses": [
  { "boss": "<boss fixe>" },
  { "boss": "<boss fixe>" },
  { "forRandomType": 0, "from": ["<boss Elk>", "<boss Dwork>", "<boss Droïde>"] },
  { "forRandomType": 1, "from": ["<boss Ingénieur>", "<boss Médecin>"] }
]
```

## 7. Ce qui change par rapport à l'existant

| Aujourd'hui | Demain |
|---|---|
| un boss par type (4 types → 4 plateaux), serviteur générique « Mini-boss Elk » | une carte de boss par adversaire, nom et pouvoirs propres |
| seul le premier plateau a l'identité du donjon (nom, pouvoir) | chaque boss a la sienne |
| types du Boss = types du donjon + un type tiré par type fixe (`bossExtra` pour tricher) | types portés par le donjon, règle de tirage en données |
| 4 plateaux partout (`bossBoards`) | autant de plateaux que de boss du donjon |
| `board` écrase le mini-boss | `board` conserve le serviteur permanent |
| pouvoir de boss : 3 moments | davantage de moments, un pouvoir par boss |
| vocabulaire « mini-boss » (code, textes, interface) | « boss » |

## 8. Décisions et points ouverts

Décidé le 21 novembre 2026 :

- le serviteur permanent garde ce qu'il obtient en combat (§ 3) ;
- le nombre de types tirés est défini par le donjon (§ 4) ;
- deux emplacements liés au même type tiré sont interdits par défaut (§ 6) ;
- **pour le moment, les PV des boss sont cumulés au niveau du donjon** (le total affiché, comme aujourd'hui) ; on passera vite à un affichage des PV de chaque boss, sans total.

Point reporté : un type tiré au hasard sans boss correspondant dans le donjon (on ne tire que parmi les types qui ont un boss, ou l'emplacement reste vide) : on verra plus tard.

## 9. Ordre de travail

1. ~~Catégorie « boss » (`bosses.json`, éditeur) et vocabulaire « boss » partout.~~ Fait.
2. ~~Le donjon déclare ses types fixes et sa règle de tirage ; la liste de ses boss ; le moteur construit les plateaux à partir d'elle ; Nhavaris/Cité migrée.~~ Fait (la Cité garde Elk et Renseignement imposés, avec `from`).
3. ~~Le serviteur permanent (option du boss) ; `board` le conserve.~~ Fait.
4. ~~Stratégie portée par le boss.~~ Fait.
5. Nouveaux moments pour les pouvoirs de boss : **commencé** : un pouvoir de boss réagit au début de combat, à l'attaque du boss, à la fin d'un échange et, depuis le 21 novembre 2026, quand un serviteur de son plateau **devrait mourir** (`bossAllyDying`, peut annuler la mort). Reste : la mort effective d'un serviteur du boss ou du joueur, le début de renfort, etc.
6. Affichage des PV de chaque boss à la place du total (le total reste affiché pour le moment). **Pas fait.**
7. Cité : écrire les quatre boss de la fiche de Nhavaris. **Commencé le 21 novembre 2026** : types tirés Droïde et Ingénieur (imposés pour le moment) boss Droïde **DR-1O** et boss Ingénieur **Erky** (section 11). **Cyro** (boss Sécurité) est écrit (section 11) et les types fixes de la Cité sont maintenant Sorvane + Sécurité. **Veylor** (boss Elk et Diplomate ; Capitaine de la Garde ; boss aléatoire du type tiré Elk, il remplace « Boss Elk » dans la liste du donjon verrouillé) — ajouté le 22 novembre 2026, sur la fiche de Nicolas.
- **PV** : 25 (valeur par défaut, à équilibrer). **Types** : Elk et Diplomate. Pas de serviteur permanent.
- **Pouvoir « Héritage dynastique »** (`dynasticLegacy`, réaction `bossAllyDeath`) : chaque fois qu'un serviteur allié meurt, un Garde allié vivant tiré au hasard et l'Héritier (s'il est vivant) gagnent **définitivement** +1/+1. Deux actions `stats` permanentes ; un mort ne reçoit rien ; sans Garde vivant, seul l'Héritier reçoit.
- **Stratégie « Garde d'honneur »** (`honorGuard`, `board` + `layout` + `keep`, voir `strategies.md` § 10) : plateau fixe de cinq serviteurs, sans recrutement, présents dès le premier match ; ils gardent leurs bonus permanents ; aucune croissance automatique.
  - Quatre **Gardes** (jeton `honorGuard`, Elk + Sécurité, niveau 3, tous avec **Provocation**) : venimeux (+ Poison, 2/3), tireur (+ À distance, 2/4), protecteur (+ Bouclier, 2/4), furieux (+ Fureur, 3/3). Un **Héritier** (jeton `heir`, Elk + Diplomate, niveau 3, 2/4, **sans** Provocation ni autre capacité). Jetons jamais proposés à l'achat.
- **À équilibrer** : PV de Veylor, niveau et statistiques des cinq serviteurs, puissance du bonus (+1/+1). **Décidé le 22 novembre 2026** : les cinq serviteurs de Veylor (quatre Gardes et l'Héritier) partent à **1/1** (ils étaient à 2/3, 2/4, 2/4, 3/3 et 2/4) ; ils grandissent par le pouvoir de Veylor.
- **Les bonus sont gardés même par un serviteur qui meurt** (décidé le 22 novembre 2026) : les actions `stats` du pouvoir portent `keepDead: true` (nouvelle option du moteur, `res.fallen`, appliquée à la vraie carte par `teamCombatEnd`). Les autres gains permanents restent réservés aux survivants.
- **Le pouvoir joue aussi dans les combats entre plateaux de boss** (décidé le 22 novembre 2026) : le gabarit `dynasticLegacy` porte `boardFights: true`, et le moteur (`ctx.boardBosses`, `bossOfSide`) donne alors le pouvoir au boss de chaque plateau dans ces combats ; Veylor y gagne donc ses bonus et les garde. Les autres pouvoirs de boss (sans `boardFights`) ne jouent toujours que face au joueur.
- **Interprétation à valider** : les types Elk + Sécurité des Gardes et Elk + Diplomate de l'Héritier sont un choix par défaut.

**Mara** (boss Sorvane) est préparée (section 11) : elle remplace L'Oracle Souterrain dans la Cité. Les quatre boss de la fiche sont écrits ; reste leur équilibrage.

## 10. Constats de la migration

- Le serviteur du mini-boss avait un pouvoir `buffSelf` (+1/+1 à chaque renfort) qui **n'existe plus dans le catalogue des pouvoirs** depuis la refonte « changeStats » : il ne faisait rien depuis. Les serviteurs permanents des boss génériques sont donc écrits **sans pouvoir** (c'est ce que le jeu faisait réellement). Pour qu'ils grandissent de +1/+1 à chaque renfort, il suffit d'écrire `{ "t": "startReinforcement", "fx": "changeStats", "target": { "side": "self" }, "a": 1, "h": 1, "n": 0 }` dans leur `skill` (vérifié : le serviteur passe de 1/3 à 2/4) : cela rend les boss plus forts, à équilibrer.
- Les 14 boss génériques (un par type, « Boss Elk »…) remplacent les anciens mini-boss et servent de candidats aux types tirés au hasard.

## 11. Boss écrits (21 novembre 2026)

**DR-1O** (ex DR-I0 ; boss Droïde et Roboticien de la Cité des Profondeurs, `types: ["droid", "roboticist"]` depuis le 22 novembre 2026 ; dans la sélection des boss aléatoires, il représente le type tiré Droïde ; lié au type tiré Droïde, qui est imposé pour le moment, avec Ingénieur).
- **Concept (Nicolas)** : de petits drones assez faibles qui se renforcent entre eux. Au début, le boss présente un plateau assez costaud ; plus le joueur tue de Droïdes, moins ils sont forts.
- **Pouvoir (Nicolas)** : « La première fois qu'un Droïde allié devrait mourir, il survit avec 1 PV. » Template `droidLastStand` (réaction `bossAllyDying`, une fois par combat, seulement pour un Droïde).
- **Plateau (décidé le 21 novembre 2026)** : stratégie `dr1xSwarm` (genre `board`, `unit` + `count`, voir `strategies.md` § 8). Un seul **DR-1X** en salle 1, **un de plus tous les deux matchs** (1, 1, 2, 2, 3, 3… jusqu'à 7 en salle 13). DR-1X est un serviteur de type Droïde et d'affectation Ingénieur, **sans châsse**, marqué `token: "dr1x"` (**jamais proposé en achat à personne**). Les DR-1X **restent sur le plateau d'un match à l'autre** et **gardent leur aura** ; leurs statistiques sont 1/1 de base et **croissent de +1/+1 par match : en match X, chaque DR-1X a X d'attaque et X PV**.
- **Les sept auras** (« Les Droïdes DR-1X ont… », donc **le porteur compris**), **distribuées une fois chacune** : à chaque nouveau DR-1X, l'aura est donnée à partir d'un paquet mélangé, sans remise (au septième DR-1X, les sept auras sont toutes là, une fois chacune) : Bouclier ; +2 ATQ ; +2 PV ; À distance ; Fureur ; +1 ATQ et +1 PV ; **+1 ATQ et +1 PV par DR-1X allié** (le porteur compte ; avec 5 DR-1X, chacun a +5/+5). Templates `auraOnTokens`, `auraKeywordOnTokens`, `auraPerToken`. Le boss n'achète rien.
- **Interprétations à valider** : « tous les deux niveaux » lu comme « tous les deux matchs » (le deuxième DR-1X arrive au match 3) ; « garde son aura » lu comme « l'unité reste sur le plateau avec son aura d'un match à l'autre » ; « distribuées à la fin » lu comme « distribuées sans doublon jusqu'au septième DR-1X » ; dans « par DR-1X allié », le DR-1X qui porte l'aura est compté.
- **Sans serviteur permanent** (retiré à la demande de Nicolas) : l'aura `droidSwarm` (+1/+1 par tranche de 3 Droïdes alliés) existe dans `powers.json` mais aucune carte ne la porte.

**Erky** (boss Ingénieur et Sorvane de la Cité des Profondeurs ; lié au type tiré Ingénieur, imposé pour le moment) — défini le 21 novembre 2026.
- **PV** : 28. **Types** : Ingénieur et Sorvane (`types: ["engineer", "sorvane"]`).
- **Pouvoir (Nicolas)** : « Chaque fois qu'un serviteur allié meurt, donne +X/+X à un autre serviteur allié aléatoire, X étant le niveau de renfort d'Erky. » Template `allyDeathLevelBuff`, réaction `bossAllyDeath` (nouveau moment : après la mort effective d'un serviteur de son plateau ; X est le niveau du plateau d'Erky ; l'effet dure le combat ; rien si le mort était seul).
- **Stratégie (Nicolas)** : recruter un maximum d'alliés rapidement, de type Ingénieur en priorité. Stratégie `erkyRush` : genre `parametric`, plateau visé de 7 dès que les Datacrons le permettent (`want` base 7), montée de niveau lente (1 niveau toutes les 6 salles, le pouvoir d'Erky grandit avec), peu d'équipement, **préférence pondérée pour les Ingénieurs** (`prefer`, `weight: 25` décidé le 21 novembre 2026 : environ deux niveaux et demi de bonus sur le score d'une carte, donc un Ingénieur de niveau 1 ne passe pas devant une carte bien meilleure).
- **Pas de serviteur permanent** : en salle 1, il recrute comme les autres plateaux avec les Datacrons de la première salle (voir ci-dessous).

**Cyro** (boss Sécurité de la Cité des Profondeurs ; Sécurité et Sorvane ; entraîneur militaire sorvane, salle d'entraînement de Nhavaris) — défini le 21 novembre 2026.
- **PV** : 25 (valeur par défaut, à équilibrer). **Types** : Sécurité et Sorvane (`types: ["security", "sorvane"]`). **Aucun pouvoir** pour le moment. **Il ne recrute rien** et n'a pas de serviteur permanent : son plateau est écrit à l'avance.
- **Plateau** : stratégie `cyroGuard` (genre `board`, écriture `layout`, voir `strategies.md` § 9), reconstruit à chaque match.
  - **Deux Gardiens de la salle, toujours là, toujours aux deux extrémités du plateau (un à gauche, un à droite)**. Règle ajoutée à la demande de Nicolas : quand un Fusilier est présent, il se place entre eux.
  - Gardien de la salle : Droïde, Sécurité, niveau 6 (`rank: 6`), **Provocation** (`prov`), **ATQ X et PV X, X étant le numéro du match** (base 1/1 plus 1/1 par match joué), sans châsse. Carte marquée `token: "guard"` : exclusive à cette salle, **jamais proposée en achat** à personne (« non recrutable ailleurs pour le moment »).
  - Fusilier : **un Fusilier de plus tous les 3 matchs (3, 6, 9, 12, 15) et ils restent** (`stack: true` : 1 au match 3, 2 au match 6… 5 au match 15), avec les statistiques de sa carte (pas de croissance pour le moment). Corrigé le 22 novembre 2026 à la demande de Nicolas.
- **Modifications des serviteurs existants** : le **Fusilier** devient Sorvane (il était Ryskan) ; la **Sentinelle** devient Ryskan (elle était Sorvane).
- **Dans le donjon** : Cyro prend la place du « Boss Diplomate » générique dans la Cité ; les types fixes de la Cité passent de Sorvane + Diplomate à Sorvane + Sécurité.

**Mara** (boss Sorvane de la Cité des Profondeurs ; Sorvane et Renseignement ; responsable du renseignement militaire) — préparée le 21 novembre 2026, elle remplace L'Oracle Souterrain (Écho), dont la carte reste dans les données sans être utilisée.
- **PV** : 25 (valeur par défaut, à équilibrer). **Types** : Sorvane et Renseignement (`types: ["sorvane", "intelligence"]`). Pas de serviteur permanent.
- **Pouvoir « Neutralisation stratégique »** (`strategicNeutralization`, début de combat) : réduit à 1 l'ATQ de l'ennemi qui a le plus d'ATQ, et à 1 les PV de l'ennemi qui a le plus de PV (PV maximum compris). Deux actions `set` indépendantes (`pick: "max:atk"` puis `"max:hp"`, égalité tirée au hasard) : elles peuvent viser le même serviteur ou deux serviteurs différents, et chacune a sa ligne dans le journal. Aucun nouveau moment ni gabarit.
- **Stratégie `maraArmy`** (genre `parametric`, sans `prefer`) : elle recrute les serviteurs les plus puissants proposés (`score: "rank"`, le niveau d'abord), **sans chercher de synergie de types**, avec un plateau visé de 3 qui grandit lentement (`want` base 3, un de plus tous les 3 matchs), monte vite de niveau (`level` 1 niveau tous les 2 matchs) et s'équipe assez souvent (`equipP` 0,5). Valeurs de départ, à équilibrer.
- **Particularité** : dangereuse contre les compositions de un ou deux serviteurs très forts.
- **À noter** : si l'ennemi qui a le plus d'ATQ n'a aucune ATQ, il passe à 1 (le pouvoir fixe la valeur, il ne la plafonne pas) ; cas très rare, à corriger seulement s'il gêne.

## 12. Première salle des plateaux du Boss (21 novembre 2026)

L'ancienne règle codée en dur (« en salle 1, un plateau du Boss ne reçoit aucun Datacron : il reste sur son mannequin ») est **supprimée**. `rules.game.bossFirstRoomIncome` (2 pour Atlas Wanderer) donne le même revenu fixe, sans malus, à **chaque plateau du Boss en salle 1** ; si le mod ne le dit pas, la salle 1 est comme les autres (revenu de la salle, moins le malus). Un plateau qui recrute (stratégie `parametric`) a donc au moins un serviteur dès le premier combat ; un plateau écrit à l'avance (`board`) n'est pas concerné. La valeur 2 est un point de départ à équilibrer ; une valeur propre à une stratégie reste possible plus tard.

## 13. Types exclusifs : `drawable: false` (22 novembre 2026)

Pour la future espèce du compagnon de Borgun (voir le boss « Chasseur de reliques »), une espèce peut être déclarée **exclusive** dans `vocabulary.json` : `"drawable": false` sur la définition du type. Elle est définie comme toutes les autres (groupe, couleur, emblème, noms `type.<id>`, héros et serviteurs de n'importe quel type, pouvoirs `of`, `distinctTypes`), mais elle n'entre dans **aucun tirage au hasard** et n'apparaît pas dans les statistiques.

- **Moteur** (`data.js`) : `ALL_TYPES` et `typesOfGroup` disent ce qui existe ; `DRAWABLE_TYPES` et `drawableOfGroup(groupe)` disent ce qui peut être tiré. `isDrawable(type)` teste un type.
- **Exclu des tirages** : les types bonus du joueur (`setTypes`, `extraTypes`), les types tirés par un donjon sans liste (`drawDungeonTypes`, entrée avec `group` ou vide). Une entrée qui nomme le type dans `from` l'obtient : c'est le donjon qui le demande.
- **Exclu des statistiques** (pages de serviteurs, `tests/catalog.json`, balance) : l'espèce exclusive et tout serviteur qui porte un type exclusif. Les jetons et les serviteurs permanents des boss n'y figuraient déjà pas (`token`, `bosses.json`).
- **Inchangé** : validation des données, noms, emblèmes, tri des types sur les cartes, calcul de `distinctTypes` (l'espèce exclusive compte comme une espèce).
- **Limite connue** : sur la page des tests (`tests.html`), l'espèce d'un héros se lit dans `speciesList` ; un héros d'espèce exclusive n'y afficherait pas son espèce. À traiter le jour où un héros en porte une.
- Test : `tools/check-boss-boards.js`, section 15.

## 14. San'Dak et Cra'Ga (22 novembre 2026)

**San'Dak**, le Chasseur de reliques : boss Dwork Explorateur (`bosses.json`, `4c98a8bc-…`), 25 PV (provisoire). Il et le joueur cherchent le même artefact ; fiche d'origine : `inspiration/v2/bosses/san_dak/boss_dwork.md` (le nom provisoire était Borgun).

- **Pouvoir « Expédition légendaire »** (`powers.json#legendaryExpedition`) : au début du combat, chaque allié gagne +1/+1 par espèce différente parmi ses alliés (`distinctTypes` avec `only: species`, sur `{ side: ally }`). Le compagnon compte (testé : section 17 de `check-boss-boards.js`).
- **Compagnon permanent Cra'Ga** : espèce **Dakri**, exclusive (`drawable: false`, § 13), `servant.types: ["dakri"]` (§ 3). Stats provisoires 1 / 3 / 6, trois châsses chroma, aucun pouvoir.
- **Un serviteur permanent peut être une carte à part** : si les textes contiennent `card.<id du boss>.servant`, le serviteur a pour nom ce texte et pour identifiant `<id du boss>.servant` ; son illustration est `images/servants/<id du boss>-servant.webp`. Sans ce texte, il garde le nom et l'identifiant de son boss comme avant.
- **Cra'Ga** : niveau 3, deux châsses chroma (décidé le 22 novembre 2026) ; ses stats (3/6) restent provisoires.
- **Recrutement hors des types du donjon** : un boss peut déclarer `recruitTypes` (liste de types, `bosses.json`) ; son plateau achète parmi les types du donjon **et** ceux-là. San'Dak y met les cinq espèces tirables (Elk, Dwork, Droïde, Sorvane, Ryskan) : une nouvelle espèce du jeu demandera de l'ajouter à la main.
- **Stratégie `sandakExpedition`** (`game.json`) : plateau de 7 au plus vite, niveau de renfort moyen (1 + salle / 2), `prefer.servants.diversity: "species"` (§ strategies.md 7) : d'abord le maximum d'espèces différentes, ensuite les serviteurs les plus forts (score `card`). Mesuré (section 18 de `check-boss-boards.js`) : environ 6 espèces sur 6 en moyenne en salle 8 (24 parties), plateau plein à chaque fois.
- **Place dans le jeu (22 novembre 2026, provisoire)** : San'Dak et Veylor remplacent DR-1O et Erky comme boss fixes de la Cité des Profondeurs (`dungeons.json`, les deux premiers emplacements ; Veylor reste aussi dans la Forge). DR-1O et Erky restent dans `bosses.json`, sans donjon ; leurs tests (`check-boss-boards.js`) passent par une copie de la Cité (`test-city`) qui les contient.
- **Pas encore fait** : le placer dans un donjon ; PV définitifs ; stats et pouvoir de Cra'Ga ; équilibrage ; nom de l'artefact et récit.

## 15. Boss vaincu : les serviteurs s'arrêtent, le portrait disparaît (22 novembre 2026)

Quand la barre de PV d'un boss tombe à 0 en fin de combat, les survivants restants **ne frappent plus** : `settleCombat` (`engine.js`) s'arrête au coup qui vide la barre (plus de coups « −0 », le journal ne cite que ceux qui ont frappé). À l'écran (`playHits`, `animations.js`), après ce dernier coup, le **portrait du boss s'efface en 2 secondes** (fondu, assombri, gris) puis le déroulé continue (plateau suivant, ou écran de victoire s'il était le dernier). Test : section 19 de `check-boss-boards.js`. **Animation non vérifiée dans un navigateur** (le code est vérifié par la syntaxe seulement).
