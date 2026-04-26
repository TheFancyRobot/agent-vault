---
note_type: bug
template_version: 2
contract_version: 1
title: docs Prompt templates call non-existent vault_validate_all / vault_refresh_all MCP tools
bug_id: BUG-0004
status: resolved
severity: sev-3
category: logic
reported_on: '2026-04-26'
fixed_on: '2026-04-26'
owner: ''
created: '2026-04-26'
updated: '2026-04-26'
related_notes: []
tags:
  - agent-vault
  - bug
---

# BUG-0004 - docs Prompt templates call non-existent vault_validate_all / vault_refresh_all MCP tools

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- docs Prompt templates call non-existent vault_validate_all / vault_refresh_all MCP tools.
- Related notes: none linked yet.

## Observed Behavior

- The workflow prompt templates referenced MCP tools named `vault_validate_all`, `vault_refresh_all`, and `vault_create_phase`.
- Those tool names do not exist in the current MCP server or pi extension surface, so an agent following the prompts would attempt invalid tool calls or drift into fallback behavior.

## Expected Behavior

- Prompt templates should reference the current tool surface: `vault_validate` with `target: "all"`, `vault_refresh` with `target: "all"`, and `vault_create` with `type: "phase"`.
- Workflow docs and installed prompt templates should stay aligned with the runtime MCP/extension API.

## Reproduction Steps

1. Read `prompts/vault:init.md`, `prompts/vault:refresh.md`, `prompts/vault:validate.md`, or `prompts/vault:create-phase.md` from a build that predates the fix.
2. Follow the prompt literally and attempt to call the named MCP tools.
3. Observe that `vault_validate_all`, `vault_refresh_all`, and `vault_create_phase` are not present in the current tool surface.

## Scope / Blast Radius

- Affects prompt-template-driven workflows across pi, Codex, and any harness consuming the shared `prompts/` source.
- Does not corrupt note data directly, but causes workflow entrypoints to be misleading and can block or derail execution.

## Suspected Root Cause

- The shared prompts drifted behind the actual runtime tool names during the workflow-template migration.
- Older helper naming (`*_all`, `*_phase`) survived in prose even after the runtime consolidated on `vault_validate`, `vault_refresh`, and `vault_create`.

## Confirmed Root Cause

- Confirmed in `prompts/vault:init.md`, `prompts/vault:refresh.md`, `prompts/vault:validate.md`, and `prompts/vault:create-phase.md`, which referenced tool names that do not exist in `src/mcp-server.ts` or `pi-package/extensions/index.ts`.
- Fixed by updating the prompts to call the current tools and by adding `test/install.test.ts` coverage that asserts the shipped prompts reference current MCP tool names.

## Workaround

- Manually translate the stale names to the current API: use `vault_refresh` / `vault_validate` with `target: "all"`, and `vault_create` with `type: "phase"`.
- Risk remains if users rely on an unfixed installed package or copied prompt text.

## Permanent Fix Plan

- Keep shared workflow prompts sourced from the runtime tool surface rather than from stale helper names.
- Preserve regression coverage in `test/install.test.ts` so future packaging or wording changes cannot silently reintroduce nonexistent MCP tool names.

## Regression Coverage Needed

- `test/install.test.ts` should continue checking that shipped workflow prompts reference `vault_refresh`, `vault_validate`, and `vault_create` rather than removed aliases.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- None yet.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
- 2026-04-26 - Fixed prompt templates to reference the current MCP tool names and added install-test coverage.
<!-- AGENT-END:bug-timeline -->
