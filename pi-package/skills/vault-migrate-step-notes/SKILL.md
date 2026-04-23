---
description: Upgrade legacy verbose step notes into thin step indexes with companion notes.
---

# Vault Migrate Step Notes

Use when an existing vault still has large pre-split step notes and you want the compact step layout used by newer vaults.

## Workflow

1. Find legacy step notes under `.agent-vault/02_Phases/.../Steps/`.
2. Optionally narrow the migration to one phase or one step:
   - `PHASE-01`
   - `STEP-01-02`
3. For each legacy step note, split the old sections into companion notes:
   - `Execution_Brief.md`
   - `Validation_Plan.md`
   - `Implementation_Notes.md`
   - `Outcome.md`
4. Rewrite the main step note into a thin index note while preserving frontmatter, snapshot state, human notes, and session history.
5. Refresh the code graph into the thin summary format and regenerate `.agent-vault/08_Automation/code-graph/index.json`.
6. Re-run validation after migration.

## Rules

- The migration is idempotent: already-split step notes are skipped.
- The code-graph refresh is safe to re-run.
- Validate after migration with `vault_validate`.

## Examples

- Migrate all legacy step notes.
- Migrate only the step notes in `PHASE-01`.
- Migrate only `STEP-01-02`.
