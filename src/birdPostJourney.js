import { haversineDistanceKm } from './birdFlightSpeed.js'

export const BIRD_POST_STATUS = Object.freeze({
  WAITING: 'waiting-for-destination',
  IN_FLIGHT: 'in-flight',
  ARRIVED: 'arrived',
})

const MIN_GAME_SECONDS = 20 * 60
const MAX_GAME_SECONDS = 18 * 60 * 60
const DEPARTURE_OVERHEAD_SECONDS = 15 * 60
const GAME_TIME_COMPRESSION = 0.5

const finiteCoordinate = (value) => value !== null && value !== '' && Number.isFinite(Number(value))

export function usableBirdPostLocation(location) {
  return Boolean(location && location.enabled !== false && finiteCoordinate(location.latitude) && finiteCoordinate(location.longitude))
}

export function accountHomeLocation(settings = {}, accountId) {
  const pooks = accountId === 'pooks'
  const latitude = pooks ? settings.pooksLat : settings.senderLat
  const longitude = pooks ? settings.pooksLng : settings.senderLng
  if (!finiteCoordinate(latitude) || !finiteCoordinate(longitude)) return null
  return {
    label: (pooks ? settings.pooksAddress : settings.senderAddress) || 'Saved Bird Post address',
    latitude: Number(latitude),
    longitude: Number(longitude),
    updatedAt: pooks ? settings.pooksLocationUpdatedAt || null : settings.senderLocationUpdatedAt || null,
    source: 'saved-address',
    enabled: true,
  }
}

export function accountBirdPostLocation(settings = {}, accountId) {
  const current = settings.birdPostLocations?.[accountId]?.current
  if (usableBirdPostLocation(current)) return { ...current, source: 'current-location' }
  return accountHomeLocation(settings, accountId)
}

// Compress half of the bird's real distance/speed travel time into game time,
// with a small departure overhead so even a local delivery feels like a trip.
// The broad 18-hour ceiling prevents extreme South African routes flown by a
// slow species from routinely becoming multi-day waits.
export function gameFlightDurationSeconds(distanceKm, speciesSpeedKmh = 45) {
  const distance = Math.max(0, Number(distanceKm) || 0)
  const speed = Math.max(20, Number(speciesSpeedKmh) || 45)
  const compressedTravelSeconds = (distance / speed) * 60 * 60 * GAME_TIME_COMPRESSION
  return Math.round(Math.min(
    MAX_GAME_SECONDS,
    Math.max(MIN_GAME_SECONDS, DEPARTURE_OVERHEAD_SECONDS + compressedTravelSeconds),
  ))
}

