// Tests d'équilibrage par simulation massive, sans navigateur et sans Claude.
// Un joueur automatique (outils/bot-joueur.js) joue des milliers de parties avec le vrai code du prototype.
//
// Usage : node outils/equilibrage.js <phase> [options]
//   phase : lieutenants | serviteurs | equipements | donjons | tout (les quatre, dans cet ordre)
//   --echelle=normal    taille des tests : petit (vérification, ~2 min), normal (~25 min), massif (~1 h)
//   --facteur=1         multiplie le nombre de parties de l'échelle choisie
//   --graine=1          graine de départ : mêmes options + même graine = mêmes résultats
//   --strategie=a,b     stratégies du bot (niveau | equilibre | tempo), voir bot-joueur.js.
//                       Par défaut : les trois pour les lieutenants et les donjons, equilibre et tempo pour les cartes.
//   --fils=N            nombre de fils de calcul (par défaut : nombre de cœurs - 1)
//   --seuil=4           écart (en points de % de victoires) à partir duquel on signale un élément
//
// Principe : chaque test cible un élément et le confronte systématiquement à tout le reste.
//  - lieutenants : chaque lieutenant est joué avec chacun des autres (toutes les paires), et chaque paire rejoue dans tous les donjons ;
//  - serviteurs / équipements : la carte testée est donnée au joueur (dès que son niveau de renfort permet de l'avoir), dans toutes
//    les paires de lieutenants × tous les donjons, puis comparée à des parties témoins sans carte forcée. On la compare aussi aux autres
//    cartes de même rang, car une carte de rang élevé est évidemment plus forte qu'une carte de rang 1 ;
//  - donjons : chaque donjon est joué avec toutes les paires de lieutenants, et chaque type aléatoire possible du Boss est imposé à tour de rôle.
// Chaque test est enregistré dans tests/historique/<date-échelle>/ (versionné) : voir outils/historique.js. La page « Test » du site
// (outils/serveur-local.js, site/tests.html) les affiche, les compare et peut aussi les lancer.
//   --note="texte"      commentaire gardé avec le test (ce qui a changé, ce qu'on voulait vérifier)
//   --sans-historique   écrit dans temp/equilibrage/essai (non versionné) au lieu de tests/historique/
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), os = require('os');
const { charger } = require('./charger-jeu');
const { jouerPartie, strategies } = require('./bot-joueur');
const historique = require('./historique');

// ---------- Travail d'un fil : joue les tâches reçues ----------
if (!isMainThread) {
  const jeu = charger({ rapide: true }), { graine, taches } = workerData;
  const hashTexte = t => [...t].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const hash = (...v) => v.reduce((h, x) => Math.imul(h ^ ((typeof x === 'string' ? hashTexte(x) : x) + 0x9E3779B9), 0x85EBCA6B) >>> 0, 2166136261);
  for (const t of taches) {
    const r = { id: t.id, parties: 0, victoires: 0, salles: 0, sallesPerdues: 0, defaites: 0, erreurs: 0, injectees: 0, perdues: {} };
    jeu.forcerExtra(t.extra || null);
    for (let k = 0; k < t.n; k++) {
      // La graine ne dépend que de la configuration (stratégie, paire, donjon, type du Boss) et du numéro de partie :
      // une partie témoin et la même partie avec une carte forcée démarrent donc de la même façon.
      jeu.semer(hash(graine, t.cle, k));
      try {
        const p = jouerPartie(jeu, t.heros, t.donjon, { strategie: t.strat, forcer: t.forcer || null });
        r.parties++; r.salles += p.salles; if (p.injecteSalle) r.injectees++;
        if (p.win) r.victoires++; else { r.defaites++; r.sallesPerdues += p.salles; r.perdues[p.salles] = (r.perdues[p.salles] || 0) + 1; }
      } catch (e) { r.erreurs++; r.derniereErreur = String(e.stack || e).split('\n').slice(0, 2).join(' | '); }
    }
    parentPort.postMessage(r);
  }
  process.exit(0);
}

