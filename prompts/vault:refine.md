Refine every step in a phase until the work is clear enough for a first-day junior developer.

Usage: /vault:refine <phase-id>

Workflow:

1. Load focused phase context.
   - Find the phase by `phase_id:`.
   - Use the phase as the primary root; at most glance at `00_Home/Active_Context`.
   - Use `vault_traverse` from the phase at depth 2 with `include_content: false` to discover linked notes.
   - Read the phase fully, then each step fully.
   - Read full content only for the few linked architecture, bug, and decision notes that actually matter.
   - Treat `Code_Graph.md` as summary-only; use `vault_lookup_code_graph` for exact symbols or likely starting files.
   - Read recent sessions only when unresolved handoff state matters, and then only the relevant sections.

2. Build phase-wide understanding first.
   - Research shared code paths, constraints, validation, and likely risks before asking questions.
   - Run parallel research when useful, including low-cost symbol/file lookup with `vault_lookup_code_graph`.
   - Synthesize a compact phase-level map of workflows, constraints, edge cases, and unknowns.

3. Apply the readiness checklist to every step.
   Confirm:
   - exact outcome and success condition
   - why it matters to the phase
   - prerequisites and dependencies
   - concrete starting files, directories, commands, and tests
   - required reading completeness
   - constraints and non-goals
   - validation commands and manual checks
   - edge cases, failure modes, and recovery expectations
   - security and performance considerations, or explicit not-applicable judgments
   - integration touchpoints, downstream effects, blockers, unresolved decisions, and handoff expectations
   - junior-developer readiness verdict

4. Ask only high-leverage questions.
   - Ask only after the initial research and checklist pass.
   - Keep each batch small and concrete.
   - Ask once for ambiguities that affect multiple steps.
   - Prioritize issues that would cause rework, unsafe implementation, or validation confusion.

5. Strengthen the notes immediately.
   - Update phase and step notes so new requirements live in the vault, not just chat history.
   - Use `vault_mutate` and targeted edits rather than broad rewrites.
   - Create linked bug or decision notes when durable findings emerge.
   - Re-run the checklist after each update.

6. Iterate until execution-ready.
   - Revisit earlier steps if later answers change shared understanding.
   - The bar is junior-safe execution without hidden context.
   - Record unresolved items as blockers or decisions instead of leaving them implicit.

7. Close cleanly.
   - Summarize checklist status for each step, remaining open questions, and which steps are ready.
   - If an active session exists, update its log and follow-up work.
   - Finish with `vault_refresh` and `vault_validate`.

Refinement is complete only when every step passes the readiness checklist and contains enough concrete context, constraints, and validation guidance for safe execution.
