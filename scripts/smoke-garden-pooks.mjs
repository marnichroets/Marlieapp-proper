// Verifies the Garden is reachable + fully functional for a real Pooks-role
// session — WITHOUT ever touching her real backend row. Runs against a
// throwaway local backend (isolated sqlite db) + a one-off build pointed at
// http://127.0.0.1:8080, both started separately. Never point this at
// production; it logs in with role 'pooks', which is her live account.
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
const APP = 'http://localhost:4174'
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

async function main() {
  const proc = spawn(CHROME, ['--remote-debugging-port=9410', '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\dbg-garden-pooks-${Date.now()}`, 'about:blank'])
  const { ws, errors } = await connect(9410)
  await navigate(ws, APP)
  // Seed a fresh LOCAL-ONLY "Pooks" save with Tweety already crowned (so the
  // release-to-garden button is reachable) and a couple of buyable coins.
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('pooks_intro_seen', 'yes');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'pooks', name:'Pooks' }));
    localStorage.setItem('marlie-bird-app-v1', JSON.stringify({
      featherCoins: 2000, introSeen: true, tweetyStore: [], settings: { pooksSecret: 'feather' },
      tweety: { name: 'Tweety', companion: 'robin', bornAt: new Date(Date.now() - 40*86400000).toISOString(), careAt: {}, egg: null, baby: null },
      garden: { version: 1, shopUnlocked: ['flower-patch','sanctuary-fence'], plantings: [], elements: [], residents: [], sanctuary: false },
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
  await sleep(600)
  check('Logged in as Pooks, on home', await evaluate(ws, `!!document.querySelector('.home-stack')`))
  check('NOT the login form', !(await evaluate(ws, `!!document.querySelector('.login-form')`)))

  const diag = await evaluate(ws, `(() => ({
    session: localStorage.getItem('marlie-bird-session-v1'),
    marnichMode: localStorage.getItem('marlie-marnich-mode'),
    gearButtons: [...document.querySelectorAll('button')].filter(x=>/⚙️/.test(x.textContent||'')).length,
  }))()`)
  console.log('diag before opening menu:', JSON.stringify(diag))

  // Open the settings/gear menu and look for "Bird Garden".
  const openedMenu = await evaluate(ws, `(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /⚙️/.test(x.textContent||'') || /settings/i.test(x.getAttribute('aria-label')||''));
    if (b) { b.click(); return true; } return false;
  })()`)
  await sleep(500)
  check('Opened settings menu', openedMenu)
  const menuText = await evaluate(ws, `(() => { const m = document.querySelector('.menu-sheet'); return m ? m.innerText : 'NO MENU SHEET'; })()`)
  console.log('menu sheet text:', JSON.stringify(menuText))
  check('"Bird Garden" appears in the menu', await evaluate(ws, `/Bird Garden/i.test(document.body.innerText||'')`))

  const clickedGarden = await evaluate(ws, `(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) => /Bird Garden/i.test(x.textContent||''));
    if (b) { b.click(); return true; } return false;
  })()`)
  await sleep(800)
  check('Clicked into Bird Garden as Pooks', clickedGarden)
  check('Garden scene rendered for Pooks', await evaluate(ws, `!!document.querySelector('.garden-scene-svg')`))
  check('No "Sandbox" wording shown to Pooks', !(await evaluate(ws, `/sandbox/i.test(document.body.innerText||'')`)))

  // Buy + place an item as Pooks (real mutating action, but against the
  // throwaway local backend only).
  await evaluate(ws, `[...document.querySelectorAll('.garden-shop-btn')].find(x=>/Flower patch/i.test(x.textContent||'')).click()`)
  await sleep(300)
  await evaluate(ws, `(() => {
    const svg = document.querySelector('.garden-scene-svg');
    const rect = svg.getBoundingClientRect();
    const clientX = rect.left + (200/400)*rect.width, clientY = rect.top + (190/260)*rect.height;
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
  })()`)
  await sleep(500)
  check('Pooks can place a garden item', await evaluate(ws, `!!document.querySelector('.garden-plant')`))

  // Back to Home: the crowned companion should offer "release to garden".
  await evaluate(ws, `[...document.querySelectorAll('button')].find(x=>/^Back$/i.test((x.textContent||'').trim())).click()`)
  await sleep(600)
  check('Back on Home', await evaluate(ws, `!!document.querySelector('.home-stack')`))
  check('Release-to-garden button visible for crowned Tweety', await evaluate(ws, `!!document.querySelector('.tweety-release-btn')`))

  const clickedRelease = await evaluate(ws, `(() => {
    const b = document.querySelector('.tweety-release-btn');
    if (b) { b.click(); return true; } return false;
  })()`)
  await sleep(600)
  check('Clicked release-to-garden', clickedRelease)
  check('Companion picker opened ("graduates")', await evaluate(ws, `/graduates/i.test(document.body.innerText||'')`))

  const pickedNew = await evaluate(ws, `(() => {
    const btn = [...document.querySelectorAll('button')].find((x) => /Weaver|Sunbird|Bishop|Sparrow|Kingfisher/i.test(x.textContent||''));
    if (btn) { btn.click(); return true; } return false;
  })()`)
  await sleep(700)
  check('Picked the next companion', pickedNew)
  check('Back on Home after graduation', await evaluate(ws, `!!document.querySelector('.home-stack')`))

  const savedAfter = await evaluate(ws, `(() => { try { return JSON.parse(localStorage.getItem('marlie-bird-app-v1')); } catch { return null; } })()`)
  console.log('garden.residents after graduation:', JSON.stringify(savedAfter?.garden?.residents))
  console.log('tweety.companion after graduation:', savedAfter?.tweety?.companion)
  check('Old companion (robin) now a garden resident', Array.isArray(savedAfter?.garden?.residents) && savedAfter.garden.residents.some((r) => r.companionId === 'robin'))
  check('Tweety reborn as a DIFFERENT companion', savedAfter?.tweety?.companion && savedAfter.tweety.companion !== 'robin')

  console.log('console errors during whole run:', JSON.stringify(errors))
  check('No console errors during whole run', errors.length === 0)

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
