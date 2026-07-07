Plan or apply pending package-level vault schema migrations.

Usage: /vault:migrate [--dry-run] [--apply] [--to <version>]

Use this to inspect and run automated schema migrations for the vault. Migrations handle upgrades like converting verbose step notes to thin indexes, updating code graph formats, and other structural changes.

Modes:
- Plan mode (default): Shows pending migrations without applying them
- Apply mode: Runs pending migrations with `--apply`
- Target mode: Stop at a specific schema version with `--to <version>`

Workflow:

1. Run `/vault:migrate` to see what migrations are pending (plan mode).
2. Review the output to understand what changes will be made.
3. If ready, run `/vault:migrate --apply` to execute pending migrations.
4. Optionally target a specific version: `/vault:migrate --apply --to 5`

Rules:
- Migration is idempotent: already-applied migrations are skipped.
- Use `--dry-run` to preview changes without applying them.
- Run `/vault:validate` or the `vault_validate` MCP tool after migrations to verify integrity.
- If a migration fails, fix the issue and re-run to resume from the incomplete step.

MCP tools to use: `vault_migrate`, `vault_validate`.

Examples:
- /vault:migrate
- /vault:migrate --dry-run
- /vault:migrate --apply
- /vault:migrate --apply --to 5
