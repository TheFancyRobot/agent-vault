# @fancyrobot/agent-vault

## 0.1.0

### Minor Changes

- 2270cf6: ### Features

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

## 0.0.1

### Patch Changes

- 3b0c0e2: Initial release of agent-vault — durable project memory for coding agents.

  - 7 MCP tools: vault_init, vault_scan, vault_create, vault_mutate, vault_refresh, vault_validate, vault_help
  - Scaffold system creates .agent-vault/ with templates, home notes, architecture stubs, shared knowledge, and .obsidian config
  - Filesystem scanner detects languages, frameworks, package manager, monorepo shape, CI, and more
  - Install CLI auto-detects and configures Claude Code, OpenCode, and Codex
  - 8 Claude Code slash commands shipped
  - 41 tests (vitest)
