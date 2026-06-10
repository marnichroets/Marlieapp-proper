// Pure helpers for Tweety the pet bird (no components, so Fast Refresh is happy).
// Tweety never dies or gets sick — it just gets a little droopy if forgotten and
// recovers fully with one care session.

// Tweety stays a golden chick but adopts her companion's signature accent
// (a head cap and/or chest patch) so she "takes on that bird's appearance".
export const TWEETY_COMPANIONS = [
  { id: 'weaver', name: 'Sunny the Weaver', cap: '', chest: '', blurb: 'A golden garden architect 🟡' },
  { id: 'robin', name: 'Robin the Robin-Chat', cap: '', chest: '#E8743C', blurb: 'Warm orange-chested singer 🧡' },
  { id: 'sunbird', name: 'Jewel the Sunbird', cap: '#3FA66A', chest: '', blurb: 'A glittering green sipper 💚' },
  { id: 'bishop', name: 'Blaze the Bishop', cap: '#E0463A', chest: '', blurb: 'A tiny scarlet flame 🔥' },
  { id: 'sparrow', name: 'Pip the Sparrow', cap: '#9A7B53', chest: '', blurb: 'A cheeky little seed-lover 🤎' },
  { id: 'kingfisher', name: 'Splash the Kingfisher', cap: '#3E78C8', chest: '#E8743C', blurb: 'A blue-and-orange water gem 💙' },
]

export function getCompanion(id) {
  return TWEETY_COMPANIONS.find((c) => c.id === id) || TWEETY_COMPANIONS[0]
}

export function defaultTweety() {
  return {
    name: 'Tweety',
    companion: null, // set on first login from TWEETY_COMPANIONS
    care: {}, // { 'YYYY-MM-DD': { fed, watered, played } }
    treatsReceived: 0,
    pendingTreat: false,
    lastBonusStreak: 0,
    // Family + aviary
    egg: null, // legacy single egg (kept for back-compat; basket is primary now)
    baby: null, // { hatchedAt, species, careLog }
    aviary: [], // [{ id, species, addedAt, idle }]
    lastAviaryPayout: '',
    guardian: false,
    flockTreat: false,
    // Tweety World
    eggs: [], // egg basket: [{ id, species, kind }]
    incubating: null, // { species, kind, progress, lastWarmDay, extraDays }
    sanctuary: [], // [{ id, name, date, how, note }]
    room: { furniture: ['perch'], visits: 0 },
    worldEvent: null, // active story event
    escape: null, // active escape event
    // Wardrobe: owned wearables, what Tweety is wearing, and the wishlist.
    wardrobe: { owned: [], worn: { hat: null, accessory: null, outfit: null }, wishlist: [] },
    lastVisit: null, // ISO of last home visit (for the 24h "miss you" nudge)
  }
}

export const AVIARY_MAX = 8

// Rare birds that only ever arrive via a mystery egg from Marnich.
export const RARE_EGG_BIRDS = [
  'Lilac-breasted Roller',
  'Narina Trogon',
  'African Pygmy Kingfisher',
  'Knysna Turaco',
  'Purple-crested Turaco',
  'Malachite Kingfisher',
]

export function daysSince(iso) {
  if (!iso) return 0
  const then = new Date(iso)
  then.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now - then) / 86400000))
}

// Baby grows over ~7 days: hatchling (0-2), fledgling (3-5), adult (6+).
export function babyStage(baby) {
  if (!baby) return null
  const d = daysSince(baby.hatchedAt)
  if (d >= 6) return 'adult'
  if (d >= 3) return 'fledgling'
  return 'hatchling'
}

export function babyStageLabel(stage) {
  return { hatchling: 'Hatchling 🐣', fledgling: 'Fledgling 🐥', adult: 'All grown up 🐤' }[stage] || ''
}

export function babyCareToday(baby) {
  const key = new Date().toISOString().slice(0, 10)
  return baby?.careLog?.[key] || { fed: false, watered: false }
}

// Coins for releasing a baby at each stage.
export function releaseCoins(stage) {
  return { hatchling: 30, fledgling: 60, adult: 200 }[stage] || 30
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
// neverSad (from store perks like the Infinite Feeder / Playground) floors it at content.
export function tweetyMood(tweety, { neverSad = false } = {}) {
  const today = tweetyToday(tweety)
  const doneCount = [today.fed, today.watered, today.played].filter(Boolean).length
  if (doneCount === 3) return 'happy'
  if (doneCount > 0) return 'content'
  if (caredFully(tweety?.care?.[dayKey(1)])) return 'content'
  return neverSad ? 'content' : 'sad'
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

// Gentle interaction sound for Bird Room furniture.
export function roomSound(kind) {
  playChirp(kind === 'bath' ? 'water' : kind === 'musicbox' ? 'play' : 'feed')
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
