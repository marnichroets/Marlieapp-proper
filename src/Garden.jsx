// Bird Garden — Sub-phase A UI (sandbox-only; gating + handlers in App.jsx).
// She buys an item, then TAPS the lawn to place it wherever she likes (snapped
// to an invisible grid, no overlap), so every garden is unique. Items grow via
// the daily tap-to-tend care loop. Pure presentation + onPlace/onWater callbacks
// operating on the `garden` slice only.
import { useRef, useState } from 'react'
import {
  GARDEN_SHOP,
  gardenItem,
  plantStageKey,
  isFullyGrown,
  wateredToday,
  STAGE_LABELS,
  GARDEN_REGION,
  snapToGarden,
  canPlaceAt,
} from './gardenData'
import { saDateKey } from './saDate'

// ---- per-item artwork (base at origin (0,0), growing upward; pond is flat) --
function TreeArt({ stageKey }) {
  if (stageKey === 'seedling') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-9" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="-3.4" cy="-9" rx="3" ry="1.5" fill="#5aa861" transform="rotate(-28 -3.4 -9)" /><ellipse cx="3.4" cy="-9" rx="3" ry="1.5" fill="#5aa861" transform="rotate(28 3.4 -9)" /></g>)
  if (stageKey === 'sapling') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><rect x="-1.5" y="-22" width="3" height="22" rx="1.5" fill="#9c6f44" /><circle cx="0" cy="-25" r="10" fill="#5aa861" /><circle cx="-4" cy="-27" r="6" fill="#6cb86f" /></g>)
  if (stageKey === 'young') return (<g><ellipse cx="0" cy="0" rx="10" ry="3.4" fill="#7a5a3a" /><rect x="-2.5" y="-34" width="5" height="34" rx="2" fill="#9c6f44" /><circle cx="0" cy="-38" r="16" fill="#4f9a55" /><circle cx="-7" cy="-40" r="9" fill="#5aa861" /></g>)
  return (<g><ellipse cx="0" cy="0" rx="12" ry="4" fill="#7a5a3a" /><rect x="-3.5" y="-44" width="7" height="44" rx="3" fill="#9c6f44" /><ellipse cx="0" cy="-50" rx="24" ry="20" fill="#4f9a55" /><ellipse cx="-14" cy="-46" rx="14" ry="12" fill="#5aa861" /><ellipse cx="14" cy="-46" rx="13" ry="11" fill="#46894c" /></g>)
}

function PineArt({ stageKey }) {
  if (stageKey === 'pine-sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -16 L-6 -2 L6 -2 Z" fill="#3f8a52" /></g>)
  if (stageKey === 'pine-small') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><rect x="-2" y="-10" width="4" height="10" fill="#8a5a36" /><path d="M0 -30 L-11 -10 L11 -10 Z" fill="#3f8a52" /><path d="M0 -22 L-9 -6 L9 -6 Z" fill="#357a46" /></g>)
  return (<g><ellipse cx="0" cy="0" rx="9" ry="3.4" fill="#7a5a3a" /><rect x="-2.5" y="-12" width="5" height="12" fill="#8a5a36" /><path d="M0 -48 L-14 -26 L14 -26 Z" fill="#3f8a52" /><path d="M0 -36 L-13 -16 L13 -16 Z" fill="#357a46" /><path d="M0 -24 L-11 -8 L11 -8 Z" fill="#2f6e3e" /></g>)
}

