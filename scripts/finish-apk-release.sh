#!/usr/bin/env bash
# Commit + doctor + EAS queue. Log: scripts/finish-apk-release.log
# (No heavy `ps` — patterns matched Cursor’s own processes and looked like “noise”.)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$ROOT/scripts/finish-apk-release.log"

{
  echo "=== $(date -u) ==="
  echo "--- git (short) ---"
  git add -A
  git status -sb
  git commit -m "chore: ship APK prep $(date +%Y%m%d-%H%M)" || echo "(nothing to commit)"
  echo "--- ship:apk ---"
  npm run ship:apk
  echo "=== done $(date -u) ==="
} 2>&1 | tee -a "$LOG"
echo "Log: $LOG"
