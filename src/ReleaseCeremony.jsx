// A small, standalone ceremonial moment for releasing a crowned companion to
// the garden forever. Deliberately NOT built on IntroSequence.jsx (a 969-line
// onboarding-specific state machine) — this borrows its visual idea only
// (full-bleed, one beat at a time, tap-to-continue) with its own minimal
// styling, so the one-time onboarding cinematic stays untouched and low-risk.
import { useState } from 'react'
import { TweetyBird } from './Tweety'
import { playChirp } from './tweetyData'

const BEATS = ['farewell', 'placing']

export function ReleaseCeremony({ tweety, companionId, onDone }) {
  const [beat, setBeat] = useState(0)
  const name = tweety?.name || 'Tweety'

  function advance() {
    if (beat === 0) {
      playChirp('play')
      setBeat(1)
      return
    }
    onDone()
  }

  const stage = BEATS[beat]

  return (
    <main
      className="release-ceremony"
      role="button"
      tabIndex={0}
      onClick={advance}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') advance() }}
    >
      <div className="release-ceremony-glow" aria-hidden="true" />
      <div className="release-ceremony-card">
        <TweetyBird level="crowned" companion={companionId} size={120} />
        {stage === 'farewell' ? (
          <>
            <p className="release-ceremony-quote">
              "It is time, Agent. You raised me well. I will make my home in your garden now —
              visit me whenever you need reminding that good things grow slowly. 🪶"
            </p>
            <p className="release-ceremony-sign">— {name}</p>
          </>
        ) : (
          <p className="release-ceremony-quote">Time to choose {name}&apos;s spot in the garden 🌳</p>
        )}
        <p className="release-ceremony-hint">Tap to continue ›</p>
      </div>
    </main>
  )
}
