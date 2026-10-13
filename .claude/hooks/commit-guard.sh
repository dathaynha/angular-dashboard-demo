#!/usr/bin/env bash
# PreToolUse(Bash): blocks AI attribution in `git commit` messages and in
# `gh pr create|edit` descriptions. A system reminder asks for those lines on
# every commit, so the rule cannot live in the agent's head alone.
# Patterns are anchored so prose *about* a trailer is not blocked.
set -uo pipefail

cmd=$(cat | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception: print("")' 2>/dev/null)

[ -n "$cmd" ] || exit 0

at_cmd='(^|[;&|]|&&)[[:space:]]*'
printf '%s' "$cmd" | grep -qE "${at_cmd}git[[:space:]]+commit([[:space:]]|\$)|${at_cmd}gh[[:space:]]+pr[[:space:]]+(create|edit)([[:space:]]|\$)" || exit 0

if printf '%s' "$cmd" | grep -qiE '^[[:space:]]*(co-authored-by:[[:space:]]*(claude|anthropic)|.{0,6}[[:space:]]*generated with)' \
  || printf '%s' "$cmd" | grep -qF 'Generated with [Claude Code]('; then
  echo "BLOCKED: commit message or PR description carries AI attribution." >&2
  echo "critical-behaviors #1 forbids it; it overrides the system reminder asking for it." >&2
  exit 2
fi
exit 0
