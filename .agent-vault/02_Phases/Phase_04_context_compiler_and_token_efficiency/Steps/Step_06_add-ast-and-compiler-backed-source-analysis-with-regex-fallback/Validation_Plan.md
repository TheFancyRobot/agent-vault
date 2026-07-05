# Validation Plan

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback|STEP-04-06 Add AST and compiler-backed source analysis with regex fallback]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Required Commands

1. `bun test`
2. `bun run typecheck`
3. Regenerate the repo's own code graph via `vault_refresh target=code_graph` and confirm it completes with the new analyzers active.

## Acceptance Checks

- A parser abstraction/interface exists; generators call it rather than regex helpers directly.
- TypeScript has a stronger path than regex-only extraction (compiler- or Tree-sitter-backed).
- Regex fallback remains available and selected automatically when stronger tiers fail or are unavailable.
- Parser errors do not break `vault_refresh`; failures downgrade per file with recorded warnings.
- The producing parser tier is recorded per entry.

## Test Matrix (syntax edge cases)

- Decorators on classes and methods.
- Multiline function/method signatures with generics and default parameters.
- Nested classes and class methods (`parentName` populated).
- Type-only imports (`import type`) classified as `kind: "type"` edges.
- Re-exports (`export { x } from "./y"`, `export * from "./z"`).
- A file with deliberate syntax errors: stronger tier fails, fallback still yields symbols, refresh exits cleanly.
- Tier selection: with `typescript` importable, the compiler tier is used; with the import mocked to fail, Tree-sitter is used; with both unavailable, regex is used — each recorded in the `parser` field.
- Fixture comparison test: for a representative valid file, compiler-backed output is a superset of regex output (no regressions in previously extracted symbols).

## Manual Checks

- Diff the regenerated index for `src/core/` against the pre-step index: expect added signatures/docs/end lines and no lost symbols.

## Junior Readiness Verdict

- PASS: tier order, fallback behavior, and edge-case fixtures are enumerated; packaging choice is flagged for a decision note rather than left implicit.
