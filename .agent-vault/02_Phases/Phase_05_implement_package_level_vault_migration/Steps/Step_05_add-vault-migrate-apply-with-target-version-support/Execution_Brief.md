# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: `vault migrate --apply` executes pending registry steps in order; `--apply --to <version>` stops at the requested intermediate version; schema version advances only after step writes and post-step validation succeed.
- Why it matters: this is the first general migration write path, so resumability and failure reporting are the acceptance bar.
- Concrete starting points: extend the STEP-05-04 command handler in `src/core/migrations/command.ts`; reuse runner logic from `src/core/migrations/runner.ts`; preserve config fields when writing `vault_schema_version`; call existing `handleValidateAllCommand`-equivalent logic or extracted validator helper after each apply step.
- Post-apply refresh: after successful apply, run the existing `scanProject(projectRoot)` + `writeCodeGraph(projectRoot, vaultRoot, scan.repoName)` path currently used by `handleMigrateStepNotesCommand`.
- Implementation constraints: stop and report at unsafe/manual steps; refuse downgrade `--to` targets; do not skip gaps; treat validator errors as migration failure tied to the specific step; surface validator warnings but do not treat warnings as errors unless using strict/doctor semantics.
- Non-goals: no new registry step, no `--dry-run-verbose`, no docs/CHANGELOG edits unless needed for tests.
- Step-splitting trigger: if apply execution, target-version parsing, validator extraction, and refresh wiring cannot be reviewed cleanly together, split the step before coding further and update the phase/step notes.
- Recovery expectation: an interrupted run must leave `vault_schema_version` at the last fully validated version; re-running resumes from the incomplete step and is idempotent after reaching current.

- Why: PR-5 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — the first real write path for the general command. Gate on the STEP-05-02/STEP-05-03 test suites already passing.
- Prerequisites: STEP-05-04 landed (command scaffold and plan mode exist).
- Starting files: extend the STEP-05-04 command handler; no new modules expected.
- Apply contract (RFC "Safety Guarantees" and command contract):
  - Run registry steps in order starting from the current version; stop and report (not skip) at the first unsafe/manual step.
  - Honor `--to <version>` for partial upgrades.
  - Write `vault_schema_version` only after a step's writes AND the post-step validator pass succeed — this is what makes interrupted applies resumable.
  - After every apply run, invoke the existing `validate-all` equivalent plus the existing `scanProject` + `writeCodeGraph` refresh (matching what `migrate-step-notes` already does today), and surface validator failure as a migration failure tied to the specific step, not a generic error.
- This is the phase's likeliest step-split candidate (flagged in the phase note); if apply execution and the `--to` handling grow too large together, split rather than land an omnibus change.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-5: vault migrate --apply and --apply --to]]
