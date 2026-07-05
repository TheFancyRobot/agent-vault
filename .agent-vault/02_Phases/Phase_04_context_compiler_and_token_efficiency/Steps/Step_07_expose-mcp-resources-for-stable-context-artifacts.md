---
note_type: step
template_version: 2
contract_version: 1
title: Expose MCP resources for stable context artifacts
step_id: STEP-04-07
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04 Build cached source interface-stub generation]]'
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 07 - Expose MCP resources for stable context artifacts

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: Stable, addressable, path-safe MCP resources for context artifacts — vault notes, code stubs, code summaries, and code excerpts — so clients can read them directly without invoking a mutation-like tool, while tools keep performing actions (preparing context, refreshing indexes).
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].
- Depends on: STEP-04-04 (stub cache) and STEP-04-05 (context compiler) for the artifacts being exposed.

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Expand code graph to v3 dependency-aware schema]] (symbol `endLine` backs `#symbol` excerpt resolution)
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04]] outcome notes
- [[01_Architecture/Integration_Map|Integration Map]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Resources read; tools act. Reading a resource must never trigger regeneration side effects — a stale or missing artifact returns a clear "stale/missing, run vault_refresh" answer instead of silently rebuilding.
- URI stability is a public contract once shipped; get the scheme reviewed before release.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
