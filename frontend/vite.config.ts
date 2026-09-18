import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { 'import.meta.env.VITE_DATA_MODE': JSON.stringify(mode === 'connected' ? 'connected' : 'local') },
  server: {
    host: '127.0.0.1',
    proxy: { '/v1': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
