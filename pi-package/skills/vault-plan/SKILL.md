---
description: Turn a freeform initiative into researched vault phases and executable step notes. Use when planning a feature, migration, bug-program, refactor, or operational initiative against the vault.
---

# Vault Plan

Turn a freeform initiative into researched vault phases and executable step notes.

Accept a freeform planning request such as a feature, migration, bug-program, refactor, or operational initiative.

## Workflow

### 1. Establish planning context before inventing anything.
- If the repo does not have a vault yet, initialize it with `vault_init`.
- Use `vault_scan`, targeted repo/document searches, and narrow vault discovery to understand the current system, roadmap, existing phases, architecture notes, decisions, bugs, and relevant docs.
- In mature vaults, treat home notes such as `00_Home/Active_Context` as routing/index notes only: use them to spot existing initiatives, active phases, or likely root notes, but do not use them as the main planning context payload.
- Traversal recipe: after identifying likely roots, prefer `vault_traverse` from the most relevant existing phase, architecture, decision, or bug note at depth 1-2 with `direction: outgoing` and `include_content: false`. Then read only the few notes that matter fully (usually the existing phase note, 1-3 architecture notes, any directly relevant decisions or bugs, and the specific step notes you may update). Use a secondary targeted traversal only when the first root misses a needed linked note.
- Restate the request as a planning problem: desired outcome, likely constraints, impacted workflows, and whether this is a new initiative or an update to an existing plan.
- Do not create duplicate phases if the vault already contains the same work under different wording.

### 2. Review existing documents and gather evidence before asking questions.
- Read the most relevant vault notes first, then repo docs such as `README.md`, architecture docs, package manifests, tests, scripts, and source files tied to the request.
- When a source document is doing product or system design, explicitly extract any embedded roadmap, milestone list, named phases, architecture layers, or rollout sequence before deciding plan shape.
- Avoid loading entire phase trees or historical session content when a narrower target-rooted note set answers the question.
- Launch independent research in parallel when useful:
  - Code-path discovery, existing patterns, and likely starting files
  - Requirements gaps, sequencing, validation strategy, and integration risks
  - Security review when the request touches auth, data boundaries, secrets, privacy, destructive operations, or production workflows
- Build a short evidence-backed map of what already exists, what is missing, what must stay unchanged, and what validation surface the plan must cover.

### 3. Define clarifications, then try to answer them yourself first.
- Turn ambiguity into a concrete clarification list.
- For each clarification, search the vault, repo docs, code, tests, and existing decisions to find an answer before involving the user.
- Use external docs only when the plan depends on library, platform, or API behavior that is not knowable from the repo itself.
- Classify each clarification as one of:
  - answered from evidence
  - assumed with rationale
  - blocked on user input
- Record resolved clarifications and assumptions in the relevant phase `Notes` section so they survive chat history.

### 4. Ask the user only for clarifications you cannot safely infer.
- Ask only after the document and code search is done.
- Keep the batch short and high leverage.
- Ask only for ambiguities that materially change phase boundaries, acceptance criteria, security posture, migration behavior, rollout risk, or user-visible outcomes.
- For each question, provide the recommended default and say what would change if the answer differs.
- If the user cannot answer yet, record the uncertainty explicitly as a blocker or open question in the affected phase or step note instead of hiding it.

### 5. Pressure-test the strategy before writing the final plan.
- Research pitfalls for every major strategy, migration path, workflow, or process you intend to put in the plan.
- Check for integrity risks such as hidden dependencies, unsafe ordering, missing rollback paths, validation gaps, flaky test strategy, data loss risk, security regressions, and operational blind spots.
- Prefer plans whose phases and steps can be validated incrementally and whose risky assumptions are made explicit.
- If pitfall research changes the strategy, update the plan shape before creating or editing notes.

### 6. Decide the correct phase shape before creating notes.
- Default to a multi-phase plan when the request or source material describes a full application, platform, architecture, or multi-workstream program.
- If the source document already defines phases, milestones, build stages, or rollout waves, preserve that structure unless repo evidence shows it is obsolete; do not flatten named phases into one phase with many steps.
- Use separate phases when work crosses major subsystem boundaries, changes validation strategy, introduces a new risk profile, or creates an independently reviewable milestone.
- Do not use steps as surrogate phases. If a candidate step would itself define an architecture layer, product surface, connector family, runtime subsystem, or flagship workflow, it probably belongs in its own phase.
- A single phase is appropriate only when the request is already one bounded milestone with one dominant outcome.

