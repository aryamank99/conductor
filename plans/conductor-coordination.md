# Conductor session coordination — DECISION RECORD (do not rebuild the lease)

**Status:** resolved 2026-06-15. Adopted **bare git worktrees, one per parallel conductor.** A lease/hook enforcement mechanism was designed, built, reviewed, and then **deliberately removed** in favor of worktrees. This file exists so the lease isn't re-proposed and rebuilt from scratch.

## The problem
Two Claude Code conductor sessions operating on the same working tree can silently clobber each other's edits and double-dispatch Codex. Motivating incident: 2026-06-12, two conductor sessions on a client project interleaved writes minutes apart and a ~80-file commit landed mid-wiring; collision was avoided only by timing luck.

## What we built and threw away
A `.conductor/lease` mutex enforced by Claude Code hooks (`PreToolUse` fail-closed), with heartbeats, a stale-takeover decision table, `pgrep`/`lsof` live-Codex detection, derived roles, and observer read-only demotion. ~1300 lines of bash + tests across `hooks/` and `tests/`. It passed review (3 panel lenses + 16 tests). It was never activated.

## Why worktrees won
1. **It solves the actual incident by construction, not by policing.** Two conductors in two `git worktree`s on two branches *cannot* clobber one tree or both land on the main branch at once. The lease only *forbids* collision; worktrees make it impossible.
2. **It's the simplest option that also enables what the user actually wants** — running conductors in parallel. The lease *prevents* parallelism (serializes to one writer); worktrees *enable* it. Same solution, both goals.
3. **The lease's complexity bought little.** ~⅔ of its code was auto-takeover (heartbeats, staleness, live-Codex detection) — automating a recovery a single user does with one `rm`. The hairiest, least-real-world-tested parts guarded the rarest case.
4. **`git worktree` is a built-in.** The core of the chosen approach is *zero new code* — a convention, not an implementation.

## The chosen model (now in CONDUCTOR.md → "Parallel conductors — one worktree each")
- One worktree = one conductor = one branch. Never two conductors in the same tree.
- Run a second conductor only on **disjoint** work; same-feature parallelism is the Codex layer's job. This constraint also sidesteps the one thing worktrees don't isolate (shared `plans/`, ledgers, CLAUDE.md).
- Integrate by merging to the main branch on green GOAL criteria; serialize merges (rebase onto current main, re-verify) if two are ready at once.
- Awareness is manual (`git worktree list`). Automated overlap detection, a shared plan registry, and a merge queue are **intentionally not built** — borrow them from human trunk-based practice only if parallel runs become routine.

## If you're tempted to rebuild a lock
Don't, unless the working mode has changed such that (a) you frequently run *overlapping* conductors on the *same* files, and (b) manual worktree management has become the bottleneck. Even then, prefer a serialized merge gate over a write-time lock. The lease implementation is recoverable from git history (commit prior to the 2026-06-15 removal) if ever genuinely needed.
