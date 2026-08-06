// Weekly Magazine Quiz generator — pure functions, no React.
//
// Builds a fresh 8-question quiz (4 bird + 4 plant) every week straight from
// the real bird/plant libraries: species descriptions, fun facts, colours,
// habitats, diets and Afrikaans names. Nothing is hand-written per question —
// each week's quiz is deterministically randomised from the full species
// pool (seeded by the week key), so retaking it mid-week is stable but a new
// Sunday always brings a different mix of subjects and question types.

// ---- Seeded RNG (mulberry32) ----------------------------------------------

function hashStringToSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN(arr, n, rng) {
  return seededShuffle(arr, rng).slice(0, n)
}

function uniqueDistractors(pool, correct, n, rng) {
  const candidates = [...new Set(pool.filter((v) => v && v !== correct))]
  return pickN(candidates, n, rng)
}

function makeOptions(correct, distractors, rng) {
  const options = seededShuffle([correct, ...distractors], rng)
  return { options, answer: options.indexOf(correct) }
}

// ---- Text classifiers -------------------------------------------------
// The bird/plant libraries store colour, habitat, diet and use info as free
// prose (e.g. "Olive-brown back, orange throat and breast, grey face."), not
// structured fields — so multiple-choice answers are extracted from that
// prose with small keyword classifiers rather than invented.

const CANONICAL_COLOURS = [
  'yellow', 'orange', 'red', 'brown', 'black', 'white', 'grey', 'green',
  'blue', 'pink', 'purple', 'olive', 'chestnut', 'cream', 'buff',
  'turquoise', 'maroon', 'rufous', 'cinnamon', 'copper', 'bronze',
  'scarlet', 'crimson',
]

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// "a Hadeda Ibis" vs "an African Hoopoe" — several common names start with a
// vowel sound, and "a African Hoopoe" reads as a typo in a kids' quiz.
function article(name) {
  return /^[aeiou]/i.test(String(name || '').trim()) ? 'an' : 'a'
}

// Finds the colour word inside whichever clause of `text` actually mentions
// the given body part(s) — e.g. for "Olive-brown back, orange throat and
// breast, grey face." + bodyPartRe matching "breast", this returns "Orange"
// (from the "orange throat and breast" clause), not the first colour in the
// string. Returns null when no clause mentions the body part at all, so
// callers can skip generating a question for that bird/plant rather than
// guessing.
function extractColourNearClause(text, bodyPartRe) {
  if (!text) return null
  const clauses = String(text).split(/[.,;]/)
  const clause = clauses.find((c) => bodyPartRe.test(c))
  if (!clause) return null
  const lower = clause.toLowerCase()
  const found = CANONICAL_COLOURS.find((c) => lower.includes(c))
  return found ? titleCase(found) : null
}

const BREAST_RE = /\b(breast|throat|chest|underparts|belly)\b/i
function extractBreastColour(colours) {
  return extractColourNearClause(colours, BREAST_RE)
}

const FLOWER_RE = /\b(flower|flowers|bloom|blooms|petal|petals)\b/i
function extractFlowerColour(funFact) {
  return extractColourNearClause(funFact, FLOWER_RE)
}

const HABITAT_TYPES = ['Garden', 'Wetland', 'Bushveld', 'Urban']
const HABITAT_KEYWORDS = {
  Wetland: ['wetland', 'dam', 'river', 'lake', 'marsh', 'reed', 'vlei', 'lagoon', 'waterside', 'pan', 'pond', 'stream', 'estuary', 'water'],
  Urban: ['city', 'cities', 'town', 'building', 'roof', 'bridge', 'urban', 'rooftop', 'pavement', 'street'],
  Bushveld: ['bushveld', 'savanna', 'savannah', 'woodland', 'veld', 'thicket', 'scrub', 'farm', 'farmland', 'grassland', 'bush'],
  Garden: ['garden', 'park', 'suburb', 'orchard', 'lawn', 'hedge'],
}
// Priority order matters: most-specific habitat wins when a description
// mentions several (most bird habitat text also mentions "gardens" in
// passing, so Garden is deliberately checked last as the catch-all).
const HABITAT_PRIORITY = ['Wetland', 'Urban', 'Bushveld', 'Garden']
function classifyHabitat(text) {
  const lower = String(text || '').toLowerCase()
  for (const type of HABITAT_PRIORITY) {
    if (HABITAT_KEYWORDS[type].some((kw) => lower.includes(kw))) return type
  }
  return null
}

