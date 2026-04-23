/**
 * Embedded README.md template, genericized with {{repo_name}} placeholder.
 */

export const README_MD_TEMPLATE = `# Agent Vault

Agent Vault is the repo-local memory layer for this repository. Keep durable context small, linked, and easy to resume.

## Start Here

- [[00_Home/Active_Context|Active Context]]
- [[00_Home/Dashboard|Dashboard]]
- [[00_Home/Roadmap|Roadmap]]
- [[AGENTS|Agent Vault AGENTS]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[08_Automation/README|Automation README]]
- CLI: \`./.agent-vault/08_Automation/vault\`
- Help: \`./.agent-vault/08_Automation/vault help\`
- Health: \`./.agent-vault/08_Automation/vault-doctor\`

## Boundaries

- \`00_Home/\` - routing and current state
- \`01_Architecture/\` - durable system understanding
- \`02_Phases/\` - bounded plans and steps
- \`03_Bugs/\` - defect records
- \`04_Decisions/\` - durable choices
- \`05_Sessions/\` - chronological work logs
- \`06_Shared_Knowledge/\` - stable rules and playbooks
- \`07_Templates/\` - note contracts and starter shapes
- \`08_Automation/\` - generators, refreshers, validators, helpers

## Editing Rules

- Keep notes readable in raw Markdown.
- Keep frontmatter and required headings stable.
- Keep human judgment outside replaceable generated blocks.
- Patch targeted sections; avoid whole-file rewrites.
- Prefer links over duplicated prose.
- Use \`YYYY-MM-DD\` dates.
- Rebuild indexes after meaningful metadata or link changes.

## Note Types

- \`home_context\` - current operating context
- \`home_index\` - generated or curated indexes
- \`architecture\` - durable subsystem knowledge
- \`phase\` - bounded plans
- \`step\` - executable units
- \`bug\` - defect records
- \`decision\` - durable choices
- \`session\` - chronological work logs

## Workflow

1. Read [[00_Home/Active_Context|Active Context]].
2. Read the target step and only the linked notes you need.
3. Create a session note before major work.
4. Update notes conservatively while you work.
5. Rebuild indexes after meaningful changes.

## Link Discipline

- Prefer direct note links over copied prose.
- Link the note that owns the fact.
- Add reciprocal links when two notes materially depend on each other.
- Do not let index notes become shadow copies.

## Automation Safety Rules

- Prefer frontmatter updates, generated-block replacement, and targeted section edits.
- Fail closed on malformed structure.
- Preserve unknown frontmatter keys and untouched prose.
- Do not treat home notes or session logs as the only durable source of a fact.
- Run \`vault validate-all\` after structural changes.
- Run \`vault refresh-all-home-notes\` after meaningful note changes.

## Commands

- \`vault help\`
- \`vault help create-step\`
- \`vault create-phase "Workflow Adoption"\`
- \`vault lookup-code-graph auth --path src/core --exports-only\`
- \`vault migrate-step-notes\`
- \`vault refresh-all-home-notes\`
- \`vault validate-all\`
- \`vault-doctor\`

## Current Assumptions

- This vault is the only Agent Vault for \`{{repo_name}}\`.
- The vault lives directly at \`.agent-vault/\`.
- Automation should preserve manual edits over broad rewrites.
` as string;
