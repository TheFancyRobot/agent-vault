# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- The tool is registered in the MCP server and documented (README tool table + command catalog).
- It reuses existing traversal/extraction primitives and code graph lookup rather than reimplementing them.
- It supports a token or approximate-token budget and reports `estimatedTokens` and `truncated` in meta.
- Every item carries `kind`, `path`, `renderMode`, `score`, `reasons`, and `estimatedTokens`.
- Output can be compact TOON consistent with existing tool conventions.
- Missing code graph or stub cache produces a degraded result plus a `vault_refresh` hint — not a crash.

## Test Matrix

- Basic coverage for each mode: `plan`, `edit`, `review`, `debug`, `resume` (at least: tool runs, mode is echoed in meta, mode-specific weighting applies where implemented).
- Token budget: a small `max_tokens` triggers pruning of low-score items, keeps mandatory items, and sets `truncated: true`.
- Render policy: direct dependency renders as stub; transitive dependency as summary; active session as excerpt; completed old phase as metadata-only.
- Fail-safe: fixture vault without `08_Automation/code-graph/` returns the refresh hint; corrupt stub manifest degrades per policy.
- Git-less environment: changed-file signals silently absent with a meta warning.
- Path safety: `active_file: "../../etc/passwd"` and absolute paths outside the project root are rejected.

## Manual Checks

- Run the tool in this repo with `task: "improve vault_traverse ranking"`, `active_file: "src/core/vault-graph.ts"`, `mode: "edit"` and read the output top-to-bottom: items, reasons, and rendered fidelity should be self-explanatory and within budget.

## Junior Readiness Verdict

- PASS: input/output contract, render policy, and failure behavior are fully specified; the tool name is decided (`vault_prepare_context`).
