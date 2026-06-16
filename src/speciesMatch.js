// Pure species-matching helpers (no components, so Fast Refresh stays happy).

// Normalise a bird name for comparison: trim, lowercase, unify curly/straight
// apostrophes and collapse runs of whitespace. This is the key the collection
// groups sightings by, so tiny text differences from the AI map to one species.
export function normalizeBirdName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
}

// Defence-in-depth species matching. The collection groups sightings by a
// speciesKey (a normalised common name). The AI can return the same species
// with slightly different common-name text run to run (spacing, capitalisation,
// a trailing "(Scientific name)"), which would otherwise create a second,
// unmatched entry — the duplicate-as-new-discovery bug. So whenever a scientific
// name is available we canonicalise onto the key an EXISTING record already uses
// for that scientific name, reusing it instead of minting a new one. Fully
// backward compatible: with no scientific match we fall back to the common-name
// key, so existing saves keep their current keys.
export function canonicalSpeciesKey(state, birdName, scientificName) {
  const base = normalizeBirdName(birdName)
  const sciKey = normalizeBirdName(scientificName)
  if (!sciKey) return base
  const matchesSci = (value) => value && normalizeBirdName(value) === sciKey
  const bird = (state.birds || []).find((b) => matchesSci(b.scientificName))
  if (bird) return bird.id
  const sighting = (state.sightings || []).find(
    (s) => matchesSci(s.scientificName) || matchesSci(s.aiMatch?.scientificName),
  )
  if (sighting) return sighting.speciesKey
  return base
}
