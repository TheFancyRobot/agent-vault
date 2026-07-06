import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readVaultSchemaVersion, writeVaultConfig } from '../../../src/core/vault-config';
import {
  MIGRATION_REGISTRY,
  MigrationRegistryError,
  latestSchemaVersion,
  validateMigrationRegistry,
} from '../../../src/core/migrations/registry';
import { applyMigrations, planMigrations } from '../../../src/core/migrations/runner';
import type { MigrationStep, MigrationStepContext } from '../../../src/core/migrations/types';

const tempRoots: string[] = [];

const createTempVault = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-migrations-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

interface FixtureStepOptions {
  readonly category?: MigrationStep['category'];
  readonly applicable?: boolean;
  readonly onApply?: (context: MigrationStepContext) => Promise<void>;
  readonly omitApply?: boolean;
  readonly id?: string;
}

const fixtureStep = (fromVersion: number, options: FixtureStepOptions = {}): MigrationStep => {
  const category = options.category ?? 'safe-automatic';
  const omitApply = options.omitApply ?? category === 'unsafe-manual';
  return {
    id: options.id ?? `${String(fromVersion + 1).padStart(4, '0')}-fixture`,
    from_version: fromVersion,
    to_version: fromVersion + 1,
    category,
    description: `Fixture step ${fromVersion} -> ${fromVersion + 1}`,
    detect: async () => options.applicable ?? true,
    plan: async () => ({
      summary: `Would migrate ${fromVersion} -> ${fromVersion + 1}`,
      affectedPaths: [`00_Home/fixture-${fromVersion}.md`],
    }),
    ...(omitApply ? {} : { apply: options.onApply ?? (async () => undefined) }),
  };
};

describe('shipped registry', () => {
  it('ships the thin-step-notes migration as schema version 1', () => {
    expect(MIGRATION_REGISTRY.map((step) => step.id)).toEqual(['0001-thin-step-notes']);
    expect(latestSchemaVersion()).toBe(1);
    expect(() => validateMigrationRegistry(MIGRATION_REGISTRY)).not.toThrow();
  });
});

describe('validateMigrationRegistry', () => {
  it('accepts a contiguous ascending registry', () => {
    const registry = [fixtureStep(0), fixtureStep(1), fixtureStep(2)];
    expect(() => validateMigrationRegistry(registry)).not.toThrow();
  });

  it('fails fast on duplicate step ids', () => {
    const registry = [fixtureStep(0, { id: 'dup' }), fixtureStep(1, { id: 'dup' })];
    expect(() => validateMigrationRegistry(registry)).toThrow(MigrationRegistryError);
    expect(() => validateMigrationRegistry(registry)).toThrow(/Duplicate migration step id/);
  });

  it('fails fast on non-contiguous entries', () => {
    const registry = [fixtureStep(0), fixtureStep(2)];
    expect(() => validateMigrationRegistry(registry)).toThrow(/not contiguous/);
  });

  it('fails fast on out-of-order entries', () => {
    const registry = [fixtureStep(1), fixtureStep(0)];
    expect(() => validateMigrationRegistry(registry)).toThrow(/not contiguous/);
  });

  it('fails fast on steps that do not upgrade forward', () => {
    const step = { ...fixtureStep(1), to_version: 1 };
    expect(() => validateMigrationRegistry([step])).toThrow(/must upgrade forward/);
  });

  it('fails fast on unsafe-manual steps that define apply()', () => {
    const step = fixtureStep(0, { category: 'unsafe-manual', omitApply: false });
    expect(() => validateMigrationRegistry([step])).toThrow(/must not define apply/);
  });

  it('fails fast on safe steps that omit apply()', () => {
    const step = fixtureStep(0, { omitApply: true });
    expect(() => validateMigrationRegistry([step])).toThrow(/must define apply/);
  });
});

