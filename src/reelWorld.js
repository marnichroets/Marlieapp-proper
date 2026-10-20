// Seeded, local-only world for the field reel. Species ids are copied from the
// catalogs passed in — this module never invents or renames bird or plant ids.
import { normalizeBirdName } from './speciesMatch.js'

export const REEL_BIRD_NAMES = [
  'Cape Robin-Chat',
  'Hadeda Ibis',
  'Cape White-eye',
  'Southern Masked Weaver',
  'Malachite Sunbird',
  'African Fish Eagle',
  'Lilac-breasted Roller',
  'Spotted Eagle-Owl',
  'Bokmakierie',
  'Southern Red Bishop',
  'Cape Sparrow',
  'Grey Heron',
]

export const REEL_PLANT_IDS = [
  'king-protea',
  'bird-of-paradise',
  'spekboom',
  'agapanthus',
  'wild-dagga',
]

const REEL_PLANTINGS = [
  { id: 'reel-flower', type: 'flower-patch', x: 72, y: 206, wateredDays: 2, daysAgo: 20 },
  { id: 'reel-tree', type: 'tree-seed', x: 148, y: 170, wateredDays: 4, daysAgo: 40 },
  { id: 'reel-shrub', type: 'shrub', x: 210, y: 198, wateredDays: 3, daysAgo: 16 },
  { id: 'reel-bath', type: 'bird-bath', x: 268, y: 188, wateredDays: 2, daysAgo: 14 },
  { id: 'reel-pond', type: 'pond', x: 330, y: 210, wateredDays: 3, daysAgo: 24 },
  { id: 'reel-feeder', type: 'feeder', x: 108, y: 222, wateredDays: 2, daysAgo: 12 },
  { id: 'reel-house', type: 'birdhouse', x: 186, y: 228, wateredDays: 2, daysAgo: 18 },
]

function daysAgoIso(days, now) {
  return new Date(now - days * 86400000).toISOString()
}

export function buildReelPatch(birdLibrary, plantCatalog, now = Date.now()) {
  const library = Array.isArray(birdLibrary) ? birdLibrary : []
  const plants = Array.isArray(plantCatalog) ? plantCatalog : []
  const wanted = new Set(REEL_BIRD_NAMES)
  const seenBirds = library
    .filter((bird) => bird && wanted.has(bird.commonName))
    .map((bird) => ({
      id: bird.id,
      seen: true,
      timesSeen: bird.commonName === 'Malachite Sunbird' ? 3 : 1,
      firstSeenDate: '2026-09-12',
      lastSeenDate: '2026-10-18',
      commonName: bird.commonName,
      scientificName: bird.scientificName || '',
      rarity: bird.rarity || 'Common',
    }))

  const plantLibrary = REEL_PLANT_IDS.map((catalogId) => {
    const plant = plants.find((item) => item && item.id === catalogId)
    if (!plant) return null
    return {
      id: `reel-plant-${plant.id}`,
      catalogId: plant.id,
      speciesKey: normalizeBirdName(plant.scientificName || plant.commonName),
      commonName: plant.commonName,
      afrikaansName: plant.afrikaansName || '',
      scientificName: plant.scientificName || '',
      family: plant.family || plant.category || '',
      confidence: 96,
      funFact: plant.funFact || '',
      careTips: plant.careTips || '',
      referenceImageUrl: plant.imageUrl || '',
      photo: '',
      dateSpotted: '2026-10-02',
      lastSpotted: '2026-10-16',
      timesLogged: 1,
      createdAt: daysAgoIso(12, now),
      reelSample: true,
    }
  }).filter(Boolean)

  return {
    reelSample: true,
    introSeen: true,
    featherCoins: 8640,
    seeds: plantLibrary.length,
    birds: seenBirds.map((bird) => ({
      id: bird.id,
      name: bird.commonName,
      scientificName: bird.scientificName,
    })),
    birdLibrary: seenBirds,
    plantLibrary,
    sightings: [],
    discoveries: [],
    tweety: {
      name: 'Tweety',
      companion: 'sunbird',
      happiness: 96,
      bornAt: daysAgoIso(18, now),
      lastVisit: new Date(now).toISOString(),
      songHintSeen: true,
    },
    garden: {
      plantings: REEL_PLANTINGS.map((planting) => ({
        id: planting.id,
        type: planting.type,
        x: planting.x,
        y: planting.y,
        wateredDays: planting.wateredDays,
        lastWaterDay: '2026-10-18',
        plantedAt: daysAgoIso(planting.daysAgo, now),
      })),
    },
    messages: [
      {
        id: 'reel-dispatch',
        type: 'council',
        sender: 'The Bird Council 🪶',
        icon: '🪶',
        title: 'A sample dispatch',
        body: 'This inbox note exists only inside the local field reel. It is not a message from a real account.',
        date: daysAgoIso(1, now),
        read: false,
        favourite: false,
        reaction: null,
        reelSample: true,
      },
    ],
    settings: {
      botanicalRevealSeen: true,
      plantScanningUnlocked: true,
      greenhouseResetV1: true,
      releaseFlags: { plants: true },
    },
  }
}

export function assertReelPatchKeepsCatalogIds(patch, birdLibrary, plantCatalog) {
  const birdIds = new Set((birdLibrary || []).map((bird) => bird.id))
  const plantIds = new Set((plantCatalog || []).map((plant) => plant.id))
  const birdOk = (patch.birdLibrary || []).every((bird) => birdIds.has(bird.id))
  const plantOk = (patch.plantLibrary || []).every((plant) => plantIds.has(plant.catalogId))
  return birdOk && plantOk
}
