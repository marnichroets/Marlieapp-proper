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

// Shop tiers, cheapest to priciest — used to group the shop UI into sections
// so the catalog reads as a deliberate progression rather than one flat list.
export const GARDEN_TIERS = [
  { id: 'starter', label: 'Starter', range: '200–400 🪙' },
  { id: 'mid', label: 'Mid-tier', range: '500–800 🪙' },
  { id: 'expensive', label: 'Expensive', range: '1000–2000 🪙' },
  { id: 'premium', label: 'Premium', range: '2500+ 🪙' },
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
  // --- starter: 200-400 --------------------------------------------------
  {
    id: 'flower-patch', name: 'Flower patch', emoji: '🌼', cost: 220, tier: 'starter',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['sprout', 'budding', 'bloom'],
    blurb: 'A cheerful little patch of flowers.',
  },
  {
    id: 'stone-path', name: 'Stepping stones', emoji: '🪨', cost: 200, tier: 'starter',
    kind: 'structure', verb: 'Lay', zone: null, r: 14, waterToGrow: 1,
    stages: ['path-laying', 'path-done'],
    blurb: 'A little stone path winding through the grass.',
  },
  {
    id: 'rock-garden', name: 'Succulent patch', emoji: '🌵', cost: 260, tier: 'starter',
    kind: 'plant', verb: 'Tend', zone: null, r: 16, waterToGrow: 1,
    stages: ['rock-bare', 'rock-succulents'],
    blurb: 'Hardy little succulents among the rocks — low fuss.',
  },
  {
    id: 'veg-patch', name: 'Veggie patch', emoji: '🥕', cost: 280, tier: 'starter',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 20, waterToGrow: 3,
    stages: ['veg-soil', 'veg-sprouts', 'veg-ripe'],
    blurb: 'Rows of veggies — practical and pretty.',
  },
  // --- mid-tier: 500-800 ---------------------------------------------------
  {
    id: 'flower-bed', name: 'Flower bed', emoji: '🌸', cost: 520, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['bed-soil', 'bed-shoots', 'bed-full'],
    blurb: 'A bigger bed bursting with blooms.',
  },
  {
    id: 'pine-seed', name: 'Pine tree', emoji: '🌲', cost: 600, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'forest', r: 24, waterToGrow: 3,
    stages: ['pine-sprout', 'pine-small', 'pine-tall'],
    blurb: 'A tall evergreen — forest birds love it.',
  },
  {
    id: 'tree-seed', name: 'Tree seed', emoji: '🌳', cost: 620, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 26, waterToGrow: 3,
    stages: ['seedling', 'sapling', 'young', 'tree'],
    blurb: 'Grows into a leafy tree for garden birds to perch in.',
  },
  {
    id: 'shrub', name: 'Flowering shrub', emoji: '🌺', cost: 560, tier: 'mid',
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['shrub-sprout', 'shrub-bush', 'shrub-bloom'],
    blurb: 'A colourful mid-size bush.',
  },
  {
    id: 'bench', name: 'Garden bench', emoji: '🪑', cost: 650, tier: 'mid',
    kind: 'structure', verb: 'Build', zone: null, r: 18, waterToGrow: 1,
    stages: ['bench-frame', 'bench-done'],
    blurb: 'A peaceful spot to sit a while.',
  },
  {
    id: 'fence', name: 'Fence perch', emoji: '🪧', cost: 700, tier: 'mid',
    kind: 'structure', verb: 'Build', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['fence-post', 'fence-rail', 'fence-panel'],
    blurb: 'A rustic fence for birds to line up on.',
  },
  {
    id: 'bird-bath', name: 'Bird bath', emoji: '💦', cost: 750, tier: 'mid',
    kind: 'water', verb: 'Fill', zone: 'water', r: 18, waterToGrow: 2,
    stages: ['bath-base', 'bath-bowl', 'bath-full'],
    blurb: 'A dainty bath that smaller birds adore.',
  },
  // --- expensive: 1000-2000 -------------------------------------------------
  {
    id: 'sunset-bench', name: 'Sunset Bench', emoji: '🌅', cost: 1000, tier: 'expensive',
    kind: 'structure', verb: 'Build', zone: null, r: 20, waterToGrow: 2,
    stages: ['sunset-bench-frame', 'sunset-bench-done'],
    blurb: 'A beautiful bench facing the sunset — Tweety loves to visit and sit a while.',
  },
  {
    id: 'trellis', name: 'Trellis archway', emoji: '⛩️', cost: 1200, tier: 'expensive',
    kind: 'structure', verb: 'Water', zone: 'garden', r: 24, waterToGrow: 3,
    stages: ['trellis-bare', 'trellis-vines', 'trellis-bloom'],
    blurb: 'An archway that climbing flowers slowly cover.',
  },
  {
    id: 'feeder', name: 'Bird feeder', emoji: '🪵', cost: 1400, tier: 'expensive',
    kind: 'structure', verb: 'Build', zone: 'garden', r: 18, waterToGrow: 2,
    stages: ['feeder-post', 'feeder-tray', 'feeder-stocked'],
    blurb: 'Keeps it stocked and the garden birds keep coming.',
  },
  {
    id: 'birdhouse', name: 'Decorative Birdhouse', emoji: '🏠', cost: 1600, tier: 'expensive',
    kind: 'structure', verb: 'Build', zone: 'birdhouse', r: 16, waterToGrow: 2,
    stages: ['house-frame', 'house-painted', 'house-occupied'],
    blurb: 'A charming little birdhouse that draws small nesting birds to visit.',
  },
  {
    id: 'pond', name: 'Pond', emoji: '💧', cost: 1800, tier: 'expensive',
    kind: 'water', verb: 'Fill', zone: 'water', r: 34, waterToGrow: 3,
    stages: ['pond-puddle', 'pond-small', 'pond-full'],
    blurb: 'A little pond that draws water birds.',
  },
  // --- premium: rare, expensive, meant to be saved toward for a long time ---
  {
    id: 'wishing-well', name: 'Wishing Well', emoji: '🪄', cost: 2500, tier: 'premium',
    kind: 'special', verb: 'Build', zone: null, r: 20, waterToGrow: 3,
    stages: ['well-base', 'well-built', 'well-glowing'],
    blurb: 'A rare wishing well — tap it once it’s finished and make a wish. ✨',
  },
  {
    id: 'waterfall', name: 'Waterfall', emoji: '💦', cost: 3500, tier: 'premium',
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
// referenceImageUrl) is denormalized directly onto the planting record itself
// at creation time (see App.jsx's placeGardenItem), since gardenItem() here is
// a pure function of `type` alone and has no access to the plantLibrary.
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

// One watering per SA day; the gate rolls over at SA midnight (and Fast Forward
// clears lastWaterDay so the sandbox can speed through days).
export function wateredToday(planting, today = saDateKey()) {
  return planting?.lastWaterDay === today
}

export function canWater(planting, today = saDateKey()) {
  return !isFullyGrown(planting) && !wateredToday(planting, today)
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

// Snap a scene point to the grid, clamped to the placeable region.
export function snapToGarden(x, y) {
  const sx = Math.max(GARDEN_REGION.x0, Math.min(GARDEN_REGION.x1,
    Math.round((x - GARDEN_REGION.x0) / GARDEN_GRID.stepX) * GARDEN_GRID.stepX + GARDEN_REGION.x0))
  const sy = Math.max(GARDEN_REGION.y0, Math.min(GARDEN_REGION.y1,
    Math.round((y - GARDEN_REGION.y0) / GARDEN_GRID.stepY) * GARDEN_GRID.stepY + GARDEN_REGION.y0))
  return { x: sx, y: sy }
}

// Can `type` be placed at (x,y) given existing plantings? In-region + not closer
// than ~0.7×(rA+rB) to any other item (prevents total overlap, keeps spacing).
export function canPlaceAt(type, x, y, plantings = []) {
  const item = gardenItem(type)
  if (!item) return false
  if (x < GARDEN_REGION.x0 || x > GARDEN_REGION.x1 || y < GARDEN_REGION.y0 || y > GARDEN_REGION.y1) return false
  return plantings.every((p) => {
    const other = gardenItem(p.type)
    const minD = ((item.r || 18) + (other?.r || 18)) * 0.7
    return Math.hypot((p.x ?? -999) - x, (p.y ?? -999) - y) >= minD
  })
}

// Can a graduating companion be placed at (x,y)? Same in-region check as
// canPlaceAt, plus a ~36px resident spacing, so a tap-placed resident can
// never land on top of an existing one.
export function canPlaceResidentAt(x, y, residents = []) {
  if (x < GARDEN_REGION.x0 || x > GARDEN_REGION.x1 || y < GARDEN_REGION.y0 || y > GARDEN_REGION.y1) return false
  return residents.every((r) => Math.hypot((r.x ?? -999) - x, (r.y ?? -999) - y) >= 36)
}
