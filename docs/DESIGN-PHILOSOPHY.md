# Design & Build Philosophy

The standard this project is held to: how its tools are designed, built, tested and delivered. It is written to apply to any tool in any domain, so it is a set of requirements and non-negotiables rather than a style guide for one product. Contributors are asked to meet it, and anyone forking Yarding for another business can reuse it as is.

**Read this first, then build.** When a choice isn't covered here, pick the option that protects the user's data, works on a phone, works offline, and is honest about what it doesn't know.

---

## 0. The short version

1. **The user's data is sacred.** It must never be lost, silently changed, or corrupted, whatever fails.
2. **It works on a phone, offline, with no setup.** Mobile is the primary screen, not an afterthought.
3. **Nothing important happens silently.** Every change is recorded, every risky action is confirmed, every failure is said out loud.
4. **Mistakes are prevented, not just reported.** Typos, duplicates, bad imports and stale windows are caught before they become bad data.
5. **Everything is open, portable and inspectable.** Open standards, open-source dependencies, plain-file exports, no lock-in.
6. **Fix the root cause, never the symptom.** And never claim something works until it has been tested the way a real person uses it.
7. **Be honest.** Say exactly what was verified, what wasn't, and what was left out on purpose.

---

## 1. Data integrity (non-negotiable)

