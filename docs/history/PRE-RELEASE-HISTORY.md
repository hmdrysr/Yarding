# Pre-release history

This is the private development log from before the first public release (v0), kept because it records *why* many things are the way they are. Version labels (v729 to v731, dates such as 2026.10.02.1) and the "Delivery" headings belong to that private history; the public project starts again at **v0**. Anything described as "fixed" here refers to the state of the code at that time; the current known problems are in `../../KNOWN_ISSUES.md`.

---

# Part 1: Change log


This file is updated with every delivery from here forward: what was reported, what was actually wrong, and what changed. Newest entries at the top.

---

## Delivery -- Phone sheet and bottom bar

**Reported:** names and IDs still overflow on the invoice sheet, the currency sign is clipped, the bottom buttons sit on the screen edge, and the close and navigation boxes are solid.

**Fixed:** sheet tables wrap inside the card. The balance has room for the currency sign. The bottom bar is inset from both edges and from the home area, and it is translucent. The close button is translucent too. Suite: 588 of 588. No unused path was safe to remove.

---

## Delivery -- Sheet clipping and harness note

**What arrived:** the app file was unchanged. The test harness now puts TextEncoder and TextDecoder on the window, which jsdom 25 does not provide. The delivery notes that came with that change were an older, shorter set and were not used.

**Fixed:** on the invoice sheet, a name, an ID, and the currency amount were cut off at the edge. Those values now wrap, and the balance has room for the currency sign. Suite re-run after the change.

---

## Delivery -- Another annihilation round

**Checked:** full suite, 588 of 588. Credit notes, checksums, the yard gate, and store wording.

**Fixed:** error text no longer says the store must be Supabase. A remote employee still uses the yard gate and never holds the database key.

---

## Delivery -- Bulletproof pass

**Checked:** full suite, 588 of 588.

**Fixed:** the yard gate no longer stops if the store cannot be reached, and it does not send a body on a read. The settings button no longer says the store must be Supabase.

---

## Delivery -- Abuse round

**Checked:** full suite, 588 of 588, then the cloud connector.

**Fixed:** a cloud write was dropping the key whenever it also sent a preference header. The key or yard pass is now kept on every request.

---

## Delivery -- Remote staff do not hold the database key

**Solution:** the administrator's device, or a small yard gate, holds the database key. A remote employee gets a gate address and a yard pass only. The pass is not the database key. Losing a phone does not expose the store.

**Added:** a staff connection option, and `yard-gate.js` for the office computer.

---

## Delivery -- Any store, not only Supabase

**Changed:** the cloud connection no longer requires the Supabase library. It speaks PostgREST, so a Supabase project, a self-hosted PostgREST, or any compatible store works with a URL and an API key. The books still stay on the device when cloud is skipped.

**Checked:** credit notes, checksums, and the full suite.

---

## Delivery -- Final abuse round

**Checked:** full suite, then credit notes, a tampered backup, and the startup script load.

**Fixed:** a credit note now reduces the subtotal and tax as well as the total, so the printed invoice still adds up. Over-size and zero credit notes are refused. A tampered backup no longer matches its checksum. Full suite passed, 588 of 588.

---

## Delivery -- Abuse sweep

**Checked:** full suite, then the backup path, the remote-script load, and the path that could send the books off the device.

**Fixed:** a JSON backup now carries a checksum and a file that fails it is refused. A restore still only adds missing records. It never overwrites or deletes. The app no longer loads a library from a CDN at startup. A question no longer sends figures to an outside service. Full suite passed, 588 of 588.

---

## Delivery -- Accounting conventions

**Checked against:** the IFRS for SMEs Accounting Standard (statement of financial position, income, retained earnings, cash flows, accrual basis, historical cost) and ordinary double-entry practice.

**Already present:** accrual invoices, double-entry ledger, trial balance, balance sheet with current profit in equity, profit and loss, cash flow, aging, bank reconciliation, inventory and fixed-asset accounts.

**Added:** a credit note that reduces what is still owed and reverses the income, without refunding cash. Chart accounts for accumulated depreciation, depreciation, owner's drawings, and sales returns. Help explains the convention. Full suite passed, 588 of 588.

---

## Delivery -- Harder sweep

**Checked:** full suite, then a probe for wrong account direction, a second void, search, short phones, and blank ids.

**Fixed:** a sale can no longer post to an expense account, and a purchase can no longer post to income. A second void is refused. Opening balances still post to equity. Full suite passed, 588 of 588.

---

## Delivery -- Search box keeps what you type

**Reported:** the search box dropped the first character.

**Checked:** typed H, then HY, on the Parties search. Both stayed, and the cursor stayed in the box.

**Fixed:** the handler had been attached to the wrong object, so the search never ran. It now keeps the query and puts the cursor back after the list redraws.

---

## Delivery -- Bug sweep

**Checked:** full suite 588/0, then an adversarial probe (negative lines, overpay, phone match, lookup cache, search, file names, trial balance).

**Fixed:** the first character of a search was discarded. Search boxes no longer use the button style. A same-day backup no longer overwrites the earlier file. A failed custom print no longer leaves the next print with the wrong name.

---

## Delivery -- Shorter file names

**Reported:** the file names were longer than they needed to be.

**Changed:** names are now short and still readable. `INV_00012_02Oct26`, `receipt_0004_02Oct26`, `Stmt_ACME_02Oct26`. Reports use a short word and the end date, such as `Sales_02Oct26`.

---

## Delivery -- Named files, tagged prints, fuzzy search

**Reported:** tag every print and input to the user; name exports so a file is recognizable without opening it; make searches fuzzy.

**Changed:** a print footer and the audit log record who printed it. The browser save name is INV_number_2026Oct02, receipt_number_2026Oct02, or Statement_name_2026Oct02. Spreadsheet and backup names follow the same pattern. New invoices, payments, parties, ships, items and advances are logged to the signed-in user after the save succeeds. Help, Parties and invoice lists match a fragment or a slightly wrong spelling. Full smoketest passed. No unused functions were added.

---

## Delivery -- Phone identifies the party

**Reported:** the same customer is typed in more than one way. Identify parties by phone, not by name. Sweep dead code and test after every change. Clarify help and the walkthrough. Check the interface. State the design philosophy in the handoff.

**Changed:** a phone number of at least 8 digits is the identity. Saving a second party with that phone is refused. An import with that phone uses the existing party even if the name differs. Help and the first-run walkthrough say this. The workbook has a Party phone column, and a round trip does not shift the other columns. Full smoketest passed. No unused functions were added.

---

## Delivery -- Deleted records on re-import

**Reported:** what happens if records are deleted and the same rows are imported again.

**Changed:** a row that matches a deleted or voided entry (same date, party and total) is left unticked until you confirm you want it added again. A sheet that still carries that entry's Yarding number is skipped, with a note to restore it from the amendment log instead of creating a second copy.

---

## Delivery -- Import duplicates and undo

**Reported:** catch accidental duplicates even among new rows, confirm with the uploader first, and allow reverting.

**Changed:** a new row that repeats another row in the same file (same kind, date, party, total and first line, or the same payment) is left unticked. Import is blocked if those rows are ticked unless the uploader confirms they are real second entries. After import, Undo this import voids what was added. The same undo stays in Settings, and the pre-import snapshot can restore the books.

---

## Delivery -- Faster screens

**Changed:** record lookups are indexed, so opening a screen no longer scans every table for each row. The Parties list totals owing and advances in one pass instead of four scans per party. Figures are unchanged.

---

## Delivery -- Samples, currency, unbroken figures

**Reported:** broken words or numbers must not happen on any page; default currency ৳; neutral sample names and companies; professional Canadian English, no South Asian phrasing.

**Changed:** table cells, pills and KPI figures no longer break mid-word or mid-amount on any screen. Setup currency defaults to ৳. Placeholders and the invoice preview use neutral sample names. Seed account is Cash on hand. The credit line was changed.

---

## Delivery -- Party table words and numbers

**Reported:** on the party page the table broke words and numbers.

**Cause:** every `td`/`th` used `overflow-wrap: anywhere`, so "Advance held", phone numbers and amounts split mid-token when the columns were narrow.

**Changed:** table cells wrap only on spaces. Amounts and right-aligned headers stay on one line and the table scrolls. The type pill is a span, not the cell itself.

---

## Delivery -- Checkbox hit target (v2026.10.02.1)

**Found:** Add tax / Record a payment now (and any `.field` checkbox) drew 16×48. `.field input` sets `min-height:48px`; the checkbox reset set `height` but not `min-height`, so the tick sat in a stretched box.

**Changed:** checkbox and radio rules now set `min-height` and `max-height` to 16px. Checked at 320px: both controls are 16×16, close button still on screen, no page overflow.

---

## Delivery -- Accounting guards (v2026.10.02.1)

**Reported:** test to the limit, fix bugs, remove dead code, make it bulletproof.

**Verified first:** existing `smoketest.js` — 586 passed, 0 failed. Dead names already removed in earlier deliveries (`restoreInvoice`, `doVoidInvoice`, `accByType`, old importers) are still gone; no further dead modules removed.

**Found by adversarial probes (not in the suite):**
- Editing an invoice could drop its total below what was already paid (1000 paid 800, edited to 100). Receivables clamp at zero, so the list looked fine while Accounts Receivable was over-credited. Trial balance still balanced.
- `applyAdvance` checked the advance held, not the invoice still owed, so a 400 advance could be applied to a 100 invoice.
- A sale could be "paid" with money out, a purchase with money in, and a customer advance applied to a purchase. The `paid` field moved; the ledger posted to the other control account.
- A payment or advance could be attached to another party's invoice.
- A missing bank account on an advance or refund threw inside the engine instead of a clear refusal. Zero quantity was accepted.

**Changed:** those paths now refuse before any write. Zero quantity, negative tax and a zero total are refused on create and edit. Party cannot be changed on an invoice that still has a live payment or applied advance. What's-new and `APP_VERSION` bumped to `2026.10.02.1`.

---

---

## Delivery -- Phone usability, new sign-in, live folder backup, complete amendment record (v731)

**Reported:** (1) close and expand buttons missing on phones, back buttons missing; (2) copy and other buttons not working; (3) cannot scroll back up after scrolling down, with the keyboard open, when expanding something, or in a pop-up; (4) the device back button should work; (5) adding staff did not work; sign-in should work like a till -- nobody identifies themselves, everyone signs in with their authenticator code plus backup keys, a hardware security key as an option, everything open source; (6) the administrator's setup should be an authenticator plus optional security key, not a password; (7) a clean, sensible workflow; (8) bring over the live backup folder / IndexedDB / fail-safes from the other tool ("security.html"); (9) an amendment record of ALL modifications and deletions; (10) spelling variants of ITEMS must be prevented and mergeable like customers and ships.

