---
note_type: decision
template_version: 2
contract_version: 1
title: "<decision title>"
decision_id: "DEC-0000"
status: proposed
decided_on: "YYYY-MM-DD"
owner: ""
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
supersedes: []
superseded_by: []
related_notes: []
tags:
  - agent-vault
  - decision
---

# Decision Template

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Use values such as \`proposed\`, \`accepted\`, \`superseded\`, or \`rejected\`.
- Keep the frontmatter status and this section aligned.

## Context

- Explain the problem, constraint, timing, and pressures that forced a choice.
- Link the phase, bug, or architecture note that created the need.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/<phase path>/Phase|<phase name>]]
- Architecture: [[01_Architecture/<note name>|<architecture note>]]
- Bug: [[03_Bugs/<bug note>|<bug note>]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- YYYY-MM-DD - Created as \`proposed\`.
- YYYY-MM-DD - Updated after review.
<!-- AGENT-END:decision-change-log -->
