// Bird Store catalogue + helpers (pure data, no components).

export function defaultStore() {
  return {
    food: 'basic', // basic | premium | luxury | infinite
    water: 'basic',
    nest: 'basic', // basic | cosy | luxury | treehouse
    aviaryTier: 'basic', // basic | garden | waterfall | paradise
    toys: [], // 'string' | 'mirror' | 'swing' | 'playground'
    rainbowUntil: 0,
    goldenSeedUntil: 0,
    loveLetter: '',
    birthdayCount: 0,
  }
}

// Tiered upgrades: buying one implies you own every cheaper tier too.
export const STORE_SECTIONS = [
  {
    key: 'food',
    field: 'food',
    kind: 'tier',
    title: 'Food upgrades 🌾',
    items: [
      { id: 'basic', name: 'Basic Seeds', emoji: '🌾', cost: 0, desc: 'Refills every 12 hours.' },
      { id: 'premium', name: 'Premium Bird Mix', emoji: '🥗', cost: 150, desc: 'Refills every 18 hours instead of 12.' },
      { id: 'luxury', name: 'Luxury Feast', emoji: '🍱', cost: 400, desc: 'Refills every 24 hours. Tweety is always extra happy.' },
      { id: 'infinite', name: 'Infinite Feeder', emoji: '🪣', cost: 800, desc: 'Food never runs out. Tweety is permanently well fed.' },
    ],
  },
  {
    key: 'water',
    field: 'water',
    kind: 'tier',
    title: 'Water upgrades 💧',
    items: [
      { id: 'basic', name: 'Basic Bowl', emoji: '💧', cost: 0, desc: 'Refills every 12 hours.' },
      { id: 'premium', name: 'Medium Tank', emoji: '🪣', cost: 150, desc: 'Refills every 18 hours.' },
      { id: 'luxury', name: 'Large Tank', emoji: '💦', cost: 400, desc: 'Refills every 24 hours.' },
      { id: 'infinite', name: 'Infinite Water Fountain', emoji: '⛲', cost: 800, desc: 'Water never runs out.' },
    ],
  },
  {
    key: 'nest',
    field: 'nest',
    kind: 'tier',
    title: 'Nest upgrades 🪺',
    items: [
      { id: 'basic', name: 'Basic Nest', emoji: '🪺', cost: 0, desc: 'A cosy twiggy nest.' },
      { id: 'cosy', name: 'Cosy Nest', emoji: '🏡', cost: 200, desc: 'Adds cushions and flowers to the nest.' },
      { id: 'luxury', name: 'Luxury Nest', emoji: '🏰', cost: 500, desc: 'Adds a little roof, fairy lights and a garden.' },
      { id: 'treehouse', name: 'Magic Treehouse', emoji: '🌳', cost: 1000, desc: 'A full treehouse with a balcony — the most beautiful nest.' },
    ],
  },
  {
    key: 'aviary',
    field: 'aviaryTier',
    kind: 'tier',
    title: 'Aviary upgrades 🌿',
    items: [
      { id: 'basic', name: 'Basic Aviary', emoji: '🪶', cost: 0, desc: 'Holds 8 birds.' },
      { id: 'garden', name: 'Garden Aviary', emoji: '🌿', cost: 300, desc: 'Adds flowers and trees to the aviary.' },
      { id: 'waterfall', name: 'Waterfall Aviary', emoji: '💦', cost: 600, desc: 'Adds a little waterfall — birds look extra happy.' },
      { id: 'paradise', name: 'Paradise Aviary', emoji: '🏝️', cost: 1200, desc: 'Tropical paradise with rainbow and sunshine.' },
    ],
  },
  {
    key: 'toys',
    field: 'toys',
    kind: 'collection',
    title: 'Toys for Tweety 🧸',
    items: [
      { id: 'string', name: 'Ball of string', emoji: '🧶', cost: 100, desc: 'Tweety plays with it and stays happy longer.' },
      { id: 'mirror', name: 'Mirror', emoji: '🪞', cost: 150, desc: 'Tweety admires herself — happiness decays 20% slower.' },
      { id: 'swing', name: 'Swing', emoji: '🎪', cost: 200, desc: 'Tweety swings during her idle animation.' },
      { id: 'playground', name: 'Full Playground', emoji: '🎠', cost: 500, desc: 'All toys combined — Tweety stays happy for ages.' },
    ],
  },
  {
    key: 'special',
    field: null,
    kind: 'consumable',
    title: 'Special items ✨',
    items: [
      { id: 'loveletter', name: 'Love Letter from Marnich', emoji: '💌', cost: 250, desc: 'A tiny letter tied to her leg — Tweety does a special happy dance.' },
      { id: 'goldenseed', name: 'Golden Seed', emoji: '🌟', cost: 300, desc: 'Guarantees Tweety lays an egg within 3 days.' },
      { id: 'rainbow', name: 'Rainbow Feather', emoji: '🌈', cost: 350, desc: 'Tweety glows rainbow colours for 24 hours.' },
      { id: 'cake', name: 'Birthday Cake', emoji: '🎂', cost: 200, desc: 'Celebrate Tweety with confetti and a party hat.' },
    ],
  },
]

const TIER_ORDER = {
  food: ['basic', 'premium', 'luxury', 'infinite'],
  water: ['basic', 'premium', 'luxury', 'infinite'],
  nest: ['basic', 'cosy', 'luxury', 'treehouse'],
  aviaryTier: ['basic', 'garden', 'waterfall', 'paradise'],
}

export function isOwned(store, section, itemId) {
  if (section.kind === 'tier') {
    const order = TIER_ORDER[section.field]
    return order.indexOf(store[section.field]) >= order.indexOf(itemId)
  }
  if (section.kind === 'collection') {
    const owned = store[section.field] || []
    return owned.includes(itemId) || owned.includes('playground')
  }
  return false // consumables are always buyable
}

export function foodIntervalHours(store) {
  return { basic: 12, premium: 18, luxury: 24, infinite: Infinity }[store?.food || 'basic']
}
export function waterIntervalHours(store) {
  return { basic: 12, premium: 18, luxury: 24, infinite: Infinity }[store?.water || 'basic']
}

// Perks that keep Tweety from ever drooping.
export function tweetyNeverSad(store) {
  if (!store) return false
  if (store.food === 'infinite' || store.food === 'luxury') return true
  if ((store.toys || []).includes('playground')) return true
  return false
}

export function rainbowActive(store) {
  return Boolean(store?.rainbowUntil && store.rainbowUntil > Date.now())
}
