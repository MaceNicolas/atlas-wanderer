# Reprise — base de 135 cartes serviteurs

Créée le 19 novembre 2026. Chantier : équilibrer le catalogue de serviteurs sur **5 espèces × 9 affectations**, avec une base de départ de 90 cartes qui monte à 135 par découverte en cours de partie.

## Objectif décidé

- **135 cartes** = chaque case (espèce × affectation) en **3 exemplaires** : 27 cartes par espèce, 15 par affectation.
- **90 cartes au départ** = 2 exemplaires par case (18 par espèce, 10 par affectation). Les 45 autres se **découvrent** au fil de la partie.
- Le joueur doit pouvoir **désactiver des cartes** pour ses parties (choix libre). Pour garder l'équilibre, les cartes retirées doivent contenir 9 par espèce et 5 par affectation (par exemple un exemplaire par case).
- Règle de niveau : **au plus une carte de niveau 7 par affectation** (9 au maximum). 9 n'est pas divisible par 5 : les niveaux 7 se répartissent 2, 2, 2, 2, 1 entre les espèces, c'est voulu.
- Tout passe par des données (règle modulaire absolue) : le filtre « actif / découverte » doit être un champ de carte lu par le moteur.

## État constaté (19 novembre 2026)

Source : `data/atlas-wanderer/servants.json`. 94 entrées, dont **1 jeton** (« Drone » `77adf0ba…`, champ `token`, sans type) à **exclure des comptes**. Reste **93 serviteurs**.

- Cases à 3 (7) : dwork-artilleur, elk-diplomate, ryskan-roboticien, sorvane-artilleur, sorvane-explorateur, sorvane-renseignement, sorvane-pilote.
- Cases à 1 (4) : dwork-renseignement, elk-artilleur, ryskan-artilleur, sorvane-roboticien.
- Toutes les autres cases (34) sont à 2.
- Espèces : dwork 18, ryskan 18, droid 18, elk 18, sorvane 21.
- Affectations : 10 chacune, sauf pilote, explorateur et diplomate à 11.
- Niveau 7 : 5 cartes, une par espèce, mais **le diplomate en a 2** (`612e87f7…` elk et `5ef3ed94…` dwork) : à corriger.
- Il y a des cases à 3 : ce n'est pas un problème, la base de 135 vise 3 partout.

## Modification de carte existante à faire

- `612e87f7-524a-4e9d-ab56-fd717ae9856b` (elk, diplomate) : niveau 7 → 6. Le diplomate dwork `5ef3ed94…` garde le niveau 7.

## 42 cartes à créer (état : à créer, rien de fait)

Calculées pour obtenir 15 par affectation, 27 par espèce, 3 par case, un seul niveau 7 par affectation et des niveaux 1 à 6 d'environ 21 cartes chacun. Les niveaux sont modifiables par échange au sein d'une même affectation.

| Race | Affectation | Niveau |
|---|---|---|
| dwork | Pilote | 5 |
| ryskan | Pilote | 7 |
| droid | Pilote | 3 |
| elk | Pilote | 6 |
| dwork | Ingénieur | 3 |
| ryskan | Ingénieur | 1 |
| droid | Ingénieur | 7 |
| elk | Ingénieur | 4 |
| sorvane | Ingénieur | 6 |
| dwork | Médecin | 7 |
| ryskan | Médecin | 4 |
| droid | Médecin | 2 |
| elk | Médecin | 1 |
| sorvane | Médecin | 3 |
| dwork | Sécurité | 1 |
| ryskan | Sécurité | 5 |
| droid | Sécurité | 3 |
| elk | Sécurité | 7 |
| sorvane | Sécurité | 5 |
| dwork | Explorateur | 6 |
| ryskan | Explorateur | 1 |
| droid | Explorateur | 1 |
| elk | Explorateur | 4 |
| ryskan | Artilleur | 1 |
| ryskan | Artilleur | 2 |
| droid | Artilleur | 6 |
| elk | Artilleur | 3 |
| elk | Artilleur | 7 |
| dwork | Renseignement | 1 |
| dwork | Renseignement | 5 |
| ryskan | Renseignement | 3 |
| droid | Renseignement | 6 |
| elk | Renseignement | 4 |
| dwork | Roboticien | 4 |
| droid | Roboticien | 3 |
| elk | Roboticien | 2 |
| sorvane | Roboticien | 1 |
| sorvane | Roboticien | 6 |
| dwork | Diplomate | 4 |
| ryskan | Diplomate | 2 |
| droid | Diplomate | 5 |
| sorvane | Diplomate | 1 |

Résultat attendu (135 cartes) : niveaux 1 à 6 globaux 21, 21, 21, 22, 20, 21 ; niveau 7 : 9 cartes (dwork 2, ryskan 2, droid 2, elk 2, sorvane 1).

## Points ouverts

1. **Découpage 90 / 45** : quelles cartes sont actives au départ et lesquelles se découvrent. Contrainte : 2 par case actives au départ, donc 1 par case à découvrir. Proposition : garder les niveaux 7 dans la partie à découvrir. À calculer.
2. **Mécanisme de découverte** : à quel moment, par quoi (salle, boss, niveau de renfort ?). Lien possible avec `discoverCard` (voir `REPRISE.md`).
3. **Désactivation au choix** : écran de choix ? Lien avec l'écran de sélection de mods prévu (spec §21). Il faut un champ de carte (actif, découverte) lu par le moteur.
4. **Autres affectations de 3 cartes** : les 7 cartes en trop actuelles (cases à 3) servent la base de 135 telle quelle ; ne pas les réaffecter.
5. Vérifier si les **équipements** (9 affectations × 6 niveaux = 54) suivent la même logique : hors périmètre de cette reprise pour l'instant.

## Ordre de travail suggéré

1. Corriger le diplomate elk (niveau 6).
2. Écrire `tools/check-balance.js` (ou équivalent) : exclut les jetons, affiche les cases, les totaux par espèce et par affectation, les niveaux 7 en trop et la répartition des niveaux.
3. Créer les 42 cartes (textes fr + en dès la v1, images, pouvoirs), puis lancer `tools/generate-all.js`.
4. Ajouter le champ de découverte / activation et le découpage 90 / 45.
5. Vérifier avec le script, puis `tools/check-site.js` et les tests.
