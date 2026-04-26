---
note_type: bug
template_version: 2
contract_version: 1
title: Full test suite fails on vault-resume ESM fs spy
bug_id: BUG-0002
status: resolved
severity: sev-3
category: logic
reported_on: '2026-04-25'
fixed_on: '2026-04-25'
owner: ''
created: '2026-04-25'
updated: '2026-04-25'
related_notes:
  - '[[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]'
  - '[[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]]'
  - '[[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]]'
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
tags:
  - agent-vault
  - bug
---

# BUG-0002 - Full test suite fails on vault-resume ESM fs spy

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Full test suite fails on vault-resume ESM fs spy.
- Related notes: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]], [[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]].

## Observed Behavior

- Running the full test suite with `bun run test` fails even though the targeted Phase 02 tests and `bun run typecheck` pass.
- Failure is in `test/skills/vault-resume.test.ts > vault-resume skill > selects the newest hyphenated session filename when no session id is provided`.
- Error text:

```text
TypeError: Cannot spy on export "readdirSync". Module namespace is not configurable in ESM.
Caused by: TypeError: Cannot redefine property: readdirSync
```

- The failing line is `vi.spyOn(fs, 'readdirSync')` in `test/skills/vault-resume.test.ts:127`.

## Expected Behavior

- `bun run test` should complete with all tests passing.
- The vault-resume test should verify newest hyphenated session selection without trying to spy on a non-configurable ESM module namespace export.

## Reproduction Steps

1. From repository root `/home/gimbo/dev/agent-vault`, ensure dependencies are installed.
2. Run `bun run test`.
3. Observe 139/140 tests pass and the vault-resume skill test fails with `Cannot spy on export "readdirSync"`.

## Scope / Blast Radius

- Affects local and CI confidence for the full test suite.
- Appears isolated to the test implementation for `pi-package/skills/vault-resume`, not the new targeted extraction code path.
- Treat as release-blocking because a failing full suite is still a failing suite.

## Suspected Root Cause

- The test imports Node's `fs` module namespace under ESM and attempts `vi.spyOn(fs, 'readdirSync')`.
- In the current Vitest/Bun/ESM environment, that namespace export is not configurable, so Vitest cannot redefine it.
- Likely fix: refactor the test to avoid spying on the ESM namespace export, e.g. create real temp fixture files, use dependency injection, or mock before import with an ESM-safe pattern.

## Confirmed Root Cause

- Fill this in once investigation proves the cause.
- Link the decisive evidence such as code paths, tests, or logs.
## Confirmed Root Cause

The test used `vi.spyOn(fs, 'readdirSync')` to mock `fs.readdirSync` for the sessions directory. In the current Vitest/Bun ESM environment, Node's `fs` module namespace export (`fs.readdirSync`) is not configurable, so Vitest cannot redefine it for spying. Error: `Cannot spy on export "readdirSync". Module namespace is not configurable in ESM.`

## Fix Applied

Removed the ESM-namespace spy entirely. The production `locatePreviousSession` function already sorts session files by filename timestamp using `extractTimestampFromFilename`, which correctly extracts YYYY-MM-DD-HHMMSS timestamps. By creating real temp fixture files with properly ordered timestamp filenames (`2026-04-20-010000-older-session.md` and `2026-04-20-020000-newer-session.md`), the real filesystem readdir + timestamp sort yields the correct newest-first ordering — no mocking needed.

## Verification

- `bun run test test/skills/vault-resume.test.ts` → 2/2 pass
- `bun run test` → 140/140 pass (full suite green)

## Workaround

- Targeted validation can still run with `bun run test test/core/note-mutations.test.ts test/core/vault-extract.test.ts` and `bun run typecheck`.
- This is not sufficient for release because the full suite remains red.

## Permanent Fix Plan

- Update `test/skills/vault-resume.test.ts` so it does not spy on `fs.readdirSync` directly from the ESM namespace.
- Prefer a temp-directory fixture that creates the needed `.agent-vault/05_Sessions` files and exercises real filesystem behavior.
- Run `bun run test test/skills/vault-resume.test.ts` first, then `bun run test`.

## Regression Coverage Needed

- Keep or replace the existing test case for selecting the newest hyphenated session filename when no session id is provided.
- Add coverage that does not depend on monkey-patching non-configurable ESM exports.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_01_implement-bounded-note-extraction-core|STEP-02-01 Implement bounded note extraction core]]
- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]]
- Session: [[05_Sessions/2026-04-25-053837-implement-bounded-note-extraction-core-pi|SESSION-2026-04-25-053837 pi session for Implement bounded note extraction core]]
- Architecture: [[01_Architecture/Agent_Workflow|Agent Workflow]]
- Architecture: [[01_Architecture/Code_Map|Code Map]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-25 - Reported after `bun run test` failed with 139/140 tests passing and one ESM spy failure.
<!-- AGENT-END:bug-timeline -->
