---
name: claude-trends
description: Find out what is new in the Claude Code ecosystem — plugins, marketplaces, hooks, skills, tooling. Use for what's new in claude code, new plugins, trending claude tools, any good plugins lately.
---

# claude-trends

On demand only: no hook, no schedule, because a check on every session start is a network call and a paragraph of noise every time.

**Never answer from memory.** This ecosystem moves faster than the model's knowledge cutoff; every claim comes from a live fetch, and if the fetches fail, say so.

## Check, in parallel

| Source | How |
|---|---|
| New repos | GitHub topic `claude-code`, recently created, by stars |
| Official marketplace | `anthropics/claude-plugins-official`, recent commits |
| Marketplaces already added | `claude plugin marketplace list` |
| Installed, with token cost | `claude plugin list`, `claude plugin details <name>` |
| Release notes | the Claude Code changelog |

## Report

Three to five items: what it does, the mechanism (hook, skill, script) and whether it is worth adopting here, judged against what `.claude/` already has. "Nothing worth your time" is a valid answer.

## Before recommending an install

A plugin's hooks run arbitrary code on every tool call. Read them, name the publisher, say what it is allowed to do, and check its per-turn token cost. Never suggest anything that stores a long-lived credential off this machine.