### 7. Split the work into bounded phases and make the phase notes the source of truth.
- Create or update phase notes with `vault_create`, `vault_mutate`, and careful targeted markdown edits.
- A phase must be a bounded milestone with a real outcome, not a giant backlog bucket.
- For each phase, make the note concrete:
  - `Objective`: end-state outcome
  - `Why This Phase Exists`: problem solved or risk reduced
  - `Scope`: exact systems, workflows, docs, and tests in play
  - `Non-Goals`: tempting adjacent work that stays out
  - `Dependencies`: prior phases, decisions, tooling, approvals, or blocking unknowns
  - `Acceptance Criteria`: observable completion checks
  - `Notes`: resolved clarifications, unresolved blockers, pitfall notes, and the parallel work map
- Before creating each phase, search the vault for existing architecture, decision, and bug notes related to the phase's scope. Populate the phase's `related_architecture`, `related_decisions`, and `related_bugs` frontmatter and generated blocks with real wikilinks to those notes, not placeholders. If an architecture note does not exist for a subsystem the phase will heavily modify, create one with `vault_create` and link it.

### 8. Split every phase into bite-sized step notes.
- Create step notes with `vault_create`.
- Every step must be one very specific executable prompt that accomplishes exactly one concrete thing required for the phase.
- Do not combine multiple independent edits, migrations, or validations into one step.
- Each step should let an execution agent answer, without guessing:
  - exact outcome
  - why it matters to the phase
  - prerequisites and dependency steps
  - concrete starting files, directories, commands, docs, and tests
  - required reading populated with wikilinks to architecture, decision, and shared-knowledge notes the implementer must read, not just source file paths
  - validation commands or manual checks
  - edge cases or integrity risks relevant to that step
- Put machine-readable sequencing in step `depends_on` frontmatter.
- Write the step body so it reads like a focused execution brief, not a vague reminder.

### 9. Determine parallelism and record it in the phase document.
- Identify which steps can start immediately, which steps can run in parallel after a dependency clears, and which steps must stay strictly sequential.
- Use step `depends_on` frontmatter as the durable sequencing source.
- In the phase `Steps` section, annotate each step list item with short dependency or parallel-group guidance when useful.
- In the phase `Notes` section, add a concise parallel work map such as:
  - `Parallel work map: Step 01 unlocks Steps 02 and 03; Step 04 depends on Step 02; Step 05 is final integration and must run last.`
- If two steps look parallel but would collide in the same files or workflows, treat them as sequential unless you can justify safe partitioning.

### 10. Run a planning integrity pass before stopping.
- Check that every phase and step is grounded in existing evidence, clarified assumptions, or explicit blockers.
- Check that the number of phases matches the scope of the initiative and the source material; if a full-product architecture doc became one phase, that is usually a planning failure.
- Check that every step is small enough for focused execution and names a concrete validation path.
- Check that phase acceptance criteria cover all steps and that the step graph matches the stated parallel work map.
- Check that risky strategies include pitfalls, safeguards, and follow-up verification.
- If the plan is still vague, keep iterating instead of stopping at a pretty outline.

### 11. Close out the planning run cleanly.
- Summarize the created or updated phases, the first executable steps, any unresolved questions, and which steps can run in parallel.
- If an active session exists for this conversation, append a summary of the planning work to the session's `Execution Log` and update `Follow-Up Work` with the recommended next action (typically refinement or execution of the first phase).
- Finish with `vault_refresh` so home notes stay current, then run `vault_validate` to confirm the vault still passes integrity checks.

Planning is complete only when the freeform request has been converted into durable phase and step notes, unanswered clarifications are explicit instead of hidden, strategy pitfalls have been pressure-tested, and each phase note includes enough sequencing and parallelism guidance that execution can begin safely.

## Pi-Teams Integration (Optional)

If pi-teams tools are available in the current session (look for `team_create`, `spawn_teammate`, `send_message`, `task_create` tools), you can leverage them for parallel work:

- Spawn research teammates for parallel code exploration and context gathering
- Spawn implementation teammates for work on disjoint file sets  
- Spawn review teammates for parallel security, testing, and integration review
- Use task_create to track work items and task_update to report progress
- Send findings back to team-lead via send_message

When pi-teams is not available, use pi's built-in Agent subagent tool for the same parallel work patterns, or work sequentially.
