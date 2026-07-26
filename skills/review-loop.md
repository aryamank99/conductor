# Review loop — mandatory after every Codex run

**When to open this:** a Codex run just finished and you're about to review the diff. This runs after EVERY run, no exceptions. Part of the Conductor contract. (The conformance step's untracked-state check needs the pre-dispatch snapshot from `delegating-to-codex.md` — taken at dispatch time, not now.)

Layered — spend Claude's intelligence only on what commands can't answer:
1. **Mechanical (no judgment):** run the spec's verification commands yourself (test, build). Any failure short-circuits straight to revision feedback.
2. **Conformance:** `git status` + `git diff` against the spec. Every acceptance criterion met; no files touched outside scope; no silent scope creep.
   **Untracked-state check:** `git diff` is blind to untracked files. Run `git status --porcelain=v1 -uall > /tmp/codex-$TAG-posttree.txt && diff /tmp/codex-$TAG-pretree.txt /tmp/codex-$TAG-posttree.txt` — lines present only in `pretree` are files the run deleted or renamed outside git's view; interrogate every one, and recover via `git show $(cat /tmp/codex-$TAG-snap.txt):<path>` (see the pre-dispatch snapshot in `delegating-to-codex.md`). If no `pretree` file exists for this tag (run dispatched before the snapshot rule, or snapshot skipped), note that in the review and proceed — don't invent a baseline.
   **Unrequested work is revision material even when it's good** — the spec's Stop condition told the implementer to note improvements, not make them; letting good-but-unasked work through trains the overshoot back in. Send it back with "revert X, keep it as a note." Never accept changes sight-unseen.
3. **Judgment (where Fable earns its keep), scaled to diff size and risk:**
   - Adversarial read — hunt for a reason to reject: edge cases the tests miss, regressions to neighboring behavior, state/async hazards.
   - Cross-codebase effects: what elsewhere assumed the thing this diff changed? (Codex worked narrow; the orchestrator holds the map.)
   - Probe tests: write 1–3 targeted tests attacking the most-likely-wrong spots and run them — cheaper and more reliable than re-reading everything.
   - Altitude: flag over-engineering; ask for the simpler version if one exists.
   - UI work: diffs don't show pixels — run the UI verification protocol (`ui-verification.md`) before accepting.
   - Failure-mode conformance: if the spec carried a **Failure modes & observability** block (`failure-modes.md`), verify per declared row that the code implements the stated handling/return and emits the stated log/metric — and write ≥1 probe test that triggers the failure path and asserts the surfaced signal. The pre-dispatch linter only checked the spec *declared* this; here is where you confirm the *code* does it.
4. **Ledger audit (plan-doc tasks):** diff Codex's claims in the ledger against the actual code. Claim/code divergence is the #1 bug locus. Admitted deviations get explicit review; unadmitted deviations are automatic revision material.
5. If there are issues: send concise review feedback via `codex exec resume --last`. Max 2 revision rounds, then escalate (Claude fixes it directly).
6. When accepted, summarize the change for the user.
