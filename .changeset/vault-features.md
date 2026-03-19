---
"@fancyrobot/agent-vault": patch
---

### Features

- Add graph-based vault traversal for navigating note relationships
- Add vault config module with `vault_config` MCP tool and config-aware resolver
- Generate `AGENTS.md` and detect Obsidian on `vault init`
- Streamline agent-vault installation flow
- Namespace slash commands as `vault:{command}`
- Improve vault graph cache and backward traversal

### Bug Fixes

- Use atomic writes to prevent race conditions
- Handle nested code fences in heading scanners
- Use UTC for timestamp generation
- Rename package to `@fancyrobot/agent-vault`

### Performance

- Parallelize index note collection

### Other

- Add `--strict` mode to vault-doctor
- Add release workflow
