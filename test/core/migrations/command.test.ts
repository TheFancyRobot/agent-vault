import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { handleMigrateCommand } from '../../../src/core/migrations/command';
import { handleVaultCommand } from '../../../src/core/dispatcher';
import { writeVaultConfig } from '../../../src/core/vault-config';
import type { MigrationStep, MigrationStepContext } from '../../../src/core/migrations/types';

const tempRoots: string[] = [];

const createTempVault = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-migrate-command-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const makeIo = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
};

interface FixtureStepOptions {
  readonly category?: MigrationStep['category'];
  readonly applicable?: boolean;
  readonly affectedPaths?: readonly string[];
  readonly onDetect?: (context: MigrationStepContext) => Promise<boolean>;
  readonly onPlan?: (context: MigrationStepContext) => Promise<{ summary: string; affectedPaths: readonly string[] }>;
}

const fixtureStep = (fromVersion: number, options: FixtureStepOptions = {}): MigrationStep => {
  const category = options.category ?? 'safe-automatic';
  const affectedPaths = options.affectedPaths ?? [`00_Home/fixture-${fromVersion}.md`];
  return {
    id: `${String(fromVersion + 1).padStart(4, '0')}-fixture`,
    from_version: fromVersion,
    to_version: fromVersion + 1,
    category,
    description: `Fixture step ${fromVersion} -> ${fromVersion + 1}.`,
    detect: options.onDetect ?? (async () => options.applicable ?? true),
    plan: options.onPlan ?? (async () => ({
      summary: `Would migrate ${fromVersion} -> ${fromVersion + 1}`,
      affectedPaths,
    })),
    ...(category === 'unsafe-manual' ? {} : { apply: async () => undefined }),
  };
};

/** Recursive path -> mtimeMs snapshot used to prove plan mode performs zero writes. */
const snapshotVault = async (root: string): Promise<Map<string, number>> => {
  const snapshot = new Map<string, number>();
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const nextPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath);
      } else if (entry.isFile()) {
        snapshot.set(nextPath, (await stat(nextPath)).mtimeMs);
      }
    }
  };
  await walk(root);
  return snapshot;
};

