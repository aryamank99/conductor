# Plan review panel — adversarial critique before sign-off

**When to open this:** you have a draft `plans/<feature>.md` and need to stress-test it before presenting the Register to the user. Plan-doc features only. Part of the Conductor contract.

## Running the panel
Before user sign-off, have Codex critique the plan with parallel read-only reviewers:

```bash
codex exec -s read-only -c model_reasoning_effort="xhigh" "Review plans/<feature>.md against this codebase through ONE lens only: <lens>. List concrete issues with file references. Do NOT write code."
```

- Use the host project's **default panel lenses** (declared in its Project facts). Lenses follow the project's surface: a local UI gets correctness/simplicity/UX/rendering-performance; add security/scalability/observability lenses only for projects with a server, auth, or external data surface.
- **Always add an assumptions-audit lens, every surface, every feature:** one reviewer whose only job is to find choices the plan resolved without authority and ambiguities it silently filled. Its findings become Decisions & Assumptions Register rows (`decisions-register.md`), not silent design. Cheap, and it catches what the plan author is blind to.
- Scale the panel to the feature: 1–2 lenses for modest features, full panel only for big ones.

## Adjudication
- Claude adjudicates: reviewers are advisors, not gates. Accept/reject each finding with a reason — expect nitpick theater and discard it. To debate a finding, use `codex exec resume` so the reviewer keeps its context.
- **Adjudication is itself a decision point:** when resolving a finding means choosing an option that is actually the user's call, that resolution becomes a needs-sign-off Register row — it is **never** silently folded into the revised plan.
- Update the plan doc with what survives, then present to the user.
