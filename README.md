# agent-vault

Durable project memory for coding agents. An Obsidian-compatible vault that provides structured context preservation across agent sessions.

Agent Vault creates a `.agent-vault/` directory in your project with templates, architecture stubs, and shared knowledge files. It integrates with **Claude Code**, **OpenCode**, and **Codex** via MCP (Model Context Protocol).

Obsidian is optional: the vault uses plain Markdown and wikilinks, so agents can work directly from the filesystem while humans can still use Obsidian's graph, plugins, and CLI when they want to.

## Quick Start

```bash
# 1. Install and configure for your agent tools
npx @fancyrobot/agent-vault

# Or with Bun:
bunx @fancyrobot/agent-vault

# 2. Inside your agent tool, initialize a vault in your project:
#    Claude Code / OpenCode: /vault:init
#    Codex: /prompts:vault-init
#
# This creates the .agent-vault/ scaffold, scans your project,
# and populates architecture stubs with detected metadata.

# 3. Start working — create phases, log bugs, record decisions:
#    Claude Code / OpenCode: /vault:create-phase "Foundation"
#    Codex: /prompts:vault-create-phase "Foundation"
#    Claude Code / OpenCode: /vault:create-bug "Login timeout on slow connections"
#    Codex: /prompts:vault-create-bug "Login timeout on slow connections"
#    Claude Code / OpenCode: /vault:create-decision "Choose PostgreSQL over MongoDB"
#    Codex: /prompts:vault-create-decision "Choose PostgreSQL over MongoDB"

# 4. Validate and refresh:
#    Claude Code / OpenCode: /vault:validate    — checks vault integrity
#    Codex: /prompts:vault-validate
#    Claude Code / OpenCode: /vault:refresh     — updates home notes from metadata
#    Codex: /prompts:vault-refresh
```

## What It Does

Agent Vault stores durable planning, architecture, bug, decision, and session context in plain Markdown:

```
.agent-vault/
├── 00_Home/              # Dashboard, active context, indexes
├── 01_Architecture/      # System overview, code map, domain model
├── 02_Phases/            # Phased execution plans with steps
├── 03_Bugs/              # Bug records with severity and root cause
├── 04_Decisions/         # Decision records with alternatives and tradeoffs
├── 05_Sessions/          # Timestamped work session logs
├── 06_Shared_Knowledge/  # Standards, playbooks, taxonomy
├── 07_Templates/         # Note contracts and templates
└── .obsidian/            # Graph and plugin config for Obsidian
```

Each note type has a canonical template with structured YAML frontmatter (note type, status, IDs, timestamps, relationships) and required headings. Notes are cross-linked with wikilinks, forming a traversable graph that agents can query for focused context.

## Install

```bash
npx @fancyrobot/agent-vault                     # Prompt for global/cwd install and which agents to configure
bunx @fancyrobot/agent-vault                    # Same flow with Bun
npx @fancyrobot/agent-vault --global            # Install/update in ~/.agent-vault without agent prompts
npx @fancyrobot/agent-vault --cwd               # Install/update in $PWD/.agent-vault
npx @fancyrobot/agent-vault --dry-run           # Preview changes without modifying files
npx @fancyrobot/agent-vault uninstall           # Remove configuration
```

### What the installer does

Without `--global`, the installer first asks whether Agent Vault should live in `~/.agent-vault` or in `$PWD/.agent-vault`, then prompts for which detected agent tools should be configured. After that it installs or updates the package inside `.runtime/` under the chosen root.

Detected agent tools can include:

- **Claude Code**: Adds MCP server to `~/.claude.json`, copies 8 slash commands to `~/.claude/commands/`
- **OpenCode**: Adds MCP server to `~/.config/opencode/config.json` under `mcp`, copies 8 slash commands to `~/.config/opencode/commands/`
- **Codex**: Adds MCP server to `~/.codex/config.json`, copies 8 custom prompt commands to `~/.codex/prompts/` (invoked as `/prompts:vault-init`, `/prompts:vault-create-phase`, etc.)

The MCP server configuration points at the installed runtime instead of using `npx` every time. In practice that means the detected Node or Bun executable runs:

```json
{
  "type": "stdio",
  "command": "/absolute/path/to/node-or-bun",
  "args": ["/absolute/path/to/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault/dist/cli.mjs", "serve"]
}
```

Global installs keep runtime files in `~/.agent-vault`; `vault:init` still creates a project-specific `.agent-vault/` in the repo you are working on.

### What `uninstall` does

Removes the MCP server entry from all detected tool configs, deletes the installed command files from `~/.claude/commands/`, `~/.config/opencode/commands/`, and `~/.codex/prompts/`, and removes installed runtime files from `~/.agent-vault/.runtime` and `$PWD/.agent-vault/.runtime` when present.

## CLI Commands

```bash
npx @fancyrobot/agent-vault             # Install/update Agent Vault and configure agent tools
bunx @fancyrobot/agent-vault            # Same install/update flow via Bun
npx @fancyrobot/agent-vault uninstall   # Remove MCP server configuration
npx @fancyrobot/agent-vault serve       # Start MCP stdio server (used by agent tools)
npx @fancyrobot/agent-vault --help      # Show usage
```

The `serve` command is called automatically by agent tools via MCP — you don't need to run it manually.

## Slash Commands

After installation, these commands are available in each tool:

