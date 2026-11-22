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
| `{ "pool": ["balanced", "horde"], "override": {…} }` | une stratégie tirée dans la liste, **sans répétition d'un plateau à l'autre** tant que la liste le permet. Le tirage a lieu **au début de la partie** (une fois pour toute l'exploration). Un élément de la liste peut être `{ "use": "horde", "override": {…} }` : sa réécriture s'ajoute à celle du `pool` |

Le résultat de la fusion est validé comme une stratégie complète : un `override` qui casse la stratégie est refusé.

## 2. Les genres

Le nom du genre dit ce qui joue, pas qui le joue.

| Genre | Ce que c'est | Paramètres |
|---|---|---|
| `parametric` | La routine du moteur qui achète des serviteurs, monte de niveau et équipe (`aiReinforcement`), réglée par des valeurs. La décision (servir, monter de niveau, équiper) est une **routine** du mod (`routines`, voir § 5) ; le score des cartes et le choix de la cible restent des listes fermées du moteur | `routine`, `want`, `level`, `equipP`, `score`, `target` |
| `board` | Le plateau est le plan de la salle, sans achat | `rooms` (liste de listes d'identifiants de serviteurs ; la salle n prend la n-ième liste, la dernière sert ensuite) **ou** `unit` + `count` (voir ci-dessous), `growth { atk, hp }` facultatif (gain de chaque carte par salle déjà jouée) |
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

## 7. Préférences (21 novembre 2026)

Paramètre facultatif `prefer` d'une stratégie `parametric` :

```json
"prefer": {
  "servants":  { "cards": ["<id>", …], "types": ["intelligence", "elk", …] },
  "equipment": { "cards": ["<id>", …], "types": ["medic", …] }
}
```

Quand le plateau choisit une carte parmi celles qu'on lui propose (achat de serviteur ou d'équipement, récompense de fusion), l'ordre est : **1.** les cartes de `cards`, dans l'ordre de la liste ; **2.** les types de `types`, dans l'ordre (un premier type l'emporte sur un deuxième, quelle que soit la valeur de la carte) ; **3.** à égalité, la carte qui porte le plus de types préférés ; **4.** le score de la stratégie. Une carte qui ne correspond à rien est jugée par le score seul : sans `prefer`, le plateau choisit exactement comme avant. Pour un équipement, le type est son affectation.

Quand le plateau est plein, le serviteur sacrifié est le moins préféré (le plus faible à préférence égale), et un nouveau serviteur le remplace s'il est plus préféré, ou plus fort à préférence égale.

**Pondération (`weight`).** Par défaut la préférence est absolue : un type préféré de niveau 1 passe devant une carte de niveau 5 d'un autre type. Avec `weight` (nombre > 0, dans `servants` ou `equipment`), la préférence ajoute des points au score au lieu de passer devant : la première entrée de la liste (cartes, puis types) ajoute `weight`, la deuxième `weight / 2`, la troisième `weight / 3`…, et une carte qui correspond à plusieurs entrées cumule leurs bonus. Le score des cartes compte environ 10 points par niveau : `weight: 30` vaut à peu près trois niveaux, `weight: 10` un seul, et une carte bien meilleure l'emporte encore. Le remplacement du serviteur sacrifié suit la même règle (force + bonus).

**Diversité (`diversity`, 22 novembre 2026).** `prefer.servants.diversity: "species"` (un groupe de types du vocabulaire) : un serviteur qui apporte un type de ce groupe que le plateau n'a pas encore passe **avant tout le reste** (même avec un `weight`) ; viennent ensuite les autres préférences puis le score. Plateau plein : le serviteur sacrifié est celui dont la perte coûte le moins de types différents (le plus faible parmi eux), et le nouveau le remplace s'il apporte plus de types, ou autant et qu'il est plus fort. Le serviteur permanent compte dans les types du plateau et n'est jamais remplacé. Exemple : `sandakExpedition` (`game.json`).

Limite : la préférence ne joue que parmi les cartes proposées (trois par offre). Elle ne change pas ce que le jeu propose au Boss.

Variantes tirées au hasard : un `pool` dont les éléments sont `{ use, override }` donne plusieurs personnalités à un même donjon (chacune avec ses préférences), une seule par plateau, tirées au début de la partie.

