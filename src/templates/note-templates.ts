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

Use this note for a bounded phase of work in \\\`02_Phases/\\\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

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

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- State the exact outcome this step should produce.
- Keep it narrow enough that success or failure is easy to observe.

## Why This Step Exists

- Explain why this step matters to the parent phase.
- Call out the risk reduced, capability added, or knowledge gained.

## Prerequisites

- List the notes, approvals, tooling, branch state, or prior steps required before starting.
- Include blocking commands or setup steps if they are easy to forget.

## Relevant Code Paths

- List the most likely files, directories, packages, tests, commands, or docs to inspect.
- Include only the paths that help a new engineer get oriented quickly.

## Required Reading

- Link the minimum notes, docs, source files, or tests that must be read before editing.
- If a reader can skip something safely, do not list it here.

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: YYYY-MM-DD
- Next action:
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- YYYY-MM-DD - Session note link - Short progress update.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
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

Use one note per bug in \\\`03_Bugs/\\\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- State the defect in one or two sentences.
- Include the affected workflow, command, or component.

## Observed Behavior

- Describe what actually happens.
- Include error text, incorrect output, broken UI state, or missing side effect when relevant.

## Expected Behavior

- Describe what should happen instead.
- Keep this outcome-specific so validation is straightforward.

## Reproduction Steps

1. List the exact setup state.
2. List the user or developer actions.
3. Record the observed result.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

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

Use one note per durable choice in \\\`04_Decisions/\\\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Use values such as \\\`proposed\\\`, \\\`accepted\\\`, \\\`superseded\\\`, or \\\`rejected\\\`.
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
related_bugs: []
related_decisions: []
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - session
---

# Session Template

Use one note per meaningful work session in \\\`05_Sessions/\\\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- State the intended outcome for this session.
- Tie it to a phase, bug, decision, or release concern.

## Planned Scope

- List the specific tasks intended for this session.
- Note explicit out-of-scope items if they could distract execution.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- HH:MM - Started session and reviewed context.
- HH:MM - Implemented or investigated change.
<!-- AGENT-END:session-execution-log -->

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.

## Context Handoff

- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.
- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.

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

- State what finished, what remains, and whether the session ended in a clean handoff state.
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

Use this note when a subsystem or cross-cutting concern needs durable explanation. This note is the source of truth for the area it covers. A new engineer should be able to read it and understand the shape of the system before editing code. Link outward to the related phase and decision notes so this record stays connected to execution and governance; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Decision_Template|Decision Template]] as the neighboring note contracts.

## Purpose

- Explain what part of the system this note covers.
- Name the main responsibility and the key question this note answers.

## Overview

- Describe the subsystem at a high level.
- Explain how it fits into the wider product or monorepo.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Component or module name - Responsibility.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- \\\`packages/...\\\` - Why this path matters.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Record invariants, contracts, dependencies, or operational rules that should not be broken.
- Include anything future changes must preserve.

## Failure Modes

- List the ways this area can fail.
- Include triggers, symptoms, and what to inspect first.

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
- Every note declares \\\`note_type\\\`, \\\`template_version\\\`, and \\\`contract_version\\\`.
- Every note includes human-readable identity fields such as \\\`title\\\`, \\\`status\\\`, \\\`created\\\`, and \\\`updated\\\`.
- Dates use \\\`YYYY-MM-DD\\\`.
- Link collections use YAML lists even when empty so automation can append safely.

## Source Of Truth Boundaries

- \\\`00_Home/\\\` notes summarize and route. They should not become the only place a durable fact exists.
- Phase, architecture, bug, and decision notes hold durable truth for their domain.
- Session notes capture chronology and handoff state, but important conclusions discovered there should be promoted into the canonical durable note.
- Index notes improve discovery; they do not replace the notes they index.

## Stable Heading Contract

- Do not rename the required headings inside the templates.
- Keep heading order stable unless the template contract is intentionally versioned.
- Add detail inside sections instead of creating alternate headings for the same concept.

## Generated Block Contract

- Agent-managed regions use this exact wrapper:

\\\`\\\`\\\`md
<!-- AGENT-START:block-name -->
...
<!-- AGENT-END:block-name -->
\\\`\\\`\\\`

- Block names are stable identifiers, not display text.
- Humans may read these blocks, but automation may replace their contents.
- Do not nest generated blocks.
- Keep one logical data set per block so future tools can patch only the intended section.

## Editing Rules

- Human-authored narrative belongs outside generated blocks unless the template explicitly says otherwise.
- Automation should prefer updating frontmatter lists and generated blocks before rewriting freeform prose.
- When a note needs a new required field, bump \\\`contract_version\\\` and update the template in the same change.

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
` as string;
