// Live weather -> the Garden scene's visual sky state (clear / cloudy / rain
// / windy / fog). Purely presentational: never touches saved garden data,
// never persists anything to disk (no localStorage, nothing synced) — just
// a client-side read of "what's it like outside right now", held in memory
// for as long as the Garden page is open. Silently falls back to 'clear'
// (today's normal sky, no weather effects) on denied/unavailable geolocation
// or any network failure — no retries, no nagging, no alternate-location
// guessing.

const GEO_OPTIONS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 20 * 60 * 1000 }
const FETCH_TIMEOUT_MS = 6000

// A real place can be raining AND windy at once, but the Garden scene only
// ever renders one weather look — precipitation is the most visually
// dominant condition, fog is the next most visibility-defining, wind (pure
// motion, no sky-color change) comes before the baseline cloudy/clear read.
// ~28 km/h is roughly Beaufort 5 ("branches move noticeably").
const WIND_THRESHOLD_KMH = 28

function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null), // any error (denied, unavailable, timeout) -> caller falls back to 'clear'
      GEO_OPTIONS,
    )
  })
}

// WMO weather codes (see https://open-meteo.com/en/docs) collapsed to the
// five visual buckets the Garden scene actually renders differently, applied
// in priority order: rain > fog > windy > cloudy > clear.
function bucketForCode(code, cloudCover, windSpeedKmh) {
  const isPrecipitation =
    (code >= 51 && code <= 67) || // drizzle / rain
    (code >= 71 && code <= 77) || // snow — folded into the rain/precipitation visual, no separate snow art
    (code >= 80 && code <= 86) || // rain or snow showers
    (code >= 95 && code <= 99) // thunderstorm
  if (isPrecipitation) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (typeof windSpeedKmh === 'number' && windSpeedKmh >= WIND_THRESHOLD_KMH) return 'windy'
  if (code >= 2 && code <= 3) return 'cloudy' // partly cloudy through overcast
  if (code === 1 && (cloudCover ?? 0) > 50) return 'cloudy' // "mainly clear" but actually hazy
  return 'clear'
}

async function fetchOpenMeteo(lat, lon) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,cloud_cover,wind_speed_10m`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    const code = data?.current?.weather_code
    const cloudCover = data?.current?.cloud_cover
    const windSpeedKmh = data?.current?.wind_speed_10m
    if (typeof code !== 'number') return null
    return bucketForCode(code, cloudCover, windSpeedKmh)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Resolves to 'clear' | 'cloudy' | 'rain' | 'windy' | 'fog' — never rejects,
// never throws.
export async function fetchGardenWeather() {
  const pos = await getPosition()
  if (!pos) return 'clear'
  const bucket = await fetchOpenMeteo(pos.lat, pos.lon)
  return bucket || 'clear'
}
