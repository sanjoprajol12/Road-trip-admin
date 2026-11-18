import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// Staff SPA. It talks to the Laravel API in ../web through this proxy (same origin for cookies).
// Production: serve this build on its own host and proxy /api and /sanctum to Laravel the same way.
const api = { target: process.env.API_TARGET ?? 'http://127.0.0.1:8010', changeOrigin: false }

export default defineConfig({
  plugins: [vue(), tailwindcss(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5181, strictPort: true, proxy: { '/api': api, '/sanctum': api } },
  preview: { port: 4181, strictPort: true, proxy: { '/api': api, '/sanctum': api } },
})
