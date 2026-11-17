# Cartes du prototype

Export automatique de `prototype/data.js` (script `tools/export-cards.js`). Toutes les valeurs sont provisoires.

- Serviteurs : 93 — équipements : 36 — héros : 10 — donjons : 5.
- Niveau de renfort maximum : 6 (rang maximum proposé). Les serviteurs de rang 7 ne s'obtiennent que par fusion.
- Plateau : 7 serviteurs. Main : 7 cartes.
- **Châsses** : un serviteur a de 0 à 3 châsses (bleue, verte, rouge ou chromatique, qui accepte toutes les couleurs). Un équipement a une couleur et ne se pose que dans une châsse libre de la même couleur ou chromatique.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre deux options : un bonus permanent de +N PV ou +N ATQ tiré au hasard (N = niveau de renfort), ou un pouvoir tiré au hasard parmi ceux des autres survivants. Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par affectation

### Pilote (11)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Cadet | 1 | 2/2 | Elk | Pilote | bleue | — | Lorsqu'un Pilote ennemi meurt : gagne définitivement +1/+1 |
| Pilote de cargo | 1 | 2/3 | Sorvane | Pilote | chromatique | — | — |
| Intercepteur | 2 | 3/3 | Dwork | Pilote | bleue | — | Cible en priorité un Pilote ennemi |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +2/+1 |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | bleue | — | Fin de renfort : donne définitivement +2 PV aux autres Pilotes alliés |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | bleue, bleue | Bouclier | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | bleue, bleue | — | Fin de renfort : donne définitivement +3 ATQ aux autres Pilotes alliés |
| LR-04 | 4 | 4/6 | Droïde | Pilote | bleue, rouge | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| Tisseur de routes | 4 | 7/11 | Ryskan | Pilote | chromatique, chromatique | — | Début de combat : +4 PV aux Pilotes alliés par Pilote ennemi |
| C0-4193 | 5 | 6/8 | Droïde | Pilote | bleue, verte | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| Maître des vents | 6 | 6/10 | Elk | Pilote | bleue, bleue, rouge | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |

### Ingénieur (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Rat de soute | 1 | 1/3 | Sorvane | Ingénieur | chromatique | — | Cri de guerre : découvre un équipement de niveau 1, d'un type absent de votre équipe (choix parmi 3) |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | verte | — | Fin de renfort : donne définitivement +1/+1 à un allié aléatoire |
| RD44 | 2 | 2/5 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV aux autres alliés |
| Z3RK | 2 | 2/4 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +2 PV à un allié aléatoire |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | verte | Adaptation | — |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | verte, verte | — | Les drones alliés ont +4/+4 tant qu'il est en vie |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | verte, verte | Bouclier | Début de combat : +5 PV à tous les alliés ayant un Bouclier |
| Le Grand Mécanicien | 5 | 8/10 | Ryskan | Ingénieur | verte, chromatique | Bouclier | Début de combat : +2/+2 par équipement vert porté par vos alliés |
| Spécialiste des boucliers | 5 | 3/7 | Elk | Ingénieur | verte, rouge | — | Fin de renfort : donne définitivement +3 PV à un allié équipé |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | verte, bleue, bleue | — | Début de renfort : ajoute à votre main un équipement au hasard de niveau 5, d'un type absent de votre équipe |

### Médecin (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | verte | — | Assaut : soigne 3 PV aux alliés adjacents |
| Infirmier | 1 | 2/4 | Dwork | Médecin | verte | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Secouriste de combat | 2 | 3/3 | Sorvane | Médecin | verte, rouge | — | Assaut : soigne 5 PV à l'allié le plus à gauche |
| Chirurgien | 3 | 2/6 | Elk | Médecin | verte | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| DE-D0 | 4 | 6/8 | Droïde | Médecin | verte, verte | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| Biologiste | 5 | 4/9 | Dwork | Médecin | verte, verte | — | — |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | verte, verte | Bouclier | — |
| Médecin-chef | 5 | 4/7 | Ryskan | Médecin | verte, verte | — | Assaut : soigne 5 PV à tous les alliés |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | verte, verte, bleue | Adaptation | — |
| RE-5T | 6 | 7/15 | Droïde | Médecin | verte, verte | — | Début de combat : donne Renaissance aux alliés adjacents |