// ---------- Programme principal ----------
const args = process.argv.slice(2);
const phase = args.find(a => !a.startsWith('--'));
const opt = (nom, def) => { const a = args.find(x => x.startsWith(`--${nom}=`)); return a ? a.split('=')[1] : def; };
const GRAINE = +opt('graine', 1), SEUIL = +opt('seuil', 4), ECHELLE = opt('echelle', 'normal'), FACTEUR = +opt('facteur', 1);
const NOTE = opt('note', ''), SANS_HISTORIQUE = args.includes('--sans-historique');
const FILS = Math.max(1, +opt('fils', Math.max(1, os.cpus().length - 1)));
const strOpt = opt('strategie', null);
const STRATS = (strOpt || strategies.join(',')).split(','), STRATS_CARTES = (strOpt || 'equilibre,tempo').split(',');
// Parties par combinaison, selon l'échelle. cartes : par carte forcée et par configuration (paire × donjon × stratégie) ; temoin : parties témoins par configuration.
const ECHELLES = historique.echelles;
if (!ECHELLES[ECHELLE]) { console.error(`Échelle inconnue : ${ECHELLE} (${Object.keys(ECHELLES).join(', ')})`); process.exit(2); }
const N = Object.fromEntries(Object.entries(ECHELLES[ECHELLE]).map(([k, v]) => [k, Math.max(1, Math.round(v * FACTEUR))]));
const PHASES = ['lieutenants', 'serviteurs', 'equipements', 'donjons'];
if (phase !== 'tout' && !PHASES.includes(phase)) { console.error(`Phase à indiquer : ${PHASES.join(' | ')} | tout`); process.exit(2); }
const inconnue = [...STRATS, ...STRATS_CARTES].find(x => !strategies.includes(x));
if (inconnue) { console.error(`Stratégie inconnue : ${inconnue} (${strategies.join(', ')})`); process.exit(2); }

const pct = x => `${(x * 100).toFixed(1)}%`, pts = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;
const pad = (s, n) => String(s).padEnd(n), padl = (s, n) => String(s).padStart(n);
// Dossier du test en cours (créé au lancement, voir la fin du fichier) et son enregistrement.
let sortie = null, TEST = null;
const relatif = f => path.relative(historique.racine, path.join(sortie, f));
// Note la taille et la durée d'une phase dans meta.json, puis écrit son rapport.
let debutPhase = 0, partiesPhase = 0;
const finPhase = nom => { TEST.meta.phases[nom] = { parties: partiesPhase, secondes: Math.round((Date.now() - debutPhase) / 1000) }; TEST.sauver(); ecrireRapport(nom); };
// Le rapport s'affiche et s'accumule pour être écrit dans un fichier à la fin de chaque phase.
let rapport = [];
const log = (...a) => { const t = a.join(' '); console.log(t); rapport.push(t); };
const ecrireRapport = nom => { fs.writeFileSync(path.join(sortie, `rapport-${nom}.txt`), rapport.join('\n') + '\n'); rapport = []; };

// Lance les tâches sur plusieurs fils et renvoie les résultats par identifiant.
function executer(taches) {
  return new Promise((resolve, reject) => {
    const parFil = Array.from({ length: Math.min(FILS, taches.length) }, () => []);
    taches.forEach((t, i) => parFil[i % parFil.length].push(t));
    const res = {}; let restants = taches.length, faits = 0, derniere = 0; const debut = Date.now();
    parFil.forEach(lot => {
      const w = new Worker(__filename, { workerData: { graine: GRAINE, taches: lot } });
      w.on('message', r => {
        res[r.id] = r; restants--; faits++;
        if (Date.now() - derniere > 2000 || !restants) { derniere = Date.now(); process.stderr.write(`\r  ${faits}/${taches.length} tâches (${Math.round((Date.now() - debut) / 1000)} s)   `); }
        if (!restants) { process.stderr.write('\n'); resolve(res); }
      });
      w.on('error', reject);
    });
  });
}

// ---------- Statistiques ----------
const ag = () => ({ n: 0, v: 0, s: 0, sp: 0, d: 0, inj: 0, perdues: {} });
const add = (o, r) => { o.n += r.parties; o.v += r.victoires; o.s += r.salles; o.sp += r.sallesPerdues; o.d += r.defaites; o.inj += r.injectees || 0; for (const k in r.perdues) o.perdues[k] = (o.perdues[k] || 0) + r.perdues[k]; };
const taux = o => (o.n ? o.v / o.n : 0);
const lisse = o => (o.v + .5) / (o.n + 1);   // évite une variance nulle à 0 % ou 100 %
const varTaux = o => lisse(o) * (1 - lisse(o)) / (o.n + 1);
// Écart de deux échantillons indépendants (a moins b) et son indice z.
const compare = (a, b) => { const d = taux(a) - taux(b), se = Math.sqrt(varTaux(a) + varTaux(b)); return { delta: d, z: se ? d / se : 0, se }; };
const verifierErreurs = res => {
  const e = Object.values(res).filter(r => r.erreurs);
  if (e.length) log(`\n⚠ ${e.reduce((a, r) => a + r.erreurs, 0)} partie(s) en erreur (exclues). Exemple : ${e[0].derniereErreur}`);
};
const csvLigne = (...c) => c.join(';');

