# Anciennes idées

Synthèse des réflexions de design menées sur le projet : concept général, système de combat, compétences, et enseignements tirés d'autres jeux.

> Rien n'est définitivement tranché. Ce qui est noté « acté » peut encore être remis en cause.

---

## 1. Concept général

Gestion d'une **guilde** qui explore des **donjons de groupe** et des **donjons de raid**, en contrôlant l'ensemble des héros de la guilde. Univers : RPG space opera.

## 2. Boucle de jeu et progression

### Attachement aux personnages

- Les joueurs doivent s'attacher à chaque personnage et pouvoir le faire évoluer à leur guise.
- Chaque personnage est lié à une histoire précise. Une **auberge** pourrait servir de hub, et les donjons deviendraient une façon d'accomplir des quêtes pour ces personnages.
- À chaque montée de niveau, le joueur choisit parmi plusieurs options aléatoires : nouveau talent passif ou nouveau talent actif.
- Pour limiter le hasard : un système d'apprentissage actif qui favorise l'apparition de certains talents, ou un système de faction.
- Les personnages ont des compétences de combat, mais aussi de survie et d'artisanat, sans obliger à choisir systématiquement entre les deux.

### Artisanat

- L'artisanat permet de créer les objets les plus puissants du jeu.
- Les compétences nécessaires (récolte, raffinage, fabrication) sont liées aux héros.
- Système de craft avec affixes et suffixes à sélectionner, comme dans Path of Exile.
- Couplé à un système de chasse de gemmes, dont le nombre de chasses pourrait être lié à un autre paramètre, comme la rareté de l'objet.

---

## 3. Système de combat

### 3.1 Ce qui est acté

#### Éléments et dominance

- Cinq éléments sur une **roue de dominance** : `Eau → Feu → Métal → Bio → Terre → Eau` (Eau bat Feu, Feu bat Métal, etc.).
- Un élément qui bat celui de la cible inflige plus de dégâts.

#### Principe : pas de liens entre héros

- Aucun bonus mutuel entre héros : pas de factions ou de groupes qui donnent des bonus, pas d'aura de chef qui renforce une catégorie, pas d'effet « si tel héros est dans l'équipe, alors… ».
- Objectif : ne jamais imposer de combos d'équipe comme cela peut-etre le cas dans le jeu Star Wars Heroes of the Galaxy

#### Héros

- Chaque héros a un **élément affilié** 

#### Inchangé par rapport au concept initial

Équipement, gemmes et gemmes secondaires, armes et leurs 160 gemmes, butin, exploration.

### 3.2 Piste en exploration : les stats élémentaires

