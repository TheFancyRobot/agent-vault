/**
 * Embedded AGENTS.md template, genericized with {{repo_name}} placeholder.
 */

export const AGENTS_MD_TEMPLATE = `# Agent Vault Operating Contract

This file defines how agents and humans should work inside \`.agent-vault/\`.

## Purpose

Agent Vault is the durable memory layer for this repository.
It stores planning, architecture, bug, decision, and session context.
It is not the source of truth for runtime behavior; the codebase is.

## Source of Truth

- **Codebase** = implementation, tests, behavior, executable docs
- **Agent Vault** = context, planning, history, forensics, decisions, execution notes

When in doubt, keep a fact in one canonical place and link to it.

## Read Order

Do not scan the whole vault by default.

1. \`00_Home/Active_Context.md\`
2. Relevant step note
3. Linked phase note
4. Linked architecture / bug / decision notes
5. Relevant recent session if needed

Use local context clusters, not full-vault loading.

## Core Rules

- One repo = one vault.
- Prefer safe bounded mutations.
- Keep Markdown readable without special tooling.
- Prefer links over duplicated prose.
- No orphan notes.
- Do not invent new structure when existing structure works.

## Safe Mutations

Allowed:
- create note from template
- update frontmatter
- update a known heading section
- replace a bounded generated block
- append to append-only sections
- regenerate indexes

Avoid:
- casual whole-note rewrites
- deleting unknown sections
- removing human-authored narrative
- unnecessary renames or reformatting

## Vault Structure

\`\`\`text
.agent-vault/
├── 00_Home/
├── 01_Architecture/
├── 02_Phases/
├── 03_Bugs/
├── 04_Decisions/
├── 05_Sessions/
├── 06_Shared_Knowledge/
├── 07_Templates/
└── 08_Automation/
\`\`\`

## Note Types

- **Phase** - bounded milestone or workstream
- **Step** - smallest executable work unit
- **Bug** - defect record and forensics
- **Decision** - durable design/workflow choice
- **Session** - chronological work log
- **Architecture** - durable system explanation

## Linking Rules

- Phase links to its steps.
- Step links to its phase and related sessions.
- Bugs and decisions link to related steps/phases/sessions when known.
- Architecture notes should link where they materially inform execution.

## Context Discipline

- Home notes are routing aids, not the main payload.
- Treat \`01_Architecture/Code_Graph.md\` as summary-only.
- Use \`vault_lookup_code_graph\` for symbol/file lookup instead of loading the full code-graph index.
- Prefer narrow \`vault_traverse\` queries over broad reads.

## Working Loop

1. Read the minimum required context.
2. Create a session before major work.
3. Update notes conservatively while working.
4. Record bugs and decisions when they become durable.
5. Refresh indexes and leave a clean handoff.

## Related Notes

- [[README|README]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[00_Home/Active_Context|Active Context]]
` as string;
