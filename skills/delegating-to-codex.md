# Delegating to Codex — running the implementing engineer

**When to open this:** any time you're about to dispatch implementation to Codex, choose an effort tier, write the orientation packet, or decide what to do while a run is in flight. Part of the Conductor contract.

## The delegate command
Run Codex headless via Bash from the project root.

**Short, synchronous runs** (you'll wait it out this turn) — foreground is fine:

```bash
caffeinate -is codex exec --full-auto -c model="gpt-5.6-sol" -c model_reasoning_effort="high" --output-last-message /tmp/codex-last.txt "<task spec>"
```

- `caffeinate -is` keeps the Mac awake for the duration of the run — without it, lid-closed/battery sleep suspends Codex mid-task (turned a 2-minute task into a 2-hour wall clock once).
- `--full-auto` = sandboxed workspace-write, no approval prompts. (CLI 0.144.0 emits a deprecation warning for `--full-auto` → `--sandbox workspace-write`; functionally identical, swap when convenient.)
- Revisions: `codex exec resume --last "<review feedback>"` — keeps Codex's session context so you don't re-explain the task.
- Read `/tmp/codex-last.txt` for Codex's summary instead of keeping its full transcript in context.

## Long runs must be detached OS processes — never harness `run_in_background`
A long run can outlive the session that launched it (a `/clear`, a compaction, the terminal dying). Harness `run_in_background` is torn down at every session boundary, so a Codex run hosted inside it **dies silently mid-task** (2026-06-27: two runs vanished with zero output/files this way). Launch long runs as detached orphans and rendezvous through files, not a task handle. Write the spec to `/tmp/codex-$TAG-prompt.txt` first, then:

```bash
TAG=w4a   # unique per task AND per conductor — see namespacing below
rm -f /tmp/codex-$TAG-last.txt /tmp/codex-$TAG.status /tmp/codex-$TAG.log   # pre-flight: kill stale sentinels
cat > /tmp/codex-$TAG-run.sh <<EOF
caffeinate -is codex exec --full-auto -c model="gpt-5.6-sol" -c model_reasoning_effort="high" \\
  --output-last-message /tmp/codex-$TAG-last.txt "\$(cat /tmp/codex-$TAG-prompt.txt)"
echo "EXIT=\$?" > /tmp/codex-$TAG.status
EOF
nohup bash /tmp/codex-$TAG-run.sh > /tmp/codex-$TAG.log 2>&1 < /dev/null & disown
```

- `nohup … & disown` + `< /dev/null` fully orphans it outside the harness task tree — survives session boundaries.
- The wrapper writes `/tmp/codex-$TAG.status` (`EXIT=<code>`) **after** Codex returns — authoritative completion signal, written on success *and* crash. `--output-last-message` is written by Codex *only on success*, so it alone can't distinguish "done well" from "died."
- **Pre-flight `rm -f` is mandatory.** Reused tags + a leftover sentinel = a new run read as instantly "done" against the previous run's file.
- (Heredoc escaping is deliberate: `$TAG` bakes in now; `\$?` / `\$(cat …)` run when the wrapper runs.)

### Monitoring (keep raw output out of context)
Poll cheap signals; never read the streaming `.log` into context:
- **Completion:** `[ -f /tmp/codex-$TAG.status ]`. Then classify — `EXIT=0` → read `/tmp/codex-$TAG-last.txt` (the summary); `EXIT≠0` → crashed, read the tail of `/tmp/codex-$TAG.log`.
- **Liveness (hung vs working):** `pgrep -fl "output-last-message /tmp/codex-$TAG-last.txt"`.
- Wrap the poll in a harness `run_in_background` watcher that breaks once every tag's `.status` exists, then exits — wakes you without busy-polling your turns. The watcher is disposable: if *it* dies at a boundary, the orphans and their `.status` files persist for the next turn to pick up (see resume).

### Resume / rediscovery (the watcher or session died)
Detachment only pays off if a cold or compacted orchestrator knows to look. On resume, before assuming nothing's running:
- `ls /tmp/codex-*.status` — completed runs awaiting review.
- `pgrep -fl codex` — still-live runs; re-arm a watcher for their tags.
- Kill a hung orphan: `pkill -f "output-last-message /tmp/codex-$TAG-last.txt"`.

### Namespacing across conductors
`/tmp` is shared by every conductor on the machine. Tags must be unique per task **and** per conductor, or two sessions collide on the same sentinel — prefix with the worktree/branch slug (e.g. `TAG=<branch>-w4a`). File-level complement to the one-worktree-one-conductor rule in `parallel-conductors.md`.

## Model & effort per run
- **Pin the model: `-c model="gpt-5.6-sol"`.** The delegate template pins both model and effort explicitly. Rationale: `~/.codex/config.toml` silently defaults to Sol already (flipped by a ChatGPT-app update when Sol shipped ~2026-07-09), and an unpinned template let that swap happen invisibly — the pin makes the implementer a deliberate, audited choice that a future app/config update can't move. Override for a one-off with `-c model="<slug>"` (e.g. `gpt-5.5`). Never use `ultra`/`max` (ultra enables automatic multi-agent delegation — changes the process, not just the model).
- **Default Sol dispatches to `high`, not `xhigh`.** Established by the 2026-07-10 implementer eval (`plans/implementer-eval/readout.md`): Sol@high *matched* Sol@xhigh on the primary metric (revision rounds, 0/0/0 each), blind grading was a wash (xhigh even over-built one UI task), token spend was dead even, and wall-clock was lower at high (−49% on the UI task). Quality parity at equal cost with a speed win ⇒ start at `high`.
- **Upshift to `xhigh` for genuinely hard / correctness-critical work** — this is the standing escape hatch, kept deliberately. The same eval showed xhigh can buy a cleaner module boundary on multi-file features (Task 1), so upshift when architecture or edge-case correctness is the crux; stay at `high` for routine features, refactors, bug fixes, and restyle-shaped UI work.
- **Downshift to `medium`/`low`** only for a genuinely trivial/mechanical chore — a rename, a one-line config bump — where even `high` reasoning is pure waste.

## Codex context efficiency (protects ChatGPT quota)
- **Orientation packet:** every spec lists the exact files Codex needs to read; for small tasks, paste the relevant snippets directly into the spec so Codex starts cold but informed. Claude already read this while spec-writing — one Claude read replaces every agent's exploration.
- **Exploration contract in every spec:** "Read only the files listed. If genuinely blocked, read the minimum extra and log what/why in your notes." Makes off-spec exploration visible instead of silent.
- **Spot audit:** Codex session logs (`~/.codex/sessions/<date>/`) record every command and token count. When spend looks high for the task size, check what it read; waste becomes revision feedback, and repeat patterns graduate into the AGENTS.md no-go list.
- Note: the sandbox can't block reads — these safeguards are instruction + audit, which is the enforceable maximum.

## Wait-time policy (while Codex runs in background)
Idle costs nothing — Claude spend is tokens, not wall-clock; the scarce resources are the orchestrator's context and quota. Fill a wait only with work that makes the next pipeline step cheaper:
1. **Review prep for the running task** — draft probe tests and the adversarial checklist from the GOAL criteria. Always available: it derives from the contract, not the incoming diff. Do this right after dispatch, while the spec is fresh in context.
2. **Pre-draft the next task's spec** — ONLY when it doesn't depend on the running task's output. In sequential shared-file plans it usually does; dependency, not boredom, decides.
3. **Ledger/dispatch-log housekeeping** — token extraction, log rows, run-report bookkeeping.
Avoid: broad codebase reading "to stay warm", reading Codex's transcript mid-run, and touching any file the running agent owns. If none of the three apply, end the turn and wake on completion — that is the correct state, not waste.
