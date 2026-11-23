# Cartes du prototype

Export automatique de `prototype/data.js` (script `tools/export-cards.js`). Toutes les valeurs sont provisoires.

- Serviteurs : 93 — équipements : 54 — héros : 10 — donjons : 2.
- Niveau de renfort maximum : 6 (niveau maximum proposé). Les serviteurs de niveau 7 ne s'obtiennent que par fusion.
- Plateau : 7 serviteurs. Main : 7 cartes.
- **Châsses** : un serviteur a de 0 à 3 châsses (bleue, verte, rouge ou chromatique, qui accepte toutes les couleurs). Un équipement a une couleur et ne se pose que dans une châsse libre de la même couleur ou chromatique.
- Les mots-clés sont toujours les mêmes (Provocation, Bouclier, Poison, Renaissance, À distance, Adaptation) ; les pouvoirs sont écrits en toutes lettres.
- **Adaptation** : à la fin du combat, chaque Elk survivant choisit entre deux options : un bonus permanent de +N PV ou +N ATQ tiré au hasard (N = niveau de renfort), ou un pouvoir tiré au hasard parmi ceux des autres survivants. Conservé jusqu'à la fin de la mission.
- **Assaut** : quand le serviteur attaque. **Cible** : choisit sa cible malgré la Provocation. Effets de renfort : permanents pour la mission ; effets de combat : valables pour le combat seulement.

## Serviteurs, par affectation

### Pilote (11)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Cadet | 1 | 2/2 | Elk | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +1 ATQ |
| Pilote de cargo | 1 | 2/3 | Sorvane | Pilote | chromatique | — | Fin de combat : gagne définitivement 2 PV s'il porte un objet bleu, 2 ATQ s'il porte un objet rouge, ou +1/+1 s'il porte un objet vert |
| Intercepteur | 2 | 3/3 | Dwork | Pilote | bleue | — | Cible : l'ennemi avec le moins de points de vie |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +2/+1 |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | bleue | — | Fin de renfort : donne définitivement +2 PV aux alliés adjacents |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | bleue, bleue | Bouclier | Inflige le double de dégâts lors de sa première attaque |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | bleue, bleue | — | Fin de renfort : donne définitivement +2 ATQ aux 3 alliés les plus à gauche |
| LR-04 | 4 | 4/6 | Droïde | Pilote | bleue, rouge | — | Chaque fois qu'un allié survit à une attaque qu'il inflige : il gagne définitivement +2 ATQ |
| Tisseur de routes | 4 | 7/11 | Ryskan | Pilote | chromatique, chromatique | — | Début de combat : +3 PV à tous les alliés par allié affecté au Pilote |
| C0-A5 | 5 | 6/8 | Droïde | Pilote | bleue, verte | — | Début de combat : donne Fureur aux alliés adjacents |
| Maître des vents | 6 | 6/10 | Elk | Pilote | bleue, bleue, rouge | — | Lorsqu'un ennemi attaque : lui inflige des dégâts égaux à son niveau |

### Ingénieur (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Rat de soute | 1 | 1/3 | Sorvane | Ingénieur | chromatique | — | Cri de guerre : découvre un équipement de niveau 1, d'un type absent de votre équipe (choix parmi 3) |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | verte | — | Fin de renfort : donne définitivement +1/+1 à 2 alliés aléatoires différents |
| RD-4K | 2 | 2/5 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV aux autres alliés |
| Z3-RK | 2 | 2/4 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +2 PV à un allié aléatoire |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV à tous les alliés par équipement vert porté par vos alliés |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | verte, verte | — | Fin de combat : trouve un équipement de votre niveau de renfort |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | verte, verte | Bouclier | Début de combat : +5 PV à tous les alliés ayant un Bouclier |
| Le Grand Mécanicien | 5 | 8/10 | Ryskan | Ingénieur | verte, chromatique | Bouclier | Début de combat : +2/+2 par équipement vert porté par vos alliés |
| Spécialiste des boucliers | 5 | 3/7 | Elk | Ingénieur | verte, rouge | — | Fin de renfort : donne définitivement +3 PV à un allié équipé |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | verte, bleue, bleue | — | Début de renfort : ajoute à votre main un équipement au hasard de niveau 5, d'un type absent de votre équipe |

### Médecin (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | verte | — | Assaut : soigne 3 PV aux alliés adjacents |
| Infirmier | 1 | 2/4 | Dwork | Médecin | verte | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Secouriste de combat | 2 | 3/3 | Sorvane | Médecin | verte, rouge | — | Assaut : soigne 5 PV à l'allié le plus à gauche |
| Chirurgien | 3 | 2/6 | Elk | Médecin | verte | — | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| DE-D0 | 4 | 6/8 | Droïde | Médecin | verte, verte | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| Biologiste | 5 | 4/9 | Dwork | Médecin | verte, verte | — | Râle d'agonie : lance une bombe empoisonnée sur l'ennemi le plus à droite. Cette bombe détruit son porteur avant qu'il n'attaque |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | verte, verte | Bouclier | — |
| Médecin-chef | 5 | 4/7 | Ryskan | Médecin | verte, verte | — | Assaut : soigne 5 PV à tous les alliés |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | verte, verte, bleue | — | — |
| RE-5T | 6 | 7/15 | Droïde | Médecin | verte, verte | — | Début de combat : donne Renaissance aux alliés adjacents |

