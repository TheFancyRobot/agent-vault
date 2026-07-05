# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes and the new config tests prove missing/malformed/unset config reads as schema version `0` while valid `vault_schema_version` is preserved.
- Prerequisites/dependencies: none beyond a clean checkout; this is the phase's first step.
- Required reading completeness: phase note, RFC Failure Modes, checklist PR-1, and this companion note.
- Manual checks: inspect `.agent-vault/.config.json` fixtures created by tests to ensure resolver JSON is still pretty-written and preserved.
- Edge/failure modes: invalid JSON, empty JSON, `vault_schema_version: "1"`, negative numbers, `NaN`-like values, and resolver-only configs all return or preserve safe defaults without throwing.
- Security/performance: reads one small config file only; no project-wide scan and no filesystem writes in the helper.
- Integration/downstream: later runner/command code must call `readVaultSchemaVersion` rather than parsing `.config.json` itself.
- Blockers/unresolved decisions: none after adopting default-to-0 for malformed or non-numeric schema fields.
- Junior readiness verdict: pass once the above tests exist and `updateVaultConfig` preserves existing schema versions.

- Commands: `npm test` — the full existing suite must pass unmodified.
- New tests in `test/core/vault-config.test.ts`:
  - No config file present → helper returns `0`.
  - Config with existing unrelated fields only → helper returns `0`.
  - Config with `vault_schema_version` set → helper returns that value.
- Edge cases: malformed/non-numeric `vault_schema_version` value (treated per RFC Failure Modes), empty config file.
- Regression expectation: purely additive — no existing vault behavior is affected until a later step reads or writes the field for real. Checklist risk rating: none.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing|STEP-05-01 Add vault schema version plumbing]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
