// Atlas Wanderer — moteur de règles : combat automatique, partie, renfort, fusion.
'use strict';
// =====================================================================
// MOTEUR DE RÈGLES
// =====================================================================
function mkServant(d) {
  return { uid: uid(), id: d.id || slug(d.name), name: d.name, rank: d.rank, atk: d.atk, hp: d.hp, maxhp: d.hp,
           types: [...d.types], kw: [...d.kw], fixed: !!d.fixed, bg: d.bg, skill: [].concat(d.skill || [])[0] || null, extra: [].concat(d.skill || []).slice(1), equips: [], eqSkills: [], lrSkills: [], droneA: 0, droneH: 0, healBonus: 0 };
}
// Compétences d'un serviteur : la sienne, puis celles que ses équipements lui donnent.
// lrSkills : compétences apprises par Adaptation, conservées jusqu'à la fin de la mission.
// extra : pouvoirs supplémentaires de la fiche (un serviteur peut en avoir plusieurs, par exemple une compétence et l'Adaptation).
const skillsOf = s => [s.skill, ...(s.extra || []), ...(s.eqSkills || []), ...(s.lrSkills || [])].filter(Boolean);

// Nombre de coups que le Bouclier divin d'un serviteur peut absorber (1, ou davantage avec « Son Bouclier divin résiste à N coups »).
const shieldCount = s => s.kw.includes('shield') ? Math.max(1, ...skillsOf(s).filter(k => k.fx === 'shieldCharges').map(k => k.n)) : 0;

// Règle : Bouclier divin annule la première source de dégâts ; Poison détruit
// tout serviteur auquel il inflige réellement des dégâts.
function hit(t, amt, src) {
  if (amt <= 0) return false;
  if (t.shield) { t.shield--; return false; }   // le Bouclier divin absorbe un coup ; shield compte les coups restants
  t.hp -= amt;
  if (src && src.kw.includes('poison')) t.hp = Math.min(t.hp, 0);
  return true;
}

// bonus : bonus permanent {a, h} des drones du joueur (Maître des drones) ; ignoré pour les autres effets.
// ---------- Modèle PR (création évolutive des Nythe) ----------
// Une seule carte par mission : g.pr = { s, dead }. s est un serviteur ordinaire (drapeau pr) qui reste le même objet en main puis sur le plateau.
// Son numéro est fixé au début de la mission (g.prNum) et suit le nombre de missions gagnées, mémorisé dans le navigateur.
const PR_KEY = 'atlasWandererPrWins';
const prWins = () => { try { return Math.max(0, parseInt(localStorage.getItem(PR_KEY), 10) || 0); } catch (e) { return 0; } };
const prRecordWin = () => { try { localStorage.setItem(PR_KEY, String(prWins() + 1)); } catch (e) { /* stockage indisponible */ } };
const prName = n => 'PR-' + n.toString(16).toUpperCase().padStart(3, '0');
const PR_QUEUE = [];   // améliorations demandées par les effets « prBoost », appliquées par flushPr
const isPr = s => !!(s && s.pr);
// Le modèle PR en main ne compte pas dans la limite de la main.
const handCount = g => g.hand.filter(h => !(h.kind === 'servant' && isPr(h.s))).length;
const handFull = g => handCount(g) >= HAND_MAX;
// Le premier Nythe recruté de la mission ajoute le modèle PR à la main.
function grantPr(g, types, say) {
  if (g.pr || !types.includes('Nythe')) return;
  const s = mkServant({ name: prName(g.prNum), rank: 1, atk: 2, hp: 2, types: ['Nythe'], kw: [], skill: sk('passive', 'prPersist') });
  s.pr = true; g.pr = { s, dead: false };
  g.hand.push({ kind: 'servant', s }); say(`Le modèle ${s.name} rejoint ta main.`);
}
// Applique les améliorations en attente au modèle PR (en main ou en jeu). +X/+Y augmente PV et PV max : les dégâts déjà subis restent.
function flushPr(g, say) {
  const q = PR_QUEUE.splice(0);
  if (!g.pr || g.pr.dead) return;
  const s = g.pr.s;
  q.forEach(b => { s.atk += b.a; s.hp += b.h; s.maxhp += b.h; say(`Le modèle ${s.name} gagne +${b.a}/+${b.h} (${s.atk}/${s.hp}).`); });
}
// Fin de combat : le modèle PR garde ses dégâts ; s'il n'a pas survécu, il est perdu pour la mission.
function syncPr(g, res, say) {
  const pr = g.pr;
  if (!pr || pr.dead || !g.board.includes(pr.s)) return;
  const el = res.survivors.p.find(x => x.uid === pr.s.uid);
  if (el) pr.s.hp = Math.max(1, Math.min(pr.s.maxhp, pr.s.hp - Math.max(0, el.maxhp - el.hp)));
  else { pr.dead = true; g.board = g.board.filter(x => x !== pr.s); say(`Le modèle ${pr.s.name} est détruit définitivement.`); }
}

