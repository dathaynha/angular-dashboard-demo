---
name: suggesting-hooks
description: Propose a hook when a rule is being enforced by hand, repeatedly. Not user-invocable — it fires on the agent noticing its own repetition.
---

# suggesting-hooks

A rule in `.claude/` is **advisory**: it works until the agent forgets, and it fails silently when it does. A hook is **deterministic**: it runs every time.

## The trigger

Suggest a hook the **third** time you do the same check by hand in a session, or the first time you notice you are enforcing a rule from memory. The tell is reporting a check instead of a result: *"verified no attribution"*, *"confirmed nothing private is staged"*.

## A good candidate

| Good | Bad |
|---|---|
| Deterministic: a string, a path, a file type | Needs judgement about intent |
| Cheap: milliseconds, one file | A full suite, full lint, the network |
| Failure is expensive or silent | Cosmetic, or loud when it breaks |
| No legitimate exception | Situational |

Situational rules are the trap: if a rule has real exceptions, encode them or leave it to the rule. A guard people learn to route around is worse than none.

## How to propose

1. Name the rule and where it lives.
2. Say how many times it was enforced by hand.
3. Give the event and matcher (`PreToolUse(Bash)`, `PostToolUse(Edit|Write)`).
4. Say what it cannot cover.
5. **Wait for go.** A hook changes what the agent may do.

## Never ship one untested

Add cases to `.claude/hooks/tests/run.sh` covering at least: the violation (blocks, with a message saying how to fix it), the clean case (silent), an adjacent-but-legal case (silent), and empty or malformed input (no crash). Red-proof them as `hook-doctor` describes.

Keep hooks few and fast. Heavy checks belong in `prepare-push` or CI.
