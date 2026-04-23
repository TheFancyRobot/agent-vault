/**
 * Embedded note templates from 07_Templates/.
 * These are the canonical template shapes for all vault note types.
 */

export const PHASE_TEMPLATE = `---
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

Use this note for a bounded phase. Keep it focused, link outward, and avoid duplicating durable detail from architecture, bug, or decision notes. See [[07_Templates/Note_Contracts|Note Contracts]].

## Objective

- State the outcome, not just the activity.

## Why This Phase Exists

- Explain the problem and who or what it affects.

## Scope

- List the systems, commands, workflows, or docs that are in scope.

## Non-Goals

- List related work that is intentionally out of scope.

## Dependencies

- List prerequisites or blockers.

## Acceptance Criteria

- Use observable completion checks.

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

- Keep short planning notes, risks, or assumptions here.
` as string;

export const STEP_TEMPLATE = `---
note_type: step
template_version: 2
contract_version: 1
title: "<step title>"
step_id: "STEP-000"
phase: "[[02_Phases/<phase path>/Phase|<phase name>]]"
status: planned
owner: ""
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step Template

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- State the exact outcome.

## Required Reading

- Link only the minimum notes, docs, files, or tests that must be read first.

## Companion Notes

- [[<step note directory>/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[<step note directory>/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[<step note directory>/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[<step note directory>/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: YYYY-MM-DD
- Next action:
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Put judgment calls or cautions here.

## Session History

<!-- AGENT-START:step-session-history -->
- YYYY-MM-DD - Session note link - Short progress update.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
` as string;

export const BUG_TEMPLATE = `---
note_type: bug
template_version: 2
contract_version: 1
title: "<bug title>"
bug_id: "BUG-0000"
status: new
severity: sev-3
category: logic
reported_on: "YYYY-MM-DD"
fixed_on: ""
owner: ""
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes: []
tags:
  - agent-vault
  - bug
---

# Bug Template

Use one note per bug. Capture reproduction, impact, root cause, workaround, and verification, then link back to the relevant phase, step, decision, or session. See [[07_Templates/Note_Contracts|Note Contracts]].

## Summary

- State the defect and affected workflow, command, or component.

## Observed Behavior

- Describe what actually happens.

## Expected Behavior

- Describe what should happen instead.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.

## Suspected Root Cause

- Record current theories and assumptions.

## Confirmed Root Cause

- Record the proven cause and decisive evidence.

## Workaround

- Describe any temporary mitigation and remaining risk.

## Permanent Fix Plan

- Describe the intended durable fix.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/<phase path>/Phase|<phase name>]]
- Decision: [[04_Decisions/<decision note>|<decision note>]]
- Session: [[05_Sessions/<session note>|<session note>]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- YYYY-MM-DD - Reported.
- YYYY-MM-DD - Investigation updated.
- YYYY-MM-DD - Fixed and awaiting verification.
<!-- AGENT-END:bug-timeline -->
` as string;

export const DECISION_TEMPLATE = `---
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

Use one note per durable choice. Record what was chosen, why, tradeoffs, and supersession history, and link back to the phase, bug, or architecture note that made the choice necessary. See [[07_Templates/Note_Contracts|Note Contracts]].

## Status

- Keep this section aligned with the frontmatter status.

## Context

- Explain the problem, constraints, and links that forced a choice.

## Decision

- State the chosen direction and boundary clearly.

## Alternatives Considered

- List realistic alternatives and why they were not selected.

## Tradeoffs

- Describe costs, risks, complexity, and operational implications.

## Consequences

- Record what changes now and any required follow-up work.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/<phase path>/Phase|<phase name>]]
- Architecture: [[01_Architecture/<note name>|<architecture note>]]
- Bug: [[03_Bugs/<bug note>|<bug note>]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- YYYY-MM-DD - Created as \\\`proposed\\\`.
- YYYY-MM-DD - Updated after review.
<!-- AGENT-END:decision-change-log -->
` as string;

