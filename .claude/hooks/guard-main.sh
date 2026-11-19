#!/usr/bin/env bash
# PreToolUse (Bash): block `git push` to main. Branch protection blocks it on
# GitHub too; this gives the session a clear message before it tries.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
case "$cmd" in *"git push"*) ;; *) exit 0 ;; esac

# The session's own checkout (a worktree when sessions run in parallel).
dir=$(printf '%s' "$input" | jq -r '.cwd // empty')
branch=$(git -C "${dir:-${CLAUDE_PROJECT_DIR:-.}}" branch --show-current 2>/dev/null)
names_main=$(printf '%s' "$cmd" | grep -Eo 'git push[^|;&]*' | grep -Ew '(HEAD:)?(refs/heads/)?main')

if [ -n "$names_main" ] || [ "$branch" = "main" ]; then
	echo "Blocked: never push to main in this repo. Work on a branch issue-<n>-<slug> and open a PR (see CLAUDE.md)." >&2
	exit 2
fi
exit 0
