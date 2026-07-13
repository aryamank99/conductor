# Implementer eval — readout (GPT-5.6 Sol effort calibration + 5.5 regression tripwire)

**Executed:** 2026-07-10 by the Opus 4.8 conductor session, per the pre-registered protocol in
`~/.claude/conductor/plans/implementer-eval.md` (plan v2). No redesign; protocol followed as written.
Arms: **S-hi** = gpt-5.6-sol/high · **S-x** = gpt-5.6-sol/xhigh · **T** = gpt-5.5/xhigh.

## Headline
- **Adopt `high` as the default effort for Sol dispatches.** S-hi *matched* S-x on the primary metric
  (revision rounds: 0/0/0 each); blind grading of the two Sol arms was a **wash** (S-x favored 2/1 on
  Task 1 for a cleaner module split; S-hi favored 3/3 on Task 3 for staying scoped where xhigh over-built);
  token spend is **dead even** and **wall-clock is lower** at high (−49% on the UI task). A match at equal
  cost with a speed win ⇒ default to high; keep the standing rule to upshift to xhigh for hard tasks.
- **No 5.5→Sol regression per the pre-registered tripwire** — but with one honest caveat. Sol@xhigh needed
  **fewer** revision rounds than 5.5@xhigh on Task 1 (0 vs 1, since 5.5 shipped a visible defect) and tied
  on Task 2. The tripwire (defined on rounds/both-task grader preference) did **not** fire. However, graders
  did prefer the 5.5 *code* 3/0 on Task 1 for deeper schema validation — see the tripwire discussion; it
  doesn't meet the flag's bar and is offset by 5.5 needing a fix round to ship at all.
- **Pin the model explicitly** in the delegate template (`-c model="gpt-5.6-sol"`) so an app/config
  update can't silently swap the implementer again (it already had — `~/.codex/config.toml` defaults to Sol).

## Preflight
All three arms reported the requested model + effort, EXIT=0, `PREFLIGHT-OK`. No rejections.

## Objective metrics (per run)
Task 1 = conductor-pit Phase 1 stage renderer (no test/build harness → verified by `node --check` +
pixel UI verification). Task 2 = seeded `interleave` mutation bug (`npm test`). Task 3 = practice
restyle (`npm test` + `npm run build` + pixel UI verification).

| Run | Task | Arm | 1st-delivery verify | Revision rounds | Conformance | Wall | Real tokens |
|---|---|---|---|---|---|---|---|
| cp-shi | 1 | **S-hi** | node-check ✓; all 6 criteria + both failure modes ✓ | **0** | in scope | 447s | 125,336 |
| cp-sx | 1 | **S-x** | ✓ + live "performing/settled/waiting" counter | **0** | in scope | 464s | 104,964 |
| cp-t | 1 | **T** | renders, but error panel shown on *success* (CSS `[hidden]` defeated by `display:grid`) | **1** (fixed correctly, minimal) | in scope | 628s +rev | 201,429¹ |
| t2-shi | 2 | **S-hi** | 42/42 ✓ | **0** | only lib/practice.js | 40s | 16,428 |
| t2-sx | 2 | **S-x** | 42/42 ✓ | **0** | only lib/practice.js | 34s | 25,330 |
| t2-t | 2 | **T** | 42/42 ✓ | **0** | only lib/practice.js | 34s | 18,008 |
| t4-shi | 3 | **S-hi** | 40/40 ✓, build ✓, all criteria ✓ | **0** | 2 files, presentation-only | 165s | 69,410 |
| t4-sx | 3 | **S-x** | 40/40 ✓, build ✓, all criteria ✓ | **0** | 2 files, presentation-only | 327s | 82,829 |

¹ cp-t real tokens are cumulative incl. the revision round (resume appends to the same session).

**Revision rounds (the primary decision metric):** S-hi = 0/0/0 · S-x = 0/0/0 · T = 1/0.

### Task 2 — all three arms identical
All three produced the **byte-identical** ground-truth fix (`const pool = [...items]` restored), 42/42
green, only `lib/practice.js` touched, correct root-cause naming, 0 rounds. Blind grading skipped as
vacuous (identical text) — formal tie. The tripwire's known seed was recovered cleanly by every arm.

## Blind grading (3 graders @ gpt-5.5/high, forced preference; A/B randomized, identifiers stripped)
> Process note: my first cmp1/cmp2 bundle was contaminated — a `git add -N` pathspec that named a file
> only one arm created (`timeline-state.js`) silently dropped the other arms' `app.js`/`styles.css` from
> their diffs. Detected because all graders reported diff-A "references files that aren't added." Diffs
> were regenerated complete and cmp1/cmp2 **re-graded from scratch**. cmp3 was never affected.

| Comparison | Task | Graders' pick | Tally |
|---|---|---|---|
| S-hi vs S-x | 1 | **S-x** | 2/1 (g3 → S-hi) |
| S-x vs T | 1 | **T** | 3/0 |
| S-hi vs S-x | 3 | **S-hi** | **3/3** |

**Task 1 S-hi vs S-x (cmp1):** S-x 2/1. Graders liked S-x isolating replay-state/validation/formatting
into a separate `timeline-state.js` ("cleaner app logic"); the dissenter preferred S-hi's stricter shape
validation and more direct wiring. Both share one real conformance miss (below). Close call.

**Task 1 S-x vs T (cmp2):** all 3 preferred **T** (5.5). On *code*, T's post-fix renderer has deeper
timeline/shape validation and role-specific styling; S-x "validates less, carries role mostly as text,
silently ignores malformed events." Important context the graders can't see: T's *delivered* artifact was
visually broken (error overlay on success) and needed a revision round; S-x shipped clean. So T wins on
code-review depth, S-x wins on first-delivery shippability.

