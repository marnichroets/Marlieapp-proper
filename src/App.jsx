import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultBirdLibrary } from './data/saBirdLibrary'

const STORAGE_KEY = 'marlie-bird-app-v1'
const INTRO_STORAGE_KEY = 'marlie-bird-intro-seen-v1'
const BIRD_API_URL = String(import.meta.env.VITE_BIRD_API_URL || '').replace(/\/+$/, '')
const OFFLINE_BIRD_COUNCIL_MESSAGE =
  'The Bird Council is practicing offline, so this is a demo result.'

const navItems = [
  ['home', 'Nest', '🏡'],
  ['add', 'Spot', '📷'],
  ['birds', 'Album', '🐦'],
  ['library', 'Bird Book', '📖'],
  ['magazine', 'Weekly', '📰'],
  ['rewards', 'Gifts', '🎁'],
  ['date', 'Date', '💕'],
  ['profile', 'Pooks', '🪶'],
  ['admin', 'Admin', '🔒'],
]

const nicknameIdeas = {
  hadeda: 'Screaming Dinosaur',
  pigeon: 'Pavement CEO',
  weaver: 'Tiny Architect',
  duck: 'Floating Gentleman',
  'cape robin-chat': 'Fence Princess',
}

const personalityComments = {
  hadeda: 'Loud. Dramatic. Absolutely no respect for sleeping people.',
  'cape robin-chat': 'Small, pretty, and probably knows it.',
  pigeon: 'Common, confident, and always walking like it owns the place.',
  weaver: 'Tiny architect of the bird world.',
  duck: 'Floating gentleman behaviour detected.',
}

const councilMessages = [
  'The Bird Council has reviewed your sighting and approves.',
  'The Bird Council awards this behaviour with great seriousness.',
  'The Bird Council is impressed, but slightly concerned by your dedication.',
  'The bird community has been informed.',
  'This sighting has been officially certified as cute.',
  'The Bird Council has no choice but to reward this behaviour.',
  'A tiny stamp has been placed on the official bird paperwork.',
]

const loadingMessages = [
  'Consulting the Bird Council...',
  'Looking for feathers...',
  'Asking the nearest pigeon...',
  'Checking if this is a bird or a suspicious leaf...',
  'Almost done. The bird is being dramatic.',
]

const mockAiBirdMatches = [
  {
    commonName: 'Cape Robin-Chat',
    afrikaansName: 'Gewone Janfrederik',
    scientificName: 'Cossypha caffra',
    confidence: 91,
    whyThisBird:
      'The warm orange chest, upright posture and garden setting point strongly to a Cape Robin-Chat.',
    habitat: 'Leafy gardens, forest edges, thickets and quiet suburban corners.',
    diet: 'Insects, small invertebrates, fruit and tiny snacks found while hopping around.',
    whereFoundInSouthAfrica:
      'Common across much of South Africa, especially in gardens and wooded places.',
    funFacts: [
      'It often sings from a hidden perch before stepping into view.',
      'Pairs can become regular garden visitors when the habitat feels safe.',
    ],
    cutePersonalityLine: 'Tiny garden soloist with very serious main-character energy.',
    soundDescription: 'A rich, melodic series of whistles and chatty phrases.',
    similarBirds: ['Karoo Scrub-Robin', 'White-browed Robin-Chat'],
  },
  {
    commonName: 'Hadeda Ibis',
    afrikaansName: 'Hadeda',
    scientificName: 'Bostrychia hagedash',
    confidence: 78,
    whyThisBird:
      'The long curved bill, grey-brown body and glossy wing sheen match a Hadeda Ibis.',
    habitat: 'Lawns, parks, wetlands, sports fields and rooftops after rain.',
    diet: 'Earthworms, insects and other small creatures pulled from damp soil.',
    whereFoundInSouthAfrica:
      'Widespread in South Africa, especially around towns, gardens and wet grassy areas.',
    funFacts: [
      'Its loud call is one of the classic South African morning sounds.',
      'The glossy wing patch can flash green and purple in sunlight.',
    ],
    cutePersonalityLine: 'A dramatic neighbourhood announcer with zero indoor voice.',
    soundDescription: 'A loud, nasal haa-haa-haa call, often while flying.',
    similarBirds: ['African Sacred Ibis', 'Glossy Ibis'],
  },
  {
    commonName: 'Southern Masked Weaver',
    afrikaansName: 'Swartkeelgeelvink',
    scientificName: 'Ploceus velatus',
    confidence: 64,
    whyThisBird:
      'Yellow plumage, compact shape and possible garden or reed habitat suggest a Southern Masked Weaver.',
    habitat: 'Gardens, reeds, grassland, savanna and trees near water.',
    diet: 'Seeds, insects, nectar and soft fruit depending on the season.',
    whereFoundInSouthAfrica:
      'Found across most of South Africa wherever suitable nesting trees and food occur.',
    funFacts: [
      'Males weave detailed hanging nests to impress females.',
      'A rejected nest may be stripped apart and rebuilt with impressive commitment.',
    ],
    cutePersonalityLine: 'Tiny architect with bright feathers and a strict building code.',
    soundDescription: 'Busy chattering and scratchy calls from trees or reeds.',
    similarBirds: ['Village Weaver', 'Cape Weaver'],
  },
]

const levels = [
  { birds: 0, title: 'Future Bird Girl' },
  { birds: 1, title: 'First Feather' },
  { birds: 5, title: 'Baby Birder' },
  { birds: 10, title: 'Feather Finder' },
  { birds: 20, title: 'Garden Explorer' },
  { birds: 50, title: 'Bird Queen' },
  { birds: 100, title: 'Legendary Bird Queen' },
]

const badgeDefinitions = [
  {
    id: 'first-feather',
    name: 'First Feather',
    detail: 'First bird spotted',
    test: ({ uniqueCount }) => uniqueCount >= 1,
  },
  {
    id: 'tiny-expert',
    name: 'Tiny Expert',
    detail: 'Five unique birds spotted',
    test: ({ uniqueCount }) => uniqueCount >= 5,
  },
  {
    id: 'feather-finder',
    name: 'Feather Finder',
    detail: 'Ten unique birds spotted',
    test: ({ uniqueCount }) => uniqueCount >= 10,
  },
  {
    id: 'garden-queen',
    name: 'Garden Queen',
    detail: 'Five garden sightings',
    test: ({ state }) =>
      state.sightings.filter((sighting) =>
        sighting.location?.toLowerCase().includes('garden'),
      ).length >= 5,
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    detail: 'A bird spotted before 08:00',
    test: ({ state }) =>
      state.sightings.some((sighting) => parseTime(sighting.timeSpotted) < 8),
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    detail: 'A bird spotted after 18:00',
    test: ({ state }) =>
      state.sightings.some((sighting) => parseTime(sighting.timeSpotted) >= 18),
  },
  {
    id: 'sound-detective',
    name: 'Sound Detective',
    detail: 'Future sound feature placeholder',
    test: ({ state }) => Boolean(state.settings.soundDetectiveUnlocked),
  },
  {
    id: 'photo-pro',
    name: 'Photo Pro',
    detail: 'Ten bird entries logged',
    test: ({ state }) => state.sightings.length >= 10,
  },
  {
    id: 'bird-date',
    name: 'Bird Date',
    detail: 'A bird moment with Marnich',
    test: ({ state }) =>
      state.sightings.some((sighting) => sighting.seenWithMarnich) ||
      state.dateMemories.length > 0,
  },
  {
    id: 'rare-beauty',
    name: 'Rare Beauty',
    detail: 'Manually mark a special bird later',
    test: ({ state }) => Boolean(state.settings.rareBeautyUnlocked),
  },
  {
    id: 'council-favourite',
    name: 'Bird Council Favourite',
    detail: 'Three favourites added',
    test: ({ state }) =>
      state.sightings.filter((sighting) => sighting.favorite).length >= 3,
  },
  {
    id: 'escaped-bird-survivor',
    name: 'Escaped Bird Survivor',
    detail: 'First missed sighting recorded',
    test: ({ state }) => state.missedSightings.length >= 1,
  },
]

const milestoneRewards = [
  {
    id: 'first-feather-celebration',
    name: 'First Feather Celebration',
    milestone: 1,
    unlockReason: 'Marlie spotted her first bird.',
    reference: 'FIRST-FEATHER-LEVEL',
  },
  {
    id: 'snack-from-marnich',
    name: 'Snack from Marnich',
    milestone: 5,
    unlockReason: 'Five unique birds have entered the official records.',
    reference: 'SNACK-APPROVAL-005',
  },
  {
    id: 'r50-from-marnich',
    name: 'R50 from Marnich',
    milestone: 10,
    unlockReason: 'Ten birds means professional bird spotter behaviour.',
    reference: 'R50-BIRD-SPOTTER-010',
  },
  {
    id: 'coffee-date',
    name: 'Coffee date',
    milestone: 20,
    unlockReason: 'Twenty birds deserves coffee and admiration.',
    reference: 'COFFEE-DATE-020',
  },
  {
    id: 'ice-cream-date',
    name: 'Ice cream date',
    milestone: 25,
    unlockReason: 'Twenty-five birds unlocks frozen celebration rights.',
    reference: 'ICE-CREAM-025',
  },
  {
    id: 'surprise-date',
    name: 'Surprise date',
    milestone: 50,
    unlockReason: 'Fifty birds is Bird Queen territory.',
    reference: 'SURPRISE-DATE-050',
  },
  {
    id: 'legendary-gift',
    name: 'Legendary Bird Queen gift',
    milestone: 100,
    unlockReason: 'One hundred birds unlocks legendary gift status.',
    reference: 'LEGENDARY-QUEEN-100',
  },
  {
    id: 'featherlove-surprise',
    name: 'Secret Feather Love Reward',
    milestone: null,
    unlockReason: 'Unlocked by secret code FEATHERLOVE.',
    reference: 'FEATHER-LOVE-SECRET',
    lockedByDefault: true,
  },
  {
    id: 'datewalk-reward',
    name: 'Secret Bird Walk Reward',
    milestone: null,
    unlockReason: 'Unlocked by secret code DATEWALK.',
    reference: 'DATE-WALK-SECRET',
    lockedByDefault: true,
  },
]

const shopItems = [
  { id: 'snack-voucher-20', name: 'R20 snack voucher', cost: 150 },
  { id: 'cash-reward-50', name: 'R50 cash reward', cost: 300 },
  { id: 'coffee-date-shop', name: 'Coffee date', cost: 500 },
  { id: 'ice-cream-date-shop', name: 'Ice cream date', cost: 600 },
  { id: 'movie-night', name: 'Movie night', cost: 1000 },
  { id: 'surprise-from-marnich', name: 'Surprise from Marnich', cost: 1500 },
  { id: 'choose-next-date', name: 'Choose our next date', cost: 2000 },
]

const defaultChallengeTexts = [
  'Spot a bird with yellow on it',
  'Spot 3 birds in one day',
  'Hear a bird before seeing it',
  'Spot a bird while drinking coffee',
  'Spot a bird with Marnich',
  'Find a bird you have never seen before',
  'Spot a bird on a roof',
  'Spot a bird near water',
  'Spot a loud bird',
  'Spot a tiny bird',
  'Take a clear bird photo',
]

const defaultMagazineIssue = {
  monthlyChallenge: 'Try to spot one of this week’s birds.',
  birdDateIdea: 'Take a slow coffee walk and choose one bird to be the official date mascot.',
  marnichMessage:
    'This week’s feather issue is ready. I hope it makes your next bird moment feel a little more magical.',
  rewardHint: 'A tiny surprise is waiting behind the next bird.',
}

const hiddenNoteTemplates = [
  {
    id: 'note-1',
    milestone: 1,
    title: 'The Beginning',
    message:
      'Your bird journey officially started. I made this because seeing you excited about birds became one of my favourite things.',
  },
  {
    id: 'note-5',
    milestone: 5,
    title: 'Small Beautiful Things',
    message:
      'I love how you notice small beautiful things that other people walk past.',
  },
  {
    id: 'note-10',
    milestone: 10,
    title: 'Professional Bird Spotter',
    message:
      'You unlocked your first proper reward. R50 incoming because my girlfriend is now basically a professional bird spotter.',
  },
  {
    id: 'note-20',
    milestone: 20,
    title: 'Sneaky Smile Project',
    message:
      'This started as a bird app, but it is actually a sneaky way to make you smile.',
  },
  {
    id: 'note-50',
    milestone: 50,
    title: 'My Favourite Person',
    message:
      'You are my favourite person to build silly little things for.',
  },
  {
    id: 'note-100',
    milestone: 100,
    title: 'Legendary Bird Queen',
    message:
      'Legendary Bird Queen status unlocked. I hope this app always reminds you how much I love seeing you happy.',
  },
  {
    id: 'note-birdqueen',
    milestone: null,
    title: 'Secret Bird Queen Note',
    message:
      'Secret code accepted. The Bird Council confirms that you are adored beyond normal administrative limits.',
    lockedByDefault: true,
  },
]

const defaultSecretCodes = [
  {
    code: 'ROBIN50',
    type: 'feather',
    amount: 50,
    label: '+50 Feather Coins',
    redeemed: false,
  },
  {
    code: 'BIRDQUEEN',
    type: 'note',
    noteId: 'note-birdqueen',
    label: 'Unlock special note',
    redeemed: false,
  },
  {
    code: 'FEATHERLOVE',
    type: 'reward',
    rewardId: 'featherlove-surprise',
    label: 'Unlock surprise reward',
    redeemed: false,
  },
  {
    code: 'HADEDA',
    type: 'pity',
    amount: 25,
    label: '+25 Pity Coins',
    redeemed: false,
  },
  {
    code: 'DATEWALK',
    type: 'reward',
    rewardId: 'datewalk-reward',
    label: 'Unlock bird date reward',
    redeemed: false,
  },
]

const bingoSquares = [
  'Spot a bird on a roof',
  'Spot a bird near water',
  'Hear a bird before seeing it',
  'Spot a yellow bird',
  'Spot a bird with Marnich',
  'See 2 birds together',
  'Take a clear photo',
  'Spot a loud bird',
  'Spot a bird eating',
]

const bingoRows = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const gotAwayStatuses = [
  'Escaped justice',
  'Too fast',
  'Camera shy',
  'Probably imaginary',
  'Marnich believes you',
]

const dateMissions = [
  'Go for a 20-minute walk together and try to spot 3 birds.',
  'Coffee and bird spotting: find 2 birds while having coffee.',
  'Sunset bird search: spot one bird before sunset.',
  'Garden bird breakfast: spot one bird in the morning.',
  'Picnic bird bingo: complete one bingo square together.',
]

const futureFeatures = [
  'Bird sound playback and later sound recognition.',
  'Postmark daily emails from a backend scheduler.',
  'Marnich voice narrator clips with mute and unmute.',
  'Supabase users, birds, sightings, rewards, challenges, notes and secret codes.',
  'Vercel deployment once the local frontend is polished.',
]

const moodOptions = [
  'Excited',
  'Peaceful',
  'Suspicious',
  'Romantic',
  'Competitive',
  'Dramatic',
]

const libraryFilters = [
  'All',
  'Seen',
  'Not seen',
  'Garden birds',
  'Water birds',
  'Birds of prey',
  'Colourful birds',
  'Noisy birds',
]

function normalizeBirdName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function todayValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeAiText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeAiList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeAiText).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|;|,/)
      .map(normalizeAiText)
      .filter(Boolean)
  }

  return []
}

