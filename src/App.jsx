import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './features.css'
import { defaultBirdLibrary } from './data/saBirdLibrary'
import { dedupePhotosForStorage, rehydratePhotos } from './photoPool'
import { normalizeBirdName, canonicalSpeciesKey } from './speciesMatch'
import { mergeBirdLibrary, slimBirdLibrary } from './birdLibraryStorage'
import { shouldAdoptRemote } from './syncReconcile'
import { getSeasonInfo } from './seasons'
import { saDateKey, saDateKeyOffset } from './saDate'
import { WeeklyBird, SeasonalAmbient } from './birds'
import { getWeeklyBird } from './birdData'
import {
  EXPLORE_FILTERS,
  MONTHS,
  monthlyActivity,
  birdsNearPotchThisWeek,
  locationThought,
} from './birdExplore'
import { TweetyHomeCard, TweetyStatsPage, AviaryCard, CompanionGalleryPage } from './Tweety'
import { GardenPage } from './Garden'
import { defaultGarden, gardenItem, canWater } from './gardenData'
import {
  defaultTweety,
  tweetyToday,
  tweetyStreak,
  tweetyMood,
  tweetyLevel,
  tweetyTodayKey,
  playChirp,
  babyStage,
  AVIARY_MAX,
  DEFAULT_COMPANION,
  roomSound,
  tweetyCareState,
  currentCareWindow,
  CARE_WINDOWS,
} from './tweetyData'
import IntroSequence from './IntroSequence'
import { BirdStore } from './BirdStore'
import { defaultStore, rainbowActive, tweetyNeverSad, isOwned } from './store'
import { TweetyWorldCard, SanctuaryPage, BirdRoomPage } from './TweetyWorldUI'
import { WardrobePage } from './MarketUI'
import { defaultWardrobe, ownsWearable, wearableById, rotationIndex } from './market'
import {
  dayKeyW,
  WORLD_EVENTS,
  eventById,
  ownsFurniture,
  ROOM_FURNITURE,
} from './tweetyWorld'
import { GamesHub } from './games'
import { defaultGames } from './gamesData'
import { InboxPage } from './Inbox'
import { BirdMapPage } from './BirdMap'
import {
  councilDispatchForDay,
  marnichMessage,
  milestoneSystemMessage,
  tweetyGrowthSystemMessage,
  crownedAdultKeepsakeMessage,
} from './messages'
import { tweetyGrowthIndex, tweetyGrowth, tweetyGrowthProgress } from './tweetyData'

function bumpLeaderboard(lb, winner) {
  return {
    pooksWins: lb.pooksWins + (winner === 'pooks' ? 1 : 0),
    marnichWins: lb.marnichWins + (winner === 'marnich' ? 1 : 0),
    draws: lb.draws + (winner === 'draw' ? 1 : 0),
  }
}

const STORAGE_KEY = 'marlie-bird-app-v1'
// Marnich's separate test-player account keeps its own fully independent save,
// so nothing he does can ever read or write Pooks' data.
const MARNICH_STORAGE_KEY = 'marlie-bird-app-marnich-v1'

function storageKeyForAccount(account) {
  return account === 'marnich' ? MARNICH_STORAGE_KEY : STORAGE_KEY
}

// Marnich's login has two modes:
//   • 'view'    — a READ-ONLY mirror of Pooks' real account (default), so he can
//                 monitor how she's doing without ever changing her data.
//   • 'sandbox' — his own separate test data for trying features (fast-forward
//                 lives here only).
const MARNICH_MODE_KEY = 'marlie-marnich-mode'

function readMarnichMode() {
  try {
    return localStorage.getItem(MARNICH_MODE_KEY) === 'sandbox' ? 'sandbox' : 'view'
  } catch {
    return 'view'
  }
}

function writeMarnichMode(mode) {
  try {
    localStorage.setItem(MARNICH_MODE_KEY, mode === 'sandbox' ? 'sandbox' : 'view')
  } catch {
    /* ignore */
  }
}

// Which save the active session is reading/writing. Marnich in sandbox mode →
// his own test save; everyone else (Pooks, admin, and Marnich's view mirror) →
// Pooks' real save.
function dataAccountFor(session, marnichMode) {
  if (session?.role === 'marnich' && marnichMode === 'sandbox') return 'marnich'
  return 'pooks'
}

// True when the screen is Marnich's read-only mirror of Pooks' account — no
// action may write to or modify her data.
function isReadOnlyView(session, marnichMode) {
  return session?.role === 'marnich' && marnichMode !== 'sandbox'
}

// The active account is derived purely from the logged-in session: Marnich's
// own player login → his account; Pooks and the admin panel → Pooks' account.
function accountForSession(session) {
  return session?.role === 'marnich' ? 'marnich' : 'pooks'
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

// Marnich's player login. The password lives only in his own account save, so
// it never appears in Pooks' data; before his first login it falls back to the
// default below.
const MARNICH_LOGIN_NAME = 'marnich'
const MARNICH_DEFAULT_SECRET = 'tweety'

function marnichLoginSecret() {
  try {
    const raw = localStorage.getItem(MARNICH_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const secret = saved?.settings?.marnichSecret
      if (secret) return String(secret)
    }
  } catch {
    /* ignore — fall back to the default */
  }
  return MARNICH_DEFAULT_SECRET
}

// Fall back to the known Railway backend if the build env var is missing, so
// real AI identification still works even when VITE_BIRD_API_URL wasn't set.
const DEFAULT_BIRD_API_URL = 'https://marlieapp-proper-production.up.railway.app'
const BIRD_API_URL = String(import.meta.env.VITE_BIRD_API_URL || DEFAULT_BIRD_API_URL).replace(
  /\/+$/,
  '',
)

// ---- Bird Battles backend (shared sessions + all-time leaderboard) ----------
// Scores live on the server, keyed by the 4-digit code, so Pooks and Marnich can
// play head-to-head from two different devices.
const GAMES_API = `${BIRD_API_URL}/api/games`

async function postGameResult({ code, game, player, score, timeMs }) {
  const response = await fetch(`${GAMES_API}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, game, player, score, timeMs }),
  })
  if (!response.ok) throw new Error(`submit ${response.status}`)
  return response.json()
}

async function fetchGameState(game, code) {
  const response = await fetch(
    `${GAMES_API}/state?code=${encodeURIComponent(code)}&game=${encodeURIComponent(game)}`,
  )
  if (!response.ok) throw new Error(`state ${response.status}`)
  return response.json()
}

async function fetchGameLeaderboard() {
  const response = await fetch(`${GAMES_API}/leaderboard`)
  if (!response.ok) throw new Error(`leaderboard ${response.status}`)
  return response.json()
}

// ---- Cross-device account sync ----------------------------------------------
// The backend is the source of truth for each account's full state, keyed by
// account name ('pooks' | 'marnich'). localStorage is only an offline cache.
// Both helpers are offline-safe: they return null on any failure so the app
// silently falls back to the local cache rather than breaking.
const STATE_API = `${BIRD_API_URL}/api/state`

// Ids the bundled catalog already ships, so we can drop unseen copies of them
// from saved state and rebuild them from the bundle on load.
const DEFAULT_LIBRARY_IDS = new Set(defaultBirdLibrary.map((bird) => bird.id))

// Prepare state for any persistence boundary (localStorage or backend): slim the
// bird library to just the user's own birds, then pool duplicated photos. Both
// steps are lossless on load (mergeBirdLibrary rebuilds the catalog; rehydrate
// restores photos), so the in-memory state shape is never affected.
function prepareStateForStorage(state) {
  if (!state || typeof state !== 'object') return state
  const slim = Array.isArray(state.birdLibrary)
    ? { ...state, birdLibrary: slimBirdLibrary(state.birdLibrary, DEFAULT_LIBRARY_IDS) }
    : state
  return dedupePhotosForStorage(slim)
}

async function fetchRemoteState(account) {
  try {
    // no-store: the live mirror and login must always see the latest state, never
    // a stale cached GET response.
    const response = await fetch(`${STATE_API}?account=${encodeURIComponent(account)}`, {
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = await response.json()
    // { state: <obj>|null, version }. A null state means "no save yet".
    if (!data || typeof data !== 'object') return null
    // Expand any pooled photos back to inline base64 so callers see the normal
    // state shape (older un-pooled saves pass through untouched).
    return { state: data.state ? rehydratePhotos(data.state) : null, version: Number(data.version) || 0 }
  } catch {
    return null
  }
}

async function saveRemoteState(account, state, version = 0, { keepalive = false } = {}) {
  try {
    const response = await fetch(STATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, state: prepareStateForStorage(state), version }),
      keepalive,
    })
    if (!response.ok) return null
    const data = await response.json()
    return { version: Number(data.version) || version }
  } catch {
    return null
  }
}

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

// One-time cinematic intro flag. Set once Pooks taps "Accept my mission" so the
// evidence-dossier intro never plays again. We persist to BOTH localStorage and
// a cookie: when localStorage is full of sighting photos a tiny setItem throws
// QuotaExceededError and the flag would be lost — the cookie is immune to that,
// so the intro reliably shows only once, ever.
const INTRO_SEEN_KEY = 'pooks_intro_seen'
const MARNICH_INTRO_SEEN_KEY = 'marnich_intro_seen'

// Each account (Pooks and Marnich's test account) has its own intro-seen flag so
// Marnich sees the exact same first-time intro Pooks saw, independently of her.
function introSeenKey(account = 'pooks') {
  return account === 'marnich' ? MARNICH_INTRO_SEEN_KEY : INTRO_SEEN_KEY
}

function readIntroSeen(account = 'pooks') {
  const key = introSeenKey(account)
  try {
    if (localStorage.getItem(key) === 'yes') return true
  } catch {
    /* localStorage may be unavailable */
  }
  try {
    if (document.cookie.split('; ').some((c) => c === `${key}=yes`)) return true
  } catch {
    /* cookies may be unavailable */
  }
  return false
}

function markIntroSeen(account = 'pooks') {
  const key = introSeenKey(account)
  try {
    localStorage.setItem(key, 'yes')
  } catch {
    /* storage full — the cookie below still records it */
  }
  try {
    document.cookie = `${key}=yes; max-age=${60 * 60 * 24 * 3650}; path=/; samesite=lax`
  } catch {
    /* ignore */
  }
}

function clearIntroSeen(account = 'pooks') {
  const key = introSeenKey(account)
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${key}=; max-age=0; path=/`
  } catch {
    /* ignore */
  }
}

// One-time hard reset on a new app version. When the stored version doesn't
// match, we wipe EVERYTHING (all saved data, coins, test sightings, the intro
// flag) so Pooks starts completely fresh on this deploy. Her login is the
// default "Pooks / feather", which buildDefaultState restores anyway, so a
// clean slate keeps her credentials working. Runs once at module load, before
// loadState reads anything.
const APP_VERSION = '2.0'
const APP_VERSION_KEY = 'pooks_app_version'

function ensureAppVersion() {
  try {
    if (localStorage.getItem(APP_VERSION_KEY) === APP_VERSION) return
    localStorage.clear()
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION)
  } catch {
    /* storage unavailable — nothing to reset */
  }
  // The intro-seen flag also lives in a cookie (survives localStorage.clear),
  // so clear it too — a fresh start should replay the welcome intro.
  clearIntroSeen('pooks')
  clearIntroSeen('marnich')
}

ensureAppVersion()

// One-time silent welcome bonus: the very first time the app loads (after the
// v2.0 reset cleared this flag), Pooks starts with 500 Feather Coins already in
// her balance — no popup, no fanfare. The flag is persisted independently of
// her save data so the bonus is never granted twice.
const WELCOME_COINS = 500
const WELCOME_COINS_KEY = 'pooks_welcome_coins_given'
// One-time "Claim your Milkshake Date 🥤" shop item. Once she buys it, this flag
// is set and the item never appears in the shop again.
const MILKSHAKE_CLAIMED_KEY = 'pooks_milkshake_claimed'

// Per-account flag keys, so Marnich's test account has its own welcome coins and
// its own milkshake-claim state without ever touching Pooks'.
function accountFlagKey(baseKey, account = 'pooks') {
  return account === 'marnich' ? `${baseKey}__marnich` : baseKey
}

function applyWelcomeCoins(state, account = 'pooks') {
  const key = accountFlagKey(WELCOME_COINS_KEY, account)
  try {
    if (localStorage.getItem(key) === 'true') return state
    localStorage.setItem(key, 'true')
    return { ...state, featherCoins: (state.featherCoins || 0) + WELCOME_COINS }
  } catch {
    return state
  }
}

function milkshakeClaimed(account = 'pooks') {
  try {
    return localStorage.getItem(accountFlagKey(MILKSHAKE_CLAIMED_KEY, account)) === 'true'
  } catch {
    return false
  }
}

// Coin earning rules (rebalanced for a sustainable ~1-2 weeks-per-item pace).
const COINS = {
  spot: 30, // spotting any bird
  firstSpecies: 10, // +10 bonus the first time a species is seen (40 total)
  withMarnich: 0, // spotting "with Marnich" is sentimental, not extra coins
  dailyChallenge: 20, // daily challenge completion
  streakBonus: 15, // occasional daily-challenge streak bonus (every 3 days)
  tweetyCare: 5, // per completed Tweety care window (3 windows = 15/day)
  tweetyStreak: 50, // 7-day Tweety care streak bonus
}

// One-time reward when Tweety reaches the final "crowned adult" growth stage.
const CROWN_ADULT_REWARD = 1500

// ---- Random wildlife encounters --------------------------------------------
// Occasionally when the app opens or she visits Tweety's nest, a little critter
// wanders by. One tap always keeps Tweety safe (never scary, never a loss) and
// earns a small +5 coin "thank you" — Tweety feels like a real little life that
// needs looking after now and then.
const ENCOUNTER_REWARD = 5
const ENCOUNTER_CHANCE = 0.1 // ~1 in 10 app opens / nest visits
const ENCOUNTERS = [
  {
    id: 'lizard',
    emoji: '🦎',
    title: "A lizard is creeping toward Tweety's nest!",
    action: 'Shoo it away 👋',
    done: 'You gently shooed the lizard away. Tweety is safe! 💛',
  },
  {
    id: 'snake',
    emoji: '🐍',
    title: 'Oh no, something slithered nearby!',
    action: 'Chase it off 👟',
    done: 'You chased it off. Tweety gives you a grateful chirp! 💛',
  },
  {
    id: 'cat',
    emoji: '🐱',
    title: 'A neighbourhood cat is watching from the fence…',
    action: 'Scare it away 🙌',
    done: 'The cat slinks off. Tweety is safe and sound! 💛',
  },
  {
    id: 'hawk',
    emoji: '🦅',
    title: 'A hawk circles overhead…',
    action: 'Protect Tweety 🛡️',
    done: 'You shielded the nest. The hawk flies on. Tweety is safe! 💛',
  },
]

function rollEncounter() {
  if (Math.random() >= ENCOUNTER_CHANCE) return null
  return ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)]
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
  // Matches the 500 welcome coins so her first treat can be the milkshake date.
  milkshakeDate: 500,
}

// Bottom tab bar (7) + everything else tucked behind the settings menu.
// Inbox (📬) stays a prominent top-level tab with an unread badge; Magazine
// (📖) lives on the bar too, right before Gifts.
const bottomTabs = [
  ['home', 'Home', '🏡'],
  ['add', 'Spot', '📷'],
  ['explore', 'Explore', '🔍'],
  ['library', 'Collection', '🦜'],
  ['messages', 'Inbox', '📬'],
  ['magazine', 'Magazine', '📖'],
  ['rewards', 'Gifts', '🎁'],
]

