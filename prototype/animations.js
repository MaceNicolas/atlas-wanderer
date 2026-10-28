// Atlas Wanderer — animations de combat : charge d'une carte sur sa cible, projectile, impact,
// chiffres flottants, mort, apparition. S'appuie sur l'API Web Animations et sur data-uid des cartes.
'use strict';
const cardEl = uid => (uid == null ? null : document.querySelector(`[data-uid="${uid}"]`));
const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

// Texte qui monte et s'efface au-dessus d'une carte (dégâts, bonus, soin, Bouclier divin).
function floatText(el, text, color) {
  const { x, r } = centerOf(el), n = (el._fx = (el._fx || 0) + 1) - 1, T = UI.pb.speed;
  const span = document.createElement('div');
  span.textContent = text;
  span.style.cssText = `position:fixed;left:${x}px;top:${r.top + r.height * 0.35 + n * 24}px;transform:translateX(-50%);z-index:100;pointer-events:none;` +
    `font:800 24px system-ui,sans-serif;color:${color};text-shadow:0 2px 4px #000,0 0 8px #000;white-space:nowrap`;
  document.body.appendChild(span);
  const a = span.animate([{ opacity: 0, transform: 'translate(-50%,10px) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-6px) scale(1.15)', offset: .2 },
    { opacity: 1, transform: 'translate(-50%,-26px) scale(1)', offset: .7 }, { opacity: 0, transform: 'translate(-50%,-44px) scale(1)' }], { duration: Math.min(1100, T * 1.3), easing: 'ease-out' });
  a.onfinish = () => span.remove();
}

// Phase « avant l'impact » : la carte qui attaque fonce vers sa cible, ou un projectile part (À distance).
function playLunge(f) {
  const a = cardEl(f.hl.att), t = cardEl(f.hl.tgt), L = UI.pb.speed * 0.4;
  UI.pb.lunge = null;
  if (!a || !t) return;
  const ca = centerOf(a), ct = centerOf(t), dx = ct.x - ca.x, dy = ct.y - ca.y;
  a.style.position = 'relative'; a.style.zIndex = 30;
  if (f.hl.ranged) {
    a.animate([{ transform: 'scale(1)' }, { transform: 'translate(0,6px) scale(1.04)' }], { duration: L, fill: 'forwards' });
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;left:${ca.x - 9}px;top:${ca.y - 9}px;width:18px;height:18px;border-radius:50%;z-index:90;pointer-events:none;` +
      'background:radial-gradient(circle,#fff,#ffd45e 45%,#ff8a2b);box-shadow:0 0 14px 6px #ffb347';
    document.body.appendChild(p);
    p.animate([{ transform: 'translate(0,0) scale(.6)' }, { transform: `translate(${dx}px,${dy}px) scale(1.1)` }], { duration: L, easing: 'ease-in' }).onfinish = () => p.remove();
  } else {
    a.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.8}px,${dy * 0.8}px) scale(1.1)` }], { duration: L, easing: 'cubic-bezier(.5,0,.9,.4)', fill: 'forwards' });
    UI.pb.lunge = { uid: f.hl.att, dx: dx * 0.8, dy: dy * 0.8 };
  }
}

