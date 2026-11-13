// Descriptions generated from the bricks (GEN in prototype/data.js) compared with those written by hand (desc.<fx>).
// Lists, for every power used by a card, whether it can be generated and whether the text is the same. Usage: node tools/check-descriptions.js [--diff] [--lang=en]
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const X = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js'].map(f => read('prototype', f)).join('\n')
  + require('./engine-data').installScript() + '\n;({ I18N, SERVANTS, EQUIPS, HEROES, skDesc, GEN, POWERS })', { Math, console });
const showDiff = process.argv.includes('--diff'), langArg = process.argv.find(a => a.startsWith('--lang=')), langs = langArg ? [langArg.slice(7)] : ['fr', 'en'];
(async () => {
  // every use of a power: [k, on an equipment?]
  const uses = [...X.SERVANTS.flatMap(s => [].concat(s.skill || []).map(k => [k, false])), ...X.EQUIPS.flatMap(e => [].concat(e.skill || []).map(k => [k, true])), ...Object.values(X.HEROES).flatMap(h => [].concat(h.power || []).map(k => [k, false]))];
  const seen = new Set(), list = uses.filter(([k, eq]) => { const id = JSON.stringify([k, eq]); if (seen.has(id)) return false; seen.add(id); return true; });
  const fxs = [...new Set(list.map(([k]) => k.fx))];
  const result = {};   // fx -> { generated, same }, over every use and every language
  fxs.forEach(fx => { result[fx] = { generated: true, same: true, diffs: [] }; });
  for (const lang of langs) {
    await X.I18N.load(lang);
    for (const [k, eq] of list) {
      const r = result[k.fx], gen = X.GEN.of(k, eq);
      if (gen == null) { r.generated = false; continue; }
      const hand = X.skDesc(k, eq), sep = X.I18N.t('trigger.separator'), tail = hand.includes(sep) ? hand.slice(hand.indexOf(sep) + sep.length) : hand;
      if (tail !== gen) { r.same = false; r.diffs.push(`${lang}${eq ? ' (equipment)' : ''}: ${tail}  =>  ${gen}`); }
    }
  }
  const all = Object.entries(result), generated = all.filter(([, r]) => r.generated), same = generated.filter(([, r]) => r.same);
  console.log(`${fxs.length} powers used: ${generated.length} can be generated (${same.length} with exactly the hand-written text in ${langs.join(' and ')}, ${generated.length - same.length} worded differently), ${fxs.length - generated.length} cannot.`);
  if (showDiff) generated.filter(([, r]) => !r.same).forEach(([fx, r]) => { console.log('  ' + fx); [...new Set(r.diffs)].forEach(d => console.log('    ' + d)); });
  if (process.argv.includes('--prune')) {   // removes the hand-written texts that the generator reproduces exactly (and their equipment variants)
    const dir = path.join(root, 'data', 'mods', 'atlas-wanderer', 'i18n'), keys = same.flatMap(([fx]) => [`desc.${fx}`, `desc.${fx}.equipment`]);
    for (const lang of ['fr', 'en']) { const f = path.join(dir, `${lang}.json`), d = JSON.parse(fs.readFileSync(f, 'utf8')); keys.forEach(k => delete d[k]); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); }
    console.log(`pruned ${keys.length} candidate keys.`);
  }
})();
