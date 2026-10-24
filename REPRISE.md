# Reprise — Atlas Wanderer

Session du 22 au 23 octobre 2026. Ce fichier résume où en est le projet, ce qui a été décidé, ce qui n'est pas encore reporté dans la documentation et ce qu'on pourrait faire ensuite. Les règles de référence restent dans `NEW_IDEAS.md`.

## Par où reprendre

1. Lire `NEW_IDEAS.md` (règles), puis ce fichier.
2. Ouvrir `index.html` (racine : présentation, règles, serviteurs) puis le lien vers `prototype/prototype.html`, ou directement ce dernier, pour jouer (connexion nécessaire : Tailwind et daisyUI viennent d'un CDN). `apercu.html` (à la racine) montre les graphismes SVG.
3. Le dernier commit poussé est `c7de76a`. Rien n'est en attente de commit, sauf ce fichier.

## Décisions de la session

### Économie du renfort (reportées dans `NEW_IDEAS.md`, sections 2, 3, 4, 8 et 13)

- Monnaie unique, **Datacron** (nom provisoire). Revenu variable selon la salle, **conservé** d'un renfort à l'autre.
- **Aucun choix gratuit, pas de relance, pas de prix par rang.** Trois boutons, 1 Datacron chacun : **Niveau**, **Serviteur**, **Équipement**.
- Un achat de serviteur ou d'équipement **tire 3 cartes au hasard** (pool infini), le joueur en choisit une. Le Datacron est payé à l'ouverture du choix : pas d'annulation, sinon ce serait une relance gratuite.
- **Niveau de renfort** : contributions progressives, N+1 Datacrons pour passer du niveau N au niveau N+1. Il fixe le rang maximum des propositions.
- **Main** de 7 emplacements, serviteurs et équipements confondus. Le joueur pose lui-même les cartes sur le plateau.
- **Fusion simple** : trois serviteurs identiques (plateau et main) donnent un doré (statistiques additionnées, valeurs de compétence doublées), puis un choix parmi trois serviteurs de rang niveau + 1 (plafonné à 5).
- **Plateau vide au départ** : les héros n'ont plus de serviteur attitré « pour le moment » (sections 3 et 5 corrigées). Le jeu commence par un renfort.
- Idées abandonnées ajoutées en section 13 : deux choix gratuits, renoncements, relances et prix par rang.

### Types (prototype uniquement, pas encore dans `NEW_IDEAS.md`)

- Les types provisoires du premier jet sont remplacés par les types documentés dans `documentation/types/` :
  - **Espèces** : Alien (générique, par défaut), Elk, Dwork, Droïde, Félin (nom provisoire).
  - **Archétypes** : les dix, dont le Diplomate (bonus aux alliés adjacents).
  - **Règle** : chaque serviteur a une espèce et un archétype obligatoire. Les héros en ont aussi un de chaque.
- Contenu du prototype : 62 serviteurs (une gamme de 5 rangs par archétype avec des espèces réparties, plus 12 espèce + archétype), 5 héros (un par espèce, chacun avec un archétype), 2 donjons (le Nid de la Reine apporte Xénobiologiste, la Station Oméga apporte Droïde).
- Pour exprimer les archétypes, 4 effets de début de combat ont été ajoutés : invocation d'une sonde (Roboticien ; l'équipement « Chargeur de sondes » leur donne +1/+1), retrait d'ATQ à un ennemi (Renseignement), bonus par type différent dans l'équipe (Explorateur), bonus à un allié équipé (Ingénieur). Le Médecin donne des bonus de PV au lieu de soigner, pour ne pas créer de déclencheur « après une attaque ».

### Équipements à effet

- Un équipement peut donner une compétence à son porteur (effet de renfort permanent, effet de combat valable pour le combat). Huit équipements existent (Adrénaline, Module de croissance, Stimulants de choc, Nano-ruche, Charge de rupture, Injecteur de combat, Matrice évolutive, Balise de commandement).
- Les cartes en trop se **jettent** depuis la main (gratuit, avec confirmation).

### Difficulté et longueur

- Donjon d'au moins une quinzaine de salles. PV des Boss : 250 (La Reine-Mère) et 200 (Intelligence Oméga). Les ennemis gagnent en rang, en nombre et en bonus plus vite (constantes `ENEMY`, `INCOME` et PV des Boss dans `prototype/donnees.js`).
- Mesures faites avec un joueur automatique simple, sur plusieurs centaines de parties :
  - avant les équipements à effet : environ 15 % de victoires, durée médiane autour de 17 salles, victoire la plus courte autour de 11 ;
  - après les équipements à effet : environ 28 % de victoires, durée moyenne d'une victoire autour de 26 salles.
