// The Greenhouse — a cosy indoor space, separate from the outdoor Garden,
// where Pooks grows potted plants from her identified species. Two fixed
// shelves (top: slots 0-3, unlocked from the start; bottom potting bench:
// slots 4-7, unlocked from the shop). Pure presentation + on*/callbacks
// operating on the `greenhouse` slice only — all the care-loop maths (stage,
// health, streak, rewards) lives in greenhouseData.js.
import { useEffect, useRef, useState } from 'react'
import {
  POT_SLOTS,
  ROOM2_SLOTS,
  ROOM_SLOT_COUNT,
  MAX_SLOTS,
  SLOT_COST,
  ROOM2_COST,
  POT_STYLES,
  TOOLS,
  STAGE_SIZE,
  STAGE_LABELS,
  potStageKey,
  hasTool,
  hasRoom2,
  isSlotLocked,
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

// Local y of each pot style's soil surface (see the matching ellipse cy in
// PotVessel above) — every style rests its soil at 0 except the macramé
// hanger, whose whole vessel is drawn 2 units higher (it swings from the
// strings above rather than sitting on the shelf). PottedPlantArt reads this
// so the planted foliage anchors to the actual rim instead of assuming 0.
const POT_RIM_Y = { macrame: -2 }

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
// A neglected pot doesn't just desaturate — it visibly droops. A shallow tilt
// on the foliage alone (never the vessel, which should stay planted upright)
// reads as real wilting rather than only a colour-filter costume change,
// same idea as a real houseplant leaning toward however it's been let down.
const WILT_TILT = { vibrant: 0, wilted: -4, sick: -8, dead: -13 }

// A soft ground-contact shadow under every pot on the shelf — planted,
// empty, or locked alike — so the shelf reads as a lit surface things sit
// ON rather than a flat backdrop with icons floating in front of it.
function PotShadow({ rx = 12 }) {
  return <ellipse cx="0" cy="16" rx={rx} ry={rx * 0.22} fill="#2c1c0c" opacity="0.22" />
}

function PottedPlantArt({ pot, today }) {
  const stage = potStageKey(pot)
  const tier = pot.dead ? 'dead' : healthTier(computeHealth(pot, today))
  const { template, zones, variation, scale } = plantVisual(pot.plantName, pot.family)
  const size = STAGE_SIZE[stage] * (scale ?? 1)
  const rimY = POT_RIM_Y[pot.potStyle] || 0
  const tilt = WILT_TILT[tier] || 0
  return (
    <>
      <PotShadow />
      <PotVessel style={pot.potStyle} />
      <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `0px ${rimY}px`, transition: 'transform 480ms var(--ease-out)' }}>
        <foreignObject
          x={-size / 2}
          y={-size * 1.22 + rimY}
          width={size}
          height={size * 1.3}
          style={{ overflow: 'visible' }}
          clipPath="url(#ghPotSlotClip)"
        >
          <div style={{ width: '100%', height: '100%', display: 'flex', filter: HEALTH_FILTER[tier] }}>
            <GardenPlant template={template} zones={zones} size={size} variation={variation} flowering={stage === 'blooming'} hideSoil />
          </div>
        </foreignObject>
      </g>
      {tier === 'dead' && <CobwebAccent />}
    </>
  )
}

