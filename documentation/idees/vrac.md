# Idées en vrac

Idées notées au vol, à traiter plus tard. Rien ici n'est une règle : les règles de référence restent dans `documentation/idees/nouvelles.md`. Quand une idée est retenue, elle part dans `documentation/idees/nouvelles.md` (ou dans la documentation) et sort de ce fichier.

- **Malédiction (serviteur de niveau 6 ou 7)** : au début du combat, le serviteur cible au hasard un serviteur adverse et lui applique une malédiction. Un serviteur maudit n'inflige pas de dégâts au Boss ni aux héros à la fin d'une salle d'exploration (il ne compte plus dans les dégâts de fin de combat). Ouvert : le niveau 6 ou 7 dépasse le rang maximum actuel (5).
- **Bombe à retardement** : pouvoir qui cible le serviteur adverse le plus à gauche. Soit il explose, soit il est tué la deuxième fois qu'il attaque. Ouvert : choisir entre les deux variantes, ou en faire deux pouvoirs.
- **Fury** : nouveau mot-clé, le serviteur attaque deux fois. Ouvert : deux attaques de suite ou deux passages dans la file d'attaque, et interaction avec Poison, À distance et la riposte.
- **Pouvoirs de héros payés en Datacrons** : donner à certains héros un pouvoir activable pendant le renfort contre des Datacrons. À rapprocher des mots-clés à coût (Activation, Vampirisme) de `documentation/idees/nouvelles.md`, section 7.
- **Mini-Boss** : des serviteurs spéciaux qui restent en permanence sur les plateaux du Boss, et autour desquels la stratégie de chaque plateau du Boss se construit. Ouvert : un par plateau ou partagé, visibilité pour le joueur, lien avec les types cachés du Boss.
- **Foreuses des Dworks** : les Dworks utilisent des Cris de guerre pour installer des foreuses pendant les phases de renfort. Les ressources de la prochaine salle sont affichées à l'avance et déterminent les bonus générés par ces foreuses à chaque renfort. Cela crée une mécanique d'anticipation et d'investissement propre aux Dworks, tout en restant compatible avec le fonctionnement général d'Atlas Wanderer.
- **Une seule copie d'une carte sur le plateau** : on ne pourrait pas avoir plusieurs fois la même carte sur le plateau. Les triples (fusion en doré) deviendraient ainsi une sorte d'investissement : il faut garder des copies en main en attendant la troisième. Ouvert : lien avec la main de 7 emplacements, qui limite déjà ce stockage ; les copies en main comptent-elles pour la fusion comme aujourd'hui ; que faire d'une copie qu'on ne peut pas poser (la jeter, la garder) ; effet sur la fréquence des fusions, déjà jugée rare sans relance.
- **Son** : ajouter bruitages et musique au prototype (navigateur). Piste : un module `prototype/son.js` avec `jouer("tir")`, appelé là où `animations.js` déclenche déjà les animations (tir, dégâts, fin de combat, renfort, clic de carte) ; bruitages simples synthétisés en Web Audio (aucun fichier), musique et ambiances en fichiers `.ogg`/`.mp3` dans `prototype/sons/` ; bouton muet et volume stockés dans le `localStorage`. Pièges : le navigateur bloque le son avant le premier clic (lancer la musique à ce moment), et caler chaque son sur son animation.

## Cœur énergétique (race Droïde)

Concept ouvert : aucune règle définitive n'est arrêtée à ce stade.

### Intention générale

La race des **Droïdes** pourrait s'articuler autour de la puissance de leur **cœur énergétique** : une source d'énergie que le joueur peut développer progressivement au cours d'une mission.

Cette progression donnerait aux Droïdes une identité propre. Plutôt que de dépendre uniquement de l'amélioration individuelle des serviteurs, leur efficacité pourrait aussi être liée au développement de cette source de puissance commune ou individuelle.

### Principes envisagés

- **Progression pendant la mission** : la puissance du cœur pourrait augmenter au fil des combats et des phases de renfort.
- **Effets variables** : les Droïdes pourraient exploiter cette puissance de différentes façons, selon leur fonction ou leurs capacités.
- **Diversité des stratégies** : les cartes pourraient encourager plusieurs approches plutôt qu'une seule stratégie obligatoire.
- **Complémentarité avec les drones** : les drones invoqués et améliorés resteraient une possibilité au sein de la race, sans nécessairement représenter toute son identité.

### Pistes pour exploiter la puissance du cœur

