# AI prompts: turn Yarding into an accounting tool for any business

Ready-to-paste prompts for an AI coding assistant. They are written for this repository and rely on [ADAPTING.md](ADAPTING.md) (where everything is), [ARCHITECTURE.md](ARCHITECTURE.md) (how it works and what to avoid) and [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md) (the standard to meet).

Read them as a script for a careful human collaborator who happens to be an AI. The point is not to save thinking; it is to keep an assistant from making the classic mistakes in a 750 KB single-file app: rewriting everything, breaking stored data, and declaring victory without running anything.

---

## How to use these

1. **Use an assistant that can open files and run commands in a copy of the repository** (an agentic coding tool or editor integration). The app is one large file (`index.html`, roughly 750 KB), which is too big to paste into most chat windows. If you only have a chat window, see "If you can only paste" at the end.
2. Fork or copy the repository first. Never point an assistant at the only copy of anything.
3. Run `npm install && npm run test:all` yourself first and confirm it is green. That is your baseline.
4. Fill in the **Business profile** below. The more concrete it is, the better the result.
5. Paste **Prompt 1** (interview) if you are not sure what you need, otherwise go straight to **Prompt 2** (the main adaptation).
6. Read every diff. Run the tests yourself. Open the app on a phone.

---

## Business profile (fill this in first)

Copy this into your prompt, replacing the values. Use made-up examples for sample data; never real customers, phone numbers or keys.

```
BUSINESS PROFILE
Business type:            {{e.g. small auto repair workshop}}
Country and currency:     {{e.g. Canada, CAD, symbol $}}
New product name:         {{e.g. Wrench Ledger}}
What we sell:             {{e.g. labour by the hour, parts}}
What we buy:              {{e.g. parts from suppliers, shop supplies, rent, wages}}
The "thing" we track profit against (replaces "ship"):
                          {{e.g. a vehicle / a work order}}   singular: {{Vehicle}}  plural: {{Vehicles}}
Fields that thing needs:  {{e.g. plate number, make, model, odometer}}
Fields to remove:         {{imo, ldt, beaching date}}
Customers and suppliers are called: {{customers / suppliers}}
Units we use:             {{hours, each, litres}}
Chart of accounts:        {{paste our accounts, or say "propose one for this business"}}
Tax:                      {{e.g. 5% GST on sales; we want a tax line on invoices}}
Invoice number prefixes:  {{e.g. INV / BILL / EXP}}
People and permissions:   {{owner = administrator; two front-desk staff get sales, payments, parties}}
Out of scope:             {{stock control, payroll}}
Sample data to use:       {{made-up names, in the style of the existing samples (HYC Yards Ltd, HYC Metals, Hamid Yasir)}}
Language and spelling:    {{e.g. Canadian English}}
```

---

## Prompt 1: interview me first

Use this when you cannot fill in the profile yet.

```
You are helping me adapt an open-source accounting app called Yarding (a single-file, offline-first web app built for shipyards) to a different business. Do not touch any code yet.

Read docs/ADAPTING.md in this repository so you know what can be changed. Then interview me, one short group of questions at a time (no more than four questions per message), to fill in this profile:
business type; country, currency and tax; what we sell and buy; the one "thing" we want to see profit for (a job, vehicle, batch, project, case...) and the fields it needs; what to call customers and suppliers; units; the chart of accounts (offer to propose one if I do not have one); invoice number prefixes; who uses it and what each person may do; what is out of scope; and the spelling convention for the screens.

Rules: use plain language, explain any accounting term in one sentence, and challenge a request if the app cannot do it (it has no stock control, payroll, multi-currency, multi-company or tax filing). When you are done, print the finished profile as a block I can paste into the next step, then stop and wait.
```

---

## Prompt 2: the main adaptation

