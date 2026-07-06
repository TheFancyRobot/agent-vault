---
note_type: null
template_version: 2
contract_version: 1
---

# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- Created `src/core/vault-prepare-context.ts`
- Registered `vault_prepare_context` tool in `src/mcp-server.ts`
- Added command to `src/core/command-catalog.ts`
- Added tool to README.md tool table
- Input/output schema: `PrepareContextInput` / `PrepareContextResult`
- Render policy: vault notes → vault_extract excerpt; source files → stub cache with on-demand fallback
- Fail-safe: missing code graph → degraded result + vault_refresh hint; git failure → warning without crash
- Path safety: active_file validated against project root
