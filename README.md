# kids-games

Small educational games for young children, made for the iPad. They work
offline after the first visit.

Play: https://francoismoureau.com/kids-games/ (on the iPad, use Share → Add
to Home Screen).

- No ads, no tracking, no accounts, no timers.
- Each game teaches one skill and has a natural end.
- Original art, CC0 sounds (see [CREDITS.md](CREDITS.md)).

## Develop

```sh
npm ci
npx playwright install webkit chromium
npm run dev        # dev server
npm run e2e        # tests on iPad viewports
```

See [CLAUDE.md](CLAUDE.md) for the design rules and workflow.
