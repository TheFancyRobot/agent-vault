---
note_type: phase
template_version: 2
contract_version: 1
title: Context compiler and token efficiency
phase_id: PHASE-04
status: planned
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
depends_on:
  - '[[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[01_Architecture/Code_Graph|Code Graph]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
related_decisions:
  - '[[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003 Deterministic context compiler before optional local reranking]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 04 Context compiler and token efficiency

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Turn Agent Vault's existing token-saving primitives into a deterministic, explainable, token-budgeted context compiler: a new `vault_prepare_context` MCP tool backed by deterministic relevance ranking, a dependency-aware code graph v3, cached source interface stubs, and MCP resources for stable context artifacts.
- Keep the default retrieval path deterministic, explainable, cacheable, and testable; a local reranker is a later opt-in plugin only, per [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]].

## Why This Phase Exists

- Agent Vault already ships useful primitives: compact TOON output, bounded `vault_traverse` (direction/depth/`max_notes`/excerpts), `vault_extract` for bounded note sections, step splitting, a generated code graph under `08_Automation/code-graph/`, `vault_lookup_code_graph`, `vault_refresh` with a `code_graph` target, and vault-relative path safety guards.
- However, vault graph traversal is not relevance-ranked against the immediate task or file being edited, and candidate context is bounded by count/character limits rather than a task-aware token budget.
- The code graph is a lightweight regex-based v2 index (name/kind/line/exported per symbol; see `src/scaffold/code-graph.ts` and `src/core/code-graph-lookup.ts`). It has no import/export edges, signatures, docstrings, end lines, or hashes, so it cannot power dependency-aware retrieval or interface stubbing.
- There is no dedicated context compiler that gathers candidates from vault notes, active steps/sessions, code graph data, and changed files, ranks them, budgets them by tokens, and renders each item at the right fidelity; there is no interface-stub cache for lean representations of indirect dependencies; MCP resources are not yet used for stable context artifacts.
- The README understates the generated automation area and still documents `vault_refresh` targets as only `all`/`indexes`/`active_context` even though `code_graph` exists.

## Scope

- Documentation cleanup for the generated `08_Automation/` area, the existing `code-graph/`, the reserved `code-stubs/` cache, and the `vault_refresh` `code_graph` target (STEP-04-01).
- A deterministic relevance-ranking module with explainable score reasons for vault-note and source-file candidates (STEP-04-02).
- Code graph v3: versioned schema with import/export edges, signatures, docstrings, end lines, hashes/mtimes/sizes, and generated/vendor flags, with graceful degradation (STEP-04-03).
- A cached interface-stub generator under `08_Automation/code-stubs/` serving source interface skeletons extracted from real source (STEP-04-04).
- A `vault_prepare_context` MCP tool that compiles ranked, token-budgeted, fidelity-tiered context from existing primitives (STEP-04-05).
- A parser abstraction with TypeScript compiler / Tree-sitter-backed extraction and the existing regex extractor kept as fallback (STEP-04-06).
- MCP resources for notes, code stubs, summaries, and excerpts under stable `vault://` URIs (STEP-04-07).
- Cross-cutting security, path safety, secret exclusion, and prompt-budget validation tests (STEP-04-08).
- An optional, opt-in local reranker plugin that never becomes the default (STEP-04-09).

## Non-Goals

- Do not make ranking depend on embeddings, GPUs, network calls, or local model availability; the default ranker stays deterministic.
- Do not treat wikilinked vault notes as source-file dependencies; wikilinks connect vault Markdown notes, while source files flow through the code graph, import/export analysis, explicit note-to-code references, and active edit context.
- Do not generate "pseudo-code" stubs that invent behavior; interface stubs are extracted from actual source and drop bodies without approximating them.
- Do not discard a fixed bottom percentage of candidates; prune by token budget, minimum relevance score, and required-inclusion rules.
- Do not remove or immediately replace the regex extractor; it remains the fallback parser.
- Do not implement the PHASE-03 migration system here; schema versioning in this phase only needs its own compatibility story.

## Dependencies

- Linear ordering after [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]; PHASE-03 is planning-only, so this phase does not consume its outputs and may start once PHASE-03 reaches a clean boundary.
- Existing primitives are design inputs: `vault_traverse`/`vault_extract` (`src/core/vault-graph.ts`, `src/core/vault-extract.ts`), code graph v2 (`src/scaffold/code-graph.ts`, `src/core/code-graph-lookup.ts`), TOON response formatting (`src/core/mcp-response-format.ts`), path safety guards (`src/core/vault-files.ts`), and the MCP tool registry (`src/mcp-server.ts`).
- [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]] fixes the ordering: deterministic compiler first, optional local reranker last.

