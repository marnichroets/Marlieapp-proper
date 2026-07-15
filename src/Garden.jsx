// Bird Garden — sub-phase A UI (gating + handlers live in App.jsx).
// She buys an item, then TAPS the lawn to place it wherever she likes (snapped
// to an invisible grid, no overlap), so every garden is unique. Items grow via
// the daily tap-to-tend care loop. Pure presentation + onPlace/onWater callbacks
// operating on the `garden` slice only.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GARDEN_SHOP,
  GARDEN_TIERS,
  gardenItem,
  isSpeciesPlanting,
  plantStageKey,
  isFullyGrown,
  wateredToday,
  STAGE_LABELS,
  GARDEN_REGION,
  snapToGarden,
  canPlaceAt,
} from './gardenData'
import { saDateKey, saTimePhase } from './saDate'
import { TweetyBird } from './Tweety'
import { tweetyGrowth } from './tweetyData'

// ---- day/night cycle (driven by real SA local time) ------------------------
// Sky gradient stops per phase: golden morning, bright midday, warm sunset,
// dark starry night. Drawn into the existing #gardenSky linearGradient.
const SKY_STOPS = {
  morning: [['0', '#fcd9a3'], ['0.55', '#fde9cf'], ['1', '#eef6da']],
  midday: [['0', '#bfe6f2'], ['1', '#e8f5dc']],
  evening: [['0', '#ff9663'], ['0.5', '#ffb487'], ['1', '#ffd9b0']],
  night: [['0', '#162449'], ['0.6', '#243a63'], ['1', '#33507e']],
}

// A translucent lighting wash over the ground, so grass + plantings read as
// lit by the same morning/sunset/moon light (midday = neutral, no wash).
const GROUND_WASH = {
  morning: { fill: '#ffce85', opacity: 0.14 },
  midday: null,
  evening: { fill: '#ff7a3c', opacity: 0.2 },
  night: { fill: '#16233f', opacity: 0.4 },
}

const PHASE_META = {
  morning: { label: 'Morning', icon: '🌅' },
  midday: { label: 'Midday', icon: '☀️' },
  evening: { label: 'Evening', icon: '🌇' },
  night: { label: 'Night', icon: '🌙' },
}

// Deterministic little PRNG so star/firefly positions are stable across renders
// (no jitter on every re-render) while still looking scattered.
function seededPoints(seed, count, make) {
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return Array.from({ length: count }, () => make(rnd))
}

const NIGHT_STARS = seededPoints(7, 26, (rnd) => ({
  x: 12 + rnd() * 376,
  y: 8 + rnd() * 112,
  r: 0.6 + rnd() * 1.1,
  delay: rnd() * 3,
}))

// ---- creature-scene helpers (random composition each viewing) --------------
const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
const BFLY_HUES = ['#f6a5c0', '#ffd45e', '#c9a8e8', '#f8b4d0', '#9fd6f0']
let _uid = 0
const nid = () => `c${(_uid += 1)}`

// Cheap deterministic string hash — used to give each garden resident its own
// STABLE idle-sway timing (derived from her id, not re-rolled every render).
function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

// A resident's two wander waypoints, in polar form so BOTH the distance from
// home (always 14-24px, never a barely-there twitch) and the angular gap
// between the two points (always 100-260°, so point 2 never lands right on
// top of point 1) are guaranteed — two independent hashed cartesian offsets
// could otherwise both land near zero, or near each other, and read as
// completely frozen (the bug this replaced). Y is flattened to 45% of X so
// she never drifts out of the shallow lawn band.
function residentWanderStyle(id) {
  const angle1 = ((hashSeed(`${id}:wa1`) % 360) * Math.PI) / 180
  const radius1 = 14 + (hashSeed(`${id}:wr1`) % 10)
  const angle2 = angle1 + ((100 + (hashSeed(`${id}:wa2`) % 160)) * Math.PI) / 180
  const radius2 = 14 + (hashSeed(`${id}:wr2`) % 10)
  return {
    '--rwx1': `${Math.cos(angle1) * radius1}px`,
    '--rwy1': `${Math.sin(angle1) * radius1 * 0.45}px`,
    '--rwx2': `${Math.cos(angle2) * radius2}px`,
    '--rwy2': `${Math.sin(angle2) * radius2 * 0.45}px`,
    animationDelay: `${hashSeed(`${id}:wdelay`) % 6}s`,
    animationDuration: `${10 + (hashSeed(`${id}:wdur`) % 8)}s`,
  }
}

// Small classic nest-box species — the Decorative Birdhouse specifically
// draws these when she's collected any, rather than any random land bird.
const NEST_BOX_COMPANIONS = ['weaver', 'sparrow', 'robin']

function pickBird(collection, wantWater, preferNestBox = false) {
  if (!collection || !collection.length) return null
  let pool = collection.filter((b) => (wantWater ? b.water : b.land))
  if (preferNestBox) {
    const nesters = pool.filter((b) => NEST_BOX_COMPANIONS.includes(b.companion))
    if (nesters.length) pool = nesters
  }
  if (!pool.length) pool = collection
  return pool[Math.floor(Math.random() * pool.length)]
}

