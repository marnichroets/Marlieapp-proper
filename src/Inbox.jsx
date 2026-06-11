// Inbox / Messages UI — a cute parchment letterbox for Pooks.
import { useState } from 'react'
import { REACTIONS, relativeMessageTime } from './messages'

function previewOf(body, n = 90) {
  const text = String(body || '')
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text
}

export function InboxPage({ messages = [], onRead, onToggleFavourite, onReact }) {
  const [openId, setOpenId] = useState(null)
  const sorted = [...messages].sort((a, b) => new Date(b.date) - new Date(a.date))
  const open = sorted.find((m) => m.id === openId) || null

  function openMessage(message) {
    setOpenId(message.id)
    if (!message.read) onRead(message.id)
  }

  if (open) {
    return (
      <div className="page-grid inbox-page">
        <section className="soft-card full-span message-detail" key={open.id}>
          <button className="text-btn back-btn" type="button" onClick={() => setOpenId(null)}>
            ← Back to inbox
          </button>
          <div className={`message-letter message-${open.type}`}>
            <div className="message-letter-head">
              <span className="message-avatar" aria-hidden="true">{open.icon}</span>
              <div>
                <p className="message-sender">{open.sender}</p>
                <p className="fine-print">{new Date(open.date).toLocaleString('en-ZA', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}</p>
              </div>
              <button
                className={`star-btn${open.favourite ? ' on' : ''}`}
                type="button"
                aria-label={open.favourite ? 'Unfavourite' : 'Save as favourite'}
                onClick={() => onToggleFavourite(open.id)}
              >
                {open.favourite ? '⭐' : '☆'}
              </button>
            </div>
            <h2 className="message-title">{open.title}</h2>
            <p className="message-body">{open.body}</p>

            {open.type === 'marnich' && (
              <div className="message-reactions">
                <p className="fine-print">Send Marnich a little reaction:</p>
                <div className="reaction-row">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`reaction-btn${open.reaction === r ? ' chosen' : ''}`}
                      onClick={() => onReact(open.id, r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {open.reaction && (
                  <p className="reaction-confirm">You reacted {open.reaction} — Marnich can see it 💛</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid inbox-page">
      <section className="soft-card full-span">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your letterbox</p>
            <h2>Messages 📬</h2>
          </div>
          <span className="status-pill">{sorted.filter((m) => !m.read).length} unread</span>
        </div>

        {sorted.length === 0 ? (
          <div className="inbox-empty">
            <span className="inbox-empty-icon" aria-hidden="true">📭</span>
            <p>The Bird Council postal service is preparing your first dispatch 🪶</p>
          </div>
        ) : (
          <ul className="message-list">
            {sorted.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`message-row message-${m.type}${m.read ? '' : ' unread'}`}
                  onClick={() => openMessage(m)}
                >
                  <span className="message-avatar" aria-hidden="true">{m.icon}</span>
                  <span className="message-row-main">
                    <span className="message-row-top">
                      <span className="message-sender">{m.sender}</span>
                      <span className="message-time">{relativeMessageTime(m.date)}</span>
                    </span>
                    <span className="message-row-title">
                      {m.favourite && <span aria-hidden="true">⭐ </span>}
                      {m.title}
                    </span>
                    <span className="message-row-preview">{previewOf(m.body)}</span>
                    {m.reaction && (
                      <span className="message-row-reaction">You reacted {m.reaction}</span>
                    )}
                  </span>
                  {!m.read && <span className="unread-dot" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
