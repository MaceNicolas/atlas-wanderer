// The effects of the events (prototype/effects.js, game.json ui.effects). Two checks without a browser:
// 1. the rules of the mod, played on the events of 150 real combats, show what the former animations showed (they compared two frames): same effects on the same cards,
//    except where several things happened to one card in one frame, which the events now show separately (listed, counted);
// 2. the validation: every effect a rule names is a primitive of the engine, every sound it plays is declared, every text exists (the validation of game.json).
// Usage: node tools/check-effects.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript()
  + '\n;' + read('prototype', 'effects.js').replace(/^const FX/m, 'globalThis.FX') + '\n;({ SERVANTS, DUNGEONS, mkServant, runCombat, setSeed, rand, I18N, GAME, FX })', { Math, console, document: undefined, floatText() {}, cardEl() {}, centerOf() {}, playLunge() {} });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const SCHEMA = require('../prototype/game-schema.js');
if (JSON.stringify(g.FX.NAMES) !== JSON.stringify(SCHEMA.effectPrimitives)) fail(`the primitives of the engine (${g.FX.NAMES}) are not those of the schema (${SCHEMA.effectPrimitives})`);

// What an effect shows, in words, so that the two ways can be compared: 'what:card:detail'.
const kindOfGlow = st => (st.halo ? 'shield' : st.brightness >= 1.7 ? 'buff' : 'heal');
const recorder = out => ({
  float: (st, ev, view) => out.push(`float:${ev[st.target]}:${g.I18N.t(st.text, Object.assign({}, ev, ...Object.entries(ev).filter(([, v]) => typeof v === 'number').map(([k, v]) => ({ ['pos_' + k]: Math.max(v, 0), ['neg_' + k]: Math.max(-v, 0) }))))}`),
  shake: (st, ev) => out.push(`shake:${ev[st.target]}`), glow: (st, ev) => out.push(`glow-${kindOfGlow(st)}:${ev[st.target]}`),
  pop: (st, ev) => out.push(`pop:${ev[st.target]}`), fadeOut: (st, ev) => out.push(`fade:${ev[st.target]}`), lunge: (st, ev) => out.push(`lunge:${ev.attacker}>${ev.target}:${!!ev.ranged}`),
  beam: () => {}, pulse: () => {}, sound: () => {}
});
// The former rule, from two frames (prototype/animations.js before the effects): the first thing that happened to each card, in this order.
function former(prev, cur) {
  const out = [], flat = f => new Map([...f.p, ...f.e].map(s => [s.uid, s])), before = flat(prev), after = flat(cur);
  after.forEach((s, uid) => {
    const o = before.get(uid);
    if (!o) { out.push(`pop:${uid}`); return; }
    const dmg = o.hp - s.hp, a = s.atk - o.atk, h = s.maxhp - o.maxhp;
    if (dmg > 0) out.push(`shake:${uid}`, `float:${uid}:−${dmg}`);
    else if (a > 0 || h > 0) out.push(`glow-buff:${uid}`, `float:${uid}:+${Math.max(a, 0)}/+${Math.max(h, 0)}`);
    else if (dmg < 0) out.push(`glow-heal:${uid}`, `float:${uid}:+${-dmg}`);
    else if (a < 0) out.push(`float:${uid}:−${-a} ATQ`);
    if (o.shield && !s.shield) out.push(`glow-shield:${uid}`, `float:${uid}:${g.I18N.t('fx.shield')}`);
  });
  (cur.hl.dead || []).forEach(uid => out.push(`fade:${uid}`));
  return out;
}
const dungeon = Object.values(g.DUNGEONS)[0];
let frames = 0, same = 0; const differ = [], kinds = {};
for (let seed = 1; seed <= 150; seed++) {
  g.setSeed(seed);
  const board = n => Array.from({ length: n }, () => g.mkServant(g.SERVANTS[g.rand(g.SERVANTS.length)]));
  const res = g.runCombat(board(2 + g.rand(5)), board(2 + g.rand(5)), { heroes: [], level: 1 + g.rand(4), room: 1 + g.rand(6), dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'none' } } });
  res.frames.forEach((cur, i) => {
    const prev = res.frames[i - 1]; if (!prev) return;
    frames++;
    const now = [], pre = [];
    g.FX.play(cur.events, 'impact', { speed: 1, name: () => '' }, recorder(now)); g.FX.play(cur.events, 'pre', { speed: 1, name: () => '' }, recorder(pre));
    const old = former(prev, cur), a = [...old].sort().join('|'), b = [...now].sort().join('|');
    // the attack: the former code charged when the frame had an attacker (hl.att)
    const lunged = pre.filter(x => x.startsWith('lunge')), expectLunge = cur.hl.att != null ? 1 : 0;
    if (lunged.length !== expectLunge) fail(`seed ${seed}, frame ${i}: ${lunged.length} lunge(s), the former code had ${expectLunge}`);
    if (lunged.length && lunged[0] !== `lunge:${cur.hl.att}>${cur.hl.tgt}:${!!cur.hl.ranged}`) fail(`seed ${seed}, frame ${i}: the lunge aims at ${lunged[0]}, the former code at ${cur.hl.att}>${cur.hl.tgt}`);
    if (a === b) { same++; return; }
    // Allowed difference: a card that took several kinds of change in one frame now shows each of them (the former code showed the first).
    const extra = now.filter(x => !old.includes(x)), missing = old.filter(x => !now.includes(x));
    const cards = new Set([...extra, ...missing].map(x => x.split(':')[1]));
    const multi = [...cards].every(uid => {
      const evs = cur.events.filter(e => String(e.target) === uid || String(e.card) === uid), types = new Set(evs.map(e => e.type));
      return types.size > 1 || evs.filter(e => e.type === 'damage' || e.type === 'heal').length > 1;
    });
    if (multi && missing.length === 0) { kinds.shownTogether = (kinds.shownTogether || 0) + 1; return; }
    differ.push(`seed ${seed} frame ${i} "${cur.msg}"\n    former: ${old.join(' ')}\n    events: ${now.join(' ')}\n    ${JSON.stringify(cur.events.map(e => [e.type, e.target, e.amount, e.atk, e.hp]))}`);
  });
}
if (differ.length) fail(`${differ.length} frame(s) differ from the former animations, for no reason the events explain:\n  ${differ.slice(0, 4).join('\n  ')}`);

