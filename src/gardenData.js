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
export const GARDEN_SHOP = [
  {
    id: 'flower-patch',
    name: 'Flower patch',
    emoji: '🌼',
    cost: 20,
    kind: 'plant',
    waterToGrow: 2, // waterings (distinct days) needed to reach the final stage
    stages: ['sprout', 'budding', 'bloom'],
    blurb: 'A cheerful little patch of flowers.',
  },
  {
    id: 'tree-seed',
    name: 'Tree seed',
    emoji: '🌳',
    cost: 50,
    kind: 'plant',
    waterToGrow: 3,
    stages: ['seedling', 'sapling', 'young', 'tree'],
    blurb: 'Grows into a leafy tree for birds to perch in.',
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
    shopUnlocked: ['flower-patch', 'tree-seed'],
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
  sprout: 'Sprout',
  budding: 'Budding',
  bloom: 'In bloom',
  seedling: 'Seedling',
  sapling: 'Sapling',
  young: 'Young tree',
  tree: 'Full tree',
}
