---
note_type: step
template_version: 2
contract_version: 1
title: Harden path safety secret exclusion and prompt budget validation
step_id: STEP-04-08
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
status: done
owner: pi
created: '2026-07-05'
updated: '2026-09-02'
depends_on:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]'
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts|STEP-04-07 Expose MCP resources for stable context artifacts]]'
related_sessions:
  - '[[05_Sessions/2026-07-06-145240-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-07-06-145240 pi session for Harden path safety secret exclusion and prompt budget validation]]'
  - '[[05_Sessions/2026-09-02-190230-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-09-02-190230 pi session for Harden path safety secret exclusion and prompt budget validation]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: CTX-STEP-04-08-20260902
active_session_id: SESSION-2026-09-02-190230
context_status: completed
context_summary: Implemented centralized path safety, secret-like default exclusions with explicit allowlist overrides, safe graph/stub/resource enforcement, and final rendered prompt max_tokens truncation with warnings. Validation passes except unrelated optional pi-ai peer tests.
last_action: completed
---

# Step 08 - Harden path safety secret exclusion and prompt budget validation

Use this note as the thin index for one executable step inside a phase. Keep this file short and route detail into companion notes so execution can load only the smallest note needed. This note should stay readable enough to answer: what is the step, what must be read first, and where do deeper execution details live?

## Purpose

- Outcome: A cross-cutting safety net for the whole context pipeline: path traversal fails safely everywhere, secret-like and generated/vendor files are excluded by default, token budgets are enforced with reported truncation, and missing/stale graph or stub indexes never crash context assembly — all locked in by tests.
- Parent phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]].
- Depends on: STEP-04-05 (context compiler) and STEP-04-07 (MCP resources) as the surfaces under test.

## Required Reading

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: pi
- Last touched: 2026-09-02
- Next action: None. Step complete; see Human Notes and the completed continuation session.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Placement confirmed during refinement (2026-07-05): this step stays a final cross-cutting adversarial sweep; feature steps 02–07 keep owning their own basic guards as written in their briefs.
- Denylist defaults should be overridable by explicit configuration, but the safe default always wins when config is absent.
- Completed 2026-09-02: added src/core/context-safety.ts with lexical traversal rejection, realpath root containment, default denylist, and explicit allowlist overrides. Enforced it across Markdown discovery, graph build/cache/lookup, source graph scanning, stubs, resources, MCP handlers, and prompt compilation.
- Prompt compilation now enforces the final rendered max_tokens budget, preserves a truncation suffix, and reports truncation. Missing/stale graph and stub artifacts degrade with warnings.
- Validation: npm run typecheck, npm run build, focused changed tests (15 passed), and full Vitest excluding the two pi extension files whose optional @mariozechner/pi-ai peer is unavailable (302 passed across 26 files).

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-06 - [[05_Sessions/2026-07-06-145240-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-07-06-145240 pi session for Harden path safety secret exclusion and prompt budget validation]] - Session created.
- 2026-09-02 - [[05_Sessions/2026-09-02-190230-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-09-02-190230 pi session for Harden path safety secret exclusion and prompt budget validation]] - Session created.
<!-- AGENT-END:step-session-history -->
- 2026-09-02 - [[05_Sessions/2026-09-02-190230-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-09-02-190230 pi session for Harden path safety secret exclusion and prompt budget validation]] - Completed STEP-04-08 implementation and validation.
