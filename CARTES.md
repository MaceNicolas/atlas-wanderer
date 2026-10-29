# Cartes du prototype

Export automatique de `prototype/donnees.js` (script `outils/exporter-cartes.js`). Toutes les valeurs sont provisoires.

- Serviteurs : 100 — équipements : 42 — lieutenants : 12 — donjons : 4.
- Niveau de renfort maximum : 6 (rang maximum proposé). Les serviteurs de rang 7 ne s'obtiennent que par fusion.
- Plateau : 7 serviteurs. Main : 7 cartes.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier divin, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre un bonus permanent +N/+N (N = niveau de renfort) et le pouvoir d'un autre survivant (un survivant : son pouvoir ; deux : leurs deux pouvoirs ; plus : deux au hasard). Conservé jusqu'à la fin de la mission.
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
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier divin | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Fin de renfort : donne définitivement +3 ATQ aux Pilotes alliés |
| Instructeur de vol LR-04 | 4 | 4/6 | Droïde | Pilote | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| Commandant C0-4193 | 5 | 6/8 | Droïde | Pilote | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : chaque Pilote allié gagne +0/+4 pour chaque Pilote ennemi |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Lorsqu'un Pilote allié meurt : +5/+5 aux autres alliés |

### Ingénieur (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Servomécanique Z3-KR | 1 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| Technicien de bord RD-44 | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 à lui-même |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+0 à un allié équipé |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier divin | Début de combat : +1/+1 aux autres alliés |
| Spécialiste des boucliers | 5 | 3/7 | Alien | Ingénieur | — | Fin de renfort : +3/+0 à un allié équipé |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | — | Début de renfort : ajoute à votre main un équipement de niveau 5 non disponible durant cette mission |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+2 aux autres alliés |

### Médecin (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | — | Râle d'agonie : +2/+2 à un allié aléatoire |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier divin : le régénère (une fois par combat) |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier divin | — |
| Infirmier DE-D0 | 5 | 0/8 | Droïde | Médecin | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |

### Sécurité (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 2/4 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Garde de bord | 2 | 2/5 | Nythe | Sécurité | Provocation | — |
| Fusilier | 3 | 3/5 | Ryskan | Sécurité | Provocation | — |
| Sentinelle | 3 | 3/7 | Sorvane | Sécurité | Provocation | — |
| Sergent | 3 | 3/6 | Dwork | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| Chef de sécurité P0-C5 | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier divin | — |
| Droïde de combat XN-FF45 | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | Provocation, Bouclier divin | Début de combat : +0/+4 aux autres alliés |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier divin | Son Bouclier divin résiste à 2 coups |
| Brise-siège | 7 | 10/17 | Ryskan | Sécurité | Provocation | Détruit le Bouclier divin de la cible avant de l'attaquer |

### Explorateur (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Explorateur AUT-50F | 2 | 2/4 | Droïde | Explorateur | À distance, Poison | — |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | — | Début de combat : +2/+0 par type différent chez les ennemis |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | — | Début de combat : +3/+0 par type différent dans votre équipe |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | Adaptation | Fin de combat : s'il a survécu, choisissez une Adaptation supplémentaire pour lui |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | — | Fin de combat : s'équipe d'un équipement de niveau 3 non disponible durant cette partie |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit un équipement (niveau actuel) ; Râle d'agonie : reçoit un équipement (niveau actuel) |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | Adaptation | Fin de combat : votre prochain renfort d'équipement vous proposera 7 cartes |
| Technoarchiviste M1-FE | 6 | 6/11 | Droïde | Explorateur | — | Fin de renfort : chaque allié gagne définitivement +2/+2 par type différent dans votre équipe |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | — | Début de combat : +2/+2 par type différent dans votre équipe (max 3) ; Début de combat : absorbe l'ennemi ayant le moins de PV : conserve son ATQ et ses PV (équipements compris), mais ni ses équipements ni ses pouvoirs |

### Artilleur (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Grenadier | 1 | 3/2 | Alien | Artilleur | À distance | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier divin de la cible avant de l'attaquer |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | À distance | — |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Faucheur F5-5F | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | À distance | Cible : l'ennemi avec le moins de points de vie |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |

