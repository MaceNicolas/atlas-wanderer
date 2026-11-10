# Pouvoirs modulaires — spécification

**Statut : brouillon, les cinq décisions de la section 16 sont tranchées (10 novembre 2026) ; reste une relecture d'ensemble. Le code et les données sont en anglais (section 20).** Rien de ce document n'est encore dans le code. Il décrit le modèle visé, puis la correspondance entre chaque pouvoir actuel (`fx` de `prototype/data.js`) et ce modèle. Il a été établi le 10 novembre 2026 à partir de `prototype/data.js` et `prototype/engine.js`.

## 1. Objectif

Que **tout** pouvoir du jeu (serviteurs, équipements, lieutenants, Boss, mots-clés, règles de partie) soit une **donnée** assemblée avec des briques (Déclencheur, Conditions, Actions, Cibles, Valeurs), et non du code écrit pour une carte. Un outil permettra de les assembler. Ajouter une carte ne doit jamais demander de modifier le moteur.

Le moteur ne contient plus que le **noyau** (section 12) : l'interpréteur de briques, la boucle de combat et quelques règles physiques (un serviteur à 0 PV meurt).

### Ce que ce document ne promet pas

Si une mécanique réellement nouvelle apparaît (une nouvelle zone de jeu, un nouveau type de ressource), il faudra ajouter une brique. L'objectif est que les briques restent **génériques** et que leur nombre reste petit (environ 35 actions, 30 événements, une quinzaine d'expressions).

### Périmètre

- **Partie A, entièrement spécifiée ici** : les pouvoirs des cartes, des lieutenants et des Boss, les mots-clés (section 14.11), la fatigue, la fusion, l'Adaptation.
- **Partie B, spécifiée par principes** (section 11) : l'économie du renfort, la génération des offres, l'IA des plateaux du Boss. Elles passent aussi en données, mais le détail se fera après la partie A.

## 2. Les sept principes

1. **Tout est un événement.** Le moteur émet des événements (attaque, dégâts, mort, bouclier perdu, début de combat, carte posée…). Un pouvoir ne fait que s'y abonner.
2. **Chaque événement a un moment « avant » et un moment « après ».** Au moment « avant », un pouvoir peut **annuler**, **modifier** ou **remplacer** l'événement (c'est une *interception*). Au moment « après », il réagit. Les interceptions remplacent presque tous les tests `skillsOf(...).some(k => k.fx === ...)` éparpillés dans le moteur.
3. **L'état est une donnée générique.** Compteurs, références nommées, pouvoirs temporaires posés sur une cible. Une bombe, par exemple, est un pouvoir temporaire (section 6.3), pas un champ `bombs`.
4. **Les valeurs sont des expressions** évaluées au moment de l'effet (niveau de renfort, nombre de types différents, ATQ d'une cible, tirage pondéré…).
5. **Le méta-jeu fait partie du système.** Main, offre de renfort, Datacrons, choix du joueur sont des zones, des ressources et des actions, comme le plateau.
6. **Les copies passent par un journal.** Le moteur note les effets joués. « Rejouer » est une requête sur ce journal.
7. **Le hasard dépend d'une graine.** Un combat rejoué avec la même graine donne exactement le même journal. C'est la condition pour prouver qu'une migration ne change rien.

## 3. Vocabulaire

| Terme | Sens |
|---|---|
| **Porteur** (`carrier`) | La carte (serviteur, équipement porté, lieutenant, Boss) qui possède le pouvoir. |
| **Sujet / Objet / Source** (`subject`, `object`, `source`) | Les rôles d'un événement. Exemple : pour « A attaque B », sujet = A, objet = B. Pour des dégâts, source = ce qui les cause. |
| **Camp** (`side`) | `ally` / `enemy`, toujours **relatifs au porteur**. |
| **Phase** | Mission, renfort (interactif), combat (automatique), fin de combat (interactif). |
| **Durée** (`duration`) | Combien de temps dure un effet : `instant`, `combat`, `reinforcement`, `mission`, `permanent`. |
| **Étiquette** (`tag`) | Mot libre posé sur une carte ou un pouvoir (`drone`, `battlecry`, `replay`, `jammer`, `non-copyable`). Les filtres s'en servent. |

## 4. Forme d'un pouvoir

