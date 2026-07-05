---
note_type: step
template_version: 2
contract_version: 1
title: Add optional local reranker plugin behind config flag
step_id: STEP-04-09
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]'
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]'
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 09 - Add optional local reranker plugin behind config flag

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: An opt-in second-stage plugin that lets advanced users rerank the top deterministic candidate set with a local CPU/GPU relevance model — never the default, never required, never network-dependent — with deterministic score reasons preserved alongside model rerank scores.
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].
- Depends on: STEP-04-02 (deterministic ranking stays primary), STEP-04-05 (the tool it plugs into), STEP-04-08 (safety constraints it must sit behind).
- Priority: lowest in the phase; deliberately last, per [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]].

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003 Deterministic context compiler before optional local reranking]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- This step may be deferred indefinitely without harming the rest of the phase; do not let it creep earlier in the order or become a hard dependency of anything.
- Document specific local model providers as examples only; do not hard-code any provider prematurely.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
