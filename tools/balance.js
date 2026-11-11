// Balance tests by massive simulation, without a browser and without Claude.
// An automatic player (tools/player-bot.js) plays thousands of games with the real prototype code.
//
// Usage: node tools/balance.js <phase> [options]
//   phase: heroes | servants | equipment | dungeons | all (the four, in that order)
//   --scale=normal      size of the tests: small (check, ~2 min), normal (~25 min), massive (~1 h)
//   --factor=1          multiplies the number of games of the chosen scale
//   --seed=1            starting seed: same options + same seed = same results
//   --strategy=a,b      strategies of the bot (level | balanced | tempo), see player-bot.js.
//                       Default: all three for heroes and dungeons, balanced and tempo for cards.
//   --threads=N         number of compute threads (default: number of cores - 1)
//   --threshold=4      gap (in percentage points of wins) from which an element is flagged
//
// Principle: each test targets one element and systematically confronts it with everything else.
//  - heroes: each hero is played with each of the others (all pairs), and each pair replays in every dungeon;
//  - servants / equipment: the tested card is given to the player (as soon as their reinforcement level allows it), in all
//    the hero pairs × all the dungeons, then compared with control games without a forced card. It is also compared with the other
//    cards of the same rank, since a high-rank card is obviously stronger than a rank 1 card;
//  - dungeons: each dungeon is played with all the hero pairs, and each possible random Boss type is imposed in turn.
// Each test is recorded in tests/history/<date-scale>/ (versioned): see tools/history.js. The site's "Test" page
// (tools/local-server.js, site/tests.html) displays and compares them, and can also launch them.
//   --note="text"      comment kept with the test (what changed, what we wanted to check)
//   --no-history        writes to temp/balance/essai (not versioned) instead of tests/history/
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), os = require('os');
const { load } = require('./load-game');
const { playGame, strategies } = require('./player-bot');
const history = require('./history');

// ---------- Work of one thread: plays the tasks it receives ----------
if (!isMainThread) {
  const game = load({ fast: true }), { seed, tasks } = workerData;
  const hashTexte = t => [...t].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const hash = (...v) => v.reduce((h, x) => Math.imul(h ^ ((typeof x === 'string' ? hashTexte(x) : x) + 0x9E3779B9), 0x85EBCA6B) >>> 0, 2166136261);
  for (const t of tasks) {
    const r = { id: t.id, games: 0, wins: 0, rooms: 0, lostRooms: 0, defeats: 0, errors: 0, injected: 0, lost: {} };
    game.forceExtra(t.extra || null);
    for (let k = 0; k < t.n; k++) {
      // The seed depends only on the configuration (strategy, pair, dungeon, Boss type) and on the game number:
      // a control game and the same game with a forced card therefore start the same way.
      game.setSeed(hash(seed, t.key, k));
      try {
        const p = playGame(game, t.heroes, t.dungeon, { strategy: t.strat, force: t.force || null });
        r.games++; r.rooms += p.rooms; if (p.injectedRoom) r.injected++;
        if (p.win) r.wins++; else { r.defeats++; r.lostRooms += p.rooms; r.lost[p.rooms] = (r.lost[p.rooms] || 0) + 1; }
      } catch (e) { r.errors++; r.lastError = String(e.stack || e).split('\n').slice(0, 2).join(' | '); }
    }
    parentPort.postMessage(r);
  }
  process.exit(0);
}

// ---------- Main program ----------
const args = process.argv.slice(2);
const phase = args.find(a => !a.startsWith('--'));
const opt = (name, def) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.split('=')[1] : def; };
const SEED = +opt('seed', 1), THRESHOLD = +opt('threshold', 4), SCALE = opt('scale', 'normal'), FACTOR = +opt('factor', 1);
const NOTE = opt('note', ''), NO_HISTORY = args.includes('--no-history');
const THREADS = Math.max(1, +opt('threads', Math.max(1, os.cpus().length - 1)));
const strOpt = opt('strategy', null);
const STRATS = (strOpt || strategies.join(',')).split(','), CARD_STRATS = (strOpt || 'balanced,tempo').split(',');
// Games per combination, depending on the scale. cardList: per forced card and per configuration (pair × dungeon × strategy); control: control games per configuration.
const SCALES = history.scales;
if (!SCALES[SCALE]) { console.error(`Échelle inconnue : ${SCALE} (${Object.keys(SCALES).join(', ')})`); process.exit(2); }
const N = Object.fromEntries(Object.entries(SCALES[SCALE]).map(([k, v]) => [k, Math.max(1, Math.round(v * FACTOR))]));
const PHASES = ['heroes', 'servants', 'equipment', 'dungeons'];
if (phase !== 'all' && !PHASES.includes(phase)) { console.error(`Phase à indiquer : ${PHASES.join(' | ')} | tout`); process.exit(2); }
const unknown = [...STRATS, ...CARD_STRATS].find(x => !strategies.includes(x));
if (unknown) { console.error(`Stratégie inconnue : ${unknown} (${strategies.join(', ')})`); process.exit(2); }