const DIET_TYPES = ['Seeds', 'Insects', 'Nectar', 'Fish']
const DIET_KEYWORDS = {
  Fish: ['fish'],
  Nectar: ['nectar'],
  Insects: ['insect', 'invertebrate', 'larvae', 'larva', 'worm', 'grub'],
  Seeds: ['seed', 'grain'],
}
const DIET_PRIORITY = ['Fish', 'Nectar', 'Insects', 'Seeds']
function classifyDiet(text) {
  const lower = String(text || '').toLowerCase()
  for (const type of DIET_PRIORITY) {
    if (DIET_KEYWORDS[type].some((kw) => lower.includes(kw))) return type
  }
  return null
}

function parseSizeCm(text) {
  if (!text) return null
  const m = String(text).match(/(\d+)\s*(?:-\s*(\d+))?\s*cm/i)
  if (!m) return null
  const a = Number(m[1])
  const b = m[2] ? Number(m[2]) : a
  return (a + b) / 2
}

const PLANT_USE_TYPES = ['Traditional medicine', 'Food or eating', 'Weaving or crafts', 'Dye']
const PLANT_USE_KEYWORDS = {
  Dye: ['dye'],
  'Weaving or crafts': ['woven', 'weave', 'weaving', 'thatch', 'basket', 'spear', 'sleeping mat', 'mats and'],
  'Traditional medicine': ['medicin', 'remedy', 'muti', 'antiseptic', 'folk remedy', 'treat malaria', 'treat all manner', 'used to treat', 'skin ailments', 'burns and insect bites', 'coughs and colds'],
  'Food or eating': ['eaten', 'chewed', 'edible', 'brew a traditional beer', 'delicacy', 'source of water and food'],
}
// Priority order: check the most distinctive keyword groups first so
// overlapping prose (e.g. a remedy that's also brewed as tea) lands on the
// clearest single category.
const PLANT_USE_PRIORITY = ['Dye', 'Weaving or crafts', 'Traditional medicine', 'Food or eating']
function classifyPlantUse(text) {
  const lower = String(text || '').toLowerCase()
  for (const type of PLANT_USE_PRIORITY) {
    if (PLANT_USE_KEYWORDS[type].some((kw) => lower.includes(kw))) return type
  }
  return null
}

// ---- Bird question builders ------------------------------------------

function buildBirdPhotoQuestion(bird, pool, rng) {
  const distractors = uniqueDistractors(pool.map((b) => b.commonName), bird.commonName, 3, rng)
  return {
    type: 'bird-photo',
    q: 'Which bird is this?',
    photoBirdId: bird.id,
    ...makeOptions(bird.commonName, distractors, rng),
  }
}

function buildBirdColourQuestion(bird, rng) {
  const colour = extractBreastColour(bird.colours)
  const distractors = uniqueDistractors(CANONICAL_COLOURS.map(titleCase), colour, 3, rng)
  return {
    type: 'bird-colour',
    q: `What colour is ${article(bird.commonName)} ${bird.commonName}'s breast?`,
    ...makeOptions(colour, distractors, rng),
  }
}

function buildBirdSoundQuestion(bird, pool, rng) {
  const desc = bird.soundDescription || bird.callDescription
  const distractors = uniqueDistractors(pool.map((b) => b.commonName), bird.commonName, 3, rng)
  return {
    type: 'bird-sound',
    q: `Which bird makes this sound: “${desc}”?`,
    ...makeOptions(bird.commonName, distractors, rng),
  }
}

