// The Greenhouse — a cosy indoor space, separate from the outdoor Garden,
// where Pooks grows potted plants from her identified species. Step 1 is the
// scene + page shell only: a simple glass structure with a wooden bench and
// four empty pot slots. Planting/watering/shop land in a later pass once the
// visual is approved.

// Four fixed slots along the bench, evenly spaced. Positions are scene units
// (viewBox 0 0 320 200), matching where GreenhouseScene draws each pot.
const POT_SLOTS = [
  { id: 0, x: 88 },
  { id: 1, x: 140 },
  { id: 2, x: 192 },
  { id: 3, x: 244 },
]

function GreenhouseScene() {
  return (
    <svg
      className="greenhouse-svg"
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A cosy glass greenhouse with a wooden potting bench"
    >
      <defs>
        {/* Warm interior wash behind the glass — the "sun through misty glass" glow. */}
        <linearGradient id="ghInteriorG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2d6" />
          <stop offset="1" stopColor="#f7e6c4" />
        </linearGradient>
        {/* Glass pane fill — a cool, slightly misty blue-white. */}
        <linearGradient id="ghPaneG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfeef4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#cfe6ee" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="ghSunGlow" cx="0.5" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ghBenchGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffbf57" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffbf57" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ghWoodG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a51" />
          <stop offset="1" stopColor="#a9713f" />
        </linearGradient>
      </defs>

      {/* interior wash fills the whole scene before the glass structure sits on top */}
      <rect x="0" y="0" width="320" height="200" fill="url(#ghInteriorG)" />
      <ellipse cx="160" cy="8" rx="170" ry="90" fill="url(#ghSunGlow)" />

      {/* ---- pitched glass roof ---- */}
      <path d="M8 62 L160 14 L312 62 L312 70 L160 24 L8 70 Z" fill="url(#ghWoodG)" />
      <path d="M14 66 L160 22 L306 66 L306 70 L160 27 L14 70 Z" fill="url(#ghPaneG)" />
      {/* roof glazing bars */}
      <line x1="160" y1="22" x2="160" y2="70" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="87" y1="46" x2="87" y2="70" stroke="#8a5f33" strokeWidth="2" />
      <line x1="233" y1="46" x2="233" y2="70" stroke="#8a5f33" strokeWidth="2" />
      {/* mist patches on the roof glass */}
      <ellipse cx="110" cy="48" rx="30" ry="10" fill="#ffffff" opacity="0.28" />
      <ellipse cx="220" cy="52" rx="34" ry="11" fill="#ffffff" opacity="0.22" />

      {/* ---- side glass walls ---- */}
      <rect x="8" y="70" width="34" height="80" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="25" y1="70" x2="25" y2="150" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="8" y1="108" x2="42" y2="108" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="24" cy="96" rx="14" ry="18" fill="#ffffff" opacity="0.25" />

      <rect x="278" y="70" width="34" height="80" fill="url(#ghPaneG)" stroke="#8a5f33" strokeWidth="2.5" />
      <line x1="295" y1="70" x2="295" y2="150" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <line x1="278" y1="108" x2="312" y2="108" stroke="#8a5f33" strokeWidth="1.5" opacity="0.6" />
      <ellipse cx="296" cy="120" rx="14" ry="18" fill="#ffffff" opacity="0.22" />

      {/* soft hint of greenery blurred just outside the glass */}
      <ellipse cx="24" cy="130" rx="10" ry="14" fill="#7ba36e" opacity="0.18" />
      <ellipse cx="298" cy="90" rx="11" ry="15" fill="#7ba36e" opacity="0.16" />

      {/* ---- back wall between the glass walls ---- */}
      <rect x="42" y="70" width="236" height="80" fill="#f3e2c4" />
      <rect x="42" y="70" width="236" height="80" fill="url(#ghInteriorG)" opacity="0.35" />
      {/* tongue-and-groove panelling lines */}
      {[62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262].map((x) => (
        <line key={x} x1={x} y1="70" x2={x} y2="150" stroke="#00000010" strokeWidth="1" />
      ))}

      {/* warm hanging light for cosiness */}
      <line x1="160" y1="24" x2="160" y2="58" stroke="#8a5f33" strokeWidth="1.5" />
      <ellipse cx="160" cy="63" rx="9" ry="7" fill="#ffe9b8" stroke="#c9a758" strokeWidth="1.5" />
      <circle cx="160" cy="66" r="16" fill="#ffd98a" opacity="0.35" />

      {/* floor */}
      <rect x="0" y="150" width="320" height="50" fill="#c9915f" />
      <rect x="0" y="150" width="320" height="6" fill="#00000018" />
      {[168, 180, 192].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#00000012" strokeWidth="1" />
      ))}

      {/* ---- wooden potting bench along the back wall ---- */}
      <ellipse cx="160" cy="152" rx="150" ry="10" fill="url(#ghBenchGlow)" />
      <rect x="34" y="118" width="252" height="14" rx="3" fill="url(#ghWoodG)" stroke="#7c4f28" strokeWidth="2" />
      <rect x="34" y="132" width="252" height="7" fill="#7c4f28" />
      {/* bench legs */}
      <rect x="44" y="139" width="10" height="30" fill="#7c4f28" />
      <rect x="266" y="139" width="10" height="30" fill="#7c4f28" />
      <rect x="118" y="139" width="8" height="30" fill="#8a5f33" opacity="0.9" />
      <rect x="194" y="139" width="8" height="30" fill="#8a5f33" opacity="0.9" />
      {/* wood grain */}
      <line x1="40" y1="123" x2="280" y2="123" stroke="#7c4f28" strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="128" x2="280" y2="128" stroke="#7c4f28" strokeWidth="1" opacity="0.3" />

      {/* ---- 4 empty pot slots on the bench top ---- */}
      {POT_SLOTS.map((slot) => (
        <g key={slot.id}>
          {/* faint dashed ring marking the slot itself, empty of a pot */}
          <ellipse
            cx={slot.x}
            cy="116"
            rx="17"
            ry="5"
            fill="none"
            stroke="#7c4f28"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          {/* the default terracotta pot itself, empty (no plant yet) */}
          <path
            d={`M${slot.x - 14} 98 L${slot.x + 14} 98 L${slot.x + 11} 116 L${slot.x - 11} 116 Z`}
            fill="#c96f4a"
            stroke="#a1512f"
            strokeWidth="1.6"
          />
          <ellipse cx={slot.x} cy="98" rx="14" ry="4" fill="#e0855c" stroke="#a1512f" strokeWidth="1.6" />
          <ellipse cx={slot.x} cy="98" rx="10.5" ry="2.6" fill="#7a3c22" opacity="0.6" />
          <path d={`M${slot.x - 9} 101 L${slot.x - 6} 113`} stroke="#e8a37c" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

export function GreenhousePage({ onBack }) {
  return (
    <div className="page-grid greenhouse-page">
      <section className="soft-card full-span greenhouse-stage">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">My Greenhouse 🌿</p>
        <h2>A warm little glasshouse of her own</h2>
        <div className="greenhouse-scene">
          <GreenhouseScene />
        </div>
        <p className="fine-print">4 empty pots, ready for her first seeds 🌱</p>
      </section>
    </div>
  )
}
