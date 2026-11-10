// Catalog oracle: the cards built from data/*.json must be exactly the cards of the old hand-written data file (tests/legacy/data-before-json.js):
// same servants, equipment, lieutenants, dungeons (mini-bosses included) and same identifier tables, compared with sorted keys.
// The legacy file is temporary: it is deleted when the migration is done.
// Usage: node tools/check-catalog.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const names = '{ IDENTIFIERS, SERVANTS, EQUIPS, HEROES, HEROES_RESERVE, DUNGEONS }';
const legacy = vm.runInNewContext(read('tests', 'legacy', 'data-before-json.js') + `\n;(${names})`, { Math, console });
const current = vm.runInNewContext(['data.js', 'i18n.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() + `\n;(${names})`, { Math, console });
const stable = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
let bad = 0;
for (const key of ['IDENTIFIERS', 'SERVANTS', 'EQUIPS', 'HEROES', 'HEROES_RESERVE', 'DUNGEONS']) {
  const a = stable(legacy[key]), b = stable(current[key]);
  if (a !== b) { bad++; let i = 0; while (a[i] === b[i]) i++; console.log(`✗ ${key} differs near: legacy …${a.slice(Math.max(0, i - 60), i + 80)}\n                     json   …${b.slice(Math.max(0, i - 60), i + 80)}`); }
}
// order matters too: the offer draws and the lieutenant menu follow the order of the lists
const order = (o, key) => JSON.stringify((Array.isArray(o) ? o : Object.values(o)).map(c => c.id));
for (const key of ['SERVANTS', 'EQUIPS', 'HEROES', 'DUNGEONS']) if (order(legacy[key]) !== order(current[key])) { bad++; console.log(`✗ order of ${key} differs`); }
console.log(bad ? `✗ ${bad} difference(s) between the legacy data and the JSON catalog.` : `✓ catalog from JSON identical to the legacy data (${legacy.SERVANTS.length} servants, ${legacy.EQUIPS.length} equipment, ${Object.keys(legacy.HEROES).length} lieutenants, ${Object.keys(legacy.DUNGEONS).length} dungeons).`);
process.exit(bad ? 1 : 0);