function normalizeConfidence(value) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function normalizeAiMatch(match = {}) {
  return {
    commonName: normalizeAiText(match.commonName || match.common_name || match.name),
    afrikaansName: normalizeAiText(match.afrikaansName || match.afrikaans_name),
    scientificName: normalizeAiText(match.scientificName || match.scientific_name),
    confidence: normalizeConfidence(match.confidence),
    whyThisBird: normalizeAiText(match.whyThisBird || match.why_this_bird || match.reason),
    funFacts: normalizeAiList(match.funFacts || match.fun_facts),
    habitat: normalizeAiText(match.habitat),
    diet: normalizeAiText(match.diet),
    colours: normalizeAiText(match.colours || match.colors),
    size: normalizeAiText(match.size),
    whereFoundInSouthAfrica: normalizeAiText(
      match.whereFoundInSouthAfrica || match.where_found_in_south_africa || match.region,
    ),
    cutePersonalityLine: normalizeAiText(
      match.cutePersonalityLine || match.cute_personality_line || match.personality,
    ),
    soundDescription: normalizeAiText(
      match.soundDescription || match.sound_description || match.sound,
    ),
    similarBirds: normalizeAiList(match.similarBirds || match.similar_birds),
  }
}

function normalizeAiIdentificationResponse(payload) {
  const rawMatches = Array.isArray(payload)
    ? payload
    : payload?.topMatches || payload?.matches || payload?.results || payload?.birds || []
  const matchList = Array.isArray(rawMatches) ? rawMatches : []

  return {
    uncertain: Boolean(payload?.uncertain),
    matches: matchList
      .slice(0, 3)
      .map((match) => normalizeAiMatch(match))
      .filter((match) => match.commonName),
  }
}

function formatConfidence(value) {
  return value ? `${value}% confidence` : 'Confidence unknown'
}

function getBirdLibraryId(name) {
  return (
    normalizeBirdName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bird'
  )
}

function getFunFacts(value) {
  return Array.isArray(value) ? value.filter(Boolean) : normalizeAiList(value)
}

function getEarliestDate(firstDate, nextDate) {
  if (!firstDate) return nextDate || ''
  if (!nextDate) return firstDate
  return nextDate < firstDate ? nextDate : firstDate
}

function getLatestDate(lastDate, nextDate) {
  if (!lastDate) return nextDate || ''
  if (!nextDate) return lastDate
  return nextDate > lastDate ? nextDate : lastDate
}

function getBirdLibraryMatchIndex(library, { commonName, scientificName }) {
  const commonKey = normalizeBirdName(commonName)
  const scientificKey = normalizeBirdName(scientificName)
  const commonIndex = library.findIndex(
    (bird) => normalizeBirdName(bird.commonName) === commonKey,
  )

  if (commonIndex >= 0) return commonIndex
  if (!scientificKey) return -1

  return library.findIndex(
    (bird) => normalizeBirdName(bird.scientificName) === scientificKey,
  )
}

function buildSightingPhotoRecord(sighting, aiMatch) {
  return {
    id: sighting.id,
    photo: sighting.photo || '',
    date: sighting.dateSpotted,
    location: sighting.location,
    notes: sighting.notes,
    birdCouncilReason: aiMatch?.whyThisBird || '',
  }
}

function mergeSightingPhoto(existingPhotos = [], photoRecord) {
  if (!photoRecord.photo) return existingPhotos
  const withoutDuplicate = existingPhotos.filter((photo) => photo.id !== photoRecord.id)
  return [photoRecord, ...withoutDuplicate].slice(0, 12)
}

function mergeBirdLibrarySeenData(bird, sighting, aiMatch) {
  const funFacts = getFunFacts(bird.funFacts?.length ? bird.funFacts : aiMatch?.funFacts)
  const region = aiMatch?.whereFoundInSouthAfrica || aiMatch?.habitat || bird.region || ''
  const description =
    bird.description || aiMatch?.cutePersonalityLine || aiMatch?.whyThisBird || sighting.notes || ''
  const photoRecord = buildSightingPhotoRecord(sighting, aiMatch)

  return {
    ...bird,
    afrikaansName: bird.afrikaansName || aiMatch?.afrikaansName || '',
    scientificName: bird.scientificName || aiMatch?.scientificName || '',
    region,
    habitat: bird.habitat || aiMatch?.habitat || '',
    diet: bird.diet || aiMatch?.diet || '',
    colours: bird.colours || aiMatch?.colours || '',
    size: bird.size || aiMatch?.size || '',
    whereFoundInSouthAfrica: bird.whereFoundInSouthAfrica || region,
    description,
    funFacts,
    funFact: bird.funFact || funFacts[0] || '',
    soundDescription: bird.soundDescription || aiMatch?.soundDescription || '',
    aiDetails: aiMatch || bird.aiDetails || null,
    birdCouncilReason: aiMatch?.whyThisBird || bird.birdCouncilReason || '',
    seen: true,
    seenAt: bird.seenAt || sighting.dateSpotted,
    firstSeenDate: getEarliestDate(bird.firstSeenDate || bird.seenAt, sighting.dateSpotted),
    lastSeenDate: getLatestDate(bird.lastSeenDate || bird.lastSeen, sighting.dateSpotted),
    timesSeen: Number(bird.timesSeen || 0) + 1,
    herPhotos: mergeSightingPhoto(bird.herPhotos, photoRecord),
  }
}

function upsertBirdLibraryFromSighting(library, sighting) {
  if (!sighting?.birdName) return library

  const aiMatch = sighting.aiMatch ? normalizeAiMatch(sighting.aiMatch) : null
  const commonName = aiMatch?.commonName || sighting.birdName
  const scientificName = aiMatch?.scientificName || ''
  const existingIndex = getBirdLibraryMatchIndex(library, { commonName, scientificName })

  if (existingIndex >= 0) {
    return library.map((bird, index) =>
      index === existingIndex ? mergeBirdLibrarySeenData(bird, sighting, aiMatch) : bird,
    )
  }

  const funFacts = getFunFacts(aiMatch?.funFacts)
  const region = aiMatch?.whereFoundInSouthAfrica || aiMatch?.habitat || sighting.location || ''
  return [
    ...library,
    mergeBirdLibrarySeenData(
      {
        id: `ai-${getBirdLibraryId(commonName)}-${Date.now()}`,
        commonName,
        afrikaansName: aiMatch?.afrikaansName || '',
        scientificName,
        category: aiMatch ? 'Custom AI bird' : 'Custom bird',
        tags: ['Garden birds'],
        region,
        habitat: aiMatch?.habitat || '',
        diet: aiMatch?.diet || '',
        colours: aiMatch?.colours || '',
        size: aiMatch?.size || '',
        whereFoundInSouthAfrica: region,
        description: aiMatch?.cutePersonalityLine || aiMatch?.whyThisBird || sighting.notes || '',
        funFact: funFacts[0] || '',
        funFacts,
        soundDescription: aiMatch?.soundDescription || '',
        imageUrl: '',
        soundUrl: '',
        rarity: aiMatch ? 'AI discovered' : 'Custom',
        featuredInMagazine: false,
        seen: false,
        firstSeenDate: '',
        lastSeenDate: '',
        timesSeen: 0,
        herPhotos: [],
        aiDetails: null,
        birdCouncilReason: '',
      },
      sighting,
      aiMatch,
    ),
  ]
}

function normalizeLibraryBird(bird) {
  const funFacts = getFunFacts(bird.funFacts?.length ? bird.funFacts : bird.funFact)
  const firstSeenDate = bird.firstSeenDate || bird.seenAt || ''
  const lastSeenDate = bird.lastSeenDate || bird.lastSeen || firstSeenDate

  return {
    tags: [],
    habitat: '',
    diet: '',
    colours: '',
    size: '',
    soundDescription: '',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
    seen: Boolean(bird.seen || firstSeenDate),
    firstSeenDate,
    lastSeenDate,
    timesSeen: Number(bird.timesSeen || (bird.seen || firstSeenDate ? 1 : 0)),
    herPhotos: [],
    aiDetails: null,
    birdCouncilReason: '',
    ...bird,
    funFacts,
    funFact: bird.funFact || funFacts[0] || '',
    whereFoundInSouthAfrica: bird.whereFoundInSouthAfrica || bird.region || '',
  }
}

function normalizeBirdLibrary(library) {
  return library.map(normalizeLibraryBird)
}

function resetLibrarySeenProgress(library) {
  return library.map((bird) => ({
    ...bird,
    seen: false,
    seenAt: '',
    firstSeenDate: '',
    lastSeenDate: '',
    timesSeen: 0,
    herPhotos: [],
    aiDetails: null,
    birdCouncilReason: '',
  }))
}

function getSightingsForLibraryBird(data, bird) {
  const commonKey = normalizeBirdName(bird?.commonName)
  const scientificKey = normalizeBirdName(bird?.scientificName)

  return data.sightings.filter((sighting) => {
    const sightingCommon = normalizeBirdName(sighting.birdName)
    const aiCommon = normalizeBirdName(sighting.aiMatch?.commonName)
    const aiScientific = normalizeBirdName(sighting.aiMatch?.scientificName)
    return (
      sightingCommon === commonKey ||
      aiCommon === commonKey ||
      (scientificKey && aiScientific === scientificKey)
    )
  })
}

function getLibraryBirdForMemory(birdLibrary, birdName, aiMatch) {
  const match = aiMatch ? normalizeAiMatch(aiMatch) : null
  const index = getBirdLibraryMatchIndex(birdLibrary, {
    commonName: match?.commonName || birdName,
    scientificName: match?.scientificName || '',
  })

  return index >= 0 ? birdLibrary[index] : null
}

function parseTime(time) {
  if (!time) return Number.NaN
  const [hours] = time.split(':').map(Number)
  return Number.isFinite(hours) ? hours : Number.NaN
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function sameMonth(value, date = new Date()) {
  if (!value) return false
  const parsed = new Date(`${value}T12:00:00`)
  return (
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth()
  )
}

function getIsoWeekInfo(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)

  return {
    year: target.getUTCFullYear(),
    week,
  }
}

function getAbsoluteWeekIndex(date = new Date()) {
  const start = Date.UTC(2024, 0, 1)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current - start) / 604800000)
}

function selectRotatingBirds(birds, count, startIndex, excludedId = '') {
  if (!birds.length) return []

  const selected = []
  for (let offset = 0; selected.length < Math.min(count, birds.length) && offset < birds.length; offset += 1) {
    const bird = birds[(startIndex + offset) % birds.length]
    if (bird.id !== excludedId) selected.push(bird)
  }

  return selected
}

function getWeeklyMagazineIssue(birdLibrary, settings = {}, date = new Date()) {
  const library = [...birdLibrary].sort((a, b) => a.commonName.localeCompare(b.commonName))
  const weekInfo = getIsoWeekInfo(date)
  const weekIndex = getAbsoluteWeekIndex(date)
  const startIndex = library.length ? (weekIndex * 5) % library.length : 0
  const pinnedBird =
    library.find((bird) => bird.id === settings.pinnedBirdOfWeekId) || null
  const rotatingBirds = selectRotatingBirds(library, pinnedBird ? 4 : 5, startIndex, pinnedBird?.id)
  const featuredBirds = pinnedBird ? [pinnedBird, ...rotatingBirds] : rotatingBirds

  return {
    ...weekInfo,
    featuredBirds,
    birdOfWeek: pinnedBird || featuredBirds[0] || null,
  }
}

function getCurrentLevel(uniqueCount) {
  return levels.reduce((current, level) => {
    return uniqueCount >= level.birds ? level : current
  }, levels[0])
}

function getNextLevel(uniqueCount) {
  return levels.find((level) => level.birds > uniqueCount) || null
}

function getCouncilMessage(seed = 0) {
  return councilMessages[Math.abs(seed) % councilMessages.length]
}

function getDateSeed(value = todayValue()) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getDailyChallenge(challenges, date = todayValue(), offset = 0) {
  const pool = challenges.length ? challenges : buildDefaultState().challenges
  const index = Math.abs(getDateSeed(date) + offset) % pool.length
  return pool[index]
}

function getCompletionForDate(state, date = todayValue()) {
  return state.dailyChallengeCompletions?.[date] || {}
}

function getBirdPhotoPlaceholderLabel(name) {
  return (name || 'Bird')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

function buildDefaultState() {
  return {
    birds: [],
    sightings: [],
    featherCoins: 0,
    pityCoins: 0,
    rewards: milestoneRewards.map((reward) => ({
      ...reward,
      status: reward.lockedByDefault ? 'Locked' : 'Locked',
      unlockedAt: null,
      claimedAt: null,
      paidAt: null,
    })),
    shopRedemptions: [],
    challenges: defaultChallengeTexts.map((text, index) => ({
      id: `challenge-${index + 1}`,
      text,
      cadence: index % 3 === 0 ? 'Weekly' : 'Daily',
      completed: false,
      completedAt: null,
    })),
    badges: [],
    hiddenNotes: hiddenNoteTemplates.map((note) => ({
      ...note,
      unlocked: false,
      unlockedAt: null,
    })),
    missedSightings: [],
    secretCodes: defaultSecretCodes,
    bingo: {
      squares: bingoSquares.map((text, index) => ({
        id: `bingo-${index}`,
        text,
        checked: false,
      })),
      completedRows: [],
    },
    monthlyReportData: {
      favouriteMemory: '',
      marnichNote: 'I loved seeing you enjoy this.',
    },
    dailyChallengeCompletions: {},
    birdLibrary: normalizeBirdLibrary(defaultBirdLibrary),
    magazineIssue: defaultMagazineIssue,
    settings: {
      birdCrush: '',
      alerts: [],
      currentDateMission: dateMissions[0],
      rareBeautyUnlocked: false,
      soundDetectiveUnlocked: false,
      secretCodesVisible: false,
      pinnedBirdOfWeekId: '',
    },
    dateMemories: [],
    rewardCertificates: [],
  }
}

function mergeByKey(defaultItems, savedItems, key) {
  const saved = Array.isArray(savedItems) ? savedItems : []
  const savedMap = new Map(saved.map((item) => [item[key], item]))
  const merged = defaultItems.map((item) => ({
    ...item,
    ...(savedMap.get(item[key]) || {}),
  }))
  const defaultKeys = new Set(defaultItems.map((item) => item[key]))
  return [
    ...merged,
    ...saved.filter((item) => !defaultKeys.has(item[key])),
  ]
}

function loadState() {
  const base = buildDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    return recalculateState({
      ...base,
      ...saved,
      birds: Array.isArray(saved.birds) ? saved.birds : base.birds,
      sightings: Array.isArray(saved.sightings) ? saved.sightings : base.sightings,
      rewards: mergeByKey(base.rewards, saved.rewards, 'id'),
      challenges: mergeByKey(base.challenges, saved.challenges, 'id'),
      hiddenNotes: mergeByKey(base.hiddenNotes, saved.hiddenNotes, 'id'),
      secretCodes: mergeByKey(base.secretCodes, saved.secretCodes, 'code'),
      shopRedemptions: Array.isArray(saved.shopRedemptions)
        ? saved.shopRedemptions
        : base.shopRedemptions,
      missedSightings: Array.isArray(saved.missedSightings)
        ? saved.missedSightings
        : base.missedSightings,
      dateMemories: Array.isArray(saved.dateMemories)
        ? saved.dateMemories
        : base.dateMemories,
      rewardCertificates: Array.isArray(saved.rewardCertificates)
        ? saved.rewardCertificates
        : base.rewardCertificates,
      dailyChallengeCompletions:
        saved.dailyChallengeCompletions &&
        typeof saved.dailyChallengeCompletions === 'object'
          ? saved.dailyChallengeCompletions
          : base.dailyChallengeCompletions,
      birdLibrary: normalizeBirdLibrary(mergeByKey(base.birdLibrary, saved.birdLibrary, 'id')),
      magazineIssue: {
        ...base.magazineIssue,
        ...(saved.magazineIssue || {}),
      },
      bingo: {
        ...base.bingo,
        ...(saved.bingo || {}),
        squares: mergeByKey(base.bingo.squares, saved.bingo?.squares, 'id'),
        completedRows: Array.isArray(saved.bingo?.completedRows)
          ? saved.bingo.completedRows
          : base.bingo.completedRows,
      },
      settings: {
        ...base.settings,
        ...(saved.settings || {}),
      },
      monthlyReportData: {
        ...base.monthlyReportData,
        ...(saved.monthlyReportData || {}),
      },
    })
  } catch (error) {
    console.warn('Could not load Marlie Bird App data', error)
    return base
  }
}

