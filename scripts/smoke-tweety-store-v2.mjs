// End-to-end smoke test for the rebuilt Tweety Store: buys 3 different items
// and confirms coins deduct, the purchase persists, and each item's REAL
// visual actually appears in the nest scene (not just a chip). Runs on
// Marnich's sandbox account only.
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
      if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function connect(port) {
  let target
  for (let i = 0; i < 50; i++) {
    try { const list = await (await fetch(`http://localhost:${port}/json`)).json(); target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (target) break } catch {}
    await sleep(200)
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  await rpc(ws, 'Runtime.enable'); await rpc(ws, 'Page.enable')
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push((m.params.args||[]).map(a=>a.value??a.description).join(' '))
    if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails))
  })
  return { ws, errors }
}
async function evaluate(ws, expression) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails))
  return r.result.value
}
async function navigate(ws, url) { await rpc(ws, 'Page.navigate', { url }); await sleep(2200) }

const results = []
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`) }

async function buyItem(ws, name) {
  return evaluate(ws, `(() => {
    const tiles = [...document.querySelectorAll('.shop-tile')];
    const tile = tiles.find((t) => t.textContent.includes('${name}'));
    if (!tile) return 'no-tile';
    const btn = tile.querySelector('button');
    if (!btn || btn.disabled) return 'disabled-or-missing';
    btn.click();
    return 'clicked';
  })()`)
}

async function main() {
  const proc = spawn(CHROME, ['--remote-debugging-port=9500', '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\dbg-store2-${Date.now()}`, 'about:blank'])
  const { ws, errors } = await connect(9500)
  await navigate(ws, APP)
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'marnich', name:'Marnich' }));
    localStorage.setItem('marlie-marnich-mode', 'sandbox');
    localStorage.setItem('marnich_intro_seen', 'yes');
    localStorage.setItem('marlie-bird-app-marnich-v1', JSON.stringify({
      featherCoins: 1000, introSeen: true, tweetyStore: [], settings: {},
      tweety: { name: 'Tweety', companion: 'robin', bornAt: new Date().toISOString(), careAt: {} },
    }));
    return 'seeded';
  })()`)
  await navigate(ws, APP)
  await sleep(1200)
  for (let i = 0; i < 8; i++) {
    const skipped = await evaluate(ws, `(() => { const b=[...document.querySelectorAll('button')].find(x=>/skip|accept my mission|let's go|begin/i.test(x.textContent||'')); if(b){b.click();return true;} return false; })()`)
    await sleep(600)
    if (await evaluate(ws, `!!document.querySelector('.home-stack')`)) break
    if (!skipped) await sleep(400)
  }
  await sleep(500)

  // Navigate to the Gifts tab, home of the Tweety Store.
  await evaluate(ws, `[...document.querySelectorAll('button, a')].find((x) => /Gifts/i.test(x.textContent||'')).click()`)
  await sleep(700)
  check('"Spoil Tweety" header visible', await evaluate(ws, `/Spoil Tweety/i.test(document.body.innerText||'')`))

  const coinsBefore = await evaluate(ws, `(() => { const m=(document.body.innerText||'').match(/([\\d,]+)\\s*🪙/); return m ? Number(m[1].replace(/,/g,'')) : null; })()`)
  console.log('coins before:', coinsBefore)

  // Purchase 1: Special Treats (80)
  check('Bought Special Treats', await buyItem(ws, 'Special Treats') === 'clicked')
  await sleep(400)
  // Purchase 2: Music Box (300)
  check('Bought Music Box', await buyItem(ws, 'Music Box') === 'clicked')
  await sleep(400)
  // Purchase 3: Nest Upgrade (400)
  check('Bought Nest Upgrade', await buyItem(ws, 'Nest Upgrade') === 'clicked')
  await sleep(500)

  const coinsAfter = await evaluate(ws, `(() => { const m=(document.body.innerText||'').match(/([\\d,]+)\\s*🪙/); return m ? Number(m[1].replace(/,/g,'')) : null; })()`)
  console.log('coins after (expect -780):', coinsAfter)
  check('Coins deducted by exactly 780 (80+300+400)', coinsAfter === coinsBefore - 780)

  check('All 3 tiles now show "Gifted"', await evaluate(ws, `(() => {
    const names = ['Special Treats', 'Music Box', 'Nest Upgrade'];
    return names.every((n) => {
      const t = [...document.querySelectorAll('.shop-tile')].find((x) => x.textContent.includes(n));
      return t && /Gifted/i.test(t.textContent) && t.classList.contains('gifted');
    });
  })()`))

  const saved = await evaluate(ws, `(() => { try { return JSON.parse(localStorage.getItem('marlie-bird-app-marnich-v1')).tweetyStore; } catch { return null; } })()`)
  console.log('persisted tweetyStore:', JSON.stringify(saved))
  check('tweetyStore persisted with all 3 ids', ['treats', 'musicbox', 'nest'].every((id) => saved.includes(id)))

  // Back to Home: confirm the REAL visuals actually appear.
  await evaluate(ws, `(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /Home/i.test(x.textContent||'') || /🏡/.test(x.textContent||'')); if (b) b.click(); })()`)
  await sleep(700)
  check('Treat bowl visual rendered', await evaluate(ws, `!!document.querySelector('.gift-treats')`))
  check('Music box visual rendered', await evaluate(ws, `!!document.querySelector('.gift-musicbox')`))
  check('Nest-upgrade visual class applied', await evaluate(ws, `!!document.querySelector('.tweety-nest-base.gift-nest-upgrade')`))

  // Tap the treat bowl and the music box — confirm tap animation fires (React
  // state update is async, so check on the next tick, not synchronously).
  await evaluate(ws, `document.querySelector('.gift-treats')?.click()`)
  await sleep(150)
  check('Tapping treat bowl triggers the bounce animation', await evaluate(ws, `document.querySelector('.gift-treats')?.classList.contains('tapped')`))

  await sleep(1200) // let the first tap's class clear before testing the next
  await evaluate(ws, `document.querySelector('.gift-musicbox')?.click()`)
  await sleep(150)
  check('Tapping music box triggers the shake animation', await evaluate(ws, `document.querySelector('.gift-musicbox')?.classList.contains('tapped')`))

  // Reload and confirm everything persisted (real purchases, real visuals).
  await navigate(ws, APP)
  await sleep(1200)
  check('After reload: treat bowl still visible', await evaluate(ws, `!!document.querySelector('.gift-treats')`))
  check('After reload: music box still visible', await evaluate(ws, `!!document.querySelector('.gift-musicbox')`))
  check('After reload: nest upgrade still visible', await evaluate(ws, `!!document.querySelector('.tweety-nest-base.gift-nest-upgrade')`))

  console.log('console errors during whole run:', JSON.stringify(errors))
  check('No console errors during whole run', errors.length === 0)

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
