#!/usr/bin/env bash
# Push PR screenshots to the orphan `pr-assets` branch (never to main) and
# print Markdown to paste into the PR body. Safe to run from several
# sessions at once: it works on a detached worktree and retries the push.
# Usage: scripts/pr-screenshot.sh <issue-number> <file.png>...
set -euo pipefail

issue="$1"
shift
[ "$#" -gt 0 ] || { echo "usage: $0 <issue> <file.png>..." >&2; exit 1; }

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
root=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'git -C "$root" worktree remove --force "$tmp" >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

name_of() { echo "$(basename "$(dirname "$1")")-$(basename "$1")"; }

git -C "$root" fetch -q origin pr-assets 2>/dev/null || true
if git -C "$root" rev-parse -q --verify origin/pr-assets >/dev/null; then
	git -C "$root" worktree add -q --detach "$tmp" origin/pr-assets
else
	# First upload ever: start an orphan history.
	git -C "$root" worktree add -q --detach "$tmp"
	git -C "$tmp" checkout -q --orphan "pr-assets-$$"
	git -C "$tmp" rm -rq --cached . && git -C "$tmp" clean -fdxq
fi

mkdir -p "$tmp/$issue"
for f in "$@"; do cp "$f" "$tmp/$issue/$(name_of "$f")"; done
git -C "$tmp" add "$issue"
git -C "$tmp" commit -q -m "Screenshots for #$issue"

for attempt in 1 2 3 4 5; do
	git -C "$tmp" push -q origin HEAD:refs/heads/pr-assets && break
	[ "$attempt" = 5 ] && { echo "Could not push screenshots." >&2; exit 1; }
	sleep $((attempt * 2))
	git -C "$tmp" fetch -q origin pr-assets
	git -C "$tmp" rebase -q origin/pr-assets
done

for f in "$@"; do
	n=$(name_of "$f")
	echo "![$n](https://raw.githubusercontent.com/$repo/pr-assets/$issue/$n)"
done
