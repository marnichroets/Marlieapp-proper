// The Greenhouse — a cosy indoor space, separate from the outdoor Garden,
// where Pooks grows potted plants from her identified species. Two fixed
// shelves (top: slots 0-3, unlocked from the start; bottom potting bench:
// slots 4-7, unlocked from the shop). Pure presentation + on*/callbacks
// operating on the `greenhouse` slice only — all the care-loop maths (stage,
// health, streak, rewards) lives in greenhouseData.js.
import { useEffect, useState } from 'react'
import {
  POT_SLOTS,
  BASE_SLOTS,
  MAX_SLOTS,
  SLOT_COST,
  POT_STYLES,
  TOOLS,
  STAGE_SIZE,
  STAGE_LABELS,
  potStageKey,
  hasTool,
  ownedToolUses,
  wateredToday,
  canWaterPot,
  canMistPot,
  computeHealth,
  healthTier,
} from './greenhouseData'
import { plantVisual } from './gardenData'
import { saDateKey } from './saDate'
import { GardenPlant } from './plantTemplates'

// CSS filters standing in for the four health tiers — vibrant needs none,
// each tier below that gets progressively more desaturated/browned rather
// than swapping in separate art, so every species (any template/colour)
// reads consistently "unwell" without needing its own sick/dead variant.
const HEALTH_FILTER = {
  vibrant: 'none',
  wilted: 'saturate(0.55) brightness(0.97)',
  sick: 'saturate(0.22) sepia(0.35) brightness(0.82)',
  dead: 'grayscale(0.9) sepia(0.35) brightness(0.55)',
}

// ---- pot vessels (cosmetic, per style) -------------------------------------
// Drawn in local coordinates: rim at (0,0), base at (0,+18) — the plant's
// foreignObject anchors from the same origin, so every style lines up
// without needing its own offset math.
function PotVessel({ style }) {
  switch (style) {
    case 'wooden-barrel':
      return (
        <g>
          <path d="M-14 0 L14 0 L12 18 L-12 18 Z" fill="#b98a52" stroke="#7c5a34" strokeWidth="1.6" />
          <rect x="-13.5" y="4" width="27" height="2" fill="#6b4a2a" opacity="0.8" />
          <rect x="-12.5" y="12" width="25" height="2" fill="#6b4a2a" opacity="0.8" />
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#c9975e" stroke="#7c5a34" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="10.5" ry="2.6" fill="#5a3f22" opacity="0.6" />
        </g>
      )
    case 'ceramic':
      return (
        <g>
          <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="#f5f0e6" stroke="#cfc6b8" strokeWidth="1.6" />
          <path d="M-13 7 L12 7" stroke="#6a92c9" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#fffdf8" stroke="#cfc6b8" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="10.5" ry="2.6" fill="#7a3c22" opacity="0.5" />
        </g>
      )
    case 'painted':
      return (
        <g>
          <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="#93a67c" stroke="#657450" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#a8ba90" stroke="#657450" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="10.5" ry="2.6" fill="#7a3c22" opacity="0.5" />
        </g>
      )
    case 'gold-trim':
      return (
        <g>
          <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="#c96f4a" stroke="#a1512f" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#e0855c" stroke="#d4af37" strokeWidth="2" />
          <ellipse cx="0" cy="0" rx="10.5" ry="2.6" fill="#7a3c22" opacity="0.6" />
        </g>
      )
    case 'macrame':
      return (
        <g>
          <line x1="-9" y1="-2" x2="-5" y2="-24" stroke="#c9a877" strokeWidth="1.4" />
          <line x1="9" y1="-2" x2="5" y2="-24" stroke="#c9a877" strokeWidth="1.4" />
          <circle cx="0" cy="-25" r="1.8" fill="#c9a877" />
          <path d="M-11 -2 Q0 6 11 -2 L9 8 Q0 12 -9 8 Z" fill="#d9c39a" stroke="#a98a5c" strokeWidth="1.4" />
          <ellipse cx="0" cy="-2" rx="10.5" ry="3.2" fill="#7a3c22" opacity="0.55" />
        </g>
      )
    default: // terracotta
      return (
        <g>
          <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="#c96f4a" stroke="#a1512f" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="14" ry="4" fill="#e0855c" stroke="#a1512f" strokeWidth="1.6" />
          <ellipse cx="0" cy="0" rx="10.5" ry="2.6" fill="#7a3c22" opacity="0.6" />
        </g>
      )
  }
}

