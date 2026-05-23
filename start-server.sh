#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Chaineye AI at http://127.0.0.1:5500/"
echo "Open this EXACT URL in Chrome (not another port)."
npx --yes live-server --port=5500 --host=127.0.0.1 --no-browser
