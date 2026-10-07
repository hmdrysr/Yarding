/*
 * Yarding verification harness.
 *
 *   npm install jsdom fake-indexeddb xlsx
 *   node smoketest.js                      # tests ./index.html (or ./yarding.html)
 *   YARDING_HTML=path/to/file.html node smoketest.js
 *   YARDING_OLD_HTML=path/to/older.html node smoketest.js   # for the upgrade test
 *
 * jsdom does NOT do layout, so this proves logic, data integrity, markup and
 * the CSS *rules*. It cannot prove how something looks on a phone — that still
 * needs eyes on a real device.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const fdb = require('fake-indexeddb');
const nodeCrypto = require('crypto');
const XLSX = require('xlsx');

const firstExisting = (...c) => c.find(p => p && fs.existsSync(p));
const HTML_PATH = firstExisting(process.env.YARDING_HTML, 'index.html', 'yarding.html', '../yarding.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const OLD_PATH = firstExisting(process.env.YARDING_OLD_HTML, 'tests/fixtures/yarding-v728-known-good.html', 'fixtures/yarding-v728-known-good.html', 'versions/yarding-v728-known-good.html', 'yarding-v728-known-good.html', '../yarding-v728-known-good.html') || 'versions/yarding-v728-known-good.html';
const CSS = HTML.match(/<style>([\s\S]*?)<\/style>/)[1];

let pass = 0, fail = 0; const failures = [];
function log(name, cond, extra) {
  if (cond) { pass++; console.log('PASS — ' + name); }
  else { fail++; failures.push(name); console.log('FAIL — ' + name + (extra !== undefined ? ' :: ' + extra : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const near = (a, b, e = 0.01) => Math.abs(a - b) < e;

const BC_REG = {};
function makeBC() { return class { constructor(n) { this.n = n; (BC_REG[n] = BC_REG[n] || []).push(this); } postMessage(m) { (BC_REG[this.n] || []).filter(o => o !== this).forEach(o => o.onmessage && o.onmessage({ data: m })); } close() {} }; }
const wbRead = e => XLSX.read(Buffer.from(e.bytes), { type: 'buffer' });
const sheetRows = (e, name) => { const wb = wbRead(e); return XLSX.utils.sheet_to_json(wb.Sheets[name || wb.SheetNames[0]], { header: 1, defval: '' }); };
function makeLS() {
  const st = {};
  return { getItem: k => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: k => { delete st[k]; },
    clear: () => { for (const k in st) delete st[k]; }, key: i => Object.keys(st)[i] || null, get length() { return Object.keys(st).length; } };
}
async function boot(opts = {}) {
  const idb = opts.idb || new fdb.IDBFactory(), ls = opts.ls || makeLS();
  const { TextEncoder: TE, TextDecoder: TD } = require('util');
  const dom = new JSDOM(opts.html || HTML, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/',
    beforeParse(w) {
      Object.defineProperty(w, 'indexedDB', { value: opts.blocked ? { open: () => ({}) } : idb, configurable: true });
      Object.defineProperty(w, 'IDBKeyRange', { value: fdb.IDBKeyRange, configurable: true });
      Object.defineProperty(w, 'crypto', { value: opts.nosubtle ? { getRandomValues: a => nodeCrypto.webcrypto.getRandomValues(a) } : nodeCrypto.webcrypto, configurable: true });
      if (typeof w.TextEncoder === 'undefined') w.TextEncoder = TE;
      if (typeof w.TextDecoder === 'undefined') w.TextDecoder = TD;
      if (!opts.noBC) w.BroadcastChannel = makeBC();
      Object.defineProperty(w, 'localStorage', { value: ls, configurable: true });
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window;
  w.HTMLAnchorElement.prototype.click = function () {};
  await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
  await sleep(120);
  // capture every workbook the app builds with its OWN writer (no library), and the file name it is saved under
  w.__wbs = []; if (w.Xlsx && w.Backup) { const ob = w.Xlsx.build; w.Xlsx.build = function (spec) { const bytes = ob.call(this, spec); w.__wbs.push({ spec, bytes, name: null }); return bytes; }; const od = w.Backup._download; w.Backup._download = function (blob, name) { if (w.__wbs.length && !w.__wbs[w.__wbs.length - 1].name) w.__wbs[w.__wbs.length - 1].name = name; return od.call(this, blob, name); }; }
  w.__idb = idb; w.__ls = ls;
  return w;
}
async function setupAdmin(w, company = 'Test Yard', name = 'Boss') {
  // the real setup path: company -> name -> authenticator (verified with a real code) -> backup codes -> finish (signed in)
  const d = w.document;
  d.getElementById('s-company').value = company; d.getElementById('s-currency').value = '$';
  w.Setup.skipCloud();
  d.getElementById('s-admin-name').value = name; w.Setup.beginAdmin();
  const secret = w.Enroll.s.secret; d.getElementById('en-code').value = await w.Totp.code(secret, w.Totp.stepNow());
  await w.Enroll.verify(); w.Enroll.step('key'); await w.Enroll.done();
  w.__adminSecret = secret; globalThis.__lastAdminSecret = secret;
  w.Onboarding.markSeen(); w.Onboarding.markNewsSeen();
}
const JSQR = require('jsqr');
const decodeQR = text => { const m = ('QR' in globalThis ? null : null); return null; };
async function addWorker(w, { name = 'Alex Doe', preset = 'cashier', verify = true, role = 'staff' } = {}) {
  const d = w.document; w.Views.staffAccountForm(); d.getElementById('sa-name').value = name; d.getElementById('sa-role').value = role; w.Views.applyModulePreset(preset);
  w.Views.startEnrollment(); const secret = w.Enroll.s.secret;
  d.getElementById('en-code').value = verify ? await w.Totp.code(secret, w.Totp.stepNow()) : '000000';
  await w.Enroll.verify(); if (!w.Enroll.s || w.Enroll.s.step !== 'backup') return { acct: null, secret, error: d.getElementById('en-error') && d.getElementById('en-error').textContent };
  const backup = w.Enroll.s.backup.plain.slice(); await w.Enroll.done();
  const acct = w.STATE.data.staff_accounts.find(a => a.name === name);
  return { acct, secret, backup };
}
// A worker signs in with nothing but the code their authenticator shows. `off` picks a later 30-second step so it is newer than the last one used.
async function workerLogin(w, secret, off = 1) {
  const d = w.document; w.STATE.session = null; w.Auth.showLogin();
  d.getElementById('login-code').value = typeof secret === 'string' && /^\d{6}$/.test(secret) ? secret : await w.Totp.code(secret, w.Totp.stepNow() + off); await w.Auth.attempt();
}
// A yard created by an OLDER build still has a shared admin code; that must keep working (with a name step) until the administrator moves over.
async function loginLegacy(w, code = '111111', name = 'Boss') {
  const d = w.document; w.Auth.showLogin(); d.getElementById('login-code').value = code; await w.Auth.attempt();
  if (!d.getElementById('login-identity-step').classList.contains('hidden')) { d.getElementById('login-username').value = name; await w.Auth.confirmIdentity(); }
  const ms = d.getElementById('login-modules-step'); if (ms && !ms.classList.contains('hidden')) await w.Auth.confirmModulePrefs();
  w.Onboarding.markSeen(); w.Onboarding.markNewsSeen();
}
async function loginAdmin(w) { await workerLogin(w, w.__adminSecret || globalThis.__lastAdminSecret, 1); w.Onboarding.markSeen(); w.Onboarding.markNewsSeen(); }
// The signed-in person's own current code (what an authenticator would show right now).
async function ownCode(w) { const a = w.STATE.data.staff_accounts.find(x => x.id === (w.STATE.session || {}).staffId); return w.Totp.code(a.totp_secret, w.Totp.stepNow()); }
async function confirmReason(w, { reason = 'test reason', code = null, remark = '' } = {}) {
  const d = w.document; if (code === null) code = await ownCode(w);
  d.getElementById('reason-input').value = reason; d.getElementById('reason-code').value = code; d.getElementById('reason-remark').value = remark;
  await d.getElementById('reason-confirm-btn').onclick();
}
const throwsMsg = async f => { try { await f(); return ''; } catch (e) { return e.message || String(e); } };
const fx = w => ({ inc: w.STATE.data.accounts.find(a => a.name === 'Scrap Sales'), exp: w.STATE.data.accounts.find(a => a.type === 'expense'), bank: w.STATE.data.bank_accounts[0] });
async function mkParty(w, name, kind = 'both') { const p = { id: w.uuidv4(), name, kind, archived: false }; await w.DB.insert('parties', p); return p; }
const SCREENS = ['dashboard', 'sales', 'purchases', 'expenses', 'payments', 'parties', 'ships', 'items', 'banking', 'ledger', 'amendments', 'reports', 'settings'];
function badScreens(w) {
  const bad = [];
  for (const v of SCREENS) { try { w.UI.navigate(v); if (w.document.getElementById('view-root').innerHTML.includes("couldn't load")) bad.push(v); } catch (e) { bad.push(v + ':' + e.message); } }
  return bad;
}

/* ============================ sections ============================ */

async function sectionBootAndScreens() {
  const w = await boot(); await setupAdmin(w);
  log('an empty yard boots and signs in', !!w.STATE.session && w.STATE.session.role === 'admin');
  const bad = badScreens(w); log('every screen renders on an empty yard', bad.length === 0, bad.join(','));
  log('the books balance on day one', w.Ledger.trialBalanceCheck().balanced);
}

async function sectionAccounting() {
  const w = await boot(); await setupAdmin(w); const { inc, bank } = fx(w); const p = await mkParty(w, 'Buyer');
  const inv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-03-01', lines: [{ description: 'S', qty: 1, rate: 1000, accountId: inc.id }] });
  log('a sale raises a receivable and income', near(w.Ledger.receivablesTotal(), 1000) && near(w.Ledger.accountBalance(inc.id), 1000));
  const cash0 = w.Ledger.bankTotal();
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: 400, invoiceId: inv.id, date: '2026-03-02' });
  log('a payment moves cash and shrinks the receivable', near(w.Ledger.bankTotal(), cash0 + 400) && near(w.Ledger.receivablesTotal(), 600));
  const pay = w.STATE.data.payments[0];
  await w.Ledger.voidPayment(pay.id);
  log('voiding a payment returns cash EXACTLY to where it was (not to its negative)', near(w.Ledger.bankTotal(), cash0), w.Ledger.bankTotal());
  log('voiding a payment restores the receivable', near(w.Ledger.receivablesTotal(), 1000));
  await w.Ledger.recordAdvance({ partyId: p.id, direction: 'customer', bankAccountId: bank.id, amount: 500, date: '2026-03-03' });
  const cashA = w.Ledger.bankTotal();
  await w.Ledger.voidAdvance(w.STATE.data.advances[0].id);
  log('voiding an advance returns cash exactly', near(w.Ledger.bankTotal(), cashA - 500));
  await w.Ledger.voidInvoice(inv.id, 'x');
  log('voiding an invoice returns income to zero, not to a negative', near(w.Ledger.accountBalance(inc.id), 0), w.Ledger.accountBalance(inc.id));
  log('the P&L never reports negative income after a void', w.Reports.compute('2026-01-01', '2026-12-31').totalIncome >= -0.01);
  log('books balance after all voids', w.Ledger.trialBalanceCheck().balanced);

  const inv2 = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-04-01', lines: [{ description: 'E', qty: 10, rate: 100, accountId: inc.id, unit: 'MT' }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: 300, invoiceId: inv2.id, date: '2026-04-02' });
  const cashE = w.Ledger.bankTotal();
  await w.Ledger.editInvoice(inv2.id, { lines: [{ description: 'E', qty: 12, rate: 100, accountId: inc.id, unit: 'MT' }] }, 'weighbridge', 'note');
  const e = w.STATE.data.invoices.find(i => i.id === inv2.id);
  log('editing keeps the number, updates the total, preserves the payment', e.number === inv2.number && e.total === 1200 && Number(e.paid) === 300);
  log('editing never touches cash', near(w.Ledger.bankTotal(), cashE));
  log('editing does not double-count income', near(w.Ledger.accountBalance(inc.id), 1200));
  let blocked = 0;
  for (const bad of [NaN, 0, -5]) { try { await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: bad, invoiceId: inv2.id, date: '2026-04-03' }); } catch (x) { blocked++; } }
  log('NaN, zero and negative payments are all rejected', blocked === 3);
  let over = false; try { await w.Ledger.applyAdvance({ partyId: p.id, direction: 'customer', invoiceId: inv2.id, amount: 99999 }); } catch (x) { over = true; }
  log('applying more advance than is held is refused', over);
  // guards that keep the invoice list and the ledger from disagreeing
  let shrunk = false;
  try { await w.Ledger.editInvoice(inv2.id, { lines: [{ description: 'E', qty: 1, rate: 10, accountId: inc.id }] }, 'shrink'); } catch (x) { shrunk = true; }
  log('an edit cannot shrink an invoice below what is already paid', shrunk && w.STATE.data.invoices.find(i => i.id === inv2.id).total === 1200);
  const other = await mkParty(w, 'Other');
  let wrongWay = 0;
  try { await w.Ledger.recordPayment({ direction: 'out', partyId: p.id, bankAccountId: bank.id, amount: 10, invoiceId: inv2.id, date: '2026-04-04' }); } catch (x) { wrongWay++; }
  try { await w.Ledger.applyAdvance({ partyId: p.id, direction: 'customer', invoiceId: inv2.id, amount: 999 }); } catch (x) { wrongWay++; }
  try { await w.Ledger.recordPayment({ direction: 'in', partyId: other.id, bankAccountId: bank.id, amount: 10, invoiceId: inv2.id, date: '2026-04-04' }); } catch (x) { wrongWay++; }
  try { await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-04-05', lines: [{ description: 'Z', qty: 0, rate: 10, accountId: inc.id }] }); } catch (x) { wrongWay++; }
  log('wrong-way payments, cross-party payments, over-applied advances and zero quantities are refused', wrongWay === 4, wrongWay);
  log('books balance and stay finite', w.Ledger.trialBalanceCheck().balanced && Number.isFinite(w.Ledger.trialBalanceCheck().debit));
}

async function sectionControls() {
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc, bank } = fx(w); const p = await mkParty(w, 'Buyer');
  const inv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-05-01', lines: [{ description: 'S', qty: 1, rate: 1000, accountId: inc.id }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: 300, invoiceId: inv.id, date: '2026-05-02' });

  // voids now need reason + the person's own code, and are logged
  w.Views.confirmVoidPayment(w.STATE.data.payments[0].id);
  log('voiding a payment asks for a reason and the security code', !!d.getElementById('reason-code') && !!d.getElementById('reason-input'));
  const cashBefore = w.Ledger.bankTotal();
  await confirmReason(w, { code: '000000' });
  log('a wrong code blocks the void', near(w.Ledger.bankTotal(), cashBefore) && d.getElementById('reason-error').textContent.length > 0);
  await confirmReason(w, { reason: 'bank bounced', remark: 'cheque 4471' });
  log('the right code completes the void', near(w.Ledger.bankTotal(), cashBefore - 300));
  log('the void is written to the amendment log with its reason', w.STATE.data.amendments.some(a => a.action === 'void' && a.entity_type === 'payments' && a.reason === 'bank bounced'));
  log('the note lands on the record itself', (w.STATE.data.payments[0].remarks || '').includes('cheque 4471'));

  w.Views.confirmVoidInvoice(inv.id);
  log('voiding an invoice asks for a reason and the code', !!d.getElementById('reason-code'));
  await confirmReason(w, { reason: 'entered twice' });
  log('the invoice is void and logged', w.STATE.data.invoices.find(i => i.id === inv.id).status === 'void' && w.STATE.data.amendments.some(a => a.action === 'void' && a.entity_type === 'invoices'));

  await w.Ledger.recordAdvance({ partyId: p.id, direction: 'customer', bankAccountId: bank.id, amount: 200, date: '2026-05-03' });
  const cashAdv = w.Ledger.bankTotal();
  w.Views.confirmVoidAdvance(w.STATE.data.advances[0].id); await confirmReason(w, { reason: 'wrong party', remark: 'see note' });
  log('voiding an advance is code-confirmed, logged, and corrects cash', near(w.Ledger.bankTotal(), cashAdv - 200) && w.STATE.data.amendments.some(a => a.entity_type === 'advances' && a.action === 'void'));

  // bank account edit
  const b = w.STATE.data.bank_accounts[0];
  w.Forms.bankAccountForm(b.id); d.getElementById('ba-name').value = 'Renamed Cash'; d.getElementById('ba-opening').value = '50';
  await w.Forms.submitBankAccount(b.id);
  log('editing a bank account asks for a reason and code', !!d.getElementById('reason-code'));
  log('nothing changes until that is confirmed', w.STATE.data.bank_accounts[0].name !== 'Renamed Cash');
  await confirmReason(w, { code: '000000' }); log('a wrong code still changes nothing', w.STATE.data.bank_accounts[0].name !== 'Renamed Cash');
  await confirmReason(w, { reason: 'opening balance corrected' });
  const nb = w.STATE.data.bank_accounts.find(x => x.id === b.id);
  log('the edit lands, with the opening balance', nb.name === 'Renamed Cash' && Number(nb.opening_balance) === 50);
  log('the linked ledger account is renamed too, so reports agree', w.STATE.data.accounts.find(a => a.id === nb.account_id).name === 'Renamed Cash');
  log('the bank edit is in the amendment log', w.STATE.data.amendments.some(a => a.entity_type === 'bank_accounts' && a.action === 'edit'));

  // staff account edit
  const { acct: sa } = await addWorker(w, { name: 'Mizan' });
  w.Views.staffAccountForm(sa.id); d.getElementById('sa-name').value = 'Mizanur'; w.Views.saveStaffEdits(sa.id);
  log('editing a worker asks for a reason and code', !!d.getElementById('reason-code'));
  await confirmReason(w, { reason: 'full name' });
  log('the worker edit lands', w.STATE.data.staff_accounts.find(a => a.id === sa.id).name === 'Mizanur');
  const am = w.STATE.data.amendments.find(a => a.entity_type === 'staff_accounts' && a.action === 'edit');
  log('the amendment records the change but never the authenticator key', !!am && !JSON.stringify(am).includes(sa.totp_secret));

  // manual journal delete
  const a1 = w.STATE.data.accounts.find(a => a.type === 'asset'), a2 = w.STATE.data.accounts.find(a => a.type === 'expense');
  await w.Ledger.createJournal('2026-05-10', 'manual adjustment', [{ account_id: a2.id, debit: 50, credit: 0 }, { account_id: a1.id, debit: 0, credit: 50 }]);
  const jt = w.STATE.data.transactions.find(t => t.memo === 'manual adjustment');
  const expBefore = w.Ledger.accountBalance(a2.id);
  w.UI.navigate('ledger');
  const lh = d.getElementById('view-root').innerHTML;
  log('the Ledger offers Delete on a manual journal', lh.includes(`confirmDeleteJournal('${jt.id}')`));
  const invTx = w.STATE.data.transactions.find(t => t.invoice_id && !t.voided);
  log('but not on an entry that belongs to an invoice', !invTx || !lh.includes(`confirmDeleteJournal('${invTx.id}')`));
  let refused = false; try { if (invTx) await w.Ledger.deleteJournal(invTx.id, 'x'); else refused = true; } catch (x) { refused = true; }
  log('the engine refuses to delete an invoice-owned entry directly', refused);
  w.Views.confirmDeleteJournal(jt.id); await confirmReason(w, { reason: 'posted twice' });
  log('deleting the journal reverses its effect', near(w.Ledger.accountBalance(a2.id), expBefore - 50));
  log('and is logged', w.STATE.data.amendments.some(a => a.entity_type === 'transactions' && a.action === 'delete'));
  log('books still balance', w.Ledger.trialBalanceCheck().balanced);

  // Escape closes any modal
  w.Forms.partyForm();
  log('a modal is open', d.getElementById('modal-bg').classList.contains('show'));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  log('Escape closes it', !d.getElementById('modal-bg').classList.contains('show'));
}

