import { defineConfig } from 'vitest/config';
import { delimiter, dirname, resolve } from 'path';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';

const packageExists = (packageRoot: string) => {
  try {
    return statSync(resolve(packageRoot, 'package.json')).isFile();
  } catch {
    return false;
  }
};

const packageNameToPathParts = (packageName: string) => packageName.split('/');

const findPackageRoot = (packageNames: string[], searchRoots: Array<string | undefined>) => {
  for (const searchRoot of searchRoots) {
    if (!searchRoot) continue;
    const absoluteRoot = resolve(searchRoot);

    if (packageExists(absoluteRoot)) {
      return absoluteRoot;
    }

    for (const packageName of packageNames) {
      const candidate = resolve(absoluteRoot, ...packageNameToPathParts(packageName));
      if (packageExists(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
};

const configDir = dirname(fileURLToPath(import.meta.url));
const nodeGlobalRoot = resolve(dirname(process.execPath), '..', 'lib', 'node_modules');
const npmPrefixGlobalRoot = process.env.npm_config_prefix
  ? resolve(process.env.npm_config_prefix, 'lib', 'node_modules')
  : undefined;

const moduleRoots = [
  resolve(configDir, 'node_modules'),
  process.env.NVM_GLOBAL_ROOT,
  npmPrefixGlobalRoot,
  nodeGlobalRoot,
  ...(process.env.NODE_PATH?.split(delimiter).filter(Boolean) ?? []),
];

const piCodingAgentRoot = findPackageRoot(
  ['@mariozechner/pi-coding-agent', '@earendil-works/pi-coding-agent'],
  [process.env.AGENT_VAULT_PI_CODING_AGENT_ROOT, process.env.PI_CODING_AGENT_ROOT, ...moduleRoots],
);

const piDependencyRoots = [
  piCodingAgentRoot ? resolve(piCodingAgentRoot, 'node_modules') : undefined,
  ...moduleRoots,
];

const piAiRoot = findPackageRoot(
  ['@mariozechner/pi-ai', '@earendil-works/pi-ai'],
  [process.env.AGENT_VAULT_PI_AI_ROOT, process.env.PI_AI_ROOT, ...piDependencyRoots],
);

const typeboxRoot = findPackageRoot(
  ['@sinclair/typebox', 'typebox'],
  [process.env.AGENT_VAULT_TYPEBOX_ROOT, process.env.TYPEBOX_ROOT, ...piDependencyRoots],
);

const alias: Record<string, string> = {};

if (piCodingAgentRoot) {
  alias['@mariozechner/pi-coding-agent'] = piCodingAgentRoot;
}

if (piAiRoot) {
  alias['@mariozechner/pi-ai'] = piAiRoot;
}

if (typeboxRoot) {
  alias['@sinclair/typebox'] = typeboxRoot;
}

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias,
  },
});
