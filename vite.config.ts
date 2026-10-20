import { defineConfig, normalizePath } from 'vite'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { shopApiPlugin } from './server/store/vite-plugin.ts'
import { store } from './src/config/store.ts'
import { HERO_IMAGE_SIZES, productImages } from './src/lib/product-images.ts'

const vercelArchivedAssets = [
  'brand-media/onkys-bag-01',
  'brand-media/onkys-gummies-03',
  'brand-media/onkys-gummies-01/hero.mp4',
  'brand-media/onkys-gummies-01/reference.png',
  'brand-media/onkys-gummies-02/hero.mp4',
  'brand-media/onkys-gummies-02/start.png',
  'brand-media/onkys-gummies-02/middle.png',
  'brand-media/onkys-gummies-02/end.png',
  ...Array.from({ length: 6 }, (_, index) => `brand-concepts/onkys-o-round-01/0${index + 1}.png`),
]

function pruneArchivedVercelAssets() {
  return {
    name: 'prune-archived-vercel-assets',
    apply: 'build' as const,
    closeBundle() {
      if (process.env.VERCEL !== '1') return
      for (const asset of vercelArchivedAssets) rmSync(resolve('dist', asset), { force: true, recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), shopApiPlugin(), pruneArchivedVercelAssets(), {
    name: 'responsive-hero-preload',
    transformIndexHtml() {
      const image = productImages[store.heroImage]
      if (store.heroVideo || !image) return []
      return [{ tag: 'link', attrs: { rel: 'preload', as: 'image', type: 'image/webp', href: store.heroImage, imagesrcset: image.srcSet, imagesizes: HERO_IMAGE_SIZES, fetchpriority: 'high' }, injectTo: 'head' as const }]
    },
  }],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Native Windows file watches can fail with EBUSY while images are replaced.
      usePolling: process.platform === 'win32',
      interval: 350,
      binaryInterval: 1000,
      ignored: ['**/test-results*/**', '**/playwright-report/**', '**/.data/**'],
    },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.higgsfield/**', '**/references/**', '**/.data/**', '**/server/**', '**/*.sqlite', '**/*.sqlite-*', '**/admin-setup-token.txt', `${normalizePath(resolve(process.env.STORE_DATA_DIR || '.data/store'))}/**`] },
  },
})
