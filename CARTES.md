# Cartes du prototype

Export automatique de `prototype/donnees.js` (script `outils/exporter-cartes.js`). Toutes les valeurs sont provisoires.

- Serviteurs : 97 — équipements : 30 — lieutenants : 2 — donjons : 4.
- Niveau de renfort maximum : 6 (rang maximum proposé). Les serviteurs de rang 7 ne s'obtiennent que par fusion.
- Plateau : 7 serviteurs. Main : 7 cartes.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier divin, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre un bonus permanent +N/+N (N = niveau de renfort) et le pouvoir d'un autre survivant (un survivant : son pouvoir ; deux : leurs deux pouvoirs ; plus : deux au hasard). Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par archétype

### Pilote (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cadet | 1 | 1/3 | Elk | Pilote | Adaptation | — |
| Pilote de chasse | 2 | 3/3 | Alien | Pilote | — | Début de combat : +2/+0 à l'allié le plus à gauche |
| Pilote orbital | 2 | 2/4 | Sorvane | Pilote | — | — |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | — | Début de combat : +2/+1 à l'allié le plus à gauche |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier divin | Début de combat : +2/+0 à l'allié le plus à gauche |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Début de combat : +1/+0 aux autres alliés |
| Commandant d'escadrille | 5 | 6/8 | Droïde | Pilote | — | Début de combat : +4/+2 à l'allié le plus à gauche |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Bouclier divin, Adaptation | — |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : +2/+1 aux autres alliés |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Début de combat : +6/+3 à l'allié le plus à gauche |

### Ingénieur (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Droïde de maintenance | 1 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| Technicien de bord | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 à lui-même |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+0 à un allié équipé |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier divin | Début de combat : +1/+1 aux autres alliés |
| Spécialiste des boucliers | 5 | 3/7 | Alien | Ingénieur | — | Fin de renfort : +3/+0 à un allié équipé |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | Bouclier divin | Début de combat : +3/+3 à un allié équipé |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+2 aux autres alliés |

### Médecin (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | — | Râle d'agonie : +2/+2 à un allié aléatoire |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier divin : le régénère (une fois par combat) |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Droïde infirmier | 3 | 2/5 | Droïde | Médecin | — | Début de combat : +0/+2 aux autres alliés |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier divin | — |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |

### Sécurité (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 2/4 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | Provocation | — |
| Fusilier | 3 | 3/5 | Ryskan | Sécurité | Provocation | — |
| Sentinelle | 3 | 3/7 | Sorvane | Sécurité | Provocation | — |
| Sergent | 3 | 3/6 | Dwork | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| Chef de la sécurité | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier divin | — |
| Droïde de combat | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Commandant de la garde | 5 | 6/11 | Alien | Sécurité | Provocation, Bouclier divin | Début de combat : +0/+2 aux autres alliés |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier divin | Son Bouclier divin résiste à 2 coups |
| Brise-siège | 7 | 10/17 | Dwork | Sécurité | Provocation | Détruit le Bouclier divin de la cible avant de l'attaquer |

### Explorateur (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | À distance | Début de combat : +2/+1 par type différent dans votre équipe (max 3) |
| Explorateur autonome | 2 | 2/4 | Droïde | Explorateur | À distance | — |
| Sondeur planétaire | 2 | 2/4 | Ryskan | Explorateur | — | Début de combat : +1/+0 par type différent dans votre équipe (max 3) |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | À distance | Début de combat : +1/+0 par type différent dans votre équipe (max 3) |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | À distance, Adaptation | — |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | À distance | — |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit en main un équipement du niveau de renfort actuel ; Râle d'agonie : reçoit en main un équipement du niveau de renfort actuel |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | À distance, Adaptation | — |
| Technoarchiviste | 6 | 6/11 | Droïde | Explorateur | À distance | Début de combat : +2/+2 par type différent dans votre équipe (max 3) |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | À distance | Début de combat : +2/+2 par type différent dans votre équipe (max 3) |

### Artilleur (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Grenadier | 1 | 3/2 | Alien | Artilleur | À distance | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier divin de la cible avant de l'attaquer |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | À distance | — |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Faucheur | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | À distance | Cible : l'ennemi avec le moins de points de vie |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |

### Renseignement (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cipher | 1 | 1/3 | Droïde | Renseignement | — | — |
| Embusqué | 1 | 2/2 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Intrus réseau | 2 | 2/3 | Alien | Renseignement | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Scout | 2 | 2/3 | Elk | Renseignement | Adaptation | — |
| Saboteur | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier divin d'un ennemi, si possible |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : retire 4 ATQ à un ennemi aléatoire |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : retire 5 ATQ à un ennemi aléatoire |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |
| Murmure | 7 | 9/16 | Elk | Renseignement | Adaptation | — |

