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
  const powers = read('data', 'powers.json');
  // Oracles (legacy resolution order, tools/check-combat.js, tools/check-powers.js): the old game applied the Chief Mechanic's bonus when the drone was summoned. Since the move to an
  // aura (bonus kept only while the Chief is alive) the data holds the aura; the oracles put the old template back so that everything else is still compared strictly.
  if (process.env.AW_ORDER === 'legacy' || process.env.AW_ORACLE) powers.droneAura = read('tests', 'legacy', 'drone-aura-before-aura.json');
  return `\n;if (typeof POWERS !== 'undefined') POWERS.install(${JSON.stringify(powers)});\n;I18N.install(${JSON.stringify(texts)});\n;if (typeof CATALOG !== 'undefined') CATALOG.install(${JSON.stringify(catalog)});`;
}
// The runtime pieces the editor needs on the server side (validation of power templates): returns { POWERS, I18N } with the data installed.
function loadRuntime() {
  const vm = require('vm'), code = ['data.js', 'i18n.js', 'powers.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'prototype', f), 'utf8')).join('\n');
  return vm.runInNewContext(code + installScript() + '\n;({ POWERS, I18N, TYPE_NAMES })', { Math, console });
}
module.exports = { installScript, loadRuntime };
