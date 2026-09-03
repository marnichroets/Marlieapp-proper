// Real species colours for every bird in the field guide (see
// birdTemplates.jsx for the 8-zone template shapes these fill: head, beak,
// eye, body, breast, wing, tail, legs) — all 374 species in
// src/data/saBirdLibrary.js, plus Pooks' custom AI-identified birds that
// aren't in that static library.
//
// Each entry picks the template whose silhouette/beak/tail shape is the
// closest real match, per the brief:
//   songbird-small, songbird-crested, weaver, sunbird, kingfisher, barbet,
//   longtail, swallow, dove, waterbird, raptor, starling
//
// A few species don't map perfectly onto one of the 12 shapes (there's no
// "shrike" or "gull" template, for instance) — those are noted inline with
// the closest-fit reasoning. Colours are simplified to one flat fill per
// zone, so fine markings (collars, wing bars, bare-skin patches) that don't
// fit the 8 zones are called out but not literally reproduced.
//
// ---- Two sections below ----
// 1. Pooks' 24 originally-catalogued species — hand-authored and reviewed.
// 2. The remaining ~358 species — generated from each species' own
//    `colours` field in saBirdLibrary.js via scripted keyword matching
//    (family name → template, colour words → zones), not researched
//    individually. Each entry's source description is quoted in its
//    comment so any that read wrong are easy to spot-check and fix by hand.
//    This is the bulk/approximate pass the brief explicitly called for —
//    treat it as "closest reasonable approximation," not verified per-species.

