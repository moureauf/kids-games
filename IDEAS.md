# Ideas

Each build session adds **one new idea** that obeys the design rules in
[`CLAUDE.md`](CLAUDE.md) and [`docs/DESIGN.md`](docs/DESIGN.md).

## Add an idea

1. Make a new file `ideas/<yyyy-mm-dd>-<slug>.md`. Do not edit other files.
2. Use this format:

   ```markdown
   ---
   date: 2026-11-19
   for: Daughter | Son | Both
   skill: Counting, number order
   ---

   # Short title

   One paragraph: how the game plays, the skill it teaches, and its natural end.
   ```

3. Run `npm test`. A unit test checks every idea file.

One file per idea means that parallel PRs never change the same line.

## Review the ideas

Run `npm run ideas`. The command shows all ideas in one table. Review them
one time each month.
