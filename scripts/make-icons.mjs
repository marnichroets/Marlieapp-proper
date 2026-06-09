// Generates cute cream PWA icons (192 + 512) as PNGs, no external deps.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

// Cute pink/coral bird on cream — matches the in-app SVG + favicon.
const CREAM = [251, 239, 230]
const CORAL = [244, 160, 154]
const CORALD = [232, 138, 134]
const BELLY = [251, 217, 210]
const BEAK = [242, 162, 78]
const DARK = [62, 47, 34]
const CHEEK = [247, 168, 184]
const FOOT = [232, 145, 94]
const WHITE = [255, 255, 255]

function lerp(a, b, t) {
  return a.map((channel, index) => Math.round(channel + (b[index] - channel) * t))
}

function makePixels(size) {
  const data = Buffer.alloc(size * size * 4)
  const s = size / 100 // SVG coords use a 0..100 space

  // Point-in-ellipse with optional rotation (degrees), all in 0..100 space.
  const inEllipse = (px, py, cx, cy, rx, ry, angle = 0) => {
    const rad = (angle * Math.PI) / 180
    const dx = px / s - cx
    const dy = py / s - cy
    const rxr = dx * Math.cos(rad) + dy * Math.sin(rad)
    const ryr = -dx * Math.sin(rad) + dy * Math.cos(rad)
    return (rxr * rxr) / (rx * rx) + (ryr * ryr) / (ry * ry) <= 1
  }
  const inRect = (px, py, x0, y0, x1, y1) =>
    px / s >= x0 && px / s <= x1 && py / s >= y0 && py / s <= y1

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = CREAM

      // feet (drawn first so the body overlaps their tops)
      if (inRect(x, y, 44, 84, 46, 92) || inRect(x, y, 58, 84, 60, 92)) color = FOOT
      // tail + top tuft
      if (inEllipse(x, y, 20, 54, 11, 6.5, -18)) color = CORALD
      if (inEllipse(x, y, 54, 24, 3.2, 7.5, -16)) color = CORALD
      // body
      if (inEllipse(x, y, 54, 56, 30, 31)) color = CORAL
      // belly
      if (inEllipse(x, y, 52, 65, 19, 16)) color = BELLY
      // wing
      if (inEllipse(x, y, 42, 55, 11.5, 16)) color = CORALD
      // cheek blush (soft)
      if (inEllipse(x, y, 67, 59, 5.5, 5.5)) color = lerp(color, CHEEK, 0.7)
      // beak (triangle pointing right, from x=80 to x=90 around y=54)
      {
        const bx = 80
        const span = 10
        if (x / s > bx && x / s < bx + span && Math.abs(y / s - 54.2) < 4.2 * (1 - (x / s - bx) / span)) {
          color = BEAK
        }
      }
      // eye + highlight
      if (inEllipse(x, y, 63, 47, 4.6, 4.6)) color = DARK
      if (inEllipse(x, y, 64.6, 45.4, 1.5, 1.5)) color = WHITE

      const offset = (y * size + x) * 4
      data[offset] = color[0]
      data[offset + 1] = color[1]
      data[offset + 2] = color[2]
      data[offset + 3] = 255
    }
  }
  return data
}

function crc32(buf) {
  let crc = ~0
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (~crc) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size) {
  const pixels = makePixels(size)
  // add filter byte (0) at the start of each row
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, makePng(size))
  console.log(`wrote public/icon-${size}.png`)
}