### Roboticien (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Récupérateur de droïde | 2 | 2/3 | Droïde | Roboticien | — | — |
| Chef d'atelier | 3 | 2/5 | Alien | Roboticien | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | — | Début de combat : invoque un drone 1/1 à sa droite |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | — |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| Cerveau de la ruche | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Diplomate (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Attaché de liaison | 1 | 1/4 | Alien | Diplomate | — | Début de combat : +1/+0 aux alliés adjacents |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | — |
| Officier de liaison | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| Négociateur | 3 | 2/6 | Ryskan | Diplomate | — | Début de combat : +2/+1 aux alliés adjacents |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Droïde de protocole | 4 | 4/7 | Droïde | Diplomate | — | — |
| Assembleur | 5 | 4/9 | Nythe | Diplomate | — | Début de combat : gagne +X/+X, X étant le nombre d'équipements de l'équipe |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | — | — |
| Grande Doyenne | 6 | 6/14 | Elk | Diplomate | Adaptation | — |
| Chancelier | 7 | 8/18 | Elk | Diplomate | Adaptation | — |

## Serviteurs, par espèce

### Alien (7)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Attaché de liaison | 1 | 1/4 | Alien | Diplomate | — | Début de combat : +1/+0 aux alliés adjacents |
| Grenadier | 1 | 3/2 | Alien | Artilleur | À distance | — |
| Intrus réseau | 2 | 2/3 | Alien | Renseignement | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Pilote de chasse | 2 | 3/3 | Alien | Pilote | — | Début de combat : +2/+0 à l'allié le plus à gauche |
| Chef d'atelier | 3 | 2/5 | Alien | Roboticien | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Commandant de la garde | 5 | 6/11 | Alien | Sécurité | Provocation, Bouclier divin | Début de combat : +0/+2 aux autres alliés |
| Spécialiste des boucliers | 5 | 3/7 | Alien | Ingénieur | — | Fin de renfort : +3/+0 à un allié équipé |

### Elk (16)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 2/4 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Cadet | 1 | 1/3 | Elk | Pilote | Adaptation | — |
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Scout | 2 | 2/3 | Elk | Renseignement | Adaptation | — |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | À distance, Adaptation | — |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | À distance, Adaptation | — |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Grande Doyenne | 6 | 6/14 | Elk | Diplomate | Adaptation | — |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Bouclier divin, Adaptation | — |
| Chancelier | 7 | 8/18 | Elk | Diplomate | Adaptation | — |
| Murmure | 7 | 9/16 | Elk | Renseignement | Adaptation | — |

### Dwork (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Embusqué | 1 | 2/2 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | À distance | Début de combat : +2/+1 par type différent dans votre équipe (max 3) |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | — |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | Provocation | — |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier divin : le régénère (une fois par combat) |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier divin de la cible avant de l'attaquer |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | — | Début de combat : +2/+1 à l'allié le plus à gauche |
| Sergent | 3 | 3/6 | Dwork | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | Bouclier divin | Début de combat : +3/+3 à un allié équipé |
| Brise-siège | 7 | 10/17 | Dwork | Sécurité | Provocation | Détruit le Bouclier divin de la cible avant de l'attaquer |

