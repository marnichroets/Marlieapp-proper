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
  kallieMischiefForDay,
  STAGE_LABELS,
  GARDEN_REGION,
  gardenViewBox,
  gardenRegions,
  gardenZoneRect,
  snapToGarden,
  canPlaceAt,
  plantVisual,
} from './gardenData'
import { saDateKey, saTimePhase } from './saDate'
import { fetchGardenWeather } from './gardenWeather'
import { TweetyBird } from './Tweety'
import { tweetyGrowth, companionSpecies } from './tweetyData'
import { GardenBird } from './birdTemplates'
import { BIRD_COLOUR_MAP } from './birdColourMap'
import { GardenPlant } from './plantTemplates'

// ---- day/night cycle (driven by real SA local time) ------------------------
// Sky gradient stops per phase: golden morning, bright midday, warm sunset,
// dark starry night. Drawn into the existing #gardenSky linearGradient.
// Each phase keeps its original bottom stop (the horizon blend into
// DISTANT_HILLS/gardenGrassFar below) but gains real stops above it instead
// of a single flat fade — a cool dawn blue at the morning zenith, a deeper
// midday blue overhead, a dusky purple crown on the sunset, near-black at
// the top of a clear night — so the sky itself has depth even with nothing
// else in the scene yet.
const SKY_STOPS = {
  morning: [['0', '#a9c9dc'], ['0.28', '#f3d9a8'], ['0.55', '#fde9cf'], ['1', '#eef6da']],
  midday: [['0', '#7fb8d8'], ['0.45', '#bfe6f2'], ['1', '#e8f5dc']],
  evening: [['0', '#6b5a8a'], ['0.25', '#c97a8a'], ['0.55', '#ff9663'], ['0.8', '#ffb487'], ['1', '#ffd9b0']],
  night: [['0', '#0a1128'], ['0.4', '#182449'], ['0.75', '#243a63'], ['1', '#33507e']],
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

// Rain always wins over the phase-based ground wash (an overcast/rainy sky
// reads the same cool grey regardless of time of day); clear/cloudy defer
// to the existing per-phase lighting above.
const RAIN_GROUND_WASH = { fill: '#2c3a4a', opacity: 0.22 }

const WEATHER_META = {
  clear: { label: 'Clear', icon: '☀️' },
  cloudy: { label: 'Cloudy', icon: '☁️' },
  rain: { label: 'Rainy', icon: '🌧️' },
  windy: { label: 'Windy', icon: '🌬️' },
  fog: { label: 'Misty', icon: '🌫️' },
}

const PHASE_META = {
  morning: { label: 'Morning', icon: '🌅' },
  midday: { label: 'Midday', icon: '☀️' },
  evening: { label: 'Evening', icon: '🌇' },
  night: { label: 'Night', icon: '🌙' },
}

// ---- creature-scene helpers (random composition each viewing) --------------
const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])

// Lighten (amt > 0) or darken (amt < 0, both in [-1, 1]) a hex color — used to
// derive a shaded/highlight tone from a single zone accent color instead of
// hand-picking a separate hex for every light/dark variant of every terrain
// material (hedge foliage, ground patches, path edges).
function shadeColor(hex, amt) {
  const num = parseInt(hex.replace('#', ''), 16)
  const mix = (ch) => (amt >= 0 ? ch + (255 - ch) * amt : ch * (1 + amt))
  const r = Math.round(Math.max(0, Math.min(255, mix((num >> 16) & 0xff))))
  const g = Math.round(Math.max(0, Math.min(255, mix((num >> 8) & 0xff))))
  const b = Math.round(Math.max(0, Math.min(255, mix(num & 0xff))))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// A closed, gently irregular blob path around an ellipse — points scattered
// seeded-random around the perimeter, joined through their midpoints so the
// outline stays smooth rather than jagged. Used for ground-texture patches
// (a worn bare patch, a shaggier corner) so they read as organic earth
// instead of the plain overlapping-ellipse "sticker" look.
function wobblyBlobPath(cx, cy, rx, ry, rng, points = 9, jitter = 0.22) {
  const pts = []
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2
    const jr = 1 + (rng() - 0.5) * 2 * jitter
    pts.push({ x: cx + Math.cos(a) * rx * jr, y: cy + Math.sin(a) * ry * jr })
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < points; i += 1) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % points]
    d += `Q${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${((p0.x + p1.x) / 2).toFixed(1)} ${((p0.y + p1.y) / 2).toFixed(1)} `
  }
  return `${d}Z`
}

// Foliage as a cluster of small overlapping circles scattered within an
// elliptical footprint, instead of one big circle (or a few same-size
// circles) standing in for a whole canopy. Two things make this read as
// real shrubbery rather than a pom-pom: the OUTLINE is lumpy/irregular
// because the circles land at different sizes and offsets (never a smooth
// single silhouette), and every circle's tone is picked by where it falls
// relative to one fixed light direction (upper-left) rather than by which
// circle it happens to be — so the whole clump reads as ONE form lit from
// one side, not a flat color fill with a couple of random highlights.
// Shared by hedge foliage, tree canopies, and shrub canopies alike.
function foliageClump(rng, { cx = 0, cy = 0, rx, ry, hue, count = 9, minR, maxR }) {
  const dark = shadeColor(hue, -0.34)
  const light = shadeColor(hue, 0.34)
  const blobs = []
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2
    const d = Math.pow(rng(), 0.55) // bias toward center, occasional edge outlier for a lumpier silhouette
    const x = Math.cos(a) * rx * d
    const y = Math.sin(a) * ry * d
    const r = minR + rng() * (maxR - minR)
    const lightDot = (-0.62 * x) / (rx || 1) + (-0.78 * y) / (ry || 1)
    const tone = lightDot > 0.22 ? light : lightDot < -0.22 ? dark : hue
    blobs.push({ x: cx + x, y: cy + y, r, tone, lit: tone === light })
  }
  // paint lower (visually "further forward" in this file's up-is-back
  // convention) blobs last, so nearer foliage overlaps onto farther foliage
  blobs.sort((a, b) => a.y - b.y)
  return blobs
}
// A handful of the lit-face blobs in every clump gently pulse in place — sun
// glinting through leaves — instead of every canopy sitting perfectly static.
// Shared by every FoliageClump caller (trees, shrubs, hedges, the foreground
// fringe) for free, since they all funnel through this one component.
function FoliageClump(props) {
  return (
    <>
      {foliageClump(props.rng, props).map((b, i) => {
        const shimmer = b.lit && i % 3 === 0
        return (
          <circle
            key={i}
            cx={b.x.toFixed(2)} cy={b.y.toFixed(2)} r={b.r.toFixed(2)} fill={b.tone}
            className={shimmer ? 'garden-leaf-shimmer' : undefined}
            style={shimmer ? { animationDelay: `${(i * 0.37) % 4}s`, animationDuration: `${3.4 + (i % 3)}s` } : undefined}
          />
        )
      })}
    </>
  )
}
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

// A tiny seeded PRNG (mulberry32) — used for terrain decoration (grass tufts,
// pebbles, paths) that must look "randomly scattered" but stay IDENTICAL
// across re-renders for a given zone (unlike the composeDay/composeNight
// creature rolls, which deliberately reshuffle). Callers memoize the
// generated layout once per zone via useMemo, this just makes that layout
// reproducible from a plain string seed.
function seededRng(seedStr) {
  let a = hashSeed(seedStr) || 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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

// A single small paw mark — two overlapping ovals for the pad, four tiny
// circles for the toes — drawn at the origin so callers just translate/
// rotate/scale it into place.
function PawMark() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="3" ry="2.3" fill="#8B6914" />
      <ellipse cx="0" cy="0.3" rx="2.3" ry="1.9" fill="#8B6914" />
      <circle cx="-3" cy="-2.6" r="1.05" fill="#8B6914" />
      <circle cx="-1" cy="-3.7" r="1.05" fill="#8B6914" />
      <circle cx="1" cy="-3.7" r="1.05" fill="#8B6914" />
      <circle cx="3" cy="-2.6" r="1.05" fill="#8B6914" />
    </g>
  )
}

// Point + tangent on a cubic bezier at parameter t (De Casteljau-ish direct
// formula) — used to lay paw prints along the curve and to know which way
// each one should face.
function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}
function cubicBezierTangent(p0, p1, p2, p3, t) {
  const mt = 1 - t
  return {
    dx: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    dy: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  }
}

// Wide-but-safe patch of always-visible lawn (a bit roomier than the strict
// plantable GARDEN_REGION) that the paw trail's start/end edges and Kallie's
// mischief spots both draw from, so nothing lands off the grass.
const PAW_TRAIL_BOUNDS = { x0: 20, x1: 380, y0: 155, y1: 245 }

function randomTrailEdgePoint(edge) {
  const b = PAW_TRAIL_BOUNDS
  if (edge === 'left') return { x: b.x0, y: rand(b.y0, b.y1) }
  if (edge === 'right') return { x: b.x1, y: rand(b.y0, b.y1) }
  if (edge === 'top') return { x: rand(b.x0, b.x1), y: b.y0 }
  return { x: rand(b.x0, b.x1), y: b.y1 } // 'bottom'
}

