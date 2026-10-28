# Reprise — Atlas Wanderer

Session du 22 au 23 octobre 2026. Ce fichier résume où en est le projet, ce qui a été décidé, ce qui n'est pas encore reporté dans la documentation et ce qu'on pourrait faire ensuite. Les règles de référence restent dans `NEW_IDEAS.md`.

## Par où reprendre

1. Lire `NEW_IDEAS.md` (règles), puis ce fichier.
2. Ouvrir `index.html` (racine : présentation, règles, serviteurs) puis le lien vers `prototype/prototype.html`, ou directement ce dernier, pour jouer (connexion nécessaire : Tailwind et daisyUI viennent d'un CDN). `apercu.html` (à la racine) montre les graphismes SVG.
3. Le dernier commit de code est `d41f301` (voir `git log` pour la suite). Les sections datées en bas de ce fichier priment sur les chiffres plus anciens (nombre de serviteurs, vocabulaire).

## Décisions de la session

### Économie du renfort (reportées dans `NEW_IDEAS.md`, sections 2, 3, 4, 8 et 13)

- Monnaie unique, **Datacron** (nom provisoire). Revenu variable selon la salle, **conservé** d'un renfort à l'autre.
- **Aucun choix gratuit, pas de relance, pas de prix par rang.** Trois boutons, 1 Datacron chacun : **Niveau**, **Serviteur**, **Équipement**.
- Un achat de serviteur ou d'équipement **tire des cartes au hasard** (pool infini ; 3 au niveau de renfort 1, 4 aux niveaux 2-3, 5 dès le niveau 4), le joueur en choisit une. Le Datacron est payé à l'ouverture du choix : pas d'annulation, sinon ce serait une relance gratuite.
- **Niveau de renfort** : contributions progressives, N+1 Datacrons pour passer du niveau N au niveau N+1. Il fixe le rang maximum des propositions.
- **Main** de 7 emplacements, serviteurs et équipements confondus. Le joueur pose lui-même les cartes sur le plateau.
- **Fusion simple** : trois serviteurs identiques (plateau et main) donnent un doré (statistiques additionnées, valeurs de compétence doublées), puis un choix parmi trois serviteurs de rang niveau + 1 (plafonné à 5).
- **Plateau vide au départ** : les héros n'ont plus de serviteur attitré « pour le moment » (sections 3 et 5 corrigées). Le jeu commence par un renfort.
- Idées abandonnées ajoutées en section 13 : deux choix gratuits, renoncements, relances et prix par rang.

### Types (prototype uniquement, pas encore dans `NEW_IDEAS.md`)

- Les types provisoires du premier jet sont remplacés par les types documentés dans `documentation/types/` :
  - **Espèces** : Alien (générique, par défaut), Elk, Dwork, Droïde, Sorvane (remplace les félins), Ryskan, Nythe.
  - **Archétypes** : les dix, dont le Diplomate (bonus aux alliés adjacents).
  - **Règle** : chaque serviteur a une espèce et un archétype obligatoire. Les héros en ont aussi un de chaque.
- Contenu du prototype : 62 serviteurs (une gamme de 5 rangs par archétype avec des espèces réparties, plus 12 espèce + archétype), 5 héros (un par espèce, chacun avec un archétype), 2 donjons (le Nid de la Reine apporte Xénobiologiste, la Station Oméga apporte Droïde).
- Pour exprimer les archétypes, 4 effets de début de combat ont été ajoutés : invocation d'un drone (Roboticien ; l'équipement « Chargeur de drones » leur donne +1/+1), retrait d'ATQ à un ennemi (Renseignement), bonus par type différent dans l'équipe (Explorateur), bonus à un allié équipé (Ingénieur). Le Médecin donne des bonus de PV au lieu de soigner, pour ne pas créer de déclencheur « après une attaque ».

### Équipements à effet

- Un équipement peut donner une compétence à son porteur (effet de renfort permanent, effet de combat valable pour le combat). Sept équipements existent (Adrénaline, Module de croissance, Stimulants de choc, Nano-ruche, Charge de rupture, Injecteur de combat, Balise de commandement).
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
- **Vocabulaire** : nom définitif de la monnaie, nom du doré, « module » ou « pont » pour les parties du vaisseau.
- **Graphismes** : icône de l'Elk peu lisible en petit, cartes un peu vides en bas quand elles n'ont ni mot-clé ni compétence, panneaux de héros et de Boss à habiller.

## Pistes pour la prochaine fois

1. Jouer quelques parties à la main et noter le ressenti : revenu, coût du niveau, fusions, difficulté.
2. Reporter dans `NEW_IDEAS.md` ce qui est stabilisé (liste ci-dessus).
3. Retoucher les icônes (Elk) et habiller les panneaux de héros et de Boss.
4. Rédiger les sections « Dans le jeu » des fiches d'espèces, puis confirmer le nom Sorvane.
5. Conserver un script de simulation dans le dépôt (les essais de cette session utilisaient des scripts temporaires, non versionnés) pour mesurer l'équilibre après chaque changement.
6. Découper `NEW_IDEAS.md` vers `documentation/mecaniques/`.

