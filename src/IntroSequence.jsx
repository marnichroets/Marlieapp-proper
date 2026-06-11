// One-time cinematic "evidence dossier" intro that plays the very first time
// Pooks opens the app after login. It never shows again once dismissed — the
// "seen" flag lives in localStorage (key handled by App.jsx). Tone: warm,
// mysterious, funny and personal.
import { useEffect, useRef, useState } from 'react'
import './IntroSequence.css'
import { playChirp } from './tweetyData'

// The five evidence photos. Drop the real image files in public/intro/ using
// these exact names and they appear automatically. Until then a labelled
// placeholder shows in their place so the build/preview never breaks.
const EVIDENCE = [
  {
    id: 'a',
    src: '/intro/evidence-a.jpg',
    emoji: '🦅',
    alt: 'Vultures in the field',
    label: 'EVIDENCE A',
    note: 'Field observation, confirmed',
  },
  {
    id: 'b',
    src: '/intro/evidence-b.jpg',
    emoji: '🦉',
    alt: 'Spotted Eagle-Owl in a tree',
    label: 'EVIDENCE B',
    note: 'Spotted Eagle-Owl encounter, impressive',
  },
  {
    id: 'c',
    src: '/intro/evidence-c.jpg',
    emoji: '🏌️',
    alt: 'Agent Marnich on the golf course',
    label: 'EVIDENCE C',
    note: 'Agent Marnich field report… unsatisfactory 🏌️',
  },
  {
    id: 'd',
    src: '/intro/evidence-d.jpg',
    emoji: '🦉',
    alt: 'Verreaux Eagle-Owl up close',
    label: 'EVIDENCE D',
    note: 'Verreaux Eagle-Owl, face to face. Remarkable.',
  },
  {
    id: 'e',
    src: '/intro/evidence-e.jpg',
    emoji: '🐦',
    alt: 'Marlie standing fearlessly beside a stork',
    label: 'EVIDENCE E',
    note: 'Subject shows no fear. Stork filed complaint. Dismissed.',
  },
]

const VERDICT_LINES = ['After heated debate…', 'The Council has decided.']

// Soft, non-blocking sound. Wrapped so a missing/blocked AudioContext is silent.
function chirp(kind) {
  try {
    playChirp(kind)
  } catch {
    /* sound is a nicety; never let it break the intro */
  }
}

