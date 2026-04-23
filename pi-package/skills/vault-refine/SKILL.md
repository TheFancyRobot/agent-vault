---
description: Refine every step in a vault phase until the work is clear enough for a first-day junior developer. Use when phase steps need more detail, clarity, or readiness validation before execution.
---

# Vault Refine

Refine a phase until each step is clear enough for a first-day junior developer to execute safely.

## Workflow

### 1. Load focused phase context
- Find the phase under `.agent-vault/02_Phases/` by `phase_id:`.
- Use the phase as the primary root; at most glance at `00_Home/Active_Context` to confirm activity.
- Use `vault_traverse` from the phase at depth 2 with `direction: outgoing` and `include_content: false` to discover linked step, architecture, bug, and decision notes.
- Read the phase fully, then each step fully.
- Read full content only for the few linked architecture, bug, and decision notes that are actually relevant.
- Treat `Code_Graph.md` as summary-only; use `vault_lookup_code_graph` when you need exact symbols or likely starting files.
- Read recent sessions only when unresolved handoff state matters, and then only the relevant sections.
- If a needed subsystem note is missing from the initial traversal, do one narrow follow-up traversal instead of broadening the whole load.

### 2. Build phase-wide understanding first
- Research shared code paths, constraints, validation, and likely risks before asking questions.
- Run parallel research when useful:
  - code-path discovery and existing patterns
  - low-cost symbol/file lookup with `vault_lookup_code_graph`
  - missing requirements, integration risks, and validation gaps
  - security/privacy concerns when the phase touches sensitive behavior
- Synthesize a compact phase-level map of workflows, constraints, edge cases, and unknowns.
- Do not ask the user questions yet unless one global ambiguity blocks understanding of the whole phase.

### 3. Apply the readiness checklist to every step
For each step, explicitly confirm:
- exact outcome and success condition
- why the step matters to the phase
- prerequisites, setup state, and dependencies
- concrete starting files, directories, commands, and tests
- required reading completeness
- implementation constraints and non-goals
- validation commands and manual checks
- edge cases, failure modes, and recovery expectations
- security and performance considerations, or an explicit not-applicable judgment
- integration touchpoints and downstream effects
- blockers, unresolved decisions, and handoff expectations
- junior-developer readiness verdict: pass or fail

A step does not pass refinement until each item is concretely answered or explicitly marked not applicable with a short reason.

### 4. Ask only high-leverage questions
- Ask only after the initial research and checklist pass.
- Keep each batch small and concrete.
- Ask once for ambiguities that affect multiple steps.
- Prefer crisp options, defaults, and tradeoffs over open-ended prompts.
- Prioritize checklist failures that would cause rework, unsafe implementation, or validation confusion.

### 5. Strengthen the notes immediately
- Update phase and step notes so new requirements live in the vault, not just chat history.
- Use `vault_mutate` for frontmatter and append-only sections.
- Make targeted edits rather than broad rewrites.
- Strengthen each step until it includes explicit starting points, required reading, constraints, validation, and relevant edge cases.
- Create linked bug or decision notes when durable findings emerge.
- Re-run the checklist after each update.

### 6. Iterate until execution-ready
- Revisit earlier steps if later answers change shared understanding.
- Do not stop at “good enough for a senior engineer.” The bar is junior-safe execution without hidden context.
- If something cannot be clarified, record it as a blocker or unresolved decision.
- If the user declines to answer a needed question, mark the affected checklist items blocked and say why the step is not yet ready.

### 7. Close cleanly
- Summarize checklist status for each step, remaining open questions, and which steps are ready.
- If an active session exists, append the refinement summary to its `Execution Log` and update `Follow-Up Work`.
- Finish with `vault_refresh` and `vault_validate`.

Refinement is complete only when every step passes the readiness checklist and contains enough concrete context, constraints, and validation guidance for safe execution.
