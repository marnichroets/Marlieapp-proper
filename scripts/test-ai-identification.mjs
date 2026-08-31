import assert from 'node:assert/strict'
import fs from 'node:fs'
import { rankBirdMatches, identificationIsUncertain } from '../src/aiIdentification.js'

const official = { commonName: 'Cape Robin-Chat', scientificName: 'Cossypha caffra', confidence: 66 }
const lookalike = { commonName: 'Karoo Robin', scientificName: 'Cossypha caffra', confidence: 92 }
const ranked = rankBirdMatches([lookalike, official], (match) => match.commonName === official.commonName)
assert.equal(ranked[0].commonName, official.commonName, 'official library candidates are preferred')
assert.equal(ranked.length, 2, 'ambiguous lookalikes remain visible as candidates')
assert.equal(identificationIsUncertain(ranked, false), true, 'a sub-threshold result is explicitly uncertain')
assert.equal(identificationIsUncertain([], false), true, 'empty results become a clear not-sure state')

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.match(app, /body\.append\('location'/, 'location context is sent to identification')
assert.match(app, /body\.append\('season'/, 'season context is sent to identification')
assert.match(app, /officialBirdMatch\(\{ commonName: birdName/, 'final saves reject non-library candidates')
console.log('AI identification tests passed')
