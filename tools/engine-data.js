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
  const powers = read('data', 'powers.json');
  return `\n;if (typeof POWERS !== 'undefined') POWERS.install(${JSON.stringify(powers)});\n;I18N.install(${JSON.stringify(texts)});\n;if (typeof CATALOG !== 'undefined') CATALOG.install(${JSON.stringify(catalog)});`;
}
// The runtime pieces the editor needs on the server side (validation of power templates): returns { POWERS, I18N } with the data installed.
function loadRuntime() {
  const vm = require('vm'), code = ['data.js', 'i18n.js', 'powers.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'prototype', f), 'utf8')).join('\n');
  return vm.runInNewContext(code + installScript() + '\n;({ POWERS, I18N, TYPE_NAMES })', { Math, console });
}
module.exports = { installScript, loadRuntime };
