#!/bin/bash
# Full verification battery of the game: texts, names, cards, power bricks, random combats, game fingerprint, simulation, site, boot, generated files.
# Stops at the first failure. Run it before every commit: ./tools/verify-all.sh
set -euo pipefail
cd "$(dirname "$0")/.."
run() { local out; out=$("$@" 2>&1) || { echo "✗ FAILED: $*"; echo "$out" | tail -8; exit 1; }; echo "$out" | tail -1 | cut -c1-150; }
run node tools/check-texts.js
run node tools/check-names.js
run node tools/check-catalog.js
run node tools/check-powers.js 300
run node tools/check-combat.js 20000
run node tools/fingerprint.js 1500
run node tools/fingerprint.js 400
run node tools/fingerprint.js 400 --strict
run node tools/fingerprint.js 400 --legacy-order
run node tools/simulate.js 60 6
run node tools/check-site.js
run node tools/check-boot.js
run node tools/check-editor.js
node tools/generate-all.js --sans-simulation >/dev/null
git add -A; node tools/generate-all.js --sans-simulation >/dev/null
git diff --quiet || { echo "✗ generated files changed after regeneration"; git diff --stat; exit 1; }
echo "✓ everything is verified, generated files are stable"
