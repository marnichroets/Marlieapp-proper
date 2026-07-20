// Bird Garden — pure data + helpers (no components, so Fast Refresh is happy).
//
// Phase 1: a grow-from-seed care loop. She buys a seed; it sprouts in the
// garden; she waters it once per SA day; it grows through visible stages into a
// permanent garden element. It only ever reads/writes the `garden` state slice
// (plus featherCoins for purchases), so it never touches Collection.
//
// The data model is intentionally growth-ready for the agreed later phases
// (expanding shop, retired companions): `shopUnlocked` gates which catalog items
// are buyable, `elements`/`residents` are reserved for promoted features and
// graduated companions. See the marlie-bird-garden-plan memory.
import { saDateKey } from './saDate'

// Cost of a treat for a resident (pet is always free). Cheap and repeatable —
// a small daily-coin sink, not a rare purchase like the shop items above.
export const RESIDENT_TREAT_COST = 20

// Coins she must pay (on top of the 1 seed already spent) to plant a real
// identified species from the Seed Pouch — makes each planting a deliberate
// spend, not just a free sink for a seed she already earned.
export const SEED_PLANT_COST = 200

// Shop tiers, cheapest to priciest — used to group the shop UI into sections
// so the catalog reads as a deliberate progression rather than one flat list.
// Rebalanced (2026-07) so the garden takes months, not one weekend, to fill.
export const GARDEN_TIERS = [
  { id: 'starter', label: 'Starter', range: '600–1000 🪙' },
  { id: 'mid', label: 'Nature', range: '1200–2200 🪙' },
  { id: 'expensive', label: 'Feature', range: '3000–4000 🪙' },
  { id: 'premium', label: 'Premium', range: '5000–8000 🪙' },
]