### Renseignement (11)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cipher SI-0F05 | 1 | 1/3 | Droïde | Renseignement | — | — |
| Embusqué | 1 | 2/2 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Intrus réseau | 2 | 2/3 | Alien | Renseignement | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Scout | 2 | 2/3 | Elk | Renseignement | Adaptation | — |
| Saboteur WX105 | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier divin d'un ennemi, si possible |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : inverse la vie et l'attaque de l'ennemi ayant le plus de points de vie |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |
| Murmure | 7 | 9/16 | Elk | Renseignement | Adaptation | — |

### Roboticien (10)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Ferrailleur GA-D5 | 2 | 2/3 | Droïde | Roboticien | — | — |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Chef d'atelier | 3 | 2/5 | Alien | Roboticien | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | — | Début de combat : invoque un drone 1/1 à sa droite |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | Début de renfort : le modèle PR gagne +2/+2 |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| Cerveau de la ruche | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Diplomate (12)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Attaché de liaison | 1 | 1/4 | Alien | Diplomate | — | Début de combat : +1/+0 aux alliés adjacents |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | Cri de guerre : reçoit un Dossier consulaire (équipement -1/+2) |
| Officier de liaison KRL | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | — | Début de combat : +2/+1 aux alliés adjacents |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Droïde protocolaire AL-11 | 4 | 4/7 | Droïde | Diplomate | — | Râle d'agonie : reproduit les Râles d'agonie déjà utilisés durant ce combat |
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
| Agent de sécurité | 1 | 2/4 | Elk | Sécurité | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Cadet | 1 | 2/2 | Elk | Pilote | — | Lorsqu'un Pilote ennemi meurt : gagne définitivement +1/+1 |
| Technosophe | 1 | 1/3 | Elk | Roboticien | Adaptation | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | À distance, Adaptation | — |
| Scout | 2 | 2/3 | Elk | Renseignement | Adaptation | — |
| Chirurgien | 3 | 2/6 | Elk | Médecin | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Émissaire | 3 | 2/6 | Elk | Diplomate | Adaptation | — |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | Adaptation | — |
| Naturaliste | 3 | 2/5 | Elk | Explorateur | Adaptation | Fin de combat : s'il a survécu, choisissez une Adaptation supplémentaire pour lui |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | Adaptation | Fin de combat : vos drones sont invoqués avec +1/+1 jusqu'à la fin de la mission |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | Provocation, Bouclier divin | Début de combat : +0/+4 aux autres alliés |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | Adaptation | Fin de combat : votre prochain renfort d'équipement vous proposera 7 cartes |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | Adaptation | — |
| Grande Doyenne | 6 | 6/14 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi ayant le moins de PV échange ses PV avec l'ennemi qui en a le plus |
| Maître des vents | 6 | 7/10 | Elk | Pilote | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |
| Chancelier | 7 | 8/18 | Elk | Diplomate | Adaptation | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |
| Murmure | 7 | 9/16 | Elk | Renseignement | Adaptation | — |

### Dwork (14)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Embusqué | 1 | 2/2 | Dwork | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Prospecteur | 1 | 2/3 | Dwork | Explorateur | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Assistant consulaire | 2 | 2/4 | Dwork | Diplomate | — | Cri de guerre : reçoit un Dossier consulaire (équipement -1/+2) |
| Infirmier | 2 | 2/4 | Dwork | Médecin | — | Lorsqu'un allié perd son Bouclier divin : le régénère (une fois par combat) |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | — | Fin de renfort : +1/+1 à un allié aléatoire |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | À distance | Détruit le Bouclier divin de la cible avant de l'attaquer |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | — | Fin de renfort : donne définitivement +2 PV aux Pilotes alliés |
| Sergent | 3 | 3/6 | Dwork | Sécurité | Provocation | Fin de renfort : +0/+3 à lui-même |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Biologiste | 5 | 4/9 | Dwork | Médecin | — | — |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | Provocation, Renaissance | — |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | — | Début de renfort : ajoute à votre main un équipement de niveau 5 non disponible durant cette mission |
| Maître des accords | 6 | 6/12 | Dwork | Diplomate | — | — |

