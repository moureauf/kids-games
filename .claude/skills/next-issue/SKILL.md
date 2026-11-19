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

## 1. Own worktree

Sessions may run in parallel, so each one works in its own git worktree.

- If `git rev-parse --git-dir` equals `git rev-parse --git-common-dir`, you
  are in the main checkout: switch with the EnterWorktree tool first (or the
  owner starts sessions with `claude --worktree`).
- In the worktree: `git fetch -q origin`, and run `npm ci` if
  `node_modules` is missing.

## 2. Claim the issue

```sh
scripts/claim-issue.sh $ARGUMENTS
```

- With no argument it claims the oldest free issue (no open PR, not labelled
  `needs:owner`, `blocked`, `in-progress` or `dependencies`) and prints its
  number. With a number it claims that issue or fails if another session
  has it. **Never work on an issue you did not claim.**
- If it prints "No free issue", tell the owner and stop.
- **Unmerged work:** if the issue builds on an open PR (for example a game
  issue while the hub PR is still open), branch from that PR's branch
  instead of main and say so in the PR body ("Stacked on #x"), with the PR
  base set to that branch. If that is not possible, release the issue
  (`scripts/claim-issue.sh --release <n>`), stop, and tell the owner which
  PR to merge first.
- Read the issue in full: `gh issue view <n> --comments`.

## 3. Branch

`git switch -c issue-<n>-<short-slug> origin/main` (or the stacked branch).

## 4. Build

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
  is needed, release it (`scripts/claim-issue.sh --release <n>`), and stop.

## 5. Verify

```sh
npm run verify
```

All of lint, types, unit and e2e must pass. If something fails, find the
cause before changing code. Do not weaken or skip a test to make it pass.

## 6. Screenshots

```sh
rm -rf screenshots && npm run shots
scripts/pr-screenshot.sh <n> screenshots/ipad-webkit/<file>.png [...]
```

Tag new screenshot tests with `@shot`. Look at each image before using
it. The script prints Markdown for the PR body.

## 7. Idea

Add one new row to `IDEAS.md`: dated, obeys the design rules, not a repeat
of an existing idea.

## 8. Commit, push, PR

```sh
git add -A && git commit   # message ends with "Closes #<n>"
git push -u origin issue-<n>-<short-slug>
gh pr create --title "<short imperative summary>" --body-file <file>
gh issue edit <n> --remove-label in-progress   # the open PR now marks it
gh pr checks <pr> --watch
```

Fill in `.github/pull_request_template.md`: what changed, the checks, the
screenshots and the new idea. **Never merge.** If CI fails, fix it on the
branch.

## 9. Report

Tell the owner: the PR link, what it does, the CI result, anything that
needs them, and any follow-up issues you created.
