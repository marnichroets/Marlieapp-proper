// Photo de-duplication at the persistence boundary.
//
// Sightings are the single source of truth for photos; birds[].photo,
// birdLibrary[].herPhotos[] and discoveries[].photo are byte-identical copies of
// the same base64 string. Storing all of them inline tripled localStorage (and
// the synced backend payload). At save time we pool every distinct photo string
// once and replace each occurrence with a tiny reference token; at load time we
// expand the tokens back, so the in-memory state shape is unchanged and no
// render code needs to know about pooling. Old (un-pooled) saves load as-is and
// migrate to the pooled format on their next save — no data is lost.
//
// The token uses a control-char sentinel ( + "ph:") that cannot occur in
// real photo data (which starts with "data:") or in any user-entered text, so a
// reference can never collide with a genuine value.

export const PHOTO_REF_PREFIX = 'ph:'

export const isPoolablePhoto = (v) =>
  typeof v === 'string' && v.startsWith('data:') && v.length > 100

export function dedupePhotosForStorage(state) {
  if (!state || typeof state !== 'object') return state
  const pool = []
  const index = new Map()
  const walk = (val) => {
    if (Array.isArray(val)) return val.map(walk)
    if (val && typeof val === 'object') {
      const out = {}
      for (const key of Object.keys(val)) out[key] = walk(val[key])
      return out
    }
    if (isPoolablePhoto(val)) {
      let id = index.get(val)
      if (id === undefined) {
        id = pool.length
        pool.push(val)
        index.set(val, id)
      }
      return `${PHOTO_REF_PREFIX}${id}`
    }
    return val
  }
  const next = walk(state)
  // Only attach the pool when something was pooled, so an empty/small state
  // serializes exactly as it did before this change.
  if (pool.length) next.__photoPool = pool
  return next
}

export function rehydratePhotos(stored) {
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.__photoPool)) {
    return stored
  }
  const pool = stored.__photoPool
  const walk = (val) => {
    if (Array.isArray(val)) return val.map(walk)
    if (val && typeof val === 'object') {
      const out = {}
      for (const key of Object.keys(val)) {
        if (key === '__photoPool') continue
        out[key] = walk(val[key])
      }
      return out
    }
    if (typeof val === 'string' && val.startsWith(PHOTO_REF_PREFIX)) {
      const id = Number(val.slice(PHOTO_REF_PREFIX.length))
      return pool[id] !== undefined ? pool[id] : ''
    }
    return val
  }
  return walk(stored)
}
