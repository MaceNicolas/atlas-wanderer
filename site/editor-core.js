// Atlas Wanderer — logic of the power editor (site/editor.html), without any DOM so that tools/check-editor.js can test it in Node.
// env = the game's functions { SERVANTS, EQUIPS, HEROES, mkServant, applyEquip, applyFx, POWERS, setSeed, skillsOf }: in the page they are the globals
// of the game scripts, in the tests the objects exported by tools/load-game.js.
(function (root) {
  'use strict';
  // Names of the cards that use the power `fx` (servants, equipment, lieutenants).
  function usageOf(fx, env) {
    const uses = (skill) => [].concat(skill || []).some(k => k && k.fx === fx);
    return [
      ...env.SERVANTS.filter(c => uses(c.skill)).map(c => ({ kind: 'servant', name: c.name })),
      ...env.EQUIPS.filter(c => uses(c.skill)).map(c => ({ kind: 'equipment', name: c.name })),
      ...Object.values(env.HEROES).filter(c => uses(c.power)).map(c => ({ kind: 'lieutenant', name: c.name }))
    ];
  }
  // A small deterministic board to try a power on: 4 allies (the carrier is the second) and 3 enemies, one ally equipped.
  function sampleBoard(env, seed) {
    let a = (seed >>> 0) || 1;
    const next = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const pick = list => list[Math.floor(next() * list.length)];
    const build = () => env.mkServant(pick(env.SERVANTS));
    const allies = Array.from({ length: 4 }, build), enemies = Array.from({ length: 3 }, build);
    if (env.EQUIPS.length) env.applyEquip(allies[2], pick(env.EQUIPS));
    return { allies, enemies, carrierIndex: 1 };
  }
  const row = s => ({ name: s.name, atk: s.atk, hp: s.hp, maxhp: s.maxhp, shield: s.shield ? 1 : 0, kw: s.kw.join(',') });
  // Plays the effect of a power on a sample board, with the given templates (the ones being edited). Returns the board before / after and the combat log.
  function runSandbox(env, defs, fx, params, seed) {
    const board = sampleBoard(env, seed), carrier = board.allies[board.carrierIndex], log = [];
    const before = { allies: board.allies.map(row), enemies: board.enemies.map(row) };
    const saved = env.POWERS.all();
    try {
      env.POWERS.install({ ...saved, [fx]: defs[fx] });
      env.setSeed(seed || 1);
      env.applyFx({ t: params.t || 'startCombat', fx, a: params.a || 0, h: params.h || 0, n: params.n || 0 }, carrier, board.allies, board.enemies, m => log.push(m), null, params.level || 0);
    } finally { env.POWERS.install(saved); }
    return { before, after: { allies: board.allies.map(row), enemies: board.enemies.map(row) }, log, carrier: carrier.name };
  }
  // Kind of a template: an effect played at a trigger, or reactions to events of the combat.
  const kindOf = def => (def.then ? (def.reactions ? 'both' : 'effect') : 'reaction');
  const api = { usageOf, sampleBoard, runSandbox, kindOf };
  if (typeof module !== 'undefined') module.exports = api; else root.EditorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