// The shop catalog. Phase 1 starts with just two cheap starter plants; later
// phases append richer entries (pond, feeder, waterfall…) and gate them via
// shopUnlocked, so the shop grows over time rather than showing everything.
// Each item: cost, the daily-care count to fully grow (waterToGrow), its visible
// stages, a footprint radius `r` (for tap-to-place spacing), a care verb (plants
// are watered, structures built, the pond filled), the habitat zone it serves
// once grown (used by Sub-phase B birds), and its shop tier (see GARDEN_TIERS
// above — drives both the price band and which section it's grouped under).
// kind drives the care verb + art family.
export const GARDEN_SHOP = [
  // --- starter: 600-1000 ---------------------------------------------------
  {
    id: 'flower-patch', name: 'Flower patch', emoji: '🌼', cost: 800, tier: 'starter',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['sprout', 'budding', 'bloom'],
    blurb: 'A cheerful little patch of flowers.',
  },
  {
    id: 'stone-path', name: 'Stepping stones', emoji: '🪨', cost: 600, tier: 'starter',
    kind: 'structure', verb: 'Lay', zone: null, r: 14, waterToGrow: 1,
    stages: ['path-laying', 'path-done'],
    blurb: 'A little stone path winding through the grass.',
  },
  {
    id: 'rock-garden', name: 'Succulent patch', emoji: '🌵', cost: 850, tier: 'starter',
    kind: 'plant', verb: 'Tend', zone: null, r: 16, waterToGrow: 1,
    stages: ['rock-bare', 'rock-succulents'],
    blurb: 'Hardy little succulents among the rocks — low fuss.',
  },
  {
    id: 'veg-patch', name: 'Veggie patch', emoji: '🥕', cost: 1000, tier: 'starter',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 20, waterToGrow: 3,
    stages: ['veg-soil', 'veg-sprouts', 'veg-ripe'],
    blurb: 'Rows of veggies — practical and pretty.',
  },
  {
    id: 'flower-bed', name: 'Flower bed', emoji: '🌸', cost: 900, tier: 'starter',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['bed-soil', 'bed-shoots', 'bed-full'],
    blurb: 'A bigger bed bursting with blooms.',
  },
  // --- nature: 1200-2200 -----------------------------------------------------
  {
    id: 'pine-seed', name: 'Pine tree', emoji: '🌲', cost: 1400, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'forest', r: 24, waterToGrow: 3,
    stages: ['pine-sprout', 'pine-small', 'pine-tall'],
    blurb: 'A tall evergreen — forest birds love it.',
  },
  {
    id: 'tree-seed', name: 'Tree seed', emoji: '🌳', cost: 1500, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 26, waterToGrow: 3,
    stages: ['seedling', 'sapling', 'young', 'tree'],
    blurb: 'Grows into a leafy tree for garden birds to perch in.',
  },
  {
    id: 'shrub', name: 'Flowering shrub', emoji: '🌺', cost: 1200, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['shrub-sprout', 'shrub-bush', 'shrub-bloom'],
    blurb: 'A colourful mid-size bush.',
  },
  {
    id: 'bench', name: 'Garden bench', emoji: '🪑', cost: 2000, tier: 'mid',
    kind: 'structure', verb: 'Build', zone: null, r: 18, waterToGrow: 1,
    stages: ['bench-frame', 'bench-done'],
    blurb: 'A peaceful spot to sit a while.',
  },
  {
    id: 'fence', name: 'Fence perch', emoji: '🪧', cost: 1300, tier: 'mid',
    kind: 'structure', verb: 'Build', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['fence-post', 'fence-rail', 'fence-panel'],
    blurb: 'A rustic fence for birds to line up on.',
  },
  {
    id: 'bird-bath', name: 'Bird bath', emoji: '💦', cost: 2200, tier: 'mid',
    kind: 'water', verb: 'Fill', zone: 'water', r: 18, waterToGrow: 2,
    stages: ['bath-base', 'bath-bowl', 'bath-full'],
    blurb: 'A dainty bath that smaller birds adore.',
  },
  // --- feature: 3000-4000 ----------------------------------------------------
  {
    id: 'feeder', name: 'Bird feeder', emoji: '🪵', cost: 3000, tier: 'expensive',
    kind: 'structure', verb: 'Build', zone: 'garden', r: 18, waterToGrow: 2,
    stages: ['feeder-post', 'feeder-tray', 'feeder-stocked'],
    blurb: 'Keeps it stocked and the garden birds keep coming.',
  },
  {
    id: 'trellis', name: 'Trellis archway', emoji: '⛩️', cost: 3500, tier: 'expensive',
    kind: 'structure', verb: 'Water', zone: 'garden', r: 24, waterToGrow: 3,
    stages: ['trellis-bare', 'trellis-vines', 'trellis-bloom'],
    blurb: 'An archway that climbing flowers slowly cover.',
  },
  {
    id: 'pond', name: 'Pond', emoji: '💧', cost: 4000, tier: 'expensive',
    kind: 'water', verb: 'Fill', zone: 'water', r: 34, waterToGrow: 3,
    stages: ['pond-puddle', 'pond-small', 'pond-full'],
    blurb: 'A little pond that draws water birds.',
  },
  // --- premium: rare, expensive, meant to be saved toward for a long time ---
  {
    id: 'wishing-well', name: 'Wishing Well', emoji: '🪄', cost: 6000, tier: 'premium',
    kind: 'special', verb: 'Build', zone: null, r: 20, waterToGrow: 3,
    stages: ['well-base', 'well-built', 'well-glowing'],
    blurb: 'A rare wishing well — tap it once it’s finished and make a wish. ✨',
  },
  {
    id: 'birdhouse', name: 'Decorative Birdhouse', emoji: '🏠', cost: 5000, tier: 'premium',
    kind: 'structure', verb: 'Build', zone: 'birdhouse', r: 16, waterToGrow: 2,
    stages: ['house-frame', 'house-painted', 'house-occupied'],
    blurb: 'A charming little birdhouse that draws small nesting birds to visit.',
  },
  {
    id: 'sunset-bench', name: 'Sunset Bench', emoji: '🌅', cost: 7000, tier: 'premium',
    kind: 'structure', verb: 'Build', zone: null, r: 20, waterToGrow: 2,
    stages: ['sunset-bench-frame', 'sunset-bench-done'],
    blurb: 'A beautiful bench facing the sunset — Tweety loves to visit and sit a while.',
  },
  {
    id: 'waterfall', name: 'Waterfall', emoji: '💦', cost: 8000, tier: 'premium',
    kind: 'water', verb: 'Fill', zone: 'water', r: 32, waterToGrow: 3,
    stages: ['fall-trickle', 'fall-flowing', 'fall-full'],
    blurb: 'A cascading waterfall, alive with movement — the crown jewel of the garden.',
  },
]

