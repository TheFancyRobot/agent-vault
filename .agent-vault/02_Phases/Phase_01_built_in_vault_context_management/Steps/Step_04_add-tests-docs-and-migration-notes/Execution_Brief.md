# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Read STEP-01-01 through STEP-01-03 plus the current README, workflow docs, and tests before editing.
2. Inventory what changed in the implementation and map each behavior to required proof: unit tests, integration-style tests, README examples, workflow-command docs, and migration notes for existing vaults.
3. Add or strengthen targeted tests first where coverage is thin, then update docs so the examples and command references reflect the implemented reality.
4. Document migration expectations explicitly: what existing session/step notes may lack, whether validators will fail before migration, and how a maintainer should repair old notes safely.
5. Keep README, slash-command docs, pi skills, templates, and validators synchronized. If the same behavior is described in multiple places, update them in the same pass.
6. Validate with the full project suite: `bun test` and `bun run typecheck`.
7. Record any remaining rollout caveats or deferred follow-up work in Implementation Notes and Outcome Summary.
8. Before closing the step, confirm a junior developer can read the docs, run the tests, migrate older notes if needed, and use the new context workflows without hidden context.
