import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { MAX_RECEIPT_BYTES, prepareReceipt } from './receipts.ts'

test('receipts: real image decoding strips metadata and stores only a sanitized WebP', async () => {
  const image = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#5c3c6f' } }).withMetadata().png().toBuffer()
  const prepared = await prepareReceipt(image, 'image/png')
  assert.equal(prepared.contentType, 'image/webp')
  const metadata = await sharp(prepared.data).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.exif, undefined)
  assert.equal(metadata.width, 20)
  assert.match(prepared.rawHash, /^[a-f0-9]{64}$/)
})

test('receipts: reject forged image types, SVG, invalid bytes, overlarge files and malformed PDFs', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer()
  await assert.rejects(prepareReceipt(png, 'image/jpeg'), /leer la imagen/)
  await assert.rejects(prepareReceipt(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/svg+xml'), /No se admite SVG/)
  await assert.rejects(prepareReceipt(Buffer.from('not-a-png'), 'image/png'), /leer la imagen/)
  await assert.rejects(prepareReceipt(Buffer.alloc(MAX_RECEIPT_BYTES + 1), 'application/pdf'), /5 MB/)
  await assert.rejects(prepareReceipt(Buffer.from('%PDF-1.7 not finished'), 'application/pdf'), /PDF válido/)
})
