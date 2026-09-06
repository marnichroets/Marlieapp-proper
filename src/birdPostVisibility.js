import { BIRD_POST_STATUS } from './birdPostJourney.js'

const accountParticipates = (journey, accountId) => (
  journey?.sender === accountId || journey?.recipient === accountId
)

export function birdPostJourneySurfaces(journeys = [], accountId) {
  const accountJourneys = journeys.filter((journey) => accountParticipates(journey, accountId))
  return {
    incoming: accountJourneys.filter((journey) => (
      journey.recipient === accountId
      && journey.status === BIRD_POST_STATUS.ARRIVED
      && !journey.read
    )),
    inFlight: accountJourneys.filter((journey) => (
      journey.status === BIRD_POST_STATUS.IN_FLIGHT
      || journey.status === BIRD_POST_STATUS.WAITING
    )),
    history: accountJourneys.filter((journey) => (
      journey.status === BIRD_POST_STATUS.ARRIVED
      && (journey.read || journey.sender === accountId)
    )),
  }
}

function journeyForBirdPostMessage(message, journeys) {
  if (message?.birdPostJourneyId) {
    return journeys.find((journey) => journey.id === message.birdPostJourneyId) || null
  }
  const id = String(message?.id || '')
  for (const prefix of ['birdpost-destination-', 'birdpost-arrived-']) {
    if (!id.startsWith(prefix)) continue
    const journeyId = id.slice(prefix.length)
    return journeys.find((journey) => journey.id === journeyId) || null
  }
  if (id.startsWith('birdpost-reroute-')) {
    return journeys.find((journey) => (
      (journey.routeHistory || []).some((route) => route.changedAt === message.date)
    )) || null
  }
  return null
}

export function birdPostMessageAudience(message, journeys = []) {
  if (message?.audienceAccountId) return message.audienceAccountId
  const journey = journeyForBirdPostMessage(message, journeys)
  if (!journey) return null
  return String(message.id || '').startsWith('birdpost-reroute-')
    ? journey.sender
    : journey.recipient
}

export function messagesVisibleToAccount(messages = [], journeys = [], accountId) {
  return messages.filter((message) => {
    const audience = birdPostMessageAudience(message, journeys)
    return !audience || audience === accountId
  })
}
