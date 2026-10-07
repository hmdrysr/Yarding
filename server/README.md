# Yard gate

A small Node.js proxy (no dependencies) for the optional cloud sync. It keeps the **database key on one machine** and gives remote staff a **yard pass** instead.

```
phone  --(yard pass)-->  yard gate  --(database key)-->  Supabase / PostgREST store
```

## Run it

```bash
YARD_UP=https://xxxx.supabase.co \
YARD_KEY=<the database key> \
YARD_PASS=<a long random pass> \
node server/yard-gate.js
```

Make a pass with `openssl rand -base64 24`. In Yarding, choose the staff connection option in setup or Settings, enter the gate's address and the pass.

| Variable | Meaning |
|---|---|
| `YARD_UP` | the store's base URL |
| `YARD_KEY` | the database key (stays on this machine) |
| `YARD_PASS` | the pass staff use (at least 12 characters recommended) |
| `PORT` | default 8787 |
| `YARD_ORIGIN` | comma-separated list of allowed web origins (default: any) |
| `YARD_MAX_BODY` | maximum request size in bytes (default 20 MB) |

## What it does

- Accepts only `GET`, `HEAD`, `POST`, `PATCH` and `DELETE` on `/yard/<table>` for the tables Yarding uses. Every other path is refused, so a pass cannot be used to reach other parts of the store with the key.
- Checks the pass in constant time, and rate-limits repeated wrong passes (10 a minute per address).
- Answers browser CORS preflights and adds CORS headers (including to error responses, so the browser can show the message).
- Passes through only a safe `Prefer` header, and caps the request size.

## What it does not do

- **It is not a user login.** Anyone with the pass can read and write every Yarding table, including the sign-in accounts. It stops the database key leaking from a lost phone; it does not give you per-person cloud permissions.
- It does not terminate HTTPS. Put it behind a reverse proxy (Caddy and nginx both make this a few lines) so the pass is not sent in clear text.
- It keeps its rate-limit counters in memory.

Tests: `node server/gate.test.js`.