## Ajouts du 23 octobre 2026 (suite)

- **Boss à trois plateaux** : trois plateaux indépendants renforcés comme un joueur avant chaque salle, un seul présenté par salle (jamais le même deux fois de suite), revenu réduit de 1, de 1 une fois sur deux, ou égal. Deux types cachés au hasard à chaque partie. Règle reportée dans `NEW_IDEAS.md`, section 5. Code : `makeTeam`, `aiRenfort` et `bossRenfort` dans `prototype/moteur.js`, `BOSS_BOARDS` dans `prototype/donnees.js`.
- **Espèce par défaut** : Alien (ancien Humain).
- **Interface** : choix du donjon puis des lieutenants sur deux écrans, quatre donjons avec décors SVG (deux, la Cité des Profondeurs et la Forge de Brasier-Roc, sont à valider), glisser-déposer pour poser, équiper et ordonner, mode débogage (icône en bas à gauche).
- **À faire** : mesurer l'équilibre du Boss à trois plateaux (une simulation rapide donnait environ un tiers de victoires et des parties longues), tester sur écran tactile, valider les pouvoirs de Boss Écho et Blindage.

## Ajouts du 25 octobre 2026

### Règles et cartes modifiées (code, `NEW_IDEAS.md`, `CARTES.md` à jour)

- **Propositions du renfort** : 3 au niveau de renfort 1, 4 aux niveaux 2-3, 5 dès le niveau 4, pour les serviteurs **et** les équipements. La récompense de fusion reste à 3. Les plateaux du Boss suivent la même règle. Code : `renfortProposals` (`donnees.js`) et `drawCards` (`moteur.js`).
- **Maître-canonnier** (ex-Canonnier) : Dwork, À distance, détruit le Bouclier divin de sa cible avant de l'attaquer (hypothèse : « protection » = Bouclier divin, à confirmer). Effet `breakShield`.
- **Tireur d'élite** : Sorvane, À distance, « Cible : l'ennemi avec le moins de points de vie ». Le critère « Bouclier divin en priorité » a disparu du code.
- **Bombardier** : 5/7, sans À distance, pose 2 bombes de 5 dégâts sur des ennemis différents au début du combat. Un serviteur piégé qui doit attaquer n'attaque pas : sa bombe explose et ne blesse que lui (le Bouclier divin l'absorbe), son tour est consommé. Effet `plantBombs`, champ `bomb` sur le serviteur, pastille sur la carte. Les autres cartes à bombes restent à créer (le mécanisme est générique : nombre et dégâts réglables par carte).
- **Sondes devenues drones**, y compris les noms internes (`droneA`, `droneH`, `droneBonus`). Conflit levé : `NEW_IDEAS.md` disait qu'un drone n'est jamais une unité ; la section 8 précise maintenant qu'il peut aussi être une petite unité invoquée par les Roboticiens. « Sondeur planétaire » et « Sonde d'analyse » ne sont pas concernés et gardent leur nom.

### Outils et documents

- `serviteurs.html` (généré par `outils/generer-serviteurs.js`) : en tête de chaque section, ventilation à droite (par espèce dans un archétype, par archétype dans une espèce, zéros atténués) et « Total N » en gras.
- `lieutenants.html` (même générateur, placé avant « Serviteurs » dans le menu) : lieutenants classés par archétype et par espèce, sans niveaux ; inclut ceux de `HEROES_RESERVE`.
- `CARTES_ARTILLEUR.md` : extrait manuel des cartes Artilleur (serviteurs, équipements, donjon). **Il n'est pas régénéré** par `outils/exporter-cartes.js` ; à refaire ou à automatiser.
- Après toute modification de `prototype/donnees.js` : `node outils/exporter-cartes.js`, `node outils/generer-serviteurs.js`, puis `node outils/simuler.js` (300 parties, doit afficher 0 problème).

### Idées en cours (`VRAC_IDEAS.md`, rien de décidé)

- **Mini-Boss** par plateau du Boss, à explorer pour la Station Oméga : un module d'Intelligence Oméga par plateau (Gardien défensif, Réacteur dont la puissance monte, Artilleur fragile). Questions : un par plateau ou partagé, visible à l'avance, place sur les 7 cases, mort et retour au combat suivant.
- **Foreuses des Dworks** (Cris de guerre, ressources de la prochaine salle) et **cœur énergétique des Droïdes** : concepts ouverts.

### À faire ensuite

1. Trancher « protection » du Maître-canonnier (Bouclier divin ou Provocation).
2. Créer d'autres cartes à bombes, puis équilibrer : un Bombardier doré pose 4 bombes de 10, peut-être trop fort.
3. Relancer la simulation d'équilibre : 4 et 5 propositions rendent probablement le joueur et le Boss plus forts, et les valeurs de difficulté ont été réglées avec 3.
4. Choisir la suite pour les Mini-Boss de la Station Oméga.
5. Vérifier à l'écran l'affichage de 5 cartes proposées, de la pastille de bombe et de la page des serviteurs (non vérifiés dans un navigateur).
