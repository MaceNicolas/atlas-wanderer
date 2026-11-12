# Le jeu minimal viable (mod « minimal »)

Brouillon du 12 novembre 2026. Objectif : le plus petit jeu que le moteur doit pouvoir jouer, et le modèle proposé par l'éditeur à la création d'un mod. Chaque chose qu'il demande et que le moteur ne sait pas encore faire par des données est une **dette de modularité** (§ 3), à régler avant d'écrire le mod.

## 1. Le jeu

- **Un héros**, 5 PV, sans pouvoir. **Un Boss**, 5 PV, sans pouvoir. Pas d'effet de passage ni de mot-clé.
- **Pas de monnaie, pas de niveau de renfort, pas de main.**
- **Renfort** : le joueur voit **3 cartes** et en choisit **une**, qui rejoint directement le plateau. Maximum **5 cartes** sur le plateau ; plateau plein, la carte choisie **remplace** une carte du plateau.
- **Serviteurs** : tous infligent **1 dégât** en fin de combat, quel que soit leur « niveau » ; l'information de niveau (rang) est **masquée** sur leurs cartes.
- **Ennemi** : un plateau de **3 cartes**. Le plateau ennemi est décrit par le donjon de l'une de ces deux façons :
  - **fixe** : une liste de cartes, la même à chaque salle ;
  - **évolutif** : un plateau qui se met à jour tout seul selon une règle de données. Règle d'exemple pour le mod minimal : *un serviteur dont les statistiques gagnent +1/+1 à chaque phase* (salle).
- **Victoire** : tuer le Boss. **Défaite** : le héros tombe à 0 PV. Rien d'autre.
- Le combat reste celui du noyau (décision 3 de `flux-de-jeu.md` § 10).

## 2. Décisions de Nicolas (12 novembre 2026)

Les 5 PV sont ceux du héros (et du Boss), pas des cartes. Un seul héros. Plateau plein : remplacement. L'ennemi ne garde pas les mêmes cartes à chaque salle : les deux modes (plateau fixe, plateau évolutif par règle) doivent exister. Victoire : tuer le Boss, sans aucun effet au passage, pour le Boss comme pour le héros.

## 3. Ce que le moteur ne savait pas faire par des données : fait le 12 novembre 2026

Le mod est `data/mods/minimal/` (généré par `tools/make-minimal-mod.js`, testé par `tools/check-minimal.js` : validation, démarrage, 24 parties jouées avec le code réel de l'interface, 17 remplacements sur plateau plein). Les dix manques se sont réglés ainsi :

| # | Manque | Réglé par |
|---|---|---|
| 1 | Rôles `money`, `level`, `progress` obligatoires | **Facultatifs** : seul `turn` (le numéro de la salle) reste obligatoire. `GAME.val` lit une valeur par défaut (0, 1, 0) et `GAME.add` ne fait rien quand le rôle manque ; la validation ne contrôle un rôle que s'il est nommé ; `consoleHead` n'affiche que les ressources que le nœud nomme |
| 2 | Pas de main | Une main est une zone : **capacité 0** (`rules.game.handMax: 0`) = pas de main. Le widget `handSection` est simplement absent de l'écran |
| 3 | Glisser une carte de l'offre | `choices.offer.dragToBoard: true` : les cartes de l'offre se glissent sur le plateau (place libre), sur un serviteur (remplacement, avec confirmation) ou sur un serviteur à équiper. Un clic fait de même quand il y a de la place ; plateau plein, un message demande de glisser la carte. Moteur : `takeOffer` |
| 4 | Plateau ennemi acheté par l'IA | Le donjon peut décrire son plateau : champ `enemyBoard` (type de champ `enemyBoard`) |
| 5 | Règle « +1/+1 par phase » | `enemyBoard.growth { atk, hp }` : chaque carte gagne cette valeur pour chaque salle déjà jouée |
| 6 | Rang affiché partout | **Pas d'option** : un champ absent n'est pas affiché (décision de Nicolas). La catégorie ne déclare pas `rank`, la carte n'en a pas, le dessin n'écrit rien ; le tirage sans rang tire dans tout le catalogue |
| 7 | Pouvoirs obligatoires | Boss sans pouvoir accepté ; héros sans pouvoir déjà accepté |
| 8 | Console sans ressources | Voir 1 |
| 9 | Tirage par niveau | Sans niveau, `reinforcement.proposals` n'a qu'une valeur (3) |
| 10 | Un renfort par salle | `choices.offer.endsStep: true` : prendre la carte termine l'étape ; l'offre s'ouvre toute seule par un effet de l'étape (`effects: [openChoice]`), sans bouton ni coût |

Autres souplesses ajoutées : étape interactive sans `until` si un choix a `endsStep` ; `pick.list: true` (un seul héros mais une liste de héros) ; fusion facultative ; types facultatifs sur les serviteurs, héros et donjons ; plateau ennemi `bossBoards` à une seule entrée.

### Format de `enemyBoard` (dans un donjon)

```json
"enemyBoard": { "rooms": [["<id serviteur>", "…"]], "growth": { "atk": 1, "hp": 1 } }
```

`rooms[n-1]` est la liste des cartes de la salle n (la dernière liste sert pour les salles suivantes) ; `growth` est facultatif. Plateau fixe : une seule liste, pas de `growth`. Plateau évolutif : une liste et un `growth`. Plateau différent à chaque salle : plusieurs listes. Sans `enemyBoard`, le Boss renforce son plateau comme dans Atlas Wanderer.

### Ce qui reste hors du jeu minimal

Le glisser-déposer lui-même (événements du navigateur) n'est vérifié que par le code qu'il appelle (`takeOffer`) ; ni le jeu ni l'éditeur n'ont été vus dans un navigateur. L'éditeur propose le mod minimal comme modèle de création (copie), ne sait pas encore montrer un aperçu de carte sans rang autrement que par le dessin habituel, et édite `enemyBoard` en JSON brut.
