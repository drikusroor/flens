import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@flens/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
      '@flens/bot': fileURLToPath(new URL('../../packages/bot/src/index.ts', import.meta.url)),
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
