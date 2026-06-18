// Canonical day key for the app: the South African local date (SAST = UTC+2,
// no daylight saving), formatted YYYY-MM-DD.
//
// Date-gated features (the special Council messages, the daily challenges and
// the seasonal / Cape Town visual theme) all key off this, so they roll over
// together at local SA midnight regardless of the device's own timezone — no
// ~2h gap near midnight. On a device already set to SA time this returns the
// same value device-local date math would, so existing streak/completion keys
// stay continuous.

const SA_OFFSET_MS = 2 * 60 * 60 * 1000

export function saDateKey(date = new Date()) {
  const sa = new Date(date.getTime() + SA_OFFSET_MS)
  const year = sa.getUTCFullYear()
  const month = String(sa.getUTCMonth() + 1).padStart(2, '0')
  const day = String(sa.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// SA date key for N days ago (N > 0) or ahead (N < 0).
export function saDateKeyOffset(days = 0) {
  return saDateKey(new Date(Date.now() - days * 86400000))
}

// SA local hour (0..23). Used by the Bird Garden's day/night scene so it
// reflects the actual current South African time regardless of device timezone.
export function saHour(date = new Date()) {
  const sa = new Date(date.getTime() + SA_OFFSET_MS)
  return sa.getUTCHours()
}

// Time-of-day phase for the garden scene, from SA local time:
//   morning 06:00–10:00, midday 10:00–16:00, evening 16:00–19:00, night 19:00–06:00.
export function saTimePhase(date = new Date()) {
  const h = saHour(date)
  if (h >= 6 && h < 10) return 'morning'
  if (h >= 10 && h < 16) return 'midday'
  if (h >= 16 && h < 19) return 'evening'
  return 'night'
}
