---
description: Create a new session note linked to a step in the Agent Vault. Use when starting a work session on a specific step.
---

# Vault Create Session

Create a new session note linked to a step.

Call the `vault_create` tool with `type: "session"`, providing the step ID. Creates a timestamped session note linked to the given step. Optionally provide an `agent` name to record which agent is working.

Example: Create session for step "STEP-01-02" with agent "pi"
