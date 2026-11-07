# Cartes du prototype

Export automatique de `prototype/donnees.js` (script `outils/exporter-cartes.js`). Toutes les valeurs sont provisoires.

- Serviteurs : 99 — équipements : 60 — lieutenants : 12 — donjons : 4.
- Niveau de renfort maximum : 6 (rang maximum proposé). Les serviteurs de rang 7 ne s'obtiennent que par fusion.
- Plateau : 7 serviteurs. Main : 7 cartes.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre deux options : un bonus permanent de +N PV ou +N ATQ tiré au hasard (N = niveau de renfort), ou un pouvoir tiré au hasard parmi ceux des autres survivants. Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par archétype

### Pilote (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cadet | 1 | 2/2 | Elk | Pilote | — | Lorsqu'un Pilote ennemi meurt : gagne définitivement +1/+1 |
| Intercepteur | 2 | 3/3 | Alien | Pilote | — | Cible en priorité un Pilote ennemi |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | — | Lorsqu'il survit à son attaque : +2/+0 à lui-même |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | — | Fin de renfort : donne définitivement +2 PV aux Pilotes alliés |
| Spécialiste en brouillage | 3 | 2/5 | Nythe | Pilote | — | Lorsqu'un ennemi attaque : lui retire X ATQ, X étant son rang |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Fin de renfort : donne définitivement +3 ATQ aux Pilotes alliés |
| LR-04 | 4 | 4/6 | Droïde | Pilote | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| C0-4193 | 5 | 6/8 | Droïde | Pilote | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : chaque Pilote allié gagne +0/+4 pour chaque Pilote ennemi |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Lorsqu'un Pilote allié meurt : +5/+5 aux autres alliés |

### Ingénieur (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| RD44 | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 aux autres alliés |
| Z3RK | 2 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier | Début de combat : +2/+0 à un allié équipé |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier | Début de combat : +1/+1 aux autres alliés |
| Spécialiste des boucliers | 5 | 3/7 | Alien | Ingénieur | — | Fin de renfort : +3/+0 à un allié équipé |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | — | Début de renfort : ajoute à votre main un équipement de niveau 5 non disponible durant cette mission |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier | Début de combat : +2/+2 aux autres alliés |

### Médecin (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | — | Râle d'agonie : +2/+2 à un allié aléatoire |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier | — |
| DE-D0 | 5 | 0/8 | Droïde | Médecin | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |

### Sécurité (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible, ou des dégâts à un de ses alliés voisins |
| Fusilier | 3 | 5/4 | Ryskan | Sécurité | À distance | — |
| Sentinelle | 3 | 4/3 | Sorvane | Sécurité | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| Sergent | 3 | 3/6 | Nythe | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier | — |
| XN-FF45 | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | Provocation, Bouclier | Début de combat : +0/+4 aux autres alliés |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier | Son Bouclier résiste à 2 coups |
| Brise-siège | 7 | 10/17 | Ryskan | Sécurité | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |

### Explorateur (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | — | Début de combat : +2/+1 par type différent dans votre équipe |
| AUW0 | 2 | 2/4 | Droïde | Explorateur | À distance, Poison | — |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | — | Début de combat : +2/+0 par type différent chez les ennemis |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | — | Début de combat : +3/+0 par type différent dans votre équipe |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | Adaptation | Fin de combat : s'il a survécu, choisissez une Adaptation supplémentaire pour lui |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | — | Fin de combat : s'équipe d'un équipement de niveau 3 non disponible durant cette partie |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit un équipement (niveau actuel) ; Râle d'agonie : reçoit un équipement (niveau actuel) |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | Adaptation | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | — | Fin de renfort : chaque allié gagne définitivement +2/+2 par type différent dans votre équipe |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | — | Début de combat : +2/+2 par type différent dans votre équipe (max 3) ; Début de combat : absorbe l'ennemi ayant le moins de PV : conserve son ATQ et ses PV (équipements compris), mais ni ses équipements ni ses pouvoirs |

### Artilleur (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Grenadier | 1 | 3/2 | Alien | Artilleur | À distance | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | Fureur | — |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| F5-5F | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | À distance | Cible : l'ennemi avec le moins de points de vie |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |

### Renseignement (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Embusqué | 1 | 2/2 | Elk | Renseignement | Adaptation | — |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Intrus réseau | 2 | 2/3 | Alien | Renseignement | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Scout | 2 | 2/3 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Commando | 3 | 3/4 | Elk | Renseignement | Adaptation | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| W1X05 | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : inverse la vie et l'attaque de l'ennemi ayant le plus de points de vie |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |

