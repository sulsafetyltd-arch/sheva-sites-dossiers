#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npx --yes surge ./dist solbtihutlive.surge.sh
