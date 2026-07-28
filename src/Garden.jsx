// Bird Garden — sub-phase A UI (gating + handlers live in App.jsx).
// She buys an item, then TAPS the lawn to place it wherever she likes (snapped
// to an invisible grid, no overlap), so every garden is unique. Items grow via
// the daily tap-to-tend care loop. Pure presentation + onPlace/onWater callbacks
// operating on the `garden` slice only.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GARDEN_SHOP,
  GARDEN_TIERS,
  GARDEN_EXPANSIONS,
  expansionItem,
  RESIDENT_TREAT_COST,
  SEED_PLANT_COST,
  WISHING_WELL_COINS,
  gardenItem,
  isSpeciesPlanting,
  plantStageKey,
  isFullyGrown,
  treeHasNest,
  wateredToday,
  canWish,
  STAGE_LABELS,
  GARDEN_REGION,
  gardenViewBox,
  gardenRegions,
  gardenZoneRect,
  snapToGarden,
  canPlaceAt,
} from './gardenData'
import { saDateKey, saTimePhase } from './saDate'
import { TweetyBird } from './Tweety'
import { tweetyGrowth } from './tweetyData'
import { SA_PLANT_LIBRARY, plantBloomKind, plantBloomColor, plantFoliageColor } from './plantData'
import { GardenBird } from './birdTemplates'
import { BIRD_COLOUR_MAP } from './birdColourMap'
import { GardenPlant } from './plantTemplates'
import { PLANT_COLOUR_MAP } from './plantColourMap'

// ---- day/night cycle (driven by real SA local time) ------------------------
// Sky gradient stops per phase: golden morning, bright midday, warm sunset,
// dark starry night. Drawn into the existing #gardenSky linearGradient.
const SKY_STOPS = {
  morning: [['0', '#fcd9a3'], ['0.55', '#fde9cf'], ['1', '#eef6da']],
  midday: [['0', '#bfe6f2'], ['1', '#e8f5dc']],
  evening: [['0', '#ff9663'], ['0.5', '#ffb487'], ['1', '#ffd9b0']],
  night: [['0', '#162449'], ['0.6', '#243a63'], ['1', '#33507e']],
}

// A hazy, desaturated ridge line far behind the two proper ground layers —
// atmospheric perspective (distance reads as cooler/lighter/less saturated)
// so the scene has real depth instead of two flat bands of green. Paired
// with a soft horizon-haze wash blending the sky into it.
const DISTANT_HILLS = { morning: '#e6cd9e', midday: '#cbe0d2', evening: '#e8b088', night: '#202f52' }
const HORIZON_HAZE = { morning: '#ffe6b8', midday: '#eef7ec', evening: '#ffc294', night: '#2c4270' }

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

// Depth-based scale for an item's Y position on the ground plane: further
// back (near GARDEN_REGION.y0) reads slightly smaller, nearer the viewer
// (near GARDEN_REGION.y1) slightly larger — simple atmospheric-perspective
// cue, multiplicative with each item's own size, not a replacement for it.
// Clamped so anything outside the plantable band (e.g. a fixed-baseline
// creature) still gets a sane 0.85-1.15 value instead of extrapolating.
function depthScale(y) {
  const t = (y - GARDEN_REGION.y0) / (GARDEN_REGION.y1 - GARDEN_REGION.y0)
  return 0.85 + Math.max(0, Math.min(1, t)) * 0.3
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
      {/* .garden-owl animates `transform` itself (sway), so the depth scale
          goes on this extra inner, non-animated wrapper instead — a static
          transform attribute here would just get overridden by the sway. */}
      <g className="garden-owl" style={{ animationDelay: `${c.delay || 0}s`, animationDuration: `${c.dur || 3.2}s` }}>
        <g transform={`scale(${depthScale(c.y)})`}><OwlArt /></g>
      </g>
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
        {/* Fixed baseline (y=228, near the front) — same non-animated-wrapper
            reasoning as OwlPerch above. */}
        <g className="garden-hedgehog-body">
          <g transform={`scale(${depthScale(228)})`}><HedgehogArt /></g>
        </g>
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
// Three iconic SA tree looks, picked deterministically per planting (so the
// same tree always looks the same, but different plantings vary): a fever
// tree's yellow-green bark and feathery pale canopy, a marula's grey bark and
// rounded green canopy, a wild fig's dark, dense canopy.
const TREE_VARIANTS = {
  fever: { bark: '#9fae5a', canopy: '#7bc9a8' },
  marula: { bark: '#9a948a', canopy: '#6fae5e' },
  fig: { bark: '#6b5a42', canopy: '#3d6b3f' },
}
function treeVariantFor(seed) {
  const keys = Object.keys(TREE_VARIANTS)
  if (!seed) return TREE_VARIANTS.marula
  let h = 0
  const s = String(seed)
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TREE_VARIANTS[keys[h % keys.length]]
}

function TreeArt({ stageKey, seed }) {
  const { bark, canopy } = treeVariantFor(seed)
  if (stageKey === 'seedling') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-9" stroke={canopy} strokeWidth="2" strokeLinecap="round" /><ellipse cx="-3.4" cy="-9" rx="3" ry="1.5" fill={canopy} transform="rotate(-28 -3.4 -9)" /><ellipse cx="3.4" cy="-9" rx="3" ry="1.5" fill={canopy} transform="rotate(28 3.4 -9)" /></g>)
  if (stageKey === 'sapling') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><rect x="-1.5" y="-22" width="3" height="22" rx="1.5" fill={bark} /><circle cx="0" cy="-25" r="10" fill={canopy} /><circle cx="-4" cy="-27" r="6" fill={canopy} opacity="0.9" /></g>)
  if (stageKey === 'young') return (<g><ellipse cx="0" cy="0" rx="10" ry="3.4" fill="#7a5a3a" /><rect x="-2.5" y="-34" width="5" height="34" rx="2" fill={bark} /><circle cx="0" cy="-38" r="16" fill={canopy} /><circle cx="-7" cy="-40" r="9" fill={canopy} opacity="0.9" /></g>)
  return (<g><ellipse cx="0" cy="0" rx="12" ry="4" fill="#7a5a3a" /><rect x="-3.5" y="-44" width="7" height="44" rx="3" fill={bark} /><ellipse cx="0" cy="-50" rx="24" ry="20" fill={canopy} /><ellipse cx="-14" cy="-46" rx="14" ry="12" fill={canopy} opacity="0.92" /><ellipse cx="14" cy="-46" rx="13" ry="11" fill={canopy} opacity="0.8" /><ellipse cx="-7" cy="-59" rx="9" ry="5.5" fill="#bdeeb0" opacity="0.35" /></g>)
}

function PineArt({ stageKey }) {
  if (stageKey === 'pine-sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -16 L-6 -2 L6 -2 Z" fill="url(#gardenPineFoliage)" /></g>)
  if (stageKey === 'pine-small') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><rect x="-2" y="-10" width="4" height="10" fill="url(#gardenWood)" /><path d="M0 -30 L-11 -10 L11 -10 Z" fill="url(#gardenPineFoliage)" /><path d="M0 -22 L-9 -6 L9 -6 Z" fill="url(#gardenPineFoliage)" opacity="0.9" /></g>)
  return (<g><ellipse cx="0" cy="0" rx="9" ry="3.4" fill="#7a5a3a" /><rect x="-2.5" y="-12" width="5" height="12" fill="url(#gardenWood)" /><path d="M0 -48 L-14 -26 L14 -26 Z" fill="url(#gardenPineFoliage)" /><path d="M0 -36 L-13 -16 L13 -16 Z" fill="url(#gardenPineFoliage)" opacity="0.92" /><path d="M0 -24 L-11 -8 L11 -8 Z" fill="url(#gardenPineFoliage)" opacity="0.85" /><path d="M-3 -46 L3 -46 L0 -40 Z" fill="#8fd68a" opacity="0.4" /></g>)
}

// A small woven twig nest — purely decorative, no eggs (see treeHasNest in
// gardenData.js). Positioned per tree type to sit naturally in the branches:
// tucked into the right canopy lobe for the leafy tree, into the lowest
// (widest) tier for the pine.
const NEST_SPOT = { 'tree-seed': { x: 18, y: -41 }, 'pine-seed': { x: 7, y: -21 } }
function NestArt() {
  return (
    <g aria-hidden="true">
      <ellipse cx="0" cy="1.4" rx="8.6" ry="3.2" fill="#8a6a42" opacity="0.9" />
      <ellipse cx="0" cy="0" rx="8.6" ry="4" fill="#a9825a" />
      <ellipse cx="0" cy="-0.6" rx="6.2" ry="2.6" fill="#7a5a38" />
      <path d="M-7.5 -0.4 Q0 -4.8 7.5 -0.4" stroke="#6a4e30" strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M-6.4 1.2 Q0 -2.2 6.4 1.2" stroke="#6a4e30" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
    </g>
  )
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
  const post = (x) => <rect x={x - 2} y="-22" width="4" height="22" rx="1.5" fill="url(#gardenWood)" />
  if (stageKey === 'fence-post') return (<g>{post(0)}</g>)
  if (stageKey === 'fence-rail') return (<g>{post(-12)}{post(12)}<rect x="-14" y="-16" width="28" height="3.5" rx="1.5" fill="url(#gardenWood)" /></g>)
  return (<g>{post(-14)}{post(0)}{post(14)}<rect x="-16" y="-17" width="32" height="3.5" rx="1.5" fill="url(#gardenWood)" /><rect x="-16" y="-9" width="32" height="3.5" rx="1.5" fill="url(#gardenWood)" /></g>)
}