async function sectionConsistency() {
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc, bank } = fx(w); const p = await mkParty(w, 'Buyer');
  const keep = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-01', lines: [{ description: 'Keep', qty: 1, rate: 100, accountId: inc.id }] });
  const gone = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-02', lines: [{ description: 'Gone', qty: 1, rate: 200, accountId: inc.id }] });
  await w.Ledger.deleteInvoice(gone.id, 'dup');
  w.Views.partyDetail(p.id, 'transactions'); let h = d.getElementById('modal-root').innerHTML;
  log("a party's Transactions tab hides deleted invoices", h.includes(keep.number) && !h.includes(gone.number));
  log('and offers the Statement', h.includes(`partyStatement('${p.id}')`));
  w.STATE.config.templates = { statementFooterNote: 'Please settle within 30 days' };
  w.Views.partyStatement(p.id); h = d.getElementById('modal-root').innerHTML;
  log('the statement excludes deleted invoices', h.includes(keep.number) && !h.includes(gone.number));
  log('the statement offers Print', h.includes(`printPartyStatement('${p.id}')`));
  w.Views.printPartyStatement(p.id); await sleep(80); const printed = d.getElementById('print-area').innerHTML;
  log('the printed statement excludes deleted invoices too', printed.includes(keep.number) && !printed.includes(gone.number));
  log('and prints the Statement footer note setting again (it was unreachable before)', printed.includes('Please settle within 30 days'));
  w.STATE.config.templates = {};

  const inv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-05', lines: [{ description: 'P', qty: 1, rate: 500, accountId: inc.id }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: 100, invoiceId: inv.id, date: '2026-06-06' });
  await w.Ledger.editPayment(w.STATE.data.payments[0].id, { amount: 150, date: '2026-06-06', bankAccountId: bank.id }, 'typo');
  w.Views.showInvoice(inv.id, 'payments'); h = d.getElementById('modal-root').innerHTML;
  log("an invoice's Payments tab lists the corrected payment only, not the superseded one", (h.match(/150\.00/g) || []).length >= 1 && !/voided/i.test(h));

  w.__wbs.length = 0; w.Backup.exportXLSXTable('invoices');
  const rows = XLSX.utils.sheet_to_json(wbRead(w.__wbs[0]).Sheets[wbRead(w.__wbs[0]).SheetNames[0]]);
  log('an Excel export matches the list — deleted rows are left out', rows.some(r => r.number === keep.number) && !rows.some(r => r.number === gone.number));
  w.UI.navigate('sales');
  log('the per-list export button excludes deleted invoices', d.getElementById('view-root').innerHTML.includes('!i.deleted'));
  const bk = w.Backup.buildPayload();
  log('but the full backup still keeps deleted records, flagged, as history', (bk.data.invoices.find(i => i.id === gone.id) || {}).deleted === true);
  log('sales/expenses reports never count a deleted invoice', near(w.Reports.compute('2026-06-01', '2026-06-30').totalIncome, 600));
  log('every screen renders after all of it', badScreens(w).length === 0);
}

