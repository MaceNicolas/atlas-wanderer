// Shows the visual and sound effects (prototype/effects.js) on three sample cards, for two pages:
//  - site/effets.html: what the ENGINE can do (its primitives), the same for every game; the cards are plain placeholders;
//  - the "Effets" tab of the editor: what a MOD does (its rules ui.effects, its sounds, its groups), on three cards of the mod.
// Needs: effects.js, animations.js (floatText, cardEl, playLunge…) and, for the mod, the engine scripts with the mod installed.
const EffectsDemo = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const view = { speed: 1300, name: uid => ({ 1: 'A', 2: 'B', 3: 'C' })[uid] };
  // The sample event: A acts on B (source, attacker), C is any card; every field an effect may read is there.
  const sample = type => ({ type, attacker: 1, source: 1, target: 2, card: 3, causeCard: 1, amount: 3, atk: 2, hp: 2, ranged: false, reason: 'shield', keyword: 'prov', room: 3, name: 'Carte', replaced: null, cause: { card: 1, power: 'sample', trigger: 'sample' } });
  // A sample event for a rule: the first of a few variants that satisfies its condition (so that its numbers and texts look as in a game).
  const VARIANTS = [{ atk: 2, hp: 2 }, { atk: -2, hp: 0 }, { atk: 0, hp: -2 }, { atk: 2, hp: 0 }, { atk: 0, hp: 2 }];
  const playRule = r => {
    const base = sample(r.on), ok = v => !r.if || POWERS.value(r.if, { evt: { ...base, ...v }, params: {}, vars: {}, carrier: {}, refs: {}, extra: {}, target: null });
    const ev = { ...base, ...(VARIANTS.find(ok) || VARIANTS[0]) };
    r.do.forEach(step => FX.PRIMS[step.effect](step, ev, view));
  };
  const RESET_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  const css = '.ed-scene { display: flex; gap: 1.2rem; justify-content: center; padding: 1.5rem 0 2.5rem; flex-wrap: wrap; } .ed-scene figure { margin: 0; width: 9.5rem; text-align: center; } .ed-scene figcaption { font-size: .8rem; opacity: .7; margin-top: .3rem; }' +
    ' .ed-scene .placeholder { height: 12rem; display: grid; place-items: center; font: 700 3rem var(--font-display, sans-serif); border: 2px solid var(--line-strong, #456); border-radius: 10px; background: var(--surface-1, #123); }' +
    ' .ed-bar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; } .ed-bar select { flex: 1 1 12rem; min-width: 0; } .ed-bar .btn, [data-demo="reset"] { display: inline-flex; align-items: center; gap: 8px; margin: 0; white-space: nowrap; } .ed-list { display: flex; flex-wrap: wrap; gap: .5rem; } .ed-list button { text-align: left; } .ed-rules { display: grid; gap: .5rem; } .ed-rules button { text-align: left; } .ed-sons li { margin: .25rem 0; }';
  const style = () => { if (!document.getElementById('effects-demo-css')) { const s = document.createElement('style'); s.id = 'effects-demo-css'; s.textContent = css; document.head.appendChild(s); } };
  const sceneHtml = (cards, drawCard, controls) => `<div class="ed-scene">${cards.map((c, i) => `<figure><div data-uid="${i + 1}">${drawCard(c, i)}</div><figcaption>${'ABC'[i]} — ${esc(c.name)}</figcaption></figure>`).join('')}</div>`
    + (controls || '');
  const muteBox = root => { const m = root.querySelector('[data-demo="mute"]'); if (m) m.checked = FX.muted; if (m) m.onchange = () => FX.setMuted(m.checked); };
  // ---- What the engine can do: every primitive, with the parameters an effect rule gives it. The cards are placeholders: nothing of a mod is needed.
  const PRIM_DEFAULTS = {
    float: { effect: 'float', target: 'target', text: 'Texte', color: '#ff6b5e' }, shake: { effect: 'shake', target: 'target' },
    glow: { effect: 'glow', target: 'target', brightness: 1.7, saturate: 1.4, scale: 1.07, duration: .6 }, pop: { effect: 'pop', target: 'card' }, fadeOut: { effect: 'fadeOut', target: 'card' },
    lunge: { effect: 'lunge' }, beam: { effect: 'beam', from: 'source', to: 'target', color: '#ffd45e' }, pulse: { effect: 'pulse', target: 'source', color: '#ffd45e' },
    banner: { effect: 'banner', text: 'Bandeau', color: '#fdba74', size: 36 }, sound: { effect: 'sound', name: '' }
  };
  const PRIM_ABOUT = {
    float: 'Un texte monte au-dessus d\'une carte (dégâts, soins, bonus).', shake: 'La carte est frappée : elle tremble et clignote.', glow: 'La carte s\'illumine (halo, luminosité, taille).', pop: 'Une carte apparaît (invoquée, ramenée).',
    fadeOut: 'Une carte disparaît (elle meurt).', lunge: 'L\'attaquant se jette sur sa cible (un projectile part s\'il attaque de loin).', beam: 'Un trait de lumière d\'une carte à une autre : montre qui agit sur qui.',
    pulse: 'La carte dont le pouvoir agit pulse.', banner: 'Un texte au centre de l\'écran, pour ce qui concerne tout le plateau (une salle qui commence, le Boss qui agit).', sound: 'Joue un son du mod (le fichier est choisi par le mod : rien à entendre ici).'
  };
  const engine = root => {
    style();
    const cards = ['A', 'B', 'C'].map(n => ({ name: 'Carte ' + n, letter: n })); let choice = 'float';
    const cap = n => n[0].toUpperCase() + n.slice(1);
    const controls = `<p class="ed-bar"><select id="primChoice" aria-label="Effet">${Object.keys(FX.PRIMS).filter(n => n !== 'sound').map(n => `<option value="${n}">${cap(n)} : ${esc(PRIM_ABOUT[n] || '')}</option>`).join('')}</select> <button class="btn" data-demo="play">▶ Jouer</button> <button class="btn" data-demo="reset">${RESET_ICON} Réinitialiser</button></p>`;
    const draw = () => { root.innerHTML = sceneHtml(cards, c => `<div class="placeholder">${c.letter}</div>`, controls);
      const sel = root.querySelector('#primChoice'); sel.value = choice; sel.onchange = () => { choice = sel.value; };
    };
    draw();
    root.onclick = e => {
      if (e.target.closest('[data-demo="reset"]')) return draw();
      if (e.target.closest('[data-demo="play"]')) FX.PRIMS[choice](PRIM_DEFAULTS[choice], sample('damage'), view);
    };
  };
  // ---- What a mod does: its rules (ui.effects), its sounds (ui.sounds) and its groups (ui.effectGroups), on three of its servants.
  const mod = root => {
    style();
    const ui = (GAME.def().ui || {}), rules = ui.effects || [], cards = SERVANTS.slice(0, 3).map((c, i) => ({ ...mkServant(c), uid: i + 1 }));
    const sounds = Object.entries(ui.sounds || {}).filter(([k]) => k !== 'note'), groups = Object.entries(ui.effectGroups || {}).filter(([k]) => k !== 'note');
    let choice = rules.length ? 'r0' : sounds.length ? 's0' : '';
    // What a rule does, in one line: the event, its phase, its group, its condition, then the effects with their texts.
    const ruleText = r => esc(r.on + (r.phase ? ' (' + r.phase + ')' : '') + (r.group ? ' [' + r.group + ']' : '') + (r.if ? ' si ' + JSON.stringify(r.if) : '') + ' → '
      + r.do.map(s => s.effect + (s.name ? ' ' + s.name : '') + (s.text ? ' “' + I18N.t(s.text, { amount: 3, pos_atk: 2, pos_hp: 2, neg_atk: 2, neg_hp: 2 }) + '”' : '')).join(', '));
    const options = (rules.length ? `<optgroup label="Règles d'effets (game.json, ui.effects)">${rules.map((r, i) => `<option value="r${i}">${ruleText(r)}</option>`).join('')}</optgroup>` : '')
      + (sounds.length ? `<optgroup label="Sons (ui.sounds)">${sounds.map(([k, f], i) => `<option value="s${i}"${f ? '' : ' disabled'}>${esc(k)} : ${f ? esc(f) : 'pas de fichier, silencieux'}</option>`).join('')}</optgroup>` : '');
    const controls = `<p class="ed-bar"><select id="effectChoice" aria-label="Effet du mod">${options || "<option value=\"\">Ce mod n'a ni règle d'effets ni son</option>"}</select> <button class="btn" data-demo="play">▶ Jouer</button> <button class="btn" data-demo="reset">${RESET_ICON} Réinitialiser</button></p>`
      + `<p>${groups.map(([k, gd]) => `<label class="case"><input type="checkbox" data-group="${esc(k)}"${FX.groupOn(k) ? ' checked' : ''}> ${esc(I18N.t(gd.label))}</label>`).join(' ')} <label class="case"><input type="checkbox" data-demo="mute"> Son coupé</label></p>`;
    const draw = () => { root.innerHTML = sceneHtml(cards, s => AWGfx.servantCard({ ...s, kwSpent: [], powers: powersOf(s.kw, skillsOf(s), null) }, { width: '100%', imgBase: MOD.imagesBase() }), controls);
      const sel = root.querySelector('#effectChoice'); sel.value = choice; sel.onchange = () => { choice = sel.value; }; muteBox(root); };
    draw();
    root.onclick = e => {
      if (e.target.closest('[data-demo="reset"]')) return draw();
      if (!e.target.closest('[data-demo="play"]')) return;
      if (choice[0] === 'r') playRule(rules[+choice.slice(1)]); else if (choice[0] === 's') FX.sound(sounds[+choice.slice(1)][0]);
    };
    root.onchange = e => { if (e.target.dataset.group) FX.setGroup(e.target.dataset.group, e.target.checked); };
  };
  return { engine, mod };
})();
