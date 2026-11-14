# Brief : modifications apportées aux cadres du kit V9 lors de l'intégration

Le kit V9 est intégré dans le jeu (`ui.cards` de `game.json`). Nous avons modifié les cadres pour deux raisons : les cartes n'étaient pas assez grandes pour être lisibles, et les chasses devaient devenir dynamiques. Merci d'en tenir compte pour les prochaines propositions.

## 1. Format : la carte est plus haute

- Le kit livrait des cartes à ratio **4/3** (hauteur = 1,333 × largeur ; `cards.css` utilise `height: calc(var(--w) * 1.333)`).
- Nous utilisons maintenant **800 × 1320 px, soit un ratio de 1,65 (330/200)**. C'est la hauteur de nos anciennes cartes, que le plateau de jeu impose.
- **Seul le panneau de texte a été allongé.** Il s'agit de la partie unie entre l'illustration et les plaques d'attaque et de PV. Nous avons étiré une bande uniforme d'environ 100 px, de sorte qu'il n'y a pas de raccord visible.
- Le haut du cadre (titre, fenêtre d'illustration, médaillons de types et de niveau) et le bas (plaques ATQ/PV) sont inchangés. Ils sont simplement décalés vers le bas.
- Cela vaut pour les 4 cadres : héros, serviteur, équipement orange et équipement vert.
- **À faire pour les prochains cadres :** livrer directement en 1,65 (800 × 1320), avec un grand panneau de pouvoirs uni, sans éléments décoratifs qui sortiraient de l'étirement. Ce panneau passe d'environ 16 % de la hauteur à 33-35 %.

## 2. Chasses du serviteur : effacées de l'image

- Le cadre serviteur avait ses 3 chasses peintes en bleu, vert et rouge. Elles ne pouvaient pas suivre les données de la carte (0 à 3 chasses, n'importe quelles couleurs, vides ou occupées, cliquables).
- Nous les avons **effacées de l'image** (`frames/servant.webp`). Le haut des chasses dans la fenêtre est rendu transparent, et la barre de métal qu'elles cachaient a été reconstruite en copiant une colonne de métal voisine.
- Le jeu dessine maintenant les chasses par-dessus, en boutons.
- **À faire pour les prochains cadres :** livrer un cadre serviteur **sans aucune chasse peinte**, avec une barre de métal continue à cet endroit.

## 3. Couleurs des équipements : rotation de teinte

- Seuls l'orange et le vert existent comme images.
- Le **bleu** (+180°) et le **rouge** (−25°) sont obtenus par rotation de teinte de l'orange.
- La variante **dorée** (fusion, serviteurs) est une rotation de −150° du cadre serviteur. Les médaillons peints (épée, cœur) tournent donc aussi de teinte.
- **À faire pour les prochains cadres :** de vrais cadres bleu et rouge sont bienvenus. Ils remplaceraient la rotation, sans changement de code, juste en modifiant les données.

## 4. Zones placées en pourcentage de la carte (largeur 300, hauteur 495)

| Zone | Héros | Serviteur | Équipement |
|---|---|---|---|
| Illustration (x, y, l, h) | 11,8 · 16,6 · 76,4 · 31,9 | 8,6 · 13,6 · 83,3 · 36,8 | 11,5 · 14,1 · 77 · 35,6 |
| Titre | 19 · 9,2 · 62 · 5,3 | 17 · 7,7 · 66 · 4,5 | 17 · 7,8 · 66 · 4,9 |
| Texte des pouvoirs | 14,5 · 54,6 · 71 · 34,9 | 11,5 · 52,7 · 77 · 33,7 | 14 · 51,3 · 72 · 32,5 |
| Statistiques | PV au centre, à y = 51 % | ATQ à x = 26,5 %, PV à x = 83 %, y = 91,7 % | ATQ à x = 22 %, PV à x = 78 %, y = 87,5 % |

- **Niveau du serviteur :** l'hexagone du cadre avait 3 chevrons peints. Le jeu le **recouvre** (`cover`) et dessine les chevrons du bon niveau, de 1 à 6.
- **Chasses du serviteur :** centrées en x = 49,7 %, y = 49,2 %, avec un écart de 15,7 % entre deux chasses.
- **Types :** de petits carrés d'icônes empilés à gauche, sous le titre. Le nom du type est en info-bulle, il n'y a plus de bandeau de noms.

## 5. Ce que le jeu dessine par-dessus les cadres

- les chiffres et les glyphes ATQ/PV ;
- le texte des pouvoirs, centré, à la plus grande taille qui tient (jusqu'à 10 unités de carte) ;
- les chasses ;
- le halo du Bouclier ;
- l'icône de bombe.

**Les cadres ne doivent donc rien contenir de ces éléments** : ni texte, ni chiffre, ni chasse, ni halo.

## 6. Point faible à corriger en priorité : la lisibilité

Sur le plateau, les cartes font environ 105 à 140 px de large. Le texte des pouvoirs y est à environ 7-8 px, ce qui est trop petit. Pour la suite, il faudrait :

- un panneau de texte plus grand, ou une carte plus compacte avec moins de décor ;
- des chiffres ATQ/PV plus gros.
