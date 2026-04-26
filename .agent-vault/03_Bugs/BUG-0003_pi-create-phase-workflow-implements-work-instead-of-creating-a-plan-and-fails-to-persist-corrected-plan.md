---
note_type: bug
template_version: 2
contract_version: 1
title: Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan
bug_id: BUG-0003
status: new
severity: sev-3
category: logic
reported_on: '2026-04-26'
fixed_on: ''
owner: ''
created: '2026-04-26'
updated: '2026-04-26'
related_notes:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]'
tags:
  - agent-vault
  - bug
---

# BUG-0003 - Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan.
- Related notes: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]].

## Observed Behavior

- In pi, the `create-phase` workflow behaves like an execution flow: it starts implementing changes instead of producing a planning artifact.
- If the user interrupts and corrects the agent, asking it to create a plan instead, the resulting plan is not written into the vault as durable phase/step notes.

## Expected Behavior

- The planning workflow should stay in planning mode, gathering context and writing the resulting phase/step plan into the vault.
- A user correction from "implement" to "plan" should redirect the workflow without losing the durable write-back step.

## Reproduction Steps

1. Invoke the pi workflow intended to create a phase/plan.
2. Observe the agent begin implementation work instead of creating a plan.
3. Correct the agent and explicitly ask it to create a plan.
4. Observe that the follow-up plan is not persisted to the vault.

## Scope / Blast Radius

- List affected packages, commands, integrations, environments, or users.
- Note whether this is isolated, widespread, data-sensitive, or release-blocking.

## Suspected Root Cause

- Record current theories before the issue is proven.
- Mark assumptions clearly.
- In pi, Agent Vault exposes **skills** plus MCP tools, not hard slash-command prompts like Claude/OpenCode/Codex. The installed pi experience therefore relies on normal skill selection and freeform agent behavior rather than an imperative command wrapper.
- Evidence: `README.md` distinguishes slash commands for Claude/OpenCode/Codex from "pi bundled skills" and says to use the installed pi package tools/skills in pi, not `/vault:*` commands.
- The bundled `vault-create-phase` skill only instructs the agent to call `vault_create` for a phase note; it is not a planning workflow and does not enforce plan persistence behavior.
- The bundled `vault-plan` skill does describe durable write-back requirements, but as a skill it still depends on the agent following guidance. There is no pi-specific command shim that guarantees the workflow stays in planning mode and completes the required `vault_create`/`vault_mutate`/`vault_refresh` sequence.
- Likely outcome: in pi, broad user requests can drift into implementation because the model is using advisory skills instead of a strict slash-command prompt, and mid-course correction to "create a plan" can still fail to persist notes because no command wrapper forces vault write-back before completion.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.

## Workaround

- Describe any temporary mitigation.
- Say who can use it and what risk remains.

## Permanent Fix Plan

- Describe the intended durable fix.
- Include related steps, decisions, or validation strategy if known.
- **Goal:** make Agent Vault workflow entrypoints behave consistently across Claude/OpenCode, Codex, and pi without introducing a pi-only workflow unless prompt-template parity proves insufficient.
- **Primary design:** move pi onto the same explicit workflow-entry model as the other harnesses by shipping package prompt templates for the workflow commands (`plan`, `refine`, `execute`, `resume`, `orchestrate`, `enrich`, `validate`, `refresh`) from the same shared source material that already drives slash-command content elsewhere.
- **Prompt-source unification:** define one canonical workflow prompt source per workflow, then render harness-specific wrappers/names from that source. Do not let pi skills and Claude/Codex prompt files drift as separate copies.
- **Invocation contract:** in pi, prefer explicit prompt-template entrypoints for workflow starts instead of relying on opportunistic skill matching. Keep MCP tools as the execution substrate in every harness.
- **Skill role narrowing:** demote low-level note-creation skills like `vault-create-phase` to manual helper status so they do not masquerade as planning workflows. Consider hiding them from automatic model invocation while keeping them callable explicitly.
- **Shared workflow guardrails:** strengthen the common plan/create-phase prompts so they explicitly forbid implementation when in planning mode and require durable vault write-back before completion. Add a final checklist such as: created/updated note paths, refresh run, validate run, and explicit failure if no notes were persisted.
- **Docs alignment:** update README/install output to tell pi users to invoke prompt templates for workflows and reserve skills/tools for helper operations.
- **Fallback threshold:** only consider a pi-specific command or extension-level workflow wrapper if prompt-template parity plus stronger shared guardrails still fails to keep pi in planning mode. If that fallback becomes necessary, document why prompt expansion alone is insufficient in pi and get explicit approval before implementation.

## Regression Coverage Needed

- List tests, fixtures, reproductions, alerts, or docs updates needed to stop the bug from returning.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]]
- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]
- Architecture: [[01_Architecture/Agent_Workflow|Agent Workflow]]
- Architecture: [[01_Architecture/Code_Map|Code Map]]
- Decision: [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002 Use headings and generated blocks as targeted extraction selectors]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
<!-- AGENT-END:bug-timeline -->
