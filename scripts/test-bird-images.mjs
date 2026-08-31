import assert from 'node:assert/strict'
import { getBirdImageSources } from '../src/birdImage.js'

const bird = { id: 'loerie', commonName: 'Knysna Loerie', scientificName: 'Tauraco corythaix', imageUrl: 'https://library.example/loerie.jpg' }
const own = getBirdImageSources(bird, [{ birdName: 'Knysna Loerie', dateSpotted: '2026-08-30', photo: 'data:image/jpeg;base64,own' }])
assert.equal(own[0], 'data:image/jpeg;base64,own', 'a sighting photo must win over the library image')

const official = getBirdImageSources({ ...bird, imageUrl: 'https://library.example/official.jpg' }, [])
assert.equal(official[0], 'https://library.example/official.jpg', 'the official species image is the second fallback')
assert.equal(getBirdImageSources({ ...bird, imageUrl: 'https://library.example/loerie.jpg' }, [
  { speciesKey: 'loerie', photo: 'data:image/jpeg;base64,older' },
])[0], 'data:image/jpeg;base64,older', 'legacy species-key sightings are supported')
assert.deepEqual(getBirdImageSources({ ...bird, imageUrl: '' }, []), [], 'placeholder is the final UI fallback')
console.log('bird image fallback tests passed')
