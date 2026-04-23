# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Added "Step mirrors" section to README.md documenting mirror fields, update triggers, and the canonical-source principle.
- Added "Upgrading existing vaults" section to README.md with concrete migration instructions using dot-path mutations.
- Updated `vault_mutate` docs in README.md to mention dot-path deep-merge support.
- Added negative test: "update-frontmatter does not re-mirror when non-context fields change on a session" — confirms the auto-re-mirror wiring is scoped to `context.*` updates only.
- Backfilled the legacy session note `2026-04-20-013545` (from STEP-01-01) with a canonical `context` field using the dot-path migration pattern. This fixes the pre-existing `vault_validate doctor` error and serves as live proof that the migration docs work.
- After backfill, `vault_validate doctor` reports clean (0 errors, 0 warnings).
- All 101 tests pass, typecheck clean.
