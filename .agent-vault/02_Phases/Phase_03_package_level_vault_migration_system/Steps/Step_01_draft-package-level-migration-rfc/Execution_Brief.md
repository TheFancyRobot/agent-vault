# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]
- Phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]

## Outcome and Success Condition

- Produce a package-level RFC that defines how Agent Vault should support forward migrations across all repositories using the package.
- Success means the RFC clearly covers schema/versioning, migration categories, command UX, safety guarantees, validator interaction, compatibility strategy, and maintainer release obligations.

## Why This Matters

- Without a package-level migration contract, targeted upgrade commands can accumulate without giving users one reliable upgrade path.
- The RFC creates the shared design baseline needed before implementation or release-process changes are scoped.

## Prerequisites and Setup

- Read the existing note contracts, command catalog, current migration behavior, validator expectations, and relevant README/changelog context.
- Stay in planning mode; do not implement source-code or package behavior while drafting the RFC.

## Starting Files and Directories

- `.agent-vault/07_Templates/Note_Contracts.md` — align migration guarantees with existing note contract language.
- `src/core/command-catalog.ts` and `src/core/dispatcher.ts` — understand current command surface and where a future `migrate` command would fit.
- `src/core/note-generators.ts` — inspect the current `migrate-step-notes` behavior as a design input.
- `src/core/note-validators.ts` — capture how validators should distinguish broken vs. migratable states.
- `README.md` and `CHANGELOG.md` — understand current public framing and release cadence.

## Implementation Constraints and Non-Goals

- Keep the RFC package-level, not repo-specific.
- Do not promise that arbitrary custom vaults can always be auto-migrated safely.
- Do not let the RFC become an implementation checklist; that is STEP-03-02.

## Integration Touchpoints

- The RFC must align CLI behavior, vault metadata, validators, tests, and release discipline.
- The RFC should define how legacy specialized migrations, such as `migrate-step-notes`, relate to a future general migration command.

## Edge Cases and Failure Modes

- Projects may have no vault metadata file yet.
- Vaults may be partially upgraded, manually edited, or skip package releases.
- Some future changes may require manual follow-up instead of safe automation.

## Security and Performance

- Safety matters more than aggressive rewriting; migrations should be bounded and human-safe.
- Planning should explicitly preserve prompt-budget and validator ergonomics where migration behavior affects workflow output.

## Handoff Expectations

- End with an RFC that can be referenced by implementation planning without reopening first-principles questions.
- Record any unresolved design decisions explicitly so STEP-03-02 can either account for them or block on them.
