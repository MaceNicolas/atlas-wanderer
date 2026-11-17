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

- Les formats paysage (choix du héros, donjon ; ils sont aussi dans la dernière ligne de l'écran de jeu) ne lisent dans le modèle que la plaque de PV ; leurs zones sont fixes. Ils reprennent les couleurs des cartes normales et compactes : fond noir neutre, bordure unique en acier nacré (bande sombre sous un filet d'acier, doré quand la carte est sélectionnée), types en hexagones à bordure d'acier, texte blanc cerné de sombre, plaque de PV noire à filet nacré. Le donjon est au même format que le héros (400 × 190, paysage : décor à gauche, texte à droite).
- L'anneau de Bouclier, la bombe, la variante dorée (fusion) et le décor de donjon d'un serviteur sont dessinés d'après des noms de mots-clés et de champs d'Atlas Wanderer.
- Le bandeau de types suppose deux groupes de types (espèce à gauche, affectation à droite) pour le champ `types`.
- Les marques de chasses (▲ ■ ● ✦) et leur ordre sont dans `svg.js`.
- La mise en gras du déclencheur dans le texte des pouvoirs repose sur une liste de mots (déjà notée dans la dette de `pouvoirs-modulaires.md`).

## 7. Cadres illustrés (kit V9) : la clé `frame`

Une catégorie dont la mise en page contient `frame` est dessinée sur une **image de cadre du mod** (dans son dossier, par exemple `frames/hero.webp`) : l'illustration est derrière le cadre, dont les fenêtres la montrent ; le texte et les chiffres sont écrits par-dessus. Le moteur n'embarque aucun cadre : ce sont des assets du mod.

