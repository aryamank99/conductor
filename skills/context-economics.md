# Context economics — context-guard hooks and context hygiene

**When to open this:** you're managing orchestrator/agent context budgets, hit a context gate, or need the rotation/handoff rules. Part of the Conductor contract.

## Context hygiene (this is what protects Claude usage limits)
- Read diffs, not the whole files Codex touched.
- Verify by running commands, not by re-reading the codebase.
- Keep Codex's raw output out of context — use `--output-last-message` and read only that file plus the diff.

## Context-guard hooks (the safety net around the discipline)
Both sides run context-guard hooks (a small personal toolkit of Claude Code / Codex hooks); Conductor treats them as its safety net. Conductor *prevents* fat sessions by design (fresh agent per task, lean orchestrator context); the hooks *catch* the failures.
- **Codex side (fires on headless runs too — verified):** notify watcher pings the user at 150k context/msg; Stop hook forces the agent to write `HANDOFF.md` at 150k; prompt gate hard-blocks messages into sessions past 200k.
- **Rule — gate-blocked resume means respawn, not !force:** if `codex exec resume` gets blocked by the context gate, do NOT `!force`. A 200k-context revision round costs more than a fresh agent. Spawn a replacement with: the spec + current diff + the review feedback + the agent's `HANDOFF.md`/ledger. A Conductor agent crossing 150k context-per-message is a mis-scoped task — split it.
- **Claude side:** statusline meter (green <100k / yellow <200k / red) shows the orchestrator's own context; Stop hook forces a handoff doc at 200k. When it fires mid-feature, the handoff doc must point at `plans/<feature>/` (plan, ledger, dispatch log) — those artifacts make orchestrator rotation lossless; a fresh session resumes from them.
- **Fleet-mode caveats (fix before running parallel agents):** the notify watcher resolves "newest rollout file" globally and can mis-attribute sessions under parallelism, and `HANDOFF.md` is a fixed filename that collides across concurrent agents. Patch both in the hooks before fleet work.
- Thresholds are env-tunable per dispatch (`CTX_HANDOFF_THRESHOLD`, `CTX_HARD_LIMIT`) since hooks inherit the spawning shell's env.
