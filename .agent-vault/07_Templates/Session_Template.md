---
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

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

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

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- \`path/to/file\`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: \`bun test <target>\`
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
