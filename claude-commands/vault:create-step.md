Create a new step note in the vault.

Usage: /vault:create-step <phase_number> <step_number> <title>

Call the `vault_create_step` MCP tool with the given phase number, step number, and title. The step note will be created inside the phase's Steps/ directory with proper frontmatter, linked back to the phase, and registered in the phase's step list.

Example: /vault:create-step 1 2 "Add command catalog"
