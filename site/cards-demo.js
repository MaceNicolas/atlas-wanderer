// Shows the cards of the open mod as the engine draws them: its default layout, rewritten by what the mod says (game.json, ui.cards).
// Used by the "Aperçu" tab of the editor. Needs the engine scripts with the mod installed and prototype/svg.js.
const CardsDemo = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = '.cd-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; margin: var(--s-3) 0 var(--s-5); } .cd-row figure { margin: 0; width: var(--w, 11rem); text-align: center; } .cd-row figcaption { font-size: .8rem; opacity: .7; margin-top: .3rem; } .cd-small { --w: 6.5rem; } .cd-wide { --w: 24rem; }';
  function mount(root) {
    if (!document.getElementById('cards-demo-css')) { const s = document.createElement('style'); s.id = 'cards-demo-css'; s.textContent = css; document.head.appendChild(s); }
    const o = { width: '100%', imgBase: MOD.imagesBase() }, fig = (svg, label, cls) => `<figure class="${cls || ''}">${svg}<figcaption>${esc(label)}</figcaption></figure>`;
    const servant = (c, sockets, slots) => { const m = mkServant(c); if (sockets) { m.sockets = sockets; m.slots = slots || []; } return AWGfx.servantCard({ ...m, kwSpent: [], powers: powersOf(m.kw, skillsOf(m), null) }, o); };
    const heroProps = h => ({ id: h.id, name: h.name, types: h.types, hp: h.hp, kw: h.kw, powerText: h.power ? skDesc(h.power) : '', powerKind: h.power ? TRIG_KIND[h.power.t] : 'renfort' });
    const servants = SERVANTS.slice(0, 4), longest = [...SERVANTS].sort((a, b) => b.name.length - a.name.length)[0];
    const eq = EQUIPS.filter(e => !e.token).slice(0, 3), colors = ['blue', 'green', 'red', 'chroma'], heroes = Object.values(HEROES), dun = Object.values(DUNGEONS).slice(0, 2);
    const rows = [];
    rows.push('<p class="discret">Le modèle du moteur (<code>prototype/card-layout.js</code>) réécrit par ce que le mod en dit (<code>game.json</code>, <code>ui.cards</code>). Les chasses sont ajoutées ici pour montrer 0 à 3 chasses, vides ou occupées.</p>');
    if (servants.length) {
      rows.push('<h3>Serviteurs</h3><div class="cd-row">' + servants.map((c, i) => fig(servant(c, i ? colors.slice(0, i) : [], i === 2 && eq[0] ? [eq[0]] : []), `${c.name} : ${i} chasse(s)`)).join('') + '</div>');
      rows.push('<h3>Cas limites</h3><div class="cd-row">' + fig(servant(longest, ['blue', 'green', 'chroma'], [eq[0] || null, null, eq[1] || null]), 'Nom le plus long, 3 chasses dont 2 occupées') + '</div>');
    }
    if (eq.length) rows.push('<h3>Équipements</h3><div class="cd-row">' + eq.map(e => fig(AWGfx.equipCard({ ...e, powers: powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true) }, o), e.name)).join('') + '</div>');
    if (heroes.length) rows.push('<h3>Héros</h3><div class="cd-row">' + heroes.slice(0, 3).map(h => fig(AWGfx.heroPortrait(heroProps(h), o), h.name)).join('') + '</div>');
    if (dun.length || heroes.length) rows.push('<h3>Donjons et choix du héros (format paysage)</h3><div class="cd-row">' + dun.map(d => fig(AWGfx.dungeonCard(d, o), d.name, 'cd-wide')).join('') + heroes.slice(0, 1).map(h => fig(AWGfx.heroCard(heroProps(h), o), h.name, 'cd-wide')).join('') + '</div>');
    if (servants.length) rows.push('<h3>Sur le plateau (petit)</h3><div class="cd-row">' + servants.slice(0, 3).map(c => fig(servant(c, ['blue', 'red'], []), c.name, 'cd-small')).join('') + '</div>');
    root.innerHTML = rows.join('');
  }
  return { mount };
})();
