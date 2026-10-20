import { storyCardFilename } from './reelGuard.js'

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/)
  let line = ''
  let cursor = y
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursor)
      line = word
      cursor += lineHeight
    } else {
      line = next
    }
  })
  if (line) ctx.fillText(line, x, cursor)
}

export async function downloadStoryCard(card) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    await document.fonts?.load?.('560 96px Fraunces')
  } catch {
    /* system serif is fine */
  }
  const sky = ctx.createLinearGradient(0, 0, 0, 1920)
  sky.addColorStop(0, '#1c3a2b')
  sky.addColorStop(0.42, '#35604a')
  sky.addColorStop(1, '#f4efe6')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 1080, 1920)
  ctx.fillStyle = '#fffdf9'
  roundRect(ctx, 80, 280, 920, 1240, 48)
  ctx.fill()
  ctx.fillStyle = '#244436'
  ctx.font = '700 28px Inter, sans-serif'
  ctx.fillText('POOKSBOOKS  ·  FIELD & FOLIO', 140, 380)
  ctx.fillStyle = '#8a5a12'
  ctx.fillText(String(card.rarity || 'Common').toUpperCase(), 140, 460)
  ctx.fillStyle = '#201a14'
  ctx.font = '560 84px Fraunces, Georgia, serif'
  wrapText(ctx, String(card.title || 'A field note'), 140, 580, 800, 92)
  ctx.fillStyle = '#8a7c6a'
  ctx.font = 'italic 36px Georgia, serif'
  ctx.fillText(String(card.scientific || ''), 140, 860)
  ctx.fillStyle = '#362e26'
  ctx.font = '400 36px Inter, sans-serif'
  wrapText(ctx, String(card.line || 'Pressed into a South African field guide.'), 140, 960, 800, 52)
  ctx.fillStyle = '#f7f2ea'
  ctx.font = '600 32px Inter, sans-serif'
  ctx.fillText('South African nature, kept like a book.', 140, 1680)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return null
  const filename = storyCardFilename(card.title)
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: card.title || 'Field & Folio' })
      return filename
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return filename
}
