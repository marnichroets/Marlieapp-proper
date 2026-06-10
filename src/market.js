// Marnich's Secret Market — pure data + helpers for the rotating wearable shop.
// Stock rotates every 48 hours: 6 deterministic items per rotation, seeded by
// the rotation index so everyone (and every reload) sees the same window.
// No components here, so Fast Refresh stays happy.

export const ROTATION_MS = 48 * 60 * 60 * 1000
export const LAST_CHANCE_MS = 6 * 60 * 60 * 1000
export const ROTATION_SIZE = 6
// A fixed anchor so rotation boundaries are stable across devices.
export const MARKET_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0)

// ---- the wearable catalogue ------------------------------------------------
// slot: 'hat' | 'accessory' | 'outfit'. Tweety can wear one of each at once.
// market: appears in the rotating market. marketOnly: ONLY ever via the market
// (extra special). monthOnly: integer month (0=Jan). monthly: shows once a
// month (first rotation of the month). adminOnly: only Marnich can gift it.
export const WEARABLES = [
  // HATS
  { id: 'flower-crown', name: 'Flower Crown', slot: 'hat', cost: 80, emoji: '🌸' },
  { id: 'winter-beanie', name: 'Winter Beanie', slot: 'hat', cost: 90, emoji: '🧶' },
  { id: 'party-hat', name: 'Party Hat', slot: 'hat', cost: 100, emoji: '🎉' },
  { id: 'graduation-cap', name: 'Graduation Cap', slot: 'hat', cost: 150, emoji: '🎓' },
  { id: 'cowboy-hat', name: 'Cowboy Hat', slot: 'hat', cost: 120, emoji: '🤠' },
  { id: 'crown', name: 'Royal Crown', slot: 'hat', cost: 300, emoji: '👑' },
  { id: 'santa-hat', name: 'Santa Hat', slot: 'hat', cost: 80, emoji: '🎅', monthOnly: 11 },
  { id: 'detective-hat', name: 'Detective Hat', slot: 'hat', cost: 130, emoji: '🕵️' },
  { id: 'witch-hat', name: 'Witch Hat', slot: 'hat', cost: 100, emoji: '🧙' },
  { id: 'sunhat', name: 'Sun Hat', slot: 'hat', cost: 80, emoji: '👒' },
  { id: 'pirate-hat', name: 'Pirate Hat', slot: 'hat', cost: 110, emoji: '🏴‍☠️' },
  { id: 'chef-hat', name: 'Chef Hat', slot: 'hat', cost: 90, emoji: '👨‍🍳' },
  // ACCESSORIES
  { id: 'scarf', name: 'Cosy Scarf', slot: 'accessory', cost: 70, emoji: '🧣' },
  { id: 'bow-tie', name: 'Bow Tie', slot: 'accessory', cost: 60, emoji: '🎀' },
  { id: 'heart-necklace', name: 'Heart Necklace', slot: 'accessory', cost: 80, emoji: '💝' },
  { id: 'sunglasses', name: 'Sunglasses', slot: 'accessory', cost: 90, emoji: '🕶️' },
  { id: 'cape', name: 'Flowing Cape', slot: 'accessory', cost: 150, emoji: '🦸' },
  { id: 'backpack', name: 'Tiny Backpack', slot: 'accessory', cost: 100, emoji: '🎒' },
  { id: 'fairy-wings', name: 'Fairy Wings', slot: 'accessory', cost: 200, emoji: '🧚' },
  { id: 'bandana', name: 'Bandana', slot: 'accessory', cost: 70, emoji: '🔴' },
  { id: 'pearl-necklace', name: 'Pearl Necklace', slot: 'accessory', cost: 120, emoji: '📿' },
  { id: 'rainbow-bow', name: 'Rainbow Bow', slot: 'accessory', cost: 100, emoji: '🌈' },
  { id: 'monocle', name: 'Fancy Monocle', slot: 'accessory', cost: 70, emoji: '🧐' },
  { id: 'angel-halo', name: 'Angel Halo', slot: 'accessory', cost: 130, emoji: '😇' },
  // OUTFITS
  { id: 'tuxedo', name: 'Tuxedo', slot: 'outfit', cost: 200, emoji: '🤵' },
  { id: 'princess-dress', name: 'Princess Dress', slot: 'outfit', cost: 250, emoji: '👗' },
  { id: 'explorer-vest', name: 'Explorer Vest', slot: 'outfit', cost: 180, emoji: '🦺' },
  { id: 'pyjamas', name: 'Cosy Pyjamas', slot: 'outfit', cost: 100, emoji: '🛌' },
  { id: 'rain-jacket', name: 'Rain Jacket', slot: 'outfit', cost: 120, emoji: '🧥' },
  { id: 'winter-coat', name: 'Winter Coat', slot: 'outfit', cost: 150, emoji: '🧥' },
  { id: 'superhero-suit', name: 'Superhero Suit', slot: 'outfit', cost: 220, emoji: '🦸‍♀️' },
  { id: 'ballerina-tutu', name: 'Ballerina Tutu', slot: 'outfit', cost: 180, emoji: '🩰' },
  { id: 'dino-costume', name: 'Dino Costume', slot: 'outfit', cost: 200, emoji: '🦖' },
  // SPECIAL — market-only treasures
  { id: 'golden-feather', name: 'Golden Feather', slot: 'accessory', cost: 500, emoji: '🪶', marketOnly: true, special: true },
  { id: 'love-letter-outfit', name: 'Love Letter Outfit', slot: 'outfit', cost: 400, emoji: '💌', marketOnly: true, special: true },
  { id: 'magic-wand', name: 'Magic Wand', slot: 'accessory', cost: 350, emoji: '🪄', marketOnly: true, special: true },
  { id: 'tiny-guitar', name: 'Tiny Guitar', slot: 'accessory', cost: 300, emoji: '🎸', marketOnly: true, special: true },
  { id: 'diamond-crown', name: 'Diamond Crown', slot: 'hat', cost: 800, emoji: '💎', marketOnly: true, special: true, monthly: true },
  // Admin-only gift — never purchasable, Marnich sets the value
  { id: 'marnich-gift-box', name: "Marnich's Gift Box", slot: 'accessory', cost: 0, emoji: '🎁', adminOnly: true, special: true },
]

