---
description: Orchestrate phase steps or bug fixes in fresh subagents so each unit starts with a clean context.
---

# Vault Orchestrate

Usage:
- `vault-orchestrate <phase>`
- `vault-orchestrate bugs`
- `vault-orchestrate bugs BUG-0001 BUG-0003`

Goal: run each step or bug in a **fresh** subagent so context does not accumulate across units.

## Phase mode
1. Discover the phase and pending steps with `vault_traverse`.
2. Stop if the git tree is dirty.
3. Show the user the step list and retry policy.
4. For each pending step:
   - announce progress
   - optionally pause for `--confirm`
   - spawn one fresh subagent with a self-contained prompt that says:
     - do not run `git add`, `git commit`, `git checkout`, or any git commands
     - execute `vault-execute <PHASE-ID> <STEP-ID>`
   - after the subagent exits, handle git outside the subagent
   - verify the step status and mirrored `context_status`
   - retry with a new fresh subagent up to the configured limit
5. Stop on an unrecovered step failure; otherwise finish with a phase summary.

## Bugs mode
1. Discover open bug notes under `.agent-vault/03_Bugs/`.
2. Stop if the git tree is dirty.
3. Record the current branch and show the planned bug list.
4. For each bug:
   - create or reuse `fix/<bug-id>-<slug>`
   - spawn one fresh subagent with a self-contained prompt that says:
     - do not run `git add`, `git commit`, `git checkout`, or any git commands
     - load the bug via `vault_traverse`
     - investigate, fix, add regression coverage, and update the bug via `vault_mutate`
   - commit outside the subagent
   - verify the bug status
   - return to the original branch
5. Continue through all requested bugs and print a final summary.

## Rules
- One unit per fresh subagent.
- Git stays with the orchestrator, never inside the worker.
- The worker prompt should be minimal and should delegate implementation detail to `vault-execute` or the bug note.
- Keep worker execution target-rooted: let `vault-execute`/bug investigation use `vault_extract` for bounded reads and prefer `rg`, then `grep`, before broader file loads.
- Because worker prompts are thin wrappers around lower-level workflows, keep them free of direct code-graph instructions; let `vault-execute`/bug investigation use `vault_lookup_code_graph` when symbol lookup is needed.
- Prefer clean retries over letting one long-running context grow.
