# Agent orientation — <project name>

<One line: stack, language, surface — e.g. "Next.js 15 + React 19 learning UI, plain JavaScript (no TypeScript), local-only (no server/auth/external data).">

## Layout
<Per-directory one-liners for the directories agents will touch. Example:>
- `app/` — <purpose>
- `lib/` — <purpose; note co-located test convention if any>
- `plans/` — feature plan docs and goal ledgers (when present)
- No codebase map yet; if `docs/CODEBASE_MAP.md` exists, orient there first.

## Commands
- Test: `<cmd>`. Build: `<cmd>`. Dev: `<cmd>`.
<Project quirks affecting commands go here.>

## Conventions
<Export style, import style, test idioms. Always include:>
- Match the style of existing files. No new dependencies unless the task spec says so.

## Context discipline (tokens are a shared, finite budget)
- Read ONLY the files your task spec lists. If genuinely blocked without another file, read the minimum necessary and log what you read and why in your notes.
- Never read: `package-lock.json` or any lock file, `node_modules/`, build artifacts, or files unrelated to your task.
- Prefer targeted reads (`rg -n "pattern"`, `sed -n 'X,Yp' file`) over dumping whole files. Never re-read a file you've already seen.
- Your session is audited for read efficiency; unexplained exploration becomes revision feedback.

## Obligations
- Touch only the files your task spec lists.
- If your task spec includes a goal ledger (`plans/<feature>/GOAL.md`), check off acceptance criteria only with validation evidence (command + output), and record decisions and any deviations from the spec in `plans/<feature>/implementation-notes.md` as you work.
- Run the spec's verification commands before declaring done.
- **Stop at done.** Done means the spec's Requirements are met and its Verification commands pass — then summarize and stop. Do not do work the spec didn't ask for: no drive-by refactors, no extra tests beyond those specified, no reformatting untouched code, no bonus features. If you notice something worth improving, write it in `implementation-notes.md` (or your final summary) instead of doing it. Unrequested work in the diff gets the whole diff sent back for revision, even when the work is good.
- **Escalate, don't assume.** If you hit a load-bearing decision the spec didn't resolve — one that affects the user's/client's data, an external system, cost, security posture, or is expensive to reverse — do **not** pick a default and proceed. HALT that thread and write it as a `BLOCKER:` line in `implementation-notes.md` (state the question and the options); the orchestrator will get the user's answer. Only small, reversible, easily-changed choices may be made yourself, and those you log as deviations. When unsure whether a choice is load-bearing, treat it as one and escalate.
