// Atlas Wanderer — interface: screens, rendering, flow.
'use strict';
// ==== UI ====
const app = document.getElementById('app');
const UI = { screen: null, sel: null, g: null, rf: null, pb: null, timer: null, timer2: null, adapt: [], hideKey: null, dcShown: null, notice: '', showLog: false, errors: [], save: null };   // screen, sel and save are set once the mod is loaded (first render): they depend on its description

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Type pills: species = tinted background, assignment = outline. Icons and colors come from svg.js.
// The engine knows the cards by their French names (logs, saves, equipment lists). localName gives the name in the current language: through the French name -> identifier table,
// "X doré" is the gold card, "Mini-boss <type>" a Boss board servant. A name that matches nothing is returned as it is.
const localName = (() => {
  let byName = null, byType = null;
  return fr => {
    if (I18N.lang === 'fr' || typeof fr !== 'string') return fr;
    if (!byName) {
      const table = {}, types = {};
      for (const key of Object.keys(I18N.tables('fr'))) {
        const m = /^card\.([^.]+)$/.exec(key), t = /^type\.(\w+)$/.exec(key);
        if (m) table[I18N.text('fr', key)] = m[1]; else if (t) types[I18N.text('fr', key)] = t[1];
      }
      if (!Object.keys(table).length) return fr;   // the texts are not loaded yet: do not remember an empty table
      byName = table; byType = types;
    }
    if (fr.endsWith(' doré')) return localName(fr.slice(0, -5)) + I18N.t('ui.goldSuffix');
    const mini = /^Mini-boss (.+)$/.exec(fr);
    if (mini && byType[mini[1]]) return I18N.t('ui.miniBoss', { type: I18N.t('type.' + byType[mini[1]]) });
    return byName[fr] ? I18N.t('card.' + byName[fr]) : fr;
  };
})();
AWGfx.setTexts((key, params) => (I18N.has(key) ? I18N.t(key, params) : key), localName);   // svg.js draws the cards with the texts of data/i18n
const typeBadges = ts => ts.map(t => {
  const c = AWGfx.typeColor(t), sp = AWGfx.isFirstGroup(t);
  return `<span class="badge badge-sm gap-1 ${sp ? '' : 'badge-outline'}" style="color:${c};border-color:${c};${sp ? `background:${c}33;` : ''}">${AWGfx.icon(t, { size: 12, color: c, bg: '#1d232a' })}<span class="text-base-content">${t}</span></span>`;
}).join(' ');
const kwBadges = (kw, s) => kw
  .filter(k => !(s && 'shield' in s) || (k === 'shield' ? s.shield : k === 'rebirth' ? s.reb : true))
  .map(k => `<span class="badge badge-xs badge-outline">${I18N.t('keyword.' + k)}</span>`).join(' ');
const skLine = k => `<span class="${TRIG_KIND[k.t] === 'combat' ? 'text-error' : 'text-info'}">${esc(skDesc(k))}</span>`;

// Cards: the drawing comes from svg.js, the HTML wrapper carries the clicks and highlights.
const CARD_W = 'w-[var(--card-w)]';   // width computed from the screen (see --card-w in prototype.html)
const CARD_H = 'min-h-[calc(var(--card-w)*1.65)]';
const PEEK = 'main-carte relative overflow-hidden h-[calc(var(--card-w)*var(--peek,1.1))]';
const extraOf = o => o.extra ? `<div class="${o.peek ? 'absolute bottom-1 right-1 z-10' : 'mt-1'} flex justify-center gap-1">${o.extra}</div>` : '';
function servantCard(s, o = {}) {
  // A catalog entry (purchase offers, rewards) can carry a list of powers: the first is the skill, the others the additional powers.
  if (Array.isArray(s.skill)) s = { ...s, skill: s.skill[0] || null, extra: s.skill.slice(1) };
  const ring = o.att ? 'ring-4 ring-warning' : o.tgt ? 'ring-4 ring-error' : '';
  // In combat, a lost Shield or an already used Rebirth stay displayed, marked "used".
  const kwSpent = ('shield' in s) ? s.kw.filter(k => (k === 'shield' && !s.shield) || (k === 'rebirth' && !s.reb)) : [];
  const powers = powersOf(s.kw, skillsOf(s), s.droneA || s.droneH ? { a: s.droneA, h: s.droneH } : null, kwSpent);
  const sh = powers.find(p => p.key === 'shield');
  if (sh && s.shield > 1) sh.count = s.shield;   // a multi-hit Shield shows the remaining hits
  const art = AWGfx.servantCard({ ...s, kwSpent, powers }, { width: '100%' });
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${ring} ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${art}${extraOf(o)}</div>`;
}
function equipCard(e, o = {}) {
  const powers = powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.droneA, h: e.mod.droneH } : null, [], true);   // true: texts "desc.<fx>.equipment" (the carrier instead of "itself")
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${AWGfx.equipCard({ ...e, powers }, { width: '100%' })}${extraOf(o)}</div>`;
}
// Heroes: portrait cards, identical to the starting choice, with their current HP.
const heroProps = (def, hp, maxhp, patch) => ({ patch, id: def.id, name: def.name, types: def.types, hp, maxhp, kw: def.kw, powerText: def.power ? skDesc(def.power) : '', powerKind: def.power ? TRIG_KIND[def.power.t] : 'renfort' });
// rf: in reinforcement, a hero's active power becomes a button under their card (once per reinforcement, free).
// A hero card. UI.hold (end of combat) holds the HP from before the hits, for the time of the animation.
const heroSlot = (g, rf, i) => {
  const h = g.heroes[i], hp = UI.hold ? UI.hold.heroes[i] : h.hp;
  const active = !!h.def.power && h.def.power.t === 'active', A = active && ACTIVES[h.def.power.fx], armed = rf && rf.targeting === i, price = active && A.cost ? A.cost(h) : 0, used = h.used && !A.repeat, ok = rf && active && h.hp > 0 && !used && g.datacrons >= price && !rf.offer && !rf.reward && !rf.rolling && [...g.board, ...g.hand.filter(x => x.kind === 'servant').map(x => x.s)].some(s => A.ok(g, s));
  const btn = rf && active ? `<button class="btn-achat btn-compact w-full mt-1 px-3 flex items-center justify-center gap-2 font-bold" data-act="${armed ? 'cancelActive' : 'useActive'}" data-i="${i}" ${ok || armed ? '' : 'disabled'}>${AWGfx.icon(A.icon, { size: 22, color: ok || armed ? A.color : '#94a3b8' })}${armed ? I18N.t('ui.pickServantCancel') : used ? I18N.t('ui.powerUsed') : I18N.t(A.label) + (price ? ` (${price} ◈)` : '')}</button>` : '';
  return `<div class="w-[calc(var(--card-w)*2)] min-w-[17rem] shrink-0" data-hero="${i}"><div class="rounded-2xl">${AWGfx.heroCard(heroProps(h.def, hp, h.maxhp, UI.patchShow && UI.patchShow.hero === i ? UI.patchShow.x : 0), { width: '100%' })}</div>${btn}</div>`;
};
// Slim banner of the current dungeon: scenery and name on the left, Boss, HP, type and power on the right.
const bossPanel = g => { const d = g.dungeon, bhp = UI.hold ? UI.hold.boss : g.boss.hp; return `<div data-boss class="flex rounded-box cadre overflow-hidden border" style="border-color:${AWGfx.typeColor(d.type)}88;background:#151a26">
  <div class="relative w-[28%] shrink-0 min-h-[5.5rem]">
    <div class="absolute inset-0 [&>svg]:w-full [&>svg]:h-full">${AWGfx.dungeonScene(d, { width: '100%' })}</div>
    <div class="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent"><div class="text-sm sm:text-base font-extrabold text-white leading-tight">${esc(AWGfx.cardName(d))}</div></div>
  </div>
  <div class="flex-1 min-w-0 px-3 py-2 grid gap-1 content-center">
    <div class="flex flex-wrap items-center gap-2"><b class="text-error text-lg leading-none">${esc(AWGfx.text('boss.' + g.dungeon.id, g.boss.name))}</b>
      <span class="badge badge-error text-black font-black gap-1">${AWGfx.icon('heart', { size: 14, color: '#000' })}${bhp}/${g.boss.maxhp}</span></div>
    <progress class="progress progress-error w-full h-1.5" value="${bhp}" max="${g.boss.maxhp}"></progress>
    <div class="flex flex-wrap items-center gap-2"><span class="shrink-0">${AWGfx.typeChipSvg(d.type)}</span><span class="text-xs opacity-80">${esc(AWGfx.text('boss.' + d.id + '.desc', d.boss.desc))}</span></div>
  </div></div>`; };