// ---------- Phase 1 : lieutenants ----------
async function phaseLieutenants() {
  const probe = charger({ rapide: true });
  const heros = Object.keys(probe.X.HEROES), donjons = Object.keys(probe.X.DUNGEONS), nom = id => probe.X.HEROES[id].name, nomD = id => probe.X.DUNGEONS[id].name;
  const taches = [];
  for (const strat of STRATS) for (let a = 0; a < heros.length; a++) for (let b = a + 1; b < heros.length; b++) for (const d of donjons)
    taches.push({ id: taches.length, cle: `L|${strat}|${a}|${b}|${d}`, strat, heros: [heros[a], heros[b]], donjon: d, n: N.lieutenants, a, b, di: donjons.indexOf(d) });
  debutPhase = Date.now(); partiesPhase = taches.length * N.lieutenants;
  log(`Lieutenants : ${heros.length} lieutenants, ${heros.length * (heros.length - 1) / 2} paires × ${donjons.length} donjons × ${STRATS.length} stratégie(s) × ${N.lieutenants} parties = ${taches.length * N.lieutenants} parties (graine ${GRAINE}, ${FILS} fils).`);
  const res = await executer(taches);
  verifierErreurs(res);

  const parStrat = {};
  STRATS.forEach(st => {
    const T = ag(), L = heros.map(() => ag()), D = donjons.map(() => ag()), LD = heros.map(() => donjons.map(() => ag()));
    taches.filter(t => t.strat === st).forEach(t => { const r = res[t.id]; add(T, r); add(L[t.a], r); add(L[t.b], r); add(D[t.di], r); add(LD[t.a][t.di], r); add(LD[t.b][t.di], r); });
    parStrat[st] = { T, L, D, LD };
  });
  const tout = ag(), toutL = heros.map(() => ag());
  taches.forEach(t => { const r = res[t.id]; add(tout, r); add(toutL[t.a], r); add(toutL[t.b], r); });
  // Écart d'un lieutenant contre les parties sans lui (chaque partie compte deux lieutenants : l'écart réel est donc un peu plus grand).
  const contre = (o, tot) => compare(o, { n: tot.n - o.n, v: tot.v - o.v });

  STRATS.forEach(st => {
    const S = parStrat[st];
    log(`\n══ Stratégie « ${st} » : ${pct(taux(S.T))} de victoires sur ${S.T.n} parties, salle atteinte moyenne ${(S.T.s / S.T.n).toFixed(1)}`);
    log('   Donjons : ' + donjons.map((d, i) => `${nomD(d)} ${pct(taux(S.D[i]))}`).join(' · '));
  });

  const lignes = heros.map((h, i) => {
    const parS = STRATS.map(st => ({ st, taux: taux(parStrat[st].L[i]), ...contre(parStrat[st].L[i], parStrat[st].T) }));
    const moy = contre(toutL[i], tout), dj = donjons.map((d, di) => { const o = ag(); STRATS.forEach(st => { o.n += parStrat[st].LD[i][di].n; o.v += parStrat[st].LD[i][di].v; }); return taux(o); });
    const signes = new Set(parS.filter(x => Math.abs(x.delta) * 100 >= SEUIL / 2).map(x => Math.sign(x.delta)));
    let verdict = 'ok';
    if (Math.abs(moy.z) >= 3 && Math.abs(moy.delta) * 100 >= SEUIL) verdict = moy.delta > 0 ? '▲ TROP FORT' : '▼ TROP FAIBLE';
    else if (Math.abs(moy.z) >= 3) verdict = moy.delta > 0 ? '(légèrement fort)' : '(légèrement faible)';
    if (signes.size > 1) verdict += ' ⚠ dépend de la stratégie';
    return { id: h, nom: nom(h), taux: taux(toutL[i]), delta: moy.delta, z: moy.z, salles: toutL[i].s / toutL[i].n, parStrategie: parS, parDonjon: dj, verdict };
  }).sort((a, b) => b.delta - a.delta);

  log(`\n${pad('Lieutenant', 24)}${STRATS.map(st => padl(st.slice(0, 9), 10)).join('')}${padl('Moyenne', 9)}${padl('Écart', 8)}${padl('z', 6)}${padl('Salles', 8)}  Verdict`);
  lignes.forEach(l => log(`${pad(l.nom, 24)}${l.parStrategie.map(x => padl(pct(x.taux), 10)).join('')}${padl(pct(l.taux), 9)}${padl(pts(l.delta), 8)}${padl(l.z.toFixed(1), 6)}${padl(l.salles.toFixed(1), 8)}  ${l.verdict}`));
  log(`\nÉcart = points de victoires de plus (ou de moins) que les parties sans ce lieutenant. z = écart / erreur-type (≥ 3 : pas du hasard). « Trop fort / faible » à partir de ${SEUIL} points.`);

  log('\nVictoires par donjon (toutes stratégies) :');
  log(`${pad('Lieutenant', 24)}${donjons.map(d => padl(nomD(d).replace(/^(Le |La |L')/, '').slice(0, 11), 13)).join('')}`);
  lignes.forEach(l => log(`${pad(l.nom, 24)}${l.parDonjon.map(x => padl(pct(x), 13)).join('')}`));

  const P = heros.map(() => heros.map(() => ag())), PP = {};
  taches.forEach(t => { const r = res[t.id]; add(P[t.a][t.b], r); add(P[t.b][t.a], r); const k = `${t.a}-${t.b}`; PP[k] = PP[k] || ag(); add(PP[k], r); });
  log('\nMeilleur et pire partenaire de chacun :');
  lignes.forEach(l => { const i = heros.indexOf(l.id), pa = heros.map((p, j) => j).filter(j => j !== i), m = pa.reduce((b, j) => (taux(P[i][j]) > taux(P[i][b]) ? j : b)), w = pa.reduce((b, j) => (taux(P[i][j]) < taux(P[i][b]) ? j : b));
    log(`  ${pad(l.nom, 24)}meilleur : ${pad(`${nom(heros[m])} ${pct(taux(P[i][m]))}`, 34)}pire : ${nom(heros[w])} ${pct(taux(P[i][w]))}`); });
  const base = taux(tout);
  const syn = Object.entries(PP).map(([k, o]) => {
    const [a, b] = k.split('-').map(Number), attendu = base + (taux(toutL[a]) - base) + (taux(toutL[b]) - base);
    return { paire: `${nom(heros[a])} + ${nom(heros[b])}`, taux: taux(o), ecart: taux(o) - attendu, z: (taux(o) - attendu) / Math.sqrt(varTaux(o)) };
  }).sort((a, b) => b.ecart - a.ecart);
  const montre = l => l.forEach(s => log(`  ${pad(s.paire, 50)}${padl(pct(s.taux), 8)}  ${padl(pts(s.ecart), 6)} pts (z ${s.z.toFixed(1)})`));
  log('\nPaires plus fortes que la somme de leurs deux lieutenants (synergies) :'); montre(syn.slice(0, 5));
  log('Paires plus faibles que la somme (anti-synergies) :'); montre(syn.slice(-5).reverse());
  log('Paires les plus fortes au total :'); montre(syn.slice().sort((a, b) => b.taux - a.taux).slice(0, 5));
  log('Paires les plus faibles au total :'); montre(syn.slice().sort((a, b) => a.taux - b.taux).slice(0, 5));

  const csv = [csvLigne('strategie', 'paire', 'donjon', 'parties', 'victoires', 'taux', 'salles_moyennes')];
  taches.forEach(t => { const r = res[t.id]; csv.push(csvLigne(t.strat, `${nom(t.heros[0])} + ${nom(t.heros[1])}`, t.donjon, r.parties, r.victoires, (r.victoires / Math.max(r.parties, 1)).toFixed(4), (r.salles / Math.max(r.parties, 1)).toFixed(2))); });
  fs.writeFileSync(path.join(sortie, 'lieutenants-paires.csv'), csv.join('\n') + '\n');
  fs.writeFileSync(path.join(sortie, 'lieutenants.json'), JSON.stringify({ options: { echelle: ECHELLE, parties: N.lieutenants, graine: GRAINE, strategies: STRATS }, global: base, donjons: donjons.map(d => ({ id: d, nom: nomD(d) })), lieutenants: lignes, synergies: syn }, null, 1));
  log(`\nDétails : ${relatif('lieutenants.json')} (et lieutenants-paires.csv)`);
  finPhase('lieutenants');
}

