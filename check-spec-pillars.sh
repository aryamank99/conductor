#!/usr/bin/env bash
# check-spec-pillars.sh — pre-dispatch gate for the failure-modes / observability pillar.
#
# When reliability or observability is an ACTIVE pillar, a feature's plan/GOAL must
# declare failure modes & observability as CONCRETE criteria, not adjectives. This
# script enforces that mechanically and blocks dispatch (nonzero exit) when it's missing.
#
# HONEST SCOPE: it checks the SPEC *declares* failure handling + signals (section present,
# contains concrete handling/observability tokens). It does NOT — and cannot — verify the
# CODE actually handles the failure; that is the review loop's job (review-loop.md).
#
# usage: check-spec-pillars.sh <plan-path (file or dir)> <active-pillars-csv>
#   e.g. check-spec-pillars.sh ./plans/checkout/ "correctness,reliability,observability"
set -uo pipefail
plan="${1:-}"; pillars="${2:-}"
[ -z "$plan" ] && { echo "usage: check-spec-pillars.sh <plan-path> <active-pillars-csv>"; exit 2; }
[ -e "$plan" ] || { echo "FAIL: plan path not found: $plan"; exit 1; }

# Gate applies only when reliability or observability is active.
if ! printf '%s' "$pillars" | grep -qiE 'reliab|observab'; then
  echo "PASS — neither reliability nor observability is active; failure-modes gate is N/A."
  exit 0
fi

# Gather the spec corpus (a dir of plan artifacts, or a single file).
if [ -d "$plan" ]; then files=$(find "$plan" -maxdepth 2 -name '*.md'); else files="$plan"; fi
[ -z "$files" ] && { echo "FAIL: no .md spec files found under $plan"; exit 1; }
corpus=$(cat $files 2>/dev/null)

fail=0
# 1. The section must exist.
if ! grep -qiE 'failure modes?|observability' <<<"$corpus"; then
  echo "FAIL: no 'Failure modes & observability' section found in the plan/GOAL."
  fail=1
fi
# 2. It must contain concrete handling+signal tokens, not just adjectives.
concrete='retry|retries|backoff|timeout|fallback|circuit|propagat|throw|reject|return [0-9]{3}|[45][0-9]{2}|error code|exit code|typed|log|logged|logging|metric|counter|gauge|trace|span|alert|emit'
if ! grep -qiE "$concrete" <<<"$corpus"; then
  echo "FAIL: a failure/observability section exists but has no concrete tokens"
  echo "      (handling/return + log/metric). Reads like adjectives, not criteria."
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS — failure-modes & observability criteria are present and concrete."
  echo "NOTE: this confirms the SPEC declares them; the review loop must confirm the CODE implements them."
fi
exit "$fail"
