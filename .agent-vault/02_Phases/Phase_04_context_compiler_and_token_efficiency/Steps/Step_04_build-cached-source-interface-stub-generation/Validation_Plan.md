# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_04_build-cached-source-interface-stub-generation|STEP-04-04 Build cached source interface-stub generation]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- Stub generation results are cached under `.agent-vault/08_Automation/code-stubs/` with a `manifest.json`.
- Cache invalidates when the source file hash, mtime, or size changes.
- A consumer can request stub content for an indirect dependency by project-relative path.
- Full source is served only when explicitly requested or when policy marks the file a direct target.
- Fallback/incomplete stubs are visibly marked in both stub content and manifest.

## Unit Test Matrix

- Body removal: function/method bodies are dropped; declarations remain.
- Signature preservation: parameter lists, return types, and generics survive verbatim.
- Exported type preservation: interfaces, type aliases, enums, and exported constants survive.
- Docstring retention where safely extractable.
- Cache invalidation: touching/rewriting the source triggers regeneration; untouched files are served from cache (assert no re-parse, for example via a spy or manifest timestamps).
- Safe fallback: an unparseable fixture produces a marked fallback stub or metadata-only entry, not a crash.
- Path safety: attempts to stub files outside the project root are rejected.

## Manual Checks

- Generate a stub for `src/core/vault-graph.ts` in this repo and read it: it should be a faithful interface skeleton a reviewer could trust without opening the original file.

## Junior Readiness Verdict

- PASS: cache layout, stub rules, and test matrix are concrete; fidelity upgrades are explicitly deferred to STEP-04-06.
