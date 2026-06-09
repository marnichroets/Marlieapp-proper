// Pure helpers for Tweety the pet bird (no components, so Fast Refresh is happy).
// Tweety never dies or gets sick — it just gets a little droopy if forgotten and
// recovers fully with one care session.

export function defaultTweety() {
  return {
    name: 'Tweety',
    care: {}, // { 'YYYY-MM-DD': { fed, watered, played } }
    treatsReceived: 0,
    pendingTreat: false,
    lastBonusStreak: 0,
  }
}

function dayKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

// Same key tweetyToday/tweetyStreak read, so writes line up.
export function tweetyTodayKey() {
  return dayKey(0)
}

export function tweetyToday(tweety) {
  return tweety?.care?.[dayKey(0)] || { fed: false, watered: false, played: false }
}

function caredFully(day) {
  return Boolean(day && day.fed && day.watered && day.played)
}

// Consecutive fully-cared days ending today or yesterday.
export function tweetyStreak(tweety) {
  const care = tweety?.care || {}
  let streak = 0
  let offset = 0
  if (!caredFully(care[dayKey(0)])) {
    if (!caredFully(care[dayKey(1)])) return 0
    offset = 1
  }
  while (caredFully(care[dayKey(offset)])) {
    streak += 1
    offset += 1
  }
  return streak
}

export function tweetyDaysCared(tweety) {
  return Object.values(tweety?.care || {}).filter(caredFully).length
}

export function tweetyLongestStreak(tweety) {
  const days = Object.keys(tweety?.care || {})
    .filter((k) => caredFully(tweety.care[k]))
    .sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of days) {
    const d = new Date(k)
    if (prev && (d - prev) / 86400000 === 1) run += 1
    else run = 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

// Gentle mood: only truly "sad" after a whole forgotten day.
export function tweetyMood(tweety) {
  const today = tweetyToday(tweety)
  const doneCount = [today.fed, today.watered, today.played].filter(Boolean).length
  if (doneCount === 3) return 'happy'
  if (doneCount > 0) return 'content'
  if (caredFully(tweety?.care?.[dayKey(1)])) return 'content'
  return 'sad'
}

const LEVELS = [
  { min: 0, key: 'chick', label: 'Tiny Chick 🐣' },
  { min: 10, key: 'fledgling', label: 'Fledgling 🐥' },
  { min: 25, key: 'grown', label: 'Full-grown 🐤' },
  { min: 50, key: 'crown', label: 'Crowned Bird 👑' },
]

export function tweetyLevel(birdCount) {
  return LEVELS.reduce((acc, lvl) => (birdCount >= lvl.min ? lvl : acc), LEVELS[0])
}

// ---- chirp via Web Audio (no files) ----------------------------------------
let audioCtx
function getCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    try {
      audioCtx = new Ctx()
    } catch {
      return null
    }
  }
  return audioCtx
}

export function playChirp(kind = 'feed') {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const base = kind === 'water' ? 640 : kind === 'play' ? 880 : 760
  const now = ctx.currentTime
  ;[0, 0.13].forEach((t, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(base * (i ? 1.28 : 1), now + t)
    osc.frequency.exponentialRampToValueAtTime(base * (i ? 1.7 : 1.35), now + t + 0.08)
    gain.gain.setValueAtTime(0.0001, now + t)
    gain.gain.exponentialRampToValueAtTime(0.16, now + t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.13)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + t)
    osc.stop(now + t + 0.16)
  })
}
