import { basename, dirname } from 'path';
import { formatCommandHelp, formatCommandUsage } from '../command-catalog';
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from '../note-generators';
import { handleValidateAllCommand } from '../note-validators';
import { resolveVaultRoot } from '../vault-files';
import { scanProject } from '../../scaffold/scan';
import { writeCodeGraph } from '../../scaffold/code-graph';
import { MIGRATION_REGISTRY } from './registry';
import { applyMigrations, planMigrations } from './runner';
import type { MigrationApplyResult, MigrationPlanEntry, MigrationPlanResult } from './runner';
import type { MigrationStep } from './types';

/**
 * `vault migrate` command handler (implementation checklist PR-4 and PR-5).
 *
 * The default (and `--dry-run`) path is strictly read-only plan mode.
 * `--apply` executes pending registry steps in order via `applyMigrations`,
 * running the full validate-all suite after each step's writes and refreshing
 * the code graph after any run that advanced the schema version.
 * `--apply --to <version>` stops at the named intermediate version.
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
  readonly to?: number;
}

const parseMigrateArgs = (argv: string[]): MigrateCommandFlags => {
  let help = false;
  let dryRun = false;
  let apply = false;
  let to: number | undefined;

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
      if (!/^\d+$/.test(value)) {
        throw new Error(
          `--to requires a non-negative integer schema version, got "${value}". ${formatCommandUsage('migrate')}`,
        );
      }
      to = Number.parseInt(value, 10);
      index++;
    } else {
      throw new Error(`Unknown migrate argument: ${arg}. ${formatCommandUsage('migrate')}`);
    }
  }

  if (!help) {
    if (dryRun && apply) {
      throw new Error(`--dry-run and --apply cannot be combined. ${formatCommandUsage('migrate')}`);
    }
    if (to !== undefined && !apply) {
      throw new Error(`--to requires --apply; plan mode always shows the full pending list. ${formatCommandUsage('migrate')}`);
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

const aheadOfLatestMessage = (currentVersion: number, latestVersion: number): string =>
  `Vault schema version (${currentVersion}) is ahead of this package's latest ` +
  `(${latestVersion}). Upgrade the agent-vault package instead of migrating.`;

const gapMessage = (version: number): string =>
  `No registered migration step starts at vault schema version ${version}; ` +
  'the migration registry has a gap. This is a package bug, not a vault problem.';

const renderPlan = (io: AgentVaultCommandIO, result: MigrationPlanResult): number => {
  io.stdout(`Vault schema version: ${result.currentVersion}`);
  io.stdout(`Package schema version: ${result.latestVersion}`);

  if (result.status === 'up-to-date') {
    io.stdout('Vault is already at the latest schema version. Nothing to migrate.');
    return 0;
  }

  if (result.status === 'ahead-of-latest') {
    io.stderr(aheadOfLatestMessage(result.currentVersion, result.latestVersion));
    return 1;
  }

  if (result.status === 'gap') {
    io.stderr(gapMessage(result.currentVersion));
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

/**
 * Default post-step validator: runs the full validate-all suite against the
 * vault after each step's writes. Validator errors fail the migration for
 * that specific step; warnings are surfaced but never treated as failures.
 */
const createPostStepValidator = (
  vaultRoot: string,
  io: AgentVaultCommandIO,
): ((step: MigrationStep) => Promise<void>) => async (step) => {
  const lines: string[] = [];
  const capture: AgentVaultCommandIO = {
    stdout: (message) => lines.push(message),
    stderr: (message) => lines.push(message),
  };
  const exitCode = await handleValidateAllCommand([], { vaultRoot, io: capture });

  for (const warning of lines.filter((line) => line.startsWith('WARN '))) {
    io.stdout(`[post-step validation after ${step.id}] ${warning}`);
  }

  if (exitCode !== 0) {
    const errors = lines.filter((line) => line.startsWith('ERROR '));
    const detail = errors.length > 0 ? `\n${errors.join('\n')}` : '';
    throw new Error(`vault validation failed after step ${step.id} applied its writes.${detail}`);
  }
};

