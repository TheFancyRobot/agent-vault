Orchestrate vault work with automatic context clearing between units.

Usage:
  /vault:orchestrate <phase> [options]                Execute phase steps sequentially
  /vault:orchestrate bugs [options]                   Triage and fix all open bugs
  /vault:orchestrate bugs BUG-0001 BUG-0003 [options] Fix specific bugs

Arguments:
- phase: Phase number or ID (e.g., "1", "01", "PHASE-01")
- bugs: Switch to bug-fix mode -- each bug gets its own branch with incremental commits
- BUG-XXXX: Optional specific bug IDs to fix (only in bugs mode)
- --agent: Which agent CLI to spawn (default: auto-detect, prefers opencode > claude > codex)
- --confirm: Pause between units for user confirmation (default: auto-advance)
- --retry: Max retry attempts per incomplete unit (default: 3)
- --severity: (bugs mode) Only fix bugs at this severity or higher (e.g., "sev-2" fixes sev-1 and sev-2)

This command orchestrates work by spawning a fresh agent CLI process for each unit (step or bug), ensuring complete context clearing between units. The orchestrator monitors completion by checking vault frontmatter status after each agent process exits.

Workflow (phase mode):

1. Locate the agent-vault CLI binary.
   - Check `.agent-vault/.runtime/node_modules/.bin/agent-vault` relative to the project root.
   - If not found, check `~/.agent-vault/.runtime/node_modules/.bin/agent-vault`.
   - If neither exists, use `npx @fancyrobot/agent-vault` as a fallback.

2. Build and run the orchestrate command using the Bash tool.
   Pass through all arguments from the user's invocation:

   <resolved-cli-path> orchestrate <phase> [--agent <agent>] [--confirm] [--retry <n>]

3. The orchestrator runs as a long-lived process. It will:
   - Read the phase and enumerate pending steps from the vault.
   - For each step, spawn a fresh agent CLI process with `/vault:execute <phase> <step>`.
   - Wait for the process to exit, then verify the step's frontmatter status.
   - If the step is completed, advance to the next step.
   - If the step is not completed, retry up to `--retry` times before stopping with an error.
   - If `--confirm` is set, prompt for confirmation before each step.

Workflow (bugs mode):

1. Locate the agent-vault CLI binary (same resolution as phase mode).

2. Build and run the orchestrate command using the Bash tool.
   Pass through all arguments from the user's invocation:

   <resolved-cli-path> orchestrate bugs [BUG-XXXX...] [--severity <sev-N>] [--agent <agent>] [--confirm] [--retry <n>]

   Natural language forms like `fix all bugs` are also accepted.

3. The orchestrator runs as a long-lived process. It will:
   - Require a clean git working tree (no uncommitted changes).
   - Scan `03_Bugs/` for open bug notes, sorted by severity (most severe first).
   - Apply filters: specific bug IDs if provided, severity threshold if `--severity` is set.
   - For each bug:
     a. Create a new git branch `fix/<bug-id>-<slug>` (or resume if it already exists).
     b. Spawn a fresh agent CLI process with a bug-fix prompt.
     c. The agent reads the bug note, investigates, fixes, commits incrementally, and updates the bug status.
     d. After the agent exits, verify the bug's frontmatter status.
     e. Return to the original branch before moving to the next bug.
   - If `--confirm` is set, prompt for confirmation before each bug.
   - Continue to the next bug even if one fails (unlike phase mode which stops on failure).
   - Print a summary of fixed and failed bugs with their branch names.

Do not attempt to execute steps or fix bugs directly. The entire purpose of this command is to delegate each unit to a separate agent process so that context is cleared between units.

Examples:
- /vault:orchestrate PHASE-01
- /vault:orchestrate 2 --agent claude --confirm
- /vault:orchestrate PHASE-03 --retry 5
- /vault:orchestrate bugs
- /vault:orchestrate bugs --severity sev-1
- /vault:orchestrate bugs BUG-0001 BUG-0003 --agent opencode
- /vault:orchestrate fix all bugs
- /vault:orchestrate bugs --confirm --retry 5