// Phase « impact » : compare l'image précédente et l'image courante et anime les différences.
function playImpact(prev, cur) {
  const T = UI.pb.speed, flat = fr => new Map([...fr.p, ...fr.e].map(s => [s.uid, s]));
  const before = flat(prev), after = flat(cur);
  const L = UI.pb.lunge;
  if (L && cardEl(L.uid)) {          // la carte qui a chargé revient à sa place
    const el = cardEl(L.uid); el.style.position = 'relative'; el.style.zIndex = 30;
    el.animate([{ transform: `translate(${L.dx}px,${L.dy}px) scale(1.1)` }, { transform: 'translate(0,0) scale(1)' }], { duration: T * 0.3, easing: 'ease-out' });
  }
  UI.pb.lunge = null;
  after.forEach((s, uid) => {
    const el = cardEl(uid); if (!el) return;
    const o = before.get(uid);
    if (!o) {                        // invocation ou renaissance
      el.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.12)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: T * 0.6, easing: 'ease-out' });
      return;
    }
    const dmg = o.hp - s.hp, buffA = s.atk - o.atk, buffH = s.maxhp - o.maxhp;
    if (dmg > 0) {
      el.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-9px)', filter: 'brightness(2.2) saturate(1.5)', offset: .2 },
        { transform: 'translateX(8px)', filter: 'brightness(1.5)', offset: .45 }, { transform: 'translateX(-4px)', offset: .7 }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: T * 0.45 });
      floatText(el, `−${dmg}`, '#ff6b5e');
    } else if (buffA > 0 || buffH > 0) {
      el.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(1.7) saturate(1.4)', transform: 'scale(1.07)', offset: .4 }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: T * 0.6 });
      floatText(el, `+${Math.max(buffA, 0)}/+${Math.max(buffH, 0)}`, '#6ee7a0');
    } else if (dmg < 0) {            // soin
      el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)', offset: .4 }, { filter: 'brightness(1)' }], { duration: T * 0.5 });
      floatText(el, `+${-dmg}`, '#6ee7a0');
    } else if (buffA < 0) {          // affaiblissement
      floatText(el, `${buffA} ATQ`, '#f0a53a');
    }
    if (o.shield && !s.shield) {     // Bouclier divin consommé
      el.animate([{ filter: 'drop-shadow(0 0 0 #6fe3ff)' }, { filter: 'drop-shadow(0 0 22px #6fe3ff) brightness(1.4)', offset: .35 }, { filter: 'drop-shadow(0 0 0 #6fe3ff)' }], { duration: T * 0.7 });
      floatText(el, 'Bouclier !', '#6fe3ff');
    }
  });
  (cur.hl.dead || []).forEach(uid => {
    const el = cardEl(uid);
    if (el) el.animate([{ opacity: 1, transform: 'scale(1) rotate(0)' }, { opacity: 0, transform: 'scale(.65) rotate(-7deg)' }], { duration: T * 0.55, fill: 'forwards', easing: 'ease-in' });
  });
}

// Datacube de Flam'Gruk : un dé enflammé tombe au centre de l'écran, roule jusqu'à la face tirée, puis le résultat file vers le compteur de Datacrons.
// Purement visuel : le tirage a déjà eu lieu dans renfortFx, `roll` en est le résultat. onLand : appelé quand le résultat atteint le compteur.
const CUBE_VIEW = [   // rotation qui amène chaque face (dans l'ordre de CUBE_FACES) face à l'écran
  [0, 0], [0, 180], [0, -90], [0, 90], [-90, 0], [90, 0]];
