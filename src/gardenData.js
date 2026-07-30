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
import { SA_PLANT_LIBRARY, plantBloomKind, plantBloomColor, plantFoliageColor } from './plantData'
import { PLANT_COLOUR_MAP } from './plantColourMap'

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

// ---- species-accurate plant visuals ----------------------------------------
// Resolves a real identified species (by commonName/family) to an illustrated
// GardenPlant template + colour zones + shape variation (see
// plantTemplates.jsx). Lives here rather than in Garden.jsx so it stays pure
// data/logic (no components — Fast Refresh friendly) and so both the outdoor
// Garden's species plantings AND the Greenhouse's potted plants (see
// Greenhouse.jsx) can share one resolver instead of two copies drifting
// apart. Three tiers, most-accurate first:
//  1. A curated SA_PLANT_LIBRARY species (matched by commonName) with a
//     hand-researched real-colour entry in PLANT_COLOUR_MAP — exact template
//     + exact colours.
//  2. Anything else (most real plantings: she identifies whatever she
//     actually photographs, not just the 207 SA species catalogued for the
//     Explore/Magazine tab) — reuse plantBloomKind's keyword/family
//     classifier to still pick the closest-shaped template (a Monstera still
//     reads as a big-leaved climber, a Moth Orchid still reads as a showy
//     single bloom), tinted with plantBloomColor/plantFoliageColor.
//  3. Truly unclassifiable — flowering-shrub in plain generic green.
// No photos, ever — every rendering stays one consistent hand-drawn
// illustrated world.
const GENERIC_PLANT_ZONES = {
  stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
  petal: '#f5f0e0', center: '#f2c230', soil: '#7a5a3a',
}

// plantBloomKind's shape vocabulary doesn't map 1:1 onto plantTemplates.jsx's
// 12 illustrated templates (there's no dedicated orchid/houseplant/fynbos
// template shape) — this picks the closest visual match for each, mirroring
// how those same species read in the hand-curated PLANT_COLOUR_MAP entries
// (e.g. Red Disa, an orchid, is templated as 'bulb-flower'; Bird of Paradise,
// a strelitzia, is also 'bulb-flower').
const BLOOM_KIND_TEMPLATE = {
  aloe: 'aloe',
  protea: 'protea',
  agapanthus: 'bulb-flower',
  bulbine: 'bulb-flower',
  strelitzia: 'bulb-flower',
  succulent: 'succulent',
  orchid: 'bulb-flower',
  palm: 'palm',
  houseplant: 'climbing-vine',
  fynbos: 'herb',
  generic: 'flowering-shrub',
}

// Default real-world-proportion scale per template, so a ground-cover mat
// and a full-grown tree don't render as the same size sprite. Overridden
// per-species in PLANT_COLOUR_MAP/PERSONAL_PLANT_COLOUR_MAP (via `scale`)
// only where a species' real size is a clear outlier for its template shape
// (e.g. the 'aloe' template spans tiny spiral-aloe rosettes to towering
// mountain-aloe stems) — most species just take this default.
const TEMPLATE_SCALE = {
  'ground-cover': 0.7,
  succulent: 0.75,
  herb: 0.8,
  fern: 0.8,
  'grass-tuft': 0.85,
  'flowering-shrub': 1,
  'bulb-flower': 1,
  protea: 1,
  aloe: 1,
  'climbing-vine': 0.8,
  palm: 1.15,
  'tree-small': 1.25,
}

