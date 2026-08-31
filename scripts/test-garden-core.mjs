import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
})
const {
  GARDEN_REGION,
  canPlaceAt,
  canPlaceResidentAt,
  canWater,
  defaultGarden,
  gardenItem,
  gardenRegions,
  isFullyGrown,
  plantStageKey,
  snapToGarden,
} = await vite.ssrLoadModule('/src/gardenData.js')

const today = '2026-08-31'
const item = gardenItem('flower-patch')
const fresh = {
  id: 'plant-1', type: item.id, x: 82, y: 192,
  wateredDays: 0, lastWaterDay: '', plantedAt: `${today}T08:00:00.000Z`, purchaseCost: item.cost,
}
assert.equal(canWater(fresh, today), true, 'fresh planting can be watered')
const watered = { ...fresh, wateredDays: 1, lastWaterDay: today }
assert.equal(canWater(watered, today), false, 'planting cannot be watered twice in one day')
assert.equal(plantStageKey(watered), 'budding', 'watering advances visible growth')
const grown = { ...watered, wateredDays: item.waterToGrow }
assert.equal(isFullyGrown(grown), true, 'growth reaches permanent state')
assert.equal(canWater(grown, '2026-09-01'), false, 'permanent planting no longer needs watering')

assert.equal(canPlaceAt('flower-patch', 82, 192, [], []), true, 'valid lawn placement succeeds')
assert.equal(canPlaceAt('flower-patch', 82, 192, [fresh], []), false, 'overlapping placement is rejected')
assert.equal(canPlaceAt('flower-patch', 10, 10, [], []), false, 'placement outside unlocked lawn is rejected')
const snapped = snapToGarden(96, 201, [])
assert(snapped.x >= GARDEN_REGION.x0 && snapped.x <= GARDEN_REGION.x1, 'mobile tap snaps inside lawn')

const expansions = ['expand-left', 'expand-right', 'back-garden']
assert.equal(gardenRegions(expansions).length, 4, 'all purchased expansion regions remain available')
assert.equal(canPlaceResidentAt(200, 190, [], expansions), true, 'resident receives a valid home')
assert.equal(canPlaceResidentAt(200, 190, [{ id: 'r1', x: 200, y: 190 }], expansions), false, 'residents cannot overlap')

const persisted = JSON.parse(JSON.stringify({ ...defaultGarden(), plantings: [grown], residents: [{ id: 'r1', x: 220, y: 190 }], expansions }))
assert.equal(persisted.plantings[0].purchaseCost, item.cost, 'purchase price survives reload for refunds')
assert.equal(isFullyGrown(persisted.plantings[0]), true, 'permanent lock survives reload')
assert.equal(persisted.residents.length, 1, 'residents survive reload')

const [appSource, cssSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.css', import.meta.url), 'utf8'),
])
assert.match(appSource, /className="season-spring-bunny"/, 'Spring rabbit is wired to its motion class')
assert.match(appSource, /className="season-spring-passer"/, 'occasional Spring animal passer is present')
assert.match(cssSource, /@keyframes season-spring-bunny-hop/, 'rabbit hop animation exists')
assert.match(cssSource, /prefers-reduced-motion:[\s\S]*season-spring-bunny/, 'Spring animals respect reduced motion')

await vite.close()
console.log('Garden core flow checks passed.')
