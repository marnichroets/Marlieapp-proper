// The Greenhouse — pure data + helpers for the indoor potted-plant care loop
// (planting, watering, health/death, trimming, tools, pot styles, rewards).
// No components here, so Fast Refresh stays happy. Mirrors gardenData.js's
// grow-from-seed spirit (same seeds/coins economy, same once-per-SA-day
// watering gate) but is its own richer care sim: fixed shelf slots instead of
// free placement, a health/decay clock, and a trimming chore — since the
// greenhouse is a small cosy room she tends closely, not an open lawn.
import { saDateKey, saDateKeyOffset } from './saDate'

// ---- slots -------------------------------------------------------------
// Two physical shelves in the scene (see GreenhouseScene in Greenhouse.jsx):
// a wall-mounted top shelf (slots 0-3, unlocked from the start) and the
// potting bench below it (slots 4-7, unlocked via the shop). Positions are
// scene units (viewBox 0 0 320 260) — the pot's base/rim sits at (x, y).
export const POT_SLOTS = [
  { id: 0, x: 88, y: 98, shelf: 'top' },
  { id: 1, x: 140, y: 98, shelf: 'top' },
  { id: 2, x: 192, y: 98, shelf: 'top' },
  { id: 3, x: 244, y: 98, shelf: 'top' },
  { id: 4, x: 88, y: 182, shelf: 'bottom' },
  { id: 5, x: 140, y: 182, shelf: 'bottom' },
  { id: 6, x: 192, y: 182, shelf: 'bottom' },
  { id: 7, x: 244, y: 182, shelf: 'bottom' },
]

export const BASE_SLOTS = 4
export const MAX_SLOTS = POT_SLOTS.length
export const SLOT_COST = 500

export function slotById(id) {
  return POT_SLOTS.find((s) => s.id === id) || null
}

// ---- pot styles (cosmetic, permanent once bought) -----------------------
export const POT_STYLES = [
  { id: 'terracotta', name: 'Terracotta', cost: 0, blurb: 'The classic clay pot.' },
  { id: 'wooden-barrel', name: 'Wooden Barrel', cost: 250, blurb: 'A rustic little half-barrel.' },
  { id: 'ceramic', name: 'Ceramic', cost: 300, blurb: 'White with a hand-painted blue line.' },
  { id: 'painted', name: 'Painted Sage', cost: 350, blurb: 'A soft sage-green glaze.' },
  { id: 'macrame', name: 'Hanging Macramé', cost: 400, blurb: 'Woven cord, hung from the beam above.' },
  { id: 'gold-trim', name: 'Gold Trim', cost: 500, blurb: 'Terracotta finished with a gilded rim.' },
]

export function potStyleItem(id) {
  return POT_STYLES.find((s) => s.id === id) || POT_STYLES[0]
}

// ---- tools (greenhouse shop, permanent unless noted) ---------------------
export const SCISSORS_COST = 200
export const SPRAY_BOTTLE_COST = 150
export const PLANT_FOOD_COST = 100
export const PLANT_FOOD_USES = 5
export const GROW_LIGHT_COST = 400
export const SPRAY_HEALTH_BONUS = 10

export const TOOLS = [
  { id: 'scissors', name: 'Scissors', emoji: '✂️', cost: SCISSORS_COST, blurb: 'Required to trim overgrown pots.' },
  { id: 'spray-bottle', name: 'Spray Bottle', emoji: '💦', cost: SPRAY_BOTTLE_COST, blurb: 'Mist a plant for +10 bonus health, once a day per plant.' },
  {
    id: 'plant-food', name: 'Plant Food', emoji: '🌱', cost: PLANT_FOOD_COST, consumable: true, uses: PLANT_FOOD_USES,
    blurb: `Your next ${PLANT_FOOD_USES} waterings count double toward growth.`,
  },
  { id: 'grow-light', name: 'Grow Light', emoji: '💡', cost: GROW_LIGHT_COST, blurb: 'Every 4th watering counts double — plants grow ~25% faster.' },
]

export function toolItem(id) {
  return TOOLS.find((t) => t.id === id) || null
}

export function ownedToolUses(greenhouse, toolId) {
  const owned = (greenhouse?.ownedTools || []).find((t) => t.id === toolId)
  return owned ? owned.uses : 0
}

export function hasTool(greenhouse, toolId) {
  return Boolean((greenhouse?.ownedTools || []).some((t) => t.id === toolId))
}

// ---- growth stages --------------------------------------------------------
// Stage is purely derived from wateredDays.length so it can never drift out
// of sync with the care record. Thresholds per the agreed pacing: seedling
// 1-2, sprout 3-5, growing 6-9, blooming 10+.
export const STAGES = ['seedling', 'sprout', 'growing', 'blooming']
// Progressively larger — fed straight into GardenPlant's `size` prop (px).
export const STAGE_SIZE = { seedling: 34, sprout: 55, growing: 80, blooming: 108 }

