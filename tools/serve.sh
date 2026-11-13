#!/usr/bin/env bash
# Starts the local site server in the background (no-op if it is already running).
# Usage: tools/serve.sh [port]     Log: temp/server.log
PORT="${1:-8080}"
cd "$(dirname "$0")/.." || exit 1
if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
  echo "Serveur déjà actif : http://localhost:$PORT/"
  exit 0
fi
mkdir -p temp
nohup node tools/local-server.js --port="$PORT" > temp/server.log 2>&1 &
disown
sleep 0.5
echo "Serveur lancé : http://localhost:$PORT/  (log : temp/server.log)"
