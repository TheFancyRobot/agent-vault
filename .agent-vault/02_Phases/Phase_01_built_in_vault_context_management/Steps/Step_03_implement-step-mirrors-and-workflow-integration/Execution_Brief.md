# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Read STEP-01-01, STEP-01-02, the three workflow command docs, and the matching pi skills before editing anything.
2. Identify the exact routing-critical fields that belong on step notes (`context_id`, mirrored active `session_id`, lifecycle `status`, plus the short human-readable summary) and keep everything else on the canonical session note.
3. Update the step-note mutation/generation path first so mirror fields change only on lifecycle transitions or when the canonical active session changes.
4. Then update `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` guidance so the workflows explicitly create, reuse, switch, and read built-in context rather than relying on implicit memory.
5. Keep workflow docs, pi skills, MCP descriptions, and tests aligned. If you change wording or command references in one place, update every mirrored surface in the same change.
6. Validate with `bun test test/core/note-generators.test.ts test/core/note-mutations.test.ts test/install.test.ts test/slash-commands.test.ts` and `bun run typecheck`.
7. Record any lifecycle-trigger rules, mirror-update rules, or workflow edge cases in Implementation Notes.
8. Before closing the step, confirm a junior developer can explain when step mirrors update, where canonical state lives, and how `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` interact with that state.
