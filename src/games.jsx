// Competitive bird games — a real game-show feel with session codes, synced
// 3-2-1 countdown, per-question timers, speed bonuses and dramatic results.
// Three games: Quiz Battle, Bird Snap, Bird or Bluff.
// (Components only; pure data/helpers live in ./gamesData.)
import { useEffect, useMemo, useState } from 'react'
import {
  getQuizForSession,
  getSnapForSession,
  getBluffForSession,
  generateSessionCode,
  now,
} from './gamesData'

// A re-render tick driven by timestamps, so timers keep running even if the
// app is backgrounded (we always recompute elapsed from now()).
function useTick(active, ms = 150) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const id = window.setInterval(() => force((n) => (n + 1) % 1000000), ms)
    return () => window.clearInterval(id)
  }, [active, ms])
}

function secs(msVal) {
  return Math.round((msVal || 0) / 1000)
}

// ---- 3 - 2 - 1 - GO! --------------------------------------------------------
function CountdownGo({ onGo }) {
  const [start] = useState(() => now())
  useTick(true, 80)
  const elapsed = now() - start
  const step = Math.floor(elapsed / 800) // 0,1,2,3
  useEffect(() => {
    const id = window.setTimeout(onGo, 3300)
    return () => window.clearTimeout(id)
  }, [onGo])
  const label = step >= 3 ? 'GO! 🐦' : String(3 - step)
  return (
    <section className="soft-card full-span countdown-card">
      <p className="eyebrow">Get ready…</p>
      <div className={`countdown-number${step >= 3 ? ' go' : ''}`} key={label}>{label}</div>
      <p className="fine-print">No Googling! 🐦</p>
    </section>
  )
}

// ---- Quiz: 15s/question, +10 correct, +5 if under 5s, timeout = 0 ----------
function QuizGame({ code, onDone }) {
  const questions = useMemo(() => getQuizForSession(code), [code])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null) // null | optionIndex | -2 (timeout)
  const [score, setScore] = useState(0)
  const [start] = useState(() => now())
  const [qStart, setQStart] = useState(() => now())
  useTick(picked === null)

  const q = questions[index]
  const remaining = Math.max(0, 15000 - (now() - qStart))

  function choose(idx, timeout = false) {
    if (picked !== null) return
    const tq = now() - qStart
    const correct = !timeout && idx === q.answer
    const nextScore = score + (correct ? 10 + (tq < 5000 ? 5 : 0) : 0)
    if (correct) setScore(nextScore)
    setPicked(timeout ? -2 : idx)
    window.setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(index + 1)
        setPicked(null)
        setQStart(now())
      } else {
        onDone({ score: nextScore, timeMs: now() - start })
      }
    }, 850)
  }

  // Auto-timeout via the running clock (inside an async callback = lint-safe).
  useEffect(() => {
    if (picked !== null) return undefined
    const id = window.setInterval(() => {
      if (now() - qStart >= 15000) {
        window.clearInterval(id)
        choose(-1, true)
      }
    }, 120)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, picked, qStart])

  const danger = remaining <= 5000
  return (
    <section className="soft-card full-span game-card">
      <div className="game-topbar">
        <span className="eyebrow">Q{index + 1}/{questions.length}</span>
        <span className="game-score">Score {score}</span>
      </div>
      <div className={`timer-bar${danger ? ' danger' : ''}`} aria-hidden="true">
        <span style={{ width: `${(remaining / 15000) * 100}%` }}></span>
      </div>
      <h3 className="quiz-q">{q.q}</h3>
      <div className="quiz-options">
        {q.options.map((opt, idx) => {
          const state =
            picked === null
              ? ''
              : idx === q.answer
                ? ' correct'
                : idx === picked
                  ? ' wrong'
                  : ''
          return (
            <button className={`quiz-option${state}`} type="button" key={opt} onClick={() => choose(idx)}>
              {opt}
            </button>
          )
        })}
      </div>
      {picked === -2 && <p className="timeout-note">Out of time! 0 points ⏱️</p>}
    </section>
  )
}

