// Pure data + helpers for the competitive bird games (no components).
// Three games only: Quiz Battle, Bird Snap, Bird or Bluff. All are score-based
// and synced by a shared 4-digit session code so both players get the same
// questions in the same order.

export function defaultGames() {
  return {
    leaderboard: { pooksWins: 0, marnichWins: 0, draws: 0 },
    // Each game is resolved per shared session code.
    quiz: { code: '', pooks: null, marnich: null },
    snap: { code: '', pooks: null, marnich: null },
    bluff: { code: '', pooks: null, marnich: null },
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
// Pool of 40+ so every session's 10 questions feel fresh. Correct answer is
// always index 0 here; getQuizForSession reshuffles options per session.
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
  { q: 'Which flightless bird is the largest living bird on Earth?', options: ['Common Ostrich', 'African Penguin', 'Hamerkop'], answer: 0 },
  { q: 'Which black-and-white penguin breeds on South African beaches?', options: ['African Penguin', 'Cape Gannet', 'Egyptian Goose'], answer: 0 },
  { q: 'What is South Africa’s national bird?', options: ['Blue Crane', 'Hadeda Ibis', 'Pied Crow'], answer: 0 },
  { q: 'Which bird famously stamps on snakes when it hunts?', options: ['Secretary Bird', 'Cattle Egret', 'Laughing Dove'], answer: 0 },
  { q: 'Which colourful bird does tumbling barrel-rolls in display flight?', options: ['Lilac-breasted Roller', 'Cape Sparrow', 'Olive Thrush'], answer: 0 },
  { q: 'Which bird leads people and honey badgers to bees’ nests?', options: ['Greater Honeyguide', 'Common Myna', 'Grey Heron'], answer: 0 },
  { q: 'Which tiny bird hovers at flowers to drink nectar?', options: ['Malachite Sunbird', 'Pied Crow', 'Blacksmith Lapwing'], answer: 0 },
  { q: 'Which is one of the heaviest birds still able to fly?', options: ['Kori Bustard', 'Cape White-eye', 'Laughing Dove'], answer: 0 },
  { q: 'Which bird builds an enormous domed stick nest?', options: ['Hamerkop', 'Cape Sparrow', 'Common Myna'], answer: 0 },
  { q: 'Which seabird plunge-dives off the Cape in huge flocks?', options: ['Cape Gannet', 'Egyptian Goose', 'Hadeda Ibis'], answer: 0 },
  { q: 'Which bird rides on big mammals, eating their ticks?', options: ['Red-billed Oxpecker', 'Cape Robin-Chat', 'Olive Thrush'], answer: 0 },
  { q: 'Which weaver builds giant communal “haystack” nests?', options: ['Sociable Weaver', 'Pied Crow', 'Grey Heron'], answer: 0 },
  { q: 'Which fynbos bird has a very long streaming tail?', options: ['Cape Sugarbird', 'Cape Sparrow', 'Hadeda Ibis'], answer: 0 },
  { q: 'Which crane wears a golden crown of feathers?', options: ['Grey Crowned Crane', 'Blue Crane', 'Pied Crow'], answer: 0 },
  { q: 'Which bird is named for its hammer-shaped head?', options: ['Hamerkop', 'Hadeda Ibis', 'Cape Robin-Chat'], answer: 0 },
  { q: 'Which raptor is also called the African Sea Eagle?', options: ['African Fish Eagle', 'Rock Kestrel', 'Cattle Egret'], answer: 0 },
  { q: 'The Bokmakierie is which kind of bird?', options: ['Bush-shrike', 'Weaver', 'Dove'], answer: 0 },
  { q: 'Which weaver turns bright red and black to breed?', options: ['Southern Red Bishop', 'Pied Crow', 'Grey Heron'], answer: 0 },
  { q: 'Which is the most common garden dove in South Africa?', options: ['Laughing Dove', 'African Fish Eagle', 'Kori Bustard'], answer: 0 },
  { q: 'Which glossy starling shines brilliant blue-green?', options: ['Cape Glossy Starling', 'Olive Thrush', 'Cape Sparrow'], answer: 0 },
  { q: 'Which migratory swallow visits SA in summer?', options: ['Barn Swallow', 'Egyptian Goose', 'Hadeda Ibis'], answer: 0 },
  { q: 'Which little falcon hovers while hunting mice?', options: ['Rock Kestrel', 'Cattle Egret', 'Common Myna'], answer: 0 },
  { q: 'Which bird’s name in Zulu, “iNgududu”, mimics its booming call?', options: ['Ground Hornbill', 'Cape Sparrow', 'Laughing Dove'], answer: 0 },
  { q: 'Which sunbird male flashes a glittering green throat?', options: ['Malachite Sunbird', 'Pied Crow', 'Olive Thrush'], answer: 0 },
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

// ---- Bird Snap -------------------------------------------------------------
// Photo + 4 name options. Built from the bird library so both players get the
// same 10 birds and the same option order from the shared code.
export function getSnapForSession(code, library) {
  const withPhoto = (library || []).filter((b) => b && b.imageUrl && b.commonName)
  if (withPhoto.length < 4) return []
  const seed = seedFromCode(code)
  const picks = seededShuffle(withPhoto, seed).slice(0, 10)
  const allNames = withPhoto.map((b) => b.commonName)
  return picks.map((bird, qi) => {
    const decoys = seededShuffle(
      allNames.filter((n) => n !== bird.commonName),
      seed + qi * 6271,
    ).slice(0, 3)
    const options = seededShuffle([bird.commonName, ...decoys], seed + qi * 911)
    return {
      name: bird.commonName,
      imageUrl: bird.imageUrl,
      options,
      answer: options.indexOf(bird.commonName),
    }
  })
}

// ---- Bird or Bluff ---------------------------------------------------------
// Real, verified facts vs. clearly made-up "bluffs". `real: true` means it is
// a genuine fact (tap REAL); `real: false` is a bluff (tap BLUFF).
export const BLUFF_BANK = [
  { text: 'The Hadeda Ibis’s loud call can be heard up to 2km away.', real: true },
  { text: 'The Secretary Bird hunts on foot, stamping on snakes to stun them.', real: true },
  { text: 'The Greater Honeyguide leads people to wild bees’ nests for honey.', real: true },
  { text: 'The Common Ostrich is the largest living bird and cannot fly.', real: true },
  { text: 'Weaver birds tie real knots in grass to build their nests.', real: true },
  { text: 'The Blue Crane is South Africa’s national bird.', real: true },
  { text: 'Oxpeckers perch on big mammals and eat the ticks off them.', real: true },
  { text: 'African Penguins breed on South African beaches like Boulders Beach.', real: true },
  { text: 'The Hamerkop builds one of the largest nests of any African bird.', real: true },
  { text: 'Sociable Weavers build huge communal nests used for many generations.', real: true },
  { text: 'The Kori Bustard is one of the heaviest birds that can still fly.', real: true },
  { text: 'Lilac-breasted Rollers do tumbling “rolling” display flights.', real: true },
  { text: 'The Cape Sugarbird sips nectar from protea flowers in the fynbos.', real: true },
  { text: 'Cape Gannets plunge-dive head-first into the sea to catch fish.', real: true },
  { text: 'The Southern Ground Hornbill can live for several decades.', real: true },
  { text: 'The Hadeda Ibis can copy human speech just like a parrot.', real: false },
  { text: 'Ostriches bury their heads in the sand when they get scared.', real: false },
  { text: 'Egyptian Geese hibernate underwater all through winter.', real: false },
  { text: 'The Cape Robin-Chat changes colour with the seasons like a chameleon.', real: false },
  { text: 'The Pied Crow can count out loud all the way to one hundred.', real: false },
  { text: 'Sunbirds sleep hanging upside-down like little bats.', real: false },
  { text: 'The Secretary Bird got its name from carrying letters between farms.', real: false },
  { text: 'Blacksmith Lapwings forge tiny nests out of scrap metal.', real: false },
  { text: 'The Helmeted Guineafowl’s bony helmet is actually a second brain.', real: false },
  { text: 'African Fish Eagles dive ten metres underwater to grab fish.', real: false },
  { text: 'Weavers trade their woven nests using small pebbles as money.', real: false },
  { text: 'The Hoopoe steers by magnets hidden in its crown feathers.', real: false },
]

export function getBluffForSession(code) {
  return seededShuffle(BLUFF_BANK, seedFromCode(code)).slice(0, 15)
}