function buildBirdTrueFalseQuestion(bird, pool, rng) {
  const isTrue = rng() < 0.5
  const others = pool.filter((b) => b.id !== bird.id && b.funFact)
  const fact = isTrue ? bird.funFact : (pick(others, rng) || bird).funFact
  return {
    type: 'bird-truefalse',
    q: `True or false — ${bird.commonName}: ${fact}`,
    options: ['True', 'False'],
    answer: isTrue ? 0 : 1,
  }
}

function buildBirdHabitatQuestion(bird, rng) {
  const habitat = classifyHabitat(bird.habitat || bird.region)
  const distractors = uniqueDistractors(HABITAT_TYPES, habitat, 3, rng)
  return {
    type: 'bird-habitat',
    q: `Where would you most likely spot ${article(bird.commonName)} ${bird.commonName}?`,
    ...makeOptions(habitat, distractors, rng),
  }
}

function buildBirdDietQuestion(bird, rng) {
  const diet = classifyDiet(bird.diet)
  const distractors = uniqueDistractors(DIET_TYPES, diet, 3, rng)
  return {
    type: 'bird-diet',
    q: `What does ${article(bird.commonName)} ${bird.commonName} mostly eat?`,
    ...makeOptions(diet, distractors, rng),
  }
}

function buildBirdAfrikaansQuestion(bird, pool, rng) {
  const distractors = uniqueDistractors(pool.map((b) => b.afrikaansName), bird.afrikaansName, 3, rng)
  return {
    type: 'bird-afrikaans',
    q: `What is the Afrikaans name for the ${bird.commonName}?`,
    ...makeOptions(bird.afrikaansName, distractors, rng),
  }
}

// Pool-level (not about one species) — pick 4 birds with a parsable size and
// ask which is biggest, so it still lands as a normal 4-option question.
function buildBirdSizeQuestion(pool, rng) {
  const withSize = pool
    .map((b) => ({ bird: b, cm: parseSizeCm(b.size) }))
    .filter((entry) => entry.cm)
  const four = pickN(withSize, 4, rng)
  const biggest = four.reduce((a, b) => (b.cm > a.cm ? b : a))
  const options = seededShuffle(four.map((entry) => entry.bird.commonName), rng)
  return {
    type: 'bird-size',
    q: 'Which of these birds is the biggest?',
    options,
    answer: options.indexOf(biggest.bird.commonName),
  }
}

const BIRD_QUESTION_TYPES = {
  photo: {
    eligible: (b) => Boolean(b.imageUrl) && !b.imageUrl.includes('placehold'),
    build: (b, pool, rng) => buildBirdPhotoQuestion(b, pool, rng),
  },
  colour: {
    eligible: (b) => Boolean(extractBreastColour(b.colours)),
    build: (b, pool, rng) => buildBirdColourQuestion(b, rng),
  },
  sound: {
    eligible: (b) => Boolean(b.soundDescription || b.callDescription),
    build: (b, pool, rng) => buildBirdSoundQuestion(b, pool, rng),
  },
  truefalse: {
    eligible: (b) => Boolean(b.funFact),
    build: (b, pool, rng) => buildBirdTrueFalseQuestion(b, pool, rng),
  },
  habitat: {
    eligible: (b) => Boolean(classifyHabitat(b.habitat || b.region)),
    build: (b, pool, rng) => buildBirdHabitatQuestion(b, rng),
  },
  diet: {
    eligible: (b) => Boolean(classifyDiet(b.diet)),
    build: (b, pool, rng) => buildBirdDietQuestion(b, rng),
  },
  afrikaans: {
    eligible: (b) => Boolean(b.commonName && b.afrikaansName),
    build: (b, pool, rng) => buildBirdAfrikaansQuestion(b, pool, rng),
  },
}

