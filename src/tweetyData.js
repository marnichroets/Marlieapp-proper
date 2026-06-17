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

// ---- First egg (first-time experience) -------------------------------------
// Six coloured eggs. Each secretly holds one companion, revealed only after the
// egg hatches (3 days of warming). She picks a colour, not a bird — more magical.
export const FIRST_EGGS = [
  { id: 0, color: '#F6A5C0', name: 'Blush' },
  { id: 1, color: '#9AD0F0', name: 'Sky' },
  { id: 2, color: '#C9E8A8', name: 'Meadow' },
  { id: 3, color: '#FBE6A8', name: 'Sunlight' },
  { id: 4, color: '#C9A8E8', name: 'Lilac' },
  { id: 5, color: '#F4C79F', name: 'Peach' },
]

export const FIRST_EGG_WARMS = 3

export function firstEggCompanionFor(id) {
  return TWEETY_COMPANIONS[id % TWEETY_COMPANIONS.length]?.id || TWEETY_COMPANIONS[0].id
}

// ---- Three daily care windows (a natural routine, not a timer game) --------
// Tweety is cared for three times a day inside fixed windows. Inside a window
// she can feed, water AND play once each; outside every window she is resting.
// Completing all three windows in a day = full happiness and the day counts
// toward her streak. Missing a window (it closes uncompleted) makes her a
// little sad.
export const CARE_WINDOWS = [
  { key: 'morning', label: 'Morning', emoji: '🌅', start: 6, end: 10 },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️', start: 12, end: 16 },
  { key: 'evening', label: 'Evening', emoji: '🌙', start: 18, end: 22 },
]

// The window we're inside right now, or null if Tweety is resting.
export function currentCareWindow(now = new Date()) {
  const h = now.getHours()
  return CARE_WINDOWS.find((w) => h >= w.start && h < w.end) || null
}

// The next window to open and how many whole hours until it does.
export function nextCareWindow(now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60
  for (const w of CARE_WINDOWS) {
    if (h < w.start) return { window: w, hoursUntil: Math.max(1, Math.ceil(w.start - h)) }
  }
  // Past the last window today — the next one is tomorrow morning.
  const first = CARE_WINDOWS[0]
  return { window: first, hoursUntil: Math.max(1, Math.ceil(24 - h + first.start)) }
}

// The moment the given window started today (used to scope careAt timestamps).
function windowStartTime(window, now = new Date()) {
  const d = new Date(now)
  d.setHours(window.start, 0, 0, 0)
  return d.getTime()
}

// Which of feed/water/play have been done WITHIN the current window. Outside a
// window everything reads false and `window` is null (→ resting).
export function tweetyCareState(tweety, now = new Date()) {
  const win = currentCareWindow(now)
  if (!win) return { fed: false, watered: false, played: false, window: null }
  const at = tweety?.careAt || {}
  const start = windowStartTime(win, now)
  const inWindow = (iso) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return !Number.isNaN(t) && t >= start
  }
  return {
    fed: inWindow(at.fed),
    watered: inWindow(at.watered),
    played: inWindow(at.played),
    window: win,
  }
}

// How many of today's windows have been fully completed (feed+water+play).
export function windowsDoneToday(tweety) {
  const day = tweety?.care?.[dayKey(0)] || {}
  return CARE_WINDOWS.filter((w) => day[w.key]).length
}

// Has a window already CLOSED today without being completed? (→ a little sad.)
function missedAWindow(tweety, now = new Date()) {
  const day = tweety?.care?.[dayKey(0)] || {}
  const h = now.getHours()
  return CARE_WINDOWS.some((w) => h >= w.end && !day[w.key])
}

// Five clear moods built from the window routine.
export function tweetySimpleMood(tweety, now = new Date()) {
  if (windowsDoneToday(tweety) === 3) return 'happy'
  const care = tweetyCareState(tweety, now)
  const missed = missedAWindow(tweety, now)
  if (care.window) {
    if (care.fed && care.watered && care.played) return 'content'
    if (!care.fed) return missed && !care.watered && !care.played ? 'sad' : 'hungry'
    if (!care.watered) return 'thirsty'
    return 'content'
  }
  // Resting between windows.
  if (windowsDoneToday(tweety) > 0) return 'content'
  return missed ? 'sad' : 'content'
}

export const MOOD_FACE = {
  happy: { emoji: '😊', label: 'Happy', line: 'is happy and chirpy!' },
  content: { emoji: '🙂', label: 'Content', line: 'is feeling content.' },
  hungry: { emoji: '😐', label: 'Hungry', line: 'is getting hungry — time for seeds.' },
  thirsty: { emoji: '😟', label: 'Thirsty', line: 'is thirsty — fresh water please.' },
  sad: { emoji: '😢', label: 'Sad', line: 'missed you — a little care will cheer them up.' },
}

