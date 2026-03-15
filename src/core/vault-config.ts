import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { execFile as execFileCallback } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import type { VaultGraphResolver } from './vault-graph';

const execFile = promisify(execFileCallback);

const CONFIG_FILENAME = '.config.json';

export interface VaultConfig {
  readonly resolver: VaultGraphResolver;
}

const DEFAULT_CONFIG: VaultConfig = {
  resolver: 'filesystem',
};

const VALID_RESOLVERS = new Set<VaultGraphResolver>(['filesystem', 'obsidian']);

export const readVaultConfig = async (vaultRoot: string): Promise<VaultConfig> => {
  const configPath = join(vaultRoot, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>;
    return {
      resolver: typeof raw.resolver === 'string' && VALID_RESOLVERS.has(raw.resolver as VaultGraphResolver)
        ? raw.resolver as VaultGraphResolver
        : DEFAULT_CONFIG.resolver,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const writeVaultConfig = async (vaultRoot: string, config: VaultConfig): Promise<void> => {
  const configPath = join(vaultRoot, CONFIG_FILENAME);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
};

export const updateVaultConfig = async (
  vaultRoot: string,
  updates: Partial<VaultConfig>,
): Promise<VaultConfig> => {
  const current = await readVaultConfig(vaultRoot);
  const next: VaultConfig = {
    resolver: updates.resolver && VALID_RESOLVERS.has(updates.resolver) ? updates.resolver : current.resolver,
  };
  await writeVaultConfig(vaultRoot, next);
  return next;
};

export const probeObsidianCli = async (): Promise<boolean> => {
  try {
    await execFile('obsidian', ['--version'], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};
