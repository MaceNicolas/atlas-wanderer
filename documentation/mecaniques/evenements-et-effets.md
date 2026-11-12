# Événements, déclencheurs et effets visuels et sonores

Chantier lancé le 12 novembre 2026 avec Nicolas. Objectifs : (1) un envoi d'événements générique, pour que le mod puisse **ajouter** des moments de déclenchement et pas seulement les renommer ; (2) beaucoup plus d'effets visuels (et des sons) qui réagissent à ce qui se passe, pour que le joueur **comprenne** ce qui se passe ; (3) tout cela modulaire au maximum.

## 1. Trois choses séparées

| Couche | Rôle | Qui la possède |
|---|---|---|
| **Événements** | Ce qui s'est passé, dans un vocabulaire fermé, avec sa **cause** (quelle carte, quel pouvoir, quel déclencheur) | le moteur (un nouvel événement = du code) |
| **Déclencheurs** | Quand un pouvoir se déclenche : des **vues** sur les événements, avec une condition | le mod (`game.json`, `triggers`) |
| **Effets** | Comment on le montre et l'entend : des règles `sur tel événement, si telle condition, joue ces primitives` | le mod (`game.json`, `ui.effects`) ; les primitives (texte flottant, secousse, rayon, son…) sont fournies et fermées |

## 2. Étape 1 (faite) : les événements

Vocabulaire (`GAME_SCHEMA.eventTypes` = `EVENTS.TYPES` dans `prototype/powers.js`, égalité testée) :

| Événement | Données |
|---|---|
| `powerTriggered` | `card`, `power`, `trigger` : un pouvoir se déclenche |
| `attack` | `attacker`, `target`, `ranged` |
| `damage` | `target`, `amount`, `source?`, `direct?` (PV perdus sans passer par une attaque ou un pouvoir de dégâts) |
| `damageBlocked` | `target`, `reason` : `shield` ou `cancelled` |
| `heal` | `target`, `amount` |
| `statsChanged` | `target`, `atk`, `hp` (changement de PV max) |
| `shieldGained`, `shieldLost` | `target` |
| `keywordGained`, `keywordLost` | `target`, `keyword` |
| `cardAppeared`, `cardRemoved` | `card` (+ `name`) |
| `death` | `target` |

Chaque événement porte `cause` : `{ card, power, trigger }` quand un pouvoir l'a provoqué, `null` pour les règles du moteur (une attaque, un Bouclier qui absorbe).

**Comment ils sont produits** (`EVENTS` dans `powers.js`) : le moteur énonce lui-même ce qu'il sait (`hit()` : dégâts et dégâts bloqués ; la mort ; l'attaque ; les auras). Pour tout le reste, le combat **surveille** les cartes des deux plateaux (`track`) et, avant chaque image qu'il enregistre, compare avec l'état précédent (`sync`) : ce qui a changé devient un événement, attribué au pouvoir en cours (`observe`). Une image du combat porte donc `frame.events`, les événements des changements qu'elle montre. Hors combat (la phase de renfort), `observe` compare l'état avant et après le pouvoir.

Garanties (testées par `tools/check-events.js` sur 150 combats : 2 862 images) : tout événement est du vocabulaire et nomme des cartes qui existent ; **les PV et l'ATQ de chaque carte, image après image, se retrouvent exactement à partir des événements** (rien ne change sans qu'un événement le dise) ; un événement n'utilise jamais le hasard ; `EVENTS.enabled = false` les supprime (les simulations n'en ont pas besoin, aucun surcoût mesurable).

## 3. Étape 2 (faite) : les déclencheurs

`game.json` `triggers` : une table `nom → définition`, le nom étant celui du `t` d'un pouvoir sur une carte. Chaque entrée a un `kind` (`combat` ou `renfort` : où son texte s'affiche ; remplace la table `TRIG_KIND` qui était dans le code) et :

