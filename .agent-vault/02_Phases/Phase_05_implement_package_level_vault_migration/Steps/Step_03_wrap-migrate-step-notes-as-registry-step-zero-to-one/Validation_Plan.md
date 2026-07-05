# Validation Plan

## Readiness Checklist - 2026-07-05

- Outcome/pass condition: `npm test` passes; existing `test/core/note-generators.test.ts` is unchanged and green; new `0001-thin-step-notes` tests prove behavior parity.
- Prerequisites/dependencies: STEP-05-02 registry/runner landed and green.
- Required reading completeness: RFC Compatibility Strategy and Maintainer Obligations, checklist PR-3, existing note-generator migration tests.
- Manual checks: diff the refactor to confirm the CLI parser and filter behavior for `migrate-step-notes --phase` / `--step` did not change.
- Edge/failure modes: already-migrated vault is no-op, mixed legacy/migrated vault transforms only legacy notes, user prose lands in companion notes, and code graph refresh remains covered.
- Security/performance: restrict file traversal to `02_Phases/*/Steps/*.md` under `vaultRoot`; avoid reading unrelated project files except the existing code-graph refresh.
- Integration/downstream: STEP-04 depends on this real registry entry for plan-mode output; do not stub a fake entry.
- Blockers/unresolved decisions: none if standalone command behavior stays byte-for-byte compatible at the test-contract level.
- Junior readiness verdict: pass after fixture tests and unchanged legacy regression tests are green.

- Commands: `npm test` — the checklist's regression gate is that `test/core/note-generators.test.ts` passes **unmodified**; treat any needed edit to that file as a red flag, not a fix.
- New tests in `test/core/migrations/steps/0001-thin-step-notes.test.ts`:
  - `apply()` on the before-shape fixture vault produces the thin-index + companion-notes shape.
  - `detect()` skips notes that already match the target shape — carry forward the existing `content.includes('## Companion Notes')` early-out behavior unmodified.
  - The wrapped command path (`migrate-step-notes` with `--phase`/`--step` filters) produces identical results to the pre-refactor behavior.
- Edge cases: already-migrated vault (no-op), mixed vault with some legacy and some migrated step notes, notes containing user-authored prose (must be relocated to companion notes, never deleted).
- Regression expectation: checklist risk rating medium — this refactors the one migration behavior that ships today; behavior parity is the acceptance bar.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_03_wrap-migrate-step-notes-as-registry-step-zero-to-one|STEP-05-03 Wrap migrate-step-notes as registry step zero to one]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
