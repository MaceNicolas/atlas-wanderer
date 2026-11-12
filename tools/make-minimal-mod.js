// Builds the mod "minimal" (data/mods/minimal/): the smallest game the engine plays, and the model the editor proposes when a mod is created.
// Spec: documentation/mecaniques/jeu-minimal.md. One hero and a Boss with 5 hit points and no power; no money, no reinforcement level, no hand;
// at each reinforcement the player is offered 3 servants and takes one, straight onto the board (5 at most, a full board: it replaces one);
// every survivor hits for 1; the enemy board is described by the dungeon (fixed, or growing by a rule). The game is won by killing the Boss.
// Usage: node tools/make-minimal-mod.js   (rewrites data/mods/minimal/ and adds it to data/mods.json)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const MOD = require('./mod');
const base = 'atlas-wanderer', out = path.join(MOD.root, 'data', 'mods', 'minimal');
const read = k => MOD.read(k, base), write = (rel, data) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data, null, 1) + '\n'); };
fs.rmSync(out, { recursive: true, force: true });
// Stable identifiers (the same on every build).
const uuid = name => { const h = crypto.createHash('sha1').update('minimal:' + name).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };

// ---- Cards: six servants (no rank, no type, no power), one hero, two dungeons.
const SERVANTS = [['Recrue', 'Recruit', 1, 2], ['Sentinelle', 'Sentinel', 1, 3], ['Lame', 'Blade', 2, 1], ['Garde', 'Guard', 2, 2], ['Bélier', 'Ram', 3, 1], ['Tireur', 'Shooter', 3, 2]];
const ids = Object.fromEntries(SERVANTS.map(s => [s[1], uuid(s[1])]));
const servants = Object.fromEntries(SERVANTS.map(([fr, en, atk, hp]) => [ids[en], { atk, hp }]));
const hero = uuid('Traveler'), fixed = uuid('Fixed board'), growing = uuid('Growing board');
const heroes = { [hero]: { hp: 5 } };
const dungeons = {
  [fixed]: { boss: { hp: 5 }, enemyBoard: { rooms: [[ids.Recruit, ids.Guard, ids.Blade]] } },
  [growing]: { boss: { hp: 5 }, enemyBoard: { rooms: [[ids.Ram]], growth: { atk: 1, hp: 1 } } }
};
write('servants.json', { version: 1, cards: servants }); write('equipment.json', { version: 1, cards: {} });
write('heroes.json', { version: 1, cards: heroes }); write('dungeons.json', { version: 1, cards: dungeons });
write('powers.json', {});
write('retired.json', { ...read('retired'), ids: { servants: [], equipment: [], heroes: [], dungeons: [] } });

// ---- Rules: board of 5, no hand, one level, one Boss board, 3 proposals, every survivor hits for 1.
const rules = read('rules');
Object.assign(rules.game, { maxBoard: 5, handMax: 0, maxLevel: 1, maxRank: 1, gameTypes: 0, bossRandomTypes: 0, bossBoards: [{ malus: 0 }] });
rules.reinforcement.proposals = [3];
rules.settlement.player = { perRank: 0, flat: 1 }; rules.settlement.boss = { perRank: 0, flat: 1 };
write('rules.json', rules);

// ---- The description of the game.
const game = read('game');
const keep = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k)));
game.categories = {
  servant: { file: 'servants', fields: { atk: 'int>=0', hp: 'int>=1' }, image: true, label: 'Serviteurs' },
  hero: { file: 'heroes', fields: { hp: 'int>=1' }, image: true, label: 'Héros' },
  dungeon: { file: 'dungeons', fields: { boss: 'boss' }, optional: { enemyBoard: 'enemyBoard' }, scene: true, label: 'Donjons' }
};
delete game.companion; delete game.promises; delete game.bags; delete game.tokens; delete game.heroActions; delete game.fusion;
game.state.resources = { room: { start: 1 } };
game.state.sides = { player: { zones: ['board', 'hand'], resources: ['room'] }, boss: { count: 'game.bossBoards', zones: ['board', 'hand'], resources: [] } };
game.state.vars = keep(game.state.vars, ['stats', 'over', 'bossCur', 'bossLast', 'bossLog', 'flow', 'spent', 'owedEquipment', 'cues']);
for (const v of Object.values(game.state.vars)) v.sides = v.sides.filter(s => s === 'player' || s === 'boss');
const roles = game.state.roles; delete roles.money; delete roles.level; delete roles.progress; roles.turn = 'room';
roles.note = 'The roles that the resources and the zones play for the engine. This game has no money, no reinforcement level and no progress: only the number of the room (turn).';
game.setup.steps = [{ id: 'dungeon', pick: { from: 'dungeon', count: 1 }, screen: 'dungeonSelect', into: 'dungeon' }, { id: 'heroes', pick: { from: 'hero', count: 1, list: true }, screen: 'heroSelect', back: 'dungeon', into: 'heroes' }];
game.actions = { placeCard: game.actions.placeCard, discard: game.actions.discard, restart: game.actions.restart };
game.choices = { offer: {
  from: { draw: 'reinforcement', count: 'rules.reinforcement.proposals' }, pick: 1, then: [{ action: 'placeCard', to: 'board' }], view: 'cardRow', title: 'ui.chooseCard', modifiers: [],
  endsStep: true, dragToBoard: true,
  note: 'The offer opens by itself at each reinforcement; the player takes one card (by a click: it goes on the board when there is room, or by dragging it onto the board or onto the servant it replaces) and the reinforcement ends.' } };