function FlowerPatchArt({ stageKey }) {
  if (stageKey === 'sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="-2.6" cy="-11" rx="3" ry="1.5" fill="#6cb86f" transform="rotate(-30 -2.6 -11)" /><ellipse cx="2.6" cy="-11" rx="3" ry="1.5" fill="#6cb86f" transform="rotate(30 2.6 -11)" /></g>)
  if (stageKey === 'budding') {
    const stems = [[-6, -16], [0, -20], [6, -15]]
    return (<g><ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />{stems.map(([x, y], i) => (<g key={i}><line x1={x} y1="0" x2={x} y2={y} stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><circle cx={x} cy={y} r="2.6" fill="#9ccb6f" /></g>))}</g>)
  }
  const flowers = [[-7, -18, '#f6a5c0'], [0, -22, '#ffd45e'], [7, -17, '#c9a8e8']]
  return (<g><ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />{flowers.map(([x, y, c], i) => (<g key={i}><line x1={x} y1="0" x2={x} y2={y} stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><circle cx={x} cy={y} r="4" fill={c} /><circle cx={x} cy={y} r="1.6" fill="#ffd45e" /></g>))}</g>)
}

function FlowerBedArt({ stageKey }) {
  if (stageKey === 'bed-soil') return (<g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" /><ellipse cx="0" cy="-2" rx="16" ry="4" fill="#8a6a46" /></g>)
  if (stageKey === 'bed-shoots') return (<g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" />{[-12, -4, 4, 12].map((x, i) => (<line key={i} x1={x} y1="-3" x2={x} y2="-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />))}</g>)
  const f = [[-14, -12, '#f6a5c0'], [-5, -16, '#ffd45e'], [4, -14, '#c9a8e8'], [13, -17, '#f8b4d0'], [0, -11, '#fff0b3']]
  return (<g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" />{f.map(([x, y, c], i) => (<g key={i}><line x1={x} y1="-2" x2={x} y2={y} stroke="#5aa05a" strokeWidth="2" /><circle cx={x} cy={y} r="3.6" fill={c} /><circle cx={x} cy={y} r="1.4" fill="#ffd45e" /></g>))}</g>)
}

function FenceArt({ stageKey }) {
  const post = (x) => <rect x={x - 2} y="-22" width="4" height="22" rx="1.5" fill="#b5854f" />
  if (stageKey === 'fence-post') return (<g>{post(0)}</g>)
  if (stageKey === 'fence-rail') return (<g>{post(-12)}{post(12)}<rect x="-14" y="-16" width="28" height="3.5" rx="1.5" fill="#caa46c" /></g>)
  return (<g>{post(-14)}{post(0)}{post(14)}<rect x="-16" y="-17" width="32" height="3.5" rx="1.5" fill="#caa46c" /><rect x="-16" y="-9" width="32" height="3.5" rx="1.5" fill="#caa46c" /></g>)
}

function FeederArt({ stageKey }) {
  if (stageKey === 'feeder-post') return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="#a07a4e" /></g>)
  if (stageKey === 'feeder-tray') return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="#a07a4e" /><rect x="-12" y="-30" width="24" height="5" rx="2" fill="#caa46c" /></g>)
  return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="#a07a4e" /><rect x="-13" y="-28" width="26" height="5" rx="2" fill="#caa46c" /><path d="M-15 -28 L0 -42 L15 -28 Z" fill="#b5854f" /><circle cx="-5" cy="-25" r="1.4" fill="#6b4a2a" /><circle cx="3" cy="-25" r="1.4" fill="#6b4a2a" /></g>)
}

function PondArt({ stageKey }) {
  if (stageKey === 'pond-puddle') return (<g><ellipse cx="0" cy="-2" rx="16" ry="7" fill="#6fb8d6" /><ellipse cx="-4" cy="-4" rx="6" ry="2" fill="#a9dcec" opacity="0.7" /></g>)
  if (stageKey === 'pond-small') return (<g><ellipse cx="0" cy="-2" rx="26" ry="11" fill="#6fb8d6" /><ellipse cx="-7" cy="-5" rx="10" ry="3" fill="#a9dcec" opacity="0.6" /></g>)
  return (<g><ellipse cx="0" cy="-2" rx="34" ry="14" fill="#6fb8d6" /><ellipse cx="-9" cy="-6" rx="13" ry="4" fill="#a9dcec" opacity="0.6" /><g stroke="#5a9e4e" strokeWidth="2.4" strokeLinecap="round"><line x1="-30" y1="-4" x2="-32" y2="-16" /><line x1="-24" y1="-2" x2="-22" y2="-14" /><line x1="30" y1="-4" x2="32" y2="-15" /></g></g>)
}

