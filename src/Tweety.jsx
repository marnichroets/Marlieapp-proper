// Tweety the pet bird — components only (helpers live in ./tweetyData).
import {
  tweetyToday,
  tweetyMood,
  tweetyLevel,
  tweetyDaysCared,
  tweetyLongestStreak,
  babyStage,
  babyStageLabel,
  babyCareToday,
  daysSince,
  AVIARY_MAX,
} from './tweetyData'

// ---- Tweety SVG ------------------------------------------------------------
export function TweetyBird({ level = 'chick', mood = 'happy', dancing = false, size = 120 }) {
  const big = level === 'grown' || level === 'crown'
  const mid = level === 'fledgling' || big
  const rx = level === 'chick' ? 23 : level === 'fledgling' ? 26 : 29
  const ry = rx + 1
  const sad = mood === 'sad'
  const body = '#F6CE73'
  const belly = '#FBE6A8'
  const wing = '#EBB94E'

  return (
    <span
      className={`tweety-bird${dancing ? ' tweety-dance' : ''}${sad ? ' tweety-sad' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className="tweety-bob">
          {/* ruffled feathers when sad */}
          {sad && (
            <g fill={wing}>
              <path d="M28 40 l-6 -5 l7 0 Z" />
              <path d="M72 40 l6 -5 l-7 0 Z" />
              <path d="M50 28 l-3 -7 l6 0 Z" />
            </g>
          )}
          {/* top curl/tuft */}
          <path d="M50 30 q-2 -12 6 -13 q-3 8 -2 13 Z" fill={wing} />
          {/* body */}
          <ellipse cx="50" cy={58} rx={rx} ry={ry} fill={body} />
          <ellipse cx="50" cy={64} rx={rx * 0.62} ry={ry * 0.55} fill={belly} />
          {/* wings (appear as it grows; flap) */}
          {mid && (
            <g className="tweety-wing">
              <ellipse cx={50 - rx + 2} cy="58" rx="8" ry={big ? 13 : 10} fill={wing} />
            </g>
          )}
          {mid && <ellipse cx={50 + rx - 2} cy="58" rx="8" ry={big ? 13 : 10} fill={wing} />}
          {/* feet */}
          <path d="M44 82 v6 M41 88 h6 M42 85 h4" stroke="#E8915E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M56 82 v6 M53 88 h6 M54 85 h4" stroke="#E8915E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* cheeks */}
          <circle cx="38" cy="58" r="4" fill="#F7A8B8" opacity="0.6" />
          <circle cx="62" cy="58" r="4" fill="#F7A8B8" opacity="0.6" />
          {/* eyes */}
          {sad ? (
            <g stroke="#3E2F22" strokeWidth="2.6" fill="none" strokeLinecap="round">
              <path d="M40 50 q3 3 6 0" />
              <path d="M54 50 q3 3 6 0" />
            </g>
          ) : (
            <g className="tweety-eyes" fill="#3E2F22">
              <circle cx="43" cy="50" r="3.4" />
              <circle cx="57" cy="50" r="3.4" />
              <circle cx="44.2" cy="48.8" r="1.1" fill="#fff" />
              <circle cx="58.2" cy="48.8" r="1.1" fill="#fff" />
            </g>
          )}
          {/* tear when sad */}
          {sad && <path d="M40 54 q-2 4 0 6 q2 -2 0 -6" fill="#9AD0F0" />}
          {/* beak */}
          <path d="M47 57 l6 0 l-3 5 z" fill="#F2A24E" />
          {/* smile when happy */}
          {mood === 'happy' && (
            <path d="M46 65 q4 3 8 0" stroke="#C8742E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          )}
          {/* crown at top level */}
          {level === 'crown' && (
            <path d="M40 30 L42 18 L50 26 L54 15 L58 26 L66 18 L68 30 Z" fill="#F2C24E" stroke="#D9A036" strokeWidth="1" transform="translate(0 -2)" />
          )}
        </g>
      </svg>
    </span>
  )
}

// ---- Home card -------------------------------------------------------------
export function TweetyHomeCard({
  tweety,
  level,
  mood,
  streak,
  dancing,
  nestTier = 'basic',
  rainbow = false,
  loveLetter = '',
  onFeed,
  onWater,
  onPlay,
  onOpenStats,
}) {
  const today = tweetyToday(tweety)
  const name = tweety?.name || 'Tweety'

  const moodLine =
    mood === 'happy'
      ? `${name} is happy and chirpy! 💛`
      : mood === 'sad'
        ? `${name} missed you — one little visit will cheer them right up. 🫧`
        : `${name} is waiting for some love.`

  return (
    <section className={`soft-card full-span tweety-card tweety-mood-${mood}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{name}&apos;s Home 🪺</p>
          <h3>{moodLine}</h3>
        </div>
        <button className="text-btn" type="button" onClick={onOpenStats}>
          Stats →
        </button>
      </div>

      <div className={`tweety-stage nest-${nestTier}`}>
        {mood === 'sad' && <div className="tweety-raincloud" aria-hidden="true">🌧️</div>}
        {nestTier === 'luxury' && <div className="nest-decor nest-lights" aria-hidden="true">✨🏮✨</div>}
        {nestTier === 'treehouse' && <div className="nest-decor nest-tree" aria-hidden="true">🌳</div>}
        <div className={`tweety-nest${rainbow ? ' tweety-rainbow' : ''}`}>
          <TweetyBird level={level.key} mood={mood} dancing={dancing} size={132} />
          {loveLetter && <span className="tweety-letter" title={loveLetter} aria-hidden="true">💌</span>}
          <div className={`tweety-nest-base nest-base-${nestTier}`} aria-hidden="true" />
        </div>
        <span className="tweety-level-pill">{level.label}</span>
        {streak > 0 && <span className="tweety-streak-pill">{streak}-day care streak 🔥</span>}
      </div>
      {loveLetter && <p className="tweety-letter-text">💌 {loveLetter}</p>}

      <div className="tweety-care-row">
        <button
          className={`tweety-care-btn${today.fed ? ' done' : ''}`}
          type="button"
          onClick={onFeed}
          disabled={today.fed}
        >
          <span className="tweety-care-icon" aria-hidden="true">{today.fed ? '🍽️' : '🥣'}</span>
          <span>{today.fed ? 'Fed ✓' : 'Feed'}</span>
        </button>
        <button
          className={`tweety-care-btn${today.watered ? ' done' : ''}`}
          type="button"
          onClick={onWater}
          disabled={today.watered}
        >
          <span className="tweety-care-icon" aria-hidden="true">{today.watered ? '💧' : '🫗'}</span>
          <span>{today.watered ? 'Watered ✓' : 'Water'}</span>
        </button>
        <button
          className={`tweety-care-btn${today.played ? ' done' : ''}`}
          type="button"
          onClick={onPlay}
          disabled={today.played}
        >
          <span className="tweety-care-icon" aria-hidden="true">{today.played ? '💗' : '🤍'}</span>
          <span>{today.played ? 'Played ✓' : 'Play'}</span>
        </button>
      </div>
      <p className="tweety-hint">Each little kindness gives +5 Feather Coins 🪙</p>
    </section>
  )
}

// ---- Stats page ------------------------------------------------------------
export function TweetyStatsPage({ tweety, birdCount, onBack, onRename }) {
  const level = tweetyLevel(birdCount)
  const name = tweety?.name || 'Tweety'
  return (
    <div className="page-grid">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          Back
        </button>
        <div className="tweety-stats-hero">
          <TweetyBird level={level.key} mood={tweetyMood(tweety)} size={120} />
          <div>
            <p className="eyebrow">Your pet bird</p>
            <h2>{name}</h2>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const next = window.prompt('Rename your pet bird:', name)
                if (next && next.trim()) onRename(next.trim())
              }}
            >
              Rename
            </button>
          </div>
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="admin-dashboard-grid">
          <div className="stat-card">
            <span>Days cared for</span>
            <strong>{tweetyDaysCared(tweety)}</strong>
            <p>full-care days</p>
          </div>
          <div className="stat-card">
            <span>Longest streak</span>
            <strong>{tweetyLongestStreak(tweety)}</strong>
            <p>days in a row</p>
          </div>
          <div className="stat-card">
            <span>Current level</span>
            <strong>{level.label}</strong>
            <p>grows as you spot birds</p>
          </div>
          <div className="stat-card">
            <span>Treats from Marnich</span>
            <strong>{tweety?.treatsReceived || 0}</strong>
            <p>surprise treats 💛</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---- Egg / baby / aviary SVGs ----------------------------------------------
function EggSVG({ mystery = false }) {
  const shell = mystery ? '#F2D06A' : '#FBEFD6'
  const speck = mystery ? '#E0A64F' : '#E8CFA6'
  return (
    <span className={`egg-svg${mystery ? ' mystery' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g className="egg-shake">
          <ellipse cx="50" cy="56" rx="28" ry="34" fill={shell} />
          <ellipse cx="42" cy="46" rx="8" ry="11" fill="#fff" opacity="0.5" />
          <circle cx="40" cy="64" r="3" fill={speck} />
          <circle cx="58" cy="54" r="3.5" fill={speck} />
          <circle cx="54" cy="72" r="2.6" fill={speck} />
        </g>
      </svg>
    </span>
  )
}

function BabySVG({ stage }) {
  const rx = stage === 'adult' ? 26 : stage === 'fledgling' ? 22 : 18
  const ry = rx + 1
  return (
    <span className="baby-svg" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g className="tweety-bob">
          {stage !== 'hatchling' && (
            <>
              <ellipse cx={50 - rx + 2} cy="58" rx="7" ry={stage === 'adult' ? 12 : 9} fill="#EBB94E" />
              <ellipse cx={50 + rx - 2} cy="58" rx="7" ry={stage === 'adult' ? 12 : 9} fill="#EBB94E" />
            </>
          )}
          <ellipse cx="50" cy="58" rx={rx} ry={ry} fill="#F6CE73" />
          <ellipse cx="50" cy="64" rx={rx * 0.6} ry={ry * 0.55} fill="#FBE6A8" />
          {stage === 'hatchling' && (
            <path d="M38 40 q12 -10 24 0 q-4 -3 -12 -3 q-8 0 -12 3 Z" fill="#FBEFD6" />
          )}
          <circle cx="44" cy="52" r="3" fill="#3E2F22" />
          <circle cx="56" cy="52" r="3" fill="#3E2F22" />
          <path d="M47 58 l6 0 l-3 5 z" fill="#F2A24E" />
          <path d="M46 66 q4 3 8 0" stroke="#C8742E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  )
}

function AviaryBird({ idle = 'hop' }) {
  return (
    <span className={`aviary-bird idle-${idle}`} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g>
          <ellipse cx="50" cy="58" rx="22" ry="23" fill="#F4A09A" />
          <ellipse cx="48" cy="64" rx="13" ry="11" fill="#FBD9D2" />
          <ellipse cx="38" cy="56" rx="8" ry="11" fill="#DA8680" />
          <circle cx="58" cy="50" r="3" fill="#3E2F22" />
          <path d="M70 52 l8 3 l-8 3 z" fill="#F2A24E" />
        </g>
      </svg>
    </span>
  )
}

// ---- Family card (egg or baby) ---------------------------------------------
export function TweetyFamilyCard({ tweety, onCareBaby, onRelease, onKeep }) {
  const egg = tweety?.egg
  const baby = tweety?.baby
  if (!egg && !baby) return null

  if (egg) {
    const progress = Math.min(3, egg.careDays || 0)
    return (
      <section className={`soft-card full-span family-card egg-card${egg.kind === 'mystery' ? ' mystery' : ''}`}>
        <p className="eyebrow">{egg.kind === 'mystery' ? 'A mystery egg from Marnich 💛' : "Tweety's egg 🥚"}</p>
        <div className="egg-stage">
          <EggSVG mystery={egg.kind === 'mystery'} />
        </div>
        <h3>
          {egg.kind === 'mystery'
            ? 'What could be inside? Keep caring for Tweety while it hatches ✨'
            : 'Tweety laid an egg! Keep caring for her while it hatches 🥚✨'}
        </h3>
        <p className="fine-print">Hatches after 3 days of full care — {progress}/3 so far.</p>
        <div className="progress-track">
          <span style={{ width: `${(progress / 3) * 100}%` }}></span>
        </div>
      </section>
    )
  }

  const stage = babyStage(baby)
  const care = babyCareToday(baby)
  return (
    <section className="soft-card full-span family-card baby-card">
      <p className="eyebrow">Baby {baby.species} · {babyStageLabel(stage)}</p>
      <div className="egg-stage">
        <BabySVG stage={stage} />
      </div>
      {stage === 'adult' ? (
        <>
          <h3>Your little one is all grown up! Time to decide… 🐦</h3>
          <div className="button-row">
            <button className="primary-btn" type="button" onClick={onRelease}>
              Release into the wild 🌿
            </button>
            <button className="secondary-btn" type="button" onClick={onKeep}>
              Keep in my aviary 🏠
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>Look after your baby bird every day 💛</h3>
          <p className="fine-print">Day {daysSince(baby.hatchedAt)} of growing up.</p>
          <div className="tweety-care-row">
            <button
              className={`tweety-care-btn${care.fed ? ' done' : ''}`}
              type="button"
              onClick={() => onCareBaby('feed')}
              disabled={care.fed}
            >
              <span className="tweety-care-icon">{care.fed ? '🍽️' : '🥣'}</span>
              <span>{care.fed ? 'Fed ✓' : 'Feed'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.watered ? ' done' : ''}`}
              type="button"
              onClick={() => onCareBaby('water')}
              disabled={care.watered}
            >
              <span className="tweety-care-icon">{care.watered ? '💧' : '🫗'}</span>
              <span>{care.watered ? 'Watered ✓' : 'Water'}</span>
            </button>
          </div>
          <button className="text-btn" type="button" onClick={onRelease}>
            Release early 🌿
          </button>
        </>
      )}
    </section>
  )
}

// ---- Aviary card -----------------------------------------------------------
export function AviaryCard({ tweety, aviaryTier = 'basic', flockDance = false, onReleaseAviary }) {
  const aviary = tweety?.aviary || []
  if (aviary.length === 0) return null
  const full = aviary.length >= AVIARY_MAX
  const dailyCoins = aviary.length * 3 + (full ? 20 : 0)
  return (
    <section className={`soft-card full-span aviary-card aviary-${aviaryTier}${flockDance ? ' flock-dance' : ''}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your Aviary 🏠</p>
          <h3>{aviary.length} / {AVIARY_MAX} birds · +{dailyCoins} coins a day</h3>
        </div>
        {full && <span className="status-pill paid">Full flock bonus! ✨</span>}
      </div>
      <div className="aviary-stage">
        {aviary.map((bird) => (
          <div className="aviary-slot" key={bird.id}>
            <AviaryBird idle={bird.idle} />
            <small>{bird.species}</small>
            <button
              className="text-btn"
              type="button"
              onClick={() => onReleaseAviary(bird.id)}
            >
              Release 🌿
            </button>
          </div>
        ))}
      </div>
      {full && <p className="fine-print">Aviary full — release a bird to make room for a new one.</p>}
    </section>
  )
}
