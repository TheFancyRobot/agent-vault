---
note_type: step
template_version: 2
contract_version: 1
title: Add selector graph and prompt-budget regression coverage
step_id: STEP-02-04
phase: '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
status: completed
owner: 'Pi'
created: '2026-04-25'
updated: '2026-04-26'
depends_on:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]'
related_sessions:
  - '[[05_Sessions/2026-04-26-204901-resume-step-02-04-selector-graph-and-prompt-budget-coverage-pi|SESSION-2026-04-26-204901 Pi session for Resume STEP-02-04 selector graph and prompt-budget coverage]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-26-204901
active_session_id: 05_Sessions/2026-04-26-204901-resume-step-02-04-selector-graph-and-prompt-budget-coverage-pi
context_status: completed
context_summary: Added selector graph and prompt-budget regression coverage for targeted extraction workflows.
---

# Step 04 - Add selector graph and prompt-budget regression coverage

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Add selector graph and prompt-budget regression coverage.
- Parent phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]].

## Required Reading

- [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]
- [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: Pi
- Last touched: 2026-04-26
- Next action: Continue with [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05 Dogfood extraction search and traversal integration strategy]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Add regression tests even if current behavior already passes; this step exists to freeze the graph and prompt-budget guarantees behind PHASE-02.
- Do not raise prompt budget thresholds unless a linked decision or bug explains the tradeoff.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-26 - [[05_Sessions/2026-04-26-204901-resume-step-02-04-selector-graph-and-prompt-budget-coverage-pi|SESSION-2026-04-26-204901 Pi session for Resume STEP-02-04 selector graph and prompt-budget coverage]] - Resumed from the STEP-02-03 cleanup handoff, added selector graph regressions, tightened orchestrate prompt guidance, and validated the full suite.
<!-- AGENT-END:step-session-history -->