- **No data loss, no data corruption, at any point of use**, including mid-operation, mid-crash, mid-power-cut, with storage full, with the browser wiping its cache, or with two windows open.
- **All-or-nothing operations.** Any multi-step change (an import, a merge, a restore, a bulk edit) runs as one transaction: it completes in full or puts everything back exactly as it was. A failure halfway must leave zero trace. Prove this by *injecting a failure* in tests.
- **Prove before keeping.** After a bulk change, verify the invariants (totals balance, counts match, integrity check doesn't get worse). If the proof fails, roll back.
- **Snapshot before anything destructive or bulk** (imports, merges, restores, clears). The snapshot is taken first, and the operation refuses to run if the snapshot can't be saved.
- **Never overwrite, never guess.** Importing or merging fills blanks and adds records; it does not overwrite existing values. A value that can't be read is an error on that row, never a guess (a wrong date lands in the wrong period and is invisible afterwards).
- **Nothing is hard-deleted by the user's actions.** Delete means retire/void with a record. The history stays.
- **Detect corruption and keep the evidence.** If stored data can't be read, quarantine the raw bytes, say so plainly, and offer recovery, never a blank screen that looks like "all your data is gone".
- **Shrink guard.** If the data suddenly gets much smaller than it was, stop and ask before continuing or overwriting any backup.
- **Stale windows can't overwrite.** If another window/tab changed the data, this one stops writing and tells the user to reload.
- **Enforce rules where data changes, not where forms are.** Permissions, period locks and validation live in the functions that write data, so no import, console call, second screen or package can bypass them. A hidden button is not a security control.

## 2. Fail-safes (belt, braces, and a second belt)

Multiple independent copies, so any one failing is survivable:

- **Primary store** in the browser's database, **plus a write-through mirror** for anything the app can't start without (e.g. sign-in accounts), so a storage wipe can't lock the owner out of the recovery tools.
- **Journal / rollback** for interrupted operations: on next start, an interrupted change is found and undone.
- **Automatic snapshots** with history, restorable from inside the app.
- **Live backup folder** (where the platform allows it): readable per-table files rewritten a few seconds after every change (only what changed), plus dated snapshots when something really changed. Real files on disk that survive a browser wipe.
- **Check backup** (compare folder vs app, flag "missing", "behind", and "more than the app"), **merge from folder** (bring back what's missing without overwriting or deleting), and **auto-heal/recovery** that falls back to the live files if the newest snapshot is damaged.
- **Plain-file export** (JSON / spreadsheet) always available, and tested as a full round trip.
- **Ask the browser for persistent storage**, and warn when it won't be persistent.
- Be honest where a fail-safe can't exist (e.g. phones can't write to a folder) and say what to do instead.
- Backups that contain secrets say so, and tell the user to keep them private.

## 3. Nothing is silent: the amendment record

- **Every modification and every deletion is recorded**: what, before/after, who, when, and why. Not just the ones that went through a nice screen.
- Reasoned actions (edit, void, delete, merge, close period, change someone's sign-in) **ask for a reason and the person's own code**, and log it once.
- **A safety net underneath**: any change or deletion that did *not* go through a reason prompt is still recorded automatically at the data layer. Sign-in secrets are recorded only as "changed", never their values. Routine bookkeeping (derived totals, "last code used") is excluded so the log stays readable.
- Exemptions from the safety net must be **narrow and explicit**; a broad exemption hides real changes.
- Sensitive events (backup-code use, import, undo, restore, lock changes) go to an audit log too.
- The record is **viewable in the app**, filterable, and never editable.

## 4. Safe input: prevent the mess, don't just clean it up

- **Near-duplicate names are prevented and mergeable**, for every free-typed entity (people, companies, items, assets, categories). Spelling slips, punctuation, prefixes/suffixes and word order must not split one thing into two records.
  - Check on entry and on rename: "this looks like an existing one, same thing?"
  - Imports group variants of a new name and ask about close matches to existing ones.
  - A clean-up screen finds existing duplicates and **merges** them: every linked record moves, the old spelling is kept as an alias (so it matches silently next time), the loser is retired not deleted, and the whole merge is one rollback-able step with a reason and a record.
  - Score carefully: different numbers ("Unit 1"/"Unit 2") are different things; leading-words matches are a *question*, never an automatic merge.
- **Duplicates of whole records** (double-imported invoices, repeated statement lines) are detected and skipped by default.
- **Strict parsing**: dates (with ambiguity warnings, e.g. 03/04), numbers (locale-aware, refusing garbage), calendar validity, currency symbols.
- **Block the impossible**: overpaying what's owed, dates inside a closed period, negative amounts where they make no sense, mismatched category types.
- **Clear messages, not crashes**: a missing account, a voided target, a denied permission each get one plain sentence saying what's wrong and what to do.

## 5. Imports, exports and spreadsheets

- **Easy import/export of spreadsheets** from Settings, in a format people already use (xlsx and csv), **working fully offline with no library or CDN**.
- **An auto-generated template of the whole system**: a sheet for every part, frozen headers, dropdowns fed from the user's own data, number/date validation, a read-me, and an ignored example row. Someone can work in Excel or Google Sheets and import without mistakes.
- **A "workbook with my data" export** that can be edited and re-imported; importing an untouched export adds **nothing** (rows carry their own IDs and are recognised).
- **Any layout also works** through a column matcher that guesses from odd headings and lets the user correct it.
- **Import is a pipeline, never a leap**: read → parse strictly → match names to existing → find duplicates → **preview everything** → explicit confirmation → apply all-or-nothing → prove → record a batch → **undoable**.
- The preview shows totals, every problem, every name that needs a decision, and every probable duplicate (unticked by default). The import button stays disabled until the person confirms they've reviewed it.
- Bank/statement lines and package imports follow the same rules: strict, deduplicated, atomic, blocked by closed periods.
- Import is an **administrator-only** action, because it changes the books.

## 6. Mobile-first, offline-first

The phone is the main device. A desktop layout is a bonus.

- **No cut-off text, ever.** Inputs, labels, placeholders, buttons, nav items and cards must fit at 320px, 360px and 390px. Long names wrap; nothing clips or overflows sideways. A layout rule (like `min-width:0` on flex children) is *layout*, not decoration, and must never be "restyled" away.
- **Everything is reachable.** Every pop-up has a **Close** and (when opened from another screen) a **Back** in a *fixed header* that can't scroll away; every screen after the first has a **Back** arrow; 44px minimum touch targets; expanders have a visible arrow.
- **Scrolling always works.** You can always scroll back up, with the keyboard open, inside a pop-up, after expanding something. Size things to the **visible** viewport (visual viewport), never `vh` on a phone: it ignores the keyboard and can push a sheet's top (and its close button) off-screen. Horizontal scrollers must not swallow vertical swipes. Background doesn't scroll behind a pop-up. The field you're typing in scrolls into view.
- **The device's back button works**, one step at a time: close the pop-up (or step back inside a chain of them) first, then the previous screen, and never needs two presses. It degrades gracefully where the browser blocks the history API.
- **Buttons do what they say.** Copy copies (and says "Copied" *only* if it did; otherwise shows the text selected so it can be copied by hand). Export saves (through the platform's share/Save-as where download links don't work). Print prints. A button that silently does nothing is a bug.
- **Works offline with no setup**: no backend, no account, no install, no CDN dependency for core functions. Cloud sync, if present, is optional and additive.
- **A single self-contained file** where possible (easy to host, copy, back up, hand over), with a clean native wrapper (APK) that adds only what a WebView lacks, and is feature-detected so the browser version is unchanged.
- **Test in an environment that behaves like the real one**: real touch, a shrinking visible area for the keyboard, blocked history, denied clipboard. Desktop-only tests are not evidence that a phone works.

## 7. Identity, access and security

- **Nobody identifies themselves to sign in.** Like a till: one screen, one code, and the app works out who you are. No role picker, no ID number, no "type your name".
- **No passwords to invent and forget.** The **administrator is set up first**, with an **authenticator (TOTP)**, then adds workers from Settings, each with their own.
- **Setup/enrolment wizard** (used for the admin, every new person, a new phone): scan QR (or enter key) → **confirm with a real code** → **backup codes** (one-time, shown once, printable/copyable, can't continue until confirmed saved) → **optional security key**.
- **Backup codes** are stored only as hashes, work once, are logged when used, and warn when few remain.
- **Security keys (WebAuthn/FIDO2) are an option where the platform allows**, verified locally (challenge, origin, site hash, user presence, signature, counter; forged/replayed/cloned responses rejected). Explain plainly when unavailable (needs https/localhost and a real hostname).
- **TOTP must work with no backend and no secure context**: include a pure-JS crypto fallback for plain `http://` pages. Replay protection (a used code can't be reused).
- **Lockout** after repeated wrong codes, escalating, and it **survives a reload**.
- **The administrator chooses which modules each worker gets**, and this is **enforced in the functions that change data**, not just hidden in menus. Grants apply immediately. Worker management, imports, merges, closing periods and opening balances are administrator-only.
- **Collisions handled**: if two people's codes coincide, ask "which one are you?" between only those two.
- **Everything is FOSS / open standard.** TOTP (RFC 6238), WebAuthn, open-source libraries, and suggest open-source authenticator apps, not proprietary ones. No vendor lock-in, no service anyone must pay for.
- **Backward compatible sign-in**: older shared codes keep working until the owner chooses to move over, then can be turned off. Never re-create a shared code on a new setup.
- Secrets are never shown again after setup, never written to logs/amendments in clear, and backups containing them carry a warning.

## 8. Correctness of the domain (accounting-style tools especially)

- **Audit the flow against the real-world process** and add what a *proper* flow is missing, rather than only building what was literally asked. List what was added, and **say plainly what was deliberately not added and why** (e.g. a feature that touches every balance consumer and risks two screens disagreeing).
- Typical controls expected: **closing a period** (enforced in the data layer, including voids), **opening balances** (real entries, kept out of activity reports), **transfers** between own accounts (never profit), **reconciliation** with locking of matched entries, **overpayment blocking**, balanced-books proof after bulk operations.
- **Dates are local dates**, never UTC slices (before dawn in a positive-offset timezone that's yesterday).
- Derived numbers must agree everywhere; if a change risks two screens showing different totals, don't ship it casually.

## 9. UX and workflow

- **Clean, sensible, short workflows.** The first-run path is a straight line: essentials → owner's sign-in → done (signed in, no extra login step). Day-to-day tasks take the fewest taps.
- **Don't ask what can be inferred or remembered.** Don't ask for something twice. Don't make the user pick a role, type an ID, or re-enter what the app already knows.
- **Plain language.** Error messages say what happened and what to do next, in one sentence. No jargon, no codes.
- **Prevent, then confirm, then record.** Risky actions show exactly what will happen (counts, names) before they happen.
- **Examples use made-up placeholder data** (an invented company, invented people, an invented street), never a real client's records.
- **Credit lines and authorship stay as the author wrote them**: that's attribution, not an example.
- Consistent visual language (one card style, shared tokens), nothing boxed that shouldn't be.
- Help inside the app is searchable and kept in step with every feature change.

## 10. Build quality

- **Root cause, not patch.** Find *why* it broke (e.g. one CSS rule that was replaced), fix that, and add a test that would have caught it. Don't stack workarounds.
- **Backward compatible, always.** Existing data, backups and older builds must keep working. Additive schema changes only (new optional fields/stores); never a destructive migration; don't bump the storage version if you can avoid it, so rolling back is safe. Document the rollback consequences honestly.
- **Schema changes land in every place that holds a schema** in the same change (local stores *and* cloud SQL scripts), with a test that checks it. Cloud users must be told to re-run migrations.
- **Sweep dead code at the end**: unreferenced functions, unused CSS, old importers, stale help text, leftover flags. A scan script, not a guess.
- **Small, named, single-purpose modules** with clear ownership of each concern; build the new thing once and route every entry point through it (one import pipeline, one sign-in path, one copy helper).
- **No silent failures anywhere.** Catch, report, and carry on safely; never swallow an error that the user needed to know about.
- **Open, inspectable output**: readable files, documented formats, no opaque blobs where plain JSON/CSV/XLSX would do.
- **The code explains *why*.** Comments describe the reason for non-obvious rules (especially ones that were learned the hard way).

## 11. Testing standard

- **Every requirement above gets a test**, and tests assert *behaviour*, not the text of a selector.
- **Test failure, not just success**: inject a throw part-way through an all-or-nothing operation and assert the data is identical afterwards; forge/tamper/replay security inputs; simulate a storage wipe, a damaged backup, a second window.
- **Test upgrade paths with the real older builds**: boot the previous versions' actual files first, reopen the same storage with the new build, and check nothing is lost.
- **Drive a real browser for anything visual or touch-related** (touch scrolling, a shrinking visible area, history, clipboard), at the real phone widths (320 / 360 / 390), including every pop-up and every step of first-run setup. An automated layout audit with **zero findings** is the bar.
- **Click every button** on every screen and pop-up at least once, and fail on script errors or unreachable controls.
- **Open standards get reference vectors** (e.g. official TOTP test vectors, a real virtual security key).
- **Stable**: run the suite repeatedly; flaky is failing.
- **Unit-test the parts that can be tested in isolation** (file parsers against reference implementations, name matching against a table of should-match / shouldn't-match pairs).
- A test that "protects" a bug is a bug. When the requirement changes, change the test, and say so.

## 12. Honesty and delivery

- **Report exactly what was verified and what wasn't.** "Not tried on a physical device / real Safari / a live cloud project / a hardware key" is stated plainly, not buried. Never imply a check that wasn't run.
- **Say what was deliberately left out, and why.** Don't quietly drop scope.
- **If something can't be reproduced, say so**, fix the causes that can be identified from the code, and ask which screen and browser still misbehave.
- **Don't claim success the software didn't achieve** ("Copied" only when copied; "Saved" only when saved).
- **Ship a complete, usable package**: the tool, a versioned known-good copy, earlier versions for rollback, tests, and updated docs, every time.
- **Docs are part of the product**: a changelog entry stating *what was reported, what was actually wrong, what changed*, honest verification limits, migration notes; a version history with rollback points; a hand-off file with module map and the lessons learned (each hard-won lesson gets a number and a reason).
- **Replies are short, phone-friendly and lead with the answer.** Plain language, what was done, what wasn't verified, what to do next. Long detail lives in the docs, not the chat.
- **If there's an honest decision to make** (a risky scope, an unknowable environment), pick the safe option, say so, and ask at most one useful question.

## 13. Platform packaging

- Offer the web build **and** an installable mobile build (APK) wrapping the *same file*, so there is one source of truth.
- The wrapper adds only what the platform lacks (save-as, clipboard, print, back button, file picker) through small, feature-detected hooks; nothing in the core depends on them.
- State the wrapper's limits (data lives in the app and is deleted on uninstall; no folder backups; no hardware keys in a WebView), the update/signing rules (keep the signing key; same key = updates keep data), and that it was built/verified but not device-tested if that's the case.
- The build is scripted and reproducible from the delivered source.

---

## Appendix A: Lessons that became rules

| # | Lesson | Rule |
|---|--------|------|
| 1 | A restyle replaced a layout rule; every input shrank and text was cut off | Never delete a layout rule while restyling; audit in a real browser at phone widths |
| 2 | `vh`-sized sheets put the close button off-screen on phones | Size to the visual viewport; keep Close/Back in a fixed header |
| 3 | A horizontal scroller swallowed vertical swipes | Set `overflow-y` explicitly on scroll wrappers |
| 4 | "Copied" shown while nothing was copied (iPhone, embedded viewers) | One copy helper with fallbacks; never claim success unverified |
| 5 | UTC date used as "today" | Always local dates |
| 6 | No `crypto.subtle` on plain http | Provide a pure fallback and test with it disabled |
| 7 | Guards only in the UI were bypassed | Enforce in the data layer |
| 8 | A broad "already recorded" exemption hid engine-level voids | Keep exemptions narrow and tested |
| 9 | A storage wipe would have locked the admin out of recovery | Mirror whatever sign-in depends on |
| 10 | Tests passed while phone users couldn't close a pop-up | Drive real touch/browser tests; click every button |
| 11 | Wrong code in a wizard showed an error and then proceeded | Every error path must stop |
| 12 | Import re-run doubled everything | Stable IDs + duplicate detection; export→import adds nothing |
| 13 | A schema column added in one place only | Add to every schema location with a test |

## Appendix B: Definition of done (checklist)

- [ ] Data can't be lost/corrupted: all-or-nothing, snapshot-first, proof-after, failure-injection tested
- [ ] Every modification and deletion is recorded (with reason where asked, automatically otherwise)
- [ ] Permissions enforced in the functions, not just the UI
- [ ] Duplicate/near-duplicate names prevented on entry and import, mergeable with aliases
- [ ] Imports previewed, confirmed, atomic, deduplicated, undoable; export→import round-trips to zero change
- [ ] Works offline with no setup; no CDN for core functions
- [ ] 0 layout findings at 320/360/390px, including every pop-up and first-run step
- [ ] Close/Back everywhere, scrolling works with keyboard open, device back works, Copy/Save/Print do what they say
- [ ] Sign-in: code-only identification, authenticator-first setup, backup codes, optional security key, lockout persists; all open standards
- [ ] Older builds' data opens in the new one (tested with the real old files); rollback consequences documented
- [ ] Dead code swept; no brand-specific example text; help text current
- [ ] Changelog (reported / wrong / changed / limits), versions, hand-off with numbered lessons
- [ ] Verification limits and deliberate omissions stated honestly
- [ ] Mobile build delivered, limits and signing rules documented
- [ ] Reply is short, plain, leads with the answer
