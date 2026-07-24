// Kallie the Yorkie — the family dog's illustrated mascot. Same idea as
// birdTemplates.jsx/plantTemplates.jsx (flat hand-drawn SVG, shared warm-ink
// outline, no photos), but she isn't a species template filled from an
// external colour map — she's one specific, named dog, so her palette is
// fixed here rather than passed in.
//
// Art style matched to a wikiHow "how to draw a Yorkie" cartoon reference:
// chibi/kawaii proportions (oversized head), thick bold outlines, big round
// eyes each with two white highlight dots, and a small pink tongue poking
// out of a curved smile. The head keeps a light jagged fur texture (via
// zigzagPath) matching the reference's cowlick, but the body/chest silhouette
// and the ears are smooth soft-bezier curves (via smoothClosedPath /
// KallieEar) — no sharp spiky points on those — since a dense zigzag there
// read as jagged and sawtoothed rather than like soft dog fur.
//
// Coloured from her ACTUAL reference photos (not the cartoon reference's
// two-tone black-and-tan, and not solid golden-brown either): she reads
// mostly white/cream over the body, with golden-tan concentrated on her
// head, ears and tail — half-prick ears (the base stands up off the top of
// the head, then folds over about a third of the way up and the fur hangs
// down from that fold, past the jawline — not fully erect, not fully
// drooping), and a muted brownish nose (not black, not bright pink).
//
// Two poses, both viewBox="0 0 400 400":
//   KallieSitting  — front-facing, upright, for static appearances (Tweety's
//                    Home card, the magazine stamp).
//   KallieTrotting — side profile standing/running, meant to be paired with
//                    the running-leg/tail-wag CSS classes (see App.css) the
//                    same way GardenBird's walking legs work.
// Both are meant to be dropped into a <foreignObject>, same as GardenBird.

// Not exported — react-refresh only wants component exports from a file
// like this (same reasoning as plantTemplates.jsx keeping PLANT_TEMPLATES
// module-private). Nothing outside this file needs Kallie's raw palette.
const KALLIE_COLOURS = {
  face: '#D4A468', // golden-tan head — lightened to a caramel tone to match her reference photos
  ears: '#B8863E', // darker golden — ears + tuft
  body: '#F4EEE3', // she reads mostly white/cream over the body, not golden
  chest: '#FAF6EE', // near-white chest/muzzle patch, a touch brighter than body
  legs: '#F4EEE3',
  tail: '#D9B77E', // warm cream-gold, lighter than the head/ears
  nose: '#7A5240', // muted brown, not black, not bright pink
  eyes: '#3D2B1A',
  tongue: '#F0A0A8',
}

const INK = '#4d3420' // slightly darker/warmer than the app's usual ink — reads closer to the reference's bold near-black outline while staying in the same warm family

// The reference's signature texture: a CONTINUOUS jagged zigzag around a
// guide polygon (straight line-to segments, not curves) — small sharp
// outward points at regular intervals along every edge, alternating a
// little in height so it reads as scruffy fur rather than a mechanical
// sawtooth. This is the one shape every outer silhouette (head, ears, body,
// tail) is built from.
function zigzagPath(points, amp = 9, perEdge = 2) {
  const n = points.length
  let d = ''
  for (let i = 0; i < n; i += 1) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    if (i === 0) d += `M${x1.toFixed(1)} ${y1.toFixed(1)} `
    for (let s = 1; s <= perEdge; s += 1) {
      const t = s / (perEdge + 1)
      const px = x1 + dx * t
      const py = y1 + dy * t
      const spike = s % 2 ? amp : amp * 0.5
      d += `L${(px + nx * spike).toFixed(1)} ${(py + ny * spike).toFixed(1)} `
    }
    d += `L${x2.toFixed(1)} ${y2.toFixed(1)} `
  }
  return `${d}Z`
}

function ellipseGuide(cx, cy, rx, ry, n = 16) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]
  })
}

// Rounds a guide polygon into one continuous soft silhouette — a quadratic
// bezier curve through each vertex (curving from edge-midpoint to
// edge-midpoint, using the original point only as the control) — so there
// are no straight segments and no corners, just smooth flowing curves. Used
// for the body/chest outline in place of zigzagPath's spiky fur texture.
function smoothClosedPath(points) {
  const n = points.length
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const m0 = mid(points[n - 1], points[0])
  let d = `M${m0[0].toFixed(1)} ${m0[1].toFixed(1)} `
  for (let i = 0; i < n; i += 1) {
    const cur = points[i]
    const next = points[(i + 1) % n]
    const m = mid(cur, next)
    d += `Q${cur[0].toFixed(1)} ${cur[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)} `
  }
  return `${d}Z`
}