### Droïde (16)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Cipher SI-0F05 | 1 | 1/3 | Droïde | Renseignement | — | — |
| Servomécanique Z3-KR | 1 | 2/4 | Droïde | Ingénieur | — | Fin de renfort : +0/+2 à un allié aléatoire |
| Explorateur AUT-50F | 2 | 2/4 | Droïde | Explorateur | À distance, Poison | — |
| Ferrailleur GA-D5 | 2 | 2/3 | Droïde | Roboticien | — | — |
| Officier de liaison KRL | 2 | 1/5 | Droïde | Diplomate | — | Début de combat : +1/+1 aux alliés adjacents |
| Technicien de bord RD-44 | 2 | 2/5 | Droïde | Ingénieur | — | Fin de renfort : +0/+1 à lui-même |
| Saboteur WX105 | 3 | 3/4 | Droïde | Renseignement | — | Début de combat : retire le Bouclier divin d'un ennemi, si possible |
| Chef de sécurité P0-C5 | 4 | 4/8 | Droïde | Sécurité | Provocation, Bouclier divin | — |
| Droïde de combat XN-FF45 | 4 | 4/7 | Droïde | Sécurité | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Droïde protocolaire AL-11 | 4 | 4/7 | Droïde | Diplomate | — | Râle d'agonie : reproduit les Râles d'agonie déjà utilisés durant ce combat |
| Instructeur de vol LR-04 | 4 | 4/6 | Droïde | Pilote | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| Commandant C0-4193 | 5 | 6/8 | Droïde | Pilote | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| Faucheur F5-5F | 5 | 6/7 | Droïde | Artilleur | À distance | — |
| Infirmier DE-D0 | 5 | 0/8 | Droïde | Médecin | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| Technoarchiviste M1-FE | 6 | 6/11 | Droïde | Explorateur | — | Fin de renfort : chaque allié gagne définitivement +2/+2 par type différent dans votre équipe |
| Cerveau de la ruche | 7 | 7/12 | Droïde | Roboticien | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Sorvane (15)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | À distance | — |
| Secouriste de combat | 1 | 1/3 | Sorvane | Médecin | — | Assaut : soigne 2 PV à l'allié le plus à gauche |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | — | Lorsqu'il survit à son attaque : +2/+0 à lui-même |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | — | Fin de combat : s'équipe d'un équipement de niveau 3 non disponible durant cette partie |
| Sentinelle | 3 | 3/7 | Sorvane | Sécurité | Provocation | — |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | À distance | — |
| Ambassadeur | 4 | 3/7 | Sorvane | Diplomate | — | Début de combat : +2/+2 aux alliés adjacents |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | Bouclier divin | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | — | Début de combat : +2/+2 à un allié équipé |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | Bouclier divin | — |
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
| Fusilier | 3 | 3/5 | Ryskan | Sécurité | Provocation | — |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | — | Fin de renfort : donne définitivement +3 ATQ aux Pilotes alliés |
| Contrebandier | 4 | 4/6 | Ryskan | Explorateur | À distance | Lorsqu'un ennemi meurt : récupère un de ses équipements pour le combat en cours |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+0 à un allié équipé |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Médecin-chef | 4 | 4/7 | Ryskan | Médecin | — | Râle d'agonie : soigne 5 PV à tous les alliés |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | — | Début de combat : invoque un drone 6/6 à sa droite |
| Tisseur de routes | 6 | 7/11 | Ryskan | Pilote | — | Début de combat : chaque Pilote allié gagne +0/+4 pour chaque Pilote ennemi |
| Brise-siège | 7 | 10/17 | Ryskan | Sécurité | Provocation | Détruit le Bouclier divin de la cible avant de l'attaquer |
| Le Grand Mécanicien | 7 | 8/16 | Ryskan | Ingénieur | Bouclier divin | Début de combat : +2/+2 aux autres alliés |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | — | Début de combat : retire la Provocation de tous les ennemis |

### Nythe (16)

