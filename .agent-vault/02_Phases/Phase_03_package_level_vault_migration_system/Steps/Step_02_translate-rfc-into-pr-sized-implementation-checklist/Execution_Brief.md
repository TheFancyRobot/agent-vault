# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]
- Phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]
- Prerequisite step: [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]

## Outcome and Success Condition

- Convert the package-level migration RFC into a durable checklist of reviewable implementation tasks.
- Success means the checklist names phases or PR slices, likely modules/files to touch, test expectations, compatibility wrapper work, documentation follow-up, and release/rollout sequencing.

## Why This Matters

- A good RFC can still stall without execution planning.
- The checklist reduces risk by turning a broad package feature into small, reviewable increments.

## Prerequisites and Setup

- Do not start this step until STEP-03-01 has produced the RFC or an equivalent approved planning artifact.
- Read the final RFC first and inherit its decisions rather than re-arguing product behavior.

## Starting Files and Directories

- The final RFC artifact from STEP-03-01.
- `src/core/command-catalog.ts`, `src/core/dispatcher.ts`, and any migration-related modules discussed in the RFC.
- Current tests covering note generators, validators, install flow, and command help/output.
- `README.md`, `CHANGELOG.md`, and contributing or maintainer guidance that will need follow-up.

## Implementation Constraints and Non-Goals

- The checklist should not be a second RFC.
- Do not hide unresolved RFC questions inside the checklist; either block on them or list them explicitly.
- Keep tasks PR-sized and reviewable rather than writing one omnibus implementation plan.

## Integration Touchpoints

- Checklist tasks should cover CLI wiring, vault metadata, migration registry, validator alignment, compatibility wrappers, tests, and docs.
- Include follow-up for release process or maintainer checklist updates when future schema changes occur.

## Edge Cases and Failure Modes

- Implementation sequencing may differ if backward-compatibility wrappers or metadata support need to ship before general migration behavior.
- Some migrations may need manual-follow-up handling rather than full automation; ensure the checklist preserves that nuance.

## Security and Performance

- Checklist tasks should preserve bounded edits and human-safe mutation rules.
- Include test work for idempotency, ambiguity handling, and post-migration validation so safety is not treated as optional polish.

## Handoff Expectations

- End with a checklist another maintainer could execute without re-reading the full chat history.
- Highlight any prerequisite design decisions or release-order concerns at the top of the checklist.
