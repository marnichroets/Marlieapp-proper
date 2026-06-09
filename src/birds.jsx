// Cute animated SVG birds: a reusable base bird plus 52 weekly characters,
// each with its own outfit/prop, colour and name. Also the seasonal ambient
// particle layer. No external assets.

import { getSeasonInfo } from './seasons'
import { shade, getWeeklyBird } from './birdData'

// ---- small reusable shapes -------------------------------------------------
function Flower({ x, y, r = 5, petal = '#F7A8C0', center = '#F6CE73' }) {
  const pts = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    return [x + Math.cos(a) * r, y + Math.sin(a) * r]
  })
  return (
    <g>
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={r * 0.62} fill={petal} />
      ))}
      <circle cx={x} cy={y} r={r * 0.55} fill={center} />
    </g>
  )
}

function Snowflake({ x, y, s = 4, color = '#ffffff' }) {
  return (
    <g stroke={color} strokeWidth="1.3" strokeLinecap="round">
      <line x1={x - s} y1={y} x2={x + s} y2={y} />
      <line x1={x} y1={y - s} x2={x} y2={y + s} />
      <line x1={x - s * 0.7} y1={y - s * 0.7} x2={x + s * 0.7} y2={y + s * 0.7} />
      <line x1={x - s * 0.7} y1={y + s * 0.7} x2={x + s * 0.7} y2={y - s * 0.7} />
    </g>
  )
}

function Star({ x, y, s = 6, color = '#F6CE73' }) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 === 0 ? s : s * 0.45
    pts.push(`${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`)
  }
  return <polygon points={pts.join(' ')} fill={color} />
}