| Nom | Rang | ATQ/PV | Espèce | Archétype | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|
| Apprenti mécanicien | 1 | 1/3 | Nythe | Ingénieur | — | Lorsqu'il survit à une attaque : gagne définitivement +1 ATQ |
| Garde de bord | 2 | 2/5 | Nythe | Sécurité | Provocation | — |
| Opérateur de drone | 2 | 1/3 | Nythe | Roboticien | — | Râle d'agonie : invoque un drone 1/1 à sa place |
| Cartographe | 3 | 3/5 | Nythe | Explorateur | — | Début de combat : +3/+0 par type différent dans votre équipe |
| Spécialiste en brouillage | 3 | 2/5 | Nythe | Pilote | — | Lorsqu'un ennemi attaque : lui retire X ATQ, X étant son rang |
| Bombardier | 4 | 5/7 | Nythe | Artilleur | — | Début de combat : pose 2 bombes infligeant 5 dégâts sur des ennemis aléatoires ; la bombe explose la première fois que le serviteur piégé attaque |
| Généticien | 4 | 4/6 | Nythe | Médecin | Poison | Râle d'agonie : +1/+1 aux autres alliés |
| Assembleur | 5 | 4/9 | Nythe | Diplomate | — | Début de combat : retire la Provocation de l'ennemi ayant le moins de PV |
| Chasseur de reliques | 5 | 4/7 | Nythe | Explorateur | À distance | Cri de guerre : reçoit un équipement (niveau actuel) ; Râle d'agonie : reçoit un équipement (niveau actuel) |
| Ingénieur en chef | 5 | 5/9 | Nythe | Ingénieur | Bouclier divin | Début de combat : +1/+1 aux autres alliés |
| Spectre | 5 | 6/6 | Nythe | Renseignement | — | Début de combat : inverse la vie et l'attaque de l'ennemi ayant le plus de points de vie |
| Cybermancien | 6 | 7/13 | Nythe | Roboticien | — | Début de renfort : le modèle PR gagne +2/+2 |
| Septième sentinelle | 6 | 7/12 | Nythe | Sécurité | Bouclier divin | Son Bouclier divin résiste à 2 coups |
| Canon-monde | 7 | 12/10 | Nythe | Artilleur | À distance | Début de combat : 7 dégâts à un ennemi aléatoire |
| Gardien du génome | 7 | 8/16 | Nythe | Médecin | — | Début de combat : +2/+4 aux autres alliés |
| Seigneur de la flotte | 7 | 9/12 | Nythe | Pilote | — | Lorsqu'un Pilote allié meurt : +5/+5 aux autres alliés |

## Équipements

