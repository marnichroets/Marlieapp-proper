import { Component, useEffect, useMemo, useRef, useState } from 'react'
import './fieldReel.css'

function playFieldChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return
  try {
    const ctx = new AudioCtx()
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.02 + index * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45 + index * 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + index * 0.08)
      osc.stop(ctx.currentTime + 0.5 + index * 0.08)
    })
    window.setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch {
    /* autoplay or audio device unavailable */
  }
}

function tapHaptic() {
  try {
    navigator.vibrate?.([12, 36, 16])
  } catch {
    /* no haptic hardware */
  }
}

export function FieldPremiere({ onEnter }) {
  const [beat, setBeat] = useState(() => (
    typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ? 2
      : 0
  ))
  const enterRef = useRef(onEnter)
  useEffect(() => {
    enterRef.current = onEnter
  }, [onEnter])

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) return undefined
    const timers = [
      window.setTimeout(() => setBeat(1), 2200),
      window.setTimeout(() => setBeat(2), 5200),
      window.setTimeout(() => enterRef.current(), 9000),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <main className="reel-premiere" data-beat={beat} aria-label="Field and Folio opening">
      <div className="reel-sky" aria-hidden="true" />
      <div className="reel-ground" aria-hidden="true" />
      <div className="reel-haze" aria-hidden="true" />
      <i className="reel-tree a" aria-hidden="true" />
      <i className="reel-tree b" aria-hidden="true" />
      <i className="reel-tree c" aria-hidden="true" />
      <i className="reel-bloom one" aria-hidden="true" />
      <i className="reel-bloom two" aria-hidden="true" />
      <i className="reel-bloom three" aria-hidden="true" />
      <span className="reel-bird" aria-hidden="true">🕊️</span>
      <span className="reel-bird late" aria-hidden="true">🐦</span>
      <div className="reel-copy">
        <p className="reel-kicker">PooksBooks · South Africa</p>
        <h1>Field &amp; Folio</h1>
        <p className="reel-line">
          {beat < 2
            ? 'A garden that keeps its own time.'
            : 'Spot a bird. Press a flower. Watch the garden answer.'}
        </p>
        <div className="reel-actions">
          <button className="primary-btn big-btn" type="button" onClick={onEnter}>
            Enter the garden
          </button>
        </div>
      </div>
    </main>
  )
}

