/**
 * Embedded home note templates from 00_Home/.
 * Genericized with {{repo_name}}, {{repo_shape}}, and {{primary_stack}} placeholders.
 */

export const ACTIVE_CONTEXT_TEMPLATE = `---
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
_Last refreshed: YYYY-MM-DD._
- Session in progress: none.
- Current step: no active or planned step is marked in metadata.
- Active phase: no active or planned phase is marked in metadata.
<!-- AGENT-END:current-focus -->

## Repo Snapshot

- Repository: \\\`{{repo_name}}\\\`
- Shape: {{repo_shape}}
- Core stack: {{primary_stack}}
- Primary references: [[01_Architecture/System_Overview|System Overview]] and [[01_Architecture/Code_Map|Code Map]]

## In Scope Right Now

- Establish the vault structure and starter notes.
- Capture the first-pass architecture map for the repo.
- Define standards and templates that future agents can follow.

## Out Of Scope Right Now

- Deep automation implementation inside \\\`08_Automation/\\\`
- Detailed bug history and decision backlog migration
- Repo-wide architecture audit beyond starter notes

## Working Assumptions

- This repo should use exactly one vault at \\\`.agent-vault/\\\`.
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

- Keep the architecture notes aligned with the code as packages evolve.
- Add the first real decision record when a non-trivial process or design tradeoff is made.
- Start session logging once the vault is used during feature work.
` as string;

export const BUGS_INDEX_TEMPLATE = `---
note_type: home_index
template_version: 1
contract_version: 1
title: Bugs Index
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - index
  - bugs
---

# Bugs Index

Use this note as the manual table of contents for bug records in \\\`03_Bugs/\\\`.

## Triage Rules

- Create one note per bug.
- Give each bug a stable id such as \\\`BUG-0001\\\`.
- Link the bug from the active phase, related decision, and session notes when relevant.
- Close the loop by recording root cause and verification steps.

## Status Buckets

<!-- AGENT-START:bugs-index -->
_Last rebuilt: YYYY-MM-DD._

- No bug notes yet.
<!-- AGENT-END:bugs-index -->

## Useful Links

- Template: [[07_Templates/Bug_Template|Bug Template]]
- Severity reference: [[06_Shared_Knowledge/Bug_Taxonomy|Bug Taxonomy]]
- Current work: [[00_Home/Active_Context|Active Context]]
` as string;

export const DECISIONS_INDEX_TEMPLATE = `---
note_type: home_index
template_version: 1
contract_version: 1
title: Decisions Index
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - index
  - decisions
---

# Decisions Index

Use this note as the directory for decision records in \\\`04_Decisions/\\\`.

## Logging Rules

- Create a new decision note when a choice changes architecture, workflow, ownership, tooling, or long-term maintenance cost.
- Do not hide decisions inside session notes.
- When a decision is superseded, link both the old and new records.

## Starter Decision Candidates

- Record the first decision as soon as the vault operating model changes in a durable way.
- A likely early candidate is the repo rule that Agent Vault lives directly in \\\`.agent-vault/\\\` with no nested project folder.

## Decision Log

<!-- AGENT-START:decisions-index -->
_Last rebuilt: YYYY-MM-DD._

- No decision notes yet.
<!-- AGENT-END:decisions-index -->

## Useful Links

- Template: [[07_Templates/Decision_Template|Decision Template]]
- Architecture overview: [[01_Architecture/System_Overview|System Overview]]
- Definition of done: [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
` as string;