1. **Bonus liés à la puissance** : certains Droïdes gagnent des statistiques ou des capacités selon le niveau de puissance du cœur. Exemples : gagner de l'Attaque ou des Points de Vie selon la puissance atteinte ; débloquer un effet supplémentaire à partir d'un seuil ; améliorer une capacité quand le cœur devient plus puissant.
2. **Conversion de puissance** : certains Droïdes convertissent la puissance du cœur en un effet précis. Exemples : infliger des dégâts supplémentaires lors d'une attaque ; récupérer des Points de Vie ; renforcer un autre serviteur ; produire un effet défensif ou de soutien.
3. **Amplification et surcharge** : certains Droïdes tirent davantage de puissance du cœur, éventuellement en dépassant temporairement ses limites. Exemples : obtenir temporairement de l'Attaque ; déclencher un effet plus puissant sous certaines conditions ; dépenser ou mobiliser temporairement de la puissance pour produire un effet important. Les modalités et les éventuelles contreparties restent à définir.
4. **Progression du cœur** : elle pourrait venir de cartes, de choix effectués pendant les phases de renfort ou d'autres éléments de la mission. Exemples : augmenter le niveau de puissance ; récupérer un module qui modifie les effets du cœur ; accélérer la progression du cœur ; choisir entre plusieurs améliorations possibles.

### Profils de Droïdes envisageables

- **Combattants** : convertissent la puissance en efficacité offensive.
- **Défenseurs** : exploitent la puissance pour survivre ou protéger leurs alliés.
- **Ingénieurs** : contribuent à développer ou optimiser le cœur.
- **Artillerie** : convertit la puissance en dégâts.
- **Soutiens** : transmettent ou partagent certains bénéfices avec d'autres serviteurs.
- **Prototypes** : deviennent particulièrement efficaces lorsque la puissance atteint un seuil élevé.

Ces profils sont des pistes de conception, pas des catégories obligatoires.

### Axes de conception encore ouverts

- **Où se trouve le cœur ?** Un cœur commun à la mission (une valeur globale dont les Droïdes profitent), un cœur propre à chaque Droïde (chaque unité a sa puissance), ou un cœur commun accompagné de modules qui changent ses effets.
- **Comment la puissance progresse-t-elle ?** Elle pourrait augmenter de façon permanente au cours de la mission, être améliorée en recrutant certaines cartes, être augmentée grâce à des choix de renfort, s'accumuler temporairement pendant les combats, ou être dépensée, consommée ou mobilisée temporairement. Ces possibilités ne sont pas mutuellement exclusives, mais leur combinaison reste à déterminer.
- **Quel est le rôle des modules ?** Ils pourraient modifier la manière dont le cœur est exploité (attaque, défense, soutien, surcharge). Il reste à décider s'ils sont cumulables, s'ils remplacent les précédents, ou si le joueur choisit parmi plusieurs améliorations.
- **Quelle place pour les drones ?** Ils pourraient constituer une branche particulière de la race. Il reste à déterminer s'ils interagissent directement avec le cœur énergétique ou s'ils fonctionnent comme une mécanique complémentaire.

### Points de vigilance

- Éviter que toutes les cartes Droïdes se résument à de simples bonus de statistiques.
- Veiller à ce que la progression du cœur soit perceptible sans rendre les premiers combats trop difficiles.
- Éviter qu'une seule façon d'améliorer le cœur soit systématiquement supérieure aux autres.
- Préserver la lisibilité des effets pendant les combats automatiques.
- Encadrer les effets de surcharge, de dépense ou de déclenchement afin d'éviter les interactions excessives ou les boucles infinies.
- Faire en sorte que les Droïdes restent intéressants même lorsque la puissance du cœur est encore faible.

### Résumé

Le cœur énergétique pourrait devenir le fil conducteur de la race Droïde dans Atlas Wanderer. Sa puissance progresserait ou serait exploitée au fil de la mission, tandis que les différents serviteurs proposeraient plusieurs façons d'en tirer parti : amélioration de statistiques, conversion en effets, amplification, surcharge ou soutien des alliés. La nature du cœur, sa progression, son éventuel caractère commun ou individuel, le rôle des modules et son lien avec les drones restent à explorer avant de fixer les règles.

## Noms d'équipements par archétype (pistes)

Pistes de noms proposées le 9 novembre 2026, deux par rang (6 rangs) et par archétype. Rien n'est retenu : les équipements actuels du jeu gardent leurs noms tant qu'on ne les remplace pas. Les pouvoirs à leur attribuer restent à définir.

