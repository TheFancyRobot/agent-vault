# Note Contracts

Use this note as the shared contract for all Agent Vault note templates in \`07_Templates/\`.

## Shared Frontmatter Contract

- Every note starts with YAML frontmatter.
- Every note declares \`note_type\`, \`template_version\`, and \`contract_version\`.
- Every note includes human-readable identity fields such as \`title\`, \`status\`, \`created\`, and \`updated\`.
- Dates use \`YYYY-MM-DD\`.
- Link collections use YAML lists even when empty so automation can append safely.

## Source Of Truth Boundaries

- \`00_Home/\` notes summarize and route. They should not become the only place a durable fact exists.
- Phase, architecture, bug, and decision notes hold durable truth for their domain.
- Session notes capture chronology and handoff state, but important conclusions discovered there should be promoted into the canonical durable note.
- Index notes improve discovery; they do not replace the notes they index.

## Stable Heading Contract

- Do not rename the required headings inside the templates.
- Keep heading order stable unless the template contract is intentionally versioned.
- Add detail inside sections instead of creating alternate headings for the same concept.

## Generated Block Contract

- Agent-managed regions use this exact wrapper:

\`\`\`md
<!-- AGENT-START:block-name -->
...
<!-- AGENT-END:block-name -->
\`\`\`

- Block names are stable identifiers, not display text.
- Humans may read these blocks, but automation may replace their contents.
- Do not nest generated blocks.
- Keep one logical data set per block so future tools can patch only the intended section.

## Editing Rules

- Human-authored narrative belongs outside generated blocks unless the template explicitly says otherwise.
- Automation should prefer updating frontmatter lists and generated blocks before rewriting freeform prose.
- When a note needs a new required field, bump \`contract_version\` and update the template in the same change.

## Manual-Edit Friendly Rules

- Keep one logical data set per generated block.
- Reserve generated blocks for summaries, indexes, snapshots, and append-only machine-managed history.
- Keep judgment calls, cautions, and nuanced explanations in normal prose sections.
- If a section grows beyond what is safe to patch mechanically, split the topic into a new note and link it.

## Template Inventory

- [[07_Templates/Phase_Template|Phase Template]]
- [[07_Templates/Step_Template|Step Template]]
- [[07_Templates/Bug_Template|Bug Template]]
- [[07_Templates/Decision_Template|Decision Template]]
- [[07_Templates/Session_Template|Session Template]]
- [[07_Templates/Architecture_Template|Architecture Template]]
