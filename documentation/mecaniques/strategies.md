# Stratégies des plateaux du Boss

Décidé avec Nicolas le 12 novembre 2026. Une **stratégie** dit comment un plateau du Boss se constitue et se joue. Elle remplace `bossBehaviors` de `game.json` (section `rules`).

## 1. Le fichier `game.json` (section `strategies`) (obligatoire)

Déclaré dans `mod.json` (`files.strategies`). Il contient :

- `default` : **obligatoire**, la stratégie d'un donjon qui n'en nomme aucune ;
- `list` : les stratégies nommées du mod.

Une entrée (pour `default`, pour un donjon, pour un plateau) prend l'une de ces trois formes :

| Forme | Sens |
|---|---|
| `"horde"` | la stratégie de ce nom |
| `{ "use": "horde", "override": { "want": { "base": 4 } } }` | la stratégie de ce nom, **réécrite seulement là où `override` le dit** (fusion clé par clé ; une liste est remplacée en entier) |
| `{ "pool": ["balanced", "horde"], "override": {…} }` | une stratégie tirée dans la liste, **sans répétition d'un plateau à l'autre** tant que la liste le permet |

Le résultat de la fusion est validé comme une stratégie complète : un `override` qui casse la stratégie est refusé.

## 2. Les genres

Le nom du genre dit ce qui joue, pas qui le joue.

| Genre | Ce que c'est | Paramètres |
|---|---|---|
| `parametric` | La routine du moteur qui achète des serviteurs, monte de niveau et équipe (`aiReinforcement`), réglée par des valeurs. La décision (servir, monter de niveau, équiper) est une **routine** du mod (`routines`, voir § 5) ; le score des cartes et le choix de la cible restent des listes fermées du moteur | `routine`, `want`, `level`, `equipP`, `score`, `target` |
| `board` | Le plateau est le plan de la salle, sans achat | `rooms` (liste de listes d'identifiants de serviteurs ; la salle n prend la n-ième liste, la dernière sert ensuite), `growth { atk, hp }` facultatif (gain de chaque carte par salle déjà jouée) |
| `random` | **Intégrée au moteur**, existe dans tous les mods (le nom `random` est réservé). Joue des coups légaux au hasard avec les actions du jeu, comme le ferait le joueur, sans rien connaître des règles du mod ; peut s'arrêter à tout moment | aucun |

## 3. Qui décide, du plus général au plus précis

1. le moteur : `random` ;
2. le mod : `default` ;
3. le donjon : `strategy` (une entrée) ;
4. le plateau : `strategies` (une entrée par plateau du Boss ; `null` garde celle du donjon).

Champs facultatifs de la catégorie « donjon » dans `game.json` : `optional: { strategy: 'strategy', strategies: 'strategies' }`.

## 4. Atlas Wanderer

Ses comportements (`balanced`, `horde`, …) sont des stratégies `parametric` et `default` est un `pool` de toutes : même tirage, même suite de nombres aléatoires qu'avant (vérifié : 30 salles de 5 parties, plateaux identiques à ceux d'avant la migration).

## 5. Routines, scores et cibles (13 novembre 2026)

Tout ce qui fait jouer un plateau `parametric` est une donnée de `strategies` ; le moteur ne garde que des opérations fermées.

**Routine** (`routines.<nom>`, nommée par le champ `routine` de la stratégie) : liste de règles `{ if: [conditions], do }`. La première règle dont toutes les conditions tiennent donne l'action : `servant`, `level` ou `equip`. La dernière règle n'a pas de condition. Une condition est essayée dans l'ordre et s'arrête à la première fausse (un tirage n'a lieu que si les précédentes tiennent) :
- `{ lt | gt | le | ge | eq: [a, b] }`, où une valeur est un nombre, `{ var }` du moteur (`held` serviteurs tenus, `want` voulus, `level`, `levelGoal` objectif de la salle, `maxLevel`, `boardSize`, `room`, `money`) ou `{ param }` d'un paramètre de la stratégie ;
- `{ chance: "<paramètre>" }` : tirage contre un paramètre (ex. `equipP`).

**Scores** (`scores.<nom>`) : liste de termes additionnés, chacun `{ field | count | has | sharedTypes | score, times }` (ou un simple nom de champ). `field` : valeur numérique (0 si absente) ; `count` : nombre d'éléments d'une liste (1 si présent, sinon 0) ; `has` : 1 si le champ existe, même vide ; `sharedTypes` : combien de serviteurs du plateau partagent chaque type de la carte ; `score` : un autre score. Le moteur fournit `card` (valeur d'une carte : offres d'équipement, récompenses de fusion) et `power` (force d'un serviteur du plateau : remplacer le plus faible, cible de repli) ; le mod peut les réécrire. Le champ `score` d'une stratégie choisit celui qui valorise les serviteurs proposés.

**Cibles** (`targets.<nom>`) : `{ best: "max" | "min", score }` (le premier des meilleurs du plateau) ou `{ fixed: true }` (le Mannequin, sinon le premier). Le moteur fournit `strongest` ; le champ `target` d'une stratégie choisit celle de l'équipement.

Atlas Wanderer : routine `standard`, scores `rank`, `sharedTypes`, `equipCount`, cibles `leastEquipped` et `fixed`, tous identiques à l'ancien code (30 parties de 8 salles comparées : mêmes plateaux).

## 6. Ce qui reste du moteur

Les opérations fermées (opérateurs, variables, genres de termes), le choix du genre d'offre (équipement seulement si une châsse est libre et que le mod en offre), le remplacement du plus faible quand le plateau est plein (compare `power`) et le fait qu'un Mannequin n'est jamais remplacé.