export const SESSION_TEMPLATE = `---
note_type: session
template_version: 2
contract_version: 1
title: "<session title>"
session_id: "SESSION-YYYY-MM-DD-01"
date: "YYYY-MM-DD"
status: in-progress
owner: ""
branch: ""
phase: "[[02_Phases/<phase path>/Phase|<phase name>]]"
context:
  context_id: "SESSION-YYYY-MM-DD-01"
  status: active
  updated_at: "YYYY-MM-DDTHH:MM:SS.000Z"
  current_focus:
    summary: "Advance [[02_Phases/<phase path>/Steps/<step note>|<step name>]]."
    target: "[[02_Phases/<phase path>/Steps/<step note>|<step name>]]"
  resume_target:
    type: step
    target: "[[02_Phases/<phase path>/Steps/<step note>|<step name>]]"
    section: "Context Handoff"
  last_action:
    type: saved
related_bugs: []
related_decisions: []
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - session
---

# Session Template

Use one note per meaningful work session. Record chronology, validation, and handoff state, but promote durable conclusions into phase, architecture, bug, or decision notes. See [[07_Templates/Note_Contracts|Note Contracts]].

## Objective

- State the intended outcome for this session.

## Planned Scope

- List the specific tasks intended for this session.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- HH:MM - Started session and reviewed context.
- HH:MM - Implemented or investigated change.
<!-- AGENT-END:session-execution-log -->

## Findings

- Record important facts learned during the session.

## Context Handoff

- Use this as the canonical prose section for prepared context and resume notes.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- \\\`path/to/file\\\`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: \\\`bun test <target>\\\`
- Result: pass | fail | not run
- Notes:
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- [[03_Bugs/<bug note>|<bug note>]] - Short note.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- [[04_Decisions/<decision note>|<decision note>]] - Short note.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Next concrete action.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether handoff is clean.
` as string;

export const ARCHITECTURE_TEMPLATE = `---
note_type: architecture
template_version: 2
contract_version: 1
title: "<architecture note title>"
architecture_id: "ARCH-0000"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes: []
tags:
  - agent-vault
  - architecture
---

# Architecture Template

Use this note when a subsystem or cross-cutting concern needs durable explanation. Keep it high-signal, path-first, and linked to the related phase and decision notes. See [[07_Templates/Note_Contracts|Note Contracts]].

## Purpose

- Explain what part of the system this note covers.

## Overview

- Describe the subsystem and how it fits into the repo.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Component or module name - Responsibility.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- \\\`packages/...\\\` - Why this path matters.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Record invariants, contracts, dependencies, or operational rules that must hold.

## Failure Modes

- List failures, symptoms, and what to inspect first.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/<related note>|<related note>]]
- [[04_Decisions/<decision note>|<decision note>]]
- [[02_Phases/<phase path>/Phase|<phase name>]]
<!-- AGENT-END:architecture-related-notes -->
` as string;

export const NOTE_CONTRACTS = `# Note Contracts

Use this note as the shared contract for all Agent Vault note templates in \\\`07_Templates/\\\`.

## Shared Frontmatter Contract

- Every note starts with YAML frontmatter.
- Every note declares \`note_type\`, \`template_version\`, and \`contract_version\`.
- Dates use \`YYYY-MM-DD\`.
- Link collections stay as YAML lists.

## Source Of Truth Boundaries

- Home notes summarize and route.
- Phase, architecture, bug, and decision notes hold durable truth.
- Session notes capture chronology and handoff state.
- Index notes improve discovery only.

## Stable Heading Contract

- Do not rename required headings.
- Keep heading order stable unless the template contract changes.

## Generated Block Contract

- Agent-managed regions use this exact wrapper:

\\\`\\\`\\\`md
<!-- AGENT-START:block-name -->
...
<!-- AGENT-END:block-name -->
\\\`\\\`\\\`

- Block names are stable identifiers.
- Automation may replace block contents.
- Do not nest generated blocks.
- Keep one logical data set per block.

## Editing Rules

- Keep human narrative outside generated blocks.
- Prefer updating frontmatter lists and generated blocks before rewriting prose.
- Bump \`contract_version\` when required fields change.

## Manual-Edit Friendly Rules

- Reserve generated blocks for summaries, indexes, snapshots, and append-only history.
- Keep judgment calls and nuanced explanation in normal prose.
- Split oversized sections into linked notes.

## Template Inventory

- [[07_Templates/Phase_Template|Phase Template]]
- [[07_Templates/Step_Template|Step Template]]
- [[07_Templates/Bug_Template|Bug Template]]
- [[07_Templates/Decision_Template|Decision Template]]
- [[07_Templates/Session_Template|Session Template]]
- [[07_Templates/Architecture_Template|Architecture Template]]
` as string;
