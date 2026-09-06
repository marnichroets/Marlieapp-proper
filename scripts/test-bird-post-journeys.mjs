import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  BIRD_POST_STATUS,
  accountBirdPostLocation,
  createBirdPostJourney,
  gameFlightDurationSeconds,
  journeyPosition,
  journeyProgress,
  journeysForAccount,
  normalizeBirdPostJourneys,
  rerouteJourney,
  settleJourneyArrival,
  startWaitingJourney,
} from '../src/birdPostJourney.js'
import {
  birdPostJourneySurfaces,
  messagesVisibleToAccount,
} from '../src/birdPostVisibility.js'

const origin = { label: 'Potchefstroom', latitude: -26.7145, longitude: 27.097, enabled: true }
const destination = { label: 'Grahamstown', latitude: -33.3106, longitude: 26.5256, enabled: true }
const movedDestination = { label: 'Cape Town', latitude: -33.9249, longitude: 18.4241, enabled: true }
const sentAt = '2026-08-30T12:00:00.000Z'

const currentSettings = {
  birdPostLocations: { pooks: { current: { ...destination, updatedAt: sentAt } } },
  pooksAddress: 'Saved Pooks home', pooksLat: -26.7, pooksLng: 27.1,
  senderAddress: 'Saved Marnich home', senderLat: -26.71, senderLng: 27.09,
}

assert.equal(accountBirdPostLocation(currentSettings, 'pooks').source, 'current-location', 'current location wins')
assert.equal(accountBirdPostLocation({ ...currentSettings, birdPostLocations: {} }, 'pooks').source, 'saved-address', 'saved address is fallback')
assert.equal(accountBirdPostLocation({}, 'pooks'), null, 'missing destination stays missing')

const waiting = createBirdPostJourney({
  id: 'wait-1', sender: 'marnich', recipient: 'pooks', bird: 'cape-robin-chat',
  message: 'Hello', origin, destination: null, sentAt, flightSpeedKmh: 38,
})
assert.equal(waiting.status, BIRD_POST_STATUS.WAITING, 'no destination creates waiting journey')
assert.equal(waiting.departedAt, null)

const journey = createBirdPostJourney({
  id: 'flight-1', sender: 'marnich', recipient: 'pooks', bird: 'cape-robin-chat',
  message: 'Hello', origin, destination, sentAt, flightSpeedKmh: 38,
})
assert.equal(journey.sender, 'marnich')
assert.equal(journey.recipient, 'pooks')
assert.equal(journey.message, 'Hello', 'the letter remains attached to its durable journey')
assert.notEqual(journey.sender, journey.recipient, 'sender and recipient cannot reverse into one account')
assert.equal(journey.status, BIRD_POST_STATUS.IN_FLIGHT)
assert(journey.distanceKm > 700 && journey.distanceKm < 800, 'real SA distance is calculated')
assert(journey.gameDurationSeconds >= 5 * 3600 && journey.gameDurationSeconds <= 10 * 3600, 'long SA journey lasts hours')
assert.equal(gameFlightDurationSeconds(800, 90) < gameFlightDurationSeconds(800, 30), true, 'faster species arrives sooner')

const shortDuration = gameFlightDurationSeconds(20, 45)
const nearbyDuration = gameFlightDurationSeconds(120, 45)
const mediumDuration = gameFlightDurationSeconds(400, 45)
const longDuration = gameFlightDurationSeconds(800, 45)
assert(shortDuration >= 20 * 60 && shortDuration <= 45 * 60, 'short/local journey lasts about 20–45 minutes')
assert(nearbyDuration >= 3600 && nearbyDuration <= 2 * 3600, 'nearby town journey lasts about 1–2 hours')
assert(mediumDuration >= 2 * 3600 && mediumDuration <= 5 * 3600, 'medium SA journey lasts about 2–5 hours')
assert(longDuration >= 5 * 3600 && longDuration <= 10 * 3600, 'long cross-country journey lasts about 5–10 hours')
assert(gameFlightDurationSeconds(400, 90) < gameFlightDurationSeconds(400, 30), 'species speed changes ETA')

