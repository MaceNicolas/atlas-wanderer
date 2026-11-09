// Atlas Wanderer : stylisation SVG (provisoire).
// Emblèmes d'espèces, icônes d'archétypes, de statistiques et de mots-clés, cartes de serviteurs et d'équipements.
// Aucune dépendance : le fichier fonctionne dans un navigateur (<script src>) et sous Node (require).
// Toutes les fonctions renvoient du SVG sous forme de chaîne.
(function (root) {
  'use strict';

  // ---------- Couleurs ----------
  const SPECIES = ['Elk', 'Dwork', 'Droïde', 'Sorvane', 'Ryskan', 'Nythe'];
  // Le gris argenté neutre est celui des Sorvane. Aucune couleur n'est dorée (l'or est réservé aux dorés).
  const SPECIES_COLOR = { 'Elk': '#4FC49A', 'Dwork': '#c4622d', 'Droïde': '#4fb3d9', 'Sorvane': '#b4bcc9', 'Ryskan': '#E5B83F', 'Nythe': '#e56b9a' };
  // Les archétypes suivent les trois familles de documentation/types/archetypes.md.
  const FAMILY_COLOR = { navigation: '#4f8cff', soutien: '#a8d94a', tactique: '#e8604c' };
  const ARCH_FAMILY = {
    'Pilote': 'navigation', 'Explorateur': 'navigation', 'Diplomate': 'navigation',
    'Ingénieur': 'soutien', 'Médecin': 'soutien', 'Roboticien': 'soutien',
    'Sécurité': 'tactique', 'Artilleur': 'tactique', 'Renseignement': 'tactique'
  };
  const SHIELD = '#6fe3ff';
  const UI = { card: '#151a26', cardDeep: '#0e121b', text: '#f1f5f9', muted: '#94a3b8', atk: '#f0a53a', hp: '#e5534b', gold: '#f5c542' };
  const typeColor = t => SPECIES_COLOR[t] || FAMILY_COLOR[ARCH_FAMILY[t]] || '#9aa4b2';
  const isSpecies = t => SPECIES.includes(t);

  // ---------- Icônes (viewBox 24x24) ----------
  // Chaque icône est une fonction (c = couleur principale, b = couleur de fond pour les détails en creux).
  const line = (c, body) => `<g fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  const ICONS = {
    // --- Espèces : silhouettes pleines ---
    // Elk : spirale d'arabesque (tatouage), tout en courbes.
    'Elk': c => `<path d="M12 12 a1.5 1.5 0 0 1 3 0 a3.5 3.5 0 0 1 -7 0 a5.5 5.5 0 0 1 11 0 a7.5 7.5 0 0 1 -15 0" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.2" fill="${c}"/>`,
    // Dwork : géode ouverte, anneau de roche autour d'un cœur sombre et d'un cristal en étoile.
    'Dwork': (c, b) => `<circle cx="12" cy="12" r="10" fill="${c}"/><circle cx="12" cy="12" r="7.6" fill="${b}"/>
      <path d="M12 5.2 L13.7 10.3 L18.8 12 L13.7 13.7 L12 18.8 L10.3 13.7 L5.2 12 L10.3 10.3 Z" fill="${c}" stroke="${c}" stroke-width=".6" stroke-linejoin="round"/>
      <g fill="${c}"><circle cx="17.2" cy="6.8" r=".9"/><circle cx="6.8" cy="17.2" r=".9"/></g>`,
    'Droïde': (c, b) => `<rect x="3" y="10" width="2.2" height="5.4" rx="1" fill="${c}"/><rect x="18.8" y="10" width="2.2" height="5.4" rx="1" fill="${c}"/>
      <rect x="5.2" y="6.4" width="13.6" height="12.4" rx="3.6" fill="${c}"/>
      <path d="M12 6.4 V3.4" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="2.8" r="1.5" fill="${c}"/>
      <rect x="7.4" y="10.2" width="9.2" height="4.2" rx="2.1" fill="${b}"/>
      <circle cx="10.2" cy="12.3" r="1" fill="${c}"/><circle cx="13.8" cy="12.3" r="1" fill="${c}"/>
      <path d="M9 16.6 H15" stroke="${b}" stroke-width="1.2" stroke-linecap="round"/>`,
    // Sorvane : triangle stylisé clouté, médaillon central (provisoire).
    'Sorvane': (c, b) => `<path d="M12 21 L3 5 H21 Z" fill="${c}" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M12 16.6 L6.6 7.2 H17.4 Z" fill="none" stroke="${b}" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="12" cy="10.6" r="1.6" fill="${b}"/>
      <g fill="${b}"><circle cx="4.9" cy="5.9" r=".7"/><circle cx="19.1" cy="5.9" r=".7"/><circle cx="12" cy="19.2" r=".7"/></g>`,
    // Ryskan : étoile à quatre branches, losange du front et nœuds lumineux.
    'Ryskan': (c, b) => `<path d="M12 1.4 C12.8 8 16 11.2 22.6 12 C16 12.8 12.8 16 12 22.6 C11.2 16 8 12.8 1.4 12 C8 11.2 11.2 8 12 1.4 Z" fill="${c}"/><path d="M12 8.2 L15.8 12 L12 15.8 L8.2 12 Z" fill="none" stroke="${b}" stroke-width=".8" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.3" fill="${b}"/><g fill="${b}"><circle cx="12" cy="5.2" r=".6"/><circle cx="12" cy="18.8" r=".6"/><circle cx="5.2" cy="12" r=".6"/><circle cx="18.8" cy="12" r=".6"/></g><g fill="${c}"><circle cx="4.6" cy="4.6" r=".7"/><circle cx="19.4" cy="4.6" r=".7"/><circle cx="4.6" cy="19.4" r=".7"/><circle cx="19.4" cy="19.4" r=".7"/></g>`,
    // Nythe : octogone dentelé (viewBox 64 réduit), disque creux et quatre points cardinaux.
    'Nythe': (c, b) => `<g transform="scale(.375)"><path d="M32 5L40 12H51L52 23L59 32L52 41L51 52H40L32 59L24 52H13L12 41L5 32L12 23L13 12H24Z" fill="${c}"/><circle cx="32" cy="32" r="17" fill="${b}"/><circle cx="32" cy="32" r="12" fill="${c}"/><circle cx="32" cy="32" r="5" fill="${b}"/><circle cx="32" cy="18" r="2.5" fill="${b}"/><circle cx="44" cy="32" r="2.5" fill="${b}"/><circle cx="32" cy="46" r="2.5" fill="${b}"/><circle cx="20" cy="32" r="2.5" fill="${b}"/></g>`,

    // --- Archétypes : icônes au trait ---
    'Pilote': c => line(c, '<path d="M3 11.5 L21 3.5 L14.5 20.5 L11.5 13 Z"/><path d="M11.5 13 L21 3.5"/>'),
    'Ingénieur': c => line(c, '<circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.5 v3.1 M12 18.4 v3.1 M2.5 12 h3.1 M18.4 12 h3.1 M5.3 5.3 l2.2 2.2 M16.5 16.5 l2.2 2.2 M18.7 5.3 l-2.2 2.2 M7.5 16.5 l-2.2 2.2"/>'),
    'Médecin': c => line(c, '<path d="M9 3.5 h6 v5.5 h5.5 v6 H15 v5.5 H9 V15 H3.5 V9 H9 Z"/>'),
    'Sécurité': c => line(c, '<path d="M12 2.8 L20 5.8 V12 C20 16.8 16.5 20 12 21.4 C7.5 20 4 16.8 4 12 V5.8 Z"/><path d="M12 7 V16 M8.2 10 H15.8"/>'),
    'Explorateur': c => line(c, '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2 L13.6 13.6 L8.2 15.8 L10.4 10.4 Z"/>'),
    'Artilleur': c => line(c, '<circle cx="12" cy="12" r="6.6"/><path d="M12 2 v5 M12 17 v5 M2 12 h5 M17 12 h5"/><circle cx="12" cy="12" r=".6"/>'),
    'Renseignement': c => line(c, '<path d="M2 12 C5 6.6 8.4 5 12 5 C15.6 5 19 6.6 22 12 C19 17.4 15.6 19 12 19 C8.4 19 5 17.4 2 12 Z"/><circle cx="12" cy="12" r="3"/>'),
    'Roboticien': c => line(c, '<circle cx="12" cy="6.8" r="2.8"/><circle cx="5.8" cy="17" r="2.8"/><circle cx="18.2" cy="17" r="2.8"/><path d="M10.6 9.2 L7.2 14.6 M13.4 9.2 L16.8 14.6 M8.6 17 H15.4"/>'),
    'Diplomate': c => line(c, '<circle cx="8" cy="9" r="3.2"/><circle cx="16.4" cy="9" r="3.2"/><path d="M3 20 c0 -3.6 2.4 -5.6 5 -5.6 s5 2 5 5.6 M11.4 20 c0 -3.6 2.4 -5.6 5 -5.6 s5 2 5 5.6"/>'),

    // --- Repères ---
    // Niveau de renfort : « Chevrons de progression », deux chevrons pleins et un losange nichés dessous (violet pâle, sans contour). Sert aussi au bouton de montée de niveau.
    'niveauChevrons': c => `<g fill="${c}" transform="translate(0 1.4)">${[0, 6].map(y => `<path transform="translate(0 ${y})" d="M12 1 L22 8.6 V12.2 L12 4.6 L2 12.2 V8.6 Z"/>`).join('')}<path d="M12 13.4 L14.8 16.4 L12 19.4 L9.2 16.4 Z"/></g>`,
    'rank': c => line(c, '<path d="M5 13.5 L12 6.5 L19 13.5 M5 19 L12 12 L19 19"/>'),
    'datacron': (c, b) => `<path d="M12 2.4 L20 7 V17 L12 21.6 L4 17 V7 Z" fill="${c}"/><path d="M12 2.4 V12 M4 7 L12 12 L20 7 M12 12 V21.6" stroke="${b}" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`,
    'equip': c => `<path d="M13.4 2 L5 13.6 H10.8 L9.8 22 L19 9.8 H13 Z" fill="${c}"/>`,

    'bug': c => line(c, '<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M9.5 7 C9.5 4.5 14.5 4.5 14.5 7 M8 11 H3.5 M16 11 H20.5 M8 15 H4.5 M16 15 H19.5 M8.4 9 L5.4 6.4 M15.6 9 L18.6 6.4 M12 10 V19"/>'),

    // --- Boutons du renfort ---
    'btnServant': c => line(c, '<circle cx="12" cy="7.5" r="3.6"/><path d="M4.5 20.5 C4.5 15.5 8 13.2 12 13.2 C16 13.2 19.5 15.5 19.5 20.5"/><path d="M12 15.4 l.9 1.8 2 .3 -1.4 1.4 .3 2 -1.8 -.9 -1.8 .9 .3 -2 -1.4 -1.4 2 -.3 Z"/>'),
    'btnEquip': c => line(c, '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
    // Porte de sas : cadre, deux vantaux, et le trait lumineux de l'ouverture au milieu.
    'btnDoor': c => line(c, '<path d="M5.5 21 V6.5 A2.5 2.5 0 0 1 8 4 H16 A2.5 2.5 0 0 1 18.5 6.5 V21"/><path d="M3 21 H21"/><path d="M10.4 7.5 V18 M13.6 7.5 V18" stroke-width="1.2"/><path d="M12 8 V17.5" stroke-width="2.2"/><path d="M9.5 2 H14.5" stroke-width="1.4"/>'),
    // Renfort : silhouette de personnage, et un + qui évoque son arrivée.
    'btnReinforce': c => line(c, '<circle cx="9.5" cy="8" r="3.3"/><path d="M3 21 C3 16.2 6 13.8 9.5 13.8 C11.6 13.8 13.4 14.6 14.6 16"/><path d="M18 4 V10 M15 7 H21" stroke-width="2.2"/>'),
    // Poubelle : jeter une carte.
    'trash': c => line(c, '<path d="M4.5 6.5 H19.5"/><path d="M9.5 6.5 V4.5 H14.5 V6.5"/><path d="M6.5 6.5 L7.5 20 H16.5 L17.5 6.5"/><path d="M10.2 10.5 V16 M13.8 10.5 V16"/>'),

    // --- Statistiques ---
    'heart': c => `<path d="M12 21.2 C12 21.2 2.8 15 2.8 8.8 A4.7 4.7 0 0 1 12 7 A4.7 4.7 0 0 1 21.2 8.8 C21.2 15 12 21.2 12 21.2 Z" fill="${c}"/>`,

    // --- Mots-clés ---
    'prov': c => line(c, '<path d="M3 10 V14 H7 L14 18.4 V5.6 L7 10 Z"/><path d="M17.4 9 C19 10.6 19 13.4 17.4 15 M19.8 6.4 C23 9.6 23 14.4 19.8 17.6"/>'),
    'shield': c => line(c, '<circle cx="12" cy="12" r="9"/><path d="M7.4 12 A4.6 4.6 0 0 1 12 7.4"/><path d="M12 15.4 V16.4 M9.6 13.6 L8.9 14.3"/>'),
    'poison': c => line(c, '<path d="M12 2.6 C12 2.6 5.4 10 5.4 14.8 A6.6 6.6 0 0 0 18.6 14.8 C18.6 10 12 2.6 12 2.6 Z"/><path d="M9.6 14 l4.8 4.4 M14.4 14 l-4.8 4.4"/>'),
    'rebirth': c => line(c, '<path d="M20 12 A8 8 0 1 1 17.6 6.3"/><path d="M20 3.6 V8.8 H14.8"/>'),
    'fury': c => line(c, '<path d="M13.4 2.8 L5 13.4 H11.4 L10.2 21.2 L19 10.4 H12.6 Z"/>'),
    'ranged': c => line(c, '<path d="M4 20 L19 5 M19 5 H13.6 M19 5 V10.4 M4 20 L8 18.8 M4 20 L5.2 16"/>')
  };
  const KW_ICON = { prov: 'prov', shield: 'shield', poison: 'poison', rebirth: 'rebirth', ranged: 'ranged', fury: 'fury' };
  const KW_LABEL = { prov: 'Provocation', shield: 'Bouclier', poison: 'Poison', rebirth: 'Renaissance', ranged: 'À distance', fury: 'Fureur' };
  // Rappel de règle affiché sous le nom du mot-clé (une ligne, 35 caractères maximum).
  const KW_DESC = {
    prov: 'Attire les attaques ennemies', shield: 'Annule la 1re source de dégâts', poison: 'Détruit toute cible blessée',
    rebirth: 'Revient 1 fois avec 1 PV', ranged: 'Ne subit pas de riposte', fury: 'Attaque deux fois de suite'
  };

  const num = n => Math.round(n * 100) / 100;
  // Illustrations : prototype/images/<catégorie>/<identifiant de la carte>.<ext> (l'identifiant est un UUID fixe, voir IDENTIFIANTS dans donnees.js ; à défaut, le nom sert d'identifiant).
  // La liste des fichiers présents est dans images.js (généré par outils/indexer-images.js) ; sans image, la carte garde son emblème.
  const slugOf = n => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const imageFor = (cat, name, base) => { const slug = slugOf(name), ext = ((root.AW_IMAGES || {})[cat] || {})[slug]; return ext ? `${base == null ? 'images/' : base}${cat}/${slug}.${ext}` : null; };
  // Ancrage d'une illustration dans son cadre (« catégorie/nom » -> alignement SVG) ; par défaut elle est centrée. xMinYMin : le coin haut gauche de l'image reste au coin haut gauche du cadre.
  const IMG_ALIGN = { 'serviteurs/3077a7fe-d3ad-42b3-b8e3-c1c3700b78b8': 'xMidYMin', 'serviteurs/aff6bcc6-a3fe-456b-9c0f-1e8bdaa561ad': 'xMidYMin', 'serviteurs/1cc790cf-fb08-4d6c-b4f3-5920c2fc0b73': 'xMidYMin', 'serviteurs/8718fd55-af6b-48b7-89f4-dc68524f8e97': 'xMidYMin', 'serviteurs/d74dd735-8b16-4bfe-8a8c-6ffa3795b48b': 'xMidYMin', 'serviteurs/ef5d2f47-1a83-466f-9caf-63eddaca0245': 'xMidYMin', 'serviteurs/6c5c3528-d527-4dfc-9863-3fbd805048d5': 'xMidYMin', 'serviteurs/c21b91d4-7ea5-41ab-a1ca-1e2751c22c6e': 'xMinYMin', 'lieutenants/2050b072-52a1-4fba-bb6d-042ac36c663a': 'xMidYMin', 'lieutenants/d5acc691-a801-4056-8dee-11e2873bc7da': 'xMinYMin', 'lieutenants/1052557f-ef59-4d00-afac-1924d1f7d202': 'xMinYMin', 'lieutenants/1b036109-0256-4c96-b47c-7d6b74ab41f5': 'xMidYMin', 'lieutenants/3b545f63-e933-4a79-8fe8-09ec6da1dccf': 'xMidYMin', 'lieutenants/64dbde59-6192-45b0-be69-89805dd36731': 'xMidYMin', 'lieutenants/91561506-2ce5-432e-bc65-bb6dbb7f33b7': 'xMidYMin', 'lieutenants/c967e395-5a30-4dfb-8ff7-f8a51ee121d8': 'xMidYMin', 'lieutenants/67943374-1635-407e-9015-c04cd5bb02ae': 'xMidYMin', 'lieutenants/758c5e89-f22d-4aba-a156-e49e6f8c7fb1': 'xMidYMin', 'lieutenants/8c4c1e0d-2867-44fa-9bae-32d31e746d6d': 'xMidYMin', 'serviteurs/fdceb8a2-c1f5-43dd-929b-7e11f3ffd2e5': 'xMidYMin', 'serviteurs/f7efce8b-41f2-4d00-9294-2f3c191f9272': 'xMidYMin', 'serviteurs/2defafa8-043f-4208-b13a-fcc48379aed5': 'xMidYMin', 'serviteurs/f01a03cb-950a-40a5-815f-156a65b74093': 'xMidYMin', 'serviteurs/308d90f5-f573-48ac-a8d1-e392fb1d71f7': 'xMidYMin', 'serviteurs/5ef3ed94-2252-4445-a3b9-a1f4c58002c3': 'xMidYMin', 'serviteurs/33ab6377-5c49-4a3b-8794-25677a9719e5': 'xMidYMin', 'serviteurs/fec2fb24-8534-4029-ad3a-5dbed0d1135a': 'xMidYMin', 'serviteurs/cca50718-1775-4966-95dd-afe202118ba1': 'xMidYMin', 'serviteurs/eee54c69-62e6-4866-8f55-d00f3bcfee29': 'xMidYMin', 'serviteurs/ef8c117d-f345-4c9d-9d74-3743ae65ca57': 'xMidYMin', 'serviteurs/6ca80db4-e461-4d39-aad7-002f8aeb259d': 'xMidYMin', 'serviteurs/d0a2f166-9b0c-4b81-9072-a28be2d07542': 'xMidYMin', 'serviteurs/617cc022-eb81-4dbe-96b1-cced89431e8c': 'xMidYMin', 'serviteurs/a18041e8-98c9-4cbd-8a58-7154f4cc3144': 'xMidYMin', 'serviteurs/04f316de-c101-434d-b2de-663ce6e9ef33': 'xMidYMin', 'serviteurs/b3fcac67-bd5a-46f2-b9b8-216c1c272542': 'xMidYMin', 'serviteurs/dad55580-b20c-4702-a7ed-4c1f1937f01c': 'xMidYMin', 'serviteurs/b172de57-6e95-44db-877b-5fc14644ea33': 'xMidYMin', 'serviteurs/2cce9a89-1cdb-4783-b87d-139fe7b6c69e': 'xMidYMin', 'serviteurs/553324db-fbaf-45c1-b197-8dd487d55486': 'xMidYMin', 'serviteurs/e08ed052-e7c1-4a68-b68d-43c885fc9beb': 'xMidYMin', 'serviteurs/a913dde2-a170-4741-8337-f62aafd35ca2': 'xMidYMin', 'serviteurs/612e87f7-524a-4e9d-ab56-fd717ae9856b': 'xMidYMin', 'serviteurs/f279df0f-3adb-4d9c-9b4d-7dde91fbde23': 'xMidYMin', 'serviteurs/81df3399-b919-4a64-b58c-ddd38ba69f0a': 'xMidYMin', 'serviteurs/d1ce014a-3723-4f7e-ba9d-759f83708b73': 'xMidYMin', 'serviteurs/62306840-ab03-4472-9784-9baa0106beb1': 'xMidYMin', 'serviteurs/776462b6-c72f-48c6-a682-5ad4d90a6223': 'xMidYMin', 'serviteurs/cfa1e128-db00-43bc-8be3-fa510bedf477': 'xMidYMin', 'serviteurs/04f58d31-d37e-4cc6-bcfb-e6424ea3e61d': 'xMidYMin', 'serviteurs/4246a94e-20b0-415f-9e5d-00fdf986b57c': 'xMidYMin', 'serviteurs/195cfb93-78d7-4933-84f1-419764b6242a': 'xMidYMin', 'serviteurs/d4abf299-2d6e-4d1a-8df7-d50e77cef4c8': 'xMidYMin', 'serviteurs/efee5766-bfdf-4507-a22d-f61dc6cbfb7c': 'xMidYMin', 'serviteurs/313a5f58-351f-4771-a78a-272a550549d0': 'xMidYMin', 'serviteurs/837fc144-46d6-40e1-b3f3-7d166fce21ca': 'xMidYMin', 'serviteurs/d656a1f6-a5e6-4384-a070-6a8cfbe14747': 'xMidYMin', 'serviteurs/40b016a0-39db-44a6-9d99-e150373a6978': 'xMidYMin', 'serviteurs/d07a201f-0a06-4e4c-bf7a-ce5a8d3eabfb': 'xMidYMin', 'serviteurs/489d8821-6109-4902-bb4c-243f6d294961': 'xMidYMin', 'serviteurs/66f02c65-d06d-4047-a7fe-5b3d7308cf06': 'xMidYMin', 'serviteurs/6e88d6c6-e1ef-45e5-a1cd-a051a07ca54a': 'xMidYMin', 'serviteurs/28e4d8eb-306a-462d-91c0-4ab843e94b71': 'xMidYMin', 'serviteurs/511431c8-6d43-4506-8e84-02ab9275f6a9': 'xMidYMin', 'serviteurs/99893d34-bc0e-4bb6-a8a7-1ff5afd22b60': 'xMidYMin', 'serviteurs/841f6dcd-6d7a-4b5e-92c5-42a2e0df9ccd': 'xMidYMin', 'serviteurs/a0b8344c-a450-48ac-b4c6-be81130dd9dc': 'xMidYMin', 'serviteurs/c3483ec8-061d-46c4-a062-1e1dc687bde9': 'xMidYMin', 'serviteurs/7ee47f27-667f-4d4f-a8f5-fc76602dc533': 'xMidYMin', 'serviteurs/ff7b3a5b-68eb-464f-b312-83a1768e2aed': 'xMidYMin', 'serviteurs/620fd49d-2f7a-4913-9312-06eb207ededa': 'xMidYMin', 'serviteurs/2c10f1a5-bf8a-4c88-9964-3d87e69a70e5': 'xMidYMin', 'serviteurs/62a51092-d177-427b-a6e2-e9fcc66f6870': 'xMidYMin', 'serviteurs/3cd48270-92ef-4ace-87e2-0a04c8d78dce': 'xMidYMin', 'serviteurs/e0b1ef33-99d7-4832-a68f-a0912ca20f7a': 'xMidYMin', 'serviteurs/05ea829a-a1a1-4137-87a6-62fc68344bd8': 'xMidYMin', 'serviteurs/74ea5d74-f255-4e8d-93a1-c74e049d5dc8': 'xMidYMin', 'serviteurs/47132a82-dd96-4bc2-9934-5819c2509874': 'xMidYMin', 'serviteurs/a8832ba0-5ed7-4c3a-98a7-a695126de92e': 'xMidYMin', 'serviteurs/bd7bd662-d7d4-426a-b3dc-9b4ca37d4e1d': 'xMidYMin', 'serviteurs/b273ee61-f011-4e68-8940-1758356f3163': 'xMidYMin', 'serviteurs/f7390f61-8d8e-446d-9199-be2588c9006f': 'xMidYMin', 'serviteurs/506f000a-a3ec-40f3-8be8-4d6004e725cb': 'xMidYMin', 'serviteurs/3e8fbe36-a661-4364-8a68-9fb41f33c3e0': 'xMidYMin', 'serviteurs/8b4ec2f2-e490-4138-b390-7038d705be9a': 'xMidYMin', 'serviteurs/3dc1d8a8-0e15-405c-a8ca-c60c027fc0fe': 'xMidYMin', 'serviteurs/7c1a7d32-1e37-418e-827a-969cb1af306d': 'xMidYMin', 'serviteurs/c930b94d-68d5-4a5a-825e-a741b93eeb3a': 'xMidYMin', 'serviteurs/c7b39db5-eff2-4267-933b-d220293a37a3': 'xMidYMin', 'serviteurs/8f03b021-9650-455c-be55-84f44e867b04': 'xMidYMin', 'serviteurs/687ee92d-4db7-4d3e-8b0c-c0ff08989f4d': 'xMidYMin', 'serviteurs/a12e4c54-bbf0-4c9a-9700-0e746a1f7e88': 'xMidYMin', 'serviteurs/0e513550-05d5-4741-8df2-4a6b4b68ec7b': 'xMidYMin', 'serviteurs/d3a21fcf-3ac2-4101-bf1f-49dd0f64f05a': 'xMidYMin', 'serviteurs/3965a102-0500-47fd-a4be-9ca72335e77e': 'xMidYMin', 'serviteurs/c920d49f-2f5a-409b-a5eb-66ce5b807749': 'xMidYMin', 'serviteurs/50be8649-e958-4506-b26a-a0ca20ea2be4': 'xMidYMin', 'serviteurs/c18aa476-2a41-43d8-9a3e-4b0f84513899': 'xMidYMin', 'serviteurs/5a6a7d2e-7840-401f-98d0-221b133f9cbe': 'xMidYMin', 'serviteurs/14d1f9a5-5c81-473f-8071-304c32f11a6b': 'xMidYMin' };
  // Illustrations montrées en entier (réduites pour tenir dans le cadre, le reste du cadre est rempli par la même image assombrie).
  const IMG_ENTIERE = ['serviteurs/e12c20e7-a9e2-4cd2-b9a4-1327692cf687', 'serviteurs/191f4649-025d-4a49-a35f-270be25048d2', 'equipements/3eeb8c38-c1df-4ea1-8b5e-730fa78c12b3', 'equipements/b77475fe-b888-4d96-995f-3a4251561df6', 'equipements/53cc28c3-b2e9-4ab1-a05a-45e03fa58928', 'equipements/c3531fd7-3a89-40bd-b125-1986cdc8a0bf', 'equipements/446387d4-0ed5-464a-a3a3-4a198651f861', 'equipements/d6b80761-7884-4c58-b2f5-bf002b990c5a', 'equipements/6a5c088a-06cc-430e-9ab3-a77afd73af64', 'equipements/5ee06535-72db-4730-ab66-c1bb0582af60'];   // équipements Pilote et Explorateur : dézoom maximal
  const alignOf = (cat, name) => IMG_ALIGN[`${cat}/${slugOf(name)}`] || 'xMidYMid';
  const servantImage = (name, base) => imageFor('serviteurs', name, base);
  // Icône isolée (balise <svg>) : à insérer telle quelle dans une page.
  function icon(name, o = {}) {
    const size = o.size || 24, c = o.color || 'currentColor', b = o.bg || UI.card;
    const f = ICONS[name]; if (!f) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${name}">${f(c, b)}</svg>`;
  }
  // Icône placée dans un autre SVG (groupe positionné) : (x, y) = coin haut gauche.
  function iconG(name, x, y, size, c, b) {
    const f = ICONS[name]; if (!f) return '';
    return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(size / 24)})">${f(c, b || UI.card)}</g>`;
  }
  // Pastille d'un type : fond teinté, icône, nom.
  function typeChip(t, o = {}) {
    const col = typeColor(t), h = o.height || 22, w = Math.ceil(h + 8 + t.length * (h * 0.46));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-opacity=".7"/>
      ${iconG(t, 4, (h - h * 0.72) / 2, h * 0.72, col, UI.card)}
      <text x="${h * 0.72 + 8}" y="${h / 2 + h * 0.18}" font-family="system-ui,sans-serif" font-size="${num(h * 0.5)}" font-weight="600" fill="${UI.text}">${esc(t)}</text></svg>`;
  }

  // ---------- Utilitaires ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function wrap(text, max) {
    const out = []; let cur = '';
    String(text).split(/\s+/).forEach(w => {
      if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    });
    if (cur) out.push(cur);
    return out;
  }
  let GID = 0;   // identifiants de dégradés uniques par carte
  const FONT = 'system-ui,-apple-system,Segoe UI,sans-serif';

  // Pastilles de types d'une carte : largeur ajustée au nom, alignées à gauche.
  function chipRow(types, y, back) {
    let x = 12;
    return types.map(t => {
      const w = Math.max(56, Math.ceil(31 + t.length * 5.8)), col = typeColor(t), g = `<g>${back ? `<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${UI.cardDeep}" fill-opacity=".85"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-opacity=".7"/>
        ${iconG(t, x + 5, y + 3, 14, col, UI.card)}<text x="${x + 23}" y="${y + 14}" font-size="10" font-weight="600" fill="${UI.text}">${esc(t)}</text></g>`;
      x += w + 6; return g;
    }).join('');
  }

  // Blason de vie (écusson encastré dans le coin inférieur droit, seul son côté gauche est visible) : cartes de serviteur et de lieutenant.
  function hpBadge(hp, hurt, W, H) {
    const hx = W - 1.5, hy = H - 1.5, k = 1.85;
    return `<path d="M${hx - 21 * k} ${hy - 22 * k} H${hx + 21 * k} V${hy + 3 * k} C${hx + 21 * k} ${hy + 15 * k} ${hx + 11 * k} ${hy + 23 * k} ${hx} ${hy + 28 * k} C${hx - 11 * k} ${hy + 23 * k} ${hx - 21 * k} ${hy + 15 * k} ${hx - 21 * k} ${hy + 3 * k} Z" fill="#0e121b" fill-opacity=".62" stroke="#cbd5e1" stroke-opacity=".75" stroke-width="1.5" stroke-linejoin="round"/>
        <text x="${hx - 16}" y="${hy - 8}" text-anchor="middle" font-size="${String(hp).length > 2 ? 17 : 22}" font-weight="900" fill="${hurt ? '#ffb4ae' : '#fff'}" stroke="#0e121b" stroke-opacity=".9" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${hp}</text>`;
  }

  // Blasons de statistiques de serviteur, encastrés dans les coins du bas de la carte (sans marge avec le bord, coupés par son contour) :
  // l'attaque dans une étoile à pointes (on ne voit que les pointes en haut à droite), la vie dans un écusson (on ne voit que son côté gauche).
  // Aucune couleur (fond sombre translucide, contour gris clair) ; seul le chiffre de vie rosit quand le serviteur est blessé. W, H : taille de la carte ; clip : id du clipPath du contour.
  function statBadges(id, atk, hp, hurt, W, H, hideZero) {   // hideZero : un blason à 0 n'est pas dessiné (équipements)
    const star = (cx, cy, ro, ri, n) => Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? ri : ro, a = Math.PI / n * i - Math.PI / 2; return `${num(cx + r * Math.cos(a))},${num(cy + r * Math.sin(a))}`; }).join(' ');
    const defs = '';   // aucun dégradé : les blasons sont neutres (fond sombre translucide, contour clair)
    const ax = 1.5, ay = H - 1.5;
    const body = `<g clip-path="url(#${id}k)">
        ${hideZero && !atk ? '' : `        <polygon points="${star(ax, ay, 50, 37, 8)}" fill="#0e121b" fill-opacity=".62" stroke="#cbd5e1" stroke-opacity=".75" stroke-width="1.5" stroke-linejoin="round"/>
        <text x="${ax + 17}" y="${ay - 9}" text-anchor="middle" font-size="${String(atk).length > 2 ? 17 : 22}" font-weight="900" fill="#fff" stroke="#0e121b" stroke-opacity=".9" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${atk}</text>`}
        ${hideZero && !hp ? '' : hpBadge(hp, hurt, W, H)}</g>`;
    return { defs, body };
  }

  // Bandeau de types, pleine largeur sous l'illustration : une case par type (espèce à gauche, archétype à droite),
  // chacune sur sa part de la largeur, en texte de la taille des pouvoirs (12.5). cells : un ou deux noms de type (null = case vide).
  function typeBand(cells, y, h, o = {}) {
    const x0 = o.x == null ? 3 : o.x, w = o.w == null ? 194 : o.w, cw = w / cells.length;
    const cell = (t, k) => {
      const x = x0 + k * cw;
      if (!t) return `<rect x="${x}" y="${y}" width="${cw}" height="${h}" fill="${UI.cardDeep}" fill-opacity=".5"/>`;
      const col = typeColor(t), tl = t.length * 7.1 > cw - 10 ? ` textLength="${cw - 10}" lengthAdjust="spacingAndGlyphs"` : '';
      return `${o.gold ? `<rect x="${x}" y="${y}" width="${cw}" height="${h}" fill="${UI.cardDeep}" fill-opacity=".85"/>` : ''}<rect x="${x}" y="${y}" width="${cw}" height="${h}" fill="${col}" fill-opacity="${o.gold ? .3 : .22}"/>
        <text x="${x + cw / 2}" y="${y + h / 2 + 4.5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${o.gold ? UI.text : (o.tx || UI.text)}"${tl}>${esc(t)}</text>`;
    };
    return `<g>${cells.map(cell).join('')}${cells.length > 1 ? `<path d="M${x0 + cw} ${y} V${y + h}" stroke="${UI.cardDeep}" stroke-opacity=".7" stroke-width="1.5"/>` : ''}<path d="M${x0} ${y + h} H${x0 + w}" stroke="${UI.cardDeep}" stroke-opacity=".7" stroke-width="1.5"/></g>`;
  }

  // Couleur d'accent d'une carte (contour, rang, séparateurs) : un gris neutre pour toutes. Les couleurs des espèces
  // et des archétypes ne vivent que dans la bande de types, pour que le métier compte autant que l'espèce.
  const NEUTRAL = '#94a3b8';
  const accentOf = () => NEUTRAL;
  function pips(rank, x, y, col) {
    let out = '';
    for (let i = 0; i < rank; i++) out += `<path transform="translate(${x - i * 11} ${y})" d="M0 -5 L4.4 0 L0 5 L-4.4 0 Z" fill="${col}" stroke="${UI.cardDeep}" stroke-width="1"/>`;
    return out;
  }

  // Visuel central d'une carte : l'emblème de l'espèce avec l'archétype en médaillon,
  // ou l'icône d'archétype seule dans un cadre hexagonal quand il n'y a pas d'espèce.
  function artwork(types, col, cx, cy, gid) {
    const sp = types.find(isSpecies), arch = types.find(t => !isSpecies(t));
    const hex = (r, f, s) => `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => `${num(cx + r * Math.cos(Math.PI / 3 * i - Math.PI / 2))},${num(cy + r * Math.sin(Math.PI / 3 * i - Math.PI / 2))}`).join(' ')}" fill="${f}" stroke="${s}" stroke-width="1.5"/>`;
    if (sp) {
      return `<circle cx="${cx}" cy="${cy}" r="46" fill="${col}" fill-opacity=".12"/><circle cx="${cx}" cy="${cy}" r="38" fill="none" stroke="${col}" stroke-opacity=".35" stroke-dasharray="2 5"/>
        ${iconG(sp, cx - 36, cy - 38, 72, col, UI.cardDeep)}
        ${arch ? `<circle cx="${cx + 38}" cy="${cy + 26}" r="17" fill="${UI.cardDeep}" stroke="${typeColor(arch)}" stroke-width="2"/>${iconG(arch, cx + 38 - 10, cy + 26 - 10, 20, typeColor(arch))}` : ''}`;
    }
    return `${hex(46, col + '22', col + '88')}${hex(36, 'none', col + '55')}${iconG(arch, cx - 26, cy - 26, 52, col)}`;
  }

  // Pouvoirs d'une carte. powers : [{ key, name, text, count, kind, fixed, spent }] (voir powersOf dans donnees.js).
  // Un pouvoir « fixe » (toujours identique : mots-clés, Adaptation) n'a que son nom ; les autres sont décrits en toutes lettres.
  function powerRows(powers, y0, o) {
    const { tx, mu, gold, bottom } = o, rowH = 22;
    const fixed = powers.filter(p => p.fixed), others = powers.filter(p => !p.fixed);
    // Tout est en blanc (texte sombre sur une carte dorée), sans icône : la couleur et le style des pouvoirs viendront plus tard.
    const rows = fixed.map((p, i) => {
      const y = y0 + i * rowH, c = p.spent ? mu : tx;
      return `<text x="14" y="${y + 14}" font-size="12.5" font-weight="700" fill="${c}"${p.spent ? ' opacity=".5" text-decoration="line-through"' : ''}>${esc(p.name)}${p.count > 1 ? ` ×${p.count}` : ''}${p.spent ? ' (utilisé)' : ''}</text>`;
    }).join('');
    const y1 = y0 + fixed.length * rowH + (fixed.length ? 6 : 4), max = Math.max(1, Math.floor((bottom - y1) / 14.5));
    const lines = others.flatMap(p => wrap(p.text + (p.count > 1 ? ` (×${p.count})` : ''), 29).map((l, i) => ({ l, first: i === 0, col: tx }))).slice(0, max);
    // Le déclencheur (Début de combat, Râle d'agonie, Fin de renfort…) est en gras au début de chaque pouvoir décrit.
    const trig = /^(Début de combat|Fin de combat|Début de renfort|Fin de renfort|Râle d'agonie|Cri de guerre|Lorsqu'il y a de la place sur le plateau|Lorsqu'un drone est invoqué|Après chaque attaque reçue par un allié|Assaut) :/;
    const fmt = k => { const m = k.first && trig.exec(k.l); return m ? `<tspan font-weight="800">${esc(m[0])}</tspan>${esc(k.l.slice(m[0].length))}` : esc(k.l); };
    return rows + `<g font-size="11.5">${lines.map((k, i) => `<text x="14" y="${y1 + 10 + i * 14.5}" fill="${k.col}">${fmt(k)}</text>`).join('')}</g>`;
  }

  // ---------- Carte de serviteur (200 x 330) ----------
  // s : { name, rank, atk, hp, maxhp, types[], kw[], kwSpent?[], skillText?, skillKind? ('combat'|'renfort'), equips?[], gold? }
  // Chaque mot-clé est écrit sur la carte (nom + rappel de règle). Un mot-clé déjà consommé
  // (Bouclier perdu, Renaissance jouée) reste visible mais grisé et barré.
  function servantCard(s, o = {}) {
    const id = 'g' + (++GID), types = s.types.length ? s.types : [], col = accentOf(types);
    const maxhp = s.maxhp || s.hp, hurt = s.hp < maxhp, W = 200, H = 330;
    const gold = !!s.gold, tx = gold ? '#1a1304' : UI.text, mu = gold ? '#4d3a0a' : UI.muted, name = String(s.name).replace(gold ? / doré$/ : /$^/, ''), fs = name.length > 22 ? 11.5 : name.length > 17 ? 13 : 15;
    const kw = (s.kw || []).filter(k => KW_LABEL[k]), spent = s.kwSpent || [];
    const shieldUp = kw.includes('shield') && !spent.includes('shield');
    // Pouvoirs : fournis par le jeu (identiques fusionnés), sinon les seuls mots-clés.
    const powers = s.powers || kw.map(k => ({ key: k, name: KW_LABEL[k], fixed: true, count: 1, spent: spent.includes(k) }));
    const dead = s.hp <= 0 ? ' opacity=".45"' : '';
    const img = servantImage(s.id || name, o.imgBase);   // illustration pleine largeur dans la zone d'illustration
    const artY = 36, artH = 100, textY = 170, rowH = 24, gy = H - 30, badges = statBadges(id, s.atk, s.hp, hurt, W, H);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.width || W}" font-family="${FONT}"${dead}>
      <defs>
        <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".42"/><stop offset="1" stop-color="${UI.cardDeep}"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}"/><stop offset=".5" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".6"/></linearGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d16a"/><stop offset=".55" stop-color="#d6a62c"/><stop offset="1" stop-color="#a77a14"/></linearGradient>
        <radialGradient id="${id}c" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}k"><rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15"/></clipPath>
        ${badges.defs}
      </defs>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="${gold ? `url(#${id}f)` : UI.card}" stroke="url(#${id}b)" stroke-width="3"/>
      ${s.bg && scenes[s.bg] ? `<g clip-path="url(#${id}k)"><svg x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${scenes[s.bg](id + 's')}</svg><rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="${UI.cardDeep}" fill-opacity=".62"/></g>` : ''}
      ${shieldUp ? `<rect x="-2" y="-2" width="${W + 4}" height="${H + 4}" rx="18" fill="none" stroke="${SHIELD}" stroke-width="3" stroke-opacity=".9"/><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="13" fill="none" stroke="${SHIELD}" stroke-width="1.2" stroke-opacity=".6" stroke-dasharray="5 4"/>` : ''}
      <text x="14" y="27" font-size="${fs}" font-weight="700" fill="${tx}">${esc(name)}</text>
      <text x="186" y="28" text-anchor="end" font-size="18" font-weight="800" fill="${gold ? '#5a4208' : col}">${s.rank}</text>
      ${img ? (IMG_ENTIERE.includes(`serviteurs/${slugOf(s.id || name)}`)
        ? `<rect x="3" y="${artY}" width="${W - 6}" height="${artH}" fill="${UI.cardDeep}"/><image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="xMidYMid slice" opacity=".3"/><image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="${alignOf('serviteurs', s.id || name)} slice"/>`) : `<rect x="3" y="${artY}" width="${W - 6}" height="${artH}" fill="url(#${id}a)"/>
      <g clip-path="inset(${artY}px 3px ${H - artY - artH}px 3px)" opacity=".12" stroke="${col}">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${3 + i * 24} ${artY} l-40 ${artH}"/>`).join('')}</g>
      ${artwork(types, col, 100, artY + artH / 2, id)}`}
      <path d="M3 ${artY} H${W - 3} M3 ${artY + artH} H${W - 3}" stroke="${col}" stroke-opacity="${img ? .7 : .5}" stroke-width="1.5"/>
      ${s.bomb ? `<g><title>Bombe : ${s.bomb} dégâts à sa première attaque</title><circle cx="100" cy="${artY + artH - 16}" r="15" fill="#1b1b1f" stroke="#e5484d" stroke-width="2"/><path d="M106 ${artY + artH - 28} q5 -6 9 -3" fill="none" stroke="#f5a524" stroke-width="2"/><text x="100" y="${artY + artH - 10}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${s.bomb}</text></g>` : ''}
      ${typeBand([types.find(isSpecies) || null, types.find(t => !isSpecies(t)) || null], artY + artH, 24, { gold, tx })}
      ${powerRows(powers, textY, { tx, mu, gold, bottom: H - 40 })}
      ${s.equips && s.equips.length ? `<g><title>${esc(s.equips.join(', '))}</title>${iconG('equip', 78, gy - 8, 14, mu)}<text x="95" y="${gy + 4}" font-size="11" font-weight="700" fill="${mu}">×${s.equips.length}</text></g>` : ''}
      ${badges.body}
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="none" stroke="url(#${id}b)" stroke-width="3"/>
    </svg>`;
  }

  // ---------- Carte d'équipement (200 x 200) ----------
  // e : { name, rank, atk, hp, kw?, type?, skillText?, skillKind? }
  function equipCard(e, o = {}) {
    // Même gabarit que la carte de serviteur (200 x 330) : nom et niveau en haut, bonus d'ATQ et de PV dans les coins de l'illustration.
    const id = 'e' + (++GID), col = e.type ? typeColor(e.type) : '#9aa4b2', W = 200, H = 330;
    const fs = e.name.length > 22 ? 11.5 : e.name.length > 17 ? 13 : 15, artY = 36, artH = 100, textY = 170, rowH = 24, gy = H - 30, img = imageFor('equipements', e.id || e.name, o.imgBase), badges = statBadges(id, e.atk, e.hp, false, W, H, true);
    const powers = e.powers || (e.kw && KW_LABEL[e.kw] ? [{ key: e.kw, name: KW_LABEL[e.kw], fixed: true, count: 1 }] : []);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.width || W}" font-family="${FONT}">
      <defs>
        <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".42"/><stop offset="1" stop-color="${UI.cardDeep}"/></linearGradient>
        <clipPath id="${id}k"><rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15"/></clipPath>
      </defs>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="${UI.card}" stroke="${col}" stroke-width="3"/>
      <text x="14" y="27" font-size="${fs}" font-weight="700" fill="${UI.text}">${esc(e.name)}</text>
      <text x="186" y="28" text-anchor="end" font-size="18" font-weight="800" fill="${col}">${e.rank}</text>
      ${img ? (IMG_ENTIERE.includes(`equipements/${slugOf(e.id || e.name)}`)
        ? `<rect x="3" y="${artY}" width="${W - 6}" height="${artH}" fill="${UI.cardDeep}"/><image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="xMidYMid slice" opacity=".3"/><image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="${alignOf('equipements', e.id || e.name)} slice"/>`) : `<rect x="3" y="${artY}" width="${W - 6}" height="${artH}" fill="url(#${id}a)"/>
      <g clip-path="inset(${artY}px 3px ${H - artY - artH}px 3px)" opacity=".12" stroke="${col}">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${3 + i * 24} ${artY} l-40 ${artH}"/>`).join('')}</g>
      <circle cx="100" cy="${artY + artH / 2}" r="40" fill="${col}" fill-opacity=".14"/><circle cx="100" cy="${artY + artH / 2}" r="33" fill="none" stroke="${col}" stroke-opacity=".4" stroke-dasharray="2 5"/>
      ${iconG(e.type || 'equip', 76, artY + artH / 2 - 24, 48, col)}`}
      <path d="M3 ${artY} H${W - 3}" stroke="${col}" stroke-opacity="${img ? .7 : .5}" stroke-width="1.5"/>
      ${typeBand([e.type || 'Tous types'], artY + artH, 24, {})}
      ${powerRows(powers, textY, { tx: UI.text, mu: UI.muted, gold: false, bottom: H - 40 })}
      <text x="100" y="${gy + 4}" text-anchor="middle" font-size="9.5" font-weight="700" letter-spacing="2" fill="${UI.muted}">ÉQUIPEMENT</text>
      ${badges.body}
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="none" stroke="${col}" stroke-width="3"/>
    </svg>`;
  }

  // ---------- Décors de donjons (400 x 150) ----------
  const scenes = {
    // Le Nid de la Reine : un ravin luxuriant, parois couvertes de jungle, cascade et œufs lumineux.
    '1a919550-ffab-4fb7-819b-c69f34de9f82': id => `<defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9c8"/><stop offset=".45" stop-color="#4f9c78"/><stop offset="1" stop-color="#0d2a2a"/></linearGradient>
        <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8fff4" stop-opacity=".9"/><stop offset="1" stop-color="#5fd6c4" stop-opacity=".25"/></linearGradient>
        <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7ad9" stop-opacity=".95"/><stop offset="1" stop-color="#ff7ad9" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="150" fill="url(#${id}s)"/>
      <path d="M150 0 H250 L236 150 H164 Z" fill="#e8fff6" opacity=".18"/>
      <path d="M0 0 H120 C112 40 132 62 112 100 C100 124 118 140 104 150 H0 Z" fill="#183a2c"/>
      <path d="M400 0 H282 C292 36 270 66 292 104 C304 128 286 140 298 150 H400 Z" fill="#14342a"/>
      <path d="M0 0 H92 C86 36 100 56 84 92 C74 112 86 130 78 150 H0 Z" fill="#245c3c"/>
      <path d="M400 0 H312 C318 32 304 60 322 96 C332 118 320 134 326 150 H400 Z" fill="#1f5238"/>
      <path d="M196 30 C190 70 204 100 196 150 H206 C214 100 198 70 204 30 Z" fill="url(#${id}w)"/>
      ${[[20, 22, 26], [58, 14, 20], [104, 34, 18], [8, 70, 22], [66, 62, 17], [96, 88, 15], [372, 20, 24], [338, 12, 20], [296, 38, 17], [388, 66, 20], [330, 70, 16], [304, 94, 14]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.3}" ry="${r}" fill="#35a85a" opacity=".85"/><ellipse cx="${x + 4}" cy="${y - 3}" rx="${r * .8}" ry="${r * .6}" fill="#7fe08a" opacity=".6"/>`).join('')}
      <g stroke="#2f8a4c" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M30 40 C26 70 36 84 30 112"/><path d="M70 30 C66 54 78 70 72 96"/><path d="M360 36 C364 66 352 82 358 108"/><path d="M322 28 C318 52 330 66 324 90"/><path d="M110 60 C118 80 108 92 114 110"/></g>
      <rect y="124" width="400" height="26" fill="#0b2226"/>
      <path d="M0 126 C80 118 140 130 200 124 C260 118 330 130 400 124 V150 H0 Z" fill="#102f30"/>
      ${[[150, 128], [176, 134], [226, 130], [252, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="url(#${id}g)"/><ellipse cx="${x}" cy="${y}" rx="8" ry="11" fill="#ffc9f1"/><ellipse cx="${x - 2}" cy="${y - 3}" rx="3" ry="4" fill="#fff" opacity=".8"/>`).join('')}
      ${[[40, 100], [128, 56], [262, 80], [350, 104], [214, 56], [180, 92], [300, 50], [90, 118]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.6 : 2.4}" fill="#c8ff9a" opacity=".85"/>`).join('')}`,

    // Cité souterraine alien : caverne, flèches lumineuses, ponts et fleuve de lumière.
    'cdc3358f-45e7-4e54-a983-611346ec7bad': id => `<defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0716"/><stop offset=".7" stop-color="#2a1646"/><stop offset="1" stop-color="#3b2063"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58e0ff" stop-opacity=".85"/><stop offset="1" stop-color="#7a4dff" stop-opacity=".6"/></linearGradient>
        <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8af0ff" stop-opacity=".7"/><stop offset="1" stop-color="#8af0ff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="150" fill="url(#${id}s)"/>
      <circle cx="200" cy="70" r="90" fill="url(#${id}g)"/>
      <path d="M0 0 H400 V22 L384 12 L368 34 L346 14 L326 40 L300 16 L280 30 L252 10 L230 36 L206 12 L180 38 L158 14 L132 34 L110 12 L86 36 L60 14 L36 32 L14 16 L0 28 Z" fill="#05030c"/>
      ${[[40, 62, 40, 56], [92, 82, 26, 50], [140, 56, 30, 70], [262, 54, 30, 74], [312, 80, 26, 48], [356, 60, 40, 58]].map(([x, y, w, h]) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${150 - y}" fill="#1a1033" stroke="#5b3aa8" stroke-opacity=".5"/><path d="M${x - w / 2} ${y} L${x} ${y - 14} L${x + w / 2} ${y} Z" fill="#241546"/>${Array.from({ length: Math.floor(h / 12) }, (_, i) => `<rect x="${x - 3}" y="${y + 6 + i * 11}" width="6" height="5" rx="1" fill="${i % 3 ? '#ffd36b' : '#6fe3ff'}" opacity=".9"/>`).join('')}`).join('')}
      <path d="M186 150 V58 C186 44 194 34 200 18 C206 34 214 44 214 58 V150 Z" fill="#2a1a52" stroke="#8d6cff" stroke-opacity=".7"/>
      <path d="M200 18 V150" stroke="#8af0ff" stroke-opacity=".6"/>
      <circle cx="200" cy="52" r="9" fill="#8af0ff"/><circle cx="200" cy="52" r="4" fill="#fff"/>
      ${[0, 1, 2, 3, 4].map(i => `<rect x="192" y="${74 + i * 13}" width="16" height="4" rx="2" fill="#ffd36b" opacity=".85"/>`).join('')}
      <path d="M100 100 Q150 80 186 98 M214 98 Q250 80 300 100" fill="none" stroke="#8d6cff" stroke-width="4" stroke-opacity=".85"/>
      <path d="M0 126 C90 120 150 132 200 126 C260 120 320 132 400 124 V150 H0 Z" fill="url(#${id}r)"/>
      <path d="M20 134 H110 M150 140 H260 M300 134 H380" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>
      ${[[70, 40], [150, 28], [250, 34], [330, 26], [110, 90], [292, 100], [226, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#8af0ff"/>`).join('')}`,

    // Station Oméga : espace profond, anneau de station et cœur cyclope.
    '3561ab65-ea50-4a52-895b-966c0045a145': id => `<defs>
        <radialGradient id="${id}s" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#16203a"/><stop offset="1" stop-color="#04060e"/></radialGradient>
        <radialGradient id="${id}e" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6a5a"/><stop offset=".5" stop-color="#ff3b3b" stop-opacity=".7"/><stop offset="1" stop-color="#ff3b3b" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="150" fill="url(#${id}s)"/>
      ${Array.from({ length: 36 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 150}" r="${i % 5 ? .8 : 1.4}" fill="#cfe3ff" opacity="${.35 + (i % 4) * .15}"/>`).join('')}
      <circle cx="200" cy="75" r="62" fill="url(#${id}e)" opacity=".5"/>
      <ellipse cx="200" cy="78" rx="150" ry="34" fill="none" stroke="#3a4a6c" stroke-width="14"/>
      <ellipse cx="200" cy="78" rx="150" ry="34" fill="none" stroke="#7d93c0" stroke-width="2"/>
      ${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<rect x="${num(200 + Math.cos(a) * 150 - 3)}" y="${num(78 + Math.sin(a) * 34 - 2)}" width="6" height="4" fill="${i % 3 ? '#6fe3ff' : '#ffd36b'}"/>`; }).join('')}
      <path d="M200 8 V142 M170 20 L230 136 M230 20 L170 136" stroke="#2b3956" stroke-width="5"/>
      <circle cx="200" cy="75" r="34" fill="#141c30" stroke="#8aa0cc" stroke-width="3"/>
      <circle cx="200" cy="75" r="24" fill="#0a0f1c" stroke="#ff5a4a" stroke-width="2"/>
      <circle cx="200" cy="75" r="14" fill="#ff4a3a"/><circle cx="200" cy="75" r="6" fill="#ffd0c8"/><circle cx="196" cy="71" r="2.4" fill="#fff"/>
      <path d="M0 140 L70 118 L110 132 L60 150 H0 Z M400 140 L336 120 L296 134 L346 150 H400 Z" fill="#0d1424" stroke="#3a4a6c"/>`,

    // Forge de Brasier-Roc : volcan, fleuve de lave, enclume et cheminées.
    '0836ed8d-bcab-4dd9-aad7-a910b8612aa5': id => `<defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0d0d"/><stop offset=".6" stop-color="#8a2a10"/><stop offset="1" stop-color="#ff9a2e"/></linearGradient>
        <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff4a12"/></linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#${id}s)"/>
      <path d="M0 150 V84 L60 62 L120 90 L190 28 L230 28 L300 90 L350 66 L400 86 V150 Z" fill="#1b0a0a"/>
      <path d="M190 28 H230 L224 40 H196 Z" fill="#ff7a1a"/><path d="M204 28 C200 14 212 6 208 -4 M216 28 C220 12 210 4 216 -6" stroke="#ffb27a" stroke-opacity=".45" stroke-width="5" fill="none"/>
      ${[[56, 70, 12, 50], [330, 74, 14, 56]].map(([x, y, w, h]) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" fill="#2a1410" stroke="#5a2a1a"/><rect x="${x - w / 2 - 2}" y="${y - 4}" width="${w + 4}" height="5" fill="#3a1c14"/><circle cx="${x}" cy="${y - 14}" r="9" fill="#ffb27a" opacity=".25"/>`).join('')}
      <path d="M0 116 C70 108 120 124 200 116 C280 108 330 124 400 114 V150 H0 Z" fill="url(#${id}l)"/>
      <path d="M30 128 q18 -6 34 0 M150 134 q22 -7 44 0 M290 128 q18 -6 36 0" stroke="#fff3a8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
      <g fill="#0c0606"><path d="M158 118 H242 L234 104 H200 L206 92 H176 C168 92 166 100 172 104 H164 Z"/><rect x="186" y="118" width="28" height="18"/><rect x="170" y="134" width="60" height="8" rx="2"/></g>
      ${[[170, 80], [230, 70], [140, 60], [270, 90], [208, 56], [110, 96], [300, 62]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.4 : 2.2}" fill="#ffd27a"/>`).join('')}`
  };

  // Carte de donjon, format paysage (400 x 270). d : { id, name, type, boss: { name, hp, desc } }
  function dungeonCard(d, o = {}) {
    const id = 'd' + (++GID), W = 400, H = 270, col = typeColor(d.type), sel = !!o.selected;
    const scene = (scenes[d.id] || scenes['3561ab65-ea50-4a52-895b-966c0045a145'])(id);
    const desc = wrap(d.boss.desc, 62).slice(0, 3);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.width || W}" font-family="${FONT}">
      <defs><clipPath id="${id}c"><rect x="8" y="8" width="384" height="140" rx="10"/></clipPath>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient></defs>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="${UI.card}" stroke="${sel ? UI.gold : col}" stroke-opacity="${sel ? 1 : .55}" stroke-width="${sel ? 4 : 2.5}"/>
      <g clip-path="url(#${id}c)"><svg x="0" y="4" width="400" height="150" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${scene}</svg>
        <rect x="8" y="88" width="384" height="60" fill="url(#${id}f)"/></g>
      <rect x="8" y="8" width="384" height="140" rx="10" fill="none" stroke="${col}" stroke-opacity=".6"/>
      <text x="20" y="136" font-size="19" font-weight="800" fill="#fff" stroke="#000" stroke-opacity=".5" stroke-width=".6" paint-order="stroke">${esc(d.name)}</text>
      ${typeChipG(d.type, 20, 158)}
      <text x="380" y="173" text-anchor="end" font-size="11" fill="${UI.muted}">Boss</text>
      <text x="20" y="200" font-size="13" font-weight="700" fill="#ff9d8f">${esc(d.boss.name)}</text>
      <circle cx="372" cy="196" r="15" fill="${UI.hp}" stroke="${UI.cardDeep}" stroke-width="2"/><text x="372" y="202" text-anchor="middle" font-size="${d.boss.hp > 99 ? 13 : 15}" font-weight="800" fill="#fff">${d.boss.hp}</text>
      <g font-size="10.5" fill="${UI.muted}">${desc.map((l, i) => `<text x="20" y="${220 + i * 13}">${esc(l)}</text>`).join('')}</g>
    </svg>`;
  }

  // Décor seul (400 x 150), pour les bandeaux HTML.
  function dungeonScene(d, o = {}) {
    const id = 'd' + (++GID);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" width="${o.width || 400}" preserveAspectRatio="xMidYMid slice" font-family="${FONT}">${(scenes[d.id] || scenes.omega)(id)}</svg>`;
  }

  // Pastille de type à insérer dans un SVG existant (position x, y).
  function typeChipG(t, x, y) {
    const col = typeColor(t), w = Math.max(70, Math.ceil(31 + t.length * 6.4));
    return `<g><rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-opacity=".7"/>${iconG(t, x + 5, y + 3, 16, col, UI.card)}<text x="${x + 26}" y="${y + 15}" font-size="11" font-weight="600" fill="${UI.text}">${esc(t)}</text></g>`;
  }

  // Même pastille que sur les cartes de donjon et de héros, en balise <svg> autonome pour les pages HTML.
  function typeChipSvg(t) {
    const w = Math.max(70, Math.ceil(31 + t.length * 6.4)) + 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 24" width="${w}" height="24" font-family="${FONT}">${typeChipG(t, 1, 1)}</svg>`;
  }

  // Jauge d'étincelles de Reyes : 6 crans, les n premiers allumés (valeur X du dernier patch cybernétique).
  function patchGauge(n, x, y) {
    return `<g><title>Dernier patch cybernétique : +${n}/+${n}</title>${Array.from({ length: 6 }, (_, i) => {
      const on = i < n, cx = x + i * 17;
      return `<path class="${on ? 'eclair' : 'cran'}" d="M${cx + 5} ${y + 2} l-3 6 h4 l-3 6 l8 -8 h-4 l3 -4 z" transform="translate(0 0)" fill="${on ? '#7de8ff' : 'none'}" stroke="${on ? '#e8fbff' : UI.muted}" stroke-opacity="${on ? 1 : .4}" stroke-width="1"${on ? ' style="filter:drop-shadow(0 0 3px #38d4ff)"' : ''}/>`;
    }).join('')}</g>`;
  }

  // Carte de héros, format paysage (400 x 190) : portrait à gauche (emblème d'espèce + médaillon d'archétype), texte à droite.
  // h : { name, types[], hp, kw?, powerText, powerKind }
  function heroCard(h, o = {}) {
    const id = 'h' + (++GID), W = 400, H = 190, types = h.types, col = accentOf(types), sel = !!o.selected, img = imageFor('lieutenants', h.id || h.name, o.imgBase);
    const sp = types.find(isSpecies), arch = types.find(t => !isSpecies(t)), ac = arch ? typeColor(arch) : col;
    const lines = wrap(h.powerText || '', 34).slice(0, 4), hurt = !!h.maxhp && h.hp < h.maxhp;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.width || W}" font-family="${FONT}"${h.hp <= 0 ? ' opacity=".5"' : ''}>
      <defs>
        <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset="1" stop-color="${UI.cardDeep}"/></linearGradient>
        <radialGradient id="${id}c" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}k"><rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15"/></clipPath>
        <clipPath id="${id}p"><path d="M150 3 H16 a13 13 0 0 0 -13 13 V174 a13 13 0 0 0 13 13 H150 Z"/></clipPath>
      </defs>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="${UI.card}" stroke="${sel ? UI.gold : col}" stroke-opacity="${sel ? 1 : .6}" stroke-width="${sel ? 4 : 2.5}"/>
      <g clip-path="url(#${id}p)">${img ? `<image href="${esc(img)}" x="3" y="3" width="147" height="184" preserveAspectRatio="${alignOf('lieutenants', h.id || h.name)} slice"/>` : `<rect x="3" y="3" width="147" height="184" fill="url(#${id}a)"/>
        <g opacity=".13" stroke="${col}">${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${3 + i * 26} 3 l-60 184"/>`).join('')}</g>
        <circle cx="77" cy="94" r="56" fill="${col}" fill-opacity=".14"/><circle cx="77" cy="94" r="47" fill="none" stroke="${col}" stroke-opacity=".4" stroke-dasharray="2 5"/>
        ${sp ? iconG(sp, 33, 50, 88, col, UI.cardDeep) : ''}
        ${arch ? `<circle cx="121" cy="154" r="20" fill="${UI.cardDeep}" stroke="${ac}" stroke-width="2.5"/>${iconG(arch, 109, 142, 24, ac)}` : ''}`}</g>
      <path d="M150 3 V187" stroke="${col}" stroke-opacity=".6" stroke-width="1.5"/>
      <text x="168" y="34" font-size="${h.name.length > 16 ? 16 : 19}" font-weight="800" fill="${UI.text}">${esc(h.name)}</text>
      ${typeBand([sp || null, arch || null], 46, 24, { x: 150, w: 247 })}
      ${h.hp <= 0 ? `<text x="168" y="${H - 14}" font-size="12" font-weight="800" fill="#ff9d8f">À TERRE : pouvoir perdu</text>` : ''}
      ${h.kw && KW_LABEL[h.kw] ? `<g><circle cx="180" cy="86" r="10" fill="${UI.cardDeep}" stroke="${UI.text}" stroke-opacity=".8"/>${iconG(KW_ICON[h.kw], 173, 79, 14, UI.text)}<text x="196" y="90" font-size="11" font-weight="700" fill="${h.kw === 'shield' ? SHIELD : UI.text}">${KW_LABEL[h.kw]}</text></g>` : ''}
      ${h.patch ? patchGauge(h.patch, 282, 78) : ''}
      <line x1="168" y1="106" x2="388" y2="106" stroke="${col}" stroke-opacity=".3"/>
      <g font-size="11.5">${lines.map((l, i) => `<text x="168" y="${126 + i * 15}" fill="${h.powerKind === 'renfort' ? '#7ad0ff' : '#ff9d8f'}">${esc(l)}</text>`).join('')}</g>
      <g clip-path="url(#${id}k)"><title>PV : ${h.maxhp ? `${h.hp}/${h.maxhp}` : h.hp}</title>${hpBadge(h.hp, hurt, W, H)}</g>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="none" stroke="${sel ? UI.gold : col}" stroke-opacity="${sel ? 1 : .6}" stroke-width="${sel ? 4 : 2.5}"/>
    </svg>`;
  }

  // Carte de héros, format portrait (200 x 330), même gabarit que les serviteurs : emblème d'espèce, médaillon d'archétype, PV, pouvoir.
  // h : { name, types[], hp, maxhp?, kw?, powerText, powerKind }
  function heroPortrait(h, o = {}) {
    const id = 'p' + (++GID), W = 200, H = 330, types = h.types, col = accentOf(types), sel = !!o.selected, down = h.hp <= 0, img = imageFor('lieutenants', h.id || h.name, o.imgBase);
    const sp = types.find(isSpecies), arch = types.find(t => !isSpecies(t)), ac = arch ? typeColor(arch) : col;
    const artY = 36, artH = 100, kwY = 172, lineY = kwY + (h.kw && KW_LABEL[h.kw] ? 44 : 14);
    const lines = wrap(h.powerText || '', 33).slice(0, Math.floor((H - 40 - lineY) / 13));
    const hurt = !!h.maxhp && h.hp < h.maxhp;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.width || W}" font-family="${FONT}"${down ? ' opacity=".5"' : ''}>
      <defs>
        <clipPath id="${id}k"><rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15"/></clipPath>
        <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".5"/><stop offset="1" stop-color="${UI.cardDeep}"/></linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="${UI.card}" stroke="${sel ? UI.gold : col}" stroke-opacity="${sel ? 1 : .7}" stroke-width="${sel ? 4 : 3}"/>
      <text x="14" y="27" font-size="${h.name.length > 16 ? 12.5 : 14.5}" font-weight="800" fill="${UI.text}">${esc(h.name)}</text>
      ${img ? `<image href="${esc(img)}" x="3" y="${artY}" width="${W - 6}" height="${artH}" preserveAspectRatio="${alignOf('lieutenants', h.id || h.name)} slice"/>` : `<rect x="3" y="${artY}" width="${W - 6}" height="${artH}" fill="url(#${id}a)"/>
      <g clip-path="inset(${artY}px 3px ${H - artY - artH}px 3px)" opacity=".13" stroke="${col}">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${3 + i * 24} ${artY} l-40 ${artH}"/>`).join('')}</g>
      <circle cx="100" cy="${artY + artH / 2}" r="46" fill="${col}" fill-opacity=".14"/><circle cx="100" cy="${artY + artH / 2}" r="38" fill="none" stroke="${col}" stroke-opacity=".4" stroke-dasharray="2 5"/>
      ${sp ? iconG(sp, 60, artY + artH / 2 - 40, 80, col, UI.cardDeep) : ''}
      ${arch ? `<circle cx="164" cy="${artY + artH - 20}" r="17" fill="${UI.cardDeep}" stroke="${ac}" stroke-width="2.5"/>${iconG(arch, 154, artY + artH - 30, 20, ac)}` : ''}`}
      <path d="M3 ${artY} H${W - 3}" stroke="${col}" stroke-opacity="${img ? .7 : .6}" stroke-width="1.5"/>
      ${typeBand([sp || null, arch || null], artY + artH, 24, {})}
      ${h.kw && KW_LABEL[h.kw] ? `<g><circle cx="23" cy="${kwY + 10}" r="10" fill="${UI.cardDeep}" stroke="${UI.text}" stroke-opacity=".8"/>${iconG(KW_ICON[h.kw], 16, kwY + 3, 14, h.kw === 'shield' ? SHIELD : UI.text)}
        <text x="40" y="${kwY + 9}" font-size="10.5" font-weight="700" fill="${h.kw === 'shield' ? SHIELD : UI.text}">${KW_LABEL[h.kw]}</text><text x="40" y="${kwY + 20}" font-size="8.5" fill="${UI.muted}">${KW_DESC[h.kw]}</text></g>` : ''}
      <line x1="14" y1="${lineY - 8}" x2="186" y2="${lineY - 8}" stroke="${col}" stroke-opacity=".3"/>
      <g font-size="10.5">${lines.map((l, i) => `<text x="14" y="${lineY + 8 + i * 13}" fill="${h.powerKind === 'renfort' ? '#7ad0ff' : '#ff9d8f'}">${esc(l)}</text>`).join('')}</g>
      ${down ? `<text x="14" y="${H - 14}" font-size="10.5" font-weight="800" fill="#ff9d8f">À TERRE : pouvoir perdu</text>` : ''}
      <g clip-path="url(#${id}k)"><title>PV : ${h.maxhp ? `${h.hp}/${h.maxhp}` : h.hp}</title>${hpBadge(h.hp, hurt, W, H)}</g>
      <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="none" stroke="${sel ? UI.gold : col}" stroke-opacity="${sel ? 1 : .7}" stroke-width="${sel ? 4 : 3}"/>
    </svg>`;
  }

  const api = { SPECIES, SPECIES_COLOR, FAMILY_COLOR, ARCH_FAMILY, UI, typeColor, isSpecies, ICONS, KW_LABEL, KW_DESC, icon, iconG, typeChip, servantCard, servantImage, imageFor, alignOf, slugOf, equipCard, heroCard, heroPortrait, dungeonCard, dungeonScene, typeChipSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AWGfx = api;
})(typeof window !== 'undefined' ? window : globalThis);
