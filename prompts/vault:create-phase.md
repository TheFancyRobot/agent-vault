Create a new phase in the vault.

This is a manual helper for phase creation once the plan shape is already known. If the user has a broader request that still needs research, sequencing, or new step notes, use `/vault:plan` instead of this helper.

Usage: /vault:create-phase <title> [--phase-number N] [--previous PHASE-ID] [--insert-before PHASE-REF]

Call the `vault_create` MCP tool with `type: "phase"`. The phase number is auto-generated if omitted. A Steps/ directory is created alongside the phase note.

Use `--insert-before` to insert the new phase at a specific position. Existing phases from that point onward are automatically renumbered (directories renamed, IDs updated, all wikilinks across the vault corrected). Cannot be used together with `--phase-number`.

After creating the phase, search the vault for existing architecture, decision, and bug notes related to the phase's scope. Use `vault_traverse` from relevant architecture notes (depth 1, outgoing) to discover connected notes. Populate the phase's `related_architecture`, `related_decisions`, and `related_bugs` frontmatter with real wikilinks via `vault_mutate`. Do not leave placeholder links in generated blocks.

Examples:
- /vault:create-phase "Workflow Adoption"
- /vault:create-phase "New Phase" --insert-before 3
