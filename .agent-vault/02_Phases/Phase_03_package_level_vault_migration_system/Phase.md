---
note_type: phase
template_version: 2
contract_version: 1
title: Package-level vault migration system
phase_id: PHASE-03
status: planned
owner: Pi
created: '2026-04-26'
updated: '2026-04-26'
depends_on:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]'
related_architecture:
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
related_decisions: []
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 03 Package-level vault migration system

Use this note for a bounded phase of work in `02_Phases/`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define the package-level migration model for Agent Vault across all projects and turn it into durable planning artifacts that are ready to guide implementation.
- Produce a clear RFC first, then a PR-sized implementation checklist derived from that RFC.

## Why This Phase Exists

- Agent Vault currently has targeted upgrade behavior such as `migrate-step-notes`, but no single package-level migration contract that users can rely on across repositories.
- Before implementing a general `vault migrate` command, the package needs a stable design for schema/versioning, migration guarantees, validator interaction, compatibility policy, and maintainer release discipline.

## Scope

- Define package-level migration terminology and version boundaries, including vault schema version plus per-note contract/template versions.
- Specify the intended behavior of `vault migrate` for all projects that use Agent Vault, including planning/dry-run behavior, apply behavior, output, safety rules, and validation flow.
- Record maintainer obligations for future schema or contract changes so migration support is maintained alongside package releases.
- Produce an implementation checklist that breaks the migration system into reviewable PR-sized tasks, with module boundaries, tests, compatibility wrappers, and rollout order.
- Keep the work in planning mode only; this phase exists to create the design and execution plan, not to ship the migration framework itself.

## Non-Goals

- Do not implement the `vault migrate` command or migration registry in this phase.
- Do not retrofit every historical vault variant during planning; capture support policy and compatibility boundaries instead.
- Do not rewrite README, CLI help, or user docs beyond the planning artifacts needed to describe the future work.
- Do not cut the release from this phase; release work follows completion of PHASE-02 and can incorporate this plan afterward.

## Dependencies

- Depends on [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]] reaching a coherent stopping point so the next planning phase does not interrupt the current execution milestone.
- The RFC should be written before the implementation checklist so the checklist inherits one stable product contract.
- Existing migration behavior, validators, note contracts, and command catalog should be treated as design inputs, not as the final architecture.

## Acceptance Criteria

- [x] Scope is concrete and clearly framed as package-level work for all Agent Vault projects, not repo-specific cleanup.
- [x] Step notes exist for drafting the RFC first and the implementation checklist second.
- [ ] A durable RFC note or equivalent planning artifact defines the migration model, versioning rules, command contract, safety guarantees, validator relationship, and maintainer policy.
- [ ] A durable implementation checklist translates the RFC into reviewable PR-sized tasks with files/modules to add or change, tests to write, and rollout order.
- [ ] The RFC and checklist explicitly define how future schema or contract changes must carry migration/validation work.
- [ ] The planned work stays in planning mode and does not silently expand into implementation.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- No dedicated migration-system decision has been recorded yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No migration-system bug notes are linked yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]
- [ ] [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]
<!-- AGENT-END:phase-steps -->

## Notes

- This phase should begin only after PHASE-02 is completed or deliberately paused at a clean boundary.
- The package-level RFC must answer the cross-project question explicitly: how Agent Vault upgrades vault structures for any repository that uses the package.
- The implementation checklist should preserve the required order requested in planning: RFC first, checklist second.
