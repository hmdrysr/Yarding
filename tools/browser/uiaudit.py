"""Real-browser layout audit. Boots the app through its actual UI, seeds data with
the app's own engine, then visits every screen and modal at phone widths and reports:
  clipped   – text wider than the box that holds it, in a box that hides overflow
  overflow  – text spilling out of its own box (nowrap etc.)
  offscreen – element extends past the right edge of the screen, outside any scroller
  input     – placeholder/value text wider than the input, so it is cut off
  pagescroll– the page itself scrolls sideways
Needs: pip install playwright && playwright install chromium
Usage: python3 tools/browser/uiaudit.py /absolute/path/to/index.html [widths...]   (default 320 360 390)
Also reports  wordbreak – a word or figure wider than its box where the CSS would break it in the middle."""
import sys, json
from playwright.sync_api import sync_playwright

FILE = __import__('os').path.abspath(sys.argv[1])
WIDTHS = [int(x) for x in sys.argv[2:]] or [320, 360, 390]

MEASURE = r"""
() => {
  const vw = document.documentElement.clientWidth, out = [];
  const bg = document.getElementById('modal-bg');
  const modal = bg && bg.classList.contains('show');
  const roots = modal ? [document.getElementById('modal-root')] : [document.getElementById('view-root'), document.querySelector('.bottomnav'), document.querySelector('.topbar')];
  if (document.documentElement.scrollWidth > vw + 1) out.push({t:'pagescroll', d:'page is '+document.documentElement.scrollWidth+'px wide on a '+vw+'px screen'});
  const cv = document.createElement('canvas').getContext('2d');
  const scroller = el => { let p = el.parentElement; while (p && p !== document.body) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowX)) return true; p = p.parentElement; } return false; };
  const label = el => (el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.className && typeof el.className==='string' ? '.'+el.className.trim().split(/\s+/).join('.') : '')).slice(0,60);
  const txt = el => (el.value || el.placeholder || el.innerText || '').trim().replace(/\s+/g,' ').slice(0,50);
  for (const root of roots) {
    if (!root) continue;
    for (const el of root.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('svg')) continue;
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 && !scroller(el)) out.push({t:'offscreen', e:label(el), d:txt(el)+' → right edge '+Math.round(r.right)+' > '+vw});
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !['checkbox','radio','file','range','hidden','date','month'].includes(el.type)) {
        const s = el.value || el.placeholder || ''; if (!s) continue;
        cv.font = cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
        const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (el.tagName === 'INPUT' && cv.measureText(s).width > inner + 1) out.push({t:'input', e:label(el), d:'"'+s.slice(0,40)+'" needs '+Math.round(cv.measureText(s).width)+'px, box shows '+Math.round(inner)});
        continue;
      }
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      { // a single word or figure wider than its box can only be shown by breaking it in the middle
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ');
        const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (inner > 0 && !/(auto|scroll)/.test(cs.overflowX) && cs.whiteSpace !== 'nowrap' && (/^(anywhere|break-word)$/.test(cs.overflowWrap) || /^(break-all|break-word)$/.test(cs.wordBreak))) {
          cv.font = cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
          const ls = parseFloat(cs.letterSpacing) || 0;
          for (const wd of own.split(/\s+/)) { if (wd.length > 2 && cv.measureText(wd).width + ls*wd.length > inner + 1) { out.push({t:'wordbreak', e:label(el), d:'"'+wd.slice(0,30)+'" is wider than its '+Math.round(inner)+'px box'}); break; } }
        }
      }
      if (el.scrollWidth > el.clientWidth + 1 && !/(auto|scroll)/.test(cs.overflowX)) {
        const hides = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
        out.push({t: hides ? 'clipped' : 'overflow', e:label(el), d:txt(el)+' ('+el.scrollWidth+' in '+el.clientWidth+')'});
      }
    }
  }
  return out;
}
"""

SEED = r"""
async () => {
  const A = n => STATE.data.accounts.find(a => a.name === n);
  const p1 = {id: uuidv4(), name:'ABC Traders Limited (Chattogram Branch Office)', kind:'customer', phone:'+1 555 0100', email:'accounts@abc-traders.example', address:'12 Harbour Road', notes:'', archived:false};
  const p2 = {id: uuidv4(), name:'ACME Marine Supplies', kind:'vendor', phone:'', email:'', address:'', notes:'', archived:false};
  await DB.insert('parties', p1); await DB.insert('parties', p2);
  const sh = {id: uuidv4(), name:'MV Wangtong Star', imo:'9123456', ldt:5200, status:'active', notes:''};
  await DB.insert('ships', sh);
  const it = STATE.data.items[0];
  const inc = STATE.data.accounts.find(a => a.type==='income'), exp = STATE.data.accounts.find(a => a.type==='expense');
  const inv = await Ledger.createInvoice({kind:'sale', partyId:p1.id, shipId:sh.id, date:'2026-09-01', notes:'seed', lines:[{description:'MS Plate & Angle heavy melting scrap grade 1', qty:12.5, rate:48000, accountId:inc.id, itemId:it.id, unit:'MT'}]});
  await Ledger.createInvoice({kind:'expense', partyId:p2.id, date:'2026-09-02', notes:'', lines:[{description:'Crane diesel', qty:100, rate:110, accountId:exp.id, unit:'litre'}]});
  const bank = STATE.data.bank_accounts[1];
  await Ledger.recordPayment({direction:'in', partyId:p1.id, bankAccountId:bank.id, amount:100000, invoiceId:inv.id, date:'2026-09-03', memo:'', partyName:p1.name});
  UI.renderNav(); UI.renderView();
  return true;
}
"""