export const SLOTS = [
  { id: 'hat', name: 'Hat', emoji: '🎩' },
  { id: 'accessory', name: 'Accessory', emoji: '🎀' },
  { id: 'outfit', name: 'Outfit', emoji: '👕' },
]

export function wearableById(id) {
  return WEARABLES.find((w) => w.id === id) || null
}

// ---- rotation maths --------------------------------------------------------
export function rotationIndex(now) {
  return Math.floor((now - MARKET_EPOCH) / ROTATION_MS)
}

export function rotationRefreshAt(now) {
  return MARKET_EPOCH + (rotationIndex(now) + 1) * ROTATION_MS
}

export function rotationStartAt(now) {
  return MARKET_EPOCH + rotationIndex(now) * ROTATION_MS
}

export function msUntilRefresh(now) {
  return Math.max(0, rotationRefreshAt(now) - now)
}

export function isLastChance(now) {
  return msUntilRefresh(now) <= LAST_CHANCE_MS
}

// "1d 14h 32m" style countdown.
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

// ---- deterministic seeded shuffle ------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(list, seed) {
  const arr = [...list]
  const rand = mulberry32(seed)
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Items eligible to appear during the rotation that contains `now`.
function eligiblePool(idx) {
  const start = MARKET_EPOCH + idx * ROTATION_MS
  const date = new Date(start)
  const month = date.getMonth()
  // First rotation of the calendar month? (for "monthly" treasures)
  const prevDate = new Date(start - ROTATION_MS)
  const isFirstOfMonth = prevDate.getMonth() !== month
  return WEARABLES.filter((w) => {
    if (w.adminOnly) return false
    if (typeof w.monthOnly === 'number' && w.monthOnly !== month) return false
    if (w.monthly && !isFirstOfMonth) return false
    return true
  })
}

// The 6 item ids on sale for a given rotation index.
export function rotationItemIds(idx) {
  const pool = eligiblePool(idx)
  // Seed offset keeps consecutive rotations feeling different.
  return seededShuffle(pool, (idx + 1) * 2654435761).slice(0, ROTATION_SIZE).map((w) => w.id)
}

// Full item objects for the current rotation.
export function currentMarketItems(now) {
  return rotationItemIds(rotationIndex(now)).map(wearableById).filter(Boolean)
}

export function isInMarket(id, now) {
  return rotationItemIds(rotationIndex(now)).includes(id)
}

// New this rotation = on sale now, but not in the previous rotation.
export function isNewInMarket(id, now) {
  const idx = rotationIndex(now)
  return rotationItemIds(idx).includes(id) && !rotationItemIds(idx - 1).includes(id)
}

// Marnich's pick: admin override (if still valid this rotation) else a stable
// deterministic default chosen from the current six.
export function marnichPickId(now, override) {
  const idx = rotationIndex(now)
  const ids = rotationItemIds(idx)
  if (override && override.rotation === idx && ids.includes(override.itemId)) {
    return override.itemId
  }
  const rand = mulberry32((idx + 7) * 40503)
  return ids[Math.floor(rand() * ids.length)] || ids[0]
}

// ---- wardrobe helpers ------------------------------------------------------
export function defaultWardrobe() {
  return { owned: [], worn: { hat: null, accessory: null, outfit: null }, wishlist: [] }
}

export function ownsWearable(wardrobe, id) {
  return Boolean(wardrobe?.owned?.includes(id))
}

export function isWishlisted(wardrobe, id) {
  return Boolean(wardrobe?.wishlist?.includes(id))
}

export function wornSummary(wardrobe) {
  const worn = wardrobe?.worn || {}
  return SLOTS.map((s) => wearableById(worn[s.id]))
    .filter(Boolean)
    .map((w) => w.name)
}
