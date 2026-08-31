// Bird Post — per-species flight speeds (km/h) and the small geo helpers the
// feature needs. Every species that has a template in birdColourMap.js gets a
// speed, deterministically derived from its id so the map is stable across
// reloads without hand-authoring 370+ entries (same "generate, don't
// hand-write the bulk pass" approach birdColourMap.js itself documents).
import { BIRD_COLOUR_MAP } from './birdColourMap.js'

// km/h range per template, straight from the brief.
const TEMPLATE_SPEED_RANGE = {
  swallow: [90, 110],
  raptor: [65, 90],
  dove: [60, 80],
  waterbird: [55, 70],
  weaver: [40, 55],
  starling: [40, 55],
  'songbird-small': [25, 40],
  sunbird: [25, 40],
  kingfisher: [25, 40],
  barbet: [25, 40],
  longtail: [25, 40],
  'songbird-crested': [25, 40],
}

const FALLBACK_RANGE = TEMPLATE_SPEED_RANGE['songbird-small']

function hashSpeciesId(id) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

// A stable pseudo-random position within the template's range, keyed by the
// species id — same species always gets the same speed.
function speedForSpecies(id, template) {
  const [min, max] = TEMPLATE_SPEED_RANGE[template] || FALLBACK_RANGE
  const fraction = (hashSpeciesId(id) % 1000) / 1000
  return Math.round(min + fraction * (max - min))
}

export const BIRD_FLIGHT_SPEED = Object.fromEntries(
  Object.entries(BIRD_COLOUR_MAP).map(([id, entry]) => [id, speedForSpecies(id, entry.template)]),
)

export function flightSpeedForSpecies(id) {
  return BIRD_FLIGHT_SPEED[id] || Math.round((FALLBACK_RANGE[0] + FALLBACK_RANGE[1]) / 2)
}

// Great-circle distance in km between two lat/lng points.
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// "3h 12m", "2d 4h", "45s" — short and readable for an ETA/ toast.
export function formatDurationShort(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}
