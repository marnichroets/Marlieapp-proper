// Tests that slimming the bird library for storage is lossless: only the user's
// own birds are persisted, and mergeBirdLibrary rebuilds the full catalog on
// load with user data intact. Uses the REAL functions from birdLibraryStorage.js.
// Run: node scripts/test-library-slim.mjs
import assert from 'node:assert'
import { mergeBirdLibrary, slimBirdLibrary } from '../src/birdLibraryStorage.js'

// A tiny bundled catalog (static reference data, like defaultBirdLibrary).
const bundled = [
  { id: 'a', commonName: 'Bird A', imageUrl: 'urlA', funFacts: ['fa'], seen: false },
  { id: 'b', commonName: 'Bird B', imageUrl: 'urlB', funFacts: ['fb'], seen: false },
  { id: 'c', commonName: 'Bird C', imageUrl: 'urlC', funFacts: ['fc'], seen: false },
  { id: 'd', commonName: 'Bird D', imageUrl: 'urlD', funFacts: ['fd'], seen: false },
]
const defaultIds = new Set(bundled.map((b) => b.id))

// The full in-memory library: she has SEEN 'a' (with her photo + notes), and has
// a CUSTOM discovery 'z' that isn't in the bundle. b/c/d are untouched.
const fullLibrary = [
  { id: 'a', commonName: 'Bird A', imageUrl: 'urlA', funFacts: ['fa'], seen: true, herPhotos: [{ id: 's1', photo: 'p' }], fieldNotes: 'cute', timesSeen: 2 },
  { id: 'b', commonName: 'Bird B', imageUrl: 'urlB', funFacts: ['fb'], seen: false },
  { id: 'c', commonName: 'Bird C', imageUrl: 'urlC', funFacts: ['fc'], seen: false },
  { id: 'd', commonName: 'Bird D', imageUrl: 'urlD', funFacts: ['fd'], seen: false },
  { id: 'z', commonName: 'Custom Z', imageUrl: 'urlZ', seen: false, custom: true },
]

// 1. Slim keeps only the seen bird + the custom bird.
const slim = slimBirdLibrary(fullLibrary, defaultIds)
assert.deepStrictEqual(slim.map((b) => b.id).sort(), ['a', 'z'], 'slim should keep only seen + custom birds')

// 2. Reconstruct on load and check nothing meaningful was lost.
const restored = mergeBirdLibrary(bundled, slim)

const byId = Object.fromEntries(restored.map((b) => [b.id, b]))
// Seen bird keeps ALL her data.
assert.strictEqual(byId.a.seen, true)
assert.deepStrictEqual(byId.a.herPhotos, [{ id: 's1', photo: 'p' }], 'her photos survive')
assert.strictEqual(byId.a.fieldNotes, 'cute', 'her notes survive')
assert.strictEqual(byId.a.timesSeen, 2)
// Unseen birds are fully rebuilt from the bundle (static data present, unseen).
for (const id of ['b', 'c', 'd']) {
  assert.strictEqual(byId[id].commonName, `Bird ${id.toUpperCase()}`, `${id} name restored`)
  assert.strictEqual(byId[id].imageUrl, `url${id.toUpperCase()}`, `${id} photo URL restored`)
  assert.strictEqual(byId[id].seen, false, `${id} stays unseen`)
}
// Custom bird is preserved (it can't be rebuilt from the bundle).
assert.strictEqual(byId.z.commonName, 'Custom Z', 'custom bird preserved')
assert.strictEqual(restored.length, 5, 'full catalog (4 bundled + 1 custom) restored')

// 3. Growing the catalog must NOT grow the slimmed (persisted) library.
const biggerBundle = [...bundled, { id: 'e', commonName: 'Bird E', imageUrl: 'urlE', seen: false }]
const fullAfterGrowth = mergeBirdLibrary(biggerBundle, slim) // load against bigger catalog
const slimAfterGrowth = slimBirdLibrary(fullAfterGrowth, new Set(biggerBundle.map((b) => b.id)))
assert.deepStrictEqual(slimAfterGrowth.map((b) => b.id).sort(), ['a', 'z'],
  'adding catalog birds does not add to persisted state')

console.log('✅ ALL LIBRARY-SLIM ASSERTIONS PASSED')
console.log(`   full library ${fullLibrary.length} birds -> persisted ${slim.length} (only her own)`)
console.log('   catalog grew 4 -> 5 birds with ZERO change to persisted size')
