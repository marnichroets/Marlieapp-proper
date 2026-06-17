// Bird Garden — pure data + helpers (no components, so Fast Refresh is happy).
//
// Phase 1: a grow-from-seed care loop. She buys a seed; it sprouts in the
// garden; she waters it once per SA day; it grows through visible stages into a
// permanent garden element. Sandbox-only for now (gating lives in App.jsx) and
// it only ever reads/writes the `garden` state slice, so it can never affect
// Pooks' account, coins or Collection.
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
    id: 'flower-patch', name: 'Flower patch', emoji: '🌼', cost: 20,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['sprout', 'budding', 'bloom'],
    blurb: 'A cheerful little patch of flowers.',
  },
  {
    id: 'flower-bed', name: 'Flower bed', emoji: '🌸', cost: 40,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 22, waterToGrow: 3,
    stages: ['bed-soil', 'bed-shoots', 'bed-full'],
    blurb: 'A bigger bed bursting with blooms.',
  },
  {
    id: 'tree-seed', name: 'Tree seed', emoji: '🌳', cost: 50,
    kind: 'plant', verb: 'Water', zone: 'garden', r: 26, waterToGrow: 3,
    stages: ['seedling', 'sapling', 'young', 'tree'],
    blurb: 'Grows into a leafy tree for garden birds to perch in.',
  },
  {
    id: 'pine-seed', name: 'Pine tree', emoji: '🌲', cost: 60,
    kind: 'plant', verb: 'Water', zone: 'forest', r: 24, waterToGrow: 3,
    stages: ['pine-sprout', 'pine-small', 'pine-tall'],
    blurb: 'A tall evergreen — forest birds love it.',
  },
  {
    id: 'fence', name: 'Fence perch', emoji: '🪧', cost: 80,
    kind: 'structure', verb: 'Build', zone: 'garden', r: 16, waterToGrow: 2,
    stages: ['fence-post', 'fence-rail', 'fence-panel'],
    blurb: 'A rustic fence for birds to line up on.',
  },
  {
    id: 'feeder', name: 'Bird feeder', emoji: '🪵', cost: 100,
    kind: 'structure', verb: 'Build', zone: 'garden', r: 18, waterToGrow: 2,
    stages: ['feeder-post', 'feeder-tray', 'feeder-stocked'],
    blurb: 'Keeps it stocked and the garden birds keep coming.',
  },
  {
    id: 'pond', name: 'Pond', emoji: '💧', cost: 150,
    kind: 'water', verb: 'Fill', zone: 'water', r: 34, waterToGrow: 3,
    stages: ['pond-puddle', 'pond-small', 'pond-full'],
    blurb: 'A little pond that draws water birds.',
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
    // Sub-phase A: all items unlocked for sandbox testing (the progressive
    // unlock gating comes with the zones work in Sub-phase C).
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
