# Implementation Notes

## Execution Findings - 2026-07-06

- Handler lives in `src/core/migrations/command.ts` (`handleMigrateCommand`), per the brief's preference for the migrations module over `note-generators.ts`. Dispatcher wiring: `'migrate': handleMigrateCommand` in `src/core/dispatcher.ts`.
- Catalog entry sits in the Mutate Notes group with usage `migrate [--dry-run] [--apply] [--to <version>]`; help text explicitly states `--apply`/`--to` are documented ahead of time and exit with an error before any write.
- The handler wraps every registry step's `detect`/`plan` in `withStepErrorContext` so a plan-phase failure reports `Migration step <id> failed during plan: <message>` and exits 1; stdout stays empty because rendering starts only after `planMigrations` resolves (no partial plan printed as success).
- Exit codes: 0 for `up-to-date` and `pending` plans; 1 for `ahead-of-latest`, registry `gap`, `--apply`/`--to`, unknown args, and detect/plan failures.
- Applicable-but-empty vs inapplicable steps are distinguished in output: `[N affected path(s)]` vs `[nothing detected]`; steps ordered after an applicable unsafe-manual step get `[blocked by manual step]` plus a `Manual action required:` line.
- Testability hook: `handleMigrateCommand(argv, environment, { registry })` accepts a fixture registry as a third parameter the dispatcher never passes.
- The no-writes guarantee is asserted in `test/core/migrations/command.test.ts` via recursive mtime snapshots plus `.config.json` absence after plan-mode, `--apply`, and `--to` runs.
- `planMigrations` (STEP-05-02) already models all statuses and manual blocking, so the command is a thin render layer over `MigrationPlanResult`; STEP-05-05 apply can reuse the same computation.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
