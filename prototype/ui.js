// Atlas Wanderer — interface: screens, rendering, flow.
'use strict';
// ==== UI ====
const app = document.getElementById('app');
const UI = { screen: null, sel: null, g: null, rf: null, pb: null, timer: null, timer2: null, adapt: [], hideKey: null, dcShown: null, notice: '', showLog: false, errors: [], save: null };   // screen, sel and save are set once the mod is loaded (first render): they depend on its description

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Type pills: species = tinted background, assignment = outline. Icons and colors come from svg.js.
// The engine knows the cards by their French names (logs, saves, equipment lists). localName gives the name in the current language: through the French name -> identifier table,
// The gold card (text fusion.goldName) has a name built by the engine. A name that matches nothing is returned as it is.
// Pattern of a French text with one placeholder, to read a built name backwards.
const frPattern = key => new RegExp('^' + I18N.text('fr', key).replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '(.+)') + '$');
const localName = (() => {
  let byName = null;
  return fr => {
    if (I18N.lang === 'fr' || typeof fr !== 'string') return fr;
    if (!byName) {
      const table = {};
      for (const key of Object.keys(I18N.tables('fr'))) { const m = /^card\.([^.]+)$/.exec(key); if (m) table[I18N.text('fr', key)] = m[1]; }
      if (!Object.keys(table).length) return fr;   // the texts are not loaded yet: do not remember an empty table
      byName = table;
    }
    // Names that the engine builds from a text (gold servant): the French text is read backwards to find the name or the type, then written in the display language.
    const gold = frPattern('fusion.goldName').exec(fr);
    if (gold) return I18N.t('fusion.goldName', { name: localName(gold[1]) });
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
const CARD_H = 'min-h-[calc(var(--card-w)*var(--card-ratio,1.65))]';
const PEEK = 'main-carte relative overflow-hidden h-[calc(var(--card-w)*var(--peek,1.1))]';
const extraOf = o => o.extra ? `<div class="${o.peek ? 'absolute bottom-1 right-1 z-10' : 'mt-1'} flex justify-center gap-1">${o.extra}</div>` : '';
// Compact cards (the boards): the illustration and the numbers only, drawn from ui.cards.compact (the mod). The full card appears over it while the pointer is on it or it has the focus (see showPeek).
// o.compact asks for it; a mod with no compact layout for the category gets the full card. The rings of the callers (selected, target, clickable) become halos that follow the shape of the frame.
const PEEKS = new Map();
const HALO_COLORS = { 'ring-lime-400': '#a3e635', 'ring-warning': 'oklch(var(--wa))', 'ring-error': 'oklch(var(--er))', 'ring-primary': 'oklch(var(--p))' };
// bare: type and level are shown only on the purchase offer (o.offer). In combat (o.combat) no socket is drawn; elsewhere only the empty sockets, closed up at the bottom.
function compactWrap(category, model, full, o, extraClass) {
  const classes = `${o.cls || ''} ${extraClass || ''}`.split(/\s+/).filter(Boolean);
  const halo = classes.filter(c => /^(hover:)?ring-\d$/.test(c)), color = classes.map(c => HALO_COLORS[c]).find(Boolean);
  const rest = classes.filter(c => !/^(hover:)?ring-/.test(c)).join(' '), key = String(PEEKS.size + 1);
  PEEKS.set(key, full);
  const haloClass = !halo.length ? '' : halo.some(c => !c.startsWith('hover:')) ? 'halo' : 'halo-hover';
  return `<div class="carte-compacte w-[var(--board-w)] shrink-0 ${haloClass} ${rest}" ${color ? `style="--halo:${color}"` : ''} tabindex="0" data-peek="${key}" ${o.attrs || ''}>${AWGfx.compactCard(category, model, { width: '100%', sockets: o.sockets, offer: o.offer, bare: o.offer ? false : o.combat ? 'combat' : true })}${extraOf(o)}</div>`;
}
// Under the full card of a servant: a mini card for each equipment held by one of its sockets (its powers, its type on the left, its level on the right and the statistics it grants).
function equipMinis(s) {
  return (s.sockets || []).map((color, i) => {
    const e = (s.slots || [])[i]; if (!e || !e.name) return '';
    const powers = powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true);
    return `<div class="mt-2">${AWGfx.equipMiniCard({ powers, atk: e.atk, hp: e.hp, type: e.type, rank: e.rank }, color, { width: '100%' })}</div>`;
  }).join('');
}
function servantCard(s, o = {}) {
  // A catalog entry (purchase offers, rewards) can carry a list of powers: the first is the skill, the others the additional powers.
  if (Array.isArray(s.skill)) s = { ...s, skill: s.skill[0] || null, extra: s.skill.slice(1) };
  const ring = o.att ? 'ring-4 ring-warning' : o.tgt ? 'ring-4 ring-error' : '';
  // In combat, a lost Shield or an already used Rebirth stay displayed, marked "used".
  const kwSpent = ('shield' in s) ? s.kw.filter(k => (k === 'shield' && !s.shield) || (k === 'rebirth' && !s.reb)) : [];
  // The text of the card is the servant's own: what its equipment gives (keyword, powers, summon bonus) lives in the mini cards of the hover (equipMinis), not here.
  const held = (s.slots || []).filter(Boolean), kwOwn = [...s.kw];
  (s.eqKw || []).forEach(k => { const j = kwOwn.indexOf(k); if (j >= 0) kwOwn.splice(j, 1); });
  const sumA = s.summonA - held.reduce((n, e) => n + ((e.mod && e.mod.summonA) || 0), 0), sumH = s.summonH - held.reduce((n, e) => n + ((e.mod && e.mod.summonH) || 0), 0);
  const powers = powersOf(kwOwn, skillsOf({ ...s, eqSkills: [] }), sumA || sumH ? { a: sumA, h: sumH } : null, kwSpent, false, s);
  const sh = powers.find(p => p.key === 'shield');
  if (sh && s.shield > 1) sh.count = s.shield;   // a multi-hit Shield shows the remaining hits
  if (o.compact && AWGfx.hasCompact('servant')) return compactWrap('servant', { ...s, kwSpent, powers }, () => servantCard(s, { cls: '!w-full' }) + equipMinis(s), o, ring);
  const art = AWGfx.servantCard({ ...s, kwSpent, powers }, { width: '100%', sockets: o.sockets });
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${ring} ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${art}${extraOf(o)}</div>`;
}
function equipCard(e, o = {}) {
  const powers = powersOf(e.kw ? [e.kw] : [], [].concat(e.skill || []).map(k => ({ ...k })), e.mod ? { a: e.mod.summonA, h: e.mod.summonH } : null, [], true);   // true: texts "desc.<fx>.equipment" (the carrier instead of "itself")
  if (o.compact && AWGfx.hasCompact('equipment')) return compactWrap('equipment', { ...e, powers }, () => equipCard(e, { cls: '!w-full' }), o);
  return `<div class="${CARD_W} shrink-0 rounded-2xl ${o.peek ? PEEK : ''} ${o.cls || ''}" ${o.attrs || ''}>${AWGfx.equipCard({ ...e, powers }, { width: '100%' })}${extraOf(o)}</div>`;
}
// Heroes: portrait cards, identical to the starting choice, with their current HP.
const heroProps = (def, hp, maxhp, patch) => ({ patch, id: def.id, name: def.name, types: def.types, hp, maxhp, kw: def.kw, powerText: def.power ? skDesc(def.power, false, def) : '', powerKind: def.power ? TRIG_KIND[def.power.t] : 'renfort' });
// rf: in reinforcement, a hero's active power becomes a button under their card (once per reinforcement, free).
// A hero card. UI.hold (end of combat) holds the HP from before the hits, for the time of the animation.
// Progress of the promised cards still on their way (game.json, promises): the card, what has been spent toward its delivery, the hero who promised it.
const promiseBadges = g => (g.promises || []).filter(p => !p.done).map(p => {
  const rule = promiseRule(p.power), cost = GAME.number(rule.deliver.spent), hero = g.heroes.find(h => h.def.power && h.def.power.fx === p.power);
  return `<span class="badge badge-lg badge-outline" title="${esc(hero ? hero.def.name : '')}">${esc(p.card.name)} ${Math.min((g.spent || {})[rule.deliver.resource] || 0, cost)}/${cost} ◈</span>`;
}).join('');
const heroSlot = (g, rf, i) => {
  const h = g.heroes[i], hp = UI.hold ? UI.hold.heroes[i] : h.hp;
  const active = !!h.def.power && GAME.is(h.def.power, 'active'), A = active && ACTIVES[h.def.power.fx], armed = rf && rf.targeting === i, price = active && A.cost ? A.cost(h) : 0, used = active && activeSpent(h, A), ok = rf && active && h.hp > 0 && !used && GAME.val(g, 'money') >= price && !rf.offer && !rf.reward && !rf.rolling && [...g[Z.field], ...g[Z.reserve].filter(x => x.kind === 'servant').map(x => x.s)].some(s => A.ok(g, s));
  const btn = rf && active ? `<button class="btn-achat btn-compact w-full mt-1 px-3 flex items-center justify-center gap-2 font-bold" data-act="${armed ? 'cancelActive' : 'useActive'}" data-i="${i}" ${ok || armed ? '' : 'disabled'}>${AWGfx.icon(A.icon, { size: 22, color: ok || armed ? A.color : '#94a3b8' })}${armed ? I18N.t('ui.pickServantCancel') : used ? I18N.t('ui.powerUsed') : I18N.t(A.label) + (price ? ` (${price} ◈)` : '')}</button>` : '';
  return `<div class="w-[calc(var(--card-w)*var(--last-w,2))] min-w-[15rem]" data-hero="${i}"><div class="rounded-2xl">${AWGfx.heroCard(heroProps(h.def, hp, h.maxhp, UI.patchShow && UI.patchShow.hero === i ? UI.patchShow.x : 0), { width: '100%' })}</div>${btn}</div>`;
};
// ---------- Screens ----------
// ---------- Screens ----------
// A screen is drawn from its description in game.json (ui.screens.<name>.nodes, assembled by prototype/ui-kit.js); UI.screen is the name of the screen.
// Choice form (Amber, fusion reward, Adaptation): placed exactly between the two boards, on a nebula background.
// mystic: extra moving smoke (Amber). "Hide" shrinks it into a "Show the choice" button to see the boards.
const choiceOverlay = (key, inner, o = {}) => UI.hideKey === key
  ? `<button class="btn-achat btn-petit choix-rappel" data-act="showChoice" data-key="${key}">${I18N.t('ui.showChoice')}</button>`
  : `<div class="choix-calque ${o.mystic ? 'choix-mystique' : ''} ${o.w || 'max-w-4xl'}"><div class="choix-fond"></div>${o.mystic ? '<div class="fumee"><i></i><i></i><i></i><i></i><i></i></div>' : ''}
    <div class="relative z-10 p-4 pb-11">${inner}</div><button class="btn-achat btn-petit choix-masquer" data-act="hideChoice" data-key="${key}">${I18N.t('ui.hide')}</button></div>`;
// Hand: in reinforcement the cards have their buttons, in combat it is displayed alone.
function handHtml(g, rf, full) {
  const busy = rf && (rf.offer || rf.reward || rf.promise || rf.rolling);
  const discard = i => `<button class="btn-achat btn-petit btn-danger btn-jeter" data-act="discard" data-i="${i}" ${busy ? 'disabled' : ''} title="${I18N.t('ui.discardCard')}">${AWGfx.icon('trash', { size: 18, color: '#fecaca' })}</button>`;
  const drag = i => rf && !busy ? { compact: true, peek: !full, cls: 'cursor-grab select-none', attrs: `draggable="true" data-drag="${Z.reserve}" data-i="${i}"`, extra: g[Z.reserve][i].kind === 'servant' && isCompanion(g[Z.reserve][i].s) ? '' : discard(i) } : { compact: true, peek: !full, extra: '' };
  // Targeting of an active power: the servants in the hand are targets like those on the board.
  const A = rf && rf.targeting != null && ACTIVES[g.heroes[rf.targeting].def.power.fx];
  if (A) return g[Z.reserve].map(h => h.kind !== 'servant' ? equipCard(h.def, { compact: true, peek: !full, cls: 'opacity-40' })
    : servantCard(h.s, { compact: true, peek: !full, ...(A.ok(g, h.s) ? { cls: 'cursor-pointer ring-2 ring-lime-400 hover:ring-4', attrs: `data-act="pickActiveTarget" data-uid="${h.s.uid}"` } : { cls: 'opacity-40' }) })).join('');
  // An empty socket was clicked: the equipment of the hand that fits (the engine says: canEquip) is lit and equips on a click, the others fade.
  const pickSv = UI.equipPick && rf && !busy ? g[Z.field].find(x => x.uid === UI.equipPick.uid) : null;
  const forPick = (h, i) => (canEquip(pickSv, h.def) ? { compact: true, peek: !full, cls: 'cursor-pointer ring-2 ring-lime-400 hover:ring-4', attrs: `data-act="equipPick" data-i="${i}"` } : { compact: true, peek: !full, cls: 'opacity-40' });
  return g[Z.reserve].map((h, i) => h.kind === 'servant' ? servantCard(h.s, drag(i)) : equipCard(h.def, pickSv ? forPick(h, i) : drag(i))).join('');
}
const handSection = (g, rf, full) => `<div ${rf ? 'data-drop="hand"' : ''} class="hand-block flex flex-wrap justify-center gap-2 mt-3 ${full ? '' : 'box-content p-2 rounded-box border border-white/40 bg-white/10'} ${full ? CARD_H : 'min-h-[calc(var(--card-w)*var(--peek,1.1))]'}">${handHtml(g, rf, full)}</div>`;
// Type of an offered card (old saves have a single `kind` for the whole offer).
// ---------- Widgets of the screens (described in game.json, ui.screens; assembled by prototype/ui-kit.js) ----------
// The collections that a catalog widget can show, and how each category of card is drawn as a choice.
const COLLECTIONS = { hero: () => Object.values(HEROES), dungeon: () => Object.values(DUNGEONS).filter(d => !d.locked) };
const CARD_VIEWS = {
  // Clickable card; once chosen, the "Select" button appears in the card and leads to the next step.
  dungeon: (d, on, p) => `
    <div data-act="${p.act}" data-id="${d.id}" class="relative rounded-2xl cursor-pointer transition hover:-translate-y-0.5 ${on ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.dungeonCard(d, { width: '100%', selected: on })}
      ${on ? `<div class="absolute left-0 top-0 h-full w-[37.5%] flex items-end justify-center pb-[6%] pointer-events-none"><button class="btn-achat btn-or px-4 text-base shadow-lg pointer-events-auto flex items-center gap-2 font-bold" data-act="${p.next}">${AWGfx.icon('btnDoor', { size: 22, color: '#1a1304' })}${I18N.t('ui.explore')}</button></div>` : ''}</div>`,
  hero: (h, on, p) => `
    <button data-act="${p.act}" data-id="${h.id}" class="w-full rounded-2xl text-left transition hover:-translate-y-0.5 ${on ? '' : 'opacity-80 hover:opacity-100'}">
      ${AWGfx.heroCard(heroProps(h, h.hp), { width: '100%', selected: on })}</button>`
};
const chosen = (step, id) => (Array.isArray(UI.sel[step]) ? UI.sel[step].includes(id) : UI.sel[step] === id);
UIKIT.define('saveBanner', () => (GAME.setupIndexOf(UI.screen) === 0 ? saveBanner() : ''));
UIKIT.define('catalogGrid', p => COLLECTIONS[p.category]().map(item => CARD_VIEWS[p.category](item, chosen(p.step, item.id), p)).join(''));
// The dungeon a "subject" widget talks about: the one chosen at a setup step (source = step id), or the one being played (source = "game").
// boss: the total of the bars of the bosses (name, hit points, maximum) and the boss that faces the player (game) for the widgets that talk about the Boss.
const subjectOf = p => {
  const g = UI.g;
  if (p.source !== 'game') { const d = DUNGEONS[UI.sel[p.source]]; return { d, boss: { name: d.name, hp: d.totalHp, maxhp: d.totalHp }, hp: d.totalHp, max: d.totalHp }; }
  // The fight: the bar of the Boss facing the player (not the total of the dungeon). During the blows (UI.hold) the board that took them, even if the flow has moved on.
  const idx = UI.hold && UI.hold.bossIdx != null ? UI.hold.bossIdx : g.bossCur, team = g.bossTeams[idx];
  const own = p.facing && team && team.bossMax != null;
  return { d: g.dungeon, boss: g.boss, hp: own ? (UI.hold ? UI.hold.boss : team.bossHp) : UI.hold ? UI.hold.bossTotal : g.boss.hp, max: own ? team.bossMax : g.boss.maxhp, extra: g.bossExtra, facing: team && team.boss };
};
// A frame bordered with the colour of the dungeon's type; marker: an attribute the animations look for (written first).
UIKIT.define('subjectFrame', p => { const { d } = subjectOf(p); return `<div${p.marker ? ` ${p.marker}` : ''} class="${p.class}" style="border-color:${AWGfx.typeColor(d.types[0])}88;background:#151a26">${UIKIT.render(p.children || [])}</div>`; });
// The card of the dungeon: with the current hit points of the Boss when it is the one being played; marker: an attribute the animations look for (written first).
UIKIT.define('dungeonCard', p => { const { d, hp, max, extra, facing } = subjectOf(p), teams = p.source === 'game' ? UI.g.bossTeams : null; return `<div${p.marker ? ` ${p.marker}` : ''}>${AWGfx.dungeonCard(d, { width: '100%', hp, max, extra, span: p.span, boss: p.facing ? facing : null, bosses: teams && teams.map(t => ({ types: t.boss && t.boss.types, defeated: t.defeated })) })}</div>`; });   // facing: shows the Boss facing the player instead of the dungeon label (the fight)
UIKIT.define('subjectScene', p => AWGfx.dungeonScene(subjectOf(p).d, { width: '100%' }));
UIKIT.define('subjectName', p => { const { d, facing } = subjectOf(p); return esc(p.field === 'boss' && facing ? AWGfx.cardName(facing) : AWGfx.cardName(d)); });   // field boss: the boss that faces the player
UIKIT.define('subjectHp', p => { const { boss, hp } = subjectOf(p); return `<span class="${p.class}">${AWGfx.icon('heart', { size: p.iconSize, color: '#000' })}${p.max ? `${hp}/${boss.maxhp}` : hp}</span>`; });
UIKIT.define('subjectHpBar', p => { const { boss, hp } = subjectOf(p); return `<progress class="${p.class}" value="${hp}" max="${boss.maxhp}"></progress>`; });
UIKIT.define('subjectType', p => subjectOf(p).d.types.map(AWGfx.typeChipSvg).join(''));
UIKIT.define('subjectText', p => { const { facing } = subjectOf(p); return facing ? esc(AWGfx.text('boss.' + facing.id + '.desc', facing.desc)) : ''; });   // the power of the boss that faces the player
// The types of the chosen heroes, updated at each choice (the dungeon adds none; a random one is drawn when the game starts).
UIKIT.define('typeChips', () => { const types = [...new Set((UI.sel.heroes || []).flatMap(i => HEROES[i].types).filter(Boolean))]; return types.map(AWGfx.typeChipSvg).join(''); });
// A button that runs an interface action. enabled: a named condition of the interface; lead: a fixed sign before the icon.
UIKIT.define('button', p => {
  const ok = p.enabled === 'setupComplete' ? GAME.setupComplete(UI.sel) : true;
  return `<button class="${p.class}" data-act="${p.act}"${p.enabled ? ` ${ok ? '' : 'disabled'}` : ''}>${p.lead ? `<span aria-hidden="true">${esc(p.lead)}</span>` : ''}${p.icon ? AWGfx.icon(p.icon.name, { size: p.icon.size, color: p.icon.color }) : ''}${I18N.t(p.label)}</button>`;
});
// End of the game.
// The end of the game (victory or defeat): a title, then the Boss that was faced, the heroes as they stand, the final board and a summary table.
UIKIT.define('endTitle', () => {
  const g = UI.g, win = g.over === 'win', n = GAME.val(g, 'turn') - 1;
  return `<header class="end-title ${win ? 'end-win' : 'end-lose'}"><span class="eyebrow">${I18N.t(win ? 'ui.endEyebrowWin' : 'ui.endEyebrowLose')}</span>
    <h1>${I18N.t(win ? 'ui.victory' : 'ui.defeat')}</h1>
    ${win ? '' : `<p>${I18N.t('ui.endLose', { n })}</p>`}</header>`;
});
// The sentence of the result alone (the end screens of the other mods use it).
UIKIT.define('endText', () => { const g = UI.g, win = g.over === 'win'; return `<p class="py-4">${win ? I18N.t('ui.endWin', { dungeon: esc(AWGfx.cardName(g.dungeon)), n: GAME.val(g, 'turn') - 1 }) : I18N.t('ui.endLose', { n: GAME.val(g, 'turn') - 1 })}</p>`; });
// The Boss of the dungeon, with a stamp when it has been defeated (its hit points are then 0).
UIKIT.define('endBoss', () => {
  const g = UI.g, win = g.over === 'win';
  return `<div class="end-boss-card">${AWGfx.dungeonCard(g.dungeon, { width: '100%', hp: g.boss.hp, max: g.boss.maxhp, extra: g.bossExtra })}${win ? `<span class="end-stamp">${I18N.t('ui.endDefeated')}</span>` : ''}</div>`;
});
// The board as it stands at the end, in compact cards (the full card and the equipment appear on hover).
UIKIT.define('endBoard', () => {
  const g = UI.g;
  return g[Z.field].length ? g[Z.field].map(sv => servantCard(sv, { compact: true, combat: true, cls: 'select-none' })).join('') : `<div class="opacity-50 text-sm p-6">${I18N.t('ui.empty')}</div>`;
});
// The summary: three big figures (rooms, reinforcement level, Boss) then a table of lines.
UIKIT.define('endTable', () => {
  const g = UI.g, win = g.over === 'win', S = g.stats, rows = [['ui.endEarned', S.earned], ['ui.endLeft', GAME.val(g, 'money')], ['ui.endServants', S.servants], ['ui.endEquips', S.equips], ['ui.endContrib', S.contrib], ['ui.endFusions', S.fusions], ['ui.endDiscarded', S.discarded]];
  const tile = (label, value, cls = '') => `<div class="end-tile ${cls}"><span>${I18N.t(label)}</span><b>${value}</b></div>`;
  return `<div class="end-tiles">${tile('ui.statRooms', STAT_VALUES.roomsPlayed(g))}${tile('ui.statLevel', STAT_VALUES.level(g))}${win ? tile('ui.statBossHp', I18N.t('ui.endDefeated'), 'end-tile-win') : tile('ui.statBossHp', g.boss.hp, 'end-tile-lose')}</div>
    <div class="end-lines">${rows.map(([label, v]) => `<div class="end-line"><span>${I18N.t(label)}</span><i></i><b>${v}</b></div>`).join('')}</div>`;
});
const STAT_VALUES = { roomsPlayed: g => GAME.val(g, 'turn') - 1, level: g => GAME.val(g, 'level'), bossHp: g => g.boss.hp };
UIKIT.define('stat', p => `<div class="stat"><div class="stat-title">${I18N.t(p.label)}</div><div class="stat-value">${STAT_VALUES[p.value](UI.g)}</div></div>`);
UIKIT.define('endStats', () => { const g = UI.g; return `<div class="text-sm opacity-80 mb-4">${I18N.t('ui.endStats', { earned: g.stats.earned, left: GAME.val(g, 'money'), servants: g.stats.servants, equips: g.stats.equips, contrib: g.stats.contrib, fusions: g.stats.fusions, discarded: g.stats.discarded })}</div>`; });

// ---- Reinforcement and combat screens
// Background of the Boss board: the colour of the type of the boss that faces the player (no scenery drawing).
UIKIT.define('sceneDecor', () => { const g = UI.g, t = g.bossTeams[g.bossCur], type = (t && t.boss && t.boss.types[0]) || g.dungeon.types[0]; return `<div class="decor" style="--decor:${AWGfx.typeColor(type)}"></div>`; });
// The offer of the reinforcement.
UIKIT.define('offerRow', () => {
  const g = UI.g, rf = UI.rf;
  // dragToBoard (game.json, choices.offer): the cards of the offer can also be dragged straight onto the board (or onto a servant to replace it, or to equip it).
  // dragToHand: the same cards can be dragged onto the hand only (the usual delivery, by a gesture that also works with a finger).
  const dragAttr = i => (GAME.def().choices.offer.dragToBoard || GAME.def().choices.offer.dragToHand ? ` draggable="true" data-drag="offer" data-i="${i}"` : '');
  const offerCards = rf.offer ? rf.offer.cards.map((d, i) => offerKind(rf.offer, i) === 'servant'
    ? servantCard({ ...d, maxhp: d.hp, equips: [] }, { compact: true, offer: true, cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"${dragAttr(i)}` })
    : equipCard(d, { compact: true, offer: true, cls: 'cursor-pointer hover:ring-2 hover:ring-primary', attrs: `data-act="pickOffer" data-i="${i}"${dragAttr(i)}` })).join('') : '';
  return offerCards;
});
// The sockets of a servant on the board are buttons during the reinforcement (a click on an empty one starts equipping, on a full one shows what it holds).
const socketsOf = sv => (UI.screen === 'room' && UI.rf && !(UI.rf.offer || UI.rf.reward || UI.rf.promise || UI.rf.rolling) ? { act: 'socket', selected: UI.equipPick && UI.equipPick.uid === sv.uid ? UI.equipPick.socket : null } : null);
// The player's board during the reinforcement: reorderable by drag, or targets of an active power.
UIKIT.define('boardRow', () => {
  const g = UI.g, rf = UI.rf;
  // While choosing the target of an active power, the board stays reorderable (drag) while the click designates the target.
  const board = g[Z.field].map((sv, i) => {
    const drag = `draggable="true" data-drag="${Z.field}" data-drop="card" data-uid="${sv.uid}" data-idx="${i}"`;
    if (rf.targeting == null) return servantCard(sv, { compact: true, cls: 'select-none cursor-grab', attrs: drag, sockets: socketsOf(sv) });
    return ACTIVES[g.heroes[rf.targeting].def.power.fx].ok(g, sv)
      ? servantCard(sv, { compact: true, cls: 'select-none cursor-pointer ring-2 ring-lime-400 hover:ring-4', attrs: `${drag} data-act="pickActiveTarget"` })
      : servantCard(sv, { compact: true, cls: 'select-none opacity-40', attrs: drag });
  }).join('');
  return board;
});
// The choices that cover the boards: the reward and the promised card during the reinforcement, the Adaptation choice during the report.
UIKIT.define('choiceOverlays', () => {
  const g = UI.g, rf = UI.rf;
  if (UI.screen === 'room') {
  // A reward (a choice of game.json whose cards come from the engine): its texts and the way its cards are drawn come from the description of the choice.
  const rewardRule = rf.reward && GAME.def().choices[rf.reward.choice];
  const REWARD_CARDS = {
    servant: (d, i) => servantCard({ ...d, maxhp: d.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` }),
    equipment: (d, i) => equipCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` }),
    servantOnBoard: (d, i) => servantCard(d, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickReward" data-i="${i}"` })
  };
  const reward = rf.reward ? choiceOverlay('reward', `
    <h3 class="font-bold text-lg mb-1">${I18N.t(rewardRule.title, { rank: rf.reward.rank, from: rf.reward.from ? localName(rf.reward.from) : '', a: rf.reward.a })}</h3>
    <p class="text-sm opacity-70 mb-3">${I18N.t(rewardRule.subtitle)}</p>
    <div class="flex flex-wrap gap-2 justify-center">${rf.reward.cards.map((d, i) => REWARD_CARDS[rewardRule.cards || rf.reward.category](d, i)).join('')}</div>`) : '';
  // A promised card (game.json, promises): the texts of the choice come from the description.
  const promiseRuleNow = rf.promise && promiseRule(rf.promise.power);
  const promise = rf.promise ? choiceOverlay('promise', `
    <h3 class="font-bold text-lg mb-1">${I18N.t(promiseRuleNow.texts.title, { rank: GAME.number(promiseRuleNow.choose.rank) })}</h3>
    <p class="text-sm opacity-70 mb-3">${I18N.t(promiseRuleNow.texts.when, { cost: GAME.number(promiseRuleNow.deliver.spent) })}</p>
    <div class="flex flex-wrap gap-2 justify-center">${rf.promise.cards.map((c, k) => servantCard({ ...c, maxhp: c.hp, equips: [] }, { cls: 'cursor-pointer hover:ring-2 hover:ring-warning', attrs: `data-act="pickPromise" data-i="${k}"` })).join('')}</div>`, { mystic: true }) : '';
    return `${reward}${promise}`;
  }
  // Adaptation: a surviving Elk chooses an ability among those of the other survivors (or learns nothing).
  const ad = UI.adapt[0], elk = ad && g[Z.field].find(x => x.uid === ad.uid);
  const adapt = ad && elk ? choiceOverlay('adapt', `
    <h3 class="font-bold text-lg mb-1">${I18N.t('ui.adaptation', { name: esc(localName(ad.name)) })}</h3>
    <p class="text-sm opacity-70 mb-3">${I18N.t('ui.adaptationHelp')}</p>
    <div class="flex gap-4 items-start flex-wrap justify-center">
      <div class="w-40 shrink-0">${servantCard(elk, {})}</div>
      <div class="flex-1 min-w-[14rem] grid gap-2">${ad.options.map((c, i) => `<button class="btn-achat text-left px-3 py-2 flex flex-col items-start" data-act="pickAdapt" data-i="${i}"><span class="font-bold ${c.stat ? 'text-success' : c.kw ? 'text-info' : 'text-warning'}">${esc(capLabel(c))}</span><span class="text-xs opacity-70">${c.stat ? I18N.t('ui.permanentBonus') : I18N.t('ui.fromCard', { name: esc(localName(c.from)) })}</span></button>`).join('')}${ad.skippable ? `<button class="btn btn-ghost btn-sm justify-self-start" data-act="skipAdapt">${I18N.t('ui.adaptationSkip')}</button>` : ''}</div>
    </div>`, { w: 'max-w-3xl' }) : '';
  return adapt;
});
UIKIT.define('handSection', p => handSection(UI.g, p.interactive ? UI.rf : null));
UIKIT.define('heroSlot', p => heroSlot(UI.g, p.interactive ? UI.rf : null, p.index));
// Top row of the console: the level with its progress, the full hand, the money (same display in combat). The resources are named by the properties of the widget;
// their icon, symbol and title come from the description of the game.
UIKIT.define('consoleHead', p => {
  // Every part is optional: a game with no money, no reinforcement level or no hand just leaves the property out of the widget.
  const g = UI.g, R = GAME.def().state.resources, hand = GAME.number(GAME.def().state.zones[GAME.zone('reserve')].max) > 0;
  let levelHtml = '', moneyHtml = '';
  if (p.level) {
    const level = g[p.level], progress = p.progress ? g[p.progress] : 0, cost = p.progress ? levelCost(level) : 0, maxed = level >= GAME.number(R[p.level].max);
    levelHtml = `<div class="flex flex-1 items-center gap-3" title="${maxed ? I18N.t('ui.levelMax') : I18N.t('ui.levelProgress', { missing: cost - progress, next: level + 1 })}">
          ${AWGfx.icon(R[p.level].icon, { size: 38, color: '#B9A8FF' })}
          <span class="font-black text-3xl leading-none" style="color:#B9A8FF">${level}</span>
          ${maxed || !p.progress ? (maxed ? '<span class="text-xs uppercase tracking-[.2em] text-violet-300/60 pr-1">max</span>' : '') : `<div class="barre-crantee !pl-0">${Array.from({ length: cost }, (_, i) => `<i class="${i < progress ? 'on' : ''}"></i>`).join('')}</div>`}</div>`;
  }
  if (p.money) {
    const money = UI.dcShown != null ? UI.dcShown : g[p.money];   // during the roll of the die the counter keeps its previous value until the die lands
    moneyHtml = `<span class="text-3xl font-black leading-none text-warning" style="text-shadow:0 0 14px rgba(245,197,66,.6)" title="${I18N.t(R[p.money].title)}" data-resource="${p.money}">${money} ${R[p.money].symbol}</span>`;
  }
  // Bar version (the header of the console block): the level icon and number at the far left, the progress as horizontal chevrons, the money at the far right.
  if (p.bar) {
    const level = p.level ? g[p.level] : 0, progress = p.progress ? g[p.progress] : 0, cost = p.progress ? levelCost(level) : 0, maxed = p.level && level >= GAME.number(R[p.level].max);
    const money = p.money ? (UI.dcShown != null ? UI.dcShown : g[p.money]) : null;
    // The level and the Datacrons are two tabs set into the border of the block (top left and top right): the level number with the progress chevrons (lit = reached), the Datacrons with their symbol.
    const tabLevel = p.level ? `<div class="console-tag console-tag-level" title="${maxed ? I18N.t('ui.levelMax') : I18N.t('ui.levelProgress', { missing: cost - progress, next: level + 1 })}"><span class="console-level lvl-num">${level}</span>
        ${maxed ? '<span class="text-[.65rem] uppercase tracking-[.2em] text-violet-300/70">max</span>' : cost ? `<div class="chevrons" aria-hidden="true">${Array.from({ length: cost }, (_, i) => `<i class="${i < progress ? 'on' : ''}"></i>`).join('')}</div>` : ''}</div>` : '';
    const tabMoney = money == null ? '' : `<div class="console-tag console-tag-money" title="${I18N.t(R[p.money].title)}"><span class="console-money"><span data-resource="${p.money}">${money}</span><span>${R[p.money].symbol}</span></span></div>`;
    return `${tabLevel}${tabMoney}${hand && handFull(g) ? `<div class="console-bar"><span class="badge badge-warning badge-sm">${I18N.t('ui.handFull')}</span></div>` : ''}`;
  }
  // Stacked version (the console of the last row): the progress notches stand upright along the left border, then the level (its number above its icon) and the Datacrons
  // (their icon above the count). The notches of the row version collapsed to nothing here, the column giving them no width.
  if (p.stack && p.level) {
    const level = g[p.level], progress = p.progress ? g[p.progress] : 0, cost = p.progress ? levelCost(level) : 0, maxed = level >= GAME.number(R[p.level].max);
    const gauge = !maxed && cost ? `<div class="jauge-niveau" aria-hidden="true">${Array.from({ length: cost }, (_, i) => cost - 1 - i).map(i => `<i class="${i < progress ? 'on' : ''}"></i>`).join('')}</div>` : '';
    const money = p.money ? (UI.dcShown != null ? UI.dcShown : g[p.money]) : null;
    return `<div class="flex items-stretch gap-4 self-stretch">${gauge}
      <div class="flex flex-col items-center justify-center gap-1" title="${maxed ? I18N.t('ui.levelMax') : I18N.t('ui.levelProgress', { missing: cost - progress, next: level + 1 })}">
        <span class="font-black text-3xl leading-none" style="color:#B9A8FF">${level}</span>${AWGfx.icon(R[p.level].icon, { size: 38, color: '#B9A8FF' })}${maxed ? `<span class="text-[.65rem] uppercase tracking-[.2em] text-violet-300/60">max</span>` : ''}</div>
      ${money == null ? '' : `<div class="flex flex-col items-center justify-center gap-1 text-warning" title="${I18N.t(R[p.money].title)}"><span class="text-3xl leading-none" style="text-shadow:0 0 14px rgba(245,197,66,.6)">${R[p.money].symbol}</span><span class="font-black text-3xl leading-none" style="text-shadow:0 0 14px rgba(245,197,66,.6)" data-resource="${p.money}">${money}</span></div>`}
      ${hand && handFull(g) ? `<span class="badge badge-warning badge-sm self-center">${I18N.t('ui.handFull')}</span>` : ''}</div>`;
  }
  const full = hand && handFull(g);
  if (!levelHtml && !moneyHtml && !full) return '';
  return `<div class="${p.stack ? 'flex flex-col justify-around [&>*]:flex-none' : 'flex items-center justify-between gap-3'}">${levelHtml}${full ? `<span class="badge badge-warning badge-sm">${I18N.t('ui.handFull')}</span>` : ''}${moneyHtml}</div>`;
});
// While a card is being chosen (an offer, a reward, a discovery) nothing else can be bought: the console says what is going on (a servant or an equipment).
UIKIT.define('consoleStatus', () => {
  const rf = UI.rf, kind = rf && (rf.offer ? offerKind(rf.offer, 0) : rf.reward && rf.reward.category);
  return kind === 'servant' || kind === 'equipment' ? `<div class="console-status" role="status"><i aria-hidden="true"></i>${I18N.t(kind === 'servant' ? 'ui.choosingServant' : 'ui.choosingEquipment')}</div>` : '';
});
// The purchases of the reinforcement (or the end of the step when everything is spent).
// The purchases of the reinforcement, or the way out when everything is spent (the action p.exit of the description, offered when its "offerWhen" holds and nothing is open).
UIKIT.define('consoleActions', p => {
  const g = UI.g, rf = UI.rf, exit = GAME.action(p.exit), R = GAME.def().state.resources;
  const busy = GAME.holds({ choiceOpen: 'any' }, g, rf);
  if (!busy && (exit.offerWhen || []).every(pr => GAME.holds(pr, g, rf))) return `<button class="${p.exitClass}" data-act="${p.exitAct}">${AWGfx.icon(exit.icon, { size: p.exitIcon.size, color: p.exitIcon.color })}${I18N.t(exit.label)}</button>`;
  return p.actions.filter(id => id !== p.exit).map(id => {
    const a = GAME.action(id), opened = GAME.opens(id), ok = GAME.canRun(g, rf, id), price = GAME.price(id), res = R[Object.keys(a.cost || {})[0]];
    const atMax = !!a.labelAtMax && g[a.labelAtMax.resource] >= GAME.number(R[a.labelAtMax.resource].max);   // the action has nothing left to do: another label, no price
    if (p.tabs) { const name = atMax ? I18N.t(a.labelAtMax.text) : I18N.t(a.label), tip = `${name}${atMax ? '' : ` : ${price} ${res ? res.symbol : ''}`}`; return `<button class="console-tab ${rf.offer && opened && opened.params.kind === offerKind(rf.offer, 0) ? 'on' : ''}" data-act="run" data-action="${id}" ${ok ? '' : 'disabled'} title="${esc(rf.offer && ok && opened ? I18N.t('ui.newOfferTitle') : tip)}" aria-label="${esc(tip)}">${AWGfx.icon(a.icon, { size: 28, color: ok ? (a.iconColor || '#7dd3fc') : '#94a3b8' })}<span class="tip"><span>${name}</span>${atMax ? '' : `<b>${price} ${res ? res.symbol : ''}</b>`}</span></button>`; }
    return `<button class="btn-achat btn-compact !min-h-[2rem] min-w-0 px-2 py-0.5 flex items-center justify-between gap-2 text-[.72rem] leading-tight font-bold whitespace-nowrap ${rf.offer && opened && opened.params.kind === offerKind(rf.offer, 0) ? 'ring-2 ring-primary' : ''}" data-act="run" data-action="${id}" ${ok ? '' : 'disabled'} ${rf.offer && ok && opened ? `title="${I18N.t('ui.newOfferTitle')}"` : ''}><span class="flex items-center gap-1.5">${AWGfx.icon(a.icon, { size: 20, color: ok ? (a.iconColor || '#7dd3fc') : '#94a3b8' })}<span>${atMax ? I18N.t(a.labelAtMax.text) : I18N.t(a.label)}</span></span>${atMax ? '' : `<span class="font-black text-warning whitespace-nowrap text-sm">${price} ${res ? res.symbol : ''}</span>`}</button>`;
  }).join('');
});
// During the combat: no control during the animation, only the end button appears once the combat is over, in place of the purchases.
UIKIT.define('consoleNext', p => {
  const g = UI.g;
  return UI.pb.done ? `<button class="${p.class}" data-act="${p.act}" ${UI.adapt.length ? 'disabled' : ''}>${g.over ? I18N.t(p.endLabel) : `${AWGfx.icon(p.icon.name, { size: p.icon.size, color: p.icon.color })}${I18N.t(p.label)}`}</button>` : '';
});
// One side of the combat frame being shown.
UIKIT.define('frameRow', p => {
  const g = UI.g, pb = UI.pb, cur = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  // Before the impact of an attack, the previous state is still shown (the charge is played on these cards).
  const f = pb.phase === 'pre' && prev ? { p: prev.p, e: prev.e, hl: cur.hl } : cur;
  const row = list => list.length ? list.map(s => servantCard(s, { compact: true, combat: true, att: f.hl.att === s.uid, tgt: f.hl.tgt === s.uid, attrs: `data-uid="${s.uid}"` })).join('') : `<div class="opacity-50 text-sm p-6">${I18N.t('ui.empty')}</div>`;
  return row(p.side === 'boss' ? f.e : f.p);
});

const renderScreen = () => UIKIT.render(GAME.def().ui.screens[UI.screen].nodes);


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
    game: g && { room: GAME.val(g, 'turn'), level: GAME.val(g, 'level'), counter: GAME.val(g, 'progress'), datacrons: GAME.val(g, 'money'), dungeon: g.dungeon.name, heroes: g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`),
      board: g[Z.field].map(sv), hand: g[Z.reserve].map(h => h.kind === 'servant' ? sv(h.s) : h.def.name), boss: `${g.boss.hp}/${g.boss.maxhp}`, bossBoard: g.bossCur + 1,
      bossBoards: g.bossTeams.map((t, i) => ({ boss: t.boss && t.boss.name, defeated: !!t.defeated, bossHp: `${t.bossHp}/${t.bossMax}`, active: i === g.bossCur, behavior: I18N.text('fr', 'behavior.' + t.behavior), level: GAME.val(t, 'level'), datacrons: GAME.val(t, 'money'), servants: t[Z.field].map(s => `${sv(s)} R${s.rank}${s.equips.length ? ` +${s.equips.length} équip.` : ''}`) })) },
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
  const q = norm(txt), all = [...SERVANTS.filter(d => !d.token).map(d => ({ kind: 'servant', d })), ...EQUIPS.filter(e => !e.token).map(d => ({ kind: 'equip', d }))];
  for (const test of [n => n === q, n => n.startsWith(q), n => n.includes(q)]) {
    const r = all.filter(c => test(norm(c.d.name)));
    if (r.length) return r;
  }
  return [];
}
const needReinforcement = () => { if (UI.screen !== 'room' || !UI.g) throw new Error('commande utilisable seulement pendant le renfort'); };
function addToHand(g, c) {
  // Full hand: a third copy of a servant is accepted anyway, since the fusion immediately frees space.
  if (handFull(g) && !(c.kind === 'servant' && copiesOf(g, c.d.name).length >= 2)) throw new Error(`main pleine (${HAND_MAX})`);
  if (c.kind === 'servant') { g[Z.reserve].push({ kind: 'servant', s: mkServant(c.d) }); g.stats.servants++; }
  else { g[Z.reserve].push({ kind: 'equip', def: c.d }); g.stats.equips++; }
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
      resetUiState(); UI.g = newGame({ dungeon: g.dungeon.id, heroes: g.heroes.map(h => h.def.id), drawnTypes: g.drawnTypes, bosses: g.bossIds }); GAME.begin(UI.g); UI.rf = null; drive();
      return 'Partie recommencée.';
    }), { title: 'Recommencer la partie', ok: 'Recommencer' });
  },
  dbgHeal() { dbgRun(() => { needReinforcement(); UI.g.heroes.forEach(h => { h.hp = h.maxhp; }); render(); return 'Héros soignés.'; }); },
  dbgDc(d) { dbgRun(() => { needReinforcement(); if (!GAME.hasRole('money')) return 'Ce jeu n\'a pas de monnaie.'; GAME.add(UI.g, 'money', 0); UI.g[GAME.roleId('money')] = Math.max(0, GAME.val(UI.g, 'money') + parseInt(d.v, 10)); render(); return `Datacrons : ${GAME.val(UI.g, 'money')}.`; }); },
  dbgDcSet() { dbgRun(() => {
    needReinforcement(); if (!GAME.hasRole('money')) return 'Ce jeu n\'a pas de monnaie.'; const v = parseInt(document.getElementById('dbg-dc-in').value, 10); if (Number.isNaN(v) || v < 0) throw new Error('nombre positif attendu');
    UI.g[GAME.roleId('money')] = v; render(); return `Datacrons : ${v}.`;
  }); },
  dbgLevel(d) { dbgRun(() => { needReinforcement(); if (!GAME.hasRole('level')) return 'Ce jeu n\'a pas de niveau de renfort.'; UI.g[GAME.roleId('level')] = +d.v; UI.g[GAME.roleId('progress')] = 0; render(); return `Niveau de renfort : ${d.v}.`; }); },
  // Like a purchase: the PR Model is fed, then the triple triggers the fusion (reward to choose).
  dbgGet(d) { dbgRun(() => {
    needReinforcement(); const g = UI.g, rf = UI.rf, c = DBG.res[+d.i], say = m => rf.log.push(m);
    addToHand(g, c); say(I18N.t('log.debugAdded', { name: c.d.name }));
    if (c.kind === 'servant') grantCompanion(g, c.d.types, say);
    const fused = resolveFusion(g, rf, say); serveOwedEquipment(); render();
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
    rows.push(`Salle ${GAME.val(g, 'turn')} · renfort niv. ${GAME.val(g, 'level')} (${GAME.val(g, 'progress')}/${levelCost(GAME.val(g, 'level'))}) · ${GAME.val(g, 'money')} Datacron(s)`,
      `Plateau ${g[Z.field].length}/${MAX_BOARD} · main ${handCount(g)}/${HAND_MAX} · types : ${g.types.map(AWGfx.typeName).join(', ')}`,
      `Boss ${g.boss.hp}/${g.boss.maxhp} · ${g.heroes.map(h => `${h.def.name} ${h.hp}/${h.maxhp}`).join(' · ')}`, '');
    g.bossTeams.forEach((t, i) => rows.push(`Plateau du boss ${i + 1}${t.boss ? ` (${t.boss.name}, ${t.bossHp}/${t.bossMax} PV${t.defeated ? ', vaincu' : ''})` : ''}${i === g.bossCur ? ' (joué)' : ''} : niv. ${GAME.val(t, 'level')}, ${t[Z.field].length} serviteur(s), malus ${t.malus}, comportement ${I18N.text('fr', 'behavior.' + t.behavior)} — ${t[Z.field].map(s => `${s.name} ${s.atk}/${s.hp}`).join(', ') || 'vide'}`));
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
    document.getElementById('dbg-dc').textContent = g ? `(${GAME.val(g, 'money')})` : '';
    document.getElementById('dbg-lvl').innerHTML = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(n => `<button class="btn btn-sm join-item ${g && GAME.val(g, 'level') === n ? 'btn-warning' : 'btn-outline'}" data-act="dbgLevel" data-v="${n}">${n}</button>`).join('');
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

// Game menu (top right): one button that opens a panel with the home link, the journal, the effect groups, the sound and the language. The choice of language is kept by I18N between visits. The texts already written in the combat log stay in the language they were written in.
function renderLangSwitch() {
  const T = k => I18N.t(k), row = (attrs, label, on) => `<button class="menu-row" ${attrs}${on == null ? '' : ` aria-pressed="${on}"`}>${label}</button>`;
  // The sound row only appears in a mod that has sounds (game.json, ui.sounds: at least one name with a file).
  const hasSound = Object.entries(GAME.def().ui.sounds || {}).some(([k, f]) => k !== 'note' && f),
    sound = hasSound ? row('data-act="toggleSound"', T(FX.muted ? 'ui.soundOff' : 'ui.soundOn'), !FX.muted) : '';
  const journal = JOURNAL.rules().length ? row('data-act="toggleJournal"', T('ui.journalTitle'), !!UI.journalOpen) : '';
  const fxGroups = Object.entries(GAME.def().ui.effectGroups || {}).filter(([k]) => k !== 'note').map(([k, gd]) => row(`data-act="toggleFxGroup" data-group="${k}"`, esc(T(gd.label)), FX.groupOn(k))).join('');
  const back = `<a class="menu-row" href="../index.html">${T('ui.backToSite')}</a>`;   // the game saves by itself at every screen: leaving loses nothing
  const langs = `<div class="menu-lang"><span>${T('ui.menuLanguage')}</span>${I18N.LANGS.map(code => `<button class="btn-achat btn-petit ${code === I18N.lang ? 'btn-or' : ''}" data-act="setLang" data-lang="${code}" aria-pressed="${code === I18N.lang}">${code.toUpperCase()}</button>`).join('')}</div>`;
  const open = !!UI.menuOpen;
  document.getElementById('lang-switch').innerHTML = `<button class="btn-achat btn-petit ${open ? 'btn-suite' : ''}" data-act="toggleMenu" aria-expanded="${open}" aria-haspopup="true" aria-label="${T('ui.menu')}" title="${T('ui.menu')}">☰</button>`
    + (open ? `<div class="menu-panel" role="menu">${back}${journal}${fxGroups}${sound}${langs}</div>` : '');
}
function render() {
  const y = window.scrollY;
  if (UI.screen == null) UI.screen = GAME.setupScreen(0);   // the first step of the setup
  if (typeof document !== 'undefined' && GAME.def().ui.theme.title) document.title = I18N.t(GAME.def().ui.theme.title);   // the title of the page is the mod's
  if (!UI.sel) UI.sel = GAME.emptySelection();
  if (UI.screen === 'room' && UI.g && UI.rf) { settleReinforcement(UI.g, m => UI.rf.log.push(m)); flushDiscover(UI.g, UI.rf); }
  PEEKS.clear();
  app.innerHTML = renderScreen() + journalPanel();
  renderLangSwitch();
  renderDebug();
  flushEffects();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { const c = document.querySelector('[data-peek]:hover'); if (c) showPeek(c); else hidePeek(); });   // the cards were redrawn under the pointer
  window.scrollTo(0, y);
  autoSave();
}
// The journal (📜): what happened, line by line, built from the events (prototype/journal.js). In a combat it grows with the playback; in the reinforcement it follows the room.
// A line can be clicked: the cards it concerns pulse, and once the combat is over the display goes back to that moment.
const JOURNAL_LINES = 80;
function journalLines() {
  if (UI.screen === 'playback' && UI.pb) return JOURNAL.ofCombat(UI.pb.res.frames, UI.pb.i);
  if (UI.screen === 'room') return (UI.roomJournal || []).flatMap(j => JOURNAL.entries(j.events, uid => j.names.get(uid)));
  return [];
}
function journalPanel() {
  if (!UI.journalOpen || !JOURNAL.rules().length || (UI.screen !== 'room' && UI.screen !== 'playback')) return '';
  const lines = journalLines().slice(-JOURNAL_LINES), back = UI.screen === 'playback' && UI.pb && UI.pb.done;
  return `<aside class="fixed right-2 bottom-14 z-50 w-[22rem] max-w-[92vw] rounded-box border border-base-content/20 bg-black/85 text-xs shadow-xl" aria-label="${I18N.t('ui.journalTitle')}">
    <div class="flex items-center justify-between px-3 py-2 border-b border-base-content/15"><b>${I18N.t('ui.journalTitle')}</b><span class="opacity-60">${back ? I18N.t('ui.journalBack') : ''}</span>
      <button class="btn-achat btn-petit" data-act="toggleJournal" aria-label="${I18N.t('ui.hide')}">×</button></div>
    <div id="journal-list" class="max-h-[50vh] overflow-y-auto p-2 grid gap-1">${lines.length ? lines.map(l => `<button class="text-left rounded px-2 py-1 hover:bg-white/10" data-act="journalFocus" data-uids="${l.uids.join(',')}"${l.frame != null && back ? ` data-frame="${l.frame}"` : ''}>
      <span style="color:${l.color}">●</span> ${esc(l.text)}${l.cause ? ` <span class="opacity-60">${esc(l.cause)}</span>` : ''}</button>`).join('') : `<p class="opacity-60 px-2">${I18N.t('ui.journalEmpty')}</p>`}</div></aside>`;
}
// The events of the reinforcement (a card placed, equipped, a fusion, the start of the room…) are shown once the screen has been redrawn with their result: the effects of the
// mod (game.json, ui.effects) find the cards by their identifier. Out of the reinforcement, nobody looks at them. They also feed the journal of the room.
function flushEffects() {
  const events = EVENTS.take();
  if (!events.length || UI.screen !== 'room' || !UI.g) return;
  const names = new Map([...UI.g[Z.field], ...UI.g[Z.reserve].filter(h => h.kind === 'servant').map(h => h.s)].map(s => [s.uid, s.name]));
  (UI.roomJournal = UI.roomJournal || []).push({ events, names });
  later(() => FX.play(events, 'impact', { speed: 1300, name: uid => names.get(uid) }), 0);
}
// Expedition save: at each stable render of the reinforcement (no animation, no combat in progress). The end of the expedition erases it; the crew profile (PROFILE) is not touched.
function autoSave() {
  if (UI.screen === 'endScreen') { SAVE.clear(); UI.save = null; return; }
  if (UI.screen !== 'room' || !UI.g || !UI.rf || UI.rf.rolling || UI.hold || UI.patchShow) return;
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
// Combat opening: the stat granted at the end of the reinforcement (cue statGranted) is shown first, then the combat itself.
function presentCombat() {
  const g = UI.g, rf = UI.rf, p = takeCues(g, 'statGranted')[0], t = p && g[Z.field].find(s => s.uid === p.uid);
  if (!t) { startCombatUI(); return; }
  // The bonus is already applied: it is removed for the animation and put back when the lightning arrives. The hero's gauge (UI.patchShow) exists only during the animation.
  const apply = sign => { t.atk += sign * p.amount; t.hp += sign * p.amount; t.maxhp += sign * p.amount; };
  apply(-1); UI.patchShow = { hero: p.hero, x: p.amount }; rf.rolling = true; render();
  playAnimation('statGranted', p.hero, p.uid, p.amount, () => { apply(1); render(); }, () => { UI.patchShow = null; rf.rolling = false; if (UI.rf === rf) startCombatUI(); });
}
function startCombatUI() {
  const res = GAME.out.combat;   // computed by the step "combat" of the flow
  UI.pb = { res, i: 0, speed: 1300, done: false, lines: null, phase: 'hit', lunge: null };
  UI.screen = 'playback'; showFrame();
}
// A combat frame. An attack is played in two steps: the card charges (previous state displayed),
// then the impact (new state displayed, shaking, floating numbers). The other frames have one step only.
function showFrame() {
  cancelTimer(UI.timer); cancelTimer(UI.timer2);
  const pb = UI.pb, f = pb.res.frames[pb.i], prev = pb.res.frames[pb.i - 1];
  const attack = !!prev && f.hl.att != null;
  if (attack) {
    pb.phase = 'pre'; render(); FX.play(f.events, 'pre', effectView(f));
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
  const g = UI.g, hold = { boss: (g.bossTeams[g.bossCur] || {}).bossHp, bossIdx: g.bossCur, bossTotal: g.boss.hp, heroes: g.heroes.map(h => h.hp) };   // HP from before the hits
  GAME.release(g); GAME.advance(g, flowCtx());   // the flow goes on: settlement, then aftermath (end-of-combat powers, Boss boards), where it waits for the report to be read
  pb.lines = GAME.out.lines;
  const offers = GAME.out.adapt;   // Adaptation choices of the surviving Elk, one by one
  // Adaptation choices are displayed only once the blows have landed on the boss / heroes.
  const end = () => { UI.hold = null; UI.adapt = offers; pb.done = true; render(); };
  if (!pb.res.hits.length) { end(); return; }
  UI.hold = hold; render();
  playHits(pb.res.hits, hold, end);
}
function serveOwedEquipment() { serveOwedEquipmentFor(UI.g, UI.rf); }   // Relic Hunter's equipment (engine.js)
// The sequence of a game (rooms, reinforcement, combat, report, end) is run by the flow interpreter (flow.js) from the description of the mod (game.json).
// Each call to drive() lets it go on until it must wait (for a choice, for the player, for the combat to be played, for the report to be read),
// then the interface shows what is waiting.
GAME.events.roomStart = g => { UI.rf = { offer: null, reward: null, log: [] }; UI.screen = 'room'; UI.roomJournal = []; if (g) EVENTS.emit('roomStarted', { room: GAME.val(g, 'turn') }); };   // a new room: a fresh reinforcement state
const flowCtx = () => ({ rf: () => UI.rf, say: m => { if (UI.rf) UI.rf.log.push(m); } });
function drive() {
  const g = UI.g, r = GAME.advance(g, flowCtx());
  if (GAME.out.notice != null) { UI.notice = GAME.out.notice; GAME.out.notice = null; }   // what the end-of-reinforcement powers say
  if (r.wait === 'choice') { render(); return; }                                          // a promised card to choose (Amber)
  if (r.wait === 'actions') { UI.screen = 'room'; presentReinforcement(); return; }
  if (r.wait === 'screen' && r.step === 'combat') { presentCombat(); return; }
  if (r.wait === 'end') { STATS.end(g); UI.screen = 'endScreen'; render(); }
}
// The cues (g.cues) of an event, taken out of the list. The animation that shows each event is the one the mod chose (game.json, ui.animations).
const takeCues = (g, event) => { const mine = (g.cues || []).filter(c => c.event === event); g.cues = (g.cues || []).filter(c => c.event !== event); return mine; };
const playAnimation = (event, ...args) => CUE_ANIMATIONS[GAME.def().ui.animations[event]](...args);
// What the interface shows when the reinforcement opens: the log of the start of the room, then the animations of its effects (datacube, forge).
function presentReinforcement() {
  const g = UI.g, rf = UI.rf;
  const forged = takeCues(g, 'cardCreated').filter(f => g[Z.reserve].some(h => h.def === f.def));   // cards created at the start of the room, shown one by one
  const forgeNext = () => {
    const f = forged.shift();
    if (!f) { cubePhase(); return; }
    const i = g[Z.reserve].findIndex(h => h.def === f.def), card = g[Z.reserve].splice(i, 1)[0];
    rf.rolling = true; render();
    playAnimation('cardCreated', f.uid, f.def, () => { g[Z.reserve].splice(i, 0, card); render(); return `[data-drag="${Z.reserve}"][data-i="${i}"]`; }, () => { rf.rolling = false; if (UI.rf !== rf) return; render(); forgeNext(); });
  };
  const draw = g.lastDraw, roll = draw && draw.value, before = draw && draw.before, bag = draw && GAME.def().bags[draw.bag];   // a draw from a bag at the start of the room (game.json, bags)
  g.lastDraw = null;
  const cubePhase = () => {
    if (roll == null) { render(); return; }
    const changed = GAME.val(g, 'money') !== before;
    UI.dcShown = before; rf.rolling = true; render();
    playDraw(bag, roll, () => { UI.dcShown = null; rf.rolling = false; if (UI.rf !== rf) return; render(); if (changed) pulseDatacrons(roll > 0); });
  };
  if (forged.length) { forgeNext(); return; }
  if (roll == null) { render(); return; }
  // A draw from a bag: the counter keeps its value until the result arrives, and animates only if the amount really changes.
  const changed = GAME.val(g, 'money') !== before;
  UI.dcShown = before; rf.rolling = true; render();
  playDraw(bag, roll, () => { UI.dcShown = null; rf.rolling = false; if (UI.rf !== rf) return; render(); if (changed) pulseDatacrons(roll > 0); });
}

const ACT = {
  // A socket of a servant on the board. Empty: the equipment of the hand that fits is lit (a second click cancels). Full: shows the equipment it holds (there is no rule to take it off).
  socket(d, el) {
    const g = UI.g, rf = UI.rf, card = el && el.closest('[data-idx]'), sv = g && card && g[Z.field][+card.dataset.idx], i = +d.socket;
    if (!sv || !rf) return;
    const held = (sv.slots || [])[i];
    if (held) { const r = card.getBoundingClientRect(); UI.equipPick = null; render(); peekEquipment(held, r); return; }
    if (UI.equipPick && UI.equipPick.uid === sv.uid && UI.equipPick.socket === i) { UI.equipPick = null; render(); return; }
    if (!g[Z.reserve].some(h => h.kind !== 'servant' && canEquip(sv, h.def))) { rf.log.push(I18N.t('log.noEquipForSocket', { name: sv.name })); UI.equipPick = null; render(); return; }
    UI.equipPick = { uid: sv.uid, socket: i }; render();
  },
  // The equipment chosen for the socket: the same way as dropping it on the servant.
  equipPick(d) {
    const g = UI.g, rf = UI.rf, say = m => rf.log.push(m), pk = UI.equipPick, sv = pk && g[Z.field].find(x => x.uid === pk.uid), i = +d.i, eq = g[Z.reserve][i] && g[Z.reserve][i].def;
    UI.equipPick = null;
    if (!sv || !eq) return render();
    if (!equipWithEvents(g, sv, eq, say)) { say(I18N.t('log.noSocket', { item: eq.name, name: sv.name })); return render(); }
    g[Z.reserve].splice(i, 1); say(I18N.t('log.equippedOn', { item: eq.name, name: sv.name })); serveOwedEquipment(); render();
  },
  // The choices of the setup follow the description (counts, order, going back): game.json, setup.steps.
  selHero(d) { GAME.toggle(UI.sel, 'heroes', d.id); render(); },
  selDungeon(d) { GAME.toggle(UI.sel, 'dungeon', d.id); render(); },
  async setLang(d) { await I18N.setLanguage(d.lang); render(); },
  toggleMenu() { UI.menuOpen = !UI.menuOpen; render(); },
  toggleSound() { FX.setMuted(!FX.muted); render(); },
  toggleJournal() { UI.journalOpen = !UI.journalOpen; render(); const l = document.getElementById('journal-list'); if (l) l.scrollTop = l.scrollHeight; },
  journalFocus(d) {
    if (d.frame != null && UI.pb && UI.pb.done) { cancelTimer(UI.timer); cancelTimer(UI.timer2); UI.pb.i = +d.frame; UI.pb.phase = 'hit'; render(); }   // back to that moment of the combat
    String(d.uids || '').split(',').filter(Boolean).forEach(uid => FX.PRIMS.pulse({ target: 'card', color: '#ffd45e' }, { card: +uid }, { speed: UI.pb ? UI.pb.speed : 1300 }));
  },
  toggleFxGroup(d) { FX.setGroup(d.group, !FX.groupOn(d.group)); render(); },
  toHeroes() { const n = GAME.setupNext(UI.sel, GAME.setupIndexOf(UI.screen)); if (n != null) UI.screen = GAME.setupScreen(n); render(); },
  backToDungeon() { const b = GAME.setupBack(GAME.setupIndexOf(UI.screen)); if (b != null) UI.screen = GAME.setupScreen(b); render(); },
  continueSave() {
    const s = SAVE.load();
    if (!s) { UI.save = SAVE.peek(); render(); return; }
    cancelTimer(UI.timer); cancelTimer(UI.timer2);
    UI.g = s.g; UI.rf = s.rf; UI.rf.rolling = false; UI.hideKey = null; UI.notice = ''; UI.screen = 'room'; render();
  },
  deleteSave() { confirmer(I18N.t('ui.abandonConfirm'), () => { SAVE.clear(); UI.save = null; render(); }, { title: I18N.t('ui.abandonTitle'), ok: I18N.t('ui.abandon') }); },
  start() {
    const go = () => { UI.g = newGame(UI.sel); GAME.begin(UI.g); UI.rf = null; UI.notice = ''; UI.save = null; STATS.start(UI.g); drive(); };
    if (UI.save) confirmer(I18N.t('ui.newExpeditionConfirm'), go, { title: I18N.t('ui.newExpedition'), ok: I18N.t('ui.launch') }); else go();
  },
  hideChoice(d) { UI.hideKey = d.key; render(); },   // the button names its own choice (reward, promise, adapt): two choices can be open together
  showChoice() { UI.hideKey = null; render(); },
  pickPromise(d) {
    UI.hideKey = null;
    const g = UI.g, rf = UI.rf, rule = promiseRule(rf.promise.power), card = rf.promise.cards[+d.i];
    (g.promises = g.promises || []).push({ power: rf.promise.power, card, done: false });
    const hero = g.heroes.find(h => h.def.power && h.def.power.fx === rf.promise.power);   // the hero whose power promised the card
    rf.log.push(I18N.t(rule.texts.discovered, { hero: hero ? hero.def.name : '', name: card.name, cost: GAME.number(rule.deliver.spent) }));
    rf.promise = null; drive();
  },
  copyReport() { navigator.clipboard.writeText(debugReport()).then(() => { DBG.msg = { t: 'Rapport copié.', err: false }; renderDebug(); }, () => gameModal({ title: 'Copie le rapport', html: `<textarea readonly class="textarea textarea-bordered w-full h-48 text-xs font-mono" onfocus="this.select()">${esc(debugReport())}</textarea>`, buttons: [{ label: 'Fermer', cls: 'btn-compact', focus: true }] })); },
  pickAdapt(d) {
    UI.hideKey = null;
    const ad = UI.adapt.shift(), msg = ad && learnCapability(UI.g, ad.uid, ad.options[+d.i]);
    if (msg && UI.pb.lines) UI.pb.lines.push(msg);
    render();
  },
  // Waiting: the Elk keeps its use for a later combat; its other pending choices of this combat are dropped too.
  skipAdapt() { UI.hideKey = null; const ad = UI.adapt[0]; if (ad) UI.adapt = UI.adapt.filter(o => o.uid !== ad.uid); render(); },
  next() { if (UI.adapt.length) return; UI.notice = ''; GAME.release(UI.g); drive(); },
  // The purchases of the reinforcement are actions declared by the mod (game.json) and run by the flow interpreter (flow.js).
  // A purchase costs Datacrons, paid when the choice opens (no cancellation: no free reroll).
  run(d) { const rf = UI.rf; GAME.run(UI.g, rf, d.action, m => rf.log.push(m)); render(); },
  buyServant() { ACT.run({ action: 'buyServant' }); },
  buyEquipment() { ACT.run({ action: 'buyEquipment' }); },
  buyLevel() { ACT.run({ action: 'buyLevel' }); },
  // Active power of a hero: the button arms the targeting, a click on a board servant applies it.
  useActive(d) { const rf = UI.rf, h = UI.g.heroes[+d.i]; if (!h || activeSpent(h, ACTIVES[h.def.power.fx]) || h.hp <= 0 || rf.offer || rf.reward || rf.promise || rf.rolling) return; rf.targeting = +d.i; render(); },
  cancelActive() { UI.rf.targeting = null; render(); },
  pickActiveTarget(d) {
    const g = UI.g, rf = UI.rf, h = g.heroes[rf.targeting];
    const A = h && ACTIVES[h.def.power.fx], price = A && A.cost ? A.cost(h) : 0;
    if (A && GAME.val(g, 'money') >= price && A.run(g, +d.uid, m => rf.log.push(m), h, rf)) {
      h.used = true; h.uses = (h.uses || 0) + 1;   // the uses are counted for every active power (cost step, limit per game)
      if (price) GAME.pay(g, GAME.roleId('money'), price, m => rf.log.push(m));   // the cost is paid like any other (it counts toward the promised cards)
    }
    rf.targeting = null; render();
  },
  pickOffer(d) {
    const g = UI.g, rf = UI.rf, say = m => rf.log.push(m);
    const done = takeOffer(g, rf, +d.i, say, null);   // the engine delivers the card where the choice says (hand or board)
    if (done === 'full') { say(I18N.t('log.dragToReplace')); render(); return; }
    serveOwedEquipment(); if (GAME.def().choices.offer.endsStep) drive(); else render();
  },
  pickReward(d) {
    UI.hideKey = null;
    const g = UI.g, rf = UI.rf;
    resolveReward(g, rf, +d.i, m => rf.log.push(m));   // the engine applies what the choice says (game.json); the next queued choice then opens
    flushDiscover(g, rf); render();
  },
  // Discard a card from the hand (free, no refund) to free a slot.
  discard(d) {
    const g = UI.g, rf = UI.rf, h = g[Z.reserve][+d.i];
    if (!h || rf.offer || rf.reward || rf.promise || rf.rolling || (h.kind === 'servant' && isCompanion(h.s))) return;   // the PR model cannot be discarded
    const name = h.kind === 'servant' ? h.s.name : h.def.name;
    confirmer(I18N.t('ui.discardConfirm', { name }), () => {
      if (g[Z.reserve][+d.i] !== h) return;
      g[Z.reserve].splice(+d.i, 1); g.stats.discarded++; EVENTS.emit('cardDiscarded', { name, kind: h.kind });
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
  if (b && !b.disabled && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset, b);
});
// The menu closes on a click outside it or on Escape.
document.addEventListener('click', e => { if (UI.menuOpen && !e.target.closest('#lang-switch')) { UI.menuOpen = false; render(); } }, true);   // capture phase: measured before a click on the menu redraws it
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.menuOpen && !document.getElementById('game-modal')) { UI.menuOpen = false; render(); } });
// The sockets are buttons: Enter or Space presses them; Escape cancels an equipping in progress.
document.addEventListener('keydown', e => {
  const s = e.target.closest && e.target.closest('.aw-socket');
  if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); s.dispatchEvent(new window.Event('click', { bubbles: true })); }
  else if (e.key === 'Escape' && UI.equipPick) { UI.equipPick = null; render(); }
});
// The full card over a compact card: while the pointer is on it or it has the keyboard focus. One fixed box, without effect on the layout, kept inside the window.
let peekKey = null;
function hidePeek() { const b = document.getElementById('carte-pleine'); if (b) b.remove(); peekKey = null; }
function showPeek(el) {
  const build = PEEKS.get(el.dataset.peek); if (!build) { hidePeek(); return; }
  let box = document.getElementById('carte-pleine');
  if (!box) { box = document.createElement('div'); box.id = 'carte-pleine'; document.body.appendChild(box); }
  const r = el.getBoundingClientRect(), ratio = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--card-ratio')) || 1.65;
  const w = Math.max(220, Math.min(r.width * 1.7, (innerHeight - 16) / ratio, innerWidth - 16));
  box.innerHTML = build(); box.style.width = w + 'px';
  // The mini cards under the card make the stack taller: it shrinks to stay in the window.
  const H = () => box.offsetHeight; if (H() > innerHeight - 16) { const k = (innerHeight - 16) / H(); box.style.width = Math.max(180, w * k) + 'px'; }
  const bw = parseFloat(box.style.width);
  box.style.left = Math.max(8, Math.min(r.left + r.width / 2 - bw / 2, innerWidth - bw - 8)) + 'px';
  box.style.top = Math.max(8, Math.min(r.top + r.height / 2 - bw * ratio * 0.62, innerHeight - H() - 8)) + 'px';   // a little above the centered position, to leave room under it for the mini cards and the console
  peekKey = el.dataset.peek;
}
document.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('[data-peek]'); if (c) showPeek(c); else if (peekKey) hidePeek(); });
document.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('[data-peek]'); if (c) showPeek(c); });
document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-peek]')) hidePeek(); });
document.addEventListener('mouseleave', hidePeek);
document.addEventListener('dragstart', hidePeek, true);
// The equipment held by a socket, shown next to the servant until the next click.
function peekEquipment(def, r) {
  const old = document.getElementById('socket-peek'); if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'socket-peek'; box.className = 'fixed z-[90] w-44 shadow-2xl'; box.style.cssText = `top:${Math.max(8, Math.min(r.top, innerHeight - 300))}px;left:${Math.min(r.right + 8, innerWidth - 190)}px`;
  box.innerHTML = AWGfx.equipCard({ ...def, powers: powersOf(def.kw ? [def.kw] : [], [].concat(def.skill || []).map(k => ({ ...k })), def.mod ? { a: def.mod.summonA, h: def.mod.summonH } : null, [], true) }, { width: '100%' });
  document.body.appendChild(box);
  setTimeout(() => document.addEventListener('click', () => box.remove(), { once: true }), 0);
}
// ---------- Drag and drop (reinforcement) ----------
// hand -> board: places a servant (on a card: in front of or behind it, or replaces if the board is full)
// hand -> servant: equips; board -> board: changes the order. An invalid drop does nothing.
const DRAG = { src: null };
const draggedEquip = info => (info.from === 'offer' ? UI.rf.offer.cards[info.i] : UI.g[Z.reserve][info.i].def);   // the equipment being dragged: from the offer or from the hand
const dropSide = (el, e) => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 'l' : 'r'; };
const clearDrop = () => document.querySelectorAll('.drop-l,.drop-r,.drop-on,.drop-zone').forEach(n => n.classList.remove('drop-l', 'drop-r', 'drop-on', 'drop-zone'));
function dragInfo() {
  const d = DRAG.src, g = UI.g;
  if (!d || UI.screen !== 'room') return null;
  if (d.kind === 'offer') { const o = UI.rf && UI.rf.offer; return o && o.cards[d.i] ? { from: 'offer', type: offerKind(o, d.i) === 'servant' ? 'servant' : 'equip', i: d.i } : null; }
  if (d.kind === Z.reserve) { const h = g[Z.reserve][d.i]; return h ? { from: 'reserve', type: h.kind, i: d.i } : null; }
  const i = g[Z.field].findIndex(x => x.uid === d.uid); return i < 0 ? null : { from: 'field', type: 'servant', i };
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
  const card = t.dataset.drop === 'card', hand = t.dataset.drop === 'hand';
  if (info.from === 'offer' && !hand && !GAME.def().choices.offer.dragToBoard) return;   // only the hand takes the offer
  if (hand) { if (info.from !== 'offer') return; e.preventDefault(); clearDrop(); t.classList.add('drop-zone'); return; }   // a card of the offer dropped on the hand: it goes to the hand
  if (info.type === 'equip' && !card) return;
  if (info.type === 'equip' && !canEquip(UI.g[Z.field][+t.dataset.idx], draggedEquip(info))) return;   // no free socket of the right color: the card cannot be dropped
  if (card && info.from === 'field' && +t.dataset.uid === DRAG.src.uid) return;
  e.preventDefault(); clearDrop();
  if (info.type === 'equip') t.classList.add('drop-on');
  else if (card) t.classList.add(UI.g[Z.field].length >= MAX_BOARD && info.from !== 'field' ? 'drop-on' : 'drop-' + dropSide(t, e));
  else t.classList.add('drop-zone');
});
document.addEventListener('drop', e => {
  const info = dragInfo(), t = e.target.closest && e.target.closest('[data-drop]');
  if (!info || !t) return;
  if (info.from === 'offer' && t.dataset.drop !== 'hand' && !GAME.def().choices.offer.dragToBoard) return;
  e.preventDefault();
  if (t.dataset.drop === 'hand') { clearDrop(); DRAG.src = null; if (info.from === 'offer') ACT.pickOffer({ i: info.i }); return; }
  const g = UI.g, rf = UI.rf, say = m => rf.log.push(m), card = t.dataset.drop === 'card';
  const side = card ? dropSide(t, e) : 'r', ti = card ? +t.dataset.idx : g[Z.field].length;
  clearDrop(); DRAG.src = null;
  if (info.from === 'offer') {   // a card of the offer dragged onto the board: the engine delivers it (takeOffer); a full board asks which servant it replaces
    const finish = where => { const done = takeOffer(g, rf, info.i, say, where); if (done === 'refused') say(I18N.t('log.noSocket', { item: draggedEquip(info).name, name: g[Z.field][where.equip].name })); serveOwedEquipment(); if (done === true && GAME.def().choices.offer.endsStep) drive(); else render(); };
    if (info.type === 'equip') { if (card) finish({ equip: ti }); return; }
    if (g[Z.field].length >= MAX_BOARD) {
      if (!card) { say(I18N.t('log.boardFullReplace')); render(); }
      else if (isCompanion(g[Z.field][ti])) { say(I18N.t('log.prCannotReplace')); render(); }
      else confirmer(I18N.t('ui.replaceConfirm', { name: g[Z.field][ti].name }), () => finish({ replace: ti }), { title: I18N.t('ui.replaceTitle'), ok: I18N.t('ui.replace') });
    } else finish({ at: card ? ti + (side === 'r' ? 1 : 0) : g[Z.field].length });
    return;
  }
  if (rf.offer || rf.reward || rf.promise || rf.rolling) return;
  if (info.type === 'equip') {
    if (!card) return;
    const sv = g[Z.field][ti], eq = g[Z.reserve][info.i].def;
    if (!equipWithEvents(g, sv, eq, say)) { say(I18N.t('log.noSocket', { item: eq.name, name: sv.name })); render(); return; }
    g[Z.reserve].splice(info.i, 1); say(I18N.t('log.equippedOn', { item: eq.name, name: sv.name }));
  } else if (info.from === 'field') {
    const [sv] = g[Z.field].splice(info.i, 1);
    let at = card ? ti + (side === 'r' ? 1 : 0) : g[Z.field].length;
    if (info.i < at) at--;
    g[Z.field].splice(at, 0, sv);
  } else if (g[Z.field].length >= MAX_BOARD) {
    if (card && isCompanion(g[Z.field][ti])) say(I18N.t('log.prCannotReplace'));
    else if (!card) { say(I18N.t('log.boardFullReplace')); }
    else { confirmer(I18N.t('ui.replaceConfirm', { name: g[Z.field][ti].name }), () => { placeServant(g, info.i, ti, say); serveOwedEquipment(); render(); }, { title: I18N.t('ui.replaceTitle'), ok: I18N.t('ui.replace') }); return; }
  } else {
    placeServant(g, info.i, null, say);
    if (card) { const sv = g[Z.field].pop(); g[Z.field].splice(ti + (side === 'r' ? 1 : 0), 0, sv); }
  }
  serveOwedEquipment(); render();
});
// ---------- Touch: drag and drop ----------
// The browser's drag and drop does not exist on a touch screen. A finger that moves a card (an offer, a card of the hand or of the board) plays the same events the mouse would (dragstart, dragover, drop, dragend),
// so the handlers above serve both. A simple tap on a card that is not shown yet shows its full card instead of acting: the card is bought by a second tap, or by dragging it to the hand or the board.
const TOUCH = { drag: null, tap: null, ghost: null, over: null };
const fakeDrag = (target, type, x, y) => { const ev = new window.Event(type, { bubbles: true, cancelable: true }); Object.assign(ev, { clientX: x, clientY: y, dataTransfer: { setData() {}, effectAllowed: '' } }); if (target) target.dispatchEvent(ev); return ev; };
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || !e.target.closest) return;
  const peeked = e.target.closest('[data-peek]'), el = e.target.closest('[data-drag]');
  TOUCH.tap = peeked ? { el: peeked, was: peekKey === peeked.dataset.peek } : null;
  if (el) { el.draggable = false; TOUCH.drag = { el, x: e.clientX, y: e.clientY, on: false }; }
}, true);
document.addEventListener('pointermove', e => {
  const d = TOUCH.drag; if (!d || e.pointerType === 'mouse') return;
  if (!d.on) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return;
    d.on = true; TOUCH.tap = null; hidePeek();
    fakeDrag(d.el, 'dragstart', e.clientX, e.clientY);
    const r = d.el.getBoundingClientRect(), g = d.el.cloneNode(true);
    g.removeAttribute('data-peek'); g.removeAttribute('data-act'); g.style.cssText = `position:fixed;z-index:96;pointer-events:none;width:${r.width}px;opacity:.85;left:0;top:0`; g.dataset.ghost = '1';
    document.body.appendChild(g); TOUCH.ghost = g; d.dx = r.width / 2; d.dy = r.height / 2;
  }
  TOUCH.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
  const t = document.elementFromPoint(e.clientX, e.clientY); clearDrop(); if (t) fakeDrag(t, 'dragover', e.clientX, e.clientY);
});
const endTouchDrag = (e, drop) => {
  const d = TOUCH.drag; TOUCH.drag = null; if (!d || !d.on) return;
  if (TOUCH.ghost) { TOUCH.ghost.remove(); TOUCH.ghost = null; }
  const t = document.elementFromPoint(e.clientX, e.clientY);
  if (drop && t) fakeDrag(t, 'drop', e.clientX, e.clientY);
  fakeDrag(d.el, 'dragend', e.clientX, e.clientY);
  TOUCH.dragEnd = Date.now();   // the finger lifting after a drag is not a tap: the click that follows is dropped (see below)
};
document.addEventListener('pointerup', e => endTouchDrag(e, true));
document.addEventListener('pointercancel', e => endTouchDrag(e, false));
document.addEventListener('click', e => {
  const t = TOUCH.tap; TOUCH.tap = null;
  if (Date.now() - (TOUCH.dragEnd || 0) < 400) { e.stopPropagation(); e.preventDefault(); TOUCH.dragEnd = 0; return; }
  if (t && !t.was && t.el.contains(e.target) && t.el.dataset.act !== undefined) { e.stopPropagation(); e.preventDefault(); showPeek(t.el); }   // first tap: look; the second one acts
}, true);
// The first render waits for the texts and the power templates (both loaded by fetch, see i18n.js and powers.js).
Promise.all([typeof MOD !== 'undefined' ? MOD.ready : null, I18N.ready, POWERS.ready, CATALOG.ready]).then(() => { document.documentElement.style.setProperty('--card-ratio', AWGfx.cardRatio('servant')); document.documentElement.style.setProperty('--board-ratio', AWGfx.compactRatio('servant')); document.documentElement.classList.toggle('compact-boards', AWGfx.hasCompact('servant')); UI.save = SAVE.peek(); render(); }).catch(() => { /* a banner already explains the failure */ });
