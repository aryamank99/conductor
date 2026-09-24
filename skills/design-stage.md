# Design stage — the designer seat (Fable 5.1) designs, Codex builds, the artifact is the contract

**When to open this:** intake classified a task as **design-load-bearing** — visual/UX decisions are the hard part: a new page, new component, layout change, or a change to the visual language itself. A logic fix that happens to live in a front-end file is NOT design-load-bearing and skips this stage entirely. The orchestrator classifies at intake; there is no keyword trigger.

**The premise:** design is a separate seat, not an inline step. The designer seat runs Fable 5.1 (`claude-fable-5-1`, user decision 2026-09-02 replacing Opus 5) headless in its own write-fenced process, and its entire output is frozen into artifacts before any spec is written. Codex never exercises taste; it conforms to the artifact. The orchestrator never designs inline; it briefs the seat, then translates and judges conformance.

## Designer seat & delegate primitive

Headless, pinned (same reasoning as the Codex pin: an alias like `fable` can drift under you on a config/app update):

```bash
caffeinate -is claude -p --model claude-fable-5-1 --effort high \
  --allowedTools 'Read,Glob,Grep,Edit(plans/<feature>/design/**)' \
  < /tmp/design-<TAG>-prompt.txt > /tmp/design-<TAG>-last.txt 2>>/tmp/design-<TAG>.log
```

Two CLI facts, learned the hard way (first live run, 2026-07-28, EXIT=1 with zero artifacts):
- **The brief goes in on stdin, never as a positional argument.** `--allowedTools` is variadic — a
  positional prompt after it is consumed as extra tool rules and the run dies with "Input must be
  provided either through stdin or as a prompt argument".
- **The write fence is spelled `Edit(<dir>/**)`, not `Write(...)`.** `Write(path)` rules are never
  matched by file permission checks; `Edit(path)` rules cover ALL file-editing tools including
  Write.

- **Write fence by construction, not instruction.** Feature runs get `Edit(plans/<feature>/design/**)`; bootstrap runs get `Edit(design/**)`. The designer *cannot* touch implementation code even when it overreaches — same move as the ui-verification rule that never shows the verifier the repo path. Read stays repo-wide: the designer needs the existing UI, product context, and `docs/CODEBASE_MAP.md` if present.
- **Budget.** The seat runs on Fable 5.1 and shares the orchestrator's rate pool, so design spend is real spend. Keep briefs tight, dispatch once per revision, and hold the 2-revision cap. (Before 2026-09-02 the seat was Opus 5 on its own pool; see `plans/model-role-eval.md` for that history.)
- Runs long enough to outlive the session follow the detach rule: `nohup … & disown` + `.status` sentinel, never harness `run_in_background`. Most design runs are short; dispatch-and-wait is fine.
- Every dispatch is logged per `skills/run-reports.md` like any Codex run.

## Mode check — one test, first thing

Does `design/DESIGN-SYSTEM.md` exist at the repo root?

- **Yes → constrained mode.** The language is established; design the feature within it.
- **No → bootstrap mode.** The first design-load-bearing task on a project establishes the language before (not instead of) designing the feature. Same shape as the cartographer rule: a missing durable artifact is created by the first run that needs it, then every later run gets it for free.

## Bootstrap mode — establish the language

