// Joueur automatique pour les tests d'équilibrage : il joue une partie complète avec les vraies actions du jeu (ACT).
// Même stratégie pour tout le monde, pour que les écarts mesurés viennent des cartes et non du joueur.
//
// Stratégies de niveau de renfort (paramètre `strategie`) :
//   'niveau' : monte vite le niveau de renfort (cible = 1 + salle/2), c'est celle qui gagne le plus (voir REPRISE.md) ;
//   'equilibre' : cible = 1 + salle/3 ; 'tempo' : cible = 1 + salle/5 (privilégie les serviteurs).
'use strict';

const CIBLE_NIVEAU = {
  niveau: room => 1 + Math.floor(room / 2),
  equilibre: room => 1 + Math.floor(room / 3),
  tempo: room => 1 + Math.floor(room / 5)
};

// Joue une partie jusqu'à son terme. Retourne { win, salles, pvLieutenants }.
// jeu = résultat de charger() ; options : { strategie, sallesMax, forcer }.
// forcer = { kind: 'servant' | 'equip', id } : cette carte est ajoutée à la main dès que le niveau de renfort atteint son rang
// (ou à partir de la salle 3 × rang si le bot ne monte pas assez vite), pour mesurer ce qu'elle apporte.
function jouerPartie(jeu, heros, donjon, { strategie = 'niveau', sallesMax = 80, forcer = null } = {}) {
  const { SERVANTS, EQUIPS, mkServant, grantPr, UI, ACT, ACTIVES, MAX_BOARD, MAX_LEVEL, HAND_MAX, copiesOf, powerOf, cardScore, offerKind, battlecriesOf, isPr } = jeu.X;
  const cible = CIBLE_NIVEAU[strategie] || CIBLE_NIVEAU.niveau;
  const rnd = n => Math.floor(jeu.ctx.Math.random() * n);   // le Math du jeu (et non celui de Node) : déterministe si la graine est fixée
  jeu.reinitStockage(); jeu.timers.length = 0;
  UI.save = null; UI.sel.heroes = heros.slice(); UI.sel.dungeon = donjon;
  ACT.start();

  const g = () => UI.g;
  const serviteursMain = () => g().hand.filter(h => h.kind === 'servant').map(h => h.s);
  const meilleur = (liste, score) => liste.reduce((b, x, i) => (b < 0 || score(x) > score(liste[b]) ? i : b), -1);

  // Valeur d'une carte proposée au renfort.
  function valeurOffre(i) {
    const rf = UI.rf, c = rf.offer.cards[i], gg = g();
    if (offerKind(rf.offer, i) === 'servant') {
      let v = cardScore(c);
      const copies = copiesOf(gg, c.name).length;
      if (copies >= 1) v += 12 * copies;   // vise la fusion en doré
      return v;
    }
    // Équipement : +r/+r ; inutile tant que le plateau est maigre.
    return gg.board.length < 4 ? -100 : c.rank * 9 + (c.atk + c.hp);
  }

  // Pose les cartes de la main : serviteurs sur le plateau (ou à la place du plus faible), équipements sur le serviteur le plus fort.
  function organiser() {
    const gg = g();
    for (let tour = 0; tour < 30; tour++) {
      let agi = false;
      const iS = gg.hand.findIndex(h => h.kind === 'servant');
      if (iS >= 0) {
        const s = gg.hand[iS].s;
        if (gg.board.length < MAX_BOARD) { jeu.X.placeServant(gg, iS, null, () => {}); agi = true; }
        else {
          const libres = gg.board.map((x, j) => j).filter(j => !gg.board[j].fixed);
          const faible = libres.reduce((w, j) => (w < 0 || powerOf(gg.board[j]) < powerOf(gg.board[w]) ? j : w), -1);
          // Remplace seulement si le gain est net (le remplacé perd ses équipements).
          if (faible >= 0 && powerOf(s) > powerOf(gg.board[faible]) + 4 + gg.board[faible].equips.length * 3) { jeu.X.placeServant(gg, iS, faible, () => {}); agi = true; }
          else if (gg.hand.length >= HAND_MAX) { gg.hand.splice(iS, 1); gg.stats.discarded++; agi = true; }
          else break;
        }
      } else {
        const iE = gg.hand.findIndex(h => h.kind === 'equip');
        if (iE < 0 || !gg.board.length) break;
        const cibles = gg.board.filter(x => !x.fixed);
        // Répartit les équipements (mesuré : mieux que tout empiler sur le plus fort) : le moins équipé, puis le plus fort.
        const pool = cibles.length ? cibles : gg.board;
        const cible = pool.reduce((b, x) => (x.equips.length < b.equips.length || (x.equips.length === b.equips.length && powerOf(x) > powerOf(b)) ? x : b));
        jeu.X.applyEquip(cible, gg.hand[iE].def); gg.hand.splice(iE, 1); agi = true;
      }
      if (!agi) break;
    }
  }

  // Ordre du plateau : l'indice 0 est en première ligne ; Provocation puis plus gros PV devant (effet faible mesuré, mais jamais négatif).
  function ordonner() {
    const b = g().board;
    if (b.length < 2) return;
    const cle = s => (s.kw.includes('prov') ? 1e6 : 0) + (s.hp + s.atk * 0.01);
    const tri = b.map((s, i) => ({ s, i })).sort((x, y) => cle(y.s) - cle(x.s) || x.i - y.i);
    b.splice(0, b.length, ...tri.map(x => x.s));
  }

  // Pouvoirs actifs des lieutenants (une utilisation par renfort, sauf ceux qui se répètent).
  function pouvoirs() {
    const gg = g(), rf = UI.rf;
    gg.heroes.forEach((h, i) => {
      if (!h.def.power || h.def.power.t !== 'active' || h.hp <= 0) return;
      const A = ACTIVES[h.def.power.fx];
      for (let n = 0; n < 4; n++) {
        if (h.used && !A.repeat) return;
        const prix = A.cost ? A.cost(h) : 0;
        if (gg.datacrons < prix || rf.offer || rf.reward || rf.prophecy) return;
        const cands = [...gg.board, ...serviteursMain()].filter(s => !isPr(s) && A.ok(gg, s) && (h.def.power.fx !== 'triggerBattlecry' || (gg.board.includes(s) && battlecriesOf(s).length)));
        if (!cands.length) return;
        // Renaissance sur le plus fort ; cri de guerre / fusion sur le rang le plus haut.
        const cible = cands.reduce((b, s) => ((h.def.power.fx === 'grantRebirth' ? powerOf(s) > powerOf(b) : s.rank > b.rank) ? s : b));
        if (h.def.power.fx === 'grantRebirth' && !gg.board.includes(cible)) return;
        const avant = gg.datacrons;
        ACT.useActive({ i }); ACT.pickActiveTarget({ uid: cible.uid });
        if (gg.datacrons === avant && !h.used) return;   // l'action n'a pas abouti
        if (!A.repeat) return;
      }
    });
  }

  let injecteSalle = 0;
  const carteForcee = forcer && (forcer.kind === 'servant' ? SERVANTS : EQUIPS).find(c => c.id === forcer.id);
  if (forcer && !carteForcee) throw new Error(`carte à forcer introuvable : ${forcer.kind} ${forcer.id}`);
  function injecter() {
    const gg = g(), c = carteForcee;
    if (injecteSalle || jeu.X.handFull(gg) || (gg.level < Math.min(c.rank, MAX_LEVEL) && gg.room < 3 * c.rank)) return;
    if (forcer.kind === 'servant') { gg.hand.push({ kind: 'servant', s: mkServant(c) }); grantPr(gg, c.types, () => {}); }
    else gg.hand.push({ kind: 'equip', def: c });
    injecteSalle = gg.room;
  }

  function renfort() {
    for (let garde = 0; garde < 120; garde++) {
      const gg = g(), rf = UI.rf;
      if (rf.prophecy) { ACT.pickProphecy({ i: meilleur(rf.prophecy.cards, cardScore) }); continue; }
      if (rf.reward) { ACT.pickReward({ i: meilleur(rf.reward.cards, cardScore) }); continue; }
      if (rf.offer) { const v = rf.offer.cards.map((c, i) => valeurOffre(i)); ACT.pickOffer({ i: v.indexOf(Math.max(...v)) }); continue; }
      if (carteForcee && !rf.offer && !rf.reward && !rf.prophecy) injecter();
      organiser(); ordonner(); pouvoirs();
      if (rf.offer || rf.reward || rf.prophecy) continue;
      if (gg.datacrons < 1) break;
      const niveauVoulu = gg.level < MAX_LEVEL && gg.level < cible(gg.room);
      const avant = gg.datacrons;
      if (niveauVoulu || jeu.X.handFull(gg)) ACT.buyLevel(); else ACT.buyRenfort();
      if (gg.datacrons === avant) { ACT.buyLevel(); if (gg.datacrons === avant) break; }   // main pleine et niveau max : on s'arrête
    }
  }

  let salles = 0;
  while (UI.screen !== 'end' && salles < sallesMax) {
    renfort();
    ACT.finishRenfort();
    for (let c = 0; !UI.pb.done && c < 5000; c++) { const f = jeu.timers.shift(); if (!f) break; f(); }   // combat non rapide : on déroule les temporisations
    if (!UI.pb.done) throw new Error('combat qui ne se termine pas');
    for (let a = 0; UI.adapt.length && a < 50; a++) ACT.pickAdapt({ i: rnd(UI.adapt[0].options.length) });
    jeu.timers.length = 0;
    salles++;
    ACT.next();
  }
  const gg = g();
  return { win: gg.over === 'win', salles: gg.room - 1, injecteSalle, pvBoss: gg.boss.hp, pvLieutenants: gg.heroes.map(h => h.hp) };
}

module.exports = { jouerPartie, strategies: Object.keys(CIBLE_NIVEAU) };