export const BIRD_COLOUR_MAP = {
  'laughing-dove': {
    template: 'dove',
    zones: {
      head: '#c7a79c', beak: '#4a433d', eye: '#2b211a', body: '#b98e72',
      breast: '#e3c1ae', wing: '#97a0ac', tail: '#5c4a3e', legs: '#c97a63',
    },
    // Black-spotted rufous necklace patch omitted (single breast zone).
  },

  'egyptian-goose': {
    template: 'waterbird',
    zones: {
      head: '#dccba6', beak: '#c96a55', eye: '#d9a23b', body: '#8a7a64',
      breast: '#c9a47d', wing: '#e8e2d2', tail: '#2b2620', legs: '#d98f79',
    },
    // Chestnut eye-patch and breast blotch simplified to the surrounding
    // pale/buff tones; white wing-covert flash carried by the wing zone.
  },

  'red-eyed-dove': {
    template: 'dove',
    zones: {
      head: '#b4a199', beak: '#3a332c', eye: '#c4512e', body: '#8c7a6b',
      breast: '#d3c0b4', wing: '#6e5c4e', tail: '#4a3e33', legs: '#b4695a',
    },
    // The diagnostic red bare-skin eye-ring IS the eye zone here on purpose.
  },

  'karoo-thrush': {
    template: 'songbird-small',
    zones: {
      head: '#6b5a42', beak: '#e8b93a', eye: '#2b211a', body: '#6b5a42',
      breast: '#d9d2c4', wing: '#5a4b36', tail: '#453923', legs: '#b8813a',
    },
  },

  'helmeted-guineafowl': {
    template: 'dove', // closest plump ground-bird body shape available
    zones: {
      head: '#6e7a82', beak: '#a85b3e', eye: '#5c2e1e', body: '#3a3d3f',
      breast: '#45494b', wing: '#3a3d3f', tail: '#302f2e', legs: '#4a4a48',
    },
    // Bare blue-grey head skin + reddish casque simplified to one head
    // tone; the white pearl-spotting over the dark body is a texture the
    // flat 8-zone fill can't carry.
  },

  'cape-wagtail': {
    template: 'longtail', // no template models a moderate-but-constant tail-bob; this reads closer than "short tail"
    zones: {
      head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#7c6e58',
      breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22',
    },
    // Real tail proportions are more modest than the template's long
    // streamers — picked for "long tail is the ID feature" over literal length.
  },

  'blacksmith-lapwing': {
    template: 'waterbird',
    zones: {
      head: '#1e1c1a', beak: '#1a1815', eye: '#c0392b', body: '#a8aca6',
      breast: '#f2f0ea', wing: '#221f1c', tail: '#e5e2d8', legs: '#231f1c',
    },
    // White cheeks/forehead (vs. the black crown/nape used here) omitted.
  },

  'cape-turtle-dove': {
    template: 'dove',
    zones: {
      head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#b0a28c',
      breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55',
    },
    // Black half-collar on the nape omitted (single head zone).
  },

  'cape-weaver': {
    template: 'weaver',
    zones: {
      head: '#e8a83d', beak: '#3a342a', eye: '#ede2b8', body: '#b8a83e',
      breast: '#f0cb4a', wing: '#8a7a3a', tail: '#6e5f2e', legs: '#b9846a',
    },
    // Breeding male: orange-washed face, pale eye is genuinely diagnostic.
  },

  'crested-barbet': {
    template: 'barbet',
    zones: {
      head: '#f0c93e', beak: '#ede3c8', eye: '#c0392b', body: '#221e1a',
      breast: '#f2ce4a', wing: '#2a241e', tail: '#221e1a', legs: '#7a756a',
    },
    // Red facial/throat patch folded into the eye zone; black-and-white
    // speckling on the back is texture the flat fill can't carry.
  },

  'common-fiscal': {
    template: 'starling', // no shrike template; closest medium perching-bird size
    zones: {
      head: '#1d1b18', beak: '#1a1815', eye: '#221a14', body: '#221f1c',
      breast: '#f3f1ec', wing: '#201d1a', tail: '#221f1c', legs: '#221f1c',
    },
    // White wing flash and the slightly hooked "butcher bird" bill tip are
    // lost in this template's straight beak — closest available shape.
  },

  'african-red-eyed-bulbul': {
    template: 'songbird-crested',
    zones: {
      head: '#4a3e36', beak: '#221e1a', eye: '#d3502b', body: '#6e5b49',
      breast: '#c9b79e', wing: '#5c4b3b', tail: '#453a2e', legs: '#2b2620',
    },
    // Bright orange-red eye-ring is the headline field mark — used as-is.
  },

  'house-sparrow': {
    template: 'weaver',
    zones: {
      head: '#8a8272', beak: '#221e1a', eye: '#2b2117', body: '#8a6e45',
      breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268',
    },
    // Male breeding plumage (grey cap, black bib) — the black bib itself
    // is a throat patch the single breast zone can't isolate.
  },

  'southern-grey-headed-sparrow': {
    template: 'weaver',
    zones: {
      head: '#9c9384', beak: '#5c5245', eye: '#2b2117', body: '#8f6e48',
      breast: '#d3cdc0', wing: '#7a5c3c', tail: '#5c4a34', legs: '#b08268',
    },
  },

  'spotted-thick-knee': {
    template: 'waterbird',
    zones: {
      head: '#b4986e', beak: '#3a342a', eye: '#e8c23d', body: '#a88c64',
      breast: '#e3d6be', wing: '#96805a', tail: '#8a7452', legs: '#c9b96e',
    },
    // Large staring yellow eye is the ID feature — used as-is.
  },

  'cape-cormorant': {
    template: 'waterbird',
    zones: {
      head: '#1c2430', beak: '#39332e', eye: '#2e7d5b', body: '#1e2732',
      breast: '#202934', wing: '#232c36', tail: '#181e26', legs: '#1c1e1c',
    },
    // Small orange-yellow throat patch (breeding) is facial skin, not the
    // bill itself — omitted rather than mis-colouring the beak zone.
  },

  'ai-wood-duck-1781607139281': {
    template: 'waterbird',
    zones: {
      head: '#2f6b4a', beak: '#c0392b', eye: '#c0392b', body: '#4a3b2a',
      breast: '#8a5a3e', wing: '#2a4a5c', tail: '#2a2420', legs: '#d9a23b',
    },
    // One of the most colourful ducks alive — flattened to its dominant
    // iridescent green head, chestnut/buff breast-flank blend, and the
    // blue-toned iridescent wing.
  },

  'ai-mandarin-duck-1781607172673': {
    template: 'waterbird',
    zones: {
      head: '#2f5c3e', beak: '#d9522e', eye: '#2b2117', body: '#8a6a3e',
      breast: '#5c2e3e', wing: '#d9762e', tail: '#3a2e22', legs: '#e0b25c',
    },
    // The famous orange "sail" feathers ARE the wing zone; ornamental head
    // crest simplified into the head fill.
  },

  "ai-hartlaub-s-gull-king-gull-1782044213662": {
    template: 'waterbird', // no gull template; closest pale coastal/water bird
    zones: {
      head: '#e8e4da', beak: '#7a2e28', eye: '#2b2117', body: '#b8bcb6',
      breast: '#f5f3ec', wing: '#b0b4ac', tail: '#f0eee6', legs: '#7a2e28',
    },
    // Black wingtips and the dark-red eye-ring both lost to single flat
    // wing/eye zones — closest reasonable approximation.
  },

  'ai-red-winged-starling-1782132657309': {
    template: 'starling',
    zones: {
      head: '#1c1a17', beak: '#151310', eye: '#b5451f', body: '#201d19',
      breast: '#221f1b', wing: '#a3492a', tail: '#1e1b18', legs: '#1c1917',
    },
    // Male plumage — the chestnut flight-feather flash (only visible in
    // flight) is exactly what the wing zone is for here.
  },

  'ai-domestic-duck-1782561134757': {
    template: 'waterbird',
    zones: {
      head: '#9c8058', beak: '#d9a23b', eye: '#2b2117', body: '#8a6e4a',
      breast: '#c4a878', wing: '#7a5f3e', tail: '#6b5238', legs: '#d9862e',
    },
  },

  'ai-indian-runner-duck-1782561252678': {
    template: 'waterbird',
    zones: {
      head: '#c9a66e', beak: '#d9a23b', eye: '#2b2117', body: '#f2eee2',
      breast: '#f5f1e6', wing: '#b8935e', tail: '#ede8da', legs: '#d9862e',
    },
    // Fawn-and-white variety. The breed's signature bottle-upright stance
    // isn't something the waterbird template's posture can show — shape
    // limitation, not a colour one.
  },

  'ai-loerie-1782990851637': {
    template: 'songbird-crested', // Grey Go-away-bird — explicitly a "lourie" per the brief
    zones: {
      head: '#b4afa0', beak: '#221e1a', eye: '#2b2117', body: '#9c968a',
      breast: '#c9c4b6', wing: '#7a756a', tail: '#4a463e', legs: '#221e1a',
    },
  },

  'ai-black-headed-heron-1783079405482': {
    template: 'waterbird',
    zones: {
      head: '#221f1c', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82',
      breast: '#e3e1d6', wing: '#7c7e74', tail: '#6e7066', legs: '#3a3a34',
    },
    // White throat stripe against the black head/hindneck omitted.
  },

  // ---- Generated from saBirdLibrary.js (see file header) --------------------

  'cape-robin-chat': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Robin-Chat — "Olive-brown back, orange throat and breast, grey face."
  },
  'hadeda-ibis': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#5c3b6e', tail: '#5c5e54', legs: '#3a3a34' },
    // Hadeda Ibis — "Grey-brown body with glossy green and purple wing sheen."
  },
  'cape-white-eye': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#f2f0ea', body: '#e0c14a', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape White-eye — "Green-yellow body with a clear white eye-ring."
  },
  'southern-masked-weaver': {
    template: 'weaver',
    zones: { head: '#201d19', beak: '#3a342a', eye: '#2b2117', body: '#eccb3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Southern Masked Weaver — "Bright yellow male with black face mask in breeding season."
  },
  'african-hoopoe': {
    template: 'songbird-crested',
    zones: { head: '#4a3e36', beak: '#221e1a', eye: '#2b2117', body: '#d9762e', breast: '#c9b79e', wing: '#f2f0ea', tail: '#453a2e', legs: '#2b2620' },
    // African Hoopoe — "Cinnamon-orange body, black-and-white wings and fan-like crest."
  },
  'speckled-pigeon': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#8a8c82', breast: '#ddd1bf', wing: '#f2f0ea', tail: '#7a6c58', legs: '#b06a55' },
    // Speckled Pigeon — "Grey pigeon with white speckles on the wings and reddish eye skin."
  },
  'fiscal-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Fiscal Flycatcher — "Black-and-white flycatcher with neat pale wing marks."
  },
  'african-fish-eagle': {
    template: 'raptor',
    zones: { head: '#f2f0ea', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#7a3b24', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Fish Eagle — "White head and chest, chestnut body and dark wings."
  },
  'pied-crow': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#f2f0ea', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Pied Crow — "Black crow with white chest, collar and upper back."
  },
  'fork-tailed-drongo': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#c0392b', body: '#201d19', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Fork-tailed Drongo — "Glossy black with red eyes and a forked tail."
  },
  'cape-sparrow': {
    template: 'weaver',
    zones: { head: '#f2f0ea', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Cape Sparrow — "Males have black-and-white head pattern and warm brown back."
  },
  'common-myna': {
    template: 'starling',
    zones: { head: '#201d19', beak: '#151310', eye: '#e0c14a', body: '#7a5f3e', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Common Myna — "Brown body, black head, yellow eye patch, bill and legs."
  },
  'spotted-eagle-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e0c14a', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Spotted Eagle-Owl — "Brown-grey with spots, ear tufts and yellow eyes."
  },
  'southern-red-bishop': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#d9762e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Southern Red Bishop — "Breeding males are bright red-orange and black."
  },
  'malachite-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#3e6b4a', breast: '#e8c93e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Malachite Sunbird — "Breeding male is metallic green with a long tail."
  },
  'olive-thrush': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Olive Thrush — "Olive-brown upperparts with orange-buff belly."
  },
  'african-sacred-ibis': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Sacred Ibis — "White body with black head, neck and trailing wing plumes."
  },
  'grey-heron': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Grey Heron — "Tall grey heron with white head and black head streak."
  },
  'cattle-egret': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Cattle Egret — "White egret, often with buff-orange breeding plumes."
  },
  'burchells-coucal': {
    template: 'longtail',
    zones: { head: '#201d19', beak: '#403a30', eye: '#2b2418', body: '#7c6e58', breast: '#7a3b24', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Burchell\'s Coucal — "Black head and body, chestnut wings and long dark tail."
  },
  'bokmakierie': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#7c7a3e', breast: '#201d19', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Bokmakierie — "Yellow underparts, olive back and bold black chest band."
  },
  'cape-bulbul': {
    template: 'songbird-crested',
    zones: { head: '#4a3e36', beak: '#221e1a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4b3b', tail: '#eccb3e', legs: '#2b2620' },
    // Cape Bulbul — "Brown body, dark head and bright yellow under-tail."
  },
  'barn-swallow': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#2c5c8a', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Barn Swallow — "Glossy blue upperparts, pale underparts and rusty throat."
  },
  'southern-double-collared-sunbird': {
    template: 'sunbird',
    zones: { head: '#176b57', beak: '#2b211b', eye: '#101d18', body: '#245f4b', breast: '#b73532', collar: '#3d5b86', belly: '#e2ddd0', breastBand: true, wing: '#263f3a', tail: '#183f36', legs: '#493d2d' },
    // Southern Double-collared Sunbird — emerald head/back, blue collar, scarlet
    // chest band and pale lower belly; the shared sunbird silhouette remains.
  },
  'amethyst-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#201d19', breast: '#5c3b6e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Amethyst Sunbird — "Glossy black male with purple throat sheen."
  },
  'cape-glossy-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#e0c14a', body: '#3e6b4a', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Cape Glossy Starling — "Glossy blue-green with bright orange-yellow eyes."
  },
  'village-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#e0c14a', breast: '#7a3b24', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Village Weaver — "Yellow male with dark head and chestnut tones."
  },
  'red-winged-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#c0392b', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Red-winged Starling — "Glossy black with chestnut-red wing panels."
  },
  'african-grey-hornbill': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#8a8c82', eye: '#1c1712', body: '#f2f0ea', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // African Grey Hornbill — "Grey-brown hornbill with long curved bill and white markings."
  },
  'cardinal-woodpecker': {
    template: 'barbet',
    zones: { head: '#c0392b', beak: '#ede3c8', eye: '#c0392b', body: '#7a5f3e', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Cardinal Woodpecker — "Olive-brown and white with red crown on male."
  },
  'diederik-cuckoo': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#3e6b4a', breast: '#f2f0ea', wing: '#b5651d', tail: '#1e1b18', legs: '#1c1917' },
    // Diederik Cuckoo — "Glossy green male with white underparts and coppery wing sheen."
  },
  'african-paradise-flycatcher': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2c5c8a', body: '#7c6e58', breast: '#7a3b24', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // African Paradise Flycatcher — "Chestnut body, blue eye-ring and long tail streamers in males."
  },
  'white-browed-robin-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // White-browed Robin-Chat — "Orange underparts, brown back and bold white eyebrow."
  },
  'kurrichane-thrush': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#d9762e', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Kurrichane Thrush — "Grey-brown thrush with orange bill and eye-ring."
  },
  'cape-batis': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#201d19', breast: '#7a3b24', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Batis — "Black, white and grey with chestnut chest band in females."
  },
  'southern-boubou': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#f2f0ea', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Southern Boubou — "Black upperparts, white underparts and rusty flanks."
  },
  'yellow-billed-duck': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#eccb3e', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Yellow-billed Duck — "Brown duck with bright yellow bill and dark markings."
  },
  'hamerkop': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Hamerkop — "Plain brown bird with hammer-shaped head crest."
  },
  'little-egret': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#201d19', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#e0c14a' },
    // Little Egret — "White egret with black bill, black legs and yellow feet."
  },
  'reed-cormorant': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#2f6b4a', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Reed Cormorant — "Dark cormorant with glossy tones and long tail."
  },
  'african-darter': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7c7e74', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Darter — "Dark body, long snake-like neck and pointed bill."
  },
  'jackal-buzzard': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#a3492a', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Jackal Buzzard — "Dark upperparts, rufous chest and pale flight feathers."
  },
  'yellow-billed-kite': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#e0c14a', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Yellow-billed Kite — "Brown raptor with yellow bill and forked tail."
  },
  'rock-kestrel': {
    template: 'raptor',
    zones: { head: '#8a8c82', beak: '#221e1a', eye: '#e8c23d', body: '#a3492a', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Rock Kestrel — "Rufous-brown falcon with grey head in males and spotted underparts."
  },
  'pearl-spotted-owlet': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Pearl-spotted Owlet — "Small brown owl with white spots and false eye marks on back of head."
  },
  'verreauxs-eagle-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Verreaux\'s Eagle-Owl — "Huge grey owl with dark ear tufts and pink eyelids."
  },
  'arrow-marked-babbler': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#d9762e', body: '#7a5f3e', breast: '#f2f0ea', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Arrow-marked Babbler — "Brown bird flecked with white arrow marks on the throat and breast; orange eye."
  },
  'african-green-pigeon': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#e0c14a', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#e0c14a' },
    // African Green Pigeon — "Yellow-green body, mauve shoulder patch, red-and-yellow feet and bill base."
  },
  'black-headed-oriole': {
    template: 'starling',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#8a6a2e', body: '#e0c14a', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Black-headed Oriole — "Bright golden-yellow body with a glossy black head and pink-red bill."
  },
  'dark-capped-bulbul': {
    template: 'songbird-crested',
    zones: { head: '#4a3e36', beak: '#221e1a', eye: '#f2f0ea', body: '#7a5f3e', breast: '#eccb3e', wing: '#5c4b3b', tail: '#453a2e', legs: '#2b2620' },
    // Dark-capped Bulbul — "Brown body, dark crested head, white eye and a bright yellow vent."
  },
  'cape-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#e0c14a', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Cape Canary — "Yellow-green body with a soft grey nape and crown."
  },
  'yellow-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#e0c14a', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Yellow Canary — "Bright yellow below, olive above; males glow yellow."
  },
  'common-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#e0c14a', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Common Starling — "Glossy black with green-purple sheen and pale spots; yellow bill when breeding."
  },
  'pied-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#f2f0ea', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Pied Starling — "Dull brown-black with a white vent and a pale eye."
  },
  'wattled-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#e0c14a', breast: '#3a352e', wing: '#201d19', tail: '#1e1b18', legs: '#1c1917' },
    // Wattled Starling — "Grey-and-white with black wings; breeding males grow bare yellow-and-black wattles."
  },
  'common-waxbill': {
    template: 'weaver',
    zones: { head: '#c0392b', beak: '#c0392b', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Common Waxbill — "Tiny brown bird finely barred, with a red bill and red eye-mask."
  },
  'blue-waxbill': {
    template: 'weaver',
    zones: { head: '#2c5c8a', beak: '#3a342a', eye: '#2b2117', body: '#c9a66e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Blue Waxbill — "Soft fawn above with a powder-blue face, breast and tail."
  },
  'bronze-mannikin': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#3e6b4a', breast: '#f2f0ea', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Bronze Mannikin — "Dark hooded head, white belly and a bronzy-green shoulder patch."
  },
  'pin-tailed-whydah': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#c0392b', eye: '#2b2418', body: '#201d19', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Pin-tailed Whydah — "Breeding male black-and-white with a red bill and a long streaming tail."
  },
  'red-billed-quelea': {
    template: 'weaver',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Red-billed Quelea — "Small brown finch; breeding male with a red bill and a black-or-white face mask."
  },
  'yellow-crowned-bishop': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#e0c14a', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Yellow-crowned Bishop — "Breeding male golden-yellow and black, like a tiny bumblebee."
  },
  'long-tailed-widowbird': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#201d19', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Long-tailed Widowbird — "Breeding male jet-black with red-and-white shoulders and an enormous flowing tail."
  },
  'red-collared-widowbird': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#201d19', breast: '#c0392b', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Red-collared Widowbird — "Breeding male black with a red throat crescent and a long tail."
  },
  'white-bellied-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#3e6b4a', breast: '#f2f0ea', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // White-bellied Sunbird — "Male glittering green above with a clean white belly."
  },
  'marico-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#3e6b4a', breast: '#2c5c8a', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Marico Sunbird — "Male metallic green with a maroon-and-blue breast band."
  },
  'greater-striped-swallow': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#2c5c8a', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Greater Striped Swallow — "Blue back, rusty cap and rump, finely streaked underparts."
  },
  'white-throated-swallow': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#2c5c8a', breast: '#f2f0ea', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // White-throated Swallow — "Blue above, white below with a blue breast band and a white throat."
  },
  'rock-martin': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#7a5f3e', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Rock Martin — "Plain dusty brown with paler throat and small pale tail spots."
  },
  'speckled-mousebird': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#7a5f3e', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Speckled Mousebird — "Dull brown with a long tail and a scruffy crest."
  },
  'red-faced-mousebird': {
    template: 'longtail',
    zones: { head: '#c0392b', beak: '#403a30', eye: '#2b2418', body: '#8a8c82', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Red-faced Mousebird — "Soft blue-grey with a bright red face mask and a very long tail."
  },
  'grey-go-away-bird': {
    template: 'songbird-crested',
    zones: { head: '#4a3e36', beak: '#221e1a', eye: '#2b2117', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4b3b', tail: '#453a2e', legs: '#2b2620' },
    // Grey Go-away-bird — "All grey with a tall wispy crest and a long tail."
  },
  'rock-pigeon': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#8a8c82', breast: '#ddd1bf', wing: '#201d19', tail: '#7a6c58', legs: '#b06a55' },
    // Rock Pigeon — "Variable grey with two black wing-bars and a glossy neck; many colour forms."
  },
  'crowned-lapwing': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#c0392b' },
    // Crowned Lapwing — "Brown with a black cap ringed by a white "halo", red legs and bill base."
  },
  'black-headed-heron': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Black-headed Heron — "Grey body with a black crown and hind-neck; dark under the wing in flight."
  },
  'swainsons-spurfowl': {
    template: 'dove',
    zones: { head: '#c0392b', beak: '#201d19', eye: '#2b2117', body: '#7a5f3e', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // Swainson\'s Spurfowl — "Streaky brown with bare red face and throat skin and a black bill."
  },
  'spur-winged-goose': {
    template: 'waterbird',
    zones: { head: '#c0392b', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Spur-winged Goose — "Big glossy black-and-white goose with a red face and bill."
  },
  'red-knobbed-coot': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#f2f0ea', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Red-knobbed Coot — "Sooty black with a white bill and shield, and two red knobs when breeding."
  },
  'common-moorhen': {
    template: 'waterbird',
    zones: { head: '#c0392b', beak: '#e0c14a', eye: '#8a6a2e', body: '#c0392b', breast: '#e3e1d6', wing: '#6e7066', tail: '#f2f0ea', legs: '#3a3a34' },
    // Common Moorhen — "Sooty body with a red-and-yellow bill, a red forehead shield and a white tail-flick."
  },
  'little-grebe': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Little Grebe — "Small fluffy brown with a chestnut neck and a pale gape spot when breeding."
  },
  'white-breasted-cormorant': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#f2f0ea', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // White-breasted Cormorant — "Large black cormorant with a clean white throat and breast."
  },
  'three-banded-plover': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#c0392b', body: '#7c7e74', breast: '#201d19', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Three-banded Plover — "Small wader with two black breast bands, a red eye-ring and a red-based bill."
  },
  'black-winged-stilt': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#c0392b' },
    // Black-winged Stilt — "Elegant black-and-white with absurdly long pink-red legs."
  },
  'pied-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#201d19', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Pied Kingfisher — "Crisp black-and-white, finely speckled, with a dagger bill."
  },
  'brown-hooded-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#7a5f3e', beak: '#c0392b', eye: '#1c1712', body: '#1f6b8a', breast: '#d9762e', wing: '#2c5c8a', tail: '#123a52', legs: '#c0392b' },
    // Brown-hooded Kingfisher — "Brown hood, blue wings and rump, and a bright red bill."
  },
  'malachite-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#2c5c8a', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Malachite Kingfisher — "Tiny, brilliant blue above, orange below, with a red bill and crest."
  },
  'black-collared-barbet': {
    template: 'barbet',
    zones: { head: '#c0392b', beak: '#ede3c8', eye: '#c0392b', body: '#4a3826', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Black-collared Barbet — "Stocky, with a bright red face ringed by a black collar."
  },
  'black-shouldered-kite': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#c0392b', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Black-shouldered Kite — "Pale grey-and-white with black shoulders and big red eyes."
  },
  'african-stonechat': {
    template: 'songbird-small',
    zones: { head: '#201d19', beak: '#4a433d', eye: '#2b2117', body: '#f2f0ea', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // African Stonechat — "Male with a black head, white neck patch and an orange breast."
  },
  'cape-longclaw': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#e0862e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Longclaw — "Streaky brown above with a bright orange throat ringed by a black band."
  },
  'groundscraper-thrush': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#b8bcb6', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Groundscraper Thrush — "Pale grey-brown above, boldly spotted below, with a striking face pattern."
  },
  'tawny-flanked-prinia': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Tawny-flanked Prinia — "Plain brown above, pale below with tawny flanks and a long cocked tail."
  },
  'black-chested-prinia': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Black-chested Prinia — "Greyish above, yellowish below, breeding birds with a neat black chest band."
  },
  'crimson-breasted-shrike': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#b5292b', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Crimson-breasted Shrike — "Jet black above with a dazzling crimson throat and breast."
  },
  'white-browed-sparrow-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // White-browed Sparrow-Weaver — "Brown with a bold white eyebrow and a white rump."
  },
  'lilac-breasted-roller': {
    template: 'kingfisher',
    zones: { head: '#3e6b4a', beak: '#c0392b', eye: '#1c1712', body: '#1f6b8a', breast: '#2ea89a', wing: '#2c5c8a', tail: '#123a52', legs: '#c0392b' },
    // Lilac-breasted Roller — "A rainbow bird — lilac breast, turquoise belly, blue wings and a green head."
  },
  'blue-crane': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Blue Crane — "Soft blue-grey with a pale crown and long, sweeping wing plumes."
  },
  'secretarybird': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Secretarybird — "Grey body, black thighs and wing tips, with a crest of quill-like feathers."
  },
  'southern-ground-hornbill': {
    template: 'kingfisher',
    zones: { head: '#c0392b', beak: '#c0392b', eye: '#1c1712', body: '#201d19', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Southern Ground Hornbill — "Glossy black with a bright red face and throat patch."
  },
  'common-ostrich': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Common Ostrich — "Males black and white; females and young grey-brown."
  },
  'african-penguin': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#d98fa0', body: '#201d19', breast: '#201d19', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Penguin — "Black back, white front with a black chest band and pink eye patches."
  },
  'greater-flamingo': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#d98fa0', eye: '#8a6a2e', body: '#d98fa0', breast: '#e3e1d6', wing: '#201d19', tail: '#5c5e54', legs: '#3a3a34' },
    // Greater Flamingo — "Pale pink with bright pink-and-black wings and a pink bill with a black tip."
  },
  'lesser-flamingo': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#8a6a2e', body: '#d98fa0', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Lesser Flamingo — "Deep rosy-pink with a dark red bill that looks black from afar."
  },
  'southern-yellow-billed-hornbill': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#e0c14a', eye: '#1c1712', body: '#201d19', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Southern Yellow-billed Hornbill — "White-and-black body with a big banana-yellow curved bill."
  },
  'knysna-turaco': {
    template: 'songbird-crested',
    zones: { head: '#f2f0ea', beak: '#221e1a', eye: '#2b2117', body: '#3e6b4a', breast: '#c9b79e', wing: '#b5292b', tail: '#453a2e', legs: '#2b2620' },
    // Knysna Turaco — "Glossy green with a white-tipped crest and flashing crimson wings."
  },
  'purple-crested-turaco': {
    template: 'songbird-crested',
    zones: { head: '#5c3b6e', beak: '#221e1a', eye: '#2b2117', body: '#5c3b6e', breast: '#c9b79e', wing: '#c0392b', tail: '#453a2e', legs: '#2b2620' },
    // Purple-crested Turaco — "Glossy green and purple body with a violet crest and red wing flashes."
  },
  'african-spoonbill': {
    template: 'waterbird',
    zones: { head: '#c0392b', beak: '#8a8c82', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Spoonbill — "White body with a bare red face and grey spoon-shaped bill."
  },
  'saddle-billed-stork': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#e0c14a', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Saddle-billed Stork — "Black-and-white with a red-and-black bill capped by a yellow saddle."
  },
  'marabou-stork': {
    template: 'waterbird',
    zones: { head: '#d98fa0', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Marabou Stork — "Grey-and-white with a bare pink head and a dangling throat pouch."
  },
  'goliath-heron': {
    template: 'waterbird',
    zones: { head: '#7a3b24', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Goliath Heron — "Grey back with a deep chestnut head, neck and underparts."
  },
  'african-jacana': {
    template: 'waterbird',
    zones: { head: '#2c5c8a', beak: '#4a4438', eye: '#8a6a2e', body: '#f2f0ea', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Jacana — "Chestnut body, white-and-black neck and a pale blue forehead shield."
  },
  'african-harrier-hawk': {
    template: 'raptor',
    zones: { head: '#e0c14a', beak: '#221e1a', eye: '#e8c23d', body: '#b8bcb6', breast: '#201d19', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Harrier-Hawk — "Pale grey with a bare yellow face that flushes pink, and black-barred belly."
  },
  'african-goshawk': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Goshawk — "Grey above, finely rufous-barred below; females browner and bigger."
  },
  'barn-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#dda83d', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Barn Owl — "Golden-buff above, white below, with a pale heart-shaped face."
  },
  'marsh-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Marsh Owl — "Plain warm brown with small dark "ear" tufts and dark eyes."
  },
  'african-wood-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Wood Owl — "Warm brown, finely barred, with big dark eyes and a pale facial disc."
  },
  'gabar-goshawk': {
    template: 'raptor',
    zones: { head: '#8a8c82', beak: '#221e1a', eye: '#e8c23d', body: '#c0392b', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Gabar Goshawk — "Grey head and chest, finely barred belly, red cere and legs."
  },
  'black-sparrowhawk': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e0c14a' },
    // Black Sparrowhawk — "Black above, white below (some birds all dark), with long yellow legs."
  },
  'martial-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#4a3826', breast: '#f2f0ea', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Martial Eagle — "Dark brown above and on the chest, white belly with dark spots."
  },
  'african-hawk-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Hawk-Eagle — "Blackish above, white below with bold dark streaks."
  },
  'southern-red-billed-hornbill': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#201d19', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Southern Red-billed Hornbill — "White-and-black spotted body with a slim red curved bill."
  },
  'crowned-hornbill': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#4a3826', breast: '#f2f0ea', wing: '#14507a', tail: '#f2f0ea', legs: '#c0392b' },
    // Crowned Hornbill — "Dark brown above, white belly, with a red bill and white-tipped tail."
  },
  'purple-roller': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#7a5f3e', breast: '#5c3b6e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Purple Roller — "Lilac-brown with a streaked purple breast and a pale eyebrow."
  },
  'european-bee-eater': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#1f6b8a', breast: '#e0c14a', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // European Bee-eater — "Rainbow bird — chestnut back, gold shoulders, turquoise belly, yellow throat."
  },
  'white-fronted-bee-eater': {
    template: 'kingfisher',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#1c1712', body: '#3e6b4a', breast: '#c0392b', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // White-fronted Bee-eater — "Green back, white forehead, red throat and a black mask."
  },
  'little-bee-eater': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#3e6b4a', breast: '#e0c14a', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Little Bee-eater — "Green above, yellow throat with a black collar, cinnamon belly."
  },
  'swallow-tailed-bee-eater': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#3e6b4a', breast: '#e0c14a', wing: '#14507a', tail: '#2c5c8a', legs: '#c0392b' },
    // Swallow-tailed Bee-eater — "Green body, yellow throat, blue band, with a forked blue tail."
  },
  'magpie-shrike': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#1e1b18', tail: '#201d19', legs: '#1c1917' },
    // Magpie Shrike — "Black-and-white with a very long, trailing black tail."
  },
  'white-crested-helmetshrike': {
    template: 'starling',
    zones: { head: '#8a8c82', beak: '#151310', eye: '#e0c14a', body: '#8a8c82', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // White-crested Helmetshrike — "Grey-and-white with a yellow eye-wattle and a brushy grey crest."
  },
  'great-egret': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#e0c14a', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Great Egret — "All-white, with a long S-curved neck; bill yellow (black when breeding)."
  },
  'purple-heron': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Purple Heron — "Slender rufous-and-grey body with a chestnut, black-striped neck."
  },
  'squacco-heron': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#c9a66e', breast: '#e3e1d6', wing: '#f2f0ea', tail: '#5c5e54', legs: '#3a3a34' },
    // Squacco Heron — "Buff-brown at rest, but flashes brilliant white wings in flight."
  },
  'green-backed-heron': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Green-backed Heron — "Dark green-grey back, chestnut neck and a black cap."
  },
  'yellow-billed-stork': {
    template: 'waterbird',
    zones: { head: '#c0392b', beak: '#e0c14a', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#201d19', legs: '#3a3a34' },
    // Yellow-billed Stork — "White with a black tail, a yellow bill and a bare red face."
  },
  'woolly-necked-stork': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#f2f0ea', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Woolly-necked Stork — "Glossy black with a fluffy white neck and a white belly."
  },
  'african-openbill': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Openbill — "Glossy blackish-brown all over, with a distinctive gappy bill."
  },
  'glossy-ibis': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#3e6b4a', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Glossy Ibis — "Dark chestnut with a green-and-purple metallic sheen."
  },
  'giant-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#1c1712', body: '#201d19', breast: '#7a3b24', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Giant Kingfisher — "Black-spotted grey above, with a chestnut chest (male) or belly (female)."
  },
  'woodland-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#8a8c82', beak: '#201d19', eye: '#1c1712', body: '#2c5c8a', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Woodland Kingfisher — "Turquoise-blue back, grey head, with a red-and-black bill."
  },
  'african-black-oystercatcher': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#e0862e', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#d98fa0' },
    // African Black Oystercatcher — "All-black with a bright orange-red bill, eye-ring and pink legs."
  },
  'kelp-gull': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#e0c14a', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Kelp Gull — "White with a black back and wings, yellow bill with a red spot."
  },
  'hartlaubs-gull': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Hartlaub\'s Gull — "Pale grey and white with a soft lavender-grey wash and dark bill."
  },
  'greater-crested-tern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#e0c14a', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Greater Crested Tern — "Grey-and-white with a shaggy black cap and a yellow bill."
  },
  'caspian-tern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Caspian Tern — "Pale grey and white with a black cap and a huge blood-red bill."
  },
  'pied-avocet': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#8a8c82' },
    // Pied Avocet — "Crisp black-and-white with long blue-grey legs."
  },
  'water-thick-knee': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#e0c14a', body: '#8a8c82', breast: '#e3e1d6', wing: '#8a8c82', tail: '#5c5e54', legs: '#3a3a34' },
    // Water Thick-knee — "Grey-brown, streaky, with a grey wing-bar and big yellow eyes."
  },
  'white-faced-whistling-duck': {
    template: 'waterbird',
    zones: { head: '#f2f0ea', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // White-faced Whistling Duck — "Chestnut and black body with a clean white face and throat."
  },
  'rufous-naped-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#a3492a', tail: '#4a3e33', legs: '#6b5b47' },
    // Rufous-naped Lark — "Streaky brown with a rufous nape and rufous wing patches."
  },
  'red-capped-lark': {
    template: 'songbird-small',
    zones: { head: '#a3492a', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Red-capped Lark — "Plain grey-brown with a rufous cap and rufous shoulder patches."
  },
  'spike-heeled-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#f2f0ea', legs: '#6b5b47' },
    // Spike-heeled Lark — "Warm brown with a white-tipped tail and a long downcurved bill."
  },
  'sabota-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Sabota Lark — "Streaky brown with a bold white eyebrow and a stout bill."
  },
  'african-pipit': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#f2f0ea', legs: '#6b5b47' },
    // African Pipit — "Streaky brown above, pale below, with white outer tail feathers."
  },
  'northern-black-korhaan': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#f2f0ea', tail: '#5c5e54', legs: '#e0c14a' },
    // Northern Black Korhaan — "Male: black neck and underparts, barred back, yellow legs, white wing flash."
  },
  'blue-korhaan': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Blue Korhaan — "Grey-brown back with a powder-blue neck and belly, white ear patch."
  },
  'kori-bustard': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Kori Bustard — "Grey, finely vermiculated, with a black crest and a heavy build."
  },
  'zitting-cisticola': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Zitting Cisticola — "Tiny streaky brown bird with a white-tipped, fanned tail."
  },
  'rattling-cisticola': {
    template: 'songbird-small',
    zones: { head: '#a3492a', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Rattling Cisticola — "Streaky brown with a rufous cap, perched openly atop bushes."
  },
  'levaillants-cisticola': {
    template: 'songbird-small',
    zones: { head: '#a3492a', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Levaillant\'s Cisticola — "Streaky brown with a rufous cap and a long, often-cocked tail."
  },
  'familiar-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Familiar Chat — "Plain dusky brown with a rufous rump and tail."
  },
  'capped-wheatear': {
    template: 'songbird-small',
    zones: { head: '#201d19', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Capped Wheatear — "Crisp brown-and-white with a black cap-band, chest band and white brow."
  },
  'mountain-wheatear': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // Mountain Wheatear — "Variable: males grey-and-white to black-and-white, always with a white wing patch."
  },
  'southern-anteater-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // Southern Anteater-Chat — "Sooty brown-black with white wing patches that flash in flight."
  },
  'karoo-scrub-robin': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#f2f0ea', wing: '#6e5c4e', tail: '#201d19', legs: '#6b5b47' },
    // Karoo Scrub Robin — "Plain grey-brown with a blackish tail tipped white, and a white throat."
  },
  'karoo-prinia': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Karoo Prinia — "Streaky brown above, heavily spotted below, with a long upheld tail."
  },
  'pale-chanting-goshawk': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#c0392b', eye: '#e8c23d', body: '#b8bcb6', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#c0392b' },
    // Pale Chanting Goshawk — "Pale grey with a white rump, red legs and a red-based bill."
  },
  'greater-double-collared-sunbird': {
    template: 'sunbird',
    zones: { head: '#3e6b4a', beak: '#221e1a', eye: '#1c1712', body: '#2c5c8a', breast: '#b5292b', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Greater Double-collared Sunbird — "Male: metallic green head, broad scarlet breast band, blue rump."
  },
  'collared-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#3e6b4a', breast: '#eccb3e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Collared Sunbird — "Metallic green above and on the throat, with a bright yellow belly."
  },
  'scarlet-chested-sunbird': {
    template: 'sunbird',
    zones: { head: '#3e6b4a', beak: '#221e1a', eye: '#1c1712', body: '#201d19', breast: '#b5292b', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Scarlet-chested Sunbird — "Sooty black with a glittering green cap and a brilliant scarlet chest."
  },
  'olive-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#7c7a3e', breast: '#e8c93e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Olive Sunbird — "Plain olive-green all over, with hidden yellow tufts on the shoulders."
  },
  'red-capped-robin-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#d9762e', tail: '#4a3e33', legs: '#6b5b47' },
    // Red-capped Robin-Chat — "Glowing orange below and on the face, with a blue-grey back."
  },
  'chorister-robin-chat': {
    template: 'songbird-small',
    zones: { head: '#d9762e', beak: '#4a433d', eye: '#2b2117', body: '#d9762e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Chorister Robin-Chat — "Orange below, slate-grey above, with an all-orange face (no eyebrow)."
  },
  'white-starred-robin': {
    template: 'songbird-small',
    zones: { head: '#f2f0ea', beak: '#4a433d', eye: '#2b2117', body: '#7c7a3e', breast: '#eccb3e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // White-starred Robin — "Olive-and-grey with a bright yellow belly and tiny white "star" spots on the face."
  },
  'cape-rock-thrush': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Rock Thrush — "Male: blue-grey head and orange underparts; female browner."
  },
  'golden-tailed-woodpecker': {
    template: 'barbet',
    zones: { head: '#c0392b', beak: '#ede3c8', eye: '#c0392b', body: '#3e6b4a', breast: '#c9c3b6', wing: '#3a3026', tail: '#e0c14a', legs: '#7a756a' },
    // Golden-tailed Woodpecker — "Green back, golden-yellow tail shafts, with red-streaked crown and moustache."
  },
  'acacia-pied-barbet': {
    template: 'barbet',
    zones: { head: '#e0c14a', beak: '#ede3c8', eye: '#c0392b', body: '#201d19', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Acacia Pied Barbet — "Black-and-white with a red forehead and a yellow face."
  },
  'yellow-fronted-tinkerbird': {
    template: 'barbet',
    zones: { head: '#eccb3e', beak: '#ede3c8', eye: '#c0392b', body: '#f2f0ea', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Yellow-fronted Tinkerbird — "Black-and-white striped back with a bright yellow forehead spot."
  },
  'southern-black-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Southern Black Flycatcher — "Glossy all-black with a slightly square-ended tail."
  },
  'chinspot-batis': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#a3492a', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Chinspot Batis — "Grey, black and white; female has a rufous "chinspot" and breast band."
  },
  'bar-throated-apalis': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Bar-throated Apalis — "Grey above, pale below, with a neat black bar across the throat."
  },
  'yellow-breasted-apalis': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#3e6b4a', breast: '#eccb3e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Yellow-breasted Apalis — "Grey head, green back and a bright yellow throat and breast."
  },
  'long-billed-crombec': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Long-billed Crombec — "Grey-brown above, buff below, looking almost tailless."
  },
  'green-wood-hoopoe': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#c0392b', eye: '#1c1712', body: '#3e6b4a', breast: '#e8c93e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Green Wood Hoopoe — "Glossy metallic green and purple with a long tail and a curved red bill."
  },
  'black-cuckooshrike': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#e0c14a', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Black Cuckooshrike — "Male glossy black (sometimes a yellow shoulder); female barred yellow and brown."
  },
  'cape-sugarbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#7a5f3e', breast: '#e0c14a', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Cape Sugarbird — "Streaky brown with a yellow vent and an absurdly long, streaming tail."
  },
  'orange-breasted-sunbird': {
    template: 'sunbird',
    zones: { head: '#3e6b4a', beak: '#221e1a', eye: '#1c1712', body: '#1c1a17', breast: '#d9762e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Orange-breasted Sunbird — "Male: green head, violet breast band and a glowing orange belly."
  },
  'cape-rockjumper': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#f2f0ea', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Rockjumper — "Male: grey head with white stripes, rufous belly and rump, black throat."
  },
  'cape-grassbird': {
    template: 'songbird-small',
    zones: { head: '#a3492a', beak: '#4a433d', eye: '#2b2117', body: '#a3492a', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Grassbird — "Rufous-streaked brown with a rufous cap and a long, ragged tail."
  },
  'cape-bunting': {
    template: 'weaver',
    zones: { head: '#f2f0ea', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#a3492a', tail: '#5c4a34', legs: '#b98268' },
    // Cape Bunting — "Grey with a boldly black-and-white striped head and rufous wings."
  },
  'cape-spurfowl': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#8a8c82', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // Cape Spurfowl — "Large, dark, finely vermiculated grey-brown with a reddish bill and legs."
  },
  'cape-siskin': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#5c4a34', legs: '#b98268' },
    // Cape Siskin — "Streaky olive-brown with white tips to the wing and tail feathers."
  },
  'victorins-warbler': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#e0c14a', body: '#a3492a', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Victorin\'s Warbler — "Warm rufous-brown with a greyer face and bright orange-yellow eyes."
  },
  'swee-waxbill': {
    template: 'weaver',
    zones: { head: '#201d19', beak: '#3a342a', eye: '#2b2117', body: '#7c7a3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Swee Waxbill — "Olive back, grey head, red rump; male has a black face."
  },
  'brimstone-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#e0c14a', eye: '#2b2117', body: '#e0c14a', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Brimstone Canary — "Heavy-billed olive-yellow, brighter yellow below, with a greenish wash."
  },
  'streaky-headed-seedeater': {
    template: 'weaver',
    zones: { head: '#f2f0ea', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Streaky-headed Seedeater — "Plain brown with a finely white-streaked crown and a white eyebrow."
  },
  'gurneys-sugarbird': {
    template: 'sunbird',
    zones: { head: '#a3492a', beak: '#221e1a', eye: '#1c1712', body: '#1c1a17', breast: '#e8c93e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Gurney\'s Sugarbird — "Rufous cap and breast, streaky body, with a long tail (shorter than Cape Sugarbird)."
  },
  'drakensberg-rockjumper': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#f2f0ea', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Drakensberg Rockjumper — "Male: grey head with white stripes, deep orange belly, black throat."
  },
  'sentinel-rock-thrush': {
    template: 'songbird-small',
    zones: { head: '#8a8c82', beak: '#4a433d', eye: '#2b2117', body: '#7c6e58', breast: '#d9762e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Sentinel Rock Thrush — "Male: blue-grey head and back, orange underparts and rump."
  },
  'buff-streaked-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#c9a66e', breast: '#d9762e', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // Buff-streaked Chat — "Male: buff-and-black with a white wing patch and orange underparts."
  },
  'ground-woodpecker': {
    template: 'barbet',
    zones: { head: '#f0c93e', beak: '#ede3c8', eye: '#c0392b', body: '#c0392b', breast: '#c0392b', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Ground Woodpecker — "Olive-grey with a pink-red belly and rump, and a red moustache (male)."
  },
  'bush-blackcap': {
    template: 'songbird-small',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Bush Blackcap — "Grey with a neat black cap and a pinkish-red bill."
  },
  'sombre-greenbul': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#f2f0ea', body: '#7c7a3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Sombre Greenbul — "Plain olive-green with a striking pale, staring white eye."
  },
  'cape-shoveler': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#2c5c8a', tail: '#5c5e54', legs: '#3a3a34' },
    // Cape Shoveler — "Speckled greyish-brown all over with a big spatulate bill and pale blue wing patches."
  },
  'red-billed-teal': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Red-billed Teal — "Warm brown with a dark cap, pale cheeks and a bright coral-red bill."
  },
  'cape-teal': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#d98fa0', eye: '#c0392b', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Cape Teal — "Pale freckled grey overall with a pink-based upturned bill and a red eye."
  },
  'hottentot-teal': {
    template: 'waterbird',
    zones: { head: '#c9a66e', beak: '#8a8c82', eye: '#8a6a2e', body: '#7c7e74', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Hottentot Teal — "Dark cap, buff face, blue-grey bill and a dark smudge on the cheek."
  },
  'southern-pochard': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#8a8c82', eye: '#c0392b', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Southern Pochard — "Male: dark chocolate-brown with a glowing red eye and blue-grey bill."
  },
  'african-black-duck': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#d9762e', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Black Duck — "Sooty black with bold white blotches on the back and an orange-pink bill."
  },
  'maccoa-duck': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#2c5c8a', eye: '#8a6a2e', body: '#7c7e74', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Maccoa Duck — "Breeding male: rich chestnut body, black head and a bright cobalt-blue bill."
  },
  'knob-billed-duck': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#201d19', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Knob-billed Duck — "White below, glossy blue-black above; male has a large black knob on the bill."
  },
  'great-white-pelican': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#f2f0ea', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Great White Pelican — "White, often flushed pink, with a huge yellow-pink pouch and black flight feathers."
  },
  'pink-backed-pelican': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#d98fa0', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Pink-backed Pelican — "Greyish-white with a faint pink wash on the back and a yellowish pouch."
  },
  'black-crowned-night-heron': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#c0392b', body: '#f2f0ea', breast: '#e3e1d6', wing: '#8a8c82', tail: '#5c5e54', legs: '#3a3a34' },
    // Black-crowned Night Heron — "Adult: black crown and back, grey wings, white below, with a red eye."
  },
  'black-heron': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#eccb3e' },
    // Black Heron — "Entirely slate-black with bright yellow feet."
  },
  'little-bittern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#7c7e74', breast: '#e3e1d6', wing: '#c9a66e', tail: '#5c5e54', legs: '#3a3a34' },
    // Little Bittern — "Male: black crown and back, buff wing patches and pale underparts."
  },
  'african-rail': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#c0392b' },
    // African Rail — "Rich brown above, blue-grey below, with a long red bill and red legs."
  },
  'black-crake': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#eccb3e', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#c0392b' },
    // Black Crake — "Slaty-black body with a bright yellow bill and red legs and eyes."
  },
  'african-swamphen': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#8a6a2e', body: '#3e6b4a', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Swamphen — "Deep purple-blue with a green back, a huge red bill and frontal shield."
  },
  'african-snipe': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // African Snipe — "Intricately streaked brown and buff, with a very long straight bill."
  },
  'common-greenshank': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3e6b4a' },
    // Common Greenshank — "Pale grey-and-white with a long, slightly upturned bill and greenish legs."
  },
  'wood-sandpiper': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Wood Sandpiper — "Brown above, neatly spotted with buff, white below, with a pale eyebrow."
  },
  'common-sandpiper': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#f2f0ea', tail: '#5c5e54', legs: '#3a3a34' },
    // Common Sandpiper — "Olive-brown above, white below, with a white wedge in front of the wing."
  },
  'curlew-sandpiper': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Curlew Sandpiper — "Non-breeding: pale grey above, white below, with a white rump and curved bill."
  },
  'little-stint': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#201d19', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#201d19' },
    // Little Stint — "Grey-brown above, white below, with a short straight black bill and black legs."
  },
  'ruff': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#d9762e' },
    // Ruff — "Non-breeding: scaly brown above, paler below, with a smallish bill; legs often orange."
  },
  'common-ringed-plover': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#d9762e', eye: '#8a6a2e', body: '#7a5f3e', breast: '#201d19', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Common Ringed Plover — "Brown above, white below, with a black chest band and an orange-based bill."
  },
  'kittlitzs-plover': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#201d19', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Kittlitz\'s Plover — "Sandy-brown above, buff below, with a black eye-stripe and a white hind-collar."
  },
  'white-fronted-plover': {
    template: 'waterbird',
    zones: { head: '#f2f0ea', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // White-fronted Plover — "Pale sandy-grey above, white below, with a white forehead and pale legs."
  },
  'grey-plover': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Grey Plover — "Non-breeding: silvery grey, spangled above; black "armpits" show in flight."
  },
  'whiskered-tern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Whiskered Tern — "Breeding: grey body, black cap and a white cheek "whisker"; pale in winter."
  },
  'white-winged-tern': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#f2f0ea', tail: '#5c5e54', legs: '#3a3a34' },
    // White-winged Tern — "Non-breeding: pale grey and white; breeding: black body with white wings."
  },
  'common-tern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Common Tern — "Pale grey and white with a black cap and a dark-tipped red or black bill."
  },
  'sandwich-tern': {
    template: 'waterbird',
    zones: { head: '#201d19', beak: '#e0c14a', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Sandwich Tern — "Pale grey and white with a shaggy black cap and a black, yellow-tipped bill."
  },
  'grey-headed-gull': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#8a6a2e', body: '#b8bcb6', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Grey-headed Gull — "Pale grey and white with a soft grey hood (breeding) and pale eyes."
  },
  'greater-painted-snipe': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#4a4438', eye: '#f2f0ea', body: '#7c7e74', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Greater Painted-snipe — "Female brighter: chestnut neck, white eye-patch and "braces" over the back."
  },
  'cape-gannet': {
    template: 'waterbird',
    zones: { head: '#dda83d', beak: '#4a4438', eye: '#8a6a2e', body: '#f2f0ea', breast: '#201d19', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Cape Gannet — "White with black flight feathers, a golden head and a black throat-stripe."
  },
  'crowned-cormorant': {
    template: 'waterbird',
    zones: { head: '#c0392b', beak: '#4a4438', eye: '#8a6a2e', body: '#201d19', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Crowned Cormorant — "All black with a short forward crest and a red face when breeding."
  },
  'african-marsh-harrier': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#4a3826', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Marsh Harrier — "Dark brown with paler mottling on the chest and a barred tail."
  },
  'black-harrier': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#c9b79e', wing: '#5c4a2e', tail: '#f2f0ea', legs: '#e8c23d' },
    // Black Harrier — "Black with a white rump and a boldly black-and-white barred tail."
  },
  'booted-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Booted Eagle — "Two forms: a pale belly or an all-dark body; both show pale "landing lights"."
  },
  'long-crested-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#c9b79e', wing: '#f2f0ea', tail: '#4a3826', legs: '#e8c23d' },
    // Long-crested Eagle — "All dark brown-black with a long, floppy crest and white "windows" in the wings."
  },
  'wahlbergs-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Wahlberg\'s Eagle — "Usually plain brown with a small pointed crest; some birds paler."
  },
  'tawny-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#4a3826', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Tawny Eagle — "Variable tawny to dark brown, with a pale gape and dark eye."
  },
  'brown-snake-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e0c14a', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Brown Snake Eagle — "Uniform dark chocolate-brown with large, staring yellow eyes."
  },
  'black-chested-snake-eagle': {
    template: 'raptor',
    zones: { head: '#4a3826', beak: '#221e1a', eye: '#e0c14a', body: '#7a5f3e', breast: '#f2f0ea', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Black-chested Snake Eagle — "Dark brown head and chest, snowy-white belly, big yellow eyes."
  },
  'african-crowned-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#a3492a', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Crowned Eagle — "Dark above, boldly blotched rufous-and-black below, with a bushy crest."
  },
  'verreauxs-eagle': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#f2f0ea', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Verreaux\'s Eagle — "Jet black with a bold white "V" on the back and white rump."
  },
  'lanner-falcon': {
    template: 'raptor',
    zones: { head: '#a3492a', beak: '#221e1a', eye: '#e8c23d', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Lanner Falcon — "Grey above, rufous crown, creamy below, with a dark moustache."
  },
  'amur-falcon': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#55574f', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#c0392b' },
    // Amur Falcon — "Male: slate-grey with rusty thighs and red feet; female barred below."
  },
  'lesser-kestrel': {
    template: 'raptor',
    zones: { head: '#8a8c82', beak: '#221e1a', eye: '#e8c23d', body: '#a3492a', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Lesser Kestrel — "Male: rufous back, blue-grey head and wing panel, unspotted; female barred."
  },
  'steppe-buzzard': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Steppe Buzzard — "Variable brown with a pale breast-band; underwing pale with dark trailing edge."
  },
  'white-backed-vulture': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#f2f0ea', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // White-backed Vulture — "Brown body with a white lower back (visible mainly in flight) and dark face."
  },
  'cape-vulture': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#c9a66e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Cape Vulture — "Creamy-buff body with dark flight feathers and a bluish bare neck."
  },
  'lappet-faced-vulture': {
    template: 'raptor',
    zones: { head: '#c0392b', beak: '#221e1a', eye: '#e8c23d', body: '#7a5f3e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Lappet-faced Vulture — "Massive and dark with a bare pink-red head and folds of skin (lappets)."
  },
  'bearded-vulture': {
    template: 'raptor',
    zones: { head: '#201d19', beak: '#221e1a', eye: '#e8c23d', body: '#d9762e', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Bearded Vulture — "Rusty-orange below, grey above, with a black mask and bristly "beard"."
  },
  'grey-headed-bushshrike': {
    template: 'starling',
    zones: { head: '#8a8c82', beak: '#151310', eye: '#8a6a2e', body: '#3e6b4a', breast: '#e0c14a', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Grey-headed Bushshrike — "Grey head, green back, bright golden-yellow underparts and a heavy hooked bill."
  },
  'orange-breasted-bushshrike': {
    template: 'starling',
    zones: { head: '#8a8c82', beak: '#151310', eye: '#8a6a2e', body: '#3e6b4a', breast: '#e0c14a', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Orange-breasted Bushshrike — "Yellow forehead, grey crown, green back and an orange-and-yellow breast."
  },
  'brown-crowned-tchagra': {
    template: 'starling',
    zones: { head: '#7a5f3e', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#a3492a', tail: '#1e1b18', legs: '#1c1917' },
    // Brown-crowned Tchagra — "Brown crown, dark eye-stripe, rufous wings and a pale eyebrow."
  },
  'black-backed-puffback': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#c0392b', body: '#201d19', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Black-backed Puffback — "Male: black above, white below, with a bright red eye and a puffable white rump."
  },
  'brubru': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Brubru — "Black-and-white above with bold rufous flank stripes."
  },
  'yellow-bellied-greenbul': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7c7a3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Yellow-bellied Greenbul — "Olive-green above, washed bright yellow below, with a pale staring eye."
  },
  'terrestrial-brownbul': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Terrestrial Brownbul — "Plain dull brown with a slightly paler throat."
  },
  'ashy-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Ashy Flycatcher — "Soft blue-grey above, paler below, with a thin dark eye-line."
  },
  'spotted-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Spotted Flycatcher — "Plain grey-brown with fine streaks on the forehead and breast."
  },
  'marico-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Marico Flycatcher — "Plain warm brown above, clean white below."
  },
  'chestnut-vented-warbler': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#f2f0ea', body: '#8a8c82', breast: '#7a3b24', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Chestnut-vented Warbler — "Grey above, pale below, with a white eye, white throat and chestnut vent."
  },
  'violet-backed-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#7a5f3e', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Violet-backed Starling — "Male: dazzling iridescent violet above, snow-white below; female streaky brown."
  },
  'burchells-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Burchell\'s Starling — "Large and glossy blue-black with a long, broad tail and a dark eye."
  },
  'yellow-throated-petronia': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#e0c14a', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Yellow-throated Petronia — "Plain grey-brown with a bold white eyebrow and a hidden yellow throat spot."
  },
  'golden-breasted-bunting': {
    template: 'weaver',
    zones: { head: '#f2f0ea', beak: '#3a342a', eye: '#2b2117', body: '#a3492a', breast: '#e0c14a', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Golden-breasted Bunting — "Black-and-white striped head, golden-yellow breast and a rufous back."
  },
  'red-billed-firefinch': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#d98fa0', eye: '#2b2117', body: '#c0392b', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Red-billed Firefinch — "Male: rosy-red all over with fine white spots and a pink bill."
  },
  'green-winged-pytilia': {
    template: 'weaver',
    zones: { head: '#c0392b', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#f2f0ea', wing: '#3e6b4a', tail: '#5c4a34', legs: '#b98268' },
    // Green-winged Pytilia — "Male: red face, grey neck, green wings and barred yellow-and-white belly."
  },
  'violet-eared-waxbill': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#c0392b', eye: '#2b2117', body: '#5c3b6e', breast: '#7a3b24', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Violet-eared Waxbill — "Male: chestnut body, violet cheeks, blue rump and brow, with a red bill."
  },
  'plain-backed-pipit': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9a66e', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Plain-backed Pipit — "Plain warm-brown above with a faintly streaked breast and buffy underparts."
  },
  'long-billed-pipit': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#c9a66e', legs: '#6b5b47' },
    // Long-billed Pipit — "Dull greyish-brown with a longish bill and buff outer tail feathers."
  },
  'yellow-throated-longclaw': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Yellow-throated Longclaw — "Brown above, bright yellow below with a bold black necklace across the throat."
  },
  'fawn-coloured-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#c9a66e', breast: '#c9c3b6', wing: '#a3492a', tail: '#4a3e33', legs: '#6b5b47' },
    // Fawn-coloured Lark — "Warm fawn-brown above, whitish below, with a pale eyebrow and rufous wings."
  },
  'monotonous-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#f2f0ea', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Monotonous Lark — "Streaky brown above, white below, with a white throat shown when singing."
  },
  'flappet-lark': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#a3492a', breast: '#c9c3b6', wing: '#a3492a', tail: '#4a3e33', legs: '#6b5b47' },
    // Flappet Lark — "Rich rufous-brown, mottled above, with rufous wings."
  },
  'desert-cisticola': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#c9a66e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Desert Cisticola — "Streaky buff-brown above, pale below, with a short tail."
  },
  'croaking-cisticola': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Croaking Cisticola — "Large for a cisticola, streaky brown above with a heavy bill."
  },
  'neddicky': {
    template: 'songbird-small',
    zones: { head: '#a3492a', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Neddicky — "Plain grey-brown with a rufous cap and a longish tail."
  },
  'white-throated-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#f2f0ea', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // White-throated Canary — "Dull grey-brown with a white throat, a yellow rump and a heavy bill."
  },
  'black-throated-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Black-throated Canary — "Streaky grey-brown with a small dark throat-smudge and a bright yellow rump."
  },
  'forest-canary': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#e0c14a', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Forest Canary — "Streaky yellow-green with a dark face mask and fine streaking below."
  },
  'african-scops-owl': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // African Scops Owl — "Tiny and bark-grey, intricately mottled, with small ear-tufts."
  },
  'mandarin-duck': {
    template: 'waterbird',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#8a6a2e', body: '#d9762e', breast: '#5c3b6e', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Mandarin Duck — "The male is unmistakable — orange "sail" feathers, purple chest, copper cheeks and a red bill."
  },
  'wood-duck': {
    template: 'waterbird',
    zones: { head: '#f2f0ea', beak: '#4a4438', eye: '#c0392b', body: '#3e6b4a', breast: '#7a3b24', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Wood Duck — "The drake glows with a green-and-white crested head, chestnut chest and red eye."
  },
  'namaqua-dove': {
    template: 'dove',
    zones: { head: '#201d19', beak: '#c0392b', eye: '#2b2117', body: '#8a8c82', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // Namaqua Dove — "Soft grey-brown with a very long tail; the male has a black face and throat and an orange-and-red bill."
  },
  'african-olive-pigeon': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#eccb3e', eye: '#2b2117', body: '#5c2e3e', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // African Olive Pigeon — "Dark maroon body finely speckled with white, with a bright yellow bill, eye-ring and legs."
  },
  'spectacled-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#201d19', body: '#e0c14a', breast: '#201d19', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Spectacled Weaver — "Golden-yellow with a black line through a pale eye; the male adds a black throat patch."
  },
  'lesser-masked-weaver': {
    template: 'weaver',
    zones: { head: '#201d19', beak: '#3a342a', eye: '#2b2117', body: '#eccb3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#8a8c82' },
    // Lesser Masked Weaver — "Bright yellow with a black mask that runs up over the crown; pale whitish eye and blue-grey legs."
  },
  'thick-billed-weaver': {
    template: 'weaver',
    zones: { head: '#f2f0ea', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#5c4a34', legs: '#b98268' },
    // Thick-billed Weaver — "Male dark brown with a white forehead and white wing patches; female streaky brown and white below."
  },
  'sociable-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#c9a66e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Sociable Weaver — "Buff and grey-brown with a black chin and neatly scaled flanks."
  },
  'red-headed-finch': {
    template: 'weaver',
    zones: { head: '#c0392b', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Red-headed Finch — "Sandy-brown with a finely scaled belly; the male has a bright red head."
  },
  'african-firefinch': {
    template: 'weaver',
    zones: { head: '#8a8c82', beak: '#8a8c82', eye: '#2b2117', body: '#f2f0ea', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // African Firefinch — "Deep wine-red face and underparts dotted with white flank spots, with a blue-grey crown and red-and-grey bill."
  },
  'black-faced-waxbill': {
    template: 'weaver',
    zones: { head: '#201d19', beak: '#3a342a', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Black-faced Waxbill — "Soft grey with a black mask, finely barred wings and a rosy-red rump and belly."
  },
  'white-backed-mousebird': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#f2f0ea', eye: '#2b2418', body: '#f2f0ea', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#c0392b' },
    // White-backed Mousebird — "Pale grey-brown with a long tail, a white back stripe seen in flight, red legs and a blue-and-white bill."
  },
  'greater-blue-eared-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#e0c14a', body: '#3e6b4a', breast: '#2c5c8a', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Greater Blue-eared Starling — "Glossy blue-green with a deep blue belly, a blue ear patch and a glaring orange-yellow eye."
  },
  'mocking-cliff-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#55574f', breast: '#7a3b24', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Mocking Cliff Chat — "Male glossy black with a white shoulder patch and rich chestnut belly and rump; female slate-grey with a chestnut belly."
  },
  'white-browed-scrub-robin': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // White-browed Scrub Robin — "Warm brown above with a white eyebrow, a streaked breast, rufous rump and white wing-bars."
  },
  'scaly-feathered-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#d98fa0', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Scaly-feathered Weaver — "Tiny and pale, with a finely scaled forehead, a black-flecked "moustache" and a pink bill."
  },
  'rose-ringed-parakeet': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#c0392b', eye: '#2b2418', body: '#201d19', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Rose-ringed Parakeet — "Bright grass-green with a long tail and red bill; the male wears a black-and-rose neck ring."
  },
  'house-crow': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e8c23d', body: '#201d19', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // House Crow — "Slim glossy black with a contrasting grey-brown neck, breast and collar."
  },
  'emerald-spotted-wood-dove': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#8a8c82', breast: '#ddd1bf', wing: '#3e6b4a', tail: '#7a6c58', legs: '#d98fa0' },
    // Emerald-spotted Wood Dove — "Soft grey-brown with two rows of glossy emerald-green wing spots, a dark bill and pinkish legs."
  },
  'grey-sunbird': {
    template: 'sunbird',
    zones: { head: '#2f6b4a', beak: '#221e1a', eye: '#1c1712', body: '#8a8c82', breast: '#e8c93e', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Grey Sunbird — "Plain dusky grey all over, with a slightly down-curved bill and small scarlet shoulder tufts usually hidden."
  },
  'yellow-fronted-canary': {
    template: 'weaver',
    zones: { head: '#8a8c82', beak: '#3a342a', eye: '#2b2117', body: '#eccb3e', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Yellow-fronted Canary — "Bright yellow below and green above, with a yellow eyebrow and a neat grey-marked face."
  },
  'african-pied-wagtail': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#201d19', breast: '#201d19', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // African Pied Wagtail — "Crisp black-and-white with a black breast band and a white eyebrow."
  },
  'red-chested-cuckoo': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#55574f', breast: '#a3492a', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Red-chested Cuckoo — "Slate-grey above with a rich rufous chest and finely barred belly."
  },
  'klaass-cuckoo': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#3e6b4a', breast: '#3e6b4a', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Klaas\'s Cuckoo — "Male glossy emerald-green above and white below with a small green spur on the side of the chest; female barred bronze-green."
  },
  'little-swift': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#201d19', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Little Swift — "Sooty black with a bold square white rump and a short, square tail."
  },
  'african-palm-swift': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#8a8c82', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // African Palm Swift — "Slender, all grey-brown with very long narrow wings and a long deeply forked tail."
  },
  'lesser-striped-swallow': {
    template: 'swallow',
    zones: { head: '#e0862e', beak: '#14100c', eye: '#1c1712', body: '#f2f0ea', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Lesser Striped Swallow — "Deep rufous-orange cap and rump with a heavily dark-streaked white underside and long tail streamers."
  },
  'brown-throated-martin': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#7a5f3e', breast: '#7a5f3e', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // Brown-throated Martin — "Small and mouse-brown above, with a dusky brown throat and breast fading to paler below."
  },
  'african-dusky-flycatcher': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // African Dusky Flycatcher — "Plain dusky grey-brown, paler and faintly smudged below, with large dark eyes."
  },
  'tambourine-dove': {
    template: 'dove',
    zones: { head: '#f2f0ea', beak: '#3d362d', eye: '#2b2117', body: '#4a3826', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // Tambourine Dove — "Dark brown above and clean white below, with a white face and dark wing spots."
  },
  'cut-throat-finch': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#7a5f3e', breast: '#c0392b', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Cut-throat Finch — "Sandy-brown, finely scaled all over; the male has a vivid red band across the throat."
  },
  'orange-breasted-waxbill': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#c0392b', eye: '#2b2117', body: '#7c7a3e', breast: '#e0c14a', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Orange-breasted Waxbill — "Tiny and warm-toned, the male olive above with a red bill, red eyebrow and orange-yellow underparts."
  },
  'lesser-honeyguide': {
    template: 'barbet',
    zones: { head: '#f0c93e', beak: '#ede3c8', eye: '#c0392b', body: '#8a8c82', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Lesser Honeyguide — "Plain olive-grey, paler below, with a short stubby bill and a small dark cheek mark."
  },
  'red-throated-wryneck': {
    template: 'barbet',
    zones: { head: '#f0c93e', beak: '#ede3c8', eye: '#c0392b', body: '#7a5f3e', breast: '#c0392b', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Red-throated Wryneck — "Cryptic bark-brown, finely barred and mottled, with a rufous-red throat patch."
  },
  'holubs-golden-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#e0c14a', body: '#e0c14a', breast: '#d9762e', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Holub\'s Golden Weaver — "Big and rich golden-yellow, washed orange on the throat, with a heavy bill and a pale yellow eye."
  },
  'bearded-woodpecker': {
    template: 'barbet',
    zones: { head: '#c0392b', beak: '#ede3c8', eye: '#c0392b', body: '#8a8c82', breast: '#c9c3b6', wing: '#3a3026', tail: '#2b241e', legs: '#7a756a' },
    // Bearded Woodpecker — "Large, barred grey-brown with bold black face stripes; the male has a red hind-crown."
  },
  'greater-honeyguide': {
    template: 'barbet',
    zones: { head: '#f0c93e', beak: '#d98fa0', eye: '#c0392b', body: '#8a8c82', breast: '#201d19', wing: '#3a3026', tail: '#f2f0ea', legs: '#7a756a' },
    // Greater Honeyguide — "Drab grey-brown; the male has a black throat, pink bill and white ear patch, and white outer tail feathers flash in flight."
  },
  'kalahari-scrub-robin': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#201d19', legs: '#6b5b47' },
    // Kalahari Scrub Robin — "Sandy grey-brown with a rufous rump and tail, the tail tipped black and white and held cocked."
  },
  'white-rumped-swift': {
    template: 'swallow',
    zones: { head: '#1c2430', beak: '#14100c', eye: '#1c1712', body: '#201d19', breast: '#e8dcc4', wing: '#14181f', tail: '#1c2430', legs: '#221e1a' },
    // White-rumped Swift — "Slim and glossy black with a narrow white horseshoe rump and a long, deeply forked tail."
  },
  'grey-backed-camaroptera': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#3e6b4a', tail: '#4a3e33', legs: '#6b5b47' },
    // Grey-backed Camaroptera — "Grey above with greener wings, pale below; cocks its tail and is usually heard before seen."
  },
  'willow-warbler': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Willow Warbler — "Plain olive-grey above and pale yellowish below, with a soft pale eyebrow and fine bill."
  },
  'southern-black-tit': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // Southern Black Tit — "Sooty black with a white wing patch and white edges that show as it forages."
  },
  'cape-penduline-tit': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#c9a66e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Cape Penduline Tit — "Minute and pale grey-buff, yellowish below, with a tiny finely pointed bill."
  },
  'red-billed-oxpecker': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#c0392b', eye: '#e0c14a', body: '#7a5f3e', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Red-billed Oxpecker — "Plain olive-brown with a bright red bill and a bare yellow ring around a red eye."
  },
  'black-crowned-tchagra': {
    template: 'starling',
    zones: { head: '#201d19', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#a3492a', tail: '#1e1b18', legs: '#1c1917' },
    // Black-crowned Tchagra — "Rich rufous wings, a streaked back, a bold black crown and a black-and-white eyebrow."
  },
  'southern-white-crowned-shrike': {
    template: 'starling',
    zones: { head: '#f2f0ea', beak: '#151310', eye: '#8a6a2e', body: '#7a5f3e', breast: '#3a352e', wing: '#1e1b18', tail: '#1e1b18', legs: '#1c1917' },
    // Southern White-crowned Shrike — "Brown above and white below, with a white crown and forehead and a dark mask through the eye."
  },
  'white-throated-robin-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#f2f0ea', wing: '#f2f0ea', tail: '#4a3e33', legs: '#6b5b47' },
    // White-throated Robin-Chat — "Grey-backed with an orange breast, a clean white throat, a white eyebrow and a white wing-stripe."
  },
  'striped-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#7a5f3e', beak: '#c0392b', eye: '#1c1712', body: '#1f6b8a', breast: '#d9762e', wing: '#2c5c8a', tail: '#123a52', legs: '#c0392b' },
    // Striped Kingfisher — "Drab streaky brown head, dark bill, a pale collar and bright blue flashes in the wings and tail."
  },
  'crested-francolin': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#3d362d', eye: '#2b2117', body: '#7a5f3e', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#b06a55' },
    // Crested Francolin — "Mottled brown with a white eyebrow and a dark crest, often carrying its tail cocked like a bantam."
  },
  'natal-spurfowl': {
    template: 'dove',
    zones: { head: '#c7b9a3', beak: '#e0c14a', eye: '#2b2117', body: '#7a5f3e', breast: '#ddd1bf', wing: '#8f7f68', tail: '#7a6c58', legs: '#c0392b' },
    // Natal Spurfowl — "Finely vermiculated brown with red legs and a red-and-yellow bill."
  },
  'southern-pied-babbler': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#e0c14a', body: '#f2f0ea', breast: '#c9c3b6', wing: '#201d19', tail: '#4a3e33', legs: '#6b5b47' },
    // Southern Pied Babbler — "Striking white body with black wings and tail and a pale yellow eye."
  },
  'yellow-bishop': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Yellow Bishop — "Breeding male black with a bright yellow rump and shoulder; female and non-breeding birds streaky brown."
  },
  'white-winged-widowbird': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#7a5f3e', breast: '#e8e0c8', wing: '#f2f0ea', tail: '#3a342a', legs: '#3a2e22' },
    // White-winged Widowbird — "Breeding male black with bold white wing patches and a yellow shoulder; females and non-breeding males streaky brown."
  },
  'shaft-tailed-whydah': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#c0392b', eye: '#2b2418', body: '#201d19', breast: '#e8e0c8', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Shaft-tailed Whydah — "Breeding male black above and golden-buff below with four long, straight, ribbon-like tail shafts and a red bill."
  },
  'dark-backed-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Dark-backed Weaver — "Dark olive-black above and rich yellow below, with a pale eye and a heavy bill."
  },
  'dusky-sunbird': {
    template: 'sunbird',
    zones: { head: '#201d19', beak: '#221e1a', eye: '#1c1712', body: '#8a8c82', breast: '#f2f0ea', wing: '#1c1a17', tail: '#2f6b4a', legs: '#221e1a' },
    // Dusky Sunbird — "Breeding male glossy blue-black on the head and chest with white underparts; female and non-breeding birds dull grey-brown."
  },
  'jacobin-cuckoo': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#8a6a2e', body: '#201d19', breast: '#3a352e', wing: '#f2f0ea', tail: '#1e1b18', legs: '#1c1917' },
    // Jacobin Cuckoo — "Black above and white below, with a tall pointed crest and a white wing-flash."
  },
  'southern-carmine-bee-eater': {
    template: 'kingfisher',
    zones: { head: '#2c5c8a', beak: '#c0392b', eye: '#1c1712', body: '#1f6b8a', breast: '#d9762e', wing: '#d98fa0', tail: '#123a52', legs: '#c0392b' },
    // Southern Carmine Bee-eater — "Glowing carmine-pink with a teal-blue crown and rump and a long-streamered tail."
  },
  'grey-crowned-crane': {
    template: 'waterbird',
    zones: { head: '#dda83d', beak: '#4a4438', eye: '#8a6a2e', body: '#8a8c82', breast: '#c0392b', wing: '#6e7066', tail: '#5c5e54', legs: '#3a3a34' },
    // Grey Crowned Crane — "Grey body with a velvety black face, white cheeks, a red throat wattle and a spray of golden bristles for a crown."
  },
  'trumpeter-hornbill': {
    template: 'kingfisher',
    zones: { head: '#1a3a6b', beak: '#c0392b', eye: '#d98fa0', body: '#201d19', breast: '#d9762e', wing: '#14507a', tail: '#123a52', legs: '#c0392b' },
    // Trumpeter Hornbill — "Big and black-and-white with a large casque on the bill and bare pink skin around the eye."
  },
  'grey-headed-kingfisher': {
    template: 'kingfisher',
    zones: { head: '#8a8c82', beak: '#c0392b', eye: '#1c1712', body: '#201d19', breast: '#7a3b24', wing: '#2c5c8a', tail: '#123a52', legs: '#c0392b' },
    // Grey-headed Kingfisher — "Grey head and chest, a black back, a chestnut belly and glowing cobalt-blue wings and tail, with a red bill."
  },
  'red-billed-buffalo-weaver': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#c0392b', eye: '#2b2117', body: '#201d19', breast: '#c9c3b6', wing: '#f2f0ea', tail: '#5c4a34', legs: '#b98268' },
    // Red-billed Buffalo Weaver — "Sooty black with a stout red bill and small white wing flecks."
  },
  'great-sparrow': {
    template: 'weaver',
    zones: { head: '#8a8272', beak: '#3a342a', eye: '#2b2117', body: '#201d19', breast: '#7a3b24', wing: '#7a4a2e', tail: '#5c4a34', legs: '#b98268' },
    // Great Sparrow — "Like a richer House Sparrow — chestnut back and nape with a bright rufous wash and a black bib in the male."
  },
  'grey-backed-sparrow-lark': {
    template: 'songbird-small',
    zones: { head: '#f2f0ea', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#201d19', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Grey-backed Sparrow-lark — "Small and stubby; the male grey above with a black belly and a black-and-white head pattern; the female plainer."
  },
  'yellow-bellied-eremomela': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#e0c14a', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Yellow-bellied Eremomela — "Tiny, grey above and on the chest with a clean lemon-yellow belly."
  },
  'lazy-cisticola': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#a3492a', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Lazy Cisticola — "Rufous-capped and streaky-backed with a long tail it often holds cocked."
  },
  'karoo-chat': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#8a8c82', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Karoo Chat — "Plain grey-brown with whitish outer tail feathers and a pale belly."
  },
  'mountain-wagtail': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#b8bcb6', breast: '#201d19', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Mountain Wagtail — "Slender pale grey above and white below, with a narrow black breast band and a very long tail."
  },
  'african-wattled-lapwing': {
    template: 'waterbird',
    zones: { head: '#f2f0ea', beak: '#e0c14a', eye: '#8a6a2e', body: '#7a5f3e', breast: '#e3e1d6', wing: '#6e7066', tail: '#5c5e54', legs: '#e0c14a' },
    // African Wattled Lapwing — "Large and brown with a streaked neck, a white forehead, yellow wattles at the bill and long yellow legs."
  },
  'southern-white-faced-owl': {
    template: 'raptor',
    zones: { head: '#201d19', beak: '#221e1a', eye: '#e0862e', body: '#b8bcb6', breast: '#c9b79e', wing: '#5c4a2e', tail: '#4a3826', legs: '#e8c23d' },
    // Southern White-faced Owl — "Pale grey with a striking white face boldly outlined in black, topped by short ear-tufts and bright orange eyes."
  },
  'little-sparrowhawk': {
    template: 'raptor',
    zones: { head: '#5a4a36', beak: '#221e1a', eye: '#e0c14a', body: '#8a8c82', breast: '#c9b79e', wing: '#5c4a2e', tail: '#f2f0ea', legs: '#e8c23d' },
    // Little Sparrowhawk — "Tiny grey hawk, finely barred rufous below, with a yellow eye and two white spots on the rump-top of the tail."
  },
  'long-tailed-paradise-whydah': {
    template: 'longtail',
    zones: { head: '#8a7b63', beak: '#403a30', eye: '#2b2418', body: '#7a5f3e', breast: '#7a3b24', wing: '#5c5240', tail: '#3a342a', legs: '#3a2e22' },
    // Long-tailed Paradise Whydah — "Breeding male black with a chestnut chest and golden nape and a broad, very long flowing tail; females and non-breeding males are streaky brown."
  },
  'lesser-swamp-warbler': {
    template: 'songbird-small',
    zones: { head: '#6b5a42', beak: '#4a433d', eye: '#2b2117', body: '#7a5f3e', breast: '#c9c3b6', wing: '#6e5c4e', tail: '#4a3e33', legs: '#6b5b47' },
    // Lesser Swamp Warbler — "Plain warm brown above and pale below, with a fine bill and a pale eyebrow."
  },
  'mevess-starling': {
    template: 'starling',
    zones: { head: '#1c1a17', beak: '#151310', eye: '#c0392b', body: '#3e6b4a', breast: '#3a352e', wing: '#1e1b18', tail: '#2f6b4a', legs: '#1c1917' },
    // Meves\'s Starling — "Glossy blue-green and violet with a very long, tapering glossy tail and a red eye."
  },
}
