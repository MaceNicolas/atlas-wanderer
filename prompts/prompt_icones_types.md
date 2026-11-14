# Prompt : icônes des types d'Atlas Wanderer (SVG)

Tu es illustrateur d'icônes vectorielles pour un jeu de cartes de space opera, **Atlas Wanderer**. Le jeu compte **15 types** : 6 **espèces** et 9 **affectations** (spécialités d'équipage d'un vaisseau d'exploration, dans l'esprit de *Star Trek* avec une touche de space opera plus aventureuse). Chaque carte de serviteur a une espèce et une affectation, et chaque type est représenté par une petite icône.

Ci-dessous : les icônes actuelles (une version de travail) et leurs contraintes techniques. **Propose un jeu complet de 15 icônes améliorées**, cohérent d'un bout à l'autre, qui respecte exactement le format décrit.

## 1. Où et comment les icônes sont affichées

- Elles s'affichent **petites** : de 12 à 24 px de côté sur les cartes (pastilles de type), jusqu'à 60 px au maximum sur les écrans de choix. **Elles doivent être reconnaissables à 12 px**, donc peu de détails, des formes franches, un seul motif central.
- Fond sombre : les cartes sont bleu nuit (`#151a26`, fond profond `#0e121b`). Les icônes doivent rester lisibles sur ce fond et sur une pastille teintée de leur couleur.
- Chaque icône est un **fragment SVG** (pas de balise `<svg>`) dessiné dans un repère **24 × 24** (le jeu l'enveloppe dans `<svg viewBox="0 0 24 24">` et le met à l'échelle). Reste à l'intérieur de ce carré, avec une marge d'environ 1,5 unité.
- Le fragment contient deux **emplacements de couleur**, à écrire littéralement :
  - `{c}` : la couleur principale de l'icône (celle du type, voir plus bas) ;
  - `{b}` : la couleur de fond de la carte, à utiliser pour **découper** une forme dans une autre (un trou, un contour interne). Si tu n'en as pas besoin, ne l'écris pas.
- **Aucune autre couleur** : pas de couleur en dur (`#ff0000`), pas de dégradé, pas de filtre, pas de transparence en dehors de `opacity` sur un élément. Pas de texte, pas d'image incorporée, pas de `<style>`, pas d'`id` ni de `<defs>` (le même fragment est inséré des dizaines de fois dans une page : un `id` entrerait en collision).
- Éléments autorisés : `path`, `circle`, `ellipse`, `rect`, `line`, `polygon`, `polyline`, `g` (avec `transform` si besoin).

## 2. Deux styles, à garder

- **Espèces** : emblèmes **pleins** (formes remplies avec `fill="{c}"`, détails découpés avec `{b}`). Ils représentent un peuple, ils doivent avoir une silhouette forte et mémorable, et sont affichés en plus grand sur le visuel central de la carte.
- **Affectations** : pictogrammes **au trait**, dans un `<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`. Même épaisseur de trait (1,8) pour les neuf, pour qu'elles forment une famille. Elles sont affichées en médaillon sur la carte.
- Les neuf affectations sont regroupées en trois **familles** qui ne changent que la couleur : navigation (bleu), soutien (vert), tactique (rouge). Les icônes d'une même famille peuvent partager un air de famille, mais chaque icône doit se distinguer des huit autres au premier regard (y compris pour un joueur daltonien : ne compte pas sur la couleur seule).

## 3. Les 15 types

Pour chaque type : l'idée, la couleur, et le fragment actuel (à améliorer ou à remplacer).

### Espèces (emblèmes pleins)

#### Elk (`elk`)

- Idée : Peuple humanoïde proche de l'humain et de l'elfe : appendice crânien latéral, oreilles elfiques. Emblème actuel : une spirale.
- Couleur `{c}` : `#4FC49A`
- Fragment actuel :

```svg
<path d="M12 12 a1.5 1.5 0 0 1 3 0 a3.5 3.5 0 0 1 -7 0 a5.5 5.5 0 0 1 11 0 a7.5 7.5 0 0 1 -15 0" fill="none" stroke="{c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.2" fill="{c}"/>
```

#### Dwork (`dwork`)

- Idée : Peuple colosse, trapu, bâtisseur et mineur plus que guerrier : gabarit massif, barbe fournie, canines saillantes.
- Couleur `{c}` : `#c4622d`
- Fragment actuel :

```svg
<circle cx="12" cy="12" r="10" fill="{c}"/><circle cx="12" cy="12" r="7.6" fill="{b}"/>
      <path d="M12 5.2 L13.7 10.3 L18.8 12 L13.7 13.7 L12 18.8 L10.3 13.7 L5.2 12 L10.3 10.3 Z" fill="{c}" stroke="{c}" stroke-width=".6" stroke-linejoin="round"/>
      <g fill="{c}"><circle cx="17.2" cy="6.8" r=".9"/><circle cx="6.8" cy="17.2" r=".9"/></g>
```