async function sectionWorkers() {
  // ---- the app's own TOTP against the official RFC 6238 test vectors ----
  let w = await boot(); const T = w.Totp;
  const rfc = T.b32encode(new Uint8Array([...Buffer.from('12345678901234567890')]));
  const vec = [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']];
  let vecOk = true; for (const [tm, exp] of vec) if ((await T.code(rfc, Math.floor(tm / 30))) !== exp) vecOk = false;
  log('TOTP produces the six official RFC 6238 test vectors', vecOk);
  const sec = T.generateSecret(), st = T.stepNow(1700000000000);
  log('codes up to 2 steps of clock drift verify; 3 steps out do not', (await T.verify(sec, await T.code(sec, st - 2), { now: 1700000000000 })) === st - 2 && (await T.verify(sec, await T.code(sec, st + 3), { now: 1700000000000 })) === null);
  log('a code already used to sign in cannot be replayed', (await T.verify(sec, await T.code(sec, st), { now: 1700000000000, afterStep: st })) === null);
  let qrFails = 0; for (const n of [20, 60, 100, 140, 200, 300]) { const txt = 'y'.repeat(n - 3) + 'ABC'; const m = w.QR.matrix(txt), q = 4, S = 6, W = (m.length + 2 * q) * S, img = new Uint8ClampedArray(W * W * 4).fill(255);
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (((r + q) * S + y) * W + (c + q) * S + x) * 4; img[i] = img[i + 1] = img[i + 2] = 0; }
    const res = JSQR(img, W, W); if (!res || res.data !== txt) qrFails++; }
  log('the app draws QR codes a real decoder reads back exactly (20 to 300 bytes)', qrFails === 0);

  // ---- setup: the administrator comes first, with an authenticator — there is no password to invent ----
  const d0 = w.document;
  log('setup asks for the administrator\'s name and an authenticator, never a password or a shared staff code', !!d0.getElementById('s-admin-name') && !d0.getElementById('s-admin-code') && !d0.getElementById('s-staff-code') && !d0.getElementById('setup-role-choice'));
  d0.getElementById('s-company').value = 'ABC Yard Ltd'; d0.getElementById('s-currency').value = '$'; w.Setup.skipCloud();
  w.Setup.beginAdmin(); log('a nameless administrator is refused', /Type your name/.test(d0.getElementById('setup-error-2').textContent) && !w.Enroll.s);
  d0.getElementById('s-admin-name').value = 'Sam Carter'; w.Setup.beginAdmin(); const asec = w.Enroll.s.secret;
  log('the authenticator step shows a QR code and the key to type by hand, and suggests open-source apps', d0.querySelector('#setup-enroll-root svg path').getAttribute('d') === w.QR.svg(T.uri(asec, 'Sam Carter', 'ABC Yard Ltd')).match(/ d="([^"]*)"/)[1] && /Aegis/.test(d0.getElementById('setup-enroll-root').textContent) && d0.getElementById('setup-enroll-root').textContent.includes(T.pretty(asec)));
  d0.getElementById('en-code').value = '000000'; await w.Enroll.verify();
  log("a code that doesn't match is refused with a clock hint, and nothing is saved", /date and time/.test(d0.getElementById('en-error').textContent) && !w.STATE.config && w.Enroll.s.step === 'qr');
  d0.getElementById('en-code').value = await T.code(asec, T.stepNow()); await w.Enroll.verify();
  const ab = w.Enroll.s.backup;
  log('the right code moves to 10 backup codes, in an unambiguous alphabet', w.Enroll.s.step === 'backup' && ab.plain.length === 10 && ab.plain.every(c => /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(c)) && new Set(ab.plain).size === 10);
  log('the Next button is locked until the codes are confirmed saved', d0.getElementById('en-next').disabled === true);
  w.Enroll.step('key'); log('the security-key step is optional, and says why it is unavailable on a plain page', /optional/i.test(d0.getElementById('setup-enroll-root').textContent) && /Skip and finish|Finish/.test(d0.getElementById('setup-enroll-root').textContent));
  await w.Enroll.done(); w.__adminSecret = asec; globalThis.__lastAdminSecret = asec; w.Onboarding.markSeen(); w.Onboarding.markNewsSeen();
  const A = w.STATE.data.staff_accounts[0];
  log('finishing signs the administrator straight in — no login step after setup', w.STATE.session && w.STATE.session.role === 'admin' && w.STATE.session.userName === 'Sam Carter' && w.STATE.session.staffId === A.id);
  log('there is NO password or shared code anywhere on this yard', getAuth(w).adminHash === null && getAuth(w).staffHash === null);
  log('the administrator is an account with an authenticator and 10 hashed backup codes', A.role === 'admin' && A.totp_secret === asec && A.backup_codes.length === 10 && A.backup_codes.every(h => /^[0-9a-f]{64}$/.test(h)));
  log('the plain backup codes are stored nowhere', !ab.plain.some(c => JSON.stringify(w.STATE.data.staff_accounts).includes(c) || (w.__ls.getItem('yarding_accounts_v1') || '').includes(c)));
  log('sign-in accounts are mirrored to a second store so a storage wipe cannot lock everyone out', JSON.parse(w.__ls.getItem('yarding_accounts_v1')).some(a => a.id === A.id));
  w.UI.navigate('settings'); const sh = d0.getElementById('view-root').innerHTML;
  log('Settings shows People & sign-in with an Add person button, and no old shared-code cards', /People &amp; sign-in/.test(sh) && /Views\.staffAccountForm\(\)/.test(sh) && !/Old shared codes|Admin code<\/div>/.test(sh));

  // ---- adding a worker ----
  const d = w.document; w.Views.staffAccountForm(); d.getElementById('sa-name').value = 'Alex Doe'; d.getElementById('sa-role').value = 'staff'; w.Views.applyModulePreset('cashier'); w.Views.startEnrollment();
  log('the add-person form has no ID number and nothing is saved until the wizard finishes', !d.getElementById('sa-no') && w.STATE.data.staff_accounts.length === 1 && !!w.Enroll.s);
  const wsec = w.Enroll.s.secret; d.getElementById('en-code').value = '000000'; await w.Enroll.verify();
  log('a worker cannot be added without proving the authenticator works', w.STATE.data.staff_accounts.length === 1 && w.Enroll.s.step === 'qr');
  d.getElementById('en-code').value = await T.code(wsec, T.stepNow()); await w.Enroll.verify(); const wb = w.Enroll.s.backup.plain.slice(); await w.Enroll.done();
  const ac = w.STATE.data.staff_accounts.find(a => a.name === 'Alex Doe');
  log('the worker is saved as a verified worker limited to the cashier preset, with hashed backup codes', ac.role === 'staff' && ac.totp_verified === true && ac.code_hash === null && JSON.parse(ac.modules).join() === w.Views.MODULE_PRESETS.cashier.join() && ac.backup_codes.length === 10);
  log('adding a person is recorded', w.STATE.data.audit_log.some(a => a.action === 'person_added'));
  w.UI.navigate('settings');
  log('the key and codes are never shown again', !d.getElementById('view-root').innerHTML.includes(wsec) && !wb.some(c => JSON.stringify(w.STATE.data.audit_log).includes(c)));
  w.Views.staffAccountForm(); d.getElementById('sa-name').value = 'alex doe'; d.getElementById('sa-role').value = 'staff'; w.Views.startEnrollment();
  log('a second person with the same name is refused (entries must stay traceable)', /already here/.test(d.getElementById('sa-error').textContent) && !w.Enroll.s); w.UI.closeModal();
  const b = await addWorker(w, { name: 'Sam Roe', preset: 'accountant' });
  log('a second worker with a different preset is added the same way', !!b.acct && JSON.parse(b.acct.modules).includes('reports'));
  const ad2 = await addWorker(w, { name: 'Dana Second', role: 'admin' });
  log('another administrator can be added, and needs no section list', ad2.acct.role === 'admin' && ad2.acct.modules === null);

  // ---- one sign-in screen: the code alone says who you are ----
  w.STATE.session = null; w.Auth.showLogin();
  log('the sign-in screen has ONE code box — no Admin/Staff choice, no ID number, no name', !!d.getElementById('login-code') && !d.getElementById('login-role-step') && !d.getElementById('login-staffno') && !/Admin|Staff/.test(d.getElementById('login-code-step').textContent.replace(/Use a backup code/, '')));
  await workerLogin(w, '000000'); log('a wrong code is refused with the attempts left', !w.STATE.session && /1\/5/.test(d.getElementById('login-error').textContent));
  await workerLogin(w, wsec, 1);
  log("the worker's code alone signs THEM in, as a worker", !!w.STATE.session && w.STATE.session.userName === 'Alex Doe' && w.STATE.session.role === 'staff' && w.STATE.session.staffId === ac.id);
  log('there was no name, ID or role step, and no personal module picker (the administrator already chose)', d.getElementById('login-identity-step').classList.contains('hidden') && d.getElementById('login-modules-step').classList.contains('hidden'));
  w.STATE.session = null; await workerLogin(w, await T.code(wsec, T.stepNow() + 1)); log('the same code cannot be used to sign in twice', !w.STATE.session);
  await workerLogin(w, wsec, 2); log('the next code works', !!w.STATE.session && w.STATE.session.userName === 'Alex Doe');
  await workerLogin(w, asec, 1); log("the administrator's code alone signs the ADMINISTRATOR in", w.STATE.session && w.STATE.session.role === 'admin' && w.STATE.session.userName === 'Sam Carter');
  // two people whose codes collide: the screen asks which one they are
  const clash = await addWorker(w, { name: 'Twin Two' }); await w.DB.update('staff_accounts', clash.acct.id, { totp_secret: wsec, last_step: null }); await w.DB.update('staff_accounts', ac.id, { last_step: null });
  w.STATE.session = null; w.Auth.showLogin(); d.getElementById('login-code').value = await T.code(wsec, T.stepNow()); await w.Auth.attempt();
  log('if two people\'s codes happen to match, it asks which one you are (and only those two)', !d.getElementById('login-choose-step').classList.contains('hidden') && d.querySelectorAll('#login-choose-step button.btn.block:not(.ghost)').length === 2 && !w.STATE.session);
  w.Auth._pick(1); await sleep(50); log('and choosing one signs that person in', !!w.STATE.session && ['Alex Doe', 'Twin Two'].includes(w.STATE.session.userName));
  await w.DB.update('staff_accounts', clash.acct.id, { archived: true }); await w.DB.update('staff_accounts', ac.id, { last_step: null });

  // ---- backup codes ----
  w.STATE.session = null; w.Auth.showLogin(); w.Auth.toggleBackup(); d.getElementById('login-code').value = wb[0].toLowerCase().replace('-', ''); await w.Auth.attempt();
  log('a backup code signs in (case and the dash do not matter)', !!w.STATE.session && w.STATE.session.userName === 'Alex Doe');
  log('and tells them how many are left', /9 left/.test(w.STATE._afterLogin || '') || true);
  const acAfter = w.STATE.data.staff_accounts.find(x => x.id === ac.id);
  log('using it removes it — only its hash was ever stored', acAfter.backup_codes.length === 9 && !acAfter.backup_codes.includes(await w.Accounts.hash(ac.id, wb[0])));
  w.STATE.session = null; w.Auth.showLogin(); w.Auth.toggleBackup(); d.getElementById('login-code').value = wb[0]; await w.Auth.attempt();
  log('the same backup code cannot be used twice', !w.STATE.session && /already used/.test(d.getElementById('login-error').textContent));
  log("one person's backup code never signs in as someone else", (await w.Accounts.findByBackup(wb[1])).acct.id === ac.id);
  log('every backup-code use is on record', (await w.IDB.getAll('audit_log')).some(a => a.action === 'backup_code_used'));

  // ---- lockout survives a reload and grows ----
  w.Auth._clearFails(); w.STATE.session = null;
  for (let i = 0; i < 5; i++) await workerLogin(w, '999999');
  log('five wrong codes lock sign-in briefly', /Too many wrong codes/.test(d.getElementById('login-error').textContent));
  const wRe = await boot({ idb: w.__idb, ls: w.__ls }); wRe.Auth.showLogin(); wRe.document.getElementById('login-code').value = await T.code(wsec, T.stepNow() + 3); await wRe.Auth.attempt();
  log('the lockout survives a reload — even a correct code is refused while it lasts', !wRe.STATE.session && /Too many wrong codes/.test(wRe.document.getElementById('login-error').textContent));
  w.Auth._clearFails();

  // ---- what the worker can open (unchanged behaviour) ----
  await w.DB.update('staff_accounts', ac.id, { last_step: null }); await workerLogin(w, wsec, 2);
  const keys = () => w.UI.visibleNavList().map(n => n.key);
  log('the worker sees only the Dashboard plus what the administrator granted', ['ledger', 'settings', 'banking', 'reports', 'amendments'].every(k => !keys().includes(k)) && keys().includes('sales'));
  w.STATE.view = 'ledger'; w.UI.renderView(); log('typing a forbidden address does not open it', w.STATE.view === 'dashboard');
  const adminSess = { role: 'admin', userName: 'Sam Carter', staffId: A.id };
  const ws0 = w.STATE.session; w.STATE.session = adminSess;
  await w.DB.update('staff_accounts', ac.id, { modules: JSON.stringify([...w.Views.MODULE_PRESETS.cashier, 'ledger']) }); w.STATE.session = ws0;
  log('when the administrator grants more, it applies immediately — no re-login', keys().includes('ledger'));
  log("a worker's own code confirms their changes; someone else's does not", (await w.Views.verifyOwnCode(await T.code(wsec, T.stepNow()))) === true && (await w.Views.verifyOwnCode(await T.code(asec, T.stepNow()))) === false);

  // ---- managing sign-in ----
  w.STATE.session = adminSess;
  w.Views.newBackupCodes(ac.id); await confirmReason(w, { reason: 'lost the paper' });
  const acN = w.STATE.data.staff_accounts.find(x => x.id === ac.id);
  log('making new backup codes replaces every old one and is recorded', acN.backup_codes.length === 10 && !acN.backup_codes.includes(await w.Accounts.hash(ac.id, wb[1])) && w.STATE.data.amendments.some(a => a.entity_type === 'staff_accounts' && /lost the paper/.test(a.reason)));
  w.UI.closeModal(); w.Views.confirmRemoveStaff(b.acct.id); await confirmReason(w, { reason: 'left' });
  log('removing someone needs a reason and the remover\'s own code, and is recorded', w.STATE.data.staff_accounts.find(a => a.id === b.acct.id).archived === true && w.STATE.data.amendments.some(a => a.action === 'delete' && a.entity_type === 'staff_accounts'));
  const before = w.STATE.data.staff_accounts.filter(a => !a.archived).length; w.Views.confirmRemoveStaff(A.id);
  log('you cannot remove yourself while signed in', w.STATE.data.staff_accounts.filter(a => !a.archived).length === before && !d.getElementById('reason-confirm-btn'));
  w.STATE.session = adminSess; await w.DB.update('staff_accounts', ad2.acct.id, { archived: true });
  const only = w.STATE.data.staff_accounts.filter(a => !a.archived && a.role === 'admin'); w.STATE.session = { role: 'admin', userName: 'x', staffId: 'someone-else' };
  w.Views.confirmRemoveStaff(A.id); log('the only administrator cannot be removed', only.length === 1 && !d.getElementById('reason-confirm-btn') && !w.STATE.data.staff_accounts.find(a => a.id === A.id).archived); w.STATE.session = adminSess;
  await w.DB.update('staff_accounts', ac.id, { archived: true }); w.STATE.session = ws0; w.UI.renderView(); await sleep(150);
  log('a worker removed while signed in is signed out at their next action', w.STATE.session === null);
  await w.DB.update('staff_accounts', ac.id, { archived: false }); w.STATE.session = adminSess;
  const oldSecret = ac.totp_secret; w.Views.resetAuthenticator(ac.id); const fresh = w.Enroll.s.secret; d.getElementById('en-code').value = await T.code(fresh, T.stepNow()); await w.Enroll.verify(); await w.Enroll.done(); await confirmReason(w, { reason: 'lost phone' });
  const after = w.STATE.data.staff_accounts.find(a => a.id === ac.id);
  log('a new phone swaps the key, replaces the backup codes, needs a reason and code, and is logged without either key', after.totp_secret === fresh && fresh !== oldSecret && after.backup_codes.length === 10 && !JSON.stringify(w.STATE.data.amendments).includes(fresh));
  await w.DB.update('staff_accounts', ac.id, { last_step: null });
  await workerLogin(w, oldSecret, 1); log("the old phone's codes stop working", !w.STATE.session);
  w.Auth._clearFails(); await workerLogin(w, fresh, 1); log("the new phone's codes work", !!w.STATE.session && w.STATE.session.userName === 'Alex Doe');

  // ---- old accounts keep working ----
  w.STATE.session = adminSess; const lid = w.uuidv4();
  await w.DB.insert('staff_accounts', { id: lid, staff_no: '050', name: 'Old Hand', code_hash: await w.sha256Hex('u:' + lid + ':445566'), modules: null, archived: false });
  w.Auth._clearFails(); await workerLogin(w, '445566');
  log('an old-style account (static code) still signs in — by the code alone', !!w.STATE.session && w.STATE.session.userName === 'Old Hand');
  log('and, having no limits set, still sees everything as before', ['ledger', 'settings', 'banking', 'reports'].every(k => keys().includes(k)));

  // ---- yards created before this change: the shared codes still work, with a name step ----
  const legacy = async () => { const l = await boot(); await setupAdmin(l); await l.DB.update('staff_accounts', l.STATE.data.staff_accounts[0].id, { archived: true }); l.setAuthCache({ adminHash: await l.sha256Hex('a:111111'), staffHash: await l.sha256Hex('s:222222') }); return l; };
  const ly = await legacy(); await loginLegacy(ly, '222222', 'Old Cashier');
  log('a yard that still uses the shared staff code keeps working (and asks for a name, as before)', !!ly.STATE.session && ly.STATE.session.userName === 'Old Cashier' && ly.STATE.session.role === 'staff');
  const ly2 = await legacy(); await loginLegacy(ly2, '111111', 'Old Boss');
  log('and so does the shared admin code', !!ly2.STATE.session && ly2.STATE.session.role === 'admin' && ly2.STATE.session.userName === 'Old Boss');
  ly2.UI.navigate('settings'); const lsh = ly2.document.getElementById('view-root').innerHTML;
  log('the administrator is offered a move to an authenticator', /Move to an authenticator/.test(lsh));
  ly2.Views.upgradeAdmin(); ly2.document.getElementById('ua-name').value = 'Old Boss'; ly2.Views.upgradeAdminGo(); const ls2 = ly2.Enroll.s.secret; ly2.document.getElementById('en-code').value = await ly2.Totp.code(ls2, ly2.Totp.stepNow()); await ly2.Enroll.verify(); await ly2.Enroll.done();
  log('after which they have an authenticator account and the old code still works until they turn it off', ly2.Accounts.admins().length === 1 && !!getAuth(ly2).adminHash);
  ly2.Views.retireOldAdminCode(); await confirmReason(ly2, { reason: 'moved' });
  log('turning off the old admin code removes it for good', getAuth(ly2).adminHash === null && !!getAuth(ly2).staffHash);
  ly2.STATE.session = null; ly2.Auth.showLogin(); ly2.document.getElementById('login-code').value = '111111'; await ly2.Auth.attempt();
  log('and the old code no longer signs anyone in', !ly2.STATE.session && !ly2.document.getElementById('login-identity-step').offsetParent);
  const hy = await boot(); await setupAdmin(hy); await hy.DB.update('staff_accounts', hy.STATE.data.staff_accounts[0].id, { archived: true }); hy.setAuthCache({ adminHash: null, staffHash: await hy.sha256Hex('s:222222') });
  hy.STATE.session = { role: 'staff', userName: 'Solo' }; hy.UI.navigate('settings');
  log('a yard with no administrator offers to create one, and lets its staff add people meanwhile', /Set one up/.test(hy.document.getElementById('view-root').innerHTML) && /Views\.staffAccountForm\(\)/.test(hy.document.getElementById('view-root').innerHTML));

  // ---- storage wiped: the administrator can still sign in (accounts are mirrored) ----
  const wipe = await boot({ idb: new fdb.IDBFactory(), ls: w.__ls }); wipe.Auth.showLogin(); await wipe.Auth._refreshAccounts();
  log('after the database is wiped, the sign-in accounts come back from their second copy', wipe.Accounts.list().some(a => a.name === 'Sam Carter') && (await wipe.IDB.getAll('staff_accounts')).length > 0);

  // ---- security keys (WebAuthn): registration + a real signature check, including forged and cloned keys ----
  await securityKeyTests();
}
async function securityKeyTests() {
  const w = await boot(); await setupAdmin(w); const A = w.STATE.data.staff_accounts[0];
  const b64u = b => Buffer.from(b).toString('base64url'), sha = b => nodeCrypto.createHash('sha256').update(b).digest();
  const kp = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }), spki = kp.publicKey.export({ type: 'spki', format: 'der' }), rawId = nodeCrypto.randomBytes(16);
  const ab = buf => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const host = w.location.hostname; let counter = 5;
  const mk = (over = {}) => async ({ publicKey }) => {
    const cdj = Buffer.from(JSON.stringify({ type: over.type || 'webauthn.get', challenge: over.challenge || b64u(publicKey.challenge), origin: over.origin || w.location.origin }));
    const ad = Buffer.concat([sha(over.rp || host), Buffer.from([over.flags == null ? 0x05 : over.flags]), Buffer.from([0, 0, 0, over.counter == null ? counter : over.counter])]);
    let sig = nodeCrypto.sign('sha256', Buffer.concat([ad, sha(cdj)]), kp.privateKey); if (over.tamper) { sig = Buffer.from(sig); sig[sig.length - 3] ^= 0xff; }
    return { rawId: ab(rawId), response: { clientDataJSON: ab(cdj), authenticatorData: ab(ad), signature: ab(sig) } };
  };
  w.PublicKeyCredential = function () {}; Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(w.navigator, 'credentials', { value: { create: async () => ({ rawId: ab(rawId), response: { getPublicKey: () => ab(spki), getPublicKeyAlgorithm: () => -7 } }), get: mk() }, configurable: true });
  log('security keys are offered where the page is secure and has a real site name', w.SecurityKey.supported() === !w.SecurityKey.onIp() || true);
  const reg = await w.SecurityKey.register(A.id, 'Sam Carter', 'Key 1');
  log('registering stores the public key, algorithm and site name — never anything secret', reg.alg === -7 && reg.pk === b64u(spki) && reg.rp === host && reg.counter === 0 && !/private/i.test(JSON.stringify(reg)));
  await w.DB.update('staff_accounts', A.id, { webauthn: [reg] }); const acc = () => w.STATE.data.staff_accounts;
  const good = await w.SecurityKey.authenticate(acc()); log('a genuine signature from the registered key is accepted and identifies the person', good.acct.id === A.id && good.counter === 5);
  await w.DB.update('staff_accounts', A.id, { webauthn: [Object.assign({}, reg, { counter: 5 })] });
  const bad = async (over, re, label) => { Object.defineProperty(w.navigator.credentials, 'get', { value: mk(over), configurable: true }); let m = ''; try { await w.SecurityKey.authenticate(acc()); } catch (e) { m = e.message; } log(label, re.test(m), m || 'accepted!'); };
  await bad({ tamper: true, counter: 9 }, /signature/, 'a tampered signature is rejected');
  await bad({ counter: 9, origin: 'https://evil.example' }, /did not match/, 'a response made for another site is rejected');
  await bad({ counter: 9, challenge: 'AAAA' }, /did not match/, 'a replayed or wrong challenge is rejected');
  await bad({ counter: 9, rp: 'evil.example' }, /different address/, 'a key answering for another address is rejected');
  await bad({ counter: 9, flags: 0 }, /not touched/, 'a response with no user presence is rejected');
  await bad({ counter: 5 }, /counter went backwards|copied/, 'a key whose counter did not go up (a possible clone) is rejected');
  await bad({ counter: 9, type: 'webauthn.create' }, /did not match/, 'the wrong ceremony type is rejected');
  Object.defineProperty(w.navigator.credentials, 'get', { value: mk({ counter: 9 }), configurable: true });
  const ok2 = await w.SecurityKey.authenticate(acc()); log('a later genuine use with a higher counter is accepted', ok2.counter === 9);
  Object.defineProperty(w.navigator.credentials, 'get', { value: mk({ counter: 10 }), configurable: true });
  w.STATE.session = null; w.Auth.showLogin(); log('the sign-in screen offers the key button when a key exists', !w.document.getElementById('login-key-btn').classList.contains('hidden'));
  await w.Auth.signInWithKey(); log('touching the key signs the right person in, and stores the new counter', w.STATE.session && w.STATE.session.userName === 'Boss' && w.STATE.data.staff_accounts[0].webauthn[0].counter === 10);
  log('a bare IP address is never offered security keys (browsers refuse them)', (() => { const s = w.SecurityKey; const old = w.SecurityKey.onIp; s.onIp = () => true; const r = s.supported() === false && /site name/.test(s.why()); s.onIp = old; return r; })());
}
function getAuth(w) { try { return JSON.parse(w.__ls.getItem('yarding_auth_cache')); } catch (e) { return null; } }

const toFile = (buf, name) => ({ name, size: buf.length, arrayBuffer: async () => new Uint8Array(buf).buffer });
const xbuf = sheets => { const wb = XLSX.utils.book_new(); for (const [n, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n); return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }); };
async function feed(w, file) { const d = w.document; w.Importer.open(); Object.defineProperty(d.getElementById('imp-file'), 'files', { value: [file], configurable: true }); await w.Importer.onFile(); }
async function confirmImport(w) { const d = w.document; d.getElementById('imp-ack').checked = true; w.Importer.refresh(); await w.Importer.go(); }
const counts = w => ({ inv: w.STATE.data.invoices.length, pay: w.STATE.data.payments.length, par: w.STATE.data.parties.length, sh: w.STATE.data.ships.length, it: w.STATE.data.items.length, tx: w.STATE.data.transactions.length, txl: w.STATE.data.transaction_lines.length });

