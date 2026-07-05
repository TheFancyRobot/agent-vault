# Execution Brief

## Related Notes

- Step: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Steps/Step_05_add-vault-prepare-context-context-compiler-tool|STEP-04-05 Add vault_prepare_context context compiler tool]]
- Phase: [[02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase|Phase 04 context compiler and token efficiency]]
- Decision: [[04_Decisions/DEC-0003_deterministic-context-compiler-before-optional-local-reranking|DEC-0003]]

## Outcome and Success Condition

- Tool name: `vault_prepare_context` (decided during refinement 2026-07-05; `vault_get_context` rejected because "get" reads like the resource surface from STEP-04-07), registered in `src/mcp-server.ts` and documented in the README tool table.
- Candidate sources gathered: active task text; active file being edited; root vault note if supplied; active phase; active step; active session; vault graph links and backlinks; code graph symbol/file lookup; source dependency edges (once v3 provides them); changed files from git when available and safe; decisions and validation notes linked to the active step or phase.
- Suggested input schema:

  ```ts
  {
    task?: string;
    active_file?: string;
    root_note?: string;
    phase?: string;
    step?: string;
    mode?: "plan" | "edit" | "review" | "debug" | "resume";
    max_tokens?: number;
    include_source?: boolean;
    source_mode?: "summary" | "stub" | "excerpt" | "full";
    ranker?: "deterministic" | "local";
  }
  ```

- Suggested output shape:

  ```ts
  {
    meta: { mode: "edit", maxTokens: 40000, estimatedTokens: 27400, ranker: "deterministic", truncated: false },
    items: [
      { kind: "vault_note", path: "05_Sessions/SESSION-...", renderMode: "excerpt", score: 18.2,
        reasons: ["active session", "linked step", "recently updated"], estimatedTokens: 900 },
      { kind: "source_file", path: "src/core/vault-graph.ts", renderMode: "stub", score: 13.7,
        reasons: ["symbol match", "dependency of active file"], estimatedTokens: 1400 }
    ],
    content: "..."
  }
  ```

- Default rendering policy:

  | Relationship to task | Default render mode |
  | --- | --- |
  | Active file being edited | excerpt or full |
  | File containing symbol being changed | excerpt around symbol |
  | Direct source dependency | stub |
  | Transitive source dependency | summary |
  | Active vault step/session | excerpt |
  | Linked decision/validation note | excerpt |
  | Background architecture note | heading excerpt |
  | Old/completed phase | metadata only unless explicitly linked |

## Why This Matters

- This is the phase's centerpiece: token-budgeted context assembly with explainable score reasons, replacing manual traverse-and-extract choreography with one deterministic call.

## Prerequisites and Setup

- STEP-04-02 ranking module; STEP-04-03 v3 index; STEP-04-04 stub cache. The `ranker: "local"` input value should be accepted but return a clear "not available" warning until STEP-04-09 lands.

## Starting Files and Directories

- `src/mcp-server.ts` — tool registration via `server.tool(...)` on the `McpServer` instance (12 tools registered today); follow the existing Zod schema + response plumbing pattern.
- `src/core/vault-graph.ts` and `src/core/vault-extract.ts` — reuse traversal and `extractVaultNoteTarget` for bounded vault-note rendering.
- `src/core/code-graph-lookup.ts` — `queryCodeGraphIndex` for symbol/file candidate lookup.
- `src/core/mcp-response-format.ts` — compact TOON output consistent with existing tools.
- `src/core/context-contract.ts` / `src/core/context-footprint.ts` — session/step context shapes for the active-step/session sources.
- `src/core/vault-files.ts` — existing guards are vault-root only (`assertWithinVaultRoot`, `resolveVaultRelativePath`). A project-root equivalent for `active_file` and git-derived source paths does not exist yet and is in-scope work for this step (STEP-04-08 then tests it adversarially).
- Git changed-files signal is net-new, but `execFile` shelling already has precedent in `src/core/vault-config.ts` and `src/core/vault-graph.ts` — follow that pattern for `git diff --name-only`.
- Suggested test file: `test/core/vault-prepare-context.test.ts` (matches the `test/core/<module>.test.ts` convention).
- `src/core/command-catalog.ts` and `prompts/` — document the new tool in the command catalog and workflow prompts (`prompts/vault:plan.md`, `prompts/vault:execute.md`, `prompts/vault:resume.md` are the likely consumers).

## Implementation Constraints and Non-Goals

- Use existing primitives; do not fork a second traversal or extraction implementation.
- Enforce the token (or approximate-token) budget; report `truncated: true` plus what was dropped when the budget binds.
- Git integration is optional and safe: if git is unavailable or the diff fails, proceed without changed-file signals and say so in meta warnings.
- Fail safely when the code graph or stub cache is missing: degrade to vault-note-only context with a `vault_refresh` hint. Never crash.
- The deterministic ranker is the default; `ranker` exists so STEP-04-09 can plug in later. No model code in this step.

## Integration Touchpoints

- Consumes STEP-04-02/03/04 outputs; STEP-04-07 will expose per-item artifacts as resources; STEP-04-08 adds adversarial tests against this tool's input surface.

## Edge Cases and Failure Modes

- Empty vault; task text with no matches; `active_file` outside project root (reject); huge candidate sets (budget prune); zero `max_tokens` (metadata-only result); mode-specific weighting differences (plan favors phases/decisions, debug favors bugs/sessions/changed files — keep initial differences simple and documented).

## Security and Performance

- All note paths vault-root constrained; all source paths project-root constrained; default secret/generated/vendor exclusions applied to source candidates (full policy hardening in STEP-04-08).
- Repeated calls with unchanged inputs should hit the stub cache and avoid re-reading unchanged files where practical.

## Handoff Expectations

- Record the final input/output schema and render-policy table in Implementation Notes; STEP-04-07 and STEP-04-09 treat them as the contract.
