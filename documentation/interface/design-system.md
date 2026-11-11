# Design system d'Atlas Wanderer

Direction artistique : **console de pont**. L'interface est celle d'un système de navigation et de commandement à bord d'un vaisseau : fond d'espace noir, structures fines en cyan instrument, **un seul accent chaud (l'or)** pour l'action principale et la page courante, orange réservé aux outils de développement. La sobriété est voulue : l'effet vient de la cohérence (mêmes coins coupés, mêmes repères d'angle, mêmes étiquettes en capitales), pas de l'éclat de chaque élément.

## Fichiers

| Fichier | Rôle | Chargé par |
|---|---|---|
| `site/tokens.css` | Variables (couleurs, typo, espacements, formes, mouvement), police Oxanium, focus, réduction des animations. Aucune classe de composant. | site et jeu |
| `site/site.css` | Composants du site : en-tête, boutons, puces et onglets, panneaux, formulaires, tableaux, hero, menu mobile. | pages du site |
| `site/catalogue.css` | Murs de cartes (serviteurs, lieutenants, équipements). | pages générées par `tools/generate-servants.js` |
| `site/space.css` | Fond étoilé. | site et jeu |
| `site/fonts/` | Oxanium (licence SIL OFL 1.1), variable, latin et latin-ext, hébergée localement (site statique, aucun CDN pour les polices). | `tokens.css` |
| `prototype/prototype.html` (bloc `<style>`) | Équivalents pour le jeu (`.btn-achat`, consoles, plateaux, calques), construits sur les mêmes variables. L'écran de fin (`.stats`) et la fenêtre de débogage (`#dbg-modal`), composants daisyUI, sont habillés par des règles du même bloc. Le jeu garde daisyUI : `.btn` y est celui de daisyUI, c'est pourquoi `tokens.css` ne définit aucun composant. | jeu |

Les pages générées (`servants.html`, `lieutenants.html`, `equipment.html`) ne se modifient pas à la main : le gabarit est dans `tools/generate-servants.js`.

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

1. Pas de couleur écrite en dur dans une page : on utilise un jeton. Une couleur de type (espèce, archétype) vient de `svg.js` et passe par `--accent` ou `--c`.
2. Deux éléments de même fonction partagent le même composant (les onglets de Test et de l'Éditeur sont les mêmes que ceux des puces).
3. Le texte courant reste en police système ; Oxanium sert aux titres, étiquettes, boutons et chiffres.
4. Cibles tactiles d'au moins 40 px (30 px pour les puces de filtre, denses par nature).
5. Le bloc `<style>` d'une page ne contient que ce qui lui est propre.
6. Les cartes (SVG de `prototype/svg.js`) gardent leurs coins arrondis : ce sont les objets du jeu, posés dans une console aux coins coupés.

## Vérification

`node tools/check-site.js` (fichiers, liens, polices), `node tools/check-render.js` (rendu du jeu ; l'empreinte a été régénérée une fois, les seuls changements du jeu étant des noms de classes CSS), puis un contrôle visuel : le serveur local (`node tools/local-server.js`) et une capture à 1280 px et 390 px des pages du site et des écrans du jeu.