// Kallie's paw trail — a walking PATH across the lawn, not a random scatter:
// a fresh random bezier curve from one edge of the garden to another on every
// mount, with 6-8 prints placed at even intervals along it. Each print is
// rotated to face the direction of travel at its point on the curve, and
// alternately offset a couple of units to either side of the centreline (the
// same left-right stagger a real four-legged walk leaves), fading in in
// sequence so it reads as footsteps rather than a scatter.
function GardenPawPrints() {
  const [prints] = useState(() => {
    const edges = ['left', 'right', 'top', 'bottom']
    const startEdge = pick(edges)
    const endEdge = pick(edges.filter((e) => e !== startEdge))
    const start = randomTrailEdgePoint(startEdge)
    const end = randomTrailEdgePoint(endEdge)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.hypot(dx, dy) || 1
    // Perpendicular unit vector to the start->end line, used to bow the two
    // control points off the straight line so the path actually curves.
    const nx = -dy / len
    const ny = dx / len
    const bow1 = rand(-24, 24)
    const bow2 = rand(-24, 24)
    const c1 = { x: start.x + dx * 0.33 + nx * bow1, y: start.y + dy * 0.33 + ny * bow1 }
    const c2 = { x: start.x + dx * 0.66 + nx * bow2, y: start.y + dy * 0.66 + ny * bow2 }

    const count = 6 + Math.floor(Math.random() * 3) // 6, 7 or 8
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0 : i / (count - 1)
      const { x, y } = cubicBezierPoint(start, c1, c2, end, t)
      const { dx: tdx, dy: tdy } = cubicBezierTangent(start, c1, c2, end, t)
      // rotation = heading + 90: PawMark's default (rotate 0) orientation
      // faces "up" (toward -y), so it takes a 90° offset from the raw
      // atan2 heading to point the mark along the direction of travel.
      const heading = Math.atan2(tdy, tdx) * (180 / Math.PI)
      const tlen = Math.hypot(tdx, tdy) || 1
      const px = -tdy / tlen
      const py = tdx / tlen
      const side = i % 2 === 0 ? 1 : -1
      const offset = rand(1.8, 2.6)
      return {
        id: i,
        x: x + px * side * offset,
        y: y + py * side * offset,
        rotation: Math.round(heading + 90),
        scale: rand(0.85, 1.05),
        delay: i * 0.14 + rand(0, 0.08),
      }
    })
  })
  return (
    <g className="garden-paw-prints" aria-hidden="true">
      {prints.map((p) => (
        <g
          key={p.id}
          className="garden-paw-print"
          style={{ animationDelay: `${p.delay.toFixed(2)}s` }}
          transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rotation}) scale(${p.scale.toFixed(2)})`}
        >
          <PawMark />
        </g>
      ))}
    </g>
  )
}

// A dug-up hole — a dark oval of exposed earth with lighter dirt specks
// scattered around it where the loose soil landed.
function KallieHole() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="7" ry="4" fill="#3b2a1a" />
      <ellipse cx="0" cy="0.2" rx="5.2" ry="2.9" fill="#241a10" />
      <circle cx="-9" cy="-2" r="1.1" fill="#7a5a35" />
      <circle cx="8.4" cy="-3" r="1.3" fill="#8a6a42" />
      <circle cx="-6.4" cy="5.2" r="1" fill="#7a5a35" />
      <circle cx="7.2" cy="4.4" r="1.2" fill="#8a6a42" />
      <circle cx="0.6" cy="-6" r="1" fill="#7a5a35" />
    </g>
  )
}

// A buried bone, tipped on its side and half-sunk into a little mound of
// dirt — as if Kallie stashed it and got bored halfway through covering it.
function KallieBone() {
  return (
    <g transform="rotate(-15)">
      <ellipse cx="0" cy="3.2" rx="6.4" ry="2.4" fill="#6b4a2a" opacity="0.55" />
      <rect x="-5.5" y="-1.4" width="11" height="2.8" rx="1.4" fill="#f5f0e6" />
      <circle cx="-5.5" cy="-2.4" r="1.7" fill="#f5f0e6" />
      <circle cx="-5.5" cy="1.6" r="1.7" fill="#f5f0e6" />
      <circle cx="5.5" cy="-2.4" r="1.7" fill="#f5f0e6" />
      <circle cx="5.5" cy="1.6" r="1.7" fill="#f5f0e6" />
    </g>
  )
}

// Kallie's daily garden mischief — a dug-up hole and/or a buried bone,
// deterministic for today's SA date key (see kallieMischiefForDay), so
// everyone sees the same thing all day and it's gone by tomorrow. Tapping
// either fires onTap('hole' | 'bone') for a toast (and, once per day, a
// coins bonus for the bone — handled by the caller).
function GardenKallieMischief({ mischief, onTap }) {
  if (!mischief) return null
  return (
    <>
      {mischief.holePos && (
        <g
          className="garden-kallie-mischief"
          transform={`translate(${mischief.holePos.x.toFixed(1)} ${mischief.holePos.y.toFixed(1)})`}
          onClick={(e) => {
            e.stopPropagation()
            onTap?.('hole')
          }}
        >
          <circle r="10" fill="transparent" />
          <KallieHole />
        </g>
      )}
      {mischief.bonePos && (
        <g
          className="garden-kallie-mischief"
          transform={`translate(${mischief.bonePos.x.toFixed(1)} ${mischief.bonePos.y.toFixed(1)})`}
          onClick={(e) => {
            e.stopPropagation()
            onTap?.('bone')
          }}
        >
          <circle r="10" fill="transparent" />
          <KallieBone />
        </g>
      )}
    </>
  )
}

// A released companion's next wander stop: a real point picked from whichever
// placeable regions are currently unlocked (base lawn + any bought expansion
// zones), so she genuinely roams the whole garden rather than twitching near
// one fixed spot. See the residentPos effect in GardenPage for the
// every-15-20s scheduler that calls this, and .garden-resident's CSS
// `transition` in App.css for the glide itself.
function pickWanderPoint(regions) {
  const region = regions[Math.floor(Math.random() * regions.length)] || GARDEN_REGION
  return { x: rand(region.x0, region.x1), y: rand(region.y0, region.y1) }
}

// Cheap slugify matching the one saBirdLibrary.js uses to build each entry's
// `id` (and so BIRD_COLOUR_MAP's keys) — not exported from there, so
// duplicated here rather than threading it through another module.
function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// A graduated resident's real species → template + colour zones, same
// BIRD_COLOUR_MAP source as every other illustrated bird in the scene. Tries
// her actual identified species first (r.species — set from realSpecies at
// release, which can be any catalogued species, not just one of the six
// companions), then falls back to the companion's own signature species,
// then the same generic songbird every other uncatalogued visitor gets.
function residentBirdVisual(r) {
  const bySpecies = r?.species && BIRD_COLOUR_MAP[slugify(r.species)]
  if (bySpecies) return { template: bySpecies.template, zones: bySpecies.zones }
  const companionName = companionSpecies(r?.companionId)
  const byCompanion = companionName && BIRD_COLOUR_MAP[slugify(companionName)]
  if (byCompanion) return { template: byCompanion.template, zones: byCompanion.zones }
  return { template: 'songbird-small', zones: GENERIC_BIRD_ZONES }
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
// Overcast cloud grey — used for both the 'cloudy' and 'rain' weather
// buckets (rain always implies cloud cover). The sun/moon stay faintly
// visible as a soft glow rather than vanishing outright — real overcast
// light still comes from somewhere — while the cloud shapes themselves grow
// bigger, greyer, and more numerous than the fair-weather decoration.
const CLOUD_GREY = '#c7cdd2'

// A layered, two-tone cloud (base puffs + a lighter top-lit highlight pass)
// instead of a flat single-color ellipse pair, so clouds read with real
// volume. One shared shape scales/tints for every phase and both the
// fair-weather and overcast treatments.
// `drift` (in this cloud's own scaled local units) makes it glide slowly
// back and forth instead of sitting frozen — bigger/nearer clouds drift
// further and faster than small/distant ones, a cheap parallax cue. Position
// (translate) and scale stay on the outer, attribute-based transform; the
// drift lives on an inner CSS-animated <g> — animating the SAME transform
// attribute via CSS would otherwise reset position/scale every frame.
function Cloud({ x, y, scale = 1, tone = '#ffffff', opacity = 0.9, drift = 0, dur = 70, delay = 0 }) {
  const hi = shadeColor(tone, 0.12)
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <g
        className={drift ? 'garden-cloud-drift' : undefined}
        style={drift ? { '--cloud-drift': `${drift}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` } : undefined}
      >
        <ellipse cx="0" cy="5" rx="24" ry="9" fill={tone} />
        <ellipse cx="-15" cy="1" rx="13" ry="8" fill={tone} />
        <ellipse cx="13" cy="-1" rx="15" ry="9" fill={hi} />
        <ellipse cx="-2" cy="-6" rx="11" ry="7.5" fill={hi} />
      </g>
    </g>
  )
}

// A handful of fixed, small star points for a clear night — cheap, but a
// clear night sky with nothing in it but a moon reads as unfinished.
const NIGHT_STARS = [
  [40, 24], [70, 45], [110, 20], [150, 38], [190, 16], [230, 30],
  [20, 60], [265, 50], [55, 80], [125, 70],
]

function GardenSky({ phase, weather = 'clear' }) {
  const overcast = weather === 'cloudy' || weather === 'rain'
  if (phase === 'night') {
    return (
      <g aria-hidden="true">
        {!overcast && (
          <>
            <g fill="#f3efcf" opacity="0.75">
              {NIGHT_STARS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} />
              ))}
            </g>
            {/* moon with a soft halo + faint craters */}
            <circle cx="320" cy="50" r="26" fill="#fff7d6" opacity="0.16" />
            <circle cx="320" cy="50" r="16" fill="#f3efcf" />
            <circle cx="314" cy="46" r="3" fill="#e4ddb2" opacity="0.6" />
            <circle cx="325" cy="55" r="2.2" fill="#e4ddb2" opacity="0.55" />
            <circle cx="326" cy="44" r="1.5" fill="#e4ddb2" opacity="0.5" />
          </>
        )}
        {overcast && (
          <>
            <circle cx="320" cy="50" r="10" fill="#fff7d6" opacity="0.12" />
            <Cloud x={300} y={46} scale={1.9} tone={CLOUD_GREY} opacity={0.4} drift={14} dur={95} />
            <Cloud x={120} y={72} scale={1.6} tone={CLOUD_GREY} opacity={0.35} drift={10} dur={110} delay={-30} />
            <Cloud x={205} y={30} scale={2} tone={CLOUD_GREY} opacity={0.4} drift={16} dur={100} delay={-60} />
          </>
        )}
      </g>
    )
  }
  if (phase === 'evening') {
    return (
      <g aria-hidden="true">
        {/* a warm sun sinking toward the horizon — full glow when clear,
            a soft diffuse patch behind the cloud deck when overcast */}
        {!overcast ? (
          <>
            <circle cx="316" cy="86" r="34" fill="#ff9a52" opacity="0.25" />
            <circle cx="316" cy="86" r="24" fill="#ff7e3c" />
          </>
        ) : (
          <circle cx="316" cy="86" r="26" fill="#ffb27a" opacity="0.3" />
        )}
        {!overcast ? (
          <>
            <Cloud x={92} y={50} scale={1} tone="#ffe0cc" opacity={0.55} drift={20} dur={65} />
            <Cloud x={140} y={38} scale={0.6} tone="#fff0e0" opacity={0.4} drift={12} dur={85} delay={-20} />
            <Cloud x={230} y={62} scale={0.75} tone="#ffe0cc" opacity={0.35} drift={15} dur={78} delay={-45} />
          </>
        ) : (
          <>
            <Cloud x={92} y={48} scale={1.7} tone={CLOUD_GREY} opacity={0.78} drift={10} dur={100} />
            <Cloud x={230} y={40} scale={1.9} tone={CLOUD_GREY} opacity={0.75} drift={12} dur={110} delay={-40} />
            <Cloud x={266} y={62} scale={1.4} tone={CLOUD_GREY} opacity={0.7} drift={9} dur={95} delay={-70} />
          </>
        )}
      </g>
    )
  }
  // morning + midday: a sun (lower + golden in the morning) and clouds.
  const morning = phase === 'morning'
  return (
    <g aria-hidden="true">
      {!overcast && morning && <circle cx="300" cy="66" r="30" fill="#ffe7a8" opacity="0.35" />}
      {!overcast ? (
        <circle cx={morning ? 300 : 338} cy={morning ? 66 : 46} r="22" fill={morning ? '#ffcf6a' : '#ffe07a'} />
      ) : (
        <circle cx={morning ? 300 : 338} cy={morning ? 66 : 46} r="20" fill="#ffe7a8" opacity="0.28" />
      )}
      {!overcast ? (
        <>
          <Cloud x={78} y={42} scale={1} tone="#ffffff" opacity={0.92} drift={22} dur={60} />
          <Cloud x={140} y={30} scale={0.55} tone="#ffffff" opacity={0.7} drift={13} dur={80} delay={-25} />
          <Cloud x={40} y={64} scale={0.6} tone="#ffffff" opacity={0.65} drift={14} dur={75} delay={-50} />
        </>
      ) : (
        <>
          <Cloud x={78} y={40} scale={1.9} tone={CLOUD_GREY} opacity={0.86} drift={11} dur={105} />
          <Cloud x={222} y={34} scale={2.1} tone={CLOUD_GREY} opacity={0.86} drift={13} dur={115} delay={-35} />
          <Cloud x={262} y={58} scale={1.6} tone={CLOUD_GREY} opacity={0.82} drift={10} dur={98} delay={-60} />
          <Cloud x={160} y={28} scale={1.3} tone={CLOUD_GREY} opacity={0.78} drift={9} dur={90} delay={-15} />
        </>
      )}
    </g>
  )
}

// Soft crepuscular light rays fanning from the low morning/evening sun —
// midday's sun is too high overhead for rays to read, night has none. Each
// ray is a flat translucent quad (no gradient math — screen blend mode plus
// the sky's own gradient underneath does the fading for free), with a slow
// independent opacity breathe so the fan feels alive without ever calling
// attention to itself.
const RAY_ANGLES_MORNING = [-8, 4, 16, 28, 40]
const RAY_ANGLES_EVENING = [140, 152, 164, 176, 188]
function LightRays({ phase }) {
  if (phase !== 'morning' && phase !== 'evening') return null
  const sun = phase === 'morning' ? { x: 300, y: 66 } : { x: 316, y: 86 }
  const angles = phase === 'morning' ? RAY_ANGLES_MORNING : RAY_ANGLES_EVENING
  const tint = phase === 'morning' ? '#fff3c4' : '#ffb37a'
  return (
    <g style={{ pointerEvents: 'none', mixBlendMode: 'screen' }} aria-hidden="true">
      {angles.map((a, i) => {
        const rad = (a * Math.PI) / 180
        const len = 230
        const spread = 6 + i * 1.4
        const dx = Math.cos(rad) * len
        const dy = Math.sin(rad) * len
        const perpX = Math.cos(rad + Math.PI / 2) * spread
        const perpY = Math.sin(rad + Math.PI / 2) * spread
        const pts = [
          [sun.x - perpX * 0.15, sun.y - perpY * 0.15],
          [sun.x + perpX * 0.15, sun.y + perpY * 0.15],
          [sun.x + dx + perpX, sun.y + dy + perpY],
          [sun.x + dx - perpX, sun.y + dy - perpY],
        ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
        return (
          <polygon
            key={i}
            className="garden-light-ray"
            points={pts}
            fill={tint}
            fillOpacity={(0.14 - i * 0.012).toFixed(2)}
            style={{ animationDelay: `${(i * 0.7).toFixed(1)}s` }}
          />
        )
      })}
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

// A bee bumbling between blooms — a quicker, jitterier wander than a
// butterfly's lazy drift, sharing the same fast-flap .g-wing pair (just a
// much shorter --flap-dur). Daytime ambient, independent of weather.
function Bee({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-bee-wander" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 4.5}s` }}>
        <g style={{ '--flap-dur': `${c.flapDur || 0.12}s`, '--flap-delay': `${c.flapDelay || 0}s` }}>
          <ellipse className="g-wing g-wing-l" cx="-1.4" cy="-1.2" rx="1.6" ry="0.9" fill="#ffffff" opacity="0.65" />
          <ellipse className="g-wing g-wing-r" cx="1.4" cy="-1.2" rx="1.6" ry="0.9" fill="#ffffff" opacity="0.65" />
        </g>
        <ellipse cx="0" cy="0" rx="2.4" ry="1.7" fill="#2b2013" />
        <rect x="-1.5" y="-1.2" width="0.9" height="2.4" rx="0.4" fill="#f6c343" />
        <rect x="0.3" y="-1.2" width="0.9" height="2.4" rx="0.4" fill="#f6c343" />
      </g>
    </g>
  )
}