function makeCertificate(reward) {
  return {
    id: `cert-${reward.id}`,
    rewardId: reward.id,
    rewardName: reward.name,
    unlockReason: reward.unlockReason,
    date: todayValue(),
    reference: reward.reference,
    status: reward.status,
  }
}

function recalculateState(state) {
  const uniqueCount = state.birds.length
  const badgeIds = new Set(state.badges || [])

  badgeDefinitions.forEach((badge) => {
    if (badge.test({ state, uniqueCount })) {
      badgeIds.add(badge.id)
    }
  })

  const certificates = [...(state.rewardCertificates || [])]
  const rewards = state.rewards.map((reward) => {
    const shouldUnlock =
      reward.milestone !== null &&
      reward.milestone !== undefined &&
      uniqueCount >= reward.milestone

    if (shouldUnlock && reward.status === 'Locked') {
      const unlockedReward = {
        ...reward,
        status: 'Unlocked',
        unlockedAt: todayValue(),
      }
      if (!certificates.some((cert) => cert.rewardId === reward.id)) {
        certificates.push(makeCertificate(unlockedReward))
      }
      return unlockedReward
    }
    return reward
  })

  const hiddenNotes = state.hiddenNotes.map((note) => {
    const shouldUnlock =
      note.milestone !== null &&
      note.milestone !== undefined &&
      uniqueCount >= note.milestone
    if (shouldUnlock && !note.unlocked) {
      return { ...note, unlocked: true, unlockedAt: todayValue() }
    }
    return note
  })

  return {
    ...state,
    rewards,
    badges: [...badgeIds],
    hiddenNotes,
    rewardCertificates: certificates,
  }
}

function getUnlockSummary(previous, next) {
  const oldBadges = new Set(previous.badges || [])
  const newBadges = next.badges
    .filter((badgeId) => !oldBadges.has(badgeId))
    .map((badgeId) => badgeDefinitions.find((badge) => badge.id === badgeId)?.name)
    .filter(Boolean)

  const newRewards = getNewlyUnlockedRewards(previous, next)

  const parts = []
  if (newBadges.length) parts.push(`Badge unlocked: ${newBadges.join(', ')}`)
  if (newRewards.length) {
    parts.push(
      `Reward unlocked! Your sponsor has been notified: ${newRewards
        .map((reward) => reward.name)
        .join(', ')}`,
    )
  }
  return parts.join(' ')
}

function getNewlyUnlockedRewards(previous, next) {
  return next.rewards.filter((reward) => {
    const oldReward = previous.rewards.find((item) => item.id === reward.id)
    return oldReward?.status === 'Locked' && reward.status === 'Unlocked'
  })
}

function buildBirdRecords(sightings) {
  const records = new Map()

  sightings.forEach((sighting) => {
    const key = sighting.speciesKey
    const existing = records.get(key)
    if (!existing) {
      records.set(key, {
        id: key,
        birdName: sighting.birdName,
        nickname: sighting.nickname,
        count: 1,
        firstSeen: sighting.dateSpotted,
        lastSeen: sighting.dateSpotted,
        location: sighting.location,
        favorite: sighting.favorite,
        seenWithMarnich: sighting.seenWithMarnich,
        notes: sighting.notes,
        photo: sighting.photo,
        featherCoinsEarned: sighting.coinsEarned,
        aiMatch: sighting.aiMatch || null,
      })
      return
    }

    const first =
      sighting.dateSpotted < existing.firstSeen ? sighting.dateSpotted : existing.firstSeen
    const last =
      sighting.dateSpotted > existing.lastSeen ? sighting.dateSpotted : existing.lastSeen

    records.set(key, {
      ...existing,
      nickname: sighting.nickname || existing.nickname,
      count: existing.count + 1,
      firstSeen: first,
      lastSeen: last,
      location: sighting.location || existing.location,
      favorite: existing.favorite || sighting.favorite,
      seenWithMarnich: existing.seenWithMarnich || sighting.seenWithMarnich,
      notes: sighting.notes || existing.notes,
      photo: sighting.photo || existing.photo,
      featherCoinsEarned: existing.featherCoinsEarned + sighting.coinsEarned,
      aiMatch: sighting.aiMatch || existing.aiMatch || null,
    })
  })

  return [...records.values()].sort((a, b) => a.birdName.localeCompare(b.birdName))
}