const room = game.flow.phases.room;
room.steps = room.steps.filter(s => !['startMission', 'income'].includes(s.id));
const reinforcement = room.steps.find(s => s.id === 'reinforcement');
reinforcement.effects = [{ action: 'openChoice', choice: 'offer', params: { kind: 'servant' } }]; reinforcement.actions = []; delete reinforcement.until;
// ---- The screens: no hand, no console of purchases.
const screens = game.ui.screens, stripHand = (nodes, keepConsole) => nodes.map(n => {
  if (n.widget === 'handSection') return null;
  if (n.widget === 'heroSlot' && n.index > 0) return null;
  if (n.widget === 'consoleHead' || (n.widget === 'consoleActions' && !keepConsole)) return null;
  if (n.widget === 'stat' && n.value === 'level') return null;
  return n.children ? { ...n, children: stripHand(n.children, keepConsole).filter(Boolean) } : n;
}).filter(Boolean);
for (const name of ['room', 'playback', 'endScreen']) screens[name].nodes = stripHand(screens[name].nodes, false);
game.ui.screens = screens; game.ui.theme = { css: 'theme.css', title: 'ui.gameTitle' };
game.note = 'The smallest game: see documentation/mecaniques/jeu-minimal.md.';
write('game.json', game);
fs.copyFileSync(path.join(MOD.dir(base), 'theme.css'), path.join(out, 'theme.css'));
write('vocabulary.json', read('vocabulary')); write('scenes.json', read('scenes'));

// ---- Texts: the engine's interface texts of the mod, without the cards of the base game, plus the names of these cards.
const names = { fr: {}, en: {} };
SERVANTS.forEach(([fr, en]) => { names.fr[`card.${ids[en]}`] = fr; names.en[`card.${ids[en]}`] = en; });
Object.assign(names.fr, { [`card.${hero}`]: 'Voyageur', [`card.${fixed}`]: 'Plateau fixe', [`card.${growing}`]: 'Plateau évolutif', [`boss.${fixed}`]: 'Le Gardien', [`boss.${growing}`]: 'Le Colosse',
  [`boss.${fixed}.desc`]: 'Trois serviteurs toujours les mêmes.', [`boss.${growing}.desc`]: 'Un serviteur qui gagne +1/+1 à chaque salle.', 'ui.gameTitle': 'Minimal', 'log.dragToReplace': 'Le plateau est plein : glissez la carte sur le serviteur à remplacer.' });
Object.assign(names.en, { [`card.${hero}`]: 'Traveler', [`card.${fixed}`]: 'Fixed board', [`card.${growing}`]: 'Growing board', [`boss.${fixed}`]: 'The Keeper', [`boss.${growing}`]: 'The Colossus',
  [`boss.${fixed}.desc`]: 'Three servants, always the same.', [`boss.${growing}.desc`]: 'One servant that gains +1/+1 every room.', 'ui.gameTitle': 'Minimal', 'log.dragToReplace': 'The board is full: drag the card onto the servant to replace.' });
for (const lang of ['fr', 'en']) {
  const t = MOD.readJson(MOD.modTextFile(lang, base)), keepT = {};
  for (const [k, v] of Object.entries(t)) if (!/^(?:card|boss)\.[0-9a-f-]{36}/.test(k)) keepT[k] = v;
  write(`i18n/${lang}.json`, { ...keepT, ...names[lang] });
}
fs.mkdirSync(path.join(out, 'images'), { recursive: true });
fs.writeFileSync(path.join(out, 'images.js'), '(function (root) { root.AW_IMAGES = {}; root.AW_ART = {}; })(typeof window !== \'undefined\' ? window : globalThis);\n');
write('mod.json', { ...MOD.manifest(base), id: 'minimal', version: '0.1.0', name: { fr: 'Minimal', en: 'Minimal' },
  description: { fr: 'Le plus petit jeu : un héros, un Boss à 5 PV, une carte à choisir parmi trois à chaque renfort, cinq serviteurs au plus. Modèle pour créer un mod.', en: 'The smallest game: one hero, a 5-hit-point Boss, one card to pick among three at each reinforcement, five servants at most. The model for creating a mod.' } });
const reg = MOD.registry(); if (!reg.mods.includes('minimal')) { reg.mods.push('minimal'); fs.writeFileSync(path.join(MOD.root, 'data', 'mods.json'), JSON.stringify(reg, null, 1) + '\n'); }
console.log(`mod minimal: ${SERVANTS.length} servants, 1 hero, 2 dungeons`);
