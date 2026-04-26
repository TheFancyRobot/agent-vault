# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Bug: [[03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy|BUG-0002 Full test suite fails on vault-resume ESM fs spy]]

## Outcome and Success Condition

- Fix the full test suite by replacing the failing ESM namespace spy in `test/skills/vault-resume.test.ts` with a safe real-filesystem fixture or ESM-safe mock.
- Success means `bun run test test/skills/vault-resume.test.ts` and `bun run test` both pass.

## Why This Matters

- PHASE-02 cannot honestly claim validation completeness while the full suite is red.
- The failure is currently unrelated to targeted extraction, but it blocks release confidence and downstream validation of phase changes.

## Prerequisites and Setup

- Read BUG-0002 fully before editing.
- Use the existing temp vault helpers in `test/skills/vault-resume.test.ts`; they already create real session and step notes.
- No production behavior should change unless the test exposes a real bug.

## Starting Files and Directories

- `test/skills/vault-resume.test.ts` — remove `vi.spyOn(fs, 'readdirSync')` on the ESM namespace.
- `pi-package/skills/vault-resume/index.js` — read only if test fixture behavior reveals production coupling.
- `03_Bugs/BUG-0002_full-test-suite-fails-on-vault-resume-esm-fs-spy.md` — update after fix with confirmed root cause and verification.

## Implementation Constraints and Non-Goals

- Prefer real temp files over monkey-patching Node `fs` exports.
- Keep the test's intent: newest hyphenated session filename should win when no explicit session id is provided.
- Do not weaken or delete the test.
- Do not add arbitrary sleeps or order-dependent filesystem assumptions.

## Integration Touchpoints

- `vaultResume()` reads `.agent-vault/05_Sessions` and phase step folders from the current working directory.
- The test changes `process.cwd()` to a temp root; preserve afterEach cleanup.

## Edge Cases and Failure Modes

- Session filename timestamps must sort newest last/first according to implementation expectations; use explicit `2026-04-20-010000` and `2026-04-20-020000` fixtures.
- If production code reads directory entries in filesystem order, the test may need to assert implementation sorting rather than fixture creation order.
- If the test still needs mocking, use `vi.mock` before import, not `vi.spyOn` on a non-configurable ESM namespace.

## Security and Performance

- Security: not applicable to production behavior if only test code changes.
- Performance: temp-file fixtures are small and local; no material runtime concern.

## Handoff Expectations

- After the fix, update BUG-0002 status/root-cause/fixed-on/verification via vault tools.
- If full suite reveals a new unrelated failure, create a new bug note instead of expanding BUG-0002.
