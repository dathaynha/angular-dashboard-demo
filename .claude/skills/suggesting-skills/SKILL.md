---
name: suggesting-skills
description: When dathq is doing by hand work an existing project skill handles better, suggest that skill once. Not user-invocable.
---

# Suggesting skills

When a skill already covers what is being done by hand, suggest it once, briefly, at a natural break:

```
There's a skill for that — `[name]`: [one line]. Want me to use it?
```

| Doing… | Suggest |
|---|---|
| About to push, or reviewing before a push | `prepare-push` |
| Changed a page, component, chart or style | `verify-dashboard` |
| Adding a page, feature or shared component; asking where something goes | `frontend-structure` |
| Hooks misbehaving, or after editing one | `hook-doctor` |
| The same check done by hand for the third time | `suggesting-hooks` |
| "What's new in Claude Code?" | `claude-trends` |
| The same correction keeps coming up | Offer to write it into `.claude/rules/` |

One suggestion per conversation unless asked again; declined once, drop it. Never suggest a heavy check as a hook: that belongs in `prepare-push`.