const menuItems = [
  ['birdmap', 'My Bird Map', '🗺️'],
  ['date', 'Date', '💕'],
  ['games', 'Date Games', '🎮'],
  ['birdroom', 'Bird Room', '🏡'],
  ['sanctuary', 'Sanctuary', '🌿'],
  ['wardrobe', 'Dress Tweety', '👗'],
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

// A pool of funny Bird Council loading lines. One is picked at random each time
// she identifies a bird, and they rotate randomly while she waits — never the
// same one twice in a row.
const loadingMessages = [
  'The Council is examining the evidence... 🔍',
  'Consulting the official field guides... 📖',
  'Agent Hadeda is squinting at your photo... 👀',
  'Cross-referencing with the feather database... 🪶',
  'The owl division has been called in for a second opinion... 🦉',
  'Measuring beak proportions very seriously... 📏',
  'The Council is in a brief huddle... 🐦',
  'Checking if this is the chicken again... 🐔',
  'Running it past the vulture division... 👁️',
  'Someone spilled rooibos on the file, please wait... ☕',
  'The flamingo department wants to see too... 🦩',
  'Comparing wing patterns under candlelight... 🕯️',
  'Agent Marnich is trying to help, please be patient... 🏌️',
  'The Secretary Bird is double-checking everything... 📋',
  'Almost there, the Council is very thorough... 🪶',
]

// Pick a random message index, never repeating the one currently shown.
function nextLoadingIndex(current) {
  if (loadingMessages.length <= 1) return 0
  let next = current
  while (next === current) {
    next = Math.floor(Math.random() * loadingMessages.length)
  }
  return next
}

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

// --- Cape Town Special Week daily challenges (Sat 20 Jun → Mon 29 Jun 2026) --
// Keyed by the SA-local (UTC+2) YYYY-MM-DD that todayValue() produces. On these days
// the special challenge REPLACES the normal daily challenge and awards 40 coins
// (bonus rate, up from the usual 20). As always, ANY sighting completes it — the
// suggested bird is only a hint, never a gate, so she is never blocked. After
// 29 Jun nothing here matches and the normal rotation resumes automatically.
const SPECIAL_DAILY_CHALLENGES = {
  '2026-06-20': 'Welcome to the Cape! Spot any bird at all in your new surroundings.',
  '2026-06-21': 'Find an African Penguin at Boulders Beach.',
  // Mon 22 Jun — interview day. Lighter/optional so she is never pressured.
  '2026-06-22':
    'No pressure today, Agent — today is about your interview, not the birds. If you happen to spot one on the way, wonderful. If not, the Council understands completely. Good luck today. 💛',
  '2026-06-23':
    'Try to find a Cape Rockjumper — notoriously elusive, but a valiant effort still counts.',
  '2026-06-24': 'Photograph any sunbird near Kirstenbosch Gardens or wherever you find yourself.',
  '2026-06-25': 'Spot a gull or tern along the coast — any coastal species counts today.',
  '2026-06-26':
    'Find a Cape Bulbul — common, charming, and exactly the kind of bird the Council enjoys.',
  '2026-06-27': 'Last full day in the Cape — spot ANY bird you have not yet logged this trip.',
  '2026-06-28':
    'You’re in Johannesburg tonight — rest day. The Council grants official leave from challenges.',
  '2026-06-29': 'Welcome home to Potchefstroom! Spot a familiar local bird.',
}

// Coins awarded for a Cape Town special daily challenge (bonus rate).
const CAPE_WEEK_CHALLENGE_COINS = 40

// The special Cape Town challenge for a given local day key, or null on a normal
// day. Returns a challenge-shaped object with a stable per-date id (so the
// completion stamp reverts cleanly once the week passes) and a `cape` flag the
// completion handler uses to award the 40-coin bonus rate.
function getSpecialDailyChallenge(date = todayValue()) {
  const text = SPECIAL_DAILY_CHALLENGES[date]
  return text ? { id: `cape-${date}`, text, cape: true } : null
}

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

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Fire-and-forget warm email to Marnich via the Railway backend. Never blocks
// or breaks the UI — failures are swallowed (e.g. offline or email unconfigured).
function notifyMarnich(event, details = {}) {
  if (!BIRD_API_URL) return
  // Don't fire "Pooks did X" notifications while Marnich is testing on his own
  // separate account — those events aren't Pooks.
  if (accountForSession(readStoredSession()) === 'marnich') return
  try {
    fetch(`${BIRD_API_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...details }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — notifications are best-effort
  }
}

// Phone photos are multi-megabyte. Stored raw as base64 they blow the ~5MB
// localStorage quota, setItem throws, and the sighting silently fails to
// persist. Downscale to a small JPEG (a few hundred KB at most) before storing
// so every sighting saves reliably. Falls back to the raw file on any failure.
// Photos are stored as base64 in the synced state, so keep them small: a 900px
// longest edge at 0.6 JPEG quality stays clear for a phone screen while roughly
// halving the byte size versus the old 1100px/0.72 defaults.
function fileToStorablePhoto(file, maxDim = 900, quality = 0.6) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('no file'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let { width, height } = img
        const longest = Math.max(width, height)
        if (longest > maxDim) {
          const scale = maxDim / longest
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image decode failed'))
    }
    img.src = url
  })
}

// Read a file into a small storable photo, gracefully falling back to the raw
// data URL if canvas downscaling is unavailable.
function readStorablePhoto(file, onReady, opts = {}) {
  fileToStorablePhoto(file, opts.maxDim, opts.quality)
    .then(onReady)
    .catch(() => {
      const reader = new FileReader()
      reader.onload = () => onReady(reader.result)
      reader.readAsDataURL(file)
    })
}

// The app's canonical "today" — South African local date (UTC+2). All daily
// keys (challenges, completions, streaks, discovery dates) flow through this so
// they roll over together at SA midnight, matching the special messages/theme.
function todayValue() {
  return saDateKey()
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

function getAbsoluteWeekIndex(date = new Date()) {
  const start = Date.UTC(2024, 0, 1)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current - start) / 604800000)
}

// The magazine now rotates every 3 days instead of weekly. Each issue stays
// live for 3 calendar days, then the next set of birds takes over.
const MAGAZINE_PERIOD_DAYS = 3

function getAbsoluteIssueIndex(date = new Date()) {
  const start = Date.UTC(2024, 0, 1)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current - start) / 86400000 / MAGAZINE_PERIOD_DAYS)
}

// Time until the current 3-day issue rotates to the next one.
function getNextIssueCountdown(date = new Date()) {
  const start = Date.UTC(2024, 0, 1)
  const idx = getAbsoluteIssueIndex(date)
  const nextStartMs = start + (idx + 1) * MAGAZINE_PERIOD_DAYS * 86400000
  const diff = Math.max(0, nextStartMs - date.getTime())
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return {
    days,
    hours,
    ms: diff,
    text: `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'}`,
  }
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
  const issueIndex = getAbsoluteIssueIndex(date)
  const startIndex = library.length ? (issueIndex * 5) % library.length : 0
  const pinnedBird =
    library.find((bird) => bird.id === settings.pinnedBirdOfWeekId) || null
  const rotatingBirds = selectRotatingBirds(library, pinnedBird ? 4 : 5, startIndex, pinnedBird?.id)
  const featuredBirds = pinnedBird ? [pinnedBird, ...rotatingBirds] : rotatingBirds

  return {
    year: date.getFullYear(),
    issueIndex,
    // The quiz + its claim status key off `week`, so pointing it at the 3-day
    // issue index makes both reset with every new issue.
    week: issueIndex,
    countdown: getNextIssueCountdown(date),
    featuredBirds,
    birdOfWeek: pinnedBird || featuredBirds[0] || null,
  }
}

// ---- Weekly Bird Quiz (magazine) ----
// 5 data-accurate multiple-choice questions about this week's featured birds.
// Seeded by the week number so questions are stable to retake but change with
// each new issue.
function weeklyQuizSeed(week) {
  let h = 2166136261
  const s = `weekly-quiz-${week}`
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffleLocal(items, seed) {
  const arr = [...items]
  let s = seed || 1
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildWeeklyQuiz(issue, library) {
  const hasAfr = (b) => b && b.commonName && b.afrikaansName
  const pool = (library || []).filter(hasAfr)
  const featured = (issue.featuredBirds || []).filter(hasAfr)
  const seed = weeklyQuizSeed(issue.week)
  // Top up to 5 subjects from the wider library if needed.
  const extra = seededShuffleLocal(
    pool.filter((b) => !featured.some((f) => f.id === b.id)),
    seed,
  )
  const subjects = [...featured, ...extra].slice(0, 5)
  return subjects.map((bird, qi) => {
    const askAfrikaans = qi % 2 === 0
    const correct = askAfrikaans ? bird.afrikaansName : bird.commonName
    const decoyPool = pool
      .filter((b) => b.id !== bird.id)
      .map((b) => (askAfrikaans ? b.afrikaansName : b.commonName))
      .filter((v, i, arr) => v && v !== correct && arr.indexOf(v) === i)
    const decoys = seededShuffleLocal(decoyPool, seed + qi * 7919).slice(0, 3)
    const options = seededShuffleLocal([correct, ...decoys], seed + qi * 104729)
    return {
      q: askAfrikaans
        ? `What is the Afrikaans name for the ${bird.commonName}?`
        : `Which bird is known in Afrikaans as “${bird.afrikaansName}”?`,
      options,
      answer: options.indexOf(correct),
    }
  })
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

// SA-local (UTC+2) date key for N days ago, so daily-challenge streak reads line
// up with the SA-keyed completions written by todayValue().
function dateKeyOffset(days) {
  return saDateKeyOffset(days)
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
    garden: defaultGarden(),
    weeklyQuizClaimedWeek: null,
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
      // Password for Marnich's own separate test-player login (only meaningful in
      // his own account save).
      marnichSecret: MARNICH_DEFAULT_SECRET,
    },
    mysteryGifts: defaultMysteryGifts,
    dateIdeas: defaultDateIdeas,
    dateMemories: [],
    rewardCertificates: [],
    // Inbox: messages from the Council, Marnich and the system.
    messages: [],
    messagesMeta: { lastCouncilDay: '', shownCouncil: [] },
    // Last Tweety growth stage we have already celebrated (index into stages).
    tweetyGrowthSeen: 0,
    // Whether the one-time cinematic intro has been watched. Lives in the synced
    // state (not just a per-device flag) so a new device knows she is not new.
    introSeen: false,
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
// Migrate any existing Tweety onto the simplified, egg-free model. Eggs,
// incubation, mystery eggs and babies are gone: Tweety is simply her companion
// from the start and grows through the five stages via daily care. We preserve
// whatever stage she has already reached (her bornAt) and never reset her.
function normalizeTweety(tweety) {
  const next = { ...tweety }
  // She is always her companion now. If a save predates a hatch (only an egg was
  // chosen), adopt the companion that egg was hiding so her look is preserved.
  if (!next.companion) {
    next.companion = next.firstEgg?.companion || DEFAULT_COMPANION
  }
  // Backfill bornAt (drives real-day growth) so she keeps her current stage
  // instead of snapping back to a chick.
  if (!next.bornAt) {
    const careKeys = Object.keys(next.care || {}).sort()
    next.bornAt = careKeys[0]
      ? new Date(`${careKeys[0]}T00:00:00`).toISOString()
      : new Date().toISOString()
  }
  // Clear every removed egg/baby mechanic so none of that UI can ever surface.
  next.firstEgg = null
  next.egg = null
  next.eggs = []
  next.incubating = null
  next.baby = null
  return next
}

// loadState wraps the raw loader so the one-time welcome coins are applied to
// whatever state we end up with (fresh default or restored save).
function loadState(account = 'pooks') {
  return applyWelcomeCoins(loadStateRaw(account), account)
}

function loadStateRaw(account = 'pooks') {
  const key = storageKeyForAccount(account)
  const base = buildDefaultState()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return base
    return normalizeLoadedState(rehydratePhotos(JSON.parse(raw)))
  } catch (error) {
    console.warn('Could not load Marlie Bird App data', error)
    // Never silently destroy a save we couldn't parse — keep a backup copy so
    // it can be recovered instead of being overwritten by the empty default.
    try {
      const raw = localStorage.getItem(key)
      if (raw) localStorage.setItem(`${key}-backup`, raw)
    } catch {
      // ignore
    }
    return base
  }
}

// Merge a saved state object — which may be partial, and may come from
// localStorage OR the cross-device backend — onto the current defaults and
// recalculate derived fields. Missing keys are filled from buildDefaultState(),
// so the result is always a complete, render-safe state. Every adopt path (local
// cache reads AND remote pulls) goes through this, so a partial save (e.g. an
// older device's smaller blob) can never break the screen.
function normalizeLoadedState(saved) {
  const base = buildDefaultState()
  if (!saved || typeof saved !== 'object') return base
  return recalculateState({
    ...base,
    ...saved,
      // One-time migration: clear whatever Tweety happened to be wearing (e.g.
      // a stray witch hat) so she starts as a plain golden chick. Pooks can
      // dress her again from the wardrobe and that choice will stick.
      tweetyWornResetV1: true,
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
      messages: Array.isArray(saved.messages) ? saved.messages : base.messages,
      messagesMeta: { ...base.messagesMeta, ...(saved.messagesMeta || {}) },
      tweetyGrowthSeen:
        typeof saved.tweetyGrowthSeen === 'number'
          ? saved.tweetyGrowthSeen
          : base.tweetyGrowthSeen,
      dailyChallengeCompletions:
        saved.dailyChallengeCompletions &&
        typeof saved.dailyChallengeCompletions === 'object'
          ? saved.dailyChallengeCompletions
          : base.dailyChallengeCompletions,
      fieldGuideNotes:
        saved.fieldGuideNotes && typeof saved.fieldGuideNotes === 'object'
          ? saved.fieldGuideNotes
          : base.fieldGuideNotes,
      tweety: normalizeTweety({
        ...base.tweety,
        ...(saved.tweety || {}),
        wardrobe: {
          ...base.tweety.wardrobe,
          ...(saved.tweety?.wardrobe || {}),
          // Until the reset has run once, force everything off; afterwards
          // honour whatever Pooks has chosen to wear.
          worn:
            saved.tweetyWornResetV1 === true
              ? { ...base.tweety.wardrobe.worn, ...(saved.tweety?.wardrobe?.worn || {}) }
              : { hat: null, accessory: null, outfit: null },
        },
        careAt: { ...base.tweety.careAt, ...(saved.tweety?.careAt || {}) },
      }),
      store: { ...base.store, ...(saved.store || {}) },
      games: { ...base.games, ...(saved.games || {}) },
      garden: { ...base.garden, ...(saved.garden || {}) },
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
}

// Load the right save for a session + Marnich mode WITHOUT any side effects when
// it's the read-only "View Pooks" mirror. loadState() runs applyWelcomeCoins(),
// which writes a localStorage flag and grants 500 coins — fine when Pooks (or
// Marnich's own sandbox) is the real owner, but in the read-only mirror it would
// silently consume Pooks' one-time welcome bonus. So the mirror always uses the
// pure loadStateRaw() reader and never mutates her data.
function loadStateForSession(session, marnichMode) {
  const account = dataAccountFor(session, marnichMode)
  return isReadOnlyView(session, marnichMode) ? loadStateRaw(account) : loadState(account)
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

  // A "discovery" celebrates an OFF-BOOK bird — one the bundled catalog has never
  // recorded. Once a species is added to the catalog (e.g. the Mandarin & Wood
  // Ducks), it is no longer off-book, so any lingering discovery for it is stale
  // and must go. This is the durable fix for the duck discoveries that kept
  // reappearing: a device sitting on an old snapshot could re-upload a removed
  // discovery (last-write-wins), but because this prune runs on EVERY load /
  // adopt / remote-pull path (via normalizeLoadedState → recalculateState), the
  // resurrection is pruned again on the very next normalize and can never stick.
  const discoveries = (state.discoveries || []).filter(
    (d) =>
      getBirdLibraryMatchIndex(defaultBirdLibrary, {
        commonName: d.birdName || d.speciesKey,
        scientificName: d.scientificName,
      }) < 0,
  )

  return {
    ...state,
    rewards,
    badges: [...badgeIds],
    hiddenNotes,
    rewardCertificates: certificates,
    discoveries,
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
        // Carry the scientific name so canonicalSpeciesKey() can match this
        // species on later scans even if the AI varies the common name. Existing
        // saves backfill it from each sighting's aiMatch on the next recalc.
        scientificName: sighting.scientificName || sighting.aiMatch?.scientificName || '',
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
      scientificName:
        existing.scientificName || sighting.scientificName || sighting.aiMatch?.scientificName || '',
      featherCoinsEarned: existing.featherCoinsEarned + sighting.coinsEarned,
      aiMatch: sighting.aiMatch || existing.aiMatch || null,
    })
  })

  return [...records.values()].sort((a, b) => a.birdName.localeCompare(b.birdName))
}

// Identify a bird photo via the backend; returns the top match or null. Used by
// the daily-challenge flow to add a photographed bird to the collection.
async function identifyTopMatch(photoFile) {
  if (!photoFile || !BIRD_API_URL) return null
  try {
    const body = new FormData()
    body.append('file', photoFile)
    const response = await fetch(`${BIRD_API_URL}/api/identify-bird`, { method: 'POST', body })
    if (!response.ok) return null
    const payload = await response.json()
    const result = normalizeAiIdentificationResponse(payload)
    const top = result?.topMatches?.[0]
    if (!top || result.uncertain || !String(top.commonName || '').trim()) return null
    return top
  } catch (error) {
    console.warn('Challenge bird identification skipped', error)
    return null
  }
}

// Pure: append a bird (from an AI match) to a state, rebuilding derived data.
// Kept separate from addBird so the challenge flow can combine it with the
// challenge-completion update in a single commit (no clobbering).
function addBirdToState(state, match, photo) {
  const birdName = String(match.commonName || '').trim()
  const aiMatch = normalizeAiMatch(match)
  const speciesKey = canonicalSpeciesKey(state, birdName, aiMatch?.scientificName)
  if (!speciesKey) return state
  const isNewSpecies = !state.birds.some((bird) => bird.id === speciesKey)
  const sighting = {
    id: createId('sighting'),
    speciesKey,
    birdName,
    scientificName: aiMatch?.scientificName || '',
    nickname: nicknameIdeas[speciesKey] || 'Officially Cute Bird',
    dateSpotted: todayValue(),
    timeSpotted: '',
    location: '',
    notes: 'Spotted for a daily challenge 🐦',
    mood: 'Curious',
    seenWithMarnich: false,
    favorite: false,
    photo: photo || '',
    coinsEarned: COINS.spot + (isNewSpecies ? COINS.firstSpecies : 0),
    createdAt: new Date().toISOString(),
    source: 'ai',
    aiMatch,
  }
  const sightings = [...state.sightings, sighting]
  return {
    ...state,
    sightings,
    birds: buildBirdRecords(sightings),
    birdLibrary: upsertBirdLibraryFromSighting(state.birdLibrary, sighting),
    featherCoins: state.featherCoins + sighting.coinsEarned,
  }
}

function App() {
  const [activePage, setActivePage] = useState('home')
  const [session, setSession] = useState(readStoredSession)
  // Marnich's view ('view' mirror of Pooks | 'sandbox' test data). Irrelevant
  // for Pooks/admin sessions.
  const [marnichMode, setMarnichMode] = useState(readMarnichMode)
  // Which save is active + whether the screen is a read-only mirror of Pooks.
  const account = dataAccountFor(session, marnichMode)
  const readOnly = isReadOnlyView(session, marnichMode)
  // The coin-shop gifts/rewards are hidden for Pooks for now (only Marnich's test
  // account sees the full shop + gift flow — see visibleShopIds on the Gifts
  // page). While they're hidden we also suppress milestone gift notifications, so
  // nothing pops up about gifts she can't see yet.
  const giftsEnabled = account === 'marnich'
  const [data, setData] = useState(() =>
    loadStateForSession(readStoredSession(), readMarnichMode()),
  )
  // Always-current snapshot of data so a flush-on-exit save sends the latest.
  const dataRef = useRef(data)
  dataRef.current = data
  // The exact state object we last synced to the backend (saved or adopted). If
  // dataRef.current is a different object, there are unsaved local edits — used
  // by the auto-adopt poll so it never overwrites her in-progress changes.
  const lastSyncedRef = useRef(data)
  // The current SA day key, re-read when the tab regains focus/visibility and on
  // a slow interval, so the daily Council dispatch still fires if the app is left
  // open across SA midnight (a backgrounded PWA never remounts on its own).
  const [dayKey, setDayKey] = useState(saDateKey)
  const [toast, setToast] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confetti, setConfetti] = useState(0)
  // While waiting for the other player to finish a head-to-head game, poll the
  // server: { game, who, code } or null.
  const [pendingPoll, setPendingPoll] = useState(null)
  // A random wildlife encounter currently on screen (null = none). Shown at most
  // once per app session via encounterShownRef.
  const [encounter, setEncounter] = useState(null)
  const encounterShownRef = useRef(false)
  // Last known backend version of the active account's state, so debounced saves
  // can bump it monotonically and we can tell our cache from a fresher remote.
  const stateVersionRef = useRef(0)
  // Has the active account already seen the one-time cinematic intro? Read
  // immediately on app load so a refresh/navigation never replays it.
  const [introSeen, setIntroSeen] = useState(() =>
    readIntroSeen(dataAccountFor(readStoredSession(), readMarnichMode())),
  )
  const [reveal, setReveal] = useState(null)
  const [rewardUnlockQueue, setRewardUnlockQueue] = useState([])
  const [missedDraft, setMissedDraft] = useState({ location: '', note: '' })
  const [birdProfile, setBirdProfile] = useState(null)
  const [tweetyDancing, setTweetyDancing] = useState(false)
  const [weeklyTip, setWeeklyTip] = useState(false)
  // True if Tweety hasn't been visited in over 24h (captured once on load).
  const [missedYou] = useState(() => {
    const lv = data.tweety?.lastVisit
    return lv ? Date.now() - new Date(lv).getTime() >= 86400000 : false
  })
  // Open the hidden admin login when the URL is /admin (or #admin).
  const [adminGate, setAdminGate] = useState(() => {
    try {
      return `${window.location.pathname}${window.location.hash}`.toLowerCase().includes('admin')
    } catch {
      return false
    }
  })
  const tapTrackerRef = useRef({ count: 0, last: 0 })

  // --- Navigation history so every page has a working "previous" Back ---
  // Recorded in refs (no re-render) and updated automatically on every page
  // change, regardless of how the change was triggered — so nothing ever
  // becomes a dead end.
  const navHistoryRef = useRef([])
  const prevPageRef = useRef('home')
  const backNavRef = useRef(false)

  useEffect(() => {
    if (backNavRef.current) {
      backNavRef.current = false
    } else if (prevPageRef.current !== activePage) {
      navHistoryRef.current.push(prevPageRef.current)
      if (navHistoryRef.current.length > 50) navHistoryRef.current.shift()
    }
    prevPageRef.current = activePage
  }, [activePage])

  // Step back to the page she came from (falls back to Home at the root).
  function goBack() {
    const hist = navHistoryRef.current
    if (hist.length === 0) {
      setActivePage('home')
      return
    }
    backNavRef.current = true
    setActivePage(hist.pop())
  }

  // The Pooks logo always returns to Home and resets the trail.
  function goHome() {
    navHistoryRef.current = []
    backNavRef.current = true
    setActivePage('home')
  }

  // Secret tap sequence: 5 quick taps on the bird logo opens admin login;
  // otherwise the logo always takes her Home.
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
    goHome()
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

  // Always open every page scrolled to the very top — Collection especially
  // used to land at the bottom of the long bird grid after navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo(0, 0)
    const wrap = document.querySelector('.page-wrap')
    if (wrap) wrap.scrollTop = 0
    document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0
  }, [activePage])

  // First app-open of the day: a warm new dispatch from the Bird Council lands
  // in the inbox, with a real SA bird fact she has not seen before.
  //
  // The SA-local day key (UTC+2) keeps the daily dispatch — and the special
  // date-gated presentation/Cape Town messages — rolling over together with the
  // challenges and theme at SA midnight. We re-run this whenever `dayKey` ticks
  // over OR the stored `lastCouncilDay` changes: the latter is essential because
  // the cross-device sync adopts the backend copy shortly after launch and
  // REPLACES local state, which would otherwise wipe a dispatch we'd just added.
  // Keying off the synced value means we re-reconcile against whatever state
  // actually won, so she reliably gets exactly one dispatch per day, no gaps.
  useEffect(() => {
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
    if (data.messagesMeta?.lastCouncilDay === dayKey) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setData((current) => {
        const dispatch = councilDispatchForDay(current.messagesMeta, dayKey)
        if (!dispatch) return current
        return {
          ...current,
          messages: [dispatch.message, ...(current.messages || [])],
          messagesMeta: dispatch.meta,
        }
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dayKey, data.messagesMeta?.lastCouncilDay])

  // Keep `dayKey` current so the dispatch above fires after an SA-midnight
  // rollover even if the app was never closed. Cheap re-checks on focus/visibility
  // catch the common "left it open overnight, opened it in the morning" case; the
  // slow interval is a backstop. setDayKey is a no-op when the key is unchanged.
  useEffect(() => {
    const refresh = () => setDayKey(saDateKey())
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(refresh, 60000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(id)
    }
  }, [])

  // Celebrate whenever Tweety grows into a new life stage (real calendar days).
  useEffect(() => {
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
    if (!data.tweety?.companion && !data.tweety?.bornAt) return undefined
    const idx = tweetyGrowthIndex(data.tweety)
    if (idx <= (data.tweetyGrowthSeen || 0)) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const stage = tweetyGrowth(data.tweety)
      const name = data.tweety?.name || 'Tweety'
      // The final stage is a one-time milestone: a special coin reward plus a
      // permanent keepsake note from Marnich in her inbox.
      const isCrown = stage.key === 'crowned'
      let celebrated = false
      setData((current) => {
        if ((current.tweetyGrowthSeen || 0) >= idx) return current
        celebrated = true
        const message = isCrown
          ? crownedAdultKeepsakeMessage(name)
          : tweetyGrowthSystemMessage(name, stage.short)
        return {
          ...current,
          tweetyGrowthSeen: idx,
          featherCoins: (current.featherCoins || 0) + (isCrown ? CROWN_ADULT_REWARD : 0),
          messages: [message, ...(current.messages || [])],
        }
      })
      if (!celebrated) return
      setConfetti(Date.now())
      setReveal(
        isCrown
          ? {
              tone: 'bird',
              title: `${name} is a Crowned Adult! 👑`,
              body: `${name} reached the final stage — all grown up from your daily care! A keepsake note from Marnich is waiting in your inbox, and +${CROWN_ADULT_REWARD} Feather Coins have landed. 💛`,
            }
          : {
              tone: 'bird',
              title: `${name} is growing! 🎉`,
              body: `${name} just became a ${stage.label}. Each day of love helps them grow a little bigger. 💛`,
            },
      )
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, data.tweety?.bornAt])

  // The browser-tab favicon stays the app icon (set statically in index.html),
  // so it matches the installed app icon everywhere.

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
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
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
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
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

  // Escape: when the 2-hour timer runs out, the bird flies free to the Sanctuary.
  useEffect(() => {
    const esc = data.tweety?.escape
    if (!esc) return undefined
    let cancelled = false
    const check = () => {
      if (cancelled || Date.now() <= esc.deadline) return
      cancelled = true
      setData((c) => ({
        ...c,
        tweety: {
          ...c.tweety,
          escape: null,
          sanctuary: [
            { id: createId('sanctuary'), name: esc.birdName, how: 'Escaped', date: formatDate(todayValue()), note: '' },
            ...(c.tweety.sanctuary || []),
          ],
        },
        featherCoins: c.featherCoins + 50,
      }))
      setReveal({
        tone: 'bird',
        title: 'Sometimes love means letting go 🐦',
        body: `${esc.birdName} flew into the sunset sky, free and happy. +50 coins for your brave heart. 💛`,
      })
    }
    Promise.resolve().then(check)
    const id = window.setInterval(check, 5000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [data.tweety?.escape])

  // On opening the app: a chance of a story event, or (rarely) an escape.
  useEffect(() => {
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const tw = data.tweety
      if (tw?.worldEvent || tw?.escape) return
      if (tw?.baby && babyStage(tw.baby) === 'fledgling' && tw.lastEscapeCheck !== dayKeyW(0)) {
        setData((c) => ({ ...c, tweety: { ...c.tweety, lastEscapeCheck: dayKeyW(0) } }))
        if (Math.random() < 0.03) {
          triggerEscape(tw.baby.species)
          return
        }
      }
      if ((tw?.incubating || tw?.baby) && Math.random() < 0.4) {
        triggerWorldEvent()
      }
    }, 1400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

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
    // During the Cape Town Special Week a date-gated challenge replaces the
    // normal main one (and pays the 40-coin bonus rate); otherwise normal pick.
    const main = getSpecialDailyChallenge(date) || getDailyChallenge(data.challenges, date)
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
    // Read-only mirror of Pooks: never write anything back to her save.
    if (readOnly) return
    try {
      // Always save under the active account's key, so Marnich's test save and
      // Pooks' real save never overwrite one another.
      localStorage.setItem(
        storageKeyForAccount(account),
        JSON.stringify(prepareStateForStorage(data)),
      )
    } catch (error) {
      // Storage is full — warn rather than silently losing the save.
      console.warn('Could not save app data (storage may be full)', error)
      window.setTimeout(() => {
        setToast({
          title: 'Storage almost full 📦',
          body: 'Some photos may not have saved. Removing a few old photos will help.',
          tone: 'warning',
        })
      }, 0)
    }
  }, [data, account, readOnly])

  // Source of truth: debounce-save the active account's state to the backend so
  // it follows her login onto any device. The localStorage write above stays as
  // the offline cache. Never runs while viewing Pooks' read-only mirror.
  useEffect(() => {
    if (readOnly || !session) return undefined
    if (account !== 'pooks' && account !== 'marnich') return undefined
    const timer = window.setTimeout(() => {
      saveRemoteState(account, data, stateVersionRef.current).then((res) => {
        if (res) {
          stateVersionRef.current = res.version
          lastSyncedRef.current = data
        }
      })
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [data, account, readOnly, session])

  // Flush the latest state to the backend when the tab is hidden or closed, so
  // changes in the last few seconds aren't lost before the debounce fires.
  useEffect(() => {
    if (readOnly || !session) return undefined
    if (account !== 'pooks' && account !== 'marnich') return undefined
    const flushNow = () =>
      saveRemoteState(account, dataRef.current, stateVersionRef.current, { keepalive: true })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    window.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', flushNow)
    return () => {
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', flushNow)
    }
  }, [account, readOnly, session])

  // Auto-adopt "fixed elsewhere" state. The backend is the source of truth, so if
  // it has moved AHEAD of the version this session last wrote/adopted — another
  // device, or an admin fix — pull it and adopt it instead of letting our stale
  // copy overwrite it on the next save. Poll on a timer and the moment the tab
  // becomes visible again. We never adopt over genuine unsaved local edits.
  useEffect(() => {
    if (readOnly || !session) return undefined
    if (account !== 'pooks' && account !== 'marnich') return undefined
    let cancelled = false
    const check = () => {
      fetchRemoteState(account).then((remote) => {
        if (cancelled) return
        const hasUnsavedLocalEdits = dataRef.current !== lastSyncedRef.current
        if (shouldAdoptRemote(remote, stateVersionRef.current, hasUnsavedLocalEdits)) {
          adoptState(account, remote.state, remote.version)
        }
      })
    }
    const id = window.setInterval(check, 20000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [account, readOnly, session])

  // Stamp this visit so the "Tweety missed you" nudge only shows after a real gap.
  // Never stamp while viewing Pooks' read-only mirror.
  useEffect(() => {
    if (readOnly) return undefined
    const t = window.setTimeout(() => {
      setData((c) => ({ ...c, tweety: { ...c.tweety, lastVisit: new Date().toISOString() } }))
    }, 0)
    return () => window.clearTimeout(t)
  }, [readOnly])

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

  // On app open while already logged in, pull the account's authoritative state
  // from the backend so reopening on any device shows the latest (the read-only
  // Pooks mirror is handled separately by its own effect).
  useEffect(() => {
    const stored = readStoredSession()
    if (!stored) return undefined
    const mode = readMarnichMode()
    if (isReadOnlyView(stored, mode)) return undefined
    const acct = dataAccountFor(stored, mode)
    if (acct !== 'pooks' && acct !== 'marnich') return undefined
    let cancelled = false
    fetchRemoteState(acct).then((remote) => {
      if (cancelled || !remote || !remote.state) return
      // Don't clobber edits the user made WHILE this fetch was in flight — e.g.
      // tapping a button right after load. Without this guard the late-resolving
      // adopt overwrites their just-made change (the coin top-up reverting to the
      // old balance, and the same class of bug that froze the daily messages).
      // Same protection the auto-adopt poll uses.
      if (dataRef.current !== lastSyncedRef.current) return
      adoptState(acct, remote.state, remote.version)
    })
    return () => {
      cancelled = true
    }
    // Runs once on mount — deliberately not re-run on account changes (logins
    // and toggles adopt remote state on their own).
  }, [])

  // Load the all-time leaderboard from the server whenever the app opens, so it
  // shows correctly every time either person opens the app.
  useEffect(() => {
    let cancelled = false
    fetchGameLeaderboard()
      .then((lb) => {
        if (cancelled || !lb) return
        setData((c) => ({ ...c, games: { ...c.games, leaderboard: lb } }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Waiting for the other player: poll the server until the match resolves.
  useEffect(() => {
    if (!pendingPoll) return undefined
    let cancelled = false
    const id = window.setInterval(() => {
      fetchGameState(pendingPoll.game, pendingPoll.code)
        .then((state) => {
          if (cancelled) return
          if (state.status === 'done') {
            setPendingPoll(null)
            applyGameState(pendingPoll.game, pendingPoll.who, state)
          } else if (state.leaderboard) {
            setData((c) => ({ ...c, games: { ...c.games, leaderboard: state.leaderboard } }))
          }
        })
        .catch(() => {})
    }, 3000)
    // Give up after 3 minutes so it never polls forever.
    const stop = window.setTimeout(() => setPendingPoll(null), 180000)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearTimeout(stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPoll])

  // Random wildlife encounters: when the app opens or she visits Tweety's nest,
  // occasionally a critter wanders by. At most once per app session.
  useEffect(() => {
    const isPlayer = session?.role === 'pooks' || session?.role === 'marnich'
    // No encounters while viewing Pooks' read-only mirror (they'd award coins).
    if (!isPlayer || readOnly || !data.tweety?.companion) return undefined
    if (encounterShownRef.current) return undefined
    if (activePage !== 'home' && activePage !== 'tweety') return undefined
    const t = window.setTimeout(() => {
      if (encounterShownRef.current) return
      const rolled = rollEncounter()
      if (rolled) {
        encounterShownRef.current = true
        setEncounter(rolled)
      }
    }, 1400)
    return () => window.clearTimeout(t)
  }, [activePage, session, readOnly, data.tweety?.companion])

  // Live mirror: while viewing Pooks' read-only progress, fetch her real state
  // from the backend every few seconds and on window focus, so Marnich sees her
  // current data on ANY device. Falls back to her local cache when offline.
  useEffect(() => {
    if (!readOnly) return undefined
    let cancelled = false
    const refresh = () => {
      fetchRemoteState('pooks').then((res) => {
        if (cancelled) return
        if (res && res.state) {
          setData(normalizeLoadedState(res.state))
        } else {
          try {
            setData(loadStateRaw('pooks'))
          } catch {
            /* ignore transient read errors */
          }
        }
      })
    }
    refresh()
    const id = window.setInterval(refresh, 6000)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [readOnly])

  // One tap kept Tweety safe — close the encounter and pay the small reward.
  function resolveEncounter() {
    if (readOnly) return
    setData((c) => ({ ...c, featherCoins: (c.featherCoins || 0) + ENCOUNTER_REWARD }))
    setEncounter(null)
    setToast({
      title: 'Tweety is safe! 💛',
      body: `+${ENCOUNTER_REWARD} Feather Coins for protecting the nest.`,
      tone: 'success',
    })
  }

  // Adopt an account's state into the live app + local cache, tracking its
  // backend version and restoring the synced intro-seen flag. Used when a login
  // or toggle has already fetched the authoritative state from the backend.
  function adoptState(acct, rawState, version) {
    // Fill any missing keys from the defaults so an older device's partial blob
    // is always complete and safe to render.
    const state = normalizeLoadedState(rawState)
    stateVersionRef.current = version || 0
    try {
      localStorage.setItem(storageKeyForAccount(acct), JSON.stringify(prepareStateForStorage(state)))
    } catch {
      /* cache may be full — backend remains the source of truth */
    }
    setData(state)
    lastSyncedRef.current = state
    setIntroSeen(Boolean(state.introSeen) || readIntroSeen(acct))
    if (state.introSeen) markIntroSeen(acct)
  }

  // Flip to a different account/session. With a preloaded backend state we adopt
  // it directly; otherwise we fall back to that account's local cache. Marnich
  // always lands in the read-only "View Pooks" mirror first.
  function switchAccount(nextSession, page = 'home', options = {}) {
    const nextMode = 'view'
    const nextAccount = dataAccountFor(nextSession, nextMode)
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    writeMarnichMode(nextMode)
    setMarnichMode(nextMode)
    if (options.preloaded) {
      adoptState(nextAccount, options.preloaded, options.version)
    } else {
      stateVersionRef.current = 0
      setData(loadStateForSession(nextSession, nextMode))
      setIntroSeen(readIntroSeen(nextAccount))
    }
    setSession(nextSession)
    setActivePage(page)
    setMenuOpen(false)
  }

  // Marnich toggles between watching Pooks (read-only) and his own test sandbox.
  // The sandbox is his own synced account, so pull its latest backend state.
  async function setMarnichViewMode(mode) {
    const nextMode = mode === 'sandbox' ? 'sandbox' : 'view'
    writeMarnichMode(nextMode)
    setMarnichMode(nextMode)
    setActivePage('home')
    setMenuOpen(false)
    if (nextMode === 'sandbox') {
      const remote = await fetchRemoteState('marnich')
      if (remote && remote.state) {
        adoptState('marnich', remote.state, remote.version)
      } else {
        stateVersionRef.current = 0
        setData(loadStateForSession(session, nextMode))
        setIntroSeen(readIntroSeen('marnich'))
      }
    } else {
      // View Pooks mirror — the read-only mirror effect populates her live state.
      stateVersionRef.current = 0
      setData(loadStateForSession(session, nextMode))
      setIntroSeen(readIntroSeen('pooks'))
    }
  }

  // Login screen: Pooks' own login, plus Marnich's separate test-player login.
  // The backend is the source of truth: fetch the account's state and validate
  // the secret against the password stored INSIDE it, so the right password
  // works from any device. Falls back to local validation when nothing is synced
  // yet (first login ever) or the backend is unreachable.
  async function login(name, secret) {
    const cleanName = String(name || '').trim().toLowerCase()
    const cleanSecret = String(secret || '').trim()
    let role = null
    if (cleanName === 'pooks' || cleanName === 'marlie') role = 'pooks'
    else if (cleanName === MARNICH_LOGIN_NAME) role = 'marnich'
    if (!role || !cleanSecret) return false

    const acct = role === 'marnich' ? 'marnich' : 'pooks'
    const nextSession =
      role === 'marnich' ? { role: 'marnich', name: 'Marnich' } : { role: 'pooks', name: 'Pooks' }
    const remote = await fetchRemoteState(acct)

    if (remote && remote.state) {
      const savedSecret =
        role === 'marnich'
          ? remote.state.settings?.marnichSecret || MARNICH_DEFAULT_SECRET
          : remote.state.settings?.pooksSecret || 'feather'
      if (cleanSecret !== savedSecret) return false
      // Marnich starts in the read-only Pooks mirror (view mode), so we don't
      // load his own state into the screen — the mirror effect shows Pooks. We
      // only needed his synced state to verify his password.
      if (role === 'marnich') {
        switchAccount(nextSession)
      } else {
        switchAccount(nextSession, 'home', { preloaded: remote.state, version: remote.version })
      }
      return true
    }

    // First login anywhere (or backend offline): validate locally, then seed the
    // backend from the local save so the next device inherits it.
    const localOk =
      role === 'marnich'
        ? cleanSecret === marnichLoginSecret()
        : cleanSecret === data.settings.pooksSecret
    if (!localOk) return false
    switchAccount(nextSession)
    const seed = loadStateRaw(acct)
    saveRemoteState(acct, seed, 0).then((res) => {
      if (res) stateVersionRef.current = res.version
    })
    return true
  }

  // Separate, hidden admin login reached only via /admin or the secret tap. The
  // admin panel manages Pooks' real account, so it adopts her live backend state.
  async function adminLogin(secret) {
    const cleanSecret = String(secret || '').trim()
    if (!cleanSecret) return false
    const remote = await fetchRemoteState('pooks')
    const adminSecret = remote?.state?.settings?.adminSecret || data.settings.adminSecret
    if (cleanSecret !== adminSecret) return false
    const adminSession = { role: 'admin', name: 'Marnich' }
    if (remote && remote.state) {
      switchAccount(adminSession, 'admin', { preloaded: remote.state, version: remote.version })
    } else {
      switchAccount(adminSession, 'admin')
    }
    setAdminGate(false)
    try {
      window.history.replaceState(null, '', '/')
    } catch {
      // ignore
    }
    return true
  }

  function logout() {
    // Flush the final state of the account we're leaving (best effort).
    if (!readOnly && (account === 'pooks' || account === 'marnich')) {
      saveRemoteState(account, dataRef.current, stateVersionRef.current, { keepalive: true })
    }
    localStorage.removeItem(SESSION_STORAGE_KEY)
    // Return to the logged-out Pooks account view (and reset Marnich's mode).
    writeMarnichMode('view')
    setMarnichMode('view')
    stateVersionRef.current = 0
    setData(loadState('pooks'))
    setIntroSeen(readIntroSeen('pooks'))
    setSession(null)
    setMenuOpen(false)
    setActivePage('home')
  }

  // Replay the one-time intro on demand (gear menu / profile). The "seen" flag
  // is cleared while she watches and restored when she taps Accept again, so
  // she can rewatch her Bird Council dossier as many times as she likes.
  function replayIntro() {
    if (readOnly) return // don't touch Pooks' intro flag from her mirror
    setMenuOpen(false)
    clearIntroSeen(account)
    setIntroSeen(false)
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

  // Feed / water / play with Tweety — only inside one of the three daily care
  // windows (morning / afternoon / evening). Each action is done once per
  // window; completing all three windows fills the whole day.
  function careTweety(kind) {
    if (readOnly) return // viewing Pooks' mirror — never change her Tweety
    const now = new Date()
    const win = currentCareWindow(now)
    if (!win) return // Tweety is resting between care windows
    const field = kind === 'water' ? 'watered' : kind === 'play' ? 'played' : 'fed'
    const careNow = tweetyCareState(data.tweety, now)
    if (careNow[field]) return // already done in this window

    playChirp(kind)
    const key = tweetyTodayKey()
    // Is this window now fully complete (feed + water + play) after this action?
    const windowComplete = ['fed', 'watered', 'played'].every((f) => f === field || careNow[f])
    const today = data.tweety?.care?.[key] || {}
    const nextToday = windowComplete ? { ...today, [win.key]: true } : today
    const nextTweety = {
      ...data.tweety,
      care: { ...(data.tweety?.care || {}), [key]: nextToday },
      careAt: { ...(data.tweety?.careAt || {}), [field]: now.toISOString() },
    }

    // Coins are earned per completed care WINDOW (feed+water+play), so a full
    // day of all three windows pays 15 — individual taps just keep Tweety happy.
    let coins = windowComplete ? COINS.tweetyCare : 0
    let bonusNote = ''
    // The whole day is "full" once all three care windows are complete.
    const becameFull = windowComplete && CARE_WINDOWS.every((w) => nextToday[w.key])
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

    // Every care action gives Tweety a happy little animation; play and streak
    // bonuses get a longer celebration dance.
    const bigCelebrate = kind === 'play' || Boolean(bonusNote)
    setTweetyDancing(true)
    if (bonusNote) setConfetti(Date.now())
    window.setTimeout(
      () => setTweetyDancing(false),
      bonusNote ? 2800 : bigCelebrate ? 1800 : 1100,
    )

    commit(
      { ...data, tweety: nextTweety, featherCoins: data.featherCoins + coins },
      {
        title:
          field === 'fed'
            ? 'Yum! 🐛'
            : field === 'watered'
              ? 'Refreshing! 💧'
              : 'So much fun! 💗',
        body: `${nextTweety.name || 'Tweety'} loved that.${coins > 0 ? ` Care window complete! +${coins} Feather Coins.` : ''}${bonusNote}${familyNote}`,
      },
    )
  }

  function renameTweety(name) {
    setData((current) => ({ ...current, tweety: { ...current.tweety, name } }))
  }

  // ----- Tweety World: story events -----
  function triggerWorldEvent(eventId) {
    if (data.tweety?.worldEvent) return
    let def = eventId ? eventById(eventId) : null
    if (!def) {
      const scope = data.tweety?.incubating ? 'incubation' : data.tweety?.baby ? 'baby' : null
      const pool = scope ? WORLD_EVENTS.filter((e) => e.scope === scope) : WORLD_EVENTS
      def = pool[Math.floor(Math.random() * pool.length)]
    }
    if (!def) return
    setData((c) => ({
      ...c,
      tweety: {
        ...c.tweety,
        worldEvent: {
          id: def.id,
          emoji: def.emoji,
          title: def.title,
          body: def.body,
          kind: def.kind,
          taps: def.taps || 0,
          tapsDone: 0,
          windowMin: def.windowMin || 0,
          deadline: def.windowMin ? Date.now() + def.windowMin * 60000 : 0,
        },
      },
    }))
  }

  function tapWorldEvent() {
    const ev = data.tweety?.worldEvent
    if (!ev || ev.kind !== 'tap') return
    playChirp('feed')
    const done = (ev.tapsDone || 0) + 1
    if (done >= ev.taps) {
      resolveWorldEvent(true)
    } else {
      setData((c) => ({ ...c, tweety: { ...c.tweety, worldEvent: { ...ev, tapsDone: done } } }))
    }
  }

  function resolveWorldEvent(success) {
    const ev = data.tweety?.worldEvent
    if (!ev) return
    const def = eventById(ev.id) || {}
    let coins = 0
    let body = def.body || ''
    let tweetyPatch = { worldEvent: null }
    if (ev.kind === 'good') {
      if (ev.id === 'spring') coins = 25
      else if (ev.id === 'tumble') coins = 10
      else if (ev.id === 'lonely') coins = 5
      if (ev.id === 'star' && data.tweety?.incubating) {
        // Hatch a day early: bump progress.
        tweetyPatch.incubating = { ...data.tweety.incubating, progress: (data.tweety.incubating.progress || 0) + 1 }
      }
    } else {
      body = success ? 'You did it — all safe! 💛' : def.failNote || 'It passed on its own. No harm done.'
      if (success) coins = 10
      if (!success && def.lossDay && data.tweety?.incubating) {
        tweetyPatch.incubating = {
          ...data.tweety.incubating,
          extraDays: (data.tweety.incubating.extraDays || 0) + 1,
          cold: true,
        }
      }
    }
    setConfetti(Date.now())
    commit(
      { ...data, tweety: { ...data.tweety, ...tweetyPatch }, featherCoins: Math.max(0, data.featherCoins + coins) },
      { title: ev.title, body: coins ? `${body} +${coins} coins.` : body },
    )
  }

  // ----- Tweety World: escape -----
  function triggerEscape(birdName) {
    if (data.tweety?.escape) return
    const name = birdName || data.tweety?.baby?.species || 'your little bird'
    const start = Date.now()
    setData((c) => ({
      ...c,
      tweety: {
        ...c.tweety,
        baby: null,
        escape: {
          birdName: name,
          startedAt: start,
          deadline: start + 2 * 3600 * 1000,
          clues: [
            { at: start + 30 * 60000, text: 'It was seen near the garden 🌿' },
            { at: start + 60 * 60000, text: 'Listen for its call… 🎵' },
            { at: start + 90 * 60000, text: 'Something moved near the tree outside 🌳' },
          ],
        },
      },
    }))
    setToast({
      title: `OH NO! ${name} escaped! 🐦💨`,
      body: 'Go outside and photograph ANY real bird within 2 hours to call them home. 💛',
      tone: 'warning',
    })
  }

  function addToSanctuary(name, how) {
    return {
      id: createId('sanctuary'),
      name,
      how,
      date: formatDate(todayValue()),
      note: '',
    }
  }

  function leaveSanctuaryNote(id, note) {
    setData((c) => ({
      ...c,
      tweety: {
        ...c.tweety,
        sanctuary: (c.tweety.sanctuary || []).map((b) => (b.id === id ? { ...b, note } : b)),
      },
    }))
  }

  // ----- Tweety World: Bird Room -----
  function buyRoomFurniture(item, options = {}) {
    const free = Boolean(options.free)
    const room = data.tweety?.room || { furniture: ['perch'], visits: 0 }
    if (ownsFurniture(room, item.id)) return
    const cost = free ? 0 : item.cost
    if (!free && data.featherCoins < cost) {
      setToast({ title: 'Not enough coins yet', body: `That costs ${cost} 🪙.`, tone: 'warning' })
      return
    }
    const furniture =
      item.id === 'full'
        ? ROOM_FURNITURE.map((f) => f.id)
        : Array.from(new Set([...(room.furniture || ['perch']), item.id]))
    commit(
      { ...data, tweety: { ...data.tweety, room: { ...room, furniture } }, featherCoins: data.featherCoins - cost },
      {
        title: free ? 'A gift from Marnich 🎁' : 'Added to the Bird Room 🏡',
        body: `${item.name} ${item.emoji}${free ? ' — sent free by Marnich! 💛' : ''}`,
        tone: free ? 'success' : 'calm',
      },
    )
  }

  // ----- Bird Garden (sandbox-only; see gating on the page + menu) -----
  // Place an item at the spot she tapped: charge on placement, store its {x,y}
  // so each garden's layout is unique. Then she tends it daily to grow it.
  function placeGardenItem(itemId, x, y) {
    const item = gardenItem(itemId)
    if (!item) return
    if (data.featherCoins < item.cost) {
      setToast({ title: 'Not enough coins yet', body: `That costs ${item.cost} 🪙.`, tone: 'warning' })
      return
    }
    const planting = {
      id: createId('plant'),
      type: itemId,
      x,
      y,
      wateredDays: 0,
      lastWaterDay: '',
      plantedAt: new Date().toISOString(),
    }
    const garden = data.garden || defaultGarden()
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - item.cost,
        garden: { ...garden, plantings: [...(garden.plantings || []), planting] },
      },
      { title: 'Planted 🌱', body: `${item.name} ${item.emoji} placed — tend it each day to grow it.` },
    )
  }

  // Water one planting (once per SA day); advances its growth stage.
  function waterGardenPlant(plantingId) {
    if (readOnly) return
    const garden = data.garden || defaultGarden()
    const plantings = garden.plantings || []
    const planting = plantings.find((p) => p.id === plantingId)
    if (!planting || !canWater(planting)) return
    const item = gardenItem(planting.type)
    const nextWatered = (planting.wateredDays || 0) + 1
    const grown = nextWatered >= (item?.waterToGrow || Infinity)
    const next = plantings.map((p) =>
      p.id === plantingId ? { ...p, wateredDays: nextWatered, lastWaterDay: saDateKey() } : p,
    )
    commit(
      { ...data, garden: { ...garden, plantings: next } },
      grown
        ? { title: 'Fully grown! 🌳', body: `Your ${item?.name || 'plant'} is all grown up — a permanent part of the garden.`, tone: 'success' }
        : { title: 'Watered 💧', body: `You watered your ${item?.name || 'plant'}. Come back tomorrow for more growth.`, tone: 'calm' },
    )
  }

  // Sandbox testing helper: top up coins so everything can be bought freely.
  // Guarded by readOnly (and the button only renders in sandbox mode), so it can
  // never run against Pooks' real account. Uses a functional setData so it always
  // applies to the latest state immediately (no stale-closure or commit-path
  // surprises) — the regular save effect then persists it for the sandbox.
  function addSandboxCoins() {
    if (readOnly) return
    setData((c) => ({ ...c, featherCoins: (c.featherCoins || 0) + 10000 }))
    setToast({
      title: 'Sandbox top-up 🪙',
      body: '+10,000 Feather Coins added to your test account.',
      tone: 'success',
    })
  }

  function roomInteract(kind) {
    roomSound(kind)
    setData((c) => ({
      ...c,
      tweety: {
        ...c.tweety,
        room: { ...(c.tweety.room || { furniture: ['perch'], visits: 0 }), visits: (c.tweety.room?.visits || 0) + 1 },
      },
    }))
  }

  // ----- Marnich's Secret Market: wearables + wardrobe -----
  function buyWearable(item, options = {}) {
    const free = Boolean(options.free)
    const wardrobe = data.tweety?.wardrobe || defaultWardrobe()
    if (ownsWearable(wardrobe, item.id)) return
    const cost = free ? 0 : item.cost
    if (!free && data.featherCoins < cost) {
      setToast({ title: 'Not enough coins yet', body: `${item.name} costs ${cost} 🪙.`, tone: 'warning' })
      return
    }
    const owned = Array.from(new Set([...(wardrobe.owned || []), item.id]))
    const wishlist = (wardrobe.wishlist || []).filter((id) => id !== item.id)
    if (free) setConfetti(Date.now())
    commit(
      {
        ...data,
        tweety: { ...data.tweety, wardrobe: { ...wardrobe, owned, wishlist } },
        featherCoins: data.featherCoins - cost,
      },
      {
        title: free ? 'A gift from Marnich 🎁' : 'Added to the wardrobe ✨',
        body: `${item.emoji} ${item.name}${free ? ' — sent with love by Marnich! 💛' : ' is ready to wear.'}`,
        tone: free ? 'success' : 'calm',
      },
    )
  }

  function giftWearable(item) {
    buyWearable(item, { free: true })
  }

  function wearWearable(slot, id) {
    setData((c) => {
      const wardrobe = c.tweety?.wardrobe || defaultWardrobe()
      const current = wardrobe.worn?.[slot]
      const nextWorn = { ...wardrobe.worn, [slot]: current === id ? null : id }
      return { ...c, tweety: { ...c.tweety, wardrobe: { ...wardrobe, worn: nextWorn } } }
    })
  }

  function toggleWishlistItem(id) {
    setData((c) => {
      const wardrobe = c.tweety?.wardrobe || defaultWardrobe()
      const has = (wardrobe.wishlist || []).includes(id)
      const wishlist = has
        ? wardrobe.wishlist.filter((w) => w !== id)
        : [...(wardrobe.wishlist || []), id]
      return { ...c, tweety: { ...c.tweety, wardrobe: { ...wardrobe, wishlist } } }
    })
  }

  function markMarketSeen() {
    const rotation = rotationIndex(Date.now())
    if (data.settings?.marketSeenRotation === rotation) return
    setData((c) => ({ ...c, settings: { ...c.settings, marketSeenRotation: rotation } }))
  }

  function setMarnichPick(itemId) {
    const rotation = rotationIndex(Date.now())
    commit(
      { ...data, settings: { ...data.settings, marketPick: { rotation, itemId } } },
      { title: "Marnich's pick set 💛", body: `${wearableById(itemId)?.name || 'That item'} is now the featured pick.` },
    )
  }

  function releaseAviaryBird(id) {
    const aviary = data.tweety?.aviary || []
    const bird = aviary.find((b) => b.id === id)
    if (!bird) return
    commit(
      {
        ...data,
        tweety: {
          ...data.tweety,
          aviary: aviary.filter((b) => b.id !== id),
          sanctuary: [addToSanctuary(bird.species, 'Donated'), ...(data.tweety.sanctuary || [])],
        },
        featherCoins: data.featherCoins + 100,
      },
      { title: 'Donated to the Sanctuary 🌿', body: `${bird.species} now has a forever home. +100 Feather Coins.` },
    )
  }


  // ----- Admin Tweety time-skip controls (these change the REAL pet, for
  // testing growth / eggs / hatching without waiting real days) -----
  function adminSkipTweetyDay() {
    const tw = data.tweety
    if (!tw) return
    if (tw.companion && tw.bornAt) {
      const born = new Date(tw.bornAt)
      born.setDate(born.getDate() - 1)
      const iso = born.toISOString()
      setData((c) => ({ ...c, tweety: { ...c.tweety, bornAt: iso } }))
      setToast({
        title: 'Skipped forward a day ⏩',
        body: `${tw.name || 'Tweety'} is a day older.`,
        tone: 'success',
      })
    }
  }

  function adminAdvanceTweetyStage() {
    const tw = data.tweety
    if (!tw || !tw.companion || !tw.bornAt) {
      setToast({
        title: 'No grown Tweety yet',
        body: 'Hatch the first egg before advancing growth stages.',
        tone: 'calm',
      })
      return
    }
    const progress = tweetyGrowthProgress(tw)
    if (!progress.next) {
      setToast({
        title: 'Already fully grown 👑',
        body: `${tw.name || 'Tweety'} is a crowned adult.`,
        tone: 'calm',
      })
      return
    }
    // Set bornAt so today's age lands on the first day of the next stage.
    const targetAgeDays = progress.stage.maxDay + 1
    const born = new Date()
    born.setHours(0, 0, 0, 0)
    born.setDate(born.getDate() - targetAgeDays)
    const iso = born.toISOString()
    setData((c) => ({ ...c, tweety: { ...c.tweety, bornAt: iso } }))
    setToast({
      title: 'Grew up! 🌱',
      body: `${tw.name || 'Tweety'} advanced to ${progress.next.short}.`,
      tone: 'success',
    })
  }

  // Fast Forward ⏩ — Marnich's own testing tool (his account only). Advances HIS
  // account by one day so he can test Tweety's growth in minutes: ages Tweety a
  // day and resets today's care windows + daily challenge. Never touches Pooks.
  function fastForwardDay() {
    if (readOnly) return // sandbox-only tool; never touches Pooks' data
    const tw = data.tweety || {}
    const nextTweety = { ...tw }
    let note = ''

    if (tw.companion && tw.bornAt) {
      // Age the companion by a day.
      const born = new Date(tw.bornAt)
      born.setDate(born.getDate() - 1)
      nextTweety.bornAt = born.toISOString()
      note = `${tw.name || 'Tweety'} aged 1 day.`
    }

    // Reset today's care windows so all three can be tested again, fresh.
    const careKey = tweetyTodayKey()
    const nextCare = { ...(nextTweety.care || {}) }
    delete nextCare[careKey]
    nextTweety.care = nextCare
    nextTweety.careAt = { fed: null, watered: null, played: null }

    // Reset today's daily challenge.
    const nextCompletions = { ...(data.dailyChallengeCompletions || {}) }
    delete nextCompletions[todayValue()]

    // Let the garden advance too: clear each planting's daily water gate so it
    // can be watered again immediately (speeds growth through "days" in testing).
    const garden = data.garden
      ? { ...data.garden, plantings: (data.garden.plantings || []).map((p) => ({ ...p, lastWaterDay: '' })) }
      : data.garden

    setData((c) => ({
      ...c,
      tweety: nextTweety,
      dailyChallengeCompletions: nextCompletions,
      garden,
    }))
    setToast({
      title: 'Fast-forwarded 1 day ⏩',
      body: `${note} Care windows, daily challenge + garden watering reset.`.trim(),
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

  // ----- Competitive games (backend-synced sessions + all-time leaderboard) --
  // Both players earn coins for playing a Bird Battle: 25 for a win, 15 for a
  // draw, 10 for a loss (a small thank-you, never a penalty).
  const GAME_WIN_COINS = 25
  const GAME_DRAW_COINS = 15
  const GAME_LOSS_COINS = 10

  // Apply a backend session state to the local UI. The leaderboard always comes
  // from the server (single source of truth across both devices); the local
  // player's own coin balance is adjusted for a win/loss on THIS device.
  function applyGameState(gameKey, who, state) {
    if (!state) return
    const leaderboard = state.leaderboard || data.games.leaderboard
    if (state.status !== 'done') {
      setData((c) => ({
        ...c,
        games: {
          ...c.games,
          leaderboard,
          lastResult: { game: gameKey, status: 'waiting', who, code: state.code },
        },
      }))
      return
    }
    const winner = state.winner
    const localWon = winner === who
    const coinDelta = localWon ? GAME_WIN_COINS : winner === 'draw' ? GAME_DRAW_COINS : GAME_LOSS_COINS
    const text =
      winner === 'draw'
        ? `A tie?! The Bird Council demands a rematch 🐦 +${GAME_DRAW_COINS} coins each`
        : localWon
          ? `You win! The Bird Council is delighted in you 🏆 +${GAME_WIN_COINS} coins`
          : `So close! They edged it this time — +${GAME_LOSS_COINS} coins for playing 🐦`
    if (localWon) setConfetti(Date.now())
    const lastResult = {
      game: gameKey,
      winner,
      text,
      status: 'done',
      code: state.code,
      pooks: state.pooks || { score: 0, timeMs: 0 },
      marnich: state.marnich || { score: 0, timeMs: 0 },
    }
    commit(
      {
        ...data,
        games: { ...data.games, leaderboard, lastResult },
        featherCoins: Math.max(0, data.featherCoins + coinDelta),
      },
      {
        title: winner === 'draw' ? "It's a tie 🤝" : localWon ? 'You win! 🏆' : 'They win 😏',
        body: text,
      },
    )
  }

  // ----- Offline fallback: same-device two-player resolution (legacy) --------
  // Used only if the server can't be reached, so a network blip never loses a game.
  function finishMatch(gameKey, winner, detail, extraPooksCoins = 0) {
    const g = data.games
    // Same sustainable, friendly payout as the online path: 25 win / 15 draw /
    // 10 loss, always a small gain for the local player (Pooks on this device).
    const coinDelta =
      (winner === 'pooks' ? GAME_WIN_COINS : winner === 'draw' ? GAME_DRAW_COINS : GAME_LOSS_COINS) +
      extraPooksCoins
    const text =
      winner === 'pooks'
        ? `Pooks wins! The Bird Council is delighted 🏆 +${GAME_WIN_COINS} coins`
        : winner === 'marnich'
          ? `Marnich edged it this time 🤨 +${GAME_LOSS_COINS} coins for playing`
          : `A tie?! The Bird Council demands a rematch 🐦 +${GAME_DRAW_COINS} coins`
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
          ? 'Now share the code so Marnich can play from his own Games screen.'
          : 'Marnich is done — waiting on Pooks.',
      tone: 'calm',
    })
  }

  // Same-device fallback resolution (used only when the server is unreachable).
  function onGameDoneLocal(gameKey, who, result) {
    const g = data.games
    const prev =
      g[gameKey] && g[gameKey].code === result.code
        ? g[gameKey]
        : { code: result.code, pooks: null, marnich: null }
    const round = { ...prev, [who]: { score: result.score, timeMs: result.timeMs } }
    if (!round.pooks || !round.marnich) return storeWaiting(gameKey, round, who)
    const winner =
      round.pooks.score > round.marnich.score
        ? 'pooks'
        : round.marnich.score > round.pooks.score
          ? 'marnich'
          : round.pooks.timeMs < round.marnich.timeMs
            ? 'pooks'
            : round.marnich.timeMs < round.pooks.timeMs
              ? 'marnich'
              : 'draw'
    finishMatch(gameKey, winner, { pooks: round.pooks, marnich: round.marnich })
    return undefined
  }

  // All three games (quiz, snap, bluff) are score-based: highest score wins,
  // ties broken by who answered faster. Scores go to the server keyed by the
  // shared session code; the second player to finish resolves the match, and the
  // first player polls until the result arrives.
  function onGameDone(gameKey, who, result) {
    if (readOnly) return // viewing Pooks — don't submit scores as her
    // Lock the score in immediately and show "waiting" while we reach the server.
    setData((c) => ({
      ...c,
      games: {
        ...c.games,
        lastResult: { game: gameKey, status: 'waiting', who, code: result.code },
      },
    }))
    postGameResult({
      code: result.code,
      game: gameKey,
      player: who,
      score: result.score,
      timeMs: result.timeMs,
    })
      .then((state) => {
        applyGameState(gameKey, who, state)
        if (state.status !== 'done') {
          setPendingPoll({ game: gameKey, who, code: result.code })
        }
      })
      .catch(() => {
        onGameDoneLocal(gameKey, who, result)
      })
  }

  // Weekly magazine quiz: 25 coins for finishing, but only once per week.
  function claimWeeklyQuiz(week) {
    if (data.weeklyQuizClaimedWeek === week) return
    commit(
      { ...data, weeklyQuizClaimedWeek: week, featherCoins: data.featherCoins + 25 },
      {
        title: 'Weekly Bird Quiz complete! 🧠',
        body: 'The Bird Council added 25 Feather Coins to your bank 🪙',
      },
    )
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
    // Central guard: while viewing Pooks' read-only mirror, no action persists.
    if (readOnly) {
      setToast({
        title: 'Viewing only 👀',
        body: "You're viewing Pooks' progress. Switch to Test sandbox 🧪 to interact.",
        tone: 'calm',
      })
      return
    }
    let recalculated = recalculateState(nextState)
    // Award milestone coin bonuses when the unique-species count crosses a threshold.
    const milestoneBonus = milestoneCoinsBetween(data.birds.length, recalculated.birds.length)
    let milestoneNote = ''
    if (milestoneBonus > 0) {
      recalculated = { ...recalculated, featherCoins: recalculated.featherCoins + milestoneBonus }
      milestoneNote = ` Milestone bonus! +${milestoneBonus} Feather Coins 🏅`
    }
    // While gifts are hidden for Pooks, the reward still unlocks silently in her
    // state (so it's ready when gifts return) but we fire NO notification about
    // it — no unlock popup, no "Snack from Marnich" achievement letter, no toast
    // summary, no email to Marnich.
    const unlockSummary = giftsEnabled ? getUnlockSummary(data, recalculated) : ''
    const unlockedRewards = giftsEnabled ? getNewlyUnlockedRewards(data, recalculated) : []
    setData(recalculated)
    if (unlockedRewards.length) {
      setRewardUnlockQueue((current) => [...current, ...unlockedRewards])
      // Email Marnich about each freshly unlocked gift.
      unlockedRewards.forEach((reward) => notifyMarnich('gift', { giftName: reward.name }))
    }
    if (milestoneBonus > 0) setConfetti(Date.now())
    // Each freshly unlocked milestone reward also lands as an official Council
    // letter in the inbox.
    if (unlockedRewards.length) {
      const letters = unlockedRewards.map((reward) =>
        milestoneSystemMessage(reward.name, reward.milestone),
      )
      setData((current) => ({ ...current, messages: [...letters, ...(current.messages || [])] }))
    }
    setToast({
      title: message.title,
      body: [message.body, milestoneNote, unlockSummary].filter(Boolean).join(' '),
      tone: message.tone || 'success',
    })
  }

  // ---- Inbox / Messages -----------------------------------------------------
  function pushMessage(message) {
    setData((current) => ({ ...current, messages: [message, ...(current.messages || [])] }))
  }

  function markMessageRead(id) {
    setData((current) => ({
      ...current,
      messages: (current.messages || []).map((m) => (m.id === id ? { ...m, read: true } : m)),
    }))
  }

  function toggleMessageFavourite(id) {
    setData((current) => ({
      ...current,
      messages: (current.messages || []).map((m) =>
        m.id === id ? { ...m, favourite: !m.favourite } : m,
      ),
    }))
  }

  function reactToMessage(id, reaction) {
    setData((current) => ({
      ...current,
      messages: (current.messages || []).map((m) =>
        m.id === id ? { ...m, reaction: m.reaction === reaction ? null : reaction } : m,
      ),
    }))
  }

  // Admin → Pooks personal note, arrives instantly in her inbox.
  function sendMarnichInboxMessage(body, title) {
    const text = String(body || '').trim()
    if (!text) return
    pushMessage(marnichMessage(text, title?.trim() || 'A note just for you'))
    notifyMarnich('inbox-message', { message: text })
    setToast({ title: 'Message sent 💛', body: 'Your note is waiting in her inbox.', tone: 'success' })
  }

  // ---- Admin sandbox: play any animation/celebration on demand using FAKE
  // demo data. Nothing here ever touches Pooks' real saved progress.
  const sandbox = {
    previewAsPooks: () => setActivePage('home'),
    eggHatch: () => {
      setConfetti(Date.now())
      setReveal({
        tone: 'bird',
        title: 'It hatched! 🐣🎉',
        body: '(Demo) A baby bird burst out in a shower of confetti with a triumphant chirp! This is only a preview — no real egg was used. 💛',
      })
    },
    discovery: () => {
      setConfetti(Date.now())
      setReveal({
        tone: 'bird',
        title: 'New bird discovered! ✅',
        body: '(Demo) A brand-new species fluttered into the album. Preview only — nothing was added to the real collection.',
      })
    },
    milestone: () => {
      setRewardUnlockQueue((current) => [
        ...current,
        {
          id: 'demo-reward',
          name: 'Demo milestone gift 🎁',
          status: 'Unlocked',
          unlockReason: 'A preview of the milestone reward popup.',
          reference: 'DEMO-0000',
          paidAt: null,
        },
      ])
    },
    tweetyGrowth: () => {
      setConfetti(Date.now())
      setReveal({
        tone: 'bird',
        title: 'Tweety is growing! 🎉',
        body: '(Demo) Tweety just grew into her next life stage. Preview only — her real age is untouched.',
      })
    },
    hiddenNote: () => {
      setReveal({
        tone: 'note',
        title: 'A hidden note unlocked 💌',
        body: '(Demo) "You make ordinary days magical." This is a preview of the note reveal.',
      })
    },
    dateIdea: () => {
      setReveal({
        tone: 'date',
        title: 'Date idea unlocked 💕',
        body: '(Demo) Slow sunrise bird walk with takeaway coffee. This is a preview of the date-idea reveal.',
      })
    },
    birdSnap: () => setActivePage('games'),
    reset: () => {
      setReveal(null)
      setConfetti(0)
      setRewardUnlockQueue([])
      setToast({
        title: 'Sandbox cleared',
        body: "Preview animations reset. Pooks' real progress was never touched.",
        tone: 'calm',
      })
    },
  }

  function resetData() {
    if (readOnly) return // never clear Pooks' save from the read-only mirror
    if (
      !window.confirm(
        'Clear all local Marlie Bird Journey data from this browser? This cannot be undone.',
      )
    ) {
      return
    }
    const fresh = buildDefaultState()
    // Only ever clear the account that's actually active.
    localStorage.removeItem(storageKeyForAccount(account))
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
    goBack()
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
    const aiMatch = form.aiMatch ? normalizeAiMatch(form.aiMatch) : null
    // Canonicalise on the scientific name so a re-scan of the same species can't
    // slip through as a new entry just because the AI worded the common name
    // differently this time.
    const speciesKey = canonicalSpeciesKey(data, birdName, aiMatch?.scientificName)
    const sciKey = normalizeBirdName(aiMatch?.scientificName)
    if (!speciesKey) return
    const isNewSpecies = !data.birds.some((bird) => bird.id === speciesKey)
    const withMarnich = Boolean(form.seenWithMarnich)
    const coinsEarned =
      COINS.spot +
      (isNewSpecies ? COINS.firstSpecies : 0) +
      (withMarnich ? COINS.withMarnich : 0)
    const nickname =
      String(form.nickname || '').trim() || nicknameIdeas[speciesKey] || 'Officially Cute Bird'
    const sighting = {
      id: createId('sighting'),
      speciesKey,
      birdName,
      scientificName: aiMatch?.scientificName || '',
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
      isDiscovery &&
      !data.discoveries.some(
        (d) =>
          d.speciesKey === speciesKey ||
          (sciKey && normalizeBirdName(d.scientificName) === sciKey),
      )
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

    let worldNote = ''

    // Photographing ANY real bird rescues a bird that escaped.
    let nextTweety = { ...data.tweety }
    let rescueCoins = 0
    if (data.tweety?.escape) {
      const escapedName = data.tweety.escape.birdName
      rescueCoins = 100
      worldNote += ` You found ${escapedName}! It recognised you and flew back 💛 +100 coins.`
      nextTweety = {
        ...nextTweety,
        escape: null,
        aviary: [
          ...(nextTweety.aviary || []),
          {
            id: createId('aviary'),
            species: escapedName,
            addedAt: new Date().toISOString(),
            idle: 'hop',
            rescued: true,
          },
        ],
      }
    }

    const sightings = [...data.sightings, sighting]
    const nextState = {
      ...data,
      sightings,
      birds: buildBirdRecords(sightings),
      birdLibrary: upsertBirdLibraryFromSighting(data.birdLibrary, sighting),
      featherCoins: data.featherCoins + coinsEarned + discoveryBonus + rescueCoins,
      tweety: nextTweety,
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
        `${getCouncilMessage(data.sightings.length)} +${coinsEarned + discoveryBonus + rescueCoins} Feather Coins.`,
        isDiscovery ? '+50 discovery bonus \ud83c\udf1f' : '',
        worldNote,
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

    // Warm emails to Marnich: every confirmed spot, plus the 5-bird milestone.
    notifyMarnich('spotted', { birdName })
    const prevUnique = data.birds.length
    const newUnique = nextState.birds.length
    if (prevUnique < 5 && newUnique >= 5) {
      notifyMarnich('milestone', { count: 5 })
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

  async function completeDailyChallenge(kind = 'daily', photoFile = null) {
    if (readOnly) return // viewing Pooks' mirror — read-only
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

    // Cape Town Special Week main challenges pay the 40-coin bonus rate.
    let coins = bonus ? 20 : challenge.cape ? CAPE_WEEK_CHALLENGE_COINS : COINS.dailyChallenge
    let streakNote = ''
    if (!bonus) {
      const newStreak = getDailyStreak(nextCompletions)
      if (newStreak >= 3 && newStreak % 3 === 0) {
        coins += COINS.streakBonus
        streakNote = ` ${newStreak}-day streak bonus! +${COINS.streakBonus} more. 🔥`
      }
    }

    // Base state with the challenge stamped + coins awarded.
    const baseState = {
      ...data,
      featherCoins: data.featherCoins + coins,
      dailyChallengeCompletions: nextCompletions,
    }

    // If she proved it with a photo, identify the bird and add it to her
    // collection in the SAME commit so nothing is lost.
    const match = photoFile ? await identifyTopMatch(photoFile) : null
    const finishWith = (photo) => {
      let nextState = baseState
      let birdNote = ''
      if (match) {
        nextState = addBirdToState(baseState, match, photo)
        birdNote = ` ${match.commonName} was added to your collection! 🐦`
      }
      setConfetti(Date.now())
      commit(nextState, {
        title: bonus ? 'Bonus mission complete' : 'Mission complete! 🐦',
        body: bonus
          ? 'The optional Bird Council side quest has been quietly stamped. +20 Feather Coins.'
          : `You found one! +${coins} Feather Coins.${streakNote}${birdNote}`,
      })
      notifyMarnich('challenge')
      if (match) notifyMarnich('spotted', { birdName: match.commonName })
    }

    if (match && photoFile) {
      readStorablePhoto(photoFile, (photo) => finishWith(photo))
    } else {
      finishWith('')
    }
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

  // One-time "Claim your Milkshake Date 🥤". Sets a localStorage flag so the
  // item disappears from the shop forever once claimed.
  function buyMilkshakeDate() {
    if (readOnly) return // writes a claim flag — never run on Pooks' mirror
    if (milkshakeClaimed(account)) return
    if (data.featherCoins < SHOP.milkshakeDate) return notEnoughCoins()
    try {
      localStorage.setItem(accountFlagKey(MILKSHAKE_CLAIMED_KEY, account), 'true')
    } catch {
      /* storage unavailable — the coin deduction below still records intent */
    }
    setConfetti(Date.now())
    setReveal({
      tone: 'date',
      title: 'Milkshake Date claimed 🥤',
      body: 'It’s a date! Marnich owes you one real milkshake date. 💛',
    })
    commit(
      { ...data, featherCoins: data.featherCoins - SHOP.milkshakeDate },
      { title: 'Milkshake Date claimed 🥤', body: 'A real milkshake date with Marnich 💛' },
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
  // Pooks' menu is intentionally bare: just "My Story" (replay intro) and Log
  // out, both rendered by SettingsMenu itself. The feature pages still exist —
  // they're only hidden from her menu for now. Admin still sees everything.
  // Magazine and Inbox now live in the bottom nav, so the gear menu only carries
  // the role-specific extras (Pooks: Bird Battles; Admin: full feature set).
  const fullMenu =
    session?.role === 'admin'
      ? [...menuItems, ['admin', 'Admin', '🔒']]
      : account === 'marnich'
        ? [['games', 'Bird Battles', '⚔️'], ['garden', 'Bird Garden', '🌳'], ['companiongallery', 'Companion Gallery', '🧪']]
        : [['games', 'Bird Battles', '⚔️']]
  const unreadMessages = (data.messages || []).filter((m) => !m.read).length

  if (!session) {
    if (adminGate) {
      return <AdminGate onLogin={adminLogin} onCancel={() => setAdminGate(false)} />
    }
    return <LoginScreen data={data} onLogin={login} />
  }

  // The very first time Pooks (or Marnich, in his own Test sandbox) opens the
  // app after login, play the one-time cinematic "evidence dossier" intro.
  // Stored per-account so it never shows again. The admin panel skips it.
  // Marnich's default "View Pooks 👀" mode is a read-only mirror and must go
  // straight to her live screen — the intro only belongs to his own sandbox, so
  // skip it whenever this is the read-only view.
  if (!readOnly && (session.role === 'pooks' || session.role === 'marnich') && !introSeen) {
    return (
      <IntroSequence
        onAccept={() => markIntroSeen(account)}
        onComplete={() => {
          markIntroSeen(account)
          setActivePage('home')
          setIntroSeen(true)
          // Persist into the synced state so other devices know she's not new.
          setData((current) => ({ ...current, introSeen: true }))
        }}
      />
    )
  }

  // No egg picker anymore: Tweety is the companion from the first login and
  // grows through her five stages via daily care.

  return (
    <div className={`app-shell has-bottom-nav season-${season.key}${activePage === 'home' ? ' on-home' : ''}`}>
      <div className="season-wash" aria-hidden="true" />
      <SeasonalAmbient />
      <Toast toast={toast} />
      <InstallPrompt />
      {adminGate && session.role !== 'admin' && (
        <AdminGate onLogin={adminLogin} onCancel={() => setAdminGate(false)} overlay />
      )}
      {confetti ? <Confetti seed={confetti} /> : null}
      {session.role === 'marnich' && (
        <div className="marnich-mode-bar">
          <button
            className={`marnich-mode-tab${marnichMode === 'view' ? ' active' : ''}`}
            type="button"
            onClick={() => setMarnichViewMode('view')}
          >
            👀 View Pooks
          </button>
          <button
            className={`marnich-mode-tab${marnichMode === 'sandbox' ? ' active' : ''}`}
            type="button"
            onClick={() => setMarnichViewMode('sandbox')}
          >
            🧪 Test sandbox
          </button>
        </div>
      )}
      {session.role === 'marnich' && marnichMode === 'sandbox' && (
        <div className="sandbox-tools">
          <button
            className="marnich-ff-btn"
            type="button"
            onClick={fastForwardDay}
            title="Advance your test sandbox by one day"
          >
            ⏩ Fast Forward
          </button>
          <button
            className="marnich-ff-btn sandbox-garden-btn"
            type="button"
            onClick={() => setActivePage('garden')}
            title="Open the sandbox Bird Garden"
          >
            🌳 Bird Garden
          </button>
          <button
            className="marnich-ff-btn sandbox-coins-btn"
            type="button"
            onClick={addSandboxCoins}
            title="Add 10,000 coins to your test sandbox"
          >
            🪙 Add 10,000 coins
          </button>
        </div>
      )}
      <RewardUnlockModal
        reward={activeRewardUnlock}
        markRewardPaid={markRewardPaid}
        isAdmin={session.role === 'admin'}
        onClose={() => setRewardUnlockQueue((current) => current.slice(1))}
      />
      <RevealModal reveal={reveal} onClose={() => setReveal(null)} />
      <EncounterModal encounter={encounter} onResolve={resolveEncounter} />

      <header className="app-header">
        <div className="brand-wrap">
          {activePage !== 'home' && (
            <button
              className="nav-back-btn"
              type="button"
              onClick={goBack}
              aria-label="Back to previous page"
            >
              ← Back
            </button>
          )}
          <button
            className="brand-pill"
            type="button"
            onClick={handleBrandTap}
            title="Back to Home"
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
          onReplayIntro={
            session.role === 'pooks' || session.role === 'marnich' ? replayIntro : null
          }
        />
      )}

      <main className="page-wrap page-stage" key={activePage}>
        {activePage === 'home' && (
          <HomePage
            data={data}
            stats={stats}
            dailyChallenge={dailyChallenge}
            completeDailyChallenge={completeDailyChallenge}
            goTo={setActivePage}
            openBirdProfile={openBirdProfile}
            season={season}
            tweetyView={tweetyView}
            tweetyDancing={tweetyDancing}
            missedYou={missedYou}
            careTweety={careTweety}
            releaseAviaryBird={releaseAviaryBird}
            tapWorldEvent={tapWorldEvent}
            resolveWorldEvent={resolveWorldEvent}
          />
        )}
        {activePage === 'companiongallery' && account === 'marnich' && (
          <CompanionGalleryPage onBack={goBack} />
        )}
        {activePage === 'garden' && account === 'marnich' && (
          <GardenPage
            garden={data.garden}
            coins={data.featherCoins}
            onPlace={placeGardenItem}
            onWater={waterGardenPlant}
            onBack={goBack}
          />
        )}
        {activePage === 'sanctuary' && (
          <SanctuaryPage
            tweety={data.tweety}
            isAdmin={session.role === 'admin'}
            onBack={goBack}
            onLeaveNote={leaveSanctuaryNote}
          />
        )}
        {activePage === 'birdroom' && (
          <BirdRoomPage
            tweety={data.tweety}
            season={season}
            coins={data.featherCoins}
            isAdmin={session.role === 'admin'}
            onBack={goBack}
            onBuy={(item) => buyRoomFurniture(item)}
            onInteract={roomInteract}
          />
        )}
        {activePage === 'tweety' && (
          <TweetyStatsPage
            tweety={data.tweety}
            birdCount={data.birds.length}
            onBack={goBack}
            onRename={renameTweety}
          />
        )}
        {activePage === 'wardrobe' && (
          <WardrobePage
            tweety={data.tweety}
            isAdmin={session.role === 'admin'}
            onBack={goBack}
            onWear={wearWearable}
            onToggleWishlist={toggleWishlistItem}
            goToMarket={() => setActivePage('rewards')}
          />
        )}
        {activePage === 'games' && (
          <GamesHub
            data={data}
            who={account === 'marnich' ? 'marnich' : 'pooks'}
            onGameDone={onGameDone}
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
        {activePage === 'explore' && (
          <ExploreBirdsPage data={data} openBirdProfile={openBirdProfile} />
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
            account={account}
            buyMysteryBox={buyMysteryBox}
            buyHiddenNote={buyHiddenNote}
            buyDateIdea={buyDateIdea}
            buyMilkshakeDate={buyMilkshakeDate}
            buyFeaturedBirdProfile={buyFeaturedBirdProfile}
            buyWearable={buyWearable}
            giftWearable={giftWearable}
            toggleWishlistItem={toggleWishlistItem}
            setMarnichPick={setMarnichPick}
            markMarketSeen={markMarketSeen}
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
          <WeeklyMagazinePage
            data={data}
            openBirdProfile={openBirdProfile}
            claimWeeklyQuiz={claimWeeklyQuiz}
          />
        )}
        {activePage === 'messages' && (
          <InboxPage
            messages={data.messages}
            onRead={markMessageRead}
            onToggleFavourite={toggleMessageFavourite}
            onReact={reactToMessage}
          />
        )}
        {activePage === 'birdmap' && (
          <BirdMapPage data={data} onBack={goBack} />
        )}
        {activePage === 'profile' && (
          <ProfilePage
            data={data}
            stats={stats}
            goTo={setActivePage}
            onReplayIntro={
            session.role === 'pooks' || session.role === 'marnich' ? replayIntro : null
          }
          />
        )}
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
            sendFlockTreat={sendFlockTreat}
            skipTweetyDay={adminSkipTweetyDay}
            advanceTweetyStage={adminAdvanceTweetyStage}
            addDiscoveryToLibrary={addDiscoveryToLibrary}
            triggerWorldEvent={triggerWorldEvent}
            triggerEscape={triggerEscape}
            giftRoomFurniture={(item) => buyRoomFurniture(item, { free: true })}
            buyStoreItem={buyStoreItem}
            onGameDone={onGameDone}
            setTrashTalk={setTrashTalk}
            resetData={resetData}
            previewMarlieView={() => setActivePage('home')}
            previewMagazineIssue={() => setActivePage('magazine')}
            sandbox={sandbox}
            onSendMessage={sendMarnichInboxMessage}
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
            <span className="bottom-tab-icon" aria-hidden="true">
              {icon}
              {id === 'messages' && unreadMessages > 0 && (
                <span className="nav-unread-dot" aria-label={`${unreadMessages} unread`} />
              )}
            </span>
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
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await onLogin(secret)
    setBusy(false)
    if (!ok) {
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
          <button className="primary-btn wide big-btn" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Enter control room'}
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
  const [busy, setBusy] = useState(false)
  const season = getSeasonInfo()

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await onLogin(name, secret)
    setBusy(false)
    if (!ok) {
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
          <button className="primary-btn wide big-btn" type="submit" disabled={busy}>
            {busy ? 'Opening…' : 'Open my bird world 🪶'}
          </button>
        </form>
        {!data.settings.pooksSecret && (
          <p className="login-hint">Ask Marnich to set your secret word.</p>
        )}
      </section>
    </main>
  )
}

function SettingsMenu({ items, session, onPick, onLogout, onClose, onReplayIntro }) {
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
        {items.length > 0 && (
          <div className="menu-list">
            {items.map(([id, label, icon]) => (
              <button key={id} className="menu-item" type="button" onClick={() => onPick(id)}>
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
        {onReplayIntro && (
          <div className="menu-story">
            <p className="eyebrow">My Story</p>
            <button className="story-replay-btn" type="button" onClick={onReplayIntro}>
              <span aria-hidden="true">🎬</span>
              Replay my Bird Council dossier
            </button>
          </div>
        )}
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

// A quick, cute wildlife encounter: one tap shoos the critter and keeps Tweety
// safe. Always resolves positively — never scary, never a loss.
function EncounterModal({ encounter, onResolve }) {
  const [resolved, setResolved] = useState(false)
  if (!encounter) return null
  return (
    <div className="reward-modal-backdrop encounter-backdrop" role="presentation">
      <article
        className="reveal-card encounter-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="encounter-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`encounter-emoji${resolved ? ' safe' : ''}`} aria-hidden="true">
          {resolved ? '💛' : encounter.emoji}
        </div>
        {resolved ? (
          <>
            <h2 id="encounter-title">{encounter.done}</h2>
            <p className="encounter-reward">+{ENCOUNTER_REWARD} Feather Coins 🪙</p>
            <button className="primary-btn wide big-btn" type="button" onClick={onResolve}>
              Yay! 🐦
            </button>
          </>
        ) : (
          <>
            <h2 id="encounter-title">{encounter.title}</h2>
            <p>Quick — keep Tweety safe!</p>
            <button
              className="primary-btn wide big-btn"
              type="button"
              onClick={() => setResolved(true)}
            >
              {encounter.action}
            </button>
          </>
        )}
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
    // Cape Town Special Week challenges never block her: the suggested bird is
    // only a hint, so ANY photographed or written sighting counts — we skip the
    // strict species check and accept her effort outright.
    const result = challenge?.cape
      ? { verdict: 'yes', reason: 'The Bird Council accepts your Cape Town sighting. 🪶', offline: false }
      : await validateChallenge({
          challengeText: challenge?.text || '',
          description,
          photoFile,
        })
    setVerdict(result)
    if (result.verdict === 'yes') {
      setStatus('yes')
      // Pass the photo up so a photographed bird can be added to the collection.
      onValidated(photoFile)
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

// One-off countdown to Pooks' Friday 19 June 2026 trip to see Marnich ("Roetsie"
// is her nickname for him). Returns whole days until that date (0 on the day,
// negative once it has passed). After 19 June this goes negative forever and the
// card simply stops rendering — no cleanup needed.
const MARNICH_VISIT_DATE = new Date(2026, 5, 19) // 19 June 2026, local midnight
function daysUntilMarnichVisit(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round((MARNICH_VISIT_DATE - today) / MS_PER_DAY)
}

function HomePage({
  data,
  dailyChallenge,
  completeDailyChallenge,
  goTo,
  openBirdProfile,
  season,
  tweetyView,
  tweetyDancing,
  missedYou,
  careTweety,
  releaseAviaryBird,
  tapWorldEvent,
  resolveWorldEvent,
}) {
  const [showMissionMsg, setShowMissionMsg] = useState(false)
  const [showWorld, setShowWorld] = useState(false)
  const seenLibraryCount = data.birdLibrary.filter((bird) => bird.seen).length
  const collectionProgress = data.birdLibrary.length
    ? Math.round((seenLibraryCount / data.birdLibrary.length) * 100)
    : 0
  const done = dailyChallenge.mainComplete
  // The home streak reflects her real daily ritual — looking after Tweety —
  // rather than the photo-mission completions (which she may skip on a given
  // day). Caring for Tweety every day is her genuine consistent engagement, so
  // this is the streak that should be celebrated front-and-centre.
  const careStreak = tweetyStreak(data.tweety)

  return (
    <div className={`home-stack home-mood-${tweetyView.mood}`}>
      <div className="home-topline">
        <span className="streak-chip">Day {careStreak} care streak 🔥</span>
        <span className="coin-chip">{data.featherCoins} 🪙</span>
      </div>

      {(() => {
        const days = daysUntilMarnichVisit()
        if (days < 0) return null
        const label =
          days === 0
            ? 'Today you see Roetsie! 🏠'
            : `${days} ${days === 1 ? 'day' : 'days'} until you see Roetsie! 🏠`
        return (
          <section className="visit-countdown">
            <span className="visit-countdown-emoji" aria-hidden="true">🏠💛</span>
            <p className="visit-countdown-text">{label}</p>
          </section>
        )
      })()}

      <section className="season-greeting">
        <h2>{season.greeting}</h2>
        <p>{season.blurb}</p>
      </section>

      <BirdsNearYouCard library={data.birdLibrary} openBirdProfile={openBirdProfile} />

      {missedYou && data.tweety?.companion && (
        <button className="tweety-nudge" type="button" onClick={() => goTo('tweety')}>
          <span className="tweety-nudge-bird" aria-hidden="true">🐤💛</span>
          <span>
            <strong>{data.tweety?.name || 'Tweety'} missed you!</strong>
            <small>It&apos;s been a while — pop in to feed, water and play.</small>
          </span>
        </button>
      )}

      {(
        <>
          <TweetyHomeCard
            tweety={data.tweety}
            dancing={tweetyDancing}
            nestTier={tweetyView.nestTier}
            rainbow={tweetyView.rainbow}
            loveLetter={tweetyView.loveLetter}
            onFeed={() => careTweety('feed')}
            onWater={() => careTweety('water')}
            onPlay={() => careTweety('play')}
            onOpenStats={() => goTo('tweety')}
          />

          {/* On mobile these three cards are hidden to keep the home screen
              above the fold; this link reveals them. On desktop the link is
              hidden and the cards show inline as usual. */}
          <button
            type="button"
            className="home-world-link"
            onClick={() => setShowWorld((value) => !value)}
          >
            🌍 {showWorld ? 'Hide Tweety’s World' : 'Tweety’s World'} →
          </button>

          <div className={`home-world-extras${showWorld ? ' open' : ''}`}>
            <TweetyWorldCard
              tweety={data.tweety}
              event={data.tweety?.worldEvent}
              onEventTap={tapWorldEvent}
              onEventResolve={() => resolveWorldEvent(true)}
              onOpenRoom={() => goTo('birdroom')}
              onOpenSanctuary={() => goTo('sanctuary')}
              hideLinks
            />

            <AviaryCard
              tweety={data.tweety}
              aviaryTier={data.store?.aviaryTier || 'basic'}
              flockDance={Boolean(data.tweety?.flockTreat)}
              onReleaseAviary={releaseAviaryBird}
            />
          </div>
        </>
      )}

      <section className={`mission-card${done ? ' done' : ''}`}>
        <p className="mission-eyebrow">Today&apos;s Mission 🐦</p>
        <h2 className="mission-text">
          {dailyChallenge.main?.text || 'Find one tiny bird moment today'}
        </h2>
        {data.settings.marnichDailyMessage && (
          <div className="mission-message-wrap">
            <p className={`mission-message${showMissionMsg ? ' expanded' : ''}`}>
              {data.settings.marnichDailyMessage}
            </p>
            <button
              type="button"
              className="mission-readmore"
              onClick={() => setShowMissionMsg((value) => !value)}
            >
              {showMissionMsg ? 'Hide note' : 'Read note from Marnich ›'}
            </button>
          </div>
        )}
        <ChallengeProof
          challenge={dailyChallenge.main}
          complete={done}
          onValidated={(photoFile) => completeDailyChallenge('daily', photoFile)}
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

// A real bird photo with a graceful fall-back to soft initials when the library
// has no usable image (placehold.co URLs and broken links both count as "none").
function FieldGuidePhoto({ bird, className = '' }) {
  const [errored, setErrored] = useState(false)
  const usable = bird.imageUrl && !bird.imageUrl.includes('placehold')
  if (errored || !usable) {
    return (
      <div className={`field-guide-photo placeholder-photo ${className}`.trim()} aria-hidden="true">
        <span>{getBirdPhotoPlaceholderLabel(bird.commonName)}</span>
      </div>
    )
  }
  return (
    <img
      className={`field-guide-photo ${className}`.trim()}
      src={bird.imageUrl}
      alt={bird.commonName}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}

// A tiny Jan→Dec presence chart: twelve little bars, the current month gently
// highlighted, so she can see at a glance when a bird is around.
function MonthlyActivityBar({ bird }) {
  const months = monthlyActivity(bird)
  const current = new Date().getMonth()
  return (
    <div className="month-bar" role="img" aria-label="Activity through the year, January to December">
      {months.map((value, index) => (
        <span
          key={MONTHS[index]}
          className={`month-cell${index === current ? ' now' : ''}`}
          title={`${MONTHS[index]}: ${value >= 0.9 ? 'very active' : value >= 0.5 ? 'around' : 'scarce'}`}
        >
          <span className="month-fill" style={{ height: `${Math.max(8, Math.round(value * 100))}%` }} />
          <small>{MONTHS[index][0]}</small>
        </span>
      ))}
    </div>
  )
}

// Home-screen card: a daily-rotating little watch-list of birds likely near
// Potchefstroom, so there's always something new to look for. Tap one to read
// its profile.
function BirdsNearYouCard({ library, openBirdProfile }) {
  const birds = useMemo(() => birdsNearPotchThisWeek(library, new Date(), 7), [library])
  if (!birds.length) return null
  return (
    <section className="soft-card near-you-card">
      <div className="near-you-head">
        <p className="eyebrow">Out there right now</p>
        <h3>Birds likely near Potchefstroom today 🐦</h3>
        <p className="near-you-sub">A fresh little watch-list every day — tap one to read about it.</p>
      </div>
      <div className="near-you-scroll">
        {birds.map((bird) => (
          <button
            key={bird.id}
            type="button"
            className="near-you-bird"
            onClick={() => openBirdProfile({ source: 'library', id: bird.id })}
          >
            <FieldGuidePhoto bird={bird} className="near-you-photo" />
            <span className="near-you-name">{bird.commonName}</span>
            {bird.afrikaansName && <span className="near-you-afr">{bird.afrikaansName}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}

// One card in the Explore field guide: photo, names, monthly activity, habitat
// and region. Purely for browsing — no coins, no game mechanics.
function ExploreBirdCard({ bird, onOpen }) {
  return (
    <article className="explore-card tappable" onClick={onOpen}>
      <div className="explore-card-photo-frame">
        <FieldGuidePhoto bird={bird} className="explore-card-photo" />
        {bird.category && <span className="explore-card-tag">{bird.category}</span>}
      </div>
      <div className="explore-card-body">
        <h3>{bird.commonName}</h3>
        {bird.afrikaansName && <p className="explore-afrikaans">{bird.afrikaansName}</p>}
        <p className="explore-thought">{locationThought(bird)}</p>
        <div className="explore-months">
          <span className="explore-months-label">When you&apos;ll see it</span>
          <MonthlyActivityBar bird={bird} />
        </div>
        <dl className="explore-meta">
          <div>
            <dt>Habitat</dt>
            <dd>{bird.habitat || bird.region || '—'}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{bird.whereFoundInSouthAfrica || bird.region || '—'}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

// A beautiful, browsable field guide to every bird in the library. Separate from
// the game collection: no coins, no "caught" — just reading and learning.
function ExploreBirdsPage({ data, openBirdProfile }) {
  const [search, setSearch] = useState('')
  const [filterId, setFilterId] = useState('all')
  const filter = EXPLORE_FILTERS.find((f) => f.id === filterId) || EXPLORE_FILTERS[0]
  const searchKey = search.trim().toLowerCase()
  const birds = data.birdLibrary
    .filter((bird) => filter.test(bird))
    .filter((bird) => !searchKey || getBirdSearchText(bird).includes(searchKey))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  return (
    <div className="page-grid explore-page">
      <section className="soft-card full-span explore-hero">
        <p className="eyebrow">A field guide for quiet evenings</p>
        <h2>Explore Birds 🔍</h2>
        <p className="explore-hero-sub">
          South Africa is full of remarkable birds. Here are some worth knowing. 🐦
        </p>
      </section>

      <section className="soft-card full-span explore-controls">
        <label className="explore-search">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            aria-label="Search birds by name"
          />
        </label>
        <div className="filter-row" aria-label="Field guide filters">
          {EXPLORE_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={filterId === option.id ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setFilterId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="explore-count">
          {birds.length} bird{birds.length === 1 ? '' : 's'}
        </p>
      </section>

      <section className="full-span explore-grid" aria-live="polite">
        {birds.length === 0 && <EmptyState text="No birds match that search yet." />}
        {birds.map((bird) => (
          <ExploreBirdCard
            key={bird.id}
            bird={bird}
            onOpen={() => openBirdProfile({ source: 'library', id: bird.id })}
          />
        ))}
      </section>
    </div>
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
      setLoadingIndex((current) => nextLoadingIndex(current))
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

    // Store a downscaled copy so the sighting always fits in localStorage.
    readStorablePhoto(file, (photo) => updateField('photo', photo))
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

    // Start each identification on a fresh random Council message.
    setLoadingIndex(Math.floor(Math.random() * loadingMessages.length))
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
            <>
            <div className="spot-actions">
              <label className="spot-action-btn">
                <input
                  key={`cam-${photoInputKey}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  hidden
                />
                <span className="spot-action-emoji" aria-hidden="true">📷</span>
                <span>Take a photo</span>
              </label>
              <label className="spot-action-btn">
                <input
                  key={`gal-${photoInputKey}`}
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  hidden
                />
                <span className="spot-action-emoji" aria-hidden="true">🖼️</span>
                <span>Choose from gallery</span>
              </label>
            </div>
            <p className="spot-sub">Take a fresh photo or pick one of your best bird photos from your gallery 💛</p>
            </>
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
                placeholder="e.g. Potchefstroom garden, Kruger near Skukuza"
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
                  placeholder="e.g. Potchefstroom garden, Kruger near Skukuza"
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
                <div className="bird-card-photo placeholder-photo no-photo-yet">
                  <span className="no-photo-icon" aria-hidden="true">📷</span>
                  <span className="no-photo-label">No photo yet</span>
                </div>
              )}
              <div className="bird-card-body">
                <p className="eyebrow">Polaroid memory</p>
                <h3>{bird.birdName}</h3>
                {!bird.photo && (
                  <p className="add-photo-banner">Add a photo next time you spot this bird 📸</p>
                )}
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

// Aspirational Pokédex-style goal: collect every bird in the library. The total
// is the live library size, so it always reflects the real catalog as it grows.

function SaBirdLibraryPage({ data, openBirdProfile, goToSpot }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const seenCount = data.birdLibrary.filter((bird) => bird.seen).length
  const totalBirds = data.birdLibrary.length
  const searchKey = searchTerm.trim().toLowerCase()
  const filteredBirds = data.birdLibrary
    .filter((bird) => libraryBirdMatchesFilter(bird, activeFilter))
    .filter((bird) => !searchKey || getBirdSearchText(bird).includes(searchKey))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
  const progressValue = totalBirds ? Math.min(100, Math.round((seenCount / totalBirds) * 100)) : 0

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
        <h2 className="discovered-count">{seenCount} / {totalBirds} birds found 🐦</h2>
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

// A soft illustrated bird shape — the final fallback so a mystery card never
// shows a blank "?".
function BirdSilhouetteSVG() {
  return (
    <div className="bird-card-photo-frame mystery-frame">
      <svg className="silhouette-svg" viewBox="0 0 100 100" aria-hidden="true">
        <g fill="#7a6f60">
          {/* tail */}
          <path d="M14 60 q-8 -2 -10 4 q8 1 14 4 z" />
          {/* body */}
          <ellipse cx="50" cy="60" rx="26" ry="22" />
          {/* head */}
          <circle cx="70" cy="42" r="13" />
          {/* beak */}
          <path d="M82 40 l11 3 l-11 4 z" />
          {/* wing */}
          <ellipse cx="46" cy="60" rx="13" ry="16" fill="#6c6254" />
          {/* legs */}
          <path d="M46 82 v8 M40 90 h12 M58 82 v8 M52 90 h12" stroke="#7a6f60" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  )
}

// Mystery silhouette: library photo → live Wikipedia photo → soft bird SVG.
function MysterySilhouette({ bird }) {
  const [imgError, setImgError] = useState(false)
  const hasLibPhoto = bird.imageUrl && !bird.imageUrl.includes('placehold')
  // Only hit Wikipedia when there's no usable library photo.
  const { photos } = useWikipediaPhotos(
    hasLibPhoto ? '' : bird.scientificName,
    hasLibPhoto ? '' : bird.commonName,
  )
  const src = imgError ? '' : hasLibPhoto ? bird.imageUrl : photos[0]?.src || ''

  if (!src) {
    return <BirdSilhouetteSVG />
  }
  return (
    <div className="bird-card-photo-frame mystery-frame">
      <img
        className="bird-card-photo silhouette-shape"
        src={src}
        alt="Mystery bird silhouette"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

function LibraryCard({ bird, marnichSpecies, openBirdProfile, goToSpot }) {
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

  // Mystery card: a darkened silhouette + ??? + one cryptic clue + go-spot button.
  // Every bird shows a silhouette — library photo, else a live Wikipedia photo,
  // else a soft illustrated bird shape. Never a plain "?".
  return (
    <article className="library-bird-card mystery-card">
      <MysterySilhouette bird={bird} />
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
    readStorablePhoto(
      file,
      (photo) => {
        saveFieldGuideNotes(profileKey, {
          myPhotos: [...myPhotos, { id: createId('myphoto'), photo }],
        })
      },
      { maxDim: 900 },
    )
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
  account = 'pooks',
  buyMysteryBox,
  buyHiddenNote,
  buyDateIdea,
  buyMilkshakeDate,
  buyFeaturedBirdProfile,
}) {
  const isMarnich = account === 'marnich'
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
    // One-time milkshake date — only while it hasn't been claimed yet.
    ...(milkshakeClaimed(account)
      ? []
      : [{ id: 'milkshakeDate', name: 'Claim your Milkshake Date 🥤', emoji: '🥤', cost: SHOP.milkshakeDate, action: buyMilkshakeDate, hint: 'A real milkshake date with Marnich' }]),
    { id: 'mysteryBox', name: 'Mystery gift box', emoji: '🎁', cost: SHOP.mysteryBox, action: buyMysteryBox, hint: 'A surprise from Marnich' },
    { id: 'hiddenNote', name: 'Hidden note', emoji: '💌', cost: SHOP.hiddenNote, action: buyHiddenNote, hint: 'A folded love note' },
    { id: 'birdProfile', name: 'Rare bird unlock', emoji: '✨', cost: SHOP.birdProfile, action: buyFeaturedBirdProfile, hint: 'Reveal a rare bird profile' },
    { id: 'dateIdea', name: 'Date idea', emoji: '💕', cost: SHOP.dateIdea, action: buyDateIdea, hint: 'A real date plan from Marnich' },
  ]
  // Pooks' Gifts page hides EVERY shop item for now (all items kept in code but
  // hidden via this empty allowlist) so the core experience stays simple while
  // Marnich gets it right. He adds gifts back manually through Admin when ready.
  // Marnich's own test account still sees every item and gift section so he can
  // verify the full purchase → reveal → claim flow before any of it goes live.
  const visibleShopIds = isMarnich
    ? ['milkshakeDate', 'mysteryBox', 'hiddenNote', 'birdProfile', 'dateIdea']
    : []
  const visibleShopItems = shopItems.filter((item) => visibleShopIds.includes(item.id))
  const showOtherGiftSections = isMarnich

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

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coin shop</p>
            <h2>Spend your coins</h2>
          </div>
        </div>
        <div className="shop-grid">
          {visibleShopItems.length === 0 ? (
            <EmptyState text="New surprises coming soon 🪶" />
          ) : (
            visibleShopItems.map((item) => (
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
            ))
          )}
        </div>
      </section>

      {showOtherGiftSections && (
        <>
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
          onValidated={(photoFile) => completeDailyChallenge('daily', photoFile)}
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
          onValidated={(photoFile) => completeDailyChallenge('bonus', photoFile)}
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
    readStorablePhoto(file, (photo) => setPhoto(photo), { maxDim: 900 })
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

function WeeklyQuiz({ quiz, week, claimedWeek, onClaim }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [justAwarded, setJustAwarded] = useState(false)
  const alreadyClaimed = claimedWeek === week
  const allAnswered = quiz.length > 0 && Object.keys(answers).length >= quiz.length
  const score = quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)

  function choose(qi, oi) {
    if (submitted) return
    setAnswers((a) => ({ ...a, [qi]: oi }))
  }
  function submit() {
    if (!allAnswered) return
    setSubmitted(true)
    if (!alreadyClaimed) {
      onClaim(week)
      setJustAwarded(true)
    }
  }
  function retake() {
    setAnswers({})
    setSubmitted(false)
  }

  const verdict =
    score === 5
      ? 'A perfect score — the Bird Council is in awe! 🏆'
      : score === 4
        ? 'The Bird Council is impressed!'
        : score === 3
          ? 'Solidly done — the Council nods approvingly. 🐦'
          : score >= 1
            ? 'A few to revisit — back to the field, agent! 💛'
            : 'Tricky week! Flip back and study the featured birds. 📖'

  if (!quiz.length) {
    return (
      <div className="magazine-quiz-page" key="quiz">
        <p className="eyebrow">Weekly Bird Quiz 🧠</p>
        <p>This week’s quiz is warming up — check back soon. 🐦</p>
      </div>
    )
  }

  return (
    <div className="magazine-quiz-page" key="quiz">
      <p className="eyebrow">Weekly Bird Quiz 🧠</p>
      <h2>Test yourself on this week’s birds</h2>
      <p className="fine-print">5 questions · no timer · 25 Feather Coins for finishing (once a week).</p>
      <ol className="weekly-quiz-list">
        {quiz.map((q, qi) => (
          <li key={qi} className="weekly-quiz-item">
            <p className="weekly-quiz-q">{q.q}</p>
            <div className="weekly-quiz-options">
              {q.options.map((opt, oi) => {
                const picked = answers[qi] === oi
                const reveal = submitted
                const state = reveal
                  ? oi === q.answer
                    ? ' correct'
                    : picked
                      ? ' wrong'
                      : ''
                  : picked
                    ? ' picked'
                    : ''
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`weekly-quiz-option${state}`}
                    onClick={() => choose(qi, oi)}
                    disabled={submitted}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ol>

      {!submitted ? (
        <button className="primary-btn wide big-btn" type="button" disabled={!allAnswered} onClick={submit}>
          {allAnswered ? 'See my score 🐦' : 'Answer all 5 to finish'}
        </button>
      ) : (
        <div className="weekly-quiz-result">
          <h3>You scored {score}/5 — {verdict}</h3>
          {justAwarded ? (
            <p className="weekly-quiz-coins">+25 Feather Coins added 🪙</p>
          ) : alreadyClaimed ? (
            <p className="fine-print">You already earned this week’s 25 coins 💛 (retakes are just for fun).</p>
          ) : null}
          <button className="secondary-btn wide" type="button" onClick={retake}>
            Try again 🔁
          </button>
        </div>
      )}
    </div>
  )
}

function WeeklyMagazinePage({ data, openBirdProfile, claimWeeklyQuiz }) {
  const issue = getWeeklyMagazineIssue(data.birdLibrary, data.settings)
  const season = getSeasonInfo()
  const weekIndex = getAbsoluteWeekIndex()
  const quote = getWeeklyQuote(weekIndex)
  const coverBird = issue.birdOfWeek
  // The featured bird is deliberately different from the cover bird.
  const featuredBird =
    issue.featuredBirds.find((bird) => bird.id !== coverBird?.id) || issue.featuredBirds[1] || null
  const recap = getWeeklyRecap(data)
  const weeklyQuiz = useMemo(
    () => buildWeeklyQuiz(issue, data.birdLibrary),
    // issue is rebuilt each render; week + library are what actually matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issue.week, data.birdLibrary],
  )
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
      <p className="magazine-issue-no">The Feather</p>
      <p className="magazine-season">Issue #{issue.issueIndex} — {season.name} Edition</p>
      <p className="fine-print">A fresh flock every 3 days · {season.greeting}</p>
      <p className="magazine-countdown">🗞️ Next issue in {issue.countdown.text}</p>
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

  // Page 5 — Weekly Bird Quiz.
  pages.push(
    <WeeklyQuiz
      key="quiz"
      quiz={weeklyQuiz}
      week={issue.week}
      claimedWeek={data.weeklyQuizClaimedWeek}
      onClaim={claimWeeklyQuiz}
    />,
  )

  // Page 6 — inside this issue gallery.
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

function ProfilePage({ data, stats, goTo, onReplayIntro }) {
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
          <button className="secondary-btn" type="button" onClick={() => goTo('messages')}>
            Open inbox 📬
          </button>
          <button className="secondary-btn" type="button" onClick={() => goTo('birdmap')}>
            My Bird Map 🗺️
          </button>
        </div>
      </section>

      {onReplayIntro && (
        <section className="soft-card full-span story-card">
          <p className="eyebrow">My Story</p>
          <h2>Your Bird Council dossier</h2>
          <p>The day the Council made it official. Watch it again whenever you like. 🪶</p>
          <button className="story-replay-btn" type="button" onClick={onReplayIntro}>
            <span aria-hidden="true">🎬</span>
            Replay my Bird Council dossier
          </button>
        </section>
      )}
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
  sendFlockTreat,
  skipTweetyDay,
  advanceTweetyStage,
  addDiscoveryToLibrary,
  triggerWorldEvent,
  triggerEscape,
  giftRoomFurniture,
  buyStoreItem,
  onGameDone,
  setTrashTalk,
  resetData,
  previewMarlieView,
  previewMagazineIssue,
  sandbox,
  onSendMessage,
  setData,
}) {
  const [surpriseNote, setSurpriseNote] = useState('')
  const [inboxDraft, setInboxDraft] = useState({ title: '', body: '' })
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

      <section className="soft-card full-span admin-sandbox">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Test &amp; Preview 🧪</p>
            <h2>Sandbox — try everything safely</h2>
          </div>
        </div>
        <p className="fine-print">
          Every button here plays with fake demo data only. None of it ever changes
          Pooks&apos; real progress, coins or pet. 💛
        </p>
        <div className="sandbox-grid">
          <button className="secondary-btn" type="button" onClick={sandbox.previewAsPooks}>
            👀 Preview as Pooks
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.eggHatch}>
            🐣 Trigger egg hatching
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.discovery}>
            ✨ Trigger bird discovery
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.milestone}>
            🎁 Trigger milestone reward
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.tweetyGrowth}>
            🐤 Trigger Tweety growth
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.hiddenNote}>
            💌 Test hidden note unlock
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.dateIdea}>
            💕 Test date idea unlock
          </button>
          <button className="secondary-btn" type="button" onClick={sandbox.birdSnap}>
            🎮 Test Bird Snap game
          </button>
          <button className="ghost-btn" type="button" onClick={sandbox.reset}>
            ♻️ Reset all test data
          </button>
        </div>

        <div className="section-heading admin-subheading">
          <div>
            <p className="eyebrow">Tweety time-skip ⏩</p>
            <h3>Fast-forward the real pet</h3>
          </div>
        </div>
        <p className="fine-print">
          Unlike the buttons above, these <strong>do</strong> change Pooks&apos; real Tweety —
          handy for checking growth, eggs and hatching without waiting real days.
        </p>
        <div className="sandbox-grid">
          <button className="secondary-btn" type="button" onClick={skipTweetyDay}>
            ⏩ Skip Tweety forward 1 day
          </button>
          <button className="secondary-btn" type="button" onClick={advanceTweetyStage}>
            🌱 Advance Tweety to next growth stage
          </button>
        </div>
      </section>

      <section className="soft-card full-span admin-inbox-sender">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Send Pooks a message 💛</p>
            <h2>Drop a note in her inbox</h2>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!inboxDraft.body.trim()) return
            onSendMessage(inboxDraft.body, inboxDraft.title)
            setInboxDraft({ title: '', body: '' })
          }}
        >
          <label>
            Title (optional)
            <input
              value={inboxDraft.title}
              onChange={(event) => setInboxDraft((d) => ({ ...d, title: event.target.value }))}
              placeholder="A note just for you"
            />
          </label>
          <label>
            Message
            <textarea
              value={inboxDraft.body}
              onChange={(event) => setInboxDraft((d) => ({ ...d, body: event.target.value }))}
              placeholder="Write something that will make her smile…"
            />
          </label>
          <button className="primary-btn submit-btn" type="submit" disabled={!inboxDraft.body.trim()}>
            Send to her inbox 📬
          </button>
        </form>
        {(() => {
          const reactions = (data.messages || []).filter((m) => m.type === 'marnich' && m.reaction)
          if (!reactions.length) return null
          return (
            <div className="admin-reactions">
              <p className="eyebrow">Her reactions to your messages</p>
              <ul className="admin-reaction-list">
                {reactions.slice(0, 6).map((m) => (
                  <li key={m.id}>
                    <span className="admin-reaction-emoji">{m.reaction}</span>
                    <span className="admin-reaction-text">{m.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}
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
        <GamesHub data={data} who="marnich" onGameDone={onGameDone} />
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
          <button className="secondary-btn" type="button" onClick={sendFlockTreat}>
            Treat for the flock 🎉
          </button>
        </div>
      </section>

      <details className="soft-card full-span">
        <summary>Tweety World — trigger a surprise 🌍</summary>
        <p className="fine-print">Drop a story event, send a bird on an adventure, or gift a room decoration.</p>
        <div className="admin-actions">
          <button className="danger-btn" type="button" onClick={() => triggerEscape()}>
            Trigger an escape 🐦💨
          </button>
        </div>
        <p className="eyebrow">Story events</p>
        <div className="admin-actions">
          {WORLD_EVENTS.map((ev) => (
            <button
              className="secondary-btn"
              type="button"
              key={ev.id}
              onClick={() => triggerWorldEvent(ev.id)}
            >
              {ev.emoji} {ev.title}
            </button>
          ))}
        </div>
        <p className="eyebrow">Gift a room decoration</p>
        <div className="admin-actions">
          {ROOM_FURNITURE.filter((f) => f.cost > 0).map((item) => (
            <button
              className="secondary-btn"
              type="button"
              key={item.id}
              onClick={() => giftRoomFurniture(item)}
            >
              {item.emoji} {item.name}
            </button>
          ))}
        </div>
      </details>

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
