# Security

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Use the repository's private vulnerability reporting (the **Security** tab, then **Report a vulnerability**) if it is enabled, or contact the maintainers privately. Tell us what you found, how to reproduce it, and what you think the impact is. Only the latest release (v0) is supported.

## What Yarding protects, and what it does not

Yarding keeps accounting books, so it is worth being exact.

**It protects against** a person using the app who is not signed in, and against workers using sections they were not given: sign-in needs an authenticator code (or backup code, or security key), worker permissions are enforced in the functions that write data, and every change is recorded.

**It does not encrypt your data.** The books are stored in the browser's IndexedDB, and the sign-in accounts (including each person's authenticator secret and backup-code hashes) are stored in the same browser, with a copy in local storage. Anyone who can read the browser's storage on that device, for example by using the browser's developer tools or copying the profile folder, can read everything and can read the authenticator secrets. Treat the device like the filing cabinet that holds the books: lock the phone, use a screen lock, and use full-disk encryption.

**Backups contain the same secrets.** JSON backups and the live backup folder include the sign-in accounts so that a full recovery works. Keep them somewhere private.

**Authenticator codes are not a cure for a stolen unlocked device.** An unlocked session stays signed in. Use the lock control, and remove people who leave.

## Cloud sync

If you connect a cloud store, understand the following before you do.

- The SQL script in Settings enables row-level security but then adds an "allow all" policy on every table (`create policy "anon all" ... using (true)`). **Anyone who has the database URL and key can read and change every row, including the sign-in accounts.** The key is stored in the browser of every device that syncs.
- That is why the optional **yard gate** (`server/yard-gate.js`) exists: remote staff get a gate address and a "yard pass" instead of the key. Be clear about what that buys: losing a phone does not leak the database key, and you can change the pass. But **the pass still allows reading and writing every Yarding table**, so it is a shared secret, not a per-user login.
- Run the gate behind HTTPS. The pass travels in a request header.
- If you need per-user cloud access control, replace the "allow all" policies with real ones before you put real data in a hosted database. That is a worthwhile contribution.

## Things we deliberately do

- No telemetry, no analytics, no third-party scripts at start-up, no network request unless you configure cloud sync.
- The only bundled third-party code is a QR code generator (see `THIRD_PARTY_NOTICES.md`).
- Security keys (WebAuthn) are verified in the browser: the challenge, the origin, the site hash, the user-presence flag, the signature and the counter.
- Wrong sign-in codes lock the screen for increasing times, and the lockout survives a reload. Note this is a client-side control: someone with access to the stored data can bypass the screen entirely (see above).