const header = g => `<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
  <h1 class="text-xl font-bold">Atlas Wanderer <span class="badge badge-ghost">prototype</span></h1>
  <div class="flex gap-2 text-sm"><span class="badge badge-lg">${I18N.t('ui.room', { n: g.room })}</span><span class="badge badge-lg badge-secondary">${I18N.t('ui.reinforcementShort', { n: g.level })}</span><span class="badge badge-lg badge-warning">◈ ${I18N.t('ui.datacrons', { n: shownDc(g) })}</span>${g.prophecy && !g.prophecy.done ? `<span class="badge badge-lg badge-outline" title="Hal Ana">${esc(g.prophecy.card.name)} ${Math.min(g.spent || 0, PROPHECY_COST)}/${PROPHECY_COST} ◈</span>` : ''}
  <span class="badge badge-lg badge-outline">${I18N.t('ui.types', { list: g.types.map(AWGfx.typeName).join(', ') })}</span></div></div>`;

// ---------- Screens ----------
function renderMenu() {
  const sel = UI.sel;
  const banner = GAME.setupIndexOf(UI.screen) === 0 ? saveBanner() : '';
  const heroes = Object.values(HEROES).map(h => `
    <button data-act="selHero" data-id="${h.id}" class="w-[26rem] max-w-full shrink-0 rounded-2xl text-left transition hover:-translate-y-0.5 ${sel.heroes.includes(h.id) ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.heroCard(heroProps(h, h.hp), { width: '100%', selected: sel.heroes.includes(h.id) })}</button>`).join('');
  // Clickable card; once chosen, the "Select" button appears in the card and leads to the heroes.
  const dungeons = Object.values(DUNGEONS).map(d => { const on = sel.dungeon === d.id; return `
    <div data-act="selDungeon" data-id="${d.id}" class="relative rounded-2xl cursor-pointer transition hover:-translate-y-0.5 ${on ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.dungeonCard(d, { width: '100%', selected: on })}
      ${on ? `<div class="absolute inset-x-0 top-0 h-[58%] flex items-center justify-center pointer-events-none"><button class="btn-achat btn-or px-10 text-xl shadow-lg pointer-events-auto flex items-center gap-2 font-bold" data-act="toHeroes">${AWGfx.icon('btnDoor', { size: 28, color: '#1a1304' })}${I18N.t('ui.explore')}</button></div>` : ''}</div>`; }).join('');
  const types = sel.dungeon ? [...new Set([DUNGEONS[sel.dungeon].type, ...sel.heroes.flatMap(i => HEROES[i].types)])] : [];   // player's types: dungeon + two heroes, updated at each choice
  if (UI.screen === 'heroSelect') { const d = DUNGEONS[sel.dungeon]; return `
  <div class="flex flex-col sm:flex-row rounded-box cadre overflow-hidden border mb-5" style="border-color:${AWGfx.typeColor(d.type)}88;background:#151a26">
    <div class="relative sm:w-[42%] shrink-0 min-h-[10rem]">
      <div class="absolute inset-0 [&>svg]:w-full [&>svg]:h-full">${AWGfx.dungeonScene(d, { width: '100%' })}</div>
      <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent"><div class="text-2xl font-extrabold text-white">${esc(AWGfx.cardName(d))}</div></div>
    </div>
    <div class="flex-1 p-4 grid gap-3 content-center">
      <div class="flex flex-wrap items-center gap-3"><div class="text-2xl font-bold text-error">${esc(AWGfx.text('boss.' + d.id, d.boss.name))}</div><span class="badge badge-lg badge-error text-black font-black text-base gap-1">${AWGfx.icon('heart', { size: 16, color: '#000' })}${d.boss.hp}</span></div>
      <div>${AWGfx.typeChipSvg(d.type)}</div>
      <div class="text-sm">${esc(AWGfx.text('boss.' + d.id + '.desc', d.boss.desc))}</div>
    </div>
  </div>
  <h2 class="text-xl font-bold text-center mb-3">${I18N.t('ui.selectHeroes')}</h2><div class="flex flex-wrap justify-center gap-4 mb-6">${heroes}</div>
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3">
    <button class="btn-achat px-6 flex items-center gap-2 font-bold" data-act="backToDungeon"><span aria-hidden="true">‹</span>${I18N.t('ui.back')}</button>
    <div class="flex flex-wrap justify-center gap-1.5">${types.map(AWGfx.typeChipSvg).join('')}</div>
    <button class="btn-achat btn-suite px-8 flex items-center gap-2 font-bold" data-act="start" ${GAME.setupComplete(sel) ? '' : 'disabled'}>${AWGfx.icon('btnDoor', { size: 26, color: '#fdba74' })}${I18N.t('ui.startExploration')}</button>
  </div>`; }
  const modName = typeof MOD !== 'undefined' && MOD.manifest ? MOD.manifest.name[I18N.lang] || MOD.manifest.name.fr : '';
  const modLine = !modName ? '' : `<div class="text-center text-sm opacity-70 mb-3">${I18N.t('ui.modLabel')} <strong>${esc(modName)}</strong> · <a class="link" href="../site/mods.html">${I18N.t('ui.changeMod')}</a></div>`;
  return `${banner}${modLine}<div class="grid gap-3 sm:grid-cols-2 mb-4">${dungeons}</div>`;
}

// Displayed Datacron counter: during the datacube roll it keeps the previous value, and changes only when the die lands (see startReinforcement).
const shownDc = g => UI.dcShown != null ? UI.dcShown : g.datacrons;
// Choice form (Hal Ana, fusion reward, Adaptation): placed exactly between the two boards, on a nebula background.
// mystic: extra moving smoke (Hal Ana). "Hide" shrinks it into a "Show the choice" button to see the boards.
const choiceOverlay = (key, inner, o = {}) => UI.hideKey === key
  ? `<button class="btn-achat btn-petit choix-rappel" data-act="showChoice">${I18N.t('ui.showChoice')}</button>`
  : `<div class="choix-calque ${o.mystic ? 'choix-mystique' : ''} ${o.w || 'max-w-4xl'}"><div class="choix-fond"></div>${o.mystic ? '<div class="fumee"><i></i><i></i><i></i><i></i><i></i></div>' : ''}
    <div class="relative z-10 p-4 pb-11">${inner}</div><button class="btn-achat btn-petit choix-masquer" data-act="hideChoice">${I18N.t('ui.hide')}</button></div>`;
