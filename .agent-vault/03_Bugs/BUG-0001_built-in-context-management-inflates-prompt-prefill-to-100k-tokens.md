---
note_type: bug
template_version: 2
contract_version: 1
title: Built-in context management inflates prompt prefill to 100k+ tokens
bug_id: BUG-0001
status: new
severity: sev-3
category: logic
reported_on: '2026-04-23'
fixed_on: ''
owner: ''
created: '2026-04-23'
updated: '2026-04-23'
related_notes:
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]]'
  - '[[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_04_add-tests-docs-and-migration-notes|STEP-01-04 Add tests, docs, and migration notes]]'
  - '[[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
tags:
  - agent-vault
  - bug
---

# BUG-0001 - Built-in context management inflates prompt prefill to 100k+ tokens

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Built-in context management inflates prompt prefill to 100k+ tokens.
- Related notes: [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]].

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
- Initial static footprint measurement in this repo shows ~68k estimated tokens across repo-owned context assets before counting the agent harness itself: vault notes ~36.8k, workflow prompts ~28.4k, vault contract ~2.6k, root instructions ~0.5k.
- The heaviest individual files are verbose phase/step notes, `Code_Graph.md`, and the `vault-execute` / `vault-plan` skill and command prompts.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
- Compared with `v0.3.0`, the repo-owned context surface grew from ~12.1k estimated tokens to ~67.0k estimated tokens (+~54.9k). The largest deltas are checked-in vault notes (+~35.6k tokens), the new vault operating contract/root instructions (+~3.0k), and expanded workflow prompt surface (+~16.3k, mostly new `pi-package/skills/*/SKILL.md` files).
- The highest-impact runtime issue is not just aggregate file count but **workflow-directed reading of very large notes**. For example, STEP-01-03's Required Reading chains two prior full step notes plus the phase, decision, and architecture notes. A representative `/vault:execute` payload for that step is ~77k chars (~19.3k tokens) from repo docs alone before tool schemas, harness instructions, code reads, or command output. STEP-01-04 is ~88k chars (~22.0k tokens).
- The step notes are expensive because they embed large amounts of reusable boilerplate and execution guidance directly in every note, then cross-link previous large step notes as mandatory reading. This creates multiplicative context loading during execution/resume flows.
- `package.json` does not publish `.agent-vault/`, so the heaviest vault-note inflation is primarily a contributor/development issue for this repository itself rather than an npm package payload issue for downstream users.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.
- Measure the biggest persistent context contributors in the vault and prompt surface.
- Reduce always-loaded guidance and move heavyweight detail behind on-demand reads.
- Introduce compact execution/handoff views so workflows can load summaries instead of full verbose notes.
- Add regression checks or fixtures that guard against context inflation in future releases.
- Keep `Code_Graph.md` as a thin human-readable summary note.
- Move full symbol detail into a machine-readable JSON sidecar under `.agent-vault/08_Automation/code-graph/index.json`.
- Teach refresh/init to regenerate both artifacts so default vault traversals stay cheap while lookup-heavy workflows can still access full detail on demand.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.
- Keep `test/context-prompt-budgets.test.ts` as a guardrail for workflow prompt growth.
- Extend budget checks later to other heavy workflows such as `vault-plan` and to generated note templates or execution-summary blocks once their target budgets are defined.
- Keep migration coverage for `migrate-step-notes` so legacy step notes can be upgraded safely and idempotently.
- Extend migration support later if phase/session notes also need compact split layouts.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_01_built_in_vault_context_management/Phase|PHASE-01 Built-in vault context management]]
- Step: [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_03_implement-step-mirrors-and-workflow-integration|STEP-01-03 Implement step mirrors and workflow integration]]
- Step: [[02_Phases/Phase_01_built_in_vault_context_management/Steps/Step_04_add-tests-docs-and-migration-notes|STEP-01-04 Add tests, docs, and migration notes]]
- Decision: [[04_Decisions/DEC-0001_adopt-vault-owned-context-management-primitives-for-execution-workflows|DEC-0001 Adopt vault-owned context management primitives for execution workflows]]
- Architecture: [[01_Architecture/Agent_Workflow|Agent Workflow]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-23 - Reported.
<!-- AGENT-END:bug-timeline -->

