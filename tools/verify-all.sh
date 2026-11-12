#!/bin/bash
# Verification battery of the game, before a commit: texts, data, undefined names, rule tests (auras, order of resolution, Boss boards),
# simulated games (no crash), site, boot, editor, generated files. About a minute.
# Stops at the first failure. Run it once before a commit: ./tools/verify-all.sh
set -euo pipefail
cd "$(dirname "$0")/.."
run() { local out; out=$("$@" 2>&1) || { echo "✗ FAILED: $*"; echo "$out" | tail -8; exit 1; }; echo "$out" | tail -1 | cut -c1-150; }
run node tools/check-texts.js
run node tools/check-data.js
run node tools/check-globals.js
run node tools/check-aura.js
run node tools/check-order.js
run node tools/check-boss-boards.js
run node tools/check-sockets.js
run node tools/check-mods.js
run node tools/check-flow.js
run node tools/check-render.js
run node tools/check-duel.js
run node tools/check-minimal.js
run node tools/check-strategies.js
run node tools/check-events.js
run node tools/check-triggers.js
run node tools/simulate.js 60 6
run node tools/check-site.js
run node tools/check-boot.js
run node tools/check-editor.js
node tools/generate-all.js --sans-simulation >/dev/null
git add -A; node tools/generate-all.js --sans-simulation >/dev/null
git diff --quiet || { echo "✗ generated files changed after regeneration"; git diff --stat; exit 1; }
echo "✓ everything is verified, generated files are stable"
