# Changelog

All notable changes to Yarding are recorded here. Newest first. The format is plain: what was reported or wrong, what changed, what was not verified.

The history before the first public release is kept, for its reasoning, in [docs/history/PRE-RELEASE-HISTORY.md](docs/history/PRE-RELEASE-HISTORY.md).

## v0: first public release

**What this is.** The first public release of Yarding as an open-source (CC0) project: the author's working version, relabelled `v0`, with the problems found in review fixed.

**Kept as the author wrote it:** the credit line in the About text ("Hamid Yasir & Co."), the sample names, companies and places (HYC Yards Ltd, HYC Metals, Hamid Yasir and so on), the sample phone number and e-mail, and ৳ as the default currency.

**Fixed in v0 (found in review, each reproduced first)**
- *Credit notes.* (1) A credit note is now all-or-nothing: if any step fails, nothing is kept. (2) It needs the same permission as editing that invoice; a worker without the module is refused. (3) Tax is taken off in proportion: Tax Payable is debited for the tax part and income for the rest, and the invoice's tax breakdown follows. (4) An invoice that has a credit note can no longer be edited (before, an edit silently undid the credit). (5) The credit is dated today, and it is refused for an invoice dated inside a closed period, so a closed month never moves. (6) It asks for a reason and the person's own code, and is written to Amendments with before and after (before: "[Automatic]").
- *Phone layout.* Bottom bar labels no longer break mid-word, and the bar is more opaque; the import review table scrolls sideways instead of splitting dates and amounts; the authenticator key wraps in groups instead of being cut off; search boxes use a short placeholder; a Reports figure no longer overflows at 320 px; the item-name placeholder fits; lists end with room below the floating + button; the Activity log shows readable details instead of raw JSON.
- *AI.* The "Connect your AI" card, its key storage, the unreachable code and the outside-service addresses are removed.
- *Restore* can now repair damaged records: the review screen counts records that differ from the backup, and a tick-box replaces them (snapshot and downloaded copy first, one amendment per table with old and new values; sign-in accounts and the logs are never replaced).
- *Imports* that give a known phone number a clearly different name now ask, with the existing party pre-selected, instead of silently merging.
- *Shared phone numbers* are allowed with a tick-box, and the choice is written on the record.
- Unused variables and unreachable code removed.
- The "upgrade from an older build" test now runs by default: the older build it needs is included as `tests/fixtures/yarding-v728-known-good.html`.
- CI has a `layout` job that runs the real-browser audit.

**Changed for publication**
- Version label is `v0` (previously an internal dated build number). The "What's new" note is a short v0 welcome.
- Licence: CC0 1.0 Universal. The embedded QR generator keeps its MIT licence (`THIRD_PARTY_NOTICES.md`).
- Tests: 30 new checks (credit notes with an injected failure, permissions, tax split, edit-after-credit, closed period, amendment; shared phone; restore repair; import phone match; the upgrade test now runs); version and what's-new checks follow the new label; the bottom-padding check follows the new spacing; the test file finds `index.html` from `tests/`.
- Added: README, KNOWN_ISSUES, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, architecture notes, guides for deploying and for adapting to other businesses (by hand and with AI prompts), issue and pull-request templates, CI, `tools/check.js`, `tools/browser/uiaudit.py`.

**Fixed before release (separate from the above)**
- `server/yard-gate.js` (the optional proxy for cloud sync) let a holder of the staff pass reach other endpoints of the database using the full database key, and could not answer a browser's cross-origin preflight. It is rewritten: only `/yard/<table>` for Yarding's tables is forwarded, the pass is checked in constant time, wrong passes are rate-limited, request size is capped, and CORS is handled. 30 checks in `server/gate.test.js`.

**Verified**
- `npm run test:all` from a fresh unzip: syntax and sanity checks, the application suite (618 checks, 0 failing) and the gate suite (30 checks).
- In Chromium with phone sizes (320, 360, 390 px): `tools/browser/uiaudit.py` over every screen and pop-up, plus the import review pop-up, with no findings. Screenshots in `docs/screenshots` were taken from this build.
- Earlier, in the same Chromium setup: sign-in including a virtual security key, back-button and pop-up behaviour, touch scrolling. Those scripts are not in the repository.

**Not verified**
Firefox, Safari (including iPhone), a physical phone, a real hardware security key, a real cloud database, and a real folder for the live backup. The new CI `layout` job has been run locally, not yet on GitHub.
