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

// The shop catalog. Phase 1 starts with just two cheap starter plants; later
// phases append richer entries (pond, feeder, waterfall…) and gate them via
// shopUnlocked, so the shop grows over time rather than showing everything.
// Each item: cost, the daily-care count to fully grow (waterToGrow), its visible
// stages, a footprint radius `r` (for tap-to-place spacing), a care verb (plants
// are watered, structures built, the pond filled) and the habitat zone it serves
// once grown (used by Sub-phase B birds). kind drives the care verb + art family.
export const GARDEN_SHOP = [
  {
    id: 'flower-patch', name: 'Flower patch', emoji: '🌼', cost: 40,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['sprout', 'budding', 'bloom'],
    blurb: 'A cheerful little patch of flowers.',
  },
  {
    id: 'flower-bed', name: 'Flower bed', emoji: '🌸', cost: 80,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['bed-soil', 'bed-shoots', 'bed-full'],
    blurb: 'A bigger bed bursting with blooms.',
  },
  {
    id: 'tree-seed', name: 'Tree seed', emoji: '🌳', cost: 100,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 26, waterToGrow: 3,
    stages: ['seedling', 'sapling', 'young', 'tree'],
    blurb: 'Grows into a leafy tree for garden birds to perch in.',
  },
  {
    id: 'pine-seed', name: 'Pine tree', emoji: '🌲', cost: 120,
    kind: 'plant', verb: 'Water', zone: 'forest', r: 24, waterToGrow: 3,
    stages: ['pine-sprout', 'pine-small', 'pine-tall'],
    blurb: 'A tall evergreen — forest birds love it.',
  },
  {
    id: 'fence', name: 'Fence perch', emoji: '🪧', cost: 160,
    kind: 'structure', verb: 'Build', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['fence-post', 'fence-rail', 'fence-panel'],
    blurb: 'A rustic fence for birds to line up on.',
  },
  {
    id: 'feeder', name: 'Bird feeder', emoji: '🪵', cost: 200,
    kind: 'structure', verb: 'Build', zone: 'garden', r: 18, waterToGrow: 2,
    stages: ['feeder-post', 'feeder-tray', 'feeder-stocked'],
    blurb: 'Keeps it stocked and the garden birds keep coming.',
  },
  {
    id: 'pond', name: 'Pond', emoji: '💧', cost: 300,
    kind: 'water', verb: 'Fill', zone: 'water', r: 34, waterToGrow: 3,
    stages: ['pond-puddle', 'pond-small', 'pond-full'],
    blurb: 'A little pond that draws water birds.',
  },
  // --- decorative + extra-variety items -------------------------------------
  {
    id: 'stone-path', name: 'Stepping stones', emoji: '🪨', cost: 60,
    kind: 'structure', verb: 'Lay', zone: null, r: 14, waterToGrow: 1,
    stages: ['path-laying', 'path-done'],
    blurb: 'A little stone path winding through the grass.',
  },
  {
    id: 'rock-garden', name: 'Succulent patch', emoji: '🌵', cost: 90,
    kind: 'plant', verb: 'Tend', zone: null, r: 16, waterToGrow: 1,
    stages: ['rock-bare', 'rock-succulents'],
    blurb: 'Hardy little succulents among the rocks — low fuss.',
  },
  {
    id: 'veg-patch', name: 'Veggie patch', emoji: '🥕', cost: 70,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 20, waterToGrow: 3,
    stages: ['veg-soil', 'veg-sprouts', 'veg-ripe'],
    blurb: 'Rows of veggies — practical and pretty.',
  },
  {
    id: 'shrub', name: 'Flowering shrub', emoji: '🌺', cost: 110,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['shrub-sprout', 'shrub-bush', 'shrub-bloom'],
    blurb: 'A colourful mid-size bush.',
  },
  {
    id: 'bench', name: 'Garden bench', emoji: '🪑', cost: 140,
    kind: 'structure', verb: 'Build', zone: null, r: 18, waterToGrow: 1,
    stages: ['bench-frame', 'bench-done'],
    blurb: 'A peaceful spot to sit a while.',
  },
  {
    id: 'bird-bath', name: 'Bird bath', emoji: '💦', cost: 180,
    kind: 'water', verb: 'Fill', zone: 'water', r: 18, waterToGrow: 2,
    stages: ['bath-base', 'bath-bowl', 'bath-full'],
    blurb: 'A dainty bath that smaller birds adore.',
  },
  {
    id: 'trellis', name: 'Trellis archway', emoji: '⛩️', cost: 240,
    kind: 'structure', verb: 'Water', zone: 'garden', r: 24, waterToGrow: 3,
    stages: ['trellis-bare', 'trellis-vines', 'trellis-bloom'],
    blurb: 'An archway that climbing flowers slowly cover.',
  },
  // --- enclosure: a one-off purchase that frames the whole scene -------------
  // Not tap-placed and never grows; buying it flips garden.sanctuary, which the
  // scene reads to draw a wooden boundary around the lawn. kind 'enclosure' is
  // what the shop + handlers special-case (no placement, no watering).
  {
    id: 'sanctuary-fence', name: 'Sanctuary Fence', emoji: '🛡️', cost: 250,
    kind: 'enclosure', verb: 'Build', zone: null, r: 0, waterToGrow: 0,
    stages: [],
    blurb: 'A wooden boundary around the whole garden — makes it a protected little sanctuary.',
  },
]

export function gardenItem(type) {
  return GARDEN_SHOP.find((i) => i.id === type) || null
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
    // One-off enclosure (Sanctuary Fence): false until she buys it.
    sanctuary: false,
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

// Pick a free spot in the lawn for a graduated companion (P3 garden residents),
// kept clear of other residents so crowned birds don't stack on each other.
export function freeResidentSpot(residents = []) {
  for (let tries = 0; tries < 40; tries += 1) {
    const x = Math.round(GARDEN_REGION.x0 + Math.random() * (GARDEN_REGION.x1 - GARDEN_REGION.x0))
    const y = Math.round(GARDEN_REGION.y0 + Math.random() * (GARDEN_REGION.y1 - GARDEN_REGION.y0))
    if (residents.every((r) => Math.hypot((r.x ?? -999) - x, (r.y ?? -999) - y) >= 36)) {
      return { x, y }
    }
  }
  return {
    x: Math.round(GARDEN_REGION.x0 + Math.random() * (GARDEN_REGION.x1 - GARDEN_REGION.x0)),
    y: GARDEN_REGION.y0 + 18,
  }
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
// canPlaceAt, plus the ~36px resident spacing already used by freeResidentSpot,
// so a tap-placed resident can never land on top of an existing one.
export function canPlaceResidentAt(x, y, residents = []) {
  if (x < GARDEN_REGION.x0 || x > GARDEN_REGION.x1 || y < GARDEN_REGION.y0 || y > GARDEN_REGION.y1) return false
  return residents.every((r) => Math.hypot((r.x ?? -999) - x, (r.y ?? -999) - y) >= 36)
}
