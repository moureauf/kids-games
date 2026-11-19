#!/usr/bin/env bash
# Claim an issue for this build session, so parallel sessions never pick the
# same one. Each session posts a claim comment; the first claim after the
# last release wins. Losers delete their comment and try the next issue.
#
# Usage:
#   scripts/claim-issue.sh            claim the oldest free issue, print its number
#   scripts/claim-issue.sh <n>        claim issue <n>, print it (exit 1 if taken)
#   scripts/claim-issue.sh --release <n>   give the issue back (session abandoned)
set -euo pipefail

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

if [ "${1:-}" = "--release" ]; then
	n="$2"
	gh issue comment "$n" --body "<!-- release --> Released by a build session; the issue is free again." >/dev/null
	gh issue edit "$n" --remove-label in-progress --remove-assignee @me >/dev/null
	exit 0
fi

# Unique per session: worktree folder + process id + random number.
id="$(basename "$(git rev-parse --show-toplevel)")-$$-$RANDOM"

winner() {
	gh api "repos/$repo/issues/$1/comments" --paginate --slurp | jq -r '
		add // [] | reduce .[] as $c (null;
			if ($c.body | test("<!-- release -->")) then null
			elif . == null and ($c.body | test("<!-- claim:")) then
				($c.body | capture("<!-- claim:(?<id>[^ ]+) -->").id)
			else . end) // ""'
}

try_claim() {
	local n="$1" url
	url=$(gh issue comment "$n" --body "<!-- claim:$id --> Claimed by a build session (\`$id\`).")
	sleep 3 # let claims from sessions started at the same moment land
	if [ "$(winner "$n")" = "$id" ]; then
		gh issue edit "$n" --add-label in-progress --add-assignee @me >/dev/null
		echo "$n"
		return 0
	fi
	gh api -X DELETE "repos/$repo/issues/comments/${url##*#issuecomment-}" >/dev/null
	return 1
}

if [ -n "${1:-}" ]; then
	try_claim "$1" || { echo "Issue #$1 is already claimed by another session." >&2; exit 1; }
	exit 0
fi

# Issues with an open PR (branch issue-<n>-...) are taken too.
with_pr=$(gh pr list --state open --json headRefName -q '.[].headRefName' | sed -n 's/^issue-\([0-9]*\)-.*/\1/p')
candidates=$(gh issue list --state open --limit 100 \
	--search "sort:created-asc -label:needs:owner -label:blocked -label:in-progress -label:dependencies" \
	--json number -q '.[].number')

for n in $candidates; do
	if printf '%s\n' "$with_pr" | grep -qx "$n"; then continue; fi
	try_claim "$n" && exit 0
done
echo "No free issue to claim." >&2
exit 1
