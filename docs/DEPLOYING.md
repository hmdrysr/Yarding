# Running and deploying Yarding

Yarding is a static file. Anything that can show you `index.html` can run it.

## 1. Just open the file

Double-click `index.html`. Your data lives in that browser's storage for that file location. Opening the same file from a different folder, a different browser or a different address starts with an empty set of books. Keep it in one place.

Limits when it is opened as a plain `file://` page: no hardware security keys, and the live backup folder needs a Chromium browser.

## 2. GitHub Pages (recommended for phones)

Serving it over `https://` gives you the best result: security keys work, it is easy to open on every phone, and updates are one commit.

1. Put `index.html` and `.nojekyll` in a repository.
2. In the repository's **Settings, Pages**, publish from the branch.
3. Open the address on each phone. Your books are still stored on each phone, not on GitHub.

Pages serves your *code*, not your *data*. Do not put backups or real books in a public repository.

If you use security keys, always open the app from the same address: a key is tied to the site name.

## 3. On your own network

Any small web server on a computer in the office works (`python3 -m http.server`, nginx, Caddy). Phones on the same network open `http://that-computer:8000/index.html`. Note that browsers refuse security keys on plain `http://` and on bare IP addresses, but everything else works.

## 4. On a phone, like an app

Open the address in the phone's browser and use "Add to Home Screen". It then opens full-screen. A native Android wrapper (a WebView around the same file) is a good contribution; the main things such a wrapper must provide are file saving, printing, the clipboard and the back button, because a WebView does not give you those.

## Backups, before anything else

- **Settings, Backup:** download a JSON backup and keep it somewhere that is not this device. It carries a checksum, and a file that fails it is refused.
- **Live backup folder** (Chrome or Edge on a computer): choose a folder once, and Yarding keeps readable per-table files plus dated snapshots in it.
- Phones cannot write to a folder, so export a JSON backup regularly and keep it in cloud storage or send it to yourself.

Clearing the browser's data, uninstalling the browser or resetting the phone deletes the books on that device.

## Optional: cloud sync

Settings has the connection form and the SQL script for a Supabase project (or any PostgREST-compatible store). Read [SECURITY.md](../SECURITY.md) first. For staff phones, run the [yard gate](../server/README.md) so staff never hold the database key.

## Upgrading to a newer version of the file

Replace `index.html` with the new one and reload. Your data is stored separately and is opened by the new version. The first thing the app does on start is an integrity check. Take a backup before you upgrade, and keep the previous `index.html` so you can go back.
