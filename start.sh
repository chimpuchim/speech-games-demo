#!/bin/sh
# Starts the static web server (8770) and the WebSocket relay (8766). Ctrl+C stops both.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install --quiet websockets
fi
.venv/bin/python server/relay.py 8766 &
RELAY=$!
trap 'kill $RELAY 2>/dev/null' EXIT INT TERM
echo "Open http://localhost:8770  (tests: http://localhost:8770/tests.html)"
python3 -m http.server 8770 --bind 127.0.0.1