VIEWS = ['dashboard','sales','purchases','expenses','payments','banking','parties','ships','items','ledger','amendments','reports','settings']
MODALS = [
  ("Forms.invoiceForm('sale')", 'sale form'), ("Forms.invoiceForm('purchase')", 'purchase form'),
  ("Forms.paymentForm()", 'payment form'), ("Forms.partyForm()", 'party form'), ("Forms.shipForm()", 'ship form'),
  ("Forms.itemForm()", 'item form'), ("Forms.journalForm()", 'journal form'), ("Forms.bankAccountForm()", 'bank form'),
  ("Forms.advanceForm()", 'advance form'), ("Views.staffAccountForm()", 'worker form'),
  ("UI.openQuickAdd()", 'quick add'), ("UI.openMoreMenu()", 'more menu'), 
]
_HERE = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
_EXTRA = __import__('os').path.join(_HERE, 'extra_modals.json')
EXTRA_MODALS = [m for m in json.loads(open(_EXTRA).read())] if __import__('os').path.exists(_EXTRA) else []

def run():
    total = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in WIDTHS:
            pg = b.new_page(viewport={'width': w, 'height': 780})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file://' + FILE); pg.wait_for_timeout(500)
            # setup screen measured first
            found = {}
            def rec(name, res):
                nonlocal total
                for f in res:
                    key = (name, f['t'], f.get('e',''), f['d'])
                    found[key] = 1
            rec('setup step 1', pg.evaluate(MEASURE))
            pg.fill('#s-company', 'ABC Yard Ltd'); pg.click('#setup-step-1 .btn.primary'); pg.wait_for_timeout(200)
            rec('setup step 3', pg.evaluate(MEASURE))
            pg.fill('#s-admin-name', 'Alex Doe'); rec('setup name step', pg.evaluate(MEASURE)); pg.click('#setup-admin-intro .btn.primary'); pg.wait_for_timeout(300)
            rec('setup authenticator step', pg.evaluate(MEASURE))
            pg.evaluate("(async()=>{const s=Enroll.s.secret; document.getElementById('en-code').value=await Totp.code(s,Totp.stepNow()); await Enroll.verify();})()"); pg.wait_for_timeout(500)
            rec('setup backup codes step', pg.evaluate(MEASURE))
            pg.evaluate("Enroll.step('key')"); pg.wait_for_timeout(200); rec('setup security key step', pg.evaluate(MEASURE))
            pg.evaluate("Enroll.done()"); pg.wait_for_timeout(1200)
            pg.evaluate("try{Onboarding.finish()}catch(e){}")
            pg.evaluate("UI.closeModal()")
            pg.evaluate(SEED); pg.wait_for_timeout(300)
            pg.evaluate("sessionStorage.clear()"); pg.reload(); pg.wait_for_timeout(700); rec('login screen', pg.evaluate(MEASURE))
            pg.evaluate("(async()=>{const a=STATE.data.staff_accounts[0]; document.getElementById('login-code').value=await Totp.code(a.totp_secret,Totp.stepNow()+1); await Auth.attempt();})()"); pg.wait_for_timeout(1200)
            pg.evaluate("try{Onboarding.finish()}catch(e){}; UI.closeModal()")
            for v in VIEWS:
                pg.evaluate(f"UI.navigate('{v}')"); pg.wait_for_timeout(250)
                rec('view: ' + v, pg.evaluate(MEASURE))
            pg.evaluate("UI.navigate('dashboard')")
            for call, name in MODALS + [(c, n) for c, n in EXTRA_MODALS]:
                try:
                    pg.evaluate(call); pg.wait_for_timeout(200)
                    rec('modal: ' + name, pg.evaluate(MEASURE))
                except Exception as e:
                    found[('modal: ' + name, 'error', '', str(e)[:80])] = 1
                pg.evaluate("UI.closeModal()")
            print(f'== {w}px: {len(found)} findings, {len(errs)} page errors')
            for (name, t, e, d) in sorted(found):
                print(f'  [{t}] {name} :: {e} :: {d}')
            for e in errs[:5]: print('  PAGEERROR', e)
            total += len(found) + len(errs)
            pg.close()
        b.close()
    return total

if __name__ == '__main__':
    n = run(); print('TOTAL', n); sys.exit(1 if n else 0)
