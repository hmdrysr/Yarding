// Self-contained test for the yard gate: no dependencies, no network. Run: node server/gate.test.js
'use strict';
const http = require('http');
const { createGate } = require('./yard-gate.js');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL —', name, extra === undefined ? '' : extra); } };
const call = (port, method, path, headers, body) => new Promise((resolve, reject) => {
  const r = http.request({ host: '127.0.0.1', port, method, path, headers }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d })); });
  r.on('error', reject); if (body) r.write(body); r.end();
});
(async () => {
  const seen = [];
  const store = http.createServer((req, res) => { let d = ''; req.on('data', c => d += c); req.on('end', () => { seen.push({ method: req.method, url: req.url, key: req.headers.apikey, auth: req.headers.authorization, prefer: req.headers.prefer, body: d }); res.writeHead(200, { 'Content-Type': 'application/json', 'content-range': '0-0/42' }); res.end('[{"id":"1"}]'); }); });
  await new Promise(r => store.listen(0, r)); const sp = store.address().port;
  const gate = createGate({ up: 'http://127.0.0.1:' + sp, key: 'SERVICE-KEY', pass: 'correct-horse-battery', maxBody: 1000, origins: ['https://app.example'] });
  await new Promise(r => gate.listen(0, r)); const gp = gate.address().port;
  const P = { 'x-yard-pass': 'correct-horse-battery' };

  let r = await call(gp, 'GET', '/yard/parties?select=*&limit=5', P);
  ok('a valid pass reads a table', r.status === 200 && seen.at(-1).url === '/rest/v1/parties?select=*&limit=5');
  ok('the database key is added by the gate, never by the caller', seen.at(-1).key === 'SERVICE-KEY' && seen.at(-1).auth === 'Bearer SERVICE-KEY');
  ok('Content-Range is passed back for counts', r.headers['content-range'] === '0-0/42');
  r = await call(gp, 'GET', '/yard/parties', { 'x-yard-pass': 'wrong' }); ok('a wrong pass is refused', r.status === 401 && !/SERVICE-KEY/.test(r.body));
  r = await call(gp, 'GET', '/yard/parties', {}); ok('no pass is refused', r.status === 401);
  const n0 = seen.length;
  for (const bad of ['/yard/../../auth/v1/admin/users', '/yard/%2e%2e/%2e%2e/auth/v1/admin/users', '/yard/parties/../../auth', '/yard/parties%2f..%2f..%2fauth', '/yard/', '/yard', '/rest/v1/parties', '/auth/v1/admin/users', '/yard/pg_catalog', '/yard/secrets', '/yard//parties', '//yard/parties']) {
    const x = await call(gp, 'GET', bad, P); ok('path refused: ' + bad, x.status === 404 || x.status === 400, x.status);
  }
  ok('none of those reached the database', seen.length === n0);
  r = await call(gp, 'PUT', '/yard/parties', P, '{}'); ok('an unsupported method is refused', r.status === 405);
  r = await call(gp, 'POST', '/yard/parties', Object.assign({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, P), '[{"id":"x"}]');
  ok('upserts pass through with their Prefer header and body', r.status === 200 && seen.at(-1).method === 'POST' && seen.at(-1).prefer === 'resolution=merge-duplicates,return=minimal' && seen.at(-1).body === '[{"id":"x"}]');
  r = await call(gp, 'POST', '/yard/parties', Object.assign({ Prefer: 'return=representation; evil="1"' }, P), '[]'); ok('a strange Prefer value is replaced, not forwarded', r.status === 200 && seen.at(-1).prefer === 'return=minimal');
  r = await call(gp, 'POST', '/yard/parties', P, 'x'.repeat(2000)); ok('an oversized body is refused', r.status === 413);
  r = await call(gp, 'PATCH', '/yard/invoices?id=eq.7', P, '{"status":"void"}'); ok('filters pass through on PATCH', r.status === 200 && seen.at(-1).url === '/rest/v1/invoices?id=eq.7');
  r = await call(gp, 'DELETE', '/yard/invoices?id=eq.7', P); ok('DELETE works with a filter', r.status === 200 && seen.at(-1).method === 'DELETE');
  r = await call(gp, 'OPTIONS', '/yard/parties', { Origin: 'https://app.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'x-yard-pass' });
  ok('a browser preflight is answered without a pass', r.status === 204 && r.headers['access-control-allow-origin'] === 'https://app.example' && /x-yard-pass/.test(r.headers['access-control-allow-headers']));
  r = await call(gp, 'OPTIONS', '/yard/parties', { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' }); ok('an origin that is not allowed gets no CORS permission', !r.headers['access-control-allow-origin']);
  r = await call(gp, 'GET', '/yard/parties', Object.assign({ Origin: 'https://app.example' }, P)); ok('real responses carry CORS headers and expose Content-Range', r.headers['access-control-allow-origin'] === 'https://app.example' && /content-range/.test(r.headers['access-control-expose-headers']));
  r = await call(gp, 'GET', '/yard/parties', { 'x-yard-pass': 'nope', Origin: 'https://app.example' }); ok('even a refusal carries CORS headers so the browser can show the message', r.status === 401 && r.headers['access-control-allow-origin'] === 'https://app.example');
  for (let i = 0; i < 12; i++) await call(gp, 'GET', '/yard/parties', { 'x-yard-pass': 'guess' + i });
  r = await call(gp, 'GET', '/yard/parties', P); ok('repeated wrong passes are rate-limited (even the right pass waits)', r.status === 429);
  store.close(); gate.close();
  const dead = createGate({ up: 'http://127.0.0.1:9', key: 'k', pass: 'p' }); await new Promise(r => dead.listen(0, r));
  r = await call(dead.address().port, 'GET', '/yard/parties', { 'x-yard-pass': 'p' }); ok('an unreachable store gives a clear 502, not a crash', r.status === 502 && /could not reach/.test(r.body)); dead.close();
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
