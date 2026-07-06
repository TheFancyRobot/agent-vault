import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { handleMigrateCommand } from '../../../src/core/migrations/command';
import { handleVaultCommand } from '../../../src/core/dispatcher';
import { readVaultSchemaVersion, writeVaultConfig } from '../../../src/core/vault-config';
import type { MigrationStep, MigrationStepContext } from '../../../src/core/migrations/types';
import { copyTemplate } from '../../helpers';

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
  readonly onApply?: (context: MigrationStepContext) => Promise<void>;
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
    ...(category === 'unsafe-manual' ? {} : { apply: options.onApply ?? (async () => undefined) }),
  };
};

/** No-op post-step validator for apply fixtures that do not exercise validation. */
const noopValidator = async (): Promise<void> => undefined;

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

  it('rejects --to without --apply and performs zero writes', async () => {
    const root = await createTempVault('to-without-apply');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--to', '2'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0), fixtureStep(1)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('--to requires --apply');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('rejects combining --dry-run with --apply', async () => {
    const root = await createTempVault('dry-run-apply');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--dry-run', '--apply'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('--dry-run and --apply cannot be combined');
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('rejects a non-integer --to value', async () => {
    const root = await createTempVault('to-non-integer');
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply', '--to', 'abc'], { io: harness.io, vaultRoot: root }, {
      registry: [fixtureStep(0)],
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('--to requires a non-negative integer schema version, got "abc"');
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

describe('handleMigrateCommand apply mode', () => {
  it('applies pending steps in order, preserves the resolver, and refreshes the code graph', async () => {
    const root = await createTempVault('apply-e2e');
    await writeVaultConfig(root, { resolver: 'obsidian' });
    const order: string[] = [];
    const registry = [
      fixtureStep(0, {
        onApply: async ({ vaultRoot }) => {
          order.push('0001-fixture');
          await writeFile(join(vaultRoot, 'fixture-0.txt'), 'migrated\n', 'utf-8');
        },
      }),
      fixtureStep(1, { onApply: async () => void order.push('0002-fixture') }),
    ];
    const harness = makeIo();

    // Default post-step validator: a vault without markdown notes passes validate-all.
    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(order).toEqual(['0001-fixture', '0002-fixture']);
    expect(output).toContain('Applied 0001-fixture (0 -> 1, safe-automatic): Fixture step 0 -> 1.');
    expect(output).toContain('Applied 0002-fixture (1 -> 2, safe-automatic): Fixture step 1 -> 2.');
    expect(output).toContain('Code graph refreshed:');
    expect(output).toContain('Vault schema version is now 2.');
    expect(await readFile(join(root, 'fixture-0.txt'), 'utf-8')).toBe('migrated\n');
    const raw = JSON.parse(await readFile(join(root, '.config.json'), 'utf-8')) as Record<string, unknown>;
    expect(raw.resolver).toBe('obsidian');
    expect(raw.vault_schema_version).toBe(2);
    expect(harness.stderr).toEqual([]);
  });

  it('re-running --apply on an already-current vault is an idempotent no-op', async () => {
    const root = await createTempVault('apply-idempotent');
    let applyCalls = 0;
    const registry = [fixtureStep(0, { onApply: async () => void applyCalls++ })];

    const first = await handleMigrateCommand(['--apply'], { io: makeIo().io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });
    expect(first).toBe(0);
    expect(applyCalls).toBe(1);

    const harness = makeIo();
    const second = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(second).toBe(0);
    expect(applyCalls).toBe(1);
    expect(harness.stdout.join('\n')).toContain('Vault is already at the latest schema version. Nothing to migrate.');
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('--apply --to stops at the requested intermediate version', async () => {
    const root = await createTempVault('apply-to');
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, { onApply: async () => void order.push('0002-fixture') }),
      fixtureStep(2, { onApply: async () => void order.push('0003-fixture') }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply', '--to', '2'], { io: harness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(exitCode).toBe(0);
    expect(order).toEqual(['0001-fixture', '0002-fixture']);
    expect(await readVaultSchemaVersion(root)).toBe(2);
    const output = harness.stdout.join('\n');
    expect(output).toContain('Vault schema version is now 2.');
    expect(output).toContain('Stopped at requested version 2.');
  });

  it('refuses a downgrade --to target without applying anything', async () => {
    const root = await createTempVault('apply-to-downgrade');
    await writeVaultConfig(root, { resolver: 'filesystem', vault_schema_version: 2 });
    let applyCalls = 0;
    const registry = [
      fixtureStep(0, { onApply: async () => void applyCalls++ }),
      fixtureStep(1, { onApply: async () => void applyCalls++ }),
      fixtureStep(2, { onApply: async () => void applyCalls++ }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply', '--to', '1'], { io: harness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain('downgrades are not supported');
    expect(applyCalls).toBe(0);
    expect(await readVaultSchemaVersion(root)).toBe(2);
  });

  it('refuses a --to target beyond the package latest without applying anything', async () => {
    const root = await createTempVault('apply-to-beyond');
    let applyCalls = 0;
    const registry = [fixtureStep(0, { onApply: async () => void applyCalls++ })];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply', '--to', '9'], { io: harness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(exitCode).toBe(1);
    expect(harness.stderr.join('\n')).toContain("--to 9 is beyond this package's latest schema version (1)");
    expect(applyCalls).toBe(0);
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('stops and reports at an applicable unsafe-manual step, leaving later steps untouched', async () => {
    const root = await createTempVault('apply-manual');
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, { category: 'unsafe-manual' }),
      fixtureStep(2, { onApply: async () => void order.push('0003-fixture') }),
    ];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(exitCode).toBe(1);
    expect(order).toEqual(['0001-fixture']);
    expect(harness.stdout.join('\n')).toContain('Applied 0001-fixture (0 -> 1, safe-automatic)');
    expect(harness.stderr.join('\n')).toContain('Manual action required: 0002-fixture - Fixture step 1 -> 2.');
    expect(harness.stderr.join('\n')).toContain('Vault schema version remains 1.');
    expect(await readVaultSchemaVersion(root)).toBe(1);
  });

  it('reports an interrupted apply without advancing and resumes from the incomplete step on re-run', async () => {
    const root = await createTempVault('apply-resume');
    let interrupt = true;
    const order: string[] = [];
    const registry = [
      fixtureStep(0, { onApply: async () => void order.push('0001-fixture') }),
      fixtureStep(1, {
        onApply: async () => {
          if (interrupt) {
            throw new Error('simulated interruption');
          }
          order.push('0002-fixture');
        },
      }),
    ];

    const firstHarness = makeIo();
    const first = await handleMigrateCommand(['--apply'], { io: firstHarness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(first).toBe(1);
    expect(firstHarness.stderr.join('\n')).toContain('Migration step 0002-fixture failed during apply: simulated interruption');
    expect(firstHarness.stderr.join('\n')).toContain('Vault schema version remains 1.');
    expect(firstHarness.stderr.join('\n')).toContain('resume from the incomplete step');
    expect(await readVaultSchemaVersion(root)).toBe(1);

    interrupt = false;
    const secondHarness = makeIo();
    const second = await handleMigrateCommand(['--apply'], { io: secondHarness.io, vaultRoot: root }, {
      registry,
      postStepValidate: noopValidator,
    });

    expect(second).toBe(0);
    // The completed first step is not re-applied on resume.
    expect(order).toEqual(['0001-fixture', '0002-fixture']);
    expect(secondHarness.stdout.join('\n')).toContain('Applied 0002-fixture');
    expect(secondHarness.stdout.join('\n')).not.toContain('Applied 0001-fixture');
    expect(await readVaultSchemaVersion(root)).toBe(2);
  });

  it('ties a default post-step validation failure to the step and does not advance the version', async () => {
    const root = await createTempVault('apply-validation-failure');
    // An invalid step note makes the real validate-all suite report errors.
    await mkdir(join(root, '02_Phases', 'Phase_01_Broken', 'Steps'), { recursive: true });
    await writeFile(join(root, '02_Phases', 'Phase_01_Broken', 'Steps', 'Step_01_broken.md'), [
      '---',
      'note_type: step',
      'title: Broken step',
      '---',
      '',
      '# Step 01 - Broken step',
    ].join('\n'), 'utf-8');
    const registry = [fixtureStep(0)];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(1);
    const errorOutput = harness.stderr.join('\n');
    expect(errorOutput).toContain('Migration step 0001-fixture failed during post-step validation');
    expect(errorOutput).toContain('vault validation failed after step 0001-fixture');
    expect(errorOutput).toContain('Vault schema version remains 0.');
    // The schema version never advanced, so no config file was written.
    expect(existsSync(join(root, '.config.json'))).toBe(false);
  });

  it('surfaces default post-step validator warnings without failing the migration', async () => {
    const root = await createTempVault('apply-validation-warnings');
    // A plain unlinked note produces an orphan warning but no validation error.
    await writeFile(join(root, 'note.md'), '# unlinked fixture note\n', 'utf-8');
    const registry = [fixtureStep(0)];
    const harness = makeIo();

    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, { registry });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(output).toContain('[post-step validation after 0001-fixture] WARN ORPHAN_NOTE');
    expect(output).not.toContain('SCHEMA_VERSION_BEHIND');
    expect(output).toContain('Vault schema version is now 1.');
    expect(await readVaultSchemaVersion(root)).toBe(1);
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

  it('applies the shipped registry from schema version 0 against a legacy fixture vault', async () => {
    const root = await createTempVault('dispatch-apply');
    await writeVaultConfig(root, { resolver: 'obsidian' });
    await copyTemplate(root, 'Step_Template.md');
    const phaseDirectory = join(root, '02_Phases', 'Phase_01_Foundation');
    await mkdir(join(phaseDirectory, 'Steps'), { recursive: true });
    await writeFile(join(phaseDirectory, 'Phase.md'), [
      '---',
      'note_type: phase',
      'phase_id: PHASE-01',
      'title: Foundation',
      '---',
      '',
      '# Phase 01 Foundation',
    ].join('\n'), 'utf-8');
    const stepPath = join(phaseDirectory, 'Steps', 'Step_02_legacy-step.md');
    await writeFile(stepPath, [
      '---',
      'note_type: step',
      'title: Legacy step',
      'step_id: STEP-01-02',
      'phase: "[[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]]"',
      '---',
      '',
      '# Step 02 - Legacy step',
      '',
      '## Purpose',
      '',
      '- Outcome: Legacy step.',
      '',
      '## Execution Prompt',
      '',
      '1. Do the legacy thing.',
      '',
      '## Implementation Notes',
      '',
      '- Found a thing.',
      '',
      '## Outcome Summary',
      '',
      '- It worked.',
    ].join('\n'), 'utf-8');
    const harness = makeIo();

    // The minimal fixture is not a fully valid vault, so the real validate-all
    // suite is stubbed out; default-validator behavior is covered separately.
    const exitCode = await handleMigrateCommand(['--apply'], { io: harness.io, vaultRoot: root }, {
      postStepValidate: noopValidator,
    });

    expect(exitCode).toBe(0);
    const output = harness.stdout.join('\n');
    expect(output).toContain('Applied 0001-thin-step-notes (0 -> 1, safe-confirm)');
    expect(output).toContain('Code graph refreshed:');
    expect(output).toContain('Vault schema version is now 1.');
    const migrated = await readFile(stepPath, 'utf-8');
    expect(migrated).toContain('## Companion Notes');
    expect(migrated).not.toContain('## Execution Prompt');
    const companionDir = join(phaseDirectory, 'Steps', 'Step_02_legacy-step');
    expect(await readFile(join(companionDir, 'Execution_Brief.md'), 'utf-8')).toContain('## Execution Prompt');
    expect(await readFile(join(companionDir, 'Outcome.md'), 'utf-8')).toContain('- It worked.');
    const raw = JSON.parse(await readFile(join(root, '.config.json'), 'utf-8')) as Record<string, unknown>;
    expect(raw.resolver).toBe('obsidian');
    expect(raw.vault_schema_version).toBe(1);
  });

  it('shows migrate help through the dispatcher', async () => {
    const harness = makeIo();

    const exitCode = await handleVaultCommand(['help', 'migrate'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: migrate [--dry-run] [--apply] [--to <version>]');
  });
});
