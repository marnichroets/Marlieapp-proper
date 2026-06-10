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
  level,
  mood,
  dancing,
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

      <div className="world-stage">
        <div className="world-nest">
          <TweetyBird level={level.key} mood={mood} dancing={dancing} size={120} companion={tweety?.companion} />
        </div>
      </div>

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
                    <div className="plaque-perch" aria-hidden="true">🌿🐦</div>
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

// ---- Bird Room page ---------------------------------------------------------
export function BirdRoomPage({ tweety, season, coins, isAdmin, onBack, onBuy, onInteract }) {
  const room = tweety?.room || { furniture: ['perch'], visits: 0 }
  const aviary = tweety?.aviary || []
  return (
    <div className="page-grid bird-room-page">
      <section className={`soft-card full-span room-stage room-${season.key}`}>
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">The Bird Room 🏡 · {season.name}</p>
        <h2>{tweety?.name || 'Tweety'}&apos;s cosy room</h2>
        <div className="room-scene">
          {ownsFurniture(room, 'rug') && <div className="room-item room-rug" aria-hidden="true">🟤</div>}
          {ownsFurniture(room, 'plant') && <div className="room-item room-plant" aria-hidden="true">🌿</div>}
          {ownsFurniture(room, 'bookshelf') && <div className="room-item room-books" aria-hidden="true">📚</div>}
          {ownsFurniture(room, 'painting') && <div className="room-item room-paint" aria-hidden="true">🖼️</div>}
          {ownsFurniture(room, 'feeder') && <div className="room-item room-feeder" aria-hidden="true">🪟</div>}
          {ownsFurniture(room, 'lights') && <div className="room-item room-lights" aria-hidden="true">🌟✨🌟</div>}
          {ownsFurniture(room, 'fireplace') && (
            <button className="room-item room-fire" type="button" onClick={() => onInteract('fireplace')}>🔥</button>
          )}
          {ownsFurniture(room, 'bath') && (
            <button className="room-item room-bath" type="button" onClick={() => onInteract('bath')}>💧</button>
          )}
          {ownsFurniture(room, 'musicbox') && (
            <button className="room-item room-music" type="button" onClick={() => onInteract('musicbox')}>🎵</button>
          )}
          {/* aviary birds visiting */}
          <div className="room-birds" aria-hidden="true">
            {aviary.slice(0, 5).map((b) => (
              <span className="room-bird" key={b.id}>🐦</span>
            ))}
          </div>
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
