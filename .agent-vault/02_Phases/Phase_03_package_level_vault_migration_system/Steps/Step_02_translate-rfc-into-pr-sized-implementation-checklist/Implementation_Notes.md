# Implementation Notes

## Related Notes

- Step: [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]
- Phase: [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|Phase 03 package-level vault migration system]]

- Confirmed the RFC's referenced code paths still match current source layout before drafting the checklist: `src/core/command-catalog.ts` (has `migrate-step-notes` entry), `src/core/dispatcher.ts` (dispatches to `handleMigrateStepNotesCommand`), `src/core/note-generators.ts` (`isLegacyStepNoteContent`, `handleMigrateStepNotesCommand`), `src/core/vault-config.ts` (`VaultConfig`, `.config.json` read/write/update helpers, no `vault_schema_version` field yet).
- `vault_create` does not support an `architecture` note type (only phase/step/session/bug/decision), so the checklist was authored directly with `Write` following `07_Templates/Architecture_Template.md`, matching how the RFC itself (ARCH-0007) was authored as a standalone architecture note rather than a generated one.
- Sized the registry module as one file per migration step (`src/core/migrations/steps/000N-*.ts`) plus one `registry.ts` orderer, reasoning from the RFC's "registry is append-only in practice" maintainer obligation — separate files make it structurally harder to edit a shipped step in place.
- Ordered PR-3 (wrap `migrate-step-notes` as registry step `0 -> 1`) before PR-4 (plan-mode command) because plan mode has nothing meaningful to show without at least one real registry entry.
