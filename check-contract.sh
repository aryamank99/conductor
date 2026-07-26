#!/usr/bin/env bash
# check-contract.sh — structural integrity of the spine + skills split.
# Deterministic guard for the Superpowers-style modularization: catches dead
# dispatch-table links, orphaned skills, headerless skills, and — most important —
# battle-tested specifics that could be silently lost when content moves between files.
# Run after any edit to CONDUCTOR.md or skills/. Exit 0 = clean.
set -uo pipefail
cd "$(dirname "$0")"
fail=0
note() { printf '  %s\n' "$1"; }
section() { printf '\n== %s ==\n' "$1"; }

section "spine exists"
[ -f CONDUCTOR.md ] || { note "MISSING CONDUCTOR.md"; fail=1; }

# Reference form is canonical `skills/<name>.md` in the dispatch table and prose.
referenced=$(grep -oE 'skills/[a-z-]+\.md' CONDUCTOR.md | sed 's#skills/##' | sort -u)
ondisk=$(ls skills 2>/dev/null | sort)

section "dead links (referenced in spine, missing on disk)"
dead=$(comm -23 <(printf '%s\n' "$referenced") <(printf '%s\n' "$ondisk"))
if [ -n "$dead" ]; then printf '%s\n' "$dead" | while read -r f; do note "DEAD: skills/$f"; done; fail=1; else note "none"; fi

section "orphans (on disk, never referenced in spine)"
orphan=$(comm -13 <(printf '%s\n' "$referenced") <(printf '%s\n' "$ondisk"))
if [ -n "$orphan" ]; then printf '%s\n' "$orphan" | while read -r f; do note "ORPHAN: skills/$f"; done; fail=1; else note "none"; fi

section "every skill carries a 'When to open this' header"
for f in skills/*.md; do
  grep -q 'When to open this' "$f" || { note "NO HEADER: $f"; fail=1; }
done
[ "$fail" -eq 0 ] && note "all good" || true

section "content-loss guard (battle-tested specifics must survive the split)"
# Each canary is a hard-won detail whose silent loss would regress the contract.
# It must appear somewhere under the contract (spine or any skill).
canaries=(
  "caffeinate -is"
  "model_reasoning_effort"
  "output-last-message"
  "danger-full-access"
  "/tmp/conductor-verify"
  "assumptions-audit"
  "Needs sign-off"
  "Blocks dispatch"
  "escalate, don't assume"
  "git worktree"
  "token_count"
  "HANDOFF.md"
  "150k"
  "200k"
  "cartographer"
  "2026-06-12"
  "2026-06-14"
  "process boundary"
  "Failure modes"
  "check-spec-pillars"
  "nohup"
  "2026-06-27"
  "Stop condition"
  "pretree"
  "write-tree"
  "/tmp/conductor-verify/<TAG>"
  "content-shaped floor"
  "workspace-write"
)
corpus=$(cat CONDUCTOR.md skills/*.md)
for c in "${canaries[@]}"; do
  # herestring, not a pipe: grep -q exits on first match and a pipe would let
  # printf die of SIGPIPE, which pipefail reports as a spurious failure
  grep -qF "$c" <<<"$corpus" || { note "LOST: \"$c\""; fail=1; }
done
[ "$fail" -eq 0 ] && note "all $(echo "${#canaries[@]}") canaries present" || true

section "failure-modes gate linter present + executable"
if [ -x check-spec-pillars.sh ]; then note "check-spec-pillars.sh ok"; else note "MISSING or non-exec: check-spec-pillars.sh"; fail=1; fi

section "result"
if [ "$fail" -eq 0 ]; then echo "PASS — contract structure intact"; else echo "FAIL — see items above"; fi
exit "$fail"
