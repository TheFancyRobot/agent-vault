---
description: Orchestrate vault work with automatic context clearing between units. Execute phase steps sequentially or triage and fix open bugs, each in a fresh subagent. Use when running an entire phase or batch of bugs end-to-end.
---

# Vault Orchestrate

Orchestrate vault work with automatic context clearing between units.

Usage:
- `vault-orchestrate <phase>` -- Execute phase steps sequentially
- `vault-orchestrate bugs` -- Triage and fix all open bugs
- `vault-orchestrate bugs BUG-0001 BUG-0003` -- Fix specific bugs

Arguments:
- phase: Phase number or ID (e.g., "1", "01", "PHASE-01")
- bugs: Switch to bug-fix mode -- each bug gets its own branch (orchestrator handles commits)
- BUG-XXXX: Optional specific bug IDs to fix (only in bugs mode)
- --confirm: Pause between units for user confirmation (default: auto-advance)
- --retry: Max retry attempts per incomplete unit (default: 3)
- --severity: (bugs mode) Only fix bugs at this severity or more severe (e.g., "sev-2" fixes sev-1 and sev-2)

This workflow orchestrates work by spawning a fresh subagent for each unit (step or bug), ensuring complete context clearing between units.

## Workflow (Phase Mode)

### 1. Discover the phase and its pending steps.
- Locate the phase directory under `.agent-vault/02_Phases/` by matching the phase argument (e.g., "1", "01", "PHASE-01" all match `Phase_01_*`).
- Use `vault_traverse` from the phase note at depth 2 (direction: both, include_content: false, note_type: ["step"]) to discover all step notes.
- Filter to pending steps: exclude any with status in {done, completed, closed, cancelled, blocked, on-hold, waiting, waiting-on-dependency}.
- Sort by step ID ascending.
- If no pending steps exist, report that all steps are completed or blocked and stop.

### 2. Verify the git working tree is clean.
If not, stop and ask the user to commit or stash first.

### 3. Show the user a summary before starting:
- Phase name and ID.
- Number of pending steps out of total.
- List each pending step with its ID and title.
- Retry limit.

### 4. For each pending step, in order:
a. Announce: `[N/total] STEP-XX-YY: <title>`
b. If `--confirm` is set, ask the user whether to proceed before spawning the agent.
c. Spawn a single subagent for the step. The agent prompt must be self-contained:
   - Include: `IMPORTANT: Do NOT run git add, git commit, git checkout, or any git commands. The orchestrator manages all git operations automatically after you exit.`
   - Then instruct it to execute the vault step using the vault-execute workflow for `<PHASE-ID> <STEP-ID>`.
   - Nothing else. The vault-execute workflow handles all context loading, readiness, implementation, and validation.
d. After the agent completes, handle git operations:
   - Check `git status --porcelain`. If there are changes:
     - `git add -A`
     - `git commit -m "vault: <PHASE-ID> <STEP-ID> - <title>"`
   - If no changes, that is acceptable.
e. Verify completion: read the step note's frontmatter. Check if the status is in {done, completed, closed, cancelled}. Also check the step-mirror `context_status` field — if it matches {active, paused}, the canonical session may still be open, which indicates the step was not cleanly closed.
f. If completed: announce success with elapsed time and move to the next step.
g. If not completed and retries remain: announce the retry attempt and return to step 4c with a fresh agent.
h. If not completed and no retries remain: announce failure and stop orchestration. Do not continue to the next step.

### 5. After all steps complete, announce phase orchestration complete with a summary.

## Workflow (Bugs Mode)

### 1. Discover open bugs.
- Find all `.md` files under `.agent-vault/03_Bugs/`.
- Read each file's frontmatter to identify bugs:
  - Must have `note_type: bug`.
  - Skip bugs with status in {closed, fixed-awaiting-verification, fixed-awaiting-retest, wont-fix, not-a-bug, duplicate}.
- Apply filters:
  - If specific bug IDs were provided, only include those.
  - If `--severity` is set, only include bugs at that severity or more severe (lower sev number = more severe).
- Sort by severity (most severe first, sev-1 before sev-2), then by bug ID.
- If no open bugs match the filters, report and stop.

### 2. Verify the git working tree is clean.
If not, stop and ask the user to commit or stash first.

### 3. Record the current git branch name.

### 4. Show the user a summary before starting:
- Number of bugs to fix.
- List each bug with ID, title, and severity.
- Severity filter if applied.

### 5. For each bug, in order:
a. Announce: `[N/total] BUG-XXXX: <title> (sev-N)`
b. If `--confirm` is set, ask the user whether to proceed.
c. Create or checkout the git branch `fix/<bug-id-lowercase>-<slug>`:
   - Check if branch exists: `git rev-parse --verify fix/<bug-id>-<slug>`
   - If it exists, `git checkout fix/<bug-id>-<slug>`.
   - If not, `git checkout -b fix/<bug-id>-<slug>`.
d. Spawn a single subagent to fix the bug. The agent prompt must be self-contained:
   - State: `Fix bug <BUG-ID>: "<title>" (severity: <sev-N>).`
   - Include: `IMPORTANT: Do NOT run git add, git commit, git checkout, or any git commands. The orchestrator manages all git operations automatically after you exit.`
   - Include the bug note's relative path.
   - Instruct the agent to:
     1. Load the bug note and related context via `vault_traverse`.
     2. Investigate the codebase to identify the root cause.
     3. Implement the fix.
     4. Add or update tests to prevent regression.
     5. Update the bug note via `vault_mutate`: set status to `closed` and `fixed_on` to today's date, and document the confirmed root cause.
e. After the agent completes, handle git operations:
   - Check for changes. If dirty:
     - Read the bug's frontmatter to check if status is in {closed, fixed-awaiting-verification, fixed-awaiting-retest}.
     - `git add -A`
     - Commit with prefix `fix` if resolved, `wip` if not: `<prefix>(<bug-id-lowercase>): <title>`
f. Verify resolution by checking the bug's frontmatter status.
g. Return to the original branch: `git checkout <original-branch>`.
h. Announce result: fixed (with branch name) or failed.
i. Continue to the next bug regardless of outcome (unlike phase mode, bug mode does not stop on failure).

### 6. Print a summary:
- Fixed bugs with their branch names.
- Failed bugs.
- Exit with failure status if any bugs failed.

## Important Implementation Notes

- Each subagent spawned for a step or bug runs in a fresh context, achieving context isolation automatically.
- Git operations (commits, branch management) happen between agent calls, not inside them.

## Pi-Teams Integration (Optional)

If pi-teams tools are available in the current session (look for `team_create`, `spawn_teammate`, `send_message`, `task_create` tools), you can leverage them for parallel work:

- Spawn research teammates for parallel code exploration and context gathering
- Spawn implementation teammates for work on disjoint file sets  
- Spawn review teammates for parallel security, testing, and integration review
- Use task_create to track work items and task_update to report progress
- Send findings back to team-lead via send_message

When pi-teams is not available, use pi's built-in Agent subagent tool for the same parallel work patterns, or work sequentially.
