# Outcome

- Record the final result, validation performed, and explicit follow-up here.

## Final Result - 2026-07-06

- `vault migrate --apply` executes pending registry steps strictly in order, runs the full validate-all suite after each step's writes, advances `vault_schema_version` only after writes and validation succeed, stops and reports at applicable unsafe/manual steps, and ends every version-advancing run with the `scanProject` + `writeCodeGraph` refresh.
- `vault migrate --apply --to <version>` stops at the requested intermediate version; downgrades, versions past the package latest, and non-boundary targets are refused before any write. `--to` requires `--apply`.
- Interrupted applies resume: re-running `--apply` continues from the incomplete step and is a no-op on an already-current vault. Unrelated config fields (`resolver`) are preserved when the schema version advances.
- Command catalog `migrate` entry updated: "not implemented yet" notes replaced with the implemented apply/`--to` contract, new `--apply` examples, and the resumability guarantee.

## Validation Evidence

- `npx vitest run test/core/migrations`: 3 files, 61 tests passed (runner `--to` suite; command apply suite covering apply-from-zero e2e with the shipped 0001-thin-step-notes step, interrupt-then-resume, default-validator failure tied to the failing step, warning surfacing, `--to` stop/downgrade/beyond-latest refusals, unsafe-manual stop, idempotent re-run, resolver preservation).
- `npm test`: 290 passed; 9 pre-existing environment failures in pi-extension tests (missing optional peer dep `@mariozechner/pi-ai`), untouched by this step.
- `npm run typecheck`: clean.

## Follow-Up

- None required for this step. STEP-05-06 (validator warning for stale schema versions) builds directly on `latestSchemaVersion()` / `readVaultSchemaVersion()`, both unchanged.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
