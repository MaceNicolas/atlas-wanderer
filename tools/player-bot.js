// Automatic player for the balance tests: it plays a whole game with the real actions of the game (ACT).
// Same strategy for everybody, so that the measured gaps come from the cards and not from the player.
//
// Reinforcement level strategies (parameter `strategy`):
//   'level': raises the reinforcement level fast (target = 1 + room/2), it is the one that wins the most (see REPRISE.md);
//   'balanced': target = 1 + room/3; 'tempo': target = 1 + room/5 (favors servants).
'use strict';

const TARGET_LEVEL = {
  level: room => 1 + Math.floor(room / 2),
  balanced: room => 1 + Math.floor(room / 3),
  tempo: room => 1 + Math.floor(room / 5)
};

// Plays a game to its end. Returns { win, rooms, heroHps }.
// game = result of load(); options: { strategy, maxRooms, force }.
// force = { kind: 'servant' | 'equip', id }: this card is added to the hand as soon as the reinforcement level reaches its rank
// (or from room 3 × rank if the bot does not rise fast enough), to measure what it brings.
function playGame(game, heroes, dungeon, { strategy = 'level', maxRooms = 80, force = null } = {}) {
  const { SERVANTS, EQUIPS, mkServant, grantPr, UI, ACT, ACTIVES, MAX_BOARD, MAX_LEVEL, HAND_MAX, copiesOf, powerOf, cardScore, offerKind, battlecriesOf, isPr } = game.X;
  const target = TARGET_LEVEL[strategy] || TARGET_LEVEL.level;
  const rnd = n => Math.floor(game.X.rng() * n);   // the game's own generator (not Node's): deterministic if the seed is fixed
  game.resetStorage(); game.timers.length = 0;
  UI.save = null; UI.sel.heroes = heroes.slice(); UI.sel.dungeon = dungeon;
  ACT.start();

  const g = () => UI.g;
  const handServants = () => g().hand.filter(h => h.kind === 'servant').map(h => h.s);
  const best = (list, score) => list.reduce((b, x, i) => (b < 0 || score(x) > score(list[b]) ? i : b), -1);

  // Value of a card offered at reinforcement.
  function offerValue(i) {
    const rf = UI.rf, c = rf.offer.cards[i], gg = g();
    if (offerKind(rf.offer, i) === 'servant') {
      let v = cardScore(c);
      const copies = copiesOf(gg, c.name).length;
      if (copies >= 1) v += 12 * copies;   // aims for the gold fusion
      return v;
    }
    // Equipment: +r/+r; useless while the board is thin.
    return gg.board.length < 4 ? -100 : c.rank * 9 + (c.atk + c.hp);
  }

  // Places the cards of the hand: servants on the board (or in place of the weakest), equipment on the strongest servant.
  function organize() {
    const gg = g();
    for (let tour = 0; tour < 30; tour++) {
      let agi = false;
      const iS = gg.hand.findIndex(h => h.kind === 'servant');
      if (iS >= 0) {
        const s = gg.hand[iS].s;
        if (gg.board.length < MAX_BOARD) { game.X.placeServant(gg, iS, null, () => {}); agi = true; }
        else {
          const free = gg.board.map((x, j) => j).filter(j => !gg.board[j].fixed);
          const weak = free.reduce((w, j) => (w < 0 || powerOf(gg.board[j]) < powerOf(gg.board[w]) ? j : w), -1);
          // Replaces only if the gain is clear (the replaced one loses its equipment).
          if (weak >= 0 && powerOf(s) > powerOf(gg.board[weak]) + 4 + gg.board[weak].equips.length * 3) { game.X.placeServant(gg, iS, weak, () => {}); agi = true; }
          else if (gg.hand.length >= HAND_MAX) { gg.hand.splice(iS, 1); gg.stats.discarded++; agi = true; }
          else break;
        }
      } else {
        const iE = gg.hand.findIndex(h => h.kind === 'equip');
        if (iE < 0 || !gg.board.length) break;
        const targets = gg.board.filter(x => !x.fixed);
        // Spreads the equipment (measured: better than stacking everything on the strongest): the least equipped first, then the strongest.
        const pool = targets.length ? targets : gg.board;
        const target = pool.reduce((b, x) => (x.equips.length < b.equips.length || (x.equips.length === b.equips.length && powerOf(x) > powerOf(b)) ? x : b));
        game.X.applyEquip(target, gg.hand[iE].def); gg.hand.splice(iE, 1); agi = true;
      }
      if (!agi) break;
    }
  }

  // Board order: index 0 is in the front line; Taunt then biggest HP in front (weak effect measured, but never negative).
  function arrange() {
    const b = g().board;
    if (b.length < 2) return;
    const key = s => (s.kw.includes('prov') ? 1e6 : 0) + (s.hp + s.atk * 0.01);
    const sort = b.map((s, i) => ({ s, i })).sort((x, y) => key(y.s) - key(x.s) || x.i - y.i);
    b.splice(0, b.length, ...sort.map(x => x.s));
  }

  // Active powers of the heroes (one use per reinforcement, except those that repeat).
  function pouvoirs() {
    const gg = g(), rf = UI.rf;
    gg.heroes.forEach((h, i) => {
      if (!h.def.power || h.def.power.t !== 'active' || h.hp <= 0) return;
      const A = ACTIVES[h.def.power.fx];
      for (let n = 0; n < 4; n++) {
        if (h.used && !A.repeat) return;
        const price = A.cost ? A.cost(h) : 0;
        if (gg.datacrons < price || rf.offer || rf.reward || rf.prophecy) return;
        const cands = [...gg.board, ...handServants()].filter(s => !isPr(s) && A.ok(gg, s) && (h.def.power.fx !== 'triggerBattlecry' || (gg.board.includes(s) && battlecriesOf(s).length)));
        if (!cands.length) return;
        // Rebirth on the strongest; battlecry / fusion on the highest rank.
        const target = cands.reduce((b, s) => ((h.def.power.fx === 'grantRebirth' ? powerOf(s) > powerOf(b) : s.rank > b.rank) ? s : b));
        if (h.def.power.fx === 'grantRebirth' && !gg.board.includes(target)) return;
        const before = gg.datacrons;
        ACT.useActive({ i }); ACT.pickActiveTarget({ uid: target.uid });
        if (gg.datacrons === before && !h.used) return;   // the action did not succeed
        if (!A.repeat) return;
      }
    });
  }

  let injectedRoom = 0;
  const forcedCard = force && (force.kind === 'servant' ? SERVANTS : EQUIPS).find(c => c.id === force.id);
  if (force && !forcedCard) throw new Error(`carte à forcer introuvable : ${force.kind} ${force.id}`);
  function inject() {
    const gg = g(), c = forcedCard;
    if (injectedRoom || game.X.handFull(gg) || (gg.level < Math.min(c.rank, MAX_LEVEL) && gg.room < 3 * c.rank)) return;
    if (force.kind === 'servant') { gg.hand.push({ kind: 'servant', s: mkServant(c) }); grantPr(gg, c.types, () => {}); }
    else gg.hand.push({ kind: 'equip', def: c });
    injectedRoom = gg.room;
  }

  function renfort() {
    for (let guard = 0; guard < 120; guard++) {
      const gg = g(), rf = UI.rf;
      game.X.flushDiscover(gg, rf);
      if (rf.prophecy) { ACT.pickProphecy({ i: best(rf.prophecy.cards, cardScore) }); continue; }
      if (rf.reward) { ACT.pickReward({ i: best(rf.reward.cards, cardScore) }); continue; }
      if (rf.offer) { const v = rf.offer.cards.map((c, i) => offerValue(i)); ACT.pickOffer({ i: v.indexOf(Math.max(...v)) }); continue; }
      if (forcedCard && !rf.offer && !rf.reward && !rf.prophecy) inject();
      organize(); arrange(); pouvoirs();
      if (rf.offer || rf.reward || rf.prophecy) continue;
      if (gg.datacrons < 1) break;
      const wantedLevel = gg.level < MAX_LEVEL && gg.level < target(gg.room);
      const before = gg.datacrons;
      if (wantedLevel || game.X.handFull(gg)) ACT.buyLevel(); else ACT.buyReinforcement();
      if (gg.datacrons === before) { ACT.buyLevel(); if (gg.datacrons === before) break; }   // full hand and max level: we stop
    }
  }

  let rooms = 0;
  while (UI.screen !== 'end' && rooms < maxRooms) {
    renfort();
    ACT.finishReinforcement();
    for (let c = 0; !UI.pb.done && c < 5000; c++) { const f = game.timers.shift(); if (!f) break; f(); }   // non-fast combat: we run through the timers
    if (!UI.pb.done) throw new Error('combat qui ne se termine pas');
    for (let a = 0; UI.adapt.length && a < 50; a++) ACT.pickAdapt({ i: rnd(UI.adapt[0].options.length) });
    game.timers.length = 0;
    rooms++;
    ACT.next();
  }
  const gg = g();
  return { win: gg.over === 'win', rooms: gg.room - 1, injectedRoom, bossHp: gg.boss.hp, heroHps: gg.heroes.map(h => h.hp) };
}

module.exports = { playGame, strategies: Object.keys(TARGET_LEVEL) };
