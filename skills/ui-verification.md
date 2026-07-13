# UI verification protocol — diffs don't show pixels

**When to open this:** a UI-affecting task has passed code review and must be visually verified before acceptance. Projects with a UI only. Battle-tested 2026-06-12 (three attempts — read the sandbox rules). Part of the Conductor contract.

After any UI-affecting task passes code review:
1. Start the dev server in the background (the project's dev command), note the port.
2. Dispatch a Codex **verifier** agent with `-s danger-full-access` — NOT `--full-auto`. The workspace-write seatbelt blocks BOTH localhost sockets (verifier can't reach the dev server) and Chromium process launch (crash-loops, popping macOS crash dialogs at the user). Compensate for the open sandbox in the spec: "treat the repo as read-only by discipline — your only writes are screenshots and REPORT.md", and cap browser-launch retries at 2.
3. Browser tooling: headless Playwright installed under `/tmp/conductor-verify` (never touch the project's `package.json`). Codex's native browser-attach tooling assumes a desktop Chrome that doesn't exist in headless runs; raw computer use needs the real unlocked screen. Keep the `/tmp` install warm — the orchestrator can re-verify small direct fixes itself through the same install instead of re-dispatching.
4. Spec shape: deterministic checklist, one screenshot per criterion/state to `plans/<feature>/screenshots/`, pass/fail per item in `REPORT.md`. If app state lives client-side (e.g. localStorage): one persistent browser context for the whole checklist.
5. Claude reads the screenshots directly (Read handles images) and applies design judgment — Codex is the hands, Claude is the eyes/judge.
6. The user remains final taste arbiter for plan-tier UI changes — show them the key screenshots rather than asking them to capture any.
