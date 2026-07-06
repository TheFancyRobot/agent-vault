/**
 * Core types for the package-level vault migration system.
 *
 * Registry steps are authored one file per step under `src/core/migrations/steps/`
 * and imported in ascending version order by `src/core/migrations/registry.ts`.
 * See the Package Migration System RFC ("Migration Categories", "Safety
 * Guarantees") for the product contract these types encode.
 */

/**
 * Risk classification fixed at authoring time.
 *
 * - `safe-automatic`: purely additive or mechanically reversible; applied
 *   without extra confirmation.
 * - `safe-confirm`: content-changing but deterministic; plan output must show
 *   a per-note summary before apply.
 * - `unsafe-manual`: cannot be safely automated; MUST NOT define `apply()` and
 *   blocks automatic progression past its version.
 */
export type MigrationCategory = 'safe-automatic' | 'safe-confirm' | 'unsafe-manual';

/** Read-only context handed to every step hook. Steps must not touch paths outside `vaultRoot`. */
export interface MigrationStepContext {
  readonly vaultRoot: string;
}

/** Structured, read-only description of what a step would change. */
export interface MigrationStepPlan {
  /** One-line human-readable summary of the pending work. */
  readonly summary: string;
  /** Vault-relative paths the step would touch. May be empty when nothing applies. */
  readonly affectedPaths: readonly string[];
}

/**
 * One ordered vault schema migration.
 *
 * `detect()` and `plan()` are always read-only. `apply()` performs the writes
 * and is required for safe categories; unsafe/manual steps omit it and instead
 * point maintainers at written upgrade guidance via their description.
 */
export interface MigrationStep {
  /** Stable unique identifier, e.g. `0001-thin-step-notes`. */
  readonly id: string;
  /** Vault schema version this step upgrades from. Must match the vault's current version to run. */
  readonly from_version: number;
  /** Vault schema version recorded after this step completes. Must be greater than `from_version`. */
  readonly to_version: number;
  readonly category: MigrationCategory;
  /** One-line description used in plan output and manual-action reports. */
  readonly description: string;
  /** Whether this step has anything to migrate in the given vault. Read-only. */
  detect(context: MigrationStepContext): Promise<boolean>;
  /** Describe the pending changes without writing. Read-only. */
  plan(context: MigrationStepContext): Promise<MigrationStepPlan>;
  /** Perform the migration writes. Omitted for `unsafe-manual` steps. */
  apply?(context: MigrationStepContext): Promise<void>;
}