// ---- accessory renderers (drawn in front of the bird) ----------------------
function renderAccessory(key) {
  switch (key) {
    case 'party-hat':
      return (
        <g className="bird-accessory">
          <path d="M40 27 L54 2 L67 27 Z" fill="#7AC4D6" />
          <path d="M47 14 L60 9 M44 21 L66 18" stroke="#F2A6C0" strokeWidth="2.5" />
          <circle cx="54" cy="2" r="3.4" fill="#F6CE73" />
        </g>
      )
    case 'santa-hat':
      return (
        <g className="bird-accessory">
          <path d="M38 28 Q44 2 72 14 Q66 22 60 27 Z" fill="#E8645A" />
          <ellipse cx="52" cy="28" rx="20" ry="5" fill="#ffffff" />
          <circle cx="73" cy="13" r="5" fill="#ffffff" />
        </g>
      )
    case 'beanie':
      return (
        <g className="bird-accessory">
          <path d="M37 26 a18 16 0 0 1 36 0 Z" fill="#7E9CD0" />
          <rect x="35" y="24" width="40" height="7" rx="3.5" fill="#5C7BB5" />
          <circle cx="55" cy="6" r="4" fill="#cfe0f5" />
        </g>
      )
    case 'winter-warm':
      return (
        <g className="bird-accessory">
          {/* beanie */}
          <path d="M37 25 a18 16 0 0 1 36 0 Z" fill="#9C6FB0" />
          <rect x="35" y="23" width="40" height="7" rx="3.5" fill="#7A4F90" />
          <circle cx="55" cy="5" r="4" fill="#E6D6F0" />
          {/* scarf */}
          <path d="M34 70 q20 12 40 1 l-2 9 q-18 9 -36 0 Z" fill="#E8645A" />
          <rect x="36" y="76" width="9" height="16" rx="3" fill="#E8645A" />
        </g>
      )
    case 'scarf':
      return (
        <g className="bird-accessory">
          <path d="M34 70 q20 12 40 1 l-2 9 q-18 9 -36 0 Z" fill="#D98A4A" />
          <rect x="64" y="76" width="9" height="17" rx="3" fill="#D98A4A" />
        </g>
      )
    case 'sun-hat':
      return (
        <g className="bird-accessory">
          <ellipse cx="54" cy="25" rx="24" ry="6.5" fill="#E9C977" />
          <ellipse cx="54" cy="18" rx="13" ry="9" fill="#F0D896" />
          <path d="M41 24 q13 5 26 0" stroke="#E08A5A" strokeWidth="3" fill="none" />
        </g>
      )
    case 'sunglasses':
      return (
        <g className="bird-accessory">
          <rect x="55" y="42" width="13" height="10" rx="4" fill="#2E2A33" />
          <rect x="70" y="42" width="11" height="9" rx="4" fill="#2E2A33" />
          <line x1="68" y1="46" x2="70" y2="46" stroke="#2E2A33" strokeWidth="2.5" />
          <line x1="55" y1="45" x2="49" y2="43" stroke="#2E2A33" strokeWidth="2.5" />
        </g>
      )
    case 'flower-crown':
      return (
        <g className="bird-accessory">
          <path d="M36 28 q18 -16 38 0" stroke="#9DB07A" strokeWidth="2" fill="none" />
          <Flower x={40} y={24} r={4.6} petal="#F7A8C0" />
          <Flower x={54} y={16} r={5} petal="#F6B6C6" center="#F4D58D" />
          <Flower x={68} y={23} r={4.6} petal="#C4A7E7" />
        </g>
      )
    case 'flowers':
      return (
        <g className="bird-accessory">
          <Flower x={16} y={70} r={5.4} petal="#F7A8C0" />
          <Flower x={86} y={74} r={5} petal="#F6CE73" center="#E8645A" />
          <Flower x={26} y={88} r={4.4} petal="#C4A7E7" />
        </g>
      )
    case 'leaves':
      return (
        <g className="bird-accessory">
          <g className="bird-leaf bird-leaf-a">
            <ellipse cx="20" cy="20" rx="6" ry="3.4" fill="#E08A4A" transform="rotate(-35 20 20)" />
          </g>
          <g className="bird-leaf bird-leaf-b">
            <ellipse cx="84" cy="30" rx="6" ry="3.4" fill="#C85A3A" transform="rotate(25 84 30)" />
          </g>
          <g className="bird-leaf bird-leaf-c">
            <ellipse cx="78" cy="84" rx="6" ry="3.4" fill="#D9A036" transform="rotate(-15 78 84)" />
          </g>
        </g>
      )
    case 'acorn':
      return (
        <g className="bird-accessory">
          <ellipse cx="84" cy="64" rx="7" ry="8.5" fill="#C98A56" />
          <path d="M76 60 q8 -7 16 0 Z" fill="#7A5230" />
          <line x1="84" y1="52" x2="84" y2="56" stroke="#7A5230" strokeWidth="1.8" />
        </g>
      )
    case 'hot-choc':
      return (
        <g className="bird-accessory">
          <rect x="80" y="58" width="15" height="14" rx="3" fill="#8C5A38" />
          <ellipse cx="87.5" cy="58" rx="7.5" ry="2.6" fill="#B07A52" />
          <circle cx="85" cy="58" r="1.6" fill="#fff" />
          <circle cx="90" cy="58" r="1.6" fill="#fff" />
          <path d="M97 64 q4 0 4 4" stroke="#8C5A38" strokeWidth="2.4" fill="none" />
          <path d="M84 52 q-2 -3 1 -6 M90 52 q2 -3 -1 -6" stroke="#cdbcae" strokeWidth="1.6" fill="none" className="bird-steam" />
        </g>
      )
    case 'umbrella':
      return (
        <g className="bird-accessory">
          <path d="M26 30 Q54 2 82 30 Z" fill="#E8645A" />
          <path d="M26 30 Q40 22 54 30 Q68 22 82 30" stroke="#fff" strokeWidth="1.6" fill="none" />
          <line x1="54" y1="30" x2="54" y2="6" stroke="#7A5230" strokeWidth="2.4" />
          <line x1="54" y1="6" x2="50" y2="4" stroke="#7A5230" strokeWidth="2.4" />
          <circle className="bird-rain" cx="34" cy="40" r="1.6" fill="#9AB7D0" />
          <circle className="bird-rain" cx="74" cy="44" r="1.6" fill="#9AB7D0" />
        </g>
      )
    case 'snow':
      return (
        <g className="bird-accessory">
          <path d="M38 24 q16 -6 32 0 q-3 -6 -16 -6 q-13 0 -16 6 Z" fill="#ffffff" opacity="0.95" />
          <Snowflake x={22} y={26} s={4} color="#cfe0f5" />
          <Snowflake x={82} y={34} s={3.4} color="#cfe0f5" />
          <Snowflake x={30} y={86} s={3.4} color="#cfe0f5" />
        </g>
      )
    case 'lights':
      return (
        <g className="bird-accessory">
          <path d="M30 22 Q54 6 78 22" stroke="#5a4a32" strokeWidth="1.4" fill="none" />
          <circle cx="34" cy="20" r="2.6" fill="#E8645A" className="bird-light bird-light-a" />
          <circle cx="46" cy="13" r="2.6" fill="#F6CE73" className="bird-light bird-light-b" />
          <circle cx="58" cy="11" r="2.6" fill="#7AC4D6" className="bird-light bird-light-c" />
          <circle cx="70" cy="15" r="2.6" fill="#A8D5BA" className="bird-light bird-light-a" />
        </g>
      )
    case 'crown':
      return (
        <g className="bird-accessory">
          <path d="M40 26 L42 12 L50 21 L54 9 L58 21 L66 12 L68 26 Z" fill="#F2C24E" stroke="#D9A036" strokeWidth="1" />
          <circle cx="54" cy="20" r="1.8" fill="#E8645A" />
          <circle cx="46" cy="22" r="1.5" fill="#7AC4D6" />
          <circle cx="62" cy="22" r="1.5" fill="#7AC4D6" />
        </g>
      )
    case 'bow':
      return (
        <g className="bird-accessory">
          <path d="M70 16 l-9 6 l9 6 Z" fill="#F2A6C0" />
          <path d="M84 16 l9 6 l-9 6 Z" fill="#F2A6C0" />
          <circle cx="77" cy="22" r="3.4" fill="#E87FA8" />
        </g>
      )
    case 'headphones':
      return (
        <g className="bird-accessory">
          <path d="M34 44 a22 22 0 0 1 44 0" stroke="#5C7BB5" strokeWidth="3.5" fill="none" />
          <rect x="30" y="42" width="9" height="14" rx="4" fill="#5C7BB5" />
          <rect x="73" y="42" width="9" height="14" rx="4" fill="#5C7BB5" />
        </g>
      )
    case 'butterfly':
      return (
        <g className="bird-accessory bird-flutter">
          <ellipse cx="83" cy="22" rx="5" ry="6.5" fill="#F2A6C0" transform="rotate(-20 83 22)" />
          <ellipse cx="91" cy="24" rx="5" ry="6.5" fill="#C4A7E7" transform="rotate(20 91 24)" />
          <line x1="87" y1="18" x2="87" y2="30" stroke="#5a4a32" strokeWidth="1.4" />
        </g>
      )
    case 'heart':
      return (
        <g className="bird-accessory bird-float-a">
          <path d="M54 12 q-5 -6 -10 -1 q-5 5 10 13 q15 -8 10 -13 q-5 -5 -10 1 Z" fill="#F07F9E" />
        </g>
      )
    case 'star':
      return (
        <g className="bird-accessory bird-float-a">
          <Star x={84} y={20} s={7} color="#F6CE73" />
          <Star x={24} y={26} s={4} color="#F4D58D" />
        </g>
      )
    case 'sparkles':
      return (
        <g className="bird-accessory">
          <g className="bird-sparkle bird-light-a"><Star x={22} y={24} s={4} color="#F4D58D" /></g>
          <g className="bird-sparkle bird-light-b"><Star x={86} y={30} s={5} color="#fff7df" /></g>
          <g className="bird-sparkle bird-light-c"><Star x={80} y={82} s={3.5} color="#F6CE73" /></g>
        </g>
      )
    case 'easter-egg':
      return (
        <g className="bird-accessory">
          <ellipse cx="40" cy="74" rx="22" ry="26" fill="#A8D5E2" />
          <path d="M19 70 q21 -8 42 0" stroke="#F2A6C0" strokeWidth="3" fill="none" />
          <path d="M20 80 q20 9 40 0" stroke="#F6CE73" strokeWidth="3" fill="none" />
          <circle cx="32" cy="62" r="2.4" fill="#F07F9E" />
          <circle cx="48" cy="88" r="2.4" fill="#A8D5BA" />
        </g>
      )
    default:
      return null
  }
}

