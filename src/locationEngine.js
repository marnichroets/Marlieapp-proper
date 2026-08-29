// Shared location engine — the one trusted source of coordinates for bird
// sightings, Bird Post addresses, and (downstream) the Bird Map. Nothing in
// this file ever picks a "best" result on the caller's behalf: searchPlaces
// always returns a list of candidates, reverseGeocode returns exactly one
// object for the human to confirm — the confirm step lives in <LocationPicker>,
// never here.
//
// Providers: Photon (komoot.io — free, no key, strong at partial/abbreviated
// input like "Potch") and Nominatim (OpenStreetMap — free, no key, strong at
// exact POI names and structured address breakdown). Both are queried and
// merged rather than picking one, because each is meaningfully better at a
// case the other is weak at (verified against real queries before building
// this: "Potch" only resolves to Potchefstroom via Photon; "Kirstenbosch"
// resolves to the correct venue+city via Nominatim's addressdetails).
//
// Every result is restricted to South Africa (country_code === 'za'),
// matching the existing Bird Post address restriction — an ambiguous/short
// query must never silently resolve to a place in another country.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const PHOTON_URL = 'https://photon.komoot.io/api'

// Nominatim's usage policy wants a real identifying User-Agent; browsers
// silently drop/override that header on fetch(), so the Referer they add
// automatically is what actually identifies this app — same situation as
// geocodeAddress() in App.jsx. Sent anyway for intent/documentation.
const REQUEST_HEADERS = { 'User-Agent': 'MarlieBirdApp/1.0 (location search)' }

// A GPS fix worse than this is still usable but probably wrong at the
// venue/suburb level — <LocationPicker> shows a warning and nudges toward
// manual search rather than blocking the save outright.
export const GPS_ACCURACY_WARNING_METERS = 500

function round(n, places) {
  const f = 10 ** places
  return Math.round(n * f) / f
}

// Two candidates within ~110m of each other (3 decimal places) are treated
// as the same real-world place, regardless of which provider found them.
function sameSpotKey(lat, lon) {
  return `${round(lat, 3)},${round(lon, 3)}`
}

function isSouthAfrica(countryCode) {
  return String(countryCode || '').toLowerCase() === 'za'
}

