// Tweety the pet bird — components only (helpers live in ./tweetyData).
import {
  tweetyDaysCared,
  tweetyLongestStreak,
  babyStage,
  babyStageLabel,
  babyCareToday,
  daysSince,
  AVIARY_MAX,
  TWEETY_COMPANIONS,
  getCompanion,
  companionSpecies,
  FIRST_EGGS,
  FIRST_EGG_WARMS,
  MYSTERY_EGG_WARMS,
  tweetyTodayKey,
  tweetyCareState,
  tweetySimpleMood,
  treatsBoostActive,
  happinessMood,
  HAPPINESS_MOOD_FACE,
  nextCareWindow,
  windowsDoneToday,
  tweetyGrowth,
  tweetyGrowthProgress,
  MOOD_FACE,
  playChirp,
  playTweetySong,
  tweetySongsLearned,
  tweetyFedToday,
} from './tweetyData'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GardenBird } from './birdTemplates'
import { BIRD_COLOUR_MAP } from './birdColourMap'
import { saTimePhase } from './saDate'

// Tweety's Home-card avatar uses the same species-accurate template/colour
// system the garden's visiting birds use (see birdTemplates.jsx/
// birdColourMap.js), resolved from her actual companion — see speciesArtFor
// below. This is only ever the fallback when a companion id somehow doesn't
// resolve to a known species (shouldn't happen for the six real companions).
const TWEETY_FALLBACK_SPECIES_KEY = 'cape-robin-chat'

// Real-time growth only has 5 milestones today (see GROWTH_STAGES in
// tweetyData.js: chick/fledgling/young/adult/crowned) — the original design
// brief described 6 ("juvenile"/"sub-adult" as separate steps), but that would
// mean adding a real new growth milestone (day thresholds, tests, etc.), well
// beyond a visual-scaling pass. 'young' — the one stage covering both — gets
// 0.8, the midpoint of the brief's juvenile (0.75) and sub-adult (0.85).
const TWEETY_STAGE_SCALE = {
  chick: 0.5,
  fledgling: 0.65,
  young: 0.8,
  adult: 1,
  crowned: 1,
}

// How much each young stage's colours are lightened toward white — baby
// birds read as duller/paler than the fully-coloured adult plumage. 0 at
// adult/crowned (full real Cape Robin-Chat colour).
const TWEETY_STAGE_MUTE = {
  chick: 0.35,
  fledgling: 0.22,
  young: 0.1,
  adult: 0,
  crowned: 0,
}

// Cage-view base render size at full (adult) growth-stage scale — up from the
// pre-redesign 110px so Tweety reads as the scene's focal point rather than
// one more small object among the room items (Phase 1 cage redesign; bumped
// again 190→213, ~12%, in the refinement pass — re-verified against every
// travel keyframe's clipping margin at this size, see the rescaled
// .tweety-hop-perch/.tweety-visit-bowl/.tweety-visit-water keyframes in
// App.css). Still multiplied by TWEETY_STAGE_SCALE and each species' own
// sizeScale below — neither of those changes, so relative growth-stage and
// per-species proportions stay exactly as they were.
const TWEETY_BASE_SIZE = 213
// Narrow-viewport render scale — replaces the old fixed ".tweety-bird { width:
// 60px !important }" mobile override (App.css), which fought the JS-computed
// size below rather than actually shrinking it (the SVG has its own explicit
// inline pixel size, which always wins over an unrelated CSS width on an
// ancestor). Driven from JS instead so mobile gets a real, proportionate size
// — never the old 60px collapse.
const TWEETY_NARROW_SIZE_FACTOR = 0.74
const TWEETY_NARROW_MEDIA_QUERY = '(max-width: 430px)'
// Every bird template's viewBox is 620x460 (see birdTemplates.jsx) — used
// here to convert a render WIDTH into the matching render HEIGHT, for the
// stage-aware perch rest offset below (see stageRestOffsetPx).
const SONGBIRD_SVG_ASPECT = 460 / 620
// Every template's ThreeToeFeet toe-tips reach y=390-396 of that same
// 620x460 viewBox (legs themselves end at y=380, toes splay out and down
// from there — verified across every template, not just songbird-small),
// i.e. her actual toe-contact point sits at ~85.4% down her own rendered
// box, not at its very bottom edge (there's empty margin below, meant for
// the templates' own built-in Ground rect, which TweetyHomeCard now
// disables — see ground={false} below). Used to calibrate stageRestOffsetPx
// against where her toes actually touch down, not her box's bottom edge.
const SONGBIRD_FEET_FRACTION = 393 / 460
// The main perch branch's own top edge sits at y=154 of CageFrameBack's
// 0-240 viewBox (see the <rect> in CageFrameBack below) — this is a few
// units past that, into the branch's own 10-unit thickness, so her toes
// read as gripping the wood rather than resting exactly on a mathematical
// boundary line. Expressed as a fraction of the CAGE's own height (not the
// bird's) because .tweety-room stretches this SAME viewBox non-uniformly
// per breakpoint (preserveAspectRatio="none") — but since the room's own
// aspect-ratio is fixed (4/5, see .tweety-room), this fraction of room
// height is identical at every breakpoint, unlike a fraction of the bird's
// own (independently-scaled) box height would be.
const CAGE_PERCH_LINE_FRACTION = 157 / 240
// .tweety-nest's own anchor (top: 25%, see App.css) — must stay in sync with
// that CSS rule; stageRestOffsetPx below is measured from this line.
const TWEETY_REST_ANCHOR_FRACTION = 0.25

// Same blend-toward-white used for the garden plant templates' secondary-leaf
// tone (see Garden.jsx's lightenHex) — duplicated locally rather than shared
// across files for one small pure function.
function lightenHex(hex, amount) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const mix = (v) => Math.round(v + (255 - v) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function mutedZones(zones, amount) {
  if (!amount) return zones
  return Object.fromEntries(Object.entries(zones).map(([key, value]) => [key, lightenHex(value, amount)]))
}

// Resolves the actual illustrated species art (template + colour zones) for a
// companion id — the same BIRD_COLOUR_MAP lookup AviaryBird/EggSpeciesPicker
// already use elsewhere (see aviarySlugify below), so Tweety's Home card
// avatar always matches whichever bird she actually hatched/has as her
// companion instead of one fixed placeholder species.
function speciesArtFor(companionId, realSpecies) {
  const slug = aviarySlugify(realSpecies || companionSpecies(companionId))
  return BIRD_COLOUR_MAP[slug] || BIRD_COLOUR_MAP[TWEETY_FALLBACK_SPECIES_KEY]
}

// A small crown overlay for the crowned-adult stage — GardenBird's templates
// have no crown of their own (they're shared with the garden's visiting
// birds), so this sits as a separate absolutely-positioned element above the
// head rather than inside birdTemplates.jsx.
function TweetyCrown() {
  return (
    <svg viewBox="0 0 40 28" className="tweety-garden-crown" aria-hidden="true">
      <path
        d="M4 24 L4 12 L12 18 L20 6 L28 18 L36 12 L36 24 Z"
        fill="#f2c230" stroke="#8a6a1a" strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="20" cy="6" r="2.6" fill="#f2c230" stroke="#8a6a1a" strokeWidth="1.2" />
    </svg>
  )
}

// ---- wearable layers (hats, accessories, outfits) --------------------------
// Drawn inside Tweety's 100×100 viewBox. Head sits around y30–46, eyes at y50,
// body ellipse around cy58. Outfits cover the lower body, accessories the neck,
// hats the crown of the head.
function HatLayer({ id }) {
  switch (id) {
    case 'flower-crown':
      return (
        <g>
          {[[34, 34, '#f6a5c0'], [42, 31, '#fff0b3'], [50, 30, '#f8b4d0'], [58, 31, '#c9a8e8'], [66, 34, '#a8d8f0']].map(([x, y, c], i) => (
            <g key={i}><circle cx={x} cy={y} r="4" fill={c} /><circle cx={x} cy={y} r="1.6" fill="#ffd45e" /></g>
          ))}
        </g>
      )
    case 'winter-beanie':
      return (
        <g>
          <path d="M32 38 q18 -22 36 0 z" fill="#5b86c4" />
          <rect x="31" y="36" width="38" height="6" rx="3" fill="#cfe0f4" />
          <circle cx="50" cy="18" r="4" fill="#cfe0f4" />
        </g>
      )
    case 'party-hat':
      return (
        <g>
          <path d="M50 10 L40 38 L60 38 Z" fill="#f48fb1" />
          <path d="M50 10 L45 24 L55 24 Z" fill="#ffd45e" />
          <circle cx="50" cy="10" r="3" fill="#7ec8e3" />
        </g>
      )
    case 'graduation-cap':
      return (
        <g>
          <path d="M30 30 L50 22 L70 30 L50 38 Z" fill="#2f2a3a" />
          <rect x="46" y="30" width="8" height="6" fill="#2f2a3a" />
          <path d="M68 30 v10" stroke="#ffd45e" strokeWidth="1.5" /><circle cx="68" cy="41" r="2.4" fill="#ffd45e" />
        </g>
      )
    case 'cowboy-hat':
      return (
        <g>
          <ellipse cx="50" cy="36" rx="24" ry="6" fill="#9c6843" />
          <path d="M38 36 q2 -16 12 -16 q10 0 12 16 z" fill="#b5895a" />
          <rect x="38" y="33" width="24" height="3.5" fill="#6f4a2c" />
        </g>
      )
    case 'crown':
      return <path d="M36 36 L38 20 L46 28 L50 16 L54 28 L62 20 L64 36 Z" fill="#F2C24E" stroke="#D9A036" strokeWidth="1" />
    case 'diamond-crown':
      return (
        <g>
          <path d="M36 36 L38 20 L46 28 L50 16 L54 28 L62 20 L64 36 Z" fill="#bfe6f7" stroke="#7ec8e3" strokeWidth="1" />
          {[42, 50, 58].map((x) => <circle key={x} cx={x} cy={32} r="2" fill="#ffffff" />)}
        </g>
      )
    case 'santa-hat':
      return (
        <g>
          <path d="M32 38 q6 -24 30 -20 q-6 8 -10 20 z" fill="#d8453a" />
          <rect x="31" y="35" width="34" height="6" rx="3" fill="#fff" />
          <circle cx="62" cy="18" r="4" fill="#fff" />
        </g>
      )
    case 'detective-hat':
      return (
        <g>
          <ellipse cx="50" cy="36" rx="24" ry="5" fill="#8a7a5a" />
          <path d="M36 36 q4 -14 14 -14 q10 0 14 14 z" fill="#a3936e" />
          <rect x="40" y="30" width="20" height="3" fill="#7a6c4f" />
        </g>
      )
    case 'witch-hat':
      return (
        <g>
          <ellipse cx="50" cy="38" rx="22" ry="5" fill="#3a2f50" />
          <path d="M50 8 q8 20 12 30 q-12 -4 -24 0 q4 -10 12 -30 z" fill="#4a3a66" />
          <rect x="40" y="33" width="20" height="4" fill="#ffd45e" />
        </g>
      )
    case 'sunhat':
      return (
        <g>
          <ellipse cx="50" cy="36" rx="26" ry="7" fill="#f3dca0" />
          <path d="M40 36 q2 -14 10 -14 q8 0 10 14 z" fill="#e9cf86" />
          <rect x="40" y="32" width="20" height="3.5" fill="#f6a5c0" />
        </g>
      )
    case 'pirate-hat':
      return (
        <g>
          <path d="M30 34 q20 -10 40 0 q-6 6 -20 6 q-14 0 -20 -6 z" fill="#2c2c33" />
          <path d="M30 34 q20 8 40 0" fill="none" stroke="#e0c089" strokeWidth="1.5" />
          <g fill="#e8e8e8"><circle cx="50" cy="30" r="3" /><circle cx="48" cy="29.5" r="0.8" fill="#2c2c33" /><circle cx="52" cy="29.5" r="0.8" fill="#2c2c33" /></g>
        </g>
      )
    case 'chef-hat':
      return (
        <g>
          <rect x="40" y="32" width="20" height="8" rx="2" fill="#fff" stroke="#e2e2e2" />
          <path d="M40 32 q-4 -16 10 -14 q14 -2 10 14 z" fill="#fff" stroke="#e2e2e2" />
          <circle cx="44" cy="22" r="5" fill="#fff" /><circle cx="56" cy="22" r="5" fill="#fff" />
        </g>
      )
    default:
      return null
  }
}

function OutfitLayer({ id }) {
  switch (id) {
    case 'tuxedo':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-4 22 q-12 5 -24 0 z" fill="#2c2c33" />
          <path d="M50 60 l-8 8 l8 4 l8 -4 z" fill="#fff" />
          <path d="M47 64 l3 3 l3 -3 l-1 4 h-4 z" fill="#d8453a" />
        </g>
      )
    case 'princess-dress':
      return (
        <g>
          <path d="M40 64 q10 5 20 0 l10 20 q-20 8 -40 0 z" fill="#f6a5c0" />
          <path d="M40 64 q10 5 20 0 l2 5 q-12 4 -24 0 z" fill="#f8c6dd" />
          <circle cx="50" cy="68" r="2" fill="#ffd45e" />
        </g>
      )
    case 'explorer-vest':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 20 q-13 5 -26 0 z" fill="#9c8a5a" />
          <rect x="38" y="70" width="8" height="7" rx="1" fill="#7a6c44" />
          <rect x="54" y="70" width="8" height="7" rx="1" fill="#7a6c44" />
        </g>
      )
    case 'pyjamas':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 22 q-13 5 -26 0 z" fill="#8fb3e0" />
          {[[42, 70], [54, 70], [46, 78], [58, 76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.8" />)}
        </g>
      )
    case 'rain-jacket':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 22 q-13 5 -26 0 z" fill="#f5c542" />
          <path d="M50 60 v22" stroke="#d9a82e" strokeWidth="1.5" />
          <path d="M34 60 q6 4 6 12" fill="none" stroke="#d9a82e" strokeWidth="1.5" />
        </g>
      )
    case 'winter-coat':
      return (
        <g>
          <path d="M33 60 q17 7 34 0 l-3 23 q-14 5 -28 0 z" fill="#7a5b8c" />
          <path d="M50 60 v23" stroke="#5e4670" strokeWidth="2" />
          {[66, 74, 80].map((y) => <circle key={y} cx="50" cy={y} r="1.6" fill="#ffd45e" />)}
          <rect x="42" y="58" width="16" height="5" rx="2" fill="#d8c6e0" />
        </g>
      )
    case 'superhero-suit':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 22 q-13 5 -26 0 z" fill="#3a6fd8" />
          <path d="M50 66 l4 6 l-4 8 l-4 -8 z" fill="#ffd45e" />
        </g>
      )
    case 'ballerina-tutu':
      return (
        <g>
          <path d="M36 70 q14 6 28 0 q-2 8 -14 9 q-12 -1 -14 -9 z" fill="#f8c6dd" />
          <path d="M36 70 q14 6 28 0" fill="none" stroke="#f6a5c0" strokeWidth="2" />
        </g>
      )
    case 'dino-costume':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 22 q-13 5 -26 0 z" fill="#5cbd79" />
          <path d="M40 58 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 z" fill="#3f9a5e" />
        </g>
      )
    case 'love-letter-outfit':
      return (
        <g>
          <path d="M34 60 q16 6 32 0 l-3 22 q-13 5 -26 0 z" fill="#f7d6e0" />
          {[[42, 70], [56, 72], [48, 79]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="6" fill="#d8453a">♥</text>)}
          <path d="M44 62 h12 v7 h-12 z M44 62 l6 4 l6 -4" fill="#fff" stroke="#d8453a" strokeWidth="0.8" />
        </g>
      )
    default:
      return null
  }
}

