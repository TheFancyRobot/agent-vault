# @fancyrobot/agent-vault

## 0.4.1

### Patch Changes

- 85a461c: Improve low-context migration and code-graph behavior.

  - Refresh `Code_Graph.md` into a thin summary note and regenerate `.agent-vault/08_Automation/code-graph/index.json`
  - Make `migrate-step-notes` upgrade legacy step notes and compact code-graph artifacts in one pass
  - Document the migration behavior in README and command help so slash-command users understand the upgrade path

## Unreleased

### Patch Changes

- Add end-to-end pi installer coverage and document pi integration more clearly across the README and contributing guide.
- Ship the missing `vault-migrate-step-notes` bundled pi skill and cover pi tool detection in installer tests.
- Clarify target-rooted context loading guidance in the `vault:execute` workflow prompt.

## 0.4.0

### Minor Changes

- f93f706: Add built-in vault context management, pi package support, new vault workflow skills, and improved traversal/resume behavior for Agent Vault users.

## 0.3.0

### Minor Changes

- d9e97e6: ### Features

  - Add `--insert-before` flag to `create-phase` for positional phase insertion — existing phases from the insertion point onward are automatically renumbered (directories renamed, phase and step IDs updated, all wikilink references across the vault corrected)
  - Add `insert_before` parameter to `vault_create` MCP tool for phase type

  ### Fixes

  - Fix TypeScript narrowing errors for agent type in orchestrator phase and bug execution

## 0.2.0

### Minor Changes

- 4c39fb1: ### Features

  - Add `orchestrate` CLI command for context-clearing step execution — spawns a fresh agent process per step, clearing context between steps automatically
  - Add bug-fix orchestration mode (`orchestrate bugs`) — triages and fixes open bugs on dedicated `fix/<bug-id>-<slug>` branches, sorted by severity, with per-bug isolation and summary reporting
  - Add `/vault:orchestrate` slash command for invoking the orchestrator from inside an agent session
  - Add `/vault:resume` command to resume work from the most recent session checkpoint with full handoff context
  - Add `/vault:enrich` command to audit and strengthen the wikilink graph with missing connections based on semantic content analysis
  - Strengthen wikilink graph usage across all vault commands for more complete traversal context

  ### Documentation

  - Update README with orchestrate phase and bug modes, enrich command, and all new options

## 0.1.2

### Patch Changes

- af291b5: ### Features

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

## 0.2.0

### Minor Changes

- bcbf995: ### Features

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
