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
updated: '2026-04-20'
depends_on:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]'
related_sessions:
  - '[[05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer|SESSION-2026-04-20-015720 implementer session for Implement step mirrors and workflow integration]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-20-015720
active_session_id: 05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer
context_status: completed
context_summary: Advance [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]].
---

# Step 03 - Implement step mirrors and workflow integration

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement step mirrors and workflow integration.
- Parent phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]].

## Why This Step Exists

- Ensure step notes provide durable routing and continuity across sessions without becoming the canonical source of truth.
- Connect the new context model to `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` so workflow behavior is consistent.

## Prerequisites

- Complete [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01]] and [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02]] first.
- Review the current `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` workflow docs before editing code so you know which behavior is implemented in runtime helpers versus prompt instructions.
- Be ready to update step-note structure, runtime helpers, and workflow docs together; this step crosses note generation, note mutation, MCP descriptions, and user-facing agent instructions.
- Have targeted validation ready up front: `bun test test/core/note-generators.test.ts test/core/note-mutations.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.

## Relevant Code Paths

- `src/core/note-generators.ts` and `src/core/note-mutations.ts` for step-note mirror fields, session backreferences, and safe updates to step summaries.
- `src/core/note-validators.ts` if step frontmatter or required headings change to support mirror fields.
- `claude-commands/vault:execute.md`, `claude-commands/vault:resume.md`, and `claude-commands/vault:orchestrate.md` for the built-in workflow behavior that must now reference the canonical context subsystem.
- `pi-package/skills/vault-execute/SKILL.md`, `pi-package/skills/vault-resume/SKILL.md`, and `pi-package/skills/vault-orchestrate/SKILL.md` for the mirrored pi skill guidance.
- `src/mcp-server.ts` and `pi-package/extensions/index.ts` if tool descriptions must mention step mirrors or manual context operations.
- `test/core/note-generators.test.ts`, `test/core/note-mutations.test.ts`, `test/install.test.ts`, and `test/slash-commands.test.ts` for regression coverage.

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

## Execution Prompt

1. Read STEP-01-01, STEP-01-02, the three workflow command docs, and the matching pi skills before editing anything.
2. Identify the exact routing-critical fields that belong on step notes (`context_id`, mirrored active `session_id`, lifecycle `status`, plus the short human-readable summary) and keep everything else on the canonical session note.
3. Update the step-note mutation/generation path first so mirror fields change only on lifecycle transitions or when the canonical active session changes.
4. Then update `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` guidance so the workflows explicitly create, reuse, switch, and read built-in context rather than relying on implicit memory.
5. Keep workflow docs, pi skills, MCP descriptions, and tests aligned. If you change wording or command references in one place, update every mirrored surface in the same change.
6. Validate with `bun test test/core/note-generators.test.ts test/core/note-mutations.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.
7. Record any lifecycle-trigger rules, mirror-update rules, or workflow edge cases in Implementation Notes.
8. Before closing the step, confirm a junior developer can explain when step mirrors update, where canonical state lives, and how `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` interact with that state.

## Readiness Checklist

