# Conductor

**A two-model orchestration system for agentic software engineering: Claude plans, specifies, and reviews; Codex implements.**

Conductor turns a Claude Code session into a principal engineer that never writes implementation code. Every non-trivial change is decomposed into a written spec, dispatched to a headless OpenAI Codex agent, and then reviewed adversarially — diff conformance, probe tests, cross-codebase effects, screenshot verification for UI work — before it's accepted. The result is higher throughput *and* higher rigor than a single agent doing everything: the orchestrator's context stays lean and strategic while cheap implementer agents burn their own quota on the mechanical work.

This repo is the project-independent core. Any project becomes a Conductor host with one command (`/conductor-init`), which symlinks the contract in and instantiates per-project facts.

## Why it exists

Single-agent coding sessions degrade in a predictable way: the context window fills with file reads and raw tool output, quality drops, and the expensive model spends most of its tokens on work a cheaper agent could do. Conductor is a set of load-bearing rules — a *contract* — that fixes the division of labor:

- **Claude does:** task decomposition, written specs, plan review, diff review, architectural decisions, verification.
- **Codex does:** all implementation — features, refactors, bug fixes, tests — per Claude's spec.
- **Claude implements directly only when:** the change is trivial (≤ ~5 lines), Codex has failed twice (escalation), or the user explicitly asks.

Everything else in the repo exists to make that split *reliable* rather than aspirational.

## Architecture: a lean spine + on-demand skills

The always-loaded contract (`CONDUCTOR.md`) is deliberately small. It carries the division of labor, the delegate primitive, work-size routing, and a **dispatch table** that maps each phase of work to a procedure file under `skills/`. The orchestrator reads a skill only when that phase is active, so the always-resident context footprint stays minimal without losing any battle-tested detail.

| Phase | Skill | The binding rule |
|---|---|---|
| Dispatching Codex | `skills/delegating-to-codex.md` | Headless `codex exec`, pinned model + effort, long runs as detached OS orphans with sentinel-file rendezvous |
| Writing the work order | `skills/task-specs.md` | 5-part spec: Goal / Files / Requirements / Constraints / Verification |
| Crossing a process boundary | `skills/failure-modes.md` | **Hard gate:** no dispatch until the spec declares failure modes & observability as concrete criteria |
| Planning a multi-file feature | `skills/plan-docs.md` | Plan doc before any dispatch |
| Stress-testing the plan | `skills/plan-review-panel.md` | Parallel read-only reviewer agents, one lens each, always including an assumptions audit |
| Resolving ambiguity | `skills/decisions-register.md` | **Hard gate:** needs-sign-off decisions block dispatch until the user answers |
| After every run | `skills/review-loop.md` | Mandatory layered review; never accept sight-unseen; max 2 revision rounds, then escalate |
| UI changes | `skills/ui-verification.md` | Diffs don't show pixels — screenshot verification via a browser-driving verifier agent |
| Reporting | `skills/run-reports.md` | Per-run dispatch log with real token accounting |
| Parallel sessions | `skills/parallel-conductors.md` | One git worktree = one conductor = one branch |
| Context management | `skills/context-economics.md` | Read diffs, not files; respawn rather than force past a context gate |

## Design decisions worth reading

Most of what's interesting here is *why* the rules look the way they do. Each is backed by a dated incident or a controlled experiment, recorded in the files themselves:

- **Structured specs over vibes.** Every dispatch carries acceptance criteria, an explicit file allowlist, and the exact verification commands. Quality pillars ("secure", "reliable") must appear as concrete criteria — "all input goes through the existing sanitizer" — never adjectives. A shell linter (`check-spec-pillars.sh`) mechanically blocks dispatch of plan-tier work whose spec lacks concrete failure-mode handling.
- **The Decisions & Assumptions Register.** An agent that silently resolves ambiguity is the most dangerous kind. Every plan carries a register of non-obvious choices, triaged into *forced* / *reversible default* / *needs sign-off* — and needs-sign-off rows block implementation until a human answers. Motivated by a real plan that beat its baseline 3/3 on independent graders while still silently choosing four policies that belonged to the user.
- **Detached-orphan dispatch.** Long Codex runs are launched as `nohup`-orphaned OS processes with sentinel-file rendezvous, because harness-managed background tasks die silently at session boundaries (learned from two runs vanishing mid-task). Completion, liveness, and crash-vs-success are all distinguishable from cheap file checks.
- **Worktrees over locks.** Parallel orchestrator sessions were originally coordinated by a ~1300-line lease/mutex system enforced with hooks. It passed review — and was deliberately deleted in favor of one-worktree-per-conductor, which makes collisions structurally impossible with zero code. The decision record (`plans/conductor-coordination.md`) exists so the lock doesn't get rebuilt.
- **Measured, not vibed, model configuration.** The implementer's model and reasoning-effort pin comes from a pre-registered eval (`plans/implementer-eval.md`): three task arms, frozen specs, blind grading by neutral reviewer agents, revision-rounds as the primary metric. The outcome (high-effort matched max-effort at equal cost with a 49% wall-clock win on one task) set the default.
- **The contract tests itself.** `check-contract.sh` guards the spine/skills split: no dead dispatch-table links, no orphaned skills, and a canary list asserting that hard-won specifics (sleep-prevention flags, sandbox modes, context thresholds, dated incident learnings) still exist somewhere after content moves between files. Behavioral properties — does a fresh orchestrator actually open the right skill at the right phase? — were established by headless probe sessions, and the probe-verified claims are dated in the docs.
- **Context economics as a first-class constraint.** The orchestrator reads diffs, not the files the implementer touched; verifies by running commands, not re-reading code; and treats a context-gate block as a signal to respawn a fresh agent with a handoff packet rather than pushing a bloated session forward.

## Wiring a project

One command: run `/conductor-init` in a Claude Code session (skill in `conductor-init/`). It symlinks `CONDUCTOR.md` into the project as `conductor-core.md`, instantiates `templates/project-CLAUDE.md` (project facts: stack, commands, active pillars, review lenses, quirks) and `templates/AGENTS.md` (Codex-facing orientation — Codex never sees CLAUDE.md and has no import mechanism, so this file must be self-contained), and confirms the judgment calls with the user.

The symlink-relative import is itself a probe-tested decision: `@~/...` imports fail silently and absolute paths are permission-blocked, so a repo-local symlink is the only shape that loads the single canonical contract with no per-project copies drifting apart.

## Layout

```
CONDUCTOR.md            the always-loaded spine (division of labor, routing, dispatch table)
skills/                 one procedure file per phase, read on demand
templates/              skeletons for a host project's CLAUDE.md and AGENTS.md
conductor-init/         the one-command project-wiring skill
plans/                  decision records and eval designs (why the rules are what they are)
check-contract.sh       structural self-test for the spine/skills split
check-spec-pillars.sh   pre-dispatch linter for the failure-modes gate
```

## Requirements

- [Claude Code](https://claude.com/claude-code) (orchestrator) and the [OpenAI Codex CLI](https://github.com/openai/codex) (implementer), both authenticated.
- macOS assumed in a few places (`caffeinate` to prevent sleep mid-run); trivially portable.
- The contract lives at `~/.claude/conductor/`; host projects symlink into it. Reads of the skills library from inside a project need `~/.claude/conductor` in `permissions.additionalDirectories` in `~/.claude/settings.json` (`/conductor-init` handles this).
