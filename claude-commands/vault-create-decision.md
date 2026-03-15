Create a new decision note in the vault.

Usage: /vault-create-decision <title> [--phase PHASE-ID] [--session SESSION-ID] [--bug BUG-ID]

Call the `vault_create_decision` MCP tool. The decision ID is auto-generated. At least one related note (phase, session, or bug) should be provided for context.

Example: /vault-create-decision "Use Effect for error handling" --phase PHASE-01
