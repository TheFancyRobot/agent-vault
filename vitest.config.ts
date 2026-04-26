import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const NVM_GLOBAL_ROOT = '/home/gimbo/.nvm/versions/node/v22.18.0/lib/node_modules';
const PI_CODING_AGENT_ROOT = resolve(NVM_GLOBAL_ROOT, '@mariozechner/pi-coding-agent');

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@mariozechner/pi-coding-agent': PI_CODING_AGENT_ROOT,
      '@mariozechner/pi-ai': resolve(PI_CODING_AGENT_ROOT, 'node_modules/@mariozechner/pi-ai'),
      '@sinclair/typebox': resolve(PI_CODING_AGENT_ROOT, 'node_modules/typebox'),
    },
  },
});