### A note on verification -- please read
- **Ran:** `tests/smoketest.js` **596 checks, 0 failing**, against both v728 and v729 (their real files booted first, data reopened by v731). `tools/auth_e2e.py` **29 checks** in real Chromium over `http://localhost` with a **virtual FIDO2 security key** (setup, add a worker, sign in by code / backup code / key, lockout across reload). `tools/mobile_test.py` **25 checks** in Chromium phone mode (touch scrolling, a simulated shrinking visible area, Back/Close, phone back button, copy fallback, blocked history API). `tools/uiaudit.py` **0 findings at 320/360/390px** across every screen and pop-up including setup, sign-in and the new people screens. Click sweeps of every button on every screen and pop-up: no script errors.
- **NOT verified:** nothing was tried on a physical phone, in iOS Safari, or inside another app's embedded viewer. The keyboard/toolbar behaviour was tested by simulating a smaller visible area, not a real keyboard. Security keys were tested with Chromium's virtual authenticator, not a hardware key. The live folder backup was tested against an in-memory folder that mimics the browser's API, not a real disk.
- **Honest limit:** I could not reproduce the exact scrolling failure on your phone. Causes I could identify from the code were fixed (see below); if a specific screen still misbehaves, tell me which screen and which browser.

### Phone usability (items 1-4)
- **Root cause of the missing close button and unreachable tops:** the bottom sheet was sized with `92vh`. On phones `vh` is the tall viewport (toolbars retracted) and ignores the on-screen keyboard, so a sheet could be taller than the visible screen and its top -- with the close button -- sat off-screen and could not be scrolled to. The app (and pop-ups, login and setup screens) is now sized to the **visual viewport** (`--vvh`/`--vvt`, tracked with `visualViewport`), falling back to `dvh`.
- Every pop-up now has a **fixed header** with a 44px **Back** (when it was opened from another read-only pop-up) and **Close**; only the content scrolls under it. Close-then-open in one tap counts as a chain, so Back works. Screens that hold input (forms, prompts) are never restored on Back, so stale half-filled fields cannot reappear.
- Tables with horizontal scroll no longer become vertical scrollers that swallow page scrolling (`overflow-y:hidden`); background scroll is locked behind pop-ups; the focused field scrolls into view when the keyboard opens.
- **Back:** a header **Back arrow** on every screen but the first; screens are real history entries (`{v: view}`), so the phone's back button steps back one level at a time, closes a pop-up first, and never needs two presses (a duplicate entry left by a closed pop-up is skipped). If a viewer blocks the history API the on-screen Back still works.
- **Copy:** `.select()` does nothing on a read-only box on iPhone, so the old buttons said "Copied" without copying, and the key-copy failed silently. One `copyText()` now tries the clipboard API, then a real selection + `execCommand`; if both fail it shows the text pre-selected and does not claim success. File saves on phones go through the share sheet ("Save to Files"), falling back to a download link.
- Expanders (`<details>`) have a visible arrow and a 44px target.