### Sécurité (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | rouge | — | Cible : l'ennemi avec le moins de points de vie |
| Fusilier | 2 | 4/3 | Sorvane | Sécurité | rouge | À distance | — |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | rouge | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible |
| Sentinelle | 3 | 4/3 | Ryskan | Sécurité | rouge | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | rouge, rouge | Provocation, Bouclier | — |
| XN-W3 | 4 | 4/7 | Droïde | Sécurité | rouge, rouge | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | rouge, rouge | Provocation, Bouclier | Début de combat : +4 PV aux autres alliés |
| Brise-siège | 6 | 10/17 | Ryskan | Sécurité | rouge, rouge, rouge | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | rouge, rouge, chromatique | Provocation, Renaissance | — |
| Gardien des six flammes | 6 | 12/10 | Sorvane | Sécurité | rouge, rouge, verte | À distance, Poison | — |

### Explorateur (11)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | chromatique | À distance | — |
| Naturaliste | 2 | 2/5 | Elk | Explorateur | chromatique | — | Début de combat : +1 PV par type différent chez les ennemis |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | chromatique | — | Début de combat : +1 ATQ par type différent chez les ennemis |
| Contrebandier | 3 | 4/6 | Ryskan | Explorateur | bleue, chromatique | À distance | Lorsqu'un ennemi meurt : gagne +2 ATQ jusqu'à la fin du combat |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | chromatique | — | Fin de combat : trouve un équipement non disponible durant cette partie, de n'importe quel niveau (les niveaux élevés sont de plus en plus rares) |
| Prospecteur | 3 | 2/3 | Dwork | Explorateur | chromatique | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Vieux pisteur | 4 | 4/6 | Dwork | Explorateur | chromatique | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| AU-W0 | 5 | 6/5 | Droïde | Explorateur | chromatique | À distance, Poison | — |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | chromatique, bleue | — | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | chromatique, chromatique, bleue | — | Fin de renfort : donne définitivement +1/+1 aux alliés adjacents par type différent dans votre équipe |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | chromatique, chromatique, chromatique | — | Début de combat : +2/+2 par type différent dans votre équipe |

### Artilleur (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| YG-U5 | 1 | 3/2 | Droïde | Artilleur | rouge | — | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 2 dégâts à la cible |
| Corsaire | 2 | 4/5 | Elk | Artilleur | rouge | À distance | — |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | rouge | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | rouge | Fureur | Cri de guerre : donne +2 ATQ à un allié de votre choix |
| Berserker | 4 | 5/5 | Sorvane | Artilleur | rouge | — | Si sa cible survit, attaque une seconde fois |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | rouge, verte | À distance | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 6 dégâts à la cible |
| F5-5F | 5 | 8/7 | Droïde | Artilleur | rouge, rouge | À distance | Début de combat : place 5 bombes sur des ennemis aléatoires. Chaque bombe inflige 2 dégâts à sa cible |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | rouge, verte | À distance | Cible : l'ennemi avec le moins de points de vie |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | rouge, rouge, chromatique | À distance | Début de combat : 5 dégâts à 3 ennemis aléatoires différents |
| Maître des cratères | 6 | 8/12 | Dwork | Artilleur | rouge, rouge | — | Début de combat : pose une bombe à 7 dégâts sur l'ennemi le plus à gauche et sur l'ennemi le plus à droite |

### Renseignement (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Scout | 1 | 2/3 | Dwork | Renseignement | rouge | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Embusqué | 2 | 4/3 | Elk | Renseignement | chromatique | À distance | — |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | rouge | — | Avant chacune de ses attaques : retire 2 ATQ à sa cible |
| RA-T3 | 2 | 2/3 | Droïde | Renseignement | rouge | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| Commando | 3 | 3/4 | Elk | Renseignement | rouge | — | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| WI-X5 | 3 | 3/4 | Droïde | Renseignement | rouge | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | rouge, rouge | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Spectre | 5 | 5/5 | Sorvane | Renseignement | rouge | — | Ne peut pas être ciblé tant qu'un autre allié est vivant |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | rouge, rouge, chromatique | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | rouge, rouge, chromatique | — | Début de combat : retire aléatoirement toutes les Provocations ou tous les Boucliers des ennemis |

### Roboticien (10)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Étudiant zélé | 1 | 1/3 | Elk | Roboticien | verte | — | Râle d'agonie : invoque un drone 2/2 à sa place |
| GA-D5 | 1 | 2/3 | Droïde | Roboticien | verte | — | Aura : les drones alliés ont +2/+2 tant qu'il est en vie |
| Ferrailleur errant | 2 | 2/4 | Dwork | Roboticien | bleue | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie |
| Chef d'atelier | 3 | 2/5 | Ryskan | Roboticien | verte | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | verte, rouge | — | Fin de combat : vos drones seront invoqués avec +1/+1 jusqu'à la fin de la partie |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | verte, bleue | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | verte, rouge | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie ; Râle d'agonie : invoque un drone 5/5 à sa place |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | verte, verte, chromatique | — | Râle d'agonie : invoque un drone 7/7 à sa place |
| Vertex | 6 | 6/10 | Ryskan | Roboticien | verte, verte | — | Aura : les drones alliés ont +5/+2 tant qu'il est en vie |
| FF-4H | 7 | 7/12 | Droïde | Roboticien | verte, verte, chromatique | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 6/6 à sa droite |

