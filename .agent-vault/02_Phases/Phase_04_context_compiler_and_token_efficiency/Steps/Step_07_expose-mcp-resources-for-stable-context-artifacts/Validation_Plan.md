# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts|STEP-04-07 Expose MCP resources for stable context artifacts]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- MCP resources are documented (README + any prompt/workflow docs that should mention them).
- Resource URIs are stable and path-safe.
- Note resources cannot escape the vault root; code resources cannot escape the project root.
- Code stubs and summaries are accessible without invoking a mutation-like tool.
- All existing tools continue to work (full suite green).

## Test Matrix

- Safe URI parsing: valid note/stub/summary/excerpt URIs resolve; each invalid family (`..` traversal, absolute path, encoded separators, wrong scheme, empty path) is rejected with a clear error.
- Missing resources: nonexistent note and non-cached stub return not-found (with refresh hint for generated artifacts), not a crash.
- Stale cache behavior: a stub whose source changed is reported stale per the STEP-04-04 manifest contract.
- Symbol excerpts: known symbol returns the bounded excerpt; unknown symbol returns not-found.
- Path traversal attempts via symlinks inside the project (if the platform test can create them) do not escape the root.

## Manual Checks

- From an MCP client (or the SDK test harness), list resources and read `vault://note/00_Home/Active_Context.md` and one code-stub URI end to end.

## Junior Readiness Verdict

- PASS: URI grammar, rejection families, and reuse of existing path guards are explicit.