// A brief blue droplet falling from above the pot into a small splash —
// removed from state ~700ms after it's added (see GreenhousePage).
function WaterDrop() {
  return (
    <g className="gh-waterdrop">
      <ellipse className="gh-waterdrop-fall" cx="0" cy="-6" rx="3" ry="4" fill="#5fb8e0" />
      <g className="gh-waterdrop-splash">
        {[-6, 0, 6].map((dx) => (
          <circle key={dx} cx={dx} cy="1" r="1.6" fill="#8fd4ee" />
        ))}
      </g>
    </g>
  )
}

// Species-accurate at every stage (not just bloom): plantVisual resolves the
// same template/zones/variation the outdoor Garden uses for this species
// (see Garden.jsx), just re-sized per growth stage and re-coloured per
// health tier via a CSS filter on the wrapping div — no separate sick/dead
// art needed.
function PottedPlantArt({ pot, today }) {
  const stage = potStageKey(pot)
  const tier = pot.dead ? 'dead' : healthTier(computeHealth(pot, today))
  const { template, zones, variation, scale } = plantVisual(pot.plantName, pot.family)
  const size = STAGE_SIZE[stage] * (scale ?? 1)
  return (
    <>
      <PotVessel style={pot.potStyle} />
      <foreignObject
        x={-size / 2}
        y={-size * 1.22}
        width={size}
        height={size * 1.3}
        style={{ overflow: 'visible' }}
      >
        <div style={{ width: '100%', height: '100%', filter: HEALTH_FILTER[tier] }}>
          <GardenPlant template={template} zones={zones} size={size} variation={variation} flowering={stage === 'blooming'} />
        </div>
      </foreignObject>
    </>
  )
}

function PotBadges({ pot, tier, today }) {
  const badges = []
  if (!pot.dead) {
    if (wateredToday(pot, today)) badges.push('💧')
    if (pot.needsTrimming) badges.push('✂️')
    if (tier === 'sick') badges.push('⚠️')
  }
  if (!badges.length) return null
  return (
    <g transform="translate(20 -4)">
      {badges.map((emoji, i) => (
        <g key={emoji} transform={`translate(0 ${i * -16})`}>
          <circle r="7.5" fill="#fffdf7" stroke="var(--line)" strokeWidth="1" />
          <text x="0" y="3" textAnchor="middle" fontSize="9">{emoji}</text>
        </g>
      ))}
    </g>
  )
}

function EmptySlotArt({ locked }) {
  if (locked) {
    return <text x="0" y="4" textAnchor="middle" fontSize="16">🔒</text>
  }
  return (
    <g>
      <ellipse cx="0" cy="0" rx="14" ry="4" fill="none" stroke="#a1512f" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.45" />
      <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="none" stroke="#a1512f" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.3" />
      <text x="0" y="10" textAnchor="middle" fontSize="14" fill="#a1512f" opacity="0.55">+</text>
    </g>
  )
}

