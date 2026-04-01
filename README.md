# agent-vault

Durable project memory for coding agents. An Obsidian-compatible vault that provides structured context preservation across agent sessions.

Agent Vault creates a `.agent-vault/` directory in your project with templates, architecture stubs, and shared knowledge files. It integrates with **Claude Code**, **OpenCode**, and **Codex** via MCP (Model Context Protocol).

For larger work, the intended flow is: use `/vault:plan` to turn a request into researched phases and step notes, `/vault:refine` to make the steps execution-ready, `/vault:execute` to implement them with checkpointed feature validation plus regression testing, `/vault:orchestrate` to run an entire phase with automatic context clearing between steps (or to triage and fix open bugs on dedicated branches), `/vault:enrich` to audit and strengthen the wikilink graph so traversals return complete context, and `/vault:resume` to pick up where the last session left off across agent restarts.

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

# 3. Turn a request into phased vault notes:
#    Claude Code / OpenCode: /vault:plan "Add organization-wide SSO and SCIM provisioning"
#    Codex: /prompts:vault-plan "Add organization-wide SSO and SCIM provisioning"

# 4. Refine a planned phase into junior-friendly steps when needed:
#    Claude Code / OpenCode: /vault:refine PHASE-01
#    Codex: /prompts:vault-refine PHASE-01

# 5. Execute a planned phase or step:
#    Claude Code / OpenCode: /vault:execute PHASE-01
#    Claude Code / OpenCode: /vault:execute PHASE-01 STEP-01-02
#    Claude Code / OpenCode: /vault:execute              # infer what to continue, then ask you to confirm
#    Codex: /prompts:vault-execute PHASE-01

# 6. Resume work from a previous session:
#    Claude Code / OpenCode: /vault:resume               # continue from the most recent session
#    Claude Code / OpenCode: /vault:resume --session SESSION-2026-03-25-143022
#    Codex: /prompts:vault-resume

# 7. Orchestrate a full phase with automatic context clearing:
#    Claude Code / OpenCode: /vault:orchestrate PHASE-01
#    Codex: /prompts:vault-orchestrate PHASE-01
#
# Or triage and fix open bugs on dedicated branches:
#    Claude Code / OpenCode: /vault:orchestrate bugs
#    Claude Code / OpenCode: /vault:orchestrate bugs --severity sev-2
#    Claude Code / OpenCode: /vault:orchestrate bugs BUG-0001 BUG-0003

# 8. Enrich the wikilink graph with missing connections:
#    Claude Code / OpenCode: /vault:enrich
#    Claude Code / OpenCode: /vault:enrich PHASE-01
#    Codex: /prompts:vault-enrich

# 9. Record bugs or decisions when execution uncovers them:
#    Claude Code / OpenCode: /vault:create-bug "Login timeout on slow connections"
#    Codex: /prompts:vault-create-bug "Login timeout on slow connections"
#    Claude Code / OpenCode: /vault:create-decision "Choose PostgreSQL over MongoDB"
#    Codex: /prompts:vault-create-decision "Choose PostgreSQL over MongoDB"

# 10. Validate and refresh:
#     Claude Code / OpenCode: /vault:validate    — checks vault integrity
#     Codex: /prompts:vault-validate
#     Claude Code / OpenCode: /vault:refresh     — updates home notes from metadata
#     Codex: /prompts:vault-refresh
```

For ad hoc or manual workflows, the lower-level create commands such as `/vault:create-phase`, `/vault:create-step`, and `/vault:create-session` are still available.

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

- **Claude Code**: Adds MCP server to `~/.claude.json`, copies 14 slash commands to `~/.claude/commands/`
- **OpenCode**: Adds MCP server to `~/.config/opencode/config.json` under `mcp`, copies 14 slash commands to `~/.config/opencode/commands/`
- **Codex**: Adds MCP server to `~/.codex/config.json`, copies 14 custom prompt commands to `~/.codex/prompts/` (invoked as `/prompts:vault-init`, `/prompts:vault-create-phase`, etc.)

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
npx @fancyrobot/agent-vault                                     # Install/update Agent Vault and configure agent tools
bunx @fancyrobot/agent-vault                                    # Same install/update flow via Bun
npx @fancyrobot/agent-vault uninstall                           # Remove MCP server configuration
npx @fancyrobot/agent-vault serve                               # Start MCP stdio server (used by agent tools)
npx @fancyrobot/agent-vault orchestrate <phase|bugs> [options]  # Execute phase steps or fix bugs with context clearing
npx @fancyrobot/agent-vault --help                              # Show usage
```