#### Droïde (`droid`)

- Idée : Machine intelligente autonome ; silhouette encore non arrêtée dans la documentation.
- Couleur `{c}` : `#4fb3d9`
- Fragment actuel :

```svg
<rect x="3" y="10" width="2.2" height="5.4" rx="1" fill="{c}"/><rect x="18.8" y="10" width="2.2" height="5.4" rx="1" fill="{c}"/>
      <rect x="5.2" y="6.4" width="13.6" height="12.4" rx="3.6" fill="{c}"/>
      <path d="M12 6.4 V3.4" stroke="{c}" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="2.8" r="1.5" fill="{c}"/>
      <rect x="7.4" y="10.2" width="9.2" height="4.2" rx="2.1" fill="{b}"/>
      <circle cx="10.2" cy="12.3" r="1" fill="{c}"/><circle cx="13.8" cy="12.3" r="1" fill="{c}"/>
      <path d="M9 16.6 H15" stroke="{b}" stroke-width="1.2" stroke-linecap="round"/>
```

#### Sorvane (`sorvane`)

- Idée : Peuple humanoïde élancé, port droit, épaules dégagées, peau gris-bleu cendré, regard intense.
- Couleur `{c}` : `#b4bcc9`
- Fragment actuel :

```svg
<path d="M12 21 L3 5 H21 Z" fill="{c}" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M12 16.6 L6.6 7.2 H17.4 Z" fill="none" stroke="{b}" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="12" cy="10.6" r="1.6" fill="{b}"/>
      <g fill="{b}"><circle cx="4.9" cy="5.9" r=".7"/><circle cx="19.1" cy="5.9" r=".7"/><circle cx="12" cy="19.2" r=".7"/></g>
```

#### Ryskan (`ryskan`)

- Idée : Peuple longiligne et gracile, crête crânienne propre à chaque individu, bioluminescence, grands yeux clairs.
- Couleur `{c}` : `#E5B83F`
- Fragment actuel :

```svg
<path d="M12 1.4 C12.8 8 16 11.2 22.6 12 C16 12.8 12.8 16 12 22.6 C11.2 16 8 12.8 1.4 12 C8 11.2 11.2 8 12 1.4 Z" fill="{c}"/><path d="M12 8.2 L15.8 12 L12 15.8 L8.2 12 Z" fill="none" stroke="{b}" stroke-width=".8" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.3" fill="{b}"/><g fill="{b}"><circle cx="12" cy="5.2" r=".6"/><circle cx="12" cy="18.8" r=".6"/><circle cx="5.2" cy="12" r=".6"/><circle cx="18.8" cy="12" r=".6"/></g><g fill="{c}"><circle cx="4.6" cy="4.6" r=".7"/><circle cx="19.4" cy="4.6" r=".7"/><circle cx="4.6" cy="19.4" r=".7"/><circle cx="19.4" cy="19.4" r=".7"/></g>
```

#### Nythe (`nythe`)

- Idée : Peuple extraterrestre dans un corps androïde : tête remplacée par une sphère translucide pleine d'un liquide rose nacré, armature mécanique visible.
- Couleur `{c}` : `#e56b9a`
- Fragment actuel :

```svg
<g transform="scale(.375)"><path d="M32 5L40 12H51L52 23L59 32L52 41L51 52H40L32 59L24 52H13L12 41L5 32L12 23L13 12H24Z" fill="{c}"/><circle cx="32" cy="32" r="17" fill="{b}"/><circle cx="32" cy="32" r="12" fill="{c}"/><circle cx="32" cy="32" r="5" fill="{b}"/><circle cx="32" cy="18" r="2.5" fill="{b}"/><circle cx="44" cy="32" r="2.5" fill="{b}"/><circle cx="32" cy="46" r="2.5" fill="{b}"/><circle cx="20" cy="32" r="2.5" fill="{b}"/></g>
```

### Affectations (pictogrammes au trait)

#### Pilote (`pilot`)

