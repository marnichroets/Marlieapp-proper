// Cross-device sync E2E (two real Chrome profiles via CDP).
// Device A: log in as Pooks (form), seeded local state -> pushed to backend.
// Device B (fresh profile): log in as Pooks -> adopts backend state, no intro,
//   no egg. Then log in as Marnich -> View Pooks shows her live state, and a
//   backend change propagates to the mirror. Confirms her state is read-only.
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const APP = 'http://localhost:4173'
const API = 'http://127.0.0.1:8080'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

function makeChrome(port, tag) {
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${process.env.TEMP}\\sync-${tag}-${Date.now()}`, 'about:blank',
  ])
  return proc
}

let seq = 1
function rpc(ws, method, params = {}) {
  const id = seq++
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === id) {
        ws.removeEventListener('message', onMsg)
        if (m.error) reject(new Error(`${method}: ${JSON.stringify(m.error)}`))
        else resolve(m.result)
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
  if (!target) throw new Error(`CDP target not found on ${port}`)
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

async function navigate(ws, url) {
  await rpc(ws, 'Page.navigate', { url })
  await sleep(2200)
}

const LOGIN_JS = (name, secret) => `(() => {
  function setVal(el, v){ const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); }
  const form = document.querySelector('.login-form');
  if (!form) return 'no-form';
  const inputs=[...form.querySelectorAll('input')];
  const nameEl=inputs.find(i=>i.type!=='password')||inputs[0];
  const secEl=inputs.find(i=>i.type==='password')||inputs[1];
  setVal(nameEl, ${JSON.stringify(name)}); setVal(secEl, ${JSON.stringify(secret)});
  form.requestSubmit();
  return 'submitted';
})()`

async function waitForHome(ws, timeoutMs = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const has = await evaluate(ws, `!!document.querySelector('.home-stack')`)
    if (has) return true
    await sleep(300)
  }
  return false
}

async function snapshot(ws) {
  return evaluate(ws, `(() => {
    const text = document.body.innerText || '';
    return {
      home: !!document.querySelector('.home-stack'),
      loginForm: !!document.querySelector('.login-form'),
      eggScreen: /choose .* egg|pick .* egg|your first egg/i.test(text),
      introScreen: /classified transmission|bird council dossier|accept my mission/i.test(text),
      modeBar: /View Pooks/.test(text) && /Test sandbox/.test(text),
      coins4321: text.includes('4321'),
      coins5555: text.includes('5555'),
    };
  })()`)
}

const results = []
const check = (name, cond) => { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`) }

async function main() {
  const procA = makeChrome(9331, 'A')
  const procB = makeChrome(9332, 'B')
  const wsA = await connect(9331)
  const wsB = await connect(9332)

  // --- Device A: seed Pooks' state, then log in via the form (pushes to backend)
  await navigate(wsA, APP)
  await evaluate(wsA, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version','2.0');
    localStorage.setItem('pooks_welcome_coins_given','true');
    localStorage.setItem('marlie-bird-app-v1', JSON.stringify({
      featherCoins: 4321, introSeen: true,
      tweety: { name:'Tweety', companion:'sunbird', happiness: 80 },
      settings: { pooksSecret:'feather' }
    }));
    return 'seeded';
  })()`)
  await navigate(wsA, APP) // reload so the v2.0 guard keeps the seed
  const aLogin = await evaluate(wsA, LOGIN_JS('Pooks', 'feather'))
  check('Device A: login form submitted', aLogin === 'submitted')
  await waitForHome(wsA)
  await sleep(2500) // let login()'s backend seed-push complete

  // Backend now holds Pooks' state?
  const afterA = await (await fetch(`${API}/api/state?account=pooks`)).json()
  check('Backend has Pooks state after A login', afterA.state && afterA.state.featherCoins === 4321)
  check('Backend kept introSeen=true', afterA.state && afterA.state.introSeen === true)
  check('Backend kept companion', afterA.state && afterA.state.tweety?.companion === 'sunbird')
  const versionAfterA = afterA.version

  // --- Device B (fresh profile): log in as Pooks -> should adopt backend state
  await navigate(wsB, APP)
  const bLogin = await evaluate(wsB, LOGIN_JS('Pooks', 'feather'))
  check('Device B: login form submitted', bLogin === 'submitted')
  await waitForHome(wsB)
  await sleep(800)
  const bSnap = await snapshot(wsB)
  check('Device B: on home (not login)', bSnap.home && !bSnap.loginForm)
  check('Device B: shows Pooks 4321 coins', bSnap.coins4321)
  check('Device B: NO intro replay', !bSnap.introScreen)
  check('Device B: NO egg re-choice', !bSnap.eggScreen)

  // --- Device B: log in as Marnich -> View Pooks mirror shows her live state
  await evaluate(wsB, `(() => { localStorage.removeItem('marlie-bird-session-v1'); return 'out'; })()`)
  await navigate(wsB, APP)
  const mLogin = await evaluate(wsB, LOGIN_JS('marnich', 'tweety'))
  check('Device B: Marnich login submitted', mLogin === 'submitted')
  await waitForHome(wsB)
  await sleep(800)
  const mSnap = await snapshot(wsB)
  check('Marnich: mode bar present', mSnap.modeBar)
  check('Marnich View Pooks: shows her 4321 coins', mSnap.coins4321)
  check('Marnich View Pooks: NO intro', !mSnap.introScreen)
  check('Marnich View Pooks: NO egg', !mSnap.eggScreen)

  // --- Live update: change Pooks state on the backend, mirror should follow
  await fetch(`${API}/api/state`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'pooks', version: versionAfterA, state: {
      featherCoins: 5555, introSeen: true,
      tweety: { name:'Tweety', companion:'sunbird', happiness: 80 },
      settings: { pooksSecret:'feather' }
    } }),
  })
  let mirroredUpdate = false
  for (let i = 0; i < 12; i++) {
    // Nudge the focus-refresh path (headless throttles the background interval).
    await evaluate(wsB, `window.dispatchEvent(new Event('focus'))`)
    await sleep(1000)
    const s = await snapshot(wsB)
    if (s.coins5555) { mirroredUpdate = true; break }
  }
  check('Marnich mirror reflects live backend change (5555)', mirroredUpdate)

  // --- Pooks' state must be unchanged BY Marnich (read-only): the only write was
  // our explicit POST above (version bumped once, to versionAfterA+1).
  const finalPooks = await (await fetch(`${API}/api/state?account=pooks`)).json()
  check('Pooks state not clobbered by Marnich (version == A+1)', finalPooks.version === versionAfterA + 1)
  check('Pooks state still valid (5555 from our POST)', finalPooks.state?.featherCoins === 5555)

  wsA.close(); wsB.close(); procA.kill(); procB.kill()
  const passed = results.filter((r) => r.ok).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })
