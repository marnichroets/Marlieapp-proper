// End-to-end smoke test for the mystery-egg + garden-succession ceremony.
// Runs entirely on Marnich's sandbox account. Covers:
//   1. Egg creation via the sandbox dev button, warming it to ready via
//      Fast Forward, and confirming the hatch reveal (no companion touched).
//   2. The full release ceremony: farewell beats -> tap-to-place in the
//      garden -> resident recorded with correct species/dates -> the
//      already-hatched egg is adopted immediately as the new companion.
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
const getState = (ws) => evaluate(ws, `(() => { try { return JSON.parse(localStorage.getItem('marlie-bird-app-marnich-v1')); } catch { return null; } })()`)

async function main() {
  const proc = spawn(CHROME, ['--remote-debugging-port=9450', '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TEMP}\\dbg-mysteregg-${Date.now()}`, 'about:blank'])
  const { ws, errors } = await connect(9450)
  await navigate(ws, APP)
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'marnich', name:'Marnich' }));
    localStorage.setItem('marlie-marnich-mode', 'sandbox');
    localStorage.setItem('marnich_intro_seen', 'yes');
    localStorage.setItem('marlie-bird-app-marnich-v1', JSON.stringify({
      featherCoins: 500, introSeen: true, tweetyStore: [], settings: {},
      tweety: { name: 'Sunny', companion: 'robin', bornAt: new Date(Date.now() - 40*86400000).toISOString(), careAt: {} },
      sightings: [
        { speciesKey: 'malachite-sunbird', birdName: 'Malachite Sunbird', scientificName: 'Nectarinia famosa' },
      ],
      birdLibrary: [
        { id: 'b1', commonName: 'Malachite Sunbird', scientificName: 'Nectarinia famosa', category: 'Colourful birds', seen: true },
      ],
      garden: { version: 1, shopUnlocked: ['flower-patch','sanctuary-fence'], plantings: [], elements: [], residents: [], sanctuary: false },
    }));
    return 'seeded';
  })()`)
  await navigate(ws, APP)
  await sleep(1200)
  for (let i = 0; i < 8; i++) {
    const skipped = await evaluate(ws, `(() => { const b=[...document.querySelectorAll('button')].find(x=>/skip|accept my mission|let's go|begin/i.test(x.textContent||'')); if(b){b.click();return true;} return false; })()`)
    await sleep(600)
    if (await evaluate(ws, `!!document.querySelector('.sandbox-tools')`)) break
    if (!skipped) await sleep(400)
  }
  await sleep(500)
  check('On home, sandbox tools visible', await evaluate(ws, `!!document.querySelector('.sandbox-tools')`))

  // ---- Step 1: force + warm the egg to ready, WITHOUT releasing anything ----
  await evaluate(ws, `[...document.querySelectorAll('button')].find(x=>/Force new egg/i.test(x.textContent||'')).click()`)
  await sleep(400)
  for (let i = 0; i < 3; i += 1) {
    await evaluate(ws, `[...document.querySelectorAll('button')].find(x=>/Warm the egg/i.test(x.textContent||'')).click()`)
    await sleep(400)
    if (i < 2) { await evaluate(ws, `[...document.querySelectorAll('button')].find(x=>/Fast Forward/i.test(x.textContent||'')).click()`); await sleep(400) }
  }
  await sleep(500)
  let s = await getState(ws)
  check('Egg reached warms=3 (ready)', s?.mysteryEgg?.warms === 3)
  check('Tweety UNCHANGED while egg just sits ready (still robin)', s?.tweety?.companion === 'robin' && !s?.tweety?.awaitingNextCompanion)
  const eggSpecies = s?.mysteryEgg?.realSpecies
  console.log('egg species (only candidate: Malachite Sunbird):', eggSpecies)
  check('Egg species is the only sighted bird (Malachite Sunbird)', eggSpecies === 'Malachite Sunbird')

  // ---- Step 2: release ceremony -> placement -> resident + immediate adopt ----
  const clickedRelease = await evaluate(ws, `(() => { const b = document.querySelector('.tweety-release-btn'); if (b) { b.click(); return true; } return false; })()`)
  await sleep(700)
  check('Clicked release-to-garden (crowned Tweety)', clickedRelease)
  check('Ceremony farewell beat visible', await evaluate(ws, `/It is time, Agent/i.test(document.body.innerText||'')`))

  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(500)
  check('Ceremony advanced to placement-prompt beat', await evaluate(ws, `/choose.*spot in the garden/i.test(document.body.innerText||'')`))

  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(700)
  check('Landed on Garden page in placement mode', await evaluate(ws, `!!document.querySelector('.garden-scene-svg') && /choose where/i.test(document.body.innerText||'')`))

  const placed = await evaluate(ws, `(() => {
    const svg = document.querySelector('.garden-scene-svg');
    const rect = svg.getBoundingClientRect();
    const clientX = rect.left + (300/400)*rect.width, clientY = rect.top + (170/260)*rect.height;
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
    return 'clicked';
  })()`)
  await sleep(600)
  check('Tapped the lawn to place her', placed === 'clicked')

  s = await getState(ws)
  console.log('garden.residents:', JSON.stringify(s?.garden?.residents))
  console.log('tweety after release:', JSON.stringify(s?.tweety))
  console.log('mysteryEgg after release:', JSON.stringify(s?.mysteryEgg))
  check('Exactly 1 resident recorded', Array.isArray(s?.garden?.residents) && s.garden.residents.length === 1)
  check('Resident is the OLD companion (robin / Sunny)', s?.garden?.residents?.[0]?.companionId === 'robin' && s?.garden?.residents?.[0]?.name === 'Sunny')
  check('Resident has bornAt + releasedAt for the memory-wall nameplate', Boolean(s?.garden?.residents?.[0]?.bornAt) && Boolean(s?.garden?.residents?.[0]?.releasedAt))
  check('Tweety immediately adopted the already-hatched sunbird', s?.tweety?.companion === 'sunbird' && s?.tweety?.realSpecies === 'Malachite Sunbird')
  check('awaitingNextCompanion cleared (adopted, not waiting)', !s?.tweety?.awaitingNextCompanion)
  check('mysteryEgg cleared after adoption', s?.mysteryEgg === null || s?.mysteryEgg === undefined)

  const hasKeepsake = (s?.messages || []).some((m) => /farewell/i.test(m.title || ''))
  check('Release keepsake message pushed to inbox', hasKeepsake)

  await evaluate(ws, `(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /Home/i.test(x.textContent||'') || /🏡/.test(x.textContent||'')); if (b) b.click(); })()`)
  await sleep(700)
  check('New TweetyHomeCard rendered on Home (not AwaitingCompanionCard)', await evaluate(ws, `!!document.querySelector('.tweety-card') && !/Between companions/i.test(document.body.innerText||'')`))

  // ---- Step 3 (fresh session): release with NO egg waiting -> awaiting-gap ----
  await evaluate(ws, `(() => {
    localStorage.clear();
    localStorage.setItem('pooks_app_version', '2.0');
    localStorage.setItem('marlie-bird-session-v1', JSON.stringify({ role:'marnich', name:'Marnich' }));
    localStorage.setItem('marlie-marnich-mode', 'sandbox');
    localStorage.setItem('marnich_intro_seen', 'yes');
    localStorage.setItem('marlie-bird-app-marnich-v1', JSON.stringify({
      featherCoins: 500, introSeen: true, tweetyStore: [], settings: {},
      tweety: { name: 'Robbie', companion: 'weaver', bornAt: new Date(Date.now() - 40*86400000).toISOString(), careAt: {} },
      garden: { version: 1, shopUnlocked: [], plantings: [], elements: [], residents: [], sanctuary: false },
    }));
    return 'seeded';
  })()`)
  await navigate(ws, APP)
  await sleep(1200)
  for (let i = 0; i < 8; i++) {
    const skipped = await evaluate(ws, `(() => { const b=[...document.querySelectorAll('button')].find(x=>/skip|accept my mission|let's go|begin/i.test(x.textContent||'')); if(b){b.click();return true;} return false; })()`)
    await sleep(600)
    if (await evaluate(ws, `!!document.querySelector('.sandbox-tools')`)) break
    if (!skipped) await sleep(400)
  }
  await sleep(500)
  await evaluate(ws, `document.querySelector('.tweety-release-btn').click()`)
  await sleep(600)
  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(400)
  await evaluate(ws, `document.querySelector('.release-ceremony').click()`)
  await sleep(600)
  await evaluate(ws, `(() => {
    const svg = document.querySelector('.garden-scene-svg');
    const rect = svg.getBoundingClientRect();
    const clientX = rect.left + (100/400)*rect.width, clientY = rect.top + (170/260)*rect.height;
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
  })()`)
  await sleep(600)
  s = await getState(ws)
  check('No-egg release: tweety.companion is now null', s?.tweety?.companion === null || s?.tweety?.companion === undefined)
  check('No-egg release: awaitingNextCompanion is true', s?.tweety?.awaitingNextCompanion === true)
  check('No-egg release: lastReleasedName captured', s?.tweety?.lastReleasedName === 'Robbie')
  check('No-egg release: resident still recorded', s?.garden?.residents?.length === 1 && s.garden.residents[0].companionId === 'weaver')
  await evaluate(ws, `(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /Home/i.test(x.textContent||'') || /🏡/.test(x.textContent||'')); if (b) b.click(); })()`)
  await sleep(700)
  check('AwaitingCompanionCard shown on Home (naming Robbie)', await evaluate(ws, `/Robbie is settling into the garden/i.test(document.body.innerText||'')`))

  console.log('console errors during whole run:', JSON.stringify(errors))
  check('No console errors during whole run', errors.length === 0)

  ws.close(); proc.kill()
  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} checks passed`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
