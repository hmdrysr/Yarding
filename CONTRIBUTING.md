# Contributing

Thank you for helping. Yarding is a small, careful project: other people's money depends on it being right. The easiest way to be useful is to fix something in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) or to make a real shipyard's day easier.

## Before you start

1. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (the map of the code and the lessons learned the hard way) and skim [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md) (what "good" means here).
2. Open an issue first for anything bigger than a small fix, especially for accounting behaviour. Money questions deserve a discussion before code.
3. Never put real data in an issue, a pull request, a test or a screenshot: no real customers, ships, phone numbers, bank details, keys or backup files. Use made-up data, in the style of the app's own samples (HYC Metals, Hamid Yasir).

## Setting up

```bash
npm install
npm run test:all
```

Node 20 or newer. `index.html` needs no build step: edit it and reload the page. There is no bundler and no framework, and that is on purpose.

## The rules that matter

These come from real bugs; each is explained in the architecture notes.

- **One file.** The app is `index.html`. Do not add a build step, a framework, a CDN script or a network request at start-up. The app must work offline from a plain file.
- **Never lose or silently change data.** Anything that writes several records runs as one all-or-nothing step (`Tx.run`), takes a snapshot first if it is bulk or destructive, and is tested by injecting a failure part-way and checking nothing changed.
- **Enforce rules where data changes**, not only in the forms. Permissions, the period lock and validation belong in the functions that write, so no import or console call can skip them.
- **Every modification and deletion is recorded** in the amendment log.
- **Backward compatible.** Existing data and backups must keep opening. Add optional fields and new stores; do not rename or remove old ones. If you add a column, add it to **both** SQL scripts in the file and to the test that checks them.
- **Mobile first.** Check every screen you touch at 320, 360 and 390 pixels wide, with a touch device or emulation, and with the keyboard open. Numbers and words must never break mid-figure, and Close and Back must always be reachable. The test suite cannot see layout; you must look.
- **Be honest in your pull request** about what you tested and what you did not.

## Tests

`tests/smoketest.js` loads the real `index.html` in jsdom with an in-memory IndexedDB and exercises the app through its own functions and screens. Add a check for every bug you fix and every feature you add, and assert behaviour, not the wording of a selector. To run the upgrade test, point `YARDING_OLD_HTML` at an older build. Run one section while you work with `ONLY=name` (see the bottom of the file for the section names).

`server/gate.test.js` tests the optional proxy without any network.

## Pull requests

- Keep them small and about one thing.
- Say what was reported or wrong, what you changed, and how you checked it.
- Update the docs and the help text inside the app if behaviour changes, and add a line to `CHANGELOG.md`.
- Remove dead code you leave behind. Do not reformat code you did not change.

## Licence of contributions

By contributing you agree that your contribution is dedicated to the public domain under CC0 1.0 Universal, like the rest of the project. Do not contribute code you do not have the right to dedicate this way. If you add third-party code, say so in the pull request: it must be compatible with a public-domain project and listed in `THIRD_PARTY_NOTICES.md` with its licence.
