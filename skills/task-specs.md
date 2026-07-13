# Task specs & goal ledger — the work order you hand Codex

**When to open this:** any time you're writing the spec for a Codex dispatch (every non-trivial task), or seeding the ledger for a plan-tier delegation. Part of the Conductor contract.

## Task spec format (spec quality is the whole game — write these like a good ticket)
1. **Goal** — one sentence.
2. **Files** — files to create/modify, and files explicitly NOT to touch.
3. **Requirements** — concrete acceptance criteria.
4. **Constraints** — follow existing code conventions; no new dependencies unless the spec says so.
5. **Verification** — the exact command(s) that must pass (the project's test/build commands from its Project facts).

Applicable pillars become concrete acceptance criteria here, never adjectives — "all input goes through the existing sanitizer," not "make it secure." (See `plan-docs.md` for the three-point pillar discipline.)

**Failure-modes gate (hard, conditional):** if the task crosses a process boundary, or `reliability`/`observability` is an active pillar, the spec MUST include a **Failure modes & observability** block before dispatch — see `failure-modes.md`. This blocks dispatch the way the Register's sign-off does; an adjective ("handle errors") does not satisfy it.

For mapped projects, the spec says "orient via docs/CODEBASE_MAP.md" instead of leaving the agent to explore. See `delegating-to-codex.md` for the orientation packet and exploration contract that every spec carries.

## Goal ledger (plan-doc tasks only)
For multi-file delegations, the task spec must instruct Codex to maintain a ledger in `plans/<feature>/`:
- `GOAL.md` — the contract. Claude seeds it from the plan doc: goal, acceptance criteria as a checklist. Codex checks items off only with validation evidence (command + output).
- `implementation-notes.md` — Codex appends as it works: decisions made, **deviations from the spec with reasons**, blockers, what was verified and how.

This keeps Codex on-task across long runs and gives review pre-registered criteria instead of post-hoc rationalization.
