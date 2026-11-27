/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// API_TARGET is used only by the dev and preview proxies; it is never bundled (no VITE_ prefix).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': { target: env.API_TARGET || 'http://localhost:4000', changeOrigin: false } };
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5274, strictPort: true, proxy },
    preview: { port: 4274, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
