// Species-accurate illustrated SVG plant bodies for the Bird Garden.
//
// Same idea as birdTemplates.jsx: a species doesn't get its own hand-drawn
// illustration, it gets a template (by rough growth-habit shape) plus a
// colour map (see plantColourMap.js) that fills the same zones. Swap the
// zones and the same template reads as a completely different species.
//
// Zone shape (used by every template + PLANT_COLOUR_MAP):
//   { stem, leafMain, leafSecondary, petal, center, soil } — all CSS colour
//   strings. `leafMain` is the foreground/dominant foliage, `leafSecondary`
//   the background/smaller foliage (a shade apart, so the plant reads as
//   layered instead of flat) — not "primary vs. secondary species", just
//   front-layer vs. back-layer of the same plant. `petal` is open flowers,
//   `center` is unopened buds/flower centres, `soil` is the small base mound
//   every template sits in (matches the existing PlantArt ground ellipses).
//
// Variation shape (see PLANT_COLOUR_MAP — every entry also carries a
// `variation` object): without it, two species sharing a template would only
// differ by colour. These seven shape modifiers are what make an Aloe ferox
// (many thick upright leaves, tall flower spike) read as visibly different
// from an Aloe vera-like species (fewer, broader, more spreading leaves)
// even though both use the 'aloe' template — every template below reads a
// best-effort subset of these (not all seven apply to every growth habit,
// e.g. grass tufts have no "stem" to show/hide):
//   leafCount   — how many leaves/fronds/blades/stems' worth of foliage
//   leafAngle   — spread angle (or, for a couple of templates, a spread
//                 multiplier) of the foliage: tight rosette vs wide spread
//   leafWidth   — multiplier on individual leaf/blade/frond width
//   height      — multiplier stretching the whole plant up from the soil
//   flowerCount — 0 disables blooms outright; otherwise how many
//                 flowers/heads/florets, which also reshapes the bloom
//                 (e.g. bulb-flower: 1 = a single showy trumpet, 3+ = a
//                 many-floret umbel; protea: 1 = a single big head, 3+ =
//                 smaller heads on side branches)
//   flowerSize  — multiplier on individual flower/head size
//   hasStem     — whether a visible woody stem/trunk shows between the soil
//                 and the foliage (tree-form succulents, bare-stemmed
//                 proteas, etc.)
//
// Portrait viewBox (400x520), unlike the birds' landscape one — plants read
// taller than wide. `size` scales the same way (drives width; height follows
// the aspect ratio), meant to be dropped into a <foreignObject> exactly like
// GardenBird.

const INK = '#4d4030' // same warm-charcoal ink family as birdTemplates.jsx

