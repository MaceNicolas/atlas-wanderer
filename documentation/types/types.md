# Types

Ce dossier détaille la section 11 de `documentation/idees/nouvelles.md`. Une mention **(à valider)** marque une déduction non confirmée. Une mention **(ouvert)** marque un point volontairement non tranché.

## Règles générales

- Il n'y a **pas de dominance** entre types. Une autre source de tension reste à trouver (ennemis qui punissent une composition, capacités qui se contrent).
- Une **seule famille de types**, sans distinction de règle entre espèce et affectation.
- Chaque **héros** a **deux types** différents.
- Chaque **serviteur** a **deux types** : une **espèce** et une **affectation obligatoire** parmi les 9 affectations. Un serviteur peut avoir un type absent chez les héros (« invité ») : il apparaît alors par son autre type.
- Deux héros apportent jusqu'à 4 types (2 espèces et 2 affectations), plus **1 type tiré au hasard** à chaque partie (`extraTypes`) : **4 à 5 types** pour une partie. Le donjon n'ajoute plus aucun type au joueur.
- Le pool de serviteurs et d'équipements du renfort est lié à ces types.
- Le **donjon** a une espèce et une affectation fixes (`types`) ; le Boss tire en plus, au début de la partie, une autre espèce et une autre affectation : **4 types** pour le Boss. Le Boss à PV et à pouvoir n'existe plus à l'écran : ses PV sont les **points de vie du donjon** (le compteur de victoire) et son pouvoir est **porté par le mini-boss de la première espèce** du donjon, qui prend son nom (L'Oracle Souterrain, Maître-Forgeron Grumm). Il y a **4 plateaux du Boss, un mini-boss seul sur chacun** : d'abord ceux des deux types tirés au hasard (génériques), puis ceux de l'espèce et de l'affectation du donjon (l'affectation garde un nom générique pour l'instant). Les malus de Datacrons sont redistribués au hasard entre les plateaux au début de chaque renfort. La carte du donjon montre ces types au centre comme une carte héros, les types tirés au hasard au-dessus (espèce) et en dessous (affectation), assombris.
- Chaque type a une **thématique** : certains mots-clés sont plus présents dans certains types.

## Deux natures

| Nature | Question | Apporte surtout | Fichier |
|---|---|---|---|
| **Espèce** | Ce qu'est le serviteur | Identité, ambiance, attachement | `especes/especes.md` |
| **Affectation** | Comment il se joue | Mécanique de combat | `affectations.md` |

Un héros aurait volontiers un type de chaque nature, mais rien ne l'impose. Un Elk Pilote, un Dwork Médecin et un Droïde Diplomate sont tous possibles.

## Sommaire

- [`especes/especes.md`](especes/especes.md) : les types de nature espèce (Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe).
- [`affectations.md`](affectations.md) : les types de nature affectation (spécialités d'équipage).

## Ouvert

- La liste définitive des types.
- Le cas où les deux héros partagent un type (moins de 5 types, 4 si les deux héros partagent un type).
- Le nombre total de types par rapport aux 5 d'une partie : chaque type n'apparaît que dans une partie sur trois ou quatre, il faudra vérifier que le pool de renfort reste assez riche.
