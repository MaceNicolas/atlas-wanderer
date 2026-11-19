# Design system d'Atlas Wanderer

Direction artistique : **console de pont**. L'interface est celle d'un système de navigation et de commandement à bord d'un vaisseau : fond d'espace noir, structures fines en cyan instrument, **un seul accent chaud (l'or)** pour l'action principale et la page courante, orange réservé aux outils de développement. La sobriété est voulue : l'effet vient de la cohérence (mêmes coins coupés, mêmes repères d'angle, mêmes étiquettes en capitales), pas de l'éclat de chaque élément.

## Fichiers

| Fichier | Rôle | Chargé par |
|---|---|---|
| `site/tokens.css` | Variables (couleurs, typo, espacements, formes, mouvement), police Oxanium, focus, réduction des animations. Aucune classe de composant. | site et jeu |
| `site/site.css` | Composants du site : en-tête, boutons, puces et onglets, panneaux, formulaires, tableaux, hero, menu mobile. | pages du site |
| `site/catalogue.css` | Murs de cartes (serviteurs, heroes, équipements). | pages générées par `tools/generate-servants.js` |
| `site/space.css` | Fond étoilé. | site et jeu |
| `site/fonts/` | Oxanium (licence SIL OFL 1.1), variable, latin et latin-ext, hébergée localement (site statique, aucun CDN pour les polices). | `tokens.css` |
| `prototype/prototype.html` (bloc `<style>`) | Équivalents pour le jeu (`.btn-achat`, consoles, plateaux, calques), construits sur les mêmes variables. L'écran de fin (`.stats`) et la fenêtre de débogage (`#dbg-modal`), composants daisyUI, sont habillés par des règles du même bloc. Le jeu garde daisyUI : `.btn` y est celui de daisyUI, c'est pourquoi `tokens.css` ne définit aucun composant. | jeu |

Les pages générées (`servants.html`, `heroes.html`, `equipment.html`) ne se modifient pas à la main : le gabarit est dans `tools/generate-servants.js`.

## Jetons

- **Surfaces** (du plus sombre au plus clair) : `--space`, `--surface-0` (en-tête, champs), `--surface-1` (panneaux), `--surface-2` (en-têtes de tableau, bulles), `--surface-3` (survol).
- **Lignes** : `--line` (filet), `--line-strong` (survol, cadre des champs).
- **Texte** : `--ink`, `--ink-dim` (secondaire), `--ink-faint` (décor seulement, jamais de l'information).
- **Marque** : `--signal` (cyan : structure, focus, survol), `--gold` (action principale, page courante, couleur de sélection du jeu), `--dev` (orange : Test et Éditeur).
- **Fonctionnel** : `--ok`, `--warn`, `--danger`, `--info`.
- **Typographie** : `--font-display` (Oxanium : titres, étiquettes, boutons, chiffres du HUD), `--font-text` (police système : tout le texte courant), `--font-mono`. Échelle `--fs-xs` à `--fs-3xl`. Étiquettes : capitales, `--track-label`.
- **Espacements** : échelle de 4 px, `--s-1` (4) à `--s-8` (64).
- **Formes** : `--r-1` (3 px, champs), `--r-2` (6 px, panneaux), `--cut` (9 px, coins coupés), hauteurs de contrôle `--ctrl-h` (40) et `--ctrl-h-sm` (30).
- **Mouvement** : `--t-fast` (120 ms), `--t-med` (220 ms), `--ease`. Les animations sont courtes et discrètes ; `prefers-reduced-motion` les coupe toutes.

Les anciens noms (`--or`, `--texte`, `--discret`, `--carte`, `--filet`) restent des alias.

## Composants

- **Panneau** : cadre fin, fond translucide, deux repères d'angle (haut gauche, bas droit) dans `--bracket` (`--accent` si défini, par exemple la couleur d'un type dans les catalogues). Classes : `.grille > div`, `.synthese`, `.boite`, `.types`, `.filtres`, `main section`. Pas de `clip-path` sur un panneau : les cartes dorées des catalogues débordent au survol.
- **Contrôle à coins coupés** : `.bouton`, `.btn`, `.puce`, `.onglets button`, `.sous-onglets button`, `.reinit`. Le `clip-path` coupe deux coins opposés ; la diagonale est redessinée par deux dégradés (une bordure ne suit pas un `clip-path`). Conséquence : pas d'ombre ni d'anneau extérieur sur ces éléments, le focus est tracé à l'intérieur (`outline-offset` négatif) et l'état « armé » du jeu passe par la couleur de bordure.
- **Hiérarchie des boutons** : plein or (`.bouton.plein`, `.btn-or`) = action principale ; contour or (`.bouton`, `.btn-suite`) = suite ; cyan (`.btn-achat`, `.btn.sec`) = neutre ; rouge (`.btn.danger`, `.btn-danger`) = destructeur ; `.btn` orange = outils de développement.
- **Puces et onglets** : un bouton à bascule (`aria-pressed`) s'allume dans sa couleur (`--c`).
- **Champs** : `select`, `input`, `textarea` ; survol et focus en cyan.
- **Tableaux** : `table.t` (consoles de données) et `table.b` ; chiffres tabulaires.
- **Titres de page** : `h1` en capitales avec filet or/cyan ; `.page > h2` précédé d'un losange cyan et suivi d'un filet.
- **États** : `.vide` (état vide, par exemple aucun résultat de filtre), `.boite.alerte`, `.progres` (barre rayée animée), `.ok` / `.ko`, bouton désactivé (opacité réduite, en niveaux de gris).
- **Hero** de l'accueil : réticule de navigation (deux anneaux, un en pointillés qui tourne très lentement) derrière le titre.

