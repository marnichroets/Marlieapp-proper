// Southern Hemisphere seasonal theming.
// Summer: Dec-Feb, Autumn: Mar-May, Winter: Jun-Aug, Spring: Sep-Nov.

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
}

export function getSeasonInfo(date = new Date()) {
  return SEASONS[getSeason(date)]
}
