# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Locked canonical friendly manual command names: `save-context`, `switch-context`, `resume-context`, `prepare-context`.
- Locked alias/back-compat primitive names: `checkpoint`, `transition`, `resume-prepare`, `compact-research`.
- Locked `prepare-context` auto-write policy: allowed to update `updated_at`, `last_action`, `current_focus`, and `resume_target`; lifecycle change allowed only for `active` -> `paused`.
- Locked `last_action.type` v1 enum: `saved`, `switched`, `resumed`, `prepared`, `paused`, `completed`.
- Locked `current_focus` v1 shape: hybrid object with required `summary` and `target`.
- Locked canonical session prose section: `## Context Handoff` only.
- Added `src/core/context-contract.ts` as the shared code-facing source of truth for lifecycle enums, manual command names, aliases, and prepare-context write boundaries.
- Updated `src/core/command-catalog.ts` and `README.md` to surface the canonical manual names while keeping `/vault:*` workflows primary.
- Updated `src/templates/note-templates.ts` and `.agent-vault/07_Templates/Session_Template.md` to reserve `## Context Handoff` before persistence work begins.
- Resolved the DEC-0001 ambiguity by locking the resume alias to `resume-prepare` and aligning the decision note before changing source files.
