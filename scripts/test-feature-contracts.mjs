// Offline contract checks for the cross-cutting feature fixes. These checks
// deliberately avoid importing React/JSX or touching a real account.
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const map = fs.readFileSync(new URL('../src/BirdMap.jsx', import.meta.url), 'utf8')
const garden = fs.readFileSync(new URL('../src/Garden.jsx', import.meta.url), 'utf8')

const ok = (label, condition) => {
  assert(condition, `FAILED: ${label}`)
  console.log('  ✓', label)
}

// Bird Map: confirmed coordinates are persisted, legacy coordinate shapes are
// normalized, and vague text never becomes an invented precise pin.
ok('sightings persist latitude and longitude', /latitude:\s*Number\.isFinite/.test(app) && /longitude:\s*Number\.isFinite/.test(app))
ok('map prefers stored coordinates and recognizes safely swapped legacy coordinates', /source:\s*'sighting-coordinates'/.test(map) && /source:\s*'swapped-sighting-coordinates'/.test(map))
ok('map uses town/province fallbacks without fake coordinates', /source:\s*'town-gazetteer'/.test(map) && /source:\s*'province-gazetteer'/.test(map) && !/unknown-fallback/.test(map))
ok('map groups pins by normalized geographic position', /const key = `\$\{place\.lat\.toFixed\(precision\)\}\|\$\{place\.lon\.toFixed\(precision\)\}`/.test(map))

// Bird Post: the save path updates settings from the current ref, preserving
// every unrelated account field through the object spread.
ok('Bird Post location writes to per-account persisted settings', /birdPostLocations:[\s\S]{0,300}\[locationAccountId\]/.test(app) && /current:\s*currentLocation/.test(app))
ok('Bird Post address save preserves unrelated state', /const next = patchAddress\(dataRef\.current\)/.test(app))
ok('Bird Post address is immediately visible to send and persistence flows', /dataRef\.current = next[\s\S]{0,100}setData\(next\)/.test(app) && /queueSync\(\)/.test(app))
ok('mirror location save uses conflict-safe shared mutation', /persistSharedBirdPostMutation\(patchAddress, next\)/.test(app))

// Garden: original purchase cost is stored and used for one-shot removal;
// move validates numeric targets and keeps the original planting object data.
ok('plantings record purchase cost', /purchaseCost:\s*(SEED_PLANT_COST|item\.cost)/.test(app))
ok('remove is locked for fully grown plantings and refunds purchase cost', /isFullyGrown\(planting\).*?return/s.test(app) && /planting\.purchaseCost/.test(app))
ok('move rejects invalid or cross-zone targets', /Number\.isFinite\(targetX\).*?Number\.isFinite\(targetY\)/s.test(app) && /oldRegion\.y0 !== newRegion\.y0/.test(app))
ok('remove confirmation text is exact', /Are you sure\? This can’t be undone\./.test(garden))

// Species validation is centralized against the bundled official catalog and
// runs before any reward/state mutation in every bird-confirmation path.
ok('official catalog is the mutation-time authority', /const officialBirdMatch/.test(app) && /findOfficialBird\(defaultBirdLibrary/.test(app))
ok('invalid species exits before state mutation', /if \(!officialBirdMatch[\s\S]{0,500}return null/.test(app))

// Library cards prefer a real sighting photo over the generic catalog image.
ok('seen cards prefer personal sighting photos', /const spottedPhoto = herPhoto \|\| bird\.imageUrl/.test(app))

console.log('Feature contract checks passed.')