- Exact outcome and success condition: implement routing-oriented step mirrors and update the execution/resume/orchestration workflows so they read and maintain the built-in context subsystem; success means step notes expose only the agreed mirror fields and the workflow docs clearly describe how that state is created and consumed.
- Why this step matters to the phase: this is where the canonical session context becomes operational instead of just stored.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 and STEP-01-02; do not begin until the session contract is already stable.
- Concrete starting files, directories, packages, commands, and tests: start with `src/core/note-generators.ts`, `src/core/note-mutations.ts`, `src/core/note-validators.ts`, the three `claude-commands/vault:*` workflow docs, the matching `pi-package/skills/vault-*` files, and the listed tests.
- Required reading completeness: the Required Reading list is sufficient if read in full, especially STEP-01-02 and the existing execute/resume/orchestrate workflows.
- Implementation constraints and non-goals: step notes are not the canonical store, workflow prompts remain the primary UX, and this step should not invent a second parallel resume/handoff mechanism.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted generator/mutation/install/slash-command tests plus `bun run typecheck`; manually inspect the workflow docs to verify they all reference the same lifecycle and session-reuse behavior.
- Edge cases, failure modes, and recovery expectations: handle switching steps inside one session, resuming a completed step by targeting the next incomplete one, pausing work without losing the active context, and keeping mirrored fields stable when unrelated prose changes.
- Security considerations or explicit not-applicable judgment: keep mirrored step state minimal so a step note does not become a second sensitive handoff store.
- Performance considerations or explicit not-applicable judgment: only update mirrors on lifecycle changes or canonical-session switches to avoid noisy note churn and unnecessary home-note refresh work.
- Integration touchpoints and downstream effects: touches note generation, note mutation, workflow prompts, pi skills, install/rendering tests, and the user-visible execution model described in README.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if workflow prompts cannot express the new lifecycle cleanly, capture a follow-up decision instead of silently diverging from DEC-0001.
- Junior-developer readiness verdict: PASS once the implementer can trace one end-to-end path from active session context -> mirrored step fields -> `/vault:resume` continuation behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: implementer
- Last touched: 2026-04-20
- Next action: Review concerns addressed; ready for STEP-01-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Added step-mirror types and constants to `src/core/context-contract.ts`: `STEP_MIRROR_CONTEXT_ID_KEY`, `STEP_MIRROR_SESSION_ID_KEY`, `STEP_MIRROR_STATUS_KEY`, `STEP_MIRROR_SUMMARY_KEY`, `STEP_MIRROR_REQUIRED_KEYS`, `StepMirrorState` interface, `buildStepMirror()`, `isValidContextStatus()`.
- Updated `linkSessionBackToStep()` in `src/core/note-generators.ts` to accept canonical session context parameters and write step-mirror fields via `buildStepMirror()`.
- Updated `handleCreateSessionCommand()` to pass default session context values to `linkSessionBackToStep()` so mirrors are written immediately when a session is created and linked to a step.
- Step-mirror fields are optional on step notes — they exist only when a session has been linked. The validator does not require them.
- Mirrors update only on: session creation linked to the step, lifecycle transitions, session completion, or when a new session becomes the active session for the step. Unrelated prose changes do not trigger mirror updates.
- Updated 6 workflow docs (3 `claude-commands/` + 3 `pi-package/skills/`): `vault:execute` steps 4 and 7, `vault:resume` step 2, `vault:orchestrate` step 4e — all now reference step mirrors for routing, lifecycle tracking, and verification.
- MCP tool descriptions (`src/mcp-server.ts`, `pi-package/extensions/index.ts`) do not need changes — step mirrors are an internal detail of the session-to-step linking path.
- 9 new tests added across `test/core/context-contract.test.ts` (4 tests) and `test/core/note-generators.test.ts` (1 extended test with 4 new assertions). All 63 tests pass.
- **Review fix (post-completion):** Three reviewer concerns addressed:
  1. Added `updateStepMirrors()` export to `note-generators.ts` — re-reads canonical session context from session note and re-mirrors onto linked step. Resolves runtime/doc mismatch: mirrors can now update on lifecycle transitions, not just creation.
  2. Added dot-path deep-merge support to `updateFrontmatter` in `note-mutations.ts` — `vault_mutate --set context.status=completed` now merges into nested objects instead of creating a flat key.
  3. Fixed live vault note: `related_sessions` corrected from scalar to list, step-mirror fields added to frontmatter, duplicated Session History line removed, Agent-Managed Snapshot updated to reflect completed status.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-20 - [[05_Sessions/2026-04-20-015720-implement-step-mirrors-and-workflow-integration-implementer|SESSION-2026-04-20-015720 implementer session for Implement step mirrors and workflow integration]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
- Completed step-mirror implementation for PHASE-01 STEP-01-03.
- Step notes now expose routing-oriented mirror fields (`context_id`, `active_session_id`, `context_status`, `context_summary`) written from the canonical session context when a session is linked.
- All 6 workflow docs (vault:execute, vault:resume, vault:orchestrate — both claude-commands and pi skills) updated to reference step mirrors.
- Validation performed: `bun test` (63 pass, 0 fail across 6 files), `bun run typecheck` (clean).
- Follow-up: STEP-01-04 can document and test the full context lifecycle including step mirrors.
