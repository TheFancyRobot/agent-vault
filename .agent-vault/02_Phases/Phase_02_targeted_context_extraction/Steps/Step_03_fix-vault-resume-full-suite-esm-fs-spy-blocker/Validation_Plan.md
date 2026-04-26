# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Bug: [[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]

## Required Commands

1. `bun run test test/skills/vault-resume.test.ts`
2. `bun run test`
3. `bun run typecheck`

## Acceptance Checks

- No test uses `vi.spyOn(fs, 'readdirSync')` against the ESM namespace.
- The newest hyphenated session filename test still creates at least two session files and proves the newer session is selected.
- BUG-0002 is updated with confirmed root cause, fixed date, and validation evidence.

## Manual Checks

- Review the diff to ensure no production behavior was weakened just to satisfy the test.
- Confirm `process.chdir(originalCwd)` and temp cleanup still run after each test.

## Junior Readiness Verdict

- PASS: the bug note gives the exact failing line and this plan gives the replacement strategy and validation commands.