function EvidencePhoto({ item, index }) {
  const [failed, setFailed] = useState(false)
  return (
    <figure
      className="intro-evi"
      style={{ '--evi-delay': `${index * 1.1 + 0.2}s`, '--evi-tilt': `${(index % 2 ? 1 : -1) * (2 + index)}deg` }}
    >
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

export default function IntroSequence({ onComplete }) {
  const [screen, setScreen] = useState(1)
  const [verdictStep, setVerdictStep] = useState(0)
  const [crowned, setCrowned] = useState(false)
  const [bursting, setBursting] = useState(false)
  const done = useRef(false)

  // Opening bird call as the dossier appears.
  useEffect(() => {
    chirp('play')
  }, [])

  // Per-screen timing. Each branch returns its own cleanup so timers never leak.
  useEffect(() => {
    if (screen === 1) {
      const t = setTimeout(() => setScreen(2), 3200)
      return () => clearTimeout(t)
    }
    if (screen === 2) {
      // A soft chirp as each evidence card lands on the table.
      const taps = EVIDENCE.map((_, i) =>
        setTimeout(() => chirp(i % 2 ? 'feed' : 'water'), i * 1100 + 500),
      )
      const next = setTimeout(() => setScreen(3), EVIDENCE.length * 1100 + 2600)
      return () => {
        taps.forEach(clearTimeout)
        clearTimeout(next)
      }
    }
    if (screen === 3) {
      const timers = [
        setTimeout(() => setVerdictStep(1), 700),
        setTimeout(() => {
          setVerdictStep(2)
          chirp('play')
        }, 2200),
        setTimeout(() => {
          setCrowned(true)
          chirp('feed')
        }, 3900),
        setTimeout(() => setScreen(4), 6200),
      ]
      return () => timers.forEach(clearTimeout)
    }
    if (screen === 4) {
      const t = setTimeout(() => setScreen(5), 5400)
      return () => clearTimeout(t)
    }
    return undefined
  }, [screen])

  function accept() {
    if (done.current) return
    done.current = true
    setBursting(true)
    chirp('play')
    const a = setTimeout(() => chirp('feed'), 150)
    const b = setTimeout(() => chirp('water'), 320)
    const finish = setTimeout(() => onComplete(), 1400)
    // No cleanup return here — accept() runs once, and onComplete unmounts us.
    void a
    void b
    void finish
  }

  return (
    <div className={`intro-root intro-screen-${screen}`} role="dialog" aria-modal="true" aria-label="Welcome dossier">
      <div className="intro-grain" aria-hidden="true" />

      {/* Screen 1 — wax seal & council heading */}
      {screen === 1 && (
        <div className="intro-stage intro-stage-1">
          <div className="intro-seal" aria-hidden="true">
            <span className="intro-seal-feather">🪶</span>
          </div>
          <h1 className="intro-council">SOUTHERN AFRICAN BIRD COUNCIL</h1>
          <p className="intro-sub">CLASSIFIED FIELD AGENT DOSSIER</p>
        </div>
      )}

      {/* Screen 2 — evidence photos placed one by one */}
      {screen === 2 && (
        <div className="intro-stage intro-stage-2">
          <p className="intro-eyebrow">CASE FILE · SUBJECT: MARLIE</p>
          <div className="intro-evidence-table">
            {EVIDENCE.map((item, i) => (
              <EvidencePhoto key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Screen 3 — the verdict */}
      {screen === 3 && (
        <div className="intro-stage intro-stage-3">
          <span className="intro-falling-feather" aria-hidden="true">🪶</span>
          <div className="intro-verdict">
            {VERDICT_LINES.map((line, i) => (
              <p key={line} className={`intro-verdict-line ${verdictStep > i ? 'show' : ''}`}>
                {line}
              </p>
            ))}
            <h2 className={`intro-welcome ${crowned ? 'show' : ''}`}>
              WELCOME, FIELD AGENT POOKS 🐦
            </h2>
          </div>
        </div>
      )}

      {/* Screen 4 — mission brief */}
      {screen === 4 && (
        <div className="intro-stage intro-stage-4">
          <p className="intro-eyebrow">MISSION BRIEF</p>
          <h2 className="intro-mission">Your mission: document the birds of South Africa</h2>
          <div className="intro-map" aria-hidden="true">
            <svg viewBox="0 0 200 160" role="presentation">
              <path
                className="intro-map-land"
                d="M40 38 C58 24 92 22 120 30 C146 37 168 46 176 70 C182 90 172 108 150 122 C140 128 138 140 126 144 C112 149 104 138 92 138 C74 138 60 132 48 118 C34 102 24 84 26 66 C27 52 30 46 40 38 Z"
              />
              {/* Lesotho enclave, because the Council is thorough */}
              <circle className="intro-map-hole" cx="128" cy="104" r="9" />
            </svg>
            {[
              ['18%', '34%', '🦅', 0],
              ['64%', '26%', '🦉', 0.5],
              ['44%', '58%', '🐦', 1],
              ['78%', '62%', '🦩', 1.5],
              ['32%', '74%', '🦜', 2],
              ['58%', '80%', '🕊️', 2.5],
            ].map(([left, top, emoji, delay], i) => (
              <span
                key={i}
                className="intro-map-bird"
                style={{ left, top, '--bird-delay': `${delay}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
          <p className="intro-kit">Your field kit is ready.</p>
        </div>
      )}

      {/* Screen 5 — accept the mission */}
      {screen === 5 && (
        <div className="intro-stage intro-stage-5">
          <span className="intro-big-feather" aria-hidden="true">🪶</span>
          <p className="intro-eyebrow">CLEARANCE GRANTED</p>
          <button type="button" className="intro-accept" onClick={accept} disabled={bursting}>
            Accept my mission 🪶
          </button>
        </div>
      )}

      {bursting && (
        <div className="intro-burst" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className="intro-burst-bit"
              style={{
                left: `${(i * 37) % 100}%`,
                '--bit-delay': `${(i % 7) * 60}ms`,
                '--bit-dur': `${1400 + (i % 5) * 220}ms`,
              }}
            >
              {['🪶', '✨', '🐦', '💛', '🌟', '🎉'][i % 6]}
            </span>
          ))}
        </div>
      )}

      {screen < 5 && (
        <button type="button" className="intro-skip" onClick={() => setScreen(5)}>
          Skip ▸
        </button>
      )}
    </div>
  )
}