```
You are a careful senior engineer. Adapt the open-source app in this repository, Yarding, from shipyard accounting into an accounting tool for the business described in the profile at the end. Work in this repository only.

READ FIRST, in this order, before changing anything:
1. docs/ADAPTING.md (where the shipyard-specific parts are; the three levels of change)
2. docs/ARCHITECTURE.md (the module map and the numbered lessons: do not repeat those mistakes)
3. docs/DESIGN-PHILOSOPHY.md (the quality bar)
4. KNOWN_ISSUES.md (existing bugs; do not "fix" them silently as part of this work, and do not make them worse)

THE APP
index.html is the whole application: HTML, CSS and JavaScript in one file, with no build step. It must stay one file. It must work offline from a plain file with no network request at start-up and no CDN script. The books live in the browser's IndexedDB (store name yarding_store). tests/smoketest.js runs the real file in jsdom. Node 20+.

HARD CONSTRAINTS (non-negotiable)
- Backward compatible with existing data: only add optional fields or new stores; never rename or remove stored fields or tables. Prefer relabelling what users see over renaming internals (ADAPTING.md Level 2, "relabel only").
- Never lose or silently change data. Any write touching several records stays inside the existing all-or-nothing wrapper, takes a snapshot first if bulk or destructive, and is permission-checked inside the function, not only in the screen.
- Every modification and deletion stays recorded in the amendment log.
- Keep the double-entry rules: every transaction balances; nothing is hard-deleted.
- Keep the account names that the code looks up by name (listed in ADAPTING.md), or change the lookups consistently.
- Mobile-first: nothing may clip or break mid-word or mid-figure at 320, 360 and 390 px; Close and Back stay reachable; check with the keyboard open.
- If you add a column that must sync to a cloud store, add it to BOTH SQL scripts in the file and extend the test that checks them.
- Use my storage names, not Yarding's (see ADAPTING.md section 5), so this fork never shares browser storage with the original.
- Sample data and placeholders must be made-up and neutral. Never invent or reuse real people, businesses, phone numbers or keys.
- Do not rewrite the file wholesale and do not reformat code you did not change. Make small, targeted edits (search and replace, or patches), one logical change at a time.

HOW TO WORK
Phase 0. Baseline: run `npm install && npm run test:all`. Report the result. Stop if it is not green.
Phase 1. Plan: list every place you will change (use ADAPTING.md section 1 as the checklist, and search the file to confirm each one). List what you will NOT change and why. List anything in my profile the app cannot do. Ask me up to three questions if something is genuinely ambiguous; otherwise continue. Show the plan and wait for my "go".
Phase 2. Branding and words: product name, titles, headings, Help topics, walkthrough, credit line, document labels, number prefixes, currency, spelling convention. Run the tests after this phase.
Phase 3. Chart of accounts and items: replace ACCOUNTS_SEED and ITEM_SEED, units, default categories used by the importer and the workbook template. Run the tests.
Phase 4. The tracked "thing" (formerly "ship"): relabel everywhere users can see it (nav, forms, lists, reports, dashboard, import workbook, Help). Hide fields I do not need, add the fields I listed as optional fields. Do not rename tables or ids. Run the tests.
Phase 5. Storage names and file prefixes: change as ADAPTING.md section 5 says. Run the tests.
Phase 6. Tests: update expectations that fail only because of renamed words. Do not delete or weaken a test to make it pass. If a test fails for an unclear reason, stop and explain it to me.
Phase 7. Verify in a real browser (see below), fix what you find, and re-run everything.
Phase 8. Docs: rewrite README.md for this fork (what it is, who it is for, how to run it), keep the CC0 licence and THIRD_PARTY_NOTICES.md, and add a CHANGELOG entry.

HOW TO VERIFY (do not skip, and do not claim what you did not run)
- `npm run test:all` must be green. Report the exact counts.
- Open index.html in a real browser (or a headless one you can drive) at 320, 360 and 390 px wide, go through setup, add a party, an item, a sale with the new "thing", a payment, then every report and the settings screens. Look for clipped or broken text, labels that still say the old words, and buttons that do nothing.
- Search the whole repository, including tests and docs, for leftover old words: ship, ships, vessel, yard, scrap, dismantl, IMO, LDT, beaching, MT, Yarding. Each remaining hit must be deliberate; list them.
- Export a JSON backup, clear the browser data, restore, and check the totals are identical.

DEFINITION OF DONE
Tests green; no leftover old words except deliberate ones I approved; every screen checked at phone widths; backup and restore round-trips; docs updated; and a final report that says plainly what you changed, what you tested, what you did NOT test, and anything you are unsure about.

Reply style: short, plain, no filler. Lead with what matters. Show diffs, not whole files.

MY BUSINESS PROFILE
{{paste the filled-in profile here}}
```