Format canonique : **JSON** (sauvegardé dans un fichier de données, édité par l'outil). Les clés et toutes les valeurs d'identifiant sont en **anglais** (section 20).

```json
{
  "tags": ["battlecry"],
  "when": { "event": "death", "timing": "after", "subject": { "side": "ally", "type": "pilot" } },
  "if": [ { "limit": { "per": "combat", "max": 1 } } ],
  "then": [
    { "action": "stats", "target": { "side": "ally", "pick": "random" }, "atk": 2, "hp": 1, "duration": "combat" }
  ],
  "priority": "normal",
  "text": null
}
```

| Champ | Rôle |
|---|---|
| `when` | L'événement qui déclenche, son `timing` (`before` ou `after`, `after` par défaut) et les filtres sur ses rôles (`subject`, `object`, `source`). |
| `if` | Liste de conditions, toutes à remplir (section 7). |
| `then` | Liste d'actions jouées dans l'ordre (section 9). |
| `priority` | Ordre de résolution quand plusieurs pouvoirs répondent au même événement (section 12.3). |
| `tags` | Étiquettes du pouvoir (sert aux filtres : « premier effet joué qui n'est pas un rejeu »). |
| `text` | Si vide (`null`), la description est **générée** à partir des briques, en français et en anglais. Sinon, texte manuel `{ "fr": "…", "en": "…" }` (pour les cas où la phrase générée est maladroite). |

Un **pouvoir permanent** (ancien déclencheur `passive`) n'a pas d'événement propre. C'est l'un des trois cas suivants :

- une **interception** (« avant » un événement) : elle agit sur ce qui se passe (section 6) ;
- un **mot-clé** (section 14.11) ;
- une **aura** (section 4.1) : elle agit sur l'état des cartes, tant qu'une condition reste vraie.

### 4.1 Les auras (« tant que… »)

Une aura est un pouvoir qui **ne se déclenche pas** : son effet existe tant que sa condition est vraie, et disparaît dès qu'elle ne l'est plus. Elle ne laisse aucune trace dans la carte visée.

```json
{
  "aura": {
    "if": [ { "has": { "target": "carrier", "alive": true, "onBoard": true } } ],
    "target": { "side": "ally", "filter": { "tag": "drone" } },
    "effects": [ { "action": "stats", "atk": 1, "hp": 1 } ]
  }
}
```

Au lieu de `when` et `then`, l'aura a donc un bloc `aura` (`if`, `target`, `effects`). Description générée : « Tant que ce serviteur est en jeu, les drones alliés ont +1/+1. »

**Règles de l'aura**

| Règle | Détail |
|---|---|
| Actif quand | Par défaut : le porteur est vivant et sur le plateau. Le champ `if` peut ajouter d'autres conditions (« s'il y a au moins 3 Pilotes alliés », « tant que le porteur est équipé »). |
| Réévaluation | Après chaque résolution d'événement (comme `spaceAvailable`). La cible est donc **recalculée en continu** : un drone invoqué plus tard reçoit l'aura, un drone qui meurt la perd avec lui. |
| Effets permis | Uniquement des effets **additifs et commutatifs** : `stats` (bonus ou malus), `keyword` (donner), `power` (donner), `tag` (ajouter). Ainsi l'ordre entre auras n'a pas d'importance. Pas de `set` ni d'`swap` dans une aura. |
| Expressions | Elles lisent les statistiques **sans les auras** (base, bonus permanents et temporaires). Une aura ne peut donc pas dépendre d'une autre aura : pas de boucle. Le nombre de cartes ou de types reste utilisable. |
| Bonus de PV | Un bonus de PV augmente à la fois les PV max et les PV actuels. Quand l'aura disparaît, les PV max redescendent et les PV actuels sont plafonnés aux PV max, **mais l'aura ne tue jamais** : les PV ne descendent pas sous 1 à cause de la perte d'une aura. |
| Doré | Les quantités sont doublées comme pour tout pouvoir (section 13). |
| Affichage | L'interface reçoit pour chaque statistique la valeur de base et le bonus d'aura, pour pouvoir les afficher séparément (par exemple le bonus en vert). |

**Aura ou interception ?** Si le pouvoir change **ce qui se passe** (annuler des dégâts, augmenter une invocation), c'est une interception. S'il change **ce qu'est** une carte (ses statistiques, ses mots-clés, ses pouvoirs) tant que quelque chose est vrai, c'est une aura.

**Premier cas d'essai.** Le Chef mécanicien dit « tant qu'il est en vie, les drones invoqués par votre camp ont +4/+4 ». Aujourd'hui, le bonus est appliqué à l'invocation et **reste** si le Chef meurt ensuite. En aura, il disparaîtrait avec lui, ce qui correspond mieux au texte. Cela change le comportement : l'équivalence avec le prototype se prouve d'abord avec l'interception de la section 6.2, puis le Chef mécanicien passe en aura dans une étape séparée, qui sert de premier test de la brique.

Une **carte** porte une liste de pouvoirs, des mots-clés (qui sont eux-mêmes des pouvoirs, section 14.11), des étiquettes et des statistiques.

## 5. Événements

Chaque événement a un moment `before` (interception possible) et `after`. Les rôles sont donnés entre parenthèses.

### 5.1 Combat

| Événement | Rôles | Ancien déclencheur |
|---|---|---|
| `startCombat` | : | `startCombat` |
| `endCombat` | `winner` (`player`, `boss`, `tie`), `survivors` (par `side`) | `endCombat` |
| `attackTurn` | `subject` (l'attaquant désigné par la file) | : |
| `attack` | `subject` = attaquant, `object` = `target`, `origin` (`normal` ou `induced`) | `assault` (après, `origin` normale), `enemyAttacks` (avant, sujet ennemi) |
| `targeting` | `subject` = attaquant, `candidates` | `passive` : `targetPilot`, `targetLowestHp` ; Provocation |
| `damage` | source, `object` = victime, `value`, `cause` (`attack`, `counterattack`, `direct`, `bomb`…) | `passive` : `ignoreSmallHits`, `doubleVsPilots` |
| `counterattack` | `subject` = la `target` qui riposte, `object` = l'attaquant | À distance, `muteRiposte` |
| `attackResolved` | `subject` = attaquant, `object` = `target`, `targetKilled`, `subjectSurvives` | `attackSurvive`, `attackNoKill`, `pilotSurvives` |
| `survivesDamage` | `subject`, `cause` | `survive` (cause = attaque), `afterDamage` (toute cause) |
| `allyHit` | `subject` = l'allié touché, qui survit | `onAllyHit` |
| `death` | `subject`, `position`, `side` | `deathrattle`, `allyDeath`, `enemyDeath`, `allyPilotDeath`, `enemyPilotDeath` |
| `shieldGained` | `subject`, `charges` | `passive` : `shieldCharges` |
| `shieldLost` | `subject` | `shieldLost`, `allyShieldLoss` |
| `summon` | `subject` = le drone, source = l'invocateur | `onSummon` |
| `spaceAvailable` | `side` | `space` |
| `heal` | `object`, `value` | modificateur de soin des équipements |
| `powerTrigger` | `power`, `carrier` | Brouilleur quantique (voir 6.2) |
| `fatigue` | `level` | `FATIGUE_START` |
| `resolutionOrder` | `event`, `bands`, `direction`, `replays` | : (section 12.3) |
| `firstSide` | `side` (celui qui attaque en premier), `reason` (`moreServants`, `tie`) | : (aujourd'hui `cur = B.e.length > B.p.length ? 'e' : 'p'`) |

`spaceAvailable` est vérifié après chaque résolution (comme le `fillSpace` actuel), pas émis par une action.

### 5.2 Mission, renfort et méta-jeu

| Événement | Rôles | Ancien déclencheur |
|---|---|---|
| `startMission` | : | `startMission` |
| `startReinforcement` / `endReinforcement` | : | `startRenfort` / `endRenfort` |
| `deployed` | `subject` | `battlecry` |
| `cardAdded` | `subject`, `zone` | (fusion, modèle PR, Prophétie) |
| `offerGenerated` | `cards`, `size` | `firstOfferUp`, `firstEquipOffType`, `bigEquipOffer` |
| `activation` | `carrier`, `target` choisie | `active` (pouvoirs payants des lieutenants) |
| `fusion` | cartes fusionnées | : |
| `datacronsSpent` | cumul | `prophecy` |

## 6. Interceptions : comment les cas particuliers disparaissent

### 6.1 Principe

Une interception est un pouvoir dont `when.timing` vaut `before`. Ses actions peuvent utiliser trois actions spéciales :

- `cancel` : l'événement n'a pas lieu ;
- `modify { field, value }` : change un champ de l'événement (dégâts, charges, candidats) ;
- `replace { with: [actions] }` : joue autre chose à la place.

### 6.2 Exemples

| Cas actuel | Interception |
|---|---|
| Interface de vol neural (`ignoreSmallHits` 5) | avant `damage` (objet = porteur) · si `value < 5` → `cancel` |
| Défibrillateur portatif (`cheatDeath`) | avant `death` (sujet = porteur) · limite 1/combat → `replace` par `set hp = 1` |
| Tireur d'élite (`targetLowestHp`) | avant `targeting` (sujet = porteur) → `modify candidates` = ennemis de PV minimum, **avant** Provocation |
| Chasseur de frégates (`doubleVsPilots`) | avant `damage` (cause = attaque, source = porteur, objet de type Pilote) → `modify value ×2` |
| Maître-canonnier (`breakShield`) | avant `damage` (source = porteur, cause = attaque) → `removeShield` de la cible |
| Brouilleur quantique (`jamFirstStart`) | avant `powerTrigger` (événement = `startCombat`, porteur ennemi, pouvoir sans étiquette `replay` ni `jammer`) · limite 1/combat → `cancel` |
| Boussole stellaire (`firstOfferUp`) | avant `offerGenerated` (première du renfort) → `modify cards` : un serviteur remplacé par un serviteur du rang supérieur |
| Chef mécanicien (`droneAura`) | avant `summon` (source de mon camp, sujet étiqueté `drone`) → `modify stats +a/+h` |
| Protocole balistique (`droneRanged`) | avant `summon` (source = porteur) → `modify keywords += ranged` |

Les interceptions du **même événement** se résolvent par `priority` puis par position (section 12.3). Le brouillage n'agit qu'à un seul endroit : un effet annulé n'est jamais écrit dans le journal, donc il n'est pas rejouable (règle actuelle conservée).

### 6.3 Pouvoirs temporaires (remplacent les « marqueurs »)

Une action peut **poser un pouvoir sur une cible**, avec une durée et des paramètres capturés au moment de la pose. Cela couvre tout ce que le moteur code aujourd'hui avec un champ ad hoc :

| Cas actuel | Pouvoir posé |
|---|---|
| Bombe (`plantBombs`) | `when before attack (subject = carrier of power)` → `damage(carrier, n)` ; si `splash` : `damage(neighbors of carrier, n)` ; `remove this power` ; si le porteur est mort, `cancel` l'attaque. Affichage : icône et valeur (`n`). |
| Brouilleur synaptique (`muteRiposte`) | `when before counterattack (subject = carrier)` → `cancel` ; se retire après usage |
| Sceau pacificateur (`pacify`) | `when before attackTurn (subject = carrier)` → `cancel` ; se retire après usage |
| Renaissance donnée par Ysha (`grantRebirth`) | mot-clé `rebirth`, durée `reinforcement` |
| Récupération du Contrebandier (`scavenge`) | action `equip` à durée `combat` |
| Pouvoirs appris par Extracteur ou Adaptation | action `power { give }` à durée `combat` ou `mission` |

Les pouvoirs posés déclarent un champ `display` (icône, valeur) que l'interface lit.

## 7. Conditions

Toutes les conditions de `if` doivent être vraies. Elles peuvent aussi être imbriquées avec `not`, `or`.

| Condition | Rôle |
|---|---|
| `limit { per, max }` | Au plus `max` fois par `combat`, `reinforcement`, `mission` ou `game`. Le compteur est tenu automatiquement, par porteur (sauf `scope: "side"`, qui partage le compteur entre tous les exemplaires, pour « ne se cumule pas »). |
| `chance p` | Réussit avec la probabilité `p` (hasard de la graine). |
| `compare { a, op, b }` | Compare deux expressions (`<`, `<=`, `=`, `>=`, `>`). |
| `has { target, type / keyword / tag / power }` | La cible possède cette propriété. |
| `isAlive`, `onBoard` | État d'une cible. |
| `boardSpace { side }` | Le plateau n'est pas plein. |
| `phase` | Mission, renfort ou combat. |
| `everyN { n, of }` | `of` (par exemple la salle) est un multiple de `n`. |

## 8. Cibles (sélecteurs)

Un sélecteur dit **qui** est visé :

```json
{ "side": "enemy", "filter": { "type": "pilot" }, "pick": "random", "count": 1, "exclude": "carrier", "fallback": "carrier" }
```

| Champ | Valeurs |
|---|---|
| `side` | `ally`, `enemy`, `both` |
| `zone` | `board` (par défaut), `hand`, `catalog`, `lieutenants`, `boss` (le Boss lui-même, avec ses PV) |
| `filter` | `type`, `keyword`, `tag`, `equipped`, `rank`, `has power`, `alive` (par défaut) ; combinables avec `not` / `or` |
| `pick` | `all`, `random`, `leftmost`, `rightmost`, `ends`, `neighbors` (de l'élément de référence), `min(expr)`, `max(expr)` |
| `exclude` | `carrier` ou un sélecteur |
| `fallback` | Sélecteur utilisé si le résultat est vide (ex. : `buffRandomAlly` retombe sur le porteur s'il est seul) |
| `reference` | Une carte désignée par une référence nommée (ex. : le modèle PR, où qu'il soit) |

Raccourcis : `carrier`, `subject`, `object`, `source`, `chosen` (résultat d'un `choose`). Égalités (par exemple deux ennemis avec le même nombre de PV) : tirage au sort sur la graine, comme aujourd'hui.

## 9. Expressions (valeurs)

Partout où un nombre est attendu, on peut écrire un nombre ou une expression :

| Expression | Sens |
|---|---|
| `5` | Constante |
| `reinforcementLevel`, `room`, `datacrons`, `profile.<name>` | Variables de partie |
| `rank(c)`, `atk(c)`, `hp(c)`, `maxHp(c)` | Statistiques d'une cible |
| `count(selector)` | Nombre de cartes sélectionnées |
| `distinctTypes(selector)` | Nombre de types différents parmi la sélection (avec option `only: "species"`) |
| `counter(name, of)` | Valeur d'un compteur |
| `event.value` | Champ de l'événement en cours (par exemple les dégâts) |
| `sum`, `product`, `min`, `max`, `cap`, `floor`, `halfUp`, `halfDown` | Opérations |
| `roll { from, to }` | Entier tiré entre deux bornes |
| `weightedRoll { values, weight }` | Tirage dans un pool pondéré (le patch de Reyes : poids `7 − X`) |
| `bagDraw { bag, faces, copies }` | Tirage sans remise dans un sac qu'on remplit quand il est vide (le datacube) |
| `let { name, value }` | Variable locale, réutilisable dans les actions suivantes |

## 10. Actions

### 10.1 Statistiques, état, pouvoirs

| Action | Paramètres | Notes |
|---|---|---|
| `stats` | `target`, `atk`, `hp`, `duration` | Bonus ou malus. `hp` augmente aussi les PV max. ATQ plancher à 0. Durée par défaut selon la phase : `permanent` en renfort, `combat` en combat. |
| `set` | `target`, `stat` (`atk`, `hp`, `maxHp`), `value` | PV à 1, copie d'une statistique, répartition. |
| `swap` | `a`, `b`, `stats` | Échange de PV, ou d'ATQ et de PV. |
| `heal` | `target`, `value` ou `all` | Plafonné aux PV max. Interceptable (`heal`). |
| `damage` | `target`, `value`, `source`, `cause` | Passe par l'événement `damage` (Bouclier, Poison…). |
| `destroy` | `target` | Mort sans dégâts. |
| `shield` | `target`, `charges` | `charges` suit la règle `shieldGained`. |
| `removeShield` | `target` | |
| `keyword` | `target`, `keyword`, `give` ou `remove`, `duration` | |
| `power` | `target`, `give` ou `remove`, `power` ou `copyOf`, `duration`, `parameters` | Section 6.3. `copyOf` copie un pouvoir existant (Adaptation, Extracteur, Patch d'ingénieur). |
| `counter` | `on`, `name`, `delta` ou `set` | |
| `remember` | `name`, `value`, `on` | Référence nommée vers une carte ou une valeur. |

### 10.2 Plateau

| Action | Paramètres | Notes |
|---|---|---|
| `summon` | `template`, `side`, `position` (`rightOfCarrier`, `deathSlot`, `farRight`), `stats`, `tags` | Respecte la limite du plateau. Émet `summon`. |
| `resurrect` | `target` (une carte morte), `hp`, `position`, `keep` | Utilisé par Lazare, la ressuscitation et Renaissance. |
| `attack` | `attacker`, `target`, `noCounterattack`, `ranged` | Attaque `induced` : n'émet pas les effets d'Assaut, ne consomme pas de tour dans la file (Tir de couverture, tir préventif, `rightmostAttacksLeftmost`). |
| `equip` / `unequip` | `target`, `equipment` | |
| `cancel`, `modify`, `replace` | voir 6.1 | Interceptions seulement. |

### 10.3 Contrôle de flux

| Action | Paramètres | Notes |
|---|---|---|
| `forEach` | `selector`, `then` | Répète les actions pour chaque cible (chacune évalue ses propres expressions : Bombardement orbital tire un nombre par ennemi). |
| `repeat` | `times`, `then` | |
| `random` | `branches: [{weight, if, then}]` | Retient les branches dont `if` est vrai, puis tire selon `weight` (Garde de bord). |
| `let` | `name`, `value` | Variable locale. |
| `replay` | `query` sur le journal, `order` | Section 12.4. |
| `trigger` | `target`, `event` | Relance les pouvoirs d'une cible sur un événement donné (Waven relance un cri de guerre). |

### 10.4 Méta-jeu

| Action | Paramètres | Notes |
|---|---|---|
| `createCard` | `template` ou `draw` (sélecteur de catalogue), `zone` (`hand`, `board`), `count`, `overrides` (nom, statistiques, pouvoirs) | Main pleine : événement `cardAdded` annulé et message « perdu » (règle du noyau). |
| `drawCards` | `pool`, `count`, `rank` (`max` ou `exact`), `weight`, `noDuplicates` | Base de la génération d'une offre. |
| `choose` | `who` (`player` ou `ai`), `from` (liste ou tirage), `count`, `policy` (pour l'IA), `then` | Suspend la résolution pour un choix, hors combat seulement. Le résultat est disponible sous le nom `chosen`. |
| `datacrons` | `delta` | Plancher 0. |
| `reinforcementLevel` | `delta` | |
| `merge` | `cards` | Additionne les statistiques, double les pouvoirs selon la règle de doré (section 13), ouvre la récompense. |
| `nextRoom` | : | Passe à la salle suivante (augmente `room`). |
| `endGame` | `result` (`victory` ou `defeat`) | Termine la mission. |
| `profile` | `name`, `delta` | Met à jour le profil d'équipage conservé entre les missions (victoires du modèle PR). |
| `schedule` | `when`, `then` | Pose sur la partie un pouvoir temporaire (Prophétie : « quand 60 Datacrons sont dépensés → créer la carte »). |

## 11. Partie B : règles de partie en données (principes)

Les règles de partie sont des pouvoirs portés par une entité spéciale, la **partie**, sans interface propre :

- **Fusion** : `when cardAdded` · `if count(cards identical not gold) ≥ 3` · `then merge` puis `choose` la récompense.
- **Modèle PR** : `when deployed (subject of type nythe)` · `if no reference prModel` · `then createCard` (nom construit avec `profile.prWins`) puis `remember`. Les améliorations de `prBoost` ciblent `reference: prModel`.
- **Économie** : les revenus (`INCOME`), le prix du niveau (`levelCost`), le nombre de propositions (`renfortProposals`), `EQUIP_CHANCE`, `MIN_SERVANTS` et `FATIGUE_START` passent dans un fichier de **réglages** (tableaux et formules). Ils ne sont plus des constantes en dur.
- **Offre de renfort** : l'action `drawCards`, appelée par une règle `when playerAction "reinforcement"`, puis l'événement `offerGenerated` (interceptable).
- **IA du Boss** : `want`, `level`, `equipP`, `score` et `target` de `BOSS_BEHAVIORS` deviennent des **expressions** et des **sélecteurs**. Exemple : `score` du comportement « synergie » = `cardScore + 6 × sum over the card's types of count(board, type)`.

### 11.1 Règle de fin de combat (décidé le 10 novembre 2026)

Les dégâts de fin de combat (les survivants du camp gagnant frappent le Boss ou les lieutenants) sont une **règle de partie en données**, plus une fonction du moteur. Elle est portée par la partie et se déclenche sur `endCombat`. Aujourd'hui (`settleCombat`) :

| Cas | Comportement actuel | Règle de partie |
|---|---|---|
| Le joueur gagne | Chaque survivant du joueur inflige son **rang** au Boss ; le Boss à 0 PV ou moins est vaincu (victoire, le profil enregistre une victoire) | Q : `endCombat` · Si : `winner = player` · A : `forEach(survivors allies)` · `damage(Boss, rank(each))` ; Q : `death(subject Boss)` · A : `profile(prWins, +1)` puis `endGame(victory)` |
| Le Boss gagne | Chaque survivant du Boss frappe un lieutenant vivant : s'il y en a **un seul** avec Provocation, c'est lui ; sinon tirage au sort parmi les vivants. Un lieutenant avec Bouclier annule le premier coup. Les dégâts valent le **rang** du survivant. | Q : `endCombat` · Si : `winner = boss` · A : `forEach(survivors of Boss)` · `damage(lieutenant alive, rank(each))`, le choix du lieutenant passant par l'événement `targeting` |
| Les deux lieutenants tombent | Défaite | Q : `death(subject lieutenant)` · Si : `count(lieutenants alive) = 0` · A : `endGame(defeat)` |
| Égalité | Aucun dégât | Aucune règle ne répond |
| Dans tous les cas | La salle suivante commence | A : `nextRoom` (priorité `late`, après les dégâts) |

Le Bouclier et la Provocation d'un lieutenant (champ `kw`) sont les **mêmes mots-clés** que ceux des serviteurs (14.11) : il n'y a pas de règle spéciale pour eux. Le Bouclier du lieutenant se reforme à chaque combat (comme celui d'un serviteur).

**Provocation des lieutenants (tranché le 10 novembre 2026)** : la règle standard de Provocation des serviteurs s'applique (14.11). Avec plusieurs lieutenants qui ont Provocation, le tirage au sort se fait entre eux seulement. Le code actuel tire parmi tous les lieutenants vivants dès qu'il y a plus d'une Provocation ; aucun duo actuel n'est concerné, donc les tests d'équivalence ne devraient pas voir de différence.

Cela permet d'écrire sans toucher au moteur des variantes comme : « les survivants infligent leur rang +1 », « le Boss subit moitié moins de dégâts », ou « un lieutenant protège les autres ».

Cette partie sera détaillée dans un second temps (après validation de la partie A).

## 12. Le noyau : ce qui reste en code

Le noyau ne contient aucune règle de carte. Il fournit :

1. **L'interpréteur** : résolution des sélecteurs, des expressions, des conditions et des actions.
2. **La file d'événements** avec interceptions « avant » et « après », et le **journal**.
3. **La boucle de combat** : alternance des camps, file d'attaque (chaque serviteur à son tour de gauche à droite), arrêt quand un camp est vide, garde-fou de 3000 attaques. L'usure est un pouvoir de la partie, déclenché par `fatigue`.
4. **Les règles physiques** : un serviteur à 0 PV ou moins meurt ; les PV ne dépassent pas les PV max sauf effet explicite ; le plateau compte 7 cartes ; la main 7 (hors modèle PR, qui porte le drapeau `offHand`) ; une carte copie ses statistiques au début du combat et les rend intactes à la fin, sauf la **couche permanente**.
5. **La couche permanente** : tout effet à durée `permanent` pendant un combat est noté à part ; en fin de combat, il est appliqué à la vraie carte **si elle a survécu** (règle actuelle : `perm` et `permHp`).
6. **La graine aléatoire** (générateur déterministe, fourni par une seule fonction `rng()`).
7. **La couche dérivée** : après chaque résolution, le moteur recalcule les auras. Les statistiques et mots-clés visibles d'une carte sont : base, plus bonus permanents, plus bonus temporaires, plus auras. Seules les trois premières couches sont mémorisées.
8. **Les demandes de choix** : une file lue par l'interface (le `flushDiscover` actuel), et la politique de l'IA pour le Boss.

### 12.1 Ce que le noyau ne sait pas

Il ne connaît pas Bouclier, Poison, Provocation, Fureur, Renaissance, À distance, Bombe, drone, Pilote… tout cela est donné par des pouvoirs (sections 14.11 et 6.3).

### 12.2 Phases et choix

- En **combat**, aucune action `choose` n'est permise : le combat est automatique et déterministe.
- Les choix interactifs ont lieu en **renfort** et en **fin de combat** (Adaptation, découvertes, récompenses de fusion).

### 12.3 Ordre de résolution

**Décision du 10 novembre 2026 : l'ordre est une donnée, modifiable par des pouvoirs.** Il n'est plus codé en dur.

Quand plusieurs pouvoirs répondent au même événement, ils se résolvent selon quatre critères, dans cet ordre :

1. **La priorité du pouvoir** : `first` (−100), `normal` (0), `late` (+100), ou un nombre. Les rejeux sont `late`, donc ils passent après **tous** les effets d'origine, dans tous les camps (option B retenue).
2. **La bande** : le groupe de porteurs auquel le pouvoir appartient. Par défaut, pour un événement de début de combat : 1. pouvoirs du **Boss** ; 2. **plateau adverse** ; 3. **lieutenants** ; 4. **plateau allié**.
3. **Le sens** à l'intérieur de la bande : `leftToRight` par défaut, ou `rightToLeft`.
4. En cas d'égalité parfaite (même bande, même position), l'ordre d'apparition dans la carte.

Les bandes sont **absolues** (joueur ou Boss), pas relatives au porteur : « plateau adverse » veut dire le plateau du Boss, « plateau allié » celui du joueur.

#### Réglage par défaut

```json
{ "order": {
    "default": { "bands": ["boss", "opponent", "lieutenants", "ally"], "direction": "leftToRight", "replays": "afterAll" },
    "startCombat": {}
} }
```

Le réglage **`legacy`** reproduit le code actuel : bandes `["boss", "ally", "lieutenants", "opponent"]`, `replays: inBand`. Il n'existe que pour la migration.

Un événement peut surcharger le défaut (un champ `order` propre à `death`, par exemple). `replays` vaut `afterAll` (option B) ou `inBand` (comportement historique, gardé uniquement pour les tests d'équivalence de la migration).

#### Influer sur l'ordre

Avant chaque résolution simultanée, le moteur émet l'événement `resolutionOrder` (avec les champs `bands`, `direction`, `replays`). Il est **interceptable** comme les autres : un pouvoir peut le modifier avec `modify`. C'est ce qui permet à une carte de dire, par exemple :

| Effet voulu | Pouvoir |
|---|---|
| « Vos effets de début de combat se jouent en premier » | avant `resolutionOrder` (événement `startCombat`) → `modify bands` : `ally` en tête |
| « Les effets se jouent de droite à gauche » | avant `resolutionOrder` → `modify direction = rightToLeft` |
| « Notre camp agit avant le Boss » (effets de début de combat) | avant `resolutionOrder` → `modify bands` : `ally` en première position, avant même les pouvoirs du Boss |
| « Notre camp attaque toujours en premier » | avant `firstSide` → `modify side = player` (variante : `if reason = tie` pour ne jouer que les égalités) |
| « Cet effet se joue avant tous les autres » | `priority: first` sur le pouvoir lui-même (pas besoin d'intercepter) |
| « Les effets adverses se jouent en dernier » | avant `resolutionOrder` → `modify bands` : `opponent` en dernière position |

Si plusieurs pouvoirs modifient l'ordre, ils s'appliquent par priorité puis par bande **de l'ordre par défaut** (les pouvoirs qui modifient l'ordre ne se réordonnent pas eux-mêmes). Une modification vaut pour le combat en cours ; on peut aussi la poser avec une `duration`.

#### Conséquence sur l'équilibrage

Ce nouvel ordre change le jeu : les effets du joueur se jouent désormais **après** ceux du Boss. Les effets d'affaiblissement du joueur (Maître espion, Spectre, Intrus réseau…) voient donc les bonus du Boss déjà appliqués. Avec l'ordre actuel, c'est l'inverse. La migration se fait donc en **deux temps** (section 17) : d'abord avec le réglage historique pour prouver l'équivalence, ensuite changement du réglage par défaut dans un commit séparé, suivi d'une passe d'équilibrage.

### 12.4 Le journal et `replay`

Chaque pouvoir exécuté est écrit dans le journal avec : porteur, événement, rôles, camp, étiquettes, `replayable` (faux si le pouvoir porte l'étiquette `non-replayable`), numéro d'ordre. Les requêtes de `replay` sont :

| Requête | Utilisée par |
|---|---|
| `first { event: startCombat, side: ally, without: [replay] }` | Duplicateur d'impulsion |
| `from { neighbors of carrier, event: startCombat, without: [replay] }` | Orateur impérial |
| `all { event: death, side: ally, alreadyPlayed }` | AL-11 (`replayRattles`) |
| `from { target, event: deployed }` | Waven (`triggerBattlecry`) |

Un pouvoir rejoué porte l'étiquette `replay` pour ne pas être lui-même rejoué ni brouillé.

## 13. Règle du doré

Aujourd'hui `goldSkill` double tous les nombres, avec trois exceptions codées en dur (`shieldCharges` et `addUnavailableEquip` gagnent 1, `bigEquipOffer` passe à 2 fois). Dans le nouveau modèle, **c'est le schéma de chaque paramètre d'action** qui déclare sa règle de doré :

| Règle | Sens |
|---|---|
| `×2` (défaut pour une quantité) | Le nombre est doublé |
| `+1` | Le nombre gagne 1 |
| `=` | Inchangé |
| `{value: V}` | Valeur fixée pour le doré |

Les paramètres qui ne sont pas des quantités (positions, durées, rangs lus dans une expression) valent `=`. Une expression garde sa forme ; seules ses constantes se doublent.

## 14. Correspondance : chaque ancien `fx` → brique

Notation abrégée : `Q` = quand (`when`), `Si` = conditions (`if`), `A` = actions (`then`). Les cibles s'écrivent en clair (« alliés hors porteur »). Les cases « ✓ » sont des briques déjà prévues sans ajout ; les remarques signalent les points à surveiller pendant la migration.

### 14.1 Bonus et malus de statistiques

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `buffSelf` | A : `stats(carrier, +a/+h)` ✓ |
| `buffAllies` | A : `stats(allies except carrier, +a/+h)` ✓ |
| `buffAllAllies` | A : `stats(allies, +a/+h)` ✓ |
| `buffRandomAlly` | A : `stats(ally random except carrier, fallback: carrier)` ✓ |
| `buffLeftmost`, `buffRightmost`, `buffEnds` | A : `stats(ally leftmost / rightmost / ends)` ✓ |
| `buffAdjacent` | A : `stats(neighbors of carrier)` ✓ |
| `buffEquippedAlly` | A : `stats(ally equipped random except carrier)` ✓ |
| `buffPilots` | A : `stats(allies of type pilot except carrier, duration phase)` ✓ |
| `buffPerType` | A : `stats(carrier, ×min(3, distinctTypes(allies)))` ✓ |
| `buffPerTypeUncapped` | A : `stats(carrier, ×distinctTypes(allies))` ✓ |
| `buffPerSpecies` | A : `stats(carrier, ×distinctTypes(allies, species))` ✓ |
| `buffPerEnemyType` | A : `stats(carrier, ×distinctTypes(enemies))` ✓ |
| `buffAlliesPerIntel` | A : `stats(allies, ×count(allies intelligence))` ✓ |
| `atkPerAllyPilot` | A : `stats(carrier, atk × count(allies pilot))` ✓ |
| `buffPilotsPerEnemyPilot` | A : `stats(allies pilot, ×count(enemies pilot))` ✓ |
| `buffAdjacentPerType` | A : `stats(neighbors, ×distinctTypes(allies), duration permanent)` ✓ |
| `buffPerEquip` | A : `stats(carrier, × number of equipment of allies)` ✓ (non utilisé aujourd'hui) |
| `doubleLowestHp` | A : `stats(ally HP minimum random, hp + hp(target))` ✓ |
| `doubleLeftmostHp` | Si : `not has(target, power 'doubled')` (compteur partagé par le camp) · A : `stats(ally leftmost, hp + hp(target))` puis `power(target, give marker 'doubled', combat)` ✓ |
| `trade` | A : `stats(carrier, atk −min(n, atk), hp +h)` ✓ |
| `permAtk` | Q : `survivesDamage(subject carrier, cause attack)` · A : `stats(carrier, +a ATK, permanent)` ✓ |
| `permAtkNoKill` | Q : `attackResolved(subject carrier)` · Si : `targetKilled = false` · A : `stats(carrier, +a ATK, permanent)` ✓ |
| `pilotGrows` | Q : `attackResolved(subject ally pilot, subjectSurvives)` · A : `stats(subject, +a ATK, permanent)` ✓ ; le gain se répète par porteur vivant (chaque porteur réagit) |
| `permStats` | Q : `death(subject enemy pilot)` · A : `stats(carrier, +a/+h, permanent)` ✓ |
| `permAlliesStats` | Q : `endCombat` · A : `stats(survivors allies, +a/+h, permanent)` ✓ |
| `buffSummoned` | Q : `summon(source ally)` après · A : `stats(subject, +a/+h)` ✓ |
| `buffChosenAlly` | A : `choose(player, allies except carrier)` puis `stats(chosen, +a ATK, permanent)` ; le Boss : `policy random` ✓ |
| `copyHighestAtk` | A : `set(carrier, atk, max(atk of other allies))` ✓ |
| `gainHighestHp` | A : `set(carrier, hp and maxHp, max(hp of other allies))` ✓ |
| `debuffRandomEnemy` | A : `stats(enemy random, −n ATK)` ✓ |
| `debuffLeftmost` | A : `stats(enemy leftmost, −n ATK)` ✓ |
| `debuffByLevel` | A : `stats(enemy random, −reinforcementLevel ATK)` ✓ |
| `debuffAttacker` | Q : `attack(before, subject enemy)` · A : `stats(subject, −(n otherwise rank(carrier)) ATK)` ✓ |
| `muteRiposte` | A : `power(enemy ATK max random, give "no counterattack on first hit")` (6.3) ✓ |
| `pacify` | A : `power(enemy ATK max random, give « skips its first turn »)` (6.3) ✓ |

### 14.2 Échanges et valeurs fixées

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `hpRightmostTo1` | A : `set(enemy rightmost, hp, min(hp, 1))` ✓ |
| `swapStatsMostHp` | A : `swap(enemy HP max, atk ↔ hp)` puis `set maxHp = hp` ✓ |
| `swapHpLeftmost` | A : `swap(carrier, enemy leftmost, hp and maxHp)` ✓ |
| `swapHpExtremes` | A : `swap(enemy HP min, enemy HP max, hp and maxHp)` ✓ (non utilisé aujourd'hui) |
| `balanceLeftHp` | A : `let total = hp(carrier)+hp(neighbor left)` ; `set(neighbor, hp, halfDown(total))` ; `set(carrier, hp, total − halfDown(total))` ; idem pour pvMax ✓ |

### 14.3 Dégâts

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `dmgRandomEnemy` | A : `damage(enemy random, n)` ✓ |
| `dmgAllEnemiesRange` | A : `forEach(enemies)` · `damage(each, roll(a, n))` ✓ |
| `dmgOwnAtk` | Q : `death(subject carrier)` · A : `damage(enemy random, atk(carrier))` ✓ |
| `dmgAttacker` | Q : `attack(before, subject enemy)` · A : `damage(subject, rank(carrier))` ; si le sujet meurt, il n'attaque pas (le noyau annule l'attaque d'un attaquant mort) ✓ |
| `preemptShot` | Q : `attack(before, subject enemy)` · Si : `limit 1/combat` · A : `attack(carrier → subject, ranged, noCounterattack)` ✓ |
| `discordApple` | A : `let a = enemy HP min random` ; `damage(enemy random except a, atk(a), source a)` ✓ |
| `rightmostAttacksLeftmost` | A : `attack(enemy rightmost → enemy leftmost)` (riposte normale, origine induite) ✓ |
| `wildSwing` | Q : `attack(after, subject carrier)` · Si : `chance 0,5` · A : `random` entre (1) `damage(neighbor of the enemy target, atk×2)` si au moins un voisin ennemi, (2) `damage(neighbor ally of carrier, atk)` si au moins un voisin allié ; poids égaux, repli sur l'autre ✓ |
| `coverFire` | Q : `attack(after, subject carrier)` · A : `attack(ally to right of carrier → same target if alive, otherwise enemy random, ranged, noCounterattack)` ✓ |
| `breakShield` | voir 6.2 (interception de `damage`) ✓ |
| `doubleVsPilots` | voir 6.2 ✓ |
| `ignoreSmallHits` | voir 6.2 ✓ |
| `plantBombs` | A : `repeat(a)` · `power(enemy random without bomb, give Bomb(n, splash false))` ✓ |
| `plantSplashBomb` | A : `power(enemy random, give Bomb(n, splash true))` ✓ |
| `accumulate` | Q : `shieldLost(subject ally)` · A : `counter(carrier, accumulated, +reinforcementLevel)` ✓ |
| `releaseAccum` | Q : `death(subject carrier)` · A : `damage(enemy random, counter(accumulated))` ✓ |

### 14.4 Soins, Bouclier, mort

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `healSelf` | Q : `survivesDamage(subject carrier)` · A : `heal(carrier, n)` ✓ |
| `healLeftmost` | Q : `attack(subject carrier)` · A : `heal(ally leftmost, n)` ✓ |
| `healAllies` | A : `heal(allies wounded, n)` ✓ |
| `healAttacked` | Q : `allyHit` · A : `heal(subject, n)` ✓ |
| `healLastSurvivor` | Deux pouvoirs : (1) Q : `survivesDamage(subject ally)` → `remember(carrier, lastSurvivor, subject)` ; (2) Q : `attackTurn(before, subject carrier)` → `replace` par `heal(reference lastSurvivor, all)` ✓ |
| `grantShieldAlly` | A : `shield(ally random)` ✓ |
| `shieldLowestHp` | A : `shield(ally HP min random)` ✓ |
| `shieldSelfOnce` | Q : `survivesDamage(subject carrier)` · Si : `limit 1/combat` · A : `shield(carrier)` ✓ |
| `shieldCharges` | Q : `shieldGained(before, subject carrier)` · A : `modify charges = n` ✓ |
| `regenShield` | Q : `shieldLost(subject ally)` · Si : `limit n/combat` · A : `shield(subject)` ✓ (voir risque R1) |
| `stripShield` | A : `removeShield(enemy with shield random)` ✓ |
| `stripProv` | A : `keyword(enemies, taunt, remove)` ✓ |
| `stripProvLowestHp` | A : `keyword(enemy HP min random, taunt, remove)` ✓ |
| `furyAdjacentPilots` | A : `keyword(neighbors of type pilot, fury, give)` ✓ |
| `grantRebirth` | `activation` : `keyword(target, rebirth, give, duration reinforcement)` ✓ |
| `cheatDeath` | voir 6.2 ✓ |
| `resurrect` | Q : `death(after, subject ally without rebirth)` · Si : `limit n/combat`, `boardSpace` · A : `resurrect(subject, max hp, position deathSlot, keep current stats)` ✓ (non utilisé aujourd'hui) |
| `lazarus` | Q : `death(after, subject ally non-drone)` · Si : `count(allies tagged drone) ≥ 1`, sujet sans Renaissance ni `noResurrection` · A : `destroy(a drone ally)` puis `resurrect(subject, max hp, deathSlot)` ✓ ; priorité après `resurrect` |
| `extractRoutines` | Q : `death(after, subject ally tagged drone with powers)` · A : `power(drone ally random, copyOf powers of subject, duration combat)` ✓ |
| `scavenge` | Q : `death(after, subject enemy)` · A : `equip(carrier, equipment random of subject, duration combat)` ✓ |

### 14.5 Invocation et drones

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `summon` | A : `summon(template Drone, stats a/h, position rightOfCarrier or deathSlot)` ✓ ; les bonus de drone (équipements, Chef mécanicien, bonus de mission) sont des interceptions de `summon` (6.2) |
| `droneAura` | Aura : actif tant que le porteur est en jeu · cible : drones alliés · `stats(+a/+h)` (section 4.1). En phase d'équivalence : interception de `summon` (6.2) ✓ |
| `droneRanged` | voir 6.2 ✓ |
| `swarmResonance` | Q : `attack(before, subject ally tagged drone)` · A : `stats(allies tagged drone, +a ATK, combat)` ✓ |
| `droneBoostGame` | A : `counter(game, bonusDroneA, +a)` et `counter(game, bonusDroneH, +h)` ; `stats(drones of board, +a/+h, permanent)` ✓ |
| `droneBonus` | Q : `endCombat` · A : mêmes compteurs que ci-dessus ✓ ; l'interception de `summon` lit ces compteurs |
| `genDroide` | Q : `startReinforcement` · Si : `room = n` · A : `createCard(draw servant of type droid, hand)` ✓ |

### 14.6 Mots-clés et règles de ciblage

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `targetPilot` | Q : `targeting(before, subject carrier)` · Si : `count(candidates of type pilot) ≥ 1` · A : `modify candidates = those of type pilot` ✓ |
| `targetLowestHp` | Q : `targeting(before, subject carrier)` · A : `modify candidates = candidates HP min` ✓ (avant Provocation) |
| Provocation (mot-clé) | voir 14.11 |

### 14.7 Rejeu et brouillage

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `replayFirstStart` | `priority late`, étiquette `replay` · Q : `startCombat` · A : `replay(first startCombat of side, without replay)` ✓ |
| `replayAdjacentStart` | `priority late`, étiquette `replay` · A : `replay(startCombat of neighbors of carrier, without replay)` ✓ |
| `replayRattles` | Q : `death(subject carrier)` · A : `replay(all death of side already played)` ✓ (non utilisé aujourd'hui) |
| `jamFirstStart` | étiquette `jammer` ; voir 6.2 ✓ |
| `triggerBattlecry` | `activation` : `trigger(target, deployed)` ✓ |

### 14.8 Équipements, découvertes, offres (méta-jeu)

| Ancien `fx` | Nouveau pouvoir |
|---|---|
| `gainEquip` | A : `createCard(draw equipment of rank = reinforcementLevel, hand)` ✓. En Râle d'agonie la carte arrive au prochain renfort : `schedule(startReinforcement, createCard…)` |
| `gainDossier`, `creeUnite` | A : `createCard(template ConsularFile / MaintenanceUnit, hand)` ✓ |
| `gainUnavailableEquip` | A : `repeat(n)` · `createCard(draw equipment rank 3-4, type absent from the team, hand)` ✓ |
| `gainAnyEquip` | A : `repeat(n)` · `createCard(draw equipment rank 5-6, all types, hand)` ✓ |
| `addUnavailableEquip` | Q : `startReinforcement` · A : `createCard(draw equipment rank n, type absent from the team, hand)` ✓ ; doré : rang +1 |
| `equipUnavailable` | Q : `endCombat` · A : `equip(carrier, draw equipment rank n, type absent from the team)` ✓ |
| `equipKit` | A : `equip(ally random, equipment « ReinforcementKit » of rank = reinforcementLevel)` ✓ (non utilisé aujourd'hui) |
| `discoverEquip` | A : `choose(player, draw of 3 equipment of rank n, type absent from the team)` puis `createCard(chosen, hand)`; Boss : ne fait rien (`policy none`) ✓ |
| `bigEquipOffer` | Q : `offerGenerated(before, next equipment offer)` · Si : `limit times/reinforcement` · A : `modify size = n` ✓ ; doré : `times = 2` |
| `firstOfferUp` | voir 6.2 ✓ (portée de la limite : camp) |
| `firstEquipOffType` | Q : `offerGenerated(before, first of reinforcement)` · Si : `chance n %` (cumulable) · A : `modify cards` : premier équipement remplacé par un équipement d'un type absent de l'équipe, rang ≤ max ✓ |
| `forgeRoboticien` | Q : `startReinforcement` · Si : `everyN(n, room)` · A : `createCard(draw equipment type roboticist, all ranks, hand)` ✓ |
| `forgePatch` | Q : `startReinforcement` · Si : `everyN(n, room)` · A : `let p = draw of power (powers of servants of rank ≤ reinforcementLevel, without tag non-copyable)` puis `createCard(template Patch, overrides: powers [copyOf p], rank reinforcementLevel)` ✓ |
| `datacube` | Q : `startReinforcement` · A : `datacrons(bagDraw(datacube, faces, 2 copies))` ✓ |
| `prophecy` | Q : `startMission` · A : `choose(player, 3 servants of rank 7)`, `schedule(datacronsSpent ≥ 60, createCard(chosen, hand))` ✓ ; si la main est pleine, la carte attend (règle du noyau : `createCard` reste en attente) |
| `prBoost` | Q : `startReinforcement` · A : `stats(reference prModel, +a/+h)` ✓ |
| `prPersist` | Mot-clé de la carte : drapeaux `persistentWounds`, `permanentDeath`, `noResurrection`, `offHand` ✓ |
| `completeFusion` | `activation` (coût en Datacrons, répétable) : `createCard(copy of the target, hand)` puis déclenche la règle de fusion ✓ |
| `adapt` | Q : `endCombat` · Si : porteur survivant de type Elk · A : voir 14.9 |
| `adaptExtra` | Étiquette `adaptation-extra` : augmente le nombre de choix d'Adaptation du porteur (voir 14.9) |

### 14.9 L'Adaptation

```json
{ "tags": ["adaptation"],
  "when": { "event": "endCombat" },
  "if": [ { "has": { "target": "carrier", "survivor": true } } ],
  "then": [
    { "action": "repeat", "times": { "sum": [1, { "count": { "powers": { "of": "carrier", "tag": "adaptation-extra" } } }] },
      "then": [
        { "action": "choose", "who": "player", "count": 1, "from": [
            { "draw": "stat", "value": "reinforcementLevel", "stat": { "random": ["atk", "hp"] } },
            { "draw": "power", "in": { "powers": { "of": { "side": "ally", "survivor": true, "exclude": "carrier" },
                                                           "without": ["battlecry", "adaptation", "adaptation-extra", "already-owned-by-carrier"] } },
              "unique": true }
        ],
          "then": [ { "action": "applyChoice" } ] }
      ] }
  ]
}
```

Le deuxième choix et les suivants ne proposent pas deux fois le même pouvoir (`unique: true` à l'intérieur de la répétition). Les mots-clés de l'équipe comptent aussi comme pouvoirs apprenables (ils sont des pouvoirs, section 14.11).

### 14.10 Pouvoirs de lieutenant, de Boss et règles de partie

| Origine | Nouveau pouvoir |
|---|---|
| Rol Vex (`regenShield` n=1) | porté par le lieutenant ; Q : `shieldLost(subject ally)` · limite 1/combat ✓ |
| ZC-D9 (`creeUnite`) | voir 14.8 ✓ |
| Flam'Gruk (`datacube`) | voir 14.8 ✓ |
| TE-5T (`genDroide` salle 5) | voir 14.5 ✓ |
| Brokk'Ric (`forgePatch` n=3) | voir 14.8 ✓ |
| Reyes (`forgeRoboticien` n=2) | voir 14.8 ✓ |
| Zel Iris (`debuffByLevel`) | voir 14.1 ✓ |
| Hal Ana (`prophecy`) | voir 14.8 ✓ |
| Ysha (`grantRebirth`) | voir 14.4 ✓ |
| Sulseye (`completeFusion`) | voir 14.8 ✓ |
| Waven (`triggerBattlecry`) | voir 14.7 ✓ |
| Amber | aucun pouvoir pour l'instant |
| Lieutenant avec Provocation ou Bouclier (champ `kw`) | mots-clés du lieutenant, lus par la règle de fin de combat (14.11) |
| Régénération (Reine-Mère) | Pouvoir du Boss : Q : `attack(after)` · A : `heal(servants of Boss, 2)` ✓ |
| Surcharge (Oméga) | Bande Boss, Q : `startCombat` · A : `stats(Boss servants, ×⌊(room−1)/3⌋)` ✓ |
| Écho (Oracle) | Q : `attack(before, subject of Boss)` · A : `stats(subject, +1 ATK)` ✓ |
| Blindage (Grumm) | Bande Boss, Q : `startCombat` · A : `stats(servants of Boss, +0/+3)` ✓ |
| Croissance du mini-boss | Q : `startReinforcement` · A : `stats(carrier, +1/+1)` ✓ |
| Usure | pouvoir de la partie : Q : `attack` · Si : `attacks ≥ FATIGUE_START` · A : `fatigue` puis `damage(all, fatigue level)` ✓ |
| Fin de combat (dégâts au Boss ou aux lieutenants) | règle de partie (11.1) ✓ |

### 14.11 Mots-clés (aujourd'hui câblés dans la boucle de combat)

| Mot-clé | Nouveau pouvoir |
|---|---|
| **Provocation** | Q : `targeting(before, subject on the opposing side)` · Si : `count(candidates with taunt) ≥ 1` · A : `modify candidates = those with taunt` ; priorité plus basse que `targetPilot` et `targetLowestHp` |
| **Bouclier** | Q : `damage(before, object carrier)` · Si : `charges > 0` · A : `cancel`, `counter(charges, −1)` ; si `charges = 0` alors l'événement `shieldLost` est émis |
| **Poison** | Q : `damage(after, source carrier)` · Si : `effective value > 0` · A : `destroy(object)` |
| **Renaissance** | Q : `death(before, subject carrier)` · Si : `limit 1/combat`, `boardSpace` · A : `replace` par `resurrect(subject, hp 1, position farRight, without temporary keywords)` |
| **À distance** | Q : `counterattack(before, object carrier)` · A : `cancel` |
| **Fureur** | Q : `attackResolved(subject carrier, subjectSurvives)` · Si : `origin = normal` · A : `attack(carrier → same targeting rule)` (le second coup ne redonne pas Fureur) |

### 14.12 Cas non utilisés par les données mais présents dans le moteur

`buffLeftmost`, `buffEnds`, `buffPerEquip`, `buffPerType`, `equipKit`, `resurrect`, `replayRattles`, `swapHpExtremes`, `cyberPatch` : tous ont un équivalent direct dans les briques précédentes (voir ci-dessus). Ils ne seront pas migrés un par un : on migre seulement ce qui est utilisé.

## 15. Risques et points à surveiller

| N° | Risque | Mesure |
|---|---|---|
| R1 | Le Bouclier se vérifie aujourd'hui **après chaque image** (`checkShields`, par comparaison avec `hadShield`). En événements, `shieldLost` est émis au moment du coup : l'ordre des effets peut changer dans quelques cas limites. | Tests d'équivalence à graine fixe ; ajuster si un écart apparaît |
| R2 | Plusieurs pouvoirs en réponse à `death` s'enchaînent dans un ordre précis (Défibrillateur, Râles, Lazare, Renaissance…). | Table de priorités explicite par événement, documentée avec les tests |
| R3 | Boucles infinies de déclenchements (rejeu qui provoque un rejeu). | Profondeur maximale de déclenchement, étiquette `replay`, validation dans l'éditeur |
| R4 | ~~Le moteur appelle `Math.random()` partout.~~ **Réglé le 10 novembre 2026** : toute la logique des règles passe par `rng()` (`prototype/data.js`), avec une graine propre au jeu (`setSeed(n)`). Les animations gardent leur `Math.random`. | Vérifié par `node tools/fingerprint.js 400 --strict` : `Math.random` lève une erreur et le hash reste `e0588896` |
| R5 | Texte généré parfois maladroit pour les pouvoirs composés (DE-D0, Garde de bord, Adaptation). | Champ `text` manuel autorisé ; les tests vérifient que chaque pouvoir a un texte |
| R6 | Les pouvoirs sont copiés au début du combat (les serviteurs sont des copies) : les compteurs `limit` doivent y être remis à zéro. | La portée `combat` est remise à zéro par le noyau au début du combat |

## 16. Décisions à prendre ensemble

1. ~~**Bandes d'ordre du début de combat**~~ **Tranché le 10 novembre 2026** : rejeux après tous les effets d'origine (option B) ; ordre par défaut Boss, plateau adverse, lieutenants, plateau allié ; ordre et sens modifiables par des pouvoirs (12.3).
2. ~~**Aura continue**~~ **Tranché le 10 novembre 2026** : ajoutée dès maintenant au modèle (section 4.1), avec le Chef mécanicien comme premier cas d'essai.
3. ~~**Dégâts au Boss et aux lieutenants**~~ **Tranché le 10 novembre 2026** : règle de partie en données (11.1).
4. ~~**Texte généré**~~ **Tranché le 10 novembre 2026** : texte généré à partir de modèles de phrases par brique, avec remplacement manuel possible (champ `text`) ; un test liste les textes remplacés à la main (section 18).
5. ~~**Format de stockage**~~ **Tranché le 10 novembre 2026** : un fichier JSON par catégorie de carte, chargé par le serveur local, pensé pour être étendu par des mods (section 19).

## 17. Plan de migration

0. **Passe de renommage** (section 20) : tout le code existant et les données passent en anglais, sans changement de comportement ; création de `data/i18n/fr.json` et `en.json` ; le test de non-perte des noms (20.6) doit passer.
1. **Fondations** (sans changer le jeu) : ~~graine aléatoire (`rng()`)~~ **fait** ; ~~harnais de comparaison~~ **fait** (`tools/fingerprint.js`, `tools/check-names.js`, pages générées) ; **reste** : le journal d'événements structuré (les `say(...)` du moteur deviennent des entrées `{ type, … }` traduites par l'interface, section 20.4).
2. **Noyau** : file d'événements, interceptions, interpréteur, schéma JSON des briques. Construit à côté de l'ancien moteur.
3. **Migration par familles** (avec le réglage d'ordre `legacy`, section 12.3), de la plus simple à la plus complexe : 14.1 (bonus) → 14.3 et 14.4 (dégâts, soins) → 14.5 (invocation) → 14.11 (mots-clés) → 14.6 et 14.7 (ciblage, rejeu) → 14.8 et 14.9 (méta-jeu, Adaptation) → 14.10 (lieutenants, Boss). À chaque étape, les tests d'équivalence doivent passer.
4. **Éditeur** : page du site qui lit le schéma des briques, génère le texte en direct et teste un pouvoir sur un mini-plateau. Peut commencer dès l'étape 2.
5. **Changement d'ordre** : passage du réglage par défaut à Boss, plateau adverse, lieutenants, plateau allié (commit séparé), puis passe d'équilibrage.
6. **Essai des auras** : le Chef mécanicien passe de l'interception à l'aura (comportement différent : le bonus disparaît avec lui).
7. **Nettoyage** : suppression du `switch` de `applyFx`, de `skDesc`, de `goldSkill`, de `TRIG_KIND` et des cas particuliers.

## 18. Texte des pouvoirs (décidé le 10 novembre 2026)

La description d'un pouvoir est **générée** à partir de ses briques. Elle remplace `skDesc`.

- **Modèles de phrases** : chaque événement, condition, sélecteur et action déclare dans son schéma un modèle de phrase **par langue** (`fr` et `en`), avec des trous (`{target}`, `{atk}`, `{hp}`…). Le texte d'un pouvoir est l'assemblage : « *{événement}* : *{actions}* » avec les conditions en incise.
- **Accords** : singulier et pluriel, masculin et féminin, élision (« l'allié », « à l'ennemi »), nombres écrits (« une bombe », « 2 bombes ») sont gérés par le générateur de chaque langue, pas par chaque modèle.
- **Deux langues dès la première version** : chaque brique a ses phrases françaises **et** anglaises. Le français est la langue de référence, relue et validée ; l'anglais est écrit en même temps mais relu plus tard (section 20.3).
- **Remplacement manuel** : le champ `text` d'un pouvoir (un texte par langue), s'il est rempli, remplace le texte généré. Il sert aux cas où l'assemblage est maladroit (DE-D0, Garde de bord, Adaptation).
- **Contrôle** : un test liste tous les pouvoirs dont le texte est écrit à la main, et signale tout texte manuel dont le pouvoir a été modifié depuis (il peut ne plus correspondre). Un autre test vérifie que tout pouvoir a un texte non vide.
- **Doré** : le texte de la carte dorée est généré à partir des valeurs dorées, sans texte manuel supplémentaire.
- **Regroupement** : les pouvoirs identiques d'une carte sont fusionnés en « ×N », comme `powersOf` le fait aujourd'hui.

## 19. Stockage des données (décidé le 10 novembre 2026)

### 19.1 Organisation

```
data/
  schema/bricks.json       # all bricks: parameters, phrase templates (fr, en), gold rule
  servants.json
  equipment.json
  lieutenants.json
  dungeons.json            # bosses, mini-bosses and their powers
  rules.json               # game rules, resolution order settings, economy (part B)
  keywords.json            # taunt, shield, poison, rebirth, ranged, fury
  i18n/
    fr.json                # names, type names, keyword names, interface texts
    en.json
```

- Chaque carte est référencée par son **UUID** (les mêmes que `IDENTIFIANTS`). Le nom reste une étiquette. Les illustrations et l'historique des tests continuent donc de fonctionner.
- Un fichier est un objet `{ "version": N, "cards": { "<uuid>": { ... } } }`. Le champ `version` est celui du **schéma** : si le schéma change, un outil de migration réécrit les fichiers.
- `data.js` ne garde que ce qui n'est pas de la donnée de carte. Les constantes de jeu (`MAX_BOARD`, `INCOME`, `FATIGUE_START`…) passent dans `rules.json` au fil de la partie B.

### 19.2 Chargement

- **Navigateur** : le prototype charge les fichiers par `fetch` depuis le serveur local (`tools/local-server.js`). L'ouverture directe de `prototype.html` en `file://` ne fonctionne plus, car les navigateurs refusent de lire des fichiers locaux ; le serveur local devient la façon normale de lancer le jeu.
- **Node** (`simulate.js`, `balance.js`, `export-cards.js`, `load-game.js`…) : lecture directe avec `fs`. Un module unique `data/loader.js` sert aux deux mondes pour que la lecture, la validation et l'assemblage ne soient écrits qu'une fois.
- **Validation au chargement** : chaque pouvoir est vérifié contre `schema/bricks.json` (brique inconnue, paramètre manquant, UUID inconnu, cycle de déclenchement). Le jeu refuse de démarrer sur une erreur de données, comme il le fait déjà pour un UUID manquant.

### 19.3 Mods

Les fichiers ci-dessus forment le **contenu de base**. Un mod est un dossier de même forme, posé dans `data/mods/<name>/` :

```
data/mods/<name>/
  mod.json                 # name, author, version, targeted schema version, dependencies
  servants.json            # same files as the base, all optional
  equipment.json
  i18n/fr.json             # mod texts, same format as the base
  ...
```

| Règle | Détail |
|---|---|
| Ajout | Une carte avec un **nouvel UUID** s'ajoute au catalogue. |
| Remplacement | Une carte avec l'UUID d'une carte existante la remplace entièrement. |
| Modification partielle | Un fragment `{ "<uuid>": { "$patch": { "path": value } } }` change un champ sans réécrire la carte. |
| Suppression | `{ "<uuid>": null }` retire la carte du catalogue. |
| Briques nouvelles | Un mod peut apporter des briques du **schéma** (une action nouvelle) seulement si elles s'assemblent à partir des briques existantes. Une brique qui demande du code n'est pas permise à un mod. |
| Ordre | Base, puis mods dans l'ordre de `mods.json`. Le dernier gagne. |
| Sécurité | Un mod ne contient que des **données**, jamais de code exécutable. Les pouvoirs sont des briques interprétées par le moteur ; c'est ce qui rend les mods sûrs. |

Les illustrations d'un mod sont dans `data/mods/<name>/images/<category>/<uuid>.webp`. Le modèle d'identifiants par UUID évite les conflits de noms entre mods.

### 19.4 Conséquences sur le plan de migration

L'étape 2 (noyau) produit `data/schema/bricks.json` et `data/loader.js`. L'étape 3 (migration par familles) écrit en parallèle les JSON, qui sont **générés une première fois** à partir de `data.js` par un script de conversion (les pouvoirs non encore migrés restent en code et sont ignorés par le chargeur). À la fin, `data.js` ne contient plus de cartes.

## 20. Langue : code et données en anglais, textes en français et en anglais (décidé le 10 novembre 2026)

### 20.1 Règle

- **Tout le code et toutes les données sont en anglais** : noms de variables, de fonctions, de fichiers et de dossiers, clés et valeurs d'identifiant des fichiers JSON (événements, actions, étiquettes, mots-clés, types), commentaires de code, messages d'erreur destinés aux développeurs.
- **Tout texte montré au joueur est traduisible** : noms de cartes, noms de types, noms de mots-clés, descriptions de pouvoirs, journal de combat, textes de l'interface. Ils sont fournis **en français et en anglais dès la première version**. Pour l'instant, le travail porte sur le français ; l'anglais est écrit en même temps mais relu plus tard.
- La **documentation** (`documentation/`) reste rédigée en français. Elle cite les identifiants en anglais (entre accents graves), comme dans ce document.

### 20.2 Identifiants stables

Tout ce qui s'affiche a un **identifiant anglais stable** qui ne change jamais ; le nom affiché est une simple étiquette traduisible.

| Chose | Identifiant | Nom français | Nom anglais |
|---|---|---|---|
| Carte | UUID (inchangé) | Intercepteur | Interceptor |
| Archétype | `pilot`, `engineer`, `medic`, `security`, `explorer`, `artillerist`, `intelligence`, `roboticist`, `diplomat` | Pilote, Ingénieur, Médecin, Sécurité, Explorateur, Artilleur, Renseignement, Roboticien, Diplomate | Pilot, Engineer, Medic, Security, Explorer, Artillerist, Intelligence, Roboticist, Diplomat |
| Espèce | `elk`, `dwork`, `droid`, `sorvane`, `ryskan`, `nythe` | Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe | Elk, Dwork, Droid, Sorvane, Ryskan, Nythe |
| Mot-clé | `taunt`, `shield`, `poison`, `rebirth`, `ranged`, `fury` | Provocation, Bouclier, Poison, Renaissance, À distance, Fureur | Taunt, Shield, Poison, Rebirth, Ranged, Fury |
| Ressource | `datacrons` | Datacrons | Datacrons |
| Phase | `mission`, `reinforcement`, `combat` | Mission, renfort, combat | Mission, reinforcement, combat |

Les termes du jeu qui n'ont pas de traduction évidente (le nom des espèces, « Datacron ») sont conservés tels quels.

### 20.3 Fichiers de traduction

```
data/i18n/fr.json
data/i18n/en.json
```

Chaque fichier associe un identifiant à son texte :

```json
{
  "card.2defafa8-043f-4208-b13a-fcc48379aed5": "Intercepteur",
  "type.pilot": "Pilote",
  "keyword.taunt": "Provocation",
  "ui.button.reinforcement": "Renfort",
  "log.stats": "{source} donne +{atk}/+{hp} à {target}."
}
```

- **Nom de carte, de type, de mot-clé** : clé `card.<uuid>`, `type.<id>`, `keyword.<id>`.
- **Description d'un pouvoir** : générée (section 18) à partir des phrases de `schema/bricks.json`, une par langue ; ou `text: { fr, en }` pour un remplacement manuel.
- **Journal de combat** : voir 20.4.
- **Interface** : clés `ui.*`.
- **Langue d'affichage** : choisie dans l'interface, enregistrée dans le profil. Le français est la langue par défaut.
- **Texte manquant** : si une traduction anglaise manque, le jeu affiche le texte français et un test la signale. Si même le français manque, il affiche l'identifiant.
- **Relecture** : chaque phrase anglaise porte un drapeau `reviewed` (faux au départ). Un test affiche le nombre de phrases anglaises non relues, sans bloquer.

### 20.4 Conséquence : le journal de combat devient structuré

Aujourd'hui le moteur écrit des phrases françaises directement (`say("${src.name} gagne +${k.a}/+${k.h}.")`). Pour que le journal existe dans les deux langues, **le moteur n'écrit plus de texte** : il écrit des **entrées structurées** (`{ type: "stats", source: <uid>, target: <uid>, atk: 1, hp: 1 }`), et l'interface les transforme en phrase avec les modèles `log.*` de la langue choisie.

Bénéfices :
- le journal de combat est dans la langue du joueur, sans retraduire le moteur ;
- les tests d'équivalence (étape 1 du plan) comparent des **entrées structurées**, plus fiables que des phrases ;
- ce même journal sert de journal d'événements au système de pouvoirs (section 12.4).

### 20.5 Le code existant : passe de renommage d'abord (décidé le 10 novembre 2026)

Le prototype contenait du français dans les **noms de fichiers** (`donnees.js`, `moteur.js`, `outils/`, devenus `data.js`, `engine.js`, `tools/` : étape faite le 10 novembre 2026), les **valeurs de données** (types `'Pilote'`, `'Droïde'`, noms de serviteurs utilisés comme clés), les **commentaires** et les **messages du journal**.

**Option retenue : une passe de renommage avant la migration des pouvoirs.** Un chantier mécanique traduit tout le code existant (fichiers, dossiers, identifiants, commentaires, valeurs de données), en un commit séparé et **sans changement de comportement**. Il touche aussi les scripts, le hook `pre-commit`, les pages de `site/` et la documentation qui citent ces chemins. Les tests d'équivalence servent de filet.

Conséquences à traiter pendant la passe :

- les commandes habituelles changent de chemin (par exemple `outils/tout-generer.js` est devenu `tools/generate-all.js`) ; la mémoire du projet et la documentation sont mises à jour en même temps ;
- les valeurs de données françaises (`'Pilote'`) deviennent des identifiants (`pilot`), et leurs noms français passent dans `data/i18n/fr.json` ;
- la sauvegarde du navigateur et l'historique des tests (`tests/history/`) référencent des noms ou des types : un convertisseur est prévu pour que les anciennes sauvegardes et comparaisons restent lisibles.

**Avancement de la passe (10 novembre 2026)**

| Étape | État |
|---|---|
| Filet de sécurité : `tools/fingerprint.js` (400 parties à graine fixe : résultats `e0588896`, 386 545 messages de combat `be986580`, tous deux identiques à l'état d'avant la passe), pages générées identiques, `tools/check-names.js` | fait |
| Fichiers et dossiers (`tools/`, `data.js`, `engine.js`, `ui.js`, `save.js`, pages du site, `tests/history`) | fait |
| Identifiants du prototype (`reinforcement*`, `IDENTIFIERS`, `CLOCK`, `PROFILE`, clés de débogage, dossiers d'images) | fait |
| Types : identifiants anglais (`pilot`, `droid`…), noms français dans `TYPE_NAMES` (provisoire, avant `data/i18n/fr.json`) | fait |
| Identifiants, options de ligne de commande (`--scale`, `--seed`, `--threshold`, `--threads`, `--strategy`, `--no-history`) et formats de sortie des outils | fait |
| Format de l'historique des tests (clés JSON, noms de fichiers, `-massive`) et conversion des trois tests existants | fait |
| Page `site/tests.html` : code et clés lues dans l'historique, noms de types via `typeNames` | fait (les classes CSS et identifiants HTML restent en français) |
| Commentaires du code (JavaScript, Python, hook git, CSS et scripts des pages) en anglais, y compris `data.js` et `engine.js` | fait |
| Routes de l'API du serveur local (`/api/state`, `/api/launch`, `/api/cancel`, `/api/reindex`, `/api/card/…`) | fait |
| Textes affichés (journal de combat, interface, messages de la console) | volontairement en français : ils passeront dans `data/i18n/` avec le journal structuré (section 20.4) |
| `data/i18n/fr.json` (233 entrées, généré par `tools/export-i18n.js` depuis `data.js` en attendant la migration) vérifié par `tools/check-names.js` | fait |
| `data/i18n/en.json` (noms de cartes à rédiger) et bascule de la source des noms vers `fr.json` | à faire (avec la migration des pouvoirs) |
| Classes CSS et identifiants HTML des pages du site et du jeu (`carte`, `grille`, `puce`, `onglets`, `plateau-donjon`…, une soixantaine) | à faire : demande un contrôle visuel dans un navigateur |

Les nouveaux noms de stratégies (`level`, `balanced`) entrent dans la clé qui sert de graine aux parties simulées : un test relancé avec la même graine ne reproduit donc pas à l'identique un test d'avant le 10 novembre (écarts de l'ordre du bruit statistique). Avec les anciennes clés, la phase « lieutenants » redonne exactement les mêmes résultats.

Notes de la passe : la sauvegarde d'une partie en cours est refusée une fois (version 4, message « ancienne version du jeu ») ; la clé de stockage du profil (`atlasWandererProfil`) est conservée volontairement pour ne pas perdre le compteur de victoires du modèle PR.

### 20.6 Garantie : retrouver tous les noms (décidé le 10 novembre 2026)

Le renommage et la migration ne doivent **jamais** faire disparaître un nom de carte, de lieutenant, de serviteur ou de Boss. Mesure prise :

- **Référence figée** : `tests/names-reference.json`, créée le 10 novembre 2026 à partir de `IDENTIFIANTS`, des Boss, des espèces, des archétypes et des mots-clés. Elle contient **99 serviteurs, 93 équipements (dont ceux retirés du catalogue réduit), 12 lieutenants, 4 donjons et leurs 4 Boss**. Elle ne se régénère pas (contrairement à `tests/catalog.json`, réécrit à chaque test).
- **Test de non-perte** : à la fin de la passe de renommage, puis à la fin de la migration, un test vérifie que chaque nom de la référence est présent dans `data/i18n/fr.json`, sous le même UUID. Un nom manquant ou modifié fait échouer le test.
- **Renommer volontairement une carte** : on met à jour `fr.json` et la référence dans le même commit, avec l'ancien nom noté dans le message du commit.
- **Anomalie connue** : « Réseau d'informateurs » apparaît deux fois dans `IDENTIFIANTS` (deux UUID pour le même nom, `3311863d-…` et `9be6cb45-…`) ; un seul est utilisé par `EQUIPS`. Les deux sont conservés dans la référence. À arbitrer pendant la passe : supprimer l'UUID inutilisé, ou donner un nom distinct à l'une des deux cartes.
