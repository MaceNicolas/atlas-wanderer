// The visual journal (prototype/journal.js, game.json ui.journal; spec documentation/mecaniques/evenements-et-effets.md): each event reads as a line built from the events and
// their cause, with nothing written by hand for a new power. Checks on 150 real combats and on the real interface (a journal opened in the reinforcement and in a combat).
// Usage: node tools/check-journal.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const globalize = (src, name) => src.replace(new RegExp(`^const ${name}`, 'm'), `globalThis.${name}`);
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript()
  + '\n;' + globalize(read('prototype', 'effects.js'), 'FX') + '\n;' + globalize(read('prototype', 'journal.js'), 'JOURNAL') + '\n;({ SERVANTS, DUNGEONS, mkServant, runCombat, setSeed, rand, I18N, GAME, JOURNAL, EVENTS })',
  { Math, console, floatText() {}, cardEl() {}, centerOf() {}, playLunge() {} });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const core = require('../site/editor-core.js'), SCHEMA = require('../prototype/game-schema.js'), MOD = require('./mod');

// 1. Every kind of event reads, except the few that are not for the player.
const covered = new Set(g.JOURNAL.rules().map(r => r.on));
const SILENT = ['cardRemoved'];
for (const t of SCHEMA.eventTypes) if (!covered.has(t) && !SILENT.includes(t)) fail(`the events "${t}" have no line in the journal`);

// 2. The lines of 150 combats.
const dungeon = Object.values(g.DUNGEONS)[0], bad = /[{}]|journal\.|fx\.trigger\.|undefined|NaN|\[object/;
let combats = 0, lines = 0, withCause = 0; const kinds = new Set();
for (let seed = 1; seed <= 150; seed++) {
  g.setSeed(seed);
  const board = n => Array.from({ length: n }, () => g.mkServant(g.SERVANTS[g.rand(g.SERVANTS.length)]));
  const res = g.runCombat(board(2 + g.rand(5)), board(2 + g.rand(5)), { heroes: [], level: 1 + g.rand(4), room: 1 + g.rand(6), dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'none' } } });
  combats++;
  const journal = g.JOURNAL.ofCombat(res.frames, res.frames.length);
  journal.forEach((l, i) => {
    lines++; kinds.add(l.type);
    if (bad.test(l.text + l.cause)) fail(`seed ${seed}, line ${i}: a line shows a raw key or a hole: "${l.text}" "${l.cause}"`);
    if (!l.text.trim()) fail('an empty line');
    if (l.cause) withCause++;
  });
  // the damage lines say the amount, the lines of events with a cause name the card that did it
  const frames = res.frames.flatMap((f, i) => f.events.map(e => ({ e, i })));
  const damages = frames.filter(x => x.e.type === 'damage'), dl = journal.filter(l => l.type === 'damage');
  if (damages.length && !dl.length) fail(`seed ${seed}: damage events and no damage line`);
  if (journal.some(l => l.cause && !/←/.test(l.cause))) fail('a cause is not introduced');
  if (journal.some((l, i) => i && l.frame < journal[i - 1].frame)) fail('the lines are not in the order of the combat');
}
if (!kinds.has('damage') || !kinds.has('death') || !kinds.has('attack')) fail(`the journal lacks basic lines (${[...kinds]})`);
if (!withCause) fail('no line has a cause');
// the same texts exist in English
const fr = MOD.texts('fr'), en = MOD.texts('en');
for (const r of g.JOURNAL.rules().concat([{ text: 'journal.cause' }])) { if (!(r.text in fr) || !(r.text in en)) fail(`the text ${r.text} is missing in a language`); }

// 3. Validation of the rules.
const game = MOD.read('game'), ctx = { schema: SCHEMA, files: MOD.manifest().files, rules: MOD.read('rules'), texts: fr };
if (core.validateGame(game, ctx).length) fail(`game.json is refused: ${core.validateGame(game, ctx)[0]}`);
const refuses = (label, f) => { const gm = JSON.parse(JSON.stringify(game)); f(gm); if (!core.validateGame(gm, ctx).some(p => /ui\.journal/.test(p))) fail(`${label} is accepted`); };
refuses('an unknown event', gm => { gm.ui.journal[0].on = 'explosion'; });
refuses('a text that does not exist', gm => { gm.ui.journal[0].text = 'journal.nope'; });
refuses('a color that is not hexadecimal', gm => { gm.ui.journal[0].color = 'red'; });
refuses('a noCause that is not a boolean', gm => { gm.ui.journal[0].noCause = 'yes'; });
refuses('a journal without its cause text', gm => { gm.ui.journal.length && delete gm.ui.journal; gm.ui.journal = [{ on: 'death', text: 'journal.death' }]; ctx.texts = { ...fr }; delete ctx.texts['journal.cause']; });
ctx.texts = fr;

// 4. The real interface: the journal opened in the reinforcement and in a combat, a line clicked.
{
  process.env.AW_MOD = process.env.AW_MOD || 'atlas-wanderer';
  const { load } = require('./load-game');
  const app = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, remove() {}, textContent: '', animate() { return {}; }, scrollTop: 0, dataset: {}, querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({}), setAttribute() {}, focus() {} };
  const other = () => ({ ...app, innerHTML: '' });
  const game2 = load({ seed: 8, dom: { getElementById: id => (id === 'app' ? app : other()), createElement: other, body: other() } }), X = game2.X, { UI, ACT, Z } = X;
  X.render(); ACT.selDungeon({ id: Object.keys(X.DUNGEONS)[0] }); ACT.toHeroes(); Object.keys(X.HEROES).slice(0, 2).forEach(id => ACT.selHero({ id })); ACT.start();
  ACT.toggleJournal(); if (!UI.journalOpen) fail('the journal did not open');
  X.GAME.add(UI.g, 'money', 5); ACT.buyServant(); if (UI.rf.offer) ACT.pickOffer({ i: 0 }); X.render();
  if (!/journal-list/.test(app.innerHTML) || !/data-act="journalFocus"/.test(app.innerHTML)) fail('the journal of the reinforcement shows no line');
  ACT.finishReinforcement(); while (!UI.pb.done && game2.timers.length) game2.timers.shift()(); X.render();
  if (!/journal-list/.test(app.innerHTML)) fail('the journal of the combat is not drawn');
  const lines = (app.innerHTML.match(/data-act="journalFocus"/g) || []).length;
  if (!lines) fail('the journal of the combat shows no line');
  if (UI.pb.i === 0) fail('the test needs a combat of more than one frame');
  ACT.journalFocus({ uids: '1,2', frame: '0' });
  if (UI.pb.i !== 0) fail('a click on a line did not go back to its moment');
  ACT.toggleJournal(); X.render(); if (/journal-list/.test(app.innerHTML)) fail('the journal did not close');
}
console.log(`✓ journal: ${covered.size} kinds of events read, ${lines} lines on ${combats} combats (${[...kinds].sort().join(', ')}), ${withCause} with their cause, none with a raw key; in both languages; 5 mistakes refused; opens in the reinforcement and in a combat and goes back to a moment.`);