---

## Prompt 3: relabel the "ship" concept only

A smaller, safer prompt for the part people get wrong most often.

```
In this repository (Yarding, a single-file accounting app, index.html), the concept called "ship" is a general "thing we track profit against". For my business it should be called "{{Job}}" (plural "{{Jobs}}").

Relabel only. Do NOT rename the ships table, the ship_id field, Ledger.shipProfit, IndexedDB stores, SQL tables, import sheet internals or any stored data, because existing data and backups must keep opening.

Change every place a user can see the word: navigation, page titles, forms, list headings, empty states, buttons, toasts and error messages, report headings, the dashboard, Help topics, the walkthrough, the spreadsheet workbook (sheet name, headings, example rows, the read-me), module names in the worker permissions screen, and print templates. Use the right singular and plural, and keep the capitalisation consistent.

Then: remove the shipyard-only fields from the form, list and import sheet ({{imo, ldt, beaching date}}) by hiding them, not deleting stored data; and add {{plate, make, model}} as optional fields.

Prove it: search the whole repository case-insensitively for ship, ships, vessel, IMO, LDT and beaching, and give me the list of remaining hits grouped as (a) internal names I asked you to keep, (b) user-visible text you missed, (c) tests. Fix (b), and update (c) only where the test fails because of the word, never to hide a real failure. Run npm run test:all and report the counts. Check the forms and lists at 320 px wide for clipping. Report what you did not check.
```

---

## Prompt 4: chart of accounts and items

```
In this repository (Yarding), replace the shipyard chart of accounts and starter items with ones for {{business type}}.

1. Read docs/ADAPTING.md section 2 (Level 1, step 2). Some account names are looked up by the code: Cash on hand, Bank Account, Accounts Receivable, Accounts Payable, Tax Payable, Customer Advances, Vendor Advances (Prepaid), Sales returns, plus the importer defaults. Keep them, or change every lookup consistently and show me each one.
2. Propose a chart of accounts of about 20 to 30 accounts for {{business type}} in {{country}}, using ordinary double-entry practice (assets, liabilities, equity, income, expenses), with codes. Explain in one line each why it is there. Wait for my approval before editing.
3. After approval, edit ACCOUNTS_SEED and ITEM_SEED, the unit lists, the importer's default category names, the workbook template's example rows and the Help text that names accounts.
4. Do not change how existing databases are handled: a yard that already has the old accounts must keep working (new accounts are only added to new setups).
5. Run npm run test:all; fix only test expectations that fail because of the new names; report counts and anything you are unsure about.
```

---

## Prompt 5: add a field, a report or a document type

```
In this repository (Yarding), add {{describe the feature in plain language: e.g. an optional "purchase order number" on sales invoices that shows on the printed invoice and in the Excel export}}.

Before coding, read docs/ARCHITECTURE.md and find the nearest existing feature that works the same way. Tell me which one and where it lives. Then follow its pattern exactly rather than inventing a new one.

Requirements:
- New data must be optional and backward compatible. Existing records and backups must open unchanged.
- If it syncs to a cloud store, add the column to both SQL scripts in the file and to the test that checks them.
- Any write is all-or-nothing, permission-checked inside the engine function, and recorded in the amendment log.
- It must be reachable and readable at 320 px, with Close and Back working, and with the keyboard open.
- Add tests: the normal case, a failure injected part-way (nothing changes), a worker without the right permission (refused), and an old record without the field (still works).
- Update the Help text, the Excel/CSV import and export if the data appears there, and the CHANGELOG.

Show me the plan first (files, functions, tests). After I approve, make the smallest change that works. Run npm run test:all and report the counts. List what you did not test.
```

