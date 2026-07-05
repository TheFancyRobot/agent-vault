# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes; apply tests cover success, interruption/resume, validator failure, `--to`, unsafe/manual stop, and idempotent already-current reruns.
- Prerequisites/dependencies: STEP-05-04 command scaffold and plan-mode tests must be green; STEP-05-02/03 runner and fixture tests are the safety net.
- Required reading completeness: RFC Safety Guarantees and Command Contract, checklist PR-5, existing `migrate-step-notes` code-graph refresh test.
- Manual checks: inspect temp fixture vaults after apply to confirm `.config.json` contains the expected `vault_schema_version` and still preserves `resolver`.
- Edge/failure modes: `--to` below current refuses; `--to` beyond latest refuses or caps with an explicit message (choose one and test it); unsafe/manual step blocks later steps; validation failure after writes does not advance the version.
- Security/performance: writes only under `vaultRoot` plus generated code-graph artifacts; no unbounded project rewrite; reuse plan computation before apply to avoid duplicate scans when possible.
- Integration/downstream: STEP-06 validator warning depends on a reliable package-latest schema version and the same config helper semantics.
- Blockers/unresolved decisions: no product blockers; split this step if review size becomes unsafe.
- Junior readiness verdict: pass only after destructive/write-path behavior is fixture-tested, including failure cases.

- Commands: `npm test`.
- Required tests (per checklist):
  - Apply-from-zero end to end against the STEP-05-03 fixture vault.
  - Interrupted-then-resumed apply: schema version is not advanced past a step that did not complete, and a re-run resumes from the incomplete step.
  - Validator failure after a step's writes is reported as a migration failure tied to that step, not swallowed.
  - `--to` stops at the requested intermediate version.
  - Idempotency: re-running `vault migrate --apply` on an already-current vault is a no-op.
- Edge cases: `--to` pointing at a version below the current one (refuse, do not downgrade), `--to` pointing past the latest registered step, unsafe/manual step encountered mid-run (stop and report, later steps untouched).
- Regression expectation: checklist risk rating medium-high — first real write path; the STEP-05-02 runner suite and STEP-05-03 fixture suite are the safety net and must be green before this step starts.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
