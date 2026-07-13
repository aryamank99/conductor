# Decisions & Assumptions Register — the sign-off gate

**When to open this:** any plan-tier feature — you're triaging non-obvious choices, or about to dispatch and need to confirm the gate is clear. This is a hard gate, not a nicety. Part of the Conductor contract.

The orchestrator must not silently resolve ambiguity. When the brief is silent or ambiguous on anything that changes behavior, data, cost, security posture, or an external system, **surface it — do not pick a default and bury it in the design.** Battle-tested gap (2026-06-14, CRM-integration assessment): a plan that beat the prior workflow 3/3 on independent graders *still* silently chose a client-CRM dedupe policy, a lead-qualification threshold, a placeholder-name rule, and a prod-vs-sandbox default — each a decision that belonged to the user, none flagged.

## The three buckets
Every plan-tier doc carries a **Decisions & Assumptions Register**: one row per non-obvious choice, each triaged into exactly one bucket.
- **Forced** — dictated by a requirement or a hard external constraint. Cite it. No sign-off; listed for traceability.
- **Reversible default** — a judgment call that is cheap and safe to change later. Proceed, but list it so the user can veto.
- **Needs sign-off** — affects the user's/client's data, an external system, cost, security posture, or is expensive to reverse. **Blocks dispatch.** No Codex implementation runs until the user has answered every needs-sign-off row.

Triage is the whole point: it keeps delegation cheap (forced + reversible flow through untouched) while forcing only the genuinely consequential calls up to the user, so the gate doesn't degrade into "ask about everything." **When unsure which bucket, it's needs-sign-off.**

## The Register is the whole pipeline's output, not just the first draft
- The **cold plan / decomposition** seeds it.
- The **review panel** surfaces assumptions and silently-filled ambiguities as findings (the assumptions-audit lens) — reviewers are advisory and make **no** binding calls.
- **Adjudication is itself a decision point:** when resolving a panel finding means choosing an option that is actually the user's call, that resolution becomes a needs-sign-off row — it is **never** silently folded into the revised plan.

## Sign-off gate
Present the needs-sign-off rows to the user (the AskUserQuestion tool is the natural fit) and get explicit answers before dispatching. Approving "the plan" is not approval of its buried assumptions — the Register is what the user signs.

## Implementation stage (the same discipline binds Codex, escalated one hop)
A headless implementer can't ask the user mid-run, so its rule is **escalate, don't assume.** Needs-sign-off-class decisions should already be resolved in the spec's acceptance criteria (they were signed off at plan time) — so a well-specced implementer rarely meets one. If a *new* load-bearing ambiguity emerges that the spec didn't anticipate, the implementer **HALTs that thread and writes it as a blocker in `implementation-notes.md` — it does not guess and proceed.** The orchestrator surfaces that blocker to the user on review. Forced and reversible-default calls the implementer handles itself, logging reversible ones as spec deviations. Same triage, one hop longer: implementer → orchestrator → user. (Mirrored in `templates/AGENTS.md` so it reaches Codex, which never sees the contract.)