function AccessoryLayer({ id }) {
  switch (id) {
    case 'scarf':
      return (
        <g>
          <path d="M38 64 q12 7 24 0 l-1 5 q-11 5 -22 0 z" fill="#d8453a" />
          <path d="M58 68 l3 12 l-6 0 z" fill="#c33a30" />
        </g>
      )
    case 'bow-tie':
      return (
        <g>
          <path d="M50 66 l-9 -4 v8 z" fill="#d8453a" /><path d="M50 66 l9 -4 v8 z" fill="#d8453a" />
          <circle cx="50" cy="66" r="2.4" fill="#a02a22" />
        </g>
      )
    case 'heart-necklace':
      return (
        <g>
          <path d="M40 62 q10 8 20 0" fill="none" stroke="#ffd45e" strokeWidth="1.4" />
          <path d="M50 70 l-3 -3 a2 2 0 0 1 3 -2 a2 2 0 0 1 3 2 z" fill="#e8526a" />
        </g>
      )
    case 'pearl-necklace':
      return (
        <g fill="#fff" stroke="#e0e0e0" strokeWidth="0.5">
          {[[41, 63], [45, 66], [50, 67], [55, 66], [59, 63]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" />)}
        </g>
      )
    case 'sunglasses':
      return (
        <g fill="#2c2c33">
          <rect x="38" y="47" width="9" height="6" rx="3" /><rect x="53" y="47" width="9" height="6" rx="3" />
          <rect x="47" y="49" width="6" height="1.6" />
        </g>
      )
    case 'monocle':
      return (
        <g>
          <circle cx="57" cy="50" r="5" fill="none" stroke="#ffd45e" strokeWidth="1.4" />
          <path d="M57 55 l-2 9" stroke="#ffd45e" strokeWidth="1" />
        </g>
      )
    case 'cape':
      return <path d="M30 56 q20 10 40 0 l6 26 q-26 8 -52 0 z" fill="#7a2ad8" opacity="0.9" />
    case 'backpack':
      return (
        <g>
          <path d="M36 56 q4 8 0 18" fill="none" stroke="#c97b3a" strokeWidth="2" />
          <path d="M64 56 q-4 8 0 18" fill="none" stroke="#c97b3a" strokeWidth="2" />
          <rect x="64" y="60" width="12" height="16" rx="3" fill="#e07a3c" />
        </g>
      )
    case 'fairy-wings':
      return (
        <g fill="#bfe6f7" opacity="0.75" stroke="#9ad4f0" strokeWidth="0.8">
          <path d="M30 50 q-16 -6 -10 12 q6 8 16 -2 z" />
          <path d="M70 50 q16 -6 10 12 q-6 8 -16 -2 z" />
        </g>
      )
    case 'bandana':
      return (
        <g>
          <path d="M40 62 q10 6 20 0 l-10 14 z" fill="#d8453a" />
          {[[46, 66], [52, 66], [49, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#fff" />)}
        </g>
      )
    case 'rainbow-bow':
      return (
        <g>
          <path d="M64 38 l-7 -3 v8 z" fill="#f48fb1" /><path d="M64 38 l7 -3 v8 z" fill="#7ec8e3" />
          <circle cx="64" cy="38" r="2.2" fill="#ffd45e" />
        </g>
      )
    case 'angel-halo':
      return <ellipse cx="50" cy="20" rx="13" ry="4" fill="none" stroke="#ffe07a" strokeWidth="2.6" />
    case 'golden-feather':
      return (
        <g>
          <path d="M66 44 q10 -8 12 -20 q-12 6 -16 16 z" fill="#ffd45e" stroke="#e0a64f" strokeWidth="0.6" />
          <path d="M67 42 q4 -6 9 -13" stroke="#e0a64f" strokeWidth="0.7" fill="none" />
        </g>
      )
    case 'magic-wand':
      return (
        <g>
          <line x1="70" y1="74" x2="78" y2="56" stroke="#7a5b8c" strokeWidth="2" strokeLinecap="round" />
          <path d="M78 50 l1.5 4 l4 0.5 l-3 3 l1 4 l-3.5 -2 l-3.5 2 l1 -4 l-3 -3 l4 -0.5 z" fill="#ffd45e" />
        </g>
      )
    case 'tiny-guitar':
      return (
        <g>
          <line x1="64" y1="60" x2="76" y2="48" stroke="#8a5e3b" strokeWidth="2" />
          <ellipse cx="62" cy="64" rx="6" ry="7" fill="#c97b3a" transform="rotate(-30 62 64)" />
          <circle cx="62" cy="64" r="2" fill="#5e3a1e" />
        </g>
      )
    case 'marnich-gift-box':
      return (
        <g>
          <rect x="45" y="64" width="10" height="9" rx="1" fill="#e8526a" />
          <rect x="45" y="64" width="10" height="3" fill="#c33a52" />
          <path d="M50 64 v9 M45 67 h10" stroke="#ffd45e" strokeWidth="1" />
        </g>
      )
    default:
      return null
  }
}

function WornLayers({ worn }) {
  if (!worn) return null
  return (
    <g className="tweety-worn">
      {worn.outfit && <OutfitLayer id={worn.outfit} />}
      {worn.accessory && <AccessoryLayer id={worn.accessory} />}
      {worn.hat && <HatLayer id={worn.hat} />}
    </g>
  )
}

// ---- Tweety SVG ------------------------------------------------------------
// Per-stage geometry so each life stage looks NOTICEABLY different in size
// and shape. `scale` shrinks/grows the whole silhouette inside the 100×100
// viewBox; rx/wings change the body proportions and feather development.
const STAGE_SHAPE = {
  chick: { rx: 19, wings: 0, scale: 0.62, crown: false }, // tiny, fluffy, barely any wings
  fledgling: { rx: 23, wings: 1, scale: 0.76, crown: false }, // stubby wings appearing
  young: { rx: 26, wings: 2, scale: 0.88, crown: false }, // proper wings, more defined
  adult: { rx: 29, wings: 3, scale: 1, crown: false }, // full size, confident
  crowned: { rx: 29, wings: 3, scale: 1, crown: true }, // full size + golden crown
  // legacy aliases still used around the app
  grown: { rx: 29, wings: 3, scale: 1, crown: false },
  crown: { rx: 29, wings: 3, scale: 1, crown: true },
}

// ============================================================================
// Companion species visuals. Each of the six companions renders as its real SA
// species with diagnostic features that DEVELOP across the five growth stages,
// the same way the Cape Robin-Chat does: juveniles are duller/spotted with the
// key markings only hinted, and the full distinctive plumage arrives at
// adulthood (the crowned stage = adult plumage + the golden crown on top).
//
// Purely cosmetic — geometry/size still come from STAGE_SHAPE, and nothing here
// touches growth, mood, care or saved state. Only `companion` ids listed here
// get species art; an unknown/empty companion falls back to the golden chick.
// Species names/labels live with TWEETY_COMPANIONS in tweetyData.js.
//
// Per species: `adult` (+ optional `young`) and `juv` palettes, plus a `feats`
// descriptor of the distinguishing features. companionVisual() resolves these
// into a flat `vis` object the SVG reads.
// ============================================================================
const SPECIES = {
  // Cape Robin-Chat — grey-brown back, orange breast, white eyebrow, rufous tail.
  robin: {
    adult: { back: '#8C8275', wing: '#7A7165', beak: '#34302A', feet: '#C08A6A', eye: '#2C2620' },
    young: { back: '#988A78', wing: '#84796A', beak: '#43392F', feet: '#C08A6A', eye: '#2C2620' },
    juv: { back: '#A8957A', wing: '#9B886C', beak: '#5A4A3A', feet: '#C08A6A', eye: '#2C2620' },
    breast: { adult: '#E8743C', young: '#E07E45', juv: '#D98A5A' },
    greyBelly: '#CFCBC2',
    feats: { brow: '#FFFFFF', faceMask: '#4A4742', tail: 'rufous', tailColor: '#D9742E', spotsJuv: true },
  },
  // Southern Masked Weaver — bright yellow, black face mask, red eye, olive back.
  weaver: {
    adult: { back: '#F2D21E', wing: '#AEA836', beak: '#2A2620', feet: '#C8A86A', eye: '#C0392B' },
    juv: { back: '#D8CE7E', wing: '#B6AE72', beak: '#6A5E44', feet: '#C8A86A', eye: '#2C2620' },
    feats: { mask: '#211E16', redEyeAdult: true, tail: 'short' },
  },
  // Malachite Sunbird — iridescent green, long down-curved bill, tail streamers.
  sunbird: {
    adult: { back: '#2FA85F', wing: '#1E7A45', beak: '#2A2620', feet: '#3A3A2A', eye: '#15301F' },
    juv: { back: '#8FA37A', wing: '#7E946A', beak: '#5A4A3A', feet: '#5A5A40', eye: '#2C2620' },
    feats: { bill: 'longCurved', streamers: '#1E7A45', tuft: '#F2D21E', sheen: '#5FD08A' },
  },
  // Southern Red Bishop — scarlet, black face + black belly, brown wings.
  bishop: {
    adult: { back: '#E8431E', wing: '#7A5A38', beak: '#2A2620', feet: '#C8A86A', eye: '#2C1010' },
    juv: { back: '#B8A574', wing: '#A08A5A', beak: '#7A6A48', feet: '#C8A86A', eye: '#2C2620' },
    feats: { mask: '#1E1B16', blackBelly: '#1E1B16', streaksJuv: true, tail: 'short' },
  },
  // Cape Sparrow — black head with white C-curl, chestnut back, grey underparts.
  sparrow: {
    adult: { back: '#9C5A2C', wing: '#8A4E26', beak: '#2A2620', feet: '#C88A5A', eye: '#2C2620' },
    juv: { back: '#B79A78', wing: '#A98A66', beak: '#6A5A40', feet: '#C88A5A', eye: '#2C2620' },
    greyUnder: '#BDB7AD', whiteBelly: '#EAE6DC',
    feats: { capeHead: true, wingBar: true, tail: 'short' },
  },
  // Malachite Kingfisher — blue back + crest, orange underparts, long red bill.
  kingfisher: {
    adult: { back: '#1E78D2', wing: '#1660B0', beak: '#D83A2A', feet: '#D83A2A', eye: '#15233A' },
    juv: { back: '#3E86C8', wing: '#2E6FB0', beak: '#2C2620', feet: '#9A6A5A', eye: '#15233A' },
    orangeUnder: '#E8743C', juvOrange: '#E0915E',
    feats: { bill: 'longStraight', crest: '#1660B0', whiteSpot: true },
  },
  // Generic "wild garden bird" — NOT a selectable companion. Used to draw any
  // collection species that isn't one of the six companions in the Bird Garden,
  // so visitors are always illustrated (never photos) and visually consistent
  // with Tweety. A neutral warm-brown songbird with a soft pale belly and a
  // short tail; no special markings so it reads as "a little wild bird".
  wild: {
    adult: { back: '#9A8867', wing: '#857357', beak: '#3A332A', feet: '#B5895A', eye: '#2C2620' },
    young: { back: '#A2906F', wing: '#8C7A5E', beak: '#473E33', feet: '#B5895A', eye: '#2C2620' },
    juv: { back: '#B09A78', wing: '#9C8A6C', beak: '#5A4A3A', feet: '#B5895A', eye: '#2C2620' },
    greyUnder: '#D8D0C0', whiteBelly: '#EFEADF',
    feats: { tail: 'short' },
  },
  // Recoloured siblings of 'wild', same neutral shape — gardenCompanionFor
  // hashes any species it can't otherwise identify across this whole set
  // (see wild + WILD_VARIANTS below) instead of always returning plain
  // 'wild', so two different unmapped species (a heron and a thick-knee, say)
  // never render as the literal same bird.
  wild2: {
    adult: { back: '#6E7C89', wing: '#5C6A76', beak: '#332E28', feet: '#8A7A5A', eye: '#20241E' },
    young: { back: '#7C8996', wing: '#6A7784', beak: '#463F36', feet: '#8A7A5A', eye: '#20241E' },
    juv: { back: '#8A97A2', wing: '#78848F', beak: '#5A4A3A', feet: '#8A7A5A', eye: '#2C2620' },
    greyUnder: '#CBD2D6', whiteBelly: '#E9EEEF',
    feats: { tail: 'short' },
  },
  wild3: {
    adult: { back: '#6E8A4E', wing: '#5C7640', beak: '#332A1E', feet: '#A08A5A', eye: '#20241E' },
    young: { back: '#7C9760', wing: '#6A8250', beak: '#463A2A', feet: '#A08A5A', eye: '#20241E' },
    juv: { back: '#8CA470', wing: '#7A9060', beak: '#5A4A3A', feet: '#A08A5A', eye: '#2C2620' },
    greyUnder: '#D6DEC4', whiteBelly: '#EDF2E0',
    feats: { tail: 'short' },
  },
  wild4: {
    adult: { back: '#B08A4A', wing: '#96733A', beak: '#3A2E1E', feet: '#8A6A42', eye: '#20180E' },
    young: { back: '#BC9860', wing: '#A28248', beak: '#4A3B28', feet: '#8A6A42', eye: '#20180E' },
    juv: { back: '#C8A874', wing: '#AE9258', beak: '#5A4A3A', feet: '#8A6A42', eye: '#2C2620' },
    greyUnder: '#EAD9B8', whiteBelly: '#F5EBD4',
    feats: { tail: 'short' },
  },
  wild5: {
    adult: { back: '#9A5A42', wing: '#804832', beak: '#2E241C', feet: '#7A5A3A', eye: '#1C140E' },
    young: { back: '#A66C54', wing: '#8C5A42', beak: '#3E3024', feet: '#7A5A3A', eye: '#1C140E' },
    juv: { back: '#B27E66', wing: '#986C54', beak: '#4E3E30', feet: '#7A5A3A', eye: '#2C2620' },
    greyUnder: '#DEC0AE', whiteBelly: '#F0DDD2',
    feats: { tail: 'short' },
  },
  wild6: {
    adult: { back: '#4A4A50', wing: '#3A3A40', beak: '#241E18', feet: '#6A6258', eye: '#100E0C' },
    young: { back: '#5A5A60', wing: '#4A4A50', beak: '#342E26', feet: '#6A6258', eye: '#100E0C' },
    juv: { back: '#6A6A70', wing: '#5A5A60', beak: '#443A2E', feet: '#6A6258', eye: '#2C2620' },
    greyUnder: '#B8B8BE', whiteBelly: '#DEDEE2',
    feats: { tail: 'short' },
  },
  wild7: {
    adult: { back: '#A2765E', wing: '#88604A', beak: '#302620', feet: '#8A6A4E', eye: '#1E1610' },
    young: { back: '#AE8670', wing: '#946E58', beak: '#40342A', feet: '#8A6A4E', eye: '#1E1610' },
    juv: { back: '#BA9682', wing: '#A07C66', beak: '#503E30', feet: '#8A6A4E', eye: '#2C2620' },
    greyUnder: '#E4CEC2', whiteBelly: '#F2E4DC',
    feats: { tail: 'short' },
  },
  wild8: {
    adult: { back: '#3E7A72', wing: '#32665E', beak: '#241E18', feet: '#7A7A5A', eye: '#101E1A' },
    young: { back: '#4E8880', wing: '#42746C', beak: '#342A22', feet: '#7A7A5A', eye: '#101E1A' },
    juv: { back: '#5E968E', wing: '#52827A', beak: '#443A2E', feet: '#7A7A5A', eye: '#2C2620' },
    greyUnder: '#C0D6D2', whiteBelly: '#E0EEEC',
    feats: { tail: 'short' },
  },
  // ---- Garden-visitor-only species (below): NOT selectable companions, never
  // in TWEETY_COMPANIONS — visual ids resolved purely by gardenCompanionFor()
  // (see tweetyData.js) so every Collection bird visiting the garden gets its
  // own real SA colouring instead of falling back to the neutral 'wild' bird.
  // Hadeda Ibis — dark grey-brown, glossy green wing patch, long curved bill.
  hadeda: {
    adult: { back: '#4A423A', wing: '#3E362E', beak: '#5A4632', feet: '#5A4A3A', eye: '#2C2620' },
    young: { back: '#554B40', wing: '#463C32', beak: '#63503A', feet: '#5A4A3A', eye: '#2C2620' },
    juv: { back: '#605448', wing: '#4F4238', beak: '#6E5A42', feet: '#5A4A3A', eye: '#2C2620' },
    feats: { bill: 'longCurved', wingPatch: '#2E7D5B', tail: 'short' },
  },
  // Common Starling — glossy near-black with purple-green iridescence, pale
  // winter speckling.
  starling: {
    adult: { back: '#221F26', wing: '#1B181E', beak: '#D8A23A', feet: '#8A6A2A', eye: '#15130F' },
    young: { back: '#3A3540', wing: '#2E2A34', beak: '#7A6248', feet: '#8A6A2A', eye: '#15130F' },
    juv: { back: '#544C46', wing: '#463F3A', beak: '#6A5A44', feet: '#8A6A2A', eye: '#2C2620' },
    feats: { sheen: '#6A4FA0', speckle: '#D9D2C0', tail: 'short' },
  },
  // Chestnut-vented Warbler — brown back, pale breast, chestnut vent/rump.
  warbler: {
    adult: { back: '#8A7256', wing: '#7A6248', beak: '#4A3B2C', feet: '#9A8060', eye: '#2C2620' },
    young: { back: '#93806A', wing: '#846E52', beak: '#5A4838', feet: '#9A8060', eye: '#2C2620' },
    juv: { back: '#9C8A70', wing: '#8C7A5C', beak: '#6A5642', feet: '#9A8060', eye: '#2C2620' },
    breast: { adult: '#EDE3CE', young: '#EDE3CE', juv: '#E5D9BE' },
    feats: { tail: 'short', rump: '#9C5A2C' },
  },
  // Scaly-feathered Weaver — brown with a scaly black-and-white chest pattern,
  // a tiny pale bill.
  scalyweaver: {
    adult: { back: '#9C8A6C', wing: '#8A7856', beak: '#C8A86A', feet: '#B89868', eye: '#2C2620' },
    young: { back: '#A8977A', wing: '#968562', beak: '#B89868', feet: '#B89868', eye: '#2C2620' },
    juv: { back: '#B3A488', wing: '#A0906E', beak: '#A88C60', feet: '#B89868', eye: '#2C2620' },
    feats: { tail: 'short', scalyChest: true, tinyBill: true },
  },
  // Emerald-spotted Wood Dove — grey-brown, bright emerald wing spots.
  wooddove: {
    adult: { back: '#9C8E78', wing: '#897A62', beak: '#6A5642', feet: '#B5895A', eye: '#2C2620' },
    young: { back: '#A79A82', wing: '#948468', beak: '#7A6650', feet: '#B5895A', eye: '#2C2620' },
    juv: { back: '#B3A78E', wing: '#A0916E', beak: '#8A7660', feet: '#B5895A', eye: '#2C2620' },
    feats: { tail: 'short', wingSpots: '#2FA85F' },
  },
  // Familiar Chat — dark brown back, rufous-orange tail and rump.
  familiarchat: {
    adult: { back: '#4A3826', wing: '#3E2E1E', beak: '#2A2016', feet: '#6A5238', eye: '#15100A' },
    young: { back: '#5A4634', wing: '#4C3A2A', beak: '#3A2E20', feet: '#6A5238', eye: '#15100A' },
    juv: { back: '#6A5644', wing: '#5C4A38', beak: '#4A3A2A', feet: '#6A5238', eye: '#2C2620' },
    feats: { tail: 'rufous', tailColor: '#E8743C', rump: '#E8743C' },
  },
}

// How "adult" a stage is: 0 = chick … 1 = adult. Features fade in along this.
const STAGE_AGE = { chick: 0, fledgling: 0.34, young: 0.7, adult: 1, grown: 1, crowned: 1, crown: 1 }

// Resolve a companion id + growth level into a flat visual spec the SVG renders.
function companionVisual(id, level) {
  const s = SPECIES[id]
  if (!s) return null
  const t = STAGE_AGE[level] ?? 0
  const adult = t >= 1
  const young = t >= 0.7 && t < 1
  const juvenile = t < 0.7
  const pal = adult ? s.adult : young ? s.young || s.adult : s.juv
  const f = s.feats || {}
  const vis = {
    back: pal.back, wing: pal.wing, beak: pal.beak, feet: pal.feet, eye: pal.eye,
    spots: Boolean(f.spotsJuv && juvenile),
    streaks: Boolean(f.streaksJuv && juvenile),
    redPupil: Boolean(f.redEyeAdult && adult),
    bill: { type: f.bill || 'short', color: pal.beak, tiny: Boolean(f.tinyBill) },
  }
  // robin: orange breast patch (+ grey lower belly) that deepens with age
  if (s.breast) {
    vis.breast = {
      color: adult ? s.breast.adult : young ? s.breast.young : s.breast.juv,
      opacity: adult ? 1 : young ? 0.92 : t < 0.2 ? 0.7 : 0.85,
    }
    if (s.greyBelly) vis.belly = { color: s.greyBelly }
  }
  // sparrow: grey underparts + white belly centre
  if (s.greyUnder) { vis.underparts = { color: s.greyUnder }; vis.belly = { color: s.whiteBelly } }
  // kingfisher: orange underparts (paler on a juvenile)
  if (s.orangeUnder) vis.underparts = { color: adult || young ? s.orangeUnder : s.juvOrange }
  // weaver/bishop black face mask, scaling in with age
  if (f.mask && t > 0.2) vis.mask = { color: f.mask, scale: t }
  if (f.blackBelly && t > 0.3) vis.blackBelly = { color: f.blackBelly }
  // robin white supercilium + dark face mask
  if (f.brow) {
    vis.brow = t < 0.2 ? null
      : adult ? { color: f.brow, width: 2.6, opacity: 1 }
        : young ? { color: '#EFE7D6', width: 2, opacity: 0.85 }
          : { color: '#EFE7D6', width: 1.6, opacity: 0.7 }
    if (f.faceMask && adult) vis.faceMask = { color: f.faceMask }
  }
  // sparrow black head + white C-curl, scaling in
  if (f.capeHead && t > 0.1) vis.capeHead = { scale: t }
  if (f.wingBar && t >= 0.7) vis.wingBar = true
  // kingfisher crest (present even on a chick, just smaller)
  if (f.crest) vis.crest = { color: f.crest, scale: 0.5 + 0.5 * t }
  if (f.whiteSpot && t >= 0.5) vis.whiteSpot = true
  // sunbird yellow pectoral tufts + iridescent sheen
  if (f.tuft && adult) vis.tuft = { color: f.tuft }
  if (f.sheen && t >= 0.7) vis.sheen = { color: f.sheen }
  // hadeda: iridescent green wing patch (present once wings show at all)
  if (f.wingPatch && t >= 0.4) vis.wingPatch = { color: f.wingPatch }
  // wood dove: bright emerald wing spots
  if (f.wingSpots && t >= 0.4) vis.wingSpots = { color: f.wingSpots }
  // starling: pale winter speckling across the body (adult/near-adult only)
  if (f.speckle && t >= 0.5) vis.speckle = { color: f.speckle }
  // scaly-feathered weaver: scalloped black-and-white chest pattern
  if (f.scalyChest && t >= 0.5) vis.scalyChest = true
  // warbler/chat: a small rump/vent colour patch at the tail base
  if (f.rump && t >= 0.4) vis.rump = { color: f.rump }
  // tails: robin/chat rufous (stages), sunbird streamers, others a short tail
  // (wing-coloured by default, or a species colour override e.g. none here)
  if (f.tail === 'rufous') {
    vis.tail = { kind: t < 0.2 ? null : t < 0.5 ? 'rufousShort' : t < 1 ? 'rufousMed' : 'rufousFull', color: f.tailColor }
  } else if (f.streamers) {
    vis.tail = { kind: t >= 0.7 ? 'streamers' : null, color: f.streamers }
  } else if (f.tail === 'short') {
    vis.tail = { kind: t >= 0.6 ? 'short' : null, color: f.tailColor || pal.wing }
  }
  return vis
}

export function TweetyBird({ level = 'chick', mood = 'happy', dancing = false, preening = false, sway = false, size = 120, companion = null, worn = null, scale = null }) {
  const shape = STAGE_SHAPE[level] || STAGE_SHAPE.chick
  const showCrown = shape.crown || level === 'crown' || level === 'crowned'
  const mid = shape.wings >= 1 // any wings at all
  const big = shape.wings >= 3 // full-size wings
  const wingRy = shape.wings >= 3 ? 13 : shape.wings === 2 ? 10 : 7 // stubby → full
  const rx = shape.rx
  const ry = rx + 1
  // Overall silhouette scale: explicit prop wins, else the stage's own scale.
  const gScale = scale != null ? scale : shape.scale
  const sad = mood === 'sad'
  const comp = companion ? getCompanion(companion) : null
  // Each of the six companions renders as its real SA species (vis != null), as
  // does the cosmetic 'wild' garden-visitor visual; an unknown/empty companion
  // falls back to the original golden chick. Resolve straight off the companion
  // id so visual-only ids (e.g. 'wild', not in TWEETY_COMPANIONS) work too — the
  // six real ids are unchanged since their id === their SPECIES key.
  const vis = companion ? companionVisual(companion, level) : null
  const body = vis ? vis.back : '#F6CE73'
  const belly = '#FBE6A8' // golden chick belly (species use vis.belly/underparts)
  const wing = vis ? vis.wing : '#EBB94E'
  const beakColor = vis ? vis.bill.color : '#F2A24E'
  const feetColor = vis ? vis.feet : '#E8915E'
  const eyeColor = vis ? vis.eye : '#3E2F22'
  // Long-billed species (sunbird/kingfisher) skip the little mouth — the bill is
  // the focal feature and a mouth would clutter under it.
  const showMouth = !vis || vis.bill.type === 'short'

  return (
    <span
      className={`tweety-bird${dancing ? ' tweety-dance' : ''}${!dancing && preening ? ' tweety-preen' : ''}${!dancing && !preening && sway ? ' tweety-gift-sway' : ''}${sad ? ' tweety-sad' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className="tweety-bob" transform={`translate(50 58) scale(${gScale}) translate(-50 -58)`}>
          {/* ruffled feathers when sad */}
          {sad && (
            <g fill={wing}>
              <path d="M28 40 l-6 -5 l7 0 Z" />
              <path d="M72 40 l6 -5 l-7 0 Z" />
              <path d="M50 28 l-3 -7 l6 0 Z" />
            </g>
          )}
          {/* tail (species-specific): drawn behind the body */}
          {vis?.tail?.kind && (
            vis.tail.kind === 'streamers' ? (
              <g stroke={vis.tail.color} strokeWidth="3" fill="none" strokeLinecap="round">
                <path d="M48 80 q-2 12 -3 18" />
                <path d="M52 80 q2 13 4 19" />
              </g>
            ) : (
              <path
                d={
                  vis.tail.kind === 'rufousFull' ? 'M55 78 q14 6 11 14 q-7 -1 -15 -8 Z'
                    : vis.tail.kind === 'rufousMed' ? 'M55 78 q11 5 9 13 q-7 -1 -13 -8 Z'
                      : vis.tail.kind === 'rufousShort' ? 'M55 78 q8 4 6 11 q-5 -1 -10 -6 Z'
                        : 'M55 78 q9 4 7 12 q-6 -1 -12 -7 Z'
                }
                fill={vis.tail.color}
              />
            )
          )}
          {/* warbler/chat rump or vent patch, at the tail base */}
          {vis?.rump && <ellipse cx="52" cy="76" rx="5" ry="4" fill={vis.rump.color} opacity="0.9" />}
          {/* top curl/tuft (recoloured to the wing colour for species) */}
          <path d="M50 30 q-2 -12 6 -13 q-3 8 -2 13 Z" fill={wing} />
          {/* body */}
          <ellipse cx="50" cy={58} rx={rx} ry={ry} fill={body} />
          {vis ? (
            <>
              {/* large underparts wash (sparrow grey · kingfisher orange) */}
              {vis.underparts && (
                <ellipse cx="50" cy={62} rx={rx * 0.6} ry={ry * 0.62} fill={vis.underparts.color} />
              )}
              {/* starling pale winter speckling across the body */}
              {vis.speckle && (
                <g fill={vis.speckle.color} opacity="0.55">
                  <circle cx="44" cy="56" r="1.3" /><circle cx="56" cy="60" r="1.2" />
                  <circle cx="50" cy="52" r="1.1" /><circle cx="42" cy="64" r="1.1" />
                  <circle cx="58" cy="66" r="1.2" /><circle cx="48" cy="68" r="1" />
                </g>
              )}
              {/* scaly-feathered weaver scalloped chest pattern */}
              {vis.scalyChest && (
                <g stroke="#2A2620" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.6">
                  <path d="M44 58 q2 3 4 0" /><path d="M50 60 q2 3 4 0" /><path d="M56 58 q2 3 4 0" />
                  <path d="M47 64 q2 3 4 0" /><path d="M53 64 q2 3 4 0" />
                </g>
              )}
              {/* breast patch (robin) */}
              {vis.breast && (
                <ellipse cx="50" cy="60" rx={rx * 0.5} ry={ry * 0.6} fill={vis.breast.color} opacity={vis.breast.opacity} />
              )}
              {/* lower belly patch (robin grey · sparrow white centre) */}
              {vis.belly && (
                <ellipse cx="50" cy={58 + ry * 0.5} rx={rx * 0.4} ry={ry * 0.28} fill={vis.belly.color} />
              )}
              {/* bishop black belly */}
              {vis.blackBelly && (
                <ellipse cx="50" cy={58 + ry * 0.52} rx={rx * 0.55} ry={ry * 0.4} fill={vis.blackBelly.color} />
              )}
              {/* sunbird iridescent sheen */}
              {vis.sheen && <ellipse cx="46" cy="52" rx={rx * 0.45} ry={ry * 0.4} fill={vis.sheen.color} opacity="0.4" />}
              {/* sunbird yellow pectoral tuft */}
              {vis.tuft && <circle cx={50 - rx + 6} cy="60" r="3" fill={vis.tuft.color} />}
              {/* juvenile mottling (robin) */}
              {vis.spots && (
                <g fill="#7E6E55" opacity="0.5">
                  <circle cx="44" cy="64" r="1.5" /><circle cx="52" cy="68" r="1.5" />
                  <circle cx="58" cy="62" r="1.4" /><circle cx="41" cy="58" r="1.2" />
                  <circle cx="60" cy="69" r="1.3" /><circle cx="48" cy="61" r="1.1" />
                </g>
              )}
              {/* juvenile streaking (bishop) */}
              {vis.streaks && (
                <g stroke="#8A7A50" strokeWidth="1.2" opacity="0.55" strokeLinecap="round">
                  <line x1={50 - rx * 0.4} y1="56" x2={50 - rx * 0.4} y2="66" />
                  <line x1="50" y1="58" x2="50" y2="69" />
                  <line x1={50 + rx * 0.4} y1="56" x2={50 + rx * 0.4} y2="66" />
                </g>
              )}
            </>
          ) : (
            <>
              <ellipse cx="50" cy={64} rx={rx * 0.62} ry={ry * 0.55} fill={belly} />
              {/* companion signature: chest patch and/or head cap (golden fallback) */}
              {comp?.chest && (
                <ellipse cx="50" cy="62" rx={rx * 0.5} ry={ry * 0.42} fill={comp.chest} opacity="0.92" />
              )}
              {comp?.cap && <path d="M34 46 Q50 30 66 46 Z" fill={comp.cap} opacity="0.92" />}
            </>
          )}
          {/* wings (appear and grow with each stage; flap) */}
          {mid && (
            <g className="tweety-wing">
              <ellipse cx={50 - rx + 2} cy="58" rx={big ? 8 : 6} ry={wingRy} fill={wing} />
            </g>
          )}
          {mid && <ellipse cx={50 + rx - 2} cy="58" rx={big ? 8 : 6} ry={wingRy} fill={wing} />}
          {/* sparrow white wing bar */}
          {vis?.wingBar && <path d="M26 56 q6 -1 9 2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />}
          {/* hadeda iridescent green wing patch (speculum) */}
          {mid && vis?.wingPatch && (
            <ellipse cx={50 + rx - 4} cy="57" rx="4" ry="6" fill={vis.wingPatch.color} opacity="0.9" />
          )}
          {/* wood dove bright emerald wing spots */}
          {mid && vis?.wingSpots && (
            <g fill={vis.wingSpots.color}>
              <circle cx={50 + rx - 3} cy="54" r="1.6" />
              <circle cx={50 + rx - 2} cy="59" r="1.4" />
              <circle cx={50 + rx - 4} cy="63" r="1.3" />
            </g>
          )}
          {/* feet */}
          <path d="M44 82 v6 M41 88 h6 M42 85 h4" stroke={feetColor} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M56 82 v6 M53 88 h6 M54 85 h4" stroke={feetColor} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* cheeks — soft pink only on the golden chick (species have their own faces) */}
          {!vis && (
            <>
              <circle cx="38" cy="58" r="4" fill="#F7A8B8" opacity="0.6" />
              <circle cx="62" cy="58" r="4" fill="#F7A8B8" opacity="0.6" />
            </>
          )}
          {/* weaver / bishop black face mask (fades in with age) */}
          {vis?.mask && (
            <path d="M50 39 Q37 40 35 53 Q41 62 50 62 Q59 62 65 53 Q63 40 50 39 Z" fill={vis.mask.color} opacity={vis.mask.scale} />
          )}
          {/* cape sparrow black head + bold white C-curl (fades in with age) */}
          {vis?.capeHead && (
            <g opacity={vis.capeHead.scale}>
              <path d="M50 38 Q34 40 33 54 Q40 60 50 60 Q60 60 67 54 Q66 40 50 38 Z" fill="#211E18" />
              <path d="M40 45 Q33 52 40 60 Q46 62 52 60" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          )}
          {/* kingfisher shaggy blue crest (present even as a chick, just smaller) */}
          {vis?.crest && (
            <g transform={`translate(50 40) scale(${vis.crest.scale}) translate(-50 -40)`}>
              <path d="M38 36 q12 -11 24 0 q-3 6 -12 6 q-9 0 -12 -6 Z" fill={vis.crest.color} />
              <g stroke="#0E4A8C" strokeWidth="1.1"><line x1="44" y1="32" x2="44" y2="38" /><line x1="50" y1="30" x2="50" y2="37" /><line x1="56" y1="32" x2="56" y2="38" /></g>
            </g>
          )}
          {/* kingfisher white throat/ear spot */}
          {vis?.whiteSpot && <circle cx="36" cy="56" r="3.5" fill="#fff" />}
          {/* robin dark face mask (adult) + white supercilium (staged in) */}
          {vis?.faceMask && (
            <path d="M33 47 Q50 39 67 47 Q67 54 50 54 Q33 54 33 47 Z" fill={vis.faceMask.color} opacity="0.5" />
          )}
          {vis?.brow && (
            <g stroke={vis.brow.color} strokeWidth={vis.brow.width} fill="none" strokeLinecap="round" opacity={vis.brow.opacity}>
              <path d="M35 45 Q43 40 49 43" />
              <path d="M65 45 Q57 40 51 43" />
            </g>
          )}
          {/* eyes — change with each mood */}
          {sad ? (
            <g stroke="#3E2F22" strokeWidth="2.6" fill="none" strokeLinecap="round">
              <path d="M40 51 q3 3 6 0" />
              <path d="M54 51 q3 3 6 0" />
            </g>
          ) : mood === 'hungry' || mood === 'thirsty' ? (
            <g className="tweety-eyes" fill="#3E2F22">
              {/* gently lowered brows */}
              <path d="M39 46 l7 2 M61 46 l-7 2" stroke="#3E2F22" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="43" cy="51" r="3" />
              <circle cx="57" cy="51" r="3" />
              <circle cx="44" cy="50" r="1" fill="#fff" />
              <circle cx="58" cy="50" r="1" fill="#fff" />
            </g>
          ) : (
            <g className="tweety-eyes" fill={eyeColor}>
              <circle cx="43" cy="50" r="3.4" />
              <circle cx="57" cy="50" r="3.4" />
              {/* weaver's dark pupil inside its red eye */}
              {vis?.redPupil && (
                <>
                  <circle cx="43" cy="50" r="1.5" fill="#2C1010" />
                  <circle cx="57" cy="50" r="1.5" fill="#2C1010" />
                </>
              )}
              <circle cx="44.2" cy="48.8" r="1.1" fill="#fff" />
              <circle cx="58.2" cy="48.8" r="1.1" fill="#fff" />
            </g>
          )}
          {/* tear when sad */}
          {sad && <path d="M40 54 q-2 4 0 6 q2 -2 0 -6" fill="#9AD0F0" />}
          {/* beak — short triangle, or a long curved/straight bill per species */}
          {vis?.bill?.type === 'longCurved' ? (
            <path d="M46 53 q-12 1 -17 9" stroke={beakColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          ) : vis?.bill?.type === 'longStraight' ? (
            <path d="M50 53 l0 15" stroke={beakColor} strokeWidth="3.2" strokeLinecap="round" />
          ) : vis?.bill?.tiny ? (
            <path d="M48 57 l4 0 l-2 3 z" fill={beakColor} />
          ) : (
            <path d="M47 57 l6 0 l-3 5 z" fill={beakColor} />
          )}
          {/* mouth varies by mood (skipped for long-billed species) */}
          {showMouth && mood === 'happy' && (
            <path d="M46 65 q4 3 8 0" stroke="#C8742E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          )}
          {showMouth && mood === 'content' && (
            <path d="M47 65 q3 2 6 0" stroke="#C8742E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          )}
          {showMouth && mood === 'hungry' && <ellipse cx="50" cy="66" rx="2.6" ry="2" fill="#9a4b2e" />}
          {showMouth && mood === 'thirsty' && <circle cx="50" cy="66" r="1.8" fill="#9a4b2e" />}
          {/* crown at top level (hidden when wearing a hat so they don't clash) */}
          {showCrown && !worn?.hat && (
            <path d="M40 30 L42 18 L50 26 L54 15 L58 26 L66 18 L68 30 Z" fill="#F2C24E" stroke="#D9A036" strokeWidth="1" transform="translate(0 -2)" />
          )}
          {/* wearables from the wardrobe */}
          <WornLayers worn={worn} />
        </g>
      </svg>
    </span>
  )
}

// ---- a simple coloured egg (first-egg selection + warming) -----------------
function ColorEgg({ color = '#F6A5C0', size = 84, glow = false }) {
  return (
    <span className={`color-egg${glow ? ' glow' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <ellipse cx="50" cy="56" rx="30" ry="36" fill={color} />
        <ellipse cx="42" cy="44" rx="7" ry="10" fill="#fff" opacity="0.45" />
        {/* faint bird-silhouette hint inside */}
        <g fill="#000" opacity="0.16">
          <ellipse cx="52" cy="60" rx="12" ry="13" />
          <circle cx="44" cy="51" r="5" />
          <path d="M62 58 l8 3 l-8 3 z" />
        </g>
        {/* speckles */}
        <circle cx="40" cy="68" r="2.4" fill="#fff" opacity="0.4" />
        <circle cx="60" cy="50" r="2" fill="#fff" opacity="0.4" />
      </svg>
    </span>
  )
}

// Egg warmth: a handful of colour tiers (barely-there → gold → hot amber)
// rather than a continuous interpolation — simple, and it still reads as
// clearly getting warmer day by day.
const EGG_WARMTH_COLORS = ['#d8c9a3', '#f6d488', '#ffb35c']
function eggWarmthColor(progress) {
  const idx = Math.min(EGG_WARMTH_COLORS.length - 1, Math.floor(progress * EGG_WARMTH_COLORS.length))
  return EGG_WARMTH_COLORS[idx]
}

// A small woven basket the egg rests in, with a warmth glow behind it that
// shifts colour as `progress` (0-1) climbs — replaces the egg floating alone
// in blank space, and reuses the same wood tones as the home nest so it
// reads as the same world.
function EggNest({ progress = 0, children }) {
  const color = eggWarmthColor(progress)
  return (
    <div className="egg-nest-wrap">
      <div className="egg-warmth-glow" style={{ '--egg-warmth-color': color }} aria-hidden="true" />
      {children}
      <svg className="egg-nest-basket" viewBox="0 0 150 44" aria-hidden="true">
        <ellipse cx="75" cy="12" rx="66" ry="15" fill="#c9975e" />
        <ellipse cx="75" cy="9" rx="61" ry="12" fill="#e0b077" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${18 + i * 20} 4 Q${28 + i * 20} 17 ${38 + i * 20} 4`} stroke="#9c6a38" strokeWidth="2" fill="none" opacity="0.6" />
        ))}
      </svg>
    </div>
  )
}

// A row of little embers replacing the flat hatch-progress bar — one lights
// (and pops) per day warmed, same "fill up one satisfying tick at a time"
// language as the Garden's own watering meter.
function EggWarmthMeter({ warms, total, progress }) {
  const color = eggWarmthColor(progress)
  return (
    <div className="egg-warmth-meter" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`egg-warmth-dot${i < warms ? ' on' : ''}`} style={{ '--egg-warmth-color': color }} />
      ))}
    </div>
  )
}

// ---- Home card (simplified: feed/water/play, 5 moods, real-day growth) -----
// The 5 growth stage keys map straight onto TweetyBird's stage shapes.
const GROWTH_TO_LEVEL = {
  chick: 'chick',
  fledgling: 'fledgling',
  young: 'young',
  adult: 'adult',
  crowned: 'crowned',
}

// ---- Tweety Store item illustrations -----------------------------------
// Small flat SVGs, one per store item, each drawn resting at its own natural
// tilt/angle so the room-slot wrapper (see .room-slot in App.css) never needs
// to juggle a "resting transform" underneath its pop-in/tap animations — the
// wrapper always starts from rotate(0) and the artwork itself supplies the
// character. 64×64 viewBox unless noted, matching the room's small-icon scale.
function IconWindow() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="4" width="52" height="52" rx="6" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="2.5" />
      <rect x="12" y="10" width="40" height="40" rx="3" fill="var(--sky)" />
      <rect x="30.5" y="10" width="3" height="40" fill="var(--wood)" />
      <rect x="12" y="28.5" width="40" height="3" fill="var(--wood)" />
      <path d="M16 15 L27 26" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <circle cx="18" cy="55" r="3.6" fill="var(--leaf)" />
      <path d="M18 55 q-3 -6 -1 -10" stroke="var(--leaf-dark)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function IconMirror() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="34" rx="20" ry="24" fill="var(--lavender-dark)" />
      <ellipse cx="32" cy="34" rx="15" ry="19" fill="#eef3f6" />
      <path d="M22 20 q10 -6 20 2" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <rect x="29" y="6" width="6" height="8" rx="2" fill="var(--lavender-dark)" />
      <circle cx="32" cy="6" r="2.4" fill="var(--honey-dark)" />
    </svg>
  )
}

function IconChimes() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <line x1="32" y1="2" x2="32" y2="10" stroke="var(--wood-dark)" strokeWidth="2" />
      <rect x="14" y="10" width="36" height="6" rx="3" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="1.5" />
      <g stroke="var(--wood-dark)" strokeWidth="1.5">
        <line x1="20" y1="16" x2="20" y2="34" />
        <line x1="32" y1="16" x2="32" y2="44" />
        <line x1="44" y1="16" x2="44" y2="30" />
      </g>
      <circle cx="20" cy="38" r="5" fill="var(--rose)" />
      <circle cx="32" cy="48" r="5.5" fill="var(--honey)" />
      <circle cx="44" cy="34" r="4.6" fill="var(--leaf)" />
    </svg>
  )
}

function IconPerch() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="34" width="58" height="7" rx="3.5" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="2" transform="rotate(-14 32 37)" />
      <path d="M14 30 q-4 -8 2 -13" stroke="var(--leaf-dark)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="15" cy="16" rx="6" ry="3.4" fill="var(--leaf)" transform="rotate(-30 15 16)" />
      <path d="M46 46 q4 6 -1 12" stroke="var(--leaf-dark)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="59" rx="6" ry="3.2" fill="var(--leaf)" transform="rotate(35 46 59)" />
    </svg>
  )
}

function IconRibbon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 30 L10 14 Q4 26 20 32 Z" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="2" />
      <path d="M32 30 L54 14 Q60 26 44 32 Z" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="2" />
      <path d="M32 30 L22 54 L30 50 Z" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="2" />
      <path d="M32 30 L42 54 L34 50 Z" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="2" />
      <circle cx="32" cy="30" r="6.5" fill="var(--rose-dark)" />
    </svg>
  )
}

function IconMusicBox() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="46" width="56" height="6" rx="2" fill="var(--wood-dark)" />
      <rect x="14" y="28" width="36" height="20" rx="3" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="2" />
      <rect x="14" y="24" width="36" height="8" rx="3" fill="var(--honey-dark)" stroke="var(--wood-dark)" strokeWidth="2" />
      <circle cx="48" cy="38" r="3.2" fill="var(--wood-dark)" />
      <path d="M27 6 v14 M27 6 q6 -2 6 3 q0 5 -6 3" stroke="var(--ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="25.4" cy="21" r="2.6" fill="var(--ink)" />
    </svg>
  )
}

function IconHerbs() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <line x1="32" y1="2" x2="32" y2="16" stroke="var(--wood-dark)" strokeWidth="2" />
      <g strokeLinecap="round">
        <path d="M32 16 L18 50" stroke="var(--leaf)" strokeWidth="6" />
        <path d="M32 16 L32 54" stroke="var(--leaf-dark)" strokeWidth="6" />
        <path d="M32 16 L46 50" stroke="var(--leaf)" strokeWidth="6" />
        <path d="M32 16 L24 46" stroke="var(--lavender)" strokeWidth="5" />
        <path d="M32 16 L40 46" stroke="var(--lavender)" strokeWidth="5" />
      </g>
      <rect x="26" y="13" width="12" height="6" rx="2" fill="var(--honey-dark)" />
    </svg>
  )
}

// filled = fed at least once today (see tweetyFedToday) — a full scatter of
// seeds when true, just a couple of stray leftovers when false, so the bowl
// itself shows whether she's been fed without reading any text.
function IconFeedingBowl({ filled = true }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="46" rx="24" ry="8" fill="var(--wood-dark)" opacity="0.18" />
      <path d="M8 34 a24 16 0 0 0 48 0 Z" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="2.5" />
      <ellipse cx="32" cy="34" rx="24" ry="7" fill="var(--paper)" stroke="var(--rose-dark)" strokeWidth="2.5" />
      <circle cx="24" cy="34" r="2.4" fill="var(--honey-dark)" opacity={filled ? 1 : 0.15} />
      <circle cx="32" cy="35.5" r="2.4" fill="var(--honey-dark)" opacity={filled ? 1 : 0.15} />
      <circle cx="40" cy="34" r="2.4" fill="var(--honey-dark)" opacity={filled ? 1 : 0.15} />
      {filled && (
        <>
          <circle cx="28" cy="32.5" r="1.6" fill="var(--honey-dark)" />
          <circle cx="36" cy="33" r="1.6" fill="var(--honey-dark)" />
        </>
      )}
    </svg>
  )
}

function IconTreats() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 24 h32 l-4 30 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 Z" fill="var(--honey-dark)" stroke="var(--wood-dark)" strokeWidth="2" />
      <path d="M16 24 q16 -14 32 0" fill="none" stroke="var(--wood-dark)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M27 12 q5 6 0 12" fill="none" stroke="var(--wood-dark)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="40" r="5.5" fill="var(--rose)" stroke="var(--rose-dark)" strokeWidth="1.5" />
    </svg>
  )
}

function IconWaterTank() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="16" y="10" width="32" height="44" rx="8" fill="var(--sky)" opacity="0.55" stroke="var(--sky-dark)" strokeWidth="2.5" />
      <path d="M16 34 h32 v14 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 Z" fill="var(--sky)" opacity="0.9" />
      <rect x="20" y="4" width="24" height="8" rx="3" fill="var(--sky-dark)" />
      <path d="M50 20 q6 6 0 12 q-6 -6 0 -12 Z" fill="var(--sky-dark)" />
    </svg>
  )
}

function IconFlowers() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 58 L28 30" stroke="var(--leaf-dark)" strokeWidth="2.5" fill="none" />
      <path d="M32 58 L32 22" stroke="var(--leaf-dark)" strokeWidth="2.5" fill="none" />
      <path d="M40 58 L36 30" stroke="var(--leaf-dark)" strokeWidth="2.5" fill="none" />
      <rect x="20" y="54" width="24" height="7" rx="2" fill="var(--rose-dark)" />
      <g transform="translate(28,26)">
        <circle cx="0" cy="-6" r="4.2" fill="var(--rose)" /><circle cx="5.6" cy="-2" r="4.2" fill="var(--rose)" />
        <circle cx="3.4" cy="4.6" r="4.2" fill="var(--rose)" /><circle cx="-3.4" cy="4.6" r="4.2" fill="var(--rose)" />
        <circle cx="-5.6" cy="-2" r="4.2" fill="var(--rose)" /><circle cx="0" cy="0" r="3.4" fill="var(--honey-dark)" />
      </g>
      <g transform="translate(36,18)">
        <circle cx="0" cy="-5.6" r="3.8" fill="var(--honey)" /><circle cx="5" cy="-1.8" r="3.8" fill="var(--honey)" />
        <circle cx="3" cy="4" r="3.8" fill="var(--honey)" /><circle cx="-3" cy="4" r="3.8" fill="var(--honey)" />
        <circle cx="-5" cy="-1.8" r="3.8" fill="var(--honey)" /><circle cx="0" cy="0" r="3" fill="var(--rose-dark)" />
      </g>
      <g transform="translate(24,34) scale(0.85)">
        <circle cx="0" cy="-5.6" r="3.8" fill="var(--lavender)" /><circle cx="5" cy="-1.8" r="3.8" fill="var(--lavender)" />
        <circle cx="3" cy="4" r="3.8" fill="var(--lavender)" /><circle cx="-3" cy="4" r="3.8" fill="var(--lavender)" />
        <circle cx="-5" cy="-1.8" r="3.8" fill="var(--lavender)" /><circle cx="0" cy="0" r="3" fill="var(--honey-dark)" />
      </g>
    </svg>
  )
}

function IconBlanket() {
  return (
    <svg viewBox="0 0 120 40" aria-hidden="true">
      <path d="M4 10 Q60 -6 116 10 L116 24 Q60 36 4 24 Z" fill="var(--honey)" stroke="var(--honey-dark)" strokeWidth="2" />
      <path d="M10 14 Q60 2 110 14" stroke="var(--honey-dark)" strokeWidth="1.6" fill="none" opacity="0.6" />
      <path d="M10 20 Q60 10 110 20" stroke="var(--honey-dark)" strokeWidth="1.6" fill="none" opacity="0.6" />
      <path d="M12 26 Q60 18 108 26" stroke="var(--rose)" strokeWidth="1.6" fill="none" opacity="0.7" />
    </svg>
  )
}

// The room's actual background — wood-panelled wall, a real window (sky +
// windowsill plant, no cross-bars so it never reads as "barred"), and a
// planked floor. Purely decorative: sits behind every ROOM_ITEMS slot and
// the nest (z-index 0, pointer-events none), so it never touches item
// positions, ownership, or tap handling — just fixes the flat, cold-looking
// backdrop Pooks was seeing (see the 2026-07-29 "looks like a prison" note).
//
// Room Themes: every theme below renders into the SAME 300x240 viewBox with
// the SAME wall/window/sill/floor footprint (wall 0-149, window box roughly
// x108-192 y16-74, sill y74-81, floor in 5 planks y149-240) so ROOM_ITEMS'
// percentage-based slot positions (.slot-* in App.css) line up identically
// no matter which theme is active — only fills/details change. Gradient/
// filter ids are suffixed per theme so multiple instances (the live room +
// every thumbnail in the Room Themes shop) can render side by side without
// id collisions.
//
// Only the default Cottage theme reacts to timePhase (morning/midday =
// daytime sky+clouds, evening = sunset, night = stars+moon) — see
// saTimePhase in saDate.js. Every other theme's window view is its own
// fixed, already-thematic scene (Winter Cabin is always snow, Night Sky is
// always moon+stars, etc.), so time-of-day only applies where the brief's
// "current time of day" reading is unambiguous: the plain daylight window.
function CottageBackdrop({ timePhase = 'midday' }) {
  const sky =
    timePhase === 'night'
      ? { top: '#22345c', bottom: '#3a4f80' }
      : timePhase === 'evening'
        ? { top: '#f4986a', bottom: '#fbd8a4' }
        : { top: '#cfe9f7', bottom: '#eaf6fb' }
  return (
    <>
      <defs>
        <radialGradient id="roomWarmGlow-cottage" cx="0.5" cy="0" r="0.75">
          <stop offset="0" stopColor={timePhase === 'night' ? '#6a7ec2' : '#ffe0a0'} stopOpacity="0.5" />
          <stop offset="1" stopColor={timePhase === 'night' ? '#6a7ec2' : '#ffe0a0'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="roomSkyG-cottage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
      </defs>

      {/* warm wood-panelled wall */}
      <rect x="0" y="0" width="300" height="149" fill="#f5efe4" />
      {[20, 40, 60, 80, 100, 120, 140].map((y) => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#8c5a36" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      <ellipse cx="150" cy="4" rx="170" ry="90" fill="url(#roomWarmGlow-cottage)" />

      {/* a real window — plain rounded frame, sky, no bars */}
      <rect x="108" y="16" width="84" height="58" rx="10" fill="#b8863e" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="url(#roomSkyG-cottage)" />
      {timePhase === 'night' ? (
        <>
          <circle cx="163" cy="36" r="8" fill="#f4edc9" />
          {[[126, 29], [143, 49], [170, 44], [177, 31], [133, 60]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1" fill="#fff" opacity="0.85" />
          ))}
        </>
      ) : timePhase === 'evening' ? (
        <>
          <circle cx="140" cy="53" r="10" fill="#fff3d2" opacity="0.9" />
          <ellipse cx="165" cy="40" rx="11" ry="4.5" fill="#ffe6c2" opacity="0.6" />
        </>
      ) : (
        <>
          <ellipse cx="138" cy="38" rx="12" ry="5" fill="#ffffff" opacity="0.75" />
          <ellipse cx="158" cy="47" rx="15" ry="5.5" fill="#ffffff" opacity="0.7" />
        </>
      )}
      {/* windowsill with a tiny potted plant */}
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#a9713f" />
      <g>
        <path d="M154 61 L146 72 L150 72 L156 63 Z" fill="#7ba36e" />
        <path d="M158 58 L152 72 L156 72 L161 60 Z" fill="#6b8f62" />
        <path d="M160 63 L156 72 L160 72 L163 65 Z" fill="#7ba36e" />
        <path d="M150 72 L162 72 L160 79 L152 79 Z" fill="#c96f4a" stroke="#a1512f" strokeWidth="1" />
      </g>

      {/* planked floor, alternating warm tones with thin gaps between boards */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#b77a46' : '#9f633b'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={149 + i * 18.2} x2="300" y2={149 + i * 18.2} stroke="#4f2f20" strokeOpacity="0.28" strokeWidth="1" />
      ))}
      {[60, 150, 240].map((x) => (
        <line key={x} x1={x} y1="149" x2={x} y2="240" stroke="#4f2f20" strokeOpacity="0.13" strokeWidth="1" />
      ))}
      {timePhase === 'night' && <rect x="0" y="0" width="300" height="240" fill="#182544" opacity="0.16" />}
    </>
  )
}

// Winter Cabin (800 coins) — dark log walls, a snowy window view, and a warm
// fireplace glow pooling on the floor.
function WinterCabinBackdrop() {
  return (
    <>
      <defs>
        <linearGradient id="roomSkyG-winter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c3d6e8" />
          <stop offset="1" stopColor="#eef5fa" />
        </linearGradient>
        <radialGradient id="fireGlow-winter" cx="0.5" cy="1" r="0.85">
          <stop offset="0" stopColor="#ff9d4d" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff9d4d" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="300" height="149" fill="#4a3222" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = i * 26
        return (
          <g key={i}>
            <rect x="0" y={y} width="300" height="24" rx="12" fill={i % 2 === 0 ? '#5a3d28' : '#654530'} />
            <circle cx="10" cy={y + 12} r="9" fill="#3d2a1c" opacity="0.5" />
            <circle cx="290" cy={y + 12} r="9" fill="#3d2a1c" opacity="0.5" />
          </g>
        )
      })}

      <rect x="108" y="16" width="84" height="58" rx="10" fill="#3d2a1c" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="url(#roomSkyG-winter)" />
      <path d="M115 55 Q135 46 150 54 Q165 44 185 55 L185 67 L115 67 Z" fill="#fbfdff" />
      {[[122, 30], [140, 40], [155, 28], [170, 38], [178, 48]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" opacity="0.9" />
      ))}
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#3d2a1c" />
      <path d="M102 74 Q150 68 198 74 L198 78 Q150 73 102 78 Z" fill="#fbfdff" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#5c4530' : '#4f3a28'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={149 + i * 18.2} x2="300" y2={149 + i * 18.2} stroke="#00000030" strokeWidth="1" />
      ))}
      <ellipse cx="70" cy="220" rx="130" ry="60" fill="url(#fireGlow-winter)" />
    </>
  )
}

// A tiny knitted scarf overlay for Winter Cabin — the only theme with a
// Tweety accessory. Positioned via .tweety-scarf in App.css, absolutely over
// the bird sprite (see the Winter Cabin note in TweetyHomeCard).
export function WinterScarf() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 24 Q32 34 50 24 L50 32 Q32 42 14 32 Z" fill="#c6473f" stroke="#9c342e" strokeWidth="1.5" />
      <path d="M24 32 L20 50 L28 48 L26 33 Z" fill="#c6473f" stroke="#9c342e" strokeWidth="1.5" />
      <line x1="21" y1="42" x2="27" y2="41" stroke="#9c342e" strokeWidth="1.2" />
      <line x1="20.5" y1="46" x2="26.5" y2="45" stroke="#9c342e" strokeWidth="1.2" />
    </svg>
  )
}

// Spring Meadow (800 coins) — pastel green walls with a scattered flower
// print, an open window onto a meadow with a couple of butterflies.
function SpringMeadowBackdrop() {
  const flowerDots = [[30, 30], [80, 60], [220, 25], [260, 90], [40, 110], [270, 50], [15, 70]]
  return (
    <>
      <defs>
        <linearGradient id="roomSkyG-spring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d7f2c2" />
          <stop offset="1" stopColor="#f3fbe8" />
        </linearGradient>
        <radialGradient id="roomWarmGlow-spring" cx="0.5" cy="0" r="0.75">
          <stop offset="0" stopColor="#fff6c8" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="300" height="149" fill="#eaf5df" />
      {flowerDots.map(([x, y], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={x + 3.2 * Math.cos((a * Math.PI) / 180)}
              cy={y + 3.2 * Math.sin((a * Math.PI) / 180)}
              rx="2.2"
              ry="1.6"
              fill="#f2a6c6"
              transform={`rotate(${a} ${x} ${y})`}
            />
          ))}
          <circle cx={x} cy={y} r="1.6" fill="#f2c230" />
        </g>
      ))}
      <ellipse cx="150" cy="4" rx="170" ry="90" fill="url(#roomWarmGlow-spring)" />

      <rect x="108" y="16" width="84" height="58" rx="10" fill="#9dc07a" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="url(#roomSkyG-spring)" />
      <path d="M115 60 Q140 50 160 58 Q175 50 185 58 L185 67 L115 67 Z" fill="#8fbf5e" />
      <g>
        <ellipse cx="130" cy="34" rx="3" ry="2" fill="#f2905c" transform="rotate(-25 130 34)" />
        <ellipse cx="135" cy="34" rx="3" ry="2" fill="#f2905c" transform="rotate(25 135 34)" />
        <line x1="132.5" y1="32" x2="132.5" y2="36" stroke="#6b4a2a" strokeWidth="1" />
      </g>
      <g>
        <ellipse cx="170" cy="46" rx="2.6" ry="1.8" fill="#e8a6d6" transform="rotate(-25 170 46)" />
        <ellipse cx="174.4" cy="46" rx="2.6" ry="1.8" fill="#e8a6d6" transform="rotate(25 174.4 46)" />
        <line x1="172.2" y1="44.4" x2="172.2" y2="47.6" stroke="#6b4a2a" strokeWidth="1" />
      </g>
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#9dc07a" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#d7edc2' : '#c7e3ae'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={149 + i * 18.2} x2="300" y2={149 + i * 18.2} stroke="#00000012" strokeWidth="1" />
      ))}
    </>
  )
}

// Treehouse (1000 coins) — bamboo-stalk walls, a leafy canopy view with
// dappled sunlight, and a coiled rope in the corner.
function TreehouseBackdrop() {
  return (
    <>
      <defs>
        <radialGradient id="roomWarmGlow-tree" cx="0.5" cy="0" r="0.75">
          <stop offset="0" stopColor="#fff2a8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff2a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="300" height="149" fill="#c7b989" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const x = i * 30
        return (
          <g key={i}>
            <rect x={x + 4} y="0" width="20" height="149" rx="10" fill={i % 2 === 0 ? '#b8a468' : '#ad9a5c'} />
            {[20, 60, 100, 140].map((y) => (
              <ellipse key={y} cx={x + 14} cy={y} rx="9" ry="3" fill="#9c8a4e" opacity="0.6" />
            ))}
          </g>
        )
      })}
      <ellipse cx="150" cy="4" rx="170" ry="90" fill="url(#roomWarmGlow-tree)" />

      <rect x="108" y="16" width="84" height="58" rx="10" fill="#8a7238" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="#4f7a45" />
      {[[128, 32, 14], [152, 28, 17], [172, 36, 13], [140, 50, 15], [165, 52, 12]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill={i % 2 === 0 ? '#5e9a52' : '#6bab5e'} />
      ))}
      {[[135, 30], [158, 38], [145, 48], [172, 42]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="#ffe89a" opacity="0.85" />
      ))}
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#8a7238" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#9c8452' : '#8f7847'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={149 + i * 18.2} x2="300" y2={149 + i * 18.2} stroke="#00000020" strokeWidth="1" />
      ))}
      {/* coiled rope, bottom-left corner */}
      <g fill="none" stroke="#c9a463" strokeWidth="3">
        <circle cx="24" cy="222" r="12" />
        <circle cx="24" cy="222" r="7" />
      </g>
      {/* dappled sunlight on the wall */}
      {[[40, 20, 10], [220, 60, 12], [70, 100, 8], [260, 30, 9]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff6c0" opacity="0.25" />
      ))}
    </>
  )
}

// Beach Hut (1000 coins) — pale driftwood walls, an ocean-at-sunset window,
// sandy floor, and a couple of shells.
function BeachHutBackdrop() {
  return (
    <>
      <defs>
        <linearGradient id="roomSkyG-beach" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a35c" />
          <stop offset="0.55" stopColor="#f7c98a" />
          <stop offset="0.56" stopColor="#5aa3a8" />
          <stop offset="1" stopColor="#2e7a80" />
        </linearGradient>
        <radialGradient id="roomWarmGlow-beach" cx="0.5" cy="0" r="0.75">
          <stop offset="0" stopColor="#ffd8a0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd8a0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="300" height="149" fill="#e8ddc8" />
      {[20, 40, 60, 80, 100, 120, 140].map((y) => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#c4b696" strokeWidth="1.4" />
      ))}
      <ellipse cx="150" cy="4" rx="170" ry="90" fill="url(#roomWarmGlow-beach)" />

      <rect x="108" y="16" width="84" height="58" rx="10" fill="#cbb98e" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="url(#roomSkyG-beach)" />
      <circle cx="150" cy="43" r="8" fill="#fff3d2" opacity="0.9" />
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#cbb98e" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#e8d5a8' : '#ddc793'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={20 + i * 60} cy={149 + i * 18.2 + 10} r="1.2" fill="#c9b078" opacity="0.6" />
      ))}
      {/* shells */}
      <path d="M40 226 q6 -10 12 0 q-6 4 -12 0 Z" fill="#f5e6d3" stroke="#d8c2a0" strokeWidth="1" />
      <path d="M250 230 q5 -8 10 0 q-5 3 -10 0 Z" fill="#f0d8c8" stroke="#d8ad94" strokeWidth="1" />
    </>
  )
}

// Night Sky (1200 coins) — deep blue walls with painted stars, a moon
// through the window, and a few pulsing fireflies (.room-firefly in App.css).
function NightSkyBackdrop() {
  const stars = [[20, 20], [60, 40], [100, 15], [230, 30], [270, 60], [15, 90], [280, 110], [50, 120], [200, 100], [260, 20]]
  const fireflies = [[50, 180, '0s'], [220, 200, '0.8s'], [160, 165, '1.6s'], [270, 215, '0.4s']]
  return (
    <>
      <defs>
        <radialGradient id="roomMoonGlow-night" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#8fa3d6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8fa3d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="300" height="149" fill="#1c2b4a" />
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.4} fill="#fff" opacity={0.6 + (i % 4) * 0.1} />
      ))}
      <ellipse cx="150" cy="10" rx="170" ry="90" fill="url(#roomMoonGlow-night)" />

      <rect x="108" y="16" width="84" height="58" rx="10" fill="#14203a" />
      <rect x="115" y="23" width="70" height="44" rx="6" fill="#25325a" />
      <circle cx="160" cy="38" r="10" fill="#f4edc9" />
      <circle cx="157" cy="35" r="8.5" fill="#25325a" opacity="0.5" />
      {[[125, 30], [135, 50], [172, 45], [178, 55], [145, 58]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1" fill="#fff" opacity="0.8" />
      ))}
      <rect x="102" y="74" width="96" height="7" rx="2" fill="#14203a" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={149 + i * 18.2} width="300" height="18" fill={i % 2 === 0 ? '#2a3a5c' : '#243252'} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={149 + i * 18.2} x2="300" y2={149 + i * 18.2} stroke="#00000030" strokeWidth="1" />
      ))}
      {fireflies.map(([x, y, delay], i) => (
        <circle key={i} className="room-firefly" cx={x} cy={y} r="2.4" fill="#d7f26a" style={{ animationDelay: delay }} />
      ))}
    </>
  )
}

const ROOM_BACKDROPS = {
  cottage: CottageBackdrop,
  'winter-cabin': WinterCabinBackdrop,
  'spring-meadow': SpringMeadowBackdrop,
  treehouse: TreehouseBackdrop,
  'beach-hut': BeachHutBackdrop,
  'night-sky': NightSkyBackdrop,
}

// Exported so the Room Themes shop (App.jsx) can render the exact same art
// as a small preview thumbnail for each theme, owned or not.
export function RoomBackdrop({ theme = 'cottage', timePhase = 'midday' }) {
  const Backdrop = ROOM_BACKDROPS[theme] || CottageBackdrop
  return (
    <svg className="room-backdrop-svg" viewBox="0 0 300 240" preserveAspectRatio="none" aria-hidden="true">
      <Backdrop timePhase={timePhase} />
    </svg>
  )
}

// ---- Home Cage shell (Phase 1 redesign) ------------------------------------
// A warm illustrated aviary frame layered ON TOP of RoomBackdrop rather than
// replacing it — the existing Room Themes (cottage/winter-cabin/etc, still
// sold and previewed via RoomBackdrop above) keep showing through as the
// backdrop behind the cage, so none of that shop/theme logic has to change.
// Split into a back layer (dome silhouette + base tray — sits behind Tweety
// and every room item, reads as floor/structure) and a front layer (corner
// posts + brass rings + sparse vertical bars — sits in front of everything).
// A past pass on the plain room backdrop deliberately drew its window
// WITHOUT cross-bars "so it never reads as barred" (see CottageBackdrop's
// comment below) — this is a deliberate reversal for the new brief (Tweety
// now explicitly needs a home cage), so the front bars stay thin, widely
// spaced and warm brass rather than a tight grey grid, to read as an elegant
// aviary rather than the "prison" look that comment was originally avoiding.
function CageFrameBack() {
  return (
    <svg className="cage-frame-back-svg" viewBox="0 0 300 240" preserveAspectRatio="none" aria-hidden="true">
      <path d="M16 52 Q150 -14 284 52" fill="none" stroke="var(--gold-dark)" strokeWidth="7" strokeLinecap="round" opacity="0.85" />
      <path d="M16 52 Q150 -2 284 52" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="150" cy="10" r="6.5" fill="var(--gold)" stroke="var(--gold-dark)" strokeWidth="1.5" />
      {/* Main perch — refinement pass. Tweety's new rest position (see the
          .tweety-nest top-anchor in App.css) sits with her feet at roughly
          this branch's height, so she reads as seated on it rather than
          floating in open cage air. A short trunk + shadow below ties
          whichever nest-base tier is showing (basic/cosy/birdhouse) into the
          same branch structure instead of it reading as a separate object on
          the floor — see the item hierarchy note in the refinement brief. */}
      <rect x="145" y="163" width="10" height="41" rx="4" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="1.5" />
      <ellipse cx="150" cy="205" rx="36" ry="7" fill="var(--wood-dark)" opacity="0.32" />
      {/* Main perch branch — thickened and given a warm top sheen + a grain
          line in the refinement pass (was reading as too thin a stroke for
          Tweety to visibly stand on). */}
      <rect x="93" y="154" width="114" height="10" rx="5" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="1.5" />
      <path d="M99 158.5 Q150 161 201 158.5" stroke="var(--wood-dark)" strokeWidth="1" opacity="0.3" fill="none" />
      <rect x="98" y="155.5" width="104" height="2.6" rx="1.3" fill="var(--honey)" opacity="0.4" />
      <ellipse cx="88" cy="159" rx="8" ry="4.6" fill="var(--leaf)" transform="rotate(-20 88 159)" />
      <ellipse cx="212" cy="159" rx="8" ry="4.6" fill="var(--leaf-dark)" transform="rotate(20 212 159)" />
      <ellipse cx="150" cy="225" rx="140" ry="14" fill="var(--wood)" />
      <ellipse cx="150" cy="220" rx="135" ry="12" fill="var(--honey)" opacity="0.8" />
    </svg>
  )
}

// Vertical bar x-positions. Deliberately just 4, evenly spaced with a gap
// CENTRED on x=150 — at rest Tweety's motion-shell sits horizontally centred
// in the cage (see TweetyHomeCard's .tweety-nest), so a bar at dead centre
// would sit right across her face every time she's idle. Original geometry
// audit (Phase 1 acceptance pass) found 9 evenly-spaced bars put 7 of them
// crossing her body at her new, much larger render size — cut down to 4 with
// a clear central gap instead, so she reads clearly at rest and only briefly
// passes behind a bar mid-hop, same as a real aviary viewed front-on.
// Refinement pass: opacity/stroke trimmed again (0.3→0.22, 1.6→1.3) and the
// top/bottom rails lightened (0.8→0.55) so the whole front layer reads as a
// quiet frame rather than a layer drawn over the scene.
const CAGE_BAR_X = [60, 120, 180, 240]
function CageFrameFront() {
  return (
    <svg className="cage-frame-front-svg" viewBox="0 0 300 240" preserveAspectRatio="none" aria-hidden="true">
      <rect x="16" y="48" width="268" height="4" rx="2" fill="var(--gold-dark)" opacity="0.55" />
      <rect x="16" y="206" width="268" height="4" rx="2" fill="var(--gold-dark)" opacity="0.55" />
      {/* Height extended 160->166 (posts now run 48-214, was 48-208) so
          they visibly run into the base tray (its own top edge sits at
          y=211, see CageFrameBack) instead of stopping short of it — same
          x-position/thickness/opacity as before, purely a length fix so the
          cage reads as resting ON the tray rather than floating just above
          it. */}
      <rect x="18" y="48" width="5" height="166" rx="2.5" fill="var(--gold-dark)" opacity="0.9" />
      <rect x="277" y="48" width="5" height="166" rx="2.5" fill="var(--gold-dark)" opacity="0.9" />
      {CAGE_BAR_X.map((x) => (
        <line key={x} x1={x} y1="52" x2={x} y2="206" stroke="var(--gold)" strokeWidth="1.3" opacity="0.22" />
      ))}
    </svg>
  )
}

// Luxury Birdhouse — walls, pitched roof, round entrance and its tree
// decoration, all drawn as one flat-shaded, viewBox-scaled SVG (same style as
// IconWindow etc. above) so the whole illustration scales as a single piece
// from its wrapper's box (see .nest-base-treehouse in App.css) instead of
// needing separately hand-tuned pixel math per breakpoint.
function LuxuryBirdhouseArt() {
  return (
    <svg viewBox="0 0 150 92" className="birdhouse-svg" aria-hidden="true">
      {/* tree decoration */}
      <rect x="20" y="50" width="8" height="30" rx="3" fill="var(--wood-dark)" />
      <circle cx="24" cy="44" r="17" fill="var(--leaf)" />
      <circle cx="13" cy="52" r="12" fill="var(--leaf)" />
      <circle cx="36" cy="52" r="12" fill="var(--leaf-dark)" />
      {/* premium glow ring */}
      <circle cx="96" cy="54" r="36" fill="none" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="3" />
      {/* pitched roof */}
      <polygon points="46,46 96,8 146,46" fill="var(--wood-dark)" />
      {/* walls */}
      <rect x="54" y="42" width="84" height="48" rx="8" fill="var(--wood)" />
      <rect x="54" y="42" width="84" height="16" rx="8" fill="#ffffff" opacity="0.14" />
      {/* round entrance */}
      <circle cx="96" cy="76" r="15" fill="#2a1a0e" />
      <circle cx="96" cy="76" r="15" fill="none" stroke="#1a0f08" strokeWidth="2" />
    </svg>
  )
}

// A spot in the cage scene for one owned store item — only ever rendered once
// she actually owns it (see the ROOM_ITEMS.map call site below), so an
// unfurnished cage reads as clean and complete rather than a grid of grey
// placeholder ghosts.
function RoomItem({ className, title, icon, popping, tapped, onTap }) {
  const cls = `room-slot ${className} owned${popping ? ' gift-pop' : ''}${tapped ? ' tapped' : ''}`
  return (
    <button type="button" className={cls} title={title} onClick={onTap}>
      {icon}
    </button>
  )
}

// The room map itself — each entry a fixed, named spot (see .slot-* in
// App.css for the actual position), matching the brief's "designated spots"
// layout: window upper-left, mirror + chimes upper-right, perch + ribbon left
// of the nest, music box + herbs to its right, bowl + treats on the ground
// left, water tank + flowers on the ground right.
const ROOM_ITEMS = [
  { id: 'window', className: 'slot-window', title: 'Tiny Window', icon: <IconWindow /> },
  { id: 'mirror', className: 'slot-mirror', title: 'Small Mirror', icon: <IconMirror /> },
  { id: 'chimes', className: 'slot-chimes', title: 'Tap the wind chimes', icon: <IconChimes /> },
  { id: 'perch', className: 'slot-perch', title: 'Perch Branch', icon: <IconPerch /> },
  { id: 'ribbon', className: 'slot-ribbon', title: 'Ribbon Decoration', icon: <IconRibbon /> },
  { id: 'musicbox', className: 'slot-musicbox', title: 'Tap the music box', icon: <IconMusicBox /> },
  { id: 'herbs', className: 'slot-herbs', title: 'Herb Bundle', icon: <IconHerbs /> },
  { id: 'feedingbowl', className: 'slot-feedingbowl', title: 'Feeding Bowl — she always has something to nibble', icon: <IconFeedingBowl /> },
  { id: 'treats', className: 'slot-treats', title: 'Special Treats — a little bowl she can always nibble from', icon: <IconTreats /> },
  { id: 'watertank', className: 'slot-watertank', title: 'Large Water Tank — never runs dry', icon: <IconWaterTank /> },
  { id: 'flowers', className: 'slot-flowers', title: 'Flower Bouquet', icon: <IconFlowers /> },
]

// Tweety Store gifts: tap any owned item for a chirp + a matching motion.
// 'dance' reuses the existing happy-dance bounce, 'sway' is the gentler
// gift-tap motion, 'preen' reuses the existing self-preening wobble.
const GIFT_REACTIONS = {
  ribbon: { sound: 'play', motion: 'dance' },
  mirror: { sound: 'water', motion: 'preen' },
  flowers: { sound: 'water', motion: 'sway' },
  perch: { sound: 'play', motion: 'dance' },
  treats: { sound: 'feed', motion: 'dance' },
  blanket: { sound: 'water', motion: 'sway' },
  herbs: { sound: 'feed', motion: 'sway' },
  window: { sound: 'play', motion: 'sway' },
  feedingbowl: { sound: 'feed', motion: 'dance' },
  musicbox: { sound: 'play', motion: 'dance' },
  chimes: { sound: 'play', motion: 'dance' },
  watertank: { sound: 'water', motion: 'sway' },
  cozynest: { sound: 'water', motion: 'sway' },
  birdhouse: { sound: 'play', motion: 'dance' },
}

// Idle ambient behaviour is split into two layers: frequent tiny micro-idles
// and less frequent whole-room macro actions. All timing is presentation only;
// it never mutates happiness, care, inventory, hatch state, or saved data.
const TIME_PHASE_ACTIVITY = {
  morning: {
    micro: [3000, 6500],
    macro: [8000, 16000],
    sleepCheck: [180000, 300000],
    sleepChance: 0.08,
    sleepDuration: [5500, 8500],
    postWake: [180000, 300000],
  },
  midday: {
    micro: [3500, 7000],
    macro: [9000, 18000],
    sleepCheck: [240000, 420000],
    sleepChance: 0.06,
    sleepDuration: [5500, 8500],
    postWake: [210000, 360000],
  },
  evening: {
    micro: [5000, 9000],
    macro: [12000, 24000],
    sleepCheck: [90000, 180000],
    sleepChance: 0.3,
    sleepDuration: [8000, 12000],
    postWake: [120000, 220000],
  },
  night: {
    micro: [8000, 14000],
    macro: [18000, 32000],
    sleepCheck: [55000, 105000],
    sleepChance: 0.65,
    sleepDuration: [11000, 17000],
    postWake: [90000, 180000],
  },
}

const MICRO_IDLE_ACTION_DURATION = {
  glance: 900,
  tilt: 1100,
  bob: 950,
  tailflick: 850,
  wingtwitch: 850,
}

const MACRO_IDLE_ACTION_DURATION = {
  stretch: 1900,
  wingshake: 1200,
  wander: 3200,
  preen: 2400,
  perch: 3600,
  bowl: 3000,
  water: 3200,
}

const MACRO_MOTION_CLASS = {
  stretch: 'tweety-stretch',
  wingshake: 'tweety-wingshake',
  wander: 'tweety-wander',
  preen: 'tweety-preen',
  perch: 'tweety-hop-perch',
  bowl: 'tweety-visit-bowl',
  water: 'tweety-visit-water',
}

const MICRO_MOTION_CLASS = {
  glance: 'tweety-micro-glance',
  tilt: 'tweety-micro-tilt',
  bob: 'tweety-micro-bob',
  tailflick: 'tweety-micro-tailflick',
  wingtwitch: 'tweety-micro-wingtwitch',
}

const ITEM_AMBIENT_ACTIONS = {
  preen: {
    giftId: 'mirror',
    cooldown: 28000,
    weight: { morning: 1, midday: 1, evening: 3, night: 2 },
  },
  perch: {
    giftId: 'perch',
    cooldown: 32000,
    weight: { morning: 2, midday: 2, evening: 3, night: 2 },
  },
  bowl: {
    giftId: 'feedingbowl',
    cooldown: 30000,
    weight: { morning: 2, midday: 2, evening: 1, night: 1 },
  },
  water: {
    giftId: 'watertank',
    cooldown: 32000,
    weight: { morning: 2, midday: 2, evening: 1, night: 1 },
  },
}

function activityTiming(timePhase) {
  return TIME_PHASE_ACTIVITY[timePhase] || TIME_PHASE_ACTIVITY.midday
}

function randomBetween(range) {
  const [min, max] = range
  return min + Math.random() * (max - min)
}

function happinessIntervalFactor(happiness) {
  if (happiness >= 80) return 0.84
  if (happiness <= 30) return 1.28
  return 1
}

function weightedPick(entries, previousAction) {
  if (!entries.length) return null
  const candidates = entries.length > 1 ? entries.filter((entry) => entry.action !== previousAction) : entries
  const pool = candidates.length ? candidates : entries
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry.action
  }
  return pool[pool.length - 1].action
}

function pickMicroIdleAction(timePhase, happiness, previousAction) {
  const calm = timePhase === 'evening' || timePhase === 'night'
  const low = happiness <= 30
  const lively = happiness >= 80 && !calm
  const entries = calm || low
    ? [
        { action: 'glance', weight: 3 },
        { action: 'tilt', weight: 2 },
        { action: 'bob', weight: 1 },
      ]
    : lively
      ? [
          { action: 'glance', weight: 2 },
          { action: 'tilt', weight: 2 },
          { action: 'tailflick', weight: 2 },
          { action: 'wingtwitch', weight: 2 },
          { action: 'bob', weight: 1 },
        ]
      : [
          { action: 'glance', weight: 3 },
          { action: 'tilt', weight: 2 },
          { action: 'tailflick', weight: 1 },
          { action: 'wingtwitch', weight: 1 },
          { action: 'bob', weight: 1 },
        ]
  return weightedPick(entries, previousAction)
}

function pickMacroIdleAction(timePhase, happiness, ownedGiftIds, cooldownUntil, previousAction) {
  const low = happiness <= 30
  const day = timePhase === 'morning' || timePhase === 'midday'
  const now = Date.now()
  const entries = day
    ? [
        { action: 'wander', weight: low ? 1 : 3 },
        { action: 'stretch', weight: 2 },
        { action: 'wingshake', weight: low ? 1 : 2 },
      ]
    : timePhase === 'evening'
      ? [
          { action: 'stretch', weight: 2 },
          { action: 'wingshake', weight: low ? 0 : 1 },
          { action: 'wander', weight: low ? 0 : 1 },
        ]
      : [
          { action: 'stretch', weight: 2 },
          { action: 'wingshake', weight: low ? 0 : 1 },
        ]

  for (const [action, config] of Object.entries(ITEM_AMBIENT_ACTIONS)) {
    if (!ownedGiftIds.has(config.giftId)) continue
    if ((cooldownUntil[action] || 0) > now) continue
    const weight = config.weight[timePhase] || 1
    entries.push({ action, weight: low ? Math.max(1, Math.round(weight * 0.75)) : weight })
  }

  return weightedPick(entries.filter((entry) => entry.weight > 0), previousAction)
}

function sleepChanceForHappiness(baseChance, happiness) {
  if (happiness >= 80) return baseChance * 0.85
  if (happiness <= 30) return baseChance * 1.15
  return baseChance
}

export function TweetyHomeCard({
  tweety,
  dancing = false,
  justPurchasedItem = null,
  legacyNestTier = 'basic',
  rainbow = false,
  loveLetter = '',
  gifts = [],
  onFeed,
  onWater,
  onPlay,
  onOpenStats,
  onReleaseToGarden,
  onSettleHappiness,
  onHeardSong,
}) {
  const name = tweety?.name || 'Tweety'
  const care = tweetyCareState(tweety)
  const win = care.window
  const next = nextCareWindow()
  const windowsDone = windowsDoneToday(tweety)
  // reused once GardenBird renders worn wardrobe items in a later overhaul step
  // eslint-disable-next-line no-unused-vars
  const worn = tweety?.wardrobe?.worn || null
  const ownedGiftIds = useMemo(() => new Set(gifts.map((g) => g.id)), [gifts])

  // See TWEETY_NARROW_SIZE_FACTOR above — the bird's render size responds to
  // viewport width in JS instead of a CSS override, so it actually shrinks
  // proportionately on phones rather than fighting the SVG's own inline size.
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TWEETY_NARROW_MEDIA_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(TWEETY_NARROW_MEDIA_QUERY)
    const update = () => setIsNarrowViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Nothing else re-renders this card purely because the clock ticked, so a
  // "Feed" button rendered while a window was open would stay visually
  // active/stale after that window silently closes, until some unrelated
  // state change happened to force a re-render. This ticks a throwaway piece
  // of state once a minute so care/win/next above recompute on their own —
  // cheap (a single interval, 60s granularity) and scoped to exactly while
  // this card is mounted (cleared the moment it isn't, e.g. she navigates
  // away or Tweety graduates to the garden).
  const [, forceCareRecheck] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => forceCareRecheck((t) => t + 1), 60000)
    return () => window.clearInterval(id)
  }, [])

  // Settle passive decay once per mount (see settleHappinessDecay in App.jsx).
  useEffect(() => {
    onSettleHappiness?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Feeding Bowl / Large Water Tank / Herb Bundle soften an occasional missed
  // window so she never reads as visibly upset over it; Special Treats Bag
  // forces a happy mood for the rest of the day it was bought.
  const neverSad = ownedGiftIds.has('feedingbowl') || ownedGiftIds.has('watertank') || ownedGiftIds.has('herbs')
  const boosted = treatsBoostActive(tweety)
  // Tapping any gift brightens her mood for the moment — transient, never
  // persisted, and it clears the instant justTapped does.
  const [justTapped, setJustTapped] = useState(null)
  const justTappedTimerRef = useRef(null)
  useEffect(() => () => window.clearTimeout(justTappedTimerRef.current), [])
  const [careMotion, setCareMotion] = useState(null)
  const careMotionTimerRef = useRef(null)
  useEffect(() => () => window.clearTimeout(careMotionTimerRef.current), [])
  // A direct tap/pet on the bird herself — distinct from singSong's floating
  // note below, a real little happy-wiggle reaction (see .tweety-pet).
  const [petting, setPetting] = useState(false)
  const pettingTimerRef = useRef(null)
  useEffect(() => () => window.clearTimeout(pettingTimerRef.current), [])
  // Shared scheduler refs. Sleep stays top priority; user/care/macro actions
  // block each other so ambient timers do not fire invisibly under a stronger
  // motion class.
  const sleepActiveRef = useRef(false)
  const interactionActiveRef = useRef(false)
  const lastMicroActionRef = useRef(null)
  const lastMacroActionRef = useRef(null)
  const itemCooldownUntilRef = useRef({})
  const brightened = Boolean(justTapped)
  const mood = tweetySimpleMood(tweety, new Date(), { neverSad, boosted: boosted || brightened })
  const face = MOOD_FACE[mood] || MOOD_FACE.content
  const happiness = typeof tweety?.happiness === 'number' ? tweety.happiness : 70
  // A few recursive room-item timers below (idle-ambient, Feeding Bowl,
  // Water Tank) read happiness through this ref rather than the plain
  // `happiness` const above, so they never close over a stale value.
  const happinessRef = useRef(happiness)
  useEffect(() => {
    happinessRef.current = happiness
  }, [happiness])
  // happy/content/lonely/sad — the same 4-value mood happinessFace already
  // reads off, reused as the bird's idle body-language posture below.
  const posture = happinessMood(happiness)
  const happinessFace = HAPPINESS_MOOD_FACE[posture]
  const growth = tweetyGrowth(tweety)
  const progress = tweetyGrowthProgress(tweety)
  const birdLevel = GROWTH_TO_LEVEL[growth.key] || 'chick'
  const stageScale = TWEETY_STAGE_SCALE[birdLevel] ?? 1
  const stageMute = TWEETY_STAGE_MUTE[birdLevel] ?? 0
  const speciesArt = speciesArtFor(tweety?.companion, tweety?.realSpecies)
  const tweetyZones = mutedZones(speciesArt.zones, stageMute)
  // Cage-view render size, and the stage-aware rest offset that puts her
  // actual TOES (SONGBIRD_FEET_FRACTION down her own box) exactly on the
  // main perch branch's own rendered line (CAGE_PERCH_LINE_FRACTION down the
  // cage), at every growth stage.
  //
  // Earlier passes derived this offset from her box-BOTTOM reaching a fixed
  // line (matching where she used to sit before the cage/perch existed at
  // all) — that line was never actually checked against where the perch
  // graphic renders, which is what let the "floating"/"legs through the
  // branch" mismatch persist across a few rounds. This version instead
  // targets the perch's real drawn position directly:
  //   roomHeightPx        — .tweety-room is a fixed 240px/300px wide box
  //                         (App.css) at its own fixed 4:5 aspect ratio, so
  //                         its height only ever takes one of two values.
  //   perchLinePx         — CAGE_PERCH_LINE_FRACTION of that height (the
  //                         branch's own position never changes, but where
  //                         it lands in real px does, per breakpoint).
  //   restAnchorPx        — TWEETY_REST_ANCHOR_FRACTION of that height,
  //                         matching .tweety-nest's own top:25% anchor.
  //   K*stageScale*FEET   — how far down her own toes sit, at this stage's
  //                         actual render height.
  // offset = (perchLinePx - restAnchorPx) - K*stageScale*FEET_FRACTION,
  // which algebraically keeps her toe-line pinned to perchLinePx at every
  // stage (verified: chick/fledgling/young/adult all land on the exact same
  // line), with zero re-derivation needed if the branch itself ever moves —
  // only CAGE_PERCH_LINE_FRACTION would need updating.
  //
  // birdSizeMul is the same per-render multiplier the size prop below uses,
  // just without the stageScale factor — i.e. what her height WOULD be at
  // full (adult) scale. Purely a static translateY on a new middle wrapper
  // (.tweety-stage-offset, between the existing posture wrapper and the
  // animated motion-shell) — doesn't touch growth logic, species art, or the
  // motion-shell's own keyframes.
  const birdSizeMul = TWEETY_BASE_SIZE * (isNarrowViewport ? TWEETY_NARROW_SIZE_FACTOR : 1) * (speciesArt.sizeScale || 1)
  const birdSize = birdSizeMul * stageScale
  const birdHeightAtFullScale = birdSizeMul * SONGBIRD_SVG_ASPECT
  const roomHeightPx = isNarrowViewport ? 300 : 375
  const perchLinePx = roomHeightPx * CAGE_PERCH_LINE_FRACTION
  const restAnchorPx = roomHeightPx * TWEETY_REST_ANCHOR_FRACTION
  const stageRestOffsetPx = (perchLinePx - restAnchorPx) - birdHeightAtFullScale * stageScale * SONGBIRD_FEET_FRACTION
  const roomTheme = tweety?.roomTheme || 'cottage'
  const fedToday = tweetyFedToday(tweety)
  // "Tweety's cosy home ✨" — a small badge once she's actually filled the
  // room out, not from day one. 5 permanent gifts (not counting the
  // consumable 'treats' bowl, which comes and goes) reads as "furnished".
  const cosyHomeEarned = gifts.filter((g) => g.id !== 'treats').length >= 5

  // Luxury Birdhouse fully replaces the nest; Cozy Nest Upgrade is the step
  // below that; anything gifted from the admin-only legacy Bird Store (rare)
  // still counts too, so nothing already gifted ever looks like it downgraded.
  // 'nest' is the pre-redesign Nest Upgrade id — same effect as 'cozynest',
  // kept recognized so purchases made before the redesign still count.
  const nestTier = ownedGiftIds.has('birdhouse') || legacyNestTier === 'treehouse' || legacyNestTier === 'luxury'
    ? 'treehouse'
    : ownedGiftIds.has('cozynest') || ownedGiftIds.has('nest') || legacyNestTier === 'cosy'
      ? 'cosy'
      : 'basic'
  const hasFeedingBowl = ownedGiftIds.has('feedingbowl')
  const hasWaterTank = ownedGiftIds.has('watertank')

  // Every gift is a tap-for-delight moment (no persisted state, always safe) —
  // brightens her mood for the moment only, never a real happiness gain (that
  // would let a store item be spam-tapped to 100% happiness in one sitting).
  // Chimes and music box keep their own signature chirp sequences; every
  // other item plays a single chirp + motion straight off GIFT_REACTIONS.
  function tapGift(id) {
    setJustTapped(id)
    window.clearTimeout(justTappedTimerRef.current)
    justTappedTimerRef.current = window.setTimeout(() => setJustTapped((c) => (c === id ? null : c)), 1100)
    if (id === 'chimes') {
      playChirp('play')
      setTimeout(() => playChirp('water'), 160)
      setTimeout(() => playChirp('feed'), 320)
      return
    }
    if (id === 'musicbox') {
      playChirp('play')
      return
    }
    const reaction = GIFT_REACTIONS[id]
    if (reaction) playChirp(reaction.sound)
  }
  const tapReaction = justTapped ? GIFT_REACTIONS[justTapped] : null

  function triggerCareMotion(kind, callback) {
    interactionActiveRef.current = true
    setCareMotion(kind)
    window.clearTimeout(careMotionTimerRef.current)
    // When she owns the matching room item, Feed/Water play the fuller
    // "walk over, eat/drink, walk back" animation (.tweety-visit-bowl /
    // .tweety-visit-water — see motionClass below), which needs a bit longer
    // than the plain in-place wiggle to read clearly; falls back to the
    // original short durations otherwise. Presentation timing only — this
    // doesn't touch what Feed/Water actually do to happiness/state.
    const duration = kind === 'drink'
      ? (hasWaterTank ? 3200 : 2200)
      : kind === 'feed'
        ? (hasFeedingBowl ? 3000 : 1800)
        : 1200
    careMotionTimerRef.current = window.setTimeout(() => {
      setCareMotion(null)
      careMotionTimerRef.current = null
    }, duration)
    callback?.()
  }

  // One macro lane owns mirror/perch/bowl/water plus larger idle gestures.
  // This prevents independent item timers from stacking, repeating the same
  // owned item back-to-back, or firing under a higher-priority class.
  const [macroAction, setMacroAction] = useState(null)
  const [microAction, setMicroAction] = useState(null)

  useEffect(() => {
    interactionActiveRef.current = Boolean(dancing || tapReaction || careMotion || petting || macroAction)
  }, [dancing, tapReaction, careMotion, petting, macroAction])

  // Luxury Birdhouse: an occasional sleep visit, now phase-aware and protected
  // by an explicit post-wake cooldown so she cannot wake and fall asleep again
  // shortly afterward.
  const hasBirdhouse = nestTier === 'treehouse'
  const [sleepPhase, setSleepPhase] = useState('idle')
  useEffect(() => {
    sleepActiveRef.current = sleepPhase !== 'idle'
  }, [sleepPhase])
  useEffect(() => {
    if (!hasBirdhouse) return undefined
    const timers = []
    const after = (ms, fn) => {
      const id = window.setTimeout(fn, ms)
      timers.push(id)
      return id
    }
    const scheduleNext = (range = activityTiming(saTimePhase()).sleepCheck) => after(randomBetween(range), runVisit)
    function runVisit() {
      const timing = activityTiming(saTimePhase())
      if (interactionActiveRef.current) {
        scheduleNext(timing.sleepCheck)
        return
      }
      if (Math.random() > sleepChanceForHappiness(timing.sleepChance, happinessRef.current)) {
        scheduleNext(timing.sleepCheck)
        return
      }

      const sleepFor = randomBetween(timing.sleepDuration)
      sleepActiveRef.current = true
      setMicroAction(null)
      setMacroAction(null)
      setSleepPhase('approaching')
      after(1200, () => setSleepPhase('entering'))
      after(2100, () => setSleepPhase('sleeping'))
      after(2100 + sleepFor, () => setSleepPhase('waking'))
      after(2800 + sleepFor, () => setSleepPhase('leaving'))
      after(3700 + sleepFor, () => {
        setSleepPhase('idle')
        sleepActiveRef.current = false
        scheduleNext(activityTiming(saTimePhase()).postWake)
      })
    }
    scheduleNext()
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [hasBirdhouse])

  useEffect(() => {
    let macroTimer
    let macroResetTimer
    const scheduleNext = () => {
      const phase = saTimePhase()
      const delay = randomBetween(activityTiming(phase).macro) * happinessIntervalFactor(happinessRef.current)
      macroTimer = window.setTimeout(() => {
        if (sleepActiveRef.current || interactionActiveRef.current) {
          scheduleNext()
          return
        }
        const action = pickMacroIdleAction(
          saTimePhase(),
          happinessRef.current,
          ownedGiftIds,
          itemCooldownUntilRef.current,
          lastMacroActionRef.current,
        )
        if (!action) {
          scheduleNext()
          return
        }
        const itemConfig = ITEM_AMBIENT_ACTIONS[action]
        if (itemConfig) itemCooldownUntilRef.current[action] = Date.now() + itemConfig.cooldown
        lastMacroActionRef.current = action
        interactionActiveRef.current = true
        setMacroAction(action)
        macroResetTimer = window.setTimeout(() => setMacroAction(null), MACRO_IDLE_ACTION_DURATION[action])
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => {
      window.clearTimeout(macroTimer)
      window.clearTimeout(macroResetTimer)
    }
  }, [ownedGiftIds])

  useEffect(() => {
    let microTimer
    let microResetTimer
    const scheduleNext = () => {
      const phase = saTimePhase()
      const delay = randomBetween(activityTiming(phase).micro) * happinessIntervalFactor(happinessRef.current)
      microTimer = window.setTimeout(() => {
        if (sleepActiveRef.current || interactionActiveRef.current) {
          scheduleNext()
          return
        }
        const action = pickMicroIdleAction(saTimePhase(), happinessRef.current, lastMicroActionRef.current)
        lastMicroActionRef.current = action
        setMicroAction(action)
        microResetTimer = window.setTimeout(() => setMicroAction(null), MICRO_IDLE_ACTION_DURATION[action])
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => {
      window.clearTimeout(microTimer)
      window.clearTimeout(microResetTimer)
    }
  }, [])

  // Tweety's songs: tapping her plays her current growth stage's tune (Web
  // Audio, see playTweetySong) plus a little floating note that times itself
  // off the song's own duration. The "tap to hear" hint shows once ever,
  // persisted via tweety.songHintSeen (see onHeardSong in App.jsx).
  const [singingNote, setSingingNote] = useState(false)
  const singingNoteTimerRef = useRef(null)
  useEffect(() => () => window.clearTimeout(singingNoteTimerRef.current), [])
  function singSong() {
    const duration = playTweetySong(growth.key)
    setSingingNote(true)
    window.clearTimeout(singingNoteTimerRef.current)
    singingNoteTimerRef.current = window.setTimeout(() => setSingingNote(false), duration * 1000 + 500)
    if (!tweety?.songHintSeen) onHeardSong?.()
  }

  // Tapping the bird herself: sings (as before) AND shows a distinct little
  // happy-wiggle "petted" reaction (see .tweety-pet) — sing on its own was
  // audio + a floating note with no body motion, which didn't read as a
  // real pet/tap reaction.
  function handleBirdTap() {
    singSong()
    setPetting(true)
    window.clearTimeout(pettingTimerRef.current)
    pettingTimerRef.current = window.setTimeout(() => setPetting(false), 900)
  }

  // Which visual-shell animation plays right now, in priority order:
  // sleep, care, direct user interaction, macro ambient, then micro ambient.
  // The outer button keeps layout/tap/posture transforms separate from this
  // animated shell so the classes compose instead of replacing each other.
  const tapMotion = tapReaction?.motion
  let motionClass
  if (hasBirdhouse && sleepPhase !== 'idle') {
    motionClass = `tweety-sleep-${sleepPhase}`
  } else if (careMotion === 'feed') {
    motionClass = hasFeedingBowl ? 'tweety-visit-bowl' : 'tweety-care-feed'
  } else if (careMotion === 'drink') {
    motionClass = hasWaterTank ? 'tweety-visit-water' : 'tweety-care-drink'
  } else if (careMotion === 'play') {
    motionClass = 'tweety-care-play'
  } else if (dancing) {
    motionClass = 'tweety-dance'
  } else if (petting) {
    motionClass = 'tweety-pet'
  } else if (tapMotion === 'dance') {
    motionClass = 'tweety-dance'
  } else if (tapMotion === 'preen') {
    motionClass = 'tweety-preen'
  } else if (tapMotion === 'sway') {
    motionClass = 'tweety-gift-sway'
  } else {
    motionClass = MACRO_MOTION_CLASS[macroAction] || MICRO_MOTION_CLASS[microAction] || ''
  }

  return (
    <section className={`soft-card full-span tweety-card tweety-mood-${mood}`}>
      {/* Phase 2 home-UI cleanup: title first (matches every other card's
          h3 pattern), one light mood/personality line under it — species
          name and the full growth-stage label both still live on Stats
          (TweetyStatsPage), so nothing shown here is lost, just decluttered. */}
      <div className="section-heading">
        <div>
          <h3>{name}&apos;s Home 🪺</h3>
          <p className="tweety-mood-line">{face.emoji} {name} {face.line}</p>
        </div>
        <button className="text-btn" type="button" onClick={onOpenStats}>
          Stats →
        </button>
      </div>

      <div className={`tweety-stage nest-${nestTier}`}>
        {mood === 'sad' && <div className="tweety-raincloud" aria-hidden="true">🌧️</div>}

        {cosyHomeEarned && <p className="tweety-cosy-home-label">Tweety&apos;s cosy home ✨</p>}

        {/* Her home cage (Phase 1 redesign) — every store item still gets a
            fixed, named spot (see ROOM_ITEMS above), but now only renders
            once she actually owns it, so an unfurnished cage stays clean
            rather than showing 11 grey ghost placeholders. */}
        <div className="tweety-room" style={{ '--warmth': happiness / 100 }}>
          <div className="room-backdrop" aria-hidden="true">
            <RoomBackdrop theme={roomTheme} timePhase={saTimePhase()} />
          </div>
          <div className="room-backdrop-wash" aria-hidden="true" />
          <div className="cage-frame-back" aria-hidden="true"><CageFrameBack /></div>
          <div className="tweety-room-glow" aria-hidden="true" />
          {ROOM_ITEMS.map((it) => {
            // Treats is a repeatable consumable, never added to the permanent
            // gifts list — its bowl only appears while today's boost is
            // active (plus any legacy one-off 'treats' id, kept recognized).
            const owned = it.id === 'treats' ? boosted || ownedGiftIds.has('treats') : ownedGiftIds.has(it.id)
            // Unowned items simply don't render (see RoomItem above) — a
            // sparsely-furnished cage should look clean, not full of grey
            // ghost placeholders.
            if (!owned) return null
            // Feeding Bowl reads full/sparse off whether she's fed today —
            // every other item's icon is static.
            const icon = it.id === 'feedingbowl' ? <IconFeedingBowl filled={fedToday} /> : it.icon
            return (
              <RoomItem
                key={it.id}
                className={it.className}
                title={it.title}
                icon={icon}
                popping={justPurchasedItem === it.id}
                tapped={justTapped === it.id}
                onTap={() => tapGift(it.id)}
              />
            )
          })}

          <div className={`tweety-nest${rainbow ? ' tweety-rainbow' : ''}`}>
            {boosted && <div className="gift-boost-sparkle" title="Treats Bag boost — happy all day" aria-hidden="true">✨</div>}
            {/* Cozy Nest Blanket is its own purchase, independent of the
                nest-tier upgrade below — a warm lining that can sit under
                any tier, basic through birdhouse. Only rendered once owned,
                same "no ghost placeholders" rule as the room items above. */}
            {ownedGiftIds.has('blanket') && (
              <div className={`tweety-blanket owned${justPurchasedItem === 'blanket' ? ' gift-pop' : ''}`}>
                <button
                  type="button"
                  className={`tweety-blanket-btn${justTapped === 'blanket' ? ' tapped' : ''}`}
                  title="Cozy Nest Blanket"
                  onClick={() => tapGift('blanket')}
                >
                  <IconBlanket />
                </button>
              </div>
            )}
            {/* The button owns layout/tap/mood posture; .tweety-stage-offset
                (new, refinement pass) owns the static per-stage rest nudge
                described above; the inner shell owns motion animations — all
                three compose independently since they're separate nested
                elements, so none of them fight or overwrite each other. */}
            <button
              type="button"
              className={`tweety-bird tweety-posture-${posture}`}
              title={`Tap to pet or hear ${name} sing`}
              onClick={handleBirdTap}
              disabled={sleepPhase !== 'idle'}
            >
              <span className="tweety-stage-offset" style={{ transform: `translateY(${stageRestOffsetPx}px)` }}>
                <span className={`tweety-motion-shell${motionClass ? ` ${motionClass}` : ''}`}>
                  {/* ground={false}: every template draws its OWN built-in
                      branch/ground rect by default (see Ground/GardenBird in
                      birdTemplates.jsx) — with the cage's own main perch now
                      behind her, that second, independently-positioned line
                      was the "awkward line under her feet" (root cause of the
                      final visual polish issue: two unaligned perch lines,
                      not one). Same ground={false} the species picker/quiz
                      previews already use elsewhere in this file. */}
                  <GardenBird
                    template={speciesArt.template || 'songbird-small'}
                    zones={tweetyZones}
                    size={birdSize}
                    ground={false}
                  />
                  {birdLevel === 'crowned' && <TweetyCrown />}
                  {roomTheme === 'winter-cabin' && (
                    <span className="tweety-scarf" aria-hidden="true"><WinterScarf /></span>
                  )}
                  {singingNote && <span className="tweety-song-note" aria-hidden="true">🎵</span>}
                </span>
              </span>
            </button>
            {loveLetter && <span className="tweety-letter" title={loveLetter} aria-hidden="true">💌</span>}
            {/* Same stage rest offset as the bird above, on its own wrapper
                (not a direct inline style on .tweety-nest-base — that would
                override its CSS hover:scale via inline-style precedence) —
                so whichever tier is showing moves down together with her
                for shorter growth stages, instead of looking left behind. */}
            <span className="tweety-stage-offset" style={{ transform: `translateY(${stageRestOffsetPx}px)` }}>
              {nestTier === 'treehouse' ? (
                // Walls, roof, entrance and its tree decoration all drawn as ONE
                // self-contained, viewBox-scaled SVG (see LuxuryBirdhouseArt
                // below) inside a single stable bounding wrapper — same pattern
                // every other room item uses (see .room-slot in App.css) —
                // instead of the old CSS triangle-hack roof plus a separately
                // positioned emoji tree that needed hand-tuned pixel overrides
                // to avoid falling apart on mobile.
                <button
                  type="button"
                  className={`tweety-nest-base nest-base-treehouse${justTapped === 'birdhouse' ? ' tapped' : ''}${justPurchasedItem === 'birdhouse' ? ' gift-pop' : ''}${sleepPhase !== 'idle' ? ` nest-sleep-${sleepPhase}` : ''}`}
                  title="Luxury Birdhouse"
                  onClick={() => tapGift('birdhouse')}
                >
                  <LuxuryBirdhouseArt />
                  {(sleepPhase === 'entering' || sleepPhase === 'sleeping' || sleepPhase === 'waking') && (
                    <span className="birdhouse-zzz" aria-hidden="true">Zzz</span>
                  )}
                </button>
              ) : nestTier === 'basic' ? (
                <div className="tweety-nest-base nest-base-basic" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className={`tweety-nest-base nest-base-cosy${justTapped === 'cozynest' ? ' tapped' : ''}${justPurchasedItem === 'cozynest' ? ' gift-pop' : ''}`}
                  title="Cozy Nest Upgrade"
                  onClick={() => tapGift('cozynest')}
                />
              )}
            </span>
          </div>
          {/* Front cage bars — the last child so they paint above the bird
              and every room item, "looking into the aviary" from outside.
              Thin, sparse and pointer-events:none (see .cage-frame-front in
              App.css) so Tweety stays clearly the focal point and every tap
              target underneath still works. */}
          <div className="cage-frame-front" aria-hidden="true"><CageFrameFront /></div>
        </div>
        {!tweety?.songHintSeen && (
          <p className="tweety-song-hint">🎵 Tap to hear {name} sing</p>
        )}
        {/* Repair pass: the stage/mood pills now sit side by side in one
            compact row instead of stacking as two separate full-width
            centred rows — reads tighter, and ties this row visually to the
            equally-compact status line right below it. No text/values
            changed, just how the two spans are grouped. */}
        <div className="tweety-pill-row">
          <span className="tweety-level-pill">{growth.label}</span>
          <span className="tweety-streak-pill">{face.label} {face.emoji}</span>
        </div>
      </div>

      {/* Phase 2 home-UI cleanup: the old separate growth-bar block and
          happiness-meter block collapse into one light two-line readout —
          same underlying values (happiness, happinessFace, progress.caption),
          nothing recalculated. Percent bar / heart-fill visuals and the full
          stage label still live on Stats; this is presentation only. */}
      <div className="tweety-status-line">
        <p className="tweety-status-bonded">
          {happinessFace.emoji} {happinessFace.label} · {happiness}% bonded
        </p>
        <p className="tweety-status-growth">{progress.caption}</p>
      </div>

      {loveLetter && <p className="tweety-letter-text">💌 {loveLetter}</p>}

      {win ? (
        <>
          {/* tweety-care-row-compact: a scoped modifier (see App.css), not a
              change to the shared .tweety-care-row/.tweety-care-btn rules —
              those are also used by the unrelated baby-bird care card below
              in this file, which stays exactly as it was. Same handlers,
              same disabled/done logic, only lighter/smaller presentation. */}
          <div className="tweety-care-row tweety-care-row-compact">
            <button
              className={`tweety-care-btn${care.fed ? ' done' : ''}`}
              type="button"
              onClick={() => triggerCareMotion('feed', onFeed)}
              disabled={care.fed}
            >
              <span className="tweety-care-icon" aria-hidden="true">🌾</span>
              <span>{care.fed ? 'Fed ✓' : 'Feed'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.watered ? ' done' : ''}`}
              type="button"
              onClick={() => triggerCareMotion('drink', onWater)}
              disabled={care.watered}
            >
              <span className="tweety-care-icon" aria-hidden="true">💧</span>
              <span>{care.watered ? 'Watered ✓' : 'Water'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.played ? ' done' : ''}`}
              type="button"
              onClick={() => triggerCareMotion('play', onPlay)}
              disabled={care.played}
            >
              <span className="tweety-care-icon" aria-hidden="true">💕</span>
              <span>{care.played ? 'Played ✓' : 'Play'}</span>
            </button>
          </div>
          <p className="tweety-hint">
            {win.emoji} {win.label} care window — feed, water &amp; play before {win.end}:00
            {windowsDone > 0 ? ` · ${windowsDone}/3 windows today` : ''} 💛
          </p>
        </>
      ) : (
        <div className="tweety-resting">
          <span className="tweety-resting-emoji" aria-hidden="true">😴</span>
          <p className="tweety-resting-line">{name} is resting</p>
          <p className="tweety-resting-sub">
            Next care window ({next.window.emoji} {next.window.label}) in {next.hoursUntil} hour
            {next.hoursUntil === 1 ? '' : 's'}
          </p>
          {windowsDone > 0 && (
            <p className="tweety-resting-sub">{windowsDone}/3 care windows done today 💛</p>
          )}
        </div>
      )}

      {/* P3 (sandbox only — prop only passed for Marnich): a crowned companion
          can graduate to live permanently in the Bird Garden, freeing Tweety to
          raise a brand-new companion. */}
      {onReleaseToGarden && growth.key === 'crowned' && (
        <button className="secondary-btn tweety-release-btn" type="button" onClick={onReleaseToGarden}>
          🌳 Release {name} to the Garden
        </button>
      )}
    </section>
  )
}

// ---- First-egg selection (very first login) --------------------------------
export function FirstEggSelect({ onPick }) {
  return (
    <main className="login-screen companion-screen">
      <section className="login-card companion-card" aria-labelledby="first-egg-title">
        <p className="login-tag" id="first-egg-title">Choose your first egg 🥚</p>
        <p className="login-sub">
          Pick the egg that calls to you. What&apos;s curled up inside is a secret —
          it only hatches after 3 days of warming. ✨
        </p>
        <div className="egg-choice-grid">
          {FIRST_EGGS.map((egg) => (
            <button className="egg-choice" type="button" key={egg.id} onClick={() => onPick(egg.id)}>
              <ColorEgg color={egg.color} size={92} glow />
              <strong>{egg.name}</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

// ---- First-egg warming card (home, until it hatches into Tweety) -----------
export function FirstEggCard({ tweety, onWarm }) {
  const egg = tweety?.firstEgg
  if (!egg) return null
  const warms = egg.warms || 0
  const warmedToday = egg.lastWarmDay === tweetyTodayKey()
  return (
    <section className="soft-card full-span tweety-card first-egg-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your first egg 🥚</p>
          <h3>Warm your {egg.name} egg every day — it hatches after {FIRST_EGG_WARMS} days</h3>
        </div>
      </div>
      <EggNest progress={warms / FIRST_EGG_WARMS}>
        <ColorEgg color={egg.color} size={140} glow />
      </EggNest>
      <EggWarmthMeter warms={warms} total={FIRST_EGG_WARMS} progress={warms / FIRST_EGG_WARMS} />
      {warmedToday ? (
        <p className="fine-print">
          So warm and cosy 💛 Come back tomorrow to warm it again. ({warms}/{FIRST_EGG_WARMS} days)
        </p>
      ) : (
        <button className="primary-btn wide big-btn" type="button" onClick={onWarm}>
          Warm the egg 🔥 ({warms}/{FIRST_EGG_WARMS})
        </button>
      )}
    </section>
  )
}

// Generic songbird colours for a species she's catalogued that isn't (yet)
// in BIRD_COLOUR_MAP — same fallback shape Garden.jsx uses for uncatalogued
// visitors, so the preview still reads as "a real bird", never blank.
const EGG_PICKER_GENERIC_ZONES = {
  head: '#8a7b63', beak: '#4a433d', eye: '#2b2117', body: '#7c6e58',
  breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47',
}

// ---- Mystery egg species choice ---------------------------------------------
// A mystery egg no longer hides a secretly-pre-picked species — she chooses
// it herself from every species she's actually catalogued (seen) in her
// Collection, previewed as the real illustrated GardenBird art (never a
// photo). Shown instead of MysteryEggCard while mysteryEgg.needsSpeciesChoice
// is true; once she taps one, onChoose resolves it and the normal warm-up
// card takes over.
export function EggSpeciesPicker({ birdLibrary = [], onChoose }) {
  const catalogued = (birdLibrary || []).filter((b) => b.seen && b.commonName)
  return (
    <section className="soft-card full-span tweety-card egg-species-picker-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A rare egg 🥚</p>
          <h3>Who's inside? You choose 🐣</h3>
        </div>
      </div>
      <p className="fine-print">Pick any species from your Collection — she&apos;ll hatch as that exact bird.</p>
      {catalogued.length === 0 ? (
        <p className="fine-print">Discover a species in the wild first, then come back to choose.</p>
      ) : (
        <div className="catalog-row egg-species-grid">
          {catalogued.map((bird) => {
            const entry = BIRD_COLOUR_MAP[bird.id]
            const template = entry?.template || 'songbird-small'
            const zones = entry?.zones || EGG_PICKER_GENERIC_ZONES
            return (
              <button
                key={bird.id}
                type="button"
                className="catalog-card egg-species-btn"
                onClick={() => onChoose?.(bird.id)}
              >
                <span className="egg-species-preview">
                  <GardenBird template={template} zones={zones} size={48} ground={false} />
                </span>
                <strong>{bird.commonName}</strong>
                {bird.afrikaansName && <span className="catalog-blurb">{bird.afrikaansName}</span>}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ---- Mystery egg (earned through birding, hatches her next companion) ------
// Same tap-to-warm rhythm as FirstEggCard, reusing ColorEgg — but the colour/
// pattern hint is subtle (never the real species) until it's actually ready.
export function MysteryEggCard({ mysteryEgg, onWarm }) {
  if (!mysteryEgg) return null
  const warms = mysteryEgg.warms || 0
  const ready = warms >= MYSTERY_EGG_WARMS
  const warmedToday = mysteryEgg.lastWarmDay === tweetyTodayKey()
  return (
    <section className="soft-card full-span tweety-card first-egg-card mystery-egg-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A rare egg 🥚</p>
          <h3>
            {ready
              ? `It's hatched! A ${mysteryEgg.realSpecies} is waiting for you`
              : `Warm your mystery egg every day — it hatches after ${MYSTERY_EGG_WARMS} days`}
          </h3>
        </div>
      </div>
      {ready ? (
        <div className="first-egg-stage">
          <ColorEgg color={mysteryEgg.color} size={96} />
        </div>
      ) : (
        <>
          <EggNest progress={warms / MYSTERY_EGG_WARMS}>
            <ColorEgg color={mysteryEgg.color} size={140} glow />
          </EggNest>
          <EggWarmthMeter warms={warms} total={MYSTERY_EGG_WARMS} progress={warms / MYSTERY_EGG_WARMS} />
        </>
      )}
      {ready ? (
        <p className="fine-print">
          Your next companion is ready and waiting — she&apos;ll join you the moment you release
          your current one to the garden. 🪶
        </p>
      ) : warmedToday ? (
        <p className="fine-print">
          So warm and cosy 💛 Come back tomorrow to warm it again. ({warms}/{MYSTERY_EGG_WARMS} days)
        </p>
      ) : (
        <button className="primary-btn wide big-btn" type="button" onClick={onWarm}>
          Warm the egg 🔥 ({warms}/{MYSTERY_EGG_WARMS})
        </button>
      )}
    </section>
  )
}

// ---- The brief gap between releasing a companion and adopting the next ----
export function AwaitingCompanionCard({ tweety }) {
  const lastName = tweety?.lastReleasedName
  return (
    <section className="soft-card full-span tweety-card awaiting-companion-card">
      <p className="eyebrow">Between companions 🪶</p>
      <h3>{lastName ? `${lastName} is settling into the garden` : 'Your last companion is settling into the garden'}</h3>
      <div className="awaiting-nest-scene" aria-hidden="true">
        <div className="awaiting-nest-wrap">
          <span className="awaiting-nest-feather" style={{ left: '18%' }}>🪶</span>
          <div className="awaiting-nest-base" />
        </div>
      </div>
      <p className="fine-print">
        Keep birding — your next companion is warming up in her mystery egg and will join you
        very soon.
      </p>
    </section>
  )
}

// ---- Stats page ------------------------------------------------------------
export function TweetyStatsPage({ tweety, onBack, onRename }) {
  const growth = tweetyGrowth(tweety)
  const mood = tweetySimpleMood(tweety)
  const name = tweety?.name || 'Tweety'
  // Same exact-species-first rule as TweetyHomeCard's species line above.
  const species = tweety?.realSpecies || companionSpecies(tweety?.companion)
  const songsLearned = tweetySongsLearned(tweety)
  return (
    <div className="page-grid">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          Back
        </button>
        <div className="tweety-stats-hero">
          <span className="tweety-stats-portrait">
            <TweetyBird level={GROWTH_TO_LEVEL[growth.key] || 'chick'} mood={mood} size={104} companion={tweety?.companion} />
          </span>
          <div>
            <p className="eyebrow">Your pet bird</p>
            <h2>{name}{species && <span className="tweety-species"> ({species})</span>}</h2>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const next = window.prompt('Rename your pet bird:', name)
                if (next && next.trim()) onRename(next.trim())
              }}
            >
              Rename
            </button>
          </div>
        </div>
      </section>

      <section className="soft-card full-span">
        <div className="admin-dashboard-grid">
          <div className="stat-card">
            <span>Days cared for</span>
            <strong>{tweetyDaysCared(tweety)}</strong>
            <p>full-care days</p>
          </div>
          <div className="stat-card">
            <span>Longest streak</span>
            <strong>{tweetyLongestStreak(tweety)}</strong>
            <p>days in a row</p>
          </div>
          <div className="stat-card">
            <span>Growth stage</span>
            <strong>{growth.label}</strong>
            <p>grows a little every real day</p>
          </div>
          <div className="stat-card">
            <span>Treats from Marnich</span>
            <strong>{tweety?.treatsReceived || 0}</strong>
            <p>surprise treats 💛</p>
          </div>
          <div className="stat-card">
            <span>Songs learned</span>
            <strong>{songsLearned}/5 🎵</strong>
            <p>a new tune every growth stage</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---- Manual companion chooser (currently unused, kept for reuse) ----------
// Previously used both at first login and for picking the next companion
// after a garden release — both flows have since moved to automatic
// selection (DEFAULT_COMPANION at signup; the mystery-egg hatch after a
// release). Left defined rather than deleted in case a manual-pick flow is
// wanted again later.
export function CompanionSelect({ onPick, title = 'Meet your Tweety 🐣', sub = 'Choose the bird your golden pet chick will take after.' }) {
  return (
    <main className="login-screen companion-screen">
      <section className="login-card companion-card" aria-labelledby="companion-title">
        <p className="login-tag" id="companion-title">{title}</p>
        <p className="login-sub">{sub}</p>
        <div className="companion-grid">
          {TWEETY_COMPANIONS.map((c) => (
            <button className="companion-option" type="button" key={c.id} onClick={() => onPick(c.id)}>
              <TweetyBird companion={c.id} size={92} />
              <strong>{c.name}</strong>
              <small>{c.blurb}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

// ---- Sandbox-only companion gallery ----------------------------------------
// A dev/preview grid showing every companion species across all five growth
// stages, for a final visual check. Gated to Marnich's sandbox in App.jsx — it
// is never shown to Pooks and reads no per-account state (pure rendering).
const GALLERY_STAGES = [
  ['chick', 'Chick'],
  ['fledgling', 'Fledgling'],
  ['young', 'Young'],
  ['adult', 'Adult'],
  ['crowned', 'Crowned'],
]

export function CompanionGalleryPage({ onBack }) {
  return (
    <div className="page-grid">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          Back
        </button>
        <p className="eyebrow">Sandbox · dev preview 🧪</p>
        <h2>Companion species gallery</h2>
        <p className="fine-print">
          All 6 companions across the 5 growth stages (chick → crowned). Sandbox-only — never shown to Pooks.
        </p>
      </section>

      {TWEETY_COMPANIONS.map((c) => (
        <section className="soft-card full-span companion-gallery-row" key={c.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{c.species}</p>
              <h3>{c.name}</h3>
            </div>
          </div>
          <div className="companion-gallery-stages">
            {GALLERY_STAGES.map(([lvl, label]) => (
              <figure className="companion-gallery-cell" key={lvl}>
                <TweetyBird companion={c.id} level={lvl} size={84} mood="happy" />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ---- Egg / baby / aviary SVGs ----------------------------------------------
function EggSVG({ mystery = false }) {
  const shell = mystery ? '#F2D06A' : '#FBEFD6'
  const speck = mystery ? '#E0A64F' : '#E8CFA6'
  return (
    <span className={`egg-svg${mystery ? ' mystery' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g className="egg-shake">
          <ellipse cx="50" cy="56" rx="28" ry="34" fill={shell} />
          <ellipse cx="42" cy="46" rx="8" ry="11" fill="#fff" opacity="0.5" />
          <circle cx="40" cy="64" r="3" fill={speck} />
          <circle cx="58" cy="54" r="3.5" fill={speck} />
          <circle cx="54" cy="72" r="2.6" fill={speck} />
        </g>
      </svg>
    </span>
  )
}

function BabySVG({ stage }) {
  const rx = stage === 'adult' ? 26 : stage === 'fledgling' ? 22 : 18
  const ry = rx + 1
  return (
    <span className="baby-svg" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g className="tweety-bob">
          {stage !== 'hatchling' && (
            <>
              <ellipse cx={50 - rx + 2} cy="58" rx="7" ry={stage === 'adult' ? 12 : 9} fill="#EBB94E" />
              <ellipse cx={50 + rx - 2} cy="58" rx="7" ry={stage === 'adult' ? 12 : 9} fill="#EBB94E" />
            </>
          )}
          <ellipse cx="50" cy="58" rx={rx} ry={ry} fill="#F6CE73" />
          <ellipse cx="50" cy="64" rx={rx * 0.6} ry={ry * 0.55} fill="#FBE6A8" />
          {stage === 'hatchling' && (
            <path d="M38 40 q12 -10 24 0 q-4 -3 -12 -3 q-8 0 -12 3 Z" fill="#FBEFD6" />
          )}
          <circle cx="44" cy="52" r="3" fill="#3E2F22" />
          <circle cx="56" cy="52" r="3" fill="#3E2F22" />
          <path d="M47 58 l6 0 l-3 5 z" fill="#F2A24E" />
          <path d="M46 66 q4 3 8 0" stroke="#C8742E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  )
}

// Cheap slugify matching the one saBirdLibrary.js uses to build each entry's
// `id` (and so BIRD_COLOUR_MAP's keys) — same duplicated helper Garden.jsx
// keeps for the same reason (not exported from there).
function aviarySlugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// An aviary bird (rescued via a "she escaped, then flew back" world event)
// now renders as her real species — the same illustrated GardenBird art
// every other bird in the app uses — instead of one generic pink blob shape
// standing in for all of them.
function AviaryBird({ idle = 'hop', species }) {
  const entry = species && BIRD_COLOUR_MAP[aviarySlugify(species)]
  const template = entry?.template || 'songbird-small'
  const zones = entry?.zones || EGG_PICKER_GENERIC_ZONES
  return (
    <span className={`aviary-bird idle-${idle}`} aria-hidden="true">
      <GardenBird template={template} zones={zones} size={54} ground={false} />
    </span>
  )
}

// ---- Family card (egg or baby) ---------------------------------------------
export function TweetyFamilyCard({ tweety, onCareBaby, onRelease, onKeep }) {
  const egg = tweety?.egg
  const baby = tweety?.baby
  if (!egg && !baby) return null

  if (egg) {
    const progress = Math.min(3, egg.careDays || 0)
    return (
      <section className={`soft-card full-span family-card egg-card${egg.kind === 'mystery' ? ' mystery' : ''}`}>
        <p className="eyebrow">{egg.kind === 'mystery' ? 'A mystery egg from Marnich 💛' : "Tweety's egg 🥚"}</p>
        <div className="egg-stage">
          <EggSVG mystery={egg.kind === 'mystery'} />
        </div>
        <h3>
          {egg.kind === 'mystery'
            ? 'What could be inside? Keep caring for Tweety while it hatches ✨'
            : 'Tweety laid an egg! Keep caring for her while it hatches 🥚✨'}
        </h3>
        <p className="fine-print">Hatches after 3 days of full care — {progress}/3 so far.</p>
        <div className="progress-track">
          <span style={{ width: `${(progress / 3) * 100}%` }}></span>
        </div>
      </section>
    )
  }

  const stage = babyStage(baby)
  const care = babyCareToday(baby)
  return (
    <section className="soft-card full-span family-card baby-card">
      <p className="eyebrow">Baby {baby.species} · {babyStageLabel(stage)}</p>
      <div className="egg-stage">
        <BabySVG stage={stage} />
      </div>
      {stage === 'adult' ? (
        <>
          <h3>Your little one is all grown up! Time to decide… 🐦</h3>
          <div className="button-row">
            <button className="primary-btn" type="button" onClick={onRelease}>
              Release into the wild 🌿
            </button>
            <button className="secondary-btn" type="button" onClick={onKeep}>
              Keep in my aviary 🏠
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>Look after your baby bird every day 💛</h3>
          <p className="fine-print">Day {daysSince(baby.hatchedAt)} of growing up.</p>
          <div className="tweety-care-row">
            <button
              className={`tweety-care-btn${care.fed ? ' done' : ''}`}
              type="button"
              onClick={() => onCareBaby('feed')}
              disabled={care.fed}
            >
              <span className="tweety-care-icon">{care.fed ? '🍽️' : '🥣'}</span>
              <span>{care.fed ? 'Fed ✓' : 'Feed'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.watered ? ' done' : ''}`}
              type="button"
              onClick={() => onCareBaby('water')}
              disabled={care.watered}
            >
              <span className="tweety-care-icon">{care.watered ? '💧' : '🫗'}</span>
              <span>{care.watered ? 'Watered ✓' : 'Water'}</span>
            </button>
          </div>
          <button className="text-btn" type="button" onClick={onRelease}>
            Release early 🌿
          </button>
        </>
      )}
    </section>
  )
}

// ---- Aviary card -----------------------------------------------------------
export function AviaryCard({ tweety, aviaryTier = 'basic', flockDance = false, onReleaseAviary }) {
  const aviary = tweety?.aviary || []
  if (aviary.length === 0) return null
  const full = aviary.length >= AVIARY_MAX
  const dailyCoins = aviary.length * 3 + (full ? 20 : 0)
  return (
    <section className={`soft-card full-span aviary-card aviary-${aviaryTier}${flockDance ? ' flock-dance' : ''}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your Aviary 🏠</p>
          <h3>{aviary.length} / {AVIARY_MAX} birds · +{dailyCoins} coins a day</h3>
        </div>
        {full && <span className="status-pill paid">Full flock bonus! ✨</span>}
      </div>
      <div className="aviary-stage">
        {aviary.map((bird) => (
          <div className="aviary-slot" key={bird.id}>
            <AviaryBird idle={bird.idle} species={bird.species} />
            <small>{bird.species}</small>
            <button
              className="text-btn"
              type="button"
              onClick={() => onReleaseAviary(bird.id)}
            >
              Release 🌿
            </button>
          </div>
        ))}
      </div>
      {full && <p className="fine-print">Aviary full — release a bird to make room for a new one.</p>}
    </section>
  )
}
