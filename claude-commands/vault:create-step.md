Create a new step note in the vault.

Usage: /vault:create-step <phase_number> <step_number> <title>

Call the `vault_create_step` MCP tool with the given phase number, step number, and title. The step note will be created inside the phase's Steps/ directory with proper frontmatter, linked back to the phase, and registered in the phase's step list.

After creating the step, populate its Required Reading section with wikilinks to the architecture, decision, and shared-knowledge notes the implementer must read before coding. Use `vault_traverse` from the parent phase (depth 1, outgoing) to discover related notes, then select the ones relevant to this specific step.

Example: /vault:create-step 1 2 "Add command catalog"
