---
note_type: step
template_version: 2
contract_version: 1
title: Implement canonical session context persistence
step_id: STEP-01-02
phase: '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]]'
status: planned
owner: ''
created: '2026-04-20'
updated: '2026-04-20'
depends_on:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement canonical session context persistence

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement canonical session context persistence.
- Parent phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|Phase 01 built in vault context management]].

## Why This Step Exists

- Turn the finalized context contract into durable session-owned state so resume and handoff no longer depend on implicit conversation memory.
- Reduce ambiguity by making the current effective context machine-readable and validateable.

## Prerequisites

- Complete [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01]] first and treat its locked contract as authoritative.
- Read DEC-0001 plus the current session template and generator/validator code before editing any persistence path.
- Be ready to update both scaffolded template sources and live note-generation code in the same change so new sessions are created with the new shape immediately.
- Have targeted validation available before coding: `bun test test/core/note-generators.test.ts test/core/note-validators.test.ts test/core/note-mutations.test.ts` and `bun run typecheck`.

## Relevant Code Paths

- `src/templates/note-templates.ts` and `.agent-vault/07_Templates/Session_Template.md` for the canonical session note scaffold.
- `src/core/note-generators.ts` for `createSessionContent`, backreferences, and any helper logic that writes session content.
- `src/core/note-mutations.ts` for safe block/section/frontmatter updates if nested context objects or a new handoff section need helper support.
- `src/core/note-validators.ts` for frontmatter and heading-contract enforcement once `context` and `Context Handoff` become required.
- `src/mcp-server.ts` and `pi-package/extensions/index.ts` if tool descriptions or mutation expectations need to acknowledge structured session context.
- `test/core/note-generators.test.ts`, `test/core/note-validators.test.ts`, and `test/core/note-mutations.test.ts` for regression coverage.

## Required Reading

- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_01_finalize-context-schema-and-command-surface|STEP-01-01 Finalize context schema and command surface]]
- [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- `.agent-vault/07_Templates/Session_Template.md`
- `src/templates/note-templates.ts`
- `src/core/note-generators.ts`
- `src/core/note-mutations.ts`
- `src/core/note-validators.ts`
- `test/core/note-generators.test.ts`
- `test/core/note-validators.test.ts`
- `test/core/note-mutations.test.ts`

## Execution Prompt

1. Read STEP-01-01, DEC-0001, the session template, and the current session-generation/validation tests before editing code.
2. Identify exactly where session notes are created, validated, and later mutated so the new canonical `context` object and `## Context Handoff` section are introduced consistently.
3. Update the scaffold/template layer first (`src/templates/note-templates.ts` and the checked-in vault template), then update session generation and validator logic so newly created notes immediately satisfy the new contract.
4. Keep the current-effective-state boundary strict: frontmatter stores only the current context object, while narrative and prepared findings stay in `## Context Handoff` or other prose sections.
5. Preserve conservative note-mutation behavior. If nested object updates or new heading semantics require helper changes, extend the mutation/validation tests in the same change.
6. Validate with `bun test test/core/note-generators.test.ts test/core/note-validators.test.ts test/core/note-mutations.test.ts` and `bun run typecheck`.
7. Record concrete field names, required subfields, and any migration-sensitive edge cases in Implementation Notes.
8. Before closing the step, confirm a junior developer can create a new session note, inspect its canonical context state, and tell which fields are safe to auto-update versus which details must remain in prose.

## Readiness Checklist

- Exact outcome and success condition: implement canonical session-owned context persistence so newly created and subsequently updated session notes contain the agreed v1 `context` frontmatter shape plus a single `## Context Handoff` prose section; success means generators, validators, and mutation helpers all accept and preserve that shape.
- Why this step matters to the phase: session notes are the canonical context store; without this step, `/vault:resume`, `/vault:execute`, and step mirroring still depend on implicit conversation memory.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 being locked; no external dependency is known.
- Concrete starting files, directories, packages, commands, and tests: start with `src/templates/note-templates.ts`, `.agent-vault/07_Templates/Session_Template.md`, `src/core/note-generators.ts`, `src/core/note-mutations.ts`, `src/core/note-validators.ts`, and the listed core tests.
- Required reading completeness: the reading list is sufficient if read in full; do not skip STEP-01-01 because that note defines the canonical field names and enum values.
- Implementation constraints and non-goals: do not add historical context snapshots to frontmatter, do not invent extra v1 lifecycle states, and do not mirror step context in this step beyond what is needed to keep session generation coherent.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted generator/validator/mutation tests plus `bun run typecheck`; manually inspect a generated session note fixture or sample output to verify `context`, `Context Handoff`, and existing required sections coexist correctly.
- Edge cases, failure modes, and recovery expectations: preserve CRLF-safe mutations, preserve unknown frontmatter keys, handle empty/default context fields cleanly, and fail validation loudly if required subfields or the handoff heading are missing.
- Security considerations or explicit not-applicable judgment: context summaries must not encourage storing secrets or raw credentials in session frontmatter; keep sensitive narrative in prose only when truly needed.
- Performance considerations or explicit not-applicable judgment: keep the context object lean so session-note parsing and home-note refreshes stay cheap.
- Integration touchpoints and downstream effects: STEP-01-03 will read this session shape for mirror updates and workflow behavior; STEP-01-04 will document and migrate it.
- Blockers, unresolved decisions, and handoff expectations: no current blocker; if the persistence shape proves too large for safe frontmatter updates, capture that as a decision before widening scope.
- Junior-developer readiness verdict: PASS once the implementer can name the template, generator, validator, and tests that together enforce canonical session context persistence.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-20
- Next action: Start STEP-01-02.
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