| Archétype | Rang 1 | Rang 2 | Rang 3 | Rang 4 | Rang 5 | Rang 6 |
|---|---|---|---|---|---|---|
| **Pilote** (navigation, manœuvres, réflexes, anticipation) | Gants de pilotage ; Viseur de navigation | Harnais inertiel ; Calculateur de trajectoire | Interface de vol neural ; Gyroscope de précision | Compensateur gravitationnel ; Navigateur quantique | Matrice de prédiction ; Synapse de navigation | Cœur de navigation stellaire ; Chronoscope de trajectoire |
| **Ingénieur** (maintenance, énergie, réparations, optimisation) | Clé magnétique ; Soudeur à plasma | Scanner de circuits ; Multitool de bord | Régulateur de flux ; Injecteur de nanites | Convertisseur de matière ; Stabilisateur de réacteur | Noyau de transmutation ; Forge moléculaire portative | Singularité de poche ; Réacteur à vide quantique |
| **Médecin** (soins, biologie, chirurgie, régénération) | Trousse de secours ; Injecteur médical | Scanner biométrique ; Patch de régénération | Défibrillateur cellulaire ; Sérum de reconstruction | Assistant chirurgical autonome ; Matrice de cicatrisation | Incubateur de cellules souches ; Régénérateur tissulaire avancé | Cœur biosynthétique expérimental ; Chambre de renaissance cellulaire |
| **Sécurité** (défense, armures, contrôle des accès, neutralisation) | Matraque électrique ; Gilet balistique | Bouclier antiémeute ; Menottes magnétiques | Armure réactive ; Projecteur de stase | Générateur de rempart ; Émetteur de suppression | Exosquelette de siège ; Bastion gravitationnel | Égide à antimatière ; Armure de forteresse mobile |
| **Explorateur** (reconnaissance, survie, cartographie, adaptation) | Boussole stellaire ; Bottes tout-terrain | Scanner géologique ; Filtre atmosphérique | Cartographe holographique ; Sonde de terrain | Détecteur d'anomalies ; Combinaison adaptative | Analyseur dimensionnel ; Balise de reconnaissance quantique | Prisme des mondes ; Cartographe de l'inconnu |
| **Artilleur** (armement, puissance de feu, ciblage, munitions) | Viseur laser ; Chargeur renforcé | Stabilisateur de tir ; Canon à impulsions | Lunette de ciblage thermique ; Accélérateur de projectiles | Batterie à plasma ; Correcteur balistique prédictif | Canon à particules ; Condensateur de surcharge | Désintégrateur à gravitons ; Accélérateur de matière noire |
| **Renseignement** (espionnage, infiltration, piratage, sabotage) | Micro espion ; Décodeur portatif | Brouilleur de signal ; Caméra furtive | Masque holographique ; Injecteur de virus | Cape de réfraction ; Module de falsification | Extracteur de mémoire ; Parasite informatique autonome | Voile d'invisibilité quantique ; Décrypteur de conscience |
| **Roboticien** (automates, drones, essaims, intelligence artificielle) | Pince robotique ; Télécommande de drone | Bras articulé auxiliaire ; Kit de microdrones | Module de synchronisation ; Processeur de servomoteurs | Contrôleur d'essaim ; Assembleur de nanorobots | Matrice de conscience artificielle ; Ruche de drones autonomes | Noyau d'intelligence collective ; Générateur d'automates autoréplicants |
| **Diplomate** (communication, négociation, influence, cohésion) | Traducteur universel ; Insigne consulaire | Émetteur diplomatique ; Analyseur vocal | Médiateur holographique ; Module de synchronie | Projecteur empathique ; Interface de négociation | Résonateur de cohésion ; Amplificateur de présence | Couronne de concorde ; Nexus de conscience partagée |

## Pouvoirs d'équipement par archétype (pistes)