function App() {
  const [activePage, setActivePage] = useState('home')
  const [data, setData] = useState(loadState)
  const [toast, setToast] = useState(null)
  const [showIntro, setShowIntro] = useState(
    () => localStorage.getItem(INTRO_STORAGE_KEY) !== 'seen',
  )
  const [rewardUnlockQueue, setRewardUnlockQueue] = useState([])
  const [missedDraft, setMissedDraft] = useState({ location: '', note: '' })
  const [showMissedQuickForm, setShowMissedQuickForm] = useState(false)
  const [birdProfile, setBirdProfile] = useState(null)

  const stats = useMemo(() => {
    const uniqueCount = data.birds.length
    const currentLevel = getCurrentLevel(uniqueCount)
    const nextLevel = getNextLevel(uniqueCount)
    const nextReward =
      data.rewards
        .filter((reward) => reward.status === 'Locked' && reward.milestone)
        .sort((a, b) => a.milestone - b.milestone)[0] || null
    const progressTarget = nextReward?.milestone || nextLevel?.birds || uniqueCount || 1
    const progressValue = Math.min(100, Math.round((uniqueCount / progressTarget) * 100))
    const recentSighting = [...data.sightings].reverse()[0] || null
    const currentMonthSightings = data.sightings.filter((sighting) =>
      sameMonth(sighting.dateSpotted),
    )
    const newSpeciesThisMonth = data.birds.filter((bird) => sameMonth(bird.firstSeen))
    const monthlyRewards = data.rewardCertificates.filter((certificate) =>
      sameMonth(certificate.date),
    )
    const monthlyChallenges = data.challenges.filter((challenge) =>
      sameMonth(challenge.completedAt),
    )

    return {
      uniqueCount,
      totalSightings: data.sightings.length,
      currentLevel,
      nextLevel,
      nextReward,
      progressTarget,
      progressValue,
      recentSighting,
      currentMonthSightings,
      newSpeciesThisMonth,
      monthlyRewards,
      monthlyChallenges,
    }
  }, [data])

  const dailyChallenge = useMemo(() => {
    const date = todayValue()
    const completion = data.dailyChallengeCompletions?.[date] || {}
    const main = getDailyChallenge(data.challenges, date)
    const firstBonus = getDailyChallenge(data.challenges, date, 7)
    const bonus =
      firstBonus.id === main.id ? getDailyChallenge(data.challenges, date, 11) : firstBonus

    return {
      date,
      main,
      bonus,
      mainComplete: completion.daily === main.id,
      bonusComplete: completion.bonus === bonus.id,
    }
  }, [data.challenges, data.dailyChallengeCompletions])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 5200)
    return () => window.clearTimeout(timer)
  }, [toast])

  function commit(nextState, message) {
    const recalculated = recalculateState(nextState)
    const unlockSummary = getUnlockSummary(data, recalculated)
    const unlockedRewards = getNewlyUnlockedRewards(data, recalculated)
    setData(recalculated)
    if (unlockedRewards.length) {
      setRewardUnlockQueue((current) => [...current, ...unlockedRewards])
    }
    setToast({
      title: message.title,
      body: [message.body, unlockSummary].filter(Boolean).join(' '),
      tone: message.tone || 'success',
    })
  }

  function completeIntro() {
    localStorage.setItem(INTRO_STORAGE_KEY, 'seen')
    setShowIntro(false)
  }

  function resetData() {
    if (
      !window.confirm(
        'Clear all local Marlie Bird Journey data from this browser? This cannot be undone.',
      )
    ) {
      return
    }
    const fresh = buildDefaultState()
    localStorage.removeItem(STORAGE_KEY)
    setData(fresh)
    setActivePage('home')
    setRewardUnlockQueue([])
    setShowMissedQuickForm(false)
    setBirdProfile(null)
    setMissedDraft({ location: '', note: '' })
    setToast({
      title: 'Demo data reset',
      body: "Marlie's local bird notebook is back to a clean page.",
      tone: 'calm',
    })
  }

  function resetIntroScreen() {
    localStorage.removeItem(INTRO_STORAGE_KEY)
    setShowIntro(true)
  }

  function openBirdProfile(profile) {
    setBirdProfile(profile)
    setActivePage('birdProfile')
  }

  function closeBirdProfile() {
    setActivePage(birdProfile?.source === 'library' ? 'library' : 'birds')
  }

  function addBird(form, options = {}) {
    const birdName = String(form.birdName || '').trim()
    const speciesKey = normalizeBirdName(birdName)
    if (!speciesKey) return
    const isNewSpecies = !data.birds.some((bird) => bird.id === speciesKey)
    const coinsEarned = isNewSpecies ? 25 : 5
    const aiMatch = form.aiMatch ? normalizeAiMatch(form.aiMatch) : null
    const nickname =
      String(form.nickname || '').trim() || nicknameIdeas[speciesKey] || 'Officially Cute Bird'
    const sighting = {
      id: createId('sighting'),
      speciesKey,
      birdName,
      nickname,
      dateSpotted: form.dateSpotted || todayValue(),
      timeSpotted: form.timeSpotted || '',
      location: String(form.location || '').trim(),
      notes: String(form.notes || '').trim(),
      mood: form.mood || moodOptions[0],
      seenWithMarnich: Boolean(form.seenWithMarnich),
      favorite: Boolean(form.favorite),
      photo: form.photo || '',
      coinsEarned,
      createdAt: new Date().toISOString(),
      personality: personalityComments[speciesKey] || '',
      source: form.source || (aiMatch ? 'ai' : 'manual'),
      aiMatch,
    }
    const sightings = [...data.sightings, sighting]
    const nextState = {
      ...data,
      sightings,
      birds: buildBirdRecords(sightings),
      birdLibrary: upsertBirdLibraryFromSighting(data.birdLibrary, sighting),
      featherCoins: data.featherCoins + coinsEarned,
      settings: {
        ...data.settings,
        birdCrush: form.makeBirdCrush ? birdName : data.settings.birdCrush,
      },
    }

    commit(nextState, {
      title: isNewSpecies ? 'New species logged!' : 'Repeat sighting logged!',
      body: [
        `${getCouncilMessage(data.sightings.length)} +${coinsEarned} Feather Coins.`,
        options.checkedOff ? "Checked off Marlie's South African Bird List \u2705" : '',
      ]
        .filter(Boolean)
        .join(' '),
    })
    if (!options.stayOnPage) {
      setActivePage('birds')
    }

    return { birdName, coinsEarned, isNewSpecies }
  }

  function logMissedSighting(draft = missedDraft) {
    const missed = {
      id: createId('missed'),
      date: todayValue(),
      location: draft.location.trim(),
      note: draft.note.trim(),
      status: gotAwayStatuses[data.missedSightings.length % gotAwayStatuses.length],
    }
    commit(
      {
        ...data,
        missedSightings: [missed, ...data.missedSightings],
        pityCoins: data.pityCoins + 2,
      },
      {
        title: 'It flew away',
        body: 'The bird escaped, but your effort has been recognised. +2 Pity Coins.',
      },
    )
    setMissedDraft({ location: '', note: '' })
    setShowMissedQuickForm(false)
  }

  function sendBirdAlert() {
    const alert = {
      id: createId('alert'),
      date: todayValue(),
      message: 'Marnich, I saw a bird!',
    }
    commit(
      {
        ...data,
        settings: {
          ...data.settings,
          alerts: [alert, ...data.settings.alerts],
        },
      },
      {
        title: 'Emergency bird alert',
        body: 'Alert logged. Marnich has been spiritually notified.',
        tone: 'calm',
      },
    )
  }

  function completeChallenge(challengeId) {
    const challenge = data.challenges.find((item) => item.id === challengeId)
    if (!challenge || challenge.completed) return
    commit(
      {
        ...data,
        featherCoins: data.featherCoins + 50,
        challenges: data.challenges.map((item) =>
          item.id === challengeId
            ? { ...item, completed: true, completedAt: todayValue() }
            : item,
        ),
      },
      {
        title: 'Challenge complete',
        body: 'The Bird Council approves. +50 Feather Coins.',
      },
    )
  }

  function completeDailyChallenge(kind = 'daily') {
    const challenge = kind === 'bonus' ? dailyChallenge.bonus : dailyChallenge.main
    if (!challenge) return

    const date = dailyChallenge.date
    const completion = getCompletionForDate(data, date)
    if (completion[kind] === challenge.id) {
      setToast({
        title: 'Already stamped',
        body: 'The Bird Council says this mission has already been completed today.',
        tone: 'calm',
      })
      return
    }

    const bonus = kind === 'bonus'
    commit(
      {
        ...data,
        featherCoins: data.featherCoins + (bonus ? 20 : 50),
        dailyChallengeCompletions: {
          ...data.dailyChallengeCompletions,
          [date]: {
            ...completion,
            [kind]: challenge.id,
          },
        },
      },
      {
        title: bonus ? 'Bonus mission complete' : 'Daily mission complete',
        body: bonus
          ? 'The optional Bird Council side quest has been quietly stamped. +20 Feather Coins.'
          : 'The Bird Council has approved today’s mission. +50 Feather Coins.',
      },
    )
  }

  function toggleBingo(index) {
    const squares = data.bingo.squares.map((square, squareIndex) =>
      squareIndex === index ? { ...square, checked: !square.checked } : square,
    )
    const completedRows = new Set(data.bingo.completedRows)
    const newRows = []

    bingoRows.forEach((row, rowIndex) => {
      const key = `row-${rowIndex}`
      const rowComplete = row.every((squareIndex) => squares[squareIndex]?.checked)
      if (rowComplete && !completedRows.has(key)) {
        completedRows.add(key)
        newRows.push(key)
      }
    })

    const bonus = newRows.length * 100
    commit(
      {
        ...data,
        bingo: {
          squares,
          completedRows: [...completedRows],
        },
        featherCoins: data.featherCoins + bonus,
      },
      {
        title: bonus ? 'Bingo row complete!' : 'Bingo updated',
        body: bonus
          ? `The Bird Council stamped the bingo card. +${bonus} Feather Coins.`
          : 'Square updated.',
        tone: bonus ? 'success' : 'calm',
      },
    )
  }

  function rotateDateMission() {
    const currentIndex = dateMissions.indexOf(data.settings.currentDateMission)
    const nextMission = dateMissions[(currentIndex + 1) % dateMissions.length]
    setData({
      ...data,
      settings: { ...data.settings, currentDateMission: nextMission },
    })
  }

  function completeBirdDate() {
    const memory = {
      id: createId('date-memory'),
      date: todayValue(),
      mission: data.settings.currentDateMission,
      note: 'Spotted with Marnich',
    }
    commit(
      {
        ...data,
        featherCoins: data.featherCoins + 100,
        dateMemories: [memory, ...data.dateMemories],
      },
      {
        title: 'Bird Date completed',
        body: 'Memory saved as "Spotted with Marnich". +100 Feather Coins.',
      },
    )
  }

  function claimReward(rewardId) {
    const reward = data.rewards.find((item) => item.id === rewardId)
    if (!reward || reward.status !== 'Unlocked') return
    commit(
      {
        ...data,
        rewards: data.rewards.map((item) =>
          item.id === rewardId
            ? { ...item, status: 'Claimed', claimedAt: todayValue() }
            : item,
        ),
      },
      {
        title: 'Reward claimed',
        body: 'Reward claimed. Marnich has been emotionally and financially notified.',
      },
    )
  }

  function markRewardPaid(rewardId) {
    const reward = data.rewards.find((item) => item.id === rewardId)
    if (!reward || reward.status === 'Locked') return
    commit(
      {
        ...data,
        rewards: data.rewards.map((item) =>
          item.id === rewardId
            ? { ...item, status: 'Paid', paidAt: todayValue() }
            : item,
        ),
      },
      {
        title: 'Reward marked paid',
        body: 'Marnich Bank has approved this transaction with love.',
      },
    )
  }

  function redeemShopItem(item) {
    if (data.featherCoins < item.cost) {
      setToast({
        title: 'Not enough Feather Coins',
        body: 'Your sponsor is currently financially nervous.',
        tone: 'warning',
      })
      return
    }

    const redemption = {
      id: createId('shop'),
      itemId: item.id,
      name: item.name,
      cost: item.cost,
      date: todayValue(),
      status: 'Claimed',
    }

    commit(
      {
        ...data,
        featherCoins: data.featherCoins - item.cost,
        shopRedemptions: [redemption, ...data.shopRedemptions],
      },
      {
        title: 'Shop reward redeemed',
        body: `${item.name} claimed. Sponsored by Marnich Bank.`,
      },
    )
  }

  function redeemCode(codeValue) {
    const codeText = codeValue.trim().toUpperCase()
    const code = data.secretCodes.find((item) => item.code === codeText)
    if (!code) {
      setToast({
        title: 'Code not recognised',
        body: 'The Bird Council checked the tiny paperwork and found nothing.',
        tone: 'warning',
      })
      return
    }
    if (code.redeemed) {
      setToast({
        title: 'Already redeemed',
        body: 'This code has already done its romantic administrative duty.',
        tone: 'warning',
      })
      return
    }

    let nextState = {
      ...data,
      secretCodes: data.secretCodes.map((item) =>
        item.code === code.code ? { ...item, redeemed: true, redeemedAt: todayValue() } : item,
      ),
    }

    if (code.type === 'feather') {
      nextState = { ...nextState, featherCoins: nextState.featherCoins + Number(code.amount || 0) }
    }
    if (code.type === 'pity') {
      nextState = { ...nextState, pityCoins: nextState.pityCoins + Number(code.amount || 0) }
    }
    if (code.type === 'note') {
      nextState = {
        ...nextState,
        hiddenNotes: nextState.hiddenNotes.map((note) =>
          note.id === code.noteId
            ? { ...note, unlocked: true, unlockedAt: todayValue() }
            : note,
        ),
      }
    }
    if (code.type === 'reward') {
      const rewards = nextState.rewards.map((reward) =>
        reward.id === code.rewardId
          ? { ...reward, status: 'Unlocked', unlockedAt: todayValue() }
          : reward,
      )
      const reward = rewards.find((item) => item.id === code.rewardId)
      const certificates =
        reward && !nextState.rewardCertificates.some((cert) => cert.rewardId === reward.id)
          ? [...nextState.rewardCertificates, makeCertificate(reward)]
          : nextState.rewardCertificates
      nextState = { ...nextState, rewards, rewardCertificates: certificates }
    }

    commit(nextState, {
      title: 'Secret code accepted',
      body: `${code.label}. The Bird Council whispers approval.`,
    })
  }

  function addAdminReward(reward) {
    if (!reward.name.trim()) return
    const id = normalizeBirdName(reward.name).replaceAll(' ', '-')
    commit(
      {
        ...data,
        rewards: [
          ...data.rewards,
          {
            id: `admin-${id}-${Date.now()}`,
            name: reward.name.trim(),
            milestone: Number(reward.milestone) || null,
            unlockReason: reward.unlockReason.trim() || 'Custom reward from Marnich.',
            reference: `ADMIN-${Date.now().toString().slice(-5)}`,
            status: 'Locked',
            unlockedAt: null,
            claimedAt: null,
            paidAt: null,
          },
        ],
      },
      {
        title: 'Reward added',
        body: 'The reward list has been updated.',
        tone: 'calm',
      },
    )
  }

  function addAdminChallenge(text) {
    if (!text.trim()) return
    commit(
      {
        ...data,
        challenges: [
          ...data.challenges,
          {
            id: createId('challenge'),
            text: text.trim(),
            cadence: 'Custom',
            completed: false,
            completedAt: null,
          },
        ],
      },
      {
        title: 'Challenge added',
        body: 'The Bird Council has filed the new challenge.',
        tone: 'calm',
      },
    )
  }

  function addAdminNote(note) {
    if (!note.title.trim() || !note.message.trim()) return
    commit(
      {
        ...data,
        hiddenNotes: [
          ...data.hiddenNotes,
          {
            id: createId('note'),
            title: note.title.trim(),
            message: note.message.trim(),
            milestone: Number(note.milestone) || null,
            unlocked: false,
            unlockedAt: null,
          },
        ],
      },
      {
        title: 'Hidden note added',
        body: 'A new note is waiting for the right bird moment.',
        tone: 'calm',
      },
    )
  }

  function addAdminCode(code) {
    if (!code.code.trim()) return
    const normalCode = code.code.trim().toUpperCase()
    if (data.secretCodes.some((item) => item.code === normalCode)) {
      setToast({
        title: 'Code already exists',
        body: 'Choose a different secret code.',
        tone: 'warning',
      })
      return
    }
    commit(
      {
        ...data,
        secretCodes: [
          ...data.secretCodes,
          {
            code: normalCode,
            type: 'feather',
            amount: Number(code.amount) || 0,
            label: `+${Number(code.amount) || 0} Feather Coins`,
            redeemed: false,
          },
        ],
      },
      {
        title: 'Secret code added',
        body: 'The code book has been updated.',
        tone: 'calm',
      },
    )
  }

  const visibleNavItems = data.settings.secretCodesVisible
    ? [
        ...navItems.slice(0, -1),
        ['codes', 'Secret', '🔐'],
        navItems[navItems.length - 1],
      ]
    : navItems
  const activeNav =
    visibleNavItems.find((item) => item[0] === activePage) ||
    (activePage === 'birdProfile' ? ['birdProfile', 'Bird Profile', '🪶'] : null)
  const activeRewardUnlock = rewardUnlockQueue[0] || null

  if (showIntro) {
    return <WelcomeIntro onStart={completeIntro} />
  }

  return (
    <div className="app-shell">
      <div className="ambient-sky" aria-hidden="true">
        <span className="floating-feather feather-one">🪶</span>
        <span className="floating-feather feather-two">🪶</span>
        <span className="floating-feather feather-three">🪶</span>
        <span className="tiny-bird bird-one">🐦</span>
        <span className="tiny-bird bird-two">🐤</span>
      </div>
      <Toast toast={toast} />
      <RewardUnlockModal
        reward={activeRewardUnlock}
        onClose={() => setRewardUnlockQueue((current) => current.slice(1))}
      />

      <header className="app-header">
        <div>
          <p className="eyebrow">Made for Pooks</p>
          <h1>Pooks' magical bird adventure</h1>
        </div>
        <div className="coin-pill" aria-label="Coin balances">
          <span>{data.featherCoins} Feather Coins</span>
        </div>
      </header>

      <nav className="tabs" aria-label="App sections">
        {visibleNavItems.map(([id, label, icon]) => (
          <button
            className={activePage === id ? 'tab active' : 'tab'}
            key={id}
            type="button"
            onClick={() => setActivePage(id)}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      <main className="page-wrap page-stage" key={activePage}>
        <p className="mobile-page-title">{activeNav?.[2]} {activeNav?.[1]}</p>
        {activePage === 'home' && (
          <HomePage
            data={data}
            stats={stats}
            dailyChallenge={dailyChallenge}
            missedDraft={missedDraft}
            setMissedDraft={setMissedDraft}
            showMissedQuickForm={showMissedQuickForm}
            setShowMissedQuickForm={setShowMissedQuickForm}
            logMissedSighting={logMissedSighting}
            sendBirdAlert={sendBirdAlert}
            completeDailyChallenge={completeDailyChallenge}
            goTo={setActivePage}
          />
        )}
        {activePage === 'add' && <AddBirdPage addBird={addBird} />}
        {activePage === 'birds' && (
          <BirdsPage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'library' && (
          <SaBirdLibraryPage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'birdProfile' && (
          <BirdProfilePage
            data={data}
            profile={birdProfile}
            onBack={closeBirdProfile}
          />
        )}
        {activePage === 'rewards' && (
          <RewardsPage
            data={data}
            stats={stats}
            claimReward={claimReward}
            markRewardPaid={markRewardPaid}
            redeemShopItem={redeemShopItem}
          />
        )}
        {activePage === 'challenges' && (
          <ChallengesPage
            data={data}
            dailyChallenge={dailyChallenge}
            completeDailyChallenge={completeDailyChallenge}
            completeChallenge={completeChallenge}
          />
        )}
        {activePage === 'notes' && <HiddenNotesPage data={data} />}
        {activePage === 'missed' && (
          <MissedBirdsPage
            data={data}
            missedDraft={missedDraft}
            setMissedDraft={setMissedDraft}
            logMissedSighting={logMissedSighting}
          />
        )}
        {activePage === 'date' && (
          <BirdDatePage
            data={data}
            rotateDateMission={rotateDateMission}
            completeBirdDate={completeBirdDate}
          />
        )}
        {activePage === 'bingo' && <BingoPage data={data} toggleBingo={toggleBingo} />}
        {activePage === 'codes' && <SecretCodesPage data={data} redeemCode={redeemCode} />}
        {activePage === 'magazine' && (
          <WeeklyMagazinePage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'profile' && <ProfilePage data={data} stats={stats} goTo={setActivePage} />}
        {activePage === 'admin' && (
          <AdminPage
            data={data}
            addAdminReward={addAdminReward}
            addAdminChallenge={addAdminChallenge}
            addAdminNote={addAdminNote}
            addAdminCode={addAdminCode}
            markRewardPaid={markRewardPaid}
            resetData={resetData}
            resetIntroScreen={resetIntroScreen}
            previewMarlieView={() => setActivePage('home')}
            previewMagazineIssue={() => setActivePage('magazine')}
            setData={setData}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>{loadingMessages[(stats.totalSightings + stats.uniqueCount) % loadingMessages.length]}</span>
        <span>Made for Marlie by Marnich.</span>
      </footer>
    </div>
  )
}

function WelcomeIntro({ onStart }) {
  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">Made for Marlie by Marnich</p>
        <h1 id="welcome-title">Marlie's Bird Journey</h1>
        <p>
          I made this for you because your bird obsession became one of my favourite things.
          Every bird you spot now becomes part of your little adventure.
        </p>
        <button className="primary-btn" type="button" onClick={onStart}>
          Start my bird journey
        </button>
      </section>
    </main>
  )
}

function RewardUnlockModal({ reward, onClose }) {
  if (!reward) return null

  return (
    <div className="reward-modal-backdrop" role="presentation">
      <article
        className="reward-unlock-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-unlock-title"
      >
        <p className="eyebrow">Reward unlocked!</p>
        <h2 id="reward-unlock-title">{reward.name}</h2>
        <div className="reward-unlock-details">
          <p>
            <strong>Reason unlocked</strong>
            <span>{reward.unlockReason}</span>
          </p>
          <p>
            <strong>Reference code</strong>
            <span>{reward.reference}</span>
          </p>
          <p>
            <strong>Bird Council</strong>
            <span>
              Approved with ceremonial seriousness. Marlie's file has been stamped, admired,
              and placed in the very important bird cabinet.
            </span>
          </p>
          <p>
            <strong>Marnich Bank</strong>
            <span>
              Sponsored by Marnich Bank. Please allow 1-3 romantic business days for
              processing while your sponsor acts calm.
            </span>
          </p>
        </div>
        <button className="primary-btn wide" type="button" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.tone || 'success'}`} role="status">
      <strong>{toast.title}</strong>
      <span>{toast.body}</span>
    </div>
  )
}

function HomePage({
  data,
  stats,
  dailyChallenge,
  completeDailyChallenge,
  goTo,
}) {
  const recent = stats.recentSighting
  const seenLibraryCount = data.birdLibrary.filter((bird) => bird.seen).length
  const collectionProgress = data.birdLibrary.length
    ? Math.round((seenLibraryCount / data.birdLibrary.length) * 100)
    : 0

  return (
    <div className="page-grid home-adventure-grid">
      <section className="hero-panel mystery-hero adventure-hero">
        <div className="hero-copy">
          <p className="eyebrow">Today's tiny adventure</p>
          <h2>What bird will Pooks find?</h2>
          <p>A photo, a feather, a little mystery. The Bird Council is waiting.</p>
          <div className="hero-actions">
            <button className="primary-btn big-action" type="button" onClick={() => goTo('add')}>
              Start bird adventure
            </button>
          </div>
        </div>
        <div className="storybook-bird" aria-hidden="true">
          <span className="bird-body">🐦</span>
          <span className="nest-shape">nest</span>
        </div>
      </section>

      <section className="soft-card quest-card">
        <p className="eyebrow">Tiny quest</p>
        <h3>{dailyChallenge.main?.text || 'Find one suspicious bird moment'}</h3>
        <div className="quest-footer">
          <span className={dailyChallenge.mainComplete ? 'status-pill paid' : 'status-pill'}>
            {dailyChallenge.mainComplete ? 'Stamped' : '+50'}
          </span>
          <button
            className="secondary-btn"
            type="button"
            disabled={dailyChallenge.mainComplete}
            onClick={() => completeDailyChallenge('daily')}
          >
            {dailyChallenge.mainComplete ? 'Done' : 'Stamp quest'}
          </button>
        </div>
      </section>

      <button className="soft-card home-link-card scrapbook-link" type="button" onClick={() => goTo('birds')}>
        <span className="eyebrow">Memory album</span>
        <strong>{recent ? recent.birdName : 'First bird photo'}</strong>
        <small>{recent ? 'Open the latest polaroid' : 'Your scrapbook is waiting.'}</small>
        {recent?.photo ? (
          <img src={recent.photo} alt={recent.birdName} />
        ) : (
          <span className="album-doodle" aria-hidden="true">📷</span>
        )}
      </button>

      <button className="soft-card home-link-card collection-link" type="button" onClick={() => goTo('library')}>
        <span className="eyebrow">Bird Book</span>
        <strong>{seenLibraryCount} creatures found</strong>
        <div className="progress-track">
          <span style={{ width: `${collectionProgress}%` }}></span>
        </div>
        <small>Tap to collect more birds.</small>
      </button>
    </div>
  )
}

function StatCard({ label, value, detail }) {
  return (
    <section className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  )
}

function AddBirdPage({ addBird }) {
  const [form, setForm] = useState(() => createEmptyForm())
  const [photoFile, setPhotoFile] = useState(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [aiStatus, setAiStatus] = useState('idle')
  const [aiMatches, setAiMatches] = useState([])
  const [aiUncertain, setAiUncertain] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState('')
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const [guidance, setGuidance] = useState('')

  const speciesKey = normalizeBirdName(form.birdName)
  const nicknameSuggestion = nicknameIdeas[speciesKey]
  const personality = personalityComments[speciesKey]
  const canAskCouncil = Boolean(photoFile) && aiStatus !== 'loading'

  useEffect(() => {
    if (aiStatus !== 'loading') return undefined

    const intervalId = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingMessages.length)
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [aiStatus])

  function createEmptyForm() {
    return {
      birdName: '',
      nickname: '',
      dateSpotted: todayValue(),
      timeSpotted: '',
      location: '',
      notes: '',
      mood: moodOptions[0],
      seenWithMarnich: false,
      favorite: false,
      photo: '',
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function clearAiState() {
    setAiMatches([])
    setAiUncertain(false)
    setOfflineNotice('')
    setAiStatus('idle')
  }

  function handleNoneMatch() {
    clearAiState()
    setConfirmation(null)
    setGuidance(
      "That's okay — no bird forced. Try another photo, or open “Add manually instead” below to name it yourself.",
    )
  }

  function resetSpotter({ keepConfirmation = false } = {}) {
    setForm(createEmptyForm())
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    clearAiState()
    if (!keepConfirmation) {
      setConfirmation(null)
    }
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setConfirmation(null)
    setGuidance('')
    clearAiState()

    const reader = new FileReader()
    reader.onload = () => updateField('photo', reader.result)
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    updateField('photo', '')
    clearAiState()
  }

  async function handleAskCouncil(event) {
    event.preventDefault()
    if (!photoFile) return

    setAiStatus('loading')
    setLoadingIndex(0)
    setConfirmation(null)
    setGuidance('')
    setAiMatches([])
    setAiUncertain(false)
    setOfflineNotice('')

    try {
      if (!BIRD_API_URL) {
        throw new Error('Missing VITE_BIRD_API_URL')
      }

      const body = new FormData()
      body.append('file', photoFile)

      const response = await fetch(`${BIRD_API_URL}/api/identify-bird`, {
        method: 'POST',
        body,
      })

      if (!response.ok) {
        throw new Error(`Bird API returned ${response.status}`)
      }

      const payload = await response.json()
      const result = normalizeAiIdentificationResponse(payload)

      if (!result.matches.length) {
        throw new Error('Bird API returned no matches')
      }

      setAiMatches(result.matches)
      setAiUncertain(result.uncertain)
      setAiStatus('results')
    } catch (error) {
      console.warn('Bird Council fallback result used', error)
      const result = normalizeAiIdentificationResponse(mockAiBirdMatches)
      setAiMatches(result.matches)
      setAiUncertain(false)
      setOfflineNotice(OFFLINE_BIRD_COUNCIL_MESSAGE)
      setAiStatus('results')
    }
  }

  function handleConfirmMatch(match) {
    const details = [
      form.notes,
      match.whyThisBird ? `Bird Council reason: ${match.whyThisBird}` : '',
      match.cutePersonalityLine,
    ]
      .filter(Boolean)
      .join('\n\n')

    const saved = addBird(
      {
        ...form,
        birdName: match.commonName,
        nickname: '',
        notes: details,
        source: 'ai',
        aiMatch: match,
      },
      { stayOnPage: true, checkedOff: true },
    )

    if (!saved) return

    setConfirmation(saved)
    resetSpotter({ keepConfirmation: true })
  }

  function handleManualSubmit(event) {
    event.preventDefault()
    if (!form.birdName.trim()) return

    const saved = addBird({ ...form, source: 'manual' })
    if (saved) {
      resetSpotter()
    }
  }

  return (
    <div className="page-grid spot-page">
      <section className="soft-card form-page spot-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bird adventure moment</p>
            <h2>Show the Council a bird photo</h2>
          </div>
          <span className="status-pill">Magic scan</span>
        </div>

        <form className="council-form" onSubmit={handleAskCouncil}>
          <label className="photo-input featured-photo-input">
            Bird photo
            <input
              key={photoInputKey}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
            />
          </label>

          {form.photo ? (
            <div className="photo-preview large-preview">
              <img src={form.photo} alt="Bird preview" />
              <button className="ghost-btn" type="button" onClick={removePhoto}>
                Remove photo
              </button>
            </div>
          ) : (
            <div className="photo-empty-preview">
              <span>{getBirdPhotoPlaceholderLabel('Bird')}</span>
              <p>Tap here, choose a photo, and let the feathers fly.</p>
            </div>
          )}

          <details className="hidden-paperwork">
            <summary>Add tiny memory details</summary>
          <div className="form-grid two">
            <label>
              Date spotted
              <input
                type="date"
                value={form.dateSpotted}
                onChange={(event) => updateField('dateSpotted', event.target.value)}
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="Garden, park, coffee date"
              />
            </label>
            <label>
              Mood
              <select
                value={form.mood}
                onChange={(event) => updateField('mood', event.target.value)}
              >
                {moodOptions.map((mood) => (
                  <option key={mood}>{mood}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="What was it doing? Was it cute? Did it look guilty?"
            />
          </label>

          <div className="toggle-row">
            <label className="check-card">
              <input
                type="checkbox"
                checked={form.seenWithMarnich}
                onChange={(event) => updateField('seenWithMarnich', event.target.checked)}
              />
              Seen with Marnich
            </label>
            <label className="check-card">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(event) => updateField('favorite', event.target.checked)}
              />
              Favourite
            </label>
          </div>
          </details>

          <button className="primary-btn submit-btn council-main-btn" type="submit" disabled={!canAskCouncil}>
            Ask the Bird Council
          </button>
        </form>

        {aiStatus === 'loading' && (
          <div className="council-loading" role="status" aria-live="polite">
            <span aria-hidden="true"></span>
            <p>{loadingMessages[loadingIndex]}</p>
          </div>
        )}

        {offlineNotice && (
          <div className="hint-panel offline-council-note">
            <p>{offlineNotice}</p>
          </div>
        )}

        {confirmation && (
          <div className="checked-off-banner" role="status">
            <div className="celebration-burst" aria-hidden="true">
              <span>\ud83e\udeb6</span>
              <span>\u2728</span>
              <span>\ud83d\udc26</span>
              <span>\ud83c\udf89</span>
              <span>\ud83e\udeb6</span>
              <span>\u2728</span>
            </div>
            <strong>New bird discovered! {'\u2705'}</strong>
            <p>
              {confirmation.birdName} fluttered into Marlie&apos;s album. +
              {confirmation.coinsEarned} Feather Coins.
            </p>
          </div>
        )}

        {guidance && (
          <div className="hint-panel ai-guidance-note">
            <p>{guidance}</p>
          </div>
        )}

        {aiMatches.length > 0 && (
          <section className="ai-results-panel" aria-live="polite">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Bird Council answers</p>
                <h3>Which one looks like your bird?</h3>
              </div>
              <span className={aiUncertain ? 'status-pill locked' : 'status-pill'}>
                {aiUncertain ? 'Council is unsure' : `Top ${aiMatches.length} guesses`}
              </span>
            </div>
            <p className="ai-results-hint">
              {aiUncertain
                ? 'The photo was a little tricky, so these are gentle guesses. Pick the closest, or none at all.'
                : 'Tap the one that matches what you saw. There is no wrong answer \u2014 only pick if it feels right.'}
            </p>
            <div className="ai-match-grid">
              {aiMatches.map((match, index) => (
                <AiMatchCard
                  key={`${match.commonName}-${index}`}
                  index={index}
                  match={match}
                  onConfirm={handleConfirmMatch}
                />
              ))}
            </div>
            <div className="ai-reject-row">
              <button className="ghost-btn" type="button" onClick={handleNoneMatch}>
                None of these look right
              </button>
            </div>
          </section>
        )}
      </section>

      <section className="soft-card manual-entry-card full-span">
        <details>
          <summary>Add manually instead</summary>
          <form onSubmit={handleManualSubmit}>
            <div className="form-grid two">
              <label>
                Bird name
                <input
                  required
                  value={form.birdName}
                  onChange={(event) => updateField('birdName', event.target.value)}
                  placeholder="Cape Robin-Chat"
                />
              </label>
              <label>
                Nickname
                <input
                  value={form.nickname}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  placeholder={nicknameSuggestion || 'Tiny celebrity name'}
                />
              </label>
              <label>
                Date spotted
                <input
                  type="date"
                  value={form.dateSpotted}
                  onChange={(event) => updateField('dateSpotted', event.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  placeholder="Garden, park, coffee date"
                />
              </label>
              <label>
                Mood
                <select
                  value={form.mood}
                  onChange={(event) => updateField('mood', event.target.value)}
                >
                  {moodOptions.map((mood) => (
                    <option key={mood}>{mood}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Manual bird paperwork goes here."
              />
            </label>

            <div className="toggle-row">
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={form.seenWithMarnich}
                  onChange={(event) => updateField('seenWithMarnich', event.target.checked)}
                />
                Seen with Marnich
              </label>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={form.favorite}
                  onChange={(event) => updateField('favorite', event.target.checked)}
                />
                Favourite
              </label>
            </div>

            {(nicknameSuggestion || personality) && (
              <div className="hint-panel">
                {nicknameSuggestion && <p>Nickname idea: {nicknameSuggestion}</p>}
                {personality && <p>{personality}</p>}
              </div>
            )}

            <button className="secondary-btn submit-btn" type="submit">
              Save manual bird
            </button>
          </form>
        </details>
      </section>
    </div>
  )
}

function AiMatchCard({ match, index, onConfirm }) {
  const confidence = match.confidence || 0
  const unsure = confidence < 70
  const isBest = index === 0
  const secretRows = [
    ['Afrikaans', match.afrikaansName],
    ['Scientific', match.scientificName],
    ['Why this bird', match.whyThisBird],
    ['Habitat', match.habitat],
    ['Diet', match.diet],
    ['Sound', match.soundDescription],
  ]

  return (
    <article
      className={`ai-match-card${isBest ? ' best-match' : ''}${unsure ? ' unsure' : ''}`}
    >
      <div className="match-creature" aria-hidden="true">
        {getBirdPhotoPlaceholderLabel(match.commonName)}
      </div>
      <div className="ai-match-title">
        <span className={unsure ? 'status-pill locked' : 'status-pill'}>
          {isBest ? 'Best guess' : `Maybe #${index + 1}`}
        </span>
        <h3>{match.commonName}</h3>
        <p>{match.cutePersonalityLine || match.whyThisBird || 'A possible feather friend.'}</p>
      </div>

      <div className="ai-confidence">
        <div className="ai-confidence-head">
          <span>{unsure ? 'Not fully sure' : 'Feeling confident'}</span>
          <strong>{confidence ? `${confidence}%` : '—'}</strong>
        </div>
        <div className="confidence-bar" aria-hidden="true">
          <span className={unsure ? 'low' : ''} style={{ width: `${confidence}%` }}></span>
        </div>
        {unsure && (
          <p className="ai-confidence-note">
            The Bird Council isn&apos;t certain. Only pick this one if it looks right to you.
          </p>
        )}
      </div>

      <details className="tiny-details">
        <summary>Peek at clues</summary>
        <dl className="bird-meta ai-match-meta">
          {secretRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || 'Not sure yet'}</dd>
            </div>
          ))}
        </dl>
        <AiList title="Fun facts" items={match.funFacts.slice(0, 2)} />
      </details>

      <button className="primary-btn" type="button" onClick={() => onConfirm(match)}>
        {isBest && !unsure ? 'Yes, this is my bird!' : 'This is the one'}
      </button>
    </article>
  )
}

function AiList({ title, items }) {
  return (
    <div className="ai-list-block">
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not sure yet</p>
      )}
    </div>
  )
}

