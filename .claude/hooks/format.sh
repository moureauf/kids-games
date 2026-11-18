#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the edited file with Biome, like `npm run format`.
f=$(jq -r '.tool_response.filePath // .tool_input.file_path // ""')
root="${CLAUDE_PROJECT_DIR:-.}"
case "$f" in "$root"/*) ;; *) exit 0 ;; esac
case "$f" in *.ts|*.js|*.json|*.css|*.html|*.svg) ;; *) exit 0 ;; esac
"$root/node_modules/.bin/biome" check --write --files-ignore-unknown=true --no-errors-on-unmatched "$f" >/dev/null 2>&1
exit 0