function ZoneStyle({ zones }) {
  return {
    '--z-stem': zones.stem,
    '--z-leaf-main': zones.leafMain,
    '--z-leaf-secondary': zones.leafSecondary,
    '--z-petal': zones.petal,
    '--z-center': zones.center,
    '--z-soil': zones.soil,
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// A tapered, gently-bowed blade from (baseX, baseY) pointing at angleDeg
// (0 = straight up, positive = clockwise) for `length`, `width` wide at the
// base — the shared leaf shape every rosette/fan-structured template (aloe,
// succulent, grass-tuft) builds from, so leafCount/leafAngle/leafWidth have
// one real implementation to vary instead of a fixed hand-drawn path each.
function bladePath(baseX, baseY, angleDeg, length, width) {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const px = Math.cos(rad)
  const py = Math.sin(rad)
  const tipX = baseX + dx * length
  const tipY = baseY + dy * length
  const midX = baseX + dx * length * 0.55
  const midY = baseY + dy * length * 0.55
  const bow = length * 0.1
  return (
    `M${baseX - px * width} ${baseY - py * width} ` +
    `Q${midX - px * bow} ${midY - py * bow} ${tipX} ${tipY} ` +
    `Q${midX + px * bow * 0.4} ${midY + py * bow * 0.4} ${baseX + px * width} ${baseY + py * width} Z`
  )
}

// Wraps children in a Y-only scale anchored at `anchorY` (the soil line), so
// variation.height stretches a plant up from the ground instead of from the
// SVG's own (0,0) origin.
function HeightGroup({ height = 1, anchorY, children }) {
  if (height === 1) return <>{children}</>
  return <g transform={`translate(0 ${anchorY}) scale(1 ${height}) translate(0 ${-anchorY})`}>{children}</g>
}

// Splits a rosette/fan of leaves (each carrying a `t` in -0.5..0.5, distance
// from centre) into front (main) and back (secondary) layers by rank rather
// than a fixed |t| threshold — a fixed threshold can leave the main layer
// empty when leafCount is very low (e.g. 2 leaves both landing past the
// cutoff), which used to render as a barely-visible plant. Ranking guarantees
// at least half the leaves — and always at least one — are in front.
function splitByCenter(items) {
  const mainCount = Math.max(1, Math.ceil(items.length / 2))
  const mainSet = new Set([...items].sort((a, b) => Math.abs(a.t) - Math.abs(b.t)).slice(0, mainCount))
  return { main: items.filter((it) => mainSet.has(it)), secondary: items.filter((it) => !mainSet.has(it)) }
}

// ---- 1. aloe — rosette of thick pointed leaves, central flower spike when
// blooming (Aloe ferox, Aloe arborescens, Aloe vera, and other rosette aloes)
export function Aloe({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 7, leafAngle = 95, leafWidth = 1, height = 1,
    flowerCount = 5, flowerSize = 1, hasStem = false,
  } = variation
  const soilY = 486
  const stemH = hasStem ? 46 : 0
  const rosetteY = soilY - 24 - stemH
  const n = clamp(Math.round(leafCount), 3, 16)
  const rawLeaves = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5
    const angle = t * leafAngle
    const outer = Math.abs(t) > 0.28
    const len = (outer ? 95 : 145) * (1 - Math.abs(t) * 0.25)
    const w = (outer ? 8 : 11) * leafWidth
    return { angle, len, w, t }
  })
  const { main: mainLeaves, secondary: secondaryLeaves } = splitByCenter(rawLeaves)
  const soilRx = clamp(58 + n * 1.6 + (leafWidth - 1) * 20, 50, 100)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx={soilRx} ry="16" fill="var(--z-soil)" opacity="0.9" />}
      <HeightGroup height={height} anchorY={soilY}>
        {hasStem && (
          <rect x={200 - 9 * leafWidth} y={rosetteY + 2} width={18 * leafWidth} height={stemH + 22} rx={7 * leafWidth} fill="var(--z-stem)" stroke={INK} strokeWidth="2.5" />
        )}
        <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
          {secondaryLeaves.map((l, i) => <path key={i} d={bladePath(200, rosetteY, l.angle, l.len, l.w)} />)}
        </g>
        <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
          {mainLeaves.map((l, i) => <path key={i} d={bladePath(200, rosetteY, l.angle, l.len, l.w)} />)}
        </g>
        {flowering && flowerCount > 0 && (
          <>
            <path d={`M204 ${rosetteY - 90} C208 ${rosetteY - 160} 212 ${rosetteY - 250} 216 ${rosetteY - 310}`} stroke="var(--z-stem)" strokeWidth="7" strokeLinecap="round" fill="none" />
            <g fill="var(--z-petal)" stroke={INK} strokeWidth="1.5">
              {Array.from({ length: clamp(Math.round(flowerCount), 1, 9) }).map((_, i) => {
                const cnt = clamp(Math.round(flowerCount), 1, 9)
                const fy = rosetteY - 100 - i * (200 / cnt)
                const side = i % 2 ? 1 : -1
                const r = 6 * flowerSize
                const fx = 210 + side * 24
                return <ellipse key={i} cx={fx} cy={fy} rx={r} ry={r * 2} transform={`rotate(${side * 25} ${fx} ${fy})`} />
              })}
            </g>
          </>
        )}
      </HeightGroup>
    </svg>
  )
}

// ---- 2. protea — large distinctive flower head with layered petals, sturdy
// stem, broad leaves (King Protea, Sugarbush, and other bract-flowered proteas)
export function Protea({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 4, leafAngle = 38, leafWidth = 1, height = 1,
    flowerCount = 1, flowerSize = 1, hasStem = true,
  } = variation
  const soilY = 486
  const stemTopY = soilY - 260 * height
  const leafRangeStart = hasStem ? soilY - 140 * height : soilY - 30
  const n = clamp(Math.round(leafCount), 2, 8)
  const leaves = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1 || 1)
    const y = leafRangeStart - t * (leafRangeStart - stemTopY - 10)
    const side = i % 2 ? 1 : -1
    return { y, side }
  })
  const cnt = clamp(Math.round(flowerCount), 1, 4)
  const heads = Array.from({ length: cnt }, (_, i) => {
    if (i === 0) return { x: 200, y: stemTopY, r: 1 }
    const side = i % 2 ? 1 : -1
    const along = 0.35 + (i - 1) * 0.18
    return { x: 200 + side * (34 + i * 6), y: stemTopY + along * (soilY - stemTopY) * 0.55, r: 0.62 }
  })
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="60" ry="15" fill="var(--z-soil)" opacity="0.9" />}
      <path d={`M198 ${soilY - 6} C197 ${soilY - 90} 198 ${soilY - 190} 200 ${stemTopY + 70}`} stroke="var(--z-stem)" strokeWidth="10" strokeLinecap="round" fill="none" />
      {heads.slice(1).map((h, i) => (
        <path key={i} d={`M200 ${h.y + 30} L${h.x} ${h.y + 20}`} stroke="var(--z-stem)" strokeWidth="6" strokeLinecap="round" fill="none" />
      ))}
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {leaves.filter((_, i) => i % 2 === 0).map((l, i) => (
          <ellipse key={i} cx={200 - l.side * 70} cy={l.y} rx={34 * leafWidth} ry={13 * leafWidth} transform={`rotate(${-l.side * leafAngle} ${200 - l.side * 70} ${l.y})`} />
        ))}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        {leaves.map((l, i) => (
          <ellipse key={i} cx={200 + l.side * 68} cy={l.y} rx={38 * leafWidth} ry={14 * leafWidth} transform={`rotate(${l.side * leafAngle} ${200 + l.side * 68} ${l.y})`} />
        ))}
      </g>
      {flowering && heads.map((h, hi) => (
        <g key={hi} transform={`translate(${h.x} ${h.y}) scale(${h.r * flowerSize})`}>
          <g fill="var(--z-petal)" stroke={INK} strokeWidth={2.5 / (h.r * flowerSize)} strokeLinejoin="round">
            {[30, 90, 150, 210, 270, 330, 0].map((a) => <path key={a} d="M-26 10 Q-22 -60 0 -95 Q22 -60 26 10 Z" transform={`rotate(${a})`} />)}
          </g>
          <g fill="var(--z-petal)" stroke={INK} strokeWidth={2 / (h.r * flowerSize)} strokeLinejoin="round" opacity="0.96">
            {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M-18 22 Q-15 -35 0 -66 Q15 -35 18 22 Z" transform={`rotate(${a})`} />)}
          </g>
          <circle cx="0" cy="6" r="24" fill="var(--z-center)" />
          <g stroke="var(--z-center)" strokeWidth={1.6 / (h.r * flowerSize)} strokeLinecap="round" opacity="0.75">
            {Array.from({ length: 14 }).map((_, i) => {
              const a = (i / 14) * 360
              return <path key={i} d="M0 6 L0 -22" transform={`rotate(${a} 0 6)`} />
            })}
          </g>
        </g>
      ))}
    </svg>
  )
}