describe('planMigrations', () => {
  it('reports already-current for an empty registry without creating a config file', async () => {
    const root = await createTempVault('plan-empty');
    const result = await planMigrations(root, { registry: [] });

    expect(result.status).toBe('up-to-date');
    expect(result.currentVersion).toBe(0);
    expect(result.latestVersion).toBe(0);
    expect(result.steps).toEqual([]);
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('reports ahead-of-latest when the vault version exceeds the registry', async () => {
    const root = await createTempVault('plan-ahead');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 5 });

    const result = await planMigrations(root, { registry: [fixtureStep(0)] });

    expect(result.status).toBe('ahead-of-latest');
    expect(result.currentVersion).toBe(5);
    expect(result.latestVersion).toBe(1);
    expect(result.steps).toEqual([]);
  });

  it('lists pending steps in ascending order with structured plan details and no writes', async () => {
    const root = await createTempVault('plan-pending');
    const registry = [fixtureStep(0), fixtureStep(1)];

    const result = await planMigrations(root, { registry });

    expect(result.status).toBe('pending');
    expect(result.currentVersion).toBe(0);
    expect(result.latestVersion).toBe(2);
    expect(result.steps.map((step) => step.id)).toEqual(['0001-fixture', '0002-fixture']);
    expect(result.steps[0].plan.summary).toBe('Would migrate 0 -> 1');
    expect(result.steps[0].plan.affectedPaths).toEqual(['00_Home/fixture-0.md']);
    expect(result.steps.every((step) => !step.blocked)).toBe(true);
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('starts planning from the current version, not from the beginning', async () => {
    const root = await createTempVault('plan-resume-point');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 1 });
    const registry = [fixtureStep(0), fixtureStep(1)];

    const result = await planMigrations(root, { registry });

    expect(result.status).toBe('pending');
    expect(result.steps.map((step) => step.id)).toEqual(['0002-fixture']);
  });

  it('reports a gap when no registered step matches the current version', async () => {
    const root = await createTempVault('plan-gap');
    const registry = [fixtureStep(1), fixtureStep(2)];

    const result = await planMigrations(root, { registry });

    expect(result.status).toBe('gap');
    expect(result.steps).toEqual([]);
  });

  it('marks steps after an applicable unsafe-manual step as blocked', async () => {
    const root = await createTempVault('plan-manual');
    const registry = [
      fixtureStep(0),
      fixtureStep(1, { category: 'unsafe-manual' }),
      fixtureStep(2),
    ];

    const result = await planMigrations(root, { registry });

    expect(result.status).toBe('pending');
    expect(result.manualStep?.id).toBe('0002-fixture');
    expect(result.steps.map((step) => step.blocked)).toEqual([false, false, true]);
  });
});

