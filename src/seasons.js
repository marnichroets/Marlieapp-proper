// Southern Hemisphere seasonal theming.
// Summer: Dec-Feb, Autumn: Mar-May, Winter: Jun-Aug, Spring: Sep-Nov.

import { saDateKey } from './saDate'

export function getSeason(date = new Date()) {
  const month = date.getMonth() // 0 = Jan
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
function isCapeTownWeek(date) {
  const key = saDateKey(date)
  return key >= '2026-06-20' && key <= '2026-06-29'
}

export function getSeasonInfo(date = new Date()) {
  if (isCapeTownWeek(date)) return SEASONS.capetown
  return SEASONS[getSeason(date)]
}