function applyFx(k, src, allies, enemies, say, bonus, level) {
  const alive = l => l.filter(s => s.hp > 0);
  const buff = (s, a, h) => { s.atk += a; s.hp += h; s.maxhp += h; };
  switch (k.fx) {
    case 'buffSelf':
      buff(src, k.a, k.h); say(`${src.name} gagne +${k.a}/+${k.h}.`); break;
    case 'buffAllies': {
      const c = alive(allies).filter(s => s !== src);
      c.forEach(s => buff(s, k.a, k.h));
      if (c.length) say(`${src.name} donne +${k.a}/+${k.h} aux autres alliés.`); break;
    }
    case 'buffRandomAlly': {
      let c = alive(allies).filter(s => s !== src);
      if (!c.length) c = alive(allies);
      if (c.length) { const t = pick(c); buff(t, k.a, k.h); say(`${src.name} donne +${k.a}/+${k.h} à ${t.name}.`); }
      break;
    }
    case 'buffPerEquip': {
      const x = alive(allies).reduce((n, s) => n + s.equips.length, 0);
      if (x) { buff(src, k.a * x, k.h * x); say(`${src.name} gagne +${k.a * x}/+${k.h * x} (${x} équipement${x > 1 ? 's' : ''}).`); }
      break;
    }
    case 'buffLeftmost': {
      const t = alive(allies)[0];
      if (t) { buff(t, k.a, k.h); say(`${src.name} donne +${k.a}/+${k.h} à ${t.name}.`); }
      break;
    }
    case 'buffEnds': {   // allié le plus à gauche et le plus à droite (un seul s'il est seul)
      const a = alive(allies), c = [...new Set([a[0], a[a.length - 1]])].filter(Boolean);
      c.forEach(s => buff(s, k.a, k.h));
      if (c.length) say(`${src.name} donne +${k.a}/+${k.h} à ${c.map(s => s.name).join(' et ')}.`);
      break;
    }
    case 'buffAdjacent': {
      const i = allies.indexOf(src), c = [allies[i - 1], allies[i + 1]].filter(s => s && s.hp > 0);
      c.forEach(s => buff(s, k.a, k.h));
      if (c.length) say(`${src.name} donne +${k.a}/+${k.h} à ${c.map(s => s.name).join(' et ')}.`);
      break;
    }
    case 'buffEquippedAlly': {
      const c = alive(allies).filter(s => s !== src && s.equips.length);
      if (c.length) { const t = pick(c); buff(t, k.a, k.h); say(`${src.name} donne +${k.a}/+${k.h} à ${t.name} (équipé).`); }
      break;
    }
    case 'buffPerType': case 'buffPerTypeUncapped': {
      const n = k.fx === 'buffPerType' ? Math.min(3, new Set(alive(allies).flatMap(s => s.types)).size) : new Set(alive(allies).flatMap(s => s.types)).size;
      if (n) { buff(src, k.a * n, k.h * n); say(`${src.name} gagne +${k.a * n}/+${k.h * n} (${n} types dans l'équipe).`); }
      break;
    }
    case 'debuffRandomEnemy': {
      const c = alive(enemies);
      if (c.length) { const t = pick(c); t.atk = Math.max(0, t.atk - k.n); say(`${src.name} retire ${k.n} ATQ à ${t.name}.`); }
      break;
    }
    case 'swapStatsMostHp': {
      // Ennemi vivant ayant le plus de PV ; en cas d'égalité, tirage au sort.
      const c = alive(enemies);
      if (!c.length) break;
      const m = Math.max(...c.map(s => s.hp)), t = pick(c.filter(s => s.hp === m));
      [t.atk, t.hp] = [t.hp, t.atk]; t.maxhp = t.hp;
      say(`${src.name} inverse la vie et l'attaque de ${t.name} (${t.atk}/${t.hp}).`); break;
    }
    case 'debuffByLevel': {   // -X/-X à un ennemi aléatoire, X = niveau de renfort actuel (lieutenants seulement : `level` vient de runCombat)
      const c = alive(enemies), x = level || 0;
      if (c.length && x) {
        const t = pick(c);
        t.atk = Math.max(0, t.atk - x); t.hp -= x; t.maxhp = Math.max(1, t.maxhp - x);
        say(`${src.name} inflige -${x}/-${x} à ${t.name}.`);
      }
      break;
    }
    case 'hpRightmostTo1': {
      const c = alive(enemies), t = c[c.length - 1];
      if (t) { t.hp = Math.min(t.hp, 1); say(`${src.name} réduit les PV de ${t.name} à 1.`); }
      break;
    }
    case 'prBoost': if (src.side !== 'e') PR_QUEUE.push({ a: k.a, h: k.h }); break;   // appliqué au modèle PR par flushPr
    case 'prPersist': break;   // règle gérée par syncPr
    case 'triggerBattlecry': break;   // pouvoir actif : voir ACTIVES
    case 'datacube': break;   // joué par renfortFx (il agit sur les Datacrons, pas sur le plateau)
    case 'summon': {
      if (allies.length >= MAX_BOARD) { say(`${src.name} ne peut pas invoquer : plateau plein.`); break; }
      // Les équipements du serviteur renforcent les drones qu'il invoque (droneA / droneH), tout comme le bonus de mission.
      const pa = (src.droneA || 0) + (bonus ? bonus.a : 0), ph = (src.droneH || 0) + (bonus ? bonus.h : 0);
      const a = { uid: uid(), name: 'Drone', rank: 1, atk: k.a + pa, hp: k.h + ph, maxhp: k.h + ph, types: [], kw: [], skill: null, equips: [], eqSkills: [], lrSkills: [], shield: false, reb: false };
      // Un serviteur mort n'est plus sur le plateau (Râle d'agonie) : le drone prend sa place.
      const at = allies.indexOf(src);
      allies.splice(at >= 0 ? at + 1 : Math.min(src.deathIdx || 0, allies.length), 0, a);
      say(`${src.name} invoque un drone ${a.atk}/${a.hp} ${at >= 0 ? 'à sa droite' : 'à sa place'}.`);
      // Chef d'atelier et semblables : chaque allié réagit à l'invocation.
      allies.filter(s => s.hp > 0).forEach(s => skillsOf(s).filter(x => x.t === 'onSummon').forEach(x => {
        buff(a, x.a, x.h); say(`${s.name} : le drone gagne +${x.a}/+${x.h} (${a.atk}/${a.hp}).`);
      }));
      break;
    }
    case 'debuffLeftmost': {
      const t = alive(enemies)[0];
      if (t) { t.atk = Math.max(0, t.atk - k.n); say(`${src.name} retire ${k.n} ATQ à ${t.name}.`); }
      break;
    }
    case 'stripShield': {
      const c = alive(enemies).filter(s => s.shield);
      if (c.length) { const t = pick(c); t.shield = false; say(`${src.name} retire le Bouclier divin de ${t.name}.`); }
      break;
    }
    case 'stripProv': {
      const c = alive(enemies).filter(s => s.kw.includes('prov'));
      c.forEach(s => { s.kw = s.kw.filter(x => x !== 'prov'); });
      if (c.length) say(`${src.name} retire la Provocation de ${c.map(s => s.name).join(', ')}.`);
      break;
    }
    case 'swapHpLeftmost': {
      const t = alive(enemies)[0];
      if (t) { [src.hp, t.hp] = [t.hp, src.hp]; [src.maxhp, t.maxhp] = [t.maxhp, src.maxhp]; say(`${src.name} échange ses PV avec ${t.name} (${src.hp} / ${t.hp}).`); }
      break;
    }
    case 'healLeftmost': {
      const t = alive(allies)[0], n = k.n + (src.healBonus || 0);
      if (t && t.hp < t.maxhp) { const h = Math.min(n, t.maxhp - t.hp); t.hp += h; say(`${src.name} soigne ${h} PV à ${t.name}.`); }
      break;
    }
    case 'healAllies': {
      // Un soin rend des PV jusqu'au maximum, sans jamais le dépasser. healBonus (équipements) augmente chaque soin.
      const n = k.n + (src.healBonus || 0), c = alive(allies).filter(s => s.hp < s.maxhp);
      c.forEach(s => { s.hp = Math.min(s.maxhp, s.hp + n); });
      if (c.length) say(`${src.name} soigne ${n} PV à ${c.length > 1 ? 'tous les alliés blessés' : c[0].name}.`);
      break;
    }
    case 'plantBombs': {
      // Une bombe par ennemi : k.a bombes de k.n dégâts, sur des ennemis différents tant qu'il en reste sans bombe.
      for (let i = 0; i < k.a; i++) {
        const c = alive(enemies).filter(s => !s.bomb);
        if (!c.length) break;
        const t = pick(c); t.bomb = k.n; say(`${src.name} pose une bombe de ${k.n} dégâts sur ${t.name}.`);
      }
      break;
    }
    case 'resurrect': break;   // joué par deaths()
    case 'gainEquip': if (k.t === 'deathrattle') say(`${src.name} : un équipement rejoindra la main.`); break;
    case 'dmgRandomEnemy': {
      const c = alive(enemies);
      if (c.length) { const t = pick(c); hit(t, k.n, null); say(`${src.name} inflige ${k.n} dégâts à ${t.name}.`); }
      break;
    }
  }
}

