# Reprise — Atlas Wanderer

Dernière mise à jour : 7 novembre 2026 (voir les sections datées en bas, qui priment). Ce fichier résume où en est le projet, ce qui a été décidé, ce qui n'est pas encore reporté dans la documentation et ce qu'on pourrait faire ensuite. Les règles de référence restent dans `documentation/idees/nouvelles.md`.

## Par où reprendre

1. Lire `documentation/idees/nouvelles.md` (règles), puis ce fichier.
2. Ouvrir `index.html` (racine : présentation ; les autres pages du site sont dans `site/`) puis le lien vers `prototype/prototype.html`, ou directement ce dernier, pour jouer (connexion nécessaire : Tailwind et daisyUI viennent d'un CDN). `site/apercu.html` montre les graphismes SVG.
3. Voir `git log` pour le dernier commit (renfort mixte et catalogue de 60 équipements le 7 novembre). Les sections datées en bas de ce fichier priment sur les chiffres plus anciens (nombre de serviteurs, vocabulaire).

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
  - **Espèces** : Alien (générique, par défaut), Elk, Dwork, Droïde, Sorvane (remplace les félins), Ryskan, Nythe.
  - **Archétypes** : les neuf, dont le Diplomate (bonus aux alliés adjacents).
  - **Règle** : chaque serviteur a une espèce et un archétype obligatoire. Les héros en ont aussi un de chaque.
- Contenu du prototype : 62 serviteurs (une gamme de 5 rangs par archétype avec des espèces réparties, plus 12 espèce + archétype), 5 héros (un par espèce, chacun avec un archétype), 2 donjons (le Nid de la Reine apporte Médecin, la Station Oméga apporte Droïde).
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

- **Boss à trois plateaux** : trois plateaux indépendants renforcés comme un joueur avant chaque salle, un seul présenté par salle (jamais le même deux fois de suite), revenu réduit de 1, de 1 une fois sur deux, ou égal. Deux types cachés au hasard à chaque partie. Règle reportée dans `documentation/idees/nouvelles.md`, section 5. Code : `makeTeam`, `aiRenfort` et `bossRenfort` dans `prototype/moteur.js`, `BOSS_BOARDS` dans `prototype/donnees.js`.
- **Espèce par défaut** : Alien (ancien Humain).
- **Interface** : choix du donjon puis des lieutenants sur deux écrans, quatre donjons avec décors SVG (deux, la Cité des Profondeurs et la Forge de Brasier-Roc, sont à valider), glisser-déposer pour poser, équiper et ordonner, mode débogage (icône en bas à gauche).
- **À faire** : mesurer l'équilibre du Boss à trois plateaux (une simulation rapide donnait environ un tiers de victoires et des parties longues), tester sur écran tactile, valider les pouvoirs de Boss Écho et Blindage.

## Ajouts du 25 octobre 2026

### Règles et cartes modifiées (code, `documentation/idees/nouvelles.md`, `documentation/cartes.md` à jour)

- **Propositions du renfort** : 3 au niveau de renfort 1, 4 au niveau 2, 5 aux niveaux 3-4, 6 dès le niveau 5 (modifié le 7 novembre), pour les serviteurs **et** les équipements. La récompense de fusion reste à 3. Les plateaux du Boss suivent la même règle. Code : `renfortProposals` (`donnees.js`) et `drawCards` (`moteur.js`).
- **Maître-canonnier** (ex-Canonnier) : Dwork, À distance, détruit le Bouclier de sa cible avant de l'attaquer (hypothèse : « protection » = Bouclier, à confirmer). Effet `breakShield`.
- **Tireur d'élite** : Sorvane, À distance, « Cible : l'ennemi avec le moins de points de vie ». Le critère « Bouclier en priorité » a disparu du code.
- **Bombardier** : 5/7, sans À distance, pose 2 bombes de 5 dégâts sur des ennemis différents au début du combat. Un serviteur piégé qui doit attaquer n'attaque pas : sa bombe explose et ne blesse que lui (le Bouclier l'absorbe), son tour est consommé. Effet `plantBombs`, champ `bomb` sur le serviteur, pastille sur la carte. Les autres cartes à bombes restent à créer (le mécanisme est générique : nombre et dégâts réglables par carte).
- **Sondes devenues drones**, y compris les noms internes (`droneA`, `droneH`, `droneBonus`). Conflit levé : `documentation/idees/nouvelles.md` disait qu'un drone n'est jamais une unité ; la section 8 précise maintenant qu'il peut aussi être une petite unité invoquée par les Roboticiens. « Sondeur planétaire » et « Sonde d'analyse » ne sont pas concernés et gardent leur nom.

### Outils et documents

