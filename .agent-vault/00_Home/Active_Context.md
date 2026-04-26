---
note_type: home_context
template_version: 1
contract_version: 1
title: Active Context
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - context
---

# Active Context

Keep this note short, current, and safe to overwrite as the repo focus changes.

## Current Objective

<!-- AGENT-START:current-focus -->
_Last refreshed: 2026-04-26._
- Session in progress: [[05_Sessions/2026-04-26-201711-expose-vault-extract-in-pi-extension-and-workflow-docs-pi|SESSION-2026-04-26-201711 Pi session for Expose vault_extract in pi extension and workflow docs]] - owner: Pi - phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]] - updated: 2026-04-26
- Current step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_03_fix-vault-resume-full-suite-esm-fs-spy-blocker|STEP-02-03 Fix vault-resume full-suite ESM fs spy blocker]] - status: planned - phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
- Active phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|PHASE-02 Targeted context extraction]] - status: planned - owner: Pi - updated: 2026-04-26
- Also active: 2 more additional steps.
<!-- AGENT-END:current-focus -->

## Repo Snapshot

- Repository: \`agent-vault\`
- Shape: bun project
- Core stack: TypeScript
- Primary references: [[01_Architecture/System_Overview|System Overview]] and [[01_Architecture/Code_Map|Code Map]]

## In Scope Right Now

- Establish the vault structure and starter notes.
- Capture the first-pass architecture map for the repo.
- Define standards and templates that future agents can follow.

## Out Of Scope Right Now

- Deep automation implementation inside \`08_Automation/\`
- Detailed bug history and decision backlog migration
- Repo-wide architecture audit beyond starter notes

## Working Assumptions

- This repo should use exactly one vault at \`.agent-vault/\`.
- The vault should not contain a second nested project folder.
- Notes should remain easy to read in raw Markdown without Obsidian-specific features.

## Blockers

<!-- AGENT-START:blockers -->
- No phase, step, or session notes are currently marked blocked.
<!-- AGENT-END:blockers -->

## Open Questions

- Which automation helpers should be implemented first: note generators, validators, or issue sync?
- How much of the existing planning material elsewhere in the repo should later be linked or migrated into this vault?

## Critical Bugs

<!-- AGENT-START:critical-bugs -->
- No open sev-1 or sev-2 bugs are currently recorded.
<!-- AGENT-END:critical-bugs -->

## Next Actions

- Finish the remaining PHASE-02 targeted context extraction work, starting with STEP-02-03, and refresh the home notes as steps close.
- Keep the architecture notes aligned with the code as packages evolve.
- Add new decision records whenever a non-trivial design tradeoff is made.
