// Quick runtime smoke test for the egg-free Tweety: seed a logged-in Pooks
// (bypassing intro), load the app, and assert the home renders Tweety with no
// egg/incubation/baby UI anywhere on screen.
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
async function navigate(ws, url) { await rpc(ws, 'Page.navigate', { url }); await sleep(2500) }

const results = []
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`) }

async function main() {
  const proc = spawn(CHROME, [
    '--remote-debugging-port=9344', '--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\smoke-tweety-${Date.now()}`, 'about:blank',
  ])
  const ws = await connect(9344)

  await navigate(ws, APP)
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version','2.0');
    localStorage.setItem('pooks_welcome_coins_given','true');
    localStorage.setItem('pooks_intro_seen','1');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'pooks', name:'Pooks' }));
    localStorage.setItem('marlie-bird-app-v1', JSON.stringify({
      featherCoins: 250, introSeen: true, settings: { pooksSecret:'feather' }
    }));
    return 'seeded';
  })()`)
  await navigate(ws, APP)
  await sleep(1500)

  // Skip the one-time cinematic intro if it is showing.
  for (let i = 0; i < 8; i++) {
    const skipped = await evaluate(ws, `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /skip|accept my mission|let's go|begin/i.test(x.textContent || ''));
      if (b) { b.click(); return true; } return false;
    })()`)
    await sleep(700)
    const home = await evaluate(ws, `!!document.querySelector('.home-stack')`)
    if (home) break
    if (!skipped) await sleep(400)
  }
  await sleep(800)

  const snap = await evaluate(ws, `(() => {
    const t = document.body.innerText || '';
    return {
      home: !!document.querySelector('.home-stack'),
      loginForm: !!document.querySelector('.login-form'),
      intro: !!document.querySelector('.intro-sequence') || /classified transmission|bird council dossier|accept my mission/i.test(t),
      hasTweety: /Tweety/.test(t),
      egg: /egg basket|warm this egg|mystery egg|warm your|choose .*egg|incubat/i.test(t),
      hatch: /hatch/i.test(t),
      text: t.replace(/\\s+/g,' ').slice(0, 280),
    };
  })()`)
  console.log('snapshot:', JSON.stringify(snap, null, 2))

  check('Home renders (not stuck on login)', snap.home && !snap.loginForm)
  check('Tweety is present on home', snap.hasTweety)
  check('NO egg/incubation UI text', !snap.egg)
  check('NO hatch UI text', !snap.hatch)

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
