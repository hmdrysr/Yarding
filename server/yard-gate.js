#!/usr/bin/env node
/*
 * Yard gate: a tiny proxy so remote staff never hold the database key.
 *
 *   The database key stays on this machine. A remote device is given only this gate's address and a
 *   "yard pass". The gate checks the pass, then forwards ONLY table requests to the PostgREST-compatible
 *   store (Supabase, self-hosted PostgREST, ...) using the key.
 *
 *   YARD_UP=https://xxxx.supabase.co YARD_KEY=<database key> YARD_PASS=<staff pass> node yard-gate.js
 *
 * Optional:  PORT=8787   YARD_ORIGIN=https://your-app.example (comma-separated; default: any origin)
 *            YARD_MAX_BODY=20000000 (bytes)
 *
 * What it will and will not do (see ../SECURITY.md):
 *   - it forwards only  /yard/<table>  for the tables Yarding uses, with GET/HEAD/POST/PATCH/DELETE;
 *   - it never forwards any other path, so a pass cannot be used to reach other endpoints with the key;
 *   - it answers browser CORS preflights, rate-limits wrong passes, and caps request size;
 *   - the pass is NOT a user login: whoever holds it can read and write every Yarding table.
 *   Run it behind HTTPS (a reverse proxy such as Caddy or nginx); the pass travels in a header.
 */
'use strict';
const http = require('http');
const crypto = require('crypto');

const TABLES = new Set(['accounts', 'parties', 'ships', 'items', 'bank_accounts', 'invoices', 'invoice_lines', 'transactions',
  'transaction_lines', 'payments', 'advances', 'audit_log', 'party_comments', 'invoice_comments', 'amendments', 'staff_accounts',
  'import_batches', 'reconciliations', 'settings']);
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']);

function createGate(cfg) {
  const up = String(cfg.up || '').replace(/\/+$/, '');
  const key = cfg.key || '';
  const passHash = crypto.createHash('sha256').update(String(cfg.pass || '')).digest();
  const maxBody = Number(cfg.maxBody) || 20000000;
  const origins = cfg.origins && cfg.origins.length ? cfg.origins : null;
  const fails = new Map();     // ip -> {n, t}

  const json = (res, status, message, extra) => { res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, extra || {})); res.end(JSON.stringify({ message })); };
  const cors = (req) => {
    const o = req.headers.origin, h = { 'Vary': 'Origin' };
    if (!o) return h;
    if (origins && !origins.includes(o)) return h;
    h['Access-Control-Allow-Origin'] = origins ? o : '*';
    h['Access-Control-Allow-Headers'] = 'x-yard-pass, content-type, accept, prefer';
    h['Access-Control-Allow-Methods'] = 'GET, HEAD, POST, PATCH, DELETE, OPTIONS';
    h['Access-Control-Expose-Headers'] = 'content-range';
    h['Access-Control-Max-Age'] = '600';
    return h;
  };
  const passOk = (given) => {
    const g = crypto.createHash('sha256').update(String(given || '')).digest();
    return crypto.timingSafeEqual(g, passHash);          // constant-time; both sides are 32 bytes
  };
  const tooManyFails = (ip) => { const f = fails.get(ip); return !!(f && f.n >= 10 && Date.now() - f.t < 60000); };
  const noteFail = (ip) => { const f = fails.get(ip); if (!f || Date.now() - f.t >= 60000) fails.set(ip, { n: 1, t: Date.now() }); else { f.n++; } };

  return http.createServer(async (req, res) => {
    const ch = cors(req);
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, ch); res.end(); return; }          // preflight carries no pass by design
      const ip = req.socket.remoteAddress || '?';
      if (tooManyFails(ip)) return json(res, 429, 'Too many wrong passes. Wait a minute.', ch);
      if (!passOk(req.headers['x-yard-pass'])) { noteFail(ip); return json(res, 401, 'Yard pass refused', ch); }
      if (!METHODS.has(req.method)) return json(res, 405, 'Method not allowed', ch);
      // Only /yard/<table> is forwarded. Anything else (dot segments, encoded slashes, other endpoints) is refused outright.
      let u; try { u = new URL(req.url, 'http://gate.local'); } catch (e) { return json(res, 400, 'Bad request', ch); }
      const m = /^\/yard\/([a-z_]+)$/.exec(u.pathname);
      if (!m || !TABLES.has(m[1])) return json(res, 404, 'Not found', ch);
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > maxBody) return json(res, 413, 'Request too large', ch); chunks.push(c); }
      const body = Buffer.concat(chunks);
      const prefer = /^[a-z=,\- ]{0,80}$/i.test(req.headers.prefer || '') ? (req.headers.prefer || 'return=minimal') : 'return=minimal';
      const noBody = req.method === 'GET' || req.method === 'HEAD';
      const r = await fetch(up + '/rest/v1/' + m[1] + u.search, {
        method: req.method,
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Accept: 'application/json', Prefer: prefer },
        body: noBody ? undefined : body
      });
      const text = await r.text();
      const h = Object.assign({ 'Content-Type': 'application/json' }, ch);
      const range = r.headers.get('content-range'); if (range) h['content-range'] = range;
      res.writeHead(r.status, h);
      res.end(req.method === 'HEAD' ? undefined : text);
    } catch (e) {
      if (!res.headersSent) res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, ch));
      res.end(JSON.stringify({ message: 'The yard gate could not reach the store.' }));
    }
  });
}

module.exports = { createGate };

if (require.main === module) {
  const cfg = { up: process.env.YARD_UP, key: process.env.YARD_KEY, pass: process.env.YARD_PASS, maxBody: process.env.YARD_MAX_BODY,
    origins: (process.env.YARD_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean) };
  if (!cfg.up || !cfg.key || !cfg.pass) { console.error('Set YARD_UP, YARD_KEY and YARD_PASS'); process.exit(1); }
  if (String(cfg.pass).length < 12) console.warn('Warning: the yard pass is short. Use a long random one (for example: openssl rand -base64 24).');
  const port = process.env.PORT || 8787;
  createGate(cfg).listen(port, () => console.log('Yard gate on ' + port));
}