// ---- 3. succulent — compact rosette of fleshy rounded leaves, low to ground
// (Cotyledon, Crassula, Gasteria, Haworthia, Stapelia, and other clumping succulents)
export function Succulent({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 5, leafAngle = 70, leafWidth = 1, height = 1,
    flowerCount = 2, flowerSize = 1, hasStem = false,
  } = variation
  const soilY = 490
  const stemH = hasStem ? 60 : 0
  const baseY = soilY - stemH
  const n = clamp(Math.round(leafCount), 2, 10)
  const rawLeaves = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5
    const angle = t * leafAngle
    const outer = Math.abs(t) > 0.3
    const len = (outer ? 55 : 78) * (1 - Math.abs(t) * 0.15)
    const w = (outer ? 11 : 15) * leafWidth
    return { angle, len, w, t }
  })
  const { main: mainLeaves, secondary: secondaryLeaves } = splitByCenter(rawLeaves)
  const soilRx = clamp(64 + n * 2.4 + (leafWidth - 1) * 22, 55, 105)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx={soilRx} ry="14" fill="var(--z-soil)" opacity="0.9" />}
      <HeightGroup height={height} anchorY={soilY}>
        {hasStem && <rect x="190" y={baseY} width="20" height={stemH + 4} rx="8" fill="var(--z-stem)" stroke={INK} strokeWidth="2.4" />}
        <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
          {secondaryLeaves.map((l, i) => <path key={i} d={bladePath(200, baseY, l.angle, l.len, l.w)} />)}
        </g>
        <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
          {mainLeaves.map((l, i) => <path key={i} d={bladePath(200, baseY, l.angle, l.len, l.w)} />)}
        </g>
        {flowering && flowerCount > 0 && (
          <g>
            {Array.from({ length: clamp(Math.round(flowerCount), 1, 6) }).map((_, i) => {
              const side = i % 2 ? 1 : -1
              const stalkX = 200 + side * (6 + i * 3)
              const stalkTopY = baseY - 70 - i * 8
              return (
                <g key={i}>
                  <path d={`M200 ${baseY - 30} L${stalkX} ${stalkTopY}`} stroke="var(--z-stem)" strokeWidth="2" fill="none" />
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx={stalkX} cy={stalkTopY - 6 * flowerSize} rx={3 * flowerSize} ry={7 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="1" transform={`rotate(${a} ${stalkX} ${stalkTopY - 6 * flowerSize})`} />
                  ))}
                  <circle cx={stalkX} cy={stalkTopY - 6 * flowerSize} r={2.4 * flowerSize} fill="var(--z-center)" />
                </g>
              )
            })}
          </g>
        )}
      </HeightGroup>
    </svg>
  )
}

