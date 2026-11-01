// Atlas Wanderer — sauvegardes locales (localStorage) : le profil d'équipage et l'expédition en cours.
'use strict';
// Deux couches séparées :
// - PROFIL : la méta-progression de l'équipage. Elle survit aux expéditions et n'est JAMAIS refusée : une version plus
//   ancienne est migrée, les champs manquants reçoivent leur valeur par défaut.
// - SAVE : l'expédition (un donjon) en cours. Elle est jetable : si elle n'est plus compatible, on propose de l'abandonner.
// Expédition : la partie (UI.g) et l'état du renfort (UI.rf) sont enregistrés à chaque rendu stable de l'écran de renfort.
// Les fiches du catalogue (lieutenants, donjons, serviteurs, équipements) ne sont pas copiées : on garde leur identifiant
// et on les retrouve au chargement, pour que les comparaisons par identité du moteur (h.def === f.def) restent vraies.
// Les objets partagés (par exemple le modèle PR, à la fois dans g.pr, la main et le plateau) restent partagés.
const SAVE_KEY = 'atlasWandererSave';
// À incrémenter dès que la forme de g ou de rf change de façon incompatible : les anciennes sauvegardes sont alors refusées.
const SAVE_VERSION = 1;

const SAVE = (() => {
  const catalogues = () => ({ HEROES, HEROES_RESERVE, DUNGEONS, SERVANTS: Object.fromEntries(SERVANTS.map(d => [d.id, d])), EQUIPS: Object.fromEntries(EQUIPS.map(d => [d.id, d])) });
  const catalogIndex = () => {
    const m = new Map();
    Object.entries(catalogues()).forEach(([cat, list]) => Object.entries(list).forEach(([id, d]) => m.set(d, { cat, id })));
    return m;
  };
  // Empreinte des données du jeu : sert à signaler que les cartes ont changé depuis la sauvegarde (sans bloquer le chargement).
  const dataHash = () => {
    const txt = JSON.stringify(catalogues());
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  function encode(root) {
    const cat = catalogIndex(), count = new Map();
    // Passe 1 : repère les objets rencontrés plusieurs fois.
    const scan = v => {
      if (!v || typeof v !== 'object' || cat.has(v)) return;
      count.set(v, (count.get(v) || 0) + 1);
      if (count.get(v) > 1) return;
      (Array.isArray(v) ? v : Object.values(v)).forEach(scan);
    };
    scan(root);
    const ids = new Map();
    const enc = v => {
      if (typeof v === 'function') throw new Error('fonction dans l\'état de la partie');
      if (typeof v === 'number' && !Number.isFinite(v)) return { $num: String(v) };
      if (!v || typeof v !== 'object') return v;
      if (cat.has(v)) return { $cat: cat.get(v).cat, id: cat.get(v).id };
      if (ids.has(v)) return { $ref: ids.get(v) };
      let id;
      if (count.get(v) > 1) { id = ids.size + 1; ids.set(v, id); }
      if (Array.isArray(v)) { const a = v.map(enc); return id ? { $id: id, $arr: a } : a; }
      const o = {};
      Object.keys(v).forEach(k => { if (v[k] !== undefined) o[k] = enc(v[k]); });
      return id ? { $id: id, $obj: o } : o;
    };
    return enc(root);
  }

  function decode(data) {
    const cats = catalogues(), refs = new Map();
    const dec = v => {
      if (!v || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map(dec);
      if ('$num' in v) return Number(v.$num);
      if ('$cat' in v) {
        const d = cats[v.$cat] && cats[v.$cat][v.id];
        if (!d) throw new Error(`carte disparue du jeu : ${v.$cat} « ${v.id} »`);
        return d;
      }
      if ('$ref' in v) {
        if (!refs.has(v.$ref)) throw new Error('référence interne invalide');
        return refs.get(v.$ref);
      }
      if ('$id' in v) {
        const target = '$arr' in v ? [] : {};
        refs.set(v.$id, target);
        if ('$arr' in v) v.$arr.forEach(x => target.push(dec(x)));
        else Object.keys(v.$obj).forEach(k => { target[k] = dec(v.$obj[k]); });
        return target;
      }
      const o = {};
      Object.keys(v).forEach(k => { o[k] = dec(v[k]); });
      return o;
    };
    return dec(data);
  }

  const read = () => { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } };

  return {
    // État de la sauvegarde pour le menu : null (aucune), { ok:true, info } ou { ok:false, raison }.
    peek() {
      const raw = read();
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        if (!s || s.version !== SAVE_VERSION) return { ok: false, raison: 'La sauvegarde vient d\'une ancienne version du jeu.' };
        // Le décodage de contrôle détecte les cartes qui n'existent plus.
        const g = decode(s.g);
        return { ok: true, info: { date: s.date, room: g.room, dungeon: g.dungeon.name, heroes: g.heroes.map(h => h.def.name), level: g.level }, dataChanged: s.hash !== dataHash() };
      } catch (e) { return { ok: false, raison: `La sauvegarde n'est plus compatible (${e.message}).` }; }
    },
    save(g, rf) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, hash: dataHash(), date: Date.now(), uid: UID, g: encode(g), rf: encode(rf) }));
        return true;
      } catch (e) { return false; }   // stockage plein ou indisponible : la partie continue sans sauvegarde
    },
    // Renvoie { g, rf } ou null. Un échec n'efface rien : le menu propose de supprimer.
    load() {
      try {
        const s = JSON.parse(read());
        if (!s || s.version !== SAVE_VERSION) return null;
        const out = { g: decode(s.g), rf: decode(s.rf) };
        if (!out.g || !Array.isArray(out.g.board) || !Array.isArray(out.g.hand) || !Array.isArray(out.g.heroes) || !out.rf) return null;
        UID = Math.max(UID, s.uid || 0);
        return out;
      } catch (e) { return null; }
    },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* stockage indisponible */ } }
  };
})();

