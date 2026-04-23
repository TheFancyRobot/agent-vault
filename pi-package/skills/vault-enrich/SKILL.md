---
description: Audit the vault wikilink graph and apply missing connections so that future traversals return complete, relevant context. Use when vault notes have sparse links, placeholder wikilinks, or orphaned notes.
---

# Vault Enrich

Audit the vault graph and add missing links so future traversals return complete, relevant context.

Accepts an optional scope:
- no argument: enrich the whole vault
- `PHASE-01`: enrich one phase and its steps
- a note path: enrich one note

## Workflow

### 1. Establish a low-cost baseline
- Run `vault_validate target=all` to surface orphans, missing links, and broken references.
- Start with `vault_traverse` from `00_Home/Dashboard` at depth 3, direction both, `include_content: false` to build a cheap inventory.
- Group discovered non-template notes by type: phase, step, session, bug, decision, architecture.
- If a scope was provided, filter to that scope, but keep the discovered graph for relationship discovery.
- Read full note bodies only later for the small subset of sparse notes and candidate targets you are actively evaluating.

### 2. Rank enrichment targets
Check for:
- empty related frontmatter arrays
- placeholder wikilinks in generated blocks
- empty step `Required Reading`
- missing reciprocal links where the relationship is clearly bidirectional
- orphan notes or shallow session graphs

Prioritize: orphans and empty arrays first, then placeholder links, then missing reciprocals, then required-reading gaps.

### 3. Discover missing relationships
For each sparse note, read only the content you need and extract:
- subsystems, modules, or code paths mentioned
- design choices or constraints
- defects, edge cases, or failure modes
- referenced phases or steps

Use these sources conservatively:
- architecture, decision, bug, phase, and step notes
- `vault_lookup_code_graph` for low-cost symbol/file lookup when code paths matter
- narrow `vault_traverse` calls from candidate targets to verify that a proposed link creates a useful graph path

Do not add structural-noise links. A proposed link must be justified by content overlap or workflow dependency.

### 4. Present proposals for approval
For each note, show:
- note path and title
- each proposed wikilink
- where it would be added
- one-line rationale
- whether a reciprocal link would also be added

Also show total notes to update, total links to add, and total reciprocal links.

### 5. Apply approved changes
Use the smallest safe mutation for each case:
- frontmatter arrays: `vault_mutate update_frontmatter`
- generated blocks: replace or append conservatively
- `Required Reading`: `vault_mutate append_section`
- reciprocal links: mutate the target note the same way

After mutations, run `vault_refresh` and `vault_validate`.

### 6. Report results
- Summarize notes updated, links added, and reciprocal links created.
- List any remaining opportunities that were deferred because no suitable target note exists.
- If orphans remain, suggest the next architecture or decision notes needed to connect them.
- Report any validation issues introduced by the enrichment.

The enrichment pass is complete when notes in scope have real related links, reciprocal links are consistent where needed, `Required Reading` is populated meaningfully, and the vault still validates cleanly.