---

## Prompt 6: audit the result

Run this in a fresh session, so the reviewer has not seen the author's reasoning.

```
You are an independent reviewer. Do not change anything unless I say so.

This repository is a fork of Yarding (a single-file offline accounting web app) that was adapted from shipyards to {{business type}}. Read docs/ADAPTING.md, docs/ARCHITECTURE.md and docs/DESIGN-PHILOSOPHY.md. Then check, and report with evidence (file, function, steps to reproduce):

1. Leftovers: user-visible text, tests or docs that still use shipyard words (ship, vessel, yard, scrap, IMO, LDT, beaching, MT, Yarding) or the old sample data.
2. Inconsistent labels: the same concept called two different things on different screens, wrong plural, wrong capitalisation, spelling that does not match {{spelling convention}}.
3. Data safety: any write path that is not all-or-nothing, not permission-checked inside the engine, or not recorded in the amendment log. Any change that would stop an old database or backup from opening.
4. Storage collisions: any storage name still shared with the original app.
5. Accounting: any place where the ledger could stop balancing, where a report can disagree with another, or where a closed period can change.
6. Phone layout: at 320, 360 and 390 px, any clipped text, words or figures broken mid-way, unreachable Close/Back, or controls hidden by the keyboard. You must actually open it in a browser; do not infer this from the code.
7. Tests: run npm run test:all and report the counts; flag any test that was deleted, skipped or weakened.
8. Privacy: any real name, phone number, e-mail, key, URL or business identifier anywhere in the repository, including tests, docs and screenshots.

Give me a table: finding, severity (wrong money / lost data / blocks use / cosmetic), evidence, suggested fix. End with what you could not check.
```

---

## Prompt 7: check the app on a phone

For when you have a real browser the assistant can drive.

```
Open index.html in a browser driven by you, emulating a phone with touch (390 x 780, device scale factor 2), and also at 320 and 360 px wide.

Set the app up from scratch (company, administrator with an authenticator), then visit every screen reachable from the bottom bar and the More menu, and open every pop-up (new sale, new purchase, new expense, payment, party, item, import, settings forms). On each, report: text or numbers that are clipped or broken mid-word; anything wider than the screen; controls that cannot be reached or tapped; the Close and Back buttons not visible; and what happens with the on-screen keyboard open (shrink the visible height to about 300 px). Test the phone's back button: it should close a pop-up first, then go back one screen.

Report each problem with the screen, the width and a screenshot. Do not report what you did not look at.
```

---

## Tips and pitfalls

- **Give the assistant the docs, not just the code.** The numbered lessons in ARCHITECTURE.md are the project's memory. They prevent most of the mistakes an assistant will otherwise make.
- **Ask for plans before edits** for anything that touches money, stored data or permissions.
- **Insist on small edits.** A single 750 KB file invites a full rewrite, and a rewrite is how stored data and subtle rules get lost.
- **Do not accept "all tests pass" without the counts**, and do not accept tests that were changed to pass. jsdom cannot see layout, so a green suite says nothing about phones.
- **Never paste real customer data, keys or backup files into an assistant.** Use the made-up sample data.
- **Review the diff.** You are responsible for what you ship, and it is your books.

## If you can only paste into a chat window

The file is too large to paste whole. Instead:

1. Paste ADAPTING.md and ask the assistant for a plan (Prompt 1 or 2, Phase 1 only).
2. For each phase, copy the relevant section from `index.html` (for example the block starting at `ACCOUNTS_SEED`) and ask for the edited block back.
3. Replace those blocks in the file yourself with your editor, and run `npm run test:all` after every phase.
4. Ask the assistant for search terms to find every leftover old word, and search the file yourself.

It is slower and easier to get wrong, which is why an assistant with file access is recommended.
