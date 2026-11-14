// The "type" parameter of a power (template "params": ["type"]): the card says which type the power aims at, the same template serves every type.
// Checks: the effect follows the type of the card; a template that reads $type without declaring it is refused; the description names the type and says
// "the other ..." only when the carrier has that type (never on an equipment or without a card); the card validation refuses an unknown type;
// the same for the kind of summoned unit ("token") and for a keyword ("keyword").
// Usage: node tools/check-type-param.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ POWERS, I18N, GEN, skDesc, mkServant, SERVANTS, applyFx, ALL_TYPES })', { Math, console });
const core = require('../site/editor-core.js');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };

(async () => {
  await g.I18N.load('fr');
  const base = g.SERVANTS[0], [typeA, typeB] = g.ALL_TYPES.filter(t => g.POWERS.all().buffAlliesOfType && t);
  const card = (name, types) => g.mkServant({ ...base, name, atk: 1, hp: 5, types, kw: [], skill: null });
  const skill = type => ({ t: 'startCombat', fx: 'buffAlliesOfType', type, a: 0, h: 2, n: 0 });
  check(g.POWERS.all().buffAlliesOfType.params.join() === 'type', 'buffAlliesOfType must declare "params": ["type"]');

  // 1. the effect follows the type written on the card
  for (const [aim, hit] of [[typeA, 'A'], [typeB, 'B']]) {
    const carrier = card('Carrier', [typeA]), a = card('A', [typeA]), b = card('B', [typeB]), board = [carrier, a, b];
    g.applyFx(skill(aim), carrier, board, [], () => {}, null, 0);
    check((hit === 'A' ? a.hp === 7 && b.hp === 5 : a.hp === 5 && b.hp === 7) && carrier.hp === 5, `type ${aim}: carrier ${carrier.hp}, A ${a.hp}, B ${b.hp}`);
  }

  // 2. a template that reads $type must declare it
  const sel = params => ({ ...(params ? { params } : {}), then: [{ action: 'stats', target: { side: 'ally', type: '$type' }, hp: '$h' }] });
  check(g.POWERS.validate(sel(['type'])).length === 0, 'a template that declares its type must be valid: ' + g.POWERS.validate(sel(['type'])));
  check(g.POWERS.validate(sel()).some(p => /not listed in "params"/.test(p)), 'reading $type without declaring it must be refused');

  // 3. description: the type is named; "the other" only for a carrier of that type
  const pilot = card('P', [typeA]), other = card('O', [typeB]), name = g.I18N.t('type.' + typeA);
  const text = (carrier, eq = false) => g.skDesc(skill(typeA), eq, carrier);
  check(text(pilot).includes(`autres ${name}s alliés`), 'a carrier of the type: "aux autres ' + name + 's alliés", got: ' + text(pilot));
  check(text(other).includes(`${name}s alliés`) && !/autres/.test(text(other)), 'a carrier of another type: no "autres", got: ' + text(other));
  check(!/autres/.test(text(null)) && !/autres/.test(text(pilot, true)), 'unknown carrier or equipment: neutral wording');
  check(g.skDesc({ ...skill(typeB) }, false, pilot).includes(g.I18N.t('type.' + typeB)), 'the text follows the type of the card');

  // 3b. a kind of summoned unit is a parameter too: the same template summons, boosts or describes any kind
  const summon = { t: 'startCombat', fx: 'summonToken', token: 'drone', a: 2, h: 3, n: 0 };
  check(g.POWERS.all().summonToken.params.join() === 'token', 'summonToken must declare "params": ["token"]');
  check(/drone/.test(g.skDesc(summon)), 'the description names the kind of unit: ' + g.skDesc(summon));
  { const carrier = card('S', [typeA]), board = [carrier];
    g.applyFx(summon, carrier, board, [], () => {}, null, 0);
    check(board.length === 2 && board[1].token === 'drone' && board[1].atk === 2 && board[1].hp === 3, 'summonToken must summon the unit of the kind written on the card'); }
  const tpl = { then: [{ action: 'summon', token: '$token' }] };
  check(g.POWERS.validate(tpl).some(p => /not listed in "params"/.test(p)) && g.POWERS.validate({ params: ['token'], ...tpl }).length === 0, 'reading $token needs "params": ["token"]');

  // 3c. a keyword is a parameter too: the same template gives Fury, Provocation... to the neighbors of a type
  { const kwOf = kw => ({ t: 'startCombat', fx: 'giveKeywordToNeighborsOfType', type: typeA, keyword: kw, a: 0, h: 0, n: 0 });
    check(g.POWERS.all().giveKeywordToNeighborsOfType.params.join() === 'type,keyword', 'giveKeywordToNeighborsOfType must declare "params": ["type", "keyword"]');
    for (const kw of ['fury', 'prov']) {
      const carrier = card('C', [typeB]), left = card('L', [typeA]), right = card('R', [typeA]), far = card('F', [typeA]), board = [left, carrier, right, far];
      g.applyFx(kwOf(kw), carrier, board, [], () => {}, null, 0);
      check(left.kw.includes(kw) && right.kw.includes(kw) && !far.kw.includes(kw) && !carrier.kw.includes(kw), `keyword ${kw}: the neighbors of the type get it, nobody else`);
      check(g.skDesc(kwOf(kw)).includes(g.I18N.t('keyword.' + kw)), `the description names the keyword ${kw}: ` + g.skDesc(kwOf(kw)));
    }
    // ... and takes one away: the enemies that have it lose it, and only it
    for (const kw of ['prov', 'fury']) {
      const carrier = card('C', [typeA]), foe = card('E', [typeB]), board = [carrier], foes = [foe]; foe.kw = ['prov', 'fury'];
      g.applyFx({ t: 'startCombat', fx: 'removeKeywordFromAllEnemies', keyword: kw, a: 0, h: 0, n: 0 }, carrier, board, foes, () => {}, null, 0);
      check(!foe.kw.includes(kw) && foe.kw.length === 1, `removeKeywordFromAllEnemies with ${kw}: the foe keeps only the other keyword, got ${foe.kw}`);
    }
    const tpl = { then: [{ action: 'keyword', target: { side: 'ally' }, give: '$keyword' }] };
    check(g.POWERS.validate(tpl).some(p => /not listed in "params"/.test(p)) && g.POWERS.validate({ params: ['keyword'], ...tpl }).length === 0, 'reading $keyword needs "params": ["keyword"]'); }

  // 4. cards: an unknown type is refused
  const known = core.knownFrom({}, g.ALL_TYPES, Object.keys(g.POWERS.all()), ['startCombat'], undefined);
  const refused = core.validateCard('servants', { ...JSON.parse(JSON.stringify(base)), skill: [{ ...skill('nope') }] }, known);
  check(refused.some(p => /unknown type "nope"/.test(p)), 'an unknown type on a skill must be refused: ' + refused);
  console.log('✓ type parameter: effect by type, "params" declared, description names the type and says "autres" only for a carrier of that type, unknown type refused.');
})().catch(e => fail(e.stack));