// Hand: in reinforcement the cards have their buttons, in combat it is displayed alone.
function handHtml(g, rf, full) {
  const busy = rf && (rf.offer || rf.reward || rf.prophecy || rf.rolling);
  const discard = i => `<button class="btn-achat btn-petit btn-danger btn-jeter" data-act="discard" data-i="${i}" ${busy ? 'disabled' : ''} title="${I18N.t('ui.discardCard')}">${AWGfx.icon('trash', { size: 18, color: '#fecaca' })}</button>`;
  const drag = i => rf && !busy ? { peek: !full, cls: 'cursor-grab select-none', attrs: `draggable="true" data-drag="hand" data-i="${i}"`, extra: g.hand[i].kind === 'servant' && isPr(g.hand[i].s) ? '' : discard(i) } : { peek: !full, extra: '' };
  // Targeting of an active power: the servants in the hand are targets like those on the board.
  const A = rf && rf.targeting != null && ACTIVES[g.heroes[rf.targeting].def.power.fx];
  if (A) return g.hand.map(h => h.kind !== 'servant' ? equipCard(h.def, { peek: !full, cls: 'opacity-40' })
    : servantCard(h.s, { peek: !full, ...(A.ok(g, h.s) ? { cls: 'cursor-pointer ring-2 ring-lime-400 hover:ring-4', attrs: `data-act="pickActiveTarget" data-uid="${h.s.uid}"` } : { cls: 'opacity-40' }) })).join('');
  return g.hand.map((h, i) => h.kind === 'servant' ? servantCard(h.s, drag(i)) : equipCard(h.def, drag(i))).join('');
}
const handSection = (g, rf, full) => `<div class="flex flex-wrap justify-center gap-2 mt-3 ${full ? CARD_H : 'min-h-[calc(var(--card-w)*var(--peek,1.1))]'}">${handHtml(g, rf, full)}</div>`;
// Top row of the reinforcement block: level, progress, full hand, Datacrons (same display in combat).
const reinforcementHead = g => {
  const cost = levelCost(g.level), maxed = g.level >= MAX_LEVEL, full = handFull(g);
  return `<div class="flex items-center justify-between gap-3">
        <div class="flex flex-1 items-center gap-3" title="${maxed ? I18N.t('ui.levelMax') : I18N.t('ui.levelProgress', { missing: cost - g.counter, next: g.level + 1 })}">
          ${AWGfx.icon('niveauChevrons', { size: 38, color: '#B9A8FF' })}
          <span class="font-black text-3xl leading-none" style="color:#B9A8FF">${g.level}</span>
          ${maxed ? '<span class="text-xs uppercase tracking-[.2em] text-violet-300/60 pr-1">max</span>' : `<div class="barre-crantee !pl-0">${Array.from({ length: cost }, (_, i) => `<i class="${i < g.counter ? 'on' : ''}"></i>`).join('')}</div>`}</div>
        ${full ? `<span class="badge badge-warning badge-sm">${I18N.t('ui.handFull')}</span>` : ''}
        <span class="text-3xl font-black leading-none text-warning" style="text-shadow:0 0 14px rgba(245,197,66,.6)" title="${I18N.t('ui.datacronsTitle')}">${shownDc(g)} ◈</span></div>`;
};
// The purchases shown in the console of the reinforcement screen: the actions that the mod lists for its console panel (the end of the step has its own button).
const consoleActions = () => GAME.def().ui.screens.room.panels.find(p => p.widget === 'console').actions.filter(id => id !== 'finish');
// Type of an offered card (old saves have a single `kind` for the whole offer).
const offerKind = (offer, i) => offer.kinds ? offer.kinds[i] : offer.kind;
function renderReinforcement() {
  const g = UI.g, rf = UI.rf, cost = levelCost(g.level), maxed = g.level >= MAX_LEVEL;
  const busy = !!(rf.offer || rf.reward || rf.prophecy || rf.rolling), full = handFull(g), can = g.datacrons >= 1 && !busy;
  // An open servant or equipment offer does not block the Reinforcement button: another can be requested (1 ◈, the current offer is abandoned).
  const canOffer = g.datacrons >= 1 && !(rf.reward || rf.prophecy || rf.rolling) && !full;
  // The launch appears only once the Datacrons are spent (or if there is nothing left to buy).
  const launch = !busy && (g.datacrons < 1 || (maxed && full));
  // While choosing the target of an active power, the board stays reorderable (drag) while the click designates the target.
  const board = g.board.map((sv, i) => {
    const drag = `draggable="true" data-drag="board" data-drop="card" data-uid="${sv.uid}" data-idx="${i}"`;
    if (rf.targeting == null) return servantCard(sv, { cls: 'select-none cursor-grab', attrs: drag });
    return ACTIVES[g.heroes[rf.targeting].def.power.fx].ok(g, sv)
      ? servantCard(sv, { cls: 'select-none cursor-pointer ring-2 ring-lime-400 hover:ring-4', attrs: `${drag} data-act="pickActiveTarget"` })
      : servantCard(sv, { cls: 'select-none opacity-40', attrs: drag });
  }).join('');
  const offerCards = rf.offer ? rf.offer.cards.map((d, i) => offerKind(rf.offer, i) === 'servant'
    ? servantCard({ ...d, maxhp: d.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"` })
    : equipCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"` })).join('') : '';
  const reward = rf.reward ? choiceOverlay('reward', `
    <h3 class="font-bold text-lg mb-1">${rf.reward.kind === 'ally' ? I18N.t('ui.rewardAlly', { from: localName(rf.reward.from), a: rf.reward.a }) : rf.reward.kind === 'equip' ? I18N.t('ui.rewardEquip', { rank: rf.reward.rank }) : I18N.t('ui.rewardFusion', { rank: rf.reward.rank })}</h3>
    <p class="text-sm opacity-70 mb-3">${rf.reward.kind === 'ally' ? I18N.t('ui.bonusPermanent') : I18N.t('ui.joinsYourHand')}</p>
    <div class="flex flex-wrap gap-2 justify-center">${rf.reward.cards.map((d, i) => rf.reward.kind === 'ally' ? servantCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` }) : rf.reward.kind === 'equip' ? equipCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` }) : servantCard({ ...d, maxhp: d.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` })).join('')}</div>`) : '';
  const prophecy = rf.prophecy ? choiceOverlay('prophecy', `
    <h3 class="font-bold text-lg mb-1">${I18N.t('ui.prophecyChoose', { rank: MAX_RANK })}</h3>
    <p class="text-sm opacity-70 mb-3">${I18N.t('ui.prophecyWhen', { cost: PROPHECY_COST })}</p>
    <div class="flex flex-wrap gap-2 justify-center">${rf.prophecy.cards.map((c, k) => servantCard({ ...c, maxhp: c.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickProphecy" data-i="${k}"` })).join('')}</div>`, { mystic: true }) : '';
  return `<div class="combat flex flex-col min-h-[calc(100dvh-2.5rem)] [--peek:.62]">
  ${bossPanel(g)}
  <div class="relative flex-1 flex flex-col mt-3 mb-3">
  <div class="plateau-donjon rounded-box p-3 mb-3 flex-1 flex items-center justify-center">
    <div class="decor">${AWGfx.dungeonScene(g.dungeon, { width: '100%' })}</div>
    <div class="relative flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${offerCards}</div>
  </div>
    <div class="plateau rounded-box p-3 flex-1 flex items-center justify-center">
    <div class="flex flex-wrap justify-center gap-2 ${CARD_H} w-full" data-drop="board">${board}</div>
  </div>
  ${reward}${prophecy}
  </div>
  <div class="mt-auto">
  ${handSection(g, rf)}
  <div class="relative flex flex-wrap justify-center gap-3 rounded-box border border-base-content/15 bg-black/25 p-2">
    ${heroSlot(g, rf, 0)}
    <div class="console-renfort flex-1 min-w-[16rem] flex flex-col justify-between gap-2 p-3 rounded-box">
      ${reinforcementHead(g)}
      <div class="flex gap-2">
        ${launch ? `<button class="btn-achat btn-suite btn-compact w-full px-3 flex items-center justify-center gap-2 font-bold" data-act="finishReinforcement">${AWGfx.icon('btnDoor', { size: 22, color: '#fdba74' })}${I18N.t('ui.exploreNextRoom')}</button>` : `${consoleActions().map(id => { const a = GAME.action(id), o = GAME.opens(id), isLevel = id === 'buyLevel'; return [id, a.icon, isLevel && maxed ? I18N.t('ui.levelMaxShort') : I18N.t(a.label), GAME.canRun(g, rf, id), GAME.price(id), o]; }).map(([act, ic, label, ok, price, opened]) =>
        `<button class="btn-achat btn-compact flex-1 px-3 flex items-center justify-center gap-2 font-bold whitespace-nowrap ${rf.offer && opened && opened.params.kind === offerKind(rf.offer, 0) ? 'ring-2 ring-primary' : ''}" data-act="run" data-action="${act}" ${ok ? '' : 'disabled'} ${rf.offer && ok && opened ? `title="${I18N.t('ui.newOfferTitle')}"` : ''}>${AWGfx.icon(ic, { size: 24, color: ok ? (ic === 'niveauChevrons' ? '#B9A8FF' : '#7dd3fc') : '#94a3b8' })}${label}${act === 'buyLevel' && maxed ? '' : ` <span class="font-black text-warning whitespace-nowrap">${price} ◈</span>`}</button>`).join('')}`}
      </div>
    </div>
    ${heroSlot(g, rf, 1)}
  </div>
  </div>
  </div>
  `;
}

function renderCombat() {
  const g = UI.g, pb = UI.pb, cur = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  // Before the impact of an attack, the previous state is still shown (the charge is played on these cards).
  const f = pb.phase === 'pre' && prev ? { p: prev.p, e: prev.e, hl: cur.hl } : cur;
  const row = list => list.length ? list.map(s => servantCard(s, { att: f.hl.att === s.uid, tgt: f.hl.tgt === s.uid, attrs: `data-uid="${s.uid}"` })).join('') : `<div class="opacity-50 text-sm p-6">${I18N.t('ui.empty')}</div>`;
  // No control during the animation: only the end button appears, once the combat is over, in place of the purchases.
  const next = pb.done ? `<button class="btn-achat btn-suite btn-compact w-full px-3 flex items-center justify-center gap-2 font-bold" data-act="next" ${UI.adapt.length ? 'disabled' : ''}>${g.over ? I18N.t('ui.seeResult') : `${AWGfx.icon('btnReinforce', { size: 22, color: '#fdba74' })}${I18N.t('ui.toReinforcement')}`}</button>` : '';
  // Adaptation: a surviving Elk chooses an ability among those of the other survivors (or learns nothing).
  const ad = UI.adapt[0], elk = ad && g.board.find(x => x.uid === ad.uid);
  const adapt = ad && elk ? choiceOverlay('adapt', `
    <h3 class="font-bold text-lg mb-1">${I18N.t('ui.adaptation', { name: esc(localName(ad.name)) })}</h3>
    <p class="text-sm opacity-70 mb-3">${I18N.t('ui.adaptationHelp')}</p>
    <div class="flex gap-4 items-start flex-wrap justify-center">
      <div class="w-40 shrink-0">${servantCard(elk, {})}</div>
      <div class="flex-1 min-w-[14rem] grid gap-2">${ad.options.map((c, i) => `<button class="btn-achat text-left px-3 py-2 flex flex-col items-start" data-act="pickAdapt" data-i="${i}"><span class="font-bold ${c.stat ? 'text-success' : c.kw ? 'text-info' : 'text-warning'}">${esc(capLabel(c))}</span><span class="text-xs opacity-70">${c.stat ? I18N.t('ui.permanentBonus') : I18N.t('ui.fromCard', { name: esc(localName(c.from)) })}</span></button>`).join('')}</div>
    </div>`, { w: 'max-w-3xl' }) : '';
  // Same layout as reinforcement: dungeon board (theme scenery) then the player's board, in the same frame, then the hand as a preview.
  return `<div class="combat flex flex-col min-h-[calc(100dvh-2.5rem)] [--peek:.62]">
  ${bossPanel(g)}
  <div class="relative flex-1 flex flex-col mt-3 mb-3">
  <div class="plateau-donjon rounded-box p-3 mb-3 flex-1 flex items-center justify-center">
    <div class="decor">${AWGfx.dungeonScene(g.dungeon, { width: '100%' })}</div>
    <div class="relative flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${row(f.e)}</div>
  </div>
  <div class="plateau rounded-box p-3 flex-1 flex items-center justify-center">
    <div class="flex flex-wrap justify-center gap-2 ${CARD_H} w-full">${row(f.p)}</div>
  </div>
  ${adapt}
  </div>
  <div class="mt-auto">
  ${handSection(g, null)}
  <div class="flex flex-wrap justify-center gap-3 rounded-box border border-base-content/15 bg-black/25 p-2">
    ${heroSlot(g, null, 0)}
    <div class="console-renfort flex-1 min-w-[16rem] flex flex-col justify-between gap-2 p-3 rounded-box">
      ${reinforcementHead(g)}
      <div class="flex gap-2 min-h-[2.5rem]">${next}</div>
    </div>
    ${heroSlot(g, null, 1)}
  </div>
  </div>
  </div>
  `;
}

function renderEnd() {
  const g = UI.g, win = g.over === 'win';
  return `<div class="hero py-10"><div class="hero-content text-center"><div class="max-w-md">
    <h1 class="text-4xl font-bold ${win ? 'text-success' : 'text-error'}">${win ? I18N.t('ui.victory') : I18N.t('ui.defeat')}</h1>
    <p class="py-4">${win ? I18N.t('ui.endWin', { boss: esc(AWGfx.text('boss.' + g.dungeon.id, g.boss.name)), n: g.room - 1 }) : I18N.t('ui.endLose', { n: g.room - 1 })}</p>
    <div class="stats stats-vertical sm:stats-horizontal shadow mb-4">
      <div class="stat"><div class="stat-title">${I18N.t('ui.statRooms')}</div><div class="stat-value">${g.room - 1}</div></div>
      <div class="stat"><div class="stat-title">${I18N.t('ui.statLevel')}</div><div class="stat-value">${g.level}</div></div>
      <div class="stat"><div class="stat-title">${I18N.t('ui.statBossHp')}</div><div class="stat-value">${g.boss.hp}</div></div></div>
    <div class="text-sm opacity-80 mb-4">${I18N.t('ui.endStats', { earned: g.stats.earned, left: g.datacrons, servants: g.stats.servants, equips: g.stats.equips, contrib: g.stats.contrib, fusions: g.stats.fusions, discarded: g.stats.discarded })}</div>
    <div><button class="btn-achat btn-or px-8 font-bold" data-act="restart">${I18N.t('ui.newGame')}</button></div></div></div></div>`;
}


// ---------- Game dialog windows (replace the browser's confirm / prompt) ----------
// gameModal: centered window in the game's style; each button { label, cls, run, focus } closes the window then runs run. Escape or a click outside cancels.
function gameModal({ title, html, buttons }) {
  closeGameModal();
  const el = document.createElement('div');
  el.id = 'game-modal';
  el.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4';
  el.innerHTML = `<div class="console-renfort w-full max-w-md rounded-box p-5 shadow-2xl" role="dialog" aria-modal="true">
      <h3 class="font-bold text-lg mb-2">${esc(title)}</h3><div class="text-sm opacity-90 mb-5">${html}</div>
      <div class="flex justify-end gap-2">${buttons.map((b, i) => `<button class="btn-achat ${b.cls || ''} px-5 font-bold" data-gm="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-gm]');
    if (!b && e.target !== el) return;
    closeGameModal(); if (b && buttons[+b.dataset.gm].run) buttons[+b.dataset.gm].run();
  });
  document.body.appendChild(el);
  const f = el.querySelector(`[data-gm="${Math.max(0, buttons.findIndex(b => b.focus))}"]`); if (f) f.focus();
}
const closeGameModal = () => { const m = document.getElementById('game-modal'); if (m) m.remove(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('game-modal')) { e.stopImmediatePropagation(); closeGameModal(); } }, true);
// Confirmation request: onOk runs only if the player confirms. Without a browser (simulation), it is confirmed automatically.
function confirmer(text, onOk, o = {}) {
  if (typeof HTMLElement === 'undefined') { onOk(); return; }
  gameModal({ title: o.title || I18N.t('ui.confirmation'), html: `<p>${esc(text)}</p>`, buttons: [
    { label: I18N.t('ui.cancel'), cls: 'btn-compact' },
    { label: o.ok || I18N.t('ui.continue'), cls: `btn-compact ${o.danger === false ? 'btn-or' : 'btn-danger'}`, run: onOk, focus: true }] });
}

