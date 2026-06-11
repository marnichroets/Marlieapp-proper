// One-time cinematic intro — a CONTINUATION of the physical letter Pooks
// already read. Eight mobile-first screens (390px), all manually paced: tap
// anywhere or the arrow to advance, back arrow + progress dots + skip. Content
// animates in on each screen, but nothing auto-advances — she controls it.
import { useEffect, useRef, useState } from 'react'
import './IntroSequence.css'
import './IntroExtras.css'
import { playChirp } from './tweetyData'
import { TweetyBird } from './Tweety'

const TOTAL = 8

// ---- Screen 2 evidence (the four NEW reports) ----
const EVIDENCE = [
  { id: 'f', src: '/intro/evidence-f.jpg', emoji: '🦩', alt: 'A wake of flamingos', label: 'FILE F', note: 'Flamingo congregation. Unbothered and fabulous.' },
  { id: 'g', src: '/intro/evidence-g.jpg', emoji: '🐓', alt: 'A chicken', label: 'FILE G', note: 'This is a chicken. The Council acknowledges it. Moving on.' },
  { id: 'h', src: '/intro/evidence-h.jpg', emoji: '🐦', alt: 'A barbet', label: 'FILE H', note: 'Barbet spotted. The barbet division wept actual tears.' },
  { id: 'i', src: '/intro/evidence-i.jpg', emoji: '🦅', alt: 'Two Fish Eagles together', label: 'FILE I', note: 'Two Fish Eagles together. The Council found this romantic. No further comment.' },
]
const EVI_TILTS = [-4, 3, -2.5, 4]

const FIELD_KIT = [
  ['🐦', 'Spot birds → photograph them → AI identifies them → they join your collection'],
  ['🥚', 'Every new species you spot → a mystery egg appears in your nest'],
  ['🎁', 'Reach milestones → unlock real surprises from Marnich Bank'],
  ['💌', 'Earn enough coins → unlock hidden notes from Marnich'],
  ['🏆', 'Complete daily challenges → earn coins → make the Council proud'],
]

const STEPS = [
  ['🌿', 'Step 1', 'Go outside → spot a bird'],
  ['📷', 'Step 2', 'Open the app → tap Spot → take a photo'],
  ['🐦', 'Step 3', 'AI identifies it → confirm → bird added to your collection'],
  ['💛', 'Step 4', 'Earn coins → unlock gifts → Marnich gets notified'],
]

// Tweety's care lines (screen 6 beats 4–8).
const TWEETY_LINES = [
  'She needs feeding every day.',
  'And water.',
  'And someone to play with.',
  'She has been very patient.',
  'Unlike Field Agent Hadeda.',
]

const NOTE_LINES = [
  'I built this for you',
  'because you light up every single time you see a bird.',
  'Your eyes go wide and you grab my arm',
  'and say look, look —',
  'and honestly, watching you',
  'is better than watching any bird.',
  'This app is yours.',
  'The birds are waiting.',
  'Now go find some birds, Pooks. 🐦',
  '— Marnich',
]

// Cumulative reveal timings (ms from when a screen mounts). One entry per beat.
const BEATS = {
  1: [600, 2100, 3700],
  2: [400, 1400, 2400, 3400, 4400],
  3: [700, 2400, 4300],
  4: [400, 1000, 1600, 2200, 2800],
  5: [400, 1000, 1600, 2200],
  6: [700, 2200, 3700, 5100, 6100, 7100, 8300, 9500, 10900],
  7: [700, 1900, 4100, 5100, 7300, 8300, 10500, 11500, 13700, 14700],
  8: [300],
}
// Which reveal index (1-based) plays which sound.
const SOUND_BEATS = {
  2: { 2: 'thud', 3: 'thud', 4: 'thud', 5: 'thud' },
  3: { 3: 'chime' },
  4: { 1: 'tick', 2: 'tick', 3: 'tick', 4: 'tick', 5: 'tick' },
  6: { 3: 'chirp' },
}

