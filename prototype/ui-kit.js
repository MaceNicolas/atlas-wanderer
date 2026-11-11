// Atlas Wanderer — the interface kit: draws a screen from its description in game.json (ui.screens). The engine owns the widgets and the few HTML tags a
// description may use; the mod chooses and assembles them (decision 2 of flux-de-jeu.md: widgets of the engine, no HTML of the mod).
// A screen is a list of nodes. A node is
//   { widget: name, ...props }                  a widget of the engine (the interface registers them with UIKIT.define)
//   { tag, class, attrs, children: [nodes] }    a container (tags and class names are checked by the validation of the description)
//   { text: key }                               a text of the mod                { literal: "…" } a fixed text (escaped)
const UIKIT = (() => {
  const widgets = {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function node(n) {
    if (n.widget) { if (!widgets[n.widget]) throw new Error(`unknown widget "${n.widget}"`); return widgets[n.widget](n); }
    if ('text' in n) return I18N.t(n.text);
    if ('literal' in n) return esc(n.literal);
    const attrs = Object.entries(n.attrs || {}).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
    return `<${n.tag}${n.class ? ` class="${n.class}"` : ''}${attrs}>${render(n.children || [])}</${n.tag}>`;
  }
  const render = nodes => nodes.map(node).join('');
  return { define: (name, fn) => { widgets[name] = fn; }, render, widgets, esc };
})();