describe('applyMigrations', () => {
  it('is a no-op that reports already-current for an empty registry', async () => {
    const root = await createTempVault('apply-empty');
    const result = await applyMigrations(root, { registry: [] });

    expect(result.status).toBe('up-to-date');
    expect(result.applied).toEqual([]);
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('reports ahead-of-latest instead of applying when the vault version exceeds the registry', async () => {
    const root = await createTempVault('apply-ahead');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 9 });
    let applyCalls = 0;
    const registry = [fixtureStep(0, { onApply: async () => void applyCalls++ })];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('ahead-of-latest');
    expect(result.applied).toEqual([]);
    expect(applyCalls).toBe(0);
    expect(await readVaultSchemaVersion(root)).toBe(9);
  });

  it('applies steps strictly in ascending order and records the final version', async () => {
    const root = await createTempVault('apply-order');
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, { onApply: async () => void order.push('0002-fixture') }),
      fixtureStep(2, { onApply: async () => void order.push('0003-fixture') }),
    ];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('completed');
    expect(order).toEqual(['0001-fixture', '0002-fixture', '0003-fixture']);
    expect(result.applied.map((step) => step.id)).toEqual(order);
    expect(result.startVersion).toBe(0);
    expect(result.finalVersion).toBe(3);
    expect(await readVaultSchemaVersion(root)).toBe(3);
  });

  it('refuses to run when no step matches the current version (gap-jump rejection)', async () => {
    const root = await createTempVault('apply-gap');
    let applyCalls = 0;
    const registry = [
      fixtureStep(1, { onApply: async () => void applyCalls++ }),
      fixtureStep(2, { onApply: async () => void applyCalls++ }),
    ];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('gap');
    expect(result.applied).toEqual([]);
    expect(applyCalls).toBe(0);
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('fails fast on a malformed registry before applying anything', async () => {
    const root = await createTempVault('apply-malformed');
    let applyCalls = 0;
    const registry = [
      fixtureStep(0, { onApply: async () => void applyCalls++ }),
      fixtureStep(2, { onApply: async () => void applyCalls++ }),
    ];

    await expect(applyMigrations(root, { registry })).rejects.toThrow(MigrationRegistryError);
    expect(applyCalls).toBe(0);
    expect(await readVaultSchemaVersion(root)).toBe(0);
  });

  it('stops and reports at the first applicable unsafe-manual step instead of skipping it', async () => {
    const root = await createTempVault('apply-manual-stop');
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, { category: 'unsafe-manual' }),
      fixtureStep(2, { onApply: async () => void order.push('0003-fixture') }),
    ];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('blocked-manual');
    expect(result.manualStep?.id).toBe('0002-fixture');
    expect(order).toEqual(['0001-fixture']);
    expect(result.applied.map((step) => step.id)).toEqual(['0001-fixture']);
    expect(result.finalVersion).toBe(1);
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('advances past an unsafe-manual step whose detect() finds nothing to migrate', async () => {
    const root = await createTempVault('apply-manual-inapplicable');
    const registry = [
      fixtureStep(0),
      fixtureStep(1, { category: 'unsafe-manual', applicable: false }),
      fixtureStep(2),
    ];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('completed');
    expect(result.finalVersion).toBe(3);
    expect(await readVaultSchemaVersion(root)).toBe(3);
  });

  it('skips apply() but still advances when detect() reports nothing to migrate', async () => {
    const root = await createTempVault('apply-inapplicable');
    let applyCalls = 0;
    const registry = [fixtureStep(0, { applicable: false, onApply: async () => void applyCalls++ })];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('completed');
    expect(applyCalls).toBe(0);
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('does not advance the schema version when a step is interrupted mid-apply', async () => {
    const root = await createTempVault('apply-interrupted');
    const registry = [
      fixtureStep(0),
      fixtureStep(1, {
        onApply: async () => {
          throw new Error('simulated interruption before version advance');
        },
      }),
      fixtureStep(2),
    ];

    const result = await applyMigrations(root, { registry });

    expect(result.status).toBe('failed');
    expect(result.failure).toEqual({
      stepId: '0002-fixture',
      reason: 'apply-failed',
      message: 'simulated interruption before version advance',
    });
    expect(result.applied.map((step) => step.id)).toEqual(['0001-fixture']);
    expect(result.finalVersion).toBe(1);
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('resumes from the last completed step after an interruption', async () => {
    const root = await createTempVault('apply-resume');
    let interrupt = true;
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, {
        onApply: async () => {
          if (interrupt) {
            throw new Error('interrupted');
          }
          order.push('0002-fixture');
        },
      }),
    ];

    const first = await applyMigrations(root, { registry });
    expect(first.status).toBe('failed');
    expect(await readVaultSchemaVersion(root)).toBe(1);

    interrupt = false;
    const second = await applyMigrations(root, { registry });

    expect(second.status).toBe('completed');
    expect(second.startVersion).toBe(1);
    expect(second.finalVersion).toBe(2);
    // The completed first step is not re-applied on resume.
    expect(order).toEqual(['0001-fixture', '0002-fixture']);
    expect(await readVaultSchemaVersion(root)).toBe(2);
  });

  it('reports a post-step validator failure as a migration failure and does not advance', async () => {
    const root = await createTempVault('apply-validator-failure');
    const registry = [fixtureStep(0), fixtureStep(1)];

    const result = await applyMigrations(root, {
      registry,
      validateAfterStep: async (step) => {
        if (step.id === '0002-fixture') {
          throw new Error('post-migration validation failed');
        }
      },
    });

    expect(result.status).toBe('failed');
    expect(result.failure).toEqual({
      stepId: '0002-fixture',
      reason: 'validation-failed',
      message: 'post-migration validation failed',
    });
    expect(result.finalVersion).toBe(1);
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('preserves unrelated config fields when advancing the schema version', async () => {
    const root = await createTempVault('apply-preserve-config');
    await writeVaultConfig(root, { resolver: 'obsidian' });

    const result = await applyMigrations(root, { registry: [fixtureStep(0)] });

    expect(result.status).toBe('completed');
    const raw = JSON.parse(await readFile(join(root, '.config.json'), 'utf-8')) as Record<string, unknown>;
    expect(raw.resolver).toBe('obsidian');
    expect(raw.vault_schema_version).toBe(1);
  });
});
