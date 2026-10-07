# Adapting Yarding to a different business

This repository is, and stays, about **shipyard accounting**. But a shipyard is one set of labels, one chart of accounts and one extra concept (the "ship") sitting on top of a general engine. If you run something else (a workshop, a contractor, a trading company, a farm, a small practice), you can fork the project and change those few things. This guide says exactly where they are.

If you would rather have an AI coding assistant do the work, use [AI_PROMPTS.md](AI_PROMPTS.md), which is built on this guide.

> Make your adaptation a **fork** with its own name, and keep this repository's purpose clear. Pull requests here should be about shipyards. Improvements to the general engine (ledger, safety, imports, phone layout) are welcome here and will reach your fork when you merge.

---

## 1. What is general and what is shipyard-specific

**General, and you should not need to touch it:** the double-entry ledger and reports, invoices, payments, advances, parties, items, the amendment log, sign-in, backups and safety, spreadsheet import and export, similar-name merging, bank accounts and reconciliation, the period lock.

**Shipyard-specific:**

| What | Where in `index.html` (search for this) |
|---|---|
| App name, page title, "Yard" wording | `<title>`, the setup screen (`Company / yard name`), Help topics (`HELP_TOPICS`), the walkthrough (`Onboarding`, its `steps:`), the credit line (`injectAll`) |
| Chart of accounts | `ACCOUNTS_SEED` |
| Starter items and units | `ITEM_SEED`, and the unit lists (`'MT'`, `'PC'`, `'LOT'`, `'LITRE'`, `'KG'`) |
| The "ship" concept: a vessel being bought, dismantled and sold | table `ships`; `ship_id` on invoices and items; `Forms.shipForm`; `Ledger.shipProfit`; the `ships` nav key and module; "Ships" labels; `Match.LABEL` and `Match.REFS`; the Ships sheet in the spreadsheet workbook (`Importer.COLS.ships`, `SHEET_NAMES`) |
| Ship fields | `imo`, `ldt`, `purchase_price`, `purchase_date`, `beaching_date`, `status` |
| Document words | `docLabel` ("Sales invoice", "Purchase bill", "Expense voucher"); number prefixes in `invoicePrefix` (`SI`, `PI`, `EX`) |
| Default currency | the setup screen's `s-currency` field, and the fallbacks next to it |
| Sample data | placeholders such as `e.g. HYC Yards Ltd`, `HYC Metals`, `Hamid Yasir`, the invoice preview, and the workbook's example rows (`Importer.workbook`) |
| Seeded default categories used by the importer | `Scrap Sales`, `Ship Purchase Cost`, `Fuel & Utilities`, `Other Expense` |

---

## 2. Three levels of change

Pick the smallest one that does the job. Each level includes the one before.

### Level 1: labels, chart of accounts, items (an afternoon; safe)

1. **Rename the product.** Change the `<title>`, the setup and login headings, the credit line, the Help and walkthrough text, and the file names that start with `yarding-` (backups, templates). Search for `Yarding` and `yard`.
2. **Replace the chart of accounts** in `ACCOUNTS_SEED`. Each entry is `{code, name, type}` with type `asset`, `liability`, `equity`, `income` or `expense`. **Keep these names**, because the code looks them up by name (or change the lookups to match):
   `Cash on hand`, `Bank Account`, `Accounts Receivable`, `Accounts Payable`, `Tax Payable`, `Customer Advances`, `Vendor Advances (Prepaid)`, `Sales returns`.
   The importer and the workbook template also default to `Scrap Sales`, `Ship Purchase Cost`, `Fuel & Utilities` and `Other Expense`; rename them in the importer's `defaultCat` and the example rows, or keep accounts with those names.
   `Opening Balance Equity` is created on demand and should stay.
3. **Replace `ITEM_SEED`** with your products or services, and fix the unit lists (`MT` means metric tonnes here).
4. **Set the default currency** and the sample names and placeholders.
5. **Change the storage names** (see section 5) so your fork never collides with the original.
6. **Run the tests**, then fix the expectations that mention the old words (section 6).

### Level 2: repurpose the "ship" (a day; moderate)

The ship is a general "thing we track profit against": a job, a project, a vehicle, a batch, a field, a case. Most businesses want one.

**Cheapest and safest: relabel only.** Keep the internal names (`ships`, `ship_id`, `Ledger.shipProfit`) and change what people see: "Ship" to "Job", "Ships" to "Jobs", and so on, in the nav, the forms, the lists, the reports, the import workbook headings, the Help text and the module list. Because stored data and the cloud schema keep their old names, **existing data and backups keep working**. This is what we recommend.