// ---- Bird Snap: 10 rounds, 8s each, faster correct tap = more points -------
function SnapGame({ code, library, onDone }) {
  const rounds = useMemo(() => getSnapForSession(code, library), [code, library])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null) // null | optionIndex | -2 (timeout)
  const [score, setScore] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const [start] = useState(() => now())
  const [qStart, setQStart] = useState(() => now())
  useTick(picked === null && rounds.length > 0)

  const round = rounds[index]
  const limit = 8000
  const remaining = Math.max(0, limit - (now() - qStart))

  function choose(idx, timeout = false) {
    if (picked !== null || !round) return
    const tq = now() - qStart
    const correct = !timeout && idx === round.answer
    // Base 5 for correct, plus up to +10 speed bonus the quicker she taps.
    const speed = Math.max(0, Math.round((1 - tq / limit) * 10))
    const nextScore = score + (correct ? 5 + speed : 0)
    if (correct) setScore(nextScore)
    setPicked(timeout ? -2 : idx)
    window.setTimeout(() => {
      if (index + 1 < rounds.length) {
        setIndex(index + 1)
        setPicked(null)
        setImgFailed(false)
        setQStart(now())
      } else {
        onDone({ score: nextScore, timeMs: now() - start })
      }
    }, 850)
  }

  useEffect(() => {
    if (picked !== null || !round) return undefined
    const id = window.setInterval(() => {
      if (now() - qStart >= limit) {
        window.clearInterval(id)
        choose(-1, true)
      }
    }, 120)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, picked, qStart, round])

  if (!rounds.length) {
    return (
      <section className="soft-card full-span game-card">
        <p>Not enough bird photos to play Bird Snap yet. 🐦</p>
        <button className="primary-btn" type="button" onClick={() => onDone({ score: 0, timeMs: 0 })}>
          Back
        </button>
      </section>
    )
  }

  const danger = remaining <= 3000
  return (
    <section className="soft-card full-span game-card">
      <div className="game-topbar">
        <span className="eyebrow">Snap {index + 1}/{rounds.length}</span>
        <span className="game-score">Score {score}</span>
      </div>
      <div className={`timer-bar${danger ? ' danger' : ''}`} aria-hidden="true">
        <span style={{ width: `${(remaining / limit) * 100}%` }}></span>
      </div>
      <div className="snap-photo">
        {imgFailed ? (
          <div className="snap-photo-fallback" aria-hidden="true">🐦</div>
        ) : (
          <img src={round.imageUrl} alt="Which bird is this?" onError={() => setImgFailed(true)} />
        )}
      </div>
      <div className="quiz-options snap-options">
        {round.options.map((opt, idx) => {
          const state =
            picked === null
              ? ''
              : idx === round.answer
                ? ' correct'
                : idx === picked
                  ? ' wrong'
                  : ''
          return (
            <button className={`quiz-option${state}`} type="button" key={opt} onClick={() => choose(idx)}>
              {opt}
            </button>
          )
        })}
      </div>
      {picked === -2 && <p className="timeout-note">Too slow! 0 points ⏱️</p>}
    </section>
  )
}

// ---- Bird or Bluff: 15 rounds, 10s each, REAL vs BLUFF ----------------------
function BluffGame({ code, onDone }) {
  const rounds = useMemo(() => getBluffForSession(code), [code])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null) // null | true(real) | false(bluff) | -2 timeout
  const [score, setScore] = useState(0)
  const [start] = useState(() => now())
  const [qStart, setQStart] = useState(() => now())
  useTick(picked === null)

  const round = rounds[index]
  const limit = 10000
  const remaining = Math.max(0, limit - (now() - qStart))

  function answer(choiceReal, timeout = false) {
    if (picked !== null) return
    const tq = now() - qStart
    const correct = !timeout && choiceReal === round.real
    const speed = Math.max(0, Math.round((1 - tq / limit) * 10))
    const nextScore = score + (correct ? 5 + speed : 0)
    if (correct) setScore(nextScore)
    setPicked(timeout ? -2 : choiceReal)
    window.setTimeout(() => {
      if (index + 1 < rounds.length) {
        setIndex(index + 1)
        setPicked(null)
        setQStart(now())
      } else {
        onDone({ score: nextScore, timeMs: now() - start })
      }
    }, 1000)
  }

  useEffect(() => {
    if (picked !== null) return undefined
    const id = window.setInterval(() => {
      if (now() - qStart >= limit) {
        window.clearInterval(id)
        answer(null, true)
      }
    }, 120)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, picked, qStart])

  const revealed = picked !== null
  const danger = remaining <= 3000
  return (
    <section className="soft-card full-span game-card">
      <div className="game-topbar">
        <span className="eyebrow">Fact {index + 1}/{rounds.length}</span>
        <span className="game-score">Score {score}</span>
      </div>
      <div className={`timer-bar${danger ? ' danger' : ''}`} aria-hidden="true">
        <span style={{ width: `${(remaining / limit) * 100}%` }}></span>
      </div>
      <p className="bluff-fact">“{round.text}”</p>
      <div className="bluff-buttons">
        <button
          className={`bluff-btn real${revealed && round.real ? ' correct' : ''}${revealed && picked === true && !round.real ? ' wrong' : ''}`}
          type="button"
          onClick={() => answer(true)}
        >
          ✅ REAL
        </button>
        <button
          className={`bluff-btn bluff${revealed && !round.real ? ' correct' : ''}${revealed && picked === false && round.real ? ' wrong' : ''}`}
          type="button"
          onClick={() => answer(false)}
        >
          🤥 BLUFF
        </button>
      </div>
      {revealed && (
        <p className="bluff-reveal">
          {round.real ? 'That one’s REAL! 🐦' : 'That was a BLUFF! 😂'}
          {picked === -2 ? ' (Out of time)' : ''}
        </p>
      )}
    </section>
  )
}