### Sécurité (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | rouge | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Fusilier | 2 | 4/3 | Ryskan | Sécurité | rouge | À distance | — |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | rouge | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible |
| Sentinelle | 3 | 4/3 | Sorvane | Sécurité | rouge | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | rouge, rouge | Provocation, Bouclier | — |
| XN-FF45 | 4 | 4/7 | Droïde | Sécurité | rouge, rouge | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | rouge, rouge | Provocation, Bouclier | Début de combat : +4 PV aux autres alliés |
| Brise-siège | 6 | 10/17 | Ryskan | Sécurité | rouge, rouge, rouge | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | rouge, rouge, chromatique | Provocation, Renaissance | — |
| Gardien des six flammes | 6 | 12/10 | Sorvane | Sécurité | rouge, rouge, verte | À distance, Poison | — |

### Explorateur (11)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | bleue | À distance | — |
| Naturaliste | 2 | 2/5 | Elk | Explorateur | chromatique | Adaptation | Début de combat : +1 PV par type différent chez les ennemis |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | bleue | — | Début de combat : +2 ATQ par type différent chez les ennemis |
| Contrebandier | 3 | 4/6 | Ryskan | Explorateur | bleue, rouge | À distance | Lorsqu'un ennemi meurt : +1 ATQ à lui-même |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | bleue | — | Fin de combat : trouve un équipement non disponible durant cette partie, de n'importe quel niveau (les niveaux élevés sont de plus en plus rares) |
| Prospecteur | 3 | 2/3 | Dwork | Explorateur | bleue | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Vieux pisteur | 4 | 4/6 | Dwork | Explorateur | bleue | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| AUW0 | 5 | 6/5 | Droïde | Explorateur | bleue | À distance, Poison | — |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | bleue, bleue | Adaptation | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | bleue, verte, chromatique | — | Fin de renfort : donne définitivement +1/+1 aux alliés adjacents par type différent dans votre équipe |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | chromatique, verte, rouge | — | Début de combat : +2/+2 par type différent dans votre équipe |

### Artilleur (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Grenadier | 1 | 3/2 | Droïde | Artilleur | rouge | — | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 2 dégâts à la cible |
| Corsaire | 2 | 4/5 | Elk | Artilleur | rouge | À distance, Adaptation | — |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | rouge | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | rouge | Fureur | Cri de guerre : donne +2 ATQ à un allié de votre choix |
| Berserker | 4 | 5/5 | Sorvane | Artilleur | rouge | — | Si sa cible survit, attaque une seconde fois |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | rouge, verte | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| F5-5F | 5 | 6/7 | Droïde | Artilleur | rouge, rouge | À distance | — |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | rouge, verte | À distance | Cible : l'ennemi avec le moins de points de vie |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | rouge, rouge, chromatique | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Maître des cratères | 6 | 8/12 | Dwork | Artilleur | rouge, rouge | — | Début de combat : pose une bombe à 10 dégâts sur l'ennemi le plus à gauche et sur l'ennemi le plus à droite |

### Renseignement (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Scout | 1 | 2/3 | Dwork | Renseignement | rouge | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Embusqué | 2 | 4/3 | Elk | Renseignement | chromatique | À distance, Adaptation | — |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | rouge | — | Avant chacune de ses attaques : retire 2 ATQ à sa cible |
| Intrus réseau | 2 | 2/3 | Droïde | Renseignement | rouge | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Commando | 3 | 3/4 | Elk | Renseignement | rouge | Adaptation | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| W1X05 | 3 | 3/4 | Droïde | Renseignement | rouge | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | rouge, rouge | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Spectre | 5 | 5/5 | Sorvane | Renseignement | rouge | — | Ne peut pas être ciblé tant qu'un autre allié est vivant |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | rouge, rouge, chromatique | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | rouge, rouge, chromatique | — | Début de combat : retire la Provocation de tous les ennemis |

