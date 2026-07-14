// SA Plant Library — pure data + helpers (no components, Fast-Refresh
// friendly). Feeds the "Plants near you" home card, the Explore Plants tab,
// and the Magazine's plant articles.
//
// Not exhaustive like the SA bird library (~375 species) — a careful, solid
// set of well-known South African garden, indigenous, tree, succulent and
// fynbos species, region-tagged so the same rotation mechanism the birds use
// (weekly hash-seeded watch-list) can serve a Potchefstroom-area default and
// a Cape Town / fynbos variant during the Cape Town Special Week.

export const PLANT_CATEGORIES = [
  'Flowers',
  'Trees',
  'Succulents',
  'Fynbos',
  'Garden Plants',
  'Indigenous',
]

// regions: 'potch' = common on the Highveld / in Potchefstroom-area gardens,
// 'capetown' = fynbos / Western Cape specialities. Most indigenous species
// that are also widely garden-grown carry both tags.
export const SA_PLANT_LIBRARY = [
  {
    id: 'king-protea',
    commonName: 'King Protea',
    afrikaansName: 'Koningsprotea',
    scientificName: 'Protea cynaroides',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Autumn to winter',
    funFact:
      "South Africa's national flower — its flower head can grow up to 30cm wide, the largest of any protea species.",
    whereFound: 'Fynbos slopes and mountain fynbos across the Western Cape, especially the Cape Peninsula.',
    careTips: 'Full sun, very well-drained acidic soil, and no phosphate fertiliser — sandy soil mimics its native fynbos best.',
  },
  {
    id: 'sugarbush',
    commonName: 'Common Sugarbush',
    afrikaansName: 'Suikerbos',
    scientificName: 'Protea repens',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Most of the year, peaking in autumn and winter',
    funFact: 'One of the most widespread proteas — its nectar-rich flowers are a favourite of sunbirds and Cape sugarbirds.',
    whereFound: 'Fynbos across the Western and Eastern Cape mountains.',
    careTips: 'Full sun, sandy well-drained soil, drought-tolerant once established.',
  },
  {
    id: 'pincushion',
    commonName: 'Pincushion Protea',
    afrikaansName: 'Speldekussing',
    scientificName: 'Leucospermum cordifolium',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Late winter to spring',
    funFact: 'Named for its round flower heads covered in curved styles that look like a pincushion full of pins.',
    whereFound: 'Fynbos on the Cape south coast mountains.',
    careTips: 'Needs excellent drainage and full sun — very sensitive to wet, heavy soil.',
  },
  {
    id: 'silver-tree',
    commonName: 'Silver Tree',
    afrikaansName: 'Silwerboom',
    scientificName: 'Leucadendron argenteum',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Winter',
    funFact: 'Its silky silver leaves are covered in fine hairs that reflect sunlight — found naturally almost nowhere except Table Mountain.',
    whereFound: 'Table Mountain and the Cape Peninsula, almost exclusively.',
    careTips: 'Full sun, sandy acidic soil, and cool coastal air — notoriously difficult to grow away from the Cape.',
  },
  {
    id: 'watsonia',
    commonName: 'Watsonia',
    afrikaansName: 'Suurkanol',
    scientificName: 'Watsonia borbonica',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Spring to early summer',
    funFact: 'A tall, showy relative of the gladiolus that carpets fynbos slopes with pink spikes after fire.',
    whereFound: 'Fynbos slopes across the Western Cape.',
    careTips: 'Full sun, well-drained soil, dies back to a corm in summer — very drought tolerant once dormant.',
  },
  {
    id: 'freesia',
    commonName: 'Freesia',
    afrikaansName: 'Freesia',
    scientificName: 'Freesia refracta',
    category: 'Fynbos',
    regions: ['capetown'],
    bloomSeason: 'Late winter to early spring',
    funFact: 'One of the most fragrant flowers in the world, and the ancestor of nearly every freesia grown in gardens globally.',
    whereFound: 'Sandy flats and lower slopes across the Western Cape.',
    careTips: 'Full sun, well-drained soil, plant corms in autumn for a spring bloom.',
  },
  {
    id: 'agapanthus',
    commonName: 'Agapanthus',
    afrikaansName: 'Bloulelie',
    scientificName: 'Agapanthus africanus',
    category: 'Garden Plants',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Summer',
    funFact: 'Its name comes from Greek for "love flower" — one of South Africa’s most exported garden plants worldwide.',
    whereFound: 'Rocky slopes in the Western Cape natively, but grown in gardens right across the country.',
    careTips: 'Full sun to light shade, tolerant of poor soil and drought once established — a very forgiving garden plant.',
  },
  {
    id: 'clivia',
    commonName: 'Clivia',
    afrikaansName: 'Boslelie',
    scientificName: 'Clivia miniata',
    category: 'Indigenous',
    regions: ['potch'],
    bloomSeason: 'Late winter to spring',
    funFact: 'Thrives in deep shade where almost nothing else flowers — a favourite for shady gardens across South Africa.',
    whereFound: 'Shaded forest understorey from the Eastern Cape through KwaZulu-Natal into Mpumalanga and Limpopo.',
    careTips: 'Deep shade, well-drained soil, and don’t overwater — it prefers to dry out between waterings.',
  },
  {
    id: 'bird-of-paradise',
    commonName: 'Bird of Paradise',
    afrikaansName: 'Kraanvoëlblom',
    scientificName: 'Strelitzia reginae',
    category: 'Garden Plants',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Most of the year, peaking in winter and spring',
    funFact: 'Its orange and blue flower is shaped to let sunbirds land on it and pollinate it while feeding on the nectar.',
    whereFound: 'Native to the Eastern Cape, but grown as a garden and street plant across South Africa.',
    careTips: 'Full sun, rich well-drained soil, and regular watering in summer for the best flowering.',
  },
  {
    id: 'wild-banana',
    commonName: 'Wild Banana',
    afrikaansName: 'Wilde-piesang',
    scientificName: 'Strelitzia nicolai',
    category: 'Trees',
    regions: ['potch'],
    bloomSeason: 'Most of the year',
    funFact: "The giant, tree-sized relative of the Bird of Paradise — can grow up to 10 metres tall, despite not being a true banana.",
    whereFound: 'Coastal forest from the Eastern Cape to KwaZulu-Natal, widely planted as a garden tree elsewhere.',
    careTips: 'Full sun to part shade, rich soil, and regular water — a fast-growing architectural garden tree.',
  },
  {
    id: 'arum-lily',
    commonName: 'Arum Lily',
    afrikaansName: 'Varkoor',
    scientificName: 'Zantedeschia aethiopica',
    category: 'Indigenous',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Spring to summer',
    funFact: 'The elegant white "flower" is actually a leaf-like bract wrapped around the true, tiny flowers on the central spike.',
    whereFound: 'Damp ground and streambanks across most of South Africa.',
    careTips: 'Full sun to part shade, likes consistently moist soil — thrives at the edge of a pond or damp corner.',
  },
  {
    id: 'red-hot-poker',
    commonName: 'Red Hot Poker',
    afrikaansName: 'Vuurpyl',
    scientificName: 'Kniphofia uvaria',
    category: 'Flowers',
    regions: ['potch'],
    bloomSeason: 'Summer to autumn',
    funFact: 'Its glowing orange-to-yellow flower spikes are a magnet for sunbirds, which feed on the nectar tube by tube from the bottom up.',
    whereFound: 'Grassland and rocky slopes across the Eastern Cape and KwaZulu-Natal.',
    careTips: 'Full sun, well-drained soil, very hardy and drought tolerant once established.',
  },
  {
    id: 'wild-dagga',
    commonName: 'Wild Dagga',
    afrikaansName: 'Wildedagga',
    scientificName: 'Leonotis leonurus',
    category: 'Flowers',
    regions: ['potch'],
    bloomSeason: 'Late summer to autumn',
    funFact: 'Its shaggy orange flowers grow in tidy whorls up the stem and are a favourite of sunbirds — despite the name, it is unrelated to cannabis.',
    whereFound: 'Grassland and rocky slopes across much of South Africa, including the Highveld.',
    careTips: 'Full sun, tolerates poor soil, very drought hardy once established.',
  },
  {
    id: 'barberton-daisy',
    commonName: 'Barberton Daisy',
    afrikaansName: 'Barbertonse madeliefie',
    scientificName: 'Gerbera jamesonii',
    category: 'Flowers',
    regions: ['potch'],
    bloomSeason: 'Spring to autumn',
    funFact: "Discovered near Barberton in Mpumalanga in the 1880s, it's the wild ancestor of almost every gerbera sold in flower shops worldwide.",
    whereFound: 'Rocky grassland slopes in Mpumalanga and neighbouring provinces.',
    careTips: 'Full sun to light shade, well-drained soil — a reliable, colourful garden and pot plant.',
  },
  {
    id: 'plumbago',
    commonName: 'Cape Plumbago',
    afrikaansName: 'Blousyselbos',
    scientificName: 'Plumbago auriculata',
    category: 'Garden Plants',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Spring through to autumn',
    funFact: 'Its soft powder-blue flowers are a favourite nectar stop for butterflies, especially the Common Blue.',
    whereFound: 'Forest margins and thicket across the Eastern Cape, widely grown as a hedge elsewhere.',
    careTips: 'Full sun to part shade, drought tolerant, prune hard after winter to keep it flowering well.',
  },
  {
    id: 'cape-honeysuckle',
    commonName: 'Cape Honeysuckle',
    afrikaansName: 'Kaapse kanferfoelie',
    scientificName: 'Tecoma capensis',
    category: 'Garden Plants',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Most of the year, peaking in autumn and winter',
    funFact: 'Its tubular orange flowers are one of the most reliable nectar sources for sunbirds through the coldest months.',
    whereFound: 'Forest margins and coastal scrub across the Eastern Cape and KwaZulu-Natal.',
    careTips: 'Full sun to part shade, tolerant of poor soil, makes an excellent bird-friendly hedge.',
  },
  {
    id: 'namaqualand-daisy',
    commonName: 'Namaqualand Daisy',
    afrikaansName: 'Namakwalandse madeliefie',
    scientificName: 'Dimorphotheca sinuata',
    category: 'Flowers',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Late winter to early spring',
    funFact: 'After good winter rains, these daisies carpet entire hillsides in Namaqualand in one of the world’s great wildflower displays.',
    whereFound: 'Semi-arid Namaqualand region of the Northern and Western Cape.',
    careTips: 'Full sun, sandy well-drained soil, sow seed in autumn for a spring show.',
  },
  {
    id: 'vygie',
    commonName: 'Vygie',
    afrikaansName: 'Vygie',
    scientificName: 'Lampranthus spectabilis',
    category: 'Succulents',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Spring',
    funFact: 'Its jewel-bright flowers only open fully in sunshine and close again on cloudy days and at night.',
    whereFound: 'Rocky and sandy slopes across the Western Cape.',
    careTips: 'Full sun, very well-drained soil, extremely drought tolerant — perfect for a rockery.',
  },
  {
    id: 'bitter-aloe',
    commonName: 'Bitter Aloe',
    afrikaansName: 'Bergaalwyn',
    scientificName: 'Aloe ferox',
    category: 'Succulents',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Winter',
    funFact: 'Its bitter sap has been harvested for centuries as a traditional remedy, and its tall orange flower spikes feed sunbirds through the coldest months.',
    whereFound: 'Dry, rocky slopes across the Eastern and Western Cape.',
    careTips: 'Full sun, extremely well-drained soil, waters sparingly — very drought tolerant once established.',
  },
  {
    id: 'spekboom',
    commonName: 'Spekboom',
    afrikaansName: 'Spekboom',
    scientificName: 'Portulacaria afra',
    category: 'Succulents',
    regions: ['potch'],
    bloomSeason: 'Late summer',
    funFact: "One of the most efficient carbon-absorbing plants in the world — a single hectare of spekboom thicket can lock away a surprising amount of carbon each year.",
    whereFound: 'Thicket vegetation in the Eastern Cape, widely planted as a hedge across South Africa.',
    careTips: 'Full sun to part shade, extremely drought tolerant, grows easily from a simple cutting.',
  },
  {
    id: 'century-plant',
    commonName: 'Century Plant',
    afrikaansName: 'Eeuplant',
    scientificName: 'Agave americana',
    category: 'Succulents',
    regions: ['potch'],
    bloomSeason: 'Once, after many years, then the rosette dies',
    funFact: 'Flowers only once in its life, sending up a towering flower spike several metres tall before the main rosette dies back.',
    whereFound: 'Originally from Mexico, but a common, tough garden and boundary plant across South Africa.',
    careTips: 'Full sun, very well-drained soil, essentially indestructible once established — handle the sharp leaf tips with care.',
  },
  {
    id: 'karee',
    commonName: 'Karee',
    afrikaansName: 'Karee',
    scientificName: 'Searsia lancea',
    category: 'Trees',
    regions: ['potch'],
    bloomSeason: 'Late winter, small inconspicuous flowers',
    funFact: 'A tough, evergreen tree often planted for shade on Highveld farms and gardens — its narrow willow-like leaves cast dappled shade.',
    whereFound: 'Widespread across the drier interior of South Africa, including the Highveld.',
    careTips: 'Full sun, tolerant of poor soil and drought once established — a reliable, low-maintenance shade tree.',
  },
  {
    id: 'wild-olive',
    commonName: 'Wild Olive',
    afrikaansName: 'Olienhout',
    scientificName: 'Olea europaea subsp. africana',
    category: 'Trees',
    regions: ['potch'],
    bloomSeason: 'Spring, small inconspicuous flowers',
    funFact: 'The indigenous cousin of the Mediterranean olive tree — its small fruit is a favourite of fruit-eating birds.',
    whereFound: 'Widespread across South Africa, from the Cape through to the Highveld.',
    careTips: 'Full sun, tolerant of poor soil, slow-growing but very hardy and long-lived.',
  },
  {
    id: 'yellowwood',
    commonName: 'Real Yellowwood',
    afrikaansName: 'Opregte geelhout',
    scientificName: 'Podocarpus latifolius',
    category: 'Trees',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Spring, small inconspicuous flowers',
    funFact: "South Africa's national tree — an ancient conifer that can live for many centuries in the country's indigenous forests.",
    whereFound: 'Indigenous forest patches from the Cape through to Limpopo, including the Knysna forests.',
    careTips: 'Part shade when young, tolerant of full sun once established, slow-growing and long-lived.',
  },
  {
    id: 'buffalo-thorn',
    commonName: 'Buffalo Thorn',
    afrikaansName: "Blinkblaar-wag-'n-bietjie",
    scientificName: 'Ziziphus mucronata',
    category: 'Trees',
    regions: ['potch'],
    bloomSeason: 'Summer, small inconspicuous flowers',
    funFact: 'Its Afrikaans name means "shiny-leaf wait-a-bit," after its hooked thorns — a culturally significant tree in many South African traditions.',
    whereFound: 'Widespread across the drier bushveld and Highveld regions of South Africa.',
    careTips: 'Full sun, tolerant of poor soil and drought, thorny — best planted away from pathways.',
  },
  {
    id: 'jacaranda',
    commonName: 'Jacaranda',
    afrikaansName: 'Jacaranda',
    scientificName: 'Jacaranda mimosifolia',
    category: 'Trees',
    regions: ['potch'],
    bloomSeason: 'Spring (October–November)',
    funFact: 'Not indigenous to South Africa, but so widely planted that entire streets across Pretoria and the Highveld turn purple every spring.',
    whereFound: 'Streets, parks and gardens across South Africa’s interior towns and cities.',
    careTips: 'Full sun, deep watering while young, sheds a carpet of purple flowers that many towns sweep up each spring.',
  },
  {
    id: 'wild-garlic',
    commonName: 'Wild Garlic',
    afrikaansName: 'Wildeknoffel',
    scientificName: 'Tulbaghia violacea',
    category: 'Flowers',
    regions: ['potch', 'capetown'],
    bloomSeason: 'Spring to autumn',
    funFact: 'Its leaves smell faintly of garlic when crushed and are sometimes used to season food, though it is grown mostly for its pretty mauve flower clusters.',
    whereFound: 'Rocky grassland across the eastern half of South Africa.',
    careTips: 'Full sun to light shade, tolerant of poor soil, very easy and reliable in a border.',
  },
  {
    id: 'cosmos',
    commonName: 'Cosmos',
    afrikaansName: 'Kosmos',
    scientificName: 'Cosmos bipinnatus',
    category: 'Flowers',
    regions: ['potch'],
    bloomSeason: 'Autumn (March–May)',
    funFact: 'Not indigenous — it arrived in horse feed during the Anglo-Boer War — but it has naturalised so thoroughly that Highveld roadsides turn pink and white with it every autumn.',
    whereFound: 'Roadsides and fields across the Free State, Mpumalanga and North West provinces.',
    careTips: 'Full sun, poor soil is fine, self-seeds freely once established.',
  },
]