- soit un **`moment`** : un instant que le moteur annonce et où il joue les pouvoirs de ce déclencheur (`startCombat`, `space`, `assault`, `afterDamage`, `attackNoKill`, `attackSurvive`, `survive`, `deathrattle`, `allyDeath`, `enemyDeath`, `battlecry`, `startReinforcement`, `endReinforcement`, `active`, `passive`). **Plusieurs noms peuvent partager un moment** (le mod peut dire `charge` pour `assault`). Un répartiteur commun (`GAME.is(pouvoir, moment)`) remplace les comparaisons de noms écrites à une vingtaine d'endroits du moteur ; chaque moment doit avoir au moins un nom (validé) ;
- soit un **`on`** (un événement de la § 2) : un déclencheur **dérivé** que le mod invente. Champs : `who` (qui est concerné : `target`, `source`, `attacker`, `card`, `causeCard`, `targetSide`, `foeSide`), `if` (une expression sur l'événement, ex. `{ "gte": [{ "evt": "amount" }, 3] }`), `once` (`combat` : la première fois du combat ; `card` : une fois par carte). Les événements sont mis en file au fur et à mesure et **joués à un point sûr** (après le début du combat et entre deux attaques), jamais au milieu d'un effet ; au plus 100 par point ;
- soit ni l'un ni l'autre : une **étiquette** (le pouvoir réagit par les `reactions` de son modèle).

Les déclencheurs dérivés ne jouent qu'en combat pour l'instant (les événements de la phase de renfort existent mais ne sont pas répartis).

Vérifié : 14 parties complètes d'Atlas Wanderer (126 combats, messages et statistiques image par image) identiques à l'état d'avant ; `tools/check-triggers.js` (deux noms pour un moment jouent pareil, un dérivé joue chez les bonnes cartes, `once`, `who`, `if`, un déclencheur que personne n'utilise ne change rien, 9 erreurs refusées).

## 4. Étape 3 (faite) : les effets

`game.json` `ui.effects` : une liste de règles `{ on, phase?, if?, do: [étapes] }`. `phase` : `pre` (avant l'impact d'une attaque : la charge) ou `impact` (par défaut). `if` : une expression sur l'événement (`{ "evt": "atk" }`…). Chaque étape nomme une **primitive** du moteur (liste fermée, `GAME_SCHEMA.effectPrimitives`, code dans `prototype/effects.js`) et la carte visée par son **rôle dans l'événement** (`target`, `source`, `attacker`, `card`, `causeCard` = la carte dont le pouvoir agit). Les événements d'une même sorte sur une même carte dans une même image s'additionnent (deux coups de 2 = un « −4 »).

| Primitive | Réglages |
|---|---|
| `float` | `target`, `text` (clé de texte, avec `{amount}`, `{pos_atk}`, `{neg_hp}`, `{targetName}`…), `color` |
| `shake` | `target` |
| `glow` | `target`, `brightness`, `saturate`, `scale`, `halo`, `haloSize`, `peak`, `duration` |
| `pop`, `fadeOut` | `target` |
| `lunge` | (l'attaquant fonce sur sa cible ; un projectile part d'un tireur à distance) |
| `beam` | `from`, `to`, `color` : un trait de lumière d'une carte à une autre |
| `pulse` | `target`, `color` : la carte dont le pouvoir agit pulse |
| `sound` | `name`, `volume` |

