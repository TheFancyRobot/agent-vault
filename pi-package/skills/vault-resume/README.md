# Vault Resume Skill

Resume work from the last saved session checkpoint in an Agent Vault.

## Overview

This skill enables seamless continuation of work across multiple sessions by:
1. Locating the most recent (or specified) session checkpoint
2. Determining the appropriate continuation target (step or phase)
3. Loading focused context from the vault
4. Creating a new continuation session with handoff information
5. Transitioning into execution workflow

## Usage

### Resume from Most Recent Session

```
vault-resume
```

Automatically finds and resumes from the most recent session in `.agent-vault/05_Sessions/`.

### Resume from Specific Session

```
vault-resume --session session_123456
```

Resumes from a specific session by ID.

## Workflow Details

### Step 1: Locate Previous Session

The skill scans `.agent-vault/05_Sessions/` for session notes, sorted by filename timestamp (newest first). It reads:
- Frontmatter (status, phase, related_bugs, related_decisions)
- Execution Log
- Findings
- Changed Paths
- Follow-Up Work
- Completion Summary

### Step 2: Determine Continuation Target

The skill analyzes the previous session to identify what to continue:
- Extracts phase link from session frontmatter
- Finds the last active step (by checking `related_sessions` in steps)
- Applies priority order:
  1. Resume last active step if still `in-progress`
  2. Continue to next incomplete step in same phase
  3. Close out phase if all steps complete
  4. Move to next planned phase

### Step 3: Load Focused Context

Uses `vault_traverse` to load:
- Target phase and step
- Related architecture notes
- Bugs and decisions
- Previous session details

Traversal recipe:
- Depth 2 from target step
- Direction: both (incoming and outgoing links)
- Include content: true

### Step 4: Create Continuation Session

Creates a new session note with:
- Objective referencing previous session
- Initial Execution Log entry noting the resume
- Copied Follow-Up Work items
- Carried forward related_bugs and related_decisions
- Updates previous session status to `completed` if needed

### Step 5: Transition to Execution

Runs readiness checklist preflight:
- Checks step has clear acceptance criteria
- Validates required context is loaded
- Confirms environment is ready
- If failed: redirects to refinement
- If passed: proceeds to implementation

### Step 6: Maintain Session State

Throughout the conversation:
- Append to Execution Log after each action
- Update Changed Paths after file modifications
- Update Validation Run after tests
- Update Findings when learning new facts
- Update Follow-Up Work as items are discovered/completed
- Handle step transitions within same phase
- Keep session `in-progress` until complete

## Integration with Pi-Teams

When pi-teams tools are available, this skill can leverage:
- Parallel research teammates for context gathering
- Implementation teammates for disjoint file sets
- Review teammates for security/testing review
- Task tracking and messaging

## Example Session Handoff

### Previous Session (in-progress)
```markdown
---
session_id: session_2024_01_15_14_30
status: in-progress
phase: "02_Phases/Phase_01_Foundation/Phase"
related_bugs: ["bug_auth_001"]
related_decisions: ["decision_arch_003"]
---

## Execution Log
14:30 - Started implementing authentication module
14:45 - Fixed JWT validation bug
15:00 - Encountered issue with token refresh

## Follow-Up Work
- [ ] Implement token refresh endpoint
- [ ] Add rate limiting to auth endpoints
```

### New Continuation Session
```markdown
---
session_id: session_2024_01_15_15_15
status: in-progress
phase: "02_Phases/Phase_01_Foundation/Phase"
related_bugs: ["bug_auth_001"]
related_decisions: ["decision_arch_003"]
---

## Objective
Resuming from [[session_2024_01_15_14_30]]. Continuing Step 03.

## Planned Scope
- [ ] Implement token refresh endpoint
- [ ] Add rate limiting to auth endpoints

## Execution Log
15:15 - Resuming from [[session_2024_01_15_14_30]]. Continuing Step 03.
```

## Dependencies

- Agent Vault structure (`.agent-vault/` directory)
- Session notes in `05_Sessions/`
- Phase and step notes with proper frontmatter
- Vault tools: `vault_create`, `vault_mutate`, `vault_traverse`

## Best Practices

1. **Always confirm before resuming** - Show user the continuation target and context
2. **Carry forward state** - Ensure all bugs and decisions are linked in new session
3. **Complete handoff** - Update previous session status and add completion summary
4. **Load focused context** - Don't assume previous context is still valid
5. **Maintain session history** - Keep Execution Log updated for future resumes

## Troubleshooting

### No sessions found
- Ensure `.agent-vault/05_Sessions/` exists and contains session notes
- Consider using `vault-execute` to start fresh if no sessions exist

### Cannot determine continuation target
- Check that session has valid `phase` frontmatter
- Verify phase directory exists and contains step files
- Ensure steps have proper `related_sessions` links

### Readiness check fails
- Review failed items reported by readiness check
- Redirect to `vault-refine` skill to improve step clarity
- Add missing acceptance criteria or validation commands