### Sign-in (items 5-7)
- **One screen for everyone.** Type the 6-digit authenticator code; Yarding works out who you are (no role choice, ID number, or name step). If two people's codes happen to coincide, it asks "which one are you?" between those two only.
- **Administrator setup** is: company -> your name -> scan a QR (or enter the key) in any authenticator app -> confirm with a real code -> **10 one-time backup codes** (copy / print / save as file; cannot continue until confirmed saved) -> optional security key -> signed in. No password exists. Suggested apps are open source (Aegis, Ente Auth, 2FAS, FreeOTP+, KeePassXC).
- **Workers/administrators are added from Settings -> People & sign-in** (name, role, sections) through the same wizard; the old ID number is gone. Each person can have a security key added and backup codes regenerated (with reason + the person's own code, recorded in Amendments).
- **Security keys** use WebAuthn (open standard): the public key is stored and each sign-in signature is verified in the browser (challenge, origin, site hash, user-presence flag, signature ES256/RS256, counter). Forged, replayed, wrong-site, tampered and cloned-counter responses are rejected in tests. **They need https:// or localhost and a real site name (not a bare IP); on a plain file or http page the option explains why it is unavailable. Everything else works everywhere.**
- Backup codes are stored only as hashes and work once; using one is written to the audit log and warns when few are left. Five wrong codes lock sign-in (30s, then 5 min, then 30 min); the lockout **survives a reload**.
- **Wipe safety:** sign-in accounts are mirrored to a second store; if the browser wipes IndexedDB they are restored automatically instead of locking the administrator out of the recovery tools.
- **Backward compatible:** yards created before v731 keep their shared admin/staff codes (with the old name step) and old-style worker codes; the administrator is offered "Move to an authenticator", then can turn the old code off. Shared staff codes are never created on new yards.
- Security note: backup and folder files contain sign-in keys (needed for full recovery); the UI says to keep them private.

### Live folder backup (item 8)
Ported from the other tool's design: Chrome/Edge on a computer keep a chosen folder in step with the books -- **readable per-table files (`yarding-live-<table>.json`) rewritten a few seconds after every change (only the tables that changed)**, a manifest, and dated snapshots written only when something really changed. **Check backup** compares the folder with the app (flags "missing", "behind", and "MORE than the app"). **Merge from folder** (administrator) brings back records the app lacks -- never overwriting, never deleting, snapshot first, reason required. Recovery falls back to the live files if `latest.json` is missing or damaged. Phones and other browsers cannot write to a folder; the card says so and points to Export (share sheet). Also kept: IndexedDB journal/rollback, snapshots, shrink guard, integrity check.

### Amendment record (item 9)
Edits, voids and deletions that go through a reason prompt were already recorded. **Anything else that changes or deletes a business record is now recorded automatically** (before/after, who, when; sign-in secrets shown only as "changed"; routine bookkeeping such as `paid` totals and the last code used is not). Found and fixed on the way: **archiving a bank account changed the books with no reason and no record** (now asks for one); engine-level voids (e.g. undoing an import) had no record.

### Items (item 10)
Items were already covered by the same matcher as parties and ships: typing a new or renamed item checks existing ones, imports group variants, and **Settings -> Books & data tools -> Similar names -> Items** (also a button on the Items list) merges duplicates, moving invoice lines and keeping the old spelling as an alias.

### Data and compatibility
IndexedDB is still version 8. New optional fields: `role`, `backup_codes`, `webauthn` on `staff_accounts`. **Cloud yards must re-run the updated SQL once.** Rolling back to v730/v729 is safe for data, but v730 and older do not understand authenticator-only yards: on a yard set up with v731's new admin, older builds would show the old login with no admin code. Roll back only on a yard that still has its old codes.

### Known limits
- The live folder backup cannot run on phones (browser limitation).
- A hardware key cannot be used from an `http://` address or a bare IP.
- The tab guard, "not the same" answers and lockout counters live in the device's localStorage.

---

## Delivery -- Admin-first setup, spreadsheet workbook, similar-name merging, accounting controls (v730)

**Reported:** (1) only the administrator sets up an account, then adds workers from Settings with an authenticator, no backend or extra setup; (2) imports must be checked and confirmed so nothing corrupts; (3) catch and merge near-identical names ("mv wangtong" / "wangton") so a cashier's spelling never splits a customer or ship; (4) easy xlsx import/export in Settings with an auto-template of the whole system; (5) the administrator chooses which sections a worker gets; (6) fix text cut off on small screens; (7) no brand-specific example data; (8) add whatever a proper accounting flow is missing; (9) fail-safes so nothing is lost or corrupted mid-use; (10) stay backward compatible with older data; (11) sweep dead code.

### A note on verification -- please read
- **What ran:** `tests/smoketest.js`, **474 checks, 0 failing, identical across repeated runs**, against this file, with the real v728 build (and separately v729) booted first, its IndexedDB and localStorage reused, and the yard reopened by v730. Plus 73 file-format checks (`tools/test_xlsx.js`: my inflate against zlib, my writer read back by SheetJS, SheetJS/Excel-style files read by my reader) and 28 name-matching checks (`tools/test_match.js`).
- **Layout:** `tools/uiaudit.py` drives real Chromium at 320, 360 and 390px through every screen and pop-up (including the new import review, column matcher, transfer, reconcile and merge screens): **0 findings**. Two screens were also looked at as screenshots at 360px.
- **What was NOT verified:** nothing was tried on a physical phone, in Safari/iOS, or against a real Supabase project. An Excel/Google Sheets file was never opened in Excel or Sheets themselves -- the workbook is validated by reading it back with a third-party reader (SheetJS), not by Excel's own parser. Cloud SQL is checked for presence of statements, not executed.

### Root cause of the cut-off text (item 6)
The v729 restyle **replaced** the rule `.row > *, .field, .kpi, .card{ min-width:0; }` with card styling. Every field, KPI tile and child of a `.row` became its own bordered, padded card, so inputs shrank (about 228px at 360px) and text and placeholders were clipped. The `min-width:0` is restored; the design-language test that had been protecting the bug now asserts the fix. Also: bottom-nav labels wrap instead of being cut, pills wrap, one long placeholder shortened.

### Setup and workers (items 1, 5, 9)
This was already largely in the working file (TOTP workers, per-worker module grants, safety layer) but undocumented. What was actually wrong or missing:
- **Worker sign-in and setup failed on plain `http://`** (a copy hosted on the yard's LAN): `crypto.subtle` does not exist there. Added a small pure-JS SHA-1/SHA-256/HMAC fallback; RFC 6238 vectors and reference SHA-256 vectors pass with `crypto.subtle` removed.
- **Settings "Access codes" re-created a shared staff code** on yards that had moved to individual workers. It now changes only the admin code; a shared code exists only on yards that already had one, with a "turn off" action.
- **Module grants were only cosmetic in places**: the quick-add sheet and dashboard feed ignored them, and nothing stopped a worker's session calling the accounting functions. Grants are now enforced inside `Ledger.*` (`Access.require`), and worker management, imports, merges, closing the books and opening balances require the administrator (`Access.requireAdmin`) in the functions themselves.
- A wrong verification code during worker enrolment showed an error **and then created the worker anyway**. Now stops.
- Settings hides connection, restore, import and reset controls from non-administrators.
- **Two windows on one yard:** a second tab could save from stale numbers. When another window writes, this one blocks writes and shows a reload banner (feature-detected `BroadcastChannel`; local mode).

### Spreadsheets (item 4) and import safety (item 2)
One pipeline replaces three separate importers: read, parse strictly, match names, find duplicates, preview, confirm, apply all-or-nothing, verify, record.
- **Own .xlsx/.csv reader and writer, no library, no internet.** The old code loaded SheetJS from a CDN, so Excel export and import failed offline; that script tag is gone. Old binary `.xls` is refused with instructions to re-save.
- **Workbook** (Settings -> Spreadsheets): blank template or "workbook with my data": sheets ReadMe, Parties, Ships, Items, Sales, Purchases, Expenses, Payments, OpeningBalances, Lists; frozen header, dropdowns fed from the yard's own lists (warning-only for names, so new ones can be typed), number and date checks. The example row is ignored on import.
- **Any layout** still works through a column matcher (now with word-level heading matching, e.g. "Wt (MT)").
- **Strict values:** unreadable dates/numbers are errors on that row, never guessed; ambiguous `03/04/2026` is read day-first and warned; totals are recomputed; negative amounts, zero totals, closed-period dates, unknown categories/accounts and category/type mismatches are errors.
- **No doubled imports:** rows carrying a Yarding No. or Yarding ID already in the books are skipped; a same date/party/total match is flagged as a probable duplicate and unticked. Exporting everything and importing it back adds nothing (tested).
- **Never overwrites:** existing records only get blank fields filled.
- **Confirmation:** the Import button stays disabled until the review is acknowledged. **Apply** takes a safety snapshot, runs in one transaction, proves the trial balance and `Health.errors()` did not get worse (else rolls back), then records an `import_batches` row. A failure injected part-way leaves the books byte-for-byte as before (tested). **Undo** voids what the import added and retires records it created; it refuses if payments were later recorded against those invoices.
- Bank-statement import: same offline reader, strict values, skips lines already recorded on that account, blocks closed periods, posts in one all-or-nothing step. Module-package import: administrator only, checks the closing date, one transaction, balance check.

### Similar names (item 3)
`Match` normalises case, punctuation, vessel prefixes (MV/M.V./MT/SS...), company suffixes (Ltd/Limited/Co...), then scores with an edit distance that treats a swapped pair of letters as one slip, with rules that keep "Star 1"/"Star 2" and "MV Ocean"/"MV Ocean Star" apart. Exact and remembered spellings match silently; close ones default to "same" but are shown; possible ones default to "different" but are shown.
- Typing a new party/ship/item (or renaming one) that is similar to an existing one asks first.
- Imports group variants of a new name into one record and remember the other spelling as an alias.
- **Settings -> Books & data tools -> Similar names** (and a button on each list) finds existing duplicates and merges them: invoices, payments, advances, comments and linked items move over; the old spelling becomes an alias; the loser is retired (`deleted`, `merged_into`), never removed; snapshot first; reason + own code; rolls back if any reference is left behind (tested, including an injected failure).

### Accounting flow (item 8)
Audited against a normal small-business flow; added: **closing the books** (period lock enforced in the `DB` layer so no path skips it, including voids), **opening balances** (a real invoice against a new Opening Balance Equity account, excluded from sales reports and profit), **transfers** between cash/bank accounts (never touch profit or cash-in/out), **bank reconciliation** (was an empty store; matched entries are locked, undo by the administrator), and **overpayment blocking** on invoices (also: a payment on a voided invoice, and a payment with no bank account, now give clear messages instead of a crash or a wrong balance).
**Deliberately NOT added: credit notes and write-offs.** They touch every balance consumer (statements, ageing, receivables/payables totals, reports); adding them quickly risks two screens disagreeing about what someone owes. The current substitute is void-and-re-enter. Recommend doing them as their own piece of work.

### Other bugs found and fixed
- `todayISO()` used the UTC date: before 6am in UTC+6 every new entry defaulted to yesterday (wrong month at month-end). Now the local date; chart/report period helpers likewise.
- `recordPayment` crashed on a missing bank account.
- Two report-period helpers used UTC; replaced with local-date `isoDate()`.

### Data and compatibility (item 10)
- **IndexedDB stays at version 8**; all new data uses existing stores (`import_batches`, `reconciliations`) and new optional fields, so rolling back to v729 or v728 cannot hit a VersionError. Older code simply ignores the new fields.
- New optional fields: `aliases`, `merged_into`, `deleted` on parties/ships/items; `opening`, `import_batch`, `import_ref` on invoices; `import_batch` on payments. Both cloud SQL scripts gained them, plus `import_batches`, `reconciliations` and the worker sign-in columns.
- **Cloud (Supabase) yards must re-run the updated SQL once** before using v730's new features; local-only yards need nothing.
- Legacy shared staff code, headless yards and "upgrade to administrator" keep working (tested).
- One thing that differs from the old behaviour: importing is now administrator-only.

### Cleanup (item 11)
Removed the old importers and templates (`openRecordsImport`, `_guessCol`, `parseRecordsFile`, `_buildRecordsPreview`, `_normalizeDate`, `previewRecordsImport`, `commitRecordsImport`, `downloadTemplate`, `_normalizeShipName`, `_findShipByName`, `openImportXLSX`, `doImportXLSX`, `confirmImportXLSX`, `detectImportXLSXKind`, `exportXLSXAll`) and the CDN script. A scan found no other unreferenced methods and no unused CSS classes. Help and the tour were rewritten for the new flow; new Help topics cover merging, closing, opening balances, transfers and reconciliation. Brand-specific example text replaced with ABC/ACME-style examples; a test now fails if one comes back. The credit line in the About text was left as authorship.

### Known limits
- Reconciliation ties out to the cent but has no statement import.
- "Not the same" answers in the Similar-names screen are remembered per device (localStorage), not synced.
- The tab guard is local-mode only; cloud yards already sync between devices.
- Very large yards (over 400 parties/ships/items) compare only names starting alike when scanning for duplicates, to keep the screen quick.

---

## Delivery — Design-language adoption, plus a fourth audit

**Reported:** follow the supplied design language for Yarding; check for bugs, dead code and inconsistencies and fix them.

### A note on verification — please read
Between deliveries the working environment was reset. The 728-check test suite, the layout audit and their dependencies were **gone**; only the shipped files survived. The restored `index.html` was confirmed byte-identical to the shipped v728. I rebuilt a verification harness (137 checks) and it now ships in `tests/`.

**It covers less than the old suite.** Retained: accounting invariants (including every void path), reason+code controls, deleted-record consistency, staff accounts, spreadsheet import and templates, custom print templates, upgrade-in-place data preservation (against the real v728), backup/restore, the blocked-database screen, every report print/export, blank-form submission, hostile-text safety, and static checks of the design language. **Thinner or not re-created:** field-by-field form behaviour, dashboard KPI arithmetic, chart geometry, and the long tail of the older UI tests. Nothing here can render a screen, so **none of the visual result has been seen** — see "What to check by eye".

### Design language
Applied additively, as the reference itself prescribes. Every reference token is defined with the specified value; ~400 existing inline styles keep working because the legacy names are now aliases of the new tokens.
- **Header bar** is oxford navy with top safe-area padding; **sidebar** is a light surface whose active tab uses the same selection pair as hovered table rows; **primary buttons are near-black**, blue is reserved for brand/headings/focus.
- **Buttons** 50px (38px `.sm`), ghost buttons bordered, one `.danger` class replacing 15 inline-red buttons.
- **Fields:** 16px text (below that iOS zooms the page on focus), small uppercase labels, border-plus-halo focus, a visible ring on everything else.
- **Tables:** mono uppercase headers, shared hover colour. **Cards:** 18px, tokenised shadow, `.card-header` (35 hand-styled titles converted).
- **Modals** are one component with two shapes: a centred dialog above 640px, a bottom sheet with drag handle below; ✕, tap-outside **and now Escape** all close it; z-index raised so nothing can render over it.
- **Tabs and filters** are now a proper segmented control (five places).
- Reduced-motion honoured; charts get their own palette (a near-black primary would have turned every bar black).
- Full mapping, deviations and a checklist: `DESIGN.md`.

### Bugs found and fixed
1. **Voids skipped the controls.** Voiding an invoice, payment or advance took one tap, no security code, and left **no amendment record** — while every edit and delete required both. All three now go through reason + own code + amendment log (+ optional note on the record).
2. **Bank-account edits skipped them too**, even when changing the opening balance (which moves real figures). Now controlled; also renames the linked ledger account so reports agree. **Staff-account edits** likewise (the log records that a code changed, never the code or its hash).
3. **Deleted records leaked** into a party's Transactions tab, an invoice's Payments tab, both party statements, and every Excel export — while the lists hid them. All now agree. The full JSON backup still keeps them, flagged, as history.
4. **The party Statement had become unreachable** when the party screen was redesigned, so the **Statement footer note** setting silently did nothing. Restored (party → Transactions → Statement → Print).
5. **A wrong manual journal entry could never be removed.** Now deletable from the Ledger; entries owned by an invoice/payment/advance are refused, since deleting only the ledger half would leave that record lying.
6. **`--muted` was used but never defined.**
7. **The viewport disabled pinch-zoom** (`maximum-scale=1`) and lacked `viewport-fit=cover`.
8. **Help and the tour still said edits need "just a reason"** when a security code is also required.
9. **"Lock app" would have been near-invisible** on the new light sidebar (inline light-grey text) — caught by hunting for anything styled for a dark background.
10. **Cloud schema gaps:** the app writes `remarks` on ships/items/bank accounts/advances and `deleted` on payments, but the Supabase schema lacked those columns, so such edits would sit in the retry queue on a cloud yard. Both SQL scripts now include them.
11. Two flex containers lacked an explicit `align-items`.

### Dead code removed
`Forms.accByType`, `Ledger.restoreInvoice` (nothing could create a restore — un-deleting needs a proper design because deletion voids the invoice's payments and advances too), `Views.doVoidInvoice`, the "Restores" amendment tab, `.invalid`/`.err`/`.icon.lg`/`.credit-line.on-dark`, four `isAdmin = true` placeholders. `FolderBackup.forget` was dead only because it had no button — it now has one ("Turn off").

### Investigated and found NOT to be problems
The seven "unwrapped tables" a scan flagged are all printed documents or template example markup; no on-screen data table lacks its scroll wrapper. `Icons.el` and `DB.*` were scanner artefacts. Invoice Void was already open to staff.

### What to check by eye (I could not render anything)
Button height in dense toolbars and table rows; the bottom-sheet behaviour and drag handle on a real phone; header padding under a notch; segmented control wrapping on a narrow screen; uppercase labels containing hint text; chart colours; that "Lock app" reads clearly in the sidebar.

---

## Delivery — Third audit: two real bugs found, plus a broad clean bill

**Reported:** go through the whole code, find and fix bugs.

### Bugs found and fixed
1. **Custom template JavaScript never ran.** The template editor offered a JavaScript box and described it as running when the document is prepared — but it never executed. A `<script>` tag inserted through `innerHTML` is simply not run by the browser, so the code was silently discarded. The script is now executed explicitly after the document is rendered, wrapped so that a script which fails still leaves the document printable (verified: a template whose script throws still prints). This mattered because it was a feature that looked like it worked and quietly didn't.
2. **On a yard with no admin, nobody could add staff accounts.** The staff-accounts card was gated on the admin role alone, so a solo operator running a headless yard — who is effectively the admin — could never add a colleague. Headless yards can now manage staff accounts.

### Verified clean in this pass (no bugs found)
- **Reports, exports, prints and backups against deleted/voided records.** P&L, Sales by Customer, Sales by Item, the sales statement, AR aging, customer balances, receivables, cash and Payments Received all correctly exclude deleted and voided records, while the backup still *contains* them, flagged deleted — history preserved rather than discarded. Every export and print path runs without error.
- **Reassigning an invoice to a different party** correctly moves the outstanding balance off the old party and onto the new one.
- **Two staff members sharing initials** get distinct ID numbers, and each person's code authorises only their own account.
- **Staff-only (headless) yards** log in, and the staff member's own code authorises amendments.
- **Manual journal entries** post and balance, and the Ledger renders with them.

**Tests:** 728 passing (up from 717), stable across three consecutive runs, layout audit clean.

---

## Delivery — Second audit: the void bug had two more hiding places, plus a security hole

**Reported:** run another test and fix all bugs.

### The void double-reversal was in two more places
The bug fixed earlier in `voidInvoice` — where marking a transaction voided **and** posting a reversing entry each removed the money once, so the amount came off twice — was still present in `voidPayment` and `voidAdvance`.

Voiding a ৳400 payment drove cash to **-400** instead of back to 0. Voiding an advance did the same. As before, the trial balance still reported "balanced", because both sides moved together — which is exactly why it survived the first fix.

**If you have voided any payments or advances, your cash figures were understated.** This build corrects them automatically; nothing needs re-entering.

### Security: a removed staff member's code still worked
`verifyOwnCode` checked that the account existed and the code matched, but not that the account was still active. Someone removed from the yard could still authorise edits and deletions with their old code if they had the app open from before. Now a removed account stops authorising anything immediately.

### Payments and bank accounts were missing edit and delete
You'd asked for edit and delete on everything; payments and bank accounts had neither.
- **Payments** can now be edited (amount, date, account, note) and deleted, with the same reason + own-security-code + optional note as every other record. Editing reverses the original money movement and records the corrected one, so cash and the linked invoice balance both stay right — verified: correcting 300 to 450 moves cash to exactly 450 and the invoice balance with it, and deleting it returns both to zero.
- **Bank accounts** can now be deleted, hidden from every list and picker while everything recorded against them keeps counting. If the account still holds money, the confirmation says so plainly rather than letting the balance quietly vanish from view.

### Also verified clean in this pass
Five consecutive edits to one invoice leave the correct total with no duplicated lines; editing an invoice that has an applied advance keeps the advance applied and cash untouched; a staff member with narrow module preferences can still reach Settings, Amendments and the Ledger; every screen renders throughout.

**Tests:** 717 passing (up from 690), stable across three consecutive runs, layout audit clean.

---

## Delivery — Full audit: data preservation verified, and a serious silent-data-loss bug fixed

**Reported:** check the whole script and make it bulletproof — free of bugs and inconsistencies, without corrupting any previous data. All previous data must be preserved.

### Data preservation — verified, not assumed
Rather than reasoning about the migrations, a yard was built on the **v465** build (before staff accounts, amendments, comments, remarks and the `deleted` flags existed), then opened on this build sharing the same IndexedDB *and* the same localStorage — a genuine in-place upgrade on the same device.

Every invoice, invoice line, payment, party, ship, ledger transaction and ledger line survived. Invoice numbers were **not** renumbered. Cash and balances matched exactly. The existing admin code still logged in. Every screen rendered. Legacy invoices could still be opened and edited afterwards, with payments against them preserved.

Backup and restore were separately verified to round-trip **every** table, including all the newly added ones, with restored staff members still able to sign in using their original codes and staff codes stored only as hashes.

### The serious bug this audit found
In local-only mode, IndexedDB is the **only** copy of the data. If it can't be opened — nearly always because the app is open in another tab holding an older database version — every table reads back empty. The app then rendered a perfectly normal, **completely empty dashboard**.

To the person using it, that is indistinguishable from having lost everything. Worse, they could have started re-entering a day's work into that empty app, and every one of those writes would have gone nowhere.

The detection logic existed but was being defeated: `boot()` painted a fresh view straight over the warning, and navigating to any other screen escaped it entirely. Both are fixed. The app now keeps a clear explanation up — that the data is safe, that another tab is the likely cause, and how to recover — on **every** screen, and never presents an empty data-entry form while the database is unreachable.

### Consistency audit
Verified that deleting a party, ship or item removes it from every picker (invoice form, line items, payment form) so it can't be selected again, while every record that already referenced it keeps working and keeps counting — historic invoices still show their party, income still includes the sale, and per-ship profit still attributes it. Getting only half of that right is the dangerous outcome, in either direction.

**Tests:** 690 passing (up from 646), stable across three consecutive runs, layout audit clean.

---

## Delivery — Full consistency audit, with data preservation proven

**Reported:** check the whole script, make it bulletproof, free of bugs and inconsistencies, without corrupting any previous data.

### Data preservation — proven, not assumed
The most important question was whether upgrading loses anything. This is now a permanent test rather than a claim: real records are created on the **actual shipped v465 file**, then the same database and stored settings are reopened with the current build and compared. Verified intact: every invoice, invoice line, payment, party, ship, ledger transaction and ledger line; invoice numbers unchanged (nothing is renumbered); cash balance identical; books balanced; every screen renders; and legacy records remain editable afterwards. Tables added since v465 appear empty rather than missing, and with no staff accounts the old shared staff code still works — so upgrading cannot lock anyone out.

Backup/restore was checked the same way: amendments, staff accounts, comments and on-record remarks all survive a full export/import round-trip, and a restored staff account can still sign in.

### Inconsistency found and fixed
Deleting a record removed it from its own screen but **not from anywhere else it was listed**. A deleted party was still selectable on the invoice and payment forms; a deleted ship still appeared in the invoice ship picker, the item form's ship picker, per-ship profit, and the ship Excel export. Nothing was corrupted, but staff could keep picking records that were supposed to be gone.

Fixed at the root: every listing now goes through shared `activeParties()`, `activeShips()` and `activeItems()` helpers instead of each screen filtering for itself — the pattern that let four places drift apart. Records already attached to an existing invoice are unaffected, so historical documents never lose the name they were issued under.

### Also verified clean (no bugs found)
A deleted invoice disappears from the P&L, sales-by-customer, sales-by-item, the sales statement, AR aging and receivables — not just its own list. An edited invoice is counted exactly once everywhere. Amendments always carry a reason, an actor and a timestamp. Two staff members sharing the same code get different stored hashes and cannot authorise each other's changes, and an admin's code does not authorise a staff member's.

**Tests:** 684 passing (up from 646), stable across three consecutive runs, layout audit clean.

---

## Delivery — Collapsing label column on detail screens

**Reported:** a screenshot showing "Recorded by" rendered as a vertical stack of single letters on the invoice detail screen.

**What was wrong:** in the key/value rows (Invoice Date, Terms, Recorded by, ID), the label column had no minimum width. When the value beside it was long and couldn't break — an invoice's long ID is one unbroken run — the browser gave that value the space and squeezed the label down to a single character per line.

**What changed:** label cells now hold their natural width on one line, and the value beside them wraps instead. Applies to every key/value detail row — invoices, payments and parties — not just the one in the screenshot. A permanent check was added to the layout audit so this pattern can't quietly return.

---

## Delivery — Ship information was being lost on spreadsheet import

**Reported:** ship info isn't imported when importing sales or expenses.

**What was actually wrong:** the importer only ever *matched* a ship name against ships that already existed. If no match was found, the link was silently discarded — no warning, no row flagged, nothing in the preview to notice. Parties and items were created automatically when missing; ships alone were not. So any imported work referencing a ship the app didn't already know about lost that link entirely, and per-ship profit missed all of it.

**What changed:**
- **Ships are now created on import when missing**, exactly like parties and items. Covered by the same "create anything that doesn't exist yet" checkbox, whose label now says so.
- **Forgiving name matching.** The same vessel gets written many ways — "MV Ocean Star", "M.V. OCEAN STAR", "mv ocean-star". Matching now ignores case, punctuation and vessel prefixes (MV/MT/SS), so an existing ship is recognised rather than a near-duplicate being created beside it. Verified: three different spellings of one ship across two files all resolve to the same record, and only genuinely new vessels get created.
- **Ships are visible in the preview before anything is committed** — a Ship column per row, plus counts of how many matched existing records and how many will be created (named). A blank cell leaves the invoice unlinked rather than guessing.
- **A warning if a ship column is selected but every row in it is blank**, which usually means the wrong column was picked.
- **Wider ship column aliases** — "Vessel", "Vessel Name", "Ship Name", "Lot", "Plot", "Boat", "Vsl" all match automatically.
- **A blank Ships template** added alongside the existing ones.

Verified across both the sales and expenses import paths, with per-ship profit correctly picking up imported sales and costs afterwards.

**Tests:** 646 passing (up from 629), stable across three consecutive runs, layout audit clean.

---

## Delivery — Staff accounts, code-confirmed edits everywhere, hidden code fields, editable print templates

**Reported:** (1) staff and admin must be able to edit and delete any record, confirming with a reason **and** their security code, recorded in Amendments plus a note on the entry itself; (2) code fields hidden everywhere with a properly aligned show/hide toggle; (3) print templates editable from Settings without touching code, allowing HTML/CSS/JS; (4) admin can add as many staff as needed (or none), staff sign in with an ID number and security code, and with no admin a staff member adds their own.

### Per-person staff accounts
Each staff member is now a real account with their **own ID number and own security code**, instead of everyone sharing one code. Admin adds them in Settings → Staff accounts (name + code; the ID number is assigned automatically and can be overridden). Duplicate ID numbers are refused. Codes are stored hashed — never in plain text. Removing someone stops them signing in but leaves everything they recorded intact and still credited to them.

**Backward compatibility mattered here:** a yard with no staff accounts keeps working exactly as before on the shared staff code. The ID-number login only appears once at least one account exists — otherwise this update would have locked every existing staff member out of their own books.

**Why this matters beyond convenience:** it's what makes "who recorded this" and "who amended this" actually mean something, and it's what the edit confirmation below checks against.

### Edit and delete on everything, confirmed by security code
Invoices, parties, ships, items and staff accounts can all now be edited and deleted by anyone, and each action requires:
- a **reason** (goes to the Amendments log),
- an optional **note left on the record itself**, timestamped and attributed, so anyone opening the entry sees why it looks the way it does without digging through Amendments,
- and **the person's own security code** — an admin's admin code, or a staff member's own. A staff code will not authorise an admin's change and vice versa. Without this, anyone on an unlocked device could amend records under someone else's name, which would make the whole log worthless.

Notes accumulate rather than overwrite, so a record amended three times shows all three.

### Code fields hidden everywhere
Every security-code and password field in the app — setup, login, access codes, staff accounts, app lock, AI key, and the new edit confirmations — is masked by default with a show/hide eye toggle. Built as one shared component so the behaviour and alignment are identical everywhere rather than re-implemented per form. The toggle sits inside the field and the input reserves matching padding, so it never overlaps the typed digits at any width.

### Fully editable print templates
Settings → **Design your own invoice layout**. Write your own HTML, CSS and JavaScript, using `{{tokens}}` for real values. Includes the full token list (clickable to insert), a repeating `{{#lines}}…{{/lines}}` block for line items, a **live preview against a real invoice**, and a "start from the standard layout" button so nobody faces a blank box.

Two deliberate safety properties: every substituted value is escaped, so a party name containing markup can't break or hijack a printed document; and a template that fails falls back to the built-in layout with a warning, because a broken template must never make printing impossible. The preview does not run your JavaScript — it renders inline in the app, and a half-finished script shouldn't be able to interfere with the page you're editing on.

### Bugs found and fixed
1. **Custom template line items printed blank.** The general token pass ran before the repeating line block was expanded, so `{{description}}` and friends inside the block found no matching top-level token and were emptied. Caught in testing; the passes are now correctly ordered.
2. **The staff login change removed an element the app still relied on**, breaking the role label on the login screen.

**Tests:** 629 passing (up from 586), stable across three consecutive runs, layout audit clean.

---

## Delivery — Onboarding, searchable help, AI connect, and full staff autonomy

**Reported:** onboarding/familiarisation for everyone plus a note when an update ships; a searchable help modal in Settings; an optional "connect your AI"; and giving staff as much autonomy as possible — all the features and settings an admin gets. Plus a fresh check for bugs.

### Staff autonomy
Staff now get **everything an admin gets**: the Ledger, the Amendments log, the full Settings page, every import, backup and restore, voiding, manual journal entries, editing bank accounts, and clearing device data.

**One deliberate exception: changing the login codes stays admin-only.** If anyone could change the admin code, a single mistake could lock the entire yard out of its own books with no way back in. Staff see that section with the reason written out, rather than it silently missing — so it reads as a decision, not a bug. Everything else is open; say the word if you want the codes opened too.

### Onboarding and update notes
- A **six-step familiarisation tour** on first login for *everyone*, not just admins — what each screen is for, that mistakes can be fixed freely, that they can keep using their own spreadsheets, and where to find help. Skippable, and replayable any time from Settings.
- A short **"what's new"** note shown once per person after an update. Brand-new people don't get it — a change list for something you've never used is just noise.
- `window.APP_VERSION` controls this. Bump it and update `WHATS_NEW.items` whenever you ship something worth telling people about.

### Searchable help
19 topics covering the whole app, searched across titles, keywords **and** body text — so "refund" finds the advances topic even though that word isn't in its title. Replaces the previous single scrolling page, which couldn't be searched.

### Connect your AI (optional)
Bring-your-own-key, works with Anthropic, OpenAI, or any OpenAI-compatible endpoint. Ask questions about your own figures in plain language.

**On privacy, deliberately:** the key is stored only on the device, and only **aggregates** are sent — totals, balances, party names, top items — never the raw ledger. The consent card says exactly this before you connect. "Which buyer owes the most?" shouldn't quietly ship every transaction you have to a third party. Leave it off and everything else works unchanged.

### Bugs found and fixed
1. **Onboarding could steal a modal the person already had open.** The post-login prompt fires on a short delay, and in that window someone can easily have opened a form — it would have replaced their work mid-task. Caught in testing when it wiped out a confirmation dialog. It now stands down if anything is open.
2. **The onboarding module's own buttons would have failed in a real browser.** It was declared with `const` instead of the app's `window.X` convention, so inline `onclick` handlers referencing it couldn't resolve it. Caught only because the test harness reaches modules the same way the DOM does.
3. Two bugs in the new tests themselves (a `localStorage` reference that silently did nothing, so two checks were passing vacuously).

### Adversarial hunt on the new surfaces (no further bugs found)
Verified: hostile HTML in help search, in any AI field, and in imported spreadsheet cells never executes; the API key is never rendered back into the page; edits with NaN amounts are rejected; two consecutive edits leave the correct total rather than an accumulated one; editing a voided or deleted invoice is refused; deleting twice doesn't subtract twice; six degenerate import files (empty, blank rows, negative, 1e308, unrecognisable columns) are all handled; and every screen renders for a staff user now that access is widened.

**Tests:** 585 passing (up from 552), stable across four consecutive runs, layout audit clean.

---

## Delivery — Spreadsheet intake, edit/delete with an amendment log, blank templates, and a serious void bug fixed

**Reported:** (1) keep a log of the last working version; (2) staff keep records in whatever spreadsheet format they like and need a way to feed that in without changing how they work, including old files; (3) no edit or delete is hurting workflow — allow both for everyone, but require a reason and keep a separate log for admins; (4) provide downloadable blank templates.

### A serious accounting bug found and fixed along the way
While building the edit feature I found that **voiding an invoice subtracted its amount from income twice.** Voiding a ৳1,000 sale left income at **-1,000** instead of 0, and the P&L reported negative income that never existed. The cause: voiding both marked the transaction voided *and* posted a reversing entry, but every balance function in the app already excludes voided transactions — so the amount came off twice. The trial balance still reported "balanced" (both sides moved together), which is why it went unnoticed. Verified against the shipped v465 build, not theorised. **Any yard that voided invoices was under-reporting income; this release corrects those figures automatically, with nothing to re-enter.**

### Version log
`docs/VERSIONS.md` now records each verified-good build, with a snapshot kept in `versions/`. A version is only listed once the full suite passes with zero failures, the layout audit is clean, and the file parses. Rolling back is just using the older file — there's no build step and data lives separately.

### Edit and delete, for everyone, with accountability
- **Both are now available to all staff, not just admins** — but never silently. Every edit and deletion requires a typed reason.
- **Editing an invoice keeps the books correct.** The original ledger entries are reversed and replaced with corrected ones. The invoice number doesn't change (so anything already handed to a customer still matches), and any payments already recorded against it are preserved untouched.
- **Deleting never destroys anything.** The ledger is corrected the same way a void does and the record is hidden from lists, but it stays fully intact and reviewable.
- **New admin-only Amendments screen** listing every edit and deletion, who made it, when, their stated reason, and the complete before/after. It can't itself be edited or deleted.

### Flexible spreadsheet intake
The point is that staff *don't* have to change how they work. The importer reads any CSV or Excel file, in any layout:
- **Skips junk title and blank rows** above the real header, which real-world sheets almost always have.
- **Auto-matches columns** against a wide vocabulary of what people actually write — "Dt", "Party Name", "Particulars", "Wt (MT)", "Unit Price", "Total Value" all match correctly, in any order.
- **Handles messy dates** — dd/mm/yyyy, ISO, and raw Excel serial numbers. Anything genuinely unreadable is flagged for attention rather than silently guessed, since a wrongly-guessed date lands in the wrong reporting period and is very hard to spot later.
- **Fills in what's missing** — derives Amount from qty × rate, or Rate from amount ÷ qty.
- **Creates unknown parties and items** as it goes, without duplicating ones that appear on several rows.
- **Full preview before anything is written**, including a count of what will be created and a list of rows that need attention.

### Blank templates
Downloadable from Settings for Sales, Purchases, Expenses, Payments, Parties and Items. Each has one filled-in example row showing the expected shape — and that example row is **automatically skipped on import**, so forgetting to delete it can't create a phantom record. A filled-in template imports with every column matched automatically and no manual mapping.

**Tests:** 516 passing (up from 465), stable across four consecutive runs, layout audit clean.

---

## Delivery — Deliberate bug hunt: five real defects found and fixed

**Reported:** A request to test the app thoroughly and fix anything found.

**Method:** Rather than only re-running the existing suite (which passed), I wrote throwaway audit scripts that deliberately attacked the app from angles nothing had tested before: every view on a completely empty yard, every view against deliberately orphaned/malformed records, the accounting engine with invalid amounts, imports with corrupted files, hostile HTML in every text field, extreme numbers and dates, and every form opened and submitted blank. Five genuine defects surfaced. All are now fixed and locked in as permanent regression tests (the suite grew from 451 to 465 checks).

**Bugs found and fixed:**
1. **NaN amounts permanently corrupted the books.** A payment or advance of `NaN` passed the ledger's balance check (because `NaN - NaN` is `NaN`, and `Math.round(NaN) !== 0` is `true`) and wrote `NaN` into the ledger, poisoning every balance derived from it thereafter — with no error and no way to notice until totals started rendering as "NaN". `Ledger.post()`, the single chokepoint every money movement passes through, now rejects any non-finite amount outright.
2. **Negative ledger amounts were accepted.** These balance arithmetically while being meaningless in double-entry. Now rejected at the same chokepoint. (Reversals are, and always were, posted as real opposite-side entries — never negative amounts — so nothing legitimate is affected.)
3. **Advances could be applied or refunded far beyond what a party actually held**, driving the balance deeply negative (testing produced a balance of -99,799), which then displayed as a phantom balance everywhere. Both operations now validate against the real held balance.
4. **Zero and negative advance/payment amounts were silently recorded.** Now rejected.
5. **A corrupted backup file crashed the import outright.** If any table in the file was something other than an array (a string, a number — possible from a hand-edited or partially-written file), the import threw immediately. All import paths now run untrusted tables through a shared `asRows()` guard.

**Also hardened:** every UI call site that can now legitimately be rejected by the engine catches that rejection and shows a clear message instead of failing silently. The split-payment path specifically reports how many legs actually saved before a failure, rather than claiming success for all of them.

**Verified clean (no bugs found):** hostile HTML stored in any text field never executes; every view renders on a fully empty yard and against orphaned records; extreme values (999,999 × 999,999 and sub-cent amounts) and extreme dates (1900, 2999) keep the books balanced; every form opens and handles blank submission without creating anything.

---

## Delivery — Found the REAL cause of the blank Dashboard (the last fix wasn't it)

**Reported:** "still the same" — the previous fix (dead catch blocks in the IndexedDB helpers) didn't actually resolve the blank, stuck Dashboard.

**What was actually wrong:** The real cause was one level deeper. `IDB.open()` had no timeout and no handling for IndexedDB's `onblocked` event at all. If any other connection to an older version of the database is still open — most commonly another browser tab still holding this app open — a version-bumped `indexedDB.open()` call doesn't error and doesn't reject, it just sits there **forever**, waiting for that other connection to close. Nothing throws, so the previous fix (which only caught *thrown* errors) couldn't help — this was a genuine hang, not a crash, and the app just looked stuck loading with no error anywhere.

**What changed:**
- `IDB.open()` now has a hard timeout — if it hasn't settled within 4 seconds, it fails cleanly instead of hanging indefinitely. Combined with last delivery's fix (every IndexedDB helper now correctly treats a failed `open()` as "fall back gracefully"), this means the app will render — with local data if available, or in a degraded-but-visible state if not — rather than freezing on a blank screen.
- That failure is also now shared across all the tables loaded at startup, instead of each one independently re-attempting and re-waiting through its own timeout — so a blocked connection costs a few seconds once, not a compounding delay per table.
- Directly tested by simulating an actual permanently-blocked connection and confirming the app recovers within the timeout, and that a second call afterward fails immediately rather than waiting again.

If this happens again, it's very likely caused by having Yarding open in more than one tab at once — closing the other tab(s) and reloading should resolve it immediately, and now it'll no longer hang indefinitely even if that's not it.

---

## Delivery — Critical fix: found and fixed the cause of a blank, stuck Dashboard

**Reported:** "everything's broken now" — the Dashboard loading with just the header visible and a permanently empty body, no error shown anywhere.

**What was actually wrong:** A real bug in every one of the app's IndexedDB helper functions (`get`, `getAll`, `put`, `putAll`, `clearStore`). Each had a `try/catch` that looked like it would catch a failure — but because the code did `return new Promise(...)` instead of `return await new Promise(...)`, a rejection from inside that promise (for example, `getAll` on a table that doesn't exist yet) never actually reached the `catch` block — it escaped past it entirely. The two new comment tables added recently meant a device could hit exactly that gap while loading data at startup, which could crash the whole startup sequence with no error shown at all, leaving the header rendered but the content area permanently empty.

**What changed:**
- Fixed all five affected IndexedDB helpers — a one-word fix (`await`) each, but the root cause of the crash.
- Added two more layers of defense on top of that root-cause fix, since a bug like this deserves more than a single point of protection: the startup data-loading sequence now treats each table independently (one bad table can't take down the rest, matching how the cloud-sync path already worked), and — this is the big one — **if a screen ever fails to render for any reason, known or not yet discovered, the person now sees an actual error message and a button back to Dashboard, never a silent blank page again.** That last piece is what would have made this specific bug immediately diagnosable from the first report, instead of just "everything's broken" with no further information.
- All three fixes are directly tested, including a test that reproduces the exact original failure mode (calling into a nonexistent table) to confirm it now fails safely instead of crashing.

---

## Delivery — Invoice & payment redesign (lists, tabs, and a new payment detail view)

**Reported:** Screenshots of a standard accounting app's Invoice list, Invoice detail (Details/Payments/Comments tabs, status badge, Balance Due, More Information), Payments Received list, and Payment Receipt detail, with a request to follow that workflow — kept specific to ship dismantling (Yarding's own terms and data, not renamed to match the reference).

**What changed:**
- **Sales/Purchases/Expenses lists** are now filterable card lists (All / Unpaid / Overdue) instead of a single wide table, with each card showing the party, date, invoice number, total, balance due, and — for anything overdue — "OVERDUE BY N DAYS" in red, matching the reference.
- **Invoice detail** is now a tabbed view: **Details** (invoice date, the linked party's payment terms, due date, "More Information" showing who recorded it, the item breakdown, subtotal/tax/total/payment made/balance due), **Payments** (every payment actually applied to this invoice), and **Comments** — new, same attributed-note pattern as the recent party detail work. Status badge (PAID/OVERDUE/UNPAID/VOID) and Balance Due are shown prominently at the top. Print, Void (admin), and Record Payment actions all still work from here.
- **Payments list** is now a filterable card list (All / Received / Paid out).
- **Payment detail is an entirely new view** — Yarding had no way to see a single payment's own detail page before this, only the list. Shows amount, date, account, the specific invoice it was applied to (with a link straight to that invoice), and who recorded it. Void still works from here too.
- New `invoice_comments` table, alongside the `party_comments` table added last time (schema + IndexedDB migration, additive and safe).

---

## Delivery — Party detail redesign (Details / Transactions / Comments)

**Reported:** A set of screenshots of a standard accounting app's Customer detail screen (a summary bar, Details/Transactions/Comments tabs, contact quick-actions, collapsible info sections) and its New Customer form, with a request to match that design. "Party" stays as the term throughout — not renamed to "Customer."

**What changed:**
- **Parties could not be edited at all before this** — only created. Fixed: `Forms.partyForm` now supports both, pre-filling every field when editing.
- Added a **Payment Terms** field per party (Due on Receipt / Net 15/30/45/60), matching the reference form. New parties default to Due on Receipt.
- The party form is reorganized into "Party Information" and "Other Details" sections, matching the reference layout.
- Replaced the old plain "Statement" modal with a genuine tabbed **party detail view**: **Details** (contact info with tappable Call/Email, Receivables & Payables, Payment Terms), **Transactions** (every invoice with a real PAID/OVERDUE/UNPAID status and a type filter), and **Comments** — a new feature entirely, letting anyone leave a timestamped, attributed note on a party's record.
- New `party_comments` table (schema + IndexedDB migration, both additive and safe on existing data).

---

## Delivery — Banking Overview redesign, and a real fix for a silent state bug

**Reported:** A screenshot of a standard accounting app's Banking Overview (account/period filters, a prominent total, a collapsible trend chart, an active-accounts list) with a request to build something similar.

**What changed:**
- Banking now has an Account filter (All Accounts or one specific account) and a Period filter (last 7/30/90 days, this month, this year), a prominent total scoped to whatever's selected, and a "Banking Summary" trend chart with a Hide/Show toggle — all matching the reference layout. The trend chart now supports an arbitrary date range and can be scoped to a single account (previously it was always a fixed "all accounts, last 30 days" view on the dashboard only).
- Active Accounts below it is the same account-cards list as before, unchanged.
- **Found and fixed a real, previously-undetected bug while building and testing this**: the app's view-rendering dispatch called each screen's render function in a way that didn't actually bind `this` to `Views`, so any screen that read its own filter/toggle state via `this._something` was silently reading nothing — the state was being *set* correctly but never *read* back. This meant Reports' "Apply" date-range button has likely never actually changed what was displayed, this whole time, and it was never caught because nothing tested it. Fixed at the root (one line in the dispatcher), which fixes every affected screen at once, not just the new Banking one — and added a regression test for the Reports date range specifically, since that's the one confirmed to have been silently broken.

---

## Delivery — Dashboard redesign to match a reference screenshot

**Reported:** A screenshot of a standard accounting app's Dashboard (receivables/payables, overdue counts, a cash flow chart with a year-to-date summary, income vs expense, top expenses breakdown) with a request to build something similar.

**What changed:** Added to the existing Dashboard (which already had cash/receivables/payables KPIs, quick actions, a 30-day cash trend, and a sales-vs-expenses chart):
- **Overdue Invoices** and **Overdue Bills** count cards, tappable through to the Sales/Purchases list.
- A year-to-date cash summary under the existing 30-day cash trend chart — opening cash, incoming, outgoing, and the resulting closing cash, mirroring the reference layout.
- A new **Top Expenses** section — a segmented bar plus a percentage-and-amount breakdown per category, using a new `Charts.stackedBarSVG` (distinct from the donut chart already used in Reports, so the dashboard visually matches what was shown).

---

## Delivery — Full report menu (Financial, Sales, Receivables, Expenses, Payables)

**Reported:** A screenshot of a standard accounting app's Reports menu, with a request for all those report types.

**What changed:** The Reports page is now organized into the same categories shown — Financial Reports, Sales, Receivables, Expenses, Payables, plus Banking for the existing account statement. Added: Cash Flow Statement, Sales by Customer, Sales by Item, Sales by Sales Person, Customer Balance Summary, Vendor Balance Summary, Expenses by Category (as a proper table, alongside the existing chart), Payments Received, Payments Made, and itemized AR/AP Aging Details (the existing Aging Summary stays too). Every new report has its own Print and Export-to-Excel, built on one shared, consistent table-printing format so they all look and behave the same way rather than each being formatted separately. Balance Sheet, Profit & Loss, Trial Balance, and AR/AP Aging Summary already existed and are unchanged, just regrouped under the matching category headers.

---

## Delivery — One-off lines need a real item name, not just a bare description

**Reported:** Selecting "one-off" on an invoice line showed only a "Description" field — no place for an actual item name.

**What changed:** A one-off line now shows a required "Item name" field (exactly like picking or adding a real item does), with "Description" now a separate, always-available, optional field for any extra detail on top of it — whichever of the three ways named the line (one-off, an existing item, or a newly-added one). If extra detail is given, the two combine as "Name — detail"; if not, the description is just the name, same as before. Existing tests that filled in the old single field were updated to match.

---

## Delivery — Fixed a real mobile layout bug, corrected the sales statement style

**Reported:** A screenshot showing the Qty/Unit/Rate/Category row on a sale line crammed into unreadably narrow boxes on a phone, with "Category" wrapping onto two lines and overlapping. Also: the sales statement should be in the same bank-style debit/credit format as the account statement — not styled like a POS receipt, which was a misreading of the earlier request.

**What was actually wrong:** The previous delivery's line-item row used an inline `style="grid-template-columns:..."` to fit six fields in one row. An inline style always wins over a class's media query, so the row's fixed six-column layout could never actually respond to screen width — on a narrow phone it just uniformly shrank every column instead of wrapping, which is exactly what the screenshot shows. The same inline-override pattern existed on the tax row, the split-payment row, and the manual journal-entry row too — all four are now fixed.

**What changed:**
- Every multi-field editable row (invoice lines, tax rows, split-payment rows, journal-entry rows) now uses a flex-wrap layout with a sensible minimum width per field, instead of a fixed grid. Fields naturally reflow onto as many rows as the actual screen width allows — this isn't tied to one specific breakpoint, so it holds up "regardless of the screen," as asked.
- The now-unused fixed-grid CSS class was removed entirely, and a permanent check was added to the layout-audit script confirming that exact pattern can't quietly reappear.
- The sales statement now uses the same formal, ruled bank-statement style as the account statement — Date / Invoice # / Party / Debit / Credit / Balance, with a running total — instead of the narrow POS-receipt look from the previous delivery. Also added an Excel export for it, matching the account statement.

---

## Delivery — New reports, headless-yard settings, sales line redesign, minor fixes

**Reported (a batch of smaller items):**
1. New sale lines should default to "Scrap Sales," not "Other Income."
2. Staff should be able to add a brand-new item right from a sale/purchase line, with it becoming reusable for future sales — plus a unit field (kg/MT/piece/unit/item/Other) alongside qty and rate.
3. An "import module" shortcut on the admin Dashboard.
4. A folder-backup picker, matching the one shown from an earlier, separate app.
5. Staff need to set company logo/name/currency when the yard is headless (no admin) — but Settings should stay fully off-limits to staff whenever an admin actually exists.
6. The default seeded bank account should just be called "Bank Account," not "Main Bank Account," and staff on a headless yard should be able to rename it.
7. More reporting: a daily income/expenses breakdown, a bank-statement-style debit/credit report with daily/weekly/monthly/yearly presets and full itemized detail, a sales statement in the same visual style as the company's POS receipts, and a general pass for layout consistency (no overlapping or cut-off elements anywhere).

**What changed:**
- Sale lines now default their category to Scrap Sales.
- The item field on an invoice line is now a real picker (existing items, or "+ Add new item…"), and whatever's typed there becomes a genuine, reusable `items` record — not just text on one invoice. Each line also has its own unit, with "Other" revealing a field to specify anything not on the list.
- Admin's Dashboard now has a one-tap "Import a module package" shortcut, not just buried in Settings.
- A new `isHeadlessYard()` check (no admin account exists at all) lets a *reduced* Settings page through to staff — company name, logo, currency, and the folder-backup picker only. The full Settings page, and Settings for staff on any yard that actually has an admin, are unaffected.
- Bank account editing (renaming an existing account, not just adding new ones) is now available to staff specifically on a headless yard.
- The default seeded bank account is now named "Bank Account."
- New in Reports: a daily income/expenses table (print + Excel export), a fully itemized account statement with Daily/Weekly/Monthly/Yearly/Custom period presets, opening/closing balance and running balance per transaction (print + Excel export), and a sales statement styled to match the company's own POS receipts (narrow, monospace, dashed rules) rather than the formal ledger-style print used elsewhere.

---

## Delivery — Collision-proof invoice numbering, with a readable per-staff number

**Reported:** Multiple staff work asynchronously and offline, each creating invoices independently, with admin importing everyone's work later. Invoice numbers were generated per-device from a local count, so two staff working offline could — and eventually would — both produce the same number (e.g. both generating `SI-0001`), with no way to tell the resulting records apart once merged.

**What changed — every invoice now gets two identifiers:**
- **A long ID, the one thing the app actually relies on to tell records apart:** `SI-YYMMDD-HHMMSS-{staff initials}-{4-char random}`, generated the moment an invoice is created, with no shared counter and no coordination between devices required. This mirrors the mechanism already proven in the company's POS tool (reviewed directly from its source) — a real, second-precision timestamp plus a random tail is exactly what that system already uses to solve this same problem.
- **A short, friendly number, the one people actually read or write down:** `SI-{staff initials}{customer initials}-{6-digit sequence}` (e.g. `SI-MRMR-000001`) — a running count of that specific staff member's invoices of that kind, with the customer's initials riding along so two different staff's numbers don't look identical. This is never used to distinguish records internally, only to be legible.
- If two different staff happen to reduce to the same two-letter initials, it's quietly logged for admin to notice, rather than silently producing look-alike numbers with no record of it.
- **A one-time migration** brings existing invoices (created before this scheme existed) up to the new format, reassigning real long IDs and correctly sequenced friendly numbers, walked through in true chronological order per staff member. It's driven entirely by checking the actual data each time (does anything still lack a long ID), not a one-shot flag — **a real bug I caught in my own first version**: a flag-based "already migrated, never check again" design would have permanently missed re-migrating an old backup imported later, since a brand-new empty yard marks itself "done" immediately (correctly, since there's nothing to do yet) and a flag has no way to know that changed. Checking live data instead is self-healing regardless of when old-format invoices show up.
- Importing a file whose invoice number collides with an existing (genuinely different) invoice is now flagged clearly, showing both records side by side, rather than silently picking one.
- Added `invoices.long_id` to the schema (migration included, safe to re-run).

---

## Delivery — Prepaid/advance balances surfaced in Sales and Payments

**Reported:** Applying a customer's prepaid balance required going into their party profile first — it should show up right when recording a sale or a payment for them instead.

**What changed:**
- The invoice form now checks the selected party's prepaid balance automatically the moment they're picked (no profile visit needed) and offers to apply some or all of it toward the invoice being created — alongside, not instead of, a normal split payment, so "part advance, part cash" works in one step.
- The standalone "Record payment" form does the same when an outstanding invoice is selected: if that party has a prepaid balance, a banner offers a one-click "Apply prepaid balance" action.
- **Real bug found and fixed while building this** (the same class of issue as the payments/void bug from the previous delivery): voiding an invoice that had a prepaid balance applied to it correctly reversed the ledger entry, but left the underlying advance record marked as still "applied" — permanently under-reporting that party's real available balance afterward. Voiding an invoice now also restores any advance applied to it.

---

## Delivery — Split payments, staff bank accounts

**Reported:** Clients often pay one invoice through multiple methods at once (e.g. part cash, part two different banks), or pay partially now and the rest later — there was no way to represent that. Also, adding a bank/cash account was admin-only, which was too restrictive for staff who needed to set one up on their end.

**What was wrong:** "Paid now" on an invoice was strictly all-or-nothing, tied to exactly one bank account. The standalone "Record payment" form had the same one-account, one-amount limitation.

**What changed:**
- Both the invoice form and the standalone payment form now support multiple payment rows (account + amount each), addable via "+ Add payment method."
- Invoice creation and payment recording were unified onto one code path (`Ledger.recordPayment`), so partial payment, full payment, and split payment all work the same way whether it happens at invoice creation or later.
- Payments belonging to one split event share a `split_group_id` and are marked with a "split" badge wherever payments are listed.
- **Real bug found and fixed in the process:** voiding an invoice that already had payments recorded against it left those payment records active and the invoice's paid total stale. Voiding now also voids every payment tied to that invoice and resets the paid amount to zero.
- Staff can now add bank/cash accounts (editing and archiving existing ones stays admin-only).
- Added `payments.split_group_id` to the schema (migration included, safe to re-run).

---

## Delivery — Supabase AI setup instructions

**Reported:** Wanted a copy-pasteable prompt for Supabase's built-in AI assistant to run the full database setup automatically.

**What changed:** Produced a single, self-contained SQL script (combining fresh-install schema with every migration to date, all idempotent — safe to run on a brand-new project or an existing one) with an instruction wrapper telling the assistant to execute it directly.

---

## Delivery — Removed a stray "rupee" reference

**Reported:** No Indian references should appear anywhere in the app.

**What was wrong:** One line of helper text on the Ship form said "...keeps every rupee traceable to one invoice" — a leftover idiom, not an actual currency assumption anywhere in the code.

**What changed:** Reworded to "keeps every amount traceable to one invoice." Searched the whole file for any other India-specific terms (₹, INR, rupee, lakh, crore, GST, city names) — nothing else found. The app has no hardcoded currency; it always uses whatever symbol is set in Setup.

---

## Delivery — Optional, multi-line, percentage/per-unit tax

**Reported:** Tax should be an optional checkbox, support adding multiple taxes via a "+" button, and each tax should be selectable as a percentage or a per-unit amount.

**What changed:**
- Replaced the old single flat "Tax amount" field with an "Add tax" checkbox (off by default) and dynamic tax rows.
- Each row: a label, a type (percent of subtotal / flat amount per unit sold), and a value.
- The ledger still posts one "Tax Payable" line for the total — the breakdown is for the user's own records and shows on the invoice detail view and the printed invoice.
- Added `invoices.tax_breakdown` (jsonb) to the schema.

---

## Delivery — Staff/admin login redesign, staff-only setups, universal backup access

**Reported (across a few related messages):** Login should ask "Admin or Staff?" explicitly up front. Once a device/person has logged in before, it shouldn't keep asking. A yard set up as staff-only (no admin at all) shouldn't ask the question either, since there's only one possible answer. Also: export/import reportedly "not working."

**What was actually wrong (found by testing with real `.click()` calls instead of calling functions directly, which is what had been hiding this):** A plain view navigation (`UI.navigate`) queues a browser `popstate` event, exactly like a real back-button press does — and that event can arrive *after* a modal has opened. The modal-close listener had no way to tell a stale, leftover navigation event apart from a genuine back press, so it was silently closing brand-new modals (including every import screen, since those all live behind a navigation to Settings) moments after they opened. Fixed by tracking how many of these to expect and ignore.

**Also found:** in a staff-only yard (no admin account), Settings — and therefore every backup/import feature that lived only inside it — was completely unreachable to *everyone*, meaning nobody could ever back up their own data.

**What changed:**
- Login now asks "Admin" or "Staff" explicitly, before the code.
- The code is checked against the role actually chosen, not guessed from whichever one matches.
- A device that's logged in before skips straight to the code box for its last-used role.
- A staff-only yard skips the role question entirely, first login onward.
- "Back up everything (JSON)" is now reachable by everyone from the More menu, regardless of role or Settings access. Restoring a backup still requires Admin, and that's stated plainly next to the button.
- Fixed the popstate/navigation bug described above, and stress-tested it with rapid, realistic click sequences to confirm it holds up.

---

## Delivery — "Scrap Items" → "Items," button styling, Banking as a first-class section

**Reported:** The Items label said "Scrap Items" for no reason. Several buttons (the Advances & Prepayments actions) looked like plain clickable text instead of real buttons. Bank/cash accounts were buried inside Settings, but banking is core, everyday functionality.

**What changed:**
- Renamed "Scrap Items" to "Items" everywhere (nav, forms, exports).
- Rebuilt the Advances & Prepayments section into proper bordered cards with real, consistently spaced buttons.
- Added Banking as its own item in the sidebar/More menu, with a KPI, a card per account, and a real transaction register per account (with export) — moved out of Settings entirely.

---

## Delivery — User identity & attribution, import safeguards

**Reported:** This is a multi-person shared-code app; every entry should be traceable to a real person, not just "admin" or "staff." Only admins should be able to import; everyone should be able to export. Imports should preview their effect and ask for confirmation before committing, and should identify who supplied a file if it isn't already identified.

**What changed:**
- Login now asks for a name after the access code (remembered per role as a convenience default), and that name is stamped onto new records (`created_by`) instead of just the role.
- Exports (full backup, module packages) now carry the exporter's name.
- Import entry points are admin-gated at the function level, not just by page access.
- JSON restore, module-package import, and Excel/CSV master-data import all show a preview (what's new, what already matches, and where it will show up in the app) before anything commits.
- An import with no identified exporter requires naming who supplied it before it can proceed.
- A dedicated Activity Log in Settings now actually records logins, voids, connection changes, and device resets.

---

## Delivery — Mobile navigation and UI consistency pass

**Reported:** Several UI inconsistencies — icons stacking above text instead of sitting inline, a misaligned checkbox, a clipped "Dashboard" label in the bottom nav, no close button on modals, hardware/gesture back closing the wrong thing (or nothing).

**What was actually wrong:** A single CSS rule (`svg{display:block}`) with no override on the shared `.icon` class caused any inline `icon + text` pattern outside a flex container to stack vertically instead of sitting side by side — this was the root cause of several unrelated-looking "broken" spots at once, not separate bugs. Similarly, a checkbox was inheriting full-width text-input styling meant for `.field input` generally.

**What changed:**
- Fixed the icon-display bug at its root (one CSS rule), which resolved every instance of it app-wide, not just the reported one.
— Introduced a standard `.check-row` pattern for checkboxes so this class of bug can't recur.
- Added a persistent close (X) button to the modal system.
- Wired real back-button/gesture support into the modal and navigation system (later found to have a deeper timing bug — see the delivery above).
- Fixed the bottom nav's clipped label by giving it real overflow handling instead of a fixed font size with zero breathing room.

---

## Earlier deliveries (foundation)

The initial builds established: the core double-entry accounting engine (Ledger), Supabase + local-only dual-mode operation with automatic offline queueing, the full chart of accounts and seed data, invoices/purchases/expenses/payments/advances, ships and per-ship profit tracking, JSON/Excel backup and restore, module-package exports for segmented workflows, a folder auto-backup option, and the automated test suite (`smoketest.js` for functional correctness, `uicheck.js` for layout regressions) that every subsequent delivery has been checked against.


---

# Part 2: Version log


Every delivery from here forward records the last version that was verified working, so there is always a known-good state to fall back to rather than discovering too late that things have degraded.

**A version is only listed here if, at the moment it was snapshotted:**
- the full smoketest suite passed with **zero** failures,
- the layout audit (`uicheck.js`) reported no issues,
- the file parsed cleanly (`node --check`),
- and the div open/close counts matched.

Snapshots live in `the `versions/` folder next to the app`.

## How to roll back

The app is a single self-contained HTML file, so rolling back is just using the older file — there is no build step, no dependencies, and no migration to undo. Data is stored separately (IndexedDB or Supabase), so an older app version reads existing data fine.

**The one thing to check before rolling back:** if a newer version added a database table or column and you roll back past it, the older code simply won't know about that data — it stays on disk untouched, it just isn't shown. Rolling forward again restores visibility. Nothing is lost by rolling back; the schema changes are all additive.

---

## Versions

> **Numbering note.** Versions used to be numbered by test count (v717, v728…).
> The old 728-check suite was lost when the working environment was reset, so
> its count no longer means anything. Versions are now numbered sequentially;
> v729 continues from v728. The test count is recorded separately.

### v2026.10.02.1 — 2026-10-02 — current known good
- **File:** `index.html` (this delivery). **Rollback point:** the previous `index.html` (APP_VERSION `2026.09.30.2`).
- **Tests:** `smoketest.js` **588 passed, 0 failed** (586 existing + 2 regression checks for the guards below). Layout audit (`uicheck.js`) was not in this environment, so it was not re-run.
- **Phone:** sheet values wrap, bottom bar is inset and translucent, close button is translucent. Suite 588/0.
- **Sheet:** names, IDs and the currency amount no longer clip. Harness sets TextEncoder for jsdom 25.
- **Round:** suite 588/0. Store errors no longer say Supabase only.
- **Cloud:** any PostgREST-compatible store, not only Supabase.
- **Round:** credit notes keep the invoice arithmetic. Suite 588/0.
- **Integrity:** backups are checksummed. A bad file is refused. No CDN load. Books are not uploaded. Suite 588/0.
- **Books:** credit notes, drawings, and depreciation accounts added against IFRS for SMEs conventions. Suite 588/0.
- **Books:** a sale cannot post to expense, and a void cannot be applied twice. Suite 588/0.
- **Search:** the box keeps the first character and the cursor.
- **Sweep:** search keeps the first character; same-day backups do not overwrite.
- **Files:** names are short: INV_00012_02Oct26, receipt_0004_02Oct26, Stmt_ACME_02Oct26.
- **Files:** prints and exports are named INV_, receipt_, or Statement_ plus date, and tagged to the user. Search is fuzzy. Full smoketest passed.
- **Parties:** phone number is the identity; name is the label. Full smoketest passed.
- **Import:** a deleted or voided match is held for confirmation, not silently added again.
- **Import:** repeats inside the file stay out until confirmed; Undo this import is on the result screen.
- **Speed:** party totals are one pass; record lookups are indexed.
- **UI:** figures and words no longer split on any screen; default currency is ৳; samples are neutral.
- **UI:** party table no longer splits words or amounts mid-token; field checkboxes no longer stretch to 48px tall (Add tax, Record a payment now).
- **Fixed:** an edit could shrink an invoice below what was already paid (list showed nothing due, Accounts Receivable was over-credited); `applyAdvance` ignored what the invoice still owed; a sale could be paid money-out, a purchase money-in, a customer advance applied to a bill; a payment or advance could be attached to another party's invoice; a missing bank on an advance or refund crashed; zero quantity, negative tax and a zero total were accepted.
- **Not a schema change.** Rolling back to `2026.09.30.2` is safe. Older builds will simply allow the bad edits again.
- **Dead code:** previously removed names (`restoreInvoice`, `doVoidInvoice`, `accByType`, old importers) still absent. No new unused modules removed.

### v729 — 2026-09-28 — superseded
- **File:** `yarding-v729-known-good.html`. **Rollback point:** `yarding-v728-known-good.html` (the last build before the redesign).
- **Tests:** rebuilt harness `tests/smoketest.js`, **137 checks, 0 failing, identical across 3 runs.** Coverage is *narrower* than the lost 728-check suite (see CHANGELOG); it is now shipped in `tests/` so it cannot be lost again.
- **Design:** adopts the supplied SSO design language (see `DESIGN.md`).
- **Fixed:** undefined `--muted` token; voids skipped the security code and the amendment log; bank- and staff-account edits skipped them too; deleted records leaked into party Transactions, invoice Payments, both statements and Excel exports; the party Statement (and its footer-note setting) had become unreachable; no way to delete a wrong manual journal; no Escape-to-close; viewport disabled pinch-zoom; the "Lock app" button would have been near-invisible on the new light sidebar; help/tour text said "just a reason" when a security code is also required; cloud schema lacked columns the app already writes.
- **Removed (dead):** `Forms.accByType`, `Ledger.restoreInvoice`, `Views.doVoidInvoice`, the "Restores" amendment tab, unused CSS (`.invalid`, `.err`, `.icon.lg`, `.credit-line.on-dark`), four `isAdmin = true` placeholders.
- **Cloud (Supabase) yards:** re-run the migration SQL from Settings once. Until then, editing a ship/item/bank account/advance with a note, or deleting a payment, will queue a sync error. Local-only yards are unaffected.

### v570 — 2026-09-09 — current known good
- **File:** `versions/yarding-v570-known-good.html`
- **Tests:** 570 passing, 0 failing (stable across 3 consecutive runs)
- **Layout audit:** clean
- **Added:** onboarding tour for everyone on first login; "what's new" note after an update; searchable Help; optional Connect-your-AI; staff now have the same access as admins apart from the login codes.
- **Fixed:** `createInvoice` wrote the invoice and its lines *before* posting to the ledger, so a rejected posting left an orphaned invoice — a record showing a total in every list and report with no ledger entries behind it. Also fixed: the onboarding prompt could replace a modal the person already had open, and the Onboarding module was declared in a way its own buttons couldn't reach in a real browser.

### v516 — 2026-09-09 — superseded
- **File:** `versions/yarding-v516-known-good.html`
- **Tests:** 516 passing, 0 failing (stable across 4 consecutive runs)
- **Layout audit:** clean
- **Added:** edit + delete for everyone with mandatory reasons and an admin-only amendment log; flexible spreadsheet intake (any layout, auto-matched columns, full preview); downloadable blank templates.
- **Fixed:** a serious accounting bug present in v465 — voiding an invoice subtracted its amount from income **twice**, so a voided 1,000 sale left income at -1,000 and the P&L reported income that never existed. Any yard that voided invoices on v465 had understated income; upgrading corrects the figures automatically, with no re-entry needed, because the underlying entries were always intact.
- **Note on rolling back:** rolling back to v465 reintroduces that void bug. Prefer rolling forward.

### v465 — 2026-09-09 — superseded (has a known accounting bug)
- **File:** `versions/yarding-v465-known-good.html`
- **Tests:** 465 passing, 0 failing
- **Known bug:** voiding an invoice double-subtracts from income and distorts the P&L (fixed in v516). Kept only as a reference point — **not recommended for use.**
