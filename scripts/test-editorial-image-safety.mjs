// Verifies the editorial-image-safety mechanism added for the magazine
// cover / "birds near you" cards: a flagged species' real reference photo
// must never be used as a cheerful/editorial hero image, while the species
// itself stays fully eligible everywhere else (ecological selection, factual
// pages). See isEditorialBirdImageSafe (src/birdImage.js) and
// editorialImageSafe on the Spotted Thick-knee entry (src/data/saBirdLibrary.js).
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isEditorialBirdImageSafe } from '../src/birdImage.js'
import { defaultBirdLibrary } from '../src/data/saBirdLibrary.js'

const FLAGGED_NAME = 'Spotted Thick-knee'
const flaggedBird = defaultBirdLibrary.find((bird) => bird.commonName === FLAGGED_NAME)
assert.ok(flaggedBird, `${FLAGGED_NAME} must still exist in the library (species is valid, only its photo is flagged)`)
assert.equal(flaggedBird.editorialImageSafe, false, `${FLAGGED_NAME} must carry editorialImageSafe: false`)
assert.ok(flaggedBird.imageUrl, `${FLAGGED_NAME} must keep its real imageUrl for factual/reference surfaces`)
console.log(`ok - ${FLAGGED_NAME} is present, keeps its real photo, and is flagged editorialImageSafe: false`)

// --- isEditorialBirdImageSafe itself ----------------------------------------
assert.equal(isEditorialBirdImageSafe(flaggedBird), false, 'flagged bird is reported unsafe for editorial use')
console.log('ok - isEditorialBirdImageSafe(flaggedBird) === false')

const safeSample = defaultBirdLibrary.find((bird) => bird.commonName === 'Hadeda Ibis')
assert.ok(safeSample, 'sample species must exist')
assert.equal(isEditorialBirdImageSafe(safeSample), true, 'a normal species with no editorialImageSafe field is treated as safe')
console.log('ok - isEditorialBirdImageSafe(unflagged bird) === true (absent field defaults to safe)')

assert.equal(isEditorialBirdImageSafe({ editorialImageSafe: true }), true, 'explicit true stays safe')
assert.equal(isEditorialBirdImageSafe({}), true, 'no field at all defaults to safe')
assert.equal(isEditorialBirdImageSafe(null), true, 'a missing bird never throws and defaults to safe')
assert.equal(isEditorialBirdImageSafe(undefined), true, 'undefined bird never throws and defaults to safe')
console.log('ok - isEditorialBirdImageSafe edge cases (explicit true / no field / null / undefined) all default to safe')

let unsafeCount = 0
for (const bird of defaultBirdLibrary) {
  if (bird.editorialImageSafe === false) unsafeCount += 1
}
assert.equal(unsafeCount, 1, 'exactly one species is currently flagged (Spotted Thick-knee) — this count should only grow deliberately')
console.log(`ok - exactly ${unsafeCount} species flagged in the whole library right now`)

// --- Deterministic weekly rotation never surfaces the flagged bird as cover -
// Mirrors selectRotatingBirds/getWeeklyMagazineIssue's birdOfWeek selection in
// src/App.jsx (getWeeklyMagazineIssue, ~L1957-1984; selectRotatingBirds,
// ~L1945-1955) without importing App.jsx directly — App.jsx contains JSX,
// which this plain-node test runner can't parse (same reason every other
// scripts/test-*.mjs avoids importing .jsx files). If that selection logic
// changes, update this mirror to match.
function selectRotatingBirds(birds, count, startIndex, excludedId = '') {
  if (!birds.length) return []
  const selected = []
  for (let offset = 0; selected.length < Math.min(count, birds.length) && offset < birds.length; offset += 1) {
    const bird = birds[(startIndex + offset) % birds.length]
    if (bird.id !== excludedId) selected.push(bird)
  }
  return selected
}