const midpointMs = (new Date(journey.departedAt).getTime() + new Date(journey.estimatedArrivalAt).getTime()) / 2
assert(Math.abs(journeyProgress(journey, midpointMs) - 0.5) < 0.0001, 'progress derives from timestamps')
const midpoint = journeyPosition(journey, midpointMs)
assert(Math.abs(midpoint.latitude - (origin.latitude + destination.latitude) / 2) < 0.0001, 'reload reconstructs position')

const started = startWaitingJourney(waiting, destination, '2026-08-30T12:05:00.000Z')
assert.equal(started.status, BIRD_POST_STATUS.IN_FLIGHT, 'sharing recipient location starts waiting journey')

const rerouteAt = new Date(new Date(journey.departedAt).getTime() + journey.gameDurationSeconds * 250).toISOString()
const beforeReroute = journeyPosition(journey, new Date(rerouteAt).getTime())
const rerouted = rerouteJourney(journey, movedDestination, rerouteAt)
assert(Math.abs(rerouted.origin.latitude - beforeReroute.latitude) < 0.000001, 'reroute starts at current bird position')
assert.equal(rerouted.destination.label, 'Cape Town')
assert.equal(rerouted.routeHistory.length, 1, 'reroute preserves route history')
assert.equal(rerouted.gameDurationSeconds, gameFlightDurationSeconds(rerouted.distanceKm, journey.flightSpeedKmh), 'reroute recalculates ETA from remaining geographic distance and species speed')
assert.equal(new Date(rerouted.estimatedArrivalAt).getTime(), new Date(rerouteAt).getTime() + rerouted.gameDurationSeconds * 1000, 'reroute ETA starts from change-of-course time')

const beforeEta = new Date(journey.estimatedArrivalAt).getTime() - 1
assert.equal(settleJourneyArrival(journey, new Date(beforeEta).toISOString()).arrivedNow, false)
const firstArrival = settleJourneyArrival(journey, journey.estimatedArrivalAt)
assert.equal(firstArrival.arrivedNow, true, 'arrival occurs at ETA')
assert(firstArrival.journey.arrivalNotifiedAt, 'arrival records notification marker')
assert.equal(settleJourneyArrival(firstArrival.journey, journey.estimatedArrivalAt).arrivedNow, false, 'arrival and notification occur once')

const legacy = {
  id: 'legacy-1', direction: 'to-pooks', birdSpeciesId: 'hadeda-ibis', message: 'Legacy',
  senderLat: origin.latitude, senderLng: origin.longitude, destLat: destination.latitude,
  destLng: destination.longitude, createdAt: sentAt, travelTimeSeconds: 600,
  delivered: false, read: false,
}
const normalizedOnce = normalizeBirdPostJourneys([], legacy)
const normalizedAgain = normalizeBirdPostJourneys(normalizedOnce, legacy)
assert.equal(normalizedAgain.length, 1, 'legacy record is not duplicated on refresh')
assert.equal(normalizedAgain[0].sender, 'marnich')
assert.equal(normalizedAgain[0].recipient, 'pooks', 'legacy direction remains correct')
assert.equal(normalizeBirdPostJourneys([journey, journey], null).length, 1, 'duplicate durable journey IDs are collapsed')
const reloaded = JSON.parse(JSON.stringify(journey))
assert.equal(journeyProgress(reloaded, midpointMs), journeyProgress(journey, midpointMs), 'reload reconstructs timestamp progress exactly')
assert.equal(reloaded.message, 'Hello', 'reload preserves the message carried by the bird')

