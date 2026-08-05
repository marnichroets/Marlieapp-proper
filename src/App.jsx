import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './features.css'
import { defaultBirdLibrary } from './data/saBirdLibrary'
import { dedupePhotosForStorage, rehydratePhotos, stripPhotosForLocalStorage } from './photoPool'
import { normalizeBirdName, canonicalSpeciesKey } from './speciesMatch'
import { mergeBirdLibrary, slimBirdLibrary } from './birdLibraryStorage'
import { shouldAdoptRemote } from './syncReconcile'
import { getSeason, getSeasonInfo, isCapeTownWeek, capeTownTripSightingCount } from './seasons'
import { saDateKey, saDateKeyOffset } from './saDate'
import { WeeklyBird, SeasonalAmbient } from './birds'
import { getWeeklyBird } from './birdData'
import {
  EXPLORE_FILTERS,
  MONTHS,
  monthlyActivity,
  birdsNearPotchThisWeek,
  birdsNearCapeTownThisWeek,
  locationThought,
} from './birdExplore'
import {
  SA_PLANT_LIBRARY,
  PLANT_EXPLORE_FILTERS,
  plantCategoryEmoji,
  plantsNearPotchThisWeek,
  plantsNearCapeTownThisWeek,
  findPlantById,
} from './plantData'
import {
  TweetyHomeCard,
  TweetyStatsPage,
  AviaryCard,
  CompanionGalleryPage,
  MysteryEggCard,
  EggSpeciesPicker,
  AwaitingCompanionCard,
  RoomBackdrop,
} from './Tweety'
import { ReleaseCeremony } from './ReleaseCeremony'
import { GardenPage } from './Garden'
import { GreenhousePage } from './Greenhouse'
import {
  defaultGarden,
  gardenItem,
  canWater,
  isSpeciesPlanting,
  isFullyGrown,
  GARDEN_REGION,
  canPlaceResidentAt,
  RESIDENT_TREAT_COST,
  SEED_PLANT_COST,
  WISHING_WELL_COINS,
  canWish,
  expansionItem,
} from './gardenData'
import {
  defaultGreenhouse,
  defaultPot,
  plantableGreenhouseSpecies,
  slotById,
  MAX_SLOTS,
  SLOT_COST,
  ROOM_SLOT_COUNT,
  ROOM2_COST,
  hasRoom2,
  isSlotLocked,
  potStyleItem,
  toolItem,
  hasTool,
  ownedToolUses,
  canWaterPot,
  canMistPot,
  computeHealth,
  waterPots,
  finalizeWatering,
  ageGreenhouseByOneDay,
  SPRAY_HEALTH_BONUS,
  TRIM_COINS,
} from './greenhouseData'
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
  nextCareWindow,
  CARE_WINDOWS,
  companionSpecies,
  getCompanion,
  gardenCompanionFor,
  gardenVisitorTint,
  emptyMysteryEgg,
  resolveEggSpecies,
  MYSTERY_EGG_WARMS,
  treatsBoostActive,
  decayedHappiness,
  happinessDelta,
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
  specialInboxDeliveriesForDay,
  marnichMessage,
  milestoneSystemMessage,
  tweetyGrowthSystemMessage,
  crownedAdultKeepsakeMessage,
  hatchSystemMessage,
  mysteryEggDiscoveredMessage,
  tweetyReleaseKeepsakeMessage,
  botanicalDispatchMessage,
  botanicalCertificateMessage,
} from './messages'
import BotanicalReveal from './BotanicalReveal'
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

// Bird SOUND identification (BirdNET). Enabled by default now that it runs on its
// own isolated Railway service and has been verified end-to-end. Kill-switch:
// build with VITE_SOUND_ID=0 (or set localStorage.soundId='off') to hide it again
// without a code change.
const SOUND_ID_ENABLED =
  String(import.meta.env.VITE_SOUND_ID ?? '1') !== '0' &&
  !(typeof window !== 'undefined' && window.localStorage?.getItem('soundId') === 'off')

// Sound ID runs on its OWN isolated Railway service — a separate container from
// the main backend (state-sync, photo ID) — so a BirdNET crash/OOM there can
// never take down her existing working features.
const DEFAULT_BIRD_SOUND_API_URL = 'https://sound-id-production.up.railway.app'
const BIRD_SOUND_API_URL = String(
  import.meta.env.VITE_BIRD_SOUND_API_URL || DEFAULT_BIRD_SOUND_API_URL,
).replace(/\/+$/, '')

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

// Prepare state for a persistence boundary: slim the bird library to just the
// user's own birds, then either pool duplicated photos (backend — the durable
// photo store) or strip photo bytes entirely (localStorage — an offline cache
// that never needs to hold photos; the backend fetch rehydrates them). Both
// are lossless on load for non-photo fields (mergeBirdLibrary rebuilds the
// catalog), so the in-memory state shape is never affected.
function prepareStateForStorage(state, { forLocalStorage = false } = {}) {
  if (!state || typeof state !== 'object') return state
  const slim = Array.isArray(state.birdLibrary)
    ? { ...state, birdLibrary: slimBirdLibrary(state.birdLibrary, DEFAULT_LIBRARY_IDS) }
    : state
  return forLocalStorage ? stripPhotosForLocalStorage(slim) : dedupePhotosForStorage(slim)
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

// Returns { version } on success, { conflict: true } on a 409 (the backend's
// stored version has moved past what this save was based on — see
// backend/main.py::_save_player_state), or null on any other failure
// (offline, etc). Distinguishing conflict from generic failure lets callers
// re-fetch and reconcile instead of either silently losing the write forever
// or blindly overwriting a fresher state (the mystery-egg/companion
// corruption on 2026-07-12/13 was exactly that: a stale save winning with no
// pushback).
async function saveRemoteState(account, state, version = 0, { keepalive = false } = {}) {
  try {
    const response = await fetch(STATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, state: prepareStateForStorage(state), version }),
      keepalive,
    })
    if (response.status === 409) return { conflict: true }
    if (!response.ok) return null
    const data = await response.json()
    return { version: Number(data.version) || version }
  } catch {
    return null
  }
}

// Fire-and-forget flush for page teardown (backgrounding/eviction) — used by
// the visibilitychange/pagehide/beforeunload handlers below, not the normal
// debounced save. sendBeacon is explicitly guaranteed by spec to be
// delivered even after the page is torn down, unlike a keepalive fetch,
// which the browser can still drop once the process actually goes away. No
// response to react to here (no conflict handling) — this is best-effort;
// the next normal sync reconciles against whatever actually landed.
function flushStateOnExit(account, state, version = 0) {
  const payload = JSON.stringify({ account, state: prepareStateForStorage(state), version })
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon(STATE_API, blob)) return
  }
  fetch(STATE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
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

// Marks that this account's last care/store action never got a CONFIRMED
// successful backend save (a network hiccup, or the page was killed mid-
// request) — even after syncStateToBackend's one retry. The mount-time
// remote-adopt effect checks this before ever adopting a freshly fetched
// backend copy: a fresh reload has no other way to know a previous session's
// edit never actually reached the backend (dataRef/lastSyncedRef both start
// out equal again after a reload, so that in-session "unsaved edits" check
// can't catch it) — without this flag it would happily adopt that stale
// remote state right over a locally-correct, un-synced cache. See the
// 2026-07-26 feed-glitch investigation.
const PENDING_SYNC_KEY = 'marlie_pending_sync'

function markPendingSync(account) {
  try {
    localStorage.setItem(accountFlagKey(PENDING_SYNC_KEY, account), 'true')
  } catch {
    /* ignore */
  }
}

function clearPendingSync(account) {
  try {
    localStorage.removeItem(accountFlagKey(PENDING_SYNC_KEY, account))
  } catch {
    /* ignore */
  }
}

function hasPendingSync(account) {
  try {
    return localStorage.getItem(accountFlagKey(PENDING_SYNC_KEY, account)) === 'true'
  } catch {
    return false
  }
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

// Coin earning rules (rebalanced 2026-07 for a much slower, months-long pace —
// the garden and shops should feel like a real, ongoing savings goal).
const COINS = {
  spot: 30, // spotting any bird
  firstSpecies: 20, // +20 bonus the first time a species is seen (50 total)
  withMarnich: 0, // spotting "with Marnich" is sentimental, not extra coins
  dailyChallenge: 20, // daily challenge completion
  streakBonus: 15, // occasional daily-challenge streak bonus (every 3 days)
  tweetyCare: 25, // per completed Tweety care window (3 windows = 75/day)
  tweetyStreak: 200, // 7-day Tweety care streak bonus
  mysteryEgg: 50, // small bonus celebration when a mystery egg is earned
  newPlantSpecies: 40, // +40 the first time a plant species is logged
  eggWarm: 30, // per daily warm of a mystery egg
  eggHatch: 300, // one-time bonus when a mystery egg finishes hatching
}

// How much the happiness bar rises per action. Kept deliberately small so
// reaching 100% takes consistent daily care over several days rather than
// one session of spam-tapping gifts/care buttons.
const HAPPINESS_GAIN = {
  care: 8, // per feed/water/play action
  storePurchase: 12, // buying a new Tweety Store item
  streakBonus: 10, // on top of `care`, when that action also completes a streak bonus
}

// New (non-final) Tweety growth-stage transition — one-time per stage.
const GROWTH_STAGE_REWARD = 500
// One-time reward when Tweety reaches the final "crowned adult" growth stage.
const CROWN_ADULT_REWARD = 2000

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
  // 20 birds: the "Coffee date" gift card unlocks here too, but that reward
  // section is hidden for Pooks — so give her a real, visible reward (coins +
  // confetti + toast) at this milestone instead of nothing.
  20: 150,
  25: 200,
  50: 500,
  100: 1000,
}

// Botanical Division rank progression — a long-term journey (months/years of
// exploration), unlike birds' real-world-gift milestones. Crossing a
// threshold awards coins AND delivers a certificate letter to the inbox (see
// botanicalCertificateMessage), each written in the Council's voice with
// steadily more dramatic (and jealous) energy as the ranks climb.
const PLANT_LEVELS = [
  {
    level: 1,
    threshold: 5,
    name: 'Botanical Recruit',
    coins: 500,
    certificate:
      'Having successfully identified five botanical specimens without poisoning herself or ' +
      "damaging the Council's reputation, Agent Pooks is hereby confirmed as a Botanical " +
      'Recruit. The Bird Council notes this is technically a demotion in feather-related ' +
      'duties, but is prepared to allow it. 🌿',
  },
  {
    level: 2,
    threshold: 20,
    name: 'Field Agent',
    coins: 300,
    certificate:
      'Twenty specimens catalogued in the field, each correctly identified, none of them ' +
      'poison ivy (that the Council is aware of). Agent Pooks is promoted to Field Agent, ' +
      'Botanical Division. The Bird Council remains unbothered by this development. Mostly. 🌿',
  },
  {
    level: 3,
    threshold: 50,
    name: 'Junior Botanist',
    coins: 500,
    certificate:
      'Fifty species. FIFTY. The Botanical Division has run out of clipboard space. Agent ' +
      'Pooks is promoted to Junior Botanist, effective immediately, with full clearance to ' +
      "use the word \"inflorescence\" in casual conversation. The Bird Council would like it " +
      'on record that they taught her everything she knows about paperwork. 🌿📋',
  },
  {
    level: 4,
    threshold: 100,
    name: 'Field Botanist',
    coins: 800,
    certificate:
      'One hundred plants identified. The Botanical Council convened a small ceremony ' +
      '(attendance: three ferns, one very confused gecko). Agent Pooks is promoted to Field ' +
      'Botanist. The Bird Council sent a card. It just says "fine, well done" in very small ' +
      'handwriting. 🌿🎖️',
  },
  {
    level: 5,
    threshold: 200,
    name: 'Senior Botanist',
    coins: 1200,
    certificate:
      'Two hundred species, Agent. The Council double-checked the paperwork twice, mostly ' +
      'out of disbelief. Agent Pooks is promoted to Senior Botanist. The Bird Council has ' +
      'requested a meeting to discuss whether the Botanical Division is "getting too big for ' +
      'its own good." They were overruled. 🌿🏅',
  },
  {
    level: 6,
    threshold: 203,
    name: 'Master Botanist',
    coins: 2000,
    certificate:
      'Two hundred and three specimens — the Botanical Archive is running out of shelf space. ' +
      'Agent Pooks is promoted to Master Botanist, a title previously held by absolutely no ' +
      'one, because no one has ever come this close to the end of the record before. The Bird ' +
      'Council is quietly, begrudgingly, extremely proud. 🌿👑',
  },
  {
    level: 7,
    threshold: 205,
    name: 'Chief Botanical Officer',
    coins: 3500,
    certificate:
      'Two hundred and five specimens. The Council has consulted its records — there are only ' +
      "two species left in the entire archive she hasn't catalogued. Agent Pooks is hereby " +
      'awarded the title of Chief Botanical Officer of the Southern Hemisphere — the highest ' +
      'honour the Council can bestow before the record itself runs out. The Bird Council ' +
      'would like it noted that we identified her potential first. 🌿👑',
  },
  {
    level: 8,
    threshold: 206,
    name: 'Legendary Field Agent',
    coins: 5000,
    certificate:
      'Two hundred and six specimens, Agent. One species stands between her and the complete ' +
      'record. The Council has stopped pretending this is normal. A Legendary Field Agent ' +
      'designation has been created specifically for this occasion, because no existing title ' +
      'was dramatic enough for someone standing at the very edge of the archive. 🌿⚡',
  },
  {
    level: 9,
    // Dynamic, not a hardcoded number — the top rank means "identified every
    // species in the library," so it must track SA_PLANT_LIBRARY as it grows
    // rather than going stale the next time species get added (see the
    // recent "batch N of ~59" library-expansion commits).
    threshold: SA_PLANT_LIBRARY.length,
    name: 'Grand Master of the Botanical Council',
    coins: 10000,
    certificate:
      "Every single species in the Botanical Division's record — complete, Agent. There is " +
      'nothing left to identify. The Botanical Council has run out of superlatives, ' +
      'ceremonial titles, and, frankly, dignity. By unanimous vote — and against the Bird ' +
      "Council's mild protest that birds are still, objectively, superior — Agent Pooks is " +
      'hereby named Grand Master of the Botanical Council, a rank that did not exist until ' +
      'eleven minutes ago and was invented purely so there would be something left to give ' +
      'her. Southern Hemisphere flora will never fully recover from being this thoroughly ' +
      'known. The Bird Council, for the first time in recorded history, has nothing sarcastic ' +
      'to add. They are simply, entirely, unreservedly proud of her. 🌿👑✨',
  },
]

function nextPlantLevel(plantCount) {
  return PLANT_LEVELS.find((lvl) => plantCount < lvl.threshold) || null
}
function currentPlantLevel(plantCount) {
  return [...PLANT_LEVELS].reverse().find((lvl) => plantCount >= lvl.threshold) || null
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

// Tweety Store — Tweety's Home upgrade system. Every item does something real:
// nest-tier items change her whole home, comfort items soften the care
// routine, decor items are visible additions to the nest scene, and the
// treats bag is a repeatable consumable. One-off items (everything except
// 'treats') live forever in state.tweetyStore so "Gifted ✓" persists across
// sessions; 'treats' is bought fresh each time and just extends
// tweety.treatsBoostUntil. The whole store resets to empty when a companion
// hatches (see warmMysteryEgg) — a new companion starts with nothing bought.
// Sorted cheapest-first for the shop display.
const TWEETY_STORE_ITEMS = [
  { id: 'ribbon', emoji: '🎀', name: 'Ribbon Decoration', cost: 300, kind: 'decor', hint: 'A pretty bow tied onto the nest' },
  { id: 'mirror', emoji: '🪞', name: 'Small Mirror', cost: 400, kind: 'decor', hint: 'Propped by the nest — Tweety occasionally catches her reflection and preens' },
  { id: 'flowers', emoji: '🌸', name: 'Flower Bouquet', cost: 450, kind: 'decor', hint: 'A little bouquet blooms beside the nest' },
  { id: 'perch', emoji: '🌿', name: 'Perch Branch', cost: 500, kind: 'decor', hint: 'A decorative branch settles into the nest area' },
  { id: 'treats', emoji: '🍓', name: 'Special Treats Bag', cost: 350, kind: 'consumable', hint: 'An instant happiness boost — Tweety stays happy for the rest of the day — plus a little bowl by the nest for good' },
  { id: 'blanket', emoji: '🪺', name: 'Cozy Nest Blanket', cost: 600, kind: 'decor', hint: 'A warm woven lining makes the nest look cozier' },
  { id: 'herbs', emoji: '🌿', name: 'Herb Bundle', cost: 650, kind: 'comfort', hint: 'Fresh herbs hang by the nest — Tweety looks (and feels) healthier' },
  { id: 'window', emoji: '🪟', name: 'Tiny Window', cost: 700, kind: 'decor', hint: 'A cute little window appears on the nest' },
  { id: 'feedingbowl', emoji: '🥣', name: 'Feeding Bowl', cost: 800, kind: 'comfort', hint: "A permanent bowl by the nest — missing an occasional feed won't upset her" },
  { id: 'musicbox', emoji: '🎵', name: 'Music Box', cost: 750, kind: 'decor', hint: 'Tap it for a happy little tune and dance' },
  { id: 'chimes', emoji: '🎐', name: 'Wind Chimes', cost: 850, kind: 'decor', hint: 'Tap them for a gentle jingle and a happy little dance' },
  { id: 'watertank', emoji: '💧', name: 'Large Water Tank', cost: 900, kind: 'comfort', hint: "A water dispenser by the nest — missing an occasional water won't upset her" },
  { id: 'cozynest', emoji: '🏡', name: 'Cozy Nest Upgrade', cost: 1200, kind: 'nest', hint: 'The nest gets a warm, lined, lived-in look' },
  { id: 'birdhouse', emoji: '🏰', name: 'Luxury Birdhouse', cost: 2500, kind: 'nest', hint: "Replaces the nest entirely — Tweety's whole home changes" },
]

// Room Themes: whole-backdrop swaps for Tweety's home (see RoomBackdrop in
// Tweety.jsx — every id here must have a matching entry there). Bought once,
// then freely switchable — unlike TWEETY_STORE_ITEMS this never resets on a
// new companion (see defaultTweety's roomTheme/ownedRoomThemes comment), so
// it's kept as its own catalog rather than folded into the item shop.
const ROOM_THEME_CATALOG = [
  { id: 'cottage', emoji: '🪵', name: 'Cosy Cottage', cost: 0, hint: 'Warm wood walls, wooden floor, a real daylight window — her home from day one.' },
  { id: 'winter-cabin', emoji: '❄️', name: 'Winter Cabin', cost: 800, hint: 'Dark log walls, snow through the window, and a fireplace glow on the floor. Tweety gets a tiny scarf.' },
  { id: 'spring-meadow', emoji: '🌷', name: 'Spring Meadow', cost: 800, hint: 'Pastel green walls with a flower print, and an open window onto a butterfly-filled meadow.' },
  { id: 'treehouse', emoji: '🌳', name: 'Treehouse', cost: 1000, hint: 'Bamboo walls, a leafy canopy view, rope details, and dappled sunlight.' },
  { id: 'beach-hut', emoji: '🐚', name: 'Beach Hut', cost: 1000, hint: 'Pale driftwood walls, an ocean sunset through the window, and a sandy floor.' },
  { id: 'night-sky', emoji: '🌙', name: 'Night Sky', cost: 1200, hint: 'Deep blue walls painted with stars, a moonlit window, and a few soft fireflies.' },
]

// Bottom tab bar (6) + everything else tucked behind the settings menu.
// Inbox (📬) stays a prominent top-level tab with an unread badge. The Weekly
// Magazine used to live here too; it's now rendered inline at the bottom of
// Home instead (see WeeklyMagazinePage's call site inside HomePage).
const bottomTabs = [
  ['home', 'Home', '🏡'],
  ['add', 'Spot', '📷'],
  ['explore', 'Explore', '🔍'],
  ['library', 'Collection', '🦜'],
  ['messages', 'Inbox', '📬'],
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

  const secondOpinion = payload?.secondOpinion
  return {
    uncertain: Boolean(payload?.uncertain),
    matches: matchList
      .slice(0, 3)
      .map((match) => normalizeAiMatch(match))
      .filter((match) => match.commonName),
    secondOpinion: secondOpinion
      ? {
          source: normalizeAiText(secondOpinion.source) || 'iNaturalist',
          commonName: normalizeAiText(secondOpinion.commonName),
          scientificName: normalizeAiText(secondOpinion.scientificName),
          score: normalizeConfidence(secondOpinion.score),
          agreesWithTopMatch: Boolean(secondOpinion.agreesWithTopMatch),
        }
      : null,
  }
}

// The low-confidence hint shown above her results: names the top guess, the
// one visual feature the Council used, and — when there's a genuinely
// distinct second candidate (either iNaturalist's disagreeing guess, or her
// own #2 GPT-4o match) — invites her to pick between the two by name, instead
// of a generic "not sure" brush-off.
function buildLowConfidenceMessage(matches, secondOpinion) {
  const top = matches?.[0]
  if (!top?.commonName) {
    return 'The photo was a little tricky, so these are gentle guesses. Pick the closest, or none at all.'
  }
  const feature = top.whyThisBird
    ? ` based on ${top.whyThisBird.charAt(0).toLowerCase()}${top.whyThisBird.slice(1).replace(/\.$/, '')}`
    : ''
  const altName =
    secondOpinion?.commonName && !secondOpinion.agreesWithTopMatch
      ? secondOpinion.commonName
      : matches?.[1]?.commonName
  const altBit = altName && altName !== top.commonName ? `, but could also be a ${altName}` : ''
  return `The Council thinks this might be a ${top.commonName}${feature}${altBit}. Which looks right?`
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

// The magazine rotates weekly. Each issue stays live for 7 calendar days,
// then the next set of birds takes over.
const MAGAZINE_PERIOD_DAYS = 7

function getAbsoluteIssueIndex(date = new Date()) {
  const start = Date.UTC(2024, 0, 1)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current - start) / 86400000 / MAGAZINE_PERIOD_DAYS)
}

// Time until the current weekly issue rotates to the next one.
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
    // The quiz + its claim status key off `week`, so pointing it at the
    // weekly issue index makes both reset with every new issue.
    week: issueIndex,
    countdown: getNextIssueCountdown(date),
    featuredBirds,
    birdOfWeek: pinnedBird || featuredBirds[0] || null,
  }
}

