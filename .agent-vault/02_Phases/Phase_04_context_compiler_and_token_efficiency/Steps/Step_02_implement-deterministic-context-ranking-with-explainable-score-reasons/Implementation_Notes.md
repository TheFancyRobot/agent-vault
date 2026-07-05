# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Findings from STEP-04-02

- `src/core/context-ranking.ts` — deterministic ranking module (18.9 KB)
  - Types: `VaultNoteCandidate`, `SourceFileCandidate`, `ContextRankingInput`, `RankedItem`, `ContextRankingResult`
  - Scoring constants (all tunable, visible, and testable):
    - `SCORE_DIRECT_TARGET = 8.0` — root note, active step/phase, or active file
    - `SCORE_EXPLICITLY_LINKED_FROM_ROOT = 6.0` — explicitly linked from root note
    - `SCORE_ACTIVE_SESSION_OR_STEP = 5.0` — active step or session note
    - `SCORE_SAME_PHASE = 4.0` — candidate in same phase directory (first 2 path segments)
    - `SCORE_CODE_SYMBOL_MATCH = 4.0` — source file path contains task text words (>2 chars)
    - `SCORE_DEPENDENCY_EDGE = 3.5` — has dependency edges (pluggable for code graph v3)
    - `SCORE_CHANGED_IN_GIT_DIFF = 3.0` — file in changed files list
    - `SCORE_RECIPROCAL_GRAPH_DISTANCE_MAX = 2.0` — `2.0 / (distance + 1)` decay
    - `SCORE_RECENCY_BOOST = 1.5` — within 1h: 1.5, within 24h: 0.75
    - `SCORE_STATUS_PRIORITY = 1.0` — active: 1.0, in-progress: 0.5, planned: 0.25
    - `SCORE_STALE_INDEX_PENALTY = -3.0` — code graph is stale
    - `SCORE_GENERATED_OR_VENDOR_PENALTY = -4.0` — generated or vendor file
  - `referenceTimeMs` parameter makes recency scoring deterministic for tests
  - Phase comparison uses first 2 path segments (e.g., `02_Phases/Phase_04_context_compiler`)
  - `minRelevanceScore` only prunes when explicitly set (allows negative scores)
  - Mandatory items (direct targets, explicitly linked, active steps/sessions, same phase) are never pruned
  - No fixed-bottom-percentage discard; prunes by budget/score/mandatory rules only
  - Render modes: `full` (direct targets), `excerpt` (other vault notes), `stub` (source files)
  - Bug fix: `hasGeneratedOrVendorPenalty` uses `||` not `??` (the nullish coalescing operator was causing a bug where `false ?? true` returned `false`)
- `test/core/context-ranking.test.ts` — 26 tests covering all scoring components, pruning, render modes, edge cases, and combined scoring

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
