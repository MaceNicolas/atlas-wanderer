// Text integrity test: the power descriptions and the combat log texts must be complete and consistent in every language.
//  1. every card power gets a description in French and in English (no missing key, no leftover "{...}");
//  2. every key written by hand (desc.*, trigger.*, log.*, keyword.adapt) exists in both languages with the same placeholders.
// Usage: node tools/check-texts.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const texts = { fr: JSON.parse(read('data', 'i18n', 'fr.json')), en: JSON.parse(read('data', 'i18n', 'en.json')) };
const X = vm.runInNewContext(['data.js', 'i18n.js'].map(f => read('prototype', f)).join('\n')
  + `\n;I18N.install(${JSON.stringify(texts)});\n;({ I18N, SERVANTS, EQUIPS, HEROES, skDesc, ADAPT })`, { Math, console });
const problems = [];
// The set of variables used by a text (plural marks may be repeated differently from one language to the other).
const placeholders = t => [...new Set([...String(t).matchAll(/\{(\w+)[?!]?/g)].map(m => m[1]))].sort().join(',');

(async () => {
  // 1. descriptions of every power of every card, in each language
  const powers = [...X.SERVANTS.flatMap(s => [].concat(s.skill || [])), ...X.EQUIPS.flatMap(e => [].concat(e.skill || [])), ...Object.values(X.HEROES).flatMap(h => [].concat(h.power || []))];
  let count = 0;
  for (const lang of ['fr', 'en']) {
    await X.I18N.load(lang);
    for (const k of powers) {
      const text = X.skDesc(k);
      count++;
      if (/^desc\.|\{|\}|undefined|NaN/.test(text) || /(^|: |: )desc\./.test(text)) problems.push(`${lang} description of ${k.t}/${k.fx}: ${text}`);
    }
  }
  // 2. hand-written keys: same keys and same placeholders in both languages
  const own = k => /^(desc|trigger|log)\./.test(k) || k === 'keyword.adapt';
  for (const key of Object.keys(texts.fr).filter(own)) {
    if (!(key in texts.en)) { problems.push(`en.json is missing ${key}`); continue; }
    if (placeholders(texts.fr[key]) !== placeholders(texts.en[key])) problems.push(`${key}: placeholders differ (fr: ${placeholders(texts.fr[key])} / en: ${placeholders(texts.en[key])})`);
  }
  for (const key of Object.keys(texts.en).filter(own)) if (!(key in texts.fr)) problems.push(`fr.json is missing ${key}`);
  if (problems.length) { console.log(`✗ ${problems.length} problem(s):\n  ` + problems.join('\n  ')); process.exit(1); }
  console.log(`✓ ${count} power descriptions checked in 2 languages; ${Object.keys(texts.fr).filter(own).length} hand-written keys consistent.`);
})();
