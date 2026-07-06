---
note_type: step
template_version: 2
contract_version: 1
title: Add vault migrate apply with target version support
step_id: STEP-05-05
phase: '[[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]'
status: completed
owner: Claude Code
created: '2026-07-05'
updated: '2026-07-06'
depends_on:
  - '[[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]]'
related_sessions:
  - '[[05_Sessions/2026-07-06-142735-add-vault-migrate-apply-with-target-version-support-claude-code|SESSION-2026-07-06-142735 Claude Code session for Add vault migrate apply with target version support]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-06-142735
active_session_id: 05_Sessions/2026-07-06-142735-add-vault-migrate-apply-with-target-version-support-claude-code
context_status: completed
context_summary: Advance [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]].
---

# Step 05 - Add vault migrate apply with target version support

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: `vault migrate --apply` (and `--apply --to <version>`) executes registry steps in order with stop-and-report at unsafe/manual steps, advances `vault_schema_version` only after each step's writes and post-step validation succeed, and runs the validate + code-graph refresh after every apply (checklist PR-5).
- Parent phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]].

## Required Reading

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- [[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]] (PR-5 entry)
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] (Safety Guarantees, Command Contract)
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: Claude Code
- Last touched: 2026-07-06
- Next action: None. `vault migrate --apply` and `--apply --to <version>` shipped with tests; see [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support/Outcome|Outcome]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-06 - [[05_Sessions/2026-07-06-142735-add-vault-migrate-apply-with-target-version-support-claude-code|SESSION-2026-07-06-142735 Claude Code session for Add vault migrate apply with target version support]] - Session created.
<!-- AGENT-END:step-session-history -->