function StonePathArt({ stageKey }) {
  if (stageKey === 'path-laying') return (<g><ellipse cx="-7" cy="0" rx="6" ry="3" fill="#9a9088" /><ellipse cx="7" cy="-2" rx="5" ry="2.6" fill="#b0a89e" /><ellipse cx="1" cy="2" rx="5" ry="2.2" fill="#8a6a46" opacity="0.5" /></g>)
  return (<g>{[[-13, 2], [-4, -0.5], [5, -2.5], [13, -4.5]].map(([x, y], i) => (<g key={i}><ellipse cx={x} cy={y} rx="6" ry="3" fill="#9a9088" /><ellipse cx={x - 1.4} cy={y - 0.8} rx="3" ry="1.4" fill="#bdb6ac" opacity="0.8" /></g>))}</g>)
}

function RockGardenArt({ stageKey }) {
  const rocks = (<g><ellipse cx="0" cy="0" rx="15" ry="5.5" fill="#8a8078" /><ellipse cx="-6" cy="-3" rx="6.5" ry="4.5" fill="#9a9088" /><ellipse cx="6" cy="-2.5" rx="5.5" ry="4" fill="#a8a096" /></g>)
  if (stageKey === 'rock-bare') return rocks
  const succ = (x, y, c) => (<g><circle cx={x} cy={y} r="3" fill={c} /><circle cx={x} cy={y} r="1.3" fill="#bfe6a0" /></g>)
  return (<g>{rocks}{succ(-6, -6, '#5aa861')}{succ(6, -5, '#6cb86f')}{succ(0, -3.5, '#4f9a55')}</g>)
}

function VegPatchArt({ stageKey }) {
  const soil = <g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" /><ellipse cx="0" cy="-2" rx="16" ry="4" fill="#8a6a46" /></g>
  if (stageKey === 'veg-soil') return (<g>{soil}{[-10, 0, 10].map((x, i) => <line key={i} x1={x} y1="-4.5" x2={x} y2="0" stroke="#6b4f30" strokeWidth="1.5" />)}</g>)
  if (stageKey === 'veg-sprouts') return (<g>{soil}{[-12, -4, 4, 12].map((x, i) => (<g key={i}><line x1={x} y1="-3" x2={x} y2="-10" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><ellipse cx={x - 2} cy="-10" rx="2.6" ry="1.3" fill="#6cb86f" transform={`rotate(-30 ${x - 2} -10)`} /></g>))}</g>)
  return (<g>{soil}{[-12, -4, 4, 12].map((x, i) => (<g key={i}><path d={`M${x} -3 V-13`} stroke="#4f9a55" strokeWidth="2" strokeLinecap="round" /><path d={`M${x - 3} -11 L${x} -15 L${x + 3} -11`} fill="none" stroke="#5aa861" strokeWidth="1.6" strokeLinecap="round" /><path d={`M${x - 2} -3 L${x} 2 L${x + 2} -3 Z`} fill="#e8893a" /></g>))}</g>)
}

function ShrubArt({ stageKey }) {
  if (stageKey === 'shrub-sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><circle cx="0" cy="-13" r="4" fill="#6cb86f" /></g>)
  const bush = <g><ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" /><circle cx="0" cy="-16" r="14" fill="#4f9a55" /><circle cx="-8" cy="-12" r="9" fill="#5aa861" /><circle cx="8" cy="-13" r="8" fill="#46894c" /></g>
  if (stageKey === 'shrub-bush') return bush
  const f = [[-9, -20, '#f6a5c0'], [0, -26, '#ffd45e'], [9, -18, '#c9a8e8'], [-3, -12, '#f8b4d0'], [6, -24, '#fff0b3']]
  return (<g>{bush}{f.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="3" fill={c} />)}</g>)
}

function BenchArt({ stageKey }) {
  if (stageKey === 'bench-frame') return (<g><rect x="-16" y="-6" width="3" height="6" fill="#a07a4e" /><rect x="13" y="-6" width="3" height="6" fill="#a07a4e" /><rect x="-17" y="-9" width="34" height="3" rx="1.5" fill="#b5854f" /></g>)
  return (<g><rect x="-16" y="-8" width="3" height="8" fill="#9c6f44" /><rect x="13" y="-8" width="3" height="8" fill="#9c6f44" /><rect x="-18" y="-11" width="36" height="4" rx="2" fill="#caa46c" /><rect x="-16" y="-22" width="3" height="12" fill="#9c6f44" /><rect x="13" y="-22" width="3" height="12" fill="#9c6f44" /><rect x="-18" y="-22" width="36" height="3.5" rx="1.5" fill="#b5854f" /><rect x="-18" y="-16" width="36" height="3" rx="1.5" fill="#b5854f" /></g>)
}

