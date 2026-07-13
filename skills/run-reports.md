# Run reports — dispatch log, token accounting, report format

**When to open this:** the user asks for a "summary" or "run report", or you're logging a completed dispatch. Part of the Conductor contract.

- **Dispatch log:** after every `codex exec` completes, append a line to the feature's `plans/<feature>/dispatch-log.md` (or `/tmp/conductor-dispatch.md` for ad-hoc tasks): agent label, role (implementer/reviewer/verifier), one-line task, outcome, and its session rollout file (newest file in `~/.codex/sessions/$(date +%Y/%m/%d)/` right after the run).
- **Token extraction:** final entry of `jq 'select(.payload.type=="token_count") | .payload.info.total_token_usage' <rollout>` gives input / cached_input / output / reasoning. Real spend ≈ (input − cached_input) + output, which matches Codex's printed "tokens used".
- **Report format:** one table — agent, role, what it did, outcome, real tokens (with input/cached/output in prose if asked) — plus total spend and wall time for the run.