function GreenhouseScene({ greenhouse, waterAnims, activeSlotId, onTapSlot }) {
  const growLight = hasTool(greenhouse, 'grow-light')
  const today = saDateKey()
  const unlockedSlots = greenhouse.unlockedSlots || BASE_SLOTS
  return (
    <svg
      className="greenhouse-svg"
      viewBox="0 0 320 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A cosy glass greenhouse with two potting shelves"
    >
      <defs>
        <linearGradient id="ghInteriorG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2d6" />
          <stop offset="1" stopColor="#f7e6c4" />
        </linearGradient>
        <linearGradient id="ghPaneG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfeef4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#cfe6ee" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="ghSunGlow" cx="0.5" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ghGrowGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf6b" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffcf6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ghWoodG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a51" />
          <stop offset="1" stopColor="#a9713f" />
        </linearGradient>
      </defs>

      {/* interior wash fills the whole scene before the glass structure sits on top */}
      <rect x="0" y="0" width="320" height="260" fill="url(#ghInteriorG)" />
      <ellipse cx="160" cy="8" rx="170" ry="90" fill="url(#ghSunGlow)" />

      {/* ---- pitched glass roof ---- */}
      <path d="M8 62 L160 14 L312 62 L312 70 L160 24 L8 70 Z" fill="url(#ghWoodG)" />
      <path d="M14 66 L160 22 L306 66 L306 70 L160 27 L14 70 Z" fill="url(#ghPaneG)" />
      <line x1="160" y1="22" x2="160" y2="70" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="87" y1="46" x2="87" y2="70" stroke="#8a5f33" strokeWidth="2" />
      <line x1="233" y1="46" x2="233" y2="70" stroke="#8a5f33" strokeWidth="2" />
      <ellipse cx="110" cy="48" rx="30" ry="10" fill="#ffffff" opacity="0.28" />
      <ellipse cx="220" cy="52" rx="34" ry="11" fill="#ffffff" opacity="0.22" />

      {/* ---- side glass walls (tall enough for both shelves) ---- */}
      <rect x="8" y="70" width="34" height="160" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="25" y1="70" x2="25" y2="230" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="8" y1="150" x2="42" y2="150" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="24" cy="100" rx="14" ry="18" fill="#ffffff" opacity="0.25" />

      <rect x="278" y="70" width="34" height="160" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="295" y1="70" x2="295" y2="230" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="278" y1="150" x2="312" y2="150" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="296" cy="130" rx="14" ry="18" fill="#ffffff" opacity="0.22" />

      <ellipse cx="24" cy="180" rx="10" ry="14" fill="#7ba36e" opacity="0.18" />
      <ellipse cx="298" cy="110" rx="11" ry="15" fill="#7ba36e" opacity="0.16" />

      {/* ---- back wall between the glass walls ---- */}
      <rect x="42" y="70" width="236" height="160" fill="#f3e2c4" />
      <rect x="42" y="70" width="236" height="160" fill="url(#ghInteriorG)" opacity="0.35" />
      {[62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262].map((x) => (
        <line key={x} x1={x} y1="70" x2={x} y2="230" stroke="#00000010" strokeWidth="1" />
      ))}

      {/* warm hanging light for cosiness */}
      <line x1="160" y1="24" x2="160" y2="58" stroke="#8a5f33" strokeWidth="1.5" />
      <ellipse cx="160" cy="63" rx="9" ry="7" fill="#ffe9b8" stroke="#c9a758" strokeWidth="1.5" />
      <circle cx="160" cy="66" r="16" fill="#ffd98a" opacity="0.35" />

      {/* grow light glow — a warm wash above each shelf once she owns one */}
      {growLight && (
        <g className="gh-growlight-glow">
          <ellipse cx="160" cy="94" rx="140" ry="16" fill="url(#ghGrowGlow)" />
          <ellipse cx="160" cy="178" rx="140" ry="18" fill="url(#ghGrowGlow)" />
        </g>
      )}

      {/* ---- top shelf (wall-mounted plank, slots 0-3) ---- */}
      <rect x="34" y="112" width="252" height="6" rx="1.5" fill="url(#ghWoodG)" stroke="#7c4f28" strokeWidth="1.5" />
      <rect x="40" y="118" width="6" height="10" fill="#8a5f33" opacity="0.85" />
      <rect x="274" y="118" width="6" height="10" fill="#8a5f33" opacity="0.85" />

      {/* ---- floor ---- */}
      <rect x="0" y="230" width="320" height="30" fill="#c9915f" />
      <rect x="0" y="230" width="320" height="6" fill="#00000018" />
      {[244, 252, 260].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#00000012" strokeWidth="1" />
      ))}

      {/* ---- bottom potting bench (slots 4-7) ---- */}
      <ellipse cx="160" cy="228" rx="150" ry="10" fill="url(#ghGrowGlow)" opacity="0.25" />
      <rect x="34" y="196" width="252" height="14" rx="3" fill="url(#ghWoodG)" stroke="#7c4f28" strokeWidth="2" />
      <rect x="34" y="210" width="252" height="7" fill="#7c4f28" />
      <rect x="44" y="217" width="10" height="24" fill="#7c4f28" />
      <rect x="266" y="217" width="10" height="24" fill="#7c4f28" />
      <rect x="118" y="217" width="8" height="24" fill="#8a5f33" opacity="0.9" />
      <rect x="194" y="217" width="8" height="24" fill="#8a5f33" opacity="0.9" />
      <line x1="40" y1="201" x2="280" y2="201" stroke="#7c4f28" strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="206" x2="280" y2="206" stroke="#7c4f28" strokeWidth="1" opacity="0.3" />

      {/* ---- 8 pot slots ---- */}
      {POT_SLOTS.map((slot) => {
        const pot = (greenhouse.pots || []).find((p) => p.slot === slot.id)
        const locked = slot.id >= unlockedSlots
        const tier = pot ? (pot.dead ? 'dead' : healthTier(computeHealth(pot, today))) : null
        return (
          <g
            key={slot.id}
            transform={`translate(${slot.x} ${slot.y})`}
            onClick={() => onTapSlot(slot.id, locked, pot)}
            style={{ cursor: locked ? 'default' : 'pointer' }}
          >
            {activeSlotId === slot.id && <ellipse cx="0" cy="10" rx="20" ry="6" fill="#ffe07a" opacity="0.5" />}
            {pot ? (
              <>
                <PottedPlantArt pot={pot} today={today} />
                <PotBadges pot={pot} tier={tier} today={today} />
              </>
            ) : (
              <EmptySlotArt locked={locked} />
            )}
            {waterAnims.some((a) => a.slotId === slot.id) && <WaterDrop />}
          </g>
        )
      })}
    </svg>
  )
}

