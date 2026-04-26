---
description: Execute a vault phase or step with focused context loading, readiness checks, and iterative validation.
---

# Vault Execute

Execute either:
- `PHASE-01`
- `PHASE-01 STEP-01-02`

If no args are given, infer the likely target from home notes and recent sessions, then ask the user to confirm before coding.

## Workflow

### 1. Resolve the target
- If both phase and step are supplied, verify the step belongs to the phase.
- If only a phase is supplied, continue the active step or choose the next ready step.
- If nothing is supplied, infer the likely target from active context and recent sessions.
- Once the target is known, switch to target-rooted loading.

### 2. Load the smallest useful context
- Use `vault_traverse` from the target, not the vault root.
- For a phase, discover linked steps and notes, then read only the current or next ready step, the phase, and directly relevant linked notes.
- For a step, read the thin step note and parent phase first, then only explicitly needed linked notes.
- For split step notes, start with `Execution Brief` and `Validation Plan`; use `vault_extract` when only one heading or generated block is needed.
- When working outside MCP helpers, prefer `rg` for local text discovery, fall back to `grep`, and only then use full-file reads.
- Treat `Code_Graph.md` as summary-only; use `vault_lookup_code_graph` for symbol/file lookup.
- Prefer compact handoffs and generated summaries when available.
- Do not read every sibling step, every old session, the full vault, or the full code-graph index by default.

### 3. Run a readiness gate
Confirm the step has enough information for safe execution:
- exact outcome and success condition
- dependencies, files, commands, tests, and required reading
- constraints, non-goals, validation, edge cases, and blockers

If readiness is missing, stop and route back toward refinement instead of guessing.

### 4. Create or reuse one active session
- Reuse the existing active session when possible; otherwise create one with `vault_create`.
- Keep the session canonical and step mirrors thin.
- Use `vault_mutate` to keep `Execution Log`, `Changed Paths`, `Validation Run`, `Findings`, and `Follow-Up Work` current.
- Link new bugs or decisions as they are discovered.

### 5. Research, implement, and validate in tight loops
- Start with tactical research only when needed.
- Keep worker prompts self-contained and minimal.
- Make the smallest coherent change.
- After each meaningful increment, run feature validation and regression validation.
- If discoveries invalidate assumptions, pause, repair context, and re-check readiness.

### 6. Close the loop
- Mark finished steps complete with `vault_mutate`.
- Update the session handoff and completion summary so `vault-resume` can continue safely.
- If the phase is done, mark it complete too.
- Finish with `vault_refresh` and `vault_validate`.

## Rules
- Keep context narrow and target-rooted.
- Read only the notes and sections needed for the current step.
- Never start coding on under-specified work.
- Do not defer all validation to the end.
- Preserve a clean handoff for the next agent.
