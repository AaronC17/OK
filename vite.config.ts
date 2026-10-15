import { defineConfig, normalizePath } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { shopApiPlugin } from './server/store/vite-plugin.ts'

export default defineConfig({
  plugins: [react(), shopApiPlugin()],
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
