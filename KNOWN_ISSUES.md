# Known issues (v0)

Everything found in the pre-release review has been fixed (see **Fixed in v0** in the [CHANGELOG](CHANGELOG.md)). Nothing on the list below can make a figure wrong. These are limits to be aware of, and good places to contribute.

## Limits

- **An invoice with a credit note cannot be edited.** Void it and enter a corrected one, or post another credit note. Carrying a credit through an edit would be a good contribution.
- **A credit note is refused for an invoice dated inside a closed period.** Reopen the books first (administrator). Otherwise a closed month would move.
- **A credit note also lowers the original invoice's total.** It is posted as its own entry dated today, and the invoice record shows the reduced figures. Reports built from invoices for the invoice's month show the lower amount; the profit and loss shows the credit in the month it was posted. That timing difference is normal and the books always balance.
- **Restoring a backup never deletes.** It adds missing records and, if you tick the box on the review screen, replaces records that differ. It cannot remove a record that is not in the backup.

## Not verified

Firefox, Safari (including iPhone), a physical phone, a real hardware security key, a real cloud database and a real live-backup folder were not tested. The layout audit in CI (`layout` job) has been run locally but not yet on GitHub.

## Development notes

- Sign-in controls who can use the app. It does not encrypt the data stored in the browser. See [SECURITY.md](SECURITY.md).
- `xlsx` (SheetJS) from npm is an old release with published advisories. It is used only by the test suite; the app reads and writes spreadsheets with its own code.