The `serve` command is called automatically by agent tools via MCP — you don't need to run it manually.

### `orchestrate`

Spawns a fresh agent CLI process per work unit (step or bug), clearing context between units automatically. After each agent process exits, the orchestrator re-reads the unit's frontmatter status from disk to determine whether it completed successfully.

#### Phase mode

Executes each pending step in a phase sequentially.

```bash
agent-vault orchestrate <phase> [--agent opencode|claude|codex] [--confirm] [--retry <n>]
```

The phase argument accepts `1`, `01`, or `PHASE-01` formats. Steps with statuses like `done`, `completed`, `closed`, `cancelled`, `blocked`, `on-hold`, or `waiting` are skipped. If a step is not completed after all retry attempts, the orchestrator stops with a non-zero exit code.

#### Bug mode

Triages and fixes open bugs, each on a dedicated git branch.

```bash
agent-vault orchestrate bugs [BUG-XXXX...] [--severity <sev-N>] [--agent opencode|claude|codex] [--confirm] [--retry <n>]
```

Bug mode requires a clean git working tree. The orchestrator scans `03_Bugs/` for open bug notes, sorts them by severity (most severe first), and for each bug:

1. Creates a `fix/<bug-id>-<slug>` branch (or resumes an existing one)
2. Spawns a fresh agent process with a bug-fix prompt including the bug note context
3. The agent investigates, implements a fix, commits incrementally referencing the bug ID, and updates the bug note status
4. Returns to the original branch before moving to the next bug

Unlike phase mode, bug mode continues to the next bug even if one fails, and prints a summary of fixed and failed bugs with their branch names at the end.

Filter bugs with `--severity sev-2` (fixes sev-1 and sev-2 only) or pass specific bug IDs.

#### Shared options

| Option | Default | Description |
|---|---|---|
| `--agent` | auto-detect (prefers opencode > claude > codex) | Which agent CLI to spawn |
| `--confirm` | off | Pause for confirmation between units |
| `--retry` | 3 | Max retry attempts per incomplete unit |
| `--severity` | all | (bugs mode only) Only fix bugs at this severity or higher |

The orchestrator can also be invoked from inside an agent session via the `/vault:orchestrate` slash command, which locates the CLI binary and runs it through the shell.

```bash
# Phase mode — from terminal or inside an agent session
agent-vault orchestrate PHASE-01 --agent opencode
/vault:orchestrate 2 --agent claude --confirm --retry 5

# Bug mode — fix all open bugs
agent-vault orchestrate bugs
/vault:orchestrate bugs --severity sev-2

# Bug mode — fix specific bugs
agent-vault orchestrate bugs BUG-0001 BUG-0003 --agent opencode
/vault:orchestrate bugs BUG-0001 --confirm
```

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
| `/vault:plan` | `/prompts:vault-plan` | Turn a freeform request into researched phases, executable step notes, and parallelism guidance |
| `/vault:refine` | `/prompts:vault-refine` | Refine all steps in a phase with research, clarifying questions, and a readiness checklist |
| `/vault:execute` | `/prompts:vault-execute` | Execute a planned phase or step, or resume inferred next work, with readiness checks and checkpoint-based feature plus regression validation |
| `/vault:resume` | `/prompts:vault-resume` | Resume work from the most recent session checkpoint, or a specific session, with full handoff context |
| `/vault:orchestrate` | `/prompts:vault-orchestrate` | Execute a phase with context clearing between steps, or triage and fix open bugs on dedicated branches |
| `/vault:enrich` | `/prompts:vault-enrich` | Audit the wikilink graph and apply missing connections for complete traversal context |
| `/vault:validate` | `/prompts:vault-validate` | Run vault integrity checks |
| `/vault:refresh` | `/prompts:vault-refresh` | Refresh all home notes from metadata |

