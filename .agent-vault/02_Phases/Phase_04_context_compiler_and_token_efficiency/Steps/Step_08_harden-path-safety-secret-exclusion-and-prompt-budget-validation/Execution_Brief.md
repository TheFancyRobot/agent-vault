# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_08_harden-path-safety-secret-exclusion-and-prompt-budget-validation|STEP-04-08 Harden path safety secret exclusion and prompt budget validation]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Outcome and Success Condition

- Safety constraints enforced and tested across the ranking module, context compiler, stub cache, code graph, and MCP resources:
  - Vault note paths remain constrained to the vault root.
  - Source file paths remain constrained to the project root.
  - Secrets are not included by default.
  - Common secret/generated/vendor paths are denied or ignored unless explicitly configured otherwise.
- Suggested default denylist/ignores:

  ```text
  .env
  .env.*
  *.pem
  *.key
  *.p12
  *.sqlite
  .git/
  node_modules/
  dist/
  build/
  coverage/
  ```

- The context compiler also refuses to blindly include huge generated files, lockfiles, vendored dependencies, binary files, and caches.
- Token budgets are enforced end to end, and output reports truncation whenever truncation occurs.

## Why This Matters

- The context pipeline reads many files semi-automatically on behalf of an agent; without hard default exclusions and traversal guards, a single crafted `active_file` or note link could exfiltrate secrets into model context.

## Prerequisites and Setup

- STEP-04-05 and STEP-04-07 exist as the main attack surfaces. Today `src/core/vault-files.ts` provides vault-root guards only (`assertWithinVaultRoot`, `resolveVaultRelativePath`); the project-root guard for source paths is created in STEP-04-05. This step centralizes the exclusion policy and proves both guards adversarially.

## Starting Files and Directories

- `src/core/vault-files.ts` — existing path safety guards; extend rather than duplicate.
- `src/core/vault-config.ts` — where the configurable denylist/ignore overrides belong.
- The STEP-04-05 compiler module and STEP-04-07 resource handlers — surfaces under test.
- `src/scaffold/code-graph.ts` and the stub cache module — indexing-time exclusion enforcement.
- `test/` — a dedicated safety/adversarial test file is appropriate here.

## Implementation Constraints and Non-Goals

- One policy module, many enforcement points: indexing, ranking candidates, rendering, and resource reads must consult the same exclusion logic.
- Explicit configuration may open up specific paths; absent config, the safe default applies.
- No secret-content scanning (entropy analysis etc.) in this step — path/name-based exclusion only; note content scanning as a possible future step.

## Integration Touchpoints

- Consumes `generated`/`vendor` flags from the v3 index (STEP-04-03); constrains STEP-04-05 outputs and STEP-04-07 reads; the optional reranker (STEP-04-09) must sit behind the same output constraints.

## Edge Cases and Failure Modes

- Missing files, deleted files (indexed then removed), stale caches, symlinks pointing outside the roots, oversized files, unsupported languages, empty vault, and simultaneous absence of both graph and stub indexes — context assembly must degrade with warnings, never crash.

## Security and Performance

- This step is the security work; performance note: exclusion checks run on every candidate, so keep them cheap (precompiled matchers, no per-check filesystem stats beyond what's needed).

## Handoff Expectations

- Record the final default denylist, override config shape, and any accepted residual risks in Implementation Notes; if policy decisions were contentious, capture them as a decision note.
