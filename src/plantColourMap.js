// Real species colours AND shape variation for every plant in SA_PLANT_LIBRARY
// (see plantTemplates.jsx for the 12 template shapes these fill: stem,
// leafMain, leafSecondary, petal, center, soil — plus the 7 variation
// modifiers: leafCount, leafAngle, leafWidth, height, flowerCount,
// flowerSize, hasStem) — all 207 species in src/plantData.js.
//
// Two axes of differentiation now, not one: two species sharing a template
// (e.g. two aloes) look different both by colour AND by shape — an Aloe
// ferox (bitter-aloe) has many thick upright leaves and a tall flower spike,
// while a low spreading coral-aloe has fewer, wider, more spreading leaves
// and stays close to the ground. A King Protea has a single huge flower
// head; a Pincushion Protea has a cluster of smaller round heads.
//
// Each entry picks the template whose growth habit is the closest real
// match, per the brief:
//   aloe, protea, succulent, flowering-shrub, grass-tuft, tree-small, palm,
//   fern, bulb-flower, ground-cover, climbing-vine, herb
//
// ---- Two sections below (mirrors birdColourMap.js's approach) ----
// 1. Hand-curated species — real, researched colours AND shape (proteas,
//    aloes, fynbos icons, and other well-known SA garden/indigenous
//    species) where a real distinguishing trait is known (e.g. King Protea
//    vs. Pincushion Protea's head count/size, Aloe ferox vs. a low
//    spreading aloe's leaf count/spread/stem).
// 2. The remaining species — template classified by keyword/family matching
//    (see file header history), zones scanned from funFact colour words,
//    and variation now generated the same deterministic-hash way the zones'
//    "small per-species hash jitter" already worked: no two entries land on
//    the exact same seven-parameter combination, but treat this section's
//    exact numbers as "closest reasonable approximation," not verified
//    per-species — spot check and hand-fix any that read wrong, the same as
//    the colours already do.

