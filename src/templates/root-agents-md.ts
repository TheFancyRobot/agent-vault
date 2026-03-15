/**
 * Template for the project-root AGENTS.md section that tells coding agents
 * about the Agent Vault and its MCP tools.
 */

const AGENT_VAULT_MARKER = '<!-- agent-vault:start -->';
const AGENT_VAULT_MARKER_END = '<!-- agent-vault:end -->';

export { AGENT_VAULT_MARKER, AGENT_VAULT_MARKER_END };

export const ROOT_AGENTS_MD_SECTION = `${AGENT_VAULT_MARKER}

## Agent Vault

This project uses [Agent Vault](https://github.com/fancyrobot/agent-vault) for durable project memory. The vault lives at \`.agent-vault/\` and is managed through MCP tools — do not edit vault files directly unless you understand the mutation rules.

### Quick Start

1. Read \`.agent-vault/00_Home/Active_Context.md\` to understand current focus, blockers, and critical bugs.
2. Follow links outward to the relevant step, phase, and architecture notes.
3. Use the MCP tools below to create and update notes safely.

### MCP Tools

The following tools are available when the \`agent-vault\` MCP server is running:

| Tool | Purpose |
|------|---------|
| \`vault_init\` | Initialize the vault (already done for this project) |
| \`vault_scan\` | Scan project and return structured metadata |
| \`vault_create\` | Create notes: phase, step, session, bug, decision |
| \`vault_traverse\` | Load connected notes via graph traversal (use for context) |
| \`vault_mutate\` | Update frontmatter or append to heading sections |
| \`vault_refresh\` | Rebuild index tables and active context |
| \`vault_validate\` | Check vault integrity (frontmatter, structure, links, orphans) |
| \`vault_help\` | Show detailed help for any vault command |

### Workflow

- **Before work**: Read Active Context, identify the relevant step, create a session note.
- **During work**: Append to session logs, create bug/decision notes as needed, keep links current.
- **After work**: Update step snapshots, refresh indexes, leave the vault coherent.

### Rules

- Use bounded mutations only (frontmatter updates, section appends, generated block replacements).
- Do not rewrite entire notes or delete human-authored content.
- Do not load the entire vault into context — use \`vault_traverse\` for targeted graph loading.
- See \`.agent-vault/AGENTS.md\` for the full operating contract.

${AGENT_VAULT_MARKER_END}
`;