// ---- Leaderboard ------------------------------------------------------------
function Leaderboard({ games }) {
  const lb = games?.leaderboard || { pooksWins: 0, marnichWins: 0, draws: 0 }
  return (
    <section className="soft-card full-span leaderboard-card">
      <p className="eyebrow">Pooks vs Marnich — all time 🏆</p>
      <div className="leaderboard-row">
        <div className="lb-side pooks"><strong>{lb.pooksWins}</strong><span>Pooks 🐦</span></div>
        <span className="lb-vs">vs</span>
        <div className="lb-side marnich"><strong>{lb.marnichWins}</strong><span>Marnich 😏</span></div>
      </div>
      {lb.draws > 0 && <p className="fine-print">{lb.draws} draw{lb.draws === 1 ? '' : 's'}</p>}
    </section>
  )
}

// ---- Dramatic results -------------------------------------------------------
const GAME_NAMES = { quiz: 'Quiz Battle', snap: 'Bird Snap', bluff: 'Bird or Bluff' }

function ResultsScreen({ games, who, onClose }) {
  const r = games?.lastResult
  const [copied, setCopied] = useState(false)
  if (!r || typeof r === 'string' || !GAME_NAMES[r.game]) {
    return (
      <section className="soft-card full-span">
        <p>Play a game to see the results here.</p>
        <button className="primary-btn" type="button" onClick={onClose}>Back</button>
      </section>
    )
  }
  if (r.status === 'waiting') {
    return (
      <section className="soft-card full-span results-card">
        <div className="results-emoji">⏳</div>
        <h2>Score locked in!</h2>
        <p>Waiting for the other player to finish session <strong>{r.code}</strong>…</p>
        <button className="primary-btn" type="button" onClick={onClose}>Back to menu</button>
      </section>
    )
  }

  const name = GAME_NAMES[r.game] || 'Game'
  const pScore = `${r.pooks?.score ?? 0} pts`
  const mScore = `${r.marnich?.score ?? 0} pts`

  function share() {
    const youWon = r.winner === 'pooks'
    const txt = youWon
      ? `I beat Marnich at ${name} (${pScore}) in ${secs(r.pooks.timeMs)} seconds! 🏆🐦`
      : `Marnich and I battled at ${name} — ${pScore} in ${secs(r.pooks.timeMs)}s. Rematch soon! 🐦`
    try {
      navigator.clipboard.writeText(txt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <section className="soft-card full-span results-card reveal-pop">
      <p className="eyebrow">{name} · session {r.code || ''}</p>
      <div className="results-scores">
        <div className={`results-player${r.winner === 'pooks' ? ' winner' : ''}`}>
          {r.winner === 'pooks' && <div className="crown">👑</div>}
          <span>Pooks 🐦</span>
          <strong>{pScore}</strong>
          <small>{secs(r.pooks.timeMs)}s</small>
        </div>
        <span className="results-vs">vs</span>
        <div className={`results-player${r.winner === 'marnich' ? ' winner' : ''}`}>
          {r.winner === 'marnich' && <div className="crown">👑</div>}
          <span>Marnich 😏</span>
          <strong>{mScore}</strong>
          <small>{secs(r.marnich.timeMs)}s</small>
        </div>
      </div>
      <h2 className="results-text">{r.text}</h2>
      <p className="fine-print">You answered in {secs((who === 'marnich' ? r.marnich : r.pooks).timeMs)} seconds total.</p>
      <div className="button-row">
        <button className="secondary-btn" type="button" onClick={share}>
          {copied ? 'Copied! ✅' : 'Share result 📋'}
        </button>
        <button className="primary-btn" type="button" onClick={onClose}>Play again 🔁</button>
      </div>
    </section>
  )
}

// ---- Hub: lobby → countdown → play → results --------------------------------
export function GamesHub({ data, who, onGameDone }) {
  const [stage, setStage] = useState('menu')
  const [gameType, setGameType] = useState('quiz')
  const [code, setCode] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const games = data.games
  const label = who === 'marnich' ? 'Marnich' : 'Pooks'
  const isPooks = who === 'pooks'

  function pick(type) {
    setGameType(type)
    setCode(isPooks ? generateSessionCode() : '')
    setCodeInput('')
    setStage('lobby')
  }
  function begin() {
    if (!isPooks) setCode(codeInput)
    setStage('countdown')
  }
  function handleDone(result) {
    onGameDone(gameType, who, { ...result, code })
    setStage('result')
  }

  if (stage === 'countdown') {
    return (
      <div className="page-grid games-page">
        <CountdownGo onGo={() => setStage('play')} />
      </div>
    )
  }
  if (stage === 'play') {
    return (
      <div className="page-grid games-page">
        {gameType === 'quiz' && <QuizGame code={code} onDone={handleDone} />}
        {gameType === 'snap' && (
          <SnapGame code={code} library={data.birdLibrary} onDone={handleDone} />
        )}
        {gameType === 'bluff' && <BluffGame code={code} onDone={handleDone} />}
      </div>
    )
  }
  if (stage === 'result') {
    return (
      <div className="page-grid games-page">
        <ResultsScreen games={games} who={who} onClose={() => setStage('menu')} />
      </div>
    )
  }
  if (stage === 'lobby') {
    return (
      <div className="page-grid games-page">
        <section className="soft-card full-span lobby-card">
          <p className="eyebrow">{GAME_NAMES[gameType]} · session</p>
          {isPooks ? (
            <>
              <h2>Share this code with Marnich on WhatsApp 📲</h2>
              <div className="session-code">{code}</div>
              <p className="fine-print">He enters it on his own Games screen. Same questions, same order — no Googling! 🐦</p>
            </>
          ) : (
            <>
              <h2>Enter the code Pooks shared 🔢</h2>
              <input
                className="code-entry"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4823"
                inputMode="numeric"
              />
              <p className="fine-print">No Googling! 🐦</p>
            </>
          )}
          <div className="button-row">
            <button
              className="primary-btn big-btn"
              type="button"
              disabled={!isPooks && codeInput.length !== 4}
              onClick={begin}
            >
              Ready — start! 🐦
            </button>
            <button className="ghost-btn" type="button" onClick={() => setStage('menu')}>Cancel</button>
          </div>
        </section>
      </div>
    )
  }

  // menu
  return (
    <div className="page-grid games-page">
      <section className="soft-card full-span">
        <p className="eyebrow">Bird Date Games 🎮</p>
        <h2>{label}, pick your battle</h2>
        {isPooks && games?.trashTalk && (
          <p className="trash-talk">Marnich says: {games.trashTalk} 😏</p>
        )}
        <p className="fine-print">Timed, head-to-head, no excuses. Winner takes 25 coins, 10 for playing. 🏆</p>
        <div className="game-menu">
          <button className="primary-btn big-btn" type="button" onClick={() => pick('quiz')}>Quiz Battle ⏱️</button>
          <button className="secondary-btn big-btn" type="button" onClick={() => pick('snap')}>Bird Snap 📸</button>
          <button className="secondary-btn big-btn" type="button" onClick={() => pick('bluff')}>Bird or Bluff 🤥</button>
        </div>
      </section>
      <Leaderboard games={games} />
      {games?.lastResult && typeof games.lastResult === 'object' && games.lastResult.status === 'done' && (
        <ResultsScreen games={games} who={who} onClose={() => setStage('menu')} />
      )}
    </div>
  )
}