const visible = [journey, createBirdPostJourney({
  id: 'other', sender: 'pooks', recipient: 'marnich', bird: 'hadeda-ibis', message: 'Back',
  origin: destination, destination: origin, sentAt, flightSpeedKmh: 45,
})]
assert.equal(journeysForAccount(visible, 'pooks').length, 2, 'Pooks sees sent and received journeys')
assert.equal(journeysForAccount(visible, 'marnich').length, 2, 'Marnich sees sent and received journeys')
assert.throws(() => createBirdPostJourney({ id: 'bad', sender: 'pooks', recipient: 'pooks', bird: 'x', origin, destination, flightSpeedKmh: 40 }))

const arrivedToPooks = settleJourneyArrival(journey, journey.estimatedArrivalAt).journey
const pooksSurfaces = birdPostJourneySurfaces([journey, arrivedToPooks], 'pooks')
const marnichSurfaces = birdPostJourneySurfaces([journey, arrivedToPooks], 'marnich')
assert.equal(pooksSurfaces.incoming.length, 1, 'recipient sees the incoming journey')
assert.equal(marnichSurfaces.incoming.length, 0, 'sender does not see their own journey as incoming')
assert.equal(marnichSurfaces.inFlight.some((entry) => entry.id === journey.id), true, 'sender sees in-flight status')
assert.equal(pooksSurfaces.inFlight.some((entry) => entry.id === journey.id), true, 'recipient sees the correct in-flight journey')
assert.equal(marnichSurfaces.history.some((entry) => entry.id === arrivedToPooks.id), true, 'delivered status appears for sender')

const waitingNotification = {
  id: `birdpost-destination-${journey.id}`,
  title: 'Marnich sent you a bird! 🐦',
  audienceAccountId: 'pooks',
  birdPostJourneyId: journey.id,
}
const arrivalNotification = {
  id: `birdpost-arrived-${journey.id}`,
  title: 'A bird arrived',
  audienceAccountId: 'pooks',
  birdPostJourneyId: journey.id,
}
assert.deepEqual(messagesVisibleToAccount([waitingNotification, arrivalNotification], [journey], 'marnich'), [], 'arrival notification only appears for recipient, not sender')
assert.equal(messagesVisibleToAccount([waitingNotification, arrivalNotification], [journey], 'pooks').length, 2, 'recipient sees waiting and arrival notifications')

const reverseJourney = visible.find((entry) => entry.sender === 'pooks')
const reverseArrived = settleJourneyArrival(reverseJourney, reverseJourney.estimatedArrivalAt).journey
const reversePooks = birdPostJourneySurfaces([reverseJourney, reverseArrived], 'pooks')
const reverseMarnich = birdPostJourneySurfaces([reverseJourney, reverseArrived], 'marnich')
assert.equal(reverseMarnich.incoming.length, 1, 'reverse recipient sees incoming journey')
assert.equal(reversePooks.incoming.length, 0, 'reverse sender does not see incoming journey')
assert.equal(reversePooks.history.some((entry) => entry.id === reverseArrived.id), true, 'reverse sender sees delivered status')

const legacyArrivalNotification = { id: `birdpost-arrived-${journey.id}`, title: 'Legacy arrival without audience metadata' }
assert.equal(messagesVisibleToAccount([legacyArrivalNotification], [journey], 'marnich').length, 0, 'legacy saved arrival is hidden from sender by journey recipient ID')
assert.equal(messagesVisibleToAccount([legacyArrivalNotification], [journey], 'pooks').length, 1, 'legacy saved arrival remains visible to recipient')

const mapSource = await readFile(new URL('../src/BirdMap.jsx', import.meta.url), 'utf8')
assert.match(mapSource, /routeViewBox/, 'live flight map uses a route-focused viewport')
assert.match(mapSource, /bird-flight-arrow/, 'live flight path shows direction with an arrow marker')
assert.match(mapSource, /flight-current-marker/, 'live flight map marks the bird current position')

console.log('Bird Post journey checks passed.')
