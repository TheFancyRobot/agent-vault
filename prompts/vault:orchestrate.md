Orchestrate phase steps or bug fixes in fresh subagents so each unit starts with a clean context.

Usage:
- /vault:orchestrate <phase> [options]
- /vault:orchestrate bugs [options]
- /vault:orchestrate bugs BUG-0001 BUG-0003 [options]

Goal: run each step or bug in a **fresh** subagent while the orchestrator keeps git and retry control.

Workflow (phase mode):

1. Discover the phase and pending steps with `vault_traverse`.
2. Stop if the git tree is dirty.
3. Show the step list and retry policy.
4. For each step:
   - announce progress
   - optionally pause for `--confirm`
   - spawn one fresh subagent whose prompt says:
     - do not run `git add`, `git commit`, `git checkout`, or any git commands
     - execute `/vault:execute <PHASE-ID> <STEP-ID>`
   - handle git only after the subagent exits
   - verify completion from step status and mirrored `context_status`
   - retry with a new fresh subagent until the retry limit is hit
5. Stop on an unrecovered step failure; otherwise print a phase summary.

Workflow (bugs mode):

1. Discover open bug notes under `.agent-vault/03_Bugs/`.
2. Stop if the git tree is dirty.
3. Record the current branch and show the bug list.
4. For each bug:
   - create or reuse `fix/<bug-id>-<slug>`
   - spawn one fresh subagent whose prompt says:
     - do not run `git add`, `git commit`, `git checkout`, or any git commands
     - load the bug via `vault_traverse`
     - investigate, fix, add regression coverage, and update the bug with `vault_mutate`
   - handle git only after the subagent exits
   - verify status and return to the original branch
5. Continue through all requested bugs and print a final summary.

Rules:
- One unit per fresh subagent.
- Git stays with the orchestrator, not the worker.
- Keep worker prompts short and delegate implementation detail to `vault-execute` / `/vault:execute` or the bug note.
- Keep worker execution target-rooted: let `/vault:execute` or bug investigation use `vault_extract` for bounded reads and prefer `rg`, then `grep`, before broader file loads.
- Do not shell out to a hidden CLI orchestration path; keep the work visible in-session.

MCP tools to use: `vault_traverse`, `vault_mutate`.

Examples:
- /vault:orchestrate PHASE-01
- /vault:orchestrate bugs
- /vault:orchestrate bugs BUG-0001 BUG-0003 --confirm
