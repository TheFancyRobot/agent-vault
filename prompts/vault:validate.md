Validate the Agent Vault integrity.

Call the `vault_validate` MCP tool with `target: "all"` to run all integrity validators:
- Frontmatter shape and required keys
- Required headings and generated-block balance
- Required links between notes
- Orphan detection

Fix any errors before continuing work.