### Roboticien (10)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Étudiant zélé | 1 | 1/3 | Elk | Roboticien | verte | Adaptation | — |
| GA-D5 | 1 | 2/3 | Droïde | Roboticien | verte | — | Fin de renfort : gagne définitivement +1 PV |
| Ferrailleur errant | 2 | 2/4 | Dwork | Roboticien | bleue | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie |
| Chef d'atelier | 3 | 2/5 | Ryskan | Roboticien | verte | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | verte, rouge | Adaptation | Fin de combat : vos drones seront invoqués avec +1/+1 jusqu'à la fin de la partie |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | verte, bleue | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | verte, rouge | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie ; Râle d'agonie : invoque un drone 5/5 à sa place |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | verte, verte, chromatique | — | Râle d'agonie : invoque un drone 7/7 à sa place |
| Vertex | 6 | 6/10 | Ryskan | Roboticien | verte, verte | — | Les drones alliés ont +5/+2 tant qu'il est en vie |
| FF548 | 7 | 7/12 | Droïde | Roboticien | verte, verte, chromatique | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Diplomate (11)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant consulaire | 1 | 2/4 | Dwork | Diplomate | bleue | — | — |
| Émissaire tribal | 2 | 2/4 | Sorvane | Diplomate | rouge | — | Début de combat : double son ATQ |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | bleue | — | Début de combat : +3 PV aux alliés adjacents |
| Émissaire | 3 | 2/6 | Elk | Diplomate | bleue | Adaptation | Cri de guerre : ajoute à votre main un équipement au hasard de niveau 3 ou 4, d'un type absent de votre équipe |
| KR-L8 | 3 | 3/5 | Droïde | Diplomate | bleue | — | Début de combat : +3/+3 aux alliés adjacents |
| AL-11 | 4 | 5/7 | Droïde | Diplomate | bleue, bleue | — | Cri de guerre : copie les PV du personnage ayant le plus de PV sur le plateau |
| Ambassadeur | 4 | 5/6 | Sorvane | Diplomate | bleue, bleue | — | Début de combat : retire 5 ATQ à tous les ennemis |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | bleue, verte | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Grande Doyenne | 6 | 5/11 | Elk | Diplomate | bleue, bleue, rouge | Adaptation | Cri de guerre : copie l'attaque du personnage ayant le plus d'attaque sur le plateau |
| Chancelier | 7 | 8/18 | Elk | Diplomate | bleue, rouge, chromatique | Adaptation | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |
| Maître des accords | 7 | 12/12 | Dwork | Diplomate | chromatique, rouge, verte | — | — |

## Serviteurs, par espèce

### Elk (18)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | rouge | Adaptation | Cible : l'ennemi avec le moins de points de vie |
| Cadet | 1 | 2/2 | Elk | Pilote | bleue | — | Lorsqu'un Pilote ennemi meurt : gagne définitivement +1/+1 |
| Étudiant zélé | 1 | 1/3 | Elk | Roboticien | verte | Adaptation | — |
| Corsaire | 2 | 4/5 | Elk | Artilleur | rouge | À distance, Adaptation | — |
| Embusqué | 2 | 4/3 | Elk | Renseignement | chromatique | À distance, Adaptation | — |
| Naturaliste | 2 | 2/5 | Elk | Explorateur | chromatique | Adaptation | Début de combat : +1 PV par type différent chez les ennemis |
| Chirurgien | 3 | 2/6 | Elk | Médecin | verte | Adaptation | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Commando | 3 | 3/4 | Elk | Renseignement | rouge | Adaptation | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| Émissaire | 3 | 2/6 | Elk | Diplomate | bleue | Adaptation | Cri de guerre : ajoute à votre main un équipement au hasard de niveau 3 ou 4, d'un type absent de votre équipe |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | verte | Adaptation | — |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | verte, rouge | Adaptation | Fin de combat : vos drones seront invoqués avec +1/+1 jusqu'à la fin de la partie |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | rouge, rouge | Provocation, Bouclier | Début de combat : +4 PV aux autres alliés |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | bleue, bleue | Adaptation | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| Spécialiste des boucliers | 5 | 3/7 | Elk | Ingénieur | verte, rouge | — | Fin de renfort : donne définitivement +3 PV à un allié équipé |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | verte, verte, bleue | Adaptation | — |
| Grande Doyenne | 6 | 5/11 | Elk | Diplomate | bleue, bleue, rouge | Adaptation | Cri de guerre : copie l'attaque du personnage ayant le plus d'attaque sur le plateau |
| Maître des vents | 6 | 6/10 | Elk | Pilote | bleue, bleue, rouge | Adaptation | Lorsqu'un ennemi attaque : lui inflige X points de dégâts, X étant son rang |
| Chancelier | 7 | 8/18 | Elk | Diplomate | bleue, rouge, chromatique | Adaptation | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |

### Dwork (18)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant consulaire | 1 | 2/4 | Dwork | Diplomate | bleue | — | — |
| Infirmier | 1 | 2/4 | Dwork | Médecin | verte | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Scout | 1 | 2/3 | Dwork | Renseignement | rouge | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Ferrailleur errant | 2 | 2/4 | Dwork | Roboticien | bleue | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | rouge | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | verte | — | Fin de renfort : donne définitivement +1/+1 à un allié aléatoire |
| Intercepteur | 2 | 3/3 | Dwork | Pilote | bleue | — | Cible en priorité un Pilote ennemi |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | rouge | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | bleue | — | Fin de renfort : donne définitivement +2 PV aux autres Pilotes alliés |
| Prospecteur | 3 | 2/3 | Dwork | Explorateur | bleue | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | rouge, verte | À distance | Début de combat : 3 dégâts à un ennemi aléatoire |
| Vieux pisteur | 4 | 4/6 | Dwork | Explorateur | bleue | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | verte, bleue | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Biologiste | 5 | 4/9 | Dwork | Médecin | verte, verte | — | — |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | rouge, rouge, chromatique | Provocation, Renaissance | — |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | verte, bleue, bleue | — | Début de renfort : ajoute à votre main un équipement au hasard de niveau 5, d'un type absent de votre équipe |
| Maître des cratères | 6 | 8/12 | Dwork | Artilleur | rouge, rouge | — | Début de combat : pose une bombe à 10 dégâts sur l'ennemi le plus à gauche et sur l'ennemi le plus à droite |
| Maître des accords | 7 | 12/12 | Dwork | Diplomate | chromatique, rouge, verte | — | — |

### Droïde (18)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| GA-D5 | 1 | 2/3 | Droïde | Roboticien | verte | — | Fin de renfort : gagne définitivement +1 PV |
| Grenadier | 1 | 3/2 | Droïde | Artilleur | rouge | — | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 2 dégâts à la cible |
| Intrus réseau | 2 | 2/3 | Droïde | Renseignement | rouge | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| RD44 | 2 | 2/5 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV aux autres alliés |
| Z3RK | 2 | 2/4 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +2 PV à un allié aléatoire |
| KR-L8 | 3 | 3/5 | Droïde | Diplomate | bleue | — | Début de combat : +3/+3 aux alliés adjacents |
| W1X05 | 3 | 3/4 | Droïde | Renseignement | rouge | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| AL-11 | 4 | 5/7 | Droïde | Diplomate | bleue, bleue | — | Cri de guerre : copie les PV du personnage ayant le plus de PV sur le plateau |
| DE-D0 | 4 | 6/8 | Droïde | Médecin | verte, verte | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| LR-04 | 4 | 4/6 | Droïde | Pilote | bleue, rouge | — | Chaque fois qu'un Pilote allié survit à une attaque qu'il inflige : ce Pilote gagne définitivement +4 ATQ |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | rouge, rouge | Provocation, Bouclier | — |
| XN-FF45 | 4 | 4/7 | Droïde | Sécurité | rouge, rouge | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| AUW0 | 5 | 6/5 | Droïde | Explorateur | bleue | À distance, Poison | — |
| C0-4193 | 5 | 6/8 | Droïde | Pilote | bleue, verte | — | Début de combat : donne Fureur aux Pilotes alliés adjacents |
| F5-5F | 5 | 6/7 | Droïde | Artilleur | rouge, rouge | À distance | — |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | bleue, verte, chromatique | — | Fin de renfort : donne définitivement +1/+1 aux alliés adjacents par type différent dans votre équipe |
| RE-5T | 6 | 7/15 | Droïde | Médecin | verte, verte | — | Début de combat : donne Renaissance aux alliés adjacents |
| FF548 | 7 | 7/12 | Droïde | Roboticien | verte, verte, chromatique | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 10/10 à sa droite |