// A small woven cobweb tucked in the corner of a long-neglected pot — a
// specific, real detail (this corner has gone undisturbed) rather than only
// a desaturated/browned filter standing in for "dead".
function CobwebAccent() {
  return (
    <g className="gh-cobweb" transform="translate(10 -2)" aria-hidden="true">
      <path
        d="M0 0 L-9 -2 M0 0 L-7 5 M0 0 L2 7 M-9 -2 Q-5 2 0 0 Q-3 5 -7 5 Q-3 3 2 7"
        fill="none"
        stroke="#c9c3b6"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </g>
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

// A circular gauge replacing the plain "Health 72%" text stat — reads at a
// glance and colours itself by the same tier the plant's own foliage filter
// uses, instead of a bare number with no visual weight.
function HealthGauge({ pct, tier }) {
  const r = 22
  const c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(100, pct)) / 100
  const color =
    tier === 'sick' ? 'var(--terracotta)' : tier === 'wilted' ? 'var(--gold)' : tier === 'dead' ? 'var(--muted)' : 'var(--leaf)'
  return (
    <svg className="gh-health-gauge" viewBox="0 0 56 56" role="img" aria-label={`Health ${Math.round(pct)}%`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - filled)}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--ink-strong)">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

// Shop card previews — the actual pot vessel art per style (not a generic 🪴
// for every one of them) and a dashed "empty slot" outline matching the real
// scene's own EmptySlotArt, so browsing the shop shows exactly what's being
// unlocked/bought instead of one repeated icon standing in for six things.
function PotStyleIcon({ style }) {
  return (
    <svg className="catalog-icon-svg" viewBox="-18 -27 36 47" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <PotVessel style={style} />
    </svg>
  )
}
function SlotIcon() {
  return (
    <svg className="catalog-icon-svg" viewBox="-16 -20 32 40" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path d="M-14 0 L14 0 L11 18 L-11 18 Z" fill="none" stroke="#a1512f" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.55" />
      <ellipse cx="0" cy="0" rx="14" ry="4" fill="none" stroke="#a1512f" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.7" />
      <text x="0" y="4" textAnchor="middle" fontSize="15" fill="#a1512f" opacity="0.7">+</text>
    </svg>
  )
}

// A locked slot: a small burlap-wrapped bundle sitting where a pot will
// go once she unlocks it, with a real illustrated padlock — not a bare
// emoji floating on the shelf. Reads as "something's coming, not yet" in
// the same wood/warm palette as the rest of the greenhouse, rather than a
// system icon interrupting the scene.
function LockedSlotArt() {
  return (
    <g aria-hidden="true">
      <PotShadow rx="11" />
      <path d="M-11 -3 L11 -3 L9.5 13 L-9.5 13 Z" fill="#c9b896" stroke="#8a7350" strokeWidth="1.4" />
      <path d="M-11 -3 L11 -3 L10.2 3 L-10.2 3 Z" fill="#dccca4" opacity="0.7" />
      <path d="M-9 -3 Q0 1 9 -3" fill="none" stroke="#8a7350" strokeWidth="1" opacity="0.5" />
      <path d="M-8 4 Q0 8 8 4" fill="none" stroke="#8a7350" strokeWidth="1" opacity="0.4" />
      <g transform="translate(0 -7)">
        <path d="M-4 0.5 V-2.6 a4 4 0 0 1 8 0 V0.5" fill="none" stroke="#8a6a2a" strokeWidth="2" strokeLinecap="round" />
        <rect x="-5.5" y="-0.5" width="11" height="8.5" rx="2" fill="#e0b25e" stroke="#8a6a2a" strokeWidth="1.2" />
        <circle cx="0" cy="2.8" r="1.3" fill="#5a4020" />
      </g>
    </g>
  )
}

// An unlocked, unplanted slot: her actual chosen pot style sitting empty on
// the shelf (real vessel art, not a dashed sketch) with a soft "+" hint
// hovering over the bare soil — reads as "a real pot, waiting to be
// planted" rather than a wireframe placeholder.
function EmptySlotArt({ locked, potStyle }) {
  if (locked) return <LockedSlotArt />
  return (
    <g className="gh-empty-pot" aria-hidden="true">
      <PotShadow />
      <PotVessel style={potStyle} />
      <circle cx="0" cy="-13" r="7.5" fill="#fffaf0" opacity="0.9" stroke="#e8d9b8" strokeWidth="1" />
      <text x="0" y="-9" textAnchor="middle" fontSize="12" fill="#a1512f" opacity="0.75">+</text>
    </g>
  )
}

const ROOM_WIDTH = 320
const ROOM_HEIGHT = 362

// Half the center-to-center gap between adjacent pot slots (see POT_SLOTS in
// greenhouseData.js — currently a uniform 52 units within a shelf) — a
// plant's foliage is clipped to this on either side of its own pot so a
// wide/tall bloom can't visually spill into the neighbouring slot.
const POT_SLOT_HALF_SPACING = (POT_SLOTS[1].x - POT_SLOTS[0].x) / 2

// One glasshouse room's full interior — roof, walls, shelves, floor, and its
// 8 pot slots — drawn in local 0-320 x 0-362 coordinates and wrapped in a
// translate group by GreenhouseScene so a second room is just this same
// drawing shifted one ROOM_WIDTH to the right, sharing the gradients defined
// once on the parent <svg>.
function RoomInterior({ slots, greenhouse, waterAnims, activeSlotId, onTapSlot, today, growLight }) {
  return (
    <>
      {/* interior wash fills the whole scene before the glass structure sits on top */}
      <rect x="0" y="0" width={ROOM_WIDTH} height={ROOM_HEIGHT} fill="url(#ghInteriorG)" />
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
      <rect x="8" y="70" width="34" height="262" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="25" y1="70" x2="25" y2="332" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="8" y1="252" x2="42" y2="252" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="24" cy="202" rx="14" ry="18" fill="#ffffff" opacity="0.25" />

      <rect x="278" y="70" width="34" height="262" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="295" y1="70" x2="295" y2="332" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="278" y1="252" x2="312" y2="252" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="296" cy="232" rx="14" ry="18" fill="#ffffff" opacity="0.22" />

      <ellipse cx="24" cy="282" rx="10" ry="14" fill="#7ba36e" opacity="0.18" />
      <ellipse cx="298" cy="212" rx="11" ry="15" fill="#7ba36e" opacity="0.16" />

      {/* ---- back wall between the glass walls ---- */}
      <rect x="42" y="70" width="236" height="262" fill="#f3e2c4" />
      <rect x="42" y="70" width="236" height="262" fill="url(#ghInteriorG)" opacity="0.35" />
      {[62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262].map((x) => (
        <line key={x} x1={x} y1="70" x2={x} y2="332" stroke="#00000010" strokeWidth="1" />
      ))}

      {/* warm hanging light for cosiness */}
      <line x1="160" y1="24" x2="160" y2="58" stroke="#8a5f33" strokeWidth="1.5" />
      <ellipse cx="160" cy="63" rx="9" ry="7" fill="#ffe9b8" stroke="#c9a758" strokeWidth="1.5" />
      <circle cx="160" cy="66" r="16" fill="#ffd98a" opacity="0.35" />

      {/* grow light glow — a warm wash above each shelf once she owns one */}
      {growLight && (
        <g className="gh-growlight-glow">
          <ellipse cx="160" cy="196" rx="140" ry="16" fill="url(#ghGrowGlow)" />
          <ellipse cx="160" cy="280" rx="140" ry="18" fill="url(#ghGrowGlow)" />
        </g>
      )}

      {/* ---- top shelf (wall-mounted plank, slots 0-3) ---- */}
      <rect x="34" y="214" width="252" height="6" rx="1.5" fill="url(#ghWoodG)" stroke="#7c4f28" strokeWidth="1.5" />
      <rect x="40" y="220" width="6" height="10" fill="#8a5f33" opacity="0.85" />
      <rect x="274" y="220" width="6" height="10" fill="#8a5f33" opacity="0.85" />

      {/* ---- floor ---- */}
      <rect x="0" y="332" width={ROOM_WIDTH} height="30" fill="#c9915f" />
      <rect x="0" y="332" width={ROOM_WIDTH} height="6" fill="#00000018" />
      {[346, 354, 362].map((y) => (
        <line key={y} x1="0" y1={y} x2={ROOM_WIDTH} y2={y} stroke="#00000012" strokeWidth="1" />
      ))}

      {/* ---- bottom potting bench (slots 4-7) ---- */}
      <ellipse cx="160" cy="330" rx="150" ry="10" fill="url(#ghGrowGlow)" opacity="0.25" />
      <rect x="34" y="298" width="252" height="14" rx="3" fill="url(#ghWoodG)" stroke="#7c4f28" strokeWidth="2" />
      <rect x="34" y="312" width="252" height="7" fill="#7c4f28" />
      <rect x="44" y="319" width="10" height="24" fill="#7c4f28" />
      <rect x="266" y="319" width="10" height="24" fill="#7c4f28" />
      <rect x="118" y="319" width="8" height="24" fill="#8a5f33" opacity="0.9" />
      <rect x="194" y="319" width="8" height="24" fill="#8a5f33" opacity="0.9" />
      <line x1="40" y1="303" x2="280" y2="303" stroke="#7c4f28" strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="308" x2="280" y2="308" stroke="#7c4f28" strokeWidth="1" opacity="0.3" />

      {/* ---- 8 pot slots ---- */}
      {slots.map((slot) => {
        const pot = (greenhouse.pots || []).find((p) => p.slot === slot.id)
        const locked = isSlotLocked(greenhouse, slot)
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
              <EmptySlotArt locked={locked} potStyle={greenhouse.selectedPotStyle} />
            )}
            {waterAnims.some((a) => a.slotId === slot.id) && <WaterDrop />}
          </g>
        )
      })}
    </>
  )
}