function applyEquip(s, eq) {
  s.atk += eq.atk; s.hp += eq.hp; s.maxhp += eq.hp;
  if (eq.kw && !s.kw.includes(eq.kw)) s.kw.push(eq.kw);
  s.equips.push(eq.name);
  if (eq.skill) s.eqSkills.push(eq.skill);
  if (eq.mod) { s.droneA += eq.mod.droneA || 0; s.droneH += eq.mod.droneH || 0; s.healBonus = (s.healBonus || 0) + (eq.mod.heal || 0); }
}

// Combat automatique. Travaille sur des copies : les serviteurs du joueur
// « reviennent » donc intacts pour le combat suivant.
function runCombat(playerBoard, enemyBoard, ctx) {
  const frames = [];
  const cl = s => ({ ...s, equips: [...s.equips], eqSkills: [...(s.eqSkills || [])], kw: [...s.kw], shield: shieldCount(s), reb: s.kw.includes('rebirth') && !s.pr, hadShield: shieldCount(s) > 0, shUsed: 0, resUsed: 0 });
  const B = { p: playerBoard.map(x => ({ ...cl(x), side: 'p' })), e: enemyBoard.map(x => ({ ...cl(x), side: 'e' })) };
  const other = side => (side === 'p' ? 'e' : 'p');
  // Lorsqu'un allié perd son Bouclier divin : un porteur du pouvoir le régénère (nombre de fois par combat limité). Vérifié après chaque image.
  let checking = false;
  const checkShields = () => {
    if (checking) return;
    checking = true;
    ['p', 'e'].forEach(side => B[side].forEach(s => {
      if (s.hp <= 0 || !s.hadShield || s.shield) { if (s.shield) s.hadShield = true; return; }
      s.hadShield = false;
      const med = B[side].find(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'shieldLost' && (h.shUsed || 0) < k.n));
      if (!med) return;
      med.shUsed = (med.shUsed || 0) + 1; s.shield = shieldCount(s); s.hadShield = true;
      say(`${med.name} régénère le Bouclier divin de ${s.name}.`);
    }));
    checking = false;
  };
  const say = (msg, hl) => { frames.push({ p: B.p.map(s => ({ ...s })), e: B.e.map(s => ({ ...s })), msg, hl: hl || {} }); checkShields(); };

  function deaths(prio = []) {
    for (let guard = 0; guard < 500; guard++) {
      const all = [...B.p.map(s => ['p', s]), ...B.e.map(s => ['e', s])].filter(([, s]) => s.hp <= 0);
      if (!all.length) return;
      all.sort((a, b) => {
        const ia = prio.indexOf(a[1].uid), ib = prio.indexOf(b[1].uid);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const [side, s] = all[0];
      say(`${s.name} (${side === 'p' ? 'allié' : 'ennemi'}) meurt.`, { dead: [s.uid] });
      s.deathIdx = B[side].indexOf(s);
      B[side].splice(s.deathIdx, 1);
      skillsOf(s).filter(k => k.t === 'deathrattle').forEach(k => {
        applyFx(k, s, B[side], B[other(side)], m => say(m));
        if (k.fx === 'gainEquip' && side === 'p') ctx.gainEquip = (ctx.gainEquip || 0) + 1;   // l'équipement arrive en main au prochain renfort
      });
      // Lorsqu'un ennemi meurt : le Contrebandier récupère l'un de ses équipements, pour ce combat seulement.
      B[other(side)].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => k.t === 'enemyDeath' && k.fx === 'scavenge').forEach(() => {
        const def = EQUIPS.find(e => e.name === pick(s.equips.length ? s.equips : [null]));
        if (def) { applyEquip(h, def); say(`${h.name} récupère ${def.name} de ${s.name}.`); }
      }));
      // Lorsqu'un allié meurt : un porteur de « ressuscite » le ramène à sa place, avec ses caractéristiques du moment (limité par combat).
      // Un allié qui renaît déjà (Renaissance) n'est pas concerné, ni le modèle PR (jamais ressuscité).
      const res = !s.reb && !s.pr && B[side].find(h => h.hp > 0 && skillsOf(h).some(k => k.t === 'allyDeath' && k.fx === 'resurrect' && (h.resUsed || 0) < k.n));
      if (res && B[side].length < MAX_BOARD) {
        res.resUsed = (res.resUsed || 0) + 1;
        B[side].splice(Math.min(s.deathIdx, B[side].length), 0, { ...s, equips: [...s.equips], kw: [...s.kw], uid: uid(), hp: s.maxhp, shield: shieldCount(s), hadShield: shieldCount(s) > 0, reb: false, bomb: 0, perm: 0, shUsed: 0 });
        say(`${res.name} ressuscite ${s.name}.`);
      }
      if (s.reb) {
        if (B[side].length < MAX_BOARD) {
          B[side].push({ ...s, uid: uid(), hp: 1, reb: false, shield: false, hadShield: false, bomb: 0 });
          say(`${s.name} renaît avec 1 PV, à l'extrême droite.`);
        } else say(`${s.name} ne peut pas renaître : plateau plein.`);
      }
    }
  }

  say('Début du combat.');
  const bonusOf = side => (side === 'p' ? ctx.droneBonus : null);
  const startFx = (list, allies, enemies) => list.forEach(s => {
    skillsOf(s).filter(k => k.t === 'startCombat').forEach(k => applyFx(k, s, allies, enemies, m => say(m), bonusOf(allies === B.p ? 'p' : 'e')));
  });
  // « Lorsqu'il y a de la place sur le plateau » : chaque serviteur concerné invoque un drone, un par vérification.
  const fillSpace = () => ['p', 'e'].forEach(side => [...B[side]].forEach(s => {
    if (s.hp > 0 && B[side].includes(s) && B[side].length < MAX_BOARD) skillsOf(s).filter(k => k.t === 'space').forEach(k => applyFx(k, s, B[side], B[other(side)], m => say(m), bonusOf(side)));
  }));
  // Règle : les effets du Boss (pouvoir du donjon) se jouent toujours en tout premier, avant les effets de début de combat des serviteurs et des lieutenants.
  if (ctx.dungeon.boss.power === 'surge') {
    const v = Math.floor((ctx.room - 1) / 3);
    if (v > 0) { B.e.forEach(s => { s.atk += v; s.hp += v; s.maxhp += v; }); say(`${ctx.dungeon.boss.name} : Surcharge, ses serviteurs gagnent +${v}/+${v}.`); }
  }
  if (ctx.dungeon.boss.power === 'plate') {
    B.e.forEach(s => { s.hp += 3; s.maxhp += 3; }); say(`${ctx.dungeon.boss.name} : Blindage, ses serviteurs gagnent +0/+3.`);
  }
  startFx([...B.p], B.p, B.e);
  ctx.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && h.def.power.t === 'startCombat')
      applyFx(h.def.power, { name: h.def.name, kw: [] }, B.p, B.e, m => say(m), null, ctx.level);
  });
  startFx([...B.e], B.e, B.p);
  deaths(); fillSpace(); deaths();

  const Q = { p: [], e: [] };
  const nextAtk = side => {
    for (;;) {
      if (!Q[side].length) Q[side] = B[side].map(s => s.uid);
      const id = Q[side].shift();
      const s = B[side].find(x => x.uid === id);
      if (s) return s;
    }
  };
  // Provocation : on ne vise que les ennemis qui l'ont. Exception : les pouvoirs « Cible » (PV les plus bas)
  // l'emportent sur la Provocation ; si aucun ne s'applique, la règle normale joue.
  const target = (side, A) => {
    const foes = B[other(side)];
    for (const k of skillsOf(A).filter(x => x.t === 'passive')) {
      if (k.fx === 'targetLowestHp') { const m = Math.min(...foes.map(s => s.hp)); return pick(foes.filter(s => s.hp === m)); }
    }
    const pv = foes.filter(s => s.kw.includes('prov'));
    return pick(pv.length ? pv : foes);
  };
  let cur = B.e.length > B.p.length ? 'e' : 'p';   // égalité : le joueur commence
  let attacks = 0, fatigue = 0;
  if (B.p.length && B.e.length) say(cur === 'p' ? 'Le joueur attaque en premier.' : 'Le Boss attaque en premier.');
  while (B.p.length && B.e.length && attacks < 3000) {
    if (attacks >= FATIGUE_START) {
      fatigue++;
      [...B.p, ...B.e].forEach(s => { s.hp -= fatigue; });
      say(`Usure : ${fatigue} dégâts à tous les serviteurs.`);
      deaths();
      if (!B.p.length || !B.e.length) break;
    }
    const A = nextAtk(cur), T = target(cur, A);
    // Bombe : au lieu d'attaquer, le serviteur piégé fait exploser sa bombe, qui ne blesse que lui (Bouclier divin applicable).
    if (A.bomb) {
      const d = A.bomb; A.bomb = 0;
      hit(A, d, null);
      say(`La bombe de ${A.name} explose : ${d} dégâts, il n'attaque pas.`, { tgt: A.uid });
      deaths([A.uid]); fillSpace(); deaths();
      attacks++; cur = other(cur);
      continue;
    }
    const dA = A.atk, dT = A.kw.includes('ranged') ? 0 : T.atk;
    if (cur === 'e' && ctx.dungeon.boss.power === 'frenzy') { A.atk += 1; say(`Écho : ${A.name} gagne +1 ATQ.`); }
    // Assaut : se déclenche quand le serviteur attaque, avant les dégâts de l'attaque.
    skillsOf(A).filter(k => k.t === 'assault').forEach(k => applyFx(k, A, B[cur], B[other(cur)], m => say(m), bonusOf(cur)));
    if (T.shield && skillsOf(A).some(k => k.fx === 'breakShield')) { T.shield = 0; say(`${A.name} détruit le Bouclier divin de ${T.name}.`); }
    hit(T, dA, A); hit(A, dT, T);          // dégâts et riposte simultanés
    say(`${A.name} attaque ${T.name} (${dA} dégâts${dT ? `, riposte ${dT}` : ', sans riposte'}).`, { att: A.uid, tgt: T.uid, ranged: A.kw.includes('ranged') });
    // Après chaque attaque reçue par un allié, les serviteurs concernés soignent cet allié (jamais au-delà de ses PV maximum).
    if (T.hp > 0) B[other(cur)].filter(h => h.hp > 0).forEach(h => skillsOf(h).filter(k => k.t === 'onAllyHit').forEach(k => {
      const heal = Math.min(k.n + (h.healBonus || 0), T.maxhp - T.hp);
      if (heal > 0) { T.hp += heal; say(`${h.name} soigne ${heal} PV à ${T.name}.`); }
    }));
    // Lorsqu'il survit à une attaque : gain immédiat, conservé après le combat (appliqué au serviteur du plateau par endCombatFx).
    if (T.hp > 0) skillsOf(T).filter(k => k.t === 'survive' && k.fx === 'permAtk').forEach(k => {
      T.atk += k.a; T.perm = (T.perm || 0) + k.a; say(`${T.name} survit et gagne définitivement +${k.a} ATQ.`);
    });
    if (ctx.dungeon.boss.power === 'regen') {
      B.e.forEach(s => { if (s.hp > 0) s.hp = Math.min(s.maxhp, s.hp + 2); });
      say('Régénération : les serviteurs du Boss récupèrent 2 PV.');
    }
    deaths([A.uid, T.uid]); fillSpace(); deaths();
    attacks++; cur = other(cur);
  }
  const winner = B.p.length && !B.e.length ? 'p' : B.e.length && !B.p.length ? 'e' : 'draw';
  say(winner === 'p' ? 'Combat remporté.' : winner === 'e' ? 'Combat perdu.' : 'Égalité : les deux camps sont vides.');
  return { frames, winner, survivors: { p: B.p, e: B.e }, attacks };
}