describe('handleMigrateCommand plan mode', () => {
  it('prints command help with --help', async () => {
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--help'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: migrate [--dry-run] [--apply] [--to <version>]');
    expect(harness.stderr).toEqual([]);
  });

  it('reports versions and ordered pending steps with affected-path counts and zero writes', async () => {
    const root = await createTempVault('plan');
    await writeFile(join(root, 'note.md'), '# fixture note\n', 'utf-8');
    const before = await snapshotVault(root);
    const registry = [
      fixtureStep(0, { affectedPaths: ['00_Home/a.md', '00_Home/b.md'] }),
      fixtureStep(1, { applicable: false }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    // Missing .config.json reads as schema version 0 (STEP-05-01 helper).
    expect(output).toContain('Vault schema version: 0');
    expect(output).toContain('Package schema version: 2');
    expect(output).toContain('Pending migration steps (2):');
    expect(output).toContain('1. 0001-fixture (0 -> 1, safe-automatic): Fixture step 0 -> 1. [2 affected paths]');
    expect(output).toContain('2. 0002-fixture (1 -> 2, safe-automatic): Fixture step 1 -> 2. [nothing detected]');
    expect(output).toContain('Plan mode only: no changes were written.');
    // Zero writes: no config file appears and no existing file is touched.
    expect(existsSync(join(root, '.config.json'))).toBe(false);
    expect(await snapshotVault(root)).toEqual(before);
  });

  it('treats --dry-run as the default plan mode', async () => {
    const root = await createTempVault('dry-run');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--dry-run'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Pending migration steps (1):');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('reports nothing to migrate for an already-current vault', async () => {
    const root = await createTempVault('up-to-date');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 1 });
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(output).toContain('Vault schema version: 1');
    expect(output).toContain('Package schema version: 1');
    expect(output).toContain('Vault is already at the latest schema version. Nothing to migrate.');
    expect(output).not.toContain('Pending migration steps');
  });

  it('reports a mismatch instead of inventing steps when the vault is ahead of the package', async () => {
    const root = await createTempVault('ahead');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 5 });
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stdout.join('\n')).toContain('Vault schema version: 5');
    expect(harness.stderr.join('\n')).toContain(
      "Vault schema version (5) is ahead of this package's latest (1). Upgrade the agent-vault package instead of migrating.",
    );
    expect(harness.stdout.join('\n')).not.toContain('Pending migration steps');
  });

  it('flags steps blocked by an applicable unsafe-manual step', async () => {
    const root = await createTempVault('manual');
    const registry = [
      fixtureStep(0),
      fixtureStep(1, { category: 'unsafe-manual' }),
      fixtureStep(2),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(output).toContain('Manual action required: 0002-fixture - Fixture step 1 -> 2.');
    expect(output).toContain('3. 0003-fixture (2 -> 3, safe-automatic): Fixture step 2 -> 3. [1 affected path] [blocked by manual step]');
  });

  it('rejects --apply with a clear not-yet-implemented message and zero writes', async () => {
    const root = await createTempVault('apply-flag');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('--apply is not implemented yet');
    expect(harness.stderr.join('\n')).toContain('No changes were written.');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('rejects --to with a clear not-yet-implemented message and zero writes', async () => {
    const root = await createTempVault('to-flag');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--to', '2'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0), fixtureStep(1)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('--to is not implemented yet');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('rejects unknown arguments with usage guidance', async () => {
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--bogus'], { io: harness.io, vaultRoot: '/nonexistent' });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('Unknown migrate argument: --bogus');
    expect(harness.stderr.join('\n')).toContain('Usage: migrate [--dry-run] [--apply] [--to <version>]');
  });

  it('reports the failing step id and exits non-zero when detect() fails, without partial plan output', async () => {
    const root = await createTempVault('detect-failure');
    const registry = [
      fixtureStep(0),
      fixtureStep(1, {
        onDetect: async () => {
          throw new Error('scan blew up');
        },
      }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('Migration step 0002-fixture failed during plan: scan blew up');
    // No partial plan is printed as success.
    expect(harness.stdout).toEqual([]);
  });

  it('reports the failing step id and exits non-zero when plan() fails', async () => {
    const root = await createTempVault('plan-failure');
    const registry = [
      fixtureStep(0, {
        onPlan: async () => {
          throw new Error('plan blew up');
        },
      }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('Migration step 0001-fixture failed during plan: plan blew up');
    expect(harness.stdout).toEqual([]);
  });

  it('reports a registry gap as a package bug and exits non-zero', async () => {
    const root = await createTempVault('gap');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 0 });
    const registry = [fixtureStep(1), fixtureStep(2)];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand([], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain(
      'No registered migration step starts at vault schema version 0; the migration registry has a gap.',
    );
  });
});

describe('vault migrate dispatcher wiring', () => {
  it('dispatches vault migrate against the shipped registry in plan mode', async () => {
    const root = await createTempVault('dispatch');
    const before = await snapshotVault(root);
    const harness = makeIo();

    const exitCode = await handleVaultCommand(['migrate'], { io: harness.io, vaultRoot: root });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(output).toContain('Vault schema version: 0');
    expect(output).toContain('Package schema version: 1');
    expect(output).toContain('0001-thin-step-notes (0 -> 1, safe-confirm): Split legacy verbose step notes into thin step indexes with companion notes.');
    expect(output).toContain('Plan mode only: no changes were written.');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
    expect(await snapshotVault(root)).toEqual(before);
  });

  it('shows migrate help through the dispatcher', async () => {
    const harness = makeIo();

    const exitCode = await handleVaultCommand(['help', 'migrate'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: migrate [--dry-run] [--apply] [--to <version>]');
  });
});
