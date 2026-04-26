---
note_type: step
template_version: 2
contract_version: 1
title: Fix vault-resume full-suite ESM fs spy blocker
step_id: STEP-02-03
phase: '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
status: completed
owner: ''
created: '2026-04-25'
updated: '2026-04-25'
depends_on: []
related_sessions: []
related_bugs:
  - '[[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]'
tags:
  - agent-vault
  - step
---

# Step 03 - Fix vault-resume full-suite ESM fs spy blocker

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Fix vault-resume full-suite ESM fs spy blocker.
- Parent phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]].

## Required Reading

- [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-25
- Next action: Read [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- This step is intentionally included in PHASE-02 because a red full suite blocks trustworthy completion, even though the failing test is unrelated to the extraction core.
- Do not delete the newest-session regression; replace the ESM `fs.readdirSync` spy with real temp fixture behavior or an ESM-safe mock.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
