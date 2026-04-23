# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: implement routing-oriented step mirrors and update the execution/resume/orchestration workflows so they read and maintain the built-in context subsystem; success means step notes expose only the agreed mirror fields and the workflow docs clearly describe how that state is created and consumed.
- Why this step matters to the phase: this is where the canonical session context becomes operational instead of just stored.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 and STEP-01-02; do not begin until the session contract is already stable.
- Concrete starting files, directories, packages, commands, and tests: start with `src/core/note-generators.ts`, `src/core/note-mutations.ts`, `src/core/note-validators.ts`, the three `claude-commands/vault:*` workflow docs, the matching `pi-package/skills/vault-*` files, and the listed tests.
- Required reading completeness: the Required Reading list is sufficient if read in full, especially STEP-01-02 and the existing execute/resume/orchestrate workflows.
- Implementation constraints and non-goals: step notes are not the canonical store, workflow prompts remain the primary UX, and this step should not invent a second parallel resume/handoff mechanism.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted generator/mutation/install/slash-command tests plus `bun run typecheck`; manually inspect the workflow docs to verify they all reference the same lifecycle and session-reuse behavior.
- Edge cases, failure modes, and recovery expectations: handle switching steps inside one session, resuming a completed step by targeting the next incomplete one, pausing work without losing the active context, and keeping mirrored fields stable when unrelated prose changes.
- Security considerations or explicit not-applicable judgment: keep mirrored step state minimal so a step note does not become a second sensitive handoff store.
- Performance considerations or explicit not-applicable judgment: only update mirrors on lifecycle changes or canonical-session switches to avoid noisy note churn and unnecessary home-note refresh work.
- Integration touchpoints and downstream effects: touches note generation, note mutation, workflow prompts, pi skills, install/rendering tests, and the user-visible execution model described in README.
- Blockers, unresolved decisions, and handoff expectations: no blocker is currently recorded; if workflow prompts cannot express the new lifecycle cleanly, capture a follow-up decision instead of silently diverging from DEC-0001.
- Junior-developer readiness verdict: PASS once the implementer can trace one end-to-end path from active session context -> mirrored step fields -> `/vault:resume` continuation behavior.