| Nom | Rang | Bonus | Type | Mot-clé | Effet |
|---|---|---|---|---|---|
| Adrénaline | 1 | +0/+1 | Médecin | — | Début de combat : +1/+1 au porteur |
| Brevet de diplomate | 1 | +0/+1 | Diplomate | — | — |
| Brevet de renseignement | 1 | +1/+0 | Renseignement | — | — |
| Dossier consulaire | 1 | -1/+2 | Diplomate | — | — |
| Kit de renfort T1 | 1 | +1/+1 | Ingénieur | — | — |
| Lame ébréchée | 1 | +2/+0 | Sécurité | — | — |
| Module d'attaque | 1 | +1/+1 | Tous | — | — |
| Renfort en acier | 1 | +0/+3 | Sécurité | — | — |
| Balise de combat | 2 | +0/+2 | Sécurité | Provocation | — |
| Blindage de drone | 2 | +0/+1 | Roboticien | — | Drones invoqués : +1 PV |
| Cartouches perforantes | 2 | +2/+1 | Artilleur | — | — |
| Châssis de drone | 2 | +1/+2 | Roboticien | — | — |
| Kit de renfort T2 | 2 | +2/+2 | Ingénieur | — | — |
| Servomoteurs de drone | 2 | +0/+1 | Roboticien | — | Drones invoqués : +1 ATQ |
| Brouilleur électronique | 3 | +1/+1 | Pilote | — | Lorsqu'un ennemi attaque : lui retire 2 ATQ |
| Canon longue portée | 3 | +2/+0 | Artilleur | À distance | — |
| Charge de rupture | 3 | +1/+0 | Artilleur | — | Râle d'agonie : 3 dégâts à un ennemi aléatoire |
| Chargeur de drones | 3 | +0/+1 | Roboticien | — | Drones invoqués : +1/+1 |
| Dose de neurotoxine | 3 | +1/+0 | Médecin | Poison | — |
| Implant neural | 3 | +2/+2 | Ingénieur | — | — |
| Injecteur de combat | 3 | +1/+1 | Médecin | — | Début de combat : +3/+2 au porteur |
| Kit de renfort T3 | 3 | +3/+3 | Ingénieur | — | — |
| Nano-ruche | 3 | +0/+1 | Médecin | — | Fin de renfort : +1/+1 au porteur |
| Sonde d'analyse | 3 | +1/+2 | Explorateur | À distance | — |
| Armure de siège | 4 | +2/+5 | Sécurité | Provocation | — |
| Balise de commandement | 4 | +0/+2 | Pilote | — | Début de combat : +1/+1 aux autres alliés |
| Blindage | 4 | +1/+3 | Sécurité | Bouclier divin | — |
| Kit de renfort T4 | 4 | +4/+4 | Ingénieur | — | — |
| Lame vibrante | 4 | +5/+0 | Sécurité | — | — |
| Module de saut | 4 | +4/+2 | Pilote | — | — |
| Nano-régénérateur | 4 | +1/+2 | Médecin | Renaissance | — |
| Joker Artilleur | 5 | +0/+0 | Artilleur | — | — |
| Joker Diplomate | 5 | +0/+0 | Diplomate | — | — |
| Joker Explorateur | 5 | +0/+0 | Explorateur | — | — |
| Joker Ingénieur | 5 | +0/+0 | Ingénieur | — | — |
| Joker Médecin | 5 | +0/+0 | Médecin | — | — |
| Joker Pilote | 5 | +0/+0 | Pilote | — | — |
| Joker Renseignement | 5 | +0/+0 | Renseignement | — | — |
| Joker Roboticien | 5 | +0/+0 | Roboticien | — | — |
| Joker Sécurité | 5 | +0/+0 | Sécurité | — | — |
| Kit de renfort T5 | 5 | +5/+5 | Ingénieur | — | — |
| Kit de renfort T6 | 6 | +6/+6 | Ingénieur | — | — |

## Lieutenants

| Nom | Types | PV | Mot-clé | Pouvoir |
|---|---|---|---|---|
| Capitaine Vex | Elk / Pilote | 30 | Provocation | Début de combat : +2/+0 à l'allié le plus à gauche |
| ZC-D9 | Droïde / Roboticien | 26 | Bouclier divin | Début de renfort : +1/+0 à un allié aléatoire |
| Flam'Gruk | Dwork / Explorateur | 28 | — | Début de renfort : lance un datacube : -3, -1, 1, 2, 2, 3 Datacrons |
| TE-5T | Droïde / Ingénieur | 100 | — | Début de partie : Génère un ou des serviteurs |
| Brokk'Ric | Dwork / Ingénieur | 34 | — | Fin de renfort : équipe un allié aléatoire d'un Kit de renfort du rang actuel |
| Reyes | Ryskan / Roboticien | 32 | — | Fin de renfort : applique un patch cybernétique au serviteur le plus à droite : +X/+X, X tiré entre 1 et 6 (1 est six fois plus probable que 6) |
| Docteur Iris | Elk / Médecin | 28 | Bouclier divin | Début de combat : retire X ATQ et X PV à un ennemi aléatoire, X étant le niveau de renfort actuel |
| Halana la Présciente | Elk / Renseignement | 28 | — | Début de la mission : découvre un serviteur de rang 7 ; il arrive en jeu quand 60 Datacrons ont été utilisés |
| Ysha la Thanéenne | Sorvane / Xénobiologiste | 30 | — | Actif (une fois par renfort) : donne Renaissance à un serviteur jusqu'au prochain renfort |
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
