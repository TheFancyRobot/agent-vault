---
note_type: session
template_version: 2
contract_version: 1
title: pi session for Harden path safety secret exclusion and prompt budget validation
session_id: SESSION-2026-09-02-190230
date: '2026-09-02'
status: completed
owner: pi
branch: ''
phase: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]'
context:
  context_id: SESSION-2026-09-02-190230
  status: completed
  updated_at: '2026-09-02T19:34:00Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]].
    target: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]'
    section: Context Handoff
  last_action:
    type: completed
related_bugs: []
related_decisions: []
created: '2026-09-02'
updated: '2026-09-02'
tags:
  - agent-vault
  - session
context_id: SESSION-2026-09-02-190230
context_status: completed
active_session_id: 05_Sessions/2026-09-02-190230-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi
last_action: completed
completed_at: '2026-09-02T19:34:00Z'
---

# pi session for Harden path safety secret exclusion and prompt budget validation

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 19:02 - Created session note.
- 19:02 - Linked related step [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]].
<!-- AGENT-END:session-execution-log -->
- Resumed after confirming STEP-04-08 is still planned; prior session was completed and did not implement this step.
- Created continuation session SESSION-2026-09-02-190230 and linked it as the active context.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- Added one centralized ContextSafetyPolicy for traversal, denylist, allowlist, and vault/project-root containment checks.
- Default exclusions cover environment files, key/certificate stores, SQLite, VCS/dependency/build/coverage/vendor/generated directories, lockfiles, and secret-like filenames. Basename matching prevents false positives from phase names such as token_efficiency.
- Enforced policy at markdown scanning, graph caching/building/lookup, code-stub generation/invalidation, context resources, MCP configuration, and prompt compilation.
- Prompt rendering now measures final rendered blocks against max_tokens, preserves a truncation suffix, reports truncation, and degrades with warnings for missing graph/stub indexes.

## Context Handoff

- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.
- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.
- Resumed from [[05_Sessions/2026-07-06-145240-harden-path-safety-secret-exclusion-and-prompt-budget-validation-pi|SESSION-2026-07-06-145240]], whose portable Vitest peer-dependency resolution follow-up is complete and whose validation recorded 27 files / 303 passing tests.
- STEP-04-08 remains `planned`; no implementation of its path-safety, denylist, token-budget, or stale-index acceptance criteria is recorded yet.
- Focused context loaded from the step, parent phase, System Overview, completed prerequisite steps STEP-04-05 and STEP-04-07, Execution Brief, Validation Plan, and empty Implementation Notes/Outcome.
- Continue with the execute readiness gate, then inspect source symbols and implement the step rather than repeating the prior Vitest-only fix.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- src/core/context-safety.ts (new policy and path guards)
- src/core/vault-config.ts, src/core/vault-files.ts, src/core/vault-graph.ts
- src/core/context-resources.ts, src/core/code-graph-lookup.ts, src/core/vault-prepare-context.ts
- src/scaffold/code-graph.ts, src/scaffold/code-stubs.ts, src/mcp-server.ts
- test/core/context-safety.test.ts (new safety and budget coverage)
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- npm run typecheck — passed.
- npm run build — passed.
- Targeted safety/resources/compiler tests — 15 passed across 3 files.
- Full Vitest excluding unavailable pi extension peers — 302 passed across 26 files.
- Full core run has 9 environment failures in two pi extension test files because @mariozechner/pi-ai is unavailable after npm ci.
- git diff --check — passed.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [x] STEP-04-08 cross-cutting path safety, exclusion, token budget, and stale-index protections.
- [x] Preserve prior session’s completed portable Vitest peer-dependency resolution.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
STEP-04-08 was still planned at resume time, so implementation proceeded. Path safety, secret exclusion, explicit exceptions, stale-index handling, and max_tokens enforcement are implemented and validated. The continuation session is complete; optional pi-ai peer failures remain an environment limitation.