### Roboticien (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| GAD5 | 1 | 2/3 | Droïde | Roboticien | — | Fin de renfort : +0/+1 à lui-même |
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Chef d'atelier | 3 | 2/5 | Alien | Roboticien | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | — | Début de combat : invoque un drone 1/1 à sa droite |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | Début de renfort : le modèle PR gagne +2/+2 |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| FF548 | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Diplomate (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Attaché de liaison | 1 | 1/4 | Alien | Diplomate | — | Début de combat : +1/+0 aux alliés adjacents |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | Cri de guerre : reçoit un Dossier consulaire (équipement -1/+2) |
| KRL | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | — | Début de combat : +2/+1 aux alliés adjacents |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| AL-11 | 4 | 4/7 | Droïde | Diplomate | — | Râle d'agonie : reproduit les Râles d'agonie déjà utilisés durant ce combat |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Assembleur | 5 | 4/9 | Nythe | Diplomate | — | Début de combat : retire la Provocation de l'ennemi ayant le moins de PV |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Grande Doyenne | 6 | 6/14 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi ayant le moins de PV échange ses PV avec l'ennemi qui en a le plus |
| Maître des accords | 6 | 6/12 | Dwork | Diplomate | — | — |
| Chancelier | 7 | 8/18 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |

## Serviteurs, par espèce

### Alien (6)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Attaché de liaison | 1 | 1/4 | Alien | Diplomate | — | Début de combat : +1/+0 aux alliés adjacents |
| Grenadier | 1 | 3/2 | Alien | Artilleur | À distance | — |
| Intercepteur | 2 | 3/3 | Alien | Pilote | — | Cible en priorité un Pilote ennemi |
| Intrus réseau | 2 | 2/3 | Alien | Renseignement | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Chef d'atelier | 3 | 2/5 | Alien | Roboticien | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Spécialiste des boucliers | 5 | 3/7 | Alien | Ingénieur | — | Fin de renfort : +3/+0 à un allié équipé |

### Elk (17)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Cadet | 1 | 2/2 | Elk | Pilote | — | Lorsqu'un Pilote ennemi meurt : gagne définitivement +1/+1 |
| Embusqué | 1 | 2/2 | Elk | Renseignement | Adaptation | — |
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Commando | 3 | 3/4 | Elk | Renseignement | Adaptation | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | Adaptation | Fin de combat : s'il a survécu, choisissez une Adaptation supplémentaire pour lui |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | Provocation, Bouclier | Début de combat : +0/+4 aux autres alliés |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | Adaptation | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Grande Doyenne | 6 | 6/14 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi ayant le moins de PV échange ses PV avec l'ennemi qui en a le plus |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |
| Chancelier | 7 | 8/18 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |

### Dwork (14)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | Cri de guerre : reçoit un Dossier consulaire (équipement -1/+2) |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible, ou des dégâts à un de ses alliés voisins |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Scout | 2 | 2/3 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | — | Fin de renfort : donne définitivement +2 PV aux Pilotes alliés |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | — | Début de renfort : ajoute à votre main un équipement de niveau 5 non disponible durant cette mission |
| Maître des accords | 6 | 6/12 | Dwork | Diplomate | — | — |