// ---------- Partie ----------
function newGame(heroIds, dungeonId) {
  const dungeon = DUNGEONS[dungeonId];
  const heroes = heroIds.map(id => ({ def: HEROES[id], hp: HEROES[id].hp, maxhp: HEROES[id].hp }));
  const types = [...new Set([...heroes.flatMap(h => h.def.types), dungeon.type])];
  // Trois comportements différents, tirés au hasard : un par plateau du Boss.
  const behaviors = Object.keys(BOSS_BEHAVIORS).sort(() => Math.random() - 0.5).slice(0, BOSS_BOARDS.length);
  return {
    heroes, dungeon, types,
    boss: { name: dungeon.boss.name, hp: dungeon.boss.hp, maxhp: dungeon.boss.hp },
    // Le Boss puise dans les mêmes types que les lieutenants (plus celui du donjon) ; chaque plateau démarre avec son Dummy.
    bossTeams: BOSS_BOARDS.map((b, i) => makeTeam(types, b.malus, { ...dungeon.dummies[i], bg: dungeon.id }, behaviors[i])),
    bossCur: -1, bossLast: -1, bossLog: [],
    board: [],                    // règle : on commence sans serviteur sur le plateau
    room: 1, level: 1, counter: 0, over: null,
    gainEquip: 0,                 // équipements à recevoir en main au prochain renfort (Râle d'agonie du Chasseur de reliques)
    droneBonus: { a: 0, h: 0 },   // Maître des drones : bonus permanent des drones du joueur
    hand: [], datacrons: 0, cubeBag: [], pr: null, prNum: prWins() + 1, stats: { earned: 0, servants: 0, equips: 0, contrib: 0, fusions: 0, discarded: 0 }
  };
}
const levelCost = lvl => lvl + 2;    // niveau N -> N+1 : N+2 Datacrons de contribution (provisoire)