### Diplomate (11)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant consulaire | 1 | 2/4 | Dwork | Diplomate | bleue | — | — |
| Émissaire tribal | 2 | 2/4 | Sorvane | Diplomate | rouge | — | Début de combat : double son ATQ |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | bleue | — | Début de combat : +3 PV aux alliés adjacents |
| Émissaire | 3 | 2/6 | Elk | Diplomate | bleue | — | Cri de guerre : ajoute à votre main un équipement au hasard de niveau 3 ou 4, d'un type absent de votre équipe |
| KR-L8 | 3 | 3/5 | Droïde | Diplomate | bleue | — | Début de combat : +3/+3 aux alliés adjacents |
| AL-1X | 4 | 5/7 | Droïde | Diplomate | bleue, bleue | — | Cri de guerre : copie les PV du personnage ayant le plus de PV sur le plateau |
| Ambassadeur | 4 | 5/6 | Sorvane | Diplomate | bleue, bleue | — | Début de combat : retire 5 ATQ à tous les ennemis |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | bleue, verte | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Grande Doyenne | 6 | 5/11 | Elk | Diplomate | bleue, bleue, rouge | — | Cri de guerre : copie l'attaque du personnage ayant le plus d'attaque sur le plateau |
| Chancelier | 7 | 8/18 | Elk | Diplomate | bleue, rouge, chromatique | — | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |
| Maître des accords | 7 | 12/12 | Dwork | Diplomate | chromatique, rouge, verte | Poison | Immunisé au Poison |

## Serviteurs, par espèce

### Elk (18)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Agent de sécurité | 1 | 3/1 | Elk | Sécurité | rouge | — | Cible : l'ennemi avec le moins de points de vie |
| Cadet | 1 | 2/2 | Elk | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +1 ATQ |
| Étudiant zélé | 1 | 1/3 | Elk | Roboticien | verte | — | Râle d'agonie : invoque un drone 2/2 à sa place |
| Corsaire | 2 | 4/5 | Elk | Artilleur | rouge | À distance | — |
| Embusqué | 2 | 4/3 | Elk | Renseignement | chromatique | À distance | — |
| Naturaliste | 2 | 2/5 | Elk | Explorateur | chromatique | — | Début de combat : +1 PV par type différent chez les ennemis |
| Chirurgien | 3 | 2/6 | Elk | Médecin | verte | — | Après chaque attaque reçue par un allié : soigne 2 PV à cet allié |
| Commando | 3 | 3/4 | Elk | Renseignement | rouge | — | Début de combat : retire 2 ATQ à un ennemi aléatoire |
| Émissaire | 3 | 2/6 | Elk | Diplomate | bleue | — | Cri de guerre : ajoute à votre main un équipement au hasard de niveau 3 ou 4, d'un type absent de votre équipe |
| Maître mécanicien | 3 | 3/5 | Elk | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV à tous les alliés par équipement vert porté par vos alliés |
| Maître des drones | 4 | 3/6 | Elk | Roboticien | verte, rouge | — | Fin de combat : vos drones seront invoqués avec +1/+1 jusqu'à la fin de la partie |
| Commandant de la garde | 5 | 6/11 | Elk | Sécurité | rouge, rouge | Provocation, Bouclier | Début de combat : +4 PV aux autres alliés |
| Explorateur des confins | 5 | 4/8 | Elk | Explorateur | chromatique, bleue | — | Fin de combat : votre prochain renfort vous proposera 7 cartes |
| Spécialiste des boucliers | 5 | 3/7 | Elk | Ingénieur | verte, rouge | — | Fin de renfort : donne définitivement +3 PV à un allié équipé |
| Biochirurgien | 6 | 6/14 | Elk | Médecin | verte, verte, bleue | — | — |
| Grande Doyenne | 6 | 5/11 | Elk | Diplomate | bleue, bleue, rouge | — | Cri de guerre : copie l'attaque du personnage ayant le plus d'attaque sur le plateau |
| Maître des vents | 6 | 6/10 | Elk | Pilote | bleue, bleue, rouge | — | Lorsqu'un ennemi attaque : lui inflige des dégâts égaux à son niveau |
| Chancelier | 7 | 8/18 | Elk | Diplomate | bleue, rouge, chromatique | — | Début de combat : l'ennemi le plus à droite attaque l'ennemi le plus à gauche |

