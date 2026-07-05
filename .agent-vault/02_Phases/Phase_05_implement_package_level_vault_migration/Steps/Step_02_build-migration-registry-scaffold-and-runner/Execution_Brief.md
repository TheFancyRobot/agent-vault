# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: `src/core/migrations/` contains typed registry scaffolding plus a runner that can plan/apply fake `MigrationStep`s in order while the shipped registry remains empty.
- Why it matters: later steps must add real transforms without re-implementing ordering, gap, category, and resumability rules.
- Concrete starting points: create `src/core/migrations/types.ts`, `src/core/migrations/registry.ts`, and `src/core/migrations/runner.ts`; use `readVaultSchemaVersion` from STEP-05-01 and preserve config fields when advancing schema versions.
- Suggested runner shape: expose plan and apply functions that accept an optional registry argument for tests, derive latest package schema from the highest ordered `to_version`, and return structured results instead of only printing strings.
- Implementation constraints: validate registry continuity before running; a step is runnable only when `step.from_version === currentVersion`; unsafe/manual steps omit `apply()` and stop the run with a report.
- Non-goals: no `vault migrate` command, no `migrate-step-notes` wrapper, no real migration step, and no code-graph refresh yet.
- Recovery expectation: in fake apply tests, advance the schema version only after the fake step's write and post-step validator callback succeed; simulate interruption by throwing before the advance.

- Why: PR-2 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — the registry and runner that every later step builds on, shipped with no registered migration steps so the logic is fully testable against fixtures first.
- Prerequisites: STEP-05-01 landed (`readVaultSchemaVersion` helper exists).
- Starting files (all net-new; `src/core/migrations/` does not exist yet):
  - `src/core/migrations/types.ts` — `MigrationStep` interface: `id`, `from_version`, `to_version`, `category: 'safe-automatic' | 'safe-confirm' | 'unsafe-manual'`, `description`, `detect()`, `plan()`, optional `apply()` (unsafe/manual steps omit `apply()` per RFC "Migration Categories").
  - `src/core/migrations/registry.ts` — ordered list, empty to start. Registry shape decision from the checklist: one file per migration step under `src/core/migrations/steps/`, imported and ordered by `registry.ts`; append-only in practice.
  - `src/core/migrations/runner.ts` — resolves current version via STEP-05-01's helper, walks the registry strictly in ascending order, refuses gap-jumping, stops at the first unsafe/manual step (RFC "Safety Guarantees").
  - `test/core/migrations/runner.test.ts` — fixture `MigrationStep`s only, no real transforms.
- Execution checklist: types → empty registry → runner → fixture tests.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner|STEP-05-02 Build migration registry scaffold and runner]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-2: Migration registry scaffold + runner]]