// The sky: celestial body + clouds/stars for the current phase. The gradient
// itself is set on the scene's #gardenSky fill (stops mapped from SKY_STOPS).
function GardenSky({ phase }) {
  if (phase === 'night') {
    return (
      <g aria-hidden="true">
        <g className="garden-stars">
          {NIGHT_STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fdfbe8" style={{ animationDelay: `${s.delay}s` }} />
          ))}
        </g>
        {/* moon with a soft halo + faint craters */}
        <circle cx="320" cy="50" r="26" fill="#fff7d6" opacity="0.16" />
        <circle cx="320" cy="50" r="16" fill="#f3efcf" />
        <circle cx="314" cy="46" r="3" fill="#e4ddb2" opacity="0.6" />
        <circle cx="325" cy="55" r="2.2" fill="#e4ddb2" opacity="0.55" />
        <circle cx="326" cy="44" r="1.5" fill="#e4ddb2" opacity="0.5" />
      </g>
    )
  }
  if (phase === 'evening') {
    return (
      <g aria-hidden="true">
        {/* a big warm sun sinking toward the horizon */}
        <circle cx="316" cy="86" r="34" fill="#ff9a52" opacity="0.25" />
        <circle cx="316" cy="86" r="24" fill="#ff7e3c" />
        <g fill="#ffffff" opacity="0.5">
          <ellipse cx="92" cy="50" rx="24" ry="11" />
          <ellipse cx="116" cy="54" rx="16" ry="9" />
        </g>
      </g>
    )
  }
  // morning + midday: a sun (lower + golden in the morning) and white clouds.
  const morning = phase === 'morning'
  return (
    <g aria-hidden="true">
      {morning && <circle cx="300" cy="66" r="30" fill="#ffe7a8" opacity="0.35" />}
      <circle cx={morning ? 300 : 338} cy={morning ? 66 : 46} r="22" fill={morning ? '#ffcf6a' : '#ffe07a'} />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="78" cy="42" rx="22" ry="11" />
        <ellipse cx="100" cy="46" rx="16" ry="9" />
      </g>
    </g>
  )
}

// ---- nocturnal wildlife (night-only, mirrors the daytime visitor pattern) --
function OwlArt() {
  return (
    <g>
      <ellipse cx="0" cy="-9" rx="8" ry="10" fill="#8a6f4e" />
      <ellipse cx="0" cy="-6" rx="5.2" ry="7" fill="#cdb288" />
      {/* ear tufts */}
      <path d="M-7 -16 L-3.5 -19.5 L-2.5 -15 Z" fill="#6f5639" />
      <path d="M7 -16 L3.5 -19.5 L2.5 -15 Z" fill="#6f5639" />
      {/* big eyes */}
      <circle cx="-3.4" cy="-13" r="3.1" fill="#fff" />
      <circle cx="3.4" cy="-13" r="3.1" fill="#fff" />
      <circle cx="-3.4" cy="-13" r="1.5" fill="#2a2a2a" />
      <circle cx="3.4" cy="-13" r="1.5" fill="#2a2a2a" />
      {/* beak + feet */}
      <path d="M0 -11.5 L-1.4 -9.5 L1.4 -9.5 Z" fill="#e8a23a" />
      <path d="M-3 0 l0 -2 M3 0 l0 -2" stroke="#e8a23a" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  )
}

function HedgehogArt() {
  const spike = (x, y, a) => <path key={`${x},${y}`} d={`M${x} ${y} l-1.6 -4`} stroke="#5e4528" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${a} ${x} ${y})`} />
  return (
    <g>
      {/* spiky body */}
      <path d="M-12 0 Q-13 -12 0 -13 Q12 -12 11 0 Z" fill="#7a5a3a" />
      {[[-9, -7, -20], [-5, -11, -10], [0, -12.5, 0], [5, -11, 10], [9, -7, 22]].map(([x, y, a]) => spike(x, y, a))}
      {/* face to the right */}
      <ellipse cx="11" cy="-3.5" rx="4.2" ry="3.4" fill="#cdb288" />
      <circle cx="11" cy="-5.2" r="0.9" fill="#2a2a2a" />
      <circle cx="14.4" cy="-3.6" r="1.1" fill="#2a2a2a" />
      {/* little feet */}
      <path d="M-5 0 l0 1.6 M5 0 l0 1.6" stroke="#5e4528" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

// An owl perched on a grown land element, gently swaying (CSS).
function OwlPerch({ c }) {
  return (
    <g className="garden-visitor" transform={`translate(${c.x + 15} ${c.y - 1})`}>
      <ellipse cx="0" cy="2" rx="8" ry="2.6" fill="#16233f" opacity="0.3" />
      <g className="garden-owl" style={{ animationDelay: `${c.delay || 0}s`, animationDuration: `${c.dur || 3.2}s` }}><OwlArt /></g>
    </g>
  )
}

// A hedgehog ambling across the front grass: fixed baseline (outer transform
// attribute), the inner group walks left→right via CSS while its body waddles.
function Hedgehog({ c }) {
  return (
    <g className="garden-visitor" transform="translate(0 228)">
      <g className="garden-hedgehog" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 11.5}s` }}>
        <ellipse cx="0" cy="2" rx="11" ry="2.6" fill="#16233f" opacity="0.3" />
        <g className="garden-hedgehog-body"><HedgehogArt /></g>
      </g>
    </g>
  )
}

// A single firefly glowing + drifting after dark (base point via cx/cy; the
// drift is a small CSS transform, so placement and motion never conflict).
function Firefly({ c }) {
  return (
    <g className="garden-firefly" aria-hidden="true" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}>
      <circle cx={c.x} cy={c.y} r="3.4" fill="#fff6a8" opacity="0.5" />
      <circle cx={c.x} cy={c.y} r="1.4" fill="#fffde0" />
    </g>
  )
}

// A pale moth fluttering high near the moonlight. Outer <g> places it (attr);
// inner <g> drifts (CSS); the wings flap (CSS) — one transform per element.
function Moth({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-moth" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 5}s`, '--flap-dur': `${c.flapDur || 0.3}s`, '--flap-delay': `${c.flapDelay || 0}s` }}>
        <ellipse className="g-wing g-wing-l" cx="-2.4" cy="0" rx="2.9" ry="3.5" fill="#d8d2c0" />
        <ellipse className="g-wing g-wing-r" cx="2.4" cy="0" rx="2.9" ry="3.5" fill="#d8d2c0" />
        <circle cx="0" cy="0" r="1.4" fill="#9a8f76" />
      </g>
    </g>
  )
}

