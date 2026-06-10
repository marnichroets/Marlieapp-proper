// Competitive bird games — a real game-show feel with session codes, synced
// 3-2-1 countdown, per-question timers, speed bonuses and dramatic results.
// (Components only; pure data/helpers live in ./gamesData.)
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getQuizForSession,
  getWordForSession,
  evaluateGuess,
  TWENTYQ_QUESTIONS,
  answer20Q,
  getTwentyQIndex,
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

// ---- Wordle: 3-minute total clock ------------------------------------------
function WordleGame({ code, onDone }) {
  const word = useMemo(() => getWordForSession(code), [code])
  const len = word.length
  const max = 6
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [start] = useState(() => now())
  const doneRef = useRef(false)
  useTick(true, 250)

  const remaining = Math.max(0, 180000 - (now() - start))
  const solved = guesses.some((g) => g.guess === word)

  function finish(didSolve, count) {
    if (doneRef.current) return
    doneRef.current = true
    onDone({ guesses: didSolve ? count : max + 1, solved: didSolve, timeMs: now() - start })
  }

  useEffect(() => {
    if (solved) finish(true, guesses.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (now() - start >= 180000) {
        window.clearInterval(id)
        finish(false, guesses.length)
      }
    }, 300)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submit(event) {
    event.preventDefault()
    const g = current.toUpperCase().replace(/[^A-Z]/g, '')
    if (g.length !== len || solved || guesses.length >= max) return
    const next = [...guesses, { guess: g, result: evaluateGuess(g, word) }]
    setGuesses(next)
    setCurrent('')
    if (g === word) finish(true, next.length)
    else if (next.length >= max) finish(false, next.length)
  }

  const mm = Math.floor(remaining / 60000)
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
  const done = solved || guesses.length >= max || remaining <= 0
  return (
    <section className="soft-card full-span game-card">
      <div className="game-topbar">
        <span className="eyebrow">{len}-letter SA bird · {max} guesses</span>
        <span className={`game-clock${remaining < 30000 ? ' danger' : ''}`}>⏱️ {mm}:{ss}</span>
      </div>
      <div className="wordle-grid">
        {guesses.map((row, r) => (
          <div className="wordle-row" key={r}>
            {row.guess.split('').map((ch, c) => (
              <span className={`wordle-cell ${row.result[c]}`} key={c}>{ch}</span>
            ))}
          </div>
        ))}
      </div>
      {!done && (
        <form onSubmit={submit} className="wordle-form">
          <input
            value={current}
            onChange={(e) => setCurrent(e.target.value.toUpperCase().slice(0, len))}
            maxLength={len}
            placeholder={`${len} letters`}
            autoCapitalize="characters"
          />
          <button className="primary-btn" type="submit" disabled={current.length !== len}>Guess</button>
        </form>
      )}
      {done && (
        <p className="wordle-result">{solved ? `Solved in ${guesses.length}! 🎯` : `The bird was ${word}. 🐦`}</p>
      )}
    </section>
  )
}

// ---- 20 Questions: 30s/question pressure, same target from the code --------
function TwentyQGame({ code, library, onDone }) {
  const target = useMemo(() => library[getTwentyQIndex(code, library.length)] || library[0], [code, library])
  const [asked, setAsked] = useState([])
  const [phase, setPhase] = useState('ask')
  const [options, setOptions] = useState([])
  const [start] = useState(() => now())
  const [qStart, setQStart] = useState(() => now())
  useTick(phase === 'ask', 200)

  const remaining = Math.max(0, 30000 - (now() - qStart))
  const danger = remaining <= 8000

  function ask(question) {
    if (asked.some((a) => a.id === question.id)) return
    setAsked([...asked, { ...question, ans: answer20Q(target, question.id) }])
    setQStart(now())
  }
  function startGuess() {
    const order = (getTwentyQIndex(code, 997) % 7) + 1
    const decoys = library
      .filter((b) => b.id !== target.id)
      .filter((_, i) => i % order === 0)
      .slice(0, 3)
    const opts = [target, ...decoys]
    setOptions(opts.map((b, i) => opts[(i + order) % opts.length]))
    setPhase('guess')
  }
  function guess(bird) {
    onDone({ questions: asked.length, won: bird.id === target.id, timeMs: now() - start, targetName: target.commonName })
  }

  const remainingQ = TWENTYQ_QUESTIONS.filter((q) => !asked.some((a) => a.id === q.id))
  return (
    <section className="soft-card full-span game-card">
      <div className="game-topbar">
        <span className="eyebrow">Questions: {asked.length}</span>
        <span className="game-score">Fewer = more coins</span>
      </div>
      {phase === 'ask' && (
        <div className={`timer-bar${danger ? ' danger' : ''}`} aria-hidden="true">
          <span style={{ width: `${(remaining / 30000) * 100}%` }}></span>
        </div>
      )}
      {asked.length > 0 && (
        <div className="twentyq-log">
          {asked.map((a) => (
            <p key={a.id}>{a.label} <strong>{a.ans ? 'Yes ✅' : 'No ❌'}</strong></p>
          ))}
        </div>
      )}
      {phase === 'ask' ? (
        <>
          <div className="twentyq-cards">
            {remainingQ.map((q) => (
              <button className="secondary-btn" type="button" key={q.id} onClick={() => ask(q)}>{q.label}</button>
            ))}
          </div>
          <button className="primary-btn wide" type="button" onClick={startGuess}>I&apos;m ready to guess! 🐦</button>
        </>
      ) : (
        <div className="twentyq-guess">
          <p className="eyebrow">Which bird is it?</p>
          {options.map((b) => (
            <button className="secondary-btn wide" type="button" key={b.id} onClick={() => guess(b)}>{b.commonName}</button>
          ))}
        </div>
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
const GAME_NAMES = { quiz: 'Bird Quiz', wordle: 'Bird Wordle', twentyq: '20 Questions' }

function ResultsScreen({ games, who, onClose }) {
  const r = games?.lastResult
  const [copied, setCopied] = useState(false)
  if (!r || typeof r === 'string') {
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
  const pScore = r.wordle ? `${r.pooks.solved ? r.pooks.guesses : 'X'} guesses` : r.twentyq ? `${r.pooks.questions} Qs` : `${r.pooks.score}/${(r.maxScore || 1) * 10}`
  const mScore = r.wordle ? `${r.marnich.solved ? r.marnich.guesses : 'X'} guesses` : r.twentyq ? `${r.marnich.questions} Qs` : `${r.marnich.score}/${(r.maxScore || 1) * 10}`

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
export function GamesHub({ data, who, onQuizDone, onWordleDone, on20QDone }) {
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
    const payload = { ...result, code }
    if (gameType === 'quiz') onQuizDone(who, payload)
    else if (gameType === 'wordle') onWordleDone(who, payload)
    else on20QDone(who, payload)
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
        {gameType === 'wordle' && <WordleGame code={code} onDone={handleDone} />}
        {gameType === 'twentyq' && (
          <TwentyQGame code={code} library={data.birdLibrary} onDone={handleDone} />
        )}
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
              <p className="fine-print">He enters it in Admin → Play Date Game. Same questions, same order — no Googling! 🐦</p>
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
        <p className="fine-print">Timed, head-to-head, no excuses. Loser drops 50 coins. 🏆</p>
        <div className="game-menu">
          <button className="primary-btn big-btn" type="button" onClick={() => pick('quiz')}>Quiz Battle ⏱️</button>
          <button className="secondary-btn big-btn" type="button" onClick={() => pick('wordle')}>Bird Wordle 🎯</button>
          <button className="secondary-btn big-btn" type="button" onClick={() => pick('twentyq')}>20 Questions 🐦</button>
        </div>
      </section>
      <Leaderboard games={games} />
      {games?.lastResult && typeof games.lastResult === 'object' && games.lastResult.status === 'done' && (
        <ResultsScreen games={games} who={who} onClose={() => setStage('menu')} />
      )}
    </div>
  )
}
