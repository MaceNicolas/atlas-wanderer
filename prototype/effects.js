// Atlas Wanderer — visual and sound effects of the events of the game (spec documentation/mecaniques/evenements-et-effets.md).
// The mod says which effects an event has (game.json, ui.effects): rules { on: <event>, phase?, if?, do: [ { effect, target, … } ] }. The engine only provides the
// primitives below (a closed list): the numbers, colors, texts and sounds are the mod's. The events come from the frames of the combat (frame.events, see EVENTS).
const FX = (() => {
  const ui = () => (GAME.def().ui || {});
  let banners = 0;
  const rules = () => ui().effects || [];
  // Events of the same kind on the same card in one frame are shown as one: their numbers add up (two hits of 2 are one "−4").
  const SUMMED = { damage: ['amount'], heal: ['amount'], statsChanged: ['atk', 'hp'] };
  function merge(events) {
    const out = [], seen = new Map();
    for (const ev of events) {
      const sum = SUMMED[ev.type];
      if (!sum) { out.push(ev); continue; }
      const key = ev.type + ':' + ev.target, old = seen.get(key);
      if (old) sum.forEach(f => { old[f] = (old[f] || 0) + (ev[f] || 0); });
      else { const copy = { ...ev }; seen.set(key, copy); out.push(copy); }
    }
    return out;
  }
  // The card an effect aims at, by its role in the event (target, source, attacker, card, or causeCard = the card whose power did it).
  const uidOf = (ev, role) => (role === 'causeCard' ? ev.cause && ev.cause.card : ev[role]);
  const elOf = (ev, role) => cardEl(uidOf(ev, role));
  // Texts of an effect: the numbers of the event, their positive part (pos_atk) and their negative part (neg_atk), the names of the cards concerned.
  const textOf = (step, ev, view) => {
    const vars = { ...ev };
    for (const [k, v] of Object.entries(ev)) if (typeof v === 'number') { vars['pos_' + k] = Math.max(v, 0); vars['neg_' + k] = Math.max(-v, 0); }
    for (const role of ['target', 'source', 'attacker', 'card']) if (ev[role] != null && view.name) vars[role + 'Name'] = view.name(ev[role]) || '';
    return I18N.t(step.text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)), vars);   // the key may name a field of the event: fx.trigger.{trigger}
  };
  const keyframes = (rest, peak, scale, at) => [{ filter: rest, ...(scale ? { transform: 'scale(1)' } : {}) }, { filter: peak, ...(scale ? { transform: `scale(${scale})` } : {}), offset: at }, { filter: rest, ...(scale ? { transform: 'scale(1)' } : {}) }];
  // ---- The primitives. step = the step of the rule, ev = the event, view = { speed, name(uid) }.
  const PRIMS = {
    // Text that rises above the card: { target, text, color }.
    float(step, ev, view) { const el = elOf(ev, step.target); if (el) floatText(el, textOf(step, ev, view), step.color); },
    // The card is struck: it shakes and flashes.
    shake(step, ev, view) {
      const el = elOf(ev, step.target); if (!el) return;
      el.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-9px)', filter: 'brightness(2.2) saturate(1.5)', offset: .2 },
        { transform: 'translateX(8px)', filter: 'brightness(1.5)', offset: .45 }, { transform: 'translateX(-4px)', offset: .7 }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: view.speed * 0.45 });
    },
    // The card lights up: { target, brightness, saturate?, scale?, halo?, haloSize?, peak?, duration (× speed) }.
    glow(step, ev, view) {
      const el = elOf(ev, step.target); if (!el) return;
      const halo = step.halo, size = step.haloSize || 22;
      const rest = halo ? `drop-shadow(0 0 0 ${halo})` : 'brightness(1)';
      const peak = `${halo ? `drop-shadow(0 0 ${size}px ${halo}) ` : ''}brightness(${step.brightness || 1.5})${step.saturate ? ` saturate(${step.saturate})` : ''}`;
      el.animate(keyframes(rest, peak, step.scale, step.peak || .4), { duration: view.speed * (step.duration || .6) });
    },
    // A card that appears (summoned, brought back).
    pop(step, ev, view) {
      const el = elOf(ev, step.target); if (!el) return;
      el.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.12)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: view.speed * 0.6, easing: 'ease-out' });
    },
    // A card that dies.
    fadeOut(step, ev, view) {
      const el = elOf(ev, step.target); if (!el) return;
      el.animate([{ opacity: 1, transform: 'scale(1) rotate(0)' }, { opacity: 0, transform: 'scale(.65) rotate(-7deg)' }], { duration: view.speed * 0.55, fill: 'forwards', easing: 'ease-in' });
    },
    // The attacker rushes at its target (a projectile leaves when it attacks from afar). The return to its place is played with the impact.
    lunge(step, ev, view) { playLunge({ hl: { att: ev.attacker, tgt: ev.target, ranged: ev.ranged } }); },
    // A line of light from a card to another, for the cause of an effect: { from, to, color }.
    beam(step, ev, view) {
      const a = elOf(ev, step.from), b = elOf(ev, step.to); if (!a || !b || a === b) return;
      const ca = centerOf(a), cb = centerOf(b), len = Math.hypot(cb.x - ca.x, cb.y - ca.y), angle = Math.atan2(cb.y - ca.y, cb.x - ca.x) * 180 / Math.PI, color = step.color || '#ffd45e';
      const line = document.createElement('div');
      line.style.cssText = `position:fixed;left:${ca.x}px;top:${ca.y - 2}px;width:${len}px;height:4px;transform-origin:0 50%;transform:rotate(${angle}deg);z-index:80;pointer-events:none;` +
        `border-radius:2px;background:linear-gradient(90deg,transparent,${color},transparent);box-shadow:0 0 10px ${color}`;
      document.body.appendChild(line);
      line.animate([{ opacity: 0, transform: `rotate(${angle}deg) scaleX(.2)` }, { opacity: 1, transform: `rotate(${angle}deg) scaleX(1)`, offset: .35 }, { opacity: 0, transform: `rotate(${angle}deg) scaleX(1)` }], { duration: view.speed * 0.7, easing: 'ease-out' }).onfinish = () => line.remove();
    },
    // The card whose power is acting pulses: { target (usually causeCard), color }.
    pulse(step, ev, view) {
      const el = elOf(ev, step.target); if (!el) return;
      const c = step.color || '#ffd45e';
      el.animate([{ filter: `drop-shadow(0 0 0 ${c})`, transform: 'scale(1)' }, { filter: `drop-shadow(0 0 18px ${c}) brightness(1.25)`, transform: 'scale(1.06)', offset: .4 }, { filter: `drop-shadow(0 0 0 ${c})`, transform: 'scale(1)' }], { duration: view.speed * 0.7 });
    },
    // A text in the middle of the screen for a moment that concerns the whole board (a room that starts, the Boss that acts): { text, color, size, duration (× speed) }.
    banner(step, ev, view) {
      const el = document.createElement('div'), n = (banners = (banners + 1) % 3);   // banners shown together are stacked
      el.textContent = textOf(step, ev, view);
      el.style.cssText = `position:fixed;left:50%;top:${24 + n * 9}%;transform:translateX(-50%);z-index:120;pointer-events:none;font:800 ${step.size || 34}px system-ui,sans-serif;` +
        `letter-spacing:.04em;color:${step.color || '#fff'};text-shadow:0 2px 6px #000,0 0 18px #000;white-space:nowrap;text-align:center`;
      document.body.appendChild(el);
      el.animate([{ opacity: 0, transform: 'translateX(-50%) scale(.85)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: .2 }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: .75 },
        { opacity: 0, transform: 'translateX(-50%) scale(1.03)' }], { duration: view.speed * (step.duration || 1.4), easing: 'ease-out' }).onfinish = () => el.remove();
    },
    // A sound of the mod (game.json, ui.sounds: name -> file). A name with no file is silent.
    sound(step) { FX.sound(step.name, step.volume); }
  };
  // ---- Groups of effects the player can turn off (game.json, ui.effectGroups; a rule names its group). Kept in the browser.
  const GROUPS_KEY = 'atlasWandererFxGroups';
  let groups = {};
  try { groups = JSON.parse(localStorage.getItem(GROUPS_KEY)) || {}; } catch (e) { groups = {}; }
  const setGroup = (name, on) => { groups[name] = !!on; try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); } catch (e) { /* private window */ } };
  const groupOn = name => { const d = ((ui().effectGroups || {})[name] || {}).default; return groups[name] == null ? d !== false : groups[name]; };
  // ---- Sound. The mute switch is kept in the browser.
  const MUTE_KEY = 'atlasWandererMuted', cache = {};
  const read = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } };
  let muted = read();
  function sound(name, volume) {
    const file = (ui().sounds || {})[name];
    if (muted || !file || typeof Audio === 'undefined') return;
    try {
      const a = cache[name] = cache[name] || new Audio(MOD.url(file));
      const p = a.cloneNode ? a.cloneNode() : a; p.volume = volume == null ? 1 : volume; const r = p.play(); if (r && r.catch) r.catch(() => {});
    } catch (e) { /* no sound: the game goes on */ }
  }
  const setMuted = v => { muted = !!v; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* private window */ } };
  // Plays the effects of a list of events for a phase ("pre": before the impact of an attack; "impact": the rest). prims: the primitives (tests replace them).
  function play(events, phase, view, prims = PRIMS) {
    // The conditions can ask whether a power caused the event and which card: `caused` (0 or 1) and `causeCard` (the identifier) are added to the fields of the event.
    const all = (events || []).map(ev => ({ ...ev, caused: ev.cause ? 1 : 0, causeCard: ev.cause ? ev.cause.card : null }));
    for (const ev of merge(all)) for (const r of rules()) {
      if (r.on !== ev.type || (r.phase || 'impact') !== phase) continue;
      if (r.group && !groupOn(r.group)) continue;   // a group of effects the player turned off
      if (r.if != null && !POWERS.value(r.if, { evt: ev, params: {}, vars: {}, carrier: {}, refs: {}, extra: {}, target: null })) continue;
      for (const step of r.do) prims[step.effect](step, ev, view);
    }
  }
  return { PRIMS, NAMES: Object.keys(PRIMS), play, merge, sound, setMuted, setGroup, groupOn, get muted() { return muted; } };
})();
