import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { shopApiPlugin } from './server/store/vite-plugin.ts'

export default defineConfig({
  plugins: [react(), shopApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.higgsfield/**', '**/references/**', '**/.data/**', '**/server/**'] },
  },
})