### Dwork (18)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant consulaire | 1 | 2/4 | Dwork | Diplomate | bleue | — | — |
| Infirmier | 1 | 2/4 | Dwork | Médecin | verte | — | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Scout | 1 | 2/3 | Dwork | Renseignement | rouge | — | Début de combat : retire 1 ATQ à un ennemi aléatoire |
| Ferrailleur errant | 2 | 2/4 | Dwork | Roboticien | bleue | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie |
| Garde de bord | 2 | 2/5 | Dwork | Sécurité | rouge | — | Inflige parfois le double des dégâts à l'ennemi à côté de sa cible |
| Ingénieur de pont | 2 | 2/4 | Dwork | Ingénieur | verte | — | Fin de renfort : donne définitivement +1/+1 à 2 alliés aléatoires différents |
| Intercepteur | 2 | 3/3 | Dwork | Pilote | bleue | — | Cible : l'ennemi avec le moins de points de vie |
| Maître-canonnier | 2 | 2/3 | Dwork | Artilleur | rouge | À distance | Détruit le Bouclier de la cible avant de l'attaquer |
| Lieutenant de pont | 3 | 4/4 | Dwork | Pilote | bleue | — | Fin de renfort : donne définitivement +2 PV aux alliés adjacents |
| Prospecteur | 3 | 2/3 | Dwork | Explorateur | chromatique | — | Début de combat : +2/+1 par type différent dans votre équipe |
| Maître-artilleur | 4 | 5/5 | Dwork | Artilleur | rouge, verte | À distance | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 6 dégâts à la cible |
| Vieux pisteur | 4 | 4/6 | Dwork | Explorateur | chromatique | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| Architecte d'essaim | 5 | 4/8 | Dwork | Roboticien | verte, bleue | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 1/1 à sa droite |
| Biologiste | 5 | 4/9 | Dwork | Médecin | verte, verte | — | Râle d'agonie : lance une bombe empoisonnée sur l'ennemi le plus à droite. Cette bombe détruit son porteur avant qu'il n'attaque |
| Briseur de fronts | 6 | 8/13 | Dwork | Sécurité | rouge, rouge, chromatique | Provocation, Renaissance | — |
| Forgeron stellaire | 6 | 7/14 | Dwork | Ingénieur | verte, bleue, bleue | — | Début de renfort : ajoute à votre main un équipement au hasard de niveau 5, d'un type absent de votre équipe |
| Maître des cratères | 6 | 8/12 | Dwork | Artilleur | rouge, rouge | — | Début de combat : pose une bombe à 7 dégâts sur l'ennemi le plus à gauche et sur l'ennemi le plus à droite |
| Maître des accords | 7 | 12/12 | Dwork | Diplomate | chromatique, rouge, verte | Poison | Immunisé au Poison |

### Droïde (18)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| GA-D5 | 1 | 2/3 | Droïde | Roboticien | verte | — | Aura : les drones alliés ont +2/+2 tant qu'il est en vie |
| YG-U5 | 1 | 3/2 | Droïde | Artilleur | rouge | — | Début de combat : place une bombe sur un ennemi aléatoire. Cette bombe inflige 2 dégâts à la cible |
| RA-T3 | 2 | 2/3 | Droïde | Renseignement | rouge | — | Début de combat : retire 3 ATQ à l'ennemi le plus à gauche |
| RD-4K | 2 | 2/5 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +1 PV aux autres alliés |
| Z3-RK | 2 | 2/4 | Droïde | Ingénieur | verte | — | Fin de renfort : donne définitivement +2 PV à un allié aléatoire |
| KR-L8 | 3 | 3/5 | Droïde | Diplomate | bleue | — | Début de combat : +3/+3 aux alliés adjacents |
| WI-X5 | 3 | 3/4 | Droïde | Renseignement | rouge | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| AL-1X | 4 | 5/7 | Droïde | Diplomate | bleue, bleue | — | Cri de guerre : copie les PV du personnage ayant le plus de PV sur le plateau |
| DE-D0 | 4 | 6/8 | Droïde | Médecin | verte, verte | — | Au lieu d'attaquer, soigne de tous ses PV le dernier allié ayant survécu à une attaque |
| LR-04 | 4 | 4/6 | Droïde | Pilote | bleue, rouge | — | Chaque fois qu'un allié survit à une attaque qu'il inflige : il gagne définitivement +2 ATQ |
| P0-C5 | 4 | 4/8 | Droïde | Sécurité | rouge, rouge | Provocation, Bouclier | — |
| XN-W3 | 4 | 4/7 | Droïde | Sécurité | rouge, rouge | Provocation | Râle d'agonie : +3/+1 aux autres alliés |
| AU-W0 | 5 | 6/5 | Droïde | Explorateur | chromatique | À distance, Poison | — |
| C0-A5 | 5 | 6/8 | Droïde | Pilote | bleue, verte | — | Début de combat : donne Fureur aux alliés adjacents |
| F5-5F | 5 | 8/7 | Droïde | Artilleur | rouge, rouge | À distance | Début de combat : place 5 bombes sur des ennemis aléatoires. Chaque bombe inflige 2 dégâts à sa cible |
| M1-FE | 6 | 6/11 | Droïde | Explorateur | chromatique, chromatique, bleue | — | Fin de renfort : donne définitivement +1/+1 aux alliés adjacents par type différent dans votre équipe |
| RE-5T | 6 | 7/15 | Droïde | Médecin | verte, verte | — | Début de combat : donne Renaissance aux alliés adjacents |
| FF-4H | 7 | 7/12 | Droïde | Roboticien | verte, verte, chromatique | — | Lorsqu'il y a de la place sur le plateau : invoque un drone 6/6 à sa droite |

