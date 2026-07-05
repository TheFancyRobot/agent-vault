# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh|STEP-04-01 Document generated automation area and code graph refresh]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test` — only if README/docs validation tests exist; add or update doc tests only in that case, otherwise no new tests are required for this docs-only step.
2. `bun run typecheck` — confirm no accidental source edits.

## Acceptance Checks

- README documents the generated automation directory tree shown in the execution brief.
- README explains the purpose of `code-graph/` and reserves or documents the future `code-stubs/` cache.
- README or tool documentation clearly shows `vault_refresh` with `{"target": "code_graph"}`.
- Docs distinguish generated machine-readable state in `08_Automation/` from human-authored phase/session/step notes.
- No doc claims the current code graph is more than a lightweight regex-based lookup index.

## Manual Checks

- Read the updated README section as a new user and verify you could (a) find the code-graph index on disk and (b) refresh it, without reading source code.
- Grep the README for remaining stale statements that `vault_refresh` only supports `all`/`indexes`/`active_context`.

## Junior Readiness Verdict

- PASS: bounded doc edits with concrete target sections and a checkable stale-content list.
