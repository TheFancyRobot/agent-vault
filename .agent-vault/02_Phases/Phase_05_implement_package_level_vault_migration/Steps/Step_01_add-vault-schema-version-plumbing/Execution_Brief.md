# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: `VaultConfig` accepts `vault_schema_version?: number`; `readVaultSchemaVersion(vaultRoot)` is exported and returns a finite integer schema version, defaulting to `0` for missing config, missing field, malformed JSON, empty config, or non-numeric field values.
- Why it matters: every later registry/command step needs a stable current-version read path; this step deliberately does not introduce migration behavior yet.
- Concrete starting points: begin in `src/core/vault-config.ts` around `VaultConfig`, `DEFAULT_CONFIG`, `readVaultConfig`, `writeVaultConfig`, and `updateVaultConfig`; add `test/core/vault-config.test.ts` modeled after the small harness style in existing `test/core/*.test.ts` files.
- Implementation constraints: preserve the existing resolver behavior exactly. When `updateVaultConfig` updates `resolver`, it must not accidentally drop an existing `vault_schema_version`; if `updates.vault_schema_version` is provided, only accept a finite non-negative integer, otherwise keep the current version.
- Non-goals: no command-catalog changes, no registry module, no writes of a schema version during normal config reads, and no schema-drift warning.
- Handoff expectation: record the chosen malformed/non-numeric handling in Implementation Notes because later tests rely on the same default-to-0 semantics.

- Why: PR-1 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — foundation for the migration registry. Nothing reads the schema version until STEP-05-02, so this lands with zero behavior change.
- Prerequisites: none; first step of the phase.
- Starting files: `src/core/vault-config.ts` (`VaultConfig` interface at line 12 — no `vault_schema_version` field exists yet), new `test/core/vault-config.test.ts`.
- Execution checklist:
  1. Add optional `vault_schema_version?: number` to `VaultConfig`.
  2. Add and export a `readVaultSchemaVersion(vaultRoot)` helper that returns `0` when the config file or field is absent (RFC "Failure Modes": default/missing treated as `0`).
  3. No other behavior changes — no caller wiring, no writes to the field.
- Non-numeric or malformed field values: follow the RFC Failure Modes posture (treat as version `0`); record the exact choice in [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing/Implementation_Notes|Implementation Notes]].

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing|STEP-05-01 Add vault schema version plumbing]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-1: Vault schema version plumbing]]
