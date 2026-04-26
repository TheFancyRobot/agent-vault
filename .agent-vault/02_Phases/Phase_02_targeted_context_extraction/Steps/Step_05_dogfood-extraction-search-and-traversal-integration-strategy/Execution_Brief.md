# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_05_dogfood-extraction-search-and-traversal-integration-strategy|STEP-02-05 Dogfood extraction search and traversal integration strategy]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]

## Outcome and Success Condition

- Dogfood the targeted extraction workflow and decide whether PHASE-02 needs more built-in machinery beyond `vault_extract`.
- Success means there is a documented, validated answer for both open questions:
  1. Is agent/workflow guidance to prefer `rg` then `grep` enough, or should Agent Vault implement an internal search-provider helper?
  2. Is a companion `vault_extract` tool enough for v1, or should `vault_traverse` accept selector-aware content requests?

## Why This Matters

- PHASE-02 acceptance criteria allow either `vault_traverse` or a companion MCP tool to return bounded excerpts, but the phase also asks for a standard search order.
- Without dogfooding, the project may overbuild APIs or leave a workflow gap hidden until real execution.

## Prerequisites and Setup

- STEP-02-02 and STEP-02-04 should be complete so pi can call `vault_extract` and guardrails exist.
- Use this phase's own notes as the dogfood target: extract `Execution Brief`, `Validation Plan`, and generated step blocks instead of full-note reads where possible.

## Starting Files and Directories

- Workflow prompts: `pi-package/skills/vault-execute/SKILL.md`, `pi-package/skills/vault-resume/SKILL.md`, `pi-package/skills/vault-orchestrate/SKILL.md`, and matching `claude-commands/vault:*` files.
- Tool surfaces: `src/mcp-server.ts`, `pi-package/extensions/index.ts`, `src/core/vault-graph.ts`.
- Docs/templates: `README.md`, `src/templates/root-agents-md.ts`, `src/templates/agents-md.ts`, `.agent-vault/AGENTS.md`, `AGENTS.md`.
- Optional new decision: create a follow-up decision if choosing internal search provider or selector-aware `vault_traverse`.

## Implementation Constraints and Non-Goals

- Default recommendation: keep v1 simple unless dogfooding proves friction. Prefer `vault_extract` companion tool plus `rg`/`grep` workflow guidance for PHASE-02 completion.
- Do not add a broad search API without a concrete use case, tests, and prompt-budget benefit.
- Do not make `vault_traverse(include_content: true)` return large full-note bodies by default.
- Preserve full-file fallback for small notes and constrained environments.

## Integration Touchpoints

- This step may update workflow skills/commands based on dogfood findings.
- This step may create a decision note that supersedes or extends DEC-0002 for traversal/search strategy.

## Edge Cases and Failure Modes

- If `rg` is unavailable, the documented fallback must be `grep`, then full-file read.
- If both `heading` and `block` selectors are supplied, extraction must reject the request; workflows should tell agents to choose one.
- If a workflow asks for a heading that appears multiple times, extraction fails; docs should tell agents to fall back to `rg` or a narrower note.

## Security and Performance

- Security: any future search helper must stay inside the vault/project root and avoid shell injection.
- Performance: dogfood should compare bounded extraction against full-note reads qualitatively or with character counts where easy.

## Handoff Expectations

- Record the final strategy in the phase Notes and, if durable enough, in a decision note.
- If additional implementation is needed, create a new step rather than hiding it in this one.
