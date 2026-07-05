# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes; validator tests prove schema drift warns without changing validate-all error semantics; docs mention `vault migrate` as general entry point and `migrate-step-notes` as scoped alias.
- Prerequisites/dependencies: STEP-05-05 landed so docs describe a real apply command.
- Required reading completeness: RFC Validator Relationship and Maintainer Obligations, checklist PR-6, current README/CHANGELOG/template text.
- Manual checks: run `vault validate-all` or MCP `vault_validate` against a behind-version fixture and verify warning text points at `vault migrate`.
- Edge/failure modes: behind version warns; current version is silent; ahead-of-package warns as mismatch rather than suggesting downgrade; missing config is treated as version 0 and therefore warns only when registry latest is greater than 0.
- Security/performance: drift check reads only `.config.json` and registry metadata; it must not scan all project files beyond the existing validate-all note read.
- Integration/downstream: `vault-doctor` may fail on warnings by existing strict semantics; document only if user-facing behavior changes, but do not change doctor behavior in this step.
- Blockers/unresolved decisions: exact README wording is flexible; generated README template update is a decision to record, not a blocker.
- Junior readiness verdict: pass after tests and docs checks remove the ambiguity around missing config/current baseline.

- Commands: `npm test`; run `vault validate-all` (or the MCP `vault_validate` equivalent) against a behind-version fixture to see the warning end to end.
- Required tests in `test/core/note-validators.test.ts` (per checklist):
  - Drift warning fires when the vault's schema version is behind the package's.
  - Silent when the vault is current.
  - Silent when `.config.json` is absent — treated as version 0, matching the package's version-0 baseline, so absence alone must not warn on a fresh vault whose baseline is 0.
- Docs checks: README command table lists `vault migrate` with `migrate-step-notes` as the scoped alias; CHANGELOG entry names the schema version; generated-vault README template (`src/templates/readme.ts`) decision recorded.
- Edge cases: vault version ahead of package version (warn about mismatch rather than suggesting a downgrade), warning text points at `vault migrate` explicitly.
- Regression expectation: checklist risk rating low — additive warning; existing validator pass/fail semantics must not change.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs|STEP-05-06 Add validate-all schema drift warning and release docs]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
