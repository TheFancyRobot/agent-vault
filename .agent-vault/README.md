# Agent Vault

Agent Vault is the repo-local operating memory for this repository. It keeps the minimum durable context that humans and automation need in order to resume work safely without rebuilding the same understanding every session.

## Purpose

- Keep one vault per repository at \`.agent-vault/\`.
- Store durable planning, architecture, bug, decision, and session context in plain Markdown.
- Make current work legible to both humans and automation.
- Prefer links over duplicated prose so the vault stays small, stable, and reviewable.

## Start Here

- Hub: [[00_Home/Dashboard|Dashboard]]
- Current focus: [[00_Home/Active_Context|Active Context]]
- Current plan: [[00_Home/Roadmap|Roadmap]]
- Vault contract: [[AGENTS|Agent Vault AGENTS]]
- Note contracts: [[07_Templates/Note_Contracts|Note Contracts]]
- Automation guide: [[08_Automation/README|Automation README]]
- Preferred CLI: \`./.agent-vault/08_Automation/vault\`
- Command catalog: \`./.agent-vault/08_Automation/vault help\`
- Health check: \`./.agent-vault/08_Automation/vault-doctor\`

## Source Of Truth Boundaries

- \`00_Home/\` is the navigation and situational-awareness layer. It should point to the truth, not become the only place a fact exists.
- \`01_Architecture/\` is the canonical source for durable system understanding and subsystem explanation.
- \`02_Phases/\` is the canonical plan of record for bounded work, acceptance criteria, and steps.
- \`03_Bugs/\` is the canonical record for a defect's reproduction, impact, root cause, workaround, and verification.
- \`04_Decisions/\` is the canonical record for durable choices and supersession history.
- \`05_Sessions/\` is the chronological work log. It records what happened, but durable facts discovered there should be promoted into architecture, phase, bug, or decision notes.
- \`06_Shared_Knowledge/\` holds stable rules, standards, playbooks, and reference material.
- \`07_Templates/\` defines note contracts and starter shapes.
- \`08_Automation/\` holds safe generators, refreshers, validators, and text-mutation helpers.

## Editing Rules

- Keep notes readable in raw Markdown. Obsidian compatibility is a benefit, not the only target.
- Every automation-managed note starts with YAML frontmatter.
- Keep required headings stable so scripts can target notes conservatively.
- Keep unique human judgment outside \`AGENT-START\` / \`AGENT-END\` blocks unless a template explicitly says otherwise.
- Treat generated blocks as replaceable. If a fact must survive regeneration, store it outside the block or in a canonical linked note.
- Update notes conservatively. Patch only the targeted note and section rather than rewriting whole files.
- Use \`YYYY-MM-DD\` dates.
- Prefer adding or trimming bullets over reformatting large prose sections.
- Rebuild indexes after meaningful metadata or note-link changes.

## Note Types

- \`home_context\` - current operating context in \`00_Home/Active_Context.md\`
- \`home_index\` - generated or curated indexes in \`00_Home/\`
- \`architecture\` - durable subsystem knowledge in \`01_Architecture/\`
- \`phase\` - bounded plans in \`02_Phases/.../Phase.md\`
- \`step\` - executable units inside \`02_Phases/.../Steps/\`
- \`bug\` - defect records in \`03_Bugs/\`
- \`decision\` - durable choices in \`04_Decisions/\`
- \`session\` - chronological work logs in \`05_Sessions/\`

## Workflow

1. Read [[00_Home/Active_Context|Active Context]].
2. Read the target step.
3. Read the linked phase, architecture, bug, and decision notes.
4. Create a session note before major work.
5. Update notes conservatively while you work.
6. Rebuild indexes after meaningful changes.

## Link Discipline

- Use wiki links for vault-to-vault references that humans are likely to follow next.
- Prefer direct note links over folder mentions or vague filenames.
- Link the canonical note that owns the fact instead of copying its content.
- Add reciprocal links when two notes materially depend on each other.
- Use Markdown relative links only where generated tables or external rendering benefit from them.
- Do not let index notes become shadow copies of bug, decision, or phase content.

## Automation Safety Rules

- Automation should prefer frontmatter updates, generated-block replacement, and explicitly targeted leaf-section edits.
- Fail closed on missing frontmatter, malformed or duplicated generated blocks, duplicated headings, or nested sections that make a rewrite ambiguous.
- Preserve unknown frontmatter keys, untouched prose, and existing line endings.
- Do not rewrite human hub notes just to normalize style.
- Do not treat \`00_Home/\` notes or session logs as the only durable source of a fact.
- Run \`./.agent-vault/08_Automation/vault validate-all\` after structural changes.
- Run \`./.agent-vault/08_Automation/vault refresh-all-home-notes\` after meaningful changes to phases, steps, bugs, decisions, or current context metadata.

## Manual-Edit Friendly Defaults

- Put durable narrative in normal sections, not inside replaceable blocks.
- Reserve generated blocks for summaries, indexes, and machine-managed snapshots.
- Keep one logical data set per generated block.
- If a note becomes too crowded, split the durable topic into its own note and link it instead of adding another oversized section.

## Commands

- List commands: \`./.agent-vault/08_Automation/vault help\`
- Show detailed help for one command: \`./.agent-vault/08_Automation/vault help create-step\`
- Create a new phase: \`./.agent-vault/08_Automation/vault create-phase "Workflow Adoption"\`
- Look up symbols/files cheaply: \`./.agent-vault/08_Automation/vault lookup-code-graph auth --path src/core --exports-only\`
- Migrate older verbose step notes: \`./.agent-vault/08_Automation/vault migrate-step-notes\`
- Refresh home notes: \`./.agent-vault/08_Automation/vault refresh-all-home-notes\`
- Validate vault integrity: \`./.agent-vault/08_Automation/vault validate-all\`
- Run a strict health report: \`./.agent-vault/08_Automation/vault-doctor\`

## Current Assumptions

- This vault is the only Agent Vault for \`agent-vault\`.
- The vault lives directly at \`.agent-vault/\` with no nested project folder.
- Automation is intentionally conservative and should optimize for preserving manual edits over making broad rewrites.