export function journeyProgress(journey, now = Date.now()) {
  if (!journey?.departedAt || !journey?.estimatedArrivalAt) return 0
  if (journey.status === BIRD_POST_STATUS.ARRIVED || journey.delivered) return 1
  const start = new Date(journey.departedAt).getTime()
  const end = new Date(journey.estimatedArrivalAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.min(1, Math.max(0, (Number(now) - start) / (end - start)))
}

export function journeyPosition(journey, now = Date.now()) {
  if (!journey?.origin) return null
  const destination = journey.destination
  if (!usableBirdPostLocation(destination)) return { ...journey.origin }
  const progress = journeyProgress(journey, now)
  return {
    latitude: journey.origin.latitude + (destination.latitude - journey.origin.latitude) * progress,
    longitude: journey.origin.longitude + (destination.longitude - journey.origin.longitude) * progress,
  }
}

export function createBirdPostJourney({ id, sender, recipient, bird, message, origin, destination, sentAt, flightSpeedKmh }) {
  if (!sender || !recipient || sender === recipient) throw new Error('Bird Post requires two different accounts')
  if (!usableBirdPostLocation(origin)) throw new Error('Bird Post requires a sender location')
  const timestamp = sentAt || new Date().toISOString()
  const ready = usableBirdPostLocation(destination)
  const distanceKm = ready
    ? haversineDistanceKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    : null
  const durationSeconds = ready ? gameFlightDurationSeconds(distanceKm, flightSpeedKmh) : null
  return {
    id,
    sender,
    recipient,
    bird,
    message: String(message || '').trim(),
    origin: { ...origin },
    destination: ready ? { ...destination } : null,
    sentAt: timestamp,
    departedAt: ready ? timestamp : null,
    estimatedArrivalAt: ready ? new Date(new Date(timestamp).getTime() + durationSeconds * 1000).toISOString() : null,
    status: ready ? BIRD_POST_STATUS.IN_FLIGHT : BIRD_POST_STATUS.WAITING,
    distanceKm,
    flightSpeedKmh,
    gameDurationSeconds: durationSeconds,
    delivered: false,
    deliveredAt: null,
    read: false,
    arrivalNotifiedAt: null,
    destinationPromptedAt: null,
    routeHistory: [],
  }
}

export function legacyBirdPostJourney(post) {
  if (!post?.id) return null
  const sender = (post.direction || 'to-pooks') === 'to-marnich' ? 'pooks' : 'marnich'
  const recipient = sender === 'pooks' ? 'marnich' : 'pooks'
  const origin = { label: 'Saved departure', latitude: Number(post.senderLat), longitude: Number(post.senderLng), source: 'legacy' }
  const destination = finiteCoordinate(post.destLat) && finiteCoordinate(post.destLng)
    ? { label: 'Saved destination', latitude: Number(post.destLat), longitude: Number(post.destLng), source: 'legacy' }
    : null
  const sentAt = post.createdAt || new Date().toISOString()
  const estimatedArrivalAt = post.estimatedArrivalAt || (post.travelTimeSeconds
    ? new Date(new Date(sentAt).getTime() + post.travelTimeSeconds * 1000).toISOString()
    : null)
  const distanceKm = usableBirdPostLocation(origin) && usableBirdPostLocation(destination)
    ? haversineDistanceKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    : null
  return {
    id: post.id,
    sender,
    recipient,
    bird: post.birdSpeciesId,
    message: post.message || '',
    origin,
    destination,
    sentAt,
    departedAt: post.departedAt || sentAt,
    estimatedArrivalAt,
    status: post.delivered ? BIRD_POST_STATUS.ARRIVED : destination ? BIRD_POST_STATUS.IN_FLIGHT : BIRD_POST_STATUS.WAITING,
    distanceKm,
    flightSpeedKmh: post.flightSpeedKmh || null,
    gameDurationSeconds: post.travelTimeSeconds || null,
    delivered: Boolean(post.delivered),
    deliveredAt: post.deliveredAt || null,
    read: Boolean(post.read),
    arrivalNotifiedAt: post.arrivalNotifiedAt || (post.delivered ? post.deliveredAt || sentAt : null),
    destinationPromptedAt: post.destinationPromptedAt || null,
    routeHistory: Array.isArray(post.routeHistory) ? post.routeHistory : [],
    legacy: true,
  }
}

export function normalizeBirdPostJourneys(journeys, legacyPost) {
  const seen = new Set()
  const normalized = (Array.isArray(journeys) ? journeys : [])
    .filter((journey) => journey?.id && !seen.has(journey.id) && seen.add(journey.id))
    .map((journey) => ({
      delivered: false,
      deliveredAt: null,
      read: false,
      arrivalNotifiedAt: null,
      destinationPromptedAt: null,
      routeHistory: [],
      ...journey,
    }))
  const legacy = legacyBirdPostJourney(legacyPost)
  if (!legacy || normalized.some((journey) => journey.id === legacy.id)) return normalized
  return [...normalized, legacy]
}

export function startWaitingJourney(journey, destination, now = new Date().toISOString()) {
  if (journey?.status !== BIRD_POST_STATUS.WAITING || !usableBirdPostLocation(destination)) return journey
  const distanceKm = haversineDistanceKm(journey.origin.latitude, journey.origin.longitude, destination.latitude, destination.longitude)
  const duration = gameFlightDurationSeconds(distanceKm, journey.flightSpeedKmh)
  return {
    ...journey,
    destination: { ...destination },
    departedAt: now,
    estimatedArrivalAt: new Date(new Date(now).getTime() + duration * 1000).toISOString(),
    status: BIRD_POST_STATUS.IN_FLIGHT,
    distanceKm,
    gameDurationSeconds: duration,
  }
}

export function rerouteJourney(journey, destination, now = new Date().toISOString()) {
  if (journey?.status !== BIRD_POST_STATUS.IN_FLIGHT || !usableBirdPostLocation(destination)) return journey
  const current = journeyPosition(journey, new Date(now).getTime())
  const distanceKm = haversineDistanceKm(current.latitude, current.longitude, destination.latitude, destination.longitude)
  const duration = gameFlightDurationSeconds(distanceKm, journey.flightSpeedKmh)
  return {
    ...journey,
    routeHistory: [...(journey.routeHistory || []), {
      origin: journey.origin,
      destination: journey.destination,
      departedAt: journey.departedAt,
      estimatedArrivalAt: journey.estimatedArrivalAt,
      changedAt: now,
    }],
    origin: { ...current, label: 'Changed course here', source: 'reroute-position' },
    destination: { ...destination },
    departedAt: now,
    estimatedArrivalAt: new Date(new Date(now).getTime() + duration * 1000).toISOString(),
    distanceKm,
    gameDurationSeconds: duration,
  }
}

export function settleJourneyArrival(journey, now = new Date().toISOString()) {
  if (!journey || journey.status !== BIRD_POST_STATUS.IN_FLIGHT) return { journey, arrivedNow: false }
  if (new Date(now).getTime() < new Date(journey.estimatedArrivalAt).getTime()) return { journey, arrivedNow: false }
  return {
    arrivedNow: true,
    journey: {
      ...journey,
      status: BIRD_POST_STATUS.ARRIVED,
      delivered: true,
      deliveredAt: journey.deliveredAt || now,
      arrivalNotifiedAt: journey.arrivalNotifiedAt || now,
    },
  }
}

export function journeysForAccount(journeys, accountId) {
  return (journeys || []).filter((journey) => journey.sender === accountId || journey.recipient === accountId)
}
