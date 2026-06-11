// One-time cinematic "evidence dossier" intro that plays the very first time
// Pooks opens the app after login — and can be replayed forever from the gear
// menu / profile. Tone: warm, mysterious, funny and personal.
import { useEffect, useMemo, useRef, useState } from 'react'
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
  {
    id: 'f',
    src: '/intro/evidence-f.jpg',
    emoji: '🦩',
    alt: 'A wake of flamingos',
    label: 'EVIDENCE F',
    note: 'Flamingo congregation, pink and unbothered',
  },
  {
    id: 'g',
    src: '/intro/evidence-g.jpg',
    emoji: '🐓',
    alt: 'A rooster',
    label: 'EVIDENCE G',
    note: 'Rooster located. Loud. Opinionated. Noted.',
  },
  {
    id: 'h',
    src: '/intro/evidence-h.jpg',
    emoji: '🐦',
    alt: 'A barbet',
    label: 'EVIDENCE H',
    note: 'Barbet sighting, colourful and well dressed',
  },
  {
    id: 'i',
    src: '/intro/evidence-i.jpg',
    emoji: '🦅',
    alt: 'African Fish Eagles',
    label: 'EVIDENCE I',
    note: 'Fish Eagles, regal. The Council approves.',
  },
]

// The "us" photo — Marnich and Marlie together — tucked into the note screen.
const NOTE_PHOTO = { src: '/intro/evidence-us.jpg', emoji: '💞', alt: 'Marnich and Marlie together' }

const VERDICT_LINES = ['After heated debate…', 'The Council has decided.']

const BRIEF_PARAGRAPH =
  'Every bird you find will be recorded in your official Bird Council field kit — ' +
  'a secret app built specifically for you by Agent Marnich, who, despite his ' +
  'catastrophic performance at Skukuza, does occasionally do something right.'

const FIELD_KIT = [
  ['🐦', 'A personal bird collection to fill — 110 South African species waiting to be found'],
  ['🥚', 'A baby bird waiting to hatch — care for it every day and watch it grow'],
  ['🎁', 'Surprises hidden behind every milestone — rewards from Marnich Bank'],
  ['💌', 'Secret notes that only unlock when you have truly earned them'],
  ['🏆', 'Challenges set by the Council — and by Agent Marnich, who fully expects to lose'],
]

// The handwritten note from Marnich, revealed line by line. `pauseBefore`
// adds an extra beat; `small` / `sign` change the styling of the last lines.
const NOTE_LINES = [
  { text: 'I built this for you because you light up every single time you see a bird.' },
  { text: 'Your eyes go wide and you grab my arm and say look, look —' },
  { text: 'and honestly, watching you is better than watching any bird.' },
  { text: 'This app is yours. The birds are waiting.', pauseBefore: true },
  { text: 'And I will be right here — losing at Bird Quiz, sending you surprises,' },
  { text: 'and watching you collect every single one.' },
  { text: 'Now go find some birds, Pooks. 🐦', small: true },
  { text: '— Marnich', sign: true },
]

// ---- Sound. All wrapped so a missing/blocked AudioContext is simply silent. ----
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
    /* sound is a nicety; never let it break the intro */
  }
}

// Soft low "thud" for a polaroid landing on the table.
function thud() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.13)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.22)
  } catch {
    /* ignore */
  }
}

// Slight "thrown polaroid" tilts between -3 and +3 degrees, one per card.
const EVI_TILTS = [-3, 2.4, -1.4, 3, -2.2, 1.6, -2.8, 2, -1]
const EVI_STAGGER = 0.85 // seconds between each polaroid landing

// Small "us" polaroid pinned to the corner of Marnich's note.
function NotePhoto() {
  const [failed, setFailed] = useState(false)
  return (
    <div className="intro-note-photo" aria-hidden={failed ? undefined : true}>
      {failed ? (
        <span className="intro-note-photo-fallback" role="img" aria-label={NOTE_PHOTO.alt}>
          {NOTE_PHOTO.emoji}
        </span>
      ) : (
        <img
          src={NOTE_PHOTO.src}
          alt={NOTE_PHOTO.alt}
          onError={() => setFailed(true)}
          draggable="false"
        />
      )}
    </div>
  )
}

