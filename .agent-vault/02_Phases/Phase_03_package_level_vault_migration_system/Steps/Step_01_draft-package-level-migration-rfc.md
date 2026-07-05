---
note_type: step
template_version: 2
contract_version: 1
title: Draft package-level migration RFC
step_id: STEP-03-01
phase: '[[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]'
status: completed
owner: ''
created: '2026-04-26'
updated: '2026-07-05'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-07-05-201558-draft-package-level-migration-rfc-claude|SESSION-2026-07-05-201558 Claude session for Draft package-level migration RFC]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-05-201558
active_session_id: 05_Sessions/2026-07-05-201558-draft-package-level-migration-rfc-claude
context_status: completed
context_summary: Advance [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]].
---

# Step 01 - Draft package-level migration RFC

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Produce a durable RFC for the Agent Vault package describing a package-level migration system that applies across all repositories using Agent Vault.
- Parent phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]].

## Required Reading

- [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Validation_Plan|Validation Plan]]
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] (produced by this step)

## Companion Notes

- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: 
- Last touched: 2026-07-05
- Next action: None. RFC is drafted at [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]]; STEP-03-02 can begin.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Keep the RFC package-level. Do not let the document collapse into a plan for this repository only.
- The RFC should define behavior and maintainer obligations clearly enough that later implementation can be reviewed against it.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-05 - [[05_Sessions/2026-07-05-201558-draft-package-level-migration-rfc-claude|SESSION-2026-07-05-201558 Claude session for Draft package-level migration RFC]] - Session created.
<!-- AGENT-END:step-session-history -->
