---
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

- Repo: \`agent-vault\`
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
- Before major work: create a session note in \`05_Sessions/\`.
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
- Preferred CLI: \`./.agent-vault/08_Automation/vault\`
- Command catalog: \`./.agent-vault/08_Automation/vault help\`
- Health check: \`./.agent-vault/08_Automation/vault-doctor\`
- Refresh home notes: \`./.agent-vault/08_Automation/vault refresh-all-home-notes\`
- Validate note integrity: \`./.agent-vault/08_Automation/vault validate-all\`

## Maintenance Notes

- Keep this page lightweight.
- Treat this note as a hub, not a dump.
- If a section grows beyond a screenful, split it into its own note and link it here.
