# Failure modes & observability — the boundary gate

**When to open this:** you're about to dispatch a task whose code will cross a **process boundary**, OR the host project has `reliability` or `observability` in its Active pillars. This is a hard gate, like the Register's sign-off. Part of the Conductor contract.

## What this gate is for
The pillar discipline ("criteria, not adjectives") is otherwise enforced only by prose + the review panel — strong, but skippable. This gate gives reliability/observability *teeth*: a delegated task that touches a failure-prone boundary **does not dispatch** until its spec says what happens when that boundary fails and how the failure is seen.

## Process boundary (the trigger)
Any point where the code depends on something that can fail independently of it:
- a network / HTTP request, or an external API / SDK call
- a database or cache query
- file or filesystem I/O
- a subprocess / shell-out
- a queue, socket, or other IPC
If the diff crosses none of these AND reliability/observability is not an active pillar, the gate is **N/A** — record that and move on (writing "N/A — no process boundary" forces the check).

## The required block (what blocks dispatch)
The spec (inline for single-component, or the plan doc + seeded into `GOAL.md` for plan-tier) must carry a **Failure modes & observability** block. For each boundary, one row with all three columns — never an adjective:

| Boundary / what fails | Handling (return / error behavior) | Signal (how the failure is seen) |
|---|---|---|
| POST /charge times out | retry 2× w/ backoff, then return 502 + typed `UpstreamTimeout` | `error` log w/ request id + attempt count; increment `charge.timeout` counter |
| DB write rejects (constraint) | propagate as 409, do not retry | `warn` log w/ record id; no metric |

Adjectives ("make it resilient", "add logging", "handle errors gracefully") **do not satisfy the gate** — they name no failure, no behavior, no signal.

## Enforcement
1. **Pre-dispatch (mechanical, plan-tier):** run the linter against the feature's plan/GOAL —
   ```bash
   ~/.claude/conductor/check-spec-pillars.sh <project>/plans/<feature>/ "<active-pillars-csv>"
   ```
   Nonzero exit blocks dispatch. **Honest scope:** it verifies the block is *present and concrete* (boundary + handling/return + log/metric tokens); it does **not** and cannot verify the code will actually handle the failure — that is the review loop's job. For inline single-component specs there's no file to lint, so the orchestrator self-checks against this block format before dispatch.
2. **Review conformance (judgment):** the review loop checks, per declared row, that the code implements the stated handling and emits the stated signal, and that ≥1 probe test triggers a failure path and asserts the surfaced signal (see `review-loop.md`).

## Why conditional, not universal
Like the Register, the gate is triaged so it stays cheap: it fires only on real boundaries / active pillars, so a local-UI project with nothing to observe never pays for it. When unsure whether something is a process boundary, treat it as one.
