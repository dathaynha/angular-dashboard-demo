#!/usr/bin/env bash
# Hook suite. Each case states the exit code the hook must return.
# Run: bash .claude/hooks/tests/run.sh
set -uo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
root=$(cd "$here/../.." && pwd)
pass=0 fail=0

check() { # name, expected exit, hook, json
  printf '%s' "$4" | CLAUDE_PROJECT_DIR="$root" bash "$here/$3" >/dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$2" ]; then pass=$((pass + 1)); else fail=$((fail + 1)); echo "FAIL: $1 (expected $2, got $got)"; fi
}
bash_json() { python3 -c 'import json,sys; print(json.dumps({"tool_input":{"command":sys.argv[1]}}))' "$1"; }
file_json() { python3 -c 'import json,sys; print(json.dumps({"tool_input":{"file_path":sys.argv[1]}}))' "$1"; }

nl=$'\n'
check "trailer in commit blocked" 2 commit-guard.sh "$(bash_json "git commit -m \"feat: x${nl}${nl}Co-Authored-By: Claude Opus <noreply@anthropic.com>\"")"
check "footer in gh pr blocked" 2 commit-guard.sh "$(bash_json "gh pr create --body \"x${nl}🤖 Generated with [Claude Code](https://claude.com/claude-code)\"")"
check "clean commit allowed" 0 commit-guard.sh "$(bash_json 'git commit -m "feat: add platform page"')"
check "prose about trailer allowed" 0 commit-guard.sh "$(bash_json 'git commit -m "docs: never add a Co-Authored-By: Claude trailer"')"
check "non-commit command ignored" 0 commit-guard.sh "$(bash_json "echo \"Co-Authored-By: Claude\"")"

tmp="$root/src/__hook_probe.ts"
printf 'export const x = {a:1}\n' > "$tmp"
check "unformatted ts blocked" 2 prettier-check.sh "$(file_json "$tmp")"
printf 'export const x = { a: 1 };\n' > "$tmp"
check "formatted ts allowed" 0 prettier-check.sh "$(file_json "$tmp")"
rm -f "$tmp"
check "markdown ignored" 0 prettier-check.sh "$(file_json "$root/CLAUDE.md")"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
