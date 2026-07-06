import { readVaultSchemaVersion, updateVaultConfig } from '../vault-config';
import { MIGRATION_REGISTRY, latestSchemaVersion, validateMigrationRegistry } from './registry';
import type { MigrationCategory, MigrationStep, MigrationStepPlan } from './types';

/**
 * Migration runner (RFC "Safety Guarantees").
 *
 * - `planMigrations` never writes to disk.
 * - Steps run strictly in ascending version order; a step is runnable only
 *   when its `from_version` matches the vault's current recorded version
 *   (no gap-jumping, no reordering).
 * - Unsafe/manual steps stop the run with a report; they are never skipped.
 * - The schema version advances only after a step's writes and the post-step
 *   validator succeed, so an interrupted apply resumes from the last completed
 *   step on re-run.
 */

export type MigrationPlanStatus = 'up-to-date' | 'ahead-of-latest' | 'gap' | 'pending';

export type MigrationApplyStatus =
  | 'up-to-date'
  | 'ahead-of-latest'
  | 'gap'
  | 'blocked-manual'
  | 'failed'
  | 'completed';

export interface MigrationStepSummary {
  readonly id: string;
  readonly from_version: number;
  readonly to_version: number;
  readonly category: MigrationCategory;
  readonly description: string;
}

export interface MigrationPlanEntry extends MigrationStepSummary {
  /** Whether `detect()` found anything to migrate in this vault. */
  readonly applicable: boolean;
  /** Read-only plan details from the step. */
  readonly plan: MigrationStepPlan;
  /** True for steps ordered after an applicable unsafe/manual step. */
  readonly blocked: boolean;
}

export interface MigrationPlanResult {
  readonly status: MigrationPlanStatus;
  readonly currentVersion: number;
  readonly latestVersion: number;
  /** Ordered steps between the current and latest versions. Empty unless status is `pending`. */
  readonly steps: readonly MigrationPlanEntry[];
  /** First applicable unsafe/manual step, when one blocks automatic progression. */
  readonly manualStep?: MigrationStepSummary;
}

export interface MigrationFailure {
  readonly stepId: string;
  readonly reason: 'apply-failed' | 'validation-failed';
  readonly message: string;
}

export interface MigrationApplyResult {
  readonly status: MigrationApplyStatus;
  /** Vault schema version before the run. */
  readonly startVersion: number;
  /** Vault schema version after the run (recorded in the vault config). */
  readonly finalVersion: number;
  readonly latestVersion: number;
  /** Steps whose writes and validation completed, in the order they ran. */
  readonly applied: readonly MigrationStepSummary[];
  /** The unsafe/manual step that stopped the run, when status is `blocked-manual`. */
  readonly manualStep?: MigrationStepSummary;
  /** Failure details, when status is `failed`. */
  readonly failure?: MigrationFailure;
}

export interface PlanMigrationsOptions {
  /** Registry override for tests. Defaults to the shipped registry. */
  readonly registry?: readonly MigrationStep[];
}

export interface ApplyMigrationsOptions {
  /** Registry override for tests. Defaults to the shipped registry. */
  readonly registry?: readonly MigrationStep[];
  /**
   * Post-step validator invoked after each step's writes and before the schema
   * version advances. A rejection is reported as a migration failure for that
   * step, never swallowed.
   */
  readonly validateAfterStep?: (step: MigrationStep) => Promise<void>;
  /**
   * Stop after reaching this schema version instead of the package's latest
   * (`vault migrate --apply --to <version>`). Must be a registered step
   * boundary at or above the vault's current version; downgrades are refused.
   */
  readonly targetVersion?: number;
}

/** Thrown when a requested `--to` target version is invalid. Raised before any write. */
export class MigrationTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationTargetError';
  }
}

const toSummary = (step: MigrationStep): MigrationStepSummary => ({
  id: step.id,
  from_version: step.from_version,
  to_version: step.to_version,
  category: step.category,
  description: step.description,
});

const stepForVersion = (
  registry: readonly MigrationStep[],
  version: number,
): MigrationStep | undefined => registry.find((step) => step.from_version === version);

