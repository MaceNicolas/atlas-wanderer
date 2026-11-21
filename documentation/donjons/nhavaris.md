# Nhavaris — La Cité des Profondeurs

## Présentation

Nhavaris est l'une des cités les plus importantes et les plus anciennes du monde natal des Sorvanes.

Enfouie à plusieurs kilomètres sous la surface de la planète, cette cité millénaire prend la forme d'une gigantesque fourmilière souterraine.

Elle est constituée d'un immense réseau de galeries, de tunnels et d'alvéoles creusés dans la roche. Les grandes salles y sont rares, l'essentiel de la cité étant composé d'espaces relativement confinés.

Nhavaris est une cité toujours vivante, abritant une population considérable de Sorvanes et de Droïdes.

## Fonction de la cité

Nhavaris est un important centre de formation militaire sorvane.

Son architecture labyrinthique permet d'organiser des entraînements à grande échelle, à l'abri des regards extérieurs. Les futurs soldats sorvanes y apprennent notamment à combattre et à évoluer dans des environnements souterrains complexes.

Les Droïdes constituent une part importante de la population et participent pleinement à la vie de la cité.

Les Ingénieurs assurent le fonctionnement et l'entretien des infrastructures indispensables à la survie de cette immense métropole souterraine.

La vie prolongée dans les profondeurs est également liée à la pâleur caractéristique des Sorvanes.

## Thématiques du donjon

**Thématiques majeures :**
- Sorvane
- Sécurité

**Thématiques secondaires :**
- Droïde
- Ingénieur

## Boss du donjon

Le joueur affrontera régulièrement quatre boss récurrents, chacun associé à une thématique :

1. Un boss Sorvane
2. Un boss Droïde
3. Un boss Ingénieur
4. Un boss Sécurité

Leur identité, leurs pouvoirs et leurs stratégies de combat restent à définir.

### Boss Sorvane : Mara (préparée le 21 novembre 2026)

- **Sorvane, Renseignement**, responsable du renseignement militaire. 25 PV.
- **Pouvoir, Neutralisation stratégique** : au début du combat, réduit à 1 l'ATQ de l'ennemi qui a le plus d'ATQ et à 1 les PV de l'ennemi qui a le plus de PV. Les deux effets sont indépendants et peuvent viser le même serviteur ou deux serviteurs différents.
- **Stratégie** : recruter les serviteurs les plus puissants disponibles, sans chercher de synergie entre espèces ou affectations ; constituer une armée de serviteurs individuellement puissants et neutraliser les principales menaces adverses dès le début du combat.
- **Particularité** : très dangereuse contre les compositions reposant sur un ou deux serviteurs aux caractéristiques très élevées.

### Boss Sécurité : Cyro (défini le 21 novembre 2026)

- **Sorvane, Sécurité**, entraîneur militaire chargé de superviser une salle d'entraînement de Nhavaris. 25 PV, aucun pouvoir pour le moment.
- **Ne recrute aucun serviteur** : son plateau est composé d'unités prédéfinies dont la puissance évolue avec la progression du joueur.
- **Deux Gardiens de la salle**, toujours présents, **toujours placés à gauche et à droite du plateau** : Droïde, Sécurité, niveau 6, Provocation, ATQ et PV égaux au numéro du match. Unités exclusives à cette salle, non recrutables ailleurs pour le moment.
- **Un Fusilier** (Sorvane) entre les deux Gardiens aux matchs 3, 6, 9, 12…
- Serviteurs modifiés : le Fusilier devient Sorvane, la Sentinelle devient Ryskan.

### Boss Ingénieur : Erky (défini le 21 novembre 2026)

- Ingénieur et Sorvane, 28 PV.
- **Pouvoir** : chaque fois qu'un serviteur allié meurt, donne +X/+X à un autre serviteur allié aléatoire, X étant le niveau de renfort d'Erky.
- **Stratégie** : recruter un maximum d'alliés rapidement, de type Ingénieur en priorité.

### Boss Droïde : DR-1O (défini le 21 novembre 2026)

- **Pouvoir** : la première fois qu'un Droïde allié devrait mourir, il survit avec 1 PV.
- **Concept** : de petits drones assez faibles mais qui se renforcent. Au début, il présente un plateau assez costaud ; plus le joueur tue de Droïdes, moins ils sont forts.
- **Plateau** : un DR-1X (Droïde Ingénieur, sans châsse, statistiques égales au numéro du match) en match 1, puis un DR-1X de plus tous les deux matchs, qui reste sur le plateau. Chacun garde une aura distribuée sans doublon parmi sept (« Les Droïdes DR-1X ont… » Bouclier, +2 ATQ, +2 PV, À distance, Fureur, +1 ATQ et +1 PV, +1 ATQ et +1 PV par DR-1X allié).
- Dans le jeu : types tirés de la Cité pour le moment imposés à Droïde et Ingénieur. Détail de la traduction en données : `documentation/mecaniques/donjons-et-boss.md`, section 11.

## Idées de mini-boss Ingénieur

Pistes notées le 21 novembre 2026, rien n'est arrêté. Chaque idée donne une stratégie (la façon dont le boss se constitue et joue) et un pouvoir.

### A. Le Répartiteur — L'armée équilibrée

*Mon favori.*

**Stratégie :** le boss cherche à maintenir tous ses serviteurs en vie en redistribuant leurs ressources.

**Pouvoir — Équilibrage structurel :** début de combat, les PV de tous les serviteurs alliés deviennent égaux à la moyenne de leurs PV, arrondie au supérieur.

Le joueur doit privilégier les éliminations rapides plutôt que d'affaiblir toute l'équipe.

### B. Le Reconstructeur — L'armée qui se répare

**Stratégie :** des serviteurs fragiles mais capables de se renforcer à mesure que leurs alliés tombent.

**Pouvoir — Récupération des matériaux :** chaque fois qu'un serviteur allié meurt, donne +2/+2 à un autre serviteur allié aléatoire.

Plus le joueur élimine d'ennemis, plus les survivants deviennent dangereux.

### C. L'Architecte — La défense progressive

**Stratégie :** une composition défensive qui devient de plus en plus résistante au cours du combat.

**Pouvoir — Renforcement d'urgence :** après chaque attaque ennemie, donne +2 PV à un serviteur allié aléatoire.

L'objectif du joueur est de percer la défense avant qu'elle ne devienne trop solide.