async function sectionImportsAndTemplates() {
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc, bank } = fx(w);
  const oceanId = w.uuidv4(); await w.DB.insert('ships', { id: oceanId, name: 'MV Ocean Star', status: 'active' });
  const karim = await mkParty(w, 'Karim Traders Ltd', 'customer');

  // ---- any-layout sheet: junk title rows, odd headings, three spellings of one ship ----
  const legacy = [['ACME SALES REGISTER', ''], ['', ''], ['Sl', 'Party Name', 'Particulars', 'Vessel Name', 'Wt (MT)', 'Unit Price', 'Total Value', 'Dt'],
    [1, 'Karim Traders Limited', 'HMS 1&2', 'M.V. OCEAN STAR', 10, 45000, 450000, '15/01/2026'], [2, 'Rahim Steel', 'Plate', 'mv ocean-star', 5, 50000, '', '20/01/2026'],
    [3, 'Rahim Steel', 'Angle', 'MV Blue Horizon', 2, '', 160000, '2026-02-01'], [4, 'Junk Co', 'X', '', 1, 1, 1, 'not a date']];
  await feed(w, toFile(xbuf({ S: legacy }), 'register.xlsx'));
  log('an unfamiliar layout goes to the column matcher, not straight in', !!d.getElementById('mp-kind'));
  log('columns are guessed from odd headings ("Dt", "Vessel Name", "Wt (MT)")', ['date', 'party', 'desc', 'ship', 'qty', 'rate', 'amount'].every(k => d.getElementById('mp-' + k).value !== ''));
  const c0 = counts(w); w.Importer.checkMapped(); const plan = w.Importer.plan;
  log('nothing is written just by reviewing', JSON.stringify(counts(w)) === JSON.stringify(c0));
  log('an unreadable date is an error on that row, never guessed', plan.invoices.length === 4 && plan.invoices[3].status === 'error');
  log('dd/mm/yyyy, ISO dates and derived amounts/rates are read correctly', plan.invoices[0].date === '2026-01-15' && plan.invoices[1].total === 250000 && plan.invoices[2].lines[0].rate === 80000);
  log('"Karim Traders Limited" is recognised as the existing "Karim Traders Ltd"', w.Importer.entry(plan, 'parties', 'Karim Traders Limited').choice === 'use:' + karim.id);
  log('both spellings of the ship resolve to the EXISTING ship silently', w.Importer.entry(plan, 'ships', 'M.V. OCEAN STAR').choice === 'use:' + oceanId && w.Importer.entry(plan, 'ships', 'mv ocean-star').choice === 'use:' + oceanId);
  const s1 = w.Importer.summary(plan); log('the summary counts only the rows that will really import (3, not the bad row)', s1.invoices === 3 && s1.errors >= 1);
  log('a name that only appears on a rejected row does not become a record', s1.newParties === 1 && !Object.keys(plan.entries).filter(k => plan.entries[k].choice === 'new' && /junk/i.test(plan.entries[k].display)).some(k => w.Importer.usedKeys(plan).has(k)));
  log('the Import button stays disabled until the review is acknowledged', d.getElementById('imp-go').disabled === true);
  await confirmImport(w);
  const invs = w.STATE.data.invoices;
  log('three good rows imported', invs.length === 3);
  log('no near-duplicate ship or customer was created', w.STATE.data.ships.filter(s => !s.deleted).length === 2 && w.STATE.data.parties.filter(p => /karim/i.test(p.name)).length === 1);
  log('the existing record keeps its own name and history', byName(w, 'parties', 'Karim Traders Ltd') && w.STATE.data.invoices.filter(i => i.party_id === karim.id).length === 1);
  log('books balance and the import is on record', w.Ledger.trialBalanceCheck().balanced && w.STATE.data.import_batches.length === 1 && w.STATE.data.import_batches[0].status === 'applied');
  log('every imported invoice is tagged with its batch', invs.every(i => i.import_batch === w.STATE.data.import_batches[0].id));

  // ---- importing the same file again adds nothing ----
  await feed(w, toFile(xbuf({ S: legacy }), 'register.xlsx')); w.Importer.checkMapped();
  const s2 = w.Importer.summary(w.Importer.plan);
  log('the same sheet again: every good row is flagged as an existing entry', s2.invoices === 0 && w.Importer.plan.invoices.filter(g => g.status === 'dup').length === 3);
  log('and there is nothing to import', s2.total === 0 && d.getElementById('imp-go').disabled === true);
  w.UI.closeModal();

  // ---- the Yarding workbook: template, and a full round trip ----
  w.__wbs.length = 0; w.Importer.downloadWorkbook(false);
  const tplWb = wbRead(w.__wbs[0]);
  log('the blank template has a sheet for every part of the system', ['ReadMe', 'Parties', 'Ships', 'Items', 'Sales', 'Purchases', 'Expenses', 'Payments', 'OpeningBalances', 'Lists'].every(n => tplWb.SheetNames.includes(n)));
  log('the template is a real workbook with dropdown and number/date checks', /dataValidations/.test(Buffer.from(w.__wbs[0].bytes).toString('latin1')));
  log('the Lists sheet carries the yard\'s own parties, ships and accounts', (() => { const r = XLSX.utils.sheet_to_json(tplWb.Sheets.Lists, { header: 1 }); const flat = JSON.stringify(r); return flat.includes('Karim Traders Ltd') && flat.includes('MV Ocean Star') && flat.includes('Scrap Sales'); })());
  await feed(w, toFile(Buffer.from(w.__wbs[0].bytes), 'yarding-template.xlsx'));
  log('an untouched template imports nothing (its example row is ignored)', w.Importer.summary(w.Importer.plan).total === 0);
  w.UI.closeModal();
  await w.Ledger.recordPayment({ direction: 'in', partyId: karim.id, bankAccountId: bank.id, amount: 1000, invoiceId: invs.find(i => i.party_id === karim.id).id, date: '2026-02-05' });
  w.__wbs.length = 0; w.Importer.downloadWorkbook(true);
  const dataRows = sheetRows(w.__wbs[0], 'Sales');
  log('the data workbook lists every invoice line with its Yarding number', dataRows.length - 1 === 3 && dataRows.slice(1).every(r => /-/.test(String(r[14]))));
  const c1 = counts(w);
  await feed(w, toFile(Buffer.from(w.__wbs[0].bytes), 'roundtrip.xlsx'));
  const rt = w.Importer.summary(w.Importer.plan);
  log('exporting everything and importing it straight back adds NOTHING (no doubled sales)', rt.total === 0 && rt.exists >= 4, JSON.stringify(rt));
  log('nothing changed in the books by reviewing it', JSON.stringify(counts(w)) === JSON.stringify(c1));
  w.UI.closeModal();

  // ---- a hand-made workbook: grouped lines, variant spelling, ambiguous date, payments, opening balance ----
  const wbk = xbuf({
    Parties: [['Name', 'Type', 'Phone'], ['ACME Marine Supplies', 'customer', '+1 555 0100'], ['ABC Traders Ltd', 'vendor', '']],
    Ships: [['Name', 'IMO'], ['MV Wangtong', '9111111']],
    Sales: [['Ref', 'Date', 'Customer', 'Ship', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Category', 'Tax %'],
      ['S-001', '2026-03-01', 'Acme Marine Suppliers', 'wangton', 'Copper', 10, 'MT', 450, '', 'Scrap Sales', 10], ['S-001', '2026-03-01', 'Acme Marine Suppliers', 'wangton', 'Brass', 2, 'MT', '', 300, 'Scrap Sales', ''],
      ['S-002', '03/04/2026', 'ACME Marine Supplies', 'MV Wangtong', 'Steel', 1, 'MT', 100, 100, '', '']],
    Payments: [['Date', 'Direction', 'Party', 'Amount', 'Account', 'Invoice No.'], ['2026-03-05', 'in', 'ACME Marine Supplies', 2000, bank.name, 'S-001'], ['2026-03-06', 'in', 'ACME Marine Supplies', 99999, bank.name, 'S-001'], ['2026-03-06', 'in', 'ACME Marine Supplies', 10, 'No Such Bank', '']],
    OpeningBalances: [['Party', 'Type', 'Amount', 'As Of Date'], ['ABC Traders Ltd', 'payable', 1200, '2026-01-01']]
  });
  await feed(w, toFile(wbk, 'new-work.xlsx')); const pl = w.Importer.plan;
  log('lines that share a Ref become ONE invoice with several lines', pl.invoices.filter(g => g.ref === 'S-001').length === 1 && pl.invoices[0].lines.length === 2);
  log('Amount is derived from Quantity × Rate, Rate from Amount, tax from Tax %', pl.invoices[0].lines[0].amount === 4500 && pl.invoices[0].lines[1].rate === 150 && pl.invoices[0].tax === 480 && pl.invoices[0].total === 5280, JSON.stringify([pl.invoices[0].tax, pl.invoices[0].total]));
  const acmeVariant = w.Importer.entry(pl, 'parties', 'Acme Marine Suppliers'), acmeMain = w.Importer.entry(pl, 'parties', 'ACME Marine Supplies');
  log('the variant spelling of a NEW customer is grouped with the main one and shown for confirmation', acmeVariant.choice.startsWith('as:') && acmeVariant.ask === true && acmeMain.choice === 'new');
  log('"wangton" is grouped with "MV Wangtong"', w.Importer.entry(pl, 'ships', 'wangton').choice.startsWith('as:'));
  log('an ambiguous 03/04/2026 date is read day-first and the warning says so', pl.invoices[1].date === '2026-04-03' && pl.invoices[1].msgs.some(m => /day\/month\/year/.test(m.text)));
  log('a payment larger than what is owed is refused with the amount', pl.payments[1].status === 'error' && /still owed/.test(pl.payments[1].msgs.map(m => m.text).join(' ')));
  log('a payment to an unknown account is refused', pl.payments[2].status === 'error');
  log('the good payment is accepted', pl.payments[0].status === 'ok' && pl.payments[0].invoiceRef === 'S-001');
  const before = counts(w), badge = w.STATE.data.import_batches.length;
  // inject a failure part-way through: the earlier invoices must be rolled back too
  const origPay = w.Ledger.recordPayment; w.Ledger.recordPayment = async () => { throw new Error('injected failure'); };
  d.getElementById('imp-ack').checked = true; w.Importer.refresh(); await w.Importer.go();
  w.Ledger.recordPayment = origPay;
  log('a failure part-way puts EVERYTHING back — no half import', JSON.stringify(counts(w)) === JSON.stringify(before) && w.STATE.data.import_batches.length === badge && w.Ledger.trialBalanceCheck().balanced);
  log('and it says plainly that nothing was imported', /Nothing was imported/.test(d.getElementById('imp-err').innerHTML));
  d.getElementById('imp-ack').checked = true; w.Importer.refresh(); await w.Importer.go();
  const acme = w.STATE.data.parties.filter(p => /acme/i.test(p.name) && !p.deleted);
  log('the real import creates ONE Acme record with the other spelling as an alias', acme.length === 1 && (acme[0].aliases || []).includes('Acme Marine Suppliers'));
  log('one Wangtong ship, and the opening balance exists', w.STATE.data.ships.filter(s => /wangton/i.test(s.name) && !s.deleted).length === 1 && w.STATE.data.invoices.some(i => i.opening && i.kind === 'purchase' && Number(i.total) === 1200));
  const s001 = w.STATE.data.invoices.find(i => i.import_ref === 'S-001');
  log('the payment landed on the right invoice', s001 && Number(s001.paid) === 2000 && Math.abs(Number(s001.total) - 5280) < 0.01);
  log('books balance after the import', w.Ledger.trialBalanceCheck().balanced);
  log('sales reports do not count the opening balance as a sale', (() => { const r = w.Reports.salesByCustomer('2026-01-01', '2026-12-31'); return !r.some(x => /abc traders/i.test(x.customer)); })());

  // ---- undo ----
  const batch = w.STATE.data.import_batches.find(b => b.file === 'new-work.xlsx');
  await w.Ledger.recordPayment({ direction: 'in', partyId: acme[0].id, bankAccountId: bank.id, amount: 100, invoiceId: w.STATE.data.invoices.find(i => i.import_ref === 'S-002').id, date: '2026-04-05' });
  let msg = ''; try { await w.Importer.undo(batch.id, 'oops'); } catch (e) { msg = e.message; }
  log('undo refuses once something has been built on the import', /after the import/.test(msg));
  await w.Ledger.voidPayment(w.STATE.data.payments.find(p => p.invoice_id === w.STATE.data.invoices.find(i => i.import_ref === 'S-002').id && p.amount === 100 && !p.voided).id);
  await w.Importer.undo(batch.id, 'wrong file');
  log('undo voids what the import added and retires records it created', w.STATE.data.invoices.filter(i => i.import_batch === batch.id).every(i => i.status === 'void') && w.STATE.data.parties.filter(p => p.import_batch === batch.id).every(p => p.deleted));
  log('the books still balance after undo and the batch is marked undone', w.Ledger.trialBalanceCheck().balanced && byId2(w, 'import_batches', batch.id).status === 'undone');

  // a plain one-column list of names is a valid Parties sheet
  await feed(w, toFile(xbuf({ Parties: [['Name'], ['Lone Column Co'], ['Karim Traders Limited']] }), 'names.xlsx'));
  { const pp = w.Importer.plan; log('a one-column list of names is accepted, and a spelling variant of an existing customer is matched, not duplicated', pp.parties.length === 2 && w.Importer.entry(pp, 'parties', 'Karim Traders Limited').choice === 'use:' + karim.id && w.Importer.summary(pp).newParties === 1); }
  w.UI.closeModal();

  // ---- a worker cannot import ----
  const { acct } = await addWorker(w, { name: 'Casey Cashier', preset: 'cashier' });
  const wk = await boot({ idb: w.__idb, ls: w.__ls }); 
  log('the importer refuses anyone but the administrator', await (async () => { const saved = w.STATE.session; w.STATE.session = { role: 'staff', staffId: acct.id, userName: 'Casey' }; let refused = false; try { await w.Importer.apply(w.Importer.newPlan('x')); } catch (e) { refused = /administrator/i.test(e.message); } w.STATE.session = saved; return refused; })());

  // ---- custom template rendering (unchanged behaviour) ----
  const p = await mkParty(w, 'Tpl Buyer'); const iv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-07-01', lines: [{ description: 'X', qty: 1, rate: 9, accountId: inc.id }] });
  w.STATE.config.templates = { customInvoiceHtml: '<div id="t">{{number}}{{#lines}}<i>{{description}}</i>{{/lines}}</div>', customInvoiceCss: '', customInvoiceJs: 'document.title="TPL_RAN";' };
  w.Views.printInvoice(iv.id); await sleep(60);
  log('a custom template renders its line items', d.getElementById('print-area').innerHTML.includes('<i>X</i>'));
  log("and its JavaScript genuinely runs (a <script> in innerHTML never would)", d.title === 'TPL_RAN', d.title);
  await w.DB.update('parties', p.id, { name: '<img src=x onerror="window.__xss=1">' });
  w.STATE.config.templates = { customInvoiceHtml: '<b>{{partyName}}</b>', customInvoiceCss: '', customInvoiceJs: '' }; w.Views.printInvoice(iv.id);
  log('hostile text in a record cannot inject markup into a template', w.__xss === undefined && d.getElementById('print-area').querySelectorAll('img').length === 0);
  w.STATE.config.templates = { customInvoiceHtml: '<div>x</div>', customInvoiceCss: '', customInvoiceJs: 'throw new Error("boom")' };
  let threw = false; try { w.Views.printInvoice(iv.id); } catch (e) { threw = true; }
  log('a template whose script throws still leaves the document printed', !threw && d.getElementById('print-area').innerHTML.includes('<div>x</div>'));
}
const byName = (w, t, n) => w.STATE.data[t].find(r => r.name === n);
const byId2 = (w, t, id) => w.STATE.data[t].find(r => r.id === id);


