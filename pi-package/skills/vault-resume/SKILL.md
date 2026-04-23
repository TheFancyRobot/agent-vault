---
name: vault-resume
description: Resume work from the last saved session checkpoint using only the latest relevant handoff context.
---

# Vault Resume

Resume from the most recent session, or from `--session <session-id>`.

## Workflow

### 1. Find the session to resume
- Search `.agent-vault/05_Sessions/` newest first, unless a session id was supplied.
- If no sessions exist, report that there is nothing to resume and suggest `vault-execute`.
- Read the frontmatter plus only the latest relevant handoff sections:
  - `Follow-Up Work`
  - `Completion Summary`
  - `Findings`
  - latest relevant `Execution Log` entries
  - latest `Validation Run`
  - `Changed Paths`
- Do not load older history unless the handoff is still ambiguous.

### 2. Determine the continuation target
- Start from the previous session's phase link and step-related links.
- Use step mirrors (`context_id`, `active_session_id`, `context_status`) for fast routing.
- Prefer, in order:
  1. the last active in-progress step
  2. the next incomplete step in the same phase
  3. phase close-out if all steps are done
  4. the next planned phase if the previous phase is fully complete
- Use home notes only as a tie-breaker.
- Show the proposed target and the evidence to the user, then ask for confirmation before coding.

### 3. Load focused continuation context
- Switch to **target-rooted** loading once the target is known.
- Use `vault_traverse` at shallow depth from the target step or phase.
- Read only the target note, its parent phase, and the linked architecture, bug, decision, or dependency notes actually referenced by the handoff.
- For split step notes, start with `Execution Brief` and `Validation Plan`; open `Implementation Notes` or `Outcome` only when the handoff points there.
- Treat `01_Architecture/Code_Graph.md` as a thin summary only. If the handoff or target step needs symbol/file lookup, use `vault_lookup_code_graph` instead of loading the full code-graph index.
- Prefer summaries, lookup results, and the latest relevant sections; do not pull unrelated historical session content.

### 4. Create the continuation session
- Create a new session with `vault_create`.
- Use `vault_mutate` to:
  - reference the previous session in the objective
  - append a resume entry to `Execution Log`
  - copy unfinished `Follow-Up Work`
  - carry forward related bugs and decisions
- If the prior session was still open, close it with a handoff note.

### 5. Continue through execute
- Run the same readiness gate used by `vault-execute`.
- If the target passes readiness, continue with the `vault-execute` workflow.
- If it fails, report the missing context and redirect to refinement.

## Rules
- Read only the latest relevant handoff material.
- Keep the continuation target explicit and user-confirmed.
- Keep context narrow, target-rooted, and section-based.
- Maintain a clean session handoff as work continues.
