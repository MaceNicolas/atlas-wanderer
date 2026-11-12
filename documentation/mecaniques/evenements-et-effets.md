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

## 3. Étape 2 (à faire) : les déclencheurs

Aujourd'hui une quinzaine d'endroits du moteur refont `skillsOf(s).filter(k => k.t === …)` et deux mécanismes se doublent (déclencheurs `t` des cartes, réactions `on` des modèles). Cible : `game.json` `triggers` : `nom → { moment }` pour les moments que le moteur sait émettre (un seul répartiteur remplace les quinze endroits), et `nom → { on: <événement>, who: <rôle>, if?: <condition> }` pour les déclencheurs **dérivés** que le mod invente (« premier sang du combat », « quand un allié d'un type meurt »). Les dérivés sont traités à des points sûrs (après une action, jamais au milieu), avec une profondeur bornée. Atlas Wanderer doit sortir **identique** (comparaison de parties contre l'état précédent, comme pour les stratégies).

## 4. Étape 3 (à faire) : les effets

`game.json` `ui.effects` : `[{ on: 'damage', if?: …, do: [ { effect: 'shake', target: 'target' }, { effect: 'float', target: 'target', text: 'ui.fx.damage', color: 'danger' }, { effect: 'sound', name: 'hit' } ] }]`. Primitives (liste fermée du moteur) : texte flottant, secousse, lueur, pop, rayon, projectile, particules, bandeau, mise en évidence de la cause, **son**. Les animations déduites aujourd'hui en comparant deux images (`animations.js`, `playImpact`, avec le texte « Bouclier ! » écrit en français dans le code) deviennent des règles par défaut du mod, avec leurs textes dans les fichiers de textes (fr/en).

**Sons** : une primitive `sound` joue un son nommé ; `ui.sounds` associe un nom à un fichier du mod (vide au début : silence). Un réglage « muet » est retenu dans le navigateur.

Comme le rendu ne peut pas être vérifié sans navigateur : une page **galerie** (`site/effets.html`) montre chaque primitive avec un bouton « Jouer », pour que Nicolas valide les effets à l'œil.

## 5. Étape 4 (à faire) : les effets qui expliquent

Mise en évidence de la **source** (la carte dont le pouvoir agit pulse, avec le nom du pouvoir), rayon de la source vers les cibles, pastille du déclencheur, bandeaux des moments clés (début de salle, pouvoir du Boss), et plus tard un journal visuel. Tout est lu depuis les événements et leur cause : rien de neuf à instrumenter dans le moteur.
