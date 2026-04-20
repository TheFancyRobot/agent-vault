Resume work from the last saved session checkpoint.

Usage: /vault:resume [--session <session-id>]

If no arguments are provided, locate the most recent session file in `.agent-vault/05_Sessions/` and resume from its last recorded state. If `--session` is provided, resume from that specific session.

Workflow:

1. Locate the previous session to resume from.
   - Scan `.agent-vault/05_Sessions/` for session note files, sorted by filename timestamp (newest first).
   - If `--session` is provided, find the matching session by `session_id` frontmatter instead of using the most recent.
   - If no sessions exist, report that there is nothing to resume and suggest `/vault:execute` instead.
   - Read the session frontmatter and only the sections needed for handoff: Follow-Up Work, Completion Summary, Findings, the latest relevant Execution Log entries or checkpoint, latest Validation Run, and Changed Paths. Read older log/history only if the handoff is still ambiguous after inspecting those sections.

2. Determine the continuation target from the previous session.
   - Extract the phase link from the session's frontmatter.
   - Read the Follow-Up Work and Completion Summary sections to understand what remains and what the handoff state is.
   - Check step-mirror fields (`context_id`, `active_session_id`, `context_status`) on step notes for fast routing. A step with `context_status: active` or `context_status: paused` in its mirrors had an active session that may not have been closed cleanly. Prefer these mirrors for initial routing, then confirm by reading the linked session's handoff sections.
   - Identify the step that was last active by checking:
     - Steps that reference this session in their `related_sessions` frontmatter (the most recently linked step is the last active one).
     - Step statuses within the linked phase: look for `in-progress` steps first, then the next `planned` or `not-started` step in listed order.
     - Step mirror `context_status` values: `active` or `paused` indicate an incomplete step; `completed` indicates a finished step.
   - Apply this priority order to select the continuation target:
     - If the previous session's last active step is still `in-progress`, resume that step.
     - If that step is `done` or `completed`, target the next incomplete step in the same phase.
     - If all steps in the phase are complete but the phase is not yet marked complete, target the phase for close-out.
     - If the phase is also complete, find the next planned phase and its first step.
   - If the session handoff leaves multiple plausible targets, use home notes such as `00_Home/Active_Context` only to break the tie. Do not treat home notes as the main resume payload once a target is identified.
   - Show the user the proposed continuation target with evidence from the previous session (latest Execution Log entries, Follow-Up Work items, Completion Summary) and ask for confirmation before proceeding.

3. Load focused context for the continuation.
   - Use target-rooted loading once the continuation target is known.
   - Traversal recipe: start from the target step, or the target phase for close-out work, at depth 1-2 with `direction: outgoing` and `include_content: false` to discover the parent phase, required reading, linked bugs, decisions, architecture notes, and directly relevant sibling or dependency notes.
   - Then read fully only the target step, parent phase, and the small set of linked notes actually referenced by Required Reading or the session handoff.
   - Read only the relevant previous-session handoff material: Follow-Up Work, Completion Summary, Findings, latest relevant Execution Log entries, latest Validation Run, and Changed Paths. If those sections point to a bug or decision, load that note fully; otherwise do not pull unrelated historical session content.
   - If a needed note is reachable only through an inbound link, do a second narrow traversal or explicit read for that note instead of broadening the whole load.

4. Create a continuation session and prepare for work.
   - Create a new session note linked to the target step using `vault_create` with type `session`.
   - Use `vault_mutate` to update the new session's content:
     - Set the Objective to reference the previous session and state what is being continued.
     - Append an initial Execution Log entry: `HH:MM - Resuming from [[previous session link]]. Continuing <step or phase description>.`
     - Copy unfinished Follow-Up Work items from the previous session into the new session's Planned Scope.
     - Carry forward all `related_bugs` and `related_decisions` wikilinks from the previous session's frontmatter into the new session so the graph stays connected across session boundaries.
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
