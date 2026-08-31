import assert from 'node:assert/strict'
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
assert(journey.gameDurationSeconds >= 120 && journey.gameDurationSeconds <= 1800, 'game ETA is bounded')
assert.equal(gameFlightDurationSeconds(800, 90) < gameFlightDurationSeconds(800, 30), true, 'faster species arrives sooner')

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

console.log('Bird Post journey checks passed.')
