function cleanImageUrl(value) {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (!url || /placeholder|placehold/i.test(url)) return ''
  return url
}

function normalise(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function sightingMatchesBird(sighting, bird) {
  const birdNames = [bird?.commonName, bird?.scientificName].map(normalise).filter(Boolean)
  const sightingNames = [
    sighting?.birdName,
    sighting?.speciesName,
    sighting?.aiMatch?.commonName,
    sighting?.aiMatch?.scientificName,
  ].map(normalise).filter(Boolean)
  return birdNames.some((name) => sightingNames.includes(name)) || sighting?.speciesKey === bird?.id
}

export function usableBirdImage(value) {
  return cleanImageUrl(value)
}

/** Personal photos first, including legacy sightings and stored herPhotos. */
export function getPersonalBirdPhotos(bird, sightings = []) {
  const sightingPhotos = sightings
    .filter((sighting) => sightingMatchesBird(sighting, bird))
    .sort((a, b) => String(b.dateSpotted || b.createdAt || '').localeCompare(String(a.dateSpotted || a.createdAt || '')))
    .map((sighting) => sighting.photo)
  const storedPhotos = (Array.isArray(bird?.herPhotos) ? bird.herPhotos : [])
    .slice()
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
    .map((photo) => photo?.photo)
  return [...new Set([...sightingPhotos, ...storedPhotos].map(cleanImageUrl).filter(Boolean))]
}

export function getBirdImageSources(bird, sightings = []) {
  return [...new Set([
    ...getPersonalBirdPhotos(bird, sightings),
    cleanImageUrl(bird?.imageUrl),
  ].filter(Boolean))]
}
