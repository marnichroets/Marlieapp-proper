// One-time cinematic reveal for the Botanical Division promotion — the
// plant-scanning equivalent of IntroSequence's dossier intro, but much
// simpler: 5 tap-to-advance beats, no bespoke art/sound, full-screen takeover.
// Nothing auto-advances; tapping anywhere moves to the next beat, except the
// final beat which needs an explicit "Begin my mission" tap (mirrors the
// intro's explicit "Accept my mission" pattern rather than a stray tap
// silently dismissing the reveal).
import { useState } from 'react'
import './BotanicalReveal.css'

const TOTAL = 5

export default function BotanicalReveal({ onComplete, letterBody, missionTarget = 5 }) {
  const [beat, setBeat] = useState(1)

  function tap() {
    if (beat < TOTAL) setBeat((current) => current + 1)
  }

  function begin(event) {
    event?.stopPropagation()
    onComplete()
  }

  const mood = beat <= 2 ? 'dark' : beat === 3 ? 'letter' : 'warm'

  return (
    <div
      className={`botrev-root botrev-mood-${mood}`}
      role="dialog"
      aria-modal="true"
      aria-label="Botanical Division reveal"
      onClick={tap}
    >
      <div className="botrev-grain" aria-hidden="true" />

      {beat === 1 && (
        <div className="botrev-stage botrev-seal-stage">
          <div className="botrev-seal">
            <span className="botrev-seal-leaf" aria-hidden="true">🌿</span>
          </div>
          <p className="botrev-tap-hint">tap anywhere to continue ›</p>
        </div>
      )}

      {beat === 2 && (
        <div className="botrev-stage botrev-title-stage">
          <p className="botrev-urgent">URGENT DISPATCH</p>
          <h1 className="botrev-council-name">
            Botanical Council
            <br />
            of the Southern Hemisphere
          </h1>
          <p className="botrev-tap-hint">tap anywhere to continue ›</p>
        </div>
      )}

      {beat === 3 && (
        <div className="botrev-stage botrev-letter-stage">
          <p className="botrev-eyebrow">Official Correspondence</p>
          <div className="botrev-letter-paper">
            <p className="botrev-letter-body">{letterBody}</p>
          </div>
          <p className="botrev-tap-hint">tap anywhere to continue ›</p>
        </div>
      )}

      {beat === 4 && (
        <div className="botrev-stage botrev-unlock-stage">
          <div className="botrev-unlock-badge">
            <span className="botrev-unlock-ring" aria-hidden="true" />
            <span className="botrev-unlock-check" aria-hidden="true">✓</span>
          </div>
          <p className="botrev-unlock-text">
            Your Botanical Division credentials are now active, Agent.
          </p>
          <p className="botrev-tap-hint">tap anywhere to continue ›</p>
        </div>
      )}

      {beat === 5 && (
        <div className="botrev-stage botrev-mission-stage">
          <p className="botrev-eyebrow">Your First Assignment</p>
          <h2 className="botrev-mission-text">Identify {missionTarget} plants in the field.</h2>
          <p className="botrev-mission-sub">The Council is watching. 🌿</p>
          <button className="primary-btn wide big-btn botrev-begin-btn" type="button" onClick={begin}>
            Begin my mission 🌿
          </button>
        </div>
      )}
    </div>
  )
}