function buildBirdQuizQuestions(pool, count, rng) {
  if (!pool.length) return []
  const perSpeciesTypes = Object.keys(BIRD_QUESTION_TYPES)
  const hasSizePool = pool.filter((b) => parseSizeCm(b.size)).length >= 4
  const typeOrder = seededShuffle(
    [...perSpeciesTypes, ...(hasSizePool ? ['size'] : [])],
    rng,
  )

  const questions = []
  const usedIds = new Set()
  let usedSize = false
  let cycles = 0
  while (questions.length < count && cycles < typeOrder.length * 4) {
    const type = typeOrder[cycles % typeOrder.length]
    cycles += 1

    if (type === 'size') {
      if (usedSize) continue
      usedSize = true
      questions.push(buildBirdSizeQuestion(pool, rng))
      continue
    }

    const def = BIRD_QUESTION_TYPES[type]
    const fresh = pool.filter((b) => def.eligible(b) && !usedIds.has(b.id))
    const candidates = fresh.length ? fresh : pool.filter(def.eligible)
    if (!candidates.length) continue
    const bird = pick(candidates, rng)
    usedIds.add(bird.id)
    questions.push(def.build(bird, pool, rng))
  }
  return questions.slice(0, count)
}

// ---- Plant question builders -------------------------------------------

function buildPlantPhotoQuestion(plant, pool, rng) {
  const distractors = uniqueDistractors(pool.map((p) => p.commonName), plant.commonName, 3, rng)
  return {
    type: 'plant-photo',
    q: 'Which plant is this?',
    photoPlantId: plant.id,
    ...makeOptions(plant.commonName, distractors, rng),
  }
}

function buildPlantTrueFalseQuestion(plant, pool, rng) {
  const isTrue = rng() < 0.5
  const others = pool.filter((p) => p.id !== plant.id && p.funFact)
  const fact = isTrue ? plant.funFact : (pick(others, rng) || plant).funFact
  return {
    type: 'plant-truefalse',
    q: `True or false — ${plant.commonName}: ${fact}`,
    options: ['True', 'False'],
    answer: isTrue ? 0 : 1,
  }
}

function buildPlantUseQuestion(plant, rng) {
  const use = classifyPlantUse(plant.funFact)
  const distractors = uniqueDistractors(PLANT_USE_TYPES, use, 3, rng)
  return {
    type: 'plant-use',
    q: `${plant.commonName} is traditionally used for...`,
    ...makeOptions(use, distractors, rng),
  }
}

function buildPlantColourQuestion(plant, rng) {
  const colour = extractFlowerColour(plant.funFact)
  const distractors = uniqueDistractors(CANONICAL_COLOURS.map(titleCase), colour, 3, rng)
  return {
    type: 'plant-colour',
    q: `What colour are ${plant.commonName} flowers?`,
    ...makeOptions(colour, distractors, rng),
  }
}

function buildPlantAfrikaansQuestion(plant, pool, rng) {
  const distractors = uniqueDistractors(pool.map((p) => p.afrikaansName), plant.afrikaansName, 3, rng)
  return {
    type: 'plant-afrikaans',
    q: `What is the Afrikaans name for the ${plant.commonName}?`,
    ...makeOptions(plant.afrikaansName, distractors, rng),
  }
}

// Pool-level — one real succulent among three non-succulents.
function buildPlantSucculentQuestion(pool, rng) {
  const succulents = pool.filter((p) => p.category === 'Succulents')
  const others = pool.filter((p) => p.category !== 'Succulents')
  const correct = pick(succulents, rng)
  const distractors = pickN(others, 3, rng).map((p) => p.commonName)
  return {
    type: 'plant-succulent',
    q: 'Which of these is a succulent?',
    ...makeOptions(correct.commonName, distractors, rng),
  }
}

