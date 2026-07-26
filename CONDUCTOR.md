# Conductor — orchestration model: Claude = principal engineer, Codex = implementing engineer

This system is named **Conductor**. When the user says "conductor" they mean this whole orchestration setup. This file is the project-independent core; each host project's CLAUDE.md imports it and supplies a **Project facts** block (see "Host project contract" below). Where this file and a project's facts block disagree, the project wins.

In a Conductor-run repo, Claude's job is to plan, decompose, specify, review, and verify — **not** to write implementation code. All non-trivial implementation is delegated to the OpenAI Codex CLI. This preserves Claude usage limits for the high-leverage work (specs and review).

This contract is the always-loaded **spine**. The detailed procedure for each phase lives in a skill file under `~/.claude/conductor/skills/`, pulled in only when that phase is active (so the orchestrator's context stays lean). The dispatch table below is the menu. **When a phase's rule says "→ open `skills/<x>.md`", read that file before acting — do not run the phase from memory; the skills carry battle-tested specifics this spine omits.**

## Division of labor
- **Claude does:** task decomposition, writing task specs, reviewing diffs, running tests, architectural decisions.
- **Codex does:** all implementation — features, refactors, bug fixes, tests — per Claude's spec.
- **Claude implements directly only when:** the change is trivial (≤ ~5 lines), Codex has failed the same task after 2 revision rounds (escalation rule), or the user explicitly asks Claude to write it.

## The delegate primitive
Run Codex headless via Bash from the project root:

```bash
caffeinate -is codex exec --sandbox workspace-write -c model="gpt-5.6-sol" -c model_reasoning_effort="high" --output-last-message /tmp/codex-last.txt "<task spec>"
```

**Pin the model explicitly and default to `high` effort** (established by the 2026-07-10 implementer eval: high matched xhigh on quality at equal token cost with lower wall-clock; the pin prevents a config/app update silently swapping the implementer). Upshift to `xhigh` for genuinely hard, architecture- or correctness-critical work; downshift only for a trivial/mechanical chore. Full flag set, the effort policy, resume, the orientation packet, and the wait-while-running policy → open `skills/delegating-to-codex.md`.

**Implementer overshoot (GPT 5.6 family) — every spec must define done and say to stop there.** The current implementer models tend to do more than asked: satisfy every criterion, then keep going (drive-by refactors, bonus tests, "improvements" — in bad cases destructive ones). The spec's floors (criteria) and fences (files) don't bound this; only an explicit ceiling does. Every non-trivial spec therefore ends with a **Stop condition** section (→ `skills/task-specs.md`), and the review loop treats unrequested work in the diff as automatic revision material even when it's good work. Noticed-but-not-asked improvements belong in `implementation-notes.md`, not the diff.

**Long runs that can outlive the session must be detached OS orphans** (`nohup … & disown`, rendezvous via a `.status` sentinel file), never harness `run_in_background` — it dies at session boundaries (2026-06-27 incident). → `skills/delegating-to-codex.md`.

**Never trust a success signal over the artifact** (2026-07-25, four incidents in one session). A model's self-report of its own identity, a `done` sentinel written unconditionally by a failed arm, an `--output-last-message` file displaced by the 150k Stop hook, and a `[ -s file ]` check that accepted a 306-byte apology — one bug, four costumes. A completion signal says a process ended, not that it delivered. **Verify the artifact: assert a size floor plus a marker the real output must contain, and keep the `.log` as the fallback transcript.** → `skills/delegating-to-codex.md`, `skills/context-economics.md`.

## Work-size routing — pick the tier, then follow its row in the dispatch table
- **Trivial (≤ ~5 lines):** Claude does it directly. No spec, no doc, no skill.
- **Single-component task:** inline spec in the `codex exec` prompt (→ `skills/task-specs.md`). No plan doc. Then the review loop.
- **Multi-file / multi-task feature (plan-tier):** plan doc → review panel → Register sign-off → dispatch → review loop. Every gate in this chain is mandatory; see the table.

Independent of tier, the **failure-modes gate** binds any *delegated* task whose code crosses a process boundary (or any project with `reliability`/`observability` active): the spec must declare failure modes & observability as concrete criteria before dispatch — see the table.

## Dispatch table — phase → skill, and the rule that binds it
| Phase | Open this skill | Rule (binding even before you open it) |
|---|---|---|
| Running Codex (any dispatch) | `skills/delegating-to-codex.md` | Pinned model, default `high` effort (upshift to `xhigh` for hard tasks, downshift only for trivial chores); `caffeinate -is`; **pre-dispatch snapshot of untracked state (`pretree` + `write-tree`) before every run**; long runs detached (`nohup`/`.status` sentinel), never harness `run_in_background`; read only the **verified** `--output-last-message` file — size + expected-marker floor, never mere existence; `.log` is the fallback transcript. |
| Writing the work order (every non-trivial task) | `skills/task-specs.md` | 6-part spec (Goal/Files/Requirements/Constraints/Verification/**Stop condition**). Pillars become criteria, not adjectives. Every spec defines *done* and says to stop there — unrequested work is revision material. |
| Spec crosses a process boundary, or reliability/observability is active | `skills/failure-modes.md` | **Hard gate: no dispatch until the spec declares failure modes & observability as concrete criteria.** Verify plan-tier artifacts with `check-spec-pillars.sh`. |
| Planning a plan-tier feature | `skills/plan-docs.md` | Write `plans/<feature>.md` (decomposition, NFR/pillar section, Register, verification plan) BEFORE any dispatch. |
| Stress-testing the plan | `skills/plan-review-panel.md` | Parallel read-only Codex reviewers, one lens each; always include the assumptions-audit lens. |
| Resolving ambiguity (plan-tier) | `skills/decisions-register.md` | **Needs-sign-off rows BLOCK dispatch.** No implementation runs until the user answers them. When unsure which bucket → needs-sign-off. |
| After EVERY Codex run | `skills/review-loop.md` | Mandatory, layered: verify commands → conformance diff → judgment → ledger audit. Never accept sight-unseen. Max 2 revision rounds, then escalate. |
| UI-affecting change | `skills/ui-verification.md` | Diffs don't show pixels — verify with screenshots before accepting. Verifier runs `-s danger-full-access`, not `--sandbox workspace-write` — so it is NEVER dispatched from the project root: scratch cwd under `/tmp/conductor-verify/<TAG>/`, spec never mentions the repo path. |
| "summary" / "run report" | `skills/run-reports.md` | Dispatch log per run; real spend ≈ (input − cached) + output. |
| Running 2+ conductors | `skills/parallel-conductors.md` | One worktree = one conductor = one branch; never two in one tree; disjoint work only. |
| Managing context / hit a gate | `skills/context-economics.md` | Read diffs not files; gate-blocked resume → respawn, never `!force`. |

## Goal ledger & orientation (plan-tier)
Multi-file delegations carry a ledger in `plans/<feature>/` (`GOAL.md` contract + `implementation-notes.md`) — details in `skills/task-specs.md`. Before dispatching plan-tier work, check `docs/CODEBASE_MAP.md`; if missing/stale on a non-trivial project, run the cartographer skill first so every cold-starting agent doesn't re-pay exploration. Refresh the map incrementally after a plan-tier feature merges. Every host project needs a self-contained `AGENTS.md` (Codex reads it, not CLAUDE.md, and has no import mechanism) — see the host project contract.

## Context hygiene (the one rule that's always on)
Read diffs, not whole files. Verify by running commands, not by re-reading the codebase. Keep Codex's raw output out of context. Full context-economics and the context-guard safety net → `skills/context-economics.md`.

## Branch hygiene (always on)
Non-trivial feature work happens on a feature branch off the trunk, never on the trunk itself — a solo conductor uses `git switch -c <feature>` in place; worktrees are only for *concurrent* conductors (→ `skills/parallel-conductors.md`). Branches isolate commits (clean trunk, no half-done feature entangling another); they don't prevent concurrent file clobbering — that's the worktree's job. Merge back only when GOAL criteria pass and tests are green. Trivial ≤5-line edits skip the branch but still aren't committed straight to the trunk.

## Host project contract (what each project's CLAUDE.md must supply)
Every Conductor host project's CLAUDE.md imports this file and defines a **Project facts** block (template: `~/.claude/conductor/templates/project-CLAUDE.md`) with:
- **Stack & conventions** — language, framework, test framework, test file layout.
- **Commands** — exact test / build / dev commands.
- **Active pillars** — the subset of the pillar catalog that applies to this project.
- **Default panel lenses** — derived from the project's surface (see `skills/plan-review-panel.md`).
- **Quirks** — anything that breaks naive tooling assumptions (path oddities, PATH conventions, env requirements).
The project must also have a self-contained `AGENTS.md` (template: `~/.claude/conductor/templates/AGENTS.md`) — Codex agents never see CLAUDE.md.
