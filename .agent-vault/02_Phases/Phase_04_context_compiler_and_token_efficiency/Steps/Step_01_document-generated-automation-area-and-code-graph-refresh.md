---
note_type: step
template_version: 2
contract_version: 1
title: Document generated automation area and code graph refresh
step_id: STEP-04-01
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Document generated automation area and code graph refresh

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: README (and CONTRIBUTING where relevant) accurately documents the generated `08_Automation/` area — the existing `code-graph/index.json`, the reserved future `code-stubs/` cache, and the `vault_refresh` `code_graph` target — without overstating what the current lightweight code graph can do.
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[01_Architecture/Code_Graph|Code Graph]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Keep the docs honest: the current code graph is a lightweight regex-based lookup index (schema version 2), not a full AST dependency model. The richer v3 index and stub cache are future work in this phase.
- `08_Automation/` is generated, machine-readable project state — make sure the README does not present it as human-authored note space like phases, steps, or sessions.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
