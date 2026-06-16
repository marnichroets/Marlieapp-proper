// Verifies the daily Bird Council message rotation: 60+ messages, no repeats
// within a cycle, never the same message two days running (even across the
// cycle boundary), and the presentation-week specials fire on the right dates.
// Run: node scripts/test-council-messages.mjs
import assert from 'node:assert'
import {
  COUNCIL_MESSAGES,
  SPECIAL_COUNCIL_MESSAGES,
  nextCouncilMessage,
  specialCouncilMessage,
} from '../src/messages.js'

let n = 0
const ok = (name, cond) => { assert(cond, 'FAILED: ' + name); console.log('  ✓', name); n++ }

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

// 5. Presentation-week specials fire on their exact dates and replace rotation.
const week = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
for (const d of week) {
  ok(`special dispatch scheduled for ${d}`, typeof specialCouncilMessage(d) === 'string')
}
ok('a normal day has no special (rotation runs)', specialCouncilMessage('2026-07-01') === null)
ok('exactly 5 presentation-week specials', Object.keys(SPECIAL_COUNCIL_MESSAGES).length === 5)

console.log(`\n✅ ALL ${n} COUNCIL-MESSAGE ASSERTIONS PASSED`)
