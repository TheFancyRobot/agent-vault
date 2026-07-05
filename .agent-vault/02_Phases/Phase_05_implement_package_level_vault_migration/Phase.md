---
note_type: phase
template_version: 2
contract_version: 1
title: Implement package-level vault migration
phase_id: PHASE-05
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]]'
related_architecture:
  - '[[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]]'
  - '[[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
related_decisions:
  - '[[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 05 Implement package-level vault migration

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Ship the general `vault migrate` system defined by [[01_Architecture/Package_Migration_System|the package-level migration RFC]] by executing PR-1 through PR-6 from [[01_Architecture/Package_Migration_Implementation_Checklist|the implementation checklist]], in strict order.
- End state: any repository using Agent Vault can run `vault migrate` to see its schema-version gap and apply ordered, validated, resumable migration steps, with `migrate-step-notes` preserved as a compatibility wrapper.

## Why This Phase Exists

- PHASE-03 produced the design (RFC) and the execution plan (PR-sized checklist) but was explicitly planning-only; no migration framework code exists yet.
- Today only `migrate-step-notes` ships — a single targeted upgrade with no general schema-version contract, registry, or `vault migrate` command behind it.
- The checklist is ready to execute as written; this phase is the implementation phase it anticipated ("it is the plan PHASE-03's next implementation phase executes against").

## Scope

One step per checklist PR, executed in the checklist's strict rollout order:

- PR-1: vault schema version plumbing in `VaultConfig` plus a `readVaultSchemaVersion` helper (missing config treated as version 0).
- PR-2: migration registry scaffold, `MigrationStep` types, and an ordered runner with gap-jump refusal and stop-at-unsafe behavior, tested against fixture steps.
- PR-3: wrap the existing `migrate-step-notes` transform as registry step `0 -> 1`; existing tests must keep passing unmodified.
- PR-4: `vault migrate` command in plan mode only (versions, pending steps, affected-path counts, zero writes).
- PR-5: `vault migrate --apply` and `--apply --to <version>` with post-step validation and resumable schema-version advancement.
- PR-6: `validate-all` schema-drift warning plus README and CHANGELOG updates.

The checklist note is the source of truth for per-PR files, tests, categories, and risks; step notes route there rather than duplicating it.

## Non-Goals

- Do not resolve the deferred open items (`--dry-run-verbose` per-note diffs, config-promotable drift errors); they stay carried forward unless separately prioritized.
- Do not retrofit historical vault variants beyond what registry step `0 -> 1` already covers.
- Do not weaken or rewrite the existing `migrate-step-notes` regression suite to land PR-3 faster; it is the regression gate.
- Do not change note templates in this phase; any future template change carries its own registry-step obligation per the checklist's Constraints.

## Dependencies

- Linear ordering after [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]], but the actual design inputs come from PHASE-03: [[01_Architecture/Package_Migration_System|the RFC]] and [[01_Architecture/Package_Migration_Implementation_Checklist|the checklist]]. This phase does not consume PHASE-04 outputs and may be reordered ahead of it if priorities change.
- Step order is strict: PR-1 -> PR-2 -> PR-3 -> PR-4 -> PR-5 -> PR-6. Each step depends on the previous step's scaffolding as documented in the checklist's Rollout Order.

## Acceptance Criteria

- [x] Step notes exist for PR-1 through PR-6 and inherit scope from the checklist without re-deciding product behavior.
- [ ] Each landed step satisfies its checklist entry: named files touched, fixture-backed tests added, and the stated risk mitigations honored.
- [ ] The full existing test suite passes unmodified through PR-3, proving `migrate-step-notes` behavior is preserved.
- [ ] `vault migrate` plan mode performs zero writes; apply mode advances `vault_schema_version` only after a step's writes and post-step validation succeed, and re-running after completion is a no-op.
- [ ] `validate-all` warns (not errors) on schema drift and points at `vault migrate`.
- [ ] README and CHANGELOG document the new command, the schema version, and `migrate-step-notes` as the scoped alias.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]]
- [[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing|STEP-05-01 Add vault schema version plumbing]]
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner|STEP-05-02 Build migration registry scaffold and runner]]
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_03_wrap-migrate-step-notes-as-registry-step-zero-to-one|STEP-05-03 Wrap migrate-step-notes as registry step zero to one]]
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]]
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]
- [ ] [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs|STEP-05-06 Add validate-all schema drift warning and release docs]]
<!-- AGENT-END:phase-steps -->

## Notes

- The checklist ([[01_Architecture/Package_Migration_Implementation_Checklist|ARCH-0008]]) already names files, tests, categories, and risks per PR; step notes should route to it via Required Reading instead of copying its content.
- DEC-0002 applies as a standing constraint: none of PR-1 through PR-6 renames a generated block, and any future PR that does must update `vault_extract` selector expectations in the same change.
- Registry-step PRs (PR-3 here, and any future step) must state their migration category and ship a before-shape fixture vault snapshot, per the RFC's Maintainer Obligations.
- If a step proves too large during execution (PR-5 is the likeliest candidate), use the normal step-splitting workflow rather than growing one omnibus change.
### Refinement Addendum - 2026-07-05

Phase-wide execution map for junior-safe implementation:

- Shared workflow: implement PR-1 through PR-6 in strict order; do not start a step until all previous step tests are green. The registry's package-current schema version should be derived from the ordered registry/latest `to_version` (empty registry = version 0; after `0001-thin-step-notes` lands = version 1), not from npm package semver.
- Core code anchors verified during refinement: `src/core/vault-config.ts` (`VaultConfig`, `readVaultConfig`, `writeVaultConfig`, `updateVaultConfig`), `src/core/command-catalog.ts` (`AgentVaultCommandName`, `COMMANDS`), `src/core/dispatcher.ts` (`COMMAND_HANDLERS`, `handleVaultCommand`), `src/core/note-generators.ts` (`isLegacyStepNoteContent`, `handleMigrateStepNotesCommand`), `src/core/note-validators.ts` (`handleValidateAllCommand`, `writeSummary`), `src/scaffold/scan.ts` (`scanProject`), and `src/scaffold/code-graph.ts` (`writeCodeGraph`).
- Test anchors verified during refinement: `test/core/command-catalog.test.ts`, `test/core/note-generators.test.ts`, `test/core/note-validators.test.ts`, plus new `test/core/vault-config.test.ts` and `test/core/migrations/**` tests introduced by this phase.
- Safety defaults: plan mode is always read-only; apply mode advances `vault_schema_version` only after step writes and post-step validation succeed; warnings from validators may be surfaced, but validation errors block success.
- Security/performance posture: all filesystem mutations stay under the resolved `.agent-vault/` root; never touch arbitrary project files except the generated code graph artifacts explicitly refreshed after apply. Reuse one vault scan/listing pass where possible for plan output and detection; do not add a second full-vault walk unless a test demonstrates it is needed.
- Deferred/non-goal reminders: do not implement `--dry-run-verbose`, do not add a config flag promoting schema-drift warnings to errors, and do not change generated-block names or note templates in this phase.
