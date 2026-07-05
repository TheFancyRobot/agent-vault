# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag|STEP-04-09 Add optional local reranker plugin behind config flag]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- Deterministic ranking remains the default; with no config, behavior and output are byte-identical to pre-step behavior.
- The local reranker is reachable only via explicit config/feature flag.
- A missing local model produces a clear warning and falls back to deterministic ranking.
- Deterministic score reasons are preserved alongside model rerank scores in the output.
- Documentation warns that local reranking may be slower and less transparent.

## Test Matrix

- Fallback: `ranker: "local"` with no model available warns and returns deterministic results.
- Opt-in isolation: default configuration never loads or references the local model code path (assert via module spy or lazy-import check).
- Scope: reranker input is exactly the deterministic top candidate set, never the whole vault candidate pool.
- Contract: reranked items retain `reasons` from the deterministic stage plus a distinct model score field.
- Budget/mandatory rules: reranking cannot evict mandatory items or exceed the token budget.
- Caching: identical rerank requests hit the cache (use a stub/fake model in tests — no real model download in CI).

## Manual Checks

- With a real local model configured (developer machine only), compare deterministic vs reranked output for one task and confirm both orderings are explainable from the emitted metadata.

## Junior Readiness Verdict

- PASS: constraints are binary and testable with a fake model; no CI dependency on model availability.
