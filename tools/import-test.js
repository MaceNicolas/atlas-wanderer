// Imports into tests/history/ balance results produced before the history existed (or elsewhere).
// Usage: node tools/import-test.js <source-folder> --scale=massive [--date=2026-11-08T10:22:00] [--note="..."] [--seconds=N]
// The source folder contains lieutenants.json, servants.json, equipment.json, dungeons.json (and their .csv / report-*.txt).
// Fingerprints (data, bot) and commit are those of the current state of the repository: use only if the code has not changed since the test.
'use strict';
const fs = require('fs'), path = require('path');
const h = require('./history');
const args = process.argv.slice(2), src = args.find(a => !a.startsWith('--'));
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
if (!src || !fs.existsSync(src)) { console.error('Usage : node tools/import-test.js <dossier-source> --scale=massive [--date=...] [--note=...]'); process.exit(2); }
const read = f => { try { return JSON.parse(fs.readFileSync(path.join(src, f), 'utf8')); } catch (e) { return null; } };
const L = read('lieutenants.json'), S = read('servants.json'), E = read('equipment.json'), D = read('dungeons.json');
const scale = opt('scale', (L || S || E || D).options.scale);
const date = opt('date') ? new Date(opt('date')) : fs.statSync(path.join(src, 'lieutenants.json')).mtime;
const opts = { scale, factor: 1, seed: (L || S || E || D).options.seed, strategies: L ? L.options.strategies : D.options.strategies, cardStrategies: S ? S.options.strategies : E.options.strategies,
  threshold: 4, note: opt('note', ''), requested: ['lieutenants', 'servants', 'equipment', 'dungeons'].filter((p, i) => [L, S, E, D][i]), imported: true };
const t = h.createTest(opts, { date });
for (const f of fs.readdirSync(src)) if (/^(lieutenants|servants|equipment|dungeons)(-pairs)?\.(json|csv)$|^report-.*\.txt$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(t.folder, f));
let previous = date;
// Size of each phase, found in the first line of the report (« = 237600 parties »).
for (const p of opts.requested) {
  const r = fs.existsSync(path.join(t.folder, `report-${p}.txt`)) ? fs.readFileSync(path.join(t.folder, `report-${p}.txt`), 'utf8').split('\n')[0] : '', m = r.match(/= (\d+) parties/);
  // Approximate duration: gap between the dates of successive reports (the first starts at the start date).
  const finish = fs.existsSync(path.join(src, `report-${p}.txt`)) ? fs.statSync(path.join(src, `report-${p}.txt`)).mtime : date;
  t.meta.phases[p] = { games: m ? +m[1] : 0, seconds: Math.max(0, Math.round((finish - previous) / 1000)) };
  previous = finish; t.meta.seconds = Math.round((finish - date) / 1000);
}
t.save();
h.reindex();
console.log(`Importé : tests/history/${t.id} (${opts.requested.join(', ')})`);
