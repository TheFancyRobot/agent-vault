import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readVaultConfig,
  readVaultSchemaVersion,
  updateVaultConfig,
  writeVaultConfig,
} from '../../src/core/vault-config';

const tempRoots: string[] = [];

const createTempVault = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-config-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const writeRawConfig = async (vaultRoot: string, raw: string): Promise<void> => {
  await writeFile(join(vaultRoot, '.config.json'), raw, 'utf-8');
};

describe('readVaultSchemaVersion', () => {
  it('returns 0 when no config file exists', async () => {
    const root = await createTempVault('missing-config');
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('returns 0 when the config has unrelated fields only', async () => {
    const root = await createTempVault('resolver-only');
    await writeRawConfig(root, JSON.stringify({ resolver: 'obsidian' }, null, 2) + '\n');
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('returns the stored vault_schema_version when set', async () => {
    const root = await createTempVault('version-set');
    await writeRawConfig(root, JSON.stringify({ resolver: 'filesystem', vault_schema_version: 3 }, null, 2) + '\n');
    expect(await readVaultSchemaVersion(root)).toBe(3);
  });

  it('returns 0 for malformed JSON', async () => {
    const root = await createTempVault('malformed');
    await writeRawConfig(root, '{ not valid json');
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('returns 0 for an empty config file', async () => {
    const root = await createTempVault('empty');
    await writeRawConfig(root, '');
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('returns 0 for an empty JSON object', async () => {
    const root = await createTempVault('empty-object');
    await writeRawConfig(root, '{}');
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it.each([
    ['string value', '"1"'],
    ['negative number', '-1'],
    ['non-integer number', '1.5'],
    ['null', 'null'],
    ['boolean', 'true'],
  ])('returns 0 for non-numeric or invalid field values (%s)', async (name, rawValue) => {
    const root = await createTempVault('invalid-field');
    await writeRawConfig(root, `{ "resolver": "filesystem", "vault_schema_version": ${rawValue} }`);
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });
});

describe('readVaultConfig schema version handling', () => {
  it('omits vault_schema_version when the stored value is invalid', async () => {
    const root = await createTempVault('omit-invalid');
    await writeRawConfig(root, '{ "resolver": "obsidian", "vault_schema_version": "2" }');
    const config = await readVaultConfig(root);
    expect(config.resolver).toBe('obsidian');
    expect(config.vault_schema_version).toBeUndefined();
  });

  it('keeps a valid vault_schema_version alongside the resolver', async () => {
    const root = await createTempVault('keep-valid');
    await writeRawConfig(root, '{ "resolver": "obsidian", "vault_schema_version": 2 }');
    const config = await readVaultConfig(root);
    expect(config.resolver).toBe('obsidian');
    expect(config.vault_schema_version).toBe(2);
  });
});

describe('updateVaultConfig schema version handling', () => {
  it('preserves an existing vault_schema_version when only the resolver changes', async () => {
    const root = await createTempVault('preserve-on-resolver-update');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 4 });

    const next = await updateVaultConfig(root, { resolver: 'obsidian' });

    expect(next.resolver).toBe('obsidian');
    expect(next.vault_schema_version).toBe(4);
    expect(await readVaultSchemaVersion(root)).toBe(4);
  });

  it('accepts a finite non-negative integer vault_schema_version update', async () => {
    const root = await createTempVault('accept-valid-update');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 1 });

    const next = await updateVaultConfig(root, { vault_schema_version: 2 });

    expect(next.resolver).toBe('filesystem');
    expect(next.vault_schema_version).toBe(2);
    expect(await readVaultSchemaVersion(root)).toBe(2);
  });

  it('keeps the current version when the update value is invalid', async () => {
    const root = await createTempVault('reject-invalid-update');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 5 });

    const next = await updateVaultConfig(root, { vault_schema_version: -3 });

    expect(next.vault_schema_version).toBe(5);
    expect(await readVaultSchemaVersion(root)).toBe(5);
  });

  it('does not add vault_schema_version when none exists and no valid update is provided', async () => {
    const root = await createTempVault('no-spurious-version');
    await writeVaultConfig(root, { resolver: 'filesystem' });

    const next = await updateVaultConfig(root, { resolver: 'obsidian' });

    expect(next.vault_schema_version).toBeUndefined();
    const raw = JSON.parse(await readFile(join(root, '.config.json'), 'utf-8')) as Record<string, unknown>;
    expect('vault_schema_version' in raw).toBe(false);
  });

  it('keeps the config file pretty-printed with a trailing newline', async () => {
    const root = await createTempVault('pretty-json');
    await updateVaultConfig(root, { resolver: 'obsidian', vault_schema_version: 1 });

    const raw = await readFile(join(root, '.config.json'), 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw).toContain('  "resolver": "obsidian"');
    expect(raw).toContain('  "vault_schema_version": 1');
  });
});
