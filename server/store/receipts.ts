import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { StoreError } from './validation.ts'

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
export interface PreparedReceipt { rawHash: string; contentType: 'image/webp' | 'application/pdf'; data: Buffer }

export async function prepareReceipt(data: Buffer, declaredType: string): Promise<PreparedReceipt> {
  if (!data.length || data.length > MAX_RECEIPT_BYTES) throw new StoreError(413, 'El comprobante debe pesar entre 1 byte y 5 MB.')
  const rawHash = createHash('sha256').update(data).digest('hex')
  if (declaredType === 'application/pdf') {
    if (!/^%PDF-(1\.[0-7]|2\.0)/.test(data.subarray(0, 9).toString('ascii')) || !data.subarray(-2048).toString('ascii').includes('%%EOF')) throw new StoreError(422, 'El archivo no parece un PDF válido.')
    // Never render PDF, execute it or serve it inline. Admin/customer downloads are authenticated.
    return { rawHash, contentType: 'application/pdf', data }
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(declaredType)) throw new StoreError(415, 'Adjunta una imagen JPG, PNG o WebP, o un PDF. No se admite SVG ni archivos ejecutables.')
  try {
    const image = sharp(data, { limitInputPixels: 20_000_000, failOn: 'warning', animated: false })
    const metadata = await image.metadata()
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[declaredType]
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error('Unexpected image format')
    // Decode and re-encode, removing EXIF/location and other metadata; do not publish original bytes.
    const clean = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).timeout({ seconds: 10 }).toBuffer()
    if (clean.length > MAX_RECEIPT_BYTES) throw new Error('Image too large')
    return { rawHash, contentType: 'image/webp', data: clean }
  } catch {
    throw new StoreError(422, 'No pudimos leer la imagen. Usa una imagen válida, sin animación y de hasta 20 megapíxeles.')
  }
}
