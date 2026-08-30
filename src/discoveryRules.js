import { normalizeBirdName } from './speciesMatch.js'

export function findOfficialBird(defaultLibrary, { commonName, scientificName } = {}) {
  const commonKey = normalizeBirdName(commonName)
  const scientificKey = normalizeBirdName(scientificName)
  const byCommon = defaultLibrary.find((bird) => normalizeBirdName(bird.commonName) === commonKey)
  if (byCommon) return byCommon
  if (!scientificKey) return null
  return defaultLibrary.find((bird) => normalizeBirdName(bird.scientificName) === scientificKey) || null
}

export function isOfficialBird(defaultLibrary, candidate) {
  return Boolean(findOfficialBird(defaultLibrary, candidate))
}

export function isHistoricalDiscovery(defaultLibrary, discovery) {
  return !isOfficialBird(defaultLibrary, {
    commonName: discovery?.birdName,
    scientificName: discovery?.scientificName,
  })
}
