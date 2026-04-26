---
note_type: phase
template_version: 2
contract_version: 1
title: Targeted context extraction
phase_id: PHASE-02
status: planned
owner: Pi
created: '2026-04-25'
updated: '2026-04-26'
depends_on:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]'
related_architecture:
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]'
  - '[[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]'
  - '[[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]'
  - '[[03_Bugs/BUG-0003_pi-create-phase-workflow-implements-work-instead-of-creating-a-plan-and-fails-to-persist-corrected-plan|BUG-0003 Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan]]'
tags:
  - agent-vault
  - phase
---

# Phase 02 Targeted context extraction

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and implement targeted context extraction so agents can load precise note sections or bounded ranges without reading whole documents.
- Prefer `rg`/ripgrep for local text discovery when available, fall back to `grep`, and fall back to full-file reads only when neither text-search path is available or when the file is already known to be small.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]].

## Scope

- Add a section/range extraction model for markdown notes that keeps normal wikilinks as graph edges and treats section targets as selectors, not independent notes.
- Standardize the search order for agents and tooling: `rg` first, `grep` second, existing full-file read behavior last.
- Extend traversal or companion helper APIs so workflows can request bounded excerpts by heading, generated block, or selected target range.
- Update `/vault:execute`, `/vault:resume`, `/vault:orchestrate`, and relevant skills to prefer targeted excerpts over full-note content.
- Add validators and tests that prove section selectors do not corrupt the wikilink graph, Obsidian compatibility, generated-block balance, or prompt-budget guardrails.

## Non-Goals

- Do not replace normal note-to-note wikilinks or make block markers count as vault graph edges.
- Do not require Obsidian-specific block IDs for core functionality.
- Do not force every note section to gain explicit custom tags if stable markdown headings or existing generated blocks are sufficient.
- Do not remove the current full-file read fallback; keep it as the compatibility path for small files and constrained environments.

## Dependencies

- Depends on [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]].

## Acceptance Criteria

- [x] Scope is concrete and linked to the right durable notes.
- [x] Step notes exist for the first executable work units.
- [x] Validation and documentation expectations are explicit in each step's `Execution_Brief` and `Validation_Plan` companion notes.
- [x] A design decision records whether targeted extraction uses headings, generated-block markers, wikilink-like selectors, or a hybrid: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]].
- [x] `vault_traverse` or a companion MCP/pi tool can return bounded note excerpts without returning entire large notes. MCP server support and pi extension parity now exist via [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02]].
- [ ] Search/discovery logic uses `rg` when present, falls back to `grep`, then falls back to current read behavior; dogfood and final strategy remain [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05]].
- [ ] Link collection and validation prove section markers/selectors do not create bogus graph nodes or orphan/link warnings; covered by [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04]].
- [ ] Prompt-budget tests cover the targeted extraction workflow and BUG-0001's context inflation risk; covered by [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04]].
- [ ] Full-suite validation is green; [[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002]] is assigned to [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03]].

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]
- [[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]
- [[03_Bugs/BUG-0003_pi-create-phase-workflow-implements-work-instead-of-creating-a-plan-and-fails-to-persist-corrected-plan|BUG-0003 Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- [x] [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]
- [ ] [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]]
- [ ] [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]
- [ ] [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05 Dogfood extraction search and traversal integration strategy]]
<!-- AGENT-END:phase-steps -->

## Notes

- Initial grill-me assessment: the user-proposed `[[tag]] ... [[/tag]]` marker is technically possible but unsafe as a default because the current filesystem resolver treats every `[[...]]` as a candidate graph link. Using that syntax would require parser changes so selector tags do not become bogus graph nodes, broken links, backlinks, or rename targets.
- Recommended direction: prefer heading-based extraction for normal markdown sections and existing generated-block markers for machine-managed ranges. If arbitrary human-authored ranges are needed, use a non-wikilink marker syntax so the vault graph remains clean.
- Design decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002]] chooses exact markdown headings and existing generated-block markers as v1 selectors. Wikilink fragments like `[[Note#Heading]]` remain normal note links plus display/navigation hints, not independent selector nodes.
- Grill-me answer from 2026-04-25: PHASE-02 should use the recommended phase-complete scope, not the minimal scope. Completion requires pi extension parity, BUG-0002 full-suite fix, selector graph/prompt-budget regression coverage, and dogfooding the search/traverse integration strategy.
- Use the `Steps/` directory for executable units instead of expanding this note too far.
