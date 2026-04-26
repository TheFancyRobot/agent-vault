---
note_type: decision
template_version: 2
contract_version: 1
title: Use headings and generated blocks as targeted extraction selectors
decision_id: DEC-0002
status: accepted
decided_on: '2026-04-25'
owner: 'Pi'
created: '2026-04-25'
updated: '2026-04-25'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]'
  - '[[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]'
tags:
  - agent-vault
  - decision
---

# DEC-0002 - Use headings and generated blocks as targeted extraction selectors

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: accepted.
- This decision records the v1 selector model for PHASE-02 targeted context extraction.

## Context

- PHASE-02 exists because full-note context loading contributed to BUG-0001's prompt inflation risk.
- Agents need a way to request small, precise excerpts from vault notes without turning section targets into graph nodes.
- The initial grill-me proposal considered wikilink-like range tags such as `[[tag]] ... [[/tag]]`, but the filesystem resolver treats `[[...]]` syntax as graph links.
- Related notes: [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]], [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]].

## Decision

- Use exact markdown headings and existing generated-block markers as the v1 targeted extraction selectors.
- Heading selectors extract the requested heading and nested subsections until the next heading at the same or higher level.
- Generated-block selectors extract ranges delimited by existing agent generated-block start/end comments with a shared block name.
- Expose selectors through explicit tool parameters such as `note_path` plus exactly one of `heading` or `block`.
- Keep wikilinks as graph edges only. `[[Note#Heading]]` may still be used as an Obsidian/navigation link to a note heading, but the heading fragment must not become an independent vault node.

## Alternatives Considered

- Wikilink-like range tags (`[[tag]] ... [[/tag]]`): rejected for v1 because they would create bogus graph targets, broken-link warnings, backlinks, and rename ambiguity unless the resolver learned a second meaning for wikilinks.
- Obsidian block IDs: rejected as a requirement because core Agent Vault functionality should work in raw Markdown and non-Obsidian environments.
- Arbitrary custom XML/HTML tags: deferred because headings and existing generated blocks cover the immediate execution/resume workflows with less syntax surface.
- Full-file reads only: rejected because it fails PHASE-02's context-budget objective and does not mitigate BUG-0001.

## Tradeoffs

- Benefit: selectors are readable in raw Markdown and align with existing note structure.
- Benefit: generated-block balance is already validated by existing mutation/validator code.
- Benefit: graph semantics remain simple: notes link to notes; selectors do not create graph nodes.
- Cost: exact heading matching can fail when headings are duplicated or renamed.
- Cost: arbitrary human-authored ranges outside headings/generated blocks are not first-class in v1.
- Cost: workflows must choose a selector explicitly instead of embedding range syntax in every wikilink.

## Consequences

- `src/core/vault-extract.ts` and the `vault_extract` tool should remain the primary v1 bounded extraction API.
- PHASE-02 must add pi extension parity so pi can use the same tool as the MCP server.
- PHASE-02 must add graph/link regression tests proving selector syntax does not create bogus nodes.
- Future work may add selector-aware `vault_traverse` or a search-provider helper only if dogfooding proves the companion tool and `rg`/`grep` guidance are insufficient.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]
- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_04_add-selector-graph-and-prompt-budget-regression-coverage|STEP-02-04 Add selector graph and prompt-budget regression coverage]]
- Bug: [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-25 - Created as `proposed`.
- 2026-04-25 - Accepted during PHASE-02 refinement after grill-me review.
<!-- AGENT-END:decision-change-log -->
