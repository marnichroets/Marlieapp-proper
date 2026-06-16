// Regression test for photo de-duplication (the localStorage/payload shrink).
// Self-contained (no network): builds a state whose photos are duplicated across
// sightings / birds / herPhotos / discoveries exactly like the real app, then
// asserts the de-dup round-trip is lossless and actually shrinks the payload.
// Run: node scripts/test-photo-pool.mjs
import assert from 'node:assert'
import { dedupePhotosForStorage, rehydratePhotos } from '../src/photoPool.js'

// Two fake "photos": long data: URLs, like the base64 the app stores.
const photoA = 'data:image/jpeg;base64,' + 'A'.repeat(4000)
const photoB = 'data:image/jpeg;base64,' + 'B'.repeat(4000)

// The same photo string is copied into every container, mirroring how
// buildBirdRecords / upsertBirdLibraryFromSighting duplicate a sighting's photo.
const state = {
  featherCoins: 470,
  tweety: { companion: 'robin', bornAt: '2026-06-14T05:33:56.782Z' },
  sightings: [
    { id: 's1', speciesKey: 'mandarin duck', photo: photoA, notes: 'first' },
    { id: 's2', speciesKey: 'mandarin duck', photo: photoA, notes: 'second' },
    { id: 's3', speciesKey: 'laughing dove', photo: photoB },
  ],
  birds: [
    { id: 'mandarin duck', count: 2, photo: photoA },
    { id: 'laughing dove', count: 1, photo: photoB },
  ],
  birdLibrary: [
    { id: 'mandarin duck', herPhotos: [{ id: 's1', photo: photoA }, { id: 's2', photo: photoA }] },
    { id: 'laughing dove', herPhotos: [{ id: 's3', photo: photoB }] },
  ],
  discoveries: [{ id: 'd1', speciesKey: 'mandarin duck', photo: photoA }],
  // A tricky string that merely contains "data:" but is short — must NOT be pooled.
  settings: { note: 'data: not a photo' },
}

const bytes = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8')

const pooled = dedupePhotosForStorage(state)
const restored = rehydratePhotos(pooled)

// 1. Lossless round-trip.
assert.deepStrictEqual(restored, state, 'rehydrate(dedupe(state)) must equal the original')

// 2. The original object was not mutated.
assert.strictEqual(state.sightings[0].photo, photoA, 'dedupe must not mutate the input state')

// 3. Only the 2 DISTINCT photos are stored, despite 9 inline copies.
const inlineCopies = JSON.stringify(state).split('"data:image').length - 1
assert.strictEqual(inlineCopies, 9, 'fixture should have 9 inline photo copies')
assert.strictEqual(pooled.__photoPool.length, 2, 'only 2 unique photos should be pooled')

// 4. The short "data:" string was left alone (not pooled).
assert.strictEqual(restored.settings.note, 'data: not a photo')

// 5. Real shrink.
const before = bytes(state)
const after = bytes(pooled)
assert(after < before, 'pooled payload must be smaller')

// 6. An empty/small state is returned unchanged (no __photoPool key added).
const small = dedupePhotosForStorage({ featherCoins: 10 })
assert(!('__photoPool' in small), 'a photo-free state must not gain a __photoPool')
assert.deepStrictEqual(rehydratePhotos(small), small, 'photo-free state round-trips identically')

console.log('✅ ALL PHOTO-POOL ASSERTIONS PASSED')
console.log(`   ${inlineCopies} inline copies -> 2 pooled | ${before} -> ${after} bytes ` +
  `(${Math.round((1 - after / before) * 100)}% smaller)`)
