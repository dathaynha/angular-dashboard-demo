# angular-dashboard-demo

A public demo of a modern, responsive Angular dashboard: KPI cards, charts (including a Sankey request-flow diagram), a data table with search, sort, filters and pagination, and a responsive shell. All data is mock data behind a REST-shaped service.

## Rules

1. **No AI attribution** in commits or PR descriptions. Enforced by `.claude/hooks/commit-guard.sh`.
2. **Do only the git verb asked.** "commit" = commit only; "push" = run the pre-push checks, then push only if they pass. Every push needs a fresh "push".
3. **dathq looks at every visual change in the running app before it is committed.** Build, screenshot, measure, then wait.
4. **Never leave a dev server running** at the end of a turn.
5. **Dependency and version changes wait for "go".** Versions are pinned exactly (no `^` or `~`).
6. **Every edited `.ts`, `.json`, `.html` and `.scss` stays prettier-clean.** Enforced by `.claude/hooks/prettier-check.sh`.
7. **Mock data only.** Never real client data, real company names from client work, or code copied from any client project.
8. **Glass on the chrome only.** The floating side rail and overlays may use the glass material; cards, charts and tables get solid surfaces, because blur behind dense numbers hurts readability.
9. **A regression test must be proven to fail** against the old code, for the predicted reason, before it counts.
10. **Look at it.** Any visual change is verified headed in Playwright at phone 390, tablet 768, desktop 1280 and wide 1920, light and dark, with measurements, not assumptions.

Detail, always in effect:

@.claude/rules/working-agreement.md
@.claude/rules/angular.md
@.claude/rules/charts.md
@.claude/rules/testing.md
@.claude/rules/git.md

## Skills

- `prepare-push`: the checks before any push.
- `verify-dashboard`: build, screenshot every page at four sizes in light and dark, measure. After any visual change.
- `frontend-structure`: where code goes and how a feature is wired.
- `hook-doctor`: audit the hooks and prove their tests can fail.
- `suggesting-hooks`, `suggesting-skills`: propose a hook or a skill when work is being done by hand.
- `claude-trends`: what's new in the Claude Code ecosystem, from live sources.

## Commands

Angular 22, zoneless, standalone, static prerender. pnpm 10, Node 24.

- `pnpm start`: dev server on port 4310
- `pnpm build`: production build to `dist/` (static prerender)
- `pnpm build:pages`: build with the GitHub Pages base href `/angular-dashboard-demo/`
- `pnpm test`: Vitest unit specs, single run
- `pnpm format:check`: prettier over `src/`
- `pnpm verify`: after `pnpm build:pages`, headed screenshots and layout checks at four sizes, light and dark (see the `verify-dashboard` skill)
- `bash .claude/hooks/tests/run.sh`: hook suite
