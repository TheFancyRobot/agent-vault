# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: document the v1 context contract in code-facing terms so later steps can implement it without renaming fields or inventing extra commands; success means the canonical names, aliases, schema fields, enums, and prose-section contract are all explicit and aligned across notes, source, and tests.
- Why this step matters to the phase: every later step depends on the same contract; if this step is fuzzy, persistence, workflow integration, docs, and migration work will churn.
- Prerequisites, setup state, and dependencies: no earlier phase dependency; this is the first internal dependency gate for STEP-01-02 through STEP-01-04.
- Concrete starting files, directories, packages, commands, and tests: start with `src/core/command-catalog.ts`, `src/mcp-server.ts`, `pi-package/extensions/index.ts`, `src/templates/note-templates.ts`, `src/install.ts`, `claude-commands/`, and the targeted tests listed above.
- Required reading completeness: the Required Reading list is sufficient for this step; do not skip the session template, install/rendering code, or DEC-0001.
- Implementation constraints and non-goals: keep `/vault:*` workflow commands primary, add friendly manual names plus aliases, and avoid implementing the full persistence/write-path behavior in this step.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted command-surface tests plus `bun run typecheck`; manually confirm the chosen names and aliases are spelled identically in runtime help, extension metadata, and command docs.
- Edge cases, failure modes, and recovery expectations: preserve backward-compatible aliases, do not break Codex prompt rewriting, and if command-surface wording diverges across files, fix the docs/tests before moving on.
- Security considerations or explicit not-applicable judgment: not security-sensitive beyond avoiding misleading docs that would cause users to write context to the wrong note type.
- Performance considerations or explicit not-applicable judgment: performance impact is negligible in this step because the work is contract definition, not runtime traversal changes.
- Integration touchpoints and downstream effects: STEP-01-02 consumes the schema, STEP-01-03 consumes command names and lifecycle semantics, and STEP-01-04 consumes the final wording for docs/migration notes.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if a new contract choice is needed, capture it in DEC-0001 before implementation continues.
- Junior-developer readiness verdict: PASS once the implementer can point to the exact contract files, values, and validation commands without relying on chat history.
