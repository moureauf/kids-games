#!/usr/bin/env bash
# PreToolUse (Bash): block the actions that only the owner does.
# - Merge a PR, also through `gh api` (REST /merge, GraphQL mergePullRequest,
#   auto-merge). The `gh pr merge` deny in settings.json does not see these.
# - Add a review:* label. The owner grades the reviewer (agent loop trial).
# All agents use the owner's gh login, so this stops mistakes, not a
# determined script. A bot identity comes before any auto-merge.
cmd=$(jq -r '.tool_input.command // ""')

block() {
	echo "Blocked: $1 Only the owner does this (see CLAUDE.md)." >&2
	exit 2
}

if printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+merge'; then
	block "never merge a PR."
fi
if printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+api' &&
	printf '%s' "$cmd" | grep -Eiq '/merge([^a-z_]|$)|merge_method|mergePullRequest|enablePullRequestAutoMerge'; then
	block "never merge a PR, also not through gh api."
fi
if printf '%s' "$cmd" | grep -Eq 'review:(agree|missed|noise)' &&
	printf '%s' "$cmd" | grep -Eq 'add-label|/labels|gh[[:space:]]+api'; then
	block "never add a review:* label."
fi
exit 0
