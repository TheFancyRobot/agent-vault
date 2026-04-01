Orchestrate a vault phase with automatic context clearing between steps.

Usage: /vault:orchestrate <phase> [--agent <opencode|claude|codex>] [--confirm] [--retry <n>]

Arguments:
- phase: Phase number or ID (e.g., "1", "01", "PHASE-01")
- --agent: Which agent CLI to spawn for each step (default: auto-detect, prefers opencode > claude > codex)
- --confirm: Pause between steps for user confirmation (default: auto-advance)
- --retry: Max retry attempts per incomplete step (default: 3)

This command orchestrates phase execution by spawning a fresh agent CLI process for each step, ensuring complete context clearing between steps. The orchestrator monitors step completion by checking vault frontmatter status after each agent process exits. Each spawned agent uses `vault_traverse` and `vault_mutate` to load context and update step status.

Workflow:

1. Locate the agent-vault CLI binary.
   - Check `.agent-vault/.runtime/node_modules/.bin/agent-vault` relative to the project root.
   - If not found, check `~/.agent-vault/.runtime/node_modules/.bin/agent-vault`.
   - If neither exists, use `npx @fancyrobot/agent-vault` as a fallback.

2. Build and run the orchestrate command using the Bash tool.
   Pass through all arguments from the user's invocation:

   <resolved-cli-path> orchestrate <phase> [--agent <agent>] [--confirm] [--retry <n>]

   If `--agent` was not specified, the orchestrator auto-detects the first available CLI in order: opencode, claude, codex.

3. The orchestrator runs as a long-lived process. It will:
   - Read the phase and enumerate pending steps from the vault.
   - For each step, spawn a fresh agent CLI process with `/vault:execute <phase> <step>`.
   - Wait for the process to exit, then verify the step's frontmatter status.
   - If the step is completed, advance to the next step.
   - If the step is not completed, retry up to `--retry` times before stopping with an error.
   - If `--confirm` is set, prompt for confirmation before each step.

Do not attempt to execute steps directly. The entire purpose of this command is to delegate each step to a separate agent process so that context is cleared between steps.

Examples:
- /vault:orchestrate PHASE-01
- /vault:orchestrate 2 --agent claude --confirm
- /vault:orchestrate PHASE-03 --retry 5
- /vault:orchestrate 1 --agent opencode
