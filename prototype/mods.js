// Atlas Wanderer — mod loader. The engine holds no game content: the cards, the rules, the power templates, the texts and the illustrations
// all come from a mod, a folder data/mods/<id>/ described by its mod.json (spec: documentation/mecaniques/pouvoirs-modulaires.md, section 19.3).
// Atlas Wanderer is itself a mod. Which mod is played: ?mod=<id> in the address, otherwise the one remembered, otherwise the "default" of data/mods.json.
// Must be loaded before i18n.js, powers.js and data.js, which wait for MOD.ready.
const MOD = (() => {
  const dataBase = typeof document !== 'undefined' && document.currentScript ? new URL('../data/', document.currentScript.src).href : '../data/';
  const KEY = 'atlasWandererMod';
  const state = { id: null, manifest: null, registry: null, base: null };
  const get = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const wanted = () => {
    try { const p = new URLSearchParams(location.search).get('mod'); if (p) return p; } catch (e) { /* no address (tools) */ }
    return get(KEY);
  };
  const fetchJson = async url => {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${url.split('/').slice(-2).join('/')}: HTTP ${r.status}`);
    return r.json();
  };
  // The illustration index of the mod (AW_IMAGES, AW_ART) is a script, as the cards are drawn synchronously.
  const loadScript = src => new Promise((ok, ko) => {
    if (typeof document === 'undefined' || !document.head || typeof document.createElement !== 'function') return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = () => ok(); s.onerror = () => ko(new Error(`${src.split('/').slice(-2).join('/')}: not found`));
    document.head.appendChild(s);
  });
  // Tools hand the mod over directly: MOD.install(id, manifest, registry).
  const install = (id, manifest, registry) => { state.id = id; state.manifest = manifest; state.registry = registry || null; state.base = `${dataBase}mods/${id}/`; };
  const load = async () => {
    state.registry = await fetchJson(`${dataBase}mods.json`);
    const w = wanted(), id = state.registry.mods.includes(w) ? w : state.registry.default;
    install(id, await fetchJson(`${dataBase}mods/${id}/mod.json`), state.registry);
    try { localStorage.setItem(KEY, id); } catch (e) { /* private window: the choice is kept for this visit only */ }
    if (state.manifest.imageIndex) await loadScript(state.base + state.manifest.imageIndex);
  };
  const ready = typeof fetch === 'undefined' ? Promise.resolve() : load();
  ready.catch(e => { if (typeof I18N !== 'undefined' && I18N.banner) I18N.banner(`Le mod du jeu n'a pas pu être chargé (${e.message}). Rechargez la page, ou lancez le jeu via le serveur local.`); });
  return {
    dataBase, ready, install, KEY,
    get id() { return state.id; }, get manifest() { return state.manifest; }, get registry() { return state.registry; }, get base() { return state.base; },
    // Every mod of the registry with its manifest (selection page).
    catalog: async () => { await ready; return Promise.all(state.registry.mods.map(async id => ({ id, manifest: await fetchJson(`${dataBase}mods/${id}/mod.json`), isDefault: id === state.registry.default, current: id === state.id }))); },
    url: rel => `${state.base}${rel}`,                                // a file of the mod
    file: key => `${state.base}${state.manifest.files[key]}`,         // a data file of the mod, by its role (servants, rules, powers…)
    imagesBase: () => `${state.base}${state.manifest.images}`,        // folder of the illustrations of the mod
    // Key under which the saves of this mod are kept in the browser (a save never mixes two mods).
    storageKey: base => `${base}.${state.id}`
  };
})();
if (typeof module !== 'undefined') module.exports = MOD;