## 8. Plateau d'une même unité qui grandit (`unit` et `count`, 21 novembre 2026)

Le genre `board` s'écrit aussi avec `unit` et `count` au lieu de `rooms` (les deux ensemble sont refusés) :

```json
"dr1xSwarm": {
  "kind": "board",
  "unit": { "card": "<id d'un serviteur>", "powers": [ { "t": "passive", "fx": "…", "a": 0, "h": 0, "n": 0 }, … ] },
  "count": { "base": 1, "per": 2, "max": 7 },
  "growth": { "atk": 1, "hp": 1 }
}
```

- **`unit`** : un identifiant de serviteur, ou `{ card, powers }`. Avec `powers`, **chaque nouvel exemplaire reçoit UN pouvoir de la liste, qu'il garde** : les pouvoirs sont distribués à partir d'un paquet mélangé (`team.unitDeck`), donc **aucun n'est distribué deux fois avant que tous l'aient été** (avec sept pouvoirs et sept unités, tous sont là, une fois chacun). Le paquet est remélangé quand il est vide.
- **`count`** : nombre d'exemplaires de la salle = `min(taille du plateau, max, base + floor((salle − 1) / per))`. Avec `base: 1, per: 2` : 1 exemplaire en salles 1 et 2, 2 en salles 3 et 4, 3 en salles 5 et 6… 7 en salle 13.
- **`growth`** : chaque carte gagne `growth` par salle déjà jouée. Avec une base de 1/1 et un gain de 1/1, la salle n donne des unités n/n.
- Le serviteur permanent du boss, s'il en a un, reste sur le plateau (il compte parmi les places).
- **Les unités restent sur le plateau d'une salle à l'autre** (seules les unités manquantes sont ajoutées) ; elles gardent leur pouvoir et leurs gains permanents, et gagnent `growth` à chaque salle (une unité a donc toujours pour statistiques le numéro du match). La forme `rooms`, elle, reconstruit le plateau à chaque salle.
- Un serviteur marqué `token` n'est jamais proposé en achat, ni au joueur ni au Boss.

## 9. Plateau écrit dans l'ordre (`layout`, 21 novembre 2026)

Troisième écriture du genre `board`, à côté de `rooms` et de `unit` + `count` (les trois ensemble sont refusés) :

```json
"cyroGuard": {
  "kind": "board",
  "layout": [
    { "card": "<Gardien de la salle>", "growth": { "atk": 1, "hp": 1 } },
    { "card": "<Fusilier>", "every": 3, "stack": true },
    { "card": "<Gardien de la salle>", "growth": { "atk": 1, "hp": 1 } }
  ]
}
```

- **L'ordre de la liste est l'ordre du plateau** : le premier est à gauche, le dernier à droite. C'est ce qui permet de garder des unités aux deux extrémités quel que soit le nombre d'unités présentes.
- **`every`** (facultatif, 1 par défaut) : l'entrée n'est présente que dans les salles multiples de ce nombre (`every: 3` : salles 3, 6, 9, 12…). Elle ne reste pas ensuite : le plateau est reconstruit à chaque salle.
- **`growth`** (facultatif, propre à l'entrée) : gain par salle déjà jouée, comme `growth` de la stratégie (qui n'est pas utilisé avec `layout`). Sans `growth`, l'entrée garde les statistiques de sa carte.
- Le serviteur permanent du boss, s'il en a un, passe avant la liste (à gauche).

## 10. Plateau fixe qui garde ses gains (`keep`, 22 novembre 2026)

`layout` accepte `"keep": true` : le plateau est construit **une seule fois**, à la première salle, puis ses cartes **restent** d'un match à l'autre avec les bonus permanents qu'elles gagnent. Rien ne grandit tout seul (pas de `growth`). Les vraies cartes ne meurent jamais (un combat se joue sur des copies) : un serviteur « mort » est donc de retour au match suivant. Règle générale du moteur : un bonus permanent n'est gardé que si la carte a survécu au combat où elle l'a reçu ; une action `stats` écrite avec `"keepDead": true` fait exception (la carte garde le gain même si elle meurt dans ce combat). Exemple : `honorGuard` (Veylor).
