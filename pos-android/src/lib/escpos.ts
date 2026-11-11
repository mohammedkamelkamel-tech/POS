import type { ReceiptJob } from '@/services/capabilities/registry'

export interface EscposOpts {
  feed?: number
  cut?: boolean
  /** Raster width in dots: 384 for 58mm, 576 for 80mm. */
  pixelWidth?: 384 | 576
}

/**
 * Render receipt text through Android WebView's browser font engine first.
 * This preserves Arabic shaping/RTL, then sends a monochrome ESC/POS raster
 * image so the printer does not need an Arabic character code page.
 */
export async function encodeReceipt(job: ReceiptJob, opts: EscposOpts = {}): Promise<Uint8Array> {
  if (typeof document === 'undefined') throw new Error('محرك رسم الفاتورة غير متاح.')
  const width = opts.pixelWidth ?? 384
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('تعذر تجهيز صورة الفاتورة للطباعة.')

  const pad = width === 384 ? 16 : 22
  const contentWidth = width - pad * 2
  const normalSize = width === 384 ? 22 : 26
  const largeSize = width === 384 ? 30 : 36
  const lineGap = width === 384 ? 10 : 12
  const prepared: Array<{ line: (typeof job.lines)[number]; text: string; size: number }> = []

  // Wait for WebView fonts so Arabic glyphs are shaped before rasterization.
  if ('fonts' in document) {
    try { await document.fonts.ready } catch { /* use system fallback */ }
  }

  ctx.textBaseline = 'alphabetic'
  for (const line of job.lines) {
    const size = line.size === 'large' ? largeSize : normalSize
    ctx.font = `${line.bold ? '700' : '400'} ${size}px "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif`
    const raw = line.text ?? ''
    const words = raw.split(/\s+/)
    let current = ''
    const wrapped: string[] = []
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current && ctx.measureText(candidate).width > contentWidth) {
        wrapped.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    wrapped.push(current)
    for (const text of wrapped) prepared.push({ line, text, size })
  }

  let height = pad
  for (const item of prepared) height += item.size + lineGap
  height += pad + (opts.feed ?? 3) * normalSize
  canvas.width = width
  canvas.height = Math.max(height, 100)

  // Set canvas to pure white background and render crisp black receipt text.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  let y = pad
  for (const item of prepared) {
    ctx.font = `${item.line.bold ? '700' : '400'} ${item.size}px "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif`
    ctx.direction = /[\u0600-\u06ff]/.test(item.text) ? 'rtl' : 'ltr'
    const align = item.line.align ?? 'left'
    ctx.textAlign = align
    const x = align === 'center' ? width / 2 : align === 'right' ? width - pad : pad
    y += item.size
    ctx.fillText(item.text, x, y, contentWidth)
    y += lineGap
  }

  const pixels = ctx.getImageData(0, 0, width, canvas.height).data
  const rowBytes = Math.ceil(width / 8)
  const raster = new Uint8Array(rowBytes * canvas.height)
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < width; px++) {
      const offset = (py * width + px) * 4
      const luminance = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000
      if (luminance < 160) raster[py * rowBytes + (px >> 3)] |= 0x80 >> (px & 7)
    }
  }

  const bytes: number[] = [0x1b, 0x40, 0x1b, 0x61, 0x00]
  // GS v 0 — print raster bit image. Width/height are encoded in little endian.
  bytes.push(0x1d, 0x76, 0x30, 0x00, rowBytes & 0xff, (rowBytes >> 8) & 0xff,
    canvas.height & 0xff, (canvas.height >> 8) & 0xff)
  for (let i = 0; i < raster.length; i++) bytes.push(raster[i])
  for (let i = 0; i < (opts.feed ?? 3); i++) bytes.push(0x0a)
  if (opts.cut ?? true) bytes.push(0x1d, 0x56, 0x01)
  return Uint8Array.from(bytes)
}
