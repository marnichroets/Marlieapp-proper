import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { defaultBirdLibrary } from './data/saBirdLibrary'
import { getSeasonInfo } from './seasons'
import { WeeklyBird, SeasonalAmbient } from './birds'
import { getWeeklyBird, weeklyFaviconDataUrl } from './birdData'
import { TweetyHomeCard, TweetyStatsPage, TweetyFamilyCard, AviaryCard } from './Tweety'
import {
  defaultTweety,
  tweetyToday,
  tweetyStreak,
  tweetyMood,
  tweetyLevel,
  tweetyTodayKey,
  playChirp,
  babyStage,
  releaseCoins,
  AVIARY_MAX,
  RARE_EGG_BIRDS,
} from './tweetyData'
import { BirdStore } from './BirdStore'
import { defaultStore, rainbowActive, tweetyNeverSad, isOwned } from './store'
import { GamesHub } from './games'
import { defaultGames } from './gamesData'

function bumpLeaderboard(lb, winner) {
  return {
    pooksWins: lb.pooksWins + (winner === 'pooks' ? 1 : 0),
    marnichWins: lb.marnichWins + (winner === 'marnich' ? 1 : 0),
    draws: lb.draws + (winner === 'draw' ? 1 : 0),
  }
}

const STORAGE_KEY = 'marlie-bird-app-v1'
// Fall back to the known Railway backend if the build env var is missing, so
// real AI identification still works even when VITE_BIRD_API_URL wasn't set.
const DEFAULT_BIRD_API_URL = 'https://marlieapp-proper-production.up.railway.app'
const BIRD_API_URL = String(import.meta.env.VITE_BIRD_API_URL || DEFAULT_BIRD_API_URL).replace(
  /\/+$/,
  '',
)
const XENO_CANTO_KEY_STORAGE = 'pooks-xeno-canto-key'
// NOTE: import.meta.env.VITE_* is inlined at BUILD time, not read at runtime.
// .trim() guards against a stray newline/space if the key was pasted in Vercel.
const XENO_CANTO_ENV_KEY = String(import.meta.env.VITE_XENO_CANTO_KEY || '').trim()

function getXenoCantoKey() {
  try {
    const stored = (localStorage.getItem(XENO_CANTO_KEY_STORAGE) || '').trim()
    return XENO_CANTO_ENV_KEY || stored
  } catch {
    return XENO_CANTO_ENV_KEY
  }
}

// One-time diagnostic on load: confirms whether the build baked in the key.
// Only a boolean + length are logged — never any part of the key value.
if (typeof window !== 'undefined') {
  console.log(
    '[xeno-canto] VITE_XENO_CANTO_KEY baked into this build?',
    Boolean(XENO_CANTO_ENV_KEY),
    '| length:',
    XENO_CANTO_ENV_KEY.length,
  )
}
const OFFLINE_BIRD_COUNCIL_MESSAGE =
  'The Bird Council is practicing offline, so this is a demo result.'

const SESSION_STORAGE_KEY = 'marlie-bird-session-v1'

// Coin earning rules (rebalanced so coins feel valuable).
const COINS = {
  spot: 30,
  firstSpecies: 10,
  withMarnich: 25,
  dailyChallenge: 20,
  streakBonus: 15,
  tweetyCare: 5,
  tweetyStreak: 50,
}

// Bonus coins when crossing a unique-species milestone.
const MILESTONE_COINS = {
  5: 50,
  10: 100,
  25: 200,
  50: 500,
  100: 1000,
}

function milestoneCoinsBetween(prevCount, nextCount) {
  return Object.entries(MILESTONE_COINS).reduce((sum, [threshold, coins]) => {
    const t = Number(threshold)
    return prevCount < t && nextCount >= t ? sum + coins : sum
  }, 0)
}

// Coin shop costs (rebalanced).
const SHOP = {
  mysteryBox: 300,
  hiddenNote: 200,
  birdProfile: 250,
  dateIdea: 500,
}

// Bottom tab bar (5) + everything else tucked behind the settings menu.
const bottomTabs = [
  ['home', 'Home', '🏡'],
  ['add', 'Spot', '📷'],
  ['magazine', 'Magazine', '📖'],
  ['library', 'Collection', '🦜'],
  ['rewards', 'Gifts', '🎁'],
]

const menuItems = [
  ['date', 'Date', '💕'],
  ['games', 'Date Games', '🎮'],
  ['profile', 'Pooks', '🪶'],
  ['birds', 'My memories', '🐦'],
]

const defaultMysteryGifts = [
  'You found a secret hug. Consider it delivered. 💛',
  'The Bird Council declares you officially adorable today.',
  'Surprise: Marnich owes you one chosen snack of your choice.',
  'A tiny love note fell out of the gift box: you make ordinary days magical.',
]

