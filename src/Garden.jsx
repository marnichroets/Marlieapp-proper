// Bird Garden — Phase 1 UI (sandbox-only; gating + handlers live in App.jsx).
// An illustrated SVG scene that starts almost empty. She buys a seed from the
// shop, it sprouts on the lawn, and she taps the plant to water it once a day;
// it grows through visible stages into a permanent plant. Pure presentation +
// the onBuy/onWater callbacks — it reads/writes only the `garden` slice.
import { useState } from 'react'
import {
  GARDEN_SHOP,
  gardenItem,
  plantStageKey,
  isFullyGrown,
  wateredToday,
  STAGE_LABELS,
} from './gardenData'
import { saDateKey } from './saDate'

// Fixed lawn slots the plantings occupy, left → right.
const SLOTS = [58, 116, 174, 232, 290, 344]
const BASE_Y = 202

// ---- plant artwork (drawn with its base at the origin, growing upward) ------
function TreeGraphic({ stageKey }) {
  if (stageKey === 'seedling') {
    return (
      <g>
        <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" />
        <path d="M0 -1 V-9" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="-3.4" cy="-9" rx="3" ry="1.5" fill="#5aa861" transform="rotate(-28 -3.4 -9)" />
        <ellipse cx="3.4" cy="-9" rx="3" ry="1.5" fill="#5aa861" transform="rotate(28 3.4 -9)" />
      </g>
    )
  }
  if (stageKey === 'sapling') {
    return (
      <g>
        <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" />
        <rect x="-1.5" y="-22" width="3" height="22" rx="1.5" fill="#9c6f44" />
        <circle cx="0" cy="-25" r="10" fill="#5aa861" />
        <circle cx="-4" cy="-27" r="6" fill="#6cb86f" />
      </g>
    )
  }
  if (stageKey === 'young') {
    return (
      <g>
        <ellipse cx="0" cy="0" rx="10" ry="3.4" fill="#7a5a3a" />
        <rect x="-2.5" y="-34" width="5" height="34" rx="2" fill="#9c6f44" />
        <circle cx="0" cy="-38" r="16" fill="#4f9a55" />
        <circle cx="-7" cy="-40" r="9" fill="#5aa861" />
      </g>
    )
  }
  // full tree
  return (
    <g>
      <ellipse cx="0" cy="0" rx="12" ry="4" fill="#7a5a3a" />
      <rect x="-3.5" y="-44" width="7" height="44" rx="3" fill="#9c6f44" />
      <ellipse cx="0" cy="-50" rx="24" ry="20" fill="#4f9a55" />
      <ellipse cx="-14" cy="-46" rx="14" ry="12" fill="#5aa861" />
      <ellipse cx="14" cy="-46" rx="13" ry="11" fill="#46894c" />
    </g>
  )
}

function FlowerGraphic({ stageKey }) {
  if (stageKey === 'sprout') {
    return (
      <g>
        <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" />
        <path d="M0 -1 V-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="-2.6" cy="-11" rx="3" ry="1.5" fill="#6cb86f" transform="rotate(-30 -2.6 -11)" />
        <ellipse cx="2.6" cy="-11" rx="3" ry="1.5" fill="#6cb86f" transform="rotate(30 2.6 -11)" />
      </g>
    )
  }
  if (stageKey === 'budding') {
    const stems = [[-6, -16], [0, -20], [6, -15]]
    return (
      <g>
        <ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />
        {stems.map(([x, y], i) => (
          <g key={i}>
            <line x1={x} y1="0" x2={x} y2={y} stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />
            <circle cx={x} cy={y} r="2.6" fill="#9ccb6f" />
          </g>
        ))}
      </g>
    )
  }
  // bloom
  const flowers = [[-7, -18, '#f6a5c0'], [0, -22, '#ffd45e'], [7, -17, '#c9a8e8']]
  return (
    <g>
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />
      {flowers.map(([x, y, colour], i) => (
        <g key={i}>
          <line x1={x} y1="0" x2={x} y2={y} stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />
          <circle cx={x} cy={y} r="4" fill={colour} />
          <circle cx={x} cy={y} r="1.6" fill="#ffd45e" />
        </g>
      ))}
    </g>
  )
}

function PlantGraphic({ type, stageKey }) {
  return type === 'tree-seed'
    ? <TreeGraphic stageKey={stageKey} />
    : <FlowerGraphic stageKey={stageKey} />
}

