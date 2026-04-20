---
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

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

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