function BirdBathArt({ stageKey }) {
  const ped = <g><ellipse cx="0" cy="0" rx="10" ry="3.4" fill="#b8b2a8" /><rect x="-3" y="-16" width="6" height="16" fill="#c8c2b8" /><rect x="-3.5" y="-16" width="7" height="3" fill="#b8b2a8" /></g>
  if (stageKey === 'bath-base') return ped
  if (stageKey === 'bath-bowl') return (<g>{ped}<ellipse cx="0" cy="-18" rx="13" ry="5" fill="#c8c2b8" /><ellipse cx="0" cy="-19" rx="10" ry="3.4" fill="#a39c92" /></g>)
  return (<g>{ped}<ellipse cx="0" cy="-18" rx="13" ry="5" fill="#c8c2b8" /><ellipse cx="0" cy="-19" rx="10" ry="3.4" fill="#6fb8d6" /><ellipse cx="-3" cy="-20" rx="4" ry="1.4" fill="#a9dcec" opacity="0.7" /></g>)
}

function TrellisArt({ stageKey }) {
  const frame = (<g fill="none" stroke="#b5854f" strokeWidth="2.6" strokeLinecap="round"><path d="M-14 0 V-30 q0 -14 14 -14 q14 0 14 14 V0" /><line x1="-14" y1="-20" x2="14" y2="-20" /><line x1="-7" y1="-2" x2="-7" y2="-40" stroke="#caa46c" strokeWidth="1.4" /><line x1="7" y1="-2" x2="7" y2="-40" stroke="#caa46c" strokeWidth="1.4" /></g>)
  const vines = (<g>{[[-14, -8], [-12, -22], [-2, -40], [12, -24], [14, -10], [0, -44], [7, -34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={i % 2 ? '#5aa861' : '#4f9a55'} />)}</g>)
  if (stageKey === 'trellis-bare') return frame
  if (stageKey === 'trellis-vines') return (<g>{frame}{vines}</g>)
  const blooms = [[-13, -14, '#f6a5c0'], [-6, -38, '#ffd45e'], [3, -42, '#c9a8e8'], [13, -18, '#f8b4d0'], [9, -30, '#fff0b3']]
  return (<g>{frame}{vines}{blooms.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={c} />)}</g>)
}

function PlantArt({ type, stageKey }) {
  switch (type) {
    case 'tree-seed': return <TreeArt stageKey={stageKey} />
    case 'pine-seed': return <PineArt stageKey={stageKey} />
    case 'flower-bed': return <FlowerBedArt stageKey={stageKey} />
    case 'fence': return <FenceArt stageKey={stageKey} />
    case 'feeder': return <FeederArt stageKey={stageKey} />
    case 'pond': return <PondArt stageKey={stageKey} />
    case 'stone-path': return <StonePathArt stageKey={stageKey} />
    case 'rock-garden': return <RockGardenArt stageKey={stageKey} />
    case 'veg-patch': return <VegPatchArt stageKey={stageKey} />
    case 'shrub': return <ShrubArt stageKey={stageKey} />
    case 'bench': return <BenchArt stageKey={stageKey} />
    case 'bird-bath': return <BirdBathArt stageKey={stageKey} />
    case 'trellis': return <TrellisArt stageKey={stageKey} />
    default: return <FlowerPatchArt stageKey={stageKey} />
  }
}

