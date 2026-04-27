# Implementation Notes

- Dogfooding `extractVaultNoteTarget()` against split PHASE-02 companion notes exposed a real usability gap: heading extraction failed on notes without YAML frontmatter, even though the companion-note workflow expects bounded reads from those files.
- The minimal fix was in `src/core/vault-extract.ts`: wrap frontmatter-less content with a synthetic frontmatter prelude for read-only extraction so the existing heading/block parsers can be reused without broadening mutation semantics.
- Measured dogfood samples showed bounded reads were materially smaller than full-note reads:
  - `Step_04 ... /Execution_Brief.md` `Outcome and Success Condition`: 373 chars extracted vs 3593 full (~10%)
  - `Step_05 ... /Validation_Plan.md` `Required Commands`: 382 chars vs 1571 full (~24%)
  - `Phase.md` `Acceptance Criteria`: 1966 chars vs 9790 full (~20%)
  - `Step_05 ...` `step-agent-managed-snapshot` block: 329 chars vs 4996 full (~7%)
- Search/traversal guidance already consistently points workflows toward `rg`, then `grep`, then broader reads, so no new internal search-provider helper or selector-aware traversal API was justified by this dogfood pass.

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05 Dogfood extraction search and traversal integration strategy]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
