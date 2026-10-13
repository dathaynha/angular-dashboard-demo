---
name: hook-doctor
description: Audit the hooks — registration, wiring, and whether their tests actually test anything. Use for hook doctor, check hooks, audit hooks, are the hooks still right.
---

# hook-doctor

A rule that drifts is read and ignored; **a hook that drifts is trusted and wrong.**

## 1. Run the tests

```bash
bash .claude/hooks/tests/run.sh
```

It prints `N passed, M failed`. That is step one, not the audit.

## 2. Check the wiring

| Check | How |
|---|---|
| Every registered command exists | compare the paths in `.claude/settings.json` with `.claude/hooks/*.sh` |
| Every hook is executable | `ls -l .claude/hooks/*.sh`: mode `755` (a copy may lose it) |
| Every hook has cases | each `.sh` is exercised in `tests/run.sh` |
| The shell is valid | `bash -n .claude/hooks/*.sh` |

A hook registered at a path that does not exist fails **silently**: the tool call proceeds as if no hook were configured.

## 3. Are the tests load-bearing?

Passing tests prove nothing until you have watched them fail. For each hook, neutralise the line that does the work (change what it computes, e.g. its `exit 2` to `exit 0`), re-run, and expect the blocking cases to fail by name. Then restore.

On the datha platform this check found a suite that passed against a deliberately broken guard twice: once because the cases never reached the broken line, once because a case used phrasing the pattern never matched. Only the verbatim string in a real commit message failed for the predicted reason.

## 4. Illogical rather than broken

Fix the hook first, then add the case that proves the fix; written the other way round, the case gets fitted to the code. Watch for both shapes:

- **Too broad:** a guard that blocks a sentence *about* the thing as well as the thing itself gets routed around.
- **Too narrow:** it never fires, and everyone assumes the rule holds.

## Related

- `.claude/skills/suggesting-hooks/SKILL.md`: when to add one.
