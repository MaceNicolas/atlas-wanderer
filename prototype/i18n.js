// Atlas Wanderer — texts in several languages (fr, en), loaded from data/i18n/<lang>.json.
// The same code path runs on GitHub Pages and on the local server (tools/local-server.js): a plain fetch of static files, no generated bundle.
// French is the reference language and the fallback; a key missing everywhere is shown as itself.
// Usage: I18N.t('type.pilot') · I18N.t('log.stats', { source: 'A', target: 'B' }) with "{source}" placeholders in the text.
const I18N = (() => {
  const LANGS = ['fr', 'en'];
  const tables = {}, missing = new Set();
  let lang = 'fr';
  // Base URL of the data folder, computed from this script's own address so that it works wherever the site is served (root or sub-folder).
  const base = typeof document !== 'undefined' && document.currentScript ? new URL('../data/i18n/', document.currentScript.src).href : '../data/i18n/';

  const banner = message => {
    if (typeof document === 'undefined' || !document.body) return;
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100;padding:10px 16px;background:#7f1d1d;color:#fff;font:600 14px system-ui,sans-serif;text-align:center';
    b.textContent = message;
    document.body.appendChild(b);
  };

  // Loads one language (and French as fallback). 'no-cache' = the browser revalidates with the server (ETag): always fresh, cheap when unchanged.
  const load = async code => {
    for (const l of new Set(['fr', code])) {
      if (tables[l]) continue;
      const r = await fetch(`${base}${l}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`${l}.json: HTTP ${r.status}`);
      tables[l] = await r.json();
    }
    lang = code;
  };

  const t = (key, params) => {
    let text = (tables[lang] || {})[key];
    if (text == null) { text = (tables.fr || {})[key]; if (lang !== 'fr') missing.add(key); }
    if (text == null) { missing.add(key); return key; }
    return params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m)) : text;
  };

  // Starts loading at once, without blocking the game. When it fails (file:// opening, missing file, offline), say how to fix it instead of leaving the game half empty.
  const ready = (typeof fetch === 'undefined' ? Promise.resolve() : load(lang)).catch(e => {
    const where = typeof location !== 'undefined' && location.protocol === 'file:'
      ? 'Ouvrez le jeu via le serveur local : node tools/local-server.js, puis http://localhost:8080/prototype/prototype.html'
      : 'Rechargez la page.';
    banner(`Les textes du jeu n'ont pas pu être chargés (${e.message}). ${where}`);
    throw e;
  });
  ready.catch(() => {});   // the error is already shown by the banner: avoid an unhandled-rejection report

  return { LANGS, load, t, ready, missing, get lang() { return lang; }, setLanguage: async code => { await load(code); } };
})();
if (typeof module !== 'undefined') module.exports = I18N;
