# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
- Bug context: [[03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens|BUG-0001 Built-in context management inflates prompt prefill to 100k+ tokens]]

## Outcome and Success Condition

- Implement the core bounded extraction primitive for vault notes.
- Success means callers can request exactly one selector against one vault-relative note path and receive only that bounded excerpt:
  - `heading` returns the exact markdown heading section, including nested subsections, stopping at the next same-or-higher-level heading.
  - `block` returns an existing `<!-- AGENT-START:name -->` / `<!-- AGENT-END:name -->` generated block, with markers included by default and optionally excluded.
- The extractor must reject ambiguous requests with zero selectors or multiple selectors.

## Why This Matters

- This is the foundation for PHASE-02's targeted context extraction goal and directly mitigates BUG-0001 by giving agents a safe alternative to whole-note reads.
- It preserves the vault graph model by treating headings and generated blocks as selectors, not as new note nodes.

## Prerequisites and Setup

- Start from a clean working tree or clearly isolate local changes.
- Dependencies should already be installed with Bun.
- Required reading before implementation: parent phase, DEC-0002, `src/core/note-mutations.ts`, `src/core/vault-extract.ts`, `test/core/note-mutations.test.ts`, and `test/core/vault-extract.test.ts`.

## Starting Files and Directories

- Core mutation/extraction helpers: `src/core/note-mutations.ts`, `src/core/vault-extract.ts`.
- MCP exposure: `src/mcp-server.ts`.
- Tests: `test/core/note-mutations.test.ts`, `test/core/vault-extract.test.ts`.
- Workflow docs updated by this step: `README.md`, `src/templates/agents-md.ts`, `src/templates/root-agents-md.ts`, `pi-package/skills/vault-execute/SKILL.md`, `pi-package/skills/vault-resume/SKILL.md`, `claude-commands/vault:execute.md`, `claude-commands/vault:resume.md`.

## Implementation Constraints and Non-Goals

- Do not introduce wikilink-like range tags such as `[[tag]] ... [[/tag]]`; they would be parsed as graph links unless the resolver changes.
- Do not require Obsidian block IDs.
- Do not remove full-file read fallbacks from existing workflows.
- Do not make `vault_traverse` selector-aware in this step; use the companion `vault_extract` MCP tool first.

## Integration Touchpoints

- Reuses generated-block parsing and heading scanning in `src/core/note-mutations.ts`.
- Exposes the helper through the MCP server as `vault_extract`.
- Later steps must add pi extension parity and broader regression coverage.

## Edge Cases and Failure Modes

- Missing note path: throw a clear `Note does not exist` error.
- Missing, duplicate, malformed, or nested generated markers: surface existing mutation errors safely.
- Duplicate headings: reject rather than guessing.
- Heading extraction includes nested child headings; this is intentional.
- Windows separators in note paths should normalize to vault-relative POSIX-style paths.

## Security and Performance

- Security: paths must resolve through existing vault-relative path handling; do not permit arbitrary filesystem reads outside the vault.
- Performance: read only the requested note, then slice the bounded section; no vault-wide scan is needed.

## Handoff Expectations

- This step is completed in session [[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837]].
- Remaining PHASE-02 work starts at STEP-02-02, because pi extension parity is missing even though MCP server exposure exists.