// ---- 4. flowering-shrub — bushy shape with clusters of small flowers,
// multiple stems (Plumbago, Cape Honeysuckle, Ericas, garden daisies, and the
// generic fallback template)
export function FloweringShrub({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 4, leafAngle = 50, leafWidth = 1, height = 1,
    flowerCount = 10, flowerSize = 1, hasStem = true,
  } = variation
  const soilY = 486
  const stemTopY = soilY - 250 * height
  const stems = hasStem ? [{ x: 190, dx: -50 }, { x: 200, dx: 0 }, { x: 210, dx: 48 }] : [{ x: 200, dx: 0 }]
  const n = clamp(Math.round(leafCount), 2, 7)
  const clumps = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const ang = (t - 0.5) * leafAngle
    const rad = (ang * Math.PI) / 180
    const dist = 56 * leafWidth
    return {
      cx: 200 + Math.sin(rad) * dist,
      cy: stemTopY + 40 + (1 - Math.abs(t - 0.5) * 2) * 30,
      r: (46 + (i % 2) * 8) * leafWidth,
    }
  })
  const cnt = clamp(Math.round(flowerCount), 0, 16)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="66" ry="15" fill="var(--z-soil)" opacity="0.9" />}
      <g stroke="var(--z-stem)" strokeWidth="6" strokeLinecap="round" fill="none">
        {stems.map((s, i) => <path key={i} d={`M${s.x} ${soilY} C${s.x + s.dx * 0.6} ${(soilY + stemTopY) / 2} ${s.x + s.dx} ${stemTopY + 30} ${s.x + s.dx} ${stemTopY}`} />)}
      </g>
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {clumps.filter((_, i) => i % 2 === 0).map((c, i) => <ellipse key={i} cx={c.cx} cy={c.cy + 18} rx={c.r} ry={c.r * 0.8} />)}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        {clumps.map((c, i) => <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.78} />)}
      </g>
      {flowering && cnt > 0 && (
        <g>
          {Array.from({ length: cnt }).map((_, i) => {
            const c = clumps[i % clumps.length]
            const a = (i * 137.5) % 360
            const rr = c.r * 0.55 * ((i % 3) / 3)
            const rad = (a * Math.PI) / 180
            const px = c.cx + Math.cos(rad) * rr
            const py = c.cy + Math.sin(rad) * rr * 0.8
            return (
              <g key={i} transform={`translate(${px} ${py})`}>
                {[0, 72, 144, 216, 288].map((ang) => (
                  <ellipse key={ang} cx="0" cy={-4.5 * flowerSize} rx={4.2 * flowerSize} ry={5 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="0.7" transform={`rotate(${ang})`} />
                ))}
                <circle cx="0" cy="0" r={3 * flowerSize} fill="var(--z-center)" stroke={INK} strokeWidth="0.6" />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// ---- 5. grass-tuft — clump of long thin blades, feathery seed heads
// (Restios, Cape Thatching Reed, Bulrush, Papyrus)
export function GrassTuft({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 5, leafAngle = 55, leafWidth = 1, height = 1,
    flowerCount = 2, flowerSize = 1,
  } = variation
  const soilY = 488
  const n = clamp(Math.round(leafCount), 3, 9)
  const rawBlades = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5
    const angle = t * leafAngle
    const outer = Math.abs(t) > 0.32
    const len = (outer ? 190 : 260) * height
    const w = (outer ? 7 : 9) * leafWidth
    return { angle, len, w, t }
  })
  const { main: mainBlades, secondary: secondaryBlades } = splitByCenter(rawBlades)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="54" ry="13" fill="var(--z-soil)" opacity="0.9" />}
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
        {secondaryBlades.map((b, i) => <path key={i} d={bladePath(200, soilY, b.angle, b.len, b.w)} />)}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {mainBlades.map((b, i) => <path key={i} d={bladePath(200, soilY, b.angle, b.len, b.w)} />)}
      </g>
      {flowering && flowerCount > 0 && (
        <g>
          {Array.from({ length: clamp(Math.round(flowerCount), 1, 4) }).map((_, i) => {
            const inner = mainBlades
            const b = inner[i % inner.length] || rawBlades[0]
            const rad = (b.angle * Math.PI) / 180
            const sx = 200 + Math.sin(rad) * b.len
            const sy = soilY - Math.cos(rad) * b.len
            return (
              <g key={i}>
                <path d={`M${sx} ${soilY} Q${sx - 6} ${(soilY + sy) / 2} ${sx} ${sy}`} stroke="var(--z-stem)" strokeWidth="2" fill="none" />
                <g fill="var(--z-petal)" opacity="0.85">
                  {Array.from({ length: 9 }).map((_, j) => {
                    const a = -50 + j * 12.5
                    return <ellipse key={j} cx={sx} cy={sy - 16 * flowerSize} rx={2 * flowerSize} ry={10 * flowerSize} transform={`rotate(${a} ${sx} ${sy - 16 * flowerSize})`} />
                  })}
                </g>
                <circle cx={sx} cy={sy - 20 * flowerSize} r={2.2 * flowerSize} fill="var(--z-center)" />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// ---- 6. tree-small — visible trunk, rounded canopy of leaves, proportioned
// for garden scale (most Trees-category species: Karee, Wild Olive, Jacaranda…)
export function TreeSmall({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 3, leafAngle = 45, leafWidth = 1, height = 1,
    flowerCount = 8, flowerSize = 1, hasStem = true,
  } = variation
  const soilY = 488
  const trunkTopY = soilY - (hasStem ? 210 : 130) * height
  const canopyCy = trunkTopY - 20 * height
  const n = clamp(Math.round(leafCount), 2, 6)
  const clumps = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const ang = (t - 0.5) * leafAngle * 2
    const rad = (ang * Math.PI) / 180
    const dist = 62 * leafWidth
    return {
      cx: 200 + Math.sin(rad) * dist,
      cy: canopyCy + Math.cos(rad) * 18,
      r: (58 + (i % 2) * 10) * leafWidth,
    }
  })
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="50" ry="13" fill="var(--z-soil)" opacity="0.9" />}
      <path
        d={`M186 ${soilY - 2} C182 ${soilY - 40} 184 ${trunkTopY + 90} 192 ${trunkTopY + 20} C200 ${trunkTopY} 200 ${trunkTopY} 208 ${trunkTopY + 20} C216 ${trunkTopY + 90} 218 ${soilY - 40} 214 ${soilY - 2} Z`}
        fill="var(--z-stem)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
      />
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {clumps.filter((_, i) => i % 2 === 0).map((c, i) => <ellipse key={i} cx={c.cx} cy={c.cy + 16} rx={c.r} ry={c.r * 0.92} />)}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        {clumps.map((c, i) => <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.r * 1.05} ry={c.r * 0.95} />)}
      </g>
      {flowering && flowerCount > 0 && (
        <g>
          {Array.from({ length: clamp(Math.round(flowerCount), 0, 14) }).map((_, i) => {
            const c = clumps[i % clumps.length]
            const a = (i * 137.5) % 360
            const rad = (a * Math.PI) / 180
            const rr = c.r * 0.6 * ((i % 3) / 3)
            const px = c.cx + Math.cos(rad) * rr
            const py = c.cy + Math.sin(rad) * rr * 0.85
            return (
              <g key={i} transform={`translate(${px} ${py})`}>
                {[0, 90, 180, 270].map((ang) => (
                  <ellipse key={ang} cx="0" cy={-3.6 * flowerSize} rx={3.4 * flowerSize} ry={4 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="0.5" transform={`rotate(${ang})`} />
                ))}
                <circle cx="0" cy="0" r={2.4 * flowerSize} fill="var(--z-center)" stroke={INK} strokeWidth="0.5" />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// ---- 7. palm — tall thin trunk, fan/frond leaves at top (used for the few
// palm-and-palm-like species, e.g. the giant Wild Banana Strelitzia)
export function Palm({ zones, size = 160, variation = {}, hideSoil = false }) {
  const { leafCount = 6, leafAngle = 70, leafWidth = 1, height = 1, flowerCount = 3, flowerSize = 1 } = variation
  const soilY = 488
  const trunkTopY = soilY - 338 * height
  const n = clamp(Math.round(leafCount), 3, 10)
  const droop = clamp(leafAngle, 30, 150)
  const angles = Array.from({ length: n }, (_, i) => -180 + (i / (n - 1 || 1)) * 300 + 60)
  const frond = (a, len, colour, w, key) => (
    <path
      key={key}
      d={`M200 ${trunkTopY} Q${200 + len * 0.5} ${trunkTopY - len * 0.65} ${200 + len} ${trunkTopY - len * 0.78} Q${200 + len * 0.34} ${trunkTopY - len * 0.32} 202 ${trunkTopY + 2}`}
      fill={colour} stroke={INK} strokeWidth={w} strokeLinejoin="round"
      transform={`rotate(${a} 200 ${trunkTopY})`}
    />
  )
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="40" ry="12" fill="var(--z-soil)" opacity="0.9" />}
      <path
        d={`M188 ${soilY - 2} C184 ${soilY - 66} 186 ${soilY - 146} 192 ${soilY - 226} C194 ${soilY - 266} 196 ${soilY - 296} 198 ${trunkTopY} L202 ${trunkTopY} C204 ${soilY - 296} 206 ${soilY - 266} 208 ${soilY - 226} C214 ${soilY - 146} 216 ${soilY - 66} 212 ${soilY - 2} Z`}
        fill="var(--z-stem)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
      />
      <g>{angles.filter((_, i) => i % 2 === 0).map((a, i) => frond(a, (56 + droop * 0.5) * leafWidth, 'var(--z-leaf-secondary)', 1.8, `s${i}`))}</g>
      <g>{angles.map((a, i) => frond(a, (68 + droop * 0.62) * leafWidth, 'var(--z-leaf-main)', 2.2, `m${i}`))}</g>
      <path
        d={`M192 ${trunkTopY + 15} Q200 ${trunkTopY + 40} 210 ${trunkTopY + 15} Q206 ${trunkTopY + 28} 200 ${trunkTopY + 30} Q194 ${trunkTopY + 28} 192 ${trunkTopY + 15} Z`}
        fill="var(--z-petal)" stroke={INK} strokeWidth="1.2"
      />
      {flowerCount > 0 && (
        <g fill="var(--z-center)" stroke={INK} strokeWidth="1">
          {Array.from({ length: clamp(Math.round(flowerCount), 0, 6) }).map((_, i) => (
            <circle key={i} cx={194 + i * 4.5} cy={trunkTopY + 38 + (i % 2) * 6} r={5 * flowerSize} />
          ))}
        </g>
      )}
    </svg>
  )
}

// ---- 8. fern — arching fronds with detailed leaflets (Fern Asparagus, and
// any other feathery-foliage species). Ferns don't flower — `petal` is
// repurposed for the small brown spore dots (sori) real ferns carry on the
// underside of a mature frond (flowerCount/flowerSize now control how many
// and how big), `center` for a young fiddlehead's coiled tip (hasStem toggles
// whether that unfurling frond shows at all).
export function Fern({ zones, size = 160, variation = {}, hideSoil = false }) {
  const { leafCount = 4, leafWidth = 1, height = 1, flowerCount = 3, flowerSize = 1, hasStem = true } = variation
  const soilY = 488
  const n = clamp(Math.round(leafCount), 2, 7)
  const leftPts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1 || 1)
    return [172 - t * 66 * height, 432 - t * 144 * height]
  })
  const rightPts = leftPts.map(([x, y]) => [400 - x, y])
  const leaflet = (x, y, angle, len) => (
    <ellipse cx={x} cy={y} rx={len * leafWidth} ry="4.4" fill="var(--z-leaf-main)" stroke={INK} strokeWidth="0.9" transform={`rotate(${angle} ${x} ${y})`} />
  )
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="56" ry="13" fill="var(--z-soil)" opacity="0.9" />}
      <g fill="none" stroke="var(--z-leaf-secondary)" strokeWidth="5" strokeLinecap="round" opacity="0.75">
        <path d="M185 486 Q110 420 88 300" />
        <path d="M215 486 Q290 420 312 300" />
      </g>
      <path d={`M198 484 ${leftPts.map(([x, y]) => `L${x} ${y}`).join(' ')}`} stroke="var(--z-stem)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={`M202 484 ${rightPts.map(([x, y]) => `L${x} ${y}`).join(' ')}`} stroke="var(--z-stem)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="0.9">
        {leftPts.map(([x, y], i) => <g key={i}>{leaflet(x, y, -55, 20 - i * 2)}{leaflet(x, y, 130, 11 - i)}</g>)}
        {rightPts.map(([x, y], i) => <g key={i}>{leaflet(x, y, 55, 20 - i * 2)}{leaflet(x, y, 230, 11 - i)}</g>)}
      </g>
      {hasStem && (
        <>
          <path d="M200 486 Q195 400 198 320 Q199 290 210 275" stroke="var(--z-stem)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M210 275 Q222 272 222 260 Q222 250 212 251 Q205 252 207 260" fill="none" stroke="var(--z-center)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {flowerCount > 0 && (
        <g fill="var(--z-petal)" opacity="0.85">
          {leftPts.slice(0, clamp(Math.round(flowerCount), 0, leftPts.length)).map(([x, y], i) => (
            <g key={i}><circle cx={x - 2} cy={y + 4} r={1.6 * flowerSize} /><circle cx={x + 3} cy={y + 6} r={1.6 * flowerSize} /><circle cx={x} cy={y + 9} r={1.6 * flowerSize} /></g>
          ))}
        </g>
      )}
    </svg>
  )
}

// ---- 9. bulb-flower — single stem from a bulb, one large showy flower head
// (Agapanthus, Watsonia, Nerine, Amaryllis, Gladiolus, Clivia, Arum Lily…).
// flowerCount reshapes the bloom itself: 1 = a single showy trumpet
// (Amaryllis/Arum), 2+ = a many-floret umbel radiating from one point
// (Agapanthus) — not just "more of the same" flower.
export function BulbFlower({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const { leafCount = 2, leafWidth = 1, height = 1, flowerCount = 6, flowerSize = 1 } = variation
  const soilY = 488
  const stemTopY = soilY - 330 * height
  const n = clamp(Math.round(leafCount), 1, 4)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="46" ry="13" fill="var(--z-soil)" opacity="0.9" />}
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {Array.from({ length: Math.ceil(n / 2) }).map((_, i) => (
          // Same scale-anchor fix as the main leaves below: leafWidth scales
          // around x=200, not the SVG origin, so this background leaf widens
          // in place instead of drifting rightward as leafWidth grows.
          <path key={i} d="M210 486 Q240 400 236 300 Q234 288 226 292 Q220 390 200 486 Z" transform={`translate(${i * 4} 0) translate(200 0) scale(${leafWidth} 1) translate(-200 0)`} />
        ))}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        {Array.from({ length: n }).map((_, i) => {
          // One base leaf shape, mirrored (not hand-duplicated) for the other
          // side so the pair stays symmetric around the stem at x=200 — and
          // leafWidth scales around that same x=200 anchor rather than the
          // SVG origin, so widening a leaf doesn't also drag it sideways.
          const flip = i % 2
          const pair = Math.floor(i / 2)
          const shift = pair * 3 * (flip ? 1 : -1)
          const mirror = flip ? 'translate(400 0) scale(-1 1) ' : ''
          return (
            <path
              key={i}
              d="M190 486 Q158 400 164 296 Q166 282 176 288 Q182 390 202 486 Z"
              transform={`translate(${shift} 0) ${mirror}translate(200 0) scale(${leafWidth} 1) translate(-200 0)`}
            />
          )
        })}
      </g>
      <path d={`M198 460 C199 ${380 * height} 200 ${280 * height} 201 ${stemTopY + 15}`} stroke="var(--z-stem)" strokeWidth="8" strokeLinecap="round" fill="none" />
      {flowering && flowerCount > 0 && (
        <g transform={`translate(201 ${stemTopY})`}>
          {flowerCount <= 1 ? (
            <g fill="var(--z-petal)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
              {[-60, -30, 0, 30, 60, 90].map((a) => (
                <path key={a} d={`M0 ${15 * flowerSize} Q${-14 * flowerSize} ${-30 * flowerSize} ${-1 * flowerSize} ${-85 * flowerSize} Q${14 * flowerSize} ${-30 * flowerSize} 0 ${15 * flowerSize} Z`} transform={`rotate(${a})`} />
              ))}
            </g>
          ) : (
            <g fill="var(--z-petal)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
              {Array.from({ length: clamp(Math.round(flowerCount), 2, 10) }).map((_, i) => {
                const cnt = clamp(Math.round(flowerCount), 2, 10)
                const a = (i / cnt) * 360
                const rad = (a * Math.PI) / 180
                const rr = 26 * flowerSize
                const fx = Math.cos(rad) * rr
                const fy = Math.sin(rad) * rr * 0.55 - 8
                return (
                  <g key={i} transform={`translate(${fx} ${fy})`}>
                    <line x1="0" y1="0" x2={-fx * 0.3} y2={-fy * 0.3 + 8} stroke="var(--z-stem)" strokeWidth="1" />
                    {[0, 120, 240].map((pa) => (
                      <path key={pa} d={`M0 ${6 * flowerSize} Q${-6 * flowerSize} 0 0 ${-9 * flowerSize} Q${6 * flowerSize} 0 0 ${6 * flowerSize} Z`} transform={`rotate(${pa})`} />
                    ))}
                  </g>
                )
              })}
            </g>
          )}
          <g stroke="var(--z-center)" strokeWidth="2" strokeLinecap="round">
            {[-40, -15, 10, 35].map((a) => <path key={a} d={`M0 0 L0 ${-30 * flowerSize}`} transform={`rotate(${a})`} />)}
          </g>
          <circle cx="0" cy="0" r={4 * flowerSize} fill="var(--z-center)" />
        </g>
      )}
    </svg>
  )
}

// ---- 10. ground-cover — low spreading mat of small leaves and tiny flowers
// (Vygies, Gazanias, Sour Fig, Ice Plant, trailing daisies)
export function GroundCover({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const { leafCount = 14, leafAngle = 100, leafWidth = 1, height = 1, flowerCount = 7, flowerSize = 1 } = variation
  const soilY = 498
  const n = clamp(Math.round(leafCount), 6, 24)
  const spread = clamp(leafAngle, 50, 160) * 1.6
  const leaves = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1 || 1)
    const x = 200 + (t - 0.5) * spread
    const y = 470 + Math.sin(t * Math.PI * 3 + i) * 8 * height
    const r = (9 + (i % 3) * 2) * leafWidth
    return { x, y, r }
  })
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx={clamp(spread * 0.55, 60, 150)} ry="10" fill="var(--z-soil)" opacity="0.8" />}
      <path d={`M${200 - spread / 2} 476 Q200 490 ${200 + spread / 2} 478`} stroke="var(--z-stem)" strokeWidth="2" fill="none" opacity="0.7" />
      <g fill="var(--z-leaf-secondary)" stroke={INK} strokeWidth="1.4">
        {leaves.filter((_, i) => i % 2 === 0).map((l, i) => <circle key={i} cx={l.x} cy={l.y - 4} r={l.r} />)}
      </g>
      <g fill="var(--z-leaf-main)" stroke={INK} strokeWidth="1.6">
        {leaves.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={l.r} />)}
      </g>
      {flowering && flowerCount > 0 && (
        <g>
          {Array.from({ length: clamp(Math.round(flowerCount), 0, 14) }).map((_, i) => {
            const l = leaves[(i * 3) % leaves.length]
            return (
              <g key={i} transform={`translate(${l.x} ${l.y - 14})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx="0" cy={-3.6 * flowerSize} rx={3.2 * flowerSize} ry={3.8 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="0.5" transform={`rotate(${a})`} />
                ))}
                <circle cx="0" cy="0" r={2.2 * flowerSize} fill="var(--z-center)" stroke={INK} strokeWidth="0.5" />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// ---- 11. climbing-vine — vertical growth with tendrils and leaves (Forest
// Grape, Port St Johns Creeper, Pride of de Kaap, Traveller's Joy)
export function ClimbingVine({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const { leafCount = 6, leafWidth = 1, height = 1, flowerCount = 2, flowerSize = 1 } = variation
  const soilY = 488
  const topY = soilY - 408 * height
  const n = clamp(Math.round(leafCount), 3, 10)
  const leaf = (x, y, a, flip, scale, key) => (
    <path
      key={key}
      d="M0 0 C-13 -8 -15 -22 0 -30 C15 -22 13 -8 0 0 Z"
      fill="var(--z-leaf-main)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round"
      transform={`translate(${x} ${y}) rotate(${a}) scale(${scale}) ${flip ? 'scale(-1 1)' : ''}`}
    />
  )
  const pts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1 || 1)
    return { x: 200 + (i % 2 ? 18 : -18), y: soilY - t * (soilY - topY), a: i % 2 ? 15 : -20, flip: !!(i % 2) }
  })
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="34" ry="12" fill="var(--z-soil)" opacity="0.9" />}
      <path
        d={`M200 486 C210 ${420 * height} 190 ${360 * height} 205 ${300 * height} C215 ${250 * height} 190 ${200 * height} 205 ${150 * height} C212 ${120 * height} 198 ${100 * height} 200 ${topY}`}
        stroke="var(--z-stem)" strokeWidth="5" strokeLinecap="round" fill="none"
      />
      <g stroke="var(--z-stem)" strokeWidth="1.8" fill="none">
        <path d="M206 340 Q226 332 222 316 Q218 302 232 306" />
        <path d="M198 220 Q178 214 182 198 Q186 184 172 188" />
      </g>
      <g>{pts.map((p, i) => leaf(p.x, p.y, p.a, p.flip, leafWidth, i))}</g>
      {flowering && flowerCount > 0 && (
        <g>
          {Array.from({ length: clamp(Math.round(flowerCount), 0, 6) }).map((_, i) => {
            const p = pts[Math.floor((i + 0.5) * pts.length / clamp(flowerCount, 1, 6))] || pts[0]
            return (
              <g key={i} transform={`translate(${p.x + 8} ${p.y - 10})`}>
                {[-30, 0, 30, 60].map((a) => (
                  <g key={a} transform={`rotate(${a}) translate(0 ${-12 * flowerSize})`}>
                    <ellipse cx="0" cy="0" rx={4 * flowerSize} ry={7 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="0.9" />
                  </g>
                ))}
                <circle cx="0" cy={-8 * flowerSize} r={2.4 * flowerSize} fill="var(--z-center)" />
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// ---- 12. herb — small bushy aromatic plant, fine-textured leaves (Wild
// Sage, Wild Rosemary, Buchu, Rooibos, scented Pelargoniums). leafAngle is a
// spread multiplier here (sprigs don't fan at a literal angle the way a
// rosette's leaves do) rather than degrees like the other templates.
export function Herb({ zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const {
    leafCount = 6, leafAngle = 1, leafWidth = 1, height = 1,
    flowerCount = 4, flowerSize = 1, hasStem = true,
  } = variation
  const soilY = 488
  const topY = soilY - 228 * height
  const stems = hasStem ? [174, 200, 226] : [200]
  const sprigs = (baseX, baseY, tipX, tipY, count, colour) => {
    const pts = []
    for (let i = 1; i <= count; i += 1) {
      const t = i / (count + 1)
      const x = baseX + (tipX - baseX) * t
      const y = baseY + (tipY - baseY) * t
      const spread = (10 + t * 20) * leafAngle
      pts.push(
        <path key={`${i}l`} d={`M${x} ${y} L${x - spread * leafWidth} ${y - spread * 0.45}`} stroke={colour} strokeWidth="2.4" strokeLinecap="round" />,
        <path key={`${i}r`} d={`M${x} ${y} L${x + spread * leafWidth} ${y - spread * 0.45}`} stroke={colour} strokeWidth="2.4" strokeLinecap="round" />,
      )
    }
    return pts
  }
  const n = clamp(Math.round(leafCount), 3, 9)
  return (
    <svg viewBox="0 0 400 520" style={{ width: size, height: size * (520 / 400), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      {!hideSoil && <ellipse cx="200" cy={soilY} rx="52" ry="12" fill="var(--z-soil)" opacity="0.9" />}
      <g stroke="var(--z-stem)" strokeWidth="4" strokeLinecap="round" fill="none">
        {stems.map((x, i) => <path key={i} d={`M${x} 484 C${x - (x - 200) * 0.3} ${(484 + topY) / 2} ${x - (x - 200) * 0.5} ${topY + 30} ${x - (x - 200) * 0.7} ${topY}`} />)}
      </g>
      {stems.map((x, i) => <g key={`s${i}`}>{sprigs(x, 465, x - (x - 200) * 0.7, topY, n, 'var(--z-leaf-secondary)')}</g>)}
      {stems.map((x, i) => <g key={`m${i}`}>{sprigs(x, 460, x - (x - 200) * 0.6, topY + 20, n, 'var(--z-leaf-main)')}</g>)}
      {flowering && flowerCount > 0 && stems.map((x, si) => {
        const tipX = x - (x - 200) * 0.7
        const tipY = topY
        return (
          <g key={si}>
            <path d={`M${tipX} ${tipY + 10} L${tipX} ${tipY - 30 * height}`} stroke="var(--z-stem)" strokeWidth="2" fill="none" />
            {Array.from({ length: clamp(Math.round(flowerCount), 1, 6) }).map((_, i) => (
              <ellipse key={i} cx={tipX} cy={tipY - 30 * height + i * 9} rx={5.5 * flowerSize} ry={4.6 * flowerSize} fill="var(--z-petal)" stroke={INK} strokeWidth="0.6" opacity="0.92" />
            ))}
            <circle cx={tipX} cy={tipY - 30 * height} r={2.4 * flowerSize} fill="var(--z-center)" />
          </g>
        )
      })}
    </svg>
  )
}

// Not exported individually elsewhere — react-refresh only wants component
// exports from a file like this. GardenPlant (below) is the only thing other
// modules need.
const PLANT_TEMPLATES = {
  aloe: Aloe,
  protea: Protea,
  succulent: Succulent,
  'flowering-shrub': FloweringShrub,
  'grass-tuft': GrassTuft,
  'tree-small': TreeSmall,
  palm: Palm,
  fern: Fern,
  'bulb-flower': BulbFlower,
  'ground-cover': GroundCover,
  'climbing-vine': ClimbingVine,
  herb: Herb,
}

// Renders the right template for a species, filled with its colour zones and
// shape variation. Falls back to flowering-shrub if a template name doesn't
// match (should not happen once every species in PLANT_COLOUR_MAP is
// templated correctly).
export function GardenPlant({ template, zones, size = 160, flowering = true, variation = {}, hideSoil = false }) {
  const Template = PLANT_TEMPLATES[template] || FloweringShrub
  return <Template zones={zones} size={size} flowering={flowering} variation={variation} hideSoil={hideSoil} />
}