const pct = x => `${(x * 100).toFixed(1)}%`, pts = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;
const pad = (s, n) => String(s).padEnd(n), padl = (s, n) => String(s).padStart(n);
// Folder of the running test (created at launch, see the end of the file) and its record.
let outputDir = null, TEST = null;
const relatif = f => path.relative(history.root, path.join(outputDir, f));
// Records the size and duration of a phase in meta.json, then writes its report.
let phaseStart = 0, phaseGames = 0;
const phaseEnd = name => { TEST.meta.phases[name] = { games: phaseGames, seconds: Math.round((Date.now() - phaseStart) / 1000) }; TEST.save(); writeReport(name); };
// The report is displayed and accumulated to be written to a file at the end of each phase.
let report = [];
const log = (...a) => { const t = a.join(' '); console.log(t); report.push(t); };
const writeReport = name => { fs.writeFileSync(path.join(outputDir, `report-${name}.txt`), report.join('\n') + '\n'); report = []; };

// Runs the tasks on several threads and returns the results by identifier.
function execute(tasks) {
  return new Promise((resolve, reject) => {
    const perThread = Array.from({ length: Math.min(THREADS, tasks.length) }, () => []);
    tasks.forEach((t, i) => perThread[i % perThread.length].push(t));
    const res = {}; let remaining = tasks.length, done = 0, latest = 0; const startedAt = Date.now();
    perThread.forEach(batch => {
      const w = new Worker(__filename, { workerData: { seed: SEED, tasks: batch } });
      w.on('message', r => {
        res[r.id] = r; remaining--; done++;
        if (Date.now() - latest > 2000 || !remaining) { latest = Date.now(); process.stderr.write(`\r  ${done}/${tasks.length} tâches (${Math.round((Date.now() - startedAt) / 1000)} s)   `); }
        if (!remaining) { process.stderr.write('\n'); resolve(res); }
      });
      w.on('error', reject);
    });
  });
}

// ---------- Statistics ----------
const ag = () => ({ n: 0, v: 0, s: 0, sp: 0, d: 0, inj: 0, lost: {} });
const add = (o, r) => { o.n += r.games; o.v += r.wins; o.s += r.rooms; o.sp += r.lostRooms; o.d += r.defeats; o.inj += r.injected || 0; for (const k in r.lost) o.lost[k] = (o.lost[k] || 0) + r.lost[k]; };
const rate = o => (o.n ? o.v / o.n : 0);
const lisse = o => (o.v + .5) / (o.n + 1);   // avoids a zero variance at 0% or 100%
const rateVariance = o => lisse(o) * (1 - lisse(o)) / (o.n + 1);
// Gap between two independent samples (a minus b) and its z index.
const compare = (a, b) => { const d = rate(a) - rate(b), se = Math.sqrt(rateVariance(a) + rateVariance(b)); return { delta: d, z: se ? d / se : 0, se }; };
const checkErrors = res => {
  const e = Object.values(res).filter(r => r.errors);
  if (e.length) log(`\n⚠ ${e.reduce((a, r) => a + r.errors, 0)} partie(s) en erreur (exclues). Exemple : ${e[0].lastError}`);
};
const csvRow = (...c) => c.join(';');

