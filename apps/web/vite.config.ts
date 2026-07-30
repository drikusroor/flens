import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  /**
   * GitHub Pages serves a project site from a repository subpath (`/<repo>/`),
   * so assets must be requested relative to it. Local development and any
   * root-hosted deployment leave this at `/`.
   */
  base: process.env['VITE_BASE_PATH'] ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@flens/engine': pkg('engine'),
      '@flens/bot': pkg('bot'),
      '@flens/i18n': pkg('i18n'),
      '@flens/protocol': pkg('protocol'),
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
