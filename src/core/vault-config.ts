import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { execFile as execFileCallback } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import type { ContextSafetyConfig } from './context-safety';
import type { VaultGraphResolver } from './vault-graph';

const execFile = promisify(execFileCallback);

const CONFIG_FILENAME = '.config.json';

export interface VaultConfig {
  readonly resolver: VaultGraphResolver;
  readonly vault_schema_version?: number;
  readonly context_safety?: ContextSafetyConfig;
}

const DEFAULT_CONFIG: VaultConfig = {
  resolver: 'filesystem',
};

const VALID_RESOLVERS = new Set<VaultGraphResolver>(['filesystem', 'obsidian']);

const parseSchemaVersion = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;

const parseContextSafetyConfig = (value: unknown): ContextSafetyConfig | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const denylist = Array.isArray(raw.denylist)
    ? raw.denylist.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const allowlist = Array.isArray(raw.allowlist)
    ? raw.allowlist.filter((entry): entry is string => typeof entry === 'string')
    : [];
  if (denylist.length === 0 && allowlist.length === 0) return undefined;
  return {
    ...(denylist.length > 0 ? { denylist } : {}),
    ...(allowlist.length > 0 ? { allowlist } : {}),
  };
};

export const readVaultConfig = async (vaultRoot: string): Promise<VaultConfig> => {
  const configPath = join(vaultRoot, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>;
    const schemaVersion = parseSchemaVersion(raw.vault_schema_version);
    const contextSafety = parseContextSafetyConfig(raw.context_safety);
    return {
      resolver: typeof raw.resolver === 'string' && VALID_RESOLVERS.has(raw.resolver as VaultGraphResolver)
        ? raw.resolver as VaultGraphResolver
        : DEFAULT_CONFIG.resolver,
      ...(schemaVersion !== undefined ? { vault_schema_version: schemaVersion } : {}),
      ...(contextSafety ? { context_safety: contextSafety } : {}),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const readVaultSchemaVersion = async (vaultRoot: string): Promise<number> => {
  const config = await readVaultConfig(vaultRoot);
  return config.vault_schema_version ?? 0;
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
  const nextSchemaVersion = parseSchemaVersion(updates.vault_schema_version) ?? current.vault_schema_version;
  const nextContextSafety = updates.context_safety ?? current.context_safety;
  const next: VaultConfig = {
    resolver: updates.resolver && VALID_RESOLVERS.has(updates.resolver) ? updates.resolver : current.resolver,
    ...(nextSchemaVersion !== undefined ? { vault_schema_version: nextSchemaVersion } : {}),
    ...(nextContextSafety ? { context_safety: nextContextSafety } : {}),
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
