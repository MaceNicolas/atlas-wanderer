// Consistency of the game data (data/*.json): valid whatever the cards are, so that adding or removing a card with the editor never breaks it.
// Every card is valid; every card has a French name (a Boss also a name and a description); no duplicate name in a category or identifier across files;
// the removed cards (data/retired.json) are gone from the active files but keep their names; the types have their French names.
// Usage: node tools/check-data.js
'use strict';
const fs = require('fs'), path = require('path');
const MOD = require('./mod'), read = f => MOD.read(f);
const core = require('../site/editor-core.js'), rt = require('./engine-data').loadRuntime();
const fr = MOD.texts('fr'), en = MOD.texts('en'), retired = read('retired');
const cats = Object.values(read('game').categories).map(c => c.file), files = Object.fromEntries(cats.map(c => [c, read(c)]));
files.rules = read('rules'); files.vocabulary = read('vocabulary');
const known = core.knownFrom(files, rt.ALL_TYPES, Object.keys(rt.POWERS.all()), [], read('game').categories);
const problems = [], seen = new Map();
core.validateVocabulary(files.vocabulary).forEach(p => problems.push(`vocabulary: ${p}`));
core.validateScenes(read('scenes'), Object.keys(files.dungeons.cards)).forEach(p => problems.push(`scenes: ${p}`));
let count = 0;
for (const cat of cats) {
  const names = new Map();
  for (const [id, card] of Object.entries(files[cat].cards)) {
    count++;
    core.validateCard(cat, card, known).forEach(p => problems.push(`${cat} ${id}: ${p}`));
    if (seen.has(id)) problems.push(`${id} is used in ${seen.get(id)} and ${cat}`); else seen.set(id, cat);
    const name = fr['card.' + id];
    if (!name) problems.push(`${cat} ${id}: no French name (card.${id})`);
    else if (names.has(name)) problems.push(`${cat}: "${name}" is the name of two cards (${names.get(name)}, ${id})`); else names.set(name, id);
    if (cat === 'dungeons') for (const key of [`boss.${id}`, `boss.${id}.desc`]) if (!fr[key]) problems.push(`dungeons ${id}: no French text ${key}`);
  }
  for (const id of retired.ids[cat]) {
    if (files[cat].cards[id]) problems.push(`${cat} ${id} is both active and retired`);
    if (!fr['card.' + id]) problems.push(`${cat} ${id} (retired): its name is missing`);
  }
}
for (const t of rt.ALL_TYPES) if (!fr['type.' + t]) problems.push(`type ${t}: no French name (type.${t})`);
for (const key of Object.keys(en)) if (!(key in fr)) problems.push(`${key}: English text without French text`);
const untranslated = Object.keys(fr).filter(k => /^(card|boss)\./.test(k) && !(k in en)).length;
if (problems.length) { console.log(`✗ ${problems.length} problem(s):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`✓ data consistent: ${count} cards, ${seen.size} identifiers, ${cats.reduce((n, c) => n + retired.ids[c].length, 0)} removed cards (${untranslated} card/boss names not translated into English yet).`);