### Recommended Workflow

For non-trivial work, use the commands in this order:

1. `/vault:plan` — turn a request into researched phases and concrete steps.
2. `/vault:refine` — make every step specific enough for safe execution.
3. `/vault:execute PHASE-01` or `/vault:execute PHASE-01 STEP-01-02` — execute a selected target.
4. `/vault:orchestrate PHASE-01` — execute an entire phase with automatic context clearing between steps (each step runs in a fresh agent process).
5. `/vault:enrich` — after execution, audit and strengthen the wikilink graph so future traversals return complete, relevant context.
6. `/vault:resume` — when returning to work in a new agent session, resume from the last session checkpoint with full handoff context.

For bug triage, use `/vault:orchestrate bugs` to fix all open bugs (or filter by severity or specific IDs). Each bug gets its own `fix/<bug-id>-<slug>` branch with incremental commits.

During execution, the agent maintains a single session note for the entire conversation. The session is updated continuously — after each implementation change, test run, or step transition — so that `/vault:resume` always has a current handoff to work from. The agent also works in checkpoints: after each meaningful implementation increment it validates the feature that was just built, then runs regression coverage for the rest of the application before moving on.

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
2. **Plan** — `/vault:plan` turns a freeform request into researched phases, executable step notes, and parallelism guidance; use `/vault:create-phase` and `/vault:create-step` when you want to manage the plan manually
3. **Refine** — `/vault:refine` researches the whole phase, reviews each step, and asks clarifying questions until the steps are junior-friendly and execution-ready
4. **Execute** — `/vault:execute` runs a phase or step only after a readiness-checklist preflight; if no target is supplied it proposes the most likely continuation and asks for confirmation, then executes in checkpoints with feature-level validation plus regression testing after each meaningful increment
5. **Orchestrate** — `/vault:orchestrate PHASE-01` runs all steps in a phase with context clearing between steps; `/vault:orchestrate bugs` triages and fixes open bugs on dedicated branches sorted by severity
6. **Resume** — `/vault:resume` picks up where the last session left off; it reads the previous session's handoff state, determines the continuation target, creates a new session with full context, and transitions into execution
7. **Enrich** — `/vault:enrich` audits the wikilink graph for missing connections, proposes new relationships based on semantic content analysis, and applies approved changes so traversals return complete context
8. **Work** — `/vault:create-session` still works for manual session logging or ad hoc runs outside the execute workflow, but execute creates and updates session notes automatically for the work it performs
9. **Record** — `/vault:create-bug` and `/vault:create-decision` as issues and choices arise
10. **Navigate** — `vault_traverse` to load relevant context before starting work
11. **Update** — `vault_mutate` to update frontmatter (status, timestamps) and append notes to sections
12. **Maintain** — `/vault:refresh` to rebuild indexes and active context, `/vault:validate` to check integrity

### Session Persistence

Each agent conversation uses a single session note that persists for the entire conversation. The session is created when execution begins (via `/vault:execute` or `/vault:resume`) and is updated continuously as work progresses — after each implementation change, test run, step transition, and command execution. The session's Execution Log, Follow-Up Work, and Completion Summary serve as the handoff for the next `/vault:resume`. A new session is only created when the agent starts a new conversation or the user explicitly requests one via `/vault:create-session`.

The execute workflow is intentionally checkpointed: after each meaningful implementation increment, the agent should verify the functionality it just built and run regression coverage for the rest of the application, adding or strengthening tests when current coverage is not enough to prove the app still works.

## Contributing

Development setup and contributor workflow live in `CONTRIBUTING.md`.

## License

MIT
