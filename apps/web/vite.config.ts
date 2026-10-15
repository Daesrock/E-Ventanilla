/** Configuración web: React, Tailwind y proxy de desarrollo hacia el BFF local. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/bff': 'http://127.0.0.1:3001' },
  },
  preview: { port: 4173, proxy: { '/bff': 'http://127.0.0.1:3001' } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
