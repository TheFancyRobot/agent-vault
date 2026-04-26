---
note_type: step
template_version: 2
contract_version: 1
title: Implement bounded note extraction core
step_id: STEP-02-01
phase: '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
status: completed
owner: pi
created: '2026-04-25'
updated: '2026-04-25'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]]'
related_bugs:
  - '[[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]'
related_decisions:
  - '[[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-25-053837
active_session_id: 05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi
context_status: completed
context_summary: Advance [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]].
context:
  status: completed
  last_action:
    type: completed
  updated_at: '2026-04-25T05:42:00.000Z'
---

# Step 01 - Implement bounded note extraction core

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Implement bounded note extraction core.
- Parent phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]].

## Required Reading

- [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/Code_Map|Code Map]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: pi
- Last touched: 2026-04-25
- Next action: Continue Phase 02 follow-up work: decide whether to add an internal `rg`/`grep` search-provider layer or dogfood `vault_extract` first.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Completed in [[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]].
- The initial implementation intentionally uses headings and existing generated-block markers instead of wikilink-like open/close tags, preserving clean graph semantics.
- Refinement note: MCP server exposure is complete, but pi extension parity is deferred to [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02]].

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-25 - [[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]] - Session created.
<!-- AGENT-END:step-session-history -->
