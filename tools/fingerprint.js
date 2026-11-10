// Behaviour fingerprint of the game: plays seeded games with the automatic player and prints a hash of the results.
// Used to prove that a refactoring (renaming, migration) does not change the game: same seeds = same hash.
// Usage: node tools/fingerprint.js [games=80] [--write] [--strict]
//   --write   saves the result in tests/fingerprint.json
//   --coverage lists which power templates of data/powers.json were played (a template never played is not verified by the hash)
//   --strict  seeds the game with its own generator (X.setSeed) and makes Math.random throw: proves that no game rule bypasses rng(); the hash must stay the same.
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require('./load-game');
const { playGame, strategies } = require('./player-bot');

const games = +process.argv.slice(2).find(a => /^\d+$/.test(a)) || 80;
const strict = process.argv.includes('--strict');
const game = load({ fast: true, strict });
const played = {};
if (process.argv.includes('--coverage')) { const run = game.X.POWERS.run; game.X.POWERS.run = (k, ...rest) => { const ok = run(k, ...rest); if (ok) played[k.fx] = (played[k.fx] || 0) + 1; return ok; }; }
const heroIds = Object.keys(game.X.HEROES), dungeonIds = Object.keys(game.X.DUNGEONS);
const results = [];
for (let seed = 1; seed <= games; seed++) {
  if (strict) game.X.setSeed(seed); else game.setSeed(seed);
  const a = (seed * 7) % heroIds.length, b = (a + 1 + (seed * 3) % (heroIds.length - 1)) % heroIds.length;
  const r = playGame(game, [heroIds[a], heroIds[b]], dungeonIds[seed % dungeonIds.length], { strategy: strategies[seed % strategies.length], maxRooms: 40 });
  results.push([seed, r.win ? 1 : 0, r.rooms, r.bossHp, ...r.lieutenantHps]);
}
const text = results.map(r => r.join(',')).join('\n');
const messages = game.messages().join('\n');
const fnv = t => [...t].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
const hash = fnv(text), messagesHash = fnv(messages);
console.log(`${games} games, wins ${results.filter(r => r[1]).length}, hash ${hash}, messages ${game.messages().length} (hash ${messagesHash})`);
if (process.argv.includes('--coverage')) {
  const all = Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'powers.json'), 'utf8')));
  const never = all.filter(fx => !played[fx]);
  console.log(`power templates played: ${all.length - never.length}/${all.length}${never.length ? `; never played: ${never.join(', ')}` : ''}`);
}
// Comparison with the recorded reference (same number of games): a difference means the game's behaviour changed.
let failed = false;
if (!process.argv.includes('--write')) {
  const refFile = path.join(__dirname, '..', 'tests', 'fingerprint.json');
  const ref = fs.existsSync(refFile) ? JSON.parse(fs.readFileSync(refFile, 'utf8')) : null;
  if (ref && ref.games === games) {
    failed = ref.hash !== hash || ref.messagesHash !== messagesHash;
    console.log(failed ? `✗ differs from tests/fingerprint.json (results ${ref.hash}, messages ${ref.messagesHash}). If the change is intended, run again with --write.` : '✓ identical to tests/fingerprint.json');
  }
}
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fingerprint.json'), JSON.stringify({ games, hash, messagesHash, messageCount: game.messages().length, results }, null, 1) + '\n');
  console.log('tests/fingerprint.json written');
}
if (failed) process.exit(1);
