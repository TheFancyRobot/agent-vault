---
note_type: step
template_version: 2
contract_version: 1
title: Dogfood extraction search and traversal integration strategy
step_id: STEP-02-05
phase: '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
status: planned
owner: ''
created: '2026-04-25'
updated: '2026-04-25'
depends_on:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]'
related_sessions: []
related_bugs:
  - '[[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]'
tags:
  - agent-vault
  - step
---

# Step 05 - Dogfood extraction search and traversal integration strategy

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Dogfood extraction search and traversal integration strategy.
- Parent phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]].

## Required Reading

- [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]
- [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-25
- Next action: Read [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Default recommendation from refinement: keep v1 simple with `vault_extract` plus `rg`/`grep` workflow guidance unless dogfooding proves a real gap.
- If dogfooding chooses new built-in search-provider or selector-aware traversal work, create a new decision and step rather than silently expanding this one.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