- `frame.image` : le fichier du mod. `frame.variantField` + `frame.variants` : une variante selon la valeur d'un champ, par une autre image (`image`) ou par une rotation de teinte du même cadre (`hue`, en degrés). Atlas Wanderer n'a que les cadres orange et vert pour les équipements : le bleu (+180°) et le rouge (-25°) sont des rotations de teinte, remplaçables plus tard par de vrais cadres en changeant seulement les données.
- Avec `frame`, chaque zone dit où elle est : `box: { x, y, w, h }` en pourcentage de la carte (largeur 300, hauteur 300 × `frame.ratio`, 4/3 par défaut). Zones lues : `art`, `title`, `tags` (petits carrés d'icônes de types, nom en info-bulle), `level` (hexagone avec autant de chevrons que le niveau, de 1 à 6), `body` (les pouvoirs, centrés dans leur zone ; `size` en unités de la carte), `stats` (un chiffre à `x`, `y`, avec `signed` pour un bonus, `size`, `glyph`).
- Le cadre porte déjà ses plaques d'ATQ et de PV (le moteur n'y dessine que les nombres) ; les anneaux des hexagones de type et de niveau sont dessinés par le moteur dans le même acier que le cadre (voir `border` ci-dessous).
- Atlas Wanderer l'utilise pour ses **serviteurs, héros et équipements**. Le cadre serviteur du kit avait ses trois chasses (bleue, verte, rouge) peintes dans l'image : elles ont été **effacées de l'image** (`frames/servant.webp`) : le haut des chasses, dans la fenêtre, est rendu transparent, et la barre de métal qu'elles cachaient est reconstruite à partir du métal voisin. Les chasses sont dessinées par-dessus à l'exécution (`sockets`, avec `box` = centre de la chasse du milieu, `w` = largeur, `step` = écart entre deux), donc elles suivent les données : 0 à 3 chasses, n'importe quelles couleurs, vides ou occupées, boutons cliquables. Si le cadre est un jour redessiné, il suffit de changer l'image et les positions.
- `level.cover: true` recouvre un hexagone de niveau peint dans le cadre (les cadres du kit sobre n'en ont plus). `level.border` et `tags.border` (`true`, ou `{ steel }` = épaisseur du trait d'acier) ajoutent à l'hexagone la bordure d'acier du cadre : le liseré sombre est dessiné derrière l'image du cadre, le trait d'acier devant, avec le dégradé du cadre, pour que l'anneau et le contour se fondent. `level.offerOnly: true` (compacte) ne dessine le niveau que dans l'offre d'achat ; `level.lift` relève l'hexagone au-dessus de sa boîte (fraction de sa hauteur). `tags.step` décale le second type (en bas à gauche de l'image sur les cartes d'Atlas Wanderer).
- Variante dorée (fusion) : `variantField: "gold"` avec `variants: { "true": { "hue": -150 } }`. Les médaillons peints (épée, cœur) tournent aussi de teinte, ce qui se voit sur la carte dorée.
- La bombe est dessinée par-dessus le cadre (l'anneau de Bouclier est coupé par l'interrupteur `HIDE_POWER_GRAPHICS` de `prototype/svg.js`, le temps d'étudier les pouvoirs). La page dimensionne ses rangées avec `--card-ratio` (hauteur / largeur de la carte : `frame.ratio`, ou 330/200 en vectoriel), posée par le jeu d'après la mise en page des serviteurs.
- **Hauteur des anciennes cartes :** les trois cadres d'Atlas Wanderer ont été **allongés dans leur panneau de texte** (la partie vide entre l'illustration et les plaques d'attaque et de PV) pour avoir exactement le format des anciennes cartes, `ratio: 1.65` (330 / 200). L'allongement étire une bande de 100 px du panneau, uniforme, donc sans raccord visible ; le texte des pouvoirs y gagne beaucoup de place.
- Les formats paysage (choix du héros, donjon) restent vectoriels.

Limites connues : le texte des pouvoirs a une zone d'environ 17 % de la hauteur ; il prend la plus grande taille qui tient (jusqu'à 10) ; les icônes de types remplacent le bandeau de noms (le nom est en info-bulle) ; le dessin vectoriel reste disponible (`"style": "classic"`, ou en retirant `frame`). Au format du plateau (cartes d'environ 140 px de large) le texte fait la même taille (autour de 8 px) que sur les anciennes cartes.

## 8. Cartes compactes des plateaux : la clé `compact`

Les plateaux (l'offre d'achat, le plateau du joueur, les deux plateaux du combat) montrent des **cartes compactes** : seulement l'illustration, les statistiques et les mots-clés, sur un petit cadre octogonal. La **carte complète** apparaît au-dessus au survol (souris), au focus clavier ou au toucher. Rien ne bouge au survol : la carte complète est une boîte fixe (`#carte-pleine`), qui ne reçoit pas la souris. La main, les héros et les écrans de choix gardent les cartes complètes.

Le gabarit compact est une donnée du mod : `ui.cards.compact.<catégorie>` (`servant`, `equipment`), au même format qu'un gabarit à cadre (§ 7). Une catégorie sans entrée compacte est dessinée en grand, comme avant (un mod qui n'écrit rien n'a rien à changer). Contrairement aux gabarits complets, il n'y a **pas de modèle par défaut du moteur** : seules les zones listées sont dessinées.

- `frame` : le cadre, avec `ratio` (hauteur / largeur). Atlas Wanderer : `frames/compact.svg` (serviteurs, avec les deux plaques d'attaque et de PV) et `frames/compact-equipment.svg` (sans plaques), repère 240 × 292, livrés par le graphiste dans `temp/atlas-wanderer-plateau-kit`.
- `level` : voir § 7 (`offerOnly`, `border`, `lift`) ; dans l'offre d'achat, l'hexagone de niveau est entre les deux plaques.
- `art.clip` : polygone `[[x, y], …]` en pourcentage de la carte qui découpe l'illustration (la fenêtre octogonale). Sans lui, la fenêtre est le rectangle `art.box`.
- `stats[].maxw` : largeur maximale du nombre, en pourcentage de la carte. Au-delà de deux chiffres, le nombre rétrécit pour rester dans sa plaque.
- `tags` : les types, en colonne d'hexagones à gauche (même principe que les châsses à droite) : `fields`, `bare`, `border`, `box` (`x`, `y` = centre du premier, `w`, `h`), `step` (décalage du suivant). Atlas Wanderer les place en miroir des châsses (x = 100 − celui des châsses), le premier en haut, comme sur la carte complète.
- `keywords` : sert uniquement à placer la colonne de châsses (`withSockets`) : `box` (`x`, `y` = centre de la première, `w` = diamètre), `step` (décalage de la suivante), `max`. Les mots-clés n'ont pas d'icône (supprimées le 17 novembre 2026). Le Bouclier actif ajoute un halo qui suit l'octogone.
- `sockets` et `mark` : comme sur la carte complète (les chasses restent cliquables pendant le renfort).

**Taille.** La page ajoute la classe `compact-boards` quand le mod a un gabarit compact pour les serviteurs, et la variable `--board-ratio`. La largeur des cartes (`--card-w`, commune aux plateaux, à la main et à la dernière ligne) est alors calculée avec la hauteur des cartes compactes (deux plateaux, le dépassement de la main, la dernière ligne : donjon, console, héros) : les cartes sont plus grandes pour la même hauteur d'écran. Les écrans de jeu passent aussi à 1700 px de large au maximum (contre 1320 px) pour que sept cartes tiennent sur une seule ligne.

**À savoir.** Les halos de sélection (cible, carte cliquable) deviennent des `drop-shadow` qui suivent l'octogone, pas des anneaux rectangulaires. Au toucher, un premier appui sur une carte à action (offre d'achat, cible) montre la carte complète sans agir ; un second appui agit. On peut aussi **glisser** une carte du doigt : l'offre se dépose sur la main pour l'acheter (`choices.offer.dragToHand: true`, ou `dragToBoard` pour aussi la poser sur le plateau), les cartes de la main et du plateau se déplacent comme à la souris (le code rejoue les événements de glisser-déposer du navigateur, qui n'existent pas au toucher : section « Touch » de `ui.js`). Sur une carte déplaçable, le doigt ne fait plus défiler la page (`touch-action: none`).