const defaultDateIdeas = [
  'Slow sunrise bird walk with takeaway coffee.',
  'Pack a picnic and see who can spot a yellow bird first.',
  'Golden-hour stroll, phones away, just birds and us.',
  'Botanical garden wander with a bird-spotting scorecard.',
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

// A new motivational/funny bird quote surfaces on the magazine cover each week.
const weeklyQuotes = [
  'Be bold like an eagle 🦅',
  'Even penguins find their flock 🐧',
  'The early bird gets the adventure ☀️',
  'Spread your wings, Pooks 🐦',
  'Tiny bird, big main-character energy ✨',
  'Stay curious, fly gently 🪶',
  'Some days you soar, some days you waddle — both count 🐧',
  'Find joy in small feathered things 💛',
  'Look up — the sky is full of stories 🌤️',
  'You + birds = the best kind of quiet 🌿',
  'Brave hearts notice the smallest wings 🤍',
  'Adventure is just outside the window 🍃',
  'Sing your own song like a robin 🎶',
  'Flock together, glow together 🌅',
]

function getWeeklyQuote(weekIndex = getAbsoluteWeekIndex()) {
  return weeklyQuotes[Math.abs(weekIndex) % weeklyQuotes.length]
}

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
  'Find a bird making noise and describe its song',
  'Spot a bird on a roof or fence',
  "Find a bird that isn't brown or grey",
  'Spot two different birds within 10 minutes',
  'Find a bird near water',
  "Spot a bird you've never photographed before",
  'Find a bird sitting perfectly still',
  'Spot a bird with yellow somewhere on it',
  'Catch a bird mid-flight with your eyes',
  'Find a bird that is eating something',
  'Spot a bird smaller than your hand',
  'Find a bird bigger than a loaf of bread',
  'Hear a bird before you see it',
  'Spot a bird in a tree above your head',
  'Find a bird walking on the ground',
  'Spot a bird with Marnich and describe the moment',
  'Find a bird doing something funny',
  'Spot a bird drinking or bathing in water',
  'Find a pair of birds together',
  'Spot a bird with a long tail',
  'Find a bird with a curved or pointy beak',
  'Spot a bird at sunrise or sunset',
  'Find a bird hiding in a bush',
  'Spot a bird sitting on a wire',
  'Find the most colourful bird you can today',
  'Spot a bird and guess what it was thinking',
  'Find a bird near your home',
  'Spot a bird you can hear but barely see',
  'Find a bird building or sitting near a nest',
  'Spot a bird and give it a secret nickname',
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
  'Near me',
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
    mysteryClue: '',
    nest: null,
    regionTags: [],
    nearMe: false,
    idTips: '',
    similarSpecies: [],
    bestTime: '',
    behaviour: '',
    callDescription: '',
    conservationStatus: 'Least Concern',
    fieldNotes: '',
    spottedAt: '',
    myPhotos: [],
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

function dateKeyOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Consecutive days (ending today or yesterday) with a completed daily mission.
function getDailyStreak(completions = {}) {
  let streak = 0
  let offset = 0
  if (!completions[dateKeyOffset(0)]?.daily) {
    if (!completions[dateKeyOffset(1)]?.daily) return 0
    offset = 1
  }
  while (completions[dateKeyOffset(offset)]?.daily) {
    streak += 1
    offset += 1
  }
  return streak
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
    fieldGuideNotes: {},
    tweety: defaultTweety(),
    store: defaultStore(),
    games: defaultGames(),
    discoveries: [],
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
      pooksSecret: 'feather',
      adminSecret: 'marnich',
      marnichDailyMessage:
        "I can't wait to see what tiny bird you find today. Have the best adventure. 💛",
      unlockedProfiles: [],
      unlockedDateIdeas: [],
      tweetyLetter: 'Dear Tweety, please look after my Pooks for me. 💛 — Marnich',
      marnichCode: '1972',
    },
    mysteryGifts: defaultMysteryGifts,
    dateIdeas: defaultDateIdeas,
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

// imageUrl and soundUrl are static reference data that lives in code, so they
// must always come from the latest defaults — never from stale saved state
// (otherwise an old empty imageUrl in localStorage hides the real photo).
function mergeBirdLibrary(defaultItems, savedItems) {
  const saved = Array.isArray(savedItems) ? savedItems : []
  const savedMap = new Map(saved.map((item) => [item.id, item]))
  const merged = defaultItems.map((item) => ({
    ...item,
    ...(savedMap.get(item.id) || {}),
    imageUrl: item.imageUrl,
    soundUrl: item.soundUrl,
  }))
  const defaultKeys = new Set(defaultItems.map((item) => item.id))
  return [...merged, ...saved.filter((item) => !defaultKeys.has(item.id))]
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
      fieldGuideNotes:
        saved.fieldGuideNotes && typeof saved.fieldGuideNotes === 'object'
          ? saved.fieldGuideNotes
          : base.fieldGuideNotes,
      tweety: { ...base.tweety, ...(saved.tweety || {}) },
      store: { ...base.store, ...(saved.store || {}) },
      games: { ...base.games, ...(saved.games || {}) },
      discoveries: Array.isArray(saved.discoveries) ? saved.discoveries : base.discoveries,
      birdLibrary: normalizeBirdLibrary(mergeBirdLibrary(base.birdLibrary, saved.birdLibrary)),
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
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [confetti, setConfetti] = useState(0)
  const [reveal, setReveal] = useState(null)
  const [rewardUnlockQueue, setRewardUnlockQueue] = useState([])
  const [missedDraft, setMissedDraft] = useState({ location: '', note: '' })
  const [birdProfile, setBirdProfile] = useState(null)
  const [tweetyDancing, setTweetyDancing] = useState(false)
  const [weeklyTip, setWeeklyTip] = useState(false)
  // Open the hidden admin login when the URL is /admin (or #admin).
  const [adminGate, setAdminGate] = useState(() => {
    try {
      return `${window.location.pathname}${window.location.hash}`.toLowerCase().includes('admin')
    } catch {
      return false
    }
  })
  const tapTrackerRef = useRef({ count: 0, last: 0 })

  // Secret tap sequence: 5 quick taps on the bird logo opens admin login.
  function handleBrandTap() {
    const now = Date.now()
    const tracker = tapTrackerRef.current
    tracker.count = now - tracker.last < 600 ? tracker.count + 1 : 1
    tracker.last = now
    if (tracker.count >= 5) {
      tracker.count = 0
      setAdminGate(true)
      return
    }
    setActivePage('home')
  }

  const dailyStreak = useMemo(
    () => getDailyStreak(data.dailyChallengeCompletions),
    [data.dailyChallengeCompletions],
  )

  const season = useMemo(() => getSeasonInfo(), [])
  const weekly = useMemo(() => getWeeklyBird(), [])
  const tweetyView = useMemo(() => {
    const today = tweetyToday(data.tweety)
    return {
      today,
      mood: tweetyMood(data.tweety, { neverSad: tweetyNeverSad(data.store) }),
      streak: tweetyStreak(data.tweety),
      level: tweetyLevel(data.birds.length),
      nestTier: data.store?.nest || 'basic',
      rainbow: rainbowActive(data.store),
      loveLetter: data.store?.loveLetter || '',
    }
  }, [data.tweety, data.birds.length, data.store])

  // Browser-tab favicon follows the weekly bird.
  useEffect(() => {
    let link = document.querySelector("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = 'image/svg+xml'
    link.href = weeklyFaviconDataUrl()
  }, [weekly.week])

  // Show a "new look this week" tooltip once when the weekly bird changes.
  useEffect(() => {
    if (!session) return undefined
    let stored = null
    try {
      stored = localStorage.getItem('pooks-weekly-bird')
    } catch {
      // ignore read errors
    }
    if (stored === String(weekly.week)) return undefined
    try {
      localStorage.setItem('pooks-weekly-bird', String(weekly.week))
    } catch {
      // ignore
    }
    let cancelled = false
    const show = window.setTimeout(() => {
      if (!cancelled) setWeeklyTip(true)
    }, 0)
    const hide = window.setTimeout(() => {
      if (!cancelled) setWeeklyTip(false)
    }, 3200)
    return () => {
      cancelled = true
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [weekly.week, session])

  // If Marnich left a surprise treat, Tweety does a happy dance on open.
  useEffect(() => {
    if (!session || session.role !== 'pooks') return undefined
    if (!data.tweety?.pendingTreat) return undefined
    let cancelled = false
    const start = window.setTimeout(() => {
      if (cancelled) return
      setTweetyDancing(true)
      setData((current) => ({
        ...current,
        tweety: { ...current.tweety, pendingTreat: false },
      }))
      setToast({
        title: 'A surprise treat! 🎁',
        body: `Marnich sent ${data.tweety?.name || 'Tweety'} a little treat. Look at that happy dance!`,
        tone: 'success',
      })
    }, 0)
    const stop = window.setTimeout(() => {
      if (!cancelled) setTweetyDancing(false)
    }, 2600)
    return () => {
      cancelled = true
      window.clearTimeout(start)
      window.clearTimeout(stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Daily aviary income: pay out once per day when birds live in the aviary.
  useEffect(() => {
    if (!session || session.role !== 'pooks') return undefined
    const aviary = data.tweety?.aviary || []
    const key = tweetyTodayKey()
    if (!aviary.length || data.tweety?.lastAviaryPayout === key) return undefined
    let cancelled = false
    window.setTimeout(() => {
      if (cancelled) return
      const coins = aviary.length * 3 + (aviary.length >= AVIARY_MAX ? 20 : 0)
      setData((current) => ({
        ...current,
        tweety: { ...current.tweety, lastAviaryPayout: key },
        featherCoins: current.featherCoins + coins,
      }))
      setToast({
        title: 'Aviary income 🏠',
        body: `Your ${aviary.length} aviary bird${aviary.length === 1 ? '' : 's'} earned +${coins} coins today!`,
        tone: 'success',
      })
    }, 0)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Clear the flock-treat flag after the happy dance has played once.
  useEffect(() => {
    if (!data.tweety?.flockTreat) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setData((current) => ({ ...current, tweety: { ...current.tweety, flockTreat: false } }))
      }
    }, 2600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [data.tweety?.flockTreat])

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

  useEffect(() => {
    if (!confetti) return undefined
    const timer = window.setTimeout(() => setConfetti(0), 2400)
    return () => window.clearTimeout(timer)
  }, [confetti])

  // Pooks' normal login. Admin is intentionally NOT reachable from here.
  function login(name, secret) {
    const cleanName = String(name || '').trim().toLowerCase()
    const cleanSecret = String(secret || '').trim()
    if (cleanName === 'pooks' || cleanName === 'marlie') {
      if (cleanSecret && cleanSecret === data.settings.pooksSecret) {
        const next = { role: 'pooks', name: 'Pooks' }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
        setSession(next)
        setActivePage('home')
        return true
      }
    }
    return false
  }

  // Separate, hidden admin login reached only via /admin or the secret tap.
  function adminLogin(secret) {
    const cleanSecret = String(secret || '').trim()
    if (cleanSecret && cleanSecret === data.settings.adminSecret) {
      const next = { role: 'admin', name: 'Marnich' }
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
      setSession(next)
      setAdminGate(false)
      setActivePage('admin')
      try {
        window.history.replaceState(null, '', '/')
      } catch {
        // ignore
      }
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
    setMenuOpen(false)
    setActivePage('home')
  }

  function sendSurpriseNote(message) {
    const text = String(message || '').trim()
    if (!text) return
    setData((current) => ({
      ...current,
      hiddenNotes: [
        {
          id: createId('surprise-note'),
          milestone: null,
          title: 'A surprise from Marnich 💛',
          message: text,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
        },
        ...current.hiddenNotes,
      ],
    }))
    setToast({
      title: 'Surprise note sent 💌',
      body: 'It is now waiting in her hidden notes.',
      tone: 'success',
    })
  }

  // Feed / water / play with Tweety. Always rewarding, never punishing.
  function careTweety(kind) {
    const field = kind === 'water' ? 'watered' : kind === 'play' ? 'played' : 'fed'
    const key = tweetyTodayKey()
    const today = data.tweety?.care?.[key] || { fed: false, watered: false, played: false }
    if (today[field]) return

    playChirp(kind)
    const nextToday = { ...today, [field]: true }
    const nextTweety = {
      ...data.tweety,
      care: { ...(data.tweety?.care || {}), [key]: nextToday },
    }

    let coins = COINS.tweetyCare
    let bonusNote = ''
    const becameFull = nextToday.fed && nextToday.watered && nextToday.played
    let newStreak = 0
    if (becameFull) {
      newStreak = tweetyStreak(nextTweety)
      let lastBonus = data.tweety?.lastBonusStreak || 0
      while (newStreak >= lastBonus + 7) {
        lastBonus += 7
        coins += COINS.tweetyStreak
        bonusNote = ` ${lastBonus}-day care streak! ${nextTweety.name || 'Tweety'} does a special celebration dance! +${COINS.tweetyStreak} bonus 🎉`
      }
      nextTweety.lastBonusStreak = lastBonus
    }

    // ----- Family lifecycle (egg laying + hatching) -----
    let familyNote = ''
    if (becameFull) {
      const todayKeyStr = tweetyTodayKey()
      if (nextTweety.egg) {
        // Progress the egg one step per distinct full-care day.
        if (nextTweety.egg.lastCareDay !== todayKeyStr) {
          const careDays = (nextTweety.egg.careDays || 0) + 1
          if (careDays >= 3) {
            // Hatch!
            const species = nextTweety.egg.species || 'little bird'
            nextTweety.baby = {
              hatchedAt: new Date().toISOString(),
              species,
              careLog: {},
            }
            nextTweety.egg = null
            setConfetti(Date.now())
            setReveal({
              tone: 'bird',
              title: 'The egg hatched! 🐣',
              body: `A baby ${species} popped out! Look after it while it grows up. 🎉`,
            })
          } else {
            nextTweety.egg = { ...nextTweety.egg, careDays, lastCareDay: todayKeyStr }
            familyNote = ` The egg wobbled… ${careDays}/3 days to hatch. 🥚`
          }
        }
      } else if (!nextTweety.baby && newStreak >= 7 && newStreak % 7 === 0) {
        // Lay an egg matching her most recent real sighting.
        const recent = [...data.sightings].reverse()[0]
        const species = recent?.birdName || data.birds[0]?.birdName || 'garden bird'
        nextTweety.egg = {
          laidAt: new Date().toISOString(),
          careDays: 0,
          lastCareDay: '',
          kind: 'normal',
          species,
        }
        familyNote = ' Tweety laid an egg! Keep caring for her while it hatches 🥚✨'
      }
    }

    const celebrate = kind === 'play' || Boolean(bonusNote)
    if (celebrate) {
      setTweetyDancing(true)
      if (bonusNote) setConfetti(Date.now())
      window.setTimeout(() => setTweetyDancing(false), bonusNote ? 2800 : 1800)
    }

    commit(
      { ...data, tweety: nextTweety, featherCoins: data.featherCoins + coins },
      {
        title:
          field === 'fed'
            ? 'Yum! 🐛'
            : field === 'watered'
              ? 'Refreshing! 💧'
              : 'So much fun! 💗',
        body: `${nextTweety.name || 'Tweety'} loved that. +${coins} Feather Coins.${bonusNote}${familyNote}`,
      },
    )
  }

  function renameTweety(name) {
    setData((current) => ({ ...current, tweety: { ...current.tweety, name } }))
  }

  // Feed / water the baby bird while it grows.
  function careBaby(kind) {
    const baby = data.tweety?.baby
    if (!baby) return
    const key = tweetyTodayKey()
    const todayCare = baby.careLog?.[key] || { fed: false, watered: false }
    const field = kind === 'water' ? 'watered' : 'fed'
    if (todayCare[field]) return
    playChirp(kind)
    commit(
      {
        ...data,
        tweety: {
          ...data.tweety,
          baby: { ...baby, careLog: { ...(baby.careLog || {}), [key]: { ...todayCare, [field]: true } } },
        },
        featherCoins: data.featherCoins + COINS.tweetyCare,
      },
      { title: 'Baby fed 🐣', body: `Your baby loved that. +${COINS.tweetyCare} Feather Coins.` },
    )
  }

  function releaseBaby() {
    const baby = data.tweety?.baby
    if (!baby) return
    const stage = babyStage(baby)
    const coins = releaseCoins(stage)
    const becameGuardian = stage === 'adult'
    setConfetti(Date.now())
    commit(
      {
        ...data,
        tweety: { ...data.tweety, baby: null, guardian: data.tweety.guardian || becameGuardian },
        featherCoins: data.featherCoins + coins,
      },
      {
        title: 'Released into the wild 🌿',
        body: `Your ${stage} ${baby.species} flew away free! +${coins} Feather Coins.${becameGuardian ? ' Bird Guardian badge earned 🛡️' : ''}`,
      },
    )
  }

  function keepBaby() {
    const baby = data.tweety?.baby
    if (!baby || babyStage(baby) !== 'adult') return
    const aviary = data.tweety?.aviary || []
    if (aviary.length >= AVIARY_MAX) {
      setToast({
        title: 'Aviary full 🏠',
        body: 'Release one bird first to make room for another.',
        tone: 'warning',
      })
      return
    }
    const idles = ['hop', 'preen', 'sleep']
    const next = [
      ...aviary,
      {
        id: createId('aviary'),
        species: baby.species,
        addedAt: new Date().toISOString(),
        idle: idles[aviary.length % idles.length],
      },
    ]
    setConfetti(Date.now())
    commit(
      { ...data, tweety: { ...data.tweety, baby: null, aviary: next } },
      { title: 'Welcome to the aviary 🏠', body: `${baby.species} joined your flock!` },
    )
  }

  function releaseAviaryBird(id) {
    const aviary = data.tweety?.aviary || []
    const bird = aviary.find((b) => b.id === id)
    if (!bird) return
    commit(
      {
        ...data,
        tweety: { ...data.tweety, aviary: aviary.filter((b) => b.id !== id) },
        featherCoins: data.featherCoins + 100,
      },
      { title: 'Released 🌿', body: `${bird.species} flew free. +100 Feather Coins.` },
    )
  }

  function sendMysteryEgg() {
    if (data.tweety?.egg || data.tweety?.baby) {
      setToast({
        title: 'Tweety is busy 🥚',
        body: 'She already has an egg or baby — try again once it grows up.',
        tone: 'warning',
      })
      return
    }
    const species = RARE_EGG_BIRDS[Math.floor(Math.random() * RARE_EGG_BIRDS.length)]
    setData((c) => ({
      ...c,
      tweety: {
        ...c.tweety,
        egg: { laidAt: new Date().toISOString(), careDays: 0, lastCareDay: '', kind: 'mystery', species },
      },
    }))
    setToast({
      title: 'Mystery egg sent 💛',
      body: `A gold mystery egg is on its way to ${data.tweety?.name || 'Tweety'}! What could be inside?`,
      tone: 'success',
    })
  }

  function sendFlockTreat() {
    const flock = data.tweety?.aviary || []
    if (flock.length === 0) {
      setToast({ title: 'No flock yet', body: 'The aviary is empty.', tone: 'calm' })
      return
    }
    const bonus = flock.length * 5
    setTweetyDancing(true)
    window.setTimeout(() => setTweetyDancing(false), 2400)
    commit(
      {
        ...data,
        tweety: { ...data.tweety, flockTreat: true },
        featherCoins: data.featherCoins + bonus,
      },
      { title: 'Treat for the flock 🎉', body: `The whole aviary does a happy dance! +${bonus} Feather Coins.` },
    )
  }

  // Admin one-tap: add a discovered bird into the Bird Book library.
  function addDiscoveryToLibrary(discoveryId) {
    const discovery = data.discoveries.find((d) => d.id === discoveryId)
    if (!discovery || discovery.addedToLibrary) return
    const ai = discovery.aiMatch || {}
    const newBird = normalizeLibraryBird({
      id: `discovery-${discovery.speciesKey}-${Date.now()}`,
      commonName: discovery.birdName,
      afrikaansName: discovery.afrikaansName || ai.afrikaansName || '',
      scientificName: discovery.scientificName || ai.scientificName || '',
      category: 'Garden birds',
      tags: ['Garden birds'],
      region: ai.whereFoundInSouthAfrica || '',
      habitat: ai.habitat || '',
      diet: ai.diet || '',
      colours: ai.colours || '',
      size: ai.size || '',
      whereFoundInSouthAfrica: ai.whereFoundInSouthAfrica || '',
      description: ai.cutePersonalityLine || ai.whyThisBird || 'Discovered by Pooks.',
      funFacts: ai.funFacts || [],
      soundDescription: ai.soundDescription || '',
      mysteryClue: 'A bird Pooks discovered all on her own. 🌟',
      imageUrl: discovery.photo || '',
      seen: true,
      firstSeenDate: discovery.date,
      lastSeenDate: discovery.date,
      timesSeen: 1,
    })
    commit(
      {
        ...data,
        birdLibrary: [...data.birdLibrary, newBird],
        discoveries: data.discoveries.map((d) =>
          d.id === discoveryId ? { ...d, addedToLibrary: true } : d,
        ),
      },
      { title: 'Added to the Bird Book 📖', body: `${discovery.birdName} is now in the library.` },
    )
  }

  // Buy (or, when free, gift) a Bird Store item. Purchases apply immediately.
  function buyStoreItem(section, item, options = {}) {
    const free = Boolean(options.free)
    const store = data.store || defaultStore()
    if (section.kind !== 'consumable' && isOwned(store, section, item.id)) return
    const cost = free ? 0 : item.cost
    if (!free && data.featherCoins < cost) {
      setToast({
        title: 'Not enough coins yet',
        body: `That costs ${cost} 🪙. Keep spotting birds and caring for Tweety! 💛`,
        tone: 'warning',
      })
      return
    }

    const nextStore = { ...store }
    let dancing = false
    let party = false
    let body = `${item.name} ${item.emoji} is yours.`

    if (section.kind === 'tier') {
      nextStore[section.field] = item.id
      const where =
        section.field === 'aviaryTier'
          ? 'the aviary'
          : section.field === 'nest'
            ? "Tweety's nest"
            : 'Tweety'
      body = `${item.name} ${item.emoji} unlocked — it now shows on ${where}.`
    } else if (section.kind === 'collection') {
      const owned = store[section.field] || []
      nextStore[section.field] =
        item.id === 'playground' ? ['playground'] : Array.from(new Set([...owned, item.id]))
    } else if (item.id === 'rainbow') {
      nextStore.rainbowUntil = Date.now() + 24 * 3600 * 1000
      body = 'Tweety is glowing rainbow colours for 24 hours! 🌈'
      dancing = true
    } else if (item.id === 'cake') {
      nextStore.birthdayCount = (store.birthdayCount || 0) + 1
      body = 'Happy birthday Tweety! 🎂 Confetti everywhere!'
      dancing = true
      party = true
    } else if (item.id === 'goldenseed') {
      nextStore.goldenSeedUntil = Date.now() + 3 * 24 * 3600 * 1000
      body = 'A golden seed planted! Tweety will lay an egg within 3 days. 🌟'
    } else if (item.id === 'loveletter') {
      nextStore.loveLetter =
        data.settings.tweetyLetter ||
        'Dear Tweety, please look after my Pooks for me. 💛 — Marnich'
      body = "A love letter is tied to Tweety's leg. 💌 She does a special happy dance!"
      dancing = true
    }

    if (dancing) {
      setTweetyDancing(true)
      window.setTimeout(() => setTweetyDancing(false), 2600)
    }
    if (party) setConfetti(Date.now())

    commit(
      { ...data, store: nextStore, featherCoins: data.featherCoins - cost },
      {
        title: free ? 'A gift from Marnich 🎁' : 'Bird Store purchase 🛒',
        body: free ? `${item.name} ${item.emoji} — sent free by Marnich! 💛` : body,
        tone: free ? 'success' : 'calm',
      },
    )
  }

  function sendTweetyTreat() {
    setData((current) => ({
      ...current,
      tweety: {
        ...current.tweety,
        pendingTreat: true,
        treatsReceived: (current.tweety?.treatsReceived || 0) + 1,
      },
    }))
    setToast({
      title: 'Treat sent 🎁',
      body: `${data.tweety?.name || 'Tweety'} will do a happy dance next time Pooks opens the app.`,
      tone: 'success',
    })
  }

  // ----- Competitive games (shared local state) -----
  // Shared resolution for a head-to-head game once both players have played.
  function finishMatch(gameKey, winner, detail, extraPooksCoins = 0) {
    const g = data.games
    const coinDelta =
      (winner === 'pooks' ? 150 : winner === 'marnich' ? -50 : 0) *
        (gameKey === 'quiz' ? 1 : 0) +
      (gameKey !== 'quiz' ? (winner === 'pooks' ? 100 : winner === 'marnich' ? -50 : 0) : 0) +
      extraPooksCoins
    const text =
      winner === 'pooks'
        ? 'Pooks wins! The Bird Council is disappointed in Marnich 😂 −50 coins from Marnich Bank'
        : winner === 'marnich'
          ? 'Marnich wins this time... The Bird Council suspects he Googled it 🤨 −50 coins from Pooks'
          : 'A tie?! The Bird Council demands a rematch 🐦'
    if (winner === 'pooks') setConfetti(Date.now())
    const lastResult = { game: gameKey, winner, text, status: 'done', ...detail }
    commit(
      {
        ...data,
        games: {
          ...g,
          [gameKey]: { code: '', pooks: null, marnich: null },
          leaderboard: bumpLeaderboard(g.leaderboard, winner),
          lastResult,
        },
        featherCoins: Math.max(0, data.featherCoins + coinDelta),
      },
      {
        title: winner === 'pooks' ? 'Pooks wins! 🏆' : winner === 'marnich' ? 'Marnich wins 😏' : "It's a tie 🤝",
        body: text,
      },
    )
  }

  function storeWaiting(gameKey, next, who) {
    setData((c) => ({
      ...c,
      games: {
        ...c.games,
        [gameKey]: next,
        lastResult: { game: gameKey, status: 'waiting', who, code: next.code },
      },
    }))
    setToast({
      title: 'Score locked in 🔒',
      body:
        who === 'pooks'
          ? 'Now share the code so Marnich can play from the Admin panel.'
          : 'Marnich is done — waiting on Pooks.',
      tone: 'calm',
    })
  }

  function onQuizDone(who, result) {
    const g = data.games
    const base = g.quiz.code === result.code ? g.quiz : { code: result.code, pooks: null, marnich: null }
    const quiz = { ...base, [who]: { score: result.score, timeMs: result.timeMs } }
    if (!quiz.pooks || !quiz.marnich) return storeWaiting('quiz', quiz, who)
    const winner =
      quiz.pooks.score > quiz.marnich.score
        ? 'pooks'
        : quiz.marnich.score > quiz.pooks.score
          ? 'marnich'
          : quiz.pooks.timeMs < quiz.marnich.timeMs
            ? 'pooks'
            : quiz.marnich.timeMs < quiz.pooks.timeMs
              ? 'marnich'
              : 'draw'
    finishMatch('quiz', winner, {
      pooks: quiz.pooks,
      marnich: quiz.marnich,
      maxScore: 10,
    })
    return undefined
  }

  function onWordleDone(who, result) {
    const g = data.games
    const base = g.wordle.code === result.code ? g.wordle : { code: result.code, pooks: null, marnich: null }
    const entry = { guesses: result.guesses, solved: result.solved, timeMs: result.timeMs }
    const wordle = { ...base, [who]: entry }
    // Immediate solve reward for Pooks (fewer guesses + faster = more coins).
    let solveCoins = 0
    if (who === 'pooks' && result.solved) {
      solveCoins = Math.max(20, (7 - result.guesses) * 15) + (result.timeMs < 90000 ? 20 : 0)
    }
    if (!wordle.pooks || !wordle.marnich) {
      commit(
        { ...data, games: { ...g, wordle, lastResult: { game: 'wordle', status: 'waiting', who, code: result.code } }, featherCoins: data.featherCoins + solveCoins },
        {
          title: 'Bird Wordle 🎯',
          body:
            who === 'pooks'
              ? result.solved
                ? `Solved in ${result.guesses}! +${solveCoins} 🪙. Share the code so Marnich can try.`
                : 'Out of time! Share the code for Marnich to try.'
              : "Marnich's Wordle is in — waiting on Pooks.",
        },
      )
      return
    }
    const pScore = wordle.pooks.solved ? wordle.pooks.guesses : 99
    const mScore = wordle.marnich.solved ? wordle.marnich.guesses : 99
    const winner =
      pScore < mScore
        ? 'pooks'
        : mScore < pScore
          ? 'marnich'
          : wordle.pooks.timeMs < wordle.marnich.timeMs
            ? 'pooks'
            : wordle.marnich.timeMs < wordle.pooks.timeMs
              ? 'marnich'
              : 'draw'
    finishMatch('wordle', winner, { pooks: wordle.pooks, marnich: wordle.marnich, wordle: true }, solveCoins)
  }

  function on20QDone(who, result) {
    const g = data.games
    const base = g.twentyq.code === result.code ? g.twentyq : { code: result.code, pooks: null, marnich: null }
    const entry = { questions: result.questions, won: result.won, timeMs: result.timeMs }
    const twentyq = { ...base, [who]: entry }
    const best = g.twentyqBest || { pooks: null, marnich: null }
    const nextBest =
      result.won && (best[who] === null || result.questions < best[who])
        ? { ...best, [who]: result.questions }
        : best
    let solveCoins = 0
    if (who === 'pooks' && result.won) solveCoins = Math.max(20, (10 - result.questions) * 15)
    if (!twentyq.pooks || !twentyq.marnich) {
      commit(
        { ...data, games: { ...g, twentyq, twentyqBest: nextBest, lastResult: { game: 'twentyq', status: 'waiting', who, code: result.code } }, featherCoins: data.featherCoins + solveCoins },
        {
          title: '20 Questions 🐦',
          body:
            who === 'pooks'
              ? result.won
                ? `Guessed it in ${result.questions}! +${solveCoins} 🪙. Share the code for Marnich.`
                : 'Not this time 😂 Share the code for Marnich to try.'
              : 'Marnich played — waiting on Pooks.',
        },
      )
      return
    }
    const pScore = twentyq.pooks.won ? twentyq.pooks.questions : 99
    const mScore = twentyq.marnich.won ? twentyq.marnich.questions : 99
    const winner =
      pScore < mScore
        ? 'pooks'
        : mScore < pScore
          ? 'marnich'
          : twentyq.pooks.timeMs < twentyq.marnich.timeMs
            ? 'pooks'
            : twentyq.marnich.timeMs < twentyq.pooks.timeMs
              ? 'marnich'
              : 'draw'
    finishMatch('twentyq', winner, { pooks: twentyq.pooks, marnich: twentyq.marnich, twentyq: true }, solveCoins)
    setData((c) => ({ ...c, games: { ...c.games, twentyqBest: nextBest } }))
  }

  function setTrashTalk(message) {
    setData((c) => ({ ...c, games: { ...c.games, trashTalk: String(message || '').trim() } }))
    setToast({
      title: 'Trash talk sent 😏',
      body: "It will show on Pooks' games screen.",
      tone: 'success',
    })
  }

  function commit(nextState, message) {
    let recalculated = recalculateState(nextState)
    // Award milestone coin bonuses when the unique-species count crosses a threshold.
    const milestoneBonus = milestoneCoinsBetween(data.birds.length, recalculated.birds.length)
    let milestoneNote = ''
    if (milestoneBonus > 0) {
      recalculated = { ...recalculated, featherCoins: recalculated.featherCoins + milestoneBonus }
      milestoneNote = ` Milestone bonus! +${milestoneBonus} Feather Coins 🏅`
    }
    const unlockSummary = getUnlockSummary(data, recalculated)
    const unlockedRewards = getNewlyUnlockedRewards(data, recalculated)
    setData(recalculated)
    if (unlockedRewards.length) {
      setRewardUnlockQueue((current) => [...current, ...unlockedRewards])
    }
    if (milestoneBonus > 0) setConfetti(Date.now())
    setToast({
      title: message.title,
      body: [message.body, milestoneNote, unlockSummary].filter(Boolean).join(' '),
      tone: message.tone || 'success',
    })
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
    setBirdProfile(null)
    setMissedDraft({ location: '', note: '' })
    setToast({
      title: 'Demo data reset',
      body: "Marlie's local bird notebook is back to a clean page.",
      tone: 'calm',
    })
  }

  function openBirdProfile(profile) {
    setBirdProfile(profile)
    setActivePage('birdProfile')
  }

  function closeBirdProfile() {
    setActivePage(birdProfile?.source === 'library' ? 'library' : 'birds')
  }

  function saveFieldGuideNotes(key, patch) {
    if (!key) return
    setData((current) => ({
      ...current,
      fieldGuideNotes: {
        ...current.fieldGuideNotes,
        [key]: {
          fieldNotes: '',
          spottedAt: '',
          myPhotos: [],
          ...(current.fieldGuideNotes?.[key] || {}),
          ...patch,
        },
      },
    }))
  }

  function addBird(form, options = {}) {
    const birdName = String(form.birdName || '').trim()
    const speciesKey = normalizeBirdName(birdName)
    if (!speciesKey) return
    const isNewSpecies = !data.birds.some((bird) => bird.id === speciesKey)
    const withMarnich = Boolean(form.seenWithMarnich)
    const coinsEarned =
      COINS.spot +
      (isNewSpecies ? COINS.firstSpecies : 0) +
      (withMarnich ? COINS.withMarnich : 0)
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
    // Did this confirmed photo just unlock a previously-mysterious Bird Book card?
    const libraryMatchIndex = getBirdLibraryMatchIndex(data.birdLibrary, {
      commonName: birdName,
      scientificName: aiMatch?.scientificName,
    })
    const unlockedMysteryBird =
      libraryMatchIndex >= 0 && !data.birdLibrary[libraryMatchIndex].seen
        ? data.birdLibrary[libraryMatchIndex]
        : null

    // A bird the Bird Book has never recorded — a brand-new discovery!
    const isDiscovery = isNewSpecies && libraryMatchIndex < 0 && Boolean(aiMatch)
    const discoveryBonus = isDiscovery ? 50 : 0
    if (isDiscovery) sighting.discovery = true
    const nextDiscoveries =
      isDiscovery && !data.discoveries.some((d) => d.speciesKey === speciesKey)
        ? [
            {
              id: createId('discovery'),
              speciesKey,
              birdName,
              scientificName: aiMatch?.scientificName || '',
              afrikaansName: aiMatch?.afrikaansName || '',
              aiMatch,
              date: todayValue(),
              photo: form.photo || '',
              addedToLibrary: false,
            },
            ...data.discoveries,
          ]
        : data.discoveries

    // Spotting a RARE bird in real life earns a guaranteed mystery egg
    // (if Tweety has no egg or baby right now).
    const spottedRare =
      libraryMatchIndex >= 0 && data.birdLibrary[libraryMatchIndex].special
    const rareEggTweety =
      spottedRare && !data.tweety?.egg && !data.tweety?.baby
        ? {
            ...data.tweety,
            egg: {
              laidAt: new Date().toISOString(),
              careDays: 0,
              lastCareDay: '',
              kind: 'mystery',
              species: data.birdLibrary[libraryMatchIndex].commonName,
            },
          }
        : data.tweety

    const sightings = [...data.sightings, sighting]
    const nextState = {
      ...data,
      sightings,
      birds: buildBirdRecords(sightings),
      birdLibrary: upsertBirdLibraryFromSighting(data.birdLibrary, sighting),
      featherCoins: data.featherCoins + coinsEarned + discoveryBonus,
      tweety: rareEggTweety,
      discoveries: nextDiscoveries,
      settings: {
        ...data.settings,
        birdCrush: form.makeBirdCrush ? birdName : data.settings.birdCrush,
      },
    }

    commit(nextState, {
      title: isDiscovery
        ? 'New Discovery! \ud83c\udf1f'
        : unlockedMysteryBird
          ? 'Mystery card unlocked! \ud83c\udf89'
          : isNewSpecies
            ? 'New species logged!'
            : 'Repeat sighting logged!',
      body: [
        `${getCouncilMessage(data.sightings.length)} +${coinsEarned + discoveryBonus} Feather Coins.`,
        isDiscovery ? '+50 discovery bonus \ud83c\udf1f' : '',
        options.checkedOff ? "Checked off Marlie's South African Bird List \u2705" : '',
      ]
        .filter(Boolean)
        .join(' '),
    })

    if (isDiscovery) {
      setConfetti(Date.now())
      setReveal({
        tone: 'bird',
        title: 'New Discovery! \ud83c\udf1f',
        body: `The Bird Council has never recorded the ${birdName} before! You earned a "Discovered by Pooks \ud83c\udf1f" badge and +50 bonus coins.`,
        photo: form.photo || '',
      })
    } else if (unlockedMysteryBird) {
      // Full unlock celebration: confetti + reveal the card with her own photo.
      setConfetti(Date.now())
      setReveal({
        tone: 'bird',
        title: `You unlocked the ${unlockedMysteryBird.commonName}! \ud83d\udc26`,
        body: `A mystery card just turned real \u2014 captured with your own photo. +${coinsEarned} Feather Coins. \ud83d\udc9b`,
        photo: form.photo || unlockedMysteryBird.imageUrl || '',
      })
    }

    if (!options.stayOnPage) {
      setActivePage('birds')
    }

    return { birdName, coinsEarned, isNewSpecies, unlockedMystery: Boolean(unlockedMysteryBird) }
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
    const nextCompletions = {
      ...data.dailyChallengeCompletions,
      [date]: {
        ...completion,
        [kind]: challenge.id,
      },
    }

    let coins = bonus ? 20 : COINS.dailyChallenge
    let streakNote = ''
    if (!bonus) {
      const newStreak = getDailyStreak(nextCompletions)
      if (newStreak >= 3 && newStreak % 3 === 0) {
        coins += COINS.streakBonus
        streakNote = ` ${newStreak}-day streak bonus! +${COINS.streakBonus} more. 🔥`
      }
    }

    setConfetti(Date.now())
    commit(
      {
        ...data,
        featherCoins: data.featherCoins + coins,
        dailyChallengeCompletions: nextCompletions,
      },
      {
        title: bonus ? 'Bonus mission complete' : 'Mission complete! 🐦',
        body: bonus
          ? 'The optional Bird Council side quest has been quietly stamped. +20 Feather Coins.'
          : `You found one! +${COINS.dailyChallenge} Feather Coins.${streakNote}`,
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

  function completeBirdDate({ confirmed = false, photo = '' } = {}) {
    const today = todayValue()
    const mission = data.settings.currentDateMission
    // Dedupe: the same mission on the same day saves only once.
    if (data.dateMemories.some((m) => m.date === today && m.mission === mission)) {
      setToast({
        title: 'Already saved',
        body: 'This bird date is already in your memories. 💛',
        tone: 'calm',
      })
      return
    }
    const base = 100
    const bonus = confirmed ? 200 : 0
    const memory = {
      id: createId('date-memory'),
      date: today,
      mission,
      note: confirmed ? 'Spotted with Marnich ❤️' : 'Solo bird date',
      marnichConfirmed: Boolean(confirmed),
      favorite: false,
      photo: photo || '',
    }
    // On a confirmed date, today's sightings count as "with Marnich".
    const sightings = confirmed
      ? data.sightings.map((s) => (s.dateSpotted === today ? { ...s, seenWithMarnich: true } : s))
      : data.sightings
    commit(
      {
        ...data,
        featherCoins: data.featherCoins + base + bonus,
        dateMemories: [memory, ...data.dateMemories],
        sightings,
      },
      {
        title: confirmed ? 'Date confirmed by Marnich 💛' : 'Bird Date saved',
        body: confirmed
          ? `+${base + bonus} Feather Coins! Birds spotted today are now marked "Spotted with Marnich ❤️".`
          : `+${base} Feather Coins. Memory saved.`,
      },
    )
  }

  function toggleDateFavourite(id) {
    setData((current) => ({
      ...current,
      dateMemories: current.dateMemories.map((m) =>
        m.id === id ? { ...m, favorite: !m.favorite } : m,
      ),
    }))
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

  function notEnoughCoins() {
    setToast({
      title: 'Not enough Feather Coins',
      body: 'Spot a few more birds and come back to the shop. 🪙',
      tone: 'warning',
    })
  }

  function buyMysteryBox() {
    if (data.featherCoins < SHOP.mysteryBox) return notEnoughCoins()
    const gifts = data.mysteryGifts?.length ? data.mysteryGifts : defaultMysteryGifts
    const message = gifts[Math.floor(Math.random() * gifts.length)]
    setConfetti(Date.now())
    setReveal({ tone: 'gift', title: 'Mystery gift opened! 🎁', body: message })
    commit(
      { ...data, featherCoins: data.featherCoins - SHOP.mysteryBox },
      { title: 'Mystery gift opened! 🎁', body: message },
    )
  }

  function buyHiddenNote() {
    if (data.featherCoins < SHOP.hiddenNote) return notEnoughCoins()
    const note = data.hiddenNotes.find((item) => !item.unlocked)
    if (!note) {
      setToast({
        title: 'All notes unlocked',
        body: 'Every hidden note is already open. 💛',
        tone: 'calm',
      })
      return
    }
    setConfetti(Date.now())
    setReveal({ tone: 'note', title: note.title, body: note.message })
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - SHOP.hiddenNote,
        hiddenNotes: data.hiddenNotes.map((item) =>
          item.id === note.id ? { ...item, unlocked: true, unlockedAt: todayValue() } : item,
        ),
      },
      { title: 'Hidden note unlocked 💌', body: 'A folded note from Marnich just opened.' },
    )
  }

  function buyDateIdea() {
    if (data.featherCoins < SHOP.dateIdea) return notEnoughCoins()
    const ideas = data.dateIdeas?.length ? data.dateIdeas : defaultDateIdeas
    const unlocked = data.settings.unlockedDateIdeas || []
    const next = ideas.find((idea) => !unlocked.includes(idea)) || ideas[0]
    setConfetti(Date.now())
    setReveal({ tone: 'date', title: 'Date idea unlocked 💕', body: next })
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - SHOP.dateIdea,
        settings: {
          ...data.settings,
          unlockedDateIdeas: unlocked.includes(next) ? unlocked : [...unlocked, next],
        },
      },
      { title: 'Date idea unlocked 💕', body: next },
    )
  }

  function unlockBirdProfile(birdId) {
    if (data.featherCoins < SHOP.birdProfile) return notEnoughCoins()
    const already = data.settings.unlockedProfiles || []
    if (already.includes(birdId)) return
    const bird = data.birdLibrary.find((item) => item.id === birdId)
    setConfetti(Date.now())
    setReveal({
      tone: 'bird',
      title: `${bird?.commonName || 'Special bird'} revealed ✨`,
      body: 'Profile unlocked! You can read all about it — now go spot it for real to add it to your collection.',
    })
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - SHOP.birdProfile,
        settings: { ...data.settings, unlockedProfiles: [...already, birdId] },
      },
      { title: 'Special bird profile unlocked ✨', body: bird?.commonName || '' },
    )
  }

  function buyFeaturedBirdProfile() {
    const already = data.settings.unlockedProfiles || []
    const locked = data.birdLibrary.find(
      (bird) => bird.special && !bird.seen && !already.includes(bird.id),
    )
    if (!locked) {
      setToast({
        title: 'All special birds revealed',
        body: 'Every special profile is already unlocked. ✨',
        tone: 'calm',
      })
      return
    }
    unlockBirdProfile(locked.id)
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

  const activeRewardUnlock = rewardUnlockQueue[0] || null
  const fullMenu =
    session?.role === 'admin' ? [...menuItems, ['admin', 'Admin', '🔒']] : menuItems

  if (!session) {
    if (adminGate) {
      return <AdminGate onLogin={adminLogin} onCancel={() => setAdminGate(false)} />
    }
    return <LoginScreen data={data} onLogin={login} />
  }

  return (
    <div className={`app-shell has-bottom-nav season-${season.key}`}>
      <div className="season-wash" aria-hidden="true" />
      <SeasonalAmbient />
      <Toast toast={toast} />
      <InstallPrompt />
      {adminGate && session.role !== 'admin' && (
        <AdminGate onLogin={adminLogin} onCancel={() => setAdminGate(false)} overlay />
      )}
      {confetti ? <Confetti seed={confetti} /> : null}
      <RewardUnlockModal
        reward={activeRewardUnlock}
        markRewardPaid={markRewardPaid}
        isAdmin={session.role === 'admin'}
        onClose={() => setRewardUnlockQueue((current) => current.slice(1))}
      />
      <RevealModal reveal={reveal} onClose={() => setReveal(null)} />

      <header className="app-header">
        <div className="brand-wrap">
          <button
            className="brand-pill"
            type="button"
            onClick={handleBrandTap}
            title={`This week: ${weekly.name}`}
          >
            <WeeklyBird size={32} className="brand-bird" />
            Pooks
          </button>
          {weeklyTip && (
            <div className="weekly-tip" role="status">
              New look this week! 🐦
              <strong>{weekly.name}</strong>
            </div>
          )}
        </div>
        <button
          className="gear-btn"
          type="button"
          aria-label="More"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⚙️
        </button>
      </header>

      {menuOpen && (
        <SettingsMenu
          items={fullMenu}
          session={session}
          onPick={(id) => {
            setActivePage(id)
            setMenuOpen(false)
          }}
          onLogout={logout}
          onClose={() => setMenuOpen(false)}
        />
      )}

      <main className="page-wrap page-stage" key={activePage}>
        {activePage === 'home' && (
          <HomePage
            data={data}
            stats={stats}
            dailyChallenge={dailyChallenge}
            dailyStreak={dailyStreak}
            completeDailyChallenge={completeDailyChallenge}
            goTo={setActivePage}
            season={season}
            tweetyView={tweetyView}
            tweetyDancing={tweetyDancing}
            careTweety={careTweety}
            careBaby={careBaby}
            releaseBaby={releaseBaby}
            keepBaby={keepBaby}
            releaseAviaryBird={releaseAviaryBird}
          />
        )}
        {activePage === 'tweety' && (
          <TweetyStatsPage
            tweety={data.tweety}
            birdCount={data.birds.length}
            onBack={() => setActivePage('home')}
            onRename={renameTweety}
          />
        )}
        {activePage === 'games' && (
          <GamesHub
            data={data}
            who="pooks"
            onQuizDone={onQuizDone}
            onWordleDone={onWordleDone}
            on20QDone={on20QDone}
          />
        )}
        {activePage === 'add' && (
          <AddBirdPage addBird={addBird} birdLibrary={data.birdLibrary} />
        )}
        {activePage === 'birds' && (
          <BirdsPage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'library' && (
          <SaBirdLibraryPage
            data={data}
            openBirdProfile={openBirdProfile}
            goToSpot={() => setActivePage('add')}
          />
        )}
        {activePage === 'birdProfile' && (
          <BirdProfilePage
            data={data}
            profile={birdProfile}
            onBack={closeBirdProfile}
            saveFieldGuideNotes={saveFieldGuideNotes}
          />
        )}
        {activePage === 'rewards' && (
          <RewardsPage
            data={data}
            stats={stats}
            claimReward={claimReward}
            markRewardPaid={markRewardPaid}
            isAdmin={session.role === 'admin'}
            buyMysteryBox={buyMysteryBox}
            buyHiddenNote={buyHiddenNote}
            buyDateIdea={buyDateIdea}
            buyFeaturedBirdProfile={buyFeaturedBirdProfile}
            buyStoreItem={buyStoreItem}
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
            toggleDateFavourite={toggleDateFavourite}
          />
        )}
        {activePage === 'bingo' && <BingoPage data={data} toggleBingo={toggleBingo} />}
        {activePage === 'codes' && <SecretCodesPage data={data} redeemCode={redeemCode} />}
        {activePage === 'magazine' && (
          <WeeklyMagazinePage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'profile' && <ProfilePage data={data} stats={stats} goTo={setActivePage} />}
        {activePage === 'admin' && session.role === 'admin' && (
          <AdminPage
            data={data}
            stats={stats}
            dailyStreak={dailyStreak}
            addAdminReward={addAdminReward}
            addAdminChallenge={addAdminChallenge}
            addAdminNote={addAdminNote}
            addAdminCode={addAdminCode}
            markRewardPaid={markRewardPaid}
            sendSurpriseNote={sendSurpriseNote}
            sendTweetyTreat={sendTweetyTreat}
            sendMysteryEgg={sendMysteryEgg}
            sendFlockTreat={sendFlockTreat}
            addDiscoveryToLibrary={addDiscoveryToLibrary}
            buyStoreItem={buyStoreItem}
            onQuizDone={onQuizDone}
            onWordleDone={onWordleDone}
            on20QDone={on20QDone}
            setTrashTalk={setTrashTalk}
            resetData={resetData}
            previewMarlieView={() => setActivePage('home')}
            previewMagazineIssue={() => setActivePage('magazine')}
            setData={setData}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main sections">
        {bottomTabs.map(([id, label, icon]) => (
          <button
            className={activePage === id ? 'bottom-tab active' : 'bottom-tab'}
            key={id}
            type="button"
            onClick={() => setActivePage(id)}
          >
            <span className="bottom-tab-icon" aria-hidden="true">{icon}</span>
            <span className="bottom-tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function AdminGate({ onLogin, onCancel, overlay = false }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!onLogin(secret)) {
      setError('Wrong admin password.')
    }
  }

  return (
    <main className={overlay ? 'login-screen admin-gate-overlay' : 'login-screen'}>
      <section className="login-card" aria-labelledby="admin-gate-title">
        <div className="login-logo" aria-hidden="true">🔒</div>
        <p className="login-tag" id="admin-gate-title">Marnich control room</p>
        <p className="login-sub">Admin access only.</p>
        <form className="login-form" onSubmit={submit}>
          <label>
            Admin password
            <input
              type="password"
              value={secret}
              onChange={(event) => {
                setSecret(event.target.value)
                setError('')
              }}
              placeholder="••••••"
              autoComplete="off"
              autoFocus
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="primary-btn wide big-btn" type="submit">
            Enter control room
          </button>
          <button className="text-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </form>
      </section>
    </main>
  )
}

function LoginScreen({ data, onLogin }) {
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const season = getSeasonInfo()

  function submit(event) {
    event.preventDefault()
    if (!onLogin(name, secret)) {
      setError('That name and secret word don’t match. Try again. 🪶')
    }
  }

  return (
    <main className={`login-screen season-${season.key}`}>
      <div className="season-wash" aria-hidden="true" />
      <SeasonalAmbient />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-logo">
          <WeeklyBird size={88} />
        </div>
        <p className="login-tag" id="login-title">{season.greeting}</p>
        <p className="login-sub">Whisper your name and secret word to come inside.</p>
        <form className="login-form" onSubmit={submit}>
          <label>
            Your name
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              placeholder="Pooks"
              autoComplete="off"
            />
          </label>
          <label>
            Secret word
            <input
              type="password"
              value={secret}
              onChange={(event) => {
                setSecret(event.target.value)
                setError('')
              }}
              placeholder="••••••"
              autoComplete="off"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="primary-btn wide big-btn" type="submit">
            Open my bird world 🪶
          </button>
        </form>
        {!data.settings.pooksSecret && (
          <p className="login-hint">Ask Marnich to set your secret word.</p>
        )}
      </section>
    </main>
  )
}

function SettingsMenu({ items, session, onPick, onLogout, onClose }) {
  return (
    <div className="menu-backdrop" role="presentation" onClick={onClose}>
      <div
        className="menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="More"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Signed in as {session.name}</p>
        <div className="menu-list">
          {items.map(([id, label, icon]) => (
            <button key={id} className="menu-item" type="button" onClick={() => onPick(id)}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </div>
        <button className="ghost-btn wide big-btn" type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}

function Confetti({ seed }) {
  const pieces = useMemo(() => {
    const emojis = ['🪶', '✨', '🎉', '🐦', '💛', '🌟']
    return Array.from({ length: 26 }, (_, index) => ({
      id: `${seed}-${index}`,
      left: Math.round((index / 26) * 100 + (index % 3) * 4),
      delay: (index % 7) * 90,
      duration: 1500 + (index % 5) * 240,
      emoji: emojis[index % emojis.length],
    }))
  }, [seed])

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.duration}ms`,
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  )
}

function RevealModal({ reveal, onClose }) {
  if (!reveal) return null
  return (
    <div className="reward-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className={`reveal-card reveal-${reveal.tone || 'gift'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reveal-emoji" aria-hidden="true">
          {reveal.tone === 'note' ? '💌' : reveal.tone === 'date' ? '💕' : reveal.tone === 'bird' ? '✨' : '🎁'}
        </div>
        <h2 id="reveal-title">{reveal.title}</h2>
        {reveal.photo && (
          <img className="reveal-photo" src={reveal.photo} alt="Your unlocked bird" />
        )}
        <p>{reveal.body}</p>
        <button className="primary-btn wide big-btn" type="button" onClick={onClose}>
          Yay 💛
        </button>
      </article>
    </div>
  )
}

function RewardUnlockModal({ reward, markRewardPaid, isAdmin, onClose }) {
  if (!reward) return null

  return (
    <div className="reward-modal-backdrop" role="presentation">
      <article
        className="reward-unlock-card celebration"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-unlock-title"
      >
        <div className="reveal-emoji" aria-hidden="true">🎉</div>
        <p className="eyebrow">Milestone reward unlocked!</p>
        <h2 id="reward-unlock-title">{reward.name}</h2>
        {reward.status === 'Paid' ? (
          <p className="sent-line">Marnich sent this on {formatDate(reward.paidAt)} 💛</p>
        ) : (
          <p className="pending-line">Pending — waiting for Marnich to send it. 💛</p>
        )}
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
        {isAdmin && reward.status !== 'Paid' && (
          <button
            className="secondary-btn wide big-btn"
            type="button"
            onClick={() => markRewardPaid(reward.id)}
          >
            Mark as sent 💛
          </button>
        )}
        <button className="primary-btn wide big-btn" type="button" onClick={onClose}>
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

// Send the proof (photo or written description) to the AI challenge validator.
async function validateChallenge({ challengeText, description, photoFile }) {
  try {
    if (!BIRD_API_URL) throw new Error('Missing VITE_BIRD_API_URL')
    const body = new FormData()
    body.append('challenge', challengeText)
    if (photoFile) body.append('file', photoFile)
    if (description) body.append('description', description)

    const response = await fetch(`${BIRD_API_URL}/api/validate-challenge`, {
      method: 'POST',
      body,
    })
    if (!response.ok) throw new Error(`Validator returned ${response.status}`)
    const payload = await response.json()
    const verdict = String(payload.verdict || '').trim().toLowerCase().startsWith('y')
      ? 'yes'
      : 'no'
    return { verdict, reason: String(payload.reason || ''), offline: false }
  } catch (error) {
    console.warn('Challenge validation fell back to offline check', error)
    const words = String(description || '').trim().split(/\s+/).filter(Boolean).length
    if (photoFile || words >= 20) {
      return {
        verdict: 'yes',
        reason: 'The Bird Council accepted your effort.',
        offline: true,
      }
    }
    return {
      verdict: 'no',
      reason: 'Add a photo or at least 20 words so the Council can be sure.',
      offline: true,
    }
  }
}

function ChallengeProof({ challenge, complete, onValidated, label = 'I completed this' }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [verdict, setVerdict] = useState(null)

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length
  const canSubmit = (Boolean(photoFile) || wordCount >= 20) && status !== 'checking'

  if (complete) {
    return (
      <button className="primary-btn wide mission-btn" type="button" disabled>
        Done for today ✓
      </button>
    )
  }

  if (!open) {
    return (
      <button
        className="primary-btn wide mission-btn"
        type="button"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    )
  }

  async function submit() {
    if (!canSubmit) return
    setStatus('checking')
    setVerdict(null)
    const result = await validateChallenge({
      challengeText: challenge?.text || '',
      description,
      photoFile,
    })
    setVerdict(result)
    if (result.verdict === 'yes') {
      setStatus('yes')
      onValidated()
    } else {
      setStatus('no')
    }
  }

  return (
    <div className="proof-form">
      <p className="eyebrow">Prove it to the Bird Council 🐦</p>
      <label>
        Upload a photo
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
        />
      </label>
      <p className="proof-or">— or —</p>
      <label>
        Describe what you saw ({wordCount}/20 words)
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What bird was it, what was it doing, and where were you?"
        />
      </label>
      <button className="primary-btn" type="button" onClick={submit} disabled={!canSubmit}>
        {status === 'checking' ? 'Asking the Bird Council…' : 'Submit to the Bird Council'}
      </button>
      {verdict && status === 'yes' && (
        <div className="proof-verdict yes">Yes! {verdict.reason} 🎉</div>
      )}
      {verdict && status === 'no' && (
        <div className="proof-verdict no">
          The Bird Council isn&apos;t quite convinced yet 🐦 Try again!
          {verdict.reason ? ` ${verdict.reason}` : ''}
        </div>
      )}
    </div>
  )
}

const INSTALL_DISMISS_KEY = 'pooks-install-dismissed'

function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [isIos] = useState(() => {
    try {
      return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
    } catch {
      return false
    }
  })

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (standalone) return undefined
    try {
      if (localStorage.getItem(INSTALL_DISMISS_KEY)) return undefined
    } catch {
      // ignore
    }
    if (!window.matchMedia('(max-width: 820px)').matches) return undefined

    function onBeforeInstall(event) {
      event.preventDefault()
      setDeferred(event)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    const timer = window.setTimeout(() => setVisible(true), 30000)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.clearTimeout(timer)
    }
  }, [])

  if (!visible) return null
  if (!deferred && !isIos) return null

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  async function install() {
    if (deferred) {
      deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        // ignore
      }
      setDeferred(null)
    }
    dismiss()
  }

  return (
    <div className="install-prompt" role="dialog" aria-label="Install Pooks Books">
      <span aria-hidden="true" style={{ fontSize: '1.7rem' }}>🐦</span>
      <p>
        Add Pooks Books to your home screen for the full adventure 🐦
        {isIos && !deferred ? ' — tap Share, then “Add to Home Screen”.' : ''}
      </p>
      <div className="install-actions">
        {deferred && (
          <button className="primary-btn" type="button" onClick={install}>
            Add
          </button>
        )}
        <button className="text-btn" type="button" onClick={dismiss}>
          Later
        </button>
      </div>
    </div>
  )
}

function HomePage({
  data,
  dailyChallenge,
  dailyStreak,
  completeDailyChallenge,
  goTo,
  season,
  tweetyView,
  tweetyDancing,
  careTweety,
  careBaby,
  releaseBaby,
  keepBaby,
  releaseAviaryBird,
}) {
  const seenLibraryCount = data.birdLibrary.filter((bird) => bird.seen).length
  const collectionProgress = data.birdLibrary.length
    ? Math.round((seenLibraryCount / data.birdLibrary.length) * 100)
    : 0
  const done = dailyChallenge.mainComplete

  return (
    <div className={`home-stack home-mood-${tweetyView.mood}`}>
      <div className="home-topline">
        <span className="streak-chip">Day {dailyStreak} streak 🔥</span>
        <span className="coin-chip">{data.featherCoins} 🪙</span>
      </div>

      <section className="season-greeting">
        <div className="home-hero-bird">
          <WeeklyBird size={104} />
        </div>
        <h2>{season.greeting}</h2>
        <p>{season.blurb}</p>
      </section>

      <TweetyHomeCard
        tweety={data.tweety}
        level={tweetyView.level}
        mood={tweetyView.mood}
        streak={tweetyView.streak}
        dancing={tweetyDancing}
        nestTier={tweetyView.nestTier}
        rainbow={tweetyView.rainbow}
        loveLetter={tweetyView.loveLetter}
        onFeed={() => careTweety('feed')}
        onWater={() => careTweety('water')}
        onPlay={() => careTweety('play')}
        onOpenStats={() => goTo('tweety')}
      />

      <TweetyFamilyCard
        tweety={data.tweety}
        onCareBaby={careBaby}
        onRelease={releaseBaby}
        onKeep={keepBaby}
      />

      <AviaryCard
        tweety={data.tweety}
        aviaryTier={data.store?.aviaryTier || 'basic'}
        flockDance={Boolean(data.tweety?.flockTreat)}
        onReleaseAviary={releaseAviaryBird}
      />

      <section className={`mission-card${done ? ' done' : ''}`}>
        <p className="mission-eyebrow">Today&apos;s Mission 🐦</p>
        <h2 className="mission-text">
          {dailyChallenge.main?.text || 'Find one tiny bird moment today'}
        </h2>
        <p className="mission-message">{data.settings.marnichDailyMessage}</p>
        <ChallengeProof
          challenge={dailyChallenge.main}
          complete={done}
          onValidated={() => completeDailyChallenge('daily')}
        />
      </section>

      <button className="giant-spot-btn" type="button" onClick={() => goTo('add')}>
        <span className="giant-spot-emoji" aria-hidden="true">🐦</span>
        Spot a Bird
      </button>

      <div className="home-secondary">
        <button className="mini-card" type="button" onClick={() => goTo('library')}>
          <span className="mini-card-top">
            <span className="eyebrow">Collection</span>
            <strong>{seenLibraryCount} found</strong>
          </span>
          <div className="progress-track">
            <span style={{ width: `${collectionProgress}%` }}></span>
          </div>
        </button>
        <button className="mini-card" type="button" onClick={() => goTo('rewards')}>
          <span className="mini-card-top">
            <span className="eyebrow">Gifts</span>
            <strong>{data.featherCoins} 🪙</strong>
          </span>
          <small>Open the coin shop</small>
        </button>
      </div>
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

function AddBirdPage({ addBird, birdLibrary = [] }) {
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

    const endpoint = `${BIRD_API_URL}/api/identify-bird`
    try {
      const body = new FormData()
      body.append('file', photoFile)

      console.log('[bird-id] POST', endpoint)
      const response = await fetch(endpoint, { method: 'POST', body })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        console.warn('[bird-id] API error', response.status, text.slice(0, 300))
        throw new Error(`Bird API returned ${response.status}`)
      }

      const payload = await response.json()
      const result = normalizeAiIdentificationResponse(payload)

      if (!result.matches.length) {
        throw new Error('Bird API returned no matches')
      }

      console.log('[bird-id] success —', result.matches.length, 'match(es)')
      setAiMatches(result.matches)
      setAiUncertain(result.uncertain)
      setAiStatus('results')
    } catch (error) {
      // Only reach the demo result on a genuine failure (network/CORS/API error).
      console.warn(
        `[bird-id] real identification failed (${error?.message || error}) — showing demo fallback. ` +
          `Endpoint: ${endpoint}. If this is CORS, the backend must allow this site's origin; ` +
          'if it is a network error, check the backend is awake.',
      )
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
        <div className="spot-intro">
          <p className="spot-heading">Show the Council your bird 🐦</p>
          <p className="spot-sub">Snap a photo or pick one, and let the feathers fly.</p>
        </div>

        <form className="council-form" onSubmit={handleAskCouncil}>
          {form.photo ? (
            <div className="spot-preview-card">
              <img className="spot-preview-photo" src={form.photo} alt="Bird preview" />
              <p className="spot-preview-caption">Looking good! Ready for the Council. 🪶</p>
              <button className="ghost-btn wide big-btn" type="button" onClick={removePhoto}>
                Choose a different photo
              </button>
            </div>
          ) : (
            <label className="camera-button">
              <input
                key={photoInputKey}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
              />
              <span className="camera-ring" aria-hidden="true">
                <span className="camera-icon">🐦</span>
                <span className="camera-lens">📷</span>
              </span>
              <span className="camera-hint">Tap to open camera</span>
            </label>
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
                  userPhoto={form.photo}
                  birdLibrary={birdLibrary}
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

// The best photo for a suggested match: the library photo if the bird is in
// the Bird Book, otherwise a live Wikipedia photo by scientific name.
function MatchPhoto({ libraryImageUrl, scientificName, commonName }) {
  const hasLib = Boolean(libraryImageUrl) && !libraryImageUrl.includes('placehold')
  const { photos } = useWikipediaPhotos(
    hasLib ? '' : scientificName,
    hasLib ? '' : commonName,
  )
  const src = hasLib ? libraryImageUrl : photos[0]?.src
  if (src) {
    return <img className="compare-img" src={src} alt={commonName} loading="lazy" />
  }
  return (
    <div className="compare-img placeholder-photo">
      <span>{getBirdPhotoPlaceholderLabel(commonName)}</span>
    </div>
  )
}

function AiMatchCard({ match, index, onConfirm, userPhoto, birdLibrary = [] }) {
  const confidence = match.confidence || 0
  const unsure = confidence < 70
  const isBest = index === 0
  const libIndex = getBirdLibraryMatchIndex(birdLibrary, {
    commonName: match.commonName,
    scientificName: match.scientificName,
  })
  const libraryImageUrl = libIndex >= 0 ? birdLibrary[libIndex].imageUrl : ''
  const secretRows = [
    ['Afrikaans', match.afrikaansName],
    ['Scientific', match.scientificName],
    ['Habitat', match.habitat],
    ['Diet', match.diet],
    ['Sound', match.soundDescription],
  ]

  return (
    <article
      className={`ai-match-card${isBest ? ' best-match' : ''}${unsure ? ' unsure' : ''}`}
    >
      {/* Side-by-side: her photo on the left, the suggested bird on the right. */}
      <div className="match-compare">
        <figure className="compare-side">
          {userPhoto ? (
            <img className="compare-img" src={userPhoto} alt="Your photo" />
          ) : (
            <div className="compare-img placeholder-photo"><span>📷</span></div>
          )}
          <figcaption>Your photo</figcaption>
        </figure>
        <span className="compare-vs" aria-hidden="true">vs</span>
        <figure className="compare-side">
          <MatchPhoto
            libraryImageUrl={libraryImageUrl}
            scientificName={match.scientificName}
            commonName={match.commonName}
          />
          <figcaption>{match.commonName}</figcaption>
        </figure>
      </div>

      <div className="ai-match-title">
        <span className={unsure ? 'status-pill locked' : 'status-pill'}>
          {isBest ? 'Best guess' : `Maybe #${index + 1}`}
        </span>
        <h3>{match.commonName}</h3>
      </div>

      {match.whyThisBird && (
        <p className="why-this-bird">
          <strong>Why this bird:</strong> {match.whyThisBird}
        </p>
      )}

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
            <article
              className="bird-card memory-bird-card tappable"
              key={bird.id}
              onClick={() => openBirdProfile({ source: 'memory', id: bird.id })}
            >
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
    ...(bird.regionTags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function libraryBirdMatchesFilter(bird, filter) {
  if (filter === 'All') return true
  if (filter === 'Near me') return Boolean(bird.nearMe)
  if (filter === 'Seen') return Boolean(bird.seen)
  if (filter === 'Not seen') return !bird.seen

  const filterKey = filter.toLowerCase()
  return [bird.category, ...(bird.tags || [])]
    .filter(Boolean)
    .some((value) => value.toLowerCase() === filterKey)
}

// Aspirational Pokédex-style goal: collect all common SA birds.
const TOTAL_SA_BIRDS = 150

function SaBirdLibraryPage({ data, openBirdProfile, goToSpot }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const seenCount = data.birdLibrary.filter((bird) => bird.seen).length
  const searchKey = searchTerm.trim().toLowerCase()
  const filteredBirds = data.birdLibrary
    .filter((bird) => libraryBirdMatchesFilter(bird, activeFilter))
    .filter((bird) => !searchKey || getBirdSearchText(bird).includes(searchKey))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
  const progressValue = Math.min(100, Math.round((seenCount / TOTAL_SA_BIRDS) * 100))

  const marnichSpecies = useMemo(() => {
    const set = new Set()
    data.sightings.forEach((sighting) => {
      if (!sighting.seenWithMarnich) return
      set.add(normalizeBirdName(sighting.birdName))
      if (sighting.aiMatch?.commonName) set.add(normalizeBirdName(sighting.aiMatch.commonName))
      if (sighting.aiMatch?.scientificName) set.add(normalizeBirdName(sighting.aiMatch.scientificName))
    })
    return set
  }, [data.sightings])

  return (
    <div className="page-grid library-page">
      <section className="soft-card full-span checklist-hero scrapbook-hero">
        <p className="eyebrow">Your bird collection</p>
        <h2 className="discovered-count">{seenCount} / {TOTAL_SA_BIRDS} birds found 🐦</h2>
        <p className="discovered-sub">Catch them all — snap a real photo to unlock each one</p>
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

      {data.discoveries.length > 0 && (
        <section className="soft-card full-span discoveries-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">My Discoveries 🌟</p>
              <h3>Birds you found that weren&apos;t in the Bird Book</h3>
            </div>
            <span className="status-pill">{data.discoveries.length}</span>
          </div>
          <div className="discovery-grid">
            {data.discoveries.map((discovery) => (
              <article className="discovery-card" key={discovery.id}>
                {discovery.photo ? (
                  <img src={discovery.photo} alt={discovery.birdName} />
                ) : (
                  <div className="discovery-photo-placeholder" aria-hidden="true">🌟</div>
                )}
                <div>
                  <span className="status-pill rare">Discovered by Pooks 🌟</span>
                  <h4>{discovery.birdName}</h4>
                  <p className="fine-print">{discovery.scientificName || formatDate(discovery.date)}</p>
                  {discovery.addedToLibrary && (
                    <p className="fine-print">In the Bird Book 📖</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="full-span library-grid" aria-live="polite">
        {filteredBirds.length === 0 && (
          <EmptyState text="No birds match this checklist search yet." />
        )}
        {filteredBirds.map((bird) => (
          <LibraryCard
            key={bird.id}
            bird={bird}
            marnichSpecies={marnichSpecies}
            openBirdProfile={openBirdProfile}
            goToSpot={goToSpot}
          />
        ))}
      </section>
    </div>
  )
}

function LibraryCard({ bird, marnichSpecies, openBirdProfile, goToSpot }) {
  // Declared before the early return so hook order stays stable when a bird
  // flips from mystery to caught.
  const [imgError, setImgError] = useState(false)
  const herPhoto = bird.herPhotos?.find((photo) => photo.photo)?.photo || ''
  const spottedPhoto = herPhoto || bird.imageUrl
  const withMarnich =
    bird.seen &&
    (marnichSpecies.has(normalizeBirdName(bird.commonName)) ||
      marnichSpecies.has(normalizeBirdName(bird.scientificName)))

  // Discovered (caught) card: the real photo, the name, opens the profile.
  if (bird.seen) {
    return (
      <article
        className="library-bird-card seen tappable"
        onClick={() => openBirdProfile({ source: 'library', id: bird.id })}
      >
        <div className="bird-card-photo-frame">
          {spottedPhoto ? (
            <img className="bird-card-photo" src={spottedPhoto} alt={bird.commonName} />
          ) : (
            <div className="bird-card-photo placeholder-photo">
              <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
            </div>
          )}
          {withMarnich && <span className="marnich-heart" aria-hidden="true">❤️</span>}
        </div>
        <div className="bird-card-body">
          <span className="status-pill paid">Caught ✅</span>
          <h3>{bird.commonName}</h3>
          <p className="nickname">{bird.afrikaansName || bird.category}</p>
          <p className="memory-caption">
            {`${bird.timesSeen || 1} sighting${bird.timesSeen === 1 ? '' : 's'}${withMarnich ? ' · with Marnich ❤️' : ''}`}
          </p>
          <button
            className="secondary-btn wide big-btn"
            type="button"
            onClick={() => openBirdProfile({ source: 'library', id: bird.id })}
          >
            Open profile
          </button>
        </div>
      </article>
    )
  }

  // Mystery card: darkened silhouette + ??? + one cryptic clue + go-spot button.
  // The only way to unlock is to upload a real photo the AI confirms.
  // If there's no real photo, or it fails to load, show a big ? — never a black box.
  const showSilhouette = bird.imageUrl && !bird.imageUrl.includes('placehold') && !imgError

  return (
    <article className="library-bird-card mystery-card">
      {showSilhouette ? (
        <div className="bird-card-photo-frame mystery-frame">
          <img
            className="bird-card-photo silhouette-shape"
            src={bird.imageUrl}
            alt="Mystery bird silhouette"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="bird-card-photo silhouette-photo">
          <span aria-hidden="true">?</span>
        </div>
      )}
      <div className="bird-card-body">
        <span className={bird.special ? 'status-pill rare' : 'status-pill locked'}>
          {bird.special ? 'Rare mystery ✨' : 'Mystery ?'}
        </span>
        <h3>???</h3>
        <p className="mystery-clue">
          {bird.mysteryClue || 'A little mystery waiting to be found.'}
        </p>
        <button className="primary-btn wide big-btn" type="button" onClick={goToSpot}>
          I think I found it! → go spot it
        </button>
      </div>
    </article>
  )
}

const SOUND_CACHE_PREFIX = 'pooks-bird-sound-'

function readSoundCache(query, cacheKey, presetUrl) {
  if (presetUrl) return { status: 'ready', url: presetUrl }
  if (!query) return { status: 'none', url: '' }
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached === 'NONE') return { status: 'empty', url: '' }
    if (cached) return { status: 'ready', url: cached }
  } catch {
    // ignore cache read errors
  }
  // Button is always offered; the recording is fetched on first tap.
  return { status: 'idle', url: '' }
}

// xeno-canto API v3 needs TAGGED queries. The valid tags are gen: (genus) and
// sp: (species) — NOT sci:, name: or en: (en: only works for a single word).
// A scientific name "Numida meleagris" becomes gen:Numida+sp:meleagris
// (the + is read by the API as a space separating the two tags).
function buildXenoCantoQuery(scientificName) {
  const sci = String(scientificName || '').trim()
  if (!sci) return ''
  const [genus, species] = sci.split(/\s+/)
  if (genus && species) {
    return `gen:${encodeURIComponent(genus)}+sp:${encodeURIComponent(species)}`
  }
  if (genus) return `gen:${encodeURIComponent(genus)}`
  return ''
}

function BirdSound({ scientificName, fallbackName, presetUrl }) {
  // The query is built from the scientific name (gen:+sp:). fallbackName is only
  // used for the cache key / display when no scientific name is available.
  const query = String(scientificName || fallbackName || '').trim()
  const searchQuery = buildXenoCantoQuery(scientificName)
  const cacheKey = `${SOUND_CACHE_PREFIX}${query.toLowerCase()}`
  const initial = readSoundCache(query, cacheKey, presetUrl)
  const [status, setStatus] = useState(initial.status)
  const [url, setUrl] = useState(initial.url)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const wantsPlayRef = useRef(false)

  useEffect(() => {
    if (status !== 'loading') return undefined

    let cancelled = false

    // No scientific name -> nothing to query. Resolve as empty asynchronously
    // (a synchronous setState in an effect body is disallowed by lint).
    if (!searchQuery) {
      Promise.resolve().then(() => {
        if (!cancelled) setStatus('empty')
      })
      return () => {
        cancelled = true
      }
    }

    const apiKey = getXenoCantoKey()
    const keySource = XENO_CANTO_ENV_KEY
      ? 'build env (VITE_XENO_CANTO_KEY)'
      : apiKey
        ? 'localStorage (admin-entered)'
        : 'NONE'
    // The real request URL uses the tagged query + the raw key value.
    const requestUrl = `https://xeno-canto.org/api/3/recordings?query=${searchQuery}&key=${encodeURIComponent(apiKey)}`
    // For logging only, redact the key so the secret never prints and the
    // placeholder can't be mistaken for the value being sent.
    const loggedUrl = apiKey
      ? requestUrl.replace(encodeURIComponent(apiKey), 'KEY_REDACTED')
      : requestUrl
    console.log('[xeno-canto] requesting recording', {
      bird: query,
      taggedQuery: searchQuery,
      keySource,
      keyLength: apiKey.length,
      url: loggedUrl,
    })
    if (!apiKey) {
      console.warn(
        '[xeno-canto] No API key found. The build env key is empty and no admin key is saved. ' +
          'Set VITE_XENO_CANTO_KEY in the Vercel (frontend) build and REDEPLOY, ' +
          'or paste a key in Admin → Bird song API key.',
      )
    }

    fetch(requestUrl)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          console.warn('[xeno-canto] API responded with an error', {
            status: response.status,
            statusText: response.statusText,
            body: body.slice(0, 300),
          })
          throw new Error(`xeno-canto HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((payload) => {
        if (cancelled) return
        const count = payload?.recordings?.length || 0
        console.log(`[xeno-canto] success — ${count} recording(s) for "${query}"`)
        const recording = (payload?.recordings || []).find((item) => item.file)
        const raw = recording?.file || ''
        const normalized = raw.startsWith('//') ? `https:${raw}` : raw
        if (normalized) {
          try {
            localStorage.setItem(cacheKey, normalized)
          } catch {
            // ignore
          }
          setUrl(normalized)
          setStatus('ready')
        } else {
          try {
            localStorage.setItem(cacheKey, 'NONE')
          } catch {
            // ignore
          }
          setStatus('empty')
        }
      })
      .catch((error) => {
        // A genuine network/CORS failure throws a TypeError here; an API error
        // (e.g. 401 invalid key) is logged above with its status + body.
        console.warn('[xeno-canto] request failed:', error?.message || error)
        if (!cancelled) setStatus('empty')
      })

    return () => {
      cancelled = true
    }
  }, [status, query, searchQuery, cacheKey])

  // Once a recording is ready after the user asked to play, start it.
  useEffect(() => {
    if (status === 'ready' && wantsPlayRef.current && audioRef.current) {
      wantsPlayRef.current = false
      audioRef.current.play().catch(() => setStatus('empty'))
    }
  }, [status, url])

  if (status === 'none') return null

  function toggle() {
    if (status === 'idle' || status === 'empty') {
      wantsPlayRef.current = true
      setStatus('loading')
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => setStatus('empty'))
    } else {
      audio.pause()
    }
  }

  const label =
    status === 'loading'
      ? 'Finding a recording…'
      : status === 'empty'
        ? 'Try for a recording 🎵'
        : playing
          ? 'Pause 🎵'
          : 'Hear this bird 🎵'

  return (
    <div className="bird-sound">
      <button
        className="primary-btn wide big-btn sound-btn"
        type="button"
        onClick={toggle}
        disabled={status === 'loading'}
      >
        {label}
      </button>
      {playing && (
        <div className="sound-wave" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * 90}ms` }}></span>
          ))}
        </div>
      )}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </div>
  )
}

const WIKI_PHOTO_CACHE_PREFIX = 'pooks-wiki-photos-'
const WIKI_NEST_CACHE_PREFIX = 'pooks-wiki-nest-'

function prettyWikiCaption(fileTitle) {
  return String(fileTitle || '')
    .replace(/^File:/i, '')
    .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{3,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70)
}

// Pull a few real photos for a bird from Wikipedia's media list (CORS-friendly).
function fetchWikipediaPhotos(title) {
  const slug = String(title || '').trim().replace(/\s+/g, '_')
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(slug)}`
  return fetch(url)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad'))))
    .then((payload) => {
      const items = Array.isArray(payload?.items) ? payload.items : []
      const photos = []
      for (const item of items) {
        if (item.type !== 'image') continue
        const fileTitle = String(item.title || '')
        if (/(logo|icon|map|distribution|range|locator|\.svg|sound|audio|\.ogg)/i.test(fileTitle)) {
          continue
        }
        const srcset = Array.isArray(item.srcset) ? item.srcset : []
        const best = srcset[srcset.length - 1] || srcset[0]
        let src = best?.src || ''
        if (!src) continue
        if (src.startsWith('//')) src = `https:${src}`
        if (/\.svg/i.test(src)) continue
        photos.push({ src, caption: prettyWikiCaption(fileTitle) })
        if (photos.length >= 4) break
      }
      return photos
    })
}

function useWikipediaPhotos(scientificName, commonName) {
  const primary = String(scientificName || '').trim()
  const secondary = String(commonName || '').trim()
  const cacheKey = `${WIKI_PHOTO_CACHE_PREFIX}${(primary || secondary).toLowerCase()}`
  const [state, setState] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) return { status: 'ready', photos: JSON.parse(cached) }
    } catch {
      // ignore cache read errors
    }
    return { status: primary || secondary ? 'loading' : 'none', photos: [] }
  })

  useEffect(() => {
    if (state.status !== 'loading') return undefined
    let cancelled = false
    const titles = [primary, secondary].filter(Boolean)

    ;(async () => {
      for (const title of titles) {
        try {
          const photos = await fetchWikipediaPhotos(title)
          if (cancelled) return
          if (photos.length) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(photos))
            } catch {
              // ignore cache write errors
            }
            setState({ status: 'ready', photos })
            return
          }
        } catch {
          // try the next title
        }
      }
      if (!cancelled) setState({ status: 'none', photos: [] })
    })()

    return () => {
      cancelled = true
    }
  }, [state.status, primary, secondary, cacheKey])

  return state
}

function BirdPhotoStrip({ scientificName, commonName, fallbackPhoto }) {
  const { status, photos } = useWikipediaPhotos(scientificName, commonName)
  const showFallback = status !== 'ready' && fallbackPhoto

  return (
    <section className="soft-card full-span photo-strip-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Is this your bird?</p>
          <h3>Reference photos</h3>
        </div>
        <span className="status-pill">Wikipedia</span>
      </div>
      {status === 'loading' && <p className="fine-print">Fetching photos from Wikipedia…</p>}
      {status === 'none' && !fallbackPhoto && (
        <p className="fine-print">No reference photos found for this bird yet.</p>
      )}
      <div className="polaroid-strip" role="list">
        {showFallback && (
          <figure className="polaroid" role="listitem">
            <img src={fallbackPhoto} alt={commonName} loading="lazy" />
            <figcaption>{commonName}</figcaption>
          </figure>
        )}
        {photos.map((photo, index) => (
          <figure className="polaroid" role="listitem" key={`${photo.src}-${index}`}>
            <img src={photo.src} alt={`${commonName} reference ${index + 1}`} loading="lazy" />
            <figcaption>{photo.caption || commonName}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function useWikipediaNestPhoto(scientificName, commonName) {
  const query = `${String(scientificName || commonName || '').trim()} nest`.trim()
  const cacheKey = `${WIKI_NEST_CACHE_PREFIX}${query.toLowerCase()}`
  const [url, setUrl] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) return cached === 'NONE' ? '' : cached
    } catch {
      // ignore
    }
    return ''
  })
  const [done, setDone] = useState(() => {
    try {
      return Boolean(localStorage.getItem(cacheKey))
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (done || query.length < 5) return undefined
    let cancelled = false
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=500`
    fetch(api)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad'))))
      .then((payload) => {
        if (cancelled) return
        const pages = payload?.query?.pages ? Object.values(payload.query.pages) : []
        const found = pages
          .map((page) => page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || '')
          .find((candidate) => candidate && !/\.svg/i.test(candidate))
        try {
          localStorage.setItem(cacheKey, found || 'NONE')
        } catch {
          // ignore
        }
        if (found) setUrl(found)
        setDone(true)
      })
      .catch(() => {
        if (!cancelled) setDone(true)
      })

    return () => {
      cancelled = true
    }
  }, [done, query, cacheKey])

  return url
}

function NestSection({ nest, scientificName, commonName }) {
  const nestPhoto = useWikipediaNestPhoto(scientificName, commonName)
  if (!nest) return null

  return (
    <section className="soft-card full-span nest-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Their Home 🪺</p>
          <h3>{nest.type || 'Nest'}</h3>
        </div>
      </div>
      <div className="nest-layout">
        <div className="nest-text">
          {nest.description && <p>{nest.description}</p>}
          <dl className="bird-meta">
            {nest.location && (
              <div>
                <dt>Where they build it</dt>
                <dd>{nest.location}</dd>
              </div>
            )}
            {nest.appearance && (
              <div>
                <dt>What it looks like</dt>
                <dd>{nest.appearance}</dd>
              </div>
            )}
          </dl>
        </div>
        {(nest.nestPhoto || nestPhoto) && (
          <figure className="nest-photo">
            <img src={nest.nestPhoto || nestPhoto} alt={`${commonName} nest`} loading="lazy" />
            <figcaption>Nest photo · Wikimedia</figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

function FieldNotesSection({ profileKey, saved, saveFieldGuideNotes }) {
  const [fieldNotes, setFieldNotes] = useState(saved.fieldNotes || '')
  const [spottedAt, setSpottedAt] = useState(saved.spottedAt || '')
  const [justSaved, setJustSaved] = useState(false)
  const myPhotos = saved.myPhotos || []

  function handleSave() {
    saveFieldGuideNotes(profileKey, { fieldNotes, spottedAt })
    setJustSaved(true)
    window.setTimeout(() => setJustSaved(false), 2200)
  }

  function handleMyPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      saveFieldGuideNotes(profileKey, {
        myPhotos: [...myPhotos, { id: createId('myphoto'), photo: reader.result }],
      })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function removeMyPhoto(id) {
    saveFieldGuideNotes(profileKey, { myPhotos: myPhotos.filter((item) => item.id !== id) })
  }

  return (
    <section className="soft-card full-span field-notes-card">
      <p className="eyebrow">My field notes ✏️</p>
      <h3>Your own observations</h3>
      <div className="form-grid">
        <label>
          Spotted at location
          <input
            value={spottedAt}
            onChange={(event) => setSpottedAt(event.target.value)}
            placeholder="e.g. Kruger National Park, near Skukuza"
          />
        </label>
        <label>
          Field notes
          <textarea
            value={fieldNotes}
            onChange={(event) => setFieldNotes(event.target.value)}
            placeholder="What did it look like, what was it doing, who were you with?"
          />
        </label>
      </div>
      <button className="primary-btn" type="button" onClick={handleSave}>
        {justSaved ? 'Saved ✓' : 'Save my notes'}
      </button>

      <div className="section-heading my-photos-heading">
        <div>
          <p className="eyebrow">My photos 📷</p>
          <h4>Your own shots of this bird</h4>
        </div>
        <label className="secondary-btn photo-upload-btn">
          Add a photo
          <input type="file" accept="image/*" onChange={handleMyPhoto} hidden />
        </label>
      </div>
      {myPhotos.length === 0 ? (
        <p className="fine-print">No personal photos yet — add your own when you spot it.</p>
      ) : (
        <div className="my-photo-grid">
          {myPhotos.map((item) => (
            <figure className="my-photo" key={item.id}>
              <img src={item.photo} alt="My bird photo" loading="lazy" />
              <button
                className="text-btn remove-photo"
                type="button"
                onClick={() => removeMyPhoto(item.id)}
              >
                Remove
              </button>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

function BirdProfilePage({ data, profile, onBack, saveFieldGuideNotes }) {
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

  const profileKey = libraryBird
    ? libraryBird.id
    : `memory:${memoryBird?.id || normalizeBirdName(profileBird.commonName)}`
  const savedNotes = data.fieldGuideNotes?.[profileKey] || {
    fieldNotes: '',
    spottedAt: '',
    myPhotos: [],
  }
  const fieldGuideRows = [
    ['Identification tips', profileBird.idTips],
    ['Similar species', (profileBird.similarSpecies || aiDetails?.similarBirds || []).join(', ')],
    ['Best time to spot', profileBird.bestTime],
    ['Behaviour notes', profileBird.behaviour],
    ['Call description', profileBird.callDescription || profileBird.soundDescription || aiDetails?.soundDescription],
    ['Habitat', profileBird.habitat || aiDetails?.habitat],
    ['Conservation status', profileBird.conservationStatus],
  ].filter(([, value]) => Boolean(value))

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

      <BirdPhotoStrip
        scientificName={profileBird.scientificName || aiDetails?.scientificName}
        commonName={profileBird.commonName}
        fallbackPhoto={profileBird.imageUrl || latestPhoto}
      />

      {fieldGuideRows.length > 0 && (
        <section className="soft-card full-span field-guide-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Field guide 🔎</p>
              <h3>How to know it in the field</h3>
            </div>
          </div>
          <dl className="bird-meta profile-meta">
            {fieldGuideRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <NestSection
        nest={profileBird.nest}
        scientificName={profileBird.scientificName}
        commonName={profileBird.commonName}
      />

      <details className="soft-card full-span profile-detail-card">
        <summary>All recorded details</summary>
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
        <p className="eyebrow">Bird song</p>
        <h3>{profileBird.soundDescription || aiDetails?.soundDescription || 'Tap to hear what this bird sounds like'}</h3>
        <BirdSound
          key={profileBird.scientificName || profileBird.commonName}
          scientificName={profileBird.scientificName || aiDetails?.scientificName}
          fallbackName={profileBird.commonName}
          presetUrl={profileBird.soundUrl}
        />
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

      <FieldNotesSection
        profileKey={profileKey}
        saved={savedNotes}
        saveFieldGuideNotes={saveFieldGuideNotes}
      />

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marlie's logged sightings</p>
            <h3>Your spotting history</h3>
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

function RewardsPage({
  data,
  stats,
  claimReward,
  markRewardPaid,
  isAdmin,
  buyMysteryBox,
  buyHiddenNote,
  buyDateIdea,
  buyFeaturedBirdProfile,
  buyStoreItem,
}) {
  const [tab, setTab] = useState('surprises')
  const revealedRewards = data.rewards.filter((reward) => reward.status !== 'Locked')
  const claimedRewards = revealedRewards.filter((reward) =>
    ['Claimed', 'Paid'].includes(reward.status),
  )
  const unlockedNotes = data.hiddenNotes.filter((note) => note.unlocked)
  const birdsUntilReward = stats.nextReward
    ? Math.max(stats.nextReward.milestone - stats.uniqueCount, 0)
    : 0
  const coins = data.featherCoins
  const shopItems = [
    { id: 'mysteryBox', name: 'Mystery gift box', emoji: '🎁', cost: SHOP.mysteryBox, action: buyMysteryBox, hint: 'A surprise message or reward' },
    { id: 'hiddenNote', name: 'Hidden note from Marnich', emoji: '💌', cost: SHOP.hiddenNote, action: buyHiddenNote, hint: 'Unlock a folded love note' },
    { id: 'birdProfile', name: 'Special bird profile', emoji: '✨', cost: SHOP.birdProfile, action: buyFeaturedBirdProfile, hint: 'Reveal a rare bird' },
    { id: 'dateIdea', name: 'Date idea', emoji: '💕', cost: SHOP.dateIdea, action: buyDateIdea, hint: 'Unlock a real date plan' },
  ]

  return (
    <div className="page-grid surprises-page">
      <section className="soft-card full-span coin-shop-hero">
        <div>
          <p className="eyebrow">Feather Coins</p>
          <h2 className="coin-balance">{coins} 🪙</h2>
        </div>
        <p>
          {stats.nextReward
            ? `${birdsUntilReward} bird${birdsUntilReward === 1 ? '' : 's'} until your next milestone gift.`
            : 'Every milestone gift is open. Legendary shelves are whispering.'}
        </p>
      </section>

      <div className="store-tabs" role="tablist">
        <button
          className={tab === 'surprises' ? 'filter-chip active' : 'filter-chip'}
          type="button"
          onClick={() => setTab('surprises')}
        >
          Marnich Surprises 🎁
        </button>
        <button
          className={tab === 'store' ? 'filter-chip active' : 'filter-chip'}
          type="button"
          onClick={() => setTab('store')}
        >
          Bird Store 🛒
        </button>
      </div>

      {tab === 'store' ? (
        <BirdStore store={data.store} coins={coins} onBuy={buyStoreItem} />
      ) : (
      <>
      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coin shop</p>
            <h2>Spend your coins</h2>
          </div>
        </div>
        <div className="shop-grid">
          {shopItems.map((item) => (
            <article className="shop-tile" key={item.id}>
              <div className="shop-emoji" aria-hidden="true">{item.emoji}</div>
              <h3>{item.name}</h3>
              <small>{item.hint}</small>
              <button
                className="primary-btn wide big-btn"
                type="button"
                disabled={coins < item.cost}
                onClick={item.action}
              >
                {item.cost} 🪙
              </button>
            </article>
          ))}
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
                    {reward.status === 'Unlocked'
                      ? 'Ready'
                      : reward.status === 'Paid'
                        ? 'Sent 💛'
                        : reward.status === 'Claimed'
                          ? 'Pending'
                          : reward.status}
                  </span>
                  <h3>{reward.name}</h3>
                  <details className="tiny-details">
                    <summary>Peek at why</summary>
                    <p>{reward.unlockReason}</p>
                  </details>
                  {reward.status === 'Paid' && (
                    <p className="sent-line">Marnich sent this on {formatDate(reward.paidAt)} 💛</p>
                  )}
                </div>
                {reward.status === 'Unlocked' && (
                  <button
                    className="primary-btn wide big-btn"
                    type="button"
                    onClick={() => claimReward(reward.id)}
                  >
                    Open gift
                  </button>
                )}
                {isAdmin && reward.status === 'Claimed' && (
                  <button
                    className="secondary-btn wide big-btn"
                    type="button"
                    onClick={() => markRewardPaid(reward.id)}
                  >
                    Mark as sent 💛
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
      </>
      )}
    </div>
  )
}

function ChallengesPage({ dailyChallenge, completeDailyChallenge }) {
  return (
    <div className="page-grid">
      <section className="soft-card feature-card full-span">
        <p className="eyebrow">Today's Challenge</p>
        <h2>{dailyChallenge.main?.text || 'Find one suspicious bird moment'}</h2>
        <p>Show the Bird Council a photo or describe what you saw in at least 20 words.</p>
        <ChallengeProof
          challenge={dailyChallenge.main}
          complete={dailyChallenge.mainComplete}
          onValidated={() => completeDailyChallenge('daily')}
          label="I completed this"
        />
      </section>

      <section className="soft-card subtle-bonus-card full-span">
        <p className="eyebrow">Optional bonus</p>
        <h3>{dailyChallenge.bonus?.text || 'Notice one extra tiny detail'}</h3>
        <p>This one is optional — the same proof rules apply.</p>
        <ChallengeProof
          challenge={dailyChallenge.bonus}
          complete={dailyChallenge.bonusComplete}
          onValidated={() => completeDailyChallenge('bonus')}
          label="I did the bonus"
        />
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

function BirdDatePage({ data, rotateDateMission, completeBirdDate, toggleDateFavourite }) {
  const [step, setStep] = useState('idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState('')

  function reset() {
    setStep('idle')
    setCode('')
    setError('')
    setPhoto('')
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result)
    reader.readAsDataURL(file)
  }

  function confirmCode() {
    if (code.trim() === String(data.settings.marnichCode || '1972')) {
      completeBirdDate({ confirmed: true, photo })
      reset()
    } else {
      setError("That's not Marnich's code 🐦 try again")
    }
  }

  return (
    <div className="page-grid">
      <section className="soft-card feature-card full-span">
        <p className="eyebrow">Bird Date Mode</p>
        <h2>{data.settings.currentDateMission}</h2>
        {step === 'idle' && (
          <>
            <p>
              Complete the mission together to earn +100 Feather Coins (and +200 bonus if Marnich
              confirms he joined you).
            </p>
            <div className="button-row">
              <button className="secondary-btn" type="button" onClick={rotateDateMission}>
                New mission
              </button>
              <button className="primary-btn" type="button" onClick={() => setStep('confirm')}>
                Complete Bird Date
              </button>
            </div>
          </>
        )}
        {step === 'confirm' && (
          <div className="date-confirm">
            <p className="eyebrow">Did Marnich join you? Enter his secret code 🔐</p>
            <label className="date-photo-label">
              Add a date photo (optional)
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </label>
            {photo && <img className="date-photo-preview" src={photo} alt="Date" />}
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setError('')
              }}
              placeholder="Marnich's code"
              inputMode="numeric"
            />
            {error && <p className="login-error">{error}</p>}
            <div className="button-row">
              <button className="primary-btn" type="button" onClick={confirmCode}>
                Confirm with Marnich 💛
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  completeBirdDate({ confirmed: false, photo })
                  reset()
                }}
              >
                We birded solo
              </button>
            </div>
            <button className="text-btn" type="button" onClick={reset}>
              Cancel
            </button>
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Date memories</p>
            <h2>Our bird dates</h2>
          </div>
          <span className="status-pill">{data.dateMemories.length}</span>
        </div>
        <div className="date-memory-grid">
          {data.dateMemories.length === 0 && (
            <EmptyState text="Your next bird date memory will land here." />
          )}
          {data.dateMemories.map((memory) => (
            <article
              className={`date-polaroid${memory.favorite ? ' favourite' : ''}`}
              key={memory.id}
            >
              {memory.photo ? (
                <img src={memory.photo} alt="Date memory" />
              ) : (
                <div className="date-polaroid-placeholder" aria-hidden="true">💕🐦</div>
              )}
              <div className="date-polaroid-body">
                <p className="eyebrow">{formatDate(memory.date)}</p>
                <h3>{memory.note}</h3>
                <p>{memory.mission}</p>
                {memory.marnichConfirmed && (
                  <span className="status-pill paid">Spotted with Marnich ❤️</span>
                )}
              </div>
              <button
                className={`date-fav-btn${memory.favorite ? ' on' : ''}`}
                type="button"
                aria-label="Favourite date"
                onClick={() => toggleDateFavourite(memory.id)}
              >
                {memory.favorite ? '❤️' : '🤍'}
              </button>
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

function getWeeklyRecap(data) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffValue = cutoff.toISOString().slice(0, 10)
  const sightingsThisWeek = data.sightings.filter(
    (sighting) => (sighting.dateSpotted || '') >= cutoffValue,
  )
  const speciesThisWeek = new Set(sightingsThisWeek.map((sighting) => sighting.speciesKey)).size
  const seenLibrary = data.birdLibrary.filter((bird) => bird.seen).length

  return {
    sightingsThisWeek: sightingsThisWeek.length,
    speciesThisWeek,
    totalSpecies: data.birds.length,
    seenLibrary,
    coins: data.featherCoins,
    streak: getDailyStreak(data.dailyChallengeCompletions),
  }
}

function WeeklyMagazinePage({ data, openBirdProfile }) {
  const issue = getWeeklyMagazineIssue(data.birdLibrary, data.settings)
  const season = getSeasonInfo()
  const weekIndex = getAbsoluteWeekIndex()
  const quote = getWeeklyQuote(weekIndex)
  const coverBird = issue.birdOfWeek
  // The featured bird is deliberately different from the cover bird.
  const featuredBird =
    issue.featuredBirds.find((bird) => bird.id !== coverBird?.id) || issue.featuredBirds[1] || null
  const recap = getWeeklyRecap(data)
  const [page, setPage] = useState(0)

  const coverPhoto = (commonName, imageUrl) =>
    imageUrl ? (
      <img className="magazine-cover-photo" src={imageUrl} alt={commonName} />
    ) : (
      <div className="magazine-cover-photo placeholder-photo">
        <span>{getBirdPhotoPlaceholderLabel(commonName)}</span>
      </div>
    )

  const pages = []

  // Page 1 — the cover.
  pages.push(
    <div className="magazine-cover-page" key="cover">
      <p className="magazine-issue-no">The Weekly Feather · Issue {issue.week}</p>
      <p className="magazine-season">{season.name} edition · {season.greeting}</p>
      {coverBird && coverPhoto(coverBird.commonName, coverBird.imageUrl)}
      <p className="magazine-quote">“{quote}”</p>
      {coverBird && (
        <>
          <h2>Cover bird: {coverBird.commonName}</h2>
          <p className="nickname">{coverBird.afrikaansName}</p>
          <button
            className="primary-btn"
            type="button"
            onClick={() => openBirdProfile({ source: 'library', id: coverBird.id })}
          >
            Meet the cover bird
          </button>
        </>
      )}
    </div>,
  )

  // Page 2 — featured bird (different content from the cover).
  if (featuredBird) {
    pages.push(
      <div className="magazine-feature-page" key="feature">
        <p className="eyebrow">Featured this week</p>
        <h2>{featuredBird.commonName}</h2>
        <p className="nickname">{featuredBird.afrikaansName}</p>
        <dl className="bird-meta profile-meta">
          <div>
            <dt>Habitat</dt>
            <dd>{featuredBird.habitat || featuredBird.region || 'Across South Africa'}</dd>
          </div>
          <div>
            <dt>Field notes</dt>
            <dd>{featuredBird.behaviour || featuredBird.description}</dd>
          </div>
        </dl>
        <p className="eyebrow">Fun facts</p>
        <div className="mini-list">
          {getFunFacts(featuredBird.funFacts).slice(0, 3).map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
        </div>
        <button
          className="secondary-btn wide"
          type="button"
          onClick={() => openBirdProfile({ source: 'library', id: featuredBird.id })}
        >
          Open full profile
        </button>
      </div>,
    )
  }

  // Page 3 — challenge + date idea.
  pages.push(
    <div className="magazine-activities-page" key="activities">
      <section className="soft-card magazine-note">
        <p className="eyebrow">This week’s challenge 🎯</p>
        <h3>{data.magazineIssue.monthlyChallenge}</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Bird date idea 💕</p>
        <h3>{data.magazineIssue.birdDateIdea}</h3>
      </section>
    </div>,
  )

  // Page 4 — message from Marnich + Pooks' weekly recap.
  pages.push(
    <div className="magazine-recap-page" key="recap">
      <section className="soft-card magazine-note">
        <p className="eyebrow">A message from Marnich 💌</p>
        <h3>{data.magazineIssue.marnichMessage}</h3>
      </section>
      <p className="eyebrow">Pooks’ weekly recap</p>
      <div className="magazine-recap-grid">
        <StatCard label="Birds this week" value={recap.sightingsThisWeek} detail="sightings logged" />
        <StatCard label="New species" value={recap.speciesThisWeek} detail="this week" />
        <StatCard label="Feather coins" value={recap.coins} detail="in the bank" />
        <StatCard label="Day streak" value={recap.streak} detail="keep it going 🔥" />
      </div>
    </div>,
  )

  // Page 5 — inside this issue gallery.
  pages.push(
    <div className="magazine-gallery-page" key="gallery">
      <p className="eyebrow">Inside this issue</p>
      <h2>More birds to dream about</h2>
      <div className="magazine-grid">
        {issue.featuredBirds.map((bird) => (
          <article className="magazine-bird-card" key={bird.id}>
            {bird.imageUrl ? (
              <img src={bird.imageUrl} alt={bird.commonName} />
            ) : (
              <div className="magazine-photo-placeholder">
                <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
              </div>
            )}
            <div>
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
    </div>,
  )

  const total = pages.length
  const safePage = Math.min(page, total - 1)

  return (
    <div className={`magazine-page magazine-book season-${season.key}`}>
      <div className="magazine-spread" key={safePage}>
        {pages[safePage]}
      </div>

      <div className="magazine-nav">
        <button
          className="secondary-btn"
          type="button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={safePage === 0}
        >
          ‹ Flip back
        </button>
        <div className="magazine-dots" aria-label="Magazine pages">
          {pages.map((node, index) => (
            <button
              key={node.key}
              type="button"
              className={index === safePage ? 'active' : ''}
              aria-label={`Page ${index + 1}`}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
        <button
          className="secondary-btn"
          type="button"
          onClick={() => setPage((current) => Math.min(total - 1, current + 1))}
          disabled={safePage === total - 1}
        >
          Turn page ›
        </button>
      </div>
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
  stats,
  dailyStreak,
  addAdminReward,
  addAdminChallenge,
  addAdminNote,
  addAdminCode,
  markRewardPaid,
  sendSurpriseNote,
  sendTweetyTreat,
  sendMysteryEgg,
  sendFlockTreat,
  addDiscoveryToLibrary,
  buyStoreItem,
  onQuizDone,
  onWordleDone,
  on20QDone,
  setTrashTalk,
  resetData,
  previewMarlieView,
  previewMagazineIssue,
  setData,
}) {
  const [surpriseNote, setSurpriseNote] = useState('')
  const [trashDraft, setTrashDraft] = useState('')
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
  const [xenoKey, setXenoKey] = useState(() => {
    try {
      return localStorage.getItem(XENO_CANTO_KEY_STORAGE) || ''
    } catch {
      return ''
    }
  })

  function saveXenoKey(value) {
    setXenoKey(value)
    try {
      if (value.trim()) {
        localStorage.setItem(XENO_CANTO_KEY_STORAGE, value.trim())
      } else {
        localStorage.removeItem(XENO_CANTO_KEY_STORAGE)
      }
    } catch {
      // ignore storage failures
    }
  }
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

  function updateSetting(field, value) {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, [field]: value },
    }))
  }

  function updateList(field, value) {
    const items = value.split('\n').map((line) => line.trim()).filter(Boolean)
    setData((current) => ({ ...current, [field]: items }))
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

  const recentSightings = [...data.sightings].reverse().slice(0, 12)
  const challengeHistory = Object.entries(data.dailyChallengeCompletions || {})
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)
  const pendingRewards = data.rewards.filter((reward) => reward.status === 'Claimed')
  const upcomingChallenges = Array.from({ length: 5 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    const dateValue = date.toISOString().slice(0, 10)
    return { date: dateValue, challenge: getDailyChallenge(data.challenges, dateValue) }
  })
  const nameForFieldKey = (key) => {
    if (key.startsWith('memory:')) return key.slice(7)
    const match = data.birdLibrary.find((bird) => bird.id === key)
    return match ? match.commonName : key
  }
  const fieldNoteEntries = Object.entries(data.fieldGuideNotes || {}).filter(
    ([, value]) =>
      value && (value.fieldNotes || value.spottedAt || (value.myPhotos || []).length),
  )

  function submitSurpriseNote(event) {
    event.preventDefault()
    sendSurpriseNote(surpriseNote)
    setSurpriseNote('')
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

      <section className="soft-card full-span">
        <p className="eyebrow">Pooks at a glance 🐦</p>
        <div className="admin-dashboard-grid">
          <StatCard label="Feather coins" value={data.featherCoins} detail="earned" />
          <StatCard label="Day streak" value={dailyStreak} detail="current 🔥" />
          <StatCard label="Species" value={stats?.uniqueCount ?? data.birds.length} detail="unique birds" />
          <StatCard label="Sightings" value={data.sightings.length} detail="logged" />
          <StatCard
            label="Seen in book"
            value={data.birdLibrary.filter((bird) => bird.seen).length}
            detail={`of ${data.birdLibrary.length}`}
          />
          <StatCard label="Pending gifts" value={pendingRewards.length} detail="to send" />
        </div>
      </section>

      <section className="soft-card full-span admin-games">
        <p className="eyebrow">Play Date Game 🎮</p>
        <h3>Battle Pooks — play the same games, scores saved here</h3>
        <div className="form-grid">
          <label>
            Trash talk to flash on Pooks&apos; games screen
            <input
              value={trashDraft}
              onChange={(event) => setTrashDraft(event.target.value)}
              placeholder="good luck, you'll need it 😏"
            />
          </label>
          <button
            className="secondary-btn"
            type="button"
            disabled={!trashDraft.trim()}
            onClick={() => setTrashTalk(trashDraft)}
          >
            Send trash talk 😏
          </button>
        </div>
        <GamesHub
          data={data}
          who="marnich"
          onQuizDone={onQuizDone}
          onWordleDone={onWordleDone}
          on20QDone={on20QDone}
        />
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Send a surprise note instantly 💌</p>
        <form onSubmit={submitSurpriseNote} className="form-grid">
          <label>
            Note for Pooks
            <textarea
              value={surpriseNote}
              onChange={(event) => setSurpriseNote(event.target.value)}
              placeholder="A little something to make her smile right now…"
            />
          </label>
          <button className="primary-btn" type="submit" disabled={!surpriseNote.trim()}>
            Send surprise note
          </button>
        </form>
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">{data.tweety?.name || 'Tweety'} — her pet bird 🐤</p>
        <div className="admin-dashboard-grid">
          <StatCard
            label="Happiness"
            value={
              tweetyMood(data.tweety) === 'happy'
                ? 'Happy 💛'
                : tweetyMood(data.tweety) === 'sad'
                  ? 'Missing her 🫧'
                  : 'Content'
            }
            detail="today's mood"
          />
          <StatCard label="Care streak" value={tweetyStreak(data.tweety)} detail="days in a row" />
          <StatCard label="Level" value={tweetyLevel(data.birds.length).label} detail="grows with sightings" />
          <StatCard label="Treats sent" value={data.tweety?.treatsReceived || 0} detail="from you 💛" />
        </div>
        <div className="admin-actions">
          <button className="primary-btn" type="button" onClick={sendTweetyTreat}>
            Surprise treat 🎁
          </button>
          <button className="secondary-btn" type="button" onClick={sendMysteryEgg}>
            Send a mystery egg 🥚
          </button>
          <button className="secondary-btn" type="button" onClick={sendFlockTreat}>
            Treat for the flock 🎉
          </button>
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">New Discoveries 🌟</p>
            <h3>Birds Pooks found outside the Bird Book</h3>
          </div>
          <span className="status-pill">
            {data.discoveries.filter((d) => !d.addedToLibrary).length} new
          </span>
        </div>
        {data.discoveries.length === 0 ? (
          <EmptyState text="No discoveries yet — she hasn't found anything off-book." />
        ) : (
          <div className="admin-list-scroll">
            {data.discoveries.map((discovery) => (
              <article className="admin-edit-row" key={discovery.id}>
                <div>
                  <strong>{discovery.birdName}</strong>
                  <p className="fine-print">
                    {discovery.scientificName || 'unknown'} · {formatDate(discovery.date)}
                  </p>
                </div>
                {discovery.addedToLibrary ? (
                  <span className="status-pill paid">In library 📖</span>
                ) : (
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => addDiscoveryToLibrary(discovery.id)}
                  >
                    Add to library 📖
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <details className="soft-card full-span">
        <summary>Gift a Bird Store item to Pooks (free) 🎁</summary>
        <p className="fine-print">Tap any item to send it to her instantly, no coins needed.</p>
        <BirdStore
          store={data.store}
          coins={Infinity}
          giftMode
          onBuy={(section, item) => buyStoreItem(section, item, { free: true })}
        />
      </details>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Her sightings</p>
            <h3>Recent photos</h3>
          </div>
          <span className="status-pill">{data.sightings.length} total</span>
        </div>
        {recentSightings.length === 0 ? (
          <EmptyState text="No sightings logged yet." />
        ) : (
          <div className="admin-thumb-row">
            {recentSightings.map((sighting) => (
              <div className="admin-thumb" key={sighting.id}>
                {sighting.photo ? (
                  <img src={sighting.photo} alt={sighting.birdName} loading="lazy" />
                ) : (
                  <div className="admin-thumb placeholder-photo">
                    <span>{getBirdPhotoPlaceholderLabel(sighting.birdName)}</span>
                  </div>
                )}
                <small>{sighting.birdName}</small>
                <small>{formatDate(sighting.dateSpotted)}</small>
                {sighting.location && <small>{sighting.location}</small>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Pending gifts to send 🎁</p>
        {pendingRewards.length === 0 ? (
          <EmptyState text="No rewards waiting to be sent." />
        ) : (
          <div className="admin-list-scroll">
            {pendingRewards.map((reward) => (
              <article className="admin-edit-row" key={reward.id}>
                <div>
                  <strong>{reward.name}</strong>
                  <p className="fine-print">{reward.unlockReason}</p>
                </div>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => markRewardPaid(reward.id)}
                >
                  Mark as sent
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Upcoming challenges queue 🗓️</p>
        <div className="admin-list-scroll">
          {upcomingChallenges.map(({ date, challenge }) => (
            <article className="admin-edit-row" key={date}>
              <div>
                <strong>{formatDate(date)}</strong>
                <p>{challenge?.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Challenge completion history ✅</p>
        {challengeHistory.length === 0 ? (
          <EmptyState text="No completed challenges yet." />
        ) : (
          <div className="admin-list-scroll">
            {challengeHistory.map(([date, completion]) => (
              <article className="admin-edit-row" key={date}>
                <div>
                  <strong>{formatDate(date)}</strong>
                  <p className="fine-print">
                    {completion.daily ? 'Daily ✓' : ''} {completion.bonus ? 'Bonus ✓' : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Her field notes ✏️</p>
        {fieldNoteEntries.length === 0 ? (
          <EmptyState text="No personal field notes yet." />
        ) : (
          <div className="admin-list-scroll">
            {fieldNoteEntries.map(([key, value]) => (
              <article className="admin-edit-row" key={key}>
                <div>
                  <strong>{nameForFieldKey(key)}</strong>
                  {value.spottedAt && <p className="fine-print">📍 {value.spottedAt}</p>}
                  {value.fieldNotes && <p>{value.fieldNotes}</p>}
                  {(value.myPhotos || []).length > 0 && (
                    <p className="fine-print">{value.myPhotos.length} personal photo(s)</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="soft-card full-span">
        <h3>Login secret words</h3>
        <div className="form-grid two">
          <label>
            Pooks secret word
            <input
              value={data.settings.pooksSecret}
              onChange={(event) => updateSetting('pooksSecret', event.target.value)}
              placeholder="feather"
            />
          </label>
          <label>
            Admin secret word
            <input
              value={data.settings.adminSecret}
              onChange={(event) => updateSetting('adminSecret', event.target.value)}
              placeholder="marnich"
            />
          </label>
          <label>
            Bird Date confirmation code
            <input
              value={data.settings.marnichCode || ''}
              onChange={(event) => updateSetting('marnichCode', event.target.value)}
              placeholder="1972"
            />
          </label>
          <label>
            Tweety love-letter message
            <input
              value={data.settings.tweetyLetter || ''}
              onChange={(event) => updateSetting('tweetyLetter', event.target.value)}
              placeholder="Dear Tweety…"
            />
          </label>
        </div>
        <p className="fine-print">
          Pooks logs in with the name “Pooks”. You log in with the name “Admin”. The date code
          confirms you joined a Bird Date.
        </p>
      </section>

      <section className="soft-card full-span">
        <h3>Today&apos;s message to Pooks</h3>
        <textarea
          value={data.settings.marnichDailyMessage}
          onChange={(event) => updateSetting('marnichDailyMessage', event.target.value)}
          placeholder="A little message under today's mission"
        />
      </section>

      <section className="soft-card full-span">
        <h3>Bird song API key (xeno-canto)</h3>
        <label>
          xeno-canto API key
          <input
            value={xenoKey}
            onChange={(event) => saveXenoKey(event.target.value)}
            placeholder="Paste a free key from xeno-canto.org/account"
          />
        </label>
        <p className="fine-print">
          Free key from xeno-canto.org/account. Without it, the “Hear this bird” button stays
          hidden. (You can also set VITE_XENO_CANTO_KEY in the build env.)
        </p>
      </section>

      <section className="soft-card full-span">
        <h3>Milestone rewards (mark as sent)</h3>
        <div className="admin-edit-list">
          {data.rewards
            .filter((reward) => reward.status !== 'Locked')
            .map((reward) => (
              <article key={reward.id} className="admin-edit-row">
                <span>
                  <strong>{reward.name}</strong>{' '}
                  <span className="fine-print">
                    {reward.status === 'Paid'
                      ? `Sent ${formatDate(reward.paidAt)} 💛`
                      : reward.status}
                  </span>
                </span>
                {reward.status !== 'Paid' && (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => markRewardPaid(reward.id)}
                  >
                    Mark as sent 💛
                  </button>
                )}
              </article>
            ))}
        </div>
      </section>

      <section className="soft-card full-span">
        <h3>Mystery gift box messages</h3>
        <textarea
          value={(data.mysteryGifts || []).join('\n')}
          onChange={(event) =>
            updateList('mysteryGifts', event.target.value)
          }
          placeholder="One surprise message per line"
          rows={4}
        />
        <h3>Date ideas</h3>
        <textarea
          value={(data.dateIdeas || []).join('\n')}
          onChange={(event) => updateList('dateIdeas', event.target.value)}
          placeholder="One date idea per line"
          rows={4}
        />
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