### Droïde (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| GAD5 | 1 | 2/3 | Droïde | Roboticien | — | Fin de renfort : +0/+1 à lui-même |
| AUW0 | 2 | 2/4 | Droïde | Explorateur | À distance, Poison | — |
| KRL | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| RD44 | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 aux autres alliés |
| Z3RK | 2 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| W1X05 | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| AL-11 | 4 | 4/7 | Droïde | Diplomate | — | Râle d'agonie : reproduit les Râles d'agonie déjà utilisés durant ce combat |
| LR-04 | 4 | 4/6 | Droïde | Pilote | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier | — |
| XN-FF45 | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| C0-4193 | 5 | 6/8 | Droïde | Pilote | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| DE-D0 | 5 | 0/8 | Droïde | Médecin | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| F5-5F | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | — | Fin de renfort : chaque allié gagne définitivement +2/+2 par type différent dans votre équipe |
| FF548 | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Sorvane (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | — | Lorsqu'il survit à son attaque : +2/+0 à lui-même |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | — | Fin de combat : s'équipe d'un équipement de niveau 3 non disponible durant cette partie |
| Sentinelle | 3 | 4/3 | Sorvane | Sécurité | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | Fureur | — |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier | — |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | — | Début de combat : invoque un drone 1/1 à sa droite |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | À distance | Cible : l'ennemi avec le moins de points de vie |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | — | Début de combat : +2/+2 par type différent dans votre équipe (max 3) ; Début de combat : absorbe l'ennemi ayant le moins de PV : conserve son ATQ et ses PV (équipements compris), mais ni ses équipements ni ses pouvoirs |

### Ryskan (16)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | — | Râle d'agonie : +2/+2 à un allié aléatoire |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | — | Début de combat : +2/+0 par type différent chez les ennemis |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | — | Début de combat : +2/+1 aux alliés adjacents |
| Fusilier | 3 | 5/4 | Ryskan | Sécurité | À distance | — |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Fin de renfort : donne définitivement +3 ATQ aux Pilotes alliés |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier | Début de combat : +2/+0 à un allié équipé |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : chaque Pilote allié gagne +0/+4 pour chaque Pilote ennemi |
| Brise-siège | 7 | 10/17 | Ryskan | Sécurité | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier | Début de combat : +2/+2 aux autres alliés |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |

### Nythe (16)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | — | Début de combat : +3/+0 par type différent dans votre équipe |
| Sergent | 3 | 3/6 | Nythe | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| Spécialiste en brouillage | 3 | 2/5 | Nythe | Pilote | — | Lorsqu'un ennemi attaque : lui retire X ATQ, X étant son rang |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Assembleur | 5 | 4/9 | Nythe | Diplomate | — | Début de combat : retire la Provocation de l'ennemi ayant le moins de PV |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit un équipement (niveau actuel) ; Râle d'agonie : reçoit un équipement (niveau actuel) |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier | Début de combat : +1/+1 aux autres alliés |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : inverse la vie et l'attaque de l'ennemi ayant le plus de points de vie |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | Début de renfort : le modèle PR gagne +2/+2 |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier | Son Bouclier résiste à 2 coups |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Lorsqu'un Pilote allié meurt : +5/+5 aux autres alliés |

## Équipements

| Nom | Rang | Bonus | Type | Mot-clé | Effet |
|---|---|---|---|---|---|
| Cape de camouflage | 1 | +1/+1 | Sorvane | — | — |
| Circuit auxiliaire | 1 | +1/+1 | Droïde | — | — |
| Cristal de veille | 1 | +1/+1 | Elk | — | — |
| Fragment nacré | 1 | +1/+1 | Nythe | — | — |
| Griffe de chasse | 1 | +1/+1 | Sorvane | — | — |
| Lampe frontale | 1 | +1/+1 | Explorateur | — | — |
| Micro dissimulé | 1 | +1/+1 | Renseignement | — | — |
| Pince articulée | 1 | +1/+1 | Roboticien | — | — |
| Tournevis sonique | 1 | +1/+1 | Ingénieur | — | — |
| Trousse de soins | 1 | +1/+1 | Médecin | — | — |
| Câblage renforcé | 2 | +2/+2 | Ingénieur | — | — |
| Dossier chiffré | 2 | +2/+2 | Renseignement | — | — |
| Gants de pilotage | 2 | +2/+2 | Pilote | — | — |
| Gilet pare-balles | 2 | +2/+2 | Sécurité | — | — |
| Lance de meute | 2 | +2/+2 | Ryskan | — | — |
| Lettre d'accréditation | 2 | +2/+2 | Diplomate | — | — |
| Matraque électrique | 2 | +2/+2 | Sécurité | — | — |
| Pioche renforcée | 2 | +2/+2 | Dwork | — | — |
| Servo de précision | 2 | +2/+2 | Droïde | — | — |
| Carte stellaire | 3 | +3/+3 | Explorateur | — | — |
| Casque de mineur | 3 | +3/+3 | Dwork | — | — |
| Culasse améliorée | 3 | +3/+3 | Artilleur | — | — |
| Diadème d'harmonie | 3 | +3/+3 | Elk | — | — |
| Lunettes d'analyse | 3 | +3/+3 | Renseignement | — | — |
| Marteau de forge | 3 | +3/+3 | Dwork | — | — |
| Scanner médical | 3 | +3/+3 | Médecin | — | — |
| Sceau consulaire | 3 | +3/+3 | Diplomate | — | — |
| Seringue de stimulants | 3 | +3/+3 | Médecin | — | — |
| Stabilisateur de vol | 3 | +3/+3 | Pilote | — | — |
| Voile de sphère | 3 | +3/+3 | Nythe | — | — |
| Bouclier antiémeute | 4 | +4/+4 | Sécurité | — | — |
| Générateur portatif | 4 | +4/+4 | Ingénieur | — | — |
| Lame de ramure | 4 | +4/+4 | Elk | — | — |
| Lame silencieuse | 4 | +4/+4 | Sorvane | — | — |
| Manette de précision | 4 | +4/+4 | Pilote | — | — |
| Module de contrôle | 4 | +4/+4 | Roboticien | — | — |
| Plastron doré | 4 | +4/+4 | Ryskan | — | — |
| Propulseur d'appoint | 4 | +4/+4 | Pilote | — | — |
| Sac d'expédition | 4 | +4/+4 | Explorateur | — | — |
| Viseur thermique | 4 | +4/+4 | Artilleur | — | — |
| Atelier mobile | 5 | +5/+5 | Roboticien | — | — |
| Balise de relevé | 5 | +5/+5 | Explorateur | — | — |
| Caisson de réanimation | 5 | +5/+5 | Médecin | — | — |
| Cœur de nacre | 5 | +5/+5 | Nythe | — | — |
| Étendard ryskan | 5 | +5/+5 | Ryskan | — | — |
| Foreuse portative | 5 | +5/+5 | Dwork | — | — |
| Manteau argenté | 5 | +5/+5 | Sorvane | — | — |
| Noyau surcadencé | 5 | +5/+5 | Droïde | — | — |
| Obus renforcés | 5 | +5/+5 | Artilleur | — | — |
| Traité scellé | 5 | +5/+5 | Diplomate | — | — |
| Unité de maintenance | 5 | +5/+5 | Roboticien | — | — |
| Armure de garde | 6 | +6/+6 | Sécurité | — | — |
| Canon lourd | 6 | +6/+6 | Artilleur | — | — |
| Cape d'ambassadeur | 6 | +6/+6 | Diplomate | — | — |
| Couronne des anciens | 6 | +6/+6 | Elk | — | — |
| Cuirasse d'ambre | 6 | +6/+6 | Ryskan | — | — |
| Matrice de calcul | 6 | +6/+6 | Droïde | — | — |
| Plan d'ingénierie | 6 | +6/+6 | Ingénieur | — | — |
| Réseau d'informateurs | 6 | +6/+6 | Renseignement | — | — |
| Sphère prismatique | 6 | +6/+6 | Nythe | — | — |

## Lieutenants

| Nom | Types | PV | Mot-clé | Pouvoir |
|---|---|---|---|---|
| Capitaine Vex | Elk / Pilote | 30 | Provocation | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| ZC-D9 | Droïde / Roboticien | 26 | Bouclier | Début de renfort : +1/+0 à un allié aléatoire |
| Flam'Gruk | Dwork / Explorateur | 28 | — | Début de renfort : lance un datacube : -3, -1, 1, 2, 2, 3 Datacrons |
| TE-5T | Droïde / Ingénieur | 100 | — | Début de partie : Génère un ou des serviteurs |
| Brokk'Ric | Dwork / Ingénieur | 34 | — | Fin de renfort : équipe un allié aléatoire d'un Kit de renfort du rang actuel |
| Reyes | Ryskan / Roboticien | 32 | — | Fin de renfort : applique un patch cybernétique au serviteur le plus à droite : +X/+X, X tiré entre 1 et 6 (1 est six fois plus probable que 6) |
| Docteur Iris | Elk / Médecin | 28 | Bouclier | Début de combat : retire X ATQ et X PV à un ennemi aléatoire, X étant le niveau de renfort actuel |
| Halana la Présciente | Elk / Renseignement | 28 | — | Début de la mission : découvre un serviteur de rang 7 ; il arrive en jeu quand 60 Datacrons ont été utilisés |
| Ysha la Thanéenne | Sorvane / Médecin | 30 | — | Actif (une fois par renfort) : donne Renaissance à un serviteur jusqu'au prochain renfort |
| Sulseye | Ryskan / Diplomate | 21 | — | Actif : pour 2 Datacrons, crée la dernière copie d'un serviteur dont vous avez deux exemplaires pour les fusionner ; ce pouvoir coûte 2 Datacrons de plus à chaque utilisation |
| Waven la Précieuse | Sorvane / Diplomate | 30 | — | Actif (une fois par renfort) : déclenche le cri de guerre de l'allié ciblé |
| Amber l'Acrobate | Sorvane / Explorateur | 30 | — | — |

## Donjons

| Nom | Type | Boss | PV | Pouvoir du Boss |
|---|---|---|---|---|
| Le Nid de la Reine | Médecin | La Reine-Mère | 250 | Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu'à leur maximum). |
| Station Oméga | Droïde | Intelligence Oméga | 200 | Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies. |
| La Cité des Profondeurs | Renseignement | L'Oracle Souterrain | 220 | Écho : chaque fois qu'un de ses serviteurs attaque, il gagne +1 ATQ jusqu'à la fin du combat. |
| La Forge de Brasier-Roc | Artilleur | Maître-Forgeron Grumm | 220 | Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV. |