function coverBirdForIssueIndex(library, issueIndex, pinnedId = '') {
  const startIndex = library.length ? (issueIndex * 5) % library.length : 0
  const pinnedBird = pinnedId ? library.find((bird) => bird.id === pinnedId) || null : null
  const rotatingBirds = selectRotatingBirds(library, pinnedBird ? 4 : 5, startIndex, pinnedBird?.id)
  const featuredBirds = pinnedBird ? [pinnedBird, ...rotatingBirds] : rotatingBirds
  return featuredBirds.find(isEditorialBirdImageSafe) || featuredBirds[0] || null
}

const sortedLibrary = [...defaultBirdLibrary].sort((a, b) => a.commonName.localeCompare(b.commonName))
const WEEKS_TO_CHECK = 500 // ~9.6 years of Sundays — comfortably covers real usage
let deviatedFromNaivePickCount = 0
for (let issueIndex = 0; issueIndex < WEEKS_TO_CHECK; issueIndex += 1) {
  const cover = coverBirdForIssueIndex(sortedLibrary, issueIndex)
  assert.notEqual(cover?.commonName, FLAGGED_NAME, `week ${issueIndex}: magazine cover must never be ${FLAGGED_NAME}`)

  // Determinism: same issueIndex -> same result, every time.
  const coverAgain = coverBirdForIssueIndex(sortedLibrary, issueIndex)
  assert.equal(cover?.id, coverAgain?.id, `week ${issueIndex}: cover selection must be deterministic, not a random reroll`)

  // The skip-forward must ONLY ever trigger because of the flagged bird —
  // proves unflagged species are completely unaffected (no regression).
  const startIndex = (issueIndex * 5) % sortedLibrary.length
  const naivePick = sortedLibrary[startIndex]
  if (cover?.id !== naivePick?.id) {
    assert.equal(naivePick.commonName, FLAGGED_NAME, `week ${issueIndex}: cover only ever differs from the naive first pick when that pick was ${FLAGGED_NAME}`)
    deviatedFromNaivePickCount += 1
  }
}
assert.ok(deviatedFromNaivePickCount > 0, 'the flagged bird must actually land as the naive pick at least once across the sample, so the skip-forward is genuinely exercised')
console.log(`ok - across ${WEEKS_TO_CHECK} simulated weeks, the magazine cover is never ${FLAGGED_NAME}, is fully deterministic, and only ever skips forward because of that one flagged bird (${deviatedFromNaivePickCount} weeks affected)`)

// A pinned bird that happens to be the flagged one also gets skipped past.
const pinnedFlaggedCover = coverBirdForIssueIndex(sortedLibrary, 0, flaggedBird.id)
assert.notEqual(pinnedFlaggedCover?.commonName, FLAGGED_NAME, 'even an explicitly pinned flagged bird must not become the cover')
console.log('ok - pinning the flagged species as bird-of-the-week still does not surface it as the cover')

// --- FieldGuidePhoto's safety gate is wired in source (App.jsx) ------------
// FieldGuidePhoto/coverPhoto are React components inside App.jsx (JSX), so we
// can't import and execute them here — instead confirm the safety check is
// actually wired at the source level, the same technique already used by
// scripts/test-bird-post-journeys.mjs to check BirdMap.jsx.
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.match(appSource, /const usable = bird\.imageUrl && !bird\.imageUrl\.includes\('placehold'\) && isEditorialBirdImageSafe\(bird\)/, 'FieldGuidePhoto (used by the magazine popup and "birds near you" card) must gate on isEditorialBirdImageSafe')
assert.match(appSource, /featuredBirds\.find\(isEditorialBirdImageSafe\)/, 'getWeeklyMagazineIssue must pick the first editorially-safe bird for the cover')
assert.match(appSource, /coverPhoto\(coverBird\.commonName, coverBird\.imageUrl, isEditorialBirdImageSafe\(coverBird\)\)/, 'the magazine cover page must pass the safety check into coverPhoto()')
assert.match(appSource, /imageUrl && safe \?/, 'coverPhoto() must refuse to render the real photo when unsafe, falling back to GenericBirdFallback')
console.log('ok - FieldGuidePhoto, getWeeklyMagazineIssue, and coverPhoto() are all wired to isEditorialBirdImageSafe in src/App.jsx')

console.log('\nEditorial image safety checks passed.')
