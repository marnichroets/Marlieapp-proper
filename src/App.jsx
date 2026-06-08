import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'marlie-bird-app-v1'
const INTRO_STORAGE_KEY = 'marlie-bird-intro-seen-v1'

const navItems = [
  ['home', 'Home', '🏡'],
  ['add', 'Spot Bird', '📷'],
  ['birds', 'My Birds', '🐦'],
  ['magazine', 'Magazine', '📰'],
  ['rewards', 'Surprises', '🎁'],
  ['date', 'Bird Date', '💕'],
  ['profile', 'Profile', '🪶'],
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

const defaultBirdLibrary = [
  {
    id: 'cape-robin-chat',
    commonName: 'Cape Robin-Chat',
    afrikaansName: 'Gewone Janfrederik',
    scientificName: 'Cossypha caffra',
    category: 'Garden bird',
    region: 'Gardens, forests and leafy suburbs across South Africa',
    description: 'A neat little singer with warm orange feathers and main-character energy.',
    funFact: 'It often sings from a hidden perch before anyone gets a proper look.',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  },
  {
    id: 'hadeda-ibis',
    commonName: 'Hadeda Ibis',
    afrikaansName: 'Hadeda',
    scientificName: 'Bostrychia hagedash',
    category: 'Loud legend',
    region: 'Lawns, wetlands, parks and rooftops almost everywhere',
    description: 'Large, glossy and deeply committed to announcing itself to the neighbourhood.',
    funFact: 'Its famous call is often heard before sunrise, because apparently peace was optional.',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  },
  {
    id: 'african-hoopoe',
    commonName: 'African Hoopoe',
    afrikaansName: 'Hoephoep',
    scientificName: 'Upupa africana',
    category: 'Statement bird',
    region: 'Open gardens, savanna, farms and dry woodland',
    description: 'A cinnamon bird with a dramatic crest and excellent fashion instincts.',
    funFact: 'The crest opens like a tiny feather fan when it gets excited or suspicious.',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  },
  {
    id: 'cape-white-eye',
    commonName: 'Cape White-eye',
    afrikaansName: 'Kaapse Glasogie',
    scientificName: 'Zosterops virens',
    category: 'Tiny flock bird',
    region: 'Gardens, fynbos, forests and fruiting trees',
    description: 'A small green-yellow bird with a bright eye-ring and busy little plans.',
    funFact: 'They often move in cheerful groups, inspecting leaves like tiny auditors.',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  },
  {
    id: 'southern-masked-weaver',
    commonName: 'Southern Masked Weaver',
    afrikaansName: 'Swartkeelgeelvink',
    scientificName: 'Ploceus velatus',
    category: 'Nest builder',
    region: 'Reeds, gardens, grassland and waterside trees',
    description: 'A bright yellow builder with serious nest architecture credentials.',
    funFact: 'Males weave elaborate nests and may rebuild if the first draft gets rejected.',
    imageUrl: '',
    soundUrl: '',
    rarity: 'Common',
    featuredInMagazine: true,
  },
]

const defaultMagazineIssue = {
  monthlyChallenge: 'Spot one featured bird from this issue and give it a dramatic nickname.',
  birdDateIdea: 'Take a slow coffee walk and choose one bird to be the official date mascot.',
  marnichMessage:
    'This month’s feather issue is ready. I hope it makes your next bird moment feel a little more magical.',
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

const sponsorLines = [
  'Sponsored by Marnich Bank.',
  'Please allow 1-3 romantic business days for processing.',
  'Marnich Bank has approved this transaction with love.',
  'Your sponsor is currently financially nervous.',
  'Reward claimed. Marnich has been emotionally and financially notified.',
]

const futureFeatures = [
  'AI bird photo identification with top 3 suggestions and user confirmation.',
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

function normalizeBirdName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
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

function monthName(date = new Date()) {
  return new Intl.DateTimeFormat('en-ZA', { month: 'long' }).format(date)
}

function sameMonth(value, date = new Date()) {
  if (!value) return false
  const parsed = new Date(`${value}T12:00:00`)
  return (
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth()
  )
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
    birdLibrary: defaultBirdLibrary,
    magazineIssue: defaultMagazineIssue,
    settings: {
      birdCrush: '',
      alerts: [],
      currentDateMission: dateMissions[0],
      rareBeautyUnlocked: false,
      soundDetectiveUnlocked: false,
      secretCodesVisible: false,
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
      birdLibrary: mergeByKey(base.birdLibrary, saved.birdLibrary, 'id'),
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

  function addBird(form) {
    const speciesKey = normalizeBirdName(form.birdName)
    if (!speciesKey) return
    const isNewSpecies = !data.birds.some((bird) => bird.id === speciesKey)
    const coinsEarned = isNewSpecies ? 25 : 5
    const birdName = form.birdName.trim()
    const nickname =
      form.nickname.trim() || nicknameIdeas[speciesKey] || 'Officially Cute Bird'
    const sighting = {
      id: createId('sighting'),
      speciesKey,
      birdName,
      nickname,
      dateSpotted: form.dateSpotted || todayValue(),
      timeSpotted: form.timeSpotted,
      location: form.location.trim(),
      notes: form.notes.trim(),
      mood: form.mood,
      seenWithMarnich: form.seenWithMarnich,
      favorite: form.favorite,
      photo: form.photo,
      coinsEarned,
      createdAt: new Date().toISOString(),
      personality: personalityComments[speciesKey] || '',
    }
    const sightings = [...data.sightings, sighting]
    const nextState = {
      ...data,
      sightings,
      birds: buildBirdRecords(sightings),
      featherCoins: data.featherCoins + coinsEarned,
      settings: {
        ...data.settings,
        birdCrush: form.makeBirdCrush ? birdName : data.settings.birdCrush,
      },
    }

    commit(nextState, {
      title: isNewSpecies ? 'New species logged!' : 'Repeat sighting logged!',
      body: `${getCouncilMessage(data.sightings.length)} +${coinsEarned} Feather Coins.`,
    })
    setActivePage('birds')
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

  function setBirdCrush(name) {
    setData({
      ...data,
      settings: { ...data.settings, birdCrush: name },
    })
    setToast({
      title: 'Bird crush updated',
      body: `${name} remains undefeated in your heart.`,
      tone: 'calm',
    })
  }

  const visibleNavItems = data.settings.secretCodesVisible
    ? [
        ...navItems.slice(0, -1),
        ['codes', 'Secret', '🔐'],
        navItems[navItems.length - 1],
      ]
    : navItems
  const activeNav = visibleNavItems.find((item) => item[0] === activePage)
  const activeRewardUnlock = rewardUnlockQueue[0] || null

  if (showIntro) {
    return <WelcomeIntro onStart={completeIntro} />
  }

  return (
    <div className="app-shell">
      <Toast toast={toast} />
      <RewardUnlockModal
        reward={activeRewardUnlock}
        onClose={() => setRewardUnlockQueue((current) => current.slice(1))}
      />

      <header className="app-header">
        <div>
          <p className="eyebrow">Marlie's Bird Journey</p>
          <h1>A quiet little bird adventure</h1>
        </div>
        <div className="coin-pill" aria-label="Coin balances">
          <span>{data.featherCoins} Marlie's Feather Coins</span>
          <span>{data.pityCoins} Pity Coins</span>
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

      <main className="page-wrap">
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
          <BirdsPage data={data} setBirdCrush={setBirdCrush} />
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
        {activePage === 'magazine' && <MonthlyMagazinePage data={data} />}
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
            setData={setData}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>{loadingMessages[(stats.totalSightings + stats.uniqueCount) % loadingMessages.length]}</span>
        <span>Built for Marlie, sponsored by Marnich Bank. Made for Marlie by Marnich.</span>
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
  const birdsUntilReward = stats.nextReward
    ? Math.max(stats.nextReward.milestone - stats.uniqueCount, 0)
    : 0

  return (
    <div className="page-grid home-simple-grid">
      <section className="hero-panel mystery-hero">
        <div className="hero-copy">
          <p className="eyebrow">Marlie's Bird Journey</p>
          <h2>Welcome back, Marlie</h2>
          <p>
            The Bird Council has prepared today’s mission. A tiny surprise is waiting
            behind the next bird.
          </p>
          <div className="hero-actions">
            <button className="primary-btn big-action" type="button" onClick={() => goTo('add')}>
              Spot a bird
            </button>
          </div>
        </div>
        <div className="coin-orbit" aria-label="Feather Coin balance">
          <span>{data.featherCoins}</span>
          <small>Feather Coins</small>
        </div>
      </section>

      <section className="soft-card daily-mystery-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today's mystery challenge</p>
            <h3>{dailyChallenge.main?.text || 'Find one suspicious bird moment'}</h3>
          </div>
          <span className={dailyChallenge.mainComplete ? 'status-pill paid' : 'status-pill'}>
            {dailyChallenge.mainComplete ? 'Done' : '+50'}
          </span>
        </div>
        <p>The Bird Council has prepared today’s mission.</p>
        <button
          className="primary-btn wide"
          type="button"
          disabled={dailyChallenge.mainComplete}
          onClick={() => completeDailyChallenge('daily')}
        >
          {dailyChallenge.mainComplete ? 'Council stamped' : 'Complete mission'}
        </button>
      </section>

      <button className="soft-card home-link-card" type="button" onClick={() => goTo('birds')}>
        <span className="eyebrow">My Birds</span>
        <strong>{stats.uniqueCount || 'No'} bird memories</strong>
        <small>{recent ? `Latest: ${recent.birdName}` : 'Your first bird memory is waiting outside.'}</small>
      </button>

      <button className="soft-card home-link-card" type="button" onClick={() => goTo('rewards')}>
        <span className="eyebrow">Next mystery unlock</span>
        <strong>{stats.nextReward ? `${birdsUntilReward} birds away` : 'Legendary territory'}</strong>
        <small>Marnich Bank is hiding the next reward for security reasons.</small>
      </button>

      <section className="soft-card council-card">
        <p className="eyebrow">The Bird Council</p>
        <h3>{getCouncilMessage(stats.totalSightings + data.pityCoins)}</h3>
        <p>The Council is watching respectfully from a nearby branch.</p>
      </section>

      <section className="soft-card teaser-card">
        <p className="eyebrow">Message from Marnich</p>
        <h3>{recent ? `${recent.birdName} has entered the official memory vault.` : 'A locked note is waiting.'}</h3>
        <p>
          {recent
            ? 'Made for Marlie by Marnich, with mild interference from Marnich Bank.'
            : 'Spot a bird to wake up the next tiny surprise.'}
        </p>
      </section>
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
  const [form, setForm] = useState({
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
  })

  const speciesKey = normalizeBirdName(form.birdName)
  const nicknameSuggestion = nicknameIdeas[speciesKey]
  const personality = personalityComments[speciesKey]

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateField('photo', reader.result)
    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.birdName.trim()) return
    addBird(form)
    setForm({
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
    })
  }

  return (
    <div className="page-grid spot-page">
      <section className="soft-card form-page spot-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Spot a Bird</p>
            <h2>Save a new bird memory</h2>
          </div>
          <span className="status-pill">+25 new / +5 repeat</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="photo-input featured-photo-input">
            Bird photo
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
          </label>
          {form.photo ? (
            <div className="photo-preview large-preview">
              <img src={form.photo} alt="Bird preview" />
              <button className="ghost-btn" type="button" onClick={() => updateField('photo', '')}>
                Remove photo
              </button>
            </div>
          ) : (
            <div className="photo-empty-preview">
              <span>{getBirdPhotoPlaceholderLabel(form.birdName)}</span>
              <p>Upload or take a photo to start the memory.</p>
            </div>
          )}

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
            <select value={form.mood} onChange={(event) => updateField('mood', event.target.value)}>
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

        {(nicknameSuggestion || personality) && (
          <div className="hint-panel">
            {nicknameSuggestion && <p>Nickname idea: {nicknameSuggestion}</p>}
            {personality && <p>{personality}</p>}
          </div>
        )}

        <button className="primary-btn submit-btn" type="submit">
          Save to My Birds
        </button>
      </form>
      </section>

      <section className="soft-card ai-placeholder-card full-span" aria-disabled="true">
        <p className="eyebrow">Future magic</p>
        <h3>AI bird identification coming soon</h3>
        <p>Upload a photo and the app will suggest the bird. For now, the Bird Council still requires manual paperwork.</p>
        <span className="status-pill locked">Coming soon</span>
      </section>
    </div>
  )
}

function BirdsPage({ data }) {
  return (
    <section className="soft-card full-span collection-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Marlie's Bird Memories</p>
          <h2>My Birds</h2>
        </div>
        <span className="status-pill">{data.birds.length} species</span>
      </div>

      <div className="bird-gallery">
        {data.birds.length === 0 && <EmptyState text="Your first bird memory is waiting outside." />}
        {data.birds.map((bird) => (
          <article className="bird-card memory-bird-card" key={bird.id}>
            {bird.photo ? (
              <img className="bird-card-photo" src={bird.photo} alt={bird.birdName} />
            ) : (
              <div className="bird-card-photo placeholder-photo">
                <span>{getBirdPhotoPlaceholderLabel(bird.birdName)}</span>
              </div>
            )}
            <div className="bird-card-body">
              <p className="eyebrow">{formatDate(bird.lastSeen)}</p>
              <h3>{bird.birdName}</h3>
              {bird.nickname && <p className="nickname">{bird.nickname}</p>}
              <div className="tag-row">
                {bird.favorite && <span className="tag warm">Favourite</span>}
                {bird.seenWithMarnich && <span className="tag">Seen with Marnich</span>}
                <span className="tag">{bird.count} time{bird.count === 1 ? '' : 's'} seen</span>
              </div>
              <p>{bird.location || 'Secret location'}</p>
              {bird.notes && <p className="notes-preview">{bird.notes}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
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
            <p className="eyebrow">Rewards / Surprises</p>
            <h2>Next mystery reward</h2>
          </div>
          <span className="status-pill">{stats.progressValue}%</span>
        </div>
        <h3>Mystery reward</h3>
        <p>
          {stats.nextReward
            ? `Unlocks in ${birdsUntilReward} bird${birdsUntilReward === 1 ? '' : 's'}.`
            : 'All visible mystery rewards have been unlocked. The Bird Council is whispering about legendary territory.'}
        </p>
        <div className="progress-track">
          <span style={{ width: `${stats.progressValue}%` }}></span>
        </div>
        <p className="quote">Marnich Bank is hiding the next reward for security reasons.</p>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Revealed surprises</p>
            <h2>Unlocked rewards</h2>
          </div>
          <span className="status-pill">{revealedRewards.length}</span>
        </div>
        {revealedRewards.length === 0 ? (
          <EmptyState text="A tiny surprise is waiting behind the next bird." />
        ) : (
          <div className="reward-grid">
            {revealedRewards.map((reward) => (
              <article className="reward-card" key={reward.id}>
                <div>
                  <span className={`status-pill ${reward.status.toLowerCase()}`}>
                    {reward.status}
                  </span>
                  <h3>{reward.name}</h3>
                  <p>{reward.unlockReason}</p>
                  <p className="fine-print">Reference: {reward.reference}</p>
                </div>
                {reward.status === 'Unlocked' && (
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => claimReward(reward.id)}
                  >
                    Claim surprise
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
            <p className="eyebrow">Claimed by Marlie</p>
            <h2>Marnich Bank paperwork</h2>
          </div>
          <span className="status-pill">{claimedRewards.length} claimed</span>
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
                <article className="certificate" key={certificate.id}>
                  <p className="eyebrow">Reward Certificate</p>
                  <h3>{certificate.rewardName}</h3>
                  <p>This certifies that Marlie has achieved: {certificate.unlockReason}</p>
                  <p>Reference: {certificate.reference}</p>
                  <p>Date: {formatDate(certificate.date)}</p>
                  <p>Signed: The Bird Council</p>
                </article>
              ))}
          </div>
        )}
        <p className="quote">{sponsorLines[claimedRewards.length % sponsorLines.length]}</p>
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

function MonthlyMagazinePage({ data }) {
  const featuredBirds = data.birdLibrary
    .filter((bird) => bird.featuredInMagazine)
    .slice(0, 5)
  const seenBirdIds = new Set(data.birds.map((bird) => normalizeBirdName(bird.birdName)))

  return (
    <div className="magazine-page">
      <section className="magazine-cover">
        <p className="eyebrow">Marlie's Bird Monthly</p>
        <h2>{monthName()} Feather Issue</h2>
        <p>This month’s feather issue is ready.</p>
        <span className="status-pill">{featuredBirds.length} featured birds</span>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured South African birds</p>
            <h2>Birds to watch for</h2>
          </div>
          <span className="status-pill">Magazine picks</span>
        </div>
        <div className="magazine-grid">
          {featuredBirds.map((bird) => {
            const seen = seenBirdIds.has(normalizeBirdName(bird.commonName))
            return (
              <article className="magazine-bird-card" key={bird.id}>
                {bird.imageUrl ? (
                  <img src={bird.imageUrl} alt={bird.commonName} />
                ) : (
                  <div className="magazine-photo-placeholder">
                    <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
                  </div>
                )}
                <div>
                  <span className={seen ? 'status-pill paid' : 'status-pill locked'}>
                    {seen ? 'Seen by Marlie' : 'Not spotted yet'}
                  </span>
                  <h3>{bird.commonName}</h3>
                  <p className="nickname">{bird.afrikaansName}</p>
                  <p className="fine-print">{bird.scientificName}</p>
                  <p>{bird.description}</p>
                  <dl className="bird-meta magazine-meta">
                    <div>
                      <dt>Where found</dt>
                      <dd>{bird.region}</dd>
                    </div>
                    <div>
                      <dt>Fun fact</dt>
                      <dd>{bird.funFact}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="soft-card magazine-note">
        <p className="eyebrow">Monthly challenge</p>
        <h3>{data.magazineIssue.monthlyChallenge}</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Bird date idea</p>
        <h3>{data.magazineIssue.birdDateIdea}</h3>
      </section>
      <section className="soft-card magazine-note">
        <p className="eyebrow">Message from Marnich</p>
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
  const unlockedNotes = data.hiddenNotes.filter((note) => note.unlocked)
  const levelTarget = stats.nextLevel?.birds || stats.uniqueCount || 1
  const levelProgressValue = Math.min(100, Math.round((stats.uniqueCount / levelTarget) * 100))

  return (
    <div className="page-grid profile-page">
      <section className="soft-card profile-hero full-span">
        <div>
          <p className="eyebrow">Marlie's progress</p>
          <h2>{stats.currentLevel.title}</h2>
          <p>
            {stats.uniqueCount} bird memories saved. Pity Coins remain in the background,
            where escape incidents belong.
          </p>
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

      <section className="soft-card">
        <p className="eyebrow">Quiet stats</p>
        <div className="report-grid compact-report-grid">
          <ReportItem label="Bird memories" value={stats.totalSightings} />
          <ReportItem label="Unique birds" value={stats.uniqueCount} />
          <ReportItem label="Hidden notes" value={unlockedNotes.length} />
          <ReportItem label="Pity Coins" value={data.pityCoins} />
        </div>
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

function ReportItem({ label, value }) {
  return (
    <div className="report-item">
      <span>{label}</span>
      <strong>{value}</strong>
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
    category: '',
    region: '',
    description: '',
    funFact: '',
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
    const id = normalizeBirdName(libraryDraft.commonName).replaceAll(' ', '-')
    setData((current) => ({
      ...current,
      birdLibrary: [
        ...current.birdLibrary,
        {
          ...libraryDraft,
          id: `library-${id}-${Date.now()}`,
          commonName: libraryDraft.commonName.trim(),
        },
      ],
    }))
    setLibraryDraft({
      commonName: '',
      afrikaansName: '',
      scientificName: '',
      category: '',
      region: '',
      description: '',
      funFact: '',
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
      birdLibrary: current.birdLibrary.map((bird) =>
        bird.id === birdId ? { ...bird, [field]: value } : bird,
      ),
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
            <button className="ghost-btn" type="button" onClick={resetIntroScreen}>
              Reset intro screen
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
        <h3>Monthly magazine copy</h3>
        <form onSubmit={saveMagazineIssue} className="form-grid">
          <textarea
            value={magazineDraft.monthlyChallenge}
            onChange={(event) =>
              setMagazineDraft({ ...magazineDraft, monthlyChallenge: event.target.value })
            }
            placeholder="Monthly challenge"
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
            <h2>Magazine bird entries</h2>
          </div>
          <span className="status-pill">{data.birdLibrary.length} entries</span>
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
          <input
            value={libraryDraft.category}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, category: event.target.value })
            }
            placeholder="Category"
          />
          <input
            value={libraryDraft.region}
            onChange={(event) =>
              setLibraryDraft({ ...libraryDraft, region: event.target.value })
            }
            placeholder="Region"
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
          <label className="check-card">
            <input
              type="checkbox"
              checked={libraryDraft.featuredInMagazine}
              onChange={(event) =>
                setLibraryDraft({ ...libraryDraft, featuredInMagazine: event.target.checked })
              }
            />
            Feature in monthly magazine
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
              <input
                value={bird.category}
                onChange={(event) => updateLibraryBird(bird.id, 'category', event.target.value)}
                placeholder="Category"
              />
              <input
                value={bird.region}
                onChange={(event) => updateLibraryBird(bird.id, 'region', event.target.value)}
                placeholder="Region"
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
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={Boolean(bird.featuredInMagazine)}
                  onChange={(event) =>
                    updateLibraryBird(bird.id, 'featuredInMagazine', event.target.checked)
                  }
                />
                Featured this month
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