function normalizeNominatimResult(raw) {
  const address = raw.address || {}
  if (!isSouthAfrica(address.country_code)) return null
  const lat = Number(raw.lat)
  const lon = Number(raw.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  // Nominatim's POI name lives directly on the result when it has one (e.g.
  // "Kirstenbosch Botanical Gardens"); otherwise fall back to a house
  // number + road, then the first segment of display_name.
  const name =
    (raw.name && raw.name.trim()) ||
    [address.house_number, address.road].filter(Boolean).join(' ') ||
    String(raw.display_name || '').split(',')[0].trim() ||
    null

  const city = address.city || address.town || address.village || address.municipality || null
  const province = address.state || null

  return {
    name,
    latitude: lat,
    longitude: lon,
    suburb: address.suburb || address.neighbourhood || null,
    city,
    province,
    country: address.country || 'South Africa',
    formatted: [city, province].filter(Boolean).join(', '),
    provider: 'nominatim',
  }
}

function normalizePhotonFeature(feature) {
  const p = feature.properties || {}
  if (!isSouthAfrica(p.countrycode)) return null
  const [lon, lat] = feature.geometry?.coordinates || []
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const name =
    (p.name && p.name.trim()) ||
    [p.housenumber, p.street].filter(Boolean).join(' ') ||
    p.street ||
    null

  const city = p.city || p.county || null
  const province = p.state || null

  return {
    name,
    latitude: lat,
    longitude: lon,
    suburb: p.district || p.locality || null,
    city,
    province,
    country: p.country || 'South Africa',
    formatted: [city, province].filter(Boolean).join(', '),
    provider: 'photon',
  }
}

async function fetchNominatimSearch(query, { limit, signal }) {
  const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&countrycodes=za&limit=${limit}`
  const response = await fetch(url, { headers: REQUEST_HEADERS, signal })
  if (!response.ok) throw new Error(`Nominatim search failed (HTTP ${response.status})`)
  const results = await response.json()
  return Array.isArray(results) ? results.map(normalizeNominatimResult).filter(Boolean) : []
}

async function fetchPhotonSearch(query, { limit, signal }) {
  const url = `${PHOTON_URL}/?q=${encodeURIComponent(query)}&limit=${limit}&lang=en`
  const response = await fetch(url, { headers: REQUEST_HEADERS, signal })
  if (!response.ok) throw new Error(`Photon search failed (HTTP ${response.status})`)
  const body = await response.json()
  const features = Array.isArray(body?.features) ? body.features : []
  return features.map(normalizePhotonFeature).filter(Boolean)
}

// Search a free-text query and return candidate locations for the human to
// choose from — never fewer than zero, never an auto-picked "best" one.
// Queries both providers in parallel; a failure in either is swallowed
// (Promise.allSettled) so a Photon outage doesn't take down Nominatim search
// and vice versa. Nominatim's results are listed first (richer structured
// naming when it has a match); Photon contributes any additional candidates
// — notably abbreviated/partial input Nominatim can't match — that aren't
// within ~110m of a result Nominatim already found.
export async function searchPlaces(query, { limit = 6, signal } = {}) {
  const trimmed = String(query || '').trim()
  if (trimmed.length < 3) return []

  const [nominatimResult, photonResult] = await Promise.allSettled([
    fetchNominatimSearch(trimmed, { limit, signal }),
    fetchPhotonSearch(trimmed, { limit, signal }),
  ])

  const nominatimHits = nominatimResult.status === 'fulfilled' ? nominatimResult.value : []
  const photonHits = photonResult.status === 'fulfilled' ? photonResult.value : []

  // Interleaved, not concatenated: for an abbreviated/partial query (e.g.
  // "Potch") Nominatim alone can return `limit` worth of low-relevance noise
  // (streets, a cemetery) before ever reaching Photon's actually-correct
  // match — verified against a real query while building this. Alternating
  // providers guarantees each contributes its best guesses to the final
  // list rather than one drowning out the other.
  const seen = new Set()
  const merged = []
  const maxLen = Math.max(nominatimHits.length, photonHits.length)
  for (let i = 0; i < maxLen; i += 1) {
    for (const hit of [nominatimHits[i], photonHits[i]]) {
      if (!hit) continue
      const key = sameSpotKey(hit.latitude, hit.longitude)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(hit)
    }
  }

  // Both requests failing (offline, both providers down) is a real error the
  // caller should surface, not a silent empty list.
  if (nominatimResult.status === 'rejected' && photonResult.status === 'rejected') {
    throw new Error('Could not reach the location search service. Check your connection and try again.')
  }

  return merged.slice(0, limit).map((hit) => ({ ...hit, source: 'place-search' }))
}

// Reverse-geocode a coordinate pair (from GPS) into exactly one canonical
// location for the human to confirm. accuracyMeters, if provided, is passed
// straight through onto the result so <LocationPicker> can decide whether to
// show the "quite approximate" warning.
export async function reverseGeocode(lat, lng, { accuracyMeters = null, signal } = {}) {
  const url = `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`
  const response = await fetch(url, { headers: REQUEST_HEADERS, signal })
  if (!response.ok) throw new Error(`Reverse geocoding failed (HTTP ${response.status})`)
  const raw = await response.json()
  if (raw?.error) throw new Error('No known place found at that location.')
  const normalized = normalizeNominatimResult(raw)
  if (!normalized) throw new Error('That location is outside South Africa.')
  return { ...normalized, source: 'gps', accuracyMeters }
}

// Wraps navigator.geolocation in a promise with a typed, distinguishable
// error so the caller can show "permission denied" vs "unavailable" vs
// "timed out" as different messages instead of one generic failure.
export function getCurrentPosition({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 'unavailable', message: 'This device/browser cannot report a location.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? null,
        })
      },
      (error) => {
        const codes = { 1: 'permission-denied', 2: 'unavailable', 3: 'timeout' }
        const messages = {
          'permission-denied': 'Location permission was denied — search for the place instead.',
          unavailable: "Couldn't determine your location — search for the place instead.",
          timeout: 'Location took too long to find — search for the place instead.',
        }
        const code = codes[error.code] || 'unavailable'
        reject({ code, message: messages[code] })
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    )
  })
}