### Sorvane (21)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Éclaireur | 1 | 2/2 | Sorvane | Explorateur | chromatique | À distance | — |
| Pilote de cargo | 1 | 2/3 | Sorvane | Pilote | chromatique | — | Fin de combat : gagne définitivement 2 PV s'il porte un objet bleu, 2 ATQ s'il porte un objet rouge, ou +1/+1 s'il porte un objet vert |
| Rat de soute | 1 | 1/3 | Sorvane | Ingénieur | chromatique | — | Cri de guerre : découvre un équipement de niveau 1, d'un type absent de votre équipe (choix parmi 3) |
| Émissaire tribal | 2 | 2/4 | Sorvane | Diplomate | rouge | — | Début de combat : double son ATQ |
| Fantôme | 2 | 3/2 | Sorvane | Renseignement | rouge | — | Avant chacune de ses attaques : retire 2 ATQ à sa cible |
| Fusilier | 2 | 4/3 | Sorvane | Sécurité | rouge | À distance | — |
| Pilote de combat | 2 | 2/4 | Sorvane | Pilote | bleue | — | Lorsqu'il survit à son attaque : gagne définitivement +2/+1 |
| Secouriste de combat | 2 | 3/3 | Sorvane | Médecin | verte, rouge | — | Assaut : soigne 5 PV à l'allié le plus à gauche |
| Pilleur de ruine | 3 | 4/5 | Sorvane | Explorateur | chromatique | — | Fin de combat : trouve un équipement non disponible durant cette partie, de n'importe quel niveau (les niveaux élevés sont de plus en plus rares) |
| Soldat d'assaut | 3 | 4/4 | Sorvane | Artilleur | rouge | Fureur | Cri de guerre : donne +2 ATQ à un allié de votre choix |
| Ambassadeur | 4 | 5/6 | Sorvane | Diplomate | bleue, bleue | — | Début de combat : retire 5 ATQ à tous les ennemis |
| Berserker | 4 | 5/5 | Sorvane | Artilleur | rouge | — | Si sa cible survit, attaque une seconde fois |
| Chasseur de frégates | 4 | 5/4 | Sorvane | Pilote | bleue, bleue | Bouclier | Inflige le double de dégâts lors de sa première attaque |
| Chef mécanicien | 4 | 4/7 | Sorvane | Ingénieur | verte, verte | — | Fin de combat : trouve un équipement de votre niveau de renfort |
| Chirurgien de bord | 5 | 4/8 | Sorvane | Médecin | verte, verte | Bouclier | — |
| Opérateur d'essaim | 5 | 3/6 | Sorvane | Roboticien | verte, rouge | — | Cri de guerre : donne +2/+2 à tous vos drones, présents et futurs, jusqu'à la fin de la partie ; Râle d'agonie : invoque un drone 5/5 à sa place |
| Spectre | 5 | 5/5 | Sorvane | Renseignement | rouge | — | Ne peut pas être ciblé tant qu'un autre allié est vivant |
| Tireur d'élite | 5 | 5/6 | Sorvane | Artilleur | rouge, verte | À distance | Cible : l'ennemi avec le moins de points de vie |
| Gardien des six flammes | 6 | 12/10 | Sorvane | Sécurité | rouge, rouge, verte | À distance, Poison | — |
| Ombre | 6 | 9/8 | Sorvane | Renseignement | rouge, rouge, chromatique | — | Début de combat : échange ses PV avec l'ennemi le plus à gauche |
| Traqueur des ombres | 7 | 10/12 | Sorvane | Explorateur | chromatique, chromatique, chromatique | — | Début de combat : +2/+2 par type différent dans votre équipe |