export function gardenItem(type) {
  if (isSpeciesPlanting(type)) return SPECIES_ITEM_SHAPE
  return GARDEN_SHOP.find((i) => i.id === type) || null
}

// A planting from the Seed Pouch (a real identified species, not a shop item)
// carries its type as `species:<speciesKey>`. Its display info (commonName,
// family — used to tint its illustrated bloom) is denormalized directly onto
// the planting record itself at creation time (see App.jsx's
// placeGardenItem), since gardenItem() here is a pure function of `type`
// alone and has no access to the plantLibrary.
export function isSpeciesPlanting(type) {
  return typeof type === 'string' && type.startsWith('species:')
}

// Every species planting shares the same generic growth shape — three stages,
// three waterings to fully grow (matching the flower-patch pacing), habitat
// zone so fully-grown ones can host garden-bird visitors like any other plant.
const SPECIES_ITEM_SHAPE = {
  name: 'Plant', emoji: '🌿',
  kind: 'plant', verb: 'Water', zone: 'garden', r: 18, waterToGrow: 3,
  stages: ['sprout', 'budding', 'bloom'],
}

// A fresh, empty garden. plantings = in-progress care instances; elements =
// reserved for promoted permanent features (Phase 2); residents = reserved for
// graduated companions (later). shopUnlocked = which catalog ids are buyable.
//
// FUTURE STORYLINE (not built yet, not scheduled — just keeping the door
// open): residents pairing up, building a nest together, and laying eggs.
// Nothing here should block it later — residents are plain objects (already
// grew treatsGiven/lastTreatAt with zero migration), and treeHasNest's nests
// are purely derived/visual today, not persisted entities, so a real nest
// mechanic can introduce its own `garden.nests: [{ id, plantingId,
// residentIds, eggs, createdAt }]` array alongside them without needing to
// touch or migrate anything that already exists.
export function defaultGarden() {
  return {
    version: 1,
    // Everything in the shop is buyable from the start; coins alone gate her
    // pace through it.
    shopUnlocked: GARDEN_SHOP.map((i) => i.id),
    plantings: [],
    elements: [],
    residents: [],
  }
}

// Current growth-stage index (0..last), DERIVED from watered days so it can
// never drift out of sync with the care record.
export function plantStageIndex(planting) {
  const item = gardenItem(planting?.type)
  if (!item) return 0
  return Math.min(planting?.wateredDays || 0, item.stages.length - 1)
}

export function plantStageKey(planting) {
  const item = gardenItem(planting?.type)
  return item ? item.stages[plantStageIndex(planting)] : 'seedling'
}

export function isFullyGrown(planting) {
  const item = gardenItem(planting?.type)
  if (!item) return false
  return (planting?.wateredDays || 0) >= item.waterToGrow
}

// Which shop items are real trees — the only plantings that can grow a nest.
const NEST_TREE_TYPES = ['tree-seed', 'pine-seed']
// Extra real days fully grown, on top of however long it took to grow, before
// a nest quietly appears — she never watches it happen, it's just there one
// day, the way an actual garden fills in over time.
const NEST_SETTLE_DAYS = 3

// Purely visual, purely derived (no new persisted field): once a tree has
// been fully grown for a while, she's earned a nest in its branches. No
// gameplay hangs off this — see the marlie-bird-garden-plan memory for the
// later storyline (pairing, building a nest together, eggs) this leaves room
// for without committing to it yet.
export function treeHasNest(planting) {
  if (!NEST_TREE_TYPES.includes(planting?.type)) return false
  if (!isFullyGrown(planting)) return false
  const item = gardenItem(planting.type)
  const plantedAt = planting?.plantedAt ? new Date(planting.plantedAt) : null
  if (!plantedAt || Number.isNaN(plantedAt.getTime())) return false
  const daysSincePlanted = (Date.now() - plantedAt.getTime()) / 86400000
  return daysSincePlanted >= (item?.waterToGrow || 0) + NEST_SETTLE_DAYS
}

// One watering per SA day; the gate rolls over at SA midnight (and Fast Forward
// clears lastWaterDay so the sandbox can speed through days).
export function wateredToday(planting, today = saDateKey()) {
  return planting?.lastWaterDay === today
}

