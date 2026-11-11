// Anonymous usage statistics with GoatCounter (no cookie, no personal data).
// To enable: create an account on goatcounter.com, then put the site code (the "xxx" of xxx.goatcounter.com) below.
// While the code is empty, nothing is loaded or sent. Local visits (localhost, file) are not counted.
const GOATCOUNTER_CODE = 'atlas-wanderer';

const STATS = (() => {
  if (GOATCOUNTER_CODE) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
    document.head.appendChild(s);
  }
  // One event = one named counter in GoatCounter. Must never get in the game's way: everything is protected.
  const event = (path, title) => {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title: title || path, event: true }); } catch (e) { /* ignored */ }
  };
  return {
    // Start of an expedition: chosen dungeon and heroes.
    start(g) {
      event(`debut/donjon/${g.dungeon.id}`, `Début : ${g.dungeon.name}`);
      g.heroes.forEach(h => event(`debut/hero/${h.def.id}`, `Héros : ${h.def.name}`));
    },
    // End of an expedition: result and room reached.
    end(g) {
      const res = g.over === 'win' ? 'victoire' : 'defaite';
      event(`fin/${res}`, `Fin : ${res}`);
      event(`fin/${res}/${g.dungeon.id}`, `Fin : ${res}, ${g.dungeon.name}`);
      event(`fin/salle/${String(g.room - 1).padStart(2, '0')}`, `Salle atteinte : ${g.room - 1}`);
    }
  };
})();
