// Pure data + helpers for the competitive bird games (no components).

export function defaultGames() {
  return {
    leaderboard: { pooksWins: 0, marnichWins: 0, draws: 0 },
    // Each game is resolved per shared session code.
    quiz: { code: '', pooks: null, marnich: null },
    wordle: { code: '', pooks: null, marnich: null },
    twentyq: { code: '', pooks: null, marnich: null },
    twentyqBest: { pooks: null, marnich: null },
    trashTalk: '',
    lastResult: null,
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// Current time behind a helper so timer components can read "now" without
// tripping the no-impure-calls-in-render lint rule.
export function now() {
  return Date.now()
}

// ---- Session codes + seeded randomness (anti-cheat, same Qs for both) ------
export function generateSessionCode() {
  return String(1000 + Math.floor(Math.random() * 9000))
}

function seedFromCode(code) {
  let h = 2166136261
  const s = String(code || '0000')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Deterministic shuffle so both players get the identical order from a code.
function seededShuffle(items, seed) {
  const arr = [...items]
  let s = seed || 1
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ---- Quiz Battle -----------------------------------------------------------
export const QUIZ_BANK = [
  { q: 'Which bird is known for its loud cry at dawn?', options: ['Hadeda Ibis', 'Cape White-eye', 'Malachite Sunbird'], answer: 0 },
  { q: 'What colour is a breeding male Southern Masked Weaver?', options: ['Bright yellow', 'Deep blue', 'Pure white'], answer: 0 },
  { q: 'Which SA bird builds an elaborate hanging woven nest?', options: ['Southern Masked Weaver', 'Pied Crow', 'Grey Heron'], answer: 0 },
  { q: 'What is the Afrikaans name for the African Hoopoe?', options: ['Hoephoep', 'Hadeda', 'Kolgans'], answer: 0 },
  { q: 'Which bird seals its partner inside a tree hole to nest?', options: ['African Grey Hornbill', 'Laughing Dove', 'Cape Sparrow'], answer: 0 },
  { q: 'Which bird hovers dead-still in the air while hunting?', options: ['Rock Kestrel', 'Egyptian Goose', 'Cattle Egret'], answer: 0 },
  { q: 'The “voice of African waters” belongs to which bird?', options: ['African Fish Eagle', 'Common Myna', 'Speckled Pigeon'], answer: 0 },
  { q: 'Which polka-dotted bird wears a bony helmet?', options: ['Helmeted Guineafowl', 'Cape Wagtail', 'Olive Thrush'], answer: 0 },
  { q: 'Which glossy black bird mimics others to steal their food?', options: ['Fork-tailed Drongo', 'Barn Swallow', 'Cape Weaver'], answer: 0 },
  { q: 'Which bird struts lawns by the dam, honking loudly?', options: ['Egyptian Goose', 'Malachite Sunbird', 'Crested Barbet'], answer: 0 },
  { q: 'Which tiny bird wears little white spectacles?', options: ['Cape White-eye', 'Pied Crow', 'Blacksmith Lapwing'], answer: 0 },
  { q: 'Which bird rings out a metallic “tink-tink” like an anvil?', options: ['Blacksmith Lapwing', 'Laughing Dove', 'Hadeda Ibis'], answer: 0 },
  { q: 'Which “butcher bird” hangs its prey on thorns?', options: ['Common Fiscal', 'Cape Robin-Chat', 'Cattle Egret'], answer: 0 },
  { q: 'Which green ghost hangs upside-down in fig trees?', options: ['African Green Pigeon', 'Pied Crow', 'Grey Heron'], answer: 0 },
  { q: 'Which big owl of the night has soft pink eyelids?', options: ["Verreaux's Eagle-Owl", 'Rock Kestrel', 'Cape Sparrow'], answer: 0 },
  { q: 'Which bird follows grazing animals to catch insects?', options: ['Cattle Egret', 'African Fish Eagle', 'Crested Barbet'], answer: 0 },
  { q: 'The Afrikaans “Kolgans” is which bird?', options: ['Egyptian Goose', 'African Hoopoe', 'Pied Crow'], answer: 0 },
  { q: 'Which dove’s call sounds like a gentle little chuckle?', options: ['Laughing Dove', 'African Fish Eagle', 'Spotted Eagle-Owl'], answer: 0 },
]

// 10 questions for a session, shuffled by the code, with options shuffled too
// so the correct answer isn't always first (anti-cheat). Returns the correct
// option index for each question.
export function getQuizForSession(code) {
  const seed = seedFromCode(code)
  const questions = seededShuffle(QUIZ_BANK, seed).slice(0, 10)
  return questions.map((item, qi) => {
    const correctText = item.options[item.answer]
    const options = seededShuffle(item.options, seed + qi * 7919)
    return { q: item.q, options, answer: options.indexOf(correctText) }
  })
}

// ---- Wordle ----------------------------------------------------------------
export const WORDLE_WORDS = [
  'ROBIN', 'HERON', 'EGRET', 'CRANE', 'STORK', 'GREBE', 'RAVEN', 'QUAIL', 'SNIPE', 'STILT',
  'HOOPOE', 'DRONGO', 'WEAVER', 'BISHOP', 'COUCAL', 'BARBET', 'CANARY', 'MARTIN', 'ORIOLE',
  'PIGEON', 'BULBUL', 'SHRIKE', 'FISCAL', 'BOUBOU', 'DARTER', 'JACANA', 'AVOCET', 'PLOVER', 'CUCKOO',
]

export function getWordForSession(code) {
  return WORDLE_WORDS[seedFromCode(code) % WORDLE_WORDS.length]
}

// Returns array of 'correct' | 'present' | 'absent' for each letter of guess.
export function evaluateGuess(guess, answer) {
  const res = Array(guess.length).fill('absent')
  const a = answer.split('')
  const used = Array(answer.length).fill(false)
  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === a[i]) {
      res[i] = 'correct'
      used[i] = true
    }
  }
  for (let i = 0; i < guess.length; i += 1) {
    if (res[i] === 'correct') continue
    const j = a.findIndex((ch, k) => !used[k] && ch === guess[i])
    if (j >= 0) {
      res[i] = 'present'
      used[j] = true
    }
  }
  return res
}

// ---- 20 Questions ----------------------------------------------------------
function sizeCm(bird) {
  const m = String(bird.size || '').match(/(\d+)\s*-?\s*(\d+)?\s*cm/)
  if (!m) return 0
  return Number(m[2] || m[1])
}

export const TWENTYQ_QUESTIONS = [
  { id: 'water', label: 'Is it a water bird? 💧', test: (b) => (b.tags || []).includes('Water birds') || b.category === 'Water birds' },
  { id: 'garden', label: 'Would I see it in a garden? 🌳', test: (b) => (b.tags || []).includes('Garden birds') },
  { id: 'colour', label: 'Is it brightly colourful? 🌈', test: (b) => (b.tags || []).includes('Colourful birds') },
  { id: 'noisy', label: 'Is it a noisy bird? 📢', test: (b) => (b.tags || []).includes('Noisy birds') },
  { id: 'prey', label: 'Is it a bird of prey? 🦅', test: (b) => (b.tags || []).includes('Birds of prey') || b.category === 'Birds of prey' },
  { id: 'big', label: 'Is it bigger than a dove (30cm+)? 📏', test: (b) => sizeCm(b) >= 30 },
  { id: 'tiny', label: 'Is it tiny (under 16cm)? 🐤', test: (b) => sizeCm(b) > 0 && sizeCm(b) < 16 },
  { id: 'nearme', label: 'Is it common near Potchefstroom? 📍', test: (b) => Boolean(b.nearMe) },
  { id: 'rare', label: 'Is it a rare or special bird? ✨', test: (b) => Boolean(b.special) },
]

export function answer20Q(bird, questionId) {
  const q = TWENTYQ_QUESTIONS.find((item) => item.id === questionId)
  return q ? Boolean(q.test(bird)) : false
}

// Deterministic target index so both players guess the same bird from a code.
export function getTwentyQIndex(code, length) {
  return seedFromCode(code) % Math.max(1, length)
}
