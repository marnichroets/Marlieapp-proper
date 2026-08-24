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

// National boundary as real (lon, lat) points, sourced from a public-domain
// simplified country border dataset (traced from the KwaZulu-Natal/Mozambique
// corner south along the Indian-Ocean coast, around Cape Agulhas and Cape
// Point, up the Atlantic coast, then east along the Namibia/Botswana/
// Zimbabwe/Mozambique borders back to the start) so it reads as an accurate
// outline of South Africa rather than a stylised approximation.
const OUTLINE = [
  [31.52, -29.26], [31.33, -29.4], [30.9, -29.91], [30.62, -30.42], [30.06, -31.14],
  [28.93, -32.17], [28.22, -32.77], [27.46, -33.23], [26.42, -33.61], [25.91, -33.67],
  [25.78, -33.94], [25.17, -33.8], [24.68, -33.99], [23.59, -33.79], [22.99, -33.92],
  [22.57, -33.86], [21.54, -34.26], [20.69, -34.42], [20.07, -34.8], [19.62, -34.82],
  [19.19, -34.46], [18.86, -34.44], [18.42, -34.0], [18.38, -34.14], [18.24, -33.87],
  [18.25, -33.28], [17.93, -32.61], [18.25, -32.43], [18.22, -31.66], [17.57, -30.73],
  [17.06, -29.88], [16.34, -28.58], [16.82, -28.08], [17.22, -28.36],
  [17.39, -28.78], [17.84, -28.86], [18.46, -29.05], [19.0, -28.97], [19.89, -28.46],
  [19.9, -24.77], [20.17, -24.92], [20.76, -25.87], [20.67, -26.48], [20.89, -26.83],
  [21.61, -26.73], [22.11, -26.28], [22.58, -25.98], [22.82, -25.5], [23.31, -25.27],
  [23.73, -25.39], [24.21, -25.67], [25.03, -25.72], [25.66, -25.49], [25.77, -25.17],
  [25.94, -24.7], [26.49, -24.62], [26.79, -24.24], [27.12, -23.57], [28.02, -22.83],
  [29.43, -22.09], [29.84, -22.1], [30.32, -22.27], [30.66, -22.15], [31.19, -22.25],
  [31.67, -23.66], [31.93, -24.37], [31.75, -25.48], [31.84, -25.84], [31.33, -25.66],
  [31.04, -25.73], [30.95, -26.02], [30.68, -26.4], [30.69, -26.74], [31.28, -27.29],
  [31.87, -27.18], [32.07, -26.73], [32.83, -26.74], [32.58, -27.47], [32.46, -28.3],
  [32.2, -28.75], [31.52, -29.26],
]

// Lesotho — a small mountain kingdom completely enclosed by SA. Same source
// dataset (it's the inner ring of the SA polygon). Drawn as an enclave patch
// on top of the land so it reads as the classic "hole".
const LESOTHO = [
  [28.98, -28.96], [28.54, -28.65], [28.07, -28.85], [27.53, -29.24], [27.0, -29.88],
  [27.75, -30.65], [28.11, -30.55], [28.29, -30.23], [28.85, -30.07], [29.02, -29.74],
  [29.33, -29.26], [28.98, -28.96],
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
