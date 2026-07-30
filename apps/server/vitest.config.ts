import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@flens/engine': pkg('engine'),
      '@flens/bot': pkg('bot'),
      '@flens/i18n': pkg('i18n'),
      '@flens/protocol': pkg('protocol'),
    },
  },
});
