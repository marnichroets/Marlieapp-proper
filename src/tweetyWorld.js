// Tweety World — pure data + helpers for the egg basket, incubation, story
// events, the Sanctuary and the Bird Room. All warm, recoverable, magical.

export const MAX_EGGS = 5
export const INCUBATION_DAYS = 3
export const HATCH_TAPS = 10

export function dayKeyW(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

// ---- incubation ------------------------------------------------------------
export function neededWarms(incubating) {
  return INCUBATION_DAYS + (incubating?.extraDays || 0)
}

// Visual stage of the incubating egg (1..3 of the current cycle).
export function incubationStage(incubating) {
  if (!incubating) return 0
  return Math.min(neededWarms(incubating), (incubating.progress || 0) + 1)
}

export function warmedToday(incubating) {
  return incubating?.lastWarmDay === dayKeyW(0)
}

// Has this egg reached its final wobble (rapid-tap) day?
export function readyToHatch(incubating) {
  return incubating && (incubating.progress || 0) >= neededWarms(incubating) - 1
}

// ---- Sanctuary -------------------------------------------------------------
export const SANCTUARY_SECTIONS = [
  { id: 'garden', name: 'Garden', emoji: '🌿', min: 0, blurb: 'A soft green garden full of flowers.' },
  { id: 'waterside', name: 'Waterside', emoji: '💧', min: 5, blurb: 'A little pond ringed with reeds.' },
  { id: 'forest', name: 'Forest', emoji: '🌲', min: 10, blurb: 'Tall cool trees and dappled shade.' },
  { id: 'savanna', name: 'Savanna', emoji: '🌾', min: 20, blurb: 'Golden grass and acacia trees.' },
  { id: 'mountain', name: 'Mountain', emoji: '⛰️', min: 35, blurb: 'Misty rocky cliffs and big sky.' },
]

export function sanctuarySectionFor(index) {
  // Spread residents across unlocked sections.
  const sec = [...SANCTUARY_SECTIONS].reverse().find((s) => index >= s.min)
  return sec ? sec.id : 'garden'
}

export function unlockedSanctuarySections(count) {
  return SANCTUARY_SECTIONS.filter((s) => count >= s.min)
}

// ---- Bird Room -------------------------------------------------------------
export const ROOM_FURNITURE = [
  { id: 'perch', name: 'Basic perch', emoji: '🪵', cost: 0, desc: 'A cosy little branch to land on.' },
  { id: 'plant', name: 'Potted plant', emoji: '🌿', cost: 80, desc: 'A leafy green friend in the corner.' },
  { id: 'bath', name: 'Bird bath', emoji: '💧', cost: 100, desc: 'Birds splash happily in it.' },
  { id: 'lights', name: 'Fairy lights', emoji: '🌟', cost: 150, desc: 'The room glows warmly at night.' },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', cost: 200, desc: 'Birds warm themselves in winter.' },
  { id: 'painting', name: 'Bird painting', emoji: '🖼️', cost: 120, desc: 'A framed painting of your top bird.' },
  { id: 'rug', name: 'Cosy rug', emoji: '🟤', cost: 100, desc: 'Makes the room feel extra warm.' },
  { id: 'feeder', name: 'Window feeder', emoji: '🪟', cost: 180, desc: 'Wild birds visit from outside.' },
  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', cost: 150, desc: 'Your spotting count, shelved as books.' },
  { id: 'musicbox', name: 'Music box', emoji: '🎵', cost: 200, desc: 'Plays gentle bird song.' },
  { id: 'full', name: 'Full room upgrade', emoji: '🏡', cost: 800, desc: 'Everything included — the most beautiful room.' },
]

export function ownsFurniture(room, id) {
  const f = room?.furniture || ['perch']
  return f.includes(id) || f.includes('full') || id === 'perch'
}

// ---- Story events ----------------------------------------------------------
// kind: 'good' = applies instantly; 'tap' = tap N times before the deadline.
export const WORLD_EVENTS = [
  // Incubation challenges
  { id: 'cat', scope: 'incubation', emoji: '🐾', kind: 'tap', taps: 10, windowMin: 10,
    title: 'A cat is lurking near the nest!', body: 'Tap 10 times quickly to scare it away!',
    failNote: 'The cat wandered off, but the egg lost a little warmth.', lossDay: true },
  { id: 'rain', scope: 'incubation', emoji: '🌧️', kind: 'tap', taps: 5, windowMin: 30,
    title: 'It is raining heavily!', body: 'Your egg needs extra warmth — tap 5 times.',
    failNote: 'The rain passed. Your egg is okay, just a touch chilly.' },
  { id: 'lizard', scope: 'incubation', emoji: '🦎', kind: 'tap', taps: 5, windowMin: 15,
    title: 'A lizard snuck into the nest!', body: 'Tap it 5 times to gently chase it away!',
    failNote: 'The lizard left on its own. No harm done.' },
  { id: 'wind', scope: 'incubation', emoji: '💨', kind: 'tap', taps: 15, windowMin: 1,
    title: 'Strong winds!', body: 'Tap rapidly to stabilise the nest!',
    failNote: 'The wind settled. The nest held on.' },
  // Incubation good fortune
  { id: 'star', scope: 'incubation', emoji: '🌟', kind: 'good',
    title: 'A shooting star passed over!', body: 'Your egg absorbed its magic — it will hatch a day early!' },
  { id: 'bees', scope: 'incubation', emoji: '🐝', kind: 'good',
    title: 'Bees built a hive nearby!', body: 'Your bird will have honey forever — a free food upgrade for 24 hours!' },
  { id: 'spring', scope: 'incubation', emoji: '🌸', kind: 'good',
    title: 'Magic spring light hit your egg!', body: 'A little blessing — bonus 25 coins!' },
  // Baby events
  { id: 'tumble', scope: 'baby', emoji: '💪', kind: 'good',
    title: 'Your baby tried to fly and tumbled!', body: 'Give it a pep talk — it gets right back up. +10 coins!' },
  { id: 'friend', scope: 'baby', emoji: '🐦', kind: 'good',
    title: 'Your baby made friends with a wild bird!', body: 'That bird is now marked as spotted in your collection!' },
  { id: 'song', scope: 'baby', emoji: '🎵', kind: 'good',
    title: 'Your baby sang its first song today!', body: 'Its species’ birdsong is now unlocked!' },
  { id: 'lonely', scope: 'baby', emoji: '💛', kind: 'good',
    title: 'Your baby is feeling lonely!', body: 'Play with it for a moment — it cheers right up. +5 coins!' },
  { id: 'seeds', scope: 'baby', emoji: '🌾', kind: 'good',
    title: 'Your baby discovered it LOVES seeds!', body: 'Premium food is 20% off in the Bird Store today!' },
]

export function eventById(id) {
  return WORLD_EVENTS.find((e) => e.id === id)
}
