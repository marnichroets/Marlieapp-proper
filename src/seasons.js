// Southern Hemisphere seasonal theming.
// Summer: Dec-Feb, Autumn: Mar-May, Winter: Jun-Aug, Spring: Sep-Nov.

import { saDateKey } from './saDate'

// Same +2h-then-read-UTC trick saDate.js uses for saDateKey/saHour — the
// season must key off South African local time, not whatever timezone the
// device happens to be set to (a device on a different timezone could read
// the wrong month, especially near a month boundary).
const SA_OFFSET_MS = 2 * 60 * 60 * 1000

export function getSeason(date = new Date()) {
  const sa = new Date(date.getTime() + SA_OFFSET_MS)
  const month = sa.getUTCMonth() // 0 = Jan, SA local
  if (month === 11 || month === 0 || month === 1) return 'summer'
  if (month >= 2 && month <= 4) return 'autumn'
  if (month >= 5 && month <= 7) return 'winter'
  return 'spring'
}

export const SEASONS = {
  summer: {
    key: 'summer',
    name: 'Summer',
    greeting: 'Summer is here Pooks ☀️',
    blurb: 'Golden days, butterflies and bright bird song.',
    // Floating background particles for this season.
    particles: ['☀️', '🦋', '🌻', '🌼', '🐝'],
  },
  autumn: {
    key: 'autumn',
    name: 'Autumn',
    greeting: 'Autumn is falling Pooks 🍂',
    blurb: 'Cosy amber light and drifting leaves.',
    particles: ['🍂', '🍁', '🍃', '🌰'],
  },
  winter: {
    key: 'winter',
    name: 'Winter',
    greeting: 'Winter is here Pooks 🥶',
    blurb: 'Soft misty blues and little sparkles of frost.',
    particles: ['❄️', '✨', '🌨️', '⛄'],
  },
  spring: {
    key: 'spring',
    name: 'Spring',
    greeting: 'Spring is blooming Pooks 🌸',
    blurb: 'Fresh petals, pastel skies and new beginnings.',
    particles: ['🌸', '🌷', '🌺', '🌼', '💮'],
  },
  // Temporary "on location" theme for Pooks' Cape Town trip. Not a real season —
  // it only surfaces during the Cape Town Special Week (see getSeasonInfo).
  capetown: {
    key: 'capetown',
    name: 'Cape Town',
    greeting: 'Cape Town calling, Pooks 🌊',
    blurb: 'Ocean air, fynbos green and Table Mountain under its cloud tablecloth. ⛰️',
    // Soft drifting clouds (the mountain's "tablecloth"), gentle waves + a feather.
    particles: ['☁️', '🌊', '☁️', '🪶'],
  },
}

// Cape Town Special Week visual theme: Sat 20 Jun → Mon 29 Jun 2026, keyed off
// the SA-local date (UTC+2) via saDateKey — the same key the special messages
// and challenges use — so all three switch on together at SA midnight. During
// this window the Cape Town theme overrides the normal season; after the 29th it
// simply stops matching and the real season returns — zero manual cleanup.
export const CAPE_TOWN_TRIP_START = '2026-06-20'
export const CAPE_TOWN_TRIP_END = '2026-06-29'

export function isCapeTownWeek(date = new Date()) {
  const key = saDateKey(date)
  return key >= CAPE_TOWN_TRIP_START && key <= CAPE_TOWN_TRIP_END
}

// How many sightings she logged with a date inside the Cape Town trip window —
// counted from the raw sightings log (dateSpotted is an saDateKey YYYY-MM-DD),
// kept entirely separate from her lifetime collection total.
export function capeTownTripSightingCount(sightings = []) {
  return (sightings || []).filter(
    (s) => s?.dateSpotted >= CAPE_TOWN_TRIP_START && s?.dateSpotted <= CAPE_TOWN_TRIP_END,
  ).length
}

export function getSeasonInfo(date = new Date()) {
  if (isCapeTownWeek(date)) return SEASONS.capetown
  // Deliberate creative override: showing Spring a couple of days early
  // rather than one last stretch of Winter. Real-season display, not a
  // bug — getSeason(date) itself is untouched and still used for anything
  // that needs the true meteorological season (e.g. the bird-ID API call).
  // Revert to `SEASONS[getSeason(date)]` whenever Winter should return.
  return SEASONS.spring
}
