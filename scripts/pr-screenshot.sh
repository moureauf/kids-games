#!/usr/bin/env bash
# Push PR screenshots to the orphan `pr-assets` branch (never to main) and
# print Markdown to paste into the PR body.
# Usage: scripts/pr-screenshot.sh <issue-number> <file.png>...
set -euo pipefail

issue="$1"
shift
[ "$#" -gt 0 ] || { echo "usage: $0 <issue> <file.png>..." >&2; exit 1; }

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
root=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'git -C "$root" worktree remove --force "$tmp" >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

git -C "$root" fetch -q origin pr-assets 2>/dev/null || true
if git -C "$root" rev-parse -q --verify origin/pr-assets >/dev/null; then
  git -C "$root" worktree add -q -B pr-assets "$tmp" origin/pr-assets
else
  git -C "$root" worktree add -q --detach "$tmp"
  git -C "$tmp" switch -q --orphan pr-assets
fi

mkdir -p "$tmp/$issue"
for f in "$@"; do
  name="$(basename "$(dirname "$f")")-$(basename "$f")"
  cp "$f" "$tmp/$issue/$name"
done
git -C "$tmp" add "$issue"
git -C "$tmp" commit -q -m "Screenshots for #$issue"
git -C "$tmp" push -q origin pr-assets

for f in "$@"; do
  name="$(basename "$(dirname "$f")")-$(basename "$f")"
  echo "![$name](https://raw.githubusercontent.com/$repo/pr-assets/$issue/$name)"
done
