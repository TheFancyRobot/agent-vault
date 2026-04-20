---
note_type: phase
template_version: 2
contract_version: 1
title: Built-in vault context management
phase_id: PHASE-01
status: planned
owner: Pi
created: '2026-04-20'
updated: '2026-04-20'
depends_on: []
related_architecture:
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 01 Built-in vault context management

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Built-in vault context management milestone.

## Why This Phase Exists

- Capture the next bounded milestone after the current roadmap baseline.

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- Finalize the canonical session-note context schema and the step-note mirror shape.
- Add advanced/manual command surfaces for the four v1 primitives, with canonical names plus aliases.
- Integrate built-in context behavior into `/vault:execute`, `/vault:resume`, and `/vault:orchestrate`.
- Add validation, tests, and docs for the new context model.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.

## Dependencies

- No earlier phase dependency has been recorded yet.
- Internal phase ordering matters:
  - [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01]] defines the contract that all later work must follow.
  - [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02]] depends on that contract being locked.
  - [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03]] depends on the session-side persistence from STEP-01-02.
  - [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_04_add-tests-docs-and-migration-notes|STEP-01-04]] closes the phase after the contract, persistence, and workflow integration land.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] Decision note records the v1 context model and command surface clearly enough for implementation.
- [ ] Session notes can store the canonical current effective context in a validated machine-readable shape.
- [ ] Step notes can mirror routing-critical context fields and a human-readable summary.
- [ ] `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` use the built-in context subsystem safely.
- [ ] Tests cover schema validation, mirror updates, and at least one end-to-end resume/execution workflow.
- [ ] Docs explain normal workflow behavior, advanced/manual commands, and alias support.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: none.
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]
- [ ] [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_02_implement-canonical-session-context-persistence|STEP-01-02 Implement canonical session context persistence]]
- [ ] [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]]
- [ ] [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_04_add-tests-docs-and-migration-notes|STEP-01-04 Add tests, docs, and migration notes]]
<!-- AGENT-END:phase-steps -->

## Notes

- Shared implementation map for the phase:
  - Runtime note/template work lives primarily in `src/templates/note-templates.ts`, `src/core/note-generators.ts`, `src/core/note-mutations.ts`, and `src/core/note-validators.ts`.
  - MCP and pi extension surface changes live in `src/mcp-server.ts` and `pi-package/extensions/index.ts`.
  - Workflow behavior and user-facing guidance live in `claude-commands/vault:execute.md`, `claude-commands/vault:resume.md`, `claude-commands/vault:orchestrate.md`, `pi-package/skills/vault-execute/SKILL.md`, `pi-package/skills/vault-resume/SKILL.md`, and `pi-package/skills/vault-orchestrate/SKILL.md`.
  - Install/rendering coverage for command docs lives in `src/install.ts`, `test/install.test.ts`, and `test/slash-commands.test.ts`.
- Phase-wide validation baseline:
  - Start with targeted tests for the files changed in each step.
  - Before closing the phase, run `bun test` and `bun run typecheck`.
- Shared constraints from [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001]]:
  - Session notes are the only canonical store of the current effective context.
  - Step notes mirror only routing-critical context and a short human summary.
  - Manual commands use canonical friendly names with alias support; normal `/vault:*` workflows remain the primary UX.
  - Historical narration stays in prose sections; frontmatter stores only current effective state.
- Add architecture, bug, and decision links as implementation reveals additional durable context.
