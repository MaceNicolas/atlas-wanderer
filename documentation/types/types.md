# Types

Ce dossier détaille la section 11 de `documentation/idees/nouvelles.md`. Une mention **(à valider)** marque une déduction non confirmée. Une mention **(ouvert)** marque un point volontairement non tranché.

## Règles générales

- Il n'y a **pas de dominance** entre types. Une autre source de tension reste à trouver (ennemis qui punissent une composition, capacités qui se contrent).
- Une **seule famille de types**, sans distinction de règle entre espèce et affectation.
- Chaque **héros** a **deux types** différents.
- Chaque **serviteur** a **deux types** : une **espèce** et une **affectation obligatoire** parmi les 9 affectations. Un serviteur peut avoir un type absent chez les héros (« invité ») : il apparaît alors par son autre type.
- Deux héros apportent jusqu'à 4 types (2 espèces et 2 affectations), plus **1 type tiré au hasard** à chaque partie (`extraTypes`) : **4 à 5 types** pour une partie. Le donjon n'ajoute plus aucun type au joueur.
- Le pool de serviteurs et d'équipements du renfort est lié à ces types.
- Le **donjon** porte les types des serviteurs que les Boss peuvent acheter : des **types fixes** (`types`) et une règle de tirage (`drawTypes`, une entrée par type tiré au début de la partie, dans un groupe ou une liste, jamais un type déjà fixe ou tiré). Tous les plateaux du Boss achètent parmi ces types. Les **boss** sont les adversaires à abattre (`bosses.json`, voir `documentation/mecaniques/donjons-et-boss.md`) : un plateau par boss, le donjon énumère les siens (`bosses` : des boss fixes, et des boss liés à un type tiré au hasard). **Chaque boss a sa propre barre de PV** : les survivants d'un combat gagné frappent la barre du boss affronté (ce qui dépasse est perdu) ; à 0, ce boss est vaincu et **son plateau quitte le donjon** (plus de renfort, plus d'affrontement, plus présenté). Le donjon est gagné quand tous ses boss sont vaincus ; l'écran affiche encore le total des barres restantes. Le pouvoir d'un boss agit quand son plateau affronte le joueur ; un boss peut avoir un **serviteur permanent** (toujours sur son plateau, jamais remplacé, il garde ce qu'il gagne). Cité des Profondeurs : types fixes Sorvane + Diplomate, types tirés Droïde et Ingénieur (imposés pour le moment), quatre boss dont DR-I0 (boss Droïde) et L'Oracle Souterrain ; Brasier : Dwork + Artilleur, une espèce et une affectation tirées au hasard. Les malus de Datacrons sont redistribués au hasard entre les plateaux au début de chaque renfort. La carte du donjon montre ses types fixes au centre comme une carte héros, les types tirés au-dessus (espèce) et en dessous (affectation), assombris.
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
