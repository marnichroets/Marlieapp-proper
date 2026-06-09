// Competitive bird games — components only (data/helpers live in ./gamesData).
import { useEffect, useMemo, useState } from 'react'
import {
  getDailyQuiz,
  getDailyWord,
  evaluateGuess,
  TWENTYQ_QUESTIONS,
  answer20Q,
} from './gamesData'

function QuizGame({ onDone }) {
  const questions = useMemo(() => getDailyQuiz(), [])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState(null)
  const q = questions[index]

  function choose(idx) {
    if (picked !== null) return
    setPicked(idx)
    const correct = idx === q.answer
    const nextScore = score + (correct ? 1 : 0)
    if (correct) setScore(nextScore)
    window.setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(index + 1)
        setPicked(null)
      } else {
        onDone(nextScore)
      }
    }, 750)
  }

  return (
    <div className="game-quiz">
      <p className="eyebrow">Question {index + 1} / {questions.length} · Score {score}</p>
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
            <button
              className={`quiz-option${state}`}
              type="button"
              key={opt}
              onClick={() => choose(idx)}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WordleGame({ onDone }) {
  const word = useMemo(() => getDailyWord(), [])
  const len = word.length
  const max = 6
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const solved = guesses.some((g) => g.guess === word)
  const done = solved || guesses.length >= max

  function submit(event) {
    event.preventDefault()
    const g = current.toUpperCase().replace(/[^A-Z]/g, '')
    if (g.length !== len || done) return
    const next = [...guesses, { guess: g, result: evaluateGuess(g, word) }]
    setGuesses(next)
    setCurrent('')
    if (g === word) onDone({ guesses: next.length, solved: true })
    else if (next.length >= max) onDone({ guesses: max + 1, solved: false })
  }

  return (
    <div className="game-wordle">
      <p className="eyebrow">Today&apos;s {len}-letter SA bird · {max} guesses</p>
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
          <button className="primary-btn" type="submit" disabled={current.length !== len}>
            Guess
          </button>
        </form>
      )}
      {done && (
        <p className="wordle-result">
          {solved ? `Solved in ${guesses.length}! 🎯` : `The bird was ${word}. Next time! 🐦`}
        </p>
      )}
    </div>
  )
}

function TwentyQGame({ library, onDone }) {
  const [target, setTarget] = useState(null)
  const [asked, setAsked] = useState([])
  const [phase, setPhase] = useState('ask')
  const [options, setOptions] = useState([])

  // Pick a random target once on mount (randomness kept out of render).
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        setTarget(library[Math.floor(Math.random() * library.length)] || library[0])
      }
    })
    return () => {
      cancelled = true
    }
  }, [library])

  if (!target) return <p className="fine-print">Thinking of a bird… 🐦</p>

  function ask(question) {
    if (asked.some((a) => a.id === question.id)) return
    setAsked([...asked, { ...question, ans: answer20Q(target, question.id) }])
  }

  function startGuess() {
    const decoys = library
      .filter((b) => b.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    setOptions([target, ...decoys].sort(() => Math.random() - 0.5))
    setPhase('guess')
  }

  function guess(bird) {
    onDone({ questions: asked.length, won: bird.id === target.id, target })
  }

  const remaining = TWENTYQ_QUESTIONS.filter((q) => !asked.some((a) => a.id === q.id))

  return (
    <div className="game-twentyq">
      <p className="eyebrow">I&apos;m thinking of a SA bird. Ask yes/no questions — fewer = more coins.</p>
      <p className="twentyq-count">Questions asked: {asked.length}</p>
      {asked.length > 0 && (
        <div className="twentyq-log">
          {asked.map((a) => (
            <p key={a.id}>
              {a.label} <strong>{a.ans ? 'Yes ✅' : 'No ❌'}</strong>
            </p>
          ))}
        </div>
      )}
      {phase === 'ask' ? (
        <>
          <div className="twentyq-cards">
            {remaining.map((q) => (
              <button className="secondary-btn" type="button" key={q.id} onClick={() => ask(q)}>
                {q.label}
              </button>
            ))}
          </div>
          <button className="primary-btn wide" type="button" onClick={startGuess}>
            I&apos;m ready to guess! 🐦
          </button>
        </>
      ) : (
        <div className="twentyq-guess">
          <p className="eyebrow">Which bird is it?</p>
          {options.map((b) => (
            <button className="secondary-btn wide" type="button" key={b.id} onClick={() => guess(b)}>
              {b.commonName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Leaderboard({ games }) {
  const lb = games?.leaderboard || { pooksWins: 0, marnichWins: 0, draws: 0 }
  return (
    <section className="soft-card full-span leaderboard-card">
      <p className="eyebrow">Pooks vs Marnich — all time 🏆</p>
      <div className="leaderboard-row">
        <div className="lb-side pooks">
          <strong>{lb.pooksWins}</strong>
          <span>Pooks 🐦</span>
        </div>
        <span className="lb-vs">vs</span>
        <div className="lb-side marnich">
          <strong>{lb.marnichWins}</strong>
          <span>Marnich 😏</span>
        </div>
      </div>
      {lb.draws > 0 && <p className="fine-print">{lb.draws} draw{lb.draws === 1 ? '' : 's'}</p>}
      {games?.lastResult && <p className="leaderboard-last">{games.lastResult}</p>}
    </section>
  )
}

// Shared games hub used by both Pooks (who='pooks') and Admin (who='marnich').
export function GamesHub({ data, who, onQuizDone, onWordleDone, on20QDone }) {
  const [tab, setTab] = useState('menu')
  const games = data.games
  const label = who === 'marnich' ? 'Marnich' : 'Pooks'

  return (
    <div className="page-grid games-page">
      <section className="soft-card full-span">
        <p className="eyebrow">Bird Date Games 🎮</p>
        <h2>{label}, pick your battle</h2>
        {who === 'pooks' && games?.trashTalk && (
          <p className="trash-talk">Marnich says: {games.trashTalk} 😏</p>
        )}
        <div className="store-tabs">
          {[
            ['menu', 'Menu'],
            ['quiz', 'Quiz Battle'],
            ['wordle', 'Wordle'],
            ['twentyq', '20 Questions'],
          ].map(([id, name]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {tab === 'menu' && <Leaderboard games={games} />}

      {tab === 'quiz' && (
        <section className="soft-card full-span">
          <QuizGame onDone={(score) => onQuizDone(who, score)} />
        </section>
      )}
      {tab === 'wordle' && (
        <section className="soft-card full-span">
          <WordleGame onDone={(result) => onWordleDone(who, result)} />
        </section>
      )}
      {tab === 'twentyq' && (
        <section className="soft-card full-span">
          <TwentyQGame
            library={data.birdLibrary}
            onDone={(result) => on20QDone(who, result)}
          />
        </section>
      )}
    </div>
  )
}
