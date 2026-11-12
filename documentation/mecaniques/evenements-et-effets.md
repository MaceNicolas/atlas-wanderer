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

## 5. Étape 4 (à faire) : les effets qui expliquent

Mise en évidence de la **source** (la carte dont le pouvoir agit pulse, avec le nom du pouvoir), rayon de la source vers les cibles, pastille du déclencheur, bandeaux des moments clés (début de salle, pouvoir du Boss), et plus tard un journal visuel. Tout est lu depuis les événements et leur cause : rien de neuf à instrumenter dans le moteur.
