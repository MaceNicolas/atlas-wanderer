// Name-loss test: every French display name recorded in tests/names-reference.json (frozen on 2026-11-10) must still exist in the game.
// Checks card names (servants, equipment, lieutenants, dungeons), boss names, species, archetypes (through typeName) and keywords,
// both in the game data (prototype/data.js) and in data/i18n/fr.json.
// Usage: node tools/check-names.js     (exit code 1 if a name is missing or changed)
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ref = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'names-reference.json'), 'utf8'));
const src = fs.readFileSync(path.join(root, 'prototype', 'data.js'), 'utf8');
const X = vm.runInNewContext(src + '\n;({ IDENTIFIERS, DUNGEONS, SPECIES, ARCHETYPES, KW, typeName })', { Math, console });
const problems = [];
for (const cat of Object.keys(ref.cards)) {
  for (const [id, name] of Object.entries(ref.cards[cat])) {
    const now = (X.IDENTIFIERS[cat] || {})[id];
    if (now !== name) problems.push(`${cat} ${id}: "${name}" -> ${JSON.stringify(now)}`);
  }
}
for (const [id, name] of Object.entries(ref.bosses)) {
  const d = X.DUNGEONS[id];
  if (!d || d.boss.name !== name) problems.push(`boss ${id}: "${name}" -> ${JSON.stringify(d && d.boss.name)}`);
}
const typeNames = [...X.SPECIES, ...X.ARCHETYPES].map(X.typeName);
for (const name of [...ref.species, ...ref.archetypes]) if (!typeNames.includes(name)) problems.push(`type name missing: "${name}"`);
for (const [id, name] of Object.entries(ref.keywords)) if (X.KW[id] !== name) problems.push(`keyword ${id}: "${name}" -> ${JSON.stringify(X.KW[id])}`);
// The French translation file must contain every reference name too (data/i18n/fr.json).
const fr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'i18n', 'fr.json'), 'utf8'));
const frValues = new Set(Object.values(fr));
for (const cat of Object.keys(ref.cards)) for (const [id, name] of Object.entries(ref.cards[cat])) if (fr[`card.${id}`] !== name) problems.push(`fr.json card.${id}: "${name}" -> ${JSON.stringify(fr[`card.${id}`])}`);
for (const [id, name] of Object.entries(ref.bosses)) if (fr[`boss.${id}`] !== name) problems.push(`fr.json boss.${id}: "${name}" -> ${JSON.stringify(fr[`boss.${id}`])}`);
for (const name of [...ref.species, ...ref.archetypes]) if (!frValues.has(name)) problems.push(`fr.json type name missing: "${name}"`);
for (const [id, name] of Object.entries(ref.keywords)) if (fr[`keyword.${id}`] !== name) problems.push(`fr.json keyword.${id}: "${name}" -> ${JSON.stringify(fr[`keyword.${id}`])}`);
const count = Object.values(ref.cards).reduce((n, c) => n + Object.keys(c).length, 0) + Object.keys(ref.bosses).length + ref.species.length + ref.archetypes.length + Object.keys(ref.keywords).length;
if (problems.length) { console.log(`✗ ${problems.length} name problem(s) out of ${count}:\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`✓ ${count} names present and unchanged.`);