// ---------- Plateaux du Boss ----------
// Chaque plateau est un « joueur » automatique, avec sa main, son niveau de renfort et ses Datacrons.
// Il utilise les mêmes fonctions que le joueur (tirage de 3 cartes, pose, équipement, fusion).
function makeTeam(types, malus, dummy, behavior = 'equilibre') {
  return { types, malus, behavior, heroes: [], board: dummy ? [mkServant(dummy)] : [], hand: [], level: 1, counter: 0, datacrons: 0,
           stats: { earned: 0, servants: 0, equips: 0, contrib: 0, fusions: 0, discarded: 0 } };
}
const powerOf = s => s.rank * 10 + s.atk + s.hp + (s.equips ? s.equips.length * 2 : 0);
const cardScore = c => c.rank * 10 + c.atk + c.hp + (c.kw ? (Array.isArray(c.kw) ? c.kw.length : 1) * 3 : 0) + ((c.skill ? 4 : 0) + (c.extra ? c.extra.length * 4 : 0));
const bestOf = (cards, score = cardScore) => cards.reduce((b, c) => (score(c) > score(b) ? c : b));

// Pose ce que la main contient : serviteurs sur le plateau (ou à la place du plus faible s'il est plein),
// équipements sur le serviteur le plus fort ; le reste est jeté.
function aiPlace(t, say) {
  for (let i = t.hand.length - 1; i >= 0; i--) {
    const h = t.hand[i];
    if (h.kind === 'servant') {
      if (t.board.length < MAX_BOARD) placeServant(t, i, null, say);
      else {
        const free = t.board.map((s, j) => j).filter(j => !t.board[j].fixed);   // les Dummies ne sont jamais remplacés
        const wi = free.reduce((w, j) => (powerOf(t.board[j]) < powerOf(t.board[w]) ? j : w), free[0]);
        if (free.length && powerOf(h.s) > powerOf(t.board[wi])) placeServant(t, i, wi, say); else { t.hand.splice(i, 1); t.stats.discarded++; }
      }
    } else if (t.board.length) {
      const target = (bhv(t).target || (x => x.board.reduce((b, s) => (powerOf(s) > powerOf(b) ? s : b))))(t);
      applyEquip(target, h.def); t.hand.splice(i, 1);
    }
  }
  if (t.board.length && t.hand.some(h => h.kind === 'equip')) aiPlace(t, say);   // équipement reçu d'un cri de guerre
}

