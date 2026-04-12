#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(pwd)/eas-apk-build.log"
{
  echo "=== $(date) ==="
  echo "=== expo-doctor ==="
  CI=1 npx expo-doctor || true
  echo "=== git status ==="
  git status -sb || true
  echo "=== eas build (queue, no-wait) ==="
  npx eas-cli build --platform android --profile preview --non-interactive --no-wait
} 2>&1 | tee "$OUT"
echo "Log: $OUT"
