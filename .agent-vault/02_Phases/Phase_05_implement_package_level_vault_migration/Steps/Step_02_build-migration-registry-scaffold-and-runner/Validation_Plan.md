# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes with `test/core/migrations/runner.test.ts` covering planning, ordering, gap refusal, unsafe/manual stop, and resumable version advancement using fixture steps.
- Prerequisites/dependencies: STEP-05-01 must be landed and green; do not copy config parsing into the runner.
- Required reading completeness: phase note, RFC Migration Categories and Safety Guarantees, checklist PR-2.
- Manual checks: inspect exported types to ensure real step authors can implement `detect()`, `plan()`, and optional `apply()` without importing test-only helpers.
- Edge/failure modes: empty registry reports already-current; current version above latest reports mismatch instead of applying; duplicate/non-contiguous registry entries fail fast; unsafe/manual blocks later steps.
- Security/performance: runner must not scan outside `vaultRoot`; plan should be able to reuse a caller-provided note/file list later to avoid repeated full-vault scans.
- Integration/downstream: STEP-03 will import `MigrationStep`; STEP-04/05 will consume structured plan/apply results for CLI output.
- Blockers/unresolved decisions: none; registry shape is one file per step under `src/core/migrations/steps/` as settled by the checklist.
- Junior readiness verdict: pass after fake-step tests demonstrate all safety rules without real vault mutations.

- Commands: `npm test` — existing suite plus new `test/core/migrations/runner.test.ts`.
- Required runner tests (against fixture steps, per checklist):
  - Ascending-order enforcement across registered steps.
  - Refusal when a step's `from_version` does not match the current version (gap-jump rejection).
  - Stop-and-report (not skip) at the first unsafe/manual step.
  - Resume-after-interruption: schema version only advances after a step's writes and validation succeed.
- Edge cases: empty registry (runner is a no-op that reports "already current"), current version above all registered steps.
- Regression expectation: no user-visible behavior change; checklist risk rating low — runner logic proven against fakes before any real transform is wired in.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner|STEP-05-02 Build migration registry scaffold and runner]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
