# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05 Dogfood extraction search and traversal integration strategy]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]

## Required Commands

1. Use `vault_extract` manually in pi after STEP-02-02 to extract at least one `Execution Brief` and one `Validation Plan` from PHASE-02 step notes.
2. `rg -n "vault_extract|rg|grep|target-rooted|bounded" pi-package/skills claude-commands src/templates README.md`
3. `bun run test test/context-prompt-budgets.test.ts`
4. `bun run test`
5. `bun run typecheck`

## Acceptance Checks

- A short dogfood note records whether `vault_extract` was sufficient for real refinement/execution.
- A durable decision or phase note records whether internal search-provider work is in or out of PHASE-02.
- Workflow prompts still tell agents to use `rg`, then `grep`, then full-file read fallback when outside MCP helpers.
- Workflow prompts still prefer target-rooted traversal and bounded extraction over broad vault reads.

## Manual Checks

- Compare one bounded extraction result with a full note read to confirm it contains enough context for the intended task.
- Confirm no workflow instructs agents to load every old session or the full code-graph index.

## Junior Readiness Verdict

- PASS after STEP-02-02 and STEP-02-04 are complete; before then this step is intentionally dependent and should not start.
