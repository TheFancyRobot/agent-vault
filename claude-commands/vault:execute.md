Execute a vault phase or step with minimal context and frequent validation.

Usage: /vault:execute [<phase-id> [<step-id>]]

Accept either:
- `PHASE-01`
- `PHASE-01 STEP-01-02`

If no args are supplied, infer the likely target from active context and recent sessions, then ask the user to confirm before coding.

Workflow:

1. Resolve the target.
   - Verify explicit phase/step pairs.
   - If only a phase is supplied, continue the active step or choose the next ready step.
   - If nothing is supplied, infer the likely target from active context and recent sessions.

2. Load the smallest useful context.
   - Keep context loading target-rooted: use `vault_traverse` from the target, not the vault root.
   - For a step, read only the thin step note and parent phase first.
   - For split steps, start with `Execution Brief` and `Validation Plan`.
   - Read linked architecture, bug, decision, dependency, or handoff notes only when needed.
   - Treat `Code_Graph.md` as summary-only; use `vault_lookup_code_graph` for symbol/file discovery.
   - Do not load the full vault, full code-graph index, or every old session.

3. Run a readiness gate.
   - Confirm outcome, dependencies, files, commands, tests, constraints, validation, edge cases, and blockers.
   - If the step is under-specified, stop and route toward refinement.

4. Create or reuse one active session.
   - Use `vault_create` if needed.
   - Keep `Execution Log`, `Changed Paths`, `Validation Run`, `Findings`, and `Follow-Up Work` current with `vault_mutate`.
   - Link new bugs or decisions when discovered.

5. Research, implement, and validate in tight loops.
   - Start with tactical research only when needed.
   - Make the smallest coherent change.
   - Validate after each meaningful increment.
   - If discoveries invalidate assumptions, repair context first.

6. Close the loop.
   - Mark steps complete with `vault_mutate`.
   - Update the final handoff so `/vault:resume` can continue safely.
   - Finish with `vault_refresh` and `vault_validate`.

MCP tools: `vault_traverse`, `vault_lookup_code_graph`, `vault_create`, `vault_mutate`, `vault_refresh`, `vault_validate`.
