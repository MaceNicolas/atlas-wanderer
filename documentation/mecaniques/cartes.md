# Les cartes : un modèle par défaut, réécrivable par le mod

Brouillon du 12 novembre 2026. Les cartes (serviteurs, équipements, héros, donjons) partagent une identité graphique : cadre à coins coupés, hexagone d'icône en haut, bandeau de nom, plaques de statistiques hexagonales, chasses hexagonales. Deux dessins existent. Le dessin **vectoriel** (kit « cartes-v2 ») est celui du moteur par défaut. Le dessin **sur cadre illustré** (kit « v9 », images PNG/WebP avec fenêtres transparentes) est choisi par le mod, catégorie par catégorie (§ 7). Les kits restent dans `temp/`, non versionnés.

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

## 7. Cadres illustrés (kit V9) : la clé `frame`

Une catégorie dont la mise en page contient `frame` est dessinée sur une **image de cadre du mod** (dans son dossier, par exemple `frames/hero.webp`) : l'illustration est derrière le cadre, dont les fenêtres la montrent ; le texte et les chiffres sont écrits par-dessus. Le moteur n'embarque aucun cadre : ce sont des assets du mod.

- `frame.image` : le fichier du mod. `frame.variantField` + `frame.variants` : une variante selon la valeur d'un champ, par une autre image (`image`) ou par une rotation de teinte du même cadre (`hue`, en degrés). Atlas Wanderer n'a que les cadres orange et vert pour les équipements : le bleu (+180°) et le rouge (-25°) sont des rotations de teinte, remplaçables plus tard par de vrais cadres en changeant seulement les données.
- Avec `frame`, chaque zone dit où elle est : `box: { x, y, w, h }` en pourcentage de la carte (largeur 300, hauteur 300 × `frame.ratio`, 4/3 par défaut). Zones lues : `art`, `title`, `tags` (petits carrés d'icônes de types, nom en info-bulle), `level` (hexagone avec autant de chevrons que le niveau, de 1 à 6), `body` (les pouvoirs, centrés dans leur zone ; `size` en unités de la carte), `stats` (un chiffre à `x`, `y`, avec `signed` pour un bonus, `size`, `glyph`).
- Le cadre porte déjà ses médaillons : on ne redessine ni bandeau ni plaques.
- Atlas Wanderer l'utilise pour ses **serviteurs, héros et équipements**. Le cadre serviteur du kit avait ses trois chasses (bleue, verte, rouge) peintes dans l'image : elles ont été **effacées de l'image** (`frames/servant.webp`) : le haut des chasses, dans la fenêtre, est rendu transparent, et la barre de métal qu'elles cachaient est reconstruite à partir du métal voisin. Les chasses sont dessinées par-dessus à l'exécution (`sockets`, avec `box` = centre de la chasse du milieu, `w` = largeur, `step` = écart entre deux), donc elles suivent les données : 0 à 3 chasses, n'importe quelles couleurs, vides ou occupées, boutons cliquables. Si le cadre est un jour redessiné, il suffit de changer l'image et les positions.
- Le cadre serviteur contient déjà un hexagone de niveau avec trois chevrons peints : `level.cover: true` le recouvre et dessine les chevrons du bon niveau.
- Variante dorée (fusion) : `variantField: "gold"` avec `variants: { "true": { "hue": -150 } }`. Les médaillons peints (épée, cœur) tournent aussi de teinte, ce qui se voit sur la carte dorée.
- L'anneau de Bouclier et la bombe sont dessinés par-dessus le cadre. La page dimensionne ses rangées avec `--card-ratio` (hauteur / largeur de la carte : `frame.ratio`, ou 330/200 en vectoriel), posée par le jeu d'après la mise en page des serviteurs.
- **Hauteur des anciennes cartes :** les trois cadres d'Atlas Wanderer ont été **allongés dans leur panneau de texte** (la partie vide entre l'illustration et les plaques d'attaque et de PV) pour avoir exactement le format des anciennes cartes, `ratio: 1.65` (330 / 200). L'allongement étire une bande de 100 px du panneau, uniforme, donc sans raccord visible ; le texte des pouvoirs y gagne beaucoup de place.
- Les formats paysage (choix du héros, donjon) restent vectoriels.

Limites connues : le texte des pouvoirs a une zone d'environ 17 % de la hauteur ; il prend la plus grande taille qui tient (jusqu'à 10) ; les icônes de types remplacent le bandeau de noms (le nom est en info-bulle) ; le dessin vectoriel reste disponible (`"style": "classic"`, ou en retirant `frame`). Au format du plateau (cartes d'environ 140 px de large) le texte fait la même taille (autour de 8 px) que sur les anciennes cartes.
