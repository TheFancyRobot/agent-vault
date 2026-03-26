Resume work from the last saved session checkpoint.

Usage: /vault:resume [--session <session-id>]

If no arguments are provided, locate the most recent session file in `.agent-vault/05_Sessions/` and resume from its last recorded state. If `--session` is provided, resume from that specific session.

Workflow:

1. Locate the previous session to resume from.
   - Scan `.agent-vault/05_Sessions/` for session note files, sorted by filename timestamp (newest first).
   - If `--session` is provided, find the matching session by `session_id` frontmatter instead of using the most recent.
   - If no sessions exist, report that there is nothing to resume and suggest `/vault:execute` instead.
   - Read the full session note: frontmatter (`status`, `phase`, `related_bugs`, `related_decisions`), Execution Log, Findings, Changed Paths, Follow-Up Work, and Completion Summary.

2. Determine the continuation target from the previous session.
   - Extract the phase link from the session's frontmatter.
   - Read the Follow-Up Work and Completion Summary sections to understand what remains and what the handoff state is.
   - Identify the step that was last active by checking:
     - Steps that reference this session in their `related_sessions` frontmatter (the most recently linked step is the last active one).
     - Step statuses within the linked phase: look for `in-progress` steps first, then the next `planned` or `not-started` step in listed order.
   - Apply this priority order to select the continuation target:
     - If the previous session's last active step is still `in-progress`, resume that step.
     - If that step is `done` or `completed`, target the next incomplete step in the same phase.
     - If all steps in the phase are complete but the phase is not yet marked complete, target the phase for close-out.
     - If the phase is also complete, find the next planned phase and its first step.
   - Show the user the proposed continuation target with evidence from the previous session (last Execution Log entries, Follow-Up Work items, Completion Summary) and ask for confirmation before proceeding.

3. Load focused context for the continuation.
   - Use `vault_traverse` to load the target phase, target step, related architecture, bugs, decisions, and the previous session note.
   - Read the previous session's Execution Log, Findings, and Follow-Up Work to build a concise handoff briefing for the agent.
   - Read the target step's full content for requirements, acceptance criteria, and validation commands.
   - If the previous session references bugs or decisions, load those too so unresolved issues carry forward.

4. Create a continuation session and prepare for work.
   - Create a new session note linked to the target step using `vault_create` with type `session`.
   - Use `vault_mutate` to update the new session's content:
     - Set the Objective to reference the previous session and state what is being continued.
     - Append an initial Execution Log entry: `HH:MM - Resuming from [[previous session link]]. Continuing <step or phase description>.`
     - Copy unfinished Follow-Up Work items from the previous session into the new session's Planned Scope.
   - If the previous session was still `in-progress`, update its status to `completed` with `vault_mutate` and append a Completion Summary noting the handoff to the new session.
   - This new session is now the active session for the entire conversation. Do not create additional sessions unless the user explicitly requests one via `/vault:create-session`.

5. Transition into execution.
   - Run the readiness-checklist preflight from `vault:execute` step 3 against the target step.
   - If the step passes readiness, proceed with implementation using `vault:execute` steps 5 through 7 (subagents, implement-validate-iterate, close the loop).
   - If the step fails readiness, report the failed items and redirect to refinement.

6. Maintain session state throughout the conversation.
   - Update the active session continuously as work progresses:
     - Append to `Execution Log` after each meaningful action (implementation change, test run, research finding, command execution).
     - Update `Changed Paths` after each file modification.
     - Update `Validation Run` after each test or validation command.
     - Update `Findings` when durable facts are learned.
     - Update `Follow-Up Work` when new work items are discovered or existing items are completed.
   - When switching to a new step within the same phase, append a step-transition entry to the Execution Log, link the session to the new step's Session History, and continue in the same session.
   - When work pauses or the conversation ends, the session's last Execution Log entry and Follow-Up Work section serve as the handoff for the next `/vault:resume`.
   - The session remains `in-progress` unless all targeted work is complete or the user explicitly ends it.

The resumed session must be a seamless continuation. The agent should understand what was done before, what remains, and what the current codebase state is before writing any code. Never start implementation without first confirming the continuation target and understanding the handoff from the previous session.

Examples:
- /vault:resume
- /vault:resume --session SESSION-2026-03-25-143022