**On the graders' unanimous "default data path fails under `npm run serve`" finding — it's a bundling
artifact, not a real defect (and it's a constant, so it doesn't bias the A/B preferences).** To keep diffs
readable I excluded the large, identical copied `web/data/*.json` from all three graded bundles, so graders
couldn't see that each arm *did* add it. The conductor verified the real thing: all three servers return
HTTP 200 for `/data/assessment-graders.json` and the pages render (see `screenshots/task1/`). Because
the exclusion hit all three arms equally, it depressed everyone's absolute spec-conformance score but left
the relative preferences valid. (Genuinely true for all three: none wrote the full implementation-notes
verification the spec requested.)

**Task 3 (cmp3):** all 3 graders preferred **S-hi**. Rationale (consistent across graders): both diffs
preserve all logic/handlers/state and satisfy the stage-label + aria-live + focus requirements, but
S-x (xhigh) was *"more visually ambitious but much larger, adds hard-coded colors, and changes the
completion wrapper too,"* while S-hi (high) *"reuses more existing panel/field/callout patterns … more
scoped and maintainable."* i.e. at xhigh Sol over-built; at high it stayed appropriately lean. My own
pixel review agrees both render well; S-x is marginally more elaborate, S-hi marginally cleaner.

## Spend delta — S-hi vs S-x (the whole point of the calibration)
| | S-hi (high) | S-x (xhigh) | Δ (high vs xhigh) |
|---|---|---|---|
| Task 1 real tokens | 125,336 | 104,964 | **+19.4%** (high *more*) |
| Task 2 real tokens | 16,428 | 25,330 | −35.1% |
| Task 3 real tokens | 69,410 | 82,829 | −16.2% |
| **Aggregate real** | **211,174** | **213,123** | **−0.9% (dead even)** |
| Wall (T1/T2/T3) | 447/40/165 | 464/34/327 | faster overall; **−49% on T3** |

**Finding:** the NUX premise "high is cheaper" is **not supported on tokens** for this battery — spend is
within noise (Task 1 even inverted: high spent more). The real case for `high` is **quality parity (often
better) + faster wall-clock**, not token savings. That still favors `high`, just for different reasons
than assumed.

## Decision-rule application (pre-registered)
- **Effort → adopt `high`.** Rule: adopt if S-hi matches S-x on revision rounds *and* grader majority
  (ties count as match). Rounds: 0/0/0 vs 0/0/0 → **match**. Graders across the two discriminating
  comparisons: Task 1 → S-x (2/1), Task 3 → S-hi (3/3), Task 2 → tie → **1-1 wash = match**. Tie-breakers
  both favor high: token spend dead even, wall-clock lower (−49% on Task 3). ⇒ Adopt `high`. Keep the
  spine's rule to **upshift to xhigh for genuinely hard/high-stakes tasks** (and note the Task-1 signal
  that xhigh's extra effort can buy a cleaner module boundary on multi-file work — a fair reason to upshift
  there).
- **Tripwire → not triggered (no regression flag), reported honestly.** Fires only if S-x needed *more*
  rounds than T on *both* Tasks 1–2, **or** graders preferred T on *both*. Rounds: T1 S-x 0 < T 1 (T shipped
  a visible defect); T2 tie → S-x never needed more. Grader preference: T2 was a tie (identical diffs), so
  "graders preferred T on both" is false. **Neither condition met → no flag → proceed with Sol.** Honest
  caveat for the record: on Task 1 code-review alone, all 3 graders preferred the 5.5 renderer (deeper
  schema validation, role-specific styling) over Sol@xhigh's — but (a) that's one task, (b) it grades 5.5's
  *fixed* code while its delivered artifact was broken and cost a revision round, and (c) Sol@xhigh's arm
  shipped clean. Net: no workflow regression; if anything Sol was the more reliable first-delivery.
- **Pin the model** regardless: add `-c model="gpt-5.6-sol"` to the delegate template.

## Recommended change to `skills/delegating-to-codex.md`
Change the pinned delegate command from effort-only to model+effort:

    caffeinate -is codex exec --sandbox workspace-write \
      -c model="gpt-5.6-sol" -c model_reasoning_effort="high" \
      --output-last-message /tmp/codex-last.txt "<task spec>"

and reword the effort policy: **default `high` for Sol**; upshift to `xhigh` only for genuinely hard
design/correctness-critical work; the model pin prevents silent implementer swaps. (Also worth noting:
`--full-auto` now emits a deprecation warning in CLI 0.144.0 → `--sandbox workspace-write`.)

## Caveats (honest, n is tiny)
- n = 3 tasks, 8 runs. Win/loss counts, not statistics. One UI defect (cp-t) and one over-build (t4-sx)
  are single data points, not trends.
- Task 2 was too easy to discriminate the two Sol efforts (identical output) — it served its tripwire
  purpose, not calibration.
- Graders are code reviewers (no pixels); for the UI tasks their judgment is combined with the
  conductor's direct screenshot review, which agreed with them.
- The one live cp-t defect was caught only by pixel verification (invisible in the diff) — reaffirms the
  ui-verification gate.

## Artifacts
- Frozen specs: `specs/task{1,2,3}-*.md` · Dispatch log: `dispatch-log.md`
- Screenshots: `screenshots/task1/*` (3 renderers × states), `screenshots/task3/*` (2 restyles × states)
- Grader briefs + verdicts: `/tmp/eval-grading/` (briefs, diffs, secret A/B key)
- Winners to ship (per Register #2): Task 1 → best renderer; Task 2 → any (identical); Task 3 → best restyle.
