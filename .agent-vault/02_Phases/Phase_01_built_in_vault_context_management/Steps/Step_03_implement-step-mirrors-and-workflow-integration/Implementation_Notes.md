# Implementation Notes

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