### Sorvane (21)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | bleue | À distance | — |
| Pilote de cargo | 1 | 2/3 | Sorvane | Pilote | chromatique | — | — |
| Rat de soute | 1 | 1/3 | Sorvane | Ingénieur | chromatique | — | Cri de guerre : découvre un équipement de niveau 1, d'un type absent de votre équipe (choix parmi 3) |
| Émissaire tribal | 2 | 2/4 | Sorvane | Diplomate | rouge | — | Début de combat : double son ATQ |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | rouge | — | Avant chacune de ses attaques : retire 2 ATQ à sa cible |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +2/+1 |
| Secouriste de combat | 2 | 3/3 | Sorvane | Médecin | verte, rouge | — | Assaut : soigne 5 PV à l'allié le plus à gauche |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | bleue | — | Fin de combat : trouve un équipement non disponible durant cette partie, de n'importe quel niveau (les niveaux élevés sont de plus en plus rares) |
| Sentinelle | 3 | 4/3 | Sorvane | Sécurité | rouge | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | rouge | Fureur | Cri de guerre : donne +2 ATQ à un allié de votre choix |
| Ambassadeur | 4 | 5/6 | Sorvane | Diplomate | bleue, bleue | — | Début de combat : retire 5 ATQ à tous les ennemis |
| Berserker | 4 | 5/5 | Sorvane | Artilleur | rouge | — | Si sa cible survit, attaque une seconde fois |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | bleue, bleue | Bouclier | Cible en priorité un Pilote ennemi ; Lorsqu'il attaque, inflige le double de dégâts aux Pilotes ennemis |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | verte, verte | — | Les drones alliés ont +4/+4 tant qu'il est en vie |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | verte, verte | Bouclier | — |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | verte, rouge | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie ; Râle d'agonie : invoque un drone 5/5 à sa place |
| Spectre | 5 | 5/5 | Sorvane | Renseignement | rouge | — | Ne peut pas être ciblé tant qu'un autre allié est vivant |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | rouge, verte | À distance | Cible : l'ennemi avec le moins de points de vie |
| Gardien des six flammes | 6 | 12/10 | Sorvane | Sécurité | rouge, rouge, verte | À distance, Poison | — |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | rouge, rouge, chromatique | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | chromatique, verte, rouge | — | Début de combat : +2/+2 par type différent dans votre équipe |

### Ryskan (18)

| Nom | Rang | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | verte | — | Assaut : soigne 3 PV aux alliés adjacents |
| Fusilier | 2 | 4/3 | Ryskan | Sécurité | rouge | À distance | — |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | bleue | — | Début de combat : +2 ATQ par type différent chez les ennemis |
| Chef d'atelier | 3 | 2/5 | Ryskan | Roboticien | verte | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Contrebandier | 3 | 4/6 | Ryskan | Explorateur | bleue, rouge | À distance | Lorsqu'un ennemi meurt : +1 ATQ à lui-même |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | bleue | — | Début de combat : +3 PV aux alliés adjacents |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | bleue, bleue | — | Fin de renfort : donne définitivement +3 ATQ aux autres Pilotes alliés |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | verte, verte | Bouclier | Début de combat : +5 PV à tous les alliés ayant un Bouclier |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | rouge, rouge | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Tisseur de routes | 4 | 7/11 | Ryskan | Pilote | chromatique, chromatique | — | Début de combat : +4 PV aux Pilotes alliés par Pilote ennemi |
| Le Grand Mécanicien | 5 | 8/10 | Ryskan | Ingénieur | verte, chromatique | Bouclier | Début de combat : +2/+2 par équipement vert porté par vos alliés |
| Médecin-chef | 5 | 4/7 | Ryskan | Médecin | verte, verte | — | Assaut : soigne 5 PV à tous les alliés |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | bleue, verte | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Brise-siège | 6 | 10/17 | Ryskan | Sécurité | rouge, rouge, rouge | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | rouge, rouge, chromatique | À distance | Début de combat : 5 dégâts à un ennemi aléatoire |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | verte, verte, chromatique | — | Râle d'agonie : invoque un drone 7/7 à sa place |
| Vertex | 6 | 6/10 | Ryskan | Roboticien | verte, verte | — | Les drones alliés ont +5/+2 tant qu'il est en vie |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | rouge, rouge, chromatique | — | Début de combat : retire la Provocation de tous les ennemis |

## Équipements

