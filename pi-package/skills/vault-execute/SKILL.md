---
description: Execute a vault phase or a single step inside a phase with tactical parallel research and validation. Use when ready to implement planned vault work.
---

# Vault Execute

Execute a vault phase, or one step inside a phase, with tactical subagent orchestration.

Accept either:
- a phase id such as `PHASE-01`
- a phase id plus a step id such as `PHASE-01 STEP-01-02`

If no arguments are provided, inspect the vault to determine the most likely work to continue, then prompt the user to verify the proposed target before implementation begins.

## Workflow

### 1. Resolve the execution target before loading context.
- If both `phase-id` and `step-id` are provided, verify that the step belongs to the phase, then target only that step.
- If only `phase-id` is provided, target the phase and determine whether to resume an in-progress step or start the next ready step inside that phase.
- If no arguments are provided, inspect `00_Home/Active_Context.md`, recent session notes, phase and step statuses, and the roadmap to infer the most likely continuation target.
- Use home notes such as `Active_Context` only to infer or confirm the target. Once the target is known, switch to target-rooted loading instead of treating home notes as the main execution payload.
- Prefer, in order: an in-progress step with an active or recent session; otherwise the next non-completed step in the most active phase; otherwise the highest-signal planned phase with clear next work.
- When the target was inferred rather than explicitly provided, show the user the recommended phase and step to continue, explain the evidence briefly, and ask for verification before proceeding. Do not start implementation until the user confirms or corrects the target.

### 2. Load focused context with `vault_traverse`.
- Find the exact phase and step notes under `.agent-vault/02_Phases/` by matching `phase_id:` and `step_id:`.
- Use target-rooted loading. Home notes are only for target inference, not the main context payload.
- If the target is a phase, start from the phase note at depth 2 with `direction: outgoing` and `include_content: false` to discover linked steps and notes. Read the phase note fully, then read only the current step or next ready steps fully, plus the directly relevant architecture, decision, bug, and recent handoff notes. Do not load every step or every historical session in full unless the phase is tiny and all remaining work is immediately in scope.
- If the target is a single step, start from the step at depth 1-2 with `direction: outgoing` and `include_content: false`. Read that step fully and read its parent phase note fully. Load only the linked notes named in Required Reading, dependencies, unresolved bugs or decisions, or the most recent relevant handoff.
- If a target-rooted traversal misses something important because the link is inbound-only, do a second narrow traversal or explicit read for that note instead of switching to a broad both-direction full-content load.

### 3. Enforce a readiness-checklist preflight before coding.
- Use the same readiness dimensions as vault-refine, whether they were explicitly documented during refinement or must be inferred now from the notes and codebase.
- For each target step, confirm all of the following are concretely answered or explicitly marked not applicable with a reason:
  - exact outcome and success condition
  - why the step matters to the phase
  - prerequisites, setup state, and dependencies
  - concrete starting files, directories, packages, commands, and tests
  - required reading completeness
  - implementation constraints and non-goals
  - validation commands, manual checks, and acceptance criteria mapping
  - edge cases, failure modes, and recovery expectations
  - security considerations or not-applicable judgment
  - performance considerations or not-applicable judgment
  - integration touchpoints and downstream effects
  - blockers, unresolved decisions, and handoff expectations
- Restate the exact requirements and name the files, commands, tests, and workflows most likely to change.
- If the target is a phase, do this preflight for every remaining step before implementation begins.
- If any step fails readiness, do not implement that step yet. Report the failed checklist items, update the vault with the missing context if you can do so safely, and direct the workflow back to refinement rather than guessing.
- Only proceed to implementation for steps that pass the readiness gate.

### 4. Create or reuse the active session and maintain it throughout execution.
- If no active session exists for this conversation, create a single session note linked to the first step being executed. This session persists for the entire conversation. Do not create additional sessions for subsequent steps; reuse the same session.
- If an active session already exists (from vault-resume, an earlier vault-execute in the same conversation, or another vault command), continue using it rather than creating a new one.
- Update step frontmatter to `in-progress` when work starts on each step.
- When a session is created or linked to a step, step-mirror fields (`context_id`, `active_session_id`, `context_status`, `context_summary`) are written from the canonical session context. These mirrors provide durable routing without being the source of truth — the session note remains canonical. Mirrors update only on lifecycle transitions or when the active canonical session changes.
- When work begins on a new step within the same session, link the session to that step's `Session History` via `vault_mutate` and append a step-transition entry to the session's `Execution Log`.
- Update the session continuously as work progresses:
  - Append to `Execution Log` after each meaningful action: implementation change, test run, research finding, or command execution.
  - Update `Changed Paths` after each file modification.
  - Update `Validation Run` after each test or validation command.
  - Update `Findings` when durable facts are learned.
  - Update `Follow-Up Work` when new items are discovered or existing items are completed.
