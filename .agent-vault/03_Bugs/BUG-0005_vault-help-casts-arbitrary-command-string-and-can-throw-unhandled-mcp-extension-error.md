---
note_type: bug
template_version: 2
contract_version: 1
title: vault_help casts arbitrary command string and can throw unhandled MCP/extension error
bug_id: BUG-0005
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

# BUG-0005 - vault_help casts arbitrary command string and can throw unhandled MCP/extension error

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- vault_help casts arbitrary command string and can throw unhandled MCP/extension error.
- Related notes: none linked yet.

## Observed Behavior

- `vault_help` accepted an arbitrary `command` string and cast it directly to the command-name type.
- Unknown command names caused `formatCommandHelp(...)` to throw, which surfaced as an unhandled MCP/pi-extension error instead of a structured tool failure.

## Expected Behavior

- `vault_help` should return a normal tool error payload when the caller asks for an unknown command.
- The MCP server and pi extension should both handle that failure path without throwing.

## Reproduction Steps

1. Call `vault_help` with a non-existent command name such as `not-a-real-command`.
2. Let the request flow through either the MCP server or the pi extension.
3. Observe the thrown `Unknown Agent Vault command: ...` error instead of a structured `isError` result.

## Scope / Blast Radius

- Affects help/discoverability flows in both the MCP server and the pi extension.
- Low data risk, but poor DX and brittle behavior for prompt-driven help requests or typo recovery.

## Suspected Root Cause

- The tool implementation trusted a runtime string and used a type cast instead of validating or catching failures from `formatCommandHelp`.

## Confirmed Root Cause

- Confirmed in both `src/mcp-server.ts` and `pi-package/extensions/index.ts`, where `params.command` / `command` was cast and passed straight to `formatCommandHelp(...)`.
- Fixed by wrapping the help lookup in `try/catch` and returning a structured error result instead of letting the exception escape.
- Regression coverage added in `test/core/vault-help-pi-extension.test.ts`.

## Workaround

- Avoid passing unknown command names to `vault_help`; call it with no args to list commands first.
- This is only a temporary user workaround and should not be relied on after the fix.

## Permanent Fix Plan

- Keep help lookup guarded so unknown commands always round-trip as ordinary tool errors.
- Mirror the behavior between MCP server and pi extension to avoid harness-specific surprises.

## Regression Coverage Needed

- Preserve the pi-extension regression test for unknown commands.
- Extend MCP-side coverage later if a dedicated MCP help test is added.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- None yet.
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
- 2026-04-26 - Wrapped help lookup in structured error handling for MCP and pi extension paths.
<!-- AGENT-END:bug-timeline -->
