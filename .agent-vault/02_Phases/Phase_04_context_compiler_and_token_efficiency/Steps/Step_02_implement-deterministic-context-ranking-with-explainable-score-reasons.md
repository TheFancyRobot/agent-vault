---
note_type: step
template_version: 2
contract_version: 1
title: Implement deterministic context ranking with explainable score reasons
step_id: STEP-04-02
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: done
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

# Step 02 - Implement deterministic context ranking with explainable score reasons

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: A deterministic relevance-ranking module that scores candidate vault notes and source files against the immediate task, active file, active step/phase/session, and changed files — returning explainable score reasons per item, with no embedding, GPU, network, or model dependency.
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003 Deterministic context compiler before optional local reranking]]
- [[01_Architecture/Code_Map|Code Map]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-05
- Next action: Read [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The scoring constants can change; the visible, testable score breakdown must not. Every included item carries reasons, never only a number.
- Never prune by discarding a fixed bottom percentage of candidates. Prune by token budget, minimum relevance score, and required-inclusion rules — explicitly linked or active notes may be mandatory even with a low score.
- Wikilinks rank vault notes against each other; they are not source-file dependency edges.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->
