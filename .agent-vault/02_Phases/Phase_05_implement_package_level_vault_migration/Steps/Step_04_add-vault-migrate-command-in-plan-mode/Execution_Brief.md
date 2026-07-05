# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: `vault migrate` is discoverable in help/catalog and dispatcher, defaults to read-only plan mode, and prints current vault schema version, package/latest schema version, and pending registry steps with descriptions and affected-path counts.
- Why it matters: users can inspect migration impact before any write path exists; this de-risks STEP-05-05.
- Concrete starting points: add `migrate` to `AgentVaultCommandName` and `COMMANDS` in `src/core/command-catalog.ts`; wire `COMMAND_HANDLERS` in `src/core/dispatcher.ts`; prefer a new `src/core/migrations/command.ts` handler over adding more code to `note-generators.ts`.
- Output source: derive latest package schema from the registry (latest `to_version`), read current version through `readVaultSchemaVersion`, and use each step's `detect()`/`plan()` to compute affected path counts.
- Implementation constraints: no filesystem writes in default/`--dry-run` mode; document `--apply` and `--to` in help but return a clear not-yet-implemented message until STEP-05-05.
- Non-goals: no apply execution, no schema-version writes, no validator invocation except whatever read-only detection requires.
- Recovery expectation: if a detect/plan function fails, report the failing step id and exit non-zero; do not print a partial plan as success.

- Why: PR-4 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — the general `vault migrate` command lands read-only first, so the user-facing surface ships ahead of any write path.
- Prerequisites: STEP-05-03 landed (the registry has its first real entry; otherwise plan mode has nothing to show — the checklist explicitly forbids stubbing a fake entry to work around ordering).
- Starting files:
  - `src/core/command-catalog.ts` — add `'migrate'` to the command union and a catalog entry documenting `--apply`, `--to <version>`, and `--dry-run` per the RFC command contract (flags documented now, implemented in STEP-05-05).
  - `src/core/dispatcher.ts` — wire `migrate` to a new `handleMigrateCommand` (in `src/core/note-generators.ts` or a new `src/core/migrations/command.ts`; prefer the migrations module to keep note-generators from growing).
  - Tests: `test/core/command-catalog.test.ts` plus a new plan-mode test.
- Plan-mode output contract: current vault schema version, the package's current schema version, and the ordered list of steps that would run with a one-line description and affected-path count each. Zero writes.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-4: vault migrate command (plan mode only)]]
