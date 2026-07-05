# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Expand code graph to v3 dependency-aware schema]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`
3. Regenerate this repo's own index via `vault_refresh` with `target=code_graph` and inspect `.agent-vault/08_Automation/code-graph/index.json`.

## Acceptance Checks

- The generated index declares `version: 3` and includes `generatedAt` and `root`.
- Existing `vault_lookup_code_graph` queries keep working (same matches for symbol/file substring lookups as before, plus any new fields).
- New fields (imports, exports, signature, doc, endLine, hash, mtimeMs, size, generated, vendor) are populated where available and simply absent where not.
- Encountering a v2 index behaves per the decided compatibility split: `vault_lookup_code_graph` reads it compatibly; v3-requiring consumers return a clear regeneration hint — no crash in either path.
- Stale-entry detection is possible from recorded hash/mtime/size.

## Unit Test Matrix

- TypeScript fixture with static imports, type-only imports, dynamic imports, named/default/namespace exports, and re-exports produces the expected edges.
- Classes, interfaces, functions, constants, and methods get symbols; multiline signatures are captured if the extractor supports them, otherwise the fields are absent (assert absence, not wrong values).
- `resolvedPath` stays inside the project root; external package specifiers remain unresolved.
- Generated/vendor flagging matches the ignore/flag rules.
- Loading a v2 fixture index through `queryCodeGraphIndex` returns the same matches as before (dual-read path); loading it through a v3-requiring consumer returns the refresh hint.

## Manual Checks

- Spot-check `src/core/vault-graph.ts` entries in the regenerated index: import edges should match the file's actual import statements.

## Junior Readiness Verdict

- PASS: schema is spelled out, compatibility behavior is an explicit decision point, and fixtures are enumerable.
