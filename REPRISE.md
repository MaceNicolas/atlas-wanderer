# Reprise — Atlas Wanderer

Dernière mise à jour : 7 novembre 2026 (voir les sections datées en bas, qui priment). Ce fichier résume où en est le projet, ce qui a été décidé, ce qui n'est pas encore reporté dans la documentation et ce qu'on pourrait faire ensuite. Les règles de référence restent dans `documentation/idees/nouvelles.md`.

## Par où reprendre

1. Lire `documentation/idees/nouvelles.md` (règles), puis ce fichier.
2. Ouvrir `index.html` (racine : présentation ; les autres pages du site sont dans `site/`) puis le lien vers `prototype/prototype.html`, ou directement ce dernier, pour jouer (connexion nécessaire : Tailwind et daisyUI viennent d'un CDN).
3. Voir `git log` pour le dernier commit (renfort mixte et catalogue de 60 équipements le 7 novembre). Les sections datées en bas de ce fichier priment sur les chiffres plus anciens (nombre de serviteurs, vocabulaire).

## À faire en urgence (demande de Nicolas, 21 novembre 2026)

1. **Une image pour le Drone** (le jeton, carte `77adf0ba-…` de `data/atlas-wanderer/servants.json`, genre `drone`).
2. **De nouvelles images pour les Droïdes** (les serviteurs de l'espèce Droïde).

Rappel : les images fournies sont converties en webp et le fichier source est supprimé ; relancer `tools/generate-all.js` ensuite.

## Décisions de la session

### Économie du renfort (reportées dans `documentation/idees/nouvelles.md`, sections 2, 3, 4, 8 et 13)

- Monnaie unique, **Datacron** (nom provisoire). Revenu variable selon la salle, **conservé** d'un renfort à l'autre.
- **Aucun choix gratuit, pas de relance, pas de prix par rang.** Deux boutons, 1 Datacron chacun : **Renfort** (serviteurs et équipements tirés ensemble, voir la section du 7 novembre) et **Niveau**.
- Un achat de renfort **tire des cartes au hasard** (pool infini ; 3 au niveau de renfort 1, 4 aux niveaux 2-3, 5 dès le niveau 4), le joueur en choisit une. Le Datacron est payé à l'ouverture du choix : pas d'annulation, sinon ce serait une relance gratuite.
- **Niveau de renfort** : contributions progressives, N+1 Datacrons pour passer du niveau N au niveau N+1. Il fixe le rang maximum des propositions.
- **Main** de 7 emplacements, serviteurs et équipements confondus. Le joueur pose lui-même les cartes sur le plateau.
- **Fusion simple** : trois serviteurs identiques (plateau et main) donnent un doré (statistiques additionnées, valeurs de compétence doublées), puis un choix parmi trois serviteurs de rang niveau + 1 (plafonné à 5).
- **Plateau vide au départ** : les héros n'ont plus de serviteur attitré « pour le moment » (sections 3 et 5 corrigées). Le jeu commence par un renfort.
- Idées abandonnées ajoutées en section 13 : deux choix gratuits, renoncements, relances et prix par rang.

### Types (prototype uniquement, pas encore dans `documentation/idees/nouvelles.md`)

- Les types provisoires du premier jet sont remplacés par les types documentés dans `documentation/types/` :
  - **Espèces** : Elk, Dwork, Droïde, Sorvane (remplace les félins), Ryskan, Nythe.
  - **Affectations** : les neuf, dont le Diplomate (bonus aux alliés adjacents).
  - **Règle** : chaque serviteur a une espèce et une affectation obligatoire. Les héros en ont aussi une de chaque.
- Contenu du prototype : 62 serviteurs (une gamme de 5 rangs par affectation avec des espèces réparties, plus 12 espèce + affectation), 5 héros (un par espèce, chacun avec une affectation), 2 donjons (le Nid de la Reine apporte Médecin, la Station Oméga apporte Droïde).
- Pour exprimer les affectations, 4 effets de début de combat ont été ajoutés : invocation d'un drone (Roboticien ; l'équipement « Chargeur de drones » leur donne +1/+1), retrait d'ATQ à un ennemi (Renseignement), bonus par type différent dans l'équipe (Explorateur), bonus à un allié équipé (Ingénieur). Le Médecin donne des bonus de PV au lieu de soigner, pour ne pas créer de déclencheur « après une attaque ».

### Équipements à effet

- Un équipement peut donner une compétence à son porteur (effet de renfort permanent, effet de combat valable pour le combat). Sept équipements existent (Adrénaline, Module de croissance, Stimulants de choc, Nano-ruche, Charge de rupture, Injecteur de combat, Balise de commandement).
- Les cartes en trop se **jettent** depuis la main (gratuit, avec confirmation).

### Difficulté et longueur

- Donjon d'au moins une quinzaine de salles. PV des Boss : 250 (La Reine-Mère) et 200 (Intelligence Oméga). Les ennemis gagnent en rang, en nombre et en bonus plus vite (constantes `ENEMY`, `INCOME` et PV des Boss dans `prototype/data.js`).
- Mesures faites avec un joueur automatique simple, sur plusieurs centaines de parties :
  - avant les équipements à effet : environ 15 % de victoires, durée médiane autour de 17 salles, victoire la plus courte autour de 11 ;
  - après les équipements à effet : environ 28 % de victoires, durée moyenne d'une victoire autour de 26 salles.
- Le niveau de renfort pèse beaucoup sur l'issue (4 % de victoires si on monte rarement de niveau, 61 % si on investit beaucoup), ce qui donne un vrai poids à l'économie.

### Graphismes (`prototype/svg.js`)

- Emblèmes pleins pour les espèces, icônes au trait pour les affectations, couleurs par espèce, et par famille d'affectations (navigation, soutien, tactique).
- Les cartes de serviteur et d'équipement sont en SVG. Chaque mot-clé est écrit sur la carte (nom et rappel de règle). Un mot-clé consommé est grisé et barré, et un Bouclier actif entoure la carte d'un halo cyan.
- Plus d'icône pour l'attaque et les PV, seulement deux pastilles de couleur avec un chiffre.
- Le bouton du niveau est grisé (« Niveau max ») au niveau maximum.

## Pas encore reporté dans `documentation/idees/nouvelles.md`

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
2. Reporter dans `documentation/idees/nouvelles.md` ce qui est stabilisé (liste ci-dessus).
3. Retoucher les icônes (Elk) et habiller les panneaux de héros et de Boss.
4. Rédiger les sections « Dans le jeu » des fiches d'espèces, puis confirmer le nom Sorvane.
5. Conserver un script de simulation dans le dépôt (les essais de cette session utilisaient des scripts temporaires, non versionnés) pour mesurer l'équilibre après chaque changement.
6. Découper `documentation/idees/nouvelles.md` vers `documentation/mecaniques/`.

## Ajouts du 23 octobre 2026 (suite)

- **Boss à trois plateaux** : trois plateaux indépendants renforcés comme un joueur avant chaque salle, un seul présenté par salle (jamais le même deux fois de suite), revenu réduit de 1, de 1 une fois sur deux, ou égal. Deux types cachés au hasard à chaque partie. Règle reportée dans `documentation/idees/nouvelles.md`, section 5. Code : `makeTeam`, `aiRenfort` et `bossRenfort` dans `prototype/engine.js`, `BOSS_BOARDS` dans `prototype/data.js`.
- **Espèce par défaut** : aucune (Alien supprimé le 7 novembre 2026).
- **Interface** : choix du donjon puis des héros sur deux écrans, quatre donjons avec décors SVG (deux, la Cité des Profondeurs et la Forge de Brasier-Roc, sont à valider), glisser-déposer pour poser, équiper et ordonner, mode débogage (icône en bas à gauche).
- **À faire** : mesurer l'équilibre du Boss à trois plateaux (une simulation rapide donnait environ un tiers de victoires et des parties longues), tester sur écran tactile, valider les pouvoirs de Boss Écho et Blindage.

## Ajouts du 25 octobre 2026

### Règles et cartes modifiées (code, `documentation/idees/nouvelles.md`, `documentation/cartes.md` à jour)

- **Propositions du renfort** : 3 au niveau de renfort 1, 4 au niveau 2, 5 aux niveaux 3-4, 6 dès le niveau 5 (modifié le 7 novembre), pour les serviteurs **et** les équipements. La récompense de fusion reste à 3. Les plateaux du Boss suivent la même règle. Code : `renfortProposals` (`data.js`) et `drawCards` (`engine.js`).
- **Maître-canonnier** (ex-Canonnier) : Dwork, À distance, détruit le Bouclier de sa cible avant de l'attaquer (hypothèse : « protection » = Bouclier, à confirmer). Effet `breakShield`.
- **Tireur d'élite** : Sorvane, À distance, « Cible : l'ennemi avec le moins de points de vie ». Le critère « Bouclier en priorité » a disparu du code.
- **Bombardier** : 5/7, sans À distance, pose 2 bombes de 5 dégâts sur des ennemis différents au début du combat. Un serviteur piégé subit sa bombe juste avant sa première attaque (le Bouclier l'absorbe) ; s'il survit, il enchaîne sur son attaque, sinon son tour est perdu. La bombe n'entraîne pas de riposte. Effet `plantBombs`, champ `bomb` sur le serviteur, pastille sur la carte. Les autres cartes à bombes restent à créer (le mécanisme est générique : nombre et dégâts réglables par carte).
- **Sondes devenues drones**, y compris les noms internes (`droneA`, `droneH`, `droneBonus`). Conflit levé : `documentation/idees/nouvelles.md` disait qu'un drone n'est jamais une unité ; la section 8 précise maintenant qu'il peut aussi être une petite unité invoquée par les Roboticiens. « Sondeur planétaire » et « Sonde d'analyse » ne sont pas concernés et gardent leur nom.

### Outils et documents

- `site/servants.html` (généré par `tools/generate-servants.js`) : en tête de chaque section, ventilation à droite (par espèce dans une affectation, par affectation dans une espèce, zéros atténués) et « Total N » en gras.
- `site/heroes.html` (même générateur, placé avant « Serviteurs » dans le menu) : héros classés par affectation et par espèce, sans niveaux ; inclut ceux de `HEROES_RESERVE`.
- `CARTES_ARTILLEUR.md` : extrait manuel des cartes Artilleur (serviteurs, équipements, donjon). **Il n'est pas régénéré** par `tools/export-cards.js` ; à refaire ou à automatiser.
- Après toute modification de `prototype/data.js` : `node tools/generate-all.js` (cartes, pages, valeurs des règles, puis simulation de 300 parties : doit afficher 0 problème).
- **Sauvegardes locales** (`prototype/save.js`), deux couches. **Profil d'équipage** (`PROFIL`, clé `atlasWandererProfil`) : la méta-progression, qui survit aux expéditions ; jamais refusée, migrée (`MIGRATIONS`) et complétée par les valeurs par défaut (`defaut()`), un profil illisible est mis de côté sous `…corrompu`. Pour l'instant il ne contient que `prWins` (repris de l'ancienne clé `atlasWandererPrWins`) ; la vraie méta-progression (`documentation/idees/nouvelles.md`, section 12) viendra s'y ajouter. **Expédition** (`SAVE`, clé `atlasWandererSave`) : un seul emplacement, écrite à chaque rendu stable du renfort (`autoSave` dans `ui.js`), effacée à la fin de l'expédition. Les fiches du catalogue sont enregistrées par identifiant, les objets partagés restent partagés. **Si la forme de `g` ou de `rf` change de façon incompatible, incrémenter `SAVE_VERSION`** : une expédition de version différente ou dont une carte a disparu est refusée au menu (bouton Abandonner), sans toucher au profil. Le simulateur vérifie à chaque salle que l'expédition rechargée est identique.
- **Références des cartes** : serviteurs, équipements, héros et donjons portent un `id` calculé automatiquement depuis leur nom (`slug(name)` dans `data.js`, même règle que les noms d'illustrations) : « Flam'Gruk » → `flam-gruk`, « Kit de renfort T1 » → `kit-de-renfort-t1`. Il n'y a jamais d'id écrit à la main : renommer une carte met sa référence à jour, et une référence en double fait échouer le chargement. Les serviteurs en jeu gardent cet `id` (et un `uid` unique à la partie). Les Dummies ont une référence préfixée du donjon (`le-nid-de-la-reine--dummy-1`), pour rester distincts quand ils seront personnalisés.

### Idées en cours (`documentation/idees/vrac.md`, rien de décidé)

- **Mini-Boss** par plateau du Boss, à explorer pour la Station Oméga : un module d'Intelligence Oméga par plateau (Gardien défensif, Réacteur dont la puissance monte, Artilleur fragile). Questions : un par plateau ou partagé, visible à l'avance, place sur les 7 cases, mort et retour au combat suivant.
- **Foreuses des Dworks** (Cris de guerre, ressources de la prochaine salle) et **cœur énergétique des Droïdes** : concepts ouverts.

### À faire ensuite

1. Trancher « protection » du Maître-canonnier (Bouclier ou Provocation).
2. Créer d'autres cartes à bombes, puis équilibrer : un Bombardier doré pose 4 bombes de 10, peut-être trop fort.
3. Relancer la simulation d'équilibre : 4 et 5 propositions rendent probablement le joueur et le Boss plus forts, et les valeurs de difficulté ont été réglées avec 3.
4. Choisir la suite pour les Mini-Boss de la Station Oméga.
5. Vérifier à l'écran l'affichage de 5 cartes proposées, de la pastille de bombe et de la page des serviteurs (non vérifiés dans un navigateur).
6. Équilibrer la stratégie de rush sur les niveaux de renfort maximaux : elle fonctionne actuellement trop bien.

## Ajouts du 7 novembre 2026

### Renfort mixte (code, `documentation/idees/nouvelles.md` sections 2, 4 et 8, `documentation/cartes.md` à jour)

- Un seul bouton **Renfort** remplace Serviteur et Équipement : une offre de 3 à 6 cartes (selon le niveau de renfort) mêle serviteurs et équipements. Fonction `drawOffer` dans `prototype/engine.js` ; l'offre sauvegardée porte `kinds` (une valeur par carte) ; les anciennes sauvegardes avec un seul `kind` se rechargent encore.
- **Minimum de deux serviteurs** par offre (`MIN_SERVANTS`). Les cartes sont tirées une à une, chacune a `EQUIP_CHANCE` (0,3, provisoire) d'être un équipement, sauf quand il ne reste plus de place pour atteindre le minimum : les suivantes sont alors des serviteurs. Au niveau 1 : au plus un équipement, à n'importe quelle position. Vérifié sur 20 000 tirages par niveau (aucun tirage sous deux serviteurs ; 0,7 équipement en moyenne au niveau 1, 1,8 aux niveaux 5-6).
- Les plateaux du Boss utilisent le même tirage : ils prennent le meilleur du type visé (serviteur ou équipement) s'il est proposé, sinon de l'autre type.
- **Explorateur des confins** : « votre prochain renfort vous proposera 7 cartes » (le nom interne `bigEquipOffer` et les champs `equipOfferSize` / `equipOfferLeft` n'ont pas changé).
- `tools/simulate.js` joue le bouton Renfort (70 %) ou Niveau (30 %) ; 300 parties sans problème.

### Captures d'écran (`screens_history/`, désormais suivi par git)

- Le hook `.githooks/pre-commit` lance `tools/screens-history.py` : métadonnées retirées, conversion en webp, nom `AAAAMMJJTHHMMSS.webp` (date lue dans le nom d'origine, sinon date de modification ; suffixe `-2` en cas de doublon), suppression des sources et des `:Zone.Identifier`, puis ajout du dossier au commit.
- Activation, à refaire après chaque nouveau clone : `git config core.hooksPath .githooks`. Nécessite Python 3 avec Pillow.

### À faire ensuite

1. Créer des équipements moins nombreux mais plus pertinents (étape annoncée après le renfort mixte) : relire d'abord la liste actuelle dans `prototype/data.js`.
2. Régler `EQUIP_CHANCE` après quelques parties à la main, et créer une icône dédiée au bouton Renfort (il réutilise celle du serviteur).
3. Relancer la simulation d'équilibre : le renfort mixte donne moins de serviteurs par offre qu'avant.

### Équipements supprimés (7 novembre 2026)

- Les 42 anciens équipements, jetons et Jokers compris, ont été retirés (récupérables dans l'historique git, commit `8bdb68b`) et remplacés par le catalogue provisoire ci-dessous. `documentation/cartes.md` et `site/equipment.html` sont régénérés (0 équipement).
- Les serviteurs qui donnent ou utilisent un équipement (Kit de renfort, Dossier consulaire, Forgeron stellaire, Pilleur de ruine, Explorateur des confins, Chasseur de reliques…) restent dans le catalogue mais leur équipement précis (Kit de renfort) n'existe plus (le Dossier consulaire existe de nouveau : équipement Diplomate de rang 1, -1/+3) : ils n'ont plus d'effet utile.
- Ancien plan (abandonné) : 21 équipements = 1 par espèce (6, sans Alien) + 1 par affectation (9) + 1 neutre par niveau de renfort (6). **Il y a 9 affectations** (Pilote, Ingénieur, Médecin, Sécurité, Explorateur, Artilleur, Renseignement, Roboticien, Diplomate), pas dix. Les typés doivent avoir des rangs bien répartis, car chaque partie n'a que 5 types.

### Catalogue provisoire de 60 équipements (7 novembre 2026)

- 4 équipements par type (6 espèces hors Alien + 9 affectations), **aucun neutre**, chacun donne **+r/+r** selon son rang r. Les rangs diffèrent d'un type à l'autre (pas de gabarit fixe) : par exemple Artilleur 3-4-5-6, Sorvane 1-1-4-5. Les effets viendront plus tard ; les noms sont provisoires. Une partie en voit 16 à 20.
- **Toujours 5 types par partie** : `newGame` complète au hasard les types manquants (héros qui partagent un type, type du donjon déjà présent). Pas de contrôle visible avant le début : les types tirés s'affichent dans la partie.
- **Jamais d'équipement au-dessus du niveau de renfort** : `drawCards` filtre les équipements au rang maximum et `drawOffer` remplace la carte par un serviteur s'il n'y en a aucun.
- `SAVE_VERSION` passe à 2 : les anciennes sauvegardes sont refusées.
- Vérifié sur 3 000 parties tirées : toujours 5 types, jamais d'équipement trop haut, jamais moins de deux serviteurs par offre ; simulation de 300 parties sans problème.

## Espèce Alien : supprimée (7 novembre 2026)

L'espèce Alien n'existe plus : 6 espèces (Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe). Ses 6 serviteurs ont été migrés (Grenadier → Droïde, Attaché de liaison → Nythe rang 2, Intercepteur → Dwork, Intrus réseau → Droïde, Chef d'atelier → Ryskan, Spécialiste des boucliers → Elk) ; code, emblème, fiche et documentation nettoyés. Les drones et jetons générés en partie peuvent rester sans espèce (décidé).

## Mini-boss et types du Boss (fait le 7 novembre 2026)

> **Remplacé le 19 novembre 2026** : un donjon a une espèce et une affectation (`types`, plus de `type` ni `minis`) ; le Boss tire une autre espèce et une autre affectation (4 types) ; 2 mini-boss fixes seulement (plateaux 1 et 2). Le joueur tire parmi les types de ses héros + 1 type aléatoire (`extraTypes`), le donjon n'ajoute rien. Les lignes ci-dessous sont l'ancien état.

- Chaque donjon a **3 types fixes** (`type` + `minis` dans `DUNGEONS`) et **2 types aléatoires** tirés à chaque partie (`drawBossExtra`, stockés dans `g.bossExtra`) : le Boss a toujours 5 types. L'ancien système (types des héros / mode aléatoire) et son interrupteur sont supprimés pour le Boss ; le joueur tire toujours parmi le type du donjon + ses héros.
- Les **Dummies** deviennent des **mini-boss** à un seul type (`miniBoss(type)`, nom « Mini-boss Elk »), un par plateau : celui du type du donjon, puis ceux des deux types fixes. Provisoirement ils n'ont **aucune spécialité** (+1/+1 par renfort seulement) ; les spécialités seront travaillées plus tard, type par type.
- Types fixes provisoires : Nid de la Reine = Médecin + Nythe + Sorvane ; Station Oméga = Droïde + Roboticien + Ingénieur ; Cité des Profondeurs = Renseignement + Diplomate + Elk ; Forge de Brasier-Roc = Artilleur + Dwork + Ryskan. À valider par l'utilisateur.
- Documenté dans `documentation/idees/nouvelles.md` (section sur les plateaux et types du Boss). Non fait : illustrations des mini-boss, équilibrage (le Boss est plus faible sans spécialités).

## À faire ensuite (après Alien)

1. Remplacer les équipements +r/+r par des effets plus pertinents (catalogue provisoire de 60).
2. Régler `EQUIP_CHANCE`, créer l'icône du bouton Renfort, relancer la simulation d'équilibre.
3. Jouer quelques parties à la main (renfort mixte, équipements, 5 types toujours complets).

## Tests d'équilibrage par simulation (8 novembre 2026)

- `node tools/equilibrage.js heroes [--parties=50] [--graine=1] [--strategie=niveau,equilibre,tempo]` : joue des dizaines de milliers de parties sans navigateur (fils de calcul multiples, résultats reproductibles avec la même graine, quel que soit le nombre de fils). Résultats détaillés dans `temp/balance/` (local, non commité).
- Fichiers : `tools/load-game.js` (charge le vrai code du prototype, Math déterministe, mode rapide sans rendu ni animations), `tools/player-bot.js` (joueur automatique, trois stratégies de niveau de renfort), `tools/equilibrage.js` (plan de tests et rapports). `tools/simulate.js` (détection de plantages) reste indépendant.
- Phases : `heroes` (toutes les paires × tous les donjons), `serviteurs` et `equipements` (la carte est donnée au joueur dès que son niveau de renfort le permet, dans toutes les paires × tous les donjons, comparée à des parties témoins et aux cartes de même rang), `donjons` (toutes les paires, plus chaque type aléatoire du Boss imposé). `node tools/equilibrage.js tout --echelle=petit|normal|massif` ; rapports dans `temp/balance/rapport-*.txt`.
- Limite connue : le bot joue de façon simple (les pouvoirs actifs de Sulseye et Waven restent faibles même bien utilisés : c'est la conception). Les comportements des plateaux du Boss ne peuvent pas être imposés.
- **Historique versionné** : chaque test est enregistré dans `tests/history/<date-échelle>/` (`meta.json` avec commit git et empreintes du jeu et du bot, JSON/CSV détaillés, rapports texte) et indexé dans `tests/history/index.json` (régénéré automatiquement, `tools/historique.js`). `--note="..."` garde un commentaire, `--sans-historique` écrit dans `temp/balance/essai`. `tools/import-test.js` importe d'anciens résultats (le test massif du 8 novembre 2026 y est, importé depuis `temp/`).
- **Page Test** : `node tools/local-server.js` (port 8080) puis `http://localhost:8080/site/tests.html`. Le lien orange « Test » (menu, à côté de Graphismes) n'apparaît qu'en local (`site/link-test.js`) ; la page refuse de s'afficher hors localhost. Onglets : Résultats (tableaux triables par phase, rapport texte), Évolution (courbe d'un élément à travers les tests), Comparer (écarts entre deux tests), Lancer un test (progression en direct). Avertit quand les cartes/règles ou le bot ont changé depuis un test.
- Test massif du 8 novembre 2026 (983 664 parties, 1 h 02) : bot à l'équilibre ≈ 77 % de victoires ; héros trop forts TE-5T (100 PV), Docteur Iris, Reyes, ZC-D9 ; trop faibles Sulseye, Waven, Brokk'Ric ; serviteurs trop forts pour leur rang M1-FE, Corsaire, Chasseur de reliques, Généticien, XN-FF45, Ombre (Cybermancien trop faible) ; équipements : le rang n'a presque pas d'effet (rangs 2 à 6 ≈ +2,4 points, rang 1 +0,7) ; donjons : Station Oméga trop dur (57 %), Cité des Profondeurs et Forge trop faciles (≈ 85 %) ; type Explorateur dans le Boss le durcit partout.


## Reprise du 14 novembre 2026 : pouvoirs modulaires (paramètres de carte, cibles, règles)

**Où on en est.** Les pouvoirs d'Atlas Wanderer sont passés de 116 à **86** : une carte écrit maintenant, à côté de `a`, `h`, `n`, les réglages que son pouvoir déclare (`"params": [...]` dans `powers.json`) : `type`, `token` (genre d'unité invoquée), `keyword`, `target` (un sélecteur), `permanent`, `attributed` (dégâts comptés comme ceux du porteur : Poison), `scale` (règle « proportionnel à »), `quantity` (règle « quantité »). Le pouvoir lit `$type`, `$target`, `$scale`… Spec : `documentation/mecaniques/pouvoirs-modulaires.md` § 8.1 (type, unité, mot-clé), § 8.2 (cible, permanent), § 8.3 (catalogue de règles fermé : count, distinctTypes, equipments, level, stat, range, difference, half ; plafond `max` ; imbrication).

**Commits de la session** : `dc8b481` (paramètres type / unité / mot-clé, « les autres Pilotes » selon le porteur), `3e53a8a` (cible sur la carte : `changeStats`, `reduceAtk`, `giveShield`, `giveKeyword`, `removeKeyword`), `e3e3687` (`heal`, dégâts avec cible), `80dfd59` (`permanent`). **Dernier commit** : le catalogue de règles (`scale`, `quantity`, `attributed`) : `changeStats` absorbe 9 bonus proportionnels, `dealDamage` absorbe 3 pouvoirs de dégâts, `reduceAtk` absorbe `debuffByLevel`, 98 → 86 pouvoirs, 1500 combats identiques, textes de cartes inchangés ; avec les outils `tools/compare-combats.js` et `tools/browser-probe.js` et cette section.

**Comment vérifier avant tout commit** (Nicolas le demande à chaque fois, et veut le résumé des cartes qui changent) :
1. `./tools/verify-all.sh` (~1 min, 22 ✓ ; il fait `git add -A`). Si seul `check-render` échoue parce que les textes ont voulu changer : `node tools/check-render.js --write` puis relancer.
2. Textes de cartes : `git diff HEAD -U0 documentation/cartes.md | grep '^[-+]|'` doit être vide si on ne veut changer aucune carte.
3. Jeu inchangé : `git worktree add /tmp/aw-head HEAD && node tools/compare-combats.js /tmp/aw-head && node tools/compare-combats.js . && git worktree remove --force /tmp/aw-head` ; deux empreintes égales (1500 combats déterministes). Empreinte actuelle de référence : `2c46cecc3097d66c`.
4. Éditeur dans un vrai navigateur : `tools/browser-probe.js` (en-tête du fichier : chrome-headless-shell de Playwright ; `libasound` à extraire avec `apt-get download libasound2t64` + `dpkg -x` si Chrome la réclame). Ne jamais cliquer « Enregistrer » dans une sonde.

**Pièges connus.** (a) `amount` est un champ d'événement du combat : le réglage de montant s'appelle `quantity`. (b) Le Poison n'agit que si les dégâts ont une source : réglage `attributed`. (c) Les textes anglais et français doivent avoir les mêmes trous `{...}` (`check-texts`). (d) Un texte de carte écrit à la main (`desc.<fx>`) l'emporte sur le texte généré ; `node tools/check-descriptions.js --diff` compare, `--prune` supprime les textes à la main devenus identiques, `--prune --force` supprime aussi ceux qui diffèrent. (e) `mods/minimal/` est régénéré par `node tools/make-minimal-mod.js` (à relancer après un changement de textes ou de pouvoirs). (f) Les noms de types sont traités comme masculins dans les phrases construites (« au Pilote allié »). (g) Le journal de combat a changé de formulation (cibles nommées « A, B et C », « (×4) », « gagne définitivement ») : empreintes de rendu réenregistrées.

**Reste à faire, dans l'ordre proposé.**
1. ~~Commiter le catalogue de règles~~ (fait).
2. **ON REPART SUR `giveCard` (décidé le 14 novembre 2026) — première tâche de la prochaine session.** **Pouvoirs de renfort** (13 : `gainEquip`, `gainAnyEquip`, `gainUnavailableEquip`, `gainDossier`, `creeUnite`, `addUnavailableEquip`, `craftEquipmentOfType`, `generateServantOfType`, `createPatchOfType`, `discoverEquip`, `datacube`, `summonBonusOfTokenForGame`, `buffChosenAlly`) vers un seul `giveCard` dont le réglage décrit le tirage (catégorie, rang, type, disponibilité, nombre, quand). Risque : l'ordre des tirages au hasard doit rester identique (vérifier avec `compare-combats` ET une partie de renfort).
3. Générateur de descriptions : 26 pouvoirs utilisés sur 78 sont écrits automatiquement ; il reste les réactions riches, `giveCard`, les pouvoirs à plusieurs briques. Nicolas voulait relire les descriptions générées **une par une** (3 vues : `setAttackTargetOfType`, le bonus aux autres Pilotes, le don de mot-clé) : la liste a changé avec les fusions, à régénérer.
4. Éditeur visuel de briques (formulaire par brique ; les blocs Cible / règles en sont le début) et « fiche du vocabulaire ».
5. Autres regroupements possibles : `stripShield`, `shieldSelfOnce`, `muteRiposte`, `pacify`, les échanges de PV.
6. Divers en attente : icônes des types (`prompts/prompt_icones_types.md`, aperçu `temp/icones-types.html` : à coller dans `vocabulary.json` quand l'agent a répondu), brief des cadres de cartes (`prompts/brief_cadres_cartes_v9.md`), interface « trop petite » (cartes ~105-140 px, texte ~7 px), mods (héritage, sélection derrière « Jouer »), `tools/balance.js` pas relancé pour le nouvel ordre, jamais de validation navigateur par Nicolas des effets de `site/effets.html` ni du glisser-déposer du mod minimal.

**Façon de travailler avec Nicolas** : il décide, je propose ; j'explique chaque problème en quatre temps (contexte, problème avec exemple concret, correctif, ce que ça change pour le jeu), même si c'est long ; je ne commite que sur demande ; tout est en données (le moteur est un noyau, Atlas Wanderer est un mod) ; code et données en anglais, textes joueur en français et en anglais.


## Reprise du 14 novembre 2026 (soir) : don, découverte, choix et jetons en données

**À lire en premier, avec la section précédente** (« Reprise du 14 novembre 2026 : pouvoirs modulaires »), dont les outils de vérification et les pièges restent valables. Cette section remplace sa liste « Reste à faire ».

**Où on en est.** 78 pouvoirs (86 le matin). Commits du soir : `40fef93` (`giveCard` et `discoverCard`), `5a9e431` (écran unique `chooseCard`), `415f005` (jetons = cartes du catalogue, `createPatchOfType` supprimé). Arbre propre, **non poussé** (12 commits d'avance sur `origin/main`).

### Ce qui a changé
1. **`giveCard`** (spec `pouvoirs-modulaires.md` § 8.4) : 8 pouvoirs de don (`gainEquip`, `gainAnyEquip`, `gainUnavailableEquip`, `gainDossier`, `creeUnite`, `addUnavailableEquip`, `craftEquipmentOfType`, `generateServantOfType`) deviennent un seul pouvoir ; la carte écrit `give` : `category`, `offer` | `card` | `pool` (`rank`, `type`, `token`, `absent`), `times`, `roomIs`, `roomEvery`, `needsHand`, `skipEmpty`, `cue`, `log`, `logFull`. `"$n"` = le `n` de la carte (textes `{n}` et fusion en or intacts). Le filtre `pool` est une fonction partagée (`poolOf`).
2. **`discoverCard`** (§ 8.5) : `discoverEquip` devient général ; la carte écrit `discover` : `category`, `pool`, `proposals`, `choice`. Donner et faire découvrir restent **deux pouvoirs** (décision de Nicolas : le processus n'est pas le même). Les offres, la fusion et la prophétie tirent par `drawCards` (pondéré, types de l'équipe) : à part.
3. **Écran `chooseCard`** : `discoverEquipment` et `fusionReward` fusionnés ; la catégorie (`servant` | `equipment`) vient du choix mis en file (`g.choiceQueue`, `rf.reward`). `chooseAlly` reste à part. **Titre unique « Choisis une carte »** : les titres « Découverte ! » et « Fusion ! » sont perdus (à rétablir avec les textes).
4. **`createPatchOfType` supprimé** (avec la brique `createPowerCard`) : le héros Brokk'Ric n'a plus de pouvoir, à retravailler.
5. **Jetons = cartes du catalogue** (§ 8.6) : une carte de `servants.json` ou `equipment.json` avec `"token": "<genre>"` ; le registre `tokens` de `game.json` n'existe plus, le genre est défini par les cartes qui le portent. Le Drone est la carte `77adf0ba-…` (rang 1, 0/0, sans type). `summon` copie la carte du genre (`mkServant`) : nom traduit, mots-clés, pouvoirs possibles. Une carte à genre n'est jamais proposée aux offres, ni dans la doc, ni dans la recherche ; `pool.token` = `false` | un genre | absent. Les outils qui tirent des serviteurs au hasard filtrent `!token`.
6. `SAVE_VERSION` 15.

### Vérifié
`verify-all.sh` ✓ (22). `compare-combats` (6000 combats, empreinte `298d118e93d0bf39` avec le script actuel qui filtre les jetons ; l'ancienne empreinte 1500 combats `2c46cecc3097d66c` reste valable seulement pour les versions d'avant le Drone), 90 parties complètes du bot, 300 découvertes et 48 parties de renfort identiques à avant. Les scripts jetables (`rf-compare.js`, `disc-compare.js`, `full-compare.js`) étaient dans le dossier temporaire de session, pas dans le dépôt : à réécrire si besoin (principe : charger `tools/load-game.js` sur un `git worktree` de HEAD et sur le dossier courant, jouer des graines fixes, comparer un hash).

### Dettes et points à savoir
- **Texte des cartes** : les cartes de don et de découverte portent `"desc": "<ancien nom du pouvoir>"` (clé du texte écrit à la main) et parfois `"noTrigger": true`. Le générateur de descriptions doit les remplacer.
- `owes: equipment` (Râle d'agonie qui doit un équipement) ne joue que pour un `give` par `offer`.
- Le filtre `absent` signifie « aucun des types de la carte n'est dans l'équipe » partout.
- Aucun genre d'équipement n'existe dans Atlas : `pool.token` avec un genre d'équipement n'est testé que par `check-flow.js`.
- Le piège de test : ne jamais mettre de backticks dans un `git commit -m` (utiliser un fichier de message).

### Reste à faire, dans l'ordre proposé
1. **Pouvoirs de renfort restants** : `datacube` et `buffChosenAlly` (déjà presque en données, regroupement peu utile). `summonBonusOfTokenForGame` est fusionné dans `summonBonusOfToken` (77 pouvoirs, spec § 8.7, non commité).
2. ~~`pool.rank` et pouvoir de Brokk'Ric~~ : abandonné, Brokk'Ric reste sans pouvoir avec 45 PV (décision de Nicolas).
3. **Générateur de descriptions** (26/78 pouvoirs générés) : traiter `giveCard` et `discoverCard`, retirer `desc` et `noTrigger` des cartes ; Nicolas veut relire les descriptions générées une par une (la liste est à régénérer).
4. Titres des écrans de choix (par source ou par catégorie), éditeur visuel de briques, autres regroupements possibles (`stripShield`, `shieldSelfOnce`, `muteRiposte`, `pacify`, échanges de PV).
5. Divers déjà listés : icônes des types, cadres de cartes, interface « trop petite », mods (héritage, sélection), `tools/balance.js` pas relancé, validations navigateur par Nicolas.
6. **Pousser** les commits quand Nicolas le dit.

## Reprise du 15 novembre 2026 : cartes compactes des plateaux, menu du jeu, icônes de types

**Contexte.** L'interface était « trop petite » : sept cartes complètes par plateau. Le graphiste a livré un kit (`temp/atlas-wanderer-plateau-kit`, jamais commité) : cadre octogonal, plaques d'attaque (or) et de PV (rouge), illustration recadrée. Les plateaux montrent maintenant des cartes **compactes** ; la carte complète apparaît au survol.

**Fait** (spec : `documentation/mecaniques/cartes.md` § 8).
- Données : `ui.cards.compact.servant` et `.equipment` dans `game.json` ; cadres `frames/compact.svg` et `frames/compact-equipment.svg` (le second sans plaques).
- Moteur : `CARD_LAYOUT.resolveCompact`, `AWGfx.compactCard / hasCompact / compactRatio`, zones `art.clip` (polygone), `stats[].maxw`, `keywords` (pastilles) ; dans `ui.js`, `compactWrap`, `showPeek` (boîte fixe `#carte-pleine`) ; classes `.carte-compacte`, `.compact-boards` dans `prototype.html`.
- Où : l'offre d'achat, le plateau du joueur, les deux plateaux du combat (widgets `offerRow`, `boardRow`, `frameRow`). La main et les héros restent en grand.
- Taille : à 1856 × 964, cartes de 174 px (146 avant) ; les écrans de jeu sont larges de 1700 px au plus (1320 avant).
- `tests/render/baseline.json` réenregistré (il était déjà périmé avant ce travail). `tools/verify-all.sh` passe.

**À valider par Nicolas.** Le rendu (captures à prendre), la lecture des offres d'achat sans le texte (survol obligatoire), le tactile (corrigé : premier appui = voir, glisser vers la main = acheter), les chasses et mots-clés sur la carte compacte (pastilles à droite, chasses en haut), les cartes de Boss sans illustration.

**Suite de la même journée (menu, page Design, icônes de types).**
- Menu du jeu : les boutons du haut à droite sont regroupés derrière un seul bouton ☰ (`renderLangSwitch` dans `ui.js`, `UI.menuOpen`, `ACT.toggleMenu`). Panneau de texte à coins coupés (Retour au site, Journal, groupes d'effets, Son si le mod a des sons) ; les boutons FR/EN restent des boutons du jeu. Ferme au clic extérieur (phase de capture, sinon le redessin le refermait) et à Échap. Clés `ui.menu`, `ui.menuLanguage`.
- Page `site/design.html` : annexe « Icônes des types » (15 emblèmes SVG, aperçu + copie), incluse dans « Copier le Markdown ». Aucune mention de l'icône de niveau ni des chasses (demande de Nicolas).
- Icônes de types (`vocabulary.json`) : hexagones blancs autour de l'image retirés sur Elk, Droïde, Ryskan, Nythe, Pilote, Ingénieur, Médecin, Roboticien, Diplomate, Explorateur, Sécurité, Artilleur, Renseignement ; Elk refait dans un hexagone ; trait blanc parasite du Dwork supprimé ; Dwork et Sorvane refaits pointe en haut (image centrale intacte) ; couleur du type Sorvane `#8B6CFF` (était `#b4bcc9`, docs mises à jour).
- Cartes complètes : badges de types agrandis (13,75 % de large), collés au bord gauche (22 unités sur 800), le premier recouvre le second (pas vertical 8,26 %) ; hexagone de niveau collé au bord droit. `ui.cards.{servant,equipment,hero}.tags` et `level` dans `game.json`. L'anneau brillant, son dégradé et l'étoile (`hexRing`, `glint`) sont supprimés de `svg.js` : l'icône est dessinée seule, à l'échelle uniforme (avant : étirée en x et y, d'où l'effet « tassé »). Hexagones peints des types retirés des cadres `servant.svg`, `servant-fusion.svg`, `equipment.svg` ; celui du niveau reste.
- `tests/render/baseline.json` réenregistré plusieurs fois (les icônes sont dans les pages enregistrées). `verify-all.sh` passe.

**Pas fait / à valider par Nicolas.** Regarder en jeu les badges de types (rendu vérifié seulement sur la carte serviteur) ; l'équipement et le héros reprennent la même mise en page mais n'ont pas été revus ; le chevauchement est moins marqué quand une icône est plus basse que l'autre ; les 24 clés `gen.np.*` manquent en anglais dans `data/i18n/en.json` (antérieur à ce travail, non traité) ; `temp/icons/index.html` (aperçu 400 px, local) est généré une fois et ne suit pas le vocabulaire.

## Déséquilibre repéré (19 novembre 2026)

- **Combo quasi imbattable : le FF-4H (serviteur doré, 18/17) avec ses trois équipements.** Pouvoir du serviteur : quand il y a de la place sur le plateau, invoque un drone 6/6 à sa droite. Équipements (capture de Nicolas) : deux fois « les drones invoqués par ce serviteur ont À distance et +2/+2 » (+4/+1), et « si un drone est présent quand un allié (non drone) devrait mourir, détruit le drone et rend tous ses PV à cet allié » (+3/+3).
- **Pourquoi c'est fort.** Les drones invoqués gagnent +4/+4 et l'attaque à distance, et le plateau se remplit tout seul ; le drone sert ensuite de réserve de vie pour les alliés.
- **À faire.** Rien n'est changé pour l'instant. Pistes : plafonner le cumul des bonus d'invocation, limiter l'invocation à une fois par combat, ou réduire le bonus de l'équipement de protection. Mesurer par simulation (`tools/balance.js`) après chaque essai.

## Interface de combat et de renfort (19 novembre 2026, soir)

- Quatre blocs de même hauteur (plateau du Boss, plateau du joueur, main en cartes compactes entières, dernière rangée) séparés par un fin espace (`--gap`), variables `--block-h` et `--last-w` dans `prototype/prototype.html`.
- Fond du plateau du Boss : couleur du type du mini-boss qui fait face (`miniType` dans `makeTeam`).
- Console (dernière rangée) : rectangulaire, en-tête (niveau, chevrons, Datacrons) et pied (trois boutons icône seule, infobulle au survol), même hauteur que les cartes donjon et héros.
- **À valider par Nicolas.** La bordure bleu métallisé de la console (`border-image`) n'avait aucun effet visible avec la première méthode ; vérifier en jeu. Le corps de la console est vide.
- Déséquilibre noté plus haut : combo FF-4H.

## Donjons et boss : refonte du modèle (21 novembre 2026)

**Contexte.** Choisir un donjon lance la partie ; les **boss** sont les adversaires à abattre pour la gagner (le mot « mini-boss » disparaît) ; ils doivent se personnaliser à fond. Spécification et décisions : `documentation/mecaniques/donjons-et-boss.md` (sections 0 et 9 à jour).

**Fait.**
- `bosses.json` (catégorie `boss`) : `hp` (barre de PV du boss), `type`, `power`, `strategy`, `servant` (serviteur permanent écrit dans la carte). Nom = `card.<id>`, description du pouvoir = `boss.<id>.desc`. 16 boss : 14 génériques (un par type, « Boss Elk »…), L'Oracle Souterrain (Sorvane, Écho), Maître-Forgeron Grumm (Dwork, Blindage).
- `dungeons.json` : `types` (fixes), `drawTypes` (types tirés au début de la partie, nombre défini par le donjon, `group` ou `from`), `bosses` (`{ boss }` fixe, `{ drawn, from }` boss du type tiré ; deux entrées sur le même type tiré refusées), `strategy`/`strategies`, `locked`. Plus de `boss`, de `bossExtra` ni de `hpByType`.
- Moteur (`engine.js`) : `drawDungeonTypes`, `resolveBosses`, `permanentServant`, `GAME.init.setTypes/createSides` ; un plateau par boss ; pouvoir du boss joué quand son plateau fait face au joueur (plus porté par un serviteur) ; `board` conserve le serviteur permanent ; stratégie du boss prioritaire (`strategiesFor(dungeon, count, bosses)`) ; barre de PV par boss, plateau vaincu hors rotation, victoire quand tous sont vaincus ; `g.boss` garde le total (affiché pour le moment). Sauvegarde en version 16.
- Éditeur : onglet Boss ; types de champs `bossPower`, `bossServant`, `drawTypes`, `bossSlots` (JSON avec la liste des identifiants de boss). **Non essayé dans un navigateur** (seulement la logique : `check-editor`).
- Mod minimal régénéré (`tools/make-minimal-mod.js`) : 2 boss, 2 donjons. `rules.miniBoss` supprimé.
- Tests : `check-boss-boards` (barres, rotation, victoire, tirage des types, résolution des boss, pouvoir du boss), `check-editor` (cartes de boss, mauvais donjons), `check-strategies` (variantes `{ use, override }` d'un pool, préférences).

**Constat.** Le pouvoir `buffSelf` du mini-boss (+1/+1 par renfort) n'existait plus depuis la refonte « changeStats » : les mini-boss ne grandissaient pas. Les serviteurs permanents sont donc **sans pouvoir** (comme avant en pratique) ; pour les faire grandir : `skill: [{ t: startReinforcement, fx: changeStats, target: { side: self }, a: 1, h: 1, n: 0 }]` (vérifié), à équilibrer.

**Ensuite (21 novembre 2026, soir).** Types tirés de la Cité : Droïde et Ingénieur. Boss Droïde **DR-1O** (ex DR-I0, `bosses.json`) : pouvoir `droidLastStand` (nouveau moment `bossAllyDying` dans `deaths()` : le pouvoir du boss qui fait face au joueur réagit quand un serviteur de son plateau devrait mourir ; une fois par combat, Droïde seulement) ; pas de serviteur permanent (retiré à la demande de Nicolas) ; stratégie `dr1xSwarm` (`game.json#strategies`) : genre `board` étendu (`unit` + `count`, `strategies.md` § 8), un serviteur **DR-1X** (`servants.json`, `token: dr1x`, Droïde Ingénieur, sans châsse, 1/1 + 1/+1 par match) en nombre `1 + floor((salle − 1) / 2)` qui **restent sur le plateau** (`growUnitBoard`, +1/+1 par match), chacun gardant UNE aura de sept, distribuées sans doublon (paquet `team.unitDeck`), porteur compris (templates `auraOnTokens`, `auraKeywordOnTokens`, `auraPerToken`). Moteur : `mkServant` porte `token` ; une aura peut donner un mot-clé paramétré (`$keyword`) et un Bouclier (avec sa charge). **À valider** : « niveaux » lu comme « matchs » ; « par DR-1X allié » compte le porteur. Tests : `check-boss-boards` sections 9 et 10, `check-strategies` (validation de `unit`/`count`), `check-data` (valide aussi les stratégies du mod).

**Pas fait.** Autres moments de pouvoirs de boss (mort effective d'un serviteur) ; affichage des PV de chaque boss (le total reste) ; les quatre boss de Nhavaris (fiche `documentation/donjons/nhavaris.md`) à la place des boss génériques ; équilibrage (barres de 25 PV, plateaux qui sortent) ; type tiré sans boss correspondant (l'emplacement ne donne aucun plateau, à trancher) ; option pour autoriser deux boss sur le même type tiré.

**Boss Ingénieur Erky (21 novembre 2026, nuit).** `bosses.json` : 28 PV, `types: ["engineer", "sorvane"]` (un boss a maintenant une LISTE `types`, plus de `type`), pouvoir `allyDeathLevelBuff` (nouveau moment `bossAllyDeath` dans `deaths()`, après la mort effective ; X = niveau du plateau d'Erky), stratégie `erkyRush` (parametric, plateau de 7 au plus vite, Ingénieurs en priorité **pondérée, poids 25**, niveau lent). Il remplace le boss générique Ingénieur dans la Cité. Pas de serviteur permanent : plateau vide en salle 1. Tests : `check-boss-boards` section 11. **À valider** : « niveau de renfort d'Erky » = niveau de son plateau. **Réglé ensuite** : la règle codée en dur « revenu 0 en salle 1 » (`boardIncome`) est supprimée ; `rules.game.bossFirstRoomIncome` = 2 pour tous les plateaux du Boss (`donjons-et-boss.md` § 12).