### Droïde (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cipher | 1 | 1/3 | Droïde | Renseignement | — | — |
| Droïde de maintenance | 1 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| Explorateur autonome | 2 | 2/4 | Droïde | Explorateur | À distance | — |
| Officier de liaison | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| Récupérateur de droïde | 2 | 2/3 | Droïde | Roboticien | — | — |
| Technicien de bord | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 à lui-même |
| Droïde infirmier | 3 | 2/5 | Droïde | Médecin | — | Début de combat : +0/+2 aux autres alliés |
| Saboteur | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier divin d'un ennemi, si possible |
| Chef de la sécurité | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier divin | — |
| Droïde de combat | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Droïde de protocole | 4 | 4/7 | Droïde | Diplomate | — | — |
| Commandant d'escadrille | 5 | 6/8 | Droïde | Pilote | — | Début de combat : +4/+2 à l'allié le plus à gauche |
| Faucheur | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| Technoarchiviste | 6 | 6/11 | Droïde | Explorateur | À distance | Début de combat : +2/+2 par type différent dans votre équipe (max 3) |
| Cerveau de la ruche | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Sorvane (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Pilote orbital | 2 | 2/4 | Sorvane | Pilote | — | — |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | À distance | — |
| Sentinelle | 3 | 3/7 | Sorvane | Sécurité | Provocation | — |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | À distance | — |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier divin | Début de combat : +2/+0 à l'allié le plus à gauche |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier divin | — |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | — | Début de combat : invoque un drone 1/1 à sa droite |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | À distance | Cible : l'ennemi avec le moins de points de vie |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | À distance | Début de combat : +2/+2 par type différent dans votre équipe (max 3) |

### Ryskan (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | — | Râle d'agonie : +2/+2 à un allié aléatoire |
| Sondeur planétaire | 2 | 2/4 | Ryskan | Explorateur | — | Début de combat : +1/+0 par type différent dans votre équipe (max 3) |
| Fusilier | 3 | 3/5 | Ryskan | Sécurité | Provocation | — |
| Négociateur | 3 | 2/6 | Ryskan | Diplomate | — | Début de combat : +2/+1 aux alliés adjacents |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Début de combat : +1/+0 aux autres alliés |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+0 à un allié équipé |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : retire 4 ATQ à un ennemi aléatoire |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | — | — |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : +2/+1 aux autres alliés |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+2 aux autres alliés |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |

### Nythe (14)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | À distance | Début de combat : +1/+0 par type différent dans votre équipe (max 3) |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Assembleur | 5 | 4/9 | Nythe | Diplomate | — | Début de combat : gagne +X/+X, X étant le nombre d'équipements de l'équipe |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit en main un équipement du niveau de renfort actuel ; Râle d'agonie : reçoit en main un équipement du niveau de renfort actuel |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier divin | Début de combat : +1/+1 aux autres alliés |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : retire 5 ATQ à un ennemi aléatoire |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | — |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier divin | Son Bouclier divin résiste à 2 coups |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Début de combat : +6/+3 à l'allié le plus à gauche |

## Équipements

| Nom | Rang | Bonus | Type | Mot-clé | Effet |
|---|---|---|---|---|---|
| Adrénaline | 1 | +0/+1 | Tous | — | Début de combat : +1/+1 au porteur |
| Lame vibrante | 1 | +2/+0 | Tous | — | — |
| Module d'attaque | 1 | +1/+1 | Tous | — | — |
| Plaque d'acier | 1 | +0/+2 | Tous | — | — |
| Balise de combat | 2 | +0/+2 | Sécurité | Provocation | — |
| Blindage | 2 | +1/+3 | Tous | — | — |
| Blindage de drone | 2 | +0/+1 | Roboticien | — | Drones invoqués : +1 PV |
| Bouclier à champ | 2 | +0/+1 | Ingénieur | Bouclier divin | — |
| Cartouches perforantes | 2 | +2/+1 | Artilleur | — | — |
| Châssis de drone | 2 | +1/+2 | Roboticien | — | — |
| Module de croissance | 2 | +0/+1 | Tous | — | Début de renfort : +1/+0 au porteur |
| Servomoteurs de drone | 2 | +0/+1 | Roboticien | — | Drones invoqués : +1 ATQ |
| Stimulants de choc | 2 | +0/+0 | Tous | — | Début de combat : +2/+1 au porteur |
| Brouilleur | 3 | +2/+1 | Renseignement | — | — |
| Canon longue portée | 3 | +2/+0 | Artilleur | À distance | — |
| Charge de rupture | 3 | +1/+0 | Artilleur | — | Râle d'agonie : 3 dégâts à un ennemi aléatoire |
| Chargeur de drones | 3 | +0/+1 | Roboticien | — | Drones invoqués : +1/+1 |
| Dose de neurotoxine | 3 | +1/+0 | Médecin | Poison | — |
| Implant neural | 3 | +2/+2 | Tous | — | — |
| Injecteur de combat | 3 | +1/+1 | Médecin | — | Début de combat : +3/+2 au porteur |
| Nano-ruche | 3 | +0/+1 | Médecin | — | Fin de renfort : +1/+1 au porteur |
| Réacteur surchargé | 3 | +3/+1 | Ingénieur | — | — |
| Sonde d'analyse | 3 | +1/+2 | Explorateur | À distance | — |
| Armure de siège | 4 | +2/+5 | Sécurité | Provocation | — |
| Balise de commandement | 4 | +0/+2 | Pilote | — | Début de combat : +1/+1 aux autres alliés |
| Matrice évolutive | 4 | +0/+2 | Ingénieur | — | Début de renfort : +2/+2 au porteur |
| Module de saut | 4 | +4/+2 | Pilote | — | — |
| Nano-régénérateur | 4 | +1/+2 | Médecin | Renaissance | — |
| Aura divine | 5 | +3/+3 | Tous | Bouclier divin | — |
| Cœur de réacteur | 5 | +4/+4 | Tous | — | — |

## Lieutenants

| Nom | Types | PV | Mot-clé | Pouvoir |
|---|---|---|---|---|
| Capitaine Vex | Elk / Pilote | 30 | Provocation | Début de combat : +2/+0 à l'allié le plus à gauche |
| Z-9 | Droïde / Roboticien | 26 | Bouclier divin | Début de renfort : +1/+0 à un allié aléatoire |

## Donjons

| Nom | Type | Boss | PV | Pouvoir du Boss |
|---|---|---|---|---|
| Le Nid de la Reine | Médecin | La Reine-Mère | 250 | Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu'à leur maximum). |
| Station Oméga | Droïde | Intelligence Oméga | 200 | Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies. |
| La Cité des Profondeurs | Renseignement | L'Oracle Souterrain | 220 | Écho : chaque fois qu'un de ses serviteurs attaque, il gagne +1 ATQ jusqu'à la fin du combat. |
| La Forge de Brasier-Roc | Artilleur | Maître-Forgeron Grumm | 220 | Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV. |
