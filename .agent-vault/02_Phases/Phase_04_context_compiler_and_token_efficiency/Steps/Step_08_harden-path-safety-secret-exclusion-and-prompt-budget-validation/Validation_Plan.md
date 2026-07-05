# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`

## Acceptance Checks

- Path traversal attempts fail safely on every surface (compiler inputs, resource URIs, stub requests, graph lookups).
- Secret-like files are excluded by default; the default denylist is active without configuration.
- Generated/vendor directories are excluded by default.
- Token budget is enforced, and output reports truncation when it occurs.
- Context assembly does not crash when graph/stub indexes are missing or stale.

## Test Matrix

- Traversal: `../`, absolute paths, encoded separators, and (where the platform allows) symlink escapes — against the compiler's `active_file`/`root_note` inputs and each resource URI family.
- Secrets: fixture project containing `.env`, `.env.local`, `key.pem`, `id.key`, `store.p12`, `data.sqlite` — none appear in compiled context, indexes, or stubs by default; an explicit config override can admit a named exception.
- Generated/vendor: `node_modules/`, `dist/`, `build/`, `coverage/`, `.git/` never contribute candidates.
- Oversized/binary: a huge generated file and a binary blob are skipped with warnings, not embedded.
- Budget: compiled content stays within `max_tokens` (approximate-token tolerance documented) and `truncated` is accurate in both directions.
- Missing/stale indexes: deleting `code-graph/index.json`, corrupting `code-stubs/manifest.json`, and mutating a source file after stub generation each degrade with warnings/hints.
- Missing/deleted files: candidates that vanish between ranking and rendering are dropped with a warning.
- Unsupported languages: files with unknown extensions are metadata-only candidates, never parsed blindly.

## Manual Checks

- Run the compiler in a scratch project seeded with fake secrets and grep the full output for the fake secret values.

## Junior Readiness Verdict

- PASS: attack cases and fixtures are enumerated concretely; policy centralization is the only structural decision left to the implementer.