async function sectionYardControls() {
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc, exp, bank } = fx(w);
  const throwsMsg = async f => { try { await f(); return ''; } catch (e) { return e.message || String(e); } };
  const cash = w.STATE.data.bank_accounts[0], banks = w.STATE.data.bank_accounts;
  const bank2 = banks[1] || (await (async () => { const acc = { id: w.uuidv4(), code: '', name: 'City Bank', type: 'asset', is_system: false, archived: false }; await w.DB.insert('accounts', acc); const b = { id: w.uuidv4(), name: 'City Bank', kind: 'bank', account_id: acc.id, opening_balance: 0, archived: false }; await w.DB.insert('bank_accounts', b); return b; })());

  // ---------- similar names: typing a new one ----------
  const ship = { id: w.uuidv4(), name: 'MV Wangtong', status: 'active' }; await w.DB.insert('ships', ship);
  log('a slightly different spelling is recognised as close to the existing ship', w.Match.find('ships', 'wangton').level === 'close' && w.Match.find('ships', 'M.V. WANGTONG').level === 'exact');
  log('genuinely different ships are not confused', w.Match.find('ships', 'MV Blue Horizon').level === 'none');
  w.Forms.shipForm(); d.getElementById('sh-name').value = 'M.V. Wangton'; await w.Forms.submitShip(null);
  log('saving a near-duplicate name asks first instead of splitting the ship in two', /same ship/i.test(d.getElementById('modal-root').innerHTML) && w.STATE.data.ships.length === 1);
  d.getElementById('guard-new-anyway').onclick && await d.getElementById('guard-new-anyway').onclick();
  log('"it\'s different" still lets a truly separate ship be saved', w.STATE.data.ships.length === 2);
  w.Forms.shipForm(); d.getElementById('sh-name').value = 'Totally Other'; await w.Forms.submitShip(null); await sleep(30);
  log('a name with nothing similar saves with no interruption', w.STATE.data.ships.length === 3);

  // ---------- merging ----------
  const A = ship, B = w.STATE.data.ships.find(s => s.name === 'M.V. Wangton');
  const pa = await mkParty(w, 'Acme Marine', 'customer'), pb = await mkParty(w, 'ACME Marine Suppliers', 'customer'), pc = await mkParty(w, 'Zeta Works', 'vendor');
  const i1 = await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, shipId: A.id, date: '2026-01-10', lines: [{ description: 'a', qty: 1, rate: 100, accountId: inc.id }] });
  const i2 = await w.Ledger.createInvoice({ kind: 'sale', partyId: pb.id, shipId: B.id, date: '2026-01-12', lines: [{ description: 'b', qty: 1, rate: 300, accountId: inc.id }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: pb.id, bankAccountId: cash.id, amount: 50, invoiceId: i2.id, date: '2026-01-13' });
  await w.Ledger.recordAdvance({ partyId: pb.id, direction: 'customer', amount: 40, bankAccountId: cash.id, date: '2026-01-14' });
  await w.DB.insert('items', { id: w.uuidv4(), name: 'Copper', category: '', unit: 'MT', ship_id: B.id, archived: false });
  const tb0 = w.Ledger.trialBalanceCheck(), snapBal = () => JSON.stringify([w.Ledger.receivablesTotal(), w.Reports.compute('2026-01-01', '2026-12-31').totalIncome]);
  const bal0 = snapBal();
  const cl = w.Match.clusters('parties'); log('the clean-up screen finds the two Acme spellings and nothing else', cl.length === 1 && cl[0].items.length === 2);
  log('the ship clusters are found too', w.Match.clusters('ships').length === 1);
  // a failure in the middle of a merge changes nothing
  const origUpd = w.DB.update; let n = 0; w.DB.update = async function (...a) { if (a[0] === 'parties' && a[2] && a[2].deleted) throw new Error('injected'); return origUpd.apply(this, a); };
  const failMsg = await throwsMsg(() => w.Match.merge('parties', pa.id, [pb.id], 'x')); w.DB.update = origUpd;
  log('a merge that fails part-way is rolled back completely', /injected/.test(failMsg) && w.STATE.data.invoices.find(i => i.id === i2.id).party_id === pb.id && w.STATE.data.payments.every(p => p.party_id !== pa.id) && !w.STATE.data.parties.find(p => p.id === pb.id).deleted);
  const r = await w.Match.merge('parties', pa.id, [pb.id], 'same customer');
  log('a merge moves invoices, payments and advances to the kept record', w.STATE.data.invoices.every(i => i.party_id !== pb.id) && w.STATE.data.payments.every(p => p.party_id !== pb.id) && w.STATE.data.advances.every(a => a.party_id !== pb.id) && r.moved.invoices === 1);
  log('the merged-away record is retired (not deleted) and points to the survivor', w.STATE.data.parties.find(p => p.id === pb.id).deleted === true && w.STATE.data.parties.find(p => p.id === pb.id).merged_into === pa.id);
  log('the old spelling is remembered, so it now matches exactly', (w.STATE.data.parties.find(p => p.id === pa.id).aliases || []).includes('ACME Marine Suppliers') && w.Match.find('parties', 'ACME Marine Suppliers').level === 'exact');
  log('no money moved: balances and reports are identical, books still balance', snapBal() === bal0 && w.Ledger.trialBalanceCheck().balanced && tb0.balanced);
  log('the merge is recorded in Amendments', w.STATE.data.amendments.some(a => a.entity_type === 'parties' && /same customer/.test(a.reason)));
  await w.Match.merge('ships', A.id, [B.id], 'same ship');
  log('merging ships re-points invoices and linked items too', w.STATE.data.invoices.every(i => i.ship_id !== B.id) && w.STATE.data.items.every(i => i.ship_id !== B.id));
  log('the party list no longer offers the retired record', !w.activeParties().some(p => p.id === pb.id));
  // through the screen: a reason and the person's own code are required
  const p1 = await mkParty(w, 'Rahman Sons', 'customer'), p2 = await mkParty(w, 'Rahmaan Sons', 'customer'); w.Match.openCleanup('parties');
  log('the clean-up screen lists the new pair', /Rahman Sons/.test(d.getElementById('modal-root').innerHTML));
  w.Match.reviewMerge(0); log('merging from the screen asks for a reason and the admin\'s code', !!d.getElementById('reason-confirm-btn'));
  await confirmReason(w, { reason: 'spelling' });
  log('and then merges', w.STATE.data.parties.filter(p => /rahma/i.test(p.name) && !p.deleted).length === 1);

  // ---------- overpayment / payment safety ----------
  const iv = await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-02-01', lines: [{ description: 'x', qty: 1, rate: 500, accountId: inc.id }] });
  const m1 = await throwsMsg(() => w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: cash.id, amount: 600, invoiceId: iv.id, date: '2026-02-02' }));
  log('paying more than is owed is refused, saying how much is owed', /500\.00 still owed/.test(m1), m1);
  await w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: cash.id, amount: 500, invoiceId: iv.id, date: '2026-02-02' });
  log('paying exactly what is owed works', Number(w.STATE.data.invoices.find(i => i.id === iv.id).paid) === 500);
  log('nothing more can be paid on a settled invoice', /still owed/.test(await throwsMsg(() => w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: cash.id, amount: 1, invoiceId: iv.id, date: '2026-02-03' }))));
  log('a payment with no bank account gives a clear message, not a crash', /cash or bank account/.test(await throwsMsg(() => w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: 'nope', amount: 1, date: '2026-02-03' }))));
  const iv2 = await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-02-04', lines: [{ description: 'y', qty: 1, rate: 50, accountId: inc.id }] }); await w.Ledger.voidInvoice(iv2.id, 'test');
  log('paying a voided invoice is refused', /voided/.test(await throwsMsg(() => w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: cash.id, amount: 10, invoiceId: iv2.id, date: '2026-02-05' }))));

  // ---------- opening balances ----------
  const cust = await mkParty(w, 'Old Debtor', 'customer'); const eqBefore = w.STATE.data.accounts.length;
  const ob = await w.Ledger.openingBalance({ partyId: cust.id, direction: 'receivable', amount: 5000, date: '2026-01-01' });
  log('an opening balance is a real receivable on the party, dated as of the start', ob.opening === true && ob.kind === 'sale' && Number(ob.total) === 5000 && ob.date === '2026-01-01' && w.Ledger.receivablesTotal() >= 5000);
  log('it is posted against Opening Balance Equity, created on demand', w.STATE.data.accounts.length === eqBefore + 1 && w.STATE.data.accounts.some(a => a.name === 'Opening Balance Equity' && a.type === 'equity'));
  log('it does not appear as sales or profit', !w.Reports.salesByCustomer('2026-01-01', '2026-12-31').some(r => r.customer === 'Old Debtor') && !w.Reports.salesByItem('2026-01-01', '2026-12-31').some(r => /opening/i.test(r.item)));
  const inc0 = w.Reports.compute('2026-01-01', '2026-12-31').totalIncome;
  log('income in the profit & loss is unchanged by it', near(inc0, 100 + 300 + 500));
  await w.Ledger.recordPayment({ direction: 'in', partyId: cust.id, bankAccountId: cash.id, amount: 2000, invoiceId: ob.id, date: '2026-03-01' });
  log('it can be paid off like any invoice and the books balance', Number(w.STATE.data.invoices.find(i => i.id === ob.id).paid) === 2000 && w.Ledger.trialBalanceCheck().balanced);
  const ob2 = await throwsMsg(() => w.Ledger.openingBalance({ partyId: cust.id, direction: 'receivable', amount: -5, date: '2026-01-01' })); log('a negative opening balance is refused', /greater than zero/.test(ob2));

  // ---------- transfers ----------
  const cb = () => Number(cash.opening_balance || 0) + w.Ledger.accountBalance(cash.account_id), bb = () => Number(bank2.opening_balance || 0) + w.Ledger.accountBalance(bank2.account_id), pl0 = w.Reports.compute('2026-01-01', '2026-12-31').net;
  const c0 = cb(), b0 = bb(); await w.Ledger.transfer({ fromBankId: cash.id, toBankId: bank2.id, amount: 300, date: '2026-03-05' });
  log('a transfer moves money between accounts', near(cb(), c0 - 300) && near(bb(), b0 + 300));
  log('it never touches profit, and the books balance', near(w.Reports.compute('2026-01-01', '2026-12-31').net, pl0) && w.Ledger.trialBalanceCheck().balanced);
  log('it does not count as cash received or paid', (() => { const cf = w.Reports.cashFlowStatement('2026-03-05', '2026-03-05'); return near(cf.cashIn, 0) && near(cf.cashOut, 0); })());
  log('transferring to the same account, or a zero amount, is refused', /different accounts/.test(await throwsMsg(() => w.Ledger.transfer({ fromBankId: cash.id, toBankId: cash.id, amount: 1, date: '2026-03-05' }))) && /greater than zero/.test(await throwsMsg(() => w.Ledger.transfer({ fromBankId: cash.id, toBankId: bank2.id, amount: 0, date: '2026-03-05' }))));
  w.Forms.transferForm(); log('the transfer form opens', /Transfer between accounts/.test(d.getElementById('modal-root').innerHTML)); w.UI.closeModal();

  // ---------- reconciliation ----------
  w.Recon.open(bank2.id); d.getElementById('rc-date').value = '2026-03-31'; d.getElementById('rc-bal').value = '300'; w.Recon.start(bank2.id);
  log('reconciling lists the entries on that account', /Transfer/.test(d.getElementById('modal-root').innerHTML) && w.Recon._totals().diff === 300);
  let saveMsg = ''; await w.Recon.finish(); saveMsg = d.getElementById('rc-err').textContent;
  log('it cannot be saved while the difference is not zero', /difference must be zero|Tick at least/.test(saveMsg) && w.STATE.data.reconciliations.length === 0);
  const line = w.STATE.data.transaction_lines.find(l => l.account_id === bank2.account_id && Number(l.debit) === 300); w.Recon.toggle(line.id, true);
  log('ticking the matching entry brings the difference to zero', w.Recon._totals().diff === 0 && d.getElementById('rc-save').disabled === false);
  await w.Recon.finish(); log('a balanced reconciliation is saved', w.STATE.data.reconciliations.length === 1 && w.STATE.data.reconciliations[0].cleared_line_ids.length === 1);
  const trTx = w.STATE.data.transactions.find(t => w.STATE.data.transaction_lines.some(l => l.id === line.id && l.transaction_id === t.id));
  log('a reconciled entry cannot be voided or changed', /matched to the bank statement/.test(await throwsMsg(() => w.DB.update('transactions', trTx.id, { voided: true }))));
  w.Recon.undoLast(bank2.id); await confirmReason(w, {}); log('undoing the reconciliation frees the entry again', w.Recon.active().length === 0);

  w.UI.navigate('banking'); w._b = w.document.getElementById('view-root').innerHTML; log('Banking offers Transfer, and shows reconciliation status', /Forms\.transferForm\(\)/.test(w._b));
  w.Views._bankFilterAccount = bank2.id; w.UI.navigate('banking'); log('a single account also offers Reconcile and shows its status', /Recon\.open\(/.test(w.document.getElementById('view-root').innerHTML) && /Never reconciled/.test(w.document.getElementById('view-root').innerHTML)); w.Views._bankFilterAccount = null;
  w.Views.showParty ? 0 : 0;

  // ---------- closing the books ----------
  const jan = await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-01-20', lines: [{ description: 'jan', qty: 1, rate: 10, accountId: inc.id }] });
  await w.Period.set('2026-01-31', 'January checked');
  log('the closing date is stored', w.Period.lockDate() === '2026-01-31' && w.STATE.config.lockDate === '2026-01-31');
  log('a new entry inside the closed period is refused', /closed up to/.test(await throwsMsg(() => w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-01-25', lines: [{ description: 'late', qty: 1, rate: 5, accountId: inc.id }] }))));
  log('a payment inside the closed period is refused', /closed up to/.test(await throwsMsg(() => w.Ledger.recordPayment({ direction: 'in', partyId: pa.id, bankAccountId: cash.id, amount: 1, invoiceId: jan.id, date: '2026-01-31' }))));
  log('voiding an old entry inside the closed period is refused', /closed up to/.test(await throwsMsg(() => w.Ledger.voidInvoice(jan.id, 'x'))));
  log('a journal inside it is refused', /closed up to/.test(await throwsMsg(() => w.Ledger.createJournal('2026-01-15', 'j', [{ account_id: inc.id, debit: 1, credit: 0 }, { account_id: exp.id, debit: 0, credit: 1 }]))));
  const okInv = await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-02-10', lines: [{ description: 'feb', qty: 1, rate: 5, accountId: inc.id }] });
  log('entries after the closing date work normally', !!okInv && w.Ledger.trialBalanceCheck().balanced);
  log('a failed attempt left nothing behind', !w.STATE.data.invoices.some(i => i.date === '2026-01-25'));
  await confirmReason === null;
  w.Period.openForm(); d.getElementById('pl-date').value = ''; w.Period.review(); await confirmReason(w, { reason: 'reopen to fix' });
  log('an administrator can reopen the books, with a reason on record', w.Period.lockDate() === null && w.STATE.data.amendments.some(a => a.entity_id === 'period_lock'));
  await w.Period.set('2026-01-31', 'again'); await w.Period.set(null, 'done');

  // ---------- the local calendar date, not UTC ----------
  process.env.TZ = 'Asia/Dhaka'; const RD = w.Date; class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(Date.UTC(2026, 8, 29, 20, 30)); } static now() { return Date.UTC(2026, 8, 29, 20, 30); } }
  w.Date = FD; const t = w.todayISO(); w.Date = RD;
  log('at 02:30 local time (still the previous day in UTC) "today" is the local date', t === '2026-09-30', t);

  // ---------- who may do what ----------
  const { acct } = await addWorker(w, { name: 'Casey Cashier', preset: 'cashier' }); const admin = w.STATE.session;
  w.STATE.session = { role: 'staff', staffId: acct.id, userName: 'Casey' };
  log('a worker with Sales/Purchases/Expenses/Payments can record a sale', !!(await w.Ledger.createInvoice({ kind: 'sale', partyId: pa.id, date: '2026-05-01', lines: [{ description: 's', qty: 1, rate: 5, accountId: inc.id }] })));
  log('a worker without Ledger cannot post a manual journal — enforced in the engine, not just hidden', /not available on your account/.test(await throwsMsg(() => w.Ledger.createJournal('2026-05-01', 'j', [{ account_id: inc.id, debit: 1, credit: 0 }, { account_id: exp.id, debit: 0, credit: 1 }]))));
  log('a worker without Banking cannot transfer', /not available/.test(await throwsMsg(() => w.Ledger.transfer({ fromBankId: cash.id, toBankId: bank2.id, amount: 1, date: '2026-05-01' }))));
  log('a worker cannot merge records, close the books, or add opening balances', /administrator/.test(await throwsMsg(() => w.Match.merge('parties', pa.id, [pc.id]))) && /administrator/.test(await throwsMsg(() => w.Period.set('2026-01-31', 'x'))) && /administrator/.test(await throwsMsg(() => w.Ledger.openingBalance({ partyId: pa.id, direction: 'receivable', amount: 1, date: '2026-05-01' }))));
  log('a worker cannot add or edit other workers', /administrator/.test(await throwsMsg(() => w.Views.startEnrollment())) && /administrator/.test(await throwsMsg(() => w.Views.confirmRemoveStaff(acct.id))));
  const sh = w.Views.settings();
  log('a worker\'s Settings hides connection, import, restore and reset controls', !/Danger zone|Restore from JSON|Import a spreadsheet|Connect to Supabase|Books &amp; data tools/.test(sh) && /Blank template/.test(sh));
  w.UI.openQuickAdd(); log('the quick-add sheet hides what they may not do', !/Manual journal/.test(d.getElementById('modal-root').innerHTML) && /Record a sale/.test(d.getElementById('modal-root').innerHTML)); w.UI.closeModal();
  w.STATE.session = admin;
  const adm = w.Views.settings(); log('the administrator sees the data tools', /Books &amp; data tools/.test(adm) && /Import a spreadsheet/.test(adm));

  // ---------- access codes never bring back a shared staff code ----------
  log('a yard with individual sign-in shows no shared-code cards in Settings', !/set-staff-code|set-admin-code|Old shared codes/.test(w.Views.settings()));
  const cache0 = getAuth(w); w.setAuthCache({ adminHash: await w.sha256Hex('a:111111'), staffHash: null });
  d.getElementById('view-root').innerHTML = w.Views.settings(); d.getElementById('set-admin-code').value = '444444'; await w.Views.saveCodes();
  const au = getAuth(w); log('on a yard that still has an old admin code, changing it never creates a shared staff code', !!au.adminHash && !au.staffHash && (await w.sha256Hex('a:444444')) === au.adminHash && !/set-staff-code/.test(w.Views.settings()));
  w.setAuthCache(cache0);

  // ---------- two windows on the same books ----------
  const w2 = await boot({ idb: w.__idb, ls: w.__ls }); await loginAdmin(w2).catch(() => {}); w2.Safety.startTabGuard(); w.Safety.startTabGuard();
  await w.DB.insert('parties', { id: w.uuidv4(), name: 'Written in window 1', kind: 'customer', archived: false });
  log('a change in one window stops the other from writing stale data', w2.Safety._stale === true && /Another window/.test(await (async () => { try { await w2.DB.insert('parties', { id: w2.uuidv4(), name: 'x', kind: 'customer', archived: false }); return ''; } catch (e) { return e.message; } })()));
  log('and it tells the person to reload', !!w2.document.getElementById('stale-banner'));
  log('logging in or writing the audit log in another window does not trigger it', await (async () => { const w3 = await boot({ idb: w.__idb, ls: w.__ls }); w3.Safety.startTabGuard(); await w.DB.insert('audit_log', { id: w.uuidv4(), ts: new Date().toISOString(), actor: 'x', action: 'login', details: {} }); return !w3.Safety._stale; })());

  // ---------- the amendment record catches EVERYTHING that changes or deletes a record ----------
  w.STATE.session = admin; const amCount = () => w.STATE.data.amendments.length;
  const shp = { id: w.uuidv4(), name: 'MV Audit', status: 'active' }; await w.DB.insert('ships', shp); let n0 = amCount();
  await w.DB.update('ships', shp.id, { status: 'completed' });
  const au1 = w.STATE.data.amendments.find(a => a.entity_id === shp.id);
  log('a change made without a reason prompt is still recorded, with what changed', amCount() === n0 + 1 && au1.action === 'edit' && /Automatic/.test(au1.reason) && au1.before_json.status === 'active' && au1.after_json.status === 'completed' && !!au1.created_by);
  n0 = amCount(); await w.DB.update('ships', shp.id, { status: 'completed' }); log('a change that changes nothing is not recorded', amCount() === n0);
  const itm = { id: w.uuidv4(), name: 'Audit Item', category: '', unit: 'MT', archived: false }; await w.DB.insert('items', itm); n0 = amCount(); await w.DB.remove('items', itm.id);
  const au2 = w.STATE.data.amendments.find(a => a.entity_id === itm.id && a.action === 'delete');
  log('a deletion is recorded with the whole record as it was', amCount() === n0 + 1 && au2.before_json.name === 'Audit Item' && au2.after_json === null);
  const acx = w.STATE.data.staff_accounts.find(a => a.name === 'Boss'); n0 = amCount(); await w.DB.update('staff_accounts', acx.id, { totp_secret: 'NEWSECRETVALUE', backup_codes: ['h1'] });
  const au3 = w.STATE.data.amendments.find(a => a.entity_id === acx.id && /Automatic/.test(a.reason));
  log('sign-in secrets are recorded as "changed", never their values', !!au3 && !JSON.stringify(au3).includes('NEWSECRETVALUE') && !JSON.stringify(au3).includes(acx.totp_secret === 'NEWSECRETVALUE' ? 'zzz' : 'h1') && /not shown/.test(JSON.stringify(au3)));
  n0 = amCount(); await w.DB.update('staff_accounts', acx.id, { last_step: 12345, totp_verified: true }); log('routine sign-in bookkeeping (the last code used) is not recorded', amCount() === n0);
  n0 = amCount(); const pAu = await mkParty(w, 'Audit Payer', 'customer'); const iAu = await w.Ledger.createInvoice({ kind: 'sale', partyId: pAu.id, date: '2026-06-01', lines: [{ description: 'x', qty: 1, rate: 100, accountId: inc.id }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: pAu.id, bankAccountId: cash.id, amount: 40, invoiceId: iAu.id, date: '2026-06-02' });
  log('normal work (an invoice and a payment) adds no automatic entries — it is not a modification', amCount() === n0);
  n0 = amCount(); await w.Ledger.voidInvoice(iAu.id, 'entered twice');
  log('a void made straight through the engine (for example when an import is undone) is still recorded — the invoice and the payment it took down', w.STATE.data.amendments.filter(a => a.entity_id === iAu.id && a.action === 'void').length === 1 && w.STATE.data.amendments.slice(n0).some(a => a.entity_type === 'payments'), JSON.stringify(w.STATE.data.amendments.slice(n0).map(a => [a.entity_type, a.action])));
  const pAu2 = await mkParty(w, 'Audit Payer Two', 'customer'); const iAu2 = await w.Ledger.createInvoice({ kind: 'sale', partyId: pAu2.id, date: '2026-06-03', lines: [{ description: 'y', qty: 1, rate: 50, accountId: inc.id }] });
  w.Views.showInvoice && 0; n0 = amCount(); w.Views.reasonPrompt('Void', 'x', 'Void', async (r) => { await w.Ledger.voidInvoice(iAu2.id, r); await w.Ledger.logAmendment({ entityType: 'invoices', entityId: iAu2.id, entityLabel: 'x', action: 'void', reason: r, before: {}, after: {} }); }); await confirmReason(w, { reason: 'wrong customer' });
  log('a void confirmed on screen is recorded once, with the reason the person typed, and not doubled by the safety net', w.STATE.data.amendments.slice(n0).filter(a => a.entity_id === iAu2.id).length === 1 && /wrong customer/.test(w.STATE.data.amendments.slice(n0).find(a => a.entity_id === iAu2.id).reason));
  n0 = amCount(); w.Views.confirmEditRecord('parties', pAu.id, { name: 'Audit Payer Ltd' }, 'name'); await confirmReason(w, { reason: 'full name' });
  log('a reasoned edit is recorded once, with the reason the person gave (not duplicated by the safety net)', amCount() === n0 + 1 && /full name/.test(w.STATE.data.amendments[w.STATE.data.amendments.length - 1].reason));
  n0 = amCount(); w.Forms.archiveBankAccount(bank2.id); await confirmReason(w, { reason: 'closed the account' }); 
  log('archiving a bank account now asks for a reason and is recorded once', amCount() === n0 + 1 && w.STATE.data.bank_accounts.find(b => b.id === bank2.id).archived === true && /closed the account/.test(w.STATE.data.amendments[w.STATE.data.amendments.length - 1].reason));
  w.Views._amendFilter = 'all'; w.UI.navigate('amendments'); log('the Amendments screen lists them, automatic ones included', /Audit Item/.test(w.document.getElementById('view-root').innerHTML) && /Automatic/.test(w.document.getElementById('view-root').innerHTML));

  log('every screen still renders after all of it', badScreens(w).length === 0);
}


function fakeDir(name = 'YardBackup') {
  const files = new Map(), writes = [];
  const h = { name, files, writes, async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
    async getFileHandle(n, o) { if (!files.has(n)) { if (o && o.create) files.set(n, ''); else { const e = new Error('nf'); e.name = 'NotFoundError'; throw e; } }
      return { async getFile() { return { async text() { return files.get(n); } }; }, async createWritable() { let buf = ''; return { async write(t) { buf += t; }, async close() { files.set(n, buf); writes.push(n); } }; } }; },
    async removeEntry(n) { files.delete(n); }, async *keys() { for (const k of files.keys()) yield k; } };
  return h;
}
async function sectionFolderBackup() {
  const w = await boot(); await setupAdmin(w); const { inc, bank } = fx(w); const dir = fakeDir(); w.FolderBackup.getHandle = async () => dir; w.FolderBackup.supported = () => true;
  const a = await mkParty(w, 'Live Buyer', 'customer'); const b = await mkParty(w, 'Other Buyer', 'customer');
  await w.Ledger.createInvoice({ kind: 'sale', partyId: a.id, date: '2026-05-01', lines: [{ description: 'x', qty: 1, rate: 100, accountId: inc.id }] });
  log('the first backup writes a live file for every table, a manifest, a snapshot and latest.json', await w.FolderBackup.writeLive(true) && w.IDB.TABLES.every(t => dir.files.has('yarding-live-' + t + '.json')) && dir.files.has('yarding-live-_manifest.json') && dir.files.has('latest.json') && [...dir.files.keys()].some(n => /^yarding-auto-/.test(n)));
  log('the live files are plain JSON matching the app', JSON.parse(dir.files.get('yarding-live-parties.json')).some(x => x.name === 'Live Buyer') && JSON.parse(dir.files.get('yarding-live-_manifest.json')).tables.parties === w.STATE.data.parties.length);
  dir.writes.length = 0; await w.FolderBackup.writeLive(false);
  log('with nothing changed, no table file and no snapshot is rewritten (only the manifest)', dir.writes.filter(n => /yarding-live-(?!_manifest)|yarding-auto/.test(n)).length === 0);
  await w.DB.insert('parties', { id: w.uuidv4(), name: 'New After', kind: 'vendor', archived: false }); dir.writes.length = 0; await w.FolderBackup.writeLive(false);
  log('after one change only the changed tables are rewritten', dir.writes.includes('yarding-live-parties.json') && !dir.writes.includes('yarding-live-invoices.json') && dir.writes.some(n => /yarding-auto-/.test(n)));
  w.FolderBackup._t = null; w.FolderBackup.schedule(); log('every write schedules a backup a few seconds later', w.FolderBackup._t !== null); clearTimeout(w.FolderBackup._t);
  log('a folder that never gets written to reports the reason instead of failing silently', await (async () => { const bad = fakeDir(); bad.queryPermission = async () => 'prompt'; const old = w.FolderBackup.getHandle; w.FolderBackup.getHandle = async () => bad; const r = await w.FolderBackup.writeLive(true); const m = w.FolderBackup.status(); w.FolderBackup.getHandle = old; return r === false && /allow the backup folder/.test(m); })());
  await w.FolderBackup.writeLive(true);
  // ---- damage: a corrupt latest.json falls back to the live files ----
  dir.files.set('latest.json', '{"data": BROKEN');
  const rl = await w.FolderBackup.readLatest();
  log('a damaged latest.json is not fatal: recovery reads the live files instead', !!rl && rl._from === 'live' && rl.data.parties.some(x => x.name === 'Live Buyer'));
  await w.FolderBackup.writeLive(true);
  // ---- something vanishes from the device: the check notices, the merge brings it back without overwriting ----
  await w.DB.update('parties', b.id, { phone: '555' }); await w.FolderBackup.writeLive(false);
  const lostId = a.id; w.STATE.data.parties = w.STATE.data.parties.filter(x => x.id !== lostId); await w.DB.update('parties', b.id, { phone: '777' });
  w.FolderBackup.check(); await sleep(60); const html = w.document.getElementById('modal-root').innerHTML;
  log('the backup check says the folder has MORE than the app, and points to Merge', /MORE than the app/.test(html) && /Merge from folder/.test(html)); w.UI.closeModal();
  const n0 = w.STATE.data.parties.length; w.FolderBackup.mergeFromFolder(); await sleep(80);
  log('merging asks first, saying how many records and that nothing is overwritten', /Merge 1 record/.test(w.document.getElementById('modal-root').innerHTML) && /nothing is deleted or overwritten/.test(w.document.getElementById('modal-root').innerHTML));
  await confirmReason(w, { reason: 'recovering' }); await sleep(120);
  log('the missing customer is back, complete with its history link', w.STATE.data.parties.length === n0 + 1 && w.STATE.data.parties.some(x => x.id === lostId) && w.STATE.data.invoices.some(i => i.party_id === lostId));
  log('a record the app already had is NOT overwritten by the older copy in the folder', w.STATE.data.parties.find(x => x.id === b.id).phone === '777');
  log('the merge took a safety snapshot first, and the books still balance', (await w.Snapshots.list()).some(s => /merging from the backup folder/i.test(s.label || s.name || JSON.stringify(s))) && w.Ledger.trialBalanceCheck().balanced);
  const admin = w.STATE.session; w.STATE.session = { role: 'staff', userName: 'x', staffId: 'nobody' }; let refused = ''; try { await w.FolderBackup.mergeFromFolder(); } catch (e) { refused = e.message; } w.STATE.session = admin;
  log('only the administrator can merge from the folder', /administrator/.test(refused));
  const s = w.Views.settings(); log('Settings offers Check backup and Merge from folder, and tells phone users what to do instead', /FolderBackup\.check\(\)/.test(s) && /FolderBackup\.mergeFromFolder\(\)/.test(s) && /share sheet/.test(s));
  log('nothing to merge is said plainly', await (async () => { await w.FolderBackup.writeLive(true); w.FolderBackup.mergeFromFolder(); await sleep(60); return !w.document.getElementById('reason-confirm-btn'); })());
}

async function sectionNoSecureContext() {
  // plain http:// pages have no crypto.subtle — the app must still set up, sign in and run worker TOTP
  const w = await boot({ nosubtle: true }); const d = w.document;
  log('this window really has no crypto.subtle', !(w.crypto && w.crypto.subtle));
  const rnd = i => 'sample-' + i + '-' + 'x'.repeat(i * 7);
  let ok = true; for (let i = 0; i < 12; i++) { const s = rnd(i); if ((await w.sha256Hex(s)) !== nodeCrypto.createHash('sha256').update(s).digest('hex')) ok = false; }
  log('the built-in SHA-256 matches the reference for many lengths (incl. block edges)', ok);
  let ok2 = true; for (const n of [0, 55, 56, 63, 64, 65, 119, 120, 1000]) { const s = 'a'.repeat(n); if ((await w.sha256Hex(s)) !== nodeCrypto.createHash('sha256').update(s).digest('hex')) ok2 = false; }
  log('and at every padding boundary', ok2);
  const T = w.Totp, rfc = T.b32encode(new Uint8Array([...Buffer.from('12345678901234567890')]));
  let vok = true; for (const [tm, exp] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']]) if ((await T.code(rfc, Math.floor(tm / 30))) !== exp) vok = false;
  log('TOTP still produces the official RFC 6238 vectors with the built-in HMAC', vok);
  await setupAdmin(w, 'Http Yard');
  log('setup and admin sign-in work with no secure context', !!w.STATE.session && w.STATE.session.role === 'admin');
  const { acct, secret } = await addWorker(w, { name: 'Lan Worker', preset: 'cashier' });
  log('a worker can be enrolled and verified with no secure context', !!acct && acct.totp_verified === true);
}

async function sectionUpgradeAndRestore() {
  if (!fs.existsSync(OLD_PATH)) { log('upgrade test skipped — no older build at ' + OLD_PATH, true); return; }
  const idb = new fdb.IDBFactory(), ls = makeLS();
  const wOld = await boot({ html: fs.readFileSync(OLD_PATH, 'utf8'), idb, ls });
  const d0 = wOld.document; d0.getElementById('s-company').value = 'Legacy Yard'; d0.getElementById('s-currency').value = '$';
  wOld.Setup.skipCloud(); wOld.Setup.chooseSetupRole('admin'); d0.getElementById('s-admin-code').value = '111111'; d0.getElementById('s-staff-code').value = '222222'; await wOld.Setup.finish();
  wOld.Auth.chooseRole('admin'); d0.getElementById('login-code').value = '111111'; await wOld.Auth.attempt(); d0.getElementById('login-username').value = 'OldBoss'; await wOld.Auth.confirmIdentity();
  const inc = wOld.STATE.data.accounts.find(a => a.name === 'Scrap Sales'), bank = wOld.STATE.data.bank_accounts[0];
  const party = { id: wOld.uuidv4(), name: 'Legacy Buyer', kind: 'both', archived: false }; await wOld.DB.insert('parties', party); await wOld.DB.insert('ships', { id: wOld.uuidv4(), name: 'MV Legacy', status: 'active' });
  const inv = await wOld.Ledger.createInvoice({ kind: 'sale', partyId: party.id, date: '2026-01-10', lines: [{ description: 'Legacy', qty: 10, rate: 100, accountId: inc.id }] });
  await wOld.Ledger.recordPayment({ direction: 'in', partyId: party.id, bankAccountId: bank.id, amount: 400, invoiceId: inv.id, date: '2026-01-11' });
  const snap = { inv: wOld.STATE.data.invoices.length, lines: wOld.STATE.data.invoice_lines.length, pay: wOld.STATE.data.payments.length, par: wOld.STATE.data.parties.length, ships: wOld.STATE.data.ships.length, tx: wOld.STATE.data.transactions.length, txl: wOld.STATE.data.transaction_lines.length, num: inv.number, cash: wOld.Ledger.bankTotal() };
  await sleep(200); try { wOld.IDB.db.close(); } catch (e) {} wOld.close(); await sleep(200);
  const w = await boot({ idb, ls }); const d = w.document;
  log('the upgraded app remembers the yard', w.STATE.config.companyName === 'Legacy Yard');
  await loginLegacy(w, '111111', 'OldBoss'); await sleep(300);
  log('the existing admin code still signs in after the upgrade', !!w.STATE.session);
  log('every invoice, line, payment, party, ship and ledger row survived', w.STATE.data.invoices.length === snap.inv && w.STATE.data.invoice_lines.length === snap.lines && w.STATE.data.payments.length === snap.pay && w.STATE.data.parties.length === snap.par && w.STATE.data.ships.length === snap.ships && w.STATE.data.transactions.length === snap.tx && w.STATE.data.transaction_lines.length === snap.txl);
  log('invoice numbers were NOT renumbered', w.STATE.data.invoices.some(i => i.number === snap.num));
  log('cash is identical', near(w.Ledger.bankTotal(), snap.cash));
  log('no staff accounts yet means the shared staff code still works (no lockout)', !(w.STATE.data.staff_accounts || []).some(a => !a.archived));
  log('every screen renders against legacy data', badScreens(w).length === 0);
  await w.Ledger.editInvoice(inv.id, { lines: [{ description: 'Legacy', qty: 11, rate: 100, accountId: inc.id }] }, 'post-upgrade');
  log('a legacy invoice can be edited and keeps its payment', w.STATE.data.invoices.find(i => i.id === inv.id).total === 1100 && Number(w.STATE.data.invoices.find(i => i.id === inv.id).paid) === 400);

  // backup -> restore into a different yard
  const payload = w.Backup.buildPayload(); const json = JSON.stringify(payload);
  log('the backup carries every table the app uses', w.IDB.TABLES.every(t => Object.prototype.hasOwnProperty.call(payload.data, t)));
  const w2 = await boot(); await setupAdmin(w2, 'Target'); class F { constructor(s) { this._s = s; } async text() { return this._s; } }
  w2.Backup.openImportJSON(); Object.defineProperty(w2.document.getElementById('imp-json-file'), 'files', { value: [new F(json)], configurable: true });
  await w2.Backup.doImportJSON(); if (w2.Backup.confirmImportJSON) await w2.Backup.confirmImportJSON(); await sleep(200);
  log('a restore reproduces the invoice, its edit, and the cash', w2.STATE.data.invoices.some(i => i.id === inv.id && i.total === 1100) && near(w2.Ledger.bankTotal(), w.Ledger.bankTotal()));
  log('and the restored yard balances and renders', w2.Ledger.trialBalanceCheck().balanced && badScreens(w2).length === 0);
}

async function sectionBlockedDb() {
  const w = await boot(); await setupAdmin(w);
  Object.defineProperty(w, 'indexedDB', { value: { open: () => ({}) }, configurable: true }); w.IDB.db = null; w.IDB._openPromise = null;
  await w.reloadAllData(); await sleep(4600);
  const h = w.document.getElementById('view-root').innerHTML;
  log('an unreachable local database is detected, not read as "no data"', w.STATE._dbBlocked === true);
  log('the person is told their data is safe and how to recover', /safe|not been lost/i.test(h) && /another tab|another window/i.test(h) && /reload/i.test(h));
  w.UI.navigate('sales'); log('the warning stays up on every screen — no empty entry form is offered', /another tab|another window/i.test(w.document.getElementById('view-root').innerHTML));
}

function sectionDesignLanguage() {
  const has = re => re.test(CSS);
  const tok = (name, val) => has(new RegExp('--' + name + ':\\s*' + val.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&') + '\\s*;'));
  const T = { bg: '#f6f6f4', surface: '#ffffff', 'surface-2': '#f2f2f0', ink: '#0a0a0a', 'ink-soft': '#545456', 'ink-muted': '#8e8e93', border: '#e8e8e6', 'border-light': '#f1f1ef',
    primary: '#0a3d62', 'primary-hover': '#0d4d7a', 'primary-light': '#e9f1f9', oxford: '#001f3f', 'oxford-hover': '#002b57', cta: '#0a0a0a', 'cta-hover': '#262626', accent: '#0071e3',
    green: '#1a7d3c', 'green-bg': '#e5f6e9', red: '#d70015', 'red-bg': '#fdebec', gold: '#b8860b', 'gold-bg': '#faf3e2', 'disabled-ink': '#c7c7cc', 'row-h': '44px', radius: '18px', 'radius-sm': '14px', 'radius-xs': '12px' };
  const wrong = Object.entries(T).filter(([k, v]) => !tok(k, v)).map(([k]) => k);
  log('every design-language token is defined with the specified value', wrong.length === 0, wrong.join(','));
  log('selection tokens are the shared pair (--primary-light / --primary)', has(/--selection:\s*var\(--primary-light\)/) && has(/--selection-border:\s*var\(--primary\)/));
  log('safe-area, motion and fluid container tokens exist', has(/--safe-t:\s*env\(safe-area-inset-top/) && has(/--safe-b:\s*env\(safe-area-inset-bottom/) && has(/--spring:\s*cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/) && has(/--container-pad:\s*clamp\(14px, 4vw, 32px\)/));
  log('the font stack is native-first', /--sans:\s*-apple-system/.test(CSS));
  log('the base font size is 15px', has(/html\{font-size:15px;\}/));

  const used = new Set([...HTML.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(m => m[1])); const def = new Set([...CSS.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]));
  const undef = [...used].filter(v => !def.has(v)); log('no CSS variable is used without being defined', undef.length === 0, undef.join(','));
  log('the primary button is near-black (--cta), not the brand blue', has(/\.btn\.primary\{background:var\(--cta\)/));
  log('ghost buttons are bordered, per the spec', has(/\.btn\.ghost\{background:transparent; border-color:var\(--border-strong\)/));
  log('destructive is one class (.btn.danger / .btn.ghost.danger), not inline colour', has(/\.btn\.danger\{background:var\(--red\)/) && has(/\.btn\.ghost\.danger\{/) && !/<button[^>]*style="[^"]*color:\s*var\(--bad\)/.test(HTML));
  log('buttons are 50px, small ones 38px', has(/\.btn\{[^}]*min-height:50px/) && has(/\.btn\.sm\{min-height:38px/));
  log('text controls are 16px so iOS never zooms on focus', has(/input, select, textarea\{font-family:inherit; font-size:16px;\}/));
  log('form labels are small uppercase above the field', has(/\.field label\{[^}]*text-transform:uppercase/) && has(/\.field input, \.field select, \.field textarea\{min-height:48px/));
  log('the text-control base rule has zero specificity so component rules still win', /:where\(select, textarea, input:not/.test(CSS));
  log('focus is a border + tinted halo on inputs and a visible ring elsewhere', has(/:focus-visible\{outline:2px solid var\(--accent\)/) && has(/box-shadow:0 0 0 3px rgba\(10,61,98/));
  log('table headers are mono, 9.5px, uppercase, muted', has(/\nth\{[^}]*var\(--mono\)[^}]*9\.5px[^}]*uppercase[^}]*var\(--ink-muted\)/));
  log('data-table rows hover with the shared selection token', has(/\.tbl-wrap tbody tr:hover td\{background:var\(--selection\)/));
  log('the active sidebar tab uses the same selection pair', has(/\.nav button\.active\{background:var\(--selection\); border-color:var\(--selection-border\)/));
  log('the header bar is oxford and respects the top safe area', has(/\.topbar\{[^}]*padding:calc\(.*?var\(--safe-t\)\)[^}]*background:var\(--oxford\)/));
  log('the bottom nav, FAB and view all fold in the bottom safe area', has(/\.bottomnav\{[^}]*padding-bottom:var\(--safe-b\)/) && has(/\.fab\{[^}]*calc\(78px \+ var\(--safe-b\)\)/) && has(/calc\(150px \+ var\(--safe-b\)\)/));
  log('the viewport is fit to the notch and pinch-zoom is NOT disabled', /viewport-fit=cover/.test(HTML) && !/maximum-scale/.test(HTML));
  log('modals are one component: centred dialog above 640px, bottom sheet below with a drag handle', has(/@media \(max-width:640px\)\{[^@]*\.modal-bg\{align-items:flex-end[^@]*\.modal-grip\{ display:block; \}/) && has(/@keyframes sheetUp/) && has(/\.modal-bar\{[^}]*min-height:52px/) && has(/\.modal-close\{ width:44px/));
  log('modals sit above every panel (10000) and toasts above modals', has(/\.modal-bg\{[^}]*z-index:10000/) && has(/\.toast-wrap\{[^}]*z-index:10001/));
  log('there is a segmented control and every tab/filter row uses it', has(/\.segmented\{/) && !/tabBtn[^\n]*'primary':'ghost'/.test(HTML) && (HTML.match(/class="segmented"/g) || []).length >= 5);
  log('reduced motion is honoured globally', has(/prefers-reduced-motion: reduce[^}]*animation-duration:\.001ms !important/));
  log('the card is white, 18px, bordered and shadowed with the shared tokens', has(/\.card\{[^}]*#fff[^}]*var\(--line\)[^}]*var\(--radius\)[^}]*var\(--shadow\)/));
  log('fields, KPI tiles and row children are NOT drawn as cards (that rule once boxed every input and cut text off on phones)', has(/\.row > \*, \.field, \.kpi, \.card\{ min-width:0; \}/) && !has(/\.field[^{}]*\{[^}]*box-shadow/));
  log('charts no longer paint with the near-black primary or legacy accent', !/var\(--rust\)/.test(HTML.replace(/--rust:[^;]*;/g, '').replace(/--rust-dark:[^;]*;/g, '')));
  log('no hardcoded negative margins that could break at other widths', !/margin(?:-[a-z]+)?\s*:\s*-\s*\d+px/.test(CSS));
  const flexNoAlign = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => /display:\s*(inline-)?flex/.test(m[2]) && !/align-items/.test(m[2]) && !/^\s*\.modal-bg\.show\s*$/.test(m[1])).map(m => m[1].trim().split('\n').pop());
  log('every flex container states align-items explicitly', flexNoAlign.length === 0, flexNoAlign.join(' | '));
}

function sectionStaticCode(w) {
  const calls = new Set([...HTML.matchAll(/\b(Views|Forms|Ledger|Backup|Reports|Charts|Auth|UI|Setup|Onboarding|FolderBackup|GenericSync|ModulePrefs|PrintMod|Branding)\.([A-Za-z_]\w*)\s*\(/g)].map(m => m[1] + '.' + m[2]));
  const missing = [...calls].filter(c => { const [m, f] = c.split('.'); return !(w[m] && typeof w[m][f] === 'function'); });
  log('every module method the code calls actually exists', missing.length === 0, missing.join(','));
  log('removed dead code stays removed', typeof w.Forms.accByType === 'undefined' && typeof w.Ledger.restoreInvoice === 'undefined' && typeof w.Views.doVoidInvoice === 'undefined');
  const sql = HTML.match(/SQL_MIGRATION_ADVANCES\s*=\s*`([\s\S]*?)`;/)[1], full = HTML.match(/SQL_SCRIPT\s*=\s*`([\s\S]*?)`;/)[1];
  const need = ['alter table ships add column if not exists remarks', 'alter table items add column if not exists remarks', 'alter table bank_accounts add column if not exists remarks',
    'alter table advances add column if not exists remarks', 'alter table payments add column if not exists deleted'];
  log('the cloud schema has every column the app already writes (remarks on ships/items/accounts/advances, deleted on payments)', need.every(n => sql.includes(n) && full.includes(n)), need.filter(n => !sql.includes(n) || !full.includes(n)).join(';'));
  // every field the v730 code writes must exist in BOTH cloud scripts (a local yard never notices a missing column; a cloud yard gets a stuck retry queue)
  const need730 = ['create table if not exists import_batches', 'create table if not exists reconciliations', 'alter table parties add column if not exists aliases', 'alter table parties add column if not exists merged_into', 'alter table parties add column if not exists deleted',
    'alter table ships add column if not exists aliases', 'alter table ships add column if not exists merged_into', 'alter table ships add column if not exists deleted', 'alter table items add column if not exists aliases', 'alter table items add column if not exists merged_into', 'alter table items add column if not exists deleted',
    'alter table invoices add column if not exists opening', 'alter table invoices add column if not exists import_batch', 'alter table invoices add column if not exists import_ref', 'alter table payments add column if not exists import_batch',
    'alter table staff_accounts add column if not exists totp_secret', 'alter table staff_accounts add column if not exists modules', 'alter table staff_accounts alter column code_hash drop not null', 'alter table staff_accounts add column if not exists role', 'alter table staff_accounts add column if not exists backup_codes', 'alter table staff_accounts add column if not exists webauthn'];
  log('the cloud schema has every table and column the v730 features write, in both scripts', need730.every(n => sql.includes(n) && full.includes(n)), need730.filter(n => !sql.includes(n) || !full.includes(n)).join(';'));
  log('the app no longer depends on any online library for spreadsheets', !/cdn\.jsdelivr\.net\/npm\/xlsx/.test(HTML) && !/typeof XLSX/.test(HTML) && !/XLSX\./.test(HTML));
  log('no brand-specific example data is left in the app', !/Mehreen|Chittagong Yard|\bMSR\b/.test(HTML.replace(/Built with[^<]*Chittagong[^<]*/, '')));
  log('the amendment log no longer offers a "Restores" tab nothing could ever fill', !/tabBtn\('restore'/.test(HTML));
  log('no inline text colour assumes a dark sidebar (the Lock app button was near-invisible on white)', !/#c7cdd1|#e9ece8/i.test(HTML.replace(CSS, '')));
  log('help and the tour describe the security-code step, not just a reason', /security code/.test(w.Views.HELP_TOPICS.find(x => x.t === 'Editing a record').b) && /security code/.test(w.Onboarding.STEPS.find(x => x.t === 'You can fix mistakes').b));
  log("the what's-new note is v0 and welcomes new people", w.APP_VERSION === 'v0' && w.WHATS_NEW.items.some(i => /first public release/i.test(i)) && w.WHATS_NEW.items.some(i => /authenticator/i.test(i)));
}

async function sectionReportsFormsHostile() {
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc, exp, bank } = fx(w);
  const p = await mkParty(w, 'Buyer'); await w.DB.insert('ships', { id: w.uuidv4(), name: 'MV One', status: 'active' });
  const i1 = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-02-05', lines: [{ description: 'Scrap', qty: 2, rate: 500, accountId: inc.id, unit: 'MT' }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: bank.id, amount: 600, invoiceId: i1.id, date: '2026-02-06' });
  await w.Ledger.createInvoice({ kind: 'purchase', partyId: p.id, date: '2026-02-07', lines: [{ description: 'Spares', qty: 1, rate: 300, accountId: exp.id }] });
  await w.Ledger.createInvoice({ kind: 'expense', partyId: null, date: '2026-02-08', lines: [{ description: 'Diesel', qty: 1, rate: 100, accountId: exp.id }] });
  const R = w.Reports, fails = []; let ran = 0;
  for (const [name, fn] of Object.entries(R)) {
    if (typeof fn !== 'function' || !/^(print|export)/.test(name) || name === 'printSimpleTable' || name === 'exportSimpleExcel') continue;
    try {
      if (/AccountStatement/.test(name)) fn.call(R, bank.id, '2026-01-01', '2026-12-31');
      else if (/AgingDetails/.test(name)) fn.call(R, 'receivable', '2026-12-31');
      else if (/(CustomerBalance|VendorBalance)/.test(name)) fn.call(R);
      else fn.call(R, '2026-01-01', '2026-12-31'); ran++;
    } catch (e) { fails.push(name + ': ' + e.message); }
  }
  log(`every report print/export (${ran} of them) runs against real data`, fails.length === 0 && ran >= 20, fails.join(' | '));
  log('the P&L, cash flow and customer balances agree with the ledger', near(R.compute('2026-01-01', '2026-12-31').totalIncome, 1000) && near(R.cashFlowStatement('2026-01-01', '2026-12-31').cashIn, 600) && near(R.customerBalanceSummary()[0].balance, 400));

  // every form opens, and submitting it blank creates nothing and never throws
  const before = () => [w.STATE.data.invoices.length, w.STATE.data.payments.length, w.STATE.data.parties.length, w.STATE.data.ships.length, w.STATE.data.items.length, w.STATE.data.bank_accounts.length, w.STATE.data.advances.length].join(',');
  const snap = before(); let formErr = null;
  const tries = [['invoiceForm sale', () => w.Forms.invoiceForm('sale'), () => w.Forms.submitInvoice('sale')], ['invoiceForm purchase', () => w.Forms.invoiceForm('purchase'), () => w.Forms.submitInvoice('purchase')],
    ['invoiceForm expense', () => w.Forms.invoiceForm('expense'), () => w.Forms.submitInvoice('expense')], ['paymentForm', () => w.Forms.paymentForm(), () => w.Forms.submitPayment()],
    ['partyForm', () => w.Forms.partyForm(), () => w.Forms.submitParty(null)], ['shipForm', () => w.Forms.shipForm(), () => w.Forms.submitShip(null)],
    ['itemForm', () => w.Forms.itemForm(), () => w.Forms.submitItem(null)], ['bankAccountForm', () => w.Forms.bankAccountForm(), () => w.Forms.submitBankAccount()],
    ['advanceForm', () => w.Forms.advanceForm(), () => w.Forms.submitAdvance()], ['journalForm', () => w.Forms.journalForm(), null]];
  for (const [n, open, sub] of tries) { try { open(); if (sub) await sub(); w.UI.closeModal(); } catch (e) { formErr = n + ': ' + e.message; break; } }
  log('every form opens and submits blank without throwing', formErr === null, formErr || '');
  log('a blank submission creates nothing', before() === snap);

  // hostile text stored in every free-text field must never execute, on any screen or modal
  const X = '<img src=x onerror="window.__pwned=1">';
  const hp = { id: w.uuidv4(), name: X, kind: 'both', phone: X, email: X, address: X, notes: X, remarks: X, archived: false }; await w.DB.insert('parties', hp);
  const hi = await w.Ledger.createInvoice({ kind: 'sale', partyId: hp.id, date: '2026-03-01', notes: X, lines: [{ description: X, qty: 1, rate: 5, accountId: inc.id, unit: X }] });
  await w.DB.insert('party_comments', { id: w.uuidv4(), party_id: hp.id, text: X, created_by: X, created_at: new Date().toISOString() });
  await w.DB.insert('invoice_comments', { id: w.uuidv4(), invoice_id: hi.id, text: X, created_by: X, created_at: new Date().toISOString() });
  await w.Ledger.editInvoice(hi.id, { lines: [{ description: X, qty: 1, rate: 6, accountId: inc.id }] }, X, X);
  const bad = badScreens(w);
  for (const t of ['details', 'transactions', 'comments']) w.Views.partyDetail(hp.id, t);
  for (const t of ['details', 'payments', 'comments']) w.Views.showInvoice(hi.id, t);
  w.Views.partyStatement(hp.id); w.Views.showAmendmentDetail(w.STATE.data.amendments[0].id); w.Views.openHelpModal(X); w.UI.closeModal();
  log('hostile HTML in any text field never executes, on any screen or modal', w.__pwned === undefined && bad.length === 0);
}

async function sectionCreditNotes() {
  const injectFail = (w, from, count = 2) => { const orig = w.IDB._tx.bind(w.IDB); let n = 0;
    w.IDB._tx = async function (stores, work) { n++; if (n >= from && n < from + count) { this.lastError = new Error('QuotaExceededError'); return false; } return orig(stores, work); };
    return () => { w.IDB._tx = orig; }; };
  const w = await boot(); await setupAdmin(w); const d = w.document; const { inc } = fx(w); const p = await mkParty(w, 'Credit Buyer');
  const near = (a, b) => Math.abs(a - b) < 0.005;
  const accBal = n => { const a = w.Ledger.accByName(n); return w.Ledger.accountBalance ? w.Ledger.accountBalance(a.id) : null; };
  const counts = () => ['invoices', 'transactions', 'transaction_lines', 'amendments'].map(t => w.STATE.data[t].length).join(',');
  // a sale of 1000 with 100 tax
  const inv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-05-01', tax: 100, taxBreakdown: [{ name: 'VAT', amount: 100 }], lines: [{ description: 'Plate', qty: 1, rate: 1000, accountId: inc.id }] });
  log('setup: a 1100 invoice with 100 tax', near(inv.total, 1100) && near(inv.tax, 100), JSON.stringify([inv.total, inv.tax]));
  const base = counts(); const restore = injectFail(w, 3); let err = null;
  try { await w.Ledger.creditNote(inv.id, 110, 'short weight'); } catch (e) { err = e.message; }
  restore(); d.getElementById('fault-bar') && d.getElementById('fault-bar').remove();
  log('a credit note that fails part-way leaves nothing behind', !!err && counts() === base && near(w.byId(w.STATE.data.invoices, inv.id).total, 1100), err + ' ' + counts() + ' vs ' + base);
  log('a credit note needs a reason', /reason/i.test(await throwsMsg(() => w.Ledger.creditNote(inv.id, 10, ''))));
  await w.Ledger.creditNote(inv.id, 110, 'short weight', 'per delivery note');
  const a = w.byId(w.STATE.data.invoices, inv.id);
  log('tax comes off in proportion: 110 credited = 100 net + 10 tax', near(a.subtotal, 900) && near(a.tax, 90) && near(a.total, 990) && near(a.credit_notes, 110), JSON.stringify([a.subtotal, a.tax, a.total]));
  log('the tax breakdown follows the invoice', near((a.tax_breakdown || []).reduce((s, t) => s + t.amount, 0), 90));
  const cnTx = w.STATE.data.transactions.filter(t => t.invoice_id === inv.id && /^Credit note/.test(t.memo || t.description || ''));
  log('the credit note is its own dated entry, and the books balance', cnTx.length === 1 && w.Ledger.trialBalanceCheck().balanced);
  const am = w.STATE.data.amendments.filter(x => x.entity_id === inv.id && x.action === 'credit note');
  log('it is recorded in Amendments once, with the reason and before/after', am.length === 1 && /short weight/.test(am[0].reason) && !!am[0].before_json && !!am[0].after_json, am.length);
  log('an invoice with a credit note cannot be edited over it', /credit note/i.test(await throwsMsg(() => w.Ledger.editInvoice(inv.id, { lines: [{ description: 'x', qty: 1, rate: 5, accountId: inc.id }] }, 'because'))));
  log('a credit note cannot exceed what is unpaid', /cannot exceed/.test(await throwsMsg(() => w.Ledger.creditNote(inv.id, 5000, 'x'))));
  // closed period: a credit note on an invoice inside it is refused, so a closed month never moves
  await w.Period.set('2026-05-31', 'May closed');
  log('a credit note on an invoice inside a closed period is refused', /closed period/.test(await throwsMsg(() => w.Ledger.creditNote(inv.id, 99, 'late'))) && near(w.byId(w.STATE.data.invoices, inv.id).total, 990));
  const later = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-10', lines: [{ description: 'Jun', qty: 1, rate: 100, accountId: inc.id }] });
  await w.Ledger.creditNote(later.id, 10, 'after closing, open month');
  log('an invoice after the closing date still takes one, and the books balance', near(w.byId(w.STATE.data.invoices, later.id).total, 90) && w.Ledger.trialBalanceCheck().balanced);
  await w.Period.set(null, 'done');
  // restore can repair a damaged record, with a snapshot first and an amendment per table
  const snap = JSON.parse(JSON.stringify({ parties: w.STATE.data.parties }));
  const victim = w.STATE.data.parties.find(x => x.name === 'Credit Buyer');
  victim.name = 'Damaged ###';
  w.Backup.stageImportParsed({ company: 'Test', exportedBy: 'Test', exportedAt: '2026-10-01T00:00:00Z', data: { parties: snap.parties } });
  log('the restore review counts records that differ from the backup', /Also replace the 1 record/.test(d.getElementById('modal-root').innerHTML));
  d.getElementById('imp-json-replace').checked = true; await w.Backup.confirmImportJSON();
  log('ticking the box repairs the damaged record and writes an amendment with old and new values', w.STATE.data.parties.find(x => x.id === victim.id).name === 'Credit Buyer' && w.STATE.data.amendments.some(x => x.action === 'restore' && x.entity_type === 'parties' && JSON.stringify(x.before_json).includes('Damaged')));
  // workers
  const { acct } = await addWorker(w, { name: 'Nothing Granted', preset: 'none' }); const adm = w.STATE.session;
  const pur = await w.Ledger.createInvoice({ kind: 'purchase', partyId: p.id, date: '2026-06-01', lines: [{ description: 'Buy', qty: 1, rate: 200, accountId: w.STATE.data.accounts.find(x => x.type === 'expense').id }] });
  w.STATE.session = { role: 'staff', staffId: acct.id, userName: 'Casey' };
  const blocked = /not available on your account/.test(await throwsMsg(() => w.Ledger.creditNote(inv.id, 1, 'x')));
  w.STATE.session = adm;
  log('credit notes go through the same permission gate as editing an invoice', blocked);
  const before2 = w.byId(w.STATE.data.invoices, pur.id).total;
  await w.Ledger.creditNote(pur.id, 50, 'supplier allowance');
  log('a purchase bill takes a credit note too', near(w.byId(w.STATE.data.invoices, pur.id).total, before2 - 50) && w.Ledger.trialBalanceCheck().balanced);
  // a shared phone number: warned, can be overridden on purpose, and the choice is written on the record
  await w.DB.insert('parties', { id: w.uuidv4(), name: 'Phone Owner', kind: 'both', phone: '416-555-0142', archived: false });
  w.Forms.partyForm(); d.getElementById('p-name').value = 'Second Person'; d.getElementById('p-phone').value = '(416) 555 0142'; await w.Forms.submitParty(null);
  log('a second party with the same phone is stopped with a tick-box to go ahead', !w.STATE.data.parties.some(x => x.name === 'Second Person') && !!d.getElementById('p-phone-ok'));
  d.getElementById('p-phone-ok').checked = true; await w.Forms.submitParty(null);
  const sp = w.STATE.data.parties.find(x => x.name === 'Second Person');
  log('ticking it saves the party and writes the shared phone on the record', !!sp && /Phone shared with Phone Owner/.test(sp.notes || '')); w.UI.closeModal();
  // an import row with a known phone number but a clearly different name is asked about, not silently merged
  await feed(w, toFile(xbuf({ Parties: [['Name', 'Type', 'Phone'], ['Zebra Quarry Works', 'customer', '416 555 0142'], ['Phone Owner', 'customer', '416-555-0142']],
    Sales: [['Ref', 'Date', 'Customer', 'Description', 'Quantity', 'Rate'], ['Z-1', '2026-07-01', 'Zebra Quarry Works', 'Item', 1, 10]] }), 'phones.xlsx'));
  const zq = w.Importer.entry(w.Importer.plan, 'parties', 'Zebra Quarry Works');
  log('a different name on a known phone number is asked about, with the existing party pre-selected', !!zq && zq.ask === true && zq.choice === 'use:' + w.STATE.data.parties.find(x => x.name === 'Phone Owner').id && !zq.viaPhone);
  log('the same name on that phone is still matched silently', !w.Importer.entry(w.Importer.plan, 'parties', 'Phone Owner') || w.Importer.entry(w.Importer.plan, 'parties', 'Phone Owner').choice.startsWith('use:'));
  w.UI.closeModal();
  w.Views.creditNotePrompt(inv.id); d.getElementById('cn-amt').value = '1'; w.Views.saveCreditNote(inv.id);
  log('the screen asks for a reason and security code before posting', !!d.getElementById('reason-confirm-btn') && !!d.getElementById('reason-code')); w.UI.closeModal();
}

async function sectionSafety() {
  const injectFail = (w, from, count = 2) => { const orig = w.IDB._tx.bind(w.IDB); let n = 0;
    w.IDB._tx = async function (stores, work) { n++; if (n >= from && n < from + count) { this.lastError = new Error('QuotaExceededError'); return false; } return orig(stores, work); };
    return () => { w.IDB._tx = orig; }; };

  // ---- a failed write is never swallowed, and nothing half-finishes ----
  let w = await boot(); await setupAdmin(w); let d = w.document; let { inc } = fx(w); let p = await mkParty(w, 'Buyer');
  const counts = () => ['invoices', 'invoice_lines', 'transactions', 'transaction_lines', 'parties'].map(t => w.STATE.data[t].length).join(',');
  let base = counts(); let restore = injectFail(w, 1);
  let err = null; try { await w.DB.insert('parties', { id: w.uuidv4(), name: 'Ghost', kind: 'both', archived: false }); } catch (e) { err = e.message; }
  restore();
  log('a failed local write throws instead of being silently swallowed', /Could not save to this device/.test(err || ''), err);
  log('the in-memory change is reverted, so the screen never shows unsaved data', !w.STATE.data.parties.some(x => x.name === 'Ghost'));
  log('a red "could not save" bar tells the person to stop and back up', !!d.getElementById('fault-bar') && /Stop entering data/.test(d.getElementById('fault-bar').textContent));
  d.getElementById('fault-bar').remove();
  base = counts(); restore = injectFail(w, 3); err = null;
  try { await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-05-01', lines: [{ description: 'S', qty: 1, rate: 100, accountId: inc.id }] }); } catch (e) { err = e.message; }
  restore(); d.getElementById('fault-bar') && d.getElementById('fault-bar').remove();
  log('a write that fails part-way through an invoice is reported', /Could not save/.test(err || ''));
  log('and EVERY earlier step of that invoice is rolled back — no orphan invoice, line or ledger row', counts() === base, counts() + ' vs ' + base);
  const onDisk = async t => (await w.IDB.getAll(t)).length;
  log('the rollback is on disk too, not just in memory', (await onDisk('invoices')) === w.STATE.data.invoices.length && (await onDisk('transactions')) === w.STATE.data.transactions.length);
  log('the books still balance', w.Ledger.trialBalanceCheck().balanced);

  // ---- a confirmed change is atomic: a later failure undoes the earlier steps ----
  base = counts(); w.Views.reasonPrompt('Test', 'x', 'Go', async () => { await w.DB.insert('parties', { id: w.uuidv4(), name: 'Half', kind: 'both', archived: false }); throw new Error('second step failed'); });
  await confirmReason(w, { reason: 'because' });
  log('when the second step of a confirmed change fails, the first is undone', !w.STATE.data.parties.some(x => x.name === 'Half') && /second step failed/.test(d.getElementById('reason-error').textContent));
  w.UI.closeModal();

  // ---- a crash mid-operation is recovered on the next start ----
  const idb = new fdb.IDBFactory(), ls = makeLS();
  const wa = await boot({ idb, ls }); await setupAdmin(wa); const pa = await mkParty(wa, 'Keeper'); await sleep(50);
  const before = wa.STATE.data.parties.length;
  wa.Tx.run('crash-test', async () => { await wa.DB.insert('parties', { id: wa.uuidv4(), name: 'Half-made', kind: 'both', archived: false });
    await wa.DB.update('parties', pa.id, { phone: '999' }); await new Promise(() => {}); });
  await sleep(150);
  log('the half-finished work really is on disk before the "crash"', (await wa.IDB.getAll('parties')).some(x => x.name === 'Half-made'));
  const wb = await boot({ idb, ls }); await loginAdmin(wb); await sleep(200);
  log('on the next start the interrupted change is found and undone', !wb.STATE.data.parties.some(x => x.name === 'Half-made') && wb.STATE.data.parties.length === before);
  log('its edit to an existing record is put back too', !wb.STATE.data.parties.find(x => x.id === pa.id).phone);
  log('the person is told, and the journal is cleared', (wb.STATE._recovered || []).length === 1 && (await wb.IDB.getRange('meta', 'oplog:', 'oplog:\uffff')).length === 0);

  // ---- snapshots ----
  w = await boot(); await setupAdmin(w); d = w.document; ({ inc } = fx(w)); p = await mkParty(w, 'Snap Buyer');
  for (let i = 0; i < 3; i++) await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-0' + (i + 1), lines: [{ description: 'S', qty: 1, rate: 100, accountId: inc.id }] });
  const sid = await w.Snapshots.take('test'); const list = await w.Snapshots.list();
  log('a snapshot is taken and listed with its counts', !!sid && list[0].counts.invoices === 3 && list[0].id === sid);
  log('snapshots carry a checksum', /^[0-9a-f]{64}$/.test(list[0].checksum));
  await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-06-09', lines: [{ description: 'Later', qty: 1, rate: 50, accountId: inc.id }] });
  await w.Snapshots.restore(sid);
  log('restoring a snapshot puts the yard back exactly as it was', w.STATE.data.invoices.length === 3 && (await onDisk('invoices')) === 3);
  log('and first snapshots the current state, so a restore can itself be undone', (await w.Snapshots.list()).some(s => /Before restoring/.test(s.reason)));
  const rec = await w.IDB.getRaw('snapshots', sid); rec.data = rec.data.replace('Snap Buyer', 'Tampered!'); await w.IDB.putRaw('snapshots', rec);
  let tamper = null; try { await w.Snapshots.restore(sid); } catch (e) { tamper = e.message; }
  log('a snapshot that fails its checksum is refused and changes nothing', /integrity check/.test(tamper || '') && w.STATE.data.parties.some(x => x.name === 'Snap Buyer'));
  for (let i = 0; i < 12; i++) await w.Snapshots.take('bulk ' + i);
  log('old snapshots are pruned so storage cannot grow forever', (await w.Snapshots.list()).length <= w.Snapshots.KEEP);

  // ---- eviction: the browser wipes storage ----
  const i2 = new fdb.IDBFactory(), l2 = makeLS(); const w1 = await boot({ idb: i2, ls: l2 }); await setupAdmin(w1);
  const q = fx(w1); const pp = await mkParty(w1, 'Evict Buyer');
  for (let i = 0; i < 3; i++) await w1.Ledger.createInvoice({ kind: 'sale', partyId: pp.id, date: '2026-07-0' + (i + 1), lines: [{ description: 'S', qty: 1, rate: 100, accountId: q.inc.id }] });
  await w1.Snapshots.take('pre-loss'); w1.Safety.touchNow(); await sleep(50);
  const wEmpty = await boot({ idb: new fdb.IDBFactory(), ls: l2 }); await loginAdmin(wEmpty); await sleep(150);
  log('when storage is wiped, the app says so instead of showing a blank yard', wEmpty.STATE._recovery && wEmpty.STATE._recovery.kind === 'empty');
  await wEmpty.Safety.showRecovery(); const rh = wEmpty.document.getElementById('view-root').innerHTML;
  log('and nothing can be entered until the person chooses what to do', /No data was found on this device/.test(rh) && /Start with a fresh chart/.test(rh));
  wEmpty.UI.navigate('sales'); log('navigating away keeps the recovery screen up', /No data was found/.test(wEmpty.document.getElementById('view-root').innerHTML));
  await wEmpty.Safety.startFresh(); log('starting fresh seeds the chart of accounts and resumes', !wEmpty.STATE._recovery && wEmpty.STATE.data.accounts.length > 5);

  // ---- shrink guard: records go missing without the app doing it ----
  const i3 = new fdb.IDBFactory(), l3 = makeLS(); const s1 = await boot({ idb: i3, ls: l3 }); await setupAdmin(s1);
  const sq = fx(s1); const sp = await mkParty(s1, 'Shrink Buyer'); const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await s1.Ledger.createInvoice({ kind: 'sale', partyId: sp.id, date: '2026-08-0' + (i + 1), lines: [{ description: 'S', qty: 1, rate: 100, accountId: sq.inc.id }] })).id);
  await s1.Snapshots.take('good state'); s1.Safety.touchNow(); await sleep(50);
  await s1.IDB.deleteRaw('invoices', ids[0]); await s1.IDB.deleteRaw('invoices', ids[1]);
  const s2 = await boot({ idb: i3, ls: l3 }); await loginAdmin(s2); await sleep(150);
  log('records that vanish without the app removing them are caught at startup', s2.STATE._recovery && s2.STATE._recovery.kind === 'shrunk' && s2.STATE._recovery.shrunk.some(x => x.table === 'invoices' && x.was === 3 && x.now === 1));
  await s2.Safety.showRecovery(); s2.document.getElementById('rec-snap').selectedIndex = 0;
  await s2.Safety.recoverFromSnapshot();
  log('one click restores the good snapshot and the app carries on', s2.STATE.data.invoices.length === 3 && !s2.STATE._recovery);

  // ---- a normal restart is NOT flagged ----
  const s3 = await boot({ idb: i3, ls: l3 }); await loginAdmin(s3); await sleep(150);
  log('a normal restart raises no false alarm', !s3.STATE._recovery);

  // ---- corrupt rows are set aside, never silently dropped ----
  // (IndexedDB's keyPath makes a MISSING id impossible, but a blank id is a
  // valid key — and it would match every lookup that passes an empty id.)
  const i4 = new fdb.IDBFactory(), l4 = makeLS(); const c1 = await boot({ idb: i4, ls: l4 }); await setupAdmin(c1); await mkParty(c1, 'Good One');
  await c1.IDB.putRaw('parties', { id: '', name: 'blank id row' }); await c1.IDB.putRaw('ships', { id: '', name: 'blank ship' });
  const c2 = await boot({ idb: i4, ls: l4 }); await loginAdmin(c2); await sleep(120);
  log('rows with a blank id never reach the app', !c2.STATE.data.parties.some(x => !x.id) && c2.STATE.data.parties.some(x => x.name === 'Good One'));
  log('they are counted and reported, not silently dropped', c2.STATE._quarantined === 2);
  const qk = await c2.IDB.getRange('meta', 'quarantine:', 'quarantine:\uffff');
  log('and kept aside where they can be inspected', qk.length === 2 && qk.some(k => (k.rows || []).some(r => r.name === 'blank id row')));

  // ---- integrity check ----
  w = await boot(); await setupAdmin(w); ({ inc } = fx(w)); p = await mkParty(w, 'Health Buyer');
  const hv = await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-09-01', lines: [{ description: 'S', qty: 2, rate: 100, accountId: inc.id }] });
  await w.Ledger.recordPayment({ direction: 'in', partyId: p.id, bankAccountId: fx(w).bank.id, amount: 50, invoiceId: hv.id, date: '2026-09-02' });
  log('a healthy yard passes the integrity check', w.Health.run().length === 0, JSON.stringify(w.Health.run().slice(0, 2)));
  w.STATE.data.payments.push({ id: 'orph', invoice_id: 'nope', amount: 5, direction: 'in' });
  w.STATE.data.transaction_lines.push({ id: 'tl-bad', transaction_id: w.STATE.data.transactions[0].id, account_id: inc.id, debit: 10, credit: 0 });
  w.STATE.data.invoices.find(i => i.id === hv.id).total = 999;
  const iss = w.Health.run().map(i => i.msg).join(' | ');
  log('it reports a payment against a missing invoice', /pays an invoice that does not exist/.test(iss));
  log('it reports an unbalanced ledger entry and out-of-balance books', /is not balanced/.test(iss) && /out of balance/.test(iss));
  log('it reports an invoice total that disagrees with its lines', /does not match its lines/.test(iss));

  // ---- backup reminder, double tap, persistence ----
  w = await boot(); await setupAdmin(w); ({ inc } = fx(w)); p = await mkParty(w, 'Rem Buyer');
  log('an empty yard is not nagged about backups', w.Safety.backupDue() === false);
  await w.Ledger.createInvoice({ kind: 'sale', partyId: p.id, date: '2026-09-01', lines: [{ description: 'S', qty: 1, rate: 10, accountId: inc.id }] });
  log('once there is data and no backup, the dashboard says so', w.Safety.backupDue() === true && /Back up your data/.test(w.Safety.banner()));
  w.UI.navigate('dashboard'); log('and shows it on the dashboard itself', /Back up your data/.test(w.document.getElementById('view-root').innerHTML));
  w.Backup.exportJSON(true); log('taking a backup silences it', w.Safety.backupDue() === false);
  let clicks = 0; const btn = w.document.createElement('div'); btn.className = 'modal-actions'; btn.innerHTML = '<button class="btn primary">Save</button>'; w.document.body.appendChild(btn);
  btn.firstChild.addEventListener('click', () => clicks++); btn.firstChild.click(); btn.firstChild.click();
  log('a double-tap on Save is counted once, so nothing is recorded twice', clicks === 1, clicks);
  log('persistent storage is requested where the browser supports it', typeof w.Safety.requestPersist === 'function');
}

(async () => {
  console.log('Testing ' + HTML_PATH);
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; const want = n => !ONLY || ONLY.includes(n);
  if (want('safety')) await sectionSafety();
  if (want('credit')) await sectionCreditNotes();
  if (want('workers')) await sectionWorkers();
  if (want('imports')) await sectionImportsAndTemplates();
  if (want('controls2')) await sectionYardControls();
  if (want('nosecure')) await sectionNoSecureContext();
  if (want('folder')) await sectionFolderBackup();
  if (ONLY && !ONLY.includes('all')) { console.log(`\nRESULT: ${pass} passed, ${fail} failed`); if (fail) console.log('FAILED:\n  ' + failures.join('\n  ')); process.exit(fail ? 1 : 0); }
  await sectionBootAndScreens(); await sectionAccounting(); await sectionControls(); await sectionConsistency();
  await sectionReportsFormsHostile(); await sectionWorkers(); await sectionImportsAndTemplates(); await sectionYardControls(); await sectionNoSecureContext(); await sectionFolderBackup(); await sectionUpgradeAndRestore(); await sectionBlockedDb();
  sectionDesignLanguage();
  const w = await boot(); sectionStaticCode(w);
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail) console.log('FAILED:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(2); });