// A warm floating dust/pollen mote — a purely atmospheric daytime ambient,
// drifting slowly up and sideways the way real motes catch the light in a
// sunlit garden. Independent of weather (a handful always drift, rain or
// shine) — see composeDay.
function PollenMote({ c }) {
  return (
    <circle
      className="garden-pollen-drift"
      cx={c.x} cy={c.y} r={c.r || 1}
      fill="#fff3c4"
      opacity={c.opacity || 0.5}
      style={{
        '--pollen-drift': `${c.drift}px`,
        '--pollen-rise': `${c.rise}px`,
        animationDelay: `${c.delay}s`,
        animationDuration: `${c.dur}s`,
      }}
    />
  )
}

// A night moth — the butterfly's duller, slower cousin: plain grey-brown,
// no bright hues, a lazier flutter. Shares the same wing-flap language
// (.g-wing / .g-flutter) as Butterfly/Bee. See composeNight.
function Moth({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-flutter" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 8}s`, '--flap-dur': `${c.flapDur || 0.5}s`, '--flap-delay': `${c.flapDelay || 0}s` }}>
        <ellipse className="g-wing g-wing-l" cx="-2.6" cy="0" rx="2.8" ry="3.6" fill="#8a7f70" opacity="0.75" />
        <ellipse className="g-wing g-wing-r" cx="2.6" cy="0" rx="2.8" ry="3.6" fill="#8a7f70" opacity="0.75" />
        <line x1="0" y1="-2.8" x2="0" y2="2.8" stroke="#3a342c" strokeWidth="0.9" />
      </g>
    </g>
  )
}

// A firefly's slow drifting glow, pulsing on/off — a night-only time-of-day
// ambient (composeNight), unrelated to the weather-driven rain/wind layers.
function Firefly({ c }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
      <g className="g-firefly-drift" style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur || 9}s` }}>
        <circle
          className="g-firefly-glow"
          cx="0" cy="0" r="2.6" fill="#e8ffb0"
          style={{ animationDelay: `${c.glowDelay || 0}s`, animationDuration: `${c.glowDur || 1.8}s` }}
        />
        <circle cx="0" cy="0" r="0.9" fill="#fff8d8" />
      </g>
    </g>
  )
}

// Falling rain streaks scattered across the current scene width (grows with
// expansions) — purely decorative, drawn above plantings/creatures. Seeded
// once per viewBox size (useMemo) so positions don't reshuffle every render;
// each streak's own fall timing is independently randomized so they never
// look synced. Loops fast and short (see .garden-rain-streak in App.css) —
// the app-wide prefers-reduced-motion rule already collapses any CSS
// animation to a single static frame, so no separate handling is needed here.
function RainOverlay({ viewBox }) {
  const streaks = useMemo(() => {
    const rng = seededRng(`rain:${viewBox.minX}:${viewBox.width}`)
    const count = Math.round(viewBox.width / 11)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: viewBox.minX + rng() * viewBox.width,
      len: 10 + rng() * 8,
      delay: rng() * 1.4,
      dur: 0.55 + rng() * 0.35,
      opacity: 0.25 + rng() * 0.25,
    }))
  }, [viewBox.minX, viewBox.width])
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      {streaks.map((s) => (
        <line
          key={s.id}
          className="garden-rain-streak"
          x1={s.x.toFixed(1)} y1="-10" x2={(s.x - 6).toFixed(1)} y2={(-10 + s.len).toFixed(1)}
          stroke="#bcd6e8" strokeWidth="1.4" strokeLinecap="round" opacity={s.opacity.toFixed(2)}
          style={{ animationDelay: `${s.delay.toFixed(2)}s`, animationDuration: `${s.dur.toFixed(2)}s` }}
        />
      ))}
    </g>
  )
}

// Loose leaves/petals blown across the scene in windy weather — small
// rotating shapes drifting mostly sideways with a little fall and spin,
// scattered at varied heights so they read as airborne. Same seeded,
// staggered-timing approach as RainOverlay; position is set on an outer <g>
// (a plain SVG transform attribute) and the drift/spin animation lives on an
// inner <g> — a CSS transform animation on the SAME element would otherwise
// override the attribute and reset it to the origin every frame.
const WIND_LEAF_HUES = ['#c9a35a', '#a9713f', '#8fae5a', '#c1552f']
function WindOverlay({ viewBox }) {
  const leaves = useMemo(() => {
    const rng = seededRng(`wind:${viewBox.minX}:${viewBox.width}`)
    const count = Math.max(5, Math.round(viewBox.width / 55))
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: viewBox.minX + rng() * viewBox.width,
      y: 40 + rng() * 180,
      size: 4 + rng() * 3,
      hue: WIND_LEAF_HUES[i % WIND_LEAF_HUES.length],
      delay: rng() * 6,
      dur: 4 + rng() * 3,
      drift: 70 + rng() * 60,
      fall: 20 + rng() * 30,
      spin: (180 + rng() * 360) * (rng() < 0.5 ? 1 : -1),
    }))
  }, [viewBox.minX, viewBox.width])
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      {leaves.map((l) => (
        <g key={l.id} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)})`}>
          <g
            className="garden-wind-leaf"
            style={{
              '--wind-drift': `${l.drift.toFixed(0)}px`,
              '--wind-fall': `${l.fall.toFixed(0)}px`,
              '--wind-spin': `${l.spin.toFixed(0)}deg`,
              animationDelay: `${l.delay.toFixed(2)}s`,
              animationDuration: `${l.dur.toFixed(2)}s`,
            }}
          >
            <ellipse cx="0" cy="0" rx={l.size.toFixed(1)} ry={(l.size * 0.6).toFixed(1)} fill={l.hue} opacity="0.8" />
          </g>
        </g>
      ))}
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

