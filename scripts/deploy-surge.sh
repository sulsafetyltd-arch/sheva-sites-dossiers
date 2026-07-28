#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
if [[ -n "${SURGE_TOKEN:-}" ]]; then
  npx --yes surge ./dist solbtihutlive.surge.sh --token "$SURGE_TOKEN"
else
  npx --yes surge ./dist solbtihutlive.surge.sh
fi
