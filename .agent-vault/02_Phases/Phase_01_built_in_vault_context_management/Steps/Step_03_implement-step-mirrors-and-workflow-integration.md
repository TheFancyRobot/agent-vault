---
note_type: step
template_version: 2
contract_version: 1
title: Implement step mirrors and workflow integration
step_id: STEP-01-03
phase: '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]]'
status: completed
owner: implementer
created: '2026-04-20'
updated: '2026-04-23'
depends_on:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]'
related_sessions:
  - '[[05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer|SESSION-2026-04-20-015720 implementer session for Implement step mirrors and workflow integration]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-20-015720
active_session_id: 05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer
context_status: completed
context_summary: Advance [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]].
---

# Step 03 - Implement step mirrors and workflow integration

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Implement step mirrors and workflow integration.
- Parent phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]].

## Required Reading

- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- `src/core/note-generators.ts`
- `src/core/note-mutations.ts`
- `src/core/note-validators.ts`
- `src/mcp-server.ts`
- `pi-package/extensions/index.ts`
- `claude-commands/vault:execute.md`
- `claude-commands/vault:resume.md`
- `claude-commands/vault:orchestrate.md`
- `pi-package/skills/vault-execute/SKILL.md`
- `pi-package/skills/vault-resume/SKILL.md`
- `pi-package/skills/vault-orchestrate/SKILL.md`
- `test/install.test.ts`
- `test/slash-commands.test.ts`

## Companion Notes

- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: implementer
- Last touched: 2026-04-20
- Next action: Review concerns addressed; ready for STEP-01-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-20 - [[05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer|SESSION-2026-04-20-015720 implementer session for Implement step mirrors and workflow integration]] - Session created.
<!-- AGENT-END:step-session-history -->
