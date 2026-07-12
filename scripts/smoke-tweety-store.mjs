// End-to-end smoke test for the Tweety Store buy flow. Runs entirely on
// Marnich's own sandbox account (marnichMode='sandbox') so it NEVER reads or
// writes Pooks' real save. Confirms: coins deduct on purchase, the item is
// persisted to tweetyStore, and a gift chip renders under Tweety on Home.
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const APP = 'http://localhost:4173'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

let seq = 1
function rpc(ws, method, params = {}) {
  const id = seq++
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === id) {
        ws.removeEventListener('message', onMsg)
        m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function connect(port) {
  let target
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://localhost:${port}/json`)).json()
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (target) break
    } catch { /* not ready */ }
    await sleep(200)
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  await rpc(ws, 'Runtime.enable')
  await rpc(ws, 'Page.enable')
  return ws
}
async function evaluate(ws, expression) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails))
  return r.result.value
}
async function navigate(ws, url) { await rpc(ws, 'Page.navigate', { url }); await sleep(2200) }

const results = []
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`) }

async function main() {
  const proc = spawn(CHROME, [
    '--remote-debugging-port=9355', '--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\smoke-store-${Date.now()}`, 'about:blank',
  ])
  const ws = await connect(9355)

  await navigate(ws, APP)
  // Seed Marnich's SANDBOX account only. dataAccountFor() maps
  // (role:'marnich', marnichMode:'sandbox') -> the 'marnich' backend account,
  // completely separate from Pooks'.
  await evaluate(ws, `(() => {
    localStorage.clear();
    // Must be set before reload: ensureAppVersion() wipes ALL localStorage on
    // load if this doesn't already match, which would erase the seed below.
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'marnich', name:'Marnich' }));
    localStorage.setItem('marlie-marnich-mode', 'sandbox');
    localStorage.setItem('marnich_intro_seen', '1');
    localStorage.setItem('marlie-bird-app-marnich-v1', JSON.stringify({
      featherCoins: 500, introSeen: true, tweetyStore: [], settings: {}
    }));
    return 'seeded';
  })()`)
  await navigate(ws, APP)
  await sleep(1200)

  for (let i = 0; i < 8; i++) {
    const skipped = await evaluate(ws, `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /skip|accept my mission|let's go|begin/i.test(x.textContent || ''));
      if (b) { b.click(); return true; } return false;
    })()`)
    await sleep(600)
    const home = await evaluate(ws, `!!document.querySelector('.home-stack')`)
    if (home) break
    if (!skipped) await sleep(400)
  }
  await sleep(600)

  const onHome = await evaluate(ws, `!!document.querySelector('.home-stack')`)
  check('Landed on home (sandbox, not stuck on login/intro)', onHome)

  const coinsBefore = await evaluate(ws, `(() => {
    const m = (document.body.innerText || '').match(/([\\d,]+)\\s*🪙/);
    return m ? m[1] : null;
  })()`)
  console.log('coins before nav to shop:', coinsBefore)

  // Go to the Gifts tab, which hosts the Tweety Store section.
  const clickedGifts = await evaluate(ws, `(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) => /^Gifts$/i.test((x.textContent||'').trim()) || /🎁/.test(x.textContent||''));
    if (b) { b.click(); return true; } return false;
  })()`)
  await sleep(700)
  check('Clicked into Gifts tab', clickedGifts)

  const sawStore = await evaluate(ws, `/Tweety Store/i.test(document.body.innerText||'')`)
  check('Tweety Store section visible', sawStore)

  // Buy the cheapest item: Special Treats (🍓, 80 coins).
  const bought = await evaluate(ws, `(() => {
    const tiles = [...document.querySelectorAll('article.shop-tile')];
    const tile = tiles.find((t) => /Special Treats/i.test(t.textContent||''));
    if (!tile) return 'no-tile';
    const btn = tile.querySelector('button');
    if (!btn || btn.disabled) return 'btn-disabled-or-missing:' + (btn ? btn.textContent : 'none');
    btn.click();
    return 'clicked';
  })()`)
  console.log('buy result:', bought)
  check('Bought Special Treats (button was enabled + clicked)', bought === 'clicked')
  await sleep(600)

  const coinsAfter = await evaluate(ws, `(() => {
    const m = (document.body.innerText || '').match(/([\\d,]+)\\s*🪙/);
    return m ? m[1] : null;
  })()`)
  console.log('coins after purchase:', coinsAfter)
  const coinsMatch = /^[\d,]+$/.test(coinsBefore || '') && /^[\d,]+$/.test(coinsAfter || '')
    && Number(coinsAfter.replace(/,/g, '')) === Number(coinsBefore.replace(/,/g, '')) - 80
  check('Coins deducted by exactly 80 (Special Treats cost)', coinsMatch)

  const giftedNow = await evaluate(ws, `(() => {
    const tiles = [...document.querySelectorAll('article.shop-tile')];
    const tile = tiles.find((t) => /Special Treats/i.test(t.textContent||''));
    return tile ? /Gifted/i.test(tile.textContent||'') : false;
  })()`)
  check('Shop tile now shows "Gifted ✓"', giftedNow)

  // Persisted state check.
  const savedTweetyStore = await evaluate(ws, `(() => {
    try { return JSON.parse(localStorage.getItem('marlie-bird-app-marnich-v1')||'{}').tweetyStore || []; }
    catch { return null; }
  })()`)
  console.log('tweetyStore after buy:', JSON.stringify(savedTweetyStore))
  check('tweetyStore persisted with "treats"', Array.isArray(savedTweetyStore) && savedTweetyStore.includes('treats'))

  // Back to Home: gift chip should render right under Tweety.
  const clickedHome = await evaluate(ws, `(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) => /Home/i.test(x.textContent||'') || /🏡/.test(x.textContent||''));
    if (b) { b.click(); return true; } return false;
  })()`)
  await sleep(700)
  check('Navigated back to Home', clickedHome)

  const chip = await evaluate(ws, `(() => {
    const row = document.querySelector('.tweety-gifts');
    return row ? row.textContent : null;
  })()`)
  console.log('gift chip row text:', chip)
  check('Gift chip visible under Tweety on Home ("Special Treats")', Boolean(chip) && /Special Treats/i.test(chip))

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