// Canopy foliage at every growth stage is a foliageClump (see the shared
// helper above) rather than one or two flat circles — same real tree, same
// deterministic look per planting (seeded off the planting id + stage), but
// a lumpy, lit silhouette instead of a pom-pom.
function TreeArt({ stageKey, seed }) {
  const { bark, canopy } = treeVariantFor(seed)
  const clumpRng = (tag) => seededRng(`tree:${seed}:${stageKey}:${tag}`)
  if (stageKey === 'seedling') return (
    <g>
      <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" />
      <path d="M0 -1 V-8" stroke={canopy} strokeWidth="2" strokeLinecap="round" />
      <FoliageClump rng={clumpRng('c')} cx={0} cy={-9} rx={4.6} ry={3.4} hue={canopy} count={6} minR={1.2} maxR={2.1} />
    </g>
  )
  if (stageKey === 'sapling') return (
    <g>
      <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" />
      <rect x="-1.5" y="-22" width="3" height="22" rx="1.5" fill={bark} />
      <FoliageClump rng={clumpRng('c')} cx={0} cy={-27} rx={9.5} ry={7.4} hue={canopy} count={8} minR={2.2} maxR={4.2} />
    </g>
  )
  if (stageKey === 'young') return (
    <g>
      <ellipse cx="0" cy="0" rx="10" ry="3.4" fill="#7a5a3a" />
      <rect x="-2.5" y="-34" width="5" height="34" rx="2" fill={bark} />
      <FoliageClump rng={clumpRng('c')} cx={0} cy={-40} rx={15.5} ry={12.5} hue={canopy} count={11} minR={3.4} maxR={6.4} />
    </g>
  )
  return (
    <g>
      <ellipse cx="0" cy="0" rx="12" ry="4" fill="#7a5a3a" />
      <rect x="-3.5" y="-44" width="7" height="44" rx="3" fill={bark} />
      <FoliageClump rng={clumpRng('c')} cx={0} cy={-52} rx={25} ry={20} hue={canopy} count={17} minR={5} maxR={9.5} />
      <ellipse cx="-8" cy="-64" rx="8" ry="4.6" fill="#bdeeb0" opacity="0.3" />
    </g>
  )
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

// A single 2-tone bloom (darker shadowed underside, lit face, bright pollen
// dot) instead of a flat circle — the same "one shape, three tones" language
// as every other richer plant/hedge element in this file.
function Bloom({ x, y, r = 4, hue }) {
  const dark = shadeColor(hue, -0.22)
  const light = shadeColor(hue, 0.28)
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r={r} fill={dark} />
      <circle cx={-r * 0.22} cy={-r * 0.22} r={r * 0.82} fill={hue} />
      <circle cx={-r * 0.32} cy={-r * 0.34} r={r * 0.32} fill={light} opacity="0.85" />
      <circle cx="0" cy="0" r={r * 0.34} fill="#ffd45e" opacity="0.9" />
    </g>
  )
}

// A few twinkling highlight points on a water surface — real still water
// isn't perfectly flat, it catches little glints of sky light. Shared by the
// pond, bird bath, and waterfall pool alike.
function WaterSparkle({ points }) {
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      {points.map((p, i) => (
        <circle
          key={i}
          className="garden-water-sparkle"
          cx={p[0]} cy={p[1]} r="1"
          fill="#ffffff"
          style={{ animationDelay: `${p[2] ?? i * 0.7}s` }}
        />
      ))}
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
  return (
    <g>
      <ellipse cx="0" cy="1.4" rx="8" ry="2.2" fill="#152410" opacity="0.2" />
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />
      {flowers.map(([x, y, c], i) => (
        <g key={i}>
          <line x1={x} y1="0" x2={x} y2={y} stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round" />
          <Bloom x={x} y={y} r={4} hue={c} />
        </g>
      ))}
    </g>
  )
}

