# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: `validate-all` emits a warning, not an error, when a vault's recorded schema version is behind the registry/package latest; README, generated README template decision, and CHANGELOG document the shipped migration workflow.
- Why it matters: users discover drift through validation, but existing validation pass/fail semantics remain stable.
- Concrete starting points: `src/core/note-validators.ts::handleValidateAllCommand` currently combines frontmatter, structure, required-links, and orphan summaries; add a separate schema-drift summary/check that uses `readVaultSchemaVersion` and the registry latest version. `writeSummary` already treats warnings as non-failing.
- Documentation anchors: README command table around the existing `migrate-step-notes` row; README migration workflow callout; `src/templates/readme.ts` lines around the generated command list; `CHANGELOG.md` top unreleased/current entry.
- Implementation constraints: warning text must explicitly point at `vault migrate`; do not promote drift to an error; do not require `.config.json` to exist unless the vault is actually behind the latest schema.
- Clarification: missing `.config.json` means current vault schema `0`; it is silent only when package/registry latest is also `0`. Once STEP-05-03 has made latest schema `1`, missing config should warn as behind unless the test deliberately injects a version-0 registry/baseline.
- Non-goals: no apply behavior changes, no dry-run verbose docs beyond noting it is deferred/not available, no config flag for strict drift enforcement.
- Handoff expectation: record in Implementation Notes whether `src/templates/readme.ts` was updated or intentionally left unchanged, with rationale.

- Why: PR-6 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — closes the loop so validation nudges users toward `vault migrate`, and release docs describe a shipped command rather than a planned one (which is why this step lands last even though it is technically independent of STEP-05-05).
- Prerequisites: STEP-05-05 landed.
- Starting files:
  - `src/core/note-validators.ts` — one additional check comparing `.config.json` `vault_schema_version` against the package's current schema version, emitted as a **warning not an error**, pointing at `vault migrate` (RFC "Validator Relationship").
  - `README.md` — update the command table and migration-workflow callout: `vault migrate` is the general entry point, `migrate-step-notes` stays documented as the scoped alias.
  - `src/templates/readme.ts` — the generated-vault README template also lists `migrate-step-notes` (line 84); the checklist names only `README.md`, so verify during execution whether the template needs the same update and record the decision in Implementation Notes.
  - `CHANGELOG.md` — entry naming the new schema version and summarizing what `vault migrate` does (RFC "Maintainer Obligations").
  - `test/core/note-validators.test.ts`.
- Deferred items stay deferred: no `--dry-run-verbose` diff view, no config flag promoting the drift warning to an error.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs|STEP-05-06 Add validate-all schema drift warning and release docs]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-6: validate-all schema-drift warning + docs/CHANGELOG]]