const bhv = t => BOSS_BEHAVIORS[t.behavior] || BOSS_BEHAVIORS.equilibre;
function aiRenfort(t, room, say) {
  const b = bhv(t);
  // Salle 1 : aucun Datacron, le plateau reste le Dummy seul (sinon il serait imbattable) ; ses pouvoirs de renfort jouent quand même.
  const inc = room === 1 ? 0 : Math.max(1, incomeFor(room) - (t.malus >= 1 ? 1 : Math.random() < t.malus ? 1 : 0));
  t.datacrons += inc; t.stats.earned += inc;
  renfortFx(t, 'startRenfort', say);
  const rf = { reward: null };
  const want = b.want(room);
  for (let guard = 0; t.datacrons >= 1 && guard < 40; guard++) {
    const held = t.board.length + t.hand.filter(h => h.kind === 'servant').length;
    let act;
    if (held < want) act = 'servant';
    else if (t.level < MAX_LEVEL && t.level < b.level(room)) act = 'level';
    else act = t.board.length && Math.random() < b.equipP ? 'equip' : 'servant';
    t.datacrons--;
    if (act === 'level') {
      t.counter++;
      if (t.counter >= levelCost(t.level)) { t.counter -= levelCost(t.level); t.level++; if (t.level >= MAX_LEVEL) t.counter = 0; }
      continue;
    }
    const card = bestOf(drawCards(t, act, t.level), act === 'servant' && b.score ? c => b.score(t, c) : cardScore);
    if (!card) continue;
    t.hand.push(act === 'servant' ? { kind: 'servant', s: mkServant(card) } : { kind: 'equip', def: card });
    aiPlace(t, say);
    for (let f = 0; f < 5 && resolveFusion(t, rf, say); f++) {
      if (rf.reward) { t.hand.push({ kind: 'servant', s: mkServant(bestOf(rf.reward.cards)) }); rf.reward = null; }
      aiPlace(t, say);
    }
  }
  renfortFx(t, 'endRenfort', say);
}

// Au début de chaque salle, les trois plateaux se renforcent, puis le Boss en présente un,
// toujours différent de celui de la salle précédente.
function bossRenfort(g) {
  g.bossLog = [];
  g.bossTeams.forEach((t, i) => aiRenfort(t, g.room, m => g.bossLog.push(`[Plateau ${i + 1}] ${m}`)));
  const choices = [0, 1, 2].filter(i => i !== g.bossLast);
  g.bossCur = pick(choices); g.bossLast = g.bossCur;
  g.bossLog.push(`Le Boss présente le plateau ${g.bossCur + 1}.`);
}

// Tirage d'un choix du renfort : 3 cartes (3 à 5 selon le niveau) au hasard dans un pool infini, rang max = maxRank,
// rangs inférieurs possibles. exact = true : uniquement le rang maxRank (récompense de fusion).
function drawCards(g, kind, maxRank, exact) {
  const pool = kind === 'servant'
    ? SERVANTS.filter(x => x.types.some(t => g.types.includes(t)))
    : EQUIPS.filter(e => !e.type || g.types.includes(e.type));
  const weightOf = x => kind === 'servant' ? 1 + x.types.filter(t => g.types.includes(t)).length : 1;
  const res = [], count = exact ? PROPOSALS : renfortProposals(maxRank);
  for (let guard = 0; res.length < count && guard < 100; guard++) {
    const r = exact || Math.random() < 0.6 ? maxRank : 1 + rand(maxRank);
    let c = pool.filter(x => x.rank === r && !res.includes(x));
    if (!c.length) c = pool.filter(x => x.rank <= r && !res.includes(x));
    // Jamais au-dessus du rang maximum : si le pool des types de la partie est trop mince, une carte peut être proposée en double.
    if (!c.length) c = pool.filter(x => x.rank <= r);
    if (!c.length) { const low = Math.min(...pool.map(x => x.rank)); c = pool.filter(x => x.rank === low); }
    if (!c.length) break;
    const w = c.map(weightOf); let t = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
    while (t > w[i] && i < c.length - 1) { t -= w[i]; i++; }
    res.push(c[i]);
  }
  return res;
}