export const PLANT_COLOUR_MAP = {
  'king-protea': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#5f7a52', leafSecondary: '#7c9468',
      petal: '#e8a7bb', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 29.7, leafWidth: 1.2, height: 1.15,
      flowerCount: 1, flowerSize: 1.6, hasStem: true,
    },
  },
  'sugarbush': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#5f7a52', leafSecondary: '#7c9468',
      petal: '#e0b49a', center: '#4a3628', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 23, leafWidth: 1.2, height: 1.05,
      flowerCount: 2, flowerSize: 1.1, hasStem: true,
    },
  },
  'pincushion': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#536e46', leafSecondary: '#70885c',
      petal: '#e8823a', center: '#c9612a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 30, leafWidth: 0.9, height: 0.9,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'silver-tree': {
    template: 'tree-small',
    zones: {
      stem: '#8a8272', leafMain: '#b8c0b0', leafSecondary: '#d0d8c8',
      petal: '#c8d0c0', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 47.9, leafWidth: 0.9, height: 0.7,
      flowerCount: 4, flowerSize: 0.5, hasStem: false,
    },
  },
  'watsonia': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#e07a9a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1, height: 1.3,
      flowerCount: 1, flowerSize: 1.2, hasStem: true,
    },
  },
  'freesia': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#f2e6a0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 1.2, height: 1.2,
      flowerCount: 4, flowerSize: 1.1, hasStem: true,
    },
  },
  'agapanthus': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#7a6fd0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.2, height: 1.1,
      flowerCount: 7, flowerSize: 0.9, hasStem: true,
    },
  },
  'clivia': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#e0723a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.9, height: 0.8,
      flowerCount: 6, flowerSize: 1.1, hasStem: true,
    },
  },
  'bird-of-paradise': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#e8823a', center: '#2a3a8a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.3, height: 0.95,
      flowerCount: 1, flowerSize: 1.3, hasStem: true,
    },
  },
  'arum-lily': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#f5f0e0', center: '#e8c93a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.2, height: 1,
      flowerCount: 1, flowerSize: 1.1, hasStem: true,
    },
  },
  'red-hot-poker': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#e8722a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.1, height: 1.1,
      flowerCount: 1, flowerSize: 1, hasStem: true,
    },
  },
  'wild-dagga': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#d97a2a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 42, leafWidth: 0.9, height: 1.1,
      flowerCount: 10, flowerSize: 1.3, hasStem: true,
    },
  },
  'barberton-daisy': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#45804b', leafSecondary: '#60a060',
      petal: '#d13a3a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.2, height: 0.9,
      flowerCount: 3, flowerSize: 1.4, hasStem: true,
    },
  },
  'plumbago': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#8fb8e0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 55, leafWidth: 1.1, height: 1.1,
      flowerCount: 12, flowerSize: 0.9, hasStem: true,
    },
  },
  'cape-honeysuckle': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#e0672a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 45, leafWidth: 0.9, height: 1.2,
      flowerCount: 8, flowerSize: 1.1, hasStem: true,
    },
  },
  'namaqualand-daisy': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#60a05b', leafSecondary: '#80b670',
      petal: '#e8a23a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 16, leafAngle: 130, leafWidth: 0.9, height: 0.75,
      flowerCount: 10, flowerSize: 1.1, hasStem: false,
    },
  },
  'vygie': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#60a05b', leafSecondary: '#80b670',
      petal: '#e0399a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 18, leafAngle: 120, leafWidth: 1.3, height: 0.7,
      flowerCount: 9, flowerSize: 1, hasStem: false,
    },
  },
  'bitter-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#829574', leafSecondary: '#9eab92',
      petal: '#e0672a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 13, leafAngle: 75, leafWidth: 1.2, height: 1.3,
      flowerCount: 7, flowerSize: 1, hasStem: true,
    },
  },
  'spekboom': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#6a9a5a', leafSecondary: '#afc1a2',
      petal: '#e07a9a', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 77.8, leafWidth: 0.55, height: 1.1,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'century-plant': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#8a9a7a', leafSecondary: '#98a58c',
      petal: '#c9d060', center: '#a8b060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 145, leafWidth: 1.6, height: 1.4,
      flowerCount: 4, flowerSize: 1.3, hasStem: false,
    },
  },
  'jacaranda': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#8a7ac9', center: '#c9b9e8', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 50, leafWidth: 0.75, height: 1.3,
      flowerCount: 10, flowerSize: 1.1, hasStem: true,
    },
  },
  'wild-garlic': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#a888c9', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.4, height: 1,
      flowerCount: 3, flowerSize: 1, hasStem: true,
    },
  },
  'cosmos': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#e0a0c0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 42.8, leafWidth: 0.9, height: 0.9,
      flowerCount: 14, flowerSize: 0.8, hasStem: true,
    },
  },
  'fire-heath': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#c0392b', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 58.1, leafWidth: 0.9, height: 1.3,
      flowerCount: 7, flowerSize: 1.1, hasStem: false,
    },
  },
  'sunshine-conebush': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#5f7a52', leafSecondary: '#7c9468',
      petal: '#e8c23a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 39.8, leafWidth: 0.9, height: 0.85,
      flowerCount: 3, flowerSize: 0.65, hasStem: true,
    },
  },
  'blushing-bride': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#536e46', leafSecondary: '#70885c',
      petal: '#f0d8d8', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 41.4, leafWidth: 1.3, height: 0.8,
      flowerCount: 2, flowerSize: 0.85, hasStem: true,
    },
  },
  'red-disa': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#c0392b', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1, height: 1.3,
      flowerCount: 5, flowerSize: 1.2, hasStem: true,
    },
  },
  'common-pagoda': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#6b865e', leafSecondary: '#88a074',
      petal: '#d9607a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 35, leafWidth: 0.8, height: 1,
      flowerCount: 4, flowerSize: 0.6, hasStem: true,
    },
  },
  'fever-tree': {
    template: 'tree-small',
    zones: {
      stem: '#b8c060', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 40, leafWidth: 0.6, height: 1.4,
      flowerCount: 6, flowerSize: 1, hasStem: true,
    },
  },
  'baobab': {
    template: 'tree-small',
    zones: {
      stem: '#a89a7a', leafMain: '#7a9a5a', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 65, leafWidth: 1.3, height: 0.7,
      flowerCount: 2, flowerSize: 1.1, hasStem: true,
    },
  },
  'coral-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#c0392b', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 30.9, leafWidth: 0.8, height: 1,
      flowerCount: 4, flowerSize: 0.9, hasStem: false,
    },
  },
  'krantz-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#829574', leafSecondary: '#9eab92',
      petal: '#e0602a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 11, leafAngle: 90, leafWidth: 1, height: 1.2,
      flowerCount: 6, flowerSize: 0.8, hasStem: true,
    },
  },
  'mountain-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#829574', leafSecondary: '#9eab92',
      petal: '#d9682a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 14, leafAngle: 130, leafWidth: 1.3, height: 1.45,
      flowerCount: 5, flowerSize: 1, hasStem: true,
    },
  },
  'pigs-ear': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#a3ad9a', leafSecondary: '#bcc4b2',
      petal: '#d9682a', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 64.4, leafWidth: 1.7, height: 0.85,
      flowerCount: 2, flowerSize: 0.7, hasStem: false,
    },
  },
  'jade-plant': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#5a8a5a', leafSecondary: '#a3b596',
      petal: '#e8b8c8', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 74.2, leafWidth: 1.3, height: 1.15,
      flowerCount: 3, flowerSize: 1, hasStem: true,
    },
  },
  'living-stones': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#b0a888', leafSecondary: '#c8c0a0',
      petal: '#f2d060', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 58.7, leafWidth: 2.4, height: 0.7,
      flowerCount: 1, flowerSize: 1, hasStem: false,
    },
  },
  'wild-iris': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#e8e0f0', center: '#8a2a3a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 1.4, height: 1.2,
      flowerCount: 7, flowerSize: 1.1, hasStem: true,
    },
  },
  'cancer-bush': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#56864b', leafSecondary: '#76a664',
      petal: '#d9682a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 35.9, leafWidth: 1.1, height: 0.9,
      flowerCount: 12, flowerSize: 1.3, hasStem: false,
    },
  },
  'lantana': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e0862a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 60, leafWidth: 1, height: 0.8,
      flowerCount: 14, flowerSize: 0.7, hasStem: true,
    },
  },
  'pompom-weed': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#c878b0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 36.3, leafWidth: 1, height: 1.1,
      flowerCount: 10, flowerSize: 1, hasStem: true,
    },
  },
  'blue-squill': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#45804b', leafSecondary: '#60a060',
      petal: '#5a7ac9', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.9, height: 0.6,
      flowerCount: 2, flowerSize: 1.1, hasStem: true,
    },
  },
  'bulbinella': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#4e8e49', leafSecondary: '#6ea45e',
      petal: '#e8c93a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 17, leafAngle: 110.9, leafWidth: 0.9, height: 1.1,
      flowerCount: 9, flowerSize: 1.1, hasStem: false,
    },
  },
  'impala-lily': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#7e8e6e', leafSecondary: '#97a98a',
      petal: '#e8a0b8', center: '#f2eec2', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 86.7, leafWidth: 1, height: 0.9,
      flowerCount: 4, flowerSize: 1.2, hasStem: true,
    },
  },
  'coral-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#a8b090', leafSecondary: '#a4b198',
      petal: '#e0805a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 8, leafAngle: 120, leafWidth: 1.3, height: 0.8,
      flowerCount: 4, flowerSize: 1.2, hasStem: false,
    },
  },
  'tree-fuchsia': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#d9602a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 66, leafWidth: 1, height: 1.2,
      flowerCount: 5, flowerSize: 0.6, hasStem: true,
    },
  },
  'pride-of-de-kaap': {
    template: 'climbing-vine',
    zones: {
      stem: '#5f7a3f', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#d9722a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1, leafWidth: 1.1, height: 1.2,
      flowerCount: 3, flowerSize: 1.1, hasStem: true,
    },
  },
  'golden-heath': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#4a7a3f', leafSecondary: '#6a9a58',
      petal: '#d9628a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 44.3, leafWidth: 1, height: 1.1,
      flowerCount: 10, flowerSize: 1.3, hasStem: true,
    },
  },
  'oleander-sugarbush': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#59744c', leafSecondary: '#768e62',
      petal: '#d9607a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 27.5, leafWidth: 0.75, height: 1.1,
      flowerCount: 2, flowerSize: 1, hasStem: true,
    },
  },
  'broadleaf-sugarbush': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#5f7a52', leafSecondary: '#7c9468',
      petal: '#e08aa0', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 32.1, leafWidth: 1.3, height: 1,
      flowerCount: 2, flowerSize: 1.05, hasStem: true,
    },
  },
  'rocket-pincushion': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#59744c', leafSecondary: '#768e62',
      petal: '#e0722a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 25, leafWidth: 1, height: 1.2,
      flowerCount: 1, flowerSize: 1.1, hasStem: true,
    },
  },
  'wild-gazania': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#4e8e49', leafSecondary: '#6ea45e',
      petal: '#e0862a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 10, leafAngle: 90.5, leafWidth: 0.9, height: 1.1,
      flowerCount: 6, flowerSize: 1.1, hasStem: false,
    },
  },
  'cape-daisy': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#4a7a3f', leafSecondary: '#6a9a58',
      petal: '#a888c9', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 39.5, leafWidth: 0.9, height: 1,
      flowerCount: 7, flowerSize: 1.1, hasStem: true,
    },
  },
  'baboon-flower': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#7a6fd0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 1.1, height: 1.4,
      flowerCount: 3, flowerSize: 0.8, hasStem: true,
    },
  },
  'harlequin-flower': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#c0392b', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.7, height: 0.9,
      flowerCount: 7, flowerSize: 0.9, hasStem: true,
    },
  },
  'nerine': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#e0399a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.3, height: 1.2,
      flowerCount: 2, flowerSize: 1, hasStem: true,
    },
  },
  'wild-gladiolus': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#d9607a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 1, height: 1.4,
      flowerCount: 1, flowerSize: 0.9, hasStem: true,
    },
  },
  'bietou': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e8c93a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 47.3, leafWidth: 1.1, height: 1,
      flowerCount: 10, flowerSize: 0.7, hasStem: true,
    },
  },
  'quiver-tree': {
    template: 'tree-small',
    zones: {
      stem: '#c9a25a', leafMain: '#8a9a7a', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 70, leafWidth: 1.2, height: 1.2,
      flowerCount: 3, flowerSize: 0.6, hasStem: true,
    },
  },
  'spiral-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#829574', leafSecondary: '#9eab92',
      petal: '#d9682a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 10, leafAngle: 150, leafWidth: 0.85, height: 0.75,
      flowerCount: 3, flowerSize: 0.9, hasStem: false,
    },
  },
  'tiger-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#889b7a', leafSecondary: '#c8d0c0',
      petal: '#d9682a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 9, leafAngle: 95, leafWidth: 0.75, height: 0.6,
      flowerCount: 3, flowerSize: 0.8, hasStem: false,
    },
  },
  'highveld-protea': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#536e46', leafSecondary: '#70885c',
      petal: '#e8c8b8', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 25.1, leafWidth: 1, height: 0.9,
      flowerCount: 1, flowerSize: 1.3, hasStem: true,
    },
  },
  'summer-hyacinth': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#45804b', leafSecondary: '#60a060',
      petal: '#f5f0e0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.2, height: 1.3,
      flowerCount: 3, flowerSize: 0.8, hasStem: true,
    },
  },
  'wild-foxglove': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#d98aa8', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 1.3, height: 0.9,
      flowerCount: 7, flowerSize: 0.8, hasStem: true,
    },
  },
  'poison-bulb': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#e8c8d0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.8, height: 1.5,
      flowerCount: 2, flowerSize: 1, hasStem: true,
    },
  },
  'cape-cowslip': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#d9682a', center: '#c9d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.3, height: 1.1,
      flowerCount: 6, flowerSize: 1.4, hasStem: true,
    },
  },
  'vlei-lily': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#e08aa0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 1.1, height: 1.1,
      flowerCount: 3, flowerSize: 0.8, hasStem: true,
    },
  },
  'wild-sage': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#7a9ac9', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1.2, leafWidth: 1, height: 1.1,
      flowerCount: 4, flowerSize: 0.9, hasStem: true,
    },
  },
  'sour-grass': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#54944f', leafSecondary: '#74aa64',
      petal: '#e8c93a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 15, leafAngle: 133.7, leafWidth: 0.8, height: 0.7,
      flowerCount: 8, flowerSize: 1.1, hasStem: false,
    },
  },
  'candelabra-lily': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#d9607a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.7, height: 1.2,
      flowerCount: 6, flowerSize: 0.8, hasStem: true,
    },
  },
  'snake-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#708362', leafSecondary: '#8c9980',
      petal: '#a8b06a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 65, leafWidth: 0.65, height: 0.95,
      flowerCount: 4, flowerSize: 1.2, hasStem: false,
    },
  },
  'tree-euphorbia': {
    template: 'tree-small',
    zones: {
      stem: '#8a9a8a', leafMain: '#6a8a6a', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 55.7, leafWidth: 1.2, height: 1,
      flowerCount: 3, flowerSize: 0.9, hasStem: false,
    },
  },
  'chincherinchee': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#f5f0e0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 0.9, height: 1.1,
      flowerCount: 5, flowerSize: 0.8, hasStem: true,
    },
  },
  'cape-tulip': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#a89ad0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 0.9, height: 1.4,
      flowerCount: 7, flowerSize: 1, hasStem: true,
    },
  },
  'soap-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#889b7a', leafSecondary: '#a4b198',
      petal: '#d9602a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 10, leafAngle: 100, leafWidth: 0.9, height: 0.85,
      flowerCount: 5, flowerSize: 1.2, hasStem: false,
    },
  },
  'monarch-of-the-veld': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e0722a', center: '#2b2117', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 46.8, leafWidth: 1, height: 0.8,
      flowerCount: 7, flowerSize: 0.8, hasStem: true,
    },
  },
  'sweetpea-bush': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#e08aa0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 43.6, leafWidth: 0.9, height: 1,
      flowerCount: 6, flowerSize: 1, hasStem: false,
    },
  },
  'whorled-heath': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e0a0c0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 31.4, leafWidth: 1.1, height: 0.8,
      flowerCount: 13, flowerSize: 0.7, hasStem: true,
    },
  },
  'berry-heath': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#4a7a3f', leafSecondary: '#6a9a58',
      petal: '#e0a0b0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 46.1, leafWidth: 0.8, height: 1.3,
      flowerCount: 13, flowerSize: 1.2, hasStem: true,
    },
  },
  'signal-heath': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#c0392b', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 41.3, leafWidth: 0.8, height: 1.4,
      flowerCount: 8, flowerSize: 0.8, hasStem: true,
    },
  },
  'golden-conebush': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#5f7a52', leafSecondary: '#7c9468',
      petal: '#e8c23a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 24.8, leafWidth: 1.1, height: 0.85,
      flowerCount: 3, flowerSize: 0.65, hasStem: true,
    },
  },
  'queen-protea': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#536e46', leafSecondary: '#70885c',
      petal: '#e08aa0', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 26.3, leafWidth: 1, height: 1.1,
      flowerCount: 1, flowerSize: 1.45, hasStem: true,
    },
  },
  'bot-river-protea': {
    template: 'protea',
    zones: {
      stem: '#6b7d4a', leafMain: '#6b865e', leafSecondary: '#88a074',
      petal: '#d97a9a', center: '#3d2a22', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 25.7, leafWidth: 0.9, height: 0.95,
      flowerCount: 2, flowerSize: 0.95, hasStem: true,
    },
  },
  'african-cornflag': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#e0722a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.8, height: 0.7,
      flowerCount: 4, flowerSize: 1.5, hasStem: true,
    },
  },
  'waterfall-gladiolus': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#c0392b', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 1.3, height: 1.3,
      flowerCount: 1, flowerSize: 1.3, hasStem: true,
    },
  },
  'blue-daisy': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#4a7a3f', leafSecondary: '#6a9a58',
      petal: '#6a9ad0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 57.6, leafWidth: 1, height: 1.2,
      flowerCount: 13, flowerSize: 0.8, hasStem: true,
    },
  },
  'twinspur': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#4e8e49', leafSecondary: '#6ea45e',
      petal: '#e0708a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 19, leafAngle: 125.7, leafWidth: 1.3, height: 0.8,
      flowerCount: 9, flowerSize: 0.9, hasStem: false,
    },
  },
  'trailing-lobelia': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#54944f', leafSecondary: '#74aa64',
      petal: '#6a6fd0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 16, leafAngle: 122.3, leafWidth: 1.1, height: 0.8,
      flowerCount: 4, flowerSize: 1.1, hasStem: false,
    },
  },
  'lace-aloe': {
    template: 'aloe',
    zones: {
      stem: '#8a7a52', leafMain: '#829574', leafSecondary: '#9eab92',
      petal: '#d9682a', center: '#e8c76a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 12, leafAngle: 110, leafWidth: 0.6, height: 0.55,
      flowerCount: 2, flowerSize: 1.1, hasStem: false,
    },
  },
  'yellow-wild-iris': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#3f7a45', leafSecondary: '#5a9a5a',
      petal: '#e8c93a', center: '#7a2a2a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 0.9, height: 0.7,
      flowerCount: 2, flowerSize: 1.2, hasStem: true,
    },
  },
  'african-potato': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#e8c93a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 0.9, height: 0.9,
      flowerCount: 5, flowerSize: 1, hasStem: true,
    },
  },
  'march-lily': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#45804b', leafSecondary: '#60a060',
      petal: '#e07a9a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 0.9, height: 1.5,
      flowerCount: 7, flowerSize: 1.2, hasStem: true,
    },
  },
  'paintbrush-lily': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#86a65b', leafSecondary: '#afc17a',
      petal: '#c0392b', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 23.9, leafWidth: 1.3, height: 1.5,
      flowerCount: 1, flowerSize: 1.1, hasStem: false,
    },
  },
  'pineapple-lily': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#d8e0a0', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 1, leafWidth: 1.3, height: 1.3,
      flowerCount: 6, flowerSize: 0.8, hasStem: true,
    },
  },
  'trailing-daisy': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#c060a0', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 14, leafAngle: 62.9, leafWidth: 0.8, height: 0.7,
      flowerCount: 8, flowerSize: 1, hasStem: false,
    },
  },
  'terracotta-gazania': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#d97a3a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 13, leafAngle: 72.9, leafWidth: 0.8, height: 0.7,
      flowerCount: 10, flowerSize: 1, hasStem: false,
    },
  },

  // ---- bulk/approximate pass — see file header ----
  'wild-banana': {
    template: 'palm',
    zones: {
      stem: '#8a6a42', leafMain: '#498950', leafSecondary: '#66a666',
      petal: '#d5ae46', center: '#8a6a2a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 100, leafWidth: 1.2, height: 1.05,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'karee': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 55, leafWidth: 0.85, height: 1.1,
      flowerCount: 4, flowerSize: 0.7, hasStem: true,
    },
  },
  'wild-olive': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 69.9, leafWidth: 0.9, height: 1.3,
      flowerCount: 5, flowerSize: 0.6, hasStem: true,
    },
  },
  'yellowwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 63.1, leafWidth: 1, height: 1.1,
      flowerCount: 1, flowerSize: 0.8, hasStem: true,
    },
  },
  'buffalo-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 59.7, leafWidth: 0.9, height: 1.6,
      flowerCount: 4, flowerSize: 1.2, hasStem: true,
    },
  },
  'horsetail-restio': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#80a055', leafSecondary: '#a9bb74',
      petal: '#cfbf90', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 39.6, leafWidth: 1.5, height: 0.9,
      flowerCount: 1, flowerSize: 0.7, hasStem: false,
    },
  },
  'rose-pelargonium': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#709058', leafSecondary: '#90a676',
      petal: '#e0839e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 0.9, leafWidth: 0.9, height: 1,
      flowerCount: 5, flowerSize: 1, hasStem: false,
    },
  },
  'wild-fig': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 65, leafWidth: 1.2, height: 1.15,
      flowerCount: 2, flowerSize: 0.9, hasStem: true,
    },
  },
  'marula': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 60, leafWidth: 1.1, height: 1.3,
      flowerCount: 5, flowerSize: 0.9, hasStem: true,
    },
  },
  'cape-ash': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 32.2, leafWidth: 1, height: 1.1,
      flowerCount: 8, flowerSize: 1.3, hasStem: true,
    },
  },
  'cabbage-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 68.4, leafWidth: 1, height: 1,
      flowerCount: 6, flowerSize: 1.2, hasStem: true,
    },
  },
  'sweet-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 44.5, leafWidth: 1, height: 0.7,
      flowerCount: 5, flowerSize: 0.5, hasStem: true,
    },
  },
  'spur-flower': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#447439', leafSecondary: '#649452',
      petal: '#cb5074', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 46, leafWidth: 1, height: 0.8,
      flowerCount: 4, flowerSize: 1.2, hasStem: true,
    },
  },
  'tree-wisteria': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#8a6fc9', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 62.3, leafWidth: 1.2, height: 1.4,
      flowerCount: 5, flowerSize: 1.2, hasStem: true,
    },
  },
  'weeping-boer-bean': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e2dac2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 69.1, leafWidth: 1.1, height: 1.6,
      flowerCount: 6, flowerSize: 1.2, hasStem: true,
    },
  },
  'buchu': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#5e7e46', leafSecondary: '#7e9464',
      petal: '#8e6ebc', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 0.8, leafWidth: 0.9, height: 0.85,
      flowerCount: 3, flowerSize: 1.2, hasStem: true,
    },
  },
  'rooibos': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#64844c', leafSecondary: '#849a6a',
      petal: '#9474c2', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 8, leafAngle: 1.3, leafWidth: 0.7, height: 1.2,
      flowerCount: 3, flowerSize: 0.9, hasStem: true,
    },
  },
  'african-wormwood': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#709058', leafSecondary: '#90a676',
      petal: '#a080ce', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1.3, leafWidth: 1, height: 1.2,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'milkwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 34.5, leafWidth: 0.7, height: 0.7,
      flowerCount: 8, flowerSize: 1, hasStem: true,
    },
  },
  'sour-fig': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#e8657a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 12, leafAngle: 140, leafWidth: 1.3, height: 0.65,
      flowerCount: 5, flowerSize: 1.2, hasStem: false,
    },
  },
  'bugweed': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e8c93a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 41.7, leafWidth: 1.1, height: 1,
      flowerCount: 13, flowerSize: 1, hasStem: true,
    },
  },
  'prickly-pear': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#90a080', leafSecondary: '#a9bb9c',
      petal: '#ee6090', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 42.1, leafWidth: 1.4, height: 1.4,
      flowerCount: 2, flowerSize: 1, hasStem: true,
    },
  },
  'water-hyacinth': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#66a661', leafSecondary: '#86bc76',
      petal: '#f47186', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 12, leafAngle: 87.4, leafWidth: 0.8, height: 0.8,
      flowerCount: 3, flowerSize: 0.8, hasStem: false,
    },
  },
  'black-wattle': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 31.8, leafWidth: 1.2, height: 0.8,
      flowerCount: 1, flowerSize: 0.8, hasStem: false,
    },
  },
  'cape-thatching-reed': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#7a9a4f', leafSecondary: '#a3b56e',
      petal: '#c9b98a', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 20, leafWidth: 0.7, height: 1.5,
      flowerCount: 2, flowerSize: 1.1, hasStem: false,
    },
  },
  'wild-peach': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 34.2, leafWidth: 1.2, height: 1.5,
      flowerCount: 8, flowerSize: 1.1, hasStem: false,
    },
  },
  'white-stinkwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#f2eec2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 30.5, leafWidth: 0.9, height: 1.3,
      flowerCount: 2, flowerSize: 0.6, hasStem: false,
    },
  },
  'wild-currant': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 53.9, leafWidth: 0.9, height: 0.8,
      flowerCount: 8, flowerSize: 0.5, hasStem: true,
    },
  },
  'weeping-willow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 63.7, leafWidth: 0.9, height: 1.4,
      flowerCount: 1, flowerSize: 1.3, hasStem: true,
    },
  },
  'wild-pear': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#f2eec2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 33.6, leafWidth: 1.1, height: 1.4,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'camel-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 64.2, leafWidth: 1, height: 0.7,
      flowerCount: 5, flowerSize: 0.6, hasStem: true,
    },
  },
  'shepherds-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8e0c8', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 43.3, leafWidth: 0.8, height: 1.1,
      flowerCount: 6, flowerSize: 1.3, hasStem: true,
    },
  },
  'wild-peppercress': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#76965e', leafSecondary: '#96ac7c',
      petal: '#a686d4', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 0.7, leafWidth: 1, height: 1,
      flowerCount: 3, flowerSize: 1.1, hasStem: false,
    },
  },
  'sneezewood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 52.7, leafWidth: 0.7, height: 0.9,
      flowerCount: 6, flowerSize: 0.8, hasStem: true,
    },
  },
  'cape-chestnut': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#e0839e', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 68.1, leafWidth: 0.8, height: 1.2,
      flowerCount: 1, flowerSize: 0.5, hasStem: true,
    },
  },
  'bushveld-gardenia': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 30.8, leafWidth: 1.1, height: 1.5,
      flowerCount: 8, flowerSize: 0.8, hasStem: false,
    },
  },
  'cluster-fig': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 41.7, leafWidth: 1, height: 1.6,
      flowerCount: 6, flowerSize: 0.6, hasStem: true,
    },
  },
  'wild-wisteria': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#8a6fc9', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 68.6, leafWidth: 0.7, height: 1.4,
      flowerCount: 7, flowerSize: 1.1, hasStem: true,
    },
  },
  'kalahari-christmas-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 49.9, leafWidth: 1.2, height: 1,
      flowerCount: 0, flowerSize: 1.1, hasStem: true,
    },
  },
  'wild-plum': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 45.2, leafWidth: 0.8, height: 1.1,
      flowerCount: 4, flowerSize: 0.8, hasStem: true,
    },
  },
  'weeping-wattle': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 30.9, leafWidth: 0.9, height: 1.3,
      flowerCount: 8, flowerSize: 0.7, hasStem: true,
    },
  },
  'num-num': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#56864b', leafSecondary: '#76a664',
      petal: '#c0433a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 38.1, leafWidth: 1.1, height: 0.8,
      flowerCount: 9, flowerSize: 0.7, hasStem: true,
    },
  },
  'strandveld-guarri': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e2dac2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 36.3, leafWidth: 1, height: 1,
      flowerCount: 8, flowerSize: 0.9, hasStem: true,
    },
  },
  'papyrus': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#6e8e43', leafSecondary: '#97a962',
      petal: '#bdad7e', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 30, leafWidth: 1.3, height: 1.6,
      flowerCount: 3, flowerSize: 0.7, hasStem: false,
    },
  },
  'blue-lotus': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#5a8fc9', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.3, height: 1,
      flowerCount: 5, flowerSize: 1.2, hasStem: true,
    },
  },
  'bulrush': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#7a9a4f', leafSecondary: '#a3b56e',
      petal: '#c9b98a', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 19.5, leafWidth: 1.4, height: 1.3,
      flowerCount: 1, flowerSize: 0.8, hasStem: false,
    },
  },
  'fan-aloe': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8e0c8', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 69.3, leafWidth: 0.8, height: 0.7,
      flowerCount: 5, flowerSize: 0.7, hasStem: false,
    },
  },
  'kei-apple': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8e0c8', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 60.3, leafWidth: 1.2, height: 0.7,
      flowerCount: 8, flowerSize: 0.6, hasStem: true,
    },
  },
  'cape-willow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#c8d0c0', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 34.5, leafWidth: 1.1, height: 1.4,
      flowerCount: 3, flowerSize: 1.2, hasStem: true,
    },
  },
  'wild-rosemary': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#6a8a52', leafSecondary: '#8aa070',
      petal: '#9a7ac8', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1.2, leafWidth: 0.9, height: 1.2,
      flowerCount: 4, flowerSize: 0.8, hasStem: true,
    },
  },
  'ice-plant': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#e8657a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 16, leafAngle: 119, leafWidth: 0.8, height: 1.2,
      flowerCount: 9, flowerSize: 0.8, hasStem: false,
    },
  },
  'string-of-pearls': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#e8657a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 12, leafAngle: 120.1, leafWidth: 1, height: 1.1,
      flowerCount: 9, flowerSize: 0.9, hasStem: false,
    },
  },
  'kambro': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#54944f', leafSecondary: '#74aa64',
      petal: '#e25f74', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 12, leafAngle: 76.9, leafWidth: 1, height: 0.9,
      flowerCount: 5, flowerSize: 1.1, hasStem: false,
    },
  },
  'halfmens': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 51.7, leafWidth: 1.2, height: 0.8,
      flowerCount: 6, flowerSize: 1.1, hasStem: true,
    },
  },
  'cape-sundew': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#5a9a55', leafSecondary: '#7ab06a',
      petal: '#e8657a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 8, leafAngle: 131.1, leafWidth: 0.7, height: 1.1,
      flowerCount: 9, flowerSize: 0.9, hasStem: false,
    },
  },
  'scarlet-freesia': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#c0392b', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 1, leafWidth: 0.7, height: 0.8,
      flowerCount: 6, flowerSize: 1.2, hasStem: true,
    },
  },
  'african-hemp': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#4a7a3f', leafSecondary: '#6a9a58',
      petal: '#d1567a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 40.5, leafWidth: 1.1, height: 1.1,
      flowerCount: 4, flowerSize: 0.8, hasStem: true,
    },
  },
  'jackal-berry': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e2dac2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 31.5, leafWidth: 1.1, height: 1.3,
      flowerCount: 5, flowerSize: 0.7, hasStem: true,
    },
  },
  'sausage-tree': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#709058', leafSecondary: '#90a676',
      petal: '#a080ce', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 8, leafAngle: 1.3, leafWidth: 0.9, height: 1,
      flowerCount: 3, flowerSize: 0.9, hasStem: true,
    },
  },
  'knob-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 59.2, leafWidth: 1.1, height: 0.8,
      flowerCount: 2, flowerSize: 1.2, hasStem: true,
    },
  },
  'leadwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#c8d0c0', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 60.2, leafWidth: 1.1, height: 0.9,
      flowerCount: 3, flowerSize: 1, hasStem: true,
    },
  },
  'mopane': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 42.4, leafWidth: 0.9, height: 1.5,
      flowerCount: 5, flowerSize: 0.6, hasStem: true,
    },
  },
  'wild-medlar': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 32.2, leafWidth: 1.3, height: 0.7,
      flowerCount: 5, flowerSize: 0.7, hasStem: false,
    },
  },
  'river-bushwillow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 34.1, leafWidth: 1.2, height: 0.8,
      flowerCount: 1, flowerSize: 1.1, hasStem: false,
    },
  },
  'spike-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 69.8, leafWidth: 0.7, height: 0.8,
      flowerCount: 3, flowerSize: 1.1, hasStem: true,
    },
  },
  'cape-beech': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#8a6fc9', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 39.7, leafWidth: 1, height: 1.6,
      flowerCount: 5, flowerSize: 1.2, hasStem: true,
    },
  },
  'umbrella-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 44.6, leafWidth: 0.8, height: 0.9,
      flowerCount: 5, flowerSize: 0.5, hasStem: true,
    },
  },
  'silver-cluster-leaf': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#c8d0c0', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 52, leafWidth: 0.7, height: 1,
      flowerCount: 1, flowerSize: 0.5, hasStem: true,
    },
  },
  'tamboti': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 45.7, leafWidth: 0.8, height: 1.2,
      flowerCount: 1, flowerSize: 0.8, hasStem: true,
    },
  },
  'paperbark-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 64, leafWidth: 1.1, height: 0.9,
      flowerCount: 1, flowerSize: 0.8, hasStem: true,
    },
  },
  'travellers-joy': {
    template: 'climbing-vine',
    zones: {
      stem: '#5f7a3f', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#f2eec2', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 1, leafWidth: 1.1, height: 1.3,
      flowerCount: 2, flowerSize: 0.9, hasStem: true,
    },
  },
  'fern-asparagus': {
    template: 'fern',
    zones: {
      stem: '#5f7a45', leafMain: '#3d6a38', leafSecondary: '#5a8a4f',
      petal: '#7a5a3a', center: '#9a7a4a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 1, leafWidth: 0.9, height: 1,
      flowerCount: 3, flowerSize: 0.8, hasStem: true,
    },
  },
  'bloodroot': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#c0433a', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 1, leafAngle: 1, leafWidth: 0.8, height: 1.3,
      flowerCount: 5, flowerSize: 0.6, hasStem: true,
    },
  },
  'peacock-moraea': {
    template: 'bulb-flower',
    zones: {
      stem: '#4f9a55', leafMain: '#4b8651', leafSecondary: '#66a666',
      petal: '#5a8fc9', center: '#f2d060', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.1, height: 1.3,
      flowerCount: 6, flowerSize: 1, hasStem: true,
    },
  },
  'peppermint-pelargonium': {
    template: 'herb',
    zones: {
      stem: '#7a8a5a', leafMain: '#709058', leafSecondary: '#90a676',
      petal: '#a080ce', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 0.9, leafWidth: 0.7, height: 1.1,
      flowerCount: 4, flowerSize: 0.9, hasStem: false,
    },
  },
  'baseball-plant': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#90a080', leafSecondary: '#a9bb9c',
      petal: '#ee6090', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 98.6, leafWidth: 1.5, height: 0.68,
      flowerCount: 1, flowerSize: 0.8, hasStem: false,
    },
  },
  'pencil-cactus': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#56864b', leafSecondary: '#76a664',
      petal: '#e0722a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 34.7, leafWidth: 1.1, height: 0.9,
      flowerCount: 9, flowerSize: 1.3, hasStem: true,
    },
  },
  'string-of-buttons': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#4e8e49', leafSecondary: '#6ea45e',
      petal: '#dc596e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 15, leafAngle: 106.2, leafWidth: 1, height: 0.7,
      flowerCount: 6, flowerSize: 1.2, hasStem: false,
    },
  },
  'blue-chalk-sticks': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#66a661', leafSecondary: '#86bc76',
      petal: '#5a8fc9', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 13, leafAngle: 90, leafWidth: 1, height: 1,
      flowerCount: 8, flowerSize: 0.9, hasStem: false,
    },
  },
  'bears-paw': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#dc4e7e', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 80.4, leafWidth: 1.4, height: 0.68,
      flowerCount: 2, flowerSize: 1.3, hasStem: false,
    },
  },
  'carrion-flower': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#90a080', leafSecondary: '#a9bb9c',
      petal: '#ee6090', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 64.7, leafWidth: 1.2, height: 0.72,
      flowerCount: 2, flowerSize: 1.3, hasStem: false,
    },
  },
  'honey-bell-bush': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#e8c93a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 43.9, leafWidth: 1.1, height: 1.1,
      flowerCount: 8, flowerSize: 0.9, hasStem: true,
    },
  },
  'false-olive': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#f2eec2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 60.3, leafWidth: 0.9, height: 0.7,
      flowerCount: 2, flowerSize: 1.2, hasStem: true,
    },
  },
  'crossberry': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#56864b', leafSecondary: '#76a664',
      petal: '#e0839e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 35.9, leafWidth: 0.9, height: 0.9,
      flowerCount: 11, flowerSize: 1.1, hasStem: true,
    },
  },
  'port-st-johns-creeper': {
    template: 'climbing-vine',
    zones: {
      stem: '#5f7a3f', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#e0839e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 1, leafWidth: 1.5, height: 0.8,
      flowerCount: 2, flowerSize: 1.1, hasStem: true,
    },
  },
  'forest-grape': {
    template: 'climbing-vine',
    zones: {
      stem: '#5f7a3f', leafMain: '#336e39', leafSecondary: '#4e8e4e',
      petal: '#bc547e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1, leafWidth: 1.2, height: 1.2,
      flowerCount: 1, flowerSize: 1.2, hasStem: true,
    },
  },
  'wild-jasmine': {
    template: 'climbing-vine',
    zones: {
      stem: '#5f7a3f', leafMain: '#39743f', leafSecondary: '#549454',
      petal: '#e0839e', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 7, leafAngle: 1, leafWidth: 0.8, height: 1.1,
      flowerCount: 3, flowerSize: 1.2, hasStem: true,
    },
  },
  'tinderwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 69.9, leafWidth: 1, height: 0.9,
      flowerCount: 2, flowerSize: 0.5, hasStem: true,
    },
  },
  'velvet-bushwillow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 58.9, leafWidth: 1.2, height: 1.2,
      flowerCount: 4, flowerSize: 0.9, hasStem: true,
    },
  },
  'red-leaved-rock-fig': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 68.1, leafWidth: 1.2, height: 0.6,
      flowerCount: 1, flowerSize: 1, hasStem: true,
    },
  },
  'forest-bushwillow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 58.4, leafWidth: 1.2, height: 1.3,
      flowerCount: 1, flowerSize: 0.7, hasStem: true,
    },
  },
  'quinine-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 36.4, leafWidth: 0.9, height: 1.2,
      flowerCount: 1, flowerSize: 1.2, hasStem: true,
    },
  },
  'broom-cluster-fig': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e2dac2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 30.6, leafWidth: 1, height: 1.2,
      flowerCount: 1, flowerSize: 1.3, hasStem: true,
    },
  },
  'breede-river-yellowwood': {
    template: 'grass-tuft',
    zones: {
      stem: '#8a9a5a', leafMain: '#80a055', leafSecondary: '#a9bb74',
      petal: '#e8c93a', center: '#e8dcb0', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 38.9, leafWidth: 1.5, height: 1.2,
      flowerCount: 1, flowerSize: 1.1, hasStem: false,
    },
  },
  'mountain-cypress': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 42.2, leafWidth: 1, height: 0.9,
      flowerCount: 5, flowerSize: 1, hasStem: false,
    },
  },
  'coastal-silver-oak': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#a3ad9a', leafSecondary: '#c0c8b8',
      petal: '#f2eec2', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 34.9, leafWidth: 0.8, height: 1,
      flowerCount: 8, flowerSize: 1.1, hasStem: true,
    },
  },
  'waterberry': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#8a6fc9', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 43.8, leafWidth: 1.1, height: 0.8,
      flowerCount: 1, flowerSize: 0.7, hasStem: true,
    },
  },
  'red-ivory': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 52.4, leafWidth: 0.9, height: 1,
      flowerCount: 7, flowerSize: 0.5, hasStem: true,
    },
  },
  'scented-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#e8c93a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 69.9, leafWidth: 0.9, height: 1.4,
      flowerCount: 6, flowerSize: 1.1, hasStem: true,
    },
  },
  'common-hook-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 60.7, leafWidth: 0.9, height: 0.8,
      flowerCount: 8, flowerSize: 0.8, hasStem: true,
    },
  },
  'large-fruited-bushwillow': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8e0c8', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 46.2, leafWidth: 1, height: 1.6,
      flowerCount: 6, flowerSize: 1.1, hasStem: true,
    },
  },
  'natal-mahogany': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#497439', leafSecondary: '#648f52',
      petal: '#e0722a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 63.8, leafWidth: 0.9, height: 0.9,
      flowerCount: 7, flowerSize: 1, hasStem: true,
    },
  },
  'small-knobwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#5b864b', leafSecondary: '#76a164',
      petal: '#f4ecd4', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 3, leafAngle: 51.3, leafWidth: 0.8, height: 0.6,
      flowerCount: 7, flowerSize: 0.7, hasStem: true,
    },
  },
  'hard-pear': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#4f7a3f', leafSecondary: '#6a9558',
      petal: '#e8e0c8', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 60.9, leafWidth: 1.1, height: 1.3,
      flowerCount: 3, flowerSize: 0.7, hasStem: true,
    },
  },
  'assegai-tree': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#dcd4bc', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 61.2, leafWidth: 0.8, height: 1.5,
      flowerCount: 2, flowerSize: 0.6, hasStem: true,
    },
  },
  'willow-beechwood': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#436e33', leafSecondary: '#5e894c',
      petal: '#c0433a', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 4, leafAngle: 33.6, leafWidth: 1.1, height: 1.5,
      flowerCount: 3, flowerSize: 0.6, hasStem: true,
    },
  },
  'haworthia': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#96a686', leafSecondary: '#afc1a2',
      petal: '#f46696', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 9, leafAngle: 66.7, leafWidth: 0.6, height: 0.62,
      flowerCount: 1, flowerSize: 0.8, hasStem: false,
    },
  },
  'gasteria': {
    template: 'succulent',
    zones: {
      stem: '#8a9a7a', leafMain: '#90a080', leafSecondary: '#a9bb9c',
      petal: '#c0433a', center: '#ffe07a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 58.5, leafWidth: 1.5, height: 0.66,
      flowerCount: 2, flowerSize: 1.1, hasStem: false,
    },
  },
  'baby-sun-rose': {
    template: 'ground-cover',
    zones: {
      stem: '#5f8a4a', leafMain: '#54944f', leafSecondary: '#74aa64',
      petal: '#c0399a', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 17, leafAngle: 126, leafWidth: 1.1, height: 0.8,
      flowerCount: 5, flowerSize: 1.1, hasStem: false,
    },
  },
  'bush-violet': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#3e6e33', leafSecondary: '#5e8e4c',
      petal: '#8a6fc9', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 6, leafAngle: 49.6, leafWidth: 1.1, height: 0.8,
      flowerCount: 5, flowerSize: 0.7, hasStem: true,
    },
  },
  'fruit-salad-plant': {
    template: 'flowering-shrub',
    zones: {
      stem: '#6b5638', leafMain: '#508045', leafSecondary: '#70a05e',
      petal: '#d75c80', center: '#f2c230', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 5, leafAngle: 57.9, leafWidth: 0.8, height: 0.9,
      flowerCount: 14, flowerSize: 1, hasStem: true,
    },
  },
  'splendid-thorn': {
    template: 'tree-small',
    zones: {
      stem: '#6b5638', leafMain: '#558045', leafSecondary: '#709b5e',
      petal: '#eee6ce', center: '#c9a25a', soil: '#7a5a3a',
    },
    variation: {
      leafCount: 2, leafAngle: 59.3, leafWidth: 1.1, height: 0.7,
      flowerCount: 7, flowerSize: 1.2, hasStem: true,
    },
  },
}
