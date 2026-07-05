---
note_type: architecture
template_version: 2
contract_version: 1
title: Package-level migration system implementation checklist
architecture_id: ARCH-0008
status: active
owner: Pi
reviewed_on: '2026-07-05'
created: '2026-07-05'
updated: '2026-07-05'
related_notes:
  - '[[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[07_Templates/Note_Contracts|Note Contracts]]'
  - '[[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]'
tags:
  - agent-vault
  - architecture
  - checklist
---

# Package-Level Migration System Implementation Checklist

This note is the durable implementation checklist produced by [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]. It translates [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] into reviewable, PR-sized implementation tasks. It inherits every product decision from the RFC and does not re-argue them; where the RFC left a question open, that question is carried forward explicitly rather than silently resolved here.

**Scope note:** this checklist is planning only, matching [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03]] Non-Goals. No PR listed below has been implemented as part of this step.

## Purpose

- Give a maintainer a PR-by-PR execution order for building the `vault migrate` system defined by the RFC.
- Name concrete files/modules to add or change, tests to write, and rollout order so no PR requires re-deriving product behavior mid-implementation.
- Preserve the RFC's safety guarantees and maintainer obligations as explicit acceptance criteria per PR, not as background context to remember.

## Overview

- This checklist converts [[01_Architecture/Package_Migration_System|the package-level migration RFC]] into six PR-sized implementation tasks (PR-1 through PR-6), ordered so each PR is independently reviewable and no PR requires implementation decisions the RFC did not already make.
- The checklist also resolves the RFC's registry-shape open question and explicitly carries forward the two remaining open questions as deferred follow-ups (see Open Items Carried Forward).

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Registry module shape (RFC "Open Questions Left for Implementation"): this checklist sizes it as **one file per migration step** under `src/core/migrations/steps/`, plus one `src/core/migrations/registry.ts` that imports and orders them. Rationale: matches the RFC's "registry is append-only in practice" maintainer obligation — new steps are added as new files, never edited into an existing shared file, which makes accidental edits to shipped steps harder.
- `--dry-run-verbose` per-note diff view: deferred past PR-6 (first release). Tracked as a follow-up task, not blocking.
- Schema-version warning promotion to error via config flag: deferred, not part of this checklist's PRs. Left as a future decision per the RFC.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
### PR-1: Vault schema version plumbing (foundation, no behavior change)

- Files: `src/core/vault-config.ts` (extend `VaultConfig` interface with `vault_schema_version?: number`; default/missing treated as `0` per RFC "Failure Modes"), `test/core/vault-config.test.ts`.
- Work: add the field, add a `readVaultSchemaVersion(vaultRoot)` helper that returns `0` when absent, no other behavior changes.
- Tests: config with no file, config with existing unrelated fields, config with `vault_schema_version` set.
- Risk: none — purely additive, no existing vault is affected until a later PR reads/writes the field for real.

### PR-2: Migration registry scaffold + runner (no registered steps yet)