export const DASHBOARD_TEMPLATE = `---
note_type: home_index
template_version: 1
contract_version: 1
title: Dashboard
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - dashboard
---

# Dashboard

This is the main launch point for the vault.

## Now

- Repo: \\\`{{repo_name}}\\\`
- Active phase: none
- Working state: [[00_Home/Active_Context|Active Context]]
- Intake queue: [[00_Home/Inbox|Inbox]]

## Quick Links

- Roadmap: [[00_Home/Roadmap|Roadmap]]
- Bugs: [[00_Home/Bugs_Index|Bugs Index]]
- Decisions: [[00_Home/Decisions_Index|Decisions Index]]
- Architecture: [[01_Architecture/System_Overview|System Overview]]
- Code map: [[01_Architecture/Code_Map|Code Map]]
- Shared rules: [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
- Coding standards: [[06_Shared_Knowledge/Coding_Standards|Coding Standards]]
- Workflow playbooks: [[06_Shared_Knowledge/Agent_Workflow_Playbooks|Agent Workflow Playbooks]]

## Working Rhythm

- Before work: read [[00_Home/Active_Context|Active Context]], then the target step, then the linked phase, architecture, bug, and decision notes.
- Before major work: create a session note in \\\`05_Sessions/\\\`.
- During work: capture new bugs, decisions, and open questions as separate notes instead of burying them in one long session log.
- After work: update notes conservatively, refresh home notes, and leave a clear next action.

## Common Paths

- Planning a feature: [[07_Templates/Phase_Template|Phase Template]]
- Logging a bug: [[07_Templates/Bug_Template|Bug Template]]
- Recording a decision: [[07_Templates/Decision_Template|Decision Template]]
- Wrapping a session: [[07_Templates/Session_Template|Session Template]]

## Automation

- Manual: [[README|Agent Vault README]]
- Automation guide: [[08_Automation/README|Automation README]]
- Preferred CLI: \\\`./.agent-vault/08_Automation/vault\\\`
- Command catalog: \\\`./.agent-vault/08_Automation/vault help\\\`
- Health check: \\\`./.agent-vault/08_Automation/vault-doctor\\\`
- Refresh home notes: \\\`./.agent-vault/08_Automation/vault refresh-all-home-notes\\\`
- Validate note integrity: \\\`./.agent-vault/08_Automation/vault validate-all\\\`

## Maintenance Notes

- Keep this page lightweight.
- Treat this note as a hub, not a dump.
- If a section grows beyond a screenful, split it into its own note and link it here.
` as string;

export const INBOX_TEMPLATE = `---
note_type: home_index
template_version: 1
contract_version: 1
title: Inbox
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - inbox
---

# Inbox

Use this note for fast capture only.

## How To Use It

- Drop raw ideas, loose questions, and follow-ups here when you do not have time to sort them.
- Move items into a proper [[07_Templates/Bug_Template|bug]], [[07_Templates/Decision_Template|decision]], [[07_Templates/Phase_Template|phase]], or [[07_Templates/Session_Template|session]] note during the next cleanup pass.
- Delete or link resolved entries so the inbox stays actionable.

## Related Notes

- [[00_Home/Active_Context|Active Context]]
- [[00_Home/Dashboard|Dashboard]]

## Untriaged Items

- (empty)
` as string;

export const ROADMAP_TEMPLATE = `---
note_type: home_index
template_version: 1
contract_version: 1
title: Roadmap
status: active
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags:
  - agent-vault
  - home
  - roadmap
---

# Roadmap

This roadmap tracks the evolution of the vault itself and the operational habits around it.

## Principles

- Keep phases small enough to complete and review.
- Prefer useful infrastructure over elaborate note sprawl.
- Only add automation after the manual workflow is clear.

## Phase Outline

| Phase | Status | Goal |
| --- | --- | --- |
| Phase 01 Foundation | planned | Create the initial scaffold, standards, and starter maps |

## Near-Term Outcomes

- A dependable home note that agents can open first.
- Reusable templates for bugs, decisions, sessions, and phases.
- A small but real architecture map of the \\\`{{repo_name}}\\\` repo.

## Later Opportunities

- Link bug records to external trackers.
- Generate note skeletons from CLI scripts.
- Validate required sections and stale indexes automatically.

## Related Notes

- [[00_Home/Dashboard|Dashboard]]
- [[00_Home/Active_Context|Active Context]]
` as string;
