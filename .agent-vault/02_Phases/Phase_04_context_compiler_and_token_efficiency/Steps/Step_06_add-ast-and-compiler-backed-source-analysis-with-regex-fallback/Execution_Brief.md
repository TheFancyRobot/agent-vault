# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_06_add-ast-and-compiler-backed-source-analysis-with-regex-fallback|STEP-04-06 Add AST and compiler-backed source analysis with regex fallback]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Outcome and Success Condition

- A parser abstraction/interface (suggested: `SourceAnalyzer` with implementations per tier) that the code-graph generator (STEP-04-03) and stub generator (STEP-04-04) call instead of invoking regex helpers directly.
- Preference order for TypeScript (packaging decided during refinement 2026-07-05):
  1. TypeScript compiler / declaration-style extraction via **optional dynamic import** — `typescript` stays a devDependency of agent-vault and is *not* promoted to a runtime dependency; at runtime, attempt to dynamically import `typescript` from the host project/environment (TS projects almost always have it installed) and use it for signatures, docs, end lines, and import/export edges from the real AST.
  2. Tree-sitter extraction when the dynamic import fails — Tree-sitter parses into syntax trees and generally tolerates incomplete or syntactically invalid code better than regex-only approaches; it also covers non-TypeScript languages.
  3. The existing regex extraction in `src/scaffold/code-graph.ts` as the always-available final fallback.
- The manifest/index records which parser produced each entry (the `parser` field from STEP-04-04's manifest and, if useful, per-file in the v3 index).

## Why This Matters

- Regex extraction cannot reliably produce multiline signatures, docstrings, end lines, or resolved import edges. Stub fidelity (STEP-04-04) and dependency-aware ranking (STEP-04-02/05) are capped by extraction quality.

## Prerequisites and Setup

- STEP-04-03's v3 schema defines the fields to populate. STEP-04-04 benefits immediately but does not block on this step (it ships with whatever tier exists).

## Starting Files and Directories

- `src/scaffold/code-graph.ts` — current regex extractors for TS/JS and other languages; becomes the fallback implementation behind the abstraction.
- `src/scaffold/` — suggested home for the new analyzer module(s).
- `package.json` — `typescript` is currently `^5.7.0` in devDependencies and stays there; choose the Tree-sitter package (wasm-based `web-tree-sitter` avoids native build pain) and decide whether it ships as a regular or optional dependency.
- `test/` — fixture-heavy tests; include intentionally broken sources.

## Implementation Constraints and Non-Goals

- Parser errors must never break `vault_refresh`: catch per-file, fall back a tier, and record a warning.
- Keep regex fallback available and tested; deleting it is out of scope.
- Do not add language servers, watch modes, or incremental compilation; this is batch extraction for index/stub generation.
- Non-TypeScript language upgrades are optional stretch scope; do not block the step on them.

## Integration Touchpoints

- STEP-04-03's generator and STEP-04-04's stub generator consume the abstraction; STEP-04-08 tests the failure tiers.

## Edge Cases and Failure Modes

- Decorators; multiline signatures; nested classes and methods; type-only imports; re-exports; syntax errors mid-file (Tree-sitter/regex tiers should still salvage what they can); files with unusual encodings; extremely large files (respect existing size caps before parsing).

## Security and Performance

- Parse only files already admitted by the ignore/exclusion policy; parsing is CPU-bound, so keep per-file time bounded and reuse a single compiler program/host across a refresh run where practical.

## Handoff Expectations

- Record the abstraction interface, tier-selection rules, and dependency decisions in Implementation Notes; note any fixture gaps for STEP-04-08 to cover adversarially.