// Équipement du niveau de renfort actuel (rang égal au niveau, sinon le plus haut rang en dessous), parmi ceux accessibles à la partie.
function randomEquip(g) {
  const pool = EQUIPS.filter(e => !e.type || g.types.includes(e.type));
  for (let r = g.level; r >= 1; r--) { const c = pool.filter(e => e.rank === r); if (c.length) return pick(c); }
  return null;
}
// Datacube : sac de billes contenant deux fois chaque face ; on tire sans remise et on remplit le sac quand il est vide.
function drawCube(g) {
  if (!g.cubeBag.length) g.cubeBag = [...CUBE_FACES, ...CUBE_FACES];
  return g.cubeBag.splice(rand(g.cubeBag.length), 1)[0];
}
// Pouvoir actif « grantRebirth » : Renaissance temporaire, retirée à l'ouverture du renfort suivant (voir expireTemp).
function grantRebirth(g, uid, say) {
  const s = g.board.find(x => x.uid === uid);
  if (!s || isPr(s) || s.kw.includes('rebirth')) return false;
  s.kw.push('rebirth'); s.tmpReb = true;
  say(`${s.name} gagne Renaissance jusqu'au prochain renfort.`);
  return true;
}
// Halana la Présciente : le serviteur découvert arrive dans la main (jamais directement sur le plateau) dès que PROPHECY_COST Datacrons ont été dépensés.
function checkProphecy(g, say) {
  const p = g.prophecy;
  if (!p || p.done || (g.spent || 0) < PROPHECY_COST) return;
  const s = mkServant(p.card);
  if (handFull(g)) return;   // main pleine : il attend qu'une place se libère
  g.hand.push({ kind: 'servant', s });
  p.done = true; g.stats.servants++; say(`${s.name} arrive en jeu : ${PROPHECY_COST} Datacrons utilisés.`);
}
function expireTemp(g) {
  g.board.forEach(s => { if (s.tmpReb) { s.kw = s.kw.filter(k => k !== 'rebirth'); delete s.tmpReb; } });
  g.heroes.forEach(h => { h.used = false; });
}
function renfortFx(g, trig, say) {
  g.board.slice().forEach(s => {
    skillsOf(s).filter(k => k.t === trig).forEach(k => applyFx(k, s, g.board, [], say));
  });
  g.heroes.forEach(h => {
    if (h.hp > 0 && h.def.power && h.def.power.t === trig && h.def.power.fx === 'datacube') {
      const r = drawCube(g); g.cubeRoll = r; g.cubeBefore = g.datacrons;   // lu par l'interface pour jouer l'animation (playCube)
      g.datacrons = Math.max(0, g.datacrons + r); if (r > 0) g.stats.earned += r;
      say(`${h.def.name} lance un datacube : ${r > 0 ? '+' : ''}${r} Datacron${Math.abs(r) > 1 ? 's' : ''}.`);
    } else if (h.hp > 0 && h.def.power && h.def.power.t === trig)
      applyFx(h.def.power, { name: h.def.name, kw: [] }, g.board, [], say);
  });
  flushPr(g, say);
}
// Pose d'un serviteur de la main sur le plateau (remplacement si replaceIdx).
function placeServant(g, handIdx, replaceIdx, say) {
  const s = g.hand[handIdx].s;
  g.hand.splice(handIdx, 1);
  if (replaceIdx != null) { say(`${g.board[replaceIdx].name} est remplacé (ses équipements sont perdus).`); g.board.splice(replaceIdx, 1, s); }
  else g.board.push(s);
  say(`${s.name} rejoint le plateau.`);
  triggerBattlecry(g, s, say);
}
// Cri de guerre d'un serviteur : à sa pose, ou déclenché de nouveau par un pouvoir actif (Waven). Renvoie false s'il n'en a pas.
const battlecriesOf = s => skillsOf(s).filter(k => k.t === 'battlecry');
function triggerBattlecry(g, s, say) {
  const cries = battlecriesOf(s);
  cries.forEach(k => {
    applyFx(k, s, g.board, [], say); flushPr(g, say);
    if (k.fx === 'gainEquip') {
      const def = randomEquip(g);
      if (def && !handFull(g)) { g.hand.push({ kind: 'equip', def }); g.stats.equips++; say(`${def.name} rejoint la main.`); }
      else if (def) say(`Main pleine : ${def.name} est perdu.`);
    }
  });
  return cries.length > 0;
}
// Pouvoirs actifs des lieutenants (une fois par renfort) : libellé du bouton, cibles possibles, effet. Utilisé par l'interface.
const ACTIVES = {
  grantRebirth: { label: 'Renaissance', icon: 'Xénobiologiste', color: '#a8d94a', ok: (g, s) => !isPr(s) && !s.kw.includes('rebirth'),
                  run: (g, uid, say) => grantRebirth(g, uid, say) },
  triggerBattlecry: { label: 'Cri de guerre', icon: 'Diplomate', color: '#4f8cff', ok: (g, s) => battlecriesOf(s).length > 0,
                  run: (g, uid, say) => { const s = g.board.find(x => x.uid === uid); if (!s || !battlecriesOf(s).length) return false; say(`${s.name} rejoue son cri de guerre.`); return triggerBattlecry(g, s, say); } }
};

// Compétence d'un doré : valeurs doublées, sauf le Bouclier à plusieurs coups qui gagne un coup (2 -> 3).
const goldSkill = k => k.fx === 'shieldCharges' ? { ...k, n: k.n + 1 } : { ...k, a: k.a * 2, h: k.h * 2, n: k.n * 2 };

// Fusion simple de trois serviteurs identiques (même nom, non dorés), plateau et main confondus.
// Le doré additionne leurs statistiques et double les valeurs de sa compétence.
// Retourne true si une fusion a eu lieu (une récompense est alors à choisir).
function resolveFusion(g, rf, say) {
  const all = [...g.board.map(s => ({ s })), ...g.hand.filter(h => h.kind === 'servant').map(h => ({ s: h.s }))].filter(x => !x.s.fixed);   // un Dummy ne fusionne pas
  const names = [...new Set(all.filter(x => !x.s.gold).map(x => x.s.name))];
  const name = names.find(n => all.filter(x => !x.s.gold && x.s.name === n).length >= 3);
  if (!name) return false;
  const trio = all.filter(x => !x.s.gold && x.s.name === name).slice(0, 3).map(x => x.s);
  const sum = k => trio.reduce((a, x) => a + x[k], 0);
  const k = trio[0].skill;
  const gold = {
    uid: uid(), name: `${name} doré`, rank: trio[0].rank, atk: sum('atk'), hp: sum('hp'), maxhp: sum('maxhp'),
    types: [...trio[0].types], kw: [...new Set(trio.flatMap(x => x.kw.filter(k => !(k === 'rebirth' && x.tmpReb))))], gold: true,
    skill: k ? goldSkill(k) : null, extra: (trio[0].extra || []).map(goldSkill), equips: trio.flatMap(x => x.equips),
    eqSkills: trio.flatMap(x => x.eqSkills || []), lrSkills: trio.flatMap(x => x.lrSkills || []), droneA: trio.reduce((a, x) => a + (x.droneA || 0), 0), droneH: trio.reduce((a, x) => a + (x.droneH || 0), 0)
  };
  const ids = new Set(trio.map(x => x.uid));
  const bi = g.board.findIndex(x => ids.has(x.uid));
  if (bi >= 0) g.board[bi] = gold;
  else g.hand[g.hand.findIndex(h => h.kind === 'servant' && ids.has(h.s.uid))] = { kind: 'servant', s: gold };
  g.board = g.board.filter(x => x === gold || !ids.has(x.uid));
  g.hand = g.hand.filter(h => h.kind !== 'servant' || h.s === gold || !ids.has(h.s.uid));
  g.stats.fusions++;
  const r = Math.min(MAX_RANK, g.level + 1);
  rf.reward = { rank: r, cards: drawCards(g, 'servant', r, true) };
  say(`Fusion : trois ${name} deviennent ${gold.name} ! Choisis une récompense de rang ${r}.`);
  return true;
}

