---
"@fancyrobot/agent-vault": minor
---

### Features

- Add `--insert-before` flag to `create-phase` for positional phase insertion — existing phases from the insertion point onward are automatically renumbered (directories renamed, phase and step IDs updated, all wikilink references across the vault corrected)
- Add `insert_before` parameter to `vault_create` MCP tool for phase type

### Fixes

- Fix TypeScript narrowing errors for agent type in orchestrator phase and bug execution