// ---------- Debug mode ----------
// Fixed icon at the bottom left; the panel floats above the game, outside the layout.
const dbg = document.createElement('div');
document.body.appendChild(dbg);
// Debug report: game state and errors, copyable in one click to paste into the conversation.
function debugReport() {
  const g = UI.g, rf = UI.rf, sv = s => `${s.name}${s.gold ? ' (doré)' : ''} ${s.atk}/${s.hp}`;
  return JSON.stringify({
    screen: UI.screen, errors: UI.errors,
    game: g && { room: g.room, level: g.level, counter: g.counter, datacrons: g.datacrons, dungeon: g.dungeon.name, heroes: g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`),
      board: g.board.map(sv), hand: g.hand.map(h => h.kind === 'servant' ? sv(h.s) : h.def.name), boss: `${g.boss.hp}/${g.boss.maxhp}`, bossBoard: g.bossCur + 1,
      bossBoards: g.bossTeams.map((t, i) => ({ active: i === g.bossCur, behavior: I18N.text('fr', 'behavior.' + t.behavior), level: t.level, datacrons: t.datacrons, servants: t.board.map(s => `${sv(s)} R${s.rank}${s.equips.length ? ` +${s.equips.length} équip.` : ''}`) })) },
    reinforcement: rf && { offer: rf.offer && rf.offer.cards.map(c => c.name), reward: rf.reward && rf.reward.cards.map(c => c.name), log: rf.log.slice(-15) },
    combat: UI.pb && { frame: UI.pb.i, total: UI.pb.res.frames.length, done: UI.pb.done, result: UI.pb.res.winner, bossLog: g && g.bossLog.slice(-20) },
    browser: navigator.userAgent
  }, null, 1);
}
const noteError = msg => { UI.errors.push(`${new Date().toLocaleTimeString()} ${msg}`); try { renderDebug(); } catch (e) { /* the panel itself is at fault */ } };
window.addEventListener('error', e => noteError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
window.addEventListener('unhandledrejection', e => noteError(`Promesse rejetée : ${e.reason}`));

// Centered debug window, created only once (input fields keep focus from one render to the next).
// Only the dynamic areas (#dbg-lvl, #dbg-cards, #dbg-list, #dbg-etat, #dbg-msg) are rewritten by renderDebug.
const DBG = { tab: 'actions', filters: { err: true, rf: true, boss: true, combat: true }, q: '', cardQ: '', res: [], msg: null, stick: true };
const DBG_TABS = [['actions', 'Actions'], ['journal', 'Journal'], ['etat', 'État']];
const DBG_FILTERS = [['err', 'Erreurs', 'badge-error'], ['rf', 'Renfort', 'badge-info'], ['boss', 'Boss', 'badge-warning'], ['combat', 'Combat', 'badge-success']];
const dbgBtn = (act, label, extra = '', cls = 'btn-sm') => `<button class="btn ${cls} btn-outline" data-act="${act}" ${extra}>${label}</button>`;
dbg.innerHTML = `<div id="dbg-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3">
    <div class="flex flex-col w-[46rem] max-w-full h-[75vh] max-h-full rounded-box cadre bg-base-200 border border-base-content/20 shadow-2xl">
      <div class="flex items-center gap-2 p-2 border-b border-base-content/15">
        <span class="font-bold px-2">Débogage</span>
        <div role="tablist" class="tabs tabs-boxed bg-base-300 flex-1">${DBG_TABS.map(([k, l]) => `<a role="tab" class="tab" id="dbg-tab-${k}" data-act="dbgTab" data-v="${k}">${l}</a>`).join('')}</div>
        <button class="btn btn-sm btn-ghost" data-act="toggleLog" title="Fermer (Échap)">✕</button></div>
      <div id="dbg-msg" class="px-3 pt-2 text-xs min-h-[1.5rem]"></div>
      <div id="dbg-p-actions" class="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
        <section><h3 class="font-bold mb-1">Partie</h3><div class="flex flex-wrap gap-2">
          ${dbgBtn('dbgReset', 'Recommencer la partie')}${dbgBtn('dbgHeal', 'Soigner les héros')}${dbgBtn('copyReport', 'Copier le rapport')}${dbgBtn('dbgClearErr', 'Effacer les erreurs')}</div></section>
        <section><h3 class="font-bold mb-1">Liens</h3><div class="flex flex-wrap gap-2">
          <a class="btn btn-sm btn-outline" href="../index.html">Accueil (index.html)</a></div></section>
        <section><h3 class="font-bold mb-1">Datacrons <span id="dbg-dc" class="opacity-60 font-normal"></span></h3><div class="flex flex-wrap gap-2 items-center">
          ${['-1', '+1', '+5', '+10'].map(v => dbgBtn('dbgDc', v, `data-v="${v}"`)).join('')}
          <input id="dbg-dc-in" type="number" min="0" class="input input-sm input-bordered w-20" placeholder="n">${dbgBtn('dbgDcSet', 'Fixer')}</div></section>
        <section><h3 class="font-bold mb-1">Niveau de renfort</h3><div id="dbg-lvl" class="join"></div></section>
        <section><h3 class="font-bold mb-1">Ajouter une carte à la main</h3>
          <input id="dbg-card-in" class="input input-sm input-bordered w-full" placeholder="Rechercher un serviteur ou un équipement…" autocomplete="off" spellcheck="false">
          <div id="dbg-cards" class="flex flex-wrap gap-1 mt-2"></div></section></div>
      <div id="dbg-p-journal" class="hidden flex-1 min-h-0 flex flex-col p-3 gap-2 text-xs">
        <div class="flex flex-wrap items-center gap-2">${DBG_FILTERS.map(([k, l, c]) => `<button class="badge badge-lg cursor-pointer" id="dbg-f-${k}" data-act="dbgFilter" data-v="${k}" data-c="${c}">${l}</button>`).join('')}
          <input id="dbg-q" class="input input-xs input-bordered flex-1 min-w-[8rem]" placeholder="Filtrer le texte…" autocomplete="off" spellcheck="false">
          <button class="btn btn-xs btn-ghost" data-act="dbgBottom" title="Aller en bas">⤓ Fin</button></div>
        <div id="dbg-list" class="flex-1 overflow-y-auto rounded-box bg-black/60 p-2 font-mono space-y-0.5"></div></div>
      <div id="dbg-p-etat" class="hidden flex-1 overflow-y-auto p-3 text-xs font-mono"><div id="dbg-etat" class="space-y-0.5"></div></div>
      <div class="flex items-center gap-2 p-2 border-t border-base-content/15">
        <button id="dbg-play" class="btn btn-sm" data-act="dbgPlay" title="Reprendre le jeu">▶ Lecture</button>
        <button id="dbg-pause" class="btn btn-sm" data-act="dbgPause" title="Mettre le jeu en pause">⏸ Pause</button>
        <span id="dbg-state" class="text-xs opacity-70"></span></div></div></div>
  <button data-act="toggleLog" id="dbg-btn" class="fixed left-3 bottom-3 z-40 btn btn-circle btn-lg" title="Mode débogage"></button>`;

// ---------- Command console ----------
const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Looks up a card (servant or equipment) by name: exact first, then prefix, then contains.
function findCard(txt) {
  const q = norm(txt), all = [...SERVANTS.map(d => ({ kind: 'servant', d })), ...EQUIPS.filter(e => !e.token).map(d => ({ kind: 'equip', d }))];
  for (const test of [n => n === q, n => n.startsWith(q), n => n.includes(q)]) {
    const r = all.filter(c => test(norm(c.d.name)));
    if (r.length) return r;
  }
  return [];
}
const needReinforcement = () => { if (UI.screen !== 'renfort' || !UI.g) throw new Error('commande utilisable seulement pendant le renfort'); };
function addToHand(g, c) {
  // Full hand: a third copy of a servant is accepted anyway, since the fusion immediately frees space.
  if (handFull(g) && !(c.kind === 'servant' && copiesOf(g, c.d.name).length >= 2)) throw new Error(`main pleine (${HAND_MAX})`);
  if (c.kind === 'servant') { g.hand.push({ kind: 'servant', s: mkServant(c.d) }); g.stats.servants++; }
  else { g.hand.push({ kind: 'equip', def: c.d }); g.stats.equips++; }
}
// Resets the interface (timers, animations, pending choices) before replacing the game.
function resetUiState() {
  cancelTimer(UI.timer); cancelTimer(UI.timer2);
  Object.assign(UI, { pb: null, hold: null, adapt: [], hideKey: null, dcShown: null, patchShow: null, notice: '', save: null });
}
// Runs a window action: the message (or the error) is displayed under the header.
function dbgRun(fn) {
  try { DBG.msg = { t: fn() || '', err: false }; } catch (e) { DBG.msg = { t: e.message, err: true }; }
  renderDebug();
}
const ACT_DBG = {
  // Opening the window pauses the game; closing it always restarts it.
  toggleLog() { UI.showLog = !UI.showLog; DBG.msg = null; if (UI.showLog) CLOCK.pause(); else CLOCK.resume(); renderDebug(); },
  dbgPlay() { CLOCK.resume(); renderDebug(); },
  dbgPause() { CLOCK.pause(); renderDebug(); },
  dbgTab(d) { DBG.tab = d.v; DBG.stick = true; renderDebug(); },
  dbgFilter(d) { DBG.filters[d.v] = !DBG.filters[d.v]; DBG.stick = true; renderDebug(); },
  dbgBottom() { DBG.stick = true; renderDebug(); },
  dbgClearErr() { UI.errors.length = 0; dbgRun(() => 'Erreurs effacées.'); },
  dbgReset() {
    const g = UI.g; if (!g) return dbgRun(() => { throw new Error('aucune partie en cours'); });
    confirmer('Recommencer toute la partie (mêmes héros, même donjon) ?', () => dbgRun(() => {
      resetUiState(); UI.g = newGame({ dungeon: g.dungeon.id, heroes: g.heroes.map(h => h.def.id), bossExtra: g.bossExtra }); GAME.begin(UI.g); UI.rf = null; drive();
      return 'Partie recommencée.';
    }), { title: 'Recommencer la partie', ok: 'Recommencer' });
  },
  dbgHeal() { dbgRun(() => { needReinforcement(); UI.g.heroes.forEach(h => { h.hp = h.maxhp; }); render(); return 'Héros soignés.'; }); },
  dbgDc(d) { dbgRun(() => { needReinforcement(); UI.g.datacrons = Math.max(0, UI.g.datacrons + parseInt(d.v, 10)); render(); return `Datacrons : ${UI.g.datacrons}.`; }); },
  dbgDcSet() { dbgRun(() => {
    needReinforcement(); const v = parseInt(document.getElementById('dbg-dc-in').value, 10); if (Number.isNaN(v) || v < 0) throw new Error('nombre positif attendu');
    UI.g.datacrons = v; render(); return `Datacrons : ${v}.`;
  }); },
  dbgLevel(d) { dbgRun(() => { needReinforcement(); UI.g.level = +d.v; UI.g.counter = 0; render(); return `Niveau de renfort : ${d.v}.`; }); },
  // Like a purchase: the PR Model is fed, then the triple triggers the fusion (reward to choose).
  dbgGet(d) { dbgRun(() => {
    needReinforcement(); const g = UI.g, rf = UI.rf, c = DBG.res[+d.i], say = m => rf.log.push(m);
    addToHand(g, c); say(`${c.d.name} rejoint ta main (ajout de débogage).`);
    if (c.kind === 'servant') grantPr(g, c.d.types, say);
    const fused = resolveFusion(g, rf, say); serveGainEquip(); render();
    return fused ? `${c.d.name} : triple ! Fusion déclenchée, choisis la récompense.` : `${c.d.name} rejoint la main.`;
  }); }
};
document.getElementById('dbg-card-in').addEventListener('input', e => { DBG.cardQ = e.target.value; renderDebugCards(); });
document.getElementById('dbg-q').addEventListener('input', e => { DBG.q = norm(e.target.value); DBG.stick = true; renderDebug(); });
document.getElementById('dbg-modal').addEventListener('click', e => { if (e.target === e.currentTarget) ACT_DBG.toggleLog(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.showLog) ACT_DBG.toggleLog(); });

function renderDebugCards() {
  const q = DBG.cardQ.trim();
  DBG.res = q ? findCard(q).slice(0, 40) : [];
  document.getElementById('dbg-cards').innerHTML = q && !DBG.res.length ? '<span class="opacity-60 text-xs">Aucune carte.</span>'
    : DBG.res.map((c, i) => `<button class="btn btn-xs ${c.kind === 'servant' ? 'btn-info' : 'btn-secondary'} btn-outline" data-act="dbgGet" data-i="${i}" title="${c.kind === 'servant' ? 'Serviteur' : 'Équipement'}">${esc(c.d.name)}</button>`).join('');
}
// Combat log: our servants' names in blue, the enemies' in red.
// Sides come from the combat frames (each servant carries its side); a name present on both sides is settled by the attacker and the target of the frame.
const esc2 = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function dbgPainter(frames) {
  const sides = new Map(), uids = new Map();
  frames.forEach(f => [...f.p, ...f.e].forEach(s => { uids.set(s.uid, s); (sides.get(s.name) || sides.set(s.name, new Set()).get(s.name)).add(s.side); }));
  const names = [...sides.keys()].sort((a, b) => b.length - a.length);
  if (!names.length) return (t => esc(t));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(esc2).join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  const cls = { p: 'text-sky-400 font-semibold', e: 'text-red-400 font-semibold' };
  return (t, hl = {}) => {
    // Same name on both sides (Sentinel against Sentinel): the occurrences follow each other in the order attacker, target.
    const own = new Map(); [hl.att, hl.tgt].forEach(u => { const s = uids.get(u); if (s) (own.get(s.name) || own.set(s.name, []).get(s.name)).push(s.side); });
    let out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(t))) {
      const set = sides.get(m[1]), q = own.get(m[1]), side = q && q.length ? (q.length > 1 ? q.shift() : q[0]) : set.size === 1 ? [...set][0] : null;
      out += esc(t.slice(last, m.index)) + (side ? `<span class="${cls[side]}">${esc(m[1])}</span>` : esc(m[1])); last = m.index + m[1].length;
    }
    return out + esc(t.slice(last));
  };
}
// Log entries, by category: { k: category, t: text, h: colored text (HTML, optional) }.
function dbgEntries() {
  const g = UI.g, e = [];
  UI.errors.forEach(t => e.push({ k: 'err', t }));
  if (UI.rf) UI.rf.log.forEach(t => e.push({ k: 'rf', t }));
  if (g) g.bossLog.forEach(t => e.push({ k: 'boss', t }));
  if (UI.pb) {
    const frames = UI.pb.res.frames.slice(0, UI.pb.i + 1), paint = dbgPainter(frames);
    if (UI.pb.done) e.push({ k: 'combat', t: UI.pb.res.winner === 'p' ? 'Combat gagné' : UI.pb.res.winner === 'e' ? 'Combat perdu' : 'Égalité' }, ...(UI.pb.lines || []).map(t => ({ k: 'combat', t, h: paint(t) })));
    // Stat gains and losses: each frame is compared with the previous one and "Name [ATK/HP before → ATK/HP after]" is added for each affected servant.
    // Plain HP losses (damage) are already stated by the message and are not listed; a heal, a bonus or a penalty are.
    const cls = { p: 'text-sky-400', e: 'text-red-400' };
    frames.forEach((f, i) => {
      const before = new Map(i ? [...frames[i - 1].p, ...frames[i - 1].e].map(s => [s.uid, s]) : []);
      const ch = [...f.p, ...f.e].filter(s => { const b = before.get(s.uid); return b && (s.atk !== b.atk || s.maxhp !== b.maxhp || s.hp > b.hp); });
      const txt = ch.map(s => { const b = before.get(s.uid); return `${s.name} [${b.atk}/${b.hp} → ${s.atk}/${s.hp}]`; });
      const html = ch.map(s => { const b = before.get(s.uid); return `<span class="${cls[s.side]}">${esc(s.name)}</span> <span class="opacity-80">[${b.atk}/${b.hp} → ${s.atk}/${s.hp}]</span>`; });
      e.push({ k: 'combat', t: f.msg && txt.length ? `${f.msg} ${txt.join(', ')}` : f.msg, h: f.msg && `${paint(f.msg, f.hl)}${html.length ? ` <span class="opacity-60">↳</span> ${html.join(', ')}` : ''}` });
    });
  }
  return e.filter(x => x.t);
}
function dbgState() {
  const g = UI.g, rows = [`Écran : ${UI.screen}`];
  if (g) {
    rows.push(`Salle ${g.room} · renfort niv. ${g.level} (${g.counter}/${levelCost(g.level)}) · ${g.datacrons} Datacron(s)`,
      `Plateau ${g.board.length}/${MAX_BOARD} · main ${handCount(g)}/${HAND_MAX} · types : ${g.types.map(AWGfx.typeName).join(', ')}`,
      `Boss ${g.boss.hp}/${g.boss.maxhp} · ${g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`).join(' · ')}`, '');
    g.bossTeams.forEach((t, i) => rows.push(`Plateau du boss ${i + 1}${i === g.bossCur ? ' (joué)' : ''} : niv. ${t.level}, ${t.board.length} serviteur(s), malus ${t.malus}, comportement ${I18N.text('fr', 'behavior.' + t.behavior)} — ${t.board.map(s => `${s.name} ${s.atk}/${s.hp}`).join(', ') || 'vide'}`));
  }
  if (UI.notice) rows.push('', `Fin de renfort : ${UI.notice}`);
  if (UI.pb) rows.push('', `Combat : image ${UI.pb.i + 1}/${UI.pb.res.frames.length}${UI.pb.done ? ' (terminé)' : ''}`);
  return rows;
}
function renderDebug() {
  const g = UI.g, btn = document.getElementById('dbg-btn'), modal = document.getElementById('dbg-modal');
  btn.className = `fixed left-3 bottom-3 z-40 btn btn-circle btn-lg ${UI.errors.length ? 'btn-error' : UI.showLog ? 'btn-warning' : 'btn-ghost bg-black/50'}`;
  btn.innerHTML = AWGfx.icon('bug', { size: 28, color: UI.showLog ? '#000' : '#cbd5e1' }) + (UI.errors.length ? `<span class="badge badge-sm badge-neutral absolute -top-1 -right-1">${UI.errors.length}</span>` : '');
  modal.classList.toggle('hidden', !UI.showLog);
  if (!UI.showLog) return;
  const pa = CLOCK.paused;
  document.getElementById('dbg-play').className = `btn btn-sm ${pa ? 'btn-outline' : 'btn-success'}`;
  document.getElementById('dbg-pause').className = `btn btn-sm ${pa ? 'btn-warning' : 'btn-outline'}`;
  document.getElementById('dbg-state').textContent = pa ? 'Jeu en pause' : 'Jeu en cours';
  DBG_TABS.forEach(([k]) => { document.getElementById(`dbg-tab-${k}`).classList.toggle('tab-active', DBG.tab === k); document.getElementById(`dbg-p-${k}`).classList.toggle('hidden', DBG.tab !== k); });
  const msg = document.getElementById('dbg-msg');
  msg.className = `px-3 pt-2 text-xs min-h-[1.5rem] ${DBG.msg && DBG.msg.err ? 'text-error' : 'text-success'}`; msg.textContent = DBG.msg ? DBG.msg.t : '';
  if (DBG.tab === 'actions') {
    document.getElementById('dbg-dc').textContent = g ? `(${g.datacrons})` : '';
    document.getElementById('dbg-lvl').innerHTML = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(n => `<button class="btn btn-sm join-item ${g && g.level === n ? 'btn-warning' : 'btn-outline'}" data-act="dbgLevel" data-v="${n}">${n}</button>`).join('');
    renderDebugCards();
  } else if (DBG.tab === 'journal') {
    DBG_FILTERS.forEach(([k, , c]) => { const f = document.getElementById(`dbg-f-${k}`); f.className = `badge badge-lg cursor-pointer ${DBG.filters[k] ? c : 'badge-ghost opacity-50'}`; });
    const list = document.getElementById('dbg-list'), atEnd = DBG.stick || list.scrollTop + list.clientHeight >= list.scrollHeight - 8, top = list.scrollTop;
    const col = { err: 'text-error', rf: 'text-info', boss: 'text-warning', combat: 'text-base-content/80' };
    const rows = dbgEntries().filter(x => DBG.filters[x.k] && (!DBG.q || norm(x.t).includes(DBG.q))).slice(-400);
    list.innerHTML = rows.length ? rows.map(x => `<div class="${col[x.k]}">${x.h || esc(x.t)}</div>`).join('') : '<div class="opacity-60">Rien à afficher.</div>';
    list.scrollTop = atEnd ? list.scrollHeight : top; DBG.stick = false;
  } else document.getElementById('dbg-etat').innerHTML = dbgState().map(r => r ? `<div>${esc(r)}</div>` : '<br>').join('');
}

// Language switch (top right): the choice is kept by I18N between visits. The texts already written in the combat log stay in the language they were written in.
function renderLangSwitch() {
  document.getElementById('lang-switch').innerHTML = I18N.LANGS.map(code => `<button class="btn-achat btn-petit ${code === I18N.lang ? 'btn-or' : ''}" data-act="setLang" data-lang="${code}" aria-pressed="${code === I18N.lang}">${code.toUpperCase()}</button>`).join('');
}
function render() {
  const y = window.scrollY;
  if (UI.screen == null) UI.screen = GAME.setupScreen(0);   // the first step of the setup
  if (!UI.sel) UI.sel = GAME.emptySelection();
  if (UI.screen === 'renfort' && UI.g && UI.rf) flushDiscover(UI.g, UI.rf);
  app.innerHTML = (GAME.setupIndexOf(UI.screen) >= 0 ? renderMenu : { renfort: renderReinforcement, combat: renderCombat, end: renderEnd }[UI.screen])();
  renderLangSwitch();
  renderDebug();
  window.scrollTo(0, y);
  autoSave();
}
// Expedition save: at each stable render of the reinforcement (no animation, no combat in progress). The end of the expedition erases it; the crew profile (PROFILE) is not touched.
function autoSave() {
  if (UI.screen === 'end') { SAVE.clear(); UI.save = null; return; }
  if (UI.screen !== 'renfort' || !UI.g || !UI.rf || UI.rf.rolling || UI.hold || UI.patchShow) return;
  SAVE.save(UI.g, UI.rf);
}
const saveBanner = () => {
  const sv = UI.save;
  if (!sv) return '';
  const del = `<button class="btn-achat btn-petit btn-danger" data-act="deleteSave">${I18N.t('ui.abandon')}</button>`;
  if (!sv.ok) return `<div class="rounded-box cadre border border-error/60 bg-error/10 p-3 mb-4 flex flex-wrap items-center justify-between gap-3"><span class="text-sm">${esc(I18N.t(sv.reason, { detail: sv.detail }))} ${I18N.t('ui.saveUnusable')}</span>${del}</div>`;
  const i = sv.info;
  return `<div class="rounded-box cadre border border-warning/60 bg-warning/10 p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
    <div><div class="font-bold">${I18N.t('ui.saveRunning', { dungeon: esc(localName(i.selections.dungeon[0])), room: i.room })}</div>
      <div class="text-xs opacity-80">${I18N.t('ui.saveInfo', { heroes: i.selections.heroes.map(n => esc(localName(n))).join(I18N.t('ui.and')), level: i.level, date: new Date(i.date).toLocaleString(I18N.t('ui.dateLocale')) })}${sv.dataChanged ? ` · ${I18N.t('ui.saveDataChanged')}` : ''}</div></div>
    <div class="flex gap-2"><button class="btn-achat btn-or px-6 font-bold" data-act="continueSave">${I18N.t('ui.continue')}</button>${del}</div></div>`;
};

// ---------- Flow ----------
// Combat opening: Reyes's cybernetic patch (played at the end of the reinforcement) first, then the combat itself.
function presentCombat() {
  const g = UI.g, rf = UI.rf, p = g.patchFx, t = p && g.board.find(s => s.uid === p.uid);
  g.patchFx = null;
  if (!t) { startCombatUI(); return; }
  // Reyes's cybernetic patch: the bonus is already applied, it is removed for the animation and put back when the lightning arrives.
  // The spark gauge (UI.patchShow) exists only during the animation.
  const apply = sign => { t.atk += sign * p.x; t.hp += sign * p.x; t.maxhp += sign * p.x; };
  apply(-1); UI.patchShow = { hero: p.hero, x: p.x }; rf.rolling = true; render();
  playPatch(p.hero, p.uid, p.x, () => { apply(1); render(); }, () => { UI.patchShow = null; rf.rolling = false; if (UI.rf === rf) startCombatUI(); });
}
function startCombatUI() {
  const res = GAME.out.combat;   // computed by the step "combat" of the flow
  UI.pb = { res, i: 0, speed: 1300, done: false, lines: null, phase: 'hit', lunge: null };
  UI.screen = 'combat'; showFrame();
}
// A combat frame. An attack is played in two steps: the card charges (previous state displayed),
// then the impact (new state displayed, shaking, floating numbers). The other frames have one step only.
function showFrame() {
  cancelTimer(UI.timer); cancelTimer(UI.timer2);
  const pb = UI.pb, f = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  const attack = !!prev && f.hl.att != null;
  if (attack) {
    pb.phase = 'pre'; render(); playLunge(f);
    UI.timer2 = later(() => { pb.phase = 'hit'; render(); playImpact(prev, f); }, pb.speed * 0.4);
  } else {
    pb.phase = 'hit'; render(); if (prev) playImpact(prev, f);
  }
  UI.timer = later(nextFrame, attack ? pb.speed : pb.speed * 0.6);
}
function nextFrame() {
  const pb = UI.pb;
  if (pb.i < pb.res.frames.length - 1) pb.i++;
  if (pb.i >= pb.res.frames.length - 1) finishPb(); else showFrame();
}
function finishPb() {
  const pb = UI.pb; cancelTimer(UI.timer); cancelTimer(UI.timer2);
  pb.i = pb.res.frames.length - 1; pb.phase = 'hit';
  const g = UI.g, hold = { boss: g.boss.hp, heroes: g.heroes.map(h => h.hp) };   // HP from before the hits
  GAME.release(g); GAME.advance(g, flowCtx());   // the flow goes on: settlement, then aftermath (end-of-combat powers, Boss boards), where it waits for the report to be read
  pb.lines = GAME.out.lines;
  const offers = GAME.out.adapt;   // Adaptation choices of the surviving Elk, one by one
  // Adaptation choices are displayed only once the blows have landed on the boss / heroes.
  const end = () => { UI.hold = null; UI.adapt = offers; pb.done = true; render(); };
  if (!pb.res.hits.length) { end(); return; }
  UI.hold = hold; render();
  playHits(pb.res.hits, hold, end);
}
function serveGainEquip() { serveGainEquipFor(UI.g, UI.rf); }   // Relic Hunter's equipment (engine.js)
// The sequence of a game (rooms, reinforcement, combat, report, end) is run by the flow interpreter (flow.js) from the description of the mod (game.json).
// Each call to drive() lets it go on until it must wait (for a choice, for the player, for the combat to be played, for the report to be read),
// then the interface shows what is waiting.
GAME.events.roomStart = () => { UI.rf = { offer: null, reward: null, log: [] }; UI.screen = 'renfort'; };   // a new room: a fresh reinforcement state
const flowCtx = () => ({ rf: () => UI.rf, say: m => { if (UI.rf) UI.rf.log.push(m); } });
function drive() {
  const g = UI.g, r = GAME.advance(g, flowCtx());
  if (GAME.out.notice != null) { UI.notice = GAME.out.notice; GAME.out.notice = null; }   // what the end-of-reinforcement powers say
  if (r.wait === 'choice') { render(); return; }                                          // Hal Ana's prophecy
  if (r.wait === 'actions') { UI.screen = 'renfort'; presentReinforcement(); return; }
  if (r.wait === 'screen' && r.step === 'combat') { presentCombat(); return; }
  if (r.wait === 'end') { STATS.end(g); UI.screen = 'end'; render(); }
}
// What the interface shows when the reinforcement opens: the log of the start of the room, then the animations of its effects (datacube, forge).
function presentReinforcement() {
  const g = UI.g, rf = UI.rf;
  const forged = (g.forgeFx || []).filter(f => g.hand.some(h => h.def === f.def)); g.forgeFx = null;
  const forgeNext = () => {
    const f = forged.shift();
    if (!f) { cubePhase(); return; }
    const i = g.hand.findIndex(h => h.def === f.def), card = g.hand.splice(i, 1)[0];
    rf.rolling = true; render();
    playForge(f.uid, f.def, () => { g.hand.splice(i, 0, card); render(); return `[data-drag="hand"][data-i="${i}"]`; }, () => { rf.rolling = false; if (UI.rf !== rf) return; render(); forgeNext(); });
  };
  const roll = g.cubeRoll, before = g.cubeBefore;
  g.cubeRoll = null;
  const cubePhase = () => {
    if (roll == null) { render(); return; }
    const changed = g.datacrons !== before;
    UI.dcShown = before; rf.rolling = true; render();
    playCube(roll, () => { UI.dcShown = null; rf.rolling = false; if (UI.rf !== rf) return; render(); if (changed) pulseDatacrons(roll > 0); });
  };
  if (forged.length) { forgeNext(); return; }
  if (roll == null) { render(); return; }
  // Datacube: the counter keeps its value until the result arrives, and animates only if the amount really changes.
  const changed = g.datacrons !== before;
  UI.dcShown = before; rf.rolling = true; render();
  playCube(roll, () => { UI.dcShown = null; rf.rolling = false; if (UI.rf !== rf) return; render(); if (changed) pulseDatacrons(roll > 0); });
}

const ACT = {
  // The choices of the setup follow the description (counts, order, going back): game.json, setup.steps.
  selHero(d) { GAME.toggle(UI.sel, 'heroes', d.id); render(); },
  selDungeon(d) { GAME.toggle(UI.sel, 'dungeon', d.id); render(); },
  async setLang(d) { await I18N.setLanguage(d.lang); render(); },
  toHeroes() { const n = GAME.setupNext(UI.sel, GAME.setupIndexOf(UI.screen)); if (n != null) UI.screen = GAME.setupScreen(n); render(); },
  backToDungeon() { const b = GAME.setupBack(GAME.setupIndexOf(UI.screen)); if (b != null) UI.screen = GAME.setupScreen(b); render(); },
  continueSave() {
    const s = SAVE.load();
    if (!s) { UI.save = SAVE.peek(); render(); return; }
    cancelTimer(UI.timer); cancelTimer(UI.timer2);
    UI.g = s.g; UI.rf = s.rf; UI.rf.rolling = false; UI.hideKey = null; UI.notice = ''; UI.screen = 'renfort'; render();
  },
  deleteSave() { confirmer(I18N.t('ui.abandonConfirm'), () => { SAVE.clear(); UI.save = null; render(); }, { title: I18N.t('ui.abandonTitle'), ok: I18N.t('ui.abandon') }); },
  start() {
    const go = () => { UI.g = newGame(UI.sel); GAME.begin(UI.g); UI.rf = null; UI.notice = ''; UI.save = null; STATS.start(UI.g); drive(); };
    if (UI.save) confirmer(I18N.t('ui.newExpeditionConfirm'), go, { title: I18N.t('ui.newExpedition'), ok: I18N.t('ui.launch') }); else go();
  },
  hideChoice() { UI.hideKey = UI.rf && UI.rf.prophecy ? 'prophecy' : UI.rf && UI.rf.reward ? 'reward' : 'adapt'; render(); },
  showChoice() { UI.hideKey = null; render(); },
  pickProphecy(d) {
    UI.hideKey = null;
    const g = UI.g, rf = UI.rf, card = rf.prophecy.cards[+d.i];
    g.prophecy = { card, done: false }; rf.log.push(I18N.t('log.prophecyDiscover', { name: card.name, cost: PROPHECY_COST }));
    rf.prophecy = null; drive();
  },
  copyReport() { navigator.clipboard.writeText(debugReport()).then(() => { DBG.msg = { t: 'Rapport copié.', err: false }; renderDebug(); }, () => gameModal({ title: 'Copie le rapport', html: `<textarea readonly class="textarea textarea-bordered w-full h-48 text-xs font-mono" onfocus="this.select()">${esc(debugReport())}</textarea>`, buttons: [{ label: 'Fermer', cls: 'btn-compact', focus: true }] })); },
  pickAdapt(d) {
    UI.hideKey = null;
    const ad = UI.adapt.shift(), msg = ad && learnCapability(UI.g, ad.uid, ad.options[+d.i]);
    if (msg && UI.pb.lines) UI.pb.lines.push(msg);
    render();
  },
  next() { if (UI.adapt.length) return; UI.notice = ''; GAME.release(UI.g); drive(); },
  // The purchases of the reinforcement are actions declared by the mod (game.json) and run by the flow interpreter (flow.js).
  // A purchase costs Datacrons, paid when the choice opens (no cancellation: no free reroll).
  run(d) { const rf = UI.rf; GAME.run(UI.g, rf, d.action, m => rf.log.push(m)); render(); },
  buyServant() { ACT.run({ action: 'buyServant' }); },
  buyEquipment() { ACT.run({ action: 'buyEquipment' }); },
  buyLevel() { ACT.run({ action: 'buyLevel' }); },
  // Active power of a hero: the button arms the targeting, a click on a board servant applies it.
  useActive(d) { const rf = UI.rf, h = UI.g.heroes[+d.i]; if (!h || (h.used && !ACTIVES[h.def.power.fx].repeat) || h.hp <= 0 || rf.offer || rf.reward || rf.prophecy || rf.rolling) return; rf.targeting = +d.i; render(); },
  cancelActive() { UI.rf.targeting = null; render(); },
  pickActiveTarget(d) {
    const g = UI.g, rf = UI.rf, h = g.heroes[rf.targeting];
    const A = h && ACTIVES[h.def.power.fx], price = A && A.cost ? A.cost(h) : 0;
    if (A && g.datacrons >= price && A.run(g, +d.uid, m => rf.log.push(m), h, rf)) {
      h.used = true;
      if (price) { g.datacrons -= price; g.spent = (g.spent || 0) + price; checkProphecy(g, m => rf.log.push(m)); }
    }
    rf.targeting = null; render();
  },
  pickOffer(d) {
    const g = UI.g, rf = UI.rf, card = rf.offer.cards[+d.i], say = m => rf.log.push(m);
    if (offerKind(rf.offer, +d.i) === 'servant') { g.hand.push({ kind: 'servant', s: mkServant(card) }); g.stats.servants++; say(I18N.t('log.itemJoinsYourHand', { name: card.name })); grantPr(g, card.types, say); }
    else { g.hand.push({ kind: 'equip', def: card }); g.stats.equips++; say(I18N.t('log.itemJoinsYourHand', { name: card.name })); }
    rf.offer = null; resolveFusion(g, rf, say); serveGainEquip(); render();
  },
  pickReward(d) {
    UI.hideKey = null;
    const g = UI.g, rf = UI.rf, say = m => rf.log.push(m), card = rf.reward.cards[+d.i];
    if (rf.reward.kind === 'ally') {   // Assault Soldier: permanent +ATK to the chosen ally
      card.atk += rf.reward.a; say(I18N.t('log.givesAtk', { name: rf.reward.from, amount: rf.reward.a, target: card.name }));
      rf.reward = null; flushDiscover(g, rf); render(); return;
    }
    if (rf.reward.kind === 'equip') {   // discovery of an equipment (Liaison Attaché)
      rf.reward = null; g.stats.equips++;
      if (handFull(g)) say(I18N.t('log.handFullLost', { name: card.name })); else { g.hand.push({ kind: 'equip', def: card }); say(I18N.t('log.itemJoinsYourHand', { name: card.name })); }
      flushDiscover(g, rf); render(); return;
    }
    g.hand.push({ kind: 'servant', s: mkServant(card) }); say(I18N.t('log.itemJoinsYourHand', { name: card.name })); grantPr(g, card.types, say);
    rf.reward = null; resolveFusion(g, rf, say); flushDiscover(g, rf); serveGainEquip(); render();
  },
  // Discard a card from the hand (free, no refund) to free a slot.
  discard(d) {
    const g = UI.g, rf = UI.rf, h = g.hand[+d.i];
    if (!h || rf.offer || rf.reward || rf.prophecy || rf.rolling || (h.kind === 'servant' && isPr(h.s))) return;   // the PR model cannot be discarded
    const name = h.kind === 'servant' ? h.s.name : h.def.name;
    confirmer(I18N.t('ui.discardConfirm', { name }), () => {
      if (g.hand[+d.i] !== h) return;
      g.hand.splice(+d.i, 1); g.stats.discarded++;
      rf.log.push(I18N.t('log.discarded', { name })); render();
    }, { title: I18N.t('ui.discardTitle'), ok: I18N.t('ui.discard') });
  },
  finishReinforcement() {
    const rf = UI.rf;
    if (rf.rolling) return;
    GAME.run(UI.g, rf, 'finish', () => {});   // the action "finish" of the mod ends the interactive step; the flow then runs the end-of-reinforcement powers
    drive();
  },
  // Back to the setup: the first choice is kept, the others start again.
  restart() { cancelTimer(UI.timer); cancelTimer(UI.timer2); const first = GAME.def().setup.steps[0].id, kept = UI.sel[first]; UI.screen = GAME.setupScreen(0); UI.sel = GAME.emptySelection(); UI.sel[first] = kept; UI.save = SAVE.peek(); render(); }
};
Object.assign(ACT, ACT_DBG);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && !b.disabled && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset);
});
// ---------- Drag and drop (reinforcement) ----------
// hand -> board: places a servant (on a card: in front of or behind it, or replaces if the board is full)
// hand -> servant: equips; board -> board: changes the order. An invalid drop does nothing.
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
  if (info.type === 'equip' && !canEquip(UI.g.board[+t.dataset.idx], UI.g.hand[info.i].def)) return;   // no free socket of the right color: the card cannot be dropped
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
  if (rf.offer || rf.reward || rf.prophecy || rf.rolling) return;
  if (info.type === 'equip') {
    if (!card) return;
    const sv = g.board[ti], eq = g.hand[info.i].def;
    if (!applyEquip(sv, eq)) { say(I18N.t('log.noSocket', { item: eq.name, name: sv.name })); render(); return; }
    g.hand.splice(info.i, 1); say(I18N.t('log.equippedOn', { item: eq.name, name: sv.name }));
  } else if (info.from === 'board') {
    const [sv] = g.board.splice(info.i, 1);
    let at = card ? ti + (side === 'r' ? 1 : 0) : g.board.length;
    if (info.i < at) at--;
    g.board.splice(at, 0, sv);
  } else if (g.board.length >= MAX_BOARD) {
    if (card && isPr(g.board[ti])) say(I18N.t('log.prCannotReplace'));
    else if (!card) { say(I18N.t('log.boardFullReplace')); }
    else { confirmer(I18N.t('ui.replaceConfirm', { name: g.board[ti].name }), () => { placeServant(g, info.i, ti, say); serveGainEquip(); render(); }, { title: I18N.t('ui.replaceTitle'), ok: I18N.t('ui.replace') }); return; }
  } else {
    placeServant(g, info.i, null, say);
    if (card) { const sv = g.board.pop(); g.board.splice(ti + (side === 'r' ? 1 : 0), 0, sv); }
  }
  serveGainEquip(); render();
});
// The first render waits for the texts and the power templates (both loaded by fetch, see i18n.js and powers.js).
Promise.all([typeof MOD !== 'undefined' ? MOD.ready : null, I18N.ready, POWERS.ready, CATALOG.ready]).then(() => { UI.save = SAVE.peek(); render(); }).catch(() => { /* a banner already explains the failure */ });
