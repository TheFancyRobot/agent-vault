Upgrade legacy verbose step notes into thin step indexes with companion notes.

Usage: /vault:migrate-step-notes [--phase <PHASE-01>] [--step <STEP-01-02>]

Use this when an existing vault has large pre-split step notes and you want the compact step layout used by newer vaults.

Workflow:

1. Find legacy step notes under `.agent-vault/02_Phases/.../Steps/`.
2. Optionally filter by `--phase` or `--step`.
3. For each legacy step note, split the old sections into companion notes:
   - `Execution_Brief.md`
   - `Validation_Plan.md`
   - `Implementation_Notes.md`
   - `Outcome.md`
4. Rewrite the main step note into a thin index note with companion links while preserving frontmatter, snapshot state, human notes, and session history.
5. Refresh the code graph into the thin summary format and regenerate `.agent-vault/08_Automation/code-graph/index.json`.
6. Re-run validation after migration.

Rules:
- The migration is idempotent: already-split step notes are skipped.
- The code-graph refresh is also safe to re-run.
- Use `vault-doctor` or `vault validate-all` after the migration.

MCP tools to use: `vault_validate`.

Examples:
- /vault:migrate-step-notes
- /vault:migrate-step-notes --phase PHASE-01
- /vault:migrate-step-notes --step STEP-01-02
