// Atlas Wanderer — local saves (localStorage): the crew profile and the expedition in progress.
'use strict';
// Two separate layers:
// - PROFILE: the crew's meta-progression. It survives expeditions and is NEVER refused: an older version
//   is migrated, missing fields receive their default value.
// - SAVE: the expedition (one dungeon) in progress. It is disposable: if it is no longer compatible, we offer to abandon it.
// Expedition: the game (UI.g) and the reinforcement state (UI.rf) are saved at each stable render of the reinforcement screen.
// Catalog entries (heroes, dungeons, servants, equipment) are not copied: we keep their identifier
// and find them again on loading, so that the engine's identity comparisons (h.def === f.def) stay true.
// Shared objects (for example the PR model, at once in g.pr, the hand and the board) stay shared.
const SAVE_KEY = 'atlasWandererSave';
// Increment as soon as the shape of g or rf changes incompatibly: older saves are then refused.
const SAVE_VERSION = 4;   // 4: types are English identifiers (pilot, droid…) instead of French names

const SAVE = (() => {
  const catalogs = () => ({ HEROES, HEROES_RESERVE, DUNGEONS, SERVANTS: Object.fromEntries(SERVANTS.map(d => [d.id, d])), EQUIPS: Object.fromEntries(EQUIPS.map(d => [d.id, d])) });
  const catalogIndex = () => {
    const m = new Map();
    Object.entries(catalogs()).forEach(([cat, list]) => Object.entries(list).forEach(([id, d]) => m.set(d, { cat, id })));
    return m;
  };
  // Fingerprint of the game data: used to flag that the cards have changed since the save (without blocking the load).
  const dataHash = () => {
    const txt = JSON.stringify(catalogs());
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  function encode(root) {
    const cat = catalogIndex(), count = new Map();
    // Pass 1: finds the objects met several times.
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
    const cats = catalogs(), refs = new Map();
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
    // Save state for the menu: null (none), { ok:true, info } or { ok:false, reason }.
    peek() {
      const raw = read();
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        if (!s || s.version !== SAVE_VERSION) return { ok: false, reason: 'ui.saveOldVersion' };
        // The check decoding detects cards that no longer exist.
        const g = decode(s.g);
        return { ok: true, info: { date: s.date, room: g.room, dungeon: g.dungeon.name, heroes: g.heroes.map(h => h.def.name), level: g.level }, dataChanged: s.hash !== dataHash() };
      } catch (e) { return { ok: false, reason: 'ui.saveIncompatible', detail: e.message }; }
    },
    save(g, rf) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, hash: dataHash(), date: Date.now(), uid: UID, g: encode(g), rf: encode(rf) }));
        return true;
      } catch (e) { return false; }   // storage full or unavailable: the game continues without a save
    },
    // Returns { g, rf } or null. A failure erases nothing: the menu offers to delete.
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
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ } }
  };
})();

// ---------- Crew profile ----------
const PROFILE_KEY = 'atlasWandererProfil';
const PROFILE_VERSION = 1;
const PROFILE = (() => {
  // Default values: any new profile field is added here, old profiles receive it on reading.
  const defaults = () => ({ version: PROFILE_VERSION, prWins: 0 });
  // MIGRATIONS[n] takes a profile from version n to n+1 (for shape changes that the default values do not cover).
  const MIGRATIONS = {};
  let cache = null;
  const read = () => { try { return localStorage.getItem(PROFILE_KEY); } catch (e) { return null; } };
  const write = p => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable: the profile stays in memory */ } };
  function charger() {
    const raw = read();
    if (raw == null) {
      // First launch: takes over the old PR win counter, which used to live alone under its own key.
      const p = defaults();
      try { p.prWins = Math.max(0, parseInt(localStorage.getItem('atlasWandererPrWins'), 10) || 0); } catch (e) { /* no old counter */ }
      return p;
    }
    let p;
    try { p = JSON.parse(raw); if (!p || typeof p !== 'object') throw new Error('profil invalide'); }
    catch (e) {
      // Unreadable profile: we set it aside instead of overwriting it, and start again from a new profile.
      try { localStorage.setItem(PROFILE_KEY + '.corrompu', raw); } catch (e2) { /* too bad */ }
      return defaults();
    }
    for (let v = Number(p.version) || 0; v < PROFILE_VERSION; v++) if (MIGRATIONS[v]) p = MIGRATIONS[v](p);
    const out = { ...defaults(), ...p, version: PROFILE_VERSION };
    out.prWins = Math.max(0, Math.floor(Number(out.prWins)) || 0);
    return out;
  }
  return {
    get() { return cache || (cache = charger()); },
    update(fn) { const p = this.get(); fn(p); write(p); },
    // Tests only: forgets the cache to read the storage again.
    _reset() { cache = null; }
  };
})();
