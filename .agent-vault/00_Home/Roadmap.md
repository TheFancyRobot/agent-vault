---
note_type: home_index
template_version: 1
contract_version: 1
title: Roadmap
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - roadmap
---

# Roadmap

This roadmap tracks the evolution of the vault itself and the operational habits around it.

## Principles

- Keep phases small enough to complete and review.
- Prefer useful infrastructure over elaborate note sprawl.
- Only add automation after the manual workflow is clear.

## Phase Outline

| Phase | Status | Goal |
| --- | --- | --- |
| Phase 01 Built-in vault context management | completed | Add canonical session context, step mirrors, workflow integration, tests, docs, and migration guidance |
| Phase 02 Targeted context extraction | completed | Add bounded note extraction, workflow prompt updates, pi parity, prompt-budget guardrails, and search/traversal dogfooding |
| Phase 03 Package-level vault migration system | completed | Draft the package-level migration RFC and derive a PR-sized implementation checklist |
| Phase 04 Context compiler and token efficiency | planned | Deterministic relevance ranking, `vault_prepare_context` token-budgeted context compiler, code graph v3, cached interface stubs, AST-backed extraction, MCP resources, safety hardening, optional local reranker |
| Phase 05 Implement package-level vault migration | planned | Execute PR-1 through PR-6 from the migration implementation checklist: schema version plumbing, migration registry and runner, `migrate-step-notes` as registry step 0→1, `vault migrate` plan and apply modes, and validator schema-drift warning |

## Near-Term Outcomes

- Finish PHASE-02 targeted context extraction and close the remaining workflow/tooling gaps.
- Keep the context-management docs and templates aligned with the code.
- Continue maintaining the architecture map as the \`agent-vault\` repo evolves.

## Later Opportunities

- Link bug records to external trackers.
- Generate note skeletons from CLI scripts.
- Validate required sections and stale indexes automatically.

## Related Notes

- [[00_Home/Dashboard|Dashboard]]
- [[00_Home/Active_Context|Active Context]]
