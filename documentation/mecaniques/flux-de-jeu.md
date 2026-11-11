# Flux de jeu en données — spécification

**Statut : brouillon du 11 novembre 2026. Décision de l'utilisateur : voie 2.** La boucle de jeu, l'état de la partie, les actions du joueur, les fenêtres de choix et l'interface sont décrits par le mod, pas par le moteur. Rien de ce document n'est encore dans le code. Il prolonge `pouvoirs-modulaires.md` (les pouvoirs des cartes, la section 0 « règle absolue » et le § 19.3 « mods ») : ce document-là décrit **ce que fait une carte**, celui-ci décrit **ce qu'est une partie**.

## 1. Objectif

Un mod peut décrire un jeu de cartes à plateau dont **la forme n'est pas celle d'Atlas Wanderer** : d'autres écrans, d'autres ressources, d'autres zones, une autre suite d'étapes, sans modifier `prototype/`. Atlas Wanderer en est le premier exemple : sa boucle actuelle (choisir un donjon et deux héros, enchaîner renfort et combat jusqu'au Boss) devient un fichier de données.

Ce que le moteur garde (le **noyau**) : l'interpréteur de briques, le combat automatique, le hasard à graine, la sauvegarde, le rendu générique des cartes et des panneaux, le chargement des mods. Tout le reste est du contenu.

### Ce que ce document ne promet pas

- Un mod **ne contient jamais de code** (§ 19.3 de `pouvoirs-modulaires.md`). Si une mécanique nouvelle l'exige, on ajoute une **brique générique** au noyau, paramétrée par des données, jamais un cas écrit pour un mod.
- Le **combat automatique** reste un noyau paramétrable (rules.json : ordre, usure, règlement). Un mod sans combat n'est pas visé pour l'instant.
- Le rendu est **générique** : le mod choisit des panneaux, des zones, des boutons, un thème. Il ne dessine pas ses écrans en HTML.

## 2. Ce qui est codé aujourd'hui

| Domaine | Où | Contenu spécifique à Atlas Wanderer |
|---|---|---|
| **Écrans** | `ui.js` : `menu`, `heroes`, `renfort`, `combat`, `end` | Quatre écrans écrits à la main (choix du donjon, des héros, console de renfort, combat, fin). |
| **État de partie** | `engine.js` : `newGame` | `heroes`, `dungeon`, `types`, `board`, `hand`, `datacrons`, `level`, `counter`, `room`, `bossTeams`, `cubeBag`, `pr`… |
| **Mise en place** | `ui.js` : `selDungeon`, `selHero`, `start` | Choisir 1 donjon puis 2 héros ; types de la partie tirés. |
| **Boucle** | `ui.js` : `openReinforcement`, `finishReinforcement`, `startCombatUI`, `next` | Salle N : revenu → renfort → combat → règlement → salle suivante ou fin. |
| **Actions** | `ui.js` : `ACT.buyOffer`, `buyLevel`, `pickOffer`, `pickReward`, `discard`, `finishReinforcement`, `useActive`… | Prix, conditions, effets écrits en JavaScript. |
| **Fenêtres de choix** | `rf.offer`, `rf.reward`, `rf.prophecy`, `UI.adapt`, `discoverQueue` | Une file de choix, chacun avec son rendu et sa résolution. |
| **Interface** | `ui.js`, `animations.js`, `svg.js`, `prototype.html` | Disposition, vocabulaire (« Datacron », « Boss »), animations (dé, pose), thème. |
| **Sauvegarde** | `save.js` | Clés et forme de `g` et `rf` propres au jeu. |

## 3. Principes

1. **Une partie est un état déclaré.** Zones (listes de cartes), ressources (nombres), compteurs et références nommées sont déclarés par le mod ; le noyau les stocke, les sauvegarde et les affiche sans connaître leur sens.
2. **Le flux est une machine à états.** Le mod déclare des **phases**, leurs **étapes** et les **transitions**. Le noyau avance d'étape en étape et attend le joueur quand l'étape est interactive.
3. **Tout ce que fait le joueur est une action déclarée** : un identifiant, un libellé (clé de texte), des conditions, un coût, des effets. Les effets sont des **briques** (celles des pouvoirs, plus quelques-unes propres au flux).
4. **Tout choix est une fenêtre de choix déclarée** : d'où viennent les options, combien on en prend, ce qui arrive ensuite. Les offres de renfort, les récompenses de fusion, la prophétie, l'Adaptation sont le même mécanisme.
5. **L'interface est une description**, pas du code : écrans faits de panneaux, panneaux faits de widgets génériques liés à l'état.
6. **Le hasard reste à graine.** Une partie rejouée avec la même graine et les mêmes choix donne le même journal. C'est la preuve que la migration ne change pas le jeu (§ 8).
7. **Les cartes sont des données typées.** Les catégories (serviteurs, équipements, héros, donjons) et leurs champs sont déclarés par le mod ; l'éditeur et la validation lisent ces déclarations.

## 4. Le manifeste de jeu : `game.json`

Nouveau fichier du mod (rôle `game` dans `mod.json`), qui décrit la partie. Les exemples ci-dessous sont ceux d'Atlas Wanderer.

```json
{
  "version": 1,
  "categories": { ... },     // § 4.1  catégories de cartes
  "state":      { ... },     // § 4.2  zones, ressources, compteurs
  "setup":      { ... },     // § 4.3  mise en place
  "flow":       { ... },     // § 4.4  phases et transitions
  "actions":    { ... },     // § 4.5  actions du joueur
  "choices":    { ... },     // § 4.6  fenêtres de choix
  "ui":         { ... }      // § 5   écrans
}
```

### 4.1 Catégories de cartes

Chaque catégorie déclare ses champs (type, bornes, valeurs permises). Elle remplace les listes écrites en dur dans `editor-core.js` (`CARD_FIELDS`, validation) et dans `data.js` (`install`).

```json
"categories": {
  "servant":   { "file": "servants",  "fields": { "rank": "int>=1", "atk": "int>=0", "hp": "int>=1", "types": "types:one-per-group", "sock": "sockets", "kw": "keywords", "skill": "powers" }, "image": true },
  "equipment": { "file": "equipment", "fields": { "rank": "int>=1", "atk": "int>=0", "hp": "int>=0", "type": "type", "color": "socketColor", "skill": "powers" }, "image": true },
  "hero":      { "file": "heroes",    "fields": { "types": "types", "hp": "int>=1", "power": "power" }, "image": true },
  "dungeon":   { "file": "dungeons",  "fields": { "type": "type", "minis": "types", "boss": "boss" }, "scene": true }
}
```

### 4.2 État de la partie

```json
"state": {
  "zones":     { "board": { "max": "game.maxBoard", "layout": "row" }, "hand": { "max": "game.handMax", "layout": "tray" } },
  "resources": { "datacrons": { "start": 0, "icon": "datacron" }, "level": { "start": 1, "max": "game.maxLevel" }, "levelProgress": { "start": 0 }, "room": { "start": 1 } },
  "sides":     { "player": { "zones": ["board", "hand"], "resources": ["datacrons", "level", "levelProgress"] },
                 "boss":   { "count": "game.bossBoards", "zones": ["board", "hand"], "ai": "bossBehaviors" } },
  "pools":     { "cardTypes": { "draw": "game.gameTypes" } }
}
```

Les références (`game.maxBoard`) renvoient à `rules.json`. Un côté peut être piloté par une **IA** déclarée (aujourd'hui `bossBehaviors`) qui joue les **mêmes actions** que le joueur.

### 4.3 Mise en place (`setup`)

Une suite d'**étapes de sélection** avant la première phase.

```json
"setup": {
  "steps": [
    { "id": "dungeon", "pick": { "from": "dungeon", "count": 1 }, "screen": "dungeonSelect" },
    { "id": "heroes",  "pick": { "from": "hero", "count": 2 },    "screen": "heroSelect", "back": "dungeon" }
  ],
  "init": [
    { "action": "setTypes", "from": ["heroes.types", "dungeon.type"], "fillTo": "game.gameTypes" },
    { "action": "createSides" }
  ]
}
```

### 4.4 Flux (`flow`)

Une **phase** est interactive (elle attend le joueur) ou automatique (le noyau la joue). Les transitions testent des conditions.

```json
"flow": {
  "start": "room",
  "phases": {
    "room": {
      "repeat": true,
      "steps": [
        { "id": "income",        "auto": true,  "effects": [ { "action": "gainResource", "resource": "datacrons", "amount": { "table": "game.income", "index": "room" } } ] },
        { "id": "reinforcement", "interactive": true, "actions": ["buyServant", "buyEquipment", "buyLevel", "placeCard", "discard", "usePower", "finish"], "until": "finish" },
        { "id": "combat",        "auto": true,  "run": "combat" },
        { "id": "settlement",    "auto": true,  "run": "settlement" }
      ],
      "end": [ { "if": "boss.hp <= 0", "go": "victory" }, { "if": "heroes.alive == 0", "go": "defeat" }, { "go": "room", "effects": [ { "action": "incrementResource", "resource": "room" } ] } ]
    },
    "victory": { "final": true, "screen": "endScreen", "result": "won" },
    "defeat":  { "final": true, "screen": "endScreen", "result": "lost" }
  }
}
```

Les événements de pouvoirs existants (`startReinforcement`, `endReinforcement`, `startMission`, `game`…) sont **émis par le noyau à l'entrée et à la sortie des étapes** : le champ `events` d'une étape les nomme, au lieu de les coder (`reinforcementFx`).

### 4.5 Actions du joueur

```json
"actions": {
  "buyServant": {
    "label": "ui.reinforceServant", "icon": "btnServant",
    "cost":  { "datacrons": "rules.reinforcement.kinds.servant.cost" },
    "when":  [ { "not": "hand.full" }, { "not": "choiceOpen" } ],
    "effects": [ { "action": "openChoice", "choice": "offer", "params": { "kind": "servant" } } ]
  },
  "buyLevel": {
    "label": "ui.level", "icon": "niveauChevrons", "cost": { "datacrons": 1 },
    "when": [ { "resource": "level", "lt": "game.maxLevel" } ],
    "effects": [ { "action": "incrementResource", "resource": "levelProgress" }, { "action": "levelUpIfFull", "cost": "game.levelCostOffset" } ]
  },
  "placeCard": { "drag": { "from": "hand", "to": ["board", "cardOnBoard"] }, "effects": [ { "action": "placeCard" } ] },
  "finish":    { "label": "ui.exploreNextRoom", "icon": "btnDoor", "when": [ { "resource": "datacrons", "eq": 0 } ], "effects": [ { "action": "endStep" } ] }
}
```

Les **coûts** sont des ressources déduites avant les effets (remboursées si le choix n'a aucune option). Les **conditions** sont des expressions simples sur l'état (§ 4.8).

### 4.6 Fenêtres de choix

Un choix est ouvert par une action, une carte ou une étape ; il reste ouvert jusqu'à résolution. Plusieurs choix peuvent s'empiler (file).

```json
"choices": {
  "offer":   { "from": { "draw": "reinforcement", "kind": "$kind", "count": "rules.reinforcement.proposals" }, "pick": 1, "abandon": { "cost": 0 },
               "then": [ { "action": "moveCard", "to": "hand" } ], "view": "cardRow", "title": "ui.chooseCard" },
  "fusion":  { "from": { "draw": "rank", "rank": "level+1", "count": 3 }, "pick": 1, "then": [ { "action": "moveCard", "to": "hand" } ], "view": "cardRow", "title": "ui.rewardFusion" },
  "adapt":   { "per": "survivor", "from": { "options": [ "randomStat", "borrowedPower" ] }, "pick": 1, "then": [ { "action": "applyOption" } ], "view": "optionList" }
}
```

Les sources de cartes (`draw`) sont des **sélecteurs de catalogue** (§ 3 de `pouvoirs-modulaires.md`) : catégorie, rang maximum, types permis, pondération, exclusions.

### 4.7 Effets

Les effets du flux sont des briques. Celles des pouvoirs servent telles quelles (`createCard`, `modify`, `choose`, `schedule`, `remember`…). Briques nouvelles :

| Brique | Rôle |
|---|---|
| `gainResource`, `spendResource`, `incrementResource` | Modifient une ressource (bornes et plafonds de l'état). |
| `openChoice`, `closeChoice` | Ouvrent / ferment une fenêtre de choix. |
| `moveCard` | Déplace une carte d'une zone à une autre (main pleine : message et carte perdue, règle du noyau). |
| `placeCard` | Pose depuis la main ; remplacement ; événement `cardAdded` ; restitution des équipements (règle `sockets`). |
| `draw` | Tire des cartes d'un sélecteur. |
| `endStep`, `goPhase`, `endGame` | Pilotent le flux. |
| `run` | Lance une phase automatique du noyau (`combat`, `settlement`, `bossBoardsFight`). |

### 4.8 Expressions et conditions

Les expressions de § 4 de `pouvoirs-modulaires.md` (valeurs, sélecteurs) sont réutilisées. Les conditions d'action et de transition sont des listes de prédicats (`resource` + `lt/le/eq/ge/gt`, `zone` + `full/empty/count`, `choiceOpen`, `not`, `any`, `all`). Pas de langage libre : seulement des prédicats listés dans le schéma des briques.

## 5. L'interface décrite en données

Un **écran** est un arbre de **panneaux** ; un panneau contient des **widgets** génériques liés à l'état.

```json
"ui": {
  "theme": { "title": "ui.gameTitle", "css": "theme.css", "tokens": { "accent": "#f5c542" } },
  "screens": {
    "dungeonSelect": { "layout": "stack", "panels": [ { "widget": "catalogGrid", "category": "dungeon", "select": "setup.dungeon" } ] },
    "heroSelect":    { "layout": "stack", "panels": [ { "widget": "detail", "of": "setup.dungeon" }, { "widget": "catalogGrid", "category": "hero", "select": "setup.heroes", "max": 2 }, { "widget": "typeChips", "of": "state.types" } ] },
    "room": {
      "layout": "columns",
      "panels": [
        { "widget": "sideSummary", "side": "boss",   "show": ["hp", "types", "power"] },
        { "widget": "zone", "side": "boss", "zone": "board" },
        { "widget": "zone", "side": "player", "zone": "board", "drop": ["placeCard"] },
        { "widget": "zone", "side": "player", "zone": "hand", "drag": true },
        { "widget": "heroSlots", "powers": "active" },
        { "widget": "console", "resources": ["level", "datacrons"], "actions": ["buyServant", "buyEquipment", "buyLevel", "finish"] },
        { "widget": "choiceOverlay" },
        { "widget": "log" }
      ]
    },
    "playback": { "layout": "columns", "panels": [ { "widget": "zone", "side": "boss", "zone": "board" }, { "widget": "zone", "side": "player", "zone": "board" }, { "widget": "playbackControls" } ] },
    "endScreen": { "layout": "stack", "panels": [ { "widget": "result" }, { "widget": "stats" }, { "widget": "button", "action": "restart" } ] }
  }
}
```

Les widgets du noyau : `catalogGrid`, `detail`, `zone`, `sideSummary`, `heroSlots`, `console`, `choiceOverlay`, `log`, `playbackControls`, `result`, `stats`, `typeChips`, `button`. Un mod **choisit et assemble** ; il n'en invente pas (une brique d'interface nouvelle demande du code du noyau, comme une brique de pouvoir).

**Vocabulaire.** Tous les mots du jeu (« Datacron », « Boss », « héros », « renfort ») viennent des textes du mod. **Animations** : liste de noms génériques (`pop`, `slide`, `shake`, `diceRoll`, `flash`) que le mod associe à des événements (`cardPlaced`, `resourceGained`, `choiceOpened`). **Décors** : les scènes de donjon deviennent des **ressources du mod** (SVG ou image), référencées par la carte (`scene`).

## 6. Sauvegarde

L'état déclaré (§ 4.2), les choix ouverts, la phase et l'étape courantes, la graine, les références nommées : un format unique, indépendant du mod, versionné avec le schéma du manifeste. `save.js` n'a plus de connaissance de `g` ni de `rf`.

## 7. Atlas Wanderer écrit dans ce modèle : ce qui change

| Aujourd'hui (code) | Demain (donnée) |
|---|---|
| `newGame`, `makeTeam` | `state` + `setup.init` + `sides.boss` |
| `openReinforcement`, `startReinforcement`, `finishReinforcement`, `next` | `flow.phases.room` |
| `ACT.buyOffer`, `buyLevel`, `finishReinforcement`, `discard` | `actions` |
| `rf.offer`, `rf.reward`, `rf.prophecy`, `UI.adapt`, `discoverQueue` | `choices` + file de choix du noyau |
| `renderMenu`, `renderReinforcement`, `renderCombat`, `renderEnd` | `ui.screens` et widgets |
| `reinforcementFx`, `checkProphecy`, `drawCube`, `ACTIVES` | événements de flux + briques de pouvoirs |
| `SAVE` | format générique |

## 8. Preuve : rejeu à graine

À chaque étape de la migration, un test joue des parties à graine fixe avec le moteur **avant** et **après** et compare le journal et l'état final. Les parties sont jouées par le bot (`tools/player-bot.js`) via des actions déclarées, ce qui teste aussi le manifeste. Le test de conformité d'un mod dérivé (`tools/check-mods.js`) s'étend : un mod à **boucle différente** (une seule phase, une autre ressource) doit se jouer sans changer le code.

## 9. Plan de migration

Chaque étape laisse le jeu jouable et les tests verts.

| # | Étape | Résultat |
|---|---|---|
| 1 | **Manifeste et chargeur** : `game.json`, schéma, validation, rôle `game` dans `mod.json`. Aucune logique encore. | Le mod décrit sa partie ; `check-mods` la valide. |
| 2 | **Actions et choix du renfort en données** (`buyServant`, `buyEquipment`, `buyLevel`, `finish`, `offer`) : le noyau exécute les actions déclarées ; l'interface actuelle les appelle. | Les prix, conditions et effets ne sont plus dans `ACT`. |
| 3 | **État générique** : zones et ressources déclarées ; `newGame` lit le manifeste ; la sauvegarde devient générique. | Plus de forme de `g` dans le moteur. |
| 4 | **Flux en données** : machine à états (phases, étapes, transitions) ; événements d'étape ; IA du Boss jouant les mêmes actions. | `openReinforcement`, `next`, `bossReinforcement` disparaissent. |
| 5 | **Mise en place en données** : sélections (donjon, héros) et initialisation. | Un mod peut avoir 0, 1 ou 3 sélections. |
| 6 | **Interface générique** : panneaux et widgets liés à l'état ; thème et vocabulaire du mod ; animations nommées. | `ui.js` ne connaît plus Atlas Wanderer. |
| 7 | **Spécificités de cartes en briques** (Adaptation, modèle PR, déclencheurs Pilote, prophétie, dé, pouvoirs de héros, drones, fusion). Se fait en parallèle des étapes 2 à 6, brique par brique. | `engine.js` et `powers.js` sans cas Atlas. |
| 8 | **Catégories de cartes en schéma** : l'éditeur et la validation lisent `categories`. | L'éditeur sert n'importe quel mod. |
| 9 | **Deuxième mod de preuve** à boucle différente, joué sans changer le code. | Preuve de la voie 2. |

## 10. Décisions (tranchées le 11 novembre 2026)

1. **Conditions** : des **prédicats listés** dans le schéma (§ 4.8), pas de langage textuel.
2. **Interface** : **panneaux et widgets du moteur**, assemblés par le mod, **plus une couche de thème en CSS** : le mod apporte un fichier CSS qui ne peut contenir que des **variables** (`--nom: valeur`) sous `:root`, pour changer couleurs, polices, arrondis et espacements. Pas de HTML libre. Un besoin de mise en page que les composants ne permettent pas = un nouveau composant dans le moteur.
3. **Combat** : reste un **noyau paramétré** par `rules.json` ; le décrire en briques est repoussé après l'étape 9.
4. **Éditeur visuel de flux** : plus tard, quand le côté modulaire sera fini. D'abord l'édition du JSON.
5. **Sauvegardes d'expédition** : jetables, aucune compatibilité à maintenir pour l'instant.
6. **Ordre** : étapes 1 et 2 d'abord, l'étape 7 en continu, l'interface (étape 6) en dernier ; l'ancienne interface reste en place tant que la nouvelle n'est pas identique.

## 11. Avancement

| Étape | État |
|---|---|
| 1. Manifeste et chargeur | Fait le 11 novembre 2026 : `data/mods/<id>/game.json`, `theme.css`, schéma des capacités du moteur (`prototype/game-schema.js`), validation (`validateGame`, `validateThemeCss` dans `site/editor-core.js`), test dans `tools/check-mods.js`. Le manifeste décrit le jeu mais **le moteur ne l'exécute pas encore**. |
| 2. Actions et choix du renfort | Fait le 11 novembre 2026 : l'interpréteur `prototype/flow.js` exécute `buyServant`, `buyEquipment` et `buyLevel` depuis `game.json` (prix, conditions, effets, remboursement si l'offre est vide) ; la console de renfort affiche les boutons des actions que le mod liste ; test `tools/check-flow.js`. Restent en code : les bonus qui changent le tirage (Boussole, Explorateur lointain, Sonde, dans `GAME.openers.offer`), la prophétie (`GAME.hooks.afterSpend`), la pose, le rejet, la fin du renfort, les choix de récompense. |
| 3. État générique | Fait le 11 novembre 2026 (en partie) : le début de partie est construit depuis `game.json` (`state.zones`, `state.resources` avec leurs valeurs de départ, `state.vars` rattachées aux côtés `player` et `boss` ; `GAME.initialSide`), pour le joueur et pour chaque plateau du Boss ; la sauvegarde vérifie les zones déclarées et résume la partie (salle, niveau, choix de mise en place) depuis la description. Restent : les champs de partie écrits ou lus par du code d'Atlas (`prophecy`, `patchFx`, `forgeFx`, `discoverQueue`, `spent`, `prNum`), la forme de `rf` (offre, récompense, prophétie), les noms de champs que `field` relie aux ressources, et le résumé du menu de reprise (mots « donjon », « héros » dans l'interface). |
| 4. Flux en données | Fait le 11 novembre 2026 : `GAME.begin/advance/release` (prototype/flow.js) font tourner les phases, étapes et transitions de `game.json` : chef de plateau du Boss, prophétie (première salle), revenu, renfort, combat, règlement, rapport de fin de combat, puis victoire, défaite ou salle suivante (le compteur de salle est incrémenté par la transition). Le moteur enregistre les événements d'étape (`roomStart`, `startMission`, `beforeIncome`, `startReinforcement`, `endReinforcement`) et les exécuteurs (`bossReinforcement`, `combat`, `settlement`, `aftermath`) ; l'interface (`drive()`) montre ce qui attend. La position dans le flux est sauvegardée (`g.flow`, sauvegarde en version 6). L'IA du Boss joue maintenant les **mêmes actions déclarées** que le joueur (`GAME.run` sur l'état d'un plateau : prix, conditions, offre), seul son choix de ce qu'elle achète (comportements, `rules.json`) reste dans le moteur. Restent : les choix d'Adaptation (présentés sur l'écran du rapport, résolus par l'interface), le badge de salle qui montre la salle jouée pendant le rapport. |
| 5. Mise en place en données | Fait le 11 novembre 2026 : les étapes de sélection de `game.json` (`setup.steps`) décident du nombre de choix (1 donjon, 2 héros), de l'ordre, du retour en arrière, de la fin de la mise en place et des écrans (`dungeonSelect`, `heroSelect`) ; `GAME.emptySelection/toggle/setupNext/setupBack/setupComplete/applySetup`, `newGame(sélection)` ; les effets d'initialisation (`setTypes`, `createSides`) et ce qu'un choix devient dans l'état (`GAME.picked.hero/dungeon`) sont enregistrés par le moteur. Un mod peut donc avoir 0, 1 ou 3 sélections, avec des nombres différents. Reste : le dessin des écrans de sélection (étape 6). |
| 7. Briques de cartes | En cours (11 novembre 2026). Faits : déclencheurs « Pilote » → `allyDeath`/`enemyDeath`/`allySurvivesOwnAttack` + `of` ; Adaptation → `choices.adaptation` ; modèle PR → `companion`. Faits aussi : fusion et carte dorée (`fusion`, champ `gold` des modèles), pouvoirs actifs des héros (`heroActions`). Fait aussi : prophétie (`promises`), dé de Datacrons (`bags`), unités invoquées (`tokens`). Restent : briques écrites pour une carte (`forgePatch`, `takeEquipment`, `equipUnavailable`, `discoverEquip`, `droneBoostGame`, `buffChosenAlly`, `datacube`, `giveServant`). |
| 9. Deuxième mod | Premier jalon fait le 11 novembre 2026 : le mod `duel` (`tools/make-duel-mod.js`) a moins de fonctions qu'Atlas Wanderer (ni carte compagnon, ni cartes promises, ni dé, ni unités invoquées, ni pouvoirs actifs de héros, ni Adaptation) et d'autres tailles et prix. Le moteur le charge, le valide, le démarre et le joue sans changement de code (`tools/check-duel.js` : données, textes, démarrage, 30 parties simulées, tous les écrans). Cela a montré que l'Adaptation était supposée présente : elle est devenue facultative. Reste : un mod à **boucle différente** (autres ressources, autres phases), ce qui demande de supprimer le pont `field` entre ressources et champs de l'état. |
| 6. Interface générique | En cours (11 novembre 2026). Fait : le noyau d'interface `prototype/ui-kit.js` (`UIKIT.define`, `UIKIT.render`) et les cinq écrans (`dungeonSelect`, `heroSelect`, `room`, `playback`, `endScreen`) construits depuis `game.json` (`ui.screens.<nom>.nodes` : widgets du moteur, conteneurs à balises, attributs et classes validés, textes) ; les **décors des donjons** (`scenes.json`) et les **emblèmes propres au jeu** (`vocabulary.json`, `icons` : Datacron, niveau, boutons) sortis de `svg.js` ; les **récompenses** (fusion, découverte d'équipement, choix d'un allié) décrites par des choix de `game.json` (`title`, `subtitle`, `cards`, `then`) et résolues par `resolveReward` ; titre de la page lu dans le mod. La preuve : `tools/check-render.js` enregistre l'empreinte de 71 pages d'une partie jouée (mise en place, renfort, offres, combat image par image, rapport, fin, plus la prophétie, la fusion, les découvertes et l'Adaptation) et la refonte les laisse **toutes inchangées**. Les widgets de la console (`consoleHead`, `consoleActions`, `consoleNext`) ne contiennent plus de nom de ressource ni d'action : tout vient des propriétés du widget et de la description (`symbol`, `title`, `icon` des ressources ; `offerWhen`, `labelAtMax`, `iconColor` des actions). Les zones `board` et `hand`, le camp `boss` et la sélection `heroes` sont des **rôles du noyau** (le combat et les conditions de victoire s'appuient dessus) : les widgets les citent. Restent : le HTML des cartes et de la bannière du Boss, les fenêtres de dialogue et le panneau de débogage, les classes Tailwind écrites dans les données, la disposition de la carte à deux types dans `svg.js`. |

## 12. Risques

- **L'interface est la plus grosse part** (`ui.js` fait plus de 800 lignes, `animations.js` 300) : les widgets doivent reproduire l'existant au pixel près pour que la preuve par rejeu ait un sens ; on garde l'ancienne interface jusqu'à ce que la nouvelle soit identique.
- **Perte de lisibilité** : un flux en JSON est plus dur à lire que du code ; l'éditeur et la génération de texte (§ 20 de `pouvoirs-modulaires.md`) doivent suivre.
- **Faux généralisme** : n'ajouter une brique ou un widget que lorsqu'un deuxième mod (ou un test) en a besoin.