// ---- the page --------------------------------------------------------------
export function GardenPage({ garden, coins, onBuy, onWater, onBack }) {
  const plantings = garden?.plantings || []
  const [selectedId, setSelectedId] = useState(null)
  const today = saDateKey()
  const unlocked = GARDEN_SHOP.filter((i) => (garden?.shopUnlocked || []).includes(i.id))
  const selected = plantings.find((p) => p.id === selectedId) || null

  return (
    <div className="page-grid garden-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">Sandbox · Bird Garden 🌳🧪</p>
        <h2>Pooks&apos; Bird Garden</h2>
        <p className="fine-print">
          Plant a seed, then tap it once a day to water it and watch it grow. Sandbox-only — never shown to Pooks. · 🪙 {coins}
        </p>
      </section>

      <section className="soft-card full-span garden-scene-card">
        <svg className="garden-scene-svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pooks' bird garden">
          <defs>
            <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bfe6f2" />
              <stop offset="1" stopColor="#e8f5dc" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="400" height="260" fill="url(#gardenSky)" />
          <circle cx="338" cy="48" r="22" fill="#ffe07a" />
          <g fill="#ffffff" opacity="0.9">
            <ellipse cx="78" cy="44" rx="22" ry="11" />
            <ellipse cx="100" cy="48" rx="16" ry="9" />
          </g>
          {/* rolling hills + lawn */}
          <path d="M0 150 q70 -30 160 -12 q90 18 240 -8 V260 H0 Z" fill="#cfe9b6" />
          <path d="M0 188 q110 -22 210 -2 q110 16 190 -6 V260 H0 Z" fill="#8ccb6f" />

          {/* plantings */}
          {plantings.map((p, i) => {
            const x = SLOTS[i % SLOTS.length]
            const isSel = p.id === selectedId
            const thirsty = !isFullyGrown(p) && !wateredToday(p, today)
            return (
              <g
                key={p.id}
                className="garden-plant"
                transform={`translate(${x} ${BASE_Y})`}
                onClick={() => setSelectedId(p.id)}
              >
                {isSel && <ellipse cx="0" cy="3" rx="20" ry="6" fill="#ffe07a" opacity="0.55" />}
                <PlantGraphic type={p.type} stageKey={plantStageKey(p)} />
                {/* a little droplet hint when it's thirsty today */}
                {thirsty && <text className="garden-thirsty" x="0" y="-60" textAnchor="middle">💧</text>}
                {/* generous transparent tap target so tiny seedlings are easy to hit */}
                <rect x="-24" y="-64" width="48" height="70" fill="transparent" />
              </g>
            )
          })}

          {plantings.length === 0 && (
            <text x="200" y="150" textAnchor="middle" className="garden-empty-hint">
              Your garden is empty — plant a seed below 🌱
            </text>
          )}
        </svg>
      </section>

      {selected && (() => {
        const item = gardenItem(selected.type)
        const grown = isFullyGrown(selected)
        const watered = wateredToday(selected, today)
        return (
          <section className="soft-card full-span garden-detail">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{item.emoji} {item.name}</p>
                <h3>{STAGE_LABELS[plantStageKey(selected)]}</h3>
              </div>
              <button className="text-btn" type="button" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <div className="garden-progress" aria-hidden="true">
              {Array.from({ length: item.waterToGrow }).map((_, i) => (
                <span key={i} className={i < selected.wateredDays ? 'on' : ''} />
              ))}
            </div>
            {grown ? (
              <p className="fine-print">Fully grown 🌳 — it&apos;s now a permanent part of the garden.</p>
            ) : watered ? (
              <>
                <p className="fine-print">Watered {selected.wateredDays}/{item.waterToGrow} days.</p>
                <button className="secondary-btn" type="button" disabled>Watered today 💧 — back tomorrow</button>
              </>
            ) : (
              <>
                <p className="fine-print">Watered {selected.wateredDays}/{item.waterToGrow} days. It&apos;s thirsty!</p>
                <button className="primary-btn" type="button" onClick={() => onWater(selected.id)}>💧 Water</button>
              </>
            )}
          </section>
        )
      })()}

      <section className="soft-card full-span garden-shop">
        <p className="eyebrow">Garden shop 🌱</p>
        <div className="garden-shop-row">
          {unlocked.map((item) => {
            const afford = coins >= item.cost
            return (
              <button
                key={item.id}
                className="garden-shop-btn"
                type="button"
                disabled={!afford}
                onClick={() => onBuy(item.id)}
              >
                <span className="garden-shop-emoji">{item.emoji}</span>
                <strong>{item.name}</strong>
                <small>{item.cost} 🪙</small>
              </button>
            )
          })}
        </div>
        <p className="fine-print">Tip: use Fast Forward ⏩ (in the sandbox mode bar) to jump a day and water again while testing.</p>
      </section>
    </div>
  )
}
