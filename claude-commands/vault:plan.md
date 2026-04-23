Turn a request into durable phase and step notes.

Usage: /vault:plan <request>

Workflow:

1. Establish context.
   - Run `vault_init` if needed.
   - Use `vault_scan`, narrow repo reads, and targeted `vault_traverse`.
   - Treat home notes as routing aids only.
   - Restate the request as outcome, constraints, affected workflows, and whether it is new work or an update.

2. Gather evidence before asking questions.
   - Read only the most relevant vault notes, docs, tests, manifests, scripts, and source files.
   - Treat `Code_Graph.md` as summary-only; use `vault_lookup_code_graph` for symbol/file lookup.
   - Avoid broad phase-tree and session-history loads when narrow reads are enough.

3. Resolve ambiguity yourself first.
   - Search vault, code, docs, tests, and decisions before asking the user.
   - Classify open items as answered, assumed with rationale, or blocked on user input.

4. Ask only high-impact questions.
   - Ask only after the search is done.
   - Ask only about unknowns that materially change phase boundaries, acceptance criteria, migration, rollout risk, security posture, or user-visible outcomes.
   - Provide a recommended default.

5. Pressure-test the strategy.
   - Look for unsafe ordering, hidden dependencies, rollback gaps, weak validation, data loss risk, security regressions, and operational blind spots.
   - Prefer phase and step shapes that can be validated incrementally.

6. Choose the right phase shape.
   - Preserve real rollout waves when repo evidence supports them.
   - Use multiple phases when work crosses major subsystem or validation boundaries.
   - Do not use steps as surrogate phases.

7. Write bounded notes.
   - Use `vault_create` and `vault_mutate`.
   - Phase notes: objective, scope, non-goals, dependencies, acceptance criteria, links.
   - Step notes: exact outcome, prerequisites, starting files, required reading, validation, edge cases.
   - Use `depends_on` for sequencing.

8. Close cleanly.
   - Summarize created or updated phases, first executable steps, unresolved questions, and parallelism.
   - Update the active session if one exists.
   - Finish with `vault_refresh` and `vault_validate`.

Planning is complete only when the request has been turned into durable phase and step notes with explicit blockers and clear sequencing.
