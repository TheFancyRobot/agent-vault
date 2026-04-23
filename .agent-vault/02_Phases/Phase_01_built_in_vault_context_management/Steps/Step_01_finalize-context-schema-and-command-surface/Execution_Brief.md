# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Read the phase note, this step note, DEC-0001, the session template, and the current command-surface implementation before editing anything.
2. Write down the v1 contract in implementation terms: manual canonical command names, alias names, `context.status` lifecycle, `last_action.type` enum, `current_focus` and `resume_target` object shape, and the single prose handoff section name.
3. Inspect the current command-catalog, MCP tool descriptions, extension metadata, and slash-command docs to find every place where the future contract must be described consistently.
4. Update the smallest set of source files that make the contract explicit and durable. Do not start persistence or workflow behavior in this step except for the minimal scaffolding needed to express the contract.
5. If you discover a contract ambiguity that changes DEC-0001, update the decision note first, then align the phase and step notes before touching runtime code.
6. Validate with `bun test test/core/command-catalog.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.
7. Record the locked contract details in Implementation Notes so STEP-01-02 through STEP-01-04 do not need to re-discover them.
8. Before closing the step, confirm that a junior developer can answer "what are the exact v1 fields, allowed values, command names, aliases, and docs/tests to touch?" using only this note and its linked context.
