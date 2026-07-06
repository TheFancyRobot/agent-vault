import { formatCommandHelp, formatCommandUsage } from '../command-catalog';
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from '../note-generators';
import { resolveVaultRoot } from '../vault-files';
import { MIGRATION_REGISTRY } from './registry';
import { planMigrations } from './runner';
import type { MigrationPlanEntry, MigrationPlanResult } from './runner';
import type { MigrationStep } from './types';

/**
 * `vault migrate` command handler (implementation checklist PR-4).
 *
 * Plan mode only in this step: the default (and `--dry-run`) path is strictly
 * read-only. `--apply` and `--to <version>` are documented in help ahead of
 * time but exit with a clear not-yet-implemented error before any write path
 * is reached (apply ships in STEP-05-05).
 */

const DEFAULT_IO: AgentVaultCommandIO = {
  stdout: (message: string) => console.log(message),
  stderr: (message: string) => console.error(message),
};

/** Wraps a detect()/plan() failure so the failing step id is always reported. */
export class MigrationPlanStepError extends Error {
  readonly stepId: string;

  constructor(stepId: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Migration step ${stepId} failed during plan: ${message}`);
    this.name = 'MigrationPlanStepError';
    this.stepId = stepId;
  }
}

/**
 * Re-throws detect()/plan() errors annotated with the owning step id so plan
 * failures never surface as anonymous errors (or worse, partial success).
 */
const withStepErrorContext = (step: MigrationStep): MigrationStep => ({
  ...step,
  detect: async (context) => {
    try {
      return await step.detect(context);
    } catch (error) {
      throw new MigrationPlanStepError(step.id, error);
    }
  },
  plan: async (context) => {
    try {
      return await step.plan(context);
    } catch (error) {
      throw new MigrationPlanStepError(step.id, error);
    }
  },
});

interface MigrateCommandFlags {
  readonly help: boolean;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly to?: string;
}

const parseMigrateArgs = (argv: string[]): MigrateCommandFlags => {
  let help = false;
  let dryRun = false;
  let apply = false;
  let to: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--apply') {
      apply = true;
    } else if (arg === '--to') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`--to requires a version argument. ${formatCommandUsage('migrate')}`);
      }
      to = value;
      index++;
    } else {
      throw new Error(`Unknown migrate argument: ${arg}. ${formatCommandUsage('migrate')}`);
    }
  }

  return { help, dryRun, apply, to };
};

const formatAffectedCount = (entry: MigrationPlanEntry): string => {
  if (!entry.applicable) {
    return 'nothing detected';
  }
  const count = entry.plan.affectedPaths.length;
  return `${count} affected path${count === 1 ? '' : 's'}`;
};

const renderPlan = (io: AgentVaultCommandIO, result: MigrationPlanResult): number => {
  io.stdout(`Vault schema version: ${result.currentVersion}`);
  io.stdout(`Package schema version: ${result.latestVersion}`);

  if (result.status === 'up-to-date') {
    io.stdout('Vault is already at the latest schema version. Nothing to migrate.');
    return 0;
  }

  if (result.status === 'ahead-of-latest') {
    io.stderr(
      `Vault schema version (${result.currentVersion}) is ahead of this package's latest ` +
        `(${result.latestVersion}). Upgrade the agent-vault package instead of migrating.`,
    );
    return 1;
  }

  if (result.status === 'gap') {
    io.stderr(
      `No registered migration step starts at vault schema version ${result.currentVersion}; ` +
        'the migration registry has a gap. This is a package bug, not a vault problem.',
    );
    return 1;
  }

  io.stdout('');
  io.stdout(`Pending migration steps (${result.steps.length}):`);
  result.steps.forEach((entry, index) => {
    const blockedSuffix = entry.blocked ? ' [blocked by manual step]' : '';
    io.stdout(
      `${index + 1}. ${entry.id} (${entry.from_version} -> ${entry.to_version}, ${entry.category}): ` +
        `${entry.description} [${formatAffectedCount(entry)}]${blockedSuffix}`,
    );
  });

  if (result.manualStep) {
    io.stdout('');
    io.stdout(
      `Manual action required: ${result.manualStep.id} - ${result.manualStep.description} ` +
        'Steps ordered after it are blocked until it is resolved.',
    );
  }

  io.stdout('');
  io.stdout('Plan mode only: no changes were written.');
  return 0;
};

export interface HandleMigrateCommandOptions {
  /** Registry override for tests. Defaults to the shipped registry. */
  readonly registry?: readonly MigrationStep[];
}

export async function handleMigrateCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
  options: HandleMigrateCommandOptions = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    const flags = parseMigrateArgs(argv);

    if (flags.help) {
      io.stdout(formatCommandHelp('migrate'));
      return 0;
    }

    if (flags.apply || flags.to !== undefined) {
      const rejected = flags.apply ? '--apply' : '--to';
      io.stderr(
        `${rejected} is not implemented yet: vault migrate currently supports plan mode only. ` +
          'No changes were written. Run `vault migrate` (or `vault migrate --dry-run`) to inspect pending migrations.',
      );
      return 1;
    }

    const vaultRoot = environment.vaultRoot ?? resolveVaultRoot(environment.cwd?.() ?? process.cwd());
    const registry = (options.registry ?? MIGRATION_REGISTRY).map(withStepErrorContext);
    const result = await planMigrations(vaultRoot, { registry });
    return renderPlan(io, result);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