- `site/serviteurs.html` (généré par `outils/generer-serviteurs.js`) : en tête de chaque section, ventilation à droite (par espèce dans un archétype, par archétype dans une espèce, zéros atténués) et « Total N » en gras.
- `site/lieutenants.html` (même générateur, placé avant « Serviteurs » dans le menu) : lieutenants classés par archétype et par espèce, sans niveaux ; inclut ceux de `HEROES_RESERVE`.
- `CARTES_ARTILLEUR.md` : extrait manuel des cartes Artilleur (serviteurs, équipements, donjon). **Il n'est pas régénéré** par `outils/exporter-cartes.js` ; à refaire ou à automatiser.
- Après toute modification de `prototype/donnees.js` : `node outils/tout-generer.js` (cartes, pages, valeurs des règles, puis simulation de 300 parties : doit afficher 0 problème).
- **Sauvegardes locales** (`prototype/sauvegarde.js`), deux couches. **Profil d'équipage** (`PROFIL`, clé `atlasWandererProfil`) : la méta-progression, qui survit aux expéditions ; jamais refusée, migrée (`MIGRATIONS`) et complétée par les valeurs par défaut (`defaut()`), un profil illisible est mis de côté sous `…corrompu`. Pour l'instant il ne contient que `prWins` (repris de l'ancienne clé `atlasWandererPrWins`) ; la vraie méta-progression (`documentation/idees/nouvelles.md`, section 12) viendra s'y ajouter. **Expédition** (`SAVE`, clé `atlasWandererSave`) : un seul emplacement, écrite à chaque rendu stable du renfort (`autoSave` dans `interface.js`), effacée à la fin de l'expédition. Les fiches du catalogue sont enregistrées par identifiant, les objets partagés restent partagés. **Si la forme de `g` ou de `rf` change de façon incompatible, incrémenter `SAVE_VERSION`** : une expédition de version différente ou dont une carte a disparu est refusée au menu (bouton Abandonner), sans toucher au profil. Le simulateur vérifie à chaque salle que l'expédition rechargée est identique.
- **Références des cartes** : serviteurs, équipements, lieutenants et donjons portent un `id` calculé automatiquement depuis leur nom (`slug(name)` dans `donnees.js`, même règle que les noms d'illustrations) : « Flam'Gruk » → `flam-gruk`, « Kit de renfort T1 » → `kit-de-renfort-t1`. Il n'y a jamais d'id écrit à la main : renommer une carte met sa référence à jour, et une référence en double fait échouer le chargement. Les serviteurs en jeu gardent cet `id` (et un `uid` unique à la partie). Les Dummies ont une référence préfixée du donjon (`le-nid-de-la-reine--dummy-1`), pour rester distincts quand ils seront personnalisés.

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

- Un seul bouton **Renfort** remplace Serviteur et Équipement : une offre de 3 à 6 cartes (selon le niveau de renfort) mêle serviteurs et équipements. Fonction `drawOffer` dans `prototype/moteur.js` ; l'offre sauvegardée porte `kinds` (une valeur par carte) ; les anciennes sauvegardes avec un seul `kind` se rechargent encore.
- **Minimum de deux serviteurs** par offre (`MIN_SERVANTS`). Les cartes sont tirées une à une, chacune a `EQUIP_CHANCE` (0,3, provisoire) d'être un équipement, sauf quand il ne reste plus de place pour atteindre le minimum : les suivantes sont alors des serviteurs. Au niveau 1 : au plus un équipement, à n'importe quelle position. Vérifié sur 20 000 tirages par niveau (aucun tirage sous deux serviteurs ; 0,7 équipement en moyenne au niveau 1, 1,8 aux niveaux 5-6).
- Les plateaux du Boss utilisent le même tirage : ils prennent le meilleur du type visé (serviteur ou équipement) s'il est proposé, sinon de l'autre type.
- **Explorateur des confins** : « votre prochain renfort vous proposera 7 cartes » (le nom interne `bigEquipOffer` et les champs `equipOfferSize` / `equipOfferLeft` n'ont pas changé).
- `outils/simuler.js` joue le bouton Renfort (70 %) ou Niveau (30 %) ; 300 parties sans problème.

### Captures d'écran (`screens_history/`, désormais suivi par git)

- Le hook `.githooks/pre-commit` lance `outils/screens-history.py` : métadonnées retirées, conversion en webp, nom `AAAAMMJJTHHMMSS.webp` (date lue dans le nom d'origine, sinon date de modification ; suffixe `-2` en cas de doublon), suppression des sources et des `:Zone.Identifier`, puis ajout du dossier au commit.
- Activation, à refaire après chaque nouveau clone : `git config core.hooksPath .githooks`. Nécessite Python 3 avec Pillow.

### À faire ensuite

1. Créer des équipements moins nombreux mais plus pertinents (étape annoncée après le renfort mixte) : relire d'abord la liste actuelle dans `prototype/donnees.js`.
2. Régler `EQUIP_CHANCE` après quelques parties à la main, et créer une icône dédiée au bouton Renfort (il réutilise celle du serviteur).
3. Relancer la simulation d'équilibre : le renfort mixte donne moins de serviteurs par offre qu'avant.

### Équipements supprimés (7 novembre 2026)

- Les 42 anciens équipements, jetons et Jokers compris, ont été retirés (récupérables dans l'historique git, commit `8bdb68b`) et remplacés par le catalogue provisoire ci-dessous. `documentation/cartes.md` et `site/equipements.html` sont régénérés (0 équipement).
- Les serviteurs qui donnent ou utilisent un équipement (Kit de renfort, Dossier consulaire, Forgeron stellaire, Pilleur de ruine, Explorateur des confins, Chasseur de reliques…) restent dans le catalogue mais leurs équipements précis (Kit de renfort, Dossier consulaire) n'existent plus : ils n'ont plus d'effet utile.
- Ancien plan (abandonné) : 21 équipements = 1 par espèce (6, sans Alien) + 1 par archétype (9) + 1 neutre par niveau de renfort (6). **Il y a 9 archétypes** (Pilote, Ingénieur, Médecin, Sécurité, Explorateur, Artilleur, Renseignement, Roboticien, Diplomate), pas dix. Les typés doivent avoir des rangs bien répartis, car chaque partie n'a que 5 types.

### Catalogue provisoire de 60 équipements (7 novembre 2026)

- 4 équipements par type (6 espèces hors Alien + 9 archétypes), **aucun neutre**, chacun donne **+r/+r** selon son rang r. Les rangs diffèrent d'un type à l'autre (pas de gabarit fixe) : par exemple Artilleur 3-4-5-6, Sorvane 1-1-4-5. Les effets viendront plus tard ; les noms sont provisoires. Une partie en voit 16 à 20.
- **Toujours 5 types par partie** : `newGame` complète au hasard les types manquants (lieutenants qui partagent un type, type du donjon déjà présent). Pas de contrôle visible avant le début : les types tirés s'affichent dans la partie. Alien peut être tiré (il n'a pas d'équipement).
- **Jamais d'équipement au-dessus du niveau de renfort** : `drawCards` filtre les équipements au rang maximum et `drawOffer` remplace la carte par un serviteur s'il n'y en a aucun.
- `SAVE_VERSION` passe à 2 : les anciennes sauvegardes sont refusées.
- Vérifié sur 3 000 parties tirées : toujours 5 types, jamais d'équipement trop haut, jamais moins de deux serviteurs par offre ; simulation de 300 parties sans problème.

## Prochaine étape : supprimer définitivement Alien (décidé le 7 novembre 2026, pas encore fait)

L'espèce **Alien** (générique, par défaut) sort du jeu. Il restera **6 espèces** : Elk, Dwork, Droïde, Sorvane, Ryskan, Nythe. État des lieux au moment de la décision :

- **6 serviteurs** ont Alien comme espèce (sur 99) : Grenadier (rang 1, Artilleur), Attaché de liaison (1, Diplomate), Intercepteur (2, Pilote), Intrus réseau (2, Renseignement), Chef d'atelier (3, Roboticien), Spécialiste des boucliers (5, Ingénieur). À supprimer, ou à reprendre avec une autre espèce : **à décider avec l'utilisateur**.
- Aucun lieutenant ni donjon n'a le type Alien. Les donjons ont un archétype ou Droïde (Médecin, Droïde, Renseignement, Artilleur).
- Le code : `SPECIES` dans `prototype/donnees.js` (ligne `const SPECIES = ['Alien', …]`, commentaire « espèce générique, par défaut »), la couleur et l'emblème dans `prototype/svg.js`, le texte dans `outils/generer-serviteurs.js`.
- La règle « chaque serviteur a une espèce, par défaut Alien » doit changer : **toute espèce devient obligatoire** (à confirmer, car elle contraint la création des serviteurs et peut aussi toucher les serviteurs générés par des effets, comme les drones, qui n'ont aucun type).
- La documentation à nettoyer : `documentation/types/especes/alien.md` (à supprimer), `especes.md`, `types.md`, `sorvane.md` (mention de la couleur reprise des Alien), `documentation/documentation.md`, `documentation/idees/nouvelles.md` (section 11 et autres mentions), `site/regles.html`, `site/apercu.html`.
- Ensuite : `node outils/tout-generer.js` (0 problème attendu), passer `SAVE_VERSION` à 3 (les serviteurs changent) et noter Alien en section 13 de `nouvelles.md` **après confirmation** (idée abandonnée).
- Conséquence sur le tirage : le complément aléatoire des 5 types ne pourra plus tirer Alien (il disparaît de `ALL_TYPES`), ce qui règle aussi le cas « type sans équipement ».
- Questions à poser avant de commencer : que faire des 6 serviteurs (suppression ou nouvelle espèce), et faut-il garder la valeur par défaut « aucune espèce » pour les serviteurs sans type, comme les drones.

## À faire ensuite (après Alien)

1. Remplacer les équipements +r/+r par des effets plus pertinents (catalogue provisoire de 60).
2. Régler `EQUIP_CHANCE`, créer l'icône du bouton Renfort, relancer la simulation d'équilibre.
3. Jouer quelques parties à la main (renfort mixte, équipements, 5 types toujours complets).
