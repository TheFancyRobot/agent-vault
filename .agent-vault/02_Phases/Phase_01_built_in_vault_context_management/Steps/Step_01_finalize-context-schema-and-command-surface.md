---
note_type: step
template_version: 2
contract_version: 1
title: Finalize context schema and command surface
step_id: STEP-01-01
phase: '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]]'
status: planned
owner: ''
created: '2026-04-20'
updated: '2026-04-20'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Finalize context schema and command surface

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Finalize context schema and command surface.
- Parent phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]].

## Why This Step Exists

- Lock the exact schema and command surface before coding so the persistence model, validators, and workflow integrations do not churn mid-implementation.
- Turn the design interview decisions into a durable implementation contract.

## Prerequisites

- Read this step, the parent phase, and [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001]] completely before changing code or docs.
- Treat this step as the contract gate for the rest of PHASE-01: do not implement session persistence, step mirrors, or workflow integration until the field names, lifecycle values, and manual command names are locked.
- Be ready to edit both runtime and surfaced-tooling files in one pass: `src/core/`, `src/mcp-server.ts`, `pi-package/extensions/index.ts`, `claude-commands/`, and `README.md`.
- Have the local validation commands working before you start: `bun test test/core/command-catalog.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.

## Relevant Code Paths

- `src/core/command-catalog.ts` for CLI/manual command names, help text, and alias expectations.
- `src/mcp-server.ts` and `pi-package/extensions/index.ts` for MCP + pi-exposed tool descriptions that must stay aligned.
- `src/core/note-generators.ts`, `src/core/note-mutations.ts`, and `src/core/note-validators.ts` for the current session/step/template contract you are locking.
- `src/templates/note-templates.ts` plus `.agent-vault/07_Templates/Session_Template.md` for the canonical session note shape that later steps will persist into.
- `claude-commands/vault:execute.md`, `claude-commands/vault:resume.md`, and `claude-commands/vault:orchestrate.md` for workflow wording that references the future context primitives.
- `src/install.ts`, `test/install.test.ts`, `test/slash-commands.test.ts`, and `test/core/command-catalog.test.ts` for command-surface regression coverage.

## Required Reading

- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- `.agent-vault/07_Templates/Session_Template.md`
- `src/templates/note-templates.ts`
- `src/core/note-generators.ts`
- `src/core/note-validators.ts`
- `src/core/command-catalog.ts`
- `src/mcp-server.ts`
- `src/install.ts`
- `test/core/command-catalog.test.ts`
- `test/install.test.ts`
- `test/slash-commands.test.ts`

## Execution Prompt

1. Read the phase note, this step note, DEC-0001, the session template, and the current command-surface implementation before editing anything.
2. Write down the v1 contract in implementation terms: manual canonical command names, alias names, `context.status` lifecycle, `last_action.type` enum, `current_focus` and `resume_target` object shape, and the single prose handoff section name.
3. Inspect the current command-catalog, MCP tool descriptions, extension metadata, and slash-command docs to find every place where the future contract must be described consistently.
4. Update the smallest set of source files that make the contract explicit and durable. Do not start persistence or workflow behavior in this step except for the minimal scaffolding needed to express the contract.
5. If you discover a contract ambiguity that changes DEC-0001, update the decision note first, then align the phase and step notes before touching runtime code.
6. Validate with `bun test test/core/command-catalog.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.
7. Record the locked contract details in Implementation Notes so STEP-01-02 through STEP-01-04 do not need to re-discover them.
8. Before closing the step, confirm that a junior developer can answer "what are the exact v1 fields, allowed values, command names, aliases, and docs/tests to touch?" using only this note and its linked context.

## Readiness Checklist

- Exact outcome and success condition: document the v1 context contract in code-facing terms so later steps can implement it without renaming fields or inventing extra commands; success means the canonical names, aliases, schema fields, enums, and prose-section contract are all explicit and aligned across notes, source, and tests.
- Why this step matters to the phase: every later step depends on the same contract; if this step is fuzzy, persistence, workflow integration, docs, and migration work will churn.
- Prerequisites, setup state, and dependencies: no earlier phase dependency; this is the first internal dependency gate for STEP-01-02 through STEP-01-04.
- Concrete starting files, directories, packages, commands, and tests: start with `src/core/command-catalog.ts`, `src/mcp-server.ts`, `pi-package/extensions/index.ts`, `src/templates/note-templates.ts`, `src/install.ts`, `claude-commands/`, and the targeted tests listed above.
- Required reading completeness: the Required Reading list is sufficient for this step; do not skip the session template, install/rendering code, or DEC-0001.
- Implementation constraints and non-goals: keep `/vault:*` workflow commands primary, add friendly manual names plus aliases, and avoid implementing the full persistence/write-path behavior in this step.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted command-surface tests plus `bun run typecheck`; manually confirm the chosen names and aliases are spelled identically in runtime help, extension metadata, and command docs.
- Edge cases, failure modes, and recovery expectations: preserve backward-compatible aliases, do not break Codex prompt rewriting, and if command-surface wording diverges across files, fix the docs/tests before moving on.
- Security considerations or explicit not-applicable judgment: not security-sensitive beyond avoiding misleading docs that would cause users to write context to the wrong note type.
- Performance considerations or explicit not-applicable judgment: performance impact is negligible in this step because the work is contract definition, not runtime traversal changes.
- Integration touchpoints and downstream effects: STEP-01-02 consumes the schema, STEP-01-03 consumes command names and lifecycle semantics, and STEP-01-04 consumes the final wording for docs/migration notes.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if a new contract choice is needed, capture it in DEC-0001 before implementation continues.
- Junior-developer readiness verdict: PASS once the implementer can point to the exact contract files, values, and validation commands without relying on chat history.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-20
- Next action: Start STEP-01-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Locked canonical friendly manual command names: `save-context`, `switch-context`, `resume-context`, `prepare-context`.
- Locked alias/back-compat primitive names: `checkpoint`, `transition`, `resume-prepare`, `compact-research`.
- Locked `prepare-context` auto-write policy: allowed to update `updated_at`, `last_action`, `current_focus`, and `resume_target`; lifecycle change allowed only for `active` -> `paused`.
- Locked `last_action.type` v1 enum: `saved`, `switched`, `resumed`, `prepared`, `paused`, `completed`.
- Locked `current_focus` v1 shape: hybrid object with required `summary` and `target`.
- Locked canonical session prose section: `## Context Handoff` only.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