function playCube(roll, onLand) {
  const size = 110, half = size / 2, T = 2800, gain = roll > 0, col = gain ? '#ffb347' : '#8fb8ff';
  const i = CUBE_FACES.indexOf(roll), [rx, ry] = CUBE_VIEW[i < 0 ? 0 : i];
  const fl = document.createElement('div');
  fl.style.cssText = 'position:fixed;inset:0;z-index:120;pointer-events:none;display:flex;align-items:center;justify-content:center';
  const faces = CUBE_VIEW.map(([fx, fy], k) => {
    const v = CUBE_FACES[k], neg = v < 0;
    return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:14px;` +
      `font:900 52px system-ui,sans-serif;color:${neg ? '#dbe8ff' : '#2a1100'};backface-visibility:hidden;` +
      `background:${neg ? 'linear-gradient(145deg,#31507f,#122340)' : 'linear-gradient(145deg,#ffe08a,#ff8a2b 70%,#d9480f)'};` +
      `border:3px solid ${neg ? '#8fb8ff' : '#fff1b8'};box-shadow:inset 0 0 18px rgba(0,0,0,.35);` +
      `transform:rotateX(${-fx}deg) rotateY(${-fy}deg) translateZ(${half}px)">${v > 0 ? '+' : ''}${v}</div>`;
  }).join('');
  // le halo (filter) est sur l'enveloppe : un filter sur le cube lui-même aplatirait la 3D
  fl.innerHTML = `<div style="perspective:600px"><div class="cube" style="position:relative;width:${size}px;height:${size}px;transform-style:preserve-3d">${faces}</div></div>`;
  document.body.appendChild(fl);
  const wrap = fl.firstChild, cube = wrap.firstChild;
  const spin = `rotateX(${rx + 360}deg) rotateY(${ry + 720}deg)`, rest = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  // chute, rebond, roulé
  fl.animate([{ transform: 'translateY(-60vh)' }, { transform: 'translateY(0)', offset: .35, easing: 'ease-in' }, { transform: 'translateY(-70px)', offset: .5, easing: 'ease-out' },
    { transform: 'translateY(0)', offset: .65, easing: 'ease-in' }, { transform: 'translateY(0)' }], { duration: T * .9 });
  cube.animate([{ transform: spin }, { transform: rest }], { duration: T * .85, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
  // halo de flammes qui vacille
  const glow = wrap.animate([{ filter: `drop-shadow(0 0 10px ${col})` }, { filter: `drop-shadow(0 -8px 26px ${col}) drop-shadow(0 0 40px #ff5a1f)` }, { filter: `drop-shadow(0 0 10px ${col})` }],
    { duration: 380, iterations: Infinity });
  // étincelles
  for (let k = 0; k < 14; k++) {
    const s = document.createElement('div'), a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 90;
    s.style.cssText = `position:absolute;left:50%;top:50%;width:${4 + Math.random() * 5}px;height:${4 + Math.random() * 5}px;border-radius:50%;background:${gain ? '#ffd45e' : '#bcd4ff'};box-shadow:0 0 8px ${col}`;
    fl.appendChild(s);
    s.animate([{ opacity: 0, transform: 'translate(-50%,-50%)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 60}px)` }],
      { duration: 700 + Math.random() * 500, delay: T * .55 + Math.random() * 250, fill: 'backwards', easing: 'ease-out' }).onfinish = () => s.remove();
  }
  // le résultat s'envole vers le compteur de Datacrons
  setTimeout(() => {
    glow.cancel();
    const tgt = document.querySelector('[title="Datacrons"]'), from = centerOf(cube), to = tgt ? centerOf(tgt) : { x: from.x, y: from.y - 200 };
    const n = document.createElement('div');
    n.textContent = `${roll > 0 ? '+' : ''}${roll} ◈`;
    n.style.cssText = `position:fixed;left:${from.x}px;top:${from.y}px;z-index:121;pointer-events:none;font:900 40px system-ui,sans-serif;color:${gain ? '#ffd45e' : '#9cc2ff'};` +
      `text-shadow:0 2px 4px #000,0 0 16px ${col};white-space:nowrap`;
    document.body.appendChild(n);
    cube.animate([{ opacity: 1 }, { opacity: 0, transform: `${rest} scale(.4)` }], { duration: 350, fill: 'forwards' });
    n.animate([{ transform: 'translate(-50%,-50%) scale(1.4)' }, { transform: 'translate(-50%,-50%) scale(1.4)', offset: .3 },
      { transform: `translate(${to.x - from.x - 20}px,${to.y - from.y}px) translate(-50%,-50%) scale(.7)`, opacity: 1, offset: .9 }, { opacity: 0, transform: `translate(${to.x - from.x - 20}px,${to.y - from.y}px) translate(-50%,-50%) scale(.7)` }],
      { duration: 1200, easing: 'ease-in-out' }).onfinish = () => {
      n.remove(); fl.remove(); if (onLand) onLand();
    };
  }, T + 500);
}
// Éclat du compteur de Datacrons (appelé après le rendu, quand le montant vient de changer).
function pulseDatacrons(gain) {
  const el = document.querySelector('[title="Datacrons"]'), col = gain ? '#ffb347' : '#8fb8ff';
  if (el) el.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: `brightness(2) drop-shadow(0 0 12px ${col})`, transform: 'scale(1.25)', offset: .3 }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 600 });
}