// ---------- Phase 1: heroes ----------
async function heroesPhase() {
  const probe = load({ fast: true });
  const heroes = Object.keys(probe.X.HEROES), dungeons = Object.keys(probe.X.DUNGEONS), name = id => probe.X.HEROES[id].name, dungeonName = id => probe.X.DUNGEONS[id].name;
  const tasks = [];
  for (const strat of STRATS) for (let a = 0; a < heroes.length; a++) for (let b = a + 1; b < heroes.length; b++) for (const d of dungeons)
    tasks.push({ id: tasks.length, key: `L|${strat}|${a}|${b}|${d}`, strat, heroes: [heroes[a], heroes[b]], dungeon: d, n: N.heroes, a, b, di: dungeons.indexOf(d) });
  phaseStart = Date.now(); phaseGames = tasks.length * N.heroes;
  log(`Héros : ${heroes.length} héros, ${heroes.length * (heroes.length - 1) / 2} paires × ${dungeons.length} donjons × ${STRATS.length} stratégie(s) × ${N.heroes} parties = ${tasks.length * N.heroes} parties (graine ${SEED}, ${THREADS} fils).`);
  const res = await execute(tasks);
  checkErrors(res);

  const byStrat = {};
  STRATS.forEach(st => {
    const T = ag(), L = heroes.map(() => ag()), D = dungeons.map(() => ag()), LD = heroes.map(() => dungeons.map(() => ag()));
    tasks.filter(t => t.strat === st).forEach(t => { const r = res[t.id]; add(T, r); add(L[t.a], r); add(L[t.b], r); add(D[t.di], r); add(LD[t.a][t.di], r); add(LD[t.b][t.di], r); });
    byStrat[st] = { T, L, D, LD };
  });
  const all = ag(), allL = heroes.map(() => ag());
  tasks.forEach(t => { const r = res[t.id]; add(all, r); add(allL[t.a], r); add(allL[t.b], r); });
  // Gap of a hero versus the games without them (each game counts two heroes: the real gap is therefore a little larger).
  const versus = (o, tot) => compare(o, { n: tot.n - o.n, v: tot.v - o.v });

  STRATS.forEach(st => {
    const S = byStrat[st];
    log(`\n══ Stratégie « ${st} » : ${pct(rate(S.T))} de victoires sur ${S.T.n} parties, salle atteinte moyenne ${(S.T.s / S.T.n).toFixed(1)}`);
    log('   Donjons : ' + dungeons.map((d, i) => `${dungeonName(d)} ${pct(rate(S.D[i]))}`).join(' · '));
  });

  const rows = heroes.map((h, i) => {
    const byS = STRATS.map(st => ({ st, rate: rate(byStrat[st].L[i]), ...versus(byStrat[st].L[i], byStrat[st].T) }));
    const avg = versus(allL[i], all), dj = dungeons.map((d, di) => { const o = ag(); STRATS.forEach(st => { o.n += byStrat[st].LD[i][di].n; o.v += byStrat[st].LD[i][di].v; }); return rate(o); });
    const signs = new Set(byS.filter(x => Math.abs(x.delta) * 100 >= THRESHOLD / 2).map(x => Math.sign(x.delta)));
    let verdict = 'ok';
    if (Math.abs(avg.z) >= 3 && Math.abs(avg.delta) * 100 >= THRESHOLD) verdict = avg.delta > 0 ? '▲ TROP FORT' : '▼ TROP FAIBLE';
    else if (Math.abs(avg.z) >= 3) verdict = avg.delta > 0 ? '(légèrement fort)' : '(légèrement faible)';
    if (signs.size > 1) verdict += ' ⚠ dépend de la stratégie';
    return { id: h, name: name(h), rate: rate(allL[i]), delta: avg.delta, z: avg.z, rooms: allL[i].s / allL[i].n, byStrategy: byS, byDungeon: dj, verdict };
  }).sort((a, b) => b.delta - a.delta);

  log(`\n${pad('Héros', 24)}${STRATS.map(st => padl(st.slice(0, 9), 10)).join('')}${padl('Moyenne', 9)}${padl('Écart', 8)}${padl('z', 6)}${padl('Salles', 8)}  Verdict`);
  rows.forEach(l => log(`${pad(l.name, 24)}${l.byStrategy.map(x => padl(pct(x.rate), 10)).join('')}${padl(pct(l.rate), 9)}${padl(pts(l.delta), 8)}${padl(l.z.toFixed(1), 6)}${padl(l.rooms.toFixed(1), 8)}  ${l.verdict}`));
  log(`\nÉcart = points de victoires de plus (ou de moins) que les parties sans ce héros. z = écart / erreur-type (≥ 3 : pas du hasard). « Trop fort / faible » à partir de ${THRESHOLD} points.`);

  log('\nVictoires par donjon (toutes stratégies) :');
  log(`${pad('Héros', 24)}${dungeons.map(d => padl(dungeonName(d).replace(/^(Le |La |L')/, '').slice(0, 11), 13)).join('')}`);
  rows.forEach(l => log(`${pad(l.name, 24)}${l.byDungeon.map(x => padl(pct(x), 13)).join('')}`));

  const P = heroes.map(() => heroes.map(() => ag())), PP = {};
  tasks.forEach(t => { const r = res[t.id]; add(P[t.a][t.b], r); add(P[t.b][t.a], r); const k = `${t.a}-${t.b}`; PP[k] = PP[k] || ag(); add(PP[k], r); });
  log('\nMeilleur et pire partenaire de chacun :');
  rows.forEach(l => { const i = heroes.indexOf(l.id), pa = heroes.map((p, j) => j).filter(j => j !== i), m = pa.reduce((b, j) => (rate(P[i][j]) > rate(P[i][b]) ? j : b)), w = pa.reduce((b, j) => (rate(P[i][j]) < rate(P[i][b]) ? j : b));
    log(`  ${pad(l.name, 24)}meilleur : ${pad(`${name(heroes[m])} ${pct(rate(P[i][m]))}`, 34)}pire : ${name(heroes[w])} ${pct(rate(P[i][w]))}`); });
  const base = rate(all);
  const syn = Object.entries(PP).map(([k, o]) => {
    const [a, b] = k.split('-').map(Number), expected = base + (rate(allL[a]) - base) + (rate(allL[b]) - base);
    return { pair: `${name(heroes[a])} + ${name(heroes[b])}`, rate: rate(o), gap: rate(o) - expected, z: (rate(o) - expected) / Math.sqrt(rateVariance(o)) };
  }).sort((a, b) => b.gap - a.gap);
  const show = l => l.forEach(s => log(`  ${pad(s.pair, 50)}${padl(pct(s.rate), 8)}  ${padl(pts(s.gap), 6)} pts (z ${s.z.toFixed(1)})`));
  log('\nPaires plus fortes que la somme de leurs deux héros (synergies) :'); show(syn.slice(0, 5));
  log('Paires plus faibles que la somme (anti-synergies) :'); show(syn.slice(-5).reverse());
  log('Paires les plus fortes au total :'); show(syn.slice().sort((a, b) => b.rate - a.rate).slice(0, 5));
  log('Paires les plus faibles au total :'); show(syn.slice().sort((a, b) => a.rate - b.rate).slice(0, 5));

  const csv = [csvRow('strategy', 'pair', 'dungeon', 'games', 'wins', 'rate', 'avg_rooms')];
  tasks.forEach(t => { const r = res[t.id]; csv.push(csvRow(t.strat, `${name(t.heroes[0])} + ${name(t.heroes[1])}`, t.dungeon, r.games, r.wins, (r.wins / Math.max(r.games, 1)).toFixed(4), (r.rooms / Math.max(r.games, 1)).toFixed(2))); });
  fs.writeFileSync(path.join(outputDir, 'heroes-pairs.csv'), csv.join('\n') + '\n');
  fs.writeFileSync(path.join(outputDir, 'heroes.json'), JSON.stringify({ options: { scale: SCALE, games: N.heroes, seed: SEED, strategies: STRATS }, global: base, dungeons: dungeons.map(d => ({ id: d, name: dungeonName(d) })), heroes: rows, synergies: syn }, null, 1));
  log(`\nDétails : ${relatif('heroes.json')} (et heroes-pairs.csv)`);
  phaseEnd('heroes');
}

