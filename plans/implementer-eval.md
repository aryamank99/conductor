# Implementer eval: GPT-5.6 Sol effort calibration (+ 5.5 regression tripwire)

**Status:** plan v2, 2026-07-10 (Fable). Supersedes v1 (full Sol-vs-5.5 battery) — user has decided to adopt Sol as the implementer; the open questions are effort calibration and a cheap regression check. Execution is delegated to an **Opus 4.8 conductor session** to conserve Fable tokens; Fable audits only the final readout.

## Goal
1. **Primary — effort calibration:** does `gpt-5.6-sol` at `high` match Sol at `xhigh` on Conductor-shaped work? If yes, every future dispatch gets cheaper/faster. (OpenAI's own NUX: "highly capable at lower reasoning efforts — try starting lower.")
2. **Secondary — regression tripwire:** on 2 tasks, compare Sol@xhigh against the old `gpt-5.5`@xhigh baseline. Not to pick a winner — to catch a workflow-shaped regression (scope creep, spec non-conformance, extra revision rounds) before Sol runs unattended jobs. Sol shipped ~2026-07-09; day-one models sometimes have rough edges.

Output: per-task table (objective metrics + blind grader preferences) → recommended `model` + `model_reasoning_effort` pin for the delegate template in `skills/delegating-to-codex.md`.

## Context & confounds
- **`~/.codex/config.toml` already defaults to `model = "gpt-5.6-sol"`, `model_reasoning_effort = "xhigh"`** (flipped ~when Sol shipped, likely by the ChatGPT app update). The Conductor delegate template pins only effort. Every eval dispatch MUST pin `-c model=` explicitly — the 5.5 arm won't happen otherwise.
- Confirmed CLI slugs (`~/.codex/models_cache.json`, fetched 2026-07-09, CLI 0.144.0): `gpt-5.5` (efforts low–xhigh), `gpt-5.6-sol` (low–xhigh, `max`, `ultra`).
- **Never use `ultra`** — it enables automatic multi-agent delegation (changes the process, not the model). `max` is out of scope too; the question is whether to go *cheaper* than xhigh, not more expensive.

## Arms
| Arm | Dispatch flags | Runs on |
|---|---|---|
| S-hi (candidate) | `-c model="gpt-5.6-sol" -c model_reasoning_effort="high"` | all 3 tasks |
| S-x (incumbent) | `-c model="gpt-5.6-sol" -c model_reasoning_effort="xhigh"` | all 3 tasks |
| T (tripwire) | `-c model="gpt-5.5" -c model_reasoning_effort="xhigh"` | tasks 1–2 only |

Held constant: spec text (frozen before dispatch #1), starting commit, AGENTS.md, `--full-auto`, `caffeinate -is`, detached-orphan pattern, review-loop procedure, reviewer (the Opus conductor).

## Task battery (3 tasks, 8 runs total)
One worktree per run, same base commit per task. Ship the best diff per task through normal review; delete losers.

1. **conductor-pit Phase 1** (stage renderer) — multi-file plan-tier feature; real pending work. Arms: S-hi, S-x, T.
2. **Seeded-bug fix with reproducing test** — no wild bug available (teach-UI suite is 40/40 green, no FIXME markers in active projects; verified 2026-07-10), so the Opus conductor seeds one: pick a teach-UI `lib/` module, introduce one subtle, realistic regression (e.g., boundary condition or state mutation — NOT a syntax error), commit it to the eval base branch with an innocuous message so `git log`/`git diff` don't reveal it, then write the failing vitest repro. Spec to implementers: "this test fails; find the root cause and fix it without breaking the other 40 tests." Ground truth = the known seed. Arms: S-hi, S-x, T.
3. **teach-UI Task 4** (practice restyle) — UI task; graded via `skills/ui-verification.md` screenshot flow (verifier at `-s danger-full-access`). Arms: S-hi, S-x.

## Protocol (fixed — the Opus conductor executes, it does not redesign)
1. **Preflight:** one trivial `codex exec` per distinct model slug with model pinned; confirm output reports the requested model + effort. Abort and report if rejected.
2. Specs per `skills/task-specs.md` (failure-modes gate where applicable). Frozen before any dispatch.
3. Dispatch arms per task (concurrent OK — disjoint worktrees).
4. Standard review loop on every delivery (`skills/review-loop.md`), max 2 revision rounds then escalate. Record rounds per run.
5. Objective metrics per run: tests/build pass on first delivery (y/n); revision rounds (0/1/2/escalated) — **primary decision metric**; conformance violations; wall-clock; token spend per `skills/run-reports.md` (real spend ≈ (input − cached) + output).
6. **Blind grading:** anonymize diffs (strip model strings, randomize labels per task). Panel = 3 read-only Codex reviewer instances pinned to `gpt-5.5`@high (neutral: not a Claude model, and not the model whose efforts are being compared). Rubric per pair: correctness & edge cases (1–5), simplicity (1–5), spec conformance (1–5), forced overall preference. Two comparisons per task where T exists: S-hi vs S-x, and S-x vs T.
7. Readout → `plans/implementer-eval/readout.md` + dispatch log. Include spend delta S-hi vs S-x as a % — the whole point of the calibration.
8. **Fable audit:** one-shot protocol-deviation check of the readout (not raw transcripts) before acting on it.

## Decision rules (pre-registered)
- **Effort:** if S-hi matches S-x on revision rounds and grader majority (ties count as match), adopt `high` as the default effort for Sol dispatches; keep the spine's rule to upshift for genuinely hard tasks. Otherwise stay at `xhigh`.
- **Tripwire:** if S-x needs more revision rounds than T on BOTH tasks 1–2, or graders prefer T on both, that's a regression flag — pause Sol adoption, report to user, do not auto-revert.
- Either way: `skills/delegating-to-codex.md`'s template gains an explicit `-c model=` pin so an app update can't silently swap implementers again.
- n is tiny; report win/loss counts honestly, no statistics theater. Re-run one divergent task rather than expanding the battery.

## Decisions Register
All rows resolved 2026-07-10 — user delegated the decisions to Claude ("idk u decide"). Dispatch is unblocked.
| # | Question | Bucket | Answer |
|---|---|---|---|
| 1 | Task 2 pick: which real open bug (any host project)? | resolved | No wild bug exists (tests green, no FIXME). Seeded-bug protocol in teach-UI `lib/` — see task 2. |
| 2 | Ship winning diffs as real work after normal review? | resolved | Yes — winners merge via normal review; losing worktrees deleted. |
| 3 | Grader panel pinned to `gpt-5.5`@high — OK? | resolved | Yes — 3 read-only Codex instances, `-c model="gpt-5.5" -c model_reasoning_effort="high"`. |
