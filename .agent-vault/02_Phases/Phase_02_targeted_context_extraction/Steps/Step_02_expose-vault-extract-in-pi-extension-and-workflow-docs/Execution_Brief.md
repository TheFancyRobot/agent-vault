# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Previous step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- Decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]

## Outcome and Success Condition

- Add `vault_extract` to the pi package extension tool registry so pi users can call the same bounded extraction helper that the MCP server exposes.
- Success means the generated/developer-visible pi tool list includes `vault_extract`, the implementation delegates to `extractVaultNoteTarget`, and docs/skills accurately describe when to use it.

## Why This Matters

- PHASE-02 is being refined inside pi, but the current pi extension does not register `vault_extract`; that makes the new extraction primitive unavailable in the primary dogfood environment.
- This closes the integration gap between `src/mcp-server.ts` and `pi-package/extensions/index.ts`.

## Prerequisites and Setup

- STEP-02-01 must be complete.
- Read the pi extension registration pattern in `pi-package/extensions/index.ts` before editing.
- Read `src/mcp-server.ts` around the existing `vault_extract` tool and mirror its parameters and error behavior.

## Starting Files and Directories

- `pi-package/extensions/index.ts` — add a `pi.registerTool({ name: "vault_extract", ... })` block near `vault_traverse` / `vault_lookup_code_graph`.
- `src/core/vault-extract.ts` — reuse the existing core helper; do not duplicate extraction logic.
- `src/templates/root-agents-md.ts`, `src/templates/agents-md.ts`, `.agent-vault/AGENTS.md`, `AGENTS.md` — verify generated guidance mentions the pi tool only after registration exists.
- `README.md`, `pi-package/skills/vault-execute/SKILL.md`, `pi-package/skills/vault-resume/SKILL.md`, `claude-commands/vault:execute.md`, `claude-commands/vault:resume.md` — only update if wording is inaccurate.

## Implementation Constraints and Non-Goals

- Keep parameter names aligned with MCP: `note_path`, optional `heading`, optional `block`, and `include_markers` defaulting to true.
- Preserve exactly-one-selector validation in the core helper; do not reimplement it separately.
- Do not add selector-aware traversal in this step.
- Do not change generated-block marker syntax.

## Integration Touchpoints

- The extension already imports graph, config, mutation, refresh, and code-graph helpers; add the extraction import beside those core imports.
- The tool should use `resolveVaultRoot(process.cwd())`, matching neighboring tools.
- The output shape should be compact and consistent with MCP server output.

## Edge Cases and Failure Modes

- Missing note: return `isError: true` with the core helper's message.
- Missing heading/block, duplicate heading/block, malformed generated markers: surface the helper/mutation error.
- `include_markers: false` only affects block extraction, not heading extraction.

## Security and Performance

- Security: never accept absolute paths directly; pass normalized vault-relative paths through `extractVaultNoteTarget`.
- Performance: one file read per extraction; no graph rebuild required.

## Handoff Expectations

- If the pi extension API differs from MCP server schemas, document the divergence in Implementation Notes and keep the user-facing parameter names stable.
- If tests for pi extension tools are missing, add focused coverage or document the manual validation gap.
