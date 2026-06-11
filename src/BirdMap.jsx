// "My Bird Map" — an illustrated South Africa outline with pins where Pooks
// has spotted birds. No Google Maps API: a hand-projected SVG outline plus a
// small gazetteer of common SA places. Unknown place names get a stable,
// hashed position so every location still gets a pin somewhere sensible.
import { useState } from 'react'

const VIEW_W = 1000
const VIEW_H = 820
// Projection bounds (lon/lat) covering South Africa.
const LON0 = 15.5
const LON1 = 33.5
const LAT0 = -21.5 // top
const LAT1 = -35.5 // bottom

function project(lon, lat) {
  const x = ((lon - LON0) / (LON1 - LON0)) * VIEW_W
  const y = ((lat - LAT0) / (LAT1 - LAT0)) * VIEW_H
  return [x, y]
}

// National boundary as real (lon, lat) points, traced clockwise from the Orange
// River mouth (NW) down the Atlantic coast, around Cape Point and Cape Agulhas,
// up the Indian-Ocean coast past Durban (the Drakensberg curve), to the NE
// corner, then west along the Limpopo and Botswana/Namibia borders back to the
// start. Detailed enough to read clearly as South Africa.
const OUTLINE = [
  // West / Atlantic coast, north → south
  [16.45, -28.6], [16.9, -29.25], [17.25, -30.0], [17.55, -30.9], [18.0, -31.6],
  [18.25, -32.3], [18.32, -32.9], [17.88, -33.05], [18.2, -33.45], [18.38, -33.9],
  [18.46, -34.12], [18.42, -34.35], // Cape Point
  // South / Indian-Ocean coast, west → east
  [19.3, -34.66], [19.99, -34.83], // Cape Agulhas (southernmost point)
  [20.9, -34.42], [21.6, -34.32], [22.15, -34.18], [23.4, -34.06], [24.2, -34.16],
  [25.6, -33.96], [26.3, -33.74], [26.9, -33.6], [27.9, -33.02], [28.6, -32.55],
  [29.3, -31.95], [30.05, -31.3], [30.7, -30.55], [31.05, -29.86], // Durban
  [31.7, -29.2], [32.05, -28.78], [32.4, -28.4], [32.55, -27.5], [32.9, -26.85], // NE coast corner
  // Northern border, east → west (Mozambique, Limpopo, Botswana, Namibia)
  [32.0, -26.5], [31.98, -25.95], [31.55, -25.6], [31.45, -24.4], [31.25, -23.5],
  [31.2, -22.4], // Pafuri — northern tip
  [30.3, -22.35], [29.4, -22.2], [28.5, -22.55], [28.05, -22.7], [27.3, -23.45],
  [26.85, -24.05], [26.4, -24.65], [25.85, -24.75], [25.6, -25.45], [24.7, -25.75],
  [23.5, -25.95], [22.7, -26.0], [21.8, -26.7], [20.95, -26.8], [20.6, -26.5],
  [20.3, -25.65], [19.98, -26.5], [19.95, -27.4], [19.2, -28.2], [18.5, -28.55],
  [17.4, -28.7], [16.45, -28.6],
]

// Lesotho — a small mountain kingdom completely enclosed by SA. Drawn as an
// enclave patch on top of the land so it reads as the classic "hole".
const LESOTHO = [
  [27.45, -28.65], [28.2, -28.62], [28.7, -28.9], [29.1, -29.3], [29.45, -29.7],
  [29.3, -30.15], [28.85, -30.5], [28.3, -30.65], [27.75, -30.3], [27.3, -29.75],
  [27.05, -29.3], [27.3, -28.9], [27.45, -28.65],
]

// Always-on reference markers so the map is legible even before any sightings.
const REFERENCE_DOTS = [
  { name: 'Potchefstroom', lon: 27.1, lat: -26.72, dx: 8, anchor: 'start' },
  { name: 'Kruger', lon: 31.59, lat: -24.99, dx: -8, anchor: 'end' },
]

// Decorative birds drifting across the map (purely cosmetic).
const FLYING_BIRDS = [
  { emoji: '🦅', top: '18%', dur: 13, delay: 0 },
  { emoji: '🐦', top: '42%', dur: 16, delay: 2.5 },
  { emoji: '🕊️', top: '63%', dur: 14, delay: 5 },
  { emoji: '🦩', top: '78%', dur: 18, delay: 1.2 },
]

