// Behaviour fingerprint of the game: plays seeded games with the automatic player and prints a hash of the results.
// Used to prove that a refactoring (renaming, migration) does not change the game: same seeds = same hash.
// Usage: node tools/fingerprint.js [games=80] [--write]   (--write saves the result in tests/fingerprint.json)
'use strict';
const fs = require('fs'), path = require('path');
const { charger } = require('./load-game');
const { jouerPartie, strategies } = require('./player-bot');

const games = +process.argv.slice(2).find(a => /^\d+$/.test(a)) || 80;
const game = charger({ rapide: true });
const heroIds = Object.keys(game.X.HEROES), dungeonIds = Object.keys(game.X.DUNGEONS);
const results = [];
for (let seed = 1; seed <= games; seed++) {
  game.semer(seed);
  const a = (seed * 7) % heroIds.length, b = (a + 1 + (seed * 3) % (heroIds.length - 1)) % heroIds.length;
  const r = jouerPartie(game, [heroIds[a], heroIds[b]], dungeonIds[seed % dungeonIds.length], { strategie: strategies[seed % strategies.length], sallesMax: 40 });
  results.push([seed, r.win ? 1 : 0, r.salles, r.pvBoss, ...r.pvLieutenants]);
}
const text = results.map(r => r.join(',')).join('\n');
const hash = [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
console.log(`${games} games, wins ${results.filter(r => r[1]).length}, hash ${hash}`);
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fingerprint.json'), JSON.stringify({ games, hash, results }, null, 1) + '\n');
  console.log('tests/fingerprint.json written');
}
