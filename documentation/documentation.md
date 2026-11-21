# Documentation d'Atlas Wanderer

Point d'entrée de la documentation du jeu. Le texte de référence actuel reste `documentation/idees/nouvelles.md`.

## Sommaire

- [`types/`](types/types.md) : les types de serviteurs et de héros.
  - [`types/affectations.md`](types/affectations.md) : les spécialités d'équipage.
  - [`types/especes/`](types/especes/especes.md) : les espèces (Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe).
- [`donjons/`](donjons/donjons.md) : les donjons (univers, thématiques, boss).
  - [`donjons/nhavaris.md`](donjons/nhavaris.md) : Nhavaris, la Cité des Profondeurs.
- [`mecaniques/`](mecaniques/mecaniques.md) : les règles du jeu (à venir, aujourd'hui dans `documentation/idees/nouvelles.md`).
  - [`mecaniques/donjons-et-boss.md`](mecaniques/donjons-et-boss.md) : le modèle donjon / boss (boss = adversaires à abattre, serviteur permanent, types du donjon, boss fixes et aléatoires), brouillon à valider.
  - [`mecaniques/pouvoirs-modulaires.md`](mecaniques/pouvoirs-modulaires.md) : spécification des pouvoirs en briques (Déclencheur, Conditions, Actions, Cibles) et correspondance avec les pouvoirs actuels (brouillon).
- [`interface/editeur-cartes.md`](interface/editeur-cartes.md) : l'éditeur de cartes (formulaire par catégorie, images et cadrage).
- [`interface/design-system.md`](interface/design-system.md) : direction artistique « console de pont », jetons, composants et règles de l'interface (site et jeu).

## Hors documentation

- [`idees/`](idees/) : `nouvelles.md` (texte de référence des règles), `anciennes.md` (réflexions passées), `vrac.md` (idées notées au vol).
- [`cartes.md`](cartes.md) : export automatique de toutes les cartes du prototype (généré par `tools/export-cards.js`, ne pas modifier à la main).
- `site/` : pages du site (règles, heroes, serviteurs, équipements) et feuilles de style ; `index.html` (accueil) reste à la racine.
- `prototype/` : prototype jouable. Ouvrir `index.html` à la racine (présentation, règles et serviteurs, lien vers le prototype), ou directement `prototype/prototype.html` (connexion nécessaire pour les styles).