| Claude Code / OpenCode | Codex | Description |
|---|---|---|
| `/vault:init` | `/prompts:vault-init` | Initialize vault scaffold and scan the project |
| `/vault:create-phase` | `/prompts:vault-create-phase` | Create a new phase (auto-generates phase number) |
| `/vault:create-step` | `/prompts:vault-create-step` | Create a step inside a phase |
| `/vault:create-session` | `/prompts:vault-create-session` | Create a timestamped session linked to a step |
| `/vault:create-bug` | `/prompts:vault-create-bug` | Create a bug note (auto-generates bug ID) |
| `/vault:create-decision` | `/prompts:vault-create-decision` | Create a decision note (auto-generates decision ID) |
| `/vault:validate` | `/prompts:vault-validate` | Run vault integrity checks |
| `/vault:refresh` | `/prompts:vault-refresh` | Refresh all home notes from metadata |

## MCP Tools (9 tools)

These tools are exposed via the MCP server and can be called by any MCP-compatible agent:

| Tool | Description |
|---|---|
| `vault_init` | Initialize vault scaffold and scan project |
| `vault_scan` | Analyze project filesystem — returns languages, frameworks, package manager, monorepo shape, test framework, build system, CI, entry points |
| `vault_create` | Create notes — `type`: `phase`, `step`, `session`, `bug`, `decision` |
| `vault_traverse` | Load a connected subgraph for agent context — `root`, `depth`, `direction`, optional filters, `format`: `toon` or `json` |
| `vault_mutate` | Edit notes — `action`: `update_frontmatter`, `append_section` |
| `vault_refresh` | Refresh home notes — `target`: `all`, `indexes`, `active_context` |
| `vault_validate` | Check integrity — `target`: `all`, `frontmatter`, `structure`, `links`, `orphans`, `doctor` |
| `vault_config` | View or update vault configuration (e.g., link resolver preference) |
| `vault_help` | List commands or show detailed help for one |

### `vault_traverse`

The traversal tool loads focused context from the vault graph without pulling everything into the agent's context window.

- Default output is `TOON` format — a token-efficient structured format designed for LLMs
- Traversal follows vault wikilinks and markdown links to build a connected subgraph
- `resolver=filesystem` is the default; `resolver=obsidian` uses the Obsidian CLI if available and falls back cleanly
- Included note content is bounded and truncated to keep MCP responses safe
- Filter by `note_type` and `status` to narrow results

Example:

```json
{
  "root": "02_Phases/Phase_01_Foundation/Phase",
  "depth": 2,
  "direction": "both",
  "format": "toon",
  "note_type": ["phase", "step", "architecture", "decision"],
  "status": ["active", "planned"]
}
```

### `vault_create`

Creates notes with auto-generated IDs and canonical templates:

| Type | ID Format | Example |
|---|---|---|
| `phase` | `PHASE-NNN` | `PHASE-001` |
| `step` | `STEP-NN-NN` | `STEP-01-03` |
| `session` | `SESSION-YYYY-MM-DD-HHMMSS` | `SESSION-2026-03-14-093012` |
| `bug` | `BUG-NNNN` | `BUG-0001` |
| `decision` | `DEC-NNNN` | `DEC-0001` |

Each note is created with structured YAML frontmatter and required headings per note type. Phase creation also creates a `Steps/` subdirectory.

### `vault_validate`

Runs read-only checks against the vault:

| Target | What it checks |
|---|---|
| `frontmatter` | YAML structure and required keys per note type |
| `structure` | Required headings and generated-block balance (AGENT-START/END markers) |
| `links` | Inter-note wikilinks resolve to existing files |
| `orphans` | Notes with no inbound links |
| `all` | All of the above |
| `doctor` | Strict mode — fails on warnings, not just errors |

### `vault_mutate`

Conservative mutations that preserve existing content:

- **`update_frontmatter`** — Set YAML frontmatter fields; preserves unknown keys
- **`append_section`** — Append text to a named heading section

## Vault Initialization

When you run `vault_init` (or `/vault:init`), Agent Vault:

1. Creates the 9-directory scaffold (`00_Home/` through `07_Templates/` plus `.obsidian/`)
2. Scans the project filesystem to detect languages, frameworks, package manager, monorepo shape, test framework, build system, CI, and entry points
3. Writes **7 templates** in `07_Templates/` — canonical note structures for phases, steps, bugs, decisions, sessions, architecture, plus a contracts reference
4. Writes **6 home notes** in `00_Home/` — Dashboard, Active Context, Bugs Index, Decisions Index, Inbox, Roadmap
5. Writes **5 shared knowledge files** in `06_Shared_Knowledge/` — Coding Standards, Prompt Standards, Bug Taxonomy, Definition of Done, Agent Workflow Playbooks
6. Writes **5 architecture stubs** in `01_Architecture/` — System Overview, Code Map, Agent Workflow, Domain Model, Integration Map (populated with scan metadata)
7. Configures Obsidian settings in `.obsidian/`
8. Appends an Agent Vault section to the project-root `AGENTS.md`
9. Detects whether the Obsidian CLI is available and sets the link resolver accordingly

The scan results are returned so the agent can immediately begin populating architecture notes.

## How Agents Use the Vault

A typical workflow:

1. **Initialize** — `/vault:init` scans the project and creates the scaffold
2. **Plan** — `/vault:create-phase` to define phases, `/vault:create-step` for steps within each phase
3. **Work** — `/vault:create-session` to log each work session, linking it to the current step
4. **Record** — `/vault:create-bug` and `/vault:create-decision` as issues and choices arise
5. **Navigate** — `vault_traverse` to load relevant context before starting work
6. **Update** — `vault_mutate` to update frontmatter (status, timestamps) and append notes to sections
7. **Maintain** — `/vault:refresh` to rebuild indexes and active context, `/vault:validate` to check integrity

Agents can resume across sessions by traversing from the active phase or reading the Active Context home note, which tracks the current objective, blockers, and next actions.

## Contributing

Development setup and contributor workflow live in `CONTRIBUTING.md`.

## License

MIT
