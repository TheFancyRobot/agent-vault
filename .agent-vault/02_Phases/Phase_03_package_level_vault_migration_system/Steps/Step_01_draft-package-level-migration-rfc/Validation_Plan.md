# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]
- Phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]

## Required Commands

1. `./.agent-vault/08_Automation/vault validate-all`

## Acceptance Checks

- The RFC explicitly says it is for the Agent Vault package across all projects, not only this repository.
- The RFC defines vault schema version, contract/template versions, migration categories, command behavior, ordering, safety rules, validator relationship, and maintainer policy.
- The RFC makes the execution order explicit: draft the RFC first, then derive the implementation checklist.
- The RFC leaves implementation for later phases/steps rather than blending planning and coding.

## Manual Checks

- Read the final RFC once from the perspective of a new package maintainer and verify it answers “what must ship whenever vault structure changes?”
- Read the final RFC once from the perspective of a user and verify it answers “what should `vault migrate` do for my project?”

## Junior Readiness Verdict

- PASS: clear required sections and review questions are defined before writing starts.
