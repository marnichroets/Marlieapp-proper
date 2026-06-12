// One-time cinematic intro — 13 mobile-first screens (390px). NOTHING
// auto-advances: text and items reveal on their own when a screen loads, but
// moving to the NEXT screen only happens when she taps the arrow, or taps the
// screen (first tap fast-forwards the reveal, second tap advances).
//
// No music — silence is the default. Instead, characterful Web-Audio bird
// calls play at key moments: a loud comedic Hadeda when the seal drops, soft
// murmuring "meeting" chatter at the Council, a different call as each evidence
// polaroid lands (flamingo honk, an extra-loud rooster crow, a rapid barbet
// tok-tok-tok, the iconic Fish Eagle), a Fish-Eagle-plus-Hadeda fanfare at the
// verdict, cute chick cheeps when she meets Tweety, and a full chorus explosion
// on accept. The personal-note screen is kept completely silent.
import { useEffect, useRef, useState } from 'react'
import './IntroSequence.css'
import './IntroExtras.css'
import { playChirp } from './tweetyData'
import { TweetyBird } from './Tweety'

// Screen map (13 total):
//  1 opening · 2 council meeting · 3–6 evidence F/G/H/I · 7 dramatic pause
//  8 verdict · 9 mission briefing · 10 how it works · 11 meet Tweety
//  12 personal note · 13 accept
const TOTAL = 13
const EVI_FIRST = 3
const EVI_LAST = 6

// Warm golden screens vs the cream candlelit note; everything else is the dark
// "classified file" mood.
const WARM_SCREENS = new Set([8, 9, 10, 11, 13])
const CREAM_SCREEN = 12
function moodFor(screen) {
  if (screen === CREAM_SCREEN) return 'cream'
  if (WARM_SCREENS.has(screen)) return 'warm'
  return 'dark'
}

// The four evidence photos that are NOT in the printed letter, each its own
// screen with a specific Bird Council comment and a tiny animated critter.
const EVIDENCE = [
  {
    id: 'f',
    src: '/intro/evidence-f.jpg',
    emoji: '🦩',
    alt: 'A wake of flamingos',
    file: 'EVIDENCE F',
    comment:
      'The Flamingo Department requested this photo be framed and hung in Council chambers. Motion approved 7–0. The flamingos are aware and deeply flattered.',
    critter: '🦩',
    critterCls: 'strut',
  },
  {
    id: 'g',
    src: '/intro/evidence-g.jpg',
    emoji: '🐓',
    alt: 'A rooster',
    file: 'EVIDENCE G',
    comment:
      'This is a chicken. The Council acknowledges its presence. The Poultry Division does not exist. We are moving on. Nothing to see here.',
    critter: '🐓',
    critterCls: 'stomp',
  },
  {
    id: 'h',
    src: '/intro/evidence-h.jpg',
    emoji: '🐦',
    alt: 'A Black-collared Barbet',
    file: 'EVIDENCE H',
    comment:
      'A Black-collared Barbet. Spotted. Photographed. The Barbet Division stood up and applauded for four minutes. There were tears. It was a lot.',
    critter: '🐦',
    critterCls: 'bounce',
  },
  {
    id: 'i',
    src: '/intro/evidence-i.jpg',
    emoji: '🦅',
    alt: 'Two African Fish Eagles together',
    file: 'EVIDENCE I',
    comment:
      'Two African Fish Eagles. Together. The Council found this unexpectedly romantic and had to take a five minute tea break to compose themselves.',
    critter: '🦅🦅',
    critterCls: 'pair',
  },
]

// The Council, seated around the table (screen 2).
const COUNCIL_SEATS = [
  { emoji: '🦤', name: 'Hadeda', role: 'Chairman', react: 'chair' },
  { emoji: '🐦', name: 'Weaver', role: 'Secretary', react: 'scribble' },
  { emoji: '🦅', name: 'Secretary Bird', role: 'Dramatic', react: 'gasp' },
  { emoji: '🦉', name: 'Eagle-Owl', role: 'Wise', react: 'nod' },
  { emoji: '🦩', name: 'Flamingo', role: 'Fabulous', react: 'pose' },
]

const PAUSE_WORDS = ['The.', 'Council.', 'Had.', 'Seen.', 'Enough.']

const VOTES = [
  ['🦤', 'Hadeda'],
  ['🐦', 'Weaver'],
  ['🦩', 'Flamingo'],
  ['🦉', 'Eagle-Owl'],
  ['🦅', 'Secretary Bird'],
]

