// Pure data + helpers for the weekly birds (no components).

export function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16)
  const clamp = (v) => Math.max(0, Math.min(255, v))
  const r = clamp(((n >> 16) & 255) + amt)
  const g = clamp(((n >> 8) & 255) + amt)
  const b = clamp((n & 255) + amt)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const C = {
  coral: '#F4A09A',
  lemon: '#F6CE73',
  sky: '#9CC4E4',
  mint: '#A8D5BA',
  lilac: '#C4A7E7',
  peach: '#F6B98E',
  rose: '#F2A6C0',
  butter: '#F4D58D',
  teal: '#86C7BE',
  gold: '#F2B705',
  ice: '#B7D2EC',
  amber: '#E8A06B',
  clay: '#C98A56',
}

// Each entry: [name, accessory, bodyColor]
export const WEEKLY_BIRDS = [
  ['Sparkle the Party Bird 🎉', 'party-hat', C.lemon],
  ['Coco the Beach Bird 🏖️', 'sun-hat', C.sky],
  ['Sunny the Summer Bird ☀️', 'star', C.gold],
  ['Bea the Butterfly Bird 🦋', 'butterfly', C.mint],
  ['Rico the Cool Bird 😎', 'sunglasses', C.teal],
  ['Daisy the Flower Bird 🌼', 'flowers', C.butter],
  ['Pip the Picnic Bird 🧺', 'bow', C.peach],
  ['DJ Tweet the Music Bird 🎧', 'headphones', C.lilac],
  ['Coral the Sea Bird 🐚', 'heart', C.rose],
  ['Rusty the Leaf Jumper 🍂', 'leaves', C.peach],
  ['Amber the Autumn Bird 🍁', 'leaves', C.amber],
  ['Acorn the Forager 🌰', 'acorn', C.clay],
  ['Maple the Cosy Bird 🍂', 'scarf', C.amber],
  ['Cinna the Spice Bird ✨', 'sparkles', C.butter],
  ['Pumpkin the Plump Bird 🎃', 'beanie', '#F0925E'],
  ['Bunny the Easter Bird 🐰', 'easter-egg', C.rose],
  ['Clover the Lucky Bird 🍀', 'flowers', C.mint],
  ['Hazel the Hazel Bird 🌰', 'acorn', '#B98A5E'],
  ['Ginger the Warm Bird 🧣', 'scarf', '#E68A6A'],
  ['Misty the Morning Bird 🌫️', 'sparkles', C.sky],
  ['Olive the Tree Bird 🌳', 'leaves', '#9DB07A'],
  ['Toffee the Sweet Bird 🍬', 'bow', '#D9A066'],
  ['Frost the First Snow ❄️', 'snow', C.sky],
  ['Snowy the Winter Bird ❄️', 'winter-warm', C.ice],
  ['Pip the Puffy Bird 🧥', 'beanie', C.lilac],
  ['Cocoa the Cosy Bird ☕', 'hot-choc', C.clay],
  ['Frosty the Mitten Bird 🧤', 'winter-warm', '#A9CDEB'],
  ['Berry the Bundle Bird 🧣', 'scarf', C.lilac],
  ['Glove the Snug Bird 🧤', 'winter-warm', '#8FB8D8'],
  ['Mocha the Hot-Choc Bird 🍫', 'hot-choc', '#B07A52'],
  ['Storm the Brave Bird ☔', 'umbrella', C.sky],
  ['Drizzle the Rain Bird 🌧️', 'umbrella', '#9AB7D0'],
  ['Shiver the Snug Bird 🥶', 'winter-warm', '#A8C6E2'],
  ['Brolly the Umbrella Bird ☂️', 'umbrella', C.lilac],
  ['Twinkle the Frost Bird ✨', 'snow', C.ice],
  ['Blossom the Spring Bird 🌸', 'flower-crown', C.rose],
  ['Petal the Pink Bird 🌸', 'flowers', '#F4B6C2'],
  ['Rosie the Rosy Bird 🌹', 'flowers', '#F2A6B8'],
  ['Lily the Lovely Bird 🌷', 'flower-crown', C.lilac],
  ['Bloom the Garden Bird 🌺', 'flowers', C.mint],
  ['Tulip the Tiptoe Bird 🌷', 'flowers', C.rose],
  ['Sky the Pastel Bird 🌈', 'sparkles', C.sky],
  ['Cherry the Blossom Bird 🌸', 'flower-crown', '#F6B6C6'],
  ['Sunny the Bright Bird 🌞', 'star', C.butter],
  ['Ray the Shades Bird 🕶️', 'sunglasses', C.gold],
  ['Goldie the Glow Bird ✨', 'sparkles', C.butter],
  ['Coco the Cool Bird 😎', 'sunglasses', C.teal],
  ['Bella the Bow Bird 🎀', 'bow', C.rose],
  ['Holly the Festive Bird 🎄', 'lights', C.teal],
  ['Jingle the Joy Bird 🔔', 'lights', C.coral],
  ['Nick the Santa Bird 🎅', 'santa-hat', C.coral],
  ['Merry the Christmas Bird 🎄', 'santa-hat', C.lemon],
]

export function getWeekNumber(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1)
  const day = Math.floor((date - start) / 86400000)
  return Math.min(52, Math.max(1, Math.floor(day / 7) + 1))
}

export function getWeeklyBird(date = new Date()) {
  const week = getWeekNumber(date)
  const [name, accessory, bodyColor] = WEEKLY_BIRDS[(week - 1) % WEEKLY_BIRDS.length]
  return { week, name, accessory, bodyColor }
}

// Browser-tab favicon following the weekly bird.
export function weeklyFaviconDataUrl(date = new Date()) {
  const { name, bodyColor } = getWeeklyBird(date)
  const wing = shade(bodyColor, -26)
  const belly = shade(bodyColor, 42)
  const emoji = (name.match(/\p{Emoji}/u) || ['🐦'])[0]
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<circle cx="50" cy="50" r="49" fill="#FBEFE6"/>` +
    `<g transform="translate(8 9) scale(0.84)">` +
    `<ellipse cx="20" cy="54" rx="11" ry="6.5" fill="${wing}" transform="rotate(-18 20 54)"/>` +
    `<ellipse cx="54" cy="56" rx="30" ry="31" fill="${bodyColor}"/>` +
    `<ellipse cx="52" cy="65" rx="19" ry="16" fill="${belly}"/>` +
    `<ellipse cx="42" cy="55" rx="11.5" ry="16" fill="${wing}"/>` +
    `<circle cx="63" cy="47" r="4.6" fill="#3E2F22"/>` +
    `<path d="M80 50 l10 4.2 l-10 4.2 z" fill="#F2A24E"/>` +
    `</g>` +
    `<text x="70" y="34" font-size="34" text-anchor="middle">${emoji}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
