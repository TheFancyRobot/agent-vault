import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    'mcp-server': 'src/mcp-server.ts',
  },
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  outExtension: () => ({ js: '.mjs' }),
  clean: true,
  splitting: true,
  sourcemap: true,
  dts: false,
  shims: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
