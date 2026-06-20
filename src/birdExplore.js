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

// Western Cape / Cape Town birds — for the "near you" card while Pooks is on her
// Cape Town trip (see isCapeTownWeek). Many genuinely-Cape species in the library
// predate region tagging and carry no regionTags, so a curated name list is the
// reliable signal; the tag/text checks then catch the rest.
const CAPE_TOWN_BIRDS = new Set(
  [
    'Cape Sugarbird',
    'Orange-breasted Sunbird',
    'Southern Double-collared Sunbird',
    'Malachite Sunbird',
    'Cape Bulbul',
    'Cape Sparrow',
    'Cape Spurfowl',
    'Cape Robin-Chat',
    'Cape White-eye',
    'Cape Weaver',
    'Cape Canary',
    'Cape Batis',
    'Cape Grassbird',
    'Cape Bunting',
    'Cape Siskin',
    'Cape Rockjumper',
    'Cape Longclaw',
    'Cape Wagtail',
    'Karoo Prinia',
    'Karoo Scrub Robin',
    'Bokmakierie',
    'Southern Boubou',
    'Sombre Greenbul',
    'African Penguin',
    'African Black Oystercatcher',
    "Hartlaub's Gull",
    'Kelp Gull',
    'Cape Cormorant',
    'Crowned Cormorant',
    'White-breasted Cormorant',
    'Cape Gannet',
    'Cape Shoveler',
    'Cape Teal',
    'Egyptian Goose',
    'Hadeda Ibis',
    'Helmeted Guineafowl',
  ].map(lc),
)

export function nearCapeTown(bird) {
  if (CAPE_TOWN_BIRDS.has(lc(bird.commonName))) return true
  const tags = tagsLc(bird)
  if (tags.includes('western cape') || tags.includes('fynbos')) return true
  return /(fynbos|western cape|cape peninsula|table mountain|cape town)/.test(birdText(bird))
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

// The Monday-based week index for a date (whole weeks since a Monday epoch), so
// a watch-list reseeds every Monday and stays put for the rest of the week.
function weekSeed(date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  )
  // Unix day 0 was a Thursday; +3 shifts week boundaries to Monday.
  return Math.floor((dayNumber + 3) / 7)
}

// A weekly watch-list of birds likely near Potchefstroom: the same set shows all
// week, then a fresh set appears every Monday so it feels new without churning
// day to day.
function weeklyWatchList(pool, date, count) {
  if (!pool.length) return []
  const seed = weekSeed(date)
  return pool
    .map((bird, i) => ({ bird, k: hash(`${seed}-${bird.id || bird.commonName}-${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.min(count, pool.length))
    .map((o) => o.bird)
}

export function birdsNearPotchThisWeek(library, date = new Date(), count = 7) {
  return weeklyWatchList((library || []).filter(nearPotchefstroom), date, count)
}

// Same weekly watch-list, but with Western Cape / Cape Town species — used on the
// home card during the Cape Town Special Week (see isCapeTownWeek).
export function birdsNearCapeTownThisWeek(library, date = new Date(), count = 7) {
  return weeklyWatchList((library || []).filter(nearCapeTown), date, count)
}

// Warm, evocative one-line "where you'll meet this bird" thoughts for the field
// guide — feelings of place, not clinical habitat notes. Deterministic per bird
// so the line never flickers between renders.
const LOCATION_THOUGHTS = {
  prey: [
    'Watches over the bushveld from the tallest dead trees',
    'Rides the thermals high above the Highveld plains',
    'Hunts the open grassland with a patient, golden eye',
  ],
  water: [
    'Patrols the dams and rivers of the North West',
    'Wades the quiet shallows where the reeds whisper',
    'Drifts across the Highveld dams at first light',
  ],
  garden: [
    'Found singing in gardens from Potchefstroom to Pretoria',
    'A familiar friend in leafy suburban gardens',
    'Flits through the fruit trees of a quiet backyard',
  ],
  colourful: [
    'A flash of colour among the garden blossoms',
    'Brightens the bushveld like a scattered jewel',
    'Catches the morning sun in a blaze of colour',
  ],
  noisy: [
    'Announces the Highveld dawn whether you like it or not',
    'Heard long before it is ever seen',
    'Fills the morning air with its unmistakable call',
  ],
  general: [
    'A common sight on Highveld fence posts at dawn',
    'Found across the grasslands and gardens of the North West',
    'One of the everyday birds of the South African veld',
  ],
}

function pickThought(pool, bird) {
  return pool[hash(bird.id || bird.commonName || '') % pool.length]
}

export function locationThought(bird) {
  const name = lc(bird.commonName)
  if (/weaver/.test(name)) {
    return 'Builds elaborate nests in acacia trees across the bushveld'
  }
  const raptor =
    bird.category === 'Birds of prey' ||
    /(eagle|kite|buzzard|hawk|falcon|kestrel|\bowl\b|owlet|harrier|goshawk|sparrowhawk|vulture)/.test(
      name,
    )
  if (raptor) {
    if (nearKruger(bird) && !nearPotchefstroom(bird)) {
      return 'Watches over Kruger from the tallest dead trees'
    }
    return pickThought(LOCATION_THOUGHTS.prey, bird)
  }
  if (bird.category === 'Water birds') return pickThought(LOCATION_THOUGHTS.water, bird)
  if (bird.category === 'Garden birds') return pickThought(LOCATION_THOUGHTS.garden, bird)
  if (bird.category === 'Colourful birds') return pickThought(LOCATION_THOUGHTS.colourful, bird)
  if (bird.category === 'Noisy birds') return pickThought(LOCATION_THOUGHTS.noisy, bird)
  return pickThought(LOCATION_THOUGHTS.general, bird)
}
