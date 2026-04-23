/**
 * Template for the project-root AGENTS.md section that tells coding agents
 * about the Agent Vault and its MCP tools.
 */

const AGENT_VAULT_MARKER = '<!-- agent-vault:start -->';
const AGENT_VAULT_MARKER_END = '<!-- agent-vault:end -->';

export { AGENT_VAULT_MARKER, AGENT_VAULT_MARKER_END };

export const ROOT_AGENTS_MD_SECTION = `${AGENT_VAULT_MARKER}

## Agent Vault

Use \`.agent-vault/\` as durable project memory. Prefer MCP tools over direct edits.

### Start

1. Read \`.agent-vault/00_Home/Active_Context.md\`.
2. Follow only the links needed for the current task.
3. Create or update notes with MCP tools.

### MCP Tools

- \`vault_traverse\` - load narrow linked context
- \`vault_lookup_code_graph\` - symbol/file lookup without loading the full index
- \`vault_create\` - create phase, step, session, bug, and decision notes
- \`vault_mutate\` - update frontmatter or append sections
- \`vault_refresh\` - rebuild indexes, active context, or code graph
- \`vault_validate\` - run vault integrity checks
- \`vault_help\` - command help

### Rules

- Use bounded mutations only.
- Do not rewrite whole notes or delete human prose.
- Do not load the whole vault by default.
- Treat \`01_Architecture/Code_Graph.md\` as summary-only; use \`vault_lookup_code_graph\` for detail.
- See \`.agent-vault/AGENTS.md\` for the full contract.

${AGENT_VAULT_MARKER_END}
`;
