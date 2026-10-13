# Working agreement

Carried over from the datha platform, trimmed to what applies to one Angular app.

## Git

- **Do only the verb said.** "fix" = edit and stop. "commit" = commit only. "push" = run `prepare-push`, then push only if it passes. Intent talk ("I want to push this later") is not a command; when unsure, ask "push now?" and wait.
- **One "push" covers one push.** Every later commit waits for a fresh "push".
- **One commit per concern**, Conventional Commits (`.claude/rules/git.md`).
- **Never `git checkout <file>` to undo a probe** when the file also holds work in progress. Remove the probe itself.
- **GitHub auth failure: ask, never work around.** dathq runs `gh auth login` / `gh auth setup-git` himself.

## Plan, then build

- **Small and clearly correct: do it.** Anything nontrivial: present the cause, the plan and the concerns, then wait for "go".
- **Reuse before writing anything new.** Grep how the codebase already solves it. One source of truth per value.
- **Minimum-impact fixes.** The smallest change that fixes the bug.
- **Comments: one short line, only for a non-obvious constraint.**
- **Dependency and version changes wait for "go".** Present the evidence first (release notes, what breaks). Before a major bump, read the new version's dependency list: a licence or telemetry package is a question to answer first.
- **When dathq says "best practice", survey the field before designing.** State the trade-off, then recommend.

## Verify

- **Look at it, do not reason about it.** Any visual change: run the `verify-dashboard` skill, read the screenshots, and measure (`getBoundingClientRect`, `getComputedStyle`, `scrollWidth` vs `innerWidth`). Class and test-id assertions cannot see layout.
- **Every size, both themes:** phone 390, tablet 768, desktop 1280, wide 1920, light and dark. A layout verified at one width is not verified.
- **Check the Pages build, not only the dev server.** The site is served under `/angular-dashboard-demo/`; anything that assumes `/` works locally and 404s live.
- **Probe the running state before theorising about a cause.** One measurement beats three guesses.
- **Say what you verified and in which configuration**, not that it works.
- **Chase every intermittent failure to a named cause.** Read the failure artefact (trace, snapshot) before touching code; never report an intermittent pass as a fix.
- **"Everything gucci?" is a real audit request.** Run the checks orthogonal to the green ones: an explicit `tsc`, a production build, a read of your own diff for dead code and leftovers. Say plainly what you found, including "this one was mine".

## CSS lessons that cost real bugs

- **`backdrop-filter`, `filter`, `transform` and `contain` create a containing block** for `position: fixed` and a stacking context. When something fixed lands in the wrong place, or is present but unseen, walk the ancestors for those four before adjusting offsets.
- **Same-specificity rules are decided by source order**, and `:not()` / `:has()` add their argument's specificity. When a value does not apply, print the computed value before editing; prefer editing the rule that already wins.
- **A container query needs a definite size on the axis it contains** and a declared, *named* container; an unnamed `@container` binds to the nearest ancestor and can re-point silently. A `@container` rule with no container never runs, with no error.
- **A centred flex column pushes overflow out of both ends.** Centre with auto margins on the child instead, so overflow scrolls from the top.
- **Setting a width next to insets makes one inset inert.**
- **Print with a grid in the tree breaks across pages**: Chrome does not grow a grid row when a child is pushed to the next page. Use block flow in print.
- **`text-transform: uppercase` only on prose labels, never on identifiers.**

## Communicate

- Concise. Lead with the answer. Explain why alongside a fix.
- Flag side effects and leftovers honestly and let dathq decide.
