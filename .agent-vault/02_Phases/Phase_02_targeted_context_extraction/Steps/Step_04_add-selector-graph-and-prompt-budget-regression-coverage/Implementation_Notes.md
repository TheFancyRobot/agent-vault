# Implementation Notes

- `test/core/vault-graph.test.ts` now locks in the contract that heading fragments normalize to their underlying note targets and that `AGENT-START` / `AGENT-END` comments never become graph links.
- `test/core/note-validators.test.ts` already covered unbalanced generated-block detection, so this step kept validator coverage intact and exercised it in focused validation.
- `test/context-prompt-budgets.test.ts` now requires orchestrate guidance to preserve narrow worker behavior by pointing subagents back to `vault_extract`, `rg`, `grep`, and target-rooted loading rather than broad ad hoc reads.
- The only production-facing text change was in `pi-package/skills/vault-orchestrate/SKILL.md` and `prompts/vault:orchestrate.md`; no core graph code changes were needed.

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
