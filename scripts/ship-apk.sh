#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec > >(tee ship-run.log) 2>&1

echo "=== $(date) ==="
git add -A
git status
git commit -m "chore: doctor config and ship scripts" || true
npm run ship:apk
echo "=== done $(date) ==="
