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

## 5. Routines (version minimale, 13 novembre 2026)

La décision d'un plateau `parametric` est une liste de règles `{ if: [conditions], do }` dans `strategies.routines.<nom>`, que la stratégie nomme par `routine`. La première règle dont toutes les conditions tiennent donne l'action (`servant`, `level` ou `equip`) ; la dernière règle n'a pas de condition. Conditions (liste fermée du moteur, essayées dans l'ordre, arrêt à la première fausse) : `underWanted` (moins de serviteurs que voulu), `levelBelowGoal` (niveau sous l'objectif de la salle), `hasBoard` (plateau non vide), `{ "chance": "<paramètre>" }` (tirage contre un paramètre de la stratégie, ex. `equipP`). Atlas Wanderer : routine `standard`, identique à l'ancien code (mêmes tirages).

## 6. Encore à faire avant la livraison définitive du jeu

Reste du chantier ci-dessous : les scores de cartes (`BOSS_SCORES`), les choix de cible (`BOSS_TARGETS`) et le placement (`aiPlace`) sont encore du code, et les conditions sont une liste fermée. Texte d'origine :

**Rendre la boucle de décision de `parametric` elle-même une donnée.** Aujourd'hui `aiReinforcement` (monter de niveau, puis acheter un serviteur ou un équipement) et les listes fermées `BOSS_SCORES` et `BOSS_TARGETS` sont du code (voir `pouvoirs-modulaires.md` § 21, Dette). Le but : une stratégie est une liste de règles « si condition, alors action » sur les actions déclarées du jeu, avec des évaluations de cartes et des choix de cible en briques nommées. Ce chantier ne change rien au jeu actuel (même résultat) : il ouvre la création de stratégies à un mod. **Il doit être fait avant la livraison définitive.**

Tests : `tools/check-strategies.js` (couches, surcharges, tirages, stratégie `random` sur 8 parties, validation) et `tools/check-minimal.js`.
