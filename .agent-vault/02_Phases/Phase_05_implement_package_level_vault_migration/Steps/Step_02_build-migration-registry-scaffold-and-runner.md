---
note_type: step
template_version: 2
contract_version: 1
title: Build migration registry scaffold and runner
step_id: STEP-05-02
phase: '[[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]'
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_01_add-vault-schema-version-plumbing|STEP-05-01 Add vault schema version plumbing]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Build migration registry scaffold and runner

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: `src/core/migrations/` exists with `MigrationStep` types, an empty ordered registry, and a runner that enforces ascending order, refuses gap-jumping, and stops at unsafe/manual steps — fully tested against fixture steps, no real transforms yet (checklist PR-2).
- Parent phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]].

## Required Reading

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
- [[01_Architecture/Package_Migration_Implementation_Checklist|Package-level migration system implementation checklist]] (PR-2 entry and Key Components registry-shape decision)
- [[01_Architecture/Package_Migration_System|Package-level migration system (RFC)]] (Migration Categories, Safety Guarantees)
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_02_build-migration-registry-scaffold-and-runner/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
