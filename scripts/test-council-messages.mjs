// Verifies the daily Bird Council dispatch end to end:
//   • the rotation pool is 60+, never repeats within a cycle, and never repeats
//     the previous day (even across the cycle boundary);
//   • the presentation-week AND Cape Town specials fire on their exact dates and
//     replace the rotation without disturbing the rotation log;
//   • councilDispatchForDay delivers EXACTLY ONE new dispatch per day with no
//     gaps and no repeats across a long consecutive-day run, and is idempotent
//     within a day — including when a cross-device sync adopt CLOBBERS the local
//     state right after the dispatch (the bug that froze Pooks' inbox).
// Run: node scripts/test-council-messages.mjs
import assert from 'node:assert'
import {
  COUNCIL_MESSAGES,
  SPECIAL_COUNCIL_MESSAGES,
  nextCouncilMessage,
  specialCouncilMessage,
  councilDispatchForDay,
} from '../src/messages.js'

let n = 0
const ok = (name, cond) => { assert(cond, 'FAILED: ' + name); console.log('  ✓', name); n++ }
const clone = (o) => JSON.parse(JSON.stringify(o))

// 1. Pool size.
ok(`pool has 60+ messages (${COUNCIL_MESSAGES.length})`, COUNCIL_MESSAGES.length >= 60)

// 2. Drive the rotation for 3 full cycles and check the invariants the way the
//    app uses it (carrying the returned `shown` log forward each day).
const total = COUNCIL_MESSAGES.length
let shown = []
let prevIndex = -1
const firstCycle = []
for (let day = 0; day < total * 3; day += 1) {
  const { index, text, shown: nextShown } = nextCouncilMessage(shown)
  assert(text === COUNCIL_MESSAGES[index], 'returned text matches index')
  assert(index !== prevIndex, `day ${day}: must differ from previous day (got ${index} twice)`)
  if (day < total) firstCycle.push(index)
  prevIndex = index
  shown = nextShown
}
ok('never repeats the previous day across 3 full cycles', true)

// 3. The first full cycle shows every message exactly once (no repeats in a cycle).
ok('first cycle covers all messages with no repeats',
  new Set(firstCycle).size === total && firstCycle.length === total)

// 4. The shown log never grows unbounded (resets each cycle).
ok('shown log stays bounded (<= pool size)', shown.length <= total)

// 5. Special dispatches fire on their exact dates and replace the rotation.
const presentationWeek = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
const capeTownWeek = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24',
  '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29']
for (const d of [...presentationWeek, ...capeTownWeek]) {
  ok(`special dispatch scheduled for ${d}`, typeof specialCouncilMessage(d) === 'string')
}
ok('a normal day has no special (rotation runs)', specialCouncilMessage('2026-07-01') === null)
ok(`every special day is in the map (${Object.keys(SPECIAL_COUNCIL_MESSAGES).length} total)`,
  Object.keys(SPECIAL_COUNCIL_MESSAGES).length === presentationWeek.length + capeTownWeek.length)

// --- 6. Consecutive-day simulation of the real inbox effect -----------------
// Generate a run of consecutive YYYY-MM-DD keys (the same key space saDateKey
// produces) spanning normal days, the presentation week and the Cape Town week.
function dayKeys(startISO, count) {
  const keys = []
  // Anchor at midday UTC so adding whole days never trips over a boundary.
  let t = new Date(startISO + 'T12:00:00Z').getTime()
  for (let i = 0; i < count; i += 1) {
    keys.push(new Date(t).toISOString().slice(0, 10))
    t += 86400000
  }
  return keys
}

// Apply one "the app decided today's dispatch" step, exactly as App.jsx does.
function applyDispatch(state, todayKey) {
  const dispatch = councilDispatchForDay(state.messagesMeta, todayKey)
  if (!dispatch) return state
  return {
    messages: [dispatch.message, ...state.messages],
    messagesMeta: dispatch.meta,
  }
}

const run = dayKeys('2026-06-10', 40) // 10 Jun → 19 Jul: normal + both special weeks
let state = { messages: [], messagesMeta: { lastCouncilDay: '', shownCouncil: [] } }
let backend = clone(state) // what the cross-device sync would adopt at app open
let prevBody = null
let gaps = 0
let consecutiveRepeats = 0
let specialMisses = 0

for (const today of run) {
  const countBefore = state.messages.length

  // (a) App opens: the effect adds today's dispatch.
  state = applyDispatch(state, today)

  // (b) Cross-device sync adopts the backend copy from BEFORE this open — the
  //     clobber that used to wipe the just-added dispatch and revert
  //     lastCouncilDay. The effect re-runs (it keys off lastCouncilDay) and
  //     reconciles against whatever state actually won.
  state = clone(backend)
  state = applyDispatch(state, today)

  // (c) Opening again the same day must NOT add a second dispatch (idempotent).
  state = applyDispatch(state, today)

  // The save pushes the reconciled state to the backend for next time.
  backend = clone(state)

  const added = state.messages.length - countBefore
  if (added !== 1) gaps += 1
  if (state.messagesMeta.lastCouncilDay !== today) gaps += 1

  const body = state.messages[0]?.body
  if (prevBody !== null && body === prevBody) consecutiveRepeats += 1
  prevBody = body

  const special = SPECIAL_COUNCIL_MESSAGES[today]
  if (special && body !== special) specialMisses += 1
}

ok('exactly one dispatch per day across 40 consecutive days, even through sync clobber', gaps === 0)
ok('never the same dispatch two days running', consecutiveRepeats === 0)
ok('every special day delivered its exact special message', specialMisses === 0)
ok('total messages equals number of days (no skips, no duplicates)', state.messages.length === run.length)

// 7. councilDispatchForDay returns null once today's dispatch is delivered.
ok('null after today already delivered (idempotent guard)',
  councilDispatchForDay({ lastCouncilDay: '2026-07-01', shownCouncil: [] }, '2026-07-01') === null)

console.log(`\n✅ ALL ${n} COUNCIL-MESSAGE ASSERTIONS PASSED`)
