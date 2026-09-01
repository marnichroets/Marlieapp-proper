import assert from 'node:assert/strict'
import fs from 'node:fs'
import { plantScannerAvailableForAccount } from '../src/plantScannerAccess.js'

assert.equal(
  plantScannerAvailableForAccount('pooks', { releaseFlags: { plants: false }, plantScanningUnlocked: false }),
  true,
  'Pooks sees the scanner even with historical unreleased flags',
)
assert.equal(plantScannerAvailableForAccount('marnich', {}), false, 'sandbox scanner remains gated')
assert.equal(
  plantScannerAvailableForAccount('marnich', { releaseFlags: { plants: true }, plantScanningUnlocked: true }),
  true,
  'sandbox scanner opens only after both test flags are enabled',
)

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const backend = fs.readFileSync(new URL('../backend/main.py', import.meta.url), 'utf8')

assert.match(app, /plantScannerAvailableForAccount\(account, data\.settings\)/, 'account access controls the scanner entry point')
assert.match(app, /Scan a Plant[\s\S]{0,500}<AddPlantPage addPlant=\{addPlant\}/, 'scanner tab opens the plant flow')
assert.match(app, /accept="image\/\*"[\s\S]{0,80}capture="environment"/, 'mobile rear-camera capture is available')
assert.match(app, /Choose from gallery[\s\S]{0,1000}Ask the Head Botanist/, 'photo upload can submit to identification')
assert.match(app, /\/api\/identify-plant/, 'plant photos are wired to the identification API')
assert.match(app, /finishConfirm\(result\.primary \|\| candidate\)/, 'candidate results can be confirmed')
assert.match(app, /const saved = addPlant\(match, photo\)/, 'confirmed results enter the plant collection and Garden flow')
assert.match(app, /The greenhouse line is quiet right now/, 'API errors show a graceful retry state')
assert.match(backend, /@app\.post\("\/api\/identify-plant"\)/, 'backend exposes PlantNet identification')
assert.match(backend, /identify_plant_with_plantnet/, 'backend identification is wired to PlantNet')

console.log('Plant scanner checks passed.')
