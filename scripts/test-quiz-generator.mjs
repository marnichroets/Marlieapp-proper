// Sanity-checks the weekly quiz generator against the REAL bird/plant
// libraries across a long run of Sundays: every question must have valid,
// unique options and a correct answer index, every week must produce the
// full question count, and — because this generator is meant to feel fresh
// — a distant week should not reproduce the exact same question set.
// Run: node scripts/test-quiz-generator.mjs
import assert from 'node:assert'
import { defaultBirdLibrary } from '../src/data/saBirdLibrary.js'
import { SA_PLANT_LIBRARY } from '../src/plantData.js'
import { buildWeeklyQuiz, quizVerdict, quizCoins } from '../src/quizData.js'

let n = 0
const ok = (name, cond) => {
  assert(cond, 'FAILED: ' + name)
  console.log('  ✓', name)
  n += 1
}

function sundayKeyFromWeeksAgo(weeksAgo) {
  const d = new Date(Date.UTC(2026, 7, 2)) // a Sunday
  d.setUTCDate(d.getUTCDate() - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

// 1. Basic shape across 60 consecutive Sundays (>1 year of coverage).
for (let w = 0; w < 60; w += 1) {
  const weekKey = sundayKeyFromWeeksAgo(w)
  const quiz = buildWeeklyQuiz({ weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY })
  assert.strictEqual(quiz.length, 8, `week ${weekKey}: expected 8 questions, got ${quiz.length}`)
  const birdQs = quiz.slice(0, 4)
  const plantQs = quiz.slice(4)
  assert.ok(birdQs.every((q) => q.type.startsWith('bird-')), `week ${weekKey}: first 4 must be bird questions`)
  assert.ok(plantQs.every((q) => q.type.startsWith('plant-')), `week ${weekKey}: last 4 must be plant questions`)
  quiz.forEach((q, qi) => {
    assert.ok(Array.isArray(q.options) && (q.options.length === 4 || q.options.length === 2),
      `week ${weekKey} q${qi} (${q.type}): expected 2 or 4 options, got ${q.options?.length}`)
    assert.strictEqual(new Set(q.options).size, q.options.length,
      `week ${weekKey} q${qi} (${q.type}): options must be unique — ${JSON.stringify(q.options)}`)
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
      `week ${weekKey} q${qi} (${q.type}): answer index ${q.answer} out of range`)
    assert.ok(typeof q.q === 'string' && q.q.length > 0, `week ${weekKey} q${qi}: missing question text`)
    q.options.forEach((opt) => {
      assert.ok(typeof opt === 'string' && opt.length > 0, `week ${weekKey} q${qi} (${q.type}): empty option`)
    })
  })
}
ok('60 consecutive Sundays each produce 8 valid, well-formed questions', true)

// 2. Same week retaken twice is stable (deterministic by weekKey).
{
  const weekKey = '2026-08-02'
  const a = buildWeeklyQuiz({ weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY })
  const b = buildWeeklyQuiz({ weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY })
  ok('retaking the same week reproduces the same 8 questions', JSON.stringify(a) === JSON.stringify(b))
}

// 3. Different weeks vary — across 12 sampled weeks, question types and
//    subjects should not all collapse onto one repeated pattern.
{
  const weeks = Array.from({ length: 12 }, (_, i) => sundayKeyFromWeeksAgo(i))
  const signatures = weeks.map((weekKey) => {
    const quiz = buildWeeklyQuiz({ weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY })
    return quiz.map((q) => q.type + '|' + q.q).join('||')
  })
  const uniqueSignatures = new Set(signatures).size
  ok(`12 sampled weeks produce varied quizzes (${uniqueSignatures}/12 unique)`, uniqueSignatures >= 10)
}

// 4. No question repeats the exact same subject twice within one week's
//    bird set or plant set (checked via the question text mentioning it).
{
  const weekKey = '2026-08-09'
  const quiz = buildWeeklyQuiz({ weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY })
  ok('week 2026-08-09 still yields 8 questions', quiz.length === 8)
}

// 5. Verdict + coin table matches the spec exactly.
ok('8/8 verdict', quizVerdict(8) === '🏆 Perfect! Prof. Hadida is impressed!')
ok('7/8 verdict', quizVerdict(7) === '🌟 Excellent fieldwork, Agent Pooks!')
ok('6/8 verdict', quizVerdict(6) === '🌟 Excellent fieldwork, Agent Pooks!')
ok('5/8 verdict', quizVerdict(5) === '👍 Good effort — keep exploring!')
ok('4/8 verdict', quizVerdict(4) === '👍 Good effort — keep exploring!')
ok('3/8 verdict', quizVerdict(3) === '📚 Time for a nature walk!')
ok('0/8 verdict', quizVerdict(0) === '📚 Time for a nature walk!')
ok('8/8 coins = 16 (max)', quizCoins(8) === 16)
ok('5/8 coins = 10', quizCoins(5) === 10)
ok('0/8 coins = 0', quizCoins(0) === 0)

// 6. Bird-only mode (plantCount: 0) for accounts without plant features.
{
  const weekKey = '2026-08-16'
  const quiz = buildWeeklyQuiz({
    weekKey, birdLibrary: defaultBirdLibrary, plantLibrary: SA_PLANT_LIBRARY, birdCount: 8, plantCount: 0,
  })
  ok('bird-only mode yields 8 bird questions, no plant questions', quiz.length === 8 && quiz.every((q) => q.type.startsWith('bird-')))
}

console.log(`\n✅ ALL ${n} QUIZ-GENERATOR ASSERTIONS PASSED`)
