---
note_type: home_index
template_version: 1
contract_version: 1
title: Bugs Index
status: active
created: "2026-04-20"
updated: "2026-04-20"
tags:
  - agent-vault
  - home
  - index
  - bugs
---

# Bugs Index

Use this note as the manual table of contents for bug records in `03_Bugs/`.

## Triage Rules

- Create one note per bug.
- Give each bug a stable id such as `BUG-0001`.
- Link the bug from the active phase, related decision, and session notes when relevant.
- Close the loop by recording root cause and verification steps.

## Status Buckets

<!-- AGENT-START:bugs-index -->
_Last rebuilt: 2026-04-26._

- Notes indexed: 5
- Status summary: new (2), resolved (3)

| Id | Title | Status | Severity | Reported | Fixed | Linear |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-0003 | [Pi create-phase workflow implements work instead of creating a plan and fails to persist corrected plan](../03_Bugs/BUG-0003_pi-create-phase-workflow-implements-work-instead-of-creating-a-plan-and-fails-to-persist-corrected-plan.md) | new | sev-3 | 2026-04-26 | - | - |
| BUG-0001 | [Built-in context management inflates prompt prefill to 100k+ tokens](../03_Bugs/BUG-0001_built-in-context-management-inflates-prompt-prefill-to-100k-tokens.md) | new | sev-3 | 2026-04-23 | - | - |
| BUG-0005 | [vault_help casts arbitrary command string and can throw unhandled MCP/extension error](../03_Bugs/BUG-0005_vault-help-casts-arbitrary-command-string-and-can-throw-unhandled-mcp-extension-error.md) | resolved | sev-3 | 2026-04-26 | 2026-04-26 | - |
| BUG-0004 | [docs Prompt templates call non-existent vault_validate_all / vault_refresh_all MCP tools](../03_Bugs/BUG-0004_docs-prompt-templates-call-non-existent-vault-validate-all-vault-refresh-all-mcp-tools.md) | resolved | sev-3 | 2026-04-26 | 2026-04-26 | - |
| BUG-0002 | [Full test suite fails on vault-resume ESM fs spy](../03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy.md) | resolved | sev-3 | 2026-04-25 | 2026-04-25 | - |
<!-- AGENT-END:bugs-index -->

## Useful Links

- Template: [[07_Templates/Bug_Template|Bug Template]]
- Severity reference: [[06_Shared_Knowledge/Bug_Taxonomy|Bug Taxonomy]]
- Current work: [[00_Home/Active_Context|Active Context]]