Pistes de pouvoirs proposées le 9 novembre 2026, 12 par archétype (deux par rang), pour des équipements : le pouvoir s'exécute à travers le serviteur qui porte l'équipement. Rien n'est retenu et aucun équipement du jeu n'a encore de pouvoir. Les noms sont à part (section « Noms d'équipements par archétype »). Pour le Roboticien, les drones invoqués sont des 1/1 sans pouvoir, sauf précision.

### Pilote
Identité : initiative, anticipation, esquive, coordination des Pilotes, progression au fil des combats.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : donne +1 ATQ à un Pilote allié aléatoire. |
| 1 | Quand ce serviteur attaque : donne +1 ATQ à un allié adjacent pour ce combat. |
| 2 | Début de combat : donne +1/+1 à tous les Pilotes alliés. |
| 2 | Quand ce serviteur est attaqué : retire 1 ATQ à son attaquant pour ce combat. |
| 3 | Fin de renfort : donne +1 PV permanent à un Pilote allié aléatoire. |
| 3 | Quand ce serviteur attaque : inflige 2 dégâts à un ennemi aléatoire avant son attaque. |
| 4 | Début de combat : donne Bouclier à un Pilote allié aléatoire. |
| 4 | Quand un Pilote allié meurt : ce serviteur gagne +2/+2 permanents. |
| 5 | Début de combat : tous les Pilotes alliés gagnent +2 ATQ et attaquent en priorité les Pilotes ennemis, si possible. |
| 5 | Quand ce serviteur survit à un combat : donne +2/+2 permanents à un autre Pilote allié aléatoire. |
| 6 | Début de combat : donne Fureur à deux Pilotes alliés aléatoires pour ce combat. |
| 6 | Quand ce serviteur est attaqué : réduit l'ATQ de son attaquant de moitié pour ce combat, arrondie à l'inférieur, avant les dégâts. |

### Ingénieur
Identité : amélioration technique, équipements, optimisation, Boucliers, renforcement de l'équipage.

| Rang | Pouvoir |
|---|---|
| 1 | Fin de renfort : donne +1 PV permanent à un allié aléatoire. |
| 1 | Début de combat : donne +1/+1 à un allié équipé. |
| 2 | Début de combat : donne +2 PV à un allié aléatoire. |
| 2 | Quand ce serviteur perd son Bouclier : donne +2 ATQ à un allié aléatoire. |
| 3 | Fin de renfort : donne +1/+1 permanent à un allié équipé aléatoire. |
| 3 | Début de combat : donne Bouclier à un allié équipé aléatoire. |
| 4 | Passif : les drones alliés gagnent +2/+2 tant que ce serviteur est en vie. |
| 4 | Quand ce serviteur attaque : donne +1/+1 à un allié aléatoire pour ce combat, doublé si cet allié possède un équipement. |
| 5 | Début de renfort : découvre un équipement d'un type présent dans l'équipe. |
| 5 | Début de combat : chaque allié équipé gagne +2/+2 pour ce combat. |
| 6 | Fin de renfort : donne +2/+2 permanents à deux alliés équipés aléatoires. |
| 6 | Début de renfort : découvre un équipement d'un type absent de l'équipe. |

### Médecin
Identité : soins, survie, restauration des protections, résistance à la mort, soutien.

| Rang | Pouvoir |
|---|---|
| 1 | Quand ce serviteur attaque : soigne 1 PV à un allié blessé aléatoire. |
| 1 | Début de combat : donne +2 PV à un allié aléatoire. |
| 2 | Quand un allié est attaqué : soigne 1 PV à cet allié après les dégâts, s'il survit. |
| 2 | Râle d'agonie : soigne 3 PV à tous les alliés. |
| 3 | Quand ce serviteur attaque : soigne 3 PV à l'allié le plus blessé. |
| 3 | Début de combat : donne Bouclier à un allié aléatoire sans Bouclier. |
| 4 | Quand un allié meurt : donne +2/+3 à un autre allié aléatoire pour ce combat. |
| 4 | Quand ce serviteur attaque : rend un Bouclier perdu à un allié aléatoire qui en possédait un au début du combat. |
| 5 | Début de combat : donne Renaissance à un allié aléatoire pour ce combat. |
| 5 | Quand un allié survit à une attaque avec moins de la moitié de ses PV : soigne 5 PV à cet allié, une fois par combat. |
| 6 | Râle d'agonie : rend tous leurs PV aux alliés survivants et leur donne +3 ATQ pour ce combat. |
| 6 | Début de combat : donne Renaissance aux deux alliés adjacents pour ce combat. |

### Sécurité
Identité : Provocation, Bouclier, défense, interception, riposte, neutralisation des menaces.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : donne +2 PV à un allié adjacent. |
| 1 | Quand ce serviteur est attaqué : inflige 1 dégât à son attaquant avant la riposte. |
| 2 | Début de combat : ce serviteur gagne Provocation pour ce combat. |
| 2 | Quand ce serviteur attaque : retire le Bouclier de sa cible avant d'infliger ses dégâts. |
| 3 | Début de combat : ce serviteur gagne Bouclier. |
| 3 | Quand ce serviteur perd son Bouclier : il gagne +3 ATQ pour ce combat. |
| 4 | Début de combat : donne Provocation et +4 PV à un allié adjacent. |
| 4 | Quand ce serviteur attaque : il cible l'ennemi ayant le moins de PV, sauf si une Provocation l'en empêche. |
| 5 | Début de combat : inflige 3 dégâts à l'ennemi ayant le plus d'ATQ. |
| 5 | Quand un allié adjacent perd son Bouclier : ce serviteur gagne +3/+3 pour ce combat. |
| 6 | Début de combat : donne Bouclier et Provocation aux deux alliés adjacents. |
| 6 | Quand ce serviteur est attaqué : inflige à son attaquant des dégâts égaux à la moitié de son ATQ, arrondie à l'inférieur, avant de subir les dégâts. |

### Explorateur
Identité : diversité des types, découverte, adaptation aux rencontres, reconnaissance, récompenses.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : ce serviteur gagne +1 ATQ par espèce différente parmi les alliés. |
| 1 | Début de combat : ce serviteur gagne +1 PV par archétype différent parmi les alliés. |
| 2 | Début de combat : donne +1/+1 à un allié aléatoire pour chaque espèce différente parmi les ennemis, maximum +4/+4. |
| 2 | Fin de renfort : donne +1 PV permanent à un allié d'une espèce différente de celle du porteur. |
| 3 | Début de combat : ce serviteur gagne À distance pour ce combat si au moins trois espèces différentes sont présentes parmi les alliés. |
| 3 | Quand ce serviteur attaque : inflige 2 dégâts supplémentaires si sa cible appartient à une espèce différente de la sienne. |
| 4 | Début de renfort : la prochaine proposition de cartes contient une quatrième carte parmi laquelle choisir. |
| 4 | Début de combat : donne +2/+2 à un allié aléatoire pour chaque archétype ennemi différent, avec un maximum de trois alliés. |
| 5 | Fin de renfort : donne +1/+1 permanent à un allié aléatoire de chaque espèce présente dans l'équipe. |
| 5 | Début de renfort : découvre un équipement d'un type absent de l'équipe. |
| 6 | Début de combat : ce serviteur gagne +2/+2 par archétype différent parmi les alliés. |
| 6 | Début de renfort : la prochaine proposition contient cinq cartes au lieu de trois, et on peut en conserver deux. |

### Artilleur
Identité : tirs à distance, bombardements, destruction des Boucliers, élimination des cibles, puissance de feu.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : inflige 1 dégât à un ennemi aléatoire. |
| 1 | Quand ce serviteur attaque : il gagne +1 ATQ pour cette attaque. |
| 2 | Début de combat : place une bombe infligeant 2 dégâts sur un ennemi aléatoire. |
| 2 | Quand ce serviteur attaque : retire le Bouclier de sa cible avant d'infliger ses dégâts. |
| 3 | Début de combat : donne À distance à ce serviteur pour ce combat. |
| 3 | Quand ce serviteur attaque : inflige 2 dégâts à un autre ennemi aléatoire. |
| 4 | Début de combat : place deux bombes infligeant chacune 3 dégâts sur des ennemis aléatoires. |
| 4 | Quand ce serviteur attaque : il cible l'ennemi ayant le moins de PV, sauf si une Provocation l'en empêche. |
| 5 | Début de combat : inflige 4 dégâts à trois ennemis aléatoires distincts. |
| 5 | Quand ce serviteur détruit un ennemi : inflige 5 dégâts à un autre ennemi aléatoire. |
| 6 | Début de combat : place une bombe infligeant 6 dégâts sur chaque ennemi. |
| 6 | Début de combat : ce serviteur gagne À distance et Fureur pour ce combat. |

### Renseignement
Identité : sabotage, affaiblissement, perturbation des défenses, manipulation des statistiques, élimination ciblée.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : retire 1 ATQ à un ennemi aléatoire pour ce combat. |
| 1 | Quand ce serviteur attaque : retire 1 ATQ à sa cible pour ce combat avant les dégâts. |
| 2 | Début de combat : retire le Bouclier d'un ennemi aléatoire. |
| 2 | Début de combat : retire Provocation à l'ennemi le plus à gauche pour ce combat. |
| 3 | Début de combat : réduit de 3 l'ATQ de l'ennemi ayant le plus d'ATQ pour ce combat. |
| 3 | Quand ce serviteur attaque : échange l'ATQ et les PV actuels de sa cible avant les dégâts. |
| 4 | Début de combat : retire tous les Boucliers ennemis. |
| 4 | Début de combat : réduit de moitié l'ATQ de deux ennemis aléatoires pour ce combat, arrondie à l'inférieur. |
| 5 | Début de combat : fixe les PV actuels d'un ennemi aléatoire à 1, sans affecter son Bouclier. |
| 5 | Quand ce serviteur attaque : vole 2 ATQ à sa cible pour ce combat avant les dégâts. |
| 6 | Début de combat : échange l'ATQ et les PV actuels de l'ennemi ayant le plus d'ATQ. |
| 6 | Début de combat : fixe les PV actuels des deux ennemis ayant le plus de PV à 1, sans affecter leurs Boucliers. |

### Roboticien
Identité : invocation de drones, essaims, fabrication, amélioration des automates, exploitation des emplacements libres.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : donne +1 ATQ à un drone allié aléatoire. |
| 1 | Râle d'agonie : invoque un drone 1/1. |
| 2 | Début de combat : invoque un drone 1/1. |
| 2 | Passif : les drones alliés gagnent +1 PV tant que ce serviteur est en vie. |
| 3 | Quand ce serviteur attaque : donne +1/+1 à un drone allié aléatoire pour ce combat. |
| 3 | Râle d'agonie : invoque deux drones 2/2. |
| 4 | Début de combat : invoque un drone 3/3 avec Bouclier. |
| 4 | Quand un drone allié meurt : donne +2/+2 à un autre drone allié aléatoire pour ce combat. |
| 5 | Quand une place se libère sur le plateau : invoque un drone 2/2, au maximum deux fois par combat. |
| 5 | Début de combat : donne +2/+2 et Bouclier à tous les drones alliés déjà présents. |
| 6 | Début de combat : invoque deux drones 4/4 avec À distance. |
| 6 | Quand un drone allié meurt : invoque un drone 3/3 avec Renaissance à sa place, au maximum trois fois par combat. |

### Diplomate
Identité : cohésion, synergies entre alliés, partage des forces, négociation de ressources, réactivation des capacités.

| Rang | Pouvoir |
|---|---|
| 1 | Début de combat : donne +1 PV aux alliés adjacents. |
| 1 | Début de combat : donne +1 ATQ à un allié adjacent aléatoire. |
| 2 | Fin de renfort : donne +1 PV permanent aux deux alliés adjacents. |
| 2 | Début de combat : ce serviteur copie l'ATQ de son voisin ayant le plus d'ATQ si elle est supérieure à la sienne. |
| 3 | Début de combat : donne +2/+2 aux deux alliés adjacents. |
| 3 | Début de combat : l'allié adjacent ayant le moins de PV copie les PV maximaux de l'autre allié adjacent s'ils sont supérieurs. |
| 4 | Début de renfort : découvre un équipement d'un type présent dans l'équipe. |
| 4 | Début de combat : déclenche à nouveau le Cri de guerre d'un allié adjacent aléatoire qui en possède un. |
| 5 | Fin de renfort : donne +2/+2 permanents aux deux alliés adjacents. |
| 5 | Début de combat : les deux alliés adjacents copient l'ATQ la plus élevée entre eux si elle est supérieure à la leur. |
| 6 | Début de combat : déclenche à nouveau les Cris de guerre des deux alliés adjacents qui en possèdent un. |
| 6 | Début de combat : tous les alliés gagnent +1/+1 pour chaque archétype différent présent dans l'équipe. |

## Idées de mécanique

### L'Influence : une ressource gagnée pendant le renfort

Idée notée le 9 novembre 2026. Rien n'est retenu. Cette mécanique est particulièrement adaptée à un autobattler avec une phase de recrutement.

Les Diplomates produisent de l'**Influence**, une ressource qui permet de modifier les propositions de serviteurs, d'améliorer les équipements ou d'obtenir des avantages lors du prochain combat.

Exemples proposés :

- **Attaché commercial** (rang 2) : fin de renfort : gagne 1 Influence si vous possédez au moins trois espèces différentes.
- **Consul suprême** (rang 6) : début de combat : donne +1/+1 à tous vos serviteurs pour chaque tranche de 3 Influence dépensée depuis le début de la partie.

Cette mécanique peut donner une identité économique aux Diplomates, distincte de leurs pouvoirs en combat.