// A bat swooping across the night sky on a fixed traverse path (CSS), wings
// flapping. `dir` flips the crossing direction.
function Bat({ c }) {
  return (
    <g transform={`translate(0 ${c.y})`} aria-hidden="true">
      <g className={`g-bat${c.dir < 0 ? ' g-bat-rev' : ''}`} style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 5.5}s` }}>
        <g className="g-bat-flap">
          <path d="M0 0 Q-7 -6 -13 -2 Q-8 -1 -6 2 Q-3 0 0 0 Q3 0 6 2 Q8 -1 13 -2 Q7 -6 0 0 Z" fill="#2a2740" />
          <circle cx="0" cy="-1" r="2.2" fill="#2a2740" />
        </g>
      </g>
    </g>
  )
}

// A butterfly fluttering near the flowers by day. Outer places it; inner drifts;
// the two wings flap.
function Butterfly({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-flutter" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 6}s`, '--flap-dur': `${c.flapDur || 0.3}s`, '--flap-delay': `${c.flapDelay || 0}s` }}>
        <ellipse className="g-wing g-wing-l" cx="-3.1" cy="0" rx="3.3" ry="4.3" fill={c.hue} />
        <ellipse className="g-wing g-wing-r" cx="3.1" cy="0" rx="3.3" ry="4.3" fill={c.hue} />
        <line x1="0" y1="-3.4" x2="0" y2="3.4" stroke="#5a4632" strokeWidth="1" />
      </g>
    </g>
  )
}

// A bee buzzing near the flower beds — a quick erratic jitter (CSS).
function Bee({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-bee" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 2.4}s` }}>
        <ellipse className="g-bee-wing" cx="0" cy="-1.8" rx="2.2" ry="1.1" fill="#ffffff" opacity="0.75" />
        <ellipse cx="0" cy="0" rx="2.5" ry="1.9" fill="#e8b53a" />
        <rect x="-2.6" y="-1.9" width="1.5" height="3.8" fill="#3a2f24" />
        <rect x="0.4" y="-1.7" width="1.3" height="3.4" fill="#3a2f24" />
      </g>
    </g>
  )
}

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