export function GreenhousePage({
  onBack,
  greenhouse,
  plantLibrary,
  plantableSpecies,
  seeds,
  coins,
  onPlant,
  onNothingToPlant,
  onWater,
  onWaterAll,
  onTrim,
  onMist,
  onRemoveDead,
  onBuySlot,
  onBuyPotStyle,
  onSelectPotStyle,
  onBuyTool,
  onMountRecalc,
}) {
  const [pickerSlotId, setPickerSlotId] = useState(null)
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [waterAnims, setWaterAnims] = useState([])

  // Health/death is recalculated once, here, on mount — never on every
  // render — so opening the greenhouse is what "checks in" on the plants,
  // not a background timer. See recalcGreenhouseHealth in App.jsx.
  useEffect(() => {
    onMountRecalc?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function playWaterAnim(slotIds) {
    const stamp = Date.now()
    const entries = slotIds.map((slotId, i) => ({ id: `${stamp}-${slotId}-${i}`, slotId }))
    setWaterAnims((cur) => [...cur, ...entries])
    entries.forEach((entry) => {
      setTimeout(() => setWaterAnims((cur) => cur.filter((a) => a.id !== entry.id)), 700)
    })
  }

  function handleTapSlot(slotId, locked, pot) {
    if (locked) return
    if (!pot) {
      setSelectedSlotId(null)
      if (pickerSlotId === slotId) {
        setPickerSlotId(null)
        return
      }
      if ((plantLibrary || []).length === 0) {
        onNothingToPlant?.('no-plants')
        return
      }
      if (seeds <= 0) {
        onNothingToPlant?.('no-seeds')
        return
      }
      setPickerSlotId(slotId)
      return
    }
    setPickerSlotId(null)
    setSelectedSlotId(slotId)
    if (!pot.dead && canWaterPot(pot)) {
      onWater(slotId)
      playWaterAnim([slotId])
    }
  }

  function handleWaterAll() {
    const waterable = (greenhouse.pots || []).filter((p) => canWaterPot(p))
    if (!waterable.length) {
      onWaterAll()
      return
    }
    onWaterAll()
    playWaterAnim(waterable.map((p) => p.slot))
  }

  const selectedPot = selectedSlotId != null ? (greenhouse.pots || []).find((p) => p.slot === selectedSlotId) : null

  return (
    <div className="page-grid greenhouse-page">
      <section className="soft-card full-span greenhouse-stage">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">My Greenhouse 🌿</p>
        <h2>A warm little glasshouse of her own</h2>

        <div className="greenhouse-status-row">
          <span>🌱 {seeds} seed{seeds === 1 ? '' : 's'}</span>
          <span>🪙 {coins}</span>
          <span>🔥 {greenhouse.waterStreak || 0} day streak</span>
        </div>

        <div className="greenhouse-scene">
          <GreenhouseScene
            greenhouse={greenhouse}
            waterAnims={waterAnims}
            activeSlotId={selectedSlotId ?? pickerSlotId}
            onTapSlot={handleTapSlot}
          />
        </div>

        <button className="primary-btn greenhouse-water-all" type="button" onClick={handleWaterAll}>
          Water All 💧
        </button>
        <p className="fine-print">Tap an empty pot to plant from your Seed Pouch. Tap a growing pot to water it.</p>
      </section>

      {pickerSlotId != null && (
        <section className="soft-card full-span greenhouse-picker">
          <p className="eyebrow">Choose a plant for this pot</p>
          <p className="fine-print">Costs 1 seed 🌱 — she'll grow into the real species you photographed.</p>
          <div className="garden-shop-row">
            {plantableSpecies.map((species) => (
              <button
                key={species.speciesKey}
                className="garden-shop-btn"
                type="button"
                onClick={() => {
                  onPlant(pickerSlotId, species.speciesKey)
                  setPickerSlotId(null)
                }}
              >
                {species.photo || species.referenceImageUrl ? (
                  <img
                    className="garden-shop-species-thumb"
                    src={species.photo || species.referenceImageUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="garden-shop-emoji">🌿</span>
                )}
                <strong>{species.commonName}</strong>
                <small>Pot this 🌱</small>
              </button>
            ))}
          </div>
          <button className="text-btn" type="button" onClick={() => setPickerSlotId(null)}>Cancel</button>
        </section>
      )}

      {selectedPot && (
        <section className="soft-card full-span greenhouse-selected">
          <p className="eyebrow">{selectedPot.dead ? "This one didn't make it" : STAGE_LABELS[potStageKey(selectedPot)]}</p>
          <h3>{selectedPot.plantName}</h3>
          {selectedPot.dead ? (
            <>
              <p className="fine-print">Tap it in the scene, or the button below, to clear the pot and start fresh.</p>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  onRemoveDead(selectedSlotId)
                  setSelectedSlotId(null)
                }}
              >
                Clear pot
              </button>
            </>
          ) : (
            <>
              <p className="fine-print">
                Health {computeHealth(selectedPot)}% · watered {selectedPot.wateredDays.length} time{selectedPot.wateredDays.length === 1 ? '' : 's'}
                {selectedPot.needsTrimming ? ' · needs trimming ✂️' : ''}
              </p>
              <div className="greenhouse-selected-actions">
                {canWaterPot(selectedPot) ? (
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => {
                      onWater(selectedSlotId)
                      playWaterAnim([selectedSlotId])
                    }}
                  >
                    Water 💧
                  </button>
                ) : (
                  <button className="secondary-btn" type="button" disabled>Watered today 💧</button>
                )}
                {selectedPot.needsTrimming && (
                  <button className="secondary-btn" type="button" onClick={() => onTrim(selectedSlotId)}>
                    Trim ✂️
                  </button>
                )}
                {hasTool(greenhouse, 'spray-bottle') && canMistPot(selectedPot) && (
                  <button className="secondary-btn" type="button" onClick={() => onMist(selectedSlotId)}>
                    Mist 💦
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <section className="soft-card full-span garden-shop">
        <p className="eyebrow">Greenhouse shop 🌿</p>

        <div className="garden-shop-tier">
          <p className="garden-shop-tier-heading">
            Pot Slots <span className="garden-shop-tier-range">{greenhouse.unlockedSlots}/{MAX_SLOTS}</span>
          </p>
          <div className="garden-shop-row">
            <button
              className="garden-shop-btn"
              type="button"
              disabled={greenhouse.unlockedSlots >= MAX_SLOTS}
              onClick={onBuySlot}
            >
              <span className="garden-shop-emoji">🪴</span>
              <strong>Unlock next slot</strong>
              <small>{greenhouse.unlockedSlots >= MAX_SLOTS ? 'All unlocked ✓' : `${SLOT_COST} 🪙`}</small>
            </button>
          </div>
        </div>

        <div className="garden-shop-tier">
          <p className="garden-shop-tier-heading">Pot Styles</p>
          <div className="garden-shop-row">
            {POT_STYLES.map((style) => {
              const owned = greenhouse.ownedPotStyles.includes(style.id)
              const selected = greenhouse.selectedPotStyle === style.id
              return (
                <button
                  key={style.id}
                  className={`garden-shop-btn${owned ? ' owned' : ''}${selected ? ' active' : ''}`}
                  type="button"
                  onClick={() => (owned ? onSelectPotStyle(style.id) : onBuyPotStyle(style.id))}
                >
                  <span className="garden-shop-emoji">🪴</span>
                  <strong>{style.name}</strong>
                  <small>{owned ? (selected ? 'Selected ✓' : 'Owned — tap to select') : `${style.cost} 🪙`}</small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="garden-shop-tier">
          <p className="garden-shop-tier-heading">Tools</p>
          <div className="garden-shop-row">
            {TOOLS.filter((t) => !t.consumable).map((tool) => {
              const owned = hasTool(greenhouse, tool.id)
              return (
                <button
                  key={tool.id}
                  className={`garden-shop-btn${owned ? ' owned' : ''}`}
                  type="button"
                  disabled={owned}
                  onClick={() => onBuyTool(tool.id)}
                >
                  <span className="garden-shop-emoji">{tool.emoji}</span>
                  <strong>{tool.name}</strong>
                  <small>{owned ? 'Owned ✓' : `${tool.cost} 🪙`}</small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="garden-shop-tier">
          <p className="garden-shop-tier-heading">Supplies</p>
          <div className="garden-shop-row">
            {TOOLS.filter((t) => t.consumable).map((tool) => {
              const uses = ownedToolUses(greenhouse, tool.id)
              return (
                <button
                  key={tool.id}
                  className={`garden-shop-btn${uses > 0 ? ' owned' : ''}`}
                  type="button"
                  disabled={uses > 0}
                  onClick={() => onBuyTool(tool.id)}
                >
                  <span className="garden-shop-emoji">{tool.emoji}</span>
                  <strong>{tool.name}</strong>
                  <small>{uses > 0 ? `${uses} uses left` : `${tool.cost} 🪙`}</small>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
