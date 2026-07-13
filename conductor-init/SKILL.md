---
name: conductor-init
description: Wire the current project as a Conductor host (Claude orchestrates, Codex implements). Use when the user says "/conductor-init", "set up conductor here", "make this a conductor project", or wants the Claude/Codex orchestration system in a new project directory.
---

# Conductor init — wire the current project as a Conductor host

Canonical contract: `~/.claude/conductor/CONDUCTOR.md` (the lean spine + dispatch table; per-phase procedures live in `~/.claude/conductor/skills/`). Templates: `~/.claude/conductor/templates/`. Read the spine and both templates before writing anything; open a `skills/*.md` file when a step needs its detail.

## Steps

1. **Already wired?** If `./conductor-core.md` exists or CLAUDE.md contains `@conductor-core.md`, report that and stop (offer to refresh AGENTS.md/facts instead).
2. **Symlink the core:** `ln -s ~/.claude/conductor/CONDUCTOR.md ./conductor-core.md`. Add `conductor-core.md` to `.gitignore` (create it if absent). The symlink MUST be relative-imported — `@~/...` imports fail silently and absolute paths are permission-blocked (probe-verified 2026-06-12).
   - **Skill reachability (one-time, global):** the contract is a lean spine that points to procedure files under `~/.claude/conductor/skills/` — outside any host project, so reads there are permission-blocked by default (probe-verified 2026-06-19: the orchestrator picks the right skill but both reads are denied). Ensure `~/.claude/settings.json` lists `~/.claude/conductor` in `permissions.additionalDirectories`; add it if missing. This is global (all host projects benefit), so check once rather than per project.
3. **Inspect the project** (cheaply: manifest files like package.json/pyproject.toml/Cargo.toml, test config, top-level layout — don't deep-read source) to determine: stack, test/build/dev commands, directory layout, conventions, quirks (path oddities, env requirements).
4. **CLAUDE.md:** instantiate `templates/project-CLAUDE.md` with the facts from step 3. If a CLAUDE.md already exists, don't clobber it — add the `@conductor-core.md` import line at the top and append the Project facts block, preserving existing content.
5. **Pillars & lenses:** propose the active pillar subset and default panel lenses based on the project's surface (local UI vs server vs library — see `~/.claude/conductor/skills/plan-review-panel.md`). Confirm with the user before writing; these are judgment calls, not derivable facts.
6. **AGENTS.md:** instantiate `templates/AGENTS.md` with layout/commands/conventions. Keep the context-discipline and obligations sections verbatim. If an AGENTS.md exists, merge rather than overwrite.
7. **Codebase map:** for non-trivial projects, offer to run the cartographer skill to create `docs/CODEBASE_MAP.md` before the first plan-tier dispatch.
8. **Activate now:** the import only loads at session start, so the CURRENT session hasn't loaded the contract — you just read it (step 0 of acting as orchestrator: you already have `~/.claude/conductor/CONDUCTOR.md` in context from reading the templates' source). State that future sessions load it automatically; this session can proceed as orchestrator immediately.
9. **Adopting in-flight work:** if work was already underway when init ran (code written directly, conversation holds the intent):
   - **Inventory first:** enumerate every distinct thread of in-flight work from the conversation history, `git status`/`git diff`, stashes, and unmerged branches. Present the list — one line each: feature, state (done/remaining), where its changes live.
   - **User chooses** which feature(s) Conductor carries forward (AskUserQuestion if multiple). Never assume the most recent thread is the one they want.
   - **Untangle before dispatch:** if the working tree interleaves changes from multiple features, separate them first (commit or stash per feature, with the user's ok) — Codex specs need a clean "the tree contains X" starting point, and an agent must never receive another feature's half-done diff as context.
   - **Formalize the chosen feature(s):** write `plans/<feature>/` (plan with done/remaining/decisions-made), seed `GOAL.md` with the remaining acceptance criteria, record the current diff as the starting point — specs then say "the working tree already contains X; implement Y on top". Each adopted feature gets its own `plans/<feature>/`; run one at a time unless they touch disjoint files.
   - **Park the rest, don't drop them:** for non-adopted threads, write a short plan stub in `plans/<feature>/plan.md` (state + remaining + decisions) so they're resumable later — the conversation that holds their context won't exist next session.
   - If the remaining work on a chosen feature is small, just finish it directly (division-of-labor rule); if this session's context is already heavy, write the artifacts and recommend a fresh orchestrator session resume from them (normal rotation).
10. **Report:** list what was created/modified, the chosen pillars/lenses, and remind that commits of CLAUDE.md/AGENTS.md are the user's call.
