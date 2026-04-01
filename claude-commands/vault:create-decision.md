Create a new decision note in the vault.

Usage: /vault:create-decision <title> [--phase PHASE-ID] [--session SESSION-ID] [--bug BUG-ID]

Call the `vault_create_decision` MCP tool. The decision ID is auto-generated. At least one related note (phase, session, or bug) should be provided for context.

After creating the decision, search the vault for other notes affected by this choice. Use `vault_traverse` from the linked phase or architecture notes (depth 1, both) to discover related phases, steps, bugs, and architecture notes that should reference this decision. Update the decision's `related_notes` frontmatter and generated block with real wikilinks via `vault_mutate`. Also update the affected notes to link back to this decision so the graph is bidirectional.

Example: /vault:create-decision "Use Effect for error handling" --phase PHASE-01
