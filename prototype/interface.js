// Atlas Wanderer — interface : écrans, rendu, déroulement.
'use strict';
// ==== UI ====
const app = document.getElementById('app');
const UI = { screen: 'menu', sel: { heroes: [], dungeon: null }, g: null, rf: null, pb: null, timer: null, timer2: null, adapt: [], notice: '', showLog: false, errors: [] };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Pastilles de type : espèce = fond teinté, archétype = contour. Icônes et couleurs viennent de svg.js.
const typeBadges = ts => ts.map(t => {
  const c = AWGfx.typeColor(t), sp = AWGfx.isSpecies(t);
  return `<span class="badge badge-sm gap-1 ${sp ? '' : 'badge-outline'}" style="color:${c};border-color:${c};${sp ? `background:${c}33;` : ''}">${AWGfx.icon(t, { size: 12, color: c, bg: '#1d232a' })}<span class="text-base-content">${t}</span></span>`;
}).join(' ');
const kwBadges = (kw, s) => kw
  .filter(k => !(s && 'shield' in s) || (k === 'shield' ? s.shield : k === 'rebirth' ? s.reb : true))
  .map(k => `<span class="badge badge-xs badge-outline">${KW[k]}</span>`).join(' ');
const skLine = k => `<span class="${TRIG_KIND[k.t] === 'combat' ? 'text-error' : 'text-info'}">${esc(skDesc(k))}</span>`;

// Cartes : le dessin vient de svg.js, l'enveloppe HTML porte les clics et les surbrillances.
const CARD_W = 'w-[var(--card-w)]';   // largeur calculée selon l'écran (voir --card-w dans prototype.html)
const CARD_H = 'min-h-[calc(var(--card-w)*1.65)]';
const PEEK = 'main-carte relative overflow-hidden h-[calc(var(--card-w)*var(--peek,1.1))]';
const extraOf = o => o.extra ? `<div class="${o.peek ? 'absolute bottom-1 right-1 z-10' : 'mt-1'} flex justify-center gap-1">${o.extra}</div>` : '';
function servantCard(s, o = {}) {
  const ring = o.att ? 'ring-4 ring-warning' : o.tgt ? 'ring-4 ring-error' : '';
  // En combat, un Bouclier divin perdu ou une Renaissance déjà jouée restent affichés, marqués « utilisé ».
  const kwSpent = ('shield' in s) ? s.kw.filter(k => (k === 'shield' && !s.shield) || (k === 'rebirth' && !s.reb)) : [];
  const powers = powersOf(s.kw, skillsOf(s), s.droneA || s.droneH ? { a: s.droneA, h: s.droneH } : null, kwSpent);
  const sh = powers.find(p => p.key === 'shield');
  if (sh && s.shield > 1) sh.count = s.shield;   // un Bouclier à plusieurs coups affiche les coups restants
  const art = AWGfx.servantCard({ ...s, kwSpent, powers }, { width: '100%' });
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${ring} ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${art}${extraOf(o)}</div>`;
}
function equipCard(e, o = {}) {
  const powers = powersOf(e.kw ? [e.kw] : [], e.skill ? [{ ...e.skill }] : [], e.mod ? { a: e.mod.droneA, h: e.mod.droneH } : null);
  // Sur un équipement, « à lui-même » devient « au porteur ».
  powers.forEach(p => { if (!p.fixed) p.text = p.text.replace('à lui-même', 'au porteur'); });
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${AWGfx.equipCard({ ...e, powers }, { width: '100%' })}${extraOf(o)}</div>`;
}
// Lieutenants : cartes portrait, identiques au choix de départ, avec leurs PV actuels.
const heroProps = (def, hp, maxhp) => ({ name: def.name, types: def.types, hp, maxhp, kw: def.kw, powerText: skDesc(def.power), powerKind: TRIG_KIND[def.power.t] });
const heroesPanel = g => `<div class="flex flex-wrap justify-center gap-3">${g.heroes.map(h => `<div class="w-[calc(var(--card-w)*2)] min-w-[17rem] shrink-0 rounded-2xl">${AWGfx.heroCard(heroProps(h.def, h.hp, h.maxhp), { width: '100%' })}</div>`).join('')}</div>`;
// Bandeau fin du donjon en cours : décor et nom à gauche, Boss, PV, type et pouvoir à droite.
const bossPanel = (g, showBoard) => { const d = g.dungeon; return `<div class="flex rounded-2xl overflow-hidden border-2" style="border-color:${AWGfx.typeColor(d.type)}88;background:#151a26">
  <div class="relative w-[28%] shrink-0 min-h-[5.5rem]">
    <div class="absolute inset-0 [&>svg]:w-full [&>svg]:h-full">${AWGfx.dungeonScene(d, { width: '100%' })}</div>
    <div class="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent"><div class="text-sm sm:text-base font-extrabold text-white leading-tight">${esc(d.name)}</div></div>
  </div>
  <div class="flex-1 min-w-0 px-3 py-2 grid gap-1 content-center">
    <div class="flex flex-wrap items-center gap-2"><b class="text-error text-lg leading-none">${esc(g.boss.name)}</b>${showBoard ? `<span class="badge badge-outline">Plateau ${g.bossCur + 1}/3</span>` : ''}
      <span class="badge badge-error text-black font-black gap-1">${AWGfx.icon('heart', { size: 14, color: '#000' })}${g.boss.hp}/${g.boss.maxhp}</span></div>
    <progress class="progress progress-error w-full h-1.5" value="${g.boss.hp}" max="${g.boss.maxhp}"></progress>
    <div class="flex flex-wrap items-center gap-2"><span class="shrink-0">${AWGfx.typeChipSvg(d.type)}</span><span class="text-xs opacity-80">${esc(d.boss.desc)}</span></div>
  </div></div>`; };