const renderApply = (io: AgentVaultCommandIO, result: MigrationApplyResult): number => {
  if (result.status === 'blocked-manual' && result.manualStep) {
    io.stderr(
      `Manual action required: ${result.manualStep.id} - ${result.manualStep.description} ` +
        `Steps ordered after it were not run. Vault schema version remains ${result.finalVersion}.`,
    );
    return 1;
  }

  if (result.status === 'failed' && result.failure) {
    const stage = result.failure.reason === 'validation-failed' ? 'post-step validation' : 'apply';
    io.stderr(`Migration step ${result.failure.stepId} failed during ${stage}: ${result.failure.message}`);
    io.stderr(
      `Vault schema version remains ${result.finalVersion}. ` +
        'Re-run `vault migrate --apply` after fixing the failure to resume from the incomplete step.',
    );
    return 1;
  }

  io.stdout(`Vault schema version is now ${result.finalVersion}.`);
  if (result.finalVersion < result.latestVersion) {
    io.stdout(
      `Stopped at requested version ${result.finalVersion}. ` +
        'Run `vault migrate` to inspect the remaining pending steps.',
    );
  }
  return 0;
};

const runApply = async (
  io: AgentVaultCommandIO,
  vaultRoot: string,
  registry: readonly MigrationStep[],
  targetVersion: number | undefined,
  postStepValidate: ((step: MigrationStep) => Promise<void>) | undefined,
): Promise<number> => {
  const validateAfterStep = postStepValidate ?? createPostStepValidator(vaultRoot, io);
  const result = await applyMigrations(vaultRoot, { registry, targetVersion, validateAfterStep });

  io.stdout(`Vault schema version: ${result.startVersion}`);
  io.stdout(`Package schema version: ${result.latestVersion}`);

  if (result.status === 'up-to-date') {
    io.stdout(
      targetVersion !== undefined && result.startVersion < result.latestVersion
        ? `Vault is already at requested version ${targetVersion}. Nothing to migrate.`
        : 'Vault is already at the latest schema version. Nothing to migrate.',
    );
    return 0;
  }
  if (result.status === 'ahead-of-latest') {
    io.stderr(aheadOfLatestMessage(result.startVersion, result.latestVersion));
    return 1;
  }
  if (result.status === 'gap') {
    io.stderr(gapMessage(result.finalVersion));
    return 1;
  }

  for (const step of result.applied) {
    io.stdout(`Applied ${step.id} (${step.from_version} -> ${step.to_version}, ${step.category}): ${step.description}`);
  }

  // Every apply run that advanced the schema version ends with the same
  // code-graph refresh migrate-step-notes performs today, even when a later
  // step blocked or failed, so generated artifacts match the applied writes.
  if (result.applied.length > 0) {
    const projectRoot = basename(vaultRoot) === '.agent-vault' ? dirname(vaultRoot) : vaultRoot;
    const scan = await scanProject(projectRoot);
    const graph = await writeCodeGraph(projectRoot, vaultRoot, scan.repoName);
    io.stdout(`Code graph refreshed: ${graph.totalFiles} files, ${graph.totalSymbols} symbols indexed.`);
  }

  return renderApply(io, result);
};

export interface HandleMigrateCommandOptions {
  /** Registry override for tests. Defaults to the shipped registry. */
  readonly registry?: readonly MigrationStep[];
  /**
   * Post-step validator override for tests. Defaults to running the full
   * validate-all suite after each applied step.
   */
  readonly postStepValidate?: (step: MigrationStep) => Promise<void>;
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

    const vaultRoot = environment.vaultRoot ?? resolveVaultRoot(environment.cwd?.() ?? process.cwd());
    const registry = (options.registry ?? MIGRATION_REGISTRY).map(withStepErrorContext);

    if (flags.apply) {
      return await runApply(io, vaultRoot, registry, flags.to, options.postStepValidate);
    }

    const result = await planMigrations(vaultRoot, { registry });
    return renderPlan(io, result);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