// 2. The validation of the effects and sounds of game.json refuses mistakes.
{
  const core = require('../site/editor-core.js'), MOD = require('./mod'), game = MOD.read('game');
  const ctx = { schema: SCHEMA, files: MOD.manifest().files, rules: MOD.read('rules'), texts: MOD.texts('fr') };
  const bad = (label, f) => { const gm = JSON.parse(JSON.stringify(game)); f(gm); if (!core.validateGame(gm, ctx).some(p => /ui\.(effects|sounds)/.test(p))) fail(`${label} is accepted`); };
  if (core.validateGame(game, ctx).length) fail(`game.json is refused: ${core.validateGame(game, ctx)[0]}`);
  bad('an unknown event', gm => { gm.ui.effects[0].on = 'explosion'; });
  bad('an unknown primitive', gm => { gm.ui.effects[1].do[0].effect = 'explode'; });
  bad('an effect with no target', gm => { delete gm.ui.effects[1].do[0].target; });
  bad('a target that is not a role of the event', gm => { gm.ui.effects[1].do[0].target = 'everyone'; });
  bad('a color that is not hexadecimal', gm => { gm.ui.effects[1].do[1].color = 'url(javascript:x)'; });
  bad('a text that does not exist', gm => { gm.ui.effects[1].do[1].text = 'fx.nope'; });
  bad('a sound that is not declared', gm => { gm.ui.effects[1].do.push({ effect: 'sound', name: 'nope' }); });
  bad('a sound file with a bad path', gm => { gm.ui.sounds.hit = '../../etc/passwd'; });
  bad('a negative duration', gm => { gm.ui.effects[2].do[0].duration = -1; });
  bad('a beam with no end', gm => { gm.ui.effects[1].do.push({ effect: 'beam', from: 'source' }); });
  // the gallery page: its script must at least compile
  const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'effets.html'), 'utf8');
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => { try { new vm.Script(m[1], { filename: 'site/effets.html' }); } catch (e) { fail('site/effets.html does not compile: ' + e.message); } });
}
console.log(`✓ effects: ${frames} frames of 150 combats: ${same} show exactly what the former animations showed, ${kinds.shownTogether || 0} show more (several changes to one card in one frame, now each one); the lunge of every attack matches; the effects and sounds of game.json are validated (10 mistakes refused).`);
