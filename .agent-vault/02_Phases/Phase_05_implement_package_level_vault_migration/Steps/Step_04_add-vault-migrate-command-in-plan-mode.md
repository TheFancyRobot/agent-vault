---
note_type: step
template_version: 2
contract_version: 1
title: Add vault migrate command in plan mode
step_id: STEP-05-04
phase: '[[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]'
status: completed
owner: Claude Code
created: '2026-07-05'
updated: '2026-07-06'
depends_on:
  - '[[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_03_wrap-migrate-step-notes-as-registry-step-zero-to-one|STEP-05-03 Wrap migrate-step-notes as registry step zero to one]]'
related_sessions:
  - '[[05_Sessions/2026-07-06-141354-add-vault-migrate-command-in-plan-mode-claude-code|SESSION-2026-07-06-141354 Claude Code session for Add vault migrate command in plan mode]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-06-141354
active_session_id: 05_Sessions/2026-07-06-141354-add-vault-migrate-command-in-plan-mode-claude-code
context_status: completed
context_summary: Advance [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode|STEP-05-04 Add vault migrate command in plan mode]].
---

# Step 04 - Add vault migrate command in plan mode

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: `vault migrate` is registered in the command catalog and dispatcher in plan mode only — it reports the vault's schema version, the package's schema version, and the ordered pending steps with affected-path counts, performing zero writes (checklist PR-4).
- Parent phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]].

## Required Reading

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- [[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]] (PR-4 entry)
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] (vault migrate Command Contract)
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: Claude Code
- Last touched: 2026-07-06
- Next action: None - step complete. See [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_04_add-vault-migrate-command-in-plan-mode/Outcome|Outcome]]; STEP-05-05 implements `--apply`/`--to`.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-06 - [[05_Sessions/2026-07-06-141354-add-vault-migrate-command-in-plan-mode-claude-code|SESSION-2026-07-06-141354 Claude Code session for Add vault migrate command in plan mode]] - Session created.
<!-- AGENT-END:step-session-history -->
