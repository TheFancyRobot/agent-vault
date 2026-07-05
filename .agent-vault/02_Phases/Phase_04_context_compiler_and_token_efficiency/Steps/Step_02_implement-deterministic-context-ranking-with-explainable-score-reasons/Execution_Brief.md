# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- Decision: [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]]

## Outcome and Success Condition

- A ranking function or module (suggested: `src/core/context-ranking.ts`) that takes candidate items (vault notes and source files) plus task signals (task text, active file, root note, active step/phase/session, changed files) and returns scored, ordered results.
- Every result carries explainable score reasons, for example:

  ```ts
  {
    path: "02_Phases/Phase_01/Steps/STEP-01-02.md",
    kind: "vault_note",
    score: 14.5,
    reasons: ["root step", "linked from active session", "status=active", "graph distance=0"],
    renderMode: "excerpt",
    estimatedTokens: 820
  }
  ```

- Suggested deterministic scoring components (constants are tunable; the breakdown must stay visible and testable):

  ```ts
  score =
    8.0 * isDirectTarget +
    6.0 * isExplicitlyLinkedFromRoot +
    5.0 * isActiveSessionOrStep +
    4.0 * samePhase +
    4.0 * codeSymbolMatch +
    3.5 * dependencyEdge +
    3.0 * changedInGitDiff +
    2.0 * reciprocalGraphDistance +
    1.5 * recencyBoost +
    1.0 * statusPriority -
    3.0 * staleIndexPenalty -
    4.0 * generatedOrVendorPenalty;
  ```

## Why This Matters

- `vault_traverse` bounds context by depth/count, not by relevance to the immediate task. Ranking is the prerequisite for the context compiler (STEP-04-05) and, per DEC-0003, must exist before any opaque local-model reranking.

## Prerequisites and Setup

- None hard; this step can run in parallel with STEP-04-01. The `dependencyEdge` component may be a no-op until code graph v3 (STEP-04-03) lands — design the input shape so dependency edges plug in later.

## Starting Files and Directories

- `src/core/vault-graph.ts` — link/backlink traversal that yields vault-note candidates and graph distance.
- `src/core/code-graph-lookup.ts` — `queryCodeGraphIndex` provides the symbol/file matching for the `codeSymbolMatch` component.
- `src/core/context-contract.ts` and `src/core/context-footprint.ts` — existing context/session shapes and prompt-budget conventions.
- `src/core/vault-files.ts` — `assertWithinVaultRoot` / `resolveVaultRelativePath` for vault-note candidate paths (these are vault-root only; source-path constraint arrives with the project-root guard built in STEP-04-05, so ranking should validate source candidates through an injected checker rather than assuming one exists).
- `test/core/context-ranking.test.ts` — suggested new test file, matching the `test/core/<module>.test.ts` convention.

## Implementation Constraints and Non-Goals

- Deterministic only: same inputs produce the same scores and the same ordering. No embeddings, GPUs, network calls, or model availability requirements.
- Prune by token budget, minimum relevance score, and required-inclusion rules. Do not discard a fixed bottom percentage of files.
- Required-inclusion rules can force explicitly linked or active notes into the result even when their score is low; the reasons must say so (for example `"mandatory: explicitly linked"`).
- Token estimation may be approximate (chars/4-style heuristic is acceptable) but must be consistent and documented.
- Do not build the tool surface here; ranking is a library module consumed by STEP-04-05.

## Integration Touchpoints

- Output metadata (`score`, `reasons`, `renderMode`, `estimatedTokens`) is the contract consumed by `vault_prepare_context` and by the optional reranker (STEP-04-09), which must preserve deterministic reasons alongside any model scores.

## Edge Cases and Failure Modes

- No task text supplied (rank purely on structural signals); active file outside the project root (reject via path guards); stale code-graph index (apply `staleIndexPenalty`, do not crash); empty vault graph; ties (stable, documented tiebreak such as path order).

## Security and Performance

- Candidate paths must already be vault-root or project-root constrained before scoring; ranking must not read arbitrary paths.
- Scoring should be cheap (no file re-reads for items that only need metadata scoring).

## Handoff Expectations

- STEP-04-05 consumes this module unchanged; record final scoring components and constants in Implementation Notes so the compiler and reranker steps reference one source of truth.