export function canWater(planting, today = saDateKey()) {
  return !isFullyGrown(planting) && !wateredToday(planting, today)
}

// Coins the Wishing Well pays out for a wish — once per SA day, gated the
// same way watering is (garden.lastWishDay), so it's a daily treat rather
// than an infinite coin tap.
export const WISHING_WELL_COINS = 150

export function canWish(garden, today = saDateKey()) {
  return garden?.lastWishDay !== today
}

export const STAGE_LABELS = {
  sprout: 'Sprout', budding: 'Budding', bloom: 'In bloom',
  'bed-soil': 'Tilled soil', 'bed-shoots': 'Shoots', 'bed-full': 'Full bed',
  seedling: 'Seedling', sapling: 'Sapling', young: 'Young tree', tree: 'Full tree',
  'pine-sprout': 'Sprout', 'pine-small': 'Small conifer', 'pine-tall': 'Tall pine',
  'fence-post': 'Post', 'fence-rail': 'Rail', 'fence-panel': 'Full fence',
  'feeder-post': 'Post', 'feeder-tray': 'Tray', 'feeder-stocked': 'Stocked feeder',
  'pond-puddle': 'Puddle', 'pond-small': 'Small pond', 'pond-full': 'Full pond',
  'path-laying': 'Being laid', 'path-done': 'Stone path',
  'rock-bare': 'Bare rocks', 'rock-succulents': 'Succulents',
  'veg-soil': 'Tilled rows', 'veg-sprouts': 'Sprouting', 'veg-ripe': 'Ripe veggies',
  'shrub-sprout': 'Sprout', 'shrub-bush': 'Leafy bush', 'shrub-bloom': 'In flower',
  'bench-frame': 'Frame', 'bench-done': 'Finished bench',
  'bath-base': 'Pedestal', 'bath-bowl': 'Empty bowl', 'bath-full': 'Filled bath',
  'trellis-bare': 'Bare archway', 'trellis-vines': 'Climbing vines', 'trellis-bloom': 'In bloom',
  'well-base': 'Stone base', 'well-built': 'Built', 'well-glowing': 'Glowing, ready to wish ✨',
  'fall-trickle': 'A trickle', 'fall-flowing': 'Flowing', 'fall-full': 'Full cascade',
  'house-frame': 'Frame', 'house-painted': 'Painted', 'house-occupied': 'A family has moved in',
  'sunset-bench-frame': 'Frame', 'sunset-bench-done': 'Finished bench',
}

// Placeable lawn region (in the 0 0 400 260 scene) + snap grid. Shared by the
// page (placement) so plantings can sit anywhere she taps, not fixed slots.
export const GARDEN_REGION = { x0: 26, x1: 374, y0: 152, y1: 238 }
export const GARDEN_GRID = { stepX: 28, stepY: 20 }

// ---- Garden expansion zones -------------------------------------------------
// Permanent, one-time unlocks (never placed/grown like GARDEN_SHOP items) that
// widen the world itself. Fixed absolute world-space slots so an existing
// planting's x/y never has to shift/relocate when a later zone is purchased:
// Expand Left always lives at x [-200,0), Expand Right always at [400,600),
// Back Garden always at [600,800) — regardless of purchase order. If Back
// Garden is bought before Expand Right, the still-locked Expand Right slot
// simply renders as a fenced-off placeholder in between (see Garden.jsx).
export const EXPANSION_WIDTH = 200
export const GARDEN_EXPANSIONS = [
  { id: 'expand-left', name: 'Expand Left', emoji: '🌿', cost: 3000, side: 'left' },
  { id: 'expand-right', name: 'Expand Right', emoji: '🌿', cost: 3000, side: 'right' },
  { id: 'back-garden', name: 'Back Garden', emoji: '🌳', cost: 5000, side: 'back' },
]

export function expansionItem(id) {
  return GARDEN_EXPANSIONS.find((e) => e.id === id) || null
}

const hasExp = (expansions, id) => Array.isArray(expansions) && expansions.includes(id)

// The scene's current world bounds, in scene units — grows as she unlocks
// zones. Any locked zone between two owned ones (e.g. Back Garden owned
// without Expand Right) still falls within these bounds so it can render as
// a locked placeholder rather than leaving a gap.
export function gardenViewBox(expansions = []) {
  const minX = hasExp(expansions, 'expand-left') ? -EXPANSION_WIDTH : 0
  const maxX = hasExp(expansions, 'back-garden')
    ? 400 + EXPANSION_WIDTH * 2
    : hasExp(expansions, 'expand-right')
      ? 400 + EXPANSION_WIDTH
      : 400
  return { minX, minY: 0, width: maxX - minX, height: 260 }
}