const header = g => `<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
  <h1 class="text-xl font-bold">Atlas Wanderer <span class="badge badge-ghost">prototype</span></h1>
  <div class="flex gap-2 text-sm"><span class="badge badge-lg">Salle ${g.room}</span><span class="badge badge-lg badge-secondary">Renfort niv. ${g.level}</span><span class="badge badge-lg badge-warning">◈ ${g.datacrons} Datacron${g.datacrons > 1 ? 's' : ''}</span>
  <span class="badge badge-lg badge-outline">Types : ${g.types.join(', ')}</span></div></div>`;

// ---------- Écrans ----------
function renderMenu() {
  const sel = UI.sel;
  const heroes = Object.values(HEROES).map(h => `
    <button data-act="selHero" data-id="${h.id}" class="w-[26rem] max-w-full shrink-0 rounded-2xl text-left transition hover:-translate-y-0.5 ${sel.heroes.includes(h.id) ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.heroCard(heroProps(h, h.hp), { width: '100%', selected: sel.heroes.includes(h.id) })}</button>`).join('');
  // Carte cliquable ; une fois choisie, le bouton « Sélectionner » apparaît dans la carte et mène aux héros.
  const dungeons = Object.values(DUNGEONS).map(d => { const on = sel.dungeon === d.id; return `
    <div data-act="selDungeon" data-id="${d.id}" class="relative rounded-2xl cursor-pointer transition hover:-translate-y-0.5 ${on ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.dungeonCard(d, { width: '100%', selected: on })}
      ${on ? `<div class="absolute inset-x-0 top-0 h-[58%] flex items-center justify-center pointer-events-none"><button class="btn-achat btn-or px-10 text-xl shadow-lg pointer-events-auto flex items-center gap-2 font-bold" data-act="toHeroes">${AWGfx.icon('btnDoor', { size: 28, color: '#1a1304' })}Explorer</button></div>` : ''}</div>`; }).join('');
  const types = sel.dungeon ? [...new Set([DUNGEONS[sel.dungeon].type, ...sel.heroes.flatMap(i => HEROES[i].types)])] : [];   // types de la partie, mis à jour à chaque choix
  if (UI.screen === 'heroes') { const d = DUNGEONS[sel.dungeon]; return `
  <div class="flex flex-col sm:flex-row rounded-2xl overflow-hidden border-2 mb-5" style="border-color:${AWGfx.typeColor(d.type)}88;background:#151a26">
    <div class="relative sm:w-[42%] shrink-0 min-h-[10rem]">
      <div class="absolute inset-0 [&>svg]:w-full [&>svg]:h-full">${AWGfx.dungeonScene(d, { width: '100%' })}</div>
      <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent"><div class="text-2xl font-extrabold text-white">${esc(d.name)}</div></div>
    </div>
    <div class="flex-1 p-4 grid gap-3 content-center">
      <div class="flex flex-wrap items-center gap-3"><div class="text-2xl font-bold text-error">${esc(d.boss.name)}</div><span class="badge badge-lg badge-error text-black font-black text-base gap-1">${AWGfx.icon('heart', { size: 16, color: '#000' })}${d.boss.hp}</span></div>
      <div>${AWGfx.typeChipSvg(d.type)}</div>
      <div class="text-sm">${esc(d.boss.desc)}</div>
    </div>
  </div>
  <h2 class="text-xl font-bold text-center mb-3">Sélection des lieutenants</h2><div class="flex flex-wrap justify-center gap-4 mb-6">${heroes}</div>
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3">
    <button class="btn-achat px-6 flex items-center gap-2 font-bold" data-act="backToDungeon"><span aria-hidden="true">‹</span>Retour</button>
    <div class="flex flex-wrap justify-center gap-1.5">${types.map(AWGfx.typeChipSvg).join('')}</div>
    <button class="btn-achat btn-suite px-8 flex items-center gap-2 font-bold" data-act="start" ${sel.heroes.length === 2 ? '' : 'disabled'}>${AWGfx.icon('btnDoor', { size: 26, color: '#fdba74' })}Débuter l'exploration</button>
  </div>`; }
  return `<div class="grid gap-3 sm:grid-cols-2 mb-6">${dungeons}</div>`;
}

