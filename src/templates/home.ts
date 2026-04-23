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

Keep this note short and current.

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
- Keep first-pass architecture notes aligned with the repo.

## Out Of Scope Right Now

- Deep automation inside \\\`08_Automation/\\\`
- Large historical migrations
- Repo-wide audits beyond starter notes

## Working Assumptions

- This repo uses one vault at \\\`.agent-vault/\\\`.
- The vault does not contain a nested project folder.
- Notes stay readable in raw Markdown.

## Blockers

<!-- AGENT-START:blockers -->
- No phase, step, or session notes are currently marked blocked.
<!-- AGENT-END:blockers -->

## Open Questions

- Which automation helpers should land first?
- What existing planning material should later be linked or migrated?

## Critical Bugs

<!-- AGENT-START:critical-bugs -->
- No open sev-1 or sev-2 bugs are currently recorded.
<!-- AGENT-END:critical-bugs -->

## Next Actions

- Keep architecture notes aligned with the code.
- Record non-trivial decisions as dedicated notes.
- Start session logging during real feature work.
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
- Use a stable id such as \\\`BUG-0001\\\`.
- Link relevant phase, decision, and session notes.
- Record root cause and verification.

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

- Create a decision note for durable architectural or workflow choices.
- Do not hide decisions inside session notes.
- Link superseded and replacement decisions.

## Starter Decision Candidates

- Record the first durable operating-model change as a decision.
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

- Before work: read Active Context, then the target step and linked notes.
- Before major work: create a session note in \\\`05_Sessions/\\\`.
- During work: capture bugs, decisions, and open questions as separate notes.
- After work: update notes conservatively and leave a clear next action.

## Common Paths

- Planning a feature: [[07_Templates/Phase_Template|Phase Template]]
- Logging a bug: [[07_Templates/Bug_Template|Bug Template]]
- Recording a decision: [[07_Templates/Decision_Template|Decision Template]]
- Wrapping a session: [[07_Templates/Session_Template|Session Template]]

## Automation

- Manual: [[README|Agent Vault README]]
- Automation guide: [[08_Automation/README|Automation README]]
- CLI: \\\`./.agent-vault/08_Automation/vault\\\`
- Help: \\\`./.agent-vault/08_Automation/vault help\\\`
- Health: \\\`./.agent-vault/08_Automation/vault-doctor\\\`
- Refresh: \\\`./.agent-vault/08_Automation/vault refresh-all-home-notes\\\`
- Validate: \\\`./.agent-vault/08_Automation/vault validate-all\\\`

## Maintenance Notes

- Keep this page lightweight.
- Treat it as a hub, not a dump.

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

- Drop raw ideas, loose questions, and follow-ups here.
- Move items into proper bug, decision, phase, or session notes during cleanup.
- Delete or link resolved entries.

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

This roadmap tracks vault evolution and operating habits.

## Principles

- Keep phases small enough to complete and review.
- Prefer useful infrastructure over note sprawl.
- Add automation only after the manual workflow is clear.

## Phase Outline

| Phase | Status | Goal |
| --- | --- | --- |
| Phase 01 Foundation | planned | Create the initial scaffold, standards, and starter maps |

## Near-Term Outcomes

- A dependable home note agents can open first.
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
