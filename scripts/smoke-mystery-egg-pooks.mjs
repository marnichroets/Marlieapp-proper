// Verifies the mystery-egg + release ceremony works for a real Pooks-role
// session WITHOUT ever touching her real backend row. Runs against a
// throwaway local backend (isolated sqlite db) + a build pointed at
// http://127.0.0.1:8081. Never point this at production.
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
const getState = (ws) => evaluate(ws, `(() => { try { return JSON.parse(localStorage.getItem('marlie-bird-app-v1')); } catch { return null; } })()`)

async function main() {
  const proc = spawn(CHROME, ['--remote-debugging-port=9460', '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\dbg-egg-pooks-${Date.now()}`, 'about:blank'])
  const { ws, errors } = await connect(9460)
  await navigate(ws, APP)
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('pooks_intro_seen', 'yes');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'pooks', name:'Pooks' }));
    localStorage.setItem('marlie-bird-app-v1', JSON.stringify({
      featherCoins: 2000, introSeen: true, tweetyStore: [], settings: { pooksSecret: 'feather' },
      tweety: { name: 'Tweety', companion: 'robin', bornAt: new Date(Date.now() - 40*86400000).toISOString(), careAt: {} },
      sightings: [ { speciesKey: 'malachite-sunbird', birdName: 'Malachite Sunbird', scientificName: 'Nectarinia famosa' } ],
      birdLibrary: [ { id: 'b1', commonName: 'Malachite Sunbird', scientificName: 'Nectarinia famosa', category: 'Colourful birds', seen: true } ],
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

  // Simulate "5 new species" by directly seeding birds.length past a multiple
  // of 5 via a real UI action isn't practical here, so we drive the same
  // commit() path Pooks would hit by triggering the manual "add bird" flow is
  // out of scope for this check — instead verify the two things that matter
  // for a real Pooks session specifically: (a) the release button is now live
  // for her, and (b) if a mystery egg exists, the full ceremony works exactly
  // like it did for Marnich's sandbox (already proven in smoke-mystery-egg.mjs).
  check('Release-to-garden button visible for crowned Tweety (ungated)', await evaluate(ws, `!!document.querySelector('.tweety-release-btn')`))

  // Directly seed a ready mystery egg (bypassing the species-milestone path,
  // which is already covered by the sandbox test) to verify Pooks' own
  // session correctly drives the ceremony end-to-end.
  await evaluate(ws, `(() => {
    const raw = JSON.parse(localStorage.getItem('marlie-bird-app-v1'));
    raw.mysteryEgg = { id: 'egg-test', createdAt: new Date().toISOString(), warms: 3, lastWarmDay: '2000-01-01', companionId: 'sunbird', realSpecies: 'Malachite Sunbird', pattern: 'speckled', color: '#2FA8A0' };
    raw.eggProgress = { lastAwardedAtCount: 5 };
    localStorage.setItem('marlie-bird-app-v1', JSON.stringify(raw));
  })()`)
  await navigate(ws, APP)
  await sleep(1200)
  for (let i = 0; i < 6; i++) {
    const skipped = await evaluate(ws, `(() => { const b=[...document.querySelectorAll('button')].find(x=>/skip|accept my mission|let's go|begin/i.test(x.textContent||'')); if(b){b.click();return true;} return false; })()`)
    await sleep(500)
    if (await evaluate(ws, `!!document.querySelector('.home-stack')`)) break
    if (!skipped) await sleep(300)
  }
  await sleep(500)
  check('Mystery egg card shows "hatched" ready state for Pooks', await evaluate(ws, `/hatched!/i.test(document.body.innerText||'')`))

  await evaluate(ws, `document.querySelector('.tweety-release-btn').click()`)
  await sleep(700)
  check('Release ceremony farewell shown', await evaluate(ws, `/It is time, Agent/i.test(document.body.innerText||'')`))
  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(400)
  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(700)
  check('Garden opened in placement mode for Pooks', await evaluate(ws, `!!document.querySelector('.garden-scene-svg') && /choose where/i.test(document.body.innerText||'')`))

  await evaluate(ws, `(() => {
    const svg = document.querySelector('.garden-scene-svg');
    const rect = svg.getBoundingClientRect();
    const clientX = rect.left + (250/400)*rect.width, clientY = rect.top + (180/260)*rect.height;
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
  })()`)
  await sleep(700)

  const s = await getState(ws)
  console.log('garden.residents:', JSON.stringify(s?.garden?.residents))
  console.log('tweety after release:', JSON.stringify({ companion: s?.tweety?.companion, realSpecies: s?.tweety?.realSpecies, name: s?.tweety?.name }))
  check('Resident recorded (old Robin)', s?.garden?.residents?.length === 1 && s.garden.residents[0].companionId === 'robin')
  check('Pooks immediately adopted the sunbird', s?.tweety?.companion === 'sunbird' && s?.tweety?.realSpecies === 'Malachite Sunbird')
  check('Tweety keeps her real name (Tweety)', s?.tweety?.name === 'Tweety')

  console.log('console errors:', JSON.stringify(errors))
  check('No console errors', errors.length === 0)

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
