// Statistiques d'usage anonymes avec GoatCounter (sans cookie, aucune donnée personnelle).
// Pour activer : créer un compte sur goatcounter.com, puis mettre le code du site (le « xxx » de xxx.goatcounter.com) ci-dessous.
// Tant que le code est vide, rien n'est chargé ni envoyé. Les visites en local (localhost, fichier) ne sont pas comptées.
const GOATCOUNTER_CODE = 'atlas-wanderer';

const STATS = (() => {
  if (GOATCOUNTER_CODE) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
    document.head.appendChild(s);
  }
  // Un événement = un compteur nommé dans GoatCounter. Ne doit jamais gêner le jeu : tout est protégé.
  const event = (path, title) => {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title: title || path, event: true }); } catch (e) { /* ignoré */ }
  };
  return {
    // Début d'une expédition : donjon et lieutenants choisis.
    start(g) {
      event(`debut/donjon/${g.dungeon.id}`, `Début : ${g.dungeon.name}`);
      g.heroes.forEach(h => event(`debut/lieutenant/${h.def.id}`, `Lieutenant : ${h.def.name}`));
    },
    // Fin d'une expédition : résultat et salle atteinte.
    end(g) {
      const res = g.over === 'win' ? 'victoire' : 'defaite';
      event(`fin/${res}`, `Fin : ${res}`);
      event(`fin/${res}/${g.dungeon.id}`, `Fin : ${res}, ${g.dungeon.name}`);
      event(`fin/salle/${String(g.room - 1).padStart(2, '0')}`, `Salle atteinte : ${g.room - 1}`);
    }
  };
})();
