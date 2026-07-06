# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.
- `src/core/note-validators.ts` now exports `checkSchemaDrift(vaultRoot, packageSchemaVersion = latestSchemaVersion())` and includes its warning-only summary in `handleValidateAllCommand`.
- Drift behavior: behind vaults emit `SCHEMA_VERSION_BEHIND` pointing at `vault migrate`; ahead vaults emit `SCHEMA_VERSION_AHEAD` with package-upgrade wording and no downgrade suggestion; missing `.config.json` is schema version 0.
- Fresh `initVault()` stamps `vault_schema_version: latestSchemaVersion()` only for newly created vaults without a recorded version so fresh scaffolds stay validation-clean while existing unversioned vaults still surface drift.
- `src/templates/readme.ts` was updated intentionally so newly scaffolded vault READMEs list `vault migrate` alongside `vault migrate-step-notes`; this keeps generated docs aligned with top-level README release docs.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs|STEP-05-06 Add validate-all schema drift warning and release docs]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
