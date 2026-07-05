# Execution Brief

## Refinement Details - 2026-07-05

- Exact outcome/success: the legacy step-note migration is implemented as registry step `0 -> 1` in `src/core/migrations/steps/0001-thin-step-notes.ts`; `migrate-step-notes` delegates to that step without changing its flags or output contract.
- Why it matters: this is the compatibility bridge from the existing one-off migration to the general schema registry and establishes schema version `1`.
- Concrete starting points: extract/wrap `isLegacyStepNoteContent` and the transform loop currently in `src/core/note-generators.ts::handleMigrateStepNotesCommand`; preserve calls to `scanProject` and `writeCodeGraph` for the standalone command's current behavior.
- Fixture requirement: add a before-shape fixture vault for legacy verbose step notes under the new migrations test area; include user-authored prose that must move into companion notes.
- Implementation constraints: category is safe/needs confirmation; detection must skip already-split notes via the existing `content.includes('## Companion Notes')` guard; `--phase` and `--step` filters keep working exactly as before.
- Non-goals: do not rewrite the transformation for style, do not weaken `test/core/note-generators.test.ts`, and do not advance schema version from the standalone scoped command unless the registry contract explicitly requires it and tests cover idempotency.
- Recovery expectation: if a companion write fails mid-note, the command must report failure rather than silently counting the note as migrated; re-running should skip already-completed notes and continue safely.

- Why: PR-3 of [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]] — the RFC's compatibility strategy makes the one migration that ships today (`migrate-step-notes`) the first real registry entry (`0 -> 1`) without changing its CLI surface.
- Migration category: **safe / needs confirmation** (the RFC's own example of this category). State the category in the PR description and ship a before-shape fixture vault snapshot, per RFC "Maintainer Obligations".
- Prerequisites: STEP-05-02 landed (registry/runner types exist).
- Starting files:
  - New `src/core/migrations/steps/0001-thin-step-notes.ts` — wraps the existing `isLegacyStepNoteContent` detection (`src/core/note-generators.ts:1329`) and the transform body inside `handleMigrateStepNotesCommand` (`src/core/note-generators.ts:1934`).
  - `src/core/note-generators.ts` — `handleMigrateStepNotesCommand` delegates to the registry step's `detect()`/`apply()` instead of inlining the logic; the standalone command's CLI surface (`--phase`, `--step` filters) stays unchanged.
  - New `test/core/migrations/steps/0001-thin-step-notes.test.ts` with a fixture vault snapshot of the legacy step-note shape.
- Hard constraint: `test/core/note-generators.test.ts` must keep passing **unmodified** — the RFC explicitly requires this command to "keep working unmodified", and the existing suite is the regression gate. Do not weaken or rewrite it to land faster.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_03_wrap-migrate-step-notes-as-registry-step-zero-to-one|STEP-05-03 Wrap migrate-step-notes as registry step zero to one]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- Checklist entry: [[01_Architecture/Package_Migration_Implementation_Checklist|PR-3: migrate-step-notes becomes registry step 0 -> 1]]
