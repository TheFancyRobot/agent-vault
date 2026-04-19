---
description: Create a new bug note in the Agent Vault. Use when documenting a bug, optionally linking it to a step and session for traceability.
---

# Vault Create Bug

Create a new bug note in the vault.

Call the `vault_create` tool with `type: "bug"`, providing the bug title. The bug ID is auto-generated. Optionally link to a related step and session for full traceability.

After creating the bug, search the vault for related notes beyond the immediate step and session. Use `vault_traverse` from the parent phase (depth 1, both) to discover architecture notes, decisions, and other phases that the bug may affect. Update the bug's `related_notes` frontmatter and generated block with real wikilinks via `vault_mutate`.

Example: Create bug "Generated index loses manual prose" with step "STEP-01-02"
