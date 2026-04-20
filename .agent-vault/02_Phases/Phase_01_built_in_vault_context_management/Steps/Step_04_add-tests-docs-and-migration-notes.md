---
note_type: step
template_version: 2
contract_version: 1
title: Add tests, docs, and migration notes
step_id: STEP-01-04
phase: '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]]'
status: planned
owner: ''
created: '2026-04-20'
updated: '2026-04-20'
depends_on:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Add tests, docs, and migration notes

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add tests, docs, and migration notes.
- Parent phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]].

## Why This Step Exists

- Make the new context subsystem safe to ship by proving behavior with tests and documenting both normal and advanced/manual usage.
- Reduce upgrade friction by recording migration notes and any required validator or template changes.

## Prerequisites

- Treat this as a close-out step: it should begin only after STEP-01-01 through STEP-01-03 have landed or are at least code-complete on the working branch.
- Read the final implemented contract and workflow behavior before writing migration notes; docs must describe reality, not the plan.
- Be prepared to touch test coverage, README guidance, workflow command docs, pi skill docs, and any template/validator migration helpers in one coordinated pass.
- Have the broad validation commands ready before editing: `bun test` and `bun run typecheck`.

## Relevant Code Paths

- `test/core/` plus `test/install.test.ts` and `test/slash-commands.test.ts` for contract, mutation, rendering, and workflow coverage.
- `README.md` for the main user-facing workflow description and examples.
- `claude-commands/` and `pi-package/skills/` for advanced/manual command help and execution/resume/orchestrate guidance.
- `src/templates/note-templates.ts`, `.agent-vault/07_Templates/`, and `src/core/note-validators.ts` if the new context contract changes note shape or validation rules that existing vaults must satisfy.
- `CHANGELOG.md` or other release-facing docs if the migration affects published behavior.

## Required Reading

- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- `README.md`
- `src/templates/note-templates.ts`
- `src/core/note-validators.ts`
- `test/core/`
- `test/install.test.ts`
- `test/slash-commands.test.ts`
- `claude-commands/`
- `pi-package/skills/`

## Execution Prompt

1. Read STEP-01-01 through STEP-01-03 plus the current README, workflow docs, and tests before editing.
2. Inventory what changed in the implementation and map each behavior to required proof: unit tests, integration-style tests, README examples, workflow-command docs, and migration notes for existing vaults.
3. Add or strengthen targeted tests first where coverage is thin, then update docs so the examples and command references reflect the implemented reality.
4. Document migration expectations explicitly: what existing session/step notes may lack, whether validators will fail before migration, and how a maintainer should repair old notes safely.
5. Keep README, slash-command docs, pi skills, templates, and validators synchronized. If the same behavior is described in multiple places, update them in the same pass.
6. Validate with the full project suite: `bun test` and `bun run typecheck`.
7. Record any remaining rollout caveats or deferred follow-up work in Implementation Notes and Outcome Summary.
8. Before closing the step, confirm a junior developer can read the docs, run the tests, migrate older notes if needed, and use the new context workflows without hidden context.

## Readiness Checklist

- Exact outcome and success condition: add the missing proof, documentation, and migration guidance around the new context subsystem; success means the changed behavior is covered by tests, explained in user-facing docs, and accompanied by actionable migration notes for older vault content.
- Why this step matters to the phase: the phase is not shippable until the new context model is test-proven, understandable, and safe to roll out.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 through STEP-01-03 being implemented first.
- Concrete starting files, directories, packages, commands, and tests: start with `test/core/`, `test/install.test.ts`, `test/slash-commands.test.ts`, `README.md`, `claude-commands/`, `pi-package/skills/`, `src/templates/note-templates.ts`, and `src/core/note-validators.ts`; validate with `bun test` and `bun run typecheck`.
- Required reading completeness: the Required Reading list is sufficient if you read the completed implementation steps before editing docs.
- Implementation constraints and non-goals: do not introduce v2 schema ideas here, do not leave README/examples stale, and do not hand-wave migration details with "manual update may be needed" without concrete instructions.
- Validation commands, manual checks, and acceptance criteria mapping: run the full suite plus typecheck; manually inspect rendered command docs/examples to ensure canonical names, aliases, and workflow behavior all match the code and decision note.
- Edge cases, failure modes, and recovery expectations: cover legacy notes missing `context`, legacy sessions without `Context Handoff`, stale workflow docs, and command-rendering regressions for Claude/OpenCode/Codex.
- Security considerations or explicit not-applicable judgment: docs should tell users not to place secrets in context summaries or migration examples.
- Performance considerations or explicit not-applicable judgment: ensure the final docs and tests reinforce the lean-current-state model rather than encouraging oversized frontmatter.
- Integration touchpoints and downstream effects: this step touches all user-facing surfaces and the final regression bar for the phase.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if migration semantics are unclear after implementation, record a follow-up decision or bug instead of shipping vague instructions.
- Junior-developer readiness verdict: PASS once a new engineer can verify the feature with tests and follow the migration/docs trail without needing prior conversation history.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-20
- Next action: Start STEP-01-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
