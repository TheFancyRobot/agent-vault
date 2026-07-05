# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- A deterministic ranking function or module exists and is exported for reuse.
- Ranking returns score reasons per item, not only a number.
- Ranking operates over both vault-note candidates and source-file candidates.
- Ranking does not import or require any embedding/reranker model, network client, or GPU-dependent library.
- Pruning honors token budget, minimum relevance score, and required-inclusion rules; no fixed-bottom-percentage discard exists anywhere.

## Unit Test Matrix

- Direct target scores highest and carries a `direct target` reason.
- Explicitly-linked-from-root boost applies and is reported.
- Active step/session boost applies and is reported.
- Graph distance contributes reciprocally (distance 0 > 1 > 2).
- Dependency edge boost applies when edges are supplied and is a no-op when absent.
- Stale-index penalty and generated/vendor penalty reduce scores and are reported.
- Token-budget pruning drops low-score items first, keeps mandatory items regardless of score, and reports estimated tokens.
- Same inputs produce identical output ordering across runs (determinism check).

## Manual Checks

- Run the ranker against this repo's real vault with a sample task ("edit src/core/vault-graph.ts") and read the reasons: they should be understandable without reading the scorer source.

## Junior Readiness Verdict

- PASS: contract, scoring components, and test matrix are explicit; no external service dependencies.