const FIELD_KIT = [
  ['🐦', 'A personal bird collection to fill — hundreds of SA species waiting to be found'],
  ['🥚', 'Every new species you spot → a mystery egg appears in your nest'],
  ['🎁', 'Reach milestones → unlock real surprises from Marnich Bank'],
  ['💌', 'Earn enough coins → unlock hidden notes from Marnich'],
  ['🏆', 'Complete daily challenges → earn coins → make the Council proud'],
]

const STEPS = [
  ['🌿', 'Step 1', 'Go outside and find a bird'],
  ['📷', 'Step 2', 'Take a photo and show the Bird Council'],
  ['🔎', 'Step 3', 'The Council identifies it and adds it to your collection'],
  ['💛', 'Step 4', 'Earn coins, unlock surprises, make the Council proud'],
]

const TWEETY_LINES = [
  'She needs feeding every day.',
  'And water. And someone to play with.',
  'She has been very patient.',
  'Unlike Field Agent Hadeda.',
]

// The personal note — in Afrikaans, revealed slowly line by line in silence,
// with the photo of them together fading in at the end.
const NOTE_LINES = [
  'Ek het dit vir jou gebou',
  "omdat jy elke keer oplig wanneer jy 'n voël sien.",
  'Jou oë word groot en jy gryp my arm',
  'en sê kyk, kyk —',
  'en eerlik, om vir jou te kyk',
  'is beter as om na enige voël te kyk.',
  'Hierdie app is joune.',
  'Die voëls wag vir jou.',
  'Gaan soek nou voëls, Pooks. 🐦',
  '— Marnich',
]

// Cumulative reveal timings (ms from screen mount) for the named screens. These
// only animate content WITHIN a screen — they never advance to the next screen.
const SCREEN_BEATS = {
  1: [1600, 2700, 3600, 4500],
  2: [700, 2000, 3200, 3800],
  7: [500, 950, 1400, 1850, 2400, 3700, 4700, 5900],
  8: [400, 1200, 2000, 2800, 3500],
  9: [400, 1000, 1600, 2200, 2800, 3400],
  10: [400, 1000, 1600, 2200],
  11: [700, 2000, 3300, 4500, 5600, 6700, 7800, 9000],
  12: [700, 1900, 3800, 5000, 6900, 8100, 10000, 11200, 13100, 14300, 15600],
  13: [300],
}
const isEvidence = (s) => s >= EVI_FIRST && s <= EVI_LAST
const beatsFor = (s) => (isEvidence(s) ? [300, 1200] : SCREEN_BEATS[s] || [300])

// ---- Sound (guarded so a missing/blocked AudioContext is just silent) -------
let sharedCtx
function getCtx() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!sharedCtx) sharedCtx = new Ctx()
    if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {})
    return sharedCtx
  } catch {
    return null
  }
}

// A small soft chirp (reuses Tweety's synth voice).
function softChirp(kind) {
  try {
    playChirp(kind)
  } catch {
    /* sound is a nicety */
  }
}

// A low wooden "thud" — the wax seal landing / the gavel banging.
function thud() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(165, now)
    osc.frequency.exponentialRampToValueAtTime(56, now + 0.13)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.22)
  } catch {
    /* ignore */
  }
}

// A single distant Hadeda — the classic nasal "ha-ha-haaa", quietened by a
// distance factor so it feels far away. Used for the verdict chorus.
function hadedaCall(distance = 1) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const vol = 0.16 / Math.max(1, distance)
    const notes = [
      [0, 380, 0.16],
      [0.2, 300, 0.16],
      [0.44, 240, 0.34],
    ]
    notes.forEach(([t, f, dur]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filt = ctx.createBiquadFilter()
      filt.type = 'bandpass'
      filt.frequency.value = f * 2.3
      filt.Q.value = 6
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(f * 1.06, now + t)
      osc.frequency.exponentialRampToValueAtTime(f, now + t + 0.12)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur)
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.05)
    })
  } catch {
    /* ignore */
  }
}