// Some props sit BEHIND the bird (drawn first).
function renderBehind(key) {
  if (key === 'easter-egg') return null
  return null
}

// ---- the base bird ---------------------------------------------------------
export function CuteBird({
  size = 48,
  className = '',
  accessory = null,
  bodyColor = '#F4A09A',
  animate = true,
  title = '',
}) {
  const wing = shade(bodyColor, -26)
  const belly = shade(bodyColor, 42)
  const bobClass = animate ? 'cute-bird-bob' : ''

  return (
    <span
      className={`cute-bird ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
      title={title || undefined}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className={bobClass}>
          {renderBehind(accessory)}
          {/* tail (wags) */}
          <g className={animate ? 'cute-bird-tail' : ''}>
            <ellipse cx="20" cy="54" rx="11" ry="6.5" fill={wing} transform="rotate(-18 20 54)" />
          </g>
          {/* little top tuft */}
          <ellipse cx="54" cy="24" rx="3.2" ry="7.5" fill={wing} transform="rotate(-16 54 24)" />
          {/* feet */}
          <path d="M45 84 v7 M41 91 h8 M42 88 h6" stroke="#E8915E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M59 84 v7 M55 91 h8 M56 88 h6" stroke="#E8915E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          {/* body */}
          <ellipse cx="54" cy="56" rx="30" ry="31" fill={bodyColor} />
          <ellipse cx="52" cy="65" rx="19" ry="16" fill={belly} />
          {/* wing (flaps) */}
          <g className={animate ? 'cute-bird-wing' : ''}>
            <ellipse cx="42" cy="55" rx="11.5" ry="16" fill={wing} />
          </g>
          {/* cheek */}
          <circle cx="67" cy="59" r="5.5" fill="#F7A8B8" opacity="0.7" />
          {/* eye (blinks) */}
          <g className={animate ? 'cute-bird-eye' : ''} style={{ transformOrigin: '63px 47px' }}>
            <circle cx="63" cy="47" r="4.6" fill="#3E2F22" />
            <circle cx="64.6" cy="45.4" r="1.5" fill="#ffffff" />
          </g>
          {/* beak */}
          <path d="M80 50 l10 4.2 l-10 4.2 z" fill="#F2A24E" />
          {accessory ? renderAccessory(accessory) : null}
        </g>
      </svg>
    </span>
  )
}

// ---- weekly character ------------------------------------------------------
export function WeeklyBird({ size = 48, className = '', date = new Date() }) {
  const { name, accessory, bodyColor } = getWeeklyBird(date)
  return (
    <CuteBird
      size={size}
      className={className}
      accessory={accessory}
      bodyColor={bodyColor}
      title={`This week: ${name}`}
    />
  )
}

// ---- seasonal ambient particles --------------------------------------------
export function SeasonalAmbient({ date = new Date() }) {
  const season = getSeasonInfo(date)
  const particles = season.particles
  // A fixed set of drifting particles, cycling the season's emoji set.
  const items = Array.from({ length: 9 }, (_, i) => particles[i % particles.length])
  return (
    <div className={`seasonal-ambient season-particles-${season.key}`} aria-hidden="true">
      {items.map((emoji, i) => (
        <span key={i} className={`season-particle sp-${i}`}>
          {emoji}
        </span>
      ))}
    </div>
  )
}
