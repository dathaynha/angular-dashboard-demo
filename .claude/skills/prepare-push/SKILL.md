---
name: prepare-push
description: >-
  Checks to run before pushing the dashboard demo. Use when dathq says push,
  prepare push, or review before push. Push only after all of them pass.
---

# Prepare push

"push" always means: run this first, push only if it passes. One "push" covers one push.

1. **Diff review.** `git status`, `git diff --stat`, and `git show --stat` for each unpushed commit. One concern per commit. Nothing he did not ask for: no debug leftovers, `TEMP` markers, screenshots, `_local/`, `CLAUDE.local.md` or `.claude/tmp/`. Read the deletion side of the diff too: a cut defined by position takes whatever sat in the range.
2. **Private files stay private.** `git check-ignore -v _local/PLAN.md CLAUDE.local.md` must match, and `git ls-files | grep -E '^_local/|CLAUDE.local.md'` must print nothing. Grep the staged diff for local paths (`/Users/`, `Documents/Private`): the repo is public.
3. `pnpm format:check`
4. `pnpm exec tsc -p tsconfig.app.json --noEmit` and `pnpm exec tsc -p tsconfig.spec.json --noEmit` (the tests transpile but do not typecheck).
5. `pnpm test`: read the summary line, not only the exit code.
6. `pnpm build:pages`: every route prerendered, no errors, no budget warnings. This is the only step that type-checks templates.
7. If anything visual changed since dathq last looked: the `verify-dashboard` skill.
8. Dependency changes: the lockfile package set changed only as intended, versions pinned exactly.
9. `bash .claude/hooks/tests/run.sh` if a hook changed.
10. Commit messages: Conventional Commits, **no AI attribution** (`.claude/rules/git.md`).
11. Report PASS/FAIL per step. On PASS, push. On FAIL, stop and report the exact failing output.

After the push, GitHub Actions deploys. Report the run URL (`gh run list --limit 1`) and stop. Do not poll it; dathq watches and reports back.
