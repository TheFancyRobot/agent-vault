# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag|STEP-04-09 Add optional local reranker plugin behind config flag]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- Decision: [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]]

## Outcome and Success Condition

- A reranker plugin interface with the deterministic ranker as the always-available default and a local-model implementation behind explicit configuration:

  ```ts
  ranker: "deterministic" | "local"
  ```

  or config-file form:

  ```yaml
  context:
    ranker:
      provider: deterministic
  ```

- The local reranker operates only on the top candidate set produced by deterministic retrieval — never the whole vault — and its output preserves deterministic score reasons alongside model rerank scores.

## Hard Constraints

- Must be opt-in.
- Must not require network access.
- Must not require GPU (CPU execution must work; GPU is an optimization).
- Must not make the default workflow slower or less deterministic — when not enabled, zero overhead and zero behavior change.
- Must cache rerank results where safe.
- Must be easy to disable (single config change back to `deterministic`).
- Missing local model produces a clear warning and a fallback to deterministic ranking, not an error.

## Why This Matters

- Some users will want semantic reranking; the plugin seam lets them have it without compromising the deterministic, explainable, testable default path that DEC-0003 fixes.

## Prerequisites and Setup

- STEP-04-02's result metadata is the input/output contract; STEP-04-05's `ranker` input is the activation path; STEP-04-08's exclusion policy bounds what the reranker may see.

## Starting Files and Directories

- The ranking module from STEP-04-02 — define the plugin interface next to it.
- `src/core/vault-config.ts` — extend the `VaultConfig` interface and `readVaultConfig` / `updateVaultConfig` for the ranker provider flag.
- The STEP-04-05 compiler — wire `ranker: "local"` through with fallback behavior.
- `README.md` — document the flag with an explicit warning that local reranking may be slower and less transparent than the deterministic default.

## Implementation Constraints and Non-Goals

- No default-on behavior under any circumstance; no telemetry; no model download at install time.
- Provider examples may be documented, but no provider is hard-coded as required.
- Model quality evaluation/benchmarking is out of scope; only the plugin seam, fallback, caching, and docs.

## Integration Touchpoints

- Reranked results must remain within the deterministic stage's mandatory-inclusion and token-budget rules; reranking reorders and rescores, it does not re-admit excluded items.

## Edge Cases and Failure Modes

- Model file missing or corrupt (warn + fallback); model slower than a configured timeout (warn + fallback); cache invalidation when the candidate set or task changes; partial rerank (model scores some items) — define merge behavior explicitly.

## Security and Performance

- The reranker sees only already-admitted candidates (post-exclusion); it must not read files itself.
- Rerank caching must key on candidate identity and task signal, and must not persist secret-bearing content.

## Handoff Expectations

- Record the plugin interface and fallback semantics in Implementation Notes; if a concrete provider is chosen for the reference implementation, capture it as a decision note.
