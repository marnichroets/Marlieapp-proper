// Tweety World — components only. A little storybook world: an egg basket,
// gentle 3-day incubation, story-event alerts, the Sanctuary and the Bird Room.
import { useEffect, useState } from 'react'
import { TweetyBird } from './Tweety'
import {
  MAX_EGGS,
  HATCH_TAPS,
  neededWarms,
  incubationStage,
  warmedToday,
  readyToHatch,
  SANCTUARY_SECTIONS,
  unlockedSanctuarySections,
  sanctuarySectionFor,
  ROOM_FURNITURE,
  ownsFurniture,
} from './tweetyWorld'

// ---- little egg with a bird silhouette inside ------------------------------
function EggGlyph({ size = 56, glow = true, cold = false, wobble = false }) {
  return (
    <span className={`egg-glyph${glow ? ' glow' : ''}${cold ? ' cold' : ''}${wobble ? ' wobble' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <ellipse cx="50" cy="56" rx="30" ry="36" fill="#FBEFD6" />
        <ellipse cx="42" cy="44" rx="7" ry="10" fill="#fff" opacity="0.5" />
        {/* faint bird silhouette inside */}
        <g fill="#caa46a" opacity="0.45">
          <ellipse cx="52" cy="58" rx="13" ry="14" />
          <ellipse cx="44" cy="50" rx="5" ry="6" />
          <path d="M64 56 l7 3 l-7 3 z" />
        </g>
      </svg>
    </span>
  )
}

// ---- the Tweety's World home card -------------------------------------------
export function TweetyWorldCard({
  tweety,
  event,
  onStartIncubate,
  onWarm,
  onRapidTap,
  onEventTap,
  onEventResolve,
  onOpenRoom,
  onOpenSanctuary,
}) {
  const eggs = tweety?.eggs || []
  const inc = tweety?.incubating
  const stage = incubationStage(inc)
  const need = neededWarms(inc)
  const sanctuaryCount = (tweety?.sanctuary || []).length

  return (
    <section className="soft-card full-span world-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tweety&apos;s World 🌍</p>
          <h3>{tweety?.name || 'Tweety'}&apos;s little storybook day</h3>
        </div>
      </div>

      {event && <EventAlert event={event} onTap={onEventTap} onResolve={onEventResolve} />}

      {/* Incubation takes priority over the basket */}
      {inc ? (
        <div className={`incubation-box stage-${stage}${inc.cold ? ' cold' : ''}`}>
          <p className="eyebrow">Warming an egg · Day {Math.min(stage, need)} of {need}</p>
          <div className="incubation-egg">
            <EggGlyph size={96} cold={inc.cold} wobble={readyToHatch(inc)} />
          </div>
          {readyToHatch(inc) && !warmedToday(inc) ? (
            <>
              <h4>It&apos;s wobbling! Tap rapidly to help it hatch! 🥚✨</h4>
              <div className="hatch-progress">
                <span style={{ width: `${((inc.rapidTaps || 0) / HATCH_TAPS) * 100}%` }}></span>
              </div>
              <button className="primary-btn wide big-btn" type="button" onClick={onRapidTap}>
                Tap! ({inc.rapidTaps || 0}/{HATCH_TAPS})
              </button>
            </>
          ) : warmedToday(inc) ? (
            <p className="fine-print">
              {readyToHatch(inc)
                ? 'So warm and ready! Come back tomorrow to help it hatch 🐣'
                : 'You warmed it today 💛 Come back tomorrow to keep it cosy.'}
            </p>
          ) : (
            <>
              <h4>
                {stage === 1
                  ? 'Give it a warm little tap to start its first day. 🥚'
                  : stage === 2
                    ? 'A tiny crack is showing… keep it warm. 🐣'
                    : 'Almost there — one more warm day.'}
              </h4>
              <button className="primary-btn wide big-btn" type="button" onClick={onWarm}>
                Warm this egg 🔥
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="egg-basket">
          <p className="eyebrow">Egg basket · {eggs.length}/{MAX_EGGS} 🧺</p>
          {eggs.length === 0 ? (
            <p className="fine-print">Spot a brand-new bird species and a mystery egg appears here. 🥚</p>
          ) : (
            <div className="basket-row">
              {eggs.map((egg) => (
                <button
                  className="basket-egg"
                  type="button"
                  key={egg.id}
                  onClick={() => onStartIncubate(egg.id)}
                  title={`Start warming (${egg.species})`}
                >
                  <EggGlyph size={56} />
                  <small>Warm this 🥚</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="world-links">
        <button className="secondary-btn" type="button" onClick={onOpenRoom}>
          Bird Room 🏡
        </button>
        <button className="secondary-btn" type="button" onClick={onOpenSanctuary}>
          Sanctuary 🌿 ({sanctuaryCount})
        </button>
      </div>
    </section>
  )
}

// ---- story-event alert ------------------------------------------------------
function EventAlert({ event, onTap, onResolve }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const remaining = Math.max(0, (event.deadline || now) - now)
  const mm = Math.floor(remaining / 60000)
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')

  return (
    <div className={`event-alert kind-${event.kind}`} role="alert">
      <div className="event-emoji">{event.emoji}</div>
      <div className="event-body">
        <strong>{event.title}</strong>
        <p>{event.body}</p>
        {event.kind === 'tap' ? (
          <>
            <div className="event-progress">
              <span style={{ width: `${((event.tapsDone || 0) / event.taps) * 100}%` }}></span>
            </div>
            <div className="event-row">
              <button className="primary-btn" type="button" onClick={onTap}>
                Tap! ({event.tapsDone || 0}/{event.taps})
              </button>
              {event.deadline && <span className="event-timer">⏱️ {mm}:{ss}</span>}
            </div>
          </>
        ) : (
          <button className="primary-btn" type="button" onClick={onResolve}>
            {event.actionLabel || 'Yay! 💛'}
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Escape alert (lives on the home, full drama) --------------------------
export function EscapeAlert({ escape, onRescue }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!escape) return null
  const remaining = Math.max(0, escape.deadline - now)
  const mm = Math.floor(remaining / 60000)
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
  const clues = (escape.clues || []).filter((c) => c.at <= now)
  return (
    <section className="soft-card full-span escape-card">
      <div className="escape-emoji">🐦💨</div>
      <h3>OH NO! {escape.birdName} escaped through an open window!</h3>
      <p className="escape-timer">⏱️ {mm}:{ss} to bring them home</p>
      {clues.length > 0 && (
        <div className="escape-clues">
          {clues.map((c, i) => (
            <p key={i}>🔎 {c.text}</p>
          ))}
        </div>
      )}
      <p className="fine-print">Go outside and photograph ANY real bird to call them back. 💛</p>
      <button className="primary-btn wide big-btn" type="button" onClick={onRescue}>
        Go spot a bird to rescue them 📷
      </button>
    </section>
  )
}

// ---- a little illustrated bird on a perch (for plaques) --------------------
function PlaqueBird({ tint = '#e8a23a' }) {
  return (
    <svg viewBox="0 0 80 64" className="plaque-bird" aria-hidden="true">
      {/* branch perch */}
      <path d="M6 50 q34 -8 70 -2" fill="none" stroke="#8a5e3b" strokeWidth="5" strokeLinecap="round" />
      <path d="M52 50 q4 -7 12 -9" fill="none" stroke="#6f4a2c" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 47 l-3 -6" stroke="#4fae6d" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 47 l4 -5" stroke="#4fae6d" strokeWidth="3" strokeLinecap="round" />
      {/* little bird */}
      <ellipse cx="38" cy="30" rx="14" ry="13" fill={tint} />
      <circle cx="30" cy="22" r="8" fill={tint} />
      <path d="M50 30 q12 -2 16 6 q-10 0 -16 -2 z" fill={tint} opacity="0.85" />
      <circle cx="27" cy="21" r="1.6" fill="#3a2a1a" />
      <path d="M22 23 l-6 1 l6 2 z" fill="#f0a93c" />
      <path d="M38 43 l-3 5 M44 43 l3 5" stroke="#caa46a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ---- the empty-sanctuary illustration (garden + gate + sign) ----------------
function SanctuaryEmpty() {
  return (
    <svg className="sanctuary-empty-svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="An empty garden sanctuary waiting for its first bird">
      <defs>
        <linearGradient id="sancSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cdeaf2" />
          <stop offset="1" stopColor="#eaf6e0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="180" fill="url(#sancSky)" />
      <circle cx="270" cy="38" r="18" fill="#ffe07a" />
      <circle cx="60" cy="34" r="10" fill="#ffffff" opacity="0.9" />
      <circle cx="74" cy="34" r="12" fill="#ffffff" opacity="0.9" />
      {/* rolling lawn */}
      <path d="M0 120 q80 -22 160 -6 q80 16 160 -4 V180 H0 Z" fill="#a9d68a" />
      <path d="M0 140 q90 -16 170 0 q80 14 150 -2 V180 H0 Z" fill="#8fc873" />
      {/* flowers dotted on the lawn */}
      {[[40, 150], [88, 162], [210, 150], [252, 164], [288, 152]].map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx} y2={cy + 8} stroke="#5aa05a" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="3.4" fill={['#f6a5c0', '#fff0b3', '#f8b4d0', '#c9a8e8', '#ffd45e'][i]} />
          <circle cx={cx} cy={cy} r="1.3" fill="#ffd45e" />
        </g>
      ))}
      {/* a friendly garden gate */}
      <g>
        <rect x="120" y="92" width="6" height="46" rx="2" fill="#c9a36a" />
        <rect x="194" y="92" width="6" height="46" rx="2" fill="#c9a36a" />
        <path d="M120 92 q40 -16 80 0" fill="none" stroke="#c9a36a" strokeWidth="6" />
        {[136, 148, 160, 172, 184].map((x) => (
          <rect key={x} x={x} y="104" width="4" height="34" rx="2" fill="#e0c089" />
        ))}
        <rect x="126" y="110" width="68" height="4" fill="#e0c089" />
        <rect x="126" y="124" width="68" height="4" fill="#e0c089" />
      </g>
      {/* the welcome sign */}
      <g>
        <rect x="64" y="58" width="14" height="30" rx="2" fill="#9c6843" />
        <rect x="44" y="40" width="120" height="26" rx="5" fill="#fff7e6" stroke="#c9a36a" strokeWidth="2" />
        <text x="104" y="51" className="sanc-sign-title">Pooks Bird Sanctuary</text>
        <text x="104" y="61" className="sanc-sign-sub">First resident wanted 🐦</text>
      </g>
    </svg>
  )
}

// ---- Sanctuary page ---------------------------------------------------------
export function SanctuaryPage({ tweety, isAdmin, onBack, onLeaveNote }) {
  const residents = tweety?.sanctuary || []
  const count = residents.length
  const sections = unlockedSanctuarySections(count)
  return (
    <div className="page-grid sanctuary-page">
      <section className="soft-card full-span sanctuary-hero">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">Pooks&apos; Bird Sanctuary 💛</p>
        <h2>Pooks has given {count} bird{count === 1 ? '' : 's'} a forever home</h2>
        <p className="fine-print">Unlocks new lands as more birds arrive: {SANCTUARY_SECTIONS.map((s) => s.name).join(' · ')}</p>
      </section>

      {count === 0 && (
        <section className="soft-card full-span sanctuary-empty">
          <SanctuaryEmpty />
          <h3>The garden is ready 🌿</h3>
          <p className="fine-print">Release a grown-up bird from Tweety&apos;s family and it will arrive here as the sanctuary&apos;s very first little resident, perched with its own name plaque. 💛</p>
        </section>
      )}

      {sections.map((section) => {
        const here = residents.filter((_, i) => sanctuarySectionFor(i) === section.id)
        return (
          <section className={`soft-card full-span sanctuary-section sect-${section.id}`} key={section.id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{section.emoji} {section.name}</p>
                <h3>{section.blurb}</h3>
              </div>
            </div>
            {here.length === 0 ? (
              <p className="fine-print">This land is ready and waiting for its first little resident.</p>
            ) : (
              <div className="plaque-grid">
                {here.map((bird) => (
                  <article className="plaque" key={bird.id}>
                    <PlaqueBird tint={['#e8a23a', '#e07a3c', '#3FA66A', '#3E78C8', '#9A7B53'][bird.name.charCodeAt(0) % 5]} />
                    <strong>{bird.name}</strong>
                    <small>{bird.how} · {bird.date}</small>
                    {bird.note && <p className="plaque-note">“{bird.note}” 💛</p>}
                    {isAdmin && (
                      <button
                        className="text-btn"
                        type="button"
                        onClick={() => {
                          const next = window.prompt(`A note for ${bird.name}:`, bird.note || '')
                          if (next !== null) onLeaveNote(bird.id, next.trim())
                        }}
                      >
                        {bird.note ? 'Edit note' : 'Leave a note ✍️'}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ---- the illustrated cosy room (SVG) ---------------------------------------
// A warm little cottage room. Furniture only appears once it's owned, and the
// window scene changes with the season. The fireplace, bath and music box are
// gently tappable.
function RoomScene({ room, season, onInteract }) {
  const key = season?.key || 'summer'
  const has = (id) => ownsFurniture(room, id)

  // seasonal palette for the walls + floor + light spilling in
  const walls = { winter: '#efe3d2', spring: '#f6ead6', summer: '#f8eccf', autumn: '#f3e0c6' }[key] || '#f6ead6'
  const floor = { winter: '#c39a6b', spring: '#cda06b', summer: '#d3a86e', autumn: '#c2935f' }[key] || '#cda06b'
  const sky = { winter: '#cfe0ee', spring: '#d6eef0', summer: '#bfe6f7', autumn: '#f2dcae' }[key] || '#cfe0ee'

  return (
    <svg className="room-svg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A cosy bird room">
      <defs>
        <linearGradient id="roomWallG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.06" />
        </linearGradient>
        <radialGradient id="roomGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fireGlow" cx="0.5" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#ffbf57" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffbf57" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* wall + floor */}
      <rect x="0" y="0" width="320" height="144" fill={walls} />
      <rect x="0" y="0" width="320" height="144" fill="url(#roomWallG)" />
      <rect x="0" y="140" width="320" height="6" fill="#0000001a" />
      <rect x="0" y="144" width="320" height="56" fill={floor} />
      {[160, 168, 176, 184, 192].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#00000010" strokeWidth="1" />
      ))}
      {[60, 130, 210, 280].map((x) => (
        <line key={x} x1={x} y1="146" x2={x + 14} y2="198" stroke="#00000010" strokeWidth="1" />
      ))}

      {/* window — always present, the heart of the room */}
      <g>
        <rect x="206" y="28" width="88" height="74" rx="6" fill="#a9764e" />
        <rect x="210" y="32" width="80" height="66" rx="4" fill={sky} />
        {/* seasonal scene inside the glass */}
        {key === 'summer' && (
          <>
            <circle cx="272" cy="50" r="11" fill="#ffd45e" />
            <circle cx="234" cy="58" r="8" fill="#ffffff" opacity="0.85" />
            <circle cx="244" cy="58" r="9" fill="#ffffff" opacity="0.85" />
          </>
        )}
        {key === 'spring' && (
          <>
            <circle cx="270" cy="48" r="9" fill="#ffe07a" />
            {[[222, 86], [234, 90], [246, 86], [258, 90]].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="3.4" fill={['#f6a5c0', '#f7c6dd', '#fff0b3', '#c9e8a8'][i]} />
                <circle cx={cx} cy={cy} r="1.3" fill="#ffd45e" />
              </g>
            ))}
          </>
        )}
        {key === 'autumn' && (
          <>
            <circle cx="270" cy="50" r="9" fill="#f4b65a" opacity="0.9" />
            {[[226, 50], [248, 64], [264, 78], [236, 80]].map(([cx, cy], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="4" ry="2.6" fill={['#e07a3c', '#d8602f', '#e8a23a', '#c75327'][i]} transform={`rotate(${i * 40} ${cx} ${cy})`} />
            ))}
          </>
        )}
        {key === 'winter' && (
          <>
            {[[222, 44], [240, 60], [256, 50], [270, 70], [232, 80], [262, 86]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="2.2" fill="#ffffff" opacity="0.9" />
            ))}
            {/* frost in the corners */}
            <path d="M210 32 q14 6 12 22 q-10 -10 -20 -6 z" fill="#ffffff" opacity="0.5" />
            <path d="M290 98 q-14 -6 -12 -22 q10 10 20 6 z" fill="#ffffff" opacity="0.5" />
          </>
        )}
        {/* window cross bars */}
        <line x1="250" y1="32" x2="250" y2="98" stroke="#a9764e" strokeWidth="4" />
        <line x1="210" y1="65" x2="290" y2="65" stroke="#a9764e" strokeWidth="4" />
        {/* light spilling onto the floor */}
        <ellipse cx="250" cy="150" rx="60" ry="20" fill="url(#roomGlow)" />
      </g>

      {/* window feeder — hangs OUTSIDE the glass */}
      {has('feeder') && (
        <g>
          <line x1="250" y1="28" x2="250" y2="18" stroke="#7a5535" strokeWidth="2" />
          <rect x="238" y="14" width="24" height="6" rx="2" fill="#7a5535" />
          <path d="M238 20 h24 l-3 7 h-18 z" fill="#caa46a" />
          <circle cx="245" cy="24" r="1.2" fill="#6b4f2a" />
          <circle cx="250" cy="25" r="1.2" fill="#6b4f2a" />
          <circle cx="255" cy="24" r="1.2" fill="#6b4f2a" />
        </g>
      )}

      {/* fairy lights — string across the ceiling */}
      {has('lights') && (
        <g className="room-fairy">
          <path d="M4 14 q80 26 156 8 q80 -18 156 6" fill="none" stroke="#7a5535" strokeWidth="1.5" opacity="0.6" />
          {[24, 60, 96, 132, 168, 204, 240, 276, 308].map((x, i) => {
            const yy = 14 + Math.sin(i) * 4 + (i % 2 ? 8 : 4)
            return <circle key={x} cx={x} cy={yy} r="3" fill={['#ffd45e', '#f6a5c0', '#a8d8f0', '#c9e8a8'][i % 4]} style={{ animationDelay: `${i * 0.2}s` }} />
          })}
        </g>
      )}

      {/* framed bird painting on the wall */}
      {has('painting') && (
        <g>
          <rect x="120" y="36" width="46" height="36" rx="3" fill="#b5895a" />
          <rect x="124" y="40" width="38" height="28" rx="2" fill="#dfeaf2" />
          <path d="M134 58 q6 -10 14 -2" fill="none" stroke="#7a98b0" strokeWidth="2" />
          <circle cx="148" cy="52" r="4" fill="#e8a23a" />
          <path d="M152 52 l5 2 l-5 2 z" fill="#e8a23a" />
        </g>
      )}

      {/* fireplace — warm and glowing, tappable */}
      {has('fireplace') && (
        <g className="room-clickable" onClick={() => onInteract('fireplace')} role="button" aria-label="Light the fireplace">
          <rect x="16" y="70" width="64" height="72" rx="3" fill="#b07a58" />
          <rect x="12" y="66" width="72" height="8" rx="2" fill="#9c6843" />
          <rect x="26" y="92" width="44" height="50" rx="2" fill="#3b2a22" />
          <ellipse cx="48" cy="138" rx="34" ry="18" fill="url(#fireGlow)" className="room-fire-glow" />
          <g className="room-fire-flame">
            <path d="M48 136 q-10 -8 -4 -22 q4 8 8 4 q-2 10 6 18 q-6 4 -10 0 z" fill="#ff8a3c" />
            <path d="M48 136 q-5 -6 -2 -14 q3 5 6 2 q-1 7 4 12 q-5 2 -8 0 z" fill="#ffd45e" />
          </g>
        </g>
      )}

      {/* bookshelf */}
      {has('bookshelf') && (
        <g>
          <rect x="92" y="92" width="34" height="50" rx="2" fill="#9c6843" />
          {[100, 118].map((y) => <rect key={y} x="94" y={y} width="30" height="2.5" fill="#7a5535" />)}
          {[['#e07a3c', 95], ['#3FA66A', 100], ['#3E78C8', 105], ['#E0463A', 110], ['#e8a23a', 115]].map(([c, x]) => (
            <rect key={x} x={x} y="95" width="4" height="14" fill={c} />
          ))}
          {[['#6db3e0', 95], ['#f6a5c0', 101], ['#c9e8a8', 107], ['#ffd45e', 113]].map(([c, x]) => (
            <rect key={`b${x}`} x={x} y="113" width="5" height="14" fill={c} />
          ))}
        </g>
      )}

      {/* potted plant near the window */}
      {has('plant') && (
        <g>
          <path d="M188 138 l8 0 l-2 16 l-4 0 z" fill="#c87f4a" />
          <path d="M192 138 q-12 -16 -2 -30 q4 12 2 30" fill="#4fae6d" />
          <path d="M192 138 q12 -14 4 -28 q-2 12 -4 28" fill="#3f9a5e" />
          <path d="M192 138 q0 -20 0 -34 q3 16 0 34" fill="#5cbd79" />
        </g>
      )}

      {/* cosy round rug */}
      {has('rug') && (
        <g>
          <ellipse cx="150" cy="178" rx="56" ry="16" fill="#e0896a" />
          <ellipse cx="150" cy="178" rx="40" ry="11" fill="#eba883" />
          <ellipse cx="150" cy="178" rx="22" ry="6" fill="#f4c79f" />
        </g>
      )}

      {/* bird bath — tappable */}
      {has('bath') && (
        <g className="room-clickable" onClick={() => onInteract('bath')} role="button" aria-label="Splash in the bath">
          <rect x="100" y="168" width="8" height="20" fill="#9fb6c2" />
          <ellipse cx="104" cy="166" rx="22" ry="8" fill="#bcd0da" />
          <ellipse cx="104" cy="165" rx="17" ry="5.5" fill="#8fc7e3" />
          <ellipse cx="100" cy="164" rx="3" ry="1.4" fill="#ffffff" opacity="0.8" />
        </g>
      )}

      {/* music box — tappable */}
      {has('musicbox') && (
        <g className="room-clickable" onClick={() => onInteract('musicbox')} role="button" aria-label="Play the music box">
          <rect x="226" y="170" width="26" height="18" rx="2" fill="#b5895a" />
          <rect x="226" y="170" width="26" height="5" rx="2" fill="#9c6843" />
          <circle cx="239" cy="181" r="4" fill="#ffd45e" />
          <text x="256" y="170" className="room-note">♪</text>
          <text x="248" y="162" className="room-note" style={{ animationDelay: '0.6s' }}>♫</text>
        </g>
      )}

      {/* the perch — a little branch in the corner (always present) */}
      <g>
        <path d="M286 150 q-26 -6 -44 4" fill="none" stroke="#8a5e3b" strokeWidth="5" strokeLinecap="round" />
        <path d="M270 151 q4 -8 12 -10" fill="none" stroke="#6f4a2c" strokeWidth="3" strokeLinecap="round" />
        <path d="M258 154 l-4 -7" stroke="#4fae6d" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// ---- Bird Room page ---------------------------------------------------------
export function BirdRoomPage({ tweety, season, coins, isAdmin, onBack, onBuy, onInteract }) {
  const room = tweety?.room || { furniture: ['perch'], visits: 0 }
  return (
    <div className="page-grid bird-room-page">
      <section className={`soft-card full-span room-stage room-${season.key}`}>
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">The Bird Room 🏡 · {season.name}</p>
        <h2>{tweety?.name || 'Tweety'}&apos;s cosy room</h2>
        <div className="room-scene">
          <RoomScene room={room} season={season} onInteract={onInteract} />
          <span className="room-tweety">
            <TweetyBird companion={tweety?.companion} size={60} />
          </span>
        </div>
        <p className="fine-print">{room.visits || 0} bird{(room.visits || 0) === 1 ? '' : 's'} have visited this room 💛</p>
      </section>

      <section className="soft-card full-span">
        <p className="eyebrow">Decorate with coins 🪙 ({coins})</p>
        <div className="store-grid">
          {ROOM_FURNITURE.map((item) => {
            const owned = ownsFurniture(room, item.id)
            const isDefault = item.cost === 0
            const canBuy = !owned && coins >= item.cost
            return (
              <article className={`store-item${owned ? ' owned' : ''}`} key={item.id}>
                <span className="store-emoji">{item.emoji}</span>
                <h4>{item.name}</h4>
                <p>{item.desc}</p>
                {owned || isDefault ? (
                  <span className="store-owned">{isAdmin ? 'In room' : 'Owned ✅'}</span>
                ) : (
                  <button className="primary-btn store-buy" type="button" disabled={!isAdmin && !canBuy} onClick={() => onBuy(item)}>
                    {isAdmin ? 'Gift 🎁' : `${item.cost} 🪙`}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
