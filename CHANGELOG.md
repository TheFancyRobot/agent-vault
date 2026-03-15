# @fancyrobot/agent-vault

## 0.0.1

### Patch Changes

- 3b0c0e2: Initial release of agent-vault — durable project memory for coding agents.

  - 7 MCP tools: vault_init, vault_scan, vault_create, vault_mutate, vault_refresh, vault_validate, vault_help
  - Scaffold system creates .agent-vault/ with templates, home notes, architecture stubs, shared knowledge, and .obsidian config
  - Filesystem scanner detects languages, frameworks, package manager, monorepo shape, CI, and more
  - Install CLI auto-detects and configures Claude Code, OpenCode, and Codex
  - 8 Claude Code slash commands shipped
  - 41 tests (vitest)
