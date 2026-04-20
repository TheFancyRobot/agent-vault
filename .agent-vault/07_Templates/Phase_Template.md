---
note_type: phase
template_version: 2
contract_version: 1
title: "<phase title>"
phase_id: "PHASE-000"
status: planned
owner: ""
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
depends_on: []
related_architecture: []
related_decisions: []
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase Template

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- State the end result in one or two sentences.
- Write the outcome, not just the activity.

## Why This Phase Exists

- Explain the problem, risk, or opportunity that makes this phase worth doing.
- Name the user, team, or system impact.

## Scope

- List the work that is included in this phase.
- Be concrete about systems, commands, workflows, or docs that will change.

## Non-Goals

- List related work that is intentionally out of scope.
- Use this section to stop future scope creep.

## Dependencies

- List required prior phases, decisions, architecture notes, tools, or external inputs.
- Note anything that can block start or completion.

## Acceptance Criteria

- Write a checklist of conditions that must be true before this phase is complete.
- Prefer observable statements such as passing tests, updated docs, or verified workflows.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase:
- Current phase status: planned
- Next phase:
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/<note name>|<architecture note>]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/<decision note>|<decision note>]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/<bug note>|<bug note>]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[<step note>|Step 01]] - Describe the next concrete unit of execution.
- [ ] [[<step note>|Step 02]] - Add more steps as the plan becomes clearer.
<!-- AGENT-END:phase-steps -->

## Notes

- Capture short planning notes, risks, assumptions, or verification reminders here.
- Put durable facts in linked decision, bug, architecture, or session notes instead of duplicating them.