// A half-prick ear guide, in local space with the base attached at the
// origin: the first ~third of the outline (negative y) rises UP off the
// head like an erect ear, leaning outward as it goes; the rest (positive y)
// is the folded-over flap of fur hanging back down past that fold, tapering
// to a rounded tip well below the base. Run through smoothClosedPath so the
// fold and tip both read as soft curves, not corners.
function earGuidePoints(scale = 1) {
  const raw = [
    [-13, 2], [-7, -27], [9, -45], [29, -34], [38, -4],
    [26, 66], [11, 140], [-9, 72], [-12, 17],
  ]
  return raw.map(([x, y]) => [x * scale, y * scale])
}

// `mirror` flips which side the ear leans/folds toward (left ear vs. right
// ear on the front-facing pose); `rotate` fine-tunes the outward lean.
function KallieEar({ x, y, scale = 1, rotate = 0, mirror = false, strokeWidth = 4 }) {
  const d = smoothClosedPath(earGuidePoints(scale))
  return (
    <path
      d={d}
      fill={KALLIE_COLOURS.ears}
      stroke={INK}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${mirror ? -1 : 1} 1)`}
    />
  )
}

// Big kawaii eye: dark iris + two white highlight dots (a large one and a
// small one), matching the reference exactly.
function KallieEye({ cx, cy, r = 15 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={KALLIE_COLOURS.eyes} />
      <circle cx={cx - r * 0.32} cy={cy - r * 0.32} r={r * 0.34} fill="#fff" />
      <circle cx={cx + r * 0.3} cy={cy + r * 0.05} r={r * 0.16} fill="#fff" opacity="0.9" />
    </g>
  )
}

// The little pink tongue poking out of her smile.
function KallieTongue({ cx, cy, w = 16, h = 20 }) {
  return <path d={`M${cx - w / 2} ${cy} Q${cx - w / 2} ${cy + h} ${cx} ${cy + h} Q${cx + w / 2} ${cy + h} ${cx + w / 2} ${cy} Z`} fill={KALLIE_COLOURS.tongue} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
}

// A little fluffy cowlick between the ears at the top of the head — small
// spiky tufts, same as the reference's mid-forehead spikes.
function HeadTuft({ cx, cy }) {
  const spikes = [[-26, 6], [-10, -14], [8, -16], [26, 4]]
  return (
    <g fill={KALLIE_COLOURS.face} stroke={INK} strokeWidth="3" strokeLinejoin="round">
      {spikes.map(([dx, dy], i) => (
        <path key={i} d={`M${cx + dx - 10} ${cy + 14} L${cx + dx} ${cy + dy} L${cx + dx + 10} ${cy + 14} Z`} />
      ))}
    </g>
  )
}

// ---- sitting pose ------------------------------------------------------
// Front-facing, chibi proportions (oversized head), floppy ears.
export function KallieSitting({ size = 140 }) {
  const c = KALLIE_COLOURS
  return (
    <svg viewBox="0 0 400 400" style={{ width: size, height: size }} xmlns="http://www.w3.org/2000/svg">
      {/* tail */}
      <path d="M268 322 Q322 302 312 254" fill="none" stroke={c.tail} strokeWidth="16" strokeLinecap="round" />

      {/* body — chibi, compact, smooth rounded silhouette (mostly white/cream) */}
      <path
        d={smoothClosedPath([[155, 258], [245, 258], [270, 292], [274, 330], [262, 368], [238, 388], [162, 388], [138, 368], [126, 330], [130, 292]])}
        fill={c.body} stroke={INK} strokeWidth="5" strokeLinejoin="round"
      />

      {/* chest — smooth inner colour patch (not its own jagged edge, like the reference's softer inner colour blocks) */}
      <ellipse cx="200" cy="330" rx="48" ry="56" fill={c.chest} />

      {/* front paws */}
      <rect x="174" y="366" width="22" height="26" rx="9" fill={c.legs} stroke={INK} strokeWidth="3" />
      <rect x="204" y="366" width="22" height="26" rx="9" fill={c.legs} stroke={INK} strokeWidth="3" />

      {/* head — big, chibi-oversized, jagged fur silhouette, golden-tan */}
      <path d={zigzagPath(ellipseGuide(200, 175, 96, 90, 20), 9, 2)} fill={c.face} stroke={INK} strokeWidth="5" strokeLinejoin="round" />

      {/* fluffy cowlick between the ears */}
      <HeadTuft cx={200} cy={92} />

      {/* ears — half-prick: base stands up off the top of the head, folds over, fur hangs past the jawline */}
      <KallieEar x={155} y={102} scale={1} rotate={-6} mirror />
      <KallieEar x={245} y={102} scale={1} rotate={6} />

      {/* white muzzle patch — wider than a thin blaze, covering the lower face like her photos */}
      <ellipse cx="200" cy="196" rx="34" ry="30" fill={c.chest} />

      {/* eyes */}
      <KallieEye cx={168} cy={168} r={16} />
      <KallieEye cx={232} cy={168} r={16} />

      {/* nose */}
      <ellipse cx="200" cy="204" rx="10" ry="7" fill={c.nose} stroke={INK} strokeWidth="2" />

      {/* smiling mouth + tongue */}
      <path d="M178 214 Q200 232 222 214" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <KallieTongue cx={200} cy={218} w={16} h={18} />
    </svg>
  )
}

// ---- trotting pose -------------------------------------------------------
// Side profile, chibi-proportioned standing/running dog. Front-right +
// back-left legs vs. front-left + back-right legs are grouped for the
// diagonal-pair trot gait (see .kallie-leg-a/-b in App.css, the same idea
// as birdTemplates.jsx's leg-swing convention).
export function KallieTrotting({ size = 140 }) {
  const c = KALLIE_COLOURS
  return (
    <svg viewBox="0 0 400 400" style={{ width: size, height: size }} xmlns="http://www.w3.org/2000/svg">
      {/* tail — up and curling, ready to be wagged */}
      <g className="kallie-tail">
        <path d="M330 230 Q368 200 356 154" fill="none" stroke={c.tail} strokeWidth="15" strokeLinecap="round" />
      </g>

      {/* far legs — back layer */}
      <g className="kallie-leg-a" style={{ transformOrigin: '190px 280px' }}>
        <rect x="180" y="280" width="20" height="70" rx="9" fill={c.legs} stroke={INK} strokeWidth="3" opacity="0.85" />
      </g>
      <g className="kallie-leg-b" style={{ transformOrigin: '300px 280px' }}>
        <rect x="290" y="280" width="20" height="70" rx="9" fill={c.legs} stroke={INK} strokeWidth="3" opacity="0.85" />
      </g>

      {/* body — chibi compact box, smooth rounded silhouette, mostly white/cream */}
      <path
        d={smoothClosedPath([[150, 210], [300, 210], [326, 240], [330, 280], [320, 310], [140, 310], [128, 280], [132, 240]])}
        fill={c.body} stroke={INK} strokeWidth="5" strokeLinejoin="round"
      />

      {/* chest/belly underside */}
      <ellipse cx="230" cy="292" rx="86" ry="24" fill={c.chest} />

      {/* near legs — front layer */}
      <g className="kallie-leg-b" style={{ transformOrigin: '160px 284px' }}>
        <rect x="150" y="284" width="22" height="76" rx="10" fill={c.legs} stroke={INK} strokeWidth="3" />
      </g>
      <g className="kallie-leg-a" style={{ transformOrigin: '328px 284px' }}>
        <rect x="318" y="284" width="22" height="76" rx="10" fill={c.legs} stroke={INK} strokeWidth="3" />
      </g>

      {/* head — big, chibi, at the front, golden-tan */}
      <path d={zigzagPath(ellipseGuide(100, 160, 88, 82, 20), 9, 2)} fill={c.face} stroke={INK} strokeWidth="5" strokeLinejoin="round" />

      {/* fluffy cowlick */}
      <HeadTuft cx={100} cy={84} />

      {/* ears — half-prick: base stands up off the top of the head, folds over, fur hangs past the jawline */}
      <KallieEar x={78} y={88} scale={0.88} rotate={-10} strokeWidth={3.5} />
      <KallieEar x={116} y={94} scale={0.88} rotate={6} strokeWidth={3.5} />

      {/* white muzzle patch */}
      <ellipse cx="90" cy="180" rx="30" ry="26" fill={c.chest} />

      {/* eyes */}
      <KallieEye cx={70} cy={152} r={14} />
      <KallieEye cx={124} cy={152} r={14} />

      {/* nose */}
      <ellipse cx="34" cy="176" rx="9" ry="6.5" fill={c.nose} stroke={INK} strokeWidth="2" />

      {/* smiling mouth + tongue */}
      <path d="M48 192 Q70 208 96 194" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <KallieTongue cx={62} cy={196} w={14} h={16} />
    </svg>
  )
}

export function Kallie({ pose = 'sitting', size = 140 }) {
  return pose === 'trotting' ? <KallieTrotting size={size} /> : <KallieSitting size={size} />
}
