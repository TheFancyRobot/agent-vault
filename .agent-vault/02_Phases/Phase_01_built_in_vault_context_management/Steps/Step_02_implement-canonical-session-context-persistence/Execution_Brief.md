# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Read STEP-01-01, DEC-0001, the session template, and the current session-generation/validation tests before editing code.
2. Identify exactly where session notes are created, validated, and later mutated so the new canonical `context` object and `## Context Handoff` section are introduced consistently.
3. Update the scaffold/template layer first (`src/templates/note-templates.ts` and the checked-in vault template), then update session generation and validator logic so newly created notes immediately satisfy the new contract.
4. Keep the current-effective-state boundary strict: frontmatter stores only the current context object, while narrative and prepared findings stay in `## Context Handoff` or other prose sections.
5. Preserve conservative note-mutation behavior. If nested object updates or new heading semantics require helper changes, extend the mutation/validation tests in the same change.
6. Validate with `bun test test/core/note-generators.test.ts test/core/note-validators.test.ts test/core/note-mutations.test.ts` and `bun run typecheck`.
7. Record concrete field names, required subfields, and any migration-sensitive edge cases in Implementation Notes.
8. Before closing the step, confirm a junior developer can create a new session note, inspect its canonical context state, and tell which fields are safe to auto-update versus which details must remain in prose.