function FeederArt({ stageKey }) {
  if (stageKey === 'feeder-post') return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="url(#gardenWood)" /></g>)
  if (stageKey === 'feeder-tray') return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="url(#gardenWood)" /><rect x="-12" y="-30" width="24" height="5" rx="2" fill="#caa46c" /></g>)
  return (<g><rect x="-2" y="-30" width="4" height="30" rx="2" fill="url(#gardenWood)" /><rect x="-13" y="-28" width="26" height="5" rx="2" fill="#caa46c" /><path d="M-15 -28 L0 -42 L15 -28 Z" fill="url(#gardenWood)" /><circle cx="-5" cy="-25" r="1.4" fill="#6b4a2a" /><circle cx="3" cy="-25" r="1.4" fill="#6b4a2a" /></g>)
}

function PondArt({ stageKey }) {
  if (stageKey === 'pond-puddle') return (<g><ellipse cx="0" cy="-2" rx="16" ry="7" fill="url(#gardenWater)" /><ellipse cx="-4" cy="-4" rx="6" ry="2" fill="#e4f6fb" opacity="0.8" /></g>)
  if (stageKey === 'pond-small') return (<g><ellipse cx="0" cy="-2" rx="26" ry="11" fill="url(#gardenWater)" /><ellipse cx="-7" cy="-5" rx="10" ry="3" fill="#e4f6fb" opacity="0.7" /></g>)
  return (<g><ellipse cx="0" cy="-2" rx="34" ry="14" fill="url(#gardenWater)" /><ellipse cx="-9" cy="-6" rx="13" ry="4" fill="#e4f6fb" opacity="0.7" /><ellipse cx="10" cy="4" rx="9" ry="2.6" fill="#2f6a86" opacity="0.22" /><g stroke="#5a9e4e" strokeWidth="2.4" strokeLinecap="round"><line x1="-30" y1="-4" x2="-32" y2="-16" /><line x1="-24" y1="-2" x2="-22" y2="-14" /><line x1="30" y1="-4" x2="32" y2="-15" /></g></g>)
}

function StonePathArt({ stageKey }) {
  if (stageKey === 'path-laying') return (<g><ellipse cx="-7" cy="0" rx="6" ry="3" fill="#9a9088" /><ellipse cx="7" cy="-2" rx="5" ry="2.6" fill="#b0a89e" /><ellipse cx="1" cy="2" rx="5" ry="2.2" fill="#8a6a46" opacity="0.5" /></g>)
  return (<g>{[[-13, 2], [-4, -0.5], [5, -2.5], [13, -4.5]].map(([x, y], i) => (<g key={i}><ellipse cx={x} cy={y} rx="6" ry="3" fill="#9a9088" /><ellipse cx={x - 1.4} cy={y - 0.8} rx="3" ry="1.4" fill="#bdb6ac" opacity="0.8" /></g>))}</g>)
}

function RockGardenArt({ stageKey }) {
  const rocks = (<g><ellipse cx="0" cy="0" rx="15" ry="5.5" fill="#8a8078" /><ellipse cx="-6" cy="-3" rx="6.5" ry="4.5" fill="#9a9088" /><ellipse cx="6" cy="-2.5" rx="5.5" ry="4" fill="#a8a096" /></g>)
  if (stageKey === 'rock-bare') return rocks
  // Real succulent tones: blue-grey, silver-green, and a reddish-tipped one —
  // never plain garden green.
  const succ = (x, y, c, tip) => (<g><circle cx={x} cy={y} r="3" fill={c} /><circle cx={x} cy={y} r="1.3" fill={tip} /></g>)
  return (
    <g>
      {rocks}
      {succ(-6, -6, '#7a95a0', '#c8dde0')}
      {succ(6, -5, '#8fae8a', '#d8e8c8')}
      {succ(0, -3.5, '#a8685c', '#e0a898')}
    </g>
  )
}

function VegPatchArt({ stageKey }) {
  const soil = <g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" /><ellipse cx="0" cy="-2" rx="16" ry="4" fill="#8a6a46" /></g>
  if (stageKey === 'veg-soil') return (<g>{soil}{[-10, 0, 10].map((x, i) => <line key={i} x1={x} y1="-4.5" x2={x} y2="0" stroke="#6b4f30" strokeWidth="1.5" />)}</g>)
  if (stageKey === 'veg-sprouts') return (<g>{soil}{[-12, -4, 4, 12].map((x, i) => (<g key={i}><line x1={x} y1="-3" x2={x} y2="-10" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><ellipse cx={x - 2} cy="-10" rx="2.6" ry="1.3" fill="#6cb86f" transform={`rotate(-30 ${x - 2} -10)`} /></g>))}</g>)
  return (<g>{soil}{[-12, -4, 4, 12].map((x, i) => (<g key={i}><path d={`M${x} -3 V-13`} stroke="#4f9a55" strokeWidth="2" strokeLinecap="round" /><path d={`M${x - 3} -11 L${x} -15 L${x + 3} -11`} fill="none" stroke="#5aa861" strokeWidth="1.6" strokeLinecap="round" /><path d={`M${x - 2} -3 L${x} 2 L${x + 2} -3 Z`} fill="#e8893a" /></g>))}</g>)
}