export function ReelControls({ onAction }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="reel-chip">
      <button
        className="reel-chip-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide reel' : 'Reel'}
      </button>
      {open && (
        <div className="reel-chip-actions">
          <p className="reel-note">Local sample only. Never written to a real account.</p>
          {[
            ['premiere', 'Opening'],
            ['reveal', 'Discovery'],
            ['folio', 'Folio'],
            ['garden', 'Garden'],
            ['share', 'Story card'],
            ['membership', 'Membership'],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => onAction(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function rarityClass(rarity) {
  const value = String(rarity || 'Common').toLowerCase()
  if (value.includes('rare')) return 'rare'
  if (value.includes('uncommon')) return 'uncommon'
  return 'common'
}

export function DiscoveryPlaque({ bird, onClose, onShare }) {
  useEffect(() => {
    playFieldChime()
    tapHaptic()
  }, [])

  if (!bird) return null
  const rarity = bird.rarity || 'Common'
  return (
    <div className="plaque-root" role="dialog" aria-modal="true" aria-label={`Discovery, ${bird.commonName}`}>
      <button className="plaque-scrim" type="button" aria-label="Close discovery" onClick={onClose} />
      <article className="plaque-card">
        <p className="plaque-kicker">Filed in the folio</p>
        <span className={`plaque-seal ${rarityClass(rarity)}`}>{rarity}</span>
        <h2>{bird.commonName}</h2>
        {bird.scientificName && <p className="plaque-sci">{bird.scientificName}</p>}
        {bird.afrikaansName && <p className="plaque-sci">{bird.afrikaansName}</p>}
        <p className="plaque-fact">{bird.funFact || bird.description || 'A South African species, pressed into the folio.'}</p>
        <div className="plaque-actions">
          <button className="primary-btn" type="button" onClick={onShare}>
            Save story card
          </button>
          <button className="ghost-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </article>
    </div>
  )
}

function regionOf(bird) {
  const tags = bird.tags || []
  const text = `${bird.region || ''} ${bird.category || ''} ${tags.join(' ')}`.toLowerCase()
  if (tags.includes('Water birds') || text.includes('water') || text.includes('wetland')) return 'Water'
  if (text.includes('fynbos') || text.includes('cape town') || (bird.regionTags || []).includes('capetown')) return 'Cape'
  return 'Highveld'
}

export function FolioBook({ birds = [], onBack, onShare }) {
  const seen = useMemo(() => birds.filter((bird) => bird.seen), [birds])
  const pages = useMemo(() => [{ kind: 'cover' }, ...seen], [seen])
  const [index, setIndex] = useState(0)
  const [turning, setTurning] = useState('')
  const page = pages[index] || pages[0]
  const counts = useMemo(() => {
    return seen.reduce(
      (acc, bird) => {
        acc[regionOf(bird)] += 1
        if (String(bird.rarity || '').toLowerCase().includes('rare')) acc.rare += 1
        return acc
      },
      { Highveld: 0, Water: 0, Cape: 0, rare: 0 },
    )
  }, [seen])

  function turn(direction) {
    const next = Math.min(pages.length - 1, Math.max(0, index + direction))
    if (next === index) return
    setTurning(direction > 0 ? 'turning-next' : 'turning-prev')
    window.setTimeout(() => {
      setIndex(next)
      setTurning('')
    }, 180)
  }

  return (
    <div className="folio-root" role="dialog" aria-modal="true" aria-label="Field folio">
      <button className="folio-scrim" type="button" aria-label="Close folio" onClick={onBack} />
      <section className="folio-sheet">
        <p className="folio-kicker">Field folio · {index + 1} / {pages.length}</p>
        <div className={`folio-page ${turning}`}>
          {page?.kind === 'cover' ? (
            <>
              <h2>The living list</h2>
              <p>{seen.length} species pressed into this sample folio.</p>
              <div className="folio-progress">
                <div><strong>{counts.Highveld}</strong> Highveld</div>
                <div><strong>{counts.Water}</strong> Water</div>
                <div><strong>{counts.Cape}</strong> Cape</div>
              </div>
              <div className="folio-badges">
                <div className="folio-badge"><strong>Pressed</strong> First folio</div>
                {counts.Highveld >= 3 && <div className="folio-badge"><strong>Garden</strong> Regular</div>}
                {counts.Water > 0 && <div className="folio-badge"><strong>Water</strong> Watcher</div>}
                {counts.rare > 0 && <div className="folio-badge"><strong>Rare</strong> Ink</div>}
              </div>
            </>
          ) : (
            <>
              <span className={`plaque-seal ${rarityClass(page?.rarity)}`}>{page?.rarity || 'Common'}</span>
              <h2>{page?.commonName}</h2>
              <p className="folio-sci">{page?.scientificName}</p>
              <p className="plaque-fact">{regionOf(page)} · {page?.timesSeen || 1} sighting{(page?.timesSeen || 1) === 1 ? '' : 's'}</p>
              <p className="plaque-fact">{page?.description || page?.funFact || page?.habitat || 'Noted in the field.'}</p>
            </>
          )}
        </div>
        <div className="folio-nav">
          <button className="ghost-btn" type="button" onClick={() => turn(-1)} disabled={index === 0}>
            Previous page
          </button>
          <button className="ghost-btn" type="button" onClick={() => turn(1)} disabled={index >= pages.length - 1}>
            Next page
          </button>
          {page?.kind !== 'cover' && (
            <button className="primary-btn" type="button" onClick={() => onShare(page)}>
              Share this page
            </button>
          )}
          <button className="text-btn" type="button" onClick={onBack}>
            Close folio
          </button>
        </div>
      </section>
    </div>
  )
}

export function MembershipSheet({ joined, onJoin, onClose }) {
  return (
    <div className="member-root" role="dialog" aria-modal="true" aria-label="Field and Folio membership">
      <button className="folio-scrim" type="button" aria-label="Close membership" onClick={onClose} />
      <section className="member-sheet">
        <p className="member-kicker">Membership preview</p>
        <h2>Field &amp; Folio</h2>
        <p>A quiet paid tier for the field guide. Nothing on this screen charges a card.</p>
        <div className="member-grid">
          <article className={`member-choice ${joined ? '' : 'selected'}`}>
            <h3>Field notes · free</h3>
            <ul>
              <li>Spot birds and plants</li>
              <li>Keep a collection</li>
              <li>Tend the garden</li>
            </ul>
          </article>
          <article className={`member-choice ${joined ? 'selected' : ''}`}>
            <h3>Field &amp; Folio</h3>
            <ul>
              <li>Story cards of every discovery</li>
              <li>The bound folio, with region badges</li>
              <li>Garden light, weather, and visitors</li>
              <li>Offline field packs, when they ship</li>
            </ul>
          </article>
        </div>
        <p className="member-warning">
          Payments are not connected. Joining here only marks this preview. No App Store, Play Billing, or card charge exists in this build.
        </p>
        <div className="member-actions">
          <button className="primary-btn" type="button" onClick={onJoin} disabled={joined}>
            {joined ? 'Preview joined' : 'Preview the folio'}
          </button>
          <button className="ghost-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

export function PrivacyNote({ onBack }) {
  return (
    <main className="privacy-root">
      <article className="privacy-sheet">
        <p className="privacy-kicker">PooksBooks</p>
        <h1>Privacy note</h1>
        <p>
          This is a plain-language placeholder so the app has a privacy page to open.
          It is not a POPIA or GDPR policy, and it is not legal advice. A lawyer needs
          to replace it before any App Store or Play submission.
        </p>
        <p>
          The current private app stores a full account — sightings, photos, notes,
          garden, and a secret word — on a server, and a copy on the device. The
          field reel on this device is sample data only and is not uploaded.
        </p>
        <p>
          Photos you identify may be sent to the identification service. Location,
          when used for garden weather, stays in that request and is not written
          into the garden save.
        </p>
        <button className="primary-btn" type="button" onClick={onBack}>
          Back
        </button>
      </article>
    </main>
  )
}

export function OfflineRibbon() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  if (!offline) return null
  return (
    <p className="offline-ribbon" role="status">
      You&apos;re offline. The guide already on this device still opens. A new identification needs a signal.
    </p>
  )
}

export function LoginLivingEdge() {
  return (
    <div className="login-living" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="reel-error">
          <p>Field &amp; Folio</p>
          <h1>Something snagged.</h1>
          <p>The field notes already saved are still on the device. Reload to open the guide again.</p>
          <button className="primary-btn" type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
