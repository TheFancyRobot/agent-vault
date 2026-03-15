Create a new session note linked to a step.

Usage: /vault:create-session <step-id> [--agent <name>]

Call the `vault_create_session` MCP tool. Creates a timestamped session note linked to the given step. Use --agent to record which agent is working.

Example: /vault:create-session STEP-01-02 --agent "Claude Code"