function EvidencePhoto({ item, index }) {
  const [failed, setFailed] = useState(false)
  const tilt = EVI_TILTS[index % EVI_TILTS.length]
  return (
    <figure
      className="intro-evi"
      style={{ '--evi-delay': `${index * EVI_STAGGER + 0.2}s`, '--evi-tilt': `${tilt}deg` }}
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

export default function IntroSequence({ onComplete, onAccept }) {
  const [screen, setScreen] = useState(1)
  const [verdictStep, setVerdictStep] = useState(0)
  const [crowned, setCrowned] = useState(false)
  const [kitCount, setKitCount] = useState(0)
  const [noteStep, setNoteStep] = useState(0)
  const [showAccept, setShowAccept] = useState(false)
  const [bursting, setBursting] = useState(false)
  const [flash, setFlash] = useState(false)
  const done = useRef(false)
  const skipped = useRef(false)

  const briefWords = useMemo(() => BRIEF_PARAGRAPH.split(' '), [])

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
      // A soft thud as each evidence card lands on the table.
      const step = EVI_STAGGER * 1000
      const taps = EVIDENCE.map((_, i) => setTimeout(() => thud(), i * step + 600))
      const next = setTimeout(() => setScreen(3), EVIDENCE.length * step + 2400)
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
        setTimeout(() => setScreen(4), 6400),
      ]
      return () => timers.forEach(clearTimeout)
    }
    if (screen === 4) {
      // Paragraph reveals word by word, then the 5 field-kit items bounce in.
      const paragraphMs = briefWords.length * 70 + 400
      const items = FIELD_KIT.map((_, i) =>
        setTimeout(() => {
          setKitCount(i + 1)
          chirp(i % 2 ? 'feed' : 'water')
        }, paragraphMs + i * 700),
      )
      const next = setTimeout(() => setScreen(5), paragraphMs + FIELD_KIT.length * 700 + 2400)
      return () => {
        items.forEach(clearTimeout)
        clearTimeout(next)
      }
    }
    if (screen === 5) {
      const t = setTimeout(() => setScreen(6), 5400)
      return () => clearTimeout(t)
    }
    if (screen === 6) {
      // The personal note from Marnich. Lines appear slowly, one at a time;
      // then, after a beat, the Accept button fades in. (Skip jumps straight
      // to the full note + button.)
      if (skipped.current) return undefined
      chirp('water')
      const timers = []
      let t = 900
      NOTE_LINES.forEach((line, i) => {
        if (line.pauseBefore) t += 1100
        timers.push(setTimeout(() => setNoteStep(i + 1), t))
        t += line.sign ? 1100 : line.small ? 1500 : 1700
      })
      timers.push(setTimeout(() => setShowAccept(true), t + 700))
      return () => timers.forEach(clearTimeout)
    }
    return undefined
  }, [screen, briefWords])

  function accept() {
    if (done.current) return
    done.current = true
    // Persist "seen" the instant she commits, so even if she closes the app
    // during the flash the intro never replays.
    onAccept?.()
    setBursting(true)
    chirp('play')
    setTimeout(() => chirp('feed'), 150)
    setTimeout(() => chirp('water'), 320)
    // Two-second golden flash, then fade to home.
    setTimeout(() => setFlash(true), 500)
    setTimeout(() => onComplete(), 2700)
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
            <div className={`intro-welcome-wrap ${crowned ? 'show' : ''}`}>
              {crowned && (
                <div className="intro-welcome-feathers" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className="intro-float-feather"
                      style={{
                        left: `${8 + i * 9}%`,
                        '--ff-delay': `${(i % 5) * 0.3}s`,
                        '--ff-dur': `${2.6 + (i % 3) * 0.6}s`,
                      }}
                    >
                      🪶
                    </span>
                  ))}
                </div>
              )}
              <h2 className="intro-welcome">WELCOME, FIELD AGENT POOKS 🐦</h2>
            </div>
          </div>
        </div>
      )}

      {/* Screen 4 — mission briefing: what's in the field kit */}
      {screen === 4 && (
        <div className="intro-stage intro-stage-4">
          <div className="intro-watcher" aria-hidden="true">
            <span className="intro-watcher-bird">🐤</span>
          </div>
          <p className="intro-eyebrow">MISSION BRIEFING</p>
          <p className="intro-brief-para">
            {briefWords.map((word, i) => (
              <span key={i} className="intro-brief-word" style={{ animationDelay: `${i * 0.07}s` }}>
                {word}{' '}
              </span>
            ))}
          </p>
          <ul className="intro-kit-list">
            {FIELD_KIT.map(([icon, text], i) => (
              <li key={i} className={`intro-kit-item ${kitCount > i ? 'show' : ''}`}>
                <span className="intro-kit-icon" aria-hidden="true">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screen 5 — mission & map */}
      {screen === 5 && (
        <div className="intro-stage intro-stage-5">
          <p className="intro-eyebrow">YOUR MISSION</p>
          <h2 className="intro-mission">Document the birds of South Africa</h2>
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

      {/* Screen 6 — a personal, handwritten note from Marnich, then Accept */}
      {screen === 6 && (
        <div className="intro-stage intro-stage-6">
          <article className="intro-note-card">
            <NotePhoto />
            <span className="intro-note-heart" aria-hidden="true">💛</span>
            <div className="intro-note-body">
              {NOTE_LINES.map((line, i) => (
                <p
                  key={i}
                  className={`intro-note-line${line.small ? ' small' : ''}${
                    line.sign ? ' sign' : ''
                  } ${noteStep > i ? 'show' : ''}`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </article>
          <button
            type="button"
            className={`intro-accept intro-note-accept ${showAccept ? 'show' : ''}`}
            onClick={accept}
            disabled={bursting || !showAccept}
            aria-hidden={!showAccept}
          >
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

      {/* Final golden flash before fading to home */}
      {flash && (
        <div className="intro-flash" role="presentation">
          <span className="intro-flash-bird" aria-hidden="true">🐦</span>
          <p className="intro-flash-text">Your adventure begins now</p>
        </div>
      )}

      {screen < 6 && !flash && (
        <button
          type="button"
          className="intro-skip"
          onClick={() => {
            skipped.current = true
            setNoteStep(NOTE_LINES.length)
            setShowAccept(true)
            setScreen(6)
          }}
        >
          Skip ▸
        </button>
      )}
    </div>
  )
}