// A LOUD, comedic Hadeda right in your face — the "haa-haa-HAA-de-DAH!" that
// makes everyone in earshot jump and then laugh. Screen 1, when the seal drops.
function loudHadedaCall() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const notes = [
      [0.0, 360, 0.18, 0.5],
      [0.22, 300, 0.18, 0.5],
      [0.46, 420, 0.2, 0.58], // the comedic upward swing
      [0.72, 520, 0.46, 0.62], // "...DAAAH!"
    ]
    notes.forEach(([t, f, dur, vol]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filt = ctx.createBiquadFilter()
      filt.type = 'bandpass'
      filt.frequency.value = f * 2.1
      filt.Q.value = 5
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(f * 1.08, now + t)
      osc.frequency.exponentialRampToValueAtTime(f, now + t + 0.1)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur)
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.05)
    })
  } catch {
    /* ignore */
  }
}

// Soft overlapping murmurs — quiet random chirps that sound like a room full of
// birds muttering through an agenda. Screen 2, the Council meeting.
function murmurChatter() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    for (let i = 0; i < 14; i += 1) {
      const t = Math.random() * 2.2
      const f = 380 + Math.random() * 520
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, now + t)
      osc.frequency.exponentialRampToValueAtTime(f * (0.9 + Math.random() * 0.3), now + t + 0.08)
      const vol = 0.03 + Math.random() * 0.03
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.16)
    }
  } catch {
    /* ignore */
  }
}

// A nasal goose-like double honk — Evidence F, the flamingos.
function flamingoHonk() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    ;[0, 0.34].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filt = ctx.createBiquadFilter()
      filt.type = 'bandpass'
      filt.frequency.value = 520
      filt.Q.value = 4
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(196, now + t)
      osc.frequency.linearRampToValueAtTime(233, now + t + 0.1)
      osc.frequency.linearRampToValueAtTime(180, now + t + 0.26)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.3, now + t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3)
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.34)
    })
  } catch {
    /* ignore */
  }
}

// An EXTRA-LOUD, proud, slightly ridiculous "cock-a-doodle-dooo" with a long
// deflating finale — Evidence G, the rooster.
function roosterCrow() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const syllables = [
      [0.0, 520, 0.14, 0.7],
      [0.18, 660, 0.12, 0.72],
      [0.34, 600, 0.16, 0.76],
      [0.54, 700, 0.58, 0.82], // the loud, long, comically wavering finale
    ]
    syllables.forEach(([t, f, dur, vol], i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filt = ctx.createBiquadFilter()
      filt.type = 'bandpass'
      filt.frequency.value = f * 1.8
      filt.Q.value = 7
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(f, now + t)
      if (i === 3) {
        osc.frequency.linearRampToValueAtTime(f * 1.06, now + t + 0.2)
        osc.frequency.linearRampToValueAtTime(f * 0.97, now + t + 0.38)
        osc.frequency.exponentialRampToValueAtTime(f * 0.58, now + t + dur)
      } else {
        osc.frequency.linearRampToValueAtTime(f * 1.08, now + t + dur * 0.6)
      }
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur)
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.05)
    })
  } catch {
    /* ignore */
  }
}

// A rapid clipped "tok-tok-tok-tok" — Evidence H, the barbet.
function barbetCall() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    for (let i = 0; i < 8; i += 1) {
      const t = i * 0.11
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(1180, now + t)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.16, now + t + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.06)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.08)
    }
  } catch {
    /* ignore */
  }
}

// The iconic African Fish Eagle — a high opening yelp tumbling into descending
// "kyow-kow-kow". Evidence I, and the verdict fanfare.
function fishEagleCall() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const notes = [
      [0.0, 1600, 0.3, 0.26],
      [0.36, 1500, 0.18, 0.24],
      [0.6, 1320, 0.18, 0.22],
      [0.84, 1180, 0.2, 0.2],
      [1.08, 1040, 0.26, 0.18],
    ]
    notes.forEach(([t, f, dur, vol]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f * 1.04, now + t)
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + t + dur)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.05)
    })
  } catch {
    /* ignore */
  }
}

// Soft, cute, tiny rising peeps — Screen 11, meeting Tweety the chick.
function chickCheep() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    ;[0, 0.2, 0.42].forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const base = 1500 + i * 90
      osc.frequency.setValueAtTime(base, now + t)
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + t + 0.07)
      osc.frequency.exponentialRampToValueAtTime(base * 1.2, now + t + 0.14)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.12, now + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.18)
    })
  } catch {
    /* ignore */
  }
}