// ---------- Phases 2 and 3: servants and equipment ----------
async function cardsPhase(kind) {
  const probe = load({ fast: true });
  const heroes = Object.keys(probe.X.HEROES), dungeons = Object.keys(probe.X.DUNGEONS);
  const serv = kind === 'servant', title = serv ? 'Serviteurs' : 'Équipements', file = serv ? 'servants' : 'equipment';
  const cardList = (serv ? probe.X.SERVANTS : probe.X.EQUIPS).filter(c => !c.token);
  const configs = [];
  for (let a = 0; a < heroes.length; a++) for (let b = a + 1; b < heroes.length; b++) for (let di = 0; di < dungeons.length; di++) configs.push({ a, b, di });
  const tasks = [];
  // Control games (no forced card), then one task per card and per configuration.
  for (const st of CARD_STRATS) for (const c of configs)
    tasks.push({ id: tasks.length, key: `C|${st}|${c.a}|${c.b}|${c.di}`, strat: st, heroes: [heroes[c.a], heroes[c.b]], dungeon: dungeons[c.di], n: N.control, control: true, si: CARD_STRATS.indexOf(st), di: c.di });
  cardList.forEach((renderCard, ci) => { for (const st of CARD_STRATS) for (const c of configs)
    tasks.push({ id: tasks.length, key: `C|${st}|${c.a}|${c.b}|${c.di}`, strat: st, heroes: [heroes[c.a], heroes[c.b]], dungeon: dungeons[c.di], n: N.cardList, force: { kind, id: renderCard.id }, ci, si: CARD_STRATS.indexOf(st), di: c.di }); });
  const total = tasks.reduce((a, t) => a + t.n, 0);
  phaseStart = Date.now(); phaseGames = total;
  log(`${title} : ${cardList.length} cartes × ${configs.length} paires-donjons × ${CARD_STRATS.length} stratégie(s) × ${N.cardList} parties + témoins (${N.control} par configuration) = ${total} parties (graine ${SEED}, ${THREADS} fils).`);
  const res = await execute(tasks);
  checkErrors(res);

  const nS = CARD_STRATS.length;
  const control = CARD_STRATS.map(() => ag()), controlD = dungeons.map(() => CARD_STRATS.map(() => ag()));
  const byCard = cardList.map(() => CARD_STRATS.map(() => ag())), byCardD = cardList.map(() => dungeons.map(() => ag()));
  tasks.forEach(t => { const r = res[t.id]; if (t.control) { add(control[t.si], r); add(controlD[t.di][t.si], r); } else { add(byCard[t.ci][t.si], r); add(byCardD[t.ci][t.di], r); } });
  const tTot = ag(); control.forEach(o => { tTot.n += o.n; tTot.v += o.v; });
  log(`\nParties témoins (aucune carte forcée) : ${pct(rate(tTot))} de victoires (${CARD_STRATS.map((s, i) => `${s} ${pct(rate(control[i]))}`).join(', ')}).`);

  // Result of each card: gap versus the control of the same strategy, then average weighted by the card's number of games.
  const rows = cardList.map((c, ci) => {
    const o = ag(); let expected = 0, expectedValue = 0;
    CARD_STRATS.forEach((s, si) => { const x = byCard[ci][si]; o.n += x.n; o.v += x.v; o.inj += x.inj; o.s += x.s; expected += x.n * rate(control[si]); expectedValue += x.n * x.n * rateVariance(control[si]); });
    const delta = rate(o) - expected / o.n, se = Math.sqrt(rateVariance(o) + expectedValue / (o.n * o.n));
    const byS = CARD_STRATS.map((s, si) => rate(byCard[ci][si]) - rate(control[si]));
    const byD = dungeons.map((d, di) => rate(byCardD[ci][di]) - controlD[di].reduce((a, y) => a + rate(y), 0) / nS);
    return { id: c.id, name: c.name, rank: c.rank, types: c.types || (c.type ? [c.type] : []), atk: c.atk, hp: c.hp, delta, se, z: se ? delta / se : 0, byStrategy: byS, byDungeon: byD, presence: o.n ? o.inj / o.n : 0, rooms: o.s / Math.max(o.n, 1), n: o.n };
  });
  // Comparison with the cohort of the same rank.
  const ranks = [...new Set(rows.map(l => l.rank))].sort((a, b) => a - b), cohort = {};
  ranks.forEach(r => { const l = rows.filter(x => x.rank === r); cohort[r] = { n: l.length, avg: l.reduce((a, x) => a + x.delta, 0) / l.length }; });
  rows.forEach(l => {
    l.rankGap = l.delta - cohort[l.rank].avg; l.rankZ = l.se ? l.rankGap / l.se : 0;
    l.verdict = Math.abs(l.rankZ) >= 3 && Math.abs(l.rankGap) * 100 >= THRESHOLD ? (l.rankGap > 0 ? '▲ TROP FORTE pour son rang' : '▼ TROP FAIBLE pour son rang')
      : Math.abs(l.rankZ) >= 3 ? (l.rankGap > 0 ? '(un peu forte)' : '(un peu faible)') : 'ok';
    const signs = new Set(l.byStrategy.filter(x => Math.abs(x) * 100 >= THRESHOLD / 2).map(Math.sign));
    if (signs.size > 1) l.verdict += ' ⚠ dépend de la stratégie';
  });

  log(`\nEffet moyen d'une carte selon son rang (points de victoires de plus que sans carte) :`);
  ranks.forEach(r => log(`  rang ${r} : ${pts(cohort[r].avg)} pts (${cohort[r].n} cartes)`));
  const sort = rows.slice().sort((a, b) => b.rankGap - a.rankGap);
  log(`\n${pad(serv ? 'Serviteur' : 'Équipement', 30)}${padl('Rang', 5)}${padl(serv ? 'ATQ/PV' : 'Type', serv ? 8 : 14)}${padl('Effet', 8)}${padl('/rang', 8)}${padl('z', 6)}${CARD_STRATS.map(s => padl(s.slice(0, 8), 10)).join('')}${padl('Présence', 10)}  Verdict`);
  sort.forEach(l => log(`${pad(l.name, 30)}${padl(l.rank, 5)}${padl(serv ? `${l.atk}/${l.hp}` : l.types.join(','), serv ? 8 : 14)}${padl(pts(l.delta), 8)}${padl(pts(l.rankGap), 8)}${padl(l.rankZ.toFixed(1), 6)}${l.byStrategy.map(x => padl(pts(x), 10)).join('')}${padl(pct(l.presence), 10)}  ${l.verdict}`));
  log(`\nEffet = points de victoires de plus (ou moins) que les parties témoins quand la carte est donnée au joueur. /rang = effet moins l'effet moyen des cartes du même rang : c'est lui qui juge la carte. Présence = parties où la carte a pu être donnée.`);
  const strongOnes = sort.filter(l => l.verdict.startsWith('▲')), weakOnes = sort.filter(l => l.verdict.startsWith('▼'));
  log(`\nÀ surveiller : ${strongOnes.length} carte(s) trop forte(s) pour leur rang${strongOnes.length ? ' (' + strongOnes.slice(0, 8).map(l => l.name).join(', ') + ')' : ''} ; ${weakOnes.length} trop faible(s)${weakOnes.length ? ' (' + weakOnes.slice(-8).map(l => l.name).join(', ') + ')' : ''}.`);

  const csv = [csvRow('card', 'rank', 'types', 'effect', 'effect_per_rank', 'z', ...CARD_STRATS, ...dungeons.map(d => `donjon_${d}`), 'presence', 'verdict')];
  sort.forEach(l => csv.push(csvRow(l.name, l.rank, l.types.join('+'), l.delta.toFixed(4), l.rankGap.toFixed(4), l.rankZ.toFixed(2), ...l.byStrategy.map(x => x.toFixed(4)), ...l.byDungeon.map(x => x.toFixed(4)), l.presence.toFixed(3), l.verdict)));
  fs.writeFileSync(path.join(outputDir, `${file}.csv`), csv.join('\n') + '\n');
  fs.writeFileSync(path.join(outputDir, `${file}.json`), JSON.stringify({ options: { scale: SCALE, seed: SEED, strategies: CARD_STRATS, cardList: N.cardList, control: N.control }, control: rate(tTot), cohort, cardList: sort }, null, 1));
  log(`\nDétails : ${relatif(file + '.json')} (et ${file}.csv)`);
  phaseEnd(file);
}