// Room 2, once bought, sits immediately to the right of room 1 in one wide
// <svg> — same pattern the outdoor Garden uses for its own expansions (see
// garden-scene-wrap/.pannable in Garden.jsx): scene-units-to-pixels scale is
// measured off the wrap's rendered width so the base room keeps its normal
// size and an expansion adds scrollable width rather than squashing
// everything down to fit.
function GreenhouseScene({ greenhouse, waterAnims, activeSlotId, onTapSlot }) {
  const growLight = hasTool(greenhouse, 'grow-light')
  const today = saDateKey()
  const room2 = hasRoom2(greenhouse)
  const wrapRef = useRef(null)
  const [unitPx, setUnitPx] = useState(1)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => setUnitPx(el.clientWidth / ROOM_WIDTH)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const totalWidth = ROOM_WIDTH * (room2 ? 2 : 1)

  return (
    <div className={`greenhouse-scene-wrap${room2 ? ' pannable' : ''}`} ref={wrapRef}>
      <svg
        className="greenhouse-svg"
        viewBox={`0 0 ${totalWidth} ${ROOM_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: totalWidth * unitPx, height: ROOM_HEIGHT * unitPx }}
        role="img"
        aria-label={room2 ? 'Two cosy glass greenhouse rooms, each with two potting shelves' : 'A cosy glass greenhouse with two potting shelves'}
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
          {/* Shared by every pot's foreignObject (see PottedPlantArt) — rect is
              in the pot slot group's own local space, so x=0 is always that
              pot's own center regardless of which slot/room it's in. Tall
              enough vertically to never clip height, only horizontal spill
              past the midpoint to a neighbouring pot. */}
          <clipPath id="ghPotSlotClip">
            <rect x={-POT_SLOT_HALF_SPACING} y="-1000" width={POT_SLOT_HALF_SPACING * 2} height="2000" />
          </clipPath>
        </defs>

        <g transform="translate(0 0)">
          <RoomInterior
            slots={POT_SLOTS}
            greenhouse={greenhouse}
            waterAnims={waterAnims}
            activeSlotId={activeSlotId}
            onTapSlot={onTapSlot}
            today={today}
            growLight={growLight}
          />
        </g>
        {room2 && (
          <g transform={`translate(${ROOM_WIDTH} 0)`}>
            <RoomInterior
              slots={ROOM2_SLOTS}
              greenhouse={greenhouse}
              waterAnims={waterAnims}
              activeSlotId={activeSlotId}
              onTapSlot={onTapSlot}
              today={today}
              growLight={growLight}
            />
          </g>
        )}
      </svg>
    </div>
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
  onBlockedTap,
  onWater,
  onWaterAll,
  onTrim,
  onMist,
  onRemoveDead,
  onBuySlot,
  onBuyRoom2,
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
    if (locked) {
      onBlockedTap?.('locked')
      return
    }
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
    if (pot.dead) {
      onBlockedTap?.('dead')
      return
    }
    if (canWaterPot(pot)) {
      onWater(slotId)
      playWaterAnim([slotId])
    } else {
      onBlockedTap?.('watered')
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
          <p className="fine-print greenhouse-picker-note">🌿 Small plants only — trees and vines go in the garden!</p>
          <div className="catalog-row">
            {plantableSpecies.map((species) => (
              <button
                key={species.speciesKey}
                className="catalog-card"
                type="button"
                onClick={() => {
                  onPlant(pickerSlotId, species.speciesKey)
                  setPickerSlotId(null)
                }}
              >
                <span className="catalog-icon-wrap photo">
                  {species.photo || species.referenceImageUrl ? (
                    <img
                      className="garden-shop-species-thumb"
                      src={species.photo || species.referenceImageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="catalog-icon-emoji">🌿</span>
                  )}
                </span>
                <strong>{species.commonName}</strong>
                <span className="catalog-price">Pot this 🌱</span>
              </button>
            ))}
          </div>
          <button className="text-btn" type="button" onClick={() => setPickerSlotId(null)}>Cancel</button>
        </section>
      )}

      {selectedPot && (() => {
        const health = selectedPot.dead ? 0 : computeHealth(selectedPot)
        const tier = selectedPot.dead ? 'dead' : healthTier(health)
        return (
        <section className="soft-card full-span greenhouse-selected">
          <div className="greenhouse-selected-head">
            {!selectedPot.dead && <HealthGauge pct={health} tier={tier} />}
            <div>
              <p className="eyebrow">{selectedPot.dead ? "This one didn't make it" : STAGE_LABELS[potStageKey(selectedPot)]}</p>
              <h3>{selectedPot.plantName}</h3>
            </div>
          </div>
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
                Watered {selectedPot.wateredDays.length} time{selectedPot.wateredDays.length === 1 ? '' : 's'}
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
        )
      })()}

      <section className="soft-card full-span garden-shop">
        <p className="eyebrow">Greenhouse shop 🌿</p>

        <div className="catalog-shelf tier-starter">
          <div className="catalog-shelf-heading">
            <strong>Pot Slots{hasRoom2(greenhouse) ? ' — Room 1' : ''}</strong>
            <span>{greenhouse.unlockedSlots}/{MAX_SLOTS}</span>
          </div>
          <div className="catalog-row">
            <button
              className="catalog-card"
              type="button"
              disabled={greenhouse.unlockedSlots >= MAX_SLOTS}
              onClick={() => onBuySlot(1)}
            >
              <span className="catalog-icon-wrap"><SlotIcon /></span>
              <strong>Unlock next slot</strong>
              <span className="catalog-price">{greenhouse.unlockedSlots >= MAX_SLOTS ? 'All unlocked ✓' : `${SLOT_COST} 🪙`}</span>
            </button>
          </div>
        </div>

        {hasRoom2(greenhouse) && (
          <div className="catalog-shelf tier-starter">
            <div className="catalog-shelf-heading">
              <strong>Pot Slots — Room 2</strong>
              <span>{greenhouse.unlockedSlotsRoom2 || 0}/{ROOM_SLOT_COUNT}</span>
            </div>
            <div className="catalog-row">
              <button
                className="catalog-card"
                type="button"
                disabled={(greenhouse.unlockedSlotsRoom2 || 0) >= ROOM_SLOT_COUNT}
                onClick={() => onBuySlot(2)}
              >
                <span className="catalog-icon-wrap"><SlotIcon /></span>
                <strong>Unlock next slot</strong>
                <span className="catalog-price">{(greenhouse.unlockedSlotsRoom2 || 0) >= ROOM_SLOT_COUNT ? 'All unlocked ✓' : `${SLOT_COST} 🪙`}</span>
              </button>
            </div>
          </div>
        )}

        {!hasRoom2(greenhouse) && greenhouse.unlockedSlots >= MAX_SLOTS && (
          <div className="catalog-shelf tier-premium">
            <div className="catalog-shelf-heading"><strong>Expand Greenhouse</strong></div>
            <div className="catalog-row">
              <button className="catalog-card" type="button" onClick={onBuyRoom2}>
                <span className="catalog-icon-emoji">🏡</span>
                <strong>Build a second room</strong>
                <p className="catalog-blurb">Doubles her glasshouse, with 8 more pots of its own to unlock.</p>
                <span className="catalog-price">{ROOM2_COST} 🪙</span>
              </button>
            </div>
          </div>
        )}

        <div className="catalog-shelf tier-mid">
          <div className="catalog-shelf-heading"><strong>Pot Styles</strong></div>
          <div className="catalog-row">
            {POT_STYLES.map((style) => {
              const owned = greenhouse.ownedPotStyles.includes(style.id)
              const selected = greenhouse.selectedPotStyle === style.id
              return (
                <button
                  key={style.id}
                  className={`catalog-card${owned ? ' owned' : ''}${selected ? ' active' : ''}`}
                  type="button"
                  onClick={() => (owned ? onSelectPotStyle(style.id) : onBuyPotStyle(style.id))}
                >
                  <span className="catalog-icon-wrap"><PotStyleIcon style={style.id} /></span>
                  <strong>{style.name}</strong>
                  <p className="catalog-blurb">{style.blurb}</p>
                  <span className={`catalog-price${owned ? ' owned-tag' : ''}`}>
                    {owned ? (selected ? 'Selected ✓' : 'Owned — tap to select') : `${style.cost} 🪙`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="catalog-shelf tier-expensive">
          <div className="catalog-shelf-heading"><strong>Tools</strong></div>
          <div className="catalog-row">
            {TOOLS.filter((t) => !t.consumable).map((tool) => {
              const owned = hasTool(greenhouse, tool.id)
              return (
                <button
                  key={tool.id}
                  className={`catalog-card${owned ? ' owned' : ''}`}
                  type="button"
                  disabled={owned}
                  onClick={() => onBuyTool(tool.id)}
                >
                  <span className="catalog-icon-emoji">{tool.emoji}</span>
                  <strong>{tool.name}</strong>
                  <p className="catalog-blurb">{tool.blurb}</p>
                  <span className={`catalog-price${owned ? ' owned-tag' : ''}`}>{owned ? 'Owned ✓' : `${tool.cost} 🪙`}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="catalog-shelf tier-starter">
          <div className="catalog-shelf-heading"><strong>Supplies</strong></div>
          <div className="catalog-row">
            {TOOLS.filter((t) => t.consumable).map((tool) => {
              const uses = ownedToolUses(greenhouse, tool.id)
              return (
                <button
                  key={tool.id}
                  className={`catalog-card${uses > 0 ? ' owned' : ''}`}
                  type="button"
                  disabled={uses > 0}
                  onClick={() => onBuyTool(tool.id)}
                >
                  <span className="catalog-icon-emoji">{tool.emoji}</span>
                  <strong>{tool.name}</strong>
                  <p className="catalog-blurb">{tool.blurb}</p>
                  <span className={`catalog-price${uses > 0 ? ' owned-tag' : ''}`}>{uses > 0 ? `${uses} uses left` : `${tool.cost} 🪙`}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