// Triumphant Fish Eagle followed by a chorus of Hadedas — Screen 8, the verdict.
function verdictFanfare() {
  fishEagleCall()
  ;[200, 500, 800].forEach((ms) => window.setTimeout(() => hadedaCall(1), ms))
}

// A bright rising flourish — the triumphant birdsong at the verdict.
function birdsongBurst() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    ;[880, 1040, 1240, 1480, 1760].forEach((f, i) => {
      const t = i * 0.09
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, now + t)
      osc.frequency.exponentialRampToValueAtTime(f * 1.18, now + t + 0.07)
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.14, now + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.14)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.16)
    })
  } catch {
    /* ignore */
  }
}

// A full, joyful chorus explosion — the celebration when she accepts: a rising
// birdsong burst layered with eagles, a hadeda, a flamingo, a barbet roll and a
// scatter of happy chirps.
function fullChorusExplosion() {
  birdsongBurst()
  fishEagleCall()
  window.setTimeout(() => barbetCall(), 200)
  window.setTimeout(() => loudHadedaCall(), 320)
  window.setTimeout(() => flamingoHonk(), 480)
  ;[100, 240, 400, 560, 720, 880].forEach((ms, i) =>
    window.setTimeout(() => softChirp(['feed', 'water', 'play'][i % 3]), ms),
  )
}

function playBeatSound(screen, beat) {
  if (isEvidence(screen)) {
    if (beat === 1) {
      // A different call as each evidence polaroid lands.
      const id = EVIDENCE[screen - EVI_FIRST]?.id
      if (id === 'f') flamingoHonk()
      else if (id === 'g') roosterCrow()
      else if (id === 'h') barbetCall()
      else if (id === 'i') fishEagleCall()
    }
    return
  }
  if (screen === 1) {
    if (beat === 1) {
      thud() // wax seal drops
      loudHadedaCall() // a loud, funny Hadeda right on cue
    }
  } else if (screen === 2) {
    if (beat === 1) murmurChatter() // soft meeting murmur
    else if (beat === 3) thud() // the gavel
  } else if (screen === 7) {
    if (beat === 5) thud() // "Enough."
    else if (beat === 8) softChirp('play') // UNANIMOUS sparkle
  } else if (screen === 8) {
    if (beat === 1) verdictFanfare() // triumphant Fish Eagle + Hadeda chorus
  } else if (screen === 11) {
    if (beat === 3) chickCheep() // "This is Tweety."
  }
  // screen 12 (personal note): intentionally silent.
}

// ---- Small pieces -----------------------------------------------------------
function EvidenceScreen({ item, commentShown }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="intro-stage intro-evscreen">
      <p className="intro-eyebrow">{item.file}</p>
      <figure className="intro-evi-big">
        <div className="intro-evi-big-photo">
          {failed ? (
            <div className="intro-evi-fallback" role="img" aria-label={item.alt}>
              <span aria-hidden="true">{item.emoji}</span>
            </div>
          ) : (
            <img src={item.src} alt={item.alt} onError={() => setFailed(true)} draggable="false" />
          )}
          <span className="intro-stamp big">CLASSIFIED</span>
        </div>
      </figure>
      <p className={`intro-evi-comment${commentShown ? ' show' : ''}`}>{item.comment}</p>
      <span className={`intro-evi-critter ${item.critterCls}`} aria-hidden="true">
        {item.critter}
      </span>
    </div>
  )
}

function HadedaTap({ corner = false }) {
  return (
    <div className={`intro-hadeda${corner ? ' corner' : ''}`} role="img" aria-label="An impatient Hadeda">
      <span className="intro-hadeda-bird">🦤</span>
      <span className="intro-hadeda-foot" aria-hidden="true" />
    </div>
  )
}

function NotePhoto() {
  const [failed, setFailed] = useState(false)
  return (
    <div className="intro-note-photo intro-note-photo-corner" aria-hidden="true">
      {failed ? (
        <span className="intro-note-photo-fallback" role="img" aria-label="Marnich and Marlie together">
          💞
        </span>
      ) : (
        <img src="/intro/evidence-us.jpg" alt="" onError={() => setFailed(true)} draggable="false" />
      )}
    </div>
  )
}