## Acceptance Criteria

- [ ] README documents `08_Automation/` as generated machine-readable state (distinct from human-authored notes), explains `code-graph/`, reserves `code-stubs/`, and shows how to refresh the code graph.
- [ ] A deterministic ranking module returns per-item score breakdowns and reasons, covers vault-note and source-file candidates, and is unit-tested without any model dependency.
- [ ] `vault_prepare_context` is registered in the MCP server, documented, token-budgeted, returns item-level reasons and estimated tokens, supports TOON output, and fails safely with a refresh hint when the code graph or stub cache is missing.
- [ ] Code graph v3 is versioned, keeps `vault_lookup_code_graph` working, populates new fields where available, and degrades gracefully where not.
- [ ] Interface stubs are cached under `08_Automation/code-stubs/`, invalidate on hash/mtime/size change, preserve signatures and exported types, and never invent behavior.
- [ ] A parser abstraction gives TypeScript a stronger-than-regex path while keeping regex as fallback, and parser errors do not break `vault_refresh`.
- [ ] MCP resources expose notes, stubs, summaries, and excerpts at stable path-safe URIs with traversal attempts rejected.
- [ ] Security tests cover path traversal, secret/generated/vendor exclusion, stale caches, oversized files, and token-budget enforcement with reported truncation.
- [ ] The local reranker remains opt-in, degrades to deterministic ranking with a clear warning, and is documented as slower and less transparent.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Code_Graph|Code Graph]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003 Deterministic context compiler before optional local reranking]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh|STEP-04-01 Document generated automation area and code graph refresh]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_03_expand-code-graph-to-v3-dependency-aware-schema|STEP-04-03 Expand code graph to v3 dependency-aware schema]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04 Build cached source interface-stub generation]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback|STEP-04-06 Add AST and compiler-backed source analysis with regex fallback]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_07_expose-mcp-resources-for-stable-context-artifacts|STEP-04-07 Expose MCP resources for stable context artifacts]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]
- [ ] [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag|STEP-04-09 Add optional local reranker plugin behind config flag]]
<!-- AGENT-END:phase-steps -->

## Notes

- Recommended execution order: STEP-04-01 (docs) → STEP-04-02 (ranking) → STEP-04-03 (code graph v3) → STEP-04-04 (stub cache) → STEP-04-05 (context compiler) → STEP-04-06 (AST/compiler parsing) → STEP-04-07 (MCP resources) → STEP-04-08 (security hardening) → STEP-04-09 (optional reranker). STEP-04-01 and STEP-04-02 can run in parallel; STEP-04-08 acceptance checks may be pulled earlier into each feature step if preferred.
- Wording discipline for all notes and future docs: say "context compiler", "deterministic relevance ranking", "explainable score reasons", "interface stubs" / "source interface skeletons", "token-budgeted context assembly", and "MCP resources for stable context artifacts". Avoid "pseudo-code stubbing"; stubs must be extracted from actual source and must not invent or approximate behavior.
- Everything in this phase is proposed future work. As of planning, the repo has no deterministic context compilation, no interface-stub cache, no AST-backed dependency extraction, and no local reranking; do not let later notes claim otherwise until the steps land.
- If any step turns out too large during execution, use the normal step-splitting workflow rather than growing one omnibus change.
- Refinement pass 2026-07-05 resolved the open planning decisions: tool name is `vault_prepare_context`; v2 code-graph compatibility is split (lookup dual-reads v2/v3, richer consumers require v3 with a refresh hint); the TypeScript compiler tier loads via optional dynamic import with Tree-sitter then regex as fallbacks (`typescript` stays a devDependency); STEP-04-08 remains a final cross-cutting security sweep. Remaining open item: Tree-sitter packaging (regular vs optional dependency, wasm vs native), owned by STEP-04-06.
- Code reality checks from refinement: `src/core/vault-files.ts` has vault-root guards only (`assertWithinVaultRoot`, `resolveVaultRelativePath`) — the project-root guard for source paths is net-new work in STEP-04-05; `src/mcp-server.ts` registers tools only, no MCP resources yet; `src/scaffold/code-graph.ts` already has `SKIP_DIRS` and an 8-level depth cap to reuse as the ignore baseline.
