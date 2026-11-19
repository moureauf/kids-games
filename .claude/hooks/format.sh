#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the edited file with Biome, like `npm run format`.
# Uses the Biome of the checkout that holds the file, so it works in worktrees.
f=$(jq -r '.tool_response.filePath // .tool_input.file_path // ""')
case "$f" in *.ts|*.js|*.json|*.css|*.html|*.svg) ;; *) exit 0 ;; esac
[ -f "$f" ] || exit 0
top=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null) || exit 0
biome="$top/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0
(cd "$top" && "$biome" check --write --files-ignore-unknown=true --no-errors-on-unmatched "$f" >/dev/null 2>&1)
exit 0