// ---- sanctuary enclosure (scene-wide, drawn in absolute scene coords) -------
// A tasteful wooden boundary that frames the whole lawn once she buys it. Drawn
// behind the plantings so plants + visiting birds sit in front of the back fence.
function SanctuaryFence() {
  const pickets = []
  for (let x = 14, i = 0; x <= 380; x += 11, i += 1) {
    pickets.push(
      <path
        key={x}
        d={`M${x} 151 V139 L${x + 3} 135 L${x + 6} 139 V151 Z`}
        fill={i % 2 ? '#caa46c' : '#bd9656'}
        stroke="#9c6f44"
        strokeWidth="0.4"
      />,
    )
  }
  const post = (x) => (
    <g>
      <rect x={x - 2.5} y="198" width="5" height="30" rx="2" fill="#a87c46" />
      <path d={`M${x - 3.5} 198 L${x} 192 L${x + 3.5} 198 Z`} fill="#9c6f44" />
    </g>
  )
  return (
    <g className="garden-fence" aria-hidden="true">
      <rect x="10" y="146" width="380" height="3" rx="1.5" fill="#a87c46" opacity="0.9" />
      {pickets}
      {/* side rails sweeping forward to corner posts (a little perspective) */}
      <path d="M15 141 L16 212" stroke="#b5854f" strokeWidth="3" strokeLinecap="round" />
      <path d="M385 141 L384 212" stroke="#b5854f" strokeWidth="3" strokeLinecap="round" />
      {post(16)}
      {post(384)}
    </g>
  )
}

