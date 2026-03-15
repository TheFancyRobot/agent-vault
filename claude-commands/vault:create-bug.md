Create a new bug note in the vault.

Usage: /vault:create-bug <title> [--step STEP-ID] [--session SESSION-ID]

Call the `vault_create_bug` MCP tool. The bug ID is auto-generated. Optionally link to a related step and session for full traceability.

Example: /vault:create-bug "Generated index loses manual prose" --step STEP-01-02
