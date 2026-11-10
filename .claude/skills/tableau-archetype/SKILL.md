---
name: tableau-archetype
description: Affiche, pour un archétype donné (Pilote, Ingénieur, Médecin, Sécurité, Explorateur, Artilleur, Renseignement, Roboticien, Diplomate), un tableau à deux colonnes « Nom | Pouvoir » des pistes d'équipements, pour les visualiser.
argument-hint: <archétype>
---

# Tableau nom / pouvoir d'un archétype

Argument : `$ARGUMENTS` = le nom d'un archétype (insensible à la casse et aux accents). S'il est absent ou inconnu, liste les 9 archétypes valides et arrête-toi.

## Source

Fichier `documentation/idees/vrac.md`, deux sections :

1. « Noms d'équipements par archétype (pistes) » : tableau avec une ligne par archétype, une colonne par rang (R1 à R6), deux noms séparés par « ; » dans chaque cellule.
2. « Pouvoirs d'équipement par archétype (pistes) » : une sous-section `### <Archétype>` avec un tableau Rang | Pouvoir, deux pouvoirs par rang (parfois un seul : ne rien inventer).

Lis ces sections dans le fichier (ne te fie pas à la mémoire : elles peuvent avoir changé). Ne modifie aucun fichier.

## Sortie

Un tableau Markdown à **deux colonnes seulement** :

| Nom | Pouvoir |
|---|---|
| **Nom** (R1) | texte du pouvoir, repris tel quel |

- Une ligne par pouvoir, dans l'ordre des rangs. Rappelle le rang entre parenthèses après le nom.
- Appariement nom/pouvoir : dans l'ordre à l'intérieur d'un rang (1er nom ↔ 1er pouvoir, 2e nom ↔ 2e pouvoir). Si un rang a moins de pouvoirs que de noms, n'affiche que les noms appariés.
- Avant le tableau, une phrase indiquant la source (`documentation/idees/vrac.md`) et précisant que le fichier ne dit pas quel nom va avec quel pouvoir, donc que l'appariement est à confirmer.
- Après le tableau, une phrase proposant un autre appariement ou un autre archétype.
- Texte en français, sans rien ajouter d'autre.