- Idée : Navigation, manœuvres, initiative : donne le rythme du combat, l'ouverture.
- Couleur `{c}` : `#4f8cff` (famille navigation)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 L21 3.5 L14.5 20.5 L11.5 13 Z"/><path d="M11.5 13 L21 3.5"/></g>
```

#### Ingénieur (`engineer`)

- Idée : Systèmes, équipements, énergie : renforce par les équipements, Boucliers.
- Couleur `{c}` : `#a8d94a` (famille soutien)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.5 v3.1 M12 18.4 v3.1 M2.5 12 h3.1 M18.4 12 h3.1 M5.3 5.3 l2.2 2.2 M16.5 16.5 l2.2 2.2 M18.7 5.3 l-2.2 2.2 M7.5 16.5 l-2.2 2.2"/></g>
```

#### Médecin (`medic`)

- Idée : Soins, biologie, survie : soigne et protège les fragiles.
- Couleur `{c}` : `#a8d94a` (famille soutien)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5 h6 v5.5 h5.5 v6 H15 v5.5 H9 V15 H3.5 V9 H9 Z"/></g>
```

#### Sécurité (`security`)

- Idée : Protection, contrôle : protège, détourne les attaques (Provocation, Bouclier).
- Couleur `{c}` : `#e8604c` (famille tactique)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 L20 5.8 V12 C20 16.8 16.5 20 12 21.4 C7.5 20 4 16.8 4 12 V5.8 Z"/><path d="M12 7 V16 M8.2 10 H15.8"/></g>
```

#### Explorateur (`explorer`)

- Idée : Reconnaissance, adaptation : exploite les faiblesses, s'adapte (À distance).
- Couleur `{c}` : `#4f8cff` (famille navigation)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.8 8.2 L13.6 13.6 L8.2 15.8 L10.4 10.4 Z"/></g>
```

#### Artilleur (`artillerist`)

- Idée : Armement, ciblage : dégâts directs et ciblés (À distance).
- Couleur `{c}` : `#e8604c` (famille tactique)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6.6"/><path d="M12 2 v5 M12 17 v5 M2 12 h5 M17 12 h5"/><circle cx="12" cy="12" r=".6"/></g>
```

#### Renseignement (`intelligence`)

- Idée : Infiltration, sabotage : affaiblit et perturbe l'adversaire.
- Couleur `{c}` : `#e8604c` (famille tactique)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 C5 6.6 8.4 5 12 5 C15.6 5 19 6.6 22 12 C19 17.4 15.6 19 12 19 C8.4 19 5 17.4 2 12 Z"/><circle cx="12" cy="12" r="3"/></g>
```

#### Roboticien (`roboticist`)

- Idée : Automates, drones, essaims : invoque et multiplie les petites unités.
- Couleur `{c}` : `#a8d94a` (famille soutien)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6.8" r="2.8"/><circle cx="5.8" cy="17" r="2.8"/><circle cx="18.2" cy="17" r="2.8"/><path d="M10.6 9.2 L7.2 14.6 M13.4 9.2 L16.8 14.6 M8.6 17 H15.4"/></g>
```

#### Diplomate (`diplomat`)

- Idée : Coordination, cohésion : bonus aux alliés voisins ou variés.
- Couleur `{c}` : `#4f8cff` (famille navigation)
- Fragment actuel :

```svg
<g fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="3.2"/><circle cx="16.4" cy="9" r="3.2"/><path d="M3 20 c0 -3.6 2.4 -5.6 5 -5.6 s5 2 5 5.6 M11.4 20 c0 -3.6 2.4 -5.6 5 -5.6 s5 2 5 5.6"/></g>
```

## 4. Ce que tu dois rendre

Un **objet JSON unique**, une clé par identifiant de type, dont la valeur est le fragment SVG (une chaîne, sans balise `<svg>`, avec `{c}` et `{b}` littéraux) :

```json
{
  "elk": "<path d=\"…\" fill=\"{c}\"/>",
  "dwork": "…",
  "…": "…"
}
```

Les 15 identifiants : `elk`, `dwork`, `droid`, `sorvane`, `ryskan`, `nythe`, `pilot`, `engineer`, `medic`, `security`, `explorer`, `artillerist`, `intelligence`, `roboticist`, `diplomat`.

Après le JSON, ajoute :
1. **Une phrase par icône** qui dit l'idée graphique choisie et ce qui la distingue des icônes voisines.
2. **Une alerte** si deux icônes se ressemblent encore à 12 px, ou si une icône dépend d'un détail qui disparaît en petit.
3. **Pour les icônes que tu juges déjà bonnes**, dis-le et rends-les inchangées plutôt que de les modifier pour modifier.

## 5. Critères de réussite

- Lisible à 12 px sur fond `#151a26`, en couleur `{c}` et en niveaux de gris.
- Les 6 espèces se distinguent par la **silhouette**, les 9 affectations par le **motif**.
- Cohérence : même épaisseur de trait pour les affectations, même niveau de stylisation pour les espèces.
- Fragments courts (quelques éléments), sans coordonnées inutilement précises (une décimale au plus).
- Aucune ressemblance avec un logo existant ou une licence connue (le jeu est dans l'univers original d'Atlas Wanderer).