export default function IntroSequence({ onComplete, onAccept }) {
  const [screen, setScreen] = useState(1)
  const [reveal, setReveal] = useState(0)
  const [bursting, setBursting] = useState(false)
  const [flash, setFlash] = useState(false)
  const timersRef = useRef([])
  const jumpFullRef = useRef(false)
  const done = useRef(false)

  const maxReveal = beatsFor(screen).length
  const mood = moodFor(screen)

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }

  // Per-screen reveal scheduler. These timers ONLY reveal content on the current
  // screen — none of them call setScreen, so nothing ever auto-advances. Jumps
  // (back / dots / skip) show everything at once.
  useEffect(() => {
    clearTimers()
    const delays = beatsFor(screen)
    if (jumpFullRef.current) {
      jumpFullRef.current = false
      setReveal(delays.length)
      return undefined
    }
    setReveal(0)
    delays.forEach((delay, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setReveal(i + 1)
          playBeatSound(screen, i + 1)
        }, delay),
      )
    })
    return clearTimers
  }, [screen])

  function goNext() {
    if (screen >= TOTAL) return
    if (screen !== CREAM_SCREEN) softChirp('feed') // keep the note screen silent
    jumpFullRef.current = false
    setScreen(screen + 1)
  }
  function goPrev() {
    if (screen <= 1) return
    jumpFullRef.current = true
    setScreen(screen - 1)
  }
  function goTo(target) {
    const next = Math.max(1, Math.min(TOTAL, target))
    if (next === screen) return
    jumpFullRef.current = true
    setScreen(next)
  }
  function skip() {
    jumpFullRef.current = true
    setScreen(TOTAL)
  }

  // Tap anywhere: first finish revealing this screen, then advance. NEVER auto.
  function tapStage() {
    if (screen === TOTAL) return
    if (reveal < maxReveal) {
      clearTimers()
      setReveal(maxReveal)
    } else {
      goNext()
    }
  }

  function accept(event) {
    event?.stopPropagation()
    if (done.current) return
    done.current = true
    onAccept?.()
    setBursting(true)
    fullChorusExplosion()
    setTimeout(() => setFlash(true), 500)
    setTimeout(() => onComplete(), 2700)
  }

  const stop = (event) => event.stopPropagation()
  const shown = (n) => reveal >= n

  return (
    <div
      className={`intro-root intro-redux intro-mood-${mood}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome dossier"
      onClick={tapStage}
    >
      <div className="intro-grain" aria-hidden="true" />

      {/* ---------- SCREEN 1 — Opening ---------- */}
      {screen === 1 && (
        <div className="intro-stage intro-open">
          <div className={`intro-spotlight${shown(1) ? ' on' : ''}`} aria-hidden="true" />
          {shown(1) && (
            <div className="intro-seal" aria-hidden="true">
              <span className="intro-seal-feather">🪶</span>
            </div>
          )}
          <div className="intro-open-lines">
            <p className={`intro-open-title${shown(2) ? ' show' : ''}`}>
              SOUTHERN AFRICAN BIRD COUNCIL
            </p>
            <p className={`intro-open-sub${shown(3) ? ' show' : ''}`}>Classified Transmission</p>
            <p className={`intro-open-for${shown(4) ? ' show' : ''}`}>For: Marlie</p>
          </div>
          <div className="intro-walk-hadeda" aria-hidden="true">
            <span className="intro-walk-binos">🔭</span>
            <span className="intro-walk-bird">🦤</span>
            {shown(2) && <span className="intro-walk-papers">📄</span>}
          </div>
          {shown(maxReveal) && <p className="intro-tap-hint">tap anywhere to continue ›</p>}
        </div>
      )}

      {/* ---------- SCREEN 2 — The Council meeting ---------- */}
      {screen === 2 && (
        <div className="intro-stage intro-council-mtg">
          <p className="intro-eyebrow">Emergency Session</p>
          <p className={`intro-tline${shown(1) ? ' show' : ''}`}>An emergency meeting was called.</p>
          <p className={`intro-tline${shown(2) ? ' show' : ''}`}>The agenda: one item only.</p>
          <div className={`intro-table${shown(3) ? ' active' : ''}`} aria-hidden="true">
            <div className="intro-table-surface" />
            <div className={`intro-gavel${shown(3) ? ' bang' : ''}`}>🔨</div>
            {COUNCIL_SEATS.map((seat, i) => (
              <div key={seat.name} className={`intro-seat seat-${i} react-${seat.react}`}>
                <span className="intro-seat-bird">{seat.emoji}</span>
                <span className="intro-seat-role">{seat.name}</span>
              </div>
            ))}
          </div>
          <p className={`intro-tline big${shown(4) ? ' show' : ''}`}>Subject: Marlie van Zyl.</p>
        </div>
      )}

      {/* ---------- SCREENS 3–6 — Evidence F/G/H/I ---------- */}
      {isEvidence(screen) && (
        <EvidenceScreen item={EVIDENCE[screen - EVI_FIRST]} commentShown={shown(2)} />
      )}

      {/* ---------- SCREEN 7 — The dramatic pause ---------- */}
      {screen === 7 && (
        <div className="intro-stage intro-pause">
          <span className="intro-falling-feather" aria-hidden="true">🪶</span>
          <p className="intro-pause-words">
            {PAUSE_WORDS.map((word, i) => (
              <span key={word} className={`intro-pause-word${shown(i + 1) ? ' show' : ''}`}>
                {word}{' '}
              </span>
            ))}
          </p>
          <p className={`intro-tline${shown(6) ? ' show' : ''}`}>The vote was called.</p>
          {shown(7) && (
            <div className="intro-votes">
              {VOTES.map(([emoji, name], i) => (
                <div key={name} className="intro-vote" style={{ '--vote-i': i }}>
                  <span className="intro-vote-bird" aria-hidden="true">{emoji}</span>
                  <span className="intro-vote-name">{name}</span>
                  <span className="intro-vote-yes">YES</span>
                </div>
              ))}
            </div>
          )}
          <p className={`intro-unanimous${shown(8) ? ' show' : ''}`}>UNANIMOUS.</p>
        </div>
      )}

      {/* ---------- SCREEN 8 — The verdict ---------- */}
      {screen === 8 && (
        <div className="intro-stage intro-verdict-screen">
          {shown(1) && (
            <div className="intro-feather-rain" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <span
                  key={i}
                  className="intro-rain-bit"
                  style={{
                    left: `${(i * 53) % 100}%`,
                    '--rain-delay': `${(i % 6) * 0.3}s`,
                    '--rain-dur': `${2.4 + (i % 4) * 0.5}s`,
                  }}
                >
                  {['🪶', '🐦', '✨', '🌟'][i % 4]}
                </span>
              ))}
            </div>
          )}
          <p className={`intro-verdict-line${shown(1) ? ' show' : ''}`}>Marlie van Zyl</p>
          <p className={`intro-verdict-line${shown(2) ? ' show' : ''}`}>is hereby appointed</p>
          <p className={`intro-verdict-big${shown(3) ? ' show' : ''}`}>JUNIOR FIELD AGENT</p>
          <p className={`intro-verdict-line${shown(4) ? ' show' : ''}`}>
            Southern African Bird Council
          </p>
          {shown(5) && (
            <div className="intro-verdict-chick" aria-hidden="true">
              <TweetyBird level="chick" mood="happy" dancing size={84} />
            </div>
          )}
        </div>
      )}

      {/* ---------- SCREEN 9 — Mission briefing ---------- */}
      {screen === 9 && (
        <div className="intro-stage intro-brief-screen">
          <p className="intro-eyebrow">Your Field Kit — Prepared by the Council</p>
          <p className={`intro-brief-sub${shown(1) ? ' show' : ''}`}>
            And by Agent Marnich. Who tried his best. Which was… sufficient.
          </p>
          <ul className="intro-kit-list">
            {FIELD_KIT.map(([icon, text], i) => (
              <li key={text} className={`intro-kit-item${shown(i + 2) ? ' show' : ''}`}>
                <span className="intro-kit-icon" aria-hidden="true">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="intro-corner-chick" aria-hidden="true">
            <TweetyBird level="chick" mood="happy" size={64} />
          </div>
        </div>
      )}

      {/* ---------- SCREEN 10 — How it works ---------- */}
      {screen === 10 && (
        <div className="intro-stage intro-s5">
          <h2 className="intro-howto-title">How your adventure works</h2>
          <div className="intro-steps">
            {STEPS.map(([icon, label, text], i) => (
              <div key={label} className={`intro-step${shown(i + 1) ? ' show' : ''}`}>
                <span className="intro-step-icon" aria-hidden="true">{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <p>{text}</p>
                </div>
                {i < STEPS.length - 1 && <span className="intro-step-arrow" aria-hidden="true">↓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- SCREEN 11 — Meet Tweety ---------- */}
      {screen === 11 && (
        <div className="intro-stage intro-s6">
          <div className={`intro-tweety-stage${shown(3) ? ' hop' : ''}`}>
            <TweetyBird level="chick" mood="happy" dancing={shown(3)} size={150} />
            <div className="intro-tweety-nest" aria-hidden="true" />
          </div>
          <p className={`intro-tline big${shown(1) ? ' show' : ''}`}>But first…</p>
          <p className={`intro-tline${shown(2) ? ' show' : ''}`}>Someone has been waiting for you.</p>
          <p className={`intro-tline big${shown(3) ? ' show' : ''}`}>This is Tweety. 🐣</p>
          <div className="intro-tweety-lines">
            {TWEETY_LINES.map((line, i) => (
              <p key={line} className={`intro-tline small${shown(i + 4) ? ' show' : ''}`}>{line}</p>
            ))}
          </div>
          {shown(7) && <HadedaTap corner />}
          <p className={`intro-tline${shown(8) ? ' show' : ''}`}>
            Care for her well… and she may have a surprise for you one day. 🥚
          </p>
        </div>
      )}

      {/* ---------- SCREEN 12 — The personal note (silent) ---------- */}
      {screen === 12 && (
        <div className="intro-stage intro-s7">
          <article className="intro-note-card">
            <span className="intro-note-heart" aria-hidden="true">💛</span>
            <div className="intro-note-body">
              {NOTE_LINES.map((line, i) => (
                <p
                  key={i}
                  className={`intro-note-line${i === NOTE_LINES.length - 1 ? ' sign' : ''}${
                    i === NOTE_LINES.length - 2 ? ' small' : ''
                  }${shown(i + 1) ? ' show' : ''}`}
                >
                  {line}
                </p>
              ))}
            </div>
            {shown(NOTE_LINES.length + 1) && <NotePhoto />}
          </article>
          {shown(maxReveal) && <p className="intro-tap-hint dark">tap when you are ready ›</p>}
        </div>
      )}

      {/* ---------- SCREEN 13 — Accept ---------- */}
      {screen === 13 && (
        <div className="intro-stage intro-s8">
          <div className="intro-accept-tweety" aria-hidden="true">
            <TweetyBird level="chick" mood="happy" dancing size={150} />
          </div>
          <h2 className="intro-begin-title">Your adventure begins now, Marlie.</h2>
          <p className="intro-begin-sub">
            The Bird Council is watching. Agent Marnich is watching more nervously.
          </p>
          <button type="button" className="intro-accept intro-accept-pulse" onClick={accept} disabled={bursting}>
            Accept my mission 🪶
          </button>
        </div>
      )}

      {/* Confetti burst on accept */}
      {bursting && (
        <div className="intro-burst" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            <span
              key={i}
              className="intro-burst-bit"
              style={{ left: `${(i * 37) % 100}%`, '--bit-delay': `${(i % 7) * 60}ms`, '--bit-dur': `${1400 + (i % 5) * 240}ms` }}
            >
              {['🪶', '✨', '🐦', '💛', '🌟', '🎉'][i % 6]}
            </span>
          ))}
        </div>
      )}

      {/* Final golden flash */}
      {flash && (
        <div className="intro-flash" role="presentation">
          <span className="intro-flash-bird" aria-hidden="true">🐦</span>
          <p className="intro-flash-text">Your adventure begins now</p>
        </div>
      )}

      {/* Skip — top right on every screen before the finale */}
      {!flash && !bursting && screen < TOTAL && (
        <button type="button" className="intro-skip" onClick={(e) => { stop(e); skip() }}>
          Skip ▸
        </button>
      )}

      {/* Navigation: back / dots / next */}
      {!flash && !bursting && (
        <div className="intro-nav" onClick={stop}>
          <button
            type="button"
            className="intro-nav-arrow"
            onClick={(e) => { stop(e); goPrev() }}
            disabled={screen <= 1}
            aria-label="Back"
          >
            ‹
          </button>
          <div className="intro-dots" role="tablist">
            {Array.from({ length: TOTAL }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`intro-dot${screen === i + 1 ? ' active' : ''}`}
                onClick={(e) => { stop(e); goTo(i + 1) }}
                aria-label={`Go to screen ${i + 1}`}
                aria-selected={screen === i + 1}
              />
            ))}
          </div>
          <button
            type="button"
            className="intro-nav-arrow"
            onClick={(e) => { stop(e); if (screen < TOTAL) goNext() }}
            disabled={screen >= TOTAL}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
