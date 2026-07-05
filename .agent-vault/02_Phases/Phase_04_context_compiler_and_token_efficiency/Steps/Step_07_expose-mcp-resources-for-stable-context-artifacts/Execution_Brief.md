# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts|STEP-04-07 Expose MCP resources for stable context artifacts]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Outcome and Success Condition

- MCP resources registered in `src/mcp-server.ts` (via the MCP SDK resource APIs) and documented, with URI shapes along these lines:

  ```text
  vault://note/02_Phases/Phase_01/Phase.md
  vault://code-stub/src/core/vault-graph.ts
  vault://code-summary/src/core/vault-graph.ts
  vault://code-excerpt/src/core/vault-graph.ts#traverseVaultGraph
  ```

- URIs are stable and path-safe: note URIs resolve only inside the vault root; code URIs resolve only inside the project root; traversal attempts (`..`, absolute paths, encoded separators, symlink escapes) are rejected.
- Code stubs and summaries are readable without invoking any mutation-like tool; existing tools continue to work unchanged.

## Why This Matters

- Today every piece of context flows through tool calls. Resources give clients stable, cacheable, addressable artifacts — the natural MCP surface for "read this stub/summary/note again" without re-running the compiler.

## Prerequisites and Setup

- STEP-04-04 provides the stub cache that `vault://code-stub/...` serves. STEP-04-05 defines the summary/excerpt render logic that `vault://code-summary/...` and `vault://code-excerpt/...` reuse. `vault://note/...` can be built first since it only needs existing vault file access.

## Starting Files and Directories

- `src/mcp-server.ts` — currently registers only tools via `server.tool(...)`; no resources exist yet. Add `server.resource(...)` / `ResourceTemplate` registration (`@modelcontextprotocol/sdk` is `^1.12.0`, which supports both).
- `src/core/vault-files.ts` — reuse `assertWithinVaultRoot` / `resolveVaultRelativePath` for `vault://note/...` URIs, and the project-root guard from STEP-04-05 for `vault://code-*` URIs.
- `src/core/vault-extract.ts` — `extractVaultNoteTarget` backs note and excerpt resources.
- `src/scaffold/code-graph.ts` / stub cache module from STEP-04-04 — artifact lookup by path and symbol.
- `README.md` — document the resource surface next to the tool table.

## Implementation Constraints and Non-Goals

- Reads are side-effect free: no regeneration on access; stale artifacts are reported as stale with a refresh hint.
- The `#symbol` fragment in excerpt URIs resolves via the code graph (symbol line/endLine); unknown symbols return a clear not-found, not a whole-file dump.
- Do not build resource subscriptions/change notifications in this step unless trivial with the SDK version in use.
- Do not expose raw full-source resources beyond what the excerpt policy allows; full file content remains a tool-mediated, policy-checked path.

## Integration Touchpoints

- STEP-04-05's output items can reference their resource URIs so clients re-fetch individual artifacts cheaply; STEP-04-08 attacks the URI parser.

## Edge Cases and Failure Modes

- Missing note or stub (not-found with refresh hint where applicable); stale stub (stale flag per STEP-04-04 manifest); URI-encoding tricks (`%2e%2e%2f`); symbols with duplicate names in one file (disambiguate by first match plus warning, or require `name:line`); vault not initialized.

## Security and Performance

- Reuse — do not reimplement — the path safety guards; add URI-specific normalization before they run.
- Resources must not leak secret-like files; apply the same default exclusions as the context compiler (STEP-04-08 policy).

## Handoff Expectations

- Record the final URI grammar and the SDK resource-registration approach in Implementation Notes; note whether resource templates or a static list are used.