| Nom | Rang | Type | Couleur | Mot-clé | Effet |
|---|---|---|---|---|---|
| Accélérateur balistique | 1 | Artilleur | rouge | — | Chaque fois qu'il attaque sans tuer sa cible : gagne définitivement +2 ATQ |
| Injecteur de nanites | 1 | Médecin | vert | — | Après avoir subi des dégâts et survécu : lui rend 2 PV (jamais au-delà de ses PV maximum) |
| Projecteur de bouclier | 1 | Sécurité | bleu | — | Début de combat : donne un Bouclier à l'allié ayant le moins de PV |
| Renfort adaptatif | 1 | Ingénieur | vert | — | Début de combat : double les PV du serviteur allié ayant le moins de PV |
| Compensateur quantique | 2 | Pilote | bleu | — | Début de combat : donne un Bouclier à un allié aléatoire |
| Détecteur de vulnérabilités | 2 | Renseignement | rouge | — | Cible : l'ennemi avec le moins de points de vie |
| Égide de secours | 2 | Sécurité | bleu | — | Après avoir subi des dégâts et survécu : gagne un Bouclier (une fois par combat) |
| Extracteur de routines | 2 | Roboticien | vert | — | Quand un drone allié meurt, un autre drone allié aléatoire récupère son pouvoir jusqu'à la fin du combat |
| La pomme de discorde | 2 | Diplomate | rouge | — | Début de combat : le serviteur ennemi avec le moins de PV inflige ses dégâts d'Attaque à un autre ennemi aléatoire |
| Scanner géologique | 2 | Explorateur | bleu | — | Début de combat : +1/+1 à tous les alliés |
| Sérum régénératif | 2 | Médecin | vert | — | Fin de renfort : gagne définitivement +1 PV |
| Brouilleur quantique | 3 | Renseignement | rouge | — | Début de combat : empêche le déclenchement du premier effet de début de combat ennemi |
| Duplicateur d'impulsion | 3 | Ingénieur | bleu | — | Début de combat : rejoue le premier effet de début de combat qui a été déclenché (hors celui-ci) |
| Interface de vol neural | 3 | Pilote | bleu | — | Les dégâts subis inférieurs à 5 sont annulés |
| Le protocole Lazare | 3 | Roboticien | vert | — | Si un drone est présent lorsqu'un allié (autre qu'un drone) meurt, détruit le drone et rend tous ses PV à l'allié à sa place |
| Mandat de protection | 3 | Diplomate | bleu | — | Début de combat : donne un Bouclier à l'allié ayant le moins de PV |
| Réseau d'informateurs | 3 | Renseignement | rouge | — | Début de combat : +3/+3 à tous les alliés par Renseignement allié |
| Résonateur d'essaim | 3 | Roboticien | vert | — | Chaque fois qu'un drone allié attaque, donne +2 ATQ aux drones alliés pendant ce combat |
| Sonde tridimensionnelle | 3 | Explorateur | bleu | — | La première carte équipement de chaque proposition de renfort (à chaque Datacron dépensé) a 25 % de chances d'être d'un type indisponible durant la partie (les exemplaires se cumulent) |
| Boussole stellaire | 4 | Explorateur | bleu | — | La première proposition de chaque renfort contient une carte de rang supérieur au niveau de renfort (les exemplaires ne se cumulent pas) |
| Charge à fragmentation | 4 | Artilleur | rouge | — | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 3 dégâts à la cible et aux serviteurs voisins de sa cible |
| Chronoscope stellaire | 4 | Pilote | vert | — | Fin de combat : donne définitivement +1/+1 à tous les alliés survivants, lui compris |
| Défibrillateur portatif | 4 | Médecin | vert | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| Oscillateur hyperfréquence | 4 | Ingénieur | vert | — | Fin de renfort : donne définitivement +1/+1 à l'allié le plus à droite |
| Tir de couverture | 4 | Sécurité | rouge | — | Assaut : son allié à droite attaque également, à distance (sans riposte) |
| Balise de Voronoï | 5 | Explorateur | bleu | — | Début de combat : double les PV de l'allié le plus à gauche (ne se cumule pas, même avec plusieurs exemplaires) |
| Brouilleur synaptique | 5 | Renseignement | rouge | — | Début de combat : le serviteur ennemi avec le plus d'ATQ ne peut pas riposter à la première attaque qu'il subit |
| Modulateur génétique | 5 | Médecin | vert | — | Fin de renfort : ce serviteur gagne 3 PV et perd 2 ATQ définitivement (son ATQ ne descend pas sous 0) |
| Plan de vol | 5 | Pilote | bleu | — | Début de combat : +2 ATQ par Pilote allié |
| Protocole balistique | 5 | Roboticien | vert | — | Les drones invoqués par ce serviteur ont À distance |
| Régulateur d'intégrité | 5 | Ingénieur | vert | — | Début de combat : répartit équitablement les PV de ce serviteur et de son voisin de gauche (en cas de total impair, le porteur garde le point en plus) |
| Sceau pacificateur | 5 | Diplomate | rouge | — | Début de combat : le serviteur ennemi avec le plus d'ATQ ne peut pas attaquer lors de sa première occasion |
| Accumulateur balistique | 6 | Sécurité | bleu | — | Chaque fois qu'un allié perd son Bouclier : augmente de X (niveau de renfort) les dégâts du prochain effet de cet équipement ; Râle d'agonie : inflige les dégâts accumulés à un ennemi aléatoire |
| Bombardement orbital | 6 | Artilleur | rouge | — | Début de combat : inflige 1 à 3 points de dégâts à tous les serviteurs ennemis |
| Médaillon des mille voix | 6 | Diplomate | vert | — | Début de combat : +1/+1 par espèce différente parmi vos serviteurs |
| Ogive instable | 6 | Artilleur | rouge | — | Râle d'agonie : inflige son Attaque à un ennemi aléatoire |

