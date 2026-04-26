# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Bug context: [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]
- Decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]

## Outcome and Success Condition

- Add regression coverage proving targeted extraction selectors do not corrupt vault link graphs and that workflow prompts stay within budget while recommending targeted loading.
- Success means tests fail if selector-like text creates bogus graph nodes, if generated-block balance regresses, or if workflow guidance grows beyond budget.

## Why This Matters

- The original grill-me concern was graph pollution from wikilink-like range tags.
- BUG-0001 requires prompt-budget guardrails, not just implementation convenience.

## Prerequisites and Setup

- STEP-02-01 and STEP-02-02 should be complete.
- BUG-0002 should be fixed before using full-suite success as evidence.
- Read `test/core/vault-graph.test.ts`, `test/core/note-validators.test.ts`, `test/context-prompt-budgets.test.ts`, and `src/core/vault-graph.ts` before editing.

## Starting Files and Directories

- `test/core/vault-graph.test.ts` — add collect/traverse coverage for `[[Note#Heading]]` and generated block comments, verifying expected graph targets only.
- `test/core/note-validators.test.ts` — add or confirm generated-block balance coverage for selector-relevant blocks.
- `test/context-prompt-budgets.test.ts` — assert execute/resume/orchestrate guidance mentions `vault_extract`, `rg`, `grep`, and bounded/narrow loading while staying under budgets.
- `src/core/vault-graph.ts` — edit only if tests reveal fragment or marker parsing is wrong.

## Implementation Constraints and Non-Goals

- Do not make generated block comments into links.
- Do not count heading fragments as separate nodes; `[[Some Note#Heading]]` should normalize to the note target.
- Do not loosen existing prompt budget thresholds without a documented reason.
- Do not require Obsidian-only behavior for filesystem resolver tests.

## Integration Touchpoints

- Link collection is shared by graph traversal and validators.
- Prompt-budget tests protect `pi-package/skills/*` and `claude-commands/*` workflow files.

## Edge Cases and Failure Modes

- Wikilinks with fragments: `[[01_Architecture/System_Overview#Overview|overview]]` should target `01_Architecture/System_Overview`.
- Plain marker comments: `<!-- AGENT-START:block -->` must not produce graph links.
- Broken generated-block pairs should still be caught by validators/mutation helpers.
- Very large notes should be handled by extraction tests without requiring whole-vault reads.

## Security and Performance

- Security: graph parsing must not treat arbitrary comments as paths.
- Performance: tests should use tiny fixtures; prompt budgets approximate context size by character count.

## Handoff Expectations

- If the current graph behavior already passes, keep the tests as regression coverage and record that no production change was needed.
- If budget thresholds need adjustment, create or update a decision/bug note explaining why.
