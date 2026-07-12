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
  nextCareWindow,
  windowsDoneToday,
  tweetyGrowth,
  tweetyGrowthProgress,
  MOOD_FACE,
} from './tweetyData'

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
    bill: { type: f.bill || 'short', color: pal.beak },
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
  // tails: robin rufous (stages), sunbird streamers, others a short wing-coloured tail
  if (f.tail === 'rufous') {
    vis.tail = { kind: t < 0.2 ? null : t < 0.5 ? 'rufousShort' : t < 1 ? 'rufousMed' : 'rufousFull', color: f.tailColor }
  } else if (f.streamers) {
    vis.tail = { kind: t >= 0.7 ? 'streamers' : null, color: f.streamers }
  } else if (f.tail === 'short') {
    vis.tail = { kind: t >= 0.6 ? 'short' : null, color: pal.wing }
  }
  return vis
}

export function TweetyBird({ level = 'chick', mood = 'happy', dancing = false, size = 120, companion = null, worn = null, scale = null }) {
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
      className={`tweety-bird${dancing ? ' tweety-dance' : ''}${sad ? ' tweety-sad' : ''}`}
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

// ---- Home card (simplified: feed/water/play, 5 moods, real-day growth) -----
// The 5 growth stage keys map straight onto TweetyBird's stage shapes.
const GROWTH_TO_LEVEL = {
  chick: 'chick',
  fledgling: 'fledgling',
  young: 'young',
  adult: 'adult',
  crowned: 'crowned',
}

export function TweetyHomeCard({
  tweety,
  dancing = false,
  nestTier = 'basic',
  rainbow = false,
  loveLetter = '',
  gifts = [],
  onFeed,
  onWater,
  onPlay,
  onOpenStats,
  onReleaseToGarden,
}) {
  const name = tweety?.name || 'Tweety'
  const species = companionSpecies(tweety?.companion)
  const care = tweetyCareState(tweety)
  const win = care.window
  const next = nextCareWindow()
  const windowsDone = windowsDoneToday(tweety)
  const mood = tweetySimpleMood(tweety)
  const face = MOOD_FACE[mood] || MOOD_FACE.content
  const growth = tweetyGrowth(tweety)
  const progress = tweetyGrowthProgress(tweety)
  const birdLevel = GROWTH_TO_LEVEL[growth.key] || 'chick'
  const worn = tweety?.wardrobe?.worn || null

  return (
    <section className={`soft-card full-span tweety-card tweety-mood-${mood}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{name}&apos;s Home 🪺</p>
          <h3>{face.emoji} {name} {face.line}</h3>
          {species && <p className="tweety-species-line">{name} ({species})</p>}
        </div>
        <button className="text-btn" type="button" onClick={onOpenStats}>
          Stats →
        </button>
      </div>

      <div className={`tweety-stage nest-${nestTier}`}>
        {mood === 'sad' && <div className="tweety-raincloud" aria-hidden="true">🌧️</div>}
        {nestTier === 'luxury' && <div className="nest-decor nest-lights" aria-hidden="true">✨🏮✨</div>}
        {nestTier === 'treehouse' && <div className="nest-decor nest-tree" aria-hidden="true">🌳</div>}
        <div className={`tweety-nest${rainbow ? ' tweety-rainbow' : ''}`}>
          <TweetyBird level={birdLevel} mood={mood} dancing={dancing} size={132} companion={tweety?.companion} worn={worn} />
          {loveLetter && <span className="tweety-letter" title={loveLetter} aria-hidden="true">💌</span>}
          <div className={`tweety-nest-base nest-base-${nestTier}`} aria-hidden="true" />
        </div>
        <span className="tweety-level-pill">{growth.label}</span>
        <span className="tweety-streak-pill">{face.label} {face.emoji}</span>
      </div>

      {/* Gifts bought for Tweety in the Tweety Store — shown right under her nest
          so a purchase is immediately visible near her. */}
      {gifts.length > 0 && (
        <div className="tweety-gifts">
          <span className="tweety-gifts-label">🎁 {name}&apos;s gifts</span>
          <div className="tweety-gifts-row">
            {gifts.map((g) => (
              <span className="tweety-gift-chip" key={g.id} title={g.hint || g.name}>
                <span aria-hidden="true">{g.emoji}</span> {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Real-day growth tracker */}
      <div className="tweety-growth">
        <div className="tweety-growth-top">
          <span className="tweety-growth-caption">{progress.caption}</span>
          <span className="tweety-growth-stage">{growth.short}</span>
        </div>
        <div className="tweety-growth-bar" aria-hidden="true">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {loveLetter && <p className="tweety-letter-text">💌 {loveLetter}</p>}

      {win ? (
        <>
          <div className="tweety-care-row">
            <button
              className={`tweety-care-btn${care.fed ? ' done' : ''}`}
              type="button"
              onClick={onFeed}
              disabled={care.fed}
            >
              <span className="tweety-care-icon" aria-hidden="true">🌾</span>
              <span>{care.fed ? 'Fed ✓' : 'Feed'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.watered ? ' done' : ''}`}
              type="button"
              onClick={onWater}
              disabled={care.watered}
            >
              <span className="tweety-care-icon" aria-hidden="true">💧</span>
              <span>{care.watered ? 'Watered ✓' : 'Water'}</span>
            </button>
            <button
              className={`tweety-care-btn${care.played ? ' done' : ''}`}
              type="button"
              onClick={onPlay}
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
      <div className="first-egg-stage">
        <ColorEgg color={egg.color} size={140} glow />
      </div>
      <div className="hatch-progress">
        <span style={{ width: `${(warms / FIRST_EGG_WARMS) * 100}%` }}></span>
      </div>
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
      <div className="first-egg-stage">
        <ColorEgg color={mysteryEgg.color} size={ready ? 96 : 140} glow={!ready} />
      </div>
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
  const species = companionSpecies(tweety?.companion)
  return (
    <div className="page-grid">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          Back
        </button>
        <div className="tweety-stats-hero">
          <TweetyBird level={GROWTH_TO_LEVEL[growth.key] || 'chick'} mood={mood} size={120} companion={tweety?.companion} />
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
        </div>
      </section>
    </div>
  )
}

// ---- First-login companion chooser -----------------------------------------
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

function AviaryBird({ idle = 'hop' }) {
  return (
    <span className={`aviary-bird idle-${idle}`} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g>
          <ellipse cx="50" cy="58" rx="22" ry="23" fill="#F4A09A" />
          <ellipse cx="48" cy="64" rx="13" ry="11" fill="#FBD9D2" />
          <ellipse cx="38" cy="56" rx="8" ry="11" fill="#DA8680" />
          <circle cx="58" cy="50" r="3" fill="#3E2F22" />
          <path d="M70 52 l8 3 l-8 3 z" fill="#F2A24E" />
        </g>
      </svg>
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
            <AviaryBird idle={bird.idle} />
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