// --- premium items -----------------------------------------------------------
function WishingWellArt({ stageKey }) {
  const base = <g><ellipse cx="0" cy="0" rx="16" ry="5" fill="#8a8078" /><ellipse cx="0" cy="-8" rx="14" ry="9" fill="#a8a096" /><ellipse cx="0" cy="-9" rx="11" ry="6.5" fill="#1e2a3a" /></g>
  if (stageKey === 'well-base') return base
  const roof = <g><rect x="-13" y="-30" width="2.6" height="20" fill="#9c6f44" /><rect x="10.4" y="-30" width="2.6" height="20" fill="#9c6f44" /><path d="M-16 -30 L0 -42 L16 -30 Z" fill="#b5854f" /><rect x="-3" y="-34" width="6" height="10" fill="#6b4a2a" /></g>
  if (stageKey === 'well-built') return (<g>{base}{roof}</g>)
  return (
    <g className="garden-wishing-well-glow">
      {base}{roof}
      <ellipse cx="0" cy="-9" rx="10" ry="5.6" fill="#5fd0e8" opacity="0.55" />
      {[[-5, -11], [3, -8], [0, -13], [6, -12]].map(([x, y], i) => (
        <circle key={i} className="garden-wishing-sparkle" cx={x} cy={y} r="1" fill="#fff6c8" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </g>
  )
}

function WaterfallArt({ stageKey }) {
  const rocks = <g><ellipse cx="-10" cy="0" rx="9" ry="4" fill="#8a8078" /><ellipse cx="10" cy="1" rx="8" ry="3.6" fill="#9a9088" /></g>
  if (stageKey === 'fall-trickle') return (<g>{rocks}<rect x="-3" y="-14" width="6" height="14" fill="#6fb8d6" opacity="0.7" /><ellipse cx="0" cy="-1" rx="7" ry="3" fill="#6fb8d6" /></g>)
  const cascade = (opacityMul = 1) => (
    <g className="garden-waterfall-flow" opacity={opacityMul}>
      {[-9, -3, 3, 9].map((x, i) => (
        <rect key={i} x={x - 1.6} y="-30" width="3.2" height="30" fill="#6fb8d6" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </g>
  )
  if (stageKey === 'fall-flowing') return (<g>{rocks}{cascade(0.85)}<ellipse cx="0" cy="-1" rx="14" ry="5" fill="#6fb8d6" /><ellipse cx="-4" cy="-3" rx="5" ry="1.8" fill="#a9dcec" opacity="0.7" /></g>)
  return (
    <g>
      <ellipse cx="0" cy="-32" rx="16" ry="5" fill="#8a8078" opacity="0.9" />
      {cascade(1)}
      <ellipse cx="0" cy="-2" rx="20" ry="7" fill="#6fb8d6" />
      <ellipse cx="-6" cy="-5" rx="8" ry="2.6" fill="#a9dcec" opacity="0.7" />
      <ellipse cx="0" cy="-3" rx="12" ry="3" fill="#e8f6fa" opacity="0.5" />
      {rocks}
    </g>
  )
}

function BirdhouseArt({ stageKey }) {
  const post = <rect x="-2" y="-26" width="4" height="26" rx="1.5" fill="#a07a4e" />
  if (stageKey === 'house-frame') return (<g>{post}<rect x="-9" y="-40" width="18" height="14" rx="2" fill="#c8a46c" /></g>)
  const house = <g><rect x="-9" y="-40" width="18" height="14" rx="2" fill="#e8b96a" /><path d="M-11 -40 L0 -50 L11 -40 Z" fill="#c0392b" /><circle cx="0" cy="-33" r="2.6" fill="#5a3a22" /></g>
  if (stageKey === 'house-painted') return (<g>{post}{house}</g>)
  return (
    <g>
      {post}{house}
      <g className="garden-visitor-bob" style={{ animationDuration: '2.1s' }}>
        <circle cx="0" cy="-33" r="2.4" fill="#c98f12" />
        <path d="M1.6 -33 L4 -32.4 L1.6 -31.8 Z" fill="#3a332a" />
      </g>
    </g>
  )
}

function SunsetBenchArt({ stageKey }) {
  if (stageKey === 'sunset-bench-frame') return (<g><rect x="-16" y="-6" width="3" height="6" fill="#a06a3e" /><rect x="13" y="-6" width="3" height="6" fill="#a06a3e" /><rect x="-17" y="-9" width="34" height="3" rx="1.5" fill="#c98650" /></g>)
  return (
    <g>
      <rect x="-16" y="-8" width="3" height="8" fill="#8a5a34" />
      <rect x="13" y="-8" width="3" height="8" fill="#8a5a34" />
      <rect x="-18" y="-11" width="36" height="4" rx="2" fill="#d9954f" />
      <rect x="-16" y="-22" width="3" height="12" fill="#8a5a34" />
      <rect x="13" y="-22" width="3" height="12" fill="#8a5a34" />
      <rect x="-18" y="-22" width="36" height="3.5" rx="1.5" fill="#e8a45c" />
      <rect x="-18" y="-16" width="36" height="3" rx="1.5" fill="#e8a45c" />
      {/* a warm little sunset glow behind it */}
      <ellipse cx="0" cy="-26" rx="14" ry="8" fill="#ff9a52" opacity="0.22" />
    </g>
  )
}

// A real species planting (from the Seed Pouch) grows through the same
// generic sprout/budding SVG art as every other flower while young — only its
// FINAL stage swaps in the actual reference photo of the species she
// identified, via <foreignObject>, the same mechanism already used for the
// graduating-companion placement ghost below.
function SpeciesPhotoArt({ referenceImageUrl }) {
  return (
    <foreignObject x="-26" y="-52" width="52" height="52">
      <div className="garden-species-photo-frame">
        <img className="garden-species-photo" src={referenceImageUrl} alt="" loading="lazy" />
      </div>
    </foreignObject>
  )
}

function PlantArt({ type, stageKey, referenceImageUrl }) {
  if (isSpeciesPlanting(type) && stageKey === 'bloom' && referenceImageUrl) {
    return <SpeciesPhotoArt referenceImageUrl={referenceImageUrl} />
  }
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
    case 'wishing-well': return <WishingWellArt stageKey={stageKey} />
    case 'waterfall': return <WaterfallArt stageKey={stageKey} />
    case 'birdhouse': return <BirdhouseArt stageKey={stageKey} />
    case 'sunset-bench': return <SunsetBenchArt stageKey={stageKey} />
    default: return <FlowerPatchArt stageKey={stageKey} />
  }
}

// A bird from her Collection perched beside a grown element: a small illustrated
// songbird (never a photo) tinted to its species' companion colour, so the scene
// stays consistent with Tweety. Three independent, always-running motions are
// layered so she never looks frozen: a wander loop that hops between a few
// random branch points and pauses at each one (per-instance waypoints, not
// just a shared shape), a quick idle head-twitch, and the little breathing bob.
// Every timing AND every waypoint is randomized per-instance so no two birds
// ever move in lockstep, even when their `dur`s happen to be close.
function PerchBird({ c }) {
  const wanderStyle = {
    '--bx1': `${c.bx1 ?? 10}px`, '--by1': `${c.by1 ?? -6}px`,
    '--bx2': `${c.bx2 ?? -9}px`, '--by2': `${c.by2 ?? -3}px`,
    animationDelay: `${c.hopDelay || 0}s`,
    animationDuration: `${c.hopDur || 9}s`,
  }
  const size = 40
  const portrait = (
    <>
      <g
        className="garden-bird-idle"
        style={{ animationDelay: `${c.idleDelay || 0}s`, animationDuration: `${c.idleDur || 3.4}s` }}
      >
        <g
          className="garden-visitor-bob"
          style={{ animationDelay: `${c.delay || 0}s`, animationDuration: `${c.dur || 1.7}s` }}
        >
          <foreignObject x={-size / 2} y={-size * 0.78} width={size} height={size} style={{ overflow: 'visible' }}>
            <TweetyBird level="crowned" companion={c.companion} size={size} />
          </foreignObject>
        </g>
      </g>
      {c.name && <text className="garden-visitor-name" x="0" y="-30" textAnchor="middle">{c.name}</text>}
    </>
  )
  return (
    <g className="garden-visitor" transform={`translate(${c.x + 15} ${c.y - 1})`}>
      <ellipse className="garden-visitor-shadow" cx="0" cy="2" rx="9" ry="3" fill="#3c5a2e" opacity="0.18" />
      <g className="garden-branch-wander" style={wanderStyle}>
        {portrait}
      </g>
    </g>
  )
}

// A water bird (duck, heron, …) sitting low on the pond, drifting gently side
// to side with a slow bob instead of hopping/flying — a completely different
// feel from the land birds. Per-instance drift range + timing, same as land.
function SwimBird({ c }) {
  const size = 36
  const style = {
    '--sx': `${c.sx ?? 14}px`,
    animationDelay: `${c.delay || 0}s`,
    animationDuration: `${c.dur || 6}s`,
  }
  return (
    <g className="garden-visitor" transform={`translate(${c.x + 15} ${c.y - 1})`}>
      <g className="garden-swim-drift" style={style}>
        <ellipse className="garden-visitor-shadow" cx="0" cy="2.4" rx="8" ry="2.4" fill="#1e4a63" opacity="0.18" />
        <g
          className="garden-bird-idle"
          style={{ animationDelay: `${c.idleDelay || 0}s`, animationDuration: `${c.idleDur || 3.8}s` }}
        >
          <foreignObject x={-size / 2} y={-size * 0.62} width={size} height={size} style={{ overflow: 'visible' }}>
            <TweetyBird level="crowned" companion={c.companion} size={size} />
          </foreignObject>
        </g>
      </g>
      {c.name && <text className="garden-visitor-name" x="0" y="-24" textAnchor="middle">{c.name}</text>}
    </g>
  )
}

// A bird shuttling between two grown elements: outer <g> placed at the start via
// the transform attribute; the inner <g> glides the delta (dx,dy) along an arc
// and back (CSS, alternating), wings flapping. Drawn as a small illustrated bird
// (never a photo), tinted to its species, facing its direction of travel. Per
// instance: glide `dur`/`delay`, arc height `--lift`, and wing-flap `--flap-dur`/
// `--flap-delay` so no two birds fly or flap in sync.
function FlyBird({ c }) {
  const size = 34
  const dx = c.toX - c.fromX
  const dy = c.toY - c.fromY
  const style = {
    '--dx': `${dx}px`,
    '--dy': `${dy}px`,
    '--lift': `${c.lift || 34}px`,
    '--flap-dur': `${c.flapDur || 0.3}s`,
    '--flap-delay': `${c.flapDelay || 0}s`,
    animationDuration: `${c.dur}s`,
    animationDelay: `${c.delay || 0}s`,
  }
  // mirror the silhouette so the bird faces the way it's heading
  const facing = dx < 0 ? 'scale(-1 1)' : undefined
  return (
    <g transform={`translate(${c.fromX + 15} ${c.fromY - 14})`}>
      <g className="g-flybird" style={style}>
        <g transform={facing}>
          <foreignObject x={-size / 2} y={-size * 0.55} width={size} height={size} style={{ overflow: 'visible' }}>
            <TweetyBird level="crowned" companion={c.companion} size={size} />
          </foreignObject>
        </g>
      </g>
    </g>
  )
}

// Dispatch a creature descriptor to its renderer.
function SceneCreature({ c }) {
  switch (c.type) {
    case 'bird': return <PerchBird c={c} />
    case 'swim': return <SwimBird c={c} />
    case 'flybird': return <FlyBird c={c} />
    case 'butterfly': return <Butterfly c={c} />
    case 'bee': return <Bee c={c} />
    case 'firefly': return <Firefly c={c} />
    case 'moth': return <Moth c={c} />
    case 'owl': return <OwlPerch c={c} />
    case 'hedgehog': return <Hedgehog c={c} />
    case 'bat': return <Bat c={c} />
    default: return null
  }
}

// ---- scene composers: pick a fresh, random mix of creatures each viewing -----
// `showcase` (the Preview button) forces a busy scene and synthesises perches so
// birds/owls always have somewhere to land even in a sparse garden.
//
// Every creature descriptor carries its OWN random timing (and, where relevant,
// its own direction/arc) so instances never move in lockstep: independent
// animation `delay` + slightly varied `dur`, plus per-bird flight direction,
// arc height and wing-flap cadence.

// A bird shuttling between two elements, with a random launch end (so direction
// varies L→R / R→L), arc height, speed, start offset and wing-flap cadence.
function makeFlyBird(a, b, bird) {
  const [from, to] = Math.random() < 0.5 ? [a, b] : [b, a]
  return {
    id: nid(), type: 'flybird',
    fromX: from.x, fromY: from.y, toX: to.x, toY: to.y,
    name: bird && bird.name, companion: bird && bird.companion, tint: bird && bird.tint,
    dur: rand(4.5, 8), delay: rand(0, 2.5), lift: rand(24, 46),
    flapDur: rand(0.26, 0.36), flapDelay: rand(0, 0.3),
  }
}

function composeDay(perches, collection, showcase) {
  const list = []
  let land = perches.filter((p) => p.zone !== 'water')
  let all = perches
  if (showcase && land.length < 2) {
    const synth = [{ id: 'demo-l', x: 120, y: 150, zone: 'land' }, { id: 'demo-r', x: 280, y: 150, zone: 'land' }].slice(0, 2 - land.length)
    land = [...land, ...synth]
    all = [...perches, ...synth]
  }
  // 1–4 birds perched at distinct elements, each with its own independent
  // wander waypoints/timing (land) or drift (water) — never in lockstep.
  if (all.length) {
    const maxB = Math.min(showcase ? 4 : 3, all.length)
    const nB = showcase ? maxB : 1 + Math.floor(Math.random() * maxB)
    shuffle(all).slice(0, nB).forEach((p) => {
      const isWater = p.zone === 'water'
      const b = pickBird(collection, isWater, p.zone === 'birdhouse')
      if (isWater) {
        list.push({
          id: nid(), type: 'swim', x: p.x, y: p.y,
          name: b && b.name, companion: b && b.companion, tint: b && b.tint,
          sx: rand(9, 18), delay: rand(0, 3), dur: rand(5, 8),
          idleDelay: rand(0, 4), idleDur: rand(3, 4.6),
        })
        return
      }
      list.push({
        id: nid(), type: 'bird', x: p.x, y: p.y,
        name: b && b.name, companion: b && b.companion, tint: b && b.tint,
        delay: rand(0, 2.6), dur: rand(1.4, 2.1), // little breathing bob
        idleDelay: rand(0, 5), idleDur: rand(2.8, 4.2), // head/wing twitch
        // wander: 2 random branch points within reach, each held briefly
        bx1: rand(6, 15) * (Math.random() < 0.5 ? -1 : 1), by1: rand(-9, -2),
        bx2: rand(6, 15) * (Math.random() < 0.5 ? -1 : 1), by2: rand(-9, -2),
        hopDelay: rand(0, 6), hopDur: rand(9, 15),
      })
    })
  }
  // birds shuttling between trees — each its own pair, direction, arc and speed
  if (land.length >= 2) {
    const nFly = showcase ? 1 + Math.floor(Math.random() * 2) : (Math.random() < 0.6 ? 1 : 0)
    for (let i = 0; i < nFly; i += 1) {
      const [a, b] = shuffle(land).slice(0, 2)
      list.push(makeFlyBird(a, b, pickBird(collection, false)))
    }
  }
  // butterflies near the flowers
  const nBfly = showcase ? 2 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4)
  for (let i = 0; i < nBfly; i += 1) list.push({ id: nid(), type: 'butterfly', x: rand(50, 350), y: rand(150, 214), hue: pick(BFLY_HUES), delay: rand(0, 5), dur: rand(5, 7.5), flapDur: rand(0.26, 0.4), flapDelay: rand(0, 0.35) })
  // bees near the beds
  const nBee = showcase ? 1 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3)
  for (let i = 0; i < nBee; i += 1) list.push({ id: nid(), type: 'bee', x: rand(60, 340), y: rand(166, 218), delay: rand(0, 3), dur: rand(2, 3.1) })
  // never an empty daytime scene
  if (!list.length) list.push({ id: nid(), type: 'butterfly', x: 200, y: 186, hue: pick(BFLY_HUES), delay: 0, dur: rand(5, 7.5), flapDur: rand(0.26, 0.4), flapDelay: 0 })
  return list
}

function composeNight(perches, showcase) {
  const list = []
  let land = perches.filter((p) => p.zone !== 'water')
  if (showcase && !land.length) land = [{ id: 'demo-c', x: 150, y: 150, zone: 'land' }]
  // fireflies — variable density
  const nFly = showcase ? 8 + Math.floor(Math.random() * 6) : 3 + Math.floor(Math.random() * 10)
  for (let i = 0; i < nFly; i += 1) list.push({ id: nid(), type: 'firefly', x: rand(40, 360), y: rand(150, 225), delay: rand(0, 5), dur: rand(5, 9) })
  // an owl, sometimes
  if (land.length && (showcase || Math.random() < 0.55)) { const p = pick(land); list.push({ id: nid(), type: 'owl', x: p.x, y: p.y, delay: rand(0, 3), dur: rand(2.8, 3.8) }) }
  // a hedgehog, sometimes
  if (showcase || Math.random() < 0.5) list.push({ id: nid(), type: 'hedgehog', delay: rand(0, 2), dur: rand(10, 13) })
  // moths near the moonlight
  const nMoth = showcase ? 2 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4)
  for (let i = 0; i < nMoth; i += 1) list.push({ id: nid(), type: 'moth', x: rand(60, 340), y: rand(55, 140), delay: rand(0, 5), dur: rand(4.2, 6), flapDur: rand(0.28, 0.42), flapDelay: rand(0, 0.35) })
  // a bat swooping over, occasionally
  if (showcase || Math.random() < 0.4) list.push({ id: nid(), type: 'bat', y: rand(40, 95), delay: rand(0, 2.5), dur: rand(4.8, 6.8), dir: Math.random() < 0.5 ? 1 : -1 })
  return list
}

// ---- the page --------------------------------------------------------------
export function GardenPage({
  garden,
  coins,
  collection = [],
  onPlace,
  onWater,
  onBack,
  tweety = null,
  seeds = 0,
  plantableSpecies = [],
}) {
  const plantings = useMemo(() => garden?.plantings || [], [garden])
  const residents = garden?.residents || []
  const today = saDateKey()
  const unlocked = GARDEN_SHOP.filter((i) => (garden?.shopUnlocked || []).includes(i.id))
  const svgRef = useRef(null)

  // Time-of-day phase from real SA local time; refreshed on an interval and when
  // the tab regains focus so it rolls over (e.g. into night) while the page is open.
  const [phase, setPhase] = useState(() => saTimePhase())
  useEffect(() => {
    const tick = () => setPhase(saTimePhase())
    const iv = window.setInterval(tick, 60000)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      window.clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])
  const isNight = phase === 'night'

  const [selectedId, setSelectedId] = useState(null)
  const [selectedResidentId, setSelectedResidentId] = useState(null)
  const [placingType, setPlacingType] = useState(null)
  // Display-only info for a species placement (commonName/referenceImageUrl):
  // gardenItem(type) can't know these from the type string alone, so they ride
  // alongside placingType purely for the "tap the grass..." hint + ghost art.
  const [placingSpeciesMeta, setPlacingSpeciesMeta] = useState(null)
  const [ghost, setGhost] = useState(null) // { x, y, ok }
  const selected = plantings.find((p) => p.id === selectedId) || null
  const selectedResident = residents.find((r) => r.id === selectedResidentId) || null

  // Wishing Well: tapping it once fully grown plays a one-off sparkle burst,
  // on top of the normal selection. Cleared automatically after it plays.
  const [wishBurst, setWishBurst] = useState(null) // { id, x, y }
  useEffect(() => {
    if (!wishBurst) return undefined
    const t = window.setTimeout(() => setWishBurst(null), 1400)
    return () => window.clearTimeout(t)
  }, [wishBurst])

  // Fully-grown elements with a habitat zone are perches birds can visit (P2).
  const grownPerches = useMemo(
    () =>
      plantings
        .map((p) => ({ p, item: gardenItem(p.type) }))
        .filter(({ p, item }) => item && item.zone && isFullyGrown(p))
        .map(({ p }) => ({ id: p.id, x: p.x ?? 0, y: p.y ?? 0, zone: gardenItem(p.type).zone })),
    [plantings],
  )

  // The garden is alive with a fresh, random MIX of creatures each viewing —
  // several at once, layered together (a bird hopping in a tree, fireflies
  // drifting, a hedgehog ambling, …). The composition is re-rolled on mount, on
  // a slow interval (so it keeps changing while open), and whenever day↔night
  // flips. `rollNow` (exposed via a ref) lets the Preview button re-roll on
  // demand with a richer "showcase" scene. Daytime and nighttime draw from
  // different creature pools, so it never feels the same twice.
  const [creatures, setCreatures] = useState([])
  const rollRef = useRef(() => {})
  useEffect(() => {
    let alive = true
    const roll = (showcase = false) => {
      if (!alive) return
      setCreatures(isNight ? composeNight(grownPerches, showcase) : composeDay(grownPerches, collection, showcase))
    }
    rollRef.current = roll
    const t0 = setTimeout(() => roll(false), 0)        // initial scene (deferred)
    const iv = window.setInterval(() => roll(false), 16000) // keep it shifting
    return () => { alive = false; clearTimeout(t0); window.clearInterval(iv) }
  }, [grownPerches, collection, isNight])

  // Sunset Bench: Tweety sometimes visits and sits a while — re-rolled on the
  // same cadence as the rest of the living scene, so it isn't a fixed timer.
  const sunsetBench = useMemo(
    () => plantings.find((p) => p.type === 'sunset-bench' && isFullyGrown(p)) || null,
    [plantings],
  )
  const [tweetyRolledAtBench, setTweetyRolledAtBench] = useState(false)
  useEffect(() => {
    if (!sunsetBench || !tweety?.companion) return undefined
    let alive = true
    const roll = () => { if (alive) setTweetyRolledAtBench(Math.random() < 0.4) }
    const t0 = setTimeout(roll, 0)
    const iv = window.setInterval(roll, 16000)
    return () => { alive = false; clearTimeout(t0); window.clearInterval(iv) }
  }, [sunsetBench, tweety?.companion])
  const tweetyAtBench = Boolean(sunsetBench && tweety?.companion && tweetyRolledAtBench)

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
    const ok = canPlaceAt(placingType, s.x, s.y, plantings)
    setGhost({ ...s, ok })
  }

  function onSceneClick(evt) {
    if (!placingType) return
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y)
    if (!canPlaceAt(placingType, s.x, s.y, plantings)) return
    onPlace(placingType, s.x, s.y)
    setPlacingType(null)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacing(itemId) {
    setSelectedId(null)
    setPlacingType(itemId)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacingSpecies(speciesKey, commonName, referenceImageUrl) {
    setSelectedId(null)
    setPlacingType(`species:${speciesKey}`)
    setPlacingSpeciesMeta({ commonName, referenceImageUrl })
    setGhost(null)
  }

  const placingItem = placingType ? gardenItem(placingType) : null
  const placingAny = Boolean(placingType)

  return (
    <div className="page-grid garden-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">Bird Garden 🌳</p>
        <h2>Pooks&apos; Bird Garden</h2>
        <p className="fine-print">
          Buy an item, then tap the grass to place it wherever you like. Tend it daily to grow it. · 🪙 {coins}
        </p>
        <p className="fine-print garden-time-note">
          Garden time: <strong>{PHASE_META[phase].label} {PHASE_META[phase].icon}</strong> · live South African time
        </p>
      </section>

      <section className="soft-card full-span garden-scene-card">
        <div className="garden-scene-wrap">
        <svg
          ref={svgRef}
          className={`garden-scene-svg${placingAny ? ' placing' : ''}`}
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
              {SKY_STOPS[phase].map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="400" height="260" fill="url(#gardenSky)" />
          <GardenSky phase={phase} />
          <path d="M0 150 q70 -30 160 -12 q90 18 240 -8 V260 H0 Z" fill="#cfe9b6" />
          <path d="M0 186 q110 -22 210 -2 q110 16 190 -6 V260 H0 Z" fill="#8ccb6f" />
          {/* a soft meandering path for charm */}
          <path d="M150 260 C176 224 132 206 178 188 C206 177 196 166 214 158" fill="none" stroke="#e4cf9a" strokeWidth="13" strokeLinecap="round" opacity="0.7" />

          {/* faint placement grid while placing */}
          {placingAny && (
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
                  onClick={placingAny ? undefined : (e) => {
                    e.stopPropagation()
                    setSelectedId(p.id)
                    if (p.type === 'wishing-well' && isFullyGrown(p)) setWishBurst({ id: p.id, x, y })
                  }}
                >
                  {isSel && <ellipse cx="0" cy="3" rx="20" ry="6" fill="#ffe07a" opacity="0.55" />}
                  <PlantArt type={p.type} stageKey={plantStageKey(p)} referenceImageUrl={p.referenceImageUrl} />
                  {!placingAny && (
                    <text className="garden-visitor-name garden-plant-name" x="0" y="-46" textAnchor="middle">
                      {p.commonName || gardenItem(p.type)?.name}
                    </text>
                  )}
                  {thirsty && !placingAny && <text className="garden-thirsty" x="0" y="-54" textAnchor="middle">💧</text>}
                  {!placingAny && <rect x="-24" y="-58" width="48" height="64" fill="transparent" />}
                </g>
              )
            })}

          {/* Wishing Well sparkle burst — a one-off flourish, not a loop */}
          {wishBurst && (
            <g transform={`translate(${wishBurst.x} ${wishBurst.y - 10})`} style={{ pointerEvents: 'none' }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                return (
                  <circle
                    key={i}
                    className="garden-wish-burst-spark"
                    cx="0" cy="0" r="2.4" fill="#fff6c8"
                    style={{ '--wx': `${Math.cos(angle) * 30}px`, '--wy': `${Math.sin(angle) * 30 - 14}px`, animationDelay: `${i * 0.02}s` }}
                  />
                )
              })}
              <text x="0" y="-24" textAnchor="middle" fontSize="20" className="garden-wish-burst-heart">💫</text>
            </g>
          )}

          {/* time-of-day lighting wash over the ground (plantings read as lit) */}
          {GROUND_WASH[phase] && (
            <rect x="0" y="120" width="400" height="140" fill={GROUND_WASH[phase].fill} opacity={GROUND_WASH[phase].opacity} style={{ pointerEvents: 'none' }} />
          )}

          {/* the living scene: a random mix of creatures, all at once, layered
              in front of the plantings (birds, butterflies, bees by day;
              fireflies, owl, hedgehog, moths, a bat by night) */}
          {!placingAny && creatures.map((c) => <SceneCreature key={c.id} c={c} />)}

          {/* placement ghost: a garden item while placingType */}
          {placingAny && ghost && (
            <g transform={`translate(${ghost.x} ${ghost.y})`} opacity={ghost.ok ? 0.6 : 0.3} style={{ pointerEvents: 'none' }}>
              {ghost.ok
                ? <PlantArt type={placingType} stageKey={placingItem.stages[0]} referenceImageUrl={placingSpeciesMeta?.referenceImageUrl} />
                : <text x="0" y="2" textAnchor="middle" fontSize="22" fill="#c0392b">⛔</text>}
            </g>
          )}

          {plantings.length === 0 && !placingAny && (
            <text x="200" y="120" textAnchor="middle" className="garden-empty-hint">
              Your garden is empty — buy an item below, then tap the grass 🌱
            </text>
          )}
        </svg>

        {/* Graduated companions live here permanently, rendered as their real
            species. HTML overlay positioned over the scene (TweetyBird is an
            HTML/SVG widget, not a scene <g>); the scene keeps its 400×260 box so
            scene coords map straight to percentages. */}
        {residents.length > 0 && (
          <div className="garden-residents">
            {residents.map((r) => {
              // Stable per-resident timing (not re-randomized every render): a
              // cheap hash of the id seeds delay/duration so she never looks
              // frozen, and no two residents ever sway in lockstep.
              const seed = hashSeed(r.id)
              // She also wanders around her home spot — two guaranteed-visible,
              // per-resident waypoints (never leaving/entering perfectly in
              // sync with any other resident) via the same seeded-hash trick.
              const wanderStyle = residentWanderStyle(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  className="garden-resident"
                  style={{ left: `${(r.x / 400) * 100}%`, top: `${(r.y / 260) * 100}%` }}
                  title={r.species}
                  onClick={() => setSelectedResidentId(r.id)}
                >
                  <span className="garden-resident-wander" style={wanderStyle}>
                    <span
                      className="garden-resident-sway"
                      style={{ animationDelay: `${seed % 4}s`, animationDuration: `${3.4 + (seed % 5) * 0.3}s` }}
                    >
                      <TweetyBird level="crowned" companion={r.companionId} size={44} />
                    </span>
                    <span className="garden-resident-name">{r.name}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Sunset Bench: Tweety herself, sometimes, sitting a while. Same HTML-
            overlay approach as residents (TweetyBird isn't a scene <g>). */}
        {tweetyAtBench && sunsetBench && (
          <div className="garden-residents" aria-hidden="true">
            <span
              className="garden-resident"
              style={{ left: `${(sunsetBench.x / 400) * 100}%`, top: `${((sunsetBench.y - 14) / 260) * 100}%` }}
              title={`${tweety?.name || 'Tweety'} is enjoying the sunset`}
            >
              <span className="garden-resident-sway" style={{ animationDuration: '4.2s' }}>
                <TweetyBird level={tweetyGrowth(tweety).key} companion={tweety.companion} size={38} />
              </span>
            </span>
          </div>
        )}
        </div>
        <div className="garden-demo-row">
          <button
            className="secondary-btn garden-demo-btn"
            type="button"
            onClick={() => rollRef.current(true)}
            disabled={placingAny}
          >
            Preview Garden Life 🎬
          </button>
          <span className="fine-print">Fills the scene with a busy, random mix of {isNight ? 'night' : 'day'} creatures. Tap again for a different combination.</span>
        </div>
      </section>

      {placingType && (
        <section className="soft-card full-span garden-placing-banner">
          <span>
            Tap the grass to place your{' '}
            <strong>
              {placingSpeciesMeta?.commonName || placingItem.name}{' '}
              {placingSpeciesMeta ? '🌱' : placingItem.emoji}
            </strong>
          </span>
          <button
            className="text-btn"
            type="button"
            onClick={() => { setPlacingType(null); setPlacingSpeciesMeta(null); setGhost(null) }}
          >
            Cancel
          </button>
        </section>
      )}

      {selectedResident && !placingAny && (
        <section className="soft-card full-span garden-detail garden-resident-detail">
          <div className="section-heading">
            <div>
              <p className="eyebrow">🪶 {selectedResident.name}</p>
              <h3>{selectedResident.species}</h3>
            </div>
            <button className="text-btn" type="button" onClick={() => setSelectedResidentId(null)}>Close</button>
          </div>
          <p className="fine-print">
            {selectedResident.name} · Raised from chick
            {selectedResident.bornAt && selectedResident.releasedAt
              ? ` for ${Math.max(1, Math.round((new Date(selectedResident.releasedAt) - new Date(selectedResident.bornAt)) / 86400000))} days`
              : ''}
            {' · '}
            {selectedResident.releasedAt ? new Date(selectedResident.releasedAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'released'}
            {' · '}
            {selectedResident.species}
          </p>
        </section>
      )}

      {selected && !placingAny && (() => {
        const item = gardenItem(selected.type)
        const grown = isFullyGrown(selected)
        const watered = wateredToday(selected, today)
        return (
          <section className="soft-card full-span garden-detail">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{item.emoji} {selected.commonName || item.name}</p>
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

      <section className="soft-card full-span garden-seed-pouch">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seed Pouch</p>
            <h3>{seeds} seed{seeds === 1 ? '' : 's'} 🌱</h3>
          </div>
        </div>
        {plantableSpecies.length === 0 ? (
          <p className="fine-print">
            {seeds > 0
              ? 'All your discovered species are already planted — scan a new one to earn another seed.'
              : 'Discover a new plant species to earn your first seed 🌿'}
          </p>
        ) : (
          <>
            <p className="fine-print">Tap a species below, then tap the grass to plant it — it grows into the real thing you photographed.</p>
            <div className="garden-shop-row">
              {plantableSpecies.map((species) => {
                const active = placingType === `species:${species.speciesKey}`
                const disabled = seeds <= 0 && !active
                return (
                  <button
                    key={species.speciesKey}
                    className={`garden-shop-btn${active ? ' active' : ''}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (active) {
                        setPlacingType(null)
                        setPlacingSpeciesMeta(null)
                      } else {
                        startPlacingSpecies(species.speciesKey, species.commonName, species.referenceImageUrl)
                      }
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
                    <small>1 seed 🌱</small>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="soft-card full-span garden-shop">
        <p className="eyebrow">Garden shop 🌱</p>
        {GARDEN_TIERS.map((tier) => {
          const items = unlocked.filter((item) => item.tier === tier.id)
          if (!items.length) return null
          return (
            <div key={tier.id} className="garden-shop-tier">
              <p className="garden-shop-tier-heading">
                {tier.label} <span className="garden-shop-tier-range">{tier.range}</span>
              </p>
              <div className="garden-shop-row">
                {items.map((item) => {
                  const afford = coins >= item.cost
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
            </div>
          )
        })}
        <p className="fine-print">Tip: tap an item, then tap the grass to place it. Use Fast Forward ⏩ to tend it again and grow it while testing.</p>
      </section>
    </div>
  )
}
