# Task specs & goal ledger — the work order you hand Codex

**When to open this:** any time you're writing the spec for a Codex dispatch (every non-trivial task), or seeding the ledger for a plan-tier delegation. Part of the Conductor contract.

## Task spec format (spec quality is the whole game — write these like a good ticket)
1. **Goal** — one sentence.
2. **Files** — files to create/modify, and files explicitly NOT to touch.
3. **Requirements** — concrete acceptance criteria.
4. **Constraints** — follow existing code conventions; no new dependencies unless the spec says so.
5. **Verification** — the exact command(s) that must pass (the project's test/build commands from its Project facts).
6. **Stop condition** — every spec ends with this section, verbatim shape:
   - "Done means: the Verification commands pass and every Requirement is met. When that is true, write your summary and STOP."
   - "Do NOT do work not listed in Requirements — no drive-by refactors, no extra tests beyond those specified, no reformatting of untouched code, no additional features or 'improvements'. If you notice something worth fixing, note it in `implementation-notes.md` (or your final summary for non-ledger tasks) instead of fixing it."

The Stop condition exists because current implementer models (GPT 5.6 family) tend to overshoot: they satisfy every criterion and keep going. The rest of the spec defines floors (criteria that must pass) and fences (files not to touch); this section defines the **ceiling** — what "done" is, and that done means stop. The note-it-don't-do-it clause is the load-bearing half: it gives the model an outlet for initiative that feeds the review/backlog instead of the diff. Unrequested work in the diff is automatic revision material in the review loop, even when it's good work.

Applicable pillars become concrete acceptance criteria here, never adjectives — "all input goes through the existing sanitizer," not "make it secure." (See `plan-docs.md` for the three-point pillar discipline.)

**Failure-modes gate (hard, conditional):** if the task crosses a process boundary, or `reliability`/`observability` is an active pillar, the spec MUST include a **Failure modes & observability** block before dispatch — see `failure-modes.md`. This blocks dispatch the way the Register's sign-off does; an adjective ("handle errors") does not satisfy it.

For mapped projects, the spec says "orient via docs/CODEBASE_MAP.md" instead of leaving the agent to explore. See `delegating-to-codex.md` for the orientation packet and exploration contract that every spec carries.

## Goal ledger (plan-doc tasks only)
For multi-file delegations, the task spec must instruct Codex to maintain a ledger in `plans/<feature>/`:
- `GOAL.md` — the contract. Claude seeds it from the plan doc: goal, acceptance criteria as a checklist. Codex checks items off only with validation evidence (command + output).
- `implementation-notes.md` — Codex appends as it works: decisions made, **deviations from the spec with reasons**, blockers, what was verified and how.

This keeps Codex on-task across long runs and gives review pre-registered criteria instead of post-hoc rationalization.
