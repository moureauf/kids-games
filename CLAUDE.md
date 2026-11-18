# kids-games

Educational browser games for two young children (a 4-year-old starting
Reception, and a child of almost 2). iPad first. Public repo, deployed to
GitHub Pages at https://moureauf.github.io/kids-games/.

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
  a buzzer, lost points or a score. Games for the toddler have no failure
  states at all.
- **Teach a real skill.** Each game trains phonics, letter formation,
  counting, vocabulary, French, or facts.
- **Match the school (Read Write Inc. style).** Print letters, a start dot,
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

## Session workflow

1. Read this file. Take the issue you were given (or the oldest open issue
   with no PR).
2. Branch from main: `issue-<n>-<short-slug>`. **Never push to main.**
3. One issue per session, one PR per issue. Keep the PR small and inside
   the issue's done-criterion.
4. Write tests first where it makes sense (logic in Vitest, behaviour in
   Playwright).
5. Run `npm run lint && npm run typecheck && npm test && npm run e2e`. All
   must pass.
6. Take iPad screenshots: `npm run shots`, then upload them with
   `scripts/pr-screenshot.sh <issue> screenshots/ipad-webkit/<file>.png`
   and paste the printed Markdown into the PR body.
7. Add one new idea to `IDEAS.md` that obeys the design rules.
8. Record new assets in `CREDITS.md`.
9. Open the PR with `Closes #<n>`. **Do not merge.**

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (no service worker) |
| `npm run build` | Type check and production build into `dist/` |
| `npm run lint` / `npm run format` | Biome check / fix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run e2e` | Playwright on iPad viewports, against the production build |
| `npm run shots` | Screenshot tests tagged `@shot` into `screenshots/` |

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
  `size:S` or `size:M`.