## Héros

| Nom | Types | PV | Mot-clé | Pouvoir |
|---|---|---|---|---|
| Capitaine Rol Vex | Elk / Pilote | 30 | Provocation | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Flam'Gruk | Dwork / Explorateur | 28 | — | Début de renfort : lance un datacube : -3, -1, 1, 2, 2, 3 Datacrons |
| TE-5T | Droïde / Ingénieur | 29 | — | Salle 5 : ajoute à votre main un serviteur au hasard de type Droïde, de n'importe quel rang |
| Brokk'Ric | Dwork / Artilleur | 33 | — | Début de combat : place une bombe sur l'ennemi le plus à droite. Cette bombe inflige autant de dégâts que le niveau de renfort |
| Reyes | Ryskan / Roboticien | 32 | — | Tous les 2 renforts : ajoute à votre main un équipement au hasard de type Roboticien, de n'importe quel rang |
| Amber | Elk / Renseignement | 28 | — | Début de la mission : découvre un serviteur de rang 7 ; il arrive en jeu quand 60 Datacrons ont été utilisés |
| Y5-A9 | Droïde / Médecin | 30 | — | Actif (une fois par renfort) : donne Renaissance à un serviteur jusqu'au prochain renfort |
| Sulseye | Ryskan / Diplomate | 28 | — | Actif : pour 3 Datacrons, crée la dernière copie d'un serviteur dont vous avez deux exemplaires pour les fusionner |
| Waven | Sorvane / Diplomate | 30 | — | Actif (une fois par renfort) : déclenche le cri de guerre de l'allié ciblé |
| Alice | Sorvane / Sécurité | 30 | — | Début de combat : donne Fureur à un allié aléatoire |

## Donjons

| Nom | Type | Boss | PV | Pouvoir du Boss |
|---|---|---|---|---|
| Le Nid de la Reine | Médecin | La Reine-Mère | 250 | Régénération : après chaque attaque, ses serviteurs récupèrent 2 PV (jusqu'à leur maximum). |
| Station Oméga | Droïde | Intelligence Oméga | 200 | Surcharge : au début de chaque combat, ses serviteurs gagnent +1/+1 par tranche de trois salles déjà franchies. |
| La Cité des Profondeurs | Renseignement | L'Oracle Souterrain | 220 | Écho : chaque fois qu'un de ses serviteurs attaque, il gagne +1 ATQ jusqu'à la fin du combat. |
| La Forge de Brasier-Roc | Artilleur | Maître-Forgeron Grumm | 220 | Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV. |
| Surfy Len | Diplomate | Sorkar | 250 | Empereur de Surfy Len |