- When you discover that a step touches a subsystem, architecture concern, decision, or bug not currently linked, update the step's and session's frontmatter with the new wikilink via `vault_mutate`. The graph should grow richer as execution reveals real relationships.
- Treat every cohesive feature, integration slice, or other meaningful increment as an explicit execution checkpoint.
- At each checkpoint, record what was completed, what remains, and which validations proved the application still works.
- Append the final result to each completed step's `Outcome Summary`.
- If the work uncovers a durable defect or design choice, create a bug or decision note with `vault_create` and link it from the session.

### 5. Use subagents tactically, and launch independent work in parallel in a single message.
- Start with parallel research when the task is non-trivial:
  - Code-path discovery and current behavior
  - Security risks and edge cases
  - Performance risks, validation strategy, and likely regressions
- Use one implementation pass for cohesive changes. Split into multiple parallel efforts only when the work can be partitioned into disjoint files or workflows without merge conflicts.
- Every worker prompt must be self-contained: include the target step or phase goal, acceptance criteria, relevant note excerpts, key code paths, required validations, and any constraints discovered during research.

### 6. Implement, validate, and iterate until the target is genuinely done.
- Make the smallest coherent change that satisfies the current step or subtask.
- Group related edits into cohesive feature increments rather than waiting until the entire phase is done.
- After each meaningful change or cohesive feature increment, stop at a checkpoint and validate before continuing.
- At every checkpoint, run both:
  - feature-focused validation for the exact functionality just implemented
  - regression validation for the rest of the application using the best available suite or workflow coverage
- Expand tests when necessary so the changed feature and surrounding regressions are actually covered, instead of relying on a thin or irrelevant test run.
- Run targeted checks first, then broader project validation, and do not continue building on a broken application state.
- After each implementation pass, run verification in parallel when useful:
  - requirements and acceptance criteria verification
  - test and edge-case review
  - integration or end-to-end verification
  - security review
  - performance review for hot paths, query patterns, expensive loops, bundle/runtime cost, or other likely bottlenecks
  - wikilink audit: verify that step and session notes link to all architecture, decision, and bug notes the work actually touched; add missing links with `vault_mutate` so future traversals return complete context
- Treat credible findings as more work to do, not as a final report. Fix issues, rerun the affected validations, and continue until requirements are met or you hit a real external blocker.
- If new implementation discoveries invalidate the original readiness assumptions, pause that step, repair the missing context in the vault, and re-check readiness before continuing.

### 7. Close the loop in the vault and leave a clean handoff.
- Mark completed steps with `vault_mutate` frontmatter updates (including `context_status: completed` in the step mirrors) and note blocked items explicitly if anything remains open.
- Update the session's canonical context status to `completed` via `vault_mutate`, then update the step mirrors to reflect the new status. This ensures vault-resume can read either the session or the step mirror and get the same lifecycle answer.
- Update the session's `Follow-Up Work` with any remaining items and write a `Completion Summary` that captures what was accomplished, what remains, and what the next agent should do. This is the primary handoff mechanism for vault-resume.
- The session remains `in-progress` unless all targeted work is complete or the user explicitly ends it. An open session signals that vault-resume should continue from this point.
- If a whole phase is complete, update the phase status as well and mark the session as `completed`.
- Finish with `vault_refresh` so home notes stay current, then run `vault_validate` to confirm the vault still passes integrity checks.

Do not stop after the first implementation pass. Keep using tactical research, parallel reviews, targeted fixes, checkpoint validations, and reruns until the phase or step meets its requirements, handles edge cases well, is acceptably secure and performant, and has a documented validation trail. Also do not start implementation on under-specified work: if the readiness gate fails, stop execution for that step and push the workflow back toward refinement instead of inventing missing requirements. When the target was inferred, verification from the user is mandatory before any coding begins. Never defer all testing to the end of the phase: each meaningful increment must leave the application in a working, regression-checked state.

## Pi-Teams Integration (Optional)

If pi-teams tools are available in the current session (look for `team_create`, `spawn_teammate`, `send_message`, `task_create` tools), you can leverage them for parallel work:

- Spawn research teammates for parallel code exploration and context gathering
- Spawn implementation teammates for work on disjoint file sets  
- Spawn review teammates for parallel security, testing, and integration review
- Use task_create to track work items and task_update to report progress
- Send findings back to team-lead via send_message

When pi-teams is not available, use pi's built-in Agent subagent tool for the same parallel work patterns, or work sequentially.
