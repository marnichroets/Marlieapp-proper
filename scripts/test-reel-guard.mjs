import assert from 'node:assert/strict'
import {
  REEL_ACCOUNT,
  accountStorageKey,
  canPersistAccount,
  canSyncAccount,
  fieldFolioEnabled,
  isReelAccount,
  isReelSession,
  reelRequested,
  storyCardFilename,
} from '../src/reelGuard.js'
import {
  REEL_BIRD_NAMES,
  REEL_PLANT_IDS,
  assertReelPatchKeepsCatalogIds,
  buildReelPatch,
} from '../src/reelWorld.js'

const keys = { pooks: 'pooks-key', marnich: 'marnich-key' }

assert.equal(canPersistAccount('pooks'), true)
assert.equal(canPersistAccount('marnich'), true)
assert.equal(canPersistAccount(REEL_ACCOUNT), false)
assert.equal(canPersistAccount('admin'), false)
assert.equal(canSyncAccount('reel'), false)
assert.equal(canSyncAccount('pooks'), true)
assert.equal(accountStorageKey('pooks', keys), 'pooks-key')
assert.equal(accountStorageKey('marnich', keys), 'marnich-key')
assert.equal(accountStorageKey('reel', keys), null)
assert.equal(accountStorageKey('stranger', keys), null)
assert.equal(isReelAccount('reel'), true)
assert.equal(isReelSession({ role: 'reel', name: 'Field Guest' }), true)
assert.equal(isReelSession({ role: 'pooks' }), false)
assert.equal(reelRequested('?reel=1', ''), true)
assert.equal(reelRequested('demo=1', ''), true)
assert.equal(reelRequested('', '#reel'), true)
assert.equal(reelRequested('', ''), false)
assert.equal(fieldFolioEnabled({}), false)
assert.equal(fieldFolioEnabled({ envFlag: '1' }), true)
assert.equal(fieldFolioEnabled({ storageFlag: '1' }), true)
assert.equal(fieldFolioEnabled({ reel: true }), true)
assert.equal(storyCardFilename('Malachite Sunbird'), 'pooksbooks-malachite-sunbird-story.png')

const library = REEL_BIRD_NAMES.map((commonName, index) => ({
  id: `bird-${index}`,
  commonName,
  scientificName: `Genus species${index}`,
  rarity: index % 5 === 0 ? 'Rare' : 'Common',
  description: 'A field note.',
}))
const plants = REEL_PLANT_IDS.map((id) => ({
  id,
  commonName: id,
  scientificName: `Plantae ${id}`,
  funFact: 'Sample',
  imageUrl: '',
}))
const snapshot = JSON.stringify(library)
const patch = buildReelPatch(library, plants, Date.parse('2026-10-20T12:00:00Z'))
assert.equal(JSON.stringify(library), snapshot, 'reel seeding must not mutate catalog birds')
assert.equal(assertReelPatchKeepsCatalogIds(patch, library, plants), true)
assert.equal(patch.reelSample, true)
assert.equal(patch.discoveries.length, 0)
assert.ok(patch.birdLibrary.length >= 3)
assert.ok(patch.plantLibrary.every((plant) => plant.catalogId === plant.id.replace('reel-plant-', '')))
assert.ok(patch.garden.plantings.every((planting) => planting.id.startsWith('reel-')))
assert.equal(patch.reelSample, true)

console.log('reel guard tests passed')
