# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]

## Required Commands

1. `bun run test test/core/vault-graph.test.ts`
2. `bun run test test/core/note-validators.test.ts`
3. `bun run test test/context-prompt-budgets.test.ts`
4. `bun run test`
5. `bun run typecheck`

## Acceptance Checks

- Tests show generated-block markers are not graph links.
- Tests show heading fragments normalize to the underlying note, not to a separate section node.
- Prompt budget tests assert targeted extraction guidance stays present in execute/resume/orchestrate workflows.
- No budget threshold is raised without an accompanying note explaining why.

## Manual Checks

- Inspect any graph snapshots in failed tests to ensure there are no bogus `/tag`, `AGENT-START`, or heading-fragment nodes.
- Confirm tests remain resolver-independent unless explicitly testing Obsidian behavior.

## Junior Readiness Verdict

- PASS: concrete test files, expected assertions, and validation commands are specified.
