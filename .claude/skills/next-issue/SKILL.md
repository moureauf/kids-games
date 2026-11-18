---
name: next-issue
description: Run one build session in kids-games - pick the next issue (or the one given), build it on a branch with tests, take iPad screenshots, add an idea, and open a PR without merging. Use when asked to do the next issue, work on issue N, or run a build session.
argument-hint: "[issue number]"
disable-model-invocation: true
---

# One kids-games build session

`CLAUDE.md` is already loaded. Its design rules and privacy rules win over
anything in an issue. If an issue asks for something that breaks them, stop
and ask.

## 1. Sync and pick the issue

```sh
git switch main && git pull --ff-only
gh pr list --state open --json number,title,headRefName
```

- If `$ARGUMENTS` names an issue, take it.
- Otherwise take the oldest open issue that has no open PR and no
  `needs:owner` or `blocked` label:
  `gh issue list --state open --limit 50 --search "sort:created-asc -label:needs:owner -label:blocked -label:dependencies" --json number,title,labels`
  An issue has a PR if an open PR's branch starts with `issue-<n>-`.
- **Unmerged work:** if the issue builds on an open PR (for example a game
  issue while the hub PR is still open), branch from that PR's branch
  instead of main and say so in the PR body ("Stacked on #x"), with the PR
  base set to that branch. If that is not possible, stop and tell the owner
  which PR to merge first.
- Read the issue in full: `gh issue view <n> --comments`.

## 2. Branch

`git switch -c issue-<n>-<short-slug>` (from main or the stacked branch).

## 3. Build

- Stay inside the issue's **Scope** and **Done when**. Note follow-ups as new
  issues (`gh issue create`, with `game:` and `size:` labels), not as extra
  code in this PR.
- Tests first where it makes sense: logic in `tests/unit/` (Vitest),
  behaviour in `tests/e2e/` (Playwright, iPad projects).
- A new game or screen goes into `tests/e2e/offline.spec.ts`.
- Assets: CC0 or original only; add each file to `CREDITS.md`.
- No names, photos or voices of the children, anywhere. Use made-up names
  in tests.
- If the issue needs the owner (a download, a decision, a check on the real
  iPad): `gh issue edit <n> --add-label needs:owner`, comment exactly what
  is needed, and stop.

## 4. Verify

```sh
npm run verify
```

All of lint, types, unit and e2e must pass. If something fails, find the
cause before changing code. Do not weaken or skip a test to make it pass.

## 5. Screenshots

```sh
rm -rf screenshots && npm run shots
scripts/pr-screenshot.sh <n> screenshots/ipad-webkit/<file>.png [...]
```

Tag new screenshot tests with `@shot`. Look at each image before using
it. The script prints Markdown for the PR body.

## 6. Idea

Add one new row to `IDEAS.md`: dated, obeys the design rules, not a repeat
of an existing idea.

## 7. Commit, push, PR

```sh
git add -A && git commit   # message ends with "Closes #<n>"
git push -u origin issue-<n>-<short-slug>
gh pr create --title "<short imperative summary>" --body-file <file>
gh pr checks <pr> --watch
```

Fill in `.github/pull_request_template.md`: what changed, the checks, the
screenshots and the new idea. **Never merge.** If CI fails, fix it on the
branch.

## 8. Report

Tell the owner: the PR link, what it does, the CI result, anything that
needs them, and any follow-up issues you created.
