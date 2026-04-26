Create a new bug note in the vault.

Usage: /vault:create-bug <title> [--step STEP-ID] [--session SESSION-ID]

Call the `vault_create_bug` MCP tool. The bug ID is auto-generated. Optionally link to a related step and session for full traceability.

After creating the bug, search the vault for related notes beyond the immediate step and session. Use `vault_traverse` from the parent phase (depth 1, both) to discover architecture notes, decisions, and other phases that the bug may affect. Update the bug's `related_notes` frontmatter and generated block with real wikilinks via `vault_mutate`.

Example: /vault:create-bug "Generated index loses manual prose" --step STEP-01-02
