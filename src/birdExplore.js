// Pure helpers for the "Birds near you" home card and the "Explore Birds"
// field guide. No components here, so Fast Refresh stays happy.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const lc = (s) => String(s || '').toLowerCase()

function birdText(bird) {
  return [
    bird.region,
    bird.habitat,
    bird.whereFoundInSouthAfrica,
    bird.description,
    ...(bird.funFacts || []),
    bird.soundDescription,
    ...(bird.regionTags || []),
  ]
    .map(lc)
    .join(' ')
}

const tagsLc = (bird) => (bird.regionTags || []).map(lc)

// North West / Highveld around Potchefstroom — her home turf.
export function nearPotchefstroom(bird) {
  const tags = tagsLc(bird)
  if (
    tags.includes('north west') ||
    tags.includes('potchefstroom') ||
    tags.includes('highveld') ||
    tags.includes('gauteng')
  ) {
    return true
  }
  if (bird.nearMe) return true
  return /(north west|potchefstroom|highveld|grassland)/.test(birdText(bird))
}

// Lowveld / bushveld / savanna birds — the Kruger crowd.
export function nearKruger(bird) {
  if (tagsLc(bird).includes('kruger')) return true
  return /(kruger|lowveld|bushveld|savanna|savannah|thornveld|woodland|riverine|game reserve|mopane)/.test(
    birdText(bird),
  )
}

// Obvious summer migrants (present roughly Sep–Apr).
const MIGRANT_NAMES = new Set(
  [
    'Barn Swallow',
    'Greater Striped Swallow',
    'White-throated Swallow',
    'Diederik Cuckoo',
    'Red-chested Cuckoo',
    'African Paradise Flycatcher',
    'Yellow-billed Kite',
    'Steppe Buzzard',
  ].map(lc),
)

// Birds that are present all year but only conspicuous in their summer
// breeding finery (drab and skulking in winter).
const SUMMER_DISPLAY = new Set(
  [
    'southern red bishop',
    'yellow-crowned bishop',
    'southern masked weaver',
    'village weaver',
    'cape weaver',
    'long-tailed widowbird',
    'red-collared widowbird',
    'pin-tailed whydah',
    'red-billed quelea',
  ].map(lc),
)

function isMigrant(bird) {
  if (MIGRANT_NAMES.has(lc(bird.commonName))) return true
  return /(migrant|summer visitor|breeding visitor|arrives in summer)/.test(birdText(bird))
}

// A 12-month activity profile (Jan→Dec), each value 0..1. Residents are
// present all year with a spring/summer breeding peak; migrants drop out in
// winter; breeding-display birds dip (but never vanish) in the cold months.
export function monthlyActivity(bird) {
  const months = new Array(12).fill(0)
  if (isMigrant(bird)) {
    ;[8, 9, 10, 11, 0, 1, 2, 3].forEach((m) => {
      months[m] = 0.65
    })
    ;[9, 10, 11, 0, 1].forEach((m) => {
      months[m] = 1
    })
    months[8] = 0.8
    months[3] = 0.5
    return months
  }
  const summerOnly = SUMMER_DISPLAY.has(lc(bird.commonName))
  for (let m = 0; m < 12; m += 1) {
    const breeding = m >= 8 || m <= 1 // Sep–Feb
    if (summerOnly) months[m] = breeding ? 1 : 0.4
    else months[m] = breeding ? 0.95 : 0.6
  }
  return months
}

export const EXPLORE_FILTERS = [
  { id: 'all', label: 'All birds', test: () => true },
  { id: 'potch', label: 'Near Potchefstroom', test: nearPotchefstroom },
  { id: 'kruger', label: 'Near Kruger', test: nearKruger },
  { id: 'garden', label: 'Garden birds', test: (b) => b.category === 'Garden birds' },
  { id: 'water', label: 'Water birds', test: (b) => b.category === 'Water birds' },
  { id: 'prey', label: 'Birds of prey', test: (b) => b.category === 'Birds of prey' },
  { id: 'colourful', label: 'Colourful birds', test: (b) => b.category === 'Colourful birds' },
]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// A daily-rotating little watch-list of birds likely near Potchefstroom, so it
// feels fresh every day she opens the app.
export function birdsNearPotchToday(library, date = new Date(), count = 7) {
  const pool = (library || []).filter(nearPotchefstroom)
  if (!pool.length) return []
  const daySeed = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
  return pool
    .map((bird, i) => ({ bird, k: hash(`${daySeed}-${bird.id || bird.commonName}-${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.min(count, pool.length))
    .map((o) => o.bird)
}
