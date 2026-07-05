---
note_type: decision
template_version: 2
contract_version: 1
title: Deterministic context compiler before optional local reranking
decision_id: DEC-0003
status: accepted
decided_on: '2026-07-05'
owner: ''
created: '2026-07-05'
updated: '2026-07-05'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]]'
tags:
  - agent-vault
  - decision
---

# DEC-0003 - Deterministic context compiler before optional local reranking

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- External feedback on Agent Vault suggested adding relevance ranking and "pseudo-code stubbing" to improve context retrieval and token efficiency.
- The corrected interpretation of that feedback: Agent Vault needs a context compiler that gathers candidate vault notes and source files, ranks them by explicit relevance to the current task/file, prunes by a token budget, and renders each item at the right fidelity. The open question was whether ranking should start with a local model reranker or with deterministic heuristics.
- A second wording question: what "stubbing" means. Stubs derived by paraphrasing or approximating behavior would inject invented facts into model context.
- Related notes: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]].

## Decision

- Build a deterministic, explainable context compiler first. Candidate ranking uses explicit, testable scoring components (direct target, explicit links, active step/session, phase match, symbol match, dependency edges, git-diff recency, graph distance, status, stale/generated penalties) and every included item carries visible score reasons.
- The default path must remain deterministic, explainable, cacheable, and testable, with no dependency on embeddings, GPUs, network calls, or model availability.
- A local CPU/GPU reranker may be added later strictly as an opt-in second-stage plugin operating on the top deterministic candidate set (see STEP-04-09); it is never the default and never required.
- Source representation uses "interface stubbing" / "source interface skeletons": stubs are extracted from actual source code, keep declarations, exported types, signatures, useful docstrings, and import/export relationships, and drop function bodies. Stubs must not invent or approximate behavior. The term "pseudo-code stubbing" is rejected for implementation notes and docs.
- Boundary: this decision fixes the ordering and the default; it does not forbid a future local reranker, and it does not decide which local model provider (if any) a reference implementation would use.

## Alternatives Considered

- Local model reranking as the primary ranking path: rejected as the first move because it is opaque (no explainable reasons), harder to test deterministically, adds model/hardware/install burden, and would gate core functionality on model availability.
- Embedding-based semantic retrieval as the default: rejected for the same operational reasons, plus index build/maintenance cost; may be revisited after the deterministic baseline exists to measure against.
- Pseudo-code stub generation (summarizing/paraphrasing what code does): rejected because generated approximations can be wrong and would poison agent context with invented behavior.
- Treating wikilinked notes as source dependencies: rejected; in Agent Vault wikilinks primarily connect vault Markdown notes, while source files are handled through the code graph, import/export analysis, explicit note-to-code references, and active edit context.

## Tradeoffs

- Deterministic heuristics can miss semantically relevant but structurally unlinked content; accepted, because explainability and testability of the default matter more, and the opt-in reranker seam recovers this later.
- Maintaining scoring constants requires occasional tuning; mitigated by keeping the score breakdown visible and unit-tested rather than hidden.
- Doing ranking, schema, stubs, and compiler as separate steps takes longer than one big change, but each unit stays independently reviewable and testable.

## Consequences

- PHASE-04 orders the work deterministic-first: ranking (STEP-04-02) and the compiler (STEP-04-05) land before any reranker work (STEP-04-09, last and optional).
- The ranking result contract must always include score reasons; the future reranker must preserve them alongside model scores.
- Docs and notes use "context compiler", "deterministic relevance ranking", "explainable score reasons", "interface stubs" / "source interface skeletons", and "token-budgeted context assembly"; they avoid "pseudo-code stubbing" and never present the reranker as required or default.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|PHASE-04 Context compiler and token efficiency]]
- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_02_implement-deterministic-context-ranking-with-explainable-score-reasons|STEP-04-02 Implement deterministic context ranking with explainable score reasons]]
- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04 Build cached source interface-stub generation]]
- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]
- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_09_add-optional-local-reranker-plugin-behind-config-flag|STEP-04-09 Add optional local reranker plugin behind config flag]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-07-05 - Created as `proposed`.
- 2026-07-05 - Accepted during PHASE-04 planning; direction confirmed by corrected external-feedback interpretation.
<!-- AGENT-END:decision-change-log -->
