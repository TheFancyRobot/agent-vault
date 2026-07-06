---
note_type: step
template_version: 2
contract_version: 1
title: Add AST and compiler-backed source analysis with regex fallback
step_id: STEP-04-06
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: done
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Expand code graph to v3 dependency-aware schema]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Add AST and compiler-backed source analysis with regex fallback

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: A parser abstraction that gives TypeScript a stronger-than-regex extraction path (TypeScript compiler/declaration-style extraction preferred, Tree-sitter as the editor-like/multi-language option), keeps the existing regex extractor as fallback, and never lets parser errors break `vault_refresh`.
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].
- Depends on: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Code graph v3]] (provides the schema the parsers populate).

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03]] outcome notes
- [[01_Architecture/Code_Map|Code Map]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Do not replace the current regex approach immediately unless doing so is genuinely low risk; regex stays as the always-available fallback tier.
- Packaging decision (refinement 2026-07-05): `typescript` is NOT promoted to a runtime dependency — the compiler tier loads it via optional dynamic import from the host environment, falling back to Tree-sitter when unavailable, then regex. Only the Tree-sitter packaging choice (regular vs optional dependency, wasm vs native) remains open; record it in Implementation Notes or a decision note if it materially changes install size.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
