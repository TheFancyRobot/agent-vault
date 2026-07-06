# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Execution Findings - 2026-07-06

- `src/core/migrations/types.ts` exports `MigrationCategory`, `MigrationStepContext` (`vaultRoot` only, so steps cannot scan outside the vault), `MigrationStepPlan` (`summary` + `affectedPaths`), and `MigrationStep` with `detect()`, `plan()`, and optional `apply()`; real step authors need no test-only helpers.
- `src/core/migrations/registry.ts` ships `MIGRATION_REGISTRY` empty; `latestSchemaVersion()` derives the package schema version from the highest ordered `to_version` (0 when empty). `validateMigrationRegistry()` throws `MigrationRegistryError` on duplicate ids, non-contiguous or out-of-order chains, non-forward version ranges, unsafe-manual steps that define `apply()`, and safe steps that omit it.
- `src/core/migrations/runner.ts`: `planMigrations()` is strictly read-only (verified in tests: no `.config.json` is created); `applyMigrations()` walks the chain from the vault's current version, requires `step.from_version === currentVersion` (returns status `gap` otherwise), stops with `blocked-manual` at the first applicable unsafe-manual step, and advances `vault_schema_version` via `updateVaultConfig` (preserving other config fields) only after `apply()` and the optional `validateAfterStep` callback succeed.
- Design choice: when `detect()` returns false the runner skips `apply()` but still advances the version - the vault already conforms, so an inapplicable unsafe-manual step does not block progression (matches RFC intent: manual steps block only to protect unmigrated content).
- Failures return structured results (`failure.reason` is `apply-failed` or `validation-failed`) instead of throwing; only a malformed registry throws, since that is a maintainer error, not a vault-state error.
- `test/core/migrations/runner.test.ts` (26 tests) covers ascending order, gap refusal, malformed-registry fail-fast, unsafe-manual stop-and-report, interruption + resume (version not advanced past an incomplete step, completed steps not re-applied), validator-failure reporting, empty registry, ahead-of-latest, and config-field preservation.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner|STEP-05-02 Build migration registry scaffold and runner]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
