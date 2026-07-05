# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04 Build cached source interface-stub generation]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- Depends on: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03]]
- Governing decision: [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003 Deterministic context compiler before optional local reranking]]

## Outcome and Success Condition

- Generated cache layout:

  ```text
  .agent-vault/
  └── 08_Automation/
      ├── code-graph/
      │   └── index.json
      └── code-stubs/
          ├── manifest.json
          └── src_core_vault-graph.ts.<hash>.stub.ts
  ```

- Manifest entries shaped like:

  ```ts
  {
    path: "src/core/vault-graph.ts",
    language: "TypeScript",
    size: 18423,
    mtimeMs: 1783210000000,
    sha256: "...",
    stubVersion: 1,
    parser: "typescript-compiler|tree-sitter|regex",
    stubPath: ".agent-vault/08_Automation/code-stubs/src_core_vault-graph.ts.<hash>.stub.ts"
  }
  ```

- Example of the target output style for TypeScript:

  ```ts
  export interface VaultTraverseParams {
    readonly root: string;
    readonly depth: number;
    readonly direction: VaultTraverseDirection;
    readonly includeContent?: boolean;
  }

  export declare function traverseVaultGraph(
    graph: VaultGraph,
    params: VaultTraverseParams,
    warnings?: string[]
  ): VaultTraverseResult;
  ```

## Why This Matters

- The context compiler (STEP-04-05) needs a lean representation for indirect dependencies. Serving full source for every dependency blows the token budget; serving nothing loses type/signature context. Cached interface stubs are the middle fidelity tier.

## Prerequisites and Setup

- STEP-04-03 code graph v3 (symbols with end lines/signatures, file hashes) provides the extraction inputs. The initial stub generator may run on whatever extraction quality exists at the time (regex-informed), with STEP-04-06 upgrading fidelity behind the same manifest `parser` field.

## Stub Rules

Per [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]]:

- Do not invent behavior.
- Keep exported declarations, public class/interface/type signatures, function and method signatures, and constants where useful.
- Keep useful docstrings/comments where safely extractable.
- Keep import/export relationships where helpful.
- Drop function bodies unless full content is explicitly requested.
- Preserve line references to the original source when possible.
- Mark incomplete or fallback-generated stubs clearly (in the stub header and the manifest).

## Starting Files and Directories

- `src/scaffold/code-graph.ts` — extraction machinery (`buildCodeGraph`, `writeCodeGraph`), the `SKIP_DIRS` ignore set, and generated-artifact conventions to mirror for the new generator (suggested: `src/scaffold/code-stubs.ts`; suggested tests: `test/core/code-stubs.test.ts`).
- `src/core/code-graph-lookup.ts` — how generated indexes are read safely today.
- `src/core/vault-files.ts` — path-safe writes under the vault root and filename sanitization for `stubPath`.
- `src/core/command-catalog.ts` — wire a refresh path (likely a new `vault_refresh` target or inclusion in `code_graph` refresh; record the choice).
- `test/` — Vitest fixtures with known TypeScript inputs and expected stubs.

## Implementation Constraints and Non-Goals

- Cache correctness first: invalidate when source hash/mtime/size changes; a stale manifest entry must never serve a stub for changed source without flagging it.
- Full source remains available only when explicitly requested or when policy marks the file a direct target — the stub cache does not gate direct-target reads.
- No MCP resource surface here (STEP-04-07) and no new parser dependencies here (STEP-04-06); consume whatever extractor exists behind an interface.

## Integration Touchpoints

- STEP-04-05 requests stub content by path for indirect dependencies; STEP-04-07 exposes `vault://code-stub/...` resources from this cache; STEP-04-08 tests its path safety and staleness behavior.

## Edge Cases and Failure Modes

- Source file deleted after manifest write (drop or mark the entry, do not crash); unparseable file (fallback marker, degraded stub or metadata-only entry); hash collisions in sanitized filenames (include hash in name as designed); concurrent refresh runs (last-write-wins on manifest is acceptable if documented).

## Security and Performance

- Stub paths must stay under the vault automation directory; source inputs must stay under the project root.
- Respect the default secret/generated/vendor exclusions (see STEP-04-08); never stub `.env`-like files even if asked, unless explicitly configured.
- Stub generation is cached — repeated context compilation must not re-parse unchanged files.

## Handoff Expectations

- Record the manifest schema, invalidation rules, and refresh wiring in Implementation Notes so STEP-04-05/07 consume them without re-deriving.
