import manifest from '../config/responsive-images.json'

export const productImages: Record<string, { width: number; height: number; srcSet: string; avifSrcSet?: string }> = manifest
// Shared with the HTML preload so the browser reuses exactly the same candidate.
export const HERO_IMAGE_SIZES = '(max-width: 600px) min(350px, calc(100vw - 85px)), (max-width: 1100px) 45vw, 572px'
export const CARD_IMAGE_SIZES = '(max-width: 600px) calc(50vw - 24px), (max-width: 800px) calc(50vw - 28px), (max-width: 1100px) calc(50vw - 42px), 440px'
