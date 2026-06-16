// Tests the matching hardening (the duplicate-detection fix) using the REAL
// canonicalSpeciesKey from src/speciesMatch.js. Run: node scripts/test-species-match.mjs
import assert from 'node:assert'
import { canonicalSpeciesKey, normalizeBirdName } from '../src/speciesMatch.js'

let passed = 0
const check = (name, cond) => {
  assert(cond, `FAILED: ${name}`)
  console.log('  ✓', name)
  passed++
}

// Scenario: Pooks scans a Mandarin Duck. First scan creates the species.
const afterFirstScan = {
  birds: [{ id: 'mandarin duck', scientificName: 'Aix galericulata', count: 1 }],
  sightings: [{ speciesKey: 'mandarin duck', scientificName: 'Aix galericulata' }],
}

// Second scan — AI returns the SAME species but worded differently each way.
const variants = [
  'Mandarin Duck',                       // identical
  'Mandarin duck',                       // different capitalisation
  '  Mandarin   Duck  ',                 // stray spaces
  'Mandarin Duck (Aix galericulata)',    // AI appended the scientific name
  'mandarin-duck duck',                  // garbled common name, same species
]
for (const v of variants) {
  const key = canonicalSpeciesKey(afterFirstScan, v, 'Aix galericulata')
  check(`"${v}" -> reuses existing key "mandarin duck"`, key === 'mandarin duck')
}

// A genuinely different species must NOT collapse onto the duck.
check(
  'different species stays separate',
  canonicalSpeciesKey(afterFirstScan, 'Cape Robin-Chat', 'Cossypha caffra') === 'cape robin-chat',
)

// Backward compatibility: with no scientific name we fall back to the common name.
check(
  'no scientific name -> common-name key',
  canonicalSpeciesKey({ birds: [], sightings: [] }, 'Hadeda Ibis', '') === 'hadeda ibis',
)

// Even when only an OLD sighting (no top-level scientificName, only aiMatch) exists,
// the scientific name still matches — this is how Pooks' existing duck is recognised.
const legacyState = {
  birds: [{ id: 'mandarin duck', count: 2 }], // existing bird has no scientificName field yet
  sightings: [{ speciesKey: 'mandarin duck', aiMatch: { scientificName: 'Aix galericulata' } }],
}
check(
  'legacy sighting (aiMatch only) still matches by scientific name',
  canonicalSpeciesKey(legacyState, 'Mandarin duck', 'Aix galericulata') === 'mandarin duck',
)

check('normalizeBirdName collapses spacing/case', normalizeBirdName('  Cape   WHITE-eye ') === 'cape white-eye')

console.log(`\n✅ ALL ${passed} MATCHING ASSERTIONS PASSED`)