// A lighter shade of a hex colour, for the template's secondary/back-layer
// foliage zone — plantFoliageColor only gives one foliage tone, but every
// template wants two (front/back layers) so the plant reads as textured
// instead of flat.
function lightenHex(hex, amount = 0.35) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const mix = (v) => Math.round(v + (255 - v) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const SPECIES_BY_COMMON_NAME = new Map(
  SA_PLANT_LIBRARY.map((p) => [p.commonName.trim().toLowerCase(), p]),
)

// Cheap deterministic string hash — a duplicate of Garden.jsx's own hashSeed
// (kept local rather than imported so this file has zero component-file
// dependencies). Used to give a non-curated species a shape distinct from
// its template-mates instead of every fallback plant reading as one
// identical clone, keyed on her own name for it so it's stable across
// renders/reloads.
function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function fallbackVariation(seedKey) {
  const unit = (salt) => (hashSeed(`${seedKey}:${salt}`) % 1000) / 1000
  const between = (salt, lo, hi) => lo + unit(salt) * (hi - lo)
  return {
    leafCount: Math.round(between('leafCount', 3, 8)),
    leafAngle: Math.round(between('leafAngle', 30, 90)),
    leafWidth: Math.round(between('leafWidth', 0.8, 1.3) * 10) / 10,
    height: Math.round(between('height', 0.75, 1.3) * 10) / 10,
    flowerCount: Math.round(between('flowerCount', 2, 8)),
    flowerSize: Math.round(between('flowerSize', 0.7, 1.2) * 10) / 10,
    hasStem: unit('hasStem') < 0.5,
  }
}

// Pooks' actual real-world plantings (from her Seed Pouch photo IDs) that
// aren't part of the curated 207-species SA_PLANT_LIBRARY — checked by exact
// common name, same idea as PLANT_COLOUR_MAP but for her personal houseplant
// collection instead of the SA Explore/Magazine catalog. Keeps
// plantBloomKind's keyword guessing as the fallback for anything NOT listed
// here, rather than growing that catalog with non-SA species.
const PERSONAL_PLANT_COLOUR_MAP = {
  'splendid paphiopedilum': {
    template: 'bulb-flower',
    zones: { stem: '#4f7a52', leafMain: '#2f6a3a', leafSecondary: '#4a8a4a', petal: '#7a2f3a', center: '#d8c860', soil: '#7a5a3a' },
    variation: { leafCount: 2, leafWidth: 1.3, height: 0.7, flowerCount: 1, flowerSize: 1.3 },
  },
  monstera: {
    // Real Monstera deliciosa is bushy and wide (big leaves radiating from a
    // low base), not a climbing vine as typically grown/potted — flowering-
    // shrub's filled leaf-clumps (flowerCount:0, no blooms) reads as a leafy
    // bush far better than climbing-vine's thin-stem-with-leaves shape.
    template: 'flowering-shrub',
    zones: { stem: '#5f7a45', leafMain: '#2f6a3a', leafSecondary: '#4f9a55', petal: '#e8ead0', center: '#e8c060', soil: '#6b5638' },
    variation: { leafCount: 8, leafWidth: 1.5, height: 1.25, flowerCount: 0, flowerSize: 1 },
  },
  'air plant': {
    template: 'succulent',
    zones: { stem: '#8a9a7a', leafMain: '#9fae8a', leafSecondary: '#c3d0b0', petal: '#a878c9', center: '#e8a0c0', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 90, leafWidth: 0.6, height: 0.6, flowerCount: 1, flowerSize: 0.6, hasStem: false },
  },
  'elephant bush': {
    template: 'succulent',
    zones: { stem: '#8a5a3a', leafMain: '#4a8a5a', leafSecondary: '#6aa86a', petal: '#f0a8c0', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 60, leafWidth: 0.75, height: 0.9, flowerCount: 0, flowerSize: 0.6, hasStem: true },
  },
  'moth orchid': {
    template: 'bulb-flower',
    zones: { stem: '#5a6a4a', leafMain: '#2f6a3a', leafSecondary: '#4a8a4a', petal: '#d17ad6', center: '#7a2f6a', soil: '#6b5638' },
    variation: { leafCount: 2, leafWidth: 1.2, height: 0.85, flowerCount: 5, flowerSize: 1.2 },
  },
  'easter lily': {
    // Template was already right — the "thin stick with a star on top" look
    // came from a too-tall, too-narrow variation. Shorter + wider leaves reads
    // as a proper medium trumpet-flowered plant instead. That fix alone still
    // read too prominent next to the shrubs (flowerSize 1.5 + default scale) —
    // toned the bloom down and capped the overall size a notch below a shrub.
    template: 'bulb-flower',
    scale: 0.85,
    zones: { stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5e9a5a', petal: '#fbfaf3', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 4, leafWidth: 1.6, height: 0.9, flowerCount: 1, flowerSize: 1 },
  },
  succulent: {
    template: 'succulent',
    zones: { stem: '#8a6a42', leafMain: '#4a2f42', leafSecondary: '#6a4a5e', petal: '#f2e090', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 75, leafWidth: 1, height: 1, flowerCount: 2, flowerSize: 0.8, hasStem: true },
  },
  'blue fingers': {
    // Real Blue Chalksticks/Blue fingers (Curio/Senecio) trails and spreads
    // rather than forming an upright rosette — matches how the same species
    // ("blue-chalk-sticks") is already classified in the main SA library.
    template: 'ground-cover',
    zones: { stem: '#8a9a8a', leafMain: '#8fa3ad', leafSecondary: '#b8cdd6', petal: '#f5f0e0', center: '#e8d896', soil: '#7a5a3a' },
    variation: { leafCount: 7, leafAngle: 55, leafWidth: 0.55, height: 0.85, flowerCount: 1, flowerSize: 0.6, hasStem: true },
  },
  'bushveld kalanchoe': {
    // Template stays succulent — real Kalanchoe sexangularis is an upright
    // branching succulent shrub rather than a flat rosette, so give it a
    // visible stem and a taller habit instead of reassigning templates.
    template: 'succulent',
    zones: { stem: '#6a8a5a', leafMain: '#5a9a5a', leafSecondary: '#7cb87c', petal: '#e8663a', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 5, leafAngle: 65, leafWidth: 1.1, height: 1.05, flowerCount: 10, flowerSize: 0.7, hasStem: true },
  },
  'french rose': {
    template: 'flowering-shrub',
    zones: { stem: '#6b7d4a', leafMain: '#3f7a45', leafSecondary: '#5e9a5a', petal: '#e8789e', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 6, leafAngle: 55, leafWidth: 1, height: 1, flowerCount: 10, flowerSize: 1, hasStem: true },
  },
  'queen palm': {
    template: 'palm',
    zones: { stem: '#a88a5a', leafMain: '#4f9a55', leafSecondary: '#7bc9a8', petal: '#c9a25a', center: '#e8a45c', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 100, leafWidth: 1.05, height: 1.2, flowerCount: 2, flowerSize: 1 },
  },
  philodendron: {
    // This is P. bipinnatifidum — a self-heading bushy philodendron with huge
    // leaves radiating from a low base, not a climbing vine. flowering-shrub
    // (filled leaf-clumps) is a better fit than herb, whose thin sprig-line
    // leaves would read even less like a big-leaved aroid than the vine did.
    template: 'flowering-shrub',
    zones: { stem: '#5f7a45', leafMain: '#356b3d', leafSecondary: '#4f9a55', petal: '#e8ead0', center: '#e8c060', soil: '#6b5638' },
    variation: { leafCount: 7, leafWidth: 1.6, height: 1.15, flowerCount: 0, flowerSize: 1 },
  },
  // NOTE: key must match the exact commonName Pooks' actual planting carries
  // ("White bird of-paradise tree" — that odd "bird of-paradise" punctuation,
  // not the more standard "bird-of-paradise", is what her identified species
  // record actually contains). A prior version of this key used the more
  // grammatically standard hyphenation and silently never matched her real
  // planting, falling through to the generic classifier instead.
  //
  // This is Strelitzia nicolai — the exact same species as "Wild Banana" in
  // the main SA library (see plantColourMap.js's 'wild-banana' entry), which
  // is already correctly templated as palm (tall stalks, big paddle leaves,
  // tree-like) rather than bulb-flower. Reassigned here to match, and no
  // custom `scale` override — it takes palm's plain TEMPLATE_SCALE default,
  // same as Wild Banana.
  'white bird of-paradise tree': {
    template: 'palm',
    zones: { stem: '#5f7a52', leafMain: '#2f6a3a', leafSecondary: '#4f9a55', petal: '#f5f0e0', center: '#3a2a6a', soil: '#7a5a3a' },
    variation: { leafCount: 3, leafWidth: 1.4, height: 1.3, flowerCount: 1, flowerSize: 1.3, hasStem: true },
  },
}

export function plantVisual(commonName, family) {
  const species = commonName && SPECIES_BY_COMMON_NAME.get(String(commonName).trim().toLowerCase())
  const curated = species && PLANT_COLOUR_MAP[species.id]
  if (curated) {
    return {
      template: curated.template, zones: curated.zones, variation: curated.variation,
      scale: curated.scale ?? TEMPLATE_SCALE[curated.template] ?? 1,
    }
  }

  const personal = commonName && PERSONAL_PLANT_COLOUR_MAP[String(commonName).trim().toLowerCase()]
  if (personal) {
    return {
      template: personal.template, zones: personal.zones, variation: personal.variation,
      scale: personal.scale ?? TEMPLATE_SCALE[personal.template] ?? 1,
    }
  }

  const kind = plantBloomKind(commonName, family)
  const seedKey = commonName || family
  if (kind === 'generic' && !seedKey) {
    return { template: 'flowering-shrub', zones: GENERIC_PLANT_ZONES, variation: {}, scale: TEMPLATE_SCALE['flowering-shrub'] }
  }
  const leafMain = plantFoliageColor(commonName, family)
  const template = BLOOM_KIND_TEMPLATE[kind] || 'flowering-shrub'
  return {
    template,
    zones: {
      stem: kind === 'aloe' || kind === 'succulent' ? '#8a9a7a' : '#6b5638',
      leafMain,
      leafSecondary: lightenHex(leafMain),
      petal: plantBloomColor(commonName, family),
      center: kind === 'protea' ? '#3d2a22' : '#f2c230',
      soil: '#7a5a3a',
    },
    variation: fallbackVariation(seedKey),
    scale: TEMPLATE_SCALE[template] ?? 1,
  }
}
