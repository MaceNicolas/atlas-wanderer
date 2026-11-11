// Builds the test mod "duel" from the base mod: a smaller game with fewer features (no companion card, no promised cards, no die, no summoned units, no active
// powers of heroes), other sizes and prices. It exists to prove that the engine plays a mod that does not have everything Atlas Wanderer has.
// Usage: node tools/make-duel-mod.js   (rewrites data/mods/duel/ and adds it to data/mods.json)
'use strict';
const fs = require('fs'), path = require('path');
const MOD = require('./mod');
const base = 'atlas-wanderer', out = path.join(MOD.root, 'data', 'mods', 'duel');
const read = k => MOD.read(k, base), write = (rel, data) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data, null, 1) + '\n'); };
fs.rmSync(out, { recursive: true, force: true });

// Powers that need what this mod does not have.
const EXCLUDED = new Set(['boostCompanion', 'summon', 'addSummonBonus', 'addSummonBonusGame', 'createPowerEquipment', 'equipAbsentType', 'giveEquip', 'giveServant', 'discoverEquip', 'drawBag', 'buffChosen', 'takeEquipment', 'revive', 'inherit', 'collect', 'equipOffer']);
const powers = read('powers'), needs = def => { let bad = false; (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (EXCLUDED.has(o.action) || 'token' in o || 'tokenIs' in o) bad = true; Object.values(o).forEach(walk); } })(def); return bad; };
const fine = fx => !powers[fx] ? !/^(prophecy|completeFusion|grantRebirth|triggerBattlecry|adapt|adaptExtra|replayRattles|gainEquip|firstOfferUp|firstEquipOffType|accumulate|companionPersists)$/.test(fx) : !needs(powers[fx]);
const keepCard = c => [].concat(c.skill || c.power || []).every(k => !(powers[k.fx] && needs(powers[k.fx]))) && [].concat(c.skill || c.power || []).every(k => fine(k.fx)) && (!c.power || (c.power.t !== 'active' && c.power.t !== 'startMission'));
const pick = (cat, n) => Object.fromEntries(Object.entries(read(cat).cards).filter(([, c]) => keepCard(c)).slice(0, n));
const servants = pick('servants', 40), equipment = pick('equipment', 12), heroes = pick('heroes', 4);
const dungeons = Object.fromEntries(Object.entries(read('dungeons').cards).slice(0, 2));
const used = new Set(); [servants, equipment, heroes].forEach(set => Object.values(set).forEach(c => [].concat(c.skill || c.power || []).forEach(k => used.add(k.fx))));
Object.values(dungeons).forEach(d => used.add(d.boss.power));
const keptPowers = Object.fromEntries(Object.entries(powers).filter(([fx]) => used.has(fx) || /^(kw:|state:)/.test(fx) || ['summonStats', 'summoned'].includes(fx)).filter(([, d]) => !needs(d)));

write('servants.json', { version: 1, cards: servants }); write('equipment.json', { version: 1, cards: equipment }); write('heroes.json', { version: 1, cards: heroes });
write('dungeons.json', { version: 1, cards: dungeons }); write('powers.json', keptPowers);
const retired = read('retired'); write('retired.json', { ...retired, ids: { servants: [], equipment: [], heroes: [], dungeons: [] } });
const rules = read('rules'); rules.game.maxBoard = 5; rules.game.handMax = 5; rules.game.income = [4, 4, 5]; rules.game.maxLevel = 4; rules.game.maxRank = 5;
rules.sockets.max = 2; rules.reinforcement.proposals = [3, 3, 4, 4]; write('rules.json', rules);
const game = read('game'); ['companion', 'promises', 'bags', 'tokens', 'heroActions'].forEach(k => { delete game[k]; });
game.choices = Object.fromEntries(Object.entries(game.choices).filter(([k]) => !['adaptation'].includes(k)));
game.state.vars = Object.fromEntries(Object.entries(game.state.vars).filter(([k]) => !['promises', 'companion', 'bags', 'lastDraw', 'summonBonus'].includes(k)));
game.actions.usePower && (game.actions.usePower = game.actions.usePower);
// The resources of this mod have other names than Atlas Wanderer's: the engine must reach them through their roles.
const RENAME = { datacrons: 'coins', levelProgress: 'xp', level: 'tier' }, PROPS = new Set(['resource', 'money', 'level', 'progress', 'index']);
const rename = (o, parentKey) => {
  if (Array.isArray(o)) return o.map(x => rename(x, parentKey));
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [(parentKey === 'resources' || parentKey === 'cost' || parentKey === 'roles-keys') && RENAME[k] ? RENAME[k] : k, rename(v, k)]));
  return typeof o === 'string' && RENAME[o] && (PROPS.has(parentKey) || parentKey === 'resources' || parentKey === 'datacrons' || ['money', 'level', 'progress', 'turn'].includes(parentKey)) ? RENAME[o] : o;
};
const renamed = rename(game);
renamed.state.roles = { ...game.state.roles, money: 'coins', level: 'tier', progress: 'xp' };
Object.assign(game, renamed);
write('game.json', game);
fs.copyFileSync(path.join(MOD.dir(base), 'theme.css'), path.join(out, 'theme.css'));
write('vocabulary.json', read('vocabulary')); write('scenes.json', read('scenes'));
const names = new Set([...Object.keys(servants), ...Object.keys(equipment), ...Object.keys(heroes), ...Object.keys(dungeons)]);
for (const lang of ['fr', 'en']) {
  const t = MOD.readJson(MOD.modTextFile(lang, base)), keep = {};
  for (const [k, v] of Object.entries(t)) { const m = /^(?:card|boss)\.([0-9a-f-]{36})/.exec(k); if (!m || names.has(m[1])) keep[k] = v; }
  write(`i18n/${lang}.json`, keep);
}
fs.mkdirSync(path.join(out, 'images'), { recursive: true });
fs.writeFileSync(path.join(out, 'images.js'), '(function (root) { root.AW_IMAGES = {}; root.AW_ART = {}; })(typeof window !== \'undefined\' ? window : globalThis);\n');
const mf = MOD.manifest(base);
write('mod.json', { ...mf, id: 'duel', version: '0.1.0', name: { fr: 'Duel (mod de test)', en: 'Duel (test mod)' }, description: { fr: 'Un petit jeu dérivé, sans carte compagnon, sans cartes promises, sans dé, sans unités invoquées et sans pouvoirs actifs de héros : il prouve que le moteur joue un mod qui n’a pas tout ce qu’a Atlas Wanderer.', en: 'A small derived game with no companion card, no promised cards, no die, no summoned units and no active hero powers: it proves that the engine plays a mod that lacks some of what Atlas Wanderer has.' } });
const reg = MOD.registry(); if (!reg.mods.includes('duel')) { reg.mods.push('duel'); fs.writeFileSync(path.join(MOD.root, 'data', 'mods.json'), JSON.stringify(reg, null, 1) + '\n'); }
console.log(`mod duel: ${Object.keys(servants).length} servants, ${Object.keys(equipment).length} equipment, ${Object.keys(heroes).length} heroes, ${Object.keys(dungeons).length} dungeons, ${Object.keys(keptPowers).length} power templates`);
