# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_01_document-generated-automation-area-and-code-graph-refresh|STEP-04-01 Document generated automation area and code graph refresh]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]

## Outcome and Success Condition

- README documents the generated automation directory layout, including the future stub cache:

  ```text
  08_Automation/
  ├── code-graph/
  │   └── index.json
  └── code-stubs/
      ├── manifest.json
      └── ...
  ```

- README explains the purpose of `code-graph/` (compact machine-readable symbol/file index consumed by `vault_lookup_code_graph`) and reserves `code-stubs/` as the future interface-stub cache.
- README or tool documentation shows how to refresh the code graph via `vault_refresh` with `{"target": "code_graph"}`; today the tool table only lists `all`, `indexes`, and `active_context` targets, which is stale.
- Docs make clear that `08_Automation/` is generated, machine-readable project state — not the same as human-authored phase/session/step notes — and that the current code graph is a lightweight lookup index rather than a full AST dependency model.

## Why This Matters

- The rest of PHASE-04 builds on the generated automation area; if the README misdescribes it, later steps compound the confusion.
- Users currently cannot discover the `code_graph` refresh target from the docs even though the tool supports it.

## Prerequisites and Setup

- None beyond a current checkout. This step is documentation-only.

## Starting Files and Directories

- `README.md` — vault structure section, MCP tool table (the `vault_refresh` row), and the `vault_lookup_code_graph` section around the existing code-graph mentions.
- `CONTRIBUTING.md` — check whether contributor docs mention the generated area; update only if already relevant.
- `.agent-vault/08_Automation/code-graph/index.json` — the real artifact being described.
- `src/scaffold/code-graph.ts` and `src/core/code-graph-lookup.ts` — confirm what the current index actually contains before describing it.
- `src/core/command-catalog.ts` — confirm the documented refresh targets match the actual command surface.
- `prompts/vault:refresh.md` — keep the workflow prompt consistent with the docs.

## Implementation Constraints and Non-Goals

- Do not implement the stub cache here; only reserve and document it as future structure.
- Do not rewrite unrelated README sections; keep edits bounded to the automation/tooling documentation.
- Do not promise dependency-aware retrieval or interface stubbing as current behavior.

## Integration Touchpoints

- The documented directory layout must match what `vault_refresh target=code_graph` actually generates and what STEP-04-04 will later add.

## Edge Cases and Failure Modes

- Projects that have never run a code-graph refresh will not have `08_Automation/code-graph/`; docs should say the directory appears after the first refresh.

## Security and Performance

- No runtime impact. Documentation should not encourage committing secrets into generated artifacts.

## Handoff Expectations

- Later steps (v3 schema, stub cache, MCP resources) can extend the documented layout instead of introducing it.
