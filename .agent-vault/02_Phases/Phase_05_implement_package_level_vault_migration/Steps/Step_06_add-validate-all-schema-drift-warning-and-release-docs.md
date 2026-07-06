---
note_type: step
template_version: 2
contract_version: 1
title: Add validate-all schema drift warning and release docs
step_id: STEP-05-06
phase: '[[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]'
status: completed
owner: claude-worker
created: '2026-07-05'
updated: '2026-07-06'
depends_on:
  - '[[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]'
related_sessions:
  - '[[05_Sessions/2026-07-06-144335-add-validate-all-schema-drift-warning-and-release-docs-claude-worker|SESSION-2026-07-06-144335 claude-worker session for Add validate-all schema drift warning and release docs]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-06-144335
active_session_id: 05_Sessions/2026-07-06-144335-add-validate-all-schema-drift-warning-and-release-docs-claude-worker
context_status: completed
context_summary: 'Completed STEP-05-06: validate-all schema drift warning, migrate docs/CHANGELOG updates, fresh-init schema stamping, and repo vault schema stamp to version 1 after validation.'
---

# Step 06 - Add validate-all schema drift warning and release docs

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: `validate-all` warns (never errors) when the vault's schema version is behind the package's, pointing at `vault migrate`; README documents `vault migrate` as the general entry point with `migrate-step-notes` as the scoped alias; CHANGELOG names the new schema version (checklist PR-6).
- Parent phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]].

## Required Reading

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- [[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]] (PR-6 entry)
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] (Validator Relationship, Maintainer Obligations)
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_06_add-validate-all-schema-drift-warning-and-release-docs/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-worker / pi follow-up
- Last touched: 2026-07-06
- Next action: None; PHASE-05 is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-06 - [[05_Sessions/2026-07-06-144335-add-validate-all-schema-drift-warning-and-release-docs-claude-worker|SESSION-2026-07-06-144335 claude-worker session for Add validate-all schema drift warning and release docs]] - Session created.
<!-- AGENT-END:step-session-history -->
