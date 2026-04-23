Audit the vault graph and add missing links so future traversals return complete, relevant context.

Usage: /vault:enrich [<scope>]

Accepts:
- no argument: enrich the whole vault
- `PHASE-01`: enrich one phase and its steps
- a note path: enrich one note

Workflow:

1. Establish a low-cost baseline.
   - Run `vault_validate target=all`.
   - Start with `vault_traverse` from `00_Home/Dashboard` at depth 3, direction both, `include_content: false` to build a cheap inventory.
   - Group discovered non-template notes by type.
   - If a scope was provided, filter to that scope.
   - Read full note bodies only later for the small subset of sparse notes and candidate targets you are actively evaluating.

2. Rank enrichment targets.
   Check for:
   - empty related frontmatter arrays
   - placeholder wikilinks in generated blocks
   - empty step `Required Reading`
   - missing reciprocal links where the relationship is clearly bidirectional
   - orphan notes or shallow session graphs

3. Discover missing relationships.
   - Read only the note content you need.
   - Match subsystems, modules, constraints, defects, and referenced work against existing architecture, decision, bug, phase, and step notes.
   - Use `vault_lookup_code_graph` when code paths matter.
   - Use narrow `vault_traverse` calls from candidate targets to verify that a proposed link creates a useful graph path.
   - Do not add structural-noise links.

4. Present proposals for approval.
   For each note, show:
   - note path and title
   - each proposed link
   - where it would be added
   - one-line rationale
   - whether a reciprocal link would also be added

5. Apply approved changes.
   - Use the smallest safe mutation for each case.
   - After mutations, run `vault_refresh` and `vault_validate`.

6. Report results.
   - Summarize notes updated, links added, and reciprocal links created.
   - List deferred opportunities where no suitable target note exists yet.
   - Suggest the next architecture or decision notes needed if important orphans remain.

The enrichment pass is complete when notes in scope have real related links, reciprocal links are consistent where needed, `Required Reading` is populated meaningfully, and the vault still validates cleanly.