### Ryskan (18)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|
| Assistant de labo | 1 | 2/2 | Ryskan | Médecin | verte | — | Assaut : soigne 3 PV aux alliés adjacents |
| Pionnier | 2 | 2/4 | Ryskan | Explorateur | chromatique | — | Début de combat : +1 ATQ par type différent chez les ennemis |
| Chef d'atelier | 3 | 2/5 | Ryskan | Roboticien | verte | — | Lorsqu'un drone est invoqué : le drone invoqué gagne +2/+2 |
| Contrebandier | 3 | 4/6 | Ryskan | Explorateur | bleue, chromatique | À distance | Lorsqu'un ennemi meurt : gagne +2 ATQ jusqu'à la fin du combat |
| Diplomate | 3 | 2/6 | Ryskan | Diplomate | bleue | — | Début de combat : +3 PV aux alliés adjacents |
| Sentinelle | 3 | 4/3 | Ryskan | Sécurité | rouge | — | Lorsqu'un ennemi attaque : tir préventif à distance : lui inflige X points de dégâts, X étant son ATQ, sans riposte et sans perdre son tour d'attaque (une fois par combat, sur le premier ennemi qui attaque) |
| Commandant de vol | 4 | 5/6 | Ryskan | Pilote | bleue, bleue | — | Fin de renfort : donne définitivement +2 ATQ aux 3 alliés les plus à gauche |
| Ingénieur de distorsion | 4 | 4/8 | Ryskan | Ingénieur | verte, verte | Bouclier | Début de combat : +5 PV à tous les alliés ayant un Bouclier |
| Maître espion | 4 | 4/6 | Ryskan | Renseignement | rouge, rouge | — | Début de combat : réduit les PV du serviteur ennemi le plus à droite à 1 |
| Tisseur de routes | 4 | 7/11 | Ryskan | Pilote | chromatique, chromatique | — | Début de combat : +3 PV à tous les alliés par allié affecté au Pilote |
| Le Grand Mécanicien | 5 | 8/10 | Ryskan | Ingénieur | verte, chromatique | Bouclier | Début de combat : +2/+2 par équipement vert porté par vos alliés |
| Médecin-chef | 5 | 4/7 | Ryskan | Médecin | verte, verte | — | Assaut : soigne 5 PV à tous les alliés |
| Orateur impérial | 5 | 5/9 | Ryskan | Diplomate | bleue, verte | — | Début de combat : rejoue les effets de début de combat de ses voisins directs |
| Brise-siège | 6 | 10/17 | Ryskan | Sécurité | rouge, rouge, rouge | Provocation | Détruit le Bouclier de la cible avant de l'attaquer |
| Chasseur de prime | 6 | 9/9 | Ryskan | Artilleur | rouge, rouge, chromatique | À distance | Début de combat : 5 dégâts à 3 ennemis aléatoires différents |
| Nexus | 6 | 4/9 | Ryskan | Roboticien | verte, verte, chromatique | — | Râle d'agonie : invoque un drone 7/7 à sa place |
| Vertex | 6 | 6/10 | Ryskan | Roboticien | verte, verte | — | Aura : les drones alliés ont +5/+2 tant qu'il est en vie |
| Maître des ombres | 7 | 8/12 | Ryskan | Renseignement | rouge, rouge, chromatique | — | Début de combat : retire aléatoirement toutes les Provocations ou tous les Boucliers des ennemis |

### Dakri (0)

| Nom | Niveau | ATQ/PV | Espèce | Affectation | Châsses | Mots-clés | Pouvoirs |
|---|---|---|---|---|---|---|---|

## Équipements

