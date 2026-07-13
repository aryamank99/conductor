# Plan docs — structure and pillar handling for plan-tier work

**When to open this:** you've routed a task to the plan-tier (multi-file / multi-task feature) and are writing `plans/<feature>.md`. Part of the Conductor contract.

## What a plan-tier doc contains
**Step 0 — branch before you write anything.** Create the feature branch off the trunk (`git switch -c <feature>`) before the plan doc or any dispatch, so the whole feature — plan, ledger, and every task diff — lands off-trunk and merges back as one unit (see "Branch hygiene" in the spine).

Write `plans/<feature>.md` BEFORE dispatching any implementation:
- **Decomposition** — the feature split into per-task specs (each in `task-specs.md` format).
- **Design decisions** — the architectural calls and why.
- **Non-functional-requirements section** — see pillar handling below.
- **Decisions & Assumptions Register** — see `decisions-register.md`. This is a hard gate.
- **Verification plan** — how the whole feature is proven done.

Then run the plan review panel (`plan-review-panel.md`), fold in what survives, and get the user's sign-off on the Register's needs-sign-off rows before dispatching any implementation.

## Pillar handling — enforced at three points, highest leverage first
Pillars are mostly *decided at plan time*; review can flag their absence but can't retrofit them.
1. **Plan doc:** every plan-tier feature includes a short non-functional-requirements section — one line per applicable pillar saying what it concretely means here ("N/A — static local data" is a valid entry; writing it forces the thought).
2. **Task specs:** applicable pillars become concrete acceptance criteria, never adjectives — "all input goes through the existing sanitizer," not "make it secure."
3. **Review:** panel lenses check the plan addressed what it should; per-diff review checks the spec's pillar criteria were met.

Full pillar catalog (which apply is a property of the project): correctness, reliability, performance, scalability, security, observability, maintainability, testability, UX/accessibility, cost/operability. The **active set** is declared in the host project's Project facts.

When `reliability` or `observability` is active, the NFR section is not one adjective line — it carries the **Failure modes & observability** block (per-boundary: what fails → handling/return → log/metric signal; see `failure-modes.md`), and those rows seed `GOAL.md`'s acceptance criteria. The pre-dispatch linter `check-spec-pillars.sh` enforces this on plan-tier artifacts.