## Règles

1. Pas de couleur écrite en dur dans une page : on utilise un jeton. Une couleur de type (espèce, affectation) vient de `svg.js` et passe par `--accent` ou `--c`.
2. Deux éléments de même fonction partagent le même composant (les onglets de Test et de l'Éditeur sont les mêmes que ceux des puces).
3. Le texte courant reste en police système ; Oxanium sert aux titres, étiquettes, boutons et chiffres.
4. Cibles tactiles d'au moins 40 px (30 px pour les puces de filtre, denses par nature).
5. Le bloc `<style>` d'une page ne contient que ce qui lui est propre.
6. Les cartes (SVG de `prototype/svg.js`) sont les objets du jeu, posés dans une console aux coins coupés. Leur forme vient des cadres du mod (voir « Le mod Atlas Wanderer ») : rectangle arrondi pour les grandes cartes, octogone pour les cartes compactes des plateaux.
7. Le moteur ne contient aucune couleur ni forme propre à un jeu : tout ce qui est propre à Atlas Wanderer est une donnée du mod (règle absolue, `documentation/mecaniques/pouvoirs-modulaires.md` § 0).

## Le jeu (moteur, `prototype/`)

Ces règles valent pour tout mod ; un mod les ajuste par ses données (`ui` dans `game.json`, `theme.css`).

### Écrans et structure
- Les écrans (choix du donjon, des héros, renfort `room`, combat `playback`, fin) sont décrits en données (`ui.screens.<nom>.nodes`) et assemblés par `prototype/ui-kit.js` ; les widgets (`offerRow`, `boardRow`, `frameRow`, `handSection`, `heroSlot`, `consoleHead`…) sont la liste fermée de `game-schema.js`.
- Un écran de jeu empile : plateau du haut (offre d'achat en renfort, plateau du Boss en combat), plateau du joueur, main (seul le haut des cartes dépasse), puis une dernière ligne : la carte du donjon (widget `dungeonCard`, avec les PV courants du Boss ; c'est la cible des animations de coups sur le Boss, attribut `data-boss`), la console (niveau, Datacrons, achats en boutons empilés), les deux cartes de héros. La carte du donjon et les cartes de héros ont le même format paysage (400 × 190) et la même largeur (deux cartes).
- Plateaux : `.plateau-donjon` (teinte orange, décor du donjon en filigrane) en haut, `.plateau` (teinte cyan) en bas, chacun avec les repères d'angle. Les formulaires de choix (`.choix-calque`) se posent exactement entre les deux plateaux sur un fond de nébuleuse ; « Masquer » les réduit en bouton.
- Les écrans de jeu (classe `.combat`, partagée par le renfort et le combat) font 1700 px au plus ; les autres pages 1320 px.

### Cartes sur les plateaux
- **Compactes** : l'offre d'achat, le plateau du joueur et les deux plateaux du combat montrent des cartes compactes (illustration, ATQ, PV, mots-clés en pastilles, chasses). Pas de nom ni de texte. Gabarit : `ui.cards.compact` (`documentation/mecaniques/cartes.md` § 8).
- **Complètes** : la main, les héros, les écrans de choix et les catalogues. La carte complète d'une carte compacte apparaît au survol, au focus clavier ou au toucher, dans une boîte fixe (`#carte-pleine`) qui ne reçoit pas la souris et qui ne décale jamais le plateau ; elle reste dans la fenêtre.
- **Taille** : `--card-w` est commun aux plateaux, à la main et à la dernière ligne (donjon, héros). Avec des cartes compactes (classe `compact-boards`), il est calculé pour que deux plateaux, le dépassement de la main et la dernière ligne tiennent dans la hauteur de la fenêtre, et que sept cartes tiennent sur une ligne (minimum 8,5 rem, maximum 18 rem). Variables : `--card-ratio`, `--board-ratio`, `--board-w`, `--peek`.
- **États** : le Bouclier actif = halo cyan qui suit la forme du cadre ; un mot-clé utilisé reste affiché, estompé ; sélection, cible et carte cliquable = halo de couleur (`.halo`, `.halo-hover`, couleur `--halo`) qui suit l'octogone, jamais un anneau rectangulaire ; carte non jouable = opacité 40 %.

### Interaction
- **Souris** : survol = carte complète ; glisser-déposer natif pour placer, réordonner, équiper ; l'offre se glisse sur la main (`choices.offer.dragToHand`) ou aussi sur le plateau (`dragToBoard`). Repères de dépôt : barre gauche ou droite (`.drop-l`, `.drop-r`), contour plein (`.drop-on`), contour en pointillés (`.drop-zone`), tous en `--signal`.
- **Toucher** : un premier appui sur une carte qui agit la montre en grand, un second agit ; un doigt qui bouge une carte rejoue les événements de glisser-déposer (le navigateur n'en a pas au toucher). Une carte déplaçable bloque le défilement sous le doigt.
- **Clavier** : les cartes compactes ont le focus (`tabindex`), le focus montre la carte complète ; Échap annule un équipement en cours et ferme les fenêtres.

### Boutons du jeu
- `.btn-achat` (cyan, neutre), `.btn-suite` (contour or), `.btn-or` (plein or, action principale), `.btn-danger` (rouge), `.btn-petit` et `.btn-compact` (tailles). Coins coupés par `clip-path` : pas d'anneau extérieur, l'état « armé » passe par la bordure.

### Langue et sons
- Tout texte joueur existe en français et en anglais ; les cartes lisent leurs textes dans `data/i18n` et dans les textes du mod. Les sons et effets sont des données (`ui.sounds`, `ui.effects`).

## Le mod Atlas Wanderer (`data/atlas-wanderer/`)

### Thème
- `theme.css` ne déclare que des variables sur `:root[data-theme]` (règle des mods) : couleur principale du jeu = le jaune du contour de sélection (`--p`), arrondis `--rounded-box` = `--r-2`, `--rounded-btn` et `--rounded-badge` = `--r-1`. Le reste vient de `tokens.css`.
- Couleurs de carte réglables depuis le thème : `--aw-card-<catégorie>` et `--aw-socket-<couleur>` (valeurs par défaut du moteur : serviteur `#78d9f4`, équipement `#f3c16b`, héros `#d99df5`, donjon `#f08b6a` ; chasses bleue `#56c9ff`, verte `#73ec7d`, rouge `#ff707b`, chromatique en dégradé, or `#e6b45c`).

### Types
- **Espèces** (couleur propre, icône pleine dans un badge hexagonal) : Elk `#4FC49A`, Dwork `#c4622d`, Droïde `#4fb3d9`, Sorvane `#8B6CFF`, Ryskan `#E5B83F`, Nythe `#e56b9a`.
- **Affectations** (icône au trait, couleur par famille : navigation, soutien, tactique) : Pilote, Ingénieur, Médecin, Sécurité, Explorateur, Artilleur, Renseignement, Roboticien, Diplomate.
- Un serviteur a une espèce et une affectation ; sur la carte, l'espèce est en haut du groupe de badges et l'affectation dessous. Le badge de type remplit son hexagone dans un anneau de la couleur du type, avec un reflet.
- Source : `vocabulary.json` ; documentation : `documentation/types/`.

### Cadres des cartes (kit sobre, `frames/`)
- **Silhouette commune** : toutes les cartes sont un octogone aux coins coupés à 45° (la coupe fait 18 % de la largeur sur la compacte, 108 sur 800 sur la grande), pour que les plaques d'ATQ et de PV épousent le contour. Une seule bordure : un trait d'acier (dégradé unique sur toute la carte, 4 unités sur la compacte, 9,8 sur la grande) posé sur un liseré sombre `#152439` deux fois plus épais. Le contour, les plaques d'ATQ et de PV, les bordures de l'illustration (grandes cartes) et les anneaux des hexagones de type et de niveau sont **un seul élément** : même dégradé, liseré derrière le cadre et acier devant, donc sans raccord visible. Il n'y a aucune autre bordure intérieure (ni filet, ni cadre autour des panneaux de titre et de pouvoirs).
- **Grandes cartes** : `servant.svg` (et `servant-fusion.svg` pour le serviteur doré par fusion), `equipment.svg`, `hero.svg`, repère 800 × 1320 (ratio 1,65). L'illustration occupe toute la largeur, entre deux bordures d'acier horizontales fondues dans le contour (fenêtre transparente). Le fond est uni ; les plaques d'ATQ (or) et de PV (rouge) sont celles de la compacte, agrandies d'un seul facteur (108 / 44) pour que leur coin coïncide avec la coupe du contour. Les types, le niveau, les nombres, les chasses et la marque de couleur de l'équipement sont dessinés par-dessus d'après les données (zones en pourcentage dans `ui.cards.<catégorie>`). Le premier type est en haut à gauche et le niveau en haut à droite : le sommet haut de leurs côtés touche le haut de l'image, et le second type est en bas à gauche, son sommet bas touchant le bas de l'image. Le niveau a la taille d'un badge de type.
- **Cartes compactes** : `compact.svg` (serviteurs : octogone argenté, plaque d'ATQ dorée à gauche, plaque de PV rouge à droite, calées exactement sur le contour) et `compact-equipment.svg` (même octogone sans plaques), repère 240 × 292 (ratio 1,217). L'illustration remplit tout l'octogone (`art.clip`), nombres blancs cerclés de noir centrés dans leurs plaques (ils rétrécissent au-delà de deux chiffres). Le niveau (hexagone à bordure d'acier, entre les deux plaques) n'est dessiné que dans l'offre d'achat (`level.offerOnly`). Les pastilles de mots-clés, les chasses et le halo du Bouclier ne sont pas dessinés pour le moment (interrupteurs `HIDE_SLOTS_AND_KEYWORD_ICONS` et `HIDE_POWER_GRAPHICS` de `prototype/svg.js` : les pouvoirs sont à étudier).
- Les anciens cadres peints (kit V9, `.webp`) restent dans `frames/`, inutilisés.
- Les cartes de donjon et de héros en paysage (choix) restent vectorielles.

### Illustrations
- Une image par carte dans `images/<catégorie>/`, convertie en webp ; recadrage et alignement par carte (`images.js`). Sans image, la carte montre l'emblème de ses types. Les cartes de Boss et de mini-boss n'ont pas encore d'illustration (prévues).

### Couleurs de fonctionnement
- Boutons : or pour l'action principale, cyan pour le neutre, rouge pour le destructeur (voir plus haut). Le héros a un cadre violet, les plateaux du Boss un cadre orange, les plateaux du joueur un cadre cyan. Dégâts en rouge, soins et Bouclier en cyan, Datacrons en or.

## Vérification

`node tools/check-site.js` (fichiers, liens, polices), `node tools/check-render.js` (empreinte des écrans du jeu ; `--write` après un changement voulu), `./tools/verify-all.sh` avant un commit, puis un contrôle visuel : le serveur local (`node tools/local-server.js`) et une capture à 1280 px et 390 px des pages du site et des écrans du jeu.
