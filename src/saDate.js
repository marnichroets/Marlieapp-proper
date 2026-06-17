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
