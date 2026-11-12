# Les cartes : un modèle par défaut, réécrivable par le mod

Brouillon du 12 novembre 2026. Les cartes (serviteurs, équipements, héros, donjons) partagent une identité graphique : cadre à coins coupés, hexagone d'icône en haut, bandeau de nom, plaques de statistiques hexagonales, chasses hexagonales. Le dessin vient du kit « atlas-wanderer-kit-cartes-v2 » (dossier `temp/`, non versionné), adapté à notre rendu SVG.

## 1. Le principe : la mise en page est une donnée

- Le **moteur** fournit un modèle par défaut (`prototype/card-layout.js`, `DEFAULT`) : pour chaque catégorie, la liste des zones de la carte et le champ que chacune affiche.
- Le **mod** peut réécrire n'importe quelle partie dans `game.json`, section `ui.cards` (voir § 3). Le dessin (`prototype/svg.js`, `atlasCard`) ne connaît que les zones de la liste fermée ci-dessous : une zone nouvelle demande du code dans le moteur, jamais dans un mod.
- Une zone dont le champ manque à la carte **n'est pas dessinée** et les autres prennent sa place : un jeu sans rang, sans types, sans chasses ni pouvoirs n'a rien à déclarer de plus. Une carte sans pouvoir à montrer agrandit son illustration.

## 2. Les zones

| Zone | Ce qu'elle montre | Paramètres |
|---|---|---|
| `icon` | l'hexagone en haut de la carte | `glyph` (un caractère) ou `icon` (une icône du moteur) |
| `level` | un nombre en haut à droite | `field` (le rang) |
| `art` | l'illustration (trouvée par l'identifiant de la carte), sinon un emblème | |
| `tags` | le bandeau sous l'illustration, une case par valeur | `fields` (un ou deux champs), `empty` (texte si rien) |
| `body` | la zone de texte : les pouvoirs de la carte, en lignes | `source: "powers"`, `tint` (colore par genre de pouvoir) |
| `sockets` | la rangée de chasses | `field` (couleurs), `filled` (ce qu'elles contiennent) |
| `stats` | les plaques des coins du bas | liste de `{ field, at: left/right, glyph, color, max?, hideZero? }` |
| `foot` | une petite étiquette en bas | `text` (clé de texte) |
| `mark` | la couleur de la chasse qu'un équipement occupe | `field` |

Autres clés : `accentField` (le champ dont la valeur donne la couleur de la carte : la couleur de chasse pour un équipement), et au niveau de `ui.cards` : `style`, `accents`, `palette`.

## 3. Ce que le mod peut écrire (`game.json`, `ui.cards`)

```json
"cards": {
  "style": "atlas",
  "accents": { "servant": "#8bd17c", "hero": "#d99df5" },
  "palette": { "blue": "#56c9ff" },
  "default": { "icon": { "glyph": "◆" } },
  "servant": { "level": null, "tags": null, "stats": [ { "field": "atk", "at": "left", "glyph": "⚔", "color": "#e6b45c" } ] }
}
```

Les couches, de la plus faible à la plus forte : le modèle du moteur pour la catégorie (sinon `default`), puis `default` du mod, puis l'entrée de la catégorie du mod. Une zone fusionne champ par champ avec celle du dessous ; `null` la retire ; une liste (`stats`) remplace.

Les couleurs sont des variables CSS avec la valeur du moteur en secours (`--aw-card-<catégorie>`, `--aw-socket-<couleur>`) : un mod peut aussi les poser dans son `theme.css`. `"style": "classic"` ramène l'ancien dessin (chemin de retour tant que le nouveau n'est pas validé).

Le mod « minimal » écrit : ses couleurs, et un serviteur qui n'affiche que son nom et ses statistiques. Atlas Wanderer n'écrit rien : il joue le modèle par défaut.

## 4. Les chasses

Un serviteur a 0 à 3 chasses (bleue, verte, rouge, chromatique). Une chasse vide est creuse, une chasse occupée est pleine avec un losange ; chaque couleur porte aussi une marque (▲ ■ ● ✦) pour que la couleur ne soit pas la seule différence. Sur le plateau pendant le renfort, chaque chasse est un **bouton** (rôle, focus clavier, étiquette « Châsse 2 (verte) : vide ») :

- clic sur une chasse **vide** : les équipements de la main qui conviennent sont éclairés (le moteur répond : `canEquip`, l'interface ne décide jamais), les autres s'estompent ; un clic sur l'un d'eux équipe, comme le glisser-déposer qui reste possible ; un second clic sur la chasse, ou Échap, annule ;
- clic sur une chasse **occupée** : l'équipement s'affiche à côté du serviteur. Le jeu n'a pas de règle pour retirer un équipement : il n'y a rien d'autre à proposer.

Hors du plateau (offres, catalogue, aperçus) les chasses ne sont que dessinées.

## 5. Où les voir

L'éditeur, onglet « Aperçu des cartes » : toutes les cartes du mod ouvert, avec 0 à 3 chasses vides ou occupées, un nom long, la taille du plateau, les formats paysage. `tools/check-cards.js` vérifie la validation, les couches, le dessin de chaque carte de chaque mod, les chasses et le chemin de retour.

## 6. Ce qui reste écrit en dur dans le dessin (dette de modularité)

- Les formats paysage (choix du héros, donjon) ne lisent dans le modèle que la couleur et la plaque de PV ; leurs zones sont fixes.
- L'anneau de Bouclier, la bombe, la variante dorée (fusion) et le décor de donjon d'un serviteur sont dessinés d'après des noms de mots-clés et de champs d'Atlas Wanderer.
- Le bandeau de types suppose deux groupes de types (espèce à gauche, affectation à droite) pour le champ `types`.
- Les marques de chasses (▲ ■ ● ✦) et leur ordre sont dans `svg.js`.
- La mise en gras du déclencheur dans le texte des pouvoirs repose sur une liste de mots (déjà notée dans la dette de `pouvoirs-modulaires.md`).