- Files: new `src/core/migrations/registry.ts` (ordered list, empty to start), new `src/core/migrations/types.ts` (`MigrationStep` interface: `id`, `from_version`, `to_version`, `category: 'safe-automatic' | 'safe-confirm' | 'unsafe-manual'`, `description`, `detect()`, `plan()`, optional `apply()` — unsafe/manual steps omit `apply()` per RFC "Migration Categories"), new `src/core/migrations/runner.ts` (resolves current version via PR-1's helper, walks registry strictly in ascending order, refuses gap-jumping, stops at the first unsafe/manual step per RFC "Safety Guarantees").
- Files: `test/core/migrations/runner.test.ts` using fixture `MigrationStep`s (fake steps, not real transforms yet).
- Tests: ascending order enforcement, refusal on `from_version` mismatch, stop-and-report behavior on an unsafe/manual step, resume-after-interruption behavior (schema version only advances after a step's writes+validation succeed).
- Risk: low — runner logic is fully testable against fake steps before any real transform is wired in.

### PR-3: `migrate-step-notes` becomes registry step `0 -> 1` (compatibility wrapper, RFC "Compatibility Strategy")

- Files: `src/core/migrations/steps/0001-thin-step-notes.ts` (wraps existing `isLegacyStepNoteContent` detection and the transform body currently inside `handleMigrateStepNotesCommand` in `src/core/note-generators.ts`), update `src/core/note-generators.ts::handleMigrateStepNotesCommand` to call the new registry step's `detect()`/`apply()` instead of inlining the logic, keep the standalone command's CLI surface (`--phase`, `--step` filters) unchanged.
- Files: `test/core/note-generators.test.ts` (existing tests must keep passing unmodified — this is the RFC's explicit constraint that this command "must keep working unmodified"), new `test/core/migrations/steps/0001-thin-step-notes.test.ts` with a fixture vault snapshot of the legacy step-note shape (RFC "Maintainer Obligations": every registry step PR needs a before-shape fixture).
- Category: safe/needs confirmation (per RFC "Migration Categories" — this is exactly the example given).
- Risk: medium — must not regress the one migration behavior that ships today; existing test suite is the regression gate.

### PR-4: `vault migrate` command (plan mode only, no `--apply` yet)

- Files: `src/core/command-catalog.ts` (add `'migrate'` to the command union and catalog entry, document `--apply`, `--to <version>`, `--dry-run` per RFC "`vault migrate` Command Contract"), `src/core/dispatcher.ts` (wire `migrate` to a new `handleMigrateCommand` in `src/core/note-generators.ts` or a new `src/core/migrations/command.ts`), plan-mode output: current vault schema version, package's current schema version, ordered list of steps that would run with one-line description + affected-path count, zero writes.
- Files: `test/core/command-catalog.test.ts` (new command entry), new test for plan-mode output shape and the "no writes" guarantee (e.g. assert no fs write calls / mtimes unchanged).
- Risk: low — read-only command; safe to ship ahead of apply behavior.

### PR-5: `vault migrate --apply` and `--apply --to <version>`

- Files: extend the PR-4 command handler with apply execution: run registry steps in order starting from current version, stop and report (not skip) on the first unsafe/manual step, honor `--to` for partial upgrades, write `vault_schema_version` only after a step's writes AND the post-step validator pass succeed (RFC "Safety Guarantees" — resumability requirement).
- Files: after every apply run, invoke the existing `validate-all` equivalent and the existing `scanProject` + `writeCodeGraph` refresh (RFC "`vault migrate` Command Contract" — matches what `migrate-step-notes` already does today), surfacing validator failure as a migration failure tied to the specific step, not a generic error.
- Tests: apply-from-zero end to end against the PR-3 fixture vault, interrupted-then-resumed apply (schema version not advanced past a step that didn't complete), validator-failure-after-apply is reported as failure not swallowed, `--to` stops at the requested intermediate version.
- Risk: medium-high — first real write path for the general command; gate behind the PR-2/PR-3 test suites already passing.

### PR-6: `validate-all` schema-drift warning + docs/CHANGELOG follow-up

- Files: `src/core/note-validators.ts` (add one additional check comparing `.config.json` `vault_schema_version` against the package's current schema version, emitted as a warning not an error, pointing at `vault migrate` per RFC "Validator Relationship"), `README.md` (update the command table and "migration workflow" callout to point at `vault migrate` as the general entry point while keeping `migrate-step-notes` documented as the scoped alias, per RFC "Compatibility Strategy"), `CHANGELOG.md` (entry naming the new schema version and summarizing what `vault migrate` does, per RFC "Maintainer Obligations").
- Tests: `test/core/note-validators.test.ts` — drift warning fires when behind, silent when current, silent when `.config.json` absent (treated as version 0, matching whatever the package's version 0 baseline is).
- Risk: low — additive warning, no behavior change to existing pass/fail validator semantics.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Every PR that adds or changes a registry step must state its migration category (safe/automatic, safe/needs confirmation, unsafe/manual) in the PR description and include a "before" fixture vault snapshot, per RFC "Maintainer Obligations".
- No PR may delete user-authored prose sections; steps that move prose relocate it into a companion note (already true of PR-3's wrapped behavior).
- Any PR in this checklist that changes a note template's required fields/headings/generated-block names must ship its own registry step in the same PR or explicitly justify why no existing vault is affected — this checklist's PRs do not change any note template, so this obligation is inherited forward for future work, not discharged here.
- Any generated-block rename must update `vault_extract` selector expectations in the same change (DEC-0002), so targeted extraction never silently serves stale blocks. None of PR-1 through PR-6 renames a generated block; flag this explicitly if a future PR does.
- This checklist is planning only; no PR listed here has been implemented as part of this step, per PHASE-03 Non-Goals.

## Test Expectations Summary

- Unit tests per PR as listed above; no PR ships without its own fixture-backed test file.
- Regression gate: the full existing suite (`note-generators.test.ts`, `command-catalog.test.ts`, `dispatcher.test.ts`, `note-validators.test.ts`) must keep passing unmodified through PR-3, since that PR is a refactor of working logic, not a behavior change.
- Idempotency: re-running `vault migrate --apply` after a completed apply should be a no-op (already-current vault), and after an interrupted apply should resume rather than re-apply — both need explicit tests in PR-5.
- Ambiguity handling: `detect()` for PR-3's step must skip notes that already match the target shape (existing `content.includes('## Companion Notes')` early-out) — carry this test forward unmodified.

## Rollout Order and Dependencies

- Strict order: PR-1 -> PR-2 -> PR-3 -> PR-4 -> PR-5 -> PR-6. PR-2 depends on PR-1's version helper; PR-3 depends on PR-2's registry/runner types; PR-4 depends on PR-3 existing as the first real registry entry (otherwise plan mode has nothing to show); PR-5 depends on PR-4's command scaffold; PR-6 is independent of PR-5 in principle but ships last so docs describe a shipped command rather than a planned one.
- Each PR should be reviewable and mergeable independently; PR-1 and PR-2 change no user-visible behavior and can land well ahead of PR-3.
- This checklist does not authorize starting implementation; it is the plan PHASE-03's next implementation phase executes against.

## Open Items Carried Forward (not resolved by this checklist)

- `--dry-run-verbose` per-note diff view beyond summary counts (RFC open question) — candidate for a PR-7 if requested after first release.
- Whether the schema-drift warning should be promotable to an error via a config flag (RFC open question) — future decision, not scheduled here.
- Exact CLI help text wording for `README.md` updates in PR-6 is left to that PR's author rather than drafted here.

## Failure Modes

- A PR lands out of order (e.g., PR-4 before PR-3) — the plan-mode command would have no real registry entry to show; treat this as a blocked PR, not a reason to stub a fake entry.
- A future note-template change ships without updating this checklist or the RFC's Maintainer Obligations — the corresponding registry step is missing, and `vault migrate` silently under-migrates; the fix is to add the missing registry step, not to skip the check.
- The regression suite guarding PR-3 (existing `migrate-step-notes` tests) is weakened or skipped to make the refactor land faster — this defeats the RFC's explicit "must keep working unmodified" constraint and should block the PR.
- A registry step's `apply()` is added to what should be an unsafe/manual step under time pressure — this violates the RFC's Safety Guarantees and must be caught in review, not discovered after a user's vault is silently mutated.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/Code_Map|Code Map]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]
<!-- AGENT-END:architecture-related-notes -->
