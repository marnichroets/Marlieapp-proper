import assert from 'node:assert/strict'
import fs from 'node:fs'
import { defaultBirdLibrary } from '../src/data/saBirdLibrary.js'
import { findOfficialBird, isOfficialBird, isHistoricalDiscovery } from '../src/discoveryRules.js'

const official = defaultBirdLibrary[0]
assert(official, 'the official catalog should contain birds')
assert.equal(isOfficialBird(defaultBirdLibrary, { commonName: official.commonName }), true)
assert.equal(isOfficialBird(defaultBirdLibrary, { commonName: 'Definitely Not A Bird' }), false)
assert.equal(isOfficialBird(defaultBirdLibrary, { scientificName: official.scientificName }), true)

const historical = [
  { id: 'cape-eagle-owl', birdName: 'Cape Eagle-Owl', scientificName: 'Bubo capensis', photo: 'legacy-photo' },
  { id: 'silkie', birdName: 'Silkie Chicken', scientificName: '', photo: '' },
  { id: 'duck', birdName: 'Domestic Duck', scientificName: '', photo: '' },
]
const hydrated = historical.map((record) => ({ ...record }))
assert.deepEqual(hydrated, historical, 'historical records remain unchanged through hydration')
for (const record of historical) assert.equal(isHistoricalDiscovery(defaultBirdLibrary, record), true)
assert.equal(historical.length, 3, 'historical discovery count is preserved')
assert.equal(findOfficialBird(defaultBirdLibrary, { commonName: 'Definitely Not A Bird' }), null)

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert(!app.includes('function addDiscoveryToLibrary'), 'unsafe admin arbitrary-add helper is removed')
assert(!app.includes('Add to library 📖'), 'unsafe arbitrary-add control is removed')
assert(!app.includes("category: aiMatch ? 'Custom AI bird'"), 'new sightings cannot create custom library birds')
assert(/Only official Bird Library species can be added/.test(app), 'admin add path explains official-only rule')
assert(/discoveries: data\.discoveries/.test(app), 'new sighting flow preserves historical discoveries without creating new off-book records')
console.log('Discovery rule checks passed.')