export function potStageKey(pot) {
  const n = pot?.wateredDays?.length || 0
  if (n >= 10) return 'blooming'
  if (n >= 6) return 'growing'
  if (n >= 3) return 'sprout'
  return 'seedling'
}

export function isBlooming(pot) {
  return potStageKey(pot) === 'blooming'
}

export const STAGE_LABELS = {
  seedling: 'Seedling', sprout: 'Sprout', growing: 'Growing', blooming: 'In bloom 🌸',
}

// ---- day maths --------------------------------------------------------
function dayDiff(fromKey, toKey) {
  if (!fromKey) return 0
  const from = new Date(`${fromKey}T00:00:00Z`)
  const to = new Date(`${toKey}T00:00:00Z`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  return Math.round((to - from) / 86400000)
}

export function wateredToday(pot, today = saDateKey()) {
  const days = pot?.wateredDays || []
  return days[days.length - 1] === today
}

export function canWaterPot(pot, today = saDateKey()) {
  return Boolean(pot) && !pot.dead && !wateredToday(pot, today)
}

export function canMistPot(pot, today = saDateKey()) {
  return Boolean(pot) && !pot.dead && pot.lastMistDate !== today
}

// ---- health --------------------------------------------------------------
export const HEALTH_DECAY_PER_DAY = 20
export const TRIM_INTERVAL = 5
export const TRIM_GRACE_DAYS = 3
export const TRIM_EXTRA_DECAY = 5

// Fully derived from the care record every time it's called — never
// incrementally mutated — so it's safe to recompute on every greenhouse
// mount without any risk of double-decaying. Watering resets the "last
// cared" date to today, which is exactly what makes the pot read as 100
// again once daysSinceCare drops back to 0.
export function computeHealth(pot, today = saDateKey()) {
  if (!pot || pot.dead) return 0
  const days = pot.wateredDays || []
  const lastCare = days.length ? days[days.length - 1] : pot.plantedDate
  const daysSinceCare = Math.max(0, dayDiff(lastCare, today))
  let health = 100 - daysSinceCare * HEALTH_DECAY_PER_DAY
  if (pot.needsTrimming) {
    const lastTrim = pot.lastTrimDate || pot.plantedDate
    const daysSinceTrim = Math.max(0, dayDiff(lastTrim, today))
    if (daysSinceTrim >= TRIM_GRACE_DAYS) {
      health -= (daysSinceTrim - TRIM_GRACE_DAYS + 1) * TRIM_EXTRA_DECAY
    }
  }
  return Math.max(0, Math.min(100, Math.round(health)))
}

export function healthTier(health) {
  if (health <= 0) return 'dead'
  if (health >= 80) return 'vibrant'
  if (health >= 50) return 'wilted'
  return 'sick'
}

// Did watering just cross a multiple of TRIM_INTERVAL? Compared by index
// range rather than `% === 0` so a double-counted watering (Plant Food /
// Grow Light pushing 2+ entries at once) can't ever jump clean over a
// threshold without tripping it.
export function crossedTrimThreshold(prevLength, nextLength) {
  return Math.floor(prevLength / TRIM_INTERVAL) < Math.floor(nextLength / TRIM_INTERVAL)
}

// ---- rewards --------------------------------------------------------------
export const FIRST_BLOOM_COINS = 30
export const TRIM_COINS = 5
export const STREAK_DAYS = 7
export const STREAK_COINS = 15
export const ALL_BLOOM_COINS = 200

export function allSlotsBlooming(greenhouse) {
  const pots = greenhouse?.pots || []
  if (pots.length < (greenhouse?.unlockedSlots || BASE_SLOTS)) return false
  return pots.length > 0 && pots.every((p) => !p.dead && isBlooming(p))
}

// ---- fresh state ------------------------------------------------------
export function defaultGreenhouse() {
  return {
    version: 1,
    pots: [],
    unlockedSlots: BASE_SLOTS,
    ownedTools: [],
    ownedPotStyles: ['terracotta'],
    selectedPotStyle: 'terracotta',
    waterStreak: 0,
    lastWaterDate: null,
    allBloomClaimed: false,
  }
}

export function defaultPot({ id, slot, plantId, plantName, family, potStyle, today = saDateKey() }) {
  return {
    id,
    slot,
    plantId,
    plantName,
    family: family || '',
    plantedDate: today,
    wateredDays: [],
    health: 100,
    needsTrimming: false,
    lastTrimDate: null,
    lastMistDate: null,
    potStyle: potStyle || 'terracotta',
    bloomClaimed: false,
    dead: false,
  }
}

// Species not yet potted anywhere in the greenhouse (alive or dead — the
// slot's record stands until she clears it) — what the empty-slot picker
// offers to plant.
export function plantableGreenhouseSpecies(plantLibrary, greenhouse) {
  const pottedKeys = new Set((greenhouse?.pots || []).map((p) => p.plantId))
  return (plantLibrary || []).filter((p) => !pottedKeys.has(p.speciesKey))
}

// ---- watering (shared by the single-pot and Water All actions) -----------
// Pure state transforms — no React, no commit() — so both call sites can
// build one combined toast off a single call instead of duplicating the
// worth/trim/bloom bookkeeping per pot.
export function waterPots(greenhouse, potsToWater, today = saDateKey()) {
  let ownedTools = greenhouse.ownedTools || []
  let pots = greenhouse.pots || []
  let coinBonus = 0
  const notes = []
  for (const target of potsToWater) {
    const pot = pots.find((p) => p.id === target.id)
    if (!pot) continue
    const plantFoodActive = ownedToolUses({ ownedTools }, 'plant-food') > 0
    const growLightOwned = hasTool({ ownedTools }, 'grow-light')
    let worth = 1
    if (plantFoodActive) worth += 1
    if (growLightOwned && (pot.wateredDays.length + 1) % 4 === 0) worth += 1

    const nextWateredDays = [...pot.wateredDays, ...Array(worth).fill(today)]
    const crossedTrim = crossedTrimThreshold(pot.wateredDays.length, nextWateredDays.length)
    const wasBlooming = isBlooming(pot)
    let nextPot = { ...pot, wateredDays: nextWateredDays, needsTrimming: pot.needsTrimming || crossedTrim }
    nextPot.health = computeHealth(nextPot, today)
    if (isBlooming(nextPot) && !wasBlooming && !nextPot.bloomClaimed) {
      nextPot.bloomClaimed = true
      coinBonus += FIRST_BLOOM_COINS
      notes.push(`${pot.plantName} is in bloom! +${FIRST_BLOOM_COINS} coins 🌸`)
    }
    if (plantFoodActive) {
      ownedTools = ownedTools
        .map((t) => (t.id === 'plant-food' ? { ...t, uses: t.uses - 1 } : t))
        .filter((t) => t.id !== 'plant-food' || t.uses > 0)
    }
    pots = pots.map((p) => (p.id === nextPot.id ? nextPot : p))
  }
  return { pots, ownedTools, coinBonus, notes }
}

// Applies the once-a-day water-streak bump + streak/all-bloom rewards on top
// of a waterPots() result. Streak logic runs once per call regardless of how
// many pots were watered in that action (Water All still only counts as one
// day of care), matching canWish's once-per-SA-day gate in gardenData.js.
export function finalizeWatering(greenhouse, watered, today = saDateKey()) {
  let waterStreak = greenhouse.waterStreak || 0
  let lastWaterDate = greenhouse.lastWaterDate
  const notes = [...watered.notes]
  let streakBonus = 0
  if (greenhouse.lastWaterDate !== today) {
    const yesterday = saDateKeyOffset(1)
    waterStreak = greenhouse.lastWaterDate === yesterday ? waterStreak + 1 : 1
    lastWaterDate = today
    if (waterStreak % STREAK_DAYS === 0) {
      streakBonus = STREAK_COINS
      notes.push(`${STREAK_DAYS}-day water streak! +${STREAK_COINS} coins 🔥`)
    }
  }
  let nextGreenhouse = {
    ...greenhouse,
    pots: watered.pots,
    ownedTools: watered.ownedTools,
    waterStreak,
    lastWaterDate,
  }
  let allBloomBonus = 0
  if (!nextGreenhouse.allBloomClaimed && allSlotsBlooming(nextGreenhouse)) {
    nextGreenhouse = { ...nextGreenhouse, allBloomClaimed: true }
    allBloomBonus = ALL_BLOOM_COINS
    notes.push(`Your greenhouse is radiant! +${ALL_BLOOM_COINS} coins 🌸✨`)
  }
  return { greenhouse: nextGreenhouse, coinTotal: watered.coinBonus + streakBonus + allBloomBonus, notes }
}

// ---- Marnich's Fast Forward testing tool -----------------------------------
// Ages every date the greenhouse tracks back by one real day (mirroring how
// fastForwardDay ages Tweety's bornAt) so a full health-decay / streak-break
// cycle can be tested in minutes instead of days. See App.jsx's fastForwardDay.
function shiftDateKey(key, deltaDays) {
  if (!key) return key
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

export function ageGreenhouseByOneDay(greenhouse) {
  if (!greenhouse) return greenhouse
  return {
    ...greenhouse,
    lastWaterDate: shiftDateKey(greenhouse.lastWaterDate, -1),
    pots: (greenhouse.pots || []).map((p) => ({
      ...p,
      plantedDate: shiftDateKey(p.plantedDate, -1),
      wateredDays: (p.wateredDays || []).map((d) => shiftDateKey(d, -1)),
      lastTrimDate: shiftDateKey(p.lastTrimDate, -1),
      lastMistDate: shiftDateKey(p.lastMistDate, -1),
    })),
  }
}
