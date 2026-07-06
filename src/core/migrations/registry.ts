import type { MigrationStep } from './types';

/**
 * Ordered vault schema migration registry.
 *
 * Registry shape (implementation checklist "Key Components"): one file per
 * migration step under `src/core/migrations/steps/`, imported here and listed
 * in ascending version order. The registry is append-only in practice — new
 * steps are added as new files; shipped steps are never edited in place.
 *
 * Intentionally empty until the first real step (registry step `0 -> 1`,
 * wrapping `migrate-step-notes`) lands.
 */
export const MIGRATION_REGISTRY: readonly MigrationStep[] = [];

/**
 * The package's latest vault schema version, derived from the highest ordered
 * `to_version` in the registry. An empty registry means version `0`.
 */
export const latestSchemaVersion = (registry: readonly MigrationStep[] = MIGRATION_REGISTRY): number =>
  registry.length === 0 ? 0 : registry[registry.length - 1].to_version;

/** Thrown when the registry itself is malformed. Always a maintainer error, never a vault-state error. */
export class MigrationRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationRegistryError';
  }
}

/**
 * Fail fast on malformed registries before any step runs.
 *
 * Enforces, in order:
 * - unique step ids (no duplicates),
 * - each step upgrades forward (`to_version > from_version`),
 * - strictly ascending, contiguous ordering (each step's `from_version` equals
 *   the previous step's `to_version` — no gaps, no reordering, no duplicates),
 * - category/apply consistency (`unsafe-manual` steps MUST NOT define
 *   `apply()`; safe steps MUST define it).
 */
export const validateMigrationRegistry = (registry: readonly MigrationStep[]): void => {
  const seenIds = new Set<string>();
  let previous: MigrationStep | undefined;

  for (const step of registry) {
    if (seenIds.has(step.id)) {
      throw new MigrationRegistryError(`Duplicate migration step id: ${step.id}`);
    }
    seenIds.add(step.id);

    if (!Number.isInteger(step.from_version) || !Number.isInteger(step.to_version) || step.from_version < 0) {
      throw new MigrationRegistryError(
        `Migration step ${step.id} has non-integer or negative versions (${step.from_version} -> ${step.to_version})`,
      );
    }

    if (step.to_version <= step.from_version) {
      throw new MigrationRegistryError(
        `Migration step ${step.id} must upgrade forward, got ${step.from_version} -> ${step.to_version}`,
      );
    }

    if (previous && step.from_version !== previous.to_version) {
      throw new MigrationRegistryError(
        `Migration registry is not contiguous: step ${step.id} starts at version ${step.from_version} ` +
          `but the previous step ${previous.id} ends at version ${previous.to_version}`,
      );
    }

    if (step.category === 'unsafe-manual' && step.apply !== undefined) {
      throw new MigrationRegistryError(
        `Migration step ${step.id} is unsafe-manual and must not define apply()`,
      );
    }

    if (step.category !== 'unsafe-manual' && step.apply === undefined) {
      throw new MigrationRegistryError(
        `Migration step ${step.id} is ${step.category} and must define apply()`,
      );
    }

    previous = step;
  }
};
