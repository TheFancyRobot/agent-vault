# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.
- Implemented stable read-only context resources in `src/core/context-resources.ts` and registered four MCP `ResourceTemplate`s in `src/mcp-server.ts`:
  - `vault://note/{path}` for vault Markdown notes.
  - `vault://code-stub/{path}` for cached interface stubs from the existing `code-stubs` manifest.
  - `vault://code-summary/{path}` for code graph v3 file metadata.
  - `vault://code-excerpt/{path}#symbol` for bounded symbol excerpts resolved from code graph `line`/`endLine`.
- Resource reads are side-effect free: stub resources read manifest/files only and report missing/stale artifacts with refresh hints instead of generating stubs.
- Added path-safety checks for relative paths, traversal segments, encoded separators, symlink escapes via realpath, secret-like names, and generated/vendor code-graph entries.
- `vault_prepare_context` items now include stable `resourceUri` values so clients can re-read selected artifacts cheaply.
- While validating, fixed a pre-existing uninstall test failure caused by macOS `/var` vs `/private/var` path aliases in pi package source removal (`src/install.ts`).

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts|STEP-04-07 Expose MCP resources for stable context artifacts]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
