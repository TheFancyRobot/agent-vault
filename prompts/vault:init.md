Initialize an Agent Vault for this project.

Call the `vault_init` MCP tool to create the `.agent-vault/` directory scaffold with templates, home notes, architecture stubs, and shared knowledge.

After initialization:
1. Read the scan results to understand the project structure
2. Read key source files to understand the codebase architecture
3. Populate the architecture stubs in `01_Architecture/` with what you learn
4. Run `vault_refresh` with `target: "all"` to update home notes
5. Run `vault_validate` with `target: "all"` to confirm the vault is healthy
