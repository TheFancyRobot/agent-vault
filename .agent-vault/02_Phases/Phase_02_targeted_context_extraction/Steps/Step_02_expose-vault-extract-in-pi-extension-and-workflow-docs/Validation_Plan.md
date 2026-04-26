# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]

## Required Commands

1. `bun run typecheck`
2. `bun run test test/core/vault-extract.test.ts`
3. If an extension registry test exists or is added, run that focused test.
4. `bun run test` after BUG-0002 is fixed; before then, record the known BUG-0002 failure instead of claiming full-suite green.

## Acceptance Checks

- `rg -n "name: \"vault_extract\"|vault_extract" pi-package/extensions/index.ts src/mcp-server.ts` shows both MCP server and pi extension registrations.
- The pi extension imports and calls `extractVaultNoteTarget` rather than duplicating extraction logic.
- The tool description tells agents it extracts a bounded heading or generated block without returning the full note.
- The parameter schema enforces: one vault-relative note path, optional exact heading, optional generated block name, optional `include_markers`.
- Error returns include `isError: true` and a useful message.

## Manual Checks

- From a pi session after rebuild/reload, confirm the available tools include `vault_extract`.
- Call `vault_extract` against a small note heading and verify only that section is returned.

## Junior Readiness Verdict

- PASS if the implementer follows the listed files, mirrors the MCP implementation, and runs the commands above.