// ---- Sound (all guarded so a missing/blocked AudioContext is just silent) ----
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
function chirp(kind) {
  try {
    playChirp(kind)
  } catch {
    /* sound is a nicety */
  }
}
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
function playSound(name) {
  if (name === 'thud') thud()
  else if (name === 'chime') chirp('play')
  else if (name === 'chirp') chirp('feed')
  else if (name === 'tick') chirp('water')
}

// Gentle dawn ambience (soft pad + occasional birdsong), toggleable.
let ambienceHandle = null
function startAmbience() {
  if (ambienceHandle) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    const master = ctx.createGain()
    master.gain.value = 0.0001
    master.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2)
    master.connect(ctx.destination)
    const oscs = [196, 261.6].map((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.value = 0.5
      osc.connect(g)
      g.connect(master)
      osc.start()
      return osc
    })
    const timer = window.setInterval(() => {
      if (Math.random() < 0.6) chirp(Math.random() < 0.5 ? 'play' : 'water')
    }, 4200)
    ambienceHandle = {
      stop() {
        try {
          master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4)
          window.clearInterval(timer)
          oscs.forEach((o) => {
            try {
              o.stop(ctx.currentTime + 0.6)
            } catch {
              /* ignore */
            }
          })
        } catch {
          /* ignore */
        }
        ambienceHandle = null
      },
    }
  } catch {
    /* ambience is a nicety */
  }
}
function stopAmbience() {
  if (ambienceHandle) ambienceHandle.stop()
}

// ---- Small pieces ----
function EvidencePhoto({ item, index }) {
  const [failed, setFailed] = useState(false)
  return (
    <figure className="intro-evi" style={{ '--evi-tilt': `${EVI_TILTS[index % EVI_TILTS.length]}deg` }}>
      <div className="intro-evi-photo">
        {failed ? (
          <div className="intro-evi-fallback" role="img" aria-label={item.alt}>
            <span aria-hidden="true">{item.emoji}</span>
          </div>
        ) : (
          <img src={item.src} alt={item.alt} onError={() => setFailed(true)} draggable="false" />
        )}
        <span className="intro-stamp">CLASSIFIED</span>
      </div>
      <figcaption>
        <strong>{item.label}</strong>
        <span>{item.note}</span>
      </figcaption>
    </figure>
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
        <span className="intro-note-photo-fallback" role="img" aria-label="Marnich and Marlie together">💞</span>
      ) : (
        <img src="/intro/evidence-us.jpg" alt="" onError={() => setFailed(true)} draggable="false" />
      )}
    </div>
  )
}

