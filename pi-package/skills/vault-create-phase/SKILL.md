---
description: Manual helper for creating a new phase in the Agent Vault. Use when you already know the phase shape and want to add or reorder a phase directly, not when you need the agent to create a plan from a broader request.
---

# Vault Create Phase

Manual helper: create a new phase in the vault once the plan shape is already decided.

For broad requests that still need research, sequencing, or step creation, use the `vault-plan` workflow (or `/vault:plan` prompt template in supported harnesses) instead of this helper.

Create a new phase in the vault.

Call the `vault_create` tool with `type: "phase"`. Provide the phase title. The phase number is auto-generated if omitted. A Steps/ directory is created alongside the phase note.

Use `insert_before` to insert the new phase at a specific position. Existing phases from that point onward are automatically renumbered (directories renamed, IDs updated, all wikilinks across the vault corrected). Cannot be used together with `phase_number`.

After creating the phase, search the vault for existing architecture, decision, and bug notes related to the phase's scope. Use `vault_traverse` from relevant architecture notes (depth 1, outgoing) to discover connected notes. Populate the phase's `related_architecture`, `related_decisions`, and `related_bugs` frontmatter with real wikilinks via `vault_mutate`. Do not leave placeholder links in generated blocks.

Examples:
- Create phase "Workflow Adoption" (auto-numbered)
- Create phase "New Phase" with `insert_before: 3` to insert before phase 3