- Le niveau de renfort pèse beaucoup sur l'issue (4 % de victoires si on monte rarement de niveau, 61 % si on investit beaucoup), ce qui donne un vrai poids à l'économie.

### Graphismes (`prototype/svg.js`)

- Emblèmes pleins pour les espèces, icônes au trait pour les archétypes, couleurs par espèce, et par famille d'archétypes (navigation, soutien, tactique).
- Les cartes de serviteur et d'équipement sont en SVG. Chaque mot-clé est écrit sur la carte (nom et rappel de règle). Un mot-clé consommé est grisé et barré, et un Bouclier divin actif entoure la carte d'un halo cyan.
- Plus d'icône pour l'attaque et les PV, seulement deux pastilles de couleur avec un chiffre.
- Le bouton du niveau est grisé (« Niveau max ») au niveau maximum.

## Pas encore reporté dans `NEW_IDEAS.md`

- La longueur d'un donjon (quinzaine de salles au minimum) : la section 3 la garde ouverte.
- Les équipements à effet (compétence portée par l'équipement) et le fait de jeter une carte de la main.
- La liste de types du prototype et les 4 nouveaux effets.
- Le revenu par salle (3 à 5 Datacrons, table de 20 salles) et le coût du niveau, qui sont des valeurs de test.

## Points ouverts

- **Durée** : une victoire peut encore arriver vers 11 salles quand le plateau devient très fort tôt. Garantir 15 salles demanderait une règle (plafond de dégâts au Boss par salle, par exemple), non décidée.
- **Équilibre** : les effets de renfort permanents, qui se cumulent à chaque salle, rendent le jeu plus facile. À affaiblir ou à compenser côté ennemis après des parties humaines.
- **Fusion** : fréquence réelle à observer à la main (sans relance, elle est rare), et calcul des statistiques et des équipements du doré.
- **Main** : moment de la pose, sort pendant le combat, reprise d'un serviteur du plateau.
- **Serviteur attitré du héros** : abandonné « pour le moment ». À reprendre ou à ranger en section 13.
- **Vocabulaire** : nom définitif de la monnaie, nom des félins, nom du doré, « module » ou « pont » pour les parties du vaisseau.
- **Graphismes** : icône de l'Elk peu lisible en petit, cartes un peu vides en bas quand elles n'ont ni mot-clé ni compétence, panneaux de héros et de Boss à habiller.

## Pistes pour la prochaine fois

1. Jouer quelques parties à la main et noter le ressenti : revenu, coût du niveau, fusions, difficulté.
2. Reporter dans `NEW_IDEAS.md` ce qui est stabilisé (liste ci-dessus).
3. Retoucher les icônes (Elk) et habiller les panneaux de héros et de Boss.
4. Rédiger les sections « Dans le jeu » des fiches d'espèces, puis nommer les félins.
5. Conserver un script de simulation dans le dépôt (les essais de cette session utilisaient des scripts temporaires, non versionnés) pour mesurer l'équilibre après chaque changement.
6. Découper `NEW_IDEAS.md` vers `documentation/mecaniques/`.

## Ajouts du 23 octobre 2026 (suite)

- **Boss à trois plateaux** : trois plateaux indépendants renforcés comme un joueur avant chaque salle, un seul présenté par salle (jamais le même deux fois de suite), revenu réduit de 1, de 1 une fois sur deux, ou égal. Deux types cachés au hasard à chaque partie. Règle reportée dans `NEW_IDEAS.md`, section 5. Code : `makeTeam`, `aiRenfort` et `bossRenfort` dans `prototype/moteur.js`, `BOSS_BOARDS` dans `prototype/donnees.js`.
- **Espèce par défaut** : Alien (ancien Humain).
- **Interface** : choix du donjon puis des lieutenants sur deux écrans, quatre donjons avec décors SVG (deux, la Cité des Profondeurs et la Forge de Brasier-Roc, sont à valider), glisser-déposer pour poser, équiper et ordonner, mode débogage (icône en bas à gauche).
- **À faire** : mesurer l'équilibre du Boss à trois plateaux (une simulation rapide donnait environ un tiers de victoires et des parties longues), tester sur écran tactile, valider les pouvoirs de Boss Écho et Blindage.