// ---------- Adaptation (pouvoir signature des Elk) ----------
// Fin de combat : chaque Elk survivant choisit entre un bonus +N/+N (N = niveau de renfort) et un pouvoir (mot-clé ou compétence) d'un autre survivant.
// Un survivant : son pouvoir ; deux : leurs deux pouvoirs ; davantage : deux pouvoirs tirés au hasard. Une capacité apprise est définitive pour la mission.
const isAdapt = k => k.fx === 'adapt';
const capKey = c => c.stat ? `stat:${c.stat}` : c.kw ? `kw:${c.kw}` : `sk:${c.skill.t}:${c.skill.fx}:${c.skill.a}:${c.skill.h}:${c.skill.n}`;
const capOwned = (s, c) => c.stat ? false : c.kw ? s.kw.includes(c.kw) : skillsOf(s).some(k => capKey({ skill: k }) === capKey(c));
const capLabel = c => c.stat ? `+${c.stat}/+${c.stat} (niveau de renfort ${c.stat})` : c.kw ? KW[c.kw] : skDesc(c.skill);
// Une capacité à apprendre ne doit pas être un cri de guerre (il ne se redéclenche jamais) ni l'Adaptation elle-même.
const capsOf = s => [...s.kw.map(kw => ({ kw })), ...skillsOf(s).filter(k => !isAdapt(k) && k.t !== 'battlecry').map(skill => ({ skill }))];
// Un serviteur renaît avec un nouvel identifiant : seuls les survivants encore présents sur le plateau (même uid) comptent.
function adaptationOffers(g, res) {
  const surv = res.survivors.p, offers = [];
  surv.forEach(el => {
    const mine = g.board.find(s => s.uid === el.uid);
    if (!mine || !mine.types.includes('Elk') || !skillsOf(mine).some(isAdapt)) return;
    // Toujours le bonus +N/+N ; en plus, le pouvoir d'un autre survivant (un seul survivant : le sien), au plus deux pouvoirs,
    // tirés au hasard parmi les survivants s'il y en a plus de deux.
    const seen = new Set(), options = [{ stat: g.level, from: null }];
    surv.filter(o => o !== el).sort(() => Math.random() - 0.5).forEach(o => {
      if (options.length >= 3) return;
      const caps = capsOf(o).filter(c => !capOwned(mine, c) && !seen.has(capKey(c))).sort(() => Math.random() - 0.5);
      if (caps.length) { seen.add(capKey(caps[0])); options.push({ ...caps[0], from: o.name }); }
    });
    offers.push({ uid: mine.uid, name: mine.name, options });
  });
  return offers;
}
function learnCapability(g, uid, cap) {
  const s = g.board.find(x => x.uid === uid);
  if (!s || capOwned(s, cap)) return null;
  if (cap.stat) { s.atk += cap.stat; s.hp += cap.stat; s.maxhp += cap.stat; return `${s.name} s'adapte : ${capLabel(cap)}.`; }
  if (cap.kw) s.kw.push(cap.kw); else s.lrSkills.push({ ...cap.skill });
  return `${s.name} apprend « ${capLabel(cap)} » (de ${cap.from}).`;
}

// Effets de fin de combat des survivants du joueur (Maître des drones : bonus permanent des drones). Retourne les lignes de journal.
function endCombatFx(g, res) {
  const lines = [];
  syncPr(g, res, m => lines.push(m));
  res.survivors.p.forEach(el => {
    const mine = g.board.find(s => s.uid === el.uid);
    if (!mine) return;
    if (el.perm) { mine.atk += el.perm; lines.push(`${mine.name} conserve définitivement +${el.perm} ATQ.`); }
    skillsOf(mine).filter(k => k.t === 'endCombat' && k.fx === 'droneBonus').forEach(k => {
      g.droneBonus.a += k.a; g.droneBonus.h += k.h;
      lines.push(`${mine.name} : vos drones seront invoqués avec +${g.droneBonus.a}/+${g.droneBonus.h} jusqu'à la fin de la mission.`);
    });
  });
  flushPr(g, m => lines.push(m));
  return lines;
}

// Règle : fin de combat, les survivants du camp gagnant infligent leur rang.
function settleCombat(g, res) {
  const lines = [];
  if (res.winner === 'p') {
    const dmg = res.survivors.p.reduce((a, s) => a + s.rank, 0);
    g.boss.hp = Math.max(0, g.boss.hp - dmg);
    lines.push(`Vos survivants (${res.survivors.p.map(s => `${s.name} R${s.rank}`).join(', ')}) infligent ${dmg} dégâts au Boss.`);
    if (g.boss.hp <= 0) { g.over = 'win'; prRecordWin(); lines.push('Le Boss est vaincu !'); }
  } else if (res.winner === 'e') {
    let shield = g.heroes.map(h => h.hp > 0 && h.def.kw === 'shield');
    for (const s of res.survivors.e) {
      const live = g.heroes.map((h, i) => i).filter(i => g.heroes[i].hp > 0);
      if (!live.length) break;
      const prov = live.filter(i => g.heroes[i].def.kw === 'prov');
      const i = prov.length === 1 ? prov[0] : pick(live);
      const h = g.heroes[i];
      if (shield[i]) { shield[i] = false; lines.push(`${s.name} frappe ${h.def.name} (${s.rank}) : annulé par le Bouclier divin.`); continue; }
      h.hp = Math.max(0, h.hp - s.rank);
      lines.push(`${s.name} frappe ${h.def.name} : ${s.rank} dégâts${h.hp <= 0 ? ' — il tombe !' : ''}.`);
    }
    if (g.heroes.every(h => h.hp <= 0)) { g.over = 'lose'; lines.push('Les deux héros sont à terre.'); }
  } else lines.push('Égalité : aucun dégât.');
  g.room++;
  return lines;
}