1. **Seed.** Check Project facts for a `Design language` seed (vibe words, reference sites, a taste skill to start from). Absent — the normal case for projects started before this stage existed — the designer derives direction from the product itself: audience, job, tone.
2. **Codify vs. redirect (existing UI only).** If the repo already has ad-hoc UI, the brief must make the designer seat decide explicitly: **codify** (an implicit language is half-there; extract and clean it) or **redirect** (it's default-framework mush; propose fresh). The recommendation and its rationale are surfaced to the user with the candidates — never silently chosen.
3. **Candidates.** The designer seat produces **2–3 deliberately divergent direction candidates**: one self-contained mockup page each at `design/candidates/<slug>.html`, plus `design/candidates/DIRECTIONS.md` (per candidate: name, one-paragraph rationale, where it would strain). Options beat interrogation — the user has no established taste to interrogate, but will know the right direction when they see it rendered.
4. **User gate — BLOCKS.** The user picks a direction (or asks for a re-roll). Treat exactly like a needs-sign-off Register row: no expansion run, no spec, no dispatch until answered. Show rendered screenshots; never ask the user to capture them.
5. **Expansion.** A second run expands the winner into `design/DESIGN-SYSTEM.md`. Required sections (the artifact gate greps for these): `## Tokens` (colors, exact values), `## Typography` (faces, scale), `## Spacing`, `## Components` (conventions, radii, shadows, density), `## Motion`, `## States` (hover/focus/disabled/empty/loading/error house style). Spec-grade values throughout — a model with no taste must be able to conform mechanically. Adjectives are not entries.
6. **Wire it in.** Add one line to the project's `AGENTS.md` layout section: `design/DESIGN-SYSTEM.md` — binding design language for all UI work; conform to its tokens. (Codex reads AGENTS.md natively; this is how the language reaches every future implementer without per-spec repetition.) Update the Project facts `Design language` line to `established — see design/DESIGN-SYSTEM.md`.
7. Then run **constrained mode** for the feature that triggered bootstrap.

## Constrained mode — design the feature within the language

Brief contains: the feature ask, `design/DESIGN-SYSTEM.md` as a **hard constraint**, pointers to adjacent existing screens, and the write fence path. Deliverables in `plans/<feature>/design/`:

- **`DESIGN.md`** — spec-grade, not vibes: layout structure per screen/component, exact tokens used (referencing DESIGN-SYSTEM.md by name), every interaction state, responsive behavior per breakpoint, and a `## Deviations` section (empty, or each deviation from DESIGN-SYSTEM.md argued explicitly — an undeclared deviation is a gate failure).
- **`mockup.html`** — one or more self-contained renderable pages. No external URLs: no CDN scripts, no remote fonts/images (grep-checkable). This file is the pixel ground truth downstream.

## Artifact gate — before any spec is written

**Never trust the exit signal over the artifact** (spine rule; four costumes, 2026-07-25). Verify with a content-shaped floor:

1. `DESIGN.md` exists, clears a size floor, and contains the required section markers; bootstrap: same for `DESIGN-SYSTEM.md`.
2. `mockup.html` clears a size floor and `grep -E 'https?://'` comes back empty.
3. Orchestrator screenshots the mockup via the warm Playwright install under `/tmp/conductor-verify` (never the project's `package.json`) and reads it — the orchestrator's eyes confirm it renders and is coherent.
4. **User taste gate.** Plan-tier: mockup approval is a Register sign-off row — blocks dispatch. Single-component task: show the screenshot, get a quick yes. The user is final taste arbiter at the mockup, not after implementation — a taste correction costs one design revision here and a full review loop later.

Max 2 design revision rounds against the same brief, then escalate to the user with the gap named — same rhythm as the review loop.

## Downstream wiring — how the design binds the rest of the pipeline

- **Spec stage (the orchestrator, unchanged owner).** Task specs cite `plans/<feature>/design/DESIGN.md` and `mockup.html` as read-only references in Files, and carry two criteria: *match the mockup* and *conform to `design/DESIGN-SYSTEM.md`*. Design intent enters specs as checkable criteria, never re-derived prose.
- **Implementation (Codex, unchanged).** Any snippet in DESIGN.md is reference, not implementation; Codex owns the code. A Codex deviation from the mockup is spec deviation — revision material like any other.
- **UI verification (`skills/ui-verification.md`, one added criterion).** The checklist includes screenshot-vs-mockup conformance. **The orchestrator judges by default** — conformance against a frozen artifact is judgment, not taste. An optional designer-seat fidelity pass is allowed only on plan-tier features where drift across many screens matters; it reads screenshots and writes prose, nothing else.
- **Changing the language is a plan-tier event.** After bootstrap, `design/DESIGN-SYSTEM.md` changes only via an explicit task with a user gate — never as a drive-by inside a feature. That doc being frozen is what stops five features from producing five house styles.

## What the designer seat never does

Write implementation code, write task specs, review diffs, judge the review loop, or write anywhere outside its fence. If a design run needs information only a human has, it stops and the orchestrator brings the question to the user — same escalate-don't-assume rule as everywhere else.
