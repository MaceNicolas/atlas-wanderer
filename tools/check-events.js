// The events of the game (spec documentation/mecaniques/evenements-et-effets.md): the combat reports what happens in a closed vocabulary, with its cause.
// Checks on whole combats of the real game: every frame carries its events, every event is of the vocabulary and names cards that exist, and the events tell the
// whole story of the hit points and attack of every card (nothing changes in a combat without an event saying it). Usage: node tools/check-events.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript()
  + '\n;({ SERVANTS, EQUIPS, HEROES, DUNGEONS, mkServant, runCombat, setSeed, EVENTS, POWERS, MAX_BOARD, pick, rand })', { Math, console });
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const { EVENTS } = g, SCHEMA = require('../prototype/game-schema.js');
if (JSON.stringify(SCHEMA.eventTypes) !== JSON.stringify([...EVENTS.TYPES])) fail('the events of the schema are not those of the engine');
if (!EVENTS.enabled) fail('events are disabled by default');
let combats = 0, frames = 0, events = 0, kinds = new Set(), caused = 0;
const dungeon = Object.values(g.DUNGEONS)[0];
for (let seed = 1; seed <= 150; seed++) {
  g.setSeed(seed);
  const board = n => Array.from({ length: n }, () => g.mkServant(g.SERVANTS[g.rand(g.SERVANTS.length)]));
  const P = board(2 + g.rand(5)), E = board(2 + g.rand(5));
  const res = g.runCombat(P, E, { heroes: [], level: 1 + g.rand(4), room: 1 + g.rand(6), dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'none' } } });
  combats++;
  // The state of every card as the first frame shows it, then replayed with the events.
  const known = new Map(); let prev = null;
  for (const f of res.frames) {
    frames++;
    if (!Array.isArray(f.events)) fail('a frame has no events list');
    const now = new Map([...f.p, ...f.e].map(s => [s.uid, s]));
    for (const ev of f.events) {
      events++; kinds.add(ev.type); if (ev.cause) caused++;
      if (!g.EVENTS.TYPES.includes(ev.type)) fail(`unknown event type ${ev.type}`);
      for (const k of ['target', 'attacker', 'card', 'source']) if (ev[k] != null && !now.has(ev[k]) && !(prev && prev.has(ev[k])) && ev.type !== 'cardRemoved') fail(`${ev.type}: ${k} ${ev[k]} is on no board`);
      if (ev.type === 'damage' && !(ev.amount > 0)) fail('a damage event with no damage');
    }
    if (prev) {
      // Replays hp and attack of the cards present in both frames from the events of this frame.
      for (const [uid, s] of now) {
        const o = prev.get(uid); if (!o) continue;
        let hp = o.hp, atk = o.atk;
        for (const ev of f.events) {
          if (ev.target !== uid) continue;
          if (ev.type === 'damage') hp -= ev.amount;
          if (ev.type === 'heal') hp += ev.amount;
          if (ev.type === 'statsChanged') { atk += ev.atk; hp += ev.hp; }
        }
        if (hp !== s.hp) fail(`seed ${seed}: card ${s.name} has ${s.hp} HP in a frame, the events say ${hp} (was ${o.hp}); events: ${JSON.stringify(f.events.filter(e => e.target === uid))}; "${f.msg}"`);
        if (atk !== s.atk) fail(`seed ${seed}: card ${s.name} has ${s.atk} ATK in a frame, the events say ${atk} (was ${o.atk}); "${f.msg}"`);
      }
    }
    prev = now;
  }
}
// The switch: a game that does not need the events (simulations) turns them off.
EVENTS.enabled = false; g.setSeed(1);
const off = g.runCombat([g.mkServant(g.SERVANTS[0])], [g.mkServant(g.SERVANTS[1])], { heroes: [], level: 1, room: 1, dungeon: { ...dungeon, boss: { ...dungeon.boss, power: 'none' } } });
if (off.frames.some(f => f.events.length)) fail('events were emitted while disabled');
for (const t of ['attack', 'damage', 'death']) if (!kinds.has(t)) fail(`no ${t} event in ${combats} combats`);
console.log(`✓ events: ${combats} combats, ${frames} frames, ${events} events (${[...kinds].sort().join(', ')}), ${caused} with a cause; the hit points and attack of every card follow from the events.`);
