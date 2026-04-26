---
note_type: step
template_version: 2
contract_version: 1
title: Expose vault_extract in pi extension and workflow docs
step_id: STEP-02-02
phase: '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
status: completed
owner: 'Pi'
created: '2026-04-25'
updated: '2026-04-26'
depends_on:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]'
related_sessions:
  - '[[05_Sessions/2026-04-26-201711-expose-vault-extract-in-pi-extension-and-workflow-docs-pi|SESSION-2026-04-26-201711 Pi session for Expose vault_extract in pi extension and workflow docs]]'
related_bugs:
  - '[[03_Bugs/BUG-0003_pi-create-phase-workflow-implements-work-instead-of-creating-a-plan-and-fails-to-persist-corrected-plan|BUG-0003 Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-26-201711
active_session_id: 05_Sessions/2026-04-26-201711-expose-vault-extract-in-pi-extension-and-workflow-docs-pi
context_status: active
context_summary: Advance [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]].
---

# Step 02 - Expose vault_extract in pi extension and workflow docs

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Expose vault_extract in pi extension and workflow docs.
- Parent phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]].

## Required Reading

- [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: Pi
- Last touched: 2026-04-26
- Next action: Continue with [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Refinement finding: `src/mcp-server.ts` exposes `vault_extract`, but `pi-package/extensions/index.ts` does not yet register a matching pi tool. This is the first follow-up because Phase 02 is being dogfooded from pi.
- Recommended implementation: mirror the MCP server tool parameters and delegate to `extractVaultNoteTarget`; do not duplicate extraction logic.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-26 - [[05_Sessions/2026-04-26-201711-expose-vault-extract-in-pi-extension-and-workflow-docs-pi|SESSION-2026-04-26-201711 Pi session for Expose vault_extract in pi extension and workflow docs]] - Session created and step completed with pi parity, prompt-template fixes, and regression coverage.
<!-- AGENT-END:step-session-history -->