// ---- the page --------------------------------------------------------------
export function GardenPage({ garden, coins, onPlace, onWater, onBack, onBuySanctuary }) {
  const plantings = garden?.plantings || []
  const today = saDateKey()
  const unlocked = GARDEN_SHOP.filter((i) => (garden?.shopUnlocked || []).includes(i.id))
  const svgRef = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  const [placingType, setPlacingType] = useState(null)
  const [ghost, setGhost] = useState(null) // { x, y, ok }
  const selected = plantings.find((p) => p.id === selectedId) || null

  function toScene(evt) {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function onScenePointerMove(evt) {
    if (!placingType) return
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y)
    setGhost({ ...s, ok: canPlaceAt(placingType, s.x, s.y, plantings) })
  }

  function onSceneClick(evt) {
    if (!placingType) return
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y)
    if (!canPlaceAt(placingType, s.x, s.y, plantings)) return
    onPlace(placingType, s.x, s.y)
    setPlacingType(null)
    setGhost(null)
  }

  function startPlacing(itemId) {
    setSelectedId(null)
    setPlacingType(itemId)
    setGhost(null)
  }

  const placingItem = placingType ? gardenItem(placingType) : null

  return (
    <div className="page-grid garden-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">Sandbox · Bird Garden 🌳🧪</p>
        <h2>Pooks&apos; Bird Garden</h2>
        <p className="fine-print">
          Buy an item, then tap the grass to place it wherever you like. Tend it daily to grow it. Sandbox-only. · 🪙 {coins}
        </p>
      </section>

      <section className="soft-card full-span garden-scene-card">
        <svg
          ref={svgRef}
          className={`garden-scene-svg${placingType ? ' placing' : ''}`}
          viewBox="0 0 400 260"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Pooks' bird garden"
          onPointerMove={onScenePointerMove}
          onClick={onSceneClick}
        >
          <defs>
            <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bfe6f2" />
              <stop offset="1" stopColor="#e8f5dc" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="400" height="260" fill="url(#gardenSky)" />
          <circle cx="338" cy="46" r="22" fill="#ffe07a" />
          <g fill="#ffffff" opacity="0.9">
            <ellipse cx="78" cy="42" rx="22" ry="11" />
            <ellipse cx="100" cy="46" rx="16" ry="9" />
          </g>
          <path d="M0 150 q70 -30 160 -12 q90 18 240 -8 V260 H0 Z" fill="#cfe9b6" />
          <path d="M0 186 q110 -22 210 -2 q110 16 190 -6 V260 H0 Z" fill="#8ccb6f" />
          {/* a soft meandering path for charm */}
          <path d="M150 260 C176 224 132 206 178 188 C206 177 196 166 214 158" fill="none" stroke="#e4cf9a" stroke-width="13" stroke-linecap="round" opacity="0.7" />

          {/* sanctuary enclosure (behind the plantings) */}
          {garden?.sanctuary && <SanctuaryFence />}

          {/* faint placement grid while placing */}
          {placingType && (
            <g fill="#3c7a4a" opacity="0.22">
              {(() => {
                const dots = []
                for (let x = GARDEN_REGION.x0; x <= GARDEN_REGION.x1; x += 28) {
                  for (let y = GARDEN_REGION.y0; y <= GARDEN_REGION.y1; y += 20) {
                    dots.push(<circle key={`${x},${y}`} cx={x} cy={y} r="1" />)
                  }
                }
                return dots
              })()}
            </g>
          )}

          {/* plantings, depth-sorted (lower = nearer = drawn in front) */}
          {[...plantings]
            .map((p, i) => ({ p, x: p.x ?? GARDEN_REGION.x0 + 40 + i * 40, y: p.y ?? 200 }))
            .sort((a, b) => a.y - b.y)
            .map(({ p, x, y }) => {
              const thirsty = !isFullyGrown(p) && !wateredToday(p, today)
              const isSel = p.id === selectedId
              return (
                <g
                  key={p.id}
                  className="garden-plant"
                  transform={`translate(${x} ${y})`}
                  onClick={placingType ? undefined : (e) => { e.stopPropagation(); setSelectedId(p.id) }}
                >
                  {isSel && <ellipse cx="0" cy="3" rx="20" ry="6" fill="#ffe07a" opacity="0.55" />}
                  <PlantArt type={p.type} stageKey={plantStageKey(p)} />
                  {thirsty && !placingType && <text className="garden-thirsty" x="0" y="-54" textAnchor="middle">💧</text>}
                  {!placingType && <rect x="-24" y="-58" width="48" height="64" fill="transparent" />}
                </g>
              )
            })}

          {/* placement ghost */}
          {placingType && ghost && (
            <g transform={`translate(${ghost.x} ${ghost.y})`} opacity={ghost.ok ? 0.6 : 0.3} style={{ pointerEvents: 'none' }}>
              {ghost.ok
                ? <PlantArt type={placingType} stageKey={placingItem.stages[0]} />
                : <text x="0" y="2" textAnchor="middle" fontSize="22" fill="#c0392b">⛔</text>}
            </g>
          )}

          {plantings.length === 0 && !placingType && (
            <text x="200" y="120" textAnchor="middle" className="garden-empty-hint">
              Your garden is empty — buy an item below, then tap the grass 🌱
            </text>
          )}
        </svg>
      </section>

      {placingType && (
        <section className="soft-card full-span garden-placing-banner">
          <span>Tap the grass to place your <strong>{placingItem.name} {placingItem.emoji}</strong></span>
          <button className="text-btn" type="button" onClick={() => { setPlacingType(null); setGhost(null) }}>Cancel</button>
        </section>
      )}

      {selected && !placingType && (() => {
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
              <p className="fine-print">Fully grown — it&apos;s a permanent part of the garden.</p>
            ) : watered ? (
              <>
                <p className="fine-print">{item.verb}ed {selected.wateredDays}/{item.waterToGrow} days.</p>
                <button className="secondary-btn" type="button" disabled>{item.verb}ed today — back tomorrow</button>
              </>
            ) : (
              <>
                <p className="fine-print">{item.verb}ed {selected.wateredDays}/{item.waterToGrow} days. Needs tending!</p>
                <button className="primary-btn" type="button" onClick={() => onWater(selected.id)}>{item.verb} 💧</button>
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
            // The Sanctuary Fence is a one-off enclosure, not a placeable plant:
            // buying it flips garden.sanctuary instead of starting placement.
            if (item.kind === 'enclosure') {
              const owned = !!garden?.sanctuary
              return (
                <button
                  key={item.id}
                  className={`garden-shop-btn${owned ? ' owned' : ''}`}
                  type="button"
                  disabled={owned || !afford}
                  onClick={() => onBuySanctuary && onBuySanctuary()}
                >
                  <span className="garden-shop-emoji">{item.emoji}</span>
                  <strong>{item.name}</strong>
                  <small>{owned ? 'Owned ✓' : `${item.cost} 🪙`}</small>
                </button>
              )
            }
            const active = placingType === item.id
            return (
              <button
                key={item.id}
                className={`garden-shop-btn${active ? ' active' : ''}`}
                type="button"
                disabled={!afford && !active}
                onClick={() => (active ? setPlacingType(null) : startPlacing(item.id))}
              >
                <span className="garden-shop-emoji">{item.emoji}</span>
                <strong>{item.name}</strong>
                <small>{item.cost} 🪙</small>
              </button>
            )
          })}
        </div>
        <p className="fine-print">Tip: tap an item, then tap the grass to place it. Use Fast Forward ⏩ to tend it again and grow it while testing.</p>
      </section>
    </div>
  )
}