function BirdsPage({ data, openBirdProfile }) {
  return (
    <section className="soft-card full-span collection-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Marlie's Bird Memories</p>
          <h2>My Birds</h2>
        </div>
        <span className="status-pill">{data.birds.length} personal species</span>
      </div>

      <div className="memory-gallery">
        {data.birds.length === 0 && <EmptyState text="Your first bird memory is waiting outside." />}
        {data.birds.map((bird) => {
          const libraryBird = getLibraryBirdForMemory(data.birdLibrary, bird.birdName, bird.aiMatch)
          const aiMatch = bird.aiMatch || libraryBird?.aiDetails || null
          const funFacts = getFunFacts(aiMatch?.funFacts?.length ? aiMatch.funFacts : libraryBird?.funFacts)
          const afrikaansName = aiMatch?.afrikaansName || libraryBird?.afrikaansName || 'Not sure yet'
          const scientificName =
            aiMatch?.scientificName || libraryBird?.scientificName || 'Not sure yet'
          const councilReason =
            aiMatch?.whyThisBird || libraryBird?.birdCouncilReason || 'Manual bird memory'

          return (
            <article className="bird-card memory-bird-card" key={bird.id}>
              {bird.photo ? (
                <img className="bird-card-photo" src={bird.photo} alt={bird.birdName} />
              ) : (
                <div className="bird-card-photo placeholder-photo">
                  <span>{getBirdPhotoPlaceholderLabel(bird.birdName)}</span>
                </div>
              )}
              <div className="bird-card-body">
                <p className="eyebrow">Polaroid memory</p>
                <h3>{bird.birdName}</h3>
                <div className="tag-row">
                  {bird.favorite && <span className="tag warm">Favourite</span>}
                  <span className="tag">{bird.count} time{bird.count === 1 ? '' : 's'} seen</span>
                </div>
                <p className="memory-caption">
                  {formatDate(bird.lastSeen)} · {bird.location || 'Secret spot'}
                </p>
                <details className="tiny-details">
                  <summary>Peek inside</summary>
                  <dl className="bird-meta memory-meta">
                    <div>
                      <dt>Afrikaans</dt>
                      <dd>{afrikaansName}</dd>
                    </div>
                    <div>
                      <dt>Scientific</dt>
                      <dd>{scientificName}</dd>
                    </div>
                    <div>
                      <dt>Bird Council</dt>
                      <dd>{councilReason}</dd>
                    </div>
                    <div>
                      <dt>AI note</dt>
                      <dd>{aiMatch?.cutePersonalityLine || bird.notes || 'Saved by Marlie'}</dd>
                    </div>
                  </dl>
                  {funFacts.length > 0 && (
                    <div className="mini-list compact-list">
                      {funFacts.slice(0, 1).map((fact) => (
                        <p key={fact}>{fact}</p>
                      ))}
                    </div>
                  )}
                </details>
                <button
                  className="secondary-btn wide"
                  type="button"
                  onClick={() => openBirdProfile({ source: 'memory', id: bird.id })}
                >
                  Open bird profile
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function getBirdSearchText(bird) {
  return [
    bird.commonName,
    bird.afrikaansName,
    bird.scientificName,
    bird.category,
    bird.region,
    bird.habitat,
    bird.whereFoundInSouthAfrica,
    ...(bird.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function libraryBirdMatchesFilter(bird, filter) {
  if (filter === 'All') return true
  if (filter === 'Seen') return Boolean(bird.seen)
  if (filter === 'Not seen') return !bird.seen

  const filterKey = filter.toLowerCase()
  return [bird.category, ...(bird.tags || [])]
    .filter(Boolean)
    .some((value) => value.toLowerCase() === filterKey)
}

function SaBirdLibraryPage({ data, openBirdProfile }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const seenCount = data.birdLibrary.filter((bird) => bird.seen).length
  const searchKey = searchTerm.trim().toLowerCase()
  const filteredBirds = data.birdLibrary
    .filter((bird) => libraryBirdMatchesFilter(bird, activeFilter))
    .filter((bird) => !searchKey || getBirdSearchText(bird).includes(searchKey))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
  const progressValue = data.birdLibrary.length
    ? Math.round((seenCount / data.birdLibrary.length) * 100)
    : 0

  return (
    <div className="page-grid library-page">
      <section className="soft-card full-span checklist-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Creature collection</p>
            <h2>Pooks' Bird Book</h2>
          </div>
          <span className="status-pill">
            {seenCount} / {data.birdLibrary.length} collected
          </span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progressValue}%` }}></span>
        </div>
      </section>

      <section className="soft-card full-span library-controls">
        <label>
          Find a bird
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search the Bird Book"
          />
        </label>
        <div className="filter-row" aria-label="SA bird filters">
          {libraryFilters.map((filter) => (
            <button
              className={activeFilter === filter ? 'filter-chip active' : 'filter-chip'}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="full-span library-grid" aria-live="polite">
        {filteredBirds.length === 0 && (
          <EmptyState text="No birds match this checklist search yet." />
        )}
        {filteredBirds.map((bird) => (
          <article className={`library-bird-card ${bird.seen ? 'seen' : ''}`} key={bird.id}>
            {bird.imageUrl ? (
              <img className="bird-card-photo" src={bird.imageUrl} alt={bird.commonName} />
            ) : (
              <div className="bird-card-photo placeholder-photo library-placeholder">
                <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
              </div>
            )}
            <div className="bird-card-body">
              <span className={bird.seen ? 'status-pill paid' : 'status-pill locked'}>
                {bird.seen ? 'Collected ✅' : 'Mystery bird'}
              </span>
              <h3>{bird.commonName}</h3>
              <p className="nickname">{bird.afrikaansName || bird.category}</p>
              <p className="memory-caption">
                {bird.seen
                  ? `${bird.timesSeen || 1} sighting${bird.timesSeen === 1 ? '' : 's'}`
                  : 'Waiting to be discovered'}
              </p>
              <button
                className="secondary-btn wide"
                type="button"
                onClick={() => openBirdProfile({ source: 'library', id: bird.id })}
              >
                Open profile
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function BirdProfilePage({ data, profile, onBack }) {
  const source = profile?.source || 'library'
  const memoryBird =
    source === 'memory' ? data.birds.find((bird) => bird.id === profile?.id) : null
  const libraryBird =
    source === 'library'
      ? data.birdLibrary.find((bird) => bird.id === profile?.id)
      : getLibraryBirdForMemory(data.birdLibrary, memoryBird?.birdName, memoryBird?.aiMatch)
  const profileBird = libraryBird || {
    commonName: memoryBird?.birdName || 'Bird profile',
    afrikaansName: memoryBird?.aiMatch?.afrikaansName || '',
    scientificName: memoryBird?.aiMatch?.scientificName || '',
    category: 'Personal bird memory',
    region: memoryBird?.location || '',
    habitat: memoryBird?.aiMatch?.habitat || '',
    diet: memoryBird?.aiMatch?.diet || '',
    colours: memoryBird?.aiMatch?.colours || '',
    size: memoryBird?.aiMatch?.size || '',
    whereFoundInSouthAfrica: memoryBird?.aiMatch?.whereFoundInSouthAfrica || '',
    funFacts: memoryBird?.aiMatch?.funFacts || [],
    soundDescription: memoryBird?.aiMatch?.soundDescription || '',
    seen: true,
    timesSeen: memoryBird?.count || 0,
    firstSeenDate: memoryBird?.firstSeen || '',
    lastSeenDate: memoryBird?.lastSeen || '',
    birdCouncilReason: memoryBird?.aiMatch?.whyThisBird || memoryBird?.notes || '',
    aiDetails: memoryBird?.aiMatch || null,
    imageUrl: '',
    soundUrl: '',
  }
  const sightings = memoryBird
    ? data.sightings.filter((sighting) => sighting.speciesKey === memoryBird.id)
    : getSightingsForLibraryBird(data, profileBird)
  const latestPhoto =
    sightings.find((sighting) => sighting.photo)?.photo ||
    profileBird.herPhotos?.find((photo) => photo.photo)?.photo ||
    profileBird.imageUrl
  const aiDetails = profileBird.aiDetails || memoryBird?.aiMatch || sightings.find((sighting) => sighting.aiMatch)?.aiMatch
  const funFacts = getFunFacts(profileBird.funFacts?.length ? profileBird.funFacts : aiDetails?.funFacts)
  const sortedSightings = [...sightings].sort((a, b) =>
    a.dateSpotted.localeCompare(b.dateSpotted),
  )
  const seenByMarlie = Boolean(profileBird.seen || sortedSightings.length || memoryBird)
  const timesSeen = profileBird.timesSeen || sortedSightings.length || memoryBird?.count || 0
  const firstSeenDate = profileBird.firstSeenDate || sortedSightings[0]?.dateSpotted || memoryBird?.firstSeen
  const detailRows = [
    ['Category', profileBird.category],
    ['Region', profileBird.region],
    ['Habitat', profileBird.habitat],
    ['Diet', profileBird.diet],
    ['Colours', profileBird.colours || aiDetails?.colours],
    ['Size', profileBird.size || aiDetails?.size],
    ['Where found in South Africa', profileBird.whereFoundInSouthAfrica],
    ['Sound description', profileBird.soundDescription || aiDetails?.soundDescription],
    ['Seen status', seenByMarlie ? 'Seen by Marlie ✅' : 'Not spotted yet'],
    ['Times seen', timesSeen],
    ['First seen date', seenByMarlie ? formatDate(firstSeenDate) : 'Not spotted yet'],
    ['Bird Council reason', profileBird.birdCouncilReason || aiDetails?.whyThisBird],
  ]

  if (!profileBird.commonName || (!libraryBird && !memoryBird)) {
    return (
      <section className="soft-card full-span">
        <EmptyState text="This bird profile could not be found." />
        <button className="secondary-btn" type="button" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  return (
    <div className="page-grid bird-profile-page">
      <section className="soft-card full-span bird-profile-hero">
        <div>
          <button className="text-btn back-btn" type="button" onClick={onBack}>
            Back
          </button>
          <p className="eyebrow">{source === 'library' ? 'SA bird profile' : 'My bird profile'}</p>
          <h2>{profileBird.commonName}</h2>
          <p className="nickname">{profileBird.afrikaansName || 'Afrikaans name pending'}</p>
          <p className="fine-print">{profileBird.scientificName || 'Scientific name pending'}</p>
          <div className="tag-row">
            <span className={seenByMarlie ? 'status-pill paid' : 'status-pill locked'}>
              {seenByMarlie ? 'Seen by Marlie ✅' : 'Not spotted yet'}
            </span>
            <span className="tag">{profileBird.category}</span>
          </div>
        </div>
        {latestPhoto ? (
          <img className="profile-main-photo" src={latestPhoto} alt={profileBird.commonName} />
        ) : (
          <div className="profile-main-photo placeholder-photo">
            <span>{getBirdPhotoPlaceholderLabel(profileBird.commonName)}</span>
          </div>
        )}
      </section>

      <details className="soft-card full-span profile-detail-card">
        <summary>Open field notes</summary>
        <dl className="bird-meta profile-meta">
          {detailRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || 'Not recorded yet'}</dd>
            </div>
          ))}
        </dl>
      </details>

      <section className="soft-card">
        <p className="eyebrow">Fun facts</p>
        <div className="mini-list">
          {funFacts.length ? (
            funFacts.map((fact) => <p key={fact}>{fact}</p>)
          ) : (
            <p>Fun facts will appear after more Bird Council paperwork.</p>
          )}
        </div>
      </section>

      <section className="soft-card sound-card">
        <p className="eyebrow">Sound player</p>
        <h3>{profileBird.soundDescription || aiDetails?.soundDescription || 'Sound description pending'}</h3>
        {profileBird.soundUrl ? (
          <audio controls src={profileBird.soundUrl}>
            Sound preview
          </audio>
        ) : (
          <div className="sound-placeholder">Sound player placeholder</div>
        )}
      </section>

      {aiDetails && (
        <details className="soft-card full-span profile-detail-card">
          <summary>Open Bird Council notes · {formatConfidence(aiDetails.confidence)}</summary>
          <dl className="bird-meta profile-meta">
            {[
              ['Why this bird', aiDetails.whyThisBird],
              ['Personality note', aiDetails.cutePersonalityLine],
              ['Habitat', aiDetails.habitat],
              ['Diet', aiDetails.diet],
              ['Similar birds', aiDetails.similarBirds?.join(', ')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || 'Not recorded yet'}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marlie's sightings</p>
            <h3>Photos and memories</h3>
          </div>
          <span className="status-pill">{sightings.length} sighting{sightings.length === 1 ? '' : 's'}</span>
        </div>
        {sightings.length === 0 ? (
          <EmptyState text="No personal sightings for this bird yet." />
        ) : (
          <div className="profile-sighting-grid">
            {sightings.map((sighting) => (
              <article className="profile-sighting-card" key={sighting.id}>
                {sighting.photo ? (
                  <img src={sighting.photo} alt={sighting.birdName} />
                ) : (
                  <div className="placeholder-photo">
                    <span>{getBirdPhotoPlaceholderLabel(sighting.birdName)}</span>
                  </div>
                )}
                <div>
                  <strong>{formatDate(sighting.dateSpotted)}</strong>
                  <p>{sighting.location || 'Secret location'}</p>
                  {sighting.notes && <p className="notes-preview">{sighting.notes}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RewardsPage({ data, stats, claimReward }) {
  const revealedRewards = data.rewards.filter((reward) => reward.status !== 'Locked')
  const claimedRewards = revealedRewards.filter((reward) =>
    ['Claimed', 'Paid'].includes(reward.status),
  )
  const unlockedNotes = data.hiddenNotes.filter((note) => note.unlocked)
  const birdsUntilReward = stats.nextReward
    ? Math.max(stats.nextReward.milestone - stats.uniqueCount, 0)
    : 0

  return (
    <div className="page-grid surprises-page">
      <section className="soft-card full-span mystery-reward-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Gift shelf</p>
            <h2>The next gift is wrapped</h2>
          </div>
          <span className="status-pill">🎁</span>
        </div>
        <p>
          {stats.nextReward
            ? `${birdsUntilReward} bird${birdsUntilReward === 1 ? '' : 's'} until it opens.`
            : 'Every visible gift is open. Legendary shelves are whispering.'}
        </p>
        <div className="progress-track">
          <span style={{ width: `${stats.progressValue}%` }}></span>
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Surprises</p>
            <h2>Gifts waiting to open</h2>
          </div>
        </div>
        {revealedRewards.length === 0 ? (
          <EmptyState text="A tiny surprise is waiting behind the next bird." />
        ) : (
          <div className="reward-grid">
            {revealedRewards.map((reward) => (
              <article className="reward-card gift-card" key={reward.id}>
                <div className="gift-box" aria-hidden="true">🎁</div>
                <div>
                  <span className={`status-pill ${reward.status.toLowerCase()}`}>
                    {reward.status === 'Unlocked' ? 'Ready' : reward.status}
                  </span>
                  <h3>{reward.name}</h3>
                  <details className="tiny-details">
                    <summary>Peek at why</summary>
                    <p>{reward.unlockReason}</p>
                  </details>
                </div>
                {reward.status === 'Unlocked' && (
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => claimReward(reward.id)}
                  >
                    Open gift
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Opened</p>
            <h2>Gift memories</h2>
          </div>
          <span className="status-pill">{claimedRewards.length}</span>
        </div>
        {claimedRewards.length === 0 ? (
          <div className="claimed-reward-list">
            <EmptyState text="Marnich Bank is waiting nervously." />
          </div>
        ) : (
          <div className="certificate-grid">
            {data.rewardCertificates
              .filter((certificate) =>
                claimedRewards.some((reward) => reward.id === certificate.rewardId),
              )
              .map((certificate) => (
                <article className="certificate gift-certificate" key={certificate.id}>
                  <p className="eyebrow">Opened gift</p>
                  <h3>{certificate.rewardName}</h3>
                  <p>{formatDate(certificate.date)}</p>
                  <details className="tiny-details">
                    <summary>Open the little note</summary>
                    <p>{certificate.unlockReason}</p>
                  </details>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hidden notes</p>
            <h2>Unlocked only</h2>
          </div>
          <span className="status-pill">{unlockedNotes.length}</span>
        </div>
        {unlockedNotes.length === 0 ? (
          <EmptyState text="A folded note is waiting for the right bird moment." />
        ) : (
          <div className="notes-grid">
            {unlockedNotes.map((note) => (
              <article className="note-card unlocked" key={note.id}>
                <p className="eyebrow">
                  {note.milestone ? `${note.milestone} bird milestone` : 'Secret unlock'}
                </p>
                <h3>{note.title}</h3>
                <p>{note.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ChallengesPage({ dailyChallenge, completeDailyChallenge }) {
  return (
    <div className="page-grid">
      <section className="soft-card feature-card full-span">
        <p className="eyebrow">Today's Challenge</p>
        <h2>{dailyChallenge.main?.text || 'Find one suspicious bird moment'}</h2>
        <p>The Bird Council has prepared today’s mission.</p>
        <button
          className="primary-btn"
          type="button"
          disabled={dailyChallenge.mainComplete}
          onClick={() => completeDailyChallenge('daily')}
        >
          {dailyChallenge.mainComplete ? 'Council stamped' : 'Complete daily mission'}
        </button>
      </section>

      <section className="soft-card subtle-bonus-card full-span">
        <p className="eyebrow">Optional bonus</p>
        <h3>{dailyChallenge.bonus?.text || 'Notice one extra tiny detail'}</h3>
        <p>This one is optional. The Bird Council will pretend to be casual about it.</p>
        <button
          className="secondary-btn"
          type="button"
          disabled={dailyChallenge.bonusComplete}
          onClick={() => completeDailyChallenge('bonus')}
        >
          {dailyChallenge.bonusComplete ? 'Bonus stamped' : 'Complete bonus'}
        </button>
      </section>
    </div>
  )
}

function HiddenNotesPage({ data }) {
  const unlockedNotes = data.hiddenNotes.filter((note) => note.unlocked)

  return (
    <section className="soft-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hidden Notes from Marnich</p>
          <h2>Marlie's hidden bird notes</h2>
        </div>
        <span className="status-pill">
          {unlockedNotes.length}
        </span>
      </div>
      <div className="notes-grid">
        {unlockedNotes.length === 0 && (
          <EmptyState text="A folded note is waiting for the right bird moment." />
        )}
        {unlockedNotes.map((note) => (
          <article className="note-card unlocked" key={note.id}>
            <p className="eyebrow">
              {note.milestone ? `${note.milestone} bird milestone` : 'Secret unlock'}
            </p>
            <h3>{note.title}</h3>
            <p>{note.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function MissedBirdsPage({ data, missedDraft, setMissedDraft, logMissedSighting }) {
  return (
    <div className="page-grid">
      <section className="soft-card">
        <p className="eyebrow">Pity Coin Department</p>
        <h2>Marlie's Birds That Got Away</h2>
        <p>The bird escaped, but Marlie's effort has been recognised.</p>
        <div className="form-grid">
          <label>
            Location
            <input
              value={missedDraft.location}
              onChange={(event) =>
                setMissedDraft({ ...missedDraft, location: event.target.value })
              }
              placeholder="Where did the suspect flee?"
            />
          </label>
          <label>
            Note
            <textarea
              value={missedDraft.note}
              onChange={(event) =>
                setMissedDraft({ ...missedDraft, note: event.target.value })
              }
              placeholder="Optional evidence statement"
            />
          </label>
        </div>
        <button className="primary-btn" type="button" onClick={() => logMissedSighting()}>
          Log missed bird
        </button>
      </section>

      <section className="soft-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Escape records</p>
            <h2>{data.missedSightings.length} incidents</h2>
          </div>
          <span className="status-pill">{data.pityCoins} pity coins</span>
        </div>
        <div className="mini-list">
          {data.missedSightings.length === 0 && (
            <EmptyState text="No escape incidents yet. Suspiciously peaceful." />
          )}
          {data.missedSightings.map((missed) => (
            <article className="missed-card" key={missed.id}>
              <span className="tag warm">{missed.status}</span>
              <h3>{missed.location || 'Unknown location'}</h3>
              <p>{missed.note || 'No further evidence was provided.'}</p>
              <p className="fine-print">{formatDate(missed.date)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BirdDatePage({ data, rotateDateMission, completeBirdDate }) {
  return (
    <div className="page-grid">
      <section className="soft-card feature-card full-span">
        <p className="eyebrow">Bird Date Mode</p>
        <h2>{data.settings.currentDateMission}</h2>
        <p>
          Complete the mission together to earn +100 of Marlie's Feather Coins and save a memory as
          "Spotted with Marnich".
        </p>
        <div className="button-row">
          <button className="secondary-btn" type="button" onClick={rotateDateMission}>
            New mission
          </button>
          <button className="primary-btn" type="button" onClick={completeBirdDate}>
            Complete Bird Date
          </button>
        </div>
      </section>
      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Date memories</p>
            <h2>Marlie's bird date memories</h2>
          </div>
          <span className="status-pill">{data.dateMemories.length}</span>
        </div>
        <div className="memory-timeline">
          {data.dateMemories.length === 0 && (
            <EmptyState text="Your next bird date memory will land here." />
          )}
          {data.dateMemories.map((memory) => (
            <article className="memory-card" key={memory.id}>
              <p className="eyebrow">{formatDate(memory.date)}</p>
              <h3>{memory.note}</h3>
              <p>{memory.mission}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BingoPage({ data, toggleBingo }) {
  return (
    <section className="soft-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bird Bingo</p>
          <h2>Complete a row for +100 Marlie's Feather Coins</h2>
        </div>
        <span className="status-pill">{data.bingo.completedRows.length} rows</span>
      </div>
      <div className="bingo-board">
        {data.bingo.squares.map((square, index) => (
          <button
            className={square.checked ? 'bingo-square checked' : 'bingo-square'}
            key={square.id}
            type="button"
            onClick={() => toggleBingo(index)}
          >
            <span>{square.checked ? '✓' : '○'}</span>
            {square.text}
          </button>
        ))}
      </div>
    </section>
  )
}

function SecretCodesPage({ data, redeemCode }) {
  const [code, setCode] = useState('')

  function submitCode(event) {
    event.preventDefault()
    redeemCode(code)
    setCode('')
  }

  return (
    <div className="page-grid">
      <section className="soft-card feature-card">
        <p className="eyebrow">Secret Codes</p>
        <h2>Enter a tiny password</h2>
        <form onSubmit={submitCode} className="code-form">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="ROBIN50"
          />
          <button className="primary-btn" type="submit">
            Redeem
          </button>
        </form>
      </section>
      <section className="soft-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Secret status</p>
            <h2>Quiet paperwork</h2>
          </div>
          <span className="status-pill">
            {data.secretCodes.filter((item) => item.redeemed).length} used
          </span>
        </div>
        <p>Marnich Bank refuses to display the full code book in public.</p>
      </section>
    </div>
  )
}

function WeeklyMagazinePage({ data, openBirdProfile }) {
  const issue = getWeeklyMagazineIssue(data.birdLibrary, data.settings)
  const featuredBirds = issue.featuredBirds
  const birdOfWeek = issue.birdOfWeek

  return (
    <div className="magazine-page">
      <section className="magazine-cover">
        <p className="eyebrow">Open the cover</p>
        <h2>Weekly Feather</h2>
        <p>Issue: Week {issue.week}</p>
        <span className="status-pill">This week’s feather issue</span>
      </section>

      {birdOfWeek && (
        <section className="soft-card full-span bird-of-week-card">
          <div>
            <p className="eyebrow">Cover bird</p>
            <h2>{birdOfWeek.commonName}</h2>
            <p>{birdOfWeek.description}</p>
            <div className="tag-row">
              <span className={birdOfWeek.seen ? 'status-pill paid' : 'status-pill locked'}>
                {birdOfWeek.seen ? 'Seen by Marlie ✅' : 'Not spotted yet'}
              </span>
              <span className="tag">{birdOfWeek.category}</span>
            </div>
            <button
              className="primary-btn"
              type="button"
              onClick={() => openBirdProfile({ source: 'library', id: birdOfWeek.id })}
            >
              Open bird profile
            </button>
          </div>
          {birdOfWeek.imageUrl ? (
            <img className="profile-main-photo" src={birdOfWeek.imageUrl} alt={birdOfWeek.commonName} />
          ) : (
            <div className="profile-main-photo placeholder-photo">
              <span>{getBirdPhotoPlaceholderLabel(birdOfWeek.commonName)}</span>
            </div>
          )}
        </section>
      )}

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inside this issue</p>
            <h2>Five birds to dream about</h2>
          </div>
        </div>
        <div className="magazine-grid">
          {featuredBirds.map((bird) => (
            <article className="magazine-bird-card" key={bird.id}>
              {bird.imageUrl ? (
                <img src={bird.imageUrl} alt={bird.commonName} />
              ) : (
                <div className="magazine-photo-placeholder">
                  <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
                </div>
              )}
              <div>
                <span className={bird.seen ? 'status-pill paid' : 'status-pill locked'}>
                  {bird.seen ? 'Seen by Marlie ✅' : 'Not spotted yet'}
                </span>
                <h3>{bird.commonName}</h3>
                <p className="nickname">{bird.afrikaansName}</p>
                <p>{bird.funFact || bird.description}</p>
                <button
                  className="secondary-btn wide"
                  type="button"
                  onClick={() => openBirdProfile({ source: 'library', id: bird.id })}
                >
                  Open bird profile
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card magazine-note">
        <p className="eyebrow">This week’s challenge</p>
        <h3>{data.magazineIssue.monthlyChallenge}</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Try this</p>
        <h3>Try to spot one of this week’s birds</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Marnich’s note</p>
        <h3>{data.magazineIssue.marnichMessage}</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Reward hint</p>
        <h3>{data.magazineIssue.rewardHint}</h3>
      </section>
    </div>
  )
}

function ProfilePage({ data, stats, goTo }) {
  const levelTarget = stats.nextLevel?.birds || stats.uniqueCount || 1
  const levelProgressValue = Math.min(100, Math.round((stats.uniqueCount / levelTarget) * 100))

  return (
    <div className="page-grid profile-page">
      <section className="soft-card profile-hero full-span">
        <div>
          <p className="eyebrow">Pooks' feather level</p>
          <h2>{stats.currentLevel.title}</h2>
          <p>{stats.uniqueCount} bird memories are tucked into the album.</p>
        </div>
        <div className="coin-orbit small">
          <span>{data.featherCoins}</span>
          <small>Feather Coins</small>
        </div>
      </section>

      <section className="soft-card">
        <p className="eyebrow">Next title</p>
        <h3>{stats.nextLevel?.title || 'Legendary Bird Queen'}</h3>
        <div className="progress-track">
          <span style={{ width: `${levelProgressValue}%` }}></span>
        </div>
        <p>
          {stats.nextLevel
            ? `${stats.nextLevel.birds - stats.uniqueCount} birds until the next title.`
            : 'The Bird Council has run out of normal titles.'}
        </p>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Profile shortcuts</p>
            <h2>Little doors</h2>
          </div>
        </div>
        <div className="button-row">
          <button className="secondary-btn" type="button" onClick={() => goTo('rewards')}>
            Open surprises
          </button>
          <button className="secondary-btn" type="button" onClick={() => goTo('magazine')}>
            Read magazine
          </button>
        </div>
      </section>
    </div>
  )
}

function AdminPage({
  data,
  addAdminReward,
  addAdminChallenge,
  addAdminNote,
  addAdminCode,
  markRewardPaid,
  resetData,
  resetIntroScreen,
  previewMarlieView,
  previewMagazineIssue,
  setData,
}) {
  const [rewardDraft, setRewardDraft] = useState({
    name: '',
    milestone: '',
    unlockReason: '',
  })
  const [challengeText, setChallengeText] = useState('')
  const [noteDraft, setNoteDraft] = useState({
    title: '',
    milestone: '',
    message: '',
  })
  const [codeDraft, setCodeDraft] = useState({ code: '', amount: 50 })
  const [magazineDraft, setMagazineDraft] = useState(data.magazineIssue)
  const [libraryDraft, setLibraryDraft] = useState({
    commonName: '',
    afrikaansName: '',
    scientificName: '',
    category: 'Garden birds',
    tags: ['Garden birds'],
    region: '',
    habitat: '',
    diet: '',
    colours: '',
    size: '',
    whereFoundInSouthAfrica: '',
    description: '',
    funFact: '',
    funFacts: [],
    soundDescription: '',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  })

  function submitReward(event) {
    event.preventDefault()
    addAdminReward(rewardDraft)
    setRewardDraft({ name: '', milestone: '', unlockReason: '' })
  }

  function submitChallenge(event) {
    event.preventDefault()
    addAdminChallenge(challengeText)
    setChallengeText('')
  }

  function submitNote(event) {
    event.preventDefault()
    addAdminNote(noteDraft)
    setNoteDraft({ title: '', milestone: '', message: '' })
  }

  function submitCode(event) {
    event.preventDefault()
    addAdminCode(codeDraft)
    setCodeDraft({ code: '', amount: 50 })
  }

  function saveMagazineIssue(event) {
    event.preventDefault()
    setData((current) => ({
      ...current,
      magazineIssue: { ...current.magazineIssue, ...magazineDraft },
    }))
  }

  function submitLibraryBird(event) {
    event.preventDefault()
    if (!libraryDraft.commonName.trim()) return
    const id = getBirdLibraryId(libraryDraft.commonName)
    setData((current) => ({
      ...current,
      birdLibrary: [
        ...current.birdLibrary,
        normalizeLibraryBird({
          ...libraryDraft,
          id: `library-${id}-${Date.now()}`,
          commonName: libraryDraft.commonName.trim(),
          tags: [libraryDraft.category],
          funFacts: getFunFacts(libraryDraft.funFact),
          seen: false,
          firstSeenDate: '',
          lastSeenDate: '',
          timesSeen: 0,
          herPhotos: [],
          aiDetails: null,
          birdCouncilReason: '',
        }),
      ],
    }))
    setLibraryDraft({
      commonName: '',
      afrikaansName: '',
      scientificName: '',
      category: 'Garden birds',
      tags: ['Garden birds'],
      region: '',
      habitat: '',
      diet: '',
      colours: '',
      size: '',
      whereFoundInSouthAfrica: '',
      description: '',
      funFact: '',
      funFacts: [],
      soundDescription: '',
      imageUrl: '',
      soundUrl: '',
      rarity: 'Common',
      featuredInMagazine: true,
    })
  }

  function updateChallenge(challengeId, field, value) {
    setData((current) => ({
      ...current,
      challenges: current.challenges.map((challenge) =>
        challenge.id === challengeId ? { ...challenge, [field]: value } : challenge,
      ),
    }))
  }

  function updateReward(rewardId, field, value) {
    setData((current) => ({
      ...current,
      rewards: current.rewards.map((reward) =>
        reward.id === rewardId
          ? {
              ...reward,
              [field]: field === 'milestone' ? Number(value) || null : value,
            }
          : reward,
      ),
    }))
  }

  function updateHiddenNote(noteId, field, value) {
    setData((current) => ({
      ...current,
      hiddenNotes: current.hiddenNotes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              [field]: field === 'milestone' ? Number(value) || null : value,
            }
          : note,
      ),
    }))
  }

  function updateSecretCode(codeValue, field, value) {
    setData((current) => ({
      ...current,
      secretCodes: current.secretCodes.map((secretCode) =>
        secretCode.code === codeValue
          ? {
              ...secretCode,
              [field]: field === 'amount' ? Number(value) || 0 : value,
            }
          : secretCode,
      ),
    }))
  }

  function updateLibraryBird(birdId, field, value) {
    setData((current) => ({
      ...current,
      birdLibrary: current.birdLibrary.map((bird) => {
        if (bird.id !== birdId) return bird

        const parsedValue =
          field === 'timesSeen'
            ? Number(value) || 0
            : field === 'seen'
              ? Boolean(value)
              : value
        const nextBird = normalizeLibraryBird({
          ...bird,
          [field]: parsedValue,
          ...(field === 'category' ? { tags: [value] } : {}),
        })

        if (field !== 'seen') return nextBird

        return parsedValue
          ? normalizeLibraryBird({
              ...nextBird,
              firstSeenDate: nextBird.firstSeenDate || todayValue(),
              lastSeenDate: nextBird.lastSeenDate || todayValue(),
              timesSeen: nextBird.timesSeen || 1,
            })
          : {
              ...nextBird,
              seenAt: '',
              firstSeenDate: '',
              lastSeenDate: '',
              timesSeen: 0,
              herPhotos: [],
              aiDetails: null,
              birdCouncilReason: '',
            }
      }),
    }))
  }

  function resetSaBirdLibraryProgress() {
    if (!window.confirm("Reset Marlie's SA Bird Library seen progress? My Birds will stay saved.")) {
      return
    }
    setData((current) => ({
      ...current,
      birdLibrary: resetLibrarySeenProgress(current.birdLibrary),
    }))
  }

  function unlockRareBeauty() {
    setData((current) =>
      recalculateState({
        ...current,
        settings: {
          ...current.settings,
          rareBeautyUnlocked: true,
        },
      }),
    )
  }

  return (
    <div className="page-grid admin-grid">
      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Admin View</p>
            <h2>Marnich control room</h2>
          </div>
          <div className="admin-actions">
            <button className="primary-btn" type="button" onClick={previewMarlieView}>
              Preview Marlie View
            </button>
            <button className="secondary-btn" type="button" onClick={previewMagazineIssue}>
              Preview weekly issue
            </button>
            <button className="ghost-btn" type="button" onClick={resetIntroScreen}>
              Reset intro screen
            </button>
            <button className="ghost-btn" type="button" onClick={resetSaBirdLibraryProgress}>
              Reset SA Bird progress
            </button>
            <button className="danger-btn" type="button" onClick={resetData}>
              Reset local data
            </button>
          </div>
        </div>
        <div className="admin-stats">
          <StatCard label="Sightings" value={data.sightings.length} detail="Local only" />
          <StatCard label="Species" value={data.birds.length} detail="Checklist records" />
          <StatCard label="Rewards" value={data.rewards.length} detail="Milestone + secret" />
          <StatCard label="Codes" value={data.secretCodes.length} detail="One-time use" />
          <StatCard
            label="Daily stamps"
            value={Object.keys(data.dailyChallengeCompletions).length}
            detail="Completed challenge dates"
          />
          <StatCard label="Library" value={data.birdLibrary.length} detail="SA bird entries" />
        </div>
      </section>

      <section className="soft-card">
        <h3>Add reward</h3>
        <form onSubmit={submitReward} className="form-grid">
          <input
            value={rewardDraft.name}
            onChange={(event) => setRewardDraft({ ...rewardDraft, name: event.target.value })}
            placeholder="Reward name"
          />
          <input
            type="number"
            value={rewardDraft.milestone}
            onChange={(event) =>
              setRewardDraft({ ...rewardDraft, milestone: event.target.value })
            }
            placeholder="Bird milestone"
          />
          <textarea
            value={rewardDraft.unlockReason}
            onChange={(event) =>
              setRewardDraft({ ...rewardDraft, unlockReason: event.target.value })
            }
            placeholder="Unlock reason"
          />
          <button className="primary-btn" type="submit">Add reward</button>
        </form>
      </section>

      <section className="soft-card">
        <h3>Daily challenge pool</h3>
        <form onSubmit={submitChallenge} className="form-grid">
          <input
            value={challengeText}
            onChange={(event) => setChallengeText(event.target.value)}
            placeholder="Spot a bird doing something suspicious"
          />
          <button className="primary-btn" type="submit">Add challenge</button>
        </form>
        <div className="admin-edit-list">
          {data.challenges.map((challenge) => (
            <article key={challenge.id} className="admin-edit-row">
              <input
                value={challenge.text}
                onChange={(event) => updateChallenge(challenge.id, 'text', event.target.value)}
                aria-label={`Edit ${challenge.text}`}
              />
              <select
                value={challenge.cadence}
                onChange={(event) => updateChallenge(challenge.id, 'cadence', event.target.value)}
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Custom</option>
                <option>Bonus</option>
              </select>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <h3>Add hidden note</h3>
        <form onSubmit={submitNote} className="form-grid">
          <input
            value={noteDraft.title}
            onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })}
            placeholder="Note title"
          />
          <input
            type="number"
            value={noteDraft.milestone}
            onChange={(event) => setNoteDraft({ ...noteDraft, milestone: event.target.value })}
            placeholder="Bird milestone"
          />
          <textarea
            value={noteDraft.message}
            onChange={(event) => setNoteDraft({ ...noteDraft, message: event.target.value })}
            placeholder="Personal note"
          />
          <button className="primary-btn" type="submit">Add note</button>
        </form>
        <div className="admin-edit-list">
          {data.hiddenNotes.map((note) => (
            <article key={note.id} className="admin-edit-row stacked">
              <input
                value={note.title}
                onChange={(event) => updateHiddenNote(note.id, 'title', event.target.value)}
                aria-label={`Edit note title ${note.title}`}
              />
              <input
                type="number"
                value={note.milestone || ''}
                onChange={(event) => updateHiddenNote(note.id, 'milestone', event.target.value)}
                placeholder="Milestone"
              />
              <textarea
                value={note.message}
                onChange={(event) => updateHiddenNote(note.id, 'message', event.target.value)}
              />
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={note.unlocked}
                  onChange={(event) => updateHiddenNote(note.id, 'unlocked', event.target.checked)}
                />
                Unlocked for Marlie
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <h3>Add secret code</h3>
        <label className="check-card">
          <input
            type="checkbox"
            checked={data.settings.secretCodesVisible}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  secretCodesVisible: event.target.checked,
                },
              }))
            }
          />
          Show Secret tab in Marlie View
        </label>
        <form onSubmit={submitCode} className="form-grid">
          <input
            value={codeDraft.code}
            onChange={(event) => setCodeDraft({ ...codeDraft, code: event.target.value })}
            placeholder="LOVE100"
          />
          <input
            type="number"
            value={codeDraft.amount}
            onChange={(event) => setCodeDraft({ ...codeDraft, amount: event.target.value })}
            placeholder="Coin amount"
          />
          <button className="primary-btn" type="submit">Add code</button>
        </form>
        <div className="admin-edit-list">
          {data.secretCodes.map((secretCode) => (
            <article key={secretCode.code} className="admin-edit-row stacked">
              <strong>{secretCode.code}</strong>
              <input
                value={secretCode.label}
                onChange={(event) =>
                  updateSecretCode(secretCode.code, 'label', event.target.value)
                }
                aria-label={`Edit label for ${secretCode.code}`}
              />
              <input
                type="number"
                value={secretCode.amount || 0}
                onChange={(event) =>
                  updateSecretCode(secretCode.code, 'amount', event.target.value)
                }
              />
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={Boolean(secretCode.redeemed)}
                  onChange={(event) =>
                    updateSecretCode(secretCode.code, 'redeemed', event.target.checked)
                  }
                />
                Redeemed
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <h3>Weekly magazine controls</h3>
        <label>
          Pinned bird of the week
          <select
            value={data.settings.pinnedBirdOfWeekId || ''}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  pinnedBirdOfWeekId: event.target.value,
                },
              }))
            }
          >
            <option value="">Auto-rotate weekly</option>
            {data.birdLibrary
              .slice()
              .sort((a, b) => a.commonName.localeCompare(b.commonName))
              .map((bird) => (
                <option key={bird.id} value={bird.id}>
                  {bird.commonName}
                </option>
              ))}
          </select>
        </label>
        <form onSubmit={saveMagazineIssue} className="form-grid">
          <textarea
            value={magazineDraft.monthlyChallenge}
            onChange={(event) =>
              setMagazineDraft({ ...magazineDraft, monthlyChallenge: event.target.value })
            }
            placeholder="Weekly challenge"
          />
          <textarea
            value={magazineDraft.birdDateIdea}
            onChange={(event) =>
              setMagazineDraft({ ...magazineDraft, birdDateIdea: event.target.value })
            }
            placeholder="Bird date idea"
          />
          <textarea
            value={magazineDraft.marnichMessage}
            onChange={(event) =>
              setMagazineDraft({ ...magazineDraft, marnichMessage: event.target.value })
            }
            placeholder="Message from Marnich"
          />
          <textarea
            value={magazineDraft.rewardHint}
            onChange={(event) =>
              setMagazineDraft({ ...magazineDraft, rewardHint: event.target.value })
            }
            placeholder="Reward hint"
          />
          <button className="primary-btn" type="submit">Save magazine copy</button>
          <button className="secondary-btn" type="button" onClick={previewMagazineIssue}>
            Preview this week’s magazine issue
          </button>
        </form>
      </section>

      <section className="soft-card">
        <h3>Reward details and payment status</h3>
        <div className="admin-edit-list">
          {data.rewards.map((reward) => (
            <article key={reward.id} className="admin-edit-row stacked">
              <input
                value={reward.name}
                onChange={(event) => updateReward(reward.id, 'name', event.target.value)}
                aria-label={`Edit reward ${reward.name}`}
              />
              <input
                type="number"
                value={reward.milestone || ''}
                onChange={(event) => updateReward(reward.id, 'milestone', event.target.value)}
                placeholder="Milestone"
              />
              <textarea
                value={reward.unlockReason}
                onChange={(event) => updateReward(reward.id, 'unlockReason', event.target.value)}
              />
              <input
                value={reward.reference}
                onChange={(event) => updateReward(reward.id, 'reference', event.target.value)}
                placeholder="Reference"
              />
              <div className="button-row">
                <span className={`status-pill ${reward.status.toLowerCase()}`}>
                  {reward.status}
                </span>
                <button
                  className="text-btn"
                  type="button"
                  disabled={reward.status === 'Locked' || reward.status === 'Paid'}
                  onClick={() => markRewardPaid(reward.id)}
                >
                  Mark paid
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">South African Bird Library</p>
            <h2>View and edit SA Bird Library entries</h2>
          </div>
          <div className="admin-actions">
            <span className="status-pill">{data.birdLibrary.length} entries</span>
            <button className="ghost-btn" type="button" onClick={resetSaBirdLibraryProgress}>
              Reset seen progress
            </button>
          </div>
        </div>
        <form onSubmit={submitLibraryBird} className="form-grid two">
          <input
            value={libraryDraft.commonName}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, commonName: event.target.value })
            }
            placeholder="Common name"
          />
          <input
            value={libraryDraft.afrikaansName}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, afrikaansName: event.target.value })
            }
            placeholder="Afrikaans name"
          />
          <input
            value={libraryDraft.scientificName}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, scientificName: event.target.value })
            }
            placeholder="Scientific name"
          />
          <select
            value={libraryDraft.category}
            onChange={(event) =>
              setLibraryDraft({
                ...libraryDraft,
                category: event.target.value,
                tags: [event.target.value],
              })
            }
          >
            {libraryFilters.slice(3).map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>
          <input
            value={libraryDraft.region}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, region: event.target.value })
            }
            placeholder="Region"
          />
          <input
            value={libraryDraft.habitat}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, habitat: event.target.value })
            }
            placeholder="Habitat"
          />
          <input
            value={libraryDraft.diet}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, diet: event.target.value })
            }
            placeholder="Diet"
          />
          <input
            value={libraryDraft.colours}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, colours: event.target.value })
            }
            placeholder="Colours"
          />
          <input
            value={libraryDraft.size}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, size: event.target.value })
            }
            placeholder="Size"
          />
          <input
            value={libraryDraft.whereFoundInSouthAfrica}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, whereFoundInSouthAfrica: event.target.value })
            }
            placeholder="Where found in South Africa"
          />
          <input
            value={libraryDraft.imageUrl}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, imageUrl: event.target.value })
            }
            placeholder="Image URL or placeholder"
          />
          <input
            value={libraryDraft.soundUrl}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, soundUrl: event.target.value })
            }
            placeholder="Sound URL placeholder"
          />
          <select
            value={libraryDraft.rarity}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, rarity: event.target.value })
            }
          >
            <option>Common</option>
            <option>Uncommon</option>
            <option>Rare</option>
          </select>
          <textarea
            value={libraryDraft.description}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, description: event.target.value })
            }
            placeholder="Short fun description"
          />
          <textarea
            value={libraryDraft.funFact}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, funFact: event.target.value })
            }
            placeholder="Fun fact"
          />
          <textarea
            value={libraryDraft.soundDescription}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, soundDescription: event.target.value })
            }
            placeholder="Sound description"
          />
          <label className="check-card">
            <input
              type="checkbox"
              checked={libraryDraft.featuredInMagazine}
              onChange={(event) =>
                setLibraryDraft({ ...libraryDraft, featuredInMagazine: event.target.checked })
              }
            />
            Feature in weekly magazine
          </label>
          <button className="primary-btn" type="submit">Add library bird</button>
        </form>

        <div className="admin-library-grid">
          {data.birdLibrary.map((bird) => (
            <article className="admin-library-card" key={bird.id}>
              <input
                value={bird.commonName}
                onChange={(event) => updateLibraryBird(bird.id, 'commonName', event.target.value)}
                aria-label={`Edit ${bird.commonName}`}
              />
              <input
                value={bird.afrikaansName}
                onChange={(event) => updateLibraryBird(bird.id, 'afrikaansName', event.target.value)}
                placeholder="Afrikaans"
              />
              <input
                value={bird.scientificName}
                onChange={(event) =>
                  updateLibraryBird(bird.id, 'scientificName', event.target.value)
                }
                placeholder="Scientific"
              />
              <select
                value={bird.category}
                onChange={(event) => updateLibraryBird(bird.id, 'category', event.target.value)}
              >
                {libraryFilters.slice(3).map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
                {!libraryFilters.includes(bird.category) && (
                  <option>{bird.category}</option>
                )}
              </select>
              <input
                value={bird.region}
                onChange={(event) => updateLibraryBird(bird.id, 'region', event.target.value)}
                placeholder="Region"
              />
              <input
                value={bird.habitat || ''}
                onChange={(event) => updateLibraryBird(bird.id, 'habitat', event.target.value)}
                placeholder="Habitat"
              />
              <input
                value={bird.diet || ''}
                onChange={(event) => updateLibraryBird(bird.id, 'diet', event.target.value)}
                placeholder="Diet"
              />
              <input
                value={bird.colours || ''}
                onChange={(event) => updateLibraryBird(bird.id, 'colours', event.target.value)}
                placeholder="Colours"
              />
              <input
                value={bird.size || ''}
                onChange={(event) => updateLibraryBird(bird.id, 'size', event.target.value)}
                placeholder="Size"
              />
              <input
                value={bird.whereFoundInSouthAfrica || ''}
                onChange={(event) =>
                  updateLibraryBird(bird.id, 'whereFoundInSouthAfrica', event.target.value)
                }
                placeholder="Where found in South Africa"
              />
              <input
                value={bird.imageUrl}
                onChange={(event) => updateLibraryBird(bird.id, 'imageUrl', event.target.value)}
                placeholder="Image URL"
              />
              <input
                value={bird.soundUrl}
                onChange={(event) => updateLibraryBird(bird.id, 'soundUrl', event.target.value)}
                placeholder="Sound URL"
              />
              <select
                value={bird.rarity}
                onChange={(event) => updateLibraryBird(bird.id, 'rarity', event.target.value)}
              >
                <option>Common</option>
                <option>Uncommon</option>
                <option>Rare</option>
              </select>
              <textarea
                value={bird.description}
                onChange={(event) => updateLibraryBird(bird.id, 'description', event.target.value)}
              />
              <textarea
                value={bird.funFact}
                onChange={(event) => updateLibraryBird(bird.id, 'funFact', event.target.value)}
              />
              <textarea
                value={bird.soundDescription || ''}
                onChange={(event) =>
                  updateLibraryBird(bird.id, 'soundDescription', event.target.value)
                }
                placeholder="Sound description"
              />
              <div className="form-grid two">
                <input
                  type="number"
                  value={bird.timesSeen || 0}
                  onChange={(event) => updateLibraryBird(bird.id, 'timesSeen', event.target.value)}
                  placeholder="Times seen"
                />
                <input
                  type="date"
                  value={bird.firstSeenDate || ''}
                  onChange={(event) =>
                    updateLibraryBird(bird.id, 'firstSeenDate', event.target.value)
                  }
                />
              </div>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={Boolean(bird.featuredInMagazine)}
                  onChange={(event) =>
                    updateLibraryBird(bird.id, 'featuredInMagazine', event.target.checked)
                  }
                />
                Featured in weekly magazine
              </label>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={Boolean(bird.seen)}
                  onChange={(event) => updateLibraryBird(bird.id, 'seen', event.target.checked)}
                />
                Mark seen by Marlie
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <h3>Hidden shop catalog</h3>
        <div className="mini-list">
          {shopItems.map((item) => (
            <p key={item.id}>
              <strong>{item.name}</strong> - {item.cost} Feather Coins
            </p>
          ))}
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Future placeholders</p>
            <h2>Phase 2 hooks</h2>
          </div>
          <button className="secondary-btn" type="button" onClick={unlockRareBeauty}>
            Unlock Rare Beauty badge
          </button>
        </div>
        <div className="future-grid">
          {futureFeatures.map((feature) => (
            <article key={feature}>
              <span>Later</span>
              <p>{feature}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">🪶</span>
      <p>{text}</p>
    </div>
  )
}

export default App
