# Idée de mod : Football

Mod simple, distinct d'*Atlas Wanderer*, pour tester le moteur modulaire sur un autre jeu. Par la règle absolue (`documentation/mecaniques/pouvoirs-modulaires.md`, section 0), tout doit passer par des **données** : aucune règle de football ne doit être codée en dur dans le moteur.

Légende : **(ouvert)** marque un point volontairement non tranché. **(à vérifier)** marque une hypothèse sur le moteur non contrôlée dans le code.

Date de la première rédaction : 21 novembre 2026.

## 1. Principe

Un tournoi de **20 équipes** (poules de 5 en aller-retour, puis élimination directe). Le joueur dirige une équipe de footballeurs qu'il **construit lui-même** en les achetant entre les matchs. Un match oppose deux équipes de 7 joueurs face à face.

## 2. Le match

- Chaque équipe a un **plateau de 7 cases**, un footballeur par case. Les deux plateaux se font face : la case 1 est opposée à la case 1, la case 2 à la case 2, etc.
- Chaque footballeur a une **attaque** et une **défense**.
- Chaque duel se joue **dans les deux sens** :
  - mon joueur attaque celui d'en face : **mon attaque > sa défense** = **but pour moi** ;
  - celui d'en face m'attaque : **son attaque > ma défense** = **but pour lui**.
- La comparaison est **strictement supérieure** : à égalité, il n'y a pas de but.
- **Un seul tour de duels** par match. Le match est donc rapide, et le score est borné (7 buts maximum par équipe).
- **Case vide** : si le joueur d'en face n'existe pas, le but est encaissé, c'est tout. Pas de défense, pas de duel.
- **Placement par défaut** : les footballeurs sont placés **au centre** du plateau (et non à gauche), pour que les cases vides soient aux extrémités. Un joueur se place ensuite où l'on veut.

### Conséquences stratégiques

- On peut jouer **tout en défense** et n'encaisser aucun but.
- Mais **sans marquer, on ne gagne pas** : une équipe sans but ne peut pas battre l'autre. Il faut donc un équilibre, ou un pari sur l'attaque ou la défense.
- Le placement compte, parce que chaque joueur est face à un adversaire précis.

### Égalité (ouvert)

En cas d'égalité de buts, rien n'est décidé. Pistes : prolongation, tirs au but, ou départage par un autre critère. En phase de poules, un nul peut rester un nul (1 point).

## 3. Les footballeurs et leurs pouvoirs

Les footballeurs sont les cartes du mod, comme les serviteurs d'*Atlas Wanderer*. Chacun a une attaque, une défense et éventuellement un **pouvoir**.

Exemples déjà évoqués :

- **Voisinage** : « +défense aux deux footballeurs à côté ».
- **Dribble** : le joueur attaque celui d'en face, **ou celui de sa gauche si ce dernier a une défense plus faible**.

D'autres pouvoirs restent à inventer (marquage, capitaine, contre-attaque, etc.).

À vérifier : si ces pouvoirs s'expriment avec les pouvoirs modulaires actuels (voisins, choix d'une cible selon une condition).

## 4. Construction de l'équipe

- Le joueur **commence avec 0 footballeur** et **achète** ses joueurs au fur et à mesure.
- Les achats se font **entre chaque match**.
- Le plateau est limité à **7 joueurs** : une fois plein, il faut choisir qui remplacer.
- Il existe un **niveau de renfort** que le joueur peut augmenter pour **recruter de meilleurs footballeurs**.

La monnaie des achats (gains par match, boutique de départ) n'est pas encore définie (ouvert).

### Thématique de l'amélioration de l'équipe (en réflexion)

Le **niveau de renfort** permet de recruter de meilleurs joueurs, mais sa thématique (ce que le joueur améliore concrètement : staff, centre de formation, budget de recrutement, etc.) n'est pas encore choisie. À l'utilisateur de réfléchir ; rien n'est décidé (ouvert).

## 5. Les équipes adverses

Les équipes contrôlées par l'IA **fonctionnent de la même manière** que le joueur : mêmes règles, mêmes cartes, même plateau de 7 cases. Leur construction au fil du tournoi (achats comme le joueur, ou équipes préparées à l'avance) reste à préciser (ouvert).

## 6. Le tournoi

Format retenu le 21 novembre 2026 : **poules de 5 en aller-retour**. Le nombre d'équipes importe peu ; le but est d'**allonger la durée d'une partie**, car gagner en quelques duels seulement, sans avoir une très bonne équipe, serait frustrant. Confirmé pour le moment : 20 équipes en 4 poules de 5. La phase finale (2 premiers de chaque poule) en découle, sans règle de meilleurs deuxièmes :

- **20 équipes**, réparties en **4 poules de 5**.
- Dans une poule, **chaque équipe affronte les 4 autres deux fois** (aller et retour), soit **8 matchs de poule** par équipe. Victoire = 3 points, nul = 1, défaite = 0. Départage à la différence de buts (à confirmer).
- Les **2 premiers de chaque poule** se qualifient pour l'élimination directe : quarts, demi-finales, finale.
- Pour le joueur : 8 matchs de poule + jusqu'à 3 de phase finale, soit **11 matchs** pour aller jusqu'à la victoire. Les 8 matchs de poule laissent plusieurs occasions d'acheter et de renforcer l'équipe avant l'élimination directe.
- Les matchs entre équipes IA peuvent être résolus automatiquement, hors écran.

## 7. Correspondance avec le moteur

| Atlas Wanderer | Mod Football |
|---|---|
| Donjon (suite de salles) | Tournoi (poules, puis élimination) |
| Boss | Équipe adverse |
| Serviteurs | Footballeurs |
| Combat, dégâts et PV | Duel attaque/défense, but marqué |
| Achat de cartes entre les salles | Achat de footballeurs entre les matchs |

## 8. Points à vérifier dans le moteur

1. Que la **conséquence d'un duel gagné** soit « +1 but » et non « −PV », **décrite dans le mod**.
2. Que la **condition de victoire** soit « plus de buts que l'adversaire » (et non « PV adverses à zéro »), décrite dans le mod.
3. Que le moteur sache organiser un **tournoi** (poules, tableau) ou qu'il faille ajouter un type de structure ; à comparer avec la dette notée en section 21 de la spec.
4. Que des **duels dans les deux sens** et une **case vide qui laisse passer le but** soient exprimables par les données.
5. Que le **placement par défaut au centre** soit une donnée du plateau.

## 9. Questions ouvertes (récapitulatif)

- Égalité de buts : prolongation, tirs au but ou autre (section 2).
- Monnaie et prix des footballeurs (section 4).
- Équipes IA : achats progressifs ou équipes préparées (section 5).
- Équipes réelles ou fictives (je recommande des équipes fictives, pour les droits).
