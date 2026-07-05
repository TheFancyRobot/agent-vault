# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Expand code graph to v3 dependency-aware schema]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Outcome and Success Condition

- `.agent-vault/08_Automation/code-graph/index.json` is generated with a v3 schema along these lines:

  ```ts
  interface CodeGraphIndexV3 {
    version: 3;
    generatedAt: string;
    root: string;
    files: FileSymbolsV3[];
  }

  interface FileSymbolsV3 {
    path: string;
    language: string;
    symbols: CodeSymbolV3[];
    imports?: ImportEdge[];
    exports?: ExportEdge[];
    hash?: string;
    mtimeMs?: number;
    size?: number;
    generated?: boolean;
    vendor?: boolean;
  }

  interface CodeSymbolV3 {
    name: string;
    kind: CodeSymbolKind;
    line: number;
    endLine?: number;
    exported: boolean;
    signature?: string;
    doc?: string;
    parentName?: string;
  }

  interface ImportEdge {
    source: string;
    specifier: string;
    imported?: string[];
    resolvedPath?: string;
    kind?: "static" | "dynamic" | "type";
  }

  interface ExportEdge {
    name?: string;
    source?: string;
    resolvedPath?: string;
    kind?: "named" | "default" | "namespace" | "reexport";
  }
  ```

- `vault_lookup_code_graph` continues to answer symbol/file queries against either a v2 or v3 index (backward compatibility or a clearly reported migration/regeneration path).
- The index records enough metadata (hash/mtime/size) to detect stale entries.

## Why This Matters

- The current v2 index (`version: 2` in `src/core/code-graph-lookup.ts`, regex extraction in `src/scaffold/code-graph.ts`) supports substring symbol lookup but not dependency-aware context retrieval or interface stubbing. Import/export edges feed the ranker's `dependencyEdge` component (STEP-04-02), the stub cache (STEP-04-04), and the context compiler (STEP-04-05).

## Prerequisites and Setup

- None hard. This step may still use regex-level extraction for the new fields where practical (for example import lines are quite regex-tractable in TS); STEP-04-06 later upgrades extraction quality behind the same schema.

## Starting Files and Directories

- `src/scaffold/code-graph.ts` — the generator (`buildCodeGraph`, `buildCodeGraphIndexPayload`, `writeCodeGraph`, `findSymbols`) and current per-language regex extractors; this is where v3 fields are populated. Reuse the existing `SKIP_DIRS` set (node_modules, .git, .agent-vault, dist, build, out) and the 8-level directory depth cap as the ignore/limit baseline.
- `src/core/code-graph-lookup.ts` — the `CodeGraphIndexPayload` type (`version: 2`) and `queryCodeGraphIndex`, which must accept both v2 and v3 per the compatibility decision.
- `test/core/code-graph-lookup.test.ts` and `test/scaffold.test.ts` — the existing tests to extend.
- `src/core/command-catalog.ts` and `src/mcp-server.ts` — refresh/lookup command wiring; no surface change expected, but confirm.
- `test/` — existing code-graph tests to extend.

## Implementation Constraints and Non-Goals

- Versioned schema, with the compatibility split decided during refinement (2026-07-05): `vault_lookup_code_graph` reads both v2 and v3 indexes (v3 is a superset, dual-read is cheap there), while richer consumers — the context compiler (STEP-04-05) and stub cache (STEP-04-04) — require v3 and return a clear "run `vault_refresh` with `target=code_graph`" hint when they find v2. No consumer may crash or silently misparse either version.
- All new fields are optional at read time; missing fields degrade gracefully.
- Resolve `resolvedPath` only within the project root; leave unresolved specifiers (external packages) as specifier-only edges.
- Do not implement stub generation or AST parsing here; only the schema, the generator plumbing, and whatever field population the current extraction approach supports.

## Integration Touchpoints

- STEP-04-02 consumes import/export edges as dependency signals; STEP-04-04 consumes signatures/end lines/hashes; STEP-04-06 swaps in stronger extractors behind this schema; STEP-04-08 uses `generated`/`vendor` flags for exclusion policies.

## Edge Cases and Failure Modes

- Multiline signatures and declarations the regex extractor cannot bound (leave `endLine`/`signature` absent rather than wrong); re-exports and namespace exports; dynamic imports; type-only imports; files that disappear between scan and hash; very large files (respect existing size limits in the generator).

## Security and Performance

- Hashing every indexed file adds I/O; keep the existing file-size and ignore rules, and skip binary files.
- Do not index ignored/vendor directories by default; flag rather than deep-index anything questionable.

## Handoff Expectations

- Record the final v3 TypeScript types in Implementation Notes, since STEP-04-04/05/06 build directly on them. The v2-compatibility split is already decided (lookup dual-reads; richer consumers require v3 with a refresh hint).
