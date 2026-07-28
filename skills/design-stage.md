# Design stage — Opus designs, Codex builds, the artifact is the contract

**When to open this:** intake classified a task as **design-load-bearing** — visual/UX decisions are the hard part: a new page, new component, layout change, or a change to the visual language itself. A logic fix that happens to live in a front-end file is NOT design-load-bearing and skips this stage entirely. The orchestrator classifies at intake; there is no keyword trigger.

**The premise:** Opus 5 out-designs both Fable and Codex, and does nothing else in this system. It holds exactly one seat — the designer — and its entire output is frozen into artifacts before any spec is written. Codex never exercises taste; it conforms to the artifact. Fable never designs; it translates and judges conformance.

## Designer seat & delegate primitive

Headless, pinned (same reasoning as the Codex pin: an alias like `opus` can drift under you on a config/app update):

```bash
caffeinate -is claude -p --model claude-opus-5 --effort high \
  --allowedTools 'Read,Glob,Grep,Write(plans/<feature>/design/**)' \
  "<design brief>" > /tmp/design-<TAG>.log 2>&1
```

- **Write fence by construction, not instruction.** Feature runs get `Write(plans/<feature>/design/**)`; bootstrap runs get `Write(design/**)`. Opus *cannot* touch implementation code even when it overreaches — same move as the ui-verification rule that never shows the verifier the repo path. Read stays repo-wide: the designer needs the existing UI, product context, and `docs/CODEBASE_MAP.md` if present.
- **Separate budget.** Opus 5 draws from its own rate pool at half Fable's price (per the 2026-07 model-role eval). Design spend costs the conductor session nothing — this stage *adds* headroom, in line with the spine's founding reason.
- Runs long enough to outlive the session follow the detach rule: `nohup … & disown` + `.status` sentinel, never harness `run_in_background`. Most design runs are short; dispatch-and-wait is fine.
- Every dispatch is logged per `skills/run-reports.md` like any Codex run.

## Mode check — one test, first thing

Does `design/DESIGN-SYSTEM.md` exist at the repo root?

- **Yes → constrained mode.** The language is established; design the feature within it.
- **No → bootstrap mode.** The first design-load-bearing task on a project establishes the language before (not instead of) designing the feature. Same shape as the cartographer rule: a missing durable artifact is created by the first run that needs it, then every later run gets it for free.

## Bootstrap mode — establish the language

1. **Seed.** Check Project facts for a `Design language` seed (vibe words, reference sites, a taste skill to start from). Absent — the normal case for projects started before this stage existed — Opus derives direction from the product itself: audience, job, tone.
2. **Codify vs. redirect (existing UI only).** If the repo already has ad-hoc UI, the brief must make Opus decide explicitly: **codify** (an implicit language is half-there; extract and clean it) or **redirect** (it's default-framework mush; propose fresh). The recommendation and its rationale are surfaced to the user with the candidates — never silently chosen.
3. **Candidates.** Opus produces **2–3 deliberately divergent direction candidates**: one self-contained mockup page each at `design/candidates/<slug>.html`, plus `design/candidates/DIRECTIONS.md` (per candidate: name, one-paragraph rationale, where it would strain). Options beat interrogation — the user has no established taste to interrogate, but will know the right direction when they see it rendered.
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
3. Orchestrator screenshots the mockup via the warm Playwright install under `/tmp/conductor-verify` (never the project's `package.json`) and reads it — Fable's eyes confirm it renders and is coherent.
4. **User taste gate.** Plan-tier: mockup approval is a Register sign-off row — blocks dispatch. Single-component task: show the screenshot, get a quick yes. The user is final taste arbiter at the mockup, not after implementation — a taste correction costs one design revision here and a full review loop later.

Max 2 design revision rounds against the same brief, then escalate to the user with the gap named — same rhythm as the review loop.

## Downstream wiring — how the design binds the rest of the pipeline

- **Spec stage (Fable, unchanged owner).** Task specs cite `plans/<feature>/design/DESIGN.md` and `mockup.html` as read-only references in Files, and carry two criteria: *match the mockup* and *conform to `design/DESIGN-SYSTEM.md`*. Design intent enters specs as checkable criteria, never re-derived prose.
- **Implementation (Codex, unchanged).** Any snippet in DESIGN.md is reference, not implementation; Codex owns the code. A Codex deviation from the mockup is spec deviation — revision material like any other.
- **UI verification (`skills/ui-verification.md`, one added criterion).** The checklist includes screenshot-vs-mockup conformance. **Fable judges by default** — conformance against a frozen artifact is judgment, not taste. An optional Opus fidelity pass is allowed only on plan-tier features where drift across many screens matters; it reads screenshots and writes prose, nothing else.
- **Changing the language is a plan-tier event.** After bootstrap, `design/DESIGN-SYSTEM.md` changes only via an explicit task with a user gate — never as a drive-by inside a feature. That doc being frozen is what stops five features from producing five house styles.

## What the designer seat never does

Write implementation code, write task specs, review diffs, judge the review loop, or write anywhere outside its fence. If a design run needs information only a human has, it stops and the orchestrator brings the question to the user — same escalate-don't-assume rule as everywhere else.
