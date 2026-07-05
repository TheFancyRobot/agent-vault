# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes; help/catalog tests include `migrate`; plan-mode tests show versions, ordered pending steps, descriptions, and affected counts with zero writes.
- Prerequisites/dependencies: STEP-05-03 real registry step landed and green.
- Required reading completeness: RFC Command Contract, checklist PR-4, command catalog/dispatcher tests.
- Manual checks: run or inspect `vault help migrate` output to ensure flags are discoverable and not misleading about apply being available in this step.
- Edge/failure modes: already-current vault prints no pending steps; vault version above package latest reports mismatch; missing `.config.json` reads as version 0; unsupported `--apply` exits clearly without writes.
- Security/performance: tests should assert no `writeFile`, `mkdir`, `writeVaultConfig`, or mtime changes during plan mode; plan detection should avoid duplicate full-vault scans where possible.
- Integration/downstream: STEP-05 extends this same handler; keep output structured enough that apply can reuse plan computation.
- Blockers/unresolved decisions: none; CLI wording can be adjusted in STEP-06 docs after apply ships.
- Junior readiness verdict: pass when read-only behavior is proven by tests, not just code inspection.

- Commands: `npm test`.
- Required tests:
  - `test/core/command-catalog.test.ts` covers the new `migrate` catalog entry.
  - Plan-mode output shape: versions shown, pending steps listed in order with description and affected-path count.
  - The "no writes" guarantee: assert no filesystem write calls occur (or that vault file mtimes are unchanged) across a plan-mode run.
- Edge cases: vault already at the current schema version (plan reports nothing to do), vault with a version above the package's (plan reports the mismatch instead of inventing steps), missing `.config.json` (treated as version 0 via STEP-05-01's helper).
- Regression expectation: checklist risk rating low — a read-only command, safe to ship ahead of apply behavior.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