function FlowerBedArt({ stageKey }) {
  if (stageKey === 'bed-soil') return (<g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" /><ellipse cx="0" cy="-2" rx="16" ry="4" fill="#8a6a46" /></g>)
  if (stageKey === 'bed-shoots') return (<g><ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" />{[-12, -4, 4, 12].map((x, i) => (<line key={i} x1={x} y1="-3" x2={x} y2="-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" />))}</g>)
  const f = [[-14, -12, '#f6a5c0'], [-5, -16, '#ffd45e'], [4, -14, '#c9a8e8'], [13, -17, '#f8b4d0'], [0, -11, '#fff0b3']]
  return (
    <g>
      <ellipse cx="0" cy="0.5" rx="19" ry="4.6" fill="#152410" opacity="0.2" />
      <ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" />
      {f.map(([x, y, c], i) => (
        <g key={i}>
          <line x1={x} y1="-2" x2={x} y2={y} stroke="#4a8a4a" strokeWidth="2" />
          <Bloom x={x} y={y} r={3.4} hue={c} />
        </g>
      ))}
    </g>
  )
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
  return (
    <g>
      <ellipse cx="0" cy="-2" rx="34" ry="14" fill="url(#gardenWater)" />
      <ellipse cx="-9" cy="-6" rx="13" ry="4" fill="#e4f6fb" opacity="0.7" />
      <ellipse cx="10" cy="4" rx="9" ry="2.6" fill="#2f6a86" opacity="0.22" />
      <g stroke="#5a9e4e" strokeWidth="2.4" strokeLinecap="round">
        <line x1="-30" y1="-4" x2="-32" y2="-16" />
        <line x1="-24" y1="-2" x2="-22" y2="-14" />
        <line x1="30" y1="-4" x2="32" y2="-15" />
      </g>
      {/* gentle ripple rings — real pondwater never sits perfectly still */}
      <g transform="translate(6 -3)">
        <ellipse className="garden-pond-ripple" cx="0" cy="0" rx="5" ry="2" style={{ animationDelay: '0s' }} />
        <ellipse className="garden-pond-ripple" cx="0" cy="0" rx="5" ry="2" style={{ animationDelay: '1.6s' }} />
        <ellipse className="garden-pond-ripple" cx="0" cy="0" rx="5" ry="2" style={{ animationDelay: '3.2s' }} />
      </g>
      <WaterSparkle points={[[-14, -7, 0], [8, 2, 1.4], [-3, -8, 2.6]]} />
    </g>
  )
}

function StonePathArt({ stageKey }) {
  if (stageKey === 'path-laying') return (<g><ellipse cx="-7" cy="0" rx="6" ry="3" fill="#9a9088" /><ellipse cx="7" cy="-2" rx="5" ry="2.6" fill="#b0a89e" /><ellipse cx="1" cy="2" rx="5" ry="2.2" fill="#8a6a46" opacity="0.5" /></g>)
  return (<g>{[[-13, 2], [-4, -0.5], [5, -2.5], [13, -4.5]].map(([x, y], i) => (<g key={i}><ellipse cx={x} cy={y} rx="6" ry="3" fill="#9a9088" /><ellipse cx={x - 1.4} cy={y - 0.8} rx="3" ry="1.4" fill="#bdb6ac" opacity="0.8" /></g>))}</g>)
}

function RockGardenArt({ stageKey }) {
  const rocks = (
    <g>
      <ellipse cx="0" cy="2" rx="15" ry="3.2" fill="#100a06" opacity="0.22" />
      <ellipse cx="0" cy="0" rx="15" ry="5.5" fill={shadeColor('#8a8078', -0.16)} />
      <ellipse cx="-6" cy="-3" rx="6.5" ry="4.5" fill="#9a9088" />
      <ellipse cx="6" cy="-2.5" rx="5.5" ry="4" fill="#a8a096" />
      <ellipse cx="-7" cy="-4.6" rx="2.6" ry="1.6" fill="#c2bcb1" opacity="0.7" />
    </g>
  )
  if (stageKey === 'rock-bare') return rocks
  // Real succulent tones: blue-grey, silver-green, and a reddish-tipped one —
  // never plain garden green. Each is now its own tiny lit clump (dark base,
  // mid body, bright tip) rather than a flat circle with one highlight dot.
  const succ = (x, y, c, tip) => (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0.4" r="3.3" fill={shadeColor(c, -0.24)} />
      <circle cx="-0.5" cy="-0.3" r="2.7" fill={c} />
      <circle cx="0" cy="0" r="1.3" fill={tip} />
    </g>
  )
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
  const soil = (
    <g>
      <ellipse cx="0" cy="0.5" rx="19" ry="4.6" fill="#152410" opacity="0.18" />
      <ellipse cx="0" cy="-1" rx="20" ry="6" fill="#7a5a3a" />
      <ellipse cx="0" cy="-2" rx="16" ry="4" fill="#8a6a46" />
    </g>
  )
  if (stageKey === 'veg-soil') return (<g>{soil}{[-10, 0, 10].map((x, i) => <line key={i} x1={x} y1="-4.5" x2={x} y2="0" stroke="#6b4f30" strokeWidth="1.5" />)}</g>)
  if (stageKey === 'veg-sprouts') return (<g>{soil}{[-12, -4, 4, 12].map((x, i) => (<g key={i}><line x1={x} y1="-3" x2={x} y2="-10" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><ellipse cx={x - 2} cy="-10" rx="2.6" ry="1.3" fill="#6cb86f" transform={`rotate(-30 ${x - 2} -10)`} /></g>))}</g>)
  return (
    <g>
      {soil}
      {[-12, -4, 4, 12].map((x, i) => (
        <g key={i}>
          <path d={`M${x} -3 V-13`} stroke="#4f9a55" strokeWidth="2" strokeLinecap="round" />
          <path d={`M${x - 3} -11 L${x} -15 L${x + 3} -11`} fill="none" stroke="#5aa861" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx={x} cy="-2" r="4.2" fill="#c9702c" />
          <circle cx={x - 1} cy="-2.8" r="3.4" fill="#e8893a" />
          <circle cx={x - 1.8} cy="-3.6" r="1.2" fill="#ffb35c" opacity="0.8" />
        </g>
      ))}
    </g>
  )
}

function ShrubArt({ stageKey, seed }) {
  if (stageKey === 'shrub-sprout') return (<g><ellipse cx="0" cy="0" rx="8" ry="3" fill="#7a5a3a" /><path d="M0 -1 V-12" stroke="#5aa05a" strokeWidth="2" strokeLinecap="round" /><circle cx="0" cy="-13" r="4" fill="#6cb86f" /></g>)
  const rng = seededRng(`shrub:${seed}`)
  const bush = (
    <g>
      <ellipse cx="0" cy="1" rx="12" ry="3.4" fill="#152410" opacity="0.26" />
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#7a5a3a" />
      <FoliageClump rng={rng} cx={0} cy={-15} rx={13} ry={11} hue="#4f9a55" count={12} minR={3.4} maxR={6.6} />
    </g>
  )
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
  return (<g>{ped}<ellipse cx="0" cy="-18" rx="13" ry="5" fill="url(#gardenStone)" /><ellipse cx="0" cy="-19" rx="10" ry="3.4" fill="url(#gardenWater)" /><ellipse cx="-3" cy="-20" rx="4" ry="1.4" fill="#e4f6fb" opacity="0.8" /><WaterSparkle points={[[-5, -19.5, 0.4], [3, -18.6, 1.8]]} /></g>)
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
    <g>
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
      <WaterSparkle points={[[8, -2.6, 0.8], [-10, -1.6, 2.2]]} />
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
// (see plantTemplates.jsx), resolved via plantVisual (see gardenData.js —
// moved there so it can be reused by the Greenhouse's own potted plants too,
// and so this component file can stay Fast-Refresh-clean, exporting only
// components).

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
    case 'shrub': return <ShrubArt stageKey={stageKey} seed={seed} />
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

// A shop card's preview: the item's own real art at its fully-grown stage,
// not a generic emoji — so browsing the catalog shows exactly what she's
// about to place (see .catalog-card in App.css). Reuses PlantArt directly,
// so a change to any item's art here automatically updates its shop preview.
//
// Each item's art has a very different real height (a stepping-stone path is
// barely 10 units tall; a mature tree is 70) — one shared viewBox would
// either clip the tree or shrink everything else down to a speck to make
// room for it. This hand-tunes each item's own top edge (its real art extent
// plus a hair of headroom) so every icon fills its card frame at a
// consistent, legible size instead.
const ICON_TOP_Y = {
  'flower-patch': -26, 'stone-path': -12, 'rock-garden': -14, 'veg-patch': -20,
  'flower-bed': -24, 'pine-seed': -52, 'tree-seed': -74, shrub: -34,
  bench: -26, fence: -26, 'bird-bath': -26, feeder: -46, trellis: -48,
  pond: -20, 'wishing-well': -46, birdhouse: -54, 'sunset-bench': -30,
  waterfall: -40,
}
function ShopItemIcon({ type }) {
  const item = gardenItem(type)
  if (!item) return null
  const stageKey = item.stages[item.stages.length - 1]
  const topY = ICON_TOP_Y[type] ?? -30
  return (
    <svg
      className="catalog-icon-svg"
      viewBox={`-42 ${topY} 84 ${4 - topY}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <ellipse cx="0" cy="1" rx="24" ry="5" fill="rgba(53, 96, 74, 0.14)" />
      <PlantArt type={type} stageKey={stageKey} seed={type} />
    </svg>
  )
}

// A brief poof of dirt specks where a fresh item just landed — purely a
// timed visual (see plantBurst in GardenPage), never touches placement.
const BURST_SPECKS = Array.from({ length: 7 }, (_, i) => {
  const angle = (i / 7) * Math.PI * 2 + rand(-0.2, 0.2)
  const dist = rand(10, 20)
  return { sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist * 0.6 - 4, delay: i * 0.015 }
})
function GardenPlantBurst() {
  return (
    <g className="garden-plant-burst" aria-hidden="true">
      <circle className="garden-plant-burst-poof" cx="0" cy="0" r="14" fill="#8a6a42" opacity="0.35" />
      {BURST_SPECKS.map((s, i) => (
        <circle
          key={i}
          className="garden-burst-speck"
          cx="0" cy="0" r="1.6" fill="#7a5a3a"
          style={{ '--sx': `${s.sx}px`, '--sy': `${s.sy}px`, animationDelay: `${s.delay}s` }}
        />
      ))}
    </g>
  )
}

// A watering-can droplet falling onto a planting, followed by a splash —
// the same visual language as the Greenhouse's own pots (see WaterDrop in
// Greenhouse.jsx / gh-drop-fall + gh-splash in App.css), so watering feels
// like one consistent action across both spaces.
function GardenWaterDrop() {
  return (
    <g className="garden-water-drop" aria-hidden="true">
      <ellipse className="garden-water-drop-fall" cx="0" cy="-26" rx="3.2" ry="4.2" fill="#5fb8e0" />
      <g className="garden-water-drop-splash">
        {[-7, 0, 7].map((dx) => (
          <circle key={dx} cx={dx} cy="-1" r="1.8" fill="#8fd4ee" />
        ))}
      </g>
    </g>
  )
}

// A little celebratory sparkle scatter when a planting crosses into its next
// growth stage — paired with the .garden-plant-justgrew scale-pop in App.css.
const GROW_SPARKS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2
  const dist = rand(16, 28)
  return { sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist - 8, delay: i * 0.03 }
})
function GardenGrowSparkle() {
  return (
    <g aria-hidden="true">
      {GROW_SPARKS.map((s, i) => (
        <text
          key={i}
          className="garden-grow-spark"
          x="0" y="-10" textAnchor="middle" fontSize="10"
          style={{ '--sx': `${s.sx}px`, '--sy': `${s.sy}px`, animationDelay: `${s.delay}s` }}
        >
          ✨
        </text>
      ))}
    </g>
  )
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
    case 'pollen': return <PollenMote c={c} />
    case 'moth': return <Moth c={c} />
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
  // bees — a busier, jitterier cousin of the butterfly, same scatter
  const nBee = showcase ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3)
  for (let i = 0; i < nBee; i += 1) list.push({ id: nid(), type: 'bee', x: rand(bounds.x0 + 24, bounds.x1 - 24), y: rand(152, 210), delay: rand(0, 4), dur: rand(3.6, 5), flapDur: rand(0.1, 0.15) })
  // warm floating dust/pollen motes — atmospheric daytime ambient,
  // independent of weather, always a small handful drifting.
  const nPollen = showcase ? 5 : 2 + Math.floor(Math.random() * 4)
  for (let i = 0; i < nPollen; i += 1) {
    list.push({
      id: nid(), type: 'pollen',
      x: rand(bounds.x0 + 10, bounds.x1 - 10), y: rand(140, 220),
      r: rand(0.6, 1.3), opacity: rand(0.3, 0.6),
      drift: rand(-14, 14), rise: rand(30, 60),
      delay: rand(0, 6), dur: rand(7, 12),
    })
  }
  // never an empty daytime scene
  if (!list.length) list.push({ id: nid(), type: 'butterfly', x: (bounds.x0 + bounds.x1) / 2, y: 186, hue: pick(BFLY_HUES), delay: 0, dur: rand(5, 7.5), flapDur: rand(0.26, 0.4), flapDelay: 0 })
  return list
}

function composeNight(perches, collection, showcase, bounds = { x0: 26, x1: 374 }) {
  const list = []
  let land = perches.filter((p) => p.zone !== 'water')
  if (showcase && !land.length) land = [{ id: 'demo-c', x: 150, y: 150, zone: 'land' }]
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
  // fireflies — a slow drifting glow scattered across the lawn, a night-only
  // ambient with no daytime equivalent (unlike bees/butterflies, which only
  // make sense in daylight).
  const nFirefly = showcase ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4)
  for (let i = 0; i < nFirefly; i += 1) {
    list.push({
      id: nid(), type: 'firefly',
      x: rand(bounds.x0 + 20, bounds.x1 - 20), y: rand(160, 220),
      delay: rand(0, 6), dur: rand(7, 11),
      glowDelay: rand(0, 1.8), glowDur: rand(1.4, 2.4),
    })
  }
  // a lone night moth drifting near the garden — a quieter cousin of the
  // daytime butterfly, never more than one so fireflies stay the star.
  const nMoth = showcase ? 2 : Math.random() < 0.5 ? 1 : 0
  for (let i = 0; i < nMoth; i += 1) {
    list.push({ id: nid(), type: 'moth', x: rand(bounds.x0 + 24, bounds.x1 - 24), y: rand(150, 210), delay: rand(0, 5), dur: rand(7, 10), flapDur: rand(0.45, 0.6) })
  }
  return list
}

// ---- zone theming: each garden "room" gets its own terrain flavor ----------
// The placeable grid itself (GARDEN_REGION / gardenZoneRect in gardenData.js)
// never varies by zone — this is purely how each zone's ground gets painted
// and dressed, so panning from the base lawn into an expansion feels like
// walking into a different part of the yard instead of a re-tinted copy.
const ZONE_THEMES = {
  base: { tint: null },
  'expand-left': { tint: 'rgba(255, 226, 150, 0.14)' },
  'expand-right': { tint: 'rgba(220, 160, 90, 0.12)', orchard: true },
  'back-garden': { tint: 'rgba(18, 42, 28, 0.3)', shaded: true },
}

// Soft, low-contrast sun/shadow drift baked into the lawn as MATERIAL — a
// handful of large, gently irregular washes (organic wobblyBlobPath
// outlines, alternating a touch warmer/cooler than the base grass hue at
// very low opacity) rather than the old prop-scatter system's individually
// recognizable objects sitting on top of the ground. Seeded once per zone
// (useMemo) so it stays put across renders.
function GroundLight({ rect, seedKey, baseHue, wind = false }) {
  const { dapples, tufts, sprinkles } = useMemo(() => {
    const rng = seededRng(`${seedKey}:groundlight`)
    const warm = shadeColor(baseHue, 0.22)
    const cool = shadeColor(baseHue, -0.16)
    const spanX = Math.max(1, rect.x1 - rect.x0 - 36)
    const spanY = Math.max(1, rect.y1 - rect.y0 - 10)
    const dapples = Array.from({ length: 7 }, (_, i) => {
      const x = rect.x0 + 18 + rng() * spanX
      const y = rect.y0 + 6 + rng() * spanY
      const rx = 18 + rng() * 26
      const ry = 7 + rng() * 7
      return {
        path: wobblyBlobPath(x, y, rx, ry, rng, 8, 0.32),
        tone: i % 2 === 0 ? warm : cool,
        opacity: 0.08 + rng() * 0.08,
      }
    })
    // Grass as small fanned tufts (3 curved blades from one base point)
    // scattered across the whole rect, instead of a uniform straight-line
    // hatch — reads as real clumped grass rather than a material hatch
    // pattern. Nearer (larger y) tufts stand a touch taller, the same
    // depth cue every planting already gets from depthScale.
    const tuftCount = Math.round((rect.x1 - rect.x0) / 11)
    const tufts = Array.from({ length: tuftCount }, (_, i) => {
      const x = rect.x0 + rng() * (rect.x1 - rect.x0)
      const y = rect.y0 + rng() * (rect.y1 - rect.y0)
      const depth = (y - rect.y0) / (rect.y1 - rect.y0 || 1)
      const h = (3 + rng() * 2.4) * (0.75 + depth * 0.5)
      const lean = (rng() - 0.5) * 10
      const blades = Array.from({ length: 3 }, (_, b) => ({
        dx: lean + (b - 1) * (5 + rng() * 3),
        len: h * (0.8 + rng() * 0.4),
      }))
      return { id: i, x, y, blades, delay: rng() * 3, dur: 2 + rng() * 1.4 }
    })
    // Sparse clover / tiny-daisy speckle — ground micro-texture variety, low
    // density so it reads as detail rather than a second flower layer.
    const sprinkleCount = Math.max(2, Math.round((rect.x1 - rect.x0) / 48))
    const sprinkles = Array.from({ length: sprinkleCount }, (_, i) => ({
      id: i,
      x: rect.x0 + rng() * (rect.x1 - rect.x0),
      y: rect.y0 + rng() * (rect.y1 - rect.y0),
      kind: rng() < 0.5 ? 'daisy' : 'clover',
    }))
    return { dapples, tufts, sprinkles }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, baseHue])
  const bladeDark = shadeColor(baseHue, -0.32)
  const bladeLight = shadeColor(baseHue, 0.3)
  const cloverTone = shadeColor(baseHue, -0.1)
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      {dapples.map((d, i) => (
        <path key={i} d={d.path} fill={d.tone} opacity={d.opacity.toFixed(2)} />
      ))}
      {tufts.map((t) => (
        <g
          key={t.id}
          transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}
          className={wind ? 'garden-grass-gust' : undefined}
          style={wind ? { animationDelay: `${t.delay.toFixed(2)}s`, animationDuration: `${t.dur.toFixed(2)}s` } : undefined}
        >
          {t.blades.map((b, bi) => (
            <path
              key={bi}
              d={`M0 0 Q${(b.dx * 0.5).toFixed(1)} ${(-b.len * 0.55).toFixed(1)} ${b.dx.toFixed(1)} ${(-b.len).toFixed(1)}`}
              fill="none"
              stroke={bi === 1 ? bladeLight : bladeDark}
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity={bi === 1 ? 0.5 : 0.32}
            />
          ))}
        </g>
      ))}
      {sprinkles.map((s) => (
        <g key={s.id} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} opacity="0.85">
          {s.kind === 'daisy' ? (
            <>
              {[0, 90, 180, 270].map((rot) => (
                <ellipse key={rot} cx="0" cy="0" rx="1" ry="0.5" fill="#fff8ec" transform={`rotate(${rot})`} />
              ))}
              <circle r="0.6" fill="#ffd45e" />
            </>
          ) : (
            <>
              <circle cx="-0.8" cy="0" r="0.7" fill={cloverTone} />
              <circle cx="0.8" cy="0" r="0.7" fill={cloverTone} />
              <circle cx="0" cy="-0.9" r="0.7" fill={cloverTone} />
            </>
          )}
        </g>
      ))}
    </g>
  )
}

// A simple post-and-rail gateway marking the seam between two owned zones —
// dressing for the "walking into a new part of the yard" transition the pan
// already implies. Only drawn once BOTH neighbouring zones are unlocked, so
// it always spans two real places rather than framing an empty gap.
function ZoneGateway({ x }) {
  return (
    <g transform={`translate(${x} 205)`} style={{ pointerEvents: 'none' }} aria-hidden="true">
      <ellipse cx="0" cy="1" rx="20" ry="4" fill="#100a06" opacity="0.26" />
      <rect x="-16" y="-34" width="4" height="34" rx="2" fill="url(#gardenWood)" />
      <rect x="12" y="-34" width="4" height="34" rx="2" fill="url(#gardenWood)" />
      <path d="M-16 -34 Q0 -46 16 -34" fill="none" stroke="url(#gardenWood)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="-14" cy="-30" r="1.4" fill="#e8c97a" />
      <circle cx="14" cy="-30" r="1.4" fill="#e8c97a" />
    </g>
  )
}

// An owned expansion zone's background art: continues the same sky/hill/grass
// gradients as the base scene (so it never reads as a bolted-on new style),
// a couple of soft background tree silhouettes so it feels like its own
// little grove rather than an empty clone, and a small wooden signpost
// naming it. Back Garden gets a cooler, shaded-grove tint to feel like a
// genuinely different, further-in part of the yard.
function ExpansionZoneArt({ id, phase, expansions, weather }) {
  const rect = gardenZoneRect(id)
  if (!rect) return null
  const theme = ZONE_THEMES[id] || ZONE_THEMES.base
  const shaded = Boolean(theme.shaded)
  const w = rect.x1 - rect.x0
  const name = expansionItem(id)?.name || ''
  // Fold the base lawn's own owned expansions into this zone's seed so a
  // zone's decor/path layout stays stable across renders but still differs
  // from an identical zone in a save with a different purchase history.
  const seedKey = `${id}:${(expansions || []).join(',')}`
  return (
    <g>
      <path
        d={`M${rect.x0} 148 Q${rect.x0 + w * 0.3} 126 ${rect.x0 + w * 0.5} 140 Q${rect.x0 + w * 0.7} 154 ${rect.x1} 134 V260 H${rect.x0} Z`}
        fill={DISTANT_HILLS[phase]}
        opacity={shaded ? 0.75 : 0.55}
      />
      <rect x={rect.x0} y="118" width={w} height="34" fill="url(#gardenHorizonHaze)" />
      <rect x={rect.x0} y="140" width={w} height="120" fill="url(#gardenGrassMid)" />
      <rect x={rect.x0} y="180" width={w} height="80" fill="url(#gardenGrassNear)" />
      {theme.tint && <rect x={rect.x0} y="140" width={w} height="120" fill={theme.tint} />}
      <GroundLight
        rect={{ x0: rect.x0 + 16, x1: rect.x1 - 16, y0: rect.y0, y1: rect.y1 }}
        seedKey={seedKey}
        baseHue={shaded ? '#3f7a52' : '#6fa84f'}
        wind={weather === 'windy'}
      />
      <g opacity={shaded ? 0.85 : 0.5} fill={shaded ? '#1c3d24' : theme.orchard ? '#6a8a48' : '#5f8f52'}>
        <ellipse cx={rect.x0 + w * 0.28} cy="150" rx="26" ry="20" />
        <ellipse cx={rect.x0 + w * 0.68} cy="146" rx="22" ry="17" />
        {theme.orchard && <ellipse cx={rect.x0 + w * 0.48} cy="152" rx="18" ry="15" />}
      </g>
      {/* Orchard: a scatter of little ripe-fruit dots in the canopy shapes. */}
      {theme.orchard && (
        <g fill="#d9663f" opacity="0.8">
          <circle cx={rect.x0 + w * 0.24} cy="146" r="2.2" />
          <circle cx={rect.x0 + w * 0.33} cy="152" r="2" />
          <circle cx={rect.x0 + w * 0.66} cy="142" r="2.2" />
          <circle cx={rect.x0 + w * 0.72} cy="149" r="2" />
        </g>
      )}
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

// A few oversized, unblurred blade tufts right at the bottom frame edges —
// sharp and dark where the rest of the scene reads soft/lit, the classic
// photographic "near object outside the depth of field" cue that sells real
// depth better than blur on the far layers alone.
function ForegroundGrass({ seedKey }) {
  const tufts = useMemo(() => {
    const rng = seededRng(`${seedKey}:fggrass`)
    const spots = [{ x: -4, y: 258 }, { x: 16, y: 260 }, { x: 388, y: 259 }, { x: 404, y: 257 }]
    return spots.map((s, i) => ({
      id: i,
      x: s.x + (rng() - 0.5) * 8,
      y: s.y,
      h: 16 + rng() * 10,
      lean: (rng() - 0.5) * 14,
    }))
  }, [seedKey])
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true" opacity="0.92">
      {tufts.map((t) => (
        <g key={t.id} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}>
          {[-1, 0, 1].map((b) => (
            <path
              key={b}
              d={`M0 0 Q${(t.lean * 0.4 + b * 6).toFixed(1)} ${(-t.h * 0.6).toFixed(1)} ${(t.lean + b * 11).toFixed(1)} ${(-t.h).toFixed(1)}`}
              fill="none"
              stroke="#16240f"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
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
  onRemove,
  onMove,
  onBack,
  onTreatResident,
  onWish,
  onPurchaseExpansion,
  onTapKallieMischief,
  tweety = null,
  seeds = 0,
  plantableSpecies = [],
}) {
  const plantings = useMemo(() => garden?.plantings || [], [garden])
  const residents = garden?.residents || []
  const today = saDateKey()
  // Kallie's daily mischief (dug-up hole / buried bone) — deterministic for
  // today's date key, so it's stable across re-renders and only changes
  // when the SA day rolls over.
  const kallieMischief = useMemo(() => kallieMischiefForDay(today), [today])
  const unlocked = GARDEN_SHOP.filter((i) => (garden?.shopUnlocked || []).includes(i.id))
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  // Expansion zones widen the world itself (see gardenData.js): the scene's
  // viewBox, the set of currently-placeable regions, and the outer bounds used
  // for decorative wildlife scatter all grow as she unlocks them.
  const expansions = useMemo(() => garden?.expansions || [], [garden?.expansions])
  const viewBox = useMemo(() => gardenViewBox(expansions), [expansions])
  const regions = useMemo(() => gardenRegions(expansions), [expansions])
  // Stable seed for the base lawn's own terrain dressing (ground texture,
  // paths, decor, border) — same pattern ExpansionZoneArt uses for its zones,
  // so a save's layout doesn't reshuffle on every render but still differs
  // from a save with a different purchase history.
  const baseZoneSeed = `base:${expansions.join(',')}`
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

  // Live weather (via geolocation + Open-Meteo — see gardenWeather.js): a
  // purely visual read of 'clear' | 'cloudy' | 'rain' that only ever changes
  // what's drawn (sky/clouds/rain overlay), never garden data. Held in plain
  // component state — nothing persisted, nothing synced. Falls back to
  // 'clear' silently on denied/unavailable location or any fetch failure.
  // Fetched once on mount, then re-checked every 20 minutes while the page
  // stays open.
  const [weather, setWeather] = useState('clear')
  useEffect(() => {
    let alive = true
    const refresh = () => {
      fetchGardenWeather().then((w) => {
        if (alive) setWeather(w)
      })
    }
    refresh()
    const iv = window.setInterval(refresh, 20 * 60 * 1000)
    return () => {
      alive = false
      window.clearInterval(iv)
    }
  }, [])

  const [selectedId, setSelectedId] = useState(null)
  const [selectedResidentId, setSelectedResidentId] = useState(null)
  // Move mode: id of a non-permanent planting she's repositioning. Tapping the
  // grass while this is set relocates that planting instead of creating a new
  // one — same tap-to-place interaction the shop/seed-pouch flow already uses,
  // just re-homing an existing id rather than minting one.
  const [movingId, setMovingId] = useState(null)
  // Remove is a two-tap confirmation, never a single accidental tap: the id
  // here is the planting currently showing "Are you sure?" in its detail
  // card. The detail view only renders this state when its id matches the
  // current selection, so it can never linger onto a different planting.
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
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

  // A dirt-poof where a fresh item just landed — cleared automatically.
  const [plantBurst, setPlantBurst] = useState(null) // { x, y }
  useEffect(() => {
    if (!plantBurst) return undefined
    const t = window.setTimeout(() => setPlantBurst(null), 600)
    return () => window.clearTimeout(t)
  }, [plantBurst])

  // A watering-can droplet + splash on the planting she just tapped Water
  // for — purely a local timed flourish, never touches the real onWater call.
  const [waterAnim, setWaterAnim] = useState(null) // { id }
  useEffect(() => {
    if (!waterAnim) return undefined
    const t = window.setTimeout(() => setWaterAnim(null), 900)
    return () => window.clearTimeout(t)
  }, [waterAnim])

  // Growth-stage-up flourish: a brief pop + sparkle scatter on whichever
  // planting(s) crossed into their next visible stage since the last render
  // (e.g. after a watering pushes one over a growth threshold). Compares
  // against a stable ref (not state) so it only fires on a real transition,
  // never on every render.
  const prevStageRef = useRef(new Map())
  const [justGrewIds, setJustGrewIds] = useState(() => new Set())
  useEffect(() => {
    const prev = prevStageRef.current
    const grew = []
    plantings.forEach((p) => {
      const key = plantStageKey(p)
      const before = prev.get(p.id)
      if (before !== undefined && before !== key) grew.push(p.id)
      prev.set(p.id, key)
    })
    if (grew.length) {
      setJustGrewIds(new Set(grew))
      const t = window.setTimeout(() => setJustGrewIds(new Set()), 1300)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [plantings])

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

  // Released companions roam the whole garden, not just their home spot: each
  // gets its own real waypoint, in whichever regions are currently unlocked,
  // that refreshes every 15-20s on an independent per-resident timer (so no
  // two ever pace in lockstep) — the actual glide between two waypoints is a
  // plain CSS `transition` on .garden-resident's left/top (see App.css),
  // the HTML-overlay equivalent of how a visiting FlyBird travels point to
  // point in the SVG scene. Falls back to her home spot until the first
  // waypoint lands.
  const [residentPos, setResidentPos] = useState({})
  const residentIdsKey = residents.map((r) => r.id).join(',')
  useEffect(() => {
    if (!residents.length) return undefined
    let alive = true
    const timers = new Map()
    residents.forEach((r) => {
      const scheduleNext = () => {
        const delay = 15000 + Math.random() * 5000
        const t = window.setTimeout(() => {
          if (!alive) return
          setResidentPos((cur) => ({ ...cur, [r.id]: pickWanderPoint(regions) }))
          scheduleNext()
        }, delay)
        timers.set(r.id, t)
      }
      scheduleNext()
    })
    return () => {
      alive = false
      timers.forEach((t) => window.clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentIdsKey, regions])

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
  }, [grownPerches, collection, isNight, worldBounds, phase])

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

  // Move mode shares the exact tap-to-place interaction as buying a new item
  // — the only difference is what happens on a valid tap (relocate an id
  // instead of minting one) and that the moving planting's own old spot must
  // never count against itself in the overlap check.
  const movingPlanting = movingId ? plantings.find((p) => p.id === movingId) : null
  const otherPlantings = movingId ? plantings.filter((p) => p.id !== movingId) : plantings

  function onScenePointerMove(evt) {
    if (!placingType && !movingId) return
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y, expansions)
    const type = movingId ? movingPlanting?.type : placingType
    const ok = Boolean(type) && canPlaceAt(type, s.x, s.y, otherPlantings, expansions)
    setGhost({ ...s, ok })
  }

  function onSceneClick(evt) {
    if (!placingType && !movingId) {
      setActiveLabelId(null)
      return
    }
    const raw = toScene(evt)
    if (!raw) return
    const s = snapToGarden(raw.x, raw.y, expansions)
    if (movingId) {
      if (!movingPlanting || !canPlaceAt(movingPlanting.type, s.x, s.y, otherPlantings, expansions)) return
      onMove?.(movingId, s.x, s.y)
      setPlantBurst({ x: s.x, y: s.y })
      setMovingId(null)
      setGhost(null)
      return
    }
    if (!canPlaceAt(placingType, s.x, s.y, plantings, expansions)) return
    onPlace(placingType, s.x, s.y)
    setPlantBurst({ x: s.x, y: s.y })
    setPlacingType(null)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacing(itemId) {
    setSelectedId(null)
    setActiveLabelId(null)
    setMovingId(null)
    setPlacingType(itemId)
    setPlacingSpeciesMeta(null)
    setGhost(null)
  }

  function startPlacingSpecies(speciesKey, commonName) {
    setSelectedId(null)
    setActiveLabelId(null)
    setMovingId(null)
    setPlacingType(`species:${speciesKey}`)
    setPlacingSpeciesMeta({ commonName })
    setGhost(null)
  }

  function startMoving(plantingId) {
    setSelectedId(null)
    setActiveLabelId(null)
    setPlacingType(null)
    setPlacingSpeciesMeta(null)
    setMovingId(plantingId)
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
  const sortedResidents = [...residents].sort(
    (a, b) => (residentPos[a.id]?.y ?? a.y ?? 0) - (residentPos[b.id]?.y ?? b.y ?? 0),
  )

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
          {' · '}Weather: <strong>{WEATHER_META[weather].label} {WEATHER_META[weather].icon}</strong>
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
              <stop offset="0" stopColor="#d8ecb4" />
              <stop offset="0.55" stopColor="#c4e094" />
              <stop offset="1" stopColor="#a9d078" />
            </linearGradient>
            {/* Third, palest/farthest hill band — between the hazy ridge and
                the mid band — so the terrain rolls in three steps of depth
                instead of two, palest-and-coolest furthest back. */}
            <linearGradient id="gardenGrassFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef3da" />
              <stop offset="1" stopColor="#d7e8bd" />
            </linearGradient>
            <linearGradient id="gardenGrassNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fc768" />
              <stop offset="0.55" stopColor="#6fa84f" />
              <stop offset="1" stopColor="#568f3f" />
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
            {/* Soft edge vignette — the very last thing painted (see the end
                of the scene below): gently darkens the frame's corners so the
                eye settles on the garden itself instead of the flat canvas
                edge, the way a considered illustration is lit rather than a
                flat crop. */}
            <radialGradient id="gardenVignette" cx="50%" cy="46%" r="72%">
              <stop offset="0" stopColor="#0c1608" stopOpacity="0" />
              <stop offset="0.72" stopColor="#0c1608" stopOpacity="0" />
              <stop offset="1" stopColor="#0c1608" stopOpacity="0.22" />
            </radialGradient>
            {/* Fog: densest right at the horizon, fully clear by the time it
                reaches the near lawn — "gentle and atmospheric, not
                obscuring" (see the fog wash render below). */}
            <linearGradient id="gardenFogWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef4f2" stopOpacity="0.75" />
              <stop offset="0.6" stopColor="#eef4f2" stopOpacity="0.4" />
              <stop offset="1" stopColor="#eef4f2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={viewBox.minX} y="0" width={viewBox.width} height="260" fill="url(#gardenSky)" />
          <GardenSky phase={phase} weather={weather} />
          {/* overcast sky tint — a soft grey wash over the upper sky band,
              on top of the phase gradient/sun/clouds, so cloudy/rainy weather
              reads immediately rather than only through the cloud shapes.
              Windy and fog deliberately don't touch the sky here — wind is
              pure motion (see the sway/leaf-drift below) and fog gets its
              own horizon-hugging haze rather than a sky-wide grey wash. */}
          {(weather === 'cloudy' || weather === 'rain') && (
            <rect
              x={viewBox.minX} y="0" width={viewBox.width} height="160"
              fill={weather === 'rain' ? '#5c6570' : '#8a929c'}
              opacity={weather === 'rain' ? 0.22 : 0.16}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {/* distant hazy ridge — atmospheric perspective, drawn behind both
              proper ground layers so the scene reads with real depth. One
              genuinely tall rise (a small koppie, the SA term for a rocky
              hillock) breaks the skyline left-of-centre as a fixed landmark,
              instead of a symmetric double-bump repeated at every depth. */}
          <path
            d="M0 150 Q40 128 90 136 Q130 142 150 118 Q175 92 205 122 Q230 146 270 134 Q320 118 360 138 Q385 148 400 140 V260 H0 Z"
            fill={DISTANT_HILLS[phase]}
            style={{ filter: 'blur(1px) opacity(0.7)' }}
          />
          <rect x={viewBox.minX} y="118" width={viewBox.width} height="34" fill="url(#gardenHorizonHaze)" style={{ pointerEvents: 'none' }} />
          {/* far/mid/near rolling-hill bands — each its own rhythm (peak
              count, spacing, amplitude) rather than the same wave repeated
              at three heights, so the terrain silhouette reads as real,
              varied ground instead of parallel bands. */}
          <path
            d="M0 158 Q50 140 100 148 Q140 154 165 168 Q190 180 230 162 Q270 144 310 156 Q345 166 400 152 V260 H0 Z"
            fill="url(#gardenGrassFar)"
            style={{ filter: 'blur(0.6px)' }}
          />
          <path d="M0 172 Q60 152 130 166 Q180 178 220 158 Q260 140 320 162 Q360 176 400 164 V260 H0 Z" fill="url(#gardenGrassMid)" />
          <path d="M0 198 Q90 182 190 194 Q260 202 340 190 Q375 186 400 192 V260 H0 Z" fill="url(#gardenGrassNear)" />
          {/* Crepuscular light rays — morning/evening only, sits above the
              hills but below the ground-level dressing so it reads as light
              falling across the landscape rather than a flat overlay. */}
          <LightRays phase={phase} />
          {/* Misty/foggy weather: a soft pale haze hugging the horizon and
              hill bands, fading out well before the near lawn — desaturates
              "toward the horizon" without ever covering plantings. */}
          {weather === 'fog' && (
            <rect x={viewBox.minX} y="118" width={viewBox.width} height="90" fill="url(#gardenFogWash)" style={{ pointerEvents: 'none' }} />
          )}
          {/* Ground light — soft, low-contrast sun/shadow drift baked into
              the lawn's own material (see GroundLight) rather than discrete
              decorative props scattered on top of it. */}
          <GroundLight rect={{ x0: GARDEN_REGION.x0 + 10, x1: GARDEN_REGION.x1 - 10, y0: GARDEN_REGION.y0, y1: GARDEN_REGION.y1 }} seedKey={baseZoneSeed} baseHue="#6fa84f" wind={weather === 'windy'} />

          {/* Kallie's paw prints — a little Easter egg walking trail across
              the lawn, a fresh random path each time the garden loads. */}
          <GardenPawPrints />

          {/* Kallie's daily mischief — a dug-up hole and/or a buried bone,
              same for everyone today, gone tomorrow. */}
          <GardenKallieMischief mischief={kallieMischief} onTap={onTapKallieMischief} />

          {/* Expansion zones: each owned zone continues the ground plane with
              the same gradients (own signpost so it reads as a real, distinct
              place); Back Garden gets a cooler shaded-grove tint. A zone that
              falls within the current view but ISN'T owned yet (e.g. Back
              Garden bought before Expand Right) renders as a fenced-off,
              non-interactive locked placeholder instead of a blank gap. */}
          {expansions.includes('expand-left') && (
            <ExpansionZoneArt id="expand-left" phase={phase} expansions={expansions} weather={weather} />
          )}
          {expansions.includes('expand-right') ? (
            <ExpansionZoneArt id="expand-right" phase={phase} expansions={expansions} weather={weather} />
          ) : expansions.includes('back-garden') ? (
            <LockedZonePlaceholder id="expand-right" />
          ) : null}
          {expansions.includes('back-garden') && (
            <ExpansionZoneArt id="back-garden" phase={phase} shaded expansions={expansions} weather={weather} />
          )}

          {/* Gateway markers at the seam between two owned zones — only once
              BOTH neighbours are real, so it never frames an empty gap. */}
          {expansions.includes('expand-left') && <ZoneGateway x={0} />}
          {expansions.includes('expand-right') && <ZoneGateway x={400} />}
          {expansions.includes('expand-right') && expansions.includes('back-garden') && (
            <ZoneGateway x={600} />
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
              const justGrew = justGrewIds.has(p.id)
              return (
                <g
                  key={p.id}
                  className={`garden-plant${justGrew ? ' garden-plant-justgrew' : ''}`}
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
                    {/* ground contact shadow — every planting sits IN the lawn
                        rather than floating on it, sized off the item's own
                        radius so a tree casts more shadow than a stepping
                        stone; purely visual, before the item's own art. */}
                    <ellipse cx="0" cy="1.5" rx={(gardenItem(p.type)?.r || 18) * 0.85} ry={(gardenItem(p.type)?.r || 18) * 0.3} fill="#152410" opacity="0.24" />
                    <g
                      className={swaying ? (weather === 'windy' ? 'garden-plant-sway-windy' : 'garden-plant-sway') : undefined}
                      style={swaying ? {
                        animationDelay: `${hashSeed(`${p.id}:swaydelay`) % 4}s`,
                        animationDuration: weather === 'windy'
                          ? `${2 + (hashSeed(`${p.id}:swaydur`) % 2)}s`
                          : `${6 + (hashSeed(`${p.id}:swaydur`) % 3)}s`,
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
                  {waterAnim?.id === p.id && (
                    <g transform="translate(0 -22)"><GardenWaterDrop /></g>
                  )}
                  {justGrew && (
                    <g transform="translate(0 -20)"><GardenGrowSparkle /></g>
                  )}
                  {!placingAny && <rect x="-24" y="-58" width="48" height="64" fill="transparent" />}
                </g>
              )
            })}

          {/* dirt-poof where a fresh item just landed */}
          {plantBurst && (
            <g transform={`translate(${plantBurst.x} ${plantBurst.y})`}>
              <GardenPlantBurst />
            </g>
          )}

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

          {/* time-of-day lighting wash over the ground (plantings read as
              lit) — rain always wins over whatever the phase wash would be,
              since an overcast/rainy sky reads the same cool grey regardless
              of time of day */}
          {(() => {
            const wash = weather === 'rain' ? RAIN_GROUND_WASH : GROUND_WASH[phase]
            return wash && (
              <rect x="0" y="120" width="400" height="140" fill={wash.fill} opacity={wash.opacity} style={{ pointerEvents: 'none' }} />
            )
          })()}

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

          {/* rain — falling in front of the whole scene, above plantings and
              creatures, same as it would in front of a real garden */}
          {weather === 'rain' && <RainOverlay viewBox={viewBox} />}

          {/* windy — loose leaves/petals blowing across the scene, same
              front-of-everything layering as rain */}
          {weather === 'windy' && <WindOverlay viewBox={viewBox} />}

          {/* foreground framing — a soft, blurred bush fringe at the very
              front-left edge, closer to the viewer than anything else in the
              scene, for real foreground/midground/background separation.
              Confined to the corner (partly off-canvas) so it never blocks
              the plantable area; fixed (not seeded per save) since it's
              scene furniture, not a per-garden random element. */}
          <g style={{ pointerEvents: 'none', filter: 'blur(1.4px)' }} opacity="0.94">
            <FoliageClump rng={seededRng('garden-foreground-fringe-a')} cx={-8} cy={254} rx={34} ry={26} hue="#2c4a2a" count={9} minR={10} maxR={18} />
            <FoliageClump rng={seededRng('garden-foreground-fringe-b')} cx={4} cy={236} rx={20} ry={16} hue="#233d22" count={6} minR={6} maxR={11} />
          </g>
          {/* sharp foreground grass at the very bottom edge — unblurred and
              dark against the soft blurred fringe above, so the scene reads
              with real foreground/midground/background separation. */}
          <ForegroundGrass seedKey={baseZoneSeed} />

          {/* edge vignette — painted last, over everything, never intercepts taps */}
          <rect x={viewBox.minX} y="0" width={viewBox.width} height="260" fill="url(#gardenVignette)" style={{ pointerEvents: 'none' }} />
        </svg>

        {/* Graduated companions live here permanently, rendered as their real
            species (GardenBird, tinted from BIRD_COLOUR_MAP — never the
            TweetyBird mascot art, which is for Tweety herself). HTML overlay
            positioned over the scene; the scene keeps its 400×260 box so scene
            coords map straight to percentages. Each one roams the whole
            garden via residentPos (see the wander-scheduling effect above)
            with a plain CSS transition gliding left/top between waypoints. */}
        {residents.length > 0 && (
          <div
            className="garden-residents"
            style={{ width: viewBox.width * unitPx, height: viewBox.height * unitPx }}
          >
            {sortedResidents.map((r) => {
              // Stable per-resident timing (not re-randomized every render): a
              // cheap hash of the id seeds delay/duration so she never looks
              // frozen, and no two residents ever sway or glide in lockstep.
              const seed = hashSeed(r.id)
              const pos = residentPos[r.id] || { x: r.homeX ?? r.x, y: r.homeY ?? r.y }
              const { template, zones } = residentBirdVisual(r)
              const reaction = residentReaction?.id === r.id ? residentReaction.kind : null
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`garden-resident${reaction === 'pet' ? ' garden-resident-react-pet' : ''}${reaction === 'treat' ? ' garden-resident-react-treat' : ''}`}
                  style={{
                    left: `${((pos.x - viewBox.minX) / viewBox.width) * 100}%`,
                    top: `${((pos.y - viewBox.minY) / viewBox.height) * 100}%`,
                    transitionDuration: `${2.4 + (seed % 10) * 0.15}s`,
                  }}
                  title={r.species}
                  onClick={() => { setSelectedResidentId(r.id); setActiveLabelId(r.id) }}
                  onMouseEnter={() => setActiveLabelId(r.id)}
                  onMouseLeave={() => setActiveLabelId((cur) => (cur === r.id ? null : cur))}
                >
                  <span className="garden-resident-wander">
                    <span
                      className="garden-resident-sway"
                      style={{ animationDelay: `${seed % 4}s`, animationDuration: `${3.4 + (seed % 5) * 0.3}s` }}
                    >
                      {/* .garden-resident-sway animates `transform` itself, so
                          the depth scale goes on this extra inner span. */}
                      <span style={{ display: 'inline-block', transform: `scale(${depthScale(pos.y ?? 0)})` }}>
                        <GardenBird template={template} zones={zones} size={44} ground={false} />
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

      {selectedResident && !placingAny && (() => {
        const { template, zones } = residentBirdVisual(selectedResident)
        const daysRaised = selectedResident.bornAt && selectedResident.releasedAt
          ? Math.max(1, Math.round((new Date(selectedResident.releasedAt) - new Date(selectedResident.bornAt)) / 86400000))
          : null
        return (
        <section className="soft-card full-span garden-detail garden-resident-detail">
          <div className="section-heading">
            <div className="garden-resident-detail-head">
              <span className="garden-resident-portrait">
                <GardenBird template={template} zones={zones} size={48} ground={false} />
              </span>
              <div>
                <p className="eyebrow">🪶 {selectedResident.name}</p>
                <h3>{selectedResident.species}</h3>
              </div>
            </div>
            <button className="text-btn" type="button" onClick={() => setSelectedResidentId(null)}>Close</button>
          </div>
          <div className="garden-resident-stats">
            <span>Raised from chick{daysRaised ? ` · ${daysRaised} days` : ''}</span>
            <span>
              {selectedResident.releasedAt
                ? `Released ${new Date(selectedResident.releasedAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : 'Released'}
            </span>
          </div>
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
        )
      })()}

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
            <div className="care-droplet-meter" aria-hidden="true">
              {Array.from({ length: item.waterToGrow }).map((_, i) => (
                <span key={i} className={`care-droplet${i < selected.wateredDays ? ' on' : ''}`}>
                  <svg viewBox="0 0 24 24"><path d="M12 2C8 8 4 12 4 16a8 8 0 0 0 16 0c0-4-4-8-8-14z" /></svg>
                </span>
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
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => { onWater(selected.id); setWaterAnim({ id: selected.id }) }}
                >
                  {item.verb} 💧
                </button>
              </>
            )}
            {!grown && (
              <div className="garden-detail-actions">
                {confirmRemoveId === selected.id ? (
                  <>
                    <p className="fine-print garden-remove-warning">Are you sure? This can’t be undone.</p>
                    <button className="danger-btn" type="button" onClick={() => { onRemove?.(selected.id); setConfirmRemoveId(null); setSelectedId(null) }}>Remove planting</button>
                    <button className="text-btn" type="button" onClick={() => setConfirmRemoveId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="secondary-btn" type="button" onClick={() => startMoving(selected.id)}>Move within this zone</button>
                    <button className="text-btn danger-text" type="button" onClick={() => setConfirmRemoveId(selected.id)}>Remove</button>
                  </>
                )}
              </div>
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
            <div className="catalog-shelf tier-starter garden-seed-shelf">
              <div className="catalog-row">
                {plantableSpecies.map((species) => {
                  const active = placingType === `species:${species.speciesKey}`
                  const disabled = (seeds <= 0 || coins < SEED_PLANT_COST) && !active
                  return (
                    <button
                      key={species.speciesKey}
                      className={`catalog-card${active ? ' active' : ''}`}
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
                      <span className="catalog-price">Plant 🌱 · {SEED_PLANT_COST} 🪙</span>
                    </button>
                  )
                })}
              </div>
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
            <div key={tier.id} className={`catalog-shelf tier-${tier.id}`}>
              <div className="catalog-shelf-heading">
                <strong>{tier.label}</strong>
                <span>{tier.range}</span>
              </div>
              <div className="catalog-row">
                {items.map((item) => {
                  const afford = coins >= item.cost
                  const active = placingType === item.id
                  return (
                    <button
                      key={item.id}
                      className={`catalog-card${active ? ' active' : ''}`}
                      type="button"
                      disabled={!afford && !active}
                      onClick={() => (active ? setPlacingType(null) : startPlacing(item.id))}
                    >
                      <span className="catalog-icon-wrap"><ShopItemIcon type={item.id} /></span>
                      <strong>{item.name}</strong>
                      <p className="catalog-blurb">{item.blurb}</p>
                      <span className="catalog-price">{item.cost} 🪙</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="catalog-shelf tier-premium garden-expansions">
          <div className="catalog-shelf-heading">
            <strong>Garden Expansions</strong>
            <span>permanent</span>
          </div>
          <p className="fine-print">
            Widen the garden itself — more room to place things, and it's yours forever. Swipe the scene left/right once unlocked.
          </p>
          <div className="catalog-row">
            {GARDEN_EXPANSIONS.map((zone) => {
              const owned = expansions.includes(zone.id)
              const afford = coins >= zone.cost
              return (
                <button
                  key={zone.id}
                  className={`catalog-card${owned ? ' owned' : ''}`}
                  type="button"
                  disabled={owned || !afford}
                  onClick={() => onPurchaseExpansion?.(zone.id)}
                >
                  <span className="catalog-icon-emoji">{zone.emoji}</span>
                  <strong>{zone.name}</strong>
                  <span className={`catalog-price${owned ? ' owned-tag' : ''}`}>{owned ? 'Unlocked ✓' : `${zone.cost} 🪙`}</span>
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
