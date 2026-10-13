#!/usr/bin/env bash
# PostToolUse(Edit|Write): a scripted or hand edit can leave a file unformatted,
# and no spec sees it; CI's `pnpm format:check` fails the deploy instead.
# Exit 2 puts the message in front of Claude.
set -uo pipefail

file=$(cat | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)

[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  *.ts|*.json|*.html|*.scss|*.mjs) ;;
  *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in "$root"/*) ;; *) exit 0 ;; esac
[ -x "$root/node_modules/.bin/prettier" ] || exit 0

if ! (cd "$root" && ./node_modules/.bin/prettier --check "$file" >/dev/null 2>&1); then
  rel="${file#"$root"/}"
  echo "prettier: ${rel} is not formatted, and CI's format:check fails on it." >&2
  echo "Fix: pnpm exec prettier --write \"${rel}\"" >&2
  exit 2
fi
exit 0
