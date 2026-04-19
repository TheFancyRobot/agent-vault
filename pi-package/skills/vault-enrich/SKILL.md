---
description: Audit the vault wikilink graph and apply missing connections so that future traversals return complete, relevant context. Use when vault notes have sparse links, placeholder wikilinks, or orphaned notes.
---

# Vault Enrich

Audit the vault's wikilink graph and apply missing connections so that future traversals return complete, relevant context.

Accepts an optional scope:
- no argument: enrich the entire vault
- a phase id such as `PHASE-01`: enrich the phase and all its steps
- a note path such as `02_Phases/Phase_01_Foundation/Steps/Step_01_graph`: enrich a single note

## Workflow

### 1. Run a structural audit to establish a baseline.
- Call `vault_validate` with target `all` to surface orphans, missing links, and broken references.
- Use `vault_traverse` from `00_Home/Dashboard` (depth 3, direction both, include_content true) to load the full vault graph.
- Build an inventory of every non-template note in the vault, grouped by note type (phase, step, session, bug, decision, architecture).
- If a scope was provided, filter the inventory to notes within that scope, but keep the full graph available for relationship discovery.

### 2. Identify sparse notes that need enrichment.
- For each note in the inventory, check for these enrichment opportunities:
  - **Empty related frontmatter**: phase notes with empty `related_architecture`, `related_decisions`, or `related_bugs` arrays; bug and decision notes with empty `related_notes` arrays.
  - **Placeholder wikilinks**: generated blocks containing template placeholders like `[[01_Architecture/<note name>|<architecture note>]]` or `[[04_Decisions/<decision note>|<decision note>]]` instead of real links.
  - **Empty Required Reading**: step notes where the `Required Reading` section has no wikilinks to architecture, decision, or shared-knowledge notes.
  - **Missing reciprocal links**: note A links to note B, but note B does not link back to note A when the relationship is bidirectional (e.g., a decision references a phase but the phase's `related_decisions` does not include that decision).
  - **Orphan notes**: notes with no inbound links, or notes with outbound links but no inbound links.
  - **Shallow session graphs**: session notes that reference bugs or decisions in their Execution Log or Findings prose but do not have matching wikilinks in their `related_bugs` or `related_decisions` frontmatter.
- Rank notes by enrichment priority: orphans and notes with empty frontmatter arrays first, then placeholder links, then missing reciprocals, then Required Reading gaps.

### 3. Discover missing relationships by semantic content analysis.
- For each sparse note, read its full content and extract:
  - Subsystems, modules, or code paths mentioned (match against architecture note titles and content).
  - Design choices or constraints mentioned (match against decision note titles and content).
  - Defects, edge cases, or failure modes mentioned (match against bug note titles and content).
  - Phase or step work referenced (match against phase/step note titles and scope sections).
- For each potential relationship found, verify that the target note exists in the vault and that the link does not already exist.
- Use `vault_traverse` from candidate target notes (depth 1, direction both) to check whether linking would create useful graph paths that connect currently disconnected subgraphs.
- Do not propose links that are purely structural noise (e.g., linking every step to every architecture note). A proposed link must be justified by content overlap or workflow dependency.

### 4. Present enrichment proposals to the user for review.
- Group proposals by note, showing:
  - The note path and title.
  - Each proposed wikilink with:
    - The target note path and title.
    - Where the link would be placed (frontmatter field, generated block, or Required Reading section).
    - A one-line rationale explaining why this relationship exists.
  - Whether the link is reciprocal (if so, note the reverse link that will also be added).
- Show a summary count: total notes to update, total links to add, total reciprocal links.
- Ask the user to approve, reject specific proposals, or approve all.
- If the user rejects specific proposals, remove them from the batch before proceeding.

### 5. Apply approved enrichment changes.
- For each approved proposal, apply the change using the appropriate mutation:
  - **Frontmatter arrays** (`related_architecture`, `related_decisions`, `related_bugs`, `related_notes`, `related_sessions`): use `vault_mutate` with action `update_frontmatter` to append the new wikilink to the existing array.
  - **Generated blocks** (`phase-related-architecture`, `phase-related-decisions`, `phase-related-bugs`, `bug-related-notes`, `decision-related-notes`, `architecture-related-notes`): use `vault_mutate` with action `replace_generated_block` to replace placeholder content with real wikilinks. When the block already has some real links, append the new ones rather than replacing.
  - **Required Reading sections**: use `vault_mutate` with action `append_section` to add wikilink entries under the `Required Reading` heading.
  - **Reciprocal links**: apply the reverse link to the target note using the same mutation strategy.
- After all mutations, call `vault_refresh` to update home note indexes and `vault_validate` to confirm the vault still passes integrity checks.

### 6. Report the enrichment results.
- Summarize what was changed: number of notes updated, number of links added, number of reciprocal links created.
- List any notes that still have enrichment opportunities but were deferred (e.g., because no matching target note exists in the vault yet).
- If orphan notes remain, suggest creating architecture or decision notes to connect them, or propose linking them to existing phases.
- Note any validation issues introduced by the enrichment (there should be none if mutations were applied correctly).

The enrichment pass is complete when every note in scope has real wikilinks in its related frontmatter and generated blocks (no placeholders), Required Reading sections on step notes point to relevant architecture and decision notes, reciprocal links are consistent, and the vault passes validation. Notes where no suitable target exists in the vault should be flagged explicitly rather than linked to irrelevant notes.

## Pi-Teams Integration (Optional)

If pi-teams tools are available in the current session (look for `team_create`, `spawn_teammate`, `send_message`, `task_create` tools), you can leverage them for parallel work:

- Spawn research teammates for parallel code exploration and context gathering
- Spawn implementation teammates for work on disjoint file sets  
- Spawn review teammates for parallel security, testing, and integration review
- Use task_create to track work items and task_update to report progress
- Send findings back to team-lead via send_message

When pi-teams is not available, use pi's built-in Agent subagent tool for the same parallel work patterns, or work sequentially.
