# Éditeur de cartes (site/editor.html, serveur local uniquement)

Un onglet par catégorie (Serviteurs, Équipements, Lieutenants, Donjons). La page d'une carte est un formulaire en blocs numérotés, avec un aperçu de la carte à droite qui suit chaque modification (nom, statistiques, pouvoirs, image, cadrage), comme la page d'un pouvoir.

| Catégorie | Blocs |
|---|---|
| Serviteur | 1 Identité (nom fr/en) · 2 Caractéristiques (rang, ATQ, PV, types, mots-clés) · 3 Pouvoirs (liste) · 4 Image et cadrage · 5 Enregistrer |
| Équipement | idem ; 2 contient le type unique, le mot-clé donné et l'amélioration des drones du porteur (`mod`) ; les descriptions sont celles de la variante « au porteur » |
| Lieutenant | idem ; un seul pouvoir ; case « mis de côté » (`reserve`) |
| Donjon | 1 Identité · 2 Type et mini-boss · 3 Boss (nom, description, PV, pouvoir) · 4 Enregistrer. Pas d'image : le décor est dessiné dans `prototype/svg.js` |

- Chaque ligne de pouvoir montre sa description telle que le joueur la lit et renvoie vers son modèle (onglet Pouvoirs).
- Les textes d'une carte (nom, nom et description du Boss) sont enregistrés avec elle dans `data/i18n/`. Le français est obligatoire.
- « Retirer du jeu » inscrit la carte dans `data/retired.json`.

## Images et cadrage

- Une image est rangée sous `prototype/images/<catégorie>/<identifiant>.webp`. Le bouton d'envoi accepte tout format d'image : le serveur local la convertit en webp (Pillow, qualité 90) et remplace l'ancienne. Une nouvelle carte doit d'abord être enregistrée (l'image porte l'identifiant de la carte).
- Le cadrage est le champ `art` de la carte, dans `data/<catégorie>.json` : `{ "align": "xMidYMin", "whole": true }`. Seul ce qui diffère du défaut est stocké.
  - `align` : un des neuf ancrages SVG (`xMinYMin` à `xMaxYMax`, défaut `xMidYMid`), choisi sur une grille 3 × 3. Quand l'image dépasse du cadre, la partie visible est celle du côté choisi.
  - `whole` : l'image est montrée entière, réduite pour tenir dans le cadre ; le reste du cadre est rempli par la même image assombrie.
- `tools/index-images.js` écrit `prototype/images.js` : la liste des images (`AW_IMAGES`) et leur cadrage (`AW_ART`), lus par `prototype/svg.js`. Le serveur local le relance après chaque enregistrement de carte ou d'image ; à la main : `node tools/index-images.js`. `tools/check-editor.js` vérifie que le fichier est à jour.
- Le cadre d'illustration fait 194 × 100 (environ 2:1) sur les cartes, 147 × 184 sur la carte paysage d'un lieutenant en jeu.

## Fichiers dérivés

Après chaque enregistrement (carte, pouvoir, texte, règles, image), le serveur local lance `tools/generate-all.js --sans-simulation` (un seul passage pour une série d'enregistrements rapprochés). Le tableau `documentation/cartes.md` et les pages `site/servants.html`, `equipment.html`, `lieutenants.html` suivent donc les données. Une ligne sous le formulaire indique « Régénération des pages… » puis le résultat, ou l'erreur éventuelle ; une erreur de régénération n'annule jamais l'enregistrement. Il n'y a pas de hook git.

## Empreinte des tests d'équilibrage

`tools/history.js` calcule l'empreinte du jeu à partir de `data.js`, `engine.js` et des fichiers `data/*.json` du jeu (cartes, pouvoirs, règles, cartes retirées). Les textes et le cadrage des images (`art`) n'en font pas partie : les changer ne rend pas deux tests incomparables.