Les animations qui étaient déduites en comparant deux images (`playImpact`) sont devenues les huit règles par défaut du mod (secousse et « −N » pour les dégâts, lueur et « +A/+H » pour un bonus, lueur et « +N » pour un soin, halo et « Bouclier ! » pour un Bouclier perdu, apparition, mort, perte de PV max, affaiblissement) ; leurs textes sont dans les textes du mod (`fx.*`, fr et en : « Bouclier ! » n'est plus écrit en français dans le code). Un message qui montre une carte agissant sur une autre (`hl`) devient un événement `attack` (`byPower`).

**Équivalence prouvée sans navigateur** (`tools/check-effects.js`) : sur 150 combats, **2 712 images**, les effets obtenus par les règles sont exactement ceux de l'ancien code (mêmes effets, mêmes cartes, mêmes textes), et la charge de chaque attaque est la même.

**Sons** : `ui.sounds` associe un nom à un fichier du mod (`sounds/hit.ogg`) ou à `null` (déclaré, silencieux). Atlas Wanderer déclare `attack`, `hit`, `heal`, `buff`, `shield`, `appear`, `death`, tous à `null`, et ses règles les jouent déjà : il suffit de déposer les fichiers et de remplir la table. Un bouton 🔊/🔇 (en haut à droite) n'apparaît que si le mod a au moins un fichier de son ; le réglage est retenu dans le navigateur.

**Galerie** : `site/effets.html` (menu Local → Effets) rejoue chaque règle du mod et chaque primitive sur trois cartes d'exemple, avec un bouton par son déclaré.

## 5. Étape 4 (faite) : les effets qui expliquent

Tout est lu depuis les événements et leur cause : aucune instrumentation de plus dans le moteur, seulement des règles du mod (groupe `explain`) :

- **La carte dont le pouvoir agit pulse et nomme son déclencheur** (`powerTriggered` : `pulse` + `float` du texte `fx.trigger.<déclencheur>`, ex. « Assaut », « Râle d'agonie »). Les pouvoirs permanents, les mots-clés et les états sont exclus (ils réagissent à chaque attaque : du bruit).
- **Un trait de lumière de la source vers ce qui change** (`beam` de `causeCard` vers la cible) pour les dégâts (rouge), soins et bonus (vert), Boucliers (cyan), mots-clés (violet) et cartes qui apparaissent (or), quand c'est un pouvoir qui en est la cause et pas la carte elle-même.

Les conditions disposent de deux champs ajoutés à l'événement : `caused` (0 ou 1) et `causeCard`. Un texte d'effet peut nommer un champ de l'événement dans sa clé (`fx.trigger.{trigger}`).

**Groupes d'effets** : `ui.effectGroups` déclare des groupes que **le joueur peut couper** (bouton ✨ en haut à droite, réglage retenu dans le navigateur) ; une règle nomme son groupe. Les règles sans groupe (les huit règles de base de l'étape 3) restent toujours actives. La galerie propose les mêmes cases à cocher.

Vérifié (`tools/check-effects.js`) : sur 150 combats, 714 pulsations et 728 traits, jamais d'une carte vers elle-même, jamais entre deux cartes étrangères au combat, aucun libellé manquant ; l'équivalence de l'étape 3 est mesurée avec le groupe coupé.

## 6. Événements de la phase de renfort, bandeau, journal (faits)

**Événements du jeu autour des combats** (en plus de ceux de la § 2) : `roomStarted { room }`, `bossPower { name, power }`, `cardPlaced { card, name, replaced? }`, `cardBought { name, kind }`, `cardDiscarded { name, kind }`, `equipmentPlaced { target, name }`, `fusion { card, name }`. Ils ne sont émis que pour le **joueur** (`forPlayer` : un plateau du Boss joue les mêmes fonctions hors de vue ; ce qu'il émet est jeté en fin de tour du Boss, l'événement de la salle est conservé). Hors combat il n'y a pas d'images : l'interface prend les événements quand l'écran est redessiné (`flushEffects`) et joue leurs effets sur les cartes à l'écran.

**Déclencheurs dérivés en renfort** : les événements émis par les actions du joueur sont regardés **une fois chacun** quand l'écran se redessine (`settleReinforcement`, jamais au milieu d'un effet, 100 par passage) ; `who` désigne une carte du plateau ; `once` dure un renfort. Un déclencheur dérivé joue donc là où son événement se produit, en combat comme en renfort (testé : un pouvoir « quand cette carte est posée » gagne +2, une seule fois).

**Bandeau** : primitive `banner { text, color, size, duration }` (texte au centre, empilé s'il y en a plusieurs). Par défaut dans Atlas Wanderer : « Salle N », « <Boss> agit », « Fusion ! ». Autres règles de renfort par défaut : apparition à la pose, halo à l'équipement, sons (`place`, `buy`, `discard`, `fusion`, `room`, tous sans fichier).

**Journal visuel** (bouton 📜) : `prototype/journal.js` construit des lignes à partir des événements et de leur cause, d'après `game.json` `ui.journal` (règles `{ on, if?, text, color?, noCause? }`, la première qui convient gagne, un événement sans règle n'apparaît pas). Rien n'est écrit à la main pour un nouveau pouvoir : sa cause est ajoutée en fin de ligne (« ← Garde (Assaut) », texte `journal.cause`). En combat le journal suit la lecture ; une fois le combat fini, **cliquer une ligne revient à ce moment** et fait pulser les cartes concernées ; en renfort il suit la salle. Vérifié (`tools/check-journal.js`) : 5 305 lignes sur 150 combats, aucune clé brute ni trou, tous les types d'événements couverts, fr et en, ouverture et fermeture dans la vraie interface.

## 7. Ce qui reste possible (non fait)

- Les effets du dé de Datacrons, de l'éclair et de l'apparition d'une carte créée (`ui.animations`, déroulés en plusieurs temps avec rappels) rejoindraient `ui.effects` ; ils fonctionnent comme avant.
- Des événements pour les achats d'amélioration, les choix de récompense et la défausse automatique.
- Les sons : le mécanisme est prêt, il reste à déposer les fichiers dans `data/mods/<mod>/sounds/`.
- Un filtre du journal (par carte, par type) et son export.
