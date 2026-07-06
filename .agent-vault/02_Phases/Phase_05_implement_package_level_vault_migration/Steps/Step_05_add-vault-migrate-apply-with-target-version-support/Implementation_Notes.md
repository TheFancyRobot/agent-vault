# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## Execution Findings - 2026-07-06

- `--to` validation lives in the runner (`assertValidTargetVersion` in `src/core/migrations/runner.ts`), not the command, so it is unit-testable and always raises `MigrationTargetError` before any write. Rules: non-negative integer; refuse `> latestVersion`; refuse `< startVersion` (downgrade); refuse targets that are not a registered step boundary (`registry.some(s => s.to_version === target)`). A target equal to the current version is an idempotent up-to-date no-op.
- The edge case "`--to` past the latest" was specified as "refuse or cap - choose one": chose refuse, with an explicit message naming the package latest, matching the refuse-downgrade behavior.
- The default post-step validator (`createPostStepValidator` in `src/core/migrations/command.ts`) wraps `handleValidateAllCommand` with a capturing io: `ERROR` lines make the step fail (reason `validation-failed`, tied to the step id by the runner), `WARN` lines are forwarded to stdout prefixed `[post-step validation after <step-id>]` and never fail the run. A vault with zero markdown notes passes validate-all, which keeps fixture-based apply tests cheap.
- `HandleMigrateCommandOptions.postStepValidate` is a test seam (like the existing `registry` override); the shipped default is always the full validate-all suite.
- The post-apply code-graph refresh reuses the exact `scanProject(projectRoot)` + `writeCodeGraph(projectRoot, vaultRoot, scan.repoName)` path from `handleMigrateStepNotesCommand`, and runs whenever `result.applied.length > 0` - including blocked-manual and failed runs - so generated artifacts always match whatever writes landed.
- Plan-vs-apply duplication is avoided by not planning before applying: `applyMigrations` re-runs `detect()` per step itself, so apply mode never calls `planMigrations` first.
- `parseMigrateArgs` now rejects `--dry-run --apply` and `--to` without `--apply` (unless `--help` is present, which still wins).
- Pre-existing failure to know about: `npm test` shows 9 failures in `test/core/*-pi-extension.test.ts` because the optional peer dependency `@mariozechner/pi-ai` is not installed locally; unrelated to migrations.

## Related Notes

- Step: [[02_Phases/Phase_05_implement_package_level_vault_migration/Steps/Step_05_add-vault-migrate-apply-with-target-version-support|STEP-05-05 Add vault migrate apply with target version support]]
- Phase: [[02_Phases/Phase_05_implement_package_level_vault_migration/Phase|Phase 05 implement package level vault migration]]