const PLACES = [
  { keys: ['cape town', 'kaapstad', 'table mountain'], lon: 18.42, lat: -33.92 },
  { keys: ['stellenbosch'], lon: 18.86, lat: -33.93 },
  { keys: ['paarl'], lon: 18.96, lat: -33.73 },
  { keys: ['hermanus'], lon: 19.24, lat: -34.42 },
  { keys: ['george'], lon: 22.46, lat: -33.96 },
  { keys: ['knysna'], lon: 23.05, lat: -34.04 },
  { keys: ['mossel bay'], lon: 22.13, lat: -34.18 },
  { keys: ['oudtshoorn'], lon: 22.2, lat: -33.59 },
  { keys: ['port elizabeth', 'gqeberha', 'pe'], lon: 25.6, lat: -33.96 },
  { keys: ['east london'], lon: 27.91, lat: -33.02 },
  { keys: ['grahamstown', 'makhanda'], lon: 26.53, lat: -33.3 },
  { keys: ['durban', 'umhlanga', 'ethekwini'], lon: 31.02, lat: -29.86 },
  { keys: ['pietermaritzburg', 'pmb'], lon: 30.38, lat: -29.6 },
  { keys: ['st lucia', 'isimangaliso'], lon: 32.41, lat: -28.37 },
  { keys: ['bloemfontein', 'bloem'], lon: 26.21, lat: -29.12 },
  { keys: ['kimberley'], lon: 24.76, lat: -28.74 },
  { keys: ['johannesburg', 'joburg', 'jhb', 'sandton', 'soweto'], lon: 28.04, lat: -26.2 },
  { keys: ['pretoria', 'tshwane', 'centurion'], lon: 28.19, lat: -25.75 },
  { keys: ['potchefstroom', 'potch'], lon: 27.1, lat: -26.72 },
  { keys: ['klerksdorp'], lon: 26.67, lat: -26.85 },
  { keys: ['rustenburg'], lon: 27.24, lat: -25.67 },
  { keys: ['pilanesberg'], lon: 27.09, lat: -25.25 },
  { keys: ['sun city'], lon: 27.1, lat: -25.34 },
  { keys: ['nelspruit', 'mbombela'], lon: 30.97, lat: -25.47 },
  { keys: ['hazyview'], lon: 31.12, lat: -25.04 },
  { keys: ['skukuza', 'kruger', 'satara', 'lower sabie', 'kruger national park'], lon: 31.59, lat: -24.99 },
  { keys: ['polokwane', 'pietersburg'], lon: 29.45, lat: -23.9 },
  { keys: ['tzaneen'], lon: 30.16, lat: -23.83 },
  { keys: ['upington'], lon: 21.24, lat: -28.45 },
  { keys: ['kgalagadi'], lon: 20.6, lat: -25.75 },
  { keys: ['springbok'], lon: 17.89, lat: -29.66 },
  { keys: ['mthatha', 'umtata'], lon: 28.79, lat: -31.59 },
  { keys: ['vredefort', 'parys'], lon: 27.46, lat: -26.9 },
  { keys: ['vaal', 'vereeniging'], lon: 27.93, lat: -26.67 },
]

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Resolve a free-text location to lon/lat. Known place → gazetteer; otherwise a
// stable hashed point biased toward the populated interior so it lands on land.
function locatePlace(name) {
  const lower = String(name || '').toLowerCase()
  for (const place of PLACES) {
    if (place.keys.some((k) => lower.includes(k))) {
      return { lon: place.lon, lat: place.lat, exact: true }
    }
  }
  const h = hashString(lower || 'somewhere')
  const lon = 19 + (h % 1000) / 1000 * 12 // 19 → 31
  const lat = -25 - ((h >> 10) % 1000) / 1000 * 6 // -25 → -31
  return { lon, lat, exact: false }
}

// Colour pins by bird type (water/raptor/garden/other).
function pinColour(tags = [], category = '') {
  const hay = `${category} ${tags.join(' ')}`.toLowerCase()
  if (/water|wetland|duck|heron|egret|kingfisher|cormorant|grebe|coot|jacana|stilt|plover/.test(hay)) return '#3E78C8'
  if (/prey|raptor|eagle|hawk|buzzard|kite|owl|falcon|kestrel|vulture/.test(hay)) return '#D9534F'
  if (/garden|colourful|noisy|songbird|sunbird|weaver|robin/.test(hay)) return '#5BA85B'
  return '#E0A53A'
}

function birdTypeFor(birdLibrary, name) {
  const lower = String(name || '').toLowerCase()
  const match = birdLibrary.find((b) => b.commonName?.toLowerCase() === lower)
  return { tags: match?.tags || [], category: match?.category || '' }
}