| Nom | Niveau | Type | Couleur | Mot-clé | Effet |
|---|---|---|---|---|---|
| Analyseur balistique | 1 | Renseignement | rouge | — | Début de combat : +3 ATQ à l'allié le plus à droite |
| Analyseur tactique | 1 | Ingénieur | vert | — | Fin de combat : gagne définitivement +1/+1 |
| Bouclier de fortune | 1 | Sécurité | rouge | Provocation | — |
| Correcteur de trajectoire | 1 | Pilote | bleu | — | Chaque fois qu'un allié attaque, il gagne +1 ATQ pendant ce combat |
| Kit de secours | 1 | Médecin | vert | — | Après avoir subi des dégâts et survécu : lui rend 2 PV (jamais au-delà de ses PV maximum) |
| Piège mortel | 1 | Artilleur | rouge | — | Râle d'agonie : pose une bombe de 2 dégâts sur son attaquant |
| Puce DB-12 | 1 | Roboticien | vert | — | Les drones invoqués par ce serviteur ont +2/+2 |
| Scanner | 1 | Explorateur | bleu | — | Début de combat : gagne +2/+2 jusqu'à la fin du combat |
| Subornation | 1 | Diplomate | bleu | — | Début de combat : l'ennemi qui a le moins de PV attaque un de ses voisins |
| Bombe à fragmentation | 2 | Artilleur | rouge | — | Assaut : pose une bombe de 3 dégâts sur la cible ; à l'explosion, pose une autre bombe de 3 dégâts sur un voisin |
| Compensateur quantique | 2 | Pilote | bleu | — | Début de combat : donne un Bouclier à un allié aléatoire |
| Détecteur de reliques | 2 | Explorateur | bleu | — | Fin de combat : récupère dans votre main un équipement au hasard parmi ceux que portaient les ennemis |
| Détecteur de vulnérabilités | 2 | Renseignement | rouge | — | Cible : l'ennemi avec le moins de points de vie |
| Drone DA-3S | 2 | Roboticien | vert | — | Immunisé au Poison |
| Projecteur de bouclier | 2 | Sécurité | rouge | — | Début de combat : donne un Bouclier à l'allié ayant le moins de PV |
| Renfort structurel | 2 | Ingénieur | vert | — | Fin de renfort : donne définitivement +1/+1 à un allié aléatoire |
| Traité de désarmement | 2 | Diplomate | bleu | — | Début de combat : retire À distance à un ennemi aléatoire qui l'a |
| Trousse de soin | 2 | Médecin | vert | — | Assaut : soigne 3 PV à un allié blessé aléatoire |
| Amplificateur tactique | 3 | Ingénieur | vert | — | Fin de combat : donne définitivement +2/+3 à un allié aléatoire |
| Boussole stellaire | 3 | Explorateur | bleu | — | Propose 1 équipement de plus lors d'un renfort d'équipement (7 au maximum) |
| Interface de vol neural | 3 | Pilote | bleu | — | Les dégâts subis inférieurs à 5 sont annulés |
| Mandat de protection | 3 | Diplomate | bleu | — | Début de combat : donne un Bouclier à l'allié ayant le moins de PV |
| Protocole Lazare | 3 | Roboticien | vert | — | Si un drone est présent quand un allié (non drone) devrait mourir, détruit le drone et rend tous ses PV à cet allié |
| Sérum antivenin | 3 | Médecin | vert | — | Immunisé au Poison |
| Sonde neurale | 3 | Renseignement | rouge | — | Début de combat : retire le Bouclier d'un ennemi, si possible |
| Surcadenceur cellulaire | 3 | Sécurité | rouge | — | Début de combat : double les PV de l'allié ayant le plus de PV |
| Tourelle automatique | 3 | Artilleur | rouge | — | Assaut : inflige 3 fois 2 dégâts à la cible |
| Aura de soin | 4 | Médecin | vert | — | Aura : augmente de 3 tous les soins des alliés |
| Bouclier de secours | 4 | Sécurité | rouge | — | Lorsque ce serviteur perd son Bouclier, le régénère (une fois par combat) |
| Médaille du mérite | 4 | Diplomate | bleu | — | Fin de combat : donne définitivement +2/+0 à tous les alliés survivants, lui compris |
| Module d'acquisition | 4 | Roboticien | vert | — | Les drones invoqués par ce serviteur ont À distance et +2/+2 |
| Plan de vol | 4 | Pilote | bleu | — | Début de combat : +2 ATQ à tous les alliés par allié affecté au Pilote |
| Rayon vengeur | 4 | Artilleur | rouge | — | Début de combat : 6 dégâts à l'ennemi le plus à droite |
| Renfort matricielle | 4 | Ingénieur | vert | — | Fin de renfort : donne définitivement +2/+4 à ce serviteur et aux alliés adjacents |
| Réseau d'informateurs | 4 | Renseignement | rouge | — | Début de combat : +2/+2 à tous les alliés par allié affecté au Renseignement |
| Sonde d'assimilation | 4 | Explorateur | bleu | — | Fin de combat : propose de copier le pouvoir d'un ennemi aléatoire (une fois par partie) |
| Balise de recrutement | 5 | Explorateur | bleu | — | Le premier choix de serviteur de chaque renfort propose toujours un serviteur du niveau supérieur (un par exemplaire) |
| Chronoscope | 5 | Pilote | bleu | — | Fin de combat : donne définitivement +1/+1 à tous les alliés survivants, lui compris |
| Contre-mesures adaptatives | 5 | Renseignement | rouge | — | La première fois qu'un allié subit des dégâts, réduit ces dégâts à 1 |
| Défibrillateur portatif | 5 | Médecin | vert | — | La première fois que ce serviteur devrait mourir, il survit avec 1 PV (une fois par combat) |
| Fusil de précision | 5 | Artilleur | rouge | À distance | Rate sa cible une fois sur 3 (l'attaque n'inflige alors aucun dégât) |
| Fusil tactique | 5 | Sécurité | rouge | À distance | — |
| Module de renforcement d'essaim | 5 | Roboticien | vert | — | Chaque fois qu'un drone allié attaque, il gagne +5 ATQ pendant ce combat |
| Sceau pacificateur | 5 | Diplomate | bleu | — | Début de combat : le serviteur ennemi avec le plus d'ATQ ne peut pas attaquer lors de sa première occasion |
| Synchroniseur de puissance | 5 | Ingénieur | vert | — | Chaque fois que ce serviteur gagne des PV, il gagne autant d'ATQ |
| Amplificateur d'essaim | 6 | Roboticien | vert | — | Les drones invoqués par vos alliés ont +6/+6 |
| Aura régénératrice | 6 | Médecin | vert | — | Assaut : soigne 5 PV à tous les alliés |
| Balise de Voronoï | 6 | Explorateur | bleu | — | Début de combat : double les PV de l'allié ayant le plus de PV |
| Bombardement orbital | 6 | Artilleur | rouge | — | Début de combat : 4 dégâts à tous les ennemis |
| Brouilleur synaptique | 6 | Renseignement | rouge | — | Début de combat : le serviteur ennemi avec le plus d'ATQ ne peut pas riposter à la première attaque qu'il subit |
| Champ de confinement | 6 | Sécurité | rouge | — | Début de combat : +8 PV à tous les alliés |
| Manœuvre d'interception | 6 | Pilote | bleu | — | Début de combat : inflige à l'ennemi ayant le plus de PV autant de dégâts que le total des niveaux de vos Pilotes alliés |
| Médaillon des mille voix | 6 | Diplomate | bleu | — | Début de combat : +1/+1 à tous les alliés par type différent dans votre équipe |
| Protocole Oméga | 6 | Ingénieur | vert | — | Fin de renfort : donne définitivement +2/+2 à tous les alliés |

## Héros

