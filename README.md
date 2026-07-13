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

## The pillar system

"Non-functional requirements" is where delegated work quietly rots: an implementer agent will happily ship a feature that works on the happy path and says nothing about failure, logging, or load. Conductor handles this with a fixed **pillar catalog** — the ten quality dimensions that cover what "production-grade" means:

**correctness · reliability · performance · scalability · security · observability · maintainability · testability · UX/accessibility · cost/operability**

The catalog is deliberately universal — it's the superset of concerns, so nothing gets forgotten for lack of a name. But *which pillars apply is a property of the project*, declared once in its Project facts block. This triage is the load-bearing choice: a local UI toy activates correctness/maintainability/UX and never pays the reliability-engineering tax; a server handling client data activates security/reliability/observability and can't skip it. Universal checklists degrade into ritual; per-project activation keeps every check meaningful, so none get skimmed.

Active pillars are then enforced at three points, highest leverage first (pillars are mostly *decided at plan time* — review can flag their absence but can't retrofit them):

1. **Plan doc** — one line per active pillar saying what it concretely means for this feature ("N/A — static local data" is valid; writing it forces the thought).
2. **Task spec** — pillars become acceptance criteria, never adjectives: "all input goes through the existing sanitizer," not "make it secure."
3. **Review** — panel lenses check the plan addressed what it should; per-diff review checks the spec's pillar criteria were actually met.

Two pillars get extra teeth: when `reliability` or `observability` is active (or any task crosses a process boundary), the failure-modes gate requires a per-boundary table — what fails → how it's handled → what signal it emits — mechanically linted by `check-spec-pillars.sh` before dispatch is allowed.

## Design decisions worth reading

Most of what's interesting here is *why* the rules look the way they do. Each is backed by a dated incident or a controlled experiment, recorded in the files themselves:

- **Structured specs over vibes.** Every dispatch carries acceptance criteria, an explicit file allowlist, and the exact verification commands. Quality pillars ("secure", "reliable") must appear as concrete criteria — "all input goes through the existing sanitizer" — never adjectives. A shell linter (`check-spec-pillars.sh`) mechanically blocks dispatch of plan-tier work whose spec lacks concrete failure-mode handling.
- **The Decisions & Assumptions Register.** An agent that silently resolves ambiguity is the most dangerous kind. Every plan carries a register of non-obvious choices, triaged into *forced* / *reversible default* / *needs sign-off* — and needs-sign-off rows block implementation until a human answers. Motivated by a real plan that beat its baseline 3/3 on independent graders while still silently choosing four policies that belonged to the user.
- **Detached-orphan dispatch.** Long Codex runs are launched as `nohup`-orphaned OS processes with sentinel-file rendezvous, because harness-managed background tasks die silently at session boundaries (learned from two runs vanishing mid-task). Completion, liveness, and crash-vs-success are all distinguishable from cheap file checks.
- **Worktrees over locks.** Parallel orchestrator sessions were originally coordinated by a ~1300-line lease/mutex system enforced with hooks. It passed review — and was deliberately deleted in favor of one-worktree-per-conductor, which makes collisions structurally impossible with zero code. The decision record (`plans/conductor-coordination.md`) exists so the lock doesn't get rebuilt.
- **Measured, not vibed, model configuration.** The implementer's model and reasoning-effort pin comes from a pre-registered eval (`plans/implementer-eval.md`): three task arms, frozen specs, blind grading by neutral reviewer agents, revision-rounds as the primary metric. The outcome (high-effort matched max-effort at equal cost with a 49% wall-clock win on one task) set the default.
- **The contract tests itself.** `check-contract.sh` guards the spine/skills split: no dead dispatch-table links, no orphaned skills, and a canary list asserting that hard-won specifics (sleep-prevention flags, sandbox modes, context thresholds, dated incident learnings) still exist somewhere after content moves between files. Behavioral properties — does a fresh orchestrator actually open the right skill at the right phase? — were established by headless probe sessions, and the probe-verified claims are dated in the docs.
- **Context economics as a first-class constraint.** The orchestrator reads diffs, not the files the implementer touched; verifies by running commands, not re-reading code; and treats a context-gate block as a signal to respawn a fresh agent with a handoff packet rather than pushing a bloated session forward.

## Measured results

The system is evaluated the same way it makes other decisions: pre-registered protocol, blind grading, honest caveats. Highlights (full data in `plans/implementer-eval/readout.md`):

- **Zero-revision delivery under the contract.** In the 2026-07 implementer eval — 8 dispatched runs across a multi-file feature, a seeded-bug hunt, and a UI restyle — every run under the current implementer configuration was accepted with **0 revision rounds**: first delivery passed the spec's verification commands, stayed in scope, and survived adversarial review. The one arm that shipped a visible defect (the older implementer model) was caught and corrected within the review loop's budget.
- **Spec-first + blind grading changed a real default.** The eval compared reasoning-effort tiers with frozen specs, randomized A/B diffs, and three independent grader agents (a neutral third model). Result: high effort matched maximum effort on quality (grader split 1–1 with one tie) at dead-even token cost (−0.9%) with up to **49% lower wall-clock** — so the default dispatch tier was lowered, with an escape hatch kept for architecture-critical work. Notably, graders found the *max*-effort arm over-built a UI task 3/3 — more reasoning isn't free quality.
- **The pixel-verification gate caught what diff review can't.** One eval run rendered an error panel on *success* — a CSS `[hidden]` attribute defeated by `display:grid`. The diff looked fine; only the screenshot gate caught it. That's the class of bug the ui-verification skill exists for.
- **The Decisions Register exists because winning isn't enough.** Its motivating incident: a Conductor-produced plan beat the prior single-agent workflow **3/3 on independent graders** — and *still* silently made four policy choices (dedupe policy, qualification threshold, environment default) that belonged to the user. The register's triage (forced / reversible / needs-sign-off) is the fix, and needs-sign-off rows block dispatch.
- **Process failures get converted into rules with dates.** Two background runs silently dying at a session boundary (2026-06-27) became the detached-orphan dispatch pattern; an 80-file near-collision between two sessions (2026-06-12) became the one-worktree-per-conductor rule; each is cited inline where the rule is stated, and the contract's canary test asserts the learnings survive refactors.

Caveats are part of the method: n is small, results are win/loss counts rather than statistics, and the readout says so explicitly.

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