export function BirdMapPage({ data, onBack }) {
  const birdLibrary = data.birdLibrary || []
  const located = (data.sightings || []).filter((s) => String(s.location || '').trim())

  // Group sightings by normalised location name → one pin each.
  const groups = new Map()
  for (const s of located) {
    const key = s.location.trim().toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, { label: s.location.trim(), sightings: [], place: locatePlace(s.location) })
    }
    groups.get(key).sightings.push(s)
  }
  const pins = [...groups.values()].map((g) => {
    const first = g.sightings[0]
    const { tags, category } = birdTypeFor(birdLibrary, first.birdName)
    const [x, y] = project(g.place.lon, g.place.lat)
    return { ...g, x, y, colour: pinColour(tags, category) }
  })

  const [activeKey, setActiveKey] = useState(null)
  const active = pins.find((p) => p.label.toLowerCase() === activeKey) || null

  const toPath = (pts) => `M ${pts.map(([lo, la]) => project(lo, la).map((n) => n.toFixed(1)).join(' ')).join(' L ')} Z`
  const outlinePath = toPath(OUTLINE)
  const lesothoPath = toPath(LESOTHO)
  const refDots = REFERENCE_DOTS.map((d) => {
    const [x, y] = project(d.lon, d.lat)
    return { ...d, x, y }
  })

  return (
    <div className="page-grid bird-map-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Field guide</p>
            <h2>My Bird Map 🗺️</h2>
          </div>
          <span className="status-pill">{pins.length} spot{pins.length === 1 ? '' : 's'}</span>
        </div>

        <>
          <div className="map-legend">
            <span><i style={{ background: '#3E78C8' }} /> Water</span>
            <span><i style={{ background: '#D9534F' }} /> Raptor</span>
            <span><i style={{ background: '#5BA85B' }} /> Garden</span>
            <span><i style={{ background: '#E0A53A' }} /> Other</span>
          </div>

          <div className="sa-map-wrap">
            {/* Decorative birds drifting across the country */}
            <div className="sa-map-birds" aria-hidden="true">
              {FLYING_BIRDS.map((b, i) => (
                <span
                  key={i}
                  className="sa-fly-bird"
                  style={{ top: b.top, '--fly-dur': `${b.dur}s`, '--fly-delay': `${b.delay}s` }}
                >
                  {b.emoji}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="sa-map" role="img" aria-label="Map of South Africa with bird sighting pins">
              <path className="sa-land" d={outlinePath} />
              <path className="sa-lesotho" d={lesothoPath} />
              {/* Always-on reference markers (Potchefstroom + Kruger) */}
              {refDots.map((d) => (
                <g key={d.name} className="map-ref" transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}>
                  <circle className="map-ref-dot" r="7" />
                  <text className="map-ref-label" x={d.dx} y="5" textAnchor={d.anchor}>{d.name}</text>
                </g>
              ))}
              {pins.map((p) => {
                const on = active && active.label === p.label
                return (
                  <g
                    key={p.label}
                    className={`map-pin${on ? ' active' : ''}`}
                    transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                    onClick={() => setActiveKey(on ? null : p.label.toLowerCase())}
                  >
                    <circle className="map-pin-halo" r={on ? 26 : 0} fill={p.colour} />
                    <path className="map-pin-drop" d="M0 0 C -9 -16 -9 -28 0 -28 C 9 -28 9 -16 0 0 Z" fill={p.colour} />
                    <circle cx="0" cy="-20" r="5" fill="#fff" />
                    {p.sightings.length > 1 && (
                      <text className="map-pin-count" x="0" y="-16" textAnchor="middle">{p.sightings.length}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {pins.length === 0 ? (
            <p className="fine-print map-hint">
              📍 Add a location when you save a bird and it will appear here on the map.
            </p>
          ) : active ? (
              <div className="map-detail">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">📍 {active.label}</p>
                    <h3>{active.sightings.length} sighting{active.sightings.length === 1 ? '' : 's'} here</h3>
                  </div>
                  <button className="text-btn" type="button" onClick={() => setActiveKey(null)}>Close</button>
                </div>
                <div className="map-sighting-list">
                  {active.sightings.map((s) => (
                    <article className="map-sighting" key={s.id}>
                      {s.photo ? (
                        <img src={s.photo} alt={s.birdName} className="map-sighting-thumb" />
                      ) : (
                        <div className="map-sighting-thumb no-photo-yet"><span aria-hidden="true">📷</span></div>
                      )}
                      <div>
                        <h4>{s.birdName}</h4>
                        <p className="fine-print">{new Date(s.dateSpotted || s.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {s.notes && <p className="map-sighting-note">{s.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="fine-print map-hint">Tap a pin to see the birds you spotted there 🐦</p>
            )}
        </>
      </section>
    </div>
  )
}
