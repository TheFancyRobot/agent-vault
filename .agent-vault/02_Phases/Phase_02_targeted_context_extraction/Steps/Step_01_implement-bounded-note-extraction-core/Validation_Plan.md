# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]

## Required Commands

1. `bun run test test/core/note-mutations.test.ts`
2. `bun run test test/core/vault-extract.test.ts`
3. `bun run test test/core/note-mutations.test.ts test/core/vault-extract.test.ts`
4. `bun run typecheck`
5. `bun run test` to detect unrelated full-suite blockers; if BUG-0002 is still present, record that separately and do not hide it.

## Acceptance Checks

- Heading extraction returns only the requested heading section and nested subsections.
- Generated-block extraction returns the exact generated block with markers by default.
- Generated-block extraction can omit markers when requested.
- Exactly-one-selector validation rejects zero-selector and multi-selector calls.
- MCP `vault_extract` returns a compact text payload with `notePath`, `selector`, and bounded `content`.

## Manual Checks

- Confirm docs/skills mention `vault_extract` only as a bounded helper, not as a replacement for `vault_traverse`.
- Confirm the implementation does not create or require new vault note links for section selectors.

## Junior Readiness Verdict

- PASS for historical understanding: the completed step has concrete files, commands, constraints, edge cases, and validation evidence.
- Follow-up remains required at the phase level for pi extension parity and broader guardrails.
