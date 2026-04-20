---
note_type: decision
template_version: 2
contract_version: 1
title: Adopt vault-owned context management primitives for execution workflows
decision_id: DEC-0001
status: accepted
decided_on: '2026-04-20'
owner: 'Pi'
created: '2026-04-20'
updated: '2026-04-20'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]'
tags:
  - agent-vault
  - decision
---

# DEC-0001 - Adopt vault-owned context management primitives for execution workflows

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Adopt vault-owned context management primitives for execution workflows.
- Related notes: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]].

## Decision

- Adopt a built-in, vault-owned context management subsystem for execution workflows, centered on four v1 primitives: `checkpoint`, `transition`, `resume-context`, and `compact-research`.
- Keep normal workflows primary: `/vault:execute`, `/vault:resume`, and `/vault:orchestrate` should use this subsystem implicitly where helpful.
- Also expose the primitives as advanced/manual commands with canonical names plus aliases.
- Persist the canonical current effective context on session notes under a hybrid frontmatter/prose model.
- Mirror a small routing-oriented context view onto step notes for continuity across sessions.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.

## Tradeoffs

- Benefits: makes resume/handoff/orchestration behavior first-class, durable, and toolable without depending on external context-management packages.
- Benefits: keeps workflow UX simple while still allowing manual control for advanced users.
- Costs: adds schema, mirroring, and update logic that must remain consistent across session and step notes.
- Costs: frontmatter becomes slightly richer, so validators and docs must be updated carefully.
- Constraint: only the current effective state should live in frontmatter; historical narration should remain in prose/workflow sections to avoid bloat.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- Implement canonical session-note `context` frontmatter with operational core fields: `context_id`, `status`, `updated_at`, `current_focus`, `resume_target`, and `last_action`.
- Use a simple lifecycle for `status`: `active`, `paused`, `blocked`, `completed`.
- Represent `resume_target` as a structured object with required fields `type`, `target`, and `section`.
- Support a lean v1 `resume_target.type` set: `session`, `step`, `phase`, and `handoff`.
- Represent `last_action` as a hybrid object with required field `type`; use a lifecycle-oriented v1 enum.
- Mirror `context_id`, `session_id`, and `status` onto step-note frontmatter; keep fuller human summary in prose.
- Update the step mirror only on lifecycle changes or when the active canonical session changes.
- Add tests, docs, and migration notes as part of the implementation phase.
- Use friendly canonical manual command names: `save-context`, `switch-context`, `resume-context`, `prepare-context`; keep primitive names as aliases.
- Use a broader v1 `last_action.type` set: `saved`, `switched`, `resumed`, `prepared`, `paused`, `completed`.
- Represent `current_focus` as a hybrid object with required fields `summary` and `target`.
- Keep a single canonical session prose section for handoff/prepared context: `## Context Handoff`.
- Do not add a separate findings section in v1; fold prepared findings into the handoff section.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-20 - Created as `proposed`.
- 2026-04-20 - Accepted after design review and requirement capture.
<!-- AGENT-END:decision-change-log -->