function ShrubArt({ stageKey }) {
  if (stageKey === 'shrub-sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><circle cx="0" cy="-13" r="4" fill="#6cb86f" /></g>)
  const bush = <g><ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" /><circle cx="0" cy="-16" r="14" fill="url(#gardenCanopy)" /><circle cx="-8" cy="-12" r="9" fill="url(#gardenCanopy)" opacity="0.92" /><circle cx="8" cy="-13" r="8" fill="url(#gardenCanopy)" opacity="0.82" /></g>
  if (stageKey === 'shrub-bush') return bush
  const f = [[-9, -20, '#f6a5c0'], [0, -26, '#ffd45e'], [9, -18, '#c9a8e8'], [-3, -12, '#f8b4d0'], [6, -24, '#fff0b3']]
  return (<g>{bush}{f.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="3" fill={c} />)}</g>)
}

function BenchArt({ stageKey }) {
  if (stageKey === 'bench-frame') return (<g><rect x="-16" y="-6" width="3" height="6" fill="url(#gardenWood)" /><rect x="13" y="-6" width="3" height="6" fill="url(#gardenWood)" /><rect x="-17" y="-9" width="34" height="3" rx="1.5" fill="url(#gardenWood)" /></g>)
  return (<g><rect x="-16" y="-8" width="3" height="8" fill="url(#gardenWood)" /><rect x="13" y="-8" width="3" height="8" fill="url(#gardenWood)" /><rect x="-18" y="-11" width="36" height="4" rx="2" fill="#caa46c" /><rect x="-16" y="-22" width="3" height="12" fill="url(#gardenWood)" /><rect x="13" y="-22" width="3" height="12" fill="url(#gardenWood)" /><rect x="-18" y="-22" width="36" height="3.5" rx="1.5" fill="#b5854f" /><rect x="-18" y="-16" width="36" height="3" rx="1.5" fill="#b5854f" /></g>)
}

function BirdBathArt({ stageKey }) {
  const ped = <g><ellipse cx="0" cy="0" rx="10" ry="3.4" fill="url(#gardenStone)" /><rect x="-3" y="-16" width="6" height="16" fill="url(#gardenStone)" /><rect x="-3.5" y="-16" width="7" height="3" fill="#b8b2a8" /></g>
  if (stageKey === 'bath-base') return ped
  if (stageKey === 'bath-bowl') return (<g>{ped}<ellipse cx="0" cy="-18" rx="13" ry="5" fill="url(#gardenStone)" /><ellipse cx="0" cy="-19" rx="10" ry="3.4" fill="#a39c92" /></g>)
  return (<g>{ped}<ellipse cx="0" cy="-18" rx="13" ry="5" fill="url(#gardenStone)" /><ellipse cx="0" cy="-19" rx="10" ry="3.4" fill="url(#gardenWater)" /><ellipse cx="-3" cy="-20" rx="4" ry="1.4" fill="#e4f6fb" opacity="0.8" /></g>)
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
  const base = <g><ellipse cx="0" cy="0" rx="16" ry="5" fill="url(#gardenStone)" /><ellipse cx="0" cy="-8" rx="14" ry="9" fill="url(#gardenStone)" /><ellipse cx="0" cy="-9" rx="11" ry="6.5" fill="#1e2a3a" /></g>
  if (stageKey === 'well-base') return base
  const roof = <g><rect x="-13" y="-30" width="2.6" height="20" fill="url(#gardenWood)" /><rect x="10.4" y="-30" width="2.6" height="20" fill="url(#gardenWood)" /><path d="M-16 -30 L0 -42 L16 -30 Z" fill="url(#gardenWood)" /><rect x="-3" y="-34" width="6" height="10" fill="#6b4a2a" /></g>
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
  const rocks = <g><ellipse cx="-10" cy="0" rx="9" ry="4" fill="url(#gardenStone)" /><ellipse cx="10" cy="1" rx="8" ry="3.6" fill="url(#gardenStone)" /></g>
  if (stageKey === 'fall-trickle') return (<g>{rocks}<rect x="-3" y="-14" width="6" height="14" fill="url(#gardenWater)" opacity="0.8" /><ellipse cx="0" cy="-1" rx="7" ry="3" fill="url(#gardenWater)" /></g>)
  const cascade = (opacityMul = 1) => (
    <g className="garden-waterfall-flow" opacity={opacityMul}>
      {[-9, -3, 3, 9].map((x, i) => (
        <rect key={i} x={x - 1.6} y="-30" width="3.2" height="30" fill="url(#gardenWater)" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </g>
  )
  if (stageKey === 'fall-flowing') return (<g>{rocks}{cascade(0.85)}<ellipse cx="0" cy="-1" rx="14" ry="5" fill="url(#gardenWater)" /><ellipse cx="-4" cy="-3" rx="5" ry="1.8" fill="#e4f6fb" opacity="0.8" /></g>)
  return (
    <g>
      <ellipse cx="0" cy="-32" rx="16" ry="5" fill="url(#gardenStone)" opacity="0.9" />
      {cascade(1)}
      <ellipse cx="0" cy="-2" rx="20" ry="7" fill="url(#gardenWater)" />
      <ellipse cx="-6" cy="-5" rx="8" ry="2.6" fill="#e4f6fb" opacity="0.75" />
      <ellipse cx="0" cy="-3" rx="12" ry="3" fill="#f4fbfd" opacity="0.5" />
      {rocks}
    </g>
  )
}

function BirdhouseArt({ stageKey }) {
  const post = <rect x="-2" y="-26" width="4" height="26" rx="1.5" fill="url(#gardenWood)" />
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
// generic sprout/budding SVG art as every other flower while young — its
// FINAL stage renders the species-accurate illustrated GardenPlant template
// (see plantTemplates.jsx). Three tiers, most-accurate first:
//  1. A curated SA_PLANT_LIBRARY species (matched by commonName) with a
//     hand-researched real-colour entry in PLANT_COLOUR_MAP — exact template
//     + exact colours.
//  2. Anything else (most real plantings: she identifies whatever she
//     actually photographs, not just the 207 SA species catalogued for the
//     Explore/Magazine tab) — reuse plantBloomKind's keyword/family
//     classifier to still pick the closest-shaped template (a Monstera still
//     reads as a big-leaved climber, a Moth Orchid still reads as a showy
//     single bloom), tinted with plantBloomColor/plantFoliageColor.
//  3. Truly unclassifiable — flowering-shrub in plain generic green.
// No photos, ever — the garden stays one consistent hand-drawn illustrated
// world throughout every stage.
const GENERIC_PLANT_ZONES = {
  stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
  petal: '#f5f0e0', center: '#f2c230', soil: '#7a5a3a',
}

// plantBloomKind's shape vocabulary doesn't map 1:1 onto plantTemplates.jsx's
// 12 illustrated templates (there's no dedicated orchid/houseplant/fynbos
// template shape) — this picks the closest visual match for each, mirroring
// how those same species read in the hand-curated PLANT_COLOUR_MAP entries
// (e.g. Red Disa, an orchid, is templated as 'bulb-flower'; Bird of Paradise,
// a strelitzia, is also 'bulb-flower').
const BLOOM_KIND_TEMPLATE = {
  aloe: 'aloe',
  protea: 'protea',
  agapanthus: 'bulb-flower',
  bulbine: 'bulb-flower',
  strelitzia: 'bulb-flower',
  succulent: 'succulent',
  orchid: 'bulb-flower',
  palm: 'palm',
  houseplant: 'climbing-vine',
  fynbos: 'herb',
  generic: 'flowering-shrub',
}

// Default real-world-proportion scale per template, so a ground-cover mat
// and a full-grown tree don't render as the same size sprite. Overridden
// per-species in PLANT_COLOUR_MAP/PERSONAL_PLANT_COLOUR_MAP (via `scale`)
// only where a species' real size is a clear outlier for its template shape
// (e.g. the 'aloe' template spans tiny spiral-aloe rosettes to towering
// mountain-aloe stems) — most species just take this default.
const TEMPLATE_SCALE = {
  'ground-cover': 0.7,
  succulent: 0.75,
  herb: 0.8,
  fern: 0.8,
  'grass-tuft': 0.85,
  'flowering-shrub': 1,
  'bulb-flower': 1,
  protea: 1,
  aloe: 1,
  'climbing-vine': 0.8,
  palm: 1.15,
  'tree-small': 1.25,
}

// A lighter shade of a hex colour, for the template's secondary/back-layer
// foliage zone — plantFoliageColor only gives one foliage tone, but every
// template wants two (front/back layers) so the plant reads as textured
// instead of flat.
function lightenHex(hex, amount = 0.35) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const mix = (v) => Math.round(v + (255 - v) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const SPECIES_BY_COMMON_NAME = new Map(
  SA_PLANT_LIBRARY.map((p) => [p.commonName.trim().toLowerCase(), p]),
)

// Same deterministic-hash idea as PLANT_COLOUR_MAP's own generated section
// (see that file's header) — a species that isn't curated still gets a
// shape distinct from its template-mates instead of every fallback plant
// reading as one identical clone, keyed on her own name for it so it's
// stable across renders/reloads.
function fallbackVariation(seedKey) {
  const unit = (salt) => (hashSeed(`${seedKey}:${salt}`) % 1000) / 1000
  const between = (salt, lo, hi) => lo + unit(salt) * (hi - lo)
  return {
    leafCount: Math.round(between('leafCount', 3, 8)),
    leafAngle: Math.round(between('leafAngle', 30, 90)),
    leafWidth: Math.round(between('leafWidth', 0.8, 1.3) * 10) / 10,
    height: Math.round(between('height', 0.75, 1.3) * 10) / 10,
    flowerCount: Math.round(between('flowerCount', 2, 8)),
    flowerSize: Math.round(between('flowerSize', 0.7, 1.2) * 10) / 10,
    hasStem: unit('hasStem') < 0.5,
  }
}

// Pooks' actual real-world plantings (from her Seed Pouch photo IDs) that
// aren't part of the curated 207-species SA_PLANT_LIBRARY — checked by exact
// common name, same idea as PLANT_COLOUR_MAP but for her personal houseplant
// collection instead of the SA Explore/Magazine catalog. Keeps
// plantBloomKind's keyword guessing as the fallback for anything NOT listed
// here, rather than growing that catalog with non-SA species.
const PERSONAL_PLANT_COLOUR_MAP = {
  'splendid paphiopedilum': {
    template: 'bulb-flower',
    zones: { stem: '#4f7a52', leafMain: '#2f6a3a', leafSecondary: '#4a8a4a', petal: '#7a2f3a', center: '#d8c860', soil: '#7a5a3a' },
    variation: { leafCount: 2, leafWidth: 1.3, height: 0.7, flowerCount: 1, flowerSize: 1.3 },
  },
  monstera: {
    // Real Monstera deliciosa is bushy and wide (big leaves radiating from a
    // low base), not a climbing vine as typically grown/potted — flowering-
    // shrub's filled leaf-clumps (flowerCount:0, no blooms) reads as a leafy
    // bush far better than climbing-vine's thin-stem-with-leaves shape.
    template: 'flowering-shrub',
    zones: { stem: '#5f7a45', leafMain: '#2f6a3a', leafSecondary: '#4f9a55', petal: '#e8ead0', center: '#e8c060', soil: '#6b5638' },
    variation: { leafCount: 8, leafWidth: 1.5, height: 1.25, flowerCount: 0, flowerSize: 1 },
  },
  'air plant': {
    template: 'succulent',
    zones: { stem: '#8a9a7a', leafMain: '#9fae8a', leafSecondary: '#c3d0b0', petal: '#a878c9', center: '#e8a0c0', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 90, leafWidth: 0.6, height: 0.6, flowerCount: 1, flowerSize: 0.6, hasStem: false },
  },
  'elephant bush': {
    template: 'succulent',
    zones: { stem: '#8a5a3a', leafMain: '#4a8a5a', leafSecondary: '#6aa86a', petal: '#f0a8c0', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 60, leafWidth: 0.75, height: 0.9, flowerCount: 0, flowerSize: 0.6, hasStem: true },
  },
  'moth orchid': {
    template: 'bulb-flower',
    zones: { stem: '#5a6a4a', leafMain: '#2f6a3a', leafSecondary: '#4a8a4a', petal: '#d17ad6', center: '#7a2f6a', soil: '#6b5638' },
    variation: { leafCount: 2, leafWidth: 1.2, height: 0.85, flowerCount: 5, flowerSize: 1.2 },
  },
  'easter lily': {
    // Template was already right — the "thin stick with a star on top" look
    // came from a too-tall, too-narrow variation. Shorter + wider leaves reads
    // as a proper medium trumpet-flowered plant instead. That fix alone still
    // read too prominent next to the shrubs (flowerSize 1.5 + default scale) —
    // toned the bloom down and capped the overall size a notch below a shrub.
    template: 'bulb-flower',
    scale: 0.85,
    zones: { stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5e9a5a', petal: '#fbfaf3', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 4, leafWidth: 1.6, height: 0.9, flowerCount: 1, flowerSize: 1 },
  },
  succulent: {
    template: 'succulent',
    zones: { stem: '#8a6a42', leafMain: '#4a2f42', leafSecondary: '#6a4a5e', petal: '#f2e090', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 75, leafWidth: 1, height: 1, flowerCount: 2, flowerSize: 0.8, hasStem: true },
  },
  'blue fingers': {
    // Real Blue Chalksticks/Blue fingers (Curio/Senecio) trails and spreads
    // rather than forming an upright rosette — matches how the same species
    // ("blue-chalk-sticks") is already classified in the main SA library.
    template: 'ground-cover',
    zones: { stem: '#8a9a8a', leafMain: '#8fa3ad', leafSecondary: '#b8cdd6', petal: '#f5f0e0', center: '#e8d896', soil: '#7a5a3a' },
    variation: { leafCount: 7, leafAngle: 55, leafWidth: 0.55, height: 0.85, flowerCount: 1, flowerSize: 0.6, hasStem: true },
  },
  'bushveld kalanchoe': {
    // Template stays succulent — real Kalanchoe sexangularis is an upright
    // branching succulent shrub rather than a flat rosette, so give it a
    // visible stem and a taller habit instead of reassigning templates.
    template: 'succulent',
    zones: { stem: '#6a8a5a', leafMain: '#5a9a5a', leafSecondary: '#7cb87c', petal: '#e8663a', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 5, leafAngle: 65, leafWidth: 1.1, height: 1.05, flowerCount: 10, flowerSize: 0.7, hasStem: true },
  },
  'french rose': {
    template: 'flowering-shrub',
    zones: { stem: '#6b7d4a', leafMain: '#3f7a45', leafSecondary: '#5e9a5a', petal: '#e8789e', center: '#f2c230', soil: '#7a5a3a' },
    variation: { leafCount: 6, leafAngle: 55, leafWidth: 1, height: 1, flowerCount: 10, flowerSize: 1, hasStem: true },
  },
  'queen palm': {
    template: 'palm',
    zones: { stem: '#a88a5a', leafMain: '#4f9a55', leafSecondary: '#7bc9a8', petal: '#c9a25a', center: '#e8a45c', soil: '#7a5a3a' },
    variation: { leafCount: 8, leafAngle: 100, leafWidth: 1.05, height: 1.2, flowerCount: 2, flowerSize: 1 },
  },
  philodendron: {
    // This is P. bipinnatifidum — a self-heading bushy philodendron with huge
    // leaves radiating from a low base, not a climbing vine. flowering-shrub
    // (filled leaf-clumps) is a better fit than herb, whose thin sprig-line
    // leaves would read even less like a big-leaved aroid than the vine did.
    template: 'flowering-shrub',
    zones: { stem: '#5f7a45', leafMain: '#356b3d', leafSecondary: '#4f9a55', petal: '#e8ead0', center: '#e8c060', soil: '#6b5638' },
    variation: { leafCount: 7, leafWidth: 1.6, height: 1.15, flowerCount: 0, flowerSize: 1 },
  },
  // NOTE: key must match the exact commonName Pooks' actual planting carries
  // ("White bird of-paradise tree" — that odd "bird of-paradise" punctuation,
  // not the more standard "bird-of-paradise", is what her identified species
  // record actually contains). A prior version of this key used the more
  // grammatically standard hyphenation and silently never matched her real
  // planting, falling through to the generic classifier instead.
  //
  // This is Strelitzia nicolai — the exact same species as "Wild Banana" in
  // the main SA library (see plantColourMap.js's 'wild-banana' entry), which
  // is already correctly templated as palm (tall stalks, big paddle leaves,
  // tree-like) rather than bulb-flower. Reassigned here to match, and no
  // custom `scale` override — it takes palm's plain TEMPLATE_SCALE default,
  // same as Wild Banana.
  'white bird of-paradise tree': {
    template: 'palm',
    zones: { stem: '#5f7a52', leafMain: '#2f6a3a', leafSecondary: '#4f9a55', petal: '#f5f0e0', center: '#3a2a6a', soil: '#7a5a3a' },
    variation: { leafCount: 3, leafWidth: 1.4, height: 1.3, flowerCount: 1, flowerSize: 1.3, hasStem: true },
  },
}

function plantVisual(commonName, family) {
  const species = commonName && SPECIES_BY_COMMON_NAME.get(String(commonName).trim().toLowerCase())
  const curated = species && PLANT_COLOUR_MAP[species.id]
  if (curated) {
    return {
      template: curated.template, zones: curated.zones, variation: curated.variation,
      scale: curated.scale ?? TEMPLATE_SCALE[curated.template] ?? 1,
    }
  }

  const personal = commonName && PERSONAL_PLANT_COLOUR_MAP[String(commonName).trim().toLowerCase()]
  if (personal) {
    return {
      template: personal.template, zones: personal.zones, variation: personal.variation,
      scale: personal.scale ?? TEMPLATE_SCALE[personal.template] ?? 1,
    }
  }

  const kind = plantBloomKind(commonName, family)
  const seedKey = commonName || family
  if (kind === 'generic' && !seedKey) {
    return { template: 'flowering-shrub', zones: GENERIC_PLANT_ZONES, variation: {}, scale: TEMPLATE_SCALE['flowering-shrub'] }
  }
  const leafMain = plantFoliageColor(commonName, family)
  const template = BLOOM_KIND_TEMPLATE[kind] || 'flowering-shrub'
  return {
    template,
    zones: {
      stem: kind === 'aloe' || kind === 'succulent' ? '#8a9a7a' : '#6b5638',
      leafMain,
      leafSecondary: lightenHex(leafMain),
      petal: plantBloomColor(commonName, family),
      center: kind === 'protea' ? '#3d2a22' : '#f2c230',
      soil: '#7a5a3a',
    },
    variation: fallbackVariation(seedKey),
    scale: TEMPLATE_SCALE[template] ?? 1,
  }
}

// Final "flowering" stage keys — used to layer a subtle bloom-pulse on top of
// the base idle sway (see the plantings render loop below). Deliberately
// narrow: only stages that are an actual flush of flowers, not every
// fully-grown plant (succulents, ripe veggies etc. don't "bloom").
const FLOWERING_STAGES = new Set(['bloom', 'bed-full', 'shrub-bloom'])

function PlantArt({ type, stageKey, family, commonName, seed }) {
  if (isSpeciesPlanting(type) && stageKey === 'bloom') {
    const { template, zones, variation, scale } = plantVisual(commonName, family)
    // size scales by the species' real-world proportions (see TEMPLATE_SCALE
    // and per-species overrides in plantVisual) — the anchor point (bottom
    // centre, via the x/y offsets below) stays fixed, so only the sprite's
    // visual size changes, not its placement in the bed.
    const size = 50 * (scale ?? 1)
    return (
      <foreignObject x={-size / 2} y={-size * 1.22} width={size} height={size * 1.3} style={{ overflow: 'visible' }}>
        <GardenPlant template={template} zones={zones} size={size} variation={variation} />
      </foreignObject>
    )
  }
  switch (type) {
    case 'tree-seed': return <TreeArt stageKey={stageKey} seed={seed} />
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

// The active tap-to-reveal name label: a small rounded pill behind the text
// so one name reads cleanly against the busy scene, instead of the old raw
// white-stroked text floating in mid-air. Width is a cheap character-count
// estimate (SVG has no auto-sizing text background short of measureText/
// foreignObject, which is overkill for a short species/plant name).
function GardenNameLabel({ text, y }) {
  if (!text) return null
  const w = Math.max(26, text.length * 4.4 + 10)
  return (
    <g className="garden-name-label">
      <rect x={-w / 2} y={y - 7.5} width={w} height={10} rx="5" />
      <text className="garden-visitor-name" x="0" y={y} textAnchor="middle">{text}</text>
    </g>
  )
}

// Generic fallback zones for a garden visitor whose species isn't in
// BIRD_COLOUR_MAP yet (uncatalogued, or an old save with no species id) —
// a plain brown/grey songbird rather than defaulting to Tweety's cartoon look.
const GENERIC_BIRD_ZONES = {
  head: '#8a7b63', beak: '#4a433d', eye: '#2b2117', body: '#7c6e58',
  breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47',
}

// Resolves a garden visitor's species id to a real template + colour zones,
// falling back to a generic songbird-small when the species hasn't been
// catalogued in BIRD_COLOUR_MAP (see birdColourMap.js).
function birdVisual(speciesId) {
  const entry = speciesId && BIRD_COLOUR_MAP[speciesId]
  if (entry) return { template: entry.template, zones: entry.zones }
  return { template: 'songbird-small', zones: GENERIC_BIRD_ZONES }
}

// A bird from her Collection perched beside a grown element: a species-accurate
// illustrated bird (never a photo), rendered from its BIRD_COLOUR_MAP entry so
// the scene shows the real species instead of a generic mascot. Three
// independent, always-running motions are layered so she never looks frozen: a
// wander loop that hops between a few random branch points and pauses at each
// one (per-instance waypoints, not just a shared shape), a quick idle
// head-twitch, and the little breathing bob. Every timing AND every waypoint
// is randomized per-instance so no two birds ever move in lockstep, even when
// their `dur`s happen to be close.
function PerchBird({ c, active, setActiveLabelId }) {
  const wanderStyle = {
    '--bx1': `${c.bx1 ?? 10}px`, '--by1': `${c.by1 ?? -6}px`,
    '--bx2': `${c.bx2 ?? -9}px`, '--by2': `${c.by2 ?? -3}px`,
    // Custom properties, so the leg-step animation (deep inside GardenBird's
    // nested <svg> — see .garden-bird-walking .bird-leg-a/-b in App.css) can
    // read this element's own timing regardless of how many levels down it is.
    '--wander-dur': `${c.hopDur || 9}s`,
    '--wander-delay': `${c.hopDelay || 0}s`,
    animationDelay: `${c.hopDelay || 0}s`,
    animationDuration: `${c.hopDur || 9}s`,
  }
  const size = 40
  const { template, zones } = birdVisual(c.speciesId)
  // The branch/perch line under a bird's feet (see GardenBird's `ground`
  // prop) should only draw when she's actually standing on a real surface —
  // a branch, a feeder tray, a bench seat (see PERCH_Y_OFFSET, the same set
  // of items that get a raised perch position for the same reason). Any
  // other planting (flower bed, veg patch, shrub, fence, birdhouse, …) is
  // ground level — a floating branch bar there looked like she was standing
  // on a plank.
  const hasPerchSurface = Object.prototype.hasOwnProperty.call(PERCH_Y_OFFSET, c.itemId)
  // She's actually travelling between waypoints only when on the normal
  // branch-to-branch wander — not while seated on the bench, and not while
  // roosting for the night (composeNight zeroes the waypoints but still runs
  // the same wander animation, just with nowhere to go). Legs only step, and
  // the body only holds still instead of idle-wobbling, in this case.
  const walking = !c.benchsit && !c.roosting
  // Tap-to-reveal name label (see activeLabelId in GardenPage): sets, never
  // toggles, so a touch device's synthetic pre-click mouseenter can't flicker
  // it straight back off on the first tap.
  const onClick = setActiveLabelId ? (e) => { e.stopPropagation(); setActiveLabelId(c.id) } : undefined
  const onMouseEnter = setActiveLabelId ? () => setActiveLabelId(c.id) : undefined
  const onMouseLeave = setActiveLabelId
    ? () => setActiveLabelId((cur) => (cur === c.id ? null : cur))
    : undefined
  const portrait = (
    <>
      <g
        className={walking ? 'garden-bird-idle-walk' : 'garden-bird-idle'}
        style={
          walking
            // Same clock as the wander/hop below (not the independent
            // idleDelay/idleDur), so the gated idle-walk keyframe's hold
            // windows land exactly where the body is actually holding still.
            ? { animationDelay: `${c.hopDelay || 0}s`, animationDuration: `${c.hopDur || 9}s` }
            : { animationDelay: `${c.idleDelay || 0}s`, animationDuration: `${c.idleDur || 3.4}s` }
        }
      >
        <g
          className="garden-visitor-bob"
          style={{ animationDelay: `${c.delay || 0}s`, animationDuration: `${c.dur || 1.7}s` }}
        >
          {/* Feeder-only, occasional: a few quick head-dips at the tray, once,
              after a random delay — layered on a child <g> so it never fights
              the ever-running bob/idle animations on its ancestors. */}
          <g
            className={c.peck ? 'garden-bird-peck' : undefined}
            style={c.peck ? { animationDelay: `${c.peckDelay ?? 2}s` } : undefined}
          >
            <g transform={`scale(${depthScale(c.y)})`}>
              <foreignObject x={-size / 2} y={-size * 0.634} width={size} height={size * 0.742} style={{ overflow: 'visible' }}>
                <GardenBird template={template} zones={zones} size={size} ground={hasPerchSurface} />
              </foreignObject>
            </g>
          </g>
        </g>
      </g>
      {active && <GardenNameLabel text={c.name} y={-30} />}
    </>
  )
  return (
    <g
      className="garden-visitor"
      transform={`translate(${c.x + 15} ${c.y - 1})`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ellipse className="garden-visitor-shadow" cx="0" cy="2" rx="9" ry="3" fill="#3c5a2e" opacity="0.26" />
      {/* Bench-only, occasional: she hops up once on arrival and then sits —
          no branch-to-branch wander while seated, unlike a normal perch.
          garden-bird-walking (see App.css) scopes the leg-step animation to
          the .bird-leg-a/-b elements nested deep inside — off for benchsit
          and roosting, on for the normal wander. */}
      <g
        className={`${c.benchsit ? 'garden-bench-perch' : 'garden-branch-wander'}${walking ? ' garden-bird-walking' : ''}`}
        style={c.benchsit ? undefined : wanderStyle}
      >
        {portrait}
      </g>
    </g>
  )
}

// A water bird (duck, heron, …) sitting low on the pond, drifting gently side
// to side with a slow bob instead of hopping/flying — a completely different
// feel from the land birds. Per-instance drift range + timing, same as land.
function SwimBird({ c, active, setActiveLabelId }) {
  const size = 36
  const { template, zones } = birdVisual(c.speciesId)
  const style = {
    '--sx': `${c.sx ?? 14}px`,
    animationDelay: `${c.delay || 0}s`,
    animationDuration: `${c.dur || 6}s`,
  }
  const onClick = setActiveLabelId ? (e) => { e.stopPropagation(); setActiveLabelId(c.id) } : undefined
  const onMouseEnter = setActiveLabelId ? () => setActiveLabelId(c.id) : undefined
  const onMouseLeave = setActiveLabelId
    ? () => setActiveLabelId((cur) => (cur === c.id ? null : cur))
    : undefined
  return (
    <g
      className="garden-visitor"
      transform={`translate(${c.x + 15} ${c.y - 1})`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <g className="garden-swim-drift" style={style}>
        <ellipse className="garden-visitor-shadow" cx="0" cy="2.4" rx="8" ry="2.4" fill="#1e4a63" opacity="0.24" />
        <g
          className="garden-bird-idle"
          style={{ animationDelay: `${c.idleDelay || 0}s`, animationDuration: `${c.idleDur || 3.8}s` }}
        >
          {/* Bird-bath-only, occasional: a proper dip-ruffle-settle splash,
              once, after a random delay — see garden-bird-peck above for why
              this lives on its own child <g>. */}
          <g
            className={c.splash ? 'garden-bird-splash' : undefined}
            style={c.splash ? { animationDelay: `${c.splashDelay ?? 2}s` } : undefined}
          >
            <g transform={`scale(${depthScale(c.y)})`}>
              <foreignObject x={-size / 2} y={-size * 0.634} width={size} height={size * 0.742} style={{ overflow: 'visible' }}>
                <GardenBird template={template} zones={zones} size={size} />
              </foreignObject>
            </g>
          </g>
        </g>
      </g>
      {active && <GardenNameLabel text={c.name} y={-24} />}
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
  const { template, zones } = birdVisual(c.speciesId)
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
          {/* A slight nose-up gliding attitude, applied INSIDE the facing
              mirror above so it always reads as "nose up" rather than
              flipping to "nose down" when the bird is heading left. Legs
              are hidden and the wing flaps (see GardenBird's `flying` prop
              and .bird-wing-flap in App.css) instead of the whole body
              wobbling the way a perched bird's idle twitch does. */}
          <g className="garden-bird-flight-tilt">
            <foreignObject x={-size / 2} y={-size * 0.634} width={size} height={size * 0.742} style={{ overflow: 'visible' }}>
              <GardenBird template={template} zones={zones} size={size} ground={false} flying />
            </foreignObject>
          </g>
        </g>
      </g>
    </g>
  )
}

// Dispatch a creature descriptor to its renderer.
function SceneCreature({ c, activeLabelId, setActiveLabelId }) {
  switch (c.type) {
    case 'bird': return <PerchBird c={c} active={activeLabelId === c.id} setActiveLabelId={setActiveLabelId} />
    case 'swim': return <SwimBird c={c} active={activeLabelId === c.id} setActiveLabelId={setActiveLabelId} />
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

// A bird visiting a bench/feeder/tree renders at that item's own placement
// anchor (p.x, p.y) — which is ground level, where the item's art draws its
// base/legs from. Left alone, she'd stand on the ground beside the bench
// instead of sitting on its seat. This nudges her up onto the actual seat
// rail / feeder tray / lower branch, read off each art function's own local
// coordinates (see BenchArt/FeederArt/TreeArt/PineArt above). Anything not
// listed (flower beds, the fence, etc.) gets no offset — ground-level plants
// already look right without one.
const PERCH_Y_OFFSET = {
  bench: -13, // BenchArt's seat plank sits at y=-11; a hair above reads as "on" it
  feeder: -29, // FeederArt's tray surface is at y=-28
  'tree-seed': -38, // a lower branch inside TreeArt's mature canopy (trunk top is y=-44)
  'pine-seed': -26, // a mid-tier branch inside PineArt's mature foliage
}
const perchY = (p) => p.y + (PERCH_Y_OFFSET[p.itemId] || 0)

// A bird shuttling between two elements, with a random launch end (so direction
// varies L→R / R→L), arc height, speed, start offset and wing-flap cadence.
function makeFlyBird(a, b, bird) {
  const [from, to] = Math.random() < 0.5 ? [a, b] : [b, a]
  return {
    id: nid(), type: 'flybird',
    fromX: from.x, fromY: perchY(from), toX: to.x, toY: perchY(to),
    name: bird && bird.name, companion: bird && bird.companion, tint: bird && bird.tint,
    speciesId: bird && bird.id,
    dur: rand(4.5, 8), delay: rand(0, 2.5), lift: rand(24, 46),
    flapDur: rand(0.26, 0.36), flapDelay: rand(0, 0.3),
    idleDelay: rand(0, 5), idleDur: rand(2.8, 4.2),
  }
}

function composeDay(perches, collection, showcase, bounds = { x0: 26, x1: 374 }) {
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
    const maxB = Math.min(showcase ? 5 : 4, all.length)
    const nB = showcase ? maxB : 1 + Math.floor(Math.random() * maxB)
    shuffle(all).slice(0, nB).forEach((p) => {
      const isWater = p.zone === 'water'
      const b = pickBird(collection, isWater, p.zone === 'birdhouse')
      if (isWater) {
        // At a bird bath specifically (not the pond/waterfall), she
        // occasionally dips in for a proper splash — never every visit, so
        // it still reads as a real choice rather than a scripted loop.
        const splash = p.itemId === 'bird-bath' && Math.random() < 0.4
        list.push({
          id: nid(), type: 'swim', x: p.x, y: p.y,
          name: b && b.name, companion: b && b.companion, tint: b && b.tint,
          speciesId: b && b.id,
          sx: rand(9, 18), delay: rand(0, 3), dur: rand(5, 8),
          idleDelay: rand(0, 4), idleDur: rand(3, 4.6),
          splash, splashDelay: rand(2, 9),
        })
        return
      }
      // At the feeder she occasionally pecks; at the bench she occasionally
      // hops up and sits a while (no branch-to-branch wander while seated —
      // she's settled, not foraging). Both are just-sometimes, same spirit
      // as the splash above.
      const peck = p.itemId === 'feeder' && Math.random() < 0.4
      const benchsit = p.itemId === 'bench' && Math.random() < 0.5
      list.push({
        id: nid(), type: 'bird', x: p.x, y: perchY(p), itemId: p.itemId,
        name: b && b.name, companion: b && b.companion, tint: b && b.tint,
        speciesId: b && b.id,
        delay: rand(0, 2.6), dur: rand(1.4, 2.1), // little breathing bob
        idleDelay: rand(0, 5), idleDur: rand(2.8, 4.2), // head/wing twitch
        // wander: 2 random branch points within reach, each held briefly
        bx1: rand(6, 15) * (Math.random() < 0.5 ? -1 : 1), by1: rand(-9, -2),
        bx2: rand(6, 15) * (Math.random() < 0.5 ? -1 : 1), by2: rand(-9, -2),
        hopDelay: rand(0, 6), hopDur: rand(9, 15),
        peck, peckDelay: rand(2, 9),
        benchsit,
      })
    })
  }
  // birds shuttling between trees — each its own pair, direction, arc and speed
  if (land.length >= 2) {
    const nFly = showcase
      ? 1 + Math.floor(Math.random() * 2)
      : Math.random() < 0.65
        ? (land.length >= 4 && Math.random() < 0.3 ? 2 : 1)
        : 0
    for (let i = 0; i < nFly; i += 1) {
      const [a, b] = shuffle(land).slice(0, 2)
      list.push(makeFlyBird(a, b, pickBird(collection, false)))
    }
  }
  // butterflies near the flowers — scattered across the full unlocked width
  const nBfly = showcase ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5)
  for (let i = 0; i < nBfly; i += 1) list.push({ id: nid(), type: 'butterfly', x: rand(bounds.x0 + 24, bounds.x1 - 24), y: rand(150, 214), hue: pick(BFLY_HUES), delay: rand(0, 5), dur: rand(5, 7.5), flapDur: rand(0.26, 0.4), flapDelay: rand(0, 0.35) })
  // bees near the beds
  const nBee = showcase ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 4)
  for (let i = 0; i < nBee; i += 1) list.push({ id: nid(), type: 'bee', x: rand(bounds.x0 + 34, bounds.x1 - 34), y: rand(166, 218), delay: rand(0, 3), dur: rand(2, 3.1) })
  // never an empty daytime scene
  if (!list.length) list.push({ id: nid(), type: 'butterfly', x: (bounds.x0 + bounds.x1) / 2, y: 186, hue: pick(BFLY_HUES), delay: 0, dur: rand(5, 7.5), flapDur: rand(0.26, 0.4), flapDelay: 0 })
  return list
}

function composeNight(perches, collection, showcase, bounds = { x0: 26, x1: 374 }) {
  const list = []
  let land = perches.filter((p) => p.zone !== 'water')
  if (showcase && !land.length) land = [{ id: 'demo-c', x: 150, y: 150, zone: 'land' }]
  // fireflies — variable density, across the full unlocked width
  const nFly = showcase ? 8 + Math.floor(Math.random() * 6) : 4 + Math.floor(Math.random() * 11)
  for (let i = 0; i < nFly; i += 1) list.push({ id: nid(), type: 'firefly', x: rand(bounds.x0 + 14, bounds.x1 - 14), y: rand(150, 225), delay: rand(0, 5), dur: rand(5, 9) })
  // Her own collection, roosting for the night — real songbirds sleep after
  // dark, so no pecking/bathing/bench-sitting here (those are daytime-only,
  // see composeDay), just a settled bird or two quietly there in a tree, the
  // same gentle idle/bob as by day but without the branch-to-branch wander —
  // she isn't foraging, she's asleep. Without this the night garden would
  // read as if all her birds vanished the moment the sun set.
  if (land.length) {
    const nRoost = showcase
      ? Math.min(2, land.length)
      : Math.min(land.length, Math.random() < 0.6 ? (Math.random() < 0.3 ? 2 : 1) : 0)
    shuffle(land).slice(0, nRoost).forEach((p) => {
      const b = pickBird(collection, false)
      list.push({
        id: nid(), type: 'bird', x: p.x, y: perchY(p), itemId: p.itemId,
        name: b && b.name, companion: b && b.companion, tint: b && b.tint,
        speciesId: b && b.id,
        delay: rand(0, 2.6), dur: rand(2.2, 3.2), // slower breathing bob, asleep
        idleDelay: rand(0, 5), idleDur: rand(4, 6), // slower head twitch
        roosting: true, bx1: 0, by1: 0, bx2: 0, by2: 0, hopDelay: 0, hopDur: 20,
      })
    })
  }
  // an owl, sometimes
  if (land.length && (showcase || Math.random() < 0.6)) { const p = pick(land); list.push({ id: nid(), type: 'owl', x: p.x, y: p.y, delay: rand(0, 3), dur: rand(2.8, 3.8) }) }
  // a hedgehog, sometimes
  if (showcase || Math.random() < 0.55) list.push({ id: nid(), type: 'hedgehog', delay: rand(0, 2), dur: rand(10, 13) })
  // moths near the moonlight
  const nMoth = showcase ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5)
  for (let i = 0; i < nMoth; i += 1) list.push({ id: nid(), type: 'moth', x: rand(bounds.x0 + 34, bounds.x1 - 34), y: rand(55, 140), delay: rand(0, 5), dur: rand(4.2, 6), flapDur: rand(0.28, 0.42), flapDelay: rand(0, 0.35) })
  // a bat swooping over, occasionally
  if (showcase || Math.random() < 0.45) list.push({ id: nid(), type: 'bat', y: rand(40, 95), delay: rand(0, 2.5), dur: rand(4.8, 6.8), dir: Math.random() < 0.5 ? 1 : -1 })
  return list
}

// An owned expansion zone's background art: continues the same sky/hill/grass
// gradients as the base scene (so it never reads as a bolted-on new style),
// a couple of soft background tree silhouettes so it feels like its own
// little grove rather than an empty clone, and a small wooden signpost
// naming it. Back Garden gets a cooler, shaded-grove tint to feel like a
// genuinely different, further-in part of the yard.
function ExpansionZoneArt({ id, phase, shaded = false }) {
  const rect = gardenZoneRect(id)
  if (!rect) return null
  const w = rect.x1 - rect.x0
  const name = expansionItem(id)?.name || ''
  return (
    <g>
      <path d={`M${rect.x0} 138 h${w} V260 H${rect.x0} Z`} fill={DISTANT_HILLS[phase]} opacity={shaded ? 0.75 : 0.55} />
      <rect x={rect.x0} y="118" width={w} height="34" fill="url(#gardenHorizonHaze)" />
      <rect x={rect.x0} y="140" width={w} height="120" fill="url(#gardenGrassMid)" />
      <rect x={rect.x0} y="180" width={w} height="80" fill="url(#gardenGrassNear)" />
      {shaded && <rect x={rect.x0} y="140" width={w} height="120" fill="#12321a" opacity="0.24" />}
      <g opacity={shaded ? 0.85 : 0.5} fill={shaded ? '#1c3d24' : '#5f8f52'}>
        <ellipse cx={rect.x0 + w * 0.28} cy="150" rx="26" ry="20" />
        <ellipse cx={rect.x0 + w * 0.68} cy="146" rx="22" ry="17" />
      </g>
      <g transform={`translate(${rect.x0 + w / 2} 210)`}>
        <rect x="-2" y="-18" width="4" height="18" fill="url(#gardenWood)" />
        <rect x="-26" y="-32" width="52" height="15" rx="3" fill="url(#gardenWood)" />
        <text x="0" y="-21" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff6e2">{name}</text>
      </g>
    </g>
  )
}

// A zone slot that falls within the current view but isn't owned yet (only
// possible for Expand Right, if Back Garden was bought first) — a fenced-off,
// non-interactive placeholder rather than a blank gap, naming what unlocks it.
function LockedZonePlaceholder({ id }) {
  const rect = gardenZoneRect(id)
  if (!rect) return null
  const w = rect.x1 - rect.x0
  const item = expansionItem(id)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={rect.x0} y="118" width={w} height="142" fill="#3a3a3a" opacity="0.4" />
      {Array.from({ length: Math.max(1, Math.floor(w / 24)) }).map((_, i) => (
        <line
          key={i}
          x1={rect.x0 + i * 24 + 6} y1="150" x2={rect.x0 + i * 24 + 6} y2="230"
          stroke="#8a6a42" strokeWidth="3" opacity="0.5"
        />
      ))}
      <g transform={`translate(${rect.x0 + w / 2} 190)`}>
        <text x="0" y="-6" textAnchor="middle" fontSize="16">🔒</text>
        <text x="0" y="12" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">Buy {item?.name}</text>
      </g>
    </g>
  )
}

// ---- the page --------------------------------------------------------------
export function GardenPage({
  garden,
  coins,
  collection = [],
  onPlace,
  onWater,
  onBack,
  onTreatResident,
  onWish,
  onPurchaseExpansion,
  tweety = null,
  seeds = 0,
  plantableSpecies = [],
}) {
  const plantings = useMemo(() => garden?.plantings || [], [garden])
  const residents = garden?.residents || []
  const today = saDateKey()
  const unlocked = GARDEN_SHOP.filter((i) => (garden?.shopUnlocked || []).includes(i.id))
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  // Expansion zones widen the world itself (see gardenData.js): the scene's
  // viewBox, the set of currently-placeable regions, and the outer bounds used
  // for decorative wildlife scatter all grow as she unlocks them.
  const expansions = useMemo(() => garden?.expansions || [], [garden?.expansions])
  const viewBox = useMemo(() => gardenViewBox(expansions), [expansions])
  const regions = useMemo(() => gardenRegions(expansions), [expansions])
  const worldBounds = useMemo(
    () => ({
      x0: Math.min(...regions.map((r) => r.x0)),
      x1: Math.max(...regions.map((r) => r.x1)),
    }),
    [regions],
  )

  // Scene-units-to-pixels scale, measured off the wrap's own rendered width so
  // the base (unexpanded) 400-unit scene still fills it exactly like before —
  // an expanded scene renders wider than the wrap in real pixels, so the wrap
  // scrolls/pans to it instead of squashing everything down to fit.
  const [unitPx, setUnitPx] = useState(1)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => setUnitPx(el.clientWidth / 400)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // On first load, start scrolled to show the original (base) garden — an
  // expansion is a deliberate swipe away, not shown by default.
  const didInitialScroll = useRef(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || didInitialScroll.current || unitPx <= 0) return
    el.scrollLeft = -viewBox.minX * unitPx
    didInitialScroll.current = true
  }, [viewBox.minX, unitPx])

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
  // Tap-to-reveal name label: at most one garden entity (plant/bird/
  // resident) shows its name at a time, since always-on labels overlap once
  // anything clusters. Tapping an entity SETS it active (never toggles off
  // on a repeat tap of the same entity — touch devices often fire a
  // synthetic mouseenter right before click, and a toggle there would flicker
  // on/off on the very first tap). Only tapping empty grass or a different
  // entity changes it. Hover (desktop) shows/hides it transiently on top.
  const [activeLabelId, setActiveLabelId] = useState(null)
  const [placingType, setPlacingType] = useState(null)
  // Display-only info for a species placement (commonName): gardenItem(type)
  // can't know this from the type string alone, so it rides alongside
  // placingType purely for the "tap the grass..." hint.
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

  // A resident's pet/treat reaction: which resident, which kind ('pet' plays
  // a happy bounce + floating hearts, 'treat' plays a peck-and-eat bounce +
  // a floating treat), cleared automatically once the animation finishes.
  const [residentReaction, setResidentReaction] = useState(null) // { id, kind }
  useEffect(() => {
    if (!residentReaction) return undefined
    const t = window.setTimeout(() => setResidentReaction(null), 1600)
    return () => window.clearTimeout(t)
  }, [residentReaction])

  function petResident(id) {
    setResidentReaction({ id, kind: 'pet' })
  }

  function treatResidentLocal(id) {
    if (!onTreatResident) return
    const ok = onTreatResident(id)
    if (ok) setResidentReaction({ id, kind: 'treat' })
  }

  // Fully-grown elements with a habitat zone are perches birds can visit (P2).
  // The bench has no habitat zone of its own (it doesn't host species the way
  // a tree/pond/feeder does) but IS a valid land perch for the occasional
  // hop-up-and-sit visit below, so it's included here with a synthetic zone.
  // itemId carries the underlying shop item id so the composer can tell a
  // feeder/bird-bath/bench apart from an ordinary tree perch.
  const grownPerches = useMemo(
    () =>
      plantings
        .map((p) => ({ p, item: gardenItem(p.type) }))
        .filter(({ p, item }) => item && (item.zone || p.type === 'bench') && isFullyGrown(p))
        .map(({ p }) => ({
          id: p.id, x: p.x ?? 0, y: p.y ?? 0,
          zone: gardenItem(p.type).zone || 'bench',
          itemId: p.type,
        })),
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
      setCreatures(
        isNight
          ? composeNight(grownPerches, collection, showcase, worldBounds)
          : composeDay(grownPerches, collection, showcase, worldBounds),
      )
    }
    rollRef.current = roll
    const t0 = setTimeout(() => roll(false), 0)        // initial scene (deferred)
    const iv = window.setInterval(() => roll(false), 16000) // keep it shifting
    return () => { alive = false; clearTimeout(t0); window.clearInterval(iv) }
  }, [grownPerches, collection, isNight, worldBounds])

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
    const s = snapToGarden(raw.x, raw.y, expansions)
    const ok = canPlaceAt(placingType, s.x, s.y, plantings, expansions)
    setGhost({ ...s, ok })
  }

  function onSceneClick(evt) {
    if (!placingType) {
      setActiveLabelId(null)
      return
    }
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y, expansions)
    if (!canPlaceAt(placingType, s.x, s.y, plantings, expansions)) return
    onPlace(placingType, s.x, s.y)
    setPlacingType(null)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacing(itemId) {
    setSelectedId(null)
    setActiveLabelId(null)
    setPlacingType(itemId)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacingSpecies(speciesKey, commonName) {
    setSelectedId(null)
    setActiveLabelId(null)
    setPlacingType(`species:${speciesKey}`)
    setPlacingSpeciesMeta({ commonName })
    setGhost(null)
  }

  const placingItem = placingType ? gardenItem(placingType) : null
  const placingAny = Boolean(placingType)

  // Depth z-order: further-up (further away) creatures/residents render
  // first, nearer ones last — same "lower Y draws on top" rule as plantings
  // above, just applied to these two separate render layers so a close
  // creature/resident can never be hidden behind a far one within its own
  // layer. (Creatures still render as a whole layer in front of plantings,
  // and residents in front of creatures — that stacking is unchanged.)
  const sortedCreatures = [...creatures].sort(
    (a, b) => (a.y ?? a.fromY ?? 200) - (b.y ?? b.fromY ?? 200),
  )
  const sortedResidents = [...residents].sort((a, b) => (a.y ?? 0) - (b.y ?? 0))

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
        <div className={`garden-scene-wrap${viewBox.width > 400 ? ' pannable' : ''}`} ref={wrapRef}>
        <svg
          ref={svgRef}
          className={`garden-scene-svg${placingAny ? ' placing' : ''}`}
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: viewBox.width * unitPx, height: viewBox.height * unitPx }}
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
            <linearGradient id="gardenHorizonHaze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={HORIZON_HAZE[phase]} stopOpacity="0" />
              <stop offset="0.6" stopColor={HORIZON_HAZE[phase]} stopOpacity="0.55" />
              <stop offset="1" stopColor={HORIZON_HAZE[phase]} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gardenGrassMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dcecc0" />
              <stop offset="1" stopColor="#c3e0a0" />
            </linearGradient>
            {/* Third, palest/farthest hill band — between the hazy ridge and
                the mid band — so the terrain rolls in three steps of depth
                instead of two, palest-and-coolest furthest back. */}
            <linearGradient id="gardenGrassFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef3da" />
              <stop offset="1" stopColor="#d7e8bd" />
            </linearGradient>
            <linearGradient id="gardenGrassNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#96c977" />
              <stop offset="1" stopColor="#79b25f" />
            </linearGradient>
            {/* Shared plant/structure gradients — a sunlit highlight fading to
                a deeper shadowed edge, instead of one flat fill each, so grown
                items read with real volume rather than as flat cartoon shapes. */}
            <radialGradient id="gardenCanopy" cx="38%" cy="30%" r="75%">
              <stop offset="0" stopColor="#6fbf6c" />
              <stop offset="0.55" stopColor="#4f9a55" />
              <stop offset="1" stopColor="#3d7d44" />
            </radialGradient>
            <linearGradient id="gardenPineFoliage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a9a5c" />
              <stop offset="1" stopColor="#2c6a3e" />
            </linearGradient>
            <radialGradient id="gardenWater" cx="38%" cy="28%" r="80%">
              <stop offset="0" stopColor="#bfe9f4" />
              <stop offset="0.45" stopColor="#7fc4dd" />
              <stop offset="1" stopColor="#4f96b8" />
            </radialGradient>
            <linearGradient id="gardenWood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c19257" />
              <stop offset="1" stopColor="#8a5e36" />
            </linearGradient>
            <linearGradient id="gardenStone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c2bcb1" />
              <stop offset="1" stopColor="#8f887c" />
            </linearGradient>
          </defs>
          <rect x={viewBox.minX} y="0" width={viewBox.width} height="260" fill="url(#gardenSky)" />
          <GardenSky phase={phase} />
          {/* distant hazy ridge — atmospheric perspective, drawn behind both
              proper ground layers so the scene reads with real depth */}
          <path
            d="M0 138 q60 -18 150 -6 q100 14 250 -10 V260 H0 Z"
            fill={DISTANT_HILLS[phase]}
            style={{ filter: 'blur(1px) opacity(0.7)' }}
          />
          <rect x={viewBox.minX} y="118" width={viewBox.width} height="34" fill="url(#gardenHorizonHaze)" style={{ pointerEvents: 'none' }} />
          {/* far rolling-hill band — palest/coolest, sits between the ridge
              and the mid band for a third step of depth */}
          <path d="M0 145 q80 -20 170 -8 q110 12 220 -6 V260 H0 Z" fill="url(#gardenGrassFar)" />
          <path d="M0 150 q70 -30 160 -12 q90 18 240 -8 V260 H0 Z" fill="url(#gardenGrassMid)" />
          <path d="M0 186 q110 -22 210 -2 q110 16 190 -6 V260 H0 Z" fill="url(#gardenGrassNear)" />
          {/* a soft meandering path for charm */}
          <path d="M150 260 C176 224 132 206 178 188 C206 177 196 166 214 158" fill="none" stroke="#e4cf9a" strokeWidth="13" strokeLinecap="round" opacity="0.7" />

          {/* Expansion zones: each owned zone continues the ground plane with
              the same gradients (own signpost so it reads as a real, distinct
              place); Back Garden gets a cooler shaded-grove tint. A zone that
              falls within the current view but ISN'T owned yet (e.g. Back
              Garden bought before Expand Right) renders as a fenced-off,
              non-interactive locked placeholder instead of a blank gap. */}
          {expansions.includes('expand-left') && (
            <ExpansionZoneArt id="expand-left" phase={phase} />
          )}
          {expansions.includes('expand-right') ? (
            <ExpansionZoneArt id="expand-right" phase={phase} />
          ) : expansions.includes('back-garden') ? (
            <LockedZonePlaceholder id="expand-right" />
          ) : null}
          {expansions.includes('back-garden') && (
            <ExpansionZoneArt id="back-garden" phase={phase} shaded />
          )}

          {/* faint placement grid while placing, across every unlocked region */}
          {placingAny && (
            <g fill="#3c7a4a" opacity="0.22">
              {regions.flatMap((r) => {
                const dots = []
                for (let x = r.x0; x <= r.x1; x += 28) {
                  for (let y = r.y0; y <= r.y1; y += 20) {
                    dots.push(<circle key={`${r.x0},${x},${y}`} cx={x} cy={y} r="1" />)
                  }
                }
                return dots
              })}
            </g>
          )}

          {/* plantings, depth-sorted (lower = nearer = drawn in front) */}
          {[...plantings]
            .map((p, i) => ({ p, x: p.x ?? GARDEN_REGION.x0 + 40 + i * 40, y: p.y ?? 200 }))
            .sort((a, b) => a.y - b.y)
            .map(({ p, x, y }) => {
              const thirsty = !isFullyGrown(p) && !wateredToday(p, today)
              const isSel = p.id === selectedId
              // A small, stable per-planting nudge (never touches the real x/y
              // used for placement/overlap math) so a row of items never reads
              // as snapped to the invisible placement grid.
              const jx = x + ((hashSeed(`${p.id}:jx`) % 60) / 10 - 3)
              const jy = y + ((hashSeed(`${p.id}:jy`) % 40) / 10 - 2)
              const stageKey = plantStageKey(p)
              // Gentle idle life once grown: only real plants sway (not
              // structures/water features — a swaying feeder would look
              // broken), and only the actual flowering stage gets the pulse.
              const swaying = isFullyGrown(p) && gardenItem(p.type)?.kind === 'plant'
              const blooming = swaying && FLOWERING_STAGES.has(stageKey)
              return (
                <g
                  key={p.id}
                  className="garden-plant"
                  transform={`translate(${jx} ${jy})`}
                  onClick={placingAny ? undefined : (e) => {
                    e.stopPropagation()
                    setSelectedId(p.id)
                    setActiveLabelId(p.id)
                    if (p.type === 'wishing-well' && isFullyGrown(p)) {
                      setWishBurst({ id: p.id, x: jx, y: jy })
                      if (canWish(garden, today)) onWish?.()
                    }
                  }}
                  onMouseEnter={placingAny ? undefined : () => setActiveLabelId(p.id)}
                  onMouseLeave={placingAny ? undefined : () => setActiveLabelId((cur) => (cur === p.id ? null : cur))}
                >
                  {isSel && <ellipse cx="0" cy="3" rx="20" ry="6" fill="#ffe07a" opacity="0.55" />}
                  <g transform={`scale(${depthScale(y)})`}>
                    <g
                      className={swaying ? 'garden-plant-sway' : undefined}
                      style={swaying ? {
                        animationDelay: `${hashSeed(`${p.id}:swaydelay`) % 4}s`,
                        animationDuration: `${6 + (hashSeed(`${p.id}:swaydur`) % 3)}s`,
                      } : undefined}
                    >
                      <g
                        className={blooming ? 'garden-plant-bloom' : undefined}
                        style={blooming ? {
                          animationDelay: `${hashSeed(`${p.id}:bloomdelay`) % 3}s`,
                          animationDuration: `${3 + (hashSeed(`${p.id}:bloomdur`) % 2)}s`,
                        } : undefined}
                      >
                        <PlantArt type={p.type} stageKey={stageKey} family={p.family} commonName={p.commonName} seed={p.id} />
                      </g>
                    </g>
                    {treeHasNest(p) && NEST_SPOT[p.type] && (
                      <g transform={`translate(${NEST_SPOT[p.type].x} ${NEST_SPOT[p.type].y})`}>
                        <NestArt />
                      </g>
                    )}
                  </g>
                  {!placingAny && activeLabelId === p.id && (
                    <GardenNameLabel text={p.commonName || gardenItem(p.type)?.name} y={-46} />
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
          {!placingAny && sortedCreatures.map((c) => (
            <SceneCreature key={c.id} c={c} activeLabelId={activeLabelId} setActiveLabelId={setActiveLabelId} />
          ))}

          {/* placement ghost: a garden item while placingType */}
          {placingAny && ghost && (
            <g transform={`translate(${ghost.x} ${ghost.y})`} opacity={ghost.ok ? 0.6 : 0.3} style={{ pointerEvents: 'none' }}>
              {ghost.ok
                ? <PlantArt type={placingType} stageKey={placingItem.stages[0]} />
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
          <div
            className="garden-residents"
            style={{ width: viewBox.width * unitPx, height: viewBox.height * unitPx }}
          >
            {sortedResidents.map((r) => {
              // Stable per-resident timing (not re-randomized every render): a
              // cheap hash of the id seeds delay/duration so she never looks
              // frozen, and no two residents ever sway in lockstep.
              const seed = hashSeed(r.id)
              // She also wanders around her home spot — two guaranteed-visible,
              // per-resident waypoints (never leaving/entering perfectly in
              // sync with any other resident) via the same seeded-hash trick.
              const wanderStyle = residentWanderStyle(r.id)
              const reaction = residentReaction?.id === r.id ? residentReaction.kind : null
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`garden-resident${reaction === 'pet' ? ' garden-resident-react-pet' : ''}${reaction === 'treat' ? ' garden-resident-react-treat' : ''}`}
                  style={{
                    left: `${((r.x - viewBox.minX) / viewBox.width) * 100}%`,
                    top: `${((r.y - viewBox.minY) / viewBox.height) * 100}%`,
                  }}
                  title={r.species}
                  onClick={() => { setSelectedResidentId(r.id); setActiveLabelId(r.id) }}
                  onMouseEnter={() => setActiveLabelId(r.id)}
                  onMouseLeave={() => setActiveLabelId((cur) => (cur === r.id ? null : cur))}
                >
                  <span className="garden-resident-wander" style={wanderStyle}>
                    <span
                      className="garden-resident-sway"
                      style={{ animationDelay: `${seed % 4}s`, animationDuration: `${3.4 + (seed % 5) * 0.3}s` }}
                    >
                      {/* .garden-resident-sway animates `transform` itself, so
                          the depth scale goes on this extra inner span. */}
                      <span style={{ display: 'inline-block', transform: `scale(${depthScale(r.y ?? 0)})` }}>
                        <TweetyBird level="crowned" companion={r.companionId} size={44} />
                      </span>
                    </span>
                    {activeLabelId === r.id && <span className="garden-resident-name">{r.name}</span>}
                    {reaction === 'pet' && (
                      <span className="garden-resident-hearts" aria-hidden="true">
                        <span className="garden-resident-heart" style={{ '--hx': '-10px', animationDelay: '0s' }}>💛</span>
                        <span className="garden-resident-heart" style={{ '--hx': '2px', animationDelay: '0.15s' }}>💕</span>
                        <span className="garden-resident-heart" style={{ '--hx': '11px', animationDelay: '0.3s' }}>💛</span>
                      </span>
                    )}
                    {reaction === 'treat' && (
                      <span className="garden-resident-treat-emoji" aria-hidden="true">🍓</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Sunset Bench: Tweety herself, sometimes, sitting a while. Same HTML-
            overlay approach as residents (TweetyBird isn't a scene <g>). */}
        {tweetyAtBench && sunsetBench && (
          <div
            className="garden-residents"
            aria-hidden="true"
            style={{ width: viewBox.width * unitPx, height: viewBox.height * unitPx }}
          >
            <span
              className="garden-resident"
              style={{
                left: `${((sunsetBench.x - viewBox.minX) / viewBox.width) * 100}%`,
                top: `${((sunsetBench.y - 14 - viewBox.minY) / viewBox.height) * 100}%`,
              }}
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
          <div className="garden-resident-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => petResident(selectedResident.id)}
            >
              Pet 💛
            </button>
            <button
              className="secondary-btn"
              type="button"
              disabled={coins < RESIDENT_TREAT_COST}
              onClick={() => treatResidentLocal(selectedResident.id)}
            >
              Give a treat 🍓 ({RESIDENT_TREAT_COST} 🪙)
            </button>
          </div>
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
              <p className="fine-print">
                {selected.type === 'wishing-well'
                  ? canWish(garden, today)
                    ? `Tap the well to make a wish — up to ${WISHING_WELL_COINS} 🪙 back.`
                    : 'Already wished today — the well glimmers, waiting for tomorrow. ✨'
                  : "Fully grown — it's a permanent part of the garden."}
              </p>
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
            <p className="fine-print">
              Tap a species below, then tap the grass to plant it — it grows into the real thing you
              photographed. Planting costs {SEED_PLANT_COST} 🪙 on top of the seed.
            </p>
            <div className="garden-shop-row">
              {plantableSpecies.map((species) => {
                const active = placingType === `species:${species.speciesKey}`
                const disabled = (seeds <= 0 || coins < SEED_PLANT_COST) && !active
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
                        startPlacingSpecies(species.speciesKey, species.commonName)
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
                    <small>Plant this 🌱 ({SEED_PLANT_COST} coins)</small>
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
        <div className="garden-shop-tier garden-expansions">
          <p className="garden-shop-tier-heading">
            Garden Expansions <span className="garden-shop-tier-range">permanent</span>
          </p>
          <p className="fine-print">
            Widen the garden itself — more room to place things, and it's yours forever. Swipe the scene left/right once unlocked.
          </p>
          <div className="garden-shop-row">
            {GARDEN_EXPANSIONS.map((zone) => {
              const owned = expansions.includes(zone.id)
              const afford = coins >= zone.cost
              return (
                <button
                  key={zone.id}
                  className={`garden-shop-btn${owned ? ' owned' : ''}`}
                  type="button"
                  disabled={owned || !afford}
                  onClick={() => onPurchaseExpansion?.(zone.id)}
                >
                  <span className="garden-shop-emoji">{zone.emoji}</span>
                  <strong>{zone.name}</strong>
                  <small>{owned ? 'Unlocked ✓' : `${zone.cost} 🪙`}</small>
                </button>
              )
            })}
          </div>
        </div>
        <p className="fine-print">Tip: tap an item, then tap the grass to place it. Use Fast Forward ⏩ to tend it again and grow it while testing.</p>
      </section>
    </div>
  )
}
