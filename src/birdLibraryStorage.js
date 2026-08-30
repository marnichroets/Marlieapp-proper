// Pure helpers for persisting the bird library compactly.
//
// The bird catalog (names, facts, reference photo URLs) is bundled static app
// data. We do NOT need to persist a copy of every catalog bird in each account's
// saved state — only the birds the user has actually interacted with carry
// per-user data (seen flags, her photos, field notes, sighting enrichment), plus
// any grandfathered historical birds that aren't in the bundle. Every other (unseen) bird is
// rebuilt from the bundled catalog on load by mergeBirdLibrary. This keeps saved
// state tiny no matter how large the catalog grows.

// Reconstruct the full library on load: spread each bundled (default) bird, then
// overlay the saved per-user data for that id, then append any saved historical
// birds that aren't in the bundle. Reference imageUrl/soundUrl always come from
// the bundle so they stay current.
export function mergeBirdLibrary(defaultItems, savedItems) {
  const saved = Array.isArray(savedItems) ? savedItems : []
  const savedMap = new Map(saved.map((item) => [item.id, item]))
  const merged = defaultItems.map((item) => ({
    ...item,
    ...(savedMap.get(item.id) || {}),
    imageUrl: item.imageUrl,
    soundUrl: item.soundUrl,
  }))
  const defaultKeys = new Set(defaultItems.map((item) => item.id))
  return [...merged, ...saved.filter((item) => !defaultKeys.has(item.id))]
}

// Slim the library for storage: keep only birds the user has seen (they carry
// user data / sighting enrichment) plus historical birds not in the bundled catalog
// (otherwise they'd be lost — they can't be rebuilt from the bundle). Unseen
// catalog birds are dropped and reconstructed by mergeBirdLibrary on load.
export function slimBirdLibrary(library, defaultIds) {
  if (!Array.isArray(library)) return library
  return library.filter((bird) => bird && (bird.seen || !defaultIds.has(bird.id)))
}