// Same weekly issue cadence as the bird magazine, offset so the plant corner
// doesn't just mirror whichever birds are already on the cover/feature pages.
function getWeeklyMagazinePlants(settings = {}, date = new Date(), count = 4) {
  const library = [...SA_PLANT_LIBRARY].sort((a, b) => a.commonName.localeCompare(b.commonName))
  if (!library.length) return { featuredPlants: [], plantOfWeek: null }
  const issueIndex = getAbsoluteIssueIndex(date)
  const startIndex = (issueIndex * 3) % library.length
  const pinnedPlant =
    library.find((plant) => plant.id === settings.pinnedPlantOfWeekId) || null
  const rotatingPlants = selectRotatingBirds(library, pinnedPlant ? count - 1 : count, startIndex, pinnedPlant?.id)
  const featuredPlants = pinnedPlant ? [pinnedPlant, ...rotatingPlants] : rotatingPlants

  return {
    featuredPlants,
    plantOfWeek: pinnedPlant || featuredPlants[0] || null,
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

// ---- Weekly Plant Quiz (magazine Plant Corner) ----
// Same mechanic as the bird quiz, seeded off the Plant Corner's weekly issue
// index instead of the bird week, so the two quizzes don't sync up.
function weeklyPlantQuizSeed(issueIndex) {
  let h = 2166136261
  const s = `weekly-plant-quiz-${issueIndex}`
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function buildWeeklyPlantQuiz(issueIndex, library, featuredPlants) {
  const hasAfr = (p) => p && p.commonName && p.afrikaansName
  const pool = (library || []).filter(hasAfr)
  const featured = (featuredPlants || []).filter(hasAfr)
  const seed = weeklyPlantQuizSeed(issueIndex)
  // Top up to 5 subjects from the wider library if needed.
  const extra = seededShuffleLocal(
    pool.filter((p) => !featured.some((f) => f.id === p.id)),
    seed,
  )
  const subjects = [...featured, ...extra].slice(0, 5)
  return subjects.map((plant, qi) => {
    const askAfrikaans = qi % 2 === 0
    const correct = askAfrikaans ? plant.afrikaansName : plant.commonName
    const decoyPool = pool
      .filter((p) => p.id !== plant.id)
      .map((p) => (askAfrikaans ? p.afrikaansName : p.commonName))
      .filter((v, i, arr) => v && v !== correct && arr.indexOf(v) === i)
    const decoys = seededShuffleLocal(decoyPool, seed + qi * 7919).slice(0, 3)
    const options = seededShuffleLocal([correct, ...decoys], seed + qi * 104729)
    return {
      q: askAfrikaans
        ? `What is the Afrikaans name for the ${plant.commonName}?`
        : `Which plant is known in Afrikaans as “${plant.afrikaansName}”?`,
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
    // Tweety Store: ids of items already gifted to Tweety (bought once each).
    tweetyStore: [],
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
    greenhouse: defaultGreenhouse(),
    weeklyQuizClaimedWeek: null,
    weeklyPlantQuizClaimedWeek: null,
    // Which weekly magazine issue (issue.week) the new-issue Home popup has
    // already been shown/dismissed for — only a new issue.week re-triggers it.
    magazineIssueSeenWeek: null,
    discoveries: [],
    birdLibrary: normalizeBirdLibrary(defaultBirdLibrary),
    magazineIssue: defaultMagazineIssue,
    settings: {
      birdCrush: '',
      alerts: [],
      currentDateMission: dateMissions[0],
      rareBeautyUnlocked: false,
      soundDetectiveUnlocked: false,
      // Plant scanning unlocks the moment she completes the Botanical Division
      // cinematic reveal (see BotanicalReveal + botanicalRevealSeen below).
      plantScanningUnlocked: false,
      // One-time cinematic reveal, gated the same way as introSeen.
      botanicalRevealSeen: false,
      // Dev release gate for feature areas built ahead of time in sandbox.
      // account==='marnich' always bypasses this (see plantsReleased in App());
      // for Pooks' real account, nothing in a gated area appears until an
      // admin explicitly flips it (see releasePlantsToPooks).
      releaseFlags: { plants: false },
      // Pre-login gate for Pooks only (checked in App() before she's ever
      // authenticated — see the unauthenticated GET in the mount effect and
      // MaintenanceGate). Marnich's own login is unaffected; toggled from the
      // Admin panel (Maintenance Mode section).
      pooksMaintenanceMode: false,
      // One-time garden gift from Marnich (2026-07-15) — delivered exactly
      // once, the next time she opens the app as herself; see the effect in
      // App() gated on this flag. Never reset, never re-fires.
      marnichGardenGift2025: false,
      secretCodesVisible: false,
      pinnedBirdOfWeekId: '',
      pinnedPlantOfWeekId: '',
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
    messagesMeta: { lastCouncilDay: '', shownCouncil: [], specialDelivered: [] },
    // Last Tweety growth stage we have already celebrated (index into stages).
    tweetyGrowthSeen: 0,
    // Whether the one-time cinematic intro has been watched. Lives in the synced
    // state (not just a per-device flag) so a new device knows she is not new.
    introSeen: false,
    // Mystery egg: earned every 5th new species logged (see commit()).
    // lastAwardedAtCount is the highest multiple-of-5 species count already
    // "used up" — advances even when a new egg isn't created (no stacking).
    eggProgress: { lastAwardedAtCount: 0 },
    mysteryEgg: null,
    // Plant Collection: confirmed species (see addPlant()). Much simpler than
    // birds — no coins, no mystery eggs, just the collection entry plus one
    // seed per new species for the Seed Pouch / garden.
    plantLibrary: [],
    seeds: 0,
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
// Migrate any existing Tweety onto the simplified, egg-free model. The OLD
// family-lifecycle eggs/incubation/babies are gone: Tweety is simply her
// companion from the start and grows through the five stages via daily care.
// We preserve whatever stage she has already reached (her bornAt) and never
// reset her. (This predates and is unrelated to the NEW top-level mystery-egg
// mechanic in data.mysteryEgg — that one intentionally leaves companion null
// via awaitingNextCompanion below, in the brief gap after a release.)
function normalizeTweety(tweety, savedTweety) {
  const next = { ...tweety }
  // She is always her companion now — UNLESS she's in the brief gap between
  // releasing her last companion and adopting the next one (awaitingNextCompanion).
  // If a save predates a hatch (only an egg was chosen), adopt the companion
  // that egg was hiding so her look is preserved.
  if (!next.companion && !next.awaitingNextCompanion) {
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
  // Backfill happiness for saves that predate the happiness meter (added
  // 2026-07-21). Must check the RAW saved value, not `next.happiness` — by
  // this point `tweety` already carries defaultTweety()'s baked-in
  // happiness/lastHappinessUpdate from the base-default spread at the call
  // site, so checking `next.happiness` here could never tell "really
  // missing" apart from "already migrated." Seeding once, explicitly, means
  // the very next autosave persists a real baseline for good, instead of
  // re-deriving a fresh "now" timestamp (and therefore zero elapsed decay)
  // on every single load.
  if (typeof savedTweety?.happiness !== 'number') {
    next.happiness = 70
    next.lastHappinessUpdate = new Date().toISOString()
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
      tweetyStore: Array.isArray(saved.tweetyStore)
        ? saved.tweetyStore
        : base.tweetyStore,
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
      }, saved.tweety),
      store: { ...base.store, ...(saved.store || {}) },
      games: { ...base.games, ...(saved.games || {}) },
      garden: {
        ...base.garden,
        ...(saved.garden || {}),
        // Reconcile the shop catalog on every load: items shipped after this
        // garden was created must unlock for existing gardens too, so a stale
        // saved shopUnlocked (e.g. an early 2-item starter set) can never hide
        // newer items. Union keeps any already-unlocked ids and stays correct
        // if progressive unlocking arrives (base would then hold the starters).
        shopUnlocked: Array.from(new Set([
          ...(base.garden.shopUnlocked || []),
          ...(saved.garden?.shopUnlocked || []),
        ])),
      },
      greenhouse:
        // One-time reset: clear out whatever pots Pooks had planted so the
        // greenhouse starts fresh. Gated on settings.greenhouseResetV1 so it
        // only ever fires once — after that, her pots persist normally.
        !saved.settings?.greenhouseResetV1 && (saved.greenhouse?.pots || []).length > 0
          ? defaultGreenhouse()
          : {
              ...base.greenhouse,
              ...(saved.greenhouse || {}),
            },
      // Migration: an egg saved before the species-choice feature shipped was
      // created by the old random-pick system (pickHatchCandidate) and never
      // explicitly recorded needsSpeciesChoice — retroactively flag any egg
      // that doesn't say `false` so she gets the choice prompt for her
      // current egg too, instead of it silently keeping its old random pick.
      mysteryEgg: saved.mysteryEgg
        ? { ...saved.mysteryEgg, needsSpeciesChoice: saved.mysteryEgg.needsSpeciesChoice !== false }
        : base.mysteryEgg,
      discoveries: Array.isArray(saved.discoveries) ? saved.discoveries : base.discoveries,
      birdLibrary: normalizeBirdLibrary(mergeBirdLibrary(base.birdLibrary, saved.birdLibrary)),
      plantLibrary: Array.isArray(saved.plantLibrary) ? saved.plantLibrary : base.plantLibrary,
      seeds: typeof saved.seeds === 'number' ? saved.seeds : base.seeds,
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
        greenhouseResetV1: true,
        releaseFlags: {
          ...base.settings.releaseFlags,
          ...(saved.settings?.releaseFlags || {}),
        },
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

// Identify a bird from an audio/video recording via the backend BirdNET endpoint.
// Returns the SAME normalised {uncertain, matches} shape as the photo identifier,
// so the existing results UI and confirm-to-collection flow handle it unchanged.
// Throws on a network/API failure so the caller can show the warm fallback.
async function identifyBirdByAudio(file) {
  if (!file || !BIRD_API_URL) throw new Error('No recording or API URL')
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${BIRD_SOUND_API_URL}/api/identify-bird-audio`, {
    method: 'POST',
    body,
  })
  if (!response.ok) throw new Error(`Audio API returned ${response.status}`)
  const payload = await response.json()
  return normalizeAiIdentificationResponse(payload)
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
  // When set, the next top-scroll effect (below) scrolls to this element id
  // instead of resetting to the top — lets old `goTo('magazine')` deep-links
  // land on Home already scrolled to the magazine section, instead of either
  // a dead route or a page that silently ignores where they meant to go.
  const pendingScrollTarget = useRef(null)
  // Which side of the Explore tab (Birds/Plants) to land on — lifted out of
  // ExploreHubPage so the "Plants near you" home card can jump straight to
  // the plants side instead of always landing on Birds.
  const [exploreMode, setExploreMode] = useState('birds')
  const [session, setSession] = useState(readStoredSession)
  // Pre-login maintenance gate for Pooks (see MaintenanceGate + the mount
  // effect below). Checked via an unauthenticated GET of her own account
  // settings, so it can show before she's ever logged in.
  const [pooksMaintenance, setPooksMaintenance] = useState(false)
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
  // Plant features (Scan a Plant, Plants Collection, Seed Pouch, etc.) stay
  // fully hidden everywhere — including Marnich's own sandbox — until
  // explicitly enabled. Two INDEPENDENT flags, one per account: Marnich flips
  // his own account's flag from the sandbox toolbar to test (toggleSandboxPlantFeatures),
  // and only releasePlantsToPooks flips HERS. Sandbox therefore matches
  // exactly what Pooks sees by default, and never leaks anything ahead of an
  // explicit toggle on either side.
  const plantsReleased = Boolean(data.settings.releaseFlags?.plants)
  // The single combined gate every plant-scanning UI checks: released for this
  // account AND she's read the promotion letter. Passed down instead of raw
  // settings.plantScanningUnlocked so no component can show the scanner to
  // Pooks purely because her own in-narrative flag flipped pre-release.
  const plantScannerVisible = plantsReleased && Boolean(data.settings.plantScanningUnlocked)
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
  // Serializes every syncStateToBackend run (debounced autosave, immediate
  // high-value saves, and the pending-sync recovery) behind a single chain —
  // see queueSync below. Only one save, including its full 409 conflict
  // resolution, is ever in flight at a time.
  const syncQueueRef = useRef(Promise.resolve())
  // Has the active account already seen the one-time cinematic intro? Read
  // immediately on app load so a refresh/navigation never replays it.
  const [introSeen, setIntroSeen] = useState(() =>
    readIntroSeen(dataAccountFor(readStoredSession(), readMarnichMode())),
  )
  const [reveal, setReveal] = useState(null)
  const [rewardUnlockQueue, setRewardUnlockQueue] = useState([])
  const [missedDraft, setMissedDraft] = useState({ location: '', note: '' })
  const [birdProfile, setBirdProfile] = useState(null)
  const [plantProfileId, setPlantProfileId] = useState(null)
  const [tweetyDancing, setTweetyDancing] = useState(false)
  // Which store item id just landed in the room scene — drives its one-shot
  // pop-in animation (see .room-slot.gift-pop in App.css). Cleared a moment
  // after the animation finishes so a later purchase can retrigger it.
  const [justPurchasedItem, setJustPurchasedItem] = useState(null)
  const [weeklyTip, setWeeklyTip] = useState(false)
  // When true, the release ceremony overlay (a farewell) is shown for a
  // crowned companion graduating to the garden. As soon as it finishes she's
  // released immediately — no placement tap, she just flies in and roams.
  const [releasingCompanion, setReleasingCompanion] = useState(false)
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

  // Birds from her real Collection (seen species) that can visit grown garden
  // elements (P2). Shaped to the minimum the scene needs and bucketed by
  // habitat: water birds for the pond/bird-bath, land songbirds for trees,
  // feeders, etc. Memoised so the visitor scheduler isn't reset every render.
  const gardenVisitors = useMemo(() => {
    return (data.birdLibrary || [])
      .filter((b) => b.seen && (b.imageUrl || b.commonName))
      .map((b) => {
        const tags = b.tags || []
        const water = tags.includes('Water birds') || b.category === 'Water birds'
        // Each visitor is drawn as illustrated TweetyBird art (never a photo):
        // its species maps to one of the six companion illustrations, or to the
        // neutral "wild garden bird" fallback so the scene stays consistent.
        const companion = gardenCompanionFor(b.commonName, b.scientificName)
        return {
          id: b.id || b.commonName,
          name: b.commonName,
          companion,
          tint: gardenVisitorTint(companion),
          water,
          land: !water, // trees/feeders draw any non-water species she's collected
        }
      })
  }, [data.birdLibrary])

  // Discovered species not yet planted in the garden — what the Seed Pouch
  // offers to plant. A species can only ever be planted once (no duplicates).
  const plantableSpecies = useMemo(() => {
    const plantedKeys = new Set(
      (data.garden?.plantings || [])
        .filter((p) => isSpeciesPlanting(p.type))
        .map((p) => p.type.slice('species:'.length)),
    )
    return (data.plantLibrary || []).filter((p) => !plantedKeys.has(p.speciesKey))
  }, [data.plantLibrary, data.garden?.plantings])

  // Same idea for the Greenhouse's own picker — a species already potted
  // (alive or dead) isn't offered again until she clears that pot.
  const plantableForGreenhouse = useMemo(
    () => plantableGreenhouseSpecies(data.plantLibrary, data.greenhouse),
    [data.plantLibrary, data.greenhouse],
  )

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
    if (pendingScrollTarget.current) {
      const targetId = pendingScrollTarget.current
      pendingScrollTarget.current = null
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
    const wrap = document.querySelector('.page-wrap')
    if (wrap) wrap.scrollTop = 0
    document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0
  }, [activePage])

  // Repoints anything that used to do setActivePage('magazine') — the route
  // is gone, but the content lives at #home-magazine-section on Home now.
  function goToMagazineSection() {
    pendingScrollTarget.current = 'home-magazine-section'
    setActivePage('home')
  }

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

  // One-off, date-gated personal/Council touches (Cape Town postcard nudge, the
  // two personal notes from Marnich) — layered on top of the daily dispatch
  // above, never replacing it. Each fires once and is recorded so it never
  // repeats; after its window passes nothing matches (auto-cleanup). Keyed off
  // the stored specialDelivered log for the same sync-resilient reason as the
  // council dispatch.
  useEffect(() => {
    if (!session || readOnly || (session.role !== 'pooks' && session.role !== 'marnich'))
      return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setData((current) => {
        const drop = specialInboxDeliveriesForDay(current.messagesMeta, dayKey, current.sightings)
        if (!drop) return current
        return {
          ...current,
          messages: [...drop.messages, ...(current.messages || [])],
          messagesMeta: drop.meta,
        }
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dayKey, data.messagesMeta?.specialDelivered])

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
          featherCoins: (current.featherCoins || 0) + (isCrown ? CROWN_ADULT_REWARD : GROWTH_STAGE_REWARD),
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
              body: `${name} just became a ${stage.label}. Each day of love helps them grow a little bigger. +${GROWTH_STAGE_REWARD} Feather Coins. 💛`,
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
        JSON.stringify(prepareStateForStorage(data, { forLocalStorage: true })),
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

  // Posts the CURRENT state — read fresh from dataRef.current the moment this
  // actually runs, never a snapshot from whenever it was requested — and
  // reconciles a 409 version conflict (see backend/main.py::_save_player_state):
  // this save was based on a version that's no longer current, because another
  // device or a manual admin fix moved the account ahead of it. Re-fetch the
  // authoritative state — if we have no genuine local edits on top of it,
  // adopt it outright (this is exactly the case that used to get silently
  // clobbered, causing the mystery-egg/companion corruption on 2026-07-12/13).
  // If we do have real local edits, re-save them once on top of the fresh
  // version rather than dropping the write forever.
  //
  // ALWAYS call this through queueSync below, never directly — see there for
  // why. Factored out of the debounce effect below so a high-value action
  // (see careTweety's `immediate` commit) can trigger this right away instead
  // of waiting out the full debounce, without duplicating the conflict logic.
  async function syncStateToBackend({ isRetry = false } = {}) {
    if (readOnly || !session) {
      return
    }
    if (account !== 'pooks' && account !== 'marnich') {
      return
    }
    const state = dataRef.current
    const res = await saveRemoteState(account, state, stateVersionRef.current)
    if (res && !res.conflict) {
      stateVersionRef.current = res.version
      lastSyncedRef.current = state
      clearPendingSync(account)
      return
    }
    if (!res || !res.conflict) {
      // Network hiccup (fetch threw, or a non-409 non-ok response) — saveRemoteState
      // swallows the failure silently, so without this retry+flag a single blip
      // loses the write with no record of it ever happening (the root cause behind
      // the feed-glitch: a later reload's mount-time fetch would then have no way
      // to know the backend copy it's about to adopt is stale). Queued as a fresh
      // turn (not awaited here) so this one 2.5s wait doesn't stall any save
      // requested in the meantime — it'll pick up whatever's current when its
      // turn comes.
      if (!isRetry) {
        window.setTimeout(() => queueSync({ isRetry: true }), 2500)
        return
      }
      markPendingSync(account)
      return
    }
    const remote = await fetchRemoteState(account)
    if (!remote || !remote.state) {
      markPendingSync(account)
      return
    }
    const hasUnsavedLocalEdits = dataRef.current !== lastSyncedRef.current
    // A version gap bigger than one save means this client's own view of
    // the world is stale, not racing — e.g. a tab left open for days,
    // whose "local edits" are really just an old snapshot that happens to
    // differ from what it last (long ago) synced. Trusting that as a real
    // edit worth preserving is exactly how the mystery-egg/companion
    // corruption kept recurring (2026-07-12 through -15): a stale client
    // reconnects, hits 409, then confidently re-saves its own outdated
    // state over real, fresher progress. Only a same-or-adjacent-version
    // client gets the benefit of the doubt.
    const versionGap = remote.version - stateVersionRef.current
    if (!hasUnsavedLocalEdits || versionGap > 1) {
      adoptState(account, remote.state, remote.version)
      return
    }
    const retry = await saveRemoteState(account, dataRef.current, remote.version)
    if (retry && !retry.conflict) {
      stateVersionRef.current = retry.version
      lastSyncedRef.current = dataRef.current
      clearPendingSync(account)
    } else {
      markPendingSync(account)
    }
  }

  // Single entry point for every save. Chaining onto syncQueueRef means a
  // save requested while one is already running (a network round-trip, a 409
  // conflict's re-fetch-and-retry, all of it) waits for that run to fully
  // settle — success, failure, or conflict resolution — before starting its
  // own, and only then reads dataRef/stateVersionRef, so it always acts on
  // the latest state instead of whatever was current back when it was
  // requested. This is what stops concurrent care-taps (or a store purchase
  // racing the autosave) from corrupting each other's view of the backend
  // version and adopting a stale remote snapshot over newer local progress.
  function queueSync(options) {
    syncQueueRef.current = syncQueueRef.current
      .catch(() => {})
      .then(() => syncStateToBackend(options))
  }

  // Source of truth: debounce-save the active account's state to the backend so
  // it follows her login onto any device. The localStorage write above stays as
  // the offline cache. Never runs while viewing Pooks' read-only mirror.
  useEffect(() => {
    if (readOnly || !session) return undefined
    if (account !== 'pooks' && account !== 'marnich') return undefined
    const timer = window.setTimeout(() => queueSync(), 10000)
    return () => window.clearTimeout(timer)
    // queueSync/syncStateToBackend are fresh closures every render but only
    // meaningfully depend on account/readOnly/session — already listed — so
    // including them here would just reset this 10s timer on every unrelated
    // re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, account, readOnly, session])

  // Flush the latest state to the backend when the tab is hidden or closed, so
  // changes in the last few seconds aren't lost before the debounce fires.
  useEffect(() => {
    if (readOnly || !session) return undefined
    if (account !== 'pooks' && account !== 'marnich') return undefined
    const flushNow = () => flushStateOnExit(account, dataRef.current, stateVersionRef.current)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    window.addEventListener('visibilitychange', onVisibility)
    // pagehide fires more reliably than visibilitychange on mobile
    // Safari/PWA backgrounding — this is the actual eviction case the
    // Tweety-feed reversion bug traced back to: the 10s debounce hadn't
    // fired yet when the page was evicted, so the feed was never persisted.
    window.addEventListener('pagehide', flushNow)
    window.addEventListener('beforeunload', flushNow)
    return () => {
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushNow)
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
  //
  // BUG FIX (2026-07-14): this used to stamp via plain setData without touching
  // lastSyncedRef. Since it fires on every mount via setTimeout(0) — a macrotask
  // that resolves before the "adopt authoritative remote state" fetch's network
  // round-trip ever can — it made dataRef.current !== lastSyncedRef.current true
  // within milliseconds of every single app open. shouldAdoptRemote() (see
  // syncReconcile.js) treats that as "genuine unsaved local edits" and refuses to
  // adopt a fresher backend state, so it permanently defeated both the mount-time
  // and the 20s-poll remote-adopt checks on essentially every load. Ten seconds
  // later the debounced autosave then pushed the stale local copy back to the
  // backend, which does unconditional last-write-wins (see
  // backend/main.py::_save_player_state) — silently erasing ANY admin fix applied
  // to the account while it wasn't the active open session. This is what
  // reverted the manual companion/mystery-egg corrections made on 2026-07-12: the
  // next time the app opened, this stamp raced the fix's adoption and then
  // resaved the pre-fix state over it.
  //
  // lastVisit is pure bookkeeping — it is never worth protecting against a
  // fresher remote fetch — so we advance lastSyncedRef in lockstep with it. That
  // keeps this stamp from ever masquerading as a "real" unsaved edit.
  useEffect(() => {
    if (readOnly) return undefined
    const t = window.setTimeout(() => {
      setData((c) => {
        const next = { ...c, tweety: { ...c.tweety, lastVisit: new Date().toISOString() } }
        lastSyncedRef.current = next
        return next
      })
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
      if (hasPendingSync(acct)) {
        // A previous session ended with a care/store action that never got a
        // CONFIRMED backend save (see markPendingSync in syncStateToBackend) —
        // the usual "any unsaved edits?" check just below (dataRef vs.
        // lastSyncedRef) can't catch this on a fresh reload, since both refs
        // start out equal again right after load. Trust the flag instead:
        // never adopt remote here, and force syncStateToBackend to treat this
        // session's freshly loaded local state as unsaved so it pushes it up
        // rather than silently comparing it away as "nothing to save".
        stateVersionRef.current = remote.version
        lastSyncedRef.current = null
        queueSync()
        return
      }
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
    // and toggles adopt remote state on their own). syncStateToBackend is a
    // fresh closure every render but only meaningfully depends on
    // account/readOnly/session, same as the debounce effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check Pooks' maintenance flag — before she's ever logged in (an
  // unauthenticated GET, gating LoginScreen below) AND periodically while
  // she's already logged in. A pre-login-only check would let a device that
  // was already signed in before maintenance mode was switched on sail
  // straight past it and keep making real changes underneath it — exactly
  // the gap that let her keep using the app while "in maintenance" on
  // 2026-07-15. The render guard below only ever applies this to
  // session.role === 'pooks' specifically (not just account === 'pooks',
  // which also covers Marnich's read-only mirror of her) — his own
  // login/session never checks this.
  useEffect(() => {
    let cancelled = false
    function check() {
      fetchRemoteState('pooks').then((remote) => {
        if (cancelled) return
        setPooksMaintenance(Boolean(remote?.state?.settings?.pooksMaintenanceMode))
      })
    }
    check()
    const iv = window.setInterval(check, 60000)
    return () => {
      cancelled = true
      window.clearInterval(iv)
    }
  }, [])

  // One-time garden gift from Marnich (2026-07-15): a warm inbox note plus a
  // fully-grown Wishing Well already waiting in the garden (no watering
  // needed — she sees it the moment she visits), delivered exactly once the
  // next time she opens the app. Gated on settings.marnichGardenGift2025 so
  // it can never fire twice, and on session.role === 'pooks' specifically
  // (not just account === 'pooks') so it never touches Marnich's own
  // sandbox or fires while he's viewing her read-only mirror.
  //
  // Deferred a few seconds and reads dataRef.current (not the closure's
  // data) at execution time — firing immediately on mount would race the
  // "pull authoritative state" fetch above (~1.2s typically) and could
  // commit the gift on top of a stale local cache, undoing same-day fixes.
  // Exactly the class of bug in the sync-race-corruption memory.
  useEffect(() => {
    if (readOnly || !session || session.role !== 'pooks') return
    if (account !== 'pooks') return
    if (data.settings.marnichGardenGift2025) return
    const t = window.setTimeout(() => {
      const current = dataRef.current
      if (!current || current.settings.marnichGardenGift2025) return
      const garden = current.garden || defaultGarden()
      const wellItem = gardenItem('wishing-well')
      const gift = {
        id: createId('plant'),
        type: 'wishing-well',
        x: 200,
        y: 195,
        wateredDays: wellItem.waterToGrow,
        lastWaterDay: '',
        plantedAt: new Date().toISOString(),
      }
      commit(
        {
          ...current,
          settings: { ...current.settings, marnichGardenGift2025: true },
          garden: { ...garden, plantings: [gift, ...(garden.plantings || [])] },
          messages: [
            marnichMessage(
              "The Bird Council has been informed that today was a tough one. Agent Marnich — who is definitely not watching your every move through the app, just occasionally — wanted you to know he's thinking of you. He arranged a small surprise for your garden. Go have a look. 💛 — The Council (and Marnich)",
              'A little something from Marnich 💛',
            ),
            ...(current.messages || []),
          ],
        },
        { title: 'A little something from Marnich 💛', body: 'Check your inbox — and your garden. 🪄', tone: 'success' },
      )
    }, 2500)
    return () => window.clearTimeout(t)
    // commit is deliberately excluded: it's a new reference every render, so
    // including it would reset the timeout on every render and could starve
    // it from ever firing during active use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, session, account, data.settings.marnichGardenGift2025])

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
      localStorage.setItem(
        storageKeyForAccount(acct),
        JSON.stringify(prepareStateForStorage(state, { forLocalStorage: true })),
      )
    } catch {
      /* cache may be full — backend remains the source of truth */
    }
    setData(state)
    lastSyncedRef.current = state
    // The remote copy is now truth for this account — whatever unconfirmed-save
    // concern markPendingSync recorded no longer applies to it.
    clearPendingSync(acct)
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
    if (!win) {
      // Was a silent no-op — if the card's display went stale (e.g. the app
      // was backgrounded across a window boundary) she'd tap a still-visible
      // "Feed" button and see nothing happen at all. Every tap now responds.
      const name = data.tweety?.name || 'Tweety'
      const next = nextCareWindow(now)
      setToast({
        title: `${name} is resting 😴`,
        body: `Next care window (${next.window.emoji} ${next.window.label}) in ${next.hoursUntil} hour${next.hoursUntil === 1 ? '' : 's'} 💤`,
        tone: 'calm',
      })
      return
    }
    const field = kind === 'water' ? 'watered' : kind === 'play' ? 'played' : 'fed'
    const careNow = tweetyCareState(data.tweety, now)
    if (careNow[field]) {
      const name = data.tweety?.name || 'Tweety'
      const noun = field === 'watered' ? 'water' : field === 'played' ? 'playtime' : 'a feed'
      setToast({
        title: 'Already done 💛',
        body: `${name}'s already had ${noun} this window 💛`,
        tone: 'calm',
      })
      return
    }

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
    // day of all three windows pays 75 — individual taps just keep Tweety happy.
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

    // Happiness: +8 for the care action, plus +10 more if it also completed
    // a streak bonus above.
    const happinessGain = HAPPINESS_GAIN.care + (bonusNote ? HAPPINESS_GAIN.streakBonus : 0)
    const nextHappiness = happinessDelta(data.tweety, happinessGain)
    nextTweety.happiness = nextHappiness.happiness
    nextTweety.lastHappinessUpdate = nextHappiness.lastHappinessUpdate

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
      { immediate: true },
    )
  }

  // Settle passive happiness decay once per mount — this card fully
  // remounts every time she returns to Home (key={activePage} on the page
  // wrap), so "on mount" already covers every Home visit, not just first
  // app load. No-op if under a full hour has passed.
  function settleHappinessDecay() {
    if (readOnly) return
    const decayed = decayedHappiness(data.tweety)
    // Only compare against a REAL prior value. Comparing against a `?? 70`
    // fallback made "just computed the same default" indistinguishable from
    // "nothing changed," so this guard used to bail before ever seeding a
    // baseline — the bug this fixes.
    const hasRealHappiness = typeof data.tweety?.happiness === 'number'
    if (hasRealHappiness && decayed.happiness === data.tweety.happiness) return
    setData((current) => {
      const next = { ...current, tweety: { ...current.tweety, ...decayed } }
      return next
    })
  }

  function renameTweety(name) {
    setData((current) => ({ ...current, tweety: { ...current.tweety, name } }))
  }

  // She picks her mystery egg's species herself, from any species she's
  // catalogued (seen) in her Collection — see EggSpeciesPicker, shown instead
  // of MysteryEggCard while needsSpeciesChoice is true. Warming only starts
  // once this has run (see the render gate near MysteryEggCard's use).
  function chooseEggSpecies(birdId) {
    if (readOnly) return
    const egg = data.mysteryEgg
    if (!egg || !egg.needsSpeciesChoice) return
    const bird = (data.birdLibrary || []).find((b) => b.id === birdId)
    if (!bird) return
    commit(
      { ...data, mysteryEgg: { ...egg, ...resolveEggSpecies(bird.commonName, bird.scientificName) } },
      { title: 'Species chosen! 🥚', body: `Your mystery egg is now warming up to be a ${bird.commonName}.`, tone: 'success' },
      { immediate: true },
    )
  }

  // Daily tap-to-warm for the mystery egg (same once-per-real-day rhythm as
  // Tweety's own care). The egg can be BANKED at any time through birding, but
  // is only ever warmable/hatchable in the gap after releasing a companion —
  // hatching is the reward for releasing, never something that runs alongside
  // an active companion's growth. On the final warm, the hatched companion is
  // adopted immediately.
  function warmMysteryEgg() {
    if (readOnly) return
    if (!data.tweety?.awaitingNextCompanion) return // not hers to warm yet
    const egg = data.mysteryEgg
    if (!egg || egg.needsSpeciesChoice) return // she has to choose a species first
    const today = tweetyTodayKey()
    if (egg.lastWarmDay === today) return
    const warms = (egg.warms || 0) + 1

    if (warms < MYSTERY_EGG_WARMS) {
      commit(
        {
          ...data,
          mysteryEgg: { ...egg, warms, lastWarmDay: today },
          featherCoins: data.featherCoins + COINS.eggWarm,
        },
        {
          title: 'So warm and cosy 💛',
          body: `${warms}/${MYSTERY_EGG_WARMS} days until it hatches. +${COINS.eggWarm} Feather Coins.`,
        },
      )
      return
    }

    // Hatching day — adopt immediately.
    const nextTweety = {
      ...data.tweety,
      companion: egg.companionId,
      realSpecies: egg.realSpecies,
      awaitingNextCompanion: false,
      lastReleasedName: null,
      bornAt: new Date().toISOString(),
      careAt: { fed: null, watered: null, played: null },
      treatsReceived: 0,
      pendingTreat: false,
    }
    setConfetti(Date.now())
    setReveal({
      tone: 'bird',
      title: `A ${egg.realSpecies} hatched! 🐣`,
      body: `Your mystery egg hatched into a ${egg.realSpecies} — meet your new companion. +${COINS.eggHatch} Feather Coins. 🎉`,
    })
    commit(
      {
        ...data,
        tweety: nextTweety,
        mysteryEgg: null,
        tweetyGrowthSeen: 0,
        // A new companion starts fresh — the Tweety Store resets completely.
        tweetyStore: [],
        featherCoins: data.featherCoins + COINS.eggHatch,
        messages: [hatchSystemMessage(egg.realSpecies), ...(data.messages || [])],
      },
      { title: `${egg.realSpecies} hatched! 🐣`, body: `Your new companion is here. +${COINS.eggHatch} Feather Coins.` },
    )
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
  // A tap-to-place from the Seed Pouch: costs a seed instead of coins, and its
  // final grown stage is an illustrated bloom tinted to the plant's real
  // family (denormalized here since gardenItem() only knows the generic
  // growth shape, not which species this particular planting is).
  function plantSpeciesSeed(speciesKey, x, y) {
    if (data.seeds <= 0) {
      setToast({ title: 'No seeds yet', body: 'Discover a new plant species to earn a seed 🌱', tone: 'warning' })
      return
    }
    if (data.featherCoins < SEED_PLANT_COST) {
      setToast({
        title: 'Not enough coins yet',
        body: `Planting a seed costs ${SEED_PLANT_COST} 🪙 on top of the seed.`,
        tone: 'warning',
      })
      return
    }
    const species = data.plantLibrary.find((p) => p.speciesKey === speciesKey)
    if (!species) return
    const garden = data.garden || defaultGarden()
    const plantings = garden.plantings || []
    const type = `species:${speciesKey}`
    if (plantings.some((p) => p.type === type)) return // already planted, nothing to do
    const planting = {
      id: createId('plant'),
      type,
      x,
      y,
      wateredDays: 0,
      lastWaterDay: '',
      plantedAt: new Date().toISOString(),
      commonName: species.commonName,
      family: species.family,
    }
    commit(
      {
        ...data,
        seeds: data.seeds - 1,
        featherCoins: data.featherCoins - SEED_PLANT_COST,
        garden: { ...garden, plantings: [...plantings, planting] },
      },
      {
        title: 'Seed planted 🌱',
        body: `Your ${species.commonName} seed is in the ground — water it each day to watch it grow into the real thing.`,
      },
    )
  }

  // Wishing Well: once per SA day, tapping the fully-grown well pays out a
  // random amount up to WISHING_WELL_COINS — a little daily treat, gated the
  // same way watering/care windows already are so it can't be farmed.
  function wishAtWell() {
    if (readOnly) return
    const garden = data.garden || defaultGarden()
    if (!canWish(garden, saDateKey())) return
    const amount = 1 + Math.floor(Math.random() * WISHING_WELL_COINS)
    commit(
      {
        ...data,
        garden: { ...garden, lastWishDay: saDateKey() },
        featherCoins: data.featherCoins + amount,
      },
      { title: 'A wish granted ✨', body: `The well glimmers — +${amount} Feather Coins.` },
    )
  }

  // Garden expansion zones: a one-time permanent unlock (never placed/watered
  // like a shop item) that widens the whole scene. See gardenZoneRect's
  // comment in gardenData.js for why each zone lives at a fixed world-space
  // slot regardless of purchase order.
  function purchaseExpansion(zoneId) {
    if (readOnly) return
    const zone = expansionItem(zoneId)
    if (!zone) return
    const garden = data.garden || defaultGarden()
    const owned = garden.expansions || []
    if (owned.includes(zoneId)) return
    if (data.featherCoins < zone.cost) {
      setToast({ title: 'Not enough coins yet', body: `${zone.name} costs ${zone.cost} 🪙.`, tone: 'warning' })
      return
    }
    setConfetti(Date.now())
    commit(
      {
        ...data,
        garden: { ...garden, expansions: [...owned, zoneId] },
        featherCoins: data.featherCoins - zone.cost,
      },
      {
        title: `${zone.name} unlocked! ${zone.emoji}`,
        body: 'Your garden just grew — swipe to explore the new space.',
      },
    )
  }

  function placeGardenItem(itemId, x, y) {
    if (isSpeciesPlanting(itemId)) {
      plantSpeciesSeed(itemId.slice('species:'.length), x, y)
      return
    }
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

  // Pick a home-tree spot for a newly-graduated resident: near an existing
  // grown tree/perch when she has one (so the garden feels lived-in), else a
  // gentle default near the centre of the lawn — always checked against
  // existing residents so a home spot never lands exactly on top of another.
  function pickHomeSpot(existingResidents) {
    const grownTrees = (data.garden?.plantings || [])
      .filter((p) => {
        const item = gardenItem(p.type)
        return item?.zone && item.zone !== 'water' && isFullyGrown(p)
      })
      .map((p) => ({ x: p.x ?? 200, y: p.y ?? 190 }))
    const anchors = grownTrees.length
      ? grownTrees
      : [{ x: (GARDEN_REGION.x0 + GARDEN_REGION.x1) / 2, y: (GARDEN_REGION.y0 + GARDEN_REGION.y1) / 2 }]
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const anchor = anchors[attempt % anchors.length]
      const x = anchor.x + (Math.random() - 0.5) * 60
      const y = anchor.y + (Math.random() - 0.5) * 30
      if (canPlaceResidentAt(x, y, existingResidents, data.garden?.expansions)) return { x, y }
    }
    // Fallback: region centre, even if a little close to another resident.
    return { x: (GARDEN_REGION.x0 + GARDEN_REGION.x1) / 2, y: (GARDEN_REGION.y0 + GARDEN_REGION.y1) / 2 }
  }

  // Graduate the current crowned companion into the garden — no placement tap
  // needed, she just settles near a home tree and sways there. Atomic: the old
  // companion is added to garden.residents (permanent, rendered as its real
  // species, with bornAt/releasedAt for the memory-wall nameplate) and the next
  // companion is resolved — adopted immediately if a mystery egg has already
  // hatched and is waiting, otherwise she enters the brief awaitingNextCompanion
  // gap until it does.
  function confirmReleaseToGarden() {
    if (readOnly || (account !== 'pooks' && account !== 'marnich')) return
    const tw = data.tweety || defaultTweety()
    const oldId = tw.companion
    if (!oldId) return
    const garden = data.garden || defaultGarden()
    const residents = garden.residents || []
    const name = tw.name || getCompanion(oldId)?.name || 'Tweety'
    const { x, y } = pickHomeSpot(residents)
    const resident = {
      id: createId('resident'),
      companionId: oldId,
      species: tw.realSpecies || companionSpecies(oldId),
      name,
      x,
      y,
      homeX: x,
      homeY: y,
      bornAt: tw.bornAt,
      releasedAt: new Date().toISOString(),
    }

    // The mystery egg is only ever warmable/hatchable AFTER a release — she
    // can bank progress toward one while raising a companion, but hatching
    // itself is the reward for releasing, never something that happens in
    // parallel. So release ALWAYS enters the awaiting-gap; if she'd already
    // banked an egg it just becomes warmable now (see warmMysteryEgg's
    // awaitingNextCompanion guard), rather than being auto-adopted here.
    const nextTweety = { ...tw, companion: null, awaitingNextCompanion: true, lastReleasedName: name }
    const toastBody = data.mysteryEgg
      ? `${resident.species || 'Your companion'} now lives in the garden forever. Your mystery egg is ready to warm — she's waiting to hatch!`
      : `${resident.species || 'Your companion'} now lives in the garden forever. Keep birding — your next mystery egg is still on its way.`

    commit(
      {
        ...data,
        garden: { ...garden, residents: [...residents, resident] },
        tweety: nextTweety,
        tweetyGrowthSeen: 0,
        messages: [tweetyReleaseKeepsakeMessage(name), ...(data.messages || [])],
      },
      { title: 'Graduated to the garden 🌳👑', body: toastBody, tone: 'success' },
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
    const displayName = planting.commonName || item?.name || 'plant'
    const nextWatered = (planting.wateredDays || 0) + 1
    const grown = nextWatered >= (item?.waterToGrow || Infinity)
    const next = plantings.map((p) =>
      p.id === plantingId ? { ...p, wateredDays: nextWatered, lastWaterDay: saDateKey() } : p,
    )
    commit(
      { ...data, garden: { ...garden, plantings: next } },
      grown
        ? { title: 'Fully grown! 🌳', body: `Your ${displayName} is all grown up — a permanent part of the garden.`, tone: 'success' }
        : { title: 'Watered 💧', body: `You watered your ${displayName}. Come back tomorrow for more growth.`, tone: 'calm' },
    )
  }

  // ----- Greenhouse (indoor potted-plant care loop) --------------------------
  // Tapping an empty slot only opens the species picker when there's actually
  // something to pot — these two informational toasts cover the "nothing to
  // plant yet" cases, fired from GreenhousePage before it ever opens the
  // picker (see onNothingToPlant).
  function greenhouseNothingToPlant(reason) {
    if (reason === 'no-plants') {
      setToast({ title: 'No plants yet', body: 'Explore the wild to discover plants!', tone: 'calm' })
    } else {
      setToast({ title: 'No seeds yet', body: 'Discover a new species to earn seeds 🌱', tone: 'calm' })
    }
  }

  // Explains why tapping a pot did nothing — locked slot, a dead plant
  // waiting to be cleared, or a pot already watered today — so a tap never
  // reads as "the app just ignored me".
  function greenhousePotBlocked(reason) {
    if (reason === 'locked') {
      setToast({ title: 'Locked', body: 'This slot is locked 🔒', tone: 'calm' })
    } else if (reason === 'dead') {
      setToast({ title: "Didn't make it", body: 'This plant has died — tap to remove', tone: 'warning' })
    } else {
      setToast({ title: 'Already watered', body: 'Already watered today 💧', tone: 'calm' })
    }
  }

  // Pot a real identified species from the Seed Pouch into a specific empty
  // slot — costs 1 seed only (cheaper commitment than the outdoor Garden's
  // seed+coins planting, since a pot is easy to clear and replant later).
  function potGreenhouseSpecies(slotId, speciesKey) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const slot = slotById(slotId)
    if (!slot || isSlotLocked(greenhouse, slot)) return
    if ((greenhouse.pots || []).some((p) => p.slot === slotId)) return
    if (data.seeds <= 0) return
    const species = data.plantLibrary.find((p) => p.speciesKey === speciesKey)
    if (!species) return
    if ((greenhouse.pots || []).some((p) => p.plantId === speciesKey)) return
    const pot = defaultPot({
      id: createId('pot'),
      slot: slotId,
      plantId: speciesKey,
      plantName: species.commonName,
      family: species.family,
      potStyle: greenhouse.selectedPotStyle,
    })
    commit(
      { ...data, seeds: data.seeds - 1, greenhouse: { ...greenhouse, pots: [...(greenhouse.pots || []), pot] } },
      { title: `Planted ${species.commonName}! 🌱`, body: 'Water it daily to watch it grow into the real thing.' },
      { immediate: true },
    )
  }

  function waterGreenhousePot(slotId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const pot = (greenhouse.pots || []).find((p) => p.slot === slotId)
    if (!pot || !canWaterPot(pot)) return
    const today = saDateKey()
    const watered = waterPots(greenhouse, [pot], today)
    const { greenhouse: nextGreenhouse, coinTotal, notes } = finalizeWatering(greenhouse, watered, today)
    commit(
      { ...data, featherCoins: data.featherCoins + coinTotal, greenhouse: nextGreenhouse },
      { title: 'Watered 💧', body: [`You watered your ${pot.plantName}.`, ...notes].join(' '), tone: 'calm' },
      { immediate: true },
    )
  }

  function waterAllGreenhousePots() {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const waterable = (greenhouse.pots || []).filter((p) => canWaterPot(p))
    if (!waterable.length) {
      setToast({ title: 'All done 💧', body: 'Every pot is already watered today.', tone: 'calm' })
      return
    }
    const today = saDateKey()
    const watered = waterPots(greenhouse, waterable, today)
    const { greenhouse: nextGreenhouse, coinTotal, notes } = finalizeWatering(greenhouse, watered, today)
    commit(
      { ...data, featherCoins: data.featherCoins + coinTotal, greenhouse: nextGreenhouse },
      {
        title: 'Watered all 💧',
        body: [`Watered ${waterable.length} pot${waterable.length === 1 ? '' : 's'}.`, ...notes].join(' '),
        tone: 'calm',
      },
      { immediate: true },
    )
  }

  // Requires Scissors (bought from the shop). +5 coins, clears the overgrown
  // flag and the extra daily health penalty that comes with leaving it.
  function trimGreenhousePot(slotId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const pot = (greenhouse.pots || []).find((p) => p.slot === slotId)
    if (!pot || pot.dead || !pot.needsTrimming) return
    if (!hasTool(greenhouse, 'scissors')) {
      setToast({ title: 'Need scissors ✂️', body: 'Buy scissors from the greenhouse shop to trim overgrown pots.', tone: 'warning' })
      return
    }
    const today = saDateKey()
    let nextPot = { ...pot, needsTrimming: false, lastTrimDate: today }
    nextPot.health = computeHealth(nextPot, today)
    const nextGreenhouse = { ...greenhouse, pots: greenhouse.pots.map((p) => (p.id === pot.id ? nextPot : p)) }
    commit(
      { ...data, featherCoins: data.featherCoins + TRIM_COINS, greenhouse: nextGreenhouse },
      { title: 'Trimmed ✂️', body: `Tidied up your ${pot.plantName}. +${TRIM_COINS} coins.`, tone: 'success' },
      { immediate: true },
    )
  }

  // Requires the Spray Bottle. Once per SA day per plant, +10 bonus health on
  // top of whatever watering already gave it.
  function mistGreenhousePot(slotId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const pot = (greenhouse.pots || []).find((p) => p.slot === slotId)
    if (!pot || pot.dead || !canMistPot(pot)) return
    if (!hasTool(greenhouse, 'spray-bottle')) {
      setToast({ title: 'Need a spray bottle 💦', body: 'Buy a spray bottle from the greenhouse shop first.', tone: 'warning' })
      return
    }
    const today = saDateKey()
    const nextPot = {
      ...pot,
      lastMistDate: today,
      health: Math.min(100, computeHealth(pot, today) + SPRAY_HEALTH_BONUS),
    }
    const nextGreenhouse = { ...greenhouse, pots: greenhouse.pots.map((p) => (p.id === pot.id ? nextPot : p)) }
    commit(
      { ...data, greenhouse: nextGreenhouse },
      { title: 'Misted 💦', body: `+${SPRAY_HEALTH_BONUS} bonus health for your ${pot.plantName}.`, tone: 'calm' },
      { immediate: true },
    )
  }

  // A dead plant just sits there (grey/brown) until she taps it to clear the
  // slot — never auto-removed, so the "oh no" moment isn't also a surprise
  // empty slot.
  function removeDeadGreenhousePot(slotId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const pot = (greenhouse.pots || []).find((p) => p.slot === slotId)
    if (!pot || !pot.dead) return
    const nextGreenhouse = { ...greenhouse, pots: greenhouse.pots.filter((p) => p.id !== pot.id) }
    commit(
      { ...data, greenhouse: nextGreenhouse },
      { title: 'Pot cleared', body: 'Ready for something new whenever she is.', tone: 'calm' },
      { immediate: true },
    )
  }

  // room defaults to 1 (room 2 only ever reachable once bought — see
  // buyGreenhouseRoom2 — so its own unlock button is only rendered then).
  function buyGreenhouseSlot(room = 1) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const inRoom2 = room === 2
    if (inRoom2 && !hasRoom2(greenhouse)) return
    const current = inRoom2 ? (greenhouse.unlockedSlotsRoom2 || 0) : greenhouse.unlockedSlots
    if (current >= ROOM_SLOT_COUNT) return
    if (data.featherCoins < SLOT_COST) {
      setToast({ title: 'Not enough coins yet', body: `Unlocking a pot slot costs ${SLOT_COST} 🪙.`, tone: 'warning' })
      return
    }
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - SLOT_COST,
        greenhouse: {
          ...greenhouse,
          ...(inRoom2 ? { unlockedSlotsRoom2: current + 1 } : { unlockedSlots: current + 1 }),
        },
      },
      { title: 'Pot slot unlocked! 🪴', body: 'A new spot on the shelf is ready for planting.' },
      { immediate: true },
    )
  }

  // Only offered once room 1's 8 slots are all unlocked. Adds a second,
  // identically-laid-out room to the right of the first (swipe the scene to
  // reach it — see GreenhouseScene's .pannable wrap) with its own 8 pot slots,
  // starting fully locked so it's its own progression, not a freebie.
  function buyGreenhouseRoom2() {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    if (hasRoom2(greenhouse)) return
    if ((greenhouse.unlockedSlots || 0) < MAX_SLOTS) return
    if (data.featherCoins < ROOM2_COST) {
      setToast({ title: 'Not enough coins yet', body: `Expanding the greenhouse costs ${ROOM2_COST} 🪙.`, tone: 'warning' })
      return
    }
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - ROOM2_COST,
        greenhouse: { ...greenhouse, roomsUnlocked: 2, unlockedSlotsRoom2: 0 },
      },
      { title: 'Greenhouse expanded! 🏡🌿', body: 'A second glasshouse room is ready — swipe right to see it.' },
      { immediate: true },
    )
  }

  function buyGreenhousePotStyle(styleId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const style = potStyleItem(styleId)
    if (!style || (greenhouse.ownedPotStyles || []).includes(styleId)) return
    if (data.featherCoins < style.cost) {
      setToast({ title: 'Not enough coins yet', body: `${style.name} costs ${style.cost} 🪙.`, tone: 'warning' })
      return
    }
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - style.cost,
        greenhouse: {
          ...greenhouse,
          ownedPotStyles: [...greenhouse.ownedPotStyles, styleId],
          selectedPotStyle: styleId,
        },
      },
      { title: `${style.name} unlocked! 🪴`, body: "Selected as her pot style — new plantings will use it." },
      { immediate: true },
    )
  }

  // Switching style only ever affects pots planted from now on — existing
  // pots keep whatever style they were planted with (see potGreenhouseSpecies).
  function selectGreenhousePotStyle(styleId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    if (!(greenhouse.ownedPotStyles || []).includes(styleId)) return
    commit(
      { ...data, greenhouse: { ...greenhouse, selectedPotStyle: styleId } },
      { title: 'Pot style selected', body: 'New plantings will use it.', tone: 'calm' },
      { immediate: true },
    )
  }

  function buyGreenhouseTool(toolId) {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const tool = toolItem(toolId)
    if (!tool) return
    if (!tool.consumable && hasTool(greenhouse, toolId)) return
    if (tool.consumable && ownedToolUses(greenhouse, toolId) > 0) return
    if (data.featherCoins < tool.cost) {
      setToast({ title: 'Not enough coins yet', body: `${tool.name} costs ${tool.cost} 🪙.`, tone: 'warning' })
      return
    }
    const ownedTools = tool.consumable
      ? [...(greenhouse.ownedTools || []).filter((t) => t.id !== toolId), { id: toolId, uses: tool.uses }]
      : [...(greenhouse.ownedTools || []), { id: toolId, uses: null }]
    commit(
      { ...data, featherCoins: data.featherCoins - tool.cost, greenhouse: { ...greenhouse, ownedTools } },
      {
        title: `${tool.name} ${tool.emoji}`,
        body: tool.consumable ? `${tool.uses} uses ready in your greenhouse toolkit.` : 'Added to your greenhouse toolkit.',
      },
      { immediate: true },
    )
  }

  // Recomputes every pot's health from its care record and applies decay —
  // run once when the Greenhouse page mounts (see GreenhousePage's
  // onMountRecalc), never on a timer, so opening the page is what "checks
  // in" on the plants. Purely derived (computeHealth never mutates in
  // place), so this is safe to call as often as she visits with zero risk of
  // double-decaying a pot.
  function recalcGreenhouseHealth() {
    const greenhouse = data.greenhouse || defaultGreenhouse()
    const today = saDateKey()
    let changed = false
    const newlyDead = []
    const nextPots = (greenhouse.pots || []).map((pot) => {
      if (pot.dead) return pot
      const health = computeHealth(pot, today)
      if (health === pot.health) return pot
      changed = true
      if (health <= 0) {
        newlyDead.push(pot)
        return { ...pot, health: 0, dead: true }
      }
      return { ...pot, health }
    })
    if (!changed) return
    commit(
      { ...data, greenhouse: { ...greenhouse, pots: nextPots } },
      newlyDead.length
        ? { title: 'Oh no! 😢', body: newlyDead.map((p) => `Your ${p.plantName} didn't make it 😢`).join(' '), tone: 'warning' }
        : { title: 'Greenhouse checked 🌿', body: 'Checked in on your plants.', tone: 'calm' },
      { immediate: true },
    )
  }

  // Buy a garden resident a treat: a small, repeatable coin sink (unlike the
  // one-off shop items) that plays a happy-eating reaction on her sprite.
  // Returns true/false so GardenPage only plays the animation on a real
  // charge, never on a rejected one (readOnly / can't afford it).
  function treatResident(residentId) {
    if (readOnly) return false
    const garden = data.garden || defaultGarden()
    const residents = garden.residents || []
    const resident = residents.find((r) => r.id === residentId)
    if (!resident) return false
    if (data.featherCoins < RESIDENT_TREAT_COST) {
      setToast({ title: 'Not enough coins yet', body: `A treat costs ${RESIDENT_TREAT_COST} 🪙.`, tone: 'warning' })
      return false
    }
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - RESIDENT_TREAT_COST,
        garden: {
          ...garden,
          residents: residents.map((r) =>
            r.id === residentId
              ? { ...r, treatsGiven: (r.treatsGiven || 0) + 1, lastTreatAt: new Date().toISOString() }
              : r,
          ),
        },
      },
      { title: `${resident.name} loved that! 🍓`, body: 'A happy little treat.', tone: 'success' },
    )
    return true
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

  // Toggles plant-feature visibility on WHICHEVER account is currently
  // active — only reachable from the sandbox toolbar, which only ever
  // renders while viewing Marnich's own 'marnich' account (marnichMode ===
  // 'sandbox'), so this can never touch Pooks' real releaseFlags. Completely
  // independent from releasePlantsToPooks — flipping this never affects her.
  function toggleSandboxPlantFeatures() {
    if (readOnly) return
    setData((c) => ({
      ...c,
      settings: {
        ...c.settings,
        releaseFlags: { ...c.settings.releaseFlags, plants: !c.settings.releaseFlags?.plants },
      },
    }))
  }

  // Copies Pooks' current REAL account into Marnich's own sandbox account so
  // he can test from her exact perspective. Only ever reachable from the
  // sandbox toolbar (marnichMode === 'sandbox'), and only ever WRITES to the
  // 'marnich' backend slot — her account is only ever read here, never saved.
  // Her own login secret is preserved on the mirrored copy (not overwritten
  // with Pooks') so this sandbox account keeps logging in the same way.
  async function mirrorPooksToSandbox() {
    if (readOnly || session.role !== 'marnich' || marnichMode !== 'sandbox') return
    if (
      !window.confirm(
        "Copy Pooks' current real account into your test sandbox? This replaces your sandbox data — her real account is never touched.",
      )
    )
      return
    const [pooksRemote, marnichRemote] = await Promise.all([
      fetchRemoteState('pooks'),
      fetchRemoteState('marnich'),
    ])
    if (!pooksRemote || !pooksRemote.state) {
      setToast({
        title: 'Mirror failed',
        body: "Couldn't fetch Pooks' live state — check your connection and try again.",
        tone: 'warning',
      })
      return
    }
    const mirrored = {
      ...pooksRemote.state,
      settings: {
        ...pooksRemote.state.settings,
        marnichSecret: marnichRemote?.state?.settings?.marnichSecret || MARNICH_DEFAULT_SECRET,
      },
    }
    const saveRes = await saveRemoteState('marnich', mirrored, marnichRemote?.version || 0)
    if (!saveRes || saveRes.conflict) {
      setToast({
        title: 'Mirror failed',
        body: 'Sandbox save conflicted — try again in a moment.',
        tone: 'warning',
      })
      return
    }
    adoptState('marnich', mirrored, saveRes.version)
    setActivePage('home')
    setToast({
      title: 'Sandbox mirrored 🔄',
      body: "Your test sandbox now matches Pooks' real account exactly.",
      tone: 'success',
    })
  }

  // Wipes the sandbox back to a blank fresh account — local cache only, then
  // lets the normal autosave effect persist that blank slate to the 'marnich'
  // backend slot. Never touches Pooks' account (readOnly guard + only ever
  // rendered from the sandbox toolbar).
  function resetSandbox() {
    if (readOnly || session.role !== 'marnich' || marnichMode !== 'sandbox') return
    if (
      !window.confirm(
        'Reset your test sandbox to a blank account? This clears sandbox data only — Pooks’ real progress is never touched.',
      )
    )
      return
    const fresh = buildDefaultState()
    localStorage.removeItem(storageKeyForAccount('marnich'))
    setData(fresh)
    setActivePage('home')
    setToast({
      title: 'Sandbox reset 🔄',
      body: "Your test sandbox is back to a blank account. Pooks' real progress was never touched.",
      tone: 'calm',
    })
  }

  // Sandbox testing helper: instantly bank a mystery egg, bypassing the
  // 5-species gate (and overwriting any existing one) so the hatch/release
  // loop can be tested without birding through real milestones first.
  function forceMysteryEgg() {
    if (readOnly) return
    setData((c) => ({
      ...c,
      mysteryEgg: {
        id: createId('egg'),
        createdAt: new Date().toISOString(),
        warms: 0,
        lastWarmDay: '',
        ...emptyMysteryEgg(),
      },
      messages: [mysteryEggDiscoveredMessage(), ...(c.messages || [])],
    }))
    setConfetti(Date.now())
    setToast({
      title: 'Sandbox: egg forced 🥚',
      body: 'A mystery egg has been banked for testing.',
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
      { immediate: true },
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

    // Clear the mystery egg's daily warm gate too, so its 3-day cycle can be
    // rapid-tested the same way.
    const mysteryEgg = data.mysteryEgg ? { ...data.mysteryEgg, lastWarmDay: '' } : data.mysteryEgg

    // Age the greenhouse too: every date it tracks (plantedDate, wateredDays,
    // lastTrimDate, lastMistDate, lastWaterDate) shifts back a day, so health
    // decay, the trim penalty and the water streak can all be tested in
    // minutes instead of days — see ageGreenhouseByOneDay in greenhouseData.js.
    const greenhouse = data.greenhouse ? ageGreenhouseByOneDay(data.greenhouse) : data.greenhouse

    setData((c) => ({
      ...c,
      tweety: nextTweety,
      dailyChallengeCompletions: nextCompletions,
      garden,
      greenhouse,
      mysteryEgg,
    }))
    setToast({
      title: 'Fast-forwarded 1 day ⏩',
      body: `${note} Care windows, daily challenge, garden + greenhouse watering, and mystery egg reset.`.trim(),
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
  // Both players earn coins for playing a Bird Battle: 100 for a win, 40 for a
  // draw, 25 for a loss (a small thank-you, never a penalty).
  const GAME_WIN_COINS = 100
  const GAME_DRAW_COINS = 40
  const GAME_LOSS_COINS = 25

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
    // Same friendly payout as the online path: 100 win / 40 draw / 25 loss,
    // always a small gain for the local player (Pooks on this device).
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

  // Weekly magazine quiz: 50 coins for finishing, but only once per week.
  function claimWeeklyQuiz(week) {
    if (data.weeklyQuizClaimedWeek === week) return
    commit(
      { ...data, weeklyQuizClaimedWeek: week, featherCoins: data.featherCoins + 50 },
      {
        title: 'Weekly Bird Quiz complete! 🧠',
        body: 'The Bird Council added 50 Feather Coins to your bank 🪙',
      },
    )
  }

  // Weekly Plant Corner quiz: coins plus seeds (the plant economy's currency,
  // see addPlant()), once per issue.
  function claimWeeklyPlantQuiz(issueIndex) {
    if (data.weeklyPlantQuizClaimedWeek === issueIndex) return
    commit(
      {
        ...data,
        weeklyPlantQuizClaimedWeek: issueIndex,
        seeds: data.seeds + 3,
        featherCoins: data.featherCoins + 50,
      },
      {
        title: 'Weekly Plant Quiz complete! 🌿',
        body: 'The Head Botanist added 50 Feather Coins and 3 seeds to your pouch 🌱',
      },
    )
  }

  // New-issue popup on Home: marks the current weekly issue as seen so the
  // auto-popup never re-fires for it — only the next issue.week re-triggers
  // it. No reward attached, so a plain silent setData (not commit()) is fine.
  function markMagazineIssueSeen(week) {
    if (readOnly) return
    setData((c) => (c.magazineIssueSeenWeek === week ? c : { ...c, magazineIssueSeenWeek: week }))
  }

  function setTrashTalk(message) {
    setData((c) => ({ ...c, games: { ...c.games, trashTalk: String(message || '').trim() } }))
    setToast({
      title: 'Trash talk sent 😏',
      body: "It will show on Pooks' games screen.",
      tone: 'success',
    })
  }

  function commit(nextState, message, { immediate = false } = {}) {
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
    // Mystery egg: every 5th new unique species banks one, provided she isn't
    // already holding one (no stacking — lastAwardedAtCount always advances,
    // whether or not this crossing actually produced a new egg). Runs here so
    // every path that adds a species (photo AI, manual add, future paths)
    // triggers it for free, exactly like the milestone-coin bonus above.
    let awardedEgg = false
    const prevEggProgress = data.eggProgress || { lastAwardedAtCount: 0 }
    const nextMultiple = Math.floor(recalculated.birds.length / 5) * 5
    if (nextMultiple > (prevEggProgress.lastAwardedAtCount || 0)) {
      const eggProgress = { ...prevEggProgress, lastAwardedAtCount: nextMultiple }
      if (!recalculated.mysteryEgg) {
        awardedEgg = true
        recalculated = {
          ...recalculated,
          eggProgress,
          featherCoins: recalculated.featherCoins + COINS.mysteryEgg,
          mysteryEgg: {
            id: createId('egg'),
            createdAt: new Date().toISOString(),
            warms: 0,
            lastWarmDay: '',
            ...emptyMysteryEgg(),
          },
          messages: [mysteryEggDiscoveredMessage(), ...(recalculated.messages || [])],
        }
      } else {
        recalculated = { ...recalculated, eggProgress }
      }
    }
    // While gifts are hidden for Pooks, the reward still unlocks silently in her
    // state (so it's ready when gifts return) but we fire NO notification about
    // it — no unlock popup, no "Snack from Marnich" achievement letter, no toast
    // summary, no email to Marnich.
    const unlockSummary = giftsEnabled ? getUnlockSummary(data, recalculated) : ''
    const unlockedRewards = giftsEnabled ? getNewlyUnlockedRewards(data, recalculated) : []
    setData(recalculated)
    // Mirror into dataRef synchronously, not just via the render-body copy
    // below (`dataRef.current = data`) — an immediate save's queued turn can
    // run as soon as the next microtask, and this way it reads `recalculated`
    // deterministically instead of depending on React having already
    // re-rendered by then.
    dataRef.current = recalculated
    // High-value care actions (careTweety) opt into an immediate save instead
    // of waiting the full 10s debounce — see the mobile-backgrounding
    // reversion bug this fixes. Goes through queueSync (not called directly)
    // so it reads dataRef.current fresh rather than racing any other
    // in-flight save.
    if (immediate) queueSync()
    if (unlockedRewards.length) {
      setRewardUnlockQueue((current) => [...current, ...unlockedRewards])
      // Email Marnich about each freshly unlocked gift.
      unlockedRewards.forEach((reward) => notifyMarnich('gift', { giftName: reward.name }))
    }
    if (milestoneBonus > 0 || awardedEgg) setConfetti(Date.now())
    // Each freshly unlocked milestone reward also lands as an official Council
    // letter in the inbox.
    if (unlockedRewards.length) {
      const letters = unlockedRewards.map((reward) =>
        milestoneSystemMessage(reward.name, reward.milestone),
      )
      setData((current) => ({ ...current, messages: [...letters, ...(current.messages || [])] }))
    }
    const eggNote = awardedEgg ? ` A rare egg has been discovered in your honour! +${COINS.mysteryEgg} Feather Coins 🥚` : ''
    setToast({
      title: message.title,
      body: [message.body, milestoneNote, eggNote, unlockSummary].filter(Boolean).join(' '),
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

  function openPlantProfile(plantId) {
    setPlantProfileId(plantId)
    setActivePage('plantProfile')
  }

  function closePlantProfile() {
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

  // Plants: much simpler than addBird — no milestone coins, no mystery-egg
  // machinery, no discovery drama. A confirmed species earns exactly one seed
  // for the pouch the first time it's ever logged; repeat sightings of the
  // same species bump timesLogged/lastSpotted on the existing entry instead
  // of creating a duplicate (My Plants shows one card per species).
  function addPlant(match, photo) {
    const commonName = String(match?.commonName || '').trim()
    const scientificName = String(match?.scientificName || '').trim()
    const speciesKey = normalizeBirdName(scientificName || commonName)
    if (!speciesKey) return null

    const existingIndex = data.plantLibrary.findIndex((plant) => plant.speciesKey === speciesKey)
    const isNewSpecies = existingIndex === -1
    const seedsEarned = isNewSpecies ? 1 : 0
    const today = todayValue()
    const entry = isNewSpecies
      ? {
          id: createId('plant'),
          speciesKey,
          commonName,
          afrikaansName: String(match?.afrikaansName || ''),
          scientificName,
          family: String(match?.family || ''),
          confidence: match?.confidence || 0,
          funFact: String(match?.funFact || ''),
          careTips: String(match?.careTips || ''),
          referenceImageUrl: String(match?.imageUrl || ''),
          photo: photo || '',
          dateSpotted: today,
          lastSpotted: today,
          timesLogged: 1,
          createdAt: new Date().toISOString(),
        }
      : data.plantLibrary[existingIndex]
    const nextPlantLibrary = isNewSpecies
      ? [entry, ...data.plantLibrary]
      : data.plantLibrary.map((plant, index) =>
          index === existingIndex
            ? {
                ...plant,
                lastSpotted: today,
                timesLogged: (plant.timesLogged || 1) + 1,
                // Fill in a personal photo if she didn't have one yet; never
                // overwrite a photo she already took.
                photo: plant.photo || photo || '',
              }
            : plant,
        )
    const crossedLevel = isNewSpecies
      ? PLANT_LEVELS.find(
          (lvl) => data.plantLibrary.length < lvl.threshold && nextPlantLibrary.length >= lvl.threshold,
        )
      : null
    const levelCoins = crossedLevel?.coins || 0
    const speciesCoins = isNewSpecies ? COINS.newPlantSpecies : 0

    commit(
      {
        ...data,
        plantLibrary: nextPlantLibrary,
        seeds: data.seeds + seedsEarned,
        featherCoins: data.featherCoins + speciesCoins + levelCoins,
        messages: crossedLevel
          ? [botanicalCertificateMessage(crossedLevel), ...(data.messages || [])]
          : data.messages,
      },
      {
        title: isNewSpecies ? 'New plant discovered! 🌿' : 'Logged again 🌱',
        body: [
          isNewSpecies
            ? `The Head Botanist has confirmed the ${commonName}. +1 seed and +${speciesCoins} Feather Coins 🌱`
            : `The ${commonName} is already in your collection — logged again for the memory.`,
          crossedLevel ? `Promoted to ${crossedLevel.name}! +${levelCoins} Feather Coins 🏅` : '',
        ]
          .filter(Boolean)
          .join(' '),
      },
    )

    if (isNewSpecies) {
      setConfetti(Date.now())
      setReveal({
        tone: 'plant',
        title: crossedLevel ? `Promoted: ${crossedLevel.name}! 🌿` : 'New plant discovered! 🌿',
        body: [
          `The Council's Head Botanist has confirmed this specimen as the ${commonName}${
            entry.afrikaansName ? ` (${entry.afrikaansName})` : ''
          }. +1 seed for your pouch and +${speciesCoins} Feather Coins 🌱`,
          crossedLevel
            ? `You've been promoted to ${crossedLevel.name}! +${levelCoins} Feather Coins 🏅 A full certificate is waiting in your inbox.`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        photo: photo || entry.referenceImageUrl || '',
      })
    }

    return { commonName, isNewSpecies, seedsEarned, level: crossedLevel || null }
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

  // Buy a Tweety Store item. Consumables ('treats') are always buyable and
  // just extend tweety.treatsBoostUntil — everything else is a one-off: deduct
  // coins once, record the id so it shows "Gifted ✓" forever (state.tweetyStore),
  // and pop a small celebration toast. Idempotent for one-offs — a second click
  // on an already-owned item is a no-op (the button is disabled anyway).
  function buyTweetyStoreItem(itemId) {
    const item = TWEETY_STORE_ITEMS.find((entry) => entry.id === itemId)
    if (!item) return
    const owned = Array.isArray(data.tweetyStore) ? data.tweetyStore : []
    // 'nest' is the pre-redesign Nest Upgrade id — same cozy-tier effect as
    // 'cozynest', so owning one blocks re-buying the other (never charge
    // twice for the same upgrade).
    const equivalentOwned = item.id === 'cozynest' && owned.includes('nest')
    if (item.kind !== 'consumable' && (owned.includes(item.id) || equivalentOwned)) return
    if (data.featherCoins < item.cost) return notEnoughCoins()

    if (item.kind === 'consumable') {
      // Boost lasts until the end of today (SA-local midnight), same "for the
      // day" framing as her other daily mechanics.
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      setConfetti(Date.now())
      setTweetyDancing(true)
      window.setTimeout(() => setTweetyDancing(false), 2600)
      setJustPurchasedItem(item.id)
      window.setTimeout(() => setJustPurchasedItem((cur) => (cur === item.id ? null : cur)), 700)
      commit(
        {
          ...data,
          featherCoins: data.featherCoins - item.cost,
          tweety: {
            ...data.tweety,
            treatsBoostUntil: endOfToday.getTime(),
            ...happinessDelta(data.tweety, HAPPINESS_GAIN.storePurchase),
          },
        },
        { title: `${item.emoji} ${item.name}!`, body: `Tweety is thrilled — happy all day. ${item.emoji}` },
        { immediate: true },
      )
      return
    }

    setConfetti(Date.now())
    setTweetyDancing(true)
    window.setTimeout(() => setTweetyDancing(false), 2600)
    setJustPurchasedItem(item.id)
    window.setTimeout(() => setJustPurchasedItem((cur) => (cur === item.id ? null : cur)), 700)
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - item.cost,
        tweetyStore: [...owned, item.id],
        tweety: { ...data.tweety, ...happinessDelta(data.tweety, HAPPINESS_GAIN.storePurchase) },
      },
      { title: `${item.emoji} ${item.name} gifted!`, body: `Tweety loves it. ${item.emoji}` },
      { immediate: true },
    )
  }

  // Buy + immediately switch to a Room Theme (mirrors buyGreenhousePotStyle's
  // buy-and-select-in-one pattern). Free themes (just 'cottage' today) can't
  // be re-bought — selectRoomTheme below handles switching back to one
  // already owned.
  function buyRoomTheme(themeId) {
    const theme = ROOM_THEME_CATALOG.find((entry) => entry.id === themeId)
    if (!theme) return
    const owned = data.tweety?.ownedRoomThemes || ['cottage']
    if (owned.includes(themeId)) return
    if (data.featherCoins < theme.cost) return notEnoughCoins()
    commit(
      {
        ...data,
        featherCoins: data.featherCoins - theme.cost,
        tweety: {
          ...data.tweety,
          ownedRoomThemes: [...owned, themeId],
          roomTheme: themeId,
        },
      },
      { title: `${theme.emoji} ${theme.name} unlocked!`, body: "Tweety's home has a whole new look." },
      { immediate: true },
    )
  }

  // Switching only ever affects an already-owned theme — free, no coins,
  // just a preference change, same shape as selectGreenhousePotStyle.
  function selectRoomTheme(themeId) {
    const owned = data.tweety?.ownedRoomThemes || ['cottage']
    if (!owned.includes(themeId)) return
    commit(
      { ...data, tweety: { ...data.tweety, roomTheme: themeId } },
      { title: 'Room theme changed', body: "Tweety's home has a new look.", tone: 'calm' },
      { immediate: true },
    )
  }

  // The song hint ("🎵 Tap to hear Tweety sing") shows once ever — a plain
  // silent setData is enough (no reward/toast attached), same as
  // markMagazineIssueSeen.
  function markSongHintSeen() {
    if (readOnly) return
    setData((c) => (c.tweety?.songHintSeen ? c : { ...c, tweety: { ...c.tweety, songHintSeen: true } }))
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

  // Explicit "release to Pooks" gate for feature areas built ahead of time in
  // Marnich's sandbox. Nothing gated on plantsReleased (see render below)
  // reaches her real account until this runs — only reachable from the admin
  // panel, which always operates on her live account (see adminLogin).
  function releasePlantsToPooks() {
    commit(
      {
        ...data,
        settings: {
          ...data.settings,
          releaseFlags: { ...data.settings.releaseFlags, plants: true },
        },
      },
      {
        title: 'Plants released to Pooks 🌿',
        body: "The plant features are now live on her real account — she'll see them the next time the Botanical Division reveal reaches her.",
      },
    )
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
  // Inbox lives in the bottom nav and the Magazine now lives on Home, so the
  // gear menu only carries the role-specific extras (Pooks: Bird Battles;
  // Admin: full feature set).
  const fullMenu =
    session?.role === 'admin'
      ? [...menuItems, ['admin', 'Admin', '🔒']]
      : account === 'marnich'
        ? [['games', 'Bird Battles', '⚔️'], ['garden', 'Bird Garden', '🌳'], ['companiongallery', 'Companion Gallery', '🧪']]
        : [['games', 'Bird Battles', '⚔️'], ['garden', 'Bird Garden', '🌳']]
  const unreadMessages = (data.messages || []).filter((m) => !m.read).length

  if (!session) {
    if (adminGate) {
      return <AdminGate onLogin={adminLogin} onCancel={() => setAdminGate(false)} />
    }
    if (pooksMaintenance) {
      return <MaintenanceGate data={data} onLogin={login} />
    }
    return <LoginScreen data={data} onLogin={login} />
  }

  // Enforce maintenance mode for an ALREADY-authenticated Pooks session too —
  // see the polling effect above. No tap-reveal here (unlike MaintenanceGate):
  // she's already past login, so there's nothing to reveal her back into
  // until an admin turns it off. Deliberately session.role, not account —
  // Marnich's own session (including his read-only mirror of her, which
  // shares account === 'pooks') is never gated by this.
  if (session.role === 'pooks' && pooksMaintenance) {
    return <MaintenanceLock />
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

  // Botanical Division cinematic reveal — the plant-scanning equivalent of the
  // intro above, shown once per account after the bird intro. Gated on
  // plantsReleased so it can never surface to Pooks' real account ahead of an
  // explicit release (see releasePlantsToPooks), while Marnich's sandbox
  // always sees it once built, for testing. Completing it IS the unlock —
  // plantScanningUnlocked flips here, not via a separately-read inbox letter.
  if (
    !readOnly &&
    (session.role === 'pooks' || session.role === 'marnich') &&
    plantsReleased &&
    !data.settings.botanicalRevealSeen
  ) {
    return (
      <BotanicalReveal
        letterBody={botanicalDispatchMessage().body}
        missionTarget={PLANT_LEVELS[0].threshold}
        onComplete={() => {
          setData((current) => ({
            ...current,
            settings: {
              ...current.settings,
              botanicalRevealSeen: true,
              plantScanningUnlocked: true,
            },
            // The letter becomes a permanent, already-read keepsake in her
            // inbox — she just experienced it, no need to re-read it there.
            messages: [{ ...botanicalDispatchMessage(), read: true }, ...(current.messages || [])],
          }))
          setActivePage('home')
        }}
      />
    )
  }

  // No egg picker anymore: Tweety is the companion from the first login and
  // grows through her five stages via daily care.

  // Graduating a crowned companion takes over the screen with the companion
  // picker to choose who she raises next. Mirrors the login/intro early-return
  // pattern. Gated on !readOnly so Marnich's read-only "View Pooks" mirror can
  // never trigger it on her behalf.
  if (releasingCompanion && !readOnly && data.tweety?.companion) {
    return (
      <ReleaseCeremony
        tweety={data.tweety}
        companionId={data.tweety.companion}
        onDone={() => {
          setReleasingCompanion(false)
          confirmReleaseToGarden()
          setActivePage('garden')
        }}
      />
    )
  }

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
          <button
            className="marnich-ff-btn sandbox-egg-btn"
            type="button"
            onClick={forceMysteryEgg}
            title="Bank a mystery egg instantly, bypassing the 5-species gate"
          >
            🥚 Force new egg
          </button>
          <button
            className="marnich-ff-btn sandbox-plants-btn"
            type="button"
            onClick={toggleSandboxPlantFeatures}
            title="Enable/disable plant features on THIS sandbox account only — never affects Pooks"
          >
            {plantsReleased ? '🌿 Plants: ON (sandbox)' : '🌿 Plants: OFF (sandbox)'}
          </button>
          <button
            className="marnich-ff-btn sandbox-mirror-btn"
            type="button"
            onClick={mirrorPooksToSandbox}
            title="Copy Pooks' current real account into this sandbox, read-only from her side"
          >
            🔄 Mirror Pooks
          </button>
          <button
            className="marnich-ff-btn sandbox-reset-btn"
            type="button"
            onClick={resetSandbox}
            title="Wipe this sandbox back to a blank account — never touches Pooks' real data"
          >
            🔄 Reset Sandbox
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
            openPlantProfile={openPlantProfile}
            season={season}
            tweetyView={tweetyView}
            tweetyDancing={tweetyDancing}
            justPurchasedItem={justPurchasedItem}
            missedYou={missedYou}
            careTweety={careTweety}
            releaseAviaryBird={releaseAviaryBird}
            tapWorldEvent={tapWorldEvent}
            resolveWorldEvent={resolveWorldEvent}
            onReleaseToGarden={!readOnly ? () => setReleasingCompanion(true) : undefined}
            onWarmMysteryEgg={warmMysteryEgg}
            onChooseEggSpecies={chooseEggSpecies}
            plantScannerVisible={plantScannerVisible}
            claimWeeklyQuiz={claimWeeklyQuiz}
            claimWeeklyPlantQuiz={claimWeeklyPlantQuiz}
            readOnly={readOnly}
            markMagazineIssueSeen={markMagazineIssueSeen}
            onHeardSong={markSongHintSeen}
            onSettleHappiness={settleHappinessDecay}
            goToPlants={() => {
              setExploreMode('plants')
              setActivePage('explore')
            }}
          />
        )}
        {activePage === 'companiongallery' && account === 'marnich' && (
          <CompanionGalleryPage onBack={goBack} />
        )}
        {activePage === 'garden' && (account === 'pooks' || account === 'marnich') && (
          <GardenPage
            garden={data.garden}
            coins={data.featherCoins}
            collection={gardenVisitors}
            onPlace={placeGardenItem}
            onWater={waterGardenPlant}
            onTreatResident={treatResident}
            onWish={wishAtWell}
            onPurchaseExpansion={purchaseExpansion}
            onBack={goBack}
            tweety={data.tweety}
            seeds={data.seeds}
            plantableSpecies={plantableSpecies}
          />
        )}
        {activePage === 'greenhouse' && (account === 'pooks' || account === 'marnich') && (
          <GreenhousePage
            onBack={goBack}
            greenhouse={data.greenhouse || defaultGreenhouse()}
            plantLibrary={data.plantLibrary}
            plantableSpecies={plantableForGreenhouse}
            seeds={data.seeds}
            coins={data.featherCoins}
            onPlant={potGreenhouseSpecies}
            onNothingToPlant={greenhouseNothingToPlant}
            onBlockedTap={greenhousePotBlocked}
            onWater={waterGreenhousePot}
            onWaterAll={waterAllGreenhousePots}
            onTrim={trimGreenhousePot}
            onMist={mistGreenhousePot}
            onRemoveDead={removeDeadGreenhousePot}
            onBuySlot={buyGreenhouseSlot}
            onBuyRoom2={buyGreenhouseRoom2}
            onBuyPotStyle={buyGreenhousePotStyle}
            onSelectPotStyle={selectGreenhousePotStyle}
            onBuyTool={buyGreenhouseTool}
            onMountRecalc={recalcGreenhouseHealth}
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
          <SpotHubPage
            addBird={addBird}
            birdLibrary={data.birdLibrary}
            addPlant={addPlant}
            plantScanningUnlocked={plantScannerVisible}
          />
        )}
        {activePage === 'birds' && (
          <BirdsPage data={data} openBirdProfile={openBirdProfile} />
        )}
        {activePage === 'library' && (
          <CollectionHubPage
            data={data}
            openBirdProfile={openBirdProfile}
            openPlantProfile={openPlantProfile}
            goToSpot={() => setActivePage('add')}
            plantScannerVisible={plantScannerVisible}
          />
        )}
        {activePage === 'explore' && (
          <ExploreHubPage
            data={data}
            openBirdProfile={openBirdProfile}
            openPlantProfile={openPlantProfile}
            plantScannerVisible={plantScannerVisible}
            exploreMode={exploreMode}
            setExploreMode={setExploreMode}
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
        {activePage === 'plantProfile' && (
          <PlantProfilePage data={data} plantId={plantProfileId} onBack={closePlantProfile} />
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
            buyTweetyStoreItem={buyTweetyStoreItem}
            buyRoomTheme={buyRoomTheme}
            selectRoomTheme={selectRoomTheme}
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
            onReadMagazine={goToMagazineSection}
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
            previewMagazineIssue={goToMagazineSection}
            sandbox={sandbox}
            onSendMessage={sendMarnichInboxMessage}
            setData={setData}
            releasePlantsToPooks={releasePlantsToPooks}
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

// Shown instead of LoginScreen, before anyone has logged in, while Pooks'
// settings.pooksMaintenanceMode is on (toggled from the Admin panel). Marnich
// still needs a way in while it's up: 5 quick taps on the bird — the same
// secret-tap timing as handleBrandTap's admin gate — reveals the real login
// form underneath.
function MaintenanceMessage({ logo }) {
  return (
    <>
      {logo}
      <p className="login-tag" id="maintenance-title">The Bird Council is upgrading headquarters 🪶</p>
      <p className="login-sub maintenance-message">
        The Bird Council is currently upgrading Field Agent Pooks&rsquo; headquarters. Our
        engineers are working hard to make everything more beautiful. Please check back soon.
        🪶✨
      </p>
      <p className="maintenance-signoff">Back soon, Pooks 💛 — Marnich</p>
    </>
  )
}

function MaintenanceGate({ data, onLogin }) {
  const [revealed, setRevealed] = useState(false)
  const tapRef = useRef({ count: 0, last: 0 })
  const season = getSeasonInfo()

  if (revealed) return <LoginScreen data={data} onLogin={onLogin} />

  function handleTap() {
    const now = Date.now()
    const tracker = tapRef.current
    tracker.count = now - tracker.last < 600 ? tracker.count + 1 : 1
    tracker.last = now
    if (tracker.count >= 5) setRevealed(true)
  }

  return (
    <main className={`login-screen season-${season.key}`}>
      <div className="season-wash" aria-hidden="true" />
      <SeasonalAmbient />
      <section className="login-card maintenance-card" aria-labelledby="maintenance-title">
        <MaintenanceMessage
          logo={
            <button
              type="button"
              className="login-logo maintenance-tap"
              onClick={handleTap}
              aria-label="Bird Council seal"
            >
              <WeeklyBird size={88} />
            </button>
          }
        />
      </section>
    </main>
  )
}

// Same message, but for a session that's ALREADY authenticated as Pooks —
// no tap-reveal escape hatch (there's no login screen to reveal her back
// into; she only gets back in once an admin turns maintenance mode off).
function MaintenanceLock() {
  const season = getSeasonInfo()
  return (
    <main className={`login-screen season-${season.key}`}>
      <div className="season-wash" aria-hidden="true" />
      <SeasonalAmbient />
      <section className="login-card maintenance-card" aria-labelledby="maintenance-title">
        <MaintenanceMessage logo={<div className="login-logo"><WeeklyBird size={88} /></div>} />
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
          {reveal.tone === 'note'
            ? '💌'
            : reveal.tone === 'date'
              ? '💕'
              : reveal.tone === 'bird'
                ? '✨'
                : reveal.tone === 'plant'
                  ? '🌿'
                  : '🎁'}
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
  openPlantProfile,
  season,
  tweetyView,
  tweetyDancing,
  justPurchasedItem,
  missedYou,
  careTweety,
  onSettleHappiness,
  releaseAviaryBird,
  tapWorldEvent,
  resolveWorldEvent,
  onReleaseToGarden,
  onWarmMysteryEgg,
  onChooseEggSpecies,
  plantScannerVisible = false,
  claimWeeklyQuiz,
  claimWeeklyPlantQuiz,
  goToPlants,
  readOnly = false,
  markMagazineIssueSeen,
  onHeardSong,
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

  // Magazine issue: same weekly issue key the full magazine section (below)
  // already uses, so "new issue" here means exactly what it means down there.
  const magazineIssue = getWeeklyMagazineIssue(data.birdLibrary, data.settings)

  function scrollToMagazineSection() {
    document
      .getElementById('home-magazine-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // New-issue popup: shows once per issue, the first time Home mounts after
  // that issue publishes. A lazy useState initializer runs exactly once, at
  // mount — a mount-check only, deliberately with no interval/clock tick, so
  // it can never pop up mid-session if a new issue happens to roll over
  // while she's already sitting on Home; the next mount (next visit/reload)
  // picks it up instead.
  const [showIssueModal, setShowIssueModal] = useState(
    () => !readOnly && data.magazineIssueSeenWeek !== magazineIssue.week,
  )

  function dismissIssueModal() {
    setShowIssueModal(false)
    markMagazineIssueSeen(magazineIssue.week)
  }
  function readIssueFromModal() {
    setShowIssueModal(false)
    markMagazineIssueSeen(magazineIssue.week)
    scrollToMagazineSection()
  }

  return (
    <>
      {showIssueModal && (
        <MagazineIssueModal
          issue={magazineIssue}
          season={season}
          onRead={readIssueFromModal}
          onDismiss={dismissIssueModal}
        />
      )}
      <div className={`home-stack home-mood-${tweetyView.mood}`}>
      <div className="home-topline">
        <span className="streak-chip">Day {careStreak} care streak 🔥</span>
        <span className="coin-chip">{data.featherCoins} 🪙</span>
      </div>

      {(() => {
        // Small, always-visible at-a-glance indicator for the mystery-egg
        // system — "if I find more birds I get an egg". The MysteryEggCard
        // further down handles the actual daily warm interaction; this is
        // just the quick status chip. Same guard as that card: an egg is only
        // ever "hers to warm" once she has no active companion.
        if (data.mysteryEgg && !data.tweety?.companion) {
          const ready = (data.mysteryEgg.warms || 0) >= MYSTERY_EGG_WARMS
          return (
            <div className="egg-progress-chip" title={ready ? 'Your egg has hatched!' : 'Warm it once a day to hatch it'}>
              {ready ? (
                <span>🥚✨ Egg hatched — ready and waiting!</span>
              ) : (
                <span>🥚 Egg warming — day {data.mysteryEgg.warms || 0}/{MYSTERY_EGG_WARMS}</span>
              )}
            </div>
          )
        }
        const lastAward = data.eggProgress?.lastAwardedAtCount || 0
        const sinceLastAward = Math.max(0, (data.birds?.length || 0) - lastAward)
        const untilNext = Math.max(1, 5 - sinceLastAward)
        return (
          <div className="egg-progress-chip" title="Every 5th new species earns a mystery egg">
            <span className="egg-progress-dots">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className={`egg-progress-dot${i < sinceLastAward ? ' filled' : ''}`}>🐦</span>
              ))}
              <span className="egg-progress-dot egg-progress-goal">🥚</span>
            </span>
            <span>Next egg in {untilNext} {untilNext === 1 ? 'bird' : 'birds'}</span>
          </div>
        )
      })()}

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

      {/* Permanent shortcut so the magazine is never just buried at the
          bottom of Home — a real card up top, styled like any other soft
          card, that jumps straight down to the full issue. */}
      <button type="button" className="soft-card magazine-shortcut-card" onClick={scrollToMagazineSection}>
        <p className="eyebrow">The Feather 🗞️</p>
        <h3>Issue #{magazineIssue.issueIndex} — {season.name} Edition</h3>
        <span className="magazine-shortcut-cta">Read this week&apos;s issue →</span>
      </button>

      <BirdsNearYouCard library={data.birdLibrary} openBirdProfile={openBirdProfile} />

      {plantScannerVisible && <PlantsNearYouCard onOpenPlant={openPlantProfile} />}

      <TripSightingsCard sightings={data.sightings} />

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
          {data.tweety?.companion ? (
            <TweetyHomeCard
              tweety={data.tweety}
              dancing={tweetyDancing}
              justPurchasedItem={justPurchasedItem}
              legacyNestTier={tweetyView.nestTier}
              rainbow={tweetyView.rainbow}
              loveLetter={tweetyView.loveLetter}
              // Every raw purchased id, not filtered through the current
              // TWEETY_STORE_ITEMS catalog — a legacy id no longer sold in the
              // shop (e.g. pre-redesign 'nest') must still count as owned for
              // rendering. TweetyHomeCard only ever reads gift.id.
              gifts={(data.tweetyStore || []).map((id) => ({ id }))}
              onFeed={() => careTweety('feed')}
              onWater={() => careTweety('water')}
              onPlay={() => careTweety('play')}
              onOpenStats={() => goTo('tweety')}
              onReleaseToGarden={onReleaseToGarden}
              onSettleHappiness={onSettleHappiness}
              onHeardSong={onHeardSong}
            />
          ) : (
            <AwaitingCompanionCard tweety={data.tweety} />
          )}

          {/* A mystery egg is earned WHILE a companion is active (birding keeps
              counting), but it must never be shown/warmable until she's in the
              awaiting-next-companion gap — an egg card next to a living, active
              companion is exactly the phantom-egg bug that kept recurring. This
              guard is unconditional: it doesn't matter how mysteryEgg got set.
              needsSpeciesChoice further gates which of the two cards shows:
              she has to pick a species (EggSpeciesPicker) before the normal
              tap-to-warm card (MysteryEggCard) ever appears. */}
          {data.mysteryEgg && !data.tweety?.companion && (
            data.mysteryEgg.needsSpeciesChoice ? (
              <EggSpeciesPicker birdLibrary={data.birdLibrary} onChoose={onChooseEggSpecies} />
            ) : (
              <MysteryEggCard mysteryEgg={data.mysteryEgg} onWarm={onWarmMysteryEgg} />
            )
          )}

          <button className="garden-home-card" type="button" onClick={() => goTo('garden')}>
            <span className="garden-home-emoji" aria-hidden="true">🌳</span>
            <span className="garden-home-text">
              <strong>My Garden</strong>
              <small>Watch it grow — plant, tend, and visit the birds who call it home.</small>
            </span>
            <span className="garden-home-arrow" aria-hidden="true">→</span>
          </button>

          <button className="greenhouse-home-card" type="button" onClick={() => goTo('greenhouse')}>
            <span className="greenhouse-home-emoji" aria-hidden="true">🌿</span>
            <span className="greenhouse-home-text">
              <strong>My Greenhouse</strong>
              <small>A warm little glasshouse — grow potted plants from her own species.</small>
            </span>
            <span className="greenhouse-home-arrow" aria-hidden="true">→</span>
          </button>

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
        {plantScannerVisible && (
          <button className="mini-card" type="button" onClick={() => goTo('garden')}>
            <span className="mini-card-top">
              <span className="eyebrow">Seed Pouch</span>
              <strong>{data.seeds} 🌱</strong>
            </span>
            <small>Plant a seed in your garden</small>
          </button>
        )}
      </div>

      {plantScannerVisible &&
        (() => {
          const count = data.plantLibrary.length
          const target = nextPlantLevel(count)
          const rank = currentPlantLevel(count)
          if (!target) return null
          const prevThreshold = rank?.threshold || 0
          const progressPct = Math.min(
            100,
            Math.round(((count - prevThreshold) / (target.threshold - prevThreshold)) * 100),
          )
          return (
            <button className="mini-card full-span" type="button" onClick={() => goTo('add')}>
              <span className="mini-card-top">
                <span className="eyebrow">{rank ? rank.name : 'Botanical Initiation'}</span>
                <strong>
                  {count} plants identified · {target.threshold} for {target.name}
                </strong>
              </span>
              <div className="progress-track">
                <span style={{ width: `${progressPct}%` }}></span>
              </div>
              <small>
                {target.threshold - count} more to {target.name} 🌿
              </small>
            </button>
          )
        })()}

      {/* The Weekly Magazine used to be its own bottom-tab page; it now
          renders here, at the bottom of Home, in full (not a preview) — same
          WeeklyMagazinePage/WeeklyQuiz/WeeklyPlantQuiz components, just a new
          parent. The id is the scroll target for old 'Read magazine' links
          (see goToMagazineSection in App()). */}
      <div id="home-magazine-section">
        <WeeklyMagazinePage
          data={data}
          openBirdProfile={openBirdProfile}
          openPlantProfile={openPlantProfile}
          claimWeeklyQuiz={claimWeeklyQuiz}
          claimWeeklyPlantQuiz={claimWeeklyPlantQuiz}
          plantScannerVisible={plantScannerVisible}
          goToPlants={goToPlants}
        />
      </div>
      </div>
    </>
  )
}

function MagazineIssueModal({ issue, season, onRead, onDismiss }) {
  const coverBird = issue.birdOfWeek
  return (
    <div className="reward-modal-backdrop" role="presentation">
      <article
        className="reward-unlock-card magazine-issue-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="magazine-issue-modal-title"
      >
        <p className="eyebrow">The Feather 🗞️</p>
        <h2 id="magazine-issue-modal-title">This week&apos;s issue is here!</h2>
        <p className="magazine-season">
          Issue #{issue.issueIndex} — {season.name} Edition
        </p>
        {coverBird && (
          <>
            <FieldGuidePhoto bird={coverBird} className="magazine-issue-modal-photo" />
            <p className="nickname">Cover bird: {coverBird.commonName}</p>
          </>
        )}
        <div className="button-row">
          <button className="primary-btn wide big-btn" type="button" onClick={onRead}>
            Read this week&apos;s issue
          </button>
          <button className="text-btn" type="button" onClick={onDismiss}>
            Maybe later
          </button>
        </div>
      </article>
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

// Same pattern as FieldGuidePhoto above, for plants — a real photo when
// imageUrl is usable, falling back to the category emoji (never a bird
// initials-style placeholder, which wouldn't make sense for a plant).
function PlantFieldGuidePhoto({ plant, className = '' }) {
  const [errored, setErrored] = useState(false)
  const usable = plant.imageUrl && !plant.imageUrl.includes('placehold')
  if (errored || !usable) {
    return (
      <div className={`field-guide-photo placeholder-photo ${className}`.trim()} aria-hidden="true">
        <span>{plantCategoryEmoji(plant.category)}</span>
      </div>
    )
  }
  return (
    <img
      className={`field-guide-photo ${className}`.trim()}
      src={plant.imageUrl}
      alt={plant.commonName}
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

// Home-screen card: a weekly-rotating little watch-list of birds likely near
// Pooks right now, so there's always something new to look for. Tap one to read
// its profile. During the Cape Town Special Week (see isCapeTownWeek) it follows
// her to the Cape — Western Cape species and a Cape Town heading — then reverts
// to the Potchefstroom list automatically after the 29th.
// Home card shown ONLY during the Cape Town trip week, and only once she has
// logged at least one sighting dated within the trip — a little running tally of
// her Cape Town field work, separate from her lifetime collection count. Hidden
// at zero (no empty "0 birds" state) and gone automatically after the trip.
function TripSightingsCard({ sightings }) {
  if (!isCapeTownWeek()) return null
  const count = capeTownTripSightingCount(sightings)
  if (count < 1) return null
  return (
    <section className="soft-card trip-sightings-card">
      <p className="eyebrow">Cape Town field report</p>
      <h3>
        {count} {count === 1 ? 'bird' : 'birds'} spotted in Cape Town so far 🌊
      </h3>
      <p className="trip-sightings-sub">
        Logged on your Cape Town deployment — keep them coming, Agent. 🪶
      </p>
    </section>
  )
}

function BirdsNearYouCard({ library, openBirdProfile }) {
  const capeWeek = isCapeTownWeek()
  const birds = useMemo(
    () =>
      capeWeek
        ? birdsNearCapeTownThisWeek(library, new Date(), 7)
        : birdsNearPotchThisWeek(library, new Date(), 7),
    [library, capeWeek],
  )
  if (!birds.length) return null
  const place = capeWeek ? 'Cape Town' : 'Potchefstroom'
  return (
    <section className="soft-card near-you-card">
      <div className="near-you-head">
        <p className="eyebrow">Out there right now</p>
        <h3>Birds likely near {place} today 🐦</h3>
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

function PlantsNearYouCard({ onOpenPlant }) {
  const capeWeek = isCapeTownWeek()
  const plants = useMemo(
    () =>
      capeWeek ? plantsNearCapeTownThisWeek(new Date(), 7) : plantsNearPotchThisWeek(new Date(), 7),
    [capeWeek],
  )
  if (!plants.length) return null
  const place = capeWeek ? 'Cape Town' : 'Potchefstroom'
  return (
    <section className="soft-card near-you-card">
      <div className="near-you-head">
        <p className="eyebrow">Out there right now</p>
        <h3>Plants likely near {place} today 🌿</h3>
        <p className="near-you-sub">A fresh little watch-list every day — tap one to read about it.</p>
      </div>
      <div className="near-you-scroll">
        {plants.map((plant) => (
          <button
            key={plant.id}
            type="button"
            className="near-you-bird"
            onClick={() => onOpenPlant(plant.id)}
          >
            <PlantFieldGuidePhoto plant={plant} className="near-you-photo" />
            <span className="near-you-name">{plant.commonName}</span>
            {plant.afrikaansName && <span className="near-you-afr">{plant.afrikaansName}</span>}
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

function getPlantSearchText(plant) {
  return [plant.commonName, plant.afrikaansName, plant.scientificName, plant.category, plant.whereFound]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// One card in the plant field guide: category icon, names, bloom season,
// where it's found and a care tip. Purely for browsing — no coins, no "caught".
function ExplorePlantCard({ plant, onOpen }) {
  return (
    <article className="explore-card tappable" onClick={onOpen}>
      <div className="explore-card-photo-frame">
        <PlantFieldGuidePhoto plant={plant} className="explore-card-photo" />
        {plant.category && <span className="explore-card-tag">{plant.category}</span>}
      </div>
      <div className="explore-card-body">
        <h3>{plant.commonName}</h3>
        {plant.afrikaansName && <p className="explore-afrikaans">{plant.afrikaansName}</p>}
        <p className="explore-thought">{plant.funFact}</p>
        <dl className="explore-meta">
          <div>
            <dt>Bloom season</dt>
            <dd>{plant.bloomSeason || '—'}</dd>
          </div>
          <div>
            <dt>Where found</dt>
            <dd>{plant.whereFound || '—'}</dd>
          </div>
          <div>
            <dt>Care</dt>
            <dd>{plant.careTips || '—'}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

// A beautiful, browsable field guide to the SA Plant Library. Separate from the
// personal plant collection (scanned specimens): no coins, no "catalogued" —
// just reading and learning.
function ExplorePlantsPage({ openPlantProfile }) {
  const [search, setSearch] = useState('')
  const [filterId, setFilterId] = useState('all')
  const filter = PLANT_EXPLORE_FILTERS.find((f) => f.id === filterId) || PLANT_EXPLORE_FILTERS[0]
  const searchKey = search.trim().toLowerCase()
  const plants = SA_PLANT_LIBRARY.filter((plant) => filter.test(plant))
    .filter((plant) => !searchKey || getPlantSearchText(plant).includes(searchKey))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  return (
    <div className="page-grid explore-page">
      <section className="soft-card full-span explore-hero">
        <p className="eyebrow">A field guide for quiet evenings</p>
        <h2>Explore Plants 🌿</h2>
        <p className="explore-hero-sub">
          South Africa is full of remarkable plants. Here are some worth knowing. 🌸
        </p>
      </section>

      <section className="soft-card full-span explore-controls">
        <label className="explore-search">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            aria-label="Search plants by name"
          />
        </label>
        <div className="filter-row" aria-label="Field guide filters">
          {PLANT_EXPLORE_FILTERS.map((option) => (
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
          {plants.length} plant{plants.length === 1 ? '' : 's'}
        </p>
      </section>

      <section className="full-span explore-grid" aria-live="polite">
        {plants.length === 0 && <EmptyState text="No plants match that search yet." />}
        {plants.map((plant) => (
          <ExplorePlantCard key={plant.id} plant={plant} onOpen={() => openPlantProfile(plant.id)} />
        ))}
      </section>
    </div>
  )
}

// Toggle between the bird field guide and the plant field guide. The Plants
// side only appears once plant features are visible for this account (mirrors
// CollectionHubPage's Birds/Plants toggle).
function ExploreHubPage({
  data,
  openBirdProfile,
  openPlantProfile,
  plantScannerVisible = false,
  exploreMode: exploreModeProp,
  setExploreMode: setExploreModeProp,
}) {
  const [exploreModeState, setExploreModeState] = useState('birds')
  const exploreMode = exploreModeProp ?? exploreModeState
  const setExploreMode = setExploreModeProp ?? setExploreModeState
  return (
    <div className="collection-hub">
      {plantScannerVisible && (
        <nav className="tabs" aria-label="Explore mode">
          <button
            type="button"
            className={`tab${exploreMode === 'birds' ? ' active' : ''}`}
            onClick={() => setExploreMode('birds')}
          >
            🐦 Birds
          </button>
          <button
            type="button"
            className={`tab${exploreMode === 'plants' ? ' active' : ''}`}
            onClick={() => setExploreMode('plants')}
          >
            🌿 Plants
          </button>
        </nav>
      )}
      {exploreMode === 'plants' && plantScannerVisible ? (
        <ExplorePlantsPage openPlantProfile={openPlantProfile} />
      ) : (
        <ExploreBirdsPage data={data} openBirdProfile={openBirdProfile} />
      )}
    </div>
  )
}

function AddBirdPage({ addBird, birdLibrary = [] }) {
  const [form, setForm] = useState(() => createEmptyForm())
  const [photoFile, setPhotoFile] = useState(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [audioFile, setAudioFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioInputKey, setAudioInputKey] = useState(0)
  const [aiStatus, setAiStatus] = useState('idle')
  const [aiMatches, setAiMatches] = useState([])
  const [aiUncertain, setAiUncertain] = useState(false)
  const [aiSecondOpinion, setAiSecondOpinion] = useState(null)
  const [offlineNotice, setOfflineNotice] = useState('')
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const [guidance, setGuidance] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [recordError, setRecordError] = useState('')
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordTimerRef = useRef(null)

  // Keep in-app recordings short: BirdNET only needs a few seconds, and this
  // keeps the upload comfortably under the backend's 16MB limit.
  const MAX_RECORD_SECONDS = 15

  const speciesKey = normalizeBirdName(form.birdName)
  const nicknameSuggestion = nicknameIdeas[speciesKey]
  const personality = personalityComments[speciesKey]
  const canAskCouncil = (Boolean(photoFile) || Boolean(audioFile)) && aiStatus !== 'loading'

  useEffect(() => {
    if (aiStatus !== 'loading') return undefined

    const intervalId = window.setInterval(() => {
      setLoadingIndex((current) => nextLoadingIndex(current))
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [aiStatus])

  // Safety net: if she leaves the page while recording, stop the timer and free
  // the microphone so the browser's "recording" indicator doesn't linger.
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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
    setAiSecondOpinion(null)
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
    clearAudio()
    clearAiState()
    if (!keepConfirmation) {
      setConfirmation(null)
    }
  }

  function formatRecordTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  function clearAudio() {
    setAudioFile(null)
    setAudioInputKey((current) => current + 1)
    setAudioUrl((current) => {
      if (current) {
        try {
          URL.revokeObjectURL(current)
        } catch {
          /* ignore */
        }
      }
      return ''
    })
  }

  // A recording and a photo are mutually exclusive for a single "Ask the
  // Council" — picking one clears the other so the request is unambiguous.
  function handleAudio(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    updateField('photo', '')
    setAudioFile(file)
    setConfirmation(null)
    setGuidance('')
    clearAiState()
    try {
      setAudioUrl(URL.createObjectURL(file))
    } catch {
      setAudioUrl('')
    }
  }

  function removeAudio() {
    clearAudio()
    clearAiState()
    setRecordError('')
  }

  // Pick a recording format this browser actually supports. iOS Safari only does
  // audio/mp4 (AAC); Chrome/Firefox/Android prefer webm/opus. The backend now
  // transcodes any of these via ffmpeg, so all of them identify fine.
  function pickRecorderMimeType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  }

  function stopRecordTimer() {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  function releaseMic() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  // Live in-app recording via the microphone — no leaving the app for the phone's
  // native recorder. Works on mobile and desktop; on Stop it auto-submits to the
  // Council just like an upload would.
  async function startRecording() {
    setRecordError('')
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setRecordError(
        "This browser can’t record in-app — you can still upload a recording with the button below 🎤",
      )
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      console.warn('[sound-id] microphone unavailable', error?.message || error)
      setRecordError(
        "I couldn’t reach the microphone — please allow mic access, or upload a recording instead 🎤",
      )
      return
    }

    // A recording, a photo and an upload are mutually exclusive for one ask.
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    updateField('photo', '')
    clearAudio()
    clearAiState()
    setConfirmation(null)
    setGuidance('')

    mediaStreamRef.current = stream
    audioChunksRef.current = []
    const mimeType = pickRecorderMimeType()
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data)
    })
    recorder.addEventListener('stop', () => {
      stopRecordTimer()
      releaseMic()
      setIsRecording(false)
      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(audioChunksRef.current, { type })
      audioChunksRef.current = []
      if (!blob.size) {
        setRecordError("That recording came through empty — give it another go 🎙️")
        return
      }
      const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
      const file = new File([blob], `bird-call.${ext}`, { type })
      setAudioFile(file)
      try {
        setAudioUrl(URL.createObjectURL(file))
      } catch {
        setAudioUrl('')
      }
      // Auto-submit to the Council, exactly as uploading then asking would.
      runAudioCouncil(file)
    })

    setRecordSeconds(0)
    setIsRecording(true)
    recorder.start()

    const startedAt = Date.now()
    recordTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setRecordSeconds(elapsed)
      if (elapsed >= MAX_RECORD_SECONDS) stopRecording()
    }, 250)
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop() // fires the 'stop' handler, which builds + submits the clip
    } else {
      stopRecordTimer()
      releaseMic()
      setIsRecording(false)
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

  // Sound path: identify from a recording via BirdNET, then fall into the SAME
  // results UI + confirm-to-collection flow as a photo. On low confidence or
  // failure we show a warm, specific message rather than photo demo birds.
  // Takes the file directly so an auto-submitted in-app recording can reuse it
  // without waiting for React state to settle.
  async function runAudioCouncil(file) {
    if (!file) return
    setLoadingIndex(Math.floor(Math.random() * loadingMessages.length))
    setAiStatus('loading')
    setLoadingIndex(0)
    setConfirmation(null)
    setGuidance('')
    setAiMatches([])
    setAiUncertain(false)
    setAiSecondOpinion(null)
    setOfflineNotice('')
    setRecordError('')
    try {
      const result = await identifyBirdByAudio(file)
      if (!result.matches.length) {
        clearAiState()
        setGuidance(
          "The Council listened closely but couldn’t be sure from that sound 🎧 — a clearer, closer recording helps, or you can add the bird manually below.",
        )
        return
      }
      setAiMatches(result.matches)
      setAiUncertain(result.uncertain)
      setAiStatus('results')
    } catch (error) {
      console.warn('[bird-id] audio identification failed', error?.message || error)
      clearAiState()
      setGuidance(
        "The Council’s ears are resting just now 🎧 — sound ID couldn’t run. Try again shortly, or add the bird manually below.",
      )
    }
  }

  async function handleAskCouncil(event) {
    event.preventDefault()
    if (!photoFile && !audioFile) return

    if (audioFile) {
      await runAudioCouncil(audioFile)
      return
    }

    // Start each identification on a fresh random Council message.
    setLoadingIndex(Math.floor(Math.random() * loadingMessages.length))
    setAiStatus('loading')
    setLoadingIndex(0)
    setConfirmation(null)
    setGuidance('')
    setAiMatches([])
    setAiUncertain(false)
    setAiSecondOpinion(null)
    setOfflineNotice('')

    const endpoint = `${BIRD_API_URL}/api/identify-bird`
    try {
      const body = new FormData()
      body.append('file', photoFile)
      // Location + season context lets the backend weight GPT-4o (and, once
      // configured, iNaturalist) toward species that are actually realistic
      // for where/when the photo was taken, instead of guessing blind.
      body.append('location', isCapeTownWeek() ? 'capetown' : 'potchefstroom')
      body.append('season', getSeason())
      body.append('month', new Date().toLocaleDateString('en-US', { month: 'long' }))

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
      setAiSecondOpinion(result.secondOpinion)
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
      setAiSecondOpinion(null)
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
          ) : audioFile ? (
            <div className="spot-preview-card">
              <span className="spot-action-emoji" aria-hidden="true">🎙️</span>
              {audioUrl && <audio className="spot-audio-preview" src={audioUrl} controls />}
              <p className="spot-preview-caption">
                A recording for the Council&apos;s ears. 🎶 Ready when you are.
              </p>
              <button className="ghost-btn wide big-btn" type="button" onClick={removeAudio}>
                Choose a different recording
              </button>
            </div>
          ) : isRecording ? (
            <div className="spot-preview-card recording-card">
              <div className="recording-indicator" role="status" aria-live="polite">
                <span className="recording-dot" aria-hidden="true" />
                <span className="recording-timer">{formatRecordTime(recordSeconds)}</span>
              </div>
              <p className="spot-preview-caption">Listening for your bird… hold steady 🎶</p>
              <button className="primary-btn wide big-btn" type="button" onClick={stopRecording}>
                Stop &amp; ask the Council
              </button>
              <p className="spot-sub">Recording stops on its own after {MAX_RECORD_SECONDS} seconds.</p>
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
              {SOUND_ID_ENABLED && (
                <button type="button" className="spot-action-btn" onClick={startRecording}>
                  <span className="spot-action-emoji" aria-hidden="true">🎙️</span>
                  <span>Record now</span>
                </button>
              )}
              {SOUND_ID_ENABLED && (
                <label className="spot-action-btn">
                  <input
                    key={`snd-${audioInputKey}`}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleAudio}
                    hidden
                  />
                  <span className="spot-action-emoji" aria-hidden="true">📁</span>
                  <span>Upload a recording</span>
                </label>
              )}
            </div>
            {recordError && (
              <div className="hint-panel ai-guidance-note">
                <p>{recordError}</p>
              </div>
            )}
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
                {aiUncertain
                  ? 'Council is unsure'
                  : aiSecondOpinion?.agreesWithTopMatch
                    ? 'Confirmed by two ID systems'
                    : `Top ${aiMatches.length} guesses`}
              </span>
            </div>
            <p className="ai-results-hint">
              {aiUncertain
                ? buildLowConfidenceMessage(aiMatches, aiSecondOpinion)
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

// Entry point for the 'add' tab: a small mode switch between the original
// bird flow and the new plant flow, so "Scan a Plant" lives as a sibling
// option right next to "Spot a Bird" rather than a separate hidden page.
function SpotHubPage({ addBird, birdLibrary, addPlant, plantScanningUnlocked }) {
  const [spotMode, setSpotMode] = useState('bird')
  return (
    <div className="spot-hub">
      {plantScanningUnlocked && (
        <nav className="tabs" aria-label="Spot mode">
          <button
            type="button"
            className={`tab${spotMode === 'bird' ? ' active' : ''}`}
            onClick={() => setSpotMode('bird')}
          >
            🐦 Spot a Bird
          </button>
          <button
            type="button"
            className={`tab${spotMode === 'plant' ? ' active' : ''}`}
            onClick={() => setSpotMode('plant')}
          >
            🌿 Scan a Plant
          </button>
        </nav>
      )}
      {spotMode === 'bird' || !plantScanningUnlocked ? (
        <AddBirdPage addBird={addBird} birdLibrary={birdLibrary} />
      ) : (
        <AddPlantPage addPlant={addPlant} />
      )}
    </div>
  )
}

// A pool of warm Head Botanist loading lines, rotating while she waits.
const plantLoadingMessages = [
  'The Head Botanist is examining the leaves... 🔍',
  'Consulting the official flora field guide... 📖',
  'Checking petal shape and colour very carefully... 🌸',
  'Cross-referencing with the herbarium archive... 🌿',
  'The succulent division has been called in for a second opinion... 🌵',
  'Measuring leaf veins very seriously... 📏',
  'The greenhouse team is in a brief huddle... 🪴',
  'Almost there, the Botanist is very thorough... 🌱',
]

function AddPlantPage({ addPlant }) {
  const [photoFile, setPhotoFile] = useState(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [photo, setPhoto] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')
  const [primaryMatch, setPrimaryMatch] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [enrichingKey, setEnrichingKey] = useState('')
  const [guidance, setGuidance] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [loadingIndex, setLoadingIndex] = useState(0)

  useEffect(() => {
    if (aiStatus !== 'loading') return undefined
    const intervalId = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % plantLoadingMessages.length)
    }, 1500)
    return () => window.clearInterval(intervalId)
  }, [aiStatus])

  function clearAiState() {
    setPrimaryMatch(null)
    setCandidates([])
    setGuidance('')
    setAiStatus('idle')
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setConfirmation(null)
    clearAiState()
    readStorablePhoto(file, (storedPhoto) => setPhoto(storedPhoto))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    setPhoto('')
    clearAiState()
  }

  function resetSpotter({ keepConfirmation = false } = {}) {
    setPhotoFile(null)
    setPhotoInputKey((current) => current + 1)
    setPhoto('')
    clearAiState()
    if (!keepConfirmation) setConfirmation(null)
  }

  function handleNoneMatch() {
    clearAiState()
    setConfirmation(null)
    setGuidance(
      'That’s okay — no plant forced. Try another, clearer photo of the flower or leaves.',
    )
  }

  async function handleAskBotanist(event) {
    event.preventDefault()
    if (!photoFile) return
    setLoadingIndex(0)
    setAiStatus('loading')
    setGuidance('')
    setConfirmation(null)
    setPrimaryMatch(null)
    setCandidates([])

    try {
      const body = new FormData()
      body.append('file', photoFile)
      const response = await fetch(`${BIRD_API_URL}/api/identify-plant`, {
        method: 'POST',
        body,
      })
      if (!response.ok) throw new Error(`Plant API returned ${response.status}`)
      const result = await response.json()

      if (result.unavailable || !result.identified) {
        setAiStatus('idle')
        setGuidance(
          result.message ||
            'The Head Botanist couldn’t place this one 🌿 — try a clearer photo, or try again shortly.',
        )
        return
      }

      if (result.confident && result.primary) {
        setPrimaryMatch(result.primary)
      } else {
        setCandidates(result.candidates || [])
      }
      setAiStatus('results')
    } catch (error) {
      console.warn('[plant-id] identification failed', error?.message || error)
      setAiStatus('idle')
      setGuidance('The greenhouse line is quiet right now 🌿 — please try again in a moment.')
    }
  }

  function finishConfirm(match) {
    const saved = addPlant(match, photo)
    if (!saved) return
    setConfirmation(saved)
    resetSpotter({ keepConfirmation: true })
  }

  function handleConfirmPrimary() {
    if (primaryMatch) finishConfirm(primaryMatch)
  }

  async function handleConfirmCandidate(candidate) {
    setEnrichingKey(candidate.scientificName)
    try {
      const body = new FormData()
      body.append('scientificName', candidate.scientificName)
      body.append('commonName', candidate.commonName || '')
      body.append('confidence', String(candidate.confidence || 0))
      body.append('imageUrl', candidate.imageUrl || '')
      body.append('family', candidate.family || '')
      const response = await fetch(`${BIRD_API_URL}/api/enrich-plant`, {
        method: 'POST',
        body,
      })
      if (!response.ok) throw new Error(`Enrich API returned ${response.status}`)
      const result = await response.json()
      finishConfirm(result.primary || candidate)
    } catch (error) {
      console.warn('[plant-id] enrichment failed', error?.message || error)
      // Enrichment is nice-to-have copy — still let her confirm with the bare facts.
      finishConfirm(candidate)
    } finally {
      setEnrichingKey('')
    }
  }

  return (
    <div className="page-grid spot-page">
      <section className="soft-card form-page spot-card full-span">
        <div className="spot-intro">
          <p className="spot-heading">Show the Head Botanist your plant 🌿</p>
          <p className="spot-sub">Snap a close-up of a flower or leaves, and let the roots take hold.</p>
        </div>

        <form className="council-form" onSubmit={handleAskBotanist}>
          {photo ? (
            <div className="spot-preview-card">
              <img className="spot-preview-photo" src={photo} alt="Plant preview" />
              <p className="spot-preview-caption">Looking good! Ready for the Botanist. 🌱</p>
              <button className="ghost-btn wide big-btn" type="button" onClick={removePhoto}>
                Choose a different photo
              </button>
            </div>
          ) : (
            <>
              <div className="spot-actions">
                <label className="spot-action-btn">
                  <input
                    key={`plant-cam-${photoInputKey}`}
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
                    key={`plant-gal-${photoInputKey}`}
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    hidden
                  />
                  <span className="spot-action-emoji" aria-hidden="true">🖼️</span>
                  <span>Choose from gallery</span>
                </label>
              </div>
              <p className="spot-sub">A clear close-up of the flower or leaves works best 🌸</p>
            </>
          )}

          <button
            className="primary-btn submit-btn council-main-btn"
            type="submit"
            disabled={!photoFile || aiStatus === 'loading'}
          >
            Ask the Head Botanist
          </button>
        </form>

        {aiStatus === 'loading' && (
          <div className="council-loading" role="status" aria-live="polite">
            <span aria-hidden="true"></span>
            <p>{plantLoadingMessages[loadingIndex]}</p>
          </div>
        )}

        {guidance && (
          <div className="hint-panel ai-guidance-note">
            <p>{guidance}</p>
          </div>
        )}

        {confirmation && (
          <div className="checked-off-banner" role="status">
            <div className="celebration-burst" aria-hidden="true">
              <span>🌿</span>
              <span>✨</span>
              <span>🌸</span>
              <span>🎉</span>
              <span>🌿</span>
              <span>✨</span>
            </div>
            <strong>New plant discovered! ✅</strong>
            <p>
              {confirmation.commonName} took root in Marlie&apos;s garden collection.
              {confirmation.seedsEarned > 0
                ? ` +${confirmation.seedsEarned} seed 🌱`
                : ' Logged again for the memory.'}
            </p>
          </div>
        )}

        {primaryMatch && (
          <section className="ai-results-panel" aria-live="polite">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Head Botanist's verdict</p>
                <h3>The Council's Head Botanist has confirmed this specimen</h3>
              </div>
              <span className="status-pill">Confirmed</span>
            </div>
            <div className="ai-match-grid">
              <PlantMatchCard match={primaryMatch} userPhoto={photo} onConfirm={handleConfirmPrimary} isBest />
            </div>
          </section>
        )}

        {candidates.length > 0 && (
          <section className="ai-results-panel" aria-live="polite">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Head Botanist answers</p>
                <h3>Which one looks right?</h3>
              </div>
              <span className="status-pill locked">Not fully sure</span>
            </div>
            <p className="ai-results-hint">
              The photo was a little tricky, so these are gentle guesses. Tap the one that matches, or none at all.
            </p>
            <div className="ai-match-grid">
              {candidates.map((candidate, index) => (
                <PlantMatchCard
                  key={`${candidate.scientificName}-${index}`}
                  match={candidate}
                  index={index}
                  userPhoto={photo}
                  onConfirm={() => handleConfirmCandidate(candidate)}
                  busy={enrichingKey === candidate.scientificName}
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
    </div>
  )
}

function PlantMatchCard({ match, index = 0, userPhoto, onConfirm, busy = false, isBest = false }) {
  const confidence = match.confidence || 0
  const unsure = confidence < 70
  const hasEnrichment = Boolean(match.funFact || match.careTips || match.afrikaansName)

  return (
    <article className={`ai-match-card${isBest ? ' best-match' : ''}${unsure ? ' unsure' : ''}`}>
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
          {match.imageUrl ? (
            <img className="compare-img" src={match.imageUrl} alt={match.commonName} loading="lazy" />
          ) : (
            <div className="compare-img placeholder-photo"><span>🌿</span></div>
          )}
          <figcaption>{match.commonName}</figcaption>
        </figure>
      </div>

      <div className="ai-match-title">
        <span className={unsure ? 'status-pill locked' : 'status-pill'}>
          {isBest ? 'Best guess' : `Maybe #${index + 1}`}
        </span>
        <h3>{match.commonName}</h3>
      </div>

      {match.scientificName && (
        <p className="why-this-bird">
          <em>{match.scientificName}</em>
          {match.family ? ` · ${match.family}` : ''}
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
      </div>

      {hasEnrichment && (
        <details className="tiny-details" open={isBest}>
          <summary>Peek at clues</summary>
          <dl className="bird-meta ai-match-meta">
            <div>
              <dt>Afrikaans</dt>
              <dd>{match.afrikaansName || 'Not sure yet'}</dd>
            </div>
            <div>
              <dt>Care tips</dt>
              <dd>{match.careTips || 'Not sure yet'}</dd>
            </div>
          </dl>
          {match.funFact && <AiList title="Fun fact" items={[match.funFact]} />}
        </details>
      )}

      <button className="primary-btn" type="button" onClick={onConfirm} disabled={busy}>
        {busy ? 'Asking the Botanist…' : isBest ? 'Yes, this is my plant!' : 'This is the one'}
      </button>
    </article>
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

// Collection entry point: a mode switch between the original Bird Book and
// the new Plant Collection, mirroring SpotHubPage's tab pattern exactly.
// Plants stays hidden until she's unlocked plant scanning — same reveal
// gate as the Spot page, so nothing spoilers the promotion letter.
function CollectionHubPage({ data, openBirdProfile, openPlantProfile, goToSpot, plantScannerVisible = false }) {
  const [collectionMode, setCollectionMode] = useState('birds')
  const plantScanningUnlocked = plantScannerVisible
  return (
    <div className="collection-hub">
      {plantScanningUnlocked && (
        <nav className="tabs" aria-label="Collection mode">
          <button
            type="button"
            className={`tab${collectionMode === 'birds' ? ' active' : ''}`}
            onClick={() => setCollectionMode('birds')}
          >
            🐦 Birds
          </button>
          <button
            type="button"
            className={`tab${collectionMode === 'plants' ? ' active' : ''}`}
            onClick={() => setCollectionMode('plants')}
          >
            🌿 Plants
          </button>
        </nav>
      )}
      {collectionMode === 'plants' && plantScanningUnlocked ? (
        <PlantLibraryPage data={data} openPlantProfile={openPlantProfile} />
      ) : (
        <SaBirdLibraryPage data={data} openBirdProfile={openBirdProfile} goToSpot={goToSpot} />
      )}
    </div>
  )
}

function PlantLibraryPage({ data, openPlantProfile }) {
  const plants = data.plantLibrary
  const count = plants.length

  return (
    <div className="page-grid library-page">
      <section className="soft-card full-span checklist-hero scrapbook-hero">
        <p className="eyebrow">Your plant collection</p>
        <h2 className="discovered-count">
          {count} plant{count === 1 ? '' : 's'} discovered 🌿
        </h2>
        <p className="discovered-sub">Snap a clear photo of a flower or leaves to catalogue a new specimen</p>
      </section>

      <section className="soft-card full-span discoveries-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My Plants 🌿</p>
            <h3>Plants you&apos;ve personally identified and photographed</h3>
          </div>
          <span className="status-pill">{count}</span>
        </div>
        <div className="library-grid" aria-live="polite">
          {plants.length === 0 && (
            <EmptyState text="No plants catalogued yet — tap Scan a Plant to file your first specimen report." />
          )}
          {plants.map((plant) => (
            <PlantLibraryCard key={plant.id} plant={plant} openPlantProfile={openPlantProfile} />
          ))}
        </div>
      </section>
    </div>
  )
}

function PlantLibraryCard({ plant, openPlantProfile }) {
  const libraryMatch = SA_PLANT_LIBRARY.find(
    (p) => normalizeBirdName(p.scientificName || p.commonName) === plant.speciesKey,
  )
  const onOpen = libraryMatch && openPlantProfile ? () => openPlantProfile(libraryMatch.id) : undefined
  const referencePhoto = plant.referenceImageUrl || libraryMatch?.imageUrl || ''
  const timesLogged = plant.timesLogged || 1

  return (
    <article className={`library-bird-card seen${onOpen ? ' tappable' : ''}`} onClick={onOpen}>
      <div className="plant-card-photos">
        <div className="plant-card-photo-slot">
          {plant.photo ? (
            <img className="bird-card-photo" src={plant.photo} alt={`${plant.commonName} — her photo`} loading="lazy" />
          ) : (
            <div className="bird-card-photo placeholder-photo">
              <span>🌿</span>
            </div>
          )}
          <span className="plant-photo-label">Her photo</span>
        </div>
        <div className="plant-card-photo-slot">
          {referencePhoto ? (
            <img className="bird-card-photo" src={referencePhoto} alt={`${plant.commonName} — reference`} loading="lazy" />
          ) : (
            <div className="bird-card-photo placeholder-photo">
              <span>{plantCategoryEmoji(libraryMatch?.category)}</span>
            </div>
          )}
          <span className="plant-photo-label">Reference</span>
        </div>
      </div>
      <div className="bird-card-body">
        <span className="status-pill paid">Catalogued 🌿</span>
        <h3>{plant.commonName}</h3>
        <p className="nickname">{plant.afrikaansName || plant.scientificName}</p>
        <p className="memory-caption">
          {`First identified ${formatDate(plant.dateSpotted)} · ${timesLogged} scan${timesLogged === 1 ? '' : 's'}`}
        </p>
        {plant.funFact && <p className="memory-caption">{plant.funFact}</p>}
        {onOpen && (
          <button className="secondary-btn wide big-btn" type="button" onClick={onOpen}>
            Open profile
          </button>
        )}
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

// The plant field guide's per-species detail page — mirrors BirdProfilePage's
// library path, but far simpler: no AI matching, no coin/mystery-egg tie-ins,
// just the field guide entry plus whether/how often she's catalogued this
// species in her own Plant Collection (see addPlant()).
function PlantProfilePage({ data, plantId, onBack }) {
  const plant = findPlantById(plantId)

  if (!plant) {
    return (
      <section className="soft-card full-span">
        <EmptyState text="This plant profile could not be found." />
        <button className="secondary-btn" type="button" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  const speciesKey = normalizeBirdName(plant.scientificName || plant.commonName)
  const specimens = (data.plantLibrary || []).filter((entry) => entry.speciesKey === speciesKey)
  const sortedSpecimens = [...specimens].sort((a, b) => a.dateSpotted.localeCompare(b.dateSpotted))
  const cataloged = specimens.length > 0
  const latestPhoto = specimens.find((entry) => entry.photo)?.photo || plant.imageUrl
  const regionLabels = { potch: 'Potchefstroom / Highveld', capetown: 'Cape Town / fynbos' }
  const detailRows = [
    ['Category', plant.category],
    ['Region', (plant.regions || []).map((r) => regionLabels[r] || r).join(', ')],
    ['Bloom season', plant.bloomSeason],
    ['Where found', plant.whereFound],
    ['Care tips', plant.careTips],
    ['Catalogued status', cataloged ? 'Catalogued 🌿' : 'Not catalogued yet'],
    ['Times logged', specimens.length],
    ['First logged date', cataloged ? formatDate(sortedSpecimens[0]?.dateSpotted) : 'Not logged yet'],
  ]

  return (
    <div className="page-grid bird-profile-page">
      <section className="soft-card full-span bird-profile-hero">
        <div>
          <button className="text-btn back-btn" type="button" onClick={onBack}>
            Back
          </button>
          <p className="eyebrow">SA plant profile</p>
          <h2>{plant.commonName}</h2>
          <p className="nickname">{plant.afrikaansName || 'Afrikaans name pending'}</p>
          <p className="fine-print">{plant.scientificName || 'Scientific name pending'}</p>
          <div className="tag-row">
            <span className={cataloged ? 'status-pill paid' : 'status-pill locked'}>
              {cataloged ? 'Catalogued 🌿' : 'Not catalogued yet'}
            </span>
            <span className="tag">{plant.category}</span>
          </div>
        </div>
        {latestPhoto ? (
          <img className="profile-main-photo" src={latestPhoto} alt={plant.commonName} />
        ) : (
          <div className="profile-main-photo placeholder-photo">
            <span>{plantCategoryEmoji(plant.category)}</span>
          </div>
        )}
      </section>

      <details className="soft-card full-span profile-detail-card" open>
        <summary>Field guide details</summary>
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
        <p className="eyebrow">Fun fact</p>
        <div className="mini-list">
          <p>{plant.funFact || 'Fun facts will appear after more Head Botanist paperwork.'}</p>
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Her logged specimens</p>
            <h3>Your catalogue history</h3>
          </div>
          <span className="status-pill">{specimens.length} logged</span>
        </div>
        {specimens.length === 0 ? (
          <EmptyState text="No personal specimens for this plant yet." />
        ) : (
          <div className="profile-sighting-grid">
            {sortedSpecimens.map((entry) => (
              <article className="profile-sighting-card" key={entry.id}>
                {entry.photo ? (
                  <img src={entry.photo} alt={entry.commonName} />
                ) : (
                  <div className="placeholder-photo">
                    <span>{plantCategoryEmoji(plant.category)}</span>
                  </div>
                )}
                <div>
                  <strong>{formatDate(entry.dateSpotted)}</strong>
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
  buyTweetyStoreItem,
  buyRoomTheme,
  selectRoomTheme,
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
  // Pooks' coin shop is empty for now — the Hidden note is intentionally hidden
  // until Marnich writes it properly, so she cannot see or buy it yet. Her Gifts
  // page still shows the Tweety Store (rendered below, ungated) and her coin
  // balance. All shop items stay in code, just gated off via this allowlist.
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

      <section className="soft-card full-span tweety-store-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tweety Store 🎁</p>
            <h2>Spoil Tweety 💛</h2>
          </div>
        </div>
        <div className="shop-grid">
          {[...TWEETY_STORE_ITEMS].sort((a, b) => a.cost - b.cost).map((item) => {
            const consumable = item.kind === 'consumable'
            const ownedIds = data.tweetyStore || []
            // 'nest' (pre-redesign Nest Upgrade) already grants the same cozy
            // tier as 'cozynest' — show it as gifted too, so it never looks
            // buyable-again for something she already has.
            const owned =
              !consumable &&
              (ownedIds.includes(item.id) || (item.id === 'cozynest' && ownedIds.includes('nest')))
            const affordable = coins >= item.cost
            const boostActive = consumable && treatsBoostActive(data.tweety)
            return (
              <article className={`shop-tile${owned ? ' gifted' : ''}${!owned && !affordable ? ' unaffordable' : ''}`} key={item.id}>
                <div className="shop-emoji" aria-hidden="true">{item.emoji}</div>
                <h3>{item.name}</h3>
                <small>{item.hint}</small>
                <button
                  className="primary-btn wide big-btn"
                  type="button"
                  disabled={owned || !affordable}
                  onClick={() => buyTweetyStoreItem(item.id)}
                >
                  {owned ? 'Gifted 💛' : `${item.cost} 🪙`}
                </button>
                {boostActive && <small className="fine-print">✨ Active until midnight</small>}
              </article>
            )
          })}
        </div>
      </section>

      <section className="soft-card full-span room-theme-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Room Themes 🏠</p>
            <h2>Redecorate Tweety&apos;s home</h2>
          </div>
        </div>
        <div className="shop-grid">
          {ROOM_THEME_CATALOG.map((theme) => {
            const ownedThemes = data.tweety?.ownedRoomThemes || ['cottage']
            const owned = ownedThemes.includes(theme.id)
            const active = (data.tweety?.roomTheme || 'cottage') === theme.id
            const affordable = coins >= theme.cost
            return (
              <article className={`shop-tile room-theme-tile${active ? ' gifted' : ''}${!owned && !affordable ? ' unaffordable' : ''}`} key={theme.id}>
                <div className="room-theme-thumb" aria-hidden="true">
                  <RoomBackdrop theme={theme.id} />
                </div>
                <h3>{theme.emoji} {theme.name}</h3>
                <small>{theme.hint}</small>
                <button
                  className="primary-btn wide big-btn"
                  type="button"
                  disabled={active || (!owned && !affordable)}
                  onClick={() => (owned ? selectRoomTheme(theme.id) : buyRoomTheme(theme.id))}
                >
                  {active ? 'Active ✓' : owned ? 'Tap to use' : theme.cost === 0 ? 'Free' : `${theme.cost} 🪙`}
                </button>
              </article>
            )
          })}
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

function WeeklyPlantQuiz({ quiz, issueIndex, claimedWeek, onClaim }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [justAwarded, setJustAwarded] = useState(false)
  const alreadyClaimed = claimedWeek === issueIndex
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
      onClaim(issueIndex)
      setJustAwarded(true)
    }
  }
  function retake() {
    setAnswers({})
    setSubmitted(false)
  }

  const verdict =
    score === 5
      ? 'A perfect score — the Head Botanist is in awe! 🏆'
      : score === 4
        ? 'The Head Botanist is impressed!'
        : score === 3
          ? 'Solidly done — the Botanist nods approvingly. 🌿'
          : score >= 1
            ? 'A few to revisit — back to the field guide, agent! 💛'
            : 'Tricky issue! Flip back and study the Plant Corner. 📖'

  if (!quiz.length) {
    return (
      <div className="magazine-quiz-page" key="plant-quiz">
        <p className="eyebrow">Weekly Plant Quiz 🌿</p>
        <p>This issue’s quiz is warming up — check back soon. 🌸</p>
      </div>
    )
  }

  return (
    <div className="magazine-quiz-page" key="plant-quiz">
      <p className="eyebrow">Weekly Plant Quiz 🌿</p>
      <h2>Test yourself on this issue’s plants</h2>
      <p className="fine-print">5 questions · no timer · 3 seeds for finishing (once per issue).</p>
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
          {allAnswered ? 'See my score 🌿' : 'Answer all 5 to finish'}
        </button>
      ) : (
        <div className="weekly-quiz-result">
          <h3>You scored {score}/5 — {verdict}</h3>
          {justAwarded ? (
            <p className="weekly-quiz-coins">+3 seeds added 🌱</p>
          ) : alreadyClaimed ? (
            <p className="fine-print">You already earned this issue’s 3 seeds 💛 (retakes are just for fun).</p>
          ) : null}
          <button className="secondary-btn wide" type="button" onClick={retake}>
            Try again 🔁
          </button>
        </div>
      )}
    </div>
  )
}

function WeeklyMagazinePage({ data, openBirdProfile, openPlantProfile, claimWeeklyQuiz, claimWeeklyPlantQuiz, plantScannerVisible, goToPlants }) {
  const issue = getWeeklyMagazineIssue(data.birdLibrary, data.settings)
  const season = getSeasonInfo()
  const weekIndex = getAbsoluteWeekIndex()
  const quote = getWeeklyQuote(weekIndex)
  const coverBird = issue.birdOfWeek
  const plantIssueIndex = getAbsoluteIssueIndex(new Date())
  const { featuredPlants: magazinePlants, plantOfWeek } = getWeeklyMagazinePlants(data.settings, new Date())
  // The featured bird is deliberately different from the cover bird.
  const featuredBird =
    issue.featuredBirds.find((bird) => bird.id !== coverBird?.id) || issue.featuredBirds[1] || null
  // Same rule for plants: the feature page shows a different plant than the cover.
  const featuredPlant =
    magazinePlants.find((plant) => plant.id !== plantOfWeek?.id) || magazinePlants[1] || null
  const recap = getWeeklyRecap(data)
  const weeklyQuiz = useMemo(
    () => buildWeeklyQuiz(issue, data.birdLibrary),
    // issue is rebuilt each render; week + library are what actually matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issue.week, data.birdLibrary],
  )
  const weeklyPlantQuiz = useMemo(
    () => buildWeeklyPlantQuiz(plantIssueIndex, SA_PLANT_LIBRARY, magazinePlants),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plantIssueIndex],
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
      <p className="fine-print">A fresh flock every week · {season.greeting}</p>
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

  // Plant of the Week cover — same layout as the bird cover page, reusing the
  // coverPhoto() helper defined above. Gated the same way the Plant Corner
  // gallery/quiz already are, so accounts without plant features never see it.
  if (plantScannerVisible && plantOfWeek) {
    pages.push(
      <div className="magazine-cover-page" key="plant-cover">
        <p className="magazine-issue-no">The Bloom</p>
        <p className="magazine-season">Plant Issue #{plantIssueIndex} — {season.name} Edition</p>
        <p className="fine-print">A fresh bloom every week · {season.greeting}</p>
        {coverPhoto(plantOfWeek.commonName, plantOfWeek.imageUrl)}
        <p className="magazine-quote">“{plantOfWeek.funFact}”</p>
        <h2>Plant of the week: {plantOfWeek.commonName}</h2>
        <p className="nickname">{plantOfWeek.afrikaansName}</p>
        <button
          className="primary-btn"
          type="button"
          onClick={() => openPlantProfile(plantOfWeek.id)}
        >
          Meet this week's plant
        </button>
      </div>,
    )
  }

  // Featured plant page — different plant from the cover, same as the bird
  // feature page's relationship to the bird cover.
  if (plantScannerVisible && featuredPlant) {
    pages.push(
      <div className="magazine-feature-page" key="plant-feature">
        <p className="eyebrow">Featured this week 🌿</p>
        <h2>{featuredPlant.commonName}</h2>
        <p className="nickname">{featuredPlant.afrikaansName}</p>
        <dl className="bird-meta profile-meta">
          <div>
            <dt>Category</dt>
            <dd>{plantCategoryEmoji(featuredPlant.category)} {featuredPlant.category}</dd>
          </div>
          <div>
            <dt>Where found</dt>
            <dd>{featuredPlant.whereFound || 'Across South Africa'}</dd>
          </div>
          <div>
            <dt>Care tips</dt>
            <dd>{featuredPlant.careTips}</dd>
          </div>
        </dl>
        <p className="eyebrow">Fun fact</p>
        <div className="mini-list">
          <p>{featuredPlant.funFact}</p>
        </div>
        <button
          className="secondary-btn wide"
          type="button"
          onClick={() => openPlantProfile(featuredPlant.id)}
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

  // Page 7 — Plant Corner, only once plant features are released for the account.
  if (plantScannerVisible && magazinePlants.length) {
    pages.push(
      <div className="magazine-gallery-page" key="plants">
        <p className="eyebrow">Plant corner 🌿</p>
        <h2>What's blooming this issue</h2>
        <div className="magazine-grid">
          {magazinePlants.map((plant) => (
            <article className="magazine-bird-card" key={plant.id}>
              {plant.imageUrl ? (
                <img src={plant.imageUrl} alt={plant.commonName} />
              ) : (
                <div className="magazine-photo-placeholder">
                  <span>{plantCategoryEmoji(plant.category)}</span>
                </div>
              )}
              <div>
                <h3>{plant.commonName}</h3>
                <p className="nickname">{plant.afrikaansName}</p>
                <p>{plant.funFact}</p>
                {plant.careTips && (
                  <p className="fine-print">🪴 {plant.careTips}</p>
                )}
                {openPlantProfile && (
                  <button
                    className="secondary-btn wide"
                    type="button"
                    onClick={() => openPlantProfile(plant.id)}
                  >
                    Open plant profile
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {goToPlants && (
          <button className="secondary-btn wide" type="button" onClick={goToPlants}>
            Browse the plant field guide
          </button>
        )}
      </div>,
    )

    // Page 8 — Weekly Plant Quiz, immediately after the Plant Corner.
    pages.push(
      <WeeklyPlantQuiz
        key="plant-quiz"
        quiz={weeklyPlantQuiz}
        issueIndex={plantIssueIndex}
        claimedWeek={data.weeklyPlantQuizClaimedWeek}
        onClaim={claimWeeklyPlantQuiz}
      />,
    )
  }

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

function ProfilePage({ data, stats, goTo, onReplayIntro, onReadMagazine }) {
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
          <button className="secondary-btn" type="button" onClick={onReadMagazine}>
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
  releasePlantsToPooks,
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

      <section className="soft-card full-span admin-release-controls">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Feature Release Controls 🚀</p>
            <h2>Release gates</h2>
          </div>
        </div>
        <p className="fine-print">
          Features built ahead of time stay hidden everywhere by default — including your own
          Test Sandbox (toggle it there for yourself via the 🌿 button in the sandbox toolbar).
          This button writes to her real, live account immediately — the only time anything
          reaches her.
        </p>
        <div className="admin-release-row">
          <div className="admin-release-item">
            <div>
              <strong>Plant features 🌿</strong>
              <p className="fine-print">
                Scan a Plant, Plants Collection, Seed Pouch, garden species-growing.
              </p>
            </div>
            {data.settings.releaseFlags?.plants ? (
              <span className="status-pill paid">Released ✅</span>
            ) : (
              <button className="primary-btn" type="button" onClick={releasePlantsToPooks}>
                Release to Pooks
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="soft-card full-span admin-maintenance">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Maintenance Mode 🛠️</p>
            <h2>Pooks&rsquo; access</h2>
          </div>
        </div>
        <p className="fine-print">
          While this is on, Pooks sees a warm &ldquo;check back soon&rdquo; Bird Council message
          instead of the login screen — nothing else is reachable for her. Your own Marnich login
          is unaffected.
        </p>
        <div className="admin-release-row">
          <div className="admin-release-item">
            <div>
              <strong>Maintenance mode 🚧</strong>
              <p className="fine-print">
                {data.settings.pooksMaintenanceMode
                  ? "She's currently locked out."
                  : 'She has normal access.'}
              </p>
            </div>
            {data.settings.pooksMaintenanceMode ? (
              <button
                className="secondary-btn"
                type="button"
                onClick={() => updateSetting('pooksMaintenanceMode', false)}
              >
                Turn off — let her in
              </button>
            ) : (
              <button
                className="primary-btn"
                type="button"
                onClick={() => updateSetting('pooksMaintenanceMode', true)}
              >
                Turn on
              </button>
            )}
          </div>
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
        <label>
          Pinned plant of the week
          <select
            value={data.settings.pinnedPlantOfWeekId || ''}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  pinnedPlantOfWeekId: event.target.value,
                },
              }))
            }
          >
            <option value="">Auto-rotate weekly</option>
            {SA_PLANT_LIBRARY
              .slice()
              .sort((a, b) => a.commonName.localeCompare(b.commonName))
              .map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.commonName}
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