export default function IntroSequence({ onComplete, onAccept }) {
  const [screen, setScreen] = useState(1)
  const [reveal, setReveal] = useState(0)
  const [musicOn, setMusicOn] = useState(true)
  const [bursting, setBursting] = useState(false)
  const [flash, setFlash] = useState(false)
  const timersRef = useRef([])
  const jumpFullRef = useRef(false)
  const done = useRef(false)

  const maxReveal = BEATS[screen].length

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }

  // Toggleable ambience; always stops on unmount.
  useEffect(() => {
    if (musicOn) startAmbience()
    else stopAmbience()
    return () => stopAmbience()
  }, [musicOn])

  // Per-screen reveal scheduler. Jumps (back/dots/skip) show everything at once.
  useEffect(() => {
    clearTimers()
    const delays = BEATS[screen]
    if (jumpFullRef.current) {
      jumpFullRef.current = false
      setReveal(delays.length)
      return undefined
    }
    setReveal(0)
    if (screen === 1) timersRef.current.push(window.setTimeout(() => thud(), 250))
    delays.forEach((delay, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setReveal(i + 1)
          const sound = SOUND_BEATS[screen]?.[i + 1]
          if (sound) playSound(sound)
        }, delay),
      )
    })
    return clearTimers
  }, [screen])

  function goNext() {
    if (screen >= TOTAL) return
    chirp('feed')
    jumpFullRef.current = false
    setScreen(screen + 1)
  }
  function goPrev() {
    if (screen <= 1) return
    chirp('water')
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

  // Tap anywhere: first finish revealing this screen, then advance.
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
    chirp('play')
    setTimeout(() => chirp('feed'), 150)
    setTimeout(() => chirp('water'), 320)
    setTimeout(() => setFlash(true), 500)
    setTimeout(() => onComplete(), 2700)
  }

  const stop = (event) => event.stopPropagation()
  const shown = (n) => reveal >= n

  return (
    <div
      className={`intro-root intro-redux intro-screen-${screen}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome dossier"
      onClick={tapStage}
    >
      <div className="intro-grain" aria-hidden="true" />

      {/* ---------- SCREEN 1 — Welcome back ---------- */}
      {screen === 1 && (
        <div className="intro-stage intro-s1">
          <div className="intro-seal" aria-hidden="true">
            <span className="intro-seal-feather">🪶</span>
          </div>
          <div className="intro-lines">
            <p className={`intro-tline big${shown(1) ? ' show' : ''}`}>So. You read the letter.</p>
            <p className={`intro-tline big${shown(2) ? ' show' : ''}`}>Good.</p>
            <p className={`intro-tline${shown(3) ? ' show' : ''}`}>The Council has been waiting.</p>
          </div>
          <HadedaTap />
          {shown(maxReveal) && <p className="intro-tap-hint">tap anywhere to continue ›</p>}
        </div>
      )}

      {/* ---------- SCREEN 2 — Additional evidence ---------- */}
      {screen === 2 && (
        <div className="intro-stage intro-s2">
          <p className={`intro-tline${shown(1) ? ' show' : ''}`}>
            While you were reading… our agents filed more reports.
          </p>
          <div className="intro-evi-grid">
            {EVIDENCE.map((item, i) => (shown(i + 2) ? <EvidencePhoto key={item.id} item={item} index={i} /> : null))}
          </div>
        </div>
      )}

      {/* ---------- SCREEN 3 — The dramatic pause ---------- */}
      {screen === 3 && (
        <div className="intro-stage intro-s3">
          <div className="intro-spotlight" aria-hidden="true" />
          <p className={`intro-tline big${shown(1) ? ' show' : ''}`}>You already know about the vote.</p>
          <p className={`intro-tline${shown(2) ? ' show' : ''}`}>What you do not know…</p>
          <p className={`intro-golden-text${shown(3) ? ' show' : ''}`}>is what happens next.</p>
          {shown(3) && (
            <div className="intro-up-feathers" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="intro-up-feather" style={{ left: `${10 + i * 11}%`, '--uf-delay': `${(i % 4) * 0.35}s` }}>🪶</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- SCREEN 4 — Mission briefing ---------- */}
      {screen === 4 && (
        <div className="intro-stage intro-s4">
          <p className="intro-eyebrow">YOUR FIELD KIT — CLASSIFIED</p>
          <ul className="intro-kit-list">
            {FIELD_KIT.map(([icon, text], i) => (
              <li key={i} className={`intro-kit-item${shown(i + 1) ? ' show' : ''}`}>
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

      {/* ---------- SCREEN 5 — How it works ---------- */}
      {screen === 5 && (
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

      {/* ---------- SCREEN 6 — Meet Tweety ---------- */}
      {screen === 6 && (
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
          {shown(8) && <HadedaTap corner />}
          <p className={`intro-tline${shown(9) ? ' show' : ''}`}>
            Take care of her and she might have a surprise for you one day… 🥚
          </p>
        </div>
      )}

      {/* ---------- SCREEN 7 — The personal note ---------- */}
      {screen === 7 && (
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
            {shown(NOTE_LINES.length) && <NotePhoto />}
          </article>
          {shown(maxReveal) && <p className="intro-tap-hint dark">tap when you are ready ›</p>}
        </div>
      )}

      {/* ---------- SCREEN 8 — Accept ---------- */}
      {screen === 8 && (
        <div className="intro-stage intro-s8">
          <span className="intro-big-bird" aria-hidden="true">🐦</span>
          <h2 className="intro-begin-title">Your adventure begins now</h2>
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

      {/* Music toggle — top left */}
      {!flash && !bursting && (
        <button
          type="button"
          className="intro-music-toggle"
          onClick={(e) => { stop(e); setMusicOn((on) => !on) }}
          aria-pressed={musicOn}
          aria-label={musicOn ? 'Turn music off' : 'Turn music on'}
        >
          {musicOn ? '🔊' : '🔇'}
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