/** Plan the pending migrations for a vault. Never writes to disk. */
export const planMigrations = async (
  vaultRoot: string,
  options: PlanMigrationsOptions = {},
): Promise<MigrationPlanResult> => {
  const registry = options.registry ?? MIGRATION_REGISTRY;
  validateMigrationRegistry(registry);

  const currentVersion = await readVaultSchemaVersion(vaultRoot);
  const latestVersion = latestSchemaVersion(registry);

  if (currentVersion === latestVersion) {
    return { status: 'up-to-date', currentVersion, latestVersion, steps: [] };
  }
  if (currentVersion > latestVersion) {
    return { status: 'ahead-of-latest', currentVersion, latestVersion, steps: [] };
  }

  const context = { vaultRoot };
  const steps: MigrationPlanEntry[] = [];
  let manualStep: MigrationStepSummary | undefined;
  let version = currentVersion;

  while (version < latestVersion) {
    const step = stepForVersion(registry, version);
    if (!step) {
      return { status: 'gap', currentVersion, latestVersion, steps: [] };
    }

    const applicable = await step.detect(context);
    const plan = await step.plan(context);
    steps.push({ ...toSummary(step), applicable, plan, blocked: manualStep !== undefined });

    if (!manualStep && step.category === 'unsafe-manual' && applicable) {
      manualStep = toSummary(step);
    }

    version = step.to_version;
  }

  return {
    status: 'pending',
    currentVersion,
    latestVersion,
    steps,
    ...(manualStep ? { manualStep } : {}),
  };
};

/**
 * Validate a requested `--to` target version against the vault's current
 * version and the registry. Throws `MigrationTargetError` before any write.
 */
const assertValidTargetVersion = (
  targetVersion: number,
  startVersion: number,
  latestVersion: number,
  registry: readonly MigrationStep[],
): void => {
  if (!Number.isInteger(targetVersion) || targetVersion < 0) {
    throw new MigrationTargetError(
      `--to target must be a non-negative integer schema version, got ${targetVersion}.`,
    );
  }
  if (targetVersion > latestVersion) {
    throw new MigrationTargetError(
      `--to ${targetVersion} is beyond this package's latest schema version (${latestVersion}); ` +
        'nothing can migrate past the latest registered step.',
    );
  }
  if (targetVersion < startVersion) {
    throw new MigrationTargetError(
      `--to ${targetVersion} is below the vault's current schema version (${startVersion}); ` +
        'downgrades are not supported.',
    );
  }
  if (targetVersion > startVersion && !registry.some((step) => step.to_version === targetVersion)) {
    const boundaries = registry.map((step) => step.to_version).join(', ');
    throw new MigrationTargetError(
      `No registered migration step ends at version ${targetVersion}; ` +
        `valid stopping points are: ${boundaries}.`,
    );
  }
};

/**
 * Apply pending migrations in strictly ascending order.
 *
 * Stops and reports (never skips) at the first applicable unsafe/manual step.
 * The vault's `vault_schema_version` advances only after each step's writes
 * and the post-step validator succeed, keeping interrupted runs resumable.
 * When `targetVersion` is set, the run stops once that version is reached.
 */
export const applyMigrations = async (
  vaultRoot: string,
  options: ApplyMigrationsOptions = {},
): Promise<MigrationApplyResult> => {
  const registry = options.registry ?? MIGRATION_REGISTRY;
  validateMigrationRegistry(registry);

  const startVersion = await readVaultSchemaVersion(vaultRoot);
  const latestVersion = latestSchemaVersion(registry);

  if (startVersion > latestVersion) {
    return { status: 'ahead-of-latest', startVersion, finalVersion: startVersion, latestVersion, applied: [] };
  }

  if (options.targetVersion !== undefined) {
    assertValidTargetVersion(options.targetVersion, startVersion, latestVersion, registry);
  }
  const goalVersion = options.targetVersion ?? latestVersion;

  if (startVersion >= goalVersion) {
    return { status: 'up-to-date', startVersion, finalVersion: startVersion, latestVersion, applied: [] };
  }

  const context = { vaultRoot };
  const applied: MigrationStepSummary[] = [];
  let currentVersion = startVersion;

  while (currentVersion < goalVersion) {
    const step = stepForVersion(registry, currentVersion);
    if (!step) {
      return { status: 'gap', startVersion, finalVersion: currentVersion, latestVersion, applied };
    }

    const applicable = await step.detect(context);

    if (step.category === 'unsafe-manual' && applicable) {
      return {
        status: 'blocked-manual',
        startVersion,
        finalVersion: currentVersion,
        latestVersion,
        applied,
        manualStep: toSummary(step),
      };
    }

    if (applicable && step.apply) {
      try {
        await step.apply(context);
      } catch (error) {
        return {
          status: 'failed',
          startVersion,
          finalVersion: currentVersion,
          latestVersion,
          applied,
          failure: {
            stepId: step.id,
            reason: 'apply-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      if (options.validateAfterStep) {
        try {
          await options.validateAfterStep(step);
        } catch (error) {
          return {
            status: 'failed',
            startVersion,
            finalVersion: currentVersion,
            latestVersion,
            applied,
            failure: {
              stepId: step.id,
              reason: 'validation-failed',
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      }
    }

    await updateVaultConfig(vaultRoot, { vault_schema_version: step.to_version });
    currentVersion = step.to_version;
    applied.push(toSummary(step));
  }

  return { status: 'completed', startVersion, finalVersion: currentVersion, latestVersion, applied };
};
