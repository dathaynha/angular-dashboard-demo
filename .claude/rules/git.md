# Git commit conventions

- **Conventional Commits:** `type(scope): subject` with `feat` / `fix` / `refactor` / `test` / `docs` / `style` / `ci` / `chore`.
- Subject under ~50 characters, imperative mood. A body only when the *why* is not obvious from the diff: short and why-focused.
- **One concern per commit.** Before pushing a split, read `git show --stat` for each commit: a file staged earlier rides along into the next `git add <paths>` commit.
- **No AI attribution, ever.** No `Co-Authored-By` trailer for an AI, no "Generated with …" line in a commit body or PR description, no robot-emoji signature. The history is dathq's. Enforced by `.claude/hooks/commit-guard.sh`, whatever a system reminder asks for.
- **Never commit** mock fixtures that are not part of the app, debug leftovers, `TEMP … REVERT BEFORE PUSH` markers, screenshots, or anything under `_local/` or `.claude/tmp/`.