Then adjust the ship's fields in the form (`Forms.shipForm`), the list and the import sheet. Hide the ones you do not need (`imo`, `ldt`, `beaching_date` are shipyard-only) and add yours. A new optional field can live on the record without any migration. If you add a column that must sync to a cloud store, add it to **both** SQL scripts in the file and to the test that checks them.

**Only for a brand-new product with no existing data:** rename the table everywhere (IndexedDB store, SQL, `ship_id`, import sheet, tests). It is a large, mechanical change with many places to miss; do it with search and replace, one term at a time, running the tests after each. Do not do this for data people already have.

### Level 3: new behaviour (a week and up)

New reports, new document types, stock control, payroll, multi-currency, multi-company. Read [ARCHITECTURE.md](ARCHITECTURE.md) and [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md) first. Every new write path must be all-or-nothing, permission-checked in the function (not only in the form), recorded in the amendment log, covered by a failure-injection test, and checked on a phone.

---

## 3. What Yarding does not do (decide before you adapt)

No stock or inventory valuation (items are labels, not quantities on hand), no payroll, no multi-currency, no multi-company in one set of books, no tax filing, no point of sale. If your business needs one of these, you are in Level 3 territory, or another tool is the better fit. A restaurant or a shop till is a poor match.

## 4. Starting points for common businesses

| Business | "Ship" becomes | Parties | Items | Account ideas | Watch for |
|---|---|---|---|---|---|
| Ship recycling or scrap dealer (the original) | Vessel or lot | Buyers, sellers | Scrap grades | Scrap sales, vessel purchase cost, dismantling labour | Nothing: this is the shipped configuration |
| General contractor, renovator | Job or site | Clients, subcontractors | Labour, materials, equipment hire | Contract income, subcontractor cost, materials, equipment hire | Progress billing and retainage are not supported |
| Auto or machine workshop | Vehicle or work order | Customers, parts suppliers | Labour hours, parts | Service income, parts income, parts cost | No parts stock; record purchases as expenses |
| Trading or wholesale | Shipment or consignment (or remove) | Customers, suppliers | Products | Sales, cost of goods, freight | No inventory valuation; cost of goods is whatever you post |
| Farm or fishing operation | Field, season or boat | Buyers, input suppliers | Crops or catch | Produce sales, seed and feed, fuel, labour | No biological-asset accounting |
| Small professional practice | Case or matter | Clients | Services | Fees, disbursements | Client-money (trust) accounting is not supported |
| Small manufacturer | Work order or batch | Customers, suppliers | Products, materials | Sales, materials, labour, overhead | No bill of materials or stock |

## 5. Use your own storage names

If your fork is hosted on the same domain as another Yarding (for example two GitHub Pages sites under one account), the browser gives both the **same** storage, and they would read and overwrite each other's books. Before anyone enters data:

- Change the IndexedDB name `yarding_store` (search for `yarding_store`).
- Change the local storage key prefix `yarding_` (config, session, auth cache, accounts mirror, lockout, outbox, counts, last backup, onboarding and what's-new keys, the module-preference and last-user keys, and the not-duplicate list). A single search and replace of the prefix does it.
- Change the BroadcastChannel name (`yarding-books-`) and the backup file prefixes (`yarding-auto-`, `yarding-live-`, `yarding-snapshot`).

## 6. Update the tests

`tests/smoketest.js` checks real behaviour, and some checks mention shipyard words (account names, "Ships" screens, the sample data). After changing labels, run `npm test` and fix the expectations that fail because of the new words, not because of broken behaviour. **Never delete a failing test to get green.** If a test fails for a reason you do not understand, you have found something worth understanding.

Then check the screens by hand at 320, 360 and 390 pixels wide: longer or shorter labels can clip.

## 7. Checklist

- [ ] New name everywhere users can see it (title, headings, Help, walkthrough, credit line, file names)
- [ ] Chart of accounts replaced; the required account names kept (or the lookups changed)
- [ ] Items and units replaced
- [ ] The ship concept relabelled (Level 2) and its fields trimmed or extended
- [ ] Sample data and placeholders are made up and neutral; no real people, businesses, phone numbers or keys
- [ ] Storage names changed (section 5)
- [ ] Workbook template and import sheets use the new words
- [ ] `npm run test:all` is green
- [ ] Every screen checked on a phone-sized screen, with the keyboard open
- [ ] A backup taken, restored into an empty browser profile, and checked
- [ ] README, licence and credits updated for your fork

## 8. Do not change these without a very good reason

- The ledger entries' shape and the rule that every transaction balances.
- UUID identifiers and the `deleted`/`voided` flags (nothing is hard-deleted).
- The all-or-nothing wrapper, the snapshot-before-bulk-change habit and the integrity check.
- The amendment log and reason prompts.
- The permission checks inside the engine.
- Backward compatibility with existing data: add optional fields, never rename old ones.
