// The "type" parameter of a power (template "params": ["type"]): the card says which type the power aims at, the same template serves every type.
// Checks: the effect follows the type of the card; a template that reads $type without declaring it is refused; the description names the type and says
// "the other ..." only when the carrier has that type (never on an equipment or without a card); the card validation refuses an unknown type;
// the same for the kind of summoned unit ("token"), for a keyword ("keyword") and for the target ("target": a selector).
// Usage: node tools/check-type-param.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const g = vm.runInNewContext(['data.js', 'i18n.js', 'powers.js', 'flow.js', 'engine.js'].map(f => read('prototype', f)).join('\n') + require('./engine-data').installScript() +
  '\n;({ POWERS, I18N, GEN, skDesc, mkServant, SERVANTS, applyFx, ALL_TYPES, setSeed })', { Math, console });
const core = require('../site/editor-core.js');
const fail = m => { console.log('✗ ' + m); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); };

(async () => {
  await g.I18N.load('fr');
  const base = g.SERVANTS[0], [typeA, typeB] = g.ALL_TYPES;
  const card = (name, types) => g.mkServant({ ...base, name, atk: 1, hp: 5, types, kw: [], skill: null });
  const skill = type => ({ t: 'startCombat', fx: 'changeStats', target: { side: 'ally', exclude: 'carrier', type }, a: 0, h: 2, n: 0 });
  check(g.POWERS.all().changeStats.params.join() === 'target,permanent,scale', 'changeStats must declare "params": ["target", "permanent", "scale"]');

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
  { const kwOf = kw => ({ t: 'startCombat', fx: 'giveKeyword', target: { side: 'ally', pick: 'neighbors', type: typeA }, keyword: kw, a: 0, h: 0, n: 0 });
    check(g.POWERS.all().giveKeyword.params.join() === 'keyword,target', 'giveKeyword must declare "params": ["keyword", "target"]');
    for (const kw of ['fury', 'prov']) {
      const carrier = card('C', [typeB]), left = card('L', [typeA]), right = card('R', [typeA]), far = card('F', [typeA]), board = [left, carrier, right, far];
      g.applyFx(kwOf(kw), carrier, board, [], () => {}, null, 0);
      check(left.kw.includes(kw) && right.kw.includes(kw) && !far.kw.includes(kw) && !carrier.kw.includes(kw), `keyword ${kw}: the neighbors of the type get it, nobody else`);
      check(g.skDesc(kwOf(kw)).includes(g.I18N.t('keyword.' + kw)), `the description names the keyword ${kw}: ` + g.skDesc(kwOf(kw)));
    }
    // ... and takes one away: the enemies that have it lose it, and only it
    for (const kw of ['prov', 'fury']) {
      const carrier = card('C', [typeA]), foe = card('E', [typeB]), board = [carrier], foes = [foe]; foe.kw = ['prov', 'fury'];
      g.applyFx({ t: 'startCombat', fx: 'removeKeyword', target: { side: 'enemy' }, keyword: kw, a: 0, h: 0, n: 0 }, carrier, board, foes, () => {}, null, 0);
      check(!foe.kw.includes(kw) && foe.kw.length === 1, `removeKeyword with ${kw}: the foe keeps only the other keyword, got ${foe.kw}`);
    }
    const tpl = { then: [{ action: 'keyword', target: { side: 'ally' }, give: '$keyword' }] };
    check(g.POWERS.validate(tpl).some(p => /not listed in "params"/.test(p)) && g.POWERS.validate({ params: ['keyword'], ...tpl }).length === 0, 'reading $keyword needs "params": ["keyword"]'); }

  // 3d. the target is a parameter too: the same template acts on whoever the card says
  { const shield = target => ({ t: 'startCombat', fx: 'giveShield', target, a: 0, h: 0, n: 0 });
    check(g.POWERS.all().giveShield.params.join() === 'target', 'giveShield must declare "params": ["target"]');
    const cases = [[{ side: 'ally', pick: 'leftmost' }, [1, 0, 0]], [{ side: 'ally', pick: 'rightmost' }, [0, 0, 1]], [{ side: 'ally', pick: 'ends' }, [1, 0, 1]], [{ side: 'self' }, [0, 1, 0]], [{ side: 'ally', pick: 'min:hp' }, [0, 0, 1]]];
    for (const [target, want] of cases) {
      const a = card('A', [typeA]), carrier = card('C', [typeA]), b = card('B', [typeA]); a.hp = 6; carrier.hp = 6; b.hp = 3;   // B has the fewest HP
      const board = [a, carrier, b];
      g.applyFx(shield(target), carrier, board, [], () => {}, null, 0);
      const got = board.map(x => (x.shield ? 1 : 0));
      check(got.join() === want.join(), `giveShield on ${JSON.stringify(target)}: expected ${want}, got ${got}`);
    }
    check(g.POWERS.validateSelector({ side: 'enemy', pick: 'min:hp' }).length === 0, 'a valid selector must be accepted');
    check(g.POWERS.validateSelector({ pick: 'random' }).length === 1 && g.POWERS.validateSelector({ side: 'ally', pick: 'nope' }).length === 1 && g.POWERS.validateSelector({ side: 'moon' }).length === 1, 'a selector without side, with an unknown pick or an unknown side must be refused');
    const tpl = { then: [{ action: 'shield', target: '$target' }] };
    check(g.POWERS.validate(tpl).some(p => /not listed in "params"/.test(p)) && g.POWERS.validate({ params: ['target'], ...tpl }).length === 0, 'reading $target needs "params": ["target"]');
    check(/Bouclier/.test(g.skDesc(shield({ side: 'ally', pick: 'min:hp' }))) && /moins de PV/.test(g.skDesc(shield({ side: 'ally', pick: 'min:hp' }))), 'the description follows the target written on the card: ' + g.skDesc(shield({ side: 'ally', pick: 'min:hp' })));
    const bad = core.validateCard('servants', { ...JSON.parse(JSON.stringify(base)), skill: [{ ...shield({ side: 'moon' }) }] }, { ...core.knownFrom({}, g.ALL_TYPES, Object.keys(g.POWERS.all()), ['startCombat'], undefined), selectorCheck: g.POWERS.validateSelector });
    check(bad.some(p => /unknown side/.test(p)), 'a card with an invalid target must be refused: ' + bad); }

  // 3e. a target with no sentence of its own is worded from its parts (camp, choice, type, equipped, elision)
  { const who = (sel, role = 'to') => g.GEN.who(sel, role), consType = g.ALL_TYPES.find(t => !/^[aeiouyéèh]/i.test(g.I18N.t('type.' + t))), pilot = g.I18N.t('type.' + consType), vowelType = g.ALL_TYPES.find(t => /^[aeiouyéèh]/i.test(g.I18N.t('type.' + t)));
    const table = [
      [{ side: 'enemy', pick: 'random', type: consType }, `à un ${pilot} ennemi aléatoire`],
      [{ side: 'ally', pick: 'leftmost', type: consType }, `au ${pilot} allié le plus à gauche`],
      [{ side: 'ally', pick: 'rightNeighbor' }, "à l'allié de droite"],
      [{ side: 'enemy', pick: 'max:hp' }, "à l'ennemi ayant le plus de PV"],
      [{ side: 'ally', pick: 'neighbors', equipped: true }, 'aux alliés équipés adjacents'],
      [{ side: 'ally', pick: 'all', wounded: true }, 'à tous les alliés blessés'],
      [{ side: 'enemy', pick: 'min:atk' }, "à l'ennemi ayant le moins d'ATQ"],
      [{ side: 'ally', pick: 'random' }, 'à un allié aléatoire'],
      [{ side: 'ally', pick: 'ends' }, 'aux alliés le plus à gauche et le plus à droite']];
    if (vowelType) table.push([{ side: 'ally', pick: 'leftmost', type: vowelType }, `à l'${g.I18N.t('type.' + vowelType)} allié le plus à gauche`]);
    for (const [sel, want] of table) check(who(sel) === want, `target ${JSON.stringify(sel)}: expected "${want}", got "${who(sel)}"`);
    check(who({ side: 'enemy', pick: 'random' }, 'of') === "d'un ennemi aléatoire" && who({ side: 'ally', pick: 'leftmost' }, 'of') === "de l'allié le plus à gauche", 'the "of" role: d\'un, de l\'');
    check(who({ side: 'enemy', pick: 'all', hasKeyword: 'prov' }) === null && who({ side: 'ally', pick: 'nope' }) === null, 'what the parts cannot say is refused (keyword filter, unknown choice)');
    check(/un .* ennemi aléatoire/.test(g.skDesc({ t: 'startCombat', fx: 'giveShield', target: { side: 'enemy', pick: 'random', type: consType }, a: 0, h: 0, n: 0 })), 'a description with a composed target'); }

  // 3f. "permanent" is an optional parameter: ticked, the gain is kept after the combat (perm / permHp), told as "définitivement"
  { const perm = permanent => ({ t: 'survive', fx: 'changeStats', target: { side: 'self' }, ...(permanent ? { permanent: true } : {}), a: 1, h: 2, n: 0 });
    const run = permanent => { const carrier = card('C', [typeA]); g.applyFx(perm(permanent), carrier, [carrier], [], () => {}, null, 0); return carrier; };
    const kept = run(true), plain = run(false);
    check(kept.atk === 2 && kept.hp === 7 && kept.perm === 1 && kept.permHp === 2, `permanent: the gain is applied and recorded (perm ${kept.perm}, permHp ${kept.permHp})`);
    check(plain.atk === 2 && plain.hp === 7 && !plain.perm && !plain.permHp, 'without "permanent": applied for the combat only');
    check(/définitivement/.test(g.skDesc(perm(true))) && !/définitivement/.test(g.skDesc(perm(false))), 'the description says "définitivement" only for a permanent gain: ' + g.skDesc(perm(true)));
    check(core.validateCard('servants', { ...JSON.parse(JSON.stringify(base)), skill: [{ ...perm(true), permanent: 'yes' }] }, core.knownFrom({}, g.ALL_TYPES, Object.keys(g.POWERS.all()), ['survive'], undefined)).some(p => /permanent/.test(p)), '"permanent" must be true or false'); }

  // 3g. a rule the card writes itself (scale): a closed catalog, each rule with its own fields
  { const self = { side: 'self' }, ally = { side: 'ally' }, enemy = { side: 'enemy' };
    const gain = (scale, extra = {}) => ({ t: 'startCombat', fx: 'changeStats', target: self, ...(scale ? { scale } : {}), a: 1, h: 0, n: 0, ...extra });
    // carrier + 3 allies of 3 different types (4 with the carrier's) + 2 enemies of 2 types
    const play = scale => {
      const carrier = card('C', [typeA]), b1 = card('A', [typeB]), b2 = card('B', [g.ALL_TYPES[2]]), b3 = card('D', [typeB]), e1 = card('E1', [typeA]), e2 = card('E2', [typeB]);
      carrier.atk = 0; b1.equips = [{}, {}]; g.applyFx(gain(scale), carrier, [carrier, b1, b2, b3], [e1, e2], () => {}, null, 3); return carrier.atk; };
    const cases = [
      [null, 1, 'no scale: the plain value'],
      [{ kind: 'distinctTypes', of: ally }, 3, 'different types among the allies'],
      [{ kind: 'distinctTypes', of: ally, max: 2 }, 2, 'a cap'],
      [{ kind: 'distinctTypes', of: enemy }, 2, 'different types among the enemies'],
      [{ kind: 'count', of: ally }, 4, 'count of allies (the carrier included)'],
      [{ kind: 'count', of: { side: 'ally', type: typeB } }, 2, 'count with a type filter'],
      [{ kind: 'equipments', of: ally }, 2, 'equipments carried by the allies'],
      [{ kind: 'level' }, 3, 'the reinforcement level'],
      [{ kind: 'difference', first: { kind: 'count', of: ally }, second: { kind: 'count', of: enemy } }, 2, 'allies minus enemies'],
      [{ kind: 'difference', first: { kind: 'count', of: enemy }, second: { kind: 'count', of: ally } }, 0, 'a difference never goes below 0'],
      [{ kind: 'half', of: { kind: 'count', of: ally } }, 2, 'half of a count, rounded down'],
      [{ kind: 'half', of: { kind: 'difference', first: { kind: 'count', of: ally }, second: { kind: 'count', of: enemy } } }, 1, 'rules nest']];
    for (const [scale, want, what] of cases) check(play(scale) === want, `scale ${what}: expected ${want}, got ${play(scale)}`);
    const text = scale => g.skDesc(gain(scale, { a: 1, h: 1 }), false, null);
    const rules = [
      [{ kind: 'distinctTypes', of: ally, max: 3 }, 'par type différent dans votre équipe (max 3)'],
      [{ kind: 'count', of: { side: 'enemy', type: typeA } }, `par ${g.I18N.t('type.' + typeA)} ennemi`],
      [{ kind: 'count', of: { side: 'ally', wounded: true } }, 'par allié blessé'],
      [{ kind: 'equipments', of: ally }, "par équipement de l'équipe"],
      [{ kind: 'half', of: { kind: 'count', of: ally } }, "par paire d'alliés"],
      [{ kind: 'difference', first: { kind: 'count', of: ally }, second: { kind: 'count', of: enemy } }, "pour chaque allié au-delà du nombre d'ennemis"]];
    for (const [scale, want] of rules) check(text(scale).includes(want), `description of ${JSON.stringify(scale)}: expected "${want}", got "${text(scale)}"`);
    check(/définitivement .* par type différent dans votre équipe/.test(g.skDesc(gain({ kind: 'distinctTypes', of: ally }, { permanent: true, a: 1, h: 1 }))), 'a permanent AND scaled gain keeps both: ' + g.skDesc(gain({ kind: 'distinctTypes', of: ally }, { permanent: true, a: 1, h: 1 })));
    check(!/par |pour chaque/.test(text(null)), 'no scale: no "par ..." in the text: ' + text(null));
    const v = r => g.POWERS.validateRule(r, { types: g.ALL_TYPES });
    check(v({ kind: 'count', of: ally }).length === 0 && v({ kind: 'half', of: { kind: 'level' } }).length === 0, 'valid rules must be accepted');
    check(v({ kind: 'nope' }).length === 1 && v({ kind: 'count' }).length >= 1 && v({ kind: 'count', of: { side: 'moon' } }).length >= 1 && v({ kind: 'level', of: ally }).length === 1 && v({ kind: 'half', of: { kind: 'nope' } }).length === 1 && v({ kind: 'count', of: { side: 'ally', type: 'zzz' } }).length === 1 && v({ kind: 'level', max: -1 }).length === 1, 'invalid rules (unknown kind, missing or bad selector, unknown field, bad nested rule, unknown type, bad cap) must be refused');
    const tpl = { then: [{ action: 'stats', target: self, atk: { mul: ['$a', '$scale'] } }] };
    check(g.POWERS.validate(tpl).some(p => /not listed in "params"/.test(p)) && g.POWERS.validate({ params: ['scale'], ...tpl }).length === 0, 'reading $scale needs "params": ["scale"]'); }

  // 3h. a quantity the card writes itself (damage, ATK removed, healing): fixed (n), range, a statistic of the carrier, its half, the level; "attributed" = counts as the carrier's damage (Poison)
  { const foe = target => ({ side: 'enemy', ...target });
    const dmg = (quantity, extra = {}, level = 3) => { const carrier = card('C', [typeA]), e1 = card('E', [typeB]); e1.hp = 30; e1.maxhp = 30; Object.assign(carrier, extra.carrier || {});
      g.applyFx({ t: 'startCombat', fx: 'dealDamage', target: foe({}), ...(quantity ? { quantity } : {}), ...(extra.attributed ? { attributed: true } : {}), a: extra.a || 0, h: 0, n: extra.n === undefined ? 4 : extra.n }, carrier, [carrier], [e1], () => {}, null, level); return { dealt: 30 - e1.hp, dead: e1.hp <= 0, e1 }; };
    check(dmg(null).dealt === 4, 'no quantity: the damage is the card\'s n');
    check(dmg({ kind: 'stat', stat: 'atk' }, { carrier: { atk: 6 } }).dealt === 6, 'the ATK of the carrier');
    check(dmg({ kind: 'stat', stat: 'acc' }, { carrier: { acc: 5 } }).dealt === 5 && dmg({ kind: 'stat', stat: 'acc' }, { carrier: { acc: 0 } }).dealt === 0, 'the accumulated damage, nothing when there is none');
    check(dmg({ kind: 'half', of: { kind: 'stat', stat: 'hp' } }, { carrier: { hp: 9 } }).dealt === 4, 'half of the HP of the carrier, rounded down');
    check(dmg({ kind: 'level' }, {}, 3).dealt === 3, 'the reinforcement level');
    { const seen = new Set(); for (let i = 1; i <= 60; i++) { g.setSeed(i); seen.add(dmg({ kind: 'range' }, { a: 2, n: 5 }).dealt); }
      check([...seen].every(x => x >= 2 && x <= 5) && seen.size > 1, 'a range draws between a and n: ' + [...seen]); }
    const poisoned = { carrier: { kw: ['poison'] } };
    check(!dmg(null, poisoned).dead && dmg(null, { ...poisoned, attributed: true }).dead, 'attributed damage counts as the carrier\'s: Poison destroys, otherwise it does not');
    const red = (quantity, level) => { const carrier = card('C', [typeA]), e1 = card('E', [typeB]); e1.atk = 10; g.applyFx({ t: 'startCombat', fx: 'reduceAtk', target: foe({}), ...(quantity ? { quantity } : {}), a: 0, h: 0, n: 2 }, carrier, [carrier], [e1], () => {}, null, level); return e1.atk; };
    check(red(null, 3) === 8 && red({ kind: 'level' }, 3) === 7 && red({ kind: 'level' }, 20) === 0, 'reduceAtk: n, the level, never below 0');
    const heal = quantity => { const carrier = card('C', [typeA]); carrier.hp = 1; carrier.maxhp = 20; g.applyFx({ t: 'startCombat', fx: 'heal', target: { side: 'self' }, ...(quantity ? { quantity } : {}), a: 0, h: 0, n: 2 }, carrier, [carrier], [], () => {}, null, 4); return carrier.hp; };
    check(heal(null) === 3 && heal({ kind: 'level' }) === 5, 'heal: n, the level');
    const d = (quantity, extra = {}) => g.skDesc({ t: 'startCombat', fx: 'dealDamage', target: foe({ pick: 'random' }), ...(quantity ? { quantity } : {}), ...extra, a: 1, h: 0, n: 3 });
    check(/inflige son Attaque à un ennemi aléatoire/.test(d({ kind: 'stat', stat: 'atk' }, { attributed: true })) && /dégâts accumulés/.test(d({ kind: 'stat', stat: 'acc' })) && /la moitié de ses PV/.test(d({ kind: 'half', of: { kind: 'stat', stat: 'hp' } })) && /niveau de renfort/.test(d({ kind: 'level' })) && /3 dégâts/.test(d(null)), 'descriptions of the quantities: ' + [null, { kind: 'stat', stat: 'atk' }, { kind: 'level' }].map(q => d(q)).join(' / '));
    check(g.POWERS.validateRule({ kind: 'range' }).length === 0 && g.POWERS.validateRule({ kind: 'stat', stat: 'acc' }).length === 0, 'the quantity rules are valid'); }

  // 4. cards: an unknown type is refused
  const known = core.knownFrom({}, g.ALL_TYPES, Object.keys(g.POWERS.all()), ['startCombat'], undefined);
  const refused = core.validateCard('servants', { ...JSON.parse(JSON.stringify(base)), skill: [{ ...skill('nope') }] }, known);
  check(refused.some(p => /unknown type "nope"/.test(p)), 'an unknown type on a skill must be refused: ' + refused);
  console.log('✓ type parameter: effect by type, "params" declared, description names the type and says "autres" only for a carrier of that type, unknown type refused.');
})().catch(e => fail(e.stack));