// ---------- Phases 2 et 3 : serviteurs et équipements ----------
async function phaseCartes(kind) {
  const probe = charger({ rapide: true });
  const heros = Object.keys(probe.X.HEROES), donjons = Object.keys(probe.X.DUNGEONS);
  const serv = kind === 'servant', titre = serv ? 'Serviteurs' : 'Équipements', fichier = serv ? 'serviteurs' : 'equipements';
  const cartes = (serv ? probe.X.SERVANTS : probe.X.EQUIPS).filter(c => !c.token);
  const configs = [];
  for (let a = 0; a < heros.length; a++) for (let b = a + 1; b < heros.length; b++) for (let di = 0; di < donjons.length; di++) configs.push({ a, b, di });
  const taches = [];
  // Parties témoins (aucune carte forcée), puis une tâche par carte et par configuration.
  for (const st of STRATS_CARTES) for (const c of configs)
    taches.push({ id: taches.length, cle: `C|${st}|${c.a}|${c.b}|${c.di}`, strat: st, heros: [heros[c.a], heros[c.b]], donjon: donjons[c.di], n: N.temoin, temoin: true, si: STRATS_CARTES.indexOf(st), di: c.di });
  cartes.forEach((carte, ci) => { for (const st of STRATS_CARTES) for (const c of configs)
    taches.push({ id: taches.length, cle: `C|${st}|${c.a}|${c.b}|${c.di}`, strat: st, heros: [heros[c.a], heros[c.b]], donjon: donjons[c.di], n: N.cartes, forcer: { kind, id: carte.id }, ci, si: STRATS_CARTES.indexOf(st), di: c.di }); });
  const total = taches.reduce((a, t) => a + t.n, 0);
  debutPhase = Date.now(); partiesPhase = total;
  log(`${titre} : ${cartes.length} cartes × ${configs.length} paires-donjons × ${STRATS_CARTES.length} stratégie(s) × ${N.cartes} parties + témoins (${N.temoin} par configuration) = ${total} parties (graine ${GRAINE}, ${FILS} fils).`);
  const res = await executer(taches);
  verifierErreurs(res);

  const nS = STRATS_CARTES.length;
  const temoin = STRATS_CARTES.map(() => ag()), temoinD = donjons.map(() => STRATS_CARTES.map(() => ag()));
  const parCarte = cartes.map(() => STRATS_CARTES.map(() => ag())), parCarteD = cartes.map(() => donjons.map(() => ag()));
  taches.forEach(t => { const r = res[t.id]; if (t.temoin) { add(temoin[t.si], r); add(temoinD[t.di][t.si], r); } else { add(parCarte[t.ci][t.si], r); add(parCarteD[t.ci][t.di], r); } });
  const tTot = ag(); temoin.forEach(o => { tTot.n += o.n; tTot.v += o.v; });
  log(`\nParties témoins (aucune carte forcée) : ${pct(taux(tTot))} de victoires (${STRATS_CARTES.map((s, i) => `${s} ${pct(taux(temoin[i]))}`).join(', ')}).`);

  // Résultat de chaque carte : écart contre le témoin de la même stratégie, puis moyenne pondérée par le nombre de parties de la carte.
  const lignes = cartes.map((c, ci) => {
    const o = ag(); let attendu = 0, vAttendu = 0;
    STRATS_CARTES.forEach((s, si) => { const x = parCarte[ci][si]; o.n += x.n; o.v += x.v; o.inj += x.inj; o.s += x.s; attendu += x.n * taux(temoin[si]); vAttendu += x.n * x.n * varTaux(temoin[si]); });
    const delta = taux(o) - attendu / o.n, se = Math.sqrt(varTaux(o) + vAttendu / (o.n * o.n));
    const parS = STRATS_CARTES.map((s, si) => taux(parCarte[ci][si]) - taux(temoin[si]));
    const parD = donjons.map((d, di) => taux(parCarteD[ci][di]) - temoinD[di].reduce((a, y) => a + taux(y), 0) / nS);
    return { id: c.id, nom: c.name, rang: c.rank, types: c.types || (c.type ? [c.type] : []), atk: c.atk, hp: c.hp, delta, se, z: se ? delta / se : 0, parStrategie: parS, parDonjon: parD, presence: o.n ? o.inj / o.n : 0, salles: o.s / Math.max(o.n, 1), n: o.n };
  });
  // Comparaison à la cohorte du même rang.
  const rangs = [...new Set(lignes.map(l => l.rang))].sort((a, b) => a - b), cohorte = {};
  rangs.forEach(r => { const l = lignes.filter(x => x.rang === r); cohorte[r] = { n: l.length, moy: l.reduce((a, x) => a + x.delta, 0) / l.length }; });
  lignes.forEach(l => {
    l.ecartRang = l.delta - cohorte[l.rang].moy; l.zRang = l.se ? l.ecartRang / l.se : 0;
    l.verdict = Math.abs(l.zRang) >= 3 && Math.abs(l.ecartRang) * 100 >= SEUIL ? (l.ecartRang > 0 ? '▲ TROP FORTE pour son rang' : '▼ TROP FAIBLE pour son rang')
      : Math.abs(l.zRang) >= 3 ? (l.ecartRang > 0 ? '(un peu forte)' : '(un peu faible)') : 'ok';
    const signes = new Set(l.parStrategie.filter(x => Math.abs(x) * 100 >= SEUIL / 2).map(Math.sign));
    if (signes.size > 1) l.verdict += ' ⚠ dépend de la stratégie';
  });

  log(`\nEffet moyen d'une carte selon son rang (points de victoires de plus que sans carte) :`);
  rangs.forEach(r => log(`  rang ${r} : ${pts(cohorte[r].moy)} pts (${cohorte[r].n} cartes)`));
  const tri = lignes.slice().sort((a, b) => b.ecartRang - a.ecartRang);
  log(`\n${pad(serv ? 'Serviteur' : 'Équipement', 30)}${padl('Rang', 5)}${padl(serv ? 'ATQ/PV' : 'Type', serv ? 8 : 14)}${padl('Effet', 8)}${padl('/rang', 8)}${padl('z', 6)}${STRATS_CARTES.map(s => padl(s.slice(0, 8), 10)).join('')}${padl('Présence', 10)}  Verdict`);
  tri.forEach(l => log(`${pad(l.nom, 30)}${padl(l.rang, 5)}${padl(serv ? `${l.atk}/${l.hp}` : l.types.join(','), serv ? 8 : 14)}${padl(pts(l.delta), 8)}${padl(pts(l.ecartRang), 8)}${padl(l.zRang.toFixed(1), 6)}${l.parStrategie.map(x => padl(pts(x), 10)).join('')}${padl(pct(l.presence), 10)}  ${l.verdict}`));
  log(`\nEffet = points de victoires de plus (ou moins) que les parties témoins quand la carte est donnée au joueur. /rang = effet moins l'effet moyen des cartes du même rang : c'est lui qui juge la carte. Présence = parties où la carte a pu être donnée.`);
  const forts = tri.filter(l => l.verdict.startsWith('▲')), faibles = tri.filter(l => l.verdict.startsWith('▼'));
  log(`\nÀ surveiller : ${forts.length} carte(s) trop forte(s) pour leur rang${forts.length ? ' (' + forts.slice(0, 8).map(l => l.nom).join(', ') + ')' : ''} ; ${faibles.length} trop faible(s)${faibles.length ? ' (' + faibles.slice(-8).map(l => l.nom).join(', ') + ')' : ''}.`);

  const csv = [csvLigne('carte', 'rang', 'types', 'effet', 'effet_par_rang', 'z', ...STRATS_CARTES, ...donjons.map(d => `donjon_${d}`), 'presence', 'verdict')];
  tri.forEach(l => csv.push(csvLigne(l.nom, l.rang, l.types.join('+'), l.delta.toFixed(4), l.ecartRang.toFixed(4), l.zRang.toFixed(2), ...l.parStrategie.map(x => x.toFixed(4)), ...l.parDonjon.map(x => x.toFixed(4)), l.presence.toFixed(3), l.verdict)));
  fs.writeFileSync(path.join(sortie, `${fichier}.csv`), csv.join('\n') + '\n');
  fs.writeFileSync(path.join(sortie, `${fichier}.json`), JSON.stringify({ options: { echelle: ECHELLE, graine: GRAINE, strategies: STRATS_CARTES, cartes: N.cartes, temoin: N.temoin }, temoin: taux(tTot), cohorte, cartes: tri }, null, 1));
  log(`\nDétails : ${relatif(fichier + '.json')} (et ${fichier}.csv)`);
  finPhase(fichier);
}