**Idée** : remplacer les six stats primaires (Vigueur, Puissance, Endurance, Réflexes, Affinité, Résilience, avec leur table d'effets forts et légers) par **cinq stats élémentaires** : Eau, Feu, Métal, Bio, Terre. Ce sont elles qui progressent. L'idée est jugée très bonne en soi.

#### Rôles d'une stat élémentaire

1. **Puissance** : la stat Feu donne la force des sorts Feu.
2. **Défense par la roue** : la stat Feu protège contre le Métal, l'élément que le Feu bat.
3. **Effet thématique** propre à chaque élément. Le principe est validé, mais les effets proposés sont à refaire.
   - Proposition rejetée : Eau = force et résistance à la manipulation de jauge, Feu = critique, Métal = réduction des dégâts, Bio = soins donnés et reçus, Terre = Vie.
   - Retour explicite : le Bio ne doit **pas** toucher les soins reçus.

Les deux premiers rôles découlent d'une seule règle (la roue) et remplacent le système « effet fort / effet léger ». La question de la répartition 3+3 / 4+2 / 2+2+2 disparaîtrait donc si cette piste est retenue.

#### Sorts à deux éléments

- L'**élément principal** définit ce que fait le sort (Bio = soin, par exemple). Sa puissance vient de la stat du lanceur dans cet élément.
- L'**élément secondaire** (la « résonance ») rend le sort plus efficace sur une cible **affiliée** à cet élément.
- Exemple : un soin Bio + Feu soigne mieux un héros affilié Feu.
- C'est ce qui justifie de garder un élément affilié par héros.

#### Ce qu'un héros serait dans ce modèle

- Une **arme** : rôle et sort signature.
- Un **élément affilié** : son identité, et la cible de la résonance.
- Un **profil sur les cinq stats élémentaires**, qui progresse. Les courbes de progression pourraient varier selon l'élément (affinités naturelles).

#### Ce qui disparaîtrait ou changerait

- Les six stats primaires et leur table.
- La distinction Attaque/Défense physique et Attaque/Défense élémentaire.
- La Vitesse et une base de Vie resteraient probablement hors des éléments (niveau, arme, armure), pour éviter qu'un élément devienne obligatoire.

### 3.3 Questions ouvertes

#### Sur les stats élémentaires

1. **Effets thématiques** des cinq éléments : à refaire entièrement. Ils doivent rester plus légers que les deux rôles de la roue et avoir une valeur comparable entre eux.
2. **Dominance subie** : se calcule-t-elle sur l'**élément affilié** de la cible (simple) ou sur ses **stats défensives** ? Les deux à la fois feraient peut-être double emploi.
3. **Sorts offensifs à deux éléments** : que fait l'élément secondaire ?
   - « chasseur » : plus de dégâts contre une cible affiliée à cet élément ;
   - double dominance : on vérifie la roue avec les deux éléments du sort.
4. **Attaque de base** : neutre, ou basée sur la meilleure stat du héros ?
5. **Vitesse et Vie** : hors des éléments, ou en partie dans un élément ?
6. **Bonus « même élément » (~10 %)** : on le garde avec l'élément affilié, ou la stat suffit-elle ?

#### Sur le combat et les principes

7. **Frontière des synergies** : faut-il autoriser les interactions qui passent par l'*état du combat* (« +30 % de dégâts sur une cible étourdie », dont profite n'importe quel héros capable d'étourdir) ? Le lien par *identité* (« +30 % si un Pilote est présent ») est clairement exclu.
   Un soin Bio + Feu pousse un peu vers les équipes Feu. C'est acceptable parce que c'est **la gemme qui s'adapte à l'équipe**, pas l'équipe imposée par un héros, à condition que des gemmes de résonance existent pour chaque élément.
8. **Risque que la vitesse domine** : agir plus souvent démultiplie tout le reste. Pistes : rendements décroissants, fourchette de vitesse étroite entre héros.
9. **Équilibrage de la manipulation de jauge** : ampleur des avances et reculs, résistance éventuelle, empêcher qu'un camp ne laisse jamais jouer l'autre.
10. **Nom** : « Initiative » ou « Vitesse ».

#### Questions plus anciennes, toujours ouvertes

- Soins et usure : comment empêcher un soigneur de tout régénérer après chaque combat.
- Gemmes inutilisables : recyclage hors du donjon.
- Noms définitifs des emplacements d'armure.
- Armes au-delà des huit premières, gemmes rares uniques.
- Taille de la réserve de héros recrutables.
- Donjons à élément dominant.
- Tous les chiffres : durées de recharge, bonus de dominance, nombre de chasses par poids, charges du médikit.

---

## 4. Catalogue de compétences

### Compétences actives

- Attaque 1 ennemi / X ennemis / tous les ennemis
- Attaque 1 ennemi X fois / X ennemis X fois / tous les ennemis X fois
- Attaque X fois au hasard
- Attaque avec % de chance de provoquer X
- Chaque attaque a % de chance de provoquer X
- Applique le débuff X
- Soigne un allié d'un % d'une caractéristique du héros
- Soigne les alliés d'un % d'une caractéristique du champion

#### Effets associés à une compétence active

- Les ennemis tués par cette compétence ne peuvent pas être réanimés
- Disponible seulement si la cible a le débuff X
- Applique le débuff X
- Chaque attaque a % de chance de provoquer X
- % de chance d'augmenter la durée de X sur la cible
- % de chance d'appliquer le débuff X
- Place un buff sur les alliés dont la vie est pleine, ou dont elle ne l'est pas
- Place un soin sur la durée sur les alliés dont la vie n'est pas pleine
- Chaque coup critique a % de chance de réduire le temps de recharge de X
- Dégâts augmentés de % pour chaque débuff (ou chaque buff) sur l'ennemi
- Supprime un débuff sur le héros
- Soigne d'un % des dommages infligés
- Augmente la vitesse au prochain tour
- Échange les points de vie avec un allié ou un ennemi
- % de chance d'effectuer l'action (à confirmer)

### Auras

Les auras pourraient exister au niveau du groupe de donjon ou du groupe de raid, avec une distinction claire entre les deux : certains héros n'auraient qu'une aura de groupe, d'autres qu'une aura de raid.

- Augmente la caractéristique ? du héros de %
- Augmente la caractéristique ? des héros de %
- Augmente la caractéristique ? des alliés de %

> Attention : les auras de groupe sont à confronter au principe « pas de liens entre héros » (section 3.1).

### Compétences passives

- % de chance d'effectuer l'action ?

### Buffs

- Soigne de % du maximum de points de vie au début du tour
- En cas de mort, revient à la vie avec % de points de vie
- Augmente une caractéristique de %

### Débuffs

- Empêche l'usage de tout skill autre que le skill par défaut pendant la durée du débuff
- Empêche toutes les actions pendant X tours
- Quand le héros utilise un skill, % de chance que celui-ci échoue
- Baisse une caractéristique de %
- Ce débuff ne peut pas être résisté (propriété possible)

---

## 5. Enseignements d'autres jeux

### Idle Champions of the Forgotten Realms

**À retenir**

- Amélioration progressive mais constante, typique d'un idle game.
- Coffres débloquables avec des codes distribués via Twitch ou la lettre d'information.
- Portes temporelles pour débloquer des héros, et fragments de portes temporelles pour débloquer assez vite un héros qui nous fait envie.
- Familiers qui cliquent : difficiles à obtenir, et plus on en possède, plus le jeu avance vite. Pas directement transposable.

**À éviter**

- L'histoire est prioritaire sur le reste et bloque l'interface quand on veut jouer.
- Choix d'une amélioration de pouvoir en urgence, sans rappel du fonctionnement du héros, d'autant plus pénible avec beaucoup de héros aux multiples pouvoirs.
- Synergies de champions selon leur emplacement, leur positionnement, leur alignement ou leur sexe.

### Raid Shadow Legends

**À retenir**

- Le graphisme des personnages.
- Les vidéos YouTube qui racontent l'histoire de certains héros.

**À éviter**

- Devoir faire monter des héros en niveau pour les sacrifier ensuite et en améliorer d'autres.
- Un système de missions avec une foule d'objectifs ridicules pour une seule vraie récompense à la fin.
- Des récompenses gratuites dispersées dans d'innombrables interfaces.
- Pas assez de place pour stocker ses héros dès les premières heures.
- Acquisition des héros entièrement aléatoire, qui rend difficile de bâtir les équipes souhaitées.
- Objets trop complexes entre rareté, nombre d'étoiles et attributs (un rare deux étoiles vaut-il mieux qu'un commun quatre étoiles ?).