// ---------- Phase 4: dungeons ----------
async function dungeonsPhase() {
  const probe = load({ fast: true });
  const heroes = Object.keys(probe.X.HEROES), dungeons = Object.keys(probe.X.DUNGEONS), name = id => probe.X.HEROES[id].name;
  const D = probe.X.DUNGEONS, types = probe.X.ALL_TYPES;
  const pairs = []; for (let a = 0; a < heroes.length; a++) for (let b = a + 1; b < heroes.length; b++) pairs.push([a, b]);
  const tasks = [];
  for (const st of STRATS) for (let di = 0; di < dungeons.length; di++) for (const [a, b] of pairs)
    tasks.push({ id: tasks.length, key: `D|${st}|${a}|${b}|${di}`, strat: st, heroes: [heroes[a], heroes[b]], dungeon: dungeons[di], n: N.dungeons, a, b, di, si: STRATS.indexOf(st) });
  // Each possible random Boss type, imposed in turn (the other type stays random).
  for (const st of STRATS) for (let di = 0; di < dungeons.length; di++) {
    const d = D[dungeons[di]], fixes = [d.type, ...d.minis];
    for (const t of types.filter(x => !fixes.includes(x))) for (const [a, b] of pairs)
      tasks.push({ id: tasks.length, key: `X|${st}|${a}|${b}|${di}|${t}`, strat: st, heroes: [heroes[a], heroes[b]], dungeon: dungeons[di], n: N.extras, extra: t, a, b, di, si: STRATS.indexOf(st) });
  }
  const total = tasks.reduce((a, t) => a + t.n, 0);
  phaseStart = Date.now(); phaseGames = total;
  log(`Donjons : ${dungeons.length} donjons × ${pairs.length} paires × ${STRATS.length} stratégie(s) × ${N.dungeons} parties, plus chaque type de Boss imposé (${N.extras} parties) = ${total} parties (graine ${SEED}, ${THREADS} fils).`);
  const res = await execute(tasks);
  checkErrors(res);

  const base = dungeons.map(() => STRATS.map(() => ag())), baseAll = dungeons.map(() => ag()), baseL = dungeons.map(() => heroes.map(() => ag()));
  const extras = dungeons.map(() => ({}));
  tasks.forEach(t => {
    const r = res[t.id];
    if (!t.extra) { add(base[t.di][t.si], r); add(baseAll[t.di], r); add(baseL[t.di][t.a], r); add(baseL[t.di][t.b], r); }
    else { const e = extras[t.di][t.extra] = extras[t.di][t.extra] || ag(); add(e, r); }
  });
  const global = ag(); baseAll.forEach(o => { global.n += o.n; global.v += o.v; });
  log(`\nVictoires globales : ${pct(rate(global))} sur ${global.n} parties de référence.`);

  const percentile = (hist, q) => { const ks = Object.keys(hist).map(Number).sort((a, b) => a - b), tot = ks.reduce((a, k) => a + hist[k], 0); let c = 0; for (const k of ks) { c += hist[k]; if (c >= q * tot) return k; } return 0; };
  log(`\n${pad('Donjon', 28)}${STRATS.map(s => padl(s.slice(0, 9), 10)).join('')}${padl('Moyenne', 9)}${padl('Écart', 8)}${padl('Salles', 8)}${padl('PV Boss', 9)}  Salle de défaite (25 % / médiane / 75 %)   Verdict`);
  const dj = dungeons.map((id, di) => {
    const o = baseAll[di], rest = { n: global.n - o.n, v: global.v - o.v }, c = compare(o, rest);
    const verdict = Math.abs(c.z) >= 3 && Math.abs(c.delta) * 100 >= THRESHOLD * 2 ? (c.delta > 0 ? '▲ TROP FACILE' : '▼ TROP DUR') : Math.abs(c.z) >= 3 ? (c.delta > 0 ? '(plutôt facile)' : '(plutôt dur)') : 'ok';
    return { id, name: D[id].name, rate: rate(o), delta: c.delta, z: c.z, byStrat: STRATS.map((s, si) => rate(base[di][si])), rooms: o.s / o.n, bossHp: D[id].boss.hp, q: [percentile(o.lost, .25), percentile(o.lost, .5), percentile(o.lost, .75)], totalLosses: o.d, verdict };
  });
  dj.forEach(l => log(`${pad(l.name, 28)}${l.byStrat.map(x => padl(pct(x), 10)).join('')}${padl(pct(l.rate), 9)}${padl(pts(l.delta), 8)}${padl(l.rooms.toFixed(1), 8)}${padl(l.bossHp, 9)}  ${pad(l.q.join(' / '), 38)}${l.verdict}`));
  log(`\nÉcart = points de victoires de plus que dans les autres donjons. Les trois stratégies du bot ne gagnent pas aussi souvent : seuls les écarts entre donjons comptent. « Trop facile / dur » à partir de ${THRESHOLD * 2} points.`);

  // Affinities: a hero whose result in a dungeon departs from what is expected of them and of the dungeon.
  const lTot = heroes.map((h, i) => { const o = ag(); dungeons.forEach((d, di) => { o.n += baseL[di][i].n; o.v += baseL[di][i].v; }); return o; });
  const aff = [];
  heroes.forEach((h, i) => dungeons.forEach((d, di) => {
    const o = baseL[di][i], expected = rate(lTot[i]) + rate(baseAll[di]) - rate(global), gap = rate(o) - expected, se = Math.sqrt(rateVariance(o));
    aff.push({ hero: name(h), dungeon: D[d].name, rate: rate(o), gap, z: se ? gap / se : 0 });
  }));
  aff.sort((a, b) => b.gap - a.gap);
  const lAff = l => l.forEach(x => log(`  ${pad(x.hero, 24)}${pad(x.dungeon, 28)}${padl(pct(x.rate), 8)}  ${padl(pts(x.gap), 6)} pts (z ${x.z.toFixed(1)})`));
  log('\nHeroes qui brillent dans un donjon (plus que ce que prédisent leur force et la dureté du donjon) :'); lAff(aff.slice(0, 6));
  log('Héros qui y souffrent :'); lAff(aff.slice(-6).reverse());

  // Imposed random Boss type.
  log('\nType aléatoire du Boss imposé (effet sur les victoires du joueur, contre les parties de référence du donjon) :');
  const extraLines = [];
  dungeons.forEach((id, di) => {
    const fixes = [D[id].type, ...D[id].minis];
    log(`  ${D[id].name} (types fixes : ${fixes.join(', ')})`);
    const l = Object.entries(extras[di]).map(([t, o]) => ({ dungeon: D[id].name, type: t, rate: rate(o), ...compare(o, baseAll[di]), n: o.n })).sort((a, b) => a.delta - b.delta);
    l.forEach(x => { x.verdict = Math.abs(x.z) >= 3 && Math.abs(x.delta) * 100 >= THRESHOLD ? (x.delta < 0 ? '▼ Boss plus dur' : '▲ Boss plus facile') : ''; extraLines.push(x); });
    log('    ' + l.map(x => `${x.type} ${pts(x.delta)}${x.verdict ? ' *' : ''}`).join(' · '));
  });
  log('  (* : écart d\'au moins ' + THRESHOLD + ' points et z ≥ 3.) Les comportements des plateaux du Boss sont tirés au hasard et ne peuvent pas être imposés.');
  const marker = extraLines.filter(x => x.verdict).sort((a, b) => a.delta - b.delta);
  if (marker.length) { log('\nTypes de Boss qui changent vraiment la partie :'); marker.forEach(x => log(`  ${pad(x.dungeon, 28)}${pad(x.type, 16)}${padl(pts(x.delta), 7)} pts (z ${x.z.toFixed(1)}) ${x.verdict}`)); }

  fs.writeFileSync(path.join(outputDir, 'dungeons.json'), JSON.stringify({ options: { scale: SCALE, seed: SEED, strategies: STRATS, games: N.dungeons, extras: N.extras }, dungeons: dj, affinities: aff, bossTypes: extraLines }, null, 1));
  log(`\nDétails : ${relatif('dungeons.json')}`);
  phaseEnd('dungeons');
}

(async () => {
  const launch = { heroes: heroesPhase, servants: () => cardsPhase('servant'), equipment: () => cardsPhase('equip'), dungeons: dungeonsPhase };
  const list = phase === 'all' ? PHASES : [phase];
  TEST = history.createTest({ scale: SCALE, factor: FACTOR, seed: SEED, games: N, strategies: STRATS, cardStrategies: CARD_STRATS, threshold: THRESHOLD, note: NOTE, requested: list },
    NO_HISTORY ? { folder: path.join(history.root, 'temp', 'balance', 'essai') } : {});
  outputDir = TEST.folder;
  console.log(`Test ${TEST.id} (${NO_HISTORY ? 'non versionné : ' : ''}${path.relative(history.root, outputDir)})`);
  const startedAt = Date.now();
  for (const p of list) { if (list.length > 1) console.log(`\n████ Phase : ${p} ████\n`); await launch[p](); }
  TEST.meta.seconds = Math.round((Date.now() - startedAt) / 1000); TEST.save();
  if (!NO_HISTORY) history.reindex();
})().catch(e => { console.error(e); process.exit(1); });