export const PLANT_EXPLORE_FILTERS = [
  { id: 'all', label: 'All plants', test: () => true },
  { id: 'potch', label: 'Near Potchefstroom', test: (p) => p.regions.includes('potch') },
  { id: 'capetown', label: 'Near Cape Town', test: (p) => p.regions.includes('capetown') },
  { id: 'flowers', label: 'Flowers', test: (p) => p.category === 'Flowers' },
  { id: 'trees', label: 'Trees', test: (p) => p.category === 'Trees' },
  { id: 'succulents', label: 'Succulents', test: (p) => p.category === 'Succulents' },
  { id: 'fynbos', label: 'Fynbos', test: (p) => p.category === 'Fynbos' },
  { id: 'garden', label: 'Garden Plants', test: (p) => p.category === 'Garden Plants' },
  { id: 'indigenous', label: 'Indigenous', test: (p) => p.category === 'Indigenous' },
]

const PLANT_CATEGORY_EMOJI = {
  Flowers: '🌸',
  Trees: '🌳',
  Succulents: '🌵',
  Fynbos: '🏵️',
  'Garden Plants': '🌿',
  Indigenous: '🍃',
}

export function plantCategoryEmoji(category) {
  return PLANT_CATEGORY_EMOJI[category] || '🌿'
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Same Monday-based weekly reseed as the bird watch-list (birdExplore.js) —
// the same set holds all week, then a fresh set appears every Monday.
function weekSeed(date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  )
  return Math.floor((dayNumber + 3) / 7)
}

function weeklyPlantWatchList(pool, date, count) {
  if (!pool.length) return []
  const seed = weekSeed(date)
  return pool
    .map((plant, i) => ({ plant, k: hash(`plant-${seed}-${plant.id}-${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.min(count, pool.length))
    .map((o) => o.plant)
}

export function plantsNearPotchThisWeek(date = new Date(), count = 7) {
  return weeklyPlantWatchList(
    SA_PLANT_LIBRARY.filter((p) => p.regions.includes('potch')),
    date,
    count,
  )
}

export function plantsNearCapeTownThisWeek(date = new Date(), count = 7) {
  return weeklyPlantWatchList(
    SA_PLANT_LIBRARY.filter((p) => p.regions.includes('capetown')),
    date,
    count,
  )
}

export function findPlantById(id) {
  return SA_PLANT_LIBRARY.find((p) => p.id === id) || null
}
