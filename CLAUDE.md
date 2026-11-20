# kids-games

Educational browser games for young children: toddlers (about 1–3) and
pre-schoolers (about 3–5). iPad first. Public repo, deployed to
GitHub Pages at https://francoismoureau.com/kids-games/.

Every session must obey this file. If a request conflicts with a rule here,
stop and ask.

## Design rules (from the brief)

- **Teach, do not hook.** No streaks, loot boxes, timers, endless rewards,
  ads, tracking, analytics or accounts. No network calls at runtime other
  than loading the site itself.
- **Each game has a natural end.** A round lasts 5–10 minutes, measured in
  items or taps, never a clock. Then the game ends calmly (the fairy goes to
  sleep, the safari bus goes home). Never start a new round on its own.
- **Praise the effort.** A wrong answer gets a gentle hint, never a penalty,
  a buzzer, lost points or a score. Games for toddlers have no failure
  states at all.
- **Teach a real skill.** Each game trains phonics, letter formation,
  counting, vocabulary, French, or facts.
- **Match UK phonics teaching (Read Write Inc. style).** Print letters, a start dot,
  correct stroke order, pure sounds ("mmm", not "muh"). Letter order follows
  RWI Set 1: m a s d t i n p g o c k u b f e l h r j v y w z q x. Numbers
  follow the EYFS goals: to 10, then to 20.
- **No RWI copyrighted material.** Do not copy RWI phrases, rhymes,
  characters, pictures or audio. Write our own formation phrases with the
  same start points and stroke order.
- **Two languages.** English is the main language. A setting adds French
  words (with the article: "la vache").
- **Correct facts only.** Every fact (dinosaurs, animals) lives in a data
  file with a `source` URL. No fact without a source.
- **Original art and characters only.** Themes the children like (unicorns,
  fairies, princesses, magic creatures, silly inventions, animals, vehicles,
  dinosaurs) but never brand characters (no Pokémon, Wallace & Gromit,
  Disney, Peppa, etc.) and nothing that imitates their look.
- **Big, forgiving touch.** Touch targets are at least 120 CSS px for the
  toddler's games, 88 px otherwise. No double-tap, no small buttons, no text
  the child must read to play.
- **Parent gate.** Settings and anything that leaves the game sit behind a
  3-second hold.

## Privacy

- The repo is public. **No names, photos or voices of the children** go in
  the repo: not in code, tests, fixtures, commits, issues, PRs or
  screenshots. Tests use made-up names.
- Data entered on the device (a child's name, family voice recordings) stays
  on the device (localStorage / IndexedDB). It is never uploaded and never
  committed.

## Assets

- Sounds: CC0 files or sounds made by code. Voice: the Web Speech API.
- Art: original, drawn in SVG in this repo.
- **Every file in `public/assets/` has an entry in `CREDITS.md`** with its
  source URL, author and licence (CC0) or "original".

## Offline

- The site is a PWA. The service worker precaches every page, script, image,
  sound and font. After the first load every game works with no network.
- The offline e2e test must pass, and it must play every game. When you add
  a game, add it to the offline test.
- PWA config is in `vite.config.ts`. Never list a file twice in the precache
  (e.g. via `includeAssets` or manifest icons and the glob): Workbox then
  fails without an error and caches nothing. The offline test catches it.
- New icon art: edit `public/assets/icons/icon.svg`, then `npm run icons`.

## Session workflow

Run **`/next-issue`** (or `/next-issue <n>`). The skill in
`.claude/skills/next-issue/` has the step-by-step loop. The rules:

- One issue per session, one PR per issue, inside the issue's done-criterion.
- Branch `issue-<n>-<short-slug>` from an up-to-date main.
  **Never push to main. Never merge a PR.** A hook and branch protection
  enforce both.
- `npm run verify` passes before the PR is opened.
- The PR has an iPad screenshot, new assets in `CREDITS.md` (rows sorted by
  path), and one new idea as a new file in `ideas/` (see `IDEAS.md`).
- Skip issues labelled `needs:owner` or `blocked`. If an issue needs the
  owner partway through (a download, a decision, a test on the real iPad),
  stop, add `needs:owner` with a comment saying exactly what is needed, and
  end the session.

## Documentation

Read these when you need more than this file:

- `CONTRIBUTING.md`: install, workflow, tests, stacked PRs, troubleshooting.
- `docs/ARCHITECTURE.md`: code layout, game contract, offline, CI.
- `docs/DESIGN.md`: design principles, hints, colours, touch sizes.
- `docs/GAMES.md`: each game, its plan and status.

Write documentation in ASD-STE100 Simplified Technical English (rules in
`CONTRIBUTING.md`, Writing style). When a PR changes a game visibly, update
`docs/GAMES.md` (status, screenshot, "How it plays").

## Parallel sessions

Several sessions can run at once:

- Start each with `claude --worktree` (its own checkout under
  `.claude/worktrees/`, git-ignored), then `/next-issue`.
- `scripts/claim-issue.sh` makes sure two sessions never take the same
  issue (claim comment + `in-progress` label).
- e2e tests use a port derived from the checkout path (override with
  `PORT`) and never reuse a running server, so sessions never test each
  other's build.
- `scripts/pr-screenshot.sh` retries when another session uploaded first.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (no service worker) |
| `npm run build` | Type check and production build into `dist/` |
| `npm run lint` / `npm run format` | Biome check / fix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run e2e` | Playwright on iPad viewports, against the production build (own port per checkout) |
| `npm run shots` | Screenshot tests tagged `@shot` into `screenshots/` |
| `npm run verify` | Lint, types, unit and e2e: run before every PR |
| `npm run icons` | Regenerate PNG icons from `public/assets/icons/icon.svg` |

## Layout

```
index.html, src/main.ts   hub and router
src/core/                 shared: speech, audio, settings, round, parent gate, ui
src/games/<game>/         one folder per game, data in its own file
public/assets/            sounds, icons (all listed in CREDITS.md)
tests/unit/               Vitest
tests/e2e/                Playwright (projects ipad-webkit, ipad-chromium)
scripts/                  repo tooling
```

## Conventions

- TypeScript strict, no UI framework. SVG for art and game scenes.
- Biome formatting (tabs, double quotes). Do not fight the formatter.
- British English in the UI (en-GB voice). French uses fr-FR.
- Labels on issues: `game:<name>` (`game:hub` for shared work) and
  `size:S` or `size:M`. `needs:owner` and `blocked` mark issues a session
  must skip.
- Squash merge only; the PR title becomes the commit on main, so write it
  as a short imperative summary.

## Claude Code setup

- `.claude/settings.json`: allowlist for the usual npm, git and gh commands;
  denies edits to `~/notes` (read-only vault), `gh pr merge` and pushes to
  main.
- Hooks: `.claude/hooks/format.sh` runs Biome on every edited file;
  `.claude/hooks/guard-main.sh` blocks `git push` to main.
- Personal overrides go in `.claude/settings.local.json` (git-ignored).
- `.claude/agents/reviewer.md`: the reviewer subagent (Opus, fresh
  context). It checks a PR against its issue and this file, and posts one
  verdict comment bound to the head commit. Keep its checklist in step
  with the rules here.