// Fixed world-space rect for a given zone slot, regardless of ownership —
// used both for the placeable region (when owned) and the locked-placeholder
// art (when not).
const ZONE_RECT = {
  'expand-left': { x0: -EXPANSION_WIDTH, x1: 0 },
  'expand-right': { x0: 400, x1: 400 + EXPANSION_WIDTH },
  'back-garden': { x0: 400 + EXPANSION_WIDTH, x1: 400 + EXPANSION_WIDTH * 2 },
}
export function gardenZoneRect(id) {
  const r = ZONE_RECT[id]
  return r ? { ...r, y0: GARDEN_REGION.y0, y1: GARDEN_REGION.y1 } : null
}

// Every placeable region currently unlocked (base lawn + any owned expansion
// zones), each padded in from its zone edge the same way the base region is.
export function gardenRegions(expansions = []) {
  const regions = [GARDEN_REGION]
  if (hasExp(expansions, 'expand-left')) {
    regions.push({ x0: -EXPANSION_WIDTH + 26, x1: -26, y0: GARDEN_REGION.y0, y1: GARDEN_REGION.y1 })
  }
  if (hasExp(expansions, 'expand-right')) {
    regions.push({ x0: 426, x1: 400 + EXPANSION_WIDTH - 26, y0: GARDEN_REGION.y0, y1: GARDEN_REGION.y1 })
  }
  if (hasExp(expansions, 'back-garden')) {
    regions.push({
      x0: 400 + EXPANSION_WIDTH + 26, x1: 400 + EXPANSION_WIDTH * 2 - 26,
      y0: GARDEN_REGION.y0, y1: GARDEN_REGION.y1,
    })
  }
  return regions
}

// Snap a scene point to the grid, clamped to whichever unlocked region is
// closest to the tapped point (so panning to an expansion and tapping there
// snaps within that zone, not back to the base lawn).
export function snapToGarden(x, y, expansions = []) {
  const regions = gardenRegions(expansions)
  let region = regions[0]
  let bestDist = Infinity
  for (const r of regions) {
    const cx = Math.max(r.x0, Math.min(r.x1, x))
    const cy = Math.max(r.y0, Math.min(r.y1, y))
    const d = Math.hypot(cx - x, cy - y)
    if (d < bestDist) { bestDist = d; region = r }
  }
  const sx = Math.max(region.x0, Math.min(region.x1,
    Math.round((x - region.x0) / GARDEN_GRID.stepX) * GARDEN_GRID.stepX + region.x0))
  const sy = Math.max(region.y0, Math.min(region.y1,
    Math.round((y - region.y0) / GARDEN_GRID.stepY) * GARDEN_GRID.stepY + region.y0))
  return { x: sx, y: sy }
}

// Can `type` be placed at (x,y) given existing plantings? In one of the
// currently-unlocked regions + not closer than ~0.7×(rA+rB) to any other item
// (prevents total overlap, keeps spacing).
export function canPlaceAt(type, x, y, plantings = [], expansions = []) {
  const item = gardenItem(type)
  if (!item) return false
  const regions = gardenRegions(expansions)
  const inRegion = regions.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
  if (!inRegion) return false
  return plantings.every((p) => {
    const other = gardenItem(p.type)
    const minD = ((item.r || 18) + (other?.r || 18)) * 0.7
    return Math.hypot((p.x ?? -999) - x, (p.y ?? -999) - y) >= minD
  })
}

// Can a graduating companion be placed at (x,y)? Same in-region check as
// canPlaceAt (across every unlocked zone, so residents can roam the full
// expanded garden), plus a ~36px resident spacing, so a tap-placed resident
// can never land on top of an existing one.
export function canPlaceResidentAt(x, y, residents = [], expansions = []) {
  const regions = gardenRegions(expansions)
  const inRegion = regions.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
  if (!inRegion) return false
  return residents.every((r) => Math.hypot((r.x ?? -999) - x, (r.y ?? -999) - y) >= 36)
}