// ---- Growth over REAL days --------------------------------------------------
// Five clearly different life stages that unfold over real calendar days.
// maxDay is the last 0-based day index that still belongs to the stage
// (day index 0 = the day she hatched). The human-friendly "Day N" shown to
// Pooks is always maxDay/firstDay + 1.
const GROWTH_STAGES = [
  { key: 'chick', label: 'Tiny chick 🐣', short: 'Chick', maxDay: 2, scale: 0.6 },
  { key: 'fledgling', label: 'Small fledgling 🐤', short: 'Fledgling', maxDay: 6, scale: 0.74 },
  { key: 'young', label: 'Young bird 🐦', short: 'Young bird', maxDay: 13, scale: 0.87 },
  { key: 'adult', label: 'Adult bird 🦜', short: 'Adult', maxDay: 20, scale: 1 },
  { key: 'crowned', label: 'Crowned adult 👑', short: 'Crowned adult', maxDay: Infinity, scale: 1 },
]

// Days since Tweety hatched (0-based). Falls back gracefully if bornAt missing.
export function tweetyAgeDays(tweety) {
  const born = tweety?.bornAt
  if (!born) return 0
  return daysSince(born)
}

export function tweetyGrowthIndex(tweety) {
  const d = tweetyAgeDays(tweety)
  const idx = GROWTH_STAGES.findIndex((s) => d <= s.maxDay)
  return idx === -1 ? GROWTH_STAGES.length - 1 : idx
}

export function tweetyGrowth(tweety) {
  return GROWTH_STAGES[tweetyGrowthIndex(tweety)]
}

// Rich progress info for the home growth bar / day counter / celebrations.
// Returns the current stage, the 1-based day number, the next stage (if any),
// how many real days until she reaches it, and an overall progress percent.
export function tweetyGrowthProgress(tweety) {
  const d = tweetyAgeDays(tweety) // 0-based
  const idx = tweetyGrowthIndex(tweety)
  const stage = GROWTH_STAGES[idx]
  const next = GROWTH_STAGES[idx + 1] || null
  const dayNumber = d + 1 // human friendly "Day 3"
  const firstDay = idx === 0 ? 0 : GROWTH_STAGES[idx - 1].maxDay + 1
  let daysToNext = null
  let percent = 100
  if (next) {
    const nextStarts = stage.maxDay + 1 // 0-based first day of next stage
    daysToNext = Math.max(1, nextStarts - d)
    const span = stage.maxDay - firstDay + 1
    percent = Math.min(100, Math.round(((d - firstDay + 1) / span) * 100))
  }
  return {
    stage,
    stageKey: stage.key,
    index: idx,
    dayNumber,
    next,
    daysToNext,
    percent,
    // e.g. "Day 3 — Fledgling in 1 day" / "Day 25 — Fully grown 👑"
    caption: next
      ? `Day ${dayNumber} — ${next.short} in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`
      : `Day ${dayNumber} — Fully grown 👑`,
  }
}

// A short, warm "what kind of day Tweety is having" line for the World card:
// her current life stage + day number, coloured by today's care/mood. This is
// pure storybook flavour — a tiny daily story beat, never an instruction (the
// home-screen mood face already handles the "feed me / water me" nudges), so
// these read gently even when she is a bit hungry.
const STORYBOOK_MOOD_LINES = {
  happy: 'happy and chirpy after a full day of care',
  content: 'pottering about, content as can be',
  hungry: 'getting peckish and dreaming of seeds',
  thirsty: 'eyeing the water dish rather hopefully',
  sad: 'a little mopey today and missing you',
}

export function tweetyStorybookLine(tweety, now = new Date()) {
  if (!tweety?.companion || !tweety?.bornAt) {
    return 'settling into her cosy little world'
  }
  const { stage, dayNumber } = tweetyGrowthProgress(tweety)
  const emoji = stage.label.split(' ').pop() // each stage label ends with its emoji
  const mood = tweetySimpleMood(tweety, now)
  const flavour = STORYBOOK_MOOD_LINES[mood] || STORYBOOK_MOOD_LINES.content
  return `Day ${dayNumber} · ${stage.short} ${emoji} — ${flavour}`
}

// Tweety's default look. She is her companion from day one (no egg to hatch), a
// plain golden chick at stage 1 that grows through the five stages via daily care.
export const DEFAULT_COMPANION = 'weaver'

export function defaultTweety() {
  return {
    name: 'Tweety',
    companion: DEFAULT_COMPANION, // Tweety is the companion from the start
    firstEgg: null, // deprecated (eggs removed) — kept null for back-compat
    bornAt: new Date().toISOString(), // ISO she began — drives real-day growth
    care: {}, // legacy daily care (kept for back-compat)
    careAt: { fed: null, watered: null, played: null }, // ISO of last each action (8h reset)
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

// Today's per-window completion map, e.g. { morning: true, evening: true }.
export function tweetyToday(tweety) {
  return tweety?.care?.[dayKey(0)] || {}
}

// A day is "fully cared for" only when all three care windows were completed.
function caredFully(day) {
  return Boolean(day && CARE_WINDOWS.every((w) => day[w.key]))
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

// Home-screen mood tint (happy / content / sad), derived from the window mood.
// neverSad (from store perks like the Infinite Feeder / Playground) floors it
// at content.
export function tweetyMood(tweety, { neverSad = false } = {}) {
  const mood = tweetySimpleMood(tweety)
  if (mood === 'happy') return 'happy'
  if (mood === 'sad') return neverSad ? 'content' : 'sad'
  return 'content'
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
