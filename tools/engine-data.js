// Data files the engine needs at run time, handed to a Node context as a script (the browser fetches the same files, see prototype/powers.js and i18n.js).
// Used by the tools that load the game code with a fake DOM.
'use strict';
const fs = require('fs'), path = require('path');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8'));
function installScript() {
  const texts = {};
  for (const lang of ['fr', 'en']) texts[lang] = read('data', 'i18n', `${lang}.json`);
  const catalog = {};
  for (const f of ['servants', 'equipment', 'lieutenants', 'dungeons', 'retired', 'rules']) catalog[f] = read('data', `${f}.json`);
  if (process.env.AW_ORDER) catalog.rules.order.profile = process.env.AW_ORDER;   // tests: force a resolution order profile
  return `\n;if (typeof POWERS !== 'undefined') POWERS.install(${JSON.stringify(read('data', 'powers.json'))});\n;I18N.install(${JSON.stringify(texts)});\n;if (typeof CATALOG !== 'undefined') CATALOG.install(${JSON.stringify(catalog)});`;
}
module.exports = { installScript };
