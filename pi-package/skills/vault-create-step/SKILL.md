---
description: Create a new step note in the Agent Vault. Use when adding an implementation step to an existing phase.
---

# Vault Create Step

Create a new step note in the vault.

Call the `vault_create` tool with `type: "step"`, providing the phase number, step number, and title. The step note will be created inside the phase's Steps/ directory with proper frontmatter, linked back to the phase, and registered in the phase's step list.

After creating the step, populate its Required Reading section with wikilinks to the architecture, decision, and shared-knowledge notes the implementer must read before coding. Use `vault_traverse` from the parent phase (depth 1, outgoing) to discover related notes, then select the ones relevant to this specific step.

Example: Create step with phase_number 1, step_number 2, title "Add command catalog"