// ---------- Phase 4 : donjons ----------
async function phaseDonjons() {
  const probe = charger({ rapide: true });
  const heros = Object.keys(probe.X.HEROES), donjons = Object.keys(probe.X.DUNGEONS), nom = id => probe.X.HEROES[id].name;
  const D = probe.X.DUNGEONS, types = probe.X.ALL_TYPES;
  const paires = []; for (let a = 0; a < heros.length; a++) for (let b = a + 1; b < heros.length; b++) paires.push([a, b]);
  const taches = [];
  for (const st of STRATS) for (let di = 0; di < donjons.length; di++) for (const [a, b] of paires)
    taches.push({ id: taches.length, cle: `D|${st}|${a}|${b}|${di}`, strat: st, heros: [heros[a], heros[b]], donjon: donjons[di], n: N.donjons, a, b, di, si: STRATS.indexOf(st) });
  // Chaque type aléatoire possible du Boss, imposé à tour de rôle (l'autre type reste tiré au hasard).
  for (const st of STRATS) for (let di = 0; di < donjons.length; di++) {
    const d = D[donjons[di]], fixes = [d.type, ...d.minis];
    for (const t of types.filter(x => !fixes.includes(x))) for (const [a, b] of paires)
      taches.push({ id: taches.length, cle: `X|${st}|${a}|${b}|${di}|${t}`, strat: st, heros: [heros[a], heros[b]], donjon: donjons[di], n: N.extras, extra: t, a, b, di, si: STRATS.indexOf(st) });
  }
  const total = taches.reduce((a, t) => a + t.n, 0);
  debutPhase = Date.now(); partiesPhase = total;
  log(`Donjons : ${donjons.length} donjons × ${paires.length} paires × ${STRATS.length} stratégie(s) × ${N.donjons} parties, plus chaque type de Boss imposé (${N.extras} parties) = ${total} parties (graine ${GRAINE}, ${FILS} fils).`);
  const res = await executer(taches);
  verifierErreurs(res);

  const base = donjons.map(() => STRATS.map(() => ag())), baseTout = donjons.map(() => ag()), baseL = donjons.map(() => heros.map(() => ag()));
  const extras = donjons.map(() => ({}));
  taches.forEach(t => {
    const r = res[t.id];
    if (!t.extra) { add(base[t.di][t.si], r); add(baseTout[t.di], r); add(baseL[t.di][t.a], r); add(baseL[t.di][t.b], r); }
    else { const e = extras[t.di][t.extra] = extras[t.di][t.extra] || ag(); add(e, r); }
  });
  const global = ag(); baseTout.forEach(o => { global.n += o.n; global.v += o.v; });
  log(`\nVictoires globales : ${pct(taux(global))} sur ${global.n} parties de référence.`);

  const percentile = (hist, q) => { const ks = Object.keys(hist).map(Number).sort((a, b) => a - b), tot = ks.reduce((a, k) => a + hist[k], 0); let c = 0; for (const k of ks) { c += hist[k]; if (c >= q * tot) return k; } return 0; };
  log(`\n${pad('Donjon', 28)}${STRATS.map(s => padl(s.slice(0, 9), 10)).join('')}${padl('Moyenne', 9)}${padl('Écart', 8)}${padl('Salles', 8)}${padl('PV Boss', 9)}  Salle de défaite (25 % / médiane / 75 %)   Verdict`);
  const dj = donjons.map((id, di) => {
    const o = baseTout[di], autres = { n: global.n - o.n, v: global.v - o.v }, c = compare(o, autres);
    const verdict = Math.abs(c.z) >= 3 && Math.abs(c.delta) * 100 >= SEUIL * 2 ? (c.delta > 0 ? '▲ TROP FACILE' : '▼ TROP DUR') : Math.abs(c.z) >= 3 ? (c.delta > 0 ? '(plutôt facile)' : '(plutôt dur)') : 'ok';
    return { id, nom: D[id].name, taux: taux(o), delta: c.delta, z: c.z, parStrat: STRATS.map((s, si) => taux(base[di][si])), salles: o.s / o.n, pvBoss: D[id].boss.hp, q: [percentile(o.perdues, .25), percentile(o.perdues, .5), percentile(o.perdues, .75)], pertesTotales: o.d, verdict };
  });
  dj.forEach(l => log(`${pad(l.nom, 28)}${l.parStrat.map(x => padl(pct(x), 10)).join('')}${padl(pct(l.taux), 9)}${padl(pts(l.delta), 8)}${padl(l.salles.toFixed(1), 8)}${padl(l.pvBoss, 9)}  ${pad(l.q.join(' / '), 38)}${l.verdict}`));
  log(`\nÉcart = points de victoires de plus que dans les autres donjons. Les trois stratégies du bot ne gagnent pas aussi souvent : seuls les écarts entre donjons comptent. « Trop facile / dur » à partir de ${SEUIL * 2} points.`);

  // Affinités : un lieutenant dont le résultat dans un donjon s'écarte de ce qu'on attend de lui et du donjon.
  const lTot = heros.map((h, i) => { const o = ag(); donjons.forEach((d, di) => { o.n += baseL[di][i].n; o.v += baseL[di][i].v; }); return o; });
  const aff = [];
  heros.forEach((h, i) => donjons.forEach((d, di) => {
    const o = baseL[di][i], attendu = taux(lTot[i]) + taux(baseTout[di]) - taux(global), ecart = taux(o) - attendu, se = Math.sqrt(varTaux(o));
    aff.push({ lieutenant: nom(h), donjon: D[d].name, taux: taux(o), ecart, z: se ? ecart / se : 0 });
  }));
  aff.sort((a, b) => b.ecart - a.ecart);
  const lAff = l => l.forEach(x => log(`  ${pad(x.lieutenant, 24)}${pad(x.donjon, 28)}${padl(pct(x.taux), 8)}  ${padl(pts(x.ecart), 6)} pts (z ${x.z.toFixed(1)})`));
  log('\nLieutenants qui brillent dans un donjon (plus que ce que prédisent leur force et la dureté du donjon) :'); lAff(aff.slice(0, 6));
  log('Lieutenants qui y souffrent :'); lAff(aff.slice(-6).reverse());

  // Type aléatoire du Boss imposé.
  log('\nType aléatoire du Boss imposé (effet sur les victoires du joueur, contre les parties de référence du donjon) :');
  const extraLignes = [];
  donjons.forEach((id, di) => {
    const fixes = [D[id].type, ...D[id].minis];
    log(`  ${D[id].name} (types fixes : ${fixes.join(', ')})`);
    const l = Object.entries(extras[di]).map(([t, o]) => ({ donjon: D[id].name, type: t, taux: taux(o), ...compare(o, baseTout[di]), n: o.n })).sort((a, b) => a.delta - b.delta);
    l.forEach(x => { x.verdict = Math.abs(x.z) >= 3 && Math.abs(x.delta) * 100 >= SEUIL ? (x.delta < 0 ? '▼ Boss plus dur' : '▲ Boss plus facile') : ''; extraLignes.push(x); });
    log('    ' + l.map(x => `${x.type} ${pts(x.delta)}${x.verdict ? ' *' : ''}`).join(' · '));
  });
  log('  (* : écart d\'au moins ' + SEUIL + ' points et z ≥ 3.) Les comportements des plateaux du Boss sont tirés au hasard et ne peuvent pas être imposés.');
  const marq = extraLignes.filter(x => x.verdict).sort((a, b) => a.delta - b.delta);
  if (marq.length) { log('\nTypes de Boss qui changent vraiment la partie :'); marq.forEach(x => log(`  ${pad(x.donjon, 28)}${pad(x.type, 16)}${padl(pts(x.delta), 7)} pts (z ${x.z.toFixed(1)}) ${x.verdict}`)); }

  fs.writeFileSync(path.join(sortie, 'donjons.json'), JSON.stringify({ options: { echelle: ECHELLE, graine: GRAINE, strategies: STRATS, parties: N.donjons, extras: N.extras }, donjons: dj, affinites: aff, typesBoss: extraLignes }, null, 1));
  log(`\nDétails : ${relatif('donjons.json')}`);
  finPhase('donjons');
}

(async () => {
  const lancer = { lieutenants: phaseLieutenants, serviteurs: () => phaseCartes('servant'), equipements: () => phaseCartes('equip'), donjons: phaseDonjons };
  const liste = phase === 'tout' ? PHASES : [phase];
  TEST = historique.creerTest({ echelle: ECHELLE, facteur: FACTEUR, graine: GRAINE, parties: N, strategies: STRATS, strategiesCartes: STRATS_CARTES, seuil: SEUIL, note: NOTE, demande: liste },
    SANS_HISTORIQUE ? { dossier: path.join(historique.racine, 'temp', 'equilibrage', 'essai') } : {});
  sortie = TEST.dossier;
  console.log(`Test ${TEST.id} (${SANS_HISTORIQUE ? 'non versionné : ' : ''}${path.relative(historique.racine, sortie)})`);
  const debut = Date.now();
  for (const p of liste) { if (liste.length > 1) console.log(`\n████ Phase : ${p} ████\n`); await lancer[p](); }
  TEST.meta.secondes = Math.round((Date.now() - debut) / 1000); TEST.sauver();
  if (!SANS_HISTORIQUE) historique.reindexer();
})().catch(e => { console.error(e); process.exit(1); });
