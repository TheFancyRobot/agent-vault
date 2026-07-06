# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Execution Findings - 2026-07-05

- Chosen malformed/non-numeric handling (later steps must rely on these exact semantics):
  - A stored `vault_schema_version` is valid only if it is a JSON number that is a finite non-negative integer (`typeof value === 'number' && Number.isInteger(value) && value >= 0`, implemented as `parseSchemaVersion` in `src/core/vault-config.ts`).
  - Invalid values (`"1"`, `-1`, `1.5`, `null`, `true`, NaN/Infinity), a missing field, an empty/malformed config file, or a missing config file all read as version `0`. `readVaultConfig` omits the field entirely in these cases; `readVaultSchemaVersion` returns `config.vault_schema_version ?? 0`.
  - Reads never write: no rewrite/repair of `.config.json` happens during `readVaultConfig` or `readVaultSchemaVersion`.
- `updateVaultConfig` semantics: a resolver-only update preserves an existing valid `vault_schema_version`; `updates.vault_schema_version` is accepted only when it passes `parseSchemaVersion`, otherwise the current value (or absence) is kept. Config remains pretty-printed 2-space JSON with a trailing newline via `writeVaultConfig`.
- Tests live in `test/core/vault-config.test.ts` (18 tests, mkdtemp temp-vault harness matching `test/core/code-graph-lookup.test.ts` style).

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing|STEP-05-01 Add vault schema version plumbing]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
