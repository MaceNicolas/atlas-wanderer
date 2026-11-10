# Documentation d'Atlas Wanderer

Point d'entrée de la documentation du jeu. Le texte de référence actuel reste `documentation/idees/nouvelles.md`.

## Sommaire

- [`types/`](types/types.md) : les types de serviteurs et de héros.
  - [`types/archetypes.md`](types/archetypes.md) : les spécialités d'équipage.
  - [`types/especes/`](types/especes/especes.md) : les espèces (Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe).
- [`mecaniques/`](mecaniques/mecaniques.md) : les règles du jeu (à venir, aujourd'hui dans `documentation/idees/nouvelles.md`).
  - [`mecaniques/pouvoirs-modulaires.md`](mecaniques/pouvoirs-modulaires.md) : spécification des pouvoirs en briques (Déclencheur, Conditions, Actions, Cibles) et correspondance avec les pouvoirs actuels (brouillon).

## Hors documentation

- [`idees/`](idees/) : `nouvelles.md` (texte de référence des règles), `anciennes.md` (réflexions passées), `vrac.md` (idées notées au vol).
- [`cartes.md`](cartes.md) : export automatique de toutes les cartes du prototype (généré par `outils/exporter-cartes.js`, ne pas modifier à la main).
- `site/` : pages du site (règles, lieutenants, serviteurs, équipements, graphismes) et feuilles de style ; `index.html` (accueil) reste à la racine.
- `prototype/` : prototype jouable. Ouvrir `index.html` à la racine (présentation, règles et serviteurs, lien vers le prototype), ou directement `prototype/prototype.html` (connexion nécessaire pour les styles). `site/apercu.html` montre les graphismes SVG.
