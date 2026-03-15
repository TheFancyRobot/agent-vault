# agent-vault

Durable project memory for coding agents. An Obsidian-compatible vault that provides structured context preservation across agent sessions.

Agent Vault creates a `.agent-vault/` directory in your project with templates, architecture stubs, and shared knowledge files. It integrates with **Claude Code**, **OpenCode**, and **Codex** via MCP (Model Context Protocol).

## Quick Start

```bash
# Install and configure for your agent tools
npx @fancyrobot/agent-vault install

# Inside Claude Code (or other supported tools):
# /vault-init    — creates .agent-vault/ scaffold and scans the project
# /vault-validate — checks vault integrity
# /vault-refresh  — updates home notes from metadata
```

## What It Does

Agent Vault stores durable planning, architecture, bug, decision, and session context in plain Markdown:

```
.agent-vault/
├── 00_Home/          # Dashboard, active context, indexes
├── 01_Architecture/  # System overview, code map, domain model
├── 02_Phases/        # Phased execution plans with steps
├── 03_Bugs/          # Bug records with severity and root cause
├── 04_Decisions/     # Decision records with alternatives and tradeoffs
├── 05_Sessions/      # Timestamped work session logs
├── 06_Shared_Knowledge/  # Standards, playbooks, taxonomy
├── 07_Templates/     # Note contracts and templates
└── .obsidian/        # Graph and plugin config for Obsidian
```

## MCP Tools (7 tools)

| Tool | Description |
|---|---|
| `vault_init` | Initialize vault scaffold and scan project |
| `vault_scan` | Analyze project filesystem |
| `vault_create` | Create notes — `type`: `phase`, `step`, `session`, `bug`, `decision` |
| `vault_mutate` | Edit notes — `action`: `update_frontmatter`, `append_section` |
| `vault_refresh` | Refresh home notes — `target`: `all`, `indexes`, `active_context` |
| `vault_validate` | Check integrity — `target`: `all`, `frontmatter`, `structure`, `links`, `orphans`, `doctor` |
| `vault_help` | List commands or show help for one |

## Install

```bash
npx @fancyrobot/agent-vault install          # Auto-detect and configure
npx @fancyrobot/agent-vault install --dry-run  # Preview changes
npx @fancyrobot/agent-vault uninstall        # Remove configuration
```

### What `install` does

- **Claude Code**: Adds MCP server to `~/.claude/settings.json`, copies slash commands to `~/.claude/commands/`
- **OpenCode**: Adds MCP server to `~/.config/opencode/config.json`
- **Codex**: Adds MCP server to `~/.codex/config.json`

## Development

```bash
bun install
bun test        # vitest
bun run build   # tsup
```

## License

MIT