// ---------- Profil d'équipage ----------
const PROFIL_KEY = 'atlasWandererProfil';
const PROFIL_VERSION = 1;
const PROFIL = (() => {
  // Valeurs par défaut : tout nouveau champ du profil s'ajoute ici, les anciens profils le reçoivent à la lecture.
  const defaut = () => ({ version: PROFIL_VERSION, prWins: 0 });
  // MIGRATIONS[n] fait passer un profil de la version n à n+1 (pour les changements de forme que les valeurs par défaut ne couvrent pas).
  const MIGRATIONS = {};
  let cache = null;
  const lire = () => { try { return localStorage.getItem(PROFIL_KEY); } catch (e) { return null; } };
  const ecrire = p => { try { localStorage.setItem(PROFIL_KEY, JSON.stringify(p)); } catch (e) { /* stockage indisponible : le profil reste en mémoire */ } };
  function charger() {
    const raw = lire();
    if (raw == null) {
      // Premier lancement : reprend l'ancien compteur de victoires PR, qui vivait seul sous sa propre clé.
      const p = defaut();
      try { p.prWins = Math.max(0, parseInt(localStorage.getItem('atlasWandererPrWins'), 10) || 0); } catch (e) { /* aucun ancien compteur */ }
      return p;
    }
    let p;
    try { p = JSON.parse(raw); if (!p || typeof p !== 'object') throw new Error('profil invalide'); }
    catch (e) {
      // Profil illisible : on le met de côté au lieu de l'écraser, et on repart d'un profil neuf.
      try { localStorage.setItem(PROFIL_KEY + '.corrompu', raw); } catch (e2) { /* tant pis */ }
      return defaut();
    }
    for (let v = Number(p.version) || 0; v < PROFIL_VERSION; v++) if (MIGRATIONS[v]) p = MIGRATIONS[v](p);
    const out = { ...defaut(), ...p, version: PROFIL_VERSION };
    out.prWins = Math.max(0, Math.floor(Number(out.prWins)) || 0);
    return out;
  }
  return {
    get() { return cache || (cache = charger()); },
    update(fn) { const p = this.get(); fn(p); ecrire(p); },
    // Tests uniquement : oublie le cache pour relire le stockage.
    _reset() { cache = null; }
  };
})();