| Nom | Types | PV | Mot-clé | Pouvoir |
|---|---|---|---|---|
| Capitaine Rol Vex | Elk / Pilote | 30 | Provocation | Lorsqu'un allié perd son Bouclier : le régénère (une fois par combat) |
| Flam'Gruk | Dwork / Explorateur | 28 | — | Début de renfort : lance un datacube : -3, -1, 1, 2, 2, 3 Datacrons |
| TE-5T | Droïde / Ingénieur | 29 | — | Salle 5 : ajoute à votre main un serviteur au hasard de type Droïde, de n'importe quel niveau |
| Brokk'Ric | Dwork / Artilleur | 33 | — | Début de combat : place une bombe sur l'ennemi le plus à droite. Cette bombe inflige autant de dégâts que le niveau de renfort |
| Reyes | Ryskan / Roboticien | 32 | — | Tous les 2 renforts : ajoute à votre main un équipement au hasard de type Roboticien, de n'importe quel niveau |
| Amber | Elk / Renseignement | 28 | — | Début de la mission : découvre un serviteur de niveau 6 ; il arrive en jeu quand 60 Datacrons ont été utilisés |
| Y5-A9 | Droïde / Médecin | 30 | — | Actif (une fois par renfort) : donne Renaissance à un serviteur jusqu'au prochain renfort |
| Sulseye | Ryskan / Diplomate | 30 | — | Actif : pour 3 Datacrons, crée la dernière copie d'un serviteur dont vous avez deux exemplaires pour les fusionner, une fois par partie |
| Wave | Sorvane / Diplomate | 30 | — | Actif (une fois par renfort) : déclenche le cri de guerre de l'allié ciblé |
| Alix | Sorvane / Sécurité | 30 | — | Début de combat : donne Fureur à un allié aléatoire |

## Boss

| Nom | Types | PV | Pouvoir | Serviteur permanent (ATQ/PV) |
|---|---|---|---|---|
| Boss Elk | Elk | 25 | — | 1/3 |
| Boss Dwork | Dwork | 25 | — | 1/3 |
| Boss Droïde | Droïde | 25 | — | 1/3 |
| Boss Sorvane | Sorvane | 25 | — | 1/3 |
| Boss Ryskan | Ryskan | 25 | — | 1/3 |
| Boss Pilote | Pilote | 25 | — | 1/3 |
| Boss Ingénieur | Ingénieur | 25 | — | 1/3 |
| Boss Médecin | Médecin | 25 | — | 1/3 |
| Boss Sécurité | Sécurité | 25 | — | 1/3 |
| Boss Explorateur | Explorateur | 25 | — | 1/3 |
| Boss Artilleur | Artilleur | 25 | — | 1/3 |
| Boss Renseignement | Renseignement | 25 | — | 1/3 |
| Boss Roboticien | Roboticien | 25 | — | 1/3 |
| Boss Diplomate | Diplomate | 25 | — | 1/3 |
| L'Oracle Souterrain | Sorvane | 25 | Écho : chaque fois qu'un de ses serviteurs attaque, il gagne +1 ATQ jusqu'à la fin du combat. | 1/3 |
| Maître-Forgeron Grumm | Dwork | 25 | Blindage : au début de chaque combat, ses serviteurs gagnent +0/+3 PV. | 1/3 |
| DR-1O | Droïde + Roboticien | 25 | La première fois qu'un Droïde allié devrait mourir, il survit avec 1 PV. | — |
| Erky | Sorvane + Ingénieur | 28 | Chaque fois qu'un serviteur allié meurt, donne +X/+X à un autre serviteur allié aléatoire, X étant le niveau de renfort d'Erky. | — |
| Cyro | Sorvane + Sécurité | 25 | — | — |
| Mara | Sorvane + Renseignement | 25 | Au début du combat, l'ennemi ayant le plus d'ATQ tombe à 1 ATQ, et celui ayant le plus de PV tombe à 1 PV (effets indépendants). | — |
| Veylor | Elk + Diplomate | 25 | Héritage dynastique : chaque fois qu'un serviteur allié meurt, un Garde allié aléatoire et l'Héritier gagnent définitivement +1/+1. | — |
| San'Dak | Dwork + Explorateur | 25 | Expédition légendaire : au début de chaque combat, chaque allié gagne +1/+1 par espèce différente parmi ses alliés. | 3/6 |

## Donjons

| Nom | Types fixes | Types tirés | Boss | PV (total) |
|---|---|---|---|---|
| Nhavaris | Sorvane + Sécurité | Droïde ou Elk ou Dwork, Ingénieur | boss du type tiré n° 1 (parmi DR-1O, Veylor, San'Dak) ; boss du type tiré n° 2 (parmi Erky) ; Mara ; Cyro | 103 |
| Le Brasier | Dwork + Artilleur | species, assignment | boss du type tiré n° 1 (parmi Veylor, Boss Dwork, Boss Droïde, Boss Sorvane, Boss Ryskan) ; boss du type tiré n° 2 (parmi Boss Pilote, Boss Ingénieur, Boss Médecin, Boss Sécurité, Boss Explorateur, Boss Artilleur, Boss Renseignement, Boss Roboticien, Boss Diplomate) ; Maître-Forgeron Grumm ; Boss Artilleur | 100 |
