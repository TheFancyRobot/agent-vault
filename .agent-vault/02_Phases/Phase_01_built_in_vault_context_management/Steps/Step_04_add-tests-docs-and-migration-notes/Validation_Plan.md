# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: add the missing proof, documentation, and migration guidance around the new context subsystem; success means the changed behavior is covered by tests, explained in user-facing docs, and accompanied by actionable migration notes for older vault content.
- Why this step matters to the phase: the phase is not shippable until the new context model is test-proven, understandable, and safe to roll out.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 through STEP-01-03 being implemented first.
- Concrete starting files, directories, packages, commands, and tests: start with `test/core/`, `test/install.test.ts`, `test/slash-commands.test.ts`, `README.md`, `claude-commands/`, `pi-package/skills/`, `src/templates/note-templates.ts`, and `src/core/note-validators.ts`; validate with `bun test` and `bun run typecheck`.
- Required reading completeness: the Required Reading list is sufficient if you read the completed implementation steps before editing docs.
- Implementation constraints and non-goals: do not introduce v2 schema ideas here, do not leave README/examples stale, and do not hand-wave migration details with "manual update may be needed" without concrete instructions.
- Validation commands, manual checks, and acceptance criteria mapping: run the full suite plus typecheck; manually inspect rendered command docs/examples to ensure canonical names, aliases, and workflow behavior all match the code and decision note.
- Edge cases, failure modes, and recovery expectations: cover legacy notes missing `context`, legacy sessions without `Context Handoff`, stale workflow docs, and command-rendering regressions for Claude/OpenCode/Codex.
- Security considerations or explicit not-applicable judgment: docs should tell users not to place secrets in context summaries or migration examples.
- Performance considerations or explicit not-applicable judgment: ensure the final docs and tests reinforce the lean-current-state model rather than encouraging oversized frontmatter.
- Integration touchpoints and downstream effects: this step touches all user-facing surfaces and the final regression bar for the phase.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if migration semantics are unclear after implementation, record a follow-up decision or bug instead of shipping vague instructions.
- Junior-developer readiness verdict: PASS once a new engineer can verify the feature with tests and follow the migration/docs trail without needing prior conversation history.