const PLANT_QUESTION_TYPES = {
  photo: {
    eligible: (p) => Boolean(p.imageUrl) && !p.imageUrl.includes('placehold'),
    build: (p, pool, rng) => buildPlantPhotoQuestion(p, pool, rng),
  },
  truefalse: {
    eligible: (p) => Boolean(p.funFact),
    build: (p, pool, rng) => buildPlantTrueFalseQuestion(p, pool, rng),
  },
  use: {
    eligible: (p) => Boolean(classifyPlantUse(p.funFact)),
    build: (p, pool, rng) => buildPlantUseQuestion(p, rng),
  },
  colour: {
    eligible: (p) => Boolean(extractFlowerColour(p.funFact)),
    build: (p, pool, rng) => buildPlantColourQuestion(p, rng),
  },
  afrikaans: {
    eligible: (p) => Boolean(p.commonName && p.afrikaansName),
    build: (p, pool, rng) => buildPlantAfrikaansQuestion(p, pool, rng),
  },
}

function buildPlantQuizQuestions(pool, count, rng) {
  if (!pool.length) return []
  const perSpeciesTypes = Object.keys(PLANT_QUESTION_TYPES)
  const hasSucculentPool =
    pool.some((p) => p.category === 'Succulents') && pool.filter((p) => p.category !== 'Succulents').length >= 3
  const typeOrder = seededShuffle(
    [...perSpeciesTypes, ...(hasSucculentPool ? ['succulent'] : [])],
    rng,
  )

  const questions = []
  const usedIds = new Set()
  let usedSucculent = false
  let cycles = 0
  while (questions.length < count && cycles < typeOrder.length * 4) {
    const type = typeOrder[cycles % typeOrder.length]
    cycles += 1

    if (type === 'succulent') {
      if (usedSucculent) continue
      usedSucculent = true
      questions.push(buildPlantSucculentQuestion(pool, rng))
      continue
    }

    const def = PLANT_QUESTION_TYPES[type]
    const fresh = pool.filter((p) => def.eligible(p) && !usedIds.has(p.id))
    const candidates = fresh.length ? fresh : pool.filter(def.eligible)
    if (!candidates.length) continue
    const plant = pick(candidates, rng)
    usedIds.add(plant.id)
    questions.push(def.build(plant, pool, rng))
  }
  return questions.slice(0, count)
}

// ---- Public entry point -------------------------------------------------

// Builds the full weekly quiz: `birdCount` bird questions followed by
// `plantCount` plant questions (defaults 4 + 4 = 8), deterministically
// randomised from `weekKey` (the Sunday issue date, e.g. "2026-08-03") so
// everyone retaking the same week's quiz sees the same questions, but a new
// Sunday always reshuffles both the question types and the species asked
// about from the full library.
export function buildWeeklyQuiz({ weekKey, birdLibrary, plantLibrary, birdCount = 4, plantCount = 4 }) {
  const rng = mulberry32(hashStringToSeed(`weekly-quiz-${weekKey}`))
  const birdPool = (birdLibrary || []).filter((b) => b.commonName && b.id)
  const plantPool = (plantLibrary || []).filter((p) => p.commonName && p.id)
  const birdQuestions = buildBirdQuizQuestions(birdPool, birdCount, rng)
  const plantQuestions = buildPlantQuizQuestions(plantPool, plantCount, rng)
  return [...birdQuestions, ...plantQuestions]
}

// Score → fun verdict message, per the quiz's fixed 8-question scale.
export function quizVerdict(score, total = 8) {
  const ratio = total > 0 ? score / total : 0
  if (ratio >= 1) return '🏆 Perfect! Prof. Hadida is impressed!'
  if (ratio >= 0.75) return '🌟 Excellent fieldwork, Agent Pooks!'
  if (ratio >= 0.5) return '👍 Good effort — keep exploring!'
  return '📚 Time for a nature walk!'
}

// 2 coins per correct answer, capped at 16 (an 8-question quiz's max).
export function quizCoins(score) {
  return Math.max(0, Math.min(16, Math.round(score) * 2))
}

export const QUIZ_TEST_ONLY = {
  hashStringToSeed,
  mulberry32,
  extractBreastColour,
  extractFlowerColour,
  classifyHabitat,
  classifyDiet,
  classifyPlantUse,
  parseSizeCm,
}
