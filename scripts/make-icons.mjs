// Generates cute cream PWA icons (192 + 512) as PNGs, no external deps.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

const CREAM = [250, 246, 238]
const SAGE = [206, 226, 200]
const HONEY = [224, 160, 74]
const WING = [201, 134, 56]
const DARK = [74, 58, 38]
const BEAK = [233, 150, 70]

function lerp(a, b, t) {
  return a.map((channel, index) => Math.round(channel + (b[index] - channel) * t))
}

function makePixels(size) {
  const data = Buffer.alloc(size * size * 4)
  const cx = size * 0.5
  const cy = size * 0.52
  const badgeR = size * 0.46
  const bodyR = size * 0.24
  const headCx = size * 0.6
  const headCy = size * 0.4
  const headR = size * 0.13

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = CREAM
      const dBadge = Math.hypot(x - cx, y - cy)
      if (dBadge < badgeR) color = SAGE

      // Wing (slightly offset darker circle behind body)
      if (Math.hypot(x - cx * 0.88, y - cy * 1.05) < bodyR * 0.78) color = WING
      // Body
      if (Math.hypot(x - cx, y - cy) < bodyR) color = HONEY
      // Head
      if (Math.hypot(x - headCx, y - headCy) < headR) color = HONEY
      // Eye
      if (Math.hypot(x - (headCx + headR * 0.25), y - (headCy - headR * 0.1)) < size * 0.022) {
        color = DARK
      }
      // Beak (small triangle pointing right)
      const bx = headCx + headR * 0.85
      const by = headCy
      if (
        x > bx &&
        x < bx + size * 0.09 &&
        Math.abs(y - by) < (size * 0.05) * (1 - (x - bx) / (size * 0.09))
      ) {
        color = BEAK
      }

      // soft anti-alias the badge edge
      if (dBadge >= badgeR && dBadge < badgeR + 1.5) {
        color = lerp(SAGE, CREAM, (dBadge - badgeR) / 1.5)
      }

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