// Main : en renfort les cartes ont leurs boutons, en combat elle est affichée seule.
function handHtml(g, rf, full) {
  const busy = rf && (rf.offer || rf.reward);
  const discard = i => `<button class="btn-achat btn-petit btn-danger btn-jeter" data-act="discard" data-i="${i}" ${busy ? 'disabled' : ''} title="Jeter cette carte">${AWGfx.icon('trash', { size: 18, color: '#fecaca' })}</button>`;
  const drag = i => rf && !busy ? { peek: !full, cls: 'cursor-grab select-none', attrs: `draggable="true" data-drag="hand" data-i="${i}"`, extra: discard(i) } : { peek: !full, extra: '' };
  return g.hand.map((h, i) => h.kind === 'servant' ? servantCard(h.s, drag(i)) : equipCard(h.def, drag(i))).join('');
}
const handSection = (g, rf, full) => `<div class="flex flex-wrap justify-center gap-2 mt-3 ${full ? CARD_H : 'min-h-[calc(var(--card-w)*var(--peek,1.1))]'}">${handHtml(g, rf, full)}</div>`;
// Ligne du haut du bloc de renfort : niveau, progression, main pleine, Datacrons (même affichage au combat).
const renfortHead = g => {
  const cost = levelCost(g.level), maxed = g.level >= MAX_LEVEL, full = g.hand.length >= HAND_MAX;
  return `<div class="flex items-center justify-between gap-3">
        <div class="flex flex-1 items-center gap-2" title="${maxed ? 'Niveau maximum' : `Encore ${cost - g.counter} ◈ avant le niveau ${g.level + 1}`}">
          <span class="text-xs uppercase tracking-[.2em] text-violet-300/80">Niv. <span class="font-black text-violet-100 text-lg tracking-normal">${g.level}</span></span>
          <div class="barre-crantee !pl-0">${Array.from({ length: maxed ? levelCost(MAX_LEVEL - 1) : cost }, (_, i) => `<i class="${maxed || i < g.counter ? 'on' : ''}"></i>`).join('')}</div></div>
        ${full ? '<span class="badge badge-warning badge-sm">Main pleine</span>' : ''}
        <span class="text-3xl font-black leading-none text-warning" style="text-shadow:0 0 14px rgba(245,197,66,.6)" title="Datacrons">${g.datacrons} ◈</span></div>`;
};
function renderRenfort() {
  const g = UI.g, rf = UI.rf, cost = levelCost(g.level), maxed = g.level >= MAX_LEVEL;
  const busy = !!(rf.offer || rf.reward), full = g.hand.length >= HAND_MAX, can = g.datacrons >= 1 && !busy;
  // Le lancement n'apparaît qu'une fois les Datacrons dépensés (ou s'il n'y a plus rien à acheter).
  const launch = !busy && (g.datacrons < 1 || (maxed && full));
  const board = g.board.map((sv, i) => servantCard(sv, {
    cls: 'select-none cursor-grab', attrs: `draggable="true" data-drag="board" data-drop="card" data-uid="${sv.uid}" data-idx="${i}"`
  })).join('');
  const offerCards = rf.offer ? rf.offer.cards.map((d, i) => rf.offer.kind === 'servant'
    ? servantCard({ ...d, maxhp: d.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"` })
    : equipCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"` })).join('') : '';
  const reward = rf.reward ? `<dialog class="modal modal-open"><div class="modal-box max-w-4xl">
    <h3 class="font-bold text-lg mb-1">Fusion ! Choisis un serviteur de rang ${rf.reward.rank}</h3>
    <p class="text-sm opacity-70 mb-3">Il rejoint ta main.</p>
    <div class="flex flex-wrap gap-2 justify-center">${rf.reward.cards.map((d, i) => servantCard({ ...d, maxhp: d.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` })).join('')}</div>
    </div></dialog>` : '';
  return `<div class="combat flex flex-col min-h-[calc(100dvh-2.5rem)] [--peek:.62]">
  ${bossPanel(g)}
  <div class="plateau-donjon rounded-box p-3 mt-3 mb-3 flex-1 flex items-center justify-center">
    <div class="decor">${AWGfx.dungeonScene(g.dungeon, { width: '100%' })}</div>
    <div class="relative flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${offerCards}</div>
  </div>
    <div class="plateau rounded-box p-3 mb-3 flex-1 flex items-center justify-center">
    <div class="flex flex-wrap justify-center gap-2 ${CARD_H} w-full" data-drop="board">${board}</div>
  </div>
  <div class="mt-auto">
  ${handSection(g, rf)}
  <div class="relative flex flex-wrap justify-center gap-3 rounded-box border border-base-content/15 bg-black/25 p-2">
    ${heroesPanel(g)}
    <div class="console-renfort flex-1 min-w-[16rem] flex flex-col justify-between gap-2 p-3 rounded-box">
      ${renfortHead(g)}
      <div class="flex gap-2">
        ${launch ? `<button class="btn-achat btn-suite btn-compact w-full px-3 flex items-center justify-center gap-2 font-bold" data-act="finishRenfort">${AWGfx.icon('btnDoor', { size: 22, color: '#fdba74' })}Explorer la prochaine salle</button>` : `${[['buyServant', 'btnServant', 'Serviteur', can && !full], ['buyEquip', 'btnEquip', 'Équipement', can && !full], ['buyLevel', 'btnLevel', maxed ? 'Niveau max' : 'Niveau', can && !maxed]].map(([act, ic, label, ok]) =>
        `<button class="btn-achat btn-compact flex-1 px-3 flex items-center justify-center gap-2 font-bold whitespace-nowrap" data-act="${act}" ${ok ? '' : 'disabled'}>${AWGfx.icon(ic, { size: 24, color: ok ? '#7dd3fc' : '#94a3b8' })}${label}${act === 'buyLevel' && maxed ? '' : ' <span class="font-black text-warning whitespace-nowrap">1 ◈</span>'}</button>`).join('')}`}
      </div>
    </div>
  </div>
  </div>
  </div>
  ${reward}`;
}

function renderCombat() {
  const g = UI.g, pb = UI.pb, cur = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  // Avant l'impact d'une attaque, on montre encore l'état précédent (la charge se joue sur ces cartes).
  const f = pb.phase === 'pre' && prev ? { p: prev.p, e: prev.e, hl: cur.hl } : cur;
  const row = list => list.length ? list.map(s => servantCard(s, { att: f.hl.att === s.uid, tgt: f.hl.tgt === s.uid, attrs: `data-uid="${s.uid}"` })).join('') : '<div class="opacity-50 text-sm p-6">— vide —</div>';
  // Aucune commande pendant l'animation : seul le bouton de fin apparaît, une fois le combat terminé, à la place des achats.
  const next = pb.done ? `<button class="btn-achat btn-suite btn-compact w-full px-3 flex items-center justify-center gap-2 font-bold" data-act="next" ${UI.adapt.length ? 'disabled' : ''}>${g.over ? 'Voir le résultat' : `${AWGfx.icon('btnReinforce', { size: 22, color: '#fdba74' })}Vers le renfort`}</button>` : '';
  // Adaptation : un Elk survivant choisit une capacité parmi celles des autres survivants (ou n'apprend rien).
  const ad = UI.adapt[0], elk = ad && g.board.find(x => x.uid === ad.uid);
  const adapt = ad && elk ? `<dialog class="modal modal-open"><div class="modal-box max-w-3xl">
    <h3 class="font-bold text-lg mb-1">Adaptation : ${esc(ad.name)}</h3>
    <p class="text-sm opacity-70 mb-3">Choisis un bonus ou le pouvoir d'un autre survivant. Le choix est conservé jusqu'à la fin de la mission.</p>
    <div class="flex gap-4 items-start flex-wrap justify-center">
      <div class="w-40 shrink-0">${servantCard(elk, {})}</div>
      <div class="flex-1 min-w-[14rem] grid gap-2">${ad.options.map((c, i) => `<button class="btn-achat text-left px-3 py-2 flex flex-col items-start" data-act="pickAdapt" data-i="${i}"><span class="font-bold ${c.stat ? 'text-success' : c.kw ? 'text-info' : 'text-warning'}">${esc(capLabel(c))}</span><span class="text-xs opacity-70">${c.stat ? 'Bonus permanent' : `de ${esc(c.from)}`}</span></button>`).join('')}
        <button class="btn-achat btn-petit mt-1" data-act="skipAdapt">Ne rien apprendre</button></div>
    </div></div></dialog>` : '';
  // Même mise en page que le renfort : plateau du donjon (décor du thème) puis plateau du joueur, dans le même cadre, puis la main en aperçu.
  return `<div class="combat flex flex-col min-h-[calc(100dvh-2.5rem)] [--peek:.62]">
  ${bossPanel(g, true)}
  <div class="plateau-donjon rounded-box p-3 mt-3 mb-3 flex-1 flex items-center justify-center">
    <div class="decor">${AWGfx.dungeonScene(g.dungeon, { width: '100%' })}</div>
    <div class="relative flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${row(f.e)}</div>
  </div>
  <div class="plateau rounded-box p-3 mb-3 flex-1 flex items-center justify-center">
    <div class="flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${row(f.p)}</div>
  </div>
  <div class="mt-auto">
  ${handSection(g, null)}
  <div class="flex flex-wrap justify-center gap-3 rounded-box border border-base-content/15 bg-black/25 p-2">
    ${heroesPanel(g)}
    <div class="console-renfort flex-1 min-w-[16rem] flex flex-col justify-between gap-2 p-3 rounded-box">
      ${renfortHead(g)}
      <div class="flex gap-2 min-h-[2.5rem]">${next}</div>
    </div>
  </div>
  </div>
  </div>
  ${adapt}`;
}

function renderEnd() {
  const g = UI.g, win = g.over === 'win';
  return `<div class="hero py-10"><div class="hero-content text-center"><div class="max-w-md">
    <h1 class="text-4xl font-bold ${win ? 'text-success' : 'text-error'}">${win ? 'Victoire !' : 'Défaite'}</h1>
    <p class="py-4">${win ? `${esc(g.boss.name)} est vaincu` : 'Vos deux héros sont à terre'} après ${g.room - 1} salle${g.room - 1 > 1 ? 's' : ''}.</p>
    <div class="stats stats-vertical sm:stats-horizontal shadow mb-4">
      <div class="stat"><div class="stat-title">Salles</div><div class="stat-value">${g.room - 1}</div></div>
      <div class="stat"><div class="stat-title">Niveau de renfort</div><div class="stat-value">${g.level}</div></div>
      <div class="stat"><div class="stat-title">PV du Boss</div><div class="stat-value">${g.boss.hp}</div></div></div>
    <div class="text-sm opacity-80 mb-4">Datacrons gagnés : ${g.stats.earned} · restants : ${g.datacrons} · serviteurs : ${g.stats.servants} · équipements : ${g.stats.equips} · contributions au niveau : ${g.stats.contrib} · fusions : ${g.stats.fusions} · cartes jetées : ${g.stats.discarded}</div>
    <div><button class="btn-achat btn-or px-8 font-bold" data-act="restart">Nouvelle partie</button></div></div></div></div>`;
}


// ---------- Mode débogage ----------
// Icône fixe en bas à gauche ; le panneau flotte au-dessus du jeu, hors de la mise en page.
const dbg = document.createElement('div');
document.body.appendChild(dbg);
// Rapport de débogage : état de la partie et erreurs, copiable d'un clic pour le coller dans la conversation.
function debugReport() {
  const g = UI.g, rf = UI.rf, sv = s => `${s.name}${s.gold ? ' (doré)' : ''} ${s.atk}/${s.hp}`;
  return JSON.stringify({
    ecran: UI.screen, erreurs: UI.errors,
    partie: g && { salle: g.room, niveau: g.level, compteur: g.counter, datacrons: g.datacrons, donjon: g.dungeon.name, heros: g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`),
      plateau: g.board.map(sv), main: g.hand.map(h => h.kind === 'servant' ? sv(h.s) : h.def.name), boss: `${g.boss.hp}/${g.boss.maxhp}`, plateauBoss: g.bossCur + 1, typesBoss: g.bossTypes,
      plateauxBoss: g.bossTeams.map((t, i) => ({ joue: i === g.bossCur, niveau: t.level, datacrons: t.datacrons, serviteurs: t.board.map(s => `${sv(s)} R${s.rank}${s.equips.length ? ` +${s.equips.length} équip.` : ''}`) })) },
    renfort: rf && { offre: rf.offer && rf.offer.cards.map(c => c.name), recompense: rf.reward && rf.reward.cards.map(c => c.name), journal: rf.log.slice(-15) },
    combat: UI.pb && { image: UI.pb.i, total: UI.pb.res.frames.length, fini: UI.pb.done, resultat: UI.pb.res.winner, journalBoss: g && g.bossLog.slice(-20) },
    navigateur: navigator.userAgent
  }, null, 1);
}
const noteError = msg => { UI.errors.push(`${new Date().toLocaleTimeString()} ${msg}`); UI.showLog = true; try { renderDebug(); } catch (e) { /* le panneau lui-même est en cause */ } };
window.addEventListener('error', e => noteError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
window.addEventListener('unhandledrejection', e => noteError(`Promesse rejetée : ${e.reason}`));

function renderDebug() {
  const g = UI.g, rows = [];
  if (g) {
    rows.push(`Salle ${g.room} · renfort niv. ${g.level} (${g.counter}/${levelCost(g.level)}) · ${g.datacrons} Datacron(s)`);
    rows.push(`Plateau ${g.board.length}/${MAX_BOARD} · main ${g.hand.length}/${HAND_MAX} · types : ${g.types.join(', ')}`);
    rows.push(`Boss ${g.boss.hp}/${g.boss.maxhp} · ${g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`).join(' · ')}`);
  }
  if (g) {
    rows.push(`Boss — types cachés : ${g.bossTypes.join(', ')}`);
    g.bossTeams.forEach((t, i) => rows.push(`  Plateau ${i + 1}${i === g.bossCur ? ' (joué)' : ''} : niv. ${t.level}, ${t.board.length} serviteur(s), malus ${t.malus} — ${t.board.map(s => `${s.name} ${s.atk}/${s.hp}`).join(', ') || 'vide'}`));
  }
  if (UI.errors.length) rows.unshift(...UI.errors.map(e => `⚠ ${e}`), '');
  if (UI.notice) rows.push(`Fin de renfort : ${UI.notice}`);
  if (UI.screen === 'renfort' && UI.rf) rows.push('', ...UI.rf.log.slice(-30), '', ...g.bossLog.slice(-40));
  if (UI.screen === 'combat' && UI.pb) {
    const pb = UI.pb;
    rows.push(`Image ${pb.i + 1}/${pb.res.frames.length}`);
    if (pb.done) rows.push(pb.res.winner === 'p' ? 'Combat gagné' : pb.res.winner === 'e' ? 'Combat perdu' : 'Égalité', ...pb.lines);
    rows.push('', ...pb.res.frames.slice(0, pb.i + 1).map(x => x.msg).slice(-60));
  }
  dbg.innerHTML = `${UI.showLog ? `<div id="log" class="fixed left-3 bottom-16 z-50 w-[22rem] max-w-[90vw] max-h-[55vh] overflow-y-auto rounded-box bg-black/85 border border-base-content/20 p-3 text-xs font-mono space-y-0.5 pointer-events-auto"><button class="btn btn-xs btn-warning mb-1" data-act="copyReport">Copier le rapport</button><br>${rows.map(r => r ? esc(r) : '<br>').join('<br>')}</div>` : ''}
    <button data-act="toggleLog" class="fixed left-3 bottom-3 z-50 btn btn-circle btn-sm ${UI.errors.length ? 'btn-error' : UI.showLog ? 'btn-warning' : 'btn-ghost bg-black/50'}" title="Mode débogage">${AWGfx.icon('bug', { size: 18, color: UI.showLog ? '#000' : '#cbd5e1' })}</button>`;
  const l = document.getElementById('log'); if (l) l.scrollTop = l.scrollHeight;
}

function render() {
  const y = window.scrollY;
  app.innerHTML = { menu: renderMenu, heroes: renderMenu, renfort: renderRenfort, combat: renderCombat, end: renderEnd }[UI.screen]();
  renderDebug();
  window.scrollTo(0, y);
}

// ---------- Déroulement ----------
function startCombatUI() {
  const res = runCombat(UI.g.board, UI.g.bossTeams[UI.g.bossCur].board, UI.g);
  UI.pb = { res, i: 0, speed: 1300, done: false, lines: null, phase: 'hit', lunge: null };
  UI.screen = 'combat'; showFrame();
}
// Une image du combat. Une attaque se joue en deux temps : la carte charge (état précédent affiché),
// puis l'impact (nouvel état affiché, tremblement, chiffres flottants). Les autres images n'ont qu'un temps.
function showFrame() {
  clearTimeout(UI.timer); clearTimeout(UI.timer2);
  const pb = UI.pb, f = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  const attack = !!prev && f.hl.att != null;
  if (attack) {
    pb.phase = 'pre'; render(); playLunge(f);
    UI.timer2 = setTimeout(() => { pb.phase = 'hit'; render(); playImpact(prev, f); }, pb.speed * 0.4);
  } else {
    pb.phase = 'hit'; render(); if (prev) playImpact(prev, f);
  }
  UI.timer = setTimeout(nextFrame, attack ? pb.speed : pb.speed * 0.6);
}
function nextFrame() {
  const pb = UI.pb;
  if (pb.i < pb.res.frames.length - 1) pb.i++;
  if (pb.i >= pb.res.frames.length - 1) finishPb(); else showFrame();
}
function finishPb() {
  const pb = UI.pb; clearTimeout(UI.timer); clearTimeout(UI.timer2);
  pb.i = pb.res.frames.length - 1; pb.phase = 'hit';
  pb.lines = settleCombat(UI.g, pb.res).concat(endCombatFx(UI.g, pb.res)); pb.done = true;
  UI.adapt = UI.g.over ? [] : adaptationOffers(UI.g, pb.res);   // choix d'Adaptation des Elk survivants, un par un
  render();
}
function openRenfort() {
  const g = UI.g, log = [], inc = incomeFor(g.room);
  g.datacrons += inc; g.stats.earned += inc;
  log.push(`Salle ${g.room} : +${inc} Datacrons.`);
  renfortFx(g, 'startRenfort', m => log.push(m));
  bossRenfort(g);
  UI.rf = { offer: null, reward: null, log };
  UI.screen = 'renfort'; render();
}

const ACT = {
  selHero(d) { const h = UI.sel.heroes, i = h.indexOf(d.id); if (i >= 0) h.splice(i, 1); else if (h.length < 2) h.push(d.id); render(); },
  selDungeon(d) { UI.sel.dungeon = d.id; render(); },
  toHeroes() { UI.screen = 'heroes'; render(); },
  backToDungeon() { UI.screen = 'menu'; render(); },
  start() { UI.g = newGame(UI.sel.heroes, UI.sel.dungeon); UI.notice = ''; openRenfort(); },
  copyReport() { navigator.clipboard.writeText(debugReport()).then(() => { UI.notice = 'Rapport copié.'; renderDebug(); }, () => prompt('Copie le rapport :', debugReport())); },
  toggleLog() { UI.showLog = !UI.showLog; renderDebug(); },
  pickAdapt(d) {
    const ad = UI.adapt.shift(), msg = ad && learnCapability(UI.g, ad.uid, ad.options[+d.i]);
    if (msg && UI.pb.lines) UI.pb.lines.push(msg);
    render();
  },
  skipAdapt() { UI.adapt.shift(); render(); },
  next() { if (UI.adapt.length) return; UI.notice = ''; if (UI.g.over) { UI.screen = 'end'; render(); } else openRenfort(); },
  // Chaque achat coûte 1 Datacron, payé à l'ouverture du choix (pas d'annulation : pas de relance gratuite).
  buyLevel() {
    const g = UI.g, rf = UI.rf;
    if (g.datacrons < 1 || g.level >= MAX_LEVEL || rf.offer || rf.reward) return;
    g.datacrons--; g.counter++; g.stats.contrib++;
    if (g.counter >= levelCost(g.level)) {
      g.counter -= levelCost(g.level); g.level++;
      rf.log.push(`Niveau de renfort ${g.level} atteint.`);
      if (g.level >= MAX_LEVEL) g.counter = 0;
    }
    render();
  },
  buyServant() { ACT.buy('servant'); },
  buyEquip() { ACT.buy('equip'); },
  buy(kind) {
    const g = UI.g, rf = UI.rf;
    if (g.datacrons < 1 || g.hand.length >= HAND_MAX || rf.offer || rf.reward) return;
    g.datacrons--; rf.offer = { kind, cards: drawCards(g, kind, g.level) }; render();
  },
  pickOffer(d) {
    const g = UI.g, rf = UI.rf, card = rf.offer.cards[+d.i], say = m => rf.log.push(m);
    if (rf.offer.kind === 'servant') { g.hand.push({ kind: 'servant', s: mkServant(card) }); g.stats.servants++; say(`${card.name} rejoint ta main.`); }
    else { g.hand.push({ kind: 'equip', def: card }); g.stats.equips++; say(`${card.name} rejoint ta main.`); }
    rf.offer = null; resolveFusion(g, rf, say); render();
  },
  pickReward(d) {
    const g = UI.g, rf = UI.rf, say = m => rf.log.push(m), card = rf.reward.cards[+d.i];
    g.hand.push({ kind: 'servant', s: mkServant(card) }); say(`${card.name} rejoint ta main.`);
    rf.reward = null; resolveFusion(g, rf, say); render();
  },
  // Jeter une carte de la main (gratuit, sans remboursement) pour libérer une place.
  discard(d) {
    const g = UI.g, rf = UI.rf, h = g.hand[+d.i];
    if (!h || rf.offer || rf.reward) return;
    const name = h.kind === 'servant' ? h.s.name : h.def.name;
    if (typeof confirm === 'function' && !confirm(`Jeter « ${name} » ? Cette carte sera perdue.`)) return;
    g.hand.splice(+d.i, 1); g.stats.discarded++;
    rf.log.push(`${name} est jeté.`); render();
  },
  finishRenfort() {
    const msgs = []; renfortFx(UI.g, 'endRenfort', m => msgs.push(m));
    UI.notice = msgs.join(' '); startCombatUI();
  },
  restart() { clearTimeout(UI.timer); clearTimeout(UI.timer2); UI.screen = 'menu'; UI.sel.heroes = []; render(); }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && !b.disabled && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset);
});
// ---------- Glisser-déposer (renfort) ----------
// main -> plateau : pose un serviteur (sur une carte : devant ou derrière elle, ou remplace si le plateau est plein)
// main -> serviteur : équipe ; plateau -> plateau : change l'ordre. Un dépôt invalide ne fait rien.
const DRAG = { src: null };
const dropSide = (el, e) => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 'l' : 'r'; };
const clearDrop = () => document.querySelectorAll('.drop-l,.drop-r,.drop-on,.drop-zone').forEach(n => n.classList.remove('drop-l', 'drop-r', 'drop-on', 'drop-zone'));
function dragInfo() {
  const d = DRAG.src, g = UI.g;
  if (!d || UI.screen !== 'renfort') return null;
  if (d.kind === 'hand') { const h = g.hand[d.i]; return h ? { from: 'hand', type: h.kind, i: d.i } : null; }
  const i = g.board.findIndex(x => x.uid === d.uid); return i < 0 ? null : { from: 'board', type: 'servant', i };
}
document.addEventListener('dragstart', e => {
  const el = e.target.closest && e.target.closest('[data-drag]');
  if (!el) return;
  DRAG.src = { kind: el.dataset.drag, i: +el.dataset.i, uid: +el.dataset.uid };
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'atlas');
  el.classList.add('opacity-50');
});
document.addEventListener('dragend', () => { DRAG.src = null; clearDrop(); document.querySelectorAll('[data-drag].opacity-50').forEach(n => n.classList.remove('opacity-50')); });
document.addEventListener('dragover', e => {
  const info = dragInfo(), t = e.target.closest && e.target.closest('[data-drop]');
  if (!info || !t) return;
  const card = t.dataset.drop === 'card';
  if (info.type === 'equip' && !card) return;
  if (card && info.from === 'board' && +t.dataset.uid === DRAG.src.uid) return;
  e.preventDefault(); clearDrop();
  if (info.type === 'equip') t.classList.add('drop-on');
  else if (card) t.classList.add(UI.g.board.length >= MAX_BOARD && info.from === 'hand' ? 'drop-on' : 'drop-' + dropSide(t, e));
  else t.classList.add('drop-zone');
});
document.addEventListener('drop', e => {
  const info = dragInfo(), t = e.target.closest && e.target.closest('[data-drop]');
  if (!info || !t) return;
  e.preventDefault();
  const g = UI.g, rf = UI.rf, say = m => rf.log.push(m), card = t.dataset.drop === 'card';
  const side = card ? dropSide(t, e) : 'r', ti = card ? +t.dataset.idx : g.board.length;
  clearDrop(); DRAG.src = null;
  if (rf.offer || rf.reward) return;
  if (info.type === 'equip') {
    if (!card) return;
    const sv = g.board[ti], eq = g.hand[info.i].def;
    applyEquip(sv, eq); g.hand.splice(info.i, 1); say(`${eq.name} équipé sur ${sv.name}.`);
  } else if (info.from === 'board') {
    const [sv] = g.board.splice(info.i, 1);
    let at = card ? ti + (side === 'r' ? 1 : 0) : g.board.length;
    if (info.i < at) at--;
    g.board.splice(at, 0, sv);
  } else if (g.board.length >= MAX_BOARD) {
    if (!card) { say('Plateau plein : dépose la carte sur un serviteur pour le remplacer.'); }
    else if (typeof confirm !== 'function' || confirm(`Remplacer « ${g.board[ti].name} » ? Ses équipements seront perdus.`)) placeServant(g, info.i, ti, say);
  } else {
    placeServant(g, info.i, null, say);
    if (card) { const sv = g.board.pop(); g.board.splice(ti + (side === 'r' ? 1 : 0), 0, sv); }
  }
  render();
});
render();